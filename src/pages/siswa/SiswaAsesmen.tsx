import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  Chip,
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  useTheme,
  alpha
} from '@mui/material';
import {
  Timer as TimerIcon,
  HelpOutlined as HelpOutlineIcon,
  Security as SecurityIcon,
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  VpnKey as VpnKeyIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';

interface SiswaExamItem {
  id: string;
  judul: string;
  mapel: string;
  jenis: string;
  durasi: number;
  jumlahSoal: number;
  jadwal: string;
  tokenRequired: string;
  status: 'Tersedia' | 'Terjadwal' | 'Selesai';
  skor?: number;
}

export default function SiswaAsesmen() {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const [exams, setExams] = useState<SiswaExamItem[]>([
    {
      id: 'ex-1',
      judul: 'Penilaian Harian 1: Pemrograman Web Dasar & HTML Semantic',
      mapel: 'Pemrograman Web',
      jenis: 'Penilaian Harian',
      durasi: 60,
      jumlahSoal: 30,
      jadwal: 'Hari ini, 07:00 - 18:00 WIB',
      tokenRequired: 'RPL-7712',
      status: 'Tersedia'
    },
    {
      id: 'ex-2',
      judul: 'Kuis Logika Proposisi & Aljabar Boolean',
      mapel: 'Informatika',
      jenis: 'Kuis Singkat',
      durasi: 45,
      jumlahSoal: 20,
      jadwal: 'Besok, 09:30 - 10:30 WIB',
      tokenRequired: 'LOG-9921',
      status: 'Terjadwal'
    },
    {
      id: 'ex-3',
      judul: 'Pre-Test: Pengenalan Sintaks Basis Data Relasional SQL',
      mapel: 'Basis Data',
      jenis: 'Pre-Test',
      durasi: 40,
      jumlahSoal: 25,
      jadwal: '20 Sep 2026',
      tokenRequired: 'SQL-1122',
      status: 'Selesai',
      skor: 92
    }
  ]);

  const [startModalOpen, setStartModalOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<SiswaExamItem | null>(null);
  const [inputToken, setInputToken] = useState('');

  const handleOpenStart = (exam: SiswaExamItem) => {
    setSelectedExam(exam);
    setInputToken('');
    setStartModalOpen(true);
  };

  const handleStartExam = () => {
    if (!selectedExam) return;
    if (inputToken.trim().toUpperCase() !== selectedExam.tokenRequired) {
      toast.error(`Token ujian tidak sesuai! Masukkan token: ${selectedExam.tokenRequired}`);
      return;
    }
    toast.success('Token valid! Mengalihkan ke lembar ujian aman...');
    setStartModalOpen(false);
    // Mark as finished for demo
    setTimeout(() => {
      setExams(exams.map(e => e.id === selectedExam.id ? { ...e, status: 'Selesai', skor: 88 } : e));
      toast.success('Ujian berhasil diselesaikan! Skor kamu: 88 (Tuntas KKM)');
    }, 1200);
  };

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* HEADER SECTION */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 3,
          mb: 3,
          bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
          border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: -0.3 }}>
              Asesmen & Ujian Kelas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Daftar evaluasi belajar mandiri, Penilaian Harian (PH), dan Ujian Semester digital
            </Typography>
          </Box>

          <Chip
            icon={<SecurityIcon fontSize="small" />}
            label="Sistem Ujian Aman (Anti-Cheating)"
            color="primary"
            sx={{ fontWeight: 700, borderRadius: 2 }}
          />
        </Box>
      </Paper>

      {/* EXAMS LIST */}
      <Grid container spacing={2.5}>
        {exams.map((exam) => (
          <Grid size={{ xs: 12, md: 6, lg: 4 }} key={exam.id}>
            <Card
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
                border: `1px solid ${
                  exam.status === 'Tersedia'
                    ? (isDarkMode ? 'rgba(16, 185, 129, 0.4)' : alpha(theme.palette.success.main, 0.4))
                    : (isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0')
                }`,
                boxShadow: exam.status === 'Tersedia'
                  ? `0 6px 20px ${alpha(theme.palette.success.main, 0.15)}`
                  : 'none'
              }}
            >
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                  <Chip
                    label={exam.jenis}
                    size="small"
                    color="primary"
                    sx={{ fontWeight: 800, borderRadius: 1.5 }}
                  />
                  <Chip
                    label={
                      exam.status === 'Tersedia'
                        ? 'DAPAT DIKERJAKAN'
                        : exam.status === 'Terjadwal'
                        ? 'TERJADWAL'
                        : 'TELAH SELESAI'
                    }
                    size="small"
                    color={
                      exam.status === 'Tersedia'
                        ? 'success'
                        : exam.status === 'Terjadwal'
                        ? 'info'
                        : 'default'
                    }
                    sx={{ fontWeight: 800, borderRadius: 1.5 }}
                  />
                </Box>

                <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.3, mb: 1 }}>
                  {exam.judul}
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Mata Pelajaran: <b>{exam.mapel}</b>
                </Typography>

                <Divider sx={{ my: 1.5 }} />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TimerIcon fontSize="inherit" /> Alokasi Waktu:
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {exam.durasi} Menit
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <HelpOutlineIcon fontSize="inherit" /> Jumlah Butir:
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {exam.jumlahSoal} Soal Pilihan Ganda
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">
                      Jadwal Pelaksanaan:
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {exam.jadwal}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ mt: 2.5, pt: 1.5, borderTop: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}` }}>
                {exam.status === 'Tersedia' ? (
                  <Button
                    variant="contained"
                    color="success"
                    fullWidth
                    startIcon={<PlayArrowIcon />}
                    onClick={() => handleOpenStart(exam)}
                    sx={{ borderRadius: 2, fontWeight: 800, textTransform: 'none', py: 1 }}
                  >
                    Mulai Kerjakan Asesmen
                  </Button>
                ) : exam.status === 'Selesai' ? (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip
                      icon={<CheckCircleIcon />}
                      label="Selesai Dikerjakan"
                      color="default"
                      sx={{ fontWeight: 700, borderRadius: 2 }}
                    />
                    <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'success.main' }}>
                      Skor: {exam.skor}/100
                    </Typography>
                  </Box>
                ) : (
                  <Button
                    variant="outlined"
                    disabled
                    fullWidth
                    sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
                  >
                    Menunggu Jadwal Mulai
                  </Button>
                )}
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* DIALOG MODAL: KONFIRMASI DAN MASUKKAN TOKEN UJIAN */}
      <Dialog open={startModalOpen} onClose={() => setStartModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Konfirmasi Pelaksanaan Ujian
        </DialogTitle>
        <DialogContent dividers>
          {selectedExam && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                Perhatian: Jangan berpindah jendela/tab saat ujian berlangsung. Sistem mendeteksi aktivitas perpindahan layar secara otomatis.
              </Alert>

              <Box sx={{ p: 2, borderRadius: 2, bgcolor: isDarkMode ? 'rgba(15, 23, 42, 0.5)' : '#f8fafc' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  {selectedExam.judul}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Durasi: {selectedExam.durasi} Menit • {selectedExam.jumlahSoal} Soal
                </Typography>
              </Box>

              <Box>
                <TextField
                  label="Masukkan Token Ujian"
                  fullWidth
                  required
                  placeholder={`Contoh: ${selectedExam.tokenRequired}`}
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value.toUpperCase())}
                  helperText={`Minta token kepada pengawas ujian (Petunjuk demo: ${selectedExam.tokenRequired})`}
                  slotProps={{
                    input: {
                      startAdornment: <VpnKeyIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    }
                  }}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setStartModalOpen(false)} sx={{ fontWeight: 600 }}>
            Batal
          </Button>
          <Button variant="contained" color="success" onClick={handleStartExam} sx={{ fontWeight: 800 }}>
            Mulai Ujian Sekarang
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
