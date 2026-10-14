import fs from 'fs';
import path from 'path';
import { safeDbQuery, pool } from './db.ts';
import { getAllTeachers, getActivePeriod } from './dataStore.ts';
import { randomUUID } from 'crypto';

export function matchPeriod(recordTa?: string, targetTa?: string): boolean {
  if (!targetTa || targetTa === 'SEMUA') return true;
  if (!recordTa) return true; // Sambungkan dokumen legacy/tanpa tahun ajaran ke periode aktif
  const cleanRec = recordTa.replace(/\//g, '-').trim().toLowerCase();
  const cleanTarget = targetTa.replace(/\//g, '-').trim().toLowerCase();
  return cleanRec === cleanTarget;
}

export function matchSemester(recordSem?: string, targetSem?: string): boolean {
  if (!targetSem || targetSem === 'SEMUA') return true;
  if (!recordSem) return true;
  return recordSem.trim().toLowerCase() === targetSem.trim().toLowerCase();
}

/**
 * Cek apakah ada berkas / proses verifikasi yang sedang aktif pada periode saat ini
 */
export async function checkActivePeriodPendingStatus(tahunAjaran?: string, semester?: string): Promise<{
  hasPending: boolean;
  totalPending: number;
  menungguVerifikasiCount: number;
  menungguPengesahanCount: number;
  revisiCount: number;
  terkirimMapelCount: number;
  summaryText: string;
}> {
  const activePeriod = await getActivePeriod();
  const ta = tahunAjaran || activePeriod.tahun_ajaran;
  const sem = semester || activePeriod.semester;

  let allDocs: PerangkatDokumen[] = [];
  let allMapels: PerangkatTeacherMapel[] = [];
  try {
    const resDocs = await safeDbQuery<PerangkatDokumen>('SELECT * FROM perangkat_dokumen');
    if (resDocs.success && resDocs.rows) allDocs = resDocs.rows;
    const resMapel = await safeDbQuery<PerangkatTeacherMapel>('SELECT * FROM perangkat_teacher_mapel');
    if (resMapel.success && resMapel.rows) allMapels = resMapel.rows;
  } catch (e) {}

  if (allDocs.length === 0) {
    allDocs = readJson<PerangkatDokumen[]>(PERANGKAT_DOCS_FILE, []);
  }
  if (allMapels.length === 0) {
    allMapels = readJson<PerangkatTeacherMapel[]>(PERANGKAT_MAPEL_FILE, []);
  }

  const periodDocs = allDocs.filter(d => matchPeriod(d.tahun_ajaran, ta) && matchSemester(d.semester, sem));
  const periodMapels = allMapels.filter(m => matchPeriod(m.tahun_ajaran, ta) && matchSemester(m.semester, sem));

  const menungguVerifikasiCount = periodDocs.filter(d => d.status === 'MENUNGGU_VERIFIKASI').length;
  const revisiCount = periodDocs.filter(d => d.status === 'DITOLAK_KURIKULUM' || d.status === 'REVISI_KEPSEK').length;
  const menungguPengesahanCount = periodDocs.filter(d => d.status === 'TERVERIFIKASI_KURIKULUM').length;
  const terkirimMapelCount = periodMapels.filter(m => m.status_submit === 'TERKIRIM').length;

  const totalPending = menungguVerifikasiCount + revisiCount + (menungguPengesahanCount > 0 ? 1 : 0);
  const hasPending = totalPending > 0 || terkirimMapelCount > 0;

  const summaryText = hasPending
    ? `Pada periode aktif (${ta} - Semester ${sem}) saat ini sedang berlangsung proses pengisian dan verifikasi: ${menungguVerifikasiCount} berkas menunggu verifikasi kurikulum, ${revisiCount} berkas dalam revisi, dan ${terkirimMapelCount} mapel terkirim.`
    : `Tidak ada proses verifikasi atau berkas yang tertunda pada periode aktif (${ta} - Semester ${sem}).`;

  return {
    hasPending,
    totalPending,
    menungguVerifikasiCount,
    menungguPengesahanCount,
    revisiCount,
    terkirimMapelCount,
    summaryText
  };
}

export interface PerangkatCategory {
  id: string;
  nama: string;
  target_jumlah: number;
  tipe_pengadaan: 'DARI_GURU' | 'DARI_KURIKULUM';
  is_bertahap?: boolean;
  target_pertemuan?: number;
  file_kurikulum_url?: string | null;
  file_kurikulum_name?: string | null;
  gdrive_folder_id?: string | null;
  tahun_ajaran?: string;
  semester?: string;
  created_at?: string;
}

export interface PerangkatTeacherMapel {
  id: string;
  teacher_id: string;
  teacher_name?: string;
  mapel_id?: string;
  mapel_name: string;
  sub_mapel?: string;
  rombel: string[]; // List of rombel names, e.g. ["X-RPL 1", "X-RPL 2"]
  tahun_ajaran?: string;
  semester?: string;
  status_submit?: 'DRAFT' | 'TERKIRIM';
  submitted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PerangkatDokumen {
  id: string;
  category_id: string;
  category_nama?: string;
  teacher_id: string;
  teacher_name?: string;
  teacher_mapel_id?: string;
  file_name: string;
  file_size?: number;
  file_path?: string;
  file_url?: string;
  gdrive_file_id?: string | null;
  gdrive_web_view_link?: string | null;
  status: 'MENUNGGU_VERIFIKASI' | 'TERVERIFIKASI_KURIKULUM' | 'DITOLAK_KURIKULUM' | 'REVISI_KEPSEK' | 'DISETUJUI_KEPSEK';
  catatan_revisi?: string;
  mapel?: string;
  sub_mapel?: string;
  rombel?: string;
  pertemuan_ke?: string;
  keterangan?: string;
  tahun_ajaran?: string;
  semester?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PerangkatPengesahan {
  id: string;
  teacher_id: string;
  teacher_name?: string;
  nip?: string;
  mapel?: string;
  rombel?: string;
  tahun_ajaran: string;
  semester: string;
  kepsek_id?: string;
  kepsek_name?: string;
  nip_kepsek?: string;
  tipe_pengesahan: 'TTD_DIGITAL' | 'QR_CODE';
  ttd_image_base64?: string | null;
  qr_signature_data?: any;
  tanggal_pengesahan?: string;
  status: string;
  created_at?: string;
}

export interface PerangkatApprovalLog {
  id: string;
  dokumen_id?: string | null;
  teacher_id?: string | null;
  user_id?: string;
  user_name?: string;
  role?: string;
  action: string;
  catatan?: string;
  created_at?: string;
}

export interface TeacherMapelProgress {
  id: string;
  mapel_name: string;
  sub_mapel?: string;
  rombel: string[];
  total_wajib: number;
  sudah_upload: number;
  terverifikasi: number;
  menunggu_verifikasi: number;
  perlu_revisi: number;
  persentase: number;
  is_lengkap: boolean;
  status_submit?: 'DRAFT' | 'TERKIRIM';
  dokumen_list: PerangkatDokumen[];
}

export interface TeacherProgressReport {
  teacher_id: string;
  name: string;
  nip: string;
  whatsapp: string;
  class?: string;
  mapel_list: TeacherMapelProgress[];
  total_wajib: number;
  sudah_upload: number;
  terverifikasi: number;
  menunggu_verifikasi: number;
  perlu_revisi: number;
  persentase: number;
  status_pengesahan: 'DISAHKAN' | 'MENUNGGU_PENGESAHAN' | 'BELUM_LENGKAP';
  dokumen_list: PerangkatDokumen[];
  pengesahan?: PerangkatPengesahan | null;
}

// In-Memory / Local JSON Fallback Files
const DATA_DIR = path.join(process.cwd(), 'uploads', 'data');
if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}
const PERANGKAT_CATS_FILE = path.join(DATA_DIR, 'perangkat_categories.json');
const PERANGKAT_MAPEL_FILE = path.join(DATA_DIR, 'perangkat_teacher_mapel.json');
const PERANGKAT_DOCS_FILE = path.join(DATA_DIR, 'perangkat_dokumen.json');
const PERANGKAT_PENGESAHAN_FILE = path.join(DATA_DIR, 'perangkat_pengesahan.json');
const PERANGKAT_LOGS_FILE = path.join(DATA_DIR, 'perangkat_approval_logs.json');

function readJson<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (e) {}
  return fallback;
}

function writeJson<T>(filePath: string, data: T) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {}
}

// Initial default categories
const DEFAULT_CATEGORIES: PerangkatCategory[] = [
  { id: 'pkg-1', nama: 'Capaian Pembelajaran (CP)', target_jumlah: 1, tipe_pengadaan: 'DARI_GURU' },
  { id: 'pkg-2', nama: 'Alur Tujuan Pembelajaran (ATP)', target_jumlah: 1, tipe_pengadaan: 'DARI_GURU' },
  { id: 'pkg-3', nama: 'Modul Ajar / RPP', target_jumlah: 2, tipe_pengadaan: 'DARI_GURU' },
  { id: 'pkg-4', nama: 'Program Tahunan (Prota)', target_jumlah: 1, tipe_pengadaan: 'DARI_GURU' },
  { id: 'pkg-5', nama: 'Program Semester (Promes)', target_jumlah: 1, tipe_pengadaan: 'DARI_GURU' },
  { id: 'pkg-6', nama: 'Kriteria Ketercapaian Tujuan Pembelajaran (KKTP)', target_jumlah: 1, tipe_pengadaan: 'DARI_GURU' },
  { id: 'pkg-7', nama: 'Kalender Pendidikan (Kaldik)', target_jumlah: 1, tipe_pengadaan: 'DARI_KURIKULUM', file_kurikulum_name: 'Kalender_Pendidikan.pdf' },
  { id: 'pkg-8', nama: 'Jadwal & SK Pembagian Tugas KBM', target_jumlah: 1, tipe_pengadaan: 'DARI_KURIKULUM', file_kurikulum_name: 'SK_Pembagian_Tugas_KBM.pdf' }
];

/**
 * Mengambil semua kategori perangkat
 */
export async function getAllPerangkatCategories(tahunAjaran?: string, semester?: string): Promise<PerangkatCategory[]> {
  try {
    let query = 'SELECT * FROM perangkat_categories WHERE 1=1';
    const params: any[] = [];
    if (tahunAjaran && tahunAjaran !== 'SEMUA') {
      params.push(tahunAjaran);
      query += ` AND (tahun_ajaran = $${params.length} OR tahun_ajaran = '' OR tahun_ajaran IS NULL)`;
    }
    if (semester && semester !== 'SEMUA') {
      params.push(semester);
      query += ` AND (semester = $${params.length} OR semester = '' OR semester IS NULL)`;
    }
    query += ' ORDER BY tipe_pengadaan ASC, created_at ASC, id ASC';

    const res = await safeDbQuery<PerangkatCategory>(query, params);
    if (res.success && res.rows.length > 0) {
      return res.rows;
    }

    // Jika database terhubung tetapi tabel perangkat_categories kosong, sync/seed data lokal ke PostgreSQL
    if (res.success && res.rows.length === 0) {
      const countRes = await safeDbQuery<{ count: string }>('SELECT COUNT(*) as count FROM perangkat_categories');
      if (countRes.success && (countRes.rows.length === 0 || Number(countRes.rows[0].count) === 0)) {
        const locCats = readJson<PerangkatCategory[]>(PERANGKAT_CATS_FILE, DEFAULT_CATEGORIES);
        for (const cat of locCats) {
          await safeDbQuery(
            `INSERT INTO perangkat_categories (id, nama, target_jumlah, tipe_pengadaan, file_kurikulum_url, file_kurikulum_name, gdrive_folder_id, tahun_ajaran, semester, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (id) DO NOTHING`,
            [
              cat.id,
              cat.nama,
              cat.target_jumlah || 1,
              cat.tipe_pengadaan || 'DARI_GURU',
              cat.file_kurikulum_url || null,
              cat.file_kurikulum_name || null,
              cat.gdrive_folder_id || null,
              cat.tahun_ajaran || '',
              cat.semester || '',
              cat.created_at || new Date().toISOString()
            ]
          );
        }
        // Query ulang setelah di-seed
        const recheck = await safeDbQuery<PerangkatCategory>(query, params);
        if (recheck.success && recheck.rows.length > 0) {
          return recheck.rows;
        }
      }
    }
  } catch (e) {}

  const loc = readJson<PerangkatCategory[]>(PERANGKAT_CATS_FILE, DEFAULT_CATEGORIES);
  return loc;
}

/**
 * Menyimpan / memperbarui kategori perangkat
 */
export async function savePerangkatCategory(cat: Partial<PerangkatCategory>): Promise<PerangkatCategory> {
  const newCat: PerangkatCategory = {
    id: cat.id || `pkg-${Date.now()}`,
    nama: cat.nama || 'Kategori Baru',
    target_jumlah: Number(cat.target_jumlah) || 1,
    tipe_pengadaan: cat.tipe_pengadaan || 'DARI_GURU',
    is_bertahap: Boolean(cat.is_bertahap),
    target_pertemuan: Number(cat.target_pertemuan) || (cat.is_bertahap ? 18 : undefined),
    file_kurikulum_url: cat.file_kurikulum_url || null,
    file_kurikulum_name: cat.file_kurikulum_name || null,
    gdrive_folder_id: cat.gdrive_folder_id || null,
    tahun_ajaran: cat.tahun_ajaran || '',
    semester: cat.semester || '',
    created_at: cat.created_at || new Date().toISOString()
  };

  try {
    await safeDbQuery(
      `INSERT INTO perangkat_categories (id, nama, target_jumlah, tipe_pengadaan, file_kurikulum_url, file_kurikulum_name, gdrive_folder_id, tahun_ajaran, semester, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
         nama = EXCLUDED.nama,
         target_jumlah = EXCLUDED.target_jumlah,
         tipe_pengadaan = EXCLUDED.tipe_pengadaan,
         file_kurikulum_url = EXCLUDED.file_kurikulum_url,
         file_kurikulum_name = EXCLUDED.file_kurikulum_name,
         gdrive_folder_id = EXCLUDED.gdrive_folder_id,
         tahun_ajaran = EXCLUDED.tahun_ajaran,
         semester = EXCLUDED.semester`,
      [newCat.id, newCat.nama, newCat.target_jumlah, newCat.tipe_pengadaan, newCat.file_kurikulum_url, newCat.file_kurikulum_name, newCat.gdrive_folder_id, newCat.tahun_ajaran, newCat.semester, newCat.created_at]
    );
  } catch (e) {}

  const loc = readJson<PerangkatCategory[]>(PERANGKAT_CATS_FILE, DEFAULT_CATEGORIES);
  const idx = loc.findIndex(c => c.id === newCat.id);
  if (idx >= 0) {
    loc[idx] = newCat;
  } else {
    loc.push(newCat);
  }
  writeJson(PERANGKAT_CATS_FILE, loc);
  return newCat;
}

/**
 * Menghapus kategori perangkat
 */
export async function deletePerangkatCategory(id: string): Promise<boolean> {
  try {
    await safeDbQuery('DELETE FROM perangkat_categories WHERE id = $1', [id]);
  } catch (e) {}

  const loc = readJson<PerangkatCategory[]>(PERANGKAT_CATS_FILE, DEFAULT_CATEGORIES);
  const filtered = loc.filter(c => c.id !== id);
  writeJson(PERANGKAT_CATS_FILE, filtered);
  return true;
}

/**
 * Mengambil semua mapel yang didaftarkan guru untuk periode tertentu
 */
export async function getTeacherMapelList(
  teacherId: string,
  tahunAjaran?: string,
  semester?: string
): Promise<PerangkatTeacherMapel[]> {
  try {
    let query = 'SELECT * FROM perangkat_teacher_mapel WHERE teacher_id = $1';
    const params: any[] = [teacherId];
    if (tahunAjaran && tahunAjaran !== 'SEMUA') {
      params.push(tahunAjaran);
      query += ` AND (tahun_ajaran = $${params.length} OR tahun_ajaran = '' OR tahun_ajaran IS NULL)`;
    }
    if (semester && semester !== 'SEMUA') {
      params.push(semester);
      query += ` AND (semester = $${params.length} OR semester = '' OR semester IS NULL)`;
    }
    query += ' ORDER BY created_at ASC, id ASC';

    const res = await safeDbQuery<any>(query, params);
    if (res.success && res.rows.length > 0) {
      return res.rows.map(r => ({
        ...r,
        rombel: Array.isArray(r.rombel) ? r.rombel : (typeof r.rombel === 'string' ? (r.rombel.startsWith('[') ? JSON.parse(r.rombel) : r.rombel.split(',').map((s: string) => s.trim()).filter(Boolean)) : [])
      }));
    }
  } catch (e) {}

  const loc = readJson<PerangkatTeacherMapel[]>(PERANGKAT_MAPEL_FILE, []);
  return loc.filter(m => m.teacher_id === teacherId && matchPeriod(m.tahun_ajaran, tahunAjaran) && matchSemester(m.semester, semester));
}

/**
 * Mengambil semua mapel dari seluruh guru
 */
export async function getAllTeacherMapels(tahunAjaran?: string, semester?: string): Promise<PerangkatTeacherMapel[]> {
  try {
    let query = 'SELECT * FROM perangkat_teacher_mapel WHERE 1=1';
    const params: any[] = [];
    if (tahunAjaran && tahunAjaran !== 'SEMUA') {
      params.push(tahunAjaran);
      query += ` AND (tahun_ajaran = $${params.length} OR tahun_ajaran = '' OR tahun_ajaran IS NULL)`;
    }
    if (semester && semester !== 'SEMUA') {
      params.push(semester);
      query += ` AND (semester = $${params.length} OR semester = '' OR semester IS NULL)`;
    }
    query += ' ORDER BY created_at ASC';

    const res = await safeDbQuery<any>(query, params);
    if (res.success && res.rows.length > 0) {
      return res.rows.map(r => ({
        ...r,
        rombel: Array.isArray(r.rombel) ? r.rombel : (typeof r.rombel === 'string' ? (r.rombel.startsWith('[') ? JSON.parse(r.rombel) : r.rombel.split(',').map((s: string) => s.trim()).filter(Boolean)) : [])
      }));
    }
  } catch (e) {}

  const loc = readJson<PerangkatTeacherMapel[]>(PERANGKAT_MAPEL_FILE, []);
  return loc.filter(m => matchPeriod(m.tahun_ajaran, tahunAjaran) && matchSemester(m.semester, semester));
}

/**
 * Menyimpan / memperbarui mapel yang diampu guru
 */
export async function saveTeacherMapel(mapel: Partial<PerangkatTeacherMapel>): Promise<PerangkatTeacherMapel> {
  const activePeriod = await getActivePeriod();
  const finalTa = (mapel.tahun_ajaran && mapel.tahun_ajaran.trim()) ? mapel.tahun_ajaran.trim() : activePeriod.tahun_ajaran;
  const finalSem = (mapel.semester && mapel.semester.trim()) ? mapel.semester.trim() : activePeriod.semester;

  const newMapel: PerangkatTeacherMapel = {
    id: mapel.id || `mapel-${Date.now()}-${randomUUID().slice(0, 6)}`,
    teacher_id: mapel.teacher_id || '',
    teacher_name: mapel.teacher_name || '',
    mapel_id: mapel.mapel_id || '',
    mapel_name: mapel.mapel_name || 'Mata Pelajaran',
    sub_mapel: mapel.sub_mapel || '',
    rombel: Array.isArray(mapel.rombel) ? mapel.rombel : [],
    tahun_ajaran: finalTa,
    semester: finalSem,
    status_submit: mapel.status_submit || 'DRAFT',
    submitted_at: mapel.submitted_at || null,
    created_at: mapel.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    await safeDbQuery(
      `INSERT INTO perangkat_teacher_mapel (id, teacher_id, teacher_name, mapel_id, mapel_name, sub_mapel, rombel, tahun_ajaran, semester, status_submit, submitted_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO UPDATE SET
         teacher_name = EXCLUDED.teacher_name,
         mapel_id = EXCLUDED.mapel_id,
         mapel_name = EXCLUDED.mapel_name,
         sub_mapel = EXCLUDED.sub_mapel,
         rombel = EXCLUDED.rombel,
         tahun_ajaran = EXCLUDED.tahun_ajaran,
         semester = EXCLUDED.semester,
         status_submit = EXCLUDED.status_submit,
         submitted_at = EXCLUDED.submitted_at,
         updated_at = EXCLUDED.updated_at`,
      [
        newMapel.id, newMapel.teacher_id, newMapel.teacher_name,
        newMapel.mapel_id, newMapel.mapel_name, newMapel.sub_mapel,
        JSON.stringify(newMapel.rombel),
        newMapel.tahun_ajaran, newMapel.semester,
        newMapel.status_submit, newMapel.submitted_at,
        newMapel.created_at, newMapel.updated_at
      ]
    );
  } catch (e) {}

  const loc = readJson<PerangkatTeacherMapel[]>(PERANGKAT_MAPEL_FILE, []);
  const idx = loc.findIndex(m => m.id === newMapel.id);
  if (idx >= 0) {
    loc[idx] = newMapel;
  } else {
    loc.push(newMapel);
  }
  writeJson(PERANGKAT_MAPEL_FILE, loc);
  return newMapel;
}

/**
 * Menghapus mapel yang diampu guru beserta dokumen yang diunggah untuk mapel tersebut
 */
export async function deleteTeacherMapel(id: string): Promise<boolean> {
  try {
    await safeDbQuery('DELETE FROM perangkat_dokumen WHERE teacher_mapel_id = $1', [id]);
    await safeDbQuery('DELETE FROM perangkat_teacher_mapel WHERE id = $1', [id]);
  } catch (e) {}

  // Delete from local JSON mapel
  const loc = readJson<PerangkatTeacherMapel[]>(PERANGKAT_MAPEL_FILE, []);
  const filtered = loc.filter(m => m.id !== id);
  writeJson(PERANGKAT_MAPEL_FILE, filtered);

  // Delete related docs from local JSON
  const docs = readJson<PerangkatDokumen[]>(PERANGKAT_DOCS_FILE, []);
  const filteredDocs = docs.filter(d => d.teacher_mapel_id !== id);
  writeJson(PERANGKAT_DOCS_FILE, filteredDocs);

  return true;
}

/**
 * Mengirim mapel dan seluruh dokumennya untuk diverifikasi kurikulum
 */
export async function submitTeacherMapel(id: string, actorName?: string): Promise<boolean> {
  const nowIso = new Date().toISOString();
  try {
    await safeDbQuery(
      `UPDATE perangkat_teacher_mapel SET status_submit = 'TERKIRIM', submitted_at = $1, updated_at = $1 WHERE id = $2`,
      [nowIso, id]
    );
  } catch (e) {}

  const loc = readJson<PerangkatTeacherMapel[]>(PERANGKAT_MAPEL_FILE, []);
  const target = loc.find(m => m.id === id);
  if (target) {
    target.status_submit = 'TERKIRIM';
    target.submitted_at = nowIso;
    target.updated_at = nowIso;
    writeJson(PERANGKAT_MAPEL_FILE, loc);

    await savePerangkatApprovalLog({
      teacher_id: target.teacher_id,
      user_name: actorName || target.teacher_name || 'Guru',
      role: 'GURU',
      action: 'SUBMIT_MAPEL_PERANGKAT',
      catatan: `Mengirim seluruh berkas perangkat ajar untuk Mata Pelajaran ${target.mapel_name} ke Waka Kurikulum.`
    });
  }
  return true;
}

/**
 * Mengambil dokumen yang diunggah oleh guru
 */
export async function getPerangkatDokumenByTeacher(
  teacherId: string, 
  tahunAjaran?: string, 
  semester?: string
): Promise<PerangkatDokumen[]> {
  try {
    let query = `
      SELECT d.*, c.nama as category_nama 
      FROM perangkat_dokumen d 
      LEFT JOIN perangkat_categories c ON d.category_id = c.id
      WHERE d.teacher_id = $1
    `;
    const params: any[] = [teacherId];
    if (tahunAjaran && tahunAjaran !== 'SEMUA') {
      params.push(tahunAjaran);
      query += ` AND (d.tahun_ajaran = $${params.length} OR d.tahun_ajaran = '' OR d.tahun_ajaran IS NULL)`;
    }
    if (semester && semester !== 'SEMUA') {
      params.push(semester);
      query += ` AND (d.semester = $${params.length} OR d.semester = '' OR d.semester IS NULL)`;
    }
    query += ' ORDER BY d.created_at DESC';

    const res = await safeDbQuery<PerangkatDokumen>(query, params);
    if (res.success) {
      return res.rows;
    }
  } catch (e) {}

  const loc = readJson<PerangkatDokumen[]>(PERANGKAT_DOCS_FILE, []);
  const cats = readJson<PerangkatCategory[]>(PERANGKAT_CATS_FILE, []);
  return loc
    .filter(d => d.teacher_id === teacherId && matchPeriod(d.tahun_ajaran, tahunAjaran) && matchSemester(d.semester, semester))
    .map(d => {
      if (!d.category_nama && d.category_id) {
        const cat = cats.find(c => c.id === d.category_id);
        if (cat) d.category_nama = cat.nama;
      }
      return d;
    });
}

/**
 * Menyimpan / mengunggah dokumen baru guru
 */
export async function savePerangkatDokumen(doc: Partial<PerangkatDokumen>): Promise<PerangkatDokumen> {
  const activePeriod = await getActivePeriod();
  const finalTa = (doc.tahun_ajaran && doc.tahun_ajaran.trim()) ? doc.tahun_ajaran.trim() : activePeriod.tahun_ajaran;
  const finalSem = (doc.semester && doc.semester.trim()) ? doc.semester.trim() : activePeriod.semester;

  const newDoc: PerangkatDokumen = {
    id: doc.id || `doc-${Date.now()}-${randomUUID().slice(0, 6)}`,
    category_id: doc.category_id || '',
    teacher_id: doc.teacher_id || '',
    teacher_name: doc.teacher_name || '',
    teacher_mapel_id: doc.teacher_mapel_id || '',
    file_name: doc.file_name || 'berkas.pdf',
    file_size: doc.file_size || 0,
    file_path: doc.file_path || '',
    file_url: doc.file_url || (doc.file_path ? `/api/v1/perangkat/preview/${doc.id || ''}` : ''),
    gdrive_file_id: doc.gdrive_file_id || doc.file_path || null,
    gdrive_web_view_link: doc.gdrive_web_view_link || (doc.file_path ? `/api/v1/perangkat/preview/${doc.id || ''}` : null),
    status: doc.status || 'MENUNGGU_VERIFIKASI',
    catatan_revisi: doc.catatan_revisi || '',
    mapel: doc.mapel || '',
    sub_mapel: doc.sub_mapel || '',
    rombel: doc.rombel || '',
    pertemuan_ke: doc.pertemuan_ke || '',
    keterangan: doc.keterangan || '',
    tahun_ajaran: finalTa,
    semester: finalSem,
    created_at: doc.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Pastikan kolom file_path ada di database
  try {
    await safeDbQuery(`ALTER TABLE perangkat_dokumen ADD COLUMN IF NOT EXISTS file_path TEXT;`);
  } catch (e) {}

  try {
    await safeDbQuery(
      `INSERT INTO perangkat_dokumen (id, category_id, teacher_id, teacher_name, file_name, file_size, gdrive_file_id, gdrive_web_view_link, status, catatan_revisi, mapel, sub_mapel, rombel, tahun_ajaran, semester, teacher_mapel_id, file_path, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       ON CONFLICT (id) DO UPDATE SET
         category_id = EXCLUDED.category_id,
         teacher_id = EXCLUDED.teacher_id,
         teacher_name = EXCLUDED.teacher_name,
         file_name = EXCLUDED.file_name,
         file_size = EXCLUDED.file_size,
         gdrive_file_id = EXCLUDED.gdrive_file_id,
         gdrive_web_view_link = EXCLUDED.gdrive_web_view_link,
         status = EXCLUDED.status,
         catatan_revisi = EXCLUDED.catatan_revisi,
         mapel = EXCLUDED.mapel,
         sub_mapel = EXCLUDED.sub_mapel,
         rombel = EXCLUDED.rombel,
         tahun_ajaran = EXCLUDED.tahun_ajaran,
         semester = EXCLUDED.semester,
         teacher_mapel_id = EXCLUDED.teacher_mapel_id,
         file_path = EXCLUDED.file_path,
         updated_at = EXCLUDED.updated_at`,
      [
        newDoc.id, newDoc.category_id, newDoc.teacher_id, newDoc.teacher_name,
        newDoc.file_name, newDoc.file_size, newDoc.gdrive_file_id, newDoc.gdrive_web_view_link,
        newDoc.status, newDoc.catatan_revisi, newDoc.mapel, newDoc.sub_mapel, newDoc.rombel,
        newDoc.tahun_ajaran, newDoc.semester, newDoc.teacher_mapel_id, newDoc.file_path, newDoc.created_at, newDoc.updated_at
      ]
    );
  } catch (e) {}

  const loc = readJson<PerangkatDokumen[]>(PERANGKAT_DOCS_FILE, []);
  const idx = loc.findIndex(d => d.id === newDoc.id);
  if (idx >= 0) {
    loc[idx] = newDoc;
  } else {
    loc.push(newDoc);
  }
  writeJson(PERANGKAT_DOCS_FILE, loc);
  return newDoc;
}

/**
 * Mengambil dokumen berdasarkan ID
 */
export async function getPerangkatDokumenById(id: string): Promise<PerangkatDokumen | null> {
  try {
    const res = await safeDbQuery<PerangkatDokumen>(`
      SELECT d.*, c.nama as category_nama 
      FROM perangkat_dokumen d
      LEFT JOIN perangkat_categories c ON d.category_id = c.id
      WHERE d.id = $1 LIMIT 1
    `, [id]);
    if (res.success && res.rows.length > 0) {
      return res.rows[0];
    }
  } catch (e) {}

  const loc = readJson<PerangkatDokumen[]>(PERANGKAT_DOCS_FILE, []);
  return loc.find(d => d.id === id) || null;
}

/**
 * Menghapus dokumen
 */
export async function deletePerangkatDokumen(id: string): Promise<boolean> {
  try {
    await safeDbQuery('DELETE FROM perangkat_dokumen WHERE id = $1', [id]);
  } catch (e) {}

  const loc = readJson<PerangkatDokumen[]>(PERANGKAT_DOCS_FILE, []);
  const filtered = loc.filter(d => d.id !== id);
  writeJson(PERANGKAT_DOCS_FILE, filtered);
  return true;
}

/**
 * Mengubah status verifikasi dokumen (Kurikulum / Kepsek)
 */
export async function updateDokumenStatus(id: string, status: string, catatan: string = ''): Promise<boolean> {
  const nowIso = new Date().toISOString();
  try {
    await safeDbQuery(
      `UPDATE perangkat_dokumen SET status = $1, catatan_revisi = $2, updated_at = $3 WHERE id = $4`,
      [status, catatan, nowIso, id]
    );
  } catch (e) {}

  const loc = readJson<PerangkatDokumen[]>(PERANGKAT_DOCS_FILE, []);
  const idx = loc.findIndex(d => d.id === id);
  if (idx >= 0) {
    loc[idx].status = status as any;
    loc[idx].catatan_revisi = catatan;
    loc[idx].updated_at = nowIso;
    writeJson(PERANGKAT_DOCS_FILE, loc);
  }
  return true;
}

/**
 * Menyimpan approval log
 */
export async function savePerangkatApprovalLog(log: Partial<PerangkatApprovalLog>): Promise<boolean> {
  const newLog: PerangkatApprovalLog = {
    id: log.id || `log-${Date.now()}-${randomUUID().slice(0, 6)}`,
    dokumen_id: log.dokumen_id || null,
    teacher_id: log.teacher_id || null,
    user_id: log.user_id || '',
    user_name: log.user_name || '',
    role: log.role || '',
    action: log.action || 'UPDATE',
    catatan: log.catatan || '',
    created_at: new Date().toISOString()
  };

  try {
    await safeDbQuery(
      `INSERT INTO perangkat_approval_logs (id, dokumen_id, teacher_id, user_id, user_name, role, action, catatan, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [newLog.id, newLog.dokumen_id, newLog.teacher_id, newLog.user_id, newLog.user_name, newLog.role, newLog.action, newLog.catatan, newLog.created_at]
    );
  } catch (e) {}

  const loc = readJson<PerangkatApprovalLog[]>(PERANGKAT_LOGS_FILE, []);
  loc.unshift(newLog);
  writeJson(PERANGKAT_LOGS_FILE, loc.slice(0, 500));
  return true;
}

/**
 * Mengambil approval logs
 */
export async function getPerangkatApprovalLogs(dokumenId?: string, teacherId?: string): Promise<PerangkatApprovalLog[]> {
  try {
    let query = 'SELECT * FROM perangkat_approval_logs WHERE 1=1';
    const params: any[] = [];
    if (dokumenId) {
      params.push(dokumenId);
      query += ` AND dokumen_id = $${params.length}`;
    }
    if (teacherId) {
      params.push(teacherId);
      query += ` AND teacher_id = $${params.length}`;
    }
    query += ' ORDER BY created_at DESC LIMIT 100';

    const res = await safeDbQuery<PerangkatApprovalLog>(query, params);
    if (res.success) return res.rows;
  } catch (e) {}

  const loc = readJson<PerangkatApprovalLog[]>(PERANGKAT_LOGS_FILE, []);
  return loc.filter(l => (!dokumenId || l.dokumen_id === dokumenId) && (!teacherId || l.teacher_id === teacherId));
}

/**
 * Menyimpan pengesahan dari Kepala Sekolah
 */
export async function savePerangkatPengesahan(p: Partial<PerangkatPengesahan>): Promise<PerangkatPengesahan> {
  const newP: PerangkatPengesahan = {
    id: p.id || `sign-${Date.now()}-${randomUUID().slice(0, 6)}`,
    teacher_id: p.teacher_id || '',
    teacher_name: p.teacher_name || '',
    nip: p.nip || '',
    tahun_ajaran: p.tahun_ajaran || '',
    semester: p.semester || '',
    kepsek_id: p.kepsek_id || '',
    kepsek_name: p.kepsek_name || 'Kepala Sekolah',
    tipe_pengesahan: p.tipe_pengesahan || 'QR_CODE',
    ttd_image_base64: p.ttd_image_base64 || null,
    qr_signature_data: p.qr_signature_data || {},
    tanggal_pengesahan: p.tanggal_pengesahan || new Date().toISOString(),
    status: p.status || 'DISAHKAN',
    created_at: new Date().toISOString()
  };

  try {
    await safeDbQuery(
      `INSERT INTO perangkat_pengesahan (id, teacher_id, teacher_name, nip, tahun_ajaran, semester, kepsek_id, kepsek_name, tipe_pengesahan, ttd_image_base64, qr_signature_data, tanggal_pengesahan, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (id) DO UPDATE SET
         teacher_name = EXCLUDED.teacher_name,
         nip = EXCLUDED.nip,
         kepsek_id = EXCLUDED.kepsek_id,
         kepsek_name = EXCLUDED.kepsek_name,
         tipe_pengesahan = EXCLUDED.tipe_pengesahan,
         ttd_image_base64 = EXCLUDED.ttd_image_base64,
         qr_signature_data = EXCLUDED.qr_signature_data,
         tanggal_pengesahan = EXCLUDED.tanggal_pengesahan,
         status = EXCLUDED.status`,
      [
        newP.id, newP.teacher_id, newP.teacher_name, newP.nip,
        newP.tahun_ajaran, newP.semester, newP.kepsek_id, newP.kepsek_name,
        newP.tipe_pengesahan, newP.ttd_image_base64, JSON.stringify(newP.qr_signature_data),
        newP.tanggal_pengesahan, newP.status, newP.created_at
      ]
    );

    // Update seluruh dokumen terverifikasi guru ini menjadi DISETUJUI_KEPSEK
    await safeDbQuery(
      `UPDATE perangkat_dokumen SET status = 'DISETUJUI_KEPSEK', updated_at = CURRENT_TIMESTAMP 
       WHERE teacher_id = $1 AND (status = 'TERVERIFIKASI_KURIKULUM' OR status = 'MENUNGGU_VERIFIKASI')`,
      [newP.teacher_id]
    );
  } catch (e) {}

  const loc = readJson<PerangkatPengesahan[]>(PERANGKAT_PENGESAHAN_FILE, []);
  const idx = loc.findIndex(item => item.id === newP.id || (item.teacher_id === newP.teacher_id && item.tahun_ajaran === newP.tahun_ajaran && item.semester === newP.semester));
  if (idx >= 0) {
    loc[idx] = newP;
  } else {
    loc.push(newP);
  }
  writeJson(PERANGKAT_PENGESAHAN_FILE, loc);
  return newP;
}

/**
 * Mengambil lembar pengesahan guru
 */
export async function getPerangkatPengesahanByTeacher(
  teacherId: string, 
  tahunAjaran?: string, 
  semester?: string
): Promise<PerangkatPengesahan | null> {
  try {
    let query = 'SELECT * FROM perangkat_pengesahan WHERE teacher_id = $1';
    const params: any[] = [teacherId];
    if (tahunAjaran && tahunAjaran !== 'SEMUA') {
      params.push(tahunAjaran);
      query += ` AND tahun_ajaran = $${params.length}`;
    }
    if (semester && semester !== 'SEMUA') {
      params.push(semester);
      query += ` AND semester = $${params.length}`;
    }
    query += ' ORDER BY created_at DESC LIMIT 1';

    const res = await safeDbQuery<PerangkatPengesahan>(query, params);
    if (res.success && res.rows.length > 0) {
      return res.rows[0];
    }
  } catch (e) {}

  const loc = readJson<PerangkatPengesahan[]>(PERANGKAT_PENGESAHAN_FILE, []);
  const found = loc.find(p => p.teacher_id === teacherId && (!tahunAjaran || tahunAjaran === 'SEMUA' || p.tahun_ajaran === tahunAjaran) && (!semester || semester === 'SEMUA' || p.semester === semester));
  return found || null;
}

/**
 * Laporan Progres Keseluruhan Guru (Monitoring Dashboard & Drill-down)
 */
export async function getAllTeacherProgressReports(
  tahunAjaran?: string, 
  semester?: string
): Promise<TeacherProgressReport[]> {
  const [allTeachers, categories, allMapels] = await Promise.all([
    getAllTeachers(),
    getAllPerangkatCategories(tahunAjaran, semester),
    getAllTeacherMapels(tahunAjaran, semester)
  ]);

  // Kategori wajib (DARI_GURU)
  const requiredCategories = categories.filter(c => c.tipe_pengadaan === 'DARI_GURU');
  const catWajibCountPerMapel = Math.max(1, requiredCategories.reduce((acc, curr) => acc + (curr.target_jumlah || 1), 0));
  const categoryMap = new Map(categories.map(c => [c.id, c.nama]));

  // Ambil semua dokumen
  let allDocs: PerangkatDokumen[] = [];
  try {
    const resDocs = await safeDbQuery<PerangkatDokumen>(`
      SELECT d.*, c.nama as category_nama 
      FROM perangkat_dokumen d 
      LEFT JOIN perangkat_categories c ON d.category_id = c.id
      ORDER BY d.created_at DESC
    `);
    if (resDocs.success) allDocs = resDocs.rows;
  } catch (e) {}
  if (allDocs.length === 0) {
    allDocs = readJson<PerangkatDokumen[]>(PERANGKAT_DOCS_FILE, []);
  }

  // Populate category_nama consistently
  allDocs.forEach(d => {
    if (!d.category_nama || d.category_nama === 'Perangkat Ajar') {
      d.category_nama = categoryMap.get(d.category_id) || d.category_nama || 'Perangkat Ajar';
    }
  });

  // Filter dokumen by tahun_ajaran & semester if specified
  if (tahunAjaran && tahunAjaran !== 'SEMUA') {
    allDocs = allDocs.filter(d => matchPeriod(d.tahun_ajaran, tahunAjaran));
  }
  if (semester && semester !== 'SEMUA') {
    allDocs = allDocs.filter(d => matchSemester(d.semester, semester));
  }

  // Ambil semua pengesahan
  let allPengesahan: PerangkatPengesahan[] = [];
  try {
    const resPeng = await safeDbQuery<PerangkatPengesahan>(`SELECT * FROM perangkat_pengesahan ORDER BY created_at DESC`);
    if (resPeng.success) allPengesahan = resPeng.rows;
  } catch (e) {}
  if (allPengesahan.length === 0) {
    allPengesahan = readJson<PerangkatPengesahan[]>(PERANGKAT_PENGESAHAN_FILE, []);
  }

  // Filter pengesahan by tahun_ajaran & semester if specified
  if (tahunAjaran && tahunAjaran !== 'SEMUA') {
    allPengesahan = allPengesahan.filter(p => matchPeriod(p.tahun_ajaran, tahunAjaran));
  }
  if (semester && semester !== 'SEMUA') {
    allPengesahan = allPengesahan.filter(p => matchSemester(p.semester, semester));
  }

  const reports: TeacherProgressReport[] = allTeachers.map(teacher => {
    const teacherDocs = allDocs.filter(d => d.teacher_id === teacher.id);
    const teacherMapels = allMapels.filter(m => m.teacher_id === teacher.id);

    // Hitung progres per mapel
    const mapelList: TeacherMapelProgress[] = teacherMapels.map(tm => {
      const docsForMapel = teacherDocs.filter(d => 
        (d.teacher_mapel_id && d.teacher_mapel_id === tm.id) || 
        (!d.teacher_mapel_id && d.mapel && d.mapel.trim().toLowerCase() === tm.mapel_name.trim().toLowerCase())
      );
      const mSudahUpload = docsForMapel.length;
      const mTerverifikasi = docsForMapel.filter(d => d.status === 'TERVERIFIKASI_KURIKULUM' || d.status === 'DISETUJUI_KEPSEK').length;
      const mMenunggu = docsForMapel.filter(d => d.status === 'MENUNGGU_VERIFIKASI').length;
      const mRevisi = docsForMapel.filter(d => d.status === 'DITOLAK_KURIKULUM' || d.status === 'REVISI_KEPSEK').length;
      const rawPercent = catWajibCountPerMapel > 0 ? Math.min(100, Math.round((mSudahUpload / catWajibCountPerMapel) * 100)) : (mSudahUpload > 0 ? 100 : 0);
      const mPercent = isNaN(rawPercent) ? 0 : rawPercent;
      const isLengkap = catWajibCountPerMapel > 0 
        ? (mSudahUpload >= catWajibCountPerMapel && mTerverifikasi >= catWajibCountPerMapel)
        : (mSudahUpload > 0 && mTerverifikasi > 0);

      return {
        id: tm.id,
        mapel_name: tm.mapel_name,
        sub_mapel: tm.sub_mapel || '',
        rombel: Array.isArray(tm.rombel) ? tm.rombel : [],
        total_wajib: catWajibCountPerMapel,
        sudah_upload: mSudahUpload,
        uploaded_count: mSudahUpload,
        terverifikasi: mTerverifikasi,
        menunggu_verifikasi: mMenunggu,
        perlu_revisi: mRevisi,
        persentase: mPercent,
        percentage: mPercent,
        is_lengkap: isLengkap,
        status_submit: tm.status_submit || 'DRAFT',
        dokumen_list: docsForMapel
      };
    });

    // Total target dokumen wajib guru = (jumlah mapel terdaftar * target per mapel), minimal 1 mapel jika belum ada
    const totalWajibGuru = teacherMapels.length > 0 ? (teacherMapels.length * catWajibCountPerMapel) : catWajibCountPerMapel;
    const sudahUpload = teacherDocs.length;
    const terverifikasi = teacherDocs.filter(d => d.status === 'TERVERIFIKASI_KURIKULUM' || d.status === 'DISETUJUI_KEPSEK').length;
    const menungguVerifikasi = teacherDocs.filter(d => d.status === 'MENUNGGU_VERIFIKASI').length;
    const perluRevisi = teacherDocs.filter(d => d.status === 'DITOLAK_KURIKULUM' || d.status === 'REVISI_KEPSEK').length;

    let persentase = 0;
    if (teacherMapels.length > 0) {
      const sumPercent = mapelList.reduce((acc, curr) => acc + (isNaN(curr.persentase) ? 0 : curr.persentase), 0);
      persentase = Math.min(100, Math.max(0, Math.round(sumPercent / teacherMapels.length)));
    } else {
      persentase = totalWajibGuru > 0 ? Math.min(100, Math.round((sudahUpload / totalWajibGuru) * 100)) : 0;
    }
    if (isNaN(persentase)) persentase = 0;

    const pengesahan = allPengesahan.find(p => p.teacher_id === teacher.id) || null;

    let statusPengesahan: 'DISAHKAN' | 'MENUNGGU_PENGESAHAN' | 'BELUM_LENGKAP' = 'BELUM_LENGKAP';
    if (pengesahan && pengesahan.status === 'DISAHKAN') {
      statusPengesahan = 'DISAHKAN';
    } else if (
      (teacherMapels.length > 0 && mapelList.every(m => m.is_lengkap)) ||
      (teacherMapels.length === 0 && totalWajibGuru > 0 && sudahUpload >= totalWajibGuru && terverifikasi >= totalWajibGuru)
    ) {
      statusPengesahan = 'MENUNGGU_PENGESAHAN';
    }

    return {
      teacher_id: teacher.id,
      name: teacher.name,
      nip: (teacher as any).nip || '-',
      whatsapp: teacher.whatsapp || '-',
      class: teacher.class || '-',
      mapel_list: mapelList,
      total_wajib: totalWajibGuru,
      sudah_upload: sudahUpload,
      terverifikasi,
      menunggu_verifikasi: menungguVerifikasi,
      perlu_revisi: perluRevisi,
      persentase,
      status_pengesahan: statusPengesahan,
      dokumen_list: teacherDocs,
      pengesahan
    };
  });

  return reports;
}

/**
 * Reset status dokumen kembali ke MENUNGGU_VERIFIKASI
 */
export async function resetDokumenStatus(id: string): Promise<boolean> {
  const nowIso = new Date().toISOString();
  try {
    await safeDbQuery(
      `UPDATE perangkat_dokumen SET status = 'MENUNGGU_VERIFIKASI', catatan_revisi = '', updated_at = $1 WHERE id = $2`,
      [nowIso, id]
    );
  } catch (e) {}

  const loc = readJson<PerangkatDokumen[]>(PERANGKAT_DOCS_FILE, []);
  const idx = loc.findIndex(d => d.id === id);
  if (idx >= 0) {
    loc[idx].status = 'MENUNGGU_VERIFIKASI';
    loc[idx].catatan_revisi = '';
    loc[idx].updated_at = nowIso;
    writeJson(PERANGKAT_DOCS_FILE, loc);
  }
  return true;
}

/**
 * Reset status pengesahan seorang guru
 */
export async function resetPengesahanByTeacher(teacherId: string, tahunAjaran?: string, semester?: string): Promise<boolean> {
  try {
    let query = 'DELETE FROM perangkat_pengesahan WHERE teacher_id = $1';
    const params: any[] = [teacherId];
    if (tahunAjaran && tahunAjaran !== 'SEMUA') {
      params.push(tahunAjaran);
      query += ` AND tahun_ajaran = $${params.length}`;
    }
    if (semester && semester !== 'SEMUA') {
      params.push(semester);
      query += ` AND semester = $${params.length}`;
    }
    await safeDbQuery(query, params);
  } catch (e) {}

  const loc = readJson<PerangkatPengesahan[]>(PERANGKAT_PENGESAHAN_FILE, []);
  const filtered = loc.filter(p => !(p.teacher_id === teacherId && (!tahunAjaran || tahunAjaran === 'SEMUA' || p.tahun_ajaran === tahunAjaran) && (!semester || semester === 'SEMUA' || p.semester === semester)));
  writeJson(PERANGKAT_PENGESAHAN_FILE, filtered);
  return true;
}

/**
 * Hapus seluruh pengaturan jenis berkas (Reset total untuk menata ulang)
 */
export async function resetAllPerangkatCategories(): Promise<boolean> {
  try {
    await safeDbQuery('DELETE FROM perangkat_categories');
  } catch (e) {}
  writeJson(PERANGKAT_CATS_FILE, []);
  return true;
}

/**
 * Reset seluruh berkas dan proses pengunggahan perangkat ajar guru (Reset progres semua guru ke 0% / draft)
 */
export async function resetAllPerangkatSubmissions(
  tahunAjaran?: string,
  semester?: string,
  actorName: string = 'Administrator'
): Promise<{ deletedDocs: number; deletedPengesahan: number }> {
  let deletedDocs = 0;
  let deletedPengesahan = 0;

  try {
    let docQuery = 'DELETE FROM perangkat_dokumen WHERE 1=1';
    let pengQuery = 'DELETE FROM perangkat_pengesahan WHERE 1=1';
    const params: any[] = [];

    if (tahunAjaran && tahunAjaran !== 'SEMUA') {
      params.push(tahunAjaran);
      docQuery += ` AND (tahun_ajaran = $${params.length} OR tahun_ajaran = '' OR tahun_ajaran IS NULL)`;
      pengQuery += ` AND (tahun_ajaran = $${params.length} OR tahun_ajaran = '' OR tahun_ajaran IS NULL)`;
    }
    if (semester && semester !== 'SEMUA') {
      params.push(semester);
      docQuery += ` AND (semester = $${params.length} OR semester = '' OR semester IS NULL)`;
      pengQuery += ` AND (semester = $${params.length} OR semester = '' OR semester IS NULL)`;
    }

    const resDocs = await safeDbQuery(docQuery, params);
    if (resDocs.success && resDocs.rows) {
      deletedDocs = resDocs.rows.length;
    }
    const resPeng = await safeDbQuery(pengQuery, params);
    if (resPeng.success && resPeng.rows) {
      deletedPengesahan = resPeng.rows.length;
    }
  } catch (e) {}

  // Local JSON files fallback
  const docs = readJson<PerangkatDokumen[]>(PERANGKAT_DOCS_FILE, []);
  const initialDocsCount = docs.length;
  const filteredDocs = docs.filter(d => {
    if (tahunAjaran && tahunAjaran !== 'SEMUA' && d.tahun_ajaran && d.tahun_ajaran !== tahunAjaran) return true;
    if (semester && semester !== 'SEMUA' && d.semester && d.semester !== semester) return true;
    return false;
  });
  writeJson(PERANGKAT_DOCS_FILE, filteredDocs);
  deletedDocs = Math.max(deletedDocs, initialDocsCount - filteredDocs.length);

  const pengs = readJson<PerangkatPengesahan[]>(PERANGKAT_PENGESAHAN_FILE, []);
  const initialPengCount = pengs.length;
  const filteredPengs = pengs.filter(p => {
    if (tahunAjaran && tahunAjaran !== 'SEMUA' && p.tahun_ajaran && p.tahun_ajaran !== tahunAjaran) return true;
    if (semester && semester !== 'SEMUA' && p.semester && p.semester !== semester) return true;
    return false;
  });
  writeJson(PERANGKAT_PENGESAHAN_FILE, filteredPengs);
  deletedPengesahan = Math.max(deletedPengesahan, initialPengCount - filteredPengs.length);

  // Log audit
  await savePerangkatApprovalLog({
    teacher_id: 'ALL',
    user_id: 'admin',
    user_name: actorName,
    role: 'ADMIN',
    action: 'RESET_ALL_SUBMISSIONS',
    catatan: `Reset massal berkas & proses perangkat ajar untuk periode ${tahunAjaran || 'Semua'} - ${semester || 'Semua'}`
  });

  return { deletedDocs, deletedPengesahan };
}

/**
 * Batch Action: Verifikasi semua berkas untuk seorang guru (atau semua guru)
 */
export async function verifyAllDokumenForTeacher(
  teacherId: string, 
  reviewerName: string = 'Waka Kurikulum', 
  catatan: string = 'Disetujui secara massal (Batch Verification)'
): Promise<number> {
  const nowIso = new Date().toISOString();
  let affected = 0;
  try {
    let query = `
      UPDATE perangkat_dokumen 
      SET status = 'TERVERIFIKASI_KURIKULUM', catatan_revisi = $1, updated_at = $2 
      WHERE status IN ('MENUNGGU_VERIFIKASI', 'DITOLAK_KURIKULUM', 'REVISI_KEPSEK')
    `;
    const params: any[] = [catatan, nowIso];
    if (teacherId && teacherId !== 'ALL') {
      params.push(teacherId);
      query += ` AND teacher_id = $${params.length}`;
    }
    const res = await safeDbQuery(query, params);
    if (res.success && res.rows) {
      affected = res.rows.length;
    }
  } catch (e) {}

  const loc = readJson<PerangkatDokumen[]>(PERANGKAT_DOCS_FILE, []);
  loc.forEach(d => {
    if ((teacherId === 'ALL' || d.teacher_id === teacherId) && (d.status === 'MENUNGGU_VERIFIKASI' || d.status === 'DITOLAK_KURIKULUM' || d.status === 'REVISI_KEPSEK')) {
      d.status = 'TERVERIFIKASI_KURIKULUM';
      d.catatan_revisi = catatan;
      d.updated_at = nowIso;
      affected++;
    }
  });
  writeJson(PERANGKAT_DOCS_FILE, loc);
  return affected;
}

/**
 * Batch Action: Sahkan semua guru yang berkasnya sudah terverifikasi lengkap
 */
export async function approveAllVerifiedTeachers(
  kepsekId: string = 'kepsek',
  kepsekName: string = 'Kepala Sekolah',
  tahunAjaran: string = '2024/2025',
  semester: string = 'Ganjil',
  tipePengesahan: 'TTD_DIGITAL' | 'QR_CODE' = 'QR_CODE'
): Promise<number> {
  const reports = await getAllTeacherProgressReports(tahunAjaran, semester);
  let count = 0;

  for (const rep of reports) {
    if (rep.persentase === 100 && rep.terverifikasi >= rep.total_wajib && rep.status_pengesahan !== 'DISAHKAN') {
      await savePerangkatPengesahan({
        teacher_id: rep.teacher_id,
        teacher_name: rep.name,
        nip: rep.nip,
        tahun_ajaran: tahunAjaran,
        semester,
        kepsek_id: kepsekId,
        kepsek_name: kepsekName,
        tipe_pengesahan: tipePengesahan,
        qr_signature_data: {
          verified_by: kepsekName,
          teacher_name: rep.name,
          nip: rep.nip,
          endorsed_at: new Date().toISOString(),
          security_hash: `BATCH-KEPSEK-${rep.teacher_id.slice(0, 4)}-${Date.now()}`
        },
        tanggal_pengesahan: new Date().toISOString(),
        status: 'DISAHKAN'
      });

      await savePerangkatApprovalLog({
        teacher_id: rep.teacher_id,
        user_id: kepsekId,
        user_name: kepsekName,
        role: 'KEPALA_SEKOLAH',
        action: 'PENGESAHAN_MASSAL_KEPSEK',
        catatan: `Pengesahan massal resmi oleh Kepala Sekolah (${tipePengesahan})`
      });

      count++;
    }
  }

  return count;
}
