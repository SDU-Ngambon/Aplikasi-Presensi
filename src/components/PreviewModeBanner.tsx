import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Tooltip
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { safeStorage } from '../safeStorage';

export default function PreviewModeBanner() {
  const navigate = useNavigate();

  const [isPreview, setIsPreview] = useState(() => {
    return safeStorage.getItem('is_preview_mode') === 'true';
  });

  const [targetInfo, setTargetInfo] = useState(() => {
    return safeStorage.getJSON<any>('preview_target_info', {
      name: 'User Pratinjau',
      role: 'GURU'
    });
  });

  useEffect(() => {
    const handleSync = () => {
      const active = safeStorage.getItem('is_preview_mode') === 'true';
      setIsPreview(active);
      if (active) {
        setTargetInfo(safeStorage.getJSON<any>('preview_target_info', {
          name: 'User Pratinjau',
          role: 'GURU'
        }));
      }
    };

    window.addEventListener('previewModeChanged', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('previewModeChanged', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const handleExitPreview = () => {
    // 1. Ambil data sesi cadangan Admin asli jika ada
    const backupRaw = safeStorage.getItem('admin_backup_session');
    let backup: any = null;
    try {
      if (backupRaw) backup = JSON.parse(backupRaw);
    } catch (e) {}

    // 2. Pulihkan autentikasi Admin utama
    safeStorage.setItem('auth', 'true');
    if (backup) {
      if (backup.user) {
        safeStorage.setItem('user', typeof backup.user === 'object' ? JSON.stringify(backup.user) : String(backup.user));
      }
      if (backup.token) safeStorage.setItem('token', backup.token);
      if (backup.admin_token) safeStorage.setItem('admin_token', backup.admin_token);
      if (backup.adminUsername) safeStorage.setItem('adminUsername', backup.adminUsername);
    }

    // 3. Pastikan objek user admin terisi dengan valid
    const currentAdminUser = safeStorage.getJSON('user', null);
    if (!currentAdminUser || currentAdminUser.role !== 'admin') {
      safeStorage.setJSON('user', {
        id: 'admin_id',
        username: safeStorage.getItem('adminUsername') || 'admin',
        role: 'admin',
        name: 'Administrator'
      });
    }

    // 4. Bersihkan seluruh flag impersonasi dan token pratinjau secara tuntas
    safeStorage.removeItem('is_preview_mode');
    safeStorage.removeItem('preview_target_info');
    safeStorage.removeItem('preview_origin_role');
    safeStorage.removeItem('admin_backup_session');

    // Bersihkan sesi sementara portal target agar tidak ada sisa status tersangkut
    safeStorage.removeItem('guru_auth');
    safeStorage.removeItem('guru_user');
    safeStorage.removeItem('guru_token');
    safeStorage.removeItem('guru_just_logged_in');
    safeStorage.removeItem('piket_auth');
    safeStorage.removeItem('piket_user');
    safeStorage.removeItem('piket_token');
    safeStorage.removeItem('piket_just_logged_in');
    safeStorage.removeItem('siswa_auth');
    safeStorage.removeItem('siswa_user');
    safeStorage.removeItem('siswa_token');

    // Trigger animasi keluar pill button
    setIsPreview(false);
    window.dispatchEvent(new Event('previewModeChanged'));

    // Bersihkan seluruh toast yang sedang aktif
    toast.dismiss();

    // Tampilkan notifikasi keluar dengan auto-dismiss yang pasti
    const exitToastId = 'preview-exit-toast';
    toast.success('Keluar dari mode pratinjau. Kembali ke Portal Admin.', {
      id: exitToastId,
      icon: '🛡️',
      duration: 2200
    });

    // Safety timeout untuk memastikan tertutup otomatis dan tidak stuck
    setTimeout(() => {
      toast.dismiss(exitToastId);
    }, 2300);

    // 5. Kembalikan Admin secara mulus ke halaman dashboard admin
    navigate('/admin', { replace: true });
  };

  const roleLabel = targetInfo?.role === 'KEPALA_SEKOLAH'
    ? 'Kepala Sekolah'
    : targetInfo?.role === 'WAKIL_KURIKULUM'
    ? 'Waka Kurikulum'
    : targetInfo?.role === 'WAKIL_KESISWAAN'
    ? 'Waka Kesiswaan'
    : targetInfo?.role === 'GURU_BK'
    ? 'Guru BK'
    : targetInfo?.role === 'WALI_KELAS'
    ? `Wali Kelas ${targetInfo?.class || ''}`
    : targetInfo?.role === 'PIKET' || targetInfo?.role === 'admin_piket'
    ? 'Guru Piket'
    : targetInfo?.role === 'SISWA'
    ? `Siswa (${targetInfo?.class || ''})`
    : 'Guru Mapel';

  return (
    <AnimatePresence>
      {isPreview && (
        <motion.div
          key="preview-floating-pill"
          initial={{ opacity: 0, y: 35, scale: 0.9 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
              type: 'spring',
              stiffness: 400,
              damping: 26,
              mass: 0.7
            }
          }}
          exit={{
            opacity: 0,
            y: 30,
            scale: 0.92,
            transition: {
              duration: 0.22,
              ease: 'easeInOut'
            }
          }}
          whileHover={{ y: -2 }}
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 99999,
            maxWidth: 'calc(100vw - 32px)'
          }}
        >
          {/* Floating Capsule / Pill Button Minimalis & Modern */}
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: { xs: 1, sm: 1.25 },
              px: { xs: 1.2, sm: 1.6 },
              py: 0.65,
              borderRadius: 9999,
              bgcolor: 'rgba(15, 23, 42, 0.94)',
              backdropFilter: 'blur(16px)',
              border: '1.5px solid rgba(245, 158, 11, 0.55)',
              boxShadow: '0 10px 25px -4px rgba(0, 0, 0, 0.5), 0 0 16px rgba(245, 158, 11, 0.25)',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              '&:hover': {
                boxShadow: '0 14px 28px -4px rgba(0, 0, 0, 0.6), 0 0 20px rgba(245, 158, 11, 0.35)',
                borderColor: 'rgba(245, 158, 11, 0.85)'
              }
            }}
          >
            {/* Ikon Indikator Mode Pratinjau */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 26,
                height: 26,
                borderRadius: 9999,
                bgcolor: 'rgba(245, 158, 11, 0.2)',
                color: '#fbbf24',
                flexShrink: 0
              }}
            >
              <VisibilityIcon sx={{ fontSize: 16 }} />
            </Box>

            {/* Badge Peran Ringkas */}
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                px: 1,
                py: 0.25,
                borderRadius: 9999,
                bgcolor: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#fbbf24',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: 0.3,
                whiteSpace: 'nowrap'
              }}
            >
              Pratinjau: {roleLabel}
            </Box>

            {/* Garis Pemisah Vertikal Halus */}
            <Box
              sx={{
                width: '1px',
                height: '18px',
                bgcolor: 'rgba(255, 255, 255, 0.18)',
                flexShrink: 0
              }}
            />

            {/* Tombol Aksi Utama: Kembali ke Admin */}
            <Tooltip title="Klik untuk mengakhiri pratinjau dan kembali ke Portal Admin" placement="top" arrow>
              <Button
                size="small"
                variant="contained"
                onClick={handleExitPreview}
                startIcon={<ArrowBackIcon sx={{ fontSize: '14px !important' }} />}
                sx={{
                  borderRadius: 9999,
                  px: { xs: 1.25, sm: 1.6 },
                  py: 0.45,
                  fontSize: '11.5px',
                  fontWeight: 800,
                  textTransform: 'none',
                  whiteSpace: 'nowrap',
                  bgcolor: '#d97706',
                  color: '#ffffff',
                  boxShadow: '0 2px 8px rgba(217, 119, 6, 0.4)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: '#b45309',
                    boxShadow: '0 4px 12px rgba(217, 119, 6, 0.6)'
                  }
                }}
              >
                Kembali ke Admin
              </Button>
            </Tooltip>
          </Box>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
