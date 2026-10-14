import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  MenuItem,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tooltip,
  RadioGroup,
  FormControlLabel,
  Radio,
  Grid
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VerifiedIcon from '@mui/icons-material/Verified';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PrintIcon from '@mui/icons-material/Print';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DrawIcon from '@mui/icons-material/Draw';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ClearIcon from '@mui/icons-material/Clear';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import RefreshIcon from '@mui/icons-material/Refresh';
import axios from 'axios';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import DrillDownPerangkatModal from './DrillDownPerangkatModal';
import LembarPengesahanModal from './LembarPengesahanModal';
import RekapSupervisiModal from './RekapSupervisiModal';
import { PengaturanWaRekapModal } from './PengaturanWaRekapModal';
import { KirimWaRekapModal } from './KirimWaRekapModal';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import SettingsIcon from '@mui/icons-material/Settings';

interface PerangkatKepsekViewProps {
  initialTab?: number;
  currentUser?: any;
}

export default function PerangkatKepsekView({ initialTab = 0, currentUser }: PerangkatKepsekViewProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  // Period / Filter State
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState('2024/2025');
  const [selectedSemester, setSelectedSemester] = useState('Ganjil');
  const [tahunAjaranList, setTahunAjaranList] = useState<any[]>([]);
  const [isApprovingAll, setIsApprovingAll] = useState(false);

  // Lembar Pengesahan Modal State
  const [pengesahanModalData, setPengesahanModalData] = useState<any | null>(null);
  const [schoolSettings, setSchoolSettings] = useState<any>({});
  const [rekapModalOpen, setRekapModalOpen] = useState(false);

  // WhatsApp Rekap Modals
  const [waRekapModalOpen, setWaRekapModalOpen] = useState(false);
  const [waPengaturanModalOpen, setWaPengaturanModalOpen] = useState(false);

  // Endorsement Signing Dialog State
  const [signingModalOpen, setSigningModalOpen] = useState(false);
  const [targetTeacher, setTargetTeacher] = useState<any | null>(null);
  const [endorseType, setEndorseType] = useState<'TTD_DIGITAL' | 'QR_CODE'>('QR_CODE');
  const [isSubmittingSignature, setIsSubmittingSignature] = useState(false);

  // Canvas Signature Pad State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignatureDrawing, setHasSignatureDrawing] = useState(false);

  // Fetch active period and list of tahun ajaran
  const fetchConfig = async () => {
    try {
      const [taRes, cfgRes] = await Promise.all([
        axios.get('/api/tahun-ajaran'),
        axios.get('/api/tahun-ajaran/active-config')
      ]);
      const list = Array.isArray(taRes.data) 
        ? taRes.data 
        : (Array.isArray(taRes.data?.data) ? taRes.data.data : []);
      if (list.length > 0) {
        setTahunAjaranList(list);
      }
      if (cfgRes.data) {
        const cfg = cfgRes.data.data || cfgRes.data;
        const activeTa = cfg.active_tahun_ajaran || cfg.tahun_ajaran;
        const activeSem = cfg.active_semester || cfg.semester;
        if (activeTa) setSelectedTahunAjaran(activeTa);
        if (activeSem) setSelectedSemester(activeSem);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const loadReports = async (ta?: string, sem?: string) => {
    const currentTa = ta || selectedTahunAjaran;
    const currentSem = sem || selectedSemester;

    try {
      setIsLoading(true);
      const [repRes, setRes] = await Promise.all([
        axios.get('/api/perangkat/progress-report', { params: { tahun_ajaran: currentTa, semester: currentSem } }),
        axios.get('/api/settings').catch(() => ({ data: {} }))
      ]);
      if (repRes.data && repRes.data.data) {
        setReports(repRes.data.data);
      }
      if (setRes.data) {
        setSchoolSettings(setRes.data);
      }
    } catch (e) {
      toast.error('Gagal memuat data supervisi');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports(selectedTahunAjaran, selectedSemester);
  }, [selectedTahunAjaran, selectedSemester]);

  const handleApproveAllGlobal = async () => {
    const readyTeachers = reports.filter(r => r.status_pengesahan === 'MENUNGGU_PENGESAHAN');
    if (readyTeachers.length === 0) {
      toast.error('Tidak ada guru dengan status "Siap Disahkan" pada periode ini');
      return;
    }

    if (!window.confirm(`Sahkan sekaligus ${readyTeachers.length} guru yang telah lolos verifikasi kurikulum dengan QR Code Resmi?`)) {
      return;
    }

    try {
      setIsApprovingAll(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await axios.post(
        '/api/perangkat/approve-all',
        {
          tahun_ajaran: selectedTahunAjaran,
          semester: selectedSemester,
          tipe_pengesahan: 'QR_CODE'
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      toast.success(res.data.message || 'Seluruh berkas guru terverifikasi berhasil disahkan');
      loadReports();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Gagal mengesahkan secara massal');
    } finally {
      setIsApprovingAll(false);
    }
  };

  const handleResetPengesahanTeacher = async (teacherId: string, teacherName: string) => {
    if (!window.confirm(`Batalkan / Reset pengesahan untuk guru "${teacherName}"? Berkas akan kembali ke status verifikasi.`)) {
      return;
    }

    try {
      setIsLoading(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      await axios.post(
        `/api/perangkat/pengesahan/${teacherId}/reset`,
        {
          tahun_ajaran: selectedTahunAjaran,
          semester: selectedSemester
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      toast.success(`Pengesahan untuk guru "${teacherName}" berhasil dibatalkan`);
      loadReports();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Gagal mereset pengesahan');
    } finally {
      setIsLoading(false);
    }
  };

  // Canvas Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    setIsDrawing(true);
    setHasSignatureDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignatureDrawing(false);
  };

  const handleOpenSigning = (teacherRow: any) => {
    setTargetTeacher(teacherRow);
    setEndorseType('QR_CODE');
    setHasSignatureDrawing(false);
    setSigningModalOpen(true);
    setTimeout(() => {
      clearCanvas();
    }, 200);
  };

  const handleSubmitEndorsement = async () => {
    if (!targetTeacher) return;

    let ttdBase64: string | null = null;
    if (endorseType === 'TTD_DIGITAL') {
      const canvas = canvasRef.current;
      if (!canvas || !hasSignatureDrawing) {
        toast.error('Silakan bubuhkan tanda tangan Anda pada bidang kanvas');
        return;
      }
      ttdBase64 = canvas.toDataURL('image/png');
    }

    try {
      setIsSubmittingSignature(true);
      const token = localStorage.getItem('token') || localStorage.getItem('guru_token') || sessionStorage.getItem('token');
      const kepsekName = currentUser?.name || schoolSettings?.headmaster_name || 'Kepala Sekolah';

      const periodTa = selectedTahunAjaran || targetTeacher.tahun_ajaran || '2024/2025';
      const periodSem = selectedSemester || targetTeacher.semester || 'Ganjil';

      const payload = {
        teacher_id: targetTeacher.teacher_id,
        teacher_name: targetTeacher.name,
        nip: targetTeacher.nip,
        tahun_ajaran: periodTa,
        semester: periodSem,
        tipe_pengesahan: endorseType,
        ttd_image_base64: ttdBase64,
        qr_signature_data: {
          verified_by: kepsekName,
          teacher: targetTeacher.name,
          nip: targetTeacher.nip || '-',
          academic_year: `${periodTa} ${periodSem}`,
          date: new Date().toISOString(),
          security_hash: `VERIF-KEPSEK-${targetTeacher.teacher_id.slice(0, 5)}-${Date.now()}`
        }
      };

      await axios.post('/api/perangkat/pengesahan', payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      toast.success(`Perangkat ajar ${targetTeacher.name} berhasil disahkan!`);
      setSigningModalOpen(false);
      loadReports(periodTa, periodSem);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Gagal mengesahkan perangkat');
    } finally {
      setIsSubmittingSignature(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (reports.length === 0) {
      toast.error('Belum ada data untuk diekspor');
      return;
    }

    const excelData = reports.map((r, i) => ({
      No: i + 1,
      'Nama Guru': r.name,
      NIP: r.nip || '-',
      WhatsApp: r.whatsapp || '-',
      'Mapel / Rombel': r.class || '-',
      'Target Wajib': r.total_wajib,
      'Sudah Unggah': r.sudah_upload,
      'Terverifikasi Kurikulum': r.terverifikasi,
      'Progres (%)': `${r.persentase}%`,
      'Status Pengesahan': r.status_pengesahan
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Supervisi Perangkat Ajar');
    XLSX.writeFile(wb, `Laporan_Supervisi_Perangkat_Ajar_${Date.now()}.xlsx`);
    toast.success('Laporan supervisi berhasil diunduh (Excel)');
  };

  // Filtered reports
  const filteredReports = reports.filter(r => {
    const matchSearch = r.name?.toLowerCase().includes(searchQuery.toLowerCase()) || r.nip?.includes(searchQuery);
    if (!matchSearch) return false;
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'DISAHKAN') return r.status_pengesahan === 'DISAHKAN';
    if (statusFilter === 'SIAP') return r.status_pengesahan === 'MENUNGGU_PENGESAHAN';
    if (statusFilter === 'BELUM') return r.status_pengesahan === 'BELUM_LENGKAP';
    return true;
  });

  // Ready for endorsement count
  const totalReady = reports.filter(r => r.status_pengesahan === 'MENUNGGU_PENGESAHAN').length;
  const totalEndorsed = reports.filter(r => r.status_pengesahan === 'DISAHKAN').length;

  return (
    <Box sx={{ pb: { xs: 1.5, md: 3 } }}>
      {/* HEADER TAMPILAN PERANGKAT KEPSEK */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <Box
            sx={{
              width: { xs: 36, sm: 42 },
              height: { xs: 36, sm: 42 },
              borderRadius: 2.5,
              bgcolor: activeTab === 1 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(59, 130, 246, 0.12)',
              color: activeTab === 1 ? '#059669' : '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {activeTab === 1 ? <VerifiedIcon sx={{ fontSize: { xs: 20, sm: 24 } }} /> : <AssessmentIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />}
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0f172a', lineHeight: 1.2, fontSize: { xs: '0.92rem', sm: '1.1rem' } }}>
              {activeTab === 1 ? 'Validasi & Pengesahan Perangkat' : 'Supervisi Perangkat Ajar'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: { xs: '0.68rem', sm: '0.75rem' }, display: 'block' }}>
              {activeTab === 1 ? 'Pengesahan dan tanda tangan digital/QR berkas guru' : 'Monitoring kelengkapan dan persentase perangkat ajar guru'}
            </Typography>
          </Box>
        </Box>
        {activeTab === 1 && totalReady > 0 && (
          <Chip
            label={`${totalReady} Menunggu Pengesahan`}
            size="small"
            color="warning"
            sx={{ fontWeight: 800, fontSize: '0.68rem', height: 22 }}
          />
        )}
      </Box>

      {/* BAR FILTER PERIODE */}
      <Box sx={{ p: 2, mb: 3, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ fontWeight: 800, color: '#334155' }}>
            Periode Supervisi:
          </Typography>
          <TextField
            select
            size="small"
            label="Tahun Ajaran"
            value={selectedTahunAjaran}
            onChange={e => setSelectedTahunAjaran(e.target.value)}
            sx={{ minWidth: 170, bgcolor: '#ffffff' }}
          >
            {tahunAjaranList.length > 0 ? (
              tahunAjaranList.map((t: any) => {
                const val = t.nama || t.tahun || t.name || '';
                if (!val) return null;
                return (
                  <MenuItem key={t.id || val} value={val}>
                    {val} {t.is_active || t.isActive ? '(Aktif)' : ''}
                  </MenuItem>
                );
              })
            ) : (
              [
                <MenuItem key="2024/2025" value="2024/2025">2024/2025</MenuItem>,
                <MenuItem key="2025/2026" value="2025/2026">2025/2026</MenuItem>
              ]
            )}
            {selectedTahunAjaran && !tahunAjaranList.some((t: any) => (t.nama || t.tahun || t.name) === selectedTahunAjaran) && (
              <MenuItem value={selectedTahunAjaran}>{selectedTahunAjaran}</MenuItem>
            )}
          </TextField>

          <TextField
            select
            size="small"
            label="Semester"
            value={selectedSemester}
            onChange={e => setSelectedSemester(e.target.value)}
            sx={{ minWidth: 130, bgcolor: '#ffffff' }}
          >
            <MenuItem value="Ganjil">Ganjil</MenuItem>
            <MenuItem value="Genap">Genap</MenuItem>
          </TextField>

          <Button
            size="small"
            variant="outlined"
            color="inherit"
            startIcon={<RefreshIcon />}
            onClick={() => loadReports()}
            sx={{ fontWeight: 700 }}
          >
            Segarkan
          </Button>
        </Box>

        {activeTab === 1 && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<DoneAllIcon />}
            onClick={handleApproveAllGlobal}
            disabled={isApprovingAll || totalReady === 0}
            sx={{ fontWeight: 800, borderRadius: 2 }}
          >
            {isApprovingAll ? 'Mengesahkan...' : `Sahkan Semua Guru Siap (${totalReady})`}
          </Button>
        )}
      </Box>

      {/* STATS OVERVIEW CARDS */}
      <Grid container spacing={2} sx={{ mb: 3.5 }}>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 2.5, border: '1px solid #e2e8f0', bgcolor: '#ffffff', height: '100%' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', fontSize: '0.7rem' }}>
                TOTAL GURU
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#0f172a', my: 0.5 }}>
                {reports.length}
              </Typography>
              <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.68rem', display: 'block' }}>
                Guru terdaftar
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 2.5, border: '1px solid #bbf7d0', bgcolor: '#f0fdf4', height: '100%' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#166534', fontSize: '0.7rem' }}>
                DISAHKAN
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#16a34a', my: 0.5 }}>
                {totalEndorsed}
              </Typography>
              <Typography variant="caption" color="#166534" sx={{ fontSize: '0.68rem', display: 'block' }}>
                Terdigitalisasi
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 2.5, border: '1px solid #fed7aa', bgcolor: '#fffbeb', height: '100%' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#9a3412', fontSize: '0.7rem' }}>
                SIAP SAHKAN
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#d97706', my: 0.5 }}>
                {totalReady}
              </Typography>
              <Typography variant="caption" color="#9a3412" sx={{ fontSize: '0.68rem', display: 'block' }}>
                Lolos verifikasi
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 2.5, border: '1px solid #e2e8f0', bgcolor: '#ffffff', height: '100%' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', fontSize: '0.7rem' }}>
                PROSES
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#64748b', my: 0.5 }}>
                {reports.length - totalEndorsed - totalReady}
              </Typography>
              <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.68rem', display: 'block' }}>
                Belum lengkap
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* TAB 0: SUPERVISI PERANGKAT AJAR */}
      {activeTab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2, mb: 3 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
                Laporan & Monitoring Supervisi Akademik
              </Typography>
              <Typography variant="body2" color="#64748b">
                Supervisi progres berkas perangkat perencanaan pembelajaran seluruh dewan guru secara komprehensif.
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', md: 'auto' } }}>
              <TextField
                size="small"
                placeholder="Cari guru / NIP..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: 20 }} />
                      </InputAdornment>
                    )
                  }
                }}
                sx={{ width: { xs: '100%', sm: 200 } }}
              />

              <Button
                variant="contained"
                color="success"
                startIcon={<WhatsAppIcon />}
                onClick={() => setWaRekapModalOpen(true)}
                sx={{ fontWeight: 800, flex: { xs: '1 1 100%', sm: '1 1 auto' }, minHeight: 40 }}
              >
                Kirim Rekap WA
              </Button>

              <Button
                variant="outlined"
                color="success"
                startIcon={<FileDownloadIcon />}
                onClick={handleExportExcel}
                sx={{ fontWeight: 700, flex: { xs: '1 1 100%', sm: '1 1 auto' }, minHeight: 40 }}
              >
                Ekspor Excel
              </Button>

              <Button
                variant="outlined"
                color="primary"
                startIcon={<PrintIcon />}
                onClick={() => setRekapModalOpen(true)}
                sx={{ fontWeight: 700, flex: { xs: '1 1 100%', sm: '1 1 auto' }, minHeight: 40 }}
              >
                Cetak Rekap
              </Button>
            </Box>
          </Box>

          {/* DESKTOP TABLE VIEW (>= 768px) */}
          <Box sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto' }}>
            <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <CardContent sx={{ p: 0 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, width: 40 }}>No</TableCell>
                      <TableCell sx={{ fontWeight: 800, minWidth: 260 }}>Nama Guru & Mapel Diampu</TableCell>
                      <TableCell sx={{ fontWeight: 800, width: 140 }}>NIP</TableCell>
                      <TableCell sx={{ fontWeight: 800, textAlign: 'center', width: 120 }}>Slot Diunggah</TableCell>
                      <TableCell sx={{ fontWeight: 800, width: 160 }}>Progres Total</TableCell>
                      <TableCell sx={{ fontWeight: 800, textAlign: 'center', width: 150 }}>Status Kurikulum</TableCell>
                      <TableCell sx={{ fontWeight: 800, textAlign: 'center', width: 140 }}>Pengesahan Kepsek</TableCell>
                      <TableCell sx={{ fontWeight: 800, textAlign: 'center', width: 110 }}>Detail Berkas</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredReports.map((row, idx) => (
                      <TableRow key={row.teacher_id} hover>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                            {row.name}
                          </Typography>
                          {row.mapel_list && row.mapel_list.length > 0 ? (
                            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                              {row.mapel_list.map((m: any, mIdx: number) => {
                                const mPercent = m.percentage ?? 0;
                                const rombelText = Array.isArray(m.rombel) ? m.rombel.join(', ') : (m.rombel || '-');
                                return (
                                  <Box
                                    key={m.id || mIdx}
                                    sx={{
                                      p: 0.8,
                                      borderRadius: 1.5,
                                      bgcolor: '#f1f5f9',
                                      border: '1px solid #e2e8f0',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: 0.4
                                    }}
                                  >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#1e293b' }}>
                                        • {m.mapel_name} {m.sub_mapel ? `(${m.sub_mapel})` : ''}
                                      </Typography>
                                      <Chip
                                        label={`${mPercent}%`}
                                        size="small"
                                        color={mPercent === 100 ? 'success' : mPercent > 0 ? 'primary' : 'default'}
                                        sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800 }}
                                      />
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                                        Kelas:
                                      </Typography>
                                      {Array.isArray(m.rombel) && m.rombel.length > 0 ? (
                                        m.rombel.map((r: string, rIdx: number) => (
                                          <Chip
                                            key={rIdx}
                                            label={r}
                                            size="small"
                                            variant="outlined"
                                            sx={{ height: 16, fontSize: '0.65rem', fontWeight: 600 }}
                                          />
                                        ))
                                      ) : (
                                        <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                                          {rombelText}
                                        </Typography>
                                      )}
                                    </Box>
                                  </Box>
                                );
                              })}
                            </Box>
                          ) : (
                            <Typography variant="caption" color="#94a3b8" sx={{ fontStyle: 'italic', display: 'block', mt: 0.5 }}>
                              Belum mendaftarkan mata pelajaran
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{row.nip || '-'}</TableCell>
                        <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>
                          {row.sudah_upload} / {row.total_wajib}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={row.persentase}
                              sx={{
                                flex: 1,
                                height: 8,
                                borderRadius: 4,
                                bgcolor: '#e2e8f0',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: row.persentase === 100 ? '#10b981' : '#3b82f6',
                                  borderRadius: 4
                                }
                              }}
                            />
                            <Typography variant="caption" sx={{ fontWeight: 800 }}>
                              {row.persentase}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Chip
                            label={
                              row.terverifikasi === row.sudah_upload && row.sudah_upload > 0
                                ? 'Terverifikasi'
                                : row.menunggu_verifikasi > 0
                                ? `${row.menunggu_verifikasi} Belum Telaah`
                                : 'Proses'
                            }
                            size="small"
                            color={row.terverifikasi === row.sudah_upload && row.sudah_upload > 0 ? 'success' : 'warning'}
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Chip
                            label={
                              row.status_pengesahan === 'DISAHKAN'
                                ? 'Disahkan'
                                : row.status_pengesahan === 'MENUNGGU_PENGESAHAN'
                                ? 'Siap Sahkan'
                                : 'Belum Lengkap'
                            }
                            size="small"
                            color={
                              row.status_pengesahan === 'DISAHKAN'
                                ? 'success'
                                : row.status_pengesahan === 'MENUNGGU_PENGESAHAN'
                                ? 'primary'
                                : 'default'
                            }
                            sx={{ fontWeight: 800 }}
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<VisibilityIcon />}
                            onClick={() => setSelectedReport(row)}
                            sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
                          >
                            Periksa
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Box>

          {/* MOBILE CARD VIEW (< 768px) */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 2 }}>
            {filteredReports.map((row, idx) => (
              <Card
                key={row.teacher_id}
                sx={{
                  borderRadius: 3,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  p: 2
                }}
              >
                {/* 1. Baris Atas: Nomor urut, Nama Guru, NIP */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5, gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                    <Chip
                      label={`#${idx + 1}`}
                      size="small"
                      sx={{ fontWeight: 800, bgcolor: '#f1f5f9', color: '#475569', height: 22, fontSize: '0.7rem' }}
                    />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                        {row.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem' }}>
                        NIP: {row.nip || '-'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* 2. Baris Tengah: Info Mapel/Kelas, Slot Berkas, Progres */}
                <Box sx={{ bgcolor: '#f8fafc', p: 1.5, borderRadius: 2, mb: 1.5, border: '1px solid #f1f5f9' }}>
                  {row.mapel_list && row.mapel_list.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1.5 }}>
                      {row.mapel_list.map((m: any, mIdx: number) => {
                        const mPercent = m.percentage ?? 0;
                        const rombelText = Array.isArray(m.rombel) ? m.rombel.join(', ') : (m.rombel || '-');
                        return (
                          <Box key={m.id || mIdx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155', fontSize: '0.75rem' }}>
                              • {m.mapel_name} ({rombelText})
                            </Typography>
                            <Chip
                              label={`${mPercent}%`}
                              size="small"
                              color={mPercent === 100 ? 'success' : mPercent > 0 ? 'primary' : 'default'}
                              sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800 }}
                            />
                          </Box>
                        );
                      })}
                    </Box>
                  ) : (
                    <Typography variant="caption" color="#94a3b8" sx={{ display: 'block', mb: 1, fontStyle: 'italic' }}>
                      Belum mendaftarkan mata pelajaran
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.72rem' }}>
                      Slot Berkas Diunggah: {row.sudah_upload} / {row.total_wajib} Berkas
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#0f172a' }}>
                      {row.persentase}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={row.persentase}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: '#e2e8f0',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: row.persentase === 100 ? '#10b981' : '#3b82f6',
                        borderRadius: 4
                      }
                    }}
                  />
                </Box>

                {/* Status Badges Row */}
                <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                  <Chip
                    label={
                      row.terverifikasi === row.sudah_upload && row.sudah_upload > 0
                        ? 'Kurikulum: Terverifikasi'
                        : row.menunggu_verifikasi > 0
                        ? `Kurikulum: ${row.menunggu_verifikasi} Belum Telaah`
                        : 'Kurikulum: Dalam Sesi'
                    }
                    size="small"
                    color={row.terverifikasi === row.sudah_upload && row.sudah_upload > 0 ? 'success' : 'warning'}
                    sx={{ fontWeight: 700, fontSize: '0.68rem' }}
                  />
                  <Chip
                    label={
                      row.status_pengesahan === 'DISAHKAN'
                        ? 'Kepsek: Disahkan'
                        : row.status_pengesahan === 'MENUNGGU_PENGESAHAN'
                        ? 'Kepsek: Siap Sahkan'
                        : 'Kepsek: Belum Lengkap'
                    }
                    size="small"
                    color={
                      row.status_pengesahan === 'DISAHKAN'
                        ? 'success'
                        : row.status_pengesahan === 'MENUNGGU_PENGESAHAN'
                        ? 'primary'
                        : 'default'
                    }
                    sx={{ fontWeight: 800, fontSize: '0.68rem' }}
                  />
                </Box>

                {/* 3. Baris Bawah: Tombol aksi full width */}
                <Button
                  fullWidth
                  variant="outlined"
                  color="primary"
                  startIcon={<VisibilityIcon />}
                  onClick={() => setSelectedReport(row)}
                  sx={{ fontWeight: 800, py: 1, borderRadius: 2.5, textTransform: 'none' }}
                >
                  Periksa Detail Berkas Guru
                </Button>
              </Card>
            ))}
          </Box>
        </Box>
      )}

      {/* TAB 1: VALIDASI & PENGESAHAN PERANGKAT AJAR */}
      {activeTab === 1 && (
        <Box>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
              Validasi & Pengesahan Resmi Kepala Sekolah
            </Typography>
            <Typography variant="body2" color="#64748b">
              Lakukan validasi akhir dan terbitkan pengesahan resmi menggunakan Tanda Tangan Digital atau QR Code Pengesahan Resmi yang tersertifikasi.
            </Typography>
          </Box>

          {/* DESKTOP TABLE VIEW (>= 768px) */}
          <Box sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto' }}>
            <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <CardContent sx={{ p: 0 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, width: 40 }}>No</TableCell>
                      <TableCell sx={{ fontWeight: 800, minWidth: 260 }}>Nama Guru & Mapel Diampu</TableCell>
                      <TableCell sx={{ fontWeight: 800, width: 140 }}>NIP</TableCell>
                      <TableCell sx={{ fontWeight: 800, textAlign: 'center', width: 160 }}>Berkas Terverifikasi</TableCell>
                      <TableCell sx={{ fontWeight: 800, textAlign: 'center', width: 150 }}>Status Pengesahan</TableCell>
                      <TableCell sx={{ fontWeight: 800, textAlign: 'center', width: 220 }}>Tindakan Kepala Sekolah</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reports.map((row, idx) => {
                      const isReady = row.status_pengesahan === 'MENUNGGU_PENGESAHAN';
                      const isEndorsed = row.status_pengesahan === 'DISAHKAN';

                      return (
                        <TableRow key={row.teacher_id} hover>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                              {row.name}
                            </Typography>
                            {row.mapel_list && row.mapel_list.length > 0 ? (
                              <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                                {row.mapel_list.map((m: any, mIdx: number) => {
                                  const mPercent = m.percentage ?? 0;
                                  const rombelText = Array.isArray(m.rombel) ? m.rombel.join(', ') : (m.rombel || '-');
                                  return (
                                    <Box
                                      key={m.id || mIdx}
                                      sx={{
                                        p: 0.8,
                                        borderRadius: 1.5,
                                        bgcolor: '#f1f5f9',
                                        border: '1px solid #e2e8f0',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 0.4
                                      }}
                                    >
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#1e293b' }}>
                                          • {m.mapel_name} {m.sub_mapel ? `(${m.sub_mapel})` : ''}
                                        </Typography>
                                        <Chip
                                          label={`${mPercent}%`}
                                          size="small"
                                          color={mPercent === 100 ? 'success' : mPercent > 0 ? 'primary' : 'default'}
                                          sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800 }}
                                        />
                                      </Box>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                        <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                                          Kelas:
                                        </Typography>
                                        {Array.isArray(m.rombel) && m.rombel.length > 0 ? (
                                          m.rombel.map((r: string, rIdx: number) => (
                                            <Chip
                                              key={rIdx}
                                              label={r}
                                              size="small"
                                              variant="outlined"
                                              sx={{ height: 16, fontSize: '0.65rem', fontWeight: 600 }}
                                            />
                                          ))
                                        ) : (
                                          <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                                            {rombelText}
                                          </Typography>
                                        )}
                                      </Box>
                                    </Box>
                                  );
                                })}
                              </Box>
                            ) : (
                              <Typography variant="caption" color="#94a3b8" sx={{ fontStyle: 'italic', display: 'block', mt: 0.5 }}>
                                Belum mendaftarkan mata pelajaran
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>{row.nip || '-'}</TableCell>
                          <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>
                            {row.terverifikasi} / {row.total_wajib} Berkas
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            <Chip
                              label={isEndorsed ? 'Telah Disahkan' : isReady ? 'Siap Disahkan' : 'Belum Memenuhi Syarat'}
                              color={isEndorsed ? 'success' : isReady ? 'primary' : 'default'}
                              size="small"
                              sx={{ fontWeight: 800 }}
                            />
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            {isEndorsed ? (
                              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  startIcon={<PrintIcon />}
                                  onClick={() => setPengesahanModalData(row)}
                                  sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
                                >
                                  Lembar Pengesahan
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="inherit"
                                  onClick={() => handleOpenSigning(row)}
                                  sx={{ fontWeight: 600, textTransform: 'none' }}
                                >
                                  Sahkan Ulang
                                </Button>
                                <Tooltip title="Batalkan / Reset Pengesahan">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleResetPengesahanTeacher(row.teacher_id, row.name)}
                                  >
                                    <RestartAltIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            ) : (
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                startIcon={<VerifiedIcon />}
                                disabled={!isReady}
                                onClick={() => handleOpenSigning(row)}
                                sx={{ fontWeight: 800, borderRadius: 2, textTransform: 'none' }}
                              >
                                Sahkan Perangkat Ajar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Box>

          {/* MOBILE CARD VIEW (< 768px) FOR TAB 1 */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 2 }}>
            {reports.map((row, idx) => {
              const isReady = row.status_pengesahan === 'MENUNGGU_PENGESAHAN';
              const isEndorsed = row.status_pengesahan === 'DISAHKAN';

              return (
                <Card
                  key={row.teacher_id}
                  sx={{
                    borderRadius: 3,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    p: 2
                  }}
                >
                  {/* 1. Baris Atas: Nomor urut, Nama Guru, NIP */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5, gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                      <Chip
                        label={`#${idx + 1}`}
                        size="small"
                        sx={{ fontWeight: 800, bgcolor: '#f1f5f9', color: '#475569', height: 22, fontSize: '0.7rem' }}
                      />
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                          {row.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem' }}>
                          NIP: {row.nip || '-'}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      label={isEndorsed ? 'Disahkan' : isReady ? 'Siap Disahkan' : 'Belum Memenuhi Syarat'}
                      color={isEndorsed ? 'success' : isReady ? 'primary' : 'default'}
                      size="small"
                      sx={{ fontWeight: 800, fontSize: '0.68rem' }}
                    />
                  </Box>

                  {/* 2. Baris Tengah: Info Mapel/Kelas & Berkas Terverifikasi */}
                  <Box sx={{ bgcolor: '#f8fafc', p: 1.5, borderRadius: 2, mb: 1.5, border: '1px solid #f1f5f9' }}>
                    {row.mapel_list && row.mapel_list.length > 0 ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, mb: 1 }}>
                        {row.mapel_list.map((m: any, mIdx: number) => {
                          const rombelText = Array.isArray(m.rombel) ? m.rombel.join(', ') : (m.rombel || '-');
                          return (
                            <Typography key={m.id || mIdx} variant="caption" sx={{ fontWeight: 700, color: '#334155', fontSize: '0.75rem', display: 'block' }}>
                              • {m.mapel_name} ({rombelText})
                            </Typography>
                          );
                        })}
                      </Box>
                    ) : (
                      <Typography variant="caption" color="#94a3b8" sx={{ display: 'block', mb: 1, fontStyle: 'italic' }}>
                        Belum mendaftarkan mata pelajaran
                      </Typography>
                    )}

                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem', display: 'block' }}>
                      Berkas Terverifikasi: <span style={{ color: '#0f172a' }}>{row.terverifikasi} / {row.total_wajib} Berkas</span>
                    </Typography>
                  </Box>

                  {/* 3. Baris Bawah: Action Buttons full width */}
                  {isEndorsed ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        color="success"
                        startIcon={<PrintIcon />}
                        onClick={() => setPengesahanModalData(row)}
                        sx={{ fontWeight: 800, py: 1, borderRadius: 2.5, textTransform: 'none' }}
                      >
                        Lembar Pengesahan
                      </Button>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          fullWidth
                          variant="outlined"
                          color="inherit"
                          onClick={() => handleOpenSigning(row)}
                          sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2 }}
                        >
                          Sahkan Ulang
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={() => handleResetPengesahanTeacher(row.teacher_id, row.name)}
                          sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2, minWidth: 44 }}
                        >
                          <RestartAltIcon fontSize="small" />
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      startIcon={<VerifiedIcon />}
                      disabled={!isReady}
                      onClick={() => handleOpenSigning(row)}
                      sx={{ fontWeight: 800, py: 1.2, borderRadius: 2.5, textTransform: 'none' }}
                    >
                      {isReady ? 'Sahkan Perangkat Ajar' : 'Belum Memenuhi Syarat'}
                    </Button>
                  )}
                </Card>
              );
            })}
          </Box>
        </Box>
      )}

      {/* MODAL PENGESAHAN DENGAN TTD ATAU QR CODE */}
      <Dialog
        open={signingModalOpen}
        onClose={() => setSigningModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 800, color: '#0f172a' }}>
          <VerifiedIcon color="primary" />
          Pengesahan Perangkat Ajar Resmi: {targetTeacher?.name}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography variant="body2" color="#475569">
            Pilih metode pembubuhan pengesahan resmi Kepala Sekolah untuk perangkat pembelajaran guru:
          </Typography>

          <RadioGroup
            row
            value={endorseType}
            onChange={e => setEndorseType(e.target.value as any)}
            sx={{ gap: 2, bgcolor: '#f8fafc', p: 1.5, borderRadius: 2, border: '1px solid #e2e8f0' }}
          >
            <FormControlLabel
              value="QR_CODE"
              control={<Radio />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <QrCode2Icon color="primary" sx={{ fontSize: 20 }} />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    QR Code Pengesahan Resmi
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="TTD_DIGITAL"
              control={<Radio />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <DrawIcon color="primary" sx={{ fontSize: 20 }} />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Tanda Tangan Digital (Canvas)
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>

          {endorseType === 'QR_CODE' ? (
            <Box sx={{ p: 2, border: '1px solid #bae6fd', bgcolor: '#f0f9ff', borderRadius: 2, textAlign: 'center' }}>
              <QrCode2Icon sx={{ fontSize: 48, color: '#0284c7', mb: 1 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0369a1' }}>
                Sistem Otentikasi Digital QR Code Terintegrasi
              </Typography>
              <Typography variant="caption" color="#64748b" sx={{ display: 'block', mt: 0.5 }}>
                Pengesahan akan diverifikasi menggunakan kode hash keamanan resmi Kepala Sekolah ({currentUser?.name || 'Kepala Sekolah'}).
              </Typography>
            </Box>
          ) : (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  Goreskan Tanda Tangan Anda di Bawah Ini:
                </Typography>
                <Button size="small" color="error" startIcon={<ClearIcon />} onClick={clearCanvas} sx={{ fontWeight: 600 }}>
                  Hapus / Ulangi
                </Button>
              </Box>
              <Box
                sx={{
                  border: '2px dashed #94a3b8',
                  borderRadius: 2,
                  bgcolor: '#ffffff',
                  display: 'flex',
                  justifyContent: 'center',
                  touchAction: 'none'
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={460}
                  height={180}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  style={{ cursor: 'crosshair', display: 'block', maxWidth: '100%', width: '100%', height: 'auto', touchAction: 'none' }}
                />
              </Box>
              <Typography variant="caption" color="#64748b" sx={{ display: 'block', mt: 0.5, textAlign: 'center' }}>
                Gunakan mouse atau sentuhan layar pada smartphone/tablet untuk tanda tangan.
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setSigningModalOpen(false)} color="inherit">
            Batal
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={isSubmittingSignature}
            onClick={handleSubmitEndorsement}
            sx={{ fontWeight: 800, borderRadius: 2 }}
          >
            {isSubmittingSignature ? 'Menyimpan Pengesahan...' : 'Sahkan Secara Resmi'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DRILL-DOWN MODAL DETAIL BERKAS */}
      {selectedReport && (
        <DrillDownPerangkatModal
          open={!!selectedReport}
          onClose={() => {
            setSelectedReport(null);
            loadReports();
          }}
          report={selectedReport}
          userRole="KEPALA_SEKOLAH"
          onRefresh={loadReports}
        />
      )}

      {/* LEMBAR PENGESAHAN MODAL */}
      {pengesahanModalData && (
        <LembarPengesahanModal
          open={!!pengesahanModalData}
          onClose={() => setPengesahanModalData(null)}
          teacher={{
            name: pengesahanModalData.name,
            nip: pengesahanModalData.nip,
            subject: pengesahanModalData.subject || (pengesahanModalData.mapel_list && pengesahanModalData.mapel_list.length > 0 ? pengesahanModalData.mapel_list.map((m: any) => m.mapel_name).filter(Boolean).join(', ') : '') || pengesahanModalData.class || 'Guru Mata Pelajaran',
            class: pengesahanModalData.class
          }}
          pengesahan={pengesahanModalData.pengesahan}
          dokumenList={pengesahanModalData.dokumen_list}
          schoolSettings={schoolSettings}
        />
      )}

      {/* REKAP SUPERVISI PRINT MODAL */}
      <RekapSupervisiModal
        open={rekapModalOpen}
        onClose={() => setRekapModalOpen(false)}
        reports={reports}
        tahunAjaran={selectedTahunAjaran}
        semester={selectedSemester}
        schoolSettings={schoolSettings}
      />

      {/* KIRIM REKAP WHATSAPP MODAL */}
      <KirimWaRekapModal
        open={waRekapModalOpen}
        onClose={() => setWaRekapModalOpen(false)}
        tahunAjaran={selectedTahunAjaran}
        semester={selectedSemester}
        onOpenSettings={() => setWaPengaturanModalOpen(true)}
      />

      {/* PENGATURAN WHATSAPP REKAP MODAL */}
      <PengaturanWaRekapModal
        open={waPengaturanModalOpen}
        onClose={() => setWaPengaturanModalOpen(false)}
      />
    </Box>
  );
}
