import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  Chip,
  Paper,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  IconButton,
  Divider,
  Tooltip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stepper,
  Step,
  StepLabel,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  Autocomplete,
  FormControl,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  Schedule as ScheduleIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Lock as LockIcon,
  Class as ClassIcon,
  School as SchoolIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  InfoOutlined as InfoIcon,
  WarningAmber as WarningIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  AccessTime as AccessTimeIcon,
  Check as CheckIcon,
  Brush as BrushIcon,
  DeleteSweep as DeleteSweepIcon,
  AutoAwesome as AutoAwesomeIcon,
  Layers as LayersIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import axios from 'axios';
import { JadwalKbm, KbmDaySchedule, KbmPeriod } from '../../types';
import { useAppTheme } from '../../contexts/ThemeModeContext';

interface JadwalKbmGuruProps {
  currentUser: any;
}

const HARI_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const HARI_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Senin: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  Selasa: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  Rabu: { bg: '#fdf4ff', text: '#86198f', border: '#f5d0fe' },
  Kamis: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  Jumat: { bg: '#ecfeff', text: '#0e7490', border: '#a5f3fc' },
  Sabtu: { bg: '#fefce8', text: '#a16207', border: '#fef08a' }
};

export default function JadwalKbmGuru({ currentUser }: JadwalKbmGuruProps) {
  const { preset, isDark } = useAppTheme();
  const teacherId = currentUser?.id || currentUser?.teacher_id || '';
  const teacherName = currentUser?.name || currentUser?.nama || 'Guru';

  // Master Data
  const [schedules, setSchedules] = useState<JadwalKbm[]>([]);
  const [loading, setLoading] = useState(false);
  const [masterMapels, setMasterMapels] = useState<any[]>([]);
  const [masterRombels, setMasterRombels] = useState<string[]>([]);
  const [rombelLoading, setRombelLoading] = useState(false);
  const [kbmDaySchedules, setKbmDaySchedules] = useState<KbmDaySchedule[]>([]);

  // Filter State
  const [filterHari, setFilterHari] = useState<string>('all');
  const [filterRombel, setFilterRombel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog State (Add / Edit)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [formMapel, setFormMapel] = useState<string>('');
  const [formRombels, setFormRombels] = useState<string[]>([]);
  const [formDays, setFormDays] = useState<string[]>(['Senin']);
  const [activeDayTab, setActiveDayTab] = useState<string>('Senin');
  const [activeRombelBrush, setActiveRombelBrush] = useState<string>('');
  const [slotAssignments, setSlotAssignments] = useState<Record<string, string[]>>({});
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Conflict Data
  const [conflictLoading, setConflictLoading] = useState(false);
  const [occupiedSlots, setOccupiedSlots] = useState<{
    jp: number;
    teacher_id: string;
    teacher_name: string;
    mapel_name: string;
    schedule_id: string;
    rombel_id?: string;
    hari?: string;
  }[]>([]);

  // Delete Confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch Active Rombels from Server
  const fetchRombels = async () => {
    setRombelLoading(true);
    try {
      const res = await axios.get('/api/rombel?status=AKTIF');
      const rawList = res.data?.classes || res.data?.data || (Array.isArray(res.data) ? res.data : []);
      if (Array.isArray(rawList)) {
        const names = rawList
          .filter((r: any) => {
            const st = String(r.status || 'AKTIF').toUpperCase();
            const name = String(r.name || r.class_name || r.className || r.class || r.rombel || '').trim();
            const isInactive = st !== 'AKTIF' || name.startsWith('Alumni') || name === 'Tanpa Kelas' || name.toLowerCase().includes('lulus');
            return !isInactive;
          })
          .map((r: any) => typeof r === 'string' ? r.trim() : String(r.name || r.class_name || r.className || r.class || r.rombel || '').trim())
          .filter(Boolean) as string[];

        const uniqueNames = Array.from(new Set(names)).sort((a, b) => 
          a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
        );
        setMasterRombels(uniqueNames);
      }
    } catch (e) {
      console.error('Gagal mengambil data rombel aktif:', e);
    } finally {
      setRombelLoading(false);
    }
  };

  // Load all data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [schedRes, mapelRes, kbmRes] = await Promise.all([
        axios.get(`/api/jadwal-kbm?teacher_id=${encodeURIComponent(teacherId)}`).catch(() => ({ data: [] })),
        axios.get('/api/mata-pelajaran').catch(() => ({ data: [] })),
        axios.get('/api/kbm/schedules').catch(() => ({ data: [] }))
      ]);

      if (Array.isArray(schedRes.data)) {
        setSchedules(schedRes.data);
      }

      if (Array.isArray(mapelRes.data)) {
        setMasterMapels(mapelRes.data);
      }

      if (Array.isArray(kbmRes.data)) {
        setKbmDaySchedules(kbmRes.data);
      }

      await fetchRombels();
    } catch (e) {
      console.error('Gagal mengambil data jadwal KBM', e);
      toast.error('Gagal memuat jadwal KBM');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teacherId) {
      fetchData();
    }
  }, [teacherId]);

  // Load conflict slots whenever formDays or formRombels change
  useEffect(() => {
    if (!dialogOpen || formDays.length === 0 || formRombels.length === 0) {
      setOccupiedSlots([]);
      return;
    }

    const fetchConflicts = async () => {
      setConflictLoading(true);
      try {
        const allOccupied: any[] = [];
        for (const h of formDays) {
          for (const rombel of formRombels) {
            const res = await axios.get('/api/jadwal-kbm/conflict', {
              params: {
                rombel_id: rombel,
                hari: h,
                exclude_id: editingId || undefined
              }
            });
            if (res.data?.occupiedJps && Array.isArray(res.data.occupiedJps)) {
              res.data.occupiedJps.forEach((occ: any) => {
                allOccupied.push({
                  ...occ,
                  hari: h,
                  rombel_id: rombel
                });
              });
            }
          }
        }
        setOccupiedSlots(allOccupied);
      } catch (e) {
        console.error('Gagal mengecek bentrok jadwal', e);
      } finally {
        setConflictLoading(false);
      }
    };

    fetchConflicts();
  }, [dialogOpen, formDays, formRombels, editingId]);

  // Helper to get active periods for any day
  const getPeriodsForDay = (dayName: string): KbmPeriod[] => {
    const daySched = kbmDaySchedules.find(
      d => d.day_name.toLowerCase() === dayName.toLowerCase()
    );
    if (daySched && daySched.periods && daySched.periods.length > 0) {
      return daySched.periods.filter(p => p.is_teaching !== false && Number(p.jp_number) > 0);
    }
    // Default fallback: 10 JP
    return Array.from({ length: 10 }, (_, i) => ({
      jp_number: i + 1,
      name: `KBM JP ${i + 1}`,
      category_id: 'kbm',
      category_name: 'Kegiatan Belajar Mengajar',
      start_time: `${String(7 + Math.floor((i * 45) / 60)).padStart(2, '0')}:${String((i * 45) % 60).padStart(2, '0')}`,
      end_time: `${String(7 + Math.floor(((i + 1) * 45) / 60)).padStart(2, '0')}:${String(((i + 1) * 45) % 60).padStart(2, '0')}`,
      is_teaching: true
    }));
  };

  // Open Dialog for New Schedule
  const handleOpenAdd = () => {
    setEditingId(null);
    setActiveStep(0);
    setFormMapel('');
    setFormRombels([]);
    setFormDays(['Senin']);
    setActiveDayTab('Senin');
    setActiveRombelBrush('');
    setSlotAssignments({});
    setDialogOpen(true);
    fetchRombels();
  };

  // Open Dialog for Editing
  const handleOpenEdit = (item: JadwalKbm) => {
    setEditingId(item.id);
    setActiveStep(0);
    setFormMapel(item.mapel_name);
    setFormRombels([item.rombel_id]);
    setFormDays([item.hari]);
    setActiveDayTab(item.hari);
    setActiveRombelBrush(item.rombel_id);

    const initialSlots: Record<string, string[]> = {};
    if (Array.isArray(item.jp_list)) {
      item.jp_list.forEach(jp => {
        initialSlots[`${item.hari}_${jp}`] = [item.rombel_id];
      });
    }
    setSlotAssignments(initialSlots);
    setDialogOpen(true);
    fetchRombels();
  };

  // Set specific class for a slot (from dropdown)
  const handleSetSlotClass = (hari: string, jp: number, classVal: string) => {
    const slotKey = `${hari}_${jp}`;
    setSlotAssignments(prev => {
      const next = { ...prev };
      if (!classVal) {
        delete next[slotKey];
      } else if (classVal === '__ALL__') {
        next[slotKey] = [...formRombels];
      } else {
        next[slotKey] = [classVal];
      }
      return next;
    });
  };

  // Bulk set all free slots on a day to a specific class
  const handleSetAllDaySlots = (hari: string, classVal: string) => {
    const dayPeriods = getPeriodsForDay(hari);
    setSlotAssignments(prev => {
      const next = { ...prev };
      dayPeriods.forEach(p => {
        const jp = p.jp_number;
        const isOccupied = occupiedSlots.some(
          o => o.hari === hari && o.jp === jp && o.teacher_id !== teacherId
        );
        if (!isOccupied) {
          const slotKey = `${hari}_${jp}`;
          if (classVal === '__ALL__') {
            next[slotKey] = [...formRombels];
          } else {
            next[slotKey] = [classVal || formRombels[0]];
          }
        }
      });
      return next;
    });
  };

  // Clear all slots on a day
  const handleClearDaySlots = (hari: string) => {
    setSlotAssignments(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (k.startsWith(`${hari}_`)) {
          delete next[k];
        }
      });
      return next;
    });
  };

  // Form Submission
  const handleSubmit = async () => {
    if (!formMapel.trim()) {
      toast.error('Silakan pilih atau masukkan mata pelajaran');
      setActiveStep(0);
      return;
    }
    if (formRombels.length === 0) {
      toast.error('Silakan pilih minimal satu rombongan belajar / kelas');
      setActiveStep(1);
      return;
    }
    if (formDays.length === 0) {
      toast.error('Silakan pilih minimal satu hari mengajar');
      setActiveStep(2);
      return;
    }

    // Group slotAssignments into schedule entries by (rombel_id, hari)
    const groupedMap = new Map<string, Set<number>>();

    for (const [slotKey, classArr] of Object.entries(slotAssignments)) {
      if (!Array.isArray(classArr) || classArr.length === 0) continue;
      const [hari, jpStr] = slotKey.split('_');
      const jpNum = Number(jpStr);
      if (!hari || isNaN(jpNum) || !formDays.includes(hari)) continue;

      for (const rombelId of classArr) {
        if (!formRombels.includes(rombelId)) continue;
        const groupKey = `${rombelId}|||${hari}`;
        if (!groupedMap.has(groupKey)) {
          groupedMap.set(groupKey, new Set<number>());
        }
        groupedMap.get(groupKey)!.add(jpNum);
      }
    }

    if (groupedMap.size === 0) {
      toast.error('Belum ada slot JP & kelas yang dialokasikan. Silakan alokasikan kelas pada slot JP di hari terpilih.');
      setActiveStep(2);
      return;
    }

    const batchSchedules: any[] = [];
    for (const [groupKey, jpSet] of groupedMap.entries()) {
      const [rombelId, hari] = groupKey.split('|||');
      const sortedJps = Array.from(jpSet).sort((a, b) => a - b);
      batchSchedules.push({
        teacher_id: teacherId,
        teacher_name: teacherName,
        mapel_name: formMapel.trim(),
        rombel_id: rombelId,
        hari,
        jp_list: sortedJps
      });
    }

    setSubmitting(true);
    try {
      if (editingId && batchSchedules.length === 1) {
        await axios.put(`/api/jadwal-kbm/${editingId}`, {
          teacher_id: teacherId,
          teacher_name: teacherName,
          mapel_name: formMapel.trim(),
          rombel_id: batchSchedules[0].rombel_id,
          hari: batchSchedules[0].hari,
          jp_list: batchSchedules[0].jp_list
        });
        toast.success('Jadwal KBM berhasil diperbarui');
      } else {
        await axios.post('/api/jadwal-kbm/batch', {
          schedules: batchSchedules
        });
        toast.success(`Berhasil mendaftarkan ${batchSchedules.length} entri jadwal KBM`);
      }
      setDialogOpen(false);
      fetchData();
    } catch (e: any) {
      console.error(e);
      const errMsg = e.response?.data?.error || 'Gagal menyimpan jadwal KBM';
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Schedule
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await axios.delete(`/api/jadwal-kbm/${deleteId}`);
      toast.success('Jadwal KBM berhasil dihapus');
      setDeleteId(null);
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Gagal menghapus jadwal');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      const matchHari = filterHari === 'all' || s.hari === filterHari;
      const matchRombel = filterRombel === 'all' || s.rombel_id === filterRombel;
      const matchSearch =
        !searchQuery.trim() ||
        s.mapel_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.rombel_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.hari.toLowerCase().includes(searchQuery.toLowerCase());
      return matchHari && matchRombel && matchSearch;
    });
  }, [schedules, filterHari, filterRombel, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const totalJp = schedules.reduce((acc, curr) => acc + (curr.jp_list?.length || 0), 0);
    const uniqueClasses = new Set(schedules.map(s => s.rombel_id)).size;
    const uniqueSubjects = new Set(schedules.map(s => s.mapel_name)).size;
    return {
      totalSchedules: schedules.length,
      totalJp,
      uniqueClasses,
      uniqueSubjects
    };
  }, [schedules]);

  // Steps
  const steps = ['Pilih Mata Pelajaran', 'Pilih Kelas / Rombel', 'Pilih Hari & Slot JP'];

  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Header Banner */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3 },
          borderRadius: 3,
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#ffffff',
          mb: 3,
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)'
        }}
      >
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Box
                sx={{
                  p: 1.2,
                  bgcolor: 'rgba(59, 130, 246, 0.2)',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  color: '#60a5fa'
                }}
              >
                <ScheduleIcon sx={{ fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                  Jadwal JP KBM Guru
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8, fontSize: '0.85rem' }}>
                  Atur alokasi jam pelajaran (JP) mengajar Anda pada tiap rombongan belajar secara terpadu.
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, gap: 1.5 }}>
            <Button
              variant="outlined"
              onClick={fetchData}
              startIcon={<RefreshIcon />}
              sx={{
                color: '#ffffff',
                borderColor: 'rgba(255,255,255,0.3)',
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { borderColor: '#ffffff', bgcolor: 'rgba(255,255,255,0.08)' }
              }}
            >
              Segarkan
            </Button>
            <Button
              variant="contained"
              onClick={handleOpenAdd}
              startIcon={<AddIcon />}
              sx={{
                bgcolor: '#2563eb',
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700,
                px: 2.5,
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                '&:hover': { bgcolor: '#1d4ed8' }
              }}
            >
              Tambah Jadwal KBM
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card sx={{ borderRadius: 2.5, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>
                Total Sesi Jadwal
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', mt: 0.5 }}>
                {stats.totalSchedules} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>Sesi</span>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card sx={{ borderRadius: 2.5, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" sx={{ color: '#2563eb', fontWeight: 700, textTransform: 'uppercase' }}>
                Beban Mengajar
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#2563eb', mt: 0.5 }}>
                {stats.totalJp} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>JP / Pekan</span>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card sx={{ borderRadius: 2.5, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 700, textTransform: 'uppercase' }}>
                Rombel Diampu
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#16a34a', mt: 0.5 }}>
                {stats.uniqueClasses} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>Kelas</span>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card sx={{ borderRadius: 2.5, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" sx={{ color: '#9333ea', fontWeight: 700, textTransform: 'uppercase' }}>
                Mata Pelajaran
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#9333ea', mt: 0.5 }}>
                {stats.uniqueSubjects} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>Mapel</span>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters & Search */}
      <Paper sx={{ p: 2, borderRadius: 3, border: `1px solid ${preset.glassBorder}`, bgcolor: preset.cardBg, backdropFilter: 'blur(16px)', boxShadow: preset.glassShadow, mb: 3 }}>
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Cari mata pelajaran, kelas, hari..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: preset.textColorSecondary, fontSize: 20 }} />
                    </InputAdornment>
                  )
                }
              }}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Filter Hari"
              value={filterHari}
              onChange={e => setFilterHari(e.target.value)}
              slotProps={{ select: { native: true } }}
            >
              <option value="all">Semua Hari Aktif</option>
              {HARI_LIST.map(h => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Filter Rombel"
              value={filterRombel}
              onChange={e => setFilterRombel(e.target.value)}
              slotProps={{ select: { native: true } }}
            >
              <option value="all">Semua Rombel</option>
              {masterRombels.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {/* Table of Schedules */}
      <Paper sx={{ borderRadius: 3, border: `1px solid ${preset.glassBorder}`, bgcolor: preset.cardBg, backdropFilter: 'blur(16px)', boxShadow: preset.glassShadow, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress size={32} />
            <Typography variant="body2" sx={{ mt: 1.5, color: preset.textColorSecondary }}>
              Memuat data jadwal KBM...
            </Typography>
          </Box>
        ) : filteredSchedules.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CalendarIcon sx={{ fontSize: 48, color: preset.textColorSecondary, mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: preset.textColorPrimary }}>
              Belum Ada Jadwal KBM Terdaftar
            </Typography>
            <Typography variant="body2" sx={{ color: preset.textColorSecondary, maxWidth: 450, mx: 'auto', mt: 0.5, mb: 2 }}>
              Daftarkan jadwal jam mengajar Anda agar sistem presensi KBM dapat otomatis menyajikan sesi kelas Anda setiap harinya.
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, bgcolor: preset.primary }}>
              Tambah Jadwal Sekarang
            </Button>
          </Box>
        ) : (
          <>
            {/* Mobile Cards View (< md) - Redesain Personal Finance Timeline */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.8, p: 1.8 }}>
              {filteredSchedules.map((item) => {
                const dayStyle = HARI_COLORS[item.hari] || { bg: '#f1f5f9', text: '#334155', border: '#e2e8f0' };
                const sortedJps = [...(item.jp_list || [])].sort((a, b) => a - b);
                const minJp = sortedJps[0];
                const maxJp = sortedJps[sortedJps.length - 1];
                const rangeStr = sortedJps.length > 1 ? `JP ${minJp} - ${maxJp}` : `JP ${minJp}`;

                return (
                  <Paper
                    key={item.id}
                    elevation={0}
                    sx={{
                      borderRadius: 3.5,
                      border: `1px solid ${preset.glassBorder}`,
                      bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#ffffff',
                      boxShadow: preset.glassShadow,
                      p: 2,
                      display: 'flex',
                      gap: 2,
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Timeline Line & Dot Indicator */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 0.5, minWidth: 20 }}>
                      <Box
                        sx={{
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          bgcolor: '#0d9488',
                          boxShadow: '0 0 0 4px #ccfbf1',
                          flexShrink: 0
                        }}
                      />
                      <Box
                        sx={{
                          width: 2,
                          flex: 1,
                          bgcolor: '#e2e8f0',
                          mt: 1,
                          borderRadius: 1
                        }}
                      />
                    </Box>

                    {/* Main Content Area */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
                          <Chip
                            label={item.hari}
                            size="small"
                            sx={{
                              bgcolor: dayStyle.bg,
                              color: dayStyle.text,
                              border: `1px solid ${dayStyle.border}`,
                              fontWeight: 900,
                              borderRadius: 2,
                              fontSize: '0.68rem',
                              height: 22
                            }}
                          />
                          <Chip
                            label={`${item.jp_list?.length || 0} JP`}
                            size="small"
                            sx={{
                              bgcolor: '#dcfce7',
                              color: '#15803d',
                              fontWeight: 900,
                              border: '1px solid #86efac',
                              fontSize: '0.68rem',
                              height: 22
                            }}
                          />
                        </Box>
                        <Stack direction="row" spacing={0.5}>
                          <IconButton size="small" color="primary" onClick={() => handleOpenEdit(item)} sx={{ bgcolor: '#eff6ff', p: 0.8, borderRadius: 2 }}>
                            <EditIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => setDeleteId(item.id)} sx={{ bgcolor: '#fef2f2', p: 0.8, borderRadius: 2 }}>
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Stack>
                      </Box>

                      <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0f172a', lineHeight: 1.2, mb: 0.5 }}>
                        {item.mapel_name}
                      </Typography>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.2 }}>
                        <ClassIcon sx={{ fontSize: 16, color: '#2563eb', flexShrink: 0 }} />
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#2563eb' }}>
                          Kelas {item.rombel_id}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1, borderTop: '1px dashed #f1f5f9' }}>
                        <Chip
                          label={rangeStr}
                          size="small"
                          sx={{
                            bgcolor: '#f1f5f9',
                            color: '#0f172a',
                            fontWeight: 800,
                            fontSize: '0.7rem',
                            borderRadius: 1.8
                          }}
                        />
                        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, fontSize: '0.68rem' }}>
                          Alokasi: {sortedJps.map(j => `#${j}`).join(', ')}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                );
              })}
            </Box>

            {/* Desktop Table View (>= md) */}
            <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
              <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.8rem', width: 70 }}>NO</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.8rem', width: 130 }}>HARI</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>ROMBONGAN BELAJAR</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>MATA PELAJARAN</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>SLOT JP MENGAJAR</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.8rem', textAlign: 'center', width: 100 }}>TOTAL JP</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.8rem', textAlign: 'center', width: 140 }}>AKSI</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredSchedules.map((item, idx) => {
                  const dayStyle = HARI_COLORS[item.hari] || { bg: '#f1f5f9', text: '#334155', border: '#e2e8f0' };
                  const sortedJps = [...(item.jp_list || [])].sort((a, b) => a - b);
                  const minJp = sortedJps[0];
                  const maxJp = sortedJps[sortedJps.length - 1];
                  const rangeStr = sortedJps.length > 1 ? `JP ${minJp} - ${maxJp}` : `JP ${minJp}`;

                  return (
                    <TableRow key={item.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>{idx + 1}</TableCell>
                      <TableCell>
                        <Chip
                          label={item.hari}
                          size="small"
                          sx={{
                            bgcolor: dayStyle.bg,
                            color: dayStyle.text,
                            border: `1px solid ${dayStyle.border}`,
                            fontWeight: 800,
                            borderRadius: 1.5
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ClassIcon sx={{ fontSize: 18, color: '#2563eb' }} />
                          <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                            {item.rombel_id}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <SchoolIcon sx={{ fontSize: 18, color: '#9333ea' }} />
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                            {item.mapel_name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
                          <Chip
                            label={rangeStr}
                            size="small"
                            sx={{
                              bgcolor: '#f1f5f9',
                              color: '#0f172a',
                              fontWeight: 800,
                              fontSize: '0.75rem'
                            }}
                          />
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                            (Slot: {sortedJps.map(j => `#${j}`).join(', ')})
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Chip
                          label={`${item.jp_list?.length || 0} JP`}
                          size="small"
                          sx={{
                            bgcolor: '#ecfdf5',
                            color: '#059669',
                            fontWeight: 800,
                            border: '1px solid #a7f3d0'
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
                          <Tooltip title="Edit Jadwal">
                            <IconButton size="small" color="primary" onClick={() => handleOpenEdit(item)} sx={{ bgcolor: '#eff6ff' }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Hapus Jadwal">
                            <IconButton size="small" color="error" onClick={() => setDeleteId(item.id)} sx={{ bgcolor: '#fef2f2' }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </>
        )}
      </Paper>

      {/* ===================================================
          FORMULIR MULTI-LANGKAH (ADD / EDIT DIALOG)
          1. Guru memilih Mata Pelajaran
          2. Guru memilih Kelas/Rombongan Belajar (multiple)
          3. Guru memilih Hari aktif dan mencentang Slot JP
          + Conflict Resolution
         =================================================== */}
      <Dialog
        open={dialogOpen}
        onClose={() => !submitting && setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: { xs: '24px 24px 0 0', md: 3 },
              m: { xs: 0, md: 2 },
              position: { xs: 'fixed', md: 'relative' },
              bottom: { xs: 0, md: 'auto' },
              maxHeight: { xs: '90vh', md: '85vh' },
              width: { xs: '100%', md: 'auto' },
              overflow: 'hidden'
            }
          }
        }}
      >
        <DialogTitle
          sx={{
            p: 2.5,
            bgcolor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
              {editingId ? 'Edit Jadwal JP KBM' : 'Pendaftaran Jadwal JP KBM'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Guru Pengampu: <strong>{teacherName}</strong>
            </Typography>
          </Box>
          <IconButton onClick={() => setDialogOpen(false)} size="small" disabled={submitting}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          {/* Stepper Header */}
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3.5 }}>
            {steps.map((label, idx) => (
              <Step key={label} completed={activeStep > idx}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* STEP 1: MATA PELAJARAN */}
          {activeStep === 0 && (
            <Box>
              <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3, borderRadius: 2 }}>
                Pilih mata pelajaran yang Anda ampu dari daftar master, atau ketik langsung nama mata pelajaran jika belum terdaftar.
              </Alert>

              <Autocomplete
                freeSolo
                options={masterMapels.map(m => m.nama_mapel || m.name || m)}
                value={formMapel}
                onChange={(_, newValue) => setFormMapel(newValue || '')}
                onInputChange={(_, newInputValue) => setFormMapel(newInputValue || '')}
                renderInput={params => (
                  <TextField
                    {...params}
                    label="Nama Mata Pelajaran *"
                    placeholder="Ketik atau pilih mata pelajaran..."
                    fullWidth
                  />
                )}
              />

              {masterMapels.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>
                    Saran Mata Pelajaran Tersedia:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {masterMapels.slice(0, 12).map((m: any, idx: number) => {
                      const name = m.nama_mapel || m.name || m;
                      const isSelected = formMapel.toLowerCase() === name.toLowerCase();
                      return (
                        <Chip
                          key={idx}
                          label={name}
                          onClick={() => setFormMapel(name)}
                          color={isSelected ? 'primary' : 'default'}
                          variant={isSelected ? 'filled' : 'outlined'}
                          sx={{ cursor: 'pointer', fontWeight: 600 }}
                        />
                      );
                    })}
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {/* STEP 2: KELAS / ROMBEL (MULTIPLE SELECT) */}
          {activeStep === 1 && (
            <Box>
              <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3, borderRadius: 2 }}>
                Pilih satu atau beberapa kelas / rombongan belajar yang Anda ajar untuk mata pelajaran ini. Anda dapat mengetik nama kelas, memilih dari daftar dropdown, atau mengklik tombol saran kelas di bawah.
              </Alert>

              <Autocomplete
                multiple
                options={masterRombels}
                value={formRombels}
                loading={rombelLoading}
                loadingText="Memuat data rombongan belajar aktif..."
                onChange={(_, newValue) => setFormRombels(newValue)}
                filterSelectedOptions
                slotProps={{
                  chip: {
                    color: 'primary',
                    sx: { fontWeight: 700, borderRadius: 1.5 }
                  }
                }}
                renderInput={params => (
                  <TextField
                    {...params}
                    label="Pilih Rombongan Belajar (Bisa Lebih Dari Satu) *"
                    placeholder={rombelLoading ? "Memuat data kelas aktif..." : "Ketik atau pilih kelas..."}
                    fullWidth
                  />
                )}
              />

              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  {rombelLoading ? (
                    <>
                      <CircularProgress size={14} /> Memuat kelas aktif dari server...
                    </>
                  ) : (
                    <>
                      Terpilih: <strong>{formRombels.length}</strong> kelas ({masterRombels.length} Rombel Aktif Tersedia)
                    </>
                  )}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    disabled={rombelLoading || masterRombels.length === 0}
                    onClick={() => setFormRombels(masterRombels)}
                    sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.78rem' }}
                  >
                    Pilih Semua Kelas
                  </Button>
                  <Button
                    size="small"
                    color="inherit"
                    disabled={rombelLoading || formRombels.length === 0}
                    onClick={() => setFormRombels([])}
                    sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.78rem' }}
                  >
                    Bersihkan
                  </Button>
                </Stack>
              </Box>

              {/* Pilih Cepat Berdasarkan Tingkat */}
              <Box sx={{ mt: 2.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>
                  Pilih Cepat Berdasarkan Tingkat:
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {['X', 'XI', 'XII'].map(tingkat => {
                    const matched = masterRombels.filter(r => r.startsWith(tingkat));
                    if (matched.length === 0) return null;
                    return (
                      <Chip
                        key={tingkat}
                        label={`Semua Kelas ${tingkat} (${matched.length} Rombel)`}
                        onClick={() => {
                          const combined = Array.from(new Set([...formRombels, ...matched]));
                          setFormRombels(combined);
                        }}
                        sx={{ cursor: 'pointer', fontWeight: 700 }}
                      />
                    );
                  })}
                </Stack>
              </Box>

              {/* Klik Chip Rombel Aktif */}
              {masterRombels.length > 0 && (
                <Box sx={{ mt: 2.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>
                    Saran Rombongan Belajar Aktif (Klik untuk Tambah / Hapus):
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: 160, overflowY: 'auto', p: 1.5, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#f8fafc' }}>
                    {masterRombels.map((rombel, idx) => {
                      const isSelected = formRombels.includes(rombel);
                      return (
                        <Chip
                          key={idx}
                          label={rombel}
                          onClick={() => {
                            if (isSelected) {
                              setFormRombels(prev => prev.filter(r => r !== rombel));
                            } else {
                              setFormRombels(prev => [...prev, rombel]);
                            }
                          }}
                          color={isSelected ? 'primary' : 'default'}
                          variant={isSelected ? 'filled' : 'outlined'}
                          sx={{ cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem' }}
                        />
                      );
                    })}
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {/* STEP 3: PEMETAAN MULTI-HARI & KELAS KE SLOT JP */}
          {activeStep === 2 && (
            <Box>
              <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 2.5, borderRadius: 2 }}>
                Pilih satu atau beberapa hari mengajar di bawah. Pada tiap hari, Anda dapat memetakan kelas ke slot JP menggunakan <strong>Dropdown Terikat per Slot</strong> atau <strong>Kuas Pilih Cepat Kelas</strong>.
              </Alert>

              {/* 1. BAGIAN PILIH MULTI-HARI */}
              <Box sx={{ mb: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarIcon sx={{ fontSize: 18, color: '#2563eb' }} />
                    1. Pilih Hari Aktif Mengajar (Multi-Hari):
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      onClick={() => setFormDays(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'])}
                      sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem' }}
                    >
                      Senin - Jumat
                    </Button>
                    <Button
                      size="small"
                      onClick={() => setFormDays([...HARI_LIST])}
                      sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem' }}
                    >
                      Semua Hari
                    </Button>
                  </Stack>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {HARI_LIST.map(h => {
                    const isSelected = formDays.includes(h);
                    return (
                      <Chip
                        key={h}
                        label={h}
                        onClick={() => {
                          setFormDays(prev => {
                            if (prev.includes(h)) {
                              if (prev.length === 1) return prev;
                              return prev.filter(day => day !== h);
                            } else {
                              return [...prev, h];
                            }
                          });
                          setActiveDayTab(h);
                        }}
                        color={isSelected ? 'primary' : 'default'}
                        variant={isSelected ? 'filled' : 'outlined'}
                        sx={{
                          fontWeight: 800,
                          px: 1,
                          py: 2,
                          borderRadius: 2,
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      />
                    );
                  })}
                </Box>
              </Box>

              {/* 2. DUA PENDEKATAN PEMETAAN: KARTU KELAS (DRAG & DROP / KUAS) & DROPDOWN TERIKAT */}
              {formRombels.length > 0 && (
                <Box
                  sx={{
                    mb: 3,
                    p: 2.5,
                    bgcolor: isDark ? 'rgba(30, 58, 138, 0.25)' : '#eff6ff',
                    borderRadius: 3,
                    border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.3)' : '#bfdbfe'}`,
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.06)'
                  }}
                >
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isDark ? '#93c5fd' : '#1e40af', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AutoAwesomeIcon sx={{ fontSize: 18, color: preset.primary }} />
                      2. Pemetaan Kelas ke Slot JP (Dukungan Opsi A: Drag & Drop dan Opsi B: Dropdown Terikat):
                    </Typography>
                    <Typography variant="caption" sx={{ color: isDark ? '#cbd5e1' : '#334155', display: 'block', mt: 0.5 }}>
                      • <strong>Opsi A (Drag & Drop):</strong> Geser & lepaskan (drag & drop) kartu kelas di bawah langsung ke dalam kotak slot JP hari yang dituju.<br />
                      • <strong>Opsi B (Dropdown Terikat):</strong> Atau pilih langsung nama kelas melalui dropdown di dalam tiap kotak slot JP.<br />
                      • <em>Tips:</em> Anda juga dapat mengklik salah satu kartu kelas untuk mengaktifkan "Kuas Cepat", lalu cukup klik slot JP mana saja.
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.2, alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: isDark ? '#94a3b8' : '#475569', mr: 0.5 }}>
                      Kartu Kelas:
                    </Typography>
                    {formRombels.map(r => {
                      const isActive = activeRombelBrush === r;
                      return (
                        <Paper
                          key={r}
                          elevation={isActive ? 3 : 1}
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', r);
                            e.dataTransfer.effectAllowed = 'copy';
                          }}
                          onClick={() => setActiveRombelBrush(isActive ? '' : r)}
                          sx={{
                            px: 1.8,
                            py: 0.8,
                            borderRadius: 2,
                            cursor: 'grab',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 1,
                            userSelect: 'none',
                            bgcolor: isActive ? preset.primary : (isDark ? 'rgba(255, 255, 255, 0.08)' : '#ffffff'),
                            color: isActive ? '#ffffff' : preset.textColorPrimary,
                            border: isActive ? `2px solid ${preset.primary}` : `1px solid ${preset.glassBorder}`,
                            transition: 'all 0.15s ease',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)'
                            },
                            '&:active': {
                              cursor: 'grabbing'
                            }
                          }}
                        >
                          <LayersIcon sx={{ fontSize: 16, color: isActive ? '#ffffff' : preset.primary }} />
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>
                            Kelas {r}
                          </Typography>
                          <Chip
                            label="Tarik ke JP"
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              bgcolor: isActive ? 'rgba(255,255,255,0.2)' : (isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9'),
                              color: isActive ? '#ffffff' : preset.textColorSecondary
                            }}
                          />
                        </Paper>
                      );
                    })}

                    {formRombels.length > 1 && (
                      <Paper
                        elevation={activeRombelBrush === '__ALL__' ? 3 : 1}
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', '__ALL__');
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        onClick={() => setActiveRombelBrush(activeRombelBrush === '__ALL__' ? '' : '__ALL__')}
                        sx={{
                          px: 1.8,
                          py: 0.8,
                          borderRadius: 2,
                          cursor: 'grab',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 1,
                          userSelect: 'none',
                          bgcolor: activeRombelBrush === '__ALL__' ? '#8b5cf6' : (isDark ? 'rgba(139, 92, 246, 0.15)' : '#faf5ff'),
                          color: activeRombelBrush === '__ALL__' ? '#ffffff' : '#7c3aed',
                          border: activeRombelBrush === '__ALL__' ? '2px solid #7c3aed' : '1px solid #d8b4fe',
                          transition: 'all 0.15s ease',
                          '&:hover': { transform: 'translateY(-2px)' },
                          '&:active': { cursor: 'grabbing' }
                        }}
                      >
                        <AutoAwesomeIcon sx={{ fontSize: 16 }} />
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                          Semua Kelas Terpilih ({formRombels.length})
                        </Typography>
                        <Chip
                          label="Gabungan"
                          size="small"
                          sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: 'rgba(255,255,255,0.25)', color: activeRombelBrush === '__ALL__' ? '#fff' : '#7c3aed' }}
                        />
                      </Paper>
                    )}
                  </Box>
                </Box>
              )}

              {/* 3. PEMETAAN SLOT JP HARI TERPILIH (DAY TABS) */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs
                  value={formDays.includes(activeDayTab) ? activeDayTab : formDays[0] || 'Senin'}
                  onChange={(_, val) => setActiveDayTab(val)}
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  {formDays.map(day => {
                    const daySlotsCount = Object.keys(slotAssignments).filter(k => k.startsWith(`${day}_`) && slotAssignments[k]?.length > 0).length;
                    return (
                      <Tab
                        key={day}
                        value={day}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span>{day}</span>
                            <Chip
                              label={`${daySlotsCount} JP`}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                bgcolor: daySlotsCount > 0 ? '#dcfce7' : '#f1f5f9',
                                color: daySlotsCount > 0 ? '#15803d' : '#64748b'
                              }}
                            />
                          </Box>
                        }
                        sx={{ fontWeight: 800, textTransform: 'none' }}
                      />
                    );
                  })}
                </Tabs>
              </Box>

              {/* RENDER ACTIVE DAY SLOT MATRIX */}
              {(() => {
                const dayToRender = formDays.includes(activeDayTab) ? activeDayTab : formDays[0];
                if (!dayToRender) return null;

                const dayPeriods = getPeriodsForDay(dayToRender);

                return (
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        Slot Jam Pelajaran Hari {dayToRender}:
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<AutoAwesomeIcon />}
                          onClick={() => handleSetAllDaySlots(dayToRender, activeRombelBrush || formRombels[0] || '__ALL__')}
                          sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', borderRadius: 1.5 }}
                        >
                          Isi Semua Slot ({activeRombelBrush || formRombels[0] || 'Kelas'})
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          startIcon={<DeleteSweepIcon />}
                          onClick={() => handleClearDaySlots(dayToRender)}
                          sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem' }}
                        >
                          Kosongkan Hari Ini
                        </Button>
                      </Stack>
                    </Box>

                    {conflictLoading && (
                      <Alert severity="warning" icon={<CircularProgress size={16} />} sx={{ mb: 2, py: 0.5 }}>
                        Memeriksa ketersediaan slot JP di database...
                      </Alert>
                    )}

                    <Grid container spacing={1.5}>
                      {dayPeriods.map(period => {
                        const jpNum = period.jp_number;
                        const slotKey = `${dayToRender}_${jpNum}`;
                        const currentClasses = slotAssignments[slotKey] || [];
                        const isBeingDraggedOver = dragOverSlot === slotKey;

                        // Conflict check
                        const conflictInfo = occupiedSlots.find(
                          o => o.hari === dayToRender && o.jp === jpNum && o.teacher_id !== teacherId
                        );
                        const isLocked = Boolean(conflictInfo);

                        return (
                          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={jpNum}>
                            <Paper
                              onDragOver={(e) => {
                                if (!isLocked) {
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = 'copy';
                                  if (dragOverSlot !== slotKey) setDragOverSlot(slotKey);
                                }
                              }}
                              onDragLeave={() => {
                                if (dragOverSlot === slotKey) setDragOverSlot(null);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                setDragOverSlot(null);
                                if (!isLocked) {
                                  const droppedVal = e.dataTransfer.getData('text/plain');
                                  if (droppedVal && (formRombels.includes(droppedVal) || droppedVal === '__ALL__')) {
                                    handleSetSlotClass(dayToRender, jpNum, droppedVal);
                                    toast.success(`Kelas ${droppedVal === '__ALL__' ? 'Semua' : droppedVal} dialokasikan ke JP ${jpNum} (${dayToRender})`);
                                  }
                                }
                              }}
                              sx={{
                                p: 1.5,
                                borderRadius: 2.5,
                                border: isLocked
                                  ? '1.5px dashed #fca5a5'
                                  : isBeingDraggedOver
                                  ? `2px dashed ${preset.primary}`
                                  : currentClasses.length > 0
                                  ? `2px solid ${preset.primary}`
                                  : `1px solid ${preset.glassBorder}`,
                                bgcolor: isLocked
                                  ? (isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2')
                                  : isBeingDraggedOver
                                  ? (isDark ? 'rgba(56, 189, 248, 0.2)' : '#dbeafe')
                                  : currentClasses.length > 0
                                  ? (isDark ? 'rgba(37, 99, 235, 0.18)' : '#eff6ff')
                                  : preset.cardBg,
                                transform: isBeingDraggedOver ? 'scale(1.02)' : 'none',
                                boxShadow: isBeingDraggedOver ? preset.accentGlow : preset.glassShadow,
                                transition: 'all 0.15s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 1
                              }}
                            >
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                  <Typography
                                    variant="subtitle2"
                                    sx={{
                                      fontWeight: 800,
                                      color: isLocked ? '#ef4444' : currentClasses.length > 0 ? preset.primary : preset.textColorPrimary
                                    }}
                                  >
                                    JP {jpNum}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: preset.textColorSecondary, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <AccessTimeIcon sx={{ fontSize: 12 }} />
                                    {period.start_time} - {period.end_time}
                                  </Typography>
                                </Box>

                                {isLocked ? (
                                  <Chip
                                    icon={<LockIcon sx={{ fontSize: '13px !important' }} />}
                                    label="Terisi Guru Lain"
                                    size="small"
                                    color="error"
                                    sx={{ height: 22, fontSize: '0.65rem', fontWeight: 800 }}
                                  />
                                ) : isBeingDraggedOver ? (
                                  <Chip
                                    label="Lepas Disini!"
                                    size="small"
                                    color="primary"
                                    sx={{ height: 22, fontSize: '0.65rem', fontWeight: 800 }}
                                  />
                                ) : currentClasses.length > 0 ? (
                                  <Chip
                                    label={`${currentClasses.length} Kelas`}
                                    size="small"
                                    color="primary"
                                    sx={{ height: 22, fontSize: '0.65rem', fontWeight: 800 }}
                                  />
                                ) : (
                                  <Chip
                                    label="Kosong (Tarik / Pilih)"
                                    size="small"
                                    sx={{ height: 22, fontSize: '0.65rem', bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', color: preset.textColorSecondary }}
                                  />
                                )}
                              </Box>

                              {/* Lock warning or Dropdown Terikat (Opsi B) */}
                              {isLocked ? (
                                <Alert severity="error" sx={{ py: 0.2, px: 1, fontSize: '0.72rem', borderRadius: 1.5 }}>
                                  <strong>{conflictInfo?.teacher_name}</strong> ({conflictInfo?.mapel_name})
                                </Alert>
                              ) : (
                                <FormControl size="small" fullWidth>
                                  <Select
                                    value={
                                      currentClasses.length === formRombels.length && formRombels.length > 1
                                        ? '__ALL__'
                                        : currentClasses[0] || ''
                                    }
                                    onChange={e => handleSetSlotClass(dayToRender, jpNum, e.target.value)}
                                    displayEmpty
                                    sx={{
                                      fontSize: '0.82rem',
                                      fontWeight: 700,
                                      borderRadius: 1.5,
                                      bgcolor: currentClasses.length > 0 ? (isDark ? 'rgba(255,255,255,0.08)' : '#ffffff') : (isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc'),
                                      color: preset.textColorPrimary,
                                      '& fieldset': { borderColor: preset.glassBorder }
                                    }}
                                  >
                                    <MenuItem value="">
                                      <em>-- Dikosongkan --</em>
                                    </MenuItem>
                                    {formRombels.length > 1 && (
                                      <MenuItem value="__ALL__" sx={{ fontWeight: 800, color: preset.primary }}>
                                        Semua Kelas Terpilih ({formRombels.length})
                                      </MenuItem>
                                    )}
                                    {formRombels.map(r => (
                                      <MenuItem key={r} value={r} sx={{ fontWeight: 700 }}>
                                        Kelas {r}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              )}
                            </Paper>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Box>
                );
              })()}

              {/* 4. SUMMARY / RINGKASAN PEMETAAN TERJADWAL */}
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: '#f8fafc' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LayersIcon sx={{ fontSize: 18, color: '#2563eb' }} />
                  Ringkasan Pemetaan Jadwal Dibuat:
                </Typography>

                {(() => {
                  const summaryMap = new Map<string, string[]>();
                  let totalCount = 0;

                  for (const [slotKey, classArr] of Object.entries(slotAssignments)) {
                    if (!Array.isArray(classArr) || classArr.length === 0) continue;
                    const [hari, jpStr] = slotKey.split('_');
                    if (!formDays.includes(hari)) continue;

                    classArr.forEach(r => {
                      if (!formRombels.includes(r)) return;
                      const k = `${hari}|||${r}`;
                      if (!summaryMap.has(k)) summaryMap.set(k, []);
                      summaryMap.get(k)!.push(`JP ${jpStr}`);
                      totalCount++;
                    });
                  }

                  if (summaryMap.size === 0) {
                    return (
                      <Typography variant="caption" sx={{ color: '#ef4444', fontWeight: 700 }}>
                        Belum ada slot JP yang dialokasikan ke kelas. Silakan pilih kelas pada slot JP di atas.
                      </Typography>
                    );
                  }

                  return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {Array.from(summaryMap.entries()).map(([k, jps], idx) => {
                          const [hari, rombel] = k.split('|||');
                          return (
                            <Chip
                              key={idx}
                              label={`${hari} | ${rombel}: ${jps.join(', ')} (${jps.length} JP)`}
                              size="small"
                              sx={{ bgcolor: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', fontWeight: 700 }}
                            />
                          );
                        })}
                      </Box>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: '#059669', mt: 0.5 }}>
                        Total: {summaryMap.size} entri jadwal ({totalCount} Total Jam Pelajaran KBM) akan didaftarkan sekaligus.
                      </Typography>
                    </Box>
                  );
                })()}
              </Paper>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', justifyContent: 'space-between' }}>
          <Button
            onClick={() => {
              if (activeStep === 0) {
                setDialogOpen(false);
              } else {
                setActiveStep(prev => prev - 1);
              }
            }}
            startIcon={activeStep > 0 ? <ArrowBackIcon /> : null}
            disabled={submitting}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {activeStep === 0 ? 'Batal' : 'Sebelumnya'}
          </Button>

          <Box sx={{ display: 'flex', gap: 1.5 }}>
            {activeStep < steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={() => {
                  if (activeStep === 0) {
                    if (!formMapel.trim()) {
                      toast.error('Silakan isi atau pilih mata pelajaran terlebih dahulu');
                      return;
                    }
                    setActiveStep(1);
                  } else if (activeStep === 1) {
                    if (formRombels.length === 0) {
                      toast.error('Silakan pilih minimal satu rombel / kelas');
                      return;
                    }
                    setActiveStep(2);
                  }
                }}
                endIcon={<ArrowForwardIcon />}
                sx={{
                  bgcolor: '#2563eb',
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: 2,
                  px: 2.5
                }}
              >
                Lanjutkan
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={submitting || Object.keys(slotAssignments).length === 0}
                startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <CheckCircleIcon />}
                sx={{
                  bgcolor: '#16a34a',
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: 2,
                  px: 3,
                  '&:hover': { bgcolor: '#15803d' }
                }}
              >
                {submitting ? 'Menyimpan...' : editingId ? 'Perbarui Jadwal' : 'Simpan Jadwal KBM'}
              </Button>
            )}
          </Box>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteId)}
        onClose={() => !deleting && setDeleteId(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ p: 2.5, fontWeight: 800 }}>Hapus Jadwal KBM?</DialogTitle>
        <DialogContent sx={{ p: 2.5, pt: 0 }}>
          <Typography variant="body2" color="text.secondary">
            Apakah Anda yakin ingin menghapus jadwal ini? Tindakan ini akan mengosongkan slot JP tersebut sehingga dapat diambil kembali oleh guru lain.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setDeleteId(null)} disabled={deleting} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Batal
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            {deleting ? 'Menghapus...' : 'Ya, Hapus'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
