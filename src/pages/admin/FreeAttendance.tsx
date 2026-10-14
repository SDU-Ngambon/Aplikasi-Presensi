import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Stack,
  Alert,
  Tooltip,
  Divider,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import {
  EventBusy as EventBusyIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Sync as SyncIcon,
  CalendarMonth as CalendarMonthIcon,
  FormatListBulleted as ListIcon,
  CheckCircle as CheckCircleIcon,
  Public as PublicIcon,
  School as SchoolIcon,
  EventNote as EventNoteIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { FreeAttendanceItem } from '../../types';

export default function FreeAttendance() {
  const [items, setItems] = useState<FreeAttendanceItem[]>([]);
  const [rombels, setRombels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Calendar navigation state
  const [currentYearMonth, setCurrentYearMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() }; // 0-indexed month
  });

  // Modal Add / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FreeAttendanceItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formType, setFormType] = useState<'nasional' | 'sekolah' | 'kegiatan' | 'khusus'>('sekolah');
  const [formScope, setFormScope] = useState('all');
  const [formDescription, setFormDescription] = useState('');

  // Result Feedback Popup
  const [resultPopup, setResultPopup] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({
    open: false,
    title: '',
    message: ''
  });

  const loadData = async () => {
    setLoading(true);
    setProgress(30);
    try {
      const [resItems, resRombels] = await Promise.all([
        fetch('/api/free-attendance'),
        fetch('/api/rombel')
      ]);
      setProgress(70);
      const dataItems = await resItems.json();
      const dataRombels = await resRombels.json();
      setItems(Array.isArray(dataItems) ? dataItems : []);
      const parsedRombels = Array.isArray(dataRombels) ? dataRombels : (dataRombels?.classes || []);
      setRombels(parsedRombels);
      setProgress(100);
    } catch (e: any) {
      toast.error('Gagal memuat data: ' + e.message);
    } finally {
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 300);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const runWithProgress = async (actionDesc: string, actionFn: () => Promise<void>, successTitle: string, successMsg: string) => {
    setIsProcessing(true);
    setProgress(15);
    try {
      const pInterval = setInterval(() => {
        setProgress(prev => (prev < 85 ? prev + 20 : prev));
      }, 100);

      await actionFn();
      clearInterval(pInterval);
      setProgress(100);

      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        setResultPopup({
          open: true,
          title: successTitle,
          message: successMsg
        });
      }, 350);
    } catch (err: any) {
      setIsProcessing(false);
      setProgress(0);
      toast.error(err.message || 'Terjadi kesalahan');
    }
  };

  // Sync National Holidays
  const handleSyncNationalHolidays = async () => {
    await runWithProgress(
      'Sinkronisasi Hari Libur Nasional',
      async () => {
        const res = await fetch('/api/free-attendance/sync-national', { method: 'POST' });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Gagal sinkronisasi');
        await loadData();
      },
      'Hari Libur Nasional Tersinkronisasi',
      'Data hari libur nasional Indonesia resmi berhasil dimuat ke dalam kalender presensi.'
    );
  };

  // Open Add Modal
  const handleOpenAdd = (defaultDate?: string) => {
    setEditingItem(null);
    setFormName('');
    const todayStr = defaultDate || new Date().toISOString().split('T')[0];
    setFormStartDate(todayStr);
    setFormEndDate(todayStr);
    setFormType('sekolah');
    setFormScope('all');
    setFormDescription('');
    setModalOpen(true);
  };

  const handleOpenEdit = (item: FreeAttendanceItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormStartDate(item.start_date);
    setFormEndDate(item.end_date || item.start_date);
    setFormType(item.type);
    setFormScope(Array.isArray(item.rombel_scope) ? (item.rombel_scope[0] || 'all') : (item.rombel_scope || 'all'));
    setFormDescription(item.description || '');
    setModalOpen(true);
  };

  const handleSaveItem = async () => {
    if (!formName.trim()) {
      toast.error('Nama kegiatan/libur tidak boleh kosong');
      return;
    }
    if (!formStartDate) {
      toast.error('Tanggal mulai wajib diisi');
      return;
    }

    await runWithProgress(
      'Menyimpan Data Bebas Kehadiran',
      async () => {
        const url = editingItem ? `/api/free-attendance/${editingItem.id}` : '/api/free-attendance';
        const method = editingItem ? 'PUT' : 'POST';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName.trim(),
            start_date: formStartDate,
            end_date: formEndDate || formStartDate,
            type: formType,
            rombel_scope: formScope,
            description: formDescription
          })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Gagal menyimpan data');
        await loadData();
        setModalOpen(false);
      },
      editingItem ? 'Data Diperbarui' : 'Tanggal Libur Ditambahkan',
      `"${formName}" telah disimpan ke kalender bebas kehadiran guru.`
    );
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!window.confirm(`Hapus data libur "${name}"?`)) return;

    await runWithProgress(
      'Menghapus Data',
      async () => {
        const res = await fetch(`/api/free-attendance/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Gagal menghapus');
        await loadData();
      },
      'Data Dihapus',
      `"${name}" berhasil dihapus dari kalender bebas kehadiran.`
    );
  };

  // Calendar calculation
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const calendarDays = useMemo(() => {
    const { year, month } = currentYearMonth;
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{ dayNumber: number; dateStr: string; isCurrentMonth: boolean }> = [];

    // Fill days of month
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      days.push({
        dayNumber: d,
        dateStr: `${year}-${monthStr}-${dayStr}`,
        isCurrentMonth: true
      });
    }

    return { firstDay, days };
  }, [currentYearMonth]);

  const handlePrevMonth = () => {
    setCurrentYearMonth(prev => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { ...prev, month: prev.month - 1 };
    });
  };

  const handleNextMonth = () => {
    setCurrentYearMonth(prev => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { ...prev, month: prev.month + 1 };
    });
  };

  const getHolidaysForDate = (dateStr: string) => {
    return items.filter(item => {
      const start = item.start_date;
      const end = item.end_date || item.start_date;
      return dateStr >= start && dateStr <= end;
    });
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'nasional':
        return <Chip icon={<PublicIcon sx={{ fontSize: '14px !important' }} />} label="Libur Nasional" size="small" color="error" sx={{ fontSize: '0.7rem' }} />;
      case 'khusus':
        return <Chip icon={<EventNoteIcon sx={{ fontSize: '14px !important' }} />} label="Kegiatan Khusus" size="small" color="secondary" sx={{ fontSize: '0.7rem' }} />;
      default:
        return <Chip icon={<SchoolIcon sx={{ fontSize: '14px !important' }} />} label="Libur Sekolah" size="small" color="warning" sx={{ fontSize: '0.7rem' }} />;
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Top progress bar */}
      {(loading || isProcessing) && (
        <Box sx={{ width: '100%', position: 'fixed', top: 0, left: 0, zIndex: 9999 }}>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 4 }} />
        </Box>
      )}

      {/* Header Banner */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
          <EventBusyIcon sx={{ color: 'primary.main', fontSize: 30 }} />
          Bebas Kehadiran & Kalender Libur
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Atur hari libur nasional, libur sekolah, atau kegiatan khusus (ujian, rapat, class meeting) yang tidak mewajibkan guru melakukan presensi KBM.
        </Typography>
      </Box>

      {/* Main Container Card */}
      <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        {/* Top Actions Bar */}
        <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, v) => v && setViewMode(v)}
              size="small"
            >
              <ToggleButton value="calendar" sx={{ textTransform: 'none', fontWeight: 600 }}>
                <CalendarMonthIcon sx={{ fontSize: 18, mr: 0.5 }} /> Kalender
              </ToggleButton>
              <ToggleButton value="list" sx={{ textTransform: 'none', fontWeight: 600 }}>
                <ListIcon sx={{ fontSize: 18, mr: 0.5 }} /> Daftar List
              </ToggleButton>
            </ToggleButtonGroup>

            <Chip
              label={`${items.length} Hari Libur Terdata`}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          </Stack>

          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<SyncIcon />}
              onClick={handleSyncNationalHolidays}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Sinkronkan Hari Libur Nasional
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => handleOpenAdd()}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Tambah Hari Bebas
            </Button>
          </Stack>
        </Box>

        <CardContent sx={{ p: { xs: 1.5, md: 3 } }}>
          {viewMode === 'calendar' ? (
            <Box>
              {/* Calendar Month Selector */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <IconButton onClick={handlePrevMonth} size="small">
                  <ChevronLeftIcon />
                </IconButton>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {monthNames[currentYearMonth.month]} {currentYearMonth.year}
                </Typography>
                <IconButton onClick={handleNextMonth} size="small">
                  <ChevronRightIcon />
                </IconButton>
              </Box>

              {/* Calendar Grid */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 2 }}>
                {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((dayName, idx) => (
                  <Box key={idx} sx={{ textAlign: 'center' }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 800,
                        color: idx === 0 ? 'error.main' : idx === 5 ? 'success.main' : 'text.secondary',
                        fontSize: '0.8rem'
                      }}
                    >
                      {dayName}
                    </Typography>
                  </Box>
                ))}

                {/* Empty cells before month start */}
                {Array.from({ length: calendarDays.firstDay }).map((_, idx) => (
                  <Box
                    key={`empty-${idx}`}
                    sx={{ height: { xs: 65, md: 95 }, bgcolor: 'action.hover', opacity: 0.3, borderRadius: 1.5 }}
                  />
                ))}

                {/* Actual day cells */}
                {calendarDays.days.map(d => {
                  const holidays = getHolidaysForDate(d.dateStr);
                  const isToday = d.dateStr === new Date().toISOString().split('T')[0];
                  const hasHoliday = holidays.length > 0;

                  return (
                    <Paper
                      key={d.dateStr}
                      elevation={0}
                      onClick={() => handleOpenAdd(d.dateStr)}
                      sx={{
                        height: { xs: 75, md: 105 },
                        p: 0.8,
                        borderRadius: 2,
                        border: isToday ? '2px solid' : '1px solid',
                        borderColor: isToday ? 'primary.main' : hasHoliday ? 'error.light' : 'divider',
                        backgroundColor: hasHoliday ? 'rgba(239, 68, 68, 0.05)' : 'background.paper',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        '&:hover': {
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: isToday ? 900 : 700,
                            color: isToday ? 'primary.main' : hasHoliday ? 'error.main' : 'text.primary',
                            fontSize: '0.8rem'
                          }}
                        >
                          {d.dayNumber}
                        </Typography>
                        {isToday && (
                          <Chip label="Hari ini" size="small" color="primary" sx={{ height: 16, fontSize: '0.6rem' }} />
                        )}
                      </Box>

                      <Box sx={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                        {holidays.map((h, hIdx) => (
                          <Tooltip key={hIdx} title={`${h.name} (${h.type.toUpperCase()})`}>
                            <Box
                              sx={{
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                px: 0.5,
                                py: 0.2,
                                borderRadius: 1,
                                bgcolor: h.type === 'nasional' ? 'error.light' : h.type === 'khusus' ? 'secondary.light' : 'warning.light',
                                color: '#ffffff',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {h.name}
                            </Box>
                          </Tooltip>
                        ))}
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            </Box>
          ) : (
            /* Table List View */
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Nama Libur / Kegiatan</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Periode Tanggal</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Kategori</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Cakupan Rombel</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Keterangan</TableCell>
                    <TableCell sx={{ fontWeight: 800, width: 100, textAlign: 'center' }}>Aksi</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                        Belum ada data bebas kehadiran. Klik tombol "Sinkronkan Hari Libur Nasional" atau "Tambah Hari Bebas".
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map(item => (
                      <TableRow key={item.id} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{item.name}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {item.start_date === item.end_date ? item.start_date : `${item.start_date} s/d ${item.end_date}`}
                        </TableCell>
                        <TableCell>{getTypeBadge(item.type)}</TableCell>
                        <TableCell>
                          <Chip
                            label={item.rombel_scope === 'all' ? 'Semua Rombel' : `Kelas: ${item.rombel_scope}`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.75rem' }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                          {item.description || '-'}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <IconButton size="small" onClick={() => handleOpenEdit(item)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDeleteItem(item.id, item.name)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* MODAL: TAMBAH / EDIT HARI BEBAS KEHADIRAN */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingItem ? 'Edit Hari Bebas Kehadiran' : 'Tambah Hari Bebas Kehadiran'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Nama Libur / Kegiatan"
              fullWidth
              size="small"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="Misal: Libur Semester Ganjil, Class Meeting"
              required
            />
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Tanggal Mulai"
                  type="date"
                  fullWidth
                  size="small"
                  value={formStartDate}
                  onChange={e => setFormStartDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  required
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Tanggal Selesai"
                  type="date"
                  fullWidth
                  size="small"
                  value={formEndDate}
                  onChange={e => setFormEndDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
            </Grid>

            <FormControl fullWidth size="small">
              <InputLabel>Jenis / Kategori</InputLabel>
              <Select
                value={formType}
                label="Jenis / Kategori"
                onChange={e => setFormType(e.target.value as any)}
              >
                <MenuItem value="sekolah">Libur Sekolah (Semester/Kalender)</MenuItem>
                <MenuItem value="nasional">Libur Nasional Resmi</MenuItem>
                <MenuItem value="khusus">Kegiatan Khusus (Ujian/Rapat/Class Meeting)</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Cakupan Rombel</InputLabel>
              <Select
                value={formScope}
                label="Cakupan Rombel"
                onChange={e => setFormScope(e.target.value)}
              >
                <MenuItem value="all">Semua Rombel (Seluruh Sekolah)</MenuItem>
                {rombels.map(r => (
                  <MenuItem key={r.id || r.name} value={r.name}>
                    Hanya Kelas: {r.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Catatan Tambahan (Opsional)"
              fullWidth
              size="small"
              multiline
              rows={2}
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              placeholder="Keterangan surat edaran atau kegiatan"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setModalOpen(false)} sx={{ textTransform: 'none' }}>
            Batal
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveItem}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            Simpan Jadwal Bebas
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODERN POPUP MODAL FEEDBACK */}
      <Dialog
        open={resultPopup.open}
        onClose={() => setResultPopup(prev => ({ ...prev, open: false }))}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: 3, p: 1, textAlign: 'center' }
          }
        }}
      >
        <DialogContent>
          <Box sx={{ my: 1 }}>
            <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main', mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
              {resultPopup.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {resultPopup.message}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button
            variant="contained"
            onClick={() => setResultPopup(prev => ({ ...prev, open: false }))}
            sx={{ borderRadius: 2, px: 4, textTransform: 'none', fontWeight: 700 }}
          >
            Selesai
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
