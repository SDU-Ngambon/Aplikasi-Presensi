import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
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
  Checkbox,
  FormControlLabel,
  Switch,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  useTheme,
  alpha
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Timer as TimerIcon,
  Key as KeyIcon,
  PlayArrow as PlayIcon,
  AssignmentTurnedIn as ExamIcon,
  Shuffle as ShuffleIcon,
  CalendarMonth as CalendarIcon
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

interface GuruAturAsesmenProps {
  currentUser: any;
  onNavigateToBankSoal?: () => void;
}

interface ExamAssemblyItem {
  id: string;
  teacher_id: string;
  mapel: string;
  rombel_id: string;
  rencana_asesmen_id?: string;
  judul_ujian: string;
  durasi_menit: number;
  jadwal_mulai: string;
  jadwal_selesai?: string;
  token_ujian: string;
  soal_ids: string[];
  acak_soal: boolean;
  status: 'DRAF' | 'TERJADWAL' | 'BERLANGSUNG' | 'SELESAI';
  created_at: string;
}

export default function GuruAturAsesmen({ currentUser, onNavigateToBankSoal }: GuruAturAsesmenProps) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [examList, setExamList] = useState<ExamAssemblyItem[]>([]);
  const [bankSoalList, setBankSoalList] = useState<any[]>([]);
  const [classList, setClassList] = useState<string[]>([]);

  // Dialog Assembly Form
  const [openAssemblyDialog, setOpenAssemblyDialog] = useState(false);
  const [selectedSoalIds, setSelectedSoalIds] = useState<string[]>([]);
  const [assemblyForm, setAssemblyForm] = useState({
    judul_ujian: '',
    mapel: currentUser?.subject || 'Informatika',
    rombel_id: 'X RPL 1',
    durasi_menit: 60,
    jadwal_mulai: new Date().toISOString().substring(0, 16),
    jadwal_selesai: new Date(Date.now() + 3 * 3600 * 1000).toISOString().substring(0, 16),
    token_ujian: `EXAM-${Math.floor(1000 + Math.random() * 9000)}`,
    acak_soal: true,
    status: 'TERJADWAL' as 'DRAF' | 'TERJADWAL' | 'BERLANGSUNG' | 'SELESAI'
  });

  const teacherId = currentUser?.teacher_id || currentUser?.id || '';

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

      // 2. Fetch Bank Soal
      const bankRes = await axios.get('/api/lms/bank-soal', { params: { teacher_id: teacherId } });
      const bData = Array.isArray(bankRes.data) ? bankRes.data : [];
      setBankSoalList(bData);

      // 3. Fetch Exams
      const examRes = await axios.get('/api/lms/atur-asesmen', { params: { teacher_id: teacherId } });
      const eData: ExamAssemblyItem[] = Array.isArray(examRes.data) ? examRes.data : [];

      if (eData.length === 0) {
        const sample: ExamAssemblyItem[] = [
          {
            id: 'exam-1',
            teacher_id: teacherId,
            mapel: currentUser?.subject || 'Informatika',
            rombel_id: myClasses[0] || 'X RPL 1',
            judul_ujian: 'Penilaian Sumatif 1: Algoritma & Logika',
            durasi_menit: 60,
            jadwal_mulai: new Date().toISOString(),
            jadwal_selesai: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
            token_ujian: 'ALGO-2026',
            soal_ids: bData.slice(0, 5).map((b: any) => b.id),
            acak_soal: true,
            status: 'TERJADWAL',
            created_at: new Date().toISOString()
          },
          {
            id: 'exam-2',
            teacher_id: teacherId,
            mapel: currentUser?.subject || 'Informatika',
            rombel_id: myClasses[0] || 'X RPL 1',
            judul_ujian: 'ASTS (Asesmen Sumatif Tengah Semester)',
            durasi_menit: 90,
            jadwal_mulai: new Date(Date.now() + 86400 * 1000).toISOString(),
            token_ujian: 'ASTS-SMK',
            soal_ids: bData.map((b: any) => b.id),
            acak_soal: true,
            status: 'DRAF',
            created_at: new Date().toISOString()
          }
        ];
        setExamList(sample);
      } else {
        setExamList(eData);
      }
    } catch (e) {
      console.error(e);
      toast.error('Gagal memuat daftar asesmen terakit');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateExam = () => {
    setAssemblyForm({
      judul_ujian: '',
      mapel: currentUser?.subject || 'Informatika',
      rombel_id: classList[0] || 'X RPL 1',
      durasi_menit: 60,
      jadwal_mulai: new Date().toISOString().substring(0, 16),
      jadwal_selesai: new Date(Date.now() + 4 * 3600 * 1000).toISOString().substring(0, 16),
      token_ujian: `EXAM-${Math.floor(1000 + Math.random() * 9000)}`,
      acak_soal: true,
      status: 'TERJADWAL'
    });
    // Default select all available questions in bank
    setSelectedSoalIds(bankSoalList.map(b => b.id));
    setOpenAssemblyDialog(true);
  };

  const handleToggleSelectSoal = (id: string) => {
    setSelectedSoalIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSaveAssembly = async () => {
    if (!assemblyForm.judul_ujian.trim()) {
      toast.error('Judul ujian wajib diisi');
      return;
    }
    if (selectedSoalIds.length === 0) {
      toast.error('Pilih minimal 1 butir soal dari Bank Soal');
      return;
    }

    try {
      const payload = {
        ...assemblyForm,
        teacher_id: teacherId,
        soal_ids: selectedSoalIds
      };
      await axios.post('/api/lms/atur-asesmen', payload);
      toast.success('Ujian berhasil dirakit dan dijadwalkan!');
      setOpenAssemblyDialog(false);
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Gagal menyimpan perakitan ujian');
    }
  };

  const handleDeleteExam = async (id: string) => {
    if (!window.confirm('Hapus jadwal perakitan ujian ini?')) return;
    try {
      await axios.delete(`/api/lms/atur-asesmen/${id}`);
      toast.success('Ujian berhasil dihapus');
      setExamList(prev => prev.filter(e => e.id !== id));
    } catch (e: any) {
      toast.error('Gagal menghapus ujian');
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Top Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
            Atur & Rakit Asesmen Ujian
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.3 }}>
            Rakit paket soal dari <strong>Bank Soal</strong>, atur durasi pengerjaan (timer), tanggal mulai ujian, dan buat token asesmen resmi.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreateExam}
          sx={{
            borderRadius: 2.5,
            px: 2.5,
            py: 1,
            fontWeight: 700,
            textTransform: 'none',
            boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.35)}`
          }}
        >
          + Rakit Ujian Baru
        </Button>
      </Box>

      {/* Assembly List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : examList.length === 0 ? (
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
          <ExamIcon sx={{ fontSize: 52, color: 'text.secondary', mb: 1.5, opacity: 0.5 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
            Belum Ada Ujian Yang Dirakit
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Pilih butir soal dari Bank Soal Anda dan tentukan jadwal serta durasi pengerjaan.
          </Typography>
          <Button variant="contained" onClick={handleOpenCreateExam} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
            Mulai Rakit Ujian
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2.5}>
          {examList.map((exam) => (
            <Grid size={{ xs: 12, md: 6 }} key={exam.id}>
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
                        label={exam.rombel_id}
                        size="small"
                        color="primary"
                        sx={{ fontWeight: 800, fontSize: '0.72rem', height: 22 }}
                      />
                      <Chip
                        label={exam.status}
                        size="small"
                        color={exam.status === 'BERLANGSUNG' ? 'error' : exam.status === 'TERJADWAL' ? 'success' : 'default'}
                        sx={{ fontWeight: 700, fontSize: '0.68rem', height: 20 }}
                      />
                    </Stack>
                    <IconButton size="small" color="error" onClick={() => handleDeleteExam(exam.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  <Typography variant="h6" sx={{ fontWeight: 800, color: isDarkMode ? '#f8fafc' : '#0f172a', lineHeight: 1.3, mb: 1 }}>
                    {exam.judul_ujian}
                  </Typography>
                  <Typography variant="body2" sx={{ color: theme.palette.primary.main, fontWeight: 700, mb: 2 }}>
                    Mata Pelajaran: {exam.mapel}
                  </Typography>

                  <Divider sx={{ my: 1.5, borderColor: isDarkMode ? '#334155' : '#f1f5f9' }} />

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <TimerIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                            Durasi Pengerjaan:
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>
                            {exam.durasi_menit} Menit
                          </Typography>
                        </Box>
                      </Stack>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <KeyIcon sx={{ fontSize: 18, color: 'warning.main' }} />
                        <Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                            Token Ujian:
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: 'warning.main', letterSpacing: 1 }}>
                            {exam.token_ujian}
                          </Typography>
                        </Box>
                      </Stack>
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: isDarkMode ? '#0f172a' : '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      Paket Soal Terpilih: <strong>{exam.soal_ids?.length || 0} Butir</strong>
                    </Typography>
                    {exam.acak_soal && (
                      <Chip
                        icon={<ShuffleIcon sx={{ fontSize: '13px !important' }} />}
                        label="Acak Soal Aktif"
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.65rem' }}
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog Assembly / Perakitan Ujian */}
      <Dialog
        open={openAssemblyDialog}
        onClose={() => setOpenAssemblyDialog(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          Rakit Paket Ujian & Pengaturan Jadwal
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.2 }}>
          <TextField
            label="Judul Ujian"
            fullWidth
            required
            value={assemblyForm.judul_ujian}
            onChange={(e) => setAssemblyForm({ ...assemblyForm, judul_ujian: e.target.value })}
            placeholder="Contoh: ASTS Ganjil - Teori Kejuruan"
          />

          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <TextField
                select
                label="Target Rombel"
                fullWidth
                size="small"
                value={assemblyForm.rombel_id}
                onChange={(e) => setAssemblyForm({ ...assemblyForm, rombel_id: e.target.value })}
              >
                {classList.map((c) => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                label="Mata Pelajaran"
                fullWidth
                size="small"
                value={assemblyForm.mapel}
                onChange={(e) => setAssemblyForm({ ...assemblyForm, mapel: e.target.value })}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 4 }}>
              <TextField
                label="Durasi Pengerjaan (Menit)"
                type="number"
                fullWidth
                size="small"
                value={assemblyForm.durasi_menit}
                onChange={(e) => setAssemblyForm({ ...assemblyForm, durasi_menit: Number(e.target.value) })}
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField
                label="Jadwal Mulai Ujian"
                type="datetime-local"
                fullWidth
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
                value={assemblyForm.jadwal_mulai}
                onChange={(e) => setAssemblyForm({ ...assemblyForm, jadwal_mulai: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField
                label="Token Ujian"
                fullWidth
                size="small"
                value={assemblyForm.token_ujian}
                onChange={(e) => setAssemblyForm({ ...assemblyForm, token_ujian: e.target.value })}
              />
            </Grid>
          </Grid>

          <FormControlLabel
            control={
              <Switch
                checked={assemblyForm.acak_soal}
                onChange={(e) => setAssemblyForm({ ...assemblyForm, acak_soal: e.target.checked })}
              />
            }
            label="Acak Urutan Soal & Pilihan Jawaban untuk Setiap Siswa (Anti-Sontek)"
          />

          <Divider sx={{ my: 1 }} />

          {/* Question Selection from Bank Soal */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Pilih Butir Soal dari Bank Soal ({selectedSoalIds.length} Terpilih dari {bankSoalList.length} Tersedia):
              </Typography>
              <Button
                size="small"
                onClick={() => setSelectedSoalIds(bankSoalList.map(b => b.id))}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Pilih Semua
              </Button>
            </Box>

            {bankSoalList.length === 0 ? (
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                Bank soal Anda masih kosong. Silakan buka menu <strong>Bank Soal</strong> atau <strong>Generator Soal</strong> untuk menambahkan pertanyaan terlebih dahulu.
              </Alert>
            ) : (
              <Paper variant="outlined" sx={{ maxHeight: 260, overflowY: 'auto', p: 1, borderRadius: 2 }}>
                <List dense>
                  {bankSoalList.map((item, idx) => {
                    const isChecked = selectedSoalIds.includes(item.id);
                    return (
                      <ListItem
                        key={item.id}
                        onClick={() => handleToggleSelectSoal(item.id)}
                        sx={{
                          cursor: 'pointer',
                          borderRadius: 1.5,
                          mb: 0.5,
                          bgcolor: isChecked ? (isDarkMode ? 'rgba(59, 130, 246, 0.12)' : '#eff6ff') : 'transparent',
                          '&:hover': { bgcolor: isDarkMode ? '#1e293b' : '#f1f5f9' }
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Checkbox edge="start" checked={isChecked} tabIndex={-1} disableRipple />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {idx + 1}. {item.pertanyaan}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {item.jenis_soal} • Kesulitan: {item.tingkat_kesulitan || 'SEDANG'} • Kunci: {item.kunci_jawaban || '-'}
                            </Typography>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
              </Paper>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenAssemblyDialog(false)} color="inherit" sx={{ fontWeight: 600 }}>
            Batal
          </Button>
          <Button
            onClick={handleSaveAssembly}
            variant="contained"
            disabled={selectedSoalIds.length === 0}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Rakit & Jadwalkan ({selectedSoalIds.length} Soal)
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
