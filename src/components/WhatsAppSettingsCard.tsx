import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  Stack,
  Divider,
  Alert,
  FormGroup,
  Checkbox,
  CircularProgress,
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Switch,
  Tooltip
} from '@mui/material';
import {
  Save as SaveIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  Wifi as WifiIcon,
  Schedule as ScheduleIcon,
  PlayArrow as PlayArrowIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Group as GroupIcon,
  Check as CheckIcon,
  Router as RouterIcon,
  OpenInNew as OpenInNewIcon,
  WarningAmber as WarningIcon
} from '@mui/icons-material';

export interface WhatsAppGroup {
  id: string;
  name: string;
  targetId: string;
  description?: string;
  isActive: boolean;
  isDefault?: boolean;
}

interface WhatsAppSettingsCardProps {
  onSaved?: () => void;
  initialSettings?: any;
}

const DAYS = [
  { id: '1', label: 'Senin' },
  { id: '2', label: 'Selasa' },
  { id: '3', label: 'Rabu' },
  { id: '4', label: 'Kamis' },
  { id: '5', label: 'Jumat' },
  { id: '6', label: 'Sabtu' },
  { id: '0', label: 'Minggu' }
];

function getCachedWASettings() {
  try {
    const saved = localStorage.getItem('wa_settings_cache');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return null;
}

export default function WhatsAppSettingsCard({ onSaved, initialSettings }: WhatsAppSettingsCardProps) {
  const cached = getCachedWASettings();
  const init = initialSettings || cached || {};

  // Gateway Centralized Info
  const [gatewayConfigured, setGatewayConfigured] = useState(false);
  const [activeProvider, setActiveProvider] = useState('fonnte');
  const [activeApiUrl, setActiveApiUrl] = useState('https://api.fonnte.com/send');

  const [waMode, setWaMode] = useState<'manual' | 'auto'>(init.waMode || init.wa_mode || 'manual');
  const [waTarget, setWaTarget] = useState<'group' | 'individual' | 'both'>(init.waTarget || init.wa_target || 'both');
  const [waGroupId, setWaGroupId] = useState(init.waGroupId || init.wa_group_id || '');
  const [waGroupName, setWaGroupName] = useState(init.waGroupName || init.wa_group_name || 'Grup Presensi SMK');
  const [waGroups, setWaGroups] = useState<WhatsAppGroup[]>(() => {
    const raw = init.waGroups || init.wa_groups;
    if (Array.isArray(raw) && raw.length > 0) return raw;
    if (init.waGroupId || init.wa_group_id) {
      return [{
        id: 'group_default',
        name: init.waGroupName || init.wa_group_name || 'Grup Presensi SMK',
        targetId: init.waGroupId || init.wa_group_id,
        description: 'Grup WhatsApp Presensi Utama',
        isActive: true,
        isDefault: true
      }];
    }
    return [];
  });

  // Dialog & Form states for WhatsApp Group
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupFormName, setGroupFormName] = useState('');
  const [groupFormTargetId, setGroupFormTargetId] = useState('');
  const [groupFormDesc, setGroupFormDesc] = useState('');
  const [groupFormActive, setGroupFormActive] = useState(true);
  const [groupFormDefault, setGroupFormDefault] = useState(false);
  const [groupFormError, setGroupFormError] = useState('');

  // Per-group testing state
  const [testingGroupId, setTestingGroupId] = useState<string | null>(null);
  const [groupTestResult, setGroupTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  const [waCronTime, setWaCronTime] = useState(init.waCronTime || init.wa_cron_time || '15:00');
  const [waCronDays, setWaCronDays] = useState<string[]>(() => {
    const days = init.waCronDays || init.wa_cron_days;
    if (Array.isArray(days)) return days;
    if (typeof days === 'string') {
      try { return JSON.parse(days); } catch (e) {}
    }
    return ['1', '2', '3', '4', '5'];
  });

  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Broadcast now states
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<any | null>(null);

  const applyData = (data: any) => {
    if (!data) return;
    if (data.waApiKey || data.wa_api_key) {
      setGatewayConfigured(true);
    } else {
      setGatewayConfigured(false);
    }
    if (data.waProvider || data.wa_provider) {
      setActiveProvider(data.waProvider || data.wa_provider);
    }
    if (data.waApiUrl || data.wa_api_url) {
      setActiveApiUrl(data.waApiUrl || data.wa_api_url);
    }

    if (data.waMode || data.wa_mode) setWaMode(data.waMode || data.wa_mode);
    if (data.waTarget || data.wa_target) setWaTarget(data.waTarget || data.wa_target);
    if (data.waGroupId !== undefined || data.wa_group_id !== undefined) setWaGroupId(data.waGroupId ?? data.wa_group_id ?? '');
    if (data.waGroupName || data.wa_group_name) setWaGroupName(data.waGroupName || data.wa_group_name);
    if (data.waCronTime || data.wa_cron_time) setWaCronTime(data.waCronTime || data.wa_cron_time);
    const rawGroups = data.waGroups || data.wa_groups;
    if (Array.isArray(rawGroups) && rawGroups.length > 0) {
      setWaGroups(rawGroups);
    } else if (data.waGroupId || data.wa_group_id) {
      setWaGroups([{
        id: 'group_default',
        name: data.waGroupName || data.wa_group_name || 'Grup Presensi SMK',
        targetId: data.waGroupId || data.wa_group_id,
        description: 'Grup WhatsApp Presensi Utama',
        isActive: true,
        isDefault: true
      }]);
    }
    const rawDays = data.waCronDays || data.wa_cron_days;
    if (rawDays) {
      const days = typeof rawDays === 'string' ? JSON.parse(rawDays) : rawDays;
      if (Array.isArray(days)) setWaCronDays(days);
    }
  };

  useEffect(() => {
    if (initialSettings && (initialSettings.waProvider || initialSettings.waApiKey || initialSettings.wa_provider)) {
      applyData(initialSettings);
    } else {
      fetchSettings();
    }
  }, [initialSettings]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/settings');
      if (data) {
        applyData(data);
        try {
          localStorage.setItem('wa_settings_cache', JSON.stringify(data));
        } catch (e) {}
      }
    } catch (err: any) {
      const cachedData = getCachedWASettings();
      if (cachedData) {
        applyData(cachedData);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDayToggle = (dayId: string) => {
    setWaCronDays(prev => 
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
    );
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      setSaveSuccess(false);

      const defaultGroup = waGroups.find(g => g.isDefault) || waGroups.find(g => g.isActive) || waGroups[0];
      const activeGroupId = defaultGroup ? defaultGroup.targetId : waGroupId;
      const activeGroupName = defaultGroup ? defaultGroup.name : waGroupName;

      const payload = {
        waMode,
        wa_mode: waMode,
        waTarget,
        wa_target: waTarget,
        waGroupId: activeGroupId,
        wa_group_id: activeGroupId,
        waGroupName: activeGroupName,
        wa_group_name: activeGroupName,
        waGroups,
        wa_groups: waGroups,
        waCronTime,
        wa_cron_time: waCronTime,
        waCronDays,
        wa_cron_days: waCronDays
      };

      await axios.post('/api/settings', payload);
      setSaveSuccess(true);
      if (onSaved) onSaved();
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('Failed to save WA settings', err);
      setErrorMessage(err.response?.data?.error || err.message || 'Gagal menyimpan pengaturan WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  // --- WHATSAPP GROUP CRUD & TESTING HANDLERS ---
  const handleOpenAddGroup = () => {
    setEditingGroupId(null);
    setGroupFormName('');
    setGroupFormTargetId('');
    setGroupFormDesc('');
    setGroupFormActive(true);
    setGroupFormDefault(waGroups.length === 0);
    setGroupFormError('');
    setGroupDialogOpen(true);
  };

  const handleOpenEditGroup = (group: WhatsAppGroup) => {
    setEditingGroupId(group.id);
    setGroupFormName(group.name);
    setGroupFormTargetId(group.targetId);
    setGroupFormDesc(group.description || '');
    setGroupFormActive(group.isActive);
    setGroupFormDefault(!!group.isDefault);
    setGroupFormError('');
    setGroupDialogOpen(true);
  };

  const handleSaveGroupModal = () => {
    if (!groupFormName.trim()) {
      setGroupFormError('Nama WhatsApp Group wajib diisi');
      return;
    }
    if (!groupFormTargetId.trim()) {
      setGroupFormError('ID WhatsApp Group (Target ID) wajib diisi');
      return;
    }

    const cleanTargetId = groupFormTargetId.trim();

    if (editingGroupId) {
      setWaGroups(prev => prev.map(g => {
        if (g.id === editingGroupId) {
          return {
            ...g,
            name: groupFormName.trim(),
            targetId: cleanTargetId,
            description: groupFormDesc.trim(),
            isActive: groupFormActive,
            isDefault: groupFormDefault
          };
        }
        return groupFormDefault ? { ...g, isDefault: false } : g;
      }));
    } else {
      const newGroup: WhatsAppGroup = {
        id: `group_${Date.now()}`,
        name: groupFormName.trim(),
        targetId: cleanTargetId,
        description: groupFormDesc.trim(),
        isActive: groupFormActive,
        isDefault: groupFormDefault || waGroups.length === 0
      };

      setWaGroups(prev => {
        const updated = groupFormDefault ? prev.map(g => ({ ...g, isDefault: false })) : [...prev];
        return [...updated, newGroup];
      });
    }

    setGroupDialogOpen(false);
  };

  const handleDeleteGroup = (id: string) => {
    setWaGroups(prev => prev.filter(g => g.id !== id));
  };

  const handleToggleGroupActive = (id: string) => {
    setWaGroups(prev => prev.map(g => g.id === id ? { ...g, isActive: !g.isActive } : g));
  };

  const handleSetDefaultGroup = (id: string) => {
    setWaGroups(prev => prev.map(g => ({
      ...g,
      isDefault: g.id === id
    })));
  };

  const handleTestSpecificGroup = async (group: WhatsAppGroup) => {
    try {
      setTestingGroupId(group.id);
      setGroupTestResult(null);

      const res = await axios.post('/api/settings/wa-test-group', {
        targetGroupId: group.targetId,
        testMessage: `📢 *[UJI COBA WHATSAPP GROUP]*\nHalo Anggota Grup *${group.name}*!\nKoneksi API WhatsApp ke grup ini (${group.targetId}) berhasil terhubung dengan sistem presensi.`
      });

      if (res.data?.success) {
        setGroupTestResult({
          id: group.id,
          success: true,
          message: `Berhasil terkirim ke "${group.name}"!`
        });
      } else {
        setGroupTestResult({
          id: group.id,
          success: false,
          message: res.data?.error || 'Gagal mengirim pesan ke grup'
        });
      }
    } catch (err: any) {
      setGroupTestResult({
        id: group.id,
        success: false,
        message: err.response?.data?.error || err.message || 'Gagal mengirim pesan tes'
      });
    } finally {
      setTestingGroupId(null);
    }
  };

  const handleTriggerDailyBroadcast = async () => {
    if (!confirm('Kirim rekap laporan presensi hari ini ke seluruh Wali Kelas sekarang juga via WhatsApp Gateway?')) {
      return;
    }
    try {
      setBroadcastLoading(true);
      setBroadcastResult(null);
      const res = await axios.post('/api/settings/trigger-daily-wa', {
        date: new Date().toISOString().split('T')[0]
      });
      setBroadcastResult(res.data);
    } catch (err: any) {
      setBroadcastResult({
        success: false,
        error: err.response?.data?.error || err.message || 'Gagal memicu pengiriman broadcast otomatis'
      });
    } finally {
      setBroadcastLoading(false);
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2.5, bgcolor: '#ffffff' }}>
      {/* Header Info */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #a7f3d0'
            }}
          >
            <SendIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
              Otomasi Presensi Siswa
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Pengaturan pengiriman otomatis laporan rekapitulasi presensi harian siswa ke Wali Kelas dan WhatsApp Group.
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Chip
            size="small"
            icon={gatewayConfigured ? <CheckCircleIcon sx={{ fontSize: '16px !important' }} /> : <WarningIcon sx={{ fontSize: '16px !important' }} />}
            color={gatewayConfigured ? 'success' : 'warning'}
            variant="filled"
            label={gatewayConfigured ? `Gateway ${activeProvider.toUpperCase()} Aktif` : 'Gateway Belum Dikonfigurasi'}
            sx={{ fontWeight: 700 }}
          />
          <Chip
            size="small"
            color={waMode === 'auto' ? 'primary' : 'default'}
            label={waMode === 'auto' ? 'Mode: Otomatis (Cron Server)' : 'Mode: Manual (wa.me)'}
          />
        </Stack>
      </Box>

      {/* Banner Gateway Terpusat */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2,
          bgcolor: gatewayConfigured ? '#f0fdf4' : '#fffbeb',
          border: '1px solid',
          borderColor: gatewayConfigured ? '#bbf7d0' : '#fde68a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 260, flex: 1 }}>
          <RouterIcon sx={{ color: gatewayConfigured ? '#16a34a' : '#d97706', fontSize: 28 }} />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: gatewayConfigured ? '#15803d' : '#b45309' }}>
              WhatsApp Gateway Terpusat (Provider: {activeProvider.toUpperCase()})
            </Typography>
            <Typography variant="caption" sx={{ color: gatewayConfigured ? '#166534' : '#92400e', display: 'block' }}>
              {gatewayConfigured
                ? `Kredensial API WhatsApp Gateway aktif (${activeApiUrl}). Digunakan bersama untuk Otomasi Presensi Siswa & Presensi Guru.`
                : 'API Key WhatsApp belum dikonfigurasi. Silakan atur Token dan Endpoint WhatsApp terpusat di menu Atur Gateway.'}
            </Typography>
          </Box>
        </Box>

        <Button
          variant="outlined"
          size="small"
          startIcon={<RouterIcon fontSize="small" />}
          endIcon={<OpenInNewIcon fontSize="small" />}
          color={gatewayConfigured ? 'success' : 'warning'}
          href="/admin/settings?tab=gateway"
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: 2,
            bgcolor: '#ffffff',
            whiteSpace: 'nowrap'
          }}
        >
          {gatewayConfigured ? 'Buka Atur Gateway' : 'Konfigurasi Gateway Sekarang'}
        </Button>
      </Paper>

      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 2.5 }} icon={<CheckCircleIcon fontSize="inherit" />}>
          Pengaturan Otomasi Presensi Siswa berhasil disimpan!
        </Alert>
      )}

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2.5 }}>
          {errorMessage}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Kolom 1: Konfigurasi Pengiriman & Jadwal */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Stack spacing={2.5}>
            {/* Mode Pengiriman */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Mode Pengiriman Pesan Rekapitulasi Presensi
              </Typography>
              <RadioGroup
                value={waMode}
                onChange={(e) => setWaMode(e.target.value as 'manual' | 'auto')}
              >
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    mb: 1,
                    borderColor: waMode === 'manual' ? 'primary.main' : 'grey.200',
                    bgcolor: waMode === 'manual' ? '#eff6ff' : 'transparent',
                    borderRadius: 2
                  }}
                >
                  <FormControlLabel
                    value="manual"
                    control={<Radio size="small" />}
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          Mode Semi-Manual / Link WhatsApp (wa.me)
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Admin menekan tombol kirim di menu Laporan, pesan langsung disiapkan di WhatsApp Web atau aplikasi WA di perangkat Anda.
                        </Typography>
                      </Box>
                    }
                  />
                </Paper>

                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderColor: waMode === 'auto' ? 'success.main' : 'grey.200',
                    bgcolor: waMode === 'auto' ? '#f0fdf4' : 'transparent',
                    borderRadius: 2
                  }}
                >
                  <FormControlLabel
                    value="auto"
                    control={<Radio size="small" color="success" />}
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.dark' }}>
                          Mode Otomatis (WhatsApp Gateway API & Cron Server)
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Server akan otomatis mengirim rekap absensi setiap kelas ke nomor WA Wali Kelas & WhatsApp Group sesuai jadwal harian yang ditentukan.
                        </Typography>
                      </Box>
                    }
                  />
                </Paper>
              </RadioGroup>
            </Box>

            {/* Sasaran / Target Pengiriman Laporan */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Sasaran / Target Pengiriman Laporan Otomatis
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                Pilih tujuan penerima pesan saat sistem mengirimkan broadcast rekap kehadiran harian siswa
              </Typography>

              <RadioGroup
                value={waTarget}
                onChange={(e) => setWaTarget(e.target.value as 'group' | 'individual' | 'both')}
              >
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        height: '100%',
                        borderColor: waTarget === 'both' ? 'primary.main' : 'grey.200',
                        bgcolor: waTarget === 'both' ? '#eff6ff' : 'transparent',
                        borderRadius: 2,
                        cursor: 'pointer'
                      }}
                      onClick={() => setWaTarget('both')}
                    >
                      <FormControlLabel
                        value="both"
                        control={<Radio size="small" />}
                        label={
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: waTarget === 'both' ? 'primary.main' : 'text.primary' }}>
                              Keduanya (Rekomendasi)
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.3 }}>
                              Kirim ke WA Pribadi Wali Kelas <b>dan</b> ke WhatsApp Group terpusat.
                            </Typography>
                          </Box>
                        }
                      />
                    </Paper>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        height: '100%',
                        borderColor: waTarget === 'individual' ? 'primary.main' : 'grey.200',
                        bgcolor: waTarget === 'individual' ? '#eff6ff' : 'transparent',
                        borderRadius: 2,
                        cursor: 'pointer'
                      }}
                      onClick={() => setWaTarget('individual')}
                    >
                      <FormControlLabel
                        value="individual"
                        control={<Radio size="small" />}
                        label={
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: waTarget === 'individual' ? 'primary.main' : 'text.primary' }}>
                              Hanya Wali Kelas
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.3 }}>
                              Kirim hanya ke nomor pribadi masing-masing wali kelas sesuai rombelnya.
                            </Typography>
                          </Box>
                        }
                      />
                    </Paper>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        height: '100%',
                        borderColor: waTarget === 'group' ? 'primary.main' : 'grey.200',
                        bgcolor: waTarget === 'group' ? '#eff6ff' : 'transparent',
                        borderRadius: 2,
                        cursor: 'pointer'
                      }}
                      onClick={() => setWaTarget('group')}
                    >
                      <FormControlLabel
                        value="group"
                        control={<Radio size="small" />}
                        label={
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: waTarget === 'group' ? 'primary.main' : 'text.primary' }}>
                              Hanya WhatsApp Group
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.3 }}>
                              Kirim rekap kompilasi seluruh rombel hanya ke WhatsApp Group sekolah.
                            </Typography>
                          </Box>
                        }
                      />
                    </Paper>
                  </Grid>
                </Grid>
              </RadioGroup>
            </Box>

            {/* Kelola WhatsApp Group Terdaftar */}
            {(waTarget === 'group' || waTarget === 'both') && (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <GroupIcon color="success" fontSize="small" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                      Kelola WhatsApp Group Tujuan ({waGroups.length} Grup)
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    startIcon={<AddIcon />}
                    onClick={handleOpenAddGroup}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
                  >
                    Tambah WhatsApp Group
                  </Button>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  Daftarkan ID WhatsApp Group yang akan menerima rekapitulasi kehadiran seluruh kelas secara otomatis.
                </Typography>

                {waGroups.length === 0 ? (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    Belum ada WhatsApp Group yang didaftarkan. Klik tombol <b>Tambah WhatsApp Group</b> di atas untuk menambahkan grup tujuan rekap.
                  </Alert>
                ) : (
                  <Table size="small" sx={{ bgcolor: 'white', borderRadius: 1, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>NAMA GRUP</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>TARGET ID GRUP</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textAlign: 'center' }}>STATUS</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textAlign: 'center' }}>DEFAULT</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textAlign: 'right' }}>AKSI</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {waGroups.map((g) => (
                        <TableRow key={g.id} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                              {g.name}
                            </Typography>
                            {g.description && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                {g.description}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <code style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
                              {g.targetId}
                            </code>
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            <Switch
                              size="small"
                              checked={g.isActive}
                              onChange={() => handleToggleGroupActive(g.id)}
                              color="success"
                            />
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            {g.isDefault ? (
                              <Chip size="small" color="primary" label="Utama" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
                            ) : (
                              <Button
                                size="small"
                                variant="text"
                                onClick={() => handleSetDefaultGroup(g.id)}
                                sx={{ fontSize: '0.7rem', textTransform: 'none', py: 0, minWidth: 'auto' }}
                              >
                                Jadikan Default
                              </Button>
                            )}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>
                            <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                              <Tooltip title="Uji Coba Kirim ke Grup Ini">
                                <span>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="success"
                                    onClick={() => handleTestSpecificGroup(g)}
                                    disabled={testingGroupId === g.id || !gatewayConfigured}
                                    sx={{ minWidth: 32, px: 1, py: 0.25, fontSize: '0.7rem', textTransform: 'none' }}
                                  >
                                    {testingGroupId === g.id ? <CircularProgress size={12} color="inherit" /> : 'Tes'}
                                  </Button>
                                </span>
                              </Tooltip>
                              <Tooltip title="Edit Grup">
                                <Button
                                  size="small"
                                  color="info"
                                  onClick={() => handleOpenEditGroup(g)}
                                  sx={{ minWidth: 32, px: 0.5, py: 0.25 }}
                                >
                                  <EditIcon fontSize="small" />
                                </Button>
                              </Tooltip>
                              <Tooltip title="Hapus Grup">
                                <Button
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteGroup(g.id)}
                                  sx={{ minWidth: 32, px: 0.5, py: 0.25 }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </Button>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {groupTestResult && (
                  <Alert severity={groupTestResult.success ? 'success' : 'error'} sx={{ mt: 1.5 }}>
                    {groupTestResult.message}
                  </Alert>
                )}
              </Paper>
            )}

            {/* Jadwal Pengiriman Otomatis */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <ScheduleIcon color="primary" fontSize="small" />
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  Jadwal Pengiriman Otomatis (Cron Server)
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 5 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="time"
                    label="Jam Pengiriman Harian (WIB)"
                    value={waCronTime}
                    onChange={(e) => setWaCronTime(e.target.value)}
                    helperText="Contoh: 15:00 WIB (setelah KBM selesai)"
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 7 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Hari Aktif Pengiriman Otomatis:
                  </Typography>
                  <FormGroup row>
                    {DAYS.map((d) => (
                      <FormControlLabel
                        key={d.id}
                        control={
                          <Checkbox
                            size="small"
                            checked={waCronDays.includes(d.id)}
                            onChange={() => handleDayToggle(d.id)}
                          />
                        }
                        label={<Typography variant="caption">{d.label}</Typography>}
                        sx={{ mr: 1.5 }}
                      />
                    ))}
                  </FormGroup>
                </Grid>
              </Grid>
            </Paper>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', pt: 1 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                onClick={handleSave}
                disabled={loading}
                sx={{ px: 3, py: 1, borderRadius: 2, fontWeight: 700 }}
              >
                Simpan Pengaturan Otomasi Siswa
              </Button>
            </Box>
          </Stack>
        </Grid>

        {/* Kolom 2: Aksi Cepat & Pemicu Manual */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={2.5}>
            {/* Kartu Pemicu Broadcast Manual */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: '#eff6ff', borderColor: '#bfdbfe' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <PlayArrowIcon color="primary" fontSize="small" />
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
                  Pemicu Otomasi Sekarang (Manual Trigger)
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Kirimkan rekap laporan presensi siswa hari ini langsung ke target terpilih (Wali Kelas & WhatsApp Group) sekarang juga via WhatsApp Gateway tanpa menunggu jadwal cron.
              </Typography>

              <Button
                variant="contained"
                color="primary"
                fullWidth
                startIcon={broadcastLoading ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
                onClick={handleTriggerDailyBroadcast}
                disabled={broadcastLoading || !gatewayConfigured}
                sx={{ py: 1.2, fontWeight: 700, borderRadius: 2 }}
              >
                {broadcastLoading ? 'Memproses Transmisi Gateway...' : 'Kirim Laporan Siswa Sekarang'}
              </Button>

              {broadcastResult && (
                <Alert severity={broadcastResult.success ? 'success' : 'error'} sx={{ mt: 2 }}>
                  {broadcastResult.success
                    ? `Berhasil memproses pengiriman: ${broadcastResult.sentCount || 0} pesan terkirim ke Wali Kelas & WhatsApp Group!`
                    : (broadcastResult.error || 'Gagal mengirim')}
                </Alert>
              )}
            </Paper>

            {/* Informasi Pengaturan Gateway */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                💡 Informasi Integrasi Gateway:
              </Typography>
              <Typography variant="caption" color="text.secondary" component="div" sx={{ lineHeight: 1.6 }}>
                • <b>Terpusat</b>: Konfigurasi Provider, API Token, dan Endpoint WhatsApp kini disatukan di menu <b>Atur Gateway</b>.<br />
                • <b>Otomasi Guru & Siswa</b>: Keduanya menggunakan koneksi Gateway yang sama.<br />
                • Pastikan nomor telepon seluruh Wali Kelas di menu <b>Wali Kelas</b> telah diisi dengan nomor WhatsApp aktif (awalan <code>08...</code> atau <code>62...</code>).
              </Typography>
            </Paper>
          </Stack>
        </Grid>
      </Grid>

      {/* DIALOG TAMBAH / EDIT WHATSAPP GROUP */}
      <Dialog
        open={groupDialogOpen}
        onClose={() => setGroupDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <GroupIcon color="success" />
          {editingGroupId ? 'Edit WhatsApp Group' : 'Tambah WhatsApp Group Baru'}
        </DialogTitle>
        <DialogContent dividers>
          {groupFormError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {groupFormError}
            </Alert>
          )}

          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              size="small"
              label="Nama WhatsApp Group"
              placeholder="Contoh: Grup Guru SMK / Tim Presensi / Wali Kelas X"
              value={groupFormName}
              onChange={(e) => setGroupFormName(e.target.value)}
              helperText="Label / nama penanda untuk grup WhatsApp ini"
              required
            />

            <TextField
              fullWidth
              size="small"
              label="ID WhatsApp Group (Target ID)"
              placeholder="Contoh: 1203630284918294@g.us"
              value={groupFormTargetId}
              onChange={(e) => setGroupFormTargetId(e.target.value)}
              helperText="ID grup WhatsApp dari provider gateway Anda (biasanya berakhiran @g.us)"
              required
            />

            <TextField
              fullWidth
              size="small"
              label="Keterangan / Deskripsi (Opsional)"
              placeholder="Contoh: Menerima rekap seluruh rombel harian pada jam pulang"
              value={groupFormDesc}
              onChange={(e) => setGroupFormDesc(e.target.value)}
              helperText="Catatan penggunaan grup ini"
            />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={groupFormActive}
                    onChange={(e) => setGroupFormActive(e.target.checked)}
                    color="success"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Aktifkan Pengiriman ke Grup Ini
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Grup ini akan menerima kiriman rekap kehadiran saat broadcast berjalan
                    </Typography>
                  </Box>
                }
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={groupFormDefault}
                    onChange={(e) => setGroupFormDefault(e.target.checked)}
                    color="success"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Jadikan Sebagai Grup Utama (Default)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Grup utama akan diprioritaskan untuk pesan notifikasi tunggal dan integrasi cepat
                    </Typography>
                  </Box>
                }
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setGroupDialogOpen(false)} color="inherit">
            Batal
          </Button>
          <Button
            onClick={handleSaveGroupModal}
            variant="contained"
            color="success"
            startIcon={<CheckIcon />}
          >
            {editingGroupId ? 'Simpan Perubahan' : 'Tambah Grup'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
