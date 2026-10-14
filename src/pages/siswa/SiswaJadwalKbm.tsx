import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  useTheme
} from '@mui/material';
import {
  Print as PrintIcon,
  Room as RoomIcon,
  Person as PersonIcon
} from '@mui/icons-material';

interface ScheduleEntry {
  jamKe: string;
  waktu: string;
  mapel: string;
  guru: string;
  ruang: string;
  status: 'Selesai' | 'Berlangsung' | 'Akan Datang';
}

export default function SiswaJadwalKbm() {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const [selectedDay, setSelectedDay] = useState(0);

  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  const scheduleData: Record<number, ScheduleEntry[]> = {
    0: [
      { jamKe: '1 - 2', waktu: '07:00 - 08:20', mapel: 'Upacara Bendera & Pembiasaan', guru: 'Tim Kesiswaan', ruang: 'Lapangan Utama', status: 'Selesai' },
      { jamKe: '3 - 4', waktu: '08:20 - 09:40', mapel: 'Pendidikan Agama & Budi Pekerti', guru: 'Ust. Abdullah, M.Pd.I', ruang: 'R. 101', status: 'Selesai' },
      { jamKe: '5 - 6', waktu: '10:00 - 11:20', mapel: 'Informatika Dasar', guru: 'Budi Hartono, M.Kom', ruang: 'Lab Komputer 1', status: 'Berlangsung' },
      { jamKe: '7 - 8', waktu: '11:20 - 12:40', mapel: 'Matematika Umum', guru: 'Dra. Sri Wahyuni', ruang: 'R. 101', status: 'Akan Datang' },
      { jamKe: '9 - 10', waktu: '13:15 - 14:35', mapel: 'Bahasa Indonesia', guru: 'Nurul Hidayati, S.Pd', ruang: 'R. 101', status: 'Akan Datang' },
    ],
    1: [
      { jamKe: '1 - 2', waktu: '07:00 - 08:20', mapel: 'Pemrograman Web (Frontend HTML/CSS)', guru: 'Siti Nurhaliza, S.Pd', ruang: 'Lab RPL', status: 'Akan Datang' },
      { jamKe: '3 - 4', waktu: '08:20 - 09:40', mapel: 'Pemrograman Web (Javascript Modern)', guru: 'Siti Nurhaliza, S.Pd', ruang: 'Lab RPL', status: 'Akan Datang' },
      { jamKe: '5 - 6', waktu: '10:00 - 11:20', mapel: 'Basis Data (ERD & Desain Database)', guru: 'Rahmat Pratama, M.T', ruang: 'Lab Komputer 2', status: 'Akan Datang' },
      { jamKe: '7 - 8', waktu: '11:20 - 12:40', mapel: 'Bahasa Inggris Teknis', guru: 'Michael John, B.Ed', ruang: 'R. 101', status: 'Akan Datang' },
    ],
    2: [
      { jamKe: '1 - 3', waktu: '07:00 - 09:00', mapel: 'Pemodelan Perangkat Lunak (UML)', guru: 'Eko Prasetyo, S.Kom', ruang: 'Lab RPL', status: 'Akan Datang' },
      { jamKe: '4 - 5', waktu: '09:20 - 10:40', mapel: 'Pendidikan Jasmani & Olahraga', guru: 'Agus Salim, S.Pd.Jas', ruang: 'Gedung Olahraga', status: 'Akan Datang' },
      { jamKe: '6 - 7', waktu: '10:40 - 12:00', mapel: 'Sejarah Indonesia', guru: 'Drs. Supriyanto', ruang: 'R. 101', status: 'Akan Datang' },
    ],
    3: [
      { jamKe: '1 - 4', waktu: '07:00 - 09:40', mapel: 'Praktikum Algoritma & Struktur Data', guru: 'Budi Hartono, M.Kom', ruang: 'Lab Komputer 1', status: 'Akan Datang' },
      { jamKe: '5 - 6', waktu: '10:00 - 11:20', mapel: 'Pendidikan Pancasila', guru: 'Drs. Hendro Wibowo', ruang: 'R. 101', status: 'Akan Datang' },
      { jamKe: '7 - 8', waktu: '11:20 - 12:40', mapel: 'Seni Budaya & Desain Grafis', guru: 'Rina Kartika, S.Sn', ruang: 'Studio DKV', status: 'Akan Datang' },
    ],
    4: [
      { jamKe: '1 - 2', waktu: '07:00 - 08:20', mapel: 'Bimbingan Konseling & Karir IT', guru: 'Lestari Handayani, S.Psi', ruang: 'R. 101', status: 'Akan Datang' },
      { jamKe: '3 - 4', waktu: '08:20 - 09:40', mapel: 'Projek Kreatif & Kewirausahaan (PKK)', guru: 'Ir. Danang Kusuma', ruang: 'Workshop RPL', status: 'Akan Datang' },
      { jamKe: '5 - 6', waktu: '09:40 - 11:00', mapel: 'Kegiatan Rohis / Keputrian / Sholat Jumat', guru: 'Pembina Rohani', ruang: 'Masjid Sekolah', status: 'Akan Datang' },
    ],
    5: [
      { jamKe: '1 - 4', waktu: '07:30 - 10:30', mapel: 'Ekstrakurikuler & Pengembangan Bakat IT', guru: 'Instruktur Kejuruan', ruang: 'Lab Komputer', status: 'Akan Datang' },
    ]
  };

  const currentList = scheduleData[selectedDay] || [];

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
              Jadwal Kegiatan Belajar Mengajar (KBM)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tahun Ajaran 2026/2027 • Rombel: <b>X RPL 1 (Rekayasa Perangkat Lunak)</b>
            </Typography>
          </Box>

          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
            sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
          >
            Cetak Jadwal Pelajaran
          </Button>
        </Box>
      </Paper>

      {/* DAY TABS */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`,
          bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
          mb: 3,
          overflow: 'hidden'
        }}
      >
        <Tabs
          value={selectedDay}
          onChange={(_, val) => setSelectedDay(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 2,
            pt: 1,
            borderBottom: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0'}`,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 800,
              fontSize: '0.92rem',
              py: 1.5
            }
          }}
        >
          {days.map((d) => (
            <Tab key={d} label={d} />
          ))}
        </Tabs>

        {/* TABLE JADWAL */}
        <TableContainer sx={{ p: 2 }}>
          <Table>
            <TableHead sx={{ bgcolor: isDarkMode ? '#0f172a' : '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Jam Ke-</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Waktu KBM</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Mata Pelajaran</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Guru Pengampu</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Ruang / Lab</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {currentList.map((row, idx) => (
                <TableRow key={idx} hover>
                  <TableCell sx={{ fontWeight: 800 }}>
                    <Chip label={`JP ${row.jamKe}`} size="small" sx={{ fontWeight: 700, borderRadius: 1.5 }} />
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                    {row.waktu}
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      {row.mapel}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: 'text.secondary', fontWeight: 600 }}>
                      <PersonIcon fontSize="inherit" /> {row.guru}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.8, fontWeight: 700 }}>
                      <RoomIcon fontSize="inherit" color="action" /> {row.ruang}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={row.status}
                      size="small"
                      color={
                        row.status === 'Berlangsung'
                          ? 'primary'
                          : row.status === 'Selesai'
                          ? 'default'
                          : 'info'
                      }
                      sx={{ fontWeight: 800, borderRadius: 1.5 }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
