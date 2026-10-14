import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

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
  Avatar,
  Card,
  CardContent,
  Tooltip,
  MenuItem,
  CircularProgress,
  LinearProgress,
  Grid,
  Alert,
  Tabs,
  Tab,
  InputAdornment,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Autocomplete
} from '@mui/material';

// Icons
import {
  EventNote as EventNoteIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  Badge as BadgeIcon,
  Today as TodayIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  OpenInNew as OpenInNewIcon,
  Schedule as ScheduleIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
  VpnKey as KeyIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  FormatListBulleted as ListIcon,
  Info as InfoIcon,
  Save as SaveIcon
} from '@mui/icons-material';

import { safeStorage } from '../../safeStorage';

interface PiketScheduleItem {
  id: string;
  day_name: string;
  day_index: number;
  teacher_id: string;
  teacher_name: string;
  nip: string;
  whatsapp?: string;
  class?: string;
  keterangan: string;
  has_account?: boolean;
  username?: string;
  account_status?: string;
  created_at?: string;
}

interface Teacher {
  id: string;
  name: string;
  nip?: string;
  whatsapp?: string;
  class?: string;
  status?: string;
}

interface PiketDuty {
  id: string;
  name: string;
  description?: string;
}

const DEFAULT_ACTIVE_DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
const ALL_DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export default function GuruPiketDB() {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<PiketScheduleItem[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [duties, setDuties] = useState<PiketDuty[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState('Senin');
  const [searchFilter, setSearchFilter] = useState('');

  // Active days configured in school settings (Senin-Jumat)
  const [activeDays, setActiveDays] = useState<string[]>(DEFAULT_ACTIVE_DAYS);

  // Modern progress bar states
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');

  // Add / Edit Schedule Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalForm, setModalForm] = useState({
    day_name: 'Senin',
    teacher_id: '',
    keterangan: 'Guru Piket'
  });

  // Delete Confirmation State
  const [deleteDialogItem, setDeleteDialogItem] = useState<PiketScheduleItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Master Tugas / Keterangan Piket Manager State
  const [dutyManagerOpen, setDutyManagerOpen] = useState(false);
  const [dutyFormOpen, setDutyFormOpen] = useState(false);
  const [editingDuty, setEditingDuty] = useState<PiketDuty | null>(null);
  const [dutyForm, setDutyForm] = useState({ name: '', description: '' });
  const [savingDuty, setSavingDuty] = useState(false);
  const [deletingDutyId, setDeletingDutyId] = useState<string | null>(null);

  // Modern Status Popup Notification
  const [statusPopup, setStatusPopup] = useState<{
    open: boolean;
    title: string;
    message: string;
    type: 'success' | 'info' | 'warning' | 'error';
  }>({
    open: false,
    title: '',
    message: '',
    type: 'success'
  });

  // Current day in Jakarta time
  const daysIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const nowJakarta = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  const todayName = daysIndo[nowJakarta.getDay()];

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [schedRes, teacherRes, dutiesRes, settingsRes] = await Promise.all([
        axios.get('/api/piket-schedule'),
        axios.get('/api/teachers'),
        axios.get('/api/piket-duties').catch(() => ({ data: { data: [] } })),
        axios.get('/api/settings').catch(() => ({ data: {} }))
      ]);

      if (schedRes.data && schedRes.data.data) {
        setSchedules(schedRes.data.data);
        safeStorage.setJSON('cached_piket_schedules', schedRes.data.data);
      }

      if (Array.isArray(teacherRes.data)) {
        setTeachers(teacherRes.data);
        safeStorage.setJSON('cached_teachers_list', teacherRes.data);
      }

      if (dutiesRes.data && dutiesRes.data.data && Array.isArray(dutiesRes.data.data)) {
        setDuties(dutiesRes.data.data);
      }

      // Sync active days with settings (defaults to Senin-Jumat)
      const st = settingsRes.data || {};
      let days = DEFAULT_ACTIVE_DAYS;
      if (st.active_days && Array.isArray(st.active_days) && st.active_days.length > 0) {
        days = st.active_days;
      } else if (st.attendance_days && Array.isArray(st.attendance_days) && st.attendance_days.length > 0) {
        days = st.attendance_days;
      }
      setActiveDays(days);

      // Adjust selected day only if current selectedDay is not in active days
      setSelectedDay(current => {
        if (current && days.includes(current)) {
          return current;
        }
        if (days.includes(todayName)) {
          return todayName;
        }
        return days[0] || 'Senin';
      });
    } catch (err) {
      const cachedSched = safeStorage.getJSON('cached_piket_schedules', []);
      const cachedTeachers = safeStorage.getJSON('cached_teachers_list', []);
      if (cachedSched.length > 0) setSchedules(cachedSched);
      if (cachedTeachers.length > 0) setTeachers(cachedTeachers);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = async () => {
    setIsProcessing(true);
    setProgressValue(30);
    setProgressLabel('Memperbarui data jadwal & guru piket...');
    try {
      await new Promise(r => setTimeout(r, 200));
      setProgressValue(70);
      await fetchData(true);
      setProgressValue(100);
      toast.success('Data jadwal piket berhasil disegarkan');
    } catch (err) {
      toast.error('Gagal menyegarkan data');
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setProgressValue(0);
        setProgressLabel('');
      }, 300);
    }
  };

  const openAddModal = (day: string) => {
    setIsEditing(false);
    setEditingId(null);
    const dayToUse = day || selectedDay || 'Senin';
    const defaultDuty = duties.length > 0 ? duties[0].name : 'Guru Piket';
    setModalForm({
      day_name: dayToUse,
      teacher_id: '',
      keterangan: defaultDuty
    });
    setModalOpen(true);
  };

  const openEditModal = (item: PiketScheduleItem) => {
    setIsEditing(true);
    setEditingId(item.id);
    setModalForm({
      day_name: item.day_name,
      teacher_id: item.teacher_id,
      keterangan: item.keterangan || 'Guru Piket'
    });
    setModalOpen(true);
  };

  const handleSaveModal = async () => {
    if (!modalForm.teacher_id) {
      toast.error('Silakan pilih atau cari guru terlebih dahulu');
      return;
    }

    const targetDay = modalForm.day_name;
    setSaving(true);
    setIsProcessing(true);
    setProgressValue(40);
    setProgressLabel('Menyimpan jadwal guru piket...');

    try {
      if (isEditing && editingId) {
        const res = await axios.put(`/api/piket-schedule/${editingId}`, {
          day_name: modalForm.day_name,
          teacher_id: modalForm.teacher_id,
          keterangan: modalForm.keterangan
        });
        setProgressValue(100);
        if (res.data && res.data.success) {
          const selectedTeacher = teachers.find(t => t.id === modalForm.teacher_id);
          const teacherName = selectedTeacher?.name || 'Guru';
          toast.success(res.data.message || 'Jadwal piket berhasil diperbarui');
          setStatusPopup({
            open: true,
            title: 'Jadwal Piket Berhasil Diperbarui',
            message: `Tugas piket untuk ${teacherName} pada hari ${modalForm.day_name} sebagai "${modalForm.keterangan}" telah disimpan.`,
            type: 'success'
          });
          setModalOpen(false);
          setSelectedDay(targetDay);
          await fetchData(true);
          setSelectedDay(targetDay);
        }
      } else {
        const res = await axios.post('/api/piket-schedule', {
          day_name: modalForm.day_name,
          teacher_id: modalForm.teacher_id,
          keterangan: modalForm.keterangan
        });
        setProgressValue(100);
        if (res.data && res.data.success) {
          const selectedTeacher = teachers.find(t => t.id === modalForm.teacher_id);
          const teacherName = selectedTeacher?.name || 'Guru';
          toast.success(res.data.message || 'Guru piket berhasil ditambahkan');
          setStatusPopup({
            open: true,
            title: 'Guru Piket Berhasil Ditambahkan',
            message: `Bapak/Ibu ${teacherName} berhasil dijadwalkan piket pada hari ${modalForm.day_name} dengan tugas "${modalForm.keterangan}". Akun guru kini memiliki akses portal piket di hari tersebut.`,
            type: 'success'
          });
          setModalOpen(false);
          setSelectedDay(targetDay);
          await fetchData(true);
          setSelectedDay(targetDay);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan jadwal piket');
    } finally {
      setSaving(false);
      setIsProcessing(false);
      setProgressValue(0);
      setProgressLabel('');
    }
  };

  const handleDeleteSchedule = async () => {
    if (!deleteDialogItem) return;
    setDeleting(true);
    setIsProcessing(true);
    setProgressValue(50);
    setProgressLabel(`Menghapus jadwal piket ${deleteDialogItem.teacher_name}...`);

    try {
      const res = await axios.delete(`/api/piket-schedule/${deleteDialogItem.id}`);
      setProgressValue(100);
      if (res.data && res.data.success) {
        toast.success(`Jadwal piket ${deleteDialogItem.teacher_name} berhasil dihapus`);
        setStatusPopup({
          open: true,
          title: 'Jadwal Piket Dihapus',
          message: `Penugasan piket untuk ${deleteDialogItem.teacher_name} pada hari ${deleteDialogItem.day_name} telah dihapus dari sistem.`,
          type: 'info'
        });
        setDeleteDialogItem(null);
        await fetchData(true);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal menghapus jadwal piket');
    } finally {
      setDeleting(false);
      setIsProcessing(false);
      setProgressValue(0);
      setProgressLabel('');
    }
  };

  // Master Duties Manager Handlers
  const openAddDutyModal = () => {
    setEditingDuty(null);
    setDutyForm({ name: '', description: '' });
    setDutyFormOpen(true);
  };

  const openEditDutyModal = (duty: PiketDuty) => {
    setEditingDuty(duty);
    setDutyForm({ name: duty.name, description: duty.description || '' });
    setDutyFormOpen(true);
  };

  const handleSaveDuty = async () => {
    if (!dutyForm.name.trim()) {
      toast.error('Nama tugas / keterangan wajib diisi');
      return;
    }

    setSavingDuty(true);
    try {
      if (editingDuty) {
        const res = await axios.put(`/api/piket-duties/${editingDuty.id}`, {
          name: dutyForm.name.trim(),
          description: dutyForm.description.trim()
        });
        if (res.data && res.data.success) {
          toast.success('Pilihan tugas piket berhasil diperbarui');
          setDutyFormOpen(false);
          await fetchData(true);
        }
      } else {
        const res = await axios.post('/api/piket-duties', {
          name: dutyForm.name.trim(),
          description: dutyForm.description.trim()
        });
        if (res.data && res.data.success) {
          toast.success('Pilihan tugas piket baru berhasil ditambahkan');
          setDutyFormOpen(false);
          await fetchData(true);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan tugas piket');
    } finally {
      setSavingDuty(false);
    }
  };

  const handleDeleteDuty = async (id: string, name: string) => {
    setDeletingDutyId(id);
    try {
      const res = await axios.delete(`/api/piket-duties/${id}`);
      if (res.data && res.data.success) {
        toast.success(`Tugas "${name}" berhasil dihapus`);
        await fetchData(true);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal menghapus tugas piket');
    } finally {
      setDeletingDutyId(null);
    }
  };

  // Day specific schedules
  const currentDaySchedules = schedules.filter(s => s.day_name.toLowerCase() === selectedDay.toLowerCase());
  const filteredCurrentDaySchedules = currentDaySchedules.filter(s => {
    const q = searchFilter.toLowerCase();
    return (
      (s.teacher_name || '').toLowerCase().includes(q) ||
      (s.nip || '').toLowerCase().includes(q) ||
      (s.keterangan || '').toLowerCase().includes(q) ||
      (s.username || '').toLowerCase().includes(q)
    );
  });

  // Count stats
  const totalDutyAssignments = schedules.length;
  const todayAssignedCount = schedules.filter(s => s.day_name.toLowerCase() === todayName.toLowerCase()).length;
  const uniqueTeachersInSchedule = new Set(schedules.map(s => s.teacher_id)).size;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, position: 'relative' }}>
      {/* Top Linear Progress Bar */}
      {isProcessing && (
        <Box sx={{ width: '100%', position: 'sticky', top: 0, zIndex: 1100, mb: 2 }}>
          <LinearProgress
            variant={progressValue > 0 ? 'determinate' : 'indeterminate'}
            value={progressValue}
            sx={{ height: 6, borderRadius: 3, bgcolor: 'primary.light' }}
          />
          {progressLabel && (
            <Typography variant="caption" sx={{ mt: 0.5, display: 'block', fontWeight: 600, color: 'primary.main' }}>
              {progressLabel} ({progressValue}%)
            </Typography>
          )}
        </Box>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', lg: 'center' }, gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <EventNoteIcon sx={{ color: 'primary.main', fontSize: 28 }} />
            Penjadwalan Guru Piket Harian
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Atur dan jadwalkan tugas guru piket harian ({activeDays.join(' - ')}). Hanya guru yang terjadwal pada hari aktif yang dapat login ke Portal Piket & Perizinan.
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={isProcessing}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, borderColor: 'divider', bgcolor: 'background.paper' }}
          >
            Segarkan
          </Button>

          <Button
            variant="outlined"
            color="secondary"
            startIcon={<ListIcon />}
            onClick={() => setDutyManagerOpen(true)}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, bgcolor: 'background.paper' }}
          >
            Atur Pilihan Tugas ({duties.length})
          </Button>
        </Stack>
      </Box>

      {/* Info Alert */}
      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        <Typography variant="body2">
          <strong>Hari Ini: {todayName}</strong> — Terdapat <strong>{todayAssignedCount} guru</strong> yang bertugas piket hari ini. Guru-guru ini memiliki hak akses untuk login ke portal <code>/piket</code> menggunakan akun guru masing-masing. Hari aktif piket disinkronkan dengan jadwal presensi sekolah (<strong>{activeDays.join(', ')}</strong>).
        </Typography>
      </Alert>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ borderRadius: 2.5, boxShadow: 1, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Piket Hari Ini ({todayName})
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: todayAssignedCount > 0 ? 'primary.main' : 'text.secondary' }}>
                    {todayAssignedCount} Guru
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', width: 48, height: 48 }}>
                  <TodayIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ borderRadius: 2.5, boxShadow: 1, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Total Guru Bertugas
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
                    {uniqueTeachersInSchedule} Guru
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#ecfdf5', color: '#10b981', width: 48, height: 48 }}>
                  <AssignmentTurnedInIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ borderRadius: 2.5, boxShadow: 1, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Total Slot Mingguan ({activeDays.length} Hari)
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
                    {totalDutyAssignments} Slot
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#eff6ff', color: '#3b82f6', width: 48, height: 48 }}>
                  <ScheduleIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Area */}
      <Paper sx={{ borderRadius: 2.5, boxShadow: 1, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        {/* Day Selector Tabs (Senin - Jumat) */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', px: 2, pt: 1 }}>
          <Tabs
            value={selectedDay}
            onChange={(_, val) => setSelectedDay(val)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.95rem',
                minHeight: 48,
                px: 2.5
              }
            }}
          >
            {activeDays.map(day => {
              const dayCount = schedules.filter(s => s.day_name.toLowerCase() === day.toLowerCase()).length;
              const isToday = day.toLowerCase() === todayName.toLowerCase();

              return (
                <Tab
                  key={day}
                  value={day}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{day}</span>
                      <Chip
                        label={dayCount}
                        size="small"
                        color={isToday ? 'primary' : 'default'}
                        sx={{ height: 20, fontSize: '0.75rem', fontWeight: 700 }}
                      />
                      {isToday && (
                        <Chip
                          label="Hari Ini"
                          size="small"
                          color="success"
                          sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, px: 0.5 }}
                        />
                      )}
                    </Box>
                  }
                />
              );
            })}
          </Tabs>
        </Box>

        {/* Day Action & Search Bar */}
        <Box sx={{ p: 2, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2, bgcolor: 'action.hover' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Daftar Petugas Piket Hari {selectedDay}
            </Typography>
            <Chip
              label={`${currentDaySchedules.length} Petugas`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField
              size="small"
              placeholder={`Cari di hari ${selectedDay}...`}
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: searchFilter && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchFilter('')}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  )
                }
              }}
              sx={{ minWidth: { xs: '100%', sm: 240 }, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'background.paper' } }}
            />

            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => openAddModal(selectedDay)}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, whiteSpace: 'nowrap' }}
            >
              Tambah Guru
            </Button>
          </Box>
        </Box>

        {/* Schedule Table for Selected Day */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: 'background.paper', fontWeight: 700 } }}>
                <TableCell width={60} align="center">No</TableCell>
                <TableCell>Nama Guru Petugas</TableCell>
                <TableCell>NIP / Identitas</TableCell>
                <TableCell>Tugas / Keterangan</TableCell>
                <TableCell>Akun Login Guru</TableCell>
                <TableCell align="center" width={160}>Aksi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} sx={{ mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Memuat jadwal piket...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredCurrentDaySchedules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <EventNoteIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Belum Ada Jadwal Guru Piket di Hari {selectedDay}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {searchFilter
                        ? 'Tidak ada guru yang cocok dengan pencarian.'
                        : `Silakan tambahkan guru yang bertugas piket pada hari ${selectedDay}.`}
                    </Typography>
                    {!searchFilter && (
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => openAddModal(selectedDay)}
                        sx={{ textTransform: 'none', borderRadius: 2 }}
                      >
                        Tambah Guru Piket Hari {selectedDay}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCurrentDaySchedules.map((item, index) => (
                  <TableRow key={item.id} hover>
                    <TableCell align="center" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      {index + 1}
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: 14, fontWeight: 700 }}>
                          {(item.teacher_name || 'G').charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            {item.teacher_name}
                          </Typography>
                          {item.class && (
                            <Typography variant="caption" color="text.secondary">
                              Wali Kelas: {item.class}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {item.nip ? item.nip : '-'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.nip ? 'NIP Terdaftar' : 'Non-NIP'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={item.keterangan || 'Guru Piket'}
                        size="small"
                        color={item.keterangan?.toLowerCase().includes('koordinator') ? 'primary' : 'default'}
                        variant={item.keterangan?.toLowerCase().includes('koordinator') ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>

                    <TableCell>
                      {item.username ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                          <KeyIcon sx={{ fontSize: 16, color: 'success.main' }} />
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                            {item.username}
                          </Typography>
                          <Chip
                            label={item.account_status || 'AKTIF'}
                            size="small"
                            color={item.account_status === 'AKTIF' ? 'success' : 'error'}
                            sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                          />
                        </Box>
                      ) : (
                        <Chip
                          label="Akun Otomatis NIP/Nama"
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.75rem' }}
                        />
                      )}
                    </TableCell>

                    <TableCell align="center">
                      <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
                        <Tooltip title="Edit Tugas / Guru Piket">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => openEditModal(item)}
                            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Hapus Dari Jadwal">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteDialogItem(item)}
                            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add / Edit Piket Modal */}
      <Dialog
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <DialogTitle component="div" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
              <EventNoteIcon fontSize="small" />
            </Avatar>
            <Typography variant="h6" component="div" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
              {isEditing ? `Edit Petugas Piket (${modalForm.day_name})` : `Tambah Guru Piket Hari ${modalForm.day_name}`}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setModalOpen(false)} disabled={saving}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ py: 2.5 }}>
          <Stack spacing={2.5}>
            <TextField
              select
              label="Hari Piket"
              fullWidth
              size="small"
              value={modalForm.day_name}
              onChange={e => setModalForm(prev => ({ ...prev, day_name: e.target.value }))}
            >
              {activeDays.map(day => (
                <MenuItem key={day} value={day}>
                  {day} {day === todayName ? '(Hari Ini)' : ''}
                </MenuItem>
              ))}
            </TextField>

            <Autocomplete
              options={teachers}
              getOptionLabel={(option) => option.name || ''}
              value={teachers.find(t => t.id === modalForm.teacher_id) || null}
              onChange={(_, newValue) => {
                setModalForm(prev => ({
                  ...prev,
                  teacher_id: newValue ? newValue.id : ''
                }));
              }}
              isOptionEqualToValue={(option, value) => option.id === value?.id}
              filterOptions={(options, state) => {
                const input = (state.inputValue || '').toLowerCase();
                return options.filter(t => 
                  (t.name || '').toLowerCase().includes(input) ||
                  (t.nip || '').toLowerCase().includes(input) ||
                  (t.class || '').toLowerCase().includes(input)
                );
              }}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option.id}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {option.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.nip ? `NIP. ${option.nip}` : 'Non-NIP'} {option.class ? `• Wali: ${option.class}` : ''}
                    </Typography>
                  </Box>
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Cari & Pilih Guru Petugas"
                  size="small"
                  placeholder="Ketik nama atau NIP guru..."
                  helperText="Ketik nama atau NIP guru untuk pencarian cepat"
                />
              )}
              noOptionsText="Guru tidak ditemukan"
            />

            <Box>
              <TextField
                select
                label="Posisi / Keterangan Tugas"
                fullWidth
                size="small"
                value={modalForm.keterangan}
                onChange={e => setModalForm(prev => ({ ...prev, keterangan: e.target.value }))}
                helperText="Pilih tugas atau klik 'Atur Pilihan Tugas' untuk menambah opsi baru"
              >
                {duties.map(d => (
                  <MenuItem key={d.id} value={d.name}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {d.name}
                      </Typography>
                      {d.description && (
                        <Typography variant="caption" color="text.secondary">
                          {d.description}
                        </Typography>
                      )}
                    </Box>
                  </MenuItem>
                ))}
                {/* Custom fallback option if not in list */}
                {modalForm.keterangan && !duties.some(d => d.name === modalForm.keterangan) && (
                  <MenuItem value={modalForm.keterangan}>
                    {modalForm.keterangan} (Kustom)
                  </MenuItem>
                )}
              </TextField>

              <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  size="small"
                  startIcon={<SettingsIcon fontSize="small" />}
                  onClick={() => setDutyManagerOpen(true)}
                  sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                >
                  Kelola Daftar Tugas
                </Button>
              </Box>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setModalOpen(false)}
            disabled={saving}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Batal
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveModal}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <CheckCircleIcon />}
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
          >
            {saving ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Tambahkan Petugas'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Master Duties Manager Modal */}
      <Dialog
        open={dutyManagerOpen}
        onClose={() => setDutyManagerOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <DialogTitle component="div" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: 'secondary.main', width: 36, height: 36 }}>
              <ListIcon fontSize="small" />
            </Avatar>
            <Box>
              <Typography variant="h6" component="div" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                Pengaturan Tugas / Keterangan Piket
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Kelola opsi tugas yang dapat dipilih saat menjadwalkan guru piket
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setDutyManagerOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Daftar Opsi Tugas ({duties.length})
            </Typography>
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={openAddDutyModal}
              sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
            >
              Tambah Tugas
            </Button>
          </Box>

          <List sx={{ bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider', p: 0 }}>
            {duties.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Belum ada master tugas piket. Klik "Tambah Tugas" untuk membuat tugas baru.
                </Typography>
              </Box>
            ) : (
              duties.map((duty, idx) => (
                <React.Fragment key={duty.id}>
                  <ListItem
                    sx={{
                      py: 1.5,
                      px: 2,
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {duty.name}
                        </Typography>
                      }
                      secondary={duty.description || 'Tidak ada deskripsi'}
                    />
                    <ListItemSecondaryAction>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Edit Tugas">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => openEditDutyModal(duty)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Hapus Tugas">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteDuty(duty.id, duty.name)}
                            disabled={deletingDutyId === duty.id}
                          >
                            {deletingDutyId === duty.id ? <CircularProgress size={16} /> : <DeleteIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {idx < duties.length - 1 && <Divider />}
                </React.Fragment>
              ))
            )}
          </List>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            variant="contained"
            onClick={() => setDutyManagerOpen(false)}
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
          >
            Selesai
          </Button>
        </DialogActions>
      </Dialog>

      {/* Duty Add / Edit Sub-Dialog */}
      <Dialog
        open={dutyFormOpen}
        onClose={() => !savingDuty && setDutyFormOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <DialogTitle component="div" sx={{ fontWeight: 700 }}>
          {editingDuty ? 'Edit Tugas / Keterangan' : 'Tambah Tugas Piket Baru'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Nama Tugas / Posisi"
              fullWidth
              size="small"
              placeholder="Contoh: Guru Piket Gerbang Depan"
              value={dutyForm.name}
              onChange={e => setDutyForm(prev => ({ ...prev, name: e.target.value }))}
              autoFocus
            />
            <TextField
              label="Deskripsi / Keterangan (Opsional)"
              fullWidth
              size="small"
              multiline
              rows={2}
              placeholder="Contoh: Mengawasi ketertiban masuk siswa di gerbang utama"
              value={dutyForm.description}
              onChange={e => setDutyForm(prev => ({ ...prev, description: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setDutyFormOpen(false)}
            disabled={savingDuty}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Batal
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveDuty}
            disabled={savingDuty}
            startIcon={savingDuty ? <CircularProgress size={16} /> : <SaveIcon />}
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
          >
            {savingDuty ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Piket Schedule Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteDialogItem)}
        onClose={() => !deleting && setDeleteDialogItem(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <DialogTitle component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'error.main', fontWeight: 700 }}>
          <DeleteIcon />
          Hapus Jadwal Piket?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Apakah Anda yakin ingin menghapus tugas piket untuk <strong>{deleteDialogItem?.teacher_name}</strong> pada hari <strong>{deleteDialogItem?.day_name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setDeleteDialogItem(null)}
            disabled={deleting}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Batal
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteSchedule}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : <DeleteIcon />}
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
          >
            {deleting ? 'Menghapus...' : 'Ya, Hapus'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modern Status Notification Popup */}
      <Dialog
        open={statusPopup.open}
        onClose={() => setStatusPopup(prev => ({ ...prev, open: false }))}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 2, textAlign: 'center' } } }}
      >
        <DialogContent sx={{ py: 2 }}>
          <Avatar
            sx={{
              bgcolor: statusPopup.type === 'info' ? '#eff6ff' : '#ecfdf5',
              color: statusPopup.type === 'info' ? '#3b82f6' : '#10b981',
              width: 56,
              height: 56,
              mx: 'auto',
              mb: 2
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 36 }} />
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            {statusPopup.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {statusPopup.message}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={() => setStatusPopup(prev => ({ ...prev, open: false }))}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            Oke, Mengerti
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
