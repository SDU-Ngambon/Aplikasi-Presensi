import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Chip,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  useTheme,
  alpha
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Schedule as ScheduleIcon,
  MenuBook as MenuBookIcon,
  FactCheck as FactCheckIcon,
  Assessment as AssessmentIcon,
  School as SchoolIcon,
  ExitToApp as ExitToAppIcon,
  Logout as LogoutIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { safeStorage } from '../../safeStorage';
import { SidebarFloatingToggle } from '../../components/Sidebar';

const SISWA_DRAWER_WIDTH = 250;
const SISWA_COLLAPSED_WIDTH = 74;

export default function SiswaLayout() {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isDarkMode = theme.palette.mode === 'dark';

  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  // Authentication Guard: Check if student is authenticated
  useEffect(() => {
    const isAuth = safeStorage.getItem('siswa_auth') === 'true';
    if (!isAuth) {
      navigate('/login-siswa', { replace: true });
    }
  }, [navigate]);

  const [collapsed, setCollapsed] = useState(() => {
    return safeStorage.getItem('siswaSidebarCollapsed') === 'true';
  });

  const toggleSidebar = () => {
    setCollapsed(prev => {
      const next = !prev;
      safeStorage.setItem('siswaSidebarCollapsed', String(next));
      return next;
    });
  };

  // Keyboard shortcut Ctrl+B / Cmd+B to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentDrawerWidth = collapsed ? SISWA_COLLAPSED_WIDTH : SISWA_DRAWER_WIDTH;

  const [studentInfo] = useState(() => {
    const stored = safeStorage.getJSON<any>('siswa_user', null);
    if (stored) {
      return {
        nama: stored.name || 'Siswa',
        nisn: stored.nisn || '-',
        kelas: stored.class || 'Kelas X',
        jurusan: stored.major || 'Umum',
        statusPresensi: 'Akun Aktif Terverifikasi'
      };
    }
    return {
      nama: 'Ahmad Fauzi Rahman',
      nisn: '0078912341',
      kelas: 'X RPL 1',
      jurusan: 'Rekayasa Perangkat Lunak',
      statusPresensi: 'Hadir Tepat Waktu (06:48 WIB)'
    };
  });

  const handleLogout = () => {
    safeStorage.removeItem('siswa_auth');
    safeStorage.removeItem('siswa_user');
    safeStorage.removeItem('siswa_token');
    toast.success('Berhasil keluar dari Portal Siswa');
    navigate('/login-siswa', { replace: true });
  };

  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Menu Settings (Maintenance Active/Inactive status)
  const [menuSettings, setMenuSettings] = useState<Record<string, boolean>>(() => {
    return safeStorage.getJSON('menu_settings_cache', {});
  });

  const isPreviewMode = safeStorage.getItem('is_preview_mode') === 'true';

  useEffect(() => {
    async function loadMenuSettings() {
      try {
        const res = await axios.get('/api/menu-settings');
        if (res.data?.map) {
          setMenuSettings(res.data.map);
          safeStorage.setItem('menu_settings_cache', JSON.stringify(res.data.map));
        }
      } catch (e) {}
    }
    loadMenuSettings();

    const handleMenuChanged = () => {
      loadMenuSettings();
    };
    window.addEventListener('menuSettingsChanged', handleMenuChanged);
    return () => window.removeEventListener('menuSettingsChanged', handleMenuChanged);
  }, []);

  const rawNavItems = [
    { id: 'siswa-dashboard', label: 'Dashboard', path: '/siswa', icon: DashboardIcon, defaultBadge: '' },
    { id: 'siswa-jadwal', label: 'Jadwal KBM', path: '/siswa/jadwal', icon: ScheduleIcon, defaultBadge: '' },
    { id: 'siswa-materi-tugas', label: 'Materi & Tugas', path: '/siswa/materi-tugas', icon: MenuBookIcon, defaultBadge: 'Baru' },
    { id: 'siswa-asesmen', label: 'Asesmen', path: '/siswa/asesmen', icon: FactCheckIcon, defaultBadge: '1 Aktif' },
    { id: 'siswa-hasil-belajar', label: 'Hasil Belajar', path: '/siswa/hasil-belajar', icon: AssessmentIcon, defaultBadge: '' },
  ];

  // Filter or decorate items according to maintenance active status & preview mode
  const navItems = rawNavItems.flatMap(item => {
    const isEnabled = menuSettings[item.id] !== false;
    if (!isEnabled) {
      if (!isPreviewMode) {
        return []; // hidden from real student
      }
      return [{
        ...item,
        badge: 'Disembunyikan',
        isDisabledInDb: true
      }];
    }
    return [{
      ...item,
      badge: item.defaultBadge,
      isDisabledInDb: false
    }];
  });

  const isCurrentActive = (p: string) => {
    if (p === '/siswa') return location.pathname === '/siswa' || location.pathname === '/siswa/';
    return location.pathname.startsWith(p);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: isDarkMode ? '#0b1120' : '#f8fafc' }}>
      {/* DESKTOP SIDEBAR WITH FLOATING COLLAPSE TOGGLE */}
      <Drawer
        variant="permanent"
        sx={{
          width: currentDrawerWidth,
          flexShrink: 0,
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          '& .MuiDrawer-paper': {
            width: currentDrawerWidth,
            boxSizing: 'border-box',
            transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            overflowX: 'visible',
            overflowY: 'visible',
            bgcolor: isDarkMode ? '#0f172a' : '#ffffff',
            borderRight: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
            boxShadow: isDarkMode ? '4px 0 20px rgba(0,0,0,0.3)' : '4px 0 20px rgba(0,0,0,0.03)'
          }
        }}
      >
        {/* Modern Floating Toggle Button on the Right Border */}
        <SidebarFloatingToggle
          collapsed={collapsed}
          onToggle={toggleSidebar}
          tooltipTitle={collapsed ? 'Buka Sidebar Siswa' : 'Tutup Sidebar Siswa'}
          isDark={isDarkMode}
          primaryColor={theme.palette.primary.main}
          top={26}
          rightOffset={-13}
        />

        {/* Brand Header */}
        <Box
          sx={{
            height: 68,
            px: collapsed ? 1.5 : 2.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 1.5,
            borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : '#f1f5f9'}`
          }}
        >
          <Avatar
            variant="rounded"
            sx={{
              width: 38,
              height: 38,
              bgcolor: theme.palette.primary.main,
              color: '#ffffff',
              boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.35)}`
            }}
          >
            <SchoolIcon fontSize="small" />
          </Avatar>
          {!collapsed && (
            <Box sx={{ overflow: 'hidden', minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.2, letterSpacing: -0.2 }} noWrap>
                Portal Siswa
              </Typography>
              <Typography variant="caption" sx={{ color: theme.palette.primary.main, fontWeight: 700 }}>
                Smart LMS Digital
              </Typography>
            </Box>
          )}
        </Box>

        {/* User Card Compact (In Sidebar) */}
        {!collapsed && (
          <Box
            sx={{
              m: 1.5,
              p: 1.5,
              borderRadius: 2.5,
              bgcolor: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : '#f1f5f9',
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
              <Avatar sx={{ width: 34, height: 34, bgcolor: theme.palette.secondary.main, fontWeight: 800, fontSize: 13 }}>
                AF
              </Avatar>
              <Box sx={{ overflow: 'hidden', minWidth: 0 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', color: 'text.primary' }} noWrap>
                  {studentInfo.nama}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10.5px' }}>
                  {studentInfo.kelas} • NISN {studentInfo.nisn.slice(-4)}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* Navigation Items */}
        <Box sx={{ flex: 1, py: 1.5, px: collapsed ? 1 : 1.5 }}>
          <List disablePadding>
            {navItems.map((item) => {
              const active = isCurrentActive(item.path);
              const Icon = item.icon;

              const content = (
                <ListItemButton
                  component={RouterLink}
                  to={item.path}
                  sx={{
                    my: 0.5,
                    px: collapsed ? 0 : 2,
                    py: 1.2,
                    borderRadius: 2.5,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    bgcolor: active
                      ? (isDarkMode ? alpha(theme.palette.primary.main, 0.2) : alpha(theme.palette.primary.main, 0.1))
                      : 'transparent',
                    color: active ? theme.palette.primary.main : (isDarkMode ? '#cbd5e1' : '#475569'),
                    border: active
                      ? `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                      : '1px solid transparent',
                    fontWeight: active ? 800 : 600,
                    transition: 'all 0.18s ease-in-out',
                    '&:hover': {
                      bgcolor: active
                        ? alpha(theme.palette.primary.main, 0.25)
                        : (isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9'),
                      color: theme.palette.primary.main
                    }
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: collapsed ? 'auto' : 36,
                      color: active ? theme.palette.primary.main : 'inherit',
                      justifyContent: 'center'
                    }}
                  >
                    <Icon fontSize="small" />
                  </ListItemIcon>
                  {!collapsed && (
                    <ListItemText
                      primary={
                        <Typography sx={{ fontSize: '0.88rem', fontWeight: active ? 800 : 600 }}>
                          {item.label}
                        </Typography>
                      }
                    />
                  )}
                  {!collapsed && item.isDisabledInDb ? (
                    <Tooltip title="Menu dinonaktifkan di Maintenance & disembunyikan untuk siswa. Tampil karena Mode Pratinjau Admin." placement="top">
                      <Chip
                        icon={<VisibilityOffIcon sx={{ fontSize: '11px !important', color: 'inherit' }} />}
                        label="Disembunyikan"
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '9.5px',
                          fontWeight: 800,
                          borderRadius: 1,
                          bgcolor: isDarkMode ? 'rgba(71, 85, 105, 0.45)' : '#e2e8f0',
                          color: isDarkMode ? '#cbd5e1' : '#475569',
                          border: `1px solid ${isDarkMode ? '#64748b' : '#cbd5e1'}`,
                          '& .MuiChip-icon': {
                            ml: '3px',
                            mr: '-3px'
                          }
                        }}
                      />
                    </Tooltip>
                  ) : (!collapsed && item.badge ? (
                    <Chip
                      label={item.badge}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '10px',
                        fontWeight: 800,
                        borderRadius: 1,
                        bgcolor: item.badge === 'Baru' ? '#ef4444' : theme.palette.primary.main,
                        color: '#ffffff'
                      }}
                    />
                  ) : null)}
                </ListItemButton>
              );

              return (
                <ListItem key={item.path} disablePadding sx={{ display: 'block' }}>
                  {collapsed ? (
                    <Tooltip title={item.isDisabledInDb ? `${item.label} (Disembunyikan untuk Siswa)` : item.label} placement="right" arrow>
                      {content}
                    </Tooltip>
                  ) : (
                    content
                  )}
                </ListItem>
              );
            })}
          </List>
        </Box>

        {/* Footer Logout */}
        <Box
          sx={{
            p: 1.5,
            borderTop: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : '#f1f5f9'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            justifyContent: 'center'
          }}
        >
          {collapsed ? (
            <Tooltip title="Keluar dari Portal Siswa" placement="right">
              <IconButton onClick={() => setLogoutDialogOpen(true)} size="small" color="error">
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : (
            <Button
              onClick={() => setLogoutDialogOpen(true)}
              fullWidth
              variant="outlined"
              color="error"
              size="small"
              startIcon={<LogoutIcon fontSize="small" />}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700
              }}
            >
              Keluar Akun
            </Button>
          )}
        </Box>
      </Drawer>

      {/* LOGOUT CONFIRMATION DIALOG */}
      <Dialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Konfirmasi Keluar</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Apakah Anda yakin ingin keluar dari <b>Portal Siswa</b>?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ pb: 2, px: 2 }}>
          <Button onClick={() => setLogoutDialogOpen(false)} color="inherit" sx={{ fontWeight: 600 }}>
            Batal
          </Button>
          <Button
            onClick={handleLogout}
            variant="contained"
            color="error"
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Keluar
          </Button>
        </DialogActions>
      </Dialog>

      {/* MAIN CONTENT AREA */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* TOP BAR DESKTOP (Clean, without bulky hamburger) */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: isDarkMode ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.88)',
            backdropFilter: 'blur(12px)',
            borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
            color: 'text.primary'
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 3 }, minHeight: '68px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1rem', sm: '1.15rem' }, letterSpacing: -0.2 }}>
                {navItems.find(n => isCurrentActive(n.path))?.label || 'Portal Siswa'}
              </Typography>
              <Chip
                icon={<CheckCircleIcon sx={{ fontSize: '15px !important', color: '#10b981 !important' }} />}
                label={studentInfo.statusPresensi}
                size="small"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  bgcolor: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
                  color: isDarkMode ? '#34d399' : '#047857',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: { xs: 'none', sm: 'inline-flex' }
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.8,
                  px: 1.5,
                  py: 0.6,
                  borderRadius: 2,
                  bgcolor: isDarkMode ? 'rgba(30, 41, 59, 0.7)' : '#f1f5f9',
                  border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`
                }}
              >
                <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="caption" sx={{ fontWeight: 800, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  {currentTime}
                </Typography>
              </Box>

              <Chip
                avatar={
                  <Avatar sx={{ width: 22, height: 22, bgcolor: theme.palette.primary.main, fontSize: 11, color: '#fff' }}>
                    {studentInfo.nama ? studentInfo.nama.slice(0, 2).toUpperCase() : 'SW'}
                  </Avatar>
                }
                label={`${studentInfo.nama} (${studentInfo.kelas})`}
                variant="outlined"
                sx={{ fontWeight: 700, borderRadius: 2 }}
              />
            </Box>
          </Toolbar>
        </AppBar>

        {/* PAGE CONTENT OUTLET */}
        <Box sx={{ flexGrow: 1, p: { xs: 2, sm: 2.5, md: 3 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
