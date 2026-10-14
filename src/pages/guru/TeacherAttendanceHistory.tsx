import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Paper,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
  InputAdornment,
  Avatar,
  Tooltip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  History as HistoryIcon,
  CalendarMonth as CalendarMonthIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  VerifiedUser as VerifiedUserIcon,
  LocationOn as LocationOnIcon,
  GpsFixed as GpsFixedIcon,
  AccessTime as AccessTimeIcon,
  School as SchoolIcon,
  Class as ClassIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Group as GroupIcon,
  MenuBook as MenuBookIcon,
  DateRange as DateRangeIcon,
  Add as AddIcon
} from '@mui/icons-material';
import {
  CheckCircle2 as LucideCheckCircle,
  Clock as LucideClock,
  LayoutGrid as LucideLayoutGrid,
  Users as LucideUsers,
  Sparkles as LucideSparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

import { formatWIBDateDDMMYYYY, formatWIBDateIndo, getWIBDateString } from '../../timezone';
import { useAppTheme } from '../../contexts/ThemeModeContext';

interface TeacherAttendanceHistoryProps {
  teacherId: string;
  teacherName: string;
  nip?: string;
  rombels: any[];
  onSwitchToForm: () => void;
}

export default function TeacherAttendanceHistory({
  teacherId,
  teacherName,
  nip,
  rombels,
  onSwitchToForm
}: TeacherAttendanceHistoryProps) {
  const theme = useTheme();
  const { preset, isDark } = useAppTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Format YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const defaultStartDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Filter States
  const [startDate, setStartDate] = useState<string>(defaultStartDate);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [selectedRombel, setSelectedRombel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activePreset, setActivePreset] = useState<'today' | '7days' | '30days' | 'thisMonth' | 'all' | 'custom'>('7days');

  // Data States
  const [attendances, setAttendances] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Detail Modal State
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const fetchHistory = async (start = startDate, end = endDate, rombel = selectedRombel) => {
    if (!teacherId) return;
    setLoading(true);
    try {
      let url = `/api/teacher-kbm-attendance?teacher_id=${encodeURIComponent(teacherId)}`;
      if (start) url += `&startDate=${encodeURIComponent(start)}`;
      if (end) url += `&endDate=${encodeURIComponent(end)}`;
      if (rombel && rombel !== 'all') url += `&rombel_id=${encodeURIComponent(rombel)}`;

      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        setAttendances(data);
      } else {
        setAttendances([]);
      }
    } catch (e) {
      console.error('Error fetching teacher history:', e);
      toast.error('Gagal memuat riwayat pengiriman kehadiran');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(startDate, endDate, selectedRombel);
  }, [teacherId]);

  // Preset Filters
  const handleApplyPreset = (preset: 'today' | '7days' | '30days' | 'thisMonth' | 'all') => {
    setActivePreset(preset);
    const d = new Date();
    const end = todayStr;
    let start = '';

    if (preset === 'today') {
      start = todayStr;
    } else if (preset === '7days') {
      const prev = new Date();
      prev.setDate(d.getDate() - 7);
      start = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`;
    } else if (preset === '30days') {
      const prev = new Date();
      prev.setDate(d.getDate() - 30);
      start = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`;
    } else if (preset === 'thisMonth') {
      start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    } else if (preset === 'all') {
      start = '';
    }

    setStartDate(start);
    setEndDate(preset === 'all' ? '' : end);
    fetchHistory(start, preset === 'all' ? '' : end, selectedRombel);
  };

  const handleCustomFilterSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActivePreset('custom');
    fetchHistory(startDate, endDate, selectedRombel);
  };

  // Filtered by search query
  const filteredAttendances = useMemo(() => {
    if (!searchQuery.trim()) return attendances;
    const q = searchQuery.toLowerCase();
    return attendances.filter(item => {
      const subj = (item.subject || '').toLowerCase();
      const rombel = (item.rombel_id || '').toLowerCase();
      const topic = (item.topic || '').toLowerCase();
      const date = (item.date || '').toLowerCase();
      return subj.includes(q) || rombel.includes(q) || topic.includes(q) || date.includes(q);
    });
  }, [attendances, searchQuery]);

  // Summary Metrics
  const summary = useMemo(() => {
    const totalSessions = filteredAttendances.length;
    const totalJp = filteredAttendances.reduce((acc, curr) => acc + (Number(curr.total_jp) || 1), 0);
    const uniqueRombels = new Set(filteredAttendances.map(a => a.rombel_id)).size;
    const validLocationCount = filteredAttendances.filter(a => a.location_status === 'VALID').length;
    const locationAccuracyPct = totalSessions > 0 ? Math.round((validLocationCount / totalSessions) * 100) : 100;
    const totalVerifiedStudents = filteredAttendances.reduce((acc, curr) => {
      const count = Array.isArray(curr.verified_students) ? curr.verified_students.length : (curr.verification_count || 0);
      return acc + count;
    }, 0);

    return {
      totalSessions,
      totalJp,
      uniqueRombels,
      locationAccuracyPct,
      totalVerifiedStudents
    };
  }, [filteredAttendances]);

  const handleOpenDetail = (item: any) => {
    setSelectedItem(item);
    setDetailModalOpen(true);
  };

  // Helper date formatter: DD/MM/YYYY + Hari
  const formatDateIndo = (dateStr: string) => {
    if (!dateStr) return '-';
    const ddmm = formatWIBDateDDMMYYYY(dateStr);
    const textIndo = formatWIBDateIndo(dateStr);
    return ddmm ? `${ddmm} (${textIndo})` : (textIndo || dateStr);
  };

  const formatCreatedAtTime = (tsStr: string) => {
    if (!tsStr) return '';
    try {
      const d = new Date(tsStr);
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    } catch {
      return '';
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pb: { xs: 28, md: 0 } }}>
      {/* Top Banner & Action */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: 3,
          border: `1px solid ${preset.glassBorder}`,
          bgcolor: isDark ? preset.cardBg : '#ffffff',
          boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 6px 0 rgba(0,0,0,0.03)'
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <HistoryIcon color="success" />
              <Typography variant="h6" sx={{ fontWeight: 800, color: preset.textColorPrimary }}>
                Riwayat Pengiriman Kehadiran KBM
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: preset.textColorSecondary }}>
              Pantau bukti pengiriman presensi mengajar, verifikasi kartu siswa, dan status GPS Anda.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}>
            <Button
              variant="outlined"
              color="primary"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={() => fetchHistory(startDate, endDate, selectedRombel)}
              disabled={loading}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              color="success"
              size="small"
              startIcon={<AddIcon />}
              onClick={onSwitchToForm}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 2 }}
            >
              Presensi Baru
            </Button>
          </Stack>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Filter Controls */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {/* Preset Buttons */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mr: 0.5 }}>
              Rentang Cepat:
            </Typography>
            <Chip
              label="Hari Ini"
              size="small"
              onClick={() => handleApplyPreset('today')}
              color={activePreset === 'today' ? 'success' : 'default'}
              variant={activePreset === 'today' ? 'filled' : 'outlined'}
              sx={{ fontWeight: 600, cursor: 'pointer' }}
            />
            <Chip
              label="7 Hari Terakhir"
              size="small"
              onClick={() => handleApplyPreset('7days')}
              color={activePreset === '7days' ? 'success' : 'default'}
              variant={activePreset === '7days' ? 'filled' : 'outlined'}
              sx={{ fontWeight: 600, cursor: 'pointer' }}
            />
            <Chip
              label="30 Hari Terakhir"
              size="small"
              onClick={() => handleApplyPreset('30days')}
              color={activePreset === '30days' ? 'success' : 'default'}
              variant={activePreset === '30days' ? 'filled' : 'outlined'}
              sx={{ fontWeight: 600, cursor: 'pointer' }}
            />
            <Chip
              label="Bulan Ini"
              size="small"
              onClick={() => handleApplyPreset('thisMonth')}
              color={activePreset === 'thisMonth' ? 'success' : 'default'}
              variant={activePreset === 'thisMonth' ? 'filled' : 'outlined'}
              sx={{ fontWeight: 600, cursor: 'pointer' }}
            />
            <Chip
              label="Semua Data"
              size="small"
              onClick={() => handleApplyPreset('all')}
              color={activePreset === 'all' ? 'success' : 'default'}
              variant={activePreset === 'all' ? 'filled' : 'outlined'}
              sx={{ fontWeight: 600, cursor: 'pointer' }}
            />
          </Box>

          {/* Date Picker Form & Filters */}
          <Grid container spacing={1.5} sx={{ mt: 0.5, alignItems: 'center' }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Dari Tanggal"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  setActivePreset('custom');
                }}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ bgcolor: '#f8fafc', borderRadius: 1.5 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Sampai Tanggal"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                  setActivePreset('custom');
                }}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ bgcolor: '#f8fafc', borderRadius: 1.5 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Filter Rombel/Kelas</InputLabel>
                <Select
                  value={selectedRombel}
                  label="Filter Rombel/Kelas"
                  onChange={e => {
                    setSelectedRombel(e.target.value);
                    fetchHistory(startDate, endDate, e.target.value);
                  }}
                  sx={{ bgcolor: '#f8fafc', borderRadius: 1.5 }}
                >
                  <MenuItem value="all">Semua Rombel / Kelas</MenuItem>
                  {rombels.map(r => (
                    <MenuItem key={r.id || r.name} value={r.name || r.id}>
                      {r.name || r.id}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                startIcon={<FilterListIcon />}
                onClick={() => handleCustomFilterSubmit()}
                sx={{
                  py: 1,
                  borderRadius: 1.5,
                  textTransform: 'none',
                  fontWeight: 700
                }}
              >
                Terapkan Filter
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* KPI Metrics Cards (Soft 3D / Claymorphism with Desktop Hover Lift) */}
      <Grid container spacing={2}>
        {/* 1. Total Pengiriman */}
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card
            elevation={0}
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderRadius: { xs: 2.5, md: 3 },
              border: `1px solid ${isDark ? 'rgba(34, 197, 94, 0.3)' : '#bbf7d0'}`,
              background: isDark
                ? 'linear-gradient(135deg, rgba(20, 83, 45, 0.35) 0%, rgba(15, 23, 42, 0.9) 100%)'
                : 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
              boxShadow: { xs: 'none', md: '0 4px 12px -2px rgba(22,101,52,0.06)' },
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: isDark ? '#4ade80' : '#166534', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: 0.3 }}>
                Total Pengiriman
              </Typography>
              <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7', color: isDark ? '#4ade80' : '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LucideCheckCircle size={16} strokeWidth={2.4} />
              </Box>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: preset.textColorPrimary, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
              {summary.totalSessions} <Typography component="span" variant="body2" sx={{ color: preset.textColorSecondary, fontWeight: 600 }}>Sesi KBM</Typography>
            </Typography>
          </Card>
        </Grid>

        {/* 2. Total Jam Pelajaran */}
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card
            elevation={0}
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderRadius: { xs: 2.5, md: 3 },
              border: `1px solid ${isDark ? 'rgba(56, 189, 248, 0.3)' : '#bae6fd'}`,
              background: isDark
                ? 'linear-gradient(135deg, rgba(12, 74, 110, 0.35) 0%, rgba(15, 23, 42, 0.9) 100%)'
                : 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
              boxShadow: { xs: 'none', md: '0 4px 12px -2px rgba(2,132,199,0.06)' },
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: isDark ? '#38bdf8' : '#075985', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: 0.3 }}>
                Total Jam Pelajaran
              </Typography>
              <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: isDark ? 'rgba(56, 189, 248, 0.2)' : '#e0f2fe', color: isDark ? '#38bdf8' : '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LucideClock size={16} strokeWidth={2.4} />
              </Box>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: preset.textColorPrimary, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
              {summary.totalJp} <Typography component="span" variant="body2" sx={{ color: preset.textColorSecondary, fontWeight: 600 }}>JP Mengajar</Typography>
            </Typography>
          </Card>
        </Grid>

        {/* 3. Rombel Diajar */}
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card
            elevation={0}
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderRadius: { xs: 2.5, md: 3 },
              border: `1px solid ${isDark ? 'rgba(168, 85, 247, 0.3)' : '#ddd6fe'}`,
              background: isDark
                ? 'linear-gradient(135deg, rgba(91, 33, 182, 0.35) 0%, rgba(15, 23, 42, 0.9) 100%)'
                : 'linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)',
              boxShadow: { xs: 'none', md: '0 4px 12px -2px rgba(124,58,237,0.06)' },
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: isDark ? '#c084fc' : '#5b21b6', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: 0.3 }}>
                Rombel Diajar
              </Typography>
              <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: isDark ? 'rgba(168, 85, 247, 0.2)' : '#ede9fe', color: isDark ? '#c084fc' : '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LucideLayoutGrid size={16} strokeWidth={2.4} />
              </Box>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: preset.textColorPrimary, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
              {summary.uniqueRombels} <Typography component="span" variant="body2" sx={{ color: preset.textColorSecondary, fontWeight: 600 }}>Kelas</Typography>
            </Typography>
          </Card>
        </Grid>

        {/* 4. Total Siswa Verifikator */}
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card
            elevation={0}
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderRadius: { xs: 2.5, md: 3 },
              border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.3)' : '#fde68a'}`,
              background: isDark
                ? 'linear-gradient(135deg, rgba(120, 53, 15, 0.35) 0%, rgba(15, 23, 42, 0.9) 100%)'
                : 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)',
              boxShadow: { xs: 'none', md: '0 4px 12px -2px rgba(180,83,9,0.06)' },
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: isDark ? '#fbbf24' : '#92400e', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: 0.3 }}>
                Siswa Verifikator
              </Typography>
              <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7', color: isDark ? '#fbbf24' : '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LucideUsers size={16} strokeWidth={2.4} />
              </Box>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: preset.textColorPrimary, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
              {summary.totalVerifiedStudents} <Typography component="span" variant="body2" sx={{ color: preset.textColorSecondary, fontWeight: 600 }}>Scan Siswa</Typography>
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Main List & Table Content */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${preset.glassBorder}`,
          bgcolor: isDark ? preset.cardBg : '#ffffff',
          overflow: 'hidden'
        }}
      >
        {/* Search Header */}
        <Box sx={{ p: 2, bgcolor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f8fafc', borderBottom: `1px solid ${preset.glassBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
          <TextField
            size="small"
            placeholder="Cari mata pelajaran, kelas, atau topik..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            sx={{
              '& .MuiInputBase-root': {
                bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
                color: preset.textColorPrimary,
              }
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: preset.textColorSecondary }} />
                  </InputAdornment>
                ),
                sx: { borderRadius: 2, maxWidth: 360 }
              }
            }}
          />
          <Typography variant="caption" sx={{ fontWeight: 600, color: preset.textColorSecondary }}>
            Menampilkan <strong>{filteredAttendances.length}</strong> catatan pengiriman
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <CircularProgress color="success" size={36} />
            <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 600, color: preset.textColorSecondary }}>
              Memuat data riwayat presensi mengajar...
            </Typography>
          </Box>
        ) : filteredAttendances.length === 0 ? (
          <Box sx={{ py: 8, px: 3, textAlign: 'center' }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: isDark ? 'rgba(30, 41, 59, 0.8)' : '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
                color: preset.textColorSecondary
              }}
            >
              <DateRangeIcon sx={{ fontSize: 32 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: preset.textColorPrimary }}>
              Tidak Ada Riwayat Pengiriman Presensi
            </Typography>
            <Typography variant="body2" sx={{ maxWidth: 450, mx: 'auto', mt: 0.5, mb: 2.5, color: preset.textColorSecondary }}>
              {searchQuery
                ? 'Tidak ditemukan data yang cocok dengan kata kunci pencarian Anda.'
                : 'Belum ada catatan presensi KBM yang dikirimkan pada rentang tanggal yang dipilih.'}
            </Typography>
            <Button
              variant="contained"
              color="success"
              startIcon={<AddIcon />}
              onClick={onSwitchToForm}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
            >
              Kirim Presensi Mengajar Sekarang
            </Button>
          </Box>
        ) : isMobile ? (
          /* SMARTPHONE CARD VIEW */
          <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {filteredAttendances.map((item, idx) => {
              const jps = Array.isArray(item.jp_list) ? item.jp_list : [item.jp_start || 1];
              const jpText = jps.length > 0 ? `JP ${jps.join(', ')}` : `JP ${item.jp_start || 1}`;
              const verifiedStudents = Array.isArray(item.verified_students) ? item.verified_students : [];
              const countVerified = verifiedStudents.length || item.verification_count || 0;
              const isValidLoc = item.location_status === 'VALID';
              const dist = Math.round(item.location_distance || 0);

              return (
                <Card
                  key={item.id || idx}
                  variant="outlined"
                  sx={{
                    borderRadius: 2.5,
                    borderColor: '#e2e8f0',
                    bgcolor: '#ffffff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}
                >
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                          {item.subject}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CalendarMonthIcon sx={{ fontSize: 13 }} />
                          {formatDateIndo(item.date)} {item.created_at ? `• ${formatCreatedAtTime(item.created_at)}` : ''}
                        </Typography>
                      </Box>
                      <Chip
                        label={item.rombel_id}
                        size="small"
                        color="primary"
                        sx={{ fontWeight: 800, height: 24, fontSize: '0.72rem' }}
                      />
                    </Box>

                    {item.topic && (
                      <Typography variant="caption" sx={{ color: '#475569', display: 'block', mb: 1, bgcolor: '#f8fafc', p: 0.8, borderRadius: 1 }}>
                        <strong>Materi:</strong> {item.topic}
                      </Typography>
                    )}

                    <Divider sx={{ my: 1 }} />

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
                        <Chip
                          label={`${jpText} (${item.total_jp || jps.length} JP)`}
                          size="small"
                          sx={{ bgcolor: '#f1f5f9', fontWeight: 700, fontSize: '0.7rem', height: 24 }}
                        />
                        <Chip
                          icon={<LocationOnIcon sx={{ fontSize: '13px !important' }} />}
                          label={isValidLoc ? `Valid (${dist}m)` : `Luar Jangkauan (${dist}m)`}
                          size="small"
                          color={isValidLoc ? 'success' : 'warning'}
                          sx={{ fontWeight: 700, fontSize: '0.7rem', height: 24 }}
                        />
                        <Chip
                          icon={<VerifiedUserIcon sx={{ fontSize: '13px !important' }} />}
                          label={`${countVerified} Siswa`}
                          size="small"
                          color={countVerified >= 2 ? 'info' : 'default'}
                          sx={{ fontWeight: 700, fontSize: '0.7rem', height: 24 }}
                        />
                      </Box>

                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        onClick={() => handleOpenDetail(item)}
                        sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', py: 0.3, px: 1.2, borderRadius: 1.5 }}
                      >
                        Detail
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 650 }}>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>TANGGAL & WAKTU</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>KELAS / ROMBEL</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>MATA PELAJARAN & TOPIK</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>JAM PELAJARAN</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>STATUS LOKASI</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>VERIFIKASI SISWA</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>AKSI</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAttendances.map((item, idx) => {
                  const jps = Array.isArray(item.jp_list) ? item.jp_list : [item.jp_start || 1];
                  const jpText = jps.length > 0 ? `JP ${jps.join(', ')}` : `JP ${item.jp_start || 1}`;
                  const verifiedStudents = Array.isArray(item.verified_students) ? item.verified_students : [];
                  const countVerified = verifiedStudents.length || item.verification_count || 0;
                  const isValidLoc = item.location_status === 'VALID';
                  const dist = Math.round(item.location_distance || 0);

                  return (
                    <TableRow
                      key={item.id || idx}
                      hover
                      sx={{
                        '&:last-child td, &:last-child th': { border: 0 },
                        transition: 'background-color 0.15s'
                      }}
                    >
                      {/* Tanggal & Waktu */}
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                            {formatDateIndo(item.date)}
                          </Typography>
                          {item.created_at && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
                              <AccessTimeIcon sx={{ fontSize: 13 }} />
                              {formatCreatedAtTime(item.created_at)}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>

                      {/* Rombel / Kelas */}
                      <TableCell>
                        <Chip
                          label={item.rombel_id}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ fontWeight: 700, borderRadius: 1.5 }}
                        />
                      </TableCell>

                      {/* Mata Pelajaran & Topik */}
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                          {item.subject}
                        </Typography>
                        {item.topic ? (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            Topik: {item.topic}
                          </Typography>
                        ) : (
                          <Typography variant="caption" sx={{ color: '#94a3b8', fontStyle: 'italic' }}>
                            Tidak ada catatan topik
                          </Typography>
                        )}
                      </TableCell>

                      {/* Jam Pelajaran */}
                      <TableCell>
                        <Chip
                          label={`${jpText} (${item.total_jp || jps.length} JP)`}
                          size="small"
                          sx={{ bgcolor: '#f1f5f9', fontWeight: 600, color: '#334155' }}
                        />
                      </TableCell>

                      {/* Status Lokasi */}
                      <TableCell>
                        {isValidLoc ? (
                          <Chip
                            icon={<LocationOnIcon sx={{ fontSize: '15px !important' }} />}
                            label={`Valid (${dist}m)`}
                            size="small"
                            color="success"
                            variant="filled"
                            sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                          />
                        ) : (
                          <Chip
                            icon={<WarningIcon sx={{ fontSize: '15px !important' }} />}
                            label={`Luar Jangkauan (${dist}m)`}
                            size="small"
                            color="warning"
                            variant="filled"
                            sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                          />
                        )}
                      </TableCell>

                      {/* Verifikasi Siswa */}
                      <TableCell>
                        <Chip
                          icon={<VerifiedUserIcon sx={{ fontSize: '14px !important' }} />}
                          label={`${countVerified} Siswa Terverifikasi`}
                          size="small"
                          color={countVerified >= 2 ? 'info' : 'default'}
                          variant="outlined"
                          sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                        />
                      </TableCell>

                      {/* Aksi */}
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="text"
                          color="primary"
                          onClick={() => handleOpenDetail(item)}
                          sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.8rem' }}
                        >
                          Detail
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* DETAIL MODAL VERIFIKASI SISWA & GPS */}
      <Dialog
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: 3, p: 1 }
          }
        }}
      >
        <DialogTitle sx={{ pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleIcon color="success" />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Detail Presensi KBM Guru
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setDetailModalOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ py: 2 }}>
          {selectedItem && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Header Card Info */}
              <Paper elevation={0} sx={{ p: 2, borderRadius: 2.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Tanggal & Waktu:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {formatDateIndo(selectedItem.date)}
                    </Typography>
                    {selectedItem.created_at && (
                      <Typography variant="caption" color="text.secondary">
                        {formatCreatedAtTime(selectedItem.created_at)}
                      </Typography>
                    )}
                  </Grid>

                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Rombel / Kelas:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {selectedItem.rombel_id}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Mata Pelajaran:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {selectedItem.subject}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Jam Pelajaran:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      JP {Array.isArray(selectedItem.jp_list) ? selectedItem.jp_list.join(', ') : selectedItem.jp_start} ({selectedItem.total_jp || 1} JP)
                    </Typography>
                  </Grid>

                  {selectedItem.topic && (
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Topik / Materi Pembahasan:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                        {selectedItem.topic}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>

              {/* Status GPS & Lokasi */}
              <Paper elevation={0} sx={{ p: 2, borderRadius: 2.5, bgcolor: selectedItem.location_status === 'VALID' ? '#f0fdf4' : '#fffbeb', border: '1px solid', borderColor: selectedItem.location_status === 'VALID' ? '#86efac' : '#fde68a' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: selectedItem.location_status === 'VALID' ? '#15803d' : '#b45309', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GpsFixedIcon fontSize="small" /> Verifikasi Posisi & Geolocation
                </Typography>
                <Grid container spacing={1}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Status Posisi:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: selectedItem.location_status === 'VALID' ? '#16a34a' : '#d97706' }}>
                      {selectedItem.location_status === 'VALID' ? '✅ Lokasi Valid di Sekolah' : '⚠️ Diluar Jarak Sekolah'}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Jarak ke Sekolah:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {Math.round(selectedItem.location_distance || 0)} meter
                    </Typography>
                  </Grid>
                  {selectedItem.gps_accuracy > 0 && (
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Akurasi GPS:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        ±{Math.round(selectedItem.gps_accuracy)} meter
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>

              {/* Daftar Siswa Verifikator */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e293b', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <VerifiedUserIcon fontSize="small" color="primary" /> Siswa yang Memverifikasi Kehadiran Guru:
                </Typography>

                {Array.isArray(selectedItem.verified_students) && selectedItem.verified_students.length > 0 ? (
                  <Stack spacing={1}>
                    {selectedItem.verified_students.map((st: any, sIdx: number) => (
                      <Paper
                        key={st.nisn || sIdx}
                        elevation={0}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          border: '1px solid #e2e8f0',
                          bgcolor: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: '#e0f2fe', color: '#0284c7', fontSize: '0.8rem', fontWeight: 700 }}>
                            {sIdx + 1}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                              {st.student_name || st.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              NISN: {st.nisn} • Kelas: {st.student_class || st.class_name || selectedItem.rombel_id}
                            </Typography>
                          </Box>
                        </Box>
                        <Chip
                          icon={<CheckCircleIcon sx={{ fontSize: '13px !important' }} />}
                          label="Terverifikasi"
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                        />
                      </Paper>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    Data verifikasi siswa dicatat melalui sistem verifikasi guru.
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setDetailModalOpen(false)}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 3 }}
          >
            Tutup
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
