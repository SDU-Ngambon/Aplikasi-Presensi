import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';

// MUI Imports
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Card,
  CardContent,
  Stack,
  Divider,
  Switch,
  FormControlLabel,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Avatar,
  Tooltip,
  Alert,
  Tabs,
  Tab,
  CircularProgress
} from '@mui/material';

// Icons
import {
  School as SchoolIcon,
  Search as SearchIcon,
  People as PeopleIcon,
  Work as WorkIcon,
  CheckCircle as CheckCircleIcon,
  Upgrade as UpgradeIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  FileDownload as DownloadIcon,
  Person as PersonIcon,
  WhatsApp as WhatsAppIcon,
  ArrowForward as ArrowForwardIcon,
  WarningAmber as WarningIcon,
  Check as CheckIcon,
  Layers as LayersIcon,
  AssignmentInd as AssignmentIndIcon,
  CalendarToday as CalendarTodayIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import AdminJadwalKbmModal from './AdminJadwalKbmModal';

interface StudentItem {
  id: string;
  name: string;
  nisn: string;
  nis?: string;
  class: string;
  year: string;
  status: string;
  photo?: string;
  customFields?: Record<string, any>;
}

interface ClassItem {
  name: string;
  grade: number;
  year: string;
  status: 'AKTIF' | 'PKL' | 'LULUS' | string;
  teacher?: {
    id?: string;
    name: string;
    nip?: string;
    whatsapp: string;
  } | null;
  students: StudentItem[];
  totalStudents: number;
  activeStudents: number;
  graduatedStudents: number;
}

export default function Rombel() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modal Cek Siswa State
  const [activeClass, setActiveClass] = useState<ClassItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  // Kelola Jadwal KBM Modal State
  const [adminScheduleModalOpen, setAdminScheduleModalOpen] = useState(false);
  const [selectedScheduleRombel, setSelectedScheduleRombel] = useState<string>('ALL');

  // Data Guru & Penugasan Wali Kelas State
  const [allTeachers, setAllTeachers] = useState<any[]>([]);
  const [assignModalClass, setAssignModalClass] = useState<ClassItem | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [assigningLoading, setAssigningLoading] = useState(false);

  // Modal Naik Kelas State
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteGrade, setPromoteGrade] = useState<string>('ALL');
  const [newYearInput, setNewYearInput] = useState('');

  const [activeTaList, setActiveTaList] = useState<any[]>([]);

  useEffect(() => {
    if (promoteOpen) {
      axios.get('/api/tahun-ajaran').then(({ data }) => {
        const activeOnly = data.filter((ta: any) => ta.is_active);
        setActiveTaList(activeOnly);
        if (activeOnly.length > 0 && !newYearInput) {
           setNewYearInput(activeOnly[0].nama);
        }
      }).catch(() => {});
    }
  }, [promoteOpen]);

  const [promotePreview, setPromotePreview] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [executingPromote, setExecutingPromote] = useState(false);
  const [confirmPromoteOpen, setConfirmPromoteOpen] = useState(false);
  const [promoteTab, setPromoteTab] = useState<'config' | 'preview'>('config');
  const [promoteSearch, setPromoteSearch] = useState('');
  const [promoteActionFilter, setPromoteActionFilter] = useState<'ALL' | 'NAIK_KELAS' | 'LULUS' | 'WALI_KELAS'>('ALL');

  const fetchTeachers = async () => {
    try {
      const { data } = await axios.get('/api/teachers');
      setAllTeachers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Gagal mengambil data guru:', e);
    }
  };

  const handleOpenAssign = (cls: ClassItem) => {
    setAssignModalClass(cls);
    setTeacherSearchQuery('');
    const current = allTeachers.find(t => t.class === cls.name);
    setSelectedTeacherId(current ? current.id : '');
  };

  const handleSaveAssign = async () => {
    if (!assignModalClass) return;
    try {
      setAssigningLoading(true);
      const res = await axios.post('/api/rombel/assign-teacher', {
        className: assignModalClass.name,
        teacherId: selectedTeacherId || null,
        year: assignModalClass.year
      });
      if (res.data.success) {
        toast.success(res.data.message || 'Wali kelas berhasil diperbarui');
        setAssignModalClass(null);
        await Promise.all([fetchRombel(), fetchTeachers()]);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Gagal menugaskan wali kelas');
    } finally {
      setAssigningLoading(false);
    }
  };

  const fetchRombel = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/rombel');
      if (data && data.classes) {
        setClasses(data.classes);
        setSummary(data.summary || {});
      }
    } catch (e: any) {
      console.error(e);
      toast.error('Gagal mengambil data rombongan belajar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRombel();
    fetchTeachers();
  }, []);

  // Automatically fetch preview when modal opens or parameters change
  useEffect(() => {
    if (promoteOpen) {
      fetchPromotePreview(promoteGrade, newYearInput);
    }
  }, [promoteOpen, promoteGrade, newYearInput]);

  const fetchPromotePreview = async (gradeVal: string, yearVal: string) => {
    try {
      setLoadingPreview(true);
      const targetGradeNum = gradeVal === 'ALL' ? undefined : parseInt(gradeVal, 10);
      const { data } = await axios.post('/api/rombel/promote', {
        dryRun: true,
        targetGrade: targetGradeNum,
        newYear: yearVal.trim() || undefined
      });
      setPromotePreview(data);
    } catch (e) {
      console.error('Gagal memuat preview kenaikan kelas', e);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleTogglePkl = async (className: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'PKL' ? 'AKTIF' : 'PKL';
    try {
      const { data } = await axios.post('/api/rombel/status', {
        className,
        status: nextStatus
      });
      if (data.success) {
        toast.success(`Status kelas ${className} diubah menjadi ${nextStatus}`);
        setClasses(prev => prev.map(c => c.name === className ? { ...c, status: nextStatus } : c));
        // Also refresh rombel data to ensure full synchronization
        await fetchRombel();
      }
    } catch (e) {
      toast.error('Gagal memperbarui status kelas');
    }
  };

  // Filtered Classes
  const filteredClasses = useMemo(() => {
    return classes.filter(cls => {
      const matchSearch = cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cls.teacher?.name && cls.teacher.name.toLowerCase().includes(searchQuery.toLowerCase()));
      
      let matchGrade = true;
      if (selectedGrade === 'ALUMNI') {
        matchGrade = cls.name.startsWith('Alumni') || cls.status === 'LULUS';
      } else if (selectedGrade !== 'ALL') {
        matchGrade = !cls.name.startsWith('Alumni') && cls.grade.toString() === selectedGrade;
      }

      let matchStatus = true;
      if (selectedStatus === 'LULUS') {
        matchStatus = cls.name.startsWith('Alumni') || cls.status === 'LULUS';
      } else if (selectedStatus !== 'ALL') {
        matchStatus = !cls.name.startsWith('Alumni') && cls.status === selectedStatus;
      }

      return matchSearch && matchGrade && matchStatus;
    });
  }, [classes, searchQuery, selectedGrade, selectedStatus]);

  // Modal Siswa Filtered List
  const filteredStudents = useMemo(() => {
    if (!activeClass) return [];
    return activeClass.students.filter(s => 
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.nisn.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.nis && s.nis.toLowerCase().includes(studentSearch.toLowerCase()))
    );
  }, [activeClass, studentSearch]);

  const handleExportStudents = () => {
    if (!activeClass) return;
    const rows = filteredStudents.map((s, idx) => ({
      No: idx + 1,
      Nama: s.name,
      NISN: s.nisn,
      NIS: s.nis || '-',
      Kelas: s.class,
      Angkatan: s.year,
      Status: s.status || 'AKTIF'
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Kelas_${activeClass.name}`);
    XLSX.writeFile(workbook, `Daftar_Siswa_${activeClass.name.replace(/\s+/g, '_')}.xlsx`);
    toast.success('Daftar siswa berhasil diekspor ke Excel');
  };

  // Preview Promotion
  const handleLoadPromotePreview = async () => {
    try {
      setLoadingPreview(true);
      const targetGradeNum = promoteGrade === 'ALL' ? undefined : parseInt(promoteGrade, 10);
      const { data } = await axios.post('/api/rombel/promote', {
        dryRun: true,
        targetGrade: targetGradeNum,
        newYear: newYearInput.trim() || undefined
      });
      setPromotePreview(data);
      setPromoteTab('preview');
    } catch (e) {
      toast.error('Gagal membuat preview kenaikan kelas');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchRombel(), fetchTeachers()]);
      toast.success('Data rombongan belajar berhasil disegarkan');
    } catch (e) {
      toast.error('Gagal menyegarkan data rombel');
    } finally {
      setLoading(false);
    }
  };

  // Execute Promotion
  const handleExecutePromote = async () => {
    try {
      setExecutingPromote(true);
      setConfirmPromoteOpen(false);
      const targetGradeNum = promoteGrade === 'ALL' ? undefined : parseInt(promoteGrade, 10);
      const { data } = await axios.post('/api/rombel/promote', {
        dryRun: false,
        targetGrade: targetGradeNum,
        newYear: newYearInput.trim() || undefined
      });
      if (data.success) {
        toast.success(`Berhasil! ${data.promotedCount} siswa naik kelas, ${data.graduatedCount} siswa lulus, ${data.teacherPromotedCount || 0} wali kelas mengikuti kenaikan & ${data.alumniTeacherCount || 0} wali alumni dicatat.`);
        setPromoteOpen(false);
        setPromotePreview(null);
        await Promise.all([fetchRombel(), fetchTeachers()]);
      } else {
        toast.error(data.error || 'Gagal menjalankan proses kenaikan kelas');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Gagal menjalankan proses kenaikan kelas');
    } finally {
      setExecutingPromote(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      {/* Page Header */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.5px' }}>
            Rombongan Belajar (Kelas)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manajemen rombel, pengecekan anggota kelas, status PKL, dan pemrosesan kenaikan kelas tahunan.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
            sx={{ borderRadius: 2, fontWeight: 600 }}
          >
            {loading ? 'Menyegarkan...' : 'Segarkan'}
          </Button>

          <Button
            variant="contained"
            startIcon={<CalendarTodayIcon />}
            onClick={() => {
              setSelectedScheduleRombel('ALL');
              setAdminScheduleModalOpen(true);
            }}
            sx={{
              borderRadius: 2,
              fontWeight: 700,
              textTransform: 'none',
              bgcolor: '#0f766e',
              color: '#ffffff',
              '&:hover': { bgcolor: '#115e59' },
              boxShadow: '0 4px 14px 0 rgba(15, 118, 110, 0.35)'
            }}
          >
            Kelola Jadwal KBM
          </Button>

          <Button
            variant="contained"
            color="primary"
            startIcon={<UpgradeIcon />}
            onClick={() => {
              setPromoteOpen(true);
              setPromoteTab('config');
              setPromotePreview(null);
            }}
            sx={{ 
              borderRadius: 2, 
              boxShadow: '0 4px 14px 0 rgba(26, 115, 232, 0.35)',
              fontWeight: 700
            }}
          >
            Naik Kelas & Kelulusan
          </Button>
        </Stack>
      </Box>

      {/* Summary KPI Cards */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <Card 
            elevation={0} 
            onClick={() => { setSelectedGrade('ALL'); setSelectedStatus('ALL'); }}
            sx={{ 
              p: 2, 
              bgcolor: 'background.paper', 
              borderRadius: 2.5, 
              border: '1px solid',
              borderColor: (selectedGrade === 'ALL' && selectedStatus === 'ALL') ? 'primary.main' : '#e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)', borderColor: 'primary.light' }
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.05em' }}>TOTAL ROMBEL</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a', mt: 0.5 }}>
              {summary.totalClasses || 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">Semua Tingkat Aktif</Typography>
          </Card>
        </Grid>

        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <Card 
            elevation={0} 
            sx={{ 
              p: 2, 
              bgcolor: 'background.paper', 
              borderRadius: 2.5, 
              border: '1px solid #e2e8f0' 
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.05em' }}>KELAS 10 / 11 / 12</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#334155', mt: 0.5 }}>
              {summary.grade10Count || 0} / {summary.grade11Count || 0} / {summary.grade12Count || 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">Rombel X / XI / XII</Typography>
          </Card>
        </Grid>

        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <Card 
            elevation={0} 
            onClick={() => { setSelectedStatus('PKL'); setSelectedGrade('ALL'); }}
            sx={{ 
              p: 2, 
              bgcolor: 'background.paper', 
              borderRadius: 2.5, 
              border: '1px solid',
              borderColor: selectedStatus === 'PKL' ? '#f59e0b' : '#e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)', borderColor: '#f59e0b' }
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.05em' }}>
              STATUS PKL
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: summary.pklClassesCount > 0 ? '#d97706' : '#64748b', mt: 0.5 }}>
              {summary.pklClassesCount || 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">Bebas Presensi Harian</Typography>
          </Card>
        </Grid>

        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <Card 
            elevation={0} 
            onClick={() => { setSelectedStatus('AKTIF'); setSelectedGrade('ALL'); }}
            sx={{ 
              p: 2, 
              bgcolor: 'background.paper', 
              borderRadius: 2.5, 
              border: '1px solid',
              borderColor: selectedStatus === 'AKTIF' ? '#16a34a' : '#e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)', borderColor: '#16a34a' }
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.05em' }}>SISWA AKTIF</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#16a34a', mt: 0.5 }}>
              {summary.activeStudents || 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">Dari {summary.totalStudents || 0} Siswa</Typography>
          </Card>
        </Grid>

        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <Card 
            elevation={0} 
            onClick={() => { setSelectedGrade('ALUMNI'); setSelectedStatus('ALL'); }}
            sx={{ 
              p: 2, 
              bgcolor: 'background.paper', 
              borderRadius: 2.5, 
              border: '1px solid',
              borderColor: selectedGrade === 'ALUMNI' ? '#64748b' : '#e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)', borderColor: '#64748b' }
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.05em' }}>ALUMNI / LULUS</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#64748b', mt: 0.5 }}>
              {summary.graduatedStudents || 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">Klik untuk Lihat Alumni</Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Filter & Search Bar */}
      <Paper elevation={0} sx={{ p: 2, borderRadius: 2.5, border: '1px solid #e2e8f0', bgcolor: 'background.paper' }}>
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, sm: 4, md: 4 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Cari nama kelas atau wali kelas..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" fontSize="small" />
                    </InputAdornment>
                  ),
                }
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4, md: 4 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, minWidth: 50 }}>
                Tingkat:
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {[
                  { label: 'Semua', val: 'ALL' },
                  { label: 'Kelas 10', val: '10' },
                  { label: 'Kelas 11', val: '11' },
                  { label: 'Kelas 12', val: '12' },
                  { label: 'Alumni / Lulus', val: 'ALUMNI' },
                ].map(item => (
                  <Chip
                    key={item.val}
                    label={item.label}
                    size="small"
                    color={selectedGrade === item.val ? 'primary' : 'default'}
                    variant={selectedGrade === item.val ? 'filled' : 'outlined'}
                    onClick={() => setSelectedGrade(item.val)}
                    sx={{ fontWeight: 600, cursor: 'pointer' }}
                  />
                ))}
              </Box>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, sm: 4, md: 4 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: { sm: 'flex-end' } }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, minWidth: 50 }}>
                Status:
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {[
                  { label: 'Semua', val: 'ALL' },
                  { label: 'Aktif', val: 'AKTIF' },
                  { label: 'PKL', val: 'PKL' },
                  { label: 'Lulus', val: 'LULUS' },
                ].map(item => (
                  <Chip
                    key={item.val}
                    label={item.label}
                    size="small"
                    color={selectedStatus === item.val ? (item.val === 'PKL' ? 'warning' : (item.val === 'LULUS' ? 'default' : 'success')) : 'default'}
                    variant={selectedStatus === item.val ? 'filled' : 'outlined'}
                    onClick={() => setSelectedStatus(item.val)}
                    sx={{ fontWeight: 600, cursor: 'pointer' }}
                  />
                ))}
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Rombel Grid */}
      <Grid container spacing={2.5}>
        {filteredClasses.length === 0 ? (
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 3, border: '1px dashed #cbd5e1', bgcolor: '#f8fafc' }}>
              <SchoolIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 1.5 }} />
              <Typography variant="h6" color="text.secondary">
                {selectedGrade === '10' 
                  ? 'Belum ada rombongan belajar Kelas 10. Kondisi kelas 10 kosong dan siap menerima rombel/siswa baru.' 
                  : selectedGrade === 'ALUMNI' || selectedStatus === 'LULUS'
                  ? 'Belum ada data rombongan belajar Alumni / Siswa Lulus.'
                  : 'Tidak ada rombongan belajar yang sesuai'}
              </Typography>
              {selectedGrade === '10' && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Setelah kenaikan kelas (10 naik ke 11), tingkat kelas 10 tidak ditambahkan kelas otomatis dan menunggu input/import data siswa baru.
                </Typography>
              )}
            </Paper>
          </Grid>
        ) : (
          filteredClasses.map(cls => {
            const isAlumni = cls.name.startsWith('Alumni') || cls.status === 'LULUS';
            const isPkl = cls.status === 'PKL';

            return (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={cls.name}>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    borderRadius: 2.5, 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    borderColor: isPkl ? '#fed7aa' : '#e2e8f0',
                    transition: 'border-color 0.2s, box-shadow 0.2s', 
                    '&:hover': { 
                      borderColor: isPkl ? '#f97316' : '#94a3b8',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)' 
                    } 
                  }}
                >
                  {/* Card Header with Modern Responsive Action Buttons */}
                  <Box sx={{ 
                    p: 2, 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    bgcolor: isPkl ? '#fffaf0' : '#f8fafc', 
                    borderBottom: '1px solid',
                    borderColor: isPkl ? '#feebd0' : '#e2e8f0'
                  }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>{cls.name}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>Tahun: {cls.year}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {isAlumni ? (
                        <Chip
                          label="LULUS"
                          size="small"
                          color="default"
                          sx={{ fontWeight: 700, borderRadius: 1.5 }}
                        />
                      ) : (
                        <Box sx={{ 
                          display: 'inline-flex', 
                          borderRadius: 2, 
                          bgcolor: isPkl ? '#fef3c7' : '#f1f5f9', 
                          p: '3px',
                          border: '1px solid',
                          borderColor: isPkl ? '#fde68a' : '#e2e8f0'
                        }}>
                          <Button
                            size="small"
                            variant={!isPkl ? 'contained' : 'text'}
                            color={!isPkl ? 'success' : 'inherit'}
                            onClick={() => isPkl && handleTogglePkl(cls.name, cls.status)}
                            sx={{ 
                              fontWeight: 700, 
                              borderRadius: 1.5, 
                              fontSize: '0.75rem', 
                              py: 0.3, 
                              px: 1.2, 
                              minWidth: 'auto',
                              textTransform: 'none',
                              boxShadow: 'none',
                              color: !isPkl ? '#fff' : '#64748b'
                            }}
                          >
                            Aktif
                          </Button>
                          <Button
                            size="small"
                            variant={isPkl ? 'contained' : 'text'}
                            color={isPkl ? 'warning' : 'inherit'}
                            onClick={() => !isPkl && handleTogglePkl(cls.name, cls.status)}
                            sx={{ 
                              fontWeight: 700, 
                              borderRadius: 1.5, 
                              fontSize: '0.75rem', 
                              py: 0.3, 
                              px: 1.2, 
                              minWidth: 'auto',
                              textTransform: 'none',
                              boxShadow: 'none',
                              color: isPkl ? '#fff' : '#64748b'
                            }}
                          >
                            PKL
                          </Button>
                        </Box>
                      )}
                    </Box>
                  </Box>

                  <CardContent sx={{ flexGrow: 1, p: 2 }}>
                    {cls.totalStudents === 0 && !isAlumni && (
                      <Box sx={{ mb: 2, p: 1, bgcolor: '#f0fdf4', borderRadius: 1.5, border: '1px dashed #86efac', textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ color: '#166534', fontWeight: 600 }}>
                          Kelas Kosong (0 Siswa) — Siap Menerima Siswa
                        </Typography>
                      </Box>
                    )}

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 1 }}>Wali Kelas</Typography>
                      {cls.teacher ? (
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                          <Avatar sx={{ bgcolor: '#0284c7', width: 34, height: 34, fontSize: '0.9rem', fontWeight: 700 }}>
                            {cls.teacher.name.charAt(0)}
                          </Avatar>
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography variant="body2" noWrap sx={{ fontWeight: 700, color: '#1e293b' }}>{cls.teacher.name}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <WhatsAppIcon sx={{ fontSize: 13, color: '#16a34a' }} /> {cls.teacher.whatsapp}
                            </Typography>
                          </Box>
                        </Stack>
                      ) : (
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <Avatar sx={{ bgcolor: '#f1f5f9', color: '#94a3b8', width: 34, height: 34 }}>
                            <PersonIcon sx={{ fontSize: 18 }} />
                          </Avatar>
                          <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>Belum ada wali kelas</Typography>
                        </Stack>
                      )}
                      <Button
                        size="small"
                        startIcon={<AssignmentIndIcon sx={{ fontSize: 16 }} />}
                        onClick={() => {
                          setAssignModalClass(cls);
                          setSelectedTeacherId(cls.teacher?.id || '');
                        }}
                        sx={{ mt: 1, textTransform: 'none', fontWeight: 600, fontSize: '0.78rem', p: 0 }}
                      >
                        {cls.teacher ? 'Ubah Wali Kelas' : 'Tugaskan Wali Kelas'}
                      </Button>
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 1 }}>Statistik Siswa</Typography>
                      <Grid container spacing={1}>
                        <Grid size={{ xs: 4 }}>
                          <Box sx={{ p: 1, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #f1f5f9', textAlign: 'center' }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>{cls.totalStudents}</Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.7rem' }}>Total</Typography>
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 4 }}>
                          <Box sx={{ p: 1, bgcolor: '#f0fdf4', borderRadius: 1.5, border: '1px solid #dcfce7', textAlign: 'center' }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#15803d', lineHeight: 1.2 }}>{cls.activeStudents}</Typography>
                            <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 600, fontSize: '0.7rem' }}>Aktif</Typography>
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 4 }}>
                          <Box sx={{ p: 1, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #f1f5f9', textAlign: 'center' }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#64748b', lineHeight: 1.2 }}>{cls.graduatedStudents}</Typography>
                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, fontSize: '0.7rem' }}>Lulus</Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
                  </CardContent>

                  <Box sx={{ p: 1.5, borderTop: '1px solid #f1f5f9', bgcolor: '#fafafa' }}>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        fullWidth
                        size="small"
                        startIcon={<PeopleIcon sx={{ fontSize: 16 }} />}
                        onClick={() => {
                          setActiveClass(cls);
                          setModalOpen(true);
                        }}
                        sx={{ borderRadius: 1.5, fontWeight: 700, textTransform: 'none', fontSize: '0.78rem' }}
                      >
                        Siswa ({cls.students.length})
                      </Button>
                      <Button
                        variant="contained"
                        fullWidth
                        size="small"
                        startIcon={<ScheduleIcon sx={{ fontSize: 16 }} />}
                        onClick={() => {
                          setSelectedScheduleRombel(cls.name);
                          setAdminScheduleModalOpen(true);
                        }}
                        sx={{
                          borderRadius: 1.5,
                          fontWeight: 700,
                          textTransform: 'none',
                          fontSize: '0.78rem',
                          bgcolor: '#0f766e',
                          '&:hover': { bgcolor: '#115e59' }
                        }}
                      >
                        Jadwal KBM
                      </Button>
                    </Stack>
                  </Box>
                </Card>
              </Grid>
            );
          })
        )}
      </Grid>

      
      {/* DIALOG DAFTAR SISWA */}
      <Dialog 
        open={modalOpen} 
        onClose={() => setModalOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, maxHeight: '90vh' } } }}
      >
        <DialogTitle component="div" sx={{ p: 2.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Daftar Siswa - {activeClass?.name}</Typography>
            <Typography variant="caption" color="text.secondary">Total {activeClass?.students.length || 0} siswa dalam rombongan belajar ini</Typography>
          </Box>
          <IconButton onClick={() => setModalOpen(false)} size="small" sx={{ bgcolor: '#e2e8f0' }}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0', bgcolor: '#fff' }}>
            <Grid container spacing={2} sx={{ alignItems: 'center' }}>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  fullWidth
                  placeholder="Cari nama atau NISN siswa..."
                  size="small"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="action" fontSize="small" />
                        </InputAdornment>
                      ),
                      sx: { borderRadius: 2, bgcolor: '#f8fafc' }
                    }
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Button 
                  fullWidth 
                  variant="outlined" 
                  startIcon={<DownloadIcon />} 
                  onClick={handleExportStudents}
                  sx={{ borderRadius: 2, fontWeight: 700 }}
                >
                  Ekspor Excel
                </Button>
              </Grid>
            </Grid>
          </Box>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>NO</TableCell>
                  <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>NISN / NIS</TableCell>
                  <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>NAMA SISWA</TableCell>
                  <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>STATUS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student, index) => (
                    <TableRow key={student.id} hover>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{student.nisn}</Typography>
                        {student.nis && <Typography variant="caption" color="text.secondary">{student.nis}</Typography>}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{student.name}</TableCell>
                      <TableCell>
                        <Chip 
                          label={student.status} 
                          size="small" 
                          color={student.status === 'LULUS' ? 'success' : student.status === 'PKL' ? 'warning' : 'primary'} 
                          variant="outlined"
                          sx={{ fontWeight: 700, fontSize: '0.7rem' }} 
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">Tidak ada siswa ditemukan</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog open={promoteOpen}
        onClose={() => !executingPromote && setPromoteOpen(false)}
        maxWidth="lg"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle component="div" sx={{ p: 2.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Naik Kelas & Kelulusan
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Proses kenaikan kelas dan kelulusan siswa secara massal.
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 2.5 }}>
          <Tabs value={promoteTab} onChange={(e, v) => setPromoteTab(v)} sx={{ mb: 2 }}>
            <Tab label="Konfigurasi" value="config" />
            <Tab label="Preview Data" value="preview" />
          </Tabs>
          
          {promoteTab === 'config' && (
            <Stack spacing={3}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                      Tingkat yang Diproses
                    </Typography>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      value={promoteGrade}
                      onChange={e => setPromoteGrade(e.target.value)}
                      slotProps={{ select: { native: true } }}
                    >
                      <option value="ALL">Semua Kelas</option>
                      <option value="10">Kelas 10 (Naik ke Kelas 11)</option>
                      <option value="11">Kelas 11 (Naik ke Kelas 12)</option>
                      <option value="12">Kelas 12 (Lulus / Alumni)</option>
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    Tahun Ajaran Aktif
                  </Typography>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={newYearInput}
                    onChange={e => setNewYearInput(e.target.value)}
                    slotProps={{ select: { native: true } }}
                  >
                    <option value="">-- Pilih --</option>
                    {activeTaList.map((ta: any) => (
                      <option key={ta.id} value={ta.nama}>{ta.nama}</option>
                    ))}
                  </TextField>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Hanya untuk riwayat / referensi proses (Tahun Angkatan siswa tetap/tidak diubah).
                  </Typography>
                </Grid>
              </Grid>
              </Paper>
              {/* Ringkasan Otomatis */}

              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, bgcolor: '#f8fafc' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    Estimasi Hasil Perubahan Siswa & Wali Kelas:
                  </Typography>
                  {loadingPreview && <CircularProgress size={18} />}
                </Box>

                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 12, sm: 2.4 }}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: '#eff6ff', borderRadius: 2, border: '1px solid #bfdbfe', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: 'primary.dark', fontWeight: 700 }}>
                        SISWA NAIK (10 & 11)
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main', mt: 0.5 }}>
                        {promotePreview?.promotedCount ?? 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Siswa</Typography>
                    </Paper>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 2.4 }}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: '#fffbeb', borderRadius: 2, border: '1px solid #fde68a', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#b45309', fontWeight: 700 }}>
                        SISWA LULUS (12)
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: '#d97706', mt: 0.5 }}>
                        {promotePreview?.graduatedCount ?? 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Siswa (Alumni)</Typography>
                    </Paper>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 2.4 }}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: 'success.dark', fontWeight: 700 }}>
                        WALI IKUT NAIK
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: 'success.main', mt: 0.5 }}>
                        {promotePreview?.teacherPromotedCount ?? 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Guru</Typography>
                    </Paper>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 2.4 }}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: '#faf5ff', borderRadius: 2, border: '1px solid #e9d5ff', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#7e22ce', fontWeight: 700 }}>
                        WALI ALUMNI (12)
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: '#9333ea', mt: 0.5 }}>
                        {promotePreview?.alumniTeacherCount ?? 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Guru</Typography>
                    </Paper>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 2.4 }}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: '#f1f5f9', borderRadius: 2, border: '1px solid #cbd5e1', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700 }}>
                        KELAS 10
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#334155', mt: 0.75 }}>
                        KOSONG
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Siap Siswa Baru</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Paper>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => setPromoteTab('preview')}
                  endIcon={<ArrowForwardIcon />}
                  sx={{ borderRadius: 2, fontWeight: 700, px: 3, py: 1 }}
                >
                  Buka Preview Daftar Siswa ({promotePreview?.totalAffected ?? 0}) →
                </Button>
              </Box>
            </Stack>
          )}

          {promoteTab === 'preview' && (
            <Stack spacing={2.5}>
              {loadingPreview ? (
                <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                  <CircularProgress size={36} />
                  <Typography variant="body2" color="text.secondary">Membuat data preview kenaikan kelas & kelulusan...</Typography>
                </Box>
              ) : !promotePreview || promotePreview.changes?.length === 0 ? (
                <Alert severity="warning" sx={{ borderRadius: 2 }}>
                  Tidak ada siswa yang memenuhi kriteria kenaikan kelas pada pilihan saat ini.
                </Alert>
              ) : (
                <>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                      <Chip
                        label={`Semua Siswa (${promotePreview.totalAffected})`}
                        color={promoteActionFilter === 'ALL' ? 'primary' : 'default'}
                        variant={promoteActionFilter === 'ALL' ? 'filled' : 'outlined'}
                        onClick={() => setPromoteActionFilter('ALL')}
                        sx={{ fontWeight: 700, cursor: 'pointer' }}
                        size="small"
                      />
                      <Chip
                        label={`Siswa Naik (${promotePreview.promotedCount})`}
                        color={promoteActionFilter === 'NAIK_KELAS' ? 'primary' : 'default'}
                        variant={promoteActionFilter === 'NAIK_KELAS' ? 'filled' : 'outlined'}
                        onClick={() => setPromoteActionFilter('NAIK_KELAS')}
                        sx={{ fontWeight: 700, cursor: 'pointer' }}
                        size="small"
                      />
                      <Chip
                        label={`Siswa Lulus (${promotePreview.graduatedCount})`}
                        color={promoteActionFilter === 'LULUS' ? 'warning' : 'default'}
                        variant={promoteActionFilter === 'LULUS' ? 'filled' : 'outlined'}
                        onClick={() => setPromoteActionFilter('LULUS')}
                        sx={{ fontWeight: 700, cursor: 'pointer' }}
                        size="small"
                      />
                      <Chip
                        icon={<AssignmentIndIcon fontSize="small" />}
                        label={`Perubahan Wali Kelas (${promotePreview.teacherChanges?.length ?? 0})`}
                        color={promoteActionFilter === 'WALI_KELAS' ? 'secondary' : 'default'}
                        variant={promoteActionFilter === 'WALI_KELAS' ? 'filled' : 'outlined'}
                        onClick={() => setPromoteActionFilter('WALI_KELAS')}
                        sx={{ fontWeight: 700, cursor: 'pointer' }}
                        size="small"
                      />
                    </Stack>

                    <TextField
                      size="small"
                      placeholder="Cari nama, NISN/NIP, kelas..."
                      value={promoteSearch}
                      onChange={e => setPromoteSearch(e.target.value)}
                      sx={{ width: { xs: '100%', sm: 260 } }}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon fontSize="small" />
                            </InputAdornment>
                          )
                        }
                      }}
                    />
                  </Stack>

                  {promoteActionFilter === 'WALI_KELAS' ? (
                    <Box>
                      <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                        Wali Kelas 10 dan 11 otomatis mengikuti kenaikan rombel siswa ke tingkat berikutnya. Wali Kelas 12 tetap dicantumkan sebagai <b>Wali Alumni</b> untuk arsip informasi kelulusan. Kelas 10 dikosongkan untuk siswa dan wali kelas baru.
                      </Alert>
                      <Paper variant="outlined" sx={{ maxHeight: 340, overflowY: 'auto', borderRadius: 2 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Nama Guru</TableCell>
                              <TableCell sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>NIP</TableCell>
                              <TableCell sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Kelas Asal</TableCell>
                              <TableCell sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Perubahan Penugasan</TableCell>
                              <TableCell sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Status Baru</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(!promotePreview.teacherChanges || promotePreview.teacherChanges.length === 0) ? (
                              <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                  Tidak ada data wali kelas yang terpengaruh pada sasaran kenaikan saat ini.
                                </TableCell>
                              </TableRow>
                            ) : (
                              promotePreview.teacherChanges
                                .filter((tc: any) => {
                                  if (!promoteSearch.trim()) return true;
                                  const q = promoteSearch.toLowerCase();
                                  return (
                                    tc.name?.toLowerCase().includes(q) ||
                                    tc.nip?.toLowerCase().includes(q) ||
                                    tc.oldClass?.toLowerCase().includes(q) ||
                                    tc.newClass?.toLowerCase().includes(q)
                                  );
                                })
                                .map((tc: any, idx: number) => (
                                  <TableRow key={idx} hover>
                                    <TableCell sx={{ fontWeight: 700 }}>{tc.name}</TableCell>
                                    <TableCell sx={{ fontFamily: 'monospace' }}>{tc.nip || '-'}</TableCell>
                                    <TableCell>{tc.oldClass}</TableCell>
                                    <TableCell>
                                      {tc.type === 'ALUMNI' ? (
                                        <Chip label={`Wali Alumni (${tc.newClass.replace('Alumni ', '')})`} size="small" color="secondary" sx={{ fontWeight: 700 }} />
                                      ) : (
                                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>{tc.oldClass}</Typography>
                                          <ArrowForwardIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                            {tc.newClass}
                                          </Typography>
                                        </Stack>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <Chip
                                        label={tc.type === 'ALUMNI' ? 'Wali Alumni' : 'Wali Kelas Aktif'}
                                        size="small"
                                        color={tc.type === 'ALUMNI' ? 'default' : 'success'}
                                        sx={{ fontWeight: 700 }}
                                      />
                                    </TableCell>
                                  </TableRow>
                                ))
                            )}
                          </TableBody>
                        </Table>
                      </Paper>
                    </Box>
                  ) : (() => {
                    const filteredChanges = (promotePreview.changes || []).filter((c: any) => {
                      if (promoteActionFilter !== 'ALL' && c.action !== promoteActionFilter) {
                        return false;
                      }
                      if (promoteSearch.trim()) {
                        const q = promoteSearch.toLowerCase();
                        const matchName = c.name?.toLowerCase().includes(q);
                        const matchNisn = c.nisn?.includes(q);
                        const matchOldClass = c.oldClass?.toLowerCase().includes(q);
                        const matchNewClass = c.newClass?.toLowerCase().includes(q);
                        if (!matchName && !matchNisn && !matchOldClass && !matchNewClass) return false;
                      }
                      return true;
                    });

                    return (
                      <>
                        <Paper variant="outlined" sx={{ maxHeight: 340, overflowY: 'auto', borderRadius: 2 }}>
                          <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Nama Siswa</TableCell>
                                <TableCell sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>NISN</TableCell>
                                <TableCell sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Kelas Asal</TableCell>
                                <TableCell sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Aksi / Perubahan</TableCell>
                                <TableCell sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Status Baru</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {filteredChanges.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                    Tidak ada data siswa yang cocok dengan pencarian filter.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                filteredChanges.slice(0, 150).map((c: any) => (
                                  <TableRow key={c.id} hover>
                                    <TableCell sx={{ fontWeight: 600 }}>{c.name}</TableCell>
                                    <TableCell>{c.nisn}</TableCell>
                                    <TableCell>{c.oldClass}</TableCell>
                                    <TableCell>
                                      {c.action === 'LULUS' ? (
                                        <Chip label="Lulus dari Sekolah" size="small" color="warning" sx={{ fontWeight: 700 }} />
                                      ) : (
                                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>{c.oldClass}</Typography>
                                          <ArrowForwardIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                            {c.newClass}
                                          </Typography>
                                        </Stack>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <Chip
                                        label={c.newStatus}
                                        size="small"
                                        color={c.newStatus === 'LULUS' ? 'default' : 'success'}
                                        sx={{ fontWeight: 700 }}
                                      />
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </Paper>
                        {filteredChanges.length > 150 && (
                          <Typography variant="caption" color="text.secondary" align="center">
                            Menampilkan 150 dari {filteredChanges.length} siswa yang cocok.
                          </Typography>
                        )}
                      </>
                    );
                  })()}
                </>
              )}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5, px: 3, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', justifyContent: 'space-between' }}>
          <Button onClick={() => setPromoteOpen(false)} disabled={executingPromote}>
            Tutup
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={() => setConfirmPromoteOpen(true)}
            disabled={executingPromote || !promotePreview || promotePreview.totalAffected === 0}
            startIcon={<CheckIcon />}
            sx={{ borderRadius: 2, fontWeight: 700, px: 3 }}
          >
            {`Terapkan Kenaikan Kelas (${promotePreview?.totalAffected ?? 0} Siswa & ${promotePreview?.teacherChanges?.length ?? 0} Wali Kelas)`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG KONFIRMASI KENAIKAN KELAS (PENGGANTI WINDOW.CONFIRM) */}
      <Dialog
        open={confirmPromoteOpen}
        onClose={() => !executingPromote && setConfirmPromoteOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle component="div" sx={{ p: 2.5, bgcolor: '#fff1f2', borderBottom: '1px solid #fecdd3' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: 'error.main', width: 36, height: 36 }}>
              <WarningIcon fontSize="small" sx={{ color: '#fff' }} />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#9f1239' }}>
                Konfirmasi Kenaikan & Kelulusan
              </Typography>
              <Typography variant="caption" sx={{ color: '#be123c' }}>
                Tindakan ini akan langsung memperbarui data rombel
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 2.5, pt: 3 }}>
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
            Kenaikan kelas akan memperbarui data seluruh siswa dan wali kelas yang dipilih. Siswa kelas 12 akan dialihkan ke status <b>LULUS (Alumni)</b>.
          </Alert>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>
              RINGKASAN PERUBAHAN:
            </Typography>
            <Stack spacing={0.75}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Siswa Naik Kelas (10 & 11):</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {promotePreview?.promotedCount ?? 0} Siswa
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Siswa Lulus (12):</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main' }}>
                  {promotePreview?.graduatedCount ?? 0} Siswa
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Wali Kelas Naik / Alumni:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'info.main' }}>
                  {promotePreview?.teacherChanges?.length ?? 0} Wali Kelas
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ p: 2, px: 2.5, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setConfirmPromoteOpen(false)} disabled={executingPromote} color="inherit">
            Batal
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleExecutePromote}
            disabled={executingPromote}
            startIcon={executingPromote ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
            sx={{ fontWeight: 700, borderRadius: 2, px: 2.5 }}
          >
            {executingPromote ? 'Sedang Memproses...' : 'Ya, Terapkan Sekarang'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG PILIH WALI KELAS DARI DATA GURU */}
      <Dialog
        open={!!assignModalClass}
        onClose={() => !assigningLoading && setAssignModalClass(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle component="div" sx={{ p: 2.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Pilih Wali Kelas - {assignModalClass?.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Pilih guru yang akan ditugaskan sebagai wali kelas dari Data Guru yang telah diinputkan.
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Cari guru berdasarkan nama, NIP, atau WhatsApp..."
              value={teacherSearchQuery}
              onChange={e => setTeacherSearchQuery(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                  )
                }
              }}
            />

            {/* Opsi Kosongkan / Tanpa Wali Kelas */}
            <Paper
              variant="outlined"
              onClick={() => setSelectedTeacherId('')}
              sx={{
                p: 1.5,
                borderRadius: 2,
                cursor: 'pointer',
                borderColor: selectedTeacherId === '' ? 'primary.main' : '#e2e8f0',
                bgcolor: selectedTeacherId === '' ? '#eff6ff' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                transition: 'all 0.15s'
              }}
            >
              <Box sx={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid', borderColor: selectedTeacherId === '' ? 'primary.main' : '#cbd5e1', bgcolor: selectedTeacherId === '' ? 'primary.main' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {selectedTeacherId === '' && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#fff' }} />}
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, color: selectedTeacherId === '' ? 'primary.main' : 'text.primary' }}>
                  Tidak Ada Wali Kelas (Kosongkan)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Kelas ini tidak memiliki wali kelas yang ditugaskan saat ini.
                </Typography>
              </Box>
            </Paper>

            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', mt: 1 }}>
              DAFTAR GURU TERSEDIA ({allTeachers.length} Guru):
            </Typography>

            <Box sx={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
              {allTeachers
                .filter(t => {
                  const q = teacherSearchQuery.toLowerCase();
                  return t.name.toLowerCase().includes(q) || (t.nip && t.nip.toLowerCase().includes(q));
                })
                .map(t => {
                  const isSelected = selectedTeacherId === t.id;
                  const isCurrentForThis = t.class === assignModalClass?.name;
                  const isAssignedOther = t.class && t.class !== assignModalClass?.name && !t.class.startsWith('Alumni');

                  return (
                    <Paper
                      key={t.id}
                      variant="outlined"
                      onClick={() => setSelectedTeacherId(t.id)}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        cursor: 'pointer',
                        borderColor: isSelected ? 'primary.main' : '#e2e8f0',
                        bgcolor: isSelected ? '#eff6ff' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1.5,
                        transition: 'all 0.15s',
                        '&:hover': { bgcolor: isSelected ? '#eff6ff' : '#f8fafc' }
                      }}
                    >
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <Box sx={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid', borderColor: isSelected ? 'primary.main' : '#cbd5e1', bgcolor: isSelected ? 'primary.main' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isSelected && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#fff' }} />}
                        </Box>
                        <Avatar sx={{ width: 32, height: 32, fontSize: 12, bgcolor: isSelected ? 'primary.main' : 'grey.400' }}>
                          {t.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {t.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            NIP: {t.nip && t.nip !== '-' ? t.nip : '- (Non-PNS)'} • WA: {t.whatsapp}
                          </Typography>
                        </Box>
                      </Stack>

                      <Box>
                        {isCurrentForThis ? (
                          <Chip label="Wali Kelas Saat Ini" size="small" color="primary" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                        ) : isAssignedOther ? (
                          <Chip label={`Wali: ${t.class}`} size="small" color="warning" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
                        ) : (
                          <Chip label="Tersedia" size="small" color="success" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
                        )}
                      </Box>
                    </Paper>
                  );
                })}
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, px: 3, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setAssignModalClass(null)} disabled={assigningLoading} color="inherit">
            Batal
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveAssign}
            disabled={assigningLoading}
            startIcon={assigningLoading ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
            sx={{ fontWeight: 700, px: 3 }}
          >
            {assigningLoading ? 'Menyimpan...' : 'Simpan Penugasan'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Admin Jadwal KBM Modal */}
      <AdminJadwalKbmModal
        open={adminScheduleModalOpen}
        onClose={() => setAdminScheduleModalOpen(false)}
        initialRombel={selectedScheduleRombel}
        classes={classes}
        teachers={allTeachers}
        onScheduleUpdated={fetchRombel}
      />
    </Box>
  );
}
