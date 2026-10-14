import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

// MUI Imports
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Chip,
  Avatar,
  CircularProgress,
  Divider,
  Alert,
  IconButton,
  InputAdornment,
  Tooltip,
  Stack
} from '@mui/material';

// Icons
import {
  AssignmentInd as AssignmentIndIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Today as TodayIcon,
  EventNote as EventNoteIcon,
  Shield as ShieldIcon,
  VpnKey as KeyIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon
} from '@mui/icons-material';

import { safeStorage } from '../../safeStorage';
import { useAppTheme } from '../../contexts/ThemeModeContext';

interface TodayPiketItem {
  id: string;
  teacher_id: string;
  teacher_name: string;
  nip?: string;
  keterangan: string;
  username?: string;
}

export default function PiketLogin() {
  const { preset, isDark } = useAppTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [judulAplikasi, setJudulAplikasi] = useState('Sistem Presensi Siswa');
  const [judulPiket, setJudulPiket] = useState('Portal Guru Piket & Perizinan');
  const [logoBase64, setLogoBase64] = useState<string>('');

  // Info guru piket hari ini
  const [todaySchedules, setTodaySchedules] = useState<TodayPiketItem[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);

  const navigate = useNavigate();

  // Hari dan tanggal hari ini di Indonesia (WIB)
  const daysIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthsIndo = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const now = new Date();
  const currentDayName = daysIndo[now.getDay()];
  const formattedDate = `${currentDayName}, ${now.getDate()} ${monthsIndo[now.getMonth()]} ${now.getFullYear()}`;

  useEffect(() => {
    async function loadData() {
      try {
        const [settingsRes, schedRes] = await Promise.all([
          axios.get('/api/settings').catch(() => ({ data: {} })),
          axios.get('/api/piket-schedule').catch(() => ({ data: { data: [] } }))
        ]);

        if (settingsRes.data) {
          if (settingsRes.data.judul_aplikasi || settingsRes.data.judulAplikasi) {
            setJudulAplikasi(settingsRes.data.judul_aplikasi || settingsRes.data.judulAplikasi);
          }
          if (settingsRes.data.judul_piket || settingsRes.data.judulPiket) {
            setJudulPiket(settingsRes.data.judul_piket || settingsRes.data.judulPiket);
          }
          if (settingsRes.data.logoBase64) {
            setLogoBase64(settingsRes.data.logoBase64);
          }
        }

        if (schedRes.data && schedRes.data.data) {
          const allScheds = schedRes.data.data;
          const todayList = allScheds.filter(
            (s: any) => s.day_name.toLowerCase() === currentDayName.toLowerCase()
          );
          setTodaySchedules(todayList);
        }
      } catch (e) {
      } finally {
        setLoadingSchedules(false);
      }
    }

    loadData();
  }, [currentDayName]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!username.trim() || !password.trim()) {
      toast.error('Silakan isi username dan password');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/piket/login', {
        username: username.trim(),
        password: password.trim(),
        clientDay: currentDayName
      });

      if (res.data && res.data.success) {
        safeStorage.setItem('piket_auth', 'true');
        safeStorage.setItem('piket_token', res.data.token || '');
        safeStorage.setItem('token', res.data.token || '');
        if (res.data.user) {
          safeStorage.setJSON('piket_user', res.data.user);
        }
        safeStorage.setItem('piket_just_logged_in', 'true');
        toast.success(`Selamat bertugas, ${res.data.user?.name || 'Petugas Piket'}!`, { duration: 2500 });
        navigate('/piket/dashboard');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Gagal login. Periksa kembali username & password Anda.';
      setLoginError(msg);
      toast.error(msg, { duration: 2000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: isDark ? '#0b0f19' : '#f1f5f9',
        color: preset.textColorPrimary,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 2, sm: 3 }
      }}
    >
      {/* Main Container */}
      <Box sx={{ width: '100%', maxWidth: 460 }}>
        {/* Navigation & Date Badge */}
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 2 }}>
          <Chip
            icon={<TodayIcon sx={{ fontSize: '15px !important' }} />}
            label={formattedDate}
            size="small"
            color="primary"
            variant="outlined"
            sx={{
              fontWeight: 600,
              bgcolor: isDark ? 'rgba(30, 41, 59, 0.8)' : '#ffffff',
              color: preset.textColorPrimary,
              borderColor: preset.glassBorder
            }}
          />
        </Box>

        {/* Main Login Card */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 3.5,
            border: `1px solid ${preset.glassBorder}`,
            width: '100%',
            boxShadow: isDark ? '0 12px 32px rgba(0,0,0,0.5)' : '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
            bgcolor: isDark ? preset.cardBg : '#ffffff',
            color: preset.textColorPrimary
          }}
        >
        {/* Logo and Header */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          {logoBase64 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
              <img src={logoBase64} alt="Logo Sekolah" style={{ height: 60, objectFit: 'contain' }} />
            </Box>
          ) : (
            <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main', mx: 'auto', mb: 1.5 }}>
              <EventNoteIcon sx={{ fontSize: 32 }} />
            </Avatar>
          )}

          <Typography variant="h5" sx={{ fontWeight: 800, color: preset.textColorPrimary, letterSpacing: -0.5 }}>
            {judulPiket || 'Portal Guru Piket'}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5, color: preset.textColorSecondary }}>
            {judulAplikasi}
          </Typography>
        </Box>

        {/* Info Petugas Hari Ini */}
        <Box sx={{ mb: 3, p: 1.5, bgcolor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f8fafc', borderRadius: 2.5, border: `1px solid ${preset.glassBorder}` }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: preset.textColorSecondary, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TodayIcon sx={{ fontSize: 14, color: 'primary.main' }} /> Petugas Piket Hari {currentDayName}:
          </Typography>

          {loadingSchedules ? (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: preset.textColorSecondary }}>
              Memuat jadwal piket...
            </Typography>
          ) : todaySchedules.length === 0 ? (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic', color: preset.textColorSecondary }}>
              Belum ada guru piket yang terjadwal untuk hari {currentDayName}.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mt: 1 }}>
              {todaySchedules.map(item => (
                <Chip
                  key={item.id}
                  avatar={<Avatar sx={{ bgcolor: 'primary.main', color: '#ffffff', fontSize: '11px !important' }}>{item.teacher_name.charAt(0)}</Avatar>}
                  label={`${item.teacher_name} (${item.keterangan || 'Guru Piket'})`}
                  size="small"
                  variant="outlined"
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    bgcolor: isDark ? 'rgba(15, 23, 42, 0.8)' : '#ffffff',
                    color: preset.textColorPrimary,
                    borderColor: preset.glassBorder
                  }}
                />
              ))}
            </Box>
          )}
        </Box>

        {/* Error Alert if any */}
        {loginError && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2, fontSize: '0.85rem' }}>
            {loginError}
          </Alert>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin}>
          <Stack spacing={2.5}>
            <TextField
              label="Username atau NIP Guru"
              fullWidth
              required
              autoFocus
              value={username}
              onChange={e => {
                setUsername(e.target.value);
                setLoginError(null);
              }}
              placeholder="Contoh: 19800101... atau nama_guru"
              sx={{
                '& .MuiInputBase-root': {
                  bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
                  color: preset.textColorPrimary,
                },
                '& .MuiInputLabel-root': { color: preset.textColorSecondary }
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon fontSize="small" sx={{ color: preset.textColorSecondary }} />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 2 }
                }
              }}
            />

            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              required
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                setLoginError(null);
              }}
              placeholder="Masukkan password akun guru"
              sx={{
                '& .MuiInputBase-root': {
                  bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
                  color: preset.textColorPrimary,
                },
                '& .MuiInputLabel-root': { color: preset.textColorSecondary }
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <KeyIcon fontSize="small" sx={{ color: preset.textColorSecondary }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPassword(prev => !prev)} edge="end" sx={{ color: preset.textColorSecondary }}>
                        {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 2 }
                }
              }}
            />

            <Button
              variant="contained"
              type="submit"
              size="large"
              fullWidth
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <ShieldIcon />}
              sx={{
                py: 1.5,
                borderRadius: 2,
                fontWeight: 700,
                fontSize: '1rem',
                textTransform: 'none',
                boxShadow: 2,
                bgcolor: preset.primary,
                color: `${preset.contrastText} !important`
              }}
            >
              {loading ? 'Memvalidasi Jadwal...' : 'Masuk Portal Piket'}
            </Button>
          </Stack>
        </form>

        <Divider sx={{ my: 3, borderColor: preset.glassBorder }} />

        {/* Footer info */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" sx={{ display: 'block', color: preset.textColorSecondary }}>
            Hanya guru yang terjadwal piket pada hari <strong>{currentDayName}</strong> yang dapat mengakses portal.
          </Typography>
        </Box>
      </Paper>
      </Box>
    </Box>
  );
}
