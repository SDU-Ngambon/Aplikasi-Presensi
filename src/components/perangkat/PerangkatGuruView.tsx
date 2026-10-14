import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  TextField,
  Autocomplete,
  Divider,
  Paper,
  Stack,
  Tab,
  Tabs
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import VerifiedIcon from '@mui/icons-material/Verified';
import DescriptionIcon from '@mui/icons-material/Description';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import PrintIcon from '@mui/icons-material/Print';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import SchoolIcon from '@mui/icons-material/School';
import ClassIcon from '@mui/icons-material/Class';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import CheckIcon from '@mui/icons-material/Check';
import axios from 'axios';
import toast from 'react-hot-toast';
import LembarPengesahanModal from './LembarPengesahanModal';
import DocumentPreviewModal from './DocumentPreviewModal';
import { useAppTheme } from '../../contexts/ThemeModeContext';

interface PerangkatGuruViewProps {
  currentUser: any;
}

export default function PerangkatGuruView({ currentUser }: PerangkatGuruViewProps) {
  const { preset, isDark } = useAppTheme();
  const [categories, setCategories] = useState<any[]>([]);
  const [teacherMapels, setTeacherMapels] = useState<any[]>([]);
  const [dokumenList, setDokumenList] = useState<any[]>([]);
  const [pengesahan, setPengesahan] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPengesahanModal, setShowPengesahanModal] = useState(false);
  const [schoolSettings, setSchoolSettings] = useState<any>({});
  const [activePeriod, setActivePeriod] = useState<{ tahun_ajaran: string; semester: string }>({
    tahun_ajaran: '2024/2025',
    semester: 'Ganjil'
  });

  // Master Data State
  const [masterMapelList, setMasterMapelList] = useState<any[]>([]);
  const [masterRombelList, setMasterRombelList] = useState<string[]>([]);

  // Selected Active Mapel Tab
  const [activeMapelTab, setActiveMapelTab] = useState<number>(0);

  // Form Tambah Mata Pelajaran Modal
  const [mapelModalOpen, setMapelModalOpen] = useState(false);
  const [isSavingMapel, setIsSavingMapel] = useState(false);
  const [selectedMapelObj, setSelectedMapelObj] = useState<any | null>(null);
  const [inputSubMapel, setInputSubMapel] = useState<string>('');
  const [selectedRombels, setSelectedRombels] = useState<string[]>([]);

  // Upload Dialog State
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [activeUploadCategory, setActiveUploadCategory] = useState<any | null>(null);
  const [activeUploadTargetMapel, setActiveUploadTargetMapel] = useState<any | null>(null);
  const [replaceDocId, setReplaceDocId] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [inputPertemuanKe, setInputPertemuanKe] = useState<string>('');
  const [inputKeteranganDoc, setInputKeteranganDoc] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  // In-app Document Preview Modal State
  const [previewDoc, setPreviewDoc] = useState<{
    open: boolean;
    title: string;
    fileName: string;
    fileUrl: string;
    statusBadge?: string;
  }>({
    open: false,
    title: '',
    fileName: '',
    fileUrl: ''
  });

  const teacherId = currentUser?.id || currentUser?.teacher_id;
  const teacherName = currentUser?.name || 'Guru';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load All Required Data
  const loadData = async (isInitial: boolean = false) => {
    if (!teacherId) return;
    try {
      if (isInitial) {
        setIsLoading(true);
      }
      const [docRes, setRes, cfgRes, mapelRes, rombelRes] = await Promise.all([
        axios.get(`/api/perangkat/dokumen/teacher/${teacherId}`),
        axios.get('/api/settings').catch(() => ({ data: {} })),
        axios.get('/api/tahun-ajaran/active-config').catch(() => ({ data: { data: { active_tahun_ajaran: '2024/2025', active_semester: 'Ganjil' } } })),
        axios.get('/api/mata-pelajaran').catch(() => ({ data: [] })),
        axios.get('/api/rombel').catch(() => ({ data: { classes: [] } }))
      ]);

      if (docRes.data && docRes.data.data) {
        setCategories(docRes.data.data.categories || []);
        setTeacherMapels(docRes.data.data.teacher_mapels || []);
        setDokumenList(docRes.data.data.dokumen || []);
        setPengesahan(docRes.data.data.pengesahan || null);
      }
      if (setRes.data) {
        setSchoolSettings(setRes.data);
      }
      if (cfgRes.data) {
        const cfg = cfgRes.data.data || cfgRes.data;
        const ta = cfg.active_tahun_ajaran || cfg.tahun_ajaran || '2024/2025';
        const sem = cfg.active_semester || cfg.semester || 'Ganjil';
        setActivePeriod({ tahun_ajaran: ta, semester: sem });
      }
      
      // Parse Mata Pelajaran from Master Admin
      const rawMapel = mapelRes.data;
      const parsedMapel = Array.isArray(rawMapel) 
        ? rawMapel 
        : (Array.isArray(rawMapel?.data) ? rawMapel.data : []);
      setMasterMapelList(parsedMapel);

      // Parse Rombel from Master Rombongan Belajar
      const rawRombel = rombelRes.data;
      let parsedRombel: string[] = [];
      if (Array.isArray(rawRombel)) {
        parsedRombel = rawRombel.map((c: any) => typeof c === 'string' ? c : (c.name || c.nama || ''));
      } else if (Array.isArray(rawRombel?.classes)) {
        parsedRombel = rawRombel.classes.map((c: any) => c.name || c.nama || '');
      } else if (Array.isArray(rawRombel?.data?.classes)) {
        parsedRombel = rawRombel.data.classes.map((c: any) => c.name || c.nama || '');
      }
      const uniqueRombel = Array.from(new Set(parsedRombel.filter(Boolean))).sort();
      setMasterRombelList(uniqueRombel);

    } catch (err: any) {
      toast.error('Gagal memuat data perangkat ajar');
    } finally {
      if (isInitial) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadData(true);
  }, [teacherId]);

  // Handle Tambah & Konfirmasi Mapel Baru
  const handleOpenAddMapelModal = () => {
    setSelectedMapelObj(null);
    setInputSubMapel('');
    setSelectedRombels([]);
    setMapelModalOpen(true);
  };

  const handleSaveMapel = async () => {
    if (!selectedMapelObj) {
      toast.error('Pilih Mata Pelajaran terlebih dahulu');
      return;
    }
    if (selectedRombels.length === 0) {
      toast.error('Pilih minimal satu Kelas / Rombongan Belajar yang diampu');
      return;
    }

    try {
      setIsSavingMapel(true);
      const token = localStorage.getItem('token') || localStorage.getItem('guru_token') || sessionStorage.getItem('token');
      const mapelName = typeof selectedMapelObj === 'string' ? selectedMapelObj : (selectedMapelObj.nama_mapel || selectedMapelObj.name || '');
      const mapelId = typeof selectedMapelObj === 'string' ? '' : (selectedMapelObj.id || selectedMapelObj.kode_mapel || '');

      const payload = {
        teacher_id: teacherId,
        teacher_name: teacherName,
        mapel_id: mapelId,
        mapel_name: mapelName,
        sub_mapel: inputSubMapel.trim(),
        rombel: selectedRombels,
        tahun_ajaran: activePeriod.tahun_ajaran || schoolSettings.tahun_ajaran || '2024/2025',
        semester: activePeriod.semester || schoolSettings.semester || 'Ganjil'
      };

      const res = await axios.post('/api/perangkat/teacher-mapel', payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      toast.success(res.data.message || 'Mata pelajaran berhasil ditambahkan!');
      setMapelModalOpen(false);
      await loadData();
      // Set active tab to the newly added item
      setActiveMapelTab(teacherMapels.length);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan mata pelajaran');
    } finally {
      setIsSavingMapel(false);
    }
  };

  // Handle Hapus Mapel
  const handleDeleteMapel = async (mapelId: string, mapelName: string) => {
    if (!window.confirm(`Hapus mata pelajaran "${mapelName}"? Semua berkas yang telah diunggah untuk mapel ini juga akan dihapus.`)) {
      return;
    }
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('guru_token') || sessionStorage.getItem('token');
      await axios.delete(`/api/perangkat/teacher-mapel/${mapelId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      toast.success('Mata pelajaran dan berkas terkait berhasil dihapus');
      setActiveMapelTab(0);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal menghapus mata pelajaran');
    }
  };

  // Handle Kirim Mapel ke Kurikulum
  const handleSubmitMapel = async (mapelId: string, mapelName: string) => {
    if (!window.confirm(`Kirim seluruh berkas perangkat ajar untuk mata pelajaran "${mapelName}" ke Waka Kurikulum untuk diverifikasi?`)) {
      return;
    }
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('guru_token') || sessionStorage.getItem('token');
      const res = await axios.post(`/api/perangkat/teacher-mapel/${mapelId}/submit`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      toast.success(res.data.message || 'Perangkat ajar berhasil dikirim ke Kurikulum');
      loadData(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal mengirim berkas');
    }
  };

  // Handle Open Upload Modal for a specific category and mapel
  const handleOpenUploadModal = (cat: any, targetMapel: any, replaceId?: string, existingDoc?: any) => {
    setActiveUploadCategory(cat);
    setActiveUploadTargetMapel(targetMapel);
    setReplaceDocId(replaceId || null);
    setUploadFile(null);
    if (existingDoc) {
      setInputPertemuanKe(existingDoc.pertemuan_ke || '');
      setInputKeteranganDoc(existingDoc.keterangan || '');
    } else if (cat.is_bertahap) {
      const existingCount = dokumenList.filter(d => d.category_id === cat.id && d.teacher_mapel_id === targetMapel.id).length;
      setInputPertemuanKe(`Pertemuan ${existingCount + 1}`);
      setInputKeteranganDoc('');
    } else {
      setInputPertemuanKe('');
      setInputKeteranganDoc('');
    }
    setUploadDialogOpen(true);
  };

  // Handle Upload Execution
  const handleExecuteUpload = async () => {
    if (!uploadFile || !activeUploadCategory || !activeUploadTargetMapel) {
      toast.error('Pilih berkas yang akan diunggah');
      return;
    }

    if (uploadFile.size > 25 * 1024 * 1024) {
      toast.error('Ukuran berkas maksimal 25MB');
      return;
    }

    try {
      setIsUploading(true);
      const token = localStorage.getItem('token') || localStorage.getItem('guru_token') || sessionStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('category_id', activeUploadCategory.id);
      formData.append('teacher_id', teacherId);
      formData.append('teacher_name', teacherName);
      formData.append('teacher_mapel_id', activeUploadTargetMapel.id);
      formData.append('mapel', activeUploadTargetMapel.mapel_name);
      formData.append('sub_mapel', activeUploadTargetMapel.sub_mapel || '');
      formData.append('rombel', Array.isArray(activeUploadTargetMapel.rombel) ? activeUploadTargetMapel.rombel.join(', ') : (activeUploadTargetMapel.rombel || ''));
      formData.append('tahun_ajaran', activePeriod.tahun_ajaran || schoolSettings.tahun_ajaran || '2024/2025');
      formData.append('semester', activePeriod.semester || schoolSettings.semester || 'Ganjil');
      formData.append('pertemuan_ke', inputPertemuanKe || '');
      formData.append('keterangan', inputKeteranganDoc || '');
      if (replaceDocId) {
        formData.append('replace_doc_id', replaceDocId);
      }

      await axios.post('/api/perangkat/dokumen/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      toast.success(`Berkas "${uploadFile.name}" berhasil diunggah!`);
      setUploadDialogOpen(false);
      await loadData(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal mengunggah berkas perangkat');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Delete Dokumen
  const handleDeleteDokumen = async (docId: string, fileName: string) => {
    if (!window.confirm(`Hapus berkas "${fileName}"?`)) return;
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('guru_token') || sessionStorage.getItem('token');
      await axios.delete(`/api/perangkat/dokumen/${docId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      toast.success('Berkas berhasil dihapus');
      loadData(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal menghapus berkas');
    }
  };

  // Group Categories: Kurikulum vs Guru
  const kurikulumCategories = categories.filter(c => c.tipe_pengadaan === 'DARI_KURIKULUM');
  const guruCategories = categories.filter(c => c.tipe_pengadaan === 'DARI_GURU');

  // Overall Endorsement Status
  const isEndorsed = pengesahan && pengesahan.status === 'DISAHKAN';

  // Calculate Overall Progress across all registered mapels
  const totalSlotsPerMapel = guruCategories.reduce((acc, c) => acc + (c.target_jumlah || 1), 0);
  const totalRequiredAllMapels = teacherMapels.length > 0 ? (teacherMapels.length * totalSlotsPerMapel) : totalSlotsPerMapel;
  const totalUploadedAll = dokumenList.length;
  const totalVerifiedAll = dokumenList.filter(d => d.status === 'TERVERIFIKASI_KURIKULUM' || d.status === 'DISETUJUI_KEPSEK').length;
  const overallPercentage = totalRequiredAllMapels > 0 ? Math.min(100, Math.round((totalUploadedAll / totalRequiredAllMapels) * 100)) : 0;

  // Selected Active Mapel
  const currentMapel = teacherMapels[activeMapelTab] || null;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: { xs: 28, md: 6 } }}>
      {/* BANNER STATUS PENGESAHAN KEPALA SEKOLAH */}
      {isEndorsed ? (
        <Alert
          severity="success"
          icon={<VerifiedIcon sx={{ fontSize: 32 }} />}
          action={
            <Button
              color="inherit"
              size="small"
              variant="outlined"
              startIcon={<PrintIcon />}
              onClick={() => setShowPengesahanModal(true)}
              sx={{ fontWeight: 800, bgcolor: 'rgba(255,255,255,0.2)' }}
            >
              Cetak Lembar Pengesahan
            </Button>
          }
          sx={{ mb: 3.5, borderRadius: 3, alignItems: 'center', '& .MuiAlert-message': { width: '100%' } }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Perangkat Ajar Anda Telah Disahkan Secara Resmi oleh Kepala Sekolah!
          </Typography>
          <Typography variant="body2">
            Disahkan pada {new Date(pengesahan.tanggal_pengesahan).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} dengan {pengesahan.tipe_pengesahan === 'TTD_DIGITAL' ? 'Tanda Tangan Digital' : 'QR Code Pengesahan Resmi'}.
          </Typography>
        </Alert>
      ) : null}

      {/* 1. SECTION PANDUAN & BERKAS ACUAN DARI KURIKULUM (SELALU DITAMPILKAN DI ATAS SEBAGAI ACUAN) */}
      <Card sx={{ mb: 3.5, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: `1px solid ${preset.glassBorder}`, bgcolor: isDark ? preset.cardBg : '#f8fafc' }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <FolderSpecialIcon sx={{ color: preset.primary, fontSize: 28 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: preset.textColorPrimary }}>
                Panduan & Berkas Acuan dari Kurikulum
              </Typography>
              <Typography variant="body2" sx={{ color: preset.textColorSecondary }}>
                Berikut berkas resmi yang disediakan oleh Tim Kurikulum sebagai panduan dan standar penyusunan perangkat ajar Anda (Kalender Pendidikan, Format Modul Ajar, Jadwal KBM, dll).
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2, borderColor: preset.glassBorder }} />

          {kurikulumCategories.length > 0 ? (
            <Grid container spacing={2}>
              {kurikulumCategories.map(cat => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={cat.id}>
                  <Card sx={{ borderRadius: 2.5, border: `1px solid ${preset.glassBorder}`, bgcolor: isDark ? 'rgba(15, 23, 42, 0.8)' : '#ffffff', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <Box>
                        <Chip label="Panduan Kurikulum" size="small" color="info" sx={{ fontWeight: 700, mb: 1, height: 20, fontSize: '0.7rem' }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: preset.primary, mb: 0.5 }}>
                          {cat.nama}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', mb: 1, color: preset.textColorSecondary }}>
                          {cat.file_kurikulum_name || 'Berkas Pedoman Resmi'}
                        </Typography>
                      </Box>

                      <Box sx={{ pt: 1.5, borderTop: `1px solid ${preset.glassBorder}` }}>
                        {cat.file_kurikulum_url ? (
                          <Button
                            variant="outlined"
                            size="small"
                            color="info"
                            fullWidth
                            startIcon={<VisibilityIcon />}
                            onClick={() => setPreviewDoc({
                              open: true,
                              title: `Panduan Kurikulum: ${cat.nama}`,
                              fileName: cat.file_kurikulum_name || 'Berkas Panduan',
                              fileUrl: cat.file_kurikulum_url,
                              statusBadge: 'Panduan Kurikulum'
                            })}
                            sx={{ fontWeight: 700, textTransform: 'none' }}
                          >
                            Buka / Pratinjau Berkas
                          </Button>
                        ) : (
                          <Typography variant="caption" sx={{ fontStyle: 'italic', color: preset.textColorSecondary }}>
                            Belum ada lampiran file dari Kurikulum
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box sx={{ p: 2.5, textAlign: 'center', bgcolor: isDark ? 'rgba(15, 23, 42, 0.8)' : '#ffffff', borderRadius: 2, border: `1px dashed ${preset.glassBorder}` }}>
              <Typography variant="body2" sx={{ color: preset.textColorSecondary }}>
                Belum ada berkas panduan khusus yang diunggah oleh Tim Kurikulum. Silakan lanjutkan ke pengisian mata pelajaran.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 2. SECTION MATA PELAJARAN YANG DIAMPU (PENDAFTARAN & TABS) */}
      <Card sx={{ mb: 3.5, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: `1px solid ${preset.glassBorder}`, bgcolor: isDark ? preset.cardBg : '#ffffff' }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 2, mb: 2 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: preset.textColorPrimary }}>
                Mata Pelajaran & Kelas yang Diampu
              </Typography>
              <Typography variant="body2" sx={{ color: preset.textColorSecondary }}>
                Tambahkan mata pelajaran beserta kelas/rombel yang Anda ampu. Anda dapat menambahkan lebih dari satu mata pelajaran. Berkas perangkat ajar akan diunggah untuk setiap mata pelajaran tersebut.
              </Typography>
            </Box>

            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleOpenAddMapelModal}
              sx={{ fontWeight: 800, borderRadius: 2.5, px: 2.5, py: 1, textTransform: 'none', whiteSpace: 'nowrap' }}
            >
              Tambah Mata Pelajaran
            </Button>
          </Box>

          {/* TOTAL PROGRESS SUMMARY */}
          {teacherMapels.length > 0 && (
            <Box sx={{ p: 2, mb: 3, bgcolor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f8fafc', borderRadius: 2.5, border: `1px solid ${preset.glassBorder}` }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: preset.textColorPrimary }}>
                  Total Kelengkapan Semua Mapel: {totalUploadedAll} dari {totalRequiredAllMapels} Berkas ({overallPercentage}%)
                </Typography>
                <Chip
                  label={overallPercentage === 100 ? 'Lengkap 100%' : `${overallPercentage}% Terpenuhi`}
                  color={overallPercentage === 100 ? 'success' : 'primary'}
                  size="small"
                  sx={{ fontWeight: 800 }}
                />
              </Box>
              <LinearProgress
                variant="determinate"
                value={overallPercentage}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: overallPercentage === 100 ? '#10b981' : '#3b82f6',
                    borderRadius: 4
                  }
                }}
              />
            </Box>
          )}

          {/* TABS SELECTOR FOR EACH REGISTERED MAPEL */}
          {teacherMapels.length > 0 ? (
            <Box>
              <Tabs
                value={activeMapelTab}
                onChange={(_, val) => setActiveMapelTab(val)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  borderBottom: 1,
                  borderColor: 'divider',
                  mb: 3,
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    minHeight: 48
                  }
                }}
              >
                {teacherMapels.map((m, idx) => {
                  const docsForM = dokumenList.filter(d => (d.teacher_mapel_id && d.teacher_mapel_id === m.id) || (!d.teacher_mapel_id && d.mapel === m.mapel_name));
                  const mPercent = totalSlotsPerMapel > 0 ? Math.min(100, Math.round((docsForM.length / totalSlotsPerMapel) * 100)) : 0;
                  const isSubmitted = m.status_submit === 'TERKIRIM';

                  return (
                    <Tab
                      key={m.id}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <MenuBookIcon sx={{ fontSize: 18 }} />
                          <span>{m.mapel_name} {m.sub_mapel ? `(${m.sub_mapel})` : ''}</span>
                          <Chip
                            label={`${mPercent}%`}
                            size="small"
                            color={mPercent === 100 ? 'success' : 'default'}
                            sx={{ height: 20, fontSize: '0.7rem', fontWeight: 800 }}
                          />
                        </Box>
                      }
                    />
                  );
                })}
              </Tabs>

              {/* ACTIVE MAPEL DETAILS & UPLOAD SLOTS */}
              {currentMapel && (
                <Box>
                  {/* CARD HEADER ACTIVE MAPEL */}
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      mb: 3,
                      borderRadius: 3,
                      border: '1px solid #cbd5e1',
                      bgcolor: '#f1f5f9',
                      display: 'flex',
                      flexDirection: { xs: 'column', md: 'row' },
                      justifyContent: 'space-between',
                      alignItems: { md: 'center' },
                      gap: 2
                    }}
                  >
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                        <Typography variant="h6" sx={{ fontWeight: 900, color: '#0f172a' }}>
                          {currentMapel.mapel_name}
                        </Typography>
                        {currentMapel.sub_mapel && (
                          <Chip label={`Sub Mapel: ${currentMapel.sub_mapel}`} size="small" color="secondary" sx={{ fontWeight: 700 }} />
                        )}
                        {currentMapel.status_submit === 'TERKIRIM' ? (
                          <Chip icon={<CheckIcon />} label="Terkirim ke Kurikulum" size="small" color="success" sx={{ fontWeight: 800 }} />
                        ) : (
                          <Chip label="Draft / Dalam Pengisian" size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                        )}
                      </Box>

                      {/* Rombel Chips */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                        <ClassIcon sx={{ fontSize: 18, color: '#64748b' }} />
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569' }}>
                          Kelas / Rombel yang Diampu:
                        </Typography>
                        {Array.isArray(currentMapel.rombel) && currentMapel.rombel.length > 0 ? (
                          currentMapel.rombel.map((r: string, rIdx: number) => (
                            <Chip
                              key={rIdx}
                              label={r}
                              size="small"
                              color="primary"
                              variant="filled"
                              sx={{ fontWeight: 800, fontSize: '0.75rem', height: 24 }}
                            />
                          ))
                        ) : (
                          <Typography variant="caption" color="#94a3b8">Semua Rombel</Typography>
                        )}
                      </Box>
                    </Box>

                    {/* Action Buttons for Mapel */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', md: 'auto' } }}>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<SendIcon />}
                        onClick={() => handleSubmitMapel(currentMapel.id, currentMapel.mapel_name)}
                        sx={{
                          fontWeight: 800,
                          textTransform: 'none',
                          borderRadius: 2,
                          flex: { xs: '1 1 100%', sm: '1 1 auto' },
                          minHeight: 42
                        }}
                      >
                        Kirim ke Kurikulum
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDeleteMapel(currentMapel.id, currentMapel.mapel_name)}
                        sx={{
                          fontWeight: 700,
                          textTransform: 'none',
                          borderRadius: 2,
                          flex: { xs: '1 1 100%', sm: '1 1 auto' },
                          minHeight: 42
                        }}
                      >
                        Hapus Mapel
                      </Button>
                    </Box>
                  </Paper>

                  {/* 3. SECTION BERKAS YANG HARUS DIUNGGAH UNTUK MAPEL INI */}
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', mb: 2 }}>
                    Daftar Berkas Perangkat Ajar Wajib ({currentMapel.mapel_name}):
                  </Typography>

                  <Grid container spacing={2.5}>
                    {guruCategories.map(cat => {
                      const uploadedDocs = dokumenList.filter(d => 
                        d.category_id === cat.id && 
                        ((d.teacher_mapel_id && d.teacher_mapel_id === currentMapel.id) || (!d.teacher_mapel_id && d.mapel === currentMapel.mapel_name))
                      );
                      const target = cat.target_jumlah || 1;
                      const isFilled = uploadedDocs.length >= target;

                      return (
                        <Grid size={{ xs: 12, md: 6 }} key={cat.id}>
                          <Card
                            sx={{
                              borderRadius: 3,
                              border: isFilled ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                              bgcolor: isFilled ? '#f0fdf4' : '#ffffff',
                              transition: 'all 0.2s',
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column'
                            }}
                          >
                            <CardContent sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
                              {/* Header Slot */}
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                                <Box>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                                    {cat.nama}
                                  </Typography>
                                  <Typography variant="caption" color="#64748b">
                                    {cat.is_bertahap
                                      ? `Unggah Bertahap • Target: ${cat.target_pertemuan || 18} Pertemuan • Terunggah: ${uploadedDocs.length}`
                                      : `Target: ${target} Berkas • Terunggah: ${uploadedDocs.length}`}
                                  </Typography>
                                </Box>
                                <Chip
                                  label={isFilled ? 'Lengkap' : `${uploadedDocs.length}/${target}`}
                                  size="small"
                                  color={isFilled ? 'success' : 'default'}
                                  sx={{ fontWeight: 800 }}
                                />
                              </Box>

                              {/* Uploaded Documents List */}
                              <Box sx={{ flex: 1, my: 1 }}>
                                {uploadedDocs.length > 0 ? (
                                  <Stack spacing={1}>
                                    {uploadedDocs.map(doc => {
                                      const isApproved = doc.status === 'TERVERIFIKASI_KURIKULUM' || doc.status === 'DISETUJUI_KEPSEK';
                                      const hasRevision = doc.status === 'DITOLAK_KURIKULUM' || doc.status === 'REVISI_KEPSEK';

                                      return (
                                        <Box
                                          key={doc.id}
                                          sx={{
                                            p: 1.5,
                                            borderRadius: 2,
                                            bgcolor: '#ffffff',
                                            border: hasRevision ? '1px solid #fecdd3' : '1px solid #e2e8f0',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                                          }}
                                        >
                                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Box sx={{ overflow: 'hidden', mr: 1 }}>
                                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                                                {doc.pertemuan_ke && (
                                                  <Chip label={doc.pertemuan_ke} size="small" color="primary" sx={{ fontWeight: 800, height: 20, fontSize: '0.68rem' }} />
                                                )}
                                                <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }} noWrap>
                                                  {doc.file_name}
                                                </Typography>
                                              </Box>
                                              {doc.keterangan && (
                                                <Typography variant="caption" sx={{ display: 'block', color: '#475569', fontStyle: 'italic', mb: 0.5 }}>
                                                  {doc.keterangan}
                                                </Typography>
                                              )}
                                              <Typography variant="caption" color="#64748b">
                                                Diunggah pada {new Date(doc.created_at || Date.now()).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                              </Typography>
                                            </Box>

                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                              {/* Pratinjau Berkas */}
                                              {(doc.file_path || doc.file_url || doc.gdrive_web_view_link) && (
                                                <Tooltip title="Pratinjau Dokumen">
                                                  <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => setPreviewDoc({
                                                      open: true,
                                                      title: `${cat.nama} — ${currentMapel.mapel_name}`,
                                                      fileName: doc.file_name,
                                                      fileUrl: doc.id ? `/api/v1/perangkat/preview/${doc.id}` : (doc.file_url || doc.gdrive_web_view_link),
                                                      statusBadge: doc.status
                                                    })}
                                                  >
                                                    <VisibilityIcon fontSize="small" />
                                                  </IconButton>
                                                </Tooltip>
                                              )}

                                              {/* Ganti Berkas */}
                                              <Tooltip title="Ganti / Perbarui Berkas">
                                                <IconButton
                                                  size="small"
                                                  color="info"
                                                  onClick={() => handleOpenUploadModal(cat, currentMapel, doc.id, doc)}
                                                >
                                                  <CloudUploadIcon fontSize="small" />
                                                </IconButton>
                                              </Tooltip>

                                              {/* Hapus Berkas */}
                                              <Tooltip title="Hapus Berkas">
                                                <IconButton
                                                  size="small"
                                                  color="error"
                                                  onClick={() => handleDeleteDokumen(doc.id, doc.file_name)}
                                                >
                                                  <DeleteIcon fontSize="small" />
                                                </IconButton>
                                              </Tooltip>
                                            </Box>
                                          </Box>

                                          {/* Status Badge */}
                                          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Chip
                                              label={
                                                doc.status === 'DISETUJUI_KEPSEK'
                                                  ? 'Disetujui Kepsek'
                                                  : doc.status === 'TERVERIFIKASI_KURIKULUM'
                                                  ? 'Terverifikasi Kurikulum'
                                                  : doc.status === 'DITOLAK_KURIKULUM'
                                                  ? 'Perlu Revisi Kurikulum'
                                                  : doc.status === 'REVISI_KEPSEK'
                                                  ? 'Perlu Revisi Kepsek'
                                                  : 'Menunggu Verifikasi'
                                              }
                                              size="small"
                                              color={
                                                doc.status === 'DISETUJUI_KEPSEK' || doc.status === 'TERVERIFIKASI_KURIKULUM'
                                                  ? 'success'
                                                  : hasRevision
                                                  ? 'error'
                                                  : 'warning'
                                              }
                                              icon={
                                                isApproved ? <CheckCircleIcon /> : hasRevision ? <WarningAmberIcon /> : <PendingIcon />
                                              }
                                              sx={{ fontWeight: 800, height: 22, fontSize: '0.7rem' }}
                                            />
                                          </Box>

                                          {/* Catatan Revisi jika ada */}
                                          {doc.catatan_revisi && (
                                            <Alert severity="error" sx={{ mt: 1, py: 0, px: 1, fontSize: '0.78rem' }}>
                                              <b>Catatan Revisi:</b> {doc.catatan_revisi}
                                            </Alert>
                                          )}
                                        </Box>
                                      );
                                    })}
                                  </Stack>
                                ) : (
                                  <Box sx={{ p: 2, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
                                    <Typography variant="body2" color="#94a3b8">
                                      Belum ada berkas yang diunggah untuk {cat.nama}.
                                    </Typography>
                                  </Box>
                                )}
                              </Box>

                              {/* Upload Button Slot */}
                              <Box sx={{ pt: 1.5, mt: 'auto', borderTop: '1px solid #f1f5f9' }}>
                                <Button
                                  variant="contained"
                                  size="small"
                                  color="primary"
                                  fullWidth
                                  startIcon={<CloudUploadIcon />}
                                  onClick={() => handleOpenUploadModal(cat, currentMapel)}
                                  sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 2 }}
                                >
                                  {uploadedDocs.length > 0 ? `Tambah Berkas (${uploadedDocs.length}/${target})` : `Unggah ${cat.nama}`}
                                </Button>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>
              )}
            </Box>
          ) : (
            /* KETIKA BELUM ADA MAPEL YANG DITAMBAHKAN */
            <Box sx={{ p: 5, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 3, border: '2px dashed #cbd5e1' }}>
              <SchoolIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 1.5 }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', mb: 1 }}>
                Anda Belum Menambahkan Mata Pelajaran yang Diampu
              </Typography>
              <Typography variant="body2" color="#64748b" sx={{ maxWidth: 600, mx: 'auto', mb: 3 }}>
                Silakan tambahkan mata pelajaran yang Anda ampu dari master data sekolah, lengkapi sub mata pelajaran (jika ada), serta pilih kelas/rombel yang diampu. Setelah dikonfirmasi, seluruh daftar berkas yang harus diunggah akan otomatis ditampilkan.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={<AddIcon />}
                onClick={handleOpenAddMapelModal}
                sx={{ fontWeight: 800, borderRadius: 2.5, px: 3.5, textTransform: 'none' }}
              >
                Tambah & Konfirmasi Mata Pelajaran Sekarang
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* DIALOG TAMBAH MATA PELAJARAN */}
      <Dialog
        open={mapelModalOpen}
        onClose={() => setMapelModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 3,
              m: { xs: 1.5, sm: 2 }
            }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #e2e8f0', py: 2, px: { xs: 2, sm: 3 } }}>
          Tambah Mata Pelajaran & Kelas yang Diampu
        </DialogTitle>
        <DialogContent sx={{ flex: 1, overflowY: 'auto', pt: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 }, pb: 2 }}>
          <Stack spacing={2.5}>
            <Typography variant="body2" color="#64748b">
              Pilih mata pelajaran yang sudah terdaftar di Master Data Sekolah, tentukan sub mapel (opsional), dan pilih kelas/rombel yang diampu.
            </Typography>

            {/* 1. Pilih Mata Pelajaran dari Master Data */}
            <Autocomplete
              options={masterMapelList}
              getOptionLabel={(option) => typeof option === 'string' ? option : `${option.nama_mapel || option.name} (${option.kode_mapel || 'Mapel'})`}
              value={selectedMapelObj}
              onChange={(_, val) => setSelectedMapelObj(val)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Pilih Mata Pelajaran *"
                  placeholder="Ketik atau pilih mata pelajaran..."
                  helperText="Data diambil langsung dari Menu Mata Pelajaran Admin"
                />
              )}
            />

            {/* 2. Sub Mata Pelajaran (Opsional) */}
            <TextField
              label="Sub Mata Pelajaran (Apabila Ada)"
              placeholder="Contoh: Pemrograman Web, Desain Grafis, Trigonometri..."
              value={inputSubMapel}
              onChange={(e) => setInputSubMapel(e.target.value)}
              helperText="Opsional jika terdapat spesifikasi materi pembelajaran"
              fullWidth
            />

            {/* 3. Pilih Rombongan Belajar / Kelas (Multi-select) */}
            <Autocomplete
              multiple
              options={masterRombelList}
              value={selectedRombels}
              onChange={(_, val) => setSelectedRombels(val)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Pilih Kelas / Rombongan Belajar *"
                  placeholder="Pilih satu atau lebih kelas..."
                  helperText="Data diambil dari Menu Rombongan Belajar (bisa memilih lebih dari 1 kelas)"
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            p: { xs: 1.5, sm: 2.5 },
            borderTop: '1px solid #e2e8f0',
            bgcolor: '#f8fafc',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 1.5
          }}
        >
          <Button
            onClick={() => setMapelModalOpen(false)}
            color="inherit"
            variant="outlined"
            sx={{
              fontWeight: 700,
              borderRadius: 2,
              flex: { xs: 1, sm: 'none' },
              minHeight: 42,
              textTransform: 'none'
            }}
          >
            Batal
          </Button>
          <Button
            onClick={handleSaveMapel}
            variant="contained"
            color="primary"
            disabled={isSavingMapel}
            startIcon={isSavingMapel ? <CircularProgress size={16} /> : <CheckIcon />}
            sx={{
              fontWeight: 800,
              px: 3,
              borderRadius: 2,
              flex: { xs: 1, sm: 'none' },
              minHeight: 42,
              textTransform: 'none'
            }}
          >
            Konfirmasi & Tambahkan
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG UPLOAD DOKUMEN PERANGKAT */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 3,
              m: { xs: 1.5, sm: 2 }
            }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #e2e8f0', py: 2, px: { xs: 2, sm: 3 } }}>
          {replaceDocId ? 'Perbarui / Ganti Berkas Perangkat Ajar' : 'Unggah Berkas Perangkat Ajar'}
        </DialogTitle>
        <DialogContent sx={{ flex: 1, overflowY: 'auto', pt: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 }, pb: 2 }}>
          {activeUploadCategory && activeUploadTargetMapel && (
            <Stack spacing={2.5}>
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                  {activeUploadCategory.nama}
                </Typography>
                <Typography variant="body2" color="#64748b">
                  Mata Pelajaran: <b>{activeUploadTargetMapel.mapel_name}</b> {activeUploadTargetMapel.sub_mapel ? `(${activeUploadTargetMapel.sub_mapel})` : ''}
                </Typography>
                <Typography variant="caption" color="#64748b" sx={{ display: 'block', mt: 0.5 }}>
                  Kelas / Rombel: <b>{Array.isArray(activeUploadTargetMapel.rombel) ? activeUploadTargetMapel.rombel.join(', ') : (activeUploadTargetMapel.rombel || '-')}</b>
                </Typography>
              </Box>

              {/* Pertemuan & Keterangan (Opsional / Bertahap) */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: activeUploadCategory.is_bertahap ? 6 : 12 }}>
                  <TextField
                    label={activeUploadCategory.is_bertahap ? 'Pertemuan Ke / Sesi / Modul Ke *' : 'Keterangan Label (Opsional)'}
                    placeholder={activeUploadCategory.is_bertahap ? 'Contoh: Pertemuan 1 / Modul 1' : 'Contoh: Semester Ganjil / Unit 1'}
                    value={inputPertemuanKe}
                    onChange={(e) => setInputPertemuanKe(e.target.value)}
                    size="small"
                    fullWidth
                    required={activeUploadCategory.is_bertahap}
                    helperText={activeUploadCategory.is_bertahap ? 'Identitas sesi/pertemuan berkas modul' : 'Opsional untuk identifikasi berkas'}
                  />
                </Grid>
                {activeUploadCategory.is_bertahap && (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Topik / Materi Pembelajaran"
                      placeholder="Contoh: Pengenalan Komponen, Logika Dasar..."
                      value={inputKeteranganDoc}
                      onChange={(e) => setInputKeteranganDoc(e.target.value)}
                      size="small"
                      fullWidth
                      helperText="Ringkasan materi pada pertemuan ini"
                    />
                  </Grid>
                )}
              </Grid>

              {/* File Dropzone Input Container */}
              <Box
                sx={{
                  border: '2px dashed #3b82f6',
                  borderRadius: 2.5,
                  p: { xs: 2.5, sm: 3 },
                  textAlign: 'center',
                  bgcolor: uploadFile ? '#f0f9ff' : '#f8fafc',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': { borderColor: '#2563eb', bgcolor: '#f0f9ff' },
                  '&:active': { transform: 'scale(0.99)' }
                }}
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                    fileInputRef.current.click();
                  }
                }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    setUploadFile(e.dataTransfer.files[0]);
                  }
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".pdf,.doc,.docx,.xlsx,.xls,.pptx"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadFile(e.target.files[0]);
                    }
                  }}
                />
                <CloudUploadIcon sx={{ fontSize: { xs: 36, sm: 42 }, color: '#3b82f6', mb: 1 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e293b', wordBreak: 'break-word' }}>
                  {uploadFile ? uploadFile.name : 'Klik untuk Memilih / Unggah Berkas'}
                </Typography>
                <Typography variant="caption" color="#64748b" sx={{ display: 'block', mt: 0.5 }}>
                  Ekstensi yang didukung: <b>.pdf, .doc, .docx, .xlsx, .xls, .pptx</b> (Maks 25MB)
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            p: { xs: 1.5, sm: 2.5 },
            borderTop: '1px solid #e2e8f0',
            bgcolor: '#f8fafc',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 1.5
          }}
        >
          <Button
            onClick={() => setUploadDialogOpen(false)}
            color="inherit"
            variant="outlined"
            sx={{
              fontWeight: 700,
              borderRadius: 2,
              flex: { xs: 1, sm: 'none' },
              minHeight: 42,
              textTransform: 'none'
            }}
          >
            Batal
          </Button>
          <Button
            onClick={handleExecuteUpload}
            variant="contained"
            color="primary"
            disabled={!uploadFile || isUploading}
            startIcon={isUploading ? <CircularProgress size={16} /> : <CloudUploadIcon />}
            sx={{
              fontWeight: 800,
              px: 3,
              borderRadius: 2,
              flex: { xs: 1, sm: 'none' },
              minHeight: 42,
              textTransform: 'none'
            }}
          >
            {isUploading ? 'Mengunggah...' : replaceDocId ? 'Simpan Perubahan' : 'Unggah Berkas'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL PRATINJAU DOKUMEN */}
      <DocumentPreviewModal
        open={previewDoc.open}
        onClose={() => setPreviewDoc(prev => ({ ...prev, open: false }))}
        title={previewDoc.title}
        fileName={previewDoc.fileName}
        fileUrl={previewDoc.fileUrl}
        statusBadge={previewDoc.statusBadge}
      />

      {/* MODAL LEMBAR PENGESAHAN */}
      {showPengesahanModal && (
        <LembarPengesahanModal
          open={showPengesahanModal}
          onClose={() => setShowPengesahanModal(false)}
          teacher={{
            name: teacherName,
            nip: currentUser?.nip || '-',
            subject: teacherMapels.map(m => m.mapel_name).join(', ') || currentUser?.subject || '-',
            class: teacherMapels.flatMap(m => m.rombel || []).join(', ') || currentUser?.class || '-'
          }}
          pengesahan={pengesahan}
          dokumenList={dokumenList}
          schoolSettings={schoolSettings}
        />
      )}
    </Box>
  );
}
