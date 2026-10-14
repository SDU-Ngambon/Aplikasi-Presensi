import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  MenuItem,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Autocomplete,
  IconButton,
  Tabs,
  Tab,
  Chip,
  Avatar,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Stack
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useAppTheme } from '../../contexts/ThemeModeContext';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  AddCircleOutlined as AddCircleOutlinedIcon,
  Search as SearchIcon,
  EventNote as EventNoteIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Close as CloseIcon,
  CalendarToday as CalendarTodayIcon
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

// Helper WIB Timezone (Asia/Jakarta / GMT+7)
const getWIBDateString = () => {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(new Date());
  } catch {
    return new Date().toISOString().split('T')[0];
  }
};

const formatWIBTime = (d: Date) => {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(d).replace(/\./g, ':');
  } catch {
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
};

const formatWIBDate = (d: Date) => {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(d);
  } catch {
    return d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
};

interface GuruPiketIzinSectionProps {
  currentUser: any;
  isDutyToday: boolean;
  teacherDutyInfo?: string;
  currentDayName: string;
}

export default function GuruPiketIzinSection({
  currentUser,
  isDutyToday,
  teacherDutyInfo,
  currentDayName
}: GuruPiketIzinSectionProps) {
  const theme = useTheme();
  const { preset, isDark } = useAppTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [students, setStudents] = useState<any[]>([]);
  const [izinList, setIzinList] = useState<any[]>([]);
  const [tabIndex, setTabIndex] = useState(0); // 0: Izin Hari Ini, 1: Semua Data Izin, 2: Input Izin
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'SEMUA' | 'Izin' | 'Sakit' | 'Dispensasi'>('SEMUA');
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; studentName: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State - Locked to WIB (Asia/Jakarta)
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [tanggalMulai, setTanggalMulai] = useState<string>(() => getWIBDateString());
  const [tanggalSelesai, setTanggalSelesai] = useState<string>(() => getWIBDateString());
  const [keterangan, setKeterangan] = useState('Izin');
  const [keperluanDispensasi, setKeperluanDispensasi] = useState('');
  const [hasAttendedToday, setHasAttendedToday] = useState(false);
  const [editingIzinId, setEditingIzinId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Realtime Live Clock State (Synchronized every second, locked to WIB)
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());

  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Sync realtime attendance / izin updates periodically
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchData();
    }, 60000);
    return () => clearInterval(pollInterval);
  }, []);

  const handleSyncRealtimeDate = () => {
    const nowWibStr = getWIBDateString();
    setTanggalMulai(nowWibStr);
    setTanggalSelesai(nowWibStr);
    toast.success('Waktu dan tanggal disinkronkan ke Waktu Indonesia Barat (WIB)');
  };

  const formatDateStr = (dStr: string) => {
    if (!dStr) return '';
    if (dStr.includes('T')) dStr = dStr.split('T')[0];
    const parts = dStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dStr;
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const setDurationDays = (days: number) => {
    const start = new Date(tanggalMulai || new Date());
    const end = new Date(start);
    end.setDate(start.getDate() + (days - 1));
    setTanggalSelesai(end.toISOString().split('T')[0]);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      axios.get(`/api/piket/check-attendance/${selectedStudent.nisn}`).then(res => {
        if (res.data.attended) {
          setHasAttendedToday(true);
          setKeterangan('Dispensasi');
          toast.error(`${selectedStudent.name} sudah hadir hari ini. Dialihkan ke Dispensasi.`, { duration: 3000 });
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
    setLoading(true);
    try {
      const [studentsRes, izinRes] = await Promise.all([
        axios.get('/api/students'),
        axios.get('/api/piket/izin')
      ]);

      if (Array.isArray(studentsRes.data)) {
        setStudents(studentsRes.data);
      } else if (studentsRes.data && Array.isArray(studentsRes.data.data)) {
        setStudents(studentsRes.data.data);
      }

      if (Array.isArray(izinRes.data)) {
        setIzinList(izinRes.data);
      } else if (izinRes.data && Array.isArray(izinRes.data.data)) {
        setIzinList(izinRes.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat data perizinan');
    } finally {
      setLoading(false);
    }
  };

  const normalizeDateStr = (dateVal: any) => {
    if (!dateVal) return '';
    if (typeof dateVal === 'string') {
      return dateVal.includes('T') ? dateVal.split('T')[0] : dateVal;
    }
    try {
      return new Date(dateVal).toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  // Filter Izin
  const activeIzinToday = izinList.filter(item => {
    const start = normalizeDateStr(item.tanggal_mulai || item.tanggalMulai);
    const end = normalizeDateStr(item.tanggal_selesai || item.tanggalSelesai);
    return todayStr >= start && todayStr <= end;
  });

  const displayedList = tabIndex === 0 ? activeIzinToday : izinList;

  const filteredList = displayedList.filter(item => {
    const sName = (item.student_name || item.studentName || '').toLowerCase();
    const sNisn = (item.nisn || '').toLowerCase();
    const sClass = (item.student_class || item.studentClass || '').toLowerCase();
    const term = searchTerm.toLowerCase();

    const matchesSearch = sName.includes(term) || sNisn.includes(term) || sClass.includes(term);
    const matchesStatus = statusFilter === 'SEMUA' || item.keterangan === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleEdit = (item: any) => {
    if (!canModify) {
      toast.error('Anda tidak memiliki izin untuk mengedit perizinan hari ini.');
      return;
    }
    const studentObj = students.find(s => s.nisn === item.nisn) || {
      name: item.student_name || item.studentName,
      nisn: item.nisn,
      class: item.student_class || item.studentClass
    };
    setSelectedStudent(studentObj);
    setTanggalMulai(normalizeDateStr(item.tanggal_mulai || item.tanggalMulai));
    setTanggalSelesai(normalizeDateStr(item.tanggal_selesai || item.tanggalSelesai));
    setKeterangan(item.keterangan);
    setKeperluanDispensasi(item.keperluan_dispensasi || item.keperluanDispensasi || item.keperluan || '');
    setEditingIzinId(item.id);
    setTabIndex(2);
  };

  const handleCancelEdit = () => {
    setEditingIzinId(null);
    setSelectedStudent(null);
    setTanggalMulai(todayStr);
    setTanggalSelesai(todayStr);
    setKeterangan('Izin');
    setKeperluanDispensasi('');
  };

  const executeDelete = async (id: string) => {
    try {
      await axios.delete(`/api/piket/izin/${id}`);
      toast.success('Data izin berhasil dihapus');
      setDeleteConfirm(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal menghapus izin');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModify) {
      toast.error('Akses ditolak: Anda tidak sedang bertugas piket hari ini.');
      return;
    }
    if (!selectedStudent) {
      toast.error('Silakan pilih siswa terlebih dahulu');
      return;
    }
    if (keterangan === 'Dispensasi' && !keperluanDispensasi.trim()) {
      toast.error('Keterangan / Keperluan Dispensasi wajib diisi untuk perizinan Dispensasi!');
      return;
    }
    if (!tanggalMulai || !tanggalSelesai) {
      toast.error('Rentang tanggal harus diisi lengkap');
      return;
    }
    if (tanggalSelesai < tanggalMulai) {
      toast.error('Tanggal selesai tidak boleh lebih awal dari tanggal mulai');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        nisn: selectedStudent.nisn,
        tanggalMulai,
        tanggalSelesai,
        keterangan,
        keperluan_dispensasi: keperluanDispensasi.trim(),
        guruPiketName: currentUser?.name || 'Guru Piket'
      };

      if (editingIzinId) {
        await axios.put(`/api/piket/izin/${editingIzinId}`, payload);
        toast.success('Perizinan siswa berhasil diperbarui');
      } else {
        await axios.post('/api/piket/izin', payload);
        toast.success('Perizinan siswa berhasil dicatat');
      }

      handleCancelEdit();
      setTabIndex(0);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan perizinan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusChip = (ket: string) => {
    switch (ket) {
      case 'Sakit':
        return <Chip label="Sakit" size="small" color="warning" sx={{ fontWeight: 800 }} />;
      case 'Dispensasi':
        return <Chip label="Dispensasi" size="small" color="info" sx={{ fontWeight: 800 }} />;
      case 'Izin':
      default:
        return <Chip label="Izin" size="small" color="primary" sx={{ fontWeight: 800 }} />;
    }
  };

  const isSuperAdmin = currentUser?.role === 'admin';
  const canModify = isDutyToday || isSuperAdmin;

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', p: { xs: 1, sm: 2 }, pb: { xs: 28, md: 2 } }}>
      {/* STATUS BANNER TUGAS PIKET */}
      {canModify ? (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.5, sm: 2.5 },
            mb: 2.5,
            borderRadius: 3,
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            border: `1.5px solid ${alpha(theme.palette.primary.main, 0.3)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: theme.palette.primary.main, color: '#ffffff', width: { xs: 40, sm: 48 }, height: { xs: 40, sm: 48 } }}>
              <LockOpenIcon fontSize={isMobile ? 'small' : 'medium'} />
            </Avatar>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: preset.textColorPrimary, fontSize: { xs: '0.92rem', sm: '1.05rem' } }}>
                  Akses Perizinan Terbuka Penuh
                </Typography>
                <Chip
                  label={`Bertugas: ${currentDayName}`}
                  color="primary"
                  size="small"
                  sx={{ fontWeight: 800, height: 22 }}
                />
              </Box>
              <Typography variant="body2" sx={{ color: isDark ? '#cbd5e1' : '#475569', mt: 0.3, fontSize: { xs: '0.78rem', sm: '0.85rem' } }}>
                Anda bertugas sebagai <b>{teacherDutyInfo || 'Guru Piket'}</b> hari ini. Anda dapat mencatat & mengelola perizinan siswa.
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            color="primary"
            size={isMobile ? 'small' : 'medium'}
            startIcon={<AddCircleOutlinedIcon />}
            onClick={() => {
              handleCancelEdit();
              setTabIndex(2);
            }}
            sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none', width: { xs: '100%', sm: 'auto' } }}
          >
            Catat Izin Siswa
          </Button>
        </Paper>
      ) : (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.5, sm: 2.5 },
            mb: 2.5,
            borderRadius: 3,
            bgcolor: isDark ? 'rgba(120, 53, 15, 0.35)' : '#fffbeb',
            border: `1.5px solid ${isDark ? 'rgba(245, 158, 11, 0.4)' : '#fde68a'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: '#f59e0b', color: '#ffffff', width: { xs: 40, sm: 48 }, height: { xs: 40, sm: 48 } }}>
              <LockIcon fontSize={isMobile ? 'small' : 'medium'} />
            </Avatar>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: isDark ? '#fbbf24' : '#92400e', fontSize: { xs: '0.92rem', sm: '1.05rem' } }}>
                  Akses Penginputan Perizinan Terkunci
                </Typography>
                <Chip
                  label={`Hari Ini: ${currentDayName}`}
                  size="small"
                  sx={{ bgcolor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7', color: isDark ? '#fbbf24' : '#92400e', fontWeight: 700, border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.4)' : '#fcd34d'}`, height: 22 }}
                />
              </Box>
              <Typography variant="body2" sx={{ color: isDark ? '#fbbf24' : '#b45309', mt: 0.3, fontSize: { xs: '0.78rem', sm: '0.85rem' } }}>
                Bapak/Ibu <b>{currentUser?.name}</b> tidak memiliki jadwal tugas piket pada hari <b>{currentDayName}</b>.
              </Typography>
              <Typography variant="caption" sx={{ color: isDark ? '#fde047' : '#78350f', fontWeight: 600, display: 'block', mt: 0.5 }}>
                📅 <b>Jadwal Piket Anda:</b> {teacherDutyInfo ? teacherDutyInfo : 'Belum terdaftar'} (Anda tetap dapat memantau data izin siswa).
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}

      {/* TABS MENU PIKET */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          overflow: 'hidden',
          bgcolor: isDark ? '#1e293b' : '#ffffff'
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: isDark ? '#334155' : 'divider', px: { xs: 1, sm: 2 }, pt: 1, bgcolor: isDark ? '#0f172a' : '#f8fafc' }}>
          <Tabs
            value={tabIndex}
            onChange={(_, val) => setTabIndex(val)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                fontWeight: 700,
                textTransform: 'none',
                minHeight: 44,
                fontSize: { xs: '0.8rem', sm: '0.9rem' },
                px: { xs: 1.5, sm: 2 }
              }
            }}
          >
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <span>Izin Hari Ini</span>
                  <Chip
                    label={activeIzinToday.length}
                    size="small"
                    color={activeIzinToday.length > 0 ? 'primary' : 'default'}
                    sx={{ height: 18, fontSize: '0.68rem', fontWeight: 800 }}
                  />
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <span>Semua Izin</span>
                  <Chip
                    label={izinList.length}
                    size="small"
                    sx={{ height: 18, fontSize: '0.68rem', fontWeight: 800 }}
                  />
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <span>{editingIzinId ? 'Edit Izin' : 'Input Izin'}</span>
                  {!canModify && <LockIcon sx={{ fontSize: '14px !important', color: '#94a3b8' }} />}
                </Box>
              }
            />
          </Tabs>
        </Box>

        {/* TAB 0 & 1: DAFTAR PERIZINAN */}
        {(tabIndex === 0 || tabIndex === 1) && (
          <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
            {/* Filter & Search Bar */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 1.2,
                alignItems: { xs: 'stretch', sm: 'center' },
                justifyContent: 'space-between',
                mb: 2
              }}
            >
              <TextField
                id="search-piket-student"
                size="small"
                placeholder="Cari siswa (nama, NISN, kelas)..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                sx={{ width: { xs: '100%', sm: 300 } }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                      </InputAdornment>
                    ),
                    endAdornment: searchTerm ? (
                      <IconButton size="small" onClick={() => setSearchTerm('')}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    ) : null
                  }
                }}
              />

              <Box sx={{ display: 'flex', gap: 0.8, alignItems: 'center', overflowX: 'auto', pb: { xs: 0.5, sm: 0 } }}>
                <FilterListIcon fontSize="small" sx={{ color: isDark ? '#94a3b8' : '#64748b', display: { xs: 'none', sm: 'block' } }} />
                {(['SEMUA', 'Izin', 'Sakit', 'Dispensasi'] as const).map(st => {
                  const isSelected = statusFilter === st;
                  return (
                    <Chip
                      key={st}
                      label={st}
                      size="small"
                      clickable
                      color={isSelected ? 'primary' : 'default'}
                      variant={isSelected ? 'filled' : 'outlined'}
                      onClick={() => setStatusFilter(st)}
                      sx={{
                        fontWeight: 700,
                        height: 26,
                        fontSize: '0.72rem',
                        color: isSelected ? '#ffffff' : (isDark ? '#f8fafc' : '#334155'),
                        borderColor: isSelected ? 'transparent' : (isDark ? 'rgba(255,255,255,0.25)' : '#cbd5e1'),
                        bgcolor: isSelected ? undefined : (isDark ? 'rgba(255,255,255,0.06)' : undefined)
                      }}
                    />
                  );
                })}
                <IconButton size="small" onClick={fetchData} title="Refresh Data">
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {/* List / Table Content */}
            {loading ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <CircularProgress size={32} />
                <Typography variant="body2" sx={{ color: isDark ? '#94a3b8' : '#64748b', mt: 1.5 }}>
                  Memuat data perizinan siswa...
                </Typography>
              </Box>
            ) : filteredList.length === 0 ? (
              <Box sx={{ py: 5, textAlign: 'center', bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc', borderRadius: 2, border: `1px dashed ${isDark ? '#334155' : '#cbd5e1'}` }}>
                <EventNoteIcon sx={{ fontSize: 42, color: isDark ? '#64748b' : '#cbd5e1', mb: 1 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: isDark ? '#f8fafc' : '#475569', fontSize: '0.95rem' }}>
                  Tidak ada data perizinan siswa
                </Typography>
                <Typography variant="body2" sx={{ color: isDark ? '#94a3b8' : '#64748b', mt: 0.5, fontSize: '0.8rem' }}>
                  {searchTerm || statusFilter !== 'SEMUA'
                    ? 'Tidak ditemukan siswa dengan filter saat ini.'
                    : tabIndex === 0
                    ? 'Belum ada siswa izin/sakit/dispensasi aktif hari ini.'
                    : 'Belum ada riwayat perizinan yang tercatat.'}
                </Typography>
              </Box>
            ) : isMobile ? (
              /* SMARTPHONE CARD VIEW - TOUCH OPTIMIZED */
              <Stack spacing={1.5}>
                {filteredList.map((row, idx) => {
                  const start = normalizeDateStr(row.tanggal_mulai || row.tanggalMulai);
                  const end = normalizeDateStr(row.tanggal_selesai || row.tanggalSelesai);
                  const isTodayActive = todayStr >= start && todayStr <= end;
                  const sName = row.student_name || row.studentName || 'Nama Siswa';
                  const sClass = row.student_class || row.studentClass || '-';

                  return (
                    <Card
                      key={row.id || idx}
                      variant="outlined"
                      sx={{
                        borderRadius: 2.5,
                        borderColor: isTodayActive ? alpha(theme.palette.primary.main, 0.4) : (isDark ? '#334155' : '#e2e8f0'),
                        bgcolor: isTodayActive ? (isDark ? 'rgba(16, 185, 129, 0.1)' : alpha(theme.palette.primary.main, 0.02)) : (isDark ? '#1e293b' : '#ffffff'),
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                      }}
                    >
                      <CardContent sx={{ p: 1.8, '&:last-child': { pb: 1.8 } }}>
                        {/* Header: Student Name + Status */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', fontSize: '0.95rem' }}>
                              {sName}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.3, flexWrap: 'wrap' }}>
                              <Chip
                                label={sClass}
                                size="small"
                                sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, bgcolor: isDark ? '#334155' : '#f1f5f9', color: isDark ? '#f8fafc' : '#334155' }}
                              />
                              <Typography variant="caption" sx={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                                NISN: {row.nisn}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                            {getStatusChip(row.keterangan)}
                            {isTodayActive ? (
                              <Chip
                                label="Aktif Hari Ini"
                                size="small"
                                color="success"
                                variant="outlined"
                                sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800 }}
                              />
                            ) : null}
                          </Box>
                        </Box>

                        {/* Date Range Info */}
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            mt: 1.5,
                            p: 1,
                            borderRadius: 1.5,
                            bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc',
                            border: `1px solid ${isDark ? '#334155' : '#f1f5f9'}`
                          }}
                        >
                          <CalendarTodayIcon sx={{ fontSize: 16, color: '#64748b' }} />
                          <Typography variant="caption" sx={{ color: isDark ? '#e2e8f0' : '#334155', fontWeight: 600 }}>
                            {formatDateStr(start)} s/d {formatDateStr(end)}
                          </Typography>
                          {row.guru_piket_name || row.guruPiketName ? (
                            <Typography variant="caption" sx={{ color: isDark ? '#94a3b8' : '#64748b', ml: 'auto' }}>
                              Oleh: {row.guru_piket_name || row.guruPiketName}
                            </Typography>
                          ) : null}
                        </Box>

                        {(row.keperluan_dispensasi || row.keperluanDispensasi || row.keperluan) && (
                          <Box sx={{ mt: 1, p: 1, borderRadius: 1.5, bgcolor: isDark ? 'rgba(59, 130, 246, 0.12)' : '#eff6ff', border: `1px solid ${isDark ? '#334155' : '#bfdbfe'}` }}>
                            <Typography variant="caption" sx={{ color: isDark ? '#93c5fd' : '#1e40af', fontWeight: 700, display: 'block' }}>
                              Keperluan Dispensasi:
                            </Typography>
                            <Typography variant="body2" sx={{ color: isDark ? '#f8fafc' : '#0f172a', fontSize: '0.8rem', fontWeight: 600 }}>
                              {row.keperluan_dispensasi || row.keperluanDispensasi || row.keperluan}
                            </Typography>
                          </Box>
                        )}

                        {/* Actions for Mobile */}
                        {canModify && (
                          <Box sx={{ display: 'flex', gap: 1, mt: 1.5, pt: 1, borderTop: '1px solid #f1f5f9' }}>
                            <Button
                              size="small"
                              variant="outlined"
                              color="primary"
                              fullWidth
                              startIcon={<EditIcon sx={{ fontSize: 16 }} />}
                              onClick={() => handleEdit(row)}
                              sx={{
                                py: 0.6,
                                borderRadius: 1.5,
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                textTransform: 'none'
                              }}
                            >
                              Edit Izin
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              fullWidth
                              startIcon={<DeleteIcon sx={{ fontSize: 16 }} />}
                              onClick={() =>
                                setDeleteConfirm({
                                  open: true,
                                  id: row.id,
                                  studentName: sName
                                })
                              }
                              sx={{
                                py: 0.6,
                                borderRadius: 1.5,
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                textTransform: 'none'
                              }}
                            >
                              Hapus
                            </Button>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            ) : (
              /* DESKTOP TABLE VIEW */
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: isDark ? 'rgba(30, 41, 59, 0.9)' : '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, color: isDark ? '#f8fafc' : '#475569' }}>No</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: isDark ? '#f8fafc' : '#475569' }}>Nama Siswa</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: isDark ? '#f8fafc' : '#475569' }}>NISN / Kelas</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: isDark ? '#f8fafc' : '#475569' }}>Keterangan</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: isDark ? '#f8fafc' : '#475569' }}>Rentang Tanggal</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: isDark ? '#f8fafc' : '#475569' }}>Status Hari Ini</TableCell>
                      {canModify && <TableCell align="center" sx={{ fontWeight: 800, color: isDark ? '#f8fafc' : '#475569' }}>Aksi</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredList.map((row, idx) => {
                      const start = normalizeDateStr(row.tanggal_mulai || row.tanggalMulai);
                      const end = normalizeDateStr(row.tanggal_selesai || row.tanggalSelesai);
                      const isTodayActive = todayStr >= start && todayStr <= end;

                      return (
                        <TableRow key={row.id || idx} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell sx={{ color: isDark ? '#94a3b8' : '#64748b' }}>{idx + 1}</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a' }}>
                            {row.student_name || row.studentName || 'Nama Siswa'}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: isDark ? '#e2e8f0' : '#334155' }}>
                              {row.student_class || row.studentClass || '-'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                              NISN: {row.nisn}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {getStatusChip(row.keterangan)}
                            {(row.keperluan_dispensasi || row.keperluanDispensasi || row.keperluan) && (
                              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: isDark ? '#94a3b8' : '#64748b', fontStyle: 'italic', maxWidth: 180 }}>
                                {row.keperluan_dispensasi || row.keperluanDispensasi || row.keperluan}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.82rem', color: isDark ? '#cbd5e1' : '#475569' }}>
                            {formatDateStr(start)} s/d {formatDateStr(end)}
                          </TableCell>
                          <TableCell>
                            {isTodayActive ? (
                              <Chip label="Aktif Hari Ini" size="small" color="success" variant="outlined" sx={{ fontWeight: 700 }} />
                            ) : (
                              <Chip label="Selesai / Lain Hari" size="small" sx={{ color: '#94a3b8' }} />
                            )}
                          </TableCell>
                          {canModify && (
                            <TableCell align="center">
                              <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleEdit(row)}
                                  title="Edit Izin"
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() =>
                                    setDeleteConfirm({
                                      open: true,
                                      id: row.id,
                                      studentName: row.student_name || row.studentName || 'Siswa'
                                    })
                                  }
                                  title="Hapus Izin"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Box>
        )}

        {/* TAB 2: FORM INPUT PERIZINAN */}
        {tabIndex === 2 && (
          <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
            {!canModify ? (
              <Box sx={{ py: 5, textAlign: 'center', bgcolor: isDark ? 'rgba(120, 53, 15, 0.35)' : '#fffbeb', borderRadius: 2, border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.4)' : '#fde68a'}` }}>
                <LockIcon sx={{ fontSize: 48, color: '#f59e0b', mb: 1.5 }} />
                <Typography variant="h6" sx={{ fontWeight: 800, color: isDark ? '#fbbf24' : '#92400e', fontSize: '1.05rem' }}>
                  Formulir Perizinan Siswa Terkunci
                </Typography>
                <Typography variant="body2" sx={{ color: isDark ? '#fde047' : '#78350f', maxWidth: 480, mx: 'auto', mt: 1, fontSize: '0.85rem' }}>
                  Fitur pencatatan izin hanya dapat digunakan oleh <b>Guru yang terjadwal piket pada hari ini ({currentDayName})</b>.
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.primary.main, fontWeight: 700, mt: 1.5, fontSize: '0.85rem' }}>
                  📅 Jadwal Tugas Anda: {teacherDutyInfo || 'Belum Terdaftar'}
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => setTabIndex(0)}
                  sx={{ mt: 2.5, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                >
                  Kembali ke Daftar Izin
                </Button>
              </Box>
            ) : (
              <Box>
                {/* REALTIME TIME & DATE BANNER */}
                <Paper
                  elevation={0}
                  sx={{
                    p: { xs: 1.5, sm: 2 },
                    mb: 2.5,
                    borderRadius: 2.5,
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    gap: 1.5
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        bgcolor: theme.palette.primary.main,
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '1.1rem'
                      }}
                    >
                      <CalendarTodayIcon sx={{ fontSize: 24 }} />
                    </Box>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', lineHeight: 1.2 }}>
                          {formatWIBTime(currentDateTime)} WIB
                        </Typography>
                        <Chip
                          label="WIB (GMT+7)"
                          size="small"
                          color="success"
                          sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800 }}
                        />
                      </Box>
                      <Typography variant="caption" sx={{ color: isDark ? '#cbd5e1' : '#475569', fontWeight: 600 }}>
                        {formatWIBDate(currentDateTime)}
                      </Typography>
                    </Box>
                  </Box>

                  <Stack direction="row" spacing={1} sx={{ alignSelf: { xs: 'stretch', sm: 'auto' } }}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      onClick={handleSyncRealtimeDate}
                      startIcon={<RefreshIcon />}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, flex: { xs: 1, sm: 'none' } }}
                    >
                      Set Tanggal Hari Ini
                    </Button>
                  </Stack>
                </Paper>

                <form onSubmit={handleSubmit}>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                      gap: 2.5
                    }}
                  >
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isDark ? '#f8fafc' : '#1e293b', mb: 0.8 }}>
                      1. Pilih Siswa
                    </Typography>
                    <Autocomplete
                      id="piket-select-student"
                      options={students}
                      getOptionLabel={(opt: any) => `${opt.name} (${opt.class}) - NISN: ${opt.nisn}`}
                      value={selectedStudent}
                      onChange={(_, val) => setSelectedStudent(val)}
                      disabled={Boolean(editingIzinId)}
                      renderInput={params => (
                        <TextField
                          {...params}
                          size="small"
                          placeholder="Ketik nama atau NISN siswa..."
                          helperText={
                            selectedStudent
                              ? `Siswa Terpilih: ${selectedStudent.name} (${selectedStudent.class})`
                              : 'Cari siswa yang akan diberikan keterangan izin/sakit/dispensasi'
                          }
                        />
                      )}
                    />
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isDark ? '#f8fafc' : '#1e293b', mb: 0.8 }}>
                      2. Jenis Keterangan
                    </Typography>
                    <TextField
                      id="piket-select-keterangan"
                      select
                      fullWidth
                      size="small"
                      value={keterangan}
                      onChange={e => setKeterangan(e.target.value)}
                    >
                      <MenuItem value="Izin" disabled={hasAttendedToday}>
                        Izin {hasAttendedToday ? '(Siswa sudah hadir)' : ''}
                      </MenuItem>
                      <MenuItem value="Sakit" disabled={hasAttendedToday}>
                        Sakit {hasAttendedToday ? '(Siswa sudah hadir)' : ''}
                      </MenuItem>
                      <MenuItem value="Dispensasi">
                        Dispensasi {hasAttendedToday ? '(Diizinkan karena sudah hadir)' : ''}
                      </MenuItem>
                    </TextField>
                    {hasAttendedToday && (
                      <Typography variant="caption" sx={{ color: '#d97706', fontWeight: 600, display: 'block', mt: 0.5 }}>
                        ⚠️ Siswa telah melakukan presensi hadir hari ini. Hanya dispensasi yang diizinkan.
                      </Typography>
                    )}
                  </Box>

                  {keterangan === 'Dispensasi' && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isDark ? '#f8fafc' : '#1e293b', mb: 0.8 }}>
                        Keperluan / Keterangan Dispensasi *
                      </Typography>
                      <TextField
                        id="piket-keperluan-dispensasi"
                        placeholder="Contoh: Mengikuti Lomba OSN, Tugas OSIS, Perwakilan Sekolah..."
                        fullWidth
                        size="small"
                        required
                        value={keperluanDispensasi}
                        onChange={e => setKeperluanDispensasi(e.target.value)}
                        error={!keperluanDispensasi.trim()}
                        helperText={!keperluanDispensasi.trim() ? 'Wajib diisi saat memilih perizinan Dispensasi' : 'Misal: Mengikuti Lomba OSN, Tugas OSIS'}
                      />
                    </Box>
                  )}

                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isDark ? '#f8fafc' : '#1e293b' }}>
                        3. Tanggal Mulai
                      </Typography>
                    </Box>
                    <TextField
                      id="piket-tanggal-mulai"
                      type="date"
                      fullWidth
                      size="small"
                      value={tanggalMulai}
                      onChange={e => {
                        setTanggalMulai(e.target.value);
                        if (tanggalSelesai < e.target.value) {
                          setTanggalSelesai(e.target.value);
                        }
                      }}
                    />
                  </Box>

                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isDark ? '#f8fafc' : '#1e293b' }}>
                        4. Tanggal Selesai
                      </Typography>
                      {/* Quick Presets */}
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Chip
                          label="1 Hari"
                          size="small"
                          clickable
                          onClick={() => setDurationDays(1)}
                          sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                        />
                        <Chip
                          label="2 Hari"
                          size="small"
                          clickable
                          onClick={() => setDurationDays(2)}
                          sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                        />
                        <Chip
                          label="3 Hari"
                          size="small"
                          clickable
                          onClick={() => setDurationDays(3)}
                          sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                        />
                      </Box>
                    </Box>
                    <TextField
                      id="piket-tanggal-selesai"
                      type="date"
                      fullWidth
                      size="small"
                      value={tanggalSelesai}
                      onChange={e => setTanggalSelesai(e.target.value)}
                    />
                  </Box>

                  <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' }, mt: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1.5, flexDirection: { xs: 'column', sm: 'row' } }}>
                      <Button
                        id="btn-submit-izin"
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={isSubmitting || !selectedStudent}
                        sx={{
                          fontWeight: 700,
                          borderRadius: 2,
                          textTransform: 'none',
                          px: 3,
                          py: 1.2,
                          minHeight: 44
                        }}
                      >
                        {isSubmitting ? (
                          <CircularProgress size={20} color="inherit" />
                        ) : editingIzinId ? (
                          'Simpan Perubahan Perizinan'
                        ) : (
                          'Catat Izin Siswa'
                        )}
                      </Button>
                      {editingIzinId && (
                        <Button
                          variant="outlined"
                          color="inherit"
                          onClick={handleCancelEdit}
                          sx={{ borderRadius: 2, textTransform: 'none', py: 1.2, minHeight: 44 }}
                        >
                          Batal Edit
                        </Button>
                      )}
                    </Box>
                  </Box>
                </Box>
              </form>
              </Box>
            )}
          </Box>
        )}
      </Paper>

      {/* DIALOG KONFIRMASI HAPUS */}
      <Dialog
        open={Boolean(deleteConfirm?.open)}
        onClose={() => setDeleteConfirm(null)}
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1, bgcolor: isDark ? '#1e293b' : '#ffffff' } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
          Hapus Data Perizinan?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: isDark ? '#cbd5e1' : '#475569' }}>
            Apakah Anda yakin ingin menghapus catatan izin untuk siswa <b>{deleteConfirm?.studentName}</b>? Tindakan ini tidak dapat dibatalkan.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ pb: 2, px: 2 }}>
          <Button onClick={() => setDeleteConfirm(null)} color="inherit" sx={{ fontWeight: 600 }}>
            Batal
          </Button>
          <Button
            onClick={() => deleteConfirm && executeDelete(deleteConfirm.id)}
            variant="contained"
            color="error"
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Hapus Data
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
