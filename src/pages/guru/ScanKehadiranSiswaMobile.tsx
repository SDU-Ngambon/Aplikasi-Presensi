import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  Alert,
  AlertTitle,
  Chip,
  IconButton,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import {
  QrCodeScanner as QrCodeScannerIcon,
  MyLocation as MyLocationIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  WarningAmber as WarningIcon,
  Cameraswitch as CameraswitchIcon,
  VolumeUp as VolumeUpIcon,
  Refresh as RefreshIcon,
  AccessTime as AccessTimeIcon,
  Person as PersonIcon,
  Badge as BadgeIcon,
  School as SchoolIcon,
  Lock as LockIcon,
  Sensors as SensorsIcon,
  FlashOn as FlashOnIcon,
  ArrowBack as ArrowBackIcon,
  LocationOn as LocationOnIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import CustomScanner from '../../components/CustomScanner';
import { safeStorage } from '../../safeStorage';
import { formatWIBDateIndo, getWIBTimeString, getWIBDayNameEnglish } from '../../timezone';

interface ScanKehadiranSiswaMobileProps {
  currentUser: any;
  isDutyToday: boolean;
  teacherDutyInfo?: string;
  onBack?: () => void;
}

interface SchoolGeoRule {
  school_latitude: number;
  school_longitude: number;
  school_location_name: string;
  max_distance_meters: number;
}

export default function ScanKehadiranSiswaMobile({
  currentUser,
  isDutyToday,
  teacherDutyInfo,
  onBack
}: ScanKehadiranSiswaMobileProps) {
  // Session Mode: Kedatangan vs Kepulangan
  const [scanType, setScanType] = useState<'ARRIVAL' | 'DEPARTURE'>('ARRIVAL');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Geolocation State
  const [geoStatus, setGeoStatus] = useState<'INITIAL' | 'CHECKING' | 'VALID' | 'OUT_OF_RANGE' | 'ERROR'>('INITIAL');
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [geoErrorMsg, setGeoErrorMsg] = useState<string>('');
  const [schoolRule, setSchoolRule] = useState<SchoolGeoRule>({
    school_latitude: -6.2088,
    school_longitude: 106.8456,
    school_location_name: 'Kampus Sekolah',
    max_distance_meters: 150
  });

  // Camera Facing
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Attendance Result & History
  const [scanResult, setScanResult] = useState<any>(null);
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  const recentScans = useRef<Record<string, number>>({});
  const isProcessingScan = useRef(false);

  // Audio Context for Beep
  const playSound = (isSuccess: boolean) => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (isSuccess) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      } else {
        osc.type = 'square';
        osc.frequency.setValueAtTime(260, ctx.currentTime);
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {}
  };

  // Clock Ticker & Auto-Sync Session Type from Schedule
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function checkScheduleSession() {
      try {
        const { data } = await axios.get('/api/settings');
        if (data && data.schedule) {
          const now = new Date();
          const currentDayEn = getWIBDayNameEnglish(now);
          const todaySchedule = data.schedule[currentDayEn] || data.schedule['Monday'];
          if (todaySchedule) {
            const timeStr = getWIBTimeString(now);
            const [h, m] = timeStr.split(':').map(Number);
            const currentTotalMins = (h || 0) * 60 + (m || 0);

            const parseTime = (str: string) => {
              if (!str) return 0;
              const [hour, min] = str.split(':').map(Number);
              return (hour || 0) * 60 + (min || 0);
            };
            const depStartMins = parseTime(todaySchedule.departureStart || data.jam_pulang || '13:00');
            const arrEndMins = parseTime(todaySchedule.arrivalEnd || data.jam_masuk || '12:00');

            if ((depStartMins > 0 && currentTotalMins >= depStartMins) || (arrEndMins > 0 && currentTotalMins >= arrEndMins)) {
              setScanType('DEPARTURE');
            } else {
              setScanType('ARRIVAL');
            }
          }
        }
      } catch (e) {}
    }
    checkScheduleSession();
  }, []);

  // Fetch School Attendance Rules (Coordinates & Geofence Radius)
  const fetchAttendanceRules = useCallback(async () => {
    try {
      const res = await axios.get('/api/attendance-rules');
      if (res.data && typeof res.data === 'object') {
        setSchoolRule({
          school_latitude: Number(res.data.school_latitude) || -6.2088,
          school_longitude: Number(res.data.school_longitude) || 106.8456,
          school_location_name: res.data.school_location_name || 'Kampus Sekolah',
          max_distance_meters: Number(res.data.max_distance_meters) || 150
        });
        return res.data;
      }
    } catch (err) {
      console.warn('Gagal memuat aturan kehadiran, memakai default', err);
    }
    return null;
  }, []);

  // Haversine Distance Formula (Returns Distance in Meters)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Radius bumi dalam meter
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const schoolRuleRef = useRef<SchoolGeoRule>(schoolRule);
  useEffect(() => {
    schoolRuleRef.current = schoolRule;
  }, [schoolRule]);

  const isVerifyingRef = useRef(false);

  // Mandatory Geolocation Verification
  const verifyGeolocation = useCallback(async () => {
    if (isVerifyingRef.current) return;
    if (!navigator.geolocation) {
      setGeoStatus('ERROR');
      setGeoErrorMsg('Browser atau smartphone Anda tidak mendukung fitur Geolocation GPS.');
      toast.dismiss();
      toast.error('Browser Anda tidak mendukung Geolocation GPS.', { id: 'geo-verify-toast' });
      return;
    }

    isVerifyingRef.current = true;
    setGeoStatus('CHECKING');
    setGeoErrorMsg('');

    // Ensure latest rules are fetched
    const latestRule = await fetchAttendanceRules();
    const targetLat = latestRule?.school_latitude ? Number(latestRule.school_latitude) : schoolRuleRef.current.school_latitude;
    const targetLon = latestRule?.school_longitude ? Number(latestRule.school_longitude) : schoolRuleRef.current.school_longitude;
    const maxRadius = latestRule?.max_distance_meters ? Number(latestRule.max_distance_meters) : schoolRuleRef.current.max_distance_meters;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        isVerifyingRef.current = false;
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;
        setUserCoords({ latitude: userLat, longitude: userLon });

        const distance = calculateDistance(userLat, userLon, targetLat, targetLon);
        setDistanceMeters(distance);

        // Tutup notifikasi sebelumnya untuk mencegah penumpukan (maksimal 1 notifikasi)
        toast.dismiss();

        if (distance <= maxRadius) {
          setGeoStatus('VALID');
          toast.success(`Lokasi Terverifikasi! Jarak ${distance}m (Di dalam radius ${maxRadius}m)`, {
            id: 'geo-verify-toast',
            duration: 2500
          });
        } else {
          setGeoStatus('OUT_OF_RANGE');
          toast.error(`Di Luar Sekolah! Jarak ${distance}m melebihi batas ${maxRadius}m.`, {
            id: 'geo-verify-toast',
            duration: 3000
          });
        }
      },
      (error) => {
        isVerifyingRef.current = false;
        setGeoStatus('ERROR');
        let msg = 'Gagal mendeteksi lokasi GPS.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Izin lokasi (GPS) ditolak. Mohon aktifkan izin akses lokasi pada browser smartphone Anda.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Sinyal GPS tidak tersedia atau sedang lemah. Pastikan GPS aktif dan berada di area terbuka.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Waktu permintaan GPS habis. Silakan klik tombol Cek Ulang Lokasi.';
        }
        setGeoErrorMsg(msg);
        toast.dismiss();
        toast.error(msg, { id: 'geo-verify-toast', duration: 3000 });
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 10000
      }
    );
  }, [fetchAttendanceRules]);

  // Run Geolocation check on mount automatically without extra clicks
  useEffect(() => {
    verifyGeolocation();
  }, [verifyGeolocation]);

  // Handle Barcode/QR Scan from Camera
  const handleScan = useCallback(
    async (decodedText: string) => {
      if (geoStatus !== 'VALID') {
        toast.error('Kamera terkunci: Lokasi GPS belum tervalidasi di dalam sekolah.');
        return;
      }

      const cleanText = decodedText.trim();
      if (!cleanText || isProcessingScan.current) return;

      const now = Date.now();
      // Debounce card for 2.5s
      if (recentScans.current[cleanText] && now - recentScans.current[cleanText] < 2500) {
        return;
      }
      recentScans.current[cleanText] = now;
      isProcessingScan.current = true;

      try {
        const { data } = await axios.post('/api/attendance/scan', {
          qrCode: cleanText,
          type: scanType,
          sourcePortId: 'mobile_camera_guru_piket'
        });

        playSound(true);
        setScanResult({
          success: true,
          message: `Presensi Berhasil: ${data.student?.name || 'Siswa'}`,
          student: data.student,
          record: data.record,
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        });

        if (data.record?.type && (data.record.type === 'ARRIVAL' || data.record.type === 'DEPARTURE')) {
          setScanType(data.record.type);
        }

        setSessionHistory((prev) => [
          {
            id: Date.now().toString(),
            studentName: data.student?.name || 'Siswa',
            studentClass: `${data.student?.year || ''} ${data.student?.class || ''}`.trim(),
            nisn: data.student?.nisn || cleanText,
            timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            status: data.record?.status || 'PRESENT',
            type: data.record?.type || scanType
          },
          ...prev
        ].slice(0, 20));

        toast.success(`Presensi tercatat: ${data.student?.name || 'Siswa'}`);
      } catch (err: any) {
        playSound(false);
        const errMsg = err.response?.data?.error || 'Kartu tidak dikenali atau gagal presensi.';
        setScanResult({
          success: false,
          message: errMsg,
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        });
        toast.error(errMsg);
      } finally {
        setTimeout(() => {
          isProcessingScan.current = false;
        }, 800);
      }
    },
    [geoStatus, scanType]
  );

  // Fallback / Non-piket access block
  if (!isDutyToday) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 3, textAlign: 'center' }}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 4,
            border: '2px dashed #fca5a5',
            bgcolor: '#fef2f2',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
          }}
        >
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              bgcolor: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#dc2626'
            }}
          >
            <LockIcon sx={{ fontSize: 38 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#991b1b' }}>
            Akses Dibatasi Khusus Guru Piket Hari Ini
          </Typography>
          <Typography variant="body2" sx={{ color: '#7f1d1d', maxWidth: 440 }}>
            Fitur <b>Scan Kehadiran Siswa Mobile</b> hanya dapat diakses oleh guru yang memiliki jadwal tugas piket bertepatan dengan tanggal hari ini.
          </Typography>
          <Box sx={{ p: 2, bgcolor: '#ffffff', borderRadius: 2.5, border: '1px solid #fecaca', width: '100%', maxWidth: 420 }}>
            <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', fontWeight: 600 }}>
              Status Jadwal Anda:
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1f2937' }}>
              {teacherDutyInfo || 'Tidak memiliki jadwal piket hari ini'}
            </Typography>
          </Box>
          {onBack && (
            <Button
              variant="outlined"
              color="inherit"
              onClick={onBack}
              startIcon={<ArrowBackIcon />}
              sx={{ mt: 1, textTransform: 'none', fontWeight: 700 }}
            >
              Kembali ke Menu Utama
            </Button>
          )}
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 680, mx: 'auto', pb: 8, px: { xs: 1.5, sm: 2 } }}>
      {/* Mobile Top App Bar */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 3.5,
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#ffffff',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)'
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            {onBack && (
              <IconButton size="small" onClick={onBack} sx={{ color: '#ffffff', mr: 0.5 }}>
                <ArrowBackIcon fontSize="small" />
              </IconButton>
            )}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.2rem' } }}>
                Scan Kehadiran Siswa
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                Mode Piket Gerbang • {formatWIBDateIndo(currentTime)}
              </Typography>
            </Box>
          </Stack>
          <Chip
            icon={<AccessTimeIcon sx={{ fontSize: '15px !important', color: '#38bdf8 !important' }} />}
            label={getWIBTimeString(currentTime)}
            size="small"
            sx={{
              bgcolor: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              fontWeight: 800,
              fontFamily: 'monospace'
            }}
          />
        </Stack>

        {/* Scan Type Toggle: Kedatangan vs Kepulangan */}
        <Box sx={{ mt: 1.5, p: 0.5, bgcolor: 'rgba(255, 255, 255, 0.08)', borderRadius: 2.5, display: 'flex', gap: 1 }}>
          <Button
            fullWidth
            size="small"
            variant={scanType === 'ARRIVAL' ? 'contained' : 'text'}
            onClick={() => setScanType('ARRIVAL')}
            sx={{
              borderRadius: 2,
              fontWeight: 800,
              textTransform: 'none',
              bgcolor: scanType === 'ARRIVAL' ? '#22c55e' : 'transparent',
              color: '#ffffff',
              '&:hover': { bgcolor: scanType === 'ARRIVAL' ? '#16a34a' : 'rgba(255,255,255,0.1)' }
            }}
          >
            Presensi Datang
          </Button>
          <Button
            fullWidth
            size="small"
            variant={scanType === 'DEPARTURE' ? 'contained' : 'text'}
            onClick={() => setScanType('DEPARTURE')}
            sx={{
              borderRadius: 2,
              fontWeight: 800,
              textTransform: 'none',
              bgcolor: scanType === 'DEPARTURE' ? '#f59e0b' : 'transparent',
              color: '#ffffff',
              '&:hover': { bgcolor: scanType === 'DEPARTURE' ? '#d97706' : 'rgba(255,255,255,0.1)' }
            }}
          >
            Presensi Pulang
          </Button>
        </Box>
      </Paper>

      {/* Geolocation Verification Banner (Mandatory Gate) */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2.5,
          borderRadius: 3,
          border: '1px solid',
          borderColor:
            geoStatus === 'VALID'
              ? '#86efac'
              : geoStatus === 'OUT_OF_RANGE'
              ? '#fca5a5'
              : geoStatus === 'CHECKING'
              ? '#93c5fd'
              : '#cbd5e1',
          bgcolor:
            geoStatus === 'VALID'
              ? '#f0fdf4'
              : geoStatus === 'OUT_OF_RANGE'
              ? '#fef2f2'
              : geoStatus === 'CHECKING'
              ? '#eff6ff'
              : '#f8fafc'
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
            <Box sx={{ mt: 0.3 }}>
              {geoStatus === 'VALID' && <CheckCircleIcon sx={{ color: '#16a34a', fontSize: 26 }} />}
              {geoStatus === 'OUT_OF_RANGE' && <CancelIcon sx={{ color: '#dc2626', fontSize: 26 }} />}
              {geoStatus === 'CHECKING' && <CircularProgress size={22} sx={{ color: '#2563eb' }} />}
              {(geoStatus === 'ERROR' || geoStatus === 'INITIAL') && (
                <LocationOnIcon sx={{ color: '#dc2626', fontSize: 26 }} />
              )}
            </Box>
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 800,
                  color:
                    geoStatus === 'VALID'
                      ? '#15803d'
                      : geoStatus === 'OUT_OF_RANGE'
                      ? '#991b1b'
                      : geoStatus === 'CHECKING'
                      ? '#1d4ed8'
                      : '#b91c1c'
                }}
              >
                {geoStatus === 'VALID' && 'Verifikasi Geolocation: Di Dalam Radius Sekolah'}
                {geoStatus === 'OUT_OF_RANGE' && 'Verifikasi Geolocation: Di Luar Area Sekolah'}
                {geoStatus === 'CHECKING' && 'Mendeteksi Posisi GPS Smartphone...'}
                {geoStatus === 'ERROR' && 'Gagal Memverifikasi GPS'}
                {geoStatus === 'INITIAL' && 'Menunggu Deteksi Lokasi GPS'}
              </Typography>

              <Typography variant="body2" sx={{ color: '#475569', mt: 0.3 }}>
                {geoStatus === 'VALID' && (
                  <>
                    Jarak Anda: <b>{distanceMeters} meter</b> dari titik sekolah (Radius diizinkan:{' '}
                    <b>{schoolRule.max_distance_meters}m</b>). Kamera presensi telah dibuka.
                  </>
                )}
                {geoStatus === 'OUT_OF_RANGE' && (
                  <>
                    Jarak Anda: <b style={{ color: '#dc2626' }}>{distanceMeters} meter</b>. Anda berada di luar radius{' '}
                    <b>{schoolRule.max_distance_meters} meter</b> dari {schoolRule.school_location_name}.
                  </>
                )}
                {geoStatus === 'CHECKING' && 'Memeriksa koordinat GPS terhadap aturan geofencing presensi...'}
                {geoStatus === 'ERROR' && (geoErrorMsg || 'Izin lokasi belum diberikan atau GPS tidak aktif.')}
              </Typography>
            </Box>
          </Stack>

          <Button
            size="small"
            variant="outlined"
            onClick={verifyGeolocation}
            disabled={geoStatus === 'CHECKING'}
            startIcon={<RefreshIcon fontSize="small" />}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2,
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            Cek GPS
          </Button>
        </Stack>
      </Paper>

      {/* Camera Viewfinder & Supporting Controls (Only active & unblocked if Geolocation is VALID) */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3.5,
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
          bgcolor: '#ffffff',
          position: 'relative',
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
          p: { xs: 1.5, sm: 2 }
        }}
      >
        {geoStatus === 'VALID' ? (
          <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {/* Top Status & Mode Indicator Bar */}
            <Box
              sx={{
                p: 1.2,
                px: 1.8,
                bgcolor: '#f8fafc',
                borderRadius: 2.5,
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1
              }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Chip
                  icon={<FlashOnIcon sx={{ fontSize: '15px !important', color: '#ffffff !important' }} />}
                  label={`Mode: ${scanType === 'ARRIVAL' ? 'Presensi Datang' : 'Presensi Pulang'}`}
                  size="small"
                  sx={{
                    bgcolor: scanType === 'ARRIVAL' ? '#16a34a' : '#d97706',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    borderRadius: 2
                  }}
                />
                <Chip
                  icon={<CheckCircleIcon sx={{ fontSize: '14px !important', color: '#16a34a !important' }} />}
                  label="GPS Terverifikasi"
                  size="small"
                  variant="outlined"
                  color="success"
                  sx={{ fontWeight: 700, fontSize: '0.72rem', borderRadius: 2 }}
                />
              </Stack>

              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                Kamera Aktif
              </Typography>
            </Box>

            {/* Custom Scanner HTML5 Camera Window */}
            <Box
              sx={{
                borderRadius: 3,
                overflow: 'hidden',
                bgcolor: '#000000',
                border: '2px solid #0284c7',
                boxShadow: 'inset 0 0 12px rgba(0,0,0,0.5)',
                position: 'relative'
              }}
            >
              <CustomScanner
                id="guru-mobile-camera"
                onScan={handleScan}
                preferredFacingMode={facingMode}
                fps={15}
              />
            </Box>

            {/* Aesthetic Instruction Text Below Camera */}
            <Box
              sx={{
                p: 1.5,
                px: 2,
                bgcolor: '#0f172a',
                color: '#ffffff',
                textAlign: 'center',
                borderRadius: 2.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.2,
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.15)'
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: '#22c55e',
                  boxShadow: '0 0 8px #22c55e',
                  flexShrink: 0
                }}
              />
              <Typography variant="caption" sx={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.01em' }}>
                Arahkan kode QR atau barcode kartu siswa tepat ke dalam area bingkai kamera
              </Typography>
            </Box>
          </Box>
        ) : (geoStatus === 'CHECKING' || geoStatus === 'INITIAL') ? (
          /* AUTOMATIC SCANNER TRANSITION / INITIALIZING */
          <Box sx={{ p: 4, textAlign: 'center', color: '#ffffff', maxWidth: 440 }}>
            <CircularProgress size={52} thickness={4} sx={{ color: '#38bdf8', mb: 2.5 }} />
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, color: '#f8fafc' }}>
              Memverifikasi Lokasi GPS Sekolah...
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8', lineHeight: 1.6 }}>
              Sistem sedang memverifikasi radius lokasi Anda terhadap titik sekolah ({schoolRule.school_location_name}). Antarmuka kamera akan terbuka secara otomatis begitu lokasi terverifikasi.
            </Typography>
          </Box>
        ) : (
          /* BLOCKED CAMERA OVERLAY (OUT OF RANGE / ERROR) */
          <Box sx={{ p: 4, textAlign: 'center', color: '#ffffff', maxWidth: 440 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: 'rgba(239, 68, 68, 0.2)',
                border: '2px solid #ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
                color: '#ef4444'
              }}
            >
              <LockIcon sx={{ fontSize: 32 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
              {geoStatus === 'OUT_OF_RANGE' ? 'Di Luar Radius Sekolah' : 'Izin Lokasi Belum Aktif'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#cbd5e1', mb: 2.5 }}>
              {geoStatus === 'OUT_OF_RANGE'
                ? `Jarak Anda ${distanceMeters}m dari ${schoolRule.school_location_name} (Batas maksimal ${schoolRule.max_distance_meters}m). Pastikan Anda berada di area gerbang/sekolah.`
                : (geoErrorMsg || `Kamera terkunci. Aktifkan GPS dan izinkan akses lokasi untuk membuka kamera presensi.`)}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={verifyGeolocation}
              startIcon={<MyLocationIcon />}
              sx={{ borderRadius: 2.5, fontWeight: 700, px: 3, textTransform: 'none' }}
            >
              Cek Ulang Lokasi
            </Button>
          </Box>
        )}
      </Paper>

      {/* SCAN FEEDBACK POPUP / CARD */}
      {scanResult && (
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            mt: 2.5,
            borderRadius: 3.5,
            border: '2px solid',
            borderColor: scanResult.success ? '#22c55e' : '#ef4444',
            bgcolor: scanResult.success ? '#f0fdf4' : '#fef2f2',
            boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
          }}
        >
          <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: scanResult.success ? '#dcfce7' : '#fee2e2',
                color: scanResult.success ? '#16a34a' : '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {scanResult.success ? <CheckCircleIcon sx={{ fontSize: 28 }} /> : <WarningIcon sx={{ fontSize: 28 }} />}
            </Box>

            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: scanResult.success ? '#15803d' : '#991b1b' }}>
                {scanResult.success ? 'Presensi Berhasil Diterima' : 'Presensi Gagal / Kartu Ditolak'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#475569', fontWeight: 600, mt: 0.3 }}>
                {scanResult.message}
              </Typography>

              {scanResult.student && (
                <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#ffffff', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    {scanResult.student.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontWeight: 600 }}>
                    Kelas: {scanResult.student.year} {scanResult.student.class} • NISN: {scanResult.student.nisn || '-'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#0284c7', display: 'block', fontWeight: 700, mt: 0.5 }}>
                    Waktu: {scanResult.time} • Status: {scanResult.record?.status === 'LATE' ? 'TERLAMBAT' : 'TEPAT WAKTU'}
                  </Typography>
                </Box>
              )}
            </Box>

            <IconButton size="small" onClick={() => setScanResult(null)} sx={{ color: '#94a3b8' }}>
              <CancelIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Paper>
      )}

      {/* RECENT SCANNED CARDS IN THIS SESSION */}
      <Paper elevation={0} sx={{ p: 2.5, mt: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <HistoryIcon color="primary" fontSize="small" />
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              Riwayat Scan Sesi Ini ({sessionHistory.length})
            </Typography>
          </Stack>
          <Chip label={`${scanType === 'ARRIVAL' ? 'Datang' : 'Pulang'}`} size="small" color="primary" variant="outlined" />
        </Stack>

        {sessionHistory.length === 0 ? (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              Belum ada siswa yang dipindai pada sesi ini.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1}>
            {sessionHistory.map((item) => (
              <Box
                key={item.id}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                    {item.studentName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                    {item.studentClass} • {item.nisn}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Chip
                    label={item.status === 'LATE' ? 'Terlambat' : 'Hadir'}
                    size="small"
                    color={item.status === 'LATE' ? 'warning' : 'success'}
                    sx={{ height: 22, fontSize: '0.72rem', fontWeight: 700 }}
                  />
                  <Typography variant="caption" sx={{ display: 'block', color: '#94a3b8', mt: 0.3, fontFamily: 'monospace' }}>
                    {item.timestamp}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
