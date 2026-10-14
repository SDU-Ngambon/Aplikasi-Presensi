import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Checkbox,
  InputAdornment,
  Autocomplete,
  Avatar,
  Divider
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Lock as LockIcon,
  Class as ClassIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  AccessTime as AccessTimeIcon,
  CheckCircle as CheckCircleIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';
import { JadwalKbm, KbmDaySchedule, KbmPeriod } from '../../types';

interface AdminJadwalKbmModalProps {
  open: boolean;
  onClose: () => void;
  initialRombel?: string;
  classes: any[];
  teachers: any[];
  onScheduleUpdated?: () => void;
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

export default function AdminJadwalKbmModal({
  open,
  onClose,
  initialRombel = 'ALL',
  classes,
  teachers,
  onScheduleUpdated
}: AdminJadwalKbmModalProps) {
  const [schedules, setSchedules] = useState<JadwalKbm[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRombel, setSelectedRombel] = useState<string>(initialRombel);
  const [selectedHari, setSelectedHari] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Master Data
  const [masterMapels, setMasterMapels] = useState<any[]>([]);
  const [kbmDaySchedules, setKbmDaySchedules] = useState<KbmDaySchedule[]>([]);
  const [activeClasses, setActiveClasses] = useState<any[]>([]);
  const [rombelLoading, setRombelLoading] = useState(false);

  // Add / Edit Form State
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTeacherId, setFormTeacherId] = useState<string>('');
  const [formTeacherName, setFormTeacherName] = useState<string>('');
  const [formMapel, setFormMapel] = useState<string>('');
  const [formRombels, setFormRombels] = useState<string[]>([]);
  const [formHari, setFormHari] = useState<string>('Senin');
  const [formJps, setFormJps] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Conflicts
  const [conflictLoading, setConflictLoading] = useState(false);
  const [occupiedSlots, setOccupiedSlots] = useState<any[]>([]);

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Update selected rombel when initialRombel changes
  useEffect(() => {
    if (open) {
      setSelectedRombel(initialRombel || 'ALL');
      loadAllData();
    }
  }, [open, initialRombel]);

  const fetchActiveRombels = async () => {
    setRombelLoading(true);
    try {
      const res = await axios.get('/api/rombel?status=AKTIF');
      const rawList = res.data?.classes || res.data?.data || (Array.isArray(res.data) ? res.data : []);
      if (Array.isArray(rawList)) {
        setActiveClasses(rawList);
      }
    } catch (e) {
      console.error('Gagal memuat rombel aktif:', e);
    } finally {
      setRombelLoading(false);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [schedRes, mapelRes, kbmRes] = await Promise.all([
        axios.get('/api/jadwal-kbm').catch(() => ({ data: [] })),
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

      await fetchActiveRombels();
    } catch (e) {
      console.error('Gagal mengambil data jadwal KBM', e);
      toast.error('Gagal memuat jadwal KBM');
    } finally {
      setLoading(false);
    }
  };

  // Conflict checking in form
  useEffect(() => {
    if (!formOpen || !formHari || formRombels.length === 0) {
      setOccupiedSlots([]);
      return;
    }

    const fetchConflicts = async () => {
      setConflictLoading(true);
      try {
        const allOccupied: any[] = [];
        for (const rombel of formRombels) {
          const res = await axios.get('/api/jadwal-kbm/conflict', {
            params: {
              rombel_id: rombel,
              hari: formHari,
              exclude_id: editingId || undefined
            }
          });
          if (res.data?.occupiedJps && Array.isArray(res.data.occupiedJps)) {
            res.data.occupiedJps.forEach((occ: any) => {
              allOccupied.push({
                ...occ,
                rombel_id: rombel
              });
            });
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
  }, [formOpen, formHari, formRombels, editingId]);

  // Current day periods
  const currentDayPeriods = useMemo<KbmPeriod[]>(() => {
    const daySched = kbmDaySchedules.find(
      d => d.day_name.toLowerCase() === formHari.toLowerCase()
    );
    if (daySched && daySched.periods && daySched.periods.length > 0) {
      return daySched.periods.filter(p => p.is_teaching !== false && Number(p.jp_number) > 0);
    }
    return Array.from({ length: 10 }, (_, i) => ({
      jp_number: i + 1,
      name: `KBM JP ${i + 1}`,
      category_id: 'kbm',
      category_name: 'Kegiatan Belajar Mengajar',
      start_time: `${String(7 + Math.floor((i * 45) / 60)).padStart(2, '0')}:${String((i * 45) % 60).padStart(2, '0')}`,
      end_time: `${String(7 + Math.floor(((i + 1) * 45) / 60)).padStart(2, '0')}:${String(((i + 1) * 45) % 60).padStart(2, '0')}`,
      is_teaching: true
    }));
  }, [kbmDaySchedules, formHari]);

  // Open Form for Adding
  const handleOpenAdd = () => {
    setEditingId(null);
    setFormTeacherId('');
    setFormTeacherName('');
    setFormMapel('');
    setFormRombels(selectedRombel !== 'ALL' ? [selectedRombel] : []);
    setFormHari(selectedHari !== 'ALL' ? selectedHari : 'Senin');
    setFormJps([]);
    setFormOpen(true);
  };

  // Open Form for Editing
  const handleOpenEdit = (item: JadwalKbm) => {
    setEditingId(item.id);
    setFormTeacherId(item.teacher_id);
    setFormTeacherName(item.teacher_name || '');
    setFormMapel(item.mapel_name);
    setFormRombels([item.rombel_id]);
    setFormHari(item.hari);
    setFormJps(item.jp_list || []);
    setFormOpen(true);
  };

  // Toggle JP
  const handleToggleJp = (jpNum: number) => {
    const isOccupied = occupiedSlots.some(
      o => o.jp === jpNum && o.teacher_id !== formTeacherId
    );
    if (isOccupied) {
      toast.error('Slot JP ini sudah terisi oleh guru lain di kelas ini');
      return;
    }

    setFormJps(prev => {
      if (prev.includes(jpNum)) {
        return prev.filter(j => j !== jpNum);
      } else {
        return [...prev, jpNum].sort((a, b) => a - b);
      }
    });
  };

  // Save Schedule (Admin)
  const handleSaveSchedule = async () => {
    if (!formTeacherId) {
      toast.error('Silakan pilih guru pengampu');
      return;
    }
    if (!formMapel.trim()) {
      toast.error('Silakan isi mata pelajaran');
      return;
    }
    if (formRombels.length === 0) {
      toast.error('Silakan pilih minimal satu rombel / kelas');
      return;
    }
    if (formJps.length === 0) {
      toast.error('Silakan pilih minimal satu slot JP');
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await axios.put(`/api/jadwal-kbm/${editingId}`, {
          teacher_id: formTeacherId,
          teacher_name: formTeacherName,
          mapel_name: formMapel.trim(),
          rombel_id: formRombels[0],
          hari: formHari,
          jp_list: formJps
        });
        toast.success('Jadwal KBM berhasil diperbarui');
      } else {
        await axios.post('/api/jadwal-kbm', {
          teacher_id: formTeacherId,
          teacher_name: formTeacherName,
          mapel_name: formMapel.trim(),
          rombel_ids: formRombels,
          hari: formHari,
          jp_list: formJps
        });
        toast.success('Jadwal KBM berhasil didaftarkan');
      }
      setFormOpen(false);
      loadAllData();
      if (onScheduleUpdated) onScheduleUpdated();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Gagal menyimpan jadwal');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Schedule
  const handleDeleteSchedule = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await axios.delete(`/api/jadwal-kbm/${deleteId}`);
      toast.success('Jadwal KBM berhasil dihapus');
      setDeleteId(null);
      loadAllData();
      if (onScheduleUpdated) onScheduleUpdated();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Gagal menghapus jadwal');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      const matchRombel = selectedRombel === 'ALL' || s.rombel_id === selectedRombel;
      const matchHari = selectedHari === 'ALL' || s.hari === selectedHari;
      const matchSearch =
        !searchQuery.trim() ||
        s.mapel_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.teacher_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.rombel_id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchRombel && matchHari && matchSearch;
    });
  }, [schedules, selectedRombel, selectedHari, searchQuery]);

  const classNames = useMemo(() => {
    const dataSource = activeClasses.length > 0 ? activeClasses : classes;
    const names = dataSource
      .filter((c: any) => {
        const st = String(c.status || 'AKTIF').toUpperCase();
        const name = String(c.name || c.class_name || c.className || c.class || c.rombel || '').trim();
        const isInactive = st !== 'AKTIF' || name.startsWith('Alumni') || name === 'Tanpa Kelas' || name.toLowerCase().includes('lulus');
        return !isInactive;
      })
      .map((c: any) => typeof c === 'string' ? c.trim() : String(c.name || c.class_name || c.className || c.class || c.rombel || '').trim())
      .filter(Boolean) as string[];

    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [activeClasses, classes]);

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="xl"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: 3, minHeight: '85vh', display: 'flex', flexDirection: 'column' }
          }
        }}
      >
        {/* Header */}
        <DialogTitle
          sx={{
            p: 2.5,
            bgcolor: '#0f766e',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <ScheduleIcon sx={{ fontSize: 26, color: '#ffffff' }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                Kelola Jadwal JP KBM (Admin)
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                Sinkronisasi Alokasi Jam Pelajaran Rombongan Belajar &amp; Guru Pengampu
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} sx={{ color: '#ffffff' }} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        {/* Filters and Actions Bar */}
        <Box sx={{ p: 2.5, pb: 1, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Filter Rombongan Belajar"
                value={selectedRombel}
                onChange={e => setSelectedRombel(e.target.value)}
                slotProps={{ select: { native: true } }}
              >
                <option value="ALL">Semua Kelas ({classNames.length} Rombel)</option>
                {classNames.map(c => (
                  <option key={c} value={c}>
                    Kelas {c}
                  </option>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 6, md: 2.5 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Filter Hari"
                value={selectedHari}
                onChange={e => setSelectedHari(e.target.value)}
                slotProps={{ select: { native: true } }}
              >
                <option value="ALL">Semua Hari</option>
                {HARI_LIST.map(h => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 6, md: 3.5 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Cari guru, mapel, kelas..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                      </InputAdornment>
                    )
                  }
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 3 }} sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                size="small"
                onClick={loadAllData}
                startIcon={<RefreshIcon />}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
              >
                Segarkan
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={handleOpenAdd}
                startIcon={<AddIcon />}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 700,
                  bgcolor: '#0f766e',
                  '&:hover': { bgcolor: '#115e59' }
                }}
              >
                + Tambah Jadwal
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Content Body */}
        <DialogContent sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <Box sx={{ p: 8, textAlign: 'center', my: 'auto' }}>
              <CircularProgress size={36} />
              <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                Memuat data jadwal KBM...
              </Typography>
            </Box>
          ) : filteredSchedules.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center', my: 'auto' }}>
              <ScheduleIcon sx={{ fontSize: 50, color: '#cbd5e1', mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#475569' }}>
                Tidak Ada Jadwal KBM Ditemukan
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                {selectedRombel !== 'ALL'
                  ? `Kelas ${selectedRombel} belum memiliki alokasi jadwal KBM.`
                  : 'Belum ada jadwal KBM yang terdaftar dalam sistem.'}
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenAdd}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, bgcolor: '#0f766e' }}
              >
                Buat Jadwal Baru
              </Button>
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: '#f1f5f9', fontWeight: 800, color: '#334155' } }}>
                    <TableCell width={60}>NO</TableCell>
                    <TableCell width={110}>HARI</TableCell>
                    <TableCell width={140}>ROMBEL</TableCell>
                    <TableCell>MATA PELAJARAN</TableCell>
                    <TableCell>GURU PENGAMPU</TableCell>
                    <TableCell>SLOT JP &amp; WAKTU</TableCell>
                    <TableCell align="center" width={100}>TOTAL JP</TableCell>
                    <TableCell align="center" width={130}>AKSI</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSchedules.map((item, idx) => {
                    const daySt = HARI_COLORS[item.hari] || { bg: '#f1f5f9', text: '#334155', border: '#e2e8f0' };
                    const sortedJps = [...(item.jp_list || [])].sort((a, b) => a - b);
                    const rangeStr = sortedJps.length > 1
                      ? `JP ${sortedJps[0]} - ${sortedJps[sortedJps.length - 1]}`
                      : `JP ${sortedJps[0]}`;

                    return (
                      <TableRow key={item.id} hover>
                        <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>{idx + 1}</TableCell>
                        <TableCell>
                          <Chip
                            label={item.hari}
                            size="small"
                            sx={{
                              bgcolor: daySt.bg,
                              color: daySt.text,
                              border: `1px solid ${daySt.border}`,
                              fontWeight: 800,
                              borderRadius: 1.5
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                            <ClassIcon sx={{ fontSize: 16, color: '#2563eb' }} />
                            <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                              {item.rombel_id}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                            {item.mapel_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar
                              sx={{
                                width: 26,
                                height: 26,
                                fontSize: '0.75rem',
                                bgcolor: '#0f766e',
                                fontWeight: 800
                              }}
                            >
                              {(item.teacher_name || 'G').charAt(0)}
                            </Avatar>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                              {item.teacher_name || '-'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                            <Chip
                              label={rangeStr}
                              size="small"
                              sx={{
                                bgcolor: '#e0f2fe',
                                color: '#0369a1',
                                fontWeight: 800,
                                fontSize: '0.72rem'
                              }}
                            />
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              ({sortedJps.map(j => `#${j}`).join(', ')})
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="center">
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
                        <TableCell align="center">
                          <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'center' }}>
                            <Tooltip title="Edit Jadwal">
                              <IconButton size="small" color="primary" onClick={() => handleOpenEdit(item)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Hapus Jadwal">
                              <IconButton size="small" color="error" onClick={() => setDeleteId(item.id)}>
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
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, px: 3, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', justifyContent: 'space-between' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            Menampilkan <strong>{filteredSchedules.length}</strong> jadwal KBM
          </Typography>
          <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
            Tutup
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===================================================
          ADMIN ADD / EDIT SCHEDULE MODAL
         =================================================== */}
      <Dialog
        open={formOpen}
        onClose={() => !submitting && setFormOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ p: 2.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 800 }}>
          {editingId ? 'Edit Jadwal KBM' : 'Tambah Jadwal KBM Baru (Admin)'}
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            {/* 1. Guru Pengampu */}
            <Autocomplete
              options={teachers}
              getOptionLabel={t => `${t.name} (NIP: ${t.nip || '-'})`}
              value={teachers.find(t => t.id === formTeacherId) || null}
              onChange={(_, newValue) => {
                setFormTeacherId(newValue?.id || '');
                setFormTeacherName(newValue?.name || '');
              }}
              renderInput={params => (
                <TextField
                  {...params}
                  label="Pilih Guru Pengampu *"
                  placeholder="Ketik nama atau NIP guru..."
                  fullWidth
                />
              )}
            />

            {/* 2. Mata Pelajaran */}
            <Autocomplete
              freeSolo
              options={masterMapels.map(m => m.nama_mapel || m.name || m)}
              value={formMapel}
              onChange={(_, newValue) => setFormMapel(newValue || '')}
              onInputChange={(_, newInputValue) => setFormMapel(newInputValue || '')}
              renderInput={params => (
                <TextField
                  {...params}
                  label="Mata Pelajaran *"
                  placeholder="Ketik atau pilih mata pelajaran..."
                  fullWidth
                />
              )}
            />

            {/* 3. Kelas / Rombel */}
            <Autocomplete
              multiple
              options={classNames}
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
                  label="Pilih Rombongan Belajar *"
                  placeholder={rombelLoading ? "Memuat kelas aktif..." : "Ketik atau pilih kelas..."}
                  fullWidth
                />
              )}
            />

            {classNames.length > 0 && (
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>
                  Saran Rombongan Belajar Aktif (Klik untuk Tambah / Hapus):
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: 120, overflowY: 'auto', p: 1.2, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#f8fafc' }}>
                  {classNames.map((rombel, idx) => {
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

            {/* 4. Hari */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                Pilih Hari:
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {HARI_LIST.map(h => {
                  const isSel = formHari === h;
                  return (
                    <Button
                      key={h}
                      variant={isSel ? 'contained' : 'outlined'}
                      onClick={() => {
                        setFormHari(h);
                        setFormJps([]);
                      }}
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 700,
                        bgcolor: isSel ? '#0f766e' : 'transparent',
                        color: isSel ? '#ffffff' : 'inherit',
                        borderColor: isSel ? '#0f766e' : '#cbd5e1',
                        '&:hover': { bgcolor: isSel ? '#115e59' : '#f1f5f9' }
                      }}
                    >
                      {h}
                    </Button>
                  );
                })}
              </Stack>
            </Box>

            <Divider />

            {/* 5. Slot JP Checkboxes with Conflict Resolution */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Pilih Slot JP Hari {formHari}:
                </Typography>
                {conflictLoading && <CircularProgress size={16} />}
              </Box>

              <Grid container spacing={1.2}>
                {currentDayPeriods.map(period => {
                  const jpNum = period.jp_number;
                  const conflict = occupiedSlots.find(
                    o => o.jp === jpNum && o.teacher_id !== formTeacherId
                  );
                  const isLocked = Boolean(conflict);
                  const isSelected = formJps.includes(jpNum);

                  return (
                    <Grid size={{ xs: 6, sm: 4, md: 3 }} key={jpNum}>
                      <Paper
                        onClick={() => !isLocked && handleToggleJp(jpNum)}
                        sx={{
                          p: 1.2,
                          borderRadius: 2,
                          border: isLocked
                            ? '1.5px dashed #fca5a5'
                            : isSelected
                            ? '2px solid #0f766e'
                            : '1px solid #e2e8f0',
                          bgcolor: isLocked ? '#fef2f2' : isSelected ? '#f0fdfa' : '#ffffff',
                          cursor: isLocked ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Checkbox checked={isSelected} disabled={isLocked} size="small" sx={{ p: 0 }} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: isLocked ? '#991b1b' : '#0f172a' }}>
                              JP {jpNum}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.68rem' }}>
                              {period.start_time} - {period.end_time}
                            </Typography>
                          </Box>
                        </Box>

                        {isLocked ? (
                          <Tooltip title={`Terkunci: Ditempati oleh ${conflict?.teacher_name} (${conflict?.mapel_name})`}>
                            <LockIcon sx={{ fontSize: 16, color: '#dc2626' }} />
                          </Tooltip>
                        ) : null}
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setFormOpen(false)} disabled={submitting}>
            Batal
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveSchedule}
            disabled={submitting || formJps.length === 0}
            sx={{
              borderRadius: 2,
              fontWeight: 700,
              textTransform: 'none',
              bgcolor: '#0f766e',
              '&:hover': { bgcolor: '#115e59' },
              px: 3
            }}
          >
            {submitting ? 'Menyimpan...' : editingId ? 'Perbarui Jadwal' : 'Simpan Jadwal'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={Boolean(deleteId)} onClose={() => !deleting && setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ p: 2.5, fontWeight: 800 }}>Hapus Jadwal KBM?</DialogTitle>
        <DialogContent sx={{ p: 2.5, pt: 0 }}>
          <Typography variant="body2" color="text.secondary">
            Apakah Anda yakin ingin menghapus jadwal KBM ini?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setDeleteId(null)} disabled={deleting}>
            Batal
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteSchedule}
            disabled={deleting}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            {deleting ? 'Menghapus...' : 'Hapus'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
