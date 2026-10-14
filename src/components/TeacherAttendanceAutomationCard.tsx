import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  Stack,
  Divider,
  Alert,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormGroup,
  Checkbox,
  CircularProgress,
  Chip,
  IconButton,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Switch,
  Tooltip
} from '@mui/material';
import {
  Save as SaveIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  Wifi as WifiIcon,
  Schedule as ScheduleIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  Check as CheckIcon,
  Info as InfoIcon,
  FactCheck as FactCheckIcon,
  PhoneIphone as PhoneIcon,
  PlayArrow as PlayArrowIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';

export interface TeacherWaTarget {
  id: string;
  name: string;
  targetId: string;
  type: 'personal' | 'group';
  role?: string;
  isActive: boolean;
}

const DAYS = [
  { id: '1', label: 'Senin' },
  { id: '2', label: 'Selasa' },
  { id: '3', label: 'Rabu' },
  { id: '4', label: 'Kamis' },
  { id: '5', label: 'Jumat' },
  { id: '6', label: 'Sabtu' },
  { id: '0', label: 'Minggu' }
];

interface TeacherAttendanceAutomationCardProps {
  onSaved?: () => void;
  initialSettings?: any;
}

export default function TeacherAttendanceAutomationCard({ onSaved, initialSettings }: TeacherAttendanceAutomationCardProps) {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [triggering, setTriggering] = useState(false);

  // Gateway status check
  const [gatewayConfigured, setGatewayConfigured] = useState(false);
  const [activeProvider, setActiveProvider] = useState('fonnte');

  // Mode Pengiriman: nonaktif | manual | daily | weekly | monthly
  const [waTeacherMode, setWaTeacherMode] = useState<'nonaktif' | 'manual' | 'daily' | 'weekly' | 'monthly'>('manual');

  // Checklist Cakupan Laporan: Rekap Kehadiran Rombel, Rekap Kehadiran Guru, atau Keduanya
  const [sendRombelRecap, setSendRombelRecap] = useState(true);
  const [sendTeacherRecap, setSendTeacherRecap] = useState(true);

  // Targets: Nomor WhatsApp & ID Grup
  const [targets, setTargets] = useState<TeacherWaTarget[]>([]);
  const [targetDialogOpen, setTargetDialogOpen] = useState(false);
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [targetForm, setTargetForm] = useState({
    name: '',
    targetId: '',
    type: 'personal' as 'personal' | 'group',
    role: 'Kepala Sekolah',
    isActive: true
  });

  // Cron Settings: Waktu & Jadwal
  const [cronTime, setCronTime] = useState('16:00');
  const [cronDays, setCronDays] = useState<string[]>(['1', '2', '3', '4', '5']);
  const [weeklyDay, setWeeklyDay] = useState('5'); // Default: Jumat
  const [monthlyDay, setMonthlyDay] = useState('28'); // Default: Tanggal 28

  // Test Connection
  const [testNumber, setTestNumber] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Trigger Send Result
  const [sendResult, setSendResult] = useState<any>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await axios.get('/api/settings');
        const d = res.data || {};

        if (d.waApiKey || d.wa_api_key) {
          setGatewayConfigured(true);
        }
        if (d.waProvider || d.wa_provider) {
          setActiveProvider(d.waProvider || d.wa_provider);
        }

        if (d.waTeacherMode || d.wa_teacher_mode) {
          setWaTeacherMode(d.waTeacherMode || d.wa_teacher_mode);
        }

        // Scope Checklist: Rekap Kehadiran Rombel, Rekap Kehadiran Guru, Atau Keduanya
        if (d.waTeacherSendRombel !== undefined || d.wa_teacher_send_rombel !== undefined) {
          setSendRombelRecap(d.waTeacherSendRombel ?? d.wa_teacher_send_rombel ?? true);
        }
        if (d.waTeacherSendGuru !== undefined || d.wa_teacher_send_guru !== undefined) {
          setSendTeacherRecap(d.waTeacherSendGuru ?? d.wa_teacher_send_guru ?? true);
        }
        if (d.waTeacherReportScope || d.wa_teacher_report_scope) {
          const sc = d.waTeacherReportScope || d.wa_teacher_report_scope;
          if (sc === 'rombel') {
            setSendRombelRecap(true);
            setSendTeacherRecap(false);
          } else if (sc === 'guru') {
            setSendRombelRecap(false);
            setSendTeacherRecap(true);
          } else {
            setSendRombelRecap(true);
            setSendTeacherRecap(true);
          }
        }

        const rawTargets = d.waTeacherTargets || d.wa_teacher_targets;
        if (Array.isArray(rawTargets) && rawTargets.length > 0) {
          setTargets(rawTargets);
        } else {
          // Default initial target suggestions
          setTargets([
            {
              id: 'tgt-1',
              name: 'Kepala Sekolah',
              targetId: '',
              type: 'personal',
              role: 'Pimpinan',
              isActive: false
            },
            {
              id: 'tgt-2',
              name: 'Grup Manajemen / Dewan Guru',
              targetId: '',
              type: 'group',
              role: 'Grup Sekolah',
              isActive: false
            }
          ]);
        }

        if (d.waTeacherCronTime || d.wa_teacher_cron_time) {
          setCronTime(d.waTeacherCronTime || d.wa_teacher_cron_time);
        }
        if (d.waTeacherCronDays || d.wa_teacher_cron_days) {
          const days = d.waTeacherCronDays || d.wa_teacher_cron_days;
          setCronDays(Array.isArray(days) ? days : JSON.parse(days || '[]'));
        }
        if (d.waTeacherWeeklyDay || d.wa_teacher_weekly_day) {
          setWeeklyDay(String(d.waTeacherWeeklyDay || d.wa_teacher_weekly_day));
        }
        if (d.waTeacherMonthlyDay || d.wa_teacher_monthly_day) {
          setMonthlyDay(String(d.waTeacherMonthlyDay || d.wa_teacher_monthly_day));
        }
      } catch (e) {
        console.error(e);
      }
    }

    fetchSettings();
  }, [initialSettings]);

  // Target CRUD
  const handleOpenAddTarget = () => {
    setEditingTargetId(null);
    setTargetForm({
      name: '',
      targetId: '',
      type: 'personal',
      role: 'Wakil Kurikulum',
      isActive: true
    });
    setTargetDialogOpen(true);
  };

  const handleOpenEditTarget = (t: TeacherWaTarget) => {
    setEditingTargetId(t.id);
    setTargetForm({
      name: t.name,
      targetId: t.targetId,
      type: t.type,
      role: t.role || 'Pimpinan',
      isActive: t.isActive
    });
    setTargetDialogOpen(true);
  };

  const handleSaveTargetDialog = () => {
    if (!targetForm.name.trim() || !targetForm.targetId.trim()) {
      toast.error('Nama dan Nomor/ID Grup wajib diisi');
      return;
    }

    if (editingTargetId) {
      setTargets(prev =>
        prev.map(t =>
          t.id === editingTargetId
            ? { ...t, ...targetForm }
            : t
        )
      );
      toast.success('Target laporan berhasil diperbarui');
    } else {
      const newTgt: TeacherWaTarget = {
        id: 'tgt-' + Date.now(),
        name: targetForm.name.trim(),
        targetId: targetForm.targetId.trim(),
        type: targetForm.type,
        role: targetForm.role,
        isActive: targetForm.isActive
      };
      setTargets(prev => [...prev, newTgt]);
      toast.success('Target laporan berhasil ditambahkan');
    }
    setTargetDialogOpen(false);
  };

  const handleDeleteTarget = (id: string) => {
    if (!confirm('Hapus target penerima laporan ini?')) return;
    setTargets(prev => prev.filter(t => t.id !== id));
    toast.success('Target penerima dihapus');
  };

  const handleToggleTargetActive = (id: string) => {
    setTargets(prev =>
      prev.map(t => (t.id === id ? { ...t, isActive: !t.isActive } : t))
    );
  };

  // Toggle Cron Day
  const handleToggleDay = (dayId: string) => {
    if (cronDays.includes(dayId)) {
      if (cronDays.length === 1) {
        toast.error('Minimal pilih 1 hari aktif');
        return;
      }
      setCronDays(cronDays.filter(d => d !== dayId));
    } else {
      setCronDays([...cronDays, dayId]);
    }
  };

  // Save Settings
  const handleSaveSettings = async () => {
    if (!sendRombelRecap && !sendTeacherRecap) {
      toast.error('Pilih minimal satu checklist laporan yang dikirim (Rekap Rombel atau Rekap Guru)');
      return;
    }

    setLoading(true);
    try {
      const scopeValue = (sendRombelRecap && sendTeacherRecap)
        ? 'both'
        : sendRombelRecap
        ? 'rombel'
        : 'guru';

      const payload = {
        waTeacherMode,
        wa_teacher_mode: waTeacherMode,
        waTeacherReportScope: scopeValue,
        wa_teacher_report_scope: scopeValue,
        waTeacherSendRombel: sendRombelRecap,
        wa_teacher_send_rombel: sendRombelRecap,
        waTeacherSendGuru: sendTeacherRecap,
        wa_teacher_send_guru: sendTeacherRecap,
        waTeacherTargets: targets,
        wa_teacher_targets: targets,
        waTeacherCronTime: cronTime,
        wa_teacher_cron_time: cronTime,
        waTeacherCronDays: cronDays,
        wa_teacher_cron_days: cronDays,
        waTeacherWeeklyDay: weeklyDay,
        wa_teacher_weekly_day: weeklyDay,
        waTeacherMonthlyDay: monthlyDay,
        wa_teacher_monthly_day: monthlyDay
      };

      await axios.post('/api/settings', payload);
      toast.success('Pengaturan Otomasi Presensi Guru berhasil disimpan!');
      if (onSaved) onSaved();
    } catch (e: any) {
      toast.error('Gagal menyimpan pengaturan: ' + (e.response?.data?.error || e.message));
    } finally {
      setLoading(false);
    }
  };

  // Uji Koneksi / Test Send Teacher Report
  const handleTestConnection = async () => {
    if (!testNumber.trim()) {
      toast.error('Masukkan nomor WhatsApp penerima uji coba');
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const scopeLabel = (sendRombelRecap && sendTeacherRecap)
        ? 'Rekap Rombel & Guru'
        : sendRombelRecap
        ? 'Rekap Kehadiran Rombel'
        : 'Rekap Kehadiran Guru';

      let sampleText =
        `*📢 TES OTOMASI LAPORAN KEHADIRAN KBM GURU*\n\n` +
        `Yth. Bapak/Ibu Pimpinan,\n` +
        `Format pengiriman laporan keterisian KBM Guru telah berhasil diuji coba.\n\n` +
        `• Tanggal: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\n` +
        `• Cakupan Laporan: *${scopeLabel}*\n` +
        `• Gateway: ${activeProvider.toUpperCase()}\n` +
        `• Status Koneksi: AKTIF & TERVERIFIKASI\n\n`;

      if (sendRombelRecap) {
        sampleText += `📋 *Contoh Rekap Rombel:*\n• X RPL 1: 4 JP (1 sesi)\n• XI TKJ 2: 2 JP (1 sesi)\n• XII MM 1: _Belum Terisi_\n\n`;
      }
      if (sendTeacherRecap) {
        sampleText += `👨‍🏫 *Contoh Rekap Guru:*\n• Budi Santoso, S.Kom: 4 JP (X RPL 1)\n• Siti Aminah, M.Pd: 2 JP (XI TKJ 2)\n\n`;
      }

      sampleText += `_Pesan otomatis dikirim oleh Sistem Presensi KBM Guru._`;

      const res = await axios.post('/api/settings/test-wa', {
        phone: testNumber.trim(),
        message: sampleText
      });

      if (res.data && res.data.success) {
        setTestResult({
          success: true,
          message: 'Uji coba sukses! Format laporan KBM guru terkirim ke ' + testNumber
        });
        toast.success('Pesan uji coba terkirim!');
      } else {
        setTestResult({
          success: false,
          message: res.data?.error || 'Gagal mengirim pesan uji coba'
        });
        toast.error('Gagal mengirim pesan uji coba');
      }
    } catch (e: any) {
      const msg = e.response?.data?.error || e.message || 'Terjadi kesalahan koneksi';
      setTestResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  // Trigger Send Now (Manual Realtime Send)
  const handleTriggerSendNow = async () => {
    const activeTargets = targets.filter(t => t.isActive && t.targetId.trim());
    if (activeTargets.length === 0) {
      toast.error('Belum ada Nomor Target atau ID Grup yang aktif dengan nomor valid.');
      return;
    }

    setTriggering(true);
    setSendResult(null);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await axios.post('/api/settings/send-teacher-kbm-reports', {
        date: todayStr,
        period: waTeacherMode === 'weekly' ? 'weekly' : waTeacherMode === 'monthly' ? 'monthly' : 'daily'
      });

      if (res.data && res.data.success) {
        setSendResult(res.data);
        toast.success(`Laporan KBM Guru berhasil dikirim ke ${res.data.sentCount || activeTargets.length} target!`);
      } else {
        toast.error(res.data?.error || 'Gagal memproses pengiriman laporan KBM');
      }
    } catch (e: any) {
      toast.error('Gagal mengirim laporan: ' + (e.response?.data?.error || e.message));
    } finally {
      setTriggering(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header Info */}
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2.5, bgcolor: '#ffffff' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                bgcolor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #bfdbfe'
              }}
            >
              <FactCheckIcon fontSize="medium" />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Otomasi Presensi Guru (KBM)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pengaturan pengiriman otomatis rekapitulasi kehadiran dan keterisian jam pelajaran (JP) mengajar guru ke pimpinan dan grup WhatsApp.
              </Typography>
            </Box>
          </Box>

          <Chip
            icon={<CheckCircleIcon sx={{ fontSize: '1rem !important' }} />}
            label={gatewayConfigured ? `Gateway ${activeProvider.toUpperCase()} Siap` : 'Gateway Belum Diatur'}
            color={gatewayConfigured ? 'success' : 'warning'}
            variant="outlined"
            size="small"
            sx={{ fontWeight: 700 }}
          />
        </Box>

        {!gatewayConfigured && (
          <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
            Kredensial API Gateway WhatsApp belum diisi. Silakan konfigurasi Token dan Endpoint WhatsApp di menu <b>PENGATURAN UMUM &gt; Atur Gateway</b> terlebih dahulu.
          </Alert>
        )}

        <Divider sx={{ my: 2.5 }} />

        {/* FITUR 1: MODE PENGIRIMAN (PILIHAN) */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <ScheduleIcon fontSize="small" color="primary" />
            1. Mode Pengiriman Laporan KBM Guru
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Pilih bagaimana sistem memproses dan mengirimkan laporan rekapitulasi keterisian KBM guru:
          </Typography>

          <FormControl component="fieldset" fullWidth>
            <RadioGroup
              value={waTeacherMode}
              onChange={(e) => setWaTeacherMode(e.target.value as any)}
            >
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      borderColor: waTeacherMode === 'manual' ? 'primary.main' : 'divider',
                      bgcolor: waTeacherMode === 'manual' ? 'rgba(37,99,235,0.04)' : 'inherit',
                      cursor: 'pointer'
                    }}
                    onClick={() => setWaTeacherMode('manual')}
                  >
                    <FormControlLabel
                      value="manual"
                      control={<Radio size="small" />}
                      label={
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            Manual
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Kirim hanya saat tombol "Kirim Sekarang" ditekan oleh operator.
                          </Typography>
                        </Box>
                      }
                      sx={{ m: 0, width: '100%' }}
                    />
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      borderColor: waTeacherMode === 'daily' ? 'primary.main' : 'divider',
                      bgcolor: waTeacherMode === 'daily' ? 'rgba(37,99,235,0.04)' : 'inherit',
                      cursor: 'pointer'
                    }}
                    onClick={() => setWaTeacherMode('daily')}
                  >
                    <FormControlLabel
                      value="daily"
                      control={<Radio size="small" />}
                      label={
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            Otomatis Harian (Cron)
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Kirim rekap harian setiap sore di jam yang ditentukan.
                          </Typography>
                        </Box>
                      }
                      sx={{ m: 0, width: '100%' }}
                    />
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      borderColor: waTeacherMode === 'weekly' ? 'primary.main' : 'divider',
                      bgcolor: waTeacherMode === 'weekly' ? 'rgba(37,99,235,0.04)' : 'inherit',
                      cursor: 'pointer'
                    }}
                    onClick={() => setWaTeacherMode('weekly')}
                  >
                    <FormControlLabel
                      value="weekly"
                      control={<Radio size="small" />}
                      label={
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            Otomatis Mingguan (Cron)
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Kirim akumulasi rekapitulasi KBM di akhir pekan (Jumat/Sabtu).
                          </Typography>
                        </Box>
                      }
                      sx={{ m: 0, width: '100%' }}
                    />
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      borderColor: waTeacherMode === 'monthly' ? 'primary.main' : 'divider',
                      bgcolor: waTeacherMode === 'monthly' ? 'rgba(37,99,235,0.04)' : 'inherit',
                      cursor: 'pointer'
                    }}
                    onClick={() => setWaTeacherMode('monthly')}
                  >
                    <FormControlLabel
                      value="monthly"
                      control={<Radio size="small" />}
                      label={
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            Otomatis Bulanan (Cron)
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Kirim rekapitulasi KBM bulanan setiap tanggal akhir bulan.
                          </Typography>
                        </Box>
                      }
                      sx={{ m: 0, width: '100%' }}
                    />
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      borderColor: waTeacherMode === 'nonaktif' ? 'error.main' : 'divider',
                      bgcolor: waTeacherMode === 'nonaktif' ? 'rgba(239,68,68,0.04)' : 'inherit',
                      cursor: 'pointer'
                    }}
                    onClick={() => setWaTeacherMode('nonaktif')}
                  >
                    <FormControlLabel
                      value="nonaktif"
                      control={<Radio size="small" color="error" />}
                      label={
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main' }}>
                            Nonaktif
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Matikan seluruh pengiriman laporan KBM guru via WhatsApp.
                          </Typography>
                        </Box>
                      }
                      sx={{ m: 0, width: '100%' }}
                    />
                  </Paper>
                </Grid>
              </Grid>
            </RadioGroup>
          </FormControl>
        </Box>

        <Divider sx={{ my: 2.5 }} />

        {/* FITUR 2: CHECKLIST CAKUPAN LAPORAN (ROMBEL / GURU / KEDUANYA) */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
              <FactCheckIcon fontSize="small" color="primary" />
              2. Checklist Cakupan Laporan yang Dikirimkan
            </Typography>
            <Chip
              label={
                sendRombelRecap && sendTeacherRecap
                  ? 'Keduanya (Rombel & Guru)'
                  : sendRombelRecap
                  ? 'Hanya Rekap Rombel'
                  : sendTeacherRecap
                  ? 'Hanya Rekap Guru'
                  : 'Belum Dipilih (Wajib Pilih)'
              }
              color={
                sendRombelRecap && sendTeacherRecap
                  ? 'primary'
                  : sendRombelRecap || sendTeacherRecap
                  ? 'secondary'
                  : 'error'
              }
              size="small"
              sx={{ fontWeight: 700 }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Tentukan jenis rekapitulasi data yang akan disertakan dalam format pesan WhatsApp yang dikirimkan:
          </Typography>

          <Grid container spacing={2}>
            {/* Opsi 1: Rekap Kehadiran Rombel */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  borderColor: sendRombelRecap ? 'primary.main' : 'divider',
                  bgcolor: sendRombelRecap ? 'rgba(37,99,235,0.04)' : 'inherit',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
                onClick={() => setSendRombelRecap(!sendRombelRecap)}
              >
                <Box>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={sendRombelRecap}
                        onChange={(e) => setSendRombelRecap(e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: sendRombelRecap ? 'primary.main' : 'inherit' }}>
                          Rekap Kehadiran Rombel
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          Mencakup status keterisian Jam Pelajaran (JP) tiap kelas / rombongan belajar yang aktif.
                        </Typography>
                      </Box>
                    }
                    sx={{ m: 0, alignItems: 'flex-start', width: '100%' }}
                  />
                  <Box sx={{ mt: 1.5, pl: 4 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', bgcolor: '#f8fafc', p: 1, borderRadius: 1.5, border: '1px dashed #cbd5e1' }}>
                      📋 Contoh isi pesan: <i>• X RPL 1: 4 JP (1 sesi) | XII TKJ 2: Belum Terisi</i>
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            {/* Opsi 2: Rekap Kehadiran Guru */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  borderColor: sendTeacherRecap ? 'primary.main' : 'divider',
                  bgcolor: sendTeacherRecap ? 'rgba(37,99,235,0.04)' : 'inherit',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
                onClick={() => setSendTeacherRecap(!sendTeacherRecap)}
              >
                <Box>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={sendTeacherRecap}
                        onChange={(e) => setSendTeacherRecap(e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: sendTeacherRecap ? 'primary.main' : 'inherit' }}>
                          Rekap Kehadiran Guru
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          Mencakup rincian jam mengajar dan total JP tiap guru yang bertugas mengajar di hari tersebut.
                        </Typography>
                      </Box>
                    }
                    sx={{ m: 0, alignItems: 'flex-start', width: '100%' }}
                  />
                  <Box sx={{ mt: 1.5, pl: 4 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', bgcolor: '#f8fafc', p: 1, borderRadius: 1.5, border: '1px dashed #cbd5e1' }}>
                      👨‍🏫 Contoh isi pesan: <i>• Budi Santoso, S.Kom: 4 JP (di X RPL 1)</i>
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Quick Preset Buttons */}
          <Box sx={{ display: 'flex', gap: 1, mt: 1.5, alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              Pilihan Cepat:
            </Typography>
            <Button
              size="small"
              variant={sendRombelRecap && sendTeacherRecap ? 'contained' : 'outlined'}
              onClick={() => { setSendRombelRecap(true); setSendTeacherRecap(true); }}
              sx={{ textTransform: 'none', borderRadius: 2, fontSize: '0.75rem', py: 0.25 }}
            >
              Keduanya (Lengkap)
            </Button>
            <Button
              size="small"
              variant={sendRombelRecap && !sendTeacherRecap ? 'contained' : 'outlined'}
              onClick={() => { setSendRombelRecap(true); setSendTeacherRecap(false); }}
              sx={{ textTransform: 'none', borderRadius: 2, fontSize: '0.75rem', py: 0.25 }}
            >
              Hanya Rekap Rombel
            </Button>
            <Button
              size="small"
              variant={!sendRombelRecap && sendTeacherRecap ? 'contained' : 'outlined'}
              onClick={() => { setSendRombelRecap(false); setSendTeacherRecap(true); }}
              sx={{ textTransform: 'none', borderRadius: 2, fontSize: '0.75rem', py: 0.25 }}
            >
              Hanya Rekap Guru
            </Button>
          </Box>
        </Box>

        <Divider sx={{ my: 2.5 }} />

        {/* FITUR 3: PENGATURAN CRON JADWAL HARIAN / MINGGUAN / BULANAN */}
        {waTeacherMode !== 'nonaktif' && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ScheduleIcon fontSize="small" color="primary" />
              3. Jadwal Eksekusi Otomatis (Pengaturan Cron)
            </Typography>

            <Grid container spacing={2.5} sx={{ alignItems: 'center', mt: 0.5 }}>
              {/* Jam Pengiriman Cron */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Jam Pengiriman (WIB)"
                  type="time"
                  value={cronTime}
                  onChange={(e) => setCronTime(e.target.value)}
                  fullWidth
                  size="small"
                  helperText="Format 24 jam (misal 16:00)"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>

              {/* Setting Spesifik Harian: Hari Kerja */}
              {waTeacherMode === 'daily' && (
                <Grid size={{ xs: 12, sm: 8 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 700 }}>
                    Hari Aktif Pengiriman:
                  </Typography>
                  <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                    {DAYS.map((d) => {
                      const active = cronDays.includes(d.id);
                      return (
                        <Chip
                          key={d.id}
                          label={d.label}
                          size="small"
                          color={active ? 'primary' : 'default'}
                          variant={active ? 'filled' : 'outlined'}
                          onClick={() => handleToggleDay(d.id)}
                          sx={{ fontWeight: 700, cursor: 'pointer' }}
                        />
                      );
                    })}
                  </Stack>
                </Grid>
              )}

              {/* Setting Spesifik Mingguan: Hari Eksekusi */}
              {waTeacherMode === 'weekly' && (
                <Grid size={{ xs: 12, sm: 8 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Hari Pengiriman Mingguan</InputLabel>
                    <Select
                      value={weeklyDay}
                      label="Hari Pengiriman Mingguan"
                      onChange={(e) => setWeeklyDay(e.target.value)}
                    >
                      <MenuItem value="5">Setiap Hari Jumat Sore (Akhir Minggu Sekolah)</MenuItem>
                      <MenuItem value="6">Setiap Hari Sabtu</MenuItem>
                      <MenuItem value="1">Setiap Hari Senin Pagi</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {/* Setting Spesifik Bulanan: Tanggal Eksekusi */}
              {waTeacherMode === 'monthly' && (
                <Grid size={{ xs: 12, sm: 8 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Tanggal Pengiriman Bulanan</InputLabel>
                    <Select
                      value={monthlyDay}
                      label="Tanggal Pengiriman Bulanan"
                      onChange={(e) => setMonthlyDay(e.target.value)}
                    >
                      <MenuItem value="25">Tanggal 25 Setiap Bulan</MenuItem>
                      <MenuItem value="28">Tanggal 28 Setiap Bulan</MenuItem>
                      <MenuItem value="30">Tanggal 30 Setiap Bulan</MenuItem>
                      <MenuItem value="last">Hari Terakhir Setiap Bulan</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
            </Grid>
          </Box>
        )}

        <Divider sx={{ my: 2.5 }} />

        {/* FITUR 4: DAFTAR NOMOR TARGET & ID GRUP */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                <GroupIcon fontSize="small" color="primary" />
                4. Nomor Target &amp; ID Grup WhatsApp
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Daftar kontak pimpinan sekolah (Kepala Sekolah, Wakakur) atau Grup WhatsApp tujuan laporan KBM:
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleOpenAddTarget}
              sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700 }}
            >
              Tambah Target
            </Button>
          </Box>

          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Nama Penerima / Grup</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Tipe</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Nomor WA / ID Grup</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Peran / Jabatan</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Status Aktif</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Aksi</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {targets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
                      Belum ada target pengiriman. Klik "Tambah Target" untuk menambahkan nomor pimpinan atau grup.
                    </TableCell>
                  </TableRow>
                ) : (
                  targets.map((t) => (
                    <TableRow key={t.id} hover>
                      <TableCell sx={{ fontWeight: 700 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {t.type === 'group' ? <GroupIcon fontSize="small" color="primary" /> : <PersonIcon fontSize="small" color="action" />}
                          {t.name}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={t.type === 'group' ? 'Grup WhatsApp' : 'Nomor Pribadi'}
                          size="small"
                          color={t.type === 'group' ? 'secondary' : 'default'}
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {t.targetId || <span style={{ color: '#ef4444' }}>Belum diisi</span>}
                      </TableCell>
                      <TableCell>{t.role || '-'}</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Switch
                          size="small"
                          checked={t.isActive}
                          onChange={() => handleToggleTargetActive(t.id)}
                          color="success"
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'center' }}>
                          <IconButton size="small" onClick={() => handleOpenEditTarget(t)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDeleteTarget(t.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
        </Box>

        {/* Save Settings Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveSettings}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
            sx={{ px: 3, py: 1, borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
          >
            {loading ? 'Menyimpan...' : 'Simpan Pengaturan Otomasi Guru'}
          </Button>
        </Box>
      </Paper>

      {/* FITUR 4: UJI KONEKSI & TEST LAPORAN GURU */}
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2.5, bgcolor: '#ffffff' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <WifiIcon color="primary" />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Uji Koneksi &amp; Uji Kirim Laporan Guru
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Kirimkan contoh format pesan laporan presensi KBM guru ke nomor WhatsApp Anda untuk memastikan teks tersusun rapi.
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2} sx={{ alignItems: 'flex-start' }}>
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField
              label="Nomor WhatsApp Penguji"
              value={testNumber}
              onChange={(e) => setTestNumber(e.target.value)}
              placeholder="Contoh: 08123456789 atau 628123456789"
              fullWidth
              size="small"
              helperText="Nomor Anda untuk menerima pesan contoh format laporan KBM guru"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Button
              variant="contained"
              color="info"
              fullWidth
              disabled={testing || !testNumber.trim()}
              onClick={handleTestConnection}
              startIcon={testing ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
              sx={{ height: 40, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
            >
              {testing ? 'Mengirim Tes...' : 'Uji Koneksi'}
            </Button>
          </Grid>
        </Grid>

        {testResult && (
          <Box sx={{ mt: 2 }}>
            <Alert
              severity={testResult.success ? 'success' : 'error'}
              icon={testResult.success ? <CheckCircleIcon fontSize="inherit" /> : undefined}
              sx={{ borderRadius: 2 }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {testResult.success ? 'Uji Coba Berhasil' : 'Uji Coba Gagal'}
              </Typography>
              <Typography variant="body2">{testResult.message}</Typography>
            </Alert>
          </Box>
        )}
      </Paper>

      {/* MANUAL SEND TRIGGER (KIRIM REKAP REALTIME SEKARANG) */}
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2.5, bgcolor: '#ffffff' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PlayArrowIcon color="success" />
              Kirim Rekapitulasi KBM Hari Ini Sekarang
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Menghitung data presensi KBM realtime hari ini dan langsung mengirimkannya ke seluruh target yang aktif.
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="success"
            disabled={triggering}
            onClick={handleTriggerSendNow}
            startIcon={triggering ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
            sx={{ px: 3, py: 1.25, borderRadius: 2.5, fontWeight: 800, textTransform: 'none' }}
          >
            {triggering ? 'Sedang Mengirim Laporan...' : 'Kirim Laporan Realtime Sekarang'}
          </Button>
        </Box>

        {sendResult && (
          <Box sx={{ mt: 2 }}>
            <Alert severity={sendResult.success ? 'success' : 'error'} sx={{ borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {sendResult.success ? 'Laporan KBM Berhasil Terkirim' : 'Gagal Mengirim Laporan'}
              </Typography>
              <Typography variant="body2">
                {sendResult.message || `Terkirim ke ${sendResult.sentCount || 0} nomor/grup tujuan.`}
              </Typography>
            </Alert>
          </Box>
        )}
      </Paper>

      {/* DIALOG ADD/EDIT TARGET */}
      <Dialog open={targetDialogOpen} onClose={() => setTargetDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editingTargetId ? 'Edit Target Laporan' : 'Tambah Target Laporan'}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2.5 }}>
          <Stack spacing={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipe Target</InputLabel>
              <Select
                value={targetForm.type}
                label="Tipe Target"
                onChange={(e) => setTargetForm({ ...targetForm, type: e.target.value as any })}
              >
                <MenuItem value="personal">Nomor WhatsApp Pribadi</MenuItem>
                <MenuItem value="group">Grup WhatsApp (ID Grup)</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Nama Penerima / Nama Grup"
              value={targetForm.name}
              onChange={(e) => setTargetForm({ ...targetForm, name: e.target.value })}
              fullWidth
              size="small"
              placeholder="Contoh: Kepala Sekolah / Grup Resmi Guru"
              required
            />

            <TextField
              label={targetForm.type === 'group' ? 'WhatsApp Group ID' : 'Nomor WhatsApp'}
              value={targetForm.targetId}
              onChange={(e) => setTargetForm({ ...targetForm, targetId: e.target.value })}
              fullWidth
              size="small"
              placeholder={targetForm.type === 'group' ? 'Contoh: 120363029102918@g.us' : 'Contoh: 08123456789'}
              helperText={targetForm.type === 'group' ? 'ID Grup WhatsApp dari Fonnte / Wablas' : 'Nomor WhatsApp aktif penerima laporan'}
              required
            />

            <TextField
              label="Peran / Keterangan"
              value={targetForm.role}
              onChange={(e) => setTargetForm({ ...targetForm, role: e.target.value })}
              fullWidth
              size="small"
              placeholder="Contoh: Pimpinan / Wakakur / Kurikulum"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setTargetDialogOpen(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Batal
          </Button>
          <Button variant="contained" onClick={handleSaveTargetDialog} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
            Simpan Target
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
