import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

// MUI Imports
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Stack,
  Chip,
  Card,
  Tooltip,
  MenuItem,
  CircularProgress,
  LinearProgress,
  Grid,
  Alert,
  InputAdornment,
  Switch,
  FormControlLabel,
  Divider,
  Tabs,
  Tab,
  TablePagination
} from '@mui/material';

// Icons
import {
  VpnKey as KeyIcon,
  AutoFixHigh as AutoFixHighIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Sync as SyncIcon,
  ContentCopy as ContentCopyIcon,
  Security as SecurityIcon,
  Check as CheckIcon,
  Download as DownloadIcon,
  Shuffle as ShuffleIcon,
  School as SchoolIcon,
  People as PeopleIcon,
  Save as SaveIcon,
  WhatsApp as WhatsAppIcon
} from '@mui/icons-material';

import { StudentAccountRecord } from '../../types';

// Preset lists according to requirements
const KEPSEK_PASSWORD_PRESETS = [
  'Kepsek@123',
  'Kepsek@2026',
  '@Kepsek123',
  '@Kepsek2026'
];

const GURU_PASSWORD_PRESETS = [
  'Guru@123',
  '@Guru123',
  '@Guru2026',
  'Guru@2026'
];

const SISWA_PASSWORD_PRESETS = [
  '@Siswa123',
  'Siswa@123',
  'Siswa_123',
  '*Siswa123*'
];

interface TeacherAccount {
  id: string;
  teacher_id: string;
  username: string;
  password?: string;
  plain_password?: string;
  password_plain?: string;
  role: string;
  status: 'AKTIF' | 'NONAKTIF';
  created_at?: string;
  updated_at?: string;
  teacher_name?: string;
  teacher_nip?: string;
  name?: string;
  nip?: string;
  whatsapp?: string;
  class?: string;
}

export default function UserAccountsDB() {
  const [activeTab, setActiveTab] = useState<'kepsek' | 'guru' | 'siswa'>('guru');

  // ==================== KEPSEK STATE ====================
  const [kepsekLoading, setKepsekLoading] = useState(false);
  const [kepsekSaving, setKepsekSaving] = useState(false);
  const [kepsekData, setKepsekData] = useState<{
    name: string;
    nip: string;
    whatsapp: string;
    username: string;
    password_plain: string;
    status: 'AKTIF' | 'NONAKTIF';
  }>({
    name: '',
    nip: '',
    whatsapp: '',
    username: 'kepsek',
    password_plain: 'Kepsek@123',
    status: 'AKTIF'
  });
  const [showKepsekPass, setShowKepsekPass] = useState(false);
  const [kepsekPassPresetDialog, setKepsekPassPresetDialog] = useState(false);

  // ==================== GURU STATE ====================
  const [teacherAccounts, setTeacherAccounts] = useState<TeacherAccount[]>([]);
  const [guruLoading, setGuruLoading] = useState(true);
  const [guruSearch, setGuruSearch] = useState('');
  const [guruStatusFilter, setGuruStatusFilter] = useState('ALL');
  const [visibleGuruPasswords, setVisibleGuruPasswords] = useState<Record<string, boolean>>({});
  const [editingGuruAccount, setEditingGuruAccount] = useState<TeacherAccount | null>(null);
  const [guruEditForm, setGuruEditForm] = useState({
    username: '',
    password: '',
    status: 'AKTIF'
  });
  const [showGuruEditPassword, setShowGuruEditPassword] = useState(false);
  const [savingGuruEdit, setSavingGuruEdit] = useState(false);
  const [massGuruDialogOpen, setMassGuruDialogOpen] = useState(false);
  const [guruPage, setGuruPage] = useState(0);
  const [guruRowsPerPage, setGuruRowsPerPage] = useState(25);

  // ==================== SISWA STATE ====================
  const [studentAccounts, setStudentAccounts] = useState<StudentAccountRecord[]>([]);
  const [siswaLoading, setSiswaLoading] = useState(true);
  const [siswaSearch, setSiswaSearch] = useState('');
  const [siswaClassFilter, setSiswaClassFilter] = useState('ALL');
  const [siswaStatusFilter, setSiswaStatusFilter] = useState('ALL');
  const [visibleSiswaPasswords, setVisibleSiswaPasswords] = useState<Record<string, boolean>>({});
  const [editingSiswaAccount, setEditingSiswaAccount] = useState<StudentAccountRecord | null>(null);
  const [siswaEditForm, setSiswaEditForm] = useState({
    username: '',
    password: '',
    status: 'AKTIF' as 'AKTIF' | 'NONAKTIF'
  });
  const [showSiswaEditPassword, setShowSiswaEditPassword] = useState(false);
  const [savingSiswaEdit, setSavingSiswaEdit] = useState(false);
  const [massSiswaDialogOpen, setMassSiswaDialogOpen] = useState(false);
  const [siswaPage, setSiswaPage] = useState(0);
  const [siswaRowsPerPage, setSiswaRowsPerPage] = useState(25);

  // Progress Bar & General Copied state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [progressSuccessMsg, setProgressSuccessMsg] = useState('');

  // ==================== FETCH FUNCTIONS ====================
  const fetchKepsek = async () => {
    setKepsekLoading(true);
    try {
      const res = await axios.get('/api/accounts/kepala-sekolah');
      if (res.data?.data) {
        setKepsekData({
          name: res.data.data.name || '',
          nip: res.data.data.nip || '',
          whatsapp: res.data.data.whatsapp || '',
          username: res.data.data.username || 'kepsek',
          password_plain: res.data.data.password_plain || 'Kepsek@123',
          status: res.data.data.status || 'AKTIF'
        });
      }
    } catch (e: any) {
      console.error('Error fetching kepsek:', e);
    } finally {
      setKepsekLoading(false);
    }
  };

  const fetchGuruAccounts = async (silent = false) => {
    if (!silent) setGuruLoading(true);
    try {
      const res = await axios.get('/api/teacher-accounts');
      if (res.data?.data) {
        setTeacherAccounts(res.data.data);
      }
    } catch (e: any) {
      console.error('Error fetching teacher accounts:', e);
    } finally {
      if (!silent) setGuruLoading(false);
    }
  };

  const fetchSiswaAccounts = async (silent = false) => {
    if (!silent) setSiswaLoading(true);
    try {
      const res = await axios.get('/api/student-accounts');
      if (res.data?.data) {
        setStudentAccounts(res.data.data);
      }
    } catch (e: any) {
      console.error('Error fetching student accounts:', e);
    } finally {
      if (!silent) setSiswaLoading(false);
    }
  };

  useEffect(() => {
    fetchKepsek();
    fetchGuruAccounts();
    fetchSiswaAccounts();
  }, []);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Disalin ke clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ==================== KEPSEK HANDLERS ====================
  const handleSaveKepsek = async () => {
    setKepsekSaving(true);
    try {
      await axios.post('/api/accounts/kepala-sekolah', kepsekData);
      toast.success('Akun Kepala Sekolah berhasil disimpan!');
      fetchKepsek();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Gagal menyimpan akun Kepala Sekolah');
    } finally {
      setKepsekSaving(false);
    }
  };

  const handleSyncKepsek = async () => {
    setKepsekLoading(true);
    try {
      const res = await axios.post('/api/accounts/kepala-sekolah/sync');
      if (res.data?.data) {
        setKepsekData(res.data.data);
        toast.success('Data Kepala Sekolah berhasil disinkronkan dari Informasi Sekolah!');
      }
    } catch (e: any) {
      toast.error('Gagal sinkron data Kepala Sekolah');
    } finally {
      setKepsekLoading(false);
    }
  };

  const handleApplyKepsekPreset = async (preset: string) => {
    setKepsekData(prev => ({ ...prev, password_plain: preset }));
    setKepsekPassPresetDialog(false);
    try {
      await axios.post('/api/accounts/kepala-sekolah', {
        ...kepsekData,
        password_plain: preset
      });
      toast.success(`Password Kepala Sekolah berhasil diubah ke: ${preset}`);
    } catch (e: any) {
      toast.error('Gagal memperbarui password');
    }
  };

  // ==================== GURU HANDLERS ====================
  const handleSyncGuru = async () => {
    setIsProcessing(true);
    setProgressDialogOpen(true);
    setProgressValue(20);
    setProgressLabel('Membaca Data Guru & Rombel...');
    setProgressSuccessMsg('');

    try {
      setTimeout(() => {
        setProgressValue(60);
        setProgressLabel('Menyelaraskan Akun & Hak Akses Guru...');
      }, 400);

      const res = await axios.post('/api/teacher-accounts/sync');
      
      setTimeout(() => {
        setProgressValue(100);
        setProgressLabel('Sinkronisasi Selesai!');
        setProgressSuccessMsg(`Sinkronisasi Berhasil: ${res.data?.created || 0} akun baru dibuat, ${res.data?.updated || 0} akun diselaraskan.`);
        setIsProcessing(false);
        fetchGuruAccounts(true);
      }, 800);
    } catch (e: any) {
      setIsProcessing(false);
      setProgressDialogOpen(false);
      toast.error('Gagal sinkronisasi data guru');
    }
  };

  const handleMassRegenerateGuru = async (chosenPreset: string) => {
    setMassGuruDialogOpen(false);
    setIsProcessing(true);
    setProgressDialogOpen(true);
    setProgressValue(15);
    setProgressLabel('Menyiapkan generator akun...');
    setProgressSuccessMsg('');

    try {
      setTimeout(() => {
        setProgressValue(50);
        setProgressLabel(`Menerapkan password ${chosenPreset} ke semua guru...`);
      }, 400);

      const res = await axios.post('/api/teacher-accounts/regenerate', { chosenPassword: chosenPreset });

      setTimeout(() => {
        setProgressValue(100);
        setProgressLabel('Selesai!');
        setProgressSuccessMsg(`Berhasil me-reset ${res.data?.count || teacherAccounts.length} Akun Guru dengan Password: "${chosenPreset}"`);
        setIsProcessing(false);
        fetchGuruAccounts(true);
      }, 900);
    } catch (e: any) {
      setIsProcessing(false);
      setProgressDialogOpen(false);
      toast.error('Gagal me-reset password guru');
    }
  };

  const handleToggleGuruStatus = async (account: TeacherAccount) => {
    const nextStatus = account.status === 'AKTIF' ? 'NONAKTIF' : 'AKTIF';
    try {
      await axios.put(`/api/teacher-accounts/${account.id}/status`, { status: nextStatus });
      toast.success(`Status akun ${account.teacher_name || account.username} diubah ke ${nextStatus}`);
      fetchGuruAccounts(true);
    } catch (e: any) {
      toast.error('Gagal mengubah status');
    }
  };

  const handleSaveGuruEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuruAccount) return;
    setSavingGuruEdit(true);
    try {
      await axios.put(`/api/teacher-accounts/${editingGuruAccount.id}`, {
        username: guruEditForm.username,
        password: guruEditForm.password || undefined,
        status: guruEditForm.status
      });
      toast.success('Akun guru berhasil diperbarui');
      setEditingGuruAccount(null);
      fetchGuruAccounts(true);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Gagal menyimpan perubahan akun guru');
    } finally {
      setSavingGuruEdit(false);
    }
  };

  // ==================== SISWA HANDLERS ====================
  const handleSyncSiswa = async () => {
    setIsProcessing(true);
    setProgressDialogOpen(true);
    setProgressValue(20);
    setProgressLabel('Membaca Data Siswa...');
    setProgressSuccessMsg('');

    try {
      setTimeout(() => {
        setProgressValue(60);
        setProgressLabel('Membuat Akun Siswa berdasarkan NISN...');
      }, 400);

      const res = await axios.post('/api/student-accounts/sync');
      
      setTimeout(() => {
        setProgressValue(100);
        setProgressLabel('Sinkronisasi Akun Siswa Selesai!');
        setProgressSuccessMsg(`Sinkronisasi Selesai: ${res.data?.created || 0} akun siswa baru ditambahkan, ${res.data?.updated || 0} akun diselaraskan.`);
        setIsProcessing(false);
        fetchSiswaAccounts(true);
      }, 800);
    } catch (e: any) {
      setIsProcessing(false);
      setProgressDialogOpen(false);
      toast.error('Gagal sinkronisasi akun siswa');
    }
  };

  const handleMassRegenerateSiswa = async (chosenPreset: string) => {
    setMassSiswaDialogOpen(false);
    setIsProcessing(true);
    setProgressDialogOpen(true);
    setProgressValue(15);
    setProgressLabel('Menyiapkan generator akun siswa...');
    setProgressSuccessMsg('');

    try {
      setTimeout(() => {
        setProgressValue(50);
        setProgressLabel(`Menerapkan password ${chosenPreset} ke semua siswa...`);
      }, 400);

      const res = await axios.post('/api/student-accounts/regenerate', { chosenPassword: chosenPreset });

      setTimeout(() => {
        setProgressValue(100);
        setProgressLabel('Selesai!');
        setProgressSuccessMsg(`Berhasil me-reset ${res.data?.count || studentAccounts.length} Akun Siswa dengan Password: "${chosenPreset}"`);
        setIsProcessing(false);
        fetchSiswaAccounts(true);
      }, 900);
    } catch (e: any) {
      setIsProcessing(false);
      setProgressDialogOpen(false);
      toast.error('Gagal me-reset password siswa');
    }
  };

  const handleToggleSiswaStatus = async (account: StudentAccountRecord) => {
    const nextStatus = account.status === 'AKTIF' ? 'NONAKTIF' : 'AKTIF';
    try {
      await axios.put(`/api/student-accounts/${account.id}/status`, { status: nextStatus });
      toast.success(`Status akun ${account.name || account.student_name || account.username} diubah ke ${nextStatus}`);
      fetchSiswaAccounts(true);
    } catch (e: any) {
      toast.error('Gagal mengubah status');
    }
  };

  const handleSaveSiswaEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSiswaAccount) return;
    setSavingSiswaEdit(true);
    try {
      await axios.put(`/api/student-accounts/${editingSiswaAccount.id}`, {
        username: siswaEditForm.username,
        password: siswaEditForm.password || undefined,
        status: siswaEditForm.status
      });
      toast.success('Akun siswa berhasil diperbarui');
      setEditingSiswaAccount(null);
      fetchSiswaAccounts(true);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Gagal menyimpan perubahan akun siswa');
    } finally {
      setSavingSiswaEdit(false);
    }
  };

  // Export functions
  const handleExportGuruCSV = () => {
    if (teacherAccounts.length === 0) {
      toast.error('Tidak ada data akun guru untuk diekspor');
      return;
    }
    const headers = ['No', 'Nama Guru', 'NIP', 'WhatsApp', 'Username', 'Password', 'Status'];
    const rows = teacherAccounts.map((acc, idx) => [
      idx + 1,
      `"${(acc.teacher_name || acc.name || '').replace(/"/g, '""')}"`,
      `"${acc.teacher_nip || acc.nip || ''}"`,
      `"${acc.whatsapp || ''}"`,
      `"${acc.username}"`,
      `"${acc.password_plain || acc.plain_password || acc.password || ''}"`,
      acc.status
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Daftar_Akun_Guru_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Data Akun Guru berhasil diekspor!');
  };

  const handleExportSiswaCSV = () => {
    if (studentAccounts.length === 0) {
      toast.error('Tidak ada data akun siswa untuk diekspor');
      return;
    }
    const headers = ['No', 'Nama Siswa', 'NISN', 'Kelas', 'WhatsApp', 'Username', 'Password', 'Status'];
    const rows = studentAccounts.map((acc, idx) => [
      idx + 1,
      `"${(acc.name || acc.student_name || '').replace(/"/g, '""')}"`,
      `"${acc.nisn || ''}"`,
      `"${acc.class || acc.class_name || ''}"`,
      `"${acc.whatsapp || ''}"`,
      `"${acc.username}"`,
      `"${acc.password_plain || acc.plain_password || ''}"`,
      acc.status
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Daftar_Akun_Siswa_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Data Akun Siswa berhasil diekspor!');
  };

  // Filtered lists
  const filteredGuru = teacherAccounts.filter(acc => {
    const q = guruSearch.toLowerCase();
    const matchSearch =
      (acc.teacher_name || acc.name || '').toLowerCase().includes(q) ||
      (acc.teacher_nip || acc.nip || '').toLowerCase().includes(q) ||
      (acc.username || '').toLowerCase().includes(q);
    const matchStatus = guruStatusFilter === 'ALL' || acc.status === guruStatusFilter;
    return matchSearch && matchStatus;
  });

  const paginatedGuru = guruRowsPerPage > 0
    ? filteredGuru.slice(guruPage * guruRowsPerPage, guruPage * guruRowsPerPage + guruRowsPerPage)
    : filteredGuru;

  const uniqueSiswaClasses = Array.from(new Set(studentAccounts.map(s => s.class || s.class_name).filter(Boolean))).sort();

  const filteredSiswa = studentAccounts.filter(acc => {
    const q = siswaSearch.toLowerCase();
    const studentName = acc.name || acc.student_name || '';
    const studentClass = acc.class || acc.class_name || '';
    const matchSearch =
      studentName.toLowerCase().includes(q) ||
      (acc.nisn || '').toLowerCase().includes(q) ||
      (acc.username || '').toLowerCase().includes(q) ||
      studentClass.toLowerCase().includes(q);
    const matchClass = siswaClassFilter === 'ALL' || studentClass === siswaClassFilter;
    const matchStatus = siswaStatusFilter === 'ALL' || acc.status === siswaStatusFilter;
    return matchSearch && matchClass && matchStatus;
  });

  const paginatedSiswa = siswaRowsPerPage > 0
    ? filteredSiswa.slice(siswaPage * siswaRowsPerPage, siswaPage * siswaRowsPerPage + siswaRowsPerPage)
    : filteredSiswa;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header Banner */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'grey.200',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          color: 'white'
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
          <Box>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.5 }}>
              <KeyIcon sx={{ fontSize: 28, color: '#a855f7' }} />
              <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                Akun User (Kepala Sekolah, Guru & Siswa)
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: 'grey.300', maxWidth: 800 }}>
              Kelola kredensial akses login untuk seluruh entitas sekolah: Akun Kepala Sekolah, Akun Guru, dan Akun Siswa dengan generator password otomatis dan sinkronisasi database.
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Main Tabs */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, bgcolor: 'grey.50' }}>
          <Tabs
            value={activeTab}
            onChange={(e, val) => setActiveTab(val)}
            sx={{
              '& .MuiTab-root': {
                py: 2,
                fontWeight: 700,
                fontSize: '0.9rem',
                textTransform: 'none'
              }
            }}
          >
            <Tab
              value="kepsek"
              label="User Kepala Sekolah"
              icon={<SchoolIcon />}
              iconPosition="start"
            />
            <Tab
              value="guru"
              label={`User Guru (${teacherAccounts.length})`}
              icon={<PersonIcon />}
              iconPosition="start"
            />
            <Tab
              value="siswa"
              label={`User Siswa (${studentAccounts.length})`}
              icon={<PeopleIcon />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* ==================== TAB 1: KEPALA SEKOLAH ==================== */}
        {activeTab === 'kepsek' && (
          <Box sx={{ p: 3 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, mb: 3 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Kredensial Akun Kepala Sekolah
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Data otomatis diambil dari menu <b>Informasi Sekolah</b>. Login menggunakan NIP / Nama Lengkap sebagai username.
                </Typography>
              </Box>

              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="outlined"
                  startIcon={<SyncIcon />}
                  onClick={handleSyncKepsek}
                  disabled={kepsekLoading}
                >
                  Sinkron Data
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<AutoFixHighIcon />}
                  onClick={() => setKepsekPassPresetDialog(true)}
                  sx={{ fontWeight: 700 }}
                >
                  Generator Password
                </Button>
              </Stack>
            </Stack>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 7 }}>
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2.5, p: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SchoolIcon color="primary" /> Identitas & Data Login Kepala Sekolah
                  </Typography>
                  <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2, fontSize: '0.825rem' }}>
                    Data Identitas (Nama, NIP, Nomor WhatsApp) ditarik langsung dari menu <b>Informasi Sekolah</b> agar tidak terjadi duplikasi akun. Anda dapat langsung menggunakan <b>Generator Password</b> untuk mengatur kredensial login.
                  </Alert>

                  <Stack spacing={2.5}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Nama Lengkap Kepala Sekolah"
                      value={kepsekData.name}
                      onChange={e => setKepsekData({ ...kepsekData, name: e.target.value })}
                      helperText="Diambil dari Informasi Sekolah"
                    />

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="NIP Kepala Sekolah"
                          value={kepsekData.nip}
                          onChange={e => setKepsekData({ ...kepsekData, nip: e.target.value })}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Nomor WhatsApp"
                          value={kepsekData.whatsapp}
                          onChange={e => setKepsekData({ ...kepsekData, whatsapp: e.target.value })}
                          slotProps={{
                            input: {
                              startAdornment: (
                                <InputAdornment position="start">
                                  <WhatsAppIcon fontSize="small" color="success" />
                                </InputAdornment>
                              )
                            }
                          }}
                        />
                      </Grid>
                    </Grid>

                    <Divider />

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Username Login"
                          value={kepsekData.username}
                          onChange={e => setKepsekData({ ...kepsekData, username: e.target.value })}
                          helperText="Dapat menggunakan NIP atau username kustom"
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          size="small"
                          type={showKepsekPass ? 'text' : 'password'}
                          label="Password"
                          value={kepsekData.password_plain}
                          onChange={e => setKepsekData({ ...kepsekData, password_plain: e.target.value })}
                          slotProps={{
                            input: {
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton size="small" onClick={() => setShowKepsekPass(!showKepsekPass)}>
                                    {showKepsekPass ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                  </IconButton>
                                </InputAdornment>
                              )
                            }
                          }}
                        />
                      </Grid>
                    </Grid>

                    <TextField
                      select
                      size="small"
                      label="Status Akun"
                      value={kepsekData.status}
                      onChange={e => setKepsekData({ ...kepsekData, status: e.target.value as any })}
                    >
                      <MenuItem value="AKTIF">AKTIF</MenuItem>
                      <MenuItem value="NONAKTIF">NONAKTIF</MenuItem>
                    </TextField>

                    <Box sx={{ pt: 1, display: 'flex', gap: 1.5 }}>
                      <Button
                        variant="contained"
                        startIcon={kepsekSaving ? <CircularProgress size={16} /> : <SaveIcon />}
                        onClick={handleSaveKepsek}
                        disabled={kepsekSaving}
                        sx={{ fontWeight: 700 }}
                      >
                        {kepsekSaving ? 'Menyimpan...' : 'Simpan Akun Kepala Sekolah'}
                      </Button>
                    </Box>
                  </Stack>
                </Card>
              </Grid>

              {/* Quick Info Card */}
              <Grid size={{ xs: 12, md: 5 }}>
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2.5, p: 3, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SecurityIcon color="secondary" /> Kartu Ringkasan Akun Kepsek
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'grey.200', mb: 2 }}>
                    <Stack spacing={1.5}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Nama Pimpinan:</Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{kepsekData.name || 'Belum diisi'}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">NIP / WhatsApp:</Typography>
                        <Typography variant="body2">{kepsekData.nip || '-'} / {kepsekData.whatsapp || '-'}</Typography>
                      </Box>
                      <Divider />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Username:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{kepsekData.username}</Typography>
                        </Box>
                        <IconButton size="small" onClick={() => handleCopy('kepsek-user', kepsekData.username)}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Password Plain:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace', color: 'primary.main' }}>
                            {showKepsekPass ? kepsekData.password_plain : '••••••••'}
                          </Typography>
                        </Box>
                        <IconButton size="small" onClick={() => handleCopy('kepsek-pass', kepsekData.password_plain)}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Stack>
                  </Box>

                  <Typography variant="caption" color="text.secondary">
                    💡 <b>Pilihan Preset Password Kepsek:</b>
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mt: 1 }}>
                    {KEPSEK_PASSWORD_PRESETS.map(preset => (
                      <Chip
                        key={preset}
                        label={preset}
                        size="small"
                        onClick={() => handleApplyKepsekPreset(preset)}
                        sx={{ cursor: 'pointer', fontWeight: 600, mb: 0.5 }}
                      />
                    ))}
                  </Stack>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* ==================== TAB 2: GURU ==================== */}
        {activeTab === 'guru' && (
          <Box sx={{ p: 3 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, mb: 3 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Kredensial Akun Guru
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Data otomatis diambil dari <b>Data Guru</b>. Login menggunakan NIP / Nama Lengkap sebagai username.
                </Typography>
              </Box>

              <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  startIcon={<SyncIcon />}
                  onClick={handleSyncGuru}
                  disabled={isProcessing}
                >
                  Sinkron Data Guru
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<AutoFixHighIcon />}
                  onClick={() => setMassGuruDialogOpen(true)}
                  disabled={isProcessing || teacherAccounts.length === 0}
                  sx={{ fontWeight: 700 }}
                >
                  Reset Password Massal
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleExportGuruCSV}
                  disabled={teacherAccounts.length === 0}
                >
                  Ekspor CSV
                </Button>
              </Stack>
            </Stack>

            {/* Filter Bar */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
              <TextField
                size="small"
                placeholder="Cari nama guru, NIP, atau username..."
                value={guruSearch}
                onChange={e => {
                  setGuruSearch(e.target.value);
                  setGuruPage(0);
                }}
                sx={{ width: { xs: '100%', sm: 350 } }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" fontSize="small" />
                      </InputAdornment>
                    )
                  }
                }}
              />
              <TextField
                select
                size="small"
                label="Status Akun"
                value={guruStatusFilter}
                onChange={e => {
                  setGuruStatusFilter(e.target.value);
                  setGuruPage(0);
                }}
                sx={{ minWidth: 150 }}
              >
                <MenuItem value="ALL">Semua Status</MenuItem>
                <MenuItem value="AKTIF">AKTIF</MenuItem>
                <MenuItem value="NONAKTIF">NONAKTIF</MenuItem>
              </TextField>
            </Stack>

            {/* Table */}
            {guruLoading ? (
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <CircularProgress size={36} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                  Memuat data akun guru...
                </Typography>
              </Box>
            ) : filteredGuru.length === 0 ? (
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <PersonIcon sx={{ fontSize: 54, color: 'grey.300', mb: 1 }} />
                <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Belum ada data akun guru
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Klik tombol "Sinkron Data Guru" untuk membuat akun dari master Data Guru.
                </Typography>
                <Button variant="contained" startIcon={<SyncIcon />} onClick={handleSyncGuru}>
                  Sinkron Data Guru Sekarang
                </Button>
              </Box>
            ) : (
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2, overflow: 'hidden' }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, width: 50 }}>No</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Nama Guru</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>NIP</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Username Login</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Password</TableCell>
                        <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 700, textAlign: 'center', width: 100 }}>Aksi</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedGuru.map((acc, idx) => {
                        const rowNum = (guruRowsPerPage > 0 ? guruPage * guruRowsPerPage : 0) + idx + 1;
                        const isPassVisible = Boolean(visibleGuruPasswords[acc.id]);
                        const plainPass = acc.password_plain || acc.plain_password || acc.password || '';
                        return (
                          <TableRow key={acc.id} hover>
                            <TableCell>{rowNum}</TableCell>
                            <TableCell>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                {acc.teacher_name || acc.name || 'Guru'}
                              </Typography>
                              {acc.whatsapp && (
                                <Typography variant="caption" color="text.secondary">
                                  WA: {acc.whatsapp}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'monospace' }}>
                              {acc.teacher_nip || acc.nip || '-'}
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                  {acc.username}
                                </Typography>
                                <IconButton size="small" onClick={() => handleCopy(`guru-u-${acc.id}`, acc.username)}>
                                  <ContentCopyIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'primary.main', fontWeight: 600 }}>
                                  {isPassVisible ? (plainPass || '••••••••') : '••••••••'}
                                </Typography>
                                <IconButton
                                  size="small"
                                  onClick={() => setVisibleGuruPasswords(prev => ({ ...prev, [acc.id]: !prev[acc.id] }))}
                                  title={isPassVisible ? 'Sembunyikan password' : 'Lihat password'}
                                >
                                  {isPassVisible ? <VisibilityOffIcon sx={{ fontSize: 14 }} /> : <VisibilityIcon sx={{ fontSize: 14 }} />}
                                </IconButton>
                                {plainPass && (
                                  <IconButton size="small" onClick={() => handleCopy(`guru-p-${acc.id}`, plainPass)} title="Salin password">
                                    <ContentCopyIcon sx={{ fontSize: 14 }} />
                                  </IconButton>
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>
                              <FormControlLabel
                                control={
                                  <Switch
                                    size="small"
                                    checked={acc.status === 'AKTIF'}
                                    onChange={() => handleToggleGuruStatus(acc)}
                                    color="success"
                                  />
                                }
                                label={
                                  <Typography variant="caption" sx={{ fontWeight: 700, color: acc.status === 'AKTIF' ? 'success.main' : 'text.secondary' }}>
                                    {acc.status}
                                  </Typography>
                                }
                              />
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>
                              <Tooltip title="Edit Akun Guru">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => {
                                    setEditingGuruAccount(acc);
                                    setGuruEditForm({
                                      username: acc.username,
                                      password: plainPass,
                                      status: acc.status
                                    });
                                    setShowGuruEditPassword(false);
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={filteredGuru.length}
                  page={guruPage}
                  onPageChange={(e, newPage) => setGuruPage(newPage)}
                  rowsPerPage={guruRowsPerPage}
                  onRowsPerPageChange={e => {
                    setGuruRowsPerPage(parseInt(e.target.value, 10));
                    setGuruPage(0);
                  }}
                  rowsPerPageOptions={[10, 25, 50, 100, { label: 'Semua', value: -1 }]}
                  labelRowsPerPage="Tampilkan baris:"
                  labelDisplayedRows={({ from, to, count }) => `${from}–${to} dari ${count !== -1 ? count : `lebih dari ${to}`}`}
                />
              </Paper>
            )}
          </Box>
        )}

        {/* ==================== TAB 3: SISWA ==================== */}
        {activeTab === 'siswa' && (
          <Box sx={{ p: 3 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, mb: 3 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Kredensial Akun Siswa
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Data otomatis disinkronkan dari <b>Data Siswa</b>. Username menggunakan <b>NISN Siswa</b>.
                </Typography>
              </Box>

              <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  startIcon={<SyncIcon />}
                  onClick={handleSyncSiswa}
                  disabled={isProcessing}
                >
                  Sinkron Data Siswa
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<AutoFixHighIcon />}
                  onClick={() => setMassSiswaDialogOpen(true)}
                  disabled={isProcessing || studentAccounts.length === 0}
                  sx={{ fontWeight: 700 }}
                >
                  Reset Password Massal
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleExportSiswaCSV}
                  disabled={studentAccounts.length === 0}
                >
                  Ekspor CSV
                </Button>
              </Stack>
            </Stack>

            {/* Filter Bar */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
              <TextField
                size="small"
                placeholder="Cari nama siswa, NISN, atau kelas..."
                value={siswaSearch}
                onChange={e => {
                  setSiswaSearch(e.target.value);
                  setSiswaPage(0);
                }}
                sx={{ width: { xs: '100%', sm: 300 } }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" fontSize="small" />
                      </InputAdornment>
                    )
                  }
                }}
              />
              <TextField
                select
                size="small"
                label="Filter Kelas"
                value={siswaClassFilter}
                onChange={e => {
                  setSiswaClassFilter(e.target.value);
                  setSiswaPage(0);
                }}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="ALL">Semua Kelas</MenuItem>
                {uniqueSiswaClasses.map(cls => (
                  <MenuItem key={cls} value={cls}>
                    {cls}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Status Akun"
                value={siswaStatusFilter}
                onChange={e => {
                  setSiswaStatusFilter(e.target.value);
                  setSiswaPage(0);
                }}
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="ALL">Semua Status</MenuItem>
                <MenuItem value="AKTIF">AKTIF</MenuItem>
                <MenuItem value="NONAKTIF">NONAKTIF</MenuItem>
              </TextField>
            </Stack>

            {/* Table */}
            {siswaLoading ? (
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <CircularProgress size={36} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                  Memuat data akun siswa...
                </Typography>
              </Box>
            ) : filteredSiswa.length === 0 ? (
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <PeopleIcon sx={{ fontSize: 54, color: 'grey.300', mb: 1 }} />
                <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Belum ada data akun siswa
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Klik tombol "Sinkron Data Siswa" untuk membuat akun dari master Data Siswa.
                </Typography>
                <Button variant="contained" startIcon={<SyncIcon />} onClick={handleSyncSiswa}>
                  Sinkron Data Siswa Sekarang
                </Button>
              </Box>
            ) : (
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2, overflow: 'hidden' }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, width: 50 }}>No</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Nama Siswa</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>NISN (Username)</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Kelas / Rombel</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Password</TableCell>
                        <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 700, textAlign: 'center', width: 100 }}>Aksi</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedSiswa.map((acc, idx) => {
                        const rowNum = (siswaRowsPerPage > 0 ? siswaPage * siswaRowsPerPage : 0) + idx + 1;
                        const isPassVisible = Boolean(visibleSiswaPasswords[acc.id]);
                        const studentName = acc.name || acc.student_name || 'Siswa';
                        const studentClass = acc.class || acc.class_name || '-';
                        const plainPass = acc.password_plain || acc.plain_password || '';
                        return (
                          <TableRow key={acc.id} hover>
                            <TableCell>{rowNum}</TableCell>
                            <TableCell>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                {studentName}
                              </Typography>
                              {acc.whatsapp && (
                                <Typography variant="caption" color="text.secondary">
                                  WA: {acc.whatsapp}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                                  {acc.username}
                                </Typography>
                                <IconButton size="small" onClick={() => handleCopy(`siswa-u-${acc.id}`, acc.username)}>
                                  <ContentCopyIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Chip label={studentClass} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'secondary.main', fontWeight: 600 }}>
                                  {isPassVisible ? (plainPass || '••••••••') : '••••••••'}
                                </Typography>
                                <IconButton
                                  size="small"
                                  onClick={() => setVisibleSiswaPasswords(prev => ({ ...prev, [acc.id]: !prev[acc.id] }))}
                                  title={isPassVisible ? 'Sembunyikan password' : 'Lihat password'}
                                >
                                  {isPassVisible ? <VisibilityOffIcon sx={{ fontSize: 14 }} /> : <VisibilityIcon sx={{ fontSize: 14 }} />}
                                </IconButton>
                                {plainPass && (
                                  <IconButton size="small" onClick={() => handleCopy(`siswa-p-${acc.id}`, plainPass)} title="Salin password">
                                    <ContentCopyIcon sx={{ fontSize: 14 }} />
                                  </IconButton>
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>
                              <FormControlLabel
                                control={
                                  <Switch
                                    size="small"
                                    checked={acc.status === 'AKTIF'}
                                    onChange={() => handleToggleSiswaStatus(acc)}
                                    color="success"
                                  />
                                }
                                label={
                                  <Typography variant="caption" sx={{ fontWeight: 700, color: acc.status === 'AKTIF' ? 'success.main' : 'text.secondary' }}>
                                    {acc.status}
                                  </Typography>
                                }
                              />
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>
                              <Tooltip title="Edit Akun Siswa">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => {
                                    setEditingSiswaAccount(acc);
                                    setSiswaEditForm({
                                      username: acc.username,
                                      password: plainPass,
                                      status: acc.status
                                    });
                                    setShowSiswaEditPassword(false);
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={filteredSiswa.length}
                  page={siswaPage}
                  onPageChange={(e, newPage) => setSiswaPage(newPage)}
                  rowsPerPage={siswaRowsPerPage}
                  onRowsPerPageChange={e => {
                    setSiswaRowsPerPage(parseInt(e.target.value, 10));
                    setSiswaPage(0);
                  }}
                  rowsPerPageOptions={[10, 25, 50, 100, { label: 'Semua', value: -1 }]}
                  labelRowsPerPage="Tampilkan baris:"
                  labelDisplayedRows={({ from, to, count }) => `${from}–${to} dari ${count !== -1 ? count : `lebih dari ${to}`}`}
                />
              </Paper>
            )}
          </Box>
        )}
      </Paper>

      {/* ==================== DIALOGS ==================== */}

      {/* 1. KEPSEK PRESET GENERATOR DIALOG */}
      <Dialog
        open={kepsekPassPresetDialog}
        onClose={() => setKepsekPassPresetDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Pilih Password Kepala Sekolah</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Pilih salah satu format preset password yang diinginkan untuk akun Kepala Sekolah:
          </Typography>
          <Stack spacing={1.5}>
            {KEPSEK_PASSWORD_PRESETS.map(preset => (
              <Button
                key={preset}
                variant="outlined"
                fullWidth
                onClick={() => handleApplyKepsekPreset(preset)}
                sx={{
                  justifyContent: 'space-between',
                  py: 1.2,
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: '0.95rem'
                }}
              >
                <span>{preset}</span>
                <CheckIcon fontSize="small" />
              </Button>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setKepsekPassPresetDialog(false)}>Tutup</Button>
        </DialogActions>
      </Dialog>

      {/* 2. GURU MASS REGENERATE DIALOG */}
      <Dialog
        open={massGuruDialogOpen}
        onClose={() => setMassGuruDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Pilih Password Generator Guru</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Pilih template password massal yang akan diterapkan ke <b>seluruh {teacherAccounts.length} Akun Guru</b>:
          </Typography>
          <Stack spacing={1.5}>
            {GURU_PASSWORD_PRESETS.map(preset => (
              <Button
                key={preset}
                variant="outlined"
                fullWidth
                onClick={() => handleMassRegenerateGuru(preset)}
                sx={{
                  justifyContent: 'space-between',
                  py: 1.2,
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: '0.95rem'
                }}
              >
                <span>{preset}</span>
                <ShuffleIcon fontSize="small" />
              </Button>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMassGuruDialogOpen(false)}>Batal</Button>
        </DialogActions>
      </Dialog>

      {/* 3. SISWA MASS REGENERATE DIALOG */}
      <Dialog
        open={massSiswaDialogOpen}
        onClose={() => setMassSiswaDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Pilih Password Generator Siswa</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Pilih salah satu format preset password yang diinginkan untuk <b>seluruh {studentAccounts.length} Akun Siswa</b>:
          </Typography>
          <Stack spacing={1.5}>
            {SISWA_PASSWORD_PRESETS.map(preset => (
              <Button
                key={preset}
                variant="outlined"
                color="secondary"
                fullWidth
                onClick={() => handleMassRegenerateSiswa(preset)}
                sx={{
                  justifyContent: 'space-between',
                  py: 1.2,
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: '0.95rem'
                }}
              >
                <span>{preset}</span>
                <ShuffleIcon fontSize="small" />
              </Button>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMassSiswaDialogOpen(false)}>Batal</Button>
        </DialogActions>
      </Dialog>

      {/* 4. EDIT GURU DIALOG */}
      <Dialog
        open={Boolean(editingGuruAccount)}
        onClose={() => !savingGuruEdit && setEditingGuruAccount(null)}
        maxWidth="xs"
        fullWidth
      >
        <form onSubmit={handleSaveGuruEdit}>
          <DialogTitle sx={{ fontWeight: 800 }}>
            Edit Akun: {editingGuruAccount?.teacher_name || editingGuruAccount?.name}
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              <TextField
                size="small"
                label="Username Login"
                value={guruEditForm.username}
                onChange={e => setGuruEditForm({ ...guruEditForm, username: e.target.value })}
                required
              />
              <TextField
                size="small"
                type={showGuruEditPassword ? 'text' : 'password'}
                label="Password Baru (Kosongkan jika tidak diubah)"
                value={guruEditForm.password}
                onChange={e => setGuruEditForm({ ...guruEditForm, password: e.target.value })}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowGuruEditPassword(!showGuruEditPassword)}>
                          {showGuruEditPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />
              <TextField
                select
                size="small"
                label="Status Akun"
                value={guruEditForm.status}
                onChange={e => setGuruEditForm({ ...guruEditForm, status: e.target.value as any })}
              >
                <MenuItem value="AKTIF">AKTIF</MenuItem>
                <MenuItem value="NONAKTIF">NONAKTIF</MenuItem>
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setEditingGuruAccount(null)} disabled={savingGuruEdit}>
              Batal
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={savingGuruEdit}
              startIcon={savingGuruEdit ? <CircularProgress size={16} /> : <SaveIcon />}
            >
              Simpan
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 5. EDIT SISWA DIALOG */}
      <Dialog
        open={Boolean(editingSiswaAccount)}
        onClose={() => !savingSiswaEdit && setEditingSiswaAccount(null)}
        maxWidth="xs"
        fullWidth
      >
        <form onSubmit={handleSaveSiswaEdit}>
          <DialogTitle sx={{ fontWeight: 800 }}>
            Edit Akun Siswa: {editingSiswaAccount?.name || editingSiswaAccount?.student_name}
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              <TextField
                size="small"
                label="Username (NISN)"
                value={siswaEditForm.username}
                onChange={e => setSiswaEditForm({ ...siswaEditForm, username: e.target.value })}
                required
              />
              <TextField
                size="small"
                type={showSiswaEditPassword ? 'text' : 'password'}
                label="Password Baru (Kosongkan jika tidak diubah)"
                value={siswaEditForm.password}
                onChange={e => setSiswaEditForm({ ...siswaEditForm, password: e.target.value })}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowSiswaEditPassword(!showSiswaEditPassword)}>
                          {showSiswaEditPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />
              <TextField
                select
                size="small"
                label="Status Akun"
                value={siswaEditForm.status}
                onChange={e => setSiswaEditForm({ ...siswaEditForm, status: e.target.value as any })}
              >
                <MenuItem value="AKTIF">AKTIF</MenuItem>
                <MenuItem value="NONAKTIF">NONAKTIF</MenuItem>
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setEditingSiswaAccount(null)} disabled={savingSiswaEdit}>
              Batal
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={savingSiswaEdit}
              startIcon={savingSiswaEdit ? <CircularProgress size={16} /> : <SaveIcon />}
            >
              Simpan
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 6. PROGRESS DIALOG */}
      <Dialog
        open={progressDialogOpen}
        onClose={() => !isProcessing && setProgressDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Proses Sinkronisasi & Akun</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ py: 2, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>
              {progressLabel}
            </Typography>
            <LinearProgress variant="determinate" value={progressValue} sx={{ height: 10, borderRadius: 5, mb: 2 }} />
            {progressSuccessMsg && (
              <Alert severity="success" sx={{ mt: 2, textAlign: 'left' }}>
                {progressSuccessMsg}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProgressDialogOpen(false)} disabled={isProcessing}>
            Tutup
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
