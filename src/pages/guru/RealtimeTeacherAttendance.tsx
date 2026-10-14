import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Paper,
  Stack,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  IconButton,
  Divider,
  InputAdornment,
  Avatar,
  Tooltip,
  useTheme,
  useMediaQuery,
  Autocomplete
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  QrCodeScanner as QrCodeScannerIcon,
  LocationOn as LocationOnIcon,
  MyLocation as MyLocationIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  ArrowBack as ArrowBackIcon,
  Send as SendIcon,
  CameraAlt as CameraIcon,
  Delete as DeleteIcon,
  AccessTime as AccessTimeIcon,
  Check as CheckIcon,
  Info as InfoIcon,
  Logout as LogoutIcon,
  OpenInNew as OpenInNewIcon,
  WarningAmber as WarningAmberIcon,
  Close as CloseIcon,
  Lock as LockIcon,
  Shield as ShieldIcon,
  GpsFixed as GpsFixedIcon,
  Coffee as CoffeeIcon,
  Flag as FlagIcon,
  Security as SecurityIcon,
  History as HistoryIcon,
  EditNote as EditNoteIcon,
  EventAvailable as EventAvailableIcon,
  Class as ClassIcon,
  Schedule as ScheduleIcon,
  CalendarToday as CalendarTodayIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import CustomScanner from '../../components/CustomScanner';
import { AttendanceRule, KbmCategory, KbmDaySchedule, KbmPeriod, VerifiedStudentCard } from '../../types';
import { safeStorage } from '../../safeStorage';
import { formatWIBDateDDMMYYYY, formatWIBDateIndo, getWIBDateString } from '../../timezone';
import TeacherAttendanceHistory from './TeacherAttendanceHistory';
import { useAppTheme } from '../../contexts/ThemeModeContext';

// Haversine formula to compute distance in meters between two lat/lng points
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

interface RealtimeTeacherAttendanceProps {
  isEmbedded?: boolean;
}

export default function RealtimeTeacherAttendance({ isEmbedded = false }: RealtimeTeacherAttendanceProps) {
  const navigate = useNavigate();
  const theme = useTheme();
  const { preset, isDark } = useAppTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Auth State
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Master Data
  const [teachers, setTeachers] = useState<any[]>([]);
  const [rombels, setRombels] = useState<any[]>([]);
  const [rules, setRules] = useState<AttendanceRule>({
    school_latitude: -6.2088,
    school_longitude: 106.8456,
    school_location_name: 'Kampus Sekolah',
    max_distance_meters: 150,
    min_student_verification: 2,
    allow_manual_verification: true
  });
  const [categories, setCategories] = useState<KbmCategory[]>([]);
  const [daySchedule, setDaySchedule] = useState<KbmDaySchedule | null>(null);

  // Date string today (YYYY-MM-DD)
  const todayLocal = useMemo(() => {
    return getWIBDateString();
  }, []);

  // Helper check whether a period is strictly KBM (JP > 0 and not Non-KBM activity)
  const isKbmPeriod = (p: any): boolean => {
    if (!p) return false;
    if (p.is_teaching === false || Number(p.jp_number) === 0) return false;

    // If categories are loaded, match with master category definition
    if (categories && categories.length > 0) {
      const cat = categories.find(
        c => c.id === p.category_id || c.name.toLowerCase() === (p.category_name || '').toLowerCase()
      );
      if (cat) {
        return cat.is_teaching !== false && Number(p.jp_number) > 0;
      }
    }

    // If marked is_teaching: true and jp_number > 0, it is KBM
    if (p.is_teaching === true && Number(p.jp_number) > 0) {
      return true;
    }

    // Fallback checks for keywords
    const catName = String(p?.category_name || '').trim().toUpperCase();
    const name = String(p?.name || '').trim().toUpperCase();
    if (
      catName.includes('ISTIRAHAT') || catName.includes('UPACARA') || catName.includes('APEL') || catName.includes('BREAK') ||
      name.includes('ISTIRAHAT') || name.includes('UPACARA') || name.includes('APEL')
    ) {
      return false;
    }

    return Number(p.jp_number) > 0;
  };

  // Available periods list
  const availablePeriods: KbmPeriod[] = daySchedule?.periods && daySchedule.periods.length > 0
    ? daySchedule.periods
    : Array.from({ length: 12 }).map((_, i) => {
        const isBreak = i === 4 || i === 7;
        return {
          jp_number: isBreak ? 0 : i + 1,
          name: isBreak ? 'Istirahat' : `KBM JP ${i + 1}`,
          start_time: '07:00',
          end_time: '07:45',
          category_name: isBreak ? 'Istirahat' : 'KBM',
          category_color: isBreak ? '#f59e0b' : '#2563eb',
          is_teaching: !isBreak
        } as KbmPeriod;
      });

  // Sorted periods in chronological order to display activities before and between JPs seamlessly
  const sortedPeriods = useMemo(() => {
    return [...availablePeriods].sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  }, [availablePeriods]);

  // Form State
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedRombel, setSelectedRombel] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [selectedJps, setSelectedJps] = useState<number[]>([]);
  const [masterMapels, setMasterMapels] = useState<any[]>([]);

  // Automated Schedule Sync State (Jadwal KBM)
  const [todaySchedules, setTodaySchedules] = useState<any[]>([]);
  const [loadingTodaySchedules, setLoadingTodaySchedules] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any | null>(null);
  const [isManualMode, setIsManualMode] = useState(false);
  const [completedScheduleIds, setCompletedScheduleIds] = useState<string[]>([]);

  // Hari Ini Berdasarkan WIB (Asia/Jakarta)
  const wibDayName = useMemo(() => {
    const dateStr = getWIBDateString();
    const d = new Date(`${dateStr}T12:00:00+07:00`);
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return dayNames[d.getDay()];
  }, []);

  // Fetch today's schedules for teacher
  const fetchTodayTeacherSchedules = async (tId: string) => {
    if (!tId) return;
    setLoadingTodaySchedules(true);
    try {
      const [schedRes, attRes] = await Promise.all([
        axios.get('/api/jadwal-kbm', {
          params: { teacher_id: tId, hari: wibDayName }
        }),
        axios.get('/api/teacher-kbm-attendance', {
          params: { teacher_id: tId, date: todayLocal }
        })
      ]);

      const scheds = Array.isArray(schedRes.data) ? schedRes.data : [];
      const atts = Array.isArray(attRes.data) ? attRes.data : [];

      const doneIds: string[] = [];
      scheds.forEach((s: any) => {
        const isDone = atts.some((a: any) => {
          if (a.jadwal_kbm_id && a.jadwal_kbm_id === s.id) return true;
          if (a.rombel_id === s.rombel_id && a.subject?.toLowerCase() === s.mapel_name?.toLowerCase()) {
            const aJps = a.jp_list || [];
            const sJps = s.jp_list || [];
            return sJps.some((j: number) => aJps.includes(j));
          }
          return false;
        });
        if (isDone) doneIds.push(s.id);
      });

      setTodaySchedules(scheds);
      setCompletedScheduleIds(doneIds);

      // Auto-select session if not already selected or if selection invalid
      if (scheds.length > 0) {
        const uncompleted = scheds.find((s: any) => !doneIds.includes(s.id));
        const toPick = uncompleted || scheds[0];
        handleSelectSchedule(toPick);
      }
    } catch (e) {
      console.error('Gagal mengambil jadwal KBM hari ini', e);
    } finally {
      setLoadingTodaySchedules(false);
    }
  };

  const handleSelectSchedule = (sched: any) => {
    setSelectedSchedule(sched);
    setSelectedRombel(sched.rombel_id);
    setSubject(sched.mapel_name);
    setSelectedJps(sched.jp_list || []);
    setIsManualMode(false);
    setVerifiedStudents([]);
  };

  // Filter out any selected JP(s) if they become invalid or non-kbm (tanpa memilih otomatis secara default)
  useEffect(() => {
    if (availablePeriods && availablePeriods.length > 0) {
      const validKbmJps = availablePeriods.filter(p => isKbmPeriod(p)).map(p => p.jp_number);
      if (validKbmJps.length > 0) {
        setSelectedJps(prev => prev.filter(j => validKbmJps.includes(j)));
      }
    }
  }, [daySchedule, categories]);

  // Existing attendances for the selected class today to prevent overwriting
  const [existingRombelAttendances, setExistingRombelAttendances] = useState<any[]>([]);
  const [loadingAttendances, setLoadingAttendances] = useState(false);

  // GPS Location & Anti Fake-GPS State
  const [currentCoords, setCurrentCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distanceToSchool, setDistanceToSchool] = useState<number | null>(null);
  const [isLocationValid, setIsLocationValid] = useState<boolean>(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isMockGps, setIsMockGps] = useState<boolean>(false);
  const [mockGpsReason, setMockGpsReason] = useState<string>('');

  // Fetch existing attendance records for the selected class to prevent overwriting
  const fetchRombelAttendances = async (rombel: string) => {
    if (!rombel) {
      setExistingRombelAttendances([]);
      return;
    }
    setLoadingAttendances(true);
    try {
      const res = await fetch(`/api/teacher-kbm-attendance?date=${todayLocal}&rombel_id=${encodeURIComponent(rombel)}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setExistingRombelAttendances(data);
      } else {
        setExistingRombelAttendances([]);
      }
    } catch (e) {
      console.error('Gagal memuat presensi rombel', e);
    } finally {
      setLoadingAttendances(false);
    }
  };

  useEffect(() => {
    if (selectedRombel) {
      fetchRombelAttendances(selectedRombel);
    } else {
      setExistingRombelAttendances([]);
    }
  }, [selectedRombel, todayLocal]);

  // Mapping occupied JPs for the selected rombel today
  const occupiedJpMap = useMemo(() => {
    const map = new Map<number, {
      teacher_name: string;
      teacher_id: string;
      nip?: string;
      subject: string;
      topic?: string;
      isSelf: boolean;
    }>();

    existingRombelAttendances.forEach(att => {
      const isSelf = selectedTeacherId && (att.teacher_id === selectedTeacherId || (currentUser?.nip && att.nip === currentUser.nip));
      const jps: number[] = att.jp_list || (att.jp_start && att.jp_end ? Array.from({ length: att.jp_end - att.jp_start + 1 }, (_, i) => att.jp_start + i) : []);
      jps.forEach(jp => {
        map.set(jp, {
          teacher_name: att.teacher_name || 'Guru Lain',
          teacher_id: att.teacher_id,
          nip: att.nip,
          subject: att.subject || 'Mata Pelajaran',
          topic: att.topic,
          isSelf: Boolean(isSelf)
        });
      });
    });

    return map;
  }, [existingRombelAttendances, selectedTeacherId, currentUser]);

  // Automatically unselect any JP that is occupied by another teacher
  useEffect(() => {
    if (selectedJps.length > 0 && occupiedJpMap.size > 0) {
      const filtered = selectedJps.filter(jp => {
        const occ = occupiedJpMap.get(jp);
        return !(occ && !occ.isSelf);
      });
      if (filtered.length !== selectedJps.length) {
        setSelectedJps(filtered);
        toast('JP yang telah diisi oleh guru lain otomatis dibatalkan dari pilihan Anda.', { icon: '🔒' });
      }
    }
  }, [occupiedJpMap]);

  // Student Verification State
  const [scannerOpen, setScannerOpen] = useState(false);
  const [manualNisn, setManualNisn] = useState('');
  const [verifiedStudents, setVerifiedStudents] = useState<VerifiedStudentCard[]>([]);

  // Sub-Fitur Siswa Tidak Hadir KBM & Info Izin Hari Ini
  const [rombelStudents, setRombelStudents] = useState<any[]>([]);
  const [todayPiketIzinList, setTodayPiketIzinList] = useState<any[]>([]);
  const [absentStudentsKbm, setAbsentStudentsKbm] = useState<Array<{
    student_id?: string;
    nisn: string;
    name: string;
    class_name?: string;
    reason?: string;
  }>>([]);
  const [selectedAbsentStudentInput, setSelectedAbsentStudentInput] = useState<any | null>(null);
  const [absentReasonInput, setAbsentReasonInput] = useState('Cabut / Tidak Berada di Kelas');
  const [loadingRombelDetails, setLoadingRombelDetails] = useState(false);

  // Load students & piket permissions when selectedRombel or todayLocal changes
  useEffect(() => {
    if (!selectedRombel) {
      setRombelStudents([]);
      setTodayPiketIzinList([]);
      setAbsentStudentsKbm([]);
      return;
    }

    async function loadRombelDetails() {
      setLoadingRombelDetails(true);
      try {
        const [studentsRes, izinRes] = await Promise.all([
          axios.get('/api/students', { params: { class: selectedRombel } }).catch(() => ({ data: [] })),
          axios.get('/api/piket/izin').catch(() => ({ data: [] }))
        ]);

        const allClassStudents = Array.isArray(studentsRes.data) ? studentsRes.data : [];
        const allIzin = Array.isArray(izinRes.data) ? izinRes.data : [];

        // Filter perizinan hari ini untuk rombel terpilih
        const targetCls = selectedRombel.trim().toLowerCase();
        const todayClassIzin = allIzin.filter((i: any) => {
          const cls = (i.student_class || i.class || '').trim().toLowerCase();
          if (cls !== targetCls) return false;

          let start = (i.tanggal_mulai || '').split('T')[0];
          let end = (i.tanggal_selesai || start).split('T')[0];
          return todayLocal >= start && todayLocal <= end;
        });

        setRombelStudents(allClassStudents);
        setTodayPiketIzinList(todayClassIzin);
      } catch (e) {
        console.error('Gagal memuat detail siswa & izin rombel:', e);
      } finally {
        setLoadingRombelDetails(false);
      }
    }

    loadRombelDetails();
  }, [selectedRombel, todayLocal]);

  // Filter siswa rombel yang berstatus HADIR di sekolah (tidak berstatus Izin/Sakit/Dispensasi dari Guru Piket)
  const selectableStudentsForKbm = useMemo(() => {
    const izinNisns = new Set(todayPiketIzinList.map(i => String(i.nisn || '').trim()));
    const alreadyAddedNisns = new Set(absentStudentsKbm.map(a => String(a.nisn || '').trim()));

    return rombelStudents.filter(s => {
      const sNisn = String(s.nisn || '').trim();
      if (izinNisns.has(sNisn)) return false; // Siswa sudah terdaftar Izin/Sakit/Dispensasi oleh Piket
      if (alreadyAddedNisns.has(sNisn)) return false; // Sudah dimasukkan ke daftar tidak hadir
      return true;
    });
  }, [rombelStudents, todayPiketIzinList, absentStudentsKbm]);

  const handleAddAbsentStudent = () => {
    if (!selectedAbsentStudentInput) {
      toast.error('Pilih nama siswa terlebih dahulu');
      return;
    }
    const st = selectedAbsentStudentInput;
    setAbsentStudentsKbm(prev => [
      ...prev,
      {
        student_id: st.id,
        nisn: st.nisn,
        name: st.name,
        class_name: st.class || selectedRombel,
        reason: absentReasonInput.trim() || 'Cabut / Tidak Berada di Kelas'
      }
    ]);
    setSelectedAbsentStudentInput(null);
    toast.success(`Daftar tidak hadir KBM diperbarui: ${st.name}`);
  };

  const handleRemoveAbsentStudent = (nisn: string) => {
    setAbsentStudentsKbm(prev => prev.filter(s => s.nisn !== nisn));
  };

  // Refs for bulletproof concurrency and duplicate prevention during continuous camera scanning
  const isVerifyingRef = useRef(false);
  const lastScannedRef = useRef<{ code: string; timestamp: number }>({ code: '', timestamp: 0 });
  const verifiedStudentsRef = useRef<VerifiedStudentCard[]>([]);
  useEffect(() => {
    verifiedStudentsRef.current = verifiedStudents;
  }, [verifiedStudents]);

  // Audio & Haptic Feedback for fast, satisfying scanning experience
  const playScanFeedback = (type: 'success' | 'warning' = 'success') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'success') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          gain.gain.setValueAtTime(0.18, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.14);
          osc.start();
          osc.stop(ctx.currentTime + 0.14);
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(80);
          }
        } else {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(320, ctx.currentTime);
          gain.gain.setValueAtTime(0.25, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([100, 60, 100]);
          }
        }
      }
    } catch (e) {
      // Ignore audio context errors if unavailable or blocked by browser policy
    }
  };

  // Processing & Feedback State
  const [activePortalTab, setActivePortalTab] = useState<'form' | 'history'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultPopup, setResultPopup] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({
    open: false,
    title: '',
    message: ''
  });

  // Modal Peringatan Modern Verifikasi Ganda Siswa
  const [duplicateWarning, setDuplicateWarning] = useState<{
    open: boolean;
    studentName: string;
    nisn: string;
    className: string;
  } | null>(null);

  // Verify authentication on mount & trigger quick auto-dismissing welcome toast
  useEffect(() => {
    const isGuruAuth = safeStorage.getItem('guru_auth') === 'true';
    const isAdminAuth = !!safeStorage.getItem('auth');
    if (!isGuruAuth && !isAdminAuth) {
      navigate('/guru/login', { replace: true });
      return;
    }
    const user = safeStorage.getJSON('guru_user', null);
    if (user) {
      setCurrentUser(user);
      setSelectedTeacherId(user.teacher_id || user.id);

      // Cek apakah baru saja login
      const justLoggedIn = safeStorage.getItem('guru_just_logged_in') === 'true';
      if (justLoggedIn) {
        safeStorage.removeItem('guru_just_logged_in');
      }
    }
  }, [navigate]);

  // Sync today's schedules when selectedTeacherId is set
  useEffect(() => {
    if (selectedTeacherId) {
      fetchTodayTeacherSchedules(selectedTeacherId);
    }
  }, [selectedTeacherId, todayLocal, wibDayName]);

  const handleLogout = () => {
    safeStorage.removeItem('guru_auth');
    safeStorage.removeItem('guru_token');
    safeStorage.removeItem('guru_user');
    toast.success('Berhasil keluar dari Portal Kehadiran Guru');
    navigate('/guru/login', { replace: true });
  };

  // Load initial master data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resTeachers, resRombels, resRules, resCats, resMapels] = await Promise.all([
          fetch('/api/teachers'),
          fetch('/api/rombel'),
          fetch('/api/attendance-rules'),
          fetch('/api/kbm/categories'),
          fetch('/api/mata-pelajaran')
        ]);
        const teachersData = await resTeachers.json();
        const rombelsData = await resRombels.json();
        const rulesData = await resRules.json();
        const catsData = await resCats.json();
        const mapelsData = await resMapels.json().catch(() => []);

        setTeachers(Array.isArray(teachersData) ? teachersData : []);
        setCategories(Array.isArray(catsData) ? catsData : []);
        setMasterMapels(Array.isArray(mapelsData) ? mapelsData : []);

        // Filter Hanya Rombel dengan Status AKTIF (status PKL tidak perlu ditampilkan)
        const rawRombels = Array.isArray(rombelsData) ? rombelsData : (rombelsData?.classes || []);
        const activeOnlyRombels = rawRombels.filter((r: any) => {
          const status = String(r.status || '').toUpperCase().trim();
          const name = String(r.name || '').toUpperCase().trim();
          // Filter out PKL, LULUS, Alumni
          if (status === 'PKL' || status === 'LULUS' || name.includes('PKL') || name.startsWith('ALUMNI')) {
            return false;
          }
          return status === 'AKTIF' || !status;
        });

        setRombels(activeOnlyRombels);

        if (rulesData && rulesData.school_latitude) {
          setRules(rulesData);
        }

        // Fetch today's KBM schedule
        const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const todayDayName = dayNames[new Date().getDay()];
        const resSched = await fetch(`/api/kbm/schedules/day/${todayDayName}`);
        const schedData = await resSched.json();
        if (schedData && schedData.periods) {
          setDaySchedule(schedData);
        }
      } catch (e: any) {
        console.error(e);
      }
    };

    fetchData();
  }, []);

  // Check Free Attendance on load
  useEffect(() => {
    const checkFree = async () => {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const res = await fetch(`/api/free-attendance/check/${todayStr}`);
        const data = await res.json();
        if (data && data.is_free) {
          toast((t) => (
            <span>
              ℹ️ Hari ini adalah hari libur: <b>{data.reason}</b>. Presensi KBM opsional.
            </span>
          ), { duration: 6000 });
        }
      } catch (e) {}
    };
    checkFree();
  }, []);

  // Auto detect GPS on component mount silently
  useEffect(() => {
    handleDetectLocation(false);
  }, [rules]);

  // GPS Detection Handler with High Accuracy & Anti-Fake GPS Detection
  const handleDetectLocation = (isManualCheck: boolean = false) => {
    if (!navigator.geolocation) {
      if (isManualCheck) {
        toast.error('Geolocation tidak didukung pada browser ini', { id: 'gps-precision-toast', duration: 2000 });
      }
      return;
    }

    setDetectingGps(true);
    setIsMockGps(false);
    setMockGpsReason('');

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      pos => {
        setDetectingGps(false);
        const coords = pos.coords;
        const lat = coords.latitude;
        const lon = coords.longitude;
        const accuracy = coords.accuracy || 0;
        setGpsAccuracy(accuracy);
        setCurrentCoords({ latitude: lat, longitude: lon });

        // Comprehensive Anti Fake-GPS / Mock Location Detection
        let detectedMock = false;
        let reason = '';

        // 1. Check native isMocked / mocked property (Chrome Android & Webview standard flag)
        if ((coords as any).isMocked === true || (pos as any).isMocked === true || (coords as any).mocked === true) {
          detectedMock = true;
          reason = 'Terdeteksi atribut Mock Location dari sistem perangkat.';
        }

        // 2. Check suspicious zero or near-zero accuracy (typical signature of fake GPS software)
        if (!detectedMock && (accuracy === 0 || (accuracy > 0 && accuracy < 0.5 && coords.speed === 0 && coords.altitude === null))) {
          detectedMock = true;
          reason = 'Akurasi GPS mencurigakan (0 meter). Sensor fisik selalu memiliki toleransi deviasi.';
        }

        // 3. Improbable zero altitude accuracy with mock profile
        if (!detectedMock && coords.altitudeAccuracy === 0 && accuracy <= 1) {
          detectedMock = true;
          reason = 'Profil elevasi dan akurasi disimulasikan secara artifisial.';
        }

        if (detectedMock) {
          setIsMockGps(true);
          setMockGpsReason(reason);
          setIsLocationValid(false);
          toast.error('PERINGATAN: Terdeteksi penggunaan Fake GPS! Presensi ditolak.', {
            duration: 3500,
            id: 'gps-precision-toast',
            icon: '🚫'
          });
          return;
        }

        if (rules.school_latitude && rules.school_longitude) {
          const dist = calculateDistanceMeters(lat, lon, rules.school_latitude, rules.school_longitude);
          setDistanceToSchool(dist);
          const valid = dist <= rules.max_distance_meters;
          setIsLocationValid(valid);

          if (isManualCheck) {
            toast.dismiss();
            if (valid) {
              const precisionDesc = accuracy <= 20 ? 'Sangat Presisi (GNSS)' : accuracy <= 45 ? 'Presisi Baik' : 'Akurasi Cukup';
              toast.success(`Lokasi Terverifikasi! Radius: ${Math.round(dist)}m dari sekolah (Akurasi ±${Math.round(accuracy)}m • ${precisionDesc})`, {
                id: 'gps-precision-toast',
                duration: 2200
              });
            } else {
              toast.error(`Perhatian: Anda berada ${Math.round(dist)}m dari sekolah (Batas maks: ${rules.max_distance_meters}m)`, {
                id: 'gps-precision-toast',
                duration: 2500
              });
            }
          }
        } else {
          // If no coordinate configured yet, default to valid
          setIsLocationValid(true);
          if (isManualCheck) {
            toast.success(`Koordinat GPS terdeteksi: ${lat.toFixed(5)}, ${lon.toFixed(5)}`, {
              id: 'gps-precision-toast',
              duration: 2000
            });
          }
        }
      },
      err => {
        setDetectingGps(false);
        console.warn('GPS Error', err);
        setIsLocationValid(false);
        if (isManualCheck) {
          toast.error(`Sinyal GPS belum aktif atau izin lokasi belum diberikan.`, {
            id: 'gps-precision-toast',
            duration: 2200
          });
        }
      },
      options
    );
  };

  // Toggle JP selection - Hanya Kategori KBM dan Belum Diisi Guru Lain
  const handleToggleJp = (jpNum: number) => {
    const period = availablePeriods.find(p => p.jp_number === jpNum);
    if (period && !isKbmPeriod(period)) {
      toast.error(`Kegiatan (${period.name || period.category_name || 'Non-KBM'}) bukan jam KBM dan tidak dapat dipilih.`);
      return;
    }

    const occ = occupiedJpMap.get(jpNum);
    if (occ && !occ.isSelf) {
      toast.error(`JP ${jpNum} sudah diisi oleh Guru ${occ.teacher_name} (${occ.subject}). Anda tidak dapat memilih JP ini agar tidak menimpa kehadiran guru lain.`);
      return;
    }

    if (selectedJps.includes(jpNum)) {
      setSelectedJps(selectedJps.filter(j => j !== jpNum));
    } else {
      setSelectedJps([...selectedJps, jpNum].sort((a, b) => a - b));
    }
  };

  // Select Range JP (e.g. JP 1-3) - Filter hanya KBM & yang belum diisi guru lain
  const handleSelectJpRange = (start: number, end: number) => {
    const kbmList = availablePeriods
      .filter(p => p.jp_number >= start && p.jp_number <= end && isKbmPeriod(p))
      .map(p => p.jp_number);

    const availableKbmList = kbmList.filter(jp => {
      const occ = occupiedJpMap.get(jp);
      return !(occ && !occ.isSelf);
    });

    if (availableKbmList.length === 0) {
      toast.error(`JP ${start}-${end} sudah terisi oleh guru lain atau tidak tersedia.`);
      return;
    }
    setSelectedJps(availableKbmList);
  };

  // Student Card Verification
  const verifyStudentCard = async (code: string) => {
    if (!code || !code.trim()) return;
    const cleanCode = code.trim();

    // Guard rapid consecutive frames of the same barcode within 1.5 seconds
    const now = Date.now();
    if (
      cleanCode.toLowerCase() === lastScannedRef.current.code.toLowerCase() &&
      now - lastScannedRef.current.timestamp < 1500
    ) {
      return;
    }
    lastScannedRef.current = { code: cleanCode, timestamp: now };

    // Prevent race condition if another scan is in flight
    if (isVerifyingRef.current) return;

    if (!selectedRombel) {
      toast.error('Pilih Rombel / Kelas yang Anda ajar terlebih dahulu!');
      return;
    }

    // Pre-check if student code or NISN already verified in current list
    const alreadyScanned = verifiedStudentsRef.current.find(s => 
      (s.nisn && s.nisn.trim().toLowerCase() === cleanCode.toLowerCase()) || 
      (s.student_id && String(s.student_id).trim().toLowerCase() === cleanCode.toLowerCase()) ||
      (s.name && s.name.trim().toLowerCase() === cleanCode.toLowerCase())
    );

    if (alreadyScanned) {
      playScanFeedback('warning');
      setDuplicateWarning({
        open: true,
        studentName: alreadyScanned.student_name || alreadyScanned.name,
        nisn: alreadyScanned.nisn,
        className: alreadyScanned.class_name
      });
      toast.error(`Peringatan: Siswa ${alreadyScanned.student_name || alreadyScanned.name} (${alreadyScanned.nisn}) sudah diverifikasi sebelumnya! Minta siswa lain.`, {
        duration: 4000
      });
      return;
    }

    isVerifyingRef.current = true;
    try {
      const res = await fetch('/api/teacher-kbm-attendance/verify-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode: cleanCode,
          nisn: cleanCode,
          rombel_id: selectedRombel
        })
      });

      const data = await res.json();
      if (!data.success) {
        playScanFeedback('warning');
        toast.error(data.error || 'Kartu siswa tidak terdaftar');
        return;
      }

      if (!data.isCorrectRombel) {
        playScanFeedback('warning');
        toast.error(data.message || `Siswa ini bukan dari kelas ${selectedRombel}`);
        return;
      }

      const st = data.student;

      // Check duplicate strictly before updating state
      let isDuplicateFound = false;
      let duplicateName = '';

      setVerifiedStudents(prev => {
        const isDuplicate = prev.some(s =>
          (s.student_id && st.student_id && String(s.student_id).trim().toLowerCase() === String(st.student_id).trim().toLowerCase()) ||
          (s.nisn && st.nisn && s.nisn.trim().toLowerCase() === st.nisn.trim().toLowerCase()) ||
          (s.name && st.name && s.name.trim().toLowerCase() === st.name.trim().toLowerCase()) ||
          (s.student_name && st.name && s.student_name.trim().toLowerCase() === st.name.trim().toLowerCase())
        );

        if (isDuplicate) {
          isDuplicateFound = true;
          duplicateName = st.name;
          return prev;
        }

        const newVerified: VerifiedStudentCard = {
          student_id: st.student_id,
          nisn: st.nisn,
          name: st.name,
          student_name: st.name,
          class_name: st.class_name,
          scanned_at: new Date().toISOString()
        };

        return [...prev, newVerified];
      });

      if (isDuplicateFound) {
        playScanFeedback('warning');
        setDuplicateWarning({
          open: true,
          studentName: duplicateName || st.name,
          nisn: st.nisn,
          className: st.class_name
        });
        toast.error(`Peringatan: Siswa ${st.name} sudah diverifikasi sebelumnya! Satu siswa hanya boleh 1 kali.`, {
          duration: 4000
        });
        return;
      }

      playScanFeedback('success');
      toast.success(`Berhasil memverifikasi siswa: ${st.name} (${st.class_name})`, { duration: 3000 });

      // Note: Scanner remains continuously ACTIVE so teacher can scan multiple students seamlessly.
      // Scanner only closes when teacher clicks "Tutup Scanner" button.
    } catch (e: any) {
      playScanFeedback('warning');
      toast.error('Gagal verifikasi kartu siswa: ' + e.message);
    } finally {
      isVerifyingRef.current = false;
    }
  };

  const handleManualVerify = () => {
    if (!manualNisn.trim()) {
      toast.error('Masukkan NISN / Kode Barcode');
      return;
    }
    verifyStudentCard(manualNisn.trim());
    setManualNisn('');
  };

  const handleRemoveVerified = (nisn: string) => {
    setVerifiedStudents(prev => prev.filter(s => s.nisn !== nisn));
  };

  // Submit Attendance
  const handleSubmitAttendance = async () => {
    if (!selectedTeacherId) {
      toast.error('Pilih nama guru yang mengajar');
      return;
    }
    if (!selectedRombel) {
      toast.error('Pilih rombel / kelas yang diajar');
      return;
    }
    if (!subject.trim()) {
      toast.error('Masukkan mata pelajaran');
      return;
    }
    if (selectedJps.length === 0) {
      toast.error('Pilih minimal satu Jam Pelajaran (JP)');
      return;
    }
    const nonKbm = selectedJps.filter(num => {
      const p = availablePeriods.find(ap => ap.jp_number === num);
      return p && !isKbmPeriod(p);
    });
    if (nonKbm.length > 0) {
      toast.error(`JP ${nonKbm.join(', ')} bukan kategori KBM. Harap pilih jam KBM saja!`);
      return;
    }

    // Pastikan setiap siswa hanya 1 kali verifikasi dan jumlah siswa BERBEDA memenuhi minimal aturan
    const uniqueStudentIds = new Set(verifiedStudents.map(s => s.student_id || s.nisn));
    if (uniqueStudentIds.size < rules.min_student_verification) {
      toast.error(
        `Wajib diverifikasi oleh minimal ${rules.min_student_verification} siswa BERBEDA dalam kelas ini! (Saat ini baru ${uniqueStudentIds.size} siswa unik)`
      );
      return;
    }

    if (isMockGps) {
      toast.error('Presensi KBM ditolak: Terdeteksi penggunaan Fake GPS atau manipulasi lokasi pada perangkat.');
      return;
    }

    // Pastikan tidak menimpa JP guru lain
    const conflictJp = selectedJps.find(jp => {
      const occ = occupiedJpMap.get(jp);
      return occ && !occ.isSelf;
    });
    if (conflictJp) {
      const occ = occupiedJpMap.get(conflictJp);
      toast.error(`JP ${conflictJp} sudah diisi oleh Guru ${occ?.teacher_name} (${occ?.subject}). Pilih JP lain agar tidak menimpa guru lain.`);
      return;
    }

    const teacher = teachers.find(t => t.id === selectedTeacherId);
    const teacherName = teacher?.name || selectedTeacherId;
    const nip = teacher?.nip || '';

    setIsSubmitting(true);
    setProgress(20);

    try {
      const pInterval = setInterval(() => {
        setProgress(p => (p < 85 ? p + 20 : p));
      }, 100);

      const payload = {
        date: todayLocal,
        teacher_id: selectedTeacherId,
        teacher_name: teacherName,
        nip,
        rombel_id: selectedRombel,
        subject: subject.trim(),
        jp_list: selectedJps,
        jp_start: Math.min(...selectedJps),
        jp_end: Math.max(...selectedJps),
        topic: topic.trim(),
        location_status: isMockGps ? 'FAKE_GPS_DETECTED' : (isLocationValid ? 'VALID' : 'OUT_OF_RANGE'),
        location_coords: currentCoords,
        location_distance: distanceToSchool,
        is_mocked: isMockGps,
        gps_accuracy: gpsAccuracy !== null ? Math.round(gpsAccuracy) : 0,
        verified_students: verifiedStudents,
        absent_students: absentStudentsKbm,
        jadwal_kbm_id: selectedSchedule?.id || undefined,
        status: 'HADIR'
      };

      const res = await fetch('/api/teacher-kbm-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      clearInterval(pInterval);
      setProgress(100);

      if (!data.success) {
        throw new Error(data.error || 'Gagal mengirim presensi KBM');
      }

      fetchRombelAttendances(selectedRombel);
      if (selectedTeacherId) {
        fetchTodayTeacherSchedules(selectedTeacherId);
      }

      setTimeout(() => {
        setIsSubmitting(false);
        setProgress(0);
        setResultPopup({
          open: true,
          title: 'Presensi KBM Guru Berhasil!',
          message: `Kehadiran Guru ${teacherName} di kelas ${selectedRombel} untuk JP ${selectedJps.join(', ')} telah tercatat dengan verifikasi ${verifiedStudents.length} siswa dan lokasi valid.`
        });
      }, 350);
    } catch (e: any) {
      setIsSubmitting(false);
      setProgress(0);
      toast.error(e.message || 'Gagal mengirim presensi');
    }
  };

  const handleResetForm = () => {
    setSelectedJps([]);
    setVerifiedStudents([]);
    setTopic('');
    setResultPopup({ open: false, title: '', message: '' });
  };

  // Auto-dismiss result popup quickly after display to not obstruct portal (2 seconds)
  useEffect(() => {
    if (resultPopup.open) {
      const timer = setTimeout(() => {
        handleResetForm();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [resultPopup.open]);

  const minRequiredStudents = rules.min_student_verification || 2;
  const isVerificationComplete = verifiedStudents.length >= minRequiredStudents;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: isDark ? '#0b0f19' : '#f8fafc', color: preset.textColorPrimary, pb: { xs: 28, md: 6 } }}>
      {/* Top Progress Bar */}
      {(isSubmitting || detectingGps) && (
        <Box sx={{ width: '100%', position: 'fixed', top: 0, left: 0, zIndex: 9999 }}>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 4 }} />
        </Box>
      )}

      {/* Modern Header Nav - Responsive for Mobile & Desktop (Shown only when not embedded) */}
      {!isEmbedded && (
        <Box
          sx={{
            bgcolor: isDark ? preset.cardBg : '#ffffff',
            borderBottom: '1px solid',
            borderColor: preset.glassBorder,
            px: { xs: 1.5, sm: 3, md: 4 },
            py: { xs: 1.25, sm: 1.75 },
            position: 'sticky',
            top: 0,
            zIndex: 100,
            boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <Box sx={{ maxWidth: 1000, mx: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
              <Box
                sx={{
                  width: { xs: 36, sm: 42 },
                  height: { xs: 36, sm: 42 },
                  borderRadius: 2,
                  bgcolor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5',
                  color: isDark ? '#4ade80' : '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.4)' : '#86efac'}`,
                  flexShrink: 0
                }}
              >
                <SchoolIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 800,
                    color: 'text.primary',
                    lineHeight: 1.2,
                    fontSize: { xs: '0.92rem', sm: '1.15rem' },
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  Portal Kehadiran Guru (KBM)
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.68rem', sm: '0.75rem' }, display: 'block' }}>
                  {formatWIBDateDDMMYYYY(todayLocal)} • {formatWIBDateIndo(todayLocal)}
                </Typography>
              </Box>
            </Box>

            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
              {currentUser && (
                <Chip
                  avatar={
                    <Avatar sx={{ bgcolor: '#15803d', color: '#fff', fontWeight: 700, width: 24, height: 24, fontSize: '0.75rem' }}>
                      {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'G'}
                    </Avatar>
                  }
                  label={currentUser.name.split(' ')[0]}
                  color="success"
                  variant="outlined"
                  size="small"
                  sx={{ fontWeight: 700, maxWidth: { xs: 100, sm: 180 }, fontSize: { xs: '0.72rem', sm: '0.8rem' } }}
                />
              )}

              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<LogoutIcon sx={{ fontSize: '1rem !important' }} />}
                onClick={handleLogout}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: { xs: '0.72rem', sm: '0.82rem' },
                  px: { xs: 1, sm: 1.5 },
                  py: { xs: 0.4, sm: 0.6 }
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Keluar Portal</Box>
                <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Keluar</Box>
              </Button>
            </Stack>
          </Box>
        </Box>
      )}

      {/* Main Content Area */}
      <Box sx={{ width: '100%', maxWidth: isEmbedded ? '100%' : 1000, mx: isEmbedded ? 0 : 'auto', p: isEmbedded ? { xs: 1, sm: 1.5, md: 2 } : { xs: 1.5, sm: 2.5, md: 3 } }}>
        {/* Segmented Tab Navigation: Form Presensi vs Riwayat Pengiriman */}
        <Paper
          elevation={0}
          sx={{
            p: 0.6,
            mb: 2.5,
            borderRadius: 3,
            bgcolor: '#f1f5f9',
            border: '1px solid #e2e8f0',
            display: 'flex',
            gap: 1
          }}
        >
          <Button
            fullWidth
            variant={activePortalTab === 'form' ? 'contained' : 'text'}
            startIcon={<EditNoteIcon />}
            onClick={() => setActivePortalTab('form')}
            sx={{
              borderRadius: 2.5,
              py: 1.1,
              textTransform: 'none',
              fontWeight: activePortalTab === 'form' ? 800 : 600,
              boxShadow: activePortalTab === 'form' ? `0 2px 8px ${alpha(theme.palette.primary.main, 0.25)}` : 'none',
              bgcolor: activePortalTab === 'form' ? theme.palette.primary.main : 'transparent',
              color: activePortalTab === 'form' ? '#ffffff' : '#64748b',
              '&:hover': {
                bgcolor: activePortalTab === 'form' ? theme.palette.primary.dark : '#e2e8f0'
              }
            }}
          >
            Presensi KBM Baru
          </Button>

          <Button
            fullWidth
            variant={activePortalTab === 'history' ? 'contained' : 'text'}
            startIcon={<HistoryIcon />}
            onClick={() => setActivePortalTab('history')}
            sx={{
              borderRadius: 2.5,
              py: 1.1,
              textTransform: 'none',
              fontWeight: activePortalTab === 'history' ? 800 : 600,
              boxShadow: activePortalTab === 'history' ? `0 2px 8px ${alpha(theme.palette.primary.main, 0.25)}` : 'none',
              bgcolor: activePortalTab === 'history' ? theme.palette.primary.main : 'transparent',
              color: activePortalTab === 'history' ? '#ffffff' : '#64748b',
              '&:hover': {
                bgcolor: activePortalTab === 'history' ? theme.palette.primary.dark : '#e2e8f0'
              }
            }}
          >
            Riwayat Pengiriman Presensi
          </Button>
        </Paper>

        {activePortalTab === 'history' ? (
          <TeacherAttendanceHistory
            teacherId={selectedTeacherId}
            teacherName={currentUser?.name || 'Guru'}
            nip={currentUser?.nip || ''}
            rombels={rombels}
            onSwitchToForm={() => setActivePortalTab('form')}
          />
        ) : (
          <Grid container spacing={3}>
          {/* LEFT COLUMN: FORM DETAIL KBM */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: { xs: '0 2px 8px rgba(0,0,0,0.04)', md: '0 10px 25px -5px rgba(0,0,0,0.04), 0 4px 6px -2px rgba(0,0,0,0.02)' },
                border: '1px solid #e2e8f0',
                mb: 3
              }}
            >
              <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: 2,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <SchoolIcon sx={{ fontSize: 20 }} />
                  </Box>
                  1. Informasi Pembelajaran di Kelas
                </Typography>

                <Stack spacing={2.5}>
                  {/* Teacher Identity */}
                  {currentUser ? (
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                        borderColor: alpha(theme.palette.primary.main, 0.3),
                        borderRadius: 2.5
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ bgcolor: theme.palette.primary.main, color: '#ffffff', width: 44, height: 44, fontWeight: 700 }}>
                            {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'G'}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                              {currentUser.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#475569', display: 'block' }}>
                              NIP: {currentUser.nip || '-'} • Username: @{currentUser.username || '-'}
                            </Typography>
                          </Box>
                        </Box>
                        <Chip
                          label="AKUN AKTIF"
                          size="small"
                          color="primary"
                          sx={{ fontWeight: 700, height: 22, fontSize: '0.7rem' }}
                        />
                      </Box>
                    </Paper>
                  ) : (
                    <FormControl fullWidth size="small">
                      <InputLabel>Pilih Guru</InputLabel>
                      <Select
                        value={selectedTeacherId}
                        label="Pilih Guru"
                        onChange={e => setSelectedTeacherId(e.target.value)}
                      >
                        {teachers.map(t => (
                          <MenuItem key={t.id} value={t.id}>
                            {t.name} {t.nip ? `(NIP. ${t.nip})` : ''}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}

                  {/* 1. SINKRONISASI JADWAL KBM HARI INI (REAL-TIME ASIA/JAKARTA) */}
                  <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2.5, border: '1px solid #bbf7d0' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarTodayIcon sx={{ color: '#15803d', fontSize: 20 }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#14532d' }}>
                          Sesi Jadwal KBM Hari Ini (WIB - {wibDayName})
                        </Typography>
                      </Box>
                      <Chip
                        label={`Hari Ini: ${wibDayName}, ${formatWIBDateIndo(todayLocal)}`}
                        size="small"
                        sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 700, fontSize: '0.72rem' }}
                      />
                    </Box>

                    {loadingTodaySchedules ? (
                      <Box sx={{ py: 3, textAlign: 'center' }}>
                        <LinearProgress sx={{ borderRadius: 2, mb: 1 }} />
                        <Typography variant="caption" color="text.secondary">
                          Menghubungkan ke jadwal KBM hari ini...
                        </Typography>
                      </Box>
                    ) : todaySchedules.length === 0 ? (
                      <Box sx={{ py: 1.5 }}>
                        <Alert severity="info" sx={{ borderRadius: 2, mb: 1.5 }}>
                          Tidak ditemukan jadwal KBM terdaftar untuk Anda pada hari <strong>{wibDayName}</strong> ini.
                        </Alert>
                        <Stack direction="row" spacing={1}>
                          <Button
                            variant={isManualMode ? 'contained' : 'outlined'}
                            size="small"
                            onClick={() => setIsManualMode(true)}
                            sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
                          >
                            {isManualMode ? 'Mode Manual Aktif' : 'Gunakan Input Presensi Manual'}
                          </Button>
                        </Stack>
                      </Box>
                    ) : (
                      <Box>
                        <Typography variant="caption" sx={{ color: '#166534', fontWeight: 600, display: 'block', mb: 1 }}>
                          Pilih sesi kelas yang sedang Anda ajar saat ini:
                        </Typography>
                        <Grid container spacing={1.5}>
                          {todaySchedules.map(sched => {
                            const isSelected = selectedSchedule?.id === sched.id && !isManualMode;
                            const isDone = completedScheduleIds.includes(sched.id);
                            const sortedJps = [...(sched.jp_list || [])].sort((a: number, b: number) => a - b);
                            const jpStr = sortedJps.length > 1
                              ? `JP ${sortedJps[0]} - ${sortedJps[sortedJps.length - 1]}`
                              : `JP ${sortedJps[0]}`;

                            return (
                              <Grid size={{ xs: 12, sm: 6 }} key={sched.id}>
                                <Paper
                                  onClick={() => handleSelectSchedule(sched)}
                                  sx={{
                                    p: 1.5,
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    border: isSelected
                                      ? '2px solid #0f766e'
                                      : isDone
                                      ? '1.5px solid #86efac'
                                      : '1px solid #cbd5e1',
                                    bgcolor: isSelected
                                      ? '#ffffff'
                                      : isDone
                                      ? '#f0fdf4'
                                      : '#ffffff',
                                    boxShadow: isSelected
                                      ? '0 4px 12px rgba(15,118,110,0.2)'
                                      : 'none',
                                    '&:hover': {
                                      borderColor: '#0f766e',
                                      bgcolor: isSelected ? '#ffffff' : '#f8fafc'
                                    }
                                  }}
                                >
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.8 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                      <ClassIcon sx={{ fontSize: 18, color: '#2563eb' }} />
                                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                                        Kelas {sched.rombel_id}
                                      </Typography>
                                    </Box>
                                    {isDone ? (
                                      <Chip
                                        icon={<CheckCircleIcon sx={{ fontSize: '14px !important', color: '#16a34a' }} />}
                                        label="Presensi Terisi ✓"
                                        size="small"
                                        sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 800, fontSize: '0.68rem', height: 22 }}
                                      />
                                    ) : isSelected ? (
                                      <Chip
                                        label="Sesi Dipilih"
                                        size="small"
                                        sx={{ bgcolor: '#0f766e', color: '#ffffff', fontWeight: 800, fontSize: '0.68rem', height: 22 }}
                                      />
                                    ) : (
                                      <Chip
                                        label="Pilih Sesi"
                                        size="small"
                                        variant="outlined"
                                        sx={{ fontWeight: 700, fontSize: '0.68rem', height: 22 }}
                                      />
                                    )}
                                  </Box>

                                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155', mb: 0.5 }}>
                                    {sched.mapel_name}
                                  </Typography>

                                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                    <Chip
                                      label={jpStr}
                                      size="small"
                                      sx={{ bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 800, fontSize: '0.68rem', height: 20 }}
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                      ({sortedJps.map((j: number) => `#${j}`).join(', ')}) • {sortedJps.length} Jam
                                    </Typography>
                                  </Stack>
                                </Paper>
                              </Grid>
                            );
                          })}
                        </Grid>

                        <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
                          <Button
                            size="small"
                            onClick={() => setIsManualMode(!isManualMode)}
                            sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', color: '#0f766e' }}
                          >
                            {isManualMode ? '← Kembali ke Pilihan Sesi Otomatis' : 'Ganti Kelas / Jam Pengganti (Input Manual)'}
                          </Button>
                        </Box>
                      </Box>
                    )}
                  </Box>

                  {/* 2. FORM DETAIL SESI: OTOMATIS (TERKUNCI) ATAU MANUAL */}
                  {!isManualMode && selectedSchedule ? (
                    <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LockIcon sx={{ fontSize: 18, color: '#0f766e' }} />
                        Data Sesi Terkunci Otomatis (Berdasarkan Jadwal KBM)
                      </Typography>

                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <Paper elevation={0} sx={{ p: 1.5, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#ffffff' }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <LockIcon sx={{ fontSize: 13, color: '#64748b' }} /> Mata Pelajaran:
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a', mt: 0.5 }}>
                              {subject || '-'}
                            </Typography>
                          </Paper>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 4 }}>
                          <Paper elevation={0} sx={{ p: 1.5, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#ffffff' }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <LockIcon sx={{ fontSize: 13, color: '#64748b' }} /> Rombongan Belajar:
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: '#2563eb', mt: 0.5 }}>
                              Kelas {selectedRombel || '-'}
                            </Typography>
                          </Paper>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 4 }}>
                          <Paper elevation={0} sx={{ p: 1.5, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#ffffff' }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <LockIcon sx={{ fontSize: 13, color: '#64748b' }} /> Rentang Slot JP:
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: '#059669', mt: 0.5 }}>
                              {selectedJps.length > 0 ? selectedJps.map(j => `JP ${j}`).join(', ') : '-'} ({selectedJps.length} Jam)
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>

                      {/* Satu-satunya input teks yang diisi guru: Materi / Pokok Bahasan */}
                      <TextField
                        label="Materi / Pokok Bahasan *"
                        fullWidth
                        multiline
                        minRows={2}
                        maxRows={6}
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                        placeholder="Ketik pokok bahasan atau materi pembelajaran hari ini secara lengkap..."
                        helperText="*Wajib diisi sebelum melakukan verifikasi geolocation dan siswa."
                        sx={{ bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff', borderRadius: 1.5 }}
                      />
                    </Box>
                  ) : (
                    /* MODE MANUAL (Jadwal Khusus / Jam Pengganti) */
                    <Stack spacing={2}>
                      {isManualMode && (
                        <Alert severity="warning" sx={{ borderRadius: 2 }}>
                          Anda berada dalam <strong>Mode Input Manual</strong>. Gunakan mode ini jika mengajar kelas pengganti atau jadwal tambahan di luar jadwal reguler.
                        </Alert>
                      )}

                      {/* Select Rombel (Autocomplete / Searchable Dropdown - Status Aktif) */}
                      <Autocomplete
                        id="kbm-rombel-autocomplete"
                        size="small"
                        fullWidth
                        options={rombels}
                        getOptionLabel={(option) => {
                          if (typeof option === 'string') return option;
                          return option?.name ? `${option.name}${option.grade_level ? ` (Tingkat ${option.grade_level})` : ''}` : '';
                        }}
                        isOptionEqualToValue={(option, value) => {
                          if (typeof value === 'string') return option.name === value;
                          return option.name === value?.name;
                        }}
                        value={rombels.find(r => r.name === selectedRombel) || (selectedRombel ? { name: selectedRombel } : null)}
                        onChange={(_, newValue) => {
                          const val = typeof newValue === 'string' ? newValue : (newValue?.name || '');
                          setSelectedRombel(val);
                          setVerifiedStudents([]);
                        }}
                        renderOption={(props, option) => {
                          const { key, ...otherProps } = props;
                          return (
                            <li key={key || option.id || option.name} {...otherProps}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {option.name} {option.grade_level ? `(Tingkat ${option.grade_level})` : ''}
                                </Typography>
                                <Chip
                                  label="AKTIF"
                                  size="small"
                                  color="success"
                                  sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, ml: 1 }}
                                />
                              </Box>
                            </li>
                          );
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Rombongan Belajar (Ketik / Pilih Kelas)"
                            placeholder="Ketik nama kelas, misal: 10 RPL..."
                            helperText="*Ketik untuk mencari cepat Rombongan Belajar dengan Status Aktif."
                          />
                        )}
                      />

                      {/* Subject & Topic */}
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Autocomplete
                            freeSolo
                            size="small"
                            options={masterMapels.map((m: any) => m.nama_mapel || m.nama || m.kode_mapel || '').filter(Boolean)}
                            value={subject}
                            onInputChange={(_, newInputValue) => {
                              setSubject(newInputValue);
                            }}
                            onChange={(_, newValue) => {
                              if (typeof newValue === 'string') {
                                setSubject(newValue);
                              } else if (newValue && typeof newValue === 'object') {
                                setSubject((newValue as any).nama_mapel || (newValue as any).nama || '');
                              }
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Mata Pelajaran"
                                fullWidth
                                size="small"
                                placeholder="Ketik / pilih mata pelajaran..."
                                required
                              />
                            )}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField
                            label="Materi / Pokok Bahasan"
                            fullWidth
                            multiline
                            minRows={2}
                            maxRows={6}
                            value={topic}
                            onChange={e => setTopic(e.target.value)}
                            placeholder="Contoh: Trigonometri Bab 3 - Perhitungan Sudut dan Aplikasi Soal..."
                          />
                        </Grid>
                      </Grid>

                      {/* JP Selection - HANYA KATEGORI KBM */}
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: { xs: '0.85rem', sm: '0.9rem' } }}>
                              <AccessTimeIcon fontSize="small" sx={{ color: 'primary.main' }} />
                              Pilih Jam Pelajaran (KBM Saja):
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              *Kategori selain KBM (seperti Istirahat/Apel) tidak dapat dipilih
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={0.5}>
                            <Button size="small" variant="outlined" sx={{ fontSize: '0.72rem', py: 0.2, px: 1, borderRadius: 1.5 }} onClick={() => handleSelectJpRange(1, 2)}>
                              JP 1-2
                            </Button>
                            <Button size="small" variant="outlined" sx={{ fontSize: '0.72rem', py: 0.2, px: 1, borderRadius: 1.5 }} onClick={() => handleSelectJpRange(1, 3)}>
                              JP 1-3
                            </Button>
                            <Button size="small" variant="outlined" sx={{ fontSize: '0.72rem', py: 0.2, px: 1, borderRadius: 1.5 }} onClick={() => handleSelectJpRange(1, 4)}>
                              JP 1-4
                            </Button>
                          </Stack>
                        </Box>

                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {sortedPeriods.map((p, idx) => {
                            const isKbm = isKbmPeriod(p);

                            if (!isKbm) {
                              return (
                                <Tooltip
                                  key={`non-kbm-${idx}-${p.start_time}-${p.name || p.category_name}`}
                                  title={`${p.name || p.category_name || 'Kegiatan'} (${p.start_time} - ${p.end_time}) merupakan kegiatan non-KBM di luar Jam Pelajaran.`}
                                  arrow
                                >
                                  <Box
                                    sx={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 0.75,
                                      px: 1.25,
                                      py: 0.6,
                                      borderRadius: 2,
                                      bgcolor: '#f8fafc',
                                      border: '1px dashed #cbd5e1',
                                      color: '#475569',
                                      fontSize: { xs: '0.72rem', sm: '0.78rem' },
                                      fontWeight: 600,
                                      minHeight: '38px'
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        bgcolor: p.category_color || '#f59e0b',
                                        flexShrink: 0
                                      }}
                                    />
                                    <span>{p.name || p.category_name || 'Kegiatan'}</span>
                                    <Typography
                                      component="span"
                                      sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#64748b', fontSize: '0.75rem' }}
                                    >
                                      ({p.start_time} - {p.end_time})
                                    </Typography>
                                  </Box>
                                </Tooltip>
                              );
                            }

                            const isSelected = selectedJps.includes(p.jp_number);
                            const occ = occupiedJpMap.get(p.jp_number);

                            // If occupied by another teacher, LOCK it to prevent overwriting
                            if (occ && !occ.isSelf) {
                              return (
                                <Tooltip
                                  key={`jp-${p.jp_number}`}
                                  title={`JP ${p.jp_number} (${p.start_time} - ${p.end_time}) telah diisi oleh Guru ${occ.teacher_name} (${occ.subject}). Anda tidak dapat memilih JP ini agar tidak menimpa kehadiran guru lain.`}
                                  arrow
                                >
                                  <span>
                                    <Chip
                                      icon={<LockIcon sx={{ fontSize: '15px !important', color: '#b45309' }} />}
                                      label={`JP ${p.jp_number} (${p.start_time} - ${p.end_time}) • Terisi: ${occ.teacher_name}`}
                                      disabled
                                      size="medium"
                                      sx={{
                                        fontWeight: 700,
                                        borderRadius: 2,
                                        fontSize: { xs: '0.72rem', sm: '0.78rem' },
                                        bgcolor: '#fef3c7',
                                        color: '#92400e',
                                        border: '1px solid #fcd34d',
                                        cursor: 'not-allowed',
                                        minHeight: '40px',
                                        px: 0.5,
                                        opacity: 0.95
                                      }}
                                    />
                                  </span>
                                </Tooltip>
                              );
                            }

                            // If occupied by current teacher
                            if (occ && occ.isSelf) {
                              return (
                                <Tooltip
                                  key={`jp-${p.jp_number}`}
                                  title={`JP ${p.jp_number} (${p.start_time} - ${p.end_time}) sudah Anda catat kehadiran sebelumnya.`}
                                  arrow
                                >
                                  <Chip
                                    icon={<CheckCircleIcon sx={{ fontSize: '15px !important', color: '#15803d' }} />}
                                    label={`JP ${p.jp_number} (${p.start_time} - ${p.end_time}) • Sudah Anda Isi`}
                                    color={isSelected ? 'success' : 'default'}
                                    variant={isSelected ? 'filled' : 'outlined'}
                                    onClick={() => handleToggleJp(p.jp_number)}
                                    size="medium"
                                    sx={{
                                      fontWeight: 700,
                                      borderRadius: 2.5,
                                      fontSize: { xs: '0.72rem', sm: '0.78rem' },
                                      minHeight: '40px',
                                      px: 0.75,
                                      borderWidth: 1.5,
                                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                      boxShadow: isSelected ? { xs: '0 2px 8px rgba(22,163,74,0.3)', md: '0 6px 16px -2px rgba(22,163,74,0.45)' } : 'none',
                                      transform: isSelected ? { xs: 'none', md: 'translateY(-2px)' } : 'none',
                                      '&:hover': {
                                        md: {
                                          transform: 'translateY(-2px)',
                                          boxShadow: '0 6px 14px -1px rgba(22,163,74,0.35)'
                                        }
                                      },
                                      '&:active': { transform: 'scale(0.96)' }
                                    }}
                                  />
                                </Tooltip>
                              );
                            }

                            return (
                              <Chip
                                key={`jp-${p.jp_number}`}
                                label={`JP ${p.jp_number} (${p.start_time} - ${p.end_time})`}
                                clickable
                                color={isSelected ? 'primary' : 'default'}
                                variant={isSelected ? 'filled' : 'outlined'}
                                onClick={() => handleToggleJp(p.jp_number)}
                                size="medium"
                                sx={{
                                  fontWeight: 700,
                                  borderRadius: 2.5,
                                  fontSize: { xs: '0.75rem', sm: '0.8rem' },
                                  minHeight: '40px',
                                  px: 0.75,
                                  borderWidth: isSelected ? 2 : 1,
                                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                  boxShadow: isSelected
                                    ? { xs: '0 2px 8px rgba(37,99,235,0.25)', md: `0 8px 18px -2px ${alpha(theme.palette.primary.main, 0.4)}, 0 0 0 2px ${theme.palette.primary.main}` }
                                    : 'none',
                                  transform: isSelected ? { xs: 'none', md: 'translateY(-2px)' } : 'none',
                                  '&:hover': {
                                    md: {
                                      transform: 'translateY(-2px)',
                                      boxShadow: `0 6px 14px -1px ${alpha(theme.palette.primary.main, 0.3)}`
                                    }
                                  },
                                  '&:active': { transform: 'scale(0.96)' }
                                }}
                              />
                            );
                          })}
                        </Box>

                        {/* Ringkasan JP Terpilih */}
                        <Paper
                          elevation={0}
                          sx={{
                            mt: 1.5,
                            p: 1.25,
                            borderRadius: 1.5,
                            bgcolor: selectedJps.length > 0 ? 'rgba(37, 99, 235, 0.05)' : '#f8fafc',
                            border: selectedJps.length > 0 ? '1px solid rgba(37, 99, 235, 0.15)' : '1px dashed #cbd5e1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 1
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              color: selectedJps.length > 0 ? 'primary.dark' : 'text.secondary',
                              fontSize: { xs: '0.78rem', sm: '0.85rem' }
                            }}
                          >
                            JP Terpilih: {selectedJps.length > 0 ? selectedJps.map(j => `JP ${j}`).join(', ') : 'Belum ada (Silakan pilih JP di atas)'}
                          </Typography>
                          <Chip
                            label={selectedJps.length > 0 ? `${selectedJps.length} Jam KBM` : '0 JP'}
                            color={selectedJps.length > 0 ? 'primary' : 'default'}
                            size="small"
                            sx={{ fontWeight: 800, fontSize: '0.7rem' }}
                          />
                        </Paper>
                      </Box>
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* CARD: LOKASI GEOFENCING GPS & ANTI-FAKE GPS */}
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: { xs: '0 2px 8px rgba(0,0,0,0.04)', md: '0 10px 25px -5px rgba(0,0,0,0.04), 0 4px 6px -2px rgba(0,0,0,0.02)' },
                border: '1px solid #e2e8f0'
              }}
            >
              <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.2 }}>
                    <Box
                      sx={{
                        width: 34,
                        height: 34,
                        borderRadius: 2,
                        bgcolor: isMockGps ? '#fee2e2' : isLocationValid ? '#dcfce7' : '#fef3c7',
                        color: isMockGps ? '#dc2626' : isLocationValid ? '#16a34a' : '#d97706',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <LocationOnIcon sx={{ fontSize: 20 }} />
                    </Box>
                    2. Verifikasi Geolocation GPS & Anti-Fake GPS
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<MyLocationIcon />}
                    onClick={() => handleDetectLocation(true)}
                    disabled={detectingGps}
                    variant="outlined"
                    sx={{
                      textTransform: 'none',
                      fontWeight: 700,
                      borderRadius: 2,
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': { md: { transform: 'translateY(-1.5px)', bgcolor: alpha(theme.palette.primary.main, 0.08) } },
                      '&:active': { transform: 'scale(0.97)' }
                    }}
                  >
                    {detectingGps ? 'Mendeteksi...' : 'Cek Lokasi Presisi'}
                  </Button>
                </Box>

                {isMockGps && (
                  <Alert
                    severity="error"
                    icon={<SecurityIcon />}
                    sx={{ mb: 2, borderRadius: 2, border: '1px solid #f87171' }}
                  >
                    <strong>Terdeteksi Manipulasi Lokasi (Fake GPS):</strong> {mockGpsReason || 'Aplikasi pemalsu lokasi aktif pada perangkat.'} Presensi KBM diblokir demi integritas data. Harap matikan aplikasi pemalsu GPS untuk melanjutkan.
                  </Alert>
                )}

                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: isMockGps ? 'error.light' : isLocationValid ? 'success.light' : 'divider',
                    bgcolor: isMockGps ? 'rgba(239, 68, 68, 0.05)' : isLocationValid ? 'rgba(34, 197, 94, 0.05)' : 'background.paper',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 1.5
                  }}
                >
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {rules.school_location_name || 'Kampus Sekolah'}
                      </Typography>
                      {isMockGps ? (
                        <Chip label="Fake GPS Terdeteksi" color="error" size="small" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                      ) : isLocationValid ? (
                        <Chip label="Lokasi Valid" color="success" size="small" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                      ) : (
                        <Chip label="Di Luar Jarak" color="error" size="small" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                      )}
                      {gpsAccuracy !== null && !isMockGps && (
                        <Chip
                          icon={<GpsFixedIcon sx={{ fontSize: '13px !important' }} />}
                          label={`Akurasi: ±${Math.round(gpsAccuracy)}m`}
                          variant="outlined"
                          color={gpsAccuracy <= 20 ? 'success' : gpsAccuracy <= 50 ? 'info' : 'default'}
                          size="small"
                          sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {distanceToSchool !== null
                        ? `Jarak Anda: ±${Math.round(distanceToSchool)} meter (Batas Maksimal: ${rules.max_distance_meters}m)`
                        : 'Sinyal GPS terhubung'}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      icon={!isMockGps ? <ShieldIcon sx={{ fontSize: '14px !important', color: '#16a34a' }} /> : <WarningIcon sx={{ fontSize: '14px !important', color: '#dc2626' }} />}
                      label={isMockGps ? 'Sensor Disimulasikan' : 'Anti-Fake GPS Aktif'}
                      color={isMockGps ? 'error' : 'success'}
                      variant="outlined"
                      size="small"
                      sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                    />
                    <Chip
                      icon={isLocationValid ? <CheckCircleIcon sx={{ fontSize: '14px !important' }} /> : <WarningIcon sx={{ fontSize: '14px !important' }} />}
                      label={isLocationValid ? 'Area Sekolah Terverifikasi' : 'Harap Berada di Lingkungan Sekolah'}
                      color={isLocationValid ? 'success' : 'warning'}
                      variant="outlined"
                      size="small"
                      sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                    />
                  </Box>
                </Paper>
              </CardContent>
            </Card>
          </Grid>

          {/* RIGHT COLUMN: VERIFIKASI KARTU SISWA & SUBMIT */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: { xs: '0 2px 8px rgba(0,0,0,0.04)', md: '0 10px 25px -5px rgba(0,0,0,0.04), 0 4px 6px -2px rgba(0,0,0,0.02)' },
                border: '1px solid #e2e8f0',
                mb: { xs: 2.5, md: 3 }
              }}
            >
              <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.2 }}>
                    <Box
                      sx={{
                        width: 34,
                        height: 34,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.main,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <QrCodeScannerIcon sx={{ fontSize: 20 }} />
                    </Box>
                    3. Verifikasi Kartu Pelajar
                  </Typography>
                  <Chip
                    label={`${verifiedStudents.length} / ${minRequiredStudents} Siswa`}
                    color={isVerificationComplete ? 'success' : 'warning'}
                    size="small"
                    sx={{ fontWeight: 800 }}
                  />
                </Box>

                <Alert severity={isVerificationComplete ? 'success' : 'info'} icon={<InfoIcon fontSize="small" />} sx={{ mb: 2.5, borderRadius: 2 }}>
                  {isVerificationComplete ? (
                    <span>Syarat verifikasi telah terpenuhi! Siap dikirimkan.</span>
                  ) : (
                    <span>
                      Scan minimal <strong>{minRequiredStudents} kartu pelajar siswa</strong> di kelas <strong>{selectedRombel || '(Pilih Rombel)'}</strong> untuk memvalidasi kehadiran Anda.
                    </span>
                  )}
                </Alert>

                {/* Scan Buttons */}
                <Stack spacing={2} sx={{ mb: 3 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    startIcon={<CameraIcon />}
                    onClick={() => {
                      if (!selectedRombel) {
                        toast.error('Pilih Rombel / Kelas terlebih dahulu sebelum scan!');
                        return;
                      }
                      setScannerOpen(true);
                    }}
                    sx={{
                      borderRadius: 2.5,
                      py: 1.3,
                      textTransform: 'none',
                      fontWeight: 700,
                      bgcolor: 'primary.main',
                      boxShadow: { xs: 'none', md: `0 4px 14px ${alpha(theme.palette.primary.main, 0.35)}` },
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        md: {
                          transform: 'translateY(-1.5px)',
                          boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.45)}`
                        }
                      },
                      '&:active': { transform: 'scale(0.98)' }
                    }}
                  >
                    Buka Scanner Kamera Siswa
                  </Button>

                  {rules.allow_manual_verification && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="Ketik NISN Siswa..."
                        value={manualNisn}
                        onChange={e => setManualNisn(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleManualVerify()}
                        slotProps={{
                          input: {
                            endAdornment: (
                              <InputAdornment position="end">
                                <Button size="small" onClick={handleManualVerify} sx={{ textTransform: 'none', fontWeight: 600 }}>
                                  Verifikasi
                                </Button>
                              </InputAdornment>
                            )
                          }
                        }}
                      />
                    </Box>
                  )}
                </Stack>

                <Divider sx={{ mb: 2 }} />

                {/* Scanned Student List */}
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                  Kartu Siswa yang Terverifikasi:
                </Typography>

                {verifiedStudents.length === 0 ? (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      bgcolor: 'action.hover',
                      borderRadius: 2,
                      border: '1px dashed',
                      borderColor: 'divider',
                      mb: 3
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Belum ada kartu pelajar siswa yang diverifikasi.
                    </Typography>
                  </Paper>
                ) : (
                  <Stack spacing={1} sx={{ mb: 3 }}>
                    {verifiedStudents.map((st, idx) => (
                      <Paper
                        key={st.nisn}
                        elevation={0}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'success.light',
                          bgcolor: 'rgba(34, 197, 94, 0.04)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                            {idx + 1}. {st.student_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            NISN: {st.nisn} • Kelas: {st.class_name}
                          </Typography>
                        </Box>
                        <IconButton size="small" color="error" onClick={() => handleRemoveVerified(st.nisn)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* CARD 4: SISWA TIDAK HADIR KBM & INFORMASI IZIN HARI INI */}
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: { xs: '0 2px 8px rgba(0,0,0,0.04)', md: '0 10px 25px -5px rgba(0,0,0,0.04), 0 4px 6px -2px rgba(0,0,0,0.02)' },
                border: '1px solid',
                borderColor: isDark ? preset.glassBorder : '#e2e8f0',
                bgcolor: isDark ? preset.cardBg : '#ffffff',
                color: preset.textColorPrimary
              }}
            >
              <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: 2,
                      bgcolor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2',
                      color: isDark ? '#f87171' : '#dc2626',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <WarningAmberIcon sx={{ fontSize: 20 }} />
                  </Box>
                  4. Catatan Siswa Tidak Hadir KBM (Jam Pelajaran)
                </Typography>
                <Typography variant="body2" sx={{ color: preset.textColorSecondary, mb: 2 }}>
                  Pilih siswa yang <strong>berada di sekolah (status Hadir)</strong> namun <strong>tidak hadir di dalam kelas/KBM</strong> pada jam pelajaran ini.
                </Typography>

                {!selectedRombel ? (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    Pilih Rombel / Kelas terlebih dahulu untuk memuat daftar siswa.
                  </Alert>
                ) : (
                  <Stack spacing={2.5}>
                    {/* Search & Autocomplete Siswa Hadir di Sekolah */}
                    <Box sx={{ p: 2, bgcolor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#f8fafc', borderRadius: 2.5, border: `1px solid ${preset.glassBorder}` }}>
                      <Grid container spacing={{ xs: 1.5, md: 2 }} sx={{ alignItems: 'flex-start' }}>
                        <Grid size={{ xs: 12, md: 5 }}>
                          <Autocomplete
                            options={selectableStudentsForKbm}
                            getOptionLabel={(s) => `${s.name} (${s.nisn})`}
                            value={selectedAbsentStudentInput}
                            onChange={(_, newValue) => setSelectedAbsentStudentInput(newValue)}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Cari Nama Siswa"
                                placeholder="Ketik nama / NISN..."
                                size="small"
                                fullWidth
                              />
                            )}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4.5 }}>
                          <Autocomplete
                            freeSolo
                            options={[
                              'Cabut / Tanpa Keterangan',
                              'Izin Ke Toilet / Kantin (Lama)',
                              'Sakit di UKS',
                              'Dispensasi OSIS / Lomba',
                              'Lainnya'
                            ]}
                            value={absentReasonInput}
                            onInputChange={(_, newValue) => setAbsentReasonInput(newValue)}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                size="small"
                                fullWidth
                                label="Keterangan / Alasan"
                                placeholder="Pilih atau ketik alasan..."
                              />
                            )}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 2.5 }}>
                          <Button
                            variant="contained"
                            color="error"
                            fullWidth
                            size="medium"
                            onClick={handleAddAbsentStudent}
                            disabled={!selectedAbsentStudentInput}
                            sx={{
                              textTransform: 'none',
                              fontWeight: 700,
                              height: { xs: '44px', md: '40px' },
                              borderRadius: 2
                            }}
                          >
                            Tambah
                          </Button>
                        </Grid>
                      </Grid>
                    </Box>

                    {/* Daftar Siswa Tidak Hadir KBM yang ditambahkan */}
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                        Daftar Siswa Tidak Hadir KBM ({absentStudentsKbm.length} Siswa):
                      </Typography>
                      {absentStudentsKbm.length === 0 ? (
                        <Paper
                          elevation={0}
                          sx={{
                            p: 2,
                            textAlign: 'center',
                            bgcolor: isDark ? 'rgba(30, 41, 59, 0.3)' : '#f8fafc',
                            borderRadius: 2.5,
                            border: `1px dashed ${preset.glassBorder}`
                          }}
                        >
                          <Typography variant="caption" sx={{ color: preset.textColorSecondary }}>
                            Semua siswa yang hadir di sekolah terpantau mengikuti KBM. (Tidak ada siswa dicatat bolos/cabut).
                          </Typography>
                        </Paper>
                      ) : (
                        <Stack spacing={1}>
                          {absentStudentsKbm.map((st, i) => (
                            <Paper
                              key={st.nisn}
                              elevation={0}
                              sx={{
                                p: 1.5,
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#fca5a5',
                                bgcolor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                              }}
                            >
                              <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: isDark ? '#f87171' : '#dc2626' }}>
                                  {i + 1}. {st.name} ({st.nisn})
                                </Typography>
                                <Typography variant="caption" sx={{ color: preset.textColorSecondary }}>
                                  Alasan: <strong>{st.reason || 'Tidak di kelas'}</strong>
                                </Typography>
                              </Box>
                              <IconButton size="small" color="error" onClick={() => handleRemoveAbsentStudent(st.nisn)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Paper>
                          ))}
                        </Stack>
                      )}
                    </Box>

                    <Divider />

                    {/* KOTAK INFORMASI IZIN HARI INI DARI GURU PIKET */}
                    <Box sx={{ p: 2, bgcolor: isDark ? 'rgba(30, 41, 59, 0.8)' : '#eff6ff', borderRadius: 2.5, border: '1px solid', borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#bfdbfe' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isDark ? '#93c5fd' : '#1e40af', display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <InfoIcon fontSize="small" /> Informasi Perizinan Hari Ini dari Guru Piket ({selectedRombel}):
                      </Typography>
                      {todayPiketIzinList.length === 0 ? (
                        <Typography variant="caption" sx={{ color: preset.textColorSecondary, fontStyle: 'italic' }}>
                          Tidak ada siswa dari kelas {selectedRombel} yang berstatus Izin / Sakit / Dispensasi di Guru Piket hari ini.
                        </Typography>
                      ) : (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                          {todayPiketIzinList.map((iz: any) => {
                            const dispDetail = iz.keperluan_dispensasi || iz.keperluanDispensasi || iz.keperluan || '';
                            const labelText = iz.keterangan === 'Dispensasi' && dispDetail
                              ? `${iz.student_name || iz.nisn} (Dispensasi: ${dispDetail})`
                              : `${iz.student_name || iz.nisn} (${iz.keterangan || 'Izin'})`;
                            return (
                              <Chip
                                key={iz.id || iz.nisn}
                                label={labelText}
                                color={iz.keterangan === 'Sakit' ? 'warning' : iz.keterangan === 'Dispensasi' ? 'info' : 'secondary'}
                                variant="filled"
                                size="small"
                                sx={{ fontWeight: 700 }}
                              />
                            );
                          })}
                        </Box>
                      )}
                    </Box>
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* CARD 5: SUBMIT */}
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: { xs: '0 2px 8px rgba(0,0,0,0.04)', md: '0 10px 25px -5px rgba(0,0,0,0.04), 0 4px 6px -2px rgba(0,0,0,0.02)' },
                border: '1px solid',
                borderColor: isDark ? preset.glassBorder : '#e2e8f0',
                bgcolor: isDark ? preset.cardBg : '#ffffff'
              }}
            >
              <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
                {isMockGps && (
                  <Alert severity="error" icon={<SecurityIcon />} sx={{ mb: 1.5, borderRadius: 2 }}>
                    <strong>Presensi Diblokir:</strong> Fake GPS terdeteksi. Matikan aplikasi pemalsu lokasi.
                  </Alert>
                )}
                <Button
                  variant="contained"
                  color="success"
                  fullWidth
                  size="large"
                  disabled={!isVerificationComplete || isSubmitting || isMockGps}
                  startIcon={<SendIcon />}
                  onClick={handleSubmitAttendance}
                  sx={{
                    borderRadius: 2.5,
                    py: 1.5,
                    textTransform: 'none',
                    fontWeight: 800,
                    fontSize: '1rem',
                    boxShadow: isVerificationComplete && !isMockGps ? { xs: '0 4px 14px rgba(34,197,94,0.35)', md: '0 8px 24px -2px rgba(34,197,94,0.45)' } : 'none',
                    transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      md: isVerificationComplete && !isMockGps ? {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 12px 28px -2px rgba(34,197,94,0.55)'
                      } : {}
                    },
                    '&:active': {
                      transform: isVerificationComplete && !isMockGps ? 'scale(0.98)' : 'none'
                    }
                  }}
                >
                  {isSubmitting
                    ? 'Mengirimkan Presensi...'
                    : isMockGps
                    ? 'Presensi Ditolak (Fake GPS)'
                    : 'Kirim Kehadiran KBM Sekarang'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        )}
      </Box>

      {/* MOBILE STICKY SUBMIT ACTION BAR FOR SMARTPHONE ACCESS */}
      {activePortalTab === 'form' && (
        <Box
          sx={{
            display: { xs: 'block', md: 'none' },
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            bgcolor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'divider',
            p: 1.5,
            zIndex: 90,
            boxShadow: '0 -4px 16px rgba(0,0,0,0.1)'
          }}
        >
          <Button
            variant="contained"
            color="success"
            fullWidth
            size="medium"
            disabled={!isVerificationComplete || isSubmitting || isMockGps}
            startIcon={<SendIcon />}
            onClick={handleSubmitAttendance}
            sx={{
              borderRadius: 2.5,
              py: 1.25,
              textTransform: 'none',
              fontWeight: 800,
              fontSize: '0.95rem',
              boxShadow: isVerificationComplete && !isMockGps ? '0 4px 14px rgba(34,197,94,0.35)' : 'none'
            }}
          >
            {isSubmitting
              ? 'Mengirim Presensi...'
              : isMockGps
              ? 'Presensi Ditolak (Fake GPS)'
              : isVerificationComplete
              ? 'Kirim Kehadiran KBM Sekarang'
              : `Verifikasi ${minRequiredStudents - verifiedStudents.length} Siswa Lagi`}
          </Button>
        </Box>
      )}

      {/* MODAL PERINGATAN MODERN VERIFIKASI GANDA SISWA */}
      <Dialog
        open={Boolean(duplicateWarning?.open)}
        onClose={() => setDuplicateWarning(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3.5,
              p: 2,
              textAlign: 'center',
              border: '1px solid #fecaca',
              boxShadow: '0 20px 25px -5px rgba(239, 68, 68, 0.2), 0 8px 10px -6px rgba(239, 68, 68, 0.1)'
            }
          }
        }}
      >
        <DialogContent sx={{ p: 1 }}>
          <Box
            sx={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              bgcolor: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 1.5
            }}
          >
            <WarningAmberIcon sx={{ fontSize: 36 }} />
          </Box>
          <Chip
            label="VERIFIKASI GANDA TERDETEKSI"
            size="small"
            sx={{
              bgcolor: '#fee2e2',
              color: '#991b1b',
              fontWeight: 800,
              fontSize: '0.72rem',
              mb: 1.5,
              letterSpacing: 0.5
            }}
          />
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', mb: 1, fontSize: '1.05rem' }}>
            Siswa Sudah Pernah Diverifikasi!
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.5, fontSize: '0.85rem' }}>
            Setiap siswa <strong>hanya dapat melakukan verifikasi 1 kali</strong> pada satu sesi KBM guru. Jumlah minimal verifikasi harus berasal dari <strong>siswa yang berbeda</strong> dalam kelas.
          </Typography>

          {duplicateWarning && (
            <Box
              sx={{
                p: 1.8,
                borderRadius: 2.5,
                bgcolor: '#f8fafc',
                border: '1px solid #e2e8f0',
                textAlign: 'left',
                mb: 1
              }}
            >
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block' }}>
                DATA SISWA TERKAIT:
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', mt: 0.5 }}>
                {duplicateWarning.studentName}
              </Typography>
              <Typography variant="caption" sx={{ color: '#475569', display: 'block' }}>
                NISN: <strong>{duplicateWarning.nisn}</strong> • Kelas: <strong>{duplicateWarning.className}</strong>
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 1, pt: 0.5 }}>
          <Button
            variant="contained"
            color="error"
            onClick={() => setDuplicateWarning(null)}
            sx={{
              borderRadius: 2,
              px: 3.5,
              py: 0.9,
              fontWeight: 700,
              textTransform: 'none',
              boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.25)'
            }}
          >
            Mengerti, Minta Siswa Lain
          </Button>
        </DialogActions>
      </Dialog>

      {/* SCANNER CAMERA MODAL - CONTINUOUS & RESPONSIVE */}
      <Dialog
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: 3, overflow: 'hidden' }
          }
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            bgcolor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            py: 1.5,
            px: 2.5
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CameraIcon color="primary" />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                Scan Kartu Siswa
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Kelas: <strong>{selectedRombel}</strong>
              </Typography>
            </Box>
          </Box>
          <Chip
            label={`${verifiedStudents.length} / ${minRequiredStudents} Siswa`}
            color={isVerificationComplete ? 'success' : 'primary'}
            size="small"
            sx={{ fontWeight: 800 }}
          />
        </DialogTitle>

        <DialogContent sx={{ p: 2.5, textAlign: 'center' }}>
          <Alert
            severity={isVerificationComplete ? 'success' : 'info'}
            icon={<InfoIcon fontSize="small" />}
            sx={{ mb: 2, borderRadius: 2, textAlign: 'left', py: 0.5 }}
          >
            {isVerificationComplete ? (
              <span>
                <strong>Kouta Minimum Terpenuhi ({verifiedStudents.length} Siswa)!</strong> Kamera tetap aktif jika Anda ingin memindai siswa tambahan, atau klik <strong>Selesai & Tutup Scanner</strong> di bawah.
              </span>
            ) : (
              <span>
                Kamera aktif terus secara otomatis. Arahkan QR/Barcode kartu siswa satu per satu ke kotak pemindai.
              </span>
            )}
          </Alert>

          <Box sx={{ maxWidth: 360, mx: 'auto', mb: 2 }}>
            <CustomScanner id="kbm-student-scan" onScan={verifyStudentCard} preferredFacingMode="environment" fps={15} />
          </Box>

          {/* REALTIME SCANNED STUDENTS LIST INSIDE MODAL */}
          {verifiedStudents.length > 0 && (
            <Box sx={{ textAlign: 'left', mt: 2, pt: 1.5, borderTop: '1px dashed #cbd5e1' }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
                Siswa Terverifikasi ({verifiedStudents.length}):
              </Typography>
              <Stack spacing={1} sx={{ maxHeight: 160, overflowY: 'auto', pr: 0.5 }}>
                {verifiedStudents.map((s, idx) => (
                  <Paper
                    key={s.nisn || s.student_id || idx}
                    elevation={0}
                    sx={{
                      p: 1,
                      px: 1.5,
                      borderRadius: 2,
                      bgcolor: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircleIcon sx={{ color: 'success.main', fontSize: 18 }} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>
                          {s.student_name || s.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem' }}>
                          NISN: {s.nisn} • {s.class_name}
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveVerified(s.nisn)}
                      sx={{ p: 0.5 }}
                    >
                      <DeleteIcon fontSize="small" sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Paper>
                ))}
              </Stack>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.secondary">
            {verifiedStudents.length >= minRequiredStudents ? '✅ Siap kirim presensi' : '⏳ Menunggu scan kartu'}
          </Typography>
          <Button
            variant="contained"
            color={isVerificationComplete ? 'success' : 'primary'}
            onClick={() => setScannerOpen(false)}
            startIcon={<CheckIcon />}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2,
              px: 3
            }}
          >
            Selesai & Tutup Scanner
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODERN RESULT POPUP MODAL */}
      <Dialog
        open={resultPopup.open}
        onClose={handleResetForm}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: 3, p: 2, textAlign: 'center' }
          }
        }}
      >
        <DialogContent>
          <Box sx={{ my: 1 }}>
            <CheckCircleIcon sx={{ fontSize: 70, color: 'success.main', mb: 1.5 }} />
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
              {resultPopup.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {resultPopup.message}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 1, px: 2, gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => {
              handleResetForm();
              setActivePortalTab('history');
            }}
            startIcon={<HistoryIcon />}
            sx={{ borderRadius: 2, px: 2.5, py: 1, textTransform: 'none', fontWeight: 700 }}
          >
            Lihat Riwayat Presensi
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleResetForm}
            sx={{ borderRadius: 2, px: 3, py: 1, textTransform: 'none', fontWeight: 700 }}
          >
            Input Presensi Baru
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
