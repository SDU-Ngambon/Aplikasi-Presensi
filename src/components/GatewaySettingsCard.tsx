import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Stack,
  Divider,
  Alert,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  InputAdornment,
  IconButton,
  Grid,
  Chip
} from '@mui/material';
import {
  Save as SaveIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  Wifi as WifiIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Refresh as RefreshIcon,
  Router as RouterIcon,
  Security as SecurityIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';

export const GATEWAY_PROVIDERS = [
  {
    id: 'fonnte',
    name: 'Fonnte (Rekomendasi)',
    defaultUrl: 'https://api.fonnte.com/send',
    docs: 'https://fonnte.com',
    desc: 'Gateway WhatsApp handal dan mudah digunakan di Indonesia.'
  },
  {
    id: 'wablas',
    name: 'Wablas Gateway',
    defaultUrl: 'https://api.wablas.com/api/send-message',
    docs: 'https://wablas.com',
    desc: 'Mendukung multi-device dengan endpoint pengiriman cepat.'
  },
  {
    id: 'starsender',
    name: 'Starsender',
    defaultUrl: 'https://api.starsender.online/api/send',
    docs: 'https://starsender.online',
    desc: 'Gateway lokal untuk notifikasi dan OTP WhatsApp.'
  },
  {
    id: 'custom',
    name: 'Custom Gateway / Webhook Mandiri',
    defaultUrl: '',
    docs: '',
    desc: 'Gunakan URL endpoint API WhatsApp server lokal atau mandiri Anda.'
  }
];

interface GatewaySettingsCardProps {
  onSaved?: () => void;
  initialSettings?: any;
}

export default function GatewaySettingsCard({ onSaved, initialSettings }: GatewaySettingsCardProps) {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Gateway credentials state
  const [waProvider, setWaProvider] = useState('fonnte');
  const [waApiUrl, setWaApiUrl] = useState('https://api.fonnte.com/send');
  const [waApiKey, setWaApiKey] = useState('');
  const [waApiSecret, setWaApiSecret] = useState('');
  const [waSenderPhone, setWaSenderPhone] = useState('');

  // Test connection state
  const [testPhone, setTestPhone] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    async function loadGatewaySettings() {
      try {
        const res = await axios.get('/api/settings');
        const d = res.data || {};
        if (d.waProvider || d.wa_provider) setWaProvider(d.waProvider || d.wa_provider);
        if (d.waApiUrl || d.wa_api_url) setWaApiUrl(d.waApiUrl || d.wa_api_url);
        if (d.waApiKey || d.wa_api_key) setWaApiKey(d.waApiKey || d.wa_api_key);
        if (d.waApiSecret || d.wa_api_secret) setWaApiSecret(d.waApiSecret || d.wa_api_secret);
        if (d.waSenderPhone || d.wa_sender_phone) setWaSenderPhone(d.waSenderPhone || d.wa_sender_phone);
      } catch (e) {
        console.error(e);
      }
    }

    if (initialSettings) {
      if (initialSettings.waProvider || initialSettings.wa_provider) setWaProvider(initialSettings.waProvider || initialSettings.wa_provider);
      if (initialSettings.waApiUrl || initialSettings.wa_api_url) setWaApiUrl(initialSettings.waApiUrl || initialSettings.wa_api_url);
      if (initialSettings.waApiKey || initialSettings.wa_api_key) setWaApiKey(initialSettings.waApiKey || initialSettings.wa_api_key);
      if (initialSettings.waApiSecret || initialSettings.wa_api_secret) setWaApiSecret(initialSettings.waApiSecret || initialSettings.wa_api_secret);
      if (initialSettings.waSenderPhone || initialSettings.wa_sender_phone) setWaSenderPhone(initialSettings.waSenderPhone || initialSettings.wa_sender_phone);
    } else {
      loadGatewaySettings();
    }
  }, [initialSettings]);

  // When provider changes, autofill default URL if not custom
  const handleProviderChange = (newProvider: string) => {
    setWaProvider(newProvider);
    const p = GATEWAY_PROVIDERS.find(x => x.id === newProvider);
    if (p && p.defaultUrl) {
      setWaApiUrl(p.defaultUrl);
    }
  };

  const handleSaveGateway = async () => {
    if (!waApiKey.trim()) {
      toast.error('API Key / Token WhatsApp wajib diisi');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/settings', {
        waProvider,
        wa_provider: waProvider,
        waApiUrl,
        wa_api_url: waApiUrl,
        waApiKey: waApiKey.trim(),
        wa_api_key: waApiKey.trim(),
        waApiSecret: waApiSecret.trim(),
        wa_api_secret: waApiSecret.trim(),
        waSenderPhone: waSenderPhone.trim(),
        wa_sender_phone: waSenderPhone.trim()
      });

      toast.success('Pengaturan Gateway WhatsApp berhasil disimpan!');
      if (onSaved) onSaved();
    } catch (e: any) {
      toast.error('Gagal menyimpan gateway: ' + (e.response?.data?.error || e.message));
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!waApiKey.trim()) {
      toast.error('Isi API Key / Token WhatsApp terlebih dahulu');
      return;
    }
    if (!testPhone.trim()) {
      toast.error('Masukkan nomor WhatsApp penerima uji coba (misal: 08123456789)');
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const res = await axios.post('/api/settings/test-wa', {
        phone: testPhone.trim(),
        message: `*Tes Koneksi Gateway WhatsApp Berhasil!*\n\nSistem Presensi Sekolah berhasil terhubung dengan Gateway ${waProvider.toUpperCase()}.\nEndpoint: ${waApiUrl}\nWaktu Tes: ${new Date().toLocaleString('id-ID')} WIB`,
        provider: waProvider,
        url: waApiUrl,
        apiKey: waApiKey.trim(),
        apiSecret: waApiSecret.trim()
      });

      if (res.data && res.data.success) {
        setTestResult({
          success: true,
          message: 'Koneksi berhasil! Pesan WhatsApp tes telah terkirim ke ' + testPhone
        });
        toast.success('Koneksi Gateway WhatsApp Berhasil!');
      } else {
        setTestResult({
          success: false,
          message: res.data?.error || 'Gagal mengirim pesan tes. Cek token/endpoint Anda.'
        });
        toast.error('Uji coba koneksi gagal.');
      }
    } catch (e: any) {
      const errMsg = e.response?.data?.error || e.message || 'Gagal terhubung ke API gateway';
      setTestResult({
        success: false,
        message: errMsg
      });
      toast.error('Gagal: ' + errMsg);
    } finally {
      setTesting(false);
    }
  };

  const currentProviderObj = GATEWAY_PROVIDERS.find(p => p.id === waProvider);

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
                bgcolor: '#ecfdf5',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #a7f3d0'
              }}
            >
              <RouterIcon fontSize="medium" />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Atur Gateway WhatsApp
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Konfigurasi utama kredensial provider WhatsApp API yang digunakan seluruh sistem presensi.
              </Typography>
            </Box>
          </Box>
          <Chip
            icon={<CheckCircleIcon sx={{ fontSize: '1rem !important' }} />}
            label={waApiKey ? 'Kredensial Terisi' : 'Belum Dikonfigurasi'}
            color={waApiKey ? 'success' : 'default'}
            variant="outlined"
            size="small"
            sx={{ fontWeight: 700 }}
          />
        </Box>

        <Divider sx={{ my: 2.5 }} />

        {/* Form Fields: Penyedia, Endpoint, dan Token */}
        <Stack spacing={3}>
          {/* 1. Penyedia Gateway WhatsApp */}
          <FormControl fullWidth size="small">
            <InputLabel id="provider-select-label">Penyedia Gateway WhatsApp</InputLabel>
            <Select
              labelId="provider-select-label"
              value={waProvider}
              label="Penyedia Gateway WhatsApp"
              onChange={(e) => handleProviderChange(e.target.value)}
            >
              {GATEWAY_PROVIDERS.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {p.name}
                    </Typography>
                    {p.docs && (
                      <Typography variant="caption" color="primary.main" sx={{ ml: 2 }}>
                        {p.docs.replace('https://', '')}
                      </Typography>
                    )}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {currentProviderObj && (
            <Alert severity="info" sx={{ py: 0.5, borderRadius: 2 }}>
              <Typography variant="caption" sx={{ display: 'block' }}>
                {currentProviderObj.desc}{' '}
                {currentProviderObj.docs && (
                  <a
                    href={currentProviderObj.docs}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'underline' }}
                  >
                    Buka Website Provider <OpenInNewIcon sx={{ fontSize: 11, verticalAlign: 'middle' }} />
                  </a>
                )}
              </Typography>
            </Alert>
          )}

          {/* 2. WhatsApp API Endpoint URL */}
          <TextField
            label="WhatsApp API Endpoint URL"
            value={waApiUrl}
            onChange={(e) => setWaApiUrl(e.target.value)}
            fullWidth
            size="small"
            helperText="URL endpoint API gateway untuk pengiriman pesan teks"
            placeholder="https://api.fonnte.com/send"
          />

          {/* 3. API Key / Token WhatsApp */}
          <TextField
            label="API Key / Token WhatsApp"
            type={showApiKey ? 'text' : 'password'}
            value={waApiKey}
            onChange={(e) => setWaApiKey(e.target.value)}
            fullWidth
            size="small"
            placeholder="Masukkan token atau API Key dari akun gateway Anda"
            helperText="Token rahasia yang diberikan oleh penyedia gateway WhatsApp"
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setShowApiKey(!showApiKey)}
                      edge="end"
                    >
                      {showApiKey ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                )
              }
            }}
          />

          {/* Optional API Secret (for Wablas or custom providers) */}
          {(waProvider === 'wablas' || waProvider === 'custom') && (
            <TextField
              label="API Secret / Device Key (Opsional)"
              type="password"
              value={waApiSecret}
              onChange={(e) => setWaApiSecret(e.target.value)}
              fullWidth
              size="small"
              placeholder="Jika penyedia Anda memerlukan device secret"
            />
          )}

          {/* 4. Nomor Pengirim (Opsional) */}
          <TextField
            label="Nomor Pengirim (Opsional)"
            value={waSenderPhone}
            onChange={(e) => setWaSenderPhone(e.target.value)}
            fullWidth
            size="small"
            placeholder="Contoh: 08123456789 atau 628123456789"
            helperText="Nomor WhatsApp akun pengirim (opsional, untuk penyedia gateway yang mensyaratkan sender phone / device ID)"
          />

          {/* Save Button */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSaveGateway}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
              sx={{ px: 3, py: 1, borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
            >
              {loading ? 'Menyimpan Gateway...' : 'Simpan Pengaturan Gateway'}
            </Button>
          </Box>
        </Stack>
      </Paper>

      {/* Uji Koneksi Gateway Card */}
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2.5, bgcolor: '#ffffff' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <WifiIcon color="primary" />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Uji Koneksi Gateway WhatsApp
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Kirimkan pesan uji coba untuk memverifikasi apakah Token dan Endpoint Gateway terhubung dengan benar ke nomor WhatsApp Anda.
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2} sx={{ alignItems: 'flex-start' }}>
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField
              label="Nomor WhatsApp Penerima Uji Coba"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="Contoh: 08123456789 atau 628123456789"
              fullWidth
              size="small"
              helperText="Pastikan nomor terdaftar aktif di WhatsApp"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Button
              variant="contained"
              color="success"
              fullWidth
              disabled={testing || !waApiKey.trim()}
              onClick={handleTestConnection}
              startIcon={testing ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
              sx={{ height: 40, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
            >
              {testing ? 'Menguji...' : 'Uji Koneksi Sekarang'}
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
                {testResult.success ? 'Uji Koneksi Berhasil' : 'Uji Koneksi Gagal'}
              </Typography>
              <Typography variant="body2">{testResult.message}</Typography>
            </Alert>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
