import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { authenticateToken, AuthenticatedRequest } from '../auth.ts';
import { nextcloudWebdavService } from '../services/nextcloudWebdavService.ts';
import {
  getAllPerangkatCategories,
  savePerangkatCategory,
  deletePerangkatCategory,
  getPerangkatDokumenByTeacher,
  getPerangkatDokumenById,
  savePerangkatDokumen,
  deletePerangkatDokumen,
  updateDokumenStatus,
  savePerangkatApprovalLog,
  getPerangkatApprovalLogs,
  savePerangkatPengesahan,
  getPerangkatPengesahanByTeacher,
  getAllTeacherProgressReports,
  resetDokumenStatus,
  resetPengesahanByTeacher,
  resetAllPerangkatCategories,
  resetAllPerangkatSubmissions,
  verifyAllDokumenForTeacher,
  approveAllVerifiedTeachers,
  getTeacherMapelList,
  saveTeacherMapel,
  deleteTeacherMapel,
  submitTeacherMapel,
  checkActivePeriodPendingStatus,
  PerangkatCategory
} from '../perangkatStore.ts';
import { getSettings, updateSettings, getActivePeriod, getAssignedWakaKurikulum } from '../dataStore.ts';
import {
  sendWhatsAppViaConfiguredGateway,
  getWhatsAppGatewayStatus,
  formatPerangkatSupervisiWhatsAppMessage
} from '../services/whatsappService.ts';
import { safeDbQuery } from '../db.ts';

const router = express.Router();

// Setup multer temporary directory
const tempUploadDir = path.join(os.tmpdir(), 'perangkat_temp');
if (!fs.existsSync(tempUploadDir)) {
  try { fs.mkdirSync(tempUploadDir, { recursive: true }); } catch (e) {}
}
const upload = multer({ dest: tempUploadDir, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

/**
 * 1. Nextcloud WebDAV Status & Test Connection (Tersimpan)
 */
const handleGetNextcloudStatus = async (req: Request, res: Response) => {
  try {
    const config = await nextcloudWebdavService.getConfig();
    let testResult: any = { success: false, message: 'Nextcloud WebDAV belum dikonfigurasi' };
    if (config.is_configured && config.server_url && config.username && config.password) {
      testResult = await nextcloudWebdavService.testConnection();
    }
    res.json({
      configured: Boolean(config.is_configured),
      server_url: config.server_url || '',
      username: config.username || '',
      base_path: config.base_path || '/Perangkat_Ajar',
      auth_type: 'nextcloud_webdav',
      ...testResult
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

router.get('/nextcloud/status', handleGetNextcloudStatus);
router.get('/gdrive/status', handleGetNextcloudStatus); // Alias kompatibilitas

/**
 * 2. Test Connection on the fly (Sebelum atau sesudah disimpan) via WebDAV PROPFIND
 */
const handleTestNextcloudConnection = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { server_url, username, password, base_path } = req.body;

    const testResult = await nextcloudWebdavService.testConnection({
      server_url,
      username,
      password,
      base_path
    });

    res.json(testResult);
  } catch (e: any) {
    res.status(500).json({
      success: false,
      message: `Error saat menguji koneksi: ${e.message || e}`
    });
  }
};

router.post('/nextcloud/test', authenticateToken, handleTestNextcloudConnection);
router.post('/gdrive/test', authenticateToken, handleTestNextcloudConnection); // Alias kompatibilitas

/**
 * 3. Simpan Konfigurasi Server Nextcloud WebDAV (Admin)
 */
const handleSaveNextcloudConfig = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Hanya Admin yang dapat mengatur konfigurasi server Nextcloud' });
    }

    const { server_url, username, password, base_path } = req.body;

    if (!server_url || !username || !password) {
      return res.status(400).json({
        error: 'Nextcloud Server URL, Username, dan App Password / Token wajib diisi.'
      });
    }

    const saveResult = await nextcloudWebdavService.saveConfig({
      server_url,
      username,
      password,
      base_path: base_path || '/Perangkat_Ajar'
    });

    // Jalankan tes koneksi langsung dengan kredensial yang baru disimpan
    const testResult = await nextcloudWebdavService.testConnection();

    res.json({
      success: true,
      message: testResult.success 
        ? 'Konfigurasi Nextcloud WebDAV berhasil disimpan dan terverifikasi aktif!' 
        : 'Konfigurasi tersimpan, namun koneksi belum berhasil diverifikasi.',
      test: testResult
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Gagal menyimpan konfigurasi Nextcloud' });
  }
};

router.post('/nextcloud/config', authenticateToken, handleSaveNextcloudConfig);
router.post('/gdrive/config', authenticateToken, handleSaveNextcloudConfig); // Alias kompatibilitas

/**
 * 4. REST API PROXY PREVIEW FILE (PDF STREAMING DARI NEXTCLOUD WEBDAV)
 * Mem-pipe file PDF langsung ke browser dengan Content-Type: application/pdf
 * Memungkinkan Kepala Sekolah dan Guru melihat dokumen tanpa harus login ke antarmuka Nextcloud.
 */
router.get('/preview/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let targetPath = '';
    let fileName = 'dokumen.pdf';

    // A. Cari dokumen berdasarkan ID dokumen
    const doc = await getPerangkatDokumenById(id);
    if (doc) {
      targetPath = doc.file_path || doc.gdrive_file_id || '';
      fileName = doc.file_name || 'dokumen.pdf';
    } else {
      // B. Jika tidak ditemukan, periksa apakah ID merupakan category_id berkas kurikulum
      const cats = await getAllPerangkatCategories();
      const cat = cats.find(c => c.id === id);
      if (cat && cat.file_kurikulum_url) {
        targetPath = cat.file_kurikulum_url;
        fileName = cat.file_kurikulum_name || 'berkas_kurikulum.pdf';
      }
    }

    // C. Jika dipanggil dengan query string `?path=...`
    if (!targetPath && req.query.path) {
      targetPath = String(req.query.path);
      if (req.query.name) {
        fileName = String(req.query.name);
      }
    }

    if (!targetPath) {
      return res.status(404).send('Dokumen tidak ditemukan atau berkas belum diunggah.');
    }

    // Jika file tersimpan secara lokal di filesystem server
    if (fs.existsSync(targetPath)) {
      const mime = fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
      return fs.createReadStream(targetPath).pipe(res);
    }

    // Ambil file stream langsung dari Nextcloud WebDAV
    const { stream, contentType, contentLength } = await nextcloudWebdavService.getFileStream(targetPath);

    // Tentukan mime type agar browser langsung menampilkan preview PDF
    const finalMime = fileName.toLowerCase().endsWith('.pdf') 
      ? 'application/pdf' 
      : (contentType || 'application/pdf');

    res.setHeader('Content-Type', finalMime);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    stream.pipe(res);
  } catch (err: any) {
    console.error('[WebDAV Preview Proxy Error]:', err.message);
    res.status(500).send(`Gagal memuat pratinjau dokumen dari Nextcloud: ${err.message}`);
  }
});

/**
 * 3. Kategori Perangkat (Admin & Waka Kurikulum)
 */
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const { tahun_ajaran, semester } = req.query;
    const cats = await getAllPerangkatCategories(tahun_ajaran as string, semester as string);
    res.json({ success: true, data: cats });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/categories', authenticateToken, upload.single('file_kurikulum'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'admin' && userRole !== 'WAKIL_KURIKULUM') {
      return res.status(403).json({ error: 'Hanya Admin dan Waka Kurikulum yang dapat menambah kategori' });
    }

    const { nama, target_jumlah, tipe_pengadaan, is_bertahap, target_pertemuan, tahun_ajaran, semester } = req.body;
    if (!nama) {
      return res.status(400).json({ error: 'Nama jenis perangkat wajib diisi' });
    }

    let fileUrl: string | null = null;
    let fileName: string | null = null;

    // Jika mengunggah berkas untuk DARI_KURIKULUM
    if (req.file && tipe_pengadaan === 'DARI_KURIKULUM') {
      fileName = req.file.originalname;
      const uploadRes = await nextcloudWebdavService.uploadFile(
        req.file.path,
        req.file.originalname,
        req.file.mimetype,
        tahun_ajaran || '2025-2026',
        semester || 'Ganjil',
        '_Perangkat_Pusat_Kurikulum',
        'Pusat'
      );
      fileUrl = uploadRes.filePath;
    }

    const cat = await savePerangkatCategory({
      nama,
      target_jumlah: Number(target_jumlah) || 1,
      tipe_pengadaan: tipe_pengadaan === 'DARI_KURIKULUM' ? 'DARI_KURIKULUM' : 'DARI_GURU',
      is_bertahap: is_bertahap === true || is_bertahap === 'true',
      target_pertemuan: Number(target_pertemuan) || (is_bertahap ? 18 : undefined),
      file_kurikulum_url: fileUrl,
      file_kurikulum_name: fileName,
      tahun_ajaran: tahun_ajaran || '',
      semester: semester || ''
    });

    res.json({ success: true, message: 'Jenis perangkat berhasil ditambahkan', data: cat });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/categories/:id', authenticateToken, upload.single('file_kurikulum'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'admin' && userRole !== 'WAKIL_KURIKULUM') {
      return res.status(403).json({ error: 'Hanya Admin dan Waka Kurikulum yang dapat mengubah kategori' });
    }

    const { id } = req.params;
    const { nama, target_jumlah, tipe_pengadaan, is_bertahap, target_pertemuan, tahun_ajaran, semester, existing_file_url, existing_file_name } = req.body;

    let fileUrl = existing_file_url || null;
    let fileName = existing_file_name || null;

    if (req.file && tipe_pengadaan === 'DARI_KURIKULUM') {
      fileName = req.file.originalname;
      const uploadRes = await nextcloudWebdavService.uploadFile(
        req.file.path,
        req.file.originalname,
        req.file.mimetype,
        tahun_ajaran || '2025-2026',
        semester || 'Ganjil',
        '_Perangkat_Pusat_Kurikulum',
        'Pusat'
      );
      fileUrl = uploadRes.filePath;
    }

    const cat = await savePerangkatCategory({
      id,
      nama,
      target_jumlah: Number(target_jumlah) || 1,
      tipe_pengadaan: tipe_pengadaan === 'DARI_KURIKULUM' ? 'DARI_KURIKULUM' : 'DARI_GURU',
      is_bertahap: is_bertahap === true || is_bertahap === 'true',
      target_pertemuan: Number(target_pertemuan) || (is_bertahap ? 18 : undefined),
      file_kurikulum_url: fileUrl,
      file_kurikulum_name: fileName,
      tahun_ajaran: tahun_ajaran || '',
      semester: semester || ''
    });

    res.json({ success: true, message: 'Jenis perangkat berhasil diperbarui', data: cat });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/categories/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'admin' && userRole !== 'WAKIL_KURIKULUM') {
      return res.status(403).json({ error: 'Akses ditolak' });
    }

    await deletePerangkatCategory(req.params.id);
    res.json({ success: true, message: 'Jenis perangkat berhasil dihapus' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * 4. Guru: Mengambil daftar dokumen, mapel terdaftar & berkas panduan kurikulum
 */
router.get('/dokumen/teacher/:teacherId', async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;
    let { tahun_ajaran, semester } = req.query;

    if (!tahun_ajaran || !semester) {
      const activePeriod = await getActivePeriod();
      if (!tahun_ajaran) tahun_ajaran = activePeriod.tahun_ajaran;
      if (!semester) semester = activePeriod.semester;
    }

    const [categories, docs, pengesahan, teacherMapels] = await Promise.all([
      getAllPerangkatCategories(tahun_ajaran as string, semester as string),
      getPerangkatDokumenByTeacher(teacherId, tahun_ajaran as string, semester as string),
      getPerangkatPengesahanByTeacher(teacherId, tahun_ajaran as string, semester as string),
      getTeacherMapelList(teacherId, tahun_ajaran as string, semester as string)
    ]);

    // Format respon berisi kategori, daftar mapel terdaftar guru, dokumen, dan pengesahan
    res.json({
      success: true,
      data: {
        categories,
        teacher_mapels: teacherMapels,
        dokumen: docs,
        pengesahan
      }
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * 4.0. Cek Status Verifikasi & Pending Periode Aktif
 */
router.get('/active-period-status', async (req: Request, res: Response) => {
  try {
    const activePeriod = await getActivePeriod();
    const status = await checkActivePeriodPendingStatus(activePeriod.tahun_ajaran, activePeriod.semester);
    res.json({
      success: true,
      active_period: activePeriod,
      status
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * 4.1. Guru: Kelola Mata Pelajaran yang Diampu
 */
router.get('/teacher-mapel/:teacherId', async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;
    let { tahun_ajaran, semester } = req.query;
    if (!tahun_ajaran || !semester) {
      const activePeriod = await getActivePeriod();
      if (!tahun_ajaran) tahun_ajaran = activePeriod.tahun_ajaran;
      if (!semester) semester = activePeriod.semester;
    }
    const list = await getTeacherMapelList(teacherId, tahun_ajaran as string, semester as string);
    res.json({ success: true, data: list });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/teacher-mapel', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { teacher_id, teacher_name, mapel_id, mapel_name, sub_mapel, rombel, tahun_ajaran, semester } = req.body;
    if (!teacher_id || !mapel_name) {
      return res.status(400).json({ error: 'Mata pelajaran dan Guru wajib diisi' });
    }

    const activePeriod = await getActivePeriod();
    const finalTa = (tahun_ajaran && tahun_ajaran.trim()) ? tahun_ajaran.trim() : activePeriod.tahun_ajaran;
    const finalSem = (semester && semester.trim()) ? semester.trim() : activePeriod.semester;

    const saved = await saveTeacherMapel({
      teacher_id,
      teacher_name: teacher_name || req.user?.name || '',
      mapel_id: mapel_id || '',
      mapel_name,
      sub_mapel: sub_mapel || '',
      rombel: Array.isArray(rombel) ? rombel : (typeof rombel === 'string' ? [rombel] : []),
      tahun_ajaran: finalTa,
      semester: finalSem,
      status_submit: 'DRAFT'
    });

    res.json({ success: true, message: 'Mata pelajaran yang diampu berhasil dikonfirmasi / ditambahkan', data: saved });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/teacher-mapel/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { teacher_id, teacher_name, mapel_id, mapel_name, sub_mapel, rombel, tahun_ajaran, semester } = req.body;

    const activePeriod = await getActivePeriod();
    const finalTa = (tahun_ajaran && tahun_ajaran.trim()) ? tahun_ajaran.trim() : activePeriod.tahun_ajaran;
    const finalSem = (semester && semester.trim()) ? semester.trim() : activePeriod.semester;

    const saved = await saveTeacherMapel({
      id,
      teacher_id,
      teacher_name,
      mapel_id,
      mapel_name,
      sub_mapel,
      rombel: Array.isArray(rombel) ? rombel : (typeof rombel === 'string' ? [rombel] : []),
      tahun_ajaran: finalTa,
      semester: finalSem
    });

    res.json({ success: true, message: 'Data mata pelajaran berhasil diperbarui', data: saved });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/teacher-mapel/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await deleteTeacherMapel(id);
    res.json({ success: true, message: 'Mata pelajaran dan seluruh berkas terkait berhasil dihapus' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/teacher-mapel/:id/submit', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const actorName = req.user?.name || 'Guru';
    await submitTeacherMapel(id, actorName);
    res.json({ success: true, message: 'Perangkat ajar untuk mata pelajaran ini berhasil dikirim ke Kurikulum untuk diverifikasi!' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * 5. Guru: Unggah Dokumen Perangkat Ajar
 */
router.post('/dokumen/upload', authenticateToken, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Berkas dokumen wajib dilampirkan' });
    }

    const { category_id, teacher_id, teacher_name, teacher_mapel_id, tahun_ajaran, semester, mapel, sub_mapel, rombel, pertemuan_ke, keterangan, replace_doc_id } = req.body;
    if (!category_id || !teacher_id) {
      return res.status(400).json({ error: 'category_id dan teacher_id wajib diisi' });
    }

    // Dapatkan periode aktif resmi agar berkas tidak terisolasi
    const activePeriod = await getActivePeriod();
    const finalTahunAjaran = (tahun_ajaran && tahun_ajaran.trim()) ? tahun_ajaran.trim() : activePeriod.tahun_ajaran;
    const finalSemester = (semester && semester.trim()) ? semester.trim() : activePeriod.semester;

    // Nama folder guru
    const cleanTeacherFolder = (teacher_name || req.user?.name || `Guru_${teacher_id}`).trim().replace(/[\\/:*?"<>|]/g, '_');
    const targetMapelName = (mapel && mapel.trim()) ? mapel.trim() : ((sub_mapel && sub_mapel.trim()) ? sub_mapel.trim() : undefined);

    // Upload ke Nextcloud WebDAV dengan struktur folder otomatis:
    // [Base_Folder]/[Tahun Ajaran]/Semester [Semester]/[Nama Guru]/[Mata Pelajaran]/
    const uploadRes = await nextcloudWebdavService.uploadFile(
      req.file.path,
      req.file.originalname,
      req.file.mimetype,
      finalTahunAjaran,
      finalSemester,
      cleanTeacherFolder,
      targetMapelName
    );

    const targetDocId = replace_doc_id || undefined;
    const newDoc = await savePerangkatDokumen({
      id: targetDocId,
      category_id,
      teacher_id,
      teacher_name: teacher_name || req.user?.name || '',
      teacher_mapel_id: teacher_mapel_id || '',
      file_name: req.file.originalname,
      file_size: req.file.size,
      file_path: uploadRes.filePath, // Menyimpan path file Nextcloud WebDAV
      file_url: `/api/v1/perangkat/preview/file?path=${encodeURIComponent(uploadRes.filePath)}`,
      gdrive_file_id: uploadRes.filePath,
      gdrive_web_view_link: `/api/v1/perangkat/preview/file?path=${encodeURIComponent(uploadRes.filePath)}`,
      status: 'MENUNGGU_VERIFIKASI',
      catatan_revisi: '',
      mapel: mapel || '',
      sub_mapel: sub_mapel || '',
      rombel: rombel || '',
      pertemuan_ke: pertemuan_ke || '',
      keterangan: keterangan || '',
      tahun_ajaran: finalTahunAjaran,
      semester: finalSemester
    });

    // Catat log
    await savePerangkatApprovalLog({
      dokumen_id: newDoc.id,
      teacher_id,
      user_id: req.user?.id || teacher_id,
      user_name: req.user?.name || teacher_name || 'Guru',
      role: req.user?.role || 'GURU',
      action: replace_doc_id ? 'REPLACE' : 'UPLOAD',
      catatan: replace_doc_id ? `Memperbarui / mengganti berkas dengan ${req.file.originalname}` : `Mengunggah berkas ${req.file.originalname} (${mapel || 'Umum'}) [Periode ${finalTahunAjaran} - Sem ${finalSemester}]`
    });

    res.json({
      success: true,
      message: replace_doc_id ? 'Berkas berhasil diperbarui / ditimpa' : 'Berkas perangkat ajar berhasil diunggah',
      data: newDoc
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Gagal mengunggah berkas' });
  }
});

/**
 * 6. Hapus Dokumen Guru
 */
router.delete('/dokumen/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await deletePerangkatDokumen(id);
    res.json({ success: true, message: 'Dokumen berhasil dihapus' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * 7. Waka Kurikulum: Verifikasi / Tolak Dokumen
 */
router.post('/dokumen/:id/verifikasi-kurikulum', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'admin' && userRole !== 'WAKIL_KURIKULUM') {
      return res.status(403).json({ error: 'Hanya Waka Kurikulum atau Admin yang dapat memverifikasi dokumen' });
    }

    const { id } = req.params;
    const { status, catatan, teacher_id } = req.body; // status: 'TERVERIFIKASI_KURIKULUM' | 'DITOLAK_KURIKULUM'

    if (!['TERVERIFIKASI_KURIKULUM', 'DITOLAK_KURIKULUM'].includes(status)) {
      return res.status(400).json({ error: 'Status verifikasi tidak valid' });
    }

    await updateDokumenStatus(id, status, catatan || '');

    // Catat log
    await savePerangkatApprovalLog({
      dokumen_id: id,
      teacher_id,
      user_id: req.user?.id || 'kurikulum',
      user_name: req.user?.name || 'Waka Kurikulum',
      role: 'WAKIL_KURIKULUM',
      action: status === 'TERVERIFIKASI_KURIKULUM' ? 'SETUJU_KURIKULUM' : 'TOLAK_KURIKULUM',
      catatan: catatan || (status === 'TERVERIFIKASI_KURIKULUM' ? 'Dokumen memenuhi standar perangkat ajar.' : 'Perlu revisi.')
    });

    res.json({
      success: true,
      message: status === 'TERVERIFIKASI_KURIKULUM' ? 'Dokumen berhasil diverifikasi' : 'Dokumen ditolak dan dikembalikan ke guru untuk revisi'
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * 8. Kepala Sekolah: Validasi & Minta Revisi Dokumen
 */
router.post('/dokumen/:id/validasi-kepsek', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'admin' && userRole !== 'KEPALA_SEKOLAH') {
      return res.status(403).json({ error: 'Hanya Kepala Sekolah yang dapat melakukan supervisi/validasi akhir' });
    }

    const { id } = req.params;
    const { status, catatan, teacher_id } = req.body; // 'REVISI_KEPSEK'

    await updateDokumenStatus(id, status || 'REVISI_KEPSEK', catatan || '');

    await savePerangkatApprovalLog({
      dokumen_id: id,
      teacher_id,
      user_id: req.user?.id || 'kepsek',
      user_name: req.user?.name || 'Kepala Sekolah',
      role: 'KEPALA_SEKOLAH',
      action: 'REVISI_KEPSEK',
      catatan: catatan || 'Kepala Sekolah meminta perbaikan perangkat ajar.'
    });

    res.json({ success: true, message: 'Catatan revisi Kepala Sekolah berhasil dikirim' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * 9. Kepala Sekolah: Pengesahan Resmi (TTD Digital / QR Code)
 */
router.post('/pengesahan', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'admin' && userRole !== 'KEPALA_SEKOLAH') {
      return res.status(403).json({ error: 'Hanya Kepala Sekolah yang berwenang membubuhkan pengesahan resmi' });
    }

    const {
      teacher_id,
      teacher_name,
      nip,
      mapel,
      tahun_ajaran,
      semester,
      tipe_pengesahan,
      ttd_image_base64,
      qr_signature_data
    } = req.body;

    if (!teacher_id || !tipe_pengesahan) {
      return res.status(400).json({ error: 'teacher_id dan tipe_pengesahan wajib diisi' });
    }

    const settings = await getSettings();
    const customTpl = settings.pengesahan_template || {};
    const kepsekOfficialName = (customTpl.nama_kepsek && customTpl.nama_kepsek.trim())
      || (settings.headmaster_name && settings.headmaster_name.trim())
      || (req.user?.name && !['Administrator', 'admin', 'Admin'].includes(req.user.name) ? req.user.name : 'Kepala Sekolah');
    const kepsekOfficialNip = (customTpl.nip_kepsek && customTpl.nip_kepsek.trim())
      || (settings.headmaster_nip && settings.headmaster_nip.trim())
      || '-';
    const kepsekId = req.user?.id || 'kepsek';

    const pengesahan = await savePerangkatPengesahan({
      teacher_id,
      teacher_name,
      nip,
      mapel: mapel || '',
      tahun_ajaran: tahun_ajaran || '2025-2026',
      semester: semester || 'Ganjil',
      kepsek_id: kepsekId,
      kepsek_name: kepsekOfficialName,
      nip_kepsek: kepsekOfficialNip,
      tipe_pengesahan,
      ttd_image_base64,
      qr_signature_data: qr_signature_data || {
        verified_by: kepsekOfficialName,
        nip: kepsekOfficialNip,
        teacher_name,
        teacher_nip: nip,
        endorsed_at: new Date().toISOString(),
        security_hash: `VERIF-SCH-${teacher_id.slice(0, 4)}-${Date.now()}`
      },
      tanggal_pengesahan: new Date().toISOString(),
      status: 'DISAHKAN'
    });

    await savePerangkatApprovalLog({
      teacher_id,
      user_id: kepsekId,
      user_name: kepsekOfficialName,
      role: 'KEPALA_SEKOLAH',
      action: 'PENGESAHAN_KEPSEK',
      catatan: `Mengesahkan seluruh perangkat ajar dengan ${tipe_pengesahan === 'TTD_DIGITAL' ? 'Tanda Tangan Digital' : 'QR Code Pengesahan Resmi'}`
    });

    res.json({
      success: true,
      message: 'Perangkat ajar berhasil disahkan secara resmi oleh Kepala Sekolah',
      data: pengesahan
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * 10. Mengambil Lembar Pengesahan Guru
 */
router.get('/pengesahan/:teacherId', async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;
    const { tahun_ajaran, semester } = req.query;
    const pengesahan = await getPerangkatPengesahanByTeacher(teacherId, tahun_ajaran as string, semester as string);
    res.json({ success: true, data: pengesahan });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * 11. Laporan Progres & Monitoring (Admin, Waka Kurikulum, Kepala Sekolah)
 */
router.get('/progress-report', async (req: Request, res: Response) => {
  try {
    let { tahun_ajaran, semester } = req.query;
    if (!tahun_ajaran || !semester) {
      const activePeriod = await getActivePeriod();
      if (!tahun_ajaran) tahun_ajaran = activePeriod.tahun_ajaran;
      if (!semester) semester = activePeriod.semester;
    }
    const reports = await getAllTeacherProgressReports(tahun_ajaran as string, semester as string);
    res.json({ success: true, data: reports });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * 12. Approval Logs
 */
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const { dokumen_id, teacher_id } = req.query;
    const logs = await getPerangkatApprovalLogs(dokumen_id as string, teacher_id as string);
    res.json({ success: true, data: logs });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * 13. Reset Status Verifikasi Dokumen
 */
router.post('/dokumen/:id/reset-status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await resetDokumenStatus(id);
    await savePerangkatApprovalLog({
      dokumen_id: id,
      user_id: req.user?.id || 'admin',
      user_name: req.user?.name || 'Administrator',
      role: req.user?.role || 'admin',
      action: 'RESET_STATUS',
      catatan: 'Status dokumen di-reset kembali ke Menunggu Verifikasi'
    });
    res.json({ success: true, message: 'Status dokumen berhasil di-reset ke Menunggu Verifikasi' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * 14. Reset Pengesahan Guru
 */
router.post('/pengesahan/:teacherId/reset', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { teacherId } = req.params;
    const { tahun_ajaran, semester } = req.body;
    await resetPengesahanByTeacher(teacherId, tahun_ajaran, semester);
    await savePerangkatApprovalLog({
      teacher_id: teacherId,
      user_id: req.user?.id || 'admin',
      user_name: req.user?.name || 'Administrator',
      role: req.user?.role || 'admin',
      action: 'RESET_PENGESAHAN',
      catatan: 'Pengesahan lembar perangkat ajar berhasil dibatalkan / di-reset'
    });
    res.json({ success: true, message: 'Pengesahan berhasil di-reset' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * 15. Hapus Seluruh Pengaturan Berkas (Reset Kategori)
 */
router.post('/categories/reset-all', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'admin' && userRole !== 'WAKIL_KURIKULUM') {
      return res.status(403).json({ error: 'Hanya Admin dan Waka Kurikulum yang berwenang mereset seluruh pengaturan berkas' });
    }
    await resetAllPerangkatCategories();
    res.json({ success: true, message: 'Seluruh pengaturan jenis berkas berhasil dikosongkan untuk ditata ulang' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * 16. Template Lembar Pengesahan (Get & Save)
 */
router.get('/pengesahan-template', async (req: Request, res: Response) => {
  try {
    const settings = await getSettings();
    const activeWaka = await getAssignedWakaKurikulum();

    const defaultTemplate = {
      instansi_induk: settings.instansi_induk || 'PEMERINTAH DAERAH PROVINSI',
      dinas_pendidikan: settings.dinas_pendidikan || 'DINAS PENDIDIKAN',
      nama_sekolah: settings.nama_sekolah || settings.schoolName || settings.nama_website || 'SMK NEGERI CONTOH',
      alamat_sekolah: settings.alamat_sekolah || settings.schoolAddress || 'Jl. Pendidikan No. 123',
      kontak_sekolah: settings.kontak_sekolah || 'Telp: (021) 1234567 | Website: www.sekolah.sch.id',
      judul_lembar: 'LEMBAR PENGESAHAN PERANGKAT AJAR',
      redaksi_pembuka: 'Setelah melalui tahapan penyusunan, telaah teknis, dan verifikasi kelayakan akademik oleh Tim Pengembang Kurikulum Sekolah, Perangkat Perencanaan Pembelajaran (Perangkat Ajar) yang disusun oleh:',
      redaksi_persetujuan: 'Dinyatakan telah MEMENUHI STANDAR KELENGKAPAN KURIKULUM dan DISAHKAN untuk dipergunakan sebagai pedoman operasional Kegiatan Belajar Mengajar (KBM).',
      titimangsa_kota: settings.kota || settings.titimangsa_kota || 'Bojonegoro',
      tampilkan_ttd_guru: true,
      tampilkan_ttd_kurikulum: true,
      nama_waka_kurikulum: activeWaka?.name || settings.nama_waka_kurikulum || 'Waka Kurikulum',
      nip_waka_kurikulum: activeWaka?.nip || settings.nip_waka_kurikulum || '-',
      nama_kepsek: settings.headmaster_name || settings.kepala_sekolah_nama || 'Kepala Sekolah',
      nip_kepsek: settings.headmaster_nip || settings.kepala_sekolah_nip || '-',
      tipe_pengesahan_default: 'QR_CODE', // QR_CODE | TTD_DIGITAL | KEDUANYA
      catatan_kaki: 'Dokumen ini telah diverifikasi secara elektronik dan dinyatakan sah sebagai dokumen mutu pembelajaran.'
    };

    const savedTpl = settings.pengesahan_template || {};
    const tpl = {
      ...defaultTemplate,
      ...savedTpl,
      // If nama_waka_kurikulum in savedTpl is missing or was default placeholder, auto-populate from active assignment
      nama_waka_kurikulum: (savedTpl.nama_waka_kurikulum && savedTpl.nama_waka_kurikulum.trim() !== '' && savedTpl.nama_waka_kurikulum !== 'Waka Kurikulum')
        ? savedTpl.nama_waka_kurikulum
        : (activeWaka?.name || defaultTemplate.nama_waka_kurikulum),
      nip_waka_kurikulum: (savedTpl.nip_waka_kurikulum && savedTpl.nip_waka_kurikulum.trim() !== '' && savedTpl.nip_waka_kurikulum !== '-')
        ? savedTpl.nip_waka_kurikulum
        : (activeWaka?.nip || defaultTemplate.nip_waka_kurikulum),
      nama_kepsek: (savedTpl.nama_kepsek && savedTpl.nama_kepsek.trim() !== '' && savedTpl.nama_kepsek !== 'Kepala Sekolah')
        ? savedTpl.nama_kepsek
        : defaultTemplate.nama_kepsek,
      nip_kepsek: (savedTpl.nip_kepsek && savedTpl.nip_kepsek.trim() !== '' && savedTpl.nip_kepsek !== '-')
        ? savedTpl.nip_kepsek
        : defaultTemplate.nip_kepsek
    };

    res.json({ success: true, data: tpl, active_waka: activeWaka });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/pengesahan-template', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'admin' && userRole !== 'WAKIL_KURIKULUM' && userRole !== 'KEPALA_SEKOLAH') {
      return res.status(403).json({ error: 'Akses ditolak' });
    }

    const templateData = req.body;
    const updated = await updateSettings({ pengesahan_template: templateData });
    res.json({ success: true, message: 'Template Lembar Pengesahan berhasil disimpan', data: updated.pengesahan_template || templateData });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * 17. Batch Action: Verifikasi Semua Berkas Guru (Waka Kurikulum)
 */
router.post('/verify-all', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'admin' && userRole !== 'WAKIL_KURIKULUM') {
      return res.status(403).json({ error: 'Hanya Waka Kurikulum atau Admin yang berwenang melakukan verifikasi berkas' });
    }

    const { teacher_id, catatan } = req.body;
    const reviewerName = req.user?.name || 'Waka Kurikulum';
    const updatedCount = await verifyAllDokumenForTeacher(teacher_id || 'ALL', reviewerName, catatan || 'Diverifikasi secara massal (Batch Verification)');

    res.json({
      success: true,
      message: `Berhasil memverifikasi ${updatedCount} berkas perangkat ajar`,
      count: updatedCount
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * 18. Batch Action: Sahkan Semua Guru Terverifikasi (Kepala Sekolah)
 */
router.post('/approve-all', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'admin' && userRole !== 'KEPALA_SEKOLAH') {
      return res.status(403).json({ error: 'Hanya Kepala Sekolah yang berwenang melakukan pengesahan resmi' });
    }

    const { tahun_ajaran, semester, tipe_pengesahan } = req.body;
    const settings = await getSettings();
    const customTpl = settings.pengesahan_template || {};
    const kepsekOfficialName = (customTpl.nama_kepsek && customTpl.nama_kepsek.trim())
      || (settings.headmaster_name && settings.headmaster_name.trim())
      || (req.user?.name && !['Administrator', 'admin', 'Admin'].includes(req.user.name) ? req.user.name : 'Kepala Sekolah');
    const kepsekId = req.user?.id || 'kepsek';

    const endorsedCount = await approveAllVerifiedTeachers(
      kepsekId,
      kepsekOfficialName,
      tahun_ajaran || '2024/2025',
      semester || 'Ganjil',
      tipe_pengesahan || 'QR_CODE'
    );

    res.json({
      success: true,
      message: `Berhasil membubuhkan pengesahan resmi untuk ${endorsedCount} guru yang telah lengkap diverifikasi`,
      count: endorsedCount
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * 19. Reset Seluruh Berkas & Proses Pengunggahan Perangkat Ajar Guru (Admin / Kurikulum / Kepsek)
 */
router.post(['/reset-all', '/reset-all-submissions'], authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'admin' && userRole !== 'WAKIL_KURIKULUM' && userRole !== 'KEPALA_SEKOLAH') {
      return res.status(403).json({ error: 'Akses ditolak. Tindakan ini hanya dapat dilakukan oleh Administrator / Kurikulum.' });
    }

    const { tahun_ajaran, semester } = req.body;
    const actorName = req.user?.name || req.user?.username || 'Administrator';
    const result = await resetAllPerangkatSubmissions(tahun_ajaran, semester, actorName);

    res.json({
      success: true,
      message: `Reset berhasil. ${result.deletedDocs} berkas unggahan dan ${result.deletedPengesahan} pengesahan telah dikosongkan. Seluruh progres guru telah kembali ke 0%.`,
      data: result
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * 20. Pengaturan Kirim Rekap WhatsApp Perangkat Ajar
 */
router.get('/whatsapp-rekap/config', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = await getSettings();
    const gateway = await getWhatsAppGatewayStatus();

    const defaultConfig = {
      is_active: true,
      target_group_id: '',
      target_group_name: '',
      send_mode: 'AUTO_FRIDAY', // 'MANUAL' | 'AUTO_FRIDAY' | 'AUTO_WEEKEND'
      auto_send_time: '15:00',
      custom_message_header: '',
      last_sent_at: null
    };

    const savedConfig = settings.perangkat_wa_rekap || (settings.data && settings.data.perangkat_wa_rekap) || {};
    const config = {
      ...defaultConfig,
      ...savedConfig
    };

    res.json({
      success: true,
      config,
      gateway
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/whatsapp-rekap/config', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'admin' && userRole !== 'WAKIL_KURIKULUM' && userRole !== 'KEPALA_SEKOLAH') {
      return res.status(403).json({ error: 'Akses ditolak' });
    }

    const configData = req.body;
    const settings = await getSettings();
    const existing = settings.perangkat_wa_rekap || {};
    const updatedConfig = {
      ...existing,
      ...configData,
      updated_at: new Date().toISOString()
    };

    await updateSettings({ perangkat_wa_rekap: updatedConfig });

    res.json({
      success: true,
      message: 'Pengaturan Kirim Rekap WhatsApp berhasil disimpan',
      config: updatedConfig
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * 21. Uji Coba Koneksi / Kirim Pesan Tes ke WhatsApp Grup Tujuan
 */
router.post('/whatsapp-rekap/test', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { target_group_id, target_group_name } = req.body;
    if (!target_group_id || !target_group_id.trim()) {
      return res.status(400).json({ error: 'ID Grup WhatsApp tujuan wajib diisi untuk pengujian.' });
    }

    const settings = await getSettings();
    const schoolName = settings.nama_sekolah || settings.schoolName || settings.nama_website || 'Sekolah';
    const nowStr = new Date().toLocaleString('id-ID');

    const testMsg = `🧪 *[UJI COBA KONEKSI WHATSAPP REKAP]*\n🏫 *${schoolName}*\n\nHalo! Sistem Administrasi & Supervisi Perangkat Pembelajaran berhasil terhubung dengan Gateway WhatsApp Utama.\n\n🎯 *Target:* ${target_group_name || target_group_id}\n🕒 *Waktu Uji:* ${nowStr} WIB\n\n✅ *Status:* Siap mengirimkan notifikasi dan rekapitulasi supervisi perangkat ajar guru.`;

    const result = await sendWhatsAppViaConfiguredGateway(target_group_id.trim(), testMsg, settings);

    res.json({
      success: true,
      message: `Pesan uji coba berhasil dikirim ke "${target_group_name || target_group_id}"!`,
      result
    });
  } catch (e: any) {
    console.error('Test WA Rekap Error:', e);
    res.status(500).json({ error: e.message || 'Gagal mengirim pesan uji coba WhatsApp' });
  }
});

/**
 * 22. Pratinjau Teks Pesan Rekap WhatsApp
 */
router.post('/whatsapp-rekap/preview', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tahun_ajaran, semester, custom_note } = req.body;
    const settings = await getSettings();
    const currentPeriod = await getActivePeriod();

    const finalTa = tahun_ajaran || currentPeriod.tahun_ajaran;
    const finalSem = semester || currentPeriod.semester;

    const reports = await getAllTeacherProgressReports(finalTa, finalSem);
    const schoolName = settings.nama_sekolah || settings.schoolName || settings.nama_website || 'Sekolah';
    const appUrl = req.headers.origin || (req.protocol + '://' + req.get('host'));

    const message = formatPerangkatSupervisiWhatsAppMessage({
      schoolName,
      tahunAjaran: finalTa,
      semester: finalSem,
      reports,
      appUrl,
      customNote: custom_note
    });

    res.json({
      success: true,
      message,
      total_teachers: reports.length
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * 23. Kirim Rekapitulasi Supervisi Perangkat Ajar ke WhatsApp (Manual Trigger)
 */
router.post('/whatsapp-rekap/send', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'admin' && userRole !== 'WAKIL_KURIKULUM' && userRole !== 'KEPALA_SEKOLAH') {
      return res.status(403).json({ error: 'Hanya Admin, Waka Kurikulum, atau Kepala Sekolah yang berwenang mengirimkan rekap ke WhatsApp.' });
    }

    const { tahun_ajaran, semester, target_group_id, custom_note } = req.body;
    const settings = await getSettings();
    const config = settings.perangkat_wa_rekap || {};

    const finalTargetGroup = (target_group_id && target_group_id.trim())
      || (config.target_group_id && config.target_group_id.trim());

    if (!finalTargetGroup) {
      return res.status(400).json({
        error: 'ID Grup WhatsApp tujuan belum diisi. Silakan tentukan tujuan pada Pengaturan WhatsApp Rekap atau masukkan grup tujuan.'
      });
    }

    const currentPeriod = await getActivePeriod();
    const finalTa = tahun_ajaran || currentPeriod.tahun_ajaran;
    const finalSem = semester || currentPeriod.semester;

    const reports = await getAllTeacherProgressReports(finalTa, finalSem);
    const schoolName = settings.nama_sekolah || settings.schoolName || settings.nama_website || 'Sekolah';
    const appUrl = req.headers.origin || (req.protocol + '://' + req.get('host'));

    const message = formatPerangkatSupervisiWhatsAppMessage({
      schoolName,
      tahunAjaran: finalTa,
      semester: finalSem,
      reports,
      appUrl,
      customNote: custom_note
    });

    const result = await sendWhatsAppViaConfiguredGateway(finalTargetGroup, message, settings);

    // Update timestamp last_sent_at
    const nowIso = new Date().toISOString();
    const updatedConfig = {
      ...config,
      last_sent_at: nowIso
    };
    await updateSettings({ perangkat_wa_rekap: updatedConfig });

    res.json({
      success: true,
      message: `Laporan rekapitulasi supervisi berhasil dikirim ke WhatsApp (${finalTargetGroup})!`,
      sent_at: nowIso,
      target_group: finalTargetGroup,
      total_teachers: reports.length,
      result
    });
  } catch (e: any) {
    console.error('Send WA Rekap Error:', e);
    res.status(500).json({ error: e.message || 'Gagal mengirim rekapitulasi ke WhatsApp' });
  }
});

export default router;
