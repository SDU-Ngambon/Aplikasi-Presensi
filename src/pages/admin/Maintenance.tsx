import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Switch,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Divider,
  Alert,
  CircularProgress,
  Tooltip,
  useTheme,
  alpha
} from '@mui/material';
import {
  Build as BuildIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  School as SchoolIcon,
  Badge as BadgeIcon,
  AssignmentInd as AssignmentIndIcon,
  People as PeopleIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';
import { safeStorage } from '../../safeStorage';
import { DEFAULT_MENU_SETTINGS, MenuSettingItem } from '../../config/menuSettings';

export default function Maintenance() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuSettingItem[]>(DEFAULT_MENU_SETTINGS);

  const fetchMenuSettings = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/menu-settings');
      if (res.data && res.data.data) {
        setMenuItems(res.data.data);
        safeStorage.setItem('menu_settings_cache', JSON.stringify(res.data.map || {}));
      }
    } catch (e: any) {
      console.warn('Gagal mengambil data menu dari server, menggunakan cache lokal:', e);
      const cached = safeStorage.getJSON<Record<string, boolean>>('menu_settings_cache', null);
      if (cached) {
        setMenuItems(prev => prev.map(m => ({
          ...m,
          is_enabled: cached[m.menu_key] !== false
        })));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuSettings();
  }, []);

  const handleToggle = async (menu_key: string, currentVal: boolean) => {
    const nextVal = !currentVal;
    // Optimistic UI update
    setMenuItems(prev => prev.map(m => m.menu_key === menu_key ? { ...m, is_enabled: nextVal } : m));

    try {
      await axios.put(`/api/menu-settings/${menu_key}`, { is_enabled: nextVal });
      // Update local storage cache
      const cached = safeStorage.getJSON<Record<string, boolean>>('menu_settings_cache', {});
      cached[menu_key] = nextVal;
      safeStorage.setItem('menu_settings_cache', JSON.stringify(cached));
      window.dispatchEvent(new Event('menuSettingsChanged'));
      toast.success(`Menu ${nextVal ? 'diaktifkan' : 'dinonaktifkan'}`);
    } catch (e: any) {
      // Revert if error
      setMenuItems(prev => prev.map(m => m.menu_key === menu_key ? { ...m, is_enabled: currentVal } : m));
      toast.error('Gagal memperbarui status menu di server');
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const map: Record<string, boolean> = {};
      menuItems.forEach(m => {
        map[m.menu_key] = m.is_enabled;
      });

      await axios.put('/api/menu-settings', { settings: map });
      safeStorage.setItem('menu_settings_cache', JSON.stringify(map));
      window.dispatchEvent(new Event('menuSettingsChanged'));
      toast.success('Seluruh konfigurasi menu berhasil disimpan!');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Gagal menyimpan konfigurasi menu');
    } finally {
      setSaving(false);
    }
  };

  const handleSetAllCategory = (cat: 'all' | 'kepsek' | 'tugas-tambahan' | 'guru' | 'siswa', enabled: boolean) => {
    setMenuItems(prev => prev.map(m => {
      if (cat === 'all' || m.category === cat) {
        return { ...m, is_enabled: enabled };
      }
      return m;
    }));
    toast.success(`Seluruh menu ${cat === 'all' ? 'aplikasi' : cat} diatur menjadi ${enabled ? 'Aktif' : 'Nonaktif'}`);
  };

  // Filter items by search query and category
  const categories: Array<{ id: 'kepsek' | 'tugas-tambahan' | 'guru' | 'siswa'; label: string; icon: any }> = [
    { id: 'kepsek', label: 'Portal Kepala Sekolah', icon: SchoolIcon },
    { id: 'tugas-tambahan', label: 'Tugas Tambahan Guru', icon: BadgeIcon },
    { id: 'guru', label: 'Portal Guru (KBM)', icon: AssignmentIndIcon },
    { id: 'siswa', label: 'Portal Siswa', icon: PeopleIcon }
  ];

  const currentCategory = categories[activeTab]?.id || 'kepsek';

  const filteredItems = menuItems.filter(item => {
    const matchCategory = item.category === currentCategory;
    const matchQuery = !searchQuery.trim() ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.menu_key.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchQuery;
  });

  const totalActive = menuItems.filter(m => m.is_enabled).length;
  const totalDisabled = menuItems.filter(m => !m.is_enabled).length;

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Page Header */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3 },
          borderRadius: 3.5,
          bgcolor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#ffffff',
          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`,
          mb: 3
        }}
      >
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.8 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 3,
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                color: theme.palette.primary.main,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.25)}`
              }}
            >
              <BuildIcon sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: -0.5 }}>
                  Manajemen Menu & Maintenance
                </Typography>
                <Chip
                  label="Role-Based Access"
                  size="small"
                  sx={{
                    fontWeight: 700,
                    fontSize: '11px',
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.3 }}>
                Aktifkan atau nonaktifkan menu untuk pengguna asli. Menu nonaktif akan disembunyikan di portal asli dan hanya dapat diakses melalui <b>Mode Pratinjau Admin</b>.
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon fontSize="small" />}
              onClick={fetchMenuSettings}
              disabled={loading}
              sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
            >
              Segarkan
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<SaveIcon fontSize="small" />}
              onClick={handleSaveAll}
              disabled={saving}
              sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
            >
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </Box>
        </Box>

        {/* Global Summary Chips */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 2.5, pt: 2, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}` }}>
          <Chip
            icon={<CheckCircleIcon sx={{ fontSize: '16px !important', color: '#10b981 !important' }} />}
            label={`Menu Aktif: ${totalActive} Menu`}
            size="small"
            sx={{
              fontWeight: 700,
              bgcolor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ecfdf5',
              color: isDark ? '#34d399' : '#047857',
              border: '1px solid rgba(16, 185, 129, 0.25)'
            }}
          />
          <Chip
            icon={<CancelIcon sx={{ fontSize: '16px !important', color: '#ef4444 !important' }} />}
            label={`Menu Dinonaktifkan: ${totalDisabled} Menu`}
            size="small"
            sx={{
              fontWeight: 700,
              bgcolor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2',
              color: isDark ? '#f87171' : '#b91c1c',
              border: '1px solid rgba(239, 68, 68, 0.25)'
            }}
          />
        </Box>
      </Paper>

      {/* Info Callout */}
      <Alert
        severity="info"
        icon={<InfoIcon fontSize="inherit" />}
        sx={{
          mb: 3,
          borderRadius: 3,
          bgcolor: isDark ? 'rgba(59, 130, 246, 0.12)' : '#eff6ff',
          color: isDark ? '#93c5fd' : '#1d4ed8',
          border: '1px solid rgba(59, 130, 246, 0.25)'
        }}
      >
        <strong>Fitur Bypass Menu Admin:</strong> Ketika status menu diatur ke <b>Nonaktif</b>, menu tersebut langsung hilang dari sidebar Guru/Kepsek/Siswa. Namun ketika Admin masuk menggunakan <b>Menu Pratinjau (Impersonation)</b>, menu tersebut tetap terlihat dengan label <b>"Disembunyikan"</b>.
      </Alert>

      {/* Search & Bulk Action Bar */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2.5 }}>
        <TextField
          size="small"
          placeholder="Cari nama menu atau deskripsi..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              )
            }
          }}
          sx={{
            width: { xs: '100%', sm: 320 },
            '& .MuiOutlinedInput-root': {
              borderRadius: 2.5,
              bgcolor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#ffffff'
            }
          }}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => handleSetAllCategory(currentCategory, true)}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}
          >
            Aktifkan Semua Kategori Ini
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={() => handleSetAllCategory(currentCategory, false)}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}
          >
            Nonaktifkan Semua Kategori Ini
          </Button>
        </Box>
      </Box>

      {/* Category Tabs */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3.5,
          bgcolor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#ffffff',
          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`,
          overflow: 'hidden'
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 2,
            pt: 1,
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.9rem',
              minHeight: 52,
              gap: 1
            }
          }}
        >
          {categories.map((cat, idx) => {
            const Icon = cat.icon;
            const countInCat = menuItems.filter(m => m.category === cat.id).length;
            const disabledInCat = menuItems.filter(m => m.category === cat.id && !m.is_enabled).length;

            return (
              <Tab
                key={cat.id}
                icon={<Icon fontSize="small" />}
                iconPosition="start"
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>{cat.label}</span>
                    {disabledInCat > 0 ? (
                      <Chip
                        label={`${disabledInCat} Nonaktif`}
                        size="small"
                        color="error"
                        sx={{ height: 18, fontSize: '10px', fontWeight: 800 }}
                      />
                    ) : (
                      <Chip
                        label={`${countInCat}`}
                        size="small"
                        sx={{ height: 18, fontSize: '10px', fontWeight: 700 }}
                      />
                    )}
                  </Box>
                }
              />
            );
          })}
        </Tabs>

        {/* Tab Content / List of Menus */}
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {loading ? (
            <Box sx={{ py: 6, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
              <CircularProgress size={28} />
              <Typography variant="body2" color="text.secondary">
                Memuat konfigurasi menu...
              </Typography>
            </Box>
          ) : filteredItems.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Tidak ada menu yang sesuai dengan pencarian "{searchQuery}".
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {filteredItems.map((item) => {
                const isEnabled = item.is_enabled;

                return (
                  <Grid size={{ xs: 12, md: 6 }} key={item.menu_key}>
                    <Card
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: isEnabled
                          ? (isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0')
                          : (isDark ? 'rgba(239, 68, 68, 0.3)' : '#fca5a5'),
                        bgcolor: isEnabled
                          ? (isDark ? 'rgba(15, 23, 42, 0.4)' : '#f8fafc')
                          : (isDark ? 'rgba(239, 68, 68, 0.05)' : '#fff1f2'),
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                        '&:hover': {
                          transform: 'translateY(-1.5px)',
                          boxShadow: isDark
                            ? '0 6px 16px rgba(0,0,0,0.4)'
                            : '0 6px 16px rgba(0,0,0,0.06)'
                        }
                      }}
                    >
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                            {item.name}
                          </Typography>
                          <Chip
                            label={item.menu_key}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '10px',
                              fontFamily: 'monospace',
                              bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0',
                              color: 'text.secondary'
                            }}
                          />
                        </Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.35 }}>
                          {item.description}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                        <Chip
                          icon={isEnabled ? <VisibilityIcon sx={{ fontSize: '14px !important' }} /> : <VisibilityOffIcon sx={{ fontSize: '14px !important' }} />}
                          label={isEnabled ? 'Aktif' : 'Nonaktif'}
                          size="small"
                          color={isEnabled ? 'success' : 'default'}
                          variant={isEnabled ? 'filled' : 'outlined'}
                          sx={{
                            fontWeight: 700,
                            fontSize: '11px',
                            minWidth: 84
                          }}
                        />

                        <Switch
                          checked={isEnabled}
                          onChange={() => handleToggle(item.menu_key, isEnabled)}
                          color="primary"
                        />
                      </Box>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
