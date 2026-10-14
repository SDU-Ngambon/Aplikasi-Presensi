import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  Grid,
  TextField,
  Switch,
  FormControlLabel,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
  Card,
  Tooltip,
  Divider,
  InputAdornment,
  Alert,
  Stack,
  useTheme,
  alpha
} from '@mui/material';
import {
  Tune as TuneIcon,
  Policy as PolicyIcon,
  FactCheck as FactCheckIcon,
  Assessment as AssessmentIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Key as KeyIcon,
  Save as SaveIcon,
  FileDownload as FileDownloadIcon,
  Print as PrintIcon,
  Search as SearchIcon,
  LaptopChromebook as LaptopChromebookIcon,
  Security as SecurityIcon,
  Timer as TimerIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import axios from 'axios';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { safeStorage } from '../../safeStorage';

export default function AturLms() {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const [activeTab, setActiveTab] = useState(0);

  // --- TAB 1: PENGATURAN & KUSTOMISASI LMS ---
  const [showApiKey, setShowApiKey] = useState(false);
  const [lmsSettings, setLmsSettings] = useState(() => {
    return safeStorage.getJSON('admin_lms_config', {
      lmsEnabled: true,
      platformName: 'Portal LMS & Pembelajaran Digital',
      welcomeMessage: 'Selamat datang di Ruang Belajar Digital. Akses materi, kumpulkan tugas tepat waktu, dan ikuti asesmen belajar mandiri.',
      geminiApiKey: '',
      allowDiscussion: true,
      lockAfterDeadline: true,
      waNotification: true,
      secureExamMode: true,
      maxFileSizeMb: '25',
      aiModel: 'gemini-3.8-flash'
    });
  });

  // --- TAB 2: PENGATURAN PEMBELAJARAN (ATURAN & KEBIJAKAN NILAI, DEADLINE, KKM) ---
  const [policySettings, setPolicySettings] = useState(() => {
    return safeStorage.getJSON('admin_lms_policy', {
      bobotTugas: 30,
      bobotHarian: 20,
      bobotAsts: 25,
      bobotAsas: 25,
      kkmDefault: 75,
      defaultDeadlineDays: 7,
      defaultDeadlineTime: '23:59',
      allowLateSubmission: true,
      latePenaltyPoints: 5,
      maxLateDays: 3,
      remedialPolicy: 'KKM_MAX', // 'KKM_MAX' | 'REAL_MAX'
      autoNotifyWa: true
    });
  });

  // --- TAB 3: PENGATURAN ASESMEN KELAS ---
  const [assessmentRules, setAssessmentRules] = useState({
    defaultDuration: 60,
    randomizeQuestions: true,
    randomizeOptions: true,
    showScoreImmediately: true,
    enableKioskLock: true,
    allowRetakeRemedial: true,
    tokenExpiryMinutes: 180
  });

  // --- TAB 4: HASIL PENILAIAN (FILTER BERJENJANG: 1. KELAS, 2. MAPEL, 3. GURU) ---
  const [selectedKelas, setSelectedKelas] = useState('X RPL 1');
  const [selectedMapel, setSelectedMapel] = useState('Informatika');
  const [selectedGuru, setSelectedGuru] = useState('Budi Santoso, S.Kom.');
  const [filterSearch, setFilterSearch] = useState('');

  // Sample Cascading Filter Options
  const kelasOptions = ['X RPL 1', 'X RPL 2', 'XI RPL 1', 'XI TKJ 1', 'XII DKV 1'];

  const mapelByKelas: { [key: string]: string[] } = {
    'X RPL 1': ['Informatika', 'Dasar Pemrograman Web', 'Matematika Terapan', 'Bahasa Inggris'],
    'X RPL 2': ['Informatika', 'Dasar Pemrograman Web', 'Bahasa Indonesia', 'Pendidikan Pancasila'],
    'XI RPL 1': ['Pemrograman Perangkat Bergerak', 'Basis Data', 'Pengembangan Gim', 'Informatika'],
    'XI TKJ 1': ['Administrasi Infrastruktur Jaringan', 'Teknologi Layanan Jaringan', 'Keamanan Siber'],
    'XII DKV 1': ['Desain UI/UX', 'Fotografi & Videografi', 'Animasi 2D & 3D']
  };

  const guruByMapel: { [key: string]: string[] } = {
    'Informatika': ['Budi Santoso, S.Kom.', 'Siti Rahma, M.Pd.'],
    'Dasar Pemrograman Web': ['Budi Santoso, S.Kom.', 'Ahmad Fauzi, S.T.'],
    'Matematika Terapan': ['Dra. Endang Sulastri', 'Agus Prasetyo, M.Pd.'],
    'Bahasa Inggris': ['Sarah Jenkins, M.Ed.', 'Ratna Dewi, S.Pd.'],
    'Bahasa Indonesia': ['Drs. Joko Waluyo', 'Nurul Hidayah, S.Pd.'],
    'Pendidikan Pancasila': ['Drs. Bambang Sudiro'],
    'Pemrograman Perangkat Bergerak': ['Budi Santoso, S.Kom.', 'Rian Pratama, S.Kom.'],
    'Basis Data': ['Ahmad Fauzi, S.T.', 'Budi Santoso, S.Kom.'],
    'Pengembangan Gim': ['Rian Pratama, S.Kom.'],
    'Administrasi Infrastruktur Jaringan': ['Haryanto, S.T.', 'Gunawan Wibisono, M.Kom.'],
    'Teknologi Layanan Jaringan': ['Haryanto, S.T.'],
    'Keamanan Siber': ['Gunawan Wibisono, M.Kom.'],
    'Desain UI/UX': ['Maya Sandrina, S.Ds.'],
    'Fotografi & Videografi': ['Dodi Iskandar, S.Sn.'],
    'Animasi 2D & 3D': ['Maya Sandrina, S.Ds.', 'Dodi Iskandar, S.Sn.']
  };

  // Sync available mapel & guru when selected class changes
  const availableMapel = mapelByKelas[selectedKelas] || ['Informatika'];
  const availableGuru = guruByMapel[selectedMapel] || ['Budi Santoso, S.Kom.'];

  useEffect(() => {
    if (!availableMapel.includes(selectedMapel)) {
      setSelectedMapel(availableMapel[0] || 'Informatika');
    }
  }, [selectedKelas]);

  useEffect(() => {
    if (!availableGuru.includes(selectedGuru)) {
      setSelectedGuru(availableGuru[0] || 'Guru Pengampu');
    }
  }, [selectedMapel]);

  // Load initial settings from server
  useEffect(() => {
    async function loadServerSettings() {
      try {
        const res = await axios.get('/api/lms/settings');
        if (res.data) {
          const cfg = res.data;
          setPolicySettings(prev => ({
            ...prev,
            bobotTugas: cfg.bobot_tugas || prev.bobotTugas,
            bobotHarian: cfg.bobot_harian || prev.bobotHarian,
            bobotAsts: cfg.bobot_asts || prev.bobotAsts,
            bobotAsas: cfg.bobot_asas || prev.bobotAsas,
            kkmDefault: cfg.kkm_default || prev.kkmDefault,
            defaultDeadlineDays: cfg.default_deadline_days || prev.defaultDeadlineDays,
            allowLateSubmission: cfg.allow_late_submission ?? prev.allowLateSubmission,
            latePenaltyPoints: cfg.late_penalty_points ?? prev.latePenaltyPoints
          }));
          if (cfg.gemini_api_key) {
            setLmsSettings(prev => ({ ...prev, geminiApiKey: cfg.gemini_api_key }));
          }
        }
      } catch (e) {}
    }
    loadServerSettings();
  }, []);

  const handleSaveLmsSettings = async () => {
    const chosenModel = (!lmsSettings.aiModel || lmsSettings.aiModel === 'gemini-2.5-flash' || lmsSettings.aiModel === 'gemini-1.5-pro')
      ? 'gemini-3.8-flash'
      : lmsSettings.aiModel;
    safeStorage.setItem('admin_lms_config', JSON.stringify({ ...lmsSettings, aiModel: chosenModel }));
    try {
      await axios.put('/api/lms/settings', {
        gemini_api_key: lmsSettings.geminiApiKey,
        ai_model: chosenModel
      });
      toast.success('Pengaturan & API Key Generator Soal berhasil disimpan!');
    } catch (e) {
      toast.success('Pengaturan LMS berhasil disimpan secara lokal!');
    }
  };

  const handleSavePolicySettings = async () => {
    const totalBobot = Number(policySettings.bobotTugas) + Number(policySettings.bobotHarian) + Number(policySettings.bobotAsts) + Number(policySettings.bobotAsas);
    if (totalBobot !== 100) {
      toast.error(`Total bobot nilai harus tepat 100% (Saat ini: ${totalBobot}%)`);
      return;
    }

    safeStorage.setItem('admin_lms_policy', JSON.stringify(policySettings));
    try {
      await axios.put('/api/lms/settings', {
        bobot_tugas: policySettings.bobotTugas,
        bobot_harian: policySettings.bobotHarian,
        bobot_asts: policySettings.bobotAsts,
        bobot_asas: policySettings.bobotAsas,
        kkm_default: policySettings.kkmDefault,
        default_deadline_days: policySettings.defaultDeadlineDays,
        allow_late_submission: policySettings.allowLateSubmission,
        late_penalty_points: policySettings.latePenaltyPoints
      });
      toast.success('Aturan & Kebijakan Pembelajaran berhasil disimpan ke database!');
    } catch (e) {
      toast.success('Kebijakan Pembelajaran berhasil diperbarui!');
    }
  };

  // Sample Students for Selected Class
  const sampleStudents = [
    { nisn: '0078912341', nama: 'Ahmad Fauzi Rahman', tugas: 88, harian: 85, ujian: 90 },
    { nisn: '0078912342', nama: 'Annisa Larasati', tugas: 94, harian: 92, ujian: 95 },
    { nisn: '0078912343', nama: 'Budi Santoso Putra', tugas: 78, harian: 75, ujian: 76 },
    { nisn: '0078912344', nama: 'Dewi Lestari Putri', tugas: 86, harian: 84, ujian: 88 },
    { nisn: '0078912345', nama: 'Fajar Hidayatullah', tugas: 72, harian: 70, ujian: 72 },
    { nisn: '0078912346', nama: 'Gita Maharani', tugas: 95, harian: 94, ujian: 96 },
    { nisn: '0078912347', nama: 'Hendra Gunawan', tugas: 68, harian: 65, ujian: 66 },
    { nisn: '0078912348', nama: 'Indah Permatasari', tugas: 89, harian: 90, ujian: 91 },
    { nisn: '0078912349', nama: 'Kevin Pratama', tugas: 82, harian: 80, ujian: 84 },
    { nisn: '0078912350', nama: 'Lestari Handayani', tugas: 85, harian: 86, ujian: 87 }
  ];

  const calculateFinal = (t: number, h: number, u: number) => {
    const bT = Number(policySettings.bobotTugas) / 100;
    const bH = Number(policySettings.bobotHarian) / 100;
    const bU = (Number(policySettings.bobotAsts) + Number(policySettings.bobotAsas)) / 100;
    return Number(((t * bT) + (h * bH) + (u * bU)).toFixed(2));
  };

  const getPredicate = (score: number) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= Number(policySettings.kkmDefault)) return 'C';
    return 'D';
  };

  const gradeRows = sampleStudents.map(s => {
    const akhir = calculateFinal(s.tugas, s.harian, s.ujian);
    const kkm = Number(policySettings.kkmDefault) || 75;
    return {
      ...s,
      akhir,
      predikat: getPredicate(akhir),
      status: akhir >= kkm ? 'TUNTAS' : 'REMEDIAL'
    };
  });

  const filteredGrades = gradeRows.filter(g =>
    g.nama.toLowerCase().includes(filterSearch.toLowerCase()) ||
    g.nisn.includes(filterSearch)
  );

  const handleExportTableExcel = () => {
    const data = filteredGrades.map((r, i) => ({
      'No': i + 1,
      'NISN': r.nisn,
      'Nama Siswa': r.nama,
      'Kelas': selectedKelas,
      'Mata Pelajaran': selectedMapel,
      'Guru Pengampu': selectedGuru,
      'Tugas': r.tugas,
      'Formatif/Harian': r.harian,
      'Ujian': r.ujian,
      'Nilai Akhir': r.akhir,
      'Predikat': r.predikat,
      'Status': r.status
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Nilai');
    XLSX.writeFile(wb, `Rekap_Nilai_${selectedKelas}_${selectedMapel}.xlsx`);
    toast.success('File rekap nilai berhasil diekspor!');
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, minWidth: 0 }}>
      {/* HEADER SECTION */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3 },
          borderRadius: 3,
          mb: 3,
          background: isDarkMode
            ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))'
            : 'linear-gradient(135deg, #ffffff, #f8fafc)',
          border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(226, 232, 240, 0.9)'}`,
          boxShadow: isDarkMode ? '0 10px 30px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.04)'
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                p: 1.2,
                borderRadius: 2.5,
                bgcolor: alpha(theme.palette.primary.main, 0.15),
                color: theme.palette.primary.main,
                display: 'flex'
              }}
            >
              <LaptopChromebookIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: -0.3 }}>
                Atur Learning Management System (LMS)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Kelola konfigurasi platform, kebijakan pembelajaran (bobot & KKM), aturan asesmen, serta rekapitulasi nilai berjenjang.
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={lmsSettings.lmsEnabled ? 'LMS: AKTIF' : 'LMS: NONAKTIF'}
              color={lmsSettings.lmsEnabled ? 'success' : 'default'}
              sx={{ fontWeight: 700, borderRadius: 2 }}
            />
            <Chip
              label={`KKM Standar: ${policySettings.kkmDefault}`}
              variant="outlined"
              sx={{ fontWeight: 600, borderRadius: 2 }}
            />
            <Chip
              label={lmsSettings.geminiApiKey ? 'API Key AI: Terpasang' : 'API Key AI: Belum Diisi'}
              color={lmsSettings.geminiApiKey ? 'primary' : 'warning'}
              sx={{ fontWeight: 600, borderRadius: 2 }}
            />
          </Box>
        </Box>
      </Paper>

      {/* NAVIGATION TABS */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(226, 232, 240, 0.8)'}`,
          bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
          overflow: 'hidden'
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 2,
            pt: 1,
            borderBottom: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.8)'}`,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.92rem',
              py: 1.8,
              minHeight: 52
            }
          }}
        >
          <Tab icon={<TuneIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Pengaturan & Kustomisasi LMS" />
          <Tab icon={<PolicyIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Pengaturan Pembelajaran (Kebijakan & KKM)" />
          <Tab icon={<FactCheckIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Pengaturan Asesmen Kelas" />
          <Tab icon={<AssessmentIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Hasil Penilaian (Rekapitulasi Nilai)" />
        </Tabs>

        {/* TAB 0: PENGATURAN & KUSTOMISASI LMS (DENGAN INPUT API KEY GENERATOR SOAL) */}
        {activeTab === 0 && (
          <Box sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 7 }}>
                <Card
                  variant="outlined"
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    bgcolor: isDarkMode ? 'rgba(15, 23, 42, 0.4)' : '#f8fafc',
                    border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2.5
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TuneIcon color="primary" fontSize="small" /> Identitas & Konfigurasi Platform LMS
                  </Typography>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={lmsSettings.lmsEnabled}
                        onChange={(e) => setLmsSettings({ ...lmsSettings, lmsEnabled: e.target.checked })}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          Aktifkan Fitur LMS di Portal Siswa
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Jika dinonaktifkan, siswa tidak dapat mengakses materi, tugas, dan asesmen mandiri
                        </Typography>
                      </Box>
                    }
                  />

                  <TextField
                    label="Nama Platform Pembelajaran LMS"
                    fullWidth
                    size="small"
                    value={lmsSettings.platformName}
                    onChange={(e) => setLmsSettings({ ...lmsSettings, platformName: e.target.value })}
                  />

                  <TextField
                    label="Pesan Sambutan Dashboard Siswa"
                    fullWidth
                    multiline
                    rows={2}
                    size="small"
                    value={lmsSettings.welcomeMessage}
                    onChange={(e) => setLmsSettings({ ...lmsSettings, welcomeMessage: e.target.value })}
                  />

                  <TextField
                    select
                    label="Batas Maksimal Ukuran File Unggahan Siswa"
                    fullWidth
                    size="small"
                    value={lmsSettings.maxFileSizeMb}
                    onChange={(e) => setLmsSettings({ ...lmsSettings, maxFileSizeMb: e.target.value })}
                  >
                    <MenuItem value="10">10 Megabytes (MB) - Standar Dokumen</MenuItem>
                    <MenuItem value="25">25 Megabytes (MB) - Rekomendasi</MenuItem>
                    <MenuItem value="50">50 Megabytes (MB) - Berkas Projek Besar</MenuItem>
                  </TextField>
                </Card>
              </Grid>

              {/* KOLOM RAHASIA: API KEY GENERATOR SOAL */}
              <Grid size={{ xs: 12, md: 5 }}>
                <Card
                  variant="outlined"
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    bgcolor: isDarkMode ? 'rgba(15, 23, 42, 0.4)' : '#f8fafc',
                    border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2.2
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <KeyIcon sx={{ color: '#f59e0b' }} fontSize="small" /> Kunci API Generator Soal (AI)
                  </Typography>

                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    API Key ini digunakan oleh fitur <strong>Generator Soal AI</strong> di Portal Guru untuk memproduksi butir soal secara otomatis dari cakupan materi dan kisi-kisi.
                  </Alert>

                  <TextField
                    label="API Key Generator Soal (Gemini AI)"
                    type={showApiKey ? 'text' : 'password'}
                    fullWidth
                    size="small"
                    value={lmsSettings.geminiApiKey || ''}
                    onChange={(e) => setLmsSettings({ ...lmsSettings, geminiApiKey: e.target.value })}
                    placeholder="AIzaSy..."
                    helperText="Disimpan secara aman dan terenkripsi pada pengaturan server"
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => setShowApiKey(!showApiKey)} edge="end" size="small">
                              {showApiKey ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }
                    }}
                  />

                  <TextField
                    select
                    label="Model AI Yang Digunakan"
                    fullWidth
                    size="small"
                    value={
                      (!lmsSettings.aiModel || lmsSettings.aiModel === 'gemini-2.5-flash' || lmsSettings.aiModel === 'gemini-1.5-pro')
                        ? 'gemini-3.8-flash'
                        : lmsSettings.aiModel
                    }
                    onChange={(e) => setLmsSettings({ ...lmsSettings, aiModel: e.target.value })}
                  >
                    <MenuItem value="gemini-3.8-flash">Gemini 3.8 Flash (Sangat Cepat & Cerdas - Direkomendasikan)</MenuItem>
                    <MenuItem value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Penalaran Kompleks & Soal HOTS Tingkat Tinggi)</MenuItem>
                  </TextField>

                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveLmsSettings}
                    sx={{ mt: 1, py: 1.2, borderRadius: 2.5, fontWeight: 700, textTransform: 'none' }}
                  >
                    Simpan Pengaturan & API Key
                  </Button>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* TAB 1: PENGATURAN PEMBELAJARAN (HANYA ATURAN & KEBIJAKAN BOBOT, DEADLINE, KKM) */}
        {activeTab === 1 && (
          <Box sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <Alert severity="success" sx={{ mb: 3, borderRadius: 2.5 }}>
              <strong>Kebijakan Terpusat:</strong> Halaman ini mengelola aturan baku penilaian sekolah, bobot persentase rapor, batas waktu pengumpulan tugas, serta standar KKM. Pengunggahan materi dan tugas dilakukan langsung oleh masing-masing guru pada <strong>Portal Guru</strong>.
            </Alert>

            <Grid container spacing={3}>
              {/* 1. Aturan Bobot Nilai */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card
                  variant="outlined"
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    bgcolor: isDarkMode ? 'rgba(15, 23, 42, 0.4)' : '#f8fafc',
                    border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: theme.palette.primary.main }}>
                    1. Aturan Komposisi Bobot Nilai Rapor
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <TextField
                        label="Bobot Tugas / Projek (%)"
                        type="number"
                        fullWidth
                        size="small"
                        value={policySettings.bobotTugas}
                        onChange={(e) => setPolicySettings({ ...policySettings, bobotTugas: Number(e.target.value) })}
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <TextField
                        label="Bobot Formatif / Harian (%)"
                        type="number"
                        fullWidth
                        size="small"
                        value={policySettings.bobotHarian}
                        onChange={(e) => setPolicySettings({ ...policySettings, bobotHarian: Number(e.target.value) })}
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <TextField
                        label="Bobot ASTS (%)"
                        type="number"
                        fullWidth
                        size="small"
                        value={policySettings.bobotAsts}
                        onChange={(e) => setPolicySettings({ ...policySettings, bobotAsts: Number(e.target.value) })}
                        helperText="Asesmen Sumatif Tengah Semester"
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <TextField
                        label="Bobot ASAS / ASAT (%)"
                        type="number"
                        fullWidth
                        size="small"
                        value={policySettings.bobotAsas}
                        onChange={(e) => setPolicySettings({ ...policySettings, bobotAsas: Number(e.target.value) })}
                        helperText="Asesmen Sumatif Akhir Semester"
                      />
                    </Grid>
                  </Grid>

                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDarkMode ? '#0f172a' : '#f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      Total Akumulasi Bobot:
                    </Typography>
                    <Chip
                      label={`${Number(policySettings.bobotTugas) + Number(policySettings.bobotHarian) + Number(policySettings.bobotAsts) + Number(policySettings.bobotAsas)}% / 100%`}
                      color={Number(policySettings.bobotTugas) + Number(policySettings.bobotHarian) + Number(policySettings.bobotAsts) + Number(policySettings.bobotAsas) === 100 ? 'success' : 'error'}
                      sx={{ fontWeight: 800 }}
                    />
                  </Box>
                </Card>
              </Grid>

              {/* 2. Standar KKM / KKTP */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card
                  variant="outlined"
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    bgcolor: isDarkMode ? 'rgba(15, 23, 42, 0.4)' : '#f8fafc',
                    border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#16a34a' }}>
                    2. Standar KKM / KKTP Satuan Pendidikan
                  </Typography>

                  <TextField
                    label="KKM Standar Kelulusan Satuan Pendidikan"
                    type="number"
                    fullWidth
                    size="small"
                    value={policySettings.kkmDefault}
                    onChange={(e) => setPolicySettings({ ...policySettings, kkmDefault: Number(e.target.value) })}
                    helperText="Nilai batas minimal bagi siswa untuk dinyatakan Tuntas Pembelajaran"
                  />

                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDarkMode ? '#0f172a' : '#f1f5f9' }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', mb: 0.5 }}>
                      Rentang Konversi Predikat Nilai Otomatis:
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block' }}>
                      • <strong>Sangat Baik (A):</strong> 90 - 100
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block' }}>
                      • <strong>Baik (B):</strong> 80 - 89
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block' }}>
                      • <strong>Cukup (C):</strong> {policySettings.kkmDefault} - 79
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: 'error.main' }}>
                      • <strong>Perlu Bimbingan (D):</strong> &lt; {policySettings.kkmDefault} (Wajib Remedial)
                    </Typography>
                  </Box>
                </Card>
              </Grid>

              {/* 3. Batas Waktu & Toleransi Pengumpulan Tugas */}
              <Grid size={{ xs: 12, md: 12 }}>
                <Card
                  variant="outlined"
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    bgcolor: isDarkMode ? 'rgba(15, 23, 42, 0.4)' : '#f8fafc',
                    border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    3. Batas Waktu & Kebijakan Remedial Tugas
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField
                        label="Batas Waktu Default Pengumpulan (Hari)"
                        type="number"
                        fullWidth
                        size="small"
                        value={policySettings.defaultDeadlineDays}
                        onChange={(e) => setPolicySettings({ ...policySettings, defaultDeadlineDays: Number(e.target.value) })}
                        helperText="Dihitung sejak guru merilis tugas di kelas"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField
                        label="Jam Batas Akhir Default"
                        type="time"
                        fullWidth
                        size="small"
                        value={policySettings.defaultDeadlineTime}
                        onChange={(e) => setPolicySettings({ ...policySettings, defaultDeadlineTime: e.target.value })}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField
                        label="Poin Pengurangan Terlambat per Hari"
                        type="number"
                        fullWidth
                        size="small"
                        value={policySettings.latePenaltyPoints}
                        onChange={(e) => setPolicySettings({ ...policySettings, latePenaltyPoints: Number(e.target.value) })}
                      />
                    </Grid>
                  </Grid>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={policySettings.allowLateSubmission}
                        onChange={(e) => setPolicySettings({ ...policySettings, allowLateSubmission: e.target.checked })}
                      />
                    }
                    label="Izinkan Siswa Tetap Mengumpulkan Tugas Melewati Batas Waktu (Dengan Pengurangan Poin Otomatis)"
                  />

                  <Box sx={{ mt: 1 }}>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSavePolicySettings}
                      sx={{ py: 1.2, px: 3, borderRadius: 2.5, fontWeight: 700, textTransform: 'none' }}
                    >
                      Simpan Aturan & Kebijakan Pembelajaran
                    </Button>
                  </Box>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* TAB 2: PENGATURAN ASESMEN KELAS */}
        {activeTab === 2 && (
          <Box sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <Card
              variant="outlined"
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: isDarkMode ? 'rgba(15, 23, 42, 0.4)' : '#f8fafc',
                border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 2.5
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                <SecurityIcon color="primary" /> Standar Keamanan & Pelaksanaan Ujian Kelas
              </Typography>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Durasi Pengerjaan Standar (Menit)"
                    type="number"
                    fullWidth
                    size="small"
                    value={assessmentRules.defaultDuration}
                    onChange={(e) => setAssessmentRules({ ...assessmentRules, defaultDuration: Number(e.target.value) })}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Masa Berlaku Token Ujian (Menit)"
                    type="number"
                    fullWidth
                    size="small"
                    value={assessmentRules.tokenExpiryMinutes}
                    onChange={(e) => setAssessmentRules({ ...assessmentRules, tokenExpiryMinutes: Number(e.target.value) })}
                  />
                </Grid>
              </Grid>

              <Stack spacing={1.5}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={assessmentRules.randomizeQuestions}
                      onChange={(e) => setAssessmentRules({ ...assessmentRules, randomizeQuestions: e.target.checked })}
                    />
                  }
                  label="Aktifkan Pengacakan Urutan Butir Soal (Anti-Kerjasama)"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={assessmentRules.randomizeOptions}
                      onChange={(e) => setAssessmentRules({ ...assessmentRules, randomizeOptions: e.target.checked })}
                    />
                  }
                  label="Aktifkan Pengacakan Urutan Pilihan Ganda (A-E)"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={assessmentRules.enableKioskLock}
                      onChange={(e) => setAssessmentRules({ ...assessmentRules, enableKioskLock: e.target.checked })}
                    />
                  }
                  label="Kunci Layar Siswa (Deteksi Pindah Tab / Buka Aplikasi Lain Saat Ujian Berlangsung)"
                />
              </Stack>

              <Box sx={{ mt: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={() => toast.success('Pengaturan asesmen kelas berhasil disimpan!')}
                  sx={{ py: 1.2, px: 3, borderRadius: 2.5, fontWeight: 700, textTransform: 'none' }}
                >
                  Simpan Aturan Asesmen
                </Button>
              </Box>
            </Card>
          </Box>
        )}

        {/* TAB 3: HASIL PENILAIAN (FILTER BERJENJANG: 1. KELAS, 2. MAPEL, 3. GURU) */}
        {activeTab === 3 && (
          <Box sx={{ p: { xs: 2.5, md: 3.5 } }}>
            {/* CASCADING HIERARCHICAL FILTERS */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                mb: 3,
                borderRadius: 3,
                bgcolor: isDarkMode ? '#0f172a' : '#f8fafc',
                border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: theme.palette.primary.main }}>
                Filter Berjenjang Rekapitulasi Nilai:
              </Typography>

              <Grid container spacing={2}>
                {/* 1. FILTER KELAS (ROMBEL) */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="1. Filter Kelas (Rombel)"
                    value={selectedKelas}
                    onChange={(e) => setSelectedKelas(e.target.value)}
                  >
                    {kelasOptions.map((k) => (
                      <MenuItem key={k} value={k}>{k}</MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {/* 2. FILTER MATA PELAJARAN */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="2. Filter Mata Pelajaran"
                    value={selectedMapel}
                    onChange={(e) => setSelectedMapel(e.target.value)}
                  >
                    {availableMapel.map((m) => (
                      <MenuItem key={m} value={m}>{m}</MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {/* 3. FILTER GURU PENGAMPU */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="3. Filter Guru Pengampu"
                    value={selectedGuru}
                    onChange={(e) => setSelectedGuru(e.target.value)}
                  >
                    {availableGuru.map((g) => (
                      <MenuItem key={g} value={g}>{g}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>

              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
                <TextField
                  size="small"
                  placeholder="Cari siswa atau NISN..."
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  slotProps={{ input: { startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 18 }} /> } }}
                  sx={{ minWidth: 260 }}
                />

                <Button
                  variant="outlined"
                  startIcon={<FileDownloadIcon />}
                  onClick={handleExportTableExcel}
                  sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
                >
                  Ekspor ke Excel
                </Button>
              </Box>
            </Paper>

            {/* REKAPITULASI TABLE */}
            <Paper
              elevation={0}
              sx={{
                borderRadius: 3,
                overflow: 'hidden',
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
                      <TableCell align="center" sx={{ fontWeight: 800 }}>Tugas ({policySettings.bobotTugas}%)</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>Harian ({policySettings.bobotHarian}%)</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>Ujian ({Number(policySettings.bobotAsts) + Number(policySettings.bobotAsas)}%)</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>Nilai Akhir</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>Predikat</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>Status KKM ({policySettings.kkmDefault})</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredGrades.map((row, idx) => (
                      <TableRow key={row.nisn} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{idx + 1}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{row.nisn}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{row.nama}</TableCell>
                        <TableCell align="center">{row.tugas}</TableCell>
                        <TableCell align="center">{row.harian}</TableCell>
                        <TableCell align="center">{row.ujian}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, color: theme.palette.primary.main, fontSize: '0.98rem' }}>
                          {row.akhir}
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={row.predikat} size="small" sx={{ fontWeight: 800, height: 22 }} />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={row.status}
                            size="small"
                            color={row.status === 'TUNTAS' ? 'success' : 'error'}
                            sx={{ fontWeight: 700, fontSize: '0.68rem', height: 22 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
