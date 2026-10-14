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
  CircularProgress,
  Alert,
  IconButton,
  InputAdornment,
  Stack,
  Chip,
  keyframes
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';

// Icons
import {
  School as SchoolIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Today as TodayIcon,
  Person as PersonIcon,
  VpnKey as KeyIcon
} from '@mui/icons-material';

import { safeStorage } from '../../safeStorage';
import { useAppTheme } from '../../contexts/ThemeModeContext';

// Keyframe Animations for Futuristic Logo
const logoEntrance = keyframes`
  0% {
    opacity: 0;
    transform: scale(0.65) translateY(14px);
    filter: blur(6px);
  }
  60% {
    opacity: 1;
    transform: scale(1.05) translateY(-2px);
    filter: blur(0px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
    filter: blur(0px);
  }
`;

const logoGlowPulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 16px 2px var(--glow-light, rgba(16, 185, 129, 0.25)), 0 0 0 1px var(--glow-border, rgba(16, 185, 129, 0.2));
  }
  50% {
    box-shadow: 0 0 30px 6px var(--glow-heavy, rgba(16, 185, 129, 0.45)), 0 0 0 3px var(--glow-border-heavy, rgba(16, 185, 129, 0.35));
  }
`;

const orbitSpin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

export default function GuruLogin() {
  const theme = useTheme();
  const { preset, isDark } = useAppTheme();
  // Safe default theme color fallbacks
  const primaryColor = preset.primary || theme.palette.primary?.main || '#059669';
  const primaryDark = theme.palette.primary?.dark || primaryColor;
  const secondaryColor = preset.secondary || theme.palette.secondary?.main || '#3b82f6';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [judulAplikasi, setJudulAplikasi] = useState('Sistem Presensi Siswa');
  const [judulGuruPortal, setJudulGuruPortal] = useState('Akses Data Guru');
  const [subjudulGuruPortal, setSubjudulGuruPortal] = useState('Portal Kehadiran, Piket & Akun Guru');
  const [websiteName, setWebsiteName] = useState('SMK Negeri');
  const [logoBase64, setLogoBase64] = useState<string>('');

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
    // If already logged in, redirect to teacher portal
    if (safeStorage.getItem('guru_auth') === 'true') {
      navigate('/guru/portal', { replace: true });
      return;
    }

    async function loadSettings() {
      try {
        const res = await axios.get('/api/settings').catch(() => ({ data: {} }));
        if (res.data) {
          if (res.data.judul_aplikasi || res.data.judulAplikasi) {
            setJudulAplikasi(res.data.judul_aplikasi || res.data.judulAplikasi);
          }
          if (res.data.judul_guru_portal || res.data.judulGuruPortal) {
            setJudulGuruPortal(res.data.judul_guru_portal || res.data.judulGuruPortal);
          }
          if (res.data.subjudul_guru_portal || res.data.subjudulGuruPortal) {
            setSubjudulGuruPortal(res.data.subjudul_guru_portal || res.data.subjudulGuruPortal);
          }
          if (res.data.websiteName) {
            setWebsiteName(res.data.websiteName);
          }
          if (res.data.logoBase64) {
            setLogoBase64(res.data.logoBase64);
          }

          // Read & sync theme settings from admin
          const sPreset = res.data.themePreset || res.data.theme_preset;
          const sColor = res.data.themeColor || res.data.theme_color;
          if (sPreset) {
            const currentPreset = safeStorage.getItem('appThemePreset', '');
            const currentColor = safeStorage.getItem('appThemeColor', '');
            if (currentPreset !== sPreset || currentColor !== (sColor || '')) {
              safeStorage.setItem('appThemePreset', sPreset);
              if (sColor) safeStorage.setItem('appThemeColor', sColor);
              window.dispatchEvent(new Event('themeChanged'));
            }
          }
        }
      } catch (e) {}
    }
    loadSettings();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setLoginError('Silakan isi username/NIP dan password akun guru');
      return;
    }

    setLoading(true);
    setLoginError(null);

    try {
      const res = await axios.post('/api/guru/login', {
        username: username.trim(),
        password: password.trim()
      });

      if (res.data && res.data.success) {
        safeStorage.setItem('guru_auth', 'true');
        safeStorage.setItem('guru_token', res.data.token || 'guru_session');
        safeStorage.setItem('token', res.data.token || 'guru_session');
        safeStorage.setJSON('guru_user', res.data.teacher);
        safeStorage.setItem('guru_just_logged_in', 'true');

        toast.dismiss();
        navigate('/guru/portal', { replace: true });
      } else {
        setLoginError(res.data.error || 'Autentikasi gagal');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || 'Gagal terhubung ke server';
      setLoginError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      id="guru-login-page"
      sx={{
        minHeight: '100vh',
        bgcolor: isDark ? '#0b0f19' : '#f8fafc',
        backgroundImage: isDark
          ? `radial-gradient(at 0% 0%, rgba(16, 185, 129, 0.12) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(59, 130, 246, 0.12) 0px, transparent 50%)`
          : `radial-gradient(at 0% 0%, ${alpha(primaryColor, 0.08)} 0px, transparent 50%), radial-gradient(at 100% 100%, ${alpha(secondaryColor, 0.08)} 0px, transparent 50%)`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        p: { xs: 2, sm: 2.5 }
      }}
    >
      {/* Main Container */}
      <Box sx={{ width: '100%', maxWidth: 460 }}>
        {/* Card Login */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.75, sm: 4 },
            borderRadius: { xs: 4, sm: 3.5 },
            border: `1px solid ${preset.glassBorder}`,
            boxShadow: isDark
              ? '0 12px 32px rgba(0,0,0,0.5)'
              : '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
            bgcolor: isDark ? preset.cardBg : '#ffffff',
            color: preset.textColorPrimary
          }}
        >
          {/* Header & Logo */}
          <Box sx={{ textAlign: 'center', mb: { xs: 2.5, sm: 3 } }}>
            {/* Logo with Futuristic Orbit Ring & Pulse Entrance */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: { xs: 2, sm: 1.5 } }}>
              <Box
                sx={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: `${logoEntrance} 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`
                }}
              >
                {/* Thin Futuristic Orbit Ring */}
                <Box
                  sx={{
                    position: 'absolute',
                    inset: -5,
                    borderRadius: logoBase64 ? '18px' : '20px',
                    background: `conic-gradient(from 0deg, ${primaryColor}, ${secondaryColor}, ${alpha(primaryColor, 0.15)}, ${primaryColor})`,
                    animation: `${orbitSpin} 7s linear infinite`,
                    opacity: 0.65,
                    filter: 'blur(1.5px)'
                  }}
                />

                {/* Logo Main Container with Soft Glow */}
                <Box
                  sx={{
                    position: 'relative',
                    zIndex: 1,
                    borderRadius: logoBase64 ? '14px' : '16px',
                    bgcolor: isDark ? 'rgba(30, 41, 59, 0.9)' : '#ffffff',
                    p: logoBase64 ? 0.5 : 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: `${logoGlowPulse} 3.5s ease-in-out infinite`,
                    '--glow-light': alpha(primaryColor, 0.25),
                    '--glow-border': alpha(primaryColor, 0.2),
                    '--glow-heavy': alpha(primaryColor, 0.45),
                    '--glow-border-heavy': alpha(primaryColor, 0.35)
                  }}
                >
                  {logoBase64 ? (
                    <img
                      src={logoBase64}
                      alt="Logo Sekolah"
                      style={{
                        height: 60,
                        width: 60,
                        objectFit: 'contain',
                        borderRadius: 12,
                        display: 'block'
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: { xs: 60, sm: 58 },
                        height: { xs: 60, sm: 58 },
                        borderRadius: { xs: 3.5, sm: 3 },
                        bgcolor: alpha(primaryColor, 0.12),
                        color: primaryColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `1px solid ${alpha(primaryColor, 0.25)}`
                      }}
                    >
                      <SchoolIcon sx={{ fontSize: { xs: 36, sm: 34 } }} />
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>

            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                color: preset.textColorPrimary,
                letterSpacing: -0.3,
                fontSize: { xs: '1.2rem', sm: '1.25rem' }
              }}
            >
              {judulGuruPortal}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: primaryColor,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                display: 'block',
                mt: 0.3,
                fontSize: { xs: '0.725rem', sm: '0.75rem' }
              }}
            >
              {subjudulGuruPortal}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: preset.textColorSecondary,
                mt: 0.5,
                fontSize: { xs: '0.8125rem', sm: '0.875rem' }
              }}
            >
              {websiteName} • {judulAplikasi}
            </Typography>

            {/* Date Badge */}
            <Chip
              icon={<TodayIcon sx={{ fontSize: '15px !important', color: `${primaryColor} !important` }} />}
              label={formattedDate}
              size="small"
              sx={{
                mt: 1.5,
                bgcolor: alpha(primaryColor, 0.12),
                color: primaryColor,
                border: `1px solid ${alpha(primaryColor, 0.25)}`,
                fontWeight: 700,
                fontSize: '0.75rem'
              }}
            />
          </Box>

          {loginError && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: { xs: 2.5, sm: 2 } }}>
              {loginError}
            </Alert>
          )}

          {/* Form Login */}
          <form onSubmit={handleLogin}>
            <Stack spacing={{ xs: 2, sm: 2.5 }}>
              <TextField
                id="guru-username"
                label="Username atau NIP Guru"
                fullWidth
                size="small"
                autoComplete="username"
                placeholder="Contoh: guru.andi atau 1980..."
                value={username}
                onChange={e => setUsername(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: { xs: 2.5, sm: 2 },
                    fontSize: { xs: '0.9375rem', sm: '0.875rem' },
                    minHeight: { xs: 46, sm: 40 },
                    bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
                    color: preset.textColorPrimary,
                    transition: 'all 0.2s ease',
                    '&.Mui-focused': {
                      boxShadow: `0 0 0 3px ${alpha(primaryColor, 0.18)}`
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: primaryColor
                    }
                  },
                  '& .MuiInputLabel-root': { color: preset.textColorSecondary },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: primaryColor
                  }
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon fontSize="small" sx={{ color: preset.textColorSecondary }} />
                      </InputAdornment>
                    )
                  }
                }}
              />

              <TextField
                id="guru-password"
                label="Password Akun Guru"
                fullWidth
                size="small"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Masukkan password akun guru"
                value={password}
                onChange={e => setPassword(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: { xs: 2.5, sm: 2 },
                    fontSize: { xs: '0.9375rem', sm: '0.875rem' },
                    minHeight: { xs: 46, sm: 40 },
                    bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
                    color: preset.textColorPrimary,
                    transition: 'all 0.2s ease',
                    '&.Mui-focused': {
                      boxShadow: `0 0 0 3px ${alpha(primaryColor, 0.18)}`
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: primaryColor
                    }
                  },
                  '& .MuiInputLabel-root': { color: preset.textColorSecondary },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: primaryColor
                  }
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
                        <IconButton
                          size="small"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                          sx={{ p: { xs: 0.75, sm: 0.5 }, color: preset.textColorSecondary }}
                        >
                          {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />

              <Button
                id="guru-btn-login"
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                sx={{
                  mt: { xs: 0.5, sm: 1 },
                  py: { xs: 1.4, sm: 1.2 },
                  minHeight: { xs: 48, sm: 42 },
                  fontWeight: 700,
                  fontSize: { xs: '0.9375rem', sm: '0.875rem' },
                  textTransform: 'none',
                  borderRadius: { xs: 2.5, sm: 2.5 },
                  boxShadow: `0 4px 14px ${alpha(primaryColor, 0.3)}`,
                  bgcolor: primaryColor,
                  color: `${preset.contrastText} !important`,
                  '&:hover': { bgcolor: primaryDark },
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:active': { transform: 'scale(0.98)' }
                }}
              >
                {loading ? <CircularProgress size={22} color="inherit" /> : 'Masuk Akses Data Guru'}
              </Button>
            </Stack>
          </form>

          {/* Guidance note */}
          <Box sx={{ mt: { xs: 2.5, sm: 3 }, pt: 2, borderTop: `1px solid ${preset.glassBorder}`, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: preset.textColorSecondary, display: 'block', lineHeight: 1.4, fontSize: { xs: '0.725rem', sm: '0.75rem' } }}>
              Akses login diperoleh dari <b>Akun Guru</b> yang didaftarkan oleh administrator sekolah. Jika lupa password, hubungi operator/admin presensi.
            </Typography>
          </Box>
        </Paper>

        {/* Footer info */}
        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 3, color: preset.textColorSecondary, fontSize: { xs: '0.725rem', sm: '0.75rem' } }}>
          Sistem Presensi & Kehadiran Guru KBM © {now.getFullYear()}
        </Typography>
      </Box>
    </Box>
  );
}

