import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Divider,
  useTheme,
  alpha
} from '@mui/material';
import {
  Print as PrintIcon,
  TrendingUp as TrendingUpIcon,
  EmojiEvents as EmojiEventsIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon
} from '@mui/icons-material';

interface GradeRecord {
  no: number;
  mapel: string;
  guru: string;
  kkm: number;
  tugas: number;
  ph: number;
  uts: number;
  uas: number;
  nilaiAkhir: number;
  predikat: string;
  status: 'Tuntas' | 'Remedial';
}

export default function SiswaHasilBelajar() {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const grades: GradeRecord[] = [
    { no: 1, mapel: 'Informatika', guru: 'Budi Hartono, M.Kom', kkm: 75, tugas: 90, ph: 88, uts: 90, uas: 92, nilaiAkhir: 90, predikat: 'A', status: 'Tuntas' },
    { no: 2, mapel: 'Pemrograman Web', guru: 'Siti Nurhaliza, S.Pd', kkm: 75, tugas: 95, ph: 92, uts: 94, uas: 96, nilaiAkhir: 94, predikat: 'A', status: 'Tuntas' },
    { no: 3, mapel: 'Basis Data', guru: 'Rahmat Pratama, M.T', kkm: 75, tugas: 88, ph: 85, uts: 86, uas: 89, nilaiAkhir: 87, predikat: 'A', status: 'Tuntas' },
    { no: 4, mapel: 'Pendidikan Agama & Budi Pekerti', guru: 'Ust. Abdullah, M.Pd.I', kkm: 75, tugas: 90, ph: 86, uts: 88, uas: 90, nilaiAkhir: 89, predikat: 'A', status: 'Tuntas' },
    { no: 5, mapel: 'Matematika Umum', guru: 'Dra. Sri Wahyuni', kkm: 75, tugas: 82, ph: 80, uts: 84, uas: 82, nilaiAkhir: 82, predikat: 'B', status: 'Tuntas' },
    { no: 6, mapel: 'Bahasa Indonesia', guru: 'Nurul Hidayati, S.Pd', kkm: 75, tugas: 89, ph: 88, uts: 90, uas: 91, nilaiAkhir: 90, predikat: 'A', status: 'Tuntas' },
    { no: 7, mapel: 'Bahasa Inggris', guru: 'Michael John, B.Ed', kkm: 75, tugas: 85, ph: 84, uts: 86, uas: 88, nilaiAkhir: 86, predikat: 'A', status: 'Tuntas' },
    { no: 8, mapel: 'Pendidikan Pancasila', guru: 'Drs. Hendro Wibowo', kkm: 75, tugas: 92, ph: 90, uts: 91, uas: 94, nilaiAkhir: 92, predikat: 'A', status: 'Tuntas' },
  ];

  const averageGrade = (grades.reduce((sum, g) => sum + g.nilaiAkhir, 0) / grades.length).toFixed(1);

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
              Hasil Belajar & Transkrip Nilai Siswa
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Rekapitulasi pencapaian kompetensi, tugas, penilaian harian, dan asesmen semester
            </Typography>
          </Box>

          <Button
            variant="contained"
            color="primary"
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
            sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
          >
            Cetak Transkrip Nilai
          </Button>
        </Box>
      </Paper>

      {/* STATS OVERVIEW CARDS */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card
            variant="outlined"
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
              bgcolor: isDarkMode ? '#1e293b' : '#ffffff'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 2.5, bgcolor: alpha(theme.palette.primary.main, 0.12), color: theme.palette.primary.main, display: 'flex' }}>
                <TrendingUpIcon fontSize="large" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  Rata-rata Nilai Semester
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: theme.palette.primary.main }}>
                  {averageGrade}
                </Typography>
                <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 800 }}>
                  Predikat A (Sangat Baik)
                </Typography>
              </Box>
            </Box>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Card
            variant="outlined"
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
              bgcolor: isDarkMode ? '#1e293b' : '#ffffff'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 2.5, bgcolor: alpha(theme.palette.warning.main, 0.12), color: theme.palette.warning.main, display: 'flex' }}>
                <EmojiEventsIcon fontSize="large" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  Peringkat Kelas
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: 'warning.main' }}>
                  Ke-3
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  Dari 36 Siswa di X RPL 1
                </Typography>
              </Box>
            </Box>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Card
            variant="outlined"
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
              bgcolor: isDarkMode ? '#1e293b' : '#ffffff'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 2.5, bgcolor: alpha(theme.palette.success.main, 0.12), color: theme.palette.success.main, display: 'flex' }}>
                <CheckCircleIcon fontSize="large" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  Ketuntasan Belajar
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: 'success.main' }}>
                  100%
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  8 / 8 Mapel Tuntas KKM (≥75)
                </Typography>
              </Box>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* TRANSCRIPT TABLE */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`,
          bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
          overflow: 'hidden',
          mb: 3
        }}
      >
        <Box sx={{ p: 2.5, borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}` }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Tabel Rincian Nilai Capaian Belajar Per Mata Pelajaran
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Nilai terinput otomatis dari modul asesmen dan penilaian guru pengampu
          </Typography>
        </Box>

        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: isDarkMode ? '#0f172a' : '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>No</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Mata Pelajaran & Guru Pengampu</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800 }}>KKM</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800 }}>Tugas</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800 }}>PH</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800 }}>UTS</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800 }}>UAS</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800 }}>Nilai Akhir</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800 }}>Predikat</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800 }}>Keterangan</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {grades.map((row) => (
                <TableRow key={row.no} hover>
                  <TableCell>{row.no}</TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      {row.mapel}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.guru}
                    </Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>{row.kkm}</TableCell>
                  <TableCell align="center">{row.tugas}</TableCell>
                  <TableCell align="center">{row.ph}</TableCell>
                  <TableCell align="center">{row.uts}</TableCell>
                  <TableCell align="center">{row.uas}</TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" sx={{ fontWeight: 900, color: theme.palette.primary.main }}>
                      {row.nilaiAkhir}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={row.predikat}
                      size="small"
                      color={row.predikat === 'A' ? 'success' : 'primary'}
                      sx={{ fontWeight: 800, borderRadius: 1.5, minWidth: 32 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={row.status}
                      size="small"
                      color={row.status === 'Tuntas' ? 'success' : 'error'}
                      variant="outlined"
                      sx={{ fontWeight: 700, borderRadius: 1.5 }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* CATATAN WALI KELAS */}
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          borderRadius: 3,
          bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
          border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon color="primary" fontSize="small" /> Catatan Perkembangan Wali Kelas
        </Typography>
        <Typography variant="body2" sx={{ fontStyle: 'italic', lineHeight: 1.6, color: 'text.secondary' }}>
          "Ananda Ahmad Fauzi menunjukkan prestasi akademik yang sangat membanggakan di bidang pemrograman dan teknologi informasi. Tingkat kehadiran presensi 100% disiplin tepat waktu. Pertahankan ketekunan, rasa ingin tahu, dan semangat kolaborasi bersama teman sekelas."
        </Typography>
        <Divider sx={{ my: 1.5 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            Wali Kelas: Budi Hartono, M.Kom
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Diperbarui per 25 September 2026
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
