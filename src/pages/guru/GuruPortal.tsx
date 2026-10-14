import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Drawer,
  AppBar,
  Toolbar,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  Avatar,
  Chip,
  Divider,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Menu as MenuIcon,
  CoPresent as CoPresentIcon,
  AssignmentInd as AssignmentIndIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  School as SchoolIcon,
  LockOpen as LockOpenIcon,
  Groups as GroupsIcon,
  Assessment as AssessmentIcon,
  CloudUpload as CloudUploadIcon,
  FactCheck as FactCheckIcon,
  Verified as VerifiedIcon,
  Settings as SettingsIcon,
  Home as HomeIcon,
  ArrowBack as ArrowBackIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  CalendarMonth as CalendarMonthIcon
} from '@mui/icons-material';
import {
  Activity as LucideActivity,
  Users as LucideUsers,
  CalendarCheck as LucideCalendarCheck,
  ShieldAlert as LucideShieldAlert,
  ShieldCheck as LucideShieldCheck,
  ClipboardCheck as LucideClipboardCheck,
  Award as LucideAward,
  FileCheck as LucideFileCheck,
  Sliders as LucideSliders,
  UploadCloud as LucideUploadCloud,
  UserCircle as LucideUserCircle,
  LogOut as LucideLogOut,
  Sparkles as LucideSparkles,
  School as LucideSchool,
  PanelLeftClose as LucidePanelLeftClose,
  PanelLeftOpen as LucidePanelLeftOpen,
  ChevronLeft as LucideChevronLeft,
  ChevronRight as LucideChevronRight
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { safeStorage } from '../../safeStorage';
import RealtimeTeacherAttendance from './RealtimeTeacherAttendance';
import GuruPiketIzinSection from './GuruPiketIzinSection';
import GuruAccountInfoSection from './GuruAccountInfoSection';
import WaliKelas from './WaliKelas';
import TeacherAttendanceReports from '../admin/TeacherAttendanceReports';
import PerangkatGuruView from '../../components/perangkat/PerangkatGuruView';
import PerangkatKurikulumView from '../../components/perangkat/PerangkatKurikulumView';
import PerangkatKepsekView from '../../components/perangkat/PerangkatKepsekView';
import JadwalKbmGuru from './JadwalKbmGuru';
import { CalendarClock as LucideCalendarClock, QrCode as LucideQrCode } from 'lucide-react';
import ScanKehadiranSiswaMobile from './ScanKehadiranSiswaMobile';
import RekapJurnalKbm from './RekapJurnalKbm';
import MonitoringKbmSiswa from './MonitoringKbmSiswa';
import { useAppTheme } from '../../contexts/ThemeModeContext';

const EXPANDED_DRAWER_WIDTH = 308;
const COLLAPSED_DRAWER_WIDTH = 78;

type MenuKey = 
  | 'monitoring' 
  | 'monitoring-jurnal-kbm'
  | 'presensi-kesiswaan' 
  | 'monitoring-kbm-siswa'
  | 'wali-kelas' 
  | 'kehadiran' 
  | 'rekap-jurnal-kbm'
  | 'jadwal-kbm'
  | 'scan-kehadiran-siswa'
  | 'piket' 
  | 'akun'
  | 'perangkat-guru'
  | 'perangkat-verifikasi'
  | 'perangkat-setting'
  | 'perangkat-supervisi'
  | 'perangkat-pengesahan';

export default function GuruPortal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMenu = searchParams.get('menu') as MenuKey | null;
  
  const [activeMenu, setActiveMenu] = useState<MenuKey>(() => {
    const user = safeStorage.getJSON('guru_user', null);
    const validMenus: MenuKey[] = [
      'monitoring', 
      'monitoring-jurnal-kbm',
      'presensi-kesiswaan', 
      'monitoring-kbm-siswa',
      'wali-kelas', 
      'kehadiran', 
      'rekap-jurnal-kbm',
      'jadwal-kbm',
      'scan-kehadiran-siswa',
      'piket', 
      'akun',
      'perangkat-guru',
      'perangkat-verifikasi',
      'perangkat-setting',
      'perangkat-supervisi',
      'perangkat-pengesahan'
    ];
    if (initialMenu && validMenus.includes(initialMenu)) {
      return initialMenu;
    }
    if (user?.role === 'KEPALA_SEKOLAH' || user?.role === 'WAKIL_KURIKULUM') {
      return 'monitoring';
    }
    if (user?.role === 'WAKIL_KESISWAAN' || user?.role === 'GURU_BK') {
      return 'presensi-kesiswaan';
    }
    return 'kehadiran';
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'home' | 'menu'>('home');

  // Global Theme Preset & Dark Mode Hook
  const { presetId, isDark, toggleDark } = useAppTheme('teacher');
  const isAquaGlass = presetId === 'aqua_glass';
  const isDarkMode = isDark;

  const toggleThemeMode = () => {
    toggleDark('teacher');
    safeStorage.setItem('guruThemeMode', !isDarkMode ? 'dark' : 'light');
  };

  // Desktop Collapsible Sidebar State (Expanded vs Collapsed)
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState<boolean>(() => {
    return safeStorage.getItem('guruDesktopSidebarCollapsed') === 'true';
  });

  const toggleDesktopSidebar = () => {
    setDesktopSidebarCollapsed(prev => {
      const next = !prev;
      safeStorage.setItem('guruDesktopSidebarCollapsed', String(next));
      return next;
    });
  };

  const currentDrawerWidth = desktopSidebarCollapsed ? COLLAPSED_DRAWER_WIDTH : EXPANDED_DRAWER_WIDTH;

  // Summary Stats for Mobile Main Card
  const [mobileSummary, setMobileSummary] = useState<{
    totalRombel: number;
    kbmTodayCount: number;
    kbmFilledCount: number;
    totalJpToday: number;
    guruJpToday: number;
    guruFilledJp: number;
  }>({
    totalRombel: 0,
    kbmTodayCount: 0,
    kbmFilledCount: 0,
    totalJpToday: 0,
    guruJpToday: 0,
    guruFilledJp: 0
  });

  // User State
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const isAuth = safeStorage.getItem('guru_auth') === 'true';
    const user = safeStorage.getJSON('guru_user', null);
    if (!isAuth || !user) return null;
    return user;
  });

  // Settings State
  const [websiteName, setWebsiteName] = useState('SMK Negeri');
  const [logoBase64, setLogoBase64] = useState<string>('');
  const [judulGuruPortal, setJudulGuruPortal] = useState(() => localStorage.getItem('judulGuruPortal') || 'Akses Data Guru');
  const [subjudulGuruPortal, setSubjudulGuruPortal] = useState(() => localStorage.getItem('subjudulGuruPortal') || 'Portal Kehadiran, Piket & Akun Guru');
  const [activePeriod, setActivePeriod] = useState<{ tahun_ajaran: string; semester: string }>({ tahun_ajaran: '2024/2025', semester: 'Ganjil' });

  // Piket Duty State
  const [isDutyToday, setIsDutyToday] = useState(false);
  const [teacherDutyInfo, setTeacherDutyInfo] = useState<string>('');
  const [currentDayName, setCurrentDayName] = useState('');
  const [formattedDate, setFormattedDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Clock & Date Timer
  useEffect(() => {
    const daysIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const monthsIndo = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const updateDateTime = () => {
      const now = new Date();
      const day = daysIndo[now.getDay()];
      setCurrentDayName(day);
      setFormattedDate(`${day}, ${now.getDate()} ${monthsIndo[now.getMonth()]} ${now.getFullYear()}`);
      setCurrentTime(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} WIB`
      );
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Authentication check & initial data loading
  useEffect(() => {
    const isAuth = safeStorage.getItem('guru_auth') === 'true';
    const user = safeStorage.getJSON('guru_user', null);

    if (!isAuth || !user) {
      toast.dismiss();
      toast.error('Sesi login telah berakhir. Silakan login kembali.', { id: 'guru-session-end', duration: 2000 });
      navigate('/guru/login', { replace: true });
      return;
    }

    setCurrentUser(user);

    // Pastikan tidak ada notifikasi popup menumpuk dan tampilkan hanya satu notifikasi selamat datang
    if (safeStorage.getItem('guru_just_logged_in') === 'true') {
      safeStorage.removeItem('guru_just_logged_in');
      toast.dismiss();
      toast.success(`Selamat datang, ${user.name || 'Bapak/Ibu Guru'}!`, {
        id: 'guru-login-welcome',
        duration: 1500
      });
    }

    // Fetch School Settings, Piket Schedules & Live Guru Profile
    async function loadPortalData() {
      try {
        const teacherId = user.id || user.teacher_id;
        const [settingsRes, schedRes, profileRes, activeConfigRes] = await Promise.all([
          axios.get('/api/settings').catch(() => ({ data: {} })),
          axios.get('/api/piket-schedule').catch(() => ({ data: { data: [] } })),
          axios.get('/api/guru/profile', { params: { teacher_id: teacherId, username: user.username } }).catch(() => ({ data: null })),
          axios.get('/api/tahun-ajaran/active-config').catch(() => ({ data: { data: {} } }))
        ]);

        if (activeConfigRes.data?.data?.active_tahun_ajaran) {
          setActivePeriod({
            tahun_ajaran: activeConfigRes.data.data.active_tahun_ajaran,
            semester: activeConfigRes.data.data.active_semester || 'Ganjil'
          });
        } else if (settingsRes.data?.tahun_ajaran || settingsRes.data?.tahunAjaran) {
          setActivePeriod({
            tahun_ajaran: settingsRes.data.tahun_ajaran || settingsRes.data.tahunAjaran,
            semester: settingsRes.data.semester || 'Ganjil'
          });
        }

        if (profileRes && profileRes.data && profileRes.data.teacher) {
          const freshTeacher = profileRes.data.teacher;
          const updatedUser = {
            ...user,
            ...freshTeacher,
            role: freshTeacher.role || 'GURU',
            class: freshTeacher.class !== undefined ? freshTeacher.class : user.class,
            name: freshTeacher.name || user.name,
            nip: freshTeacher.nip || user.nip
          };
          setCurrentUser(updatedUser);
          safeStorage.setJSON('guru_user', updatedUser);
        }

        if (settingsRes.data) {
          if (settingsRes.data.websiteName) {
            setWebsiteName(settingsRes.data.websiteName);
          }
          if (settingsRes.data.logoBase64) {
            setLogoBase64(settingsRes.data.logoBase64);
          }
          if (settingsRes.data.judul_guru_portal || settingsRes.data.judulGuruPortal) {
            const title = settingsRes.data.judul_guru_portal || settingsRes.data.judulGuruPortal;
            setJudulGuruPortal(title);
            localStorage.setItem('judulGuruPortal', title);
          }
          if (settingsRes.data.subjudul_guru_portal || settingsRes.data.subjudulGuruPortal) {
            const sub = settingsRes.data.subjudul_guru_portal || settingsRes.data.subjudulGuruPortal;
            setSubjudulGuruPortal(sub);
            localStorage.setItem('subjudulGuruPortal', sub);
          }
        }

        if (schedRes.data && schedRes.data.data) {
          const scheds: any[] = schedRes.data.data;

          // Check logged in teacher's piket duties
          const teacherId = user.id || user.teacher_id;
          const teacherName = (user.name || '').toLowerCase().trim();

          const myScheds = scheds.filter(
            s => (teacherId && s.teacher_id === teacherId) ||
                 (s.teacher_name && s.teacher_name.toLowerCase().trim() === teacherName)
          );

          const daysIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
          const todayName = daysIndo[new Date().getDay()];

          const activeToday = myScheds.find(
            s => s.day_name && s.day_name.toLowerCase() === todayName.toLowerCase()
          );

          if (activeToday || user.role === 'admin') {
            setIsDutyToday(true);
            setTeacherDutyInfo(activeToday?.keterangan || (user.role === 'admin' ? 'Administrator Piket' : 'Guru Piket'));
          } else {
            setIsDutyToday(false);
            if (myScheds.length > 0) {
              const dutyDays = myScheds.map(s => `${s.day_name} (${s.keterangan || 'Guru Piket'})`).join(', ');
              setTeacherDutyInfo(`Setiap hari ${dutyDays}`);
            } else {
              setTeacherDutyInfo('Belum terdaftar dalam jadwal tugas piket mingguan');
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    }

    loadPortalData();
  }, [navigate]);

  // Fetch summary stats for mobile main card
  useEffect(() => {
    async function fetchSummaryStats() {
      if (!currentUser) return;
      try {
        const daysIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const todayDayName = daysIndo[new Date().getDay()];
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        const [rombelRes, schedRes, attRes] = await Promise.all([
          axios.get('/api/rombel').catch(() => ({ data: [] })),
          axios.get(`/api/kbm/schedules/day/${todayDayName}`).catch(() => ({ data: { data: [] } })),
          axios.get(`/api/teacher-kbm-attendance?date=${todayStr}`).catch(() => ({ data: { data: [] } }))
        ]);

        const rombelData = Array.isArray(rombelRes.data) ? rombelRes.data : (rombelRes.data?.data || []);
        const schedData = Array.isArray(schedRes.data?.data) ? schedRes.data.data : (Array.isArray(schedRes.data) ? schedRes.data : []);
        const attData = Array.isArray(attRes.data?.data) ? attRes.data.data : (Array.isArray(attRes.data) ? attRes.data : []);

        const teacherId = currentUser?.id || currentUser?.teacher_id;
        const teacherName = (currentUser?.name || '').toLowerCase().trim();

        const myScheds = schedData.filter((s: any) => 
          (teacherId && s.teacher_id === teacherId) ||
          (s.teacher_name && s.teacher_name.toLowerCase().trim() === teacherName)
        );

        const myAtts = attData.filter((a: any) =>
          (teacherId && a.teacher_id === teacherId) ||
          (a.teacher_name && a.teacher_name.toLowerCase().trim() === teacherName)
        );

        setMobileSummary({
          totalRombel: rombelData.length || 0,
          kbmTodayCount: schedData.length || 0,
          kbmFilledCount: attData.length || 0,
          totalJpToday: schedData.reduce((acc: number, item: any) => acc + (item.jp_count || 1), 0),
          guruJpToday: myScheds.reduce((acc: number, item: any) => acc + (item.jp_count || 1), 0),
          guruFilledJp: myAtts.length || 0,
        });
      } catch (e) {
        console.error('Error fetching mobile summary stats:', e);
      }
    }

    fetchSummaryStats();
  }, [currentUser]);

  // Helpers for Mobile Banking View
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const getShortcutStyle = (id: MenuKey) => {
    switch (id) {
      case 'monitoring':
        return {
          gradient: 'linear-gradient(135deg, #c084fc 0%, #9333ea 100%)',
          shadowColor: 'rgba(147, 51, 234, 0.45)',
        };
      case 'presensi-kesiswaan':
        return {
          gradient: 'linear-gradient(135deg, #22d3ee 0%, #0891b2 100%)',
          shadowColor: 'rgba(8, 145, 178, 0.45)',
        };
      case 'wali-kelas':
        return {
          gradient: 'linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%)',
          shadowColor: 'rgba(13, 148, 136, 0.45)',
        };
      case 'kehadiran':
        return {
          gradient: 'linear-gradient(135deg, #4ade80 0%, #16a34a 100%)',
          shadowColor: 'rgba(22, 163, 74, 0.45)',
        };
      case 'scan-kehadiran-siswa':
        return {
          gradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
          shadowColor: 'rgba(4, 120, 87, 0.45)',
        };
      case 'piket':
        return {
          gradient: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
          shadowColor: 'rgba(217, 119, 6, 0.45)',
        };
      case 'perangkat-guru':
        return {
          gradient: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)',
          shadowColor: 'rgba(37, 99, 235, 0.45)',
        };
      case 'perangkat-verifikasi':
        return {
          gradient: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
          shadowColor: 'rgba(2, 132, 199, 0.45)',
        };
      case 'perangkat-setting':
        return {
          gradient: 'linear-gradient(135deg, #94a3b8 0%, #475569 100%)',
          shadowColor: 'rgba(71, 85, 105, 0.45)',
        };
      case 'perangkat-supervisi':
        return {
          gradient: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
          shadowColor: 'rgba(124, 58, 237, 0.45)',
        };
      case 'perangkat-pengesahan':
        return {
          gradient: 'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)',
          shadowColor: 'rgba(225, 29, 72, 0.45)',
        };
      case 'akun':
        return {
          gradient: 'linear-gradient(135deg, #9ca3af 0%, #4b5563 100%)',
          shadowColor: 'rgba(75, 85, 99, 0.45)',
        };
      default:
        return {
          gradient: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
          shadowColor: 'rgba(5, 150, 105, 0.45)',
        };
    }
  };

  const handleSelectMenu = (menu: MenuKey) => {
    setActiveMenu(menu);
    setSearchParams({ menu });
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleLogout = () => {
    safeStorage.removeItem('guru_auth');
    safeStorage.removeItem('guru_token');
    safeStorage.removeItem('guru_user');
    toast.success('Berhasil keluar dari Akses Data Guru', { duration: 1200 });
    navigate('/guru/login', { replace: true });
  };

  const teacherName = currentUser?.name || 'Bapak/Ibu Guru';
  const teacherNip = currentUser?.nip || '-';
  const roleCode = currentUser?.role || 'GURU';

  const roleTitle = 
    roleCode === 'KEPALA_SEKOLAH'
      ? 'Kepala Sekolah'
      : roleCode === 'WAKIL_KURIKULUM'
      ? 'Wakasek Kurikulum'
      : roleCode === 'WAKIL_KESISWAAN'
      ? 'Wakasek Kesiswaan'
      : roleCode === 'GURU_BK'
      ? 'Guru BK'
      : currentUser?.subject || currentUser?.mapel || 'Guru Mata Pelajaran';

  const isKepsek = roleCode === 'KEPALA_SEKOLAH';
  const isKurikulum = roleCode === 'WAKIL_KURIKULUM';
  const isKesiswaan = roleCode === 'WAKIL_KESISWAAN';
  const isBk = roleCode === 'GURU_BK';
  const isWaliKelas = roleCode === 'WALI_KELAS' || Boolean(currentUser?.class && currentUser?.class !== '-' && currentUser?.class.trim() !== '');

  interface NavItem {
    id: MenuKey;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
    badge?: string;
    group: 'tugas-guru' | 'tugas-tambahan' | 'mandiri';
  }

  // Navigation Items strictly grouped and ordered as requested
  const navItems: NavItem[] = [];

  // --------------------------------------------------
  // 1. KELOMPOK: TUGAS GURU (Menu Utama Harian Guru)
  // Urutan spesifik: 1) Upload Perangkat Ajar, 2) Jadwal JP KBM, 3) Kehadiran Guru
  // --------------------------------------------------

  // 1) Perangkat Ajar (Upload Perangkat Ajar / Supervisi / Verifikasi)
  if (isKepsek) {
    navItems.push({
      id: 'perangkat-supervisi',
      label: 'Supervisi Perangkat Ajar',
      sublabel: 'Monitoring & Rekap Guru',
      icon: <LucideClipboardCheck size={19} strokeWidth={2.2} />,
      badge: 'Supervisi',
      group: 'tugas-guru'
    });
    navItems.push({
      id: 'perangkat-pengesahan',
      label: 'Validasi & Pengesahan Perangkat Ajar',
      sublabel: 'TTD Digital & QR Resmi',
      icon: <LucideAward size={19} strokeWidth={2.2} />,
      badge: 'Pengesahan',
      group: 'tugas-guru'
    });
  } else {
    navItems.push({
      id: 'perangkat-guru',
      label: 'Upload Perangkat Ajar',
      sublabel: 'Kelengkapan Modul & RPP',
      icon: <LucideUploadCloud size={19} strokeWidth={2.2} />,
      badge: 'Perangkat',
      group: 'tugas-guru'
    });
  }

  // 2) Jadwal JP KBM
  if (!isKepsek) {
    navItems.push({
      id: 'jadwal-kbm',
      label: 'Jadwal JP KBM',
      sublabel: 'Pengaturan Jam Mengajar',
      icon: <LucideCalendarClock size={19} strokeWidth={2.2} />,
      badge: 'Jadwal',
      group: 'tugas-guru'
    });
  }

  // 3) Kehadiran Guru & Rekap Jurnal KBM
  if (!isKepsek) {
    navItems.push({
      id: 'kehadiran',
      label: 'Kehadiran Guru',
      sublabel: 'Presensi KBM & Riwayat',
      icon: <LucideCalendarCheck size={19} strokeWidth={2.2} />,
      badge: 'Utama',
      group: 'tugas-guru'
    });
    navItems.push({
      id: 'rekap-jurnal-kbm',
      label: 'Rekap Jurnal KBM',
      sublabel: 'Riwayat Jurnal & Siswa Absen',
      icon: <LucideClipboardCheck size={19} strokeWidth={2.2} />,
      badge: 'Jurnal',
      group: 'tugas-guru'
    });
  }

  // --------------------------------------------------
  // 2. KELOMPOK: TUGAS TAMBAHAN (Wali Kelas, Kurikulum, Kesiswaan, Guru BK)
  // Menampung: Verifikasi Perangkat Ajar (Waka Kurikulum), Menu Wali Kelas, Monitoring Kehadiran Guru, Monitoring Jurnal KBM Guru, Monitoring Presensi Siswa, Monitoring KBM Siswa
  // --------------------------------------------------

  // 1) Verifikasi Perangkat Ajar Guru (Khusus Waka Kurikulum - posisi paling atas di Tugas Tambahan)
  if (isKurikulum) {
    navItems.push({
      id: 'perangkat-verifikasi',
      label: 'Verifikasi Perangkat Ajar Guru',
      sublabel: 'Telaah Berkas Perangkat',
      icon: <LucideFileCheck size={19} strokeWidth={2.2} />,
      badge: 'Kurikulum',
      group: 'tugas-tambahan'
    });
  }

  // Menu Wali Kelas
  if (isWaliKelas && !isKepsek && !isKurikulum) {
    navItems.push({
      id: 'wali-kelas',
      label: 'Menu Wali Kelas',
      sublabel: currentUser?.class ? `Presensi Siswa Kelas ${currentUser.class}` : 'Presensi Siswa Sesuai Kelas',
      icon: <LucideUsers size={19} strokeWidth={2.2} />,
      badge: currentUser?.class ? currentUser.class : 'Wali Kelas',
      group: 'tugas-tambahan'
    });
  }

  // Monitoring Kehadiran Guru & Monitoring Jurnal KBM Guru (Kepsek & Waka Kurikulum & Admin)
  if (isKepsek || isKurikulum || roleCode === 'admin') {
    navItems.push({
      id: 'monitoring',
      label: 'Monitoring Kehadiran Guru',
      sublabel: isKepsek ? 'Supervisi Kepala Sekolah' : 'Supervisi Kurikulum',
      icon: <LucideActivity size={19} strokeWidth={2.2} />,
      badge: 'Supervisi',
      group: 'tugas-tambahan'
    });
    navItems.push({
      id: 'monitoring-jurnal-kbm',
      label: 'Monitoring Jurnal KBM Guru',
      sublabel: isKepsek ? 'Laporan Jurnal KBM Guru' : 'Monitoring Jurnal KBM',
      icon: <LucideFileCheck size={19} strokeWidth={2.2} />,
      badge: 'Jurnal',
      group: 'tugas-tambahan'
    });
  }

  // Monitoring Presensi Siswa & Monitoring KBM Siswa (Waka Kesiswaan & Guru BK)
  if (isKesiswaan || isBk || roleCode === 'admin') {
    navItems.push({
      id: 'presensi-kesiswaan',
      label: 'Monitoring Presensi Siswa',
      sublabel: 'Rekap Seluruh Rombel',
      icon: <LucideUsers size={19} strokeWidth={2.2} />,
      badge: isKesiswaan ? 'Kesiswaan' : 'BK',
      group: 'tugas-tambahan'
    });
    navItems.push({
      id: 'monitoring-kbm-siswa',
      label: 'Monitoring KBM Siswa',
      sublabel: 'Rekap Absen KBM Siswa',
      icon: <LucideAward size={19} strokeWidth={2.2} />,
      badge: 'KBM Siswa',
      group: 'tugas-tambahan'
    });
  }

  // --------------------------------------------------
  // 3. MENU MANDIRI (Tanpa Kelompok)
  // 1) Scan Kehadiran Siswa (Khusus guru piket hari ini)
  // 2) Tugas Piket & Perizinan (persis di atas Informasi Akun)
  // 3) Informasi Akun
  // --------------------------------------------------

  if (isDutyToday) {
    navItems.push({
      id: 'scan-kehadiran-siswa',
      label: 'Scan Kehadiran Siswa',
      sublabel: 'Scan Kamera & GPS Geofence',
      icon: <LucideQrCode size={19} strokeWidth={2.2} />,
      badge: 'Piket Hari Ini',
      group: 'mandiri'
    });
  }

  if (!isKepsek) {
    navItems.push({
      id: 'piket',
      label: 'Tugas Piket & Perizinan',
      sublabel: isDutyToday ? 'Bertugas Hari Ini' : 'Perizinan Siswa',
      icon: isDutyToday ? <LucideShieldAlert size={19} strokeWidth={2.2} /> : <LucideShieldCheck size={19} strokeWidth={2.2} />,
      badge: isDutyToday ? 'Aktif' : 'Piket',
      group: 'mandiri'
    });
  }

  navItems.push({
    id: 'akun',
    label: 'Informasi Akun',
    sublabel: 'Profil & Ganti Password',
    icon: <LucideUserCircle size={19} strokeWidth={2.2} />,
    badge: 'Profil',
    group: 'mandiri'
  });

  // Ensure activeMenu is strictly in the allowed navItems for current role
  useEffect(() => {
    if (navItems.length > 0) {
      const isAllowed = navItems.some(item => item.id === activeMenu);
      if (!isAllowed) {
        const fallbackMenu = navItems[0].id;
        setActiveMenu(fallbackMenu);
        setSearchParams({ menu: fallbackMenu }, { replace: true });
      }
    }
  }, [roleCode, currentUser?.class, navItems.map(n => n.id).join(','), activeMenu]);

  // Drawer Content Component
  const drawerContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: isAquaGlass
          ? (isDarkMode ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255, 255, 255, 0.72)')
          : (isDarkMode ? '#0f172a' : '#ffffff'),
        backdropFilter: isAquaGlass ? 'blur(20px) saturate(180%)' : undefined,
        WebkitBackdropFilter: isAquaGlass ? 'blur(20px) saturate(180%)' : undefined,
        borderRight: isAquaGlass
          ? (isDarkMode ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(255, 255, 255, 0.75)')
          : `1px solid ${isDarkMode ? '#1e293b' : '#e2e8f0'}`
      }}
    >
      {/* Brand Header */}
      <Box
        sx={{
          p: desktopSidebarCollapsed ? 1.5 : 2.5,
          borderBottom: isAquaGlass
            ? (isDarkMode ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(255, 255, 255, 0.75)')
            : `1px solid ${isDarkMode ? '#1e293b' : '#f1f5f9'}`,
          bgcolor: isAquaGlass
            ? (isDarkMode ? 'rgba(15, 23, 42, 0.55)' : 'rgba(255, 255, 255, 0.60)')
            : (isDarkMode ? '#0b1120' : '#f8fafc'),
          display: 'flex',
          flexDirection: desktopSidebarCollapsed ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: desktopSidebarCollapsed ? 'center' : 'space-between',
          gap: desktopSidebarCollapsed ? 1 : 1.5,
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.28s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.15)} 0%, transparent 70%)`,
            pointerEvents: 'none'
          }}
        />

        {desktopSidebarCollapsed ? (
          <>
            <Tooltip title={`${judulGuruPortal} • ${websiteName}`} placement="right" arrow>
              {logoBase64 ? (
                <Avatar
                  src={logoBase64}
                  variant="rounded"
                  sx={{
                    width: 42,
                    height: 42,
                    bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
                    border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    cursor: 'pointer'
                  }}
                  onClick={toggleDesktopSidebar}
                />
              ) : (
                <Avatar
                  variant="rounded"
                  onClick={toggleDesktopSidebar}
                  sx={{
                    width: 42,
                    height: 42,
                    bgcolor: theme.palette.primary.main,
                    color: '#ffffff',
                    boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.4)}`,
                    cursor: 'pointer'
                  }}
                >
                  <LucideSchool size={20} strokeWidth={2.2} />
                </Avatar>
              )}
            </Tooltip>
            <Tooltip title="Buka Bilah Menu (Sidebar)" placement="right" arrow>
              <IconButton
                size="small"
                onClick={toggleDesktopSidebar}
                sx={{
                  color: isDarkMode ? '#cbd5e1' : '#475569',
                  bgcolor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
                  border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.12)' : '#e2e8f0'}`,
                  p: 0.6,
                  borderRadius: 2,
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    bgcolor: isDarkMode ? 'rgba(255,255,255,0.16)' : alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main
                  }
                }}
              >
                <LucideChevronRight size={18} />
              </IconButton>
            </Tooltip>
          </>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
              {logoBase64 ? (
                <Avatar
                  src={logoBase64}
                  variant="rounded"
                  sx={{
                    width: 44,
                    height: 44,
                    bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
                    border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    flexShrink: 0
                  }}
                />
              ) : (
                <Avatar
                  variant="rounded"
                  sx={{
                    width: 44,
                    height: 44,
                    bgcolor: theme.palette.primary.main,
                    color: '#ffffff',
                    boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.4)}`,
                    flexShrink: 0
                  }}
                >
                  <LucideSchool size={22} strokeWidth={2.2} />
                </Avatar>
              )}
              <Box sx={{ overflow: 'hidden', minWidth: 0 }}>
                <Typography
                  variant="subtitle1"
                  noWrap
                  sx={{
                    fontWeight: 800,
                    color: isDarkMode ? '#f8fafc' : '#0f172a',
                    lineHeight: 1.2,
                    letterSpacing: -0.2
                  }}
                >
                  {judulGuruPortal}
                </Typography>
                <Typography
                  variant="caption"
                  noWrap
                  sx={{ color: theme.palette.primary.main, fontWeight: 700, display: 'block' }}
                >
                  {websiteName}
                </Typography>
              </Box>
            </Box>
            <Tooltip title="Tutup Bilah Menu (Sidebar)" placement="bottom" arrow>
              <IconButton
                size="small"
                onClick={toggleDesktopSidebar}
                sx={{
                  color: isDarkMode ? '#cbd5e1' : '#475569',
                  bgcolor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
                  border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.12)' : '#e2e8f0'}`,
                  p: 0.6,
                  borderRadius: 2,
                  flexShrink: 0,
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    bgcolor: isDarkMode ? 'rgba(255,255,255,0.16)' : alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main
                  }
                }}
              >
                <LucideChevronLeft size={18} />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Box>

      {/* User Info Card in Sidebar (Layered 3D Depth or Compact Status) */}
      {desktopSidebarCollapsed ? (
        <Tooltip
          title={
            <Box sx={{ p: 0.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{teacherName}</Typography>
              <Typography variant="caption" sx={{ display: 'block', opacity: 0.85 }}>{roleTitle}</Typography>
              <Typography variant="caption" sx={{ display: 'block', opacity: 0.75, mt: 0.3 }}>NIP: {teacherNip !== '-' ? teacherNip : 'Non-NIP'}</Typography>
              <Box sx={{ mt: 0.8 }}>
                <Chip
                  label={isDutyToday ? 'Piket Hari Ini' : 'Online'}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    bgcolor: isDutyToday ? '#fef3c7' : '#dcfce7',
                    color: isDutyToday ? '#b45309' : '#15803d'
                  }}
                />
              </Box>
            </Box>
          }
          placement="right"
          arrow
        >
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <Box sx={{ position: 'relative' }}>
              <Avatar
                sx={{
                  width: 44,
                  height: 44,
                  bgcolor: theme.palette.primary.main,
                  fontWeight: 800,
                  color: '#ffffff',
                  fontSize: '1.15rem',
                  boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.4)}`,
                  border: '2px solid rgba(255,255,255,0.85)'
                }}
              >
                {teacherName.charAt(0).toUpperCase()}
              </Avatar>
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: isDutyToday ? theme.palette.primary.main : '#16a34a',
                  border: '2px solid #ffffff',
                  boxShadow: isDutyToday ? `0 0 6px ${theme.palette.primary.main}` : '0 0 6px #22c55e'
                }}
              />
            </Box>
          </Box>
        </Tooltip>
      ) : (
        <Box
          sx={{
            p: 2,
            m: 1.5,
            borderRadius: 3.5,
            background: isDarkMode
              ? 'linear-gradient(145deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.95) 100%)'
              : `linear-gradient(145deg, #ffffff 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : alpha(theme.palette.primary.main, 0.2)}`,
            boxShadow: isDarkMode
              ? '0 10px 25px -5px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)'
              : `0 10px 25px -5px ${alpha(theme.palette.primary.main, 0.12)}, 0 4px 6px -2px rgba(0,0,0,0.04), inset 0 1px 2px #ffffff`,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <Avatar
              sx={{
                width: 44,
                height: 44,
                bgcolor: theme.palette.primary.main,
                fontWeight: 800,
                color: '#ffffff',
                fontSize: '1.15rem',
                boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.4)}`,
                border: '2px solid rgba(255,255,255,0.85)'
              }}
            >
              {teacherName.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
              <Typography
                variant="body2"
                noWrap
                sx={{ fontWeight: 800, color: isDarkMode ? '#f8fafc' : '#0f172a', lineHeight: 1.2 }}
              >
                {teacherName}
              </Typography>
              <Typography
                variant="caption"
                noWrap
                sx={{ color: isDarkMode ? '#94a3b8' : '#64748b', display: 'block', fontSize: '0.73rem', fontWeight: 500 }}
              >
                {roleTitle}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 1.2, borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : alpha(theme.palette.primary.main, 0.15) }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ color: isDarkMode ? '#94a3b8' : '#64748b', fontWeight: 600, fontSize: '0.7rem' }}>
              NIP: {teacherNip !== '-' ? teacherNip : 'Non-NIP'}
            </Typography>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.6,
                px: 1,
                py: 0.3,
                borderRadius: 2,
                bgcolor: isDutyToday
                  ? alpha(theme.palette.primary.main, 0.15)
                  : (isDarkMode ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7'),
                border: `1px solid ${isDutyToday ? alpha(theme.palette.primary.main, 0.3) : '#86efac'}`
              }}
            >
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: isDutyToday ? theme.palette.primary.main : '#16a34a',
                  boxShadow: isDutyToday
                    ? `0 0 8px ${theme.palette.primary.main}`
                    : '0 0 8px #22c55e'
                }}
              />
              <Typography
                component="span"
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  color: isDutyToday
                    ? theme.palette.primary.main
                    : (isDarkMode ? '#4ade80' : '#15803d')
                }}
              >
                {isDutyToday ? 'Piket Hari Ini' : 'Online'}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ mt: 1, pt: 0.8, borderTop: isDarkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="caption" sx={{ fontSize: '0.68rem', fontWeight: 700, color: isDarkMode ? '#94a3b8' : '#64748b' }}>
              Periode Aktif:
            </Typography>
            <Chip
              icon={<CalendarMonthIcon sx={{ fontSize: '11px !important' }} />}
              size="small"
              label={`T.A. ${activePeriod.tahun_ajaran} (${activePeriod.semester})`}
              sx={{
                height: 20,
                fontSize: '0.62rem',
                fontWeight: 800,
                bgcolor: isDarkMode ? 'rgba(59,130,246,0.18)' : '#eff6ff',
                color: isDarkMode ? '#93c5fd' : '#2563eb',
                border: `1px solid ${isDarkMode ? 'rgba(59,130,246,0.3)' : '#bfdbfe'}`
              }}
            />
          </Box>
        </Box>
      )}

      {/* Sidebar Navigation */}
      <Box sx={{ flex: 1, px: desktopSidebarCollapsed ? 1 : 1.5, py: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {(() => {
          const tugasGuruItems = navItems.filter(i => i.group === 'tugas-guru');
          const tugasTambahanItems = navItems.filter(i => i.group === 'tugas-tambahan');
          const mandiriItems = navItems.filter(i => i.group === 'mandiri');

          const renderNavItem = (item: NavItem) => {
            const isSelected = activeMenu === item.id;

            if (desktopSidebarCollapsed) {
              return (
                <ListItem key={item.id} disablePadding sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Tooltip
                    title={
                      <Box sx={{ p: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.82rem' }}>
                          {item.label}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', opacity: 0.85, fontSize: '0.7rem' }}>
                          {item.sublabel}
                        </Typography>
                        {item.badge && (
                          <Chip
                            label={item.badge}
                            size="small"
                            sx={{
                              mt: 0.6,
                              height: 18,
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              bgcolor: alpha(theme.palette.primary.main, 0.15),
                              color: theme.palette.primary.main
                            }}
                          />
                        )}
                      </Box>
                    }
                    placement="right"
                    arrow
                  >
                    <ListItemButton
                      id={`nav-guru-mini-${item.id}`}
                      selected={isSelected}
                      onClick={() => handleSelectMenu(item.id)}
                      sx={{
                        borderRadius: 2.5,
                        width: 48,
                        height: 48,
                        p: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 48,
                        transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: isSelected
                          ? '1px solid rgba(255,255,255,0.25)'
                          : '1px solid transparent',
                        bgcolor: isSelected ? `${theme.palette.primary.main} !important` : 'transparent',
                        color: isSelected ? '#ffffff' : (isDarkMode ? '#cbd5e1' : '#334155'),
                        boxShadow: isSelected
                          ? `0 6px 16px -2px ${alpha(theme.palette.primary.main, 0.45)}`
                          : 'none',
                        '&:hover': {
                          bgcolor: isSelected
                            ? `${theme.palette.primary.dark} !important`
                            : (isDarkMode ? 'rgba(255,255,255,0.08)' : alpha(theme.palette.primary.main, 0.08)),
                          transform: 'translateY(-1px)'
                        },
                        '&:active': { transform: 'scale(0.95)' }
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isSelected ? '#ffffff' : theme.palette.primary.main
                        }}
                      >
                        {item.icon}
                      </Box>
                    </ListItemButton>
                  </Tooltip>
                </ListItem>
              );
            }

            return (
              <ListItem key={item.id} disablePadding>
                <ListItemButton
                  id={`nav-guru-${item.id}`}
                  selected={isSelected}
                  onClick={() => handleSelectMenu(item.id)}
                  sx={{
                    borderRadius: 2.5,
                    py: 1.1,
                    px: 1.3,
                    transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
                    border: isSelected
                      ? '1px solid rgba(255,255,255,0.25)'
                      : `1px solid transparent`,
                    bgcolor: isSelected ? `${theme.palette.primary.main} !important` : 'transparent',
                    color: isSelected ? '#ffffff' : (isDarkMode ? '#cbd5e1' : '#334155'),
                    transform: isSelected ? 'translateY(-1.5px)' : 'none',
                    boxShadow: isSelected
                      ? `0 8px 20px -2px ${alpha(theme.palette.primary.main, 0.42)}, 0 3px 6px -1px ${alpha(theme.palette.primary.main, 0.25)}`
                      : 'none',
                    '&:hover': {
                      transform: isSelected ? 'translateY(-1.5px)' : 'translateY(-1px)',
                      bgcolor: isSelected
                        ? `${theme.palette.primary.dark} !important`
                        : (isDarkMode ? 'rgba(255,255,255,0.06)' : alpha(theme.palette.primary.main, 0.06)),
                      borderColor: isSelected
                        ? 'rgba(255,255,255,0.3)'
                        : alpha(theme.palette.primary.main, 0.2)
                    },
                    '&:active': {
                      transform: 'scale(0.98)'
                    }
                  }}
                >
                  <Box
                    sx={{
                      minWidth: 34,
                      width: 34,
                      height: 34,
                      mr: 1.3,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: isSelected
                        ? 'rgba(255,255,255,0.22)'
                        : (isDarkMode ? 'rgba(255,255,255,0.06)' : alpha(theme.palette.primary.main, 0.08)),
                      color: isSelected ? '#ffffff' : theme.palette.primary.main,
                      transition: 'all 0.2s ease',
                      flexShrink: 0
                    }}
                  >
                    {item.icon}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0, mr: 0.5 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: '0.86rem',
                        fontWeight: isSelected ? 800 : 600,
                        color: isSelected ? '#ffffff' : (isDarkMode ? '#f1f5f9' : '#1e293b'),
                        letterSpacing: '-0.01em',
                        lineHeight: 1.25,
                        whiteSpace: 'normal',
                        wordBreak: 'break-word'
                      }}
                    >
                      {item.label}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '0.71rem',
                        display: 'block',
                        color: isSelected ? 'rgba(255,255,255,0.85)' : (isDarkMode ? '#94a3b8' : '#64748b'),
                        lineHeight: 1.2,
                        mt: 0.2
                      }}
                    >
                      {item.sublabel}
                    </Typography>
                  </Box>
                  {item.badge && (
                    <Chip
                      label={item.badge}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.64rem',
                        fontWeight: 800,
                        bgcolor: isSelected
                          ? 'rgba(255,255,255,0.25)'
                          : (isDarkMode ? 'rgba(255,255,255,0.08)' : '#f1f5f9'),
                        color: isSelected ? '#ffffff' : (isDarkMode ? '#cbd5e1' : '#475569'),
                        border: isSelected ? 'none' : `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                        ml: 'auto',
                        flexShrink: 0
                      }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            );
          };

          if (desktopSidebarCollapsed || isKepsek) {
            return (
              <List sx={{ p: 0, mt: 0.5, gap: 0.8, display: 'flex', flexDirection: 'column' }}>
                {navItems.map(renderNavItem)}
              </List>
            );
          }

          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {/* GRUP 1: TUGAS GURU */}
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    display: 'block',
                    fontWeight: 800,
                    color: isDarkMode ? '#38bdf8' : '#0284c7',
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                    fontSize: '0.68rem'
                  }}
                >
                  Tugas Guru
                </Typography>
                <List sx={{ p: 0, mt: 0.5, gap: 0.6, display: 'flex', flexDirection: 'column' }}>
                  {tugasGuruItems.map(renderNavItem)}
                </List>
              </Box>

              {/* GRUP 2: TUGAS TAMBAHAN */}
              {tugasTambahanItems.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      display: 'block',
                      fontWeight: 800,
                      color: isDarkMode ? '#a78bfa' : '#7c3aed',
                      letterSpacing: 0.6,
                      textTransform: 'uppercase',
                      fontSize: '0.68rem'
                    }}
                  >
                    Tugas Tambahan
                  </Typography>
                  <List sx={{ p: 0, mt: 0.5, gap: 0.6, display: 'flex', flexDirection: 'column' }}>
                    {tugasTambahanItems.map(renderNavItem)}
                  </List>
                </Box>
              )}

              {/* GRUP 3: MENU MANDIRI (Tugas Piket & Perizinan, Informasi Akun) */}
              {mandiriItems.length > 0 && (
                <Box sx={{ mt: 1, pt: 1, borderTop: `1px dashed ${isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}` }}>
                  <List sx={{ p: 0, gap: 0.6, display: 'flex', flexDirection: 'column' }}>
                    {mandiriItems.map(renderNavItem)}
                  </List>
                </Box>
              )}
            </Box>
          );
        })()}
      </Box>

      {/* Footer / Logout in Sidebar */}
      <Box sx={{ p: desktopSidebarCollapsed ? 1.5 : 2, borderTop: `1px solid ${isDarkMode ? '#1e293b' : '#f1f5f9'}`, bgcolor: isDarkMode ? '#0b1120' : '#f8fafc', display: 'flex', justifyContent: 'center' }}>
        {desktopSidebarCollapsed ? (
          <Tooltip title="Keluar dari Akun" placement="right" arrow>
            <IconButton
              id="btn-guru-logout-mini"
              color="error"
              onClick={() => setLogoutDialogOpen(true)}
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2.5,
                bgcolor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  bgcolor: isDarkMode ? 'rgba(239, 68, 68, 0.25)' : '#fee2e2',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
                },
                '&:active': { transform: 'scale(0.95)' }
              }}
            >
              <LucideLogOut size={18} strokeWidth={2.2} />
            </IconButton>
          </Tooltip>
        ) : (
          <Button
            id="btn-guru-logout"
            fullWidth
            variant="outlined"
            color="error"
            startIcon={<LucideLogOut size={16} strokeWidth={2.2} />}
            onClick={() => setLogoutDialogOpen(true)}
            sx={{
              py: 1.1,
              borderRadius: 2.5,
              fontWeight: 700,
              textTransform: 'none',
              fontSize: '0.85rem',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-1.5px)',
                boxShadow: '0 6px 16px rgba(239, 68, 68, 0.25)'
              },
              '&:active': {
                transform: 'scale(0.98)'
              }
            }}
          >
            Keluar dari Akun
          </Button>
        )}
      </Box>
    </Box>
  );

  const getMainRoleMenuId = (): MenuKey => {
    if (isKepsek || isKurikulum || roleCode === 'admin') return 'monitoring';
    if (isKesiswaan || isBk) return 'presensi-kesiswaan';
    return 'kehadiran';
  };

  const getSecondaryRoleMenuId = (): MenuKey => {
    if (isKepsek) return 'perangkat-pengesahan';
    if (isKurikulum) return isWaliKelas ? 'wali-kelas' : 'kehadiran';
    if (isKesiswaan || isBk) return 'kehadiran';
    if (isWaliKelas) return 'wali-kelas';
    return 'piket';
  };

  const getPerangkatMenuId = (): MenuKey => {
    if (isKepsek) return 'perangkat-supervisi';
    if (isKurikulum) return 'perangkat-verifikasi';
    return 'perangkat-guru';
  };

  const renderActiveMenuComponent = () => {
    if (activeMenu === 'monitoring' && (isKepsek || isKurikulum || roleCode === 'admin')) {
      return <TeacherAttendanceReports isEmbedded={true} />;
    }
    if (activeMenu === 'monitoring-jurnal-kbm' && (isKepsek || isKurikulum || roleCode === 'admin')) {
      return <RekapJurnalKbm isMonitoring={true} showTeacherFilter={true} />;
    }
    if (activeMenu === 'presensi-kesiswaan' && (isKesiswaan || isBk || roleCode === 'admin')) {
      return (
        <WaliKelas
          currentUser={currentUser}
          forcePrivilegedMode={true}
          titleOverride="Monitoring Presensi Siswa"
        />
      );
    }
    if (activeMenu === 'monitoring-kbm-siswa' && (isKesiswaan || isBk || roleCode === 'admin')) {
      return <MonitoringKbmSiswa />;
    }
    if (activeMenu === 'wali-kelas' && isWaliKelas && !isKepsek) {
      return (
        <WaliKelas
          currentUser={currentUser}
          forcePrivilegedMode={false}
          titleOverride="Menu Wali Kelas"
        />
      );
    }
    if (activeMenu === 'kehadiran' && !isKepsek) {
      return <RealtimeTeacherAttendance isEmbedded={true} />;
    }
    if (activeMenu === 'rekap-jurnal-kbm' && !isKepsek) {
      return <RekapJurnalKbm isMonitoring={false} showTeacherFilter={false} />;
    }
    if (activeMenu === 'jadwal-kbm' && !isKepsek) {
      return <JadwalKbmGuru currentUser={currentUser} />;
    }
    if (activeMenu === 'scan-kehadiran-siswa') {
      return (
        <ScanKehadiranSiswaMobile
          currentUser={currentUser}
          isDutyToday={isDutyToday}
          teacherDutyInfo={teacherDutyInfo}
          onBack={() => {
            setActiveMenu('kehadiran');
            setSearchParams({ menu: 'kehadiran' });
          }}
        />
      );
    }
    if (activeMenu === 'piket' && !isKepsek) {
      return (
        <GuruPiketIzinSection
          currentUser={currentUser}
          isDutyToday={isDutyToday}
          teacherDutyInfo={teacherDutyInfo}
          currentDayName={currentDayName}
        />
      );
    }
    if (activeMenu === 'perangkat-guru') {
      return <PerangkatGuruView currentUser={currentUser} />;
    }
    if (activeMenu === 'perangkat-verifikasi' && (isKurikulum || roleCode === 'admin')) {
      return <PerangkatKurikulumView initialTab={0} />;
    }
    if (activeMenu === 'perangkat-setting' && (isKurikulum || roleCode === 'admin')) {
      return <PerangkatKurikulumView initialTab={1} />;
    }
    if (activeMenu === 'perangkat-supervisi' && (isKepsek || roleCode === 'admin')) {
      return <PerangkatKepsekView initialTab={0} currentUser={currentUser} />;
    }
    if (activeMenu === 'perangkat-pengesahan' && (isKepsek || roleCode === 'admin')) {
      return <PerangkatKepsekView initialTab={1} currentUser={currentUser} />;
    }
    if (activeMenu === 'akun') {
      return (
        <GuruAccountInfoSection
          currentUser={currentUser}
          teacherPiketInfo={teacherDutyInfo}
        />
      );
    }
    return null;
  };

  const monthsIndo = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: isAquaGlass ? 'transparent' : '#f8fafc' }}>
      {/* ==========================================
          1. TAMPILAN MOBILE SMARTPHONE (< 768px / md:hidden)
          Redesain Gaya Mobile Banking Modern & macOS Aqua Glass
         ========================================== */}
      <Box
        sx={{
          display: { xs: 'block', md: 'none' },
          pb: isAquaGlass ? '90px' : '68px',
          minHeight: '100vh',
          bgcolor: isAquaGlass ? 'transparent' : (isDarkMode ? '#0f172a' : '#f8fafc'),
          color: isDarkMode ? '#f8fafc' : '#0f172a',
          overscrollBehavior: 'none',
          position: 'relative'
        }}
      >
        {/* A. HEADER PERSONAL MOBILE BANKING (Sticky Glass Header) */}
        <Box
          sx={{
            px: 1.8,
            py: 1.2,
            bgcolor: isAquaGlass
              ? (isDarkMode ? 'rgba(15, 23, 42, 0.60)' : 'rgba(255, 255, 255, 0.65)')
              : (isDarkMode ? '#0f172a' : '#ffffff'),
            borderBottom: isAquaGlass
              ? (isDarkMode ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(255, 255, 255, 0.75)')
              : `1px solid ${isDarkMode ? 'rgba(51, 65, 85, 0.7)' : '#f1f5f9'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 40,
            boxShadow: isAquaGlass
              ? (isDarkMode ? '0 8px 32px 0 rgba(0, 0, 0, 0.45)' : '0 8px 24px -4px rgba(2, 132, 199, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.8)')
              : (isDarkMode ? '0 4px 20px rgba(0,0,0,0.4)' : '0 2px 10px rgba(15,23,42,0.03)'),
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0, flex: 1 }}>
            <Avatar
              sx={{
                width: 38,
                height: 38,
                background: isAquaGlass
                  ? 'linear-gradient(135deg, #0284c7 0%, #059669 100%)'
                  : theme.palette.primary.main,
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '1.05rem',
                boxShadow: isAquaGlass
                  ? '0 4px 14px rgba(2, 132, 199, 0.45), inset 0 1px 2px rgba(255,255,255,0.6)'
                  : `0 3px 10px ${alpha(theme.palette.primary.main, 0.35)}`,
                border: isAquaGlass
                  ? '1.5px solid rgba(255, 255, 255, 0.85)'
                  : (isDarkMode ? '1.5px solid rgba(255,255,255,0.15)' : '1.5px solid #ffffff'),
                flexShrink: 0
              }}
            >
              {teacherName.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  color: isDarkMode ? '#94a3b8' : (isAquaGlass ? '#1e293b' : '#64748b'),
                  fontWeight: isAquaGlass ? 700 : 600,
                  display: 'block',
                  lineHeight: 1.1,
                  fontSize: '0.7rem'
                }}
              >
                {getGreeting()} 👋
              </Typography>
              <Typography
                variant="subtitle2"
                noWrap
                sx={{
                  fontWeight: 900,
                  color: isDarkMode ? '#f8fafc' : '#0f172a',
                  lineHeight: 1.2,
                  fontSize: '0.88rem'
                }}
              >
                {teacherName}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', mt: 0.2 }}>
                <Chip
                  label={roleTitle}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    bgcolor: isAquaGlass
                      ? (isDarkMode ? 'rgba(56, 189, 248, 0.18)' : 'rgba(2, 132, 199, 0.12)')
                      : (isDarkMode ? 'rgba(59, 130, 246, 0.18)' : alpha(theme.palette.primary.main, 0.12)),
                    color: isAquaGlass
                      ? (isDarkMode ? '#7dd3fc' : '#0284c7')
                      : (isDarkMode ? '#93c5fd' : theme.palette.primary.main),
                    border: isAquaGlass
                      ? (isDarkMode ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid rgba(2, 132, 199, 0.3)')
                      : `1px solid ${isDarkMode ? 'rgba(59, 130, 246, 0.3)' : alpha(theme.palette.primary.main, 0.25)}`,
                    backdropFilter: isAquaGlass ? 'blur(10px)' : undefined
                  }}
                />
                <Chip
                  icon={<CalendarMonthIcon sx={{ fontSize: '11px !important' }} />}
                  label={`T.A. ${activePeriod.tahun_ajaran} (${activePeriod.semester})`}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    bgcolor: isAquaGlass
                      ? (isDarkMode ? 'rgba(52, 211, 153, 0.18)' : 'rgba(16, 185, 129, 0.12)')
                      : (isDarkMode ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7'),
                    color: isAquaGlass
                      ? (isDarkMode ? '#6ee7b7' : '#047857')
                      : (isDarkMode ? '#4ade80' : '#15803d'),
                    border: isAquaGlass
                      ? (isDarkMode ? '1px solid rgba(52, 211, 153, 0.35)' : '1px solid rgba(16, 185, 129, 0.3)')
                      : `1px solid ${isDarkMode ? 'rgba(34, 197, 94, 0.3)' : '#86efac'}`,
                    backdropFilter: isAquaGlass ? 'blur(10px)' : undefined
                  }}
                />
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexShrink: 0 }}>
            <Tooltip title={isDarkMode ? 'Mode Terang' : 'Mode Gelap'}>
              <IconButton
                onClick={toggleThemeMode}
                size="small"
                sx={{
                  bgcolor: isAquaGlass
                    ? (isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.75)')
                    : (isDarkMode ? '#1e293b' : '#f8fafc'),
                  color: isDarkMode ? '#fbbf24' : '#0284c7',
                  border: isAquaGlass
                    ? (isDarkMode ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.9)')
                    : `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                  p: 0.8,
                  borderRadius: 2,
                  boxShadow: isAquaGlass ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                  '&:active': { transform: 'scale(0.92)' }
                }}
              >
                {isDarkMode ? <LightModeIcon sx={{ fontSize: 18 }} /> : <DarkModeIcon sx={{ fontSize: 18 }} />}
              </IconButton>
            </Tooltip>

            <Tooltip title="Keluar">
              <IconButton
                color="error"
                size="small"
                onClick={() => setLogoutDialogOpen(true)}
                sx={{
                  bgcolor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
                  border: `1px solid ${isDarkMode ? 'rgba(239, 68, 68, 0.3)' : '#fee2e2'}`,
                  p: 0.8,
                  borderRadius: 2,
                  transition: 'all 0.15s ease',
                  '&:active': { transform: 'scale(0.92)' }
                }}
              >
                <LogoutIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* CONDITION: BERANDA HOME MOBILE DASHBOARD */}
        {mobileTab === 'home' ? (
          <Box sx={{ overscrollBehavior: 'none' }}>
            {/* B. KARTU RINGKASAN UTAMA (GAYA KARTU SALDO REKENING 3D) */}
            <Box sx={{ px: 1.5, pt: 1.5, pb: 0.5 }}>
              <Box
                sx={{
                  p: { xs: 1.6, sm: 2 },
                  borderRadius: 3,
                  background: isAquaGlass
                    ? (isDarkMode
                        ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.65) 0%, rgba(6, 78, 59, 0.40) 50%, rgba(12, 74, 110, 0.45) 100%)'
                        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.68) 0%, rgba(240, 253, 250, 0.62) 50%, rgba(204, 251, 241, 0.58) 100%)')
                    : (isKepsek || isKurikulum
                        ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)'
                        : 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #0d9488 100%)'),
                  color: isAquaGlass ? (isDarkMode ? '#ffffff' : '#0f172a') : '#ffffff',
                  border: isAquaGlass ? (isDarkMode ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(255, 255, 255, 0.85)') : undefined,
                  boxShadow: isAquaGlass
                    ? (isDarkMode ? '0 10px 30px -4px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.15)' : '0 10px 30px -4px rgba(2, 132, 199, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.9)')
                    : '0 8px 20px -3px rgba(15, 23, 42, 0.3), inset 0 1px 1px rgba(255,255,255,0.2)',
                  backdropFilter: isAquaGlass ? 'blur(20px) saturate(180%)' : undefined,
                  WebkitBackdropFilter: isAquaGlass ? 'blur(20px) saturate(180%)' : undefined,
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Visual Glassmorphism Background Circles */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: -25,
                    right: -25,
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)',
                    pointerEvents: 'none'
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: -35,
                    left: -20,
                    width: 140,
                    height: 140,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 70%)',
                    pointerEvents: 'none'
                  }}
                />

                {/* Card Top Label */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, position: 'relative', zIndex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    <SchoolIcon sx={{ fontSize: 16, opacity: 0.95, color: isAquaGlass ? (isDarkMode ? '#38bdf8' : '#0284c7') : 'inherit' }} />
                    <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 900, opacity: 0.95, fontSize: '0.65rem', color: isAquaGlass ? (isDarkMode ? '#38bdf8' : '#0369a1') : 'inherit' }}>
                      {isKepsek || isKurikulum ? 'SUPERVISI KEHADIRAN & KBM' : 'PENUGASAN KBM HARI INI'}
                    </Typography>
                  </Box>
                  <Chip
                    label={currentDayName ? `${currentDayName}, ${new Date().getDate()} ${monthsIndo[new Date().getMonth()]}` : 'Hari Ini'}
                    size="small"
                    sx={{
                      height: 20,
                      bgcolor: isAquaGlass ? (isDarkMode ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.12)') : 'rgba(255,255,255,0.2)',
                      color: isAquaGlass ? (isDarkMode ? '#7dd3fc' : '#0369a1') : '#ffffff',
                      backdropFilter: 'blur(6px)',
                      border: isAquaGlass ? (isDarkMode ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(2, 132, 199, 0.25)') : '1px solid rgba(255,255,255,0.25)',
                      fontSize: '0.62rem',
                      fontWeight: 800
                    }}
                  />
                </Box>

                {/* Card Main Stat */}
                <Box sx={{ mb: 1, position: 'relative', zIndex: 1 }}>
                  {isKepsek || isKurikulum ? (
                    <Box>
                      <Typography variant="caption" sx={{ color: isAquaGlass ? (isDarkMode ? '#94a3b8' : '#334155') : 'inherit', opacity: isAquaGlass ? 1 : 0.85, display: 'block', fontSize: '0.68rem', fontWeight: isAquaGlass ? 700 : 600 }}>
                        Keterisian KBM Sekolah Hari Ini
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.8, mt: 0.3 }}>
                        <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.5, fontSize: { xs: '1.35rem', sm: '1.6rem' }, color: isAquaGlass ? (isDarkMode ? '#f8fafc' : '#0f172a') : 'inherit' }}>
                          {mobileSummary.kbmTodayCount > 0
                            ? `${Math.round((mobileSummary.kbmFilledCount / mobileSummary.kbmTodayCount) * 100)}%`
                            : '100%'}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: isAquaGlass ? 1 : 0.95, fontWeight: 700, fontSize: '0.75rem', color: isAquaGlass ? (isDarkMode ? '#cbd5e1' : '#334155') : 'inherit' }}>
                          ({mobileSummary.kbmFilledCount}/{mobileSummary.kbmTodayCount || 0} KBM Terisi)
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    <Box>
                      <Typography variant="caption" sx={{ color: isAquaGlass ? (isDarkMode ? '#94a3b8' : '#334155') : 'inherit', opacity: isAquaGlass ? 1 : 0.85, display: 'block', fontSize: '0.68rem', fontWeight: isAquaGlass ? 700 : 600 }}>
                        Jadwal Mengajar Hari Ini
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.8, mt: 0.3 }}>
                        <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.5, fontSize: { xs: '1.35rem', sm: '1.6rem' }, color: isAquaGlass ? (isDarkMode ? '#f8fafc' : '#0f172a') : 'inherit' }}>
                          {mobileSummary.guruJpToday > 0 ? `${mobileSummary.guruJpToday} JP` : '0 JP'}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: isAquaGlass ? 1 : 0.95, fontWeight: 700, fontSize: '0.75rem', color: isAquaGlass ? (isDarkMode ? '#cbd5e1' : '#334155') : 'inherit' }}>
                          ({mobileSummary.guruFilledJp} Kelas Presensi Terisi)
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Box>

                <Divider sx={{ borderColor: isAquaGlass ? (isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)') : 'rgba(255,255,255,0.2)', my: 1, position: 'relative', zIndex: 1 }} />

                {/* Card Bottom Grid */}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.8, position: 'relative', zIndex: 1, textAlign: 'center' }}>
                  {isKepsek || isKurikulum ? (
                    <>
                      <Box>
                        <Typography variant="caption" sx={{ color: isAquaGlass ? (isDarkMode ? '#94a3b8' : '#475569') : 'inherit', opacity: isAquaGlass ? 1 : 0.75, display: 'block', fontSize: '0.62rem', fontWeight: 700 }}>
                          Total Rombel
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 900, fontSize: '0.8rem', color: isAquaGlass ? (isDarkMode ? '#f8fafc' : '#0f172a') : 'inherit' }}>
                          {mobileSummary.totalRombel || '-'} Kelas
                        </Typography>
                      </Box>
                      <Box sx={{ borderLeft: isAquaGlass ? (isDarkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(15,23,42,0.12)') : '1px solid rgba(255,255,255,0.2)', borderRight: isAquaGlass ? (isDarkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(15,23,42,0.12)') : '1px solid rgba(255,255,255,0.2)' }}>
                        <Typography variant="caption" sx={{ color: isAquaGlass ? (isDarkMode ? '#94a3b8' : '#475569') : 'inherit', opacity: isAquaGlass ? 1 : 0.75, display: 'block', fontSize: '0.62rem', fontWeight: 700 }}>
                          KBM Terisi
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 900, fontSize: '0.8rem', color: isAquaGlass ? (isDarkMode ? '#f8fafc' : '#0f172a') : 'inherit' }}>
                          {mobileSummary.kbmFilledCount} Sesi
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: isAquaGlass ? (isDarkMode ? '#94a3b8' : '#475569') : 'inherit', opacity: isAquaGlass ? 1 : 0.75, display: 'block', fontSize: '0.62rem', fontWeight: 700 }}>
                          Akumulasi JP
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 900, fontSize: '0.8rem', color: isAquaGlass ? (isDarkMode ? '#f8fafc' : '#0f172a') : 'inherit' }}>
                          {mobileSummary.totalJpToday} JP
                        </Typography>
                      </Box>
                    </>
                  ) : (
                    <>
                      <Box>
                        <Typography variant="caption" sx={{ color: isAquaGlass ? (isDarkMode ? '#94a3b8' : '#475569') : 'inherit', opacity: isAquaGlass ? 1 : 0.75, display: 'block', fontSize: '0.62rem', fontWeight: 700 }}>
                          KBM Terabsen
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 900, fontSize: '0.8rem', color: isAquaGlass ? (isDarkMode ? '#f8fafc' : '#0f172a') : 'inherit' }}>
                          {mobileSummary.guruFilledJp} Kelas
                        </Typography>
                      </Box>
                      <Box sx={{ borderLeft: isAquaGlass ? (isDarkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(15,23,42,0.12)') : '1px solid rgba(255,255,255,0.2)', borderRight: isAquaGlass ? (isDarkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(15,23,42,0.12)') : '1px solid rgba(255,255,255,0.2)' }}>
                        <Typography variant="caption" sx={{ color: isAquaGlass ? (isDarkMode ? '#94a3b8' : '#475569') : 'inherit', opacity: isAquaGlass ? 1 : 0.75, display: 'block', fontSize: '0.62rem', fontWeight: 700 }}>
                          Status Piket
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 900, fontSize: '0.8rem', color: isAquaGlass ? (isDarkMode ? '#f8fafc' : '#0f172a') : 'inherit' }}>
                          {isDutyToday ? 'Bertugas' : 'Tidak Ada'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: isAquaGlass ? (isDarkMode ? '#94a3b8' : '#475569') : 'inherit', opacity: isAquaGlass ? 1 : 0.75, display: 'block', fontSize: '0.62rem', fontWeight: 700 }}>
                          Kelas Wali
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 900, fontSize: '0.8rem', color: isAquaGlass ? (isDarkMode ? '#f8fafc' : '#0f172a') : 'inherit' }}>
                          {currentUser?.class || '-'}
                        </Typography>
                      </Box>
                    </>
                  )}
                </Box>
              </Box>
            </Box>

            {/* Piket Quick Action Banner (If duty today) */}
            {isDutyToday && (
              <Box sx={{ px: 1.5, pt: 1 }}>
                <Box
                  onClick={() => {
                    handleSelectMenu('scan-kehadiran-siswa');
                    setMobileTab('menu');
                  }}
                  className={isAquaGlass ? "frosted-aqua-banner" : undefined}
                  sx={{
                    p: 1.8,
                    borderRadius: 3,
                    background: isAquaGlass
                      ? (isDarkMode
                          ? 'linear-gradient(135deg, rgba(6, 78, 59, 0.5) 0%, rgba(12, 74, 110, 0.55) 100%)'
                          : 'linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(14, 165, 233, 0.26) 100%)')
                      : 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                    color: isAquaGlass ? (isDarkMode ? '#ffffff' : '#0f172a') : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: isAquaGlass
                      ? (isDarkMode ? '0 10px 30px -5px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.15)' : '0 10px 30px -5px rgba(16, 185, 129, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.9)')
                      : '0 8px 20px -4px rgba(4, 120, 87, 0.4)',
                    border: isAquaGlass
                      ? (isDarkMode ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(255, 255, 255, 0.8)')
                      : undefined,
                    backdropFilter: isAquaGlass ? 'blur(20px) saturate(180%)' : undefined,
                    WebkitBackdropFilter: isAquaGlass ? 'blur(20px) saturate(180%)' : undefined,
                    cursor: 'pointer',
                    transition: 'transform 0.15s',
                    '&:active': { transform: 'scale(0.98)' }
                  }}
                >
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 42,
                        height: 42,
                        borderRadius: '12px',
                        bgcolor: isAquaGlass
                          ? (isDarkMode ? 'rgba(52, 211, 153, 0.2)' : 'rgba(255, 255, 255, 0.7)')
                          : 'rgba(255, 255, 255, 0.2)',
                        border: isAquaGlass
                          ? (isDarkMode ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid rgba(255, 255, 255, 0.95)')
                          : undefined,
                        boxShadow: isAquaGlass
                          ? (isDarkMode ? '0 4px 12px rgba(16, 185, 129, 0.25)' : '0 4px 12px rgba(16, 185, 129, 0.15)')
                          : undefined,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(4px)'
                      }}
                    >
                      <LucideQrCode size={22} color={isAquaGlass ? (isDarkMode ? '#34d399' : '#047857') : '#ffffff'} strokeWidth={2.4} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isAquaGlass ? (isDarkMode ? '#f8fafc' : '#0f172a') : '#ffffff', fontSize: '0.88rem' }}>
                        Scan Kehadiran Siswa
                      </Typography>
                      <Typography variant="caption" sx={{ color: isAquaGlass ? (isDarkMode ? 'rgba(255, 255, 255, 0.9)' : '#065f46') : 'rgba(255, 255, 255, 0.95)', display: 'block', fontSize: '0.72rem', fontWeight: 600 }}>
                        Scan Kamera &amp; GPS Geofence • Jadwal Piket Aktif
                      </Typography>
                    </Box>
                  </Stack>
                  <Chip
                    label="Buka Scan →"
                    size="small"
                    className={isAquaGlass ? "aqua-gloss-btn" : undefined}
                    sx={{
                      bgcolor: isAquaGlass
                        ? (isDarkMode ? 'linear-gradient(180deg, rgba(56, 189, 248, 0.3) 0%, rgba(2, 132, 199, 0.5) 100%)' : 'linear-gradient(180deg, #ffffff 0%, #e0f2fe 100%)')
                        : '#ffffff',
                      color: isAquaGlass ? (isDarkMode ? '#f8fafc' : '#047857') : '#047857',
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      height: 26,
                      borderRadius: '9999px',
                      border: isAquaGlass
                        ? (isDarkMode ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid rgba(255, 255, 255, 0.9)')
                        : undefined,
                      boxShadow: isAquaGlass
                        ? (isDarkMode ? '0 4px 14px rgba(56, 189, 248, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)' : '0 4px 14px rgba(2, 132, 199, 0.25), inset 0 1px 0 #ffffff')
                        : undefined
                    }}
                  />
                </Box>
              </Box>
            )}

            {/* C. GRID SHORTCUT MENU (2 KOLOM PADAT & PROPORSIONAL DENGAN SOFT 3D CLAYMORPHISM) */}
            <Box sx={{ px: 1.5, pt: 1, pb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: isDarkMode ? '#f8fafc' : '#0f172a', fontSize: '0.84rem' }}>
                  Menu Utama &amp; Pintasan
                </Typography>
                <Chip
                  label={`${navItems.length} Layanan`}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    bgcolor: isDarkMode ? 'rgba(51, 65, 85, 0.6)' : '#f1f5f9',
                    color: isDarkMode ? '#94a3b8' : '#64748b'
                  }}
                />
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 1.1
                }}
              >
                {navItems.map(item => {
                  const style = getShortcutStyle(item.id);
                  return (
                    <Box
                      key={item.id}
                      onClick={() => {
                        handleSelectMenu(item.id);
                        setMobileTab('menu');
                      }}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 1.2,
                        borderRadius: 2.5,
                        bgcolor: isAquaGlass
                          ? (isDarkMode ? 'rgba(15, 23, 42, 0.56)' : 'rgba(255, 255, 255, 0.62)')
                          : (isDarkMode ? '#1e293b' : '#ffffff'),
                        border: isAquaGlass
                          ? (isDarkMode ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(255, 255, 255, 0.75)')
                          : `1px solid ${isDarkMode ? 'rgba(51, 65, 85, 0.8)' : '#e2e8f0'}`,
                        boxShadow: isAquaGlass
                          ? (isDarkMode ? '0 8px 24px -4px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : '0 8px 24px -4px rgba(2, 132, 199, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.85)')
                          : (isDarkMode
                              ? '0 4px 12px rgba(0,0,0,0.3)'
                              : '0 2px 8px -1px rgba(15,23,42,0.05), 0 1px 2px rgba(15,23,42,0.03)'),
                        backdropFilter: isAquaGlass ? 'blur(20px) saturate(180%)' : undefined,
                        WebkitBackdropFilter: isAquaGlass ? 'blur(20px) saturate(180%)' : undefined,
                        cursor: 'pointer',
                        transition: 'all 0.16s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        minHeight: 86,
                        '&:active': { transform: 'scale(0.95)' }
                      }}
                    >
                      <Box
                        sx={{
                          width: 38,
                          height: 38,
                          borderRadius: '12px',
                          background: style.gradient,
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 0.6,
                          boxShadow: isAquaGlass
                            ? `0 6px 18px ${alpha(style.shadowColor || '#0284c7', 0.45)}, inset 0 1.5px 3px rgba(255,255,255,0.7)`
                            : (isDarkMode
                                ? 'inset 0 1px 2px rgba(255,255,255,0.3), 0 4px 10px rgba(0,0,0,0.4)'
                                : `inset 0 1.5px 3px rgba(255,255,255,0.7), 0 6px 14px -3px ${style.shadowColor}`),
                          '& svg': {
                            fontSize: 20,
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))'
                          }
                        }}
                      >
                        {item.icon}
                      </Box>
                      <Typography
                        variant="caption"
                        align="center"
                        sx={{
                          fontWeight: 800,
                          color: isDarkMode ? '#f8fafc' : '#0f172a',
                          fontSize: '0.74rem',
                          lineHeight: 1.18,
                          textAlign: 'center',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          wordBreak: 'break-word',
                          width: '100%',
                          minHeight: 28
                        }}
                      >
                        {item.label}
                      </Typography>
                      {item.badge && (
                        <Chip
                          label={item.badge}
                          size="small"
                          sx={{
                            mt: 0.2,
                            height: 16,
                            fontSize: '0.58rem',
                            fontWeight: 800,
                            bgcolor: isAquaGlass
                              ? (isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(2, 132, 199, 0.12)')
                              : (isDarkMode ? 'rgba(255,255,255,0.08)' : '#f1f5f9'),
                            color: isAquaGlass
                              ? (isDarkMode ? '#cbd5e1' : '#0284c7')
                              : (isDarkMode ? '#cbd5e1' : '#475569'),
                            border: isAquaGlass
                              ? (isDarkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(2, 132, 199, 0.25)')
                              : undefined,
                            backdropFilter: isAquaGlass ? 'blur(6px)' : undefined
                          }}
                        />
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Box>
        ) : (
          /* SUB-VIEW HALAMAN MENU MOBILE */
          <Box>
            <Box
              sx={{
                px: 1.8,
                py: 1,
                bgcolor: isAquaGlass
                  ? (isDarkMode ? 'rgba(15, 23, 42, 0.60)' : 'rgba(255, 255, 255, 0.65)')
                  : (isDarkMode ? '#0f172a' : '#ffffff'),
                borderBottom: isAquaGlass
                  ? (isDarkMode ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(255, 255, 255, 0.75)')
                  : `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                backdropFilter: isAquaGlass ? 'blur(20px) saturate(180%)' : undefined,
                WebkitBackdropFilter: isAquaGlass ? 'blur(20px) saturate(180%)' : undefined,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'sticky',
                top: 0,
                zIndex: 30
              }}
            >
              <Button
                size="small"
                startIcon={<HomeIcon />}
                onClick={() => setMobileTab('home')}
                sx={{
                  fontWeight: 800,
                  textTransform: 'none',
                  color: isAquaGlass ? (isDarkMode ? '#38bdf8' : '#0284c7') : theme.palette.primary.main,
                  fontSize: '0.8rem'
                }}
              >
                Beranda
              </Button>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 900,
                  color: isDarkMode ? '#f8fafc' : '#0f172a',
                  fontSize: '0.85rem'
                }}
              >
                {navItems.find(n => n.id === activeMenu)?.label || 'Menu'}
              </Typography>
              <IconButton
                size="small"
                color="error"
                onClick={() => setLogoutDialogOpen(true)}
                sx={{ display: { xs: 'none', md: 'inline-flex' } }}
              >
                <LogoutIcon fontSize="small" />
              </IconButton>
              <Box sx={{ display: { xs: 'block', md: 'none' }, width: 32 }} />
            </Box>

            <Box sx={{ p: { xs: 1.2, sm: 2 }, pb: 2 }}>
              {renderActiveMenuComponent()}
            </Box>
          </Box>
        )}

        {/* D. REDESAIN BOTTOM NAVIGATION BAR (FLOATING GLASS DOCK ALA MODERN MOBILE) */}
        <Box
          sx={{
            position: 'fixed',
            bottom: isAquaGlass ? { xs: 6, sm: 10 } : 0,
            left: isAquaGlass ? { xs: 8, sm: 16 } : 0,
            right: isAquaGlass ? { xs: 8, sm: 16 } : 0,
            borderRadius: isAquaGlass ? '24px' : 0,
            zIndex: 1200,
            bgcolor: isAquaGlass
              ? (isDarkMode ? 'rgba(15, 23, 42, 0.62)' : 'rgba(255, 255, 255, 0.68)')
              : (isDarkMode ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.96)'),
            backdropFilter: 'blur(24px) saturate(190%)',
            WebkitBackdropFilter: 'blur(24px) saturate(190%)',
            border: isAquaGlass
              ? (isDarkMode ? '1px solid rgba(255, 255, 255, 0.14)' : '1px solid rgba(255, 255, 255, 0.85)')
              : undefined,
            borderTop: !isAquaGlass
              ? `1px solid ${isDarkMode ? '#1e293b' : '#e2e8f0'}`
              : undefined,
            px: 0.5,
            pt: 0.8,
            pb: isAquaGlass ? 0.8 : 'max(0.5rem, env(safe-area-inset-bottom))',
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            alignItems: 'end',
            boxShadow: isAquaGlass
              ? (isDarkMode
                  ? '0 12px 36px 0 rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                  : '0 12px 36px 0 rgba(2, 132, 199, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.9)')
              : (isDarkMode ? '0 -4px 20px rgba(0,0,0,0.4)' : '0 -4px 20px rgba(0,0,0,0.08)')
          }}
        >
          {/* 1. KIRI 1: Menu Utama / Attendance */}
          {(() => {
            const mainId = getMainRoleMenuId();
            const isActive = mobileTab === 'menu' && activeMenu === mainId;
            const labelText = isKepsek || isKurikulum ? 'Monitoring' : isKesiswaan || isBk ? 'Presensi' : 'Kehadiran';
            return (
              <Box
                onClick={() => {
                  handleSelectMenu(mainId);
                  setMobileTab('menu');
                }}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 0.5,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  userSelect: 'none'
                }}
              >
                <Box
                  sx={{
                    px: 2,
                    py: 0.4,
                    borderRadius: '9999px',
                    bgcolor: isActive
                      ? (isAquaGlass
                          ? (isDarkMode ? 'rgba(56, 189, 248, 0.22)' : 'rgba(2, 132, 199, 0.14)')
                          : alpha(theme.palette.primary.main, 0.18))
                      : 'transparent',
                    color: isActive
                      ? (isAquaGlass
                          ? (isDarkMode ? '#38bdf8' : '#0284c7')
                          : (isDarkMode ? '#60a5fa' : theme.palette.primary.main))
                      : (isAquaGlass
                          ? (isDarkMode ? '#94a3b8' : '#64748b')
                          : (isDarkMode ? '#64748b' : '#94a3b8')),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <CoPresentIcon sx={{ fontSize: 22 }} />
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '10px',
                    fontWeight: isActive ? 800 : 600,
                    letterSpacing: '-0.02em',
                    mt: 0.5,
                    textAlign: 'center',
                    width: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: isActive
                      ? (isAquaGlass
                          ? (isDarkMode ? '#38bdf8' : '#0284c7')
                          : (isDarkMode ? '#60a5fa' : theme.palette.primary.main))
                      : (isDarkMode ? '#94a3b8' : '#64748b')
                  }}
                >
                  {labelText}
                </Typography>
              </Box>
            );
          })()}

          {/* 2. KIRI 2: Secondary Role Menu */}
          {(() => {
            const secId = getSecondaryRoleMenuId();
            const isActive = mobileTab === 'menu' && activeMenu === secId;
            const labelText = isKepsek ? 'Pengesahan' : isKurikulum ? (isWaliKelas ? 'Kelas Wali' : 'Kehadiran') : isKesiswaan || isBk ? 'Kehadiran' : isWaliKelas ? 'Kelas Wali' : 'Tugas Piket';
            const IconComp = isKepsek ? VerifiedIcon : isWaliKelas ? GroupsIcon : isKurikulum ? (isWaliKelas ? GroupsIcon : CoPresentIcon) : isKesiswaan || isBk ? CoPresentIcon : AssignmentIndIcon;
            return (
              <Box
                onClick={() => {
                  handleSelectMenu(secId);
                  setMobileTab('menu');
                }}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 0.5,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  userSelect: 'none'
                }}
              >
                <Box
                  sx={{
                    px: 2,
                    py: 0.4,
                    borderRadius: '9999px',
                    bgcolor: isActive
                      ? (isAquaGlass
                          ? (isDarkMode ? 'rgba(56, 189, 248, 0.22)' : 'rgba(2, 132, 199, 0.14)')
                          : alpha(theme.palette.primary.main, 0.18))
                      : 'transparent',
                    color: isActive
                      ? (isAquaGlass
                          ? (isDarkMode ? '#38bdf8' : '#0284c7')
                          : (isDarkMode ? '#60a5fa' : theme.palette.primary.main))
                      : (isAquaGlass
                          ? (isDarkMode ? '#94a3b8' : '#64748b')
                          : (isDarkMode ? '#64748b' : '#94a3b8')),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <IconComp sx={{ fontSize: 22 }} />
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '10px',
                    fontWeight: isActive ? 800 : 600,
                    letterSpacing: '-0.02em',
                    mt: 0.5,
                    textAlign: 'center',
                    width: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: isActive
                      ? (isAquaGlass
                          ? (isDarkMode ? '#38bdf8' : '#0284c7')
                          : (isDarkMode ? '#60a5fa' : theme.palette.primary.main))
                      : (isDarkMode ? '#94a3b8' : '#64748b')
                  }}
                >
                  {labelText}
                </Typography>
              </Box>
            );
          })()}

          {/* 3. TENGAH (UTAMA / HOME): TOMBOL BERANDA FLOATING DOCK 3D GLASS SPHERE */}
          <Box
            onClick={() => setMobileTab('home')}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              userSelect: 'none',
              position: 'relative',
              zIndex: 10
            }}
          >
            <Box
              sx={{
                width: 58,
                height: 58,
                borderRadius: '50%',
                background: isAquaGlass
                  ? 'linear-gradient(135deg, #0284c7 0%, #059669 50%, #34d399 100%)'
                  : 'linear-gradient(135deg, #047857 0%, #10b981 50%, #2dd4bf 100%)',
                border: isAquaGlass
                  ? (isDarkMode ? '3.5px solid rgba(255, 255, 255, 0.4)' : '3.5px solid rgba(255, 255, 255, 0.95)')
                  : `4px solid ${isDarkMode ? '#0f172a' : '#ffffff'}`,
                boxShadow: isAquaGlass
                  ? (isDarkMode
                      ? '0 12px 30px -2px rgba(2, 132, 199, 0.65), 0 0 18px rgba(52, 211, 153, 0.45), inset 0 2px 4px rgba(255, 255, 255, 0.6)'
                      : '0 12px 30px -2px rgba(2, 132, 199, 0.4), 0 0 18px rgba(16, 185, 129, 0.35), inset 0 2px 4px #ffffff')
                  : (isDarkMode
                      ? '0 12px 24px -4px rgba(16, 185, 129, 0.5), inset 0 3px 6px rgba(255, 255, 255, 0.45)'
                      : '0 12px 24px -4px rgba(16, 185, 129, 0.45), inset 0 3px 6px rgba(255, 255, 255, 0.6)'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '-26px',
                transition: 'all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transform: mobileTab === 'home' ? 'scale(1.08)' : 'scale(1)',
                '&:active': { transform: 'scale(0.92)' }
              }}
            >
              <HomeIcon sx={{ fontSize: 26, color: '#ffffff', display: 'block', m: 0, p: 0, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }} />
            </Box>
            <Typography
              variant="caption"
              sx={{
                fontSize: '10px',
                fontWeight: mobileTab === 'home' ? 800 : 600,
                letterSpacing: '-0.02em',
                mt: 0.5,
                textAlign: 'center',
                color: mobileTab === 'home'
                  ? (isAquaGlass
                      ? (isDarkMode ? '#38bdf8' : '#0284c7')
                      : (isDarkMode ? '#34d399' : '#059669'))
                  : (isDarkMode ? '#94a3b8' : '#64748b')
              }}
            >
              Beranda
            </Typography>
          </Box>

          {/* 4. KANAN 1: Perangkat Ajar */}
          {(() => {
            const perangkatId = getPerangkatMenuId();
            const isActive = mobileTab === 'menu' && activeMenu.startsWith('perangkat');
            return (
              <Box
                onClick={() => {
                  handleSelectMenu(perangkatId);
                  setMobileTab('menu');
                }}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 0.5,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  userSelect: 'none'
                }}
              >
                <Box
                  sx={{
                    px: 2,
                    py: 0.4,
                    borderRadius: '9999px',
                    bgcolor: isActive
                      ? (isAquaGlass
                          ? (isDarkMode ? 'rgba(56, 189, 248, 0.22)' : 'rgba(2, 132, 199, 0.14)')
                          : alpha(theme.palette.primary.main, 0.18))
                      : 'transparent',
                    color: isActive
                      ? (isAquaGlass
                          ? (isDarkMode ? '#38bdf8' : '#0284c7')
                          : (isDarkMode ? '#60a5fa' : theme.palette.primary.main))
                      : (isAquaGlass
                          ? (isDarkMode ? '#94a3b8' : '#64748b')
                          : (isDarkMode ? '#64748b' : '#94a3b8')),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <CloudUploadIcon sx={{ fontSize: 22 }} />
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '10px',
                    fontWeight: isActive ? 800 : 600,
                    letterSpacing: '-0.02em',
                    mt: 0.5,
                    textAlign: 'center',
                    width: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: isActive
                      ? (isAquaGlass
                          ? (isDarkMode ? '#38bdf8' : '#0284c7')
                          : (isDarkMode ? '#60a5fa' : theme.palette.primary.main))
                      : (isDarkMode ? '#94a3b8' : '#64748b')
                  }}
                >
                  Perangkat
                </Typography>
              </Box>
            );
          })()}

          {/* 5. KANAN 2: Profil / Akun */}
          {(() => {
            const isActive = mobileTab === 'menu' && activeMenu === 'akun';
            return (
              <Box
                onClick={() => {
                  handleSelectMenu('akun');
                  setMobileTab('menu');
                }}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 0.5,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  userSelect: 'none'
                }}
              >
                <Box
                  sx={{
                    px: 2,
                    py: 0.4,
                    borderRadius: '9999px',
                    bgcolor: isActive
                      ? (isAquaGlass
                          ? (isDarkMode ? 'rgba(56, 189, 248, 0.22)' : 'rgba(2, 132, 199, 0.14)')
                          : alpha(theme.palette.primary.main, 0.18))
                      : 'transparent',
                    color: isActive
                      ? (isAquaGlass
                          ? (isDarkMode ? '#38bdf8' : '#0284c7')
                          : (isDarkMode ? '#60a5fa' : theme.palette.primary.main))
                      : (isAquaGlass
                          ? (isDarkMode ? '#94a3b8' : '#64748b')
                          : (isDarkMode ? '#64748b' : '#94a3b8')),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <AccountCircleIcon sx={{ fontSize: 22 }} />
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '10px',
                    fontWeight: isActive ? 800 : 600,
                    letterSpacing: '-0.02em',
                    mt: 0.5,
                    textAlign: 'center',
                    width: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: isActive
                      ? (isAquaGlass
                          ? (isDarkMode ? '#38bdf8' : '#0284c7')
                          : (isDarkMode ? '#60a5fa' : theme.palette.primary.main))
                      : (isDarkMode ? '#94a3b8' : '#64748b')
                  }}
                >
                  Profil
                </Typography>
              </Box>
            );
          })()}
        </Box>
      </Box>

      {/* ==========================================
          2. TAMPILAN DESKTOP (SCREEN >= 768px / md:flex)
          Redesain Desktop Modern, Kedalaman 3D & Animasi Halus
         ========================================== */}
      <Box sx={{ display: { xs: 'none', md: 'flex' }, minHeight: '100vh', width: '100%', bgcolor: isDarkMode ? '#0f172a' : '#f8fafc', color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
        {/* TOP APP BAR DESKTOP (Glassmorphism & Depth) */}
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            width: `calc(100% - ${currentDrawerWidth}px)`,
            ml: `${currentDrawerWidth}px`,
            transition: 'width 0.28s cubic-bezier(0.4, 0, 0.2, 1), margin-left 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
            bgcolor: isDarkMode ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.88)',
            backdropFilter: 'blur(12px)',
            color: isDarkMode ? '#f8fafc' : '#0f172a',
            borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(226, 232, 240, 0.8)'}`,
            boxShadow: isDarkMode ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px -2px rgba(0,0,0,0.03)',
            zIndex: 1100
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between', px: 3, minHeight: '68px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {(() => {
                const currentItem = navItems.find(i => i.id === activeMenu);
                return (
                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: 2.5,
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                      color: theme.palette.primary.main,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.25)}`
                    }}
                  >
                    {currentItem ? currentItem.icon : <LucideSparkles size={20} />}
                  </Box>
                );
              })()}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.15rem', color: isDarkMode ? '#f8fafc' : '#0f172a', letterSpacing: '-0.02em' }}>
                    {activeMenu === 'monitoring'
                      ? 'Monitoring Kehadiran Guru'
                      : activeMenu === 'monitoring-jurnal-kbm'
                      ? 'Monitoring Jurnal KBM Guru'
                      : activeMenu === 'presensi-kesiswaan'
                      ? 'Presensi Siswa (Kesiswaan)'
                      : activeMenu === 'monitoring-kbm-siswa'
                      ? 'Monitoring KBM Siswa'
                      : activeMenu === 'wali-kelas'
                      ? isKepsek ? 'Monitoring Kelas Siswa' : 'Menu Wali Kelas'
                      : activeMenu === 'kehadiran'
                      ? 'Kehadiran Guru'
                      : activeMenu === 'rekap-jurnal-kbm'
                      ? 'Rekap Jurnal KBM'
                      : activeMenu === 'jadwal-kbm'
                      ? 'Jadwal JP KBM'
                      : activeMenu === 'piket'
                      ? 'Tugas Piket & Perizinan'
                      : activeMenu === 'perangkat-supervisi'
                      ? 'Supervisi Perangkat Ajar'
                      : activeMenu === 'perangkat-pengesahan'
                      ? 'Validasi & Pengesahan Perangkat'
                      : activeMenu === 'perangkat-verifikasi'
                      ? 'Verifikasi Perangkat Ajar'
                      : activeMenu === 'perangkat-setting'
                      ? 'Pengaturan Perangkat Ajar'
                      : activeMenu === 'perangkat-guru'
                      ? 'Upload Perangkat Ajar'
                      : 'Informasi Akun'}
                  </Typography>
                  <Chip
                    label={judulGuruPortal}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      height: 22,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`
                    }}
                  />
                </Box>
                <Typography variant="caption" sx={{ color: isDarkMode ? '#94a3b8' : '#64748b', fontWeight: 500, fontSize: '0.72rem' }}>
                  {roleTitle} • Terintegrasi Presensi Sekolah
                </Typography>
              </Box>
            </Box>

            {/* Clock & Status Desktop */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Chip
                icon={<CalendarMonthIcon sx={{ fontSize: '15px !important' }} />}
                label={`Periode Aktif: T.A. ${activePeriod.tahun_ajaran} (${activePeriod.semester})`}
                size="small"
                sx={{
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  py: 1.8,
                  px: 0.5,
                  borderRadius: 2,
                  bgcolor: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
                  color: isDarkMode ? '#93c5fd' : '#1d4ed8',
                  border: `1px solid ${isDarkMode ? 'rgba(59, 130, 246, 0.3)' : '#bfdbfe'}`
                }}
              />

              <Tooltip title={isDarkMode ? 'Mode Terang' : 'Mode Gelap'}>
                <IconButton
                  onClick={toggleThemeMode}
                  sx={{
                    bgcolor: isDarkMode ? '#1e293b' : '#f1f5f9',
                    color: isDarkMode ? '#fbbf24' : '#475569',
                    border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                    p: 1,
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      bgcolor: isDarkMode ? '#334155' : '#e2e8f0'
                    },
                    '&:active': { transform: 'scale(0.95)' }
                  }}
                >
                  {isDarkMode ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                </IconButton>
              </Tooltip>

              <Box
                sx={{
                  textAlign: 'right',
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                  bgcolor: isDarkMode ? 'rgba(30,41,59,0.7)' : '#f8fafc',
                  border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`
                }}
              >
                <Typography variant="caption" sx={{ color: isDarkMode ? '#94a3b8' : '#64748b', fontWeight: 600, display: 'block', fontSize: '0.68rem' }}>
                  {formattedDate}
                </Typography>
                <Typography variant="body2" sx={{ color: isDarkMode ? '#f8fafc' : '#0f172a', fontWeight: 800, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  {currentTime}
                </Typography>
              </Box>

              <Tooltip title="Keluar dari Akun Guru">
                <IconButton
                  color="error"
                  onClick={() => setLogoutDialogOpen(true)}
                  sx={{
                    bgcolor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      bgcolor: isDarkMode ? 'rgba(239, 68, 68, 0.25)' : '#fee2e2',
                      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
                    },
                    '&:active': { transform: 'scale(0.95)' }
                  }}
                >
                  <LucideLogOut size={16} strokeWidth={2.2} />
                </IconButton>
              </Tooltip>
            </Box>
          </Toolbar>
        </AppBar>

        {/* DESKTOP PERMANENT DRAWER (COLLAPSIBLE) */}
        <Drawer
          variant="permanent"
          sx={{
            width: currentDrawerWidth,
            flexShrink: 0,
            transition: 'width 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: currentDrawerWidth,
              transition: 'width 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
              overflowX: 'hidden',
              borderRight: `1px solid ${isDarkMode ? '#1e293b' : '#e2e8f0'}`,
              boxShadow: isDarkMode ? '4px 0 24px rgba(0,0,0,0.3)' : '4px 0 20px rgba(0,0,0,0.02)'
            }
          }}
          open
        >
          {drawerContent}
        </Drawer>

        {/* MAIN CONTENT AREA WITH SUBTLE DEPTH & EXPANDED RESPONSIVENESS */}
        <Box
          component="main"
          key={activeMenu}
          sx={{
            flexGrow: 1,
            p: { xs: 2, md: 3 },
            width: `calc(100% - ${currentDrawerWidth}px)`,
            maxWidth: `calc(100% - ${currentDrawerWidth}px)`,
            transition: 'width 0.28s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
            minWidth: 0,
            boxSizing: 'border-box',
            overflowX: 'hidden',
            mt: '68px',
            minHeight: 'calc(100vh - 68px)',
            background: isDarkMode
              ? 'radial-gradient(ellipse at 90% 10%, rgba(59, 130, 246, 0.08) 0%, transparent 60%)'
              : `radial-gradient(ellipse at 90% 10%, ${alpha(theme.palette.primary.main, 0.05)} 0%, transparent 60%)`,
            animation: 'desktopFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            '@keyframes desktopFadeIn': {
              '0%': {
                opacity: 0,
                transform: 'translateY(10px)'
              },
              '100%': {
                opacity: 1,
                transform: 'translateY(0)'
              }
            }
          }}
        >
          {renderActiveMenuComponent()}
        </Box>
      </Box>

      {/* LOGOUT CONFIRMATION DIALOG */}
      <Dialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a' }}>
          Konfirmasi Keluar
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#475569' }}>
            Apakah Anda yakin ingin keluar dari portal <b>Akses Data Guru</b>?
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
    </Box>
  );
}
