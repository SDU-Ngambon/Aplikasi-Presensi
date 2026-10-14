import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  Divider,
  CircularProgress,
  useTheme,
  alpha
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  MenuBook as MenuBookIcon,
  Assignment as AssignmentIcon,
  AccountTree as ProjectIcon,
  AttachFile as AttachFileIcon,
  CalendarToday as CalendarIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

interface GuruMateriTugasProps {
  currentUser: any;
  initialRombel?: string;
  initialMapel?: string;
}

interface MateriItem {
  id: string;
  teacher_id: string;
  teacher_name?: string;
  mapel: string;
  rombel_id: string;
  judul: string;
  tipe: 'MATERI' | 'TUGAS' | 'PROJEK';
  deskripsi: string;
  file_url?: string;
  file_name?: string;
  deadline?: string;
  terkumpul?: number;
  total_siswa?: number;
  created_at: string;
}

export default function GuruMateriTugas({ currentUser, initialRombel, initialMapel }: GuruMateriTugasProps) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<MateriItem[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>('SEMUA');
  const [classFilter, setClassFilter] = useState<string>(initialRombel || 'SEMUA');
  const [classList, setClassList] = useState<string[]>([]);

  // Dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<MateriItem | null>(null);
  const [formData, setFormData] = useState({
    judul: '',
    tipe: 'MATERI' as 'MATERI' | 'TUGAS' | 'PROJEK',
    mapel: initialMapel || currentUser?.subject || 'Informatika',
    rombel_id: initialRombel || 'X RPL 1',
    deskripsi: '',
    file_url: '',
    file_name: '',
    deadline: ''
  });

  const teacherId = currentUser?.teacher_id || currentUser?.id || '';
  const teacherName = currentUser?.name || 'Bapak/Ibu Guru';

  useEffect(() => {
    fetchClassesAndItems();
  }, [teacherId]);

  const fetchClassesAndItems = async () => {
    setLoading(true);
    try {
      // 1. Fetch Teacher Schedules to get classes
      const kbmRes = await axios.get('/api/kbm/jadwal');
      const allJadwal = Array.isArray(kbmRes.data) ? kbmRes.data : [];
      const myClasses = Array.from(new Set(
        allJadwal
          .filter((j: any) => j.teacher_id === teacherId || (currentUser?.username && j.teacher_id === currentUser.username))
          .map((j: any) => j.rombel_id)
          .filter(Boolean)
      ));
      if (myClasses.length === 0 && currentUser?.class && currentUser.class !== '-') {
        myClasses.push(currentUser.class);
      }
      setClassList(myClasses.length > 0 ? myClasses : ['X RPL 1', 'X RPL 2', 'XI RPL 1']);

      // 2. Fetch Materials & Tasks
      const res = await axios.get('/api/lms/materi-tugas', {
        params: { teacher_id: teacherId }
      });
      const data: MateriItem[] = Array.isArray(res.data) ? res.data : [];

      if (data.length === 0) {
        // Sample default items for first view
        const sample: MateriItem[] = [
          {
            id: 'mat-sample-1',
            teacher_id: teacherId,
            teacher_name: teacherName,
            mapel: currentUser?.subject || 'Informatika',
            rombel_id: myClasses[0] || 'X RPL 1',
            judul: 'Modul Pembelajaran: Dasar Algoritma & Logika Pemrograman',
            tipe: 'MATERI',
            deskripsi: 'Pelajari konsep dasar percabangan (if-else) dan perulangan (loop) pada pemrograman modern.',
            file_name: 'Modul_01_Algoritma.pdf',
            file_url: 'https://drive.google.com/',
            created_at: new Date().toISOString()
          },
          {
            id: 'mat-sample-2',
            teacher_id: teacherId,
            teacher_name: teacherName,
            mapel: currentUser?.subject || 'Informatika',
            rombel_id: myClasses[0] || 'X RPL 1',
            judul: 'Tugas Praktik: Studi Kasus Sistem Kasir Toko Sederhana',
            tipe: 'TUGAS',
            deskripsi: 'Buatlah rancangan program kasir menghitung diskon dan total belanja. Kumpulkan dalam format file ZIP atau PDF laporan.',
            deadline: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
            terkumpul: 28,
            total_siswa: 34,
            created_at: new Date().toISOString()
          }
        ];
        setItems(sample);
      } else {
        setItems(data);
      }
    } catch (e) {
      console.error(e);
      toast.error('Gagal memuat materi & tugas');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      judul: '',
      tipe: 'MATERI',
      mapel: currentUser?.subject || 'Informatika',
      rombel_id: classList[0] || 'X RPL 1',
      deskripsi: '',
      file_url: '',
      file_name: '',
      deadline: ''
    });
    setOpenDialog(true);
  };

  const handleOpenEdit = (item: MateriItem) => {
    setEditingItem(item);
    setFormData({
      judul: item.judul,
      tipe: item.tipe,
      mapel: item.mapel,
      rombel_id: item.rombel_id,
      deskripsi: item.deskripsi,
      file_url: item.file_url || '',
      file_name: item.file_name || '',
      deadline: item.deadline || ''
    });
    setOpenDialog(true);
  };

  const handleSave = async () => {
    if (!formData.judul.trim()) {
      toast.error('Judul materi / tugas wajib diisi');
      return;
    }

    try {
      const payload = {
        ...formData,
        id: editingItem ? editingItem.id : undefined,
        teacher_id: teacherId,
        teacher_name: teacherName
      };
      const res = await axios.post('/api/lms/materi-tugas', payload);
      toast.success(editingItem ? 'Konten berhasil diperbarui' : 'Materi/Tugas berhasil ditambahkan');
      setOpenDialog(false);
      fetchClassesAndItems();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Gagal menyimpan konten');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus materi/tugas ini?')) return;
    try {
      await axios.delete(`/api/lms/materi-tugas/${id}`);
      toast.success('Materi/Tugas berhasil dihapus');
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e: any) {
      toast.error('Gagal menghapus konten');
    }
  };

  const filteredItems = items.filter(item => {
    const matchType = typeFilter === 'SEMUA' || item.tipe === typeFilter;
    const matchClass = classFilter === 'SEMUA' || item.rombel_id === classFilter;
    return matchType && matchClass;
  });

  return (
    <Box sx={{ width: '100%' }}>
      {/* Top Header Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
            Manajemen Materi & Tugas
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.3 }}>
            Unggah materi pembelajaran, bagikan modul, dan berikan tugas atau projek mandiri khusus untuk kelas yang Anda ampu.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
          sx={{
            borderRadius: 2.5,
            px: 2.5,
            py: 1,
            fontWeight: 700,
            textTransform: 'none',
            boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.35)}`
          }}
        >
          + Tambah Konten Baru
        </Button>
      </Box>

      {/* Filter Tabs & Class Selector */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 3,
          bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
          border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2
        }}
      >
        <Tabs
          value={typeFilter}
          onChange={(_, v) => setTypeFilter(v)}
          sx={{
            minHeight: 40,
            '& .MuiTab-root': {
              minHeight: 40,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.88rem',
              borderRadius: 2,
              mr: 1
            }
          }}
        >
          <Tab value="SEMUA" label={`Semua (${items.length})`} />
          <Tab value="MATERI" label="Materi" icon={<MenuBookIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab value="TUGAS" label="Tugas" icon={<AssignmentIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab value="PROJEK" label="Projek" icon={<ProjectIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
        </Tabs>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
            Filter Kelas:
          </Typography>
          <TextField
            select
            size="small"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="SEMUA">Semua Kelas</MenuItem>
            {classList.map((c) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>

      {/* Content Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredItems.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: 3.5,
            bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
            border: `1px dashed ${isDarkMode ? '#334155' : '#cbd5e1'}`
          }}
        >
          <MenuBookIcon sx={{ fontSize: 52, color: 'text.secondary', mb: 1.5, opacity: 0.5 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
            Belum Ada Konten Pembelajaran
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Belum ada materi atau tugas yang diunggah untuk kriteria filter yang dipilih.
          </Typography>
          <Button variant="outlined" onClick={handleOpenCreate} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
            Buat Konten Pertama
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2.5}>
          {filteredItems.map((item) => (
            <Grid size={{ xs: 12, md: 6 }} key={item.id}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 3,
                  bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
                  border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: theme.palette.primary.main,
                    boxShadow: isDarkMode ? '0 8px 24px rgba(0,0,0,0.3)' : '0 8px 24px rgba(0,0,0,0.05)'
                  }
                }}
              >
                <CardContent sx={{ p: 2.5, flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Chip
                        label={item.tipe}
                        size="small"
                        color={item.tipe === 'MATERI' ? 'primary' : item.tipe === 'TUGAS' ? 'warning' : 'secondary'}
                        sx={{ fontWeight: 800, fontSize: '0.7rem', height: 22 }}
                      />
                      <Chip
                        label={item.rombel_id}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 700, fontSize: '0.72rem', height: 22 }}
                      />
                    </Stack>

                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" onClick={() => handleOpenEdit(item)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(item.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Box>

                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: isDarkMode ? '#f8fafc' : '#0f172a', lineHeight: 1.35, mb: 1 }}>
                    {item.judul}
                  </Typography>

                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, fontSize: '0.85rem', lineHeight: 1.5 }}>
                    {item.deskripsi || 'Tidak ada deskripsi tambahan.'}
                  </Typography>

                  <Divider sx={{ my: 1.5, borderColor: isDarkMode ? '#334155' : '#f1f5f9' }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: theme.palette.primary.main, fontWeight: 700 }}>
                      Mapel: {item.mapel}
                    </Typography>

                    {item.deadline && (
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                        <CalendarIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                        <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 700 }}>
                          Batas: {item.deadline}
                        </Typography>
                      </Stack>
                    )}

                    {item.file_name && (
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                        <AttachFileIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          {item.file_name}
                        </Typography>
                      </Stack>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Modal Dialog Form Tambah / Edit */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editingItem ? 'Edit Konten Pembelajaran' : 'Tambah Materi / Tugas Baru'}
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.2, pt: 2 }}>
          <TextField
            label="Judul Materi / Tugas"
            fullWidth
            required
            value={formData.judul}
            onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
            placeholder="Contoh: Modul 02: Logika Percabangan"
          />

          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <TextField
                select
                label="Jenis Konten"
                fullWidth
                value={formData.tipe}
                onChange={(e) => setFormData({ ...formData, tipe: e.target.value as any })}
              >
                <MenuItem value="MATERI">Materi Pembelajaran</MenuItem>
                <MenuItem value="TUGAS">Tugas Mandiri</MenuItem>
                <MenuItem value="PROJEK">Projek Kelompok/Praktik</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                select
                label="Target Kelas (Rombel)"
                fullWidth
                value={formData.rombel_id}
                onChange={(e) => setFormData({ ...formData, rombel_id: e.target.value })}
              >
                {classList.map((c) => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          <TextField
            label="Mata Pelajaran"
            fullWidth
            value={formData.mapel}
            onChange={(e) => setFormData({ ...formData, mapel: e.target.value })}
          />

          <TextField
            label="Instruksi & Deskripsi Materi"
            multiline
            rows={3}
            fullWidth
            value={formData.deskripsi}
            onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
            placeholder="Tuliskan petunjuk pengerjaan atau ringkasan topik..."
          />

          {(formData.tipe === 'TUGAS' || formData.tipe === 'PROJEK') && (
            <TextField
              label="Batas Akhir Pengumpulan (Deadline)"
              type="date"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
            />
          )}

          <TextField
            label="Tautan Berkas / Google Drive (Opsional)"
            fullWidth
            value={formData.file_url}
            onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
            placeholder="https://drive.google.com/..."
          />

          <TextField
            label="Nama Berkas Lampiran (Opsional)"
            fullWidth
            value={formData.file_name}
            onChange={(e) => setFormData({ ...formData, file_name: e.target.value })}
            placeholder="Modul_01.pdf"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDialog(false)} color="inherit" sx={{ fontWeight: 600 }}>
            Batal
          </Button>
          <Button onClick={handleSave} variant="contained" sx={{ fontWeight: 700, borderRadius: 2 }}>
            Simpan Konten
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
