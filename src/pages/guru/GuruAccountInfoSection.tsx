import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Avatar,
  Chip,
  Divider,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
  LinearProgress
} from '@mui/material';
import {
  Person as PersonIcon,
  VpnKey as KeyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Badge as BadgeIcon,
  Phone as PhoneIcon,
  CheckCircle as CheckCircleIcon,
  LockReset as LockResetIcon,
  EventNote as EventNoteIcon,
  Shield as ShieldIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAppTheme } from '../../contexts/ThemeModeContext';

interface GuruAccountInfoSectionProps {
  currentUser: any;
  teacherPiketInfo?: string;
  onPasswordChanged?: () => void;
}

export default function GuruAccountInfoSection({
  currentUser,
  teacherPiketInfo,
  onPasswordChanged
}: GuruAccountInfoSectionProps) {
  const { preset, isDark } = useAppTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Compute password strength
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'Belum diisi', color: 'inherit' as const };
    let score = 0;
    if (pass.length >= 6) score += 25;
    if (pass.length >= 8) score += 25;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 25;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 25;

    if (score <= 25) return { score, label: 'Lemah', color: 'error' as const };
    if (score <= 50) return { score, label: 'Cukup', color: 'warning' as const };
    if (score <= 75) return { score, label: 'Kuat', color: 'info' as const };
    return { score, label: 'Sangat Kuat', color: 'success' as const };
  };

  const strength = getPasswordStrength(newPassword);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!newPassword.trim()) {
      setErrorMsg('Silakan masukkan password baru.');
      return;
    }
    if (newPassword.trim().length < 4) {
      setErrorMsg('Password baru minimal 4 karakter.');
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      setErrorMsg('Konfirmasi password baru tidak sesuai.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/guru/change-password', {
        teacher_id: currentUser?.id || currentUser?.teacher_id,
        username: currentUser?.username,
        current_password: currentPassword.trim(),
        new_password: newPassword.trim(),
        confirm_password: confirmPassword.trim()
      });

      if (res.data && res.data.success) {
        setSuccessMsg(res.data.message || 'Password akun guru berhasil diubah!');
        toast.success('Password berhasil diperbarui!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        if (onPasswordChanged) onPasswordChanged();
      } else {
        setErrorMsg(res.data?.error || 'Gagal mengubah password');
        toast.error(res.data?.error || 'Gagal mengubah password');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Terjadi kesalahan pada server';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const teacherName = currentUser?.name || 'Bapak/Ibu Guru';
  const teacherNip = currentUser?.nip || '-';
  const teacherUsername = currentUser?.username || '-';
  const teacherSubject = currentUser?.subject || currentUser?.mapel || 'Guru Mata Pelajaran';
  const teacherPhone = currentUser?.phone || currentUser?.whatsapp || '-';
  const teacherClass = currentUser?.class || '-';

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', p: { xs: 1.5, sm: 2.5 }, pb: { xs: 28, md: 2.5 } }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '5fr 7fr' },
          gap: 3
        }}
      >
        {/* KOLOM KIRI: PROFIL GURU */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3 },
            borderRadius: 3,
            border: `1px solid ${preset.glassBorder}`,
            bgcolor: isDark ? preset.cardBg : '#ffffff',
            height: '100%'
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2.5, textAlign: 'center', gap: 1.5 }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: '#10b981',
                color: '#ffffff',
                fontSize: '2rem',
                fontWeight: 800,
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
              }}
            >
              {teacherName.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: preset.textColorPrimary, lineHeight: 1.3 }}>
                {teacherName}
              </Typography>
              <Typography variant="body2" sx={{ color: isDark ? '#34d399' : '#059669', fontWeight: 600, mt: 0.3 }}>
                {teacherSubject}
              </Typography>
            </Box>
            <Chip
              icon={<CheckCircleIcon sx={{ fontSize: '15px !important' }} />}
              label="Akun Guru Aktif"
              size="small"
              color="success"
              sx={{ fontWeight: 700, borderRadius: 2 }}
            />
          </Box>

          <Divider sx={{ my: 2, borderColor: preset.glassBorder }} />

          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: preset.textColorSecondary, mb: 2, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
            Detail Data Kepegawaian
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f8fafc', border: `1px solid ${preset.glassBorder}` }}>
              <Typography variant="caption" sx={{ color: preset.textColorSecondary, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <BadgeIcon fontSize="inherit" /> Nomor Induk Pegawai (NIP)
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: preset.textColorPrimary, mt: 0.3 }}>
                {teacherNip || 'Belum diatur'}
              </Typography>
            </Box>

            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f8fafc', border: `1px solid ${preset.glassBorder}` }}>
              <Typography variant="caption" sx={{ color: preset.textColorSecondary, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <PersonIcon fontSize="inherit" /> Username Login
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: preset.textColorPrimary, mt: 0.3 }}>
                {teacherUsername}
              </Typography>
            </Box>

            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f8fafc', border: `1px solid ${preset.glassBorder}` }}>
              <Typography variant="caption" sx={{ color: preset.textColorSecondary, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <PhoneIcon fontSize="inherit" /> Nomor Kontak / WhatsApp
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: preset.textColorPrimary, mt: 0.3 }}>
                {teacherPhone || 'Belum diatur'}
              </Typography>
            </Box>

            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f8fafc', border: `1px solid ${preset.glassBorder}` }}>
              <Typography variant="caption" sx={{ color: preset.textColorSecondary, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <GroupIcon fontSize="inherit" /> Kelas / Rombel Binaan
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: preset.textColorPrimary, mt: 0.3 }}>
                {teacherClass || 'Guru Lintas Kelas / Mata Pelajaran'}
              </Typography>
            </Box>

            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5', border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.3)' : '#a7f3d0'}` }}>
              <Typography variant="caption" sx={{ color: isDark ? '#4ade80' : '#047857', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <EventNoteIcon fontSize="inherit" /> Jadwal Tugas Piket Mingguan
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: isDark ? '#86efac' : '#065f46', mt: 0.3 }}>
                {teacherPiketInfo || 'Tidak memiliki jadwal piket'}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* KOLOM KANAN: FORM GANTI PASSWORD */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3 },
            borderRadius: 3,
            border: `1px solid ${preset.glassBorder}`,
            bgcolor: isDark ? preset.cardBg : '#ffffff'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Avatar sx={{ bgcolor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff', color: preset.primary, width: 44, height: 44 }}>
              <LockResetIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: preset.textColorPrimary }}>
                Ganti Password Akun Guru
              </Typography>
              <Typography variant="body2" sx={{ color: preset.textColorSecondary }}>
                Perbarui kata sandi untuk keamanan akun portal Anda
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2, borderColor: preset.glassBorder }} />

          {errorMsg && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setErrorMsg(null)}>
              {errorMsg}
            </Alert>
          )}

          {successMsg && (
            <Alert severity="success" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setSuccessMsg(null)}>
              {successMsg}
            </Alert>
          )}

          <form onSubmit={handleChangePassword}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                id="guru-current-password"
                label="Password Saat Ini"
                fullWidth
                size="small"
                type={showCurrent ? 'text' : 'password'}
                placeholder="Masukkan password saat ini (opsional jika baru pertama)"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
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
                        <IconButton
                          size="small"
                          onClick={() => setShowCurrent(!showCurrent)}
                          edge="end"
                          sx={{ color: preset.textColorSecondary }}
                        >
                          {showCurrent ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />

              <TextField
                id="guru-new-password"
                label="Password Baru"
                fullWidth
                size="small"
                type={showNew ? 'text' : 'password'}
                placeholder="Minimal 4 karakter (kombinasi huruf & angka disarankan)"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
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
                        <ShieldIcon fontSize="small" sx={{ color: preset.textColorSecondary }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowNew(!showNew)}
                          edge="end"
                          sx={{ color: preset.textColorSecondary }}
                        >
                          {showNew ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />

              {/* Password Strength Bar */}
              {newPassword && (
                <Box sx={{ mt: -1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: preset.textColorSecondary, fontWeight: 600 }}>
                      Kekuatan Password:
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: `${strength.color}.main` }}>
                      {strength.label}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={strength.score}
                    color={strength.color}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
              )}

              <TextField
                id="guru-confirm-password"
                label="Konfirmasi Password Baru"
                fullWidth
                size="small"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Ketik ulang password baru Anda"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                error={Boolean(confirmPassword && newPassword !== confirmPassword)}
                helperText={confirmPassword && newPassword !== confirmPassword ? 'Konfirmasi password tidak cocok' : ''}
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
                        <ShieldIcon fontSize="small" sx={{ color: preset.textColorSecondary }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowConfirm(!showConfirm)}
                          edge="end"
                          sx={{ color: preset.textColorSecondary }}
                        >
                          {showConfirm ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />

              <Button
                id="btn-submit-change-password"
                type="submit"
                variant="contained"
                size="large"
                disabled={loading || !newPassword}
                sx={{
                  py: 1.2,
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: 2,
                  bgcolor: preset.primary,
                  color: `${preset.contrastText} !important`,
                  '&:hover': { opacity: 0.9 }
                }}
              >
                {loading ? <CircularProgress size={22} color="inherit" /> : 'Simpan Password Baru'}
              </Button>
            </Box>
          </form>

          <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f8fafc', border: `1px solid ${preset.glassBorder}` }}>
            <Typography variant="caption" sx={{ color: preset.textColorSecondary, display: 'block', lineHeight: 1.5 }}>
              💡 <b>Tips Keamanan:</b> Gunakan kata sandi yang mudah Anda ingat namun sulit ditebak orang lain. Hindari membagikan password akun guru kepada siswa atau pihak yang tidak berkepentingan.
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
