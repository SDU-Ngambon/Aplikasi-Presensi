import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  Grid,
  Chip,
  Paper,
  Button,
  IconButton,
  Autocomplete,
  Tooltip,
  Stack,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  People as PeopleIcon,
  Warning as WarningIcon,
  FilterList as FilterListIcon,
  Class as ClassIcon,
  Person as PersonIcon,
  CalendarToday as CalendarTodayIcon
} from '@mui/icons-material';
import axios from 'axios';
import dayjs from 'dayjs';
import { useAppTheme } from '../../contexts/ThemeModeContext';
import { formatWIBDateIndo } from '../../timezone';

interface MonitoringKbmSiswaProps {
  restrictedClass?: string; // Jika diisi (Wali Kelas), data dikunci hanya untuk kelas ini
}

export default function MonitoringKbmSiswa({ restrictedClass }: MonitoringKbmSiswaProps) {
  const { preset, isDark } = useAppTheme();

  // Filter States
  const [startDate, setStartDate] = useState(dayjs().subtract(7, 'day').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [selectedRombel, setSelectedRombel] = useState<string>(restrictedClass || 'SEMUA');
  const [searchTerm, setSearchTerm] = useState('');

  // Data States
  const [kbmLogs, setKbmLogs] = useState<any[]>([]);
  const [piketIzinList, setPiketIzinList] = useState<any[]>([]);
  const [rombelList, setRombelList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (restrictedClass) {
      setSelectedRombel(restrictedClass);
    }
  }, [restrictedClass]);

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, selectedRombel]);

  const fetchMasterData = async () => {
    try {
      const [rRes, iRes] = await Promise.all([
        axios.get('/api/rombel').catch(() => ({ data: [] })),
        axios.get('/api/piket/izin').catch(() => ({ data: [] }))
      ]);
      const rData = Array.isArray(rRes.data) ? rRes.data : (rRes.data?.classes || []);
      const iData = Array.isArray(iRes.data) ? iRes.data : [];

      setRombelList(rData.filter((r: any) => r.status === 'AKTIF' || !r.status));
      setPiketIzinList(iData);
    } catch (e) {
      console.error('Error fetching master data for student KBM monitoring:', e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {
        startDate,
        endDate
      };

      const activeClassFilter = restrictedClass || (selectedRombel !== 'SEMUA' ? selectedRombel : undefined);
      if (activeClassFilter) {
        params.rombel_id = activeClassFilter;
      }

      const res = await axios.get('/api/teacher-kbm-attendance', { params });
      const logs = Array.isArray(res.data) ? res.data : [];
      setKbmLogs(logs);
    } catch (e) {
      console.error('Error fetching student KBM logs:', e);
    } finally {
      setLoading(false);
    }
  };

  // Extract all student absence records (Both direct KBM absence + Piket permissions)
  const studentAbsenceRecords = useMemo(() => {
    const list: Array<{
      id: string;
      date: string;
      student_name: string;
      nisn: string;
      class_name: string;
      subject: string;
      teacher_name: string;
      jp_info: string;
      status: string;
      reason: string;
      source: 'KBM_GURU' | 'PIKET_IZIN';
      created_at?: string;
    }> = [];

    const activeClassFilter = (restrictedClass || selectedRombel).trim().toLowerCase();

    // 1. Catatan Tidak Hadir KBM dari Guru Pengampu
    kbmLogs.forEach(log => {
      const logClass = (log.rombel_id || '').trim().toLowerCase();
      if (activeClassFilter !== 'semua' && logClass !== activeClassFilter) return;

      const directAbsent: any[] = log.absent_students || [];
      directAbsent.forEach((st, idx) => {
        list.push({
          id: `${log.id}_absent_${idx}`,
          date: log.date,
          student_name: st.name || 'Siswa',
          nisn: String(st.nisn || '').trim(),
          class_name: log.rombel_id,
          subject: log.subject || 'Mata Pelajaran',
          teacher_name: log.teacher_name || 'Guru Pengampu',
          jp_info: Array.isArray(log.jp_list) ? log.jp_list.map((j: number) => `JP ${j}`).join(', ') : `JP ${log.jp_start}-${log.jp_end}`,
          status: 'Tidak Hadir KBM (Cabut/Bolos)',
          reason: st.reason || 'Tidak berada di kelas saat KBM',
          source: 'KBM_GURU',
          created_at: log.created_at
        });
      });
    });

    // 2. Catatan KHUSUS Dispensasi dari Guru Piket pada rentang tanggal (Sakit & Izin reguler tidak dimasukkan)
    piketIzinList.forEach(p => {
      const pClass = (p.student_class || p.class || '').trim().toLowerCase();
      if (activeClassFilter !== 'semua' && pClass !== activeClassFilter) return;

      const ket = String(p.keterangan || '').trim().toLowerCase();
      if (ket !== 'dispensasi') return; // Strict rule: Only Dispensasi from Guru Piket!

      let start = (p.tanggal_mulai || '').split('T')[0];
      let end = (p.tanggal_selesai || start).split('T')[0];

      if (start <= endDate && end >= startDate) {
        const dispDetail = p.keperluan_dispensasi || p.keperluanDispensasi || p.keperluan || '';
        list.push({
          id: `piket_${p.id || p.nisn}`,
          date: start,
          student_name: p.student_name || p.name || 'Siswa',
          nisn: String(p.nisn || '').trim(),
          class_name: p.student_class || p.class || '-',
          subject: 'Perizinan Piket (Dispensasi)',
          teacher_name: 'Guru Piket',
          jp_info: 'Seharian / Jam Izin',
          status: 'Dispensasi',
          reason: dispDetail ? `Dispensasi Piket: ${dispDetail}` : 'Dispensasi Resmi Sekolah',
          source: 'PIKET_IZIN',
          created_at: p.dibuat_pada || p.created_at
        });
      }
    });

    // Sort by date DESC
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [kbmLogs, piketIzinList, startDate, endDate, selectedRombel, restrictedClass]);

  // Search filter
  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return studentAbsenceRecords;
    const term = searchTerm.toLowerCase().trim();

    return studentAbsenceRecords.filter(r => {
      return (
        r.student_name.toLowerCase().includes(term) ||
        r.nisn.toLowerCase().includes(term) ||
        r.class_name.toLowerCase().includes(term) ||
        r.subject.toLowerCase().includes(term) ||
        r.teacher_name.toLowerCase().includes(term) ||
        r.reason.toLowerCase().includes(term)
      );
    });
  }, [studentAbsenceRecords, searchTerm]);

  return (
    <Box sx={{ width: '100%', p: { xs: 1.5, sm: 2.5, md: 3 } }}>
      {/* Header Banner */}
      <Box
        sx={{
          mb: 3,
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          bgcolor: isDark ? preset.cardBg : '#ffffff',
          color: preset.textColorPrimary,
          border: `1px solid ${preset.glassBorder}`,
          boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: -0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <PeopleIcon sx={{ color: preset.primary }} />
            {restrictedClass ? `Rekap KBM Siswa Kelas ${restrictedClass}` : 'Monitoring Rekap KBM & Ketidakhadiran Siswa'}
          </Typography>
          <Typography variant="body2" sx={{ color: preset.textColorSecondary, mt: 0.5 }}>
            {restrictedClass
              ? `Laporan khusus ketidakhadiran siswa dalam KBM untuk kelas yang Anda bina (${restrictedClass}).`
              : 'Laporan rekapitulasi ketidakhadiran KBM siswa dari seluruh kelas yang dilaporkan oleh Guru Pengampu dan Guru Piket.'}
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchData}
          disabled={loading}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 700,
            borderColor: preset.glassBorder,
            color: preset.textColorPrimary
          }}
        >
          {loading ? 'Memuat...' : 'Segarkan Data'}
        </Button>
      </Box>

      {/* Filter Paper */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5 },
          mb: 3,
          borderRadius: 3,
          bgcolor: isDark ? preset.cardBg : '#ffffff',
          color: preset.textColorPrimary,
          border: `1px solid ${preset.glassBorder}`
        }}
      >
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label="Tanggal Mulai"
              type="date"
              size="small"
              fullWidth
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label="Tanggal Selesai"
              type="date"
              size="small"
              fullWidth
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            {restrictedClass ? (
              <TextField
                label="Kelas / Rombel"
                size="small"
                fullWidth
                disabled
                value={`Kelas ${restrictedClass} (Wali Kelas)`}
              />
            ) : (
              <Autocomplete
                size="small"
                options={['SEMUA', ...rombelList.map((r: any) => r.name)]}
                value={selectedRombel}
                onChange={(_, newValue) => setSelectedRombel(newValue || 'SEMUA')}
                renderInput={params => <TextField {...params} label="Kelas / Rombel" placeholder="Pilih Kelas / Rombel" />}
              />
            )}
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label="Pencarian Data"
              size="small"
              fullWidth
              placeholder="Nama Siswa, NISN, Guru, Mapel..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: preset.textColorSecondary }} />
                }
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Main Table */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${preset.glassBorder}`,
          bgcolor: isDark ? preset.cardBg : '#ffffff',
          color: preset.textColorPrimary,
          overflow: 'hidden'
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 5, gap: 2 }}>
            <CircularProgress size={28} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: preset.textColorSecondary }}>
              Memuat laporan ketidakhadiran KBM siswa...
            </Typography>
          </Box>
        ) : filteredRecords.length === 0 ? (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            <WarningIcon sx={{ fontSize: 48, color: preset.textColorSecondary, mb: 1, opacity: 0.5 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: preset.textColorPrimary }}>
              Tidak Ada Catatan Ketidakhadiran KBM Siswa
            </Typography>
            <Typography variant="body2" sx={{ color: preset.textColorSecondary }}>
              Seluruh siswa terpantau mengikuti KBM secara tertib pada rentang tanggal dan kelas ini.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 850 }}>
              <TableHead sx={{ bgcolor: isDark ? 'rgba(30, 41, 59, 0.8)' : '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, color: preset.textColorPrimary, width: '50px' }}>No</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: preset.textColorPrimary, width: '150px' }}>Tanggal</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: preset.textColorPrimary, width: '220px' }}>Nama Siswa / NISN</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: preset.textColorPrimary, width: '120px' }}>Kelas</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: preset.textColorPrimary, width: '180px' }}>Mata Pelajaran / Guru</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: preset.textColorPrimary, width: '140px' }}>Status / Jenis</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: preset.textColorPrimary }}>Keterangan / Alasan</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRecords.map((r, index) => (
                  <TableRow
                    key={r.id}
                    hover
                    sx={{
                      '&:nth-of-type(even)': {
                        bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'
                      }
                    }}
                  >
                    <TableCell sx={{ color: preset.textColorPrimary, fontWeight: 600 }}>{index + 1}</TableCell>
                    <TableCell sx={{ color: preset.textColorPrimary }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                        {formatWIBDateIndo(r.date)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: preset.textColorSecondary, display: 'block' }}>
                        {r.jp_info}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ color: preset.textColorPrimary }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: isDark ? '#f87171' : '#dc2626' }}>
                        {r.student_name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: preset.textColorSecondary }}>
                        NISN: {r.nisn}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ color: preset.textColorPrimary }}>
                      <Chip label={r.class_name} size="small" color="primary" sx={{ fontWeight: 800, fontSize: '0.75rem' }} />
                    </TableCell>

                    <TableCell sx={{ color: preset.textColorPrimary }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {r.subject}
                      </Typography>
                      <Typography variant="caption" sx={{ color: preset.textColorSecondary, display: 'block' }}>
                        {r.teacher_name}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ color: preset.textColorPrimary }}>
                      <Chip
                        label={r.status}
                        size="small"
                        color={r.source === 'KBM_GURU' ? 'error' : r.status === 'Sakit' ? 'warning' : 'info'}
                        variant="filled"
                        sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                      />
                    </TableCell>

                    <TableCell sx={{ color: preset.textColorPrimary }}>
                      <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                        {r.reason}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
