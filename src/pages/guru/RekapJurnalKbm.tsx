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
  Divider,
  CircularProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon,
  EventNote as EventNoteIcon,
  Class as ClassIcon,
  Person as PersonIcon,
  CalendarToday as CalendarTodayIcon,
  MenuBook as MenuBookIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
  Download as DownloadIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import axios from 'axios';
import dayjs from 'dayjs';
import { useAppTheme } from '../../contexts/ThemeModeContext';
import { safeStorage } from '../../safeStorage';
import { formatWIBDateIndo, getWIBDateString } from '../../timezone';

interface RekapJurnalKbmProps {
  isMonitoring?: boolean; // True jika diakses oleh Kepsek, Waka Kurikulum, atau Admin
  defaultTeacherId?: string;
  showTeacherFilter?: boolean;
}

export default function RekapJurnalKbm({
  isMonitoring = false,
  defaultTeacherId,
  showTeacherFilter = true
}: RekapJurnalKbmProps) {
  const { preset, isDark } = useAppTheme();

  // Filter States
  const [startDate, setStartDate] = useState(dayjs().subtract(7, 'day').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [selectedRombel, setSelectedRombel] = useState<string>('SEMUA');
  const [selectedTeacher, setSelectedTeacher] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Data States
  const [kbmLogs, setKbmLogs] = useState<any[]>([]);
  const [piketIzinList, setTodayPiketIzinList] = useState<any[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [rombelList, setRombelList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Current logged in user
  const currentUser = safeStorage.getJSON('guru_user', null);

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    fetchJurnalLogs();
  }, [startDate, endDate, selectedRombel, selectedTeacher]);

  const fetchMasterData = async () => {
    try {
      const [tRes, rRes, iRes] = await Promise.all([
        axios.get('/api/teachers').catch(() => ({ data: [] })),
        axios.get('/api/rombel').catch(() => ({ data: [] })),
        axios.get('/api/piket/izin').catch(() => ({ data: [] }))
      ]);

      const tData = Array.isArray(tRes.data) ? tRes.data : [];
      const rData = Array.isArray(rRes.data) ? rRes.data : (rRes.data?.classes || []);
      const iData = Array.isArray(iRes.data) ? iRes.data : [];

      setTeachersList(tData);
      setRombelList(rData.filter((r: any) => r.status === 'AKTIF' || !r.status));
      setTodayPiketIzinList(iData);

      // Auto-set selected teacher for non-monitoring (guru pribadi)
      if (!isMonitoring && currentUser) {
        const tId = currentUser.id || currentUser.teacher_id;
        const matchedTeacher = tData.find((t: any) => t.id === tId || t.name === currentUser.name);
        if (matchedTeacher) {
          setSelectedTeacher(matchedTeacher);
        }
      }
    } catch (e) {
      console.error('Error fetching master data for KBM recap:', e);
    }
  };

  const fetchJurnalLogs = async () => {
    setLoading(true);
    try {
      const params: any = {
        startDate,
        endDate
      };

      if (selectedRombel && selectedRombel !== 'SEMUA') {
        params.rombel_id = selectedRombel;
      }

      if (!isMonitoring && currentUser) {
        params.teacher_id = currentUser.id || currentUser.teacher_id;
      } else if (selectedTeacher) {
        params.teacher_id = selectedTeacher.id;
      }

      const res = await axios.get('/api/teacher-kbm-attendance', { params });
      const logs = Array.isArray(res.data) ? res.data : [];
      setKbmLogs(logs);
    } catch (e) {
      console.error('Error fetching KBM logs:', e);
    } finally {
      setLoading(false);
    }
  };

  // Process & Merge Absent / Permission Data for each log
  const processedLogs = useMemo(() => {
    return kbmLogs.map(log => {
      const logDate = log.date;
      const logRombel = (log.rombel_id || '').trim().toLowerCase();

      // 1. Siswa Tidak Hadir KBM yang dicatat guru pengampu
      const directAbsent: any[] = log.absent_students || [];

      // 2. Siswa Rombel tersebut yang dicatat Izin/Sakit/Dispensasi dari Guru Piket pada tanggal tersebut
      const piketPermissions = piketIzinList.filter(iz => {
        const izRombel = (iz.student_class || iz.class || '').trim().toLowerCase();
        if (izRombel !== logRombel) return false;

        let start = (iz.tanggal_mulai || '').split('T')[0];
        let end = (iz.tanggal_selesai || start).split('T')[0];
        return logDate >= start && logDate <= end;
      });

      // Gabungkan tanpa duplikasi berdasarkan NISN
      const combinedList: Array<{ name: string; nisn: string; status: string; reason: string }> = [];
      const seenNisns = new Set<string>();

      directAbsent.forEach(a => {
        const nisn = String(a.nisn || '').trim();
        if (nisn && !seenNisns.has(nisn)) {
          seenNisns.add(nisn);
          combinedList.push({
            name: a.name || 'Siswa',
            nisn,
            status: 'Tidak Hadir KBM',
            reason: a.reason || 'Tidak di Kelas'
          });
        }
      });

      piketPermissions.forEach(p => {
        const nisn = String(p.nisn || '').trim();
        if (nisn && !seenNisns.has(nisn)) {
          seenNisns.add(nisn);
          combinedList.push({
            name: p.student_name || p.name || 'Siswa',
            nisn,
            status: p.keterangan || 'Izin Piket',
            reason: `Perizinan Guru Piket (${p.keterangan || 'Izin'})`
          });
        }
      });

      return {
        ...log,
        combinedAbsent: combinedList
      };
    });
  }, [kbmLogs, piketIzinList]);

  // Filter Search Term
  const filteredLogs = useMemo(() => {
    if (!searchTerm.trim()) return processedLogs;
    const term = searchTerm.toLowerCase().trim();

    return processedLogs.filter(log => {
      const teacherName = (log.teacher_name || '').toLowerCase();
      const subject = (log.subject || '').toLowerCase();
      const rombel = (log.rombel_id || '').toLowerCase();
      const topic = (log.topic || '').toLowerCase();
      const absentText = log.combinedAbsent.map((a: any) => `${a.name} ${a.nisn} ${a.reason}`).join(' ').toLowerCase();

      return teacherName.includes(term) || subject.includes(term) || rombel.includes(term) || topic.includes(term) || absentText.includes(term);
    });
  }, [processedLogs, searchTerm]);

  // Format Display Datetime
  const formatFillTime = (isoString?: string, dateStr?: string) => {
    if (isoString) {
      const d = new Date(isoString);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${mins} WIB`;
      }
    }
    if (dateStr) {
      const parts = dateStr.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr || '-';
  };

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
            <MenuBookIcon sx={{ color: preset.primary }} />
            {isMonitoring ? 'Monitoring & Laporan Jurnal KBM Guru' : 'Rekap Jurnal KBM Pembelajaran'}
          </Typography>
          <Typography variant="body2" sx={{ color: preset.textColorSecondary, mt: 0.5 }}>
            {isMonitoring
              ? 'Pemantauan rekapitulasi jurnal pembelajaran KBM seluruh guru beserta catatan ketidakhadiran siswa di kelas.'
              : 'Rekapitulasi riwayat pengisian jurnal KBM, pokok bahasan materi, dan catatan siswa izin/tidak hadir saat KBM.'}
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchJurnalLogs}
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

      {/* Filter Card */}
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
          {/* Rentang Tanggal */}
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

          {/* Filter Rombel */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Autocomplete
              size="small"
              options={['SEMUA', ...rombelList.map((r: any) => r.name)]}
              value={selectedRombel}
              onChange={(_, newValue) => setSelectedRombel(newValue || 'SEMUA')}
              renderInput={params => <TextField {...params} label="Kelas / Rombel" placeholder="Pilih Kelas / Rombel" />}
            />
          </Grid>

          {/* Filter Guru (Only if Monitoring / showTeacherFilter) */}
          {(isMonitoring || showTeacherFilter) && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Autocomplete
                size="small"
                options={teachersList}
                getOptionLabel={(t: any) => t.name || ''}
                value={selectedTeacher}
                onChange={(_, newValue) => setSelectedTeacher(newValue)}
                renderInput={params => <TextField {...params} label="Filter Nama Guru" placeholder="Cari Guru..." />}
              />
            </Grid>
          )}

          {/* Search Box */}
          <Grid size={{ xs: 12, md: (isMonitoring || showTeacherFilter) ? 12 : 3 }}>
            <TextField
              label="Pencarian Data"
              size="small"
              fullWidth
              placeholder="Cari Mata Pelajaran, Pokok Bahasan, Rombel, atau Nama Siswa..."
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
              Memuat data rekapitulasi jurnal KBM...
            </Typography>
          </Box>
        ) : filteredLogs.length === 0 ? (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            <EventNoteIcon sx={{ fontSize: 48, color: preset.textColorSecondary, mb: 1, opacity: 0.5 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: preset.textColorPrimary }}>
              Tidak Ada Data Jurnal KBM
            </Typography>
            <Typography variant="body2" sx={{ color: preset.textColorSecondary }}>
              Belum ada data rekapitulasi jurnal pembelajaran untuk kriteria filter yang Anda pilih.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 900 }}>
              <TableHead sx={{ bgcolor: isDark ? 'rgba(30, 41, 59, 0.8)' : '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, color: preset.textColorPrimary, width: '50px' }}>No</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: preset.textColorPrimary, width: '180px' }}>Waktu Pengisian</TableCell>
                  {(isMonitoring || showTeacherFilter) && (
                    <TableCell sx={{ fontWeight: 800, color: preset.textColorPrimary, width: '180px' }}>Nama Guru</TableCell>
                  )}
                  <TableCell sx={{ fontWeight: 800, color: preset.textColorPrimary, width: '160px' }}>Mata Pelajaran</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: preset.textColorPrimary, width: '130px' }}>Rombel / Jam</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: preset.textColorPrimary }}>Materi / Pokok Bahasan</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: preset.textColorPrimary, width: '250px' }}>Siswa Izin / Tidak Hadir KBM</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredLogs.map((log, index) => (
                  <TableRow
                    key={log.id}
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
                        {formatFillTime(log.created_at, log.date)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: preset.textColorSecondary, display: 'block' }}>
                        Tanggal KBM: {formatWIBDateIndo(log.date)}
                      </Typography>
                    </TableCell>

                    {(isMonitoring || showTeacherFilter) && (
                      <TableCell sx={{ color: preset.textColorPrimary }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {log.teacher_name || '-'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: preset.textColorSecondary }}>
                          NIP: {log.nip || '-'}
                        </Typography>
                      </TableCell>
                    )}

                    <TableCell sx={{ color: preset.textColorPrimary }}>
                      <Chip
                        label={log.subject || 'Mata Pelajaran'}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                      />
                    </TableCell>

                    <TableCell sx={{ color: preset.textColorPrimary }}>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: preset.primary }}>
                        {log.rombel_id}
                      </Typography>
                      <Typography variant="caption" sx={{ color: preset.textColorSecondary }}>
                        JP: {Array.isArray(log.jp_list) ? log.jp_list.map((j: number) => `JP ${j}`).join(', ') : `JP ${log.jp_start}-${log.jp_end}`}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ color: preset.textColorPrimary }}>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, fontSize: '0.88rem' }}>
                        {log.topic || '-'}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ color: preset.textColorPrimary }}>
                      {log.combinedAbsent && log.combinedAbsent.length > 0 ? (
                        <Stack spacing={0.8}>
                          {log.combinedAbsent.map((st: any, i: number) => (
                            <Box
                              key={i}
                              sx={{
                                p: 1,
                                borderRadius: 1.5,
                                bgcolor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
                                border: '1px solid #fca5a5'
                              }}
                            >
                              <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', color: isDark ? '#f87171' : '#dc2626' }}>
                                • {st.name} ({st.nisn})
                              </Typography>
                              <Typography variant="caption" sx={{ color: preset.textColorSecondary, fontSize: '0.7rem' }}>
                                Status: <strong>{st.status}</strong> — {st.reason}
                              </Typography>
                            </Box>
                          ))}
                        </Stack>
                      ) : (
                        <Chip label="Nihil (Hadir Semua)" size="small" color="success" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                      )}
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
