import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {  LinearProgress  } from '@mui/material';
import { Table, TableHead, TableRow, TableCell, TableBody, Switch, TableContainer } from '@mui/material';
import { safeStorage } from '../../safeStorage';
import { updateFavicon } from '../../utils/favicon';

// MUI Imports
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Grid,
  Radio,
  RadioGroup,
  FormControlLabel,
  Tabs,
  Tab,
  Stack,
  Divider,
  Alert,
  AlertTitle,
  MenuItem,
  IconButton,
  Card,
  Tooltip,
  Chip,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Slider
} from '@mui/material';

// Icons
import {
  Save as SaveIcon,
  Warning as WarningIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  PhonelinkSetup as MonitorSmartphoneIcon,
  BrandingWatermark as BrandingWatermarkIcon,
  VolumeUp as VolumeUpIcon,
  PlayArrow as PlayArrowIcon,
  Send as SendIcon,
  Palette as PaletteIcon,
  ColorLens as ColorLensIcon,
  Check as CheckIcon,
  CheckCircle as CheckCircleIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  LockReset as LockResetIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  VpnKey as KeyIcon,
  AccountCircle as AccountCircleIcon,
  School as SchoolIcon,
  Info as InfoIcon,
  QrCode2 as QrCode2Icon,
  Print as PrintIcon,
  CalendarMonth as CalendarMonthIcon
} from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';

import { THEME_PRESETS } from '../../theme';
import WhatsAppSettingsCard from '../../components/WhatsAppSettingsCard';
import { AccountManagementCards } from '../../components/AccountManagementCards';
import GatewaySettingsCard from '../../components/GatewaySettingsCard';
import TeacherAttendanceAutomationCard from '../../components/TeacherAttendanceAutomationCard';
import { 
  Usb as UsbIcon, 
  Verified as VerifiedIcon, 
  Add as AddIcon, 
  Delete as DeleteIcon, 
  Refresh as RefreshIcon, 
  Router as RouterIcon,
  Wallpaper as WallpaperIcon,
  Image as ImageIcon,
  Campaign as CampaignIcon
} from '@mui/icons-material';


const TahunAjaranSettings = () => {
  const [list, setList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [newNama, setNewNama] = React.useState('');
  const [newSemester, setNewSemester] = React.useState<'Ganjil' | 'Genap'>('Ganjil');

  // Explicit Active Year & Semester State
  const [activeTA, setActiveTA] = React.useState('2024/2025');
  const [activeSem, setActiveSem] = React.useState<'Ganjil' | 'Genap'>('Ganjil');
  const [applying, setApplying] = React.useState(false);
  const [confirmDialog, setConfirmDialog] = React.useState<{
    open: boolean;
    message: string;
    targetTA: string;
    targetSem: string;
  } | null>(null);

  const fetchTA = async () => {
    try {
      const [resTA, resSettings] = await Promise.all([
        axios.get('/api/tahun-ajaran'),
        axios.get('/api/tahun-ajaran/active-config').catch(() => ({ data: { data: {} } }))
      ]);
      const taList = Array.isArray(resTA.data) ? resTA.data : [];
      setList(taList);

      const activeConfig = resSettings.data?.data;
      if (activeConfig?.tahun_ajaran) {
        setActiveTA(activeConfig.tahun_ajaran);
        if (activeConfig.semester) setActiveSem(activeConfig.semester);
      } else {
        const foundActive = taList.find(t => t.is_active);
        if (foundActive) {
          setActiveTA(foundActive.nama);
          if (foundActive.semester) setActiveSem(foundActive.semester);
        }
      }
    } catch (e) {
      toast.error('Gagal mengambil data Tahun Ajaran');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchTA();
  }, []);

  const handleApplyActive = async (targetTa = activeTA, targetSem = activeSem, override = false) => {
    if (!targetTa.trim()) {
      toast.error('Pilih atau masukkan Tahun Ajaran aktif');
      return;
    }
    setApplying(true);
    try {
      const res = await axios.post('/api/tahun-ajaran/active-config', {
        tahun_ajaran: targetTa,
        semester: targetSem,
        confirm_override: override
      });

      if (res.data?.requires_confirmation && !override) {
        setConfirmDialog({
          open: true,
          message: res.data.message || 'Terdapat dokumen pada periode sebelumnya. Yakin ingin mengganti periode aktif?',
          targetTA: targetTa,
          targetSem: targetSem
        });
        return;
      }

      if (res.data?.success) {
        toast.success(res.data.message || `Periode Aktif berhasil diterapkan: ${targetTa} - Semester ${targetSem}`);
        setActiveTA(targetTa);
        setActiveSem(targetSem as 'Ganjil' | 'Genap');
        setConfirmDialog(null);
        await fetchTA();
      } else {
        toast.error(res.data?.message || 'Gagal menerapkan periode aktif');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Gagal menerapkan periode aktif ke pangkalan data');
    } finally {
      setApplying(false);
    }
  };

  const handleMakeActive = async (ta: any) => {
    const sem = ta.semester || activeSem;
    await handleApplyActive(ta.nama, sem, false);
  };

  const handleAdd = async () => {
    if (!newNama.trim()) {
      toast.error('Masukkan nama Tahun Ajaran');
      return;
    }
    try {
      await axios.post('/api/tahun-ajaran', { 
        nama: newNama.trim(),
        semester: newSemester,
        is_active: false
      });
      toast.success('Tahun Ajaran baru berhasil ditambahkan');
      setNewNama('');
      await fetchTA();
    } catch (e) {
      toast.error('Gagal menambah Tahun Ajaran');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus Tahun Ajaran ini dari daftar?')) return;
    try {
      await axios.delete(`/api/tahun-ajaran/${id}`);
      toast.success('Tahun Ajaran berhasil dihapus');
      await fetchTA();
    } catch (e) {
      toast.error('Gagal menghapus Tahun Ajaran');
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2, mt: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CalendarMonthIcon color="primary" sx={{ fontSize: 28 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Tahun Ajaran & Semester Aktif</Typography>
            <Typography variant="body2" color="text.secondary">
              Atur Tahun Ajaran dan Semester aktif untuk operasional sekolah, presensi harian, KBM, dan perangkat pembelajaran.
            </Typography>
          </Box>
        </Box>
        <Chip 
          icon={<CheckCircleIcon sx={{ fontSize: '18px !important' }} />}
          label={`Periode Berjalan: ${activeTA} (${activeSem})`} 
          color="success" 
          sx={{ fontWeight: 800, px: 1.2, py: 2 }} 
        />
      </Box>
      <Divider sx={{ mb: 3 }} />

      {/* Explicit Active Selector Card */}
      <Box sx={{ p: 2.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2, mb: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#1e293b' }}>
          Tetapkan Periode Aktif Sekolah
        </Typography>
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, sm: 5 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Tahun Ajaran Aktif</InputLabel>
              <Select
                value={activeTA}
                label="Tahun Ajaran Aktif"
                onChange={e => setActiveTA(e.target.value)}
              >
                {list.map(item => (
                  <MenuItem key={item.id} value={item.nama}>{item.nama}</MenuItem>
                ))}
                {!list.some(item => item.nama === activeTA) && activeTA && (
                  <MenuItem value={activeTA}>{activeTA}</MenuItem>
                )}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Semester Aktif</InputLabel>
              <Select
                value={activeSem}
                label="Semester Aktif"
                onChange={e => setActiveSem(e.target.value as 'Ganjil' | 'Genap')}
              >
                <MenuItem value="Ganjil">Semester Ganjil</MenuItem>
                <MenuItem value="Genap">Semester Genap</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              disabled={applying}
              onClick={() => handleApplyActive(activeTA, activeSem, false)}
              sx={{ fontWeight: 700, textTransform: 'none', py: 0.9, borderRadius: 1.5 }}
            >
              {applying ? 'Menyimpan...' : 'Terapkan Periode'}
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Tambah Tahun Ajaran Baru */}
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#475569' }}>
        Tambah Daftar Tahun Ajaran
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            size="small"
            fullWidth
            label="Tahun Ajaran Baru (Misal: 2025/2026)"
            placeholder="2025/2026"
            value={newNama}
            onChange={e => setNewNama(e.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Semester Default</InputLabel>
            <Select
              value={newSemester}
              label="Semester Default"
              onChange={e => setNewSemester(e.target.value as 'Ganjil' | 'Genap')}
            >
              <MenuItem value="Ganjil">Ganjil</MenuItem>
              <MenuItem value="Genap">Genap</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={handleAdd}
            sx={{ fontWeight: 700, textTransform: 'none', height: 40, borderRadius: 1.5 }}
          >
            Tambah
          </Button>
        </Grid>
      </Grid>

      {/* Tabel Master Tahun Ajaran */}
      <TableContainer sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Tahun Ajaran</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Semester</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#475569', textAlign: 'center' }}>Status Periode</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, color: '#475569', width: 180 }}>Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map(ta => {
              const isCurrentlyActive = Boolean(ta.is_active || (ta.nama === activeTA && (ta.semester || 'Ganjil') === activeSem));
              return (
                <TableRow key={ta.id} hover sx={{ bgcolor: isCurrentlyActive ? 'rgba(34, 197, 94, 0.04)' : 'inherit' }}>
                  <TableCell sx={{ fontWeight: 700, color: isCurrentlyActive ? 'success.dark' : '#1e293b' }}>
                    {ta.nama}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={ta.semester || 'Ganjil'}
                      size="small"
                      variant="outlined"
                      color={ta.semester === 'Genap' ? 'info' : 'primary'}
                      sx={{ fontWeight: 700, height: 24, fontSize: '0.72rem' }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    {isCurrentlyActive ? (
                      <Chip
                        icon={<CheckCircleIcon sx={{ fontSize: '15px !important' }} />}
                        label="Sedang Aktif"
                        color="success"
                        size="small"
                        sx={{ fontWeight: 800, height: 26, fontSize: '0.75rem' }}
                      />
                    ) : (
                      <Chip
                        label="Non-Aktif"
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600, color: 'text.secondary', height: 24, fontSize: '0.72rem' }}
                      />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {isCurrentlyActive ? (
                      <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 700 }}>
                        Periode Berjalan
                      </Typography>
                    ) : (
                      <Stack direction="row" spacing={1} sx={{ justifyContent: 'center', alignItems: 'center' }}>
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          disabled={applying}
                          startIcon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                          onClick={() => handleMakeActive(ta)}
                          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5, py: 0.4, fontSize: '0.75rem' }}
                        >
                          Jadikan Aktif
                        </Button>
                        <Button 
                          color="error" 
                          size="small" 
                          variant="outlined"
                          onClick={() => handleDelete(ta.id)}
                          sx={{ textTransform: 'none', fontWeight: 600, minWidth: 0, px: 1, height: 28, fontSize: '0.75rem' }}
                        >
                          Hapus
                        </Button>
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Confirmation Dialog for Overriding Active Period */}
      {confirmDialog && (
        <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog(null)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800, color: 'warning.main', display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="warning" /> Konfirmasi Pergantian Periode Aktif
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ color: '#1e293b', fontSize: '0.95rem' }}>
              {confirmDialog.message}
            </DialogContentText>
            <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
              Apakah Anda yakin ingin tetap mengaktifkan periode <b>{confirmDialog.targetTA} - Semester {confirmDialog.targetSem}</b>?
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setConfirmDialog(null)} color="inherit" sx={{ textTransform: 'none' }}>
              Batal
            </Button>
            <Button
              onClick={() => handleApplyActive(confirmDialog.targetTA, confirmDialog.targetSem as 'Ganjil' | 'Genap', true)}
              color="warning"
              variant="contained"
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Ya, Aktifkan Periode Ini
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Paper>
  );
};

// Komponen Perubahan Akun Admin (Username & Password)
const AdminAccountSettingsCard = () => {
  const [currentUsername, setCurrentUsername] = useState('admin');
  const [username, setUsername] = useState('admin');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function fetchAccount() {
      try {
        const { data } = await axios.get('/api/admin/account');
        if (data && data.username) {
          setCurrentUsername(data.username);
          setUsername(data.username);
        }
      } catch (e) {}
    }
    fetchAccount();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Masukkan password saat ini untuk konfirmasi keamanan');
      return;
    }
    if (!username.trim()) {
      toast.error('Username admin tidak boleh kosong');
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      toast.error('Konfirmasi password baru tidak cocok');
      return;
    }

    setLoading(true);
    setSaveSuccess(false);
    try {
      const { data } = await axios.post('/api/settings/admin-account', {
        username: username.trim(),
        currentPassword,
        newPassword: newPassword || undefined
      });

      if (data.success) {
        toast.success(data.message || 'Akun Admin berhasil diperbarui!');
        setCurrentUsername(data.username || username.trim());
        safeStorage.setItem('adminUsername', data.username || username.trim());
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setSaveSuccess(true);
        try {
          const authData = JSON.parse(localStorage.getItem('auth') || '{}');
          if (authData.username) {
            authData.username = data.username || username.trim();
            localStorage.setItem('auth', JSON.stringify(authData));
          }
        } catch (e) {}
      } else {
        toast.error(data.error || 'Gagal mengubah akun admin');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal mengubah akun admin. Pastikan password saat ini benar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1.5 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <AdminPanelSettingsIcon color="primary" sx={{ fontSize: 28 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Perubahan Akun Admin</Typography>
            <Typography variant="body2" color="text.secondary">
              Kelola username dan password akun Administrator untuk akses panel admin.
            </Typography>
          </Box>
        </Stack>
        <Chip
          icon={<AccountCircleIcon fontSize="small" />}
          label={`Username Aktif: ${currentUsername}`}
          color="primary"
          variant="outlined"
          sx={{ fontWeight: 700 }}
        />
      </Box>
      <Divider sx={{ mb: 3 }} />

      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSaveSuccess(false)}>
          Akun Admin berhasil diperbarui! Gunakan username dan password baru saat login berikutnya.
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: 'text.primary' }}>
              Informasi Username Admin
            </Typography>
            <TextField
              fullWidth
              size="small"
              label="Username Admin Baru"
              value={username}
              onChange={e => setUsername(e.target.value)}
              helperText="Username yang digunakan untuk masuk ke Panel Admin"
              required
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccountCircleIcon fontSize="small" color="action" />
                    </InputAdornment>
                  )
                }
              }}
            />

            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1.5, border: '1px dashed', borderColor: 'grey.300' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                • Password saat ini diperlukan setiap kali Anda mengubah username atau password admin demi keamanan data sekolah.
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                • Jika hanya ingin mengubah username, biarkan kolom password baru kosong.
              </Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: 'text.primary' }}>
              Kata Sandi / Password Admin
            </Typography>
            <Stack spacing={2.5}>
              <TextField
                fullWidth
                size="small"
                type={showCurrentPass ? 'text' : 'password'}
                label="Password Saat Ini (Wajib)"
                placeholder="Masukkan password admin saat ini"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <KeyIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowCurrentPass(!showCurrentPass)} edge="end">
                          {showCurrentPass ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />

              <TextField
                fullWidth
                size="small"
                type={showNewPass ? 'text' : 'password'}
                label="Password Baru (Opsional)"
                placeholder="Biarkan kosong jika tidak ingin mengubah password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockResetIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowNewPass(!showNewPass)} edge="end">
                          {showNewPass ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />

              {newPassword && (
                <TextField
                  fullWidth
                  size="small"
                  type={showConfirmPass ? 'text' : 'password'}
                  label="Konfirmasi Password Baru"
                  placeholder="Ulangi password baru"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  error={confirmPassword !== '' && confirmPassword !== newPassword}
                  helperText={confirmPassword !== '' && confirmPassword !== newPassword ? 'Konfirmasi password tidak cocok' : ''}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockResetIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setShowConfirmPass(!showConfirmPass)} edge="end">
                            {showConfirmPass ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }
                  }}
                />
              )}
            </Stack>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'grey.100', display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
            startIcon={<LockResetIcon />}
            sx={{ px: 3, py: 1, fontWeight: 700, textTransform: 'none', borderRadius: 2 }}
          >
            {loading ? 'Menyimpan...' : 'Simpan Perubahan Akun Admin'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default function Settings() {
  const [settings, setSettings] = useState<any>({
    schedule: {
      Monday: { arrivalStart: '', arrivalLate: '', arrivalEnd: '', departureStart: '', departureEnd: '' },
      Tuesday: { arrivalStart: '', arrivalLate: '', arrivalEnd: '', departureStart: '', departureEnd: '' },
      Wednesday: { arrivalStart: '', arrivalLate: '', arrivalEnd: '', departureStart: '', departureEnd: '' },
      Thursday: { arrivalStart: '', arrivalLate: '', arrivalEnd: '', departureStart: '', departureEnd: '' },
      Friday: { arrivalStart: '', arrivalLate: '', arrivalEnd: '', departureStart: '', departureEnd: '' },
      Saturday: { arrivalStart: '', arrivalLate: '', arrivalEnd: '', departureStart: '', departureEnd: '' },
      Sunday: { arrivalStart: '', arrivalLate: '', arrivalEnd: '', departureStart: '', departureEnd: '' },
    },
    scannerType: 'external',
    barcodeType: 'qrcode',
    suaraSukses: 'default1',
    suaraGagal: 'default2',
    fileSuaraSukses: '',
    fileSuaraGagal: ''
  });
  
  const [globalSettings, setGlobalSettings] = useState({
      websiteName: 'Panel Admin SMK',
      logoBase64: '',
      faviconBase64: '',
      backgroundImage: '',
      globalArrivalMax: '12:00',
      globalDepartureMin: '13:00',
      headmasterName: '',
      headmasterNip: '',
      headmasterWhatsapp: ''
  });

  const [showKepsekQrModal, setShowKepsekQrModal] = useState(false);

  const [activeDay, setActiveDay] = useState('Monday');

  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const [categoryTab, setCategoryTab] = useState(urlTab || 'info');

  useEffect(() => {
    if (urlTab) {
      setCategoryTab(urlTab);
    } else {
      setCategoryTab('info');
    }
  }, [urlTab]);

  const dayNames: Record<string, string> = {
    Monday: 'Senin',
    Tuesday: 'Selasa',
    Wednesday: 'Rabu',
    Thursday: 'Kamis',
    Friday: 'Jumat',
    Saturday: 'Sabtu',
    Sunday: 'Minggu'
  };

  // Isolated Scanner Theme, Box Style & Custom Running Text States (Does NOT affect Admin/Guru)
  const [scannerThemePreset, setScannerThemePreset] = useState(() => {
    return localStorage.getItem('scannerThemePreset') || 'indigo';
  });
  const [scannerThemeColor, setScannerThemeColor] = useState(() => {
    return localStorage.getItem('scannerThemeColor') || '';
  });
  const [scannerBackgroundImage, setScannerBackgroundImage] = useState(() => {
    return localStorage.getItem('scannerBackgroundImage') || '';
  });
  const [scannerBoxBgColor, setScannerBoxBgColor] = useState(() => {
    return localStorage.getItem('scannerBoxBgColor') || '#ffffff';
  });
  const [scannerBoxOpacity, setScannerBoxOpacity] = useState<number>(() => {
    const val = localStorage.getItem('scannerBoxOpacity');
    return val ? Number(val) : 96;
  });
  const [scannerRunningText, setScannerRunningText] = useState(() => {
    return localStorage.getItem('scannerRunningText') || 'Selamat Datang di Portal Presensi Siswa • Silakan scan kartu barcode/QR Anda pada scanner USB • Tetap tertib & jaga kedisiplinan';
  });

  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data } = await axios.get('/api/settings');
        if (data && data.schedule) {
            setSettings(data);
        }
        if (data) {
             const newGlobal = {
                 websiteName: data.websiteName || 'Panel Admin SMK',
                 logoBase64: data.logoBase64 || '',
                 faviconBase64: data.faviconBase64 || '',
                 backgroundImage: data.backgroundImage || data.background_image || '',
                 globalArrivalMax: data.globalArrivalMax || '12:00',
                 globalDepartureMin: data.globalDepartureMin || '13:00',
                 headmasterName: data.headmasterName || data.headmaster_name || data.kepala_sekolah_nama || '',
                 headmasterNip: data.headmasterNip || data.headmaster_nip || data.kepala_sekolah_nip || '',
                 headmasterWhatsapp: data.headmasterWhatsapp || data.headmaster_whatsapp || data.kepala_sekolah_whatsapp || ''
             };
             setGlobalSettings(newGlobal);
             localStorage.setItem('globalSettings', JSON.stringify(newGlobal));
             if (newGlobal.backgroundImage) {
               document.documentElement.style.setProperty('--portal-bg-image', `url(${newGlobal.backgroundImage})`);
               document.body.classList.add('has-portal-bg');
             }
             window.dispatchEvent(new Event('globalSettingsChanged'));

             if (data.scannerThemePreset) {
               setScannerThemePreset(data.scannerThemePreset);
               localStorage.setItem('scannerThemePreset', data.scannerThemePreset);
             }
             if (data.scannerThemeColor !== undefined) {
               setScannerThemeColor(data.scannerThemeColor);
               localStorage.setItem('scannerThemeColor', data.scannerThemeColor);
             }
             if (data.scannerBackgroundImage !== undefined) {
               setScannerBackgroundImage(data.scannerBackgroundImage);
               localStorage.setItem('scannerBackgroundImage', data.scannerBackgroundImage);
             }
             if (data.scannerBoxBgColor !== undefined) {
               setScannerBoxBgColor(data.scannerBoxBgColor);
               localStorage.setItem('scannerBoxBgColor', data.scannerBoxBgColor);
             }
             if (data.scannerBoxOpacity !== undefined) {
               setScannerBoxOpacity(Number(data.scannerBoxOpacity));
               localStorage.setItem('scannerBoxOpacity', String(data.scannerBoxOpacity));
             }
             if (data.scannerRunningText) {
               setScannerRunningText(data.scannerRunningText);
               localStorage.setItem('scannerRunningText', data.scannerRunningText);
             }
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchSettings();
  }, []);

  const [judulAplikasi, setJudulAplikasi] = useState('Sistem Presensi Siswa');
  const [judulPiket, setJudulPiket] = useState('Portal Guru Piket & Perizinan');
  const [judulGuruPortal, setJudulGuruPortal] = useState('Akses Data Guru');
  const [subjudulGuruPortal, setSubjudulGuruPortal] = useState('Portal Kehadiran, Piket & Akun Guru');
  const [piketPassword, setPiketPassword] = useState('');

  const handleBackgroundImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran foto background maksimal 5MB.');
      return;
    }

    const toastId = toast.loading('Mengunggah foto background portal...');
    try {
      const formData = new FormData();
      formData.append('background', file);
      const res = await axios.post('/api/upload/background', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data && res.data.backgroundUrl) {
        const bgUrl = res.data.backgroundUrl;
        setGlobalSettings(prev => ({ ...prev, backgroundImage: bgUrl }));
        setSettings((prev: any) => ({ ...prev, backgroundImage: bgUrl, background_image: bgUrl }));
        
        const currentSaved = safeStorage.getJSON('globalSettings', {});
        safeStorage.setJSON('globalSettings', { ...currentSaved, backgroundImage: bgUrl });
        document.documentElement.style.setProperty('--portal-bg-image', `url(${bgUrl})`);
        document.body.classList.add('has-portal-bg');
        window.dispatchEvent(new Event('globalSettingsChanged'));

        toast.success('Foto background portal berhasil diunggah & diterapkan!', { id: toastId });
        return;
      }
    } catch (err: any) {
      console.warn('Gagal upload API, beralih ke DataURL fallback', err);
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      setGlobalSettings(prev => ({ ...prev, backgroundImage: dataUrl }));
      setSettings((prev: any) => ({ ...prev, backgroundImage: dataUrl, background_image: dataUrl }));
      const currentSaved = safeStorage.getJSON('globalSettings', {});
      safeStorage.setJSON('globalSettings', { ...currentSaved, backgroundImage: dataUrl });
      document.documentElement.style.setProperty('--portal-bg-image', `url(${dataUrl})`);
      document.body.classList.add('has-portal-bg');
      window.dispatchEvent(new Event('globalSettingsChanged'));

      try {
        await axios.post('/api/settings', { ...settings, backgroundImage: dataUrl, background_image: dataUrl });
      } catch (e) {}
      toast.success('Foto background portal berhasil diterapkan!', { id: toastId });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBackgroundImage = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus foto background portal dan kembali ke warna latar default tema?')) {
      return;
    }
    const toastId = toast.loading('Menghapus background...');
    try {
      setGlobalSettings(prev => ({ ...prev, backgroundImage: '' }));
      setSettings((prev: any) => ({ ...prev, backgroundImage: '', background_image: '' }));
      const currentSaved = safeStorage.getJSON('globalSettings', {});
      safeStorage.setJSON('globalSettings', { ...currentSaved, backgroundImage: '' });
      document.documentElement.style.setProperty('--portal-bg-image', 'none');
      document.body.classList.remove('has-portal-bg');
      window.dispatchEvent(new Event('globalSettingsChanged'));

      await axios.post('/api/settings', { ...settings, backgroundImage: '', background_image: '' });
      toast.success('Background portal dihapus. Tema warna default kembali aktif.', { id: toastId });
    } catch (err) {
      toast.error('Gagal menghapus background', { id: toastId });
    }
  };

  // Consolidated Save Handler for All Portal Scanner Display & Sound Settings
  const saveComprehensiveScannerSettings = async (updates: Partial<{
    scannerBoxBgColor: string;
    scannerBoxOpacity: number;
    scannerBackgroundImage: string;
    scannerRunningText: string;
    scannerThemePreset: string;
    scannerThemeColor: string;
  }>) => {
    const colorToSave = updates.scannerBoxBgColor !== undefined ? updates.scannerBoxBgColor : scannerBoxBgColor;
    const opacityToSave = updates.scannerBoxOpacity !== undefined ? updates.scannerBoxOpacity : scannerBoxOpacity;
    const bgImageToSave = updates.scannerBackgroundImage !== undefined ? updates.scannerBackgroundImage : scannerBackgroundImage;
    const runningTextToSave = updates.scannerRunningText !== undefined ? updates.scannerRunningText : scannerRunningText;
    const themePresetToSave = updates.scannerThemePreset !== undefined ? updates.scannerThemePreset : scannerThemePreset;
    const themeColorToSave = updates.scannerThemeColor !== undefined ? updates.scannerThemeColor : scannerThemeColor;

    // 1. Synchronize local component state
    if (updates.scannerBoxBgColor !== undefined) setScannerBoxBgColor(colorToSave);
    if (updates.scannerBoxOpacity !== undefined) setScannerBoxOpacity(opacityToSave);
    if (updates.scannerBackgroundImage !== undefined) setScannerBackgroundImage(bgImageToSave);
    if (updates.scannerRunningText !== undefined) setScannerRunningText(runningTextToSave);
    if (updates.scannerThemePreset !== undefined) setScannerThemePreset(themePresetToSave);
    if (updates.scannerThemeColor !== undefined) setScannerThemeColor(themeColorToSave);

    // 2. Persist to safeStorage / localStorage together
    localStorage.setItem('scannerBoxBgColor', colorToSave);
    localStorage.setItem('scannerBoxOpacity', String(opacityToSave));
    localStorage.setItem('scannerBackgroundImage', bgImageToSave);
    localStorage.setItem('scannerRunningText', runningTextToSave);
    localStorage.setItem('scannerThemePreset', themePresetToSave);
    localStorage.setItem('scannerThemeColor', themeColorToSave);

    // 3. Keep main `settings` state object in React fully updated so subsequent calls merge on top of fresh values
    const payload = {
      ...settings,
      scannerBoxBgColor: colorToSave,
      scannerBoxOpacity: opacityToSave,
      scannerBackgroundImage: bgImageToSave,
      scanner_background_image: bgImageToSave,
      scannerRunningText: runningTextToSave,
      scannerThemePreset: themePresetToSave,
      scannerThemeColor: themeColorToSave
    };

    setSettings(payload);

    // 4. Dispatch event notifications for instant live update in AttendanceScanner
    window.dispatchEvent(new Event('scannerThemeChanged'));
    window.dispatchEvent(new Event('scannerSettingsChanged'));

    // 5. Send consolidated payload to backend API
    try {
      await axios.post('/api/settings', payload);
    } catch (err) {
      console.warn('Gagal sinkronkan pengaturan scanner ke backend:', err);
    }
  };

  // Handlers for Scanner-Isolated Theme & Display Settings
  const handleApplyScannerTheme = async (presetId: string, customColor?: string) => {
    const color = customColor !== undefined ? customColor : (scannerThemeColor || '');
    await saveComprehensiveScannerSettings({ scannerThemePreset: presetId, scannerThemeColor: color });
    const preset = THEME_PRESETS[presetId];
    toast.success(`Tema Portal Scanner (${preset ? preset.name : 'Kustom'}) berhasil diterapkan!`);
  };

  const handleSaveScannerBoxStyle = async (newColor?: string, newOpacity?: number) => {
    await saveComprehensiveScannerSettings({
      scannerBoxBgColor: newColor,
      scannerBoxOpacity: newOpacity
    });
    toast.success('Pengaturan Warna & Transparansi Box Portal Scanner berhasil disimpan!');
  };

  const handleSaveScannerRunningText = async () => {
    await saveComprehensiveScannerSettings({ scannerRunningText });
    toast.success('Custom Teks Berjalan Portal Scanner berhasil disimpan!');
  };

  const handleScannerBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran foto background maksimal 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = reader.result as string;
      await saveComprehensiveScannerSettings({ scannerBackgroundImage: b64 });
      toast.success('Foto background khusus Portal Scanner berhasil diterapkan!');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveScannerBackground = async () => {
    await saveComprehensiveScannerSettings({ scannerBackgroundImage: '' });
    toast.success('Foto background khusus Portal Scanner berhasil dihapus!');
  };

  useEffect(() => {
    async function fetchJudul() {
      try {
        const { data } = await axios.get('/api/settings/judul');
        if (data) {
          const appTitle = data.judul_aplikasi || data.judulAplikasi;
          const piketTitle = data.judul_piket || data.judulPiket;
          const guruTitle = data.judul_guru_portal || data.judulGuruPortal;
          const guruSub = data.subjudul_guru_portal || data.subjudulGuruPortal;

          if (appTitle) {
            setJudulAplikasi(appTitle);
            localStorage.setItem('judulAplikasi', appTitle);
          }
          if (piketTitle) {
            setJudulPiket(piketTitle);
            localStorage.setItem('judulPiket', piketTitle);
          }
          if (guruTitle) {
            setJudulGuruPortal(guruTitle);
            localStorage.setItem('judulGuruPortal', guruTitle);
          }
          if (guruSub) {
            setSubjudulGuruPortal(guruSub);
            localStorage.setItem('subjudulGuruPortal', guruSub);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchJudul();
  }, []);

  const handleUpdateJudul = async () => {
    try {
      const payload = { 
        judul_aplikasi: judulAplikasi, 
        judul_piket: judulPiket,
        judul_guru_portal: judulGuruPortal,
        subjudul_guru_portal: subjudulGuruPortal,
        judulAplikasi: judulAplikasi,
        judulPiket: judulPiket,
        judulGuruPortal: judulGuruPortal,
        subjudulGuruPortal: subjudulGuruPortal
      };
      
      let res;
      try {
        res = await axios.post('/api/settings/judul', payload);
      } catch (postErr) {
        res = await axios.put('/api/settings/judul', payload);
      }

      if (res && res.data && res.data.error) {
        toast.error(res.data.error);
        return;
      }

      toast.success('Pengaturan judul portal & aplikasi berhasil disimpan');
      localStorage.setItem('judulAplikasi', judulAplikasi);
      localStorage.setItem('judulPiket', judulPiket);
      localStorage.setItem('judulGuruPortal', judulGuruPortal);
      localStorage.setItem('subjudulGuruPortal', subjudulGuruPortal);
      window.dispatchEvent(new Event('judulAplikasiChanged'));
      window.dispatchEvent(new Event('judulGuruPortalChanged'));
    } catch (e: any) {
      console.error(e);
      toast.error('Gagal mengubah judul aplikasi');
    }
  };

  const handleUpdatePiket = async () => {
    if (!piketPassword) {
      toast.error('Password tidak boleh kosong');
      return;
    }
    try {
      const res = await axios.post('/api/settings/piket-password', { password: piketPassword });
      if (res.data.success) {
        toast.success('Password Piket berhasil diubah');
        setPiketPassword('');
      }
    } catch (e) {
      toast.error('Gagal mengubah password');
    }
  };

  const [selectedThemePreset, setSelectedThemePreset] = useState(() => {
    return localStorage.getItem('appThemePreset') || 'indigo';
  });
  const [customPrimaryColor, setCustomPrimaryColor] = useState(() => {
    return localStorage.getItem('appThemeColor') || '';
  });

  const handleApplyTheme = async (presetId: string, customColor?: string) => {
    setSelectedThemePreset(presetId);
    localStorage.setItem('appThemePreset', presetId);
    if (customColor !== undefined) {
      setCustomPrimaryColor(customColor);
      localStorage.setItem('appThemeColor', customColor);
    }
    window.dispatchEvent(new Event('themeChanged'));
    const preset = THEME_PRESETS[presetId];
    toast.success(`Tema ${preset ? preset.name : 'Kustom'} berhasil diterapkan!`);

    try {
      await axios.post('/api/settings', {
        ...settings,
        themePreset: presetId,
        themeColor: customColor !== undefined ? customColor : (customPrimaryColor || '')
      });
    } catch (e) {
      console.warn('Failed to sync theme to backend', e);
    }
  };

  const [uploadProgress, setUploadProgress] = useState(-1);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        setUploadProgress(0);
        await axios.post('/api/settings', settings, {
            onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
                setUploadProgress(percentCompleted);
            }
        });
        toast.success('Pengaturan jadwal dan sistem berhasil disimpan');
    } catch (error: any) {
        toast.error('Gagal menyimpan pengaturan: ' + (error.response?.data?.error || error.message));
    } finally {
        setUploadProgress(-1);
    }
  };

  const handleSaveGlobal = async () => {
      try {
          setUploadProgress(0);
          await axios.post('/api/settings', globalSettings, {
              onUploadProgress: (progressEvent) => {
                  const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
                  setUploadProgress(percentCompleted);
              }
          });
          safeStorage.setItem('globalSettings', JSON.stringify(globalSettings));
          if (globalSettings.logoBase64) {
            safeStorage.setItem('schoolLogoUrl', globalSettings.logoBase64);
          }
          if (globalSettings.websiteName) {
            safeStorage.setItem('schoolWebsiteName', globalSettings.websiteName);
          }
          if (globalSettings.faviconBase64) {
            updateFavicon(globalSettings.faviconBase64);
            safeStorage.setItem('appFavicon', globalSettings.faviconBase64);
          }
          window.dispatchEvent(new Event('globalSettingsChanged'));

          // Kirim sinyal update real-time via SSE ke seluruh Kiosk Portal Scanner
          try {
            await axios.post('/api/kiosk/command', {
              command: 'CONFIG_UPDATE',
              terminalId: 'ALL',
              payload: {
                settings: globalSettings
              }
            });
          } catch (kioskErr) {}

          toast.success('Pengaturan Global (Branding & Waktu) berhasil disimpan & disinkronkan ke Kiosk');
      } catch (e: any) {
          toast.error('Gagal menyimpan pengaturan global: ' + (e.response?.data?.error || e.message));
      } finally {
          setUploadProgress(-1);
      }
  };

  const handleReset = async () => {
    if (confirm('BAHAYA: Ini akan menghapus semua data (Siswa, Wali Kelas, Presensi). Lanjutkan?')) {
      try {
          await axios.post('/api/settings/reset');
          toast.success('Database berhasil direset.');
      } catch(e) {
          toast.error('Gagal mereset database.');
      }
    }
  };

  const updateSchedule = (day: string, field: string, value: string) => {
      setSettings((prev: any) => ({
          ...prev,
          schedule: {
              ...prev.schedule,
              [day]: {
                  ...(prev.schedule[day] || {}),
                  [field]: value
              }
          }
      }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logoBase64' | 'faviconBase64') => {
      const file = e.target.files?.[0];
      if (file) {
          // Buat FormData untuk langsung diunggah ke backend
          const formData = new FormData();
          const endpoint = field === 'logoBase64' ? '/api/upload/logo' : '/api/upload/favicon';
          const uploadFieldName = field === 'logoBase64' ? 'logo' : 'favicon';
          formData.append(uploadFieldName, file);

          try {
            const uploadRes = await axios.post(endpoint, formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (uploadRes.data.success && (uploadRes.data.faviconUrl || uploadRes.data.logoUrl || uploadRes.data.url)) {
              const fileUrl = uploadRes.data.faviconUrl || uploadRes.data.logoUrl || uploadRes.data.url;
              setGlobalSettings(prev => {
                const next = { ...prev, [field]: fileUrl };
                safeStorage.setItem('globalSettings', JSON.stringify(next));
                if (field === 'logoBase64') {
                  safeStorage.setItem('schoolLogoUrl', fileUrl);
                }
                return next;
              });
              if (field === 'faviconBase64') {
                updateFavicon(fileUrl);
                safeStorage.setItem('appFavicon', fileUrl);
              }
              window.dispatchEvent(new Event('globalSettingsChanged'));

              if (field === 'logoBase64') {
                try {
                  axios.post('/api/kiosk/command', {
                    command: 'CONFIG_UPDATE',
                    terminalId: 'ALL',
                    payload: { settings: { logoBase64: fileUrl, logo: fileUrl, logoUrl: fileUrl } }
                  }).catch(() => {});
                } catch (e) {}
              }

              toast.success(`${field === 'logoBase64' ? 'Logo' : 'Favicon'} berhasil diunggah! Ikon & branding telah diperbarui secara realtime.`);
              return;
            }
          } catch (uploadErr) {
            console.warn('Gagal upload langsung, beralih ke DataURL fallback', uploadErr);
          }

          const reader = new FileReader();
          reader.onloadend = () => {
              const img = new Image();
              img.onload = () => {
                  const canvas = document.createElement('canvas');
                  let width = img.width;
                  let height = img.height;
                  
                  const maxSize = field === 'faviconBase64' ? 128 : 500;

                  if (width > maxSize || height > maxSize) {
                      if (width > height) {
                          height = Math.round((height * maxSize) / width);
                          width = maxSize;
                      } else {
                          width = Math.round((width * maxSize) / height);
                          height = maxSize;
                      }
                  }

                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                      ctx.drawImage(img, 0, 0, width, height);
                      // Use png for favicon to preserve transparency, otherwise jpeg for smaller size or png if original is png
                      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                      const dataUrl = canvas.toDataURL(mimeType, 0.8);
                      setGlobalSettings(prev => ({ ...prev, [field]: dataUrl }));
                      if (field === 'faviconBase64') {
                        updateFavicon(dataUrl);
                        safeStorage.setItem('appFavicon', dataUrl);
                      }
                  } else {
                      const resUrl = reader.result as string;
                      setGlobalSettings(prev => ({ ...prev, [field]: resUrl }));
                      if (field === 'faviconBase64') {
                        updateFavicon(resUrl);
                        safeStorage.setItem('appFavicon', resUrl);
                      }
                  }
              };
              img.src = reader.result as string;
          };
          reader.readAsDataURL(file);
      }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'fileSuaraSukses' | 'fileSuaraGagal') => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 500 * 1024) { // 500KB limit
              toast.error('Ukuran file audio terlalu besar. Maksimal 500KB untuk menghindari gagal simpan.');
              return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
              setSettings((prev: any) => ({ ...prev, [field]: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  const playPreview = (type: 'sukses' | 'gagal') => {
       const snd = settings[type === 'sukses' ? 'suaraSukses' : 'suaraGagal'];
       const file = settings[type === 'sukses' ? 'fileSuaraSukses' : 'fileSuaraGagal'];

       if (snd === 'custom' && file) {
           const audio = new Audio(file);
           audio.play().catch(e => console.error(e));
       } else {
           const ctx = new window.AudioContext();
           const osc = ctx.createOscillator();
           osc.type = snd === 'default2' ? 'square' : 'sine';
           osc.frequency.setValueAtTime(snd === 'default2' ? 300 : 800, ctx.currentTime);
           osc.connect(ctx.destination);
           osc.start();
           setTimeout(() => osc.stop(), snd === 'default2' ? 300 : 150);
       }
  };

  return (
    <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column', maxWidth: 900 }}>
      {/* Header & Navigasi berdasarkan Menu Aktif */}
      {(categoryTab === 'wa' || categoryTab === 'wa-siswa') && (
        <Box sx={{ mb: 0.5 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }} color="text.primary">
            Otomasi Presensi Siswa
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Konfigurasi jadwal dan target pengiriman otomatis rekapitulasi presensi harian siswa ke wali kelas dan grup WhatsApp.
          </Typography>
        </Box>
      )}

      {categoryTab === 'wa-guru' && (
        <Box sx={{ mb: 0.5 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }} color="text.primary">
            Otomasi Presensi Guru
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Konfigurasi mode pengiriman, daftar target pimpinan / grup WhatsApp, dan jadwal cron pengiriman rekapitulasi keterisian KBM guru.
          </Typography>
        </Box>
      )}

      {categoryTab === 'tampilan-suara' && (
        <Box sx={{ mb: 0.5 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }} color="text.primary">
            Tampilan & Suara (Khusus Portal Scanner)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Konfigurasi tema terisolasi, custom teks berjalan dinamis, jenis kode kartu, dan suara notifikasi khusus untuk antarmuka Portal Scanner (PC Client).
          </Typography>
        </Box>
      )}

      {categoryTab === 'theme' && (
        <Box sx={{ mb: 0.5 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }} color="text.primary">
            Tema (Global Aplikasi & Admin)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Konfigurasi tema estetika modern Tailwind CSS dan palet warna global untuk seluruh antarmuka Portal Admin dan sistem aplikasi secara umum.
          </Typography>
        </Box>
      )}

      {categoryTab === 'jadwal' && (
        <Box sx={{ mb: 0.5 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }} color="text.primary">
            Pengaturan Jadwal Presensi
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Konfigurasi jam mulai datang, batas toleransi terlambat, dan jam kepulangan harian (Senin - Jumat).
          </Typography>
        </Box>
      )}

      {categoryTab === 'info' && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }} color="text.primary">
            Informasi Sekolah
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Kelola identitas profil sekolah, logo, tahun ajaran aktif, batas waktu KBM, serta pengaturan judul Portal Akses Data Guru.
          </Typography>
        </Box>
      )}

      {['gateway', 'akun', 'theme'].includes(categoryTab) && (
        <>
          <Box sx={{ mb: 0.5 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }} color="text.primary">
              Pengaturan Umum
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Kelola kredensial gateway WhatsApp, akun administrator, serta estetika dan tema antarmuka aplikasi.
            </Typography>
          </Box>

          {/* Tab Navigasi Khusus Pengaturan Umum: Atur Gateway, Akun Admin, Tema */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
            <Tabs 
              value={categoryTab} 
              onChange={(_, v) => {
                setCategoryTab(v);
                setSearchParams({ tab: v });
              }} 
              indicatorColor="primary" 
              textColor="primary"
            >
              <Tab 
                label="Atur Gateway" 
                value="gateway" 
                icon={<RouterIcon fontSize="small" />} 
                iconPosition="start"
                sx={{ textTransform: 'none', fontWeight: 'bold' }} 
              />
              <Tab 
                label="Atur Akun" 
                value="akun" 
                icon={<AdminPanelSettingsIcon fontSize="small" />} 
                iconPosition="start"
                sx={{ textTransform: 'none', fontWeight: 'bold' }} 
              />
              <Tab 
                label="Tema" 
                value="theme" 
                icon={<PaletteIcon fontSize="small" />} 
                iconPosition="start"
                sx={{ textTransform: 'none', fontWeight: 'bold' }} 
              />
            </Tabs>
          </Box>
        </>
      )}

      {uploadProgress >= 0 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="info.dark" sx={{ fontWeight: 'medium' }}>Mengunggah...</Typography>
                <Typography variant="body2" color="info.dark" sx={{ fontWeight: 'medium' }}>{uploadProgress}%</Typography>
            </Box>
            <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 10, borderRadius: 5 }} />
          </Box>
      )}

      {/* Atur Gateway WhatsApp */}
      {categoryTab === 'gateway' && (
        <GatewaySettingsCard initialSettings={settings} />
      )}

      {/* Otomasi Presensi Siswa */}
      {(categoryTab === 'wa' || categoryTab === 'wa-siswa') && (
        <WhatsAppSettingsCard initialSettings={settings} />
      )}

      {/* Otomasi Presensi Guru */}
      {categoryTab === 'wa-guru' && (
        <TeacherAttendanceAutomationCard initialSettings={settings} />
      )}

      {/* Global Branding Settings */}
      {(categoryTab === 'info') && (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <BrandingWatermarkIcon color="action" />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Informasi Sekolah & Waktu</Typography>
          </Box>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={4}>
              <Grid size={{xs: 12, md: 6}}>
                  <Stack spacing={3}>
                      <TextField 
                          label="Nama Website" 
                          fullWidth 
                          size="small" 
                          value={globalSettings.websiteName}
                          onChange={e => setGlobalSettings({...globalSettings, websiteName: e.target.value})}
                      />
                      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                          <Button variant="outlined" component="label" startIcon={<UploadIcon />}>
                              Upload Logo
                              <input type="file" hidden accept="image/*" onChange={e => handleFileUpload(e, 'logoBase64')} />
                          </Button>
                          {globalSettings.logoBase64 && <img src={globalSettings.logoBase64} alt="Logo" style={{ height: 40 }} />}
                      </Stack>
                      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                          <Button variant="outlined" component="label" startIcon={<UploadIcon />}>
                              Upload Favicon
                              <input type="file" hidden accept="image/*" onChange={e => handleFileUpload(e, 'faviconBase64')} />
                          </Button>
                          {globalSettings.faviconBase64 && <img src={globalSettings.faviconBase64} alt="Favicon" style={{ height: 32 }} />}
                      </Stack>
                  </Stack>
              </Grid>
              <Grid size={{xs: 12, md: 6}}>
                  <Stack spacing={3}>
                       <Box>
                          <Typography variant="subtitle2" sx={{ mb: 1 }}>Waktu Otomatis Presensi (Scanner)</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                              Jam ini digunakan untuk mendeteksi status Datang / Pulang otomatis di halaman Scanner.
                          </Typography>
                       </Box>
                       <TextField 
                           label="Batas Akhir Jam Datang"
                           type="time" 
                           fullWidth 
                           size="small" 
                           slotProps={{ inputLabel: { shrink: true } }}
                           value={globalSettings.globalArrivalMax}
                           onChange={e => setGlobalSettings({...globalSettings, globalArrivalMax: e.target.value})}
                       />
                       <TextField 
                           label="Batas Awal Jam Pulang"
                           type="time" 
                           fullWidth 
                           size="small" 
                           slotProps={{ inputLabel: { shrink: true } }}
                           value={globalSettings.globalDepartureMin}
                           onChange={e => setGlobalSettings({...globalSettings, globalDepartureMin: e.target.value})}
                       />
                  </Stack>
              </Grid>
          </Grid>
          
          <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'grey.100' }}>
             <Button variant="contained" color="primary" onClick={handleSaveGlobal} startIcon={<SaveIcon />}>Simpan Branding & Waktu</Button>
          </Box>
      </Paper>
      )}

      {/* Identitas Kepala Sekolah */}
      {(categoryTab === 'info') && (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2.5, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <SchoolIcon color="primary" sx={{ fontSize: 28 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Identitas Kepala Sekolah</Typography>
              <Typography variant="body2" color="text.secondary">
                Data Kepala Sekolah (Nama dan NIP) yang akan otomatis tercantum pada lembar pengesahan, laporan presensi cetak/PDF, dan kartu.
              </Typography>
            </Box>
          </Box>
          <Chip label="Pimpinan Sekolah" color="primary" size="small" sx={{ fontWeight: 700 }} />
        </Box>
        <Divider sx={{ mb: 3 }} />
        
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField 
              fullWidth 
              size="small" 
              label="Nama Lengkap Kepala Sekolah" 
              placeholder="Contoh: Drs. H. Ahmad Dahlan, M.Pd."
              helperText="Nama lengkap beserta gelar akademik/kehormatan."
              value={globalSettings.headmasterName} 
              onChange={e => setGlobalSettings({ ...globalSettings, headmasterName: e.target.value })} 
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField 
              fullWidth 
              size="small" 
              label="NIP Kepala Sekolah" 
              placeholder="Contoh: 19750812 200003 1 002 atau -"
              helperText="Nomor Induk Pegawai (NIP) resmi Kepala Sekolah."
              value={globalSettings.headmasterNip} 
              onChange={e => setGlobalSettings({ ...globalSettings, headmasterNip: e.target.value })} 
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField 
              fullWidth 
              size="small" 
              label="Nomor WhatsApp Kepala Sekolah" 
              placeholder="Contoh: 081234567890 atau 6281234567890"
              helperText="Nomor aktif untuk notifikasi laporan & komunikasi resmi."
              value={globalSettings.headmasterWhatsapp || ''} 
              onChange={e => setGlobalSettings({ ...globalSettings, headmasterWhatsapp: e.target.value })} 
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'grey.100', display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleSaveGlobal} 
            startIcon={<SaveIcon />}
            sx={{ borderRadius: 2, px: 3, textTransform: 'none', fontWeight: 700 }}
          >
            Simpan Identitas Kepala Sekolah
          </Button>

          <Button 
            variant="outlined" 
            color="info" 
            onClick={() => setShowKepsekQrModal(true)} 
            startIcon={<QrCode2Icon />}
            sx={{ borderRadius: 2, px: 2.5, textTransform: 'none', fontWeight: 700 }}
          >
            QR Code Resmi Kepala Sekolah
          </Button>
        </Box>

        {/* DIALOG QR CODE RESMI KEPALA SEKOLAH */}
        <Dialog
          open={showKepsekQrModal}
          onClose={() => setShowKepsekQrModal(false)}
          maxWidth="xs"
          fullWidth
          slotProps={{ paper: { sx: { borderRadius: 3, p: 1, textAlign: 'center' } } }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
              QR Code Resmi Kepala Sekolah
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Digunakan untuk verifikasi lembar pengesahan perangkat ajar & dokumen resmi sekolah.
            </Typography>

            <Box
              sx={{
                p: 2.5,
                border: '2px solid #0284c7',
                borderRadius: 3,
                bgcolor: '#f0f9ff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                my: 1
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#0369a1', textTransform: 'uppercase' }}>
                {globalSettings.websiteName || 'SEKOLAH INDONESIA'}
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', mt: 0.5 }}>
                {globalSettings.headmasterName || 'Kepala Sekolah'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
                NIP: {globalSettings.headmasterNip || '-'}
              </Typography>

              <Box sx={{ p: 1.5, bgcolor: '#ffffff', borderRadius: 2, border: '1px solid #cbd5e1' }}>
                <QRCodeSVG
                  value={JSON.stringify({
                    type: 'HEADMASTER_OFFICIAL_STAMP',
                    school: globalSettings.websiteName || 'SMK',
                    name: globalSettings.headmasterName || 'Kepala Sekolah',
                    nip: globalSettings.headmasterNip || '-',
                    whatsapp: globalSettings.headmasterWhatsapp || '-',
                    hash: `KEPSEK-VERIF-${Date.now()}`
                  })}
                  size={180}
                  level="H"
                />
              </Box>

              <Typography variant="caption" sx={{ color: '#475569', mt: 1.5, fontSize: '11px', fontWeight: 600 }}>
                Otentikasi Tanda Tangan & Pengesahan Digital
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Button onClick={() => setShowKepsekQrModal(false)} color="inherit">
                Tutup
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<PrintIcon />}
                onClick={() => window.print()}
                sx={{ fontWeight: 700, borderRadius: 2 }}
              >
                Cetak QR Code
              </Button>
            </Box>
          </Box>
        </Dialog>
      </Paper>
      )}

      {(categoryTab === 'info') && <TahunAjaranSettings />}

      {/* Pengaturan Judul & Subjudul Portal Akses Data Guru */}
      {(categoryTab === 'info') && (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2.5, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <SchoolIcon color="primary" sx={{ fontSize: 28 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Pengaturan Judul Portal Akses Data Guru</Typography>
              <Typography variant="body2" color="text.secondary">
                Kustomisasi nama dan subjudul portal terpadu untuk guru (halaman login dan dashboard akses guru).
              </Typography>
            </Box>
          </Box>
          <Chip label="Portal Guru Satu Pintu" color="success" size="small" sx={{ fontWeight: 700 }} />
        </Box>
        <Divider sx={{ mb: 3 }} />
        
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Stack spacing={2.5}>
              <TextField 
                fullWidth 
                size="small" 
                label="Judul Portal Akses Data Guru" 
                helperText="Ditampilkan sebagai nama utama portal di halaman login dan header dashboard guru."
                value={judulGuruPortal} 
                onChange={e => setJudulGuruPortal(e.target.value)} 
                placeholder="Contoh: Akses Data Guru"
              />
              <TextField 
                fullWidth 
                size="small" 
                label="Subjudul Portal Akses Data Guru" 
                helperText="Ditampilkan di bawah judul sebagai deskripsi fungsi portal terpadu guru."
                value={subjudulGuruPortal} 
                onChange={e => setSubjudulGuruPortal(e.target.value)} 
                placeholder="Contoh: Portal Kehadiran, Piket & Akun Guru"
              />
              <Box sx={{ pt: 1 }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={handleUpdateJudul}
                  startIcon={<SaveIcon />}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                >
                  Simpan Judul Portal Guru
                </Button>
              </Box>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 2.5, 
                borderRadius: 2.5, 
                bgcolor: '#f8fafc', 
                border: '1px dashed #cbd5e1',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}
            >
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, mb: 1, display: 'block' }}>
                PRATINJAU HEADER PORTAL GURU:
              </Typography>
              <Box sx={{ p: 2, bgcolor: '#ffffff', borderRadius: 2, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 38, height: 38, borderRadius: '50%', bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <SchoolIcon sx={{ fontSize: 22 }} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
                      {judulGuruPortal || 'Akses Data Guru'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                      {subjudulGuruPortal || 'Portal Kehadiran, Piket & Akun Guru'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block', fontSize: '0.72rem' }}>
                *Perubahan akan langsung disinkronkan ke seluruh guru yang mengakses portal.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
      )}

      {/* Pengaturan Judul & Akun Piket */}
      {(categoryTab === 'info') && (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            <BrandingWatermarkIcon color="action" />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Pengaturan Judul Presensi & Akun Piket</Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />
        
        <Grid container spacing={4}>
           <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Ubah judul halaman scanner presensi siswa utama dan portal piket.
              </Typography>
              <Grid container spacing={2}>
                 <Grid size={{ xs: 12 }}>
                    <TextField 
                       fullWidth 
                       size="small" 
                       label="Judul Halaman Presensi" 
                       helperText="Ditampilkan di scanner presensi siswa"
                       value={judulAplikasi} 
                       onChange={e => setJudulAplikasi(e.target.value)} 
                    />
                 </Grid>
                 <Grid size={{ xs: 12 }}>
                    <TextField 
                       fullWidth 
                       size="small" 
                       label="Judul Portal Guru Piket" 
                       helperText="Ditampilkan di dashboard & login portal piket"
                       value={judulPiket} 
                       onChange={e => setJudulPiket(e.target.value)} 
                    />
                 </Grid>
                 <Grid size={{ xs: 12 }}>
                    <Button variant="contained" onClick={handleUpdateJudul}>Update Judul Presensi & Piket</Button>
                 </Grid>
              </Grid>
           </Grid>

           <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Ubah password untuk akses Portal Guru Piket. (Username: <b>piket</b>)
              </Typography>
              <Grid container spacing={2}>
                 <Grid size={{ xs: 12 }}>
                    <TextField fullWidth size="small" label="Password Piket Baru" value={piketPassword} onChange={e => setPiketPassword(e.target.value)} type="password" />
                 </Grid>
                 <Grid size={{ xs: 12 }}>
                    <Button variant="contained" onClick={handleUpdatePiket} color="warning">Update Password Piket</Button>
                 </Grid>
              </Grid>
           </Grid>
        </Grid>
      </Paper>
      )}

      {/* Fitur Pengaturan Atur Akun (Administrator) */}
      {(categoryTab === 'akun') && (
        <Box>
          <AdminAccountSettingsCard />
        </Box>
      )}

      {/* ============================================================== */}
      {/* 1. TAMPILAN & TEMA (GLOBAL ADMIN & APLIKASI)                   */}
      {/* ============================================================== */}
      {categoryTab === 'theme' && (
        <Stack spacing={3}>
          {/* A. Pilihan Tema & Tata Letak Modern Berbasis Tailwind CSS (Global) */}
          <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 3, bgcolor: '#ffffff' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1.5 }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <ColorLensIcon color="primary" sx={{ fontSize: 32 }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Pilihan Tema & Tata Letak Modern (Global Admin)</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pilih preset tata letak dan estetika warna berbasis Tailwind CSS modern untuk antarmuka Portal Admin dan sistem aplikasi secara umum.
                  </Typography>
                </Box>
              </Stack>

              <Chip
                icon={<CheckCircleIcon fontSize="small" />}
                label={`Tema Aktif: ${THEME_PRESETS[selectedThemePreset]?.name || 'Modern Indigo'}`}
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 700 }}
              />
            </Box>

            {/* Dynamic Branding Guarantee Callout */}
            <Alert severity="info" icon={<SchoolIcon />} sx={{ mb: 3, borderRadius: 2.5, bgcolor: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e40af' }}>
                Integrasi Dinamis Identitas Sekolah:
              </Typography>
              <Typography variant="caption" sx={{ color: '#1e3a8a', display: 'block', mt: 0.3 }}>
                Saat tema diubah, komponen Header dan Navigasi secara dinamis tetap mengambil dan merender <b>Logo</b> ({globalSettings.logoBase64 ? '✓ Logo Terpasang' : 'Logo Default'}) serta <b>Judul Aplikasi</b> ("{globalSettings.websiteName || 'Admin Presensi'}") dari menu <i>Informasi Sekolah</i>.
              </Typography>
            </Alert>

            <Grid container spacing={2.5}>
              {Object.values(THEME_PRESETS).map((preset) => {
                const isSelected = selectedThemePreset === preset.id;
                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={preset.id}>
                    <Card
                      sx={{
                        borderRadius: 3,
                        border: isSelected ? `2.5px solid ${preset.primary}` : '1px solid #e2e8f0',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer',
                        bgcolor: isSelected ? 'rgba(26, 115, 232, 0.02)' : '#ffffff',
                        boxShadow: isSelected ? '0 8px 24px -6px rgba(0,0,0,0.14)' : 'none',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 8px 20px -6px rgba(0,0,0,0.08)'
                        }
                      }}
                      onClick={() => handleApplyTheme(preset.id)}
                    >
                      {/* Gradient Header Swatch */}
                      <Box
                        sx={{
                          height: 48,
                          background: preset.sidebarActiveGradient,
                          p: 1.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 800, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                          {preset.name.split('(')[0].trim()}
                        </Typography>
                        {isSelected && (
                          <Box sx={{ bgcolor: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CheckIcon sx={{ fontSize: 16, color: preset.primary }} />
                          </Box>
                        )}
                      </Box>

                      <Box sx={{ p: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, minHeight: 36, lineHeight: 1.4 }}>
                          {preset.description}
                        </Typography>

                        {/* Color Swatches */}
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
                          <Tooltip title={`Primary: ${preset.primary}`}>
                            <Box sx={{ width: 24, height: 24, borderRadius: 1.5, bgcolor: preset.primary, boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }} />
                          </Tooltip>
                          <Tooltip title={`Sidebar: ${preset.sidebarBg}`}>
                            <Box sx={{ width: 24, height: 24, borderRadius: 1.5, bgcolor: preset.sidebarBg, boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }} />
                          </Tooltip>
                          <Tooltip title={`Aksen: ${preset.accent}`}>
                            <Box sx={{ width: 24, height: 24, borderRadius: 1.5, bgcolor: preset.accent, boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }} />
                          </Tooltip>
                          <Tooltip title={`Secondary: ${preset.secondary}`}>
                            <Box sx={{ width: 24, height: 24, borderRadius: 1.5, bgcolor: preset.secondary, boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }} />
                          </Tooltip>
                        </Stack>

                        <Button
                          fullWidth
                          size="small"
                          variant={isSelected ? 'contained' : 'outlined'}
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyTheme(preset.id);
                          }}
                          sx={{
                            borderRadius: 2,
                            fontWeight: 700,
                            textTransform: 'none',
                            bgcolor: isSelected ? preset.primary : undefined,
                            borderColor: !isSelected ? '#cbd5e1' : undefined
                          }}
                        >
                          {isSelected ? '✓ Tema Aktif' : 'Terapkan Tema'}
                        </Button>
                      </Box>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>

            {/* Custom Brand Hex Color (Global) */}
            <Box sx={{ mt: 3, p: 2.5, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Kustomisasi Warna Utama Brand Sendiri (Hex Color):
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'center' }}>
                <TextField
                  size="small"
                  placeholder="#1A73E8"
                  label="Kode Warna Hex"
                  value={customPrimaryColor}
                  onChange={e => setCustomPrimaryColor(e.target.value)}
                  sx={{ width: { xs: '100%', sm: 220 } }}
                  slotProps={{
                    input: {
                      startAdornment: customPrimaryColor ? (
                        <Box sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: customPrimaryColor, mr: 1, border: '1px solid #ccc' }} />
                      ) : undefined
                    }
                  }}
                />
                <Button
                  variant="contained"
                  onClick={() => {
                    if (/^#[0-9A-F]{6}$/i.test(customPrimaryColor.trim())) {
                      handleApplyTheme(selectedThemePreset, customPrimaryColor.trim());
                    } else {
                      toast.error('Format hex tidak valid (contoh: #1A73E8)');
                    }
                  }}
                  sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
                >
                  Terapkan Warna Kustom
                </Button>
                {customPrimaryColor && (
                  <Button
                    variant="text"
                    color="inherit"
                    onClick={() => {
                      setCustomPrimaryColor('');
                      handleApplyTheme(selectedThemePreset, '');
                    }}
                    sx={{ textTransform: 'none' }}
                  >
                    Reset ke Warna Default Tema
                  </Button>
                )}
              </Stack>
            </Box>
          </Paper>
        </Stack>
      )}

      {/* ============================================================== */}
      {/* 2. TAMPILAN & SUARA (TERISOLASI KHUSUS PORTAL SCANNER)          */}
      {/* ============================================================== */}
      {(categoryTab === 'tampilan-suara' || categoryTab === 'perangkat') && (
        <Stack spacing={3}>
          {/* A. Custom Teks Berjalan (Running Text) Portal Scanner */}
          <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 3, bgcolor: '#ffffff' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <CampaignIcon color="primary" sx={{ fontSize: 32 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Custom Teks Berjalan (Running Text) Portal Scanner</Typography>
                <Typography variant="body2" color="text.secondary">
                  Kelola isi pesan pengumuman/informasi berjalan (marquee animation) yang tampil secara real-time pada antarmuka Portal Scanner.
                </Typography>
              </Box>
            </Box>
            <Divider sx={{ mb: 2.5 }} />

            <Stack spacing={2.5}>
              <TextField
                label="Isi Custom Teks Berjalan"
                multiline
                rows={2}
                fullWidth
                value={scannerRunningText}
                onChange={e => setScannerRunningText(e.target.value)}
                placeholder="Contoh: Selamat Datang di Portal Presensi Siswa • Silakan scan kartu barcode/QR Anda pada scanner USB • Tetap tertib & jaga kedisiplinan"
                helperText="Teks ini akan otomatis ditampilkan berjalan (infinite marquee animation) pada antarmuka Portal Scanner PC client."
              />

              {/* Aesthetic Live Preview */}
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>
                  Pratinjau Animasi Teks Berjalan (Live Preview Portal Scanner):
                </Typography>
                <Box
                  sx={{
                    p: 1.2,
                    px: 1.8,
                    borderRadius: 3,
                    bgcolor: '#ffffff',
                    border: '1.5px solid #86efac',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    position: 'relative'
                  }}
                >
                  <Chip
                    icon={<CampaignIcon sx={{ fontSize: '15px !important', color: '#ffffff !important' }} />}
                    label="PENGUMUMAN"
                    size="small"
                    sx={{
                      bgcolor: '#16a34a',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      letterSpacing: '0.04em',
                      borderRadius: 1.5,
                      flexShrink: 0
                    }}
                  />
                  <Box sx={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    <Box
                      component="span"
                      sx={{
                        display: 'inline-block',
                        animation: 'scannerMarqueePreview 20s linear infinite',
                        '@keyframes scannerMarqueePreview': {
                          '0%': { transform: 'translateX(100%)' },
                          '100%': { transform: 'translateX(-100%)' }
                        },
                        color: '#14532d',
                        fontWeight: 600,
                        fontSize: '0.9rem'
                      }}
                    >
                      {scannerRunningText || 'Teks berjalan belum diisi...'}
                    </Box>
                  </Box>
                </Box>
              </Box>

              {/* Quick Template Suggestions */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>
                  Pilihan Cepat Template Teks Berjalan:
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  <Chip
                    label="Template 1: Selamat Datang & Scan Tertib"
                    onClick={() => setScannerRunningText('Selamat Datang di Portal Presensi Siswa • Silakan scan kartu barcode/QR Anda pada scanner USB • Tetap tertib & jaga kedisiplinan')}
                    clickable
                    variant="outlined"
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                  <Chip
                    label="Template 2: Semangat Pagi & Disiplin"
                    onClick={() => setScannerRunningText('Semangat Pagi Siswa-Siswi Hebat! • Budayakan hadir tepat waktu untuk meraih prestasi terbaik • Disiplin dimulai dari diri sendiri')}
                    clickable
                    variant="outlined"
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                  <Chip
                    label="Template 3: Presensi Pulang & Istirahat"
                    onClick={() => setScannerRunningText('Presensi Kepulangan Siswa • Terima kasih atas semangat belajar hari ini • Hati-hati di perjalanan pulang & selamat beristirahat')}
                    clickable
                    variant="outlined"
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                </Stack>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSaveScannerRunningText}
                  startIcon={<SaveIcon />}
                  sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
                >
                  Simpan Teks Berjalan
                </Button>
              </Box>
            </Stack>
          </Paper>

          {/* B. Kustomisasi Warna Latar Box & Transparansi (TERISOLASI PORTAL SCANNER) */}
          <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 3, bgcolor: '#ffffff' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1.5 }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <ColorLensIcon color="primary" sx={{ fontSize: 32 }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Kustomisasi Latar Box Utama Portal Scanner</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Atur warna latar belakang (Color Picker) dan persentase transparansi (Opacity) khusus untuk area box utama Portal Scanner.
                  </Typography>
                </Box>
              </Stack>

              <Chip
                icon={<CheckCircleIcon fontSize="small" />}
                label={`Warna: ${scannerBoxBgColor} • Opacity: ${scannerBoxOpacity}%`}
                color="success"
                variant="outlined"
                sx={{ fontWeight: 700 }}
              />
            </Box>

            {/* Callout Isolasi */}
            <Alert severity="info" sx={{ mb: 3, borderRadius: 2.5, bgcolor: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e40af' }}>
                Penerapan Terisolasi Mutlak:
              </Typography>
              <Typography variant="caption" sx={{ color: '#1e3a8a', display: 'block', mt: 0.3 }}>
                Warna latar box dan persentase transparansi yang Anda atur di bawah ini <b>HANYA diterapkan secara dinamis dan real-time pada area kontainer box utama Portal Scanner</b>. Tidak mempengaruhi tema Portal Admin, Portal Guru, maupun elemen lainnya.
              </Typography>
            </Alert>

            <Grid container spacing={3}>
              {/* Color Picker & Hex Input */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={{ p: 2.5, bgcolor: '#f8fafc', borderRadius: 3, border: '1px solid #e2e8f0', height: '100%' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', mb: 1.5 }}>
                    1. Pilih Warna Latar Box (Box Background Color)
                  </Typography>
                  
                  <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 2 }}>
                    <Box
                      component="input"
                      type="color"
                      value={scannerBoxBgColor}
                      onChange={e => {
                        setScannerBoxBgColor(e.target.value);
                        handleSaveScannerBoxStyle(e.target.value, scannerBoxOpacity);
                      }}
                      sx={{
                        width: 56,
                        height: 44,
                        p: 0.5,
                        borderRadius: 2,
                        border: '1.5px solid #cbd5e1',
                        cursor: 'pointer',
                        bgcolor: '#ffffff'
                      }}
                    />
                    <TextField
                      size="small"
                      label="Kode Warna Hex"
                      value={scannerBoxBgColor}
                      onChange={e => setScannerBoxBgColor(e.target.value)}
                      placeholder="#ffffff"
                      sx={{ width: 180 }}
                    />
                  </Stack>

                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Klik kotak warna untuk membuka Color Picker sistem atau ketikkan kode Hex warna secara langsung (misal: #ffffff untuk Putih, #0f172a untuk Dark Slate).
                  </Typography>
                </Box>
              </Grid>

              {/* Opacity Slider */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={{ p: 2.5, bgcolor: '#f8fafc', borderRadius: 3, border: '1px solid #e2e8f0', height: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                      2. Persentase Transparansi (Opacity / Alpha)
                    </Typography>
                    <Chip
                      label={`${scannerBoxOpacity}%`}
                      color="primary"
                      size="small"
                      sx={{ fontWeight: 800, fontSize: '0.82rem' }}
                    />
                  </Box>

                  <Box sx={{ px: 1, py: 1 }}>
                    <Slider
                      value={scannerBoxOpacity}
                      onChange={(e, val) => {
                        const newOp = Array.isArray(val) ? val[0] : val;
                        setScannerBoxOpacity(newOp);
                      }}
                      onChangeCommitted={(e, val) => {
                        const newOp = Array.isArray(val) ? val[0] : val;
                        handleSaveScannerBoxStyle(scannerBoxBgColor, newOp);
                      }}
                      min={10}
                      max={100}
                      step={1}
                      valueLabelDisplay="auto"
                      valueLabelFormat={val => `${val}%`}
                      sx={{
                        color: 'primary.main',
                        height: 8,
                        '& .MuiSlider-thumb': {
                          width: 22,
                          height: 22,
                          bgcolor: '#ffffff',
                          border: '3px solid',
                          borderColor: 'primary.main'
                        }
                      }}
                    />
                  </Box>

                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Geser slider untuk menentukan seberapa transparan box utama Portal Scanner terhadap wallpaper/background layar (100% = Solid Pekat, 50% = Semi Transparan).
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Live Interactive Box Preview */}
            <Box sx={{ mt: 3, p: 2.5, bgcolor: '#0f172a', borderRadius: 3, border: '1px solid #1e293b' }}>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, display: 'block', mb: 1.5 }}>
                Pratinjau Hasil Tampilan Box Portal Scanner (Live Real-Time Preview):
              </Typography>

              <Box
                sx={{
                  p: 3,
                  borderRadius: 3,
                  bgcolor: (() => {
                    let c = scannerBoxBgColor;
                    const alpha = scannerBoxOpacity / 100;
                    if (!c || !c.startsWith('#')) return `rgba(255, 255, 255, ${alpha})`;
                    let hex = c.substring(1);
                    if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
                    if (hex.length !== 6) return `rgba(255, 255, 255, ${alpha})`;
                    const num = parseInt(hex, 16);
                    const r = (num >> 16) & 255;
                    const g = (num >> 8) & 255;
                    const b = num & 255;
                    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                  })(),
                  border: '1px solid rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(8px)',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: scannerBoxBgColor.toLowerCase() === '#ffffff' || scannerBoxBgColor.toLowerCase() === '#fff' ? '#0f172a' : 'inherit' }}>
                  Main Box Area Portal Scanner
                </Typography>
                <Typography variant="caption" sx={{ color: scannerBoxBgColor.toLowerCase() === '#ffffff' || scannerBoxBgColor.toLowerCase() === '#fff' ? '#475569' : 'inherit', opacity: 0.9 }}>
                  Warna: <b>{scannerBoxBgColor}</b> • Opacity: <b>{scannerBoxOpacity}%</b>
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2.5 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => handleSaveScannerBoxStyle(scannerBoxBgColor, scannerBoxOpacity)}
                  startIcon={<SaveIcon />}
                  sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', px: 3 }}
                >
                  Simpan Tampilan Box Scanner
                </Button>
              </Box>
            </Box>

            {/* Scanner-specific background wallpaper */}
            <Box sx={{ mt: 3, p: 2.5, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Foto Latar Belakang Khusus Portal Scanner:
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Unggah foto latar yang hanya tampil di Portal Scanner. Foto ini tidak akan mempengaruhi latar belakang portal Admin maupun Guru.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'center' }}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadIcon />}
                  sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
                >
                  {scannerBackgroundImage ? 'Ganti Foto Background Scanner' : 'Unggah Foto Background Scanner'}
                  <input
                    type="file"
                    hidden
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={handleScannerBackgroundUpload}
                  />
                </Button>
                {scannerBackgroundImage && (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={handleRemoveScannerBackground}
                    sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
                  >
                    Hapus Background Scanner
                  </Button>
                )}
              </Stack>
              {scannerBackgroundImage && (
                <Box sx={{ mt: 2, width: 220, height: 110, borderRadius: 2, overflow: 'hidden', border: '1px solid #cbd5e1', backgroundImage: `url(${scannerBackgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              )}
            </Box>
          </Paper>

          {/* C. Jenis Kode Kartu Pelajar (QR Code / Barcode) */}
          <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 3, bgcolor: '#ffffff' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <MonitorSmartphoneIcon color="action" />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Jenis Kode Kartu Pelajar (ID Card)</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Pilih format kode visual identitas yang akan dicetak pada kartu siswa dan dibaca oleh scanner.
            </Typography>

            <RadioGroup
              row
              value={settings.barcodeType || 'qrcode'}
              onChange={e => setSettings({ ...settings, barcodeType: e.target.value })}
            >
              <FormControlLabel
                value="qrcode"
                control={<Radio color="primary" />}
                label={<Typography variant="body2" sx={{ fontWeight: 'medium' }}>QR Code 2D (Direkomendasikan)</Typography>}
                sx={{ mr: 4 }}
              />
              <FormControlLabel
                value="barcode"
                control={<Radio color="primary" />}
                label={<Typography variant="body2" sx={{ fontWeight: 'medium' }}>Barcode 1D (Code 128)</Typography>}
              />
            </RadioGroup>

            <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'grey.100' }}>
              <Button variant="contained" color="primary" onClick={handleSave} sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}>
                Simpan Jenis Kode
              </Button>
            </Box>
          </Paper>

          {/* D. Pengaturan Suara Notifikasi */}
          <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 3, bgcolor: '#ffffff' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <VolumeUpIcon color="action" />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Pengaturan Suara Notifikasi Presensi</Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={4}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>Suara Presensi Sukses</Typography>
                  <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      value={settings.suaraSukses}
                      onChange={e => setSettings({ ...settings, suaraSukses: e.target.value })}
                    >
                      <MenuItem value="default1">Default 1 (Beep Pendek)</MenuItem>
                      <MenuItem value="default2">Default 2 (Buzz Panjang)</MenuItem>
                      <MenuItem value="custom">Custom Audio (Upload)</MenuItem>
                    </TextField>
                    <IconButton onClick={() => playPreview('sukses')} color="primary" sx={{ border: '1px solid', borderColor: 'primary.main' }}>
                      <PlayArrowIcon />
                    </IconButton>
                  </Stack>
                  {settings.suaraSukses === 'custom' && (
                    <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mt: 1 }}>
                      <Button variant="outlined" component="label" startIcon={<UploadIcon />} size="small" sx={{ textTransform: 'none', borderRadius: 2 }}>
                        Upload MP3/WAV
                        <input type="file" hidden accept="audio/mp3, audio/wav, audio/mpeg" onChange={e => handleAudioUpload(e, 'fileSuaraSukses')} />
                      </Button>
                      {settings.fileSuaraSukses && <Typography variant="caption" color="success.main">File terunggah ✓</Typography>}
                    </Stack>
                  )}
                </Box>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>Suara Presensi Gagal/Error</Typography>
                  <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      value={settings.suaraGagal}
                      onChange={e => setSettings({ ...settings, suaraGagal: e.target.value })}
                    >
                      <MenuItem value="default1">Default 1 (Beep Pendek)</MenuItem>
                      <MenuItem value="default2">Default 2 (Buzz Panjang)</MenuItem>
                      <MenuItem value="custom">Custom Audio (Upload)</MenuItem>
                    </TextField>
                    <IconButton onClick={() => playPreview('gagal')} color="error" sx={{ border: '1px solid', borderColor: 'error.main' }}>
                      <PlayArrowIcon />
                    </IconButton>
                  </Stack>
                  {settings.suaraGagal === 'custom' && (
                    <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mt: 1 }}>
                      <Button variant="outlined" component="label" startIcon={<UploadIcon />} size="small" sx={{ textTransform: 'none', borderRadius: 2 }}>
                        Upload MP3/WAV
                        <input type="file" hidden accept="audio/mp3, audio/wav, audio/mpeg" onChange={e => handleAudioUpload(e, 'fileSuaraGagal')} />
                      </Button>
                      {settings.fileSuaraGagal && <Typography variant="caption" color="success.main">File terunggah ✓</Typography>}
                    </Stack>
                  )}
                </Box>
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'grey.100', display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" color="primary" onClick={handleSave} sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}>
                Simpan Pengaturan Suara
              </Button>
            </Box>
          </Paper>
        </Stack>
      )}

      {/* Time settings per day */}
      {(categoryTab === 'jadwal') && (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }} gutterBottom>
          Konfigurasi Jam Presensi (Senin - Jumat)
        </Typography>
        <Divider sx={{ mb: 0 }} />
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
          <Tabs 
            value={activeDay} 
            onChange={(_, newValue) => setActiveDay(newValue)}
            indicatorColor="primary"
            textColor="primary"
            variant="scrollable"
            scrollButtons="auto"
          >
            {Object.keys(dayNames).map(day => (
              <Tab key={day} label={dayNames[day]} value={day} sx={{ textTransform: 'none', fontWeight: 'medium' }} />
            ))}
          </Tabs>
        </Box>

        <form onSubmit={handleSave}>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 6 }} >
               <Box sx={{ mb: 3 }}>
                   <Typography variant="subtitle2" sx={{ bgcolor: 'grey.50', px: 1.5, py: 0.5, borderRadius: 1, display: 'inline-block', mb: 2, fontWeight: 'medium' }}>
                     Validasi Kedatangan - {dayNames[activeDay]}
                   </Typography>
                   <Stack spacing={2.5}>
                     <TextField 
                       label="Mulai Presensi Datang" 
                       type="time" 
                       fullWidth 
                       size="small" 
                       slotProps={{ inputLabel: {  shrink: true  } }}
                       value={settings.schedule[activeDay]?.arrivalStart || ''} 
                       onChange={e => updateSchedule(activeDay, 'arrivalStart', e.target.value)} 
                     />
                     <TextField 
                       label="Batas Telat Datang" 
                       type="time" 
                       fullWidth 
                       size="small" 
                       slotProps={{ inputLabel: {  shrink: true  } }}
                       value={settings.schedule[activeDay]?.arrivalLate || ''} 
                       onChange={e => updateSchedule(activeDay, 'arrivalLate', e.target.value)} 
                     />
                     <TextField 
                       label="Batas Akhir Presensi Datang" 
                       type="time" 
                       fullWidth 
                       size="small" 
                       slotProps={{ inputLabel: {  shrink: true  } }}
                       value={settings.schedule[activeDay]?.arrivalEnd || ''} 
                       onChange={e => updateSchedule(activeDay, 'arrivalEnd', e.target.value)} 
                     />
                   </Stack>
               </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }} >
               <Box sx={{ mb: 3 }}>
                   <Typography variant="subtitle2" sx={{ bgcolor: 'grey.50', px: 1.5, py: 0.5, borderRadius: 1, display: 'inline-block', mb: 2, fontWeight: 'medium' }}>
                     Validasi Kepulangan - {dayNames[activeDay]}
                   </Typography>
                   <Stack spacing={2.5}>
                     <TextField 
                       label="Mulai Presensi Pulang" 
                       type="time" 
                       fullWidth 
                       size="small" 
                       slotProps={{ inputLabel: {  shrink: true  } }}
                       value={settings.schedule[activeDay]?.departureStart || ''} 
                       onChange={e => updateSchedule(activeDay, 'departureStart', e.target.value)} 
                     />
                     <TextField 
                       label="Batas Akhir Presensi Pulang" 
                       type="time" 
                       fullWidth 
                       size="small" 
                       slotProps={{ inputLabel: {  shrink: true  } }}
                       value={settings.schedule[activeDay]?.departureEnd || ''} 
                       onChange={e => updateSchedule(activeDay, 'departureEnd', e.target.value)} 
                     />
                   </Stack>
               </Box>
            </Grid>
          </Grid>

          <Box sx={{ pt: 3, mt: 1, borderTop: '1px solid', borderColor: 'grey.100', display: 'flex', justifyContent: 'flex-end' }}>
             <Button type="submit" variant="contained" color="primary" startIcon={<SaveIcon />}>
               Simpan Jadwal {dayNames[activeDay]}
             </Button>
          </Box>
        </form>
      </Paper>
      )}

    </Box>
  );
}
