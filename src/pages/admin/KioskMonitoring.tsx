import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Paper,
  Stack,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  AlertTitle,
  CircularProgress,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  SettingsRemote as KioskIcon,
  CloudQueue as OnlineIcon,
  CloudOff as OfflineIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  UploadFile as UploadFileIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  AccessTime as ClockIcon,
  OpenInNew as OpenInNewIcon,
  HelpOutlined as HelpIcon,
  Backup as BackupIcon,
  Sync as SyncIcon,
  Storage as StorageIcon,
  FilterList as FilterListIcon,
  Schedule as ScheduleIcon,
  PlayArrow as PlayArrowIcon,
  Sensors as SensorsIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { formatWIBDateIndo, getWIBTimeString } from '../../timezone';

export interface TerminalItem {
  terminal_id: string;
  name: string;
  ip_address?: string;
  user_agent?: string;
  last_seen: string;
  clock_offset_ms: number;
  pending_queue_count: number;
  status: string;
  app_version?: string;
  last_command?: string;
  last_command_time?: string;
  is_sse_connected?: boolean;
  created_at?: string;
  updated_at?: string;
  is_online?: boolean;
  seconds_ago?: number;
}

export interface ImportDetailItem {
  barcode: string;
  studentId?: string;
  studentName?: string;
  studentClass?: string;
  date?: string;
  time?: string;
  type?: string;
  status: 'INSERTED' | 'DUPLICATE_SKIPPED' | 'STUDENT_NOT_FOUND';
  attendanceStatus?: 'PRESENT' | 'LATE';
  message: string;
}

export default function KioskMonitoring() {
  const [currentTab, setCurrentTab] = useState<number>(0);
  const [terminals, setTerminals] = useState<TerminalItem[]>([]);
  const [loadingTerminals, setLoadingTerminals] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Mode Uji Coba (Dry-Run / Test Mode) State
  const [isTestMode, setIsTestMode] = useState<boolean>(false);
  const [updatingTestMode, setUpdatingTestMode] = useState<boolean>(false);

  // Edit terminal dialog state
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [selectedTerminal, setSelectedTerminal] = useState<TerminalItem | null>(null);
  const [terminalNameInput, setTerminalNameInput] = useState<string>('');
  const [savingTerminal, setSavingTerminal] = useState<boolean>(false);

  // Failsafe Emergency Import State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [parsedPreview, setParsedPreview] = useState<{
    terminalId: string;
    totalRows: number;
    rows: any[];
  } | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    totalParsed: number;
    successCount: number;
    duplicateCount: number;
    notFoundCount: number;
    terminalId: string;
    results: ImportDetailItem[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch terminals list
  const fetchTerminals = useCallback(async () => {
    try {
      const res = await axios.get('/api/kiosk/terminals');
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        setTerminals(res.data.data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.warn('Gagal mengambil daftar terminal kiosk:', err);
    } finally {
      setLoadingTerminals(false);
    }
  }, []);

  // Fetch status Mode Uji Coba (Dry-Run / Test Mode)
  const fetchTestMode = useCallback(async () => {
    try {
      const res = await axios.get('/api/kiosk/test-mode');
      if (res.data && res.data.success) {
        setIsTestMode(Boolean(res.data.isTestMode));
      }
    } catch (e) {
      console.warn('Gagal membaca status mode uji coba:', e);
    }
  }, []);

  useEffect(() => {
    fetchTerminals();
    fetchTestMode();
  }, [fetchTerminals, fetchTestMode]);

  // Periodic Auto-refresh (every 5 seconds)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchTerminals();
      fetchTestMode();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchTerminals, fetchTestMode]);

  // Handler pergantian sakelar Mode Uji Coba Scanner
  const handleToggleTestMode = async (newVal: boolean) => {
    setUpdatingTestMode(true);
    try {
      const res = await axios.post('/api/kiosk/test-mode', { isTestMode: newVal });
      if (res.data && res.data.success) {
        setIsTestMode(res.data.isTestMode);
        if (res.data.isTestMode) {
          toast.success('Mode Uji Coba (Dry-Run) berhasil DIAKTIFKAN! Seluruh terminal Kiosk kini dalam mode simulasi bebas DB.', { duration: 5000 });
        } else {
          toast.success('Mode Uji Coba DINONAKTIFKAN. Seluruh terminal Kiosk kembali ke mode operasional presensi normal.', { duration: 4000 });
        }
      } else {
        toast.error(res.data?.error || 'Gagal mengubah status mode uji coba');
      }
    } catch (err: any) {
      toast.error('Gagal mengubah mode uji coba: ' + (err.response?.data?.error || err.message));
    } finally {
      setUpdatingTestMode(false);
    }
  };

  // Handle Edit Terminal Name
  const handleOpenEditDialog = (term: TerminalItem) => {
    setSelectedTerminal(term);
    setTerminalNameInput(term.name || term.terminal_id);
    setEditDialogOpen(true);
  };

  const handleSaveTerminalName = async () => {
    if (!selectedTerminal) return;
    setSavingTerminal(true);
    try {
      await axios.put(`/api/kiosk/terminals/${selectedTerminal.terminal_id}`, {
        name: terminalNameInput.trim()
      });
      toast.success('Nama pos terminal berhasil diperbarui');
      setEditDialogOpen(false);
      fetchTerminals();
    } catch (err: any) {
      toast.error('Gagal memperbarui nama terminal: ' + (err.response?.data?.error || err.message));
    } finally {
      setSavingTerminal(false);
    }
  };

  // 3. Tombol Aksi Remote SSE: FORCE_SYNC, RELOAD_PAGE, CONFIG_UPDATE
  const [commandLoadingId, setCommandLoadingId] = useState<string | null>(null);

  const handleSendRemoteCommand = async (
    terminalId: string,
    command: 'FORCE_SYNC' | 'RELOAD_PAGE' | 'CONFIG_UPDATE',
    name?: string
  ) => {
    setCommandLoadingId(`${terminalId}-${command}`);
    try {
      const res = await axios.post('/api/kiosk/command', { terminalId, command });
      if (res.data?.success) {
        if (res.data.broadcast) {
          toast.success(`Perintah '${command}' berhasil disiarkan ke seluruh terminal Kiosk!`);
        } else if (res.data.delivered) {
          toast.success(`Perintah '${command}' berhasil dikirim langsung ke ${name || terminalId}!`);
        } else {
          toast(res.data.message || `Perintah '${command}' dicatat. Menunggu terminal terhubung kembali.`, { icon: 'ℹ️' });
        }
        fetchTerminals();
      } else {
        toast.error(res.data?.error || 'Gagal mengirim perintah');
      }
    } catch (err: any) {
      toast.error('Gagal mengirim perintah remote: ' + (err.response?.data?.error || err.message));
    } finally {
      setCommandLoadingId(null);
    }
  };

  // Handle Delete Terminal
  const handleDeleteTerminal = async (term: TerminalItem) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus data pos terminal "${term.name || term.terminal_id}"?`)) {
      return;
    }
    try {
      await axios.delete(`/api/kiosk/terminals/${term.terminal_id}`);
      toast.success('Terminal berhasil dihapus dari daftar monitoring');
      fetchTerminals();
    } catch (err: any) {
      toast.error('Gagal menghapus terminal: ' + (err.response?.data?.error || err.message));
    }
  };

  // Helper formatting for "Last Seen"
  const formatLastSeen = (term: TerminalItem) => {
    const sec = term.seconds_ago !== undefined ? term.seconds_ago : 0;
    if (sec <= 5) return 'Baru saja (aktif)';
    if (sec < 60) return `${sec} detik yang lalu`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} menit yang lalu`;
    const hours = Math.floor(min / 60);
    return `${hours} jam yang lalu`;
  };

  // File Upload & Parsing Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setFileContent(text);
      parseFilePreview(file.name, text);
    };
    reader.readAsText(file);
  };

  const parseFilePreview = (fileName: string, text: string) => {
    try {
      const trimmed = text.trim();
      let terminalId = 'KIOSK-UNKNOWN';
      let rows: any[] = [];

      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        // Parse JSON
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          rows = parsed;
          if (rows[0]?.terminalId) terminalId = rows[0].terminalId;
        } else if (parsed && typeof parsed === 'object') {
          terminalId = parsed.terminalId || 'KIOSK-UNKNOWN';
          rows = Array.isArray(parsed.records) ? parsed.records : [];
        }
      } else {
        // Parse CSV
        const lines = trimmed.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length > 1) {
          const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const rowObj: Record<string, string> = {};
            headers.forEach((h, idx) => {
              rowObj[h] = values[idx] || '';
            });
            rows.push(rowObj);
          }
          if (rows[0]?.Terminal_ID || rows[0]?.terminalId) {
            terminalId = rows[0]?.Terminal_ID || rows[0]?.terminalId;
          }
        }
      }

      setParsedPreview({
        terminalId,
        totalRows: rows.length,
        rows: rows.slice(0, 5) // Show top 5 in preview
      });
    } catch (err) {
      console.warn('Gagal membaca pratinjau file:', err);
      toast.error('Format berkas tidak valid. Harap gunakan file cadangan JSON atau CSV dari Terminal Kiosk.');
      setParsedPreview(null);
    }
  };

  // Submit Emergency Import
  const handleExecuteImport = async () => {
    if (!fileContent) {
      toast.error('Silakan pilih berkas cadangan presensi terlebih dahulu');
      return;
    }

    setIsImporting(true);
    try {
      const res = await axios.post('/api/kiosk/import-emergency', {
        rawText: fileContent,
        terminalId: parsedPreview?.terminalId || 'IMPORT-CADANGAN'
      });

      if (res.data && res.data.success) {
        setImportResult(res.data);
        toast.success(
          `Impor selesai! ${res.data.successCount} data berhasil dimasukkan, ${res.data.duplicateCount} duplikasi dilewati secara aman.`
        );
        fetchTerminals();
      } else {
        toast.error(res.data?.error || 'Gagal memproses berkas cadangan');
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan impor: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsImporting(false);
    }
  };

  // Reset file selection
  const handleResetImport = () => {
    setSelectedFile(null);
    setFileContent('');
    setParsedPreview(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Stats Counters
  const totalTerminals = terminals.length;
  const onlineTerminals = terminals.filter(t => t.is_online).length;
  const offlineTerminals = totalTerminals - onlineTerminals;
  const totalPendingQueue = terminals.reduce((acc, t) => acc + (t.pending_queue_count || 0), 0);

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* PAGE HEADER */}
      <Box sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                p: 1.2,
                borderRadius: 2.5,
                bgcolor: 'primary.main',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
              }}
            >
              <KioskIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.5px' }}>
                Monitoring Terminal Kiosk
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Pantau kesehatan terminal scanner DietPi Chromium secara realtime &amp; impor cadangan data darurat
              </Typography>
            </Box>
          </Box>
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          {/* SAKELAR MODE UJI COBA SCANNER (DRY-RUN / TEST MODE) */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.2,
              p: 0.6,
              px: 1.5,
              borderRadius: 2.5,
              bgcolor: isTestMode ? 'rgba(245, 158, 11, 0.12)' : 'rgba(100, 116, 139, 0.06)',
              border: '1.5px solid',
              borderColor: isTestMode ? '#f59e0b' : 'rgba(100, 116, 139, 0.2)',
              transition: 'all 0.3s ease'
            }}
          >
            <FormControlLabel
              sx={{ m: 0 }}
              control={
                <Switch
                  size="small"
                  checked={isTestMode}
                  disabled={updatingTestMode}
                  onChange={(e) => handleToggleTestMode(e.target.checked)}
                  color="warning"
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: 800, color: isTestMode ? '#b45309' : 'text.primary', ml: 0.5 }}>
                  Mode Uji Coba Scanner
                </Typography>
              }
            />

            {/* BADGE STATUS VISUAL UJI COBA */}
            {isTestMode ? (
              <Chip
                icon={<SensorsIcon sx={{ fontSize: '14px !important', color: '#ffffff !important' }} />}
                label="Uji Coba: AKTIF (Simulasi - Data Tidak Tersimpan ke Database)"
                size="small"
                sx={{
                  bgcolor: '#f59e0b',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  letterSpacing: 0.3,
                  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)',
                  animation: 'testModeBadgeBlink 1.8s infinite',
                  '@keyframes testModeBadgeBlink': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.75 }
                  }
                }}
              />
            ) : (
              <Chip
                label="Uji Coba: NONAKTIF"
                size="small"
                variant="outlined"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  color: 'text.secondary',
                  borderColor: 'rgba(100, 116, 139, 0.3)'
                }}
              />
            )}
          </Box>

          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                Auto-Refresh (5s)
              </Typography>
            }
          />

          <Button
            variant="outlined"
            size="small"
            startIcon={loadingTerminals ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={() => {
              fetchTerminals();
              fetchTestMode();
            }}
            sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
          >
            Segarkan
          </Button>

          <Button
            variant="contained"
            size="small"
            color="primary"
            startIcon={<OpenInNewIcon />}
            onClick={() => window.open('/scanner', '_blank')}
            sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
          >
            Buka Portal Scanner
          </Button>
        </Stack>
      </Box>

      {/* ALERT BANNER JIKA MODE UJI COBA AKTIF */}
      {isTestMode && (
        <Alert
          severity="warning"
          variant="filled"
          sx={{
            mb: 3,
            borderRadius: 3,
            fontWeight: 600,
            boxShadow: '0 4px 16px rgba(245, 158, 11, 0.35)',
            bgcolor: '#d97706',
            '& .MuiAlert-icon': { color: '#ffffff' }
          }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => handleToggleTestMode(false)}
              sx={{
                fontWeight: 800,
                textTransform: 'none',
                bgcolor: 'rgba(255,255,255,0.2)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                borderRadius: 2
              }}
            >
              Nonaktifkan Sekarang
            </Button>
          }
        >
          <AlertTitle sx={{ fontWeight: 900 }}>MODE UJI COBA SCANNER (DRY-RUN) SEDANG AKTIF</AlertTitle>
          Seluruh terminal Portal Scanner saat ini beroperasi dalam mode simulasi. Pemindaian kartu siswa akan direspon secara visual di layar tetapi <strong>TIDAK DISIMPAN ke database maupun antrean IndexedDB offline</strong>. Nonaktifkan mode ini setelah pengujian perangkat scanner selesai.
        </Alert>
      )}

      {/* STATS OVERVIEW CARDS */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={2} sx={{ borderRadius: 3, borderLeft: '4px solid #0284c7' }}>
            <CardContent sx={{ p: 2.2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Total Pos Scanner
                </Typography>
                <StorageIcon sx={{ color: '#0284c7', fontSize: 20 }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: '#0284c7', mt: 0.5 }}>
                {totalTerminals}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Terminal scanner terdaftar di sistem
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={2} sx={{ borderRadius: 3, borderLeft: '4px solid #16a34a' }}>
            <CardContent sx={{ p: 2.2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Terminal Online
                </Typography>
                <OnlineIcon sx={{ color: '#16a34a', fontSize: 20 }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: '#16a34a', mt: 0.5 }}>
                {onlineTerminals}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Aktif heartbeat (&le; 30 detik)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={2} sx={{ borderRadius: 3, borderLeft: '4px solid #dc2626' }}>
            <CardContent sx={{ p: 2.2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Terminal Offline
                </Typography>
                <OfflineIcon sx={{ color: '#dc2626', fontSize: 20 }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: '#dc2626', mt: 0.5 }}>
                {offlineTerminals}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Tidak ada sinyal heartbeat (&gt; 30s)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={2} sx={{ borderRadius: 3, borderLeft: `4px solid ${totalPendingQueue > 0 ? '#d97706' : '#22c55e'}` }}>
            <CardContent sx={{ p: 2.2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Antrean IndexedDB
                </Typography>
                <SyncIcon sx={{ color: totalPendingQueue > 0 ? '#d97706' : '#22c55e', fontSize: 20 }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: totalPendingQueue > 0 ? '#d97706' : '#16a34a', mt: 0.5 }}>
                {totalPendingQueue}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {totalPendingQueue > 0 ? 'Data tersimpan lokal menunggu sync' : 'Semua antrean tersinkronisasi'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* TABS NAVIGATION */}
      <Paper elevation={2} sx={{ borderRadius: 3, mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={(_, val) => setCurrentTab(val)}
          sx={{
            px: 2,
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', minHeight: 48, fontSize: '0.95rem' }
          }}
        >
          <Tab
            icon={<KioskIcon sx={{ fontSize: 20 }} />}
            iconPosition="start"
            label="Daftar Terminal Scanner (Live Monitoring)"
          />
          <Tab
            icon={<UploadFileIcon sx={{ fontSize: 20 }} />}
            iconPosition="start"
            label="Impor Cadangan Darurat (Failsafe Import)"
          />
        </Tabs>

        {/* TAB 1: TABEL MONITORING STATUS TERMINAL KIOSK */}
        {currentTab === 0 && (
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Status Realtime Pos Terminal Scanner
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Terakhir diperbarui: {getWIBTimeString(lastUpdated, true)} WIB
                </Typography>
              </Box>

              {/* BROADCAST REMOTE COMMANDS TO ALL ONLINE KIOSKS */}
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  startIcon={<SyncIcon />}
                  disabled={commandLoadingId === 'ALL-FORCE_SYNC'}
                  onClick={() => handleSendRemoteCommand('ALL', 'FORCE_SYNC')}
                  sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', fontSize: '0.8rem' }}
                >
                  {commandLoadingId === 'ALL-FORCE_SYNC' ? 'Menyiarkan...' : 'Sinkronkan Semua'}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  startIcon={<RefreshIcon />}
                  disabled={commandLoadingId === 'ALL-RELOAD_PAGE'}
                  onClick={() => handleSendRemoteCommand('ALL', 'RELOAD_PAGE')}
                  sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', fontSize: '0.8rem' }}
                >
                  {commandLoadingId === 'ALL-RELOAD_PAGE' ? 'Menyiarkan...' : 'Reload Semua'}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="info"
                  startIcon={<ScheduleIcon />}
                  disabled={commandLoadingId === 'ALL-CONFIG_UPDATE'}
                  onClick={() => handleSendRemoteCommand('ALL', 'CONFIG_UPDATE')}
                  sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', fontSize: '0.8rem' }}
                >
                  {commandLoadingId === 'ALL-CONFIG_UPDATE' ? 'Menyiarkan...' : 'Broadcast Jadwal'}
                </Button>
              </Stack>
            </Box>

            {loadingTerminals && terminals.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <CircularProgress size={36} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                  Memuat data terminal scanner...
                </Typography>
              </Box>
            ) : terminals.length === 0 ? (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                <AlertTitle sx={{ fontWeight: 800 }}>Belum Ada Terminal Kiosk Terhubung</AlertTitle>
                Buka halaman <strong>Portal Scanner</strong> pada perangkat DietPi atau browser Anda untuk mendaftarkan pos scanner secara otomatis ke monitoring ini.
              </Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
                <Table>
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>ID Terminal / Nama Pos</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Status Koneksi &amp; SSE</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Waktu Aktif Terakhir</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Clock Offset</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Antrean IndexedDB</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>IP &amp; Sistem</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>Perintah Jarak Jauh (Remote)</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>Aksi</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {terminals.map((term) => (
                      <TableRow key={term.terminal_id} hover>
                        {/* ID Terminal & Nama Pos */}
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                bgcolor: term.is_online ? '#22c55e' : '#ef4444',
                                boxShadow: term.is_online ? '0 0 8px #22c55e' : 'none'
                              }}
                            />
                            <Box>
                              <Typography sx={{ fontWeight: 800, fontSize: '0.92rem', color: 'text.primary' }}>
                                {term.name || term.terminal_id}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                ID: {term.terminal_id}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>

                        {/* Status Koneksi & SSE */}
                        <TableCell>
                          <Stack spacing={0.6} sx={{ alignItems: 'flex-start' }}>
                            {term.is_online ? (
                              <Chip
                                icon={<OnlineIcon sx={{ fontSize: '15px !important', color: '#ffffff !important' }} />}
                                label="Online"
                                size="small"
                                sx={{
                                  bgcolor: '#16a34a',
                                  color: '#ffffff',
                                  fontWeight: 800,
                                  fontSize: '0.75rem',
                                  borderRadius: 1.5,
                                  px: 0.5
                                }}
                              />
                            ) : (
                              <Chip
                                icon={<OfflineIcon sx={{ fontSize: '15px !important', color: '#ffffff !important' }} />}
                                label="Offline"
                                size="small"
                                sx={{
                                  bgcolor: '#dc2626',
                                  color: '#ffffff',
                                  fontWeight: 800,
                                  fontSize: '0.75rem',
                                  borderRadius: 1.5,
                                  px: 0.5
                                }}
                              />
                            )}

                            {term.is_sse_connected ? (
                              <Chip
                                icon={<SensorsIcon sx={{ fontSize: '12px !important' }} />}
                                label="SSE Terhubung"
                                size="small"
                                color="success"
                                variant="outlined"
                                sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                              />
                            ) : (
                              <Chip
                                label="Polling 15s"
                                size="small"
                                variant="outlined"
                                sx={{ height: 20, fontSize: '0.68rem', color: 'text.secondary' }}
                              />
                            )}
                          </Stack>
                        </TableCell>

                        {/* Last Seen */}
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            {formatLastSeen(term)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatWIBDateIndo(term.last_seen)} • {getWIBTimeString(term.last_seen, true)} WIB
                          </Typography>
                        </TableCell>

                        {/* Clock Offset */}
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                            <Chip
                              size="small"
                              label={`${term.clock_offset_ms >= 0 ? '+' : ''}${term.clock_offset_ms} ms`}
                              color={Math.abs(term.clock_offset_ms) < 1000 ? 'success' : Math.abs(term.clock_offset_ms) < 5000 ? 'warning' : 'error'}
                              variant="outlined"
                              sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.75rem' }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {Math.abs(term.clock_offset_ms) < 1000 ? 'Sinkron' : 'Perlu NTP'}
                            </Typography>
                          </Box>
                        </TableCell>

                        {/* Indikator Antrean (IndexedDB) */}
                        <TableCell>
                          {term.pending_queue_count > 0 ? (
                            <Tooltip title="Data presensi tersimpan di IndexedDB DietPi dan menunggu koneksi pulih untuk disinkronkan">
                              <Chip
                                icon={<WarningIcon sx={{ fontSize: '14px !important', color: '#ffffff !important' }} />}
                                label={`${term.pending_queue_count} Antrean Pending`}
                                size="small"
                                sx={{
                                  bgcolor: '#d97706',
                                  color: '#ffffff',
                                  fontWeight: 800,
                                  fontSize: '0.75rem',
                                  borderRadius: 1.5
                                }}
                              />
                            </Tooltip>
                          ) : (
                            <Chip
                              icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                              label="Tersinkronisasi Penuh"
                              size="small"
                              color="success"
                              variant="outlined"
                              sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                            />
                          )}
                        </TableCell>

                        {/* Info Jaringan */}
                        <TableCell>
                          <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, color: 'text.secondary' }}>
                            IP: {term.ip_address || 'Lokal'}
                          </Typography>
                          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem', display: 'block', maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {term.user_agent ? (term.user_agent.includes('Linux') ? 'DietPi OS' : term.user_agent.substring(0, 24)) : 'DietPi Kiosk'}
                          </Typography>
                        </TableCell>

                        {/* 4b. Tombol Aksi Remote SSE/WebSocket: FORCE_SYNC, RELOAD_PAGE, CONFIG_UPDATE */}
                        <TableCell align="center">
                          <Stack direction="column" spacing={0.8} sx={{ alignItems: 'center' }}>
                            <Stack direction="row" spacing={0.8}>
                              <Tooltip title="Perintahkan Kiosk untuk langsung mengirim seluruh antrean IndexedDB lokal ke server">
                                <span>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    color="primary"
                                    disabled={commandLoadingId === `${term.terminal_id}-FORCE_SYNC`}
                                    startIcon={commandLoadingId === `${term.terminal_id}-FORCE_SYNC` ? <CircularProgress size={14} color="inherit" /> : <SyncIcon sx={{ fontSize: 15 }} />}
                                    onClick={() => handleSendRemoteCommand(term.terminal_id, 'FORCE_SYNC', term.name)}
                                    sx={{ borderRadius: 1.5, fontWeight: 700, fontSize: '0.72rem', px: 1, py: 0.4, textTransform: 'none' }}
                                  >
                                    Sinkronkan
                                  </Button>
                                </span>
                              </Tooltip>

                              <Tooltip title="Perintahkan Kiosk untuk mengeksekusi window.location.reload() agar memuat tampilan/aset baru">
                                <span>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="warning"
                                    disabled={commandLoadingId === `${term.terminal_id}-RELOAD_PAGE`}
                                    startIcon={commandLoadingId === `${term.terminal_id}-RELOAD_PAGE` ? <CircularProgress size={14} color="inherit" /> : <RefreshIcon sx={{ fontSize: 15 }} />}
                                    onClick={() => handleSendRemoteCommand(term.terminal_id, 'RELOAD_PAGE', term.name)}
                                    sx={{ borderRadius: 1.5, fontWeight: 700, fontSize: '0.72rem', px: 1, py: 0.4, textTransform: 'none' }}
                                  >
                                    Reload Kiosk
                                  </Button>
                                </span>
                              </Tooltip>

                              <Tooltip title="Kirim pembaruan jadwal jam presensi ke memori lokal kiosk tanpa reload">
                                <span>
                                  <IconButton
                                    size="small"
                                    color="info"
                                    disabled={commandLoadingId === `${term.terminal_id}-CONFIG_UPDATE`}
                                    onClick={() => handleSendRemoteCommand(term.terminal_id, 'CONFIG_UPDATE', term.name)}
                                    sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 0.5 }}
                                  >
                                    <ScheduleIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Stack>

                            {term.last_command && (
                              <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.secondary', fontStyle: 'italic' }}>
                                Cmd: {term.last_command}
                              </Typography>
                            )}
                          </Stack>
                        </TableCell>

                        {/* Aksi Pengaturan */}
                        <TableCell align="center">
                          <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'center' }}>
                            <Tooltip title="Ubah Nama Pos Terminal">
                              <IconButton size="small" color="primary" onClick={() => handleOpenEditDialog(term)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Hapus Terminal">
                              <IconButton size="small" color="error" onClick={() => handleDeleteTerminal(term)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {/* TAB 2: FITUR IMPOR CADANGAN DARURAT (FAILSAFE IMPORT) */}
        {currentTab === 1 && (
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
              <AlertTitle sx={{ fontWeight: 800 }}>Fitur Pemulihan Cadangan Darurat (Failsafe Import)</AlertTitle>
              Gunakan formulir ini untuk mengunggah berkas cadangan presensi (format <strong>JSON</strong> atau <strong>CSV</strong>) yang diekspor langsung dari <em>Menu Darurat Terminal Kiosk</em> (Shortcut: <strong>F9</strong> atau <strong>Ctrl+Shift+E</strong>).
              Sistem akan memvalidasi NISN/barcode siswa dan menerapkan <strong>filter anti-duplikasi ketat</strong> untuk memastikan presensi pada tanggal dan sesi yang sama tidak tercatat ganda.
            </Alert>

            {/* UPLOAD DRAG & DROP / FILE SELECTION AREA */}
            <Card variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 3, bgcolor: '#f8fafc', borderColor: '#cbd5e1' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', py: 2 }}>
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    bgcolor: '#e0f2fe',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 1.5
                  }}
                >
                  <UploadFileIcon sx={{ fontSize: 36 }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
                  Pilih Berkas Cadangan Presensi Kiosk
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460, mb: 2 }}>
                  Mendukung file berekstensi <code>.json</code> atau <code>.csv</code> (contoh: <code>antrean_presensi_KIOSK-DIETPI_2026-10-02.json</code>).
                </Typography>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json,.csv,.txt"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />

                <Stack direction="row" spacing={1.5}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<UploadFileIcon />}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', px: 3 }}
                  >
                    Pilih File JSON / CSV
                  </Button>
                  {selectedFile && (
                    <Button
                      variant="outlined"
                      color="inherit"
                      onClick={handleResetImport}
                      sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
                    >
                      Batal / Reset
                    </Button>
                  )}
                </Stack>

                {selectedFile && (
                  <Chip
                    label={`Berkas terpilih: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`}
                    color="primary"
                    variant="outlined"
                    sx={{ mt: 2, fontWeight: 700 }}
                  />
                )}
              </Box>
            </Card>

            {/* PARSED FILE PREVIEW */}
            {parsedPreview && (
              <Card elevation={2} sx={{ p: 2.5, borderRadius: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    Pratinjau Data Berkas ({parsedPreview.totalRows} Rekaman Ditemukan)
                  </Typography>
                  <Chip
                    label={`Sumber Terminal: ${parsedPreview.terminalId}`}
                    size="small"
                    color="info"
                    sx={{ fontWeight: 700 }}
                  />
                </Box>
                <Divider sx={{ mb: 2 }} />

                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>Barcode / NISN</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Nama Siswa (Label File)</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Kelas</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Sesi</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Waktu Scan</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {parsedPreview.rows.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                            {r.barcode || r.Barcode || r.qrCode || r.NISN || '-'}
                          </TableCell>
                          <TableCell>{r.studentName || r.Nama_Siswa || r.name || '-'}</TableCell>
                          <TableCell>{r.studentClass || r.Kelas || '-'}</TableCell>
                          <TableCell>
                            <Chip
                              label={String(r.type || r.Sesi || 'ARRIVAL').toUpperCase().includes('PULANG') ? 'Pulang' : 'Datang'}
                              size="small"
                              variant="outlined"
                              sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                            {r.timestamp || r.Timestamp_Kalibrasi || r.waktu || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                  <Button
                    variant="contained"
                    color="success"
                    size="large"
                    disabled={isImporting}
                    startIcon={isImporting ? <CircularProgress size={20} color="inherit" /> : <BackupIcon />}
                    onClick={handleExecuteImport}
                    sx={{ borderRadius: 2, fontWeight: 800, textTransform: 'none', px: 4 }}
                  >
                    {isImporting ? 'Sedang Memvalidasi & Mengimpor...' : 'Mulai Impor & Validasi Anti-Duplikasi'}
                  </Button>
                </Box>
              </Card>
            )}

            {/* IMPORT RESULTS & REPORT */}
            {importResult && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
                  Hasil Validasi &amp; Eksekusi Impor
                </Typography>

                <Grid container spacing={2} sx={{ mb: 2.5 }}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Paper elevation={1} sx={{ p: 2, borderRadius: 2, borderLeft: '4px solid #16a34a' }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                        BERHASIL DIMASUKKAN
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 900, color: '#16a34a', mt: 0.5 }}>
                        {importResult.successCount}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Tercatat resmi ke tabel riwayat presensi
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Paper elevation={1} sx={{ p: 2, borderRadius: 2, borderLeft: '4px solid #d97706' }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                        DUPLIKASI DILEWATI (AMAN)
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 900, color: '#d97706', mt: 0.5 }}>
                        {importResult.duplicateCount}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Siswa sudah presensi pada tanggal/sesi tersebut
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Paper elevation={1} sx={{ p: 2, borderRadius: 2, borderLeft: '4px solid #dc2626' }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                        SISWA TIDAK DITEMUKAN
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 900, color: '#dc2626', mt: 0.5 }}>
                        {importResult.notFoundCount}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Barcode tidak terdaftar di database siswa
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                {/* DETAILED RESULTS TABLE */}
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>Nama Siswa</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Kelas</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Barcode / NISN</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Sesi</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Tanggal &amp; Jam</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Status Kehadiran</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Hasil Impor</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {importResult.results.map((res, i) => (
                        <TableRow key={i} hover>
                          <TableCell sx={{ fontWeight: 700 }}>{res.studentName || '-'}</TableCell>
                          <TableCell>{res.studentClass || '-'}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{res.barcode}</TableCell>
                          <TableCell>
                            <Chip
                              label={res.type === 'DEPARTURE' ? 'Pulang' : 'Datang'}
                              size="small"
                              variant="outlined"
                              sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.75rem' }}>
                            {res.date} • {res.time} WIB
                          </TableCell>
                          <TableCell>
                            {res.attendanceStatus ? (
                              <Chip
                                label={res.attendanceStatus === 'LATE' ? 'Terlambat' : 'Tepat Waktu'}
                                size="small"
                                color={res.attendanceStatus === 'LATE' ? 'warning' : 'success'}
                                sx={{ fontWeight: 800, fontSize: '0.72rem' }}
                              />
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {res.status === 'INSERTED' ? (
                              <Chip
                                icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                                label="Berhasil Disimpan"
                                size="small"
                                color="success"
                                sx={{ fontWeight: 800, fontSize: '0.72rem' }}
                              />
                            ) : res.status === 'DUPLICATE_SKIPPED' ? (
                              <Chip
                                icon={<WarningIcon sx={{ fontSize: '14px !important' }} />}
                                label="Duplikat (Dilewati)"
                                size="small"
                                color="warning"
                                variant="outlined"
                                sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                              />
                            ) : (
                              <Chip
                                icon={<ErrorIcon sx={{ fontSize: '14px !important' }} />}
                                label="Tidak Ditemukan"
                                size="small"
                                color="error"
                                sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        )}
      </Paper>

      {/* DIALOG EDIT TERMINAL NAME */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Ubah Nama Pos Terminal</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Beri label yang mudah dikenali untuk pos scanner ini (misal: <strong>Pos Gerbang Depan</strong> atau <strong>Kiosk Lobby Utama</strong>).
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Nama Pos Terminal"
            placeholder="Contoh: Pos Gerbang Utama"
            value={terminalNameInput}
            onChange={(e) => setTerminalNameInput(e.target.value)}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontFamily: 'monospace' }}>
            ID Fisik Terminal: {selectedTerminal?.terminal_id}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditDialogOpen(false)} color="inherit" sx={{ fontWeight: 700 }}>
            Batal
          </Button>
          <Button
            onClick={handleSaveTerminalName}
            variant="contained"
            color="primary"
            disabled={savingTerminal || !terminalNameInput.trim()}
            sx={{ fontWeight: 800, borderRadius: 2 }}
          >
            {savingTerminal ? 'Menyimpan...' : 'Simpan Nama Pos'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
