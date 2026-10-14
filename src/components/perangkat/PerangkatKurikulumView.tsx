import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  MenuItem,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Tooltip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import LaunchIcon from '@mui/icons-material/Launch';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import SettingsIcon from '@mui/icons-material/Settings';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import TuneIcon from '@mui/icons-material/Tune';
import RefreshIcon from '@mui/icons-material/Refresh';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import axios from 'axios';
import toast from 'react-hot-toast';
import DrillDownPerangkatModal from './DrillDownPerangkatModal';
import KustomisasiPengesahanModal from './KustomisasiPengesahanModal';
import DocumentPreviewModal from './DocumentPreviewModal';
import RekapSupervisiModal from './RekapSupervisiModal';
import { PengaturanWaRekapModal } from './PengaturanWaRekapModal';
import { KirimWaRekapModal } from './KirimWaRekapModal';
import PrintIcon from '@mui/icons-material/Print';
import { useAppTheme } from '../../contexts/ThemeModeContext';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

interface PerangkatKurikulumViewProps {
  initialTab?: number;
}

export default function PerangkatKurikulumView({ initialTab = 0 }: PerangkatKurikulumViewProps) {
  const { preset, isDark } = useAppTheme();
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  const [reports, setReports] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  // Period / Filter State
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState('2024/2025');
  const [selectedSemester, setSelectedSemester] = useState('Ganjil');
  const [tahunAjaranList, setTahunAjaranList] = useState<any[]>([]);
  const [isVerifyingAll, setIsVerifyingAll] = useState(false);
  const [kustomisasiModalOpen, setKustomisasiModalOpen] = useState(false);
  const [rekapModalOpen, setRekapModalOpen] = useState(false);

  // Category Modal State
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [catForm, setCatForm] = useState({
    nama: '',
    target_jumlah: 1,
    tipe_pengadaan: 'DARI_GURU',
    is_bertahap: false,
    target_pertemuan: 18,
    tahun_ajaran: '2024/2025',
    semester: 'Ganjil'
  });
  const [fileKurikulum, setFileKurikulum] = useState<File | null>(null);
  const [isSavingCat, setIsSavingCat] = useState(false);

  // Reset Submissions Dialog State
  const [resetSubmissionsOpen, setResetSubmissionsOpen] = useState(false);
  const [isResettingSubmissions, setIsResettingSubmissions] = useState(false);
  const [resetConfirmedText, setResetConfirmedText] = useState('');

  // WhatsApp Rekap Modals
  const [waRekapModalOpen, setWaRekapModalOpen] = useState(false);
  const [waPengaturanModalOpen, setWaPengaturanModalOpen] = useState(false);

  // In-app Document Preview Modal
  const [previewDoc, setPreviewDoc] = useState<{
    open: boolean;
    title: string;
    fileName: string;
    fileUrl: string | null;
    statusBadge?: string;
  }>({
    open: false,
    title: '',
    fileName: '',
    fileUrl: null,
    statusBadge: ''
  });

  // Fetch active period and list of tahun ajaran
  const fetchConfig = async () => {
    try {
      const [taRes, cfgRes] = await Promise.all([
        axios.get('/api/tahun-ajaran'),
        axios.get('/api/tahun-ajaran/active-config')
      ]);
      const list = Array.isArray(taRes.data) 
        ? taRes.data 
        : (Array.isArray(taRes.data?.data) ? taRes.data.data : []);
      if (list.length > 0) {
        setTahunAjaranList(list);
      }
      if (cfgRes.data) {
        const cfg = cfgRes.data.data || cfgRes.data;
        const activeTa = cfg.active_tahun_ajaran || cfg.tahun_ajaran;
        const activeSem = cfg.active_semester || cfg.semester;
        if (activeTa) setSelectedTahunAjaran(activeTa);
        if (activeSem) setSelectedSemester(activeSem);
      }
    } catch (e) {
      console.warn('Gagal memuat konfigurasi periode aktif:', e);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSetActivePeriod = async (confirmOverride = false) => {
    if (!selectedTahunAjaran) {
      toast.error('Pilih Tahun Ajaran terlebih dahulu');
      return;
    }
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await axios.post(
        '/api/tahun-ajaran/active-config',
        { 
          tahun_ajaran: selectedTahunAjaran, 
          semester: selectedSemester,
          active_tahun_ajaran: selectedTahunAjaran, 
          active_semester: selectedSemester,
          confirm_override: confirmOverride
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      if (res.data?.warning && res.data?.requires_confirmation) {
        const userAgreed = window.confirm(
          `${res.data.message}\n\nApakah Anda tetap ingin melanjutkan perubahan periode aktif?`
        );
        if (userAgreed) {
          return handleSetActivePeriod(true);
        }
        return;
      }

      toast.success(
        res.data?.message || 
        `Periode aktif sistem berhasil diubah ke Tahun Ajaran ${selectedTahunAjaran} - Semester ${selectedSemester}!`
      );
      await fetchConfig();
      loadAllData(selectedTahunAjaran, selectedSemester);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Gagal mengubah periode aktif');
    }
  };

  const handleExecuteResetSubmissions = async () => {
    if (resetConfirmedText !== 'RESET') {
      toast.error('Ketik "RESET" untuk mengonfirmasi tindakan ini.');
      return;
    }

    try {
      setIsResettingSubmissions(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await axios.post(
        '/api/perangkat-ajar/reset-all',
        { tahun_ajaran: selectedTahunAjaran, semester: selectedSemester },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      toast.success(res.data?.message || 'Seluruh berkas & proses berhasil direset ke 0%');
      setResetSubmissionsOpen(false);
      setResetConfirmedText('');
      loadAllData();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Gagal mereset berkas');
    } finally {
      setIsResettingSubmissions(false);
    }
  };

  const loadAllData = async (ta?: string, sem?: string) => {
    const currentTa = ta || selectedTahunAjaran;
    const currentSem = sem || selectedSemester;

    try {
      setIsLoading(true);
      const [repRes, catRes] = await Promise.all([
        axios.get('/api/perangkat/progress-report', { params: { tahun_ajaran: currentTa, semester: currentSem } }),
        axios.get('/api/perangkat/categories', { params: { tahun_ajaran: currentTa, semester: currentSem } })
      ]);
      if (repRes.data && repRes.data.data) {
        setReports(repRes.data.data);
      }
      if (catRes.data && catRes.data.data) {
        setCategories(catRes.data.data);
      }
    } catch (e) {
      toast.error('Gagal memuat data verifikasi kurikulum');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData(selectedTahunAjaran, selectedSemester);
  }, [selectedTahunAjaran, selectedSemester]);

  const handleVerifyAllGlobal = async () => {
    if (!window.confirm(`Verifikasi SEMUA berkas perangkat pembelajaran yang telah diunggah untuk Periode ${selectedTahunAjaran} - Semester ${selectedSemester}?`)) {
      return;
    }
    try {
      setIsVerifyingAll(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await axios.post(
        '/api/perangkat/verify-all',
        { tahun_ajaran: selectedTahunAjaran, semester: selectedSemester },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      toast.success(res.data.message || 'Semua berkas berhasil diverifikasi');
      loadAllData();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Gagal memverifikasi berkas');
    } finally {
      setIsVerifyingAll(false);
    }
  };

  const handleResetAllCategories = async () => {
    const confirmed = window.confirm(
      'PERINGATAN: Anda akan MENGHAPUS SELURUH pengaturan jenis perangkat ajar pada sistem. Berkas unggahan yang sudah ada akan tetap tersimpan secara aman di Nextcloud WebDAV. Lanjutkan reset?'
    );
    if (!confirmed) return;

    try {
      setIsLoading(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await axios.post(
        '/api/perangkat/categories/reset-all',
        { preserve_docs: true },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      toast.success(res.data.message || 'Seluruh pengaturan jenis berkas berhasil dihapus');
      loadAllData();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Gagal mereset pengaturan berkas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCatModal = (cat?: any) => {
    if (cat) {
      setEditingCategory(cat);
      setCatForm({
        nama: cat.nama,
        target_jumlah: cat.target_jumlah || 1,
        tipe_pengadaan: cat.tipe_pengadaan || 'DARI_GURU',
        is_bertahap: Boolean(cat.is_bertahap),
        target_pertemuan: cat.target_pertemuan || 18,
        tahun_ajaran: cat.tahun_ajaran || '2025-2026',
        semester: cat.semester || 'Ganjil'
      });
    } else {
      setEditingCategory(null);
      setCatForm({
        nama: '',
        target_jumlah: 1,
        tipe_pengadaan: 'DARI_GURU',
        is_bertahap: false,
        target_pertemuan: 18,
        tahun_ajaran: '2025-2026',
        semester: 'Ganjil'
      });
    }
    setFileKurikulum(null);
    setCatModalOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!catForm.nama.trim()) {
      toast.error('Nama jenis perangkat wajib diisi');
      return;
    }

    try {
      setIsSavingCat(true);
      const token = localStorage.getItem('token') || localStorage.getItem('guru_token') || sessionStorage.getItem('token');
      const formData = new FormData();
      formData.append('nama', catForm.nama);
      formData.append('target_jumlah', String(catForm.target_jumlah));
      formData.append('tipe_pengadaan', catForm.tipe_pengadaan);
      formData.append('is_bertahap', String(catForm.is_bertahap));
      formData.append('target_pertemuan', String(catForm.target_pertemuan));
      formData.append('tahun_ajaran', catForm.tahun_ajaran);
      formData.append('semester', catForm.semester);
      if (fileKurikulum) {
        formData.append('file_kurikulum', fileKurikulum);
      }

      if (editingCategory) {
        if (editingCategory.file_kurikulum_url) {
          formData.append('existing_file_url', editingCategory.file_kurikulum_url);
        }
        if (editingCategory.file_kurikulum_name) {
          formData.append('existing_file_name', editingCategory.file_kurikulum_name);
        }
        await axios.put(`/api/perangkat/categories/${editingCategory.id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
        toast.success('Jenis perangkat berhasil diperbarui');
      } else {
        await axios.post('/api/perangkat/categories', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
        toast.success('Jenis perangkat baru berhasil ditambahkan');
      }

      setCatModalOpen(false);
      loadAllData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan kategori');
    } finally {
      setIsSavingCat(false);
    }
  };

  const handleDeleteCategory = async (id: string, nama: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus kategori "${nama}"?`)) return;
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('guru_token') || sessionStorage.getItem('token');
      await axios.delete(`/api/perangkat/categories/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      toast.success('Kategori berhasil dihapus');
      loadAllData();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Gagal menghapus kategori');
    }
  };

  // Filtered reports
  const filteredReports = reports.filter(r => {
    const matchSearch = r.name?.toLowerCase().includes(searchQuery.toLowerCase()) || r.nip?.includes(searchQuery);
    if (!matchSearch) return false;
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'LENGKAP') return r.persentase === 100;
    if (statusFilter === 'MENUNGGU') return r.menunggu_verifikasi > 0;
    if (statusFilter === 'REVISI') return r.perlu_revisi > 0;
    if (statusFilter === 'DISAHKAN') return r.status_pengesahan === 'DISAHKAN';
    return true;
  });

  return (
    <Box sx={{ pb: { xs: 1.5, md: 3 } }}>
      {/* HEADER TAMPILAN PERANGKAT KURIKULUM */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <Box
            sx={{
              width: { xs: 36, sm: 42 },
              height: { xs: 36, sm: 42 },
              borderRadius: 2.5,
              bgcolor: activeTab === 1 ? 'rgba(100, 116, 139, 0.12)' : 'rgba(14, 165, 233, 0.12)',
              color: activeTab === 1 ? '#475569' : '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {activeTab === 1 ? <SettingsIcon sx={{ fontSize: { xs: 20, sm: 24 } }} /> : <FactCheckIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />}
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0f172a', lineHeight: 1.2, fontSize: { xs: '0.92rem', sm: '1.1rem' } }}>
              {activeTab === 1 ? 'Pengaturan Jenis Perangkat Ajar' : 'Verifikasi Perangkat Ajar Guru'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: { xs: '0.68rem', sm: '0.75rem' }, display: 'block' }}>
              {activeTab === 1 ? 'Konfigurasi template, bobot, dan jenis dokumen perangkat ajar' : 'Periksa, telaah, dan verifikasi berkas perangkat ajar guru'}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* TAB 0: VERIFIKASI PERANGKAT AJAR GURU */}
      {activeTab === 0 && (
        <Box>
          {/* BAR FILTER PERIODE & BATCH ACTION */}
          <Box sx={{ p: 2, mb: 3, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Filter Tahun Ajaran & Semester */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, width: '100%' }}>
              <TextField
                select
                size="small"
                label="Tahun Ajaran"
                value={selectedTahunAjaran}
                onChange={e => setSelectedTahunAjaran(e.target.value)}
                fullWidth
                sx={{ bgcolor: '#ffffff' }}
              >
                {tahunAjaranList.length > 0 ? (
                  tahunAjaranList.map((t: any) => {
                    const val = t.nama || t.tahun || t.name || '';
                    if (!val) return null;
                    return (
                      <MenuItem key={t.id || val} value={val}>
                        {val} {t.is_active || t.isActive ? '(Aktif)' : ''}
                      </MenuItem>
                    );
                  })
                ) : (
                  [
                    <MenuItem key="2024/2025" value="2024/2025">2024/2025</MenuItem>,
                    <MenuItem key="2025/2026" value="2025/2026">2025/2026</MenuItem>
                  ]
                )}
                {selectedTahunAjaran && !tahunAjaranList.some((t: any) => (t.nama || t.tahun || t.name) === selectedTahunAjaran) && (
                  <MenuItem value={selectedTahunAjaran}>{selectedTahunAjaran}</MenuItem>
                )}
              </TextField>

              <TextField
                select
                size="small"
                label="Semester"
                value={selectedSemester}
                onChange={e => setSelectedSemester(e.target.value)}
                fullWidth
                sx={{ bgcolor: '#ffffff' }}
              >
                <MenuItem value="Ganjil">Ganjil</MenuItem>
                <MenuItem value="Genap">Genap</MenuItem>
              </TextField>
            </Box>

            {/* Tombol Aksi Periode & Verifikasi */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, width: '100%', flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                startIcon={<RefreshIcon />}
                onClick={() => loadAllData()}
                sx={{ fontWeight: 700, py: 1, flex: { sm: 1 } }}
              >
                Segarkan
              </Button>

              <Tooltip title="Jadikan tahun ajaran dan semester yang dipilih sebagai periode aktif seluruh sistem">
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  onClick={() => handleSetActivePeriod()}
                  sx={{ fontWeight: 700, textTransform: 'none', py: 1, flex: { sm: 1 } }}
                >
                  Terapkan Sebagai Periode Utama
                </Button>
              </Tooltip>

              <Button
                variant="outlined"
                color="error"
                startIcon={<RestartAltIcon />}
                onClick={() => setResetSubmissionsOpen(true)}
                disabled={isLoading}
                sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none', py: 1, flex: { sm: 1 } }}
              >
                Reset Berkas & Proses
              </Button>

              <Button
                variant="contained"
                color="success"
                startIcon={<DoneAllIcon />}
                onClick={handleVerifyAllGlobal}
                disabled={isVerifyingAll || isLoading}
                sx={{ fontWeight: 800, borderRadius: 2, py: 1, flex: { sm: 1 } }}
              >
                {isVerifyingAll ? 'Memverifikasi...' : 'Verifikasi Semua Berkas'}
              </Button>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2, mb: 3 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
                Verifikasi & Telaah Perangkat Ajar Guru
              </Typography>
              <Typography variant="body2" color="#64748b">
                Waka Kurikulum melakukan telaah dokumen yang diunggah guru sebelum dilanjutkan ke tahap Pengesahan Kepala Sekolah.
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', md: 'auto' } }}>
              <TextField
                size="small"
                placeholder="Cari nama guru / NIP..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: 20 }} />
                      </InputAdornment>
                    )
                  }
                }}
                sx={{ width: { xs: '100%', sm: 220 } }}
              />

              <TextField
                select
                size="small"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                sx={{ width: { xs: '100%', sm: 180 } }}
              >
                <MenuItem value="ALL">Semua Status</MenuItem>
                <MenuItem value="MENUNGGU">Menunggu Telaah</MenuItem>
                <MenuItem value="REVISI">Perlu Revisi</MenuItem>
                <MenuItem value="LENGKAP">Progres 100%</MenuItem>
                <MenuItem value="DISAHKAN">Telah Disahkan</MenuItem>
              </TextField>

              <Button
                variant="contained"
                color="success"
                startIcon={<WhatsAppIcon />}
                onClick={() => setWaRekapModalOpen(true)}
                sx={{ fontWeight: 800, borderRadius: 2, textTransform: 'none', flex: { xs: '1 1 100%', sm: '1 1 auto' }, minHeight: 40 }}
              >
                Kirim Rekap WA
              </Button>

              <Button
                variant="outlined"
                color="primary"
                startIcon={<PrintIcon />}
                onClick={() => setRekapModalOpen(true)}
                sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none', flex: { xs: '1 1 100%', sm: '1 1 auto' }, minHeight: 40 }}
              >
                Cetak Rekap
              </Button>
            </Box>
          </Box>

          {/* TABLE MONITORING */}
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <CardContent sx={{ p: 0 }}>
              {isLoading ? (
                <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  {/* TAMPILAN DESKTOP TABLE (>= 768px) */}
                  <Box sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: isDark ? 'rgba(30, 41, 59, 0.85)' : '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800, width: 40, color: preset.textColorPrimary }}>No</TableCell>
                        <TableCell sx={{ fontWeight: 800, minWidth: 260, color: preset.textColorPrimary }}>Nama Guru & Mapel Diampu</TableCell>
                        <TableCell sx={{ fontWeight: 800, width: 140, color: preset.textColorPrimary }}>NIP</TableCell>
                        <TableCell sx={{ fontWeight: 800, textAlign: 'center', width: 120, color: preset.textColorPrimary }}>Slot Diunggah</TableCell>
                        <TableCell sx={{ fontWeight: 800, width: 160, color: preset.textColorPrimary }}>Progres Total</TableCell>
                        <TableCell sx={{ fontWeight: 800, textAlign: 'center', width: 150, color: preset.textColorPrimary }}>Status Kurikulum</TableCell>
                        <TableCell sx={{ fontWeight: 800, textAlign: 'center', width: 140, color: preset.textColorPrimary }}>Pengesahan Kepsek</TableCell>
                        <TableCell sx={{ fontWeight: 800, textAlign: 'center', width: 130, color: preset.textColorPrimary }}>Aksi Verifikasi</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredReports.length > 0 ? (
                        filteredReports.map((row, idx) => (
                          <TableRow key={row.teacher_id} hover sx={{ '&:hover': { bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : undefined } }}>
                            <TableCell sx={{ color: preset.textColorSecondary }}>{idx + 1}</TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 800, color: preset.textColorPrimary }}>
                                {row.name}
                              </Typography>
                              
                              {/* DAFTAR MAPEL, KELAS & PERSENTASE PER MAPEL */}
                              {row.mapel_list && row.mapel_list.length > 0 ? (
                                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                                  {row.mapel_list.map((m: any, mIdx: number) => {
                                    const mPercent = m.percentage ?? 0;
                                    const rombelText = Array.isArray(m.rombel) ? m.rombel.join(', ') : (m.rombel || '-');
                                    return (
                                      <Box
                                        key={m.id || mIdx}
                                        sx={{
                                          p: 0.8,
                                          borderRadius: 1.5,
                                          bgcolor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f1f5f9',
                                          border: `1px solid ${preset.glassBorder}`,
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: 0.4
                                        }}
                                      >
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                                          <Typography variant="caption" sx={{ fontWeight: 700, color: preset.textColorPrimary }}>
                                            • {m.mapel_name} {m.sub_mapel ? `(${m.sub_mapel})` : ''}
                                          </Typography>
                                          <Chip
                                            label={`${mPercent}%`}
                                            size="small"
                                            color={mPercent === 100 ? 'success' : mPercent > 0 ? 'primary' : 'default'}
                                            sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800 }}
                                          />
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                          <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                                            Kelas:
                                          </Typography>
                                          {Array.isArray(m.rombel) && m.rombel.length > 0 ? (
                                            m.rombel.map((r: string, rIdx: number) => (
                                              <Chip
                                                key={rIdx}
                                                label={r}
                                                size="small"
                                                variant="outlined"
                                                sx={{ height: 16, fontSize: '0.65rem', fontWeight: 600 }}
                                              />
                                            ))
                                          ) : (
                                            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                                              {rombelText}
                                            </Typography>
                                          )}
                                        </Box>
                                      </Box>
                                    );
                                  })}
                                </Box>
                              ) : (
                                <Typography variant="caption" color="#94a3b8" sx={{ fontStyle: 'italic', display: 'block', mt: 0.5 }}>
                                  Belum mendaftarkan mata pelajaran
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>{row.nip || '-'}</TableCell>
                            <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>
                              {row.sudah_upload} / {row.total_wajib}
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={row.persentase}
                                  sx={{
                                    flex: 1,
                                    height: 8,
                                    borderRadius: 4,
                                    bgcolor: '#e2e8f0',
                                    '& .MuiLinearProgress-bar': {
                                      bgcolor: row.persentase === 100 ? '#10b981' : '#3b82f6',
                                      borderRadius: 4
                                    }
                                  }}
                                />
                                <Typography variant="caption" sx={{ fontWeight: 800, width: 35 }}>
                                  {row.persentase}%
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>
                              {row.menunggu_verifikasi > 0 ? (
                                <Chip label={`${row.menunggu_verifikasi} Perlu Telaah`} size="small" color="warning" sx={{ fontWeight: 700 }} />
                              ) : row.perlu_revisi > 0 ? (
                                <Chip label={`${row.perlu_revisi} Perlu Revisi`} size="small" color="error" sx={{ fontWeight: 700 }} />
                              ) : row.sudah_upload > 0 && row.terverifikasi === row.sudah_upload ? (
                                <Chip label="Terverifikasi" size="small" color="success" sx={{ fontWeight: 700 }} />
                              ) : (
                                <Chip label="Belum Upload" size="small" sx={{ fontWeight: 600 }} />
                              )}
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>
                              <Chip
                                label={
                                  row.status_pengesahan === 'DISAHKAN'
                                    ? 'Disahkan'
                                    : row.status_pengesahan === 'MENUNGGU_PENGESAHAN'
                                    ? 'Siap Disahkan'
                                    : 'Belum Lengkap'
                                }
                                size="small"
                                color={
                                  row.status_pengesahan === 'DISAHKAN'
                                    ? 'success'
                                    : row.status_pengesahan === 'MENUNGGU_PENGESAHAN'
                                    ? 'primary'
                                    : 'default'
                                }
                                sx={{ fontWeight: 800 }}
                              />
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>
                              <Button
                                variant="contained"
                                size="small"
                                color="primary"
                                startIcon={<VisibilityIcon />}
                                onClick={() => setSelectedReport(row)}
                                sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
                              >
                                Periksa Berkas
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4, color: '#64748b' }}>
                            Tidak ada data guru yang sesuai filter.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Box>

                {/* TAMPILAN MOBILE CARD VIEW (< 768px) */}
                <Box sx={{ display: { xs: 'block', md: 'none' }, p: 2 }}>
                  {filteredReports.length > 0 ? (
                    filteredReports.map((row, idx) => (
                      <Card
                        key={row.teacher_id || idx}
                        sx={{
                          mb: 2,
                          borderRadius: 3,
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                          overflow: 'hidden'
                        }}
                      >
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                                {row.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                                NIP: {row.nip || '-'}
                              </Typography>
                            </Box>
                            <Chip
                              label={
                                row.menunggu_verifikasi > 0
                                  ? `${row.menunggu_verifikasi} Perlu Telaah`
                                  : row.perlu_revisi > 0
                                  ? `${row.perlu_revisi} Perlu Revisi`
                                  : row.sudah_upload > 0 && row.terverifikasi === row.sudah_upload
                                  ? 'Terverifikasi'
                                  : 'Proses'
                              }
                              size="small"
                              color={
                                row.menunggu_verifikasi > 0
                                  ? 'warning'
                                  : row.perlu_revisi > 0
                                  ? 'error'
                                  : row.sudah_upload > 0 && row.terverifikasi === row.sudah_upload
                                  ? 'success'
                                  : 'default'
                              }
                              sx={{ fontWeight: 800, fontSize: '0.7rem' }}
                            />
                          </Box>

                          <Box sx={{ my: 1.5, p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #f1f5f9' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569' }}>
                                Progres Berkas
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 800, color: '#0f172a' }}>
                                {row.sudah_upload} / {row.total_wajib} slot ({row.persentase}%)
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={row.persentase}
                              sx={{
                                height: 8,
                                borderRadius: 4,
                                bgcolor: '#e2e8f0',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: row.persentase === 100 ? '#10b981' : '#3b82f6',
                                  borderRadius: 4
                                }
                              }}
                            />
                          </Box>

                          {row.mapel_list && row.mapel_list.length > 0 && (
                            <Box sx={{ mb: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              {row.mapel_list.map((m: any, mIdx: number) => (
                                <Typography key={mIdx} variant="caption" sx={{ color: '#475569', fontWeight: 600 }}>
                                  • {m.mapel_name}: {m.percentage}%
                                </Typography>
                              ))}
                            </Box>
                          )}

                          <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            startIcon={<VisibilityIcon />}
                            onClick={() => setSelectedReport(row)}
                            sx={{ fontWeight: 800, borderRadius: 2, textTransform: 'none', py: 1 }}
                          >
                            Periksa & Telaah Berkas
                          </Button>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4, color: '#64748b' }}>
                      Tidak ada data guru yang sesuai filter.
                    </Box>
                  )}
                </Box>
              </>
            )}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* TAB 1: PENGATURAN PERANGKAT AJAR */}
      {activeTab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2, mb: 3 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
                Pengaturan Jenis Perangkat & Berkas Acuan
              </Typography>
              <Typography variant="body2" color="#64748b">
                Kelola daftar kategori perangkat ajar yang diwajibkan untuk guru, kustomisasi lembar pengesahan, atau unggah dokumen pedoman dari Tim Kurikulum.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                color="success"
                startIcon={<WhatsAppIcon />}
                onClick={() => setWaPengaturanModalOpen(true)}
                sx={{ fontWeight: 800, borderRadius: 2 }}
              >
                Pengaturan WhatsApp Rekap
              </Button>

              <Button
                variant="outlined"
                color="secondary"
                startIcon={<TuneIcon />}
                onClick={() => setKustomisasiModalOpen(true)}
                sx={{ fontWeight: 800, borderRadius: 2 }}
              >
                Kustomisasi Lembar Pengesahan
              </Button>

              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteSweepIcon />}
                onClick={handleResetAllCategories}
                disabled={isLoading || categories.length === 0}
                sx={{ fontWeight: 700, borderRadius: 2 }}
              >
                Hapus Seluruh Pengaturan Berkas
              </Button>

              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => handleOpenCatModal()}
                sx={{ fontWeight: 800, borderRadius: 2 }}
              >
                Tambah Jenis Perangkat
              </Button>
            </Box>
          </Box>

          <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <CardContent sx={{ p: 0 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, width: 50 }}>No</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Nama Jenis Perangkat</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Tipe Pengadaan</TableCell>
                    <TableCell sx={{ fontWeight: 800, textAlign: 'center' }}>Target Berkas</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Berkas Lampiran Kurikulum</TableCell>
                    <TableCell sx={{ fontWeight: 800, textAlign: 'center' }}>Aksi</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categories.map((cat, idx) => (
                    <TableRow key={cat.id} hover>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>
                        <div>{cat.nama}</div>
                        {cat.is_bertahap && (
                          <Chip label={`Unggah Bertahap (${cat.target_pertemuan || 18} Pertemuan)`} size="small" color="primary" variant="outlined" sx={{ mt: 0.5, fontSize: '0.68rem', height: 20 }} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={cat.tipe_pengadaan === 'DARI_KURIKULUM' ? 'Disediakan Kurikulum' : 'Diunggah Guru'}
                          size="small"
                          color={cat.tipe_pengadaan === 'DARI_KURIKULUM' ? 'info' : 'secondary'}
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>
                        {cat.tipe_pengadaan === 'DARI_KURIKULUM' ? '-' : (cat.is_bertahap ? `${cat.target_pertemuan || 18} Pertemuan` : `${cat.target_jumlah || 1} Berkas`)}
                      </TableCell>
                      <TableCell>
                        {cat.file_kurikulum_url ? (
                          <Button
                            size="small"
                            variant="outlined"
                            color="info"
                            startIcon={<VisibilityIcon sx={{ fontSize: 16 }} />}
                            onClick={() => setPreviewDoc({
                              open: true,
                              title: `Acuan Kurikulum: ${cat.nama}`,
                              fileName: cat.file_kurikulum_name || 'Berkas Pedoman',
                              fileUrl: (cat.file_kurikulum_url && cat.file_kurikulum_url.startsWith('/')) 
                                ? `/api/v1/perangkat/preview/file?path=${encodeURIComponent(cat.file_kurikulum_url)}&name=${encodeURIComponent(cat.file_kurikulum_name || 'berkas.pdf')}` 
                                : cat.file_kurikulum_url,
                              statusBadge: 'Pedoman Kurikulum'
                            })}
                            sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.75rem' }}
                          >
                            {cat.file_kurikulum_name || 'Lihat Dokumen'}
                          </Button>
                        ) : (
                          <Typography variant="caption" color="#94a3b8">
                            -
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <IconButton size="small" color="primary" onClick={() => handleOpenCatModal(cat)}>
                          <EditIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteCategory(cat.id, cat.nama)}>
                          <DeleteIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* MODAL TAMBAH / EDIT KATEGORI */}
      <Dialog open={catModalOpen} onClose={() => setCatModalOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a' }}>
          {editingCategory ? 'Ubah Jenis Perangkat Ajar' : 'Tambah Jenis Perangkat Ajar Baru'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <TextField
            label="Nama Jenis Perangkat"
            fullWidth
            required
            placeholder="Contoh: Modul Ajar / RPP, Program Tahunan"
            value={catForm.nama}
            onChange={e => setCatForm({ ...catForm, nama: e.target.value })}
          />

          <FormControl fullWidth>
            <InputLabel>Tipe Pengadaan</InputLabel>
            <Select
              value={catForm.tipe_pengadaan}
              label="Tipe Pengadaan"
              onChange={e => setCatForm({ ...catForm, tipe_pengadaan: e.target.value })}
            >
              <MenuItem value="DARI_GURU">Diunggah Mandiri oleh Guru (Kewajiban Guru)</MenuItem>
              <MenuItem value="DARI_KURIKULUM">Disediakan oleh Kurikulum (Kaldik, Pedoman, Acuan)</MenuItem>
            </Select>
          </FormControl>

          {catForm.tipe_pengadaan === 'DARI_GURU' ? (
            <>
              <FormControl fullWidth>
                <InputLabel>Metode Pengunggahan Guru</InputLabel>
                <Select
                  value={catForm.is_bertahap ? 'BERTAHAP' : 'SEKALIGUS'}
                  label="Metode Pengunggahan Guru"
                  onChange={e => setCatForm({ ...catForm, is_bertahap: e.target.value === 'BERTAHAP' })}
                >
                  <MenuItem value="SEKALIGUS">Sekaligus / Paket Berkas (e.g. Prota, Promes, Silabus, RPP Semester)</MenuItem>
                  <MenuItem value="BERTAHAP">Bertahap per Pertemuan / Modul Mingguan (e.g. Modul Ajar Mingguan / Per Topik)</MenuItem>
                </Select>
              </FormControl>

              {catForm.is_bertahap ? (
                <TextField
                  label="Target Total Pertemuan / Topik (1 Semester)"
                  type="number"
                  fullWidth
                  slotProps={{ htmlInput: { min: 1, max: 36 } }}
                  helperText="Standar 1 semester: 16 - 18 pertemuan atau topik belajar"
                  value={catForm.target_pertemuan}
                  onChange={e => setCatForm({ ...catForm, target_pertemuan: Math.max(1, Number(e.target.value)) })}
                />
              ) : (
                <TextField
                  label="Target Jumlah Berkas yang Diwajibkan"
                  type="number"
                  fullWidth
                  slotProps={{ htmlInput: { min: 1, max: 10 } }}
                  helperText="Misal: 1 berkas per guru, atau 2 berkas untuk semester ganjil & genap"
                  value={catForm.target_jumlah}
                  onChange={e => setCatForm({ ...catForm, target_jumlah: Number(e.target.value) })}
                />
              )}
            </>
          ) : (
            <Box sx={{ p: 2, border: '1px dashed #38bdf8', borderRadius: 2, bgcolor: '#f0f9ff' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0369a1', mb: 1 }}>
                Lampirkan Berkas Acuan Kurikulum (PDF/Docx):
              </Typography>
              <input
                type="file"
                id="file-kurikulum-input"
                style={{ display: 'none' }}
                onChange={e => setFileKurikulum(e.target.files?.[0] || null)}
                accept=".pdf,.doc,.docx,.xls,.xlsx"
              />
              <label htmlFor="file-kurikulum-input">
                <Button variant="outlined" component="span" startIcon={<CloudUploadIcon />} color="info" fullWidth sx={{ fontWeight: 700 }}>
                  {fileKurikulum ? fileKurikulum.name : 'Pilih Berkas Lampiran'}
                </Button>
              </label>
              {editingCategory?.file_kurikulum_name && !fileKurikulum && (
                <Typography variant="caption" color="#64748b" sx={{ display: 'block', mt: 1 }}>
                  Berkas saat ini: <b>{editingCategory.file_kurikulum_name}</b>
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCatModalOpen(false)} color="inherit">
            Batal
          </Button>
          <Button
            onClick={handleSaveCategory}
            variant="contained"
            color="primary"
            disabled={isSavingCat}
            sx={{ fontWeight: 800, borderRadius: 2 }}
          >
            {isSavingCat ? 'Menyimpan...' : 'Simpan Perangkat'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DRILL-DOWN MODAL */}
      {selectedReport && (
        <DrillDownPerangkatModal
          open={!!selectedReport}
          onClose={() => {
            setSelectedReport(null);
            loadAllData();
          }}
          report={selectedReport}
          userRole="WAKIL_KURIKULUM"
          onRefresh={loadAllData}
        />
      )}

      {/* KUSTOMISASI LEMBAR PENGESAHAN MODAL */}
      <KustomisasiPengesahanModal
        open={kustomisasiModalOpen}
        onClose={() => setKustomisasiModalOpen(false)}
        onSaved={loadAllData}
      />

      {/* DIALOG KONFIRMASI RESET BERKAS & PROSES */}
      <Dialog open={resetSubmissionsOpen} onClose={() => setResetSubmissionsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <RestartAltIcon color="error" />
          Konfirmasi Reset Seluruh Berkas & Proses
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2, p: 2, bgcolor: 'error.50', borderRadius: 2, border: '1px solid', borderColor: 'error.200' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'error.900', mb: 0.5 }}>
              PERHATIAN: Tindakan ini tidak dapat dibatalkan!
            </Typography>
            <Typography variant="body2" sx={{ color: 'error.800' }}>
              Anda akan mereset <b>SELURUH unggahan berkas perangkat ajar</b>, catatan revisi, serta status verifikasi Waka Kurikulum & pengesahan Kepala Sekolah untuk periode:
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'error.900', mt: 1 }}>
              Tahun Ajaran: {selectedTahunAjaran} | Semester: {selectedSemester}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'error.700' }}>
              Semua progres guru akan kembali menjadi <b>0%</b> dan status kembali ke <b>DRAFT</b>.
            </Typography>
          </Box>

          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            Untuk melanjutkan, ketik kata <b>RESET</b> pada kolom di bawah ini:
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Ketik RESET"
            value={resetConfirmedText}
            onChange={e => setResetConfirmedText(e.target.value)}
            error={resetConfirmedText.length > 0 && resetConfirmedText !== 'RESET'}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => { setResetSubmissionsOpen(false); setResetConfirmedText(''); }} color="inherit" sx={{ textTransform: 'none' }}>
            Batalkan
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={resetConfirmedText !== 'RESET' || isResettingSubmissions}
            onClick={handleExecuteResetSubmissions}
            startIcon={isResettingSubmissions ? <CircularProgress size={18} color="inherit" /> : <RestartAltIcon />}
            sx={{ textTransform: 'none', fontWeight: 800 }}
          >
            {isResettingSubmissions ? 'Mereset...' : 'Ya, Reset Semua Berkas & Proses'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* In-app Document Preview Modal */}
      <DocumentPreviewModal
        open={previewDoc.open}
        onClose={() => setPreviewDoc(prev => ({ ...prev, open: false }))}
        title={previewDoc.title}
        fileName={previewDoc.fileName}
        fileUrl={previewDoc.fileUrl}
        statusBadge={previewDoc.statusBadge}
      />

      {/* REKAP SUPERVISI PRINT MODAL */}
      <RekapSupervisiModal
        open={rekapModalOpen}
        onClose={() => setRekapModalOpen(false)}
        reports={reports}
        tahunAjaran={selectedTahunAjaran}
        semester={selectedSemester}
      />

      {/* KIRIM REKAP WHATSAPP MODAL */}
      <KirimWaRekapModal
        open={waRekapModalOpen}
        onClose={() => setWaRekapModalOpen(false)}
        tahunAjaran={selectedTahunAjaran}
        semester={selectedSemester}
        onOpenSettings={() => setWaPengaturanModalOpen(true)}
      />

      {/* PENGATURAN WHATSAPP REKAP MODAL */}
      <PengaturanWaRekapModal
        open={waPengaturanModalOpen}
        onClose={() => setWaPengaturanModalOpen(false)}
      />
    </Box>
  );
}
