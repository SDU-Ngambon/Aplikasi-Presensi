import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { safeStorage } from '../safeStorage';
import { formatWIBDateIndo, getWIBTimeString, getWIBDayNameEnglish, getWIBDayName } from '../timezone';
import { THEME_PRESETS } from '../theme';
import {
  initKioskStorage,
  getTerminalId,
  setTerminalId,
  calibrateServerClock,
  getClockOffset,
  getCalibratedDate,
  getCalibratedISOString,
  cacheStudents,
  lookupStudentOffline,
  enqueueOfflineScan,
  getPendingScansCount,
  syncOfflineQueueBatch,
  exportQueueToJson,
  exportQueueToCsv
} from '../utils/kioskOfflineQueue';
import { getSafeImageUrl, handleImageError, DEFAULT_SCHOOL_LOGO_SVG } from '../utils/imageUtils';

// MUI Imports
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Stack,
  Chip,
  IconButton,
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Alert,
  AlertTitle
} from '@mui/material';

// Icons
import {
  AccessTime as ClockIcon,
  CheckCircle as CheckCircleIcon,
  HighlightOff as XCircleIcon,
  Usb as UsbIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Sensors as SensorsIcon,
  Keyboard as KeyboardIcon,
  Campaign as CampaignIcon,
  Lock as LockIcon,
  CloudQueue as CloudOnlineIcon,
  CloudOff as CloudOfflineIcon,
  Sync as SyncIcon,
  FileDownload as FileDownloadIcon,
  SettingsRemote as KioskIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Cable as CableIcon,
  Wifi as WifiIcon,
  FlashOn as FlashIcon
} from '@mui/icons-material';
import { useAppTheme } from '../contexts/ThemeModeContext';

function hexToRgba(hex: string, opacityPercent: number) {
  const alpha = Math.max(0, Math.min(1, opacityPercent / 100));
  if (!hex || !hex.startsWith('#')) return `rgba(255, 255, 255, ${alpha})`;
  let c = hex.substring(1);
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  if (c.length !== 6) return `rgba(255, 255, 255, ${alpha})`;
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export interface ScannerChannel {
  id: string;
  name: string;
  totalScans: number;
}

export default function AttendanceScanner() {
  const navigate = useNavigate();
  const { isDark: isScannerDark } = useAppTheme('scanner');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [scanResult, setScanResult] = useState<any>(null);
  const scanResultTimerRef = useRef<any>(null);

  const [type, setType] = useState<'ARRIVAL' | 'DEPARTURE'>('ARRIVAL');
  const [history, setHistory] = useState<any[]>([]);
  const [totalTodayScans, setTotalTodayScans] = useState<number>(0);
  const [activeSessionStatus, setActiveSessionStatus] = useState<'ARRIVAL' | 'DEPARTURE' | 'OUTSIDE'>('ARRIVAL');
  const [activeSchedule, setActiveSchedule] = useState<any>(null);
  const [gateClosedReason, setGateClosedReason] = useState<string>('');
  const [isTodaySchoolActive, setIsTodaySchoolActive] = useState<boolean>(true);
  const [currentTodaySchedule, setCurrentTodaySchedule] = useState<any>(null);

  // Mode Uji Coba Presensi (Dry-Run / Test Mode) State
  const [isTestMode, setIsTestMode] = useState<boolean>(() => {
    return safeStorage.getItem('is_test_mode') === 'true';
  });

  // Kiosk Offline Queue & Auto-Sync State (DietPi OS Chromium Fullscreen)
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingQueueCount, setPendingQueueCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [clockOffset, setClockOffset] = useState<number>(0);
  const [terminalId, setTerminalIdState] = useState<string>(() => getTerminalId());
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState<boolean>(false);
  const [editingTerminalId, setEditingTerminalId] = useState<string>(() => getTerminalId());
  const isSyncingRef = useRef<boolean>(false);

  const [settings, setSettings] = useState<any>({
    scannerType: 'external',
    suaraSukses: 'default1',
    suaraGagal: 'default2'
  });

  // Kiosk / Fullscreen Mode State
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(document.fullscreenElement));

  const [channels, setChannels] = useState<ScannerChannel[]>([
    { id: 'scanner_serial', name: 'USB Virtual COM (Bridge)', totalScans: 0 },
    { id: 'scanner_hid', name: 'USB HID Gun / Wireless 2.4G & BLE', totalScans: 0 },
    { id: 'scanner_network', name: 'Network IoT / Wi-Fi API', totalScans: 0 }
  ]);

  // Saluran 1: Serial Port WebSocket Bridge State
  const [serialBridgeUrl, setSerialBridgeUrl] = useState<string>(() => {
    return safeStorage.getItem('serialBridgeUrl', 'ws://localhost:8080') || 'ws://localhost:8080';
  });
  const [editingBridgeUrl, setEditingBridgeUrl] = useState<string>(() => {
    return safeStorage.getItem('serialBridgeUrl', 'ws://localhost:8080') || 'ws://localhost:8080';
  });
  const [serialBridgeStatus, setSerialBridgeStatus] = useState<'CONNECTED' | 'STANDBY' | 'CONNECTING'>('CONNECTING');

  // Saluran 2: High-speed HID & BLE Keyboard Buffer
  const keyTimesRef = useRef<number[]>([]);
  const lastKeyTimeRef = useRef<number>(0);

  // Central FIFO Queue & Mutex Engine for All Channels
  const scanQueueRef = useRef<{ id: string; barcode: string; channelId: string; channelName: string; timestamp: number }[]>([]);
  const isProcessingQueueRef = useRef<boolean>(false);
  const recentCardScansRef = useRef<Map<string, number>>(new Map());

  // Instant Visual Detection Indicator
  const [detectedSource, setDetectedSource] = useState<{
    channelId: string;
    channelName: string;
    barcode: string;
    timestamp: number;
  } | null>(null);
  const detectionBannerTimerRef = useRef<any>(null);

  const [activeChannelFlashing, setActiveChannelFlashing] = useState<string | null>(null);

  // Input teks langsung untuk scanner fisik (USB Gun / HID)
  const [manualInput, setManualInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Global scanner input buffer for zero-click background barcode capturing
  const scanBuffer = useRef<string>('');
  const bufferResetTimer = useRef<any>(null);

  const [judulAplikasi, setJudulAplikasi] = useState(() => safeStorage.getItem('judulAplikasi', 'Sistem Presensi Siswa') || 'Sistem Presensi Siswa');

  const [globalSettings, setGlobalSettings] = useState<Record<string, any>>(() => {
    const cached = safeStorage.getJSON<Record<string, any>>('globalSettings', {});
    const schoolLogoUrl = safeStorage.getItem('schoolLogoUrl', '');
    const schoolWebsiteName = safeStorage.getItem('schoolWebsiteName', '');
    return {
      ...cached,
      logoBase64: cached?.logoBase64 || cached?.logo || cached?.logoUrl || schoolLogoUrl || '',
      logo: cached?.logoBase64 || cached?.logo || cached?.logoUrl || schoolLogoUrl || '',
      websiteName: cached?.websiteName || cached?.nama_website || cached?.school_name || schoolWebsiteName || 'Panel Admin SMK'
    };
  });

  // Isolated Scanner Theme & Custom Running Text States
  const [scannerThemePreset, setScannerThemePreset] = useState<string>(() => {
    return safeStorage.getItem('scannerThemePreset', 'indigo') || 'indigo';
  });
  const [scannerThemeColor, setScannerThemeColor] = useState<string>(() => {
    return safeStorage.getItem('scannerThemeColor', '') || '';
  });
  const [scannerBgImage, setScannerBgImage] = useState<string>(() => {
    return safeStorage.getItem('scannerBackgroundImage', '') || '';
  });
  const [scannerBoxBgColor, setScannerBoxBgColor] = useState<string>(() => {
    return safeStorage.getItem('scannerBoxBgColor', '#ffffff') || '#ffffff';
  });
  const [scannerBoxOpacity, setScannerBoxOpacity] = useState<number>(() => {
    const val = safeStorage.getItem('scannerBoxOpacity', '96');
    return val ? Number(val) : 96;
  });
  const [runningText, setRunningText] = useState<string>(() => {
    return safeStorage.getItem('scannerRunningText', 'Selamat Datang di Portal Presensi Siswa • Silakan scan kartu barcode/QR Anda pada scanner USB • Tetap tertib & jaga kedisiplinan') || 'Selamat Datang di Portal Presensi Siswa • Silakan scan kartu barcode/QR Anda pada scanner USB • Tetap tertib & jaga kedisiplinan';
  });

  // Fullscreen / Kiosk Mode API
  const enterFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {}
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {}
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    enterFullscreen();

    const handleFirstUserGesture = () => {
      if (!document.fullscreenElement) {
        enterFullscreen();
      }
    };

    window.addEventListener('click', handleFirstUserGesture, { once: true });
    window.addEventListener('keydown', handleFirstUserGesture, { once: true });
    window.addEventListener('touchstart', handleFirstUserGesture, { once: true });

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('click', handleFirstUserGesture);
      window.removeEventListener('keydown', handleFirstUserGesture);
      window.removeEventListener('touchstart', handleFirstUserGesture);
    };
  }, [enterFullscreen]);

  // 5. PENANGANAN BEBAS INTERAKSI FISIK (HEADLESS SAFETY) - AUTO-FOCUS & KEEP FOCUS ALIVE
  useEffect(() => {
    const focusScannerInput = () => {
      if (!isEmergencyModalOpen && inputRef.current) {
        try {
          inputRef.current.focus({ preventScroll: true });
        } catch (e) {}
      }
    };

    // Auto-focus immediately on mount / boot
    focusScannerInput();
    const initTimer1 = setTimeout(focusScannerInput, 250);
    const initTimer2 = setTimeout(focusScannerInput, 800);

    const handleWindowFocus = () => focusScannerInput();
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // If click was outside modal and not on a button, return focus to scanner input
      const isModal = target && target.closest('.MuiDialog-root');
      const isInteractive = target && (target.tagName === 'BUTTON' || target.closest('button'));
      if (!isModal && !isInteractive) {
        focusScannerInput();
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('click', handleDocumentClick);

    // Periodically re-assert focus every 2.5 seconds for zero-touch headless operation
    const focusInterval = setInterval(() => {
      if (!isEmergencyModalOpen && document.activeElement !== inputRef.current) {
        const isInteracting = document.activeElement && 
          (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');
        if (!isInteracting) {
          focusScannerInput();
        }
      }
    }, 2500);

    return () => {
      clearTimeout(initTimer1);
      clearTimeout(initTimer2);
      clearInterval(focusInterval);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [isEmergencyModalOpen]);

  // Fetch initial school profile & settings with offline fallback
  useEffect(() => {
    let isMounted = true;
    const loadSchoolBranding = async () => {
      try {
        const { data } = await axios.get('/api/settings', { timeout: 3500 });
        if (data && isMounted) {
          setSettings(data);
          const currentDayEn = getWIBDayNameEnglish(getCalibratedDate());
          if (data.schedule && data.schedule[currentDayEn]) {
            setActiveSchedule(data.schedule[currentDayEn]);
          }
          const logoVal = data.logoBase64 || data.logo || data.logoUrl || data.logo_url || '';
          const nameVal = data.websiteName || data.nama_website || data.school_name || data.schoolName || '';
          setGlobalSettings(prev => {
            const next = {
              ...prev,
              ...data,
              logoBase64: logoVal || prev.logoBase64,
              logo: logoVal || prev.logo,
              logoUrl: logoVal || prev.logoUrl,
              websiteName: nameVal || prev.websiteName,
              nama_website: nameVal || prev.nama_website,
              school_name: nameVal || prev.school_name
            };
            safeStorage.setItem('globalSettings', JSON.stringify(next));
            if (next.logoBase64) safeStorage.setItem('schoolLogoUrl', next.logoBase64);
            if (next.websiteName) safeStorage.setItem('schoolWebsiteName', next.websiteName);
            return next;
          });
          if (data.judulAplikasi || data.judul_aplikasi) {
            const j = data.judulAplikasi || data.judul_aplikasi;
            setJudulAplikasi(j);
            safeStorage.setItem('judulAplikasi', j);
          }
          if (data.isTestMode !== undefined || data.is_test_mode !== undefined) {
            const tm = Boolean(data.isTestMode ?? data.is_test_mode);
            setIsTestMode(tm);
            safeStorage.setItem('is_test_mode', String(tm));
          }
        }
      } catch (e) {
        // Offline fallback is handled gracefully via LocalStorage/safeStorage
      }
    };

    loadSchoolBranding();

    const handleBrandingChange = () => {
      const cached = safeStorage.getJSON<Record<string, any>>('globalSettings', {});
      const schoolLogoUrl = safeStorage.getItem('schoolLogoUrl', '');
      const schoolWebsiteName = safeStorage.getItem('schoolWebsiteName', '');
      const judul = safeStorage.getItem('judulAplikasi', '');
      if (cached || schoolLogoUrl || schoolWebsiteName) {
        setGlobalSettings(prev => ({
          ...prev,
          ...cached,
          logoBase64: cached?.logoBase64 || cached?.logo || cached?.logoUrl || schoolLogoUrl || prev.logoBase64,
          websiteName: cached?.websiteName || cached?.nama_website || cached?.school_name || schoolWebsiteName || prev.websiteName
        }));
      }
      if (judul) {
        setJudulAplikasi(judul);
      }
    };

    window.addEventListener('globalSettingsChanged', handleBrandingChange);
    window.addEventListener('storage', handleBrandingChange);
    return () => {
      isMounted = false;
      window.removeEventListener('globalSettingsChanged', handleBrandingChange);
      window.removeEventListener('storage', handleBrandingChange);
    };
  }, []);

  // Requirement 1 & 3c: Realtime Multi-Client History & Settings Synchronization
  const fetchRealtimeHistory = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/attendance/today-history', { timeout: 3500 });
      if (data && data.success) {
        setIsOnline(true);
        if (Array.isArray(data.history)) {
          setHistory(data.history);
        }
        if (typeof data.totalScansToday === 'number') {
          setTotalTodayScans(data.totalScansToday);
        }
        if (data.schedule !== undefined) {
          setActiveSchedule(data.schedule);
        }
        if (data.isDayActive !== undefined) {
          setIsTodaySchoolActive(Boolean(data.isDayActive));
        }
        if (data.gateClosedReason) {
          setGateClosedReason(data.gateClosedReason);
        }
        if (data.activeSession && (data.activeSession === 'ARRIVAL' || data.activeSession === 'DEPARTURE' || data.activeSession === 'OUTSIDE')) {
          setActiveSessionStatus(data.activeSession);
        }
        if (data.settings) {
          const st = data.settings;
          setSettings((prev: any) => ({ ...prev, ...st }));
          const logoVal = st.logoBase64 || st.logo || st.logoUrl || st.logo_url || '';
          const nameVal = st.websiteName || st.nama_website || st.school_name || st.schoolName || '';
          setGlobalSettings(prev => {
            const next = {
              ...prev,
              ...st,
              logoBase64: logoVal || prev.logoBase64,
              logo: logoVal || prev.logo,
              logoUrl: logoVal || prev.logoUrl,
              websiteName: nameVal || prev.websiteName,
              nama_website: nameVal || prev.nama_website,
              school_name: nameVal || prev.school_name
            };
            safeStorage.setItem('globalSettings', JSON.stringify(next));
            if (next.logoBase64) safeStorage.setItem('schoolLogoUrl', next.logoBase64);
            if (next.websiteName) safeStorage.setItem('schoolWebsiteName', next.websiteName);
            return next;
          });

          if (st.judulAplikasi || st.judul_aplikasi) {
            const j = st.judulAplikasi || st.judul_aplikasi;
            setJudulAplikasi(j);
            safeStorage.setItem('judulAplikasi', j);
          }
          if (st.scannerRunningText) {
            setRunningText(st.scannerRunningText);
            safeStorage.setItem('scannerRunningText', st.scannerRunningText);
          }
          if (st.scannerThemePreset) {
            setScannerThemePreset(st.scannerThemePreset);
          }
          if (st.scannerThemeColor !== undefined) {
            setScannerThemeColor(st.scannerThemeColor);
          }
          if (st.scannerBackgroundImage !== undefined) {
            setScannerBgImage(st.scannerBackgroundImage);
          }
          if (st.scannerBoxBgColor !== undefined) {
            setScannerBoxBgColor(st.scannerBoxBgColor);
          }
          if (st.scannerBoxOpacity !== undefined) {
            setScannerBoxOpacity(Number(st.scannerBoxOpacity));
          }
        }
        if (data.isTestMode !== undefined || data.is_test_mode !== undefined || data.settings?.isTestMode !== undefined || data.settings?.is_test_mode !== undefined) {
          const tm = Boolean(data.isTestMode ?? data.is_test_mode ?? data.settings?.isTestMode ?? data.settings?.is_test_mode);
          setIsTestMode(tm);
          safeStorage.setItem('is_test_mode', String(tm));
        }
      }
    } catch (e) {
      // Network failure / server offline
      setIsOnline(false);
    }
  }, []);

  // 3. SINKRONISASI BATCH SAAT JARINGAN PULIH
  const triggerAutoSync = useCallback(async () => {
    if (isSyncingRef.current) return;
    try {
      const count = await getPendingScansCount();
      setPendingQueueCount(count);
      if (count === 0) return;

      isSyncingRef.current = true;
      setIsSyncing(true);

      const result = await syncOfflineQueueBatch((synced, total) => {
        setPendingQueueCount(Math.max(0, total - synced));
      });

      setPendingQueueCount(result.remaining);

      // Refresh history if batch sync succeeded
      if (result.totalProcessed > 0 || result.totalDuplicates > 0) {
        fetchRealtimeHistory();
      }
    } catch (err) {
      console.warn('[KioskSync] Auto-sync error:', err);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
      const remaining = await getPendingScansCount();
      setPendingQueueCount(remaining);
    }
  }, [fetchRealtimeHistory]);

  // Initializing Kiosk Storage, Clock Calibration, and Student Cache (Requirement 1, 2)
  useEffect(() => {
    async function initKiosk() {
      try {
        await initKioskStorage();
        const offset = await calibrateServerClock();
        setClockOffset(offset);
        const count = await getPendingScansCount();
        setPendingQueueCount(count);

        // Preload student cache for offline identification
        try {
          const res = await axios.get('/api/attendance/cached-students', { timeout: 4000 });
          if (Array.isArray(res.data)) {
            await cacheStudents(res.data);
          }
        } catch (e) {}

        if (navigator.onLine && count > 0) {
          triggerAutoSync();
        }
      } catch (e) {
        console.warn('[KioskInit] Error during kiosk init:', e);
      }
    }

    initKiosk();

    const handleOnline = () => {
      setIsOnline(true);
      calibrateServerClock().then(off => setClockOffset(off));
      triggerAutoSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 5. Hidden keyboard shortcut (F9 or Ctrl+Shift+E) for emergency kiosk modal
    const handleEmergencyKey = (e: KeyboardEvent) => {
      if (e.key === 'F9' || (e.ctrlKey && e.shiftKey && (e.key === 'E' || e.key === 'e'))) {
        e.preventDefault();
        setIsEmergencyModalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleEmergencyKey);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('keydown', handleEmergencyKey);
    };
  }, [triggerAutoSync]);

  // Background polling interval every 2.5 seconds for multi-PC kiosk synchronization
  useEffect(() => {
    fetchRealtimeHistory();
    const historyInterval = setInterval(() => {
      fetchRealtimeHistory();
      // Periodically check if there are pending offline items to sync
      getPendingScansCount().then(cnt => {
        setPendingQueueCount(cnt);
        if (cnt > 0 && navigator.onLine && !isSyncingRef.current) {
          triggerAutoSync();
        }
      });
    }, 2500);
    return () => clearInterval(historyInterval);
  }, [fetchRealtimeHistory, triggerAutoSync]);

  // 1. INTERVAL PENGECEKAN STATUS WAKTU & JADWAL SECARA REAL-TIME (SETIAP 10-30 DETIK)
  useEffect(() => {
    // Update jam digital di layar setiap 1 detik
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);

    // Pengecekan status waktu operasional & sinkronisasi kalibrasi jam server setiap 15 detik
    const scheduleCheckInterval = setInterval(async () => {
      try {
        const { data } = await axios.get('/api/time', { timeout: 3500 });
        if (data && data.serverTime) {
          const sTime = new Date(data.serverTime).getTime();
          const localTime = Date.now();
          const calculatedOffset = sTime - localTime;
          if (Math.abs(calculatedOffset) > 1200) {
            safeStorage.setItem('kiosk_clock_offset_ms', String(calculatedOffset));
          }
        }
      } catch (err) {
        // Tetap beroperasi secara mulus offline
      }
    }, 15000);

    return () => {
      clearInterval(clockTimer);
      clearInterval(scheduleCheckInterval);
    };
  }, []);

  // 2. AUTO-HEARTBEAT & DETEKSI KONEKSI OTOMATIS (Setiap 15 detik di latar belakang)
  useEffect(() => {
    let reconnectAttempts = 0;
    let hbTimer: any = null;

    const sendHeartbeat = async () => {
      try {
        const count = await getPendingScansCount();
        const tId = getTerminalId();
        const offset = getClockOffset();

        await axios.post('/api/kiosk/heartbeat', {
          terminal_id: tId,
          terminalId: tId,
          antrean_lokal: count,
          pendingCount: count,
          clock_offset: offset,
          clockOffsetMs: offset,
          current_ip: '',
          appVersion: '1.0'
        }, { timeout: 5000 });

        reconnectAttempts = 0;
      } catch (err) {
        // Auto-reconnect with exponential backoff silently without blocking alerts
        reconnectAttempts++;
      } finally {
        const nextDelay = reconnectAttempts > 0 
          ? Math.min(30000, 15000 * Math.pow(1.2, reconnectAttempts)) 
          : 15000;
        hbTimer = setTimeout(sendHeartbeat, nextDelay);
      }
    };

    sendHeartbeat();
    return () => {
      if (hbTimer) clearTimeout(hbTimer);
    };
  }, []);

  // 3. KONEKSI OUTBOUND PERSISTEN & REMOTE COMMAND VIA SSE
  // Menerima perintah jarak jauh: FORCE_SYNC, RELOAD_PAGE, CONFIG_UPDATE
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimer: any = null;
    let sseAttempts = 0;

    const connectSse = () => {
      try {
        const tId = getTerminalId();
        eventSource = new EventSource(`/api/kiosk/events?terminalId=${encodeURIComponent(tId)}`);

        eventSource.onopen = () => {
          sseAttempts = 0;
          console.log('[KioskSSE] Persistent SSE connection active for terminal:', tId);
        };

        eventSource.onmessage = (event) => {
          try {
            if (!event.data) return;
            const data = JSON.parse(event.data);
            if (data.type === 'CONNECTED') {
              if (data.isTestMode !== undefined || data.is_test_mode !== undefined) {
                const tm = Boolean(data.isTestMode ?? data.is_test_mode);
                setIsTestMode(tm);
                safeStorage.setItem('is_test_mode', String(tm));
              }
            } else if (data.type === 'COMMAND') {
              const cmd = data.command;
              console.log('[KioskSSE] Remote command received from Admin:', cmd, data);

              if (cmd === 'FORCE_SYNC') {
                // a. FORCE_SYNC: Langsung eksekusi sinkronisasi antrean IndexedDB ke server
                triggerAutoSync();
              } else if (cmd === 'RELOAD_PAGE') {
                // b. RELOAD_PAGE: Langsung eksekusi reload untuk memperbarui aset/tampilan
                window.location.reload();
              } else if (cmd === 'SET_TEST_MODE') {
                // c. SET_TEST_MODE: Admin mengaktifkan/menonaktifkan Mode Uji Coba (Dry-Run)
                const tm = Boolean(data.payload?.isTestMode ?? data.payload?.is_test_mode);
                setIsTestMode(tm);
                safeStorage.setItem('is_test_mode', String(tm));
                if (tm) {
                  playAudioFeedback(true);
                }
              } else if (cmd === 'CONFIG_UPDATE') {
                // d. CONFIG_UPDATE: Memperbarui batas jam presensi & identitas branding di memori lokal secara instan tanpa reload
                if (data.payload?.isTestMode !== undefined || data.payload?.is_test_mode !== undefined || data.payload?.settings?.is_test_mode !== undefined || data.payload?.settings?.isTestMode !== undefined) {
                  const tm = Boolean(data.payload?.isTestMode ?? data.payload?.is_test_mode ?? data.payload?.settings?.is_test_mode ?? data.payload?.settings?.isTestMode);
                  setIsTestMode(tm);
                  safeStorage.setItem('is_test_mode', String(tm));
                }
                if (data.payload?.schedule) {
                  setActiveSchedule(data.payload.schedule);
                }
                if (data.payload?.settings) {
                  const st = data.payload.settings;
                  setSettings((prev: any) => ({ ...prev, ...st }));
                  const logoVal = st.logoBase64 || st.logo || st.logoUrl || st.logo_url || '';
                  const nameVal = st.websiteName || st.nama_website || st.school_name || st.schoolName || '';
                  setGlobalSettings(prev => {
                    const next = {
                      ...prev,
                      ...st,
                      logoBase64: logoVal || prev.logoBase64,
                      logo: logoVal || prev.logo,
                      logoUrl: logoVal || prev.logoUrl,
                      websiteName: nameVal || prev.websiteName,
                      nama_website: nameVal || prev.nama_website,
                      school_name: nameVal || prev.school_name
                    };
                    safeStorage.setItem('globalSettings', JSON.stringify(next));
                    if (next.logoBase64) safeStorage.setItem('schoolLogoUrl', next.logoBase64);
                    if (next.websiteName) safeStorage.setItem('schoolWebsiteName', next.websiteName);
                    return next;
                  });
                  if (st.judulAplikasi || st.judul_aplikasi) {
                    const j = st.judulAplikasi || st.judul_aplikasi;
                    setJudulAplikasi(j);
                    safeStorage.setItem('judulAplikasi', j);
                  }
                  if (st.scannerRunningText) {
                    setRunningText(st.scannerRunningText);
                    safeStorage.setItem('scannerRunningText', st.scannerRunningText);
                  }
                  if (st.scannerThemePreset) {
                    setScannerThemePreset(st.scannerThemePreset);
                  }
                  if (st.scannerThemeColor !== undefined) {
                    setScannerThemeColor(st.scannerThemeColor);
                  }
                  if (st.scannerBackgroundImage !== undefined) {
                    setScannerBgImage(st.scannerBackgroundImage);
                  }
                  if (st.scannerBoxBgColor !== undefined) {
                    setScannerBoxBgColor(st.scannerBoxBgColor);
                  }
                  if (st.scannerBoxOpacity !== undefined) {
                    setScannerBoxOpacity(Number(st.scannerBoxOpacity));
                  }
                }
                fetchRealtimeHistory();
              } else if (cmd === 'EXTERNAL_SCAN') {
                // Saluran 3b: Wireless IoT / Wi-Fi / ESP32 Barcode Event via Network API
                const code = data.payload?.barcode || data.payload?.qrCode;
                const ch = data.payload?.channel || 'Network IoT / Wi-Fi Scanner';
                if (code && enqueueScanEventRef.current) {
                  enqueueScanEventRef.current(code, 'scanner_network', ch);
                }
              }
            }
          } catch (e) {
            console.warn('[KioskSSE] Error parsing SSE command:', e);
          }
        };

        eventSource.onerror = () => {
          // Auto-reconnect silently with exponential backoff
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          const backoff = Math.min(30000, 2000 * Math.pow(1.3, sseAttempts));
          sseAttempts++;
          reconnectTimer = setTimeout(connectSse, backoff);
        };
      } catch (err) {
        reconnectTimer = setTimeout(connectSse, 5000);
      }
    };

    connectSse();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [triggerAutoSync, fetchRealtimeHistory]);

  // Requirement 2 & 3a, 3b: Real-time Adaptive Session Watcher & Lockout Validator
  useEffect(() => {
    const parseTime = (str: string) => {
      if (!str) return 0;
      const match = str.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/);
      if (!match) {
        const [h, m] = str.split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
      }
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const modifier = match[3] ? match[3].toUpperCase() : null;
      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    const calibratedNow = getCalibratedDate();
    const wibTimeStr = getWIBTimeString(calibratedNow);
    const [h, m] = wibTimeStr.split(':').map(Number);
    const currentTotalMins = (h || 0) * 60 + (m || 0);

    const currentDayEn = getWIBDayNameEnglish(calibratedNow);
    const currentDayIndo = getWIBDayName(calibratedNow);

    // Ambil konfigurasi jadwal spesifik hari ini dari pengaturan admin
    const rawTodaySchedule = activeSchedule || settings?.schedule?.[currentDayEn] || null;

    const arrStartMins = parseTime(rawTodaySchedule?.arrivalStart || '');
    const arrEndMins = parseTime(rawTodaySchedule?.arrivalEnd || settings?.jam_masuk || '');
    const depStartMins = parseTime(rawTodaySchedule?.departureStart || settings?.jam_pulang || '');
    const depEndMins = parseTime(rawTodaySchedule?.departureEnd || '');

    // Cek apakah hari ini merupakan hari sekolah aktif
    const isDayActive = Boolean(
      rawTodaySchedule && 
      (arrStartMins > 0 || depStartMins > 0) &&
      rawTodaySchedule.enabled !== false
    );

    setIsTodaySchoolActive(isDayActive);
    setCurrentTodaySchedule(rawTodaySchedule);

    let currentSession: 'ARRIVAL' | 'DEPARTURE' | 'OUTSIDE' = 'OUTSIDE';
    let reason = '';

    if (!isDayActive) {
      currentSession = 'OUTSIDE';
      reason = `Presensi ditutup. Hari ini (${currentDayIndo}) adalah hari libur / bukan hari sekolah aktif.`;
    } else {
      const isInArrivalWindow = arrStartMins > 0 && arrEndMins > 0 && currentTotalMins >= arrStartMins && currentTotalMins <= arrEndMins;
      const isInDepartureWindow = depStartMins > 0 && depEndMins > 0 && currentTotalMins >= depStartMins && currentTotalMins <= depEndMins;

      if (isInArrivalWindow) {
        currentSession = 'ARRIVAL';
      } else if (isInDepartureWindow) {
        currentSession = 'DEPARTURE';
      } else {
        currentSession = 'OUTSIDE';
        if (arrStartMins > 0 && currentTotalMins < arrStartMins) {
          reason = `Gerbang Belum Dibuka: Jam kedatangan hari ini baru dibuka pukul ${rawTodaySchedule.arrivalStart} WIB.`;
        } else if (arrEndMins > 0 && depStartMins > 0 && currentTotalMins > arrEndMins && currentTotalMins < depStartMins) {
          reason = `Sesi Presensi Telah Berakhir: Jam kedatangan telah ditutup (${rawTodaySchedule.arrivalEnd || settings?.jam_masuk || '12:00'} WIB) & jam kepulangan baru dibuka pukul ${rawTodaySchedule.departureStart || settings?.jam_pulang || '13:00'} WIB.`;
        } else if (depEndMins > 0 && currentTotalMins > depEndMins) {
          reason = `Sesi Presensi Telah Berakhir: Gerbang presensi hari ini telah ditutup (${rawTodaySchedule.departureEnd} WIB).`;
        } else {
          reason = `Presensi ditutup. Jam operasional presensi hari ini: Datang (${rawTodaySchedule.arrivalStart} - ${rawTodaySchedule.arrivalEnd || '12:00'}) • Pulang (${rawTodaySchedule.departureStart || '13:00'} - ${rawTodaySchedule.departureEnd || '17:00'}).`;
        }
      }
    }

    setActiveSessionStatus(currentSession);
    setGateClosedReason(reason);

    if (currentSession === 'DEPARTURE') {
      if (type !== 'DEPARTURE') setType('DEPARTURE');
    } else if (currentSession === 'ARRIVAL') {
      if (type !== 'ARRIVAL') setType('ARRIVAL');
    }
  }, [currentTime, settings, activeSchedule, type]);

  // Persistent audio context for zero-latency audio playback
  const audioCtxRef = useRef<AudioContext | null>(null);
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtxRef.current = new AudioCtxClass();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  const playAudioFeedback = (isSuccess: boolean) => {
    try {
      const sndType = isSuccess ? settings.suaraSukses || 'default1' : settings.suaraGagal || 'default2';
      const sndFile = isSuccess ? settings.fileSuaraSukses : settings.fileSuaraGagal;

      if (sndType === 'custom' && sndFile) {
        const audio = new Audio(sndFile);
        audio.play().catch((e) => console.warn('Audio play failed', e));
      } else {
        const audioCtx = getAudioContext();
        if (!audioCtx) return;

        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        const isDefault2 = sndType === 'default2';

        if (isDefault2) {
          oscillator.type = 'square';
          oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
          gainNode.gain.setValueAtTime(0.35, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
          oscillator.start(audioCtx.currentTime);
          oscillator.stop(audioCtx.currentTime + 0.3);
        } else {
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(1250, audioCtx.currentTime + 0.08);
          gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
          oscillator.start(audioCtx.currentTime);
          oscillator.stop(audioCtx.currentTime + 0.35);
        }
      }
    } catch (e) {
      console.warn('Audio feedback failed', e);
    }
  };

  // --- UNIVERSAL HYBRID SCANNER INPUT ENGINE ---
  // 1. Transaction Execution Worker (Online Scan or Offline IndexedDB Queue)
  const executeScanTransaction = useCallback(
    async (cleanText: string, activeCh: string, activeChName?: string) => {
      const channelLabel = activeChName || (activeCh === 'scanner_serial' ? 'USB Virtual COM' : activeCh === 'scanner_network' ? 'Network IoT' : 'USB HID / Wireless');
      const startExecutionTime = Date.now();
      const minFeedbackDelay = 450; // Jendela visual minimum agar operator melihat notifikasi channel sebelum pengumuman siswa

      // Lockout client check if outside attendance hours (diabaikan jika dalam Mode Uji Coba)
      if (activeSessionStatus === 'OUTSIDE' && !isTestMode) {
        playAudioFeedback(false);
        const elapsed = Date.now() - startExecutionTime;
        if (elapsed < minFeedbackDelay) {
          await new Promise((r) => setTimeout(r, minFeedbackDelay - elapsed));
        }
        setScanResult({
          success: false,
          isOutOfSchedule: true,
          message: 'Presensi Gagal: Di Luar Jadwal Resmi',
          errorDetail: gateClosedReason || 'Gerbang Presensi Ditutup / Di Luar Jadwal Operasional',
          barcode: cleanText,
          channelId: activeCh,
          channelName: channelLabel
        });
        if (scanResultTimerRef.current) clearTimeout(scanResultTimerRef.current);
        scanResultTimerRef.current = setTimeout(() => {
          setScanResult(null);
        }, 4000);
        return;
      }

      // CRITICAL DATABASE SAFEGUARD: MODE UJI COBA (DRY-RUN / TEST MODE)
      if (isTestMode) {
        let testStudent: any = null;
        let testRecord: any = null;
        let testMsg = '';

        if (navigator.onLine && isOnline) {
          try {
            const { data } = await axios.post('/api/attendance/test-scan', {
              qrCode: cleanText,
              type: type
            }, { timeout: 3000 });

            if (data.success && data.student) {
              testStudent = data.student;
              testRecord = data.record;
              testMsg = `[UJI COBA] Presensi Berhasil: ${data.student.name} (Simulasi Bebas DB)`;
            }
          } catch (e: any) {
            if (e.response && (e.response.status === 404 || e.response.status === 400)) {
              playAudioFeedback(false);
              const errMsg = e.response?.data?.error || `[UJI COBA] Siswa tidak ditemukan: '${cleanText}'`;
              const elapsed = Date.now() - startExecutionTime;
              if (elapsed < minFeedbackDelay) {
                await new Promise((r) => setTimeout(r, minFeedbackDelay - elapsed));
              }
              setScanResult({
                success: false,
                isTestMode: true,
                message: errMsg,
                channelId: activeCh,
                channelName: channelLabel
              });
              if (scanResultTimerRef.current) clearTimeout(scanResultTimerRef.current);
              scanResultTimerRef.current = setTimeout(() => {
                setScanResult(null);
                inputRef.current?.focus({ preventScroll: true });
              }, 3500);
              return;
            }
          }
        }

        // Fallback jika offline: cari dari cache offline IndexedDB tanpa mencatat ke database/antrean
        if (!testStudent) {
          const cached = await lookupStudentOffline(cleanText);
          if (cached) {
            testStudent = {
              id: cached.id,
              name: cached.name,
              nisn: cached.nisn || cleanText,
              class: `${cached.year || ''} ${cached.class || ''}`.trim(),
              year: cached.year
            };
            testRecord = {
              id: `test-local-${Date.now()}`,
              timestamp: new Date().toISOString(),
              status: 'PRESENT',
              type: type,
              isTest: true
            };
            testMsg = `[UJI COBA] Presensi Berhasil: ${cached.name} (Simulasi Offline Bebas DB)`;
          } else {
            testStudent = {
              id: cleanText,
              name: `Siswa Uji Coba (${cleanText})`,
              nisn: cleanText,
              class: 'Simulasi Kartu'
            };
            testRecord = {
              id: `test-sim-${Date.now()}`,
              timestamp: new Date().toISOString(),
              status: 'PRESENT',
              type: type,
              isTest: true
            };
            testMsg = `[UJI COBA] Presensi Berhasil: Kartu ${cleanText} (Simulasi)`;
          }
        }

        playAudioFeedback(true);

        const elapsed = Date.now() - startExecutionTime;
        if (elapsed < minFeedbackDelay) {
          await new Promise((r) => setTimeout(r, minFeedbackDelay - elapsed));
        }

        setScanResult({
          success: true,
          isOffline: false,
          isTestMode: true,
          message: testMsg,
          student: testStudent,
          record: testRecord,
          channelId: activeCh,
          channelName: channelLabel
        });

        // Masukkan hasil pemindaian langsung ke tabel "Riwayat Presensi Real-Time" di memori layar browser
        setHistory((prev) => [
          {
            id: testRecord?.id || `test-${Date.now()}`,
            student: testStudent,
            record: testRecord,
            isTest: true
          },
          ...prev.slice(0, 49)
        ]);

        if (scanResultTimerRef.current) clearTimeout(scanResultTimerRef.current);
        scanResultTimerRef.current = setTimeout(() => {
          setScanResult(null);
          inputRef.current?.focus({ preventScroll: true });
        }, 3500);

        setChannels((prev) =>
          prev.map((ch) =>
            ch.id === activeCh ? { ...ch, totalScans: ch.totalScans + 1 } : ch
          )
        );

        // PENTING: RETURN SEGERA AGAR TIDAK MEMANGGIL /api/attendance/scan MAUPUN enqueueOfflineScan
        return;
      }

      // Try online scan first if browser reports online
      if (navigator.onLine && isOnline) {
        try {
          const { data } = await axios.post('/api/attendance/scan', {
            qrCode: cleanText,
            type: type,
            sourcePortId: activeCh,
            terminalId: getTerminalId()
          }, { timeout: 3000 });

          playAudioFeedback(true);

          if (data.record?.type && (data.record.type === 'ARRIVAL' || data.record.type === 'DEPARTURE')) {
            if (type !== data.record.type) {
              setType(data.record.type);
            }
          }

          const elapsed = Date.now() - startExecutionTime;
          if (elapsed < minFeedbackDelay) {
            await new Promise((r) => setTimeout(r, minFeedbackDelay - elapsed));
          }

          setScanResult({
            success: true,
            isOffline: false,
            message: `Presensi Berhasil: ${data.student?.name || 'Siswa'} (${data.record?.type === 'DEPARTURE' ? 'Pulang' : 'Datang'})`,
            student: data.student,
            record: data.record,
            channelId: activeCh,
            channelName: channelLabel
          });

          if (scanResultTimerRef.current) clearTimeout(scanResultTimerRef.current);
          scanResultTimerRef.current = setTimeout(() => {
            setScanResult(null);
            inputRef.current?.focus({ preventScroll: true });
          }, 3500);

          setChannels((prev) =>
            prev.map((ch) =>
              ch.id === activeCh ? { ...ch, totalScans: ch.totalScans + 1 } : ch
            )
          );

          fetchRealtimeHistory();
          if (pendingQueueCount > 0) {
            triggerAutoSync();
          }
          return;
        } catch (e: any) {
          // If server responded with a business rejection (400, 403, 404, or OUT_OF_SCHEDULE), do not treat as offline timeout!
          if (e.response && (e.response.status === 400 || e.response.status === 403 || e.response.status === 404 || e.response.data?.code === 'OUT_OF_SCHEDULE')) {
            playAudioFeedback(false);
            const isOutOfSchedule = e.response.status === 403 || e.response.data?.code === 'OUT_OF_SCHEDULE';
            const errMsg = isOutOfSchedule
              ? 'Presensi Gagal: Di Luar Jadwal Resmi'
              : (e.response?.data?.error || 'Gagal memproses presensi kartu');
            const errDetail = e.response?.data?.error;

            const elapsed = Date.now() - startExecutionTime;
            if (elapsed < minFeedbackDelay) {
              await new Promise((r) => setTimeout(r, minFeedbackDelay - elapsed));
            }

            setScanResult({
              success: false,
              isOutOfSchedule,
              message: errMsg,
              errorDetail: errDetail,
              barcode: cleanText,
              channelId: activeCh,
              channelName: channelLabel
            });

            if (scanResultTimerRef.current) clearTimeout(scanResultTimerRef.current);
            scanResultTimerRef.current = setTimeout(() => {
              setScanResult(null);
              inputRef.current?.focus({ preventScroll: true });
            }, 4000);
            return;
          }
          // Network error or timeout -> fall through to offline queue
          console.warn('[Scanner] Network drop / timeout. Fallback to IndexedDB offline queue:', e.message);
          setIsOnline(false);
        }
      }

      // OFFLINE QUEUE FALLBACK (Requirement 1 & 2):
      // Record scan into IndexedDB with calibrated clock offset
      try {
        const offlineRecord = await enqueueOfflineScan({
          barcode: cleanText,
          type: type
        });

        // Instant audio & visual feedback so student queue keeps moving uninterrupted!
        playAudioFeedback(true);

        const count = await getPendingScansCount();
        setPendingQueueCount(count);

        const elapsed = Date.now() - startExecutionTime;
        if (elapsed < minFeedbackDelay) {
          await new Promise((r) => setTimeout(r, minFeedbackDelay - elapsed));
        }

        setScanResult({
          success: true,
          isOffline: true,
          message: `Presensi Dicatat Offline: ${offlineRecord.studentName} (Tersimpan Lokal)`,
          student: {
            id: cleanText,
            name: offlineRecord.studentName,
            nisn: cleanText,
            class: offlineRecord.studentClass
          },
          record: {
            id: `offline-${offlineRecord.id || Date.now()}`,
            timestamp: offlineRecord.timestamp,
            status: 'PRESENT',
            type: offlineRecord.type
          },
          channelId: activeCh,
          channelName: channelLabel
        });

        if (scanResultTimerRef.current) clearTimeout(scanResultTimerRef.current);
        scanResultTimerRef.current = setTimeout(() => {
          setScanResult(null);
          inputRef.current?.focus({ preventScroll: true });
        }, 3500);

        setChannels((prev) =>
          prev.map((ch) =>
            ch.id === activeCh ? { ...ch, totalScans: ch.totalScans + 1 } : ch
          )
        );
      } catch (err: any) {
        playAudioFeedback(false);

        const elapsed = Date.now() - startExecutionTime;
        if (elapsed < minFeedbackDelay) {
          await new Promise((r) => setTimeout(r, minFeedbackDelay - elapsed));
        }

        setScanResult({
          success: false,
          message: `Gagal mencatat ke antrean offline: ${err.message || 'IndexedDB Error'}`,
          channelId: activeCh,
          channelName: channelLabel
        });

        if (scanResultTimerRef.current) clearTimeout(scanResultTimerRef.current);
        scanResultTimerRef.current = setTimeout(() => {
          setScanResult(null);
        }, 3500);
      }
    },
    [type, activeSessionStatus, isOnline, isTestMode, pendingQueueCount, fetchRealtimeHistory, triggerAutoSync]
  );

  // 2. Central FIFO Sequential Queue & Mutex Dispatcher
  const triggerQueueProcessor = useCallback(async () => {
    if (isProcessingQueueRef.current) return;
    if (scanQueueRef.current.length === 0) return;

    isProcessingQueueRef.current = true;
    const currentItem = scanQueueRef.current.shift();

    if (currentItem) {
      try {
        await executeScanTransaction(currentItem.barcode, currentItem.channelId, currentItem.channelName);
      } catch (err) {
        console.warn('[ScanEngine] Transaction execution error:', err);
      }
    }

    isProcessingQueueRef.current = false;

    // Continue sequentially if there are more items in queue
    if (scanQueueRef.current.length > 0) {
      setTimeout(() => {
        triggerQueueProcessor();
      }, 50);
    }
  }, [executeScanTransaction]);

  // Enqueue function with 4-second Debounce Protection, Schedule Lockout & Immediate Visual Feedback
  const enqueueScanEvent = useCallback((rawBarcode: string, channelId: string, channelName: string) => {
    const cleanText = String(rawBarcode || '').trim();
    if (!cleanText || cleanText.length < 2) return;

    // 1. VALIDASI HARI & JAM OPERASIONAL DI TINGKAT BUFFER SCANNER (CLIENT ENFORCEMENT)
    // Blokir buffer pemrosesan jika gerbang ditutup (Kecuali Mode Uji Coba aktif)
    if (activeSessionStatus === 'OUTSIDE' && !isTestMode) {
      console.warn(`[ScanEngine] Input barcode '${cleanText}' diblokir karena gerbang presensi ditutup / di luar jadwal operasional.`);

      // Bunyikan audio nada peringatan / penolakan (beep gagal)
      playAudioFeedback(false);

      const notice = gateClosedReason || (
        currentTodaySchedule?.arrivalStart
          ? `Presensi ditutup. Jam operasional presensi hari ini: Datang (${currentTodaySchedule.arrivalStart} - ${currentTodaySchedule.arrivalEnd || '12:00'}) • Pulang (${currentTodaySchedule.departureStart || '13:00'} - ${currentTodaySchedule.departureEnd || '17:00'}).`
          : `Presensi ditutup. Hari ini (${getWIBDayName()}) adalah hari libur / bukan hari sekolah aktif.`
      );

      // Munculkan kartu error merah bertuliskan: "Presensi Gagal: Di Luar Jadwal Resmi"
      setScanResult({
        success: false,
        isOutOfSchedule: true,
        message: 'Presensi Gagal: Di Luar Jadwal Resmi',
        errorDetail: notice,
        barcode: cleanText,
        channelId,
        channelName
      });

      if (scanResultTimerRef.current) clearTimeout(scanResultTimerRef.current);
      scanResultTimerRef.current = setTimeout(() => {
        setScanResult(null);
      }, 4000);

      // BLOKIR BUFFER SCANNER: Jangan masukkan ke antrean dan jangan proses transaksi
      return;
    }

    const now = Date.now();
    const lastScanTime = recentCardScansRef.current.get(cleanText);

    // DEBOUNCE PROTECTION: 3-5 detik (cegah tap ganda kartu yang sama)
    if (lastScanTime && now - lastScanTime < 4000) {
      console.log(`[ScanEngine] Debounced duplicate tap on card '${cleanText}' (${now - lastScanTime}ms ago)`);
      return;
    }
    recentCardScansRef.current.set(cleanText, now);

    // Garbage collection for recentCardScansRef
    if (recentCardScansRef.current.size > 200) {
      for (const [key, t] of recentCardScansRef.current.entries()) {
        if (now - t > 15000) recentCardScansRef.current.delete(key);
      }
    }

    // Trigger instant visual channel detection indicator
    setDetectedSource({
      channelId,
      channelName,
      barcode: cleanText,
      timestamp: now
    });
    setActiveChannelFlashing(channelId);
    if (detectionBannerTimerRef.current) clearTimeout(detectionBannerTimerRef.current);
    detectionBannerTimerRef.current = setTimeout(() => {
      setDetectedSource(null);
      setActiveChannelFlashing(null);
    }, 3200);

    // Push into FIFO queue
    scanQueueRef.current.push({
      id: `${now}-${Math.random().toString(36).substring(2, 6)}`,
      barcode: cleanText,
      channelId,
      channelName,
      timestamp: now
    });

    // Run sequential processor
    triggerQueueProcessor();
  }, [triggerQueueProcessor, activeSessionStatus, isTestMode, gateClosedReason, currentTodaySchedule]);

  const enqueueScanEventRef = useRef(enqueueScanEvent);
  useEffect(() => {
    enqueueScanEventRef.current = enqueueScanEvent;
  }, [enqueueScanEvent]);

  // Clean up auto-dismiss timer on unmount
  useEffect(() => {
    return () => {
      if (scanResultTimerRef.current) clearTimeout(scanResultTimerRef.current);
      if (detectionBannerTimerRef.current) clearTimeout(detectionBannerTimerRef.current);
    };
  }, []);

  // 1a. SALURAN 1: USB VIRTUAL COM / SERIAL PORT (Multi-Device Bridge)
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: any = null;
    let isDisposed = false;

    const connectSerialBridge = () => {
      if (isDisposed) return;
      try {
        setSerialBridgeStatus('CONNECTING');
        ws = new WebSocket(serialBridgeUrl);

        ws.onopen = () => {
          if (isDisposed) return;
          console.log('[SerialBridge] Connected to multi-device bridge at', serialBridgeUrl);
          setSerialBridgeStatus('CONNECTED');
        };

        ws.onmessage = (event) => {
          if (isDisposed) return;
          try {
            const raw = typeof event.data === 'string' ? event.data.trim() : '';
            if (!raw) return;

            let barcode = '';
            let portName = '';
            try {
              const parsed = JSON.parse(raw);
              barcode = String(parsed.barcode || parsed.code || parsed.qrCode || parsed.data || parsed.text || '').trim();
              portName = parsed.port || parsed.channel || parsed.comPort || '';
            } catch {
              barcode = raw;
            }

            if (barcode && barcode.length >= 2) {
              const chName = portName ? `USB Serial COM (${portName})` : 'USB Virtual COM Bridge';
              if (enqueueScanEventRef.current) {
                enqueueScanEventRef.current(barcode, 'scanner_serial', chName);
              }
            }
          } catch (err) {
            console.warn('[SerialBridge] Message parse error:', err);
          }
        };

        ws.onerror = () => {
          if (isDisposed) return;
          setSerialBridgeStatus('STANDBY');
        };

        ws.onclose = () => {
          if (isDisposed) return;
          setSerialBridgeStatus('STANDBY');
          reconnectTimer = setTimeout(connectSerialBridge, 4000);
        };
      } catch (e) {
        setSerialBridgeStatus('STANDBY');
        reconnectTimer = setTimeout(connectSerialBridge, 5000);
      }
    };

    connectSerialBridge();

    return () => {
      isDisposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        ws.close();
      }
    };
  }, [serialBridgeUrl]);

  // 1b. SALURAN 2 & 3a: USB HID KEYBOARD, WIRELESS DONGLE 2.4GHz & BLUETOOTH HID
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      const isScannerInput = target && (target.classList.contains('zero-click-target') || target.id === 'scanner-direct-input');

      // If typing in normal input inside a modal (e.g. terminal ID or bridge URL), do not intercept
      if (isInput && !isScannerInput) {
        return;
      }

      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Escape'].includes(e.key)) {
        return;
      }

      const now = performance.now();
      const interval = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // If paused for more than 160ms, reset buffer (new scan or human typing break)
      if (interval > 160) {
        scanBuffer.current = '';
        keyTimesRef.current = [];
      }

      if (e.key === 'Enter' || e.key === 'Tab') {
        const fullPayload = (scanBuffer.current || (isScannerInput ? (target as HTMLInputElement)?.value : '')).trim();
        const intervals = [...keyTimesRef.current];

        scanBuffer.current = '';
        keyTimesRef.current = [];

        if (isScannerInput && (target as HTMLInputElement)) {
          (target as HTMLInputElement).value = '';
        }
        setManualInput('');

        if (fullPayload.length >= 2) {
          e.preventDefault();
          e.stopPropagation();

          // Calculate average typing speed
          const avgInterval = intervals.length > 0
            ? intervals.reduce((a, b) => a + b, 0) / intervals.length
            : 0;

          // Barcode scanner hardware keystrokes arrive in rapid succession (< 75ms per char)
          const isHardwareBurst = avgInterval < 75 || intervals.length >= 4 || isScannerInput;
          const channelName = isHardwareBurst
            ? (intervals.length > 0 && avgInterval < 35 ? 'USB HID Gun (High-Speed)' : 'Wireless 2.4GHz / BLE HID')
            : 'Keyboard Input';

          getAudioContext();
          if (enqueueScanEventRef.current) {
            enqueueScanEventRef.current(fullPayload, 'scanner_hid', channelName);
          }
        }
        return;
      }

      if (e.key.length === 1) {
        scanBuffer.current += e.key;
        keyTimesRef.current.push(interval);

        if (bufferResetTimer.current) {
          clearTimeout(bufferResetTimer.current);
        }
        bufferResetTimer.current = setTimeout(() => {
          scanBuffer.current = '';
          keyTimesRef.current = [];
        }, 180);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
      if (bufferResetTimer.current) clearTimeout(bufferResetTimer.current);
    };
  }, [getAudioContext]);

  const rawTheme = THEME_PRESETS[scannerThemePreset] || THEME_PRESETS.indigo;
  const activeScannerTheme = {
    ...rawTheme,
    isDark: isScannerDark,
    primary: scannerThemeColor || rawTheme.primary
  };

  const scannerFinalBg = scannerBgImage || globalSettings.backgroundImage || globalSettings.background_image || '';
  const calculatedBoxBg = activeScannerTheme.id === 'aqua_glass'
    ? (activeScannerTheme.isDark ? 'rgba(15, 23, 42, 0.58)' : 'rgba(255, 255, 255, 0.65)')
    : hexToRgba(scannerBoxBgColor, scannerBoxOpacity);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        bgcolor: activeScannerTheme.bgDefault || '#f4f7fb',
        p: { xs: 2, sm: 3, md: 4 },
        pt: isTestMode ? { xs: 7, sm: 7.5, md: 8 } : { xs: 3, md: 4 },
        pb: { xs: 9, md: 10 },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: scannerFinalBg
          ? `url(${scannerFinalBg})`
          : activeScannerTheme.id === 'aqua_glass'
          ? (activeScannerTheme.isDark
              ? 'radial-gradient(at 0% 0%, rgba(2, 132, 199, 0.45) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(5, 150, 105, 0.40) 0px, transparent 50%), radial-gradient(at 50% 50%, rgba(16, 185, 129, 0.35) 0px, transparent 50%), radial-gradient(at 0% 100%, rgba(14, 165, 233, 0.40) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(13, 148, 136, 0.45) 0px, transparent 50%), #090d16'
              : 'radial-gradient(at 0% 0%, rgba(56, 189, 248, 0.50) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(52, 211, 153, 0.45) 0px, transparent 50%), radial-gradient(at 50% 50%, rgba(110, 231, 183, 0.40) 0px, transparent 50%), radial-gradient(at 0% 100%, rgba(125, 211, 252, 0.45) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(45, 212, 191, 0.40) 0px, transparent 50%), #e6f6f9')
          : activeScannerTheme.isDark
          ? 'linear-gradient(135deg, #090d16 0%, #0f172a 50%, #1e293b 100%)'
          : activeScannerTheme.bgDefault
          ? `linear-gradient(135deg, ${activeScannerTheme.bgDefault} 0%, #cbd5e1 100%)`
          : 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        color: activeScannerTheme.textColorPrimary || '#0f172a',
        position: 'relative'
      }}
    >
      {/* BANNER MELAYANG MENCOLOK: MODE UJI COBA / SIMULASI AKTIF */}
      {isTestMode && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            background: 'linear-gradient(90deg, #b45309 0%, #f59e0b 50%, #b45309 100%)',
            color: '#ffffff',
            py: 1,
            px: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
            boxShadow: '0 4px 20px rgba(180, 83, 9, 0.5)',
            borderBottom: '2px solid #fef3c7',
            animation: 'kioskTestModeBannerPulse 2s infinite',
            '@keyframes kioskTestModeBannerPulse': {
              '0%, 100%': { opacity: 1, filter: 'brightness(1)' },
              '50%': { opacity: 0.92, filter: 'brightness(1.08)' }
            }
          }}
        >
          <FlashIcon sx={{ fontSize: 22, color: '#fef08a' }} />
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 900,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              textAlign: 'center',
              fontSize: { xs: '0.74rem', sm: '0.84rem' }
            }}
          >
            MODE UJI COBA / SIMULASI AKTIF — PRESENSI TIDAK DICATAT KE DATABASE
          </Typography>
          <Chip
            size="small"
            label="SIMULASI"
            sx={{
              bgcolor: '#ffffff',
              color: '#b45309',
              fontWeight: 900,
              fontSize: '0.68rem',
              height: 20
            }}
          />
        </Box>
      )}

      {/* BANNER / OVERLAY VISUAL PERINGATAN KETIKA DI LUAR JADWAL OPERASIONAL */}
      {activeSessionStatus === 'OUTSIDE' && !isTestMode && (
        <Box
          sx={{
            width: '100%',
            maxWidth: '1440px',
            mb: 2.5,
            animation: 'fadeIn 0.3s ease'
          }}
        >
          <Paper
            elevation={4}
            sx={{
              p: 2,
              px: { xs: 2, sm: 3 },
              borderRadius: 3,
              bgcolor: '#dc2626',
              background: 'linear-gradient(90deg, #991b1b 0%, #dc2626 50%, #991b1b 100%)',
              color: '#ffffff',
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'flex-start', md: 'center' },
              justifyContent: 'space-between',
              gap: 1.5,
              border: '1.5px solid #fecaca',
              boxShadow: '0 6px 20px rgba(220, 38, 38, 0.35)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: 2,
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <LockIcon sx={{ fontSize: 26, color: '#ffffff' }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                  Gerbang Presensi Ditutup / Di Luar Jadwal Operasional
                </Typography>
                <Typography variant="body2" sx={{ color: '#fef2f2', fontWeight: 600, mt: 0.3 }}>
                  {currentTodaySchedule?.arrivalStart ? (
                    `Presensi ditutup. Jam operasional presensi hari ini: ${currentTodaySchedule.arrivalStart} - ${currentTodaySchedule.departureEnd || currentTodaySchedule.departureStart || currentTodaySchedule.arrivalEnd || '17:00'}${gateClosedReason ? ` • ${gateClosedReason}` : ''}`
                  ) : (
                    gateClosedReason || `Presensi ditutup. Hari ini (${getWIBDayName()}) bukan hari kerja/sekolah aktif.`
                  )}
                </Typography>
              </Box>
            </Box>

            <Chip
              size="small"
              label="INPUT SCANNER DIBLOKIR"
              sx={{
                bgcolor: '#ffffff',
                color: '#dc2626',
                fontWeight: 900,
                fontSize: '0.72rem',
                letterSpacing: 0.5,
                height: 24,
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
              }}
            />
          </Paper>
        </Box>
      )}

      <Grid
        container
        spacing={3}
        sx={{
          maxWidth: '1440px',
          width: '100%',
          my: 'auto',
          alignItems: 'stretch'
        }}
      >
        {/* LEFT COLUMN: SCHOOL HEADER, CLOCK & REAL-TIME HISTORY */}
        <Grid size={{ xs: 12, md: 7.5 }}>
          <Stack spacing={3} sx={{ height: '100%' }}>
            {/* Header School Logo & Controls Card */}
            <Paper
              elevation={4}
              sx={{
                p: { xs: 2, sm: 3 },
                borderRadius: 4,
                bgcolor: calculatedBoxBg,
                backdropFilter: 'blur(12px)',
                boxShadow: '0 8px 28px -4px rgba(15, 23, 42, 0.12)'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: { xs: 48, sm: 56 },
                      height: { xs: 48, sm: 56 },
                      minWidth: { xs: 48, sm: 56 },
                      minHeight: { xs: 48, sm: 56 },
                      borderRadius: 2.5,
                      bgcolor: activeScannerTheme.isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(2, 132, 199, 0.08)',
                      p: 0.6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      border: '1px solid',
                      borderColor: activeScannerTheme.isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(2, 132, 199, 0.18)',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                      flexShrink: 0
                    }}
                  >
                    <img
                      src={getSafeImageUrl(globalSettings.logoBase64 || globalSettings.logo || globalSettings.logoUrl || globalSettings.logo_url)}
                      alt="Logo Sekolah"
                      loading="eager"
                      decoding="async"
                      onError={(e) => handleImageError(e, DEFAULT_SCHOOL_LOGO_SVG)}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        display: 'block'
                      }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="h5" color="text.primary" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
                      {globalSettings.websiteName || globalSettings.nama_website || globalSettings.school_name || globalSettings.schoolName || judulAplikasi || 'DIGITAL PRESENSI SMK'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      {judulAplikasi || 'Portal Presensi Siswa Mandiri'} • Kiosk Mode &amp; Zero-Click Auto-Scan
                    </Typography>
                  </Box>
                </Box>

                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* 5. KIOSK OFFLINE QUEUE / SYNC STATUS BADGE */}
                  <Tooltip title="Klik atau tekan F9 / Ctrl+Shift+E untuk Menu Cadangan Darurat Kiosk" arrow>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setEditingTerminalId(terminalId);
                        setIsEmergencyModalOpen(true);
                      }}
                      sx={{
                        borderRadius: 2,
                        fontWeight: 700,
                        textTransform: 'none',
                        fontSize: '0.78rem',
                        borderColor: !isOnline || pendingQueueCount > 0 ? '#f59e0b' : '#22c55e',
                        color: !isOnline || pendingQueueCount > 0 ? '#d97706' : '#16a34a',
                        bgcolor: !isOnline || pendingQueueCount > 0 ? (activeScannerTheme.isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb') : (activeScannerTheme.isDark ? 'rgba(34, 197, 94, 0.15)' : '#f0fdf4'),
                        '&:hover': {
                          borderColor: !isOnline || pendingQueueCount > 0 ? '#d97706' : '#15803d'
                        }
                      }}
                      startIcon={
                        isSyncing ? (
                          <SyncIcon sx={{ fontSize: 16, animation: 'spin 1s linear infinite' }} />
                        ) : !isOnline ? (
                          <CloudOfflineIcon sx={{ fontSize: 16 }} />
                        ) : (
                          <CloudOnlineIcon sx={{ fontSize: 16 }} />
                        )
                      }
                    >
                      {isSyncing
                        ? `Sync (${pendingQueueCount})...`
                        : !isOnline
                        ? `Offline • ${pendingQueueCount} Antrean`
                        : pendingQueueCount > 0
                        ? `${pendingQueueCount} Pending Sync`
                        : 'Online • Kiosk Sync'}
                    </Button>
                  </Tooltip>

                  {/* SESSION BADGE */}
                  {isTestMode ? (
                    <Chip
                      icon={<FlashIcon sx={{ fontSize: '16px !important', color: '#ffffff !important' }} />}
                      label="Mode Uji Coba (Siap Scan)"
                      sx={{
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        px: 1.2,
                        py: 1.8,
                        borderRadius: 2,
                        bgcolor: '#d97706',
                        color: '#ffffff',
                        boxShadow: '0 4px 12px rgba(217, 119, 6, 0.4)',
                        animation: 'pulse 2s infinite'
                      }}
                    />
                  ) : activeSessionStatus === 'OUTSIDE' ? (
                    <Chip
                      icon={<LockIcon sx={{ fontSize: '16px !important', color: '#ffffff !important' }} />}
                      label="Gerbang Presensi Ditutup / Di Luar Jadwal Operasional"
                      sx={{
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        px: 1.2,
                        py: 1.8,
                        borderRadius: 2,
                        bgcolor: '#dc2626',
                        color: '#ffffff',
                        boxShadow: '0 4px 12px rgba(220, 38, 38, 0.35)'
                      }}
                    />
                  ) : activeSessionStatus === 'DEPARTURE' ? (
                    <Chip
                      label="Sesi: Presensi Pulang"
                      color="warning"
                      sx={{
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        px: 1.2,
                        py: 1.8,
                        borderRadius: 2
                      }}
                    />
                  ) : (
                    <Chip
                      label="Sesi: Presensi Datang"
                      color="primary"
                      sx={{
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        px: 1.2,
                        py: 1.8,
                        borderRadius: 2
                      }}
                    />
                  )}

                  <Button
                    variant="outlined"
                    size="small"
                    color={isFullscreen ? 'success' : 'inherit'}
                    startIcon={isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                    onClick={toggleFullscreen}
                    sx={{
                      borderRadius: 2,
                      fontWeight: 700,
                      textTransform: 'none',
                      bgcolor: isFullscreen ? '#f0fdf4' : '#ffffff'
                    }}
                  >
                    {isFullscreen ? 'Keluar Kiosk' : 'Layar Penuh'}
                  </Button>
                </Stack>
              </Box>
            </Paper>

            {/* Live Multi-Client Synchronized Feed (2. PERLUAS AREA RIWAYAT SCAN - FULL-HEIGHT) */}
            <Paper
              elevation={4}
              sx={{
                p: { xs: 2.5, sm: 3 },
                borderRadius: 4,
                flexGrow: 1,
                bgcolor: calculatedBoxBg,
                backdropFilter: 'blur(10px)',
                display: 'flex',
                flexDirection: 'column',
                minHeight: { xs: 450, md: 540 },
                boxShadow: '0 8px 28px -4px rgba(15, 23, 42, 0.12)'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="h6" color="text.primary" sx={{ fontWeight: 800 }}>
                  Riwayat Presensi Real-Time
                </Typography>
                <Chip
                  label={`${totalTodayScans > 0 ? totalTodayScans : history.length} Siswa`}
                  size="small"
                  color="primary"
                  sx={{ fontWeight: 700 }}
                />
              </Box>
              <Divider sx={{ mb: 2 }} />

              <Stack
                spacing={1.2}
                sx={{
                  flexGrow: 1,
                  overflowY: 'auto',
                  maxHeight: { xs: '450px', md: '560px' },
                  pr: 0.5
                }}
              >
                {history.length === 0 ? (
                  <Typography
                    color="text.secondary"
                    variant="body2"
                    sx={{ fontStyle: 'italic', textAlign: 'center', py: 4 }}
                  >
                    Menunggu pemindaian kartu perdana dari pos scanner...
                  </Typography>
                ) : (
                  history.map((item, idx) => (
                    <Box
                      key={item.record?.id || idx}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 1.25,
                        px: 2,
                        borderRadius: 2.5,
                        bgcolor: idx === 0 ? (activeScannerTheme.isDark ? 'rgba(56, 189, 248, 0.15)' : '#eff6ff') : (activeScannerTheme.isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc'),
                        border: '1px solid',
                        borderColor: idx === 0 ? (activeScannerTheme.isDark ? '#38bdf8' : '#93c5fd') : (activeScannerTheme.isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'),
                        transition: 'all 0.2s',
                        '&:hover': {
                          transform: 'translateY(-1px)'
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            bgcolor: idx === 0 ? 'primary.main' : '#cbd5e1',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '0.85rem'
                          }}
                        >
                          {item.student?.name ? item.student.name.charAt(0).toUpperCase() : 'S'}
                        </Box>
                        <Box>
                          <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: activeScannerTheme.textColorPrimary || '#1e293b' }}>
                            {item.student?.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                            {item.student?.year} {item.student?.class} • NISN: {item.student?.nisn}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.3 }}>
                        <Typography variant="body2" color="text.primary" sx={{ fontWeight: 800 }}>
                          {item.record?.timestamp
                            ? new Date(item.record.timestamp).toLocaleTimeString('id-ID', {
                                timeZone: 'Asia/Jakarta'
                              }).substring(0, 5)
                            : '-'}
                        </Typography>
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                          {(item.isTest || item.record?.isTest) && (
                            <Chip
                              label="[UJI COBA]"
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.64rem',
                                fontWeight: 800,
                                borderRadius: 1,
                                bgcolor: '#f59e0b',
                                color: '#ffffff',
                                letterSpacing: 0.3
                              }}
                            />
                          )}
                          <Chip
                            label={item.record?.type === 'DEPARTURE' ? 'Pulang' : 'Datang'}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, borderRadius: 1 }}
                          />
                          <Chip
                            label={item.record?.status === 'LATE' ? 'Terlambat' : 'Tepat Waktu'}
                            size="small"
                            color={item.record?.status === 'LATE' ? 'warning' : 'success'}
                            sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700, borderRadius: 1 }}
                          />
                        </Stack>
                      </Box>
                    </Box>
                  ))
                )}
              </Stack>
            </Paper>
          </Stack>
        </Grid>

        {/* RIGHT COLUMN: DIGITAL CLOCK (TOP) & UNIFIED SCANNER ZONE (BOTTOM) */}
        <Grid size={{ xs: 12, md: 4.5 }}>
          <Stack spacing={2.5} sx={{ height: '100%' }}>
            {/* 1. REPOSISI BLOK WAKTU & TANGGAL KE SISI KANAN ATAS */}
            <Paper
              elevation={4}
              sx={{
                py: { xs: 2, sm: 2.2 },
                px: { xs: 2.5, sm: 3 },
                borderRadius: 4,
                bgcolor: calculatedBoxBg,
                backdropFilter: 'blur(10px)',
                textAlign: 'center',
                boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 900,
                  color: 'text.primary',
                  letterSpacing: 1.5,
                  fontSize: { xs: '2.2rem', sm: '2.6rem', md: '2.8rem' },
                  lineHeight: 1.15
                }}
              >
                {getWIBTimeString(currentTime)}
              </Typography>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ fontWeight: 700, mt: 0.6, letterSpacing: 0.2 }}
              >
                {formatWIBDateIndo(currentTime)}
              </Typography>
            </Paper>

            {/* 3. PENATAAN ZONA PEMINDAIAN SISI KANAN (DI BAWAH BLOK WAKTU) */}
            <Paper
              elevation={6}
              sx={{
                p: { xs: 2.5, md: 3.5 },
                borderRadius: 4,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                minHeight: { xs: 380, md: 450 },
                flexGrow: 1,
                bgcolor: calculatedBoxBg,
                backdropFilter: 'blur(12px)',
                boxShadow: '0 12px 36px -4px rgba(15, 23, 42, 0.15)',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative'
              }}
            >
            {detectedSource && !scanResult ? (
              /* INDIKATOR VISUAL INSTAN SALURAN INPUT SEBELUM BERALIH KE PENGUMUMAN SISWA */
              <Box
                sx={{
                  py: { xs: 3, md: 4 },
                  px: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  my: 'auto',
                  animation: 'scannerCardPop 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '@keyframes scannerCardPop': {
                    '0%': { opacity: 0, transform: 'scale(0.92)' },
                    '100%': { opacity: 1, transform: 'scale(1)' }
                  }
                }}
              >
                <Box
                  sx={{
                    width: 76,
                    height: 76,
                    borderRadius: '50%',
                    bgcolor: '#22c55e',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                    boxShadow: '0 0 0 10px rgba(34, 197, 94, 0.25), 0 8px 24px rgba(34, 197, 94, 0.45)',
                    animation: 'radarPulse 1.2s infinite',
                    '@keyframes radarPulse': {
                      '0%': { boxShadow: '0 0 0 0 rgba(34, 197, 94, 0.5), 0 8px 24px rgba(34, 197, 94, 0.4)' },
                      '70%': { boxShadow: '0 0 0 16px rgba(34, 197, 94, 0), 0 8px 24px rgba(34, 197, 94, 0.4)' },
                      '100%': { boxShadow: '0 0 0 0 rgba(34, 197, 94, 0), 0 8px 24px rgba(34, 197, 94, 0.4)' }
                    }
                  }}
                >
                  <FlashIcon sx={{ fontSize: 44 }} />
                </Box>

                <Chip
                  label="⚡ KARTU TERDETEKSI"
                  size="small"
                  sx={{
                    bgcolor: 'rgba(34, 197, 94, 0.15)',
                    color: '#16a34a',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    letterSpacing: 1,
                    borderRadius: 2,
                    mb: 1.5,
                    border: '1px solid rgba(34, 197, 94, 0.4)'
                  }}
                />

                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 900,
                    color: activeScannerTheme.textColorPrimary || '#0f172a',
                    mb: 1
                  }}
                >
                  {detectedSource.channelName}
                </Typography>

                <Box
                  sx={{
                    bgcolor: activeScannerTheme.isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                    border: '1.5px dashed #22c55e',
                    borderRadius: 2.5,
                    px: 3,
                    py: 1.2,
                    mt: 1,
                    mb: 1.5
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block' }}>
                    BARCODE / NOMOR KARTU
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 1.5, color: '#16a34a' }}>
                    {detectedSource.barcode}
                  </Typography>
                </Box>

                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  Memverifikasi presensi ke database...
                </Typography>
              </Box>
            ) : scanResult && scanResult.success && scanResult.student ? (
              /* AUTO-REPLACE TAMPILAN KARTU BERHASIL SCAN */
              <Box
                sx={{
                  py: 3,
                  px: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  animation: 'scannerCardPop 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  '@keyframes scannerCardPop': {
                    '0%': { opacity: 0, transform: 'scale(0.92)' },
                    '100%': { opacity: 1, transform: 'scale(1)' }
                  }
                }}
              >
                {/* AVATAR / FOTO SISWA ATAU IKON SUKSES */}
                <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {scanResult.student.photo_url || scanResult.student.avatar ? (
                    <Box
                      sx={{
                        width: 76,
                        height: 76,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: '3px solid #22c55e',
                        boxShadow: '0 8px 24px rgba(34, 197, 94, 0.35)',
                        bgcolor: '#ffffff'
                      }}
                    >
                      <img
                        src={scanResult.student.photo_url || scanResult.student.avatar}
                        alt={scanResult.student.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          (e.target as any).style.display = 'none';
                        }}
                      />
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        width: 68,
                        height: 68,
                        borderRadius: '50%',
                        bgcolor: scanResult.isOffline ? '#fef3c7' : '#dcfce7',
                        color: scanResult.isOffline ? '#d97706' : '#16a34a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: scanResult.isOffline ? '0 8px 24px rgba(245, 158, 11, 0.25)' : '0 8px 24px rgba(34, 197, 94, 0.25)'
                      }}
                    >
                      <CheckCircleIcon sx={{ fontSize: 44 }} />
                    </Box>
                  )}
                </Box>

                {/* TEST MODE / DRY RUN BADGE ON RESULT CARD */}
                {scanResult.isTestMode && (
                  <Chip
                    icon={<FlashIcon sx={{ fontSize: '14px !important', color: '#ffffff !important' }} />}
                    label="[UJI COBA / DRY-RUN] • TIDAK TERSIMPAN KE DATABASE"
                    size="small"
                    sx={{
                      bgcolor: '#f59e0b',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      letterSpacing: '0.03em',
                      borderRadius: 1.5,
                      mb: 1,
                      boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)'
                    }}
                  />
                )}

                {/* CHANNEL SOURCE BADGE */}
                {scanResult.channelName && (
                  <Chip
                    icon={<SensorsIcon sx={{ fontSize: 13, color: '#16a34a !important' }} />}
                    label={`Saluran Input: ${scanResult.channelName}`}
                    size="small"
                    sx={{
                      bgcolor: activeScannerTheme.isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7',
                      color: '#15803d',
                      fontWeight: 700,
                      fontSize: '0.72rem',
                      letterSpacing: '0.02em',
                      borderRadius: 1.5,
                      mb: 1,
                      border: '1px solid rgba(34, 197, 94, 0.3)'
                    }}
                  />
                )}

                {/* OFFLINE INDICATOR BADGE ON RESULT CARD */}
                {scanResult.isOffline && !scanResult.isTestMode && (
                  <Chip
                    icon={<CloudOfflineIcon sx={{ fontSize: 14, color: '#ffffff !important' }} />}
                    label="OFFLINE KIOSK • TERSIMPAN DI INDEXEDDB"
                    size="small"
                    sx={{
                      bgcolor: '#d97706',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.7rem',
                      letterSpacing: '0.04em',
                      borderRadius: 1.5,
                      mb: 1
                    }}
                  />
                )}

                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 800,
                    color: scanResult.isTestMode ? '#d97706' : (scanResult.isOffline ? '#d97706' : '#16a34a'),
                    letterSpacing: 1.2,
                    textTransform: 'uppercase',
                    mb: 1
                  }}
                >
                  {scanResult.isTestMode
                    ? 'SIMULASI PRESENSI BERHASIL (DRY-RUN)'
                    : scanResult.isOffline
                    ? 'PRESENSI DICATAT (OFFLINE)'
                    : 'PRESENSI BERHASIL DIVERIFIKASI'}
                </Typography>

                {/* NAMA LENGKAP SISWA SANGAT BESAR & DOMINAN */}
                <Typography
                  variant="h3"
                  sx={{
                    fontSize: { xs: '1.8rem', sm: '2.2rem', md: '2.5rem' },
                    fontWeight: 900,
                    color: activeScannerTheme.isDark ? '#f8fafc' : '#0f172a',
                    lineHeight: 1.15,
                    mb: 1.5,
                    letterSpacing: '-0.5px',
                    wordBreak: 'break-word'
                  }}
                >
                  {scanResult.student.name}
                </Typography>

                <Divider sx={{ width: '85%', my: 1.5, borderColor: activeScannerTheme.isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0' }} />

                {/* INFORMASI PENDUKUNG */}
                <Stack spacing={1.2} sx={{ width: '100%', alignItems: 'center' }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <Chip
                      label={`Kelas: ${scanResult.student.year || ''} ${scanResult.student.class || ''}`}
                      size="medium"
                      sx={{
                        fontWeight: 800,
                        fontSize: '0.95rem',
                        bgcolor: activeScannerTheme.isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9',
                        color: activeScannerTheme.textColorPrimary || '#0f172a',
                        borderRadius: 2
                      }}
                    />
                    <Chip
                      label={`NISN: ${scanResult.student.nisn || scanResult.student.nis || '-'}`}
                      size="medium"
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.92rem',
                        bgcolor: activeScannerTheme.isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
                        border: '1px solid',
                        borderColor: activeScannerTheme.isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                        color: activeScannerTheme.textColorPrimary || '#0f172a',
                        borderRadius: 2
                      }}
                    />
                    <Chip
                      label={scanResult.record?.status === 'LATE' ? 'Terlambat' : 'Tepat Waktu'}
                      color={scanResult.record?.status === 'LATE' ? 'warning' : 'success'}
                      size="medium"
                      sx={{ fontWeight: 800, fontSize: '0.92rem', borderRadius: 2 }}
                    />
                  </Stack>

                  <Typography variant="body2" sx={{ fontWeight: 700, color: activeScannerTheme.isDark ? '#94a3b8' : '#64748b', mt: 0.5 }}>
                    Waktu: {scanResult.record?.timestamp ? new Date(scanResult.record.timestamp).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' }) : getWIBTimeString(currentTime)} WIB
                    {` • ${scanResult.record?.type === 'DEPARTURE' ? 'Sesi Pulang' : 'Sesi Datang'}`}
                  </Typography>
                </Stack>
              </Box>
            ) : scanResult && !scanResult.success ? (
              /* AUTO-REPLACE GAGAL SCAN CARD */
              <Box
                sx={{
                  py: 3,
                  px: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  animation: 'scannerCardPop 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  '@keyframes scannerCardPop': {
                    '0%': { opacity: 0, transform: 'scale(0.92)' },
                    '100%': { opacity: 1, transform: 'scale(1)' }
                  }
                }}
              >
                <Box
                  sx={{
                    width: 68,
                    height: 68,
                    borderRadius: '50%',
                    bgcolor: '#fee2e2',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                    boxShadow: '0 8px 24px rgba(220, 38, 38, 0.25)'
                  }}
                >
                  <XCircleIcon sx={{ fontSize: 44 }} />
                </Box>

                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 800,
                    color: '#dc2626',
                    mb: 1
                  }}
                >
                  {scanResult.isOutOfSchedule ? 'Presensi Gagal: Di Luar Jadwal Resmi' : 'PRESENSI GAGAL'}
                </Typography>

                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 700,
                    color: activeScannerTheme.textColorPrimary || '#0f172a',
                    px: 2,
                    py: 1,
                    bgcolor: '#fef2f2',
                    borderRadius: 2,
                    border: '1px solid #fecaca',
                    maxWidth: '100%',
                    mb: 1
                  }}
                >
                  {scanResult.errorDetail || scanResult.message}
                </Typography>

                {scanResult.barcode && (
                  <Chip
                    size="small"
                    label={`Nomor Kartu: ${scanResult.barcode}`}
                    sx={{
                      fontWeight: 700,
                      bgcolor: activeScannerTheme.isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2',
                      color: '#dc2626',
                      borderRadius: 1.5
                    }}
                  />
                )}
              </Box>
            ) : (activeSessionStatus === 'OUTSIDE' && !isTestMode) ? (
              /* 1. KARTU TUNGGAL TERPADU: GERBANG PRESENSI DITUTUP */
              <Box
                sx={{
                  py: { xs: 3, md: 4 },
                  px: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  my: 'auto',
                  animation: 'scannerCardPop 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  '@keyframes scannerCardPop': {
                    '0%': { opacity: 0, transform: 'scale(0.95)' },
                    '100%': { opacity: 1, transform: 'scale(1)' }
                  }
                }}
              >
                <Box
                  sx={{
                    width: 76,
                    height: 76,
                    borderRadius: '50%',
                    bgcolor: activeScannerTheme.isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                    boxShadow: '0 8px 24px rgba(239, 68, 68, 0.25)',
                    border: '2px solid',
                    borderColor: activeScannerTheme.isDark ? 'rgba(239, 68, 68, 0.3)' : '#fca5a5'
                  }}
                >
                  <LockIcon sx={{ fontSize: 40 }} />
                </Box>

                <Chip
                  icon={<LockIcon sx={{ fontSize: '14px !important', color: '#ef4444 !important' }} />}
                  label="GERBANG PRESENSI DITUTUP"
                  size="small"
                  sx={{
                    bgcolor: activeScannerTheme.isDark ? 'rgba(239, 68, 68, 0.2)' : '#fef2f2',
                    color: '#ef4444',
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    letterSpacing: 1,
                    borderRadius: 2,
                    mb: 1.5,
                    border: '1px solid',
                    borderColor: activeScannerTheme.isDark ? 'rgba(239, 68, 68, 0.4)' : '#fecaca'
                  }}
                />

                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 900,
                    color: activeScannerTheme.isDark ? '#f8fafc' : '#0f172a',
                    fontSize: { xs: '1.4rem', sm: '1.7rem', md: '1.9rem' },
                    mb: 1,
                    letterSpacing: '-0.5px'
                  }}
                >
                  Gerbang Presensi Ditutup
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    color: activeScannerTheme.isDark ? '#94a3b8' : '#64748b',
                    fontWeight: 600,
                    maxWidth: 380,
                    lineHeight: 1.6,
                    mb: 3
                  }}
                >
                  {currentTodaySchedule?.arrivalStart ? (
                    `Presensi ditutup. Jam operasional presensi hari ini: ${currentTodaySchedule.arrivalStart} - ${currentTodaySchedule.departureEnd || currentTodaySchedule.departureStart || currentTodaySchedule.arrivalEnd || '17:00'}${gateClosedReason ? ` • ${gateClosedReason}` : ''}`
                  ) : (
                    gateClosedReason || `Presensi ditutup. Hari ini (${getWIBDayName()}) bukan hari kerja/sekolah aktif.`
                  )}
                </Typography>

                <Paper
                  variant="outlined"
                  sx={{
                    px: 2.5,
                    py: 1.5,
                    borderRadius: 3,
                    bgcolor: activeScannerTheme.isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
                    borderColor: activeScannerTheme.isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.8,
                    alignItems: 'center'
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    {isTodaySchoolActive ? `Jadwal Hari Ini (${getWIBDayName()})` : `Status Hari Ini (${getWIBDayName()})`}
                  </Typography>
                  {isTodaySchoolActive && currentTodaySchedule ? (
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <Chip
                        size="small"
                        label={`Datang: ${currentTodaySchedule.arrivalStart || '06:30'} - ${currentTodaySchedule.arrivalEnd || '12:00'}`}
                        sx={{ fontWeight: 600, fontSize: '0.75rem', borderRadius: 1.5 }}
                      />
                      <Chip
                        size="small"
                        label={`Pulang: ${currentTodaySchedule.departureStart || '13:00'} - ${currentTodaySchedule.departureEnd || '17:00'}`}
                        sx={{ fontWeight: 600, fontSize: '0.75rem', borderRadius: 1.5 }}
                      />
                    </Stack>
                  ) : (
                    <Chip
                      size="small"
                      color="default"
                      label="Hari Libur / Sekolah Tidak Ada Jadwal"
                      sx={{ fontWeight: 700, fontSize: '0.75rem', borderRadius: 1.5 }}
                    />
                  )}
                </Paper>
              </Box>
            ) : (
              /* KARTU TERPADU: AREA PEMINDAIAN AKTIF */
              <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2, my: 'auto' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <Box
                      sx={{
                        p: 1.2,
                        borderRadius: 2.5,
                        bgcolor: activeChannelFlashing ? '#22c55e' : (activeScannerTheme.primary || '#0284c7'),
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <UsbIcon fontSize="small" />
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: activeScannerTheme.textColorPrimary || '#0f172a', lineHeight: 1.2 }}>
                        {isTestMode ? 'Zona Scan Uji Coba (Simulasi)' : 'Zona Pemindaian Multi-Kanal'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: isTestMode ? '#d97706' : (!isOnline ? '#d97706' : '#16a34a'), fontWeight: 700 }}>
                        {isTestMode ? 'Siap Menerima Scan Uji Coba • Data Bebas DB' : (!isOnline ? 'Mode Offline Aktif • Auto-Queue' : 'Universal Hybrid Scanner Engine Aktif')}
                      </Typography>
                    </Box>
                  </Stack>

                  <Chip
                    icon={isTestMode ? <FlashIcon sx={{ fontSize: '13px !important' }} /> : <SensorsIcon sx={{ fontSize: 13 }} />}
                    label={isTestMode ? 'Uji Coba Aktif' : (!isOnline ? 'Offline Queue' : 'Bebas Fokus')}
                    size="small"
                    color={isTestMode ? 'warning' : (!isOnline ? 'warning' : 'success')}
                    sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                  />
                </Box>

                {/* 3. INDIKATOR STATUS PERANGKAT DINAMIS MASING-MASING KANAL */}
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderRadius: 2.5,
                    bgcolor: activeScannerTheme.isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
                    borderColor: activeScannerTheme.isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    Status Kanal Input Pemindai
                  </Typography>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flexWrap: 'wrap' }}>
                    {/* Saluran 1: Serial Bridge */}
                    <Chip
                      icon={<CableIcon sx={{ fontSize: '15px !important' }} />}
                      label={serialBridgeStatus === 'CONNECTED' ? 'Serial Bridge: Terhubung' : 'Serial Bridge: Standby'}
                      size="small"
                      color={serialBridgeStatus === 'CONNECTED' ? 'success' : 'default'}
                      variant={serialBridgeStatus === 'CONNECTED' ? 'filled' : 'outlined'}
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        borderRadius: 2,
                        py: 0.5,
                        borderColor: serialBridgeStatus === 'CONNECTED' ? undefined : (activeScannerTheme.isDark ? '#475569' : '#cbd5e1'),
                        bgcolor: serialBridgeStatus === 'CONNECTED' ? undefined : (activeScannerTheme.isDark ? 'rgba(255,255,255,0.05)' : '#ffffff')
                      }}
                    />

                    {/* Saluran 2: HID Keyboard & Wireless 2.4GHz */}
                    <Chip
                      icon={<KeyboardIcon sx={{ fontSize: '15px !important' }} />}
                      label="HID / Wireless: Siap"
                      size="small"
                      color="success"
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        borderRadius: 2,
                        py: 0.5
                      }}
                    />

                    {/* Saluran 3: Network Barcode (IoT / BLE API) */}
                    <Chip
                      icon={<WifiIcon sx={{ fontSize: '15px !important' }} />}
                      label="Network Barcode: Siap"
                      size="small"
                      variant="outlined"
                      color="primary"
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        borderRadius: 2,
                        py: 0.5,
                        bgcolor: activeScannerTheme.isDark ? 'rgba(2, 132, 199, 0.1)' : '#f0f9ff'
                      }}
                    />
                  </Stack>
                </Paper>

                <Box sx={{ width: '100%' }}>
                  <TextField
                    fullWidth
                    id="scanner-direct-input"
                    className="zero-click-target"
                    inputRef={inputRef}
                    placeholder={
                      !isOnline
                        ? 'Mode Offline: Tetap scan kartu, data otomatis diantrekan...'
                        : 'Arahkan kartu ke scanner USB Gun atau ketik barcode...'
                    }
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = manualInput.trim();
                        if (val && enqueueScanEventRef.current) {
                          enqueueScanEventRef.current(val, 'scanner_hid', 'Input Manual / USB Gun');
                          setManualInput('');
                          scanBuffer.current = '';
                        }
                      }
                    }}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <Box sx={{ display: 'flex', alignItems: 'center', mr: 1, color: activeScannerTheme.primary || '#0284c7' }}>
                            <UsbIcon fontSize="small" />
                          </Box>
                        ),
                        endAdornment: (
                          <Chip
                            icon={<SensorsIcon sx={{ fontSize: 13 }} />}
                            label={!isOnline ? 'Offline Queue' : 'Auto-Capture'}
                            size="small"
                            color={!isOnline ? 'warning' : 'primary'}
                            sx={{ fontWeight: 700, fontSize: '0.7rem', height: 22 }}
                          />
                        ),
                        sx: {
                          bgcolor: activeScannerTheme.isDark ? '#1e293b' : '#ffffff',
                          borderRadius: 2.5,
                          border: `1.5px solid ${!isOnline ? '#f59e0b' : (activeScannerTheme.isDark ? '#334155' : '#cbd5e1')}`,
                          '&:hover': { borderColor: activeScannerTheme.primary },
                          '&.Mui-focused': { borderColor: activeScannerTheme.primary },
                          '& input': {
                            py: 1.8,
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            color: activeScannerTheme.textColorPrimary || '#1e293b'
                          }
                        }
                      }
                    }}
                    helperText={
                      !isOnline
                        ? 'Mode Offline aktif: Data tersimpan aman di IndexedDB DietPi dan otomatis disinkronkan saat terhubung.'
                        : 'Sistem otomatis menangkap barcode dari scanner USB Gun secara langsung di latar belakang.'
                    }
                  />
                </Box>
              </Box>
            )}
          </Paper>
          </Stack>
        </Grid>
      </Grid>

      {/* FIXED RUNNING TEXT FOOTER BAR AT VERY BOTTOM OF SCREEN */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1200,
          bgcolor: '#0f172a',
          color: '#ffffff',
          py: 1.2,
          px: { xs: 2, sm: 3 },
          borderTop: '2px solid #38bdf8',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          overflow: 'hidden'
        }}
      >
        <Chip
          icon={<CampaignIcon sx={{ fontSize: '16px !important', color: '#ffffff !important' }} />}
          label="PENGUMUMAN"
          size="small"
          sx={{
            bgcolor: '#0284c7',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '0.75rem',
            letterSpacing: '0.05em',
            borderRadius: 2,
            flexShrink: 0,
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
          }}
        />
        <Box
          sx={{
            flex: 1,
            overflow: 'hidden',
            position: 'relative',
            whiteSpace: 'nowrap',
            pl: { xs: 2.5, sm: 3 }, // Jarak padding-left minimal 20-24px dari badge PENGUMUMAN
            maskImage: 'linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)'
          }}
        >
          <Box
            component="span"
            sx={{
              display: 'inline-block',
              whiteSpace: 'nowrap',
              animation: 'scannerMarqueeAnim 26s linear infinite',
              '&:hover': {
                animationPlayState: 'paused'
              },
              '@keyframes scannerMarqueeAnim': {
                '0%': { transform: 'translateX(100%)' },
                '100%': { transform: 'translateX(-100%)' }
              },
              color: '#f8fafc',
              fontWeight: 600,
              fontSize: { xs: '0.88rem', sm: '0.95rem' },
              letterSpacing: '0.02em',
              cursor: 'default'
            }}
          >
            {runningText}
          </Box>
        </Box>
      </Box>

      {/* 5. MENU CADANGAN DARURAT TERMINAL KIOSK (DIETPI CHROMIUM KIOSK MODE) */}
      <Dialog
        open={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3.5,
              p: 1,
              bgcolor: activeScannerTheme.isDark ? '#0f172a' : '#ffffff',
              color: activeScannerTheme.textColorPrimary || '#0f172a',
              backgroundImage: 'none'
            }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <KioskIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Menu Darurat Terminal Kiosk (DietPi OS)
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setIsEmergencyModalOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, py: 2.5 }}>
          {/* Status Bar */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              bgcolor: activeScannerTheme.isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                Status Jaringan
              </Typography>
              <Chip
                icon={isOnline ? <CloudOnlineIcon sx={{ fontSize: 14 }} /> : <CloudOfflineIcon sx={{ fontSize: 14 }} />}
                label={isOnline ? 'Terhubung (Online)' : 'Terputus (Offline)'}
                size="small"
                color={isOnline ? 'success' : 'warning'}
                sx={{ fontWeight: 700 }}
              />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                Kalibrasi Waktu Server
              </Typography>
              <Chip
                label={`Offset: ${clockOffset >= 0 ? `+${clockOffset}` : clockOffset} ms`}
                size="small"
                variant="outlined"
                sx={{ fontWeight: 700 }}
              />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                Antrean Lokal IndexedDB
              </Typography>
              <Chip
                label={`${pendingQueueCount} Rekaman Belum Terkirim`}
                size="small"
                color={pendingQueueCount > 0 ? 'warning' : 'default'}
                sx={{ fontWeight: 700 }}
              />
            </Box>
          </Paper>

          {/* Terminal Identity */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Identitas Terminal Kiosk
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                fullWidth
                value={editingTerminalId}
                onChange={(e) => setEditingTerminalId(e.target.value.toUpperCase())}
                placeholder="Contoh: KIOSK-GERBANG-UTAMA"
              />
              <Button
                variant="contained"
                onClick={() => {
                  setTerminalId(editingTerminalId);
                  setTerminalIdState(editingTerminalId);
                }}
                sx={{ fontWeight: 700, textTransform: 'none', px: 2.5 }}
              >
                Simpan
              </Button>
            </Box>
          </Box>

          {/* USB Virtual COM / Serial Bridge Service Configuration */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Konfigurasi USB Virtual COM / Serial Bridge (Saluran 1)
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                fullWidth
                value={editingBridgeUrl}
                onChange={(e) => setEditingBridgeUrl(e.target.value)}
                placeholder="ws://localhost:8080"
                helperText={`Status Bridge: ${serialBridgeStatus === 'CONNECTED' ? 'Terhubung (Aktif)' : 'Standby / Mencoba terhubung...'}`}
              />
              <Button
                variant="contained"
                color="secondary"
                onClick={() => {
                  safeStorage.setItem('serialBridgeUrl', editingBridgeUrl);
                  setSerialBridgeUrl(editingBridgeUrl);
                }}
                sx={{ fontWeight: 700, textTransform: 'none', px: 2.5 }}
              >
                Terapkan
              </Button>
            </Box>
          </Box>

          <Divider />

          {/* Export & Actions */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Aksi &amp; Cadangan Darurat
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                startIcon={<RefreshIcon />}
                disabled={isSyncing || pendingQueueCount === 0 || !isOnline}
                onClick={triggerAutoSync}
                sx={{ fontWeight: 700, textTransform: 'none' }}
              >
                {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}
              </Button>

              <Button
                variant="outlined"
                color="inherit"
                fullWidth
                startIcon={<FileDownloadIcon />}
                disabled={pendingQueueCount === 0}
                onClick={() => exportQueueToJson()}
                sx={{ fontWeight: 700, textTransform: 'none' }}
              >
                Ekspor JSON
              </Button>

              <Button
                variant="outlined"
                color="inherit"
                fullWidth
                startIcon={<FileDownloadIcon />}
                disabled={pendingQueueCount === 0}
                onClick={() => exportQueueToCsv()}
                sx={{ fontWeight: 700, textTransform: 'none' }}
              >
                Ekspor CSV
              </Button>
            </Stack>
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5 }}>
              * Pintasan keyboard: Tekan <strong>F9</strong> atau <strong>Ctrl + Shift + E</strong> kapan saja untuk membuka menu ini.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsEmergencyModalOpen(false)} sx={{ fontWeight: 700, textTransform: 'none' }}>
            Tutup
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
