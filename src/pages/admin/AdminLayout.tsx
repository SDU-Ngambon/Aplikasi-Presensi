import { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link as RouterLink, useLocation, Navigate } from 'react-router-dom';
import { getSafeImageUrl, handleImageError, DEFAULT_SCHOOL_LOGO_SVG } from '../../utils/imageUtils';

// MUI Imports
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Button,
  IconButton,
  Stack,
  Tooltip,
  Divider,
  Collapse,
  Menu,
  MenuItem,
  useTheme,
  alpha
} from '@mui/material';

// Icons
import {
  Dashboard as DashboardIcon,
  Storage as StorageIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  AssignmentInd as AssignmentIndIcon,
  Badge as BadgeIcon,
  Print as PrintIcon,
  Description as DescriptionIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  MenuOpen as MenuOpenIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  OpenInNew as OpenInNewIcon,
  ExpandLess,
  ExpandMore,
  Class as ClassIcon,
  Palette as PaletteIcon,
  CreditCard as CreditCardIcon,
  Assessment as AssessmentIcon,
  Tune as TuneIcon,
  FolderOpen as FolderOpenIcon,
  Send as SendIcon,
  PhonelinkSetup as MonitorSmartphoneIcon,
  Schedule as ScheduleIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Info as InfoIcon,
  VpnKey as KeyIcon,
  EventNote as EventNoteIcon,
  MenuBook as MenuBookIcon,
  AccessTime as AccessTimeIcon,
  LocationOn as LocationOnIcon,
  EventBusy as EventBusyIcon,
  FactCheck as FactCheckIcon,
  QrCodeScanner as QrCodeScannerIcon,
  Router as RouterIcon,
  Visibility as VisibilityIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  SettingsRemote as KioskIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

import { THEME_PRESETS } from '../../theme';
import { safeStorage } from '../../safeStorage';
import { useAppTheme } from '../../contexts/ThemeModeContext';

export default function AdminLayout() {
  const isAuth = safeStorage.getItem('auth') === 'true';
  const user = safeStorage.getJSON('user', null);
  const isPreview = safeStorage.getItem('is_preview_mode') === 'true';

  if (!isAuth && !user && !isPreview) {
    return <Navigate to="/login" replace />;
  }

  const navigate = useNavigate();
  const location = useLocation();
  const muiTheme = useTheme();
  const { preset, isDark, presetId, toggleDark } = useAppTheme('admin');
  const isAquaGlass = presetId === 'aqua_glass';

  const [collapsed, setCollapsed] = useState(() => {
    return safeStorage.getItem('adminSidebarCollapsed') === 'true';
  });

  const [globalSettings, setGlobalSettings] = useState<Record<string, any>>(() => {
    return safeStorage.getJSON('globalSettings', {});
  });

  const [themePresetId, setThemePresetId] = useState(() => {
    return presetId || safeStorage.getItem('appThemePreset', 'indigo') || 'indigo';
  });

  useEffect(() => {
    // If not authenticated, ensure redirect to login
    if (!safeStorage.getItem('auth')) {
      navigate('/login', { replace: true });
    }

    const handleGlobalSettingsChanged = () => {
      setGlobalSettings(safeStorage.getJSON('globalSettings', {}));
    };

    const handleThemeChanged = () => {
      setThemePresetId(safeStorage.getItem('appThemePreset', 'indigo') || 'indigo');
    };

    window.addEventListener('globalSettingsChanged', handleGlobalSettingsChanged);
    window.addEventListener('themeChanged', handleThemeChanged);

    return () => {
      window.removeEventListener('globalSettingsChanged', handleGlobalSettingsChanged);
      window.removeEventListener('themeChanged', handleThemeChanged);
    };
  }, [navigate]);

  const toggleSidebar = () => {
    setCollapsed(prev => {
      const next = !prev;
      safeStorage.setItem('adminSidebarCollapsed', String(next));
      return next;
    });
  };

  const handleLogout = () => {
    safeStorage.removeItem('auth');
    navigate('/login');
  };

  const activeThemePreset = THEME_PRESETS[themePresetId] || THEME_PRESETS.indigo;
  const drawerWidth = collapsed ? 76 : 260;

  const isSidebarDark = isDark || (!isAquaGlass && Boolean(activeThemePreset.isDark));

  // Dynamic colors for crisp text contrast (no washed-out/pale text in Light Mode)
  const sidebarTextColor = isSidebarDark ? '#f8fafc' : '#0f172a';
  const sidebarItemSubTextColor = isSidebarDark ? 'rgba(255, 255, 255, 0.90)' : '#1e293b';
  const sidebarItemIconColor = isSidebarDark ? 'rgba(255, 255, 255, 0.75)' : '#334155';
  const sidebarCategoryColor = isSidebarDark ? '#94a3b8' : '#1e293b';
  const sidebarBorderColor = isSidebarDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';
  const sidebarHoverBg = isSidebarDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  const sidebarActiveGradient = preset.sidebarActiveGradient || activeThemePreset.sidebarActiveGradient || 'linear-gradient(135deg, #0ea5e9, #0284c7)';

  // Modern collapsible navigation groups matching user requirements
  const menuGroups = [
    {
      id: 'sekolah',
      title: 'DATA SEKOLAH',
      icon: SchoolIcon,
      items: [
        { name: 'Informasi Sekolah', path: '/admin/settings?tab=info', icon: SchoolIcon },
        { name: 'Data Siswa', path: '/admin/students', icon: PeopleIcon },
        { name: 'Data Guru', path: '/admin/teachers', icon: AssignmentIndIcon },
        { name: 'Tugas Tambahan', path: '/admin/tugas-tambahan', icon: BadgeIcon },
        { name: 'Akun User', path: '/admin/user-accounts', icon: KeyIcon },
        { name: 'Rombongan Belajar', path: '/admin/rombel', icon: ClassIcon },
        { name: 'Mata Pelajaran', path: '/admin/mata-pelajaran', icon: MenuBookIcon },
      ]
    },
    {
      id: 'atur_presensi',
      title: 'ATUR PRESENSI',
      icon: CreditCardIcon,
      items: [
        { name: 'Desain Kartu', path: '/admin/card-design', icon: PaletteIcon },
        { name: 'Cetak Kartu', path: '/admin/print-cards', icon: PrintIcon },
        { name: 'Tampilan & Suara', path: '/admin/settings?tab=tampilan-suara', icon: PaletteIcon },
        { name: 'Jadwal Presensi', path: '/admin/settings?tab=jadwal', icon: ScheduleIcon },
        { name: 'Monitoring Kiosk', path: '/admin/kiosk-monitoring', icon: KioskIcon },
        { name: 'Guru Piket', path: '/admin/guru-piket', icon: EventNoteIcon },
        { name: 'Otomasi Presensi Siswa', path: '/admin/settings?tab=wa-siswa', icon: SendIcon },
      ]
    },
    {
      id: 'atur_pembelajaran',
      title: 'ATUR PEMBELAJARAN',
      icon: MenuBookIcon,
      items: [
        { name: 'Perangkat Ajar', path: '/admin/perangkat-ajar', icon: FolderOpenIcon },
        { name: 'Data KBM', path: '/admin/kbm-data', icon: AccessTimeIcon },
        { name: 'Aturan Kehadiran', path: '/admin/attendance-rules', icon: LocationOnIcon },
        { name: 'Bebas Kehadiran', path: '/admin/free-attendance', icon: EventBusyIcon },
        { name: 'Otomasi Presensi Guru', path: '/admin/settings?tab=wa-guru', icon: FactCheckIcon },
      ]
    },
    {
      id: 'laporan',
      title: 'LAPORAN',
      icon: AssessmentIcon,
      items: [
        { name: 'Laporan Presensi Siswa', path: '/admin/reports', icon: DescriptionIcon },
        { name: 'Laporan Kehadiran Guru', path: '/admin/teacher-attendance-reports', icon: FactCheckIcon },
        { name: 'Laporan Jurnal KBM', path: '/admin/laporan-jurnal-kbm', icon: MenuBookIcon },
      ]
    },
    {
      id: 'pengaturan',
      title: 'PENGATURAN UMUM',
      icon: TuneIcon,
      items: [
        { name: 'Database', path: '/admin/database', icon: StorageIcon },
        { name: 'Atur Gateway', path: '/admin/settings?tab=gateway', icon: RouterIcon },
        { name: 'Atur Akun', path: '/admin/settings?tab=akun', icon: AdminPanelSettingsIcon },
        { name: 'Tema', path: '/admin/settings?tab=theme', icon: PaletteIcon },
      ]
    }
  ];

  // Default kelompok menu dalam kondisi collapse / tertutup sesuai instruksi
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const isItemActive = (itemPath: string) => {
    if (itemPath.includes('?')) {
      const currentFull = location.pathname + location.search;
      if (currentFull === itemPath) return true;
      if (itemPath === '/admin/settings?tab=info' && location.pathname === '/admin/settings' && !location.search) {
        return true;
      }
      if (itemPath === '/admin/settings?tab=wa-siswa' && (currentFull === '/admin/settings?tab=wa' || currentFull === '/admin/settings?tab=wa-siswa')) {
        return true;
      }
      if (itemPath === '/admin/settings?tab=tampilan-suara' && (currentFull === '/admin/settings?tab=tampilan-suara' || currentFull === '/admin/settings?tab=perangkat' || currentFull === '/admin/settings?tab=theme')) {
        return true;
      }
      return false;
    }
    if (itemPath === '/admin/settings') {
      return location.pathname === '/admin/settings' && !location.search;
    }
    return location.pathname === itemPath;
  };

  const allNavItems = [
    { name: 'Dashboard', path: '/admin' },
    ...menuGroups.flatMap(g => g.items),
    { name: 'Pengaturan Umum', path: '/admin/settings' }
  ];

  const isDashboardActive = location.pathname === '/admin' && !location.search;

  const [previewAnchorEl, setPreviewAnchorEl] = useState<null | HTMLElement>(null);
  const isPreviewMenuOpen = Boolean(previewAnchorEl);

  const handleOpenPreviewMenu = (event: React.MouseEvent<HTMLElement>) => {
    setPreviewAnchorEl(event.currentTarget);
  };

  const handleClosePreviewMenu = () => {
    setPreviewAnchorEl(null);
  };

  const handleImpersonate = async (
    payload: { targetRole: string; targetName?: string; targetClass?: string; targetSubject?: string },
    roleLabel: string
  ) => {
    handleClosePreviewMenu();
    try {
      const res = await axios.post('/api/admin/impersonate', payload);
      if (res.data && res.data.success) {
        const user = res.data.user;
        const token = res.data.token;
        const redirectUrl = res.data.redirectUrl;

        // Backup current admin session safely
        const currentAdminSession = {
          auth: safeStorage.getItem('auth') || 'true',
          user: safeStorage.getItem('user'),
          token: safeStorage.getItem('token'),
          admin_token: safeStorage.getItem('admin_token'),
          adminUsername: safeStorage.getItem('adminUsername')
        };
        safeStorage.setItem('admin_backup_session', JSON.stringify(currentAdminSession));

        // Set preview flags
        safeStorage.setItem('is_preview_mode', 'true');
        safeStorage.setItem('preview_origin_role', 'admin');
        safeStorage.setItem('preview_target_info', JSON.stringify({
          name: user?.name || payload.targetName || roleLabel,
          role: user?.role || payload.targetRole,
          class: user?.class || payload.targetClass || ''
        }));

        if (user?.role === 'PIKET' || payload.targetRole === 'PIKET') {
          safeStorage.setItem('piket_auth', 'true');
          safeStorage.setItem('piket_user', JSON.stringify(user));
          if (token) {
            safeStorage.setItem('piket_token', token);
            safeStorage.setItem('token', token);
          }
        } else if (user?.role === 'SISWA' || payload.targetRole === 'SISWA') {
          safeStorage.setItem('siswa_auth', 'true');
          safeStorage.setItem('siswa_user', JSON.stringify(user));
          if (token) {
            safeStorage.setItem('siswa_token', token);
            safeStorage.setItem('token', token);
          }
        } else {
          safeStorage.setItem('guru_auth', 'true');
          safeStorage.setItem('guru_user', JSON.stringify(user));
          if (token) {
            safeStorage.setItem('guru_token', token);
            safeStorage.setItem('token', token);
          }
        }

        window.dispatchEvent(new Event('previewModeChanged'));

        // Bersihkan toast yang ada sebelumnya agar tidak bertumpuk
        toast.dismiss();

        const toastId = 'preview-status-toast';
        toast.success(`Membuka ${roleLabel} (Mode Pratinjau)`, {
          id: toastId,
          icon: '👁️',
          duration: 2200
        });

        // Safety auto-dismiss fallback jika route transition menunda timer internal
        setTimeout(() => {
          toast.dismiss(toastId);
        }, 2300);
        
        // Alihkan langsung ke portal tujuan dengan routing SPA mulus sama persis dengan kartu aksi /admin/pratinjau
        navigate(redirectUrl || (payload.targetRole === 'PIKET' ? '/piket/dashboard' : '/guru/portal'));
      } else {
        toast.error(res.data?.error || 'Gagal memulai mode pratinjau');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal memulai mode pratinjau');
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: isAquaGlass ? 'transparent' : 'background.default' }}>
      {/* Dynamic Collapsible Sidebar */}
      <Drawer
        variant="permanent"
        className="no-print"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '@media print': { display: 'none !important' },
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          [`& .MuiDrawer-paper`]: { 
            width: drawerWidth, 
            boxSizing: 'border-box',
            backgroundColor: isAquaGlass
              ? (isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.70)')
              : activeThemePreset.sidebarBg,
            backdropFilter: isAquaGlass ? 'blur(20px) saturate(180%)' : undefined,
            WebkitBackdropFilter: isAquaGlass ? 'blur(20px) saturate(180%)' : undefined,
            color: isAquaGlass ? (isDark ? '#fff' : '#0f172a') : '#fff',
            borderRight: isAquaGlass
              ? (isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(255, 255, 255, 0.85)')
              : 'none',
            overflowX: 'hidden',
            transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: isAquaGlass
              ? (isDark ? '0 8px 32px 0 rgba(0, 0, 0, 0.45)' : '0 8px 32px 0 rgba(2, 132, 199, 0.12)')
              : '0 4px 20px 0 rgba(0, 0, 0, 0.18), 0 7px 10px -5px rgba(0, 0, 0, 0.4)'
          },
        }}
      >
        {/* Sidebar Brand Header */}
        <Box 
          sx={{ 
            height: 68,
            px: collapsed ? 1.2 : 2, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: collapsed ? 'center' : 'space-between',
            borderBottom: isAquaGlass
              ? (isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.08)')
              : `1px solid ${sidebarBorderColor}` 
          }}
        >
          {!collapsed ? (
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', overflow: 'hidden' }}>
              {globalSettings.logoBase64 ? (
                <img
                  src={getSafeImageUrl(globalSettings.logoBase64)}
                  alt="Logo"
                  onError={(e) => handleImageError(e, DEFAULT_SCHOOL_LOGO_SVG)}
                  style={{ height: 32, width: 32, minWidth: 32, objectFit: 'contain' }}
                />
              ) : (
                <SchoolIcon sx={{ color: activeThemePreset.accent, fontSize: 28 }} />
              )}
              <Typography variant="subtitle1" sx={{ fontWeight: 800, letterSpacing: 0.5, whiteSpace: 'nowrap', color: sidebarTextColor }} noWrap>
                {globalSettings.websiteName || 'Admin Presensi'}
              </Typography>
            </Stack>
          ) : (
            <Tooltip title={globalSettings.websiteName || 'Admin Presensi'} placement="right">
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                {globalSettings.logoBase64 ? (
                  <img
                    src={getSafeImageUrl(globalSettings.logoBase64)}
                    alt="Logo"
                    onError={(e) => handleImageError(e, DEFAULT_SCHOOL_LOGO_SVG)}
                    style={{ height: 28, width: 28, minWidth: 28, objectFit: 'contain' }}
                  />
                ) : (
                  <SchoolIcon sx={{ color: activeThemePreset.accent, fontSize: 28 }} />
                )}
              </Box>
            </Tooltip>
          )}

          {/* Single Modern Arrow Toggle Button Attached directly to Sidebar Header */}
          <Tooltip title={collapsed ? "Buka Sidebar" : "Tutup Sidebar"} placement={collapsed ? "right" : "bottom"} arrow>
            <IconButton
              size="small"
              onClick={toggleSidebar}
              sx={{
                color: isSidebarDark ? 'rgba(255, 255, 255, 0.85)' : '#0f172a',
                bgcolor: isSidebarDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                border: `1px solid ${sidebarBorderColor}`,
                p: 0.6,
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: isSidebarDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                  color: isSidebarDark ? '#ffffff' : '#0f172a'
                }
              }}
            >
              {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Navigation List with Modern Collapsible Groups */}
        <Box sx={{ overflowY: 'auto', overflowX: 'hidden', flex: 1, py: 1.5 }}>
          <List sx={{ px: collapsed ? 1 : 1.5 }}>
            {/* Top Dashboard Button */}
            <ListItem disablePadding sx={{ display: 'block', mb: 1 }}>
              {collapsed ? (
                <Tooltip title="Dashboard" placement="right" arrow>
                  <ListItemButton
                    component={RouterLink}
                    to="/admin"
                    sx={{
                      px: 0,
                      py: 1.25,
                      borderRadius: '10px',
                      justifyContent: 'center',
                      background: isDashboardActive ? sidebarActiveGradient : 'transparent',
                      boxShadow: isDashboardActive ? '0 4px 14px 0 rgba(0, 0, 0, 0.25)' : 'none',
                      transition: 'all 0.15s ease-in-out',
                      '&:hover': {
                        bgcolor: isDashboardActive ? 'inherit' : sidebarHoverBg,
                      }
                    }}
                  >
                    <ListItemIcon sx={{ color: isDashboardActive ? '#ffffff' : sidebarItemIconColor, minWidth: 'auto', justifyContent: 'center' }}>
                      <DashboardIcon fontSize="small" />
                    </ListItemIcon>
                  </ListItemButton>
                </Tooltip>
              ) : (
                <ListItemButton
                  component={RouterLink}
                  to="/admin"
                  sx={{
                    px: 2,
                    py: 1.25,
                    borderRadius: '10px',
                    background: isDashboardActive ? sidebarActiveGradient : 'transparent',
                    boxShadow: isDashboardActive ? '0 4px 14px 0 rgba(0, 0, 0, 0.25)' : 'none',
                    transition: 'all 0.15s ease-in-out',
                    '&:hover': {
                      bgcolor: isDashboardActive ? 'inherit' : sidebarHoverBg,
                    }
                  }}
                >
                  <ListItemIcon sx={{ color: isDashboardActive ? '#ffffff' : sidebarItemIconColor, minWidth: 36 }}>
                    <DashboardIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        sx={{
                          color: isDashboardActive ? '#ffffff' : sidebarItemSubTextColor,
                          fontWeight: isDashboardActive ? 700 : 600,
                          letterSpacing: 0.2
                        }}
                        noWrap
                      >
                        Dashboard
                      </Typography>
                    }
                  />
                </ListItemButton>
              )}
            </ListItem>

            {/* Divider */}
            <Divider sx={{ my: 1.25, borderColor: sidebarBorderColor }} />

            {/* Grouped Menus */}
            {menuGroups.map((group) => {
              const isOpen = !!openGroups[group.id];
              const hasActiveChild = group.items.some(item => isItemActive(item.path));

              if (collapsed) {
                // Collapsed (Icon-Only Mode)
                return (
                  <Box key={group.id} sx={{ mb: 1.5 }}>
                    <Tooltip title={group.title} placement="right" arrow>
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 0.5 }}>
                        <group.icon sx={{ fontSize: 16, color: sidebarCategoryColor }} />
                      </Box>
                    </Tooltip>
                    {group.items.map((item) => {
                      const active = isItemActive(item.path);
                      return (
                        <ListItem key={item.path} disablePadding sx={{ display: 'block', mb: 0.5 }}>
                          <Tooltip title={item.name} placement="right" arrow>
                            <ListItemButton
                              component={RouterLink}
                              to={item.path}
                              sx={{
                                px: 0,
                                py: 1.1,
                                borderRadius: '10px',
                                justifyContent: 'center',
                                background: active ? sidebarActiveGradient : 'transparent',
                                boxShadow: active ? '0 4px 14px 0 rgba(0, 0, 0, 0.25)' : 'none',
                                transition: 'all 0.15s ease-in-out',
                                '&:hover': {
                                  bgcolor: active ? 'inherit' : sidebarHoverBg,
                                }
                              }}
                            >
                              <ListItemIcon sx={{ color: active ? '#ffffff' : sidebarItemIconColor, minWidth: 'auto', justifyContent: 'center' }}>
                                <item.icon fontSize="small" />
                              </ListItemIcon>
                            </ListItemButton>
                          </Tooltip>
                        </ListItem>
                      );
                    })}
                  </Box>
                );
              }

              // Expanded Mode with Modern Collapse & Expand
              return (
                <Box key={group.id} sx={{ mb: 1 }}>
                  {/* Group Header Button with Expand/Collapse */}
                  <ListItemButton
                    onClick={() => toggleGroup(group.id)}
                    sx={{
                      px: 1.5,
                      py: 0.85,
                      borderRadius: '8px',
                      color: hasActiveChild ? (isSidebarDark ? '#fff' : preset.primary) : sidebarCategoryColor,
                      bgcolor: hasActiveChild && !isOpen ? (isSidebarDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)') : 'transparent',
                      transition: 'all 0.15s ease-in-out',
                      '&:hover': {
                        bgcolor: sidebarHoverBg,
                        color: isSidebarDark ? '#fff' : '#0f172a'
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
                      <group.icon sx={{ fontSize: 18, opacity: 0.9 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 800,
                            letterSpacing: 0.8,
                            textTransform: 'uppercase',
                            fontSize: '0.74rem',
                            color: 'inherit'
                          }}
                        >
                          {group.title}
                        </Typography>
                      }
                    />
                    {isOpen ? (
                      <ExpandLess sx={{ fontSize: 18, opacity: 0.8 }} />
                    ) : (
                      <ExpandMore sx={{ fontSize: 18, opacity: 0.8 }} />
                    )}
                  </ListItemButton>

                  {/* Collapsible Children List */}
                  <Collapse in={isOpen} timeout="auto" unmountOnExit>
                    <List disablePadding sx={{ pl: 1, pt: 0.5 }}>
                      {group.items.map((item) => {
                        const active = isItemActive(item.path);
                        return (
                          <ListItem key={item.path} disablePadding sx={{ display: 'block', mb: 0.5 }}>
                            <ListItemButton
                              component={RouterLink}
                              to={item.path}
                              sx={{
                                pl: 2,
                                pr: 1.5,
                                py: 1,
                                borderRadius: '9px',
                                background: active ? sidebarActiveGradient : 'transparent',
                                boxShadow: active ? '0 4px 14px 0 rgba(0, 0, 0, 0.22)' : 'none',
                                transition: 'all 0.15s ease-in-out',
                                '&:hover': {
                                  bgcolor: active ? 'inherit' : sidebarHoverBg,
                                }
                              }}
                            >
                              <ListItemIcon
                                sx={{
                                  color: active ? '#ffffff' : sidebarItemIconColor,
                                  minWidth: 34,
                                  justifyContent: 'flex-start'
                                }}
                              >
                                <item.icon sx={{ fontSize: 19 }} />
                              </ListItemIcon>
                              <ListItemText
                                primary={
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      color: active ? '#ffffff' : sidebarItemSubTextColor,
                                      fontWeight: active ? 700 : 500,
                                      fontSize: '0.86rem',
                                      letterSpacing: 0.1
                                    }}
                                    noWrap
                                  >
                                    {item.name}
                                  </Typography>
                                }
                              />
                            </ListItemButton>
                          </ListItem>
                        );
                      })}
                    </List>
                  </Collapse>
                </Box>
              );
            })}
          </List>
        </Box>

        {/* Bottom Sign Out */}
        <Box sx={{ p: collapsed ? 1 : 2, borderTop: `1px solid ${sidebarBorderColor}` }}>
          {collapsed ? (
            <Tooltip title="Keluar / Sign Out" placement="right">
              <IconButton
                onClick={handleLogout}
                sx={{
                  width: '100%',
                  color: sidebarItemIconColor,
                  borderRadius: '10px',
                  '&:hover': { color: '#ef4444', bgcolor: isSidebarDark ? 'rgba(255,255,255,0.1)' : 'rgba(239, 68, 68, 0.08)' }
                }}
              >
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : (
            <Button
              fullWidth
              variant="text"
              onClick={handleLogout}
              startIcon={<LogoutIcon />}
              sx={{
                color: sidebarItemIconColor,
                justifyContent: 'flex-start',
                px: 2,
                py: 1.25,
                borderRadius: '10px',
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': { color: '#ef4444', bgcolor: isSidebarDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(239, 68, 68, 0.08)' }
              }}
            >
              Sign Out
            </Button>
          )}
        </Box>
      </Drawer>

      {/* Main Content Area */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, '@media print': { overflow: 'visible !important', height: 'auto !important' } }}>
        <AppBar 
          position="static" 
          color="transparent" 
          elevation={0}
          className="no-print"
          sx={{ 
            bgcolor: isAquaGlass
              ? (isDark ? 'rgba(15, 23, 42, 0.60)' : 'rgba(255, 255, 255, 0.65)')
              : 'background.paper', 
            borderBottom: isAquaGlass
              ? (isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(255, 255, 255, 0.75)')
              : '1px solid #e2e8f0',
            backdropFilter: isAquaGlass ? 'blur(20px) saturate(180%)' : 'blur(8px)',
            WebkitBackdropFilter: isAquaGlass ? 'blur(20px) saturate(180%)' : 'blur(8px)',
            boxShadow: isAquaGlass
              ? (isDark ? '0 4px 20px -2px rgba(0, 0, 0, 0.4)' : '0 4px 20px -2px rgba(2, 132, 199, 0.08)')
              : 'none',
            '@media print': { display: 'none !important' }
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 3 }, minHeight: '64px !important' }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 700 }}>
                {allNavItems.find(n => isItemActive(n.path))?.name || 'Administrator System'}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Button
                component="a"
                href="/piket"
                target="_blank"
                variant="outlined"
                color="warning"
                size="small"
                startIcon={<EventNoteIcon fontSize="small" />}
                endIcon={<OpenInNewIcon fontSize="small" />}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: 2,
                  px: 1.8,
                  borderColor: 'warning.main',
                  color: 'warning.dark',
                  bgcolor: 'warning.lighter',
                  '&:hover': { bgcolor: 'warning.light', borderColor: 'warning.dark' }
                }}
              >
                Buka Portal Piket
              </Button>

              <Button
                component="a"
                href="/guru/login"
                target="_blank"
                variant="outlined"
                color="success"
                size="small"
                startIcon={<SchoolIcon fontSize="small" />}
                endIcon={<OpenInNewIcon fontSize="small" />}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: 2,
                  px: 1.8,
                  borderColor: 'success.main',
                  color: 'success.dark',
                  bgcolor: 'success.lighter',
                  '&:hover': { bgcolor: 'success.light', borderColor: 'success.dark' }
                }}
              >
                Buka Akses Data Guru
              </Button>

              <Button 
                component="a" 
                href="/" 
                target="_blank" 
                variant="contained"
                color="primary" 
                size="small"
                endIcon={<OpenInNewIcon fontSize="small" />}
                sx={{ 
                  textTransform: 'none', 
                  fontWeight: 700, 
                  borderRadius: 2,
                  px: 2
                }}
              >
                Buka Portal Scanner
              </Button>

              {/* Fitur Dropdown Pratinjau / Impersonasi Multi-Peran */}
              <Button
                variant="contained"
                size="small"
                onClick={handleOpenPreviewMenu}
                startIcon={<VisibilityIcon fontSize="small" />}
                endIcon={<KeyboardArrowDownIcon fontSize="small" />}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: 2,
                  px: 1.8,
                  bgcolor: '#6366f1',
                  color: '#ffffff',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
                  '&:hover': { bgcolor: '#4f46e5' }
                }}
              >
                Pratinjau Portal
              </Button>

              {/* Toggle Dark / Light Mode Khusus Portal Admin */}
              <Tooltip title={isDark ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"} arrow>
                <IconButton
                  onClick={() => toggleDark('admin')}
                  sx={{
                    bgcolor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.05)',
                    color: isDark ? '#facc15' : '#0f172a',
                    border: isAquaGlass
                      ? (isDark ? '1px solid rgba(255, 255, 255, 0.20)' : '1px solid rgba(0, 0, 0, 0.12)')
                      : '1px solid #cbd5e1',
                    p: 0.9,
                    borderRadius: 2,
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      bgcolor: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.10)',
                      transform: 'scale(1.05)'
                    }
                  }}
                  aria-label="Toggle Dark/Light Mode"
                >
                  {isDark ? <LightModeIcon sx={{ fontSize: 20 }} /> : <DarkModeIcon sx={{ fontSize: 20 }} />}
                </IconButton>
              </Tooltip>

              <Menu
                anchorEl={previewAnchorEl}
                open={isPreviewMenuOpen}
                onClose={handleClosePreviewMenu}
                slotProps={{
                  paper: {
                    sx: {
                      borderRadius: 2.5,
                      boxShadow: '0 12px 32px -4px rgba(15, 23, 42, 0.18)',
                      minWidth: 290,
                      mt: 1.2,
                      p: 0.5,
                      border: '1px solid #e2e8f0'
                    }
                  }
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    Mode Pratinjau / Impersonasi
                  </Typography>
                </Box>
                <Divider sx={{ my: 0.5 }} />
                <MenuItem 
                  onClick={() => handleImpersonate({ targetRole: 'PIKET', targetName: 'Guru Piket (Pratinjau)' }, 'Portal Guru Piket')} 
                  sx={{ borderRadius: 1.5, py: 1 }}
                >
                  <ListItemIcon><EventNoteIcon fontSize="small" sx={{ color: '#f59e0b' }} /></ListItemIcon>
                  <ListItemText primary={<Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>Pratinjau Portal Piket</Typography>} />
                </MenuItem>
                <MenuItem 
                  onClick={() => handleImpersonate({ targetRole: 'KEPALA_SEKOLAH', targetName: 'Drs. H. Mulyadi, M.Pd. (Kepala Sekolah)' }, 'Kepala Sekolah')} 
                  sx={{ borderRadius: 1.5, py: 1 }}
                >
                  <ListItemIcon><SchoolIcon fontSize="small" sx={{ color: '#0284c7' }} /></ListItemIcon>
                  <ListItemText primary={<Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>Pratinjau Kepala Sekolah</Typography>} />
                </MenuItem>
                <MenuItem 
                  onClick={() => handleImpersonate({ targetRole: 'WAKIL_KURIKULUM', targetName: 'Budi Santoso, S.Kom. (Waka Kurikulum)', targetSubject: 'Informatika' }, 'Waka Kurikulum')} 
                  sx={{ borderRadius: 1.5, py: 1 }}
                >
                  <ListItemIcon><AssignmentIndIcon fontSize="small" sx={{ color: '#7c3aed' }} /></ListItemIcon>
                  <ListItemText primary={<Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>Pratinjau Waka Kurikulum</Typography>} />
                </MenuItem>
                <MenuItem 
                  onClick={() => handleImpersonate({ targetRole: 'WAKIL_KESISWAAN', targetName: 'Drs. Bambang Sudiro (Waka Kesiswaan)', targetSubject: 'Pendidikan Jasmani' }, 'Waka Kesiswaan')} 
                  sx={{ borderRadius: 1.5, py: 1 }}
                >
                  <ListItemIcon><BadgeIcon fontSize="small" sx={{ color: '#ea580c' }} /></ListItemIcon>
                  <ListItemText primary={<Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>Pratinjau Waka Kesiswaan</Typography>} />
                </MenuItem>
                <MenuItem 
                  onClick={() => handleImpersonate({ targetRole: 'GURU_BK', targetName: 'Nurul Hidayah, S.Pd. (Guru BK)', targetSubject: 'Bimbingan Konseling' }, 'Guru BK')} 
                  sx={{ borderRadius: 1.5, py: 1 }}
                >
                  <ListItemIcon><PeopleIcon fontSize="small" sx={{ color: '#db2777' }} /></ListItemIcon>
                  <ListItemText primary={<Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>Pratinjau Guru BK</Typography>} />
                </MenuItem>
                <MenuItem 
                  onClick={() => handleImpersonate({ targetRole: 'WALI_KELAS', targetName: 'Siti Rahma, M.Pd. (Wali Kelas X RPL 1)', targetClass: 'X RPL 1', targetSubject: 'Matematika' }, 'Wali Kelas')} 
                  sx={{ borderRadius: 1.5, py: 1 }}
                >
                  <ListItemIcon><ClassIcon fontSize="small" sx={{ color: '#059669' }} /></ListItemIcon>
                  <ListItemText primary={<Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>Pratinjau Wali Kelas</Typography>} />
                </MenuItem>
                <MenuItem 
                  onClick={() => handleImpersonate({ targetRole: 'GURU', targetName: 'Ahmad Fauzi, S.T. (Guru Mapel Reguler)', targetSubject: 'Pemrograman Web' }, 'Guru Mapel Reguler')} 
                  sx={{ borderRadius: 1.5, py: 1 }}
                >
                  <ListItemIcon><MenuBookIcon fontSize="small" sx={{ color: '#2563eb' }} /></ListItemIcon>
                  <ListItemText primary={<Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>Pratinjau Guru Mapel Reguler</Typography>} />
                </MenuItem>
                <Divider sx={{ my: 0.5 }} />
                <MenuItem 
                  onClick={() => {
                    handleClosePreviewMenu();
                    navigate('/admin/pratinjau');
                  }} 
                  sx={{ 
                    borderRadius: 1.5, 
                    py: 1, 
                    bgcolor: alpha('#6366f1', 0.06), 
                    '&:hover': { bgcolor: alpha('#6366f1', 0.14) } 
                  }}
                >
                  <ListItemIcon><TuneIcon fontSize="small" sx={{ color: '#6366f1' }} /></ListItemIcon>
                  <ListItemText 
                    primary={<Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#6366f1' }}>Kelola Pratinjau</Typography>} 
                    secondary={<Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>Buka halaman manajemen impersonasi</Typography>} 
                  />
                </MenuItem>
              </Menu>
            </Stack>
          </Toolbar>
        </AppBar>

        <Box 
          component="main" 
          sx={{ 
            flexGrow: 1, 
            p: { xs: 2, md: 3.5 }, 
            bgcolor: globalSettings.backgroundImage ? 'transparent' : 'background.default',
            backgroundImage: globalSettings.backgroundImage 
              ? (isDark 
                  ? `linear-gradient(rgba(11, 15, 25, 0.92), rgba(11, 15, 25, 0.95)), url(${globalSettings.backgroundImage})` 
                  : `linear-gradient(rgba(244, 247, 251, 0.9), rgba(244, 247, 251, 0.94)), url(${globalSettings.backgroundImage})`) 
              : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
            overflowY: 'auto' 
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
