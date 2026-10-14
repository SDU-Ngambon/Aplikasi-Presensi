import React, { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { safeStorage } from '../safeStorage';
import { useAppTheme } from '../contexts/ThemeModeContext';
import { getSafeImageUrl, handleImageError, DEFAULT_SCHOOL_LOGO_SVG } from '../utils/imageUtils';

// MUI Imports
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  CircularProgress,
  IconButton,
  InputAdornment,
  Alert,
  Stack,
  alpha
} from '@mui/material';

// Icons
import {
  Visibility,
  VisibilityOff,
  Lock as LockIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  QrCodeScanner as ScannerIcon,
  School as SchoolIcon
} from '@mui/icons-material';

export default function Login() {
  const navigate = useNavigate();
  const { preset, isDark } = useAppTheme();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [schoolSettings, setSchoolSettings] = useState<{
    websiteName?: string;
    judul_aplikasi?: string;
    logoBase64?: string;
  }>({});

  useEffect(() => {
    // Ambil info nama sekolah dan logo dari backend untuk branding halaman login
    axios.get('/api/settings')
      .then(res => {
        if (res.data) {
          setSchoolSettings(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Silakan isi username dan password admin');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await axios.post('/api/admin/login', { 
        username: username.trim(), 
        password: password.trim() 
      });

      if (res.data && res.data.success) {
        const adminUser = res.data.user || {
          id: 'admin_id',
          username: res.data.username || username.trim(),
          role: 'admin',
          name: 'Administrator'
        };

        // Simpan seluruh token dan status sesi secara lengkap dan konsisten
        safeStorage.setItem('auth', 'true');
        safeStorage.setItem('admin_token', res.data.token || '');
        safeStorage.setItem('token', res.data.token || '');
        safeStorage.setItem('adminUsername', res.data.username || username.trim());
        safeStorage.setJSON('user', adminUser);

        toast.success('Login berhasil! Mengalihkan ke Portal Admin...');
        
        // Alihkan langsung ke dashboard admin
        navigate('/admin', { replace: true });
        return;
      } else {
        setErrorMessage(res.data?.error || 'Login gagal, periksa kembali username dan password Anda');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Login gagal, username atau password salah';
      setErrorMessage(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const appName = schoolSettings.judul_aplikasi || schoolSettings.websiteName || 'Sistem Presensi Siswa';
  const logo = schoolSettings.logoBase64;

  return (
    <Box 
      sx={{ 
        minHeight: '100vh', 
        bgcolor: isDark ? '#0b0f19' : '#f8fafc',
        backgroundImage: isDark
          ? 'radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.12) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(59, 130, 246, 0.12) 0px, transparent 50%)'
          : 'radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.08) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(14, 165, 233, 0.08) 0px, transparent 50%)',
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        p: { xs: 2, sm: 3 } 
      }}
    >
      <Paper 
        elevation={0} 
        sx={{ 
          p: { xs: 3.5, sm: 4.5 }, 
          borderRadius: 4, 
          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0'}`,
          width: '100%', 
          maxWidth: 420,
          bgcolor: isDark ? '#111827' : '#ffffff',
          boxShadow: isDark
            ? '0 20px 40px -15px rgba(0,0,0,0.7)'
            : '0 20px 40px -15px rgba(15, 23, 42, 0.08)',
          textAlign: 'center'
        }}
      >
        {/* Logo & Header */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          {logo ? (
            <Box
              component="img"
              src={getSafeImageUrl(logo)}
              alt="Logo Sekolah"
              onError={(e) => handleImageError(e as any, DEFAULT_SCHOOL_LOGO_SVG)}
              sx={{
                width: 72,
                height: 72,
                objectFit: 'contain',
                borderRadius: 2.5,
                p: 0.5,
                bgcolor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                border: '1px solid',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'
              }}
            />
          ) : (
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: 3,
                bgcolor: alpha('#6366f1', 0.12),
                color: '#6366f1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <AdminIcon sx={{ fontSize: 36 }} />
            </Box>
          )}
        </Box>

        <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5, letterSpacing: -0.5 }}>
          Portal Admin
        </Typography>

        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
          {appName}
        </Typography>

        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2.5, textAlign: 'left', borderRadius: 2 }}>
            {errorMessage}
          </Alert>
        )}

        <form onSubmit={handleLogin} noValidate>
          <Stack spacing={2.5}>
            <TextField 
              label="Username Admin" 
              type="text"
              fullWidth 
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2.5
                }
              }}
            />

            <TextField 
              label="Password" 
              type={showPassword ? 'text' : 'password'}
              fullWidth 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  )
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2.5
                }
              }}
            />

            <Button 
              type="submit" 
              variant="contained" 
              color="primary" 
              fullWidth 
              size="large" 
              disabled={loading}
              sx={{ 
                py: 1.4,
                borderRadius: 2.5,
                fontWeight: 700,
                fontSize: '1rem',
                textTransform: 'none',
                boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.39)',
                bgcolor: '#6366f1',
                '&:hover': {
                  bgcolor: '#4f46e5'
                }
              }}
            >
              {loading ? (
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <CircularProgress size={20} color="inherit" />
                  <span>Memverifikasi...</span>
                </Stack>
              ) : (
                'Masuk ke Portal Admin'
              )}
            </Button>
          </Stack>
        </form>

        <Box sx={{ mt: 3.5, pt: 2.5, borderTop: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9'}` }}>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'center', alignItems: 'center' }}>
            <Button
              component={RouterLink}
              to="/"
              size="small"
              startIcon={<ScannerIcon fontSize="small" />}
              sx={{ textTransform: 'none', color: 'text.secondary', fontWeight: 600 }}
            >
              Portal Scanner
            </Button>
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>•</Typography>
            <Button
              component={RouterLink}
              to="/guru/login"
              size="small"
              startIcon={<SchoolIcon fontSize="small" />}
              sx={{ textTransform: 'none', color: 'text.secondary', fontWeight: 600 }}
            >
              Portal Guru
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
