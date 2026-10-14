import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Card,
  CardContent,
  Chip,
  Alert,
  Divider,
  TextField,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import axios from 'axios';
import toast from 'react-hot-toast';

// MUI Icons
import StorageIcon from '@mui/icons-material/Storage';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import SchoolIcon from '@mui/icons-material/School';
import PeopleIcon from '@mui/icons-material/People';
import AssessmentIcon from '@mui/icons-material/Assessment';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import DataObjectIcon from '@mui/icons-material/DataObject';
import ShieldIcon from '@mui/icons-material/Shield';
import FactCheckIcon from '@mui/icons-material/FactCheck';

interface DatabaseStats {
  studentsCount: number;
  teachersCount: number;
  attendanceCount: number;
  izinCount: number;
  piketSchedulesCount: number;
  teacherAccountsCount: number;
  teacherAttendanceCount?: number;
  lastUpdated: string;
}

type ActionType = 'teachers' | 'students' | 'reports' | 'teacher-reports' | 'all';

interface DeleteResult {
  title: string;
  message: string;
  items: Array<{ label: string; count: number }>;
}

export default function Database() {
  const [stats, setStats] = useState<DatabaseStats>({
    studentsCount: 0,
    teachersCount: 0,
    attendanceCount: 0,
    izinCount: 0,
    piketSchedulesCount: 0,
    teacherAccountsCount: 0,
    lastUpdated: new Date().toISOString()
  });
  const [loadingStats, setLoadingStats] = useState(false);

  // Dialog State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [confirmKeyword, setConfirmKeyword] = useState('');
  const [agreementChecked, setAgreementChecked] = useState(false);

  // Progress State
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const [progressStage, setProgressStage] = useState('');

  // Result Dialog State
  const [resultOpen, setResultOpen] = useState(false);
  const [resultData, setResultData] = useState<DeleteResult | null>(null);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await axios.get('/api/database/stats');
      if (res.data?.success && res.data?.data) {
        setStats(res.data.data);
      } else {
        const [stRes, tcRes, attRes, izRes, psRes, acRes] = await Promise.allSettled([
          axios.get('/api/students'),
          axios.get('/api/teachers'),
          axios.get('/api/attendance'),
          axios.get('/api/izin'),
          axios.get('/api/piket-schedule'),
          axios.get('/api/teacher-accounts')
        ]);
        setStats({
          studentsCount: stRes.status === 'fulfilled' && Array.isArray(stRes.value.data) ? stRes.value.data.length : 0,
          teachersCount: tcRes.status === 'fulfilled' && Array.isArray(tcRes.value.data) ? tcRes.value.data.length : 0,
          attendanceCount: attRes.status === 'fulfilled' && Array.isArray(attRes.value.data) ? attRes.value.data.length : 0,
          izinCount: izRes.status === 'fulfilled' && Array.isArray(izRes.value.data) ? izRes.value.data.length : 0,
          piketSchedulesCount: psRes.status === 'fulfilled' && psRes.value.data?.data ? psRes.value.data.data.length : 0,
          teacherAccountsCount: acRes.status === 'fulfilled' && acRes.value.data?.data ? acRes.value.data.data.length : 0,
          lastUpdated: new Date().toISOString()
        });
      }
    } catch (e) {
      console.error('Error fetching database stats:', e);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const openConfirmation = (action: ActionType) => {
    setSelectedAction(action);
    setConfirmKeyword('');
    setAgreementChecked(false);
    setConfirmOpen(true);
  };

  const getActionConfig = (action: ActionType | null) => {
    switch (action) {
      case 'teachers':
        return {
          title: 'Hapus Data Guru',
          subtitle: 'Pengosongan Data Guru, Akun Guru, dan Jadwal Piket',
          color: '#d97706',
          bgColor: '#fffbeb',
          keyword: 'HAPUS GURU',
          impact: [
            'Semua data master guru dan wali kelas akan terhapus permanen.',
            'Semua akun login guru piket dan password akan dikosongkan.',
            'Semua jadwal penugasan guru piket harian akan dihapus.',
            'Data siswa, data laporan presensi, dan pengaturan sekolah tetap aman.'
          ],
          endpoint: '/api/reset/teachers'
        };
      case 'students':
        return {
          title: 'Hapus Data Siswa',
          subtitle: 'Pengosongan Data Siswa & Rombel Kelas',
          color: '#ea580c',
          bgColor: '#fff7ed',
          keyword: 'HAPUS SISWA',
          impact: [
            'Seluruh data induk siswa di semua kelas/tingkat akan dihapus.',
            'Data riwayat presensi kehadiran dan perizinan siswa akan dibersihkan.',
            'File foto dan barcode/QR Code siswa akan dikosongkan.',
            'Data guru dan akun admin tetap aman tersimpan.'
          ],
          endpoint: '/api/reset/students'
        };
      case 'reports':
        return {
          title: 'Hapus Data Laporan Siswa',
          subtitle: 'Pengosongan Riwayat Presensi & Izin Siswa',
          color: '#2563eb',
          bgColor: '#eff6ff',
          keyword: 'HAPUS LAPORAN SISWA',
          impact: [
            'Seluruh log presensi kehadiran siswa (masuk & pulang) akan dikosongkan.',
            'Seluruh data pengajuan izin, sakit, dan dispensasi siswa akan dihapus.',
            'Master data profil siswa dan guru TIDAK akan terhapus.',
            'Struktur kelas dan akun login tetap utuh dan aman.'
          ],
          endpoint: '/api/reset/reports'
        };
      case 'teacher-reports':
        return {
          title: 'Hapus Data Laporan Kehadiran Guru',
          subtitle: 'Pengosongan Riwayat Rekaman Kehadiran KBM Guru',
          color: '#0d9488',
          bgColor: '#f0fdfa',
          keyword: 'HAPUS LAPORAN GURU',
          impact: [
            'Seluruh log dan riwayat rekaman kehadiran KBM guru akan dikosongkan.',
            'Seluruh data verifikasi siswa dan ringkasan JP kehadiran guru akan dihapus.',
            'Master data guru, akun login guru, dan jadwal KBM TIDAK akan terhapus.',
            'Struktur penugasan dan pengaturan KBM tetap utuh dan aman.'
          ],
          endpoint: '/api/reset/teacher-reports'
        };
      case 'all':
      default:
        return {
          title: 'Hapus Semua Data (Master Reset)',
          subtitle: 'Pengosongan Menyeluruh Seluruh Data Operasional',
          color: '#dc2626',
          bgColor: '#fef2f2',
          keyword: 'HAPUS SEMUA DATA',
          impact: [
            'Semua data guru, wali kelas, akun guru, dan jadwal piket akan terhapus.',
            'Semua data siswa di seluruh kelas rombel akan dihapus.',
            'Seluruh riwayat presensi harian dan izin siswa akan dikosongkan.',
            'Pengaturan sistem (Logo, Nama Sekolah, API WhatsApp, Akun Admin) tetap dipertahankan.'
          ],
          endpoint: '/api/reset/all'
        };
    }
  };

  const handleExecuteDelete = async () => {
    if (!selectedAction) return;
    const config = getActionConfig(selectedAction);

    setConfirmOpen(false);
    setIsProcessing(true);
    setProgressValue(15);
    setProgressStage('Menghubungkan ke server database...');

    try {
      await new Promise(r => setTimeout(r, 400));
      setProgressValue(40);
      setProgressStage('Memverifikasi integritas data & menghapus catatan tabel...');

      const res = await axios.post(config.endpoint);

      setProgressValue(75);
      setProgressStage('Menyinkronkan penyimpanan dan membersihkan cache...');
      await new Promise(r => setTimeout(r, 450));

      setProgressValue(100);
      setProgressStage('Selesai! Data berhasil diperbarui.');
      await new Promise(r => setTimeout(r, 300));

      setIsProcessing(false);

      let items: Array<{ label: string; count: number }> = [];
      const details = res.data?.details || {};

      if (selectedAction === 'teachers') {
        items = [
          { label: 'Data Guru / Wali Kelas', count: details.deletedTeachers || stats.teachersCount },
          { label: 'Akun Login Guru Piket', count: details.deletedAccounts || stats.teacherAccountsCount },
          { label: 'Jadwal Tugas Guru Piket', count: details.deletedSchedules || stats.piketSchedulesCount }
        ];
      } else if (selectedAction === 'students') {
        items = [
          { label: 'Data Induk Siswa', count: details.deletedStudents || stats.studentsCount },
          { label: 'Log Riwayat Presensi Terkait', count: details.deletedAttendance || stats.attendanceCount },
          { label: 'Data Izin & Sakit Terkait', count: details.deletedIzin || stats.izinCount }
        ];
      } else if (selectedAction === 'reports') {
        items = [
          { label: 'Riwayat Presensi Kehadiran Siswa', count: details.deletedAttendance || stats.attendanceCount },
          { label: 'Riwayat Izin, Sakit & Dispensasi Siswa', count: details.deletedIzin || stats.izinCount }
        ];
      } else if (selectedAction === 'teacher-reports') {
        items = [
          { label: 'Riwayat Kehadiran KBM Guru', count: details.deletedTeacherAttendance || stats.teacherAttendanceCount || 0 }
        ];
      } else if (selectedAction === 'all') {
        items = [
          { label: 'Data Guru & Wali Kelas', count: details.teachers || stats.teachersCount },
          { label: 'Data Siswa', count: details.students || stats.studentsCount },
          { label: 'Riwayat Presensi', count: details.attendance || stats.attendanceCount },
          { label: 'Riwayat Izin & Sakit', count: details.izin || stats.izinCount },
          { label: 'Jadwal Piket & Akun Guru', count: details.piket_schedules || stats.piketSchedulesCount }
        ];
      }

      setResultData({
        title: `Proses ${config.title} Berhasil`,
        message: res.data?.message || `Operasi pembersihan data ${config.title.toLowerCase()} telah selesai dilaksanakan.`,
        items
      });
      setResultOpen(true);
      toast.success(`${config.title} berhasil dilaksanakan!`, { duration: 4000 });

      fetchStats();
    } catch (err: any) {
      console.error('Delete error:', err);
      setIsProcessing(false);
      const errMsg = err.response?.data?.error || err.message || 'Terjadi kesalahan saat memproses data';
      toast.error(`Gagal: ${errMsg}`);
    }
  };

  const actionCfg = getActionConfig(selectedAction);
  const isKeywordValid = confirmKeyword.trim().toUpperCase() === (actionCfg?.keyword || '').toUpperCase();
  const canProceed = isKeywordValid && agreementChecked;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      {/* Header Banner */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#ffffff',
          boxShadow: '0 4px 20px -5px rgba(15, 23, 42, 0.4)'
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
          <Box>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.5 }}>
              <StorageIcon sx={{ fontSize: 28, color: '#38bdf8' }} />
              <Typography variant="h5" component="div" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
                Manajemen Database
              </Typography>
              <Chip label="PostgreSQL & Cloud" size="small" sx={{ bgcolor: 'rgba(56, 189, 248, 0.18)', color: '#38bdf8', fontWeight: 600 }} />
            </Stack>
            <Typography variant="body2" sx={{ color: '#94a3b8', maxWidth: 650 }}>
              Pusat kendali pembersihan, reset data terstruktur, pencadangan (backup), dan pemeliharaan basis data sistem presensi.
            </Typography>
          </Box>
          <Box sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}>
            <Button
              variant="outlined"
              size="small"
              onClick={fetchStats}
              disabled={loadingStats}
              startIcon={<RefreshIcon className={loadingStats ? 'animate-spin' : ''} />}
              sx={{
                color: '#ffffff',
                borderColor: 'rgba(255, 255, 255, 0.25)',
                '&:hover': { borderColor: '#ffffff', bgcolor: 'rgba(255, 255, 255, 0.08)' },
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              Segarkan Status
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Database Live Stats Grid */}
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Statistik Data Aktif Saat Ini
      </Typography>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(5, 1fr)' }, gap: 2, mb: 4 }}>
        <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2.5, bgcolor: '#ffffff', p: 0.5 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Data Guru & Staf
                </Typography>
                <Typography variant="h4" component="div" sx={{ fontWeight: 800, color: '#0f172a', mt: 0.5 }}>
                  {loadingStats ? '-' : stats.teachersCount}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  {stats.teacherAccountsCount} Akun • {stats.piketSchedulesCount} Piket
                </Typography>
              </Box>
              <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PeopleIcon sx={{ color: '#d97706' }} />
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2.5, bgcolor: '#ffffff', p: 0.5 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Data Siswa
                </Typography>
                <Typography variant="h4" component="div" sx={{ fontWeight: 800, color: '#0f172a', mt: 0.5 }}>
                  {loadingStats ? '-' : stats.studentsCount}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Siswa terdaftar aktif
                </Typography>
              </Box>
              <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SchoolIcon sx={{ color: '#ea580c' }} />
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2.5, bgcolor: '#ffffff', p: 0.5 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Laporan Siswa
                </Typography>
                <Typography variant="h4" component="div" sx={{ fontWeight: 800, color: '#0f172a', mt: 0.5 }}>
                  {loadingStats ? '-' : (stats.attendanceCount + stats.izinCount)}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  {stats.attendanceCount} Hadir • {stats.izinCount} Izin
                </Typography>
              </Box>
              <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AssessmentIcon sx={{ color: '#2563eb' }} />
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2.5, bgcolor: '#ffffff', p: 0.5 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Laporan Guru
                </Typography>
                <Typography variant="h4" component="div" sx={{ fontWeight: 800, color: '#0f172a', mt: 0.5 }}>
                  {loadingStats ? '-' : (stats.teacherAttendanceCount || 0)}
                </Typography>
                <Typography variant="caption" sx={{ color: '#0d9488', fontWeight: 600 }}>
                  Log Kehadiran KBM
                </Typography>
              </Box>
              <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: '#ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FactCheckIcon sx={{ color: '#0d9488' }} />
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2.5, bgcolor: '#ffffff', p: 0.5 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Total Rekaman
                </Typography>
                <Typography variant="h4" component="div" sx={{ fontWeight: 800, color: '#0f172a', mt: 0.5 }}>
                  {loadingStats ? '-' : (stats.studentsCount + stats.teachersCount + stats.attendanceCount + stats.izinCount + stats.piketSchedulesCount + (stats.teacherAttendanceCount || 0))}
                </Typography>
                <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 600 }}>
                  Basis Data Terkelola
                </Typography>
              </Box>
              <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldIcon sx={{ color: '#16a34a' }} />
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Main Database Action Cards (The 4 Requested Reset Features) */}
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Tindakan Pembersihan Data (Reset Database)
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5, mb: 4 }}>
        {/* 1. Hapus Data Guru */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3,
            border: '1px solid #fed7aa',
            bgcolor: '#fffdfa',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'all 0.2s',
            '&:hover': { borderColor: '#f97316', boxShadow: '0 4px 12px rgba(249, 115, 22, 0.08)' }
          }}
        >
          <Box>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5 }}>
              <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PeopleIcon sx={{ color: '#d97706', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h6" component="div" sx={{ fontWeight: 700, fontSize: '1.05rem', color: '#92400e' }}>
                  Hapus Data Guru
                </Typography>
                <Typography variant="caption" sx={{ color: '#b45309', fontWeight: 500 }}>
                  Tersimpan: {stats.teachersCount} Guru, {stats.teacherAccountsCount} Akun Guru, {stats.piketSchedulesCount} Jadwal
                </Typography>
              </Box>
            </Stack>
            <Typography variant="body2" sx={{ color: '#78350f', mb: 2, lineHeight: 1.6 }}>
              Mengosongkan seluruh master data guru dan wali kelas, seluruh akun login guru piket, serta seluruh jadwal penugasan guru piket harian.
            </Typography>
          </Box>
          <Box sx={{ pt: 1, borderTop: '1px dashed #fed7aa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ color: '#9a3412', fontWeight: 600 }}>
              Data siswa & laporan tidak terpengaruh
            </Typography>
            <Button
              variant="outlined"
              color="warning"
              onClick={() => openConfirmation('teachers')}
              startIcon={<DeleteForeverIcon />}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700,
                borderColor: '#f59e0b',
                color: '#b45309',
                '&:hover': { bgcolor: '#fef3c7', borderColor: '#d97706' }
              }}
            >
              Hapus Data Guru
            </Button>
          </Box>
        </Paper>

        {/* 2. Hapus Data Siswa */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3,
            border: '1px solid #fdba74',
            bgcolor: '#fffaf5',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'all 0.2s',
            '&:hover': { borderColor: '#ea580c', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.08)' }
          }}
        >
          <Box>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5 }}>
              <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SchoolIcon sx={{ color: '#ea580c', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h6" component="div" sx={{ fontWeight: 700, fontSize: '1.05rem', color: '#9a3412' }}>
                  Hapus Data Siswa
                </Typography>
                <Typography variant="caption" sx={{ color: '#c2410c', fontWeight: 500 }}>
                  Tersimpan: {stats.studentsCount} Siswa di database
                </Typography>
              </Box>
            </Stack>
            <Typography variant="body2" sx={{ color: '#7c2d12', mb: 2, lineHeight: 1.6 }}>
              Mengosongkan seluruh master data siswa pada semua rombongan belajar (rombel), foto siswa, barcode QR, dan riwayat presensi/izin terkait.
            </Typography>
          </Box>
          <Box sx={{ pt: 1, borderTop: '1px dashed #fdba74', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ color: '#9a3412', fontWeight: 600 }}>
              Data guru & akun admin tetap aman
            </Typography>
            <Button
              variant="outlined"
              color="warning"
              onClick={() => openConfirmation('students')}
              startIcon={<DeleteForeverIcon />}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700,
                borderColor: '#ea580c',
                color: '#c2410c',
                '&:hover': { bgcolor: '#ffedd5', borderColor: '#c2410c' }
              }}
            >
              Hapus Data Siswa
            </Button>
          </Box>
        </Paper>

        {/* 3. Hapus Data Laporan Siswa */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3,
            border: '1px solid #bfdbfe',
            bgcolor: '#f8faff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'all 0.2s',
            '&:hover': { borderColor: '#3b82f6', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.08)' }
          }}
        >
          <Box>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5 }}>
              <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AssessmentIcon sx={{ color: '#2563eb', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h6" component="div" sx={{ fontWeight: 700, fontSize: '1.05rem', color: '#1e40af' }}>
                  Hapus Data Laporan Siswa
                </Typography>
                <Typography variant="caption" sx={{ color: '#1d4ed8', fontWeight: 500 }}>
                  Tersimpan: {stats.attendanceCount} Log Presensi, {stats.izinCount} Data Izin
                </Typography>
              </Box>
            </Stack>
            <Typography variant="body2" sx={{ color: '#1e3a8a', mb: 2, lineHeight: 1.6 }}>
              Mengosongkan seluruh riwayat rekaman presensi harian siswa (hadir/terlambat/pulang) dan seluruh arsip perizinan, sakit, serta dispensasi siswa.
            </Typography>
          </Box>
          <Box sx={{ pt: 1, borderTop: '1px dashed #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ color: '#1e40af', fontWeight: 600 }}>
              Data master siswa & guru tetap tersimpan
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => openConfirmation('reports')}
              startIcon={<DeleteForeverIcon />}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700,
                borderColor: '#2563eb',
                color: '#1d4ed8',
                '&:hover': { bgcolor: '#dbeafe', borderColor: '#1d4ed8' }
              }}
            >
              Hapus Laporan Siswa
            </Button>
          </Box>
        </Paper>

        {/* 4. Hapus Data Laporan Kehadiran Guru */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3,
            border: '1px solid #99f6e4',
            bgcolor: '#f0fdfa',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'all 0.2s',
            '&:hover': { borderColor: '#0d9488', boxShadow: '0 4px 12px rgba(13, 148, 136, 0.08)' }
          }}
        >
          <Box>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5 }}>
              <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: '#ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FactCheckIcon sx={{ color: '#0d9488', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h6" component="div" sx={{ fontWeight: 700, fontSize: '1.05rem', color: '#115e59' }}>
                  Hapus Data Laporan Kehadiran Guru
                </Typography>
                <Typography variant="caption" sx={{ color: '#0f766e', fontWeight: 500 }}>
                  Tersimpan: {stats.teacherAttendanceCount || 0} Log Kehadiran KBM Guru
                </Typography>
              </Box>
            </Stack>
            <Typography variant="body2" sx={{ color: '#134e4a', mb: 2, lineHeight: 1.6 }}>
              Mengosongkan seluruh riwayat rekaman presensi KBM guru di kelas, verifikasi siswa, dan ringkasan JP kehadiran guru yang telah terkirim.
            </Typography>
          </Box>
          <Box sx={{ pt: 1, borderTop: '1px dashed #99f6e4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ color: '#0f766e', fontWeight: 600 }}>
              Master data guru & jadwal KBM tetap aman
            </Typography>
            <Button
              variant="outlined"
              onClick={() => openConfirmation('teacher-reports')}
              startIcon={<DeleteForeverIcon />}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700,
                borderColor: '#0d9488',
                color: '#0f766e',
                '&:hover': { bgcolor: '#ccfbf1', borderColor: '#0f766e' }
              }}
            >
              Hapus Laporan Guru
            </Button>
          </Box>
        </Paper>

        {/* 5. Hapus Semua Data (Master Reset) */}
        <Paper
          elevation={0}
          sx={{
            gridColumn: { xs: '1', md: '1 / -1' },
            p: 3,
            borderRadius: 3,
            border: '1px solid #fecaca',
            bgcolor: '#fffafa',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'all 0.2s',
            '&:hover': { borderColor: '#ef4444', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)' }
          }}
        >
          <Box>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5 }}>
              <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <WarningAmberIcon sx={{ color: '#dc2626', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h6" component="div" sx={{ fontWeight: 700, fontSize: '1.05rem', color: '#991b1b' }}>
                  Hapus Semua Data (Reset Total)
                </Typography>
                <Typography variant="caption" sx={{ color: '#b91c1c', fontWeight: 600 }}>
                  Operasi Menyeluruh • Sangat Kritis
                </Typography>
              </Box>
            </Stack>
            <Typography variant="body2" sx={{ color: '#7f1d1d', mb: 2, lineHeight: 1.6 }}>
              Mengosongkan seluruh data operasional sekolah (Guru, Akun Piket, Siswa, Rombel, dan Laporan Presensi/Izin). Pengaturan website dan akun admin tetap aman.
            </Typography>
          </Box>
          <Box sx={{ pt: 1, borderTop: '1px dashed #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ color: '#991b1b', fontWeight: 600 }}>
              Pengaturan sekolah & admin tetap aman
            </Typography>
            <Button
              variant="contained"
              color="error"
              onClick={() => openConfirmation('all')}
              startIcon={<DeleteForeverIcon />}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700,
                bgcolor: '#dc2626',
                '&:hover': { bgcolor: '#b91c1c' }
              }}
            >
              Hapus Semua Data
            </Button>
          </Box>
        </Paper>
      </Box>

      {/* Backup & Export Utility Section */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
          <DataObjectIcon sx={{ color: '#0284c7' }} />
          <Typography variant="h6" component="div" sx={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
            Pencadangan Data (Backup Sebelum Pembersihan)
          </Typography>
        </Stack>
        <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
          Disarankan untuk mengunduh salinan cadangan sebelum melakukan tindakan pembersihan database apa pun agar data dapat dipulihkan sewaktu-waktu.
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <Box sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                Backup Database SQL (.sql)
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Struktur tabel lengkap & data PostgreSQL
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="small"
              component="a"
              href="/api/settings/backup/sql"
              download
              startIcon={<DownloadIcon />}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' } }}
            >
              Unduh SQL
            </Button>
          </Box>

          <Box sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                Backup File & App (.zip)
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Seluruh arsip foto dan file konfigurasi
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              component="a"
              href="/api/settings/backup/zip"
              download
              startIcon={<FolderZipIcon />}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, borderColor: '#0284c7', color: '#0284c7' }}
            >
              Unduh ZIP
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Confirmation Dialog with Two-Step Verification */}
      <Dialog
        open={confirmOpen}
        onClose={() => !isProcessing && setConfirmOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: 3, p: 1 } }
        }}
      >
        <DialogTitle component="div" sx={{ pb: 1 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: actionCfg?.bgColor || '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <WarningAmberIcon sx={{ color: actionCfg?.color || '#dc2626' }} />
            </Box>
            <Box>
              <Typography variant="h6" component="div" sx={{ fontWeight: 700, color: '#0f172a' }}>
                Konfirmasi {actionCfg?.title}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                {actionCfg?.subtitle}
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <Divider sx={{ my: 1 }} />
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Peringatan Keamanan Database: Tindakan ini permanen dan tidak dapat dibatalkan secara otomatis!
            </Typography>
          </Alert>

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#334155' }}>
            Dampak Pembersihan:
          </Typography>
          <Box sx={{ mb: 3, pl: 1 }}>
            {actionCfg?.impact.map((text, idx) => (
              <Stack key={idx} direction="row" spacing={1} sx={{ alignItems: 'flex-start', mb: 0.8 }}>
                <Typography variant="body2" sx={{ color: '#dc2626', fontWeight: 700 }}>•</Typography>
                <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.875rem' }}>
                  {text}
                </Typography>
              </Stack>
            ))}
          </Box>

          <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', mb: 2.5 }}>
            <Typography variant="body2" sx={{ color: '#334155', mb: 1.5, fontSize: '0.85rem' }}>
              Ketik kata konfirmasi berikut untuk melanjutkan: <b>{actionCfg?.keyword}</b>
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder={actionCfg?.keyword}
              value={confirmKeyword}
              onChange={(e) => setConfirmKeyword(e.target.value)}
              sx={{ bgcolor: '#ffffff' }}
            />
          </Box>

          <FormControlLabel
            control={
              <Checkbox
                checked={agreementChecked}
                onChange={(e) => setAgreementChecked(e.target.checked)}
                color="error"
              />
            }
            label={
              <Typography variant="caption" sx={{ color: '#475569', fontWeight: 500 }}>
                Saya telah memahami konsekuensi penghapusan ini dan bertanggung jawab atas tindakan ini.
              </Typography>
            }
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setConfirmOpen(false)}
            color="inherit"
            disabled={isProcessing}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Batalkan
          </Button>
          <Button
            onClick={handleExecuteDelete}
            variant="contained"
            disabled={!canProceed || isProcessing}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2,
              bgcolor: actionCfg?.color || '#dc2626',
              '&:hover': { bgcolor: '#b91c1c' },
              minWidth: 150
            }}
          >
            Ya, Lakukan Pembersihan
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modern Progress Dialog */}
      <Dialog
        open={isProcessing}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: 3, p: 3, textAlign: 'center' } }
        }}
      >
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              bgcolor: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <DeleteForeverIcon sx={{ color: '#dc2626', fontSize: 32 }} />
          </Box>
        </Box>
        <Typography variant="h6" component="div" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
          Memproses Pembersihan Data...
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
          {progressStage}
        </Typography>

        <Box sx={{ width: '100%', mb: 1.5 }}>
          <LinearProgress
            variant="determinate"
            value={progressValue}
            sx={{
              height: 10,
              borderRadius: 5,
              bgcolor: '#f1f5f9',
              '& .MuiLinearProgress-bar': {
                bgcolor: '#dc2626',
                borderRadius: 5
              }
            }}
          />
        </Box>
        <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
          {progressValue}% selesai • Mohon jangan menutup halaman ini
        </Typography>
      </Dialog>

      {/* Modern Result Dialog */}
      <Dialog
        open={resultOpen}
        onClose={() => setResultOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: 3, p: 2 } }
        }}
      >
        <DialogContent sx={{ textAlign: 'center', pt: 3 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              bgcolor: '#dcfce7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2
            }}
          >
            <CheckCircleIcon sx={{ color: '#16a34a', fontSize: 40 }} />
          </Box>
          <Typography variant="h6" component="div" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
            {resultData?.title || 'Pembersihan Selesai'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
            {resultData?.message}
          </Typography>

          {resultData?.items && resultData.items.length > 0 && (
            <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', mb: 3, textAlign: 'left' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', textTransform: 'uppercase', display: 'block', mb: 1 }}>
                Rincian Data Dihapus:
              </Typography>
              <Stack spacing={1}>
                {resultData.items.map((item, idx) => (
                  <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ color: '#334155' }}>
                      {item.label}
                    </Typography>
                    <Chip
                      label={`${item.count} Data`}
                      size="small"
                      sx={{ bgcolor: '#fee2e2', color: '#991b1b', fontWeight: 700, height: 22 }}
                    />
                  </Box>
                ))}
              </Stack>
            </Paper>
          )}

          <Button
            variant="contained"
            fullWidth
            onClick={() => setResultOpen(false)}
            sx={{
              bgcolor: '#0f172a',
              '&:hover': { bgcolor: '#1e293b' },
              borderRadius: 2,
              py: 1.2,
              textTransform: 'none',
              fontWeight: 700
            }}
          >
            Tutup & Lanjutkan
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
