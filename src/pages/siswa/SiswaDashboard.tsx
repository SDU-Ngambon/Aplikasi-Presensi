import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  Chip,
  Button,
  Divider,
  useTheme,
  alpha
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  MenuBook as MenuBookIcon,
  FactCheck as FactCheckIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  CalendarToday as CalendarTodayIcon
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

export default function SiswaDashboard() {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const todaySchedule = [
    { jam: '07:00 - 08:20', mapel: 'Informatika', guru: 'Budi Hartono, M.Kom', ruang: 'Lab Komputer 1', status: 'Selesai' },
    { jam: '08:20 - 09:40', mapel: 'Pemrograman Web', guru: 'Siti Nurhaliza, S.Pd', ruang: 'Lab RPL', status: 'Sedang Berlangsung' },
    { jam: '10:00 - 11:20', mapel: 'Basis Data', guru: 'Rahmat Pratama, M.T', ruang: 'Lab Komputer 2', status: 'Akan Datang' },
    { jam: '11:20 - 12:40', mapel: 'Pendidikan Pancasila', guru: 'Drs. Hendro Wibowo', ruang: 'R. 102', status: 'Akan Datang' }
  ];

  const pendingTasks = [
    { id: 1, judul: 'Tugas Praktik 01: Implementasi Array & Looping JS', mapel: 'Pemrograman Web', deadline: 'Besok, 23:59', baru: true },
    { id: 2, judul: 'Latihan Soal Aljabar Boolean & Logika', mapel: 'Informatika', deadline: '29 Sep 2026', baru: false }
  ];

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* HERO WELCOME BANNER */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3.5 },
          borderRadius: 3.5,
          mb: 3,
          position: 'relative',
          overflow: 'hidden',
          background: isDarkMode
            ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
            : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.95)} 0%, ${alpha(theme.palette.primary.dark, 0.98)} 100%)`,
          color: '#ffffff',
          boxShadow: isDarkMode ? '0 10px 30px rgba(0,0,0,0.4)' : '0 10px 30px rgba(37,99,235,0.2)'
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2.5 }}>
          <Box sx={{ zIndex: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
              <Chip
                label="SEMESTER GASAL 2026/2027"
                size="small"
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '11px',
                  borderRadius: 1.5
                }}
              />
              <Chip
                icon={<CheckCircleIcon sx={{ fontSize: '14px !important', color: '#34d399 !important' }} />}
                label="Presensi: HADIR (06:48 WIB)"
                size="small"
                sx={{
                  bgcolor: 'rgba(16, 185, 129, 0.25)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '11px',
                  borderRadius: 1.5
                }}
              />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.5, mb: 0.5 }}>
              Semangat Pagi, Ahmad Fauzi Rahman! 👋
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9, maxWidth: 680, fontSize: '0.95rem' }}>
              Selamat datang di Portal Siswa & Ruang Belajar Digital. Kamu memiliki 2 jam pelajaran tersisa hari ini dan 1 tugas mendekati batas waktu pengumpulan.
            </Typography>
          </Box>

          <Box sx={{ zIndex: 1 }}>
            <Button
              component={RouterLink}
              to="/siswa/materi-tugas"
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              sx={{
                bgcolor: '#ffffff',
                color: theme.palette.primary.dark,
                fontWeight: 800,
                textTransform: 'none',
                borderRadius: 2.5,
                px: 2.5,
                py: 1.2,
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                '&:hover': {
                  bgcolor: '#f1f5f9'
                }
              }}
            >
              Lihat Materi & Tugas
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* 4 SUMMARY STAT CARDS */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            variant="outlined"
            sx={{
              p: 2.2,
              borderRadius: 3,
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
              bgcolor: isDarkMode ? '#1e293b' : '#ffffff'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.12), color: theme.palette.primary.main, display: 'flex' }}>
                <ScheduleIcon />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  Jadwal KBM Hari Ini
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                  4 Mapel
                </Typography>
              </Box>
            </Box>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            variant="outlined"
            sx={{
              p: 2.2,
              borderRadius: 3,
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
              bgcolor: isDarkMode ? '#1e293b' : '#ffffff'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: alpha(theme.palette.error.main, 0.12), color: theme.palette.error.main, display: 'flex' }}>
                <MenuBookIcon />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  Tugas Aktif
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: 'error.main' }}>
                  2 Tugas
                </Typography>
              </Box>
            </Box>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            variant="outlined"
            sx={{
              p: 2.2,
              borderRadius: 3,
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
              bgcolor: isDarkMode ? '#1e293b' : '#ffffff'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: alpha(theme.palette.warning.main, 0.12), color: theme.palette.warning.main, display: 'flex' }}>
                <FactCheckIcon />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  Asesmen Terjadwal
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: 'warning.main' }}>
                  1 Asesmen
                </Typography>
              </Box>
            </Box>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            variant="outlined"
            sx={{
              p: 2.2,
              borderRadius: 3,
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
              bgcolor: isDarkMode ? '#1e293b' : '#ffffff'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.12), color: theme.palette.success.main, display: 'flex' }}>
                <TrendingUpIcon />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  Rata-rata Nilai
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: 'success.main' }}>
                  88.6 (A)
                </Typography>
              </Box>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* 2 MAIN CONTENT COLUMNS */}
      <Grid container spacing={3}>
        {/* LEFT COLUMN: JADWAL KBM HARI INI */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper
            variant="outlined"
            sx={{
              p: 3,
              borderRadius: 3,
              bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarTodayIcon color="primary" fontSize="small" /> Jadwal Pelajaran Hari Ini
              </Typography>
              <Button component={RouterLink} to="/siswa/jadwal" size="small" sx={{ fontWeight: 700, textTransform: 'none' }}>
                Lihat Lengkap
              </Button>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {todaySchedule.map((item, idx) => (
                <Box
                  key={idx}
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: item.status === 'Sedang Berlangsung'
                      ? (isDarkMode ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.primary.main, 0.08))
                      : (isDarkMode ? 'rgba(15, 23, 42, 0.4)' : '#f8fafc'),
                    border: `1px solid ${
                      item.status === 'Sedang Berlangsung'
                        ? alpha(theme.palette.primary.main, 0.4)
                        : (isDarkMode ? 'rgba(255,255,255,0.05)' : '#e2e8f0')
                    }`
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        {item.mapel}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.guru} • {item.ruang}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', fontFamily: 'monospace' }}>
                        {item.jam}
                      </Typography>
                      <Chip
                        label={item.status}
                        size="small"
                        color={
                          item.status === 'Sedang Berlangsung'
                            ? 'primary'
                            : item.status === 'Selesai'
                            ? 'default'
                            : 'info'
                        }
                        sx={{ height: 20, fontSize: '10px', fontWeight: 800, borderRadius: 1 }}
                      />
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* RIGHT COLUMN: TUGAS MENUNGGU PENGUMPULAN & PENGUMUMAN */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* TUGAS AKTIF */}
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MenuBookIcon color="error" fontSize="small" /> Tugas Menunggu
                </Typography>
                <Chip label="2 Belum Selesai" size="small" color="error" sx={{ fontWeight: 800, height: 20, fontSize: '10px' }} />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {pendingTasks.map((t) => (
                  <Box
                    key={t.id}
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      bgcolor: isDarkMode ? 'rgba(15, 23, 42, 0.4)' : '#f8fafc',
                      border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#e2e8f0'}`
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        {t.baru && (
                          <Chip
                            label="BARU"
                            size="small"
                            color="error"
                            sx={{ height: 18, fontSize: '9.5px', fontWeight: 800, borderRadius: 1, mb: 0.5 }}
                          />
                        )}
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                          {t.judul}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t.mapel}
                        </Typography>
                      </Box>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="error.main" sx={{ fontWeight: 700 }}>
                        Deadline: {t.deadline}
                      </Typography>
                      <Button
                        component={RouterLink}
                        to="/siswa/materi-tugas"
                        size="small"
                        variant="outlined"
                        sx={{ textTransform: 'none', fontWeight: 700, py: 0.2, px: 1, borderRadius: 1.5, fontSize: '11px' }}
                      >
                        Kumpulkan
                      </Button>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Paper>

            {/* PENGUMUMAN SEKOLAH */}
            <Paper
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 3,
                bgcolor: isDarkMode ? 'rgba(15, 23, 42, 0.5)' : '#f0fdf4',
                border: '1px solid #bbf7d0'
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#166534', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                📢 Informasi Akademik
              </Typography>
              <Typography variant="caption" sx={{ color: isDarkMode ? '#cbd5e1' : '#15803d', display: 'block', lineHeight: 1.5 }}>
                Pelaksanaan Penilaian Harian (PH) Bersama dijadwalkan pada hari Jumat, 2 Oktober 2026. Pastikan seluruh tugas telah dikumpulkan sebelum batas waktu.
              </Typography>
            </Paper>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
