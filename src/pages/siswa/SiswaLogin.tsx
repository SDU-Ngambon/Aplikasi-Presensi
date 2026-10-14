import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
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
  useTheme,
  alpha
} from '@mui/material';
import {
  School as SchoolIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Person as PersonIcon,
  VpnKey as KeyIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  HelpOutlined as HelpOutlineIcon
} from '@mui/icons-material';
import { safeStorage } from '../../safeStorage';

export default function SiswaLogin() {
  const theme = useTheme();
  const navigate = useNavigate();
  const isDarkMode = theme.palette.mode === 'dark';

  const [nisn, setNisn] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [schoolName, setSchoolName] = useState('SMK Negeri Indonesia');
  const [appTitle, setAppTitle] = useState('Portal Siswa & LMS Digital');
  const [schoolLogo, setSchoolLogo] = useState<string>('');

  useEffect(() => {
    // If already logged in, redirect to student portal
    if (safeStorage.getItem('siswa_auth') === 'true') {
      navigate('/siswa', { replace: true });
      return;
    }

    async function loadSchoolInfo() {
      try {
        const res = await axios.get('/api/settings');
        if (res.data) {
          if (res.data.website_name || res.data.nama_sekolah) {
            setSchoolName(res.data.website_name || res.data.nama_sekolah);
          }
          if (res.data.judul_aplikasi) {
            setAppTitle(res.data.judul_aplikasi);
          }
          if (res.data.logo_sekolah || res.data.logo) {
            setSchoolLogo(res.data.logo_sekolah || res.data.logo);
          }
        }
      } catch (e) {}
    }
    loadSchoolInfo();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanNisn = nisn.trim();
    const cleanPassword = password.trim();

    if (!cleanNisn) {
      setErrorMsg('Silakan masukkan NISN Anda.');
      return;
    }
    if (!cleanPassword) {
      setErrorMsg('Silakan masukkan password akun Anda.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/siswa/login', {
        nisn: cleanNisn,
        username: cleanNisn,
        password: cleanPassword
      });

      if (res.data && res.data.success) {
        toast.success(`Selamat datang, ${res.data.student?.name || 'Siswa'}!`);
        safeStorage.setItem('siswa_auth', 'true');
        safeStorage.setItem('siswa_token', res.data.token || '');
        safeStorage.setItem('siswa_user', JSON.stringify(res.data.student));
        navigate('/siswa', { replace: true });
      } else {
        setErrorMsg(res.data?.error || 'Gagal masuk. Periksa kembali NISN dan password Anda.');
      }
    } catch (err: any) {
      const serverMsg = err.response?.data?.error || err.response?.data?.message || 'NISN atau kata sandi tidak valid. Hubungi admin atau wali kelas.';
      setErrorMsg(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 2, sm: 3 },
        bgcolor: isDarkMode ? '#0a0f1d' : '#f8fafc',
        backgroundImage: isDarkMode
          ? 'radial-gradient(ellipse at 50% 0%, rgba(14, 165, 233, 0.15) 0%, transparent 75%)'
          : 'radial-gradient(ellipse at 50% 0%, rgba(14, 165, 233, 0.08) 0%, transparent 75%)'
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 450,
          p: { xs: 3, sm: 4 },
          borderRadius: 4,
          bgcolor: isDarkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`,
          boxShadow: isDarkMode
            ? '0 20px 40px -15px rgba(0,0,0,0.7), 0 0 30px rgba(14, 165, 233, 0.1)'
            : '0 20px 40px -15px rgba(14, 165, 233, 0.12), 0 4px 12px rgba(0,0,0,0.04)'
        }}
      >
        {/* Header / Logo */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            sx={{
              display: 'inline-flex',
              p: 1.5,
              borderRadius: 3,
              bgcolor: alpha(theme.palette.primary.main, 0.12),
              color: theme.palette.primary.main,
              mb: 2,
              boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.25)}`
            }}
          >
            {schoolLogo ? (
              <img src={schoolLogo} alt="Logo" style={{ width: 44, height: 44, objectFit: 'contain' }} />
            ) : (
              <SchoolIcon sx={{ fontSize: 40 }} />
            )}
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: -0.5 }}>
            Login Portal Siswa
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, fontWeight: 500 }}>
            {schoolName}
          </Typography>

          <Chip
            size="small"
            label="LMS & Pembelajaran Digital"
            sx={{
              mt: 1.5,
              fontWeight: 700,
              fontSize: '0.72rem',
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
            }}
          />
        </Box>

        {errorMsg && (
          <Alert
            severity="error"
            onClose={() => setErrorMsg(null)}
            sx={{
              mb: 2.5,
              borderRadius: 2.5,
              fontSize: '0.84rem',
              fontWeight: 600
            }}
          >
            {errorMsg}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={2.2}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.8, display: 'block' }}>
                NISN (Nomor Induk Siswa Nasional)
              </Typography>
              <TextField
                fullWidth
                size="medium"
                placeholder="Masukkan 10 digit NISN Anda"
                value={nisn}
                onChange={(e) => setNisn(e.target.value)}
                autoComplete="username"
                autoFocus
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                      </InputAdornment>
                    )
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2.5,
                    bgcolor: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : '#f8fafc'
                  }
                }}
              />
            </Box>

            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  Kata Sandi Akun Siswa
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    '&:hover': { color: theme.palette.primary.main }
                  }}
                  onClick={() => toast('Hubungi wali kelas atau admin sekolah jika lupa kata sandi.', { icon: 'ℹ️' })}
                >
                  Lupa password?
                </Typography>
              </Box>
              <TextField
                fullWidth
                size="medium"
                type={showPassword ? 'text' : 'password'}
                placeholder="Masukkan kata sandi akun siswa"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <KeyIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2.5,
                    bgcolor: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : '#f8fafc'
                  }
                }}
              />
            </Box>

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{
                py: 1.4,
                borderRadius: 2.5,
                fontWeight: 800,
                textTransform: 'none',
                fontSize: '0.96rem',
                boxShadow: `0 8px 20px -3px ${alpha(theme.palette.primary.main, 0.4)}`,
                mt: 1
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Masuk ke Portal Siswa'
              )}
            </Button>
          </Stack>
        </Box>

        {/* Security & Helper Note */}
        <Box
          sx={{
            mt: 3,
            pt: 2.5,
            borderTop: `1px dashed ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <HelpOutlineIcon sx={{ fontSize: 16, color: 'text.secondary', mt: 0.3 }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>
              Kata sandi siswa sinkron langsung dengan <b>Menu Akun Siswa di Portal Admin</b>. Perubahan password oleh admin akan langsung berlaku seketika.
            </Typography>
          </Box>

          <Button
            variant="text"
            size="small"
            startIcon={<ArrowBackIcon fontSize="small" />}
            onClick={() => navigate('/')}
            sx={{
              mt: 1,
              alignSelf: 'center',
              textTransform: 'none',
              fontWeight: 600,
              color: 'text.secondary'
            }}
          >
            Kembali ke Halaman Scanner
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
