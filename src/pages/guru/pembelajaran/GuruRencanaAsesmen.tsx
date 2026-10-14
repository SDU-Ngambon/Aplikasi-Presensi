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
  FactCheck as FactCheckIcon,
  Assessment as AssessmentIcon,
  EventNote as EventNoteIcon,
  Tune as TuneIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

interface GuruRencanaAsesmenProps {
  currentUser: any;
}

interface RencanaItem {
  id: string;
  teacher_id: string;
  teacher_name?: string;
  mapel: string;
  rombel_id: string;
  nama_asesmen: string;
  jenis_asesmen: 'SUMATIF' | 'ASTS' | 'ASAS' | 'ASAT';
  kategori_penilaian?: string;
  bobot_persen: number;
  kkm: number;
  status: 'AKTIF' | 'DRAF' | 'SELESAI';
  keterangan?: string;
  created_at: string;
}

export default function GuruRencanaAsesmen({ currentUser }: GuruRencanaAsesmenProps) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<RencanaItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('SEMUA');
  const [classList, setClassList] = useState<string[]>([]);

  // Dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<RencanaItem | null>(null);
  const [formData, setFormData] = useState({
    nama_asesmen: '',
    jenis_asesmen: 'SUMATIF' as 'SUMATIF' | 'ASTS' | 'ASAS' | 'ASAT',
    mapel: currentUser?.subject || 'Informatika',
    rombel_id: 'X RPL 1',
    bobot_persen: 25,
    kkm: 75,
    status: 'AKTIF' as 'AKTIF' | 'DRAF' | 'SELESAI',
    keterangan: ''
  });

  const teacherId = currentUser?.teacher_id || currentUser?.id || '';
  const teacherName = currentUser?.name || 'Bapak/Ibu Guru';

  useEffect(() => {
    fetchData();
  }, [teacherId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch teacher classes
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

      // 2. Fetch assessment plans
      const res = await axios.get('/api/lms/rencana-asesmen', {
        params: { teacher_id: teacherId }
      });
      const data: RencanaItem[] = Array.isArray(res.data) ? res.data : [];

      if (data.length === 0) {
        // Sample default assessment plans
        const sample: RencanaItem[] = [
          {
            id: 'rcn-1',
            teacher_id: teacherId,
            teacher_name: teacherName,
            mapel: currentUser?.subject || 'Informatika',
            rombel_id: myClasses[0] || 'X RPL 1',
            nama_asesmen: 'Asesmen Sumatif 1: Struktur Algoritma & Logika Pemrograman',
            jenis_asesmen: 'SUMATIF',
            bobot_persen: 20,
            kkm: 75,
            status: 'AKTIF',
            keterangan: 'Tes tertulis pilihan ganda dan coding logika dasar',
            created_at: new Date().toISOString()
          },
          {
            id: 'rcn-2',
            teacher_id: teacherId,
            teacher_name: teacherName,
            mapel: currentUser?.subject || 'Informatika',
            rombel_id: myClasses[0] || 'X RPL 1',
            nama_asesmen: 'ASTS (Asesmen Sumatif Tengah Semester) Ganjil',
            jenis_asesmen: 'ASTS',
            bobot_persen: 30,
            kkm: 75,
            status: 'AKTIF',
            keterangan: 'Ujian terpadu berbasis komputer (CBT)',
            created_at: new Date().toISOString()
          },
          {
            id: 'rcn-3',
            teacher_id: teacherId,
            teacher_name: teacherName,
            mapel: currentUser?.subject || 'Informatika',
            rombel_id: myClasses[0] || 'X RPL 1',
            nama_asesmen: 'ASAS (Asesmen Sumatif Akhir Semester) Ganjil',
            jenis_asesmen: 'ASAS',
            bobot_persen: 30,
            kkm: 75,
            status: 'DRAF',
            keterangan: 'Evaluasi akhir materi semester ganjil',
            created_at: new Date().toISOString()
          }
        ];
        setItems(sample);
      } else {
        setItems(data);
      }
    } catch (e) {
      console.error(e);
      toast.error('Gagal memuat rencana asesmen');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      nama_asesmen: '',
      jenis_asesmen: 'SUMATIF',
      mapel: currentUser?.subject || 'Informatika',
      rombel_id: classList[0] || 'X RPL 1',
      bobot_persen: 25,
      kkm: 75,
      status: 'AKTIF',
      keterangan: ''
    });
    setOpenDialog(true);
  };

  const handleOpenEdit = (item: RencanaItem) => {
    setEditingItem(item);
    setFormData({
      nama_asesmen: item.nama_asesmen,
      jenis_asesmen: item.jenis_asesmen,
      mapel: item.mapel,
      rombel_id: item.rombel_id,
      bobot_persen: item.bobot_persen,
      kkm: item.kkm,
      status: item.status,
      keterangan: item.keterangan || ''
    });
    setOpenDialog(true);
  };

  const handleSave = async () => {
    if (!formData.nama_asesmen.trim()) {
      toast.error('Nama rencana asesmen wajib diisi');
      return;
    }

    try {
      const payload = {
        ...formData,
        id: editingItem ? editingItem.id : undefined,
        teacher_id: teacherId,
        teacher_name: teacherName
      };
      await axios.post('/api/lms/rencana-asesmen', payload);
      toast.success(editingItem ? 'Rencana asesmen diperbarui' : 'Rencana asesmen berhasil ditambahkan');
      setOpenDialog(false);
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Gagal menyimpan rencana asesmen');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus rencana asesmen ini?')) return;
    try {
      await axios.delete(`/api/lms/rencana-asesmen/${id}`);
      toast.success('Rencana asesmen dihapus');
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e: any) {
      toast.error('Gagal menghapus rencana asesmen');
    }
  };

  const filteredItems = items.filter(item => {
    if (activeTab === 'SEMUA') return true;
    return item.jenis_asesmen === activeTab;
  });

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
            Rencana Asesmen Pembelajaran
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.3 }}>
            Kelola perencanaan penilaian: <strong>Asesmen Sumatif</strong>, <strong>ASTS</strong> (Tengah Semester), dan <strong>ASAS / ASAT</strong> (Akhir Semester).
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
          + Buat Rencana Baru
        </Button>
      </Box>

      {/* Filter Tabs */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          mb: 3,
          borderRadius: 3,
          bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
          border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{
            minHeight: 40,
            '& .MuiTab-root': {
              minHeight: 40,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.88rem',
              borderRadius: 2
            }
          }}
        >
          <Tab value="SEMUA" label={`Semua Rencana (${items.length})`} />
          <Tab value="SUMATIF" label="Asesmen Sumatif" />
          <Tab value="ASTS" label="ASTS (Tengah Semester)" />
          <Tab value="ASAS" label="ASAS (Akhir Semester)" />
          <Tab value="ASAT" label="ASAT (Akhir Tahun)" />
        </Tabs>
      </Paper>

      {/* List / Cards */}
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
          <FactCheckIcon sx={{ fontSize: 52, color: 'text.secondary', mb: 1.5, opacity: 0.5 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
            Belum Ada Rencana Asesmen
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Buat rencana pengujian pertama untuk mengatur bobot nilai dan standar capaian kelas.
          </Typography>
          <Button variant="outlined" onClick={handleOpenCreate} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
            Buat Rencana Sekarang
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
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Chip
                        label={item.jenis_asesmen}
                        size="small"
                        color={item.jenis_asesmen === 'ASTS' || item.jenis_asesmen === 'ASAS' ? 'secondary' : 'primary'}
                        sx={{ fontWeight: 800, fontSize: '0.7rem', height: 22 }}
                      />
                      <Chip
                        label={item.rombel_id}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 700, fontSize: '0.72rem', height: 22 }}
                      />
                      <Chip
                        label={item.status}
                        size="small"
                        color={item.status === 'AKTIF' ? 'success' : item.status === 'SELESAI' ? 'info' : 'default'}
                        sx={{ fontWeight: 700, fontSize: '0.68rem', height: 20 }}
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
                    {item.nama_asesmen}
                  </Typography>

                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, fontSize: '0.85rem' }}>
                    {item.keterangan || 'Tidak ada keterangan tambahan.'}
                  </Typography>

                  <Divider sx={{ my: 1.5, borderColor: isDarkMode ? '#334155' : '#f1f5f9' }} />

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        Bobot Rapor:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: theme.palette.primary.main }}>
                        {item.bobot_persen}%
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        Target KKM / KKTP:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#16a34a' }}>
                        {item.kkm}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Modal Dialog Form Rencana Asesmen */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editingItem ? 'Edit Rencana Asesmen' : 'Tambah Rencana Asesmen Baru'}
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.2, pt: 2 }}>
          <TextField
            label="Nama Asesmen"
            fullWidth
            required
            value={formData.nama_asesmen}
            onChange={(e) => setFormData({ ...formData, nama_asesmen: e.target.value })}
            placeholder="Contoh: Asesmen Sumatif 1: Logika Pemrograman"
          />

          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <TextField
                select
                label="Jenis Asesmen"
                fullWidth
                value={formData.jenis_asesmen}
                onChange={(e) => setFormData({ ...formData, jenis_asesmen: e.target.value as any })}
              >
                <MenuItem value="SUMATIF">Asesmen Sumatif (Harian)</MenuItem>
                <MenuItem value="ASTS">ASTS (Tengah Semester)</MenuItem>
                <MenuItem value="ASAS">ASAS (Akhir Semester)</MenuItem>
                <MenuItem value="ASAT">ASAT (Akhir Tahun)</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                select
                label="Target Rombel"
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

          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <TextField
                label="Bobot Nilai (%)"
                type="number"
                fullWidth
                value={formData.bobot_persen}
                onChange={(e) => setFormData({ ...formData, bobot_persen: Number(e.target.value) })}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                label="Target KKM / KKTP"
                type="number"
                fullWidth
                value={formData.kkm}
                onChange={(e) => setFormData({ ...formData, kkm: Number(e.target.value) })}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <TextField
                label="Mata Pelajaran"
                fullWidth
                value={formData.mapel}
                onChange={(e) => setFormData({ ...formData, mapel: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                select
                label="Status Asesmen"
                fullWidth
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <MenuItem value="AKTIF">Aktif</MenuItem>
                <MenuItem value="DRAF">Draf / Menunggu</MenuItem>
                <MenuItem value="SELESAI">Selesai</MenuItem>
              </TextField>
            </Grid>
          </Grid>

          <TextField
            label="Keterangan / Kisi-kisi Singkat"
            multiline
            rows={3}
            fullWidth
            value={formData.keterangan}
            onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
            placeholder="Mencakup materi bab 1 sampai 3, sistem penilaian online..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDialog(false)} color="inherit" sx={{ fontWeight: 600 }}>
            Batal
          </Button>
          <Button onClick={handleSave} variant="contained" sx={{ fontWeight: 700, borderRadius: 2 }}>
            Simpan Rencana
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
