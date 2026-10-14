import React, { useState, useEffect, useRef } from 'react';

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import 'dayjs/locale/id';

import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Grid,
  MenuItem,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Autocomplete,
  IconButton,
  Card,
  CardContent,
  Tabs,
  Tab,
  Chip,
  Stack,
  Avatar,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import LogoutIcon from '@mui/icons-material/Logout';
import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined';
import SearchIcon from '@mui/icons-material/Search';
import EventNoteIcon from '@mui/icons-material/EventNote';
import RefreshIcon from '@mui/icons-material/Refresh';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import FilterListIcon from '@mui/icons-material/FilterList';
import PaletteIcon from '@mui/icons-material/Palette';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { safeStorage } from '../../safeStorage';
import { useAppTheme } from '../../contexts/ThemeModeContext';
import { THEME_PRESETS } from '../../theme';

export default function PiketDashboard() {
  const { preset, presetId, isDark, toggleDark, setTheme } = useAppTheme('picket');
  const [students, setStudents] = useState<any[]>([]);
  const [izinList, setIzinList] = useState<any[]>([]);
  const [tabIndex, setTabIndex] = useState(0); // 0: Hari Ini, 1: Semua Data Izin
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'SEMUA' | 'Izin' | 'Sakit' | 'Dispensasi'>('SEMUA');
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; studentName: string } | null>(null);
  
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [tanggalMulai, setTanggalMulai] = useState(dayjs().format('YYYY-MM-DD'));
  const [tanggalSelesai, setTanggalSelesai] = useState(dayjs().format('YYYY-MM-DD'));
  const [keterangan, setKeterangan] = useState('Izin');
  const [keperluanDispensasi, setKeperluanDispensasi] = useState('');
  const [hasAttendedToday, setHasAttendedToday] = useState(false);
  const [editingIzinId, setEditingIzinId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const formatDateStr = (dStr: string) => {
     if (!dStr) return '';
     if (dStr.includes('T')) dStr = dStr.split('T')[0];
     const parts = dStr.split('-');
     if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
     return dStr;
  };

  const [judulAplikasi, setJudulAplikasi] = useState('Sistem Presensi Siswa');
  const [judulPiket, setJudulPiket] = useState('Portal Guru Piket');
  const [logoBase64, setLogoBase64] = useState<string>('');
  const [activePeriod, setActivePeriod] = useState<{ tahun_ajaran: string; semester: string }>({
    tahun_ajaran: '2024/2025',
    semester: 'Ganjil'
  });

  const lastCheckRef = useRef(new Date().toISOString());

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const { data } = await axios.get('/api/attendance/latest?since=' + encodeURIComponent(lastCheckRef.current));
        if (data && data.length > 0) {
           data.forEach((att: any) => {
              toast.success(`Siswa Hadir: ${att.student_name} (${att.student_class})`, {
                 duration: 1200,
                 icon: '📢'
              });
           });
           lastCheckRef.current = new Date().toISOString();
        }
      } catch (e) {}
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (safeStorage.getItem('piket_auth') !== 'true') {
      navigate('/piket');
      return;
    }
    if (safeStorage.getItem('piket_just_logged_in') === 'true') {
      safeStorage.removeItem('piket_just_logged_in');
      const user = safeStorage.getJSON('piket_user', null);
      toast.dismiss();
      toast.success(`Berhasil masuk! Selamat bertugas, ${user?.name || 'Petugas Piket'}.`, {
        duration: 2500,
        id: 'piket-login-success'
      });
    }
    fetchData();
    fetchJudul();
  }, [navigate]);

  const fetchJudul = async () => {
    try {
      const [settingsRes, activeConfigRes] = await Promise.all([
        axios.get('/api/settings').catch(() => ({ data: {} })),
        axios.get('/api/tahun-ajaran/active-config').catch(() => ({ data: { data: {} } }))
      ]);

      const data = settingsRes.data;
      if (data) {
        if (data.judul_aplikasi || data.judulAplikasi) setJudulAplikasi(data.judul_aplikasi || data.judulAplikasi);
        if (data.judul_piket || data.judulPiket) setJudulPiket(data.judul_piket || data.judulPiket);
        if (data.logoBase64) setLogoBase64(data.logoBase64);
      }

      if (activeConfigRes.data?.data?.active_tahun_ajaran) {
        setActivePeriod({
          tahun_ajaran: activeConfigRes.data.data.active_tahun_ajaran,
          semester: activeConfigRes.data.data.active_semester || 'Ganjil'
        });
      } else if (data?.tahun_ajaran || data?.tahunAjaran) {
        setActivePeriod({
          tahun_ajaran: data.tahun_ajaran || data.tahunAjaran,
          semester: data.semester || 'Ganjil'
        });
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (selectedStudent) {
      axios.get(`/api/piket/check-attendance/${selectedStudent.nisn}`).then(res => {
        if (res.data.attended) {
          setHasAttendedToday(true);
          setKeterangan('Dispensasi');
          toast.error(`${selectedStudent.name} sudah melakukan presensi hari ini. Hanya keterangan Dispensasi yang diizinkan.`, { duration: 3500, icon: '⚠️' });
        } else {
          setHasAttendedToday(false);
          setKeterangan('Izin');
        }
      }).catch(e => console.error(e));
    } else {
      setHasAttendedToday(false);
    }
  }, [selectedStudent]);

  const fetchData = async () => {
    try {
      const [stRes, izRes] = await Promise.all([
        axios.get('/api/students'),
        axios.get('/api/piket/izin')
      ]);
      setStudents(stRes.data || []);
      setIzinList(izRes.data || []);
    } catch (e) {
      console.error(e);
      toast.error('Gagal memuat data izin siswa');
    }
  };

  const [currentUser, setCurrentUser] = useState<any>(() => {
    return safeStorage.getJSON('piket_user', null);
  });

  const handleLogout = () => {
    safeStorage.removeItem('piket_auth');
    safeStorage.removeItem('piket_user');
    toast.success('Berhasil logout dari Portal Piket', { duration: 1200 });
    navigate('/piket');
  };

  const handleEdit = (izin: any) => {
    const st = students.find((s: any) => s.nisn === izin.nisn) || {
      nisn: izin.nisn,
      name: izin.student_name || 'Siswa',
      class: izin.student_class || '-'
    };
    setSelectedStudent(st);
    
    let sTglMulai = izin.tanggal_mulai || izin.tanggalMulai || '';
    if (sTglMulai.includes('T')) sTglMulai = sTglMulai.split('T')[0];
    let sTglSelesai = izin.tanggal_selesai || izin.tanggalSelesai || '';
    if (sTglSelesai.includes('T')) sTglSelesai = sTglSelesai.split('T')[0];

    setTanggalMulai(sTglMulai || dayjs().format('YYYY-MM-DD'));
    setTanggalSelesai(sTglSelesai || dayjs().format('YYYY-MM-DD'));
    setKeterangan(izin.keterangan || 'Izin');
    setKeperluanDispensasi(izin.keperluan_dispensasi || izin.keperluanDispensasi || izin.keperluan || '');
    setEditingIzinId(izin.id);
  };

  const handleCancelEdit = () => {
    setEditingIzinId(null);
    setSelectedStudent(null);
    setTanggalMulai(dayjs().format('YYYY-MM-DD'));
    setTanggalSelesai(dayjs().format('YYYY-MM-DD'));
    setKeterangan('Izin');
    setKeperluanDispensasi('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      toast.error('Pilih siswa terlebih dahulu!');
      return;
    }
    if (keterangan === 'Dispensasi' && !keperluanDispensasi.trim()) {
      toast.error('Keterangan / Keperluan Dispensasi wajib diisi untuk perizinan Dispensasi!');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        nisn: selectedStudent.nisn,
        tanggal_mulai: tanggalMulai,
        tanggal_selesai: tanggalSelesai,
        keterangan,
        keperluan_dispensasi: keperluanDispensasi.trim()
      };

      if (editingIzinId) {
        await axios.put(`/api/piket/izin/${editingIzinId}`, payload);
        toast.success('Data izin berhasil diperbarui');
      } else {
        await axios.post('/api/piket/izin', payload);
        toast.success('Data izin berhasil ditambahkan');
      }
      
      const isForToday = todayStr >= tanggalMulai && todayStr <= tanggalSelesai;
      if (!isForToday) {
        setTabIndex(1); // Auto switch to "Semua Riwayat" tab if not for today
      }

      handleCancelEdit();
      await fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Gagal menyimpan data izin');
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeDelete = async (id: string) => {
    try {
      await axios.delete(`/api/piket/izin/${id}`);
      toast.success('Data izin berhasil dihapus');
      setDeleteConfirm(null);
      await fetchData();
    } catch (e) {
      toast.error('Gagal menghapus data');
    }
  };

  // Safe Date Normalize Helper
  const normalizeDateStr = (val: any) => {
    if (!val) return '';
    const str = String(val).trim();
    return str.includes('T') ? str.split('T')[0] : str;
  };

  // Filter izin aktif hari ini
  const todayStr = dayjs().format('YYYY-MM-DD');
  
  const activeIzinToday = izinList.filter(i => {
    const start = normalizeDateStr(i.tanggal_mulai || i.tanggalMulai);
    const end = normalizeDateStr(i.tanggal_selesai || i.tanggalSelesai);
    return todayStr >= start && todayStr <= end;
  });

  // Displayed List according to active tab, statusFilter, and search term
  const displayedList = (tabIndex === 0 ? activeIzinToday : izinList).filter(i => {
    if (statusFilter !== 'SEMUA') {
      if ((i.keterangan || '').toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
    }
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const name = (i.student_name || '').toLowerCase();
    const nisn = (i.nisn || '').toLowerCase();
    const cls = (i.student_class || '').toLowerCase();
    const ket = (i.keterangan || '').toLowerCase();
    return name.includes(term) || nisn.includes(term) || cls.includes(term) || ket.includes(term);
  });

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="id">
      <Box sx={{ minHeight: '100vh', bgcolor: 'transparent', p: { xs: 1.5, sm: 2.5, md: 3.5 } }}>
        <Box sx={{ maxWidth: 1280, mx: 'auto', display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 3 } }}>
          
          {/* Floating Glass Header */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: 2,
              bgcolor: preset.headerBg,
              backdropFilter: 'blur(16px)',
              p: { xs: 2, sm: 2.5 },
              borderRadius: { xs: 2.5, sm: 3.5 },
              border: `1px solid ${preset.headerBorder}`,
              boxShadow: preset.glassShadow
            }}
          >
             <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
               {logoBase64 ? (
                 <img src={logoBase64} alt="Logo" style={{ height: 42, width: 42, objectFit: 'contain' }} />
               ) : (
                 <Avatar sx={{ background: preset.sidebarActiveGradient, width: 42, height: 42, boxShadow: preset.accentGlow }}>
                   <EventNoteIcon sx={{ color: '#fff' }} />
                 </Avatar>
               )}
               <Box sx={{ minWidth: 0, flex: 1 }}>
                 <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: -0.5, fontSize: { xs: '1.1rem', sm: '1.25rem' }, lineHeight: 1.2, color: preset.textColorPrimary }}>
                   {judulPiket || 'Portal Guru Piket'}
                 </Typography>
                 <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, color: preset.textColorSecondary }} noWrap>
                   {judulAplikasi} • Terintegrasi Presensi Terpusat
                 </Typography>
               </Box>
             </Box>

             <Box
               sx={{
                 display: 'flex',
                 flexDirection: { xs: 'column', sm: 'row' },
                 gap: 1.2,
                 alignItems: { xs: 'stretch', sm: 'center' }
               }}
             >
                <Chip
                  icon={<CalendarTodayIcon sx={{ fontSize: '14px !important' }} />}
                  label={`T.A. ${activePeriod.tahun_ajaran} (${activePeriod.semester})`}
                  size="small"
                  sx={{
                    fontWeight: 800,
                    borderRadius: 2,
                    height: 34,
                    fontSize: '0.78rem',
                    bgcolor: isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(8, 145, 178, 0.1)',
                    color: preset.primary,
                    border: `1px solid ${preset.glassBorder}`
                  }}
                />

                {currentUser && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(241, 245, 249, 0.8)',
                      border: `1px solid ${preset.glassBorder}`,
                      px: 1.5,
                      py: 0.6,
                      borderRadius: 2.5
                    }}
                  >
                    <Avatar sx={{ background: preset.sidebarActiveGradient, width: 30, height: 30, fontSize: 13, fontWeight: 700, color: '#fff' }}>
                      {(currentUser.name || 'P').charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2, color: preset.textColorPrimary }}>
                        {currentUser.name}
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.1, color: preset.textColorSecondary, fontSize: '0.68rem' }}>
                        {currentUser.role === 'guru_piket' ? `Guru Piket (${currentUser.keterangan || 'Hari Ini'})` : 'Admin Piket'}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {/* Standard Dark / Light Mode Toggle */}
                <Tooltip title={isDark ? 'Mode Terang' : 'Mode Gelap'}>
                  <IconButton
                    onClick={() => toggleDark('picket')}
                    sx={{
                      bgcolor: isDark ? '#1e293b' : '#f1f5f9',
                      color: isDark ? '#fbbf24' : '#475569',
                      border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                      p: 1,
                      borderRadius: 2.5,
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        bgcolor: isDark ? '#334155' : '#e2e8f0'
                      },
                      '&:active': { transform: 'scale(0.95)' }
                    }}
                  >
                    {isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>

                <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={fetchData}
                    fullWidth={{ xs: true, sm: false } as any}
                    sx={{
                      borderRadius: 2,
                      minHeight: 34,
                      textTransform: 'none',
                      fontWeight: 700,
                      borderColor: preset.glassBorder,
                      color: preset.primary,
                      flex: { xs: 1, sm: 'none' }
                    }}
                  >
                     Refresh
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<LogoutIcon />}
                    onClick={handleLogout}
                    fullWidth={{ xs: true, sm: false } as any}
                    sx={{ borderRadius: 2, minHeight: 34, textTransform: 'none', fontWeight: 700, flex: { xs: 1, sm: 'none' } }}
                  >
                     Keluar
                  </Button>
                </Stack>
             </Box>
          </Box>

          {/* Bento KPI Stat Cards (Crypto Dashboard Style) */}
          <Grid container spacing={2}>
            {/* Card 1: Total Izin Hari Ini */}
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  bgcolor: preset.cardBg,
                  backdropFilter: 'blur(16px)',
                  border: `1px solid ${preset.glassBorder}`,
                  boxShadow: preset.glassShadow,
                  transition: 'all 0.2s ease',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: preset.accentGlow }
                }}
              >
                <Typography variant="caption" sx={{ color: preset.textColorSecondary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Total Hari Ini
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: preset.primary, mt: 0.5 }}>
                  {activeIzinToday.length}
                  <Typography component="span" variant="caption" sx={{ color: preset.textColorSecondary, ml: 0.5, fontWeight: 600 }}>
                    siswa
                  </Typography>
                </Typography>
                <Chip
                  size="small"
                  label="Aktif Sekarang"
                  sx={{ mt: 1, height: 20, fontSize: '0.68rem', fontWeight: 800, bgcolor: isDark ? 'rgba(6,182,212,0.15)' : 'rgba(8,145,178,0.1)', color: preset.primary }}
                />
              </Paper>
            </Grid>

            {/* Card 2: Sakit */}
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  bgcolor: preset.cardBg,
                  backdropFilter: 'blur(16px)',
                  border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)'}`,
                  boxShadow: preset.glassShadow,
                  transition: 'all 0.2s ease',
                  '&:hover': { transform: 'translateY(-2px)' }
                }}
              >
                <Typography variant="caption" sx={{ color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Sakit
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#ef4444', mt: 0.5 }}>
                  {activeIzinToday.filter(i => (i.keterangan || '').toLowerCase() === 'sakit').length}
                  <Typography component="span" variant="caption" sx={{ color: preset.textColorSecondary, ml: 0.5, fontWeight: 600 }}>
                    siswa
                  </Typography>
                </Typography>
                <Chip
                  size="small"
                  label="Surat Dokter / Ket"
                  sx={{ mt: 1, height: 20, fontSize: '0.68rem', fontWeight: 800, bgcolor: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}
                />
              </Paper>
            </Grid>

            {/* Card 3: Izin */}
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  bgcolor: preset.cardBg,
                  backdropFilter: 'blur(16px)',
                  border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.2)'}`,
                  boxShadow: preset.glassShadow,
                  transition: 'all 0.2s ease',
                  '&:hover': { transform: 'translateY(-2px)' }
                }}
              >
                <Typography variant="caption" sx={{ color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Izin
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#f59e0b', mt: 0.5 }}>
                  {activeIzinToday.filter(i => (i.keterangan || '').toLowerCase() === 'izin').length}
                  <Typography component="span" variant="caption" sx={{ color: preset.textColorSecondary, ml: 0.5, fontWeight: 600 }}>
                    siswa
                  </Typography>
                </Typography>
                <Chip
                  size="small"
                  label="Keperluan Tertentu"
                  sx={{ mt: 1, height: 20, fontSize: '0.68rem', fontWeight: 800, bgcolor: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}
                />
              </Paper>
            </Grid>

            {/* Card 4: Dispensasi */}
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  bgcolor: preset.cardBg,
                  backdropFilter: 'blur(16px)',
                  border: `1px solid ${isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)'}`,
                  boxShadow: preset.glassShadow,
                  transition: 'all 0.2s ease',
                  '&:hover': { transform: 'translateY(-2px)' }
                }}
              >
                <Typography variant="caption" sx={{ color: '#8b5cf6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Dispensasi
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#8b5cf6', mt: 0.5 }}>
                  {activeIzinToday.filter(i => (i.keterangan || '').toLowerCase() === 'dispensasi').length}
                  <Typography component="span" variant="caption" sx={{ color: preset.textColorSecondary, ml: 0.5, fontWeight: 600 }}>
                    siswa
                  </Typography>
                </Typography>
                <Chip
                  size="small"
                  label="Tugas Sekolah / Lomba"
                  sx={{ mt: 1, height: 20, fontSize: '0.68rem', fontWeight: 800, bgcolor: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}
                />
              </Paper>
            </Grid>
          </Grid>

          <Grid container spacing={{ xs: 2, sm: 3 }}>
             {/* Form Input */}
             <Grid size={{ xs: 12, md: 4.5, lg: 4 }}>
                <Paper
                  sx={{
                    p: { xs: 2, sm: 2.5 },
                    borderRadius: { xs: 2.5, sm: 3.5 },
                    bgcolor: preset.cardBg,
                    backdropFilter: 'blur(16px)',
                    border: `1px solid ${preset.glassBorder}`,
                    boxShadow: preset.glassShadow
                  }}
                >
                   <Typography
                     variant="subtitle1"
                     sx={{ mb: 2, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1, color: preset.textColorPrimary }}
                   >
                      <AddCircleOutlinedIcon color="primary" /> {editingIzinId ? 'Edit Izin / Dispensasi' : 'Input Izin Siswa'}
                   </Typography>

                   <form onSubmit={handleSubmit}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                         <Autocomplete
                            disabled={!!editingIzinId}
                            options={students}
                            getOptionLabel={(option) => `${option.name} (${option.nisn}) - ${option.class}`}
                            value={selectedStudent}
                            onChange={(e, val) => setSelectedStudent(val)}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Cari Siswa *"
                                required
                                placeholder="Ketik nama atau NISN..."
                                size="small"
                                slotProps={{
                                  inputLabel: {
                                    sx: {
                                      color: isDark ? '#cbd5e1' : '#334155',
                                      fontWeight: 600,
                                      '&.Mui-focused': { color: isDark ? '#38bdf8' : '#0284c7' }
                                    }
                                  }
                                }}
                                sx={{
                                  '& .MuiInputBase-root': {
                                    bgcolor: isDark ? 'rgba(15, 23, 42, 0.60)' : 'rgba(255, 255, 255, 0.80)',
                                    color: isDark ? '#f8fafc' : '#0f172a'
                                  },
                                  '& .MuiInputBase-input': {
                                    color: isDark ? '#f8fafc' : '#0f172a',
                                    fontWeight: 600,
                                    '&::placeholder': { color: isDark ? '#94a3b8' : '#64748b', opacity: 1 }
                                  },
                                  '& .MuiSvgIcon-root': {
                                    color: isDark ? '#cbd5e1' : '#475569'
                                  }
                                }}
                              />
                            )}
                            slotProps={{
                              listbox: {
                                style: {
                                  maxHeight: 220,
                                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                                  color: isDark ? '#f8fafc' : '#0f172a'
                                }
                              }
                            }}
                         />

                         <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                           <DatePicker
                              label="Tanggal Mulai *"
                              format="DD/MM/YYYY"
                              slotProps={{
                                textField: {
                                  required: true,
                                  fullWidth: true,
                                  size: 'small',
                                  slotProps: {
                                    inputLabel: {
                                      sx: {
                                        color: isDark ? '#cbd5e1' : '#334155',
                                        fontWeight: 600,
                                        '&.Mui-focused': { color: isDark ? '#38bdf8' : '#0284c7' }
                                      }
                                    }
                                  },
                                  sx: {
                                    '& .MuiInputBase-root': {
                                      bgcolor: isDark ? 'rgba(15, 23, 42, 0.60)' : 'rgba(255, 255, 255, 0.80)',
                                      color: isDark ? '#f8fafc' : '#0f172a'
                                    },
                                    '& .MuiInputBase-input': {
                                      color: isDark ? '#f8fafc' : '#0f172a',
                                      fontWeight: 600
                                    },
                                    '& .MuiSvgIcon-root': {
                                      color: isDark ? '#cbd5e1' : '#475569'
                                    }
                                  }
                                }
                              }}
                              value={tanggalMulai ? dayjs(tanggalMulai) : null}
                              onChange={(v: any) => v && setTanggalMulai(v.format('YYYY-MM-DD'))}
                           />
                           <DatePicker
                              label="Tanggal Selesai *"
                              format="DD/MM/YYYY"
                              slotProps={{
                                textField: {
                                  required: true,
                                  fullWidth: true,
                                  size: 'small',
                                  slotProps: {
                                    inputLabel: {
                                      sx: {
                                        color: isDark ? '#cbd5e1' : '#334155',
                                        fontWeight: 600,
                                        '&.Mui-focused': { color: isDark ? '#38bdf8' : '#0284c7' }
                                      }
                                    }
                                  },
                                  sx: {
                                    '& .MuiInputBase-root': {
                                      bgcolor: isDark ? 'rgba(15, 23, 42, 0.60)' : 'rgba(255, 255, 255, 0.80)',
                                      color: isDark ? '#f8fafc' : '#0f172a'
                                    },
                                    '& .MuiInputBase-input': {
                                      color: isDark ? '#f8fafc' : '#0f172a',
                                      fontWeight: 600
                                    },
                                    '& .MuiSvgIcon-root': {
                                      color: isDark ? '#cbd5e1' : '#475569'
                                    }
                                  }
                                }
                              }}
                              value={tanggalSelesai ? dayjs(tanggalSelesai) : null}
                              onChange={(v: any) => v && setTanggalSelesai(v.format('YYYY-MM-DD'))}
                           />
                         </Box>

                         <TextField
                            select
                            label="Keterangan Izin *"
                            required
                            fullWidth
                            size="small"
                            value={keterangan}
                            onChange={e => setKeterangan(e.target.value)}
                            slotProps={{
                              inputLabel: {
                                sx: {
                                  color: isDark ? '#cbd5e1' : '#334155',
                                  fontWeight: 600,
                                  '&.Mui-focused': { color: isDark ? '#38bdf8' : '#0284c7' }
                                }
                              }
                            }}
                            sx={{
                              '& .MuiInputBase-root': {
                                bgcolor: isDark ? 'rgba(15, 23, 42, 0.60)' : 'rgba(255, 255, 255, 0.80)'
                              },
                              '& .MuiSelect-select': {
                                color: isDark ? '#f8fafc' : '#0f172a',
                                fontWeight: 600
                              },
                              '& .MuiSvgIcon-root': {
                                color: isDark ? '#cbd5e1' : '#475569'
                              }
                            }}
                         >
                            <MenuItem value="Izin" disabled={hasAttendedToday}>Izin</MenuItem>
                            <MenuItem value="Sakit" disabled={hasAttendedToday}>Sakit</MenuItem>
                            <MenuItem value="Dispensasi">Dispensasi</MenuItem>
                         </TextField>

                         {keterangan === 'Dispensasi' && (
                            <TextField
                               label="Keterangan / Keperluan Dispensasi *"
                               placeholder="Contoh: Mengikuti Lomba OSN, Tugas OSIS, dsb..."
                               fullWidth
                               required
                               size="small"
                               value={keperluanDispensasi}
                               onChange={e => setKeperluanDispensasi(e.target.value)}
                               error={!keperluanDispensasi.trim()}
                               helperText={!keperluanDispensasi.trim() ? 'Wajib diisi saat memilih Dispensasi' : 'Misal: Mengikuti Lomba OSN, Tugas OSIS'}
                               slotProps={{
                                 inputLabel: {
                                   sx: {
                                     color: isDark ? '#cbd5e1' : '#334155',
                                     fontWeight: 600,
                                     '&.Mui-focused': { color: isDark ? '#38bdf8' : '#0284c7' }
                                   }
                                 }
                               }}
                               sx={{
                                 '& .MuiInputBase-root': {
                                   bgcolor: isDark ? 'rgba(15, 23, 42, 0.60)' : 'rgba(255, 255, 255, 0.80)'
                                 },
                                 '& .MuiInputBase-input': {
                                   color: isDark ? '#f8fafc' : '#0f172a',
                                   fontWeight: 600,
                                   '&::placeholder': { color: isDark ? '#94a3b8' : '#64748b', opacity: 1 }
                                 }
                               }}
                            />
                         )}

                         <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                            <Button
                               variant="contained"
                               type="submit"
                               size="medium"
                               disabled={isSubmitting}
                               fullWidth
                               sx={{ py: 1.2, borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
                            >
                               {isSubmitting ? 'Menyimpan...' : (editingIzinId ? 'Update Data' : 'Simpan Izin')}
                            </Button>
                            {editingIzinId && (
                               <Button
                                  variant="outlined"
                                  onClick={handleCancelEdit}
                                  size="medium"
                                  color="inherit"
                                  sx={{ py: 1.2, borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
                               >
                                  Batal
                               </Button>
                            )}
                         </Box>
                      </Box>
                   </form>
                </Paper>
             </Grid>

             {/* Table & Cards Rekap Siswa Izin */}
             <Grid size={{ xs: 12, md: 7.5, lg: 8 }}>
                <Paper
                  sx={{
                    p: { xs: 2, sm: 2.5 },
                    borderRadius: { xs: 2.5, sm: 3.5 },
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: preset.cardBg,
                    backdropFilter: 'blur(16px)',
                    border: `1px solid ${preset.glassBorder}`,
                    boxShadow: preset.glassShadow
                  }}
                >
                   {/* Header & Tabs */}
                   <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 1, mb: 1.5 }}>
                       <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: preset.textColorPrimary }}>
                             Daftar Siswa Izin & Dispensasi
                          </Typography>
                          <Typography variant="caption" sx={{ color: preset.textColorSecondary }}>
                             {tabIndex === 0 ? `Izin aktif hari ini (${dayjs().format('DD/MM/YYYY')})` : 'Seluruh riwayat izin terdaftar'}
                          </Typography>
                       </Box>
                       <Chip
                          label={tabIndex === 0 ? `${activeIzinToday.length} Izin Hari Ini` : `${izinList.length} Total Izin`}
                          color="primary"
                          size="small"
                          sx={{ fontWeight: 700 }}
                       />
                   </Box>

                   {/* Tabs (Full width on mobile) */}
                   <Box sx={{ borderBottom: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0', mb: 2 }}>
                      <Tabs
                         value={tabIndex}
                         onChange={(e, val) => setTabIndex(val)}
                         textColor="primary"
                         indicatorColor="primary"
                         variant="fullWidth"
                         sx={{
                           minHeight: 42,
                           '& .MuiTab-root': {
                             minHeight: 42,
                             py: 0.75,
                             fontSize: { xs: '0.8rem', sm: '0.875rem' },
                             fontWeight: 700,
                             textTransform: 'none',
                             color: isDark ? '#94a3b8' : preset.textColorSecondary,
                             '&.Mui-selected': {
                               color: isDark ? '#38bdf8' : preset.primary
                             }
                           }
                         }}
                      >
                         <Tab label={`Izin Hari Ini (${activeIzinToday.length})`} />
                         <Tab label={`Semua Riwayat (${izinList.length})`} />
                      </Tabs>
                   </Box>

                   {/* Search & Status Filter Chips */}
                   <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                      <TextField
                         size="small"
                         fullWidth
                         placeholder="Cari nama, kelas, NISN..."
                         value={searchTerm}
                         onChange={e => setSearchTerm(e.target.value)}
                         sx={{
                           '& .MuiInputBase-root': {
                             bgcolor: isDark ? 'rgba(15, 23, 42, 0.60)' : 'rgba(255, 255, 255, 0.80)',
                             borderRadius: 2
                           },
                           '& .MuiInputBase-input': {
                             color: isDark ? '#f8fafc' : '#0f172a',
                             fontWeight: 600,
                             '&::placeholder': { color: isDark ? '#94a3b8' : '#64748b', opacity: 1 }
                           }
                         }}
                         slotProps={{
                            input: {
                               startAdornment: (
                                  <InputAdornment position="start">
                                     <SearchIcon fontSize="small" sx={{ color: isDark ? '#cbd5e1' : '#64748b' }} />
                                  </InputAdornment>
                               ),
                               sx: { borderRadius: 2 }
                            }
                         }}
                      />

                      {/* Filter category badges */}
                      <Box sx={{ display: 'flex', gap: 0.8, overflowX: 'auto', pb: 0.5 }}>
                        {(['SEMUA', 'Izin', 'Sakit', 'Dispensasi'] as const).map(status => {
                          const isSelected = statusFilter === status;
                          return (
                            <Chip
                              key={status}
                              label={status === 'SEMUA' ? 'Semua Status' : status}
                              size="small"
                              clickable
                              onClick={() => setStatusFilter(status)}
                              color={isSelected ? 'primary' : 'default'}
                              variant={isSelected ? 'filled' : 'outlined'}
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                borderRadius: 1.5,
                                color: isSelected ? '#ffffff' : (isDark ? '#f8fafc' : preset.textColorPrimary),
                                borderColor: isSelected ? 'transparent' : (isDark ? 'rgba(255,255,255,0.25)' : '#cbd5e1'),
                                bgcolor: isSelected ? undefined : (isDark ? 'rgba(255,255,255,0.06)' : undefined)
                              }}
                            />
                          );
                        })}
                      </Box>
                   </Box>

                   {/* Mobile View: Cards */}
                   <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5 }}>
                      {displayedList.length === 0 ? (
                         <Box sx={{ textAlign: 'center', py: 4, px: 2, bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc', borderRadius: 2, border: `1px dashed ${preset.glassBorder}` }}>
                            <EventNoteIcon sx={{ fontSize: 40, color: isDark ? '#64748b' : '#94a3b8', mb: 1 }} />
                            <Typography variant="body2" sx={{ color: preset.textColorSecondary, mb: tabIndex === 0 && izinList.length > 0 ? 1.5 : 0 }}>
                               {tabIndex === 0
                                  ? (izinList.length > 0 ? 'Tidak ada siswa izin aktif untuk tanggal hari ini.' : 'Belum ada data izin yang diinputkan.')
                                  : 'Data izin tidak ditemukan.'}
                            </Typography>
                            {tabIndex === 0 && izinList.length > 0 && (
                               <Button size="small" variant="outlined" onClick={() => setTabIndex(1)} sx={{ borderRadius: 2, textTransform: 'none' }}>
                                  Lihat Semua Riwayat ({izinList.length})
                                </Button>
                            )}
                         </Box>
                      ) : (
                         displayedList.map(row => (
                            <Card
                              key={row.id}
                              variant="outlined"
                              sx={{
                                borderRadius: 2.5,
                                bgcolor: preset.cardBg,
                                borderColor: preset.glassBorder,
                                boxShadow: preset.glassShadow,
                                transition: 'all 0.15s ease-in-out',
                                '&:active': { bgcolor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc' }
                              }}
                            >
                               <CardContent sx={{ p: 1.75, pb: "14px !important" }}>
                                  {/* Student Header */}
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0, flex: 1 }}>
                                        <Avatar sx={{ background: preset.sidebarActiveGradient, width: 36, height: 36, fontWeight: 700, fontSize: 14, color: '#fff' }}>
                                          {(row.student_name || 'S').charAt(0).toUpperCase()}
                                        </Avatar>
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                           <Typography variant="subtitle2" sx={{ fontWeight: 800, color: preset.textColorPrimary, lineHeight: 1.2 }}>
                                             {row.student_name}
                                           </Typography>
                                           <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: preset.textColorSecondary }}>
                                             NISN: {row.nisn} • Kelas: <strong style={{ color: preset.primary }}>{row.student_class}</strong>
                                           </Typography>
                                        </Box>
                                     </Box>

                                     <Chip
                                        label={row.keterangan}
                                        size="small"
                                        color={row.keterangan === 'Sakit' ? 'warning' : (row.keterangan === 'Dispensasi' ? 'primary' : 'info')}
                                        sx={{ fontWeight: 800, fontSize: '0.72rem', height: 24 }}
                                     />
                                  </Box>

                                  {/* Date Range Badge */}
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 1,
                                      mt: 1.5,
                                      mb: 1.5,
                                      p: 1,
                                      bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc',
                                      borderRadius: 2,
                                      border: `1px solid ${preset.glassBorder}`
                                    }}
                                  >
                                     <CalendarTodayIcon sx={{ fontSize: 16, color: preset.textColorSecondary }} />
                                     <Box sx={{ flex: 1 }}>
                                        <Typography variant="caption" sx={{ display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 600, color: preset.textColorSecondary }}>
                                          Periode Izin
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.82rem', color: preset.textColorPrimary }}>
                                          {formatDateStr(row.tanggal_mulai || row.tanggalMulai)} s/d {formatDateStr(row.tanggal_selesai || row.tanggalSelesai)}
                                        </Typography>
                                     </Box>
                                  </Box>

                                  {(row.keperluan_dispensasi || row.keperluanDispensasi || row.keperluan) && (
                                     <Box sx={{ mb: 1.5, p: 1, bgcolor: isDark ? 'rgba(59, 130, 246, 0.12)' : '#eff6ff', borderRadius: 2, border: `1px solid ${preset.glassBorder}` }}>
                                       <Typography variant="caption" sx={{ color: isDark ? '#93c5fd' : '#1e40af', fontWeight: 700, display: 'block' }}>
                                         Keperluan Dispensasi:
                                       </Typography>
                                       <Typography variant="body2" sx={{ color: preset.textColorPrimary, fontSize: '0.8rem', fontWeight: 600 }}>
                                         {row.keperluan_dispensasi || row.keperluanDispensasi || row.keperluan}
                                       </Typography>
                                     </Box>
                                  )}

                                  {/* Action Buttons for Mobile */}
                                  <Box sx={{ display: 'flex', gap: 1 }}>
                                     <Button
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                        startIcon={<EditIcon sx={{ fontSize: 16 }} />}
                                        onClick={() => handleEdit(row)}
                                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, minHeight: 36, borderColor: preset.glassBorder, color: preset.textColorPrimary }}
                                     >
                                        Edit
                                     </Button>
                                     <Button
                                        variant="outlined"
                                        color="error"
                                        size="small"
                                        fullWidth
                                        startIcon={<DeleteIcon sx={{ fontSize: 16 }} />}
                                        onClick={() => setDeleteConfirm({ open: true, id: row.id, studentName: row.student_name })}
                                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, minHeight: 36 }}
                                     >
                                        Hapus
                                     </Button>
                                  </Box>
                               </CardContent>
                            </Card>
                         ))
                      )}
                   </Box>

                   {/* Desktop View: Table */}
                   <Box sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto', flexGrow: 1 }}>
                      <Table size="small">
                         <TableHead>
                            <TableRow sx={{ bgcolor: isDark ? 'rgba(30, 41, 59, 0.95)' : (preset.tableHeaderBg || '#f8fafc') }}>
                               <TableCell sx={{ fontWeight: 800, py: 1.5, color: isDark ? '#f8fafc' : '#0f172a' }}>Siswa</TableCell>
                               <TableCell sx={{ fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>Kelas</TableCell>
                               <TableCell sx={{ fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>Rentang Tanggal</TableCell>
                               <TableCell sx={{ fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>Keterangan</TableCell>
                               <TableCell align="right" sx={{ fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>Aksi</TableCell>
                            </TableRow>
                         </TableHead>
                         <TableBody>
                            {displayedList.length === 0 ? (
                               <TableRow>
                                  <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                                     <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                        <EventNoteIcon sx={{ fontSize: 44, color: isDark ? '#64748b' : '#94a3b8' }} />
                                        <Typography variant="body2" sx={{ fontWeight: 500, color: isDark ? '#cbd5e1' : '#475569' }}>
                                           {tabIndex === 0
                                              ? (izinList.length > 0 ? 'Tidak ada siswa yang izin aktif pada hari ini. Pilih tab "Semua Riwayat" untuk melihat izin di tanggal lain.' : 'Belum ada data izin yang tersimpan.')
                                              : 'Tidak ada data izin siswa.'}
                                        </Typography>
                                     </Box>
                                  </TableCell>
                               </TableRow>
                            ) : (
                               displayedList.map(row => (
                                  <TableRow key={row.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { bgcolor: `${preset.tableRowHover} !important` } }}>
                                     <TableCell sx={{ py: 1.5 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a' }}>{row.student_name}</Typography>
                                        <Typography variant="caption" sx={{ color: isDark ? '#94a3b8' : '#475569' }}>{row.nisn}</Typography>
                                     </TableCell>
                                     <TableCell sx={{ fontWeight: 600, color: isDark ? '#e2e8f0' : '#0f172a' }}>{row.student_class}</TableCell>
                                     <TableCell sx={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}>
                                           <span>{formatDateStr(row.tanggal_mulai || row.tanggalMulai)}</span>
                                           <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>s/d</span>
                                           <span>{formatDateStr(row.tanggal_selesai || row.tanggalSelesai)}</span>
                                        </Box>
                                     </TableCell>
                                     <TableCell>
                                        <Chip
                                           label={row.keterangan}
                                           size="small"
                                           color={row.keterangan === 'Sakit' ? 'warning' : (row.keterangan === 'Dispensasi' ? 'primary' : 'info')}
                                           sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                                        />
                                        {(row.keperluan_dispensasi || row.keperluanDispensasi || row.keperluan) && (
                                           <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: preset.textColorSecondary, fontStyle: 'italic', maxWidth: 200 }}>
                                             {row.keperluan_dispensasi || row.keperluanDispensasi || row.keperluan}
                                           </Typography>
                                        )}
                                     </TableCell>
                                     <TableCell align="right">
                                        <IconButton color="primary" size="small" onClick={() => handleEdit(row)} title="Edit Izin">
                                           <EditIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                          color="error"
                                          size="small"
                                          onClick={() => setDeleteConfirm({ open: true, id: row.id, studentName: row.student_name })}
                                          title="Hapus Izin"
                                        >
                                           <DeleteIcon fontSize="small" />
                                        </IconButton>
                                     </TableCell>
                                  </TableRow>
                               ))
                            )}
                         </TableBody>
                      </Table>
                   </Box>
                </Paper>
             </Grid>
          </Grid>
        </Box>
      </Box>

      {/* Confirmation Dialog for Deleting Izin (Safe inside iframes & mobile) */}
      <Dialog
        open={Boolean(deleteConfirm?.open)}
        onClose={() => setDeleteConfirm(null)}
        slotProps={{ paper: { sx: { borderRadius: 3, p: 0.5, maxWidth: 420 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Konfirmasi Hapus Izin</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'text.primary', fontSize: '0.95rem' }}>
            Apakah Anda yakin ingin menghapus data izin siswa <strong>{deleteConfirm?.studentName}</strong>? Tindakan ini akan mengembalikan status kehadiran ke kondisi semula.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setDeleteConfirm(null)}
            variant="outlined"
            color="inherit"
            sx={{ fontWeight: 600, borderRadius: 2, textTransform: 'none' }}
          >
            Batal
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (deleteConfirm?.id) {
                executeDelete(deleteConfirm.id);
              }
            }}
            sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
          >
            Ya, Hapus Data
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}

