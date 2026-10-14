import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Divider,
  CircularProgress,
  Alert,
  Tooltip,
  useTheme,
  alpha
} from '@mui/material';
import {
  Sync as SyncIcon,
  FileUpload as ImportIcon,
  FileDownload as ExportIcon,
  Print as PrintIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Assessment as AssessmentIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import axios from 'axios';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

interface GuruHasilPenilaianProps {
  currentUser: any;
  initialRombel?: string;
  initialMapel?: string;
}

interface NilaiRecord {
  id: string;
  student_id: string;
  student_name: string;
  student_nisn: string;
  rombel_id: string;
  mapel: string;
  nilai_tugas: number;
  nilai_harian: number;
  nilai_ujian: number;
  nilai_akhir: number;
  kkm: number;
  status_tuntas: 'TUNTAS' | 'REMEDIAL';
  tipe_input: 'SISTEM_ONLINE' | 'IMPORT_EXCEL' | 'MANUAL';
  catatan?: string;
}

export default function GuruHasilPenilaian({ currentUser, initialRombel, initialMapel }: GuruHasilPenilaianProps) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [nilaiList, setNilaiList] = useState<NilaiRecord[]>([]);
  const [classList, setClassList] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>(initialRombel || 'X RPL 1');
  const [selectedMapel, setSelectedMapel] = useState<string>(initialMapel || currentUser?.subject || 'Informatika');
  const [searchTerm, setSearchTerm] = useState('');

  // Import Excel Dialog
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [importedPreview, setImportedPreview] = useState<any[]>([]);

  const teacherId = currentUser?.teacher_id || currentUser?.id || '';

  useEffect(() => {
    fetchClassesAndScores();
  }, [teacherId, selectedClass, selectedMapel]);

  const fetchClassesAndScores = async () => {
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
      const classes = myClasses.length > 0 ? myClasses : ['X RPL 1', 'X RPL 2', 'XI RPL 1'];
      setClassList(classes);
      if (!selectedClass || !classes.includes(selectedClass)) {
        setSelectedClass(classes[0]);
      }

      // 2. Fetch Grades
      const res = await axios.get('/api/lms/hasil-penilaian', {
        params: { rombel_id: selectedClass || classes[0], mapel: selectedMapel }
      });
      const data: NilaiRecord[] = Array.isArray(res.data) ? res.data : [];

      if (data.length === 0) {
        // Trigger auto-sync initial data for this class
        handleAutoSync(false);
      } else {
        setNilaiList(data);
      }
    } catch (e) {
      console.error(e);
      toast.error('Gagal memuat rekap nilai siswa');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSync = async (notify = true) => {
    setSyncing(true);
    try {
      const res = await axios.post('/api/lms/hasil-penilaian/sync', {
        teacher_id: teacherId,
        rombel_id: selectedClass,
        mapel: selectedMapel
      });
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        setNilaiList(res.data.data);
        if (notify) {
          toast.success(`Sinkronisasi berhasil! ${res.data.count} nilai siswa tersinkron dari sistem ujian online.`);
        }
      }
    } catch (e: any) {
      if (notify) toast.error('Gagal melakukan sinkronisasi otomatis');
    } finally {
      setSyncing(false);
    }
  };

  // Excel File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const json: any[] = XLSX.utils.sheet_to_json(ws);

        if (!json || json.length === 0) {
          toast.error('Berkas Excel kosong atau format tidak sesuai');
          return;
        }

        const parsed = json.map((row: any, idx: number) => {
          const name = row['Nama Siswa'] || row['Nama'] || row['nama'] || `Siswa ${idx + 1}`;
          const nisn = String(row['NISN'] || row['nisn'] || `0089${Math.floor(100000 + Math.random() * 900000)}`);
          const tugas = Number(row['Nilai Tugas'] || row['Tugas'] || 80);
          const harian = Number(row['Nilai Harian'] || row['Harian'] || 82);
          const ujian = Number(row['Nilai Ujian'] || row['Ujian'] || 85);
          const finalScore = Number(((tugas * 0.3) + (harian * 0.3) + (ujian * 0.4)).toFixed(2));
          return {
            student_id: `st-import-${idx}`,
            student_name: name,
            student_nisn: nisn,
            rombel_id: selectedClass,
            mapel: selectedMapel,
            teacher_id: teacherId,
            nilai_tugas: tugas,
            nilai_harian: harian,
            nilai_ujian: ujian,
            nilai_akhir: finalScore,
            kkm: 75,
            status_tuntas: finalScore >= 75 ? 'TUNTAS' : 'REMEDIAL',
            catatan: 'Diimpor dari file Excel manual'
          };
        });

        setImportedPreview(parsed);
        toast.success(`${parsed.length} baris data nilai terdeteksi dari Excel`);
      } catch (err) {
        toast.error('Gagal membaca file Excel. Pastikan format tabel sesuai');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSaveImportedExcel = async () => {
    if (importedPreview.length === 0) {
      toast.error('Tidak ada data nilai yang diimpor');
      return;
    }

    try {
      const res = await axios.post('/api/lms/hasil-penilaian/import-excel', { items: importedPreview });
      toast.success(`${res.data.count} nilai siswa berhasil disimpan!`);
      setOpenImportDialog(false);
      setImportedPreview([]);
      fetchClassesAndScores();
    } catch (e: any) {
      toast.error('Gagal menyimpan nilai dari Excel');
    }
  };

  const handleExportExcel = () => {
    if (nilaiList.length === 0) {
      toast.error('Tidak ada data untuk diekspor');
      return;
    }

    const exportData = nilaiList.map((n, idx) => ({
      'No': idx + 1,
      'NISN': n.student_nisn,
      'Nama Siswa': n.student_name,
      'Kelas': n.rombel_id,
      'Mata Pelajaran': n.mapel,
      'Nilai Tugas': n.nilai_tugas,
      'Nilai Formatif/Harian': n.nilai_harian,
      'Nilai Ujian': n.nilai_ujian,
      'Nilai Akhir': n.nilai_akhir,
      'KKM': n.kkm,
      'Status': n.status_tuntas,
      'Sumber Data': n.tipe_input
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Nilai');
    XLSX.writeFile(wb, `Rekap_Nilai_${selectedClass}_${selectedMapel}.xlsx`);
    toast.success('File Excel berhasil diunduh!');
  };

  // Calculations for KPI Cards
  const totalStudents = nilaiList.length;
  const avgFinal = totalStudents > 0 ? (nilaiList.reduce((acc, curr) => acc + Number(curr.nilai_akhir), 0) / totalStudents).toFixed(1) : '0';
  const highestScore = totalStudents > 0 ? Math.max(...nilaiList.map(n => Number(n.nilai_akhir))) : 0;
  const lowestScore = totalStudents > 0 ? Math.min(...nilaiList.map(n => Number(n.nilai_akhir))) : 0;
  const tuntasCount = nilaiList.filter(n => n.status_tuntas === 'TUNTAS').length;
  const tuntasPercentage = totalStudents > 0 ? ((tuntasCount / totalStudents) * 100).toFixed(0) : '0';

  const filteredScores = nilaiList.filter(s =>
    s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.student_nisn.includes(searchTerm)
  );

  return (
    <Box sx={{ width: '100%' }}>
      {/* Top Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
            Rekapitulasi Hasil Penilaian
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.3 }}>
            Kelola rekap nilai tugas, penilaian formatif harian, dan ujian online dengan opsi <strong>Sinkronisasi Otomatis</strong> serta <strong>Import Excel</strong>.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="success"
            disabled={syncing}
            startIcon={syncing ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
            onClick={() => handleAutoSync(true)}
            sx={{ borderRadius: 2.5, fontWeight: 700, textTransform: 'none' }}
          >
            {syncing ? 'Menyinkronkan...' : 'Sinkronisasi Otomatis'}
          </Button>

          <Button
            variant="outlined"
            startIcon={<ImportIcon />}
            onClick={() => setOpenImportDialog(true)}
            sx={{ borderRadius: 2.5, fontWeight: 700, textTransform: 'none' }}
          >
            Import Excel
          </Button>

          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExportExcel}
            sx={{ borderRadius: 2.5, fontWeight: 700, textTransform: 'none' }}
          >
            Ekspor Excel
          </Button>
        </Stack>
      </Box>

      {/* KPI Statistic Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <Paper elevation={0} sx={{ p: 2.2, borderRadius: 3, bgcolor: isDarkMode ? '#1e293b' : '#ffffff', border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}` }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Rata-Rata Kelas</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: theme.palette.primary.main, mt: 0.5 }}>{avgFinal}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Dari {totalStudents} siswa</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Paper elevation={0} sx={{ p: 2.2, borderRadius: 3, bgcolor: isDarkMode ? '#1e293b' : '#ffffff', border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}` }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Nilai Tertinggi</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#16a34a', mt: 0.5 }}>{highestScore}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Peringkat puncak</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Paper elevation={0} sx={{ p: 2.2, borderRadius: 3, bgcolor: isDarkMode ? '#1e293b' : '#ffffff', border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}` }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Nilai Terendah</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#dc2626', mt: 0.5 }}>{lowestScore}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Batas evaluasi</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Paper elevation={0} sx={{ p: 2.2, borderRadius: 3, bgcolor: isDarkMode ? '#1e293b' : '#ffffff', border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}` }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Ketuntasan (≥ 75)</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#8b5cf6', mt: 0.5 }}>{tuntasPercentage}%</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{tuntasCount} siswa tuntas</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Filter and Search Bar */}
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
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            select
            size="small"
            label="Pilih Rombel / Kelas"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            {classList.map((c) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </TextField>

          <TextField
            size="small"
            label="Mata Pelajaran"
            value={selectedMapel}
            onChange={(e) => setSelectedMapel(e.target.value)}
            sx={{ minWidth: 200 }}
          />
        </Stack>

        <TextField
          size="small"
          placeholder="Cari siswa atau NISN..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          slotProps={{ input: { startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} /> } }}
          sx={{ minWidth: 240 }}
        />
      </Paper>

      {/* Grade Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
            border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`
          }}
        >
          <TableContainer>
            <Table size="medium">
              <TableHead sx={{ bgcolor: isDarkMode ? '#0f172a' : '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>No</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>NISN</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Nama Siswa</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>Tugas (30%)</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>Harian (30%)</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>Ujian (40%)</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>Nilai Akhir</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>KKM</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>Status</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>Sumber</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredScores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                      Belum ada data nilai untuk kelas dan mata pelajaran ini. Silakan klik tombol "Sinkronisasi Otomatis" atau "Import Excel".
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredScores.map((row, idx) => (
                    <TableRow key={row.id || idx} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{idx + 1}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{row.student_nisn}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: isDarkMode ? '#f8fafc' : '#0f172a' }}>{row.student_name}</TableCell>
                      <TableCell align="center">{row.nilai_tugas}</TableCell>
                      <TableCell align="center">{row.nilai_harian}</TableCell>
                      <TableCell align="center">{row.nilai_ujian}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800, fontSize: '1rem', color: theme.palette.primary.main }}>
                        {row.nilai_akhir}
                      </TableCell>
                      <TableCell align="center" sx={{ color: 'text.secondary' }}>{row.kkm || 75}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={row.status_tuntas}
                          size="small"
                          color={row.status_tuntas === 'TUNTAS' ? 'success' : 'error'}
                          sx={{ fontWeight: 700, fontSize: '0.68rem', height: 22 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={row.tipe_input === 'SISTEM_ONLINE' ? 'Online' : row.tipe_input === 'IMPORT_EXCEL' ? 'Excel' : 'Manual'}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.65rem', height: 20 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Dialog Import Excel */}
      <Dialog
        open={openImportDialog}
        onClose={() => setOpenImportDialog(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <ImportIcon color="primary" />
          Import Rekap Nilai dari File Excel (.xlsx / .xls)
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Pilih file Excel yang memiliki kolom: <strong>Nama Siswa</strong>, <strong>NISN</strong>, <strong>Nilai Tugas</strong>, <strong>Nilai Harian</strong>, dan <strong>Nilai Ujian</strong>. Nilai akhir dan status kelulusan akan dihitung secara otomatis.
          </Alert>

          <Button
            variant="contained"
            component="label"
            startIcon={<ImportIcon />}
            sx={{ py: 1.5, borderRadius: 2.5, fontWeight: 700, textTransform: 'none' }}
          >
            Pilih Berkas Excel dari Komputer
            <input type="file" hidden accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
          </Button>

          {importedPreview.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                Pratinjau ({importedPreview.length} Data Terbaca):
              </Typography>
              <Paper variant="outlined" sx={{ maxHeight: 250, overflowY: 'auto', borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Nama</TableCell>
                      <TableCell>NISN</TableCell>
                      <TableCell align="center">Tugas</TableCell>
                      <TableCell align="center">Harian</TableCell>
                      <TableCell align="center">Ujian</TableCell>
                      <TableCell align="center">Nilai Akhir</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {importedPreview.slice(0, 10).map((p, idx) => (
                      <TableRow key={idx}>
                        <TableCell sx={{ fontWeight: 600 }}>{p.student_name}</TableCell>
                        <TableCell>{p.student_nisn}</TableCell>
                        <TableCell align="center">{p.nilai_tugas}</TableCell>
                        <TableCell align="center">{p.nilai_harian}</TableCell>
                        <TableCell align="center">{p.nilai_ujian}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>{p.nilai_akhir}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenImportDialog(false)} color="inherit" sx={{ fontWeight: 600 }}>
            Batal
          </Button>
          <Button
            onClick={handleSaveImportedExcel}
            variant="contained"
            disabled={importedPreview.length === 0}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Simpan {importedPreview.length} Nilai ke Kelas Ini
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
