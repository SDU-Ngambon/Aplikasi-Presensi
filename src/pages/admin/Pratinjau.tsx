import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Avatar,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Divider,
  CircularProgress,
  useTheme,
  alpha
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Login as LoginIcon,
  School as SchoolIcon,
  People as PeopleIcon,
  AssignmentInd as AssignmentIndIcon,
  Badge as BadgeIcon,
  Search as SearchIcon,
  Shield as ShieldIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';
import { safeStorage } from '../../safeStorage';

interface TeacherItem {
  id: string;
  name: string;
  nip?: string;
  subject?: string;
  class?: string;
  role?: string;
}

interface StudentItem {
  id: string;
  name: string;
  nisn: string;
  class: string;
}

export default function Pratinjau() {
  const theme = useTheme();
  const navigate = useNavigate();
  const isDark = theme.palette.mode === 'dark';

  const [activeTab, setActiveTab] = useState(0);
  const [impersonating, setImpersonating] = useState<string | null>(null);

  // Specific user accounts lists
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [teacherSearch, setTeacherSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  useEffect(() => {
    async function loadAccounts() {
      setLoadingUsers(true);
      try {
        const [teacherRes, studentRes] = await Promise.all([
          axios.get('/api/teachers').catch(() => ({ data: [] })),
          axios.get('/api/students').catch(() => ({ data: [] }))
        ]);
        if (Array.isArray(teacherRes.data)) {
          setTeachers(teacherRes.data);
        }
        if (Array.isArray(studentRes.data)) {
          setStudents(studentRes.data);
        }
      } catch (e) {
        console.warn('Gagal memuat akun pengguna:', e);
      } finally {
        setLoadingUsers(false);
      }
    }
    loadAccounts();
  }, []);

  const handleImpersonate = async (payload: {
    targetRole: string;
    targetId?: string;
    targetName?: string;
    targetClass?: string;
    targetSubject?: string;
  }) => {
    const key = payload.targetRole + (payload.targetId || '');
    setImpersonating(key);

    try {
      // 1. Call impersonate endpoint to get preview token & session
      const res = await axios.post('/api/admin/impersonate', payload);

      if (res.data && res.data.success) {
        // 2. Backup current admin session safely
        const currentAdminSession = {
          auth: safeStorage.getItem('auth') || 'true',
          user: safeStorage.getItem('user'),
          token: safeStorage.getItem('token'),
          admin_token: safeStorage.getItem('admin_token'),
          adminUsername: safeStorage.getItem('adminUsername')
        };
        safeStorage.setItem('admin_backup_session', JSON.stringify(currentAdminSession));

        // 3. Set preview mode flags
        safeStorage.setItem('is_preview_mode', 'true');
        safeStorage.setItem('preview_origin_role', 'admin');
        safeStorage.setItem('preview_target_info', JSON.stringify({
          name: res.data.user?.name || payload.targetName || 'User Pratinjau',
          role: res.data.role,
          class: res.data.user?.class || payload.targetClass || ''
        }));

        // 4. Set target portal authentication
        if (res.data.role === 'PIKET' || payload.targetRole === 'PIKET') {
          safeStorage.setItem('piket_auth', 'true');
          safeStorage.setItem('piket_user', JSON.stringify(res.data.user));
          if (res.data.token) {
            safeStorage.setItem('piket_token', res.data.token);
            safeStorage.setItem('token', res.data.token);
          }
        } else if (res.data.role === 'SISWA' || payload.targetRole === 'SISWA') {
          safeStorage.setItem('siswa_auth', 'true');
          safeStorage.setItem('siswa_user', JSON.stringify(res.data.user));
          if (res.data.token) {
            safeStorage.setItem('siswa_token', res.data.token);
            safeStorage.setItem('token', res.data.token);
          }
        } else {
          safeStorage.setItem('guru_auth', 'true');
          safeStorage.setItem('guru_user', JSON.stringify(res.data.user));
          if (res.data.token) {
            safeStorage.setItem('guru_token', res.data.token);
            safeStorage.setItem('token', res.data.token);
          }
        }

        // 5. Notify all listeners about preview mode change
        window.dispatchEvent(new Event('previewModeChanged'));

        // Bersihkan toast yang ada sebelumnya
        toast.dismiss();

        const toastId = 'preview-status-toast';
        toast.success(`Masuk sebagai ${res.data.user?.name || payload.targetRole} (Mode Pratinjau)`, {
          id: toastId,
          icon: '👁️',
          duration: 2200
        });

        // Safety auto-dismiss fallback jika route transition menunda timer internal
        setTimeout(() => {
          toast.dismiss(toastId);
        }, 2300);

        // 6. Redirect to portal
        navigate(res.data.redirectUrl || (res.data.role === 'PIKET' ? '/piket/dashboard' : res.data.role === 'SISWA' ? '/siswa' : '/guru/portal'));
      } else {
        toast.error(res.data?.error || 'Gagal memulai mode pratinjau');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal terhubung ke endpoint impersonasi');
    } finally {
      setImpersonating(null);
    }
  };

  // Quick Preset Roles
  const quickRolePresets = [
    {
      id: 'kepsek',
      role: 'KEPALA_SEKOLAH',
      title: 'Kepala Sekolah',
      subtitle: 'Supervisi Manajerial & Pengesahan',
      desc: 'Melihat menu Supervisi Perangkat Ajar, Validasi & Pengesahan TTD Digital, serta Monitoring Kehadiran Guru.',
      icon: SchoolIcon,
      color: '#0284c7',
      bgGrad: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
      defaultName: 'Drs. H. Mulyadi, M.Pd.',
      badges: ['Supervisi Penuh', 'Pengesahan QR', 'Monitoring Guru']
    },
    {
      id: 'kurikulum',
      role: 'WAKIL_KURIKULUM',
      title: 'Wakil Kurikulum',
      subtitle: 'Verifikasi Modul & Kebijakan',
      desc: 'Melihat menu Verifikasi Perangkat Ajar Guru, Pengaturan Instrumen Telaah, Monitoring KBM, dan Upload Perangkat.',
      icon: BadgeIcon,
      color: '#7c3aed',
      bgGrad: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
      defaultName: 'Budi Santoso, S.Kom. (Waka Kurikulum)',
      defaultSubject: 'Informatika',
      badges: ['Verifikasi Modul', 'Instrumen Telaah', 'Jadwal KBM']
    },
    {
      id: 'kesiswaan',
      role: 'WAKIL_KESISWAAN',
      title: 'Wakil Kesiswaan',
      subtitle: 'Presensi & Disiplin Siswa',
      desc: 'Melihat menu Monitoring Presensi Siswa seluruh rombel, rekap ketidakhadiran, perizinan, dan tugas mengajar guru.',
      icon: BadgeIcon,
      color: '#ea580c',
      bgGrad: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
      defaultName: 'Drs. Bambang Sudiro (Waka Kesiswaan)',
      defaultSubject: 'Pendidikan Pancasila',
      badges: ['Presensi Seluruh Siswa', 'Kedisiplinan', 'Izin Keluar']
    },
    {
      id: 'bk',
      role: 'GURU_BK',
      title: 'Guru Bimbingan Konseling (BK)',
      subtitle: 'Konseling & Presensi Siswa',
      desc: 'Melihat monitoring presensi siswa untuk konseling kehadiran, data izin siswa piket, dan akun guru.',
      icon: BadgeIcon,
      color: '#db2777',
      bgGrad: 'linear-gradient(135deg, #db2777 0%, #be185d 100%)',
      defaultName: 'Nurul Hidayah, S.Pd. (Guru BK)',
      defaultSubject: 'Bimbingan Konseling',
      badges: ['Monitoring Presensi', 'Konseling Siswa', 'Data Keterlambatan']
    },
    {
      id: 'wali-kelas',
      role: 'WALI_KELAS',
      title: 'Wali Kelas',
      subtitle: 'Presensi Siswa Kelas Binaan',
      desc: 'Melihat Menu Wali Kelas khusus untuk rombel binaan (misal X RPL 1), jurnal kelas, dan rekap izin siswa.',
      icon: PeopleIcon,
      color: '#059669',
      bgGrad: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
      defaultName: 'Siti Rahma, M.Pd. (Wali Kelas)',
      defaultClass: 'X RPL 1',
      defaultSubject: 'Matematika',
      badges: ['Menu Wali Kelas X RPL 1', 'Jurnal Kelas', 'Presensi Harian']
    },
    {
      id: 'guru-mapel',
      role: 'GURU',
      title: 'Guru Mata Pelajaran',
      subtitle: 'Pembelajaran, LMS & Asesmen',
      desc: 'Melihat seluruh 7 sub-menu Pembelajaran & Asesmen: Kelas Diampu, Materi & Tugas, Rencana Asesmen, Generator AI, Bank Soal, Rakit Ujian, dan Nilai.',
      icon: AssignmentIndIcon,
      color: '#2563eb',
      bgGrad: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
      defaultName: 'Ahmad Fauzi, S.T. (Guru Mapel)',
      defaultSubject: 'Pemrograman Web',
      badges: ['7 Menu Pembelajaran', 'Generator Soal AI', 'Presensi KBM']
    },
    {
      id: 'siswa',
      role: 'SISWA',
      title: 'Siswa (Portal Siswa)',
      subtitle: 'LMS Digital, Tugas & Ujian',
      desc: 'Melihat tampilan Portal Siswa: Dashboard, Jadwal KBM, Materi & Tugas, Asesmen Ujian, dan Transkrip Hasil Belajar.',
      icon: PeopleIcon,
      color: '#10b981',
      bgGrad: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      defaultName: 'Aditya Pratama Putra (Siswa)',
      defaultClass: 'X RPL 1',
      badges: ['Dashboard Siswa', 'Kuis & Ujian', 'Materi & Tugas']
    }
  ];

  const filteredTeachers = teachers.filter(t =>
    t.name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
    (t.subject && t.subject.toLowerCase().includes(teacherSearch.toLowerCase())) ||
    (t.class && t.class.toLowerCase().includes(teacherSearch.toLowerCase()))
  );

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.nisn.includes(studentSearch) ||
    s.class.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Page Header */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3 },
          borderRadius: 3.5,
          bgcolor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#ffffff',
          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`,
          mb: 3
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.8 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 3,
              bgcolor: alpha(theme.palette.secondary.main, 0.12),
              color: theme.palette.secondary.main,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 12px ${alpha(theme.palette.secondary.main, 0.25)}`
            }}
          >
            <VisibilityIcon sx={{ fontSize: 26 }} />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: -0.5 }}>
                Pratinjau Antarmuka & Impersonasi (Login As)
              </Typography>
              <Chip
                label="Bypass Akses Aktif"
                size="small"
                sx={{
                  fontWeight: 700,
                  fontSize: '11px',
                  bgcolor: alpha(theme.palette.secondary.main, 0.1),
                  color: theme.palette.secondary.main
                }}
              />
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.3 }}>
              Uji coba antarmuka persis seperti yang dilihat oleh pengguna tanpa memerlukan password. Selama mode pratinjau, Anda dapat kembali ke Portal Admin kapan saja melalui tombol melayang.
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Info Callout */}
      <Alert
        severity="warning"
        icon={<ShieldIcon fontSize="inherit" />}
        sx={{
          mb: 3,
          borderRadius: 3,
          bgcolor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#fffbeb',
          color: isDark ? '#fbbf24' : '#b45309',
          border: '1px solid rgba(245, 158, 11, 0.3)'
        }}
      >
        <strong>Hak Istimewa Admin pada Mode Pratinjau:</strong> Pada mode ini, Anda dapat melihat <b>seluruh menu</b> termasuk menu yang dinonaktifkan di halaman Maintenance (ditandai dengan badge abu-abu <b>"Disembunyikan"</b>) untuk memudahkan inspeksi dan pengujian antarmuka.
      </Alert>

      {/* Tabs */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3.5,
          bgcolor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#ffffff',
          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`,
          overflow: 'hidden'
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          sx={{
            px: 2,
            pt: 1,
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.9rem',
              minHeight: 52
            }
          }}
        >
          <Tab label="Pratinjau Cepat Berdasarkan Role" />
          <Tab label={`Akun Spesifik Guru (${teachers.length})`} />
          <Tab label={`Akun Spesifik Siswa (${students.length})`} />
        </Tabs>

        {/* TAB 0: QUICK ROLE PREVIEW */}
        {activeTab === 0 && (
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
              Pilih Role Untuk Pratinjau Langsung
            </Typography>

            <Grid container spacing={2.5}>
              {quickRolePresets.map((preset) => {
                const Icon = preset.icon;
                const isCurrentImpersonating = impersonating === preset.role;

                return (
                  <Grid size={{ xs: 12, md: 6, lg: 4 }} key={preset.id}>
                    <Card
                      elevation={0}
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        p: 2.5,
                        borderRadius: 3.5,
                        bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc',
                        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`,
                        transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          transform: 'translateY(-3px)',
                          boxShadow: isDark
                            ? '0 12px 28px rgba(0,0,0,0.5)'
                            : '0 12px 28px rgba(0,0,0,0.07)',
                          borderColor: alpha(preset.color, 0.5)
                        }
                      }}
                    >
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                          <Avatar
                            sx={{
                              width: 44,
                              height: 44,
                              bgcolor: preset.color,
                              color: '#ffffff',
                              boxShadow: `0 4px 12px ${alpha(preset.color, 0.35)}`
                            }}
                          >
                            <Icon fontSize="small" />
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2, color: 'text.primary' }}>
                              {preset.title}
                            </Typography>
                            <Typography variant="caption" sx={{ color: preset.color, fontWeight: 700 }}>
                              {preset.subtitle}
                            </Typography>
                          </Box>
                        </Box>

                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.84rem', lineHeight: 1.45, mb: 2 }}>
                          {preset.desc}
                        </Typography>

                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 2.5 }}>
                          {preset.badges.map((b, idx) => (
                            <Chip
                              key={idx}
                              label={b}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '10.5px',
                                fontWeight: 700,
                                bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`
                              }}
                            />
                          ))}
                        </Box>
                      </Box>

                      <Button
                        variant="contained"
                        fullWidth
                        disabled={Boolean(impersonating)}
                        startIcon={isCurrentImpersonating ? <CircularProgress size={16} color="inherit" /> : <LoginIcon />}
                        onClick={() => handleImpersonate({
                          targetRole: preset.role,
                          targetName: preset.defaultName,
                          targetClass: preset.defaultClass,
                          targetSubject: preset.defaultSubject
                        })}
                        sx={{
                          py: 1.1,
                          borderRadius: 2.5,
                          fontWeight: 800,
                          textTransform: 'none',
                          bgcolor: preset.color,
                          boxShadow: `0 6px 16px ${alpha(preset.color, 0.35)}`,
                          '&:hover': {
                            bgcolor: preset.color,
                            filter: 'brightness(0.92)'
                          }
                        }}
                      >
                        {isCurrentImpersonating ? 'Menyiapkan Sesi...' : `Masuk sebagai ${preset.title}`}
                      </Button>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}

        {/* TAB 1: SPECIFIC TEACHER ACCOUNTS */}
        {activeTab === 1 && (
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2.5 }}>
              <TextField
                size="small"
                placeholder="Cari guru berdasarkan nama atau mapel..."
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    )
                  }
                }}
                sx={{
                  width: { xs: '100%', sm: 340 },
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2.5,
                    bgcolor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#ffffff'
                  }
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Menampilkan {filteredTeachers.length} dari {teachers.length} guru
              </Typography>
            </Box>

            {loadingUsers ? (
              <Box sx={{ py: 6, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                <CircularProgress size={24} />
                <Typography variant="body2" color="text.secondary">Memuat akun guru...</Typography>
              </Box>
            ) : filteredTeachers.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Tidak ada data guru yang cocok.</Typography>
              </Box>
            ) : (
              <TableContainer sx={{ borderRadius: 3, border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}` }}>
                <Table size="medium">
                  <TableHead sx={{ bgcolor: isDark ? 'rgba(15, 23, 42, 0.5)' : '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Nama Guru</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Mata Pelajaran</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Kelas / Tugas</TableCell>
                      <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Aksi Pratinjau</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredTeachers.map((t) => {
                      const isThisLoading = impersonating === ('GURU' + t.id);
                      return (
                        <TableRow key={t.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar sx={{ width: 34, height: 34, bgcolor: theme.palette.primary.main, fontSize: 13, fontWeight: 700 }}>
                                {t.name.slice(0, 2).toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                                  {t.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  NIP: {t.nip || '-'}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {t.subject || 'Guru Mata Pelajaran'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={t.class || 'Reguler'}
                              size="small"
                              sx={{ fontWeight: 700, fontSize: '11px' }}
                            />
                          </TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>
                            <Button
                              variant="outlined"
                              size="small"
                              disabled={Boolean(impersonating)}
                              startIcon={isThisLoading ? <CircularProgress size={14} color="inherit" /> : <LoginIcon fontSize="small" />}
                              onClick={() => handleImpersonate({
                                targetRole: t.role || (t.class ? 'WALI_KELAS' : 'GURU'),
                                targetId: t.id,
                                targetName: t.name,
                                targetClass: t.class,
                                targetSubject: t.subject
                              })}
                              sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
                            >
                              Masuk sebagai Guru Ini
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {/* TAB 2: SPECIFIC STUDENT ACCOUNTS */}
        {activeTab === 2 && (
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2.5 }}>
              <TextField
                size="small"
                placeholder="Cari siswa berdasarkan nama, NISN, atau kelas..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    )
                  }
                }}
                sx={{
                  width: { xs: '100%', sm: 340 },
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2.5,
                    bgcolor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#ffffff'
                  }
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Menampilkan {filteredStudents.length} dari {students.length} siswa
              </Typography>
            </Box>

            {loadingUsers ? (
              <Box sx={{ py: 6, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                <CircularProgress size={24} />
                <Typography variant="body2" color="text.secondary">Memuat akun siswa...</Typography>
              </Box>
            ) : filteredStudents.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Tidak ada data siswa yang cocok.</Typography>
              </Box>
            ) : (
              <TableContainer sx={{ borderRadius: 3, border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}` }}>
                <Table size="medium">
                  <TableHead sx={{ bgcolor: isDark ? 'rgba(15, 23, 42, 0.5)' : '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Nama Siswa</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>NISN</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Kelas</TableCell>
                      <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Aksi Pratinjau</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredStudents.map((s) => {
                      const isThisLoading = impersonating === ('SISWA' + s.id);
                      return (
                        <TableRow key={s.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar sx={{ width: 34, height: 34, bgcolor: '#10b981', fontSize: 13, fontWeight: 700 }}>
                                {s.name.slice(0, 2).toUpperCase()}
                              </Avatar>
                              <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                                {s.name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                              {s.nisn}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={s.class}
                              size="small"
                              sx={{ fontWeight: 700, fontSize: '11px', bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}
                            />
                          </TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>
                            <Button
                              variant="outlined"
                              size="small"
                              color="success"
                              disabled={Boolean(impersonating)}
                              startIcon={isThisLoading ? <CircularProgress size={14} color="inherit" /> : <LoginIcon fontSize="small" />}
                              onClick={() => handleImpersonate({
                                targetRole: 'SISWA',
                                targetId: s.id,
                                targetName: s.name,
                                targetClass: s.class
                              })}
                              sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
                            >
                              Masuk sebagai Siswa Ini
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
}
