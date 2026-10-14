import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// MUI Imports
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  Stack,
  Avatar,
  Chip,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  CircularProgress,
  Badge,
  Alert
} from '@mui/material';
import { useAppTheme } from '../../contexts/ThemeModeContext';

// Icons
import {
  School as SchoolIcon,
  People as UsersIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Schedule as ClockIcon,
  Class as ClassIcon,
  MenuBook as MenuBookIcon,
  LocationOn as LocationOnIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  FactCheck as FactCheckIcon,
  TrendingUp as TrendingUpIcon,
  AssignmentInd as AssignmentIndIcon,
  LocalHospital as HealthIcon,
  EventBusy as EventBusyIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  Timeline as TimelineIcon,
  Info as InfoIcon,
  RadioButtonChecked as LiveIcon,
  PersonPin as PersonPinIcon,
  VerifiedUser as VerifiedUserIcon,
  HelpOutlined as UnverifiedIcon
} from '@mui/icons-material';
import { formatWIBDateDDMMYYYY, formatWIBDateIndo, getWIBDateString } from '../../timezone';

interface Student {
  id: string;
  nisn: string;
  name: string;
  class: string;
  gender?: string;
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  type: 'ARRIVAL' | 'DEPARTURE';
  status: 'NORMAL' | 'LATE';
  timestamp: string;
  student?: {
    name: string;
    class: string;
    nisn: string;
  };
}

interface TeacherKbmRecord {
  id: string;
  date: string;
  teacher_id: string;
  teacher_name: string;
  nip?: string;
  rombel_id: string;
  subject: string;
  jp_list: number[];
  jp_start: number;
  jp_end: number;
  total_jp: number;
  topic?: string;
  location_status: string;
  location_coords?: { lat: number; lng: number };
  location_distance?: number;
  verified_students?: Array<{
    student_id?: string;
    nisn?: string;
    name?: string;
    student_name?: string;
    class_name?: string;
    scanned_at?: string;
  }>;
  verification_count?: number;
  status: string;
  created_at: string;
}

interface RombelItem {
  name: string;
  level?: string;
  major?: string;
  walikelas?: string;
  student_count?: number;
}

interface IzinItem {
  id: string;
  nisn: string;
  student_name: string;
  student_class: string;
  keterangan: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
}

export default function Dashboard() {
  const { preset, isDark } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState(0);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return getWIBDateString();
  });

  // Raw Data States
  const [students, setStudents] = useState<Student[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [teacherKbms, setTeacherKbms] = useState<TeacherKbmRecord[]>([]);
  const [rombels, setRombels] = useState<RombelItem[]>([]);
  const [izinList, setIzinList] = useState<IzinItem[]>([]);

  // Modal Detail KBM
  const [selectedKbmDetail, setSelectedKbmDetail] = useState<TeacherKbmRecord | null>(null);

  // Auto-refresh timer
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    try {
      const [studentsRes, attendanceRes, kbmRes, rombelRes, izinRes] = await Promise.all([
        axios.get('/api/students').catch(() => ({ data: [] })),
        axios.get('/api/attendance').catch(() => ({ data: [] })),
        axios.get('/api/teacher-kbm-attendance').catch(() => ({ data: [] })),
        axios.get('/api/rombel').catch(() => ({ data: [] })),
        axios.get('/api/piket/izin').catch(() => ({ data: { data: [] } }))
      ]);

      setStudents(Array.isArray(studentsRes.data) ? studentsRes.data : []);
      setAttendances(Array.isArray(attendanceRes.data) ? attendanceRes.data : []);
      setTeacherKbms(Array.isArray(kbmRes.data) ? kbmRes.data : []);
      setRombels(Array.isArray(rombelRes.data) ? rombelRes.data : []);

      const rawIzin = izinRes.data?.data || (Array.isArray(izinRes.data) ? izinRes.data : []);
      setIzinList(rawIzin);

      setLastUpdated(new Date());
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Periodic polling if auto-refresh is active
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchData(false);
    }, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Derived Calculations for Selected Date
  const currentFilteredData = useMemo(() => {
    const todayStr = selectedDate;

    // 1. Student Attendance for Date
    const dayAttendances = attendances.filter(a => a && a.timestamp && String(a.timestamp).startsWith(todayStr));
    const dayArrivals = dayAttendances.filter(a => a.type === 'ARRIVAL');
    const dayDepartures = dayAttendances.filter(a => a.type === 'DEPARTURE');

    const onTimeArrivals = dayArrivals.filter(a => a.status === 'NORMAL');
    const lateArrivals = dayArrivals.filter(a => a.status === 'LATE');

    // 2. Student Permissions / Izin for Date
    const dayIzin = izinList.filter(iz => {
      const start = iz.tanggal_mulai || '';
      const end = iz.tanggal_selesai || start;
      return todayStr >= start && todayStr <= end;
    });

    const sakitCount = dayIzin.filter(iz => iz.keterangan?.toLowerCase().includes('sakit')).length;
    const izinCount = dayIzin.filter(iz => iz.keterangan?.toLowerCase().includes('izin')).length;
    const dispensasiCount = dayIzin.filter(iz => iz.keterangan?.toLowerCase().includes('dispen')).length;

    // 3. Teacher KBM for Date
    const dayTeacherKbms = teacherKbms.filter(k => k && k.date === todayStr);

    const activeTeachersSet = new Set<string>();
    const coveredRombelsSet = new Set<string>();
    let totalJpConducted = 0;

    dayTeacherKbms.forEach(k => {
      if (k.teacher_id || k.teacher_name) activeTeachersSet.add(k.teacher_id || k.teacher_name);
      if (k.rombel_id) coveredRombelsSet.add(k.rombel_id.trim().toUpperCase());
      totalJpConducted += (k.total_jp || (k.jp_list ? k.jp_list.length : 1));
    });

    // 4. Overall Student Attendance Stats
    const totalStudents = students.length || 1;
    const totalPresentStudents = dayArrivals.length;
    const attendancePercentage = ((totalPresentStudents / totalStudents) * 100).toFixed(1);

    // 5. Rombel Coverage Stats
    const totalRombels = rombels.length || 1;
    const coveredRombelsCount = coveredRombelsSet.size;
    const rombelCoveragePercentage = ((coveredRombelsCount / totalRombels) * 100).toFixed(1);

    return {
      totalStudents,
      dayArrivals,
      dayDepartures,
      onTimeArrivals,
      lateArrivals,
      dayIzin,
      sakitCount,
      izinCount,
      dispensasiCount,
      dayTeacherKbms,
      activeTeachersCount: activeTeachersSet.size,
      coveredRombelsCount,
      totalJpConducted,
      attendancePercentage,
      rombelCoveragePercentage,
      totalRombels
    };
  }, [selectedDate, students, attendances, teacherKbms, rombels, izinList]);

  // Chart Data: 7-Day Trend of Student Attendance
  const weeklyAttendanceChart = useMemo(() => {
    const dates = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().substring(0, 10);
    });

    return dates.map(dateStr => {
      const dayAtt = attendances.filter(a => a && a.timestamp && a.type === 'ARRIVAL' && String(a.timestamp).startsWith(dateStr));
      const late = dayAtt.filter(a => a.status === 'LATE').length;
      const onTime = dayAtt.length - late;

      // Day teacher KBM
      const dayKbm = teacherKbms.filter(k => k && k.date === dateStr);
      let dayJp = 0;
      dayKbm.forEach(k => {
        dayJp += (k.total_jp || (k.jp_list ? k.jp_list.length : 1));
      });

      const dayName = new Date(dateStr + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'numeric' });

      return {
        date: dayName,
        rawDate: dateStr,
        TepatWaktu: onTime,
        Terlambat: late,
        TotalHadir: dayAtt.length,
        TotalJP: dayJp
      };
    });
  }, [attendances, teacherKbms]);

  // Chart Data: Distribution of KBM JP by Class Level (X, XI, XII)
  const jpByLevelChart = useMemo(() => {
    const mapLevel: Record<string, number> = { 'Kelas X': 0, 'Kelas XI': 0, 'Kelas XII': 0, 'Lainnya': 0 };

    currentFilteredData.dayTeacherKbms.forEach(k => {
      const rombel = (k.rombel_id || '').toUpperCase();
      const jpCount = k.total_jp || (k.jp_list ? k.jp_list.length : 1);
      if (rombel.startsWith('X ') || rombel === 'X' || rombel.startsWith('10')) {
        mapLevel['Kelas X'] += jpCount;
      } else if (rombel.startsWith('XI ') || rombel === 'XI' || rombel.startsWith('11')) {
        mapLevel['Kelas XI'] += jpCount;
      } else if (rombel.startsWith('XII ') || rombel === 'XII' || rombel.startsWith('12')) {
        mapLevel['Kelas XII'] += jpCount;
      } else {
        mapLevel['Lainnya'] += jpCount;
      }
    });

    return [
      { name: 'Kelas X', jp: mapLevel['Kelas X'], color: '#3b82f6' },
      { name: 'Kelas XI', jp: mapLevel['Kelas XI'], color: '#10b981' },
      { name: 'Kelas XII', jp: mapLevel['Kelas XII'], color: '#8b5cf6' }
    ];
  }, [currentFilteredData.dayTeacherKbms]);

  // Class Attendance Performance Breakdown
  const classBreakdown = useMemo(() => {
    const classMap: Record<string, { total: number; present: number; late: number; kbmCount: number; currentTeacher?: string; currentSubject?: string; currentJp?: string }> = {};

    // Populate all known classes
    rombels.forEach(r => {
      const cName = r.name.trim();
      classMap[cName] = {
        total: r.student_count || 0,
        present: 0,
        late: 0,
        kbmCount: 0
      };
    });

    // Populate students count if not in rombels
    students.forEach(s => {
      const cName = (s.class || 'Tanpa Kelas').trim();
      if (!classMap[cName]) {
        classMap[cName] = { total: 0, present: 0, late: 0, kbmCount: 0 };
      }
      classMap[cName].total += 1;
    });

    // Match arrivals today
    currentFilteredData.dayArrivals.forEach(a => {
      const cName = (a.student?.class || '-').trim();
      if (classMap[cName]) {
        classMap[cName].present += 1;
        if (a.status === 'LATE') classMap[cName].late += 1;
      }
    });

    // Match teacher KBM today
    currentFilteredData.dayTeacherKbms.forEach(k => {
      const rName = (k.rombel_id || '').trim();
      // Find matching key case-insensitive
      const matchKey = Object.keys(classMap).find(kName => kName.toLowerCase() === rName.toLowerCase());
      if (matchKey && classMap[matchKey]) {
        classMap[matchKey].kbmCount += (k.total_jp || (k.jp_list ? k.jp_list.length : 1));
        classMap[matchKey].currentTeacher = k.teacher_name;
        classMap[matchKey].currentSubject = k.subject;
        classMap[matchKey].currentJp = k.jp_list ? k.jp_list.join(', ') : `${k.jp_start}-${k.jp_end}`;
      }
    });

    return Object.entries(classMap)
      .map(([className, data]) => {
        const pct = data.total > 0 ? (data.present / data.total) * 100 : 0;
        return {
          className,
          total: data.total,
          present: data.present,
          late: data.late,
          percentage: pct,
          kbmJp: data.kbmCount,
          currentTeacher: data.currentTeacher,
          currentSubject: data.currentSubject,
          currentJp: data.currentJp
        };
      })
      .filter(item => item.className !== 'Tanpa Kelas' || item.total > 0)
      .sort((a, b) => b.percentage - a.percentage);
  }, [rombels, students, currentFilteredData]);

  // Filtered Live Feeds
  const filteredTeacherKbms = useMemo(() => {
    return currentFilteredData.dayTeacherKbms.filter(k => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        k.teacher_name?.toLowerCase().includes(q) ||
        k.rombel_id?.toLowerCase().includes(q) ||
        k.subject?.toLowerCase().includes(q) ||
        k.topic?.toLowerCase().includes(q)
      );
    });
  }, [currentFilteredData.dayTeacherKbms, searchQuery]);

  const filteredArrivals = useMemo(() => {
    return currentFilteredData.dayArrivals.filter(a => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        a.student?.name?.toLowerCase().includes(q) ||
        a.student?.class?.toLowerCase().includes(q) ||
        a.student?.nisn?.toLowerCase().includes(q)
      );
    });
  }, [currentFilteredData.dayArrivals, searchQuery]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 2 }}>
        <CircularProgress size={48} thickness={4} />
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
          Memuat data statistik & monitoring...
        </Typography>
      </Box>
    );
  }

  const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444'];
  const pieData = [
    { name: 'Tepat Waktu', value: currentFilteredData.onTimeArrivals.length },
    { name: 'Terlambat', value: currentFilteredData.lateArrivals.length },
    { name: 'Belum Presensi', value: Math.max(0, currentFilteredData.totalStudents - currentFilteredData.dayArrivals.length) }
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* ======================================================== */}
      {/* 1. TOP HEADER & COMMAND CENTER BAR                       */}
      {/* ======================================================== */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3 },
          borderRadius: 3.5,
          background: preset.id === 'aqua_glass'
            ? (isDark
                ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.70) 0%, rgba(12, 74, 110, 0.65) 100%)'
                : 'linear-gradient(135deg, rgba(2, 132, 199, 0.90) 0%, rgba(14, 165, 233, 0.85) 50%, rgba(16, 185, 129, 0.85) 100%)')
            : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          boxShadow: preset.id === 'aqua_glass' ? '0 10px 30px -5px rgba(2, 132, 199, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.4)' : '0 10px 25px -5px rgba(15, 23, 42, 0.15)',
          border: preset.id === 'aqua_glass' ? '1px solid rgba(255, 255, 255, 0.35)' : undefined,
          backdropFilter: preset.id === 'aqua_glass' ? 'blur(20px) saturate(180%)' : undefined,
          WebkitBackdropFilter: preset.id === 'aqua_glass' ? 'blur(20px) saturate(180%)' : undefined,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Subtle decorative glow */}
        <Box
          sx={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, transparent 70%)',
            pointerEvents: 'none'
          }}
        />

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: -0.5, color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                Monitoring & Analisis Kehadiran
              </Typography>
              <Chip
                icon={<LiveIcon sx={{ fontSize: '14px !important', color: '#22c55e' }} />}
                label="LIVE SYNC"
                size="small"
                sx={{
                  bgcolor: 'rgba(34, 197, 94, 0.2)',
                  color: '#4ade80',
                  fontWeight: 800,
                  fontSize: '0.7rem',
                  border: '1px solid rgba(34, 197, 94, 0.4)'
                }}
              />
            </Box>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.95)', fontWeight: 500, textShadow: '0 1px 2px rgba(0,0,0,0.25)' }}>
              Dashboard terpadu pemantauan presensi siswa dan real-time KBM kehadiran guru di kelas.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              type="date"
              size="small"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.12)',
                borderRadius: 2,
                '& .MuiOutlinedInput-root': {
                  color: '#ffffff',
                  fontWeight: 600,
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.6)' },
                  '&.Mui-focused fieldset': { borderColor: '#38bdf8' }
                },
                '& input::-webkit-calendar-picker-indicator': {
                  filter: 'invert(1) brightness(1.2)'
                }
              }}
            />

            <Tooltip title="Muat ulang data terkini">
              <Button
                variant="contained"
                size="small"
                onClick={() => fetchData(true)}
                disabled={isRefreshing}
                startIcon={<RefreshIcon sx={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />}
                sx={{
                  bgcolor: '#2563eb',
                  '&:hover': { bgcolor: '#1d4ed8' },
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: 2,
                  px: 2,
                  py: 0.9,
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)'
                }}
              >
                {isRefreshing ? 'Sinkronisasi...' : 'Refresh'}
              </Button>
            </Tooltip>
          </Stack>
        </Box>

        {/* Status Info Footer */}
        <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.18)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="caption" sx={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
            Data per: <strong style={{ color: '#ffffff' }}>{formatWIBDateDDMMYYYY(selectedDate)} ({formatWIBDateIndo(selectedDate)})</strong> • Diperbarui pukul {lastUpdated.toLocaleTimeString('id-ID')} WIB
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="caption" sx={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: autoRefresh ? '#22c55e' : '#cbd5e1' }} />
              Auto-Refresh (30s): {autoRefresh ? 'Aktif' : 'Non-aktif'}
            </Typography>
            <Button
              size="small"
              onClick={() => setAutoRefresh(!autoRefresh)}
              sx={{ color: '#ffffff', bgcolor: 'rgba(255, 255, 255, 0.18)', px: 1, py: 0.2, borderRadius: 1, textTransform: 'none', fontSize: '0.72rem', minWidth: 'auto', '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.28)' } }}
            >
              {autoRefresh ? 'Matikan' : 'Aktifkan'}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* ======================================================== */}
      {/* 2. TOP EXECUTIVE KPI CARDS (BENTO GRID)                  */}
      {/* ======================================================== */}
      <Grid container spacing={2.5}>
        {/* Card 1: Presensi Siswa Datang */}
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3.5,
              border: `1px solid ${preset.glassBorder}`,
              bgcolor: preset.cardBg,
              backdropFilter: 'blur(16px)',
              boxShadow: preset.glassShadow,
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: preset.accentGlow }
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Box>
                <Typography variant="caption" sx={{ color: preset.textColorSecondary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Kehadiran Siswa
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: preset.textColorPrimary, mt: 0.5 }}>
                  {currentFilteredData.dayArrivals.length}
                  <Typography component="span" variant="body2" sx={{ color: preset.textColorSecondary, ml: 0.5, fontWeight: 600 }}>
                    / {currentFilteredData.totalStudents}
                  </Typography>
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#eff6ff', color: '#38bdf8', width: 46, height: 46, borderRadius: 2.5, border: `1px solid ${preset.glassBorder}` }}>
                <UsersIcon />
              </Avatar>
            </Box>

            {/* Progress Bar & Details */}
            <Box sx={{ mt: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: preset.textColorSecondary, fontWeight: 600 }}>Tingkat Hadir</Typography>
                <Typography variant="caption" sx={{ color: preset.primary, fontWeight: 800 }}>{currentFilteredData.attendancePercentage}%</Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Number(currentFilteredData.attendancePercentage)}
                sx={{ height: 6, borderRadius: 3, bgcolor: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: preset.primary, borderRadius: 3 } }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 1, mt: 1.5, pt: 1.5, borderTop: `1px solid ${preset.glassBorder}` }}>
              <Chip
                size="small"
                label={`${currentFilteredData.onTimeArrivals.length} Tepat Waktu`}
                sx={{ bgcolor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#ecfdf5', color: '#22c55e', fontWeight: 700, fontSize: '0.7rem' }}
              />
              <Chip
                size="small"
                label={`${currentFilteredData.lateArrivals.length} Terlambat`}
                sx={{ bgcolor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb', color: '#f59e0b', fontWeight: 700, fontSize: '0.7rem' }}
              />
            </Box>
          </Card>
        </Grid>

        {/* Card 2: Kehadiran Guru di Kelas (KBM) */}
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3.5,
              border: `1px solid ${preset.glassBorder}`,
              bgcolor: preset.cardBg,
              backdropFilter: 'blur(16px)',
              boxShadow: preset.glassShadow,
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: preset.accentGlow }
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Box>
                <Typography variant="caption" sx={{ color: preset.textColorSecondary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Guru Mengajar (KBM)
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: preset.textColorPrimary, mt: 0.5 }}>
                  {currentFilteredData.activeTeachersCount}
                  <Typography component="span" variant="body2" sx={{ color: preset.textColorSecondary, ml: 0.5, fontWeight: 600 }}>
                    Guru
                  </Typography>
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#ecfdf5', color: '#22c55e', width: 46, height: 46, borderRadius: 2.5, border: `1px solid ${preset.glassBorder}` }}>
                <SchoolIcon />
              </Avatar>
            </Box>

            {/* JP Summary */}
            <Box sx={{ mt: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: preset.textColorSecondary, fontWeight: 600 }}>Total Jam KBM</Typography>
                <Typography variant="caption" sx={{ color: '#22c55e', fontWeight: 800 }}>{currentFilteredData.totalJpConducted} JP Terlaksana</Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, (currentFilteredData.totalJpConducted / 60) * 100)}
                sx={{ height: 6, borderRadius: 3, bgcolor: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: '#22c55e', borderRadius: 3 } }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 1, mt: 1.5, pt: 1.5, borderTop: `1px solid ${preset.glassBorder}` }}>
              <Chip
                size="small"
                label={`${currentFilteredData.dayTeacherKbms.length} Sesi Terverifikasi`}
                sx={{ bgcolor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#ecfdf5', color: '#22c55e', fontWeight: 700, fontSize: '0.7rem' }}
              />
              <Chip
                size="small"
                icon={<VerifiedUserIcon sx={{ fontSize: '13px !important' }} />}
                label="Valid Lokasi & Siswa"
                sx={{ bgcolor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#eff6ff', color: '#38bdf8', fontWeight: 700, fontSize: '0.7rem' }}
              />
            </Box>
          </Card>
        </Grid>

        {/* Card 3: Monitoring Keterisian Rombel */}
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3.5,
              border: `1px solid ${preset.glassBorder}`,
              bgcolor: preset.cardBg,
              backdropFilter: 'blur(16px)',
              boxShadow: preset.glassShadow,
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: preset.accentGlow }
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Box>
                <Typography variant="caption" sx={{ color: preset.textColorSecondary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Keterisian Kelas (Rombel)
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: preset.textColorPrimary, mt: 0.5 }}>
                  {currentFilteredData.coveredRombelsCount}
                  <Typography component="span" variant="body2" sx={{ color: preset.textColorSecondary, ml: 0.5, fontWeight: 600 }}>
                    / {currentFilteredData.totalRombels} Kelas
                  </Typography>
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: isDark ? 'rgba(139, 92, 246, 0.2)' : '#faf5ff', color: '#a855f7', width: 46, height: 46, borderRadius: 2.5, border: `1px solid ${preset.glassBorder}` }}>
                <ClassIcon />
              </Avatar>
            </Box>

            {/* Coverage Progress */}
            <Box sx={{ mt: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: preset.textColorSecondary, fontWeight: 600 }}>Cakupan Kelas</Typography>
                <Typography variant="caption" sx={{ color: '#a855f7', fontWeight: 800 }}>{currentFilteredData.rombelCoveragePercentage}%</Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Number(currentFilteredData.rombelCoveragePercentage)}
                sx={{ height: 6, borderRadius: 3, bgcolor: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: '#a855f7', borderRadius: 3 } }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 1, mt: 1.5, pt: 1.5, borderTop: `1px solid ${preset.glassBorder}` }}>
              <Chip
                size="small"
                label={`${currentFilteredData.coveredRombelsCount} Terisi KBM`}
                sx={{ bgcolor: isDark ? 'rgba(139, 92, 246, 0.15)' : '#faf5ff', color: '#a855f7', fontWeight: 700, fontSize: '0.7rem' }}
              />
              <Chip
                size="small"
                label={`${Math.max(0, currentFilteredData.totalRombels - currentFilteredData.coveredRombelsCount)} Menunggu`}
                sx={{ bgcolor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9', color: preset.textColorSecondary, fontWeight: 700, fontSize: '0.7rem' }}
              />
            </Box>
          </Card>
        </Grid>

        {/* Card 4: Perizinan & Ketidakhadiran */}
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3.5,
              border: `1px solid ${preset.glassBorder}`,
              bgcolor: preset.cardBg,
              backdropFilter: 'blur(16px)',
              boxShadow: preset.glassShadow,
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: preset.accentGlow }
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Box>
                <Typography variant="caption" sx={{ color: preset.textColorSecondary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Izin & Sakit (Piket)
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: preset.textColorPrimary, mt: 0.5 }}>
                  {currentFilteredData.dayIzin.length}
                  <Typography component="span" variant="body2" sx={{ color: preset.textColorSecondary, ml: 0.5, fontWeight: 600 }}>
                    Siswa
                  </Typography>
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fff1f2', color: '#ef4444', width: 46, height: 46, borderRadius: 2.5, border: `1px solid ${preset.glassBorder}` }}>
                <EventBusyIcon />
              </Avatar>
            </Box>

            {/* Breakdown Chips */}
            <Box sx={{ mt: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: preset.textColorSecondary, fontWeight: 600 }}>Status Perizinan</Typography>
                <Typography variant="caption" sx={{ color: '#ef4444', fontWeight: 800 }}>Tercatat di Portal Piket</Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, (currentFilteredData.dayIzin.length / 20) * 100)}
                sx={{ height: 6, borderRadius: 3, bgcolor: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: '#ef4444', borderRadius: 3 } }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 0.7, mt: 1.5, pt: 1.5, borderTop: `1px solid ${preset.glassBorder}`, flexWrap: 'wrap' }}>
              <Chip size="small" label={`${currentFilteredData.sakitCount} Sakit`} sx={{ bgcolor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2', color: '#ef4444', fontWeight: 700, fontSize: '0.68rem' }} />
              <Chip size="small" label={`${currentFilteredData.izinCount} Izin`} sx={{ bgcolor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7', color: '#f59e0b', fontWeight: 700, fontSize: '0.68rem' }} />
              <Chip size="small" label={`${currentFilteredData.dispensasiCount} Dispen`} sx={{ bgcolor: isDark ? 'rgba(139, 92, 246, 0.15)' : '#e0e7ff', color: '#8b5cf6', fontWeight: 700, fontSize: '0.68rem' }} />
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* ======================================================== */}
      {/* 3. NAVIGATION TABS & SEARCH BAR                          */}
      {/* ======================================================== */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3.5,
          border: `1px solid ${preset.glassBorder}`,
          bgcolor: preset.cardBg,
          backdropFilter: 'blur(16px)',
          boxShadow: preset.glassShadow,
          p: 1.5,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', md: 'center' },
          gap: 1.5
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 44,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.88rem',
              borderRadius: 2,
              minHeight: 40,
              px: 2,
              py: 0.5,
              mr: 1,
              color: preset.textColorSecondary
            },
            '& .Mui-selected': {
              bgcolor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(37, 99, 235, 0.08)',
              color: `${preset.primary} !important`
            }
          }}
        >
          <Tab icon={<TimelineIcon sx={{ fontSize: '18px !important' }} />} iconPosition="start" label="Ringkasan & Analisis Grafik" />
          <Tab
            icon={
              <Badge badgeContent={filteredTeacherKbms.length} color="success">
                <SchoolIcon sx={{ fontSize: '18px !important' }} />
              </Badge>
            }
            iconPosition="start"
            label="Live Monitoring Guru di Kelas (KBM)"
          />
          <Tab
            icon={
              <Badge badgeContent={filteredArrivals.length} color="primary">
                <UsersIcon sx={{ fontSize: '18px !important' }} />
              </Badge>
            }
            iconPosition="start"
            label="Live Presensi Siswa"
          />
          <Tab icon={<ClassIcon sx={{ fontSize: '18px !important' }} />} iconPosition="start" label="Rekap Keterisian per Kelas" />
        </Tabs>

        {/* Global Search Input */}
        <TextField
          size="small"
          placeholder="Cari guru, kelas, mapel, siswa..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: preset.textColorSecondary }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
              sx: {
                borderRadius: 2,
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc',
                color: preset.textColorPrimary,
                border: `1px solid ${preset.glassBorder}`,
                fontSize: '0.85rem',
                width: { xs: '100%', md: 260 }
              }
            }
          }}
        />
      </Paper>

      {/* ======================================================== */}
      {/* 4. TAB CONTENT 0: RINGKASAN & ANALISIS GRAFIK            */}
      {/* ======================================================== */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Chart 1: Tren Kehadiran Siswa 7 Hari */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3.5, border: '1px solid #e2e8f0', bgcolor: '#ffffff', height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    Tren Presensi Siswa (7 Hari Terakhir)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Perbandingan jumlah siswa yang hadir tepat waktu vs terlambat setiap hari
                  </Typography>
                </Box>
                <Chip label="7 Hari" size="small" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
              </Box>

              <Box sx={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyAttendanceChart} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorOnTime" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorLate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" fontSize={12} stroke="#64748b" tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} stroke="#64748b" tickLine={false} axisLine={false} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: 8, color: '#ffffff', border: 'none' }}
                      itemStyle={{ color: '#ffffff' }}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Area type="monotone" name="Tepat Waktu" dataKey="TepatWaktu" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOnTime)" />
                    <Area type="monotone" name="Terlambat" dataKey="Terlambat" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorLate)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* Chart 2: Distribusi JP KBM per Tingkat Kelas */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3.5, border: '1px solid #e2e8f0', bgcolor: '#ffffff', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                  Distribusi KBM Guru Hari Ini
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total jam pelajaran (JP) yang terlaksana per tingkatan kelas
                </Typography>
              </Box>

              <Box sx={{ width: '100%', height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={jpByLevelChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" fontSize={12} stroke="#64748b" tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} stroke="#64748b" tickLine={false} axisLine={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: 8, color: '#ffffff', border: 'none' }} />
                    <Bar dataKey="jp" name="Total JP" radius={[6, 6, 0, 0]}>
                      {jpByLevelChart.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>

              {/* Mini Summary List */}
              <Stack spacing={1} sx={{ mt: 'auto', pt: 2, borderTop: '1px solid #f1f5f9' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.82rem' }}>Total Guru Aktif:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>{currentFilteredData.activeTeachersCount} Orang</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.82rem' }}>Total Sesi KBM:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#16a34a' }}>{currentFilteredData.dayTeacherKbms.length} Sesi</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.82rem' }}>Rata-rata JP per Guru:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#2563eb' }}>
                    {currentFilteredData.activeTeachersCount > 0 ? (currentFilteredData.totalJpConducted / currentFilteredData.activeTeachersCount).toFixed(1) : 0} JP
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>

          {/* Mini Live Preview Grid (Dual Feed Preview) */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3.5, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SchoolIcon sx={{ color: '#16a34a' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    Aktivitas Guru di Kelas Terkini
                  </Typography>
                </Box>
                <Button size="small" onClick={() => setActiveTab(1)} sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.78rem' }}>
                  Lihat Semua
                </Button>
              </Box>

              {filteredTeacherKbms.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  Belum ada catatan presensi KBM guru untuk tanggal ini.
                </Alert>
              ) : (
                <Stack spacing={1.5}>
                  {filteredTeacherKbms.slice(0, 4).map((item, idx) => (
                    <Paper
                      key={item.id || idx}
                      elevation={0}
                      onClick={() => setSelectedKbmDetail(item)}
                      sx={{
                        p: 1.5,
                        borderRadius: 2.5,
                        bgcolor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        '&:hover': { bgcolor: '#f1f5f9', borderColor: '#cbd5e1' }
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ bgcolor: '#ecfdf5', color: '#16a34a', width: 38, height: 38, fontWeight: 700, fontSize: '0.85rem' }}>
                            {item.teacher_name ? item.teacher_name.charAt(0).toUpperCase() : 'G'}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>
                              {item.teacher_name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                              <strong>{item.subject}</strong> • Kelas: <strong>{item.rombel_id}</strong>
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Chip
                            label={`JP ${item.jp_list ? item.jp_list.join(',') : `${item.jp_start}-${item.jp_end}`}`}
                            size="small"
                            color="primary"
                            sx={{ fontWeight: 800, fontSize: '0.68rem', height: 22 }}
                          />
                          <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 0.3 }}>
                            {item.created_at ? new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Paper>
          </Grid>

          {/* Mini Live Student Attendance Preview */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3.5, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <UsersIcon sx={{ color: '#2563eb' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    Presensi Gerbang Siswa Terkini
                  </Typography>
                </Box>
                <Button size="small" onClick={() => setActiveTab(2)} sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.78rem' }}>
                  Lihat Semua
                </Button>
              </Box>

              {filteredArrivals.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  Belum ada log presensi siswa yang masuk hari ini.
                </Alert>
              ) : (
                <Stack spacing={1.5}>
                  {filteredArrivals.slice(0, 4).map((item, idx) => (
                    <Paper
                      key={item.id || idx}
                      elevation={0}
                      sx={{
                        p: 1.5,
                        borderRadius: 2.5,
                        bgcolor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: item.status === 'LATE' ? '#fef3c7' : '#eff6ff', color: item.status === 'LATE' ? '#d97706' : '#2563eb', width: 38, height: 38 }}>
                          <ClockIcon fontSize="small" />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>
                            {item.student?.name || 'Siswa'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            {item.student?.class || '-'} • NISN: {item.student?.nisn || '-'}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Chip
                          label={item.status === 'LATE' ? 'Terlambat' : 'Tepat Waktu'}
                          size="small"
                          color={item.status === 'LATE' ? 'warning' : 'success'}
                          sx={{ fontWeight: 800, fontSize: '0.68rem', height: 22 }}
                        />
                        <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 0.3 }}>
                          {item.timestamp ? new Date(item.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </Typography>
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ======================================================== */}
      {/* 5. TAB CONTENT 1: LIVE MONITORING GURU DI KELAS (KBM)    */}
      {/* ======================================================== */}
      {activeTab === 1 && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3.5,
            border: `1px solid ${preset.glassBorder}`,
            bgcolor: preset.cardBg,
            backdropFilter: preset.backdropBlur || 'blur(16px)',
            WebkitBackdropFilter: preset.backdropBlur || 'blur(16px)',
            boxShadow: preset.glassShadow
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, mb: 3 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: preset.textColorPrimary }}>
                Daftar Presensi Guru di Kelas (KBM)
              </Typography>
              <Typography variant="caption" sx={{ color: preset.textColorSecondary }}>
                Menampilkan log real-time guru yang sedang dan telah mengajar di kelas beserta verifikasi siswa
              </Typography>
            </Box>
            <Chip
              label={`${filteredTeacherKbms.length} Sesi Terdata`}
              color="success"
              sx={{ fontWeight: 800 }}
            />
          </Box>

          {filteredTeacherKbms.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2.5, py: 2 }}>
              Tidak ditemukan data presensi guru di kelas untuk tanggal <strong>{formatWIBDateDDMMYYYY(selectedDate)}</strong> {searchQuery && `dengan kata kunci "${searchQuery}"`}.
            </Alert>
          ) : (
            <TableContainer sx={{ borderRadius: 2.5, border: `1px solid ${preset.glassBorder}`, bgcolor: preset.cardBg }}>
              <Table size="medium">
                <TableHead sx={{ bgcolor: preset.tableHeaderBg || '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.82rem' }}>GURU & NIP</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.82rem' }}>KELAS / ROMBEL</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.82rem' }}>MATA PELAJARAN</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.82rem' }}>JAM (JP)</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.82rem' }}>TOPIK / MATERI</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.82rem' }}>VERIFIKASI SISWA</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.82rem' }}>LOKASI</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, color: '#475569', fontSize: '0.82rem' }}>AKSI</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTeacherKbms.map((item, idx) => {
                    const verifiedCount = item.verified_students?.length || item.verification_count || 0;
                    return (
                      <TableRow key={item.id || idx} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ bgcolor: '#15803d', color: '#ffffff', width: 34, height: 34, fontSize: '0.8rem', fontWeight: 700 }}>
                              {item.teacher_name ? item.teacher_name.charAt(0).toUpperCase() : 'G'}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>
                                {item.teacher_name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748b' }}>
                                NIP: {item.nip || '-'}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={item.rombel_id}
                            size="small"
                            sx={{ fontWeight: 800, bgcolor: '#f1f5f9', color: '#1e293b', borderRadius: 1.5 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                            {item.subject}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`JP ${item.jp_list ? item.jp_list.join(', ') : `${item.jp_start}-${item.jp_end}`}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 200 }}>
                          <Typography variant="caption" sx={{ color: item.topic ? '#334155' : '#94a3b8', fontStyle: item.topic ? 'normal' : 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {item.topic || 'Tidak ada catatan materi'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                            label={`${verifiedCount} Siswa`}
                            size="small"
                            color={verifiedCount >= 2 ? 'success' : 'warning'}
                            sx={{ fontWeight: 800, fontSize: '0.72rem' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={<LocationOnIcon sx={{ fontSize: '14px !important' }} />}
                            label={item.location_status === 'VALID' ? 'Valid (Radius Sekolah)' : 'Di Luar Radius'}
                            size="small"
                            color={item.location_status === 'VALID' ? 'success' : 'error'}
                            variant="outlined"
                            sx={{ fontWeight: 700, fontSize: '0.68rem' }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Lihat detail verifikasi siswa & koordinat">
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => setSelectedKbmDetail(item)}
                              startIcon={<VisibilityIcon fontSize="small" />}
                              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, fontSize: '0.75rem', py: 0.4 }}
                            >
                              Detail
                            </Button>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* ======================================================== */}
      {/* 6. TAB CONTENT 2: LIVE PRESENSI SISWA                    */}
      {/* ======================================================== */}
      {activeTab === 2 && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3.5,
            border: `1px solid ${preset.glassBorder}`,
            bgcolor: preset.cardBg,
            backdropFilter: preset.backdropBlur || 'blur(16px)',
            WebkitBackdropFilter: preset.backdropBlur || 'blur(16px)',
            boxShadow: preset.glassShadow
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, mb: 3 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: preset.textColorPrimary }}>
                Log Presensi Siswa (Gerbang & Scanner)
              </Typography>
              <Typography variant="caption" sx={{ color: preset.textColorSecondary }}>
                Menampilkan seluruh data pemindaian kartu presensi kedatangan dan kepulangan siswa
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Chip label={`${currentFilteredData.onTimeArrivals.length} Tepat Waktu`} color="success" size="small" sx={{ fontWeight: 800 }} />
              <Chip label={`${currentFilteredData.lateArrivals.length} Terlambat`} color="warning" size="small" sx={{ fontWeight: 800 }} />
            </Stack>
          </Box>

          {filteredArrivals.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2.5, py: 2 }}>
              Tidak ada data presensi siswa yang ditemukan untuk tanggal <strong>{formatWIBDateDDMMYYYY(selectedDate)}</strong> {searchQuery && `dengan filter "${searchQuery}"`}.
            </Alert>
          ) : (
            <TableContainer sx={{ borderRadius: 2.5, border: `1px solid ${preset.glassBorder}`, bgcolor: preset.cardBg }}>
              <Table size="medium">
                <TableHead sx={{ bgcolor: preset.tableHeaderBg || '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.82rem' }}>NAMA SISWA</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.82rem' }}>NISN</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.82rem' }}>KELAS</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.82rem' }}>WAKTU SCAN</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.82rem' }}>TIPE</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.82rem' }}>STATUS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredArrivals.map((item, idx) => (
                    <TableRow key={item.id || idx} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                          {item.student?.name || 'Siswa'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                          {item.student?.nisn || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={item.student?.class || '-'} size="small" sx={{ fontWeight: 800, bgcolor: '#f1f5f9' }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                          {item.timestamp ? new Date(item.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.type === 'ARRIVAL' ? 'Datang' : 'Pulang'}
                          size="small"
                          color={item.type === 'ARRIVAL' ? 'primary' : 'secondary'}
                          variant="outlined"
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.status === 'LATE' ? 'Terlambat' : 'Tepat Waktu'}
                          size="small"
                          color={item.status === 'LATE' ? 'warning' : 'success'}
                          sx={{ fontWeight: 800 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* ======================================================== */}
      {/* 7. TAB CONTENT 3: REKAP KETERISIAN PER KELAS             */}
      {/* ======================================================== */}
      {activeTab === 3 && (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3.5, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, mb: 3 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                Matriks Keterisian & Kehadiran Per Rombel
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Tingkat kehadiran siswa dan status jam pelajaran (JP) guru pada masing-masing rombongan belajar
              </Typography>
            </Box>
            <Chip
              label={`${classBreakdown.length} Total Kelas`}
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 800 }}
            />
          </Box>

          <Grid container spacing={2}>
            {classBreakdown.map((c, idx) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={c.className || idx}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    border: '1px solid #e2e8f0',
                    bgcolor: '#ffffff',
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: '#93c5fd', transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                      {c.className}
                    </Typography>
                    <Chip
                      label={`${c.percentage.toFixed(0)}% Hadir`}
                      size="small"
                      color={c.percentage >= 85 ? 'success' : c.percentage >= 60 ? 'warning' : 'default'}
                      sx={{ fontWeight: 800, fontSize: '0.68rem', height: 20 }}
                    />
                  </Box>

                  <LinearProgress
                    variant="determinate"
                    value={c.percentage}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      mb: 1.5,
                      bgcolor: '#f1f5f9',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: c.percentage >= 85 ? '#10b981' : c.percentage >= 60 ? '#f59e0b' : '#94a3b8',
                        borderRadius: 3
                      }
                    }}
                  />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', mb: 1.5 }}>
                    <span>Hadir: <strong>{c.present}</strong> / {c.total} Siswa</span>
                    {c.late > 0 && <span style={{ color: '#d97706' }}>({c.late} Terlambat)</span>}
                  </Box>

                  {/* KBM Status per Class */}
                  <Box sx={{ pt: 1.2, borderTop: '1px dashed #e2e8f0' }}>
                    {c.kbmJp > 0 ? (
                      <Box>
                        <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 800, display: 'block' }}>
                          ✅ Terisi {c.kbmJp} JP KBM
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.72rem', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {c.currentTeacher} ({c.currentSubject})
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontStyle: 'italic' }}>
                        ⏳ Belum ada KBM hari ini
                      </Typography>
                    )}
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* ======================================================== */}
      {/* 8. MODAL DETAIL VERIFIKASI KBM GURU                      */}
      {/* ======================================================== */}
      <Dialog
        open={Boolean(selectedKbmDetail)}
        onClose={() => setSelectedKbmDetail(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3.5,
              overflow: 'hidden',
              bgcolor: preset.cardBg,
              backdropFilter: preset.backdropBlur || 'blur(20px)',
              WebkitBackdropFilter: preset.backdropBlur || 'blur(20px)',
              border: `1px solid ${preset.glassBorder}`,
              boxShadow: preset.glassShadow
            }
          }
        }}
      >
        {selectedKbmDetail && (
          <>
            <DialogTitle
              sx={{
                bgcolor: '#0f172a',
                color: '#ffffff',
                p: 2.5,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <SchoolIcon sx={{ color: '#4ade80' }} />
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2, color: '#ffffff' }}>
                    Detail Presensi KBM Guru
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                    Kelas: <strong>{selectedKbmDetail.rombel_id}</strong> • Tanggal: {formatWIBDateDDMMYYYY(selectedKbmDetail.date)}
                  </Typography>
                </Box>
              </Box>
              <IconButton size="small" onClick={() => setSelectedKbmDetail(null)} sx={{ color: '#94a3b8' }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3 }}>
              {/* Header Info Guru */}
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #e2e8f0', mb: 2.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>
                  {selectedKbmDetail.teacher_name}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1 }}>
                  NIP: {selectedKbmDetail.nip || '-'} • Mapel: <strong>{selectedKbmDetail.subject}</strong>
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                  <Chip
                    label={`Jam Pelajaran: JP ${selectedKbmDetail.jp_list ? selectedKbmDetail.jp_list.join(', ') : `${selectedKbmDetail.jp_start}-${selectedKbmDetail.jp_end}`}`}
                    size="small"
                    color="primary"
                    sx={{ fontWeight: 700 }}
                  />
                  <Chip
                    label={`Total ${selectedKbmDetail.total_jp || 1} JP`}
                    size="small"
                    color="secondary"
                    sx={{ fontWeight: 700 }}
                  />
                  <Chip
                    icon={<LocationOnIcon sx={{ fontSize: '13px !important' }} />}
                    label={selectedKbmDetail.location_status === 'VALID' ? 'Lokasi Valid di Sekolah' : 'Di Luar Radius'}
                    size="small"
                    color={selectedKbmDetail.location_status === 'VALID' ? 'success' : 'error'}
                    sx={{ fontWeight: 700 }}
                  />
                </Box>
              </Box>

              {/* Topic / Materi */}
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5 }}>
                  Topik / Materi Pembelajaran:
                </Typography>
                <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#f1f5f9', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                  <Typography variant="body2" sx={{ color: selectedKbmDetail.topic ? '#0f172a' : '#94a3b8', fontStyle: selectedKbmDetail.topic ? 'normal' : 'italic' }}>
                    {selectedKbmDetail.topic || 'Guru tidak mengisi catatan materi secara spesifik.'}
                  </Typography>
                </Paper>
              </Box>

              {/* Verified Students List */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Daftar Siswa Verifikator ({selectedKbmDetail.verified_students?.length || 0}):
                  </Typography>
                  <Chip
                    icon={<CheckCircleIcon sx={{ fontSize: '13px !important' }} />}
                    label="Kartu Fisik Terverifikasi"
                    size="small"
                    color="success"
                    variant="outlined"
                    sx={{ fontWeight: 700, fontSize: '0.68rem' }}
                  />
                </Box>

                {!selectedKbmDetail.verified_students || selectedKbmDetail.verified_students.length === 0 ? (
                  <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    Tidak ada catatan kartu siswa terverifikasi pada sesi ini.
                  </Typography>
                ) : (
                  <Stack spacing={1} sx={{ maxHeight: 200, overflowY: 'auto' }}>
                    {selectedKbmDetail.verified_students.map((st, i) => (
                      <Paper
                        key={st.nisn || st.student_id || i}
                        elevation={0}
                        sx={{
                          p: 1.2,
                          px: 1.5,
                          borderRadius: 2,
                          bgcolor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CheckCircleIcon sx={{ color: '#16a34a', fontSize: 18 }} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                              {st.student_name || st.name || 'Siswa'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                              NISN: {st.nisn || '-'} • {st.class_name || selectedKbmDetail.rombel_id}
                            </Typography>
                          </Box>
                        </Box>
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                          {st.scanned_at ? new Date(st.scanned_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Terverifikasi'}
                        </Typography>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              <Button
                variant="contained"
                onClick={() => setSelectedKbmDetail(null)}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
              >
                Tutup
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
