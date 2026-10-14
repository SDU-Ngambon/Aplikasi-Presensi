import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Alert,
  CircularProgress,
  IconButton,
  Paper,
  InputAdornment
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Tune as TuneIcon,
  CloudSync as CloudSyncIcon,
  CheckCircle as CheckCircleIcon,
  WarningAmber as WarningAmberIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Folder as FolderIcon,
  InfoOutlined as InfoOutlinedIcon,
  Warning as WarningIcon,
  Dns as DnsIcon,
  Person as PersonIcon,
  VpnKey as VpnKeyIcon,
  Visibility,
  VisibilityOff,
  Speed as SpeedIcon
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAppTheme } from '../../contexts/ThemeModeContext';
import PerangkatKurikulumView from '../../components/perangkat/PerangkatKurikulumView';

export default function PerangkatAjarAdmin() {
  const { preset, isDark } = useAppTheme();
  const [adminTab, setAdminTab] = useState(0);

  // Nextcloud WebDAV Configuration State
  const [nextcloudStatus, setNextcloudStatus] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [basePath, setBasePath] = useState('/Perangkat_Ajar');

  const fetchNextcloudStatus = async () => {
    try {
      setIsTesting(true);
      const res = await axios.get('/api/perangkat/nextcloud/status');
      setNextcloudStatus(res.data);
      if (res.data.server_url && !serverUrl) {
        setServerUrl(res.data.server_url);
      }
      if (res.data.username && !username) {
        setUsername(res.data.username);
      }
      if (res.data.base_path && (!basePath || basePath === '/Perangkat_Ajar')) {
        setBasePath(res.data.base_path);
      }
    } catch (e: any) {
      toast.error('Gagal mengambil status Nextcloud WebDAV');
    } finally {
      setIsTesting(false);
    }
  };

  useEffect(() => {
    fetchNextcloudStatus();
  }, []);

  // Uji koneksi WebDAV (PROPFIND method) on-the-fly dengan kredensial form saat ini
  const handleTestConnection = async () => {
    if (!serverUrl.trim() || !username.trim() || !password.trim()) {
      toast.error('Harap lengkapi Server URL, Username, dan App Password sebelum menguji koneksi.');
      return;
    }

    try {
      setIsTesting(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const payload = {
        server_url: serverUrl.trim(),
        username: username.trim(),
        password: password.trim(),
        base_path: basePath.trim() || '/Perangkat_Ajar'
      };

      const res = await axios.post(
        '/api/perangkat/nextcloud/test',
        payload,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      setNextcloudStatus({
        configured: true,
        server_url: payload.server_url,
        username: payload.username,
        base_path: payload.base_path,
        ...res.data
      });

      if (res.data.success) {
        toast.success(res.data.message || 'Koneksi ke Nextcloud WebDAV berhasil!');
      } else {
        toast.error(res.data.message || 'Koneksi ke Nextcloud WebDAV gagal.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Gagal menguji koneksi Nextcloud WebDAV';
      toast.error(msg);
      setNextcloudStatus({
        success: false,
        message: msg,
        troubleshooting: err.response?.data?.troubleshooting
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Simpan konfigurasi server Nextcloud
  const handleSaveConfig = async () => {
    if (!serverUrl.trim() || !username.trim() || !password.trim()) {
      toast.error('Server URL, Username, dan App Password / Token wajib diisi.');
      return;
    }

    try {
      setIsSaving(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const payload = {
        server_url: serverUrl.trim(),
        username: username.trim(),
        password: password.trim(),
        base_path: basePath.trim() || '/Perangkat_Ajar'
      };

      const res = await axios.post(
        '/api/perangkat/nextcloud/config',
        payload,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      if (res.data.success) {
        toast.success(res.data.message || 'Konfigurasi Nextcloud WebDAV berhasil disimpan!');
        if (res.data.test) {
          setNextcloudStatus({
            configured: true,
            server_url: payload.server_url,
            username: payload.username,
            base_path: payload.base_path,
            ...res.data.test
          });
        } else {
          fetchNextcloudStatus();
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Gagal menyimpan konfigurasi Nextcloud');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* PAGE HEADER */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 900, color: preset.textColorPrimary, letterSpacing: -0.5 }}>
          Perencanaan Pembelajaran (Perangkat Ajar)
        </Typography>
        <Typography variant="body2" sx={{ color: preset.textColorSecondary, mt: 0.5 }}>
          Pusat kendali administrasi perangkat ajar, monitoring verifikasi guru, serta integrasi penyimpanan terpusat Nextcloud WebDAV API.
        </Typography>
      </Box>

      {/* TOP TABS */}
      <Box sx={{ borderBottom: 1, borderColor: preset.glassBorder, mb: 3 }}>
        <Tabs value={adminTab} onChange={(_, val) => setAdminTab(val)}>
          <Tab icon={<AssessmentIcon />} iconPosition="start" label="Laporan Progres & Telaah Guru" sx={{ fontWeight: 800 }} />
          <Tab icon={<TuneIcon />} iconPosition="start" label="Pengaturan Jenis Perangkat" sx={{ fontWeight: 800 }} />
          <Tab icon={<CloudSyncIcon />} iconPosition="start" label="INTEGRASI NEXTCLOUD WEBDAV" sx={{ fontWeight: 800 }} />
        </Tabs>
      </Box>

      {/* TAB 0: LAPORAN PROGRES GURU */}
      {adminTab === 0 && (
        <PerangkatKurikulumView initialTab={0} />
      )}

      {/* TAB 1: PENGATURAN JENIS PERANGKAT */}
      {adminTab === 1 && (
        <PerangkatKurikulumView initialTab={1} />
      )}

      {/* TAB 2: INTEGRASI NEXTCLOUD WEBDAV */}
      {adminTab === 2 && (
        <Box>
          <Grid container spacing={3}>
            {/* STATUS KONEKSI & PANDUAN */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Card sx={{ borderRadius: 3, border: `1px solid ${preset.glassBorder}`, bgcolor: isDark ? preset.cardBg : '#ffffff', height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: preset.textColorPrimary }}>
                      Status Server Nextcloud WebDAV
                    </Typography>
                    <IconButton size="small" onClick={fetchNextcloudStatus} disabled={isTesting} title="Muat Ulang Status">
                      <RefreshIcon />
                    </IconButton>
                  </Box>

                  {isTesting ? (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                      <CircularProgress size={32} />
                      <Typography variant="caption" sx={{ display: 'block', mt: 1, color: preset.textColorSecondary }}>
                        Menguji koneksi WebDAV (PROPFIND)...
                      </Typography>
                    </Box>
                  ) : nextcloudStatus?.success ? (
                    <Alert severity="success" icon={<CheckCircleIcon />} sx={{ borderRadius: 2, mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        Nextcloud WebDAV Terhubung!
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                        {nextcloudStatus.message}
                      </Typography>

                      <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#f0fdf4', borderRadius: 1.5, border: '1px solid #bbf7d0' }}>
                        <Typography variant="caption" sx={{ display: 'block', color: '#166534', fontWeight: 700 }}>
                          Host Server: <b>{nextcloudStatus.server_url || serverUrl}</b>
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', color: '#15803d', mt: 0.3 }}>
                          Akun Gateway: <b>{nextcloudStatus.username || username}</b>
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', color: '#166534', mt: 0.3 }}>
                          Folder Utama: <b>{nextcloudStatus.base_path || basePath}</b>
                        </Typography>
                        {nextcloudStatus.details?.responseTimeMs && (
                          <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <SpeedIcon sx={{ fontSize: 14, color: '#16a34a' }} />
                            <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 700 }}>
                              Latensi: {nextcloudStatus.details.responseTimeMs} ms
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Alert>
                  ) : (
                    <Box sx={{ mb: 2 }}>
                      <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ borderRadius: 2, mb: 1.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                          Belum Terhubung ke Nextcloud WebDAV
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block' }}>
                          {nextcloudStatus?.message || 'Server Nextcloud belum dikonfigurasi atau belum dapat dijangkau.'}
                        </Typography>
                      </Alert>

                      {nextcloudStatus?.troubleshooting && (
                        <Paper sx={{ p: 2, bgcolor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: '#b45309' }}>
                            <WarningIcon fontSize="small" />
                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                              Petunjuk Perbaikan:
                            </Typography>
                          </Box>
                          <Typography variant="caption" sx={{ color: '#92400e', display: 'block', lineHeight: 1.5 }}>
                            {nextcloudStatus.troubleshooting}
                          </Typography>
                        </Paper>
                      )}
                    </Box>
                  )}

                  {/* TOMBOL UJI KONEKSI DI BAGIAN STATUS */}
                  <Box sx={{ mt: 2, mb: 2.5 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="primary"
                      onClick={handleTestConnection}
                      disabled={isTesting}
                      startIcon={isTesting ? <CircularProgress size={16} /> : <CloudSyncIcon />}
                      sx={{ fontWeight: 800, borderRadius: 2, py: 1 }}
                    >
                      {isTesting ? 'Menguji Koneksi...' : 'Uji Koneksi (PROPFIND Method)'}
                    </Button>
                  </Box>

                  {/* PANDUAN APP PASSWORD NEXTCLOUD */}
                  <Box sx={{ p: 2, bgcolor: '#f0f9ff', borderRadius: 2, border: '1px solid #bae6fd', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: '#0369a1' }}>
                      <InfoOutlinedIcon fontSize="small" />
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        Panduan App Password / Token Nextcloud
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: '#0c4a6e', display: 'block', mb: 1, lineHeight: 1.5 }}>
                      Demi keamanan sistem, <b>JANGAN</b> gunakan kata sandi login utama. Buat App Password khusus untuk aplikasi Presensi di Nextcloud:
                    </Typography>
                    <Box component="ol" sx={{ pl: 2, m: 0, color: '#0c4a6e', fontSize: '11px', lineHeight: 1.6 }}>
                      <li>Masuk ke Nextcloud sebagai Admin / Gateway.</li>
                      <li>Buka <b>Pengaturan Pribadi (Personal Settings) &rarr; Keamanan (Security)</b>.</li>
                      <li>Di bagian <i>Perangkat &amp; Sesi (Devices &amp; Sessions)</i>, ketik nama aplikasi (misal: <code>Presensi-Gateway</code>).</li>
                      <li>Klik <b>Buat kata sandi baru (Create new app password)</b>.</li>
                      <li>Salin token yang dihasilkan dan tempelkan ke kolom App Password di bawah.</li>
                    </Box>
                  </Box>

                  {/* INFO STRUKTUR DIREKTORI OTOMATIS */}
                  <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
                      Struktur Hierarki Folder Otomatis WebDAV:
                    </Typography>
                    <Box sx={{ fontFamily: 'monospace', fontSize: '11px', color: '#334155', lineHeight: 1.6 }}>
                      📁 <b>{basePath || '/Perangkat_Ajar'}</b><br />
                      &nbsp;&nbsp;└── 📁 <b>[Tahun Ajaran]</b> (misal: 2025-2026)<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── 📁 <b>Semester [Semester]</b> (misal: Semester Ganjil)<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── 📁 <b>[Nama Guru]</b><br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── 📁 <b>[Mata Pelajaran]</b><br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── 📄 <b>rpp_modul_ajar.pdf</b>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* FORM KONFIGURASI SERVER NEXTCLOUD */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
                    Konfigurasi Server Nextcloud
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
                    Masukkan detail koneksi Nextcloud WebDAV API untuk penyimpanan lokal dokumen perangkat ajar sekolah.
                  </Typography>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    {/* INPUT 1: NEXTCLOUD SERVER URL */}
                    <TextField
                      label="Nextcloud Server URL"
                      required
                      fullWidth
                      size="small"
                      placeholder="Contoh: http://192.168.1.100 atau https://nextcloud.sekolah.sch.id"
                      value={serverUrl}
                      onChange={e => setServerUrl(e.target.value)}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <DnsIcon fontSize="small" sx={{ color: '#64748b' }} />
                            </InputAdornment>
                          )
                        }
                      }}
                      helperText="Alamat IP LAN atau domain Nextcloud server di sekolah (gunakan awalan http:// atau https://)"
                    />

                    {/* INPUT 2: USERNAME NEXTCLOUD */}
                    <TextField
                      label="Username Nextcloud"
                      required
                      fullWidth
                      size="small"
                      placeholder="Contoh: admin atau gateway_presensi"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <PersonIcon fontSize="small" sx={{ color: '#64748b' }} />
                            </InputAdornment>
                          )
                        }
                      }}
                      helperText="Akun Nextcloud yang bertindak sebagai gateway penyimpanan perangkat ajar"
                    />

                    {/* INPUT 3: APP PASSWORD / TOKEN NEXTCLOUD */}
                    <TextField
                      label="App Password / Token Nextcloud"
                      required
                      type={showPassword ? 'text' : 'password'}
                      fullWidth
                      size="small"
                      placeholder="Masukkan App Password / Token yang digenerate di Nextcloud"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <VpnKeyIcon fontSize="small" sx={{ color: '#64748b' }} />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                size="small"
                                onClick={() => setShowPassword(!showPassword)}
                                edge="end"
                              >
                                {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                              </IconButton>
                            </InputAdornment>
                          )
                        }
                      }}
                      helperText="Token rahasia perangkat dari Nextcloud (bukan password login utama demi keamanan data)"
                    />

                    {/* INPUT 4: BASE FOLDER PATH */}
                    <TextField
                      label="Base Folder Path"
                      required
                      fullWidth
                      size="small"
                      placeholder="Contoh: /Perangkat_Ajar"
                      value={basePath}
                      onChange={e => setBasePath(e.target.value)}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <FolderIcon fontSize="small" sx={{ color: '#64748b' }} />
                            </InputAdornment>
                          )
                        }
                      }}
                      helperText="Direktori root tempat seluruh dokumen perangkat ajar disimpan (otomatis dibuat jika belum ada)"
                    />
                  </Box>

                  {/* KOTAK INTEGRASI PROXY PREVIEW */}
                  <Box sx={{ mt: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
                      Keamanan &amp; Streaming Pratinjau (REST API Proxy)
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#475569', display: 'block', lineHeight: 1.5 }}>
                      Aplikasi menggunakan endpoint proxy internal (<code>GET /api/v1/perangkat/preview/:id</code>). 
                      Kepala Sekolah dan Guru dapat membaca pratinjau PDF langsung di dalam browser pada kecepatan jaringan lokal tanpa perlu login manual ke antarmuka Nextcloud. Kredensial server tetap terlindungi secara aman di backend.
                    </Typography>
                  </Box>

                  {/* TOMBOL AKSI */}
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 3 }}>
                    <Button
                      variant="outlined"
                      color="inherit"
                      onClick={handleTestConnection}
                      disabled={isTesting}
                      startIcon={isTesting ? <CircularProgress size={16} /> : undefined}
                      sx={{ fontWeight: 700, borderRadius: 2 }}
                    >
                      {isTesting ? 'Menguji PROPFIND...' : 'Uji Koneksi'}
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                      disabled={isSaving}
                      onClick={handleSaveConfig}
                      sx={{ fontWeight: 800, borderRadius: 2 }}
                    >
                      {isSaving ? 'Menyimpan...' : 'Simpan Konfigurasi Server'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
}
