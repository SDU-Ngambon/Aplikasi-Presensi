import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Alert,
  ButtonGroup,
  ToggleButton,
  ToggleButtonGroup,
  Autocomplete
} from '@mui/material';
import {
  FactCheck as FactCheckIcon,
  Class as ClassIcon,
  Person as PersonIcon,
  WhatsApp as WhatsAppIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  FilterAlt as FilterIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
  LocationOn as LocationOnIcon,
  QrCodeScanner as QrCodeScannerIcon,
  Delete as DeleteIcon,
  Today as TodayIcon,
  DateRange as DateRangeIcon,
  CalendarMonth as CalendarMonthIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  Visibility as ViewIcon,
  School as SchoolIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import * as xlsx from 'xlsx';
import { formatWIBDateDDMMYYYY, formatWIBDateIndo, getWIBDateString } from '../../timezone';
import { TeacherKbmAttendance, KbmDaySchedule } from '../../types';
import { useAppTheme } from '../../contexts/ThemeModeContext';

// Helper mendapatkan tanggal realtime hari ini secara akurat (WIB / Asia/Jakarta)
const getRealtimeTodayDate = () => {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(new Date()); // Return YYYY-MM-DD
  } catch (e) {
    return format(new Date(), 'yyyy-MM-dd');
  }
};

const getRealtimeMonthDate = () => {
  const today = getRealtimeTodayDate();
  return today.substring(0, 7);
};

export default function TeacherAttendanceReports({ isEmbedded = false }: { isEmbedded?: boolean } = {}) {
  const { preset, isDark } = useAppTheme();
  // Navigation Tabs: rombel | guru | detail
  const [activeTab, setActiveTab] = useState<'rombel' | 'guru' | 'detail'>('rombel');

  // Period Mode: daily | weekly | monthly
  const [periodType, setPeriodType] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Realtime Date States (Mengikuti logika real-time laporan presensi hari ini)
  const [filterDate, setFilterDate] = useState(getRealtimeTodayDate);
  const [selectedMonth, setSelectedMonth] = useState(getRealtimeMonthDate);

  // Print & PDF Orientation State: auto | landscape | portrait
  const [printOrientation, setPrintOrientation] = useState<'auto' | 'landscape' | 'portrait'>('auto');

  // Mobile Display View Mode for daily matrix: 'cards' | 'table'
  const [mobileViewMode, setMobileViewMode] = useState<'cards' | 'table'>('cards');

  // Filters
  const [selectedRombel, setSelectedRombel] = useState<string>('all');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');

  // Datasets
  const [attendanceList, setAttendanceList] = useState<TeacherKbmAttendance[]>([]);
  const [rombels, setRombels] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [kbmSchedules, setKbmSchedules] = useState<KbmDaySchedule[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<any>({});
  const [wakaKurikulum, setWakaKurikulum] = useState<{ name?: string; nip?: string } | null>(null);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Popup detail drilldown
  const [detailModal, setDetailModal] = useState<{
    open: boolean;
    title: string;
    subtitle: string;
    records: TeacherKbmAttendance[];
  }>({
    open: false,
    title: '',
    subtitle: '',
    records: []
  });

  // Result Feedback Popup
  const [resultPopup, setResultPopup] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({
    open: false,
    title: '',
    message: ''
  });

  // WA Modal
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waTargetNumber, setWaTargetNumber] = useState('');
  const [waMessagePreview, setWaMessagePreview] = useState('');

  // Calculate Date Ranges (Realtime Local Date logic)
  const weekRange = useMemo(() => {
    const d = parseISO(filterDate);
    const day = d.getDay(); // 0 = Sun, 1 = Mon ...
    const diffToMon = day === 0 ? -6 : 1 - day;
    const mon = new Date(d);
    mon.setDate(d.getDate() + diffToMon);
    const sat = new Date(mon);
    sat.setDate(mon.getDate() + 5);

    const startDate = format(mon, 'yyyy-MM-dd');
    const endDate = format(sat, 'yyyy-MM-dd');
    const label = `${format(mon, 'dd MMM', { locale: id })} - ${format(sat, 'dd MMM yyyy', { locale: id })}`;

    return { startDate, endDate, label, mon, sat };
  }, [filterDate]);

  const monthRange = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const dateObj = new Date(y, m - 1, 1);
    const monthName = format(dateObj, 'MMMM yyyy', { locale: id });

    return { startDate, endDate, monthName };
  }, [selectedMonth]);

  // Normalisasi nama rombel untuk mencocokkan angka Romawi dan Arab (X -> 10, XI -> 11, XII -> 12)
  const normalizeClassName = (name: string): string => {
    if (!name) return '';
    let s = String(name).trim().toLowerCase();
    s = s.replace(/\bx\b/g, '10')
         .replace(/\bxi\b/g, '11')
         .replace(/\bxii\b/g, '12');
    return s.replace(/[^a-z0-9]/g, '');
  };

  // Helper mencari Wali Kelas Rombel
  const getHomeroomTeacher = (rombel: any, teachersList: any[] = []) => {
    if (!rombel) return '-';
    if (rombel.teacher && typeof rombel.teacher === 'object' && rombel.teacher.name) {
      return rombel.teacher.name;
    }
    if (rombel.homeroom_teacher && rombel.homeroom_teacher !== '-' && rombel.homeroom_teacher !== 'null') return rombel.homeroom_teacher;
    if (rombel.wali_kelas && rombel.wali_kelas !== '-' && rombel.wali_kelas !== 'null') return rombel.wali_kelas;
    if (rombel.waliKelas && rombel.waliKelas !== '-' && rombel.waliKelas !== 'null') return rombel.waliKelas;

    if (typeof rombel.teacher === 'string' && rombel.teacher.trim() && rombel.teacher !== '-' && rombel.teacher !== 'null') {
      const byId = Array.isArray(teachersList) ? teachersList.find(t => t.id === rombel.teacher || t.name === rombel.teacher) : null;
      if (byId && byId.name) return byId.name;
      return rombel.teacher;
    }
    if (rombel.teacher_id && Array.isArray(teachersList)) {
      const byId = teachersList.find(t => t.id === rombel.teacher_id);
      if (byId && byId.name) return byId.name;
    }
    
    const rName = String(rombel.name || rombel.rombelName || '').trim();
    const rNorm = normalizeClassName(rName);
    if (rNorm && Array.isArray(teachersList)) {
      const found = teachersList.find(t => {
        const tClass = String(t.class || t.className || t.rombel || '').trim();
        return normalizeClassName(tClass) === rNorm;
      });
      if (found && found.name) return found.name;
    }
    return '-';
  };

  // Evaluasi orientasi otomatis vs manual (Landscape untuk tabel banyak kolom, Portrait untuk tabel ringkas)
  const effectiveOrientation = useMemo<'landscape' | 'portrait'>(() => {
    if (printOrientation !== 'auto') return printOrientation;
    if (activeTab === 'rombel' && periodType === 'daily') return 'landscape';
    if (activeTab === 'detail') return 'landscape';
    return 'portrait';
  }, [printOrientation, activeTab, periodType]);

  // Sinkronisasi tanggal realtime hari ini setiap kali menu dibuka
  useEffect(() => {
    const today = getRealtimeTodayDate();
    setFilterDate(today);
    setSelectedMonth(today.substring(0, 7));
  }, []);

  // Load Data
  const loadData = async () => {
    setLoading(true);
    setProgress(30);
    try {
      let attUrl = `/api/teacher-kbm-attendance?date=${filterDate}`;
      if (periodType === 'weekly') {
        attUrl = `/api/teacher-kbm-attendance?startDate=${weekRange.startDate}&endDate=${weekRange.endDate}`;
      } else if (periodType === 'monthly') {
        attUrl = `/api/teacher-kbm-attendance?startDate=${monthRange.startDate}&endDate=${monthRange.endDate}`;
      }

      const [resAtt, resRombels, resTeachers, resKbm, resSettings, resWaka] = await Promise.all([
        fetch(attUrl),
        fetch('/api/rombel'),
        fetch('/api/teachers'),
        fetch('/api/kbm/schedules'),
        fetch('/api/settings'),
        fetch('/api/waka-kurikulum')
      ]);

      setProgress(70);
      const dataAtt = await resAtt.json();
      const dataRombels = await resRombels.json();
      const dataTeachers = await resTeachers.json();
      const dataKbm = await resKbm.json();
      const dataSettings = await resSettings.json().catch(() => ({}));
      const dataWaka = await resWaka.json().catch(() => ({}));

      setAttendanceList(Array.isArray(dataAtt) ? dataAtt : []);
      setSchoolSettings(dataSettings || {});
      setWakaKurikulum(dataWaka && dataWaka.name ? dataWaka : null);

      // Filter guru: Hanya guru aktif & non-dummy
      const rawTeachers = Array.isArray(dataTeachers) ? dataTeachers : [];
      const activeTeachersList = rawTeachers.filter((t: any) => {
        const st = String(t.status || 'AKTIF').toUpperCase().trim();
        const nUpper = String(t.name || '').toUpperCase().trim();
        if (st !== 'AKTIF' && st !== '') return false;
        if (nUpper.startsWith('DUMMY') || nUpper.includes('DUMMY') || nUpper.startsWith('TEST') || nUpper === 'GURU DUMMY') return false;
        return true;
      });
      setTeachers(activeTeachersList);

      // Parse Rombel: HANYA rombel aktif (status PKL, LULUS, ALUMNI, DUMMY tidak ditampilkan)
      const rawClasses = Array.isArray(dataRombels) ? dataRombels : (dataRombels?.classes || []);
      const activeRombelsList = rawClasses
        .filter((r: any) => {
          const name = String(r.name || '').toUpperCase().trim();
          const status = String(r.status || 'AKTIF').toUpperCase().trim();
          if (
            name.startsWith('ALUMNI') ||
            name.includes('PKL') ||
            name.includes('LULUS') ||
            name.startsWith('DUMMY') ||
            name.includes('DUMMY') ||
            name.startsWith('TEST') ||
            status === 'LULUS' ||
            status === 'PKL' ||
            status === 'NONAKTIF'
          ) {
            return false;
          }
          return true;
        })
        .map((r: any) => ({
          ...r,
          waliKelas: getHomeroomTeacher(r, activeTeachersList)
        }));
      setRombels(activeRombelsList);

      setKbmSchedules(Array.isArray(dataKbm) ? dataKbm : []);
      setProgress(100);
    } catch (e: any) {
      toast.error('Gagal memuat data laporan: ' + e.message);
    } finally {
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 300);
    }
  };

  useEffect(() => {
    loadData();
  }, [periodType, filterDate, selectedMonth]);

  // Date Navigation Helpers (Realtime local date)
  const handlePrevPeriod = () => {
    if (periodType === 'daily') {
      const d = parseISO(filterDate);
      d.setDate(d.getDate() - 1);
      setFilterDate(format(d, 'yyyy-MM-dd'));
    } else if (periodType === 'weekly') {
      const d = parseISO(filterDate);
      d.setDate(d.getDate() - 7);
      setFilterDate(format(d, 'yyyy-MM-dd'));
    } else {
      const [y, m] = selectedMonth.split('-').map(Number);
      const prevDate = new Date(y, m - 2, 1);
      setSelectedMonth(format(prevDate, 'yyyy-MM'));
    }
  };

  const handleNextPeriod = () => {
    if (periodType === 'daily') {
      const d = parseISO(filterDate);
      d.setDate(d.getDate() + 1);
      setFilterDate(format(d, 'yyyy-MM-dd'));
    } else if (periodType === 'weekly') {
      const d = parseISO(filterDate);
      d.setDate(d.getDate() + 7);
      setFilterDate(format(d, 'yyyy-MM-dd'));
    } else {
      const [y, m] = selectedMonth.split('-').map(Number);
      const nextDate = new Date(y, m, 1);
      setSelectedMonth(format(nextDate, 'yyyy-MM'));
    }
  };

  const handleResetToToday = () => {
    const today = getRealtimeTodayDate();
    setFilterDate(today);
    setSelectedMonth(today.substring(0, 7));
  };

  // Determine active day schedule for daily matrix
  const currentDayIndex = parseISO(filterDate).getDay(); // 0=Sun, 1=Mon...
  const activeDaySchedule = kbmSchedules.find(s => s.day_index === currentDayIndex) || {
    periods: Array.from({ length: 10 }).map((_, i) => ({
      jp_number: i + 1,
      start_time: '07:00',
      end_time: '07:45',
      category_id: 'kbm',
      category_name: 'KBM'
    }))
  };

  // 1. REKAP ROMBEL MATRIX (HARIAN)
  const rombelMatrix = useMemo(() => {
    const list = selectedRombel === 'all' ? rombels : rombels.filter(r => r.name === selectedRombel);
    const periods = activeDaySchedule.periods.filter(p => p.category_name.toUpperCase() !== 'ISTIRAHAT');

    return list.map(r => {
      const classAtt = attendanceList.filter(a => a.rombel_id.trim().toLowerCase() === r.name.trim().toLowerCase());
      
      const jpStatus: Record<number, { filled: boolean; teacherName?: string; subject?: string; topic?: string }> = {};

      periods.forEach(p => {
        const found = classAtt.find(a => (a.jp_list && a.jp_list.includes(p.jp_number)) || (a.jp_start <= p.jp_number && a.jp_end >= p.jp_number));
        if (found) {
          jpStatus[p.jp_number] = {
            filled: true,
            teacherName: found.teacher_name,
            subject: found.subject,
            topic: found.topic
          };
        } else {
          jpStatus[p.jp_number] = { filled: false };
        }
      });

      const filledCount = Object.values(jpStatus).filter(v => v.filled).length;
      const emptyCount = periods.length - filledCount;

      const homeroomName = r.waliKelas && r.waliKelas !== '-' ? r.waliKelas : getHomeroomTeacher(r, teachers);

      return {
        rombelName: r.name,
        gradeLevel: r.grade_level || r.grade,
        status: r.status || 'AKTIF',
        waliKelas: homeroomName,
        jpStatus,
        filledCount,
        emptyCount,
        totalJp: periods.length
      };
    });
  }, [rombels, selectedRombel, attendanceList, activeDaySchedule, teachers]);

  // 2. REKAP ROMBEL AGGREGATE (MINGGUAN & BULANAN)
  const rombelAggregate = useMemo(() => {
    const list = selectedRombel === 'all' ? rombels : rombels.filter(r => r.name === selectedRombel);

    return list.map(r => {
      const classAtt = attendanceList.filter(a => a.rombel_id.trim().toLowerCase() === r.name.trim().toLowerCase());
      
      let totalJp = 0;
      const teachersSet = new Set<string>();
      const subjectsSet = new Set<string>();
      const datesSet = new Set<string>();

      classAtt.forEach(a => {
        const jp = (a.jp_list && a.jp_list.length > 0) ? a.jp_list.length : (a.jp_end - a.jp_start + 1);
        totalJp += Math.max(1, jp);
        if (a.teacher_name) teachersSet.add(a.teacher_name);
        if (a.subject) subjectsSet.add(a.subject);
        if (a.date) datesSet.add(a.date);
      });

      const homeroomName = r.waliKelas && r.waliKelas !== '-' ? r.waliKelas : getHomeroomTeacher(r, teachers);

      return {
        rombelName: r.name,
        gradeLevel: r.grade_level || r.grade,
        status: r.status || 'AKTIF',
        waliKelas: homeroomName,
        totalSessions: classAtt.length,
        totalJp,
        activeDaysCount: datesSet.size,
        teachers: Array.from(teachersSet),
        subjects: Array.from(subjectsSet),
        records: classAtt
      };
    }).sort((a, b) => b.totalJp - a.totalJp);
  }, [rombels, selectedRombel, attendanceList, teachers]);

  // 3. REKAP GURU
  const teacherSummary = useMemo(() => {
    const list = selectedTeacher === 'all' ? teachers : teachers.filter(t => t.id === selectedTeacher || t.name === selectedTeacher);

    return list.map(t => {
      const records = attendanceList.filter(a => a.teacher_id === t.id || a.teacher_name.toLowerCase() === t.name.toLowerCase());
      
      let totalJp = 0;
      const classesCovered = new Set<string>();
      const subjectsCovered = new Set<string>();
      const datesCovered = new Set<string>();

      records.forEach(r => {
        if (r.jp_list && r.jp_list.length > 0) {
          totalJp += r.jp_list.length;
        } else {
          totalJp += (r.jp_end - r.jp_start + 1);
        }
        if (r.rombel_id) classesCovered.add(r.rombel_id);
        if (r.subject) subjectsCovered.add(r.subject);
        if (r.date) datesCovered.add(r.date);
      });

      // Find class where this teacher is assigned as homeroom teacher (Wali Kelas)
      let assignedHomeroomClass = (t.class || t.className || '').trim();
      if (!assignedHomeroomClass || assignedHomeroomClass === '-') {
        const foundRombel = rombels.find(r => {
          const wName = r.waliKelas || (typeof r.teacher === 'object' ? r.teacher?.name : r.homeroom_teacher || r.wali_kelas);
          return wName && String(wName).trim().toLowerCase() === String(t.name).trim().toLowerCase();
        });
        if (foundRombel) assignedHomeroomClass = foundRombel.name;
      }

      return {
        teacherId: t.id,
        teacherName: t.name,
        nip: t.nip || '-',
        whatsapp: t.whatsapp || t.phone || '',
        waliKelasOf: assignedHomeroomClass && assignedHomeroomClass !== '-' ? assignedHomeroomClass : '-',
        classes: Array.from(classesCovered).join(', ') || '-',
        subjects: Array.from(subjectsCovered).join(', ') || (t.subject || t.mapel || '-'),
        totalJp,
        recordCount: records.length,
        activeDays: datesCovered.size,
        records
      };
    }).sort((a, b) => b.totalJp - a.totalJp);
  }, [teachers, selectedTeacher, attendanceList, rombels]);

  // Active Period Title Text
  const currentPeriodText = useMemo(() => {
    if (periodType === 'daily') {
      try {
        return format(parseISO(filterDate), 'EEEE, dd MMMM yyyy', { locale: id });
      } catch {
        return filterDate;
      }
    }
    if (periodType === 'weekly') {
      return `Minggu: ${weekRange.label}`;
    }
    return `Bulan: ${monthRange.monthName}`;
  }, [periodType, filterDate, weekRange, monthRange]);

  // Overall Statistics Metrics
  const summaryStats = useMemo(() => {
    const totalSessions = attendanceList.length;
    let totalJp = 0;
    attendanceList.forEach(a => {
      totalJp += (a.jp_list && a.jp_list.length > 0) ? a.jp_list.length : Math.max(1, a.jp_end - a.jp_start + 1);
    });

    const activeTeachers = teacherSummary.filter(t => t.totalJp > 0).length;
    const activeRombels = rombels.length;

    return {
      totalSessions,
      totalJp,
      activeTeachers,
      totalTeachers: teachers.length,
      activeRombels,
      avgJpPerRombel: activeRombels > 0 ? (totalJp / activeRombels).toFixed(1) : '0'
    };
  }, [attendanceList, teacherSummary, rombels, teachers]);

  // Handle WhatsApp Export Modal
  const handleOpenWaModal = () => {
    let msg = `*REKAP KEHADIRAN KBM GURU (${periodType.toUpperCase()})*\nPeriode: ${currentPeriodText}\n\n`;
    
    if (activeTab === 'rombel') {
      msg += `*STATUS KBM PER ROMBONGAN BELAJAR:*\n`;
      if (periodType === 'daily') {
        rombelMatrix.forEach(rm => {
          msg += `▪ ${rm.rombelName}: Terisi ${rm.filledCount}/${rm.totalJp} JP (${rm.emptyCount > 0 ? `⚠️ ${rm.emptyCount} Kosong` : '✅ Lengkap'})\n`;
        });
      } else {
        rombelAggregate.forEach(ra => {
          msg += `▪ ${ra.rombelName}: ${ra.totalJp} JP (${ra.totalSessions} Sesi KBM) - ${ra.teachers.length} Guru\n`;
        });
      }
    } else {
      msg += `*AKTIVITAS GURU MENGAJAR:*\n`;
      teacherSummary.filter(t => t.totalJp > 0).forEach(ts => {
        msg += `▪ ${ts.teacherName}: ${ts.totalJp} JP (${ts.recordCount} Sesi) [${ts.classes}] - ${ts.subjects}\n`;
      });
    }

    msg += `\n*Statistik Ringkasan:*\n`;
    msg += `• Total Sesi KBM: ${summaryStats.totalSessions}\n`;
    msg += `• Total JP: ${summaryStats.totalJp} Jam Pelajaran\n`;
    msg += `• Guru Aktif Mengajar: ${summaryStats.activeTeachers} dari ${summaryStats.totalTeachers} Guru\n`;
    msg += `\n_Laporan disinkronkan langsung dari Portal Kehadiran KBM SMK_`;
    
    setWaMessagePreview(msg);
    setWaModalOpen(true);
  };

  const handleSendWa = () => {
    const cleanNumber = waTargetNumber.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(waMessagePreview);
    const waUrl = cleanNumber ? `https://wa.me/${cleanNumber}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, '_blank');
    setWaModalOpen(false);
  };

  // Export to Excel (.xlsx) dengan kolom terpisah fisik per jenis data (Bukan koma)
  const handleExportExcel = () => {
    setIsProcessing(true);
    setProgress(25);

    setTimeout(() => {
      try {
        setProgress(60);
        const rows: any[][] = [];
        const workbook = xlsx.utils.book_new();

        if (activeTab === 'rombel') {
          if (periodType === 'daily') {
            // Header Judul
            rows.push(['LAPORAN REKAPITULASI KETERISIAN JAM PELAJARAN (KBM) HARIAN']);
            rows.push([`Tanggal Laporan: ${currentPeriodText}`]);
            rows.push([`Waktu Unduh: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })} WIB`]);
            rows.push([]);

            // Baris Header Kolom: Setiap jenis data memiliki kolom fisik tersendiri
            const activePeriods = activeDaySchedule.periods.filter(p => p.category_name.toUpperCase() !== 'ISTIRAHAT');
            const headers = ['NO', 'ROMBONGAN BELAJAR', 'TINGKAT', 'WALI KELAS', 'STATUS', 'TOTAL JP', 'JP TERISI', 'JP KOSONG', 'PERSENTASE'];
            activePeriods.forEach(p => {
              headers.push(`JP ${p.jp_number} GURU`);
              headers.push(`JP ${p.jp_number} MAPEL`);
            });
            rows.push(headers);

            // Baris Data
            rombelMatrix.forEach((r, idx) => {
              const pct = Math.round((r.filledCount / (r.totalJp || 1)) * 100);
              const row: any[] = [
                idx + 1,
                r.rombelName,
                r.gradeLevel || '-',
                r.waliKelas || '-',
                r.status,
                r.totalJp,
                r.filledCount,
                r.emptyCount,
                `${pct}%`
              ];

              activePeriods.forEach(p => {
                const status = r.jpStatus[p.jp_number];
                if (status?.filled) {
                  row.push(status.teacherName || '-');
                  row.push(status.subject || '-');
                } else {
                  row.push('KOSONG');
                  row.push('-');
                }
              });
              rows.push(row);
            });

            const worksheet = xlsx.utils.aoa_to_sheet(rows);
            worksheet['!cols'] = [
              { wch: 6 },
              { wch: 22 },
              { wch: 10 },
              { wch: 24 },
              { wch: 12 },
              { wch: 10 },
              { wch: 10 },
              { wch: 10 },
              { wch: 12 },
              ...activePeriods.flatMap(() => [{ wch: 22 }, { wch: 20 }])
            ];
            xlsx.utils.book_append_sheet(workbook, worksheet, 'Rekap_Rombel_Harian');
          } else {
            // Rombel Rekapitulasi Mingguan / Bulanan
            rows.push([`LAPORAN REKAPITULASI KBM PER ROMBONGAN BELAJAR (${periodType.toUpperCase()})`]);
            rows.push([`Periode Laporan: ${currentPeriodText}`]);
            rows.push([`Waktu Unduh: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })} WIB`]);
            rows.push([]);

            const headers = ['NO', 'ROMBONGAN BELAJAR', 'TINGKAT', 'WALI KELAS', 'STATUS', 'TOTAL SESI KBM', 'TOTAL JP KBM', 'HARI AKTIF', 'DAFTAR GURU PENGAJAR', 'MATA PELAJARAN'];
            rows.push(headers);

            rombelAggregate.forEach((r, idx) => {
              rows.push([
                idx + 1,
                r.rombelName,
                r.gradeLevel || '-',
                r.waliKelas || '-',
                r.status,
                r.totalSessions,
                r.totalJp,
                r.activeDaysCount,
                r.teachers.join(' | ') || '-',
                r.subjects.join(' | ') || '-'
              ]);
            });

            const worksheet = xlsx.utils.aoa_to_sheet(rows);
            worksheet['!cols'] = [
              { wch: 6 },
              { wch: 22 },
              { wch: 10 },
              { wch: 24 },
              { wch: 12 },
              { wch: 16 },
              { wch: 14 },
              { wch: 12 },
              { wch: 35 },
              { wch: 35 }
            ];
            xlsx.utils.book_append_sheet(workbook, worksheet, `Rekap_Rombel_${periodType}`);
          }
        } else if (activeTab === 'guru') {
          // Rekap Guru
          rows.push([`LAPORAN REKAPITULASI KEHADIRAN & JP GURU MENGAJAR (${periodType.toUpperCase()})`]);
          rows.push([`Periode Laporan: ${currentPeriodText}`]);
          rows.push([`Waktu Unduh: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })} WIB`]);
          rows.push([]);

          const headers = ['NO', 'NAMA GURU', 'NIP', 'WALI KELAS', 'TOTAL JP', 'JUMLAH SESI', 'HARI AKTIF', 'NO WHATSAPP'];
          rows.push(headers);

          teacherSummary.forEach((t, idx) => {
            rows.push([
              idx + 1,
              t.teacherName,
              t.nip || '-',
              t.waliKelasOf || '-',
              t.totalJp,
              t.recordCount,
              t.activeDays,
              t.whatsapp || '-'
            ]);
          });

          const worksheet = xlsx.utils.aoa_to_sheet(rows);
          worksheet['!cols'] = [
            { wch: 6 },
            { wch: 28 },
            { wch: 20 },
            { wch: 20 },
            { wch: 12 },
            { wch: 14 },
            { wch: 12 },
            { wch: 18 }
          ];
          xlsx.utils.book_append_sheet(workbook, worksheet, `Rekap_Guru_${periodType}`);
        } else {
          // Detail Log KBM - Kolom terpisah fisik per jenis
          rows.push(['LOG RINCIAN DETAIL PRESENSI KBM GURU']);
          rows.push([`Periode Laporan: ${currentPeriodText}`]);
          rows.push([`Waktu Unduh: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })} WIB`]);
          rows.push([]);

          const headers = [
            'NO', 'TANGGAL', 'WAKTU', 'NAMA GURU', 'NIP', 'ROMBEL', 'MATA PELAJARAN',
            'JP AWAL', 'JP AKHIR', 'TOTAL JP', 'MATERI / TOPIK',
            'STATUS GPS', 'JARAK (M)', 'JUMLAH SISWA VERIFIKASI', 'DAFTAR SISWA'
          ];
          rows.push(headers);

          attendanceList.forEach((a, idx) => {
            const minJp = a.jp_list && a.jp_list.length > 0 ? Math.min(...a.jp_list) : (a.jp_start || 1);
            const maxJp = a.jp_list && a.jp_list.length > 0 ? Math.max(...a.jp_list) : (a.jp_end || minJp);
            const totalJp = a.jp_list && a.jp_list.length > 0 ? a.jp_list.length : (maxJp - minJp + 1);
            const studentNames = a.verified_students && a.verified_students.length > 0
              ? a.verified_students.map(s => s.student_name || (s as any).name).join(' | ')
              : '-';

            rows.push([
              idx + 1,
              a.date,
              a.timestamp ? format(new Date(a.timestamp), 'HH:mm:ss') : '-',
              a.teacher_name,
              a.teacher_nip || (a as any).nip || '-',
              a.rombel_id,
              a.subject,
              minJp,
              maxJp,
              totalJp,
              a.topic || '-',
              a.location_valid ? 'Valid' : 'Diluar Radius',
              a.distance_meters !== undefined ? `${Math.round(a.distance_meters)} m` : '-',
              a.verification_count || (a.verified_students || []).length,
              studentNames
            ]);
          });

          const worksheet = xlsx.utils.aoa_to_sheet(rows);
          worksheet['!cols'] = [
            { wch: 6 },
            { wch: 14 },
            { wch: 12 },
            { wch: 26 },
            { wch: 20 },
            { wch: 18 },
            { wch: 22 },
            { wch: 10 },
            { wch: 10 },
            { wch: 10 },
            { wch: 28 },
            { wch: 14 },
            { wch: 12 },
            { wch: 24 },
            { wch: 40 }
          ];
          xlsx.utils.book_append_sheet(workbook, worksheet, 'Detail_Log_KBM');
        }

        setProgress(90);
        const safePeriod = filterDate.replace(/[^a-zA-Z0-9]/g, '_');
        xlsx.writeFile(workbook, `Laporan_KBM_${activeTab}_${periodType}_${safePeriod}.xlsx`);

        setProgress(100);
        setTimeout(() => {
          setIsProcessing(false);
          setProgress(0);
          setResultPopup({
            open: true,
            title: 'Export Excel Berhasil',
            message: `Laporan Rekap KBM (${activeTab.toUpperCase()}) berhasil diekspor ke file Excel (.xlsx) dengan kolom terpisah fisik untuk setiap jenis data.`
          });
        }, 300);
      } catch (err: any) {
        setIsProcessing(false);
        setProgress(0);
        toast.error('Gagal export Excel: ' + err.message);
      }
    }, 400);
  };

  // Export to CSV (.csv) dengan pemisah kolom standar dan UTF-8 BOM
  const handleExportCsv = () => {
    try {
      const csvRows: string[][] = [];

      if (activeTab === 'rombel') {
        if (periodType === 'daily') {
          const activePeriods = activeDaySchedule.periods.filter(p => p.category_name.toUpperCase() !== 'ISTIRAHAT');
          const headers = ['NO', 'ROMBONGAN BELAJAR', 'TINGKAT', 'WALI KELAS', 'STATUS', 'TOTAL JP', 'JP TERISI', 'JP KOSONG', 'PERSENTASE'];
          activePeriods.forEach(p => {
            headers.push(`JP ${p.jp_number} GURU`);
            headers.push(`JP ${p.jp_number} MAPEL`);
          });
          csvRows.push(headers);

          rombelMatrix.forEach((r, idx) => {
            const pct = Math.round((r.filledCount / (r.totalJp || 1)) * 100);
            const row: string[] = [
              String(idx + 1),
              r.rombelName,
              r.gradeLevel || '-',
              r.waliKelas || '-',
              r.status,
              String(r.totalJp),
              String(r.filledCount),
              String(r.emptyCount),
              `${pct}%`
            ];

            activePeriods.forEach(p => {
              const status = r.jpStatus[p.jp_number];
              if (status?.filled) {
                row.push(status.teacherName || '-');
                row.push(status.subject || '-');
              } else {
                row.push('KOSONG');
                row.push('-');
              }
            });
            csvRows.push(row);
          });
        } else {
          csvRows.push(['NO', 'ROMBONGAN BELAJAR', 'TINGKAT', 'WALI KELAS', 'STATUS', 'TOTAL SESI KBM', 'TOTAL JP KBM', 'HARI AKTIF', 'DAFTAR GURU PENGAJAR', 'MATA PELAJARAN']);
          rombelAggregate.forEach((r, idx) => {
            csvRows.push([
              String(idx + 1),
              r.rombelName,
              r.gradeLevel || '-',
              r.waliKelas || '-',
              r.status,
              String(r.totalSessions),
              String(r.totalJp),
              String(r.activeDaysCount),
              r.teachers.join(' | ') || '-',
              r.subjects.join(' | ') || '-'
            ]);
          });
        }
      } else if (activeTab === 'guru') {
        csvRows.push(['NO', 'NAMA GURU', 'NIP', 'WALI KELAS', 'TOTAL JP', 'JUMLAH SESI', 'HARI AKTIF', 'NO WHATSAPP']);
        teacherSummary.forEach((t, idx) => {
          csvRows.push([
            String(idx + 1),
            t.teacherName,
            t.nip || '-',
            t.waliKelasOf || '-',
            String(t.totalJp),
            String(t.recordCount),
            String(t.activeDays),
            t.whatsapp || '-'
          ]);
        });
      } else {
        csvRows.push([
          'NO', 'TANGGAL', 'WAKTU', 'NAMA GURU', 'NIP', 'ROMBEL', 'MATA PELAJARAN',
          'JP AWAL', 'JP AKHIR', 'TOTAL JP', 'MATERI / TOPIK',
          'STATUS GPS', 'JARAK (M)', 'JUMLAH SISWA VERIFIKASI', 'DAFTAR SISWA'
        ]);
        attendanceList.forEach((a, idx) => {
          const minJp = a.jp_list && a.jp_list.length > 0 ? Math.min(...a.jp_list) : (a.jp_start || 1);
          const maxJp = a.jp_list && a.jp_list.length > 0 ? Math.max(...a.jp_list) : (a.jp_end || minJp);
          const totalJp = a.jp_list && a.jp_list.length > 0 ? a.jp_list.length : (maxJp - minJp + 1);
          const studentNames = a.verified_students && a.verified_students.length > 0
            ? a.verified_students.map(s => s.student_name || (s as any).name).join(' | ')
            : '-';

          csvRows.push([
            String(idx + 1),
            a.date,
            a.timestamp ? format(new Date(a.timestamp), 'HH:mm:ss') : '-',
            a.teacher_name,
            a.teacher_nip || (a as any).nip || '-',
            a.rombel_id,
            a.subject,
            String(minJp),
            String(maxJp),
            String(totalJp),
            a.topic || '-',
            a.location_valid ? 'Valid' : 'Diluar Radius',
            a.distance_meters !== undefined ? `${Math.round(a.distance_meters)} m` : '-',
            String(a.verification_count || (a.verified_students || []).length),
            studentNames
          ]);
        });
      }

      // Format dengan pemisah titik koma (;) agar kompatibel langsung dengan Excel bahasa Indonesia tanpa merusak teks
      const csvContent = '\uFEFF' + csvRows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safePeriod = filterDate.replace(/[^a-zA-Z0-9]/g, '_');
      link.href = url;
      link.setAttribute('download', `Laporan_KBM_${activeTab}_${periodType}_${safePeriod}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Laporan CSV berhasil diunduh dengan kolom terpisah!');
    } catch (e: any) {
      toast.error('Gagal export CSV: ' + e.message);
    }
  };

  // Print PDF (Menggunakan settingan kertas A4 dan tata letak tidak terpotong)
  const handlePrintPdf = () => {
    setIsProcessing(false);
    setProgress(0);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Delete Record
  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm('Hapus catatan presensi KBM guru ini?')) return;
    try {
      const res = await fetch(`/api/teacher-kbm-attendance/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Gagal menghapus');
      toast.success('Catatan presensi berhasil dihapus');
      loadData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Open Detail Drilldown
  const handleOpenDetailModal = (title: string, subtitle: string, records: TeacherKbmAttendance[]) => {
    setDetailModal({
      open: true,
      title,
      subtitle,
      records
    });
  };

  return (
    <Box sx={{ p: isEmbedded ? 0 : { xs: 1.5, sm: 2, md: 3 } }}>
      {/* Top progress bar (Hidden on print) */}
      {(loading || isProcessing) && (
        <Box className="no-print" sx={{ width: '100%', position: 'fixed', top: 0, left: 0, zIndex: 9999, '@media print': { display: 'none !important' } }}>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 4 }} />
        </Box>
      )}

      {/* ========================================================================= */}
      {/* WEB INTERFACE WRAPPER (HIDDEN ON PRINT / PDF EXPORT)                     */}
      {/* ========================================================================= */}
      <Box className="no-print">
        {/* Header Banner */}
        <Box sx={{ mb: { xs: 2, sm: 3 } }}>
          {isEmbedded ? (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 2.5 },
                borderRadius: 3,
                border: '1px solid #e2e8f0',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      p: 1.2,
                      bgcolor: 'primary.main',
                      color: '#ffffff',
                      borderRadius: 2.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 10px rgba(37,99,235,0.25)'
                    }}
                  >
                    <FactCheckIcon sx={{ fontSize: { xs: 24, sm: 30 } }} />
                  </Box>
                  <Box>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 800,
                        color: '#0f172a',
                        fontSize: { xs: '1.15rem', sm: '1.4rem', md: '1.6rem' },
                        lineHeight: 1.2
                      }}
                    >
                      Monitoring Kehadiran Guru
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.78rem', sm: '0.875rem' }, mt: 0.3 }}
                    >
                      Supervisi &amp; Rekapitulasi Keterisian Jam Pelajaran (JP) dan Jurnal KBM
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  label="Supervisi Kepala Sekolah &amp; Kurikulum"
                  color="primary"
                  variant="outlined"
                  size="small"
                  sx={{ fontWeight: 700, fontSize: '0.75rem', borderRadius: 2 }}
                />
              </Stack>
            </Paper>
          ) : (
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                <FactCheckIcon sx={{ color: 'primary.main', fontSize: 32 }} />
                Laporan Kehadiran KBM Guru
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pantau keterisian jam pelajaran (JP) di setiap rombongan belajar aktif (harian, mingguan, dan bulanan), aktivitas guru mengajar, serta sinkronisasi otomatis data rombel aktif.
              </Typography>
            </Box>
          )}
        </Box>

      {/* STATS OVERVIEW CARDS */}
      <Grid container spacing={{ xs: 1.2, sm: 2 }} sx={{ mb: { xs: 2, sm: 3 } }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', height: '100%' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: { xs: '0.65rem', sm: '0.72rem' }, display: 'block' }}>
              Total Rombel Aktif
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main', my: { xs: 0.3, sm: 0.5 }, fontSize: { xs: '1.35rem', sm: '1.75rem', md: '2rem' }, lineHeight: 1.2 }}>
              {summaryStats.activeRombels}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.72rem' } }}>
              Tersinkron otomatis
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', height: '100%' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: { xs: '0.65rem', sm: '0.72rem' }, display: 'block' }}>
              Total Sesi KBM
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'success.main', my: { xs: 0.3, sm: 0.5 }, fontSize: { xs: '1.35rem', sm: '1.75rem', md: '2rem' }, lineHeight: 1.2 }}>
              {summaryStats.totalSessions}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.72rem' } }}>
              Pertemuan KBM
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', height: '100%' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: { xs: '0.65rem', sm: '0.72rem' }, display: 'block' }}>
              Akumulasi Jam (JP)
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'info.main', my: { xs: 0.3, sm: 0.5 }, fontSize: { xs: '1.35rem', sm: '1.75rem', md: '2rem' }, lineHeight: 1.2 }}>
              {summaryStats.totalJp} <Typography component="span" variant="subtitle2" sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>JP</Typography>
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.72rem' } }}>
              Rata-rata {summaryStats.avgJpPerRombel} JP / rombel
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', height: '100%' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: { xs: '0.65rem', sm: '0.72rem' }, display: 'block' }}>
              Guru Mengajar
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'warning.main', my: { xs: 0.3, sm: 0.5 }, fontSize: { xs: '1.35rem', sm: '1.75rem', md: '2rem' }, lineHeight: 1.2 }}>
              {summaryStats.activeTeachers} <Typography component="span" variant="subtitle2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>/ {summaryStats.totalTeachers}</Typography>
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.72rem' } }}>
              Guru aktif periode ini
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* PERIOD & FILTER CARD */}
      <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', mb: { xs: 2, sm: 3 } }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
          {/* TOP BAR: PERIOD SELECTOR & ACTIONS */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' }, gap: 1.5, mb: 2 }}>
            {/* Period Mode Segmented Buttons */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.85rem', display: { xs: 'none', sm: 'block' } }}>
                Mode Rekap:
              </Typography>
              <ButtonGroup size="small" variant="outlined" sx={{ borderRadius: 2, width: { xs: '100%', sm: 'auto' }, display: 'flex' }}>
                <Button
                  variant={periodType === 'daily' ? 'contained' : 'outlined'}
                  startIcon={<TodayIcon />}
                  onClick={() => setPeriodType('daily')}
                  sx={{ flex: { xs: 1, sm: 'initial' }, textTransform: 'none', fontWeight: 700, py: 0.7, fontSize: { xs: '0.78rem', sm: '0.85rem' } }}
                >
                  Harian
                </Button>
                <Button
                  variant={periodType === 'weekly' ? 'contained' : 'outlined'}
                  startIcon={<DateRangeIcon />}
                  onClick={() => setPeriodType('weekly')}
                  sx={{ flex: { xs: 1, sm: 'initial' }, textTransform: 'none', fontWeight: 700, py: 0.7, fontSize: { xs: '0.78rem', sm: '0.85rem' } }}
                >
                  Mingguan
                </Button>
                <Button
                  variant={periodType === 'monthly' ? 'contained' : 'outlined'}
                  startIcon={<CalendarMonthIcon />}
                  onClick={() => setPeriodType('monthly')}
                  sx={{ flex: { xs: 1, sm: 'initial' }, textTransform: 'none', fontWeight: 700, py: 0.7, fontSize: { xs: '0.78rem', sm: '0.85rem' } }}
                >
                  Bulanan
                </Button>
              </ButtonGroup>
            </Box>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: { xs: 'calc(50% - 4px)', sm: 130 }, height: 36 }}>
                <InputLabel sx={{ fontSize: '0.78rem' }}>Kertas &amp; Arah</InputLabel>
                <Select
                  value={printOrientation}
                  label="Kertas & Arah"
                  onChange={(e) => setPrintOrientation(e.target.value as any)}
                  sx={{ borderRadius: 2, fontSize: '0.8rem', height: 36 }}
                >
                  <MenuItem value="auto">Auto ({effectiveOrientation === 'landscape' ? 'L' : 'P'})</MenuItem>
                  <MenuItem value="landscape">A4 Landscape</MenuItem>
                  <MenuItem value="portrait">A4 Portrait</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="contained"
                color="success"
                size="small"
                startIcon={<WhatsAppIcon />}
                onClick={handleOpenWaModal}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, height: 36, minWidth: { xs: 'calc(50% - 4px)', sm: 'auto' }, fontSize: { xs: '0.78rem', sm: '0.85rem' } }}
              >
                Kirim WA
              </Button>

              <Button
                variant="outlined"
                color="primary"
                size="small"
                startIcon={<ExcelIcon />}
                onClick={handleExportExcel}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, height: 36, flex: { xs: 1, sm: 'initial' }, fontSize: { xs: '0.75rem', sm: '0.85rem' } }}
              >
                Excel
              </Button>

              <Button
                variant="outlined"
                color="primary"
                size="small"
                startIcon={<ExcelIcon />}
                onClick={handleExportCsv}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, height: 36, flex: { xs: 1, sm: 'initial' }, fontSize: { xs: '0.75rem', sm: '0.85rem' } }}
                title="Export format CSV dengan kolom terpisah"
              >
                CSV
              </Button>

              <Button
                variant="outlined"
                size="small"
                startIcon={<PdfIcon />}
                onClick={handlePrintPdf}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, height: 36, flex: { xs: 1, sm: 'initial' }, fontSize: { xs: '0.75rem', sm: '0.85rem' } }}
              >
                Cetak / PDF
              </Button>

              <IconButton
                size="small"
                onClick={loadData}
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, height: 36, width: 36 }}
                title="Segarkan Data"
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {/* SECOND ROW: DATE NAVIGATOR & FILTERS */}
          <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ alignItems: 'center' }}>
            {/* DATE PICKER ACCORDING TO PERIOD */}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, width: '100%' }}>
                <IconButton size="small" onClick={handlePrevPeriod} sx={{ border: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                  <PrevIcon fontSize="small" />
                </IconButton>

                {periodType === 'daily' && (
                  <TextField
                    label="Tanggal Laporan"
                    type="date"
                    fullWidth
                    size="small"
                    value={filterDate}
                    onChange={e => setFilterDate(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={{ flex: 1, minWidth: 0 }}
                  />
                )}

                {periodType === 'weekly' && (
                  <TextField
                    label="Tanggal Acuan Minggu"
                    type="date"
                    fullWidth
                    size="small"
                    value={filterDate}
                    onChange={e => setFilterDate(e.target.value)}
                    helperText={`Rentang: ${weekRange.label}`}
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={{ flex: 1, minWidth: 0 }}
                  />
                )}

                {periodType === 'monthly' && (
                  <TextField
                    label="Bulan Laporan"
                    type="month"
                    fullWidth
                    size="small"
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                    helperText={`Rentang: 1 s/d ${monthRange.endDate.split('-')[2]} ${monthRange.monthName}`}
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={{ flex: 1, minWidth: 0 }}
                  />
                )}

                <IconButton size="small" onClick={handleNextPeriod} sx={{ border: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                  <NextIcon fontSize="small" />
                </IconButton>

                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleResetToToday}
                  sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap', minWidth: 'auto', px: 1, height: 36, borderRadius: 2 }}
                >
                  Hari Ini
                </Button>
              </Box>
            </Grid>

            {/* FILTER ROMBEL WITH SEARCH */}
            {activeTab !== 'guru' && (
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Autocomplete
                  size="small"
                  fullWidth
                  options={[
                    { value: 'all', label: `Semua Rombel (${rombels.length} Kelas)` },
                    ...rombels.map(r => ({
                      value: r.name,
                      label: `${r.name}${r.status === 'PKL' ? ' (PKL)' : ''}`
                    }))
                  ]}
                  getOptionLabel={(option) => (typeof option === 'string' ? option : option.label)}
                  isOptionEqualToValue={(option, val) =>
                    option.value === (typeof val === 'string' ? val : val.value)
                  }
                  value={
                    selectedRombel === 'all'
                      ? { value: 'all', label: `Semua Rombel (${rombels.length} Kelas)` }
                      : {
                          value: selectedRombel,
                          label:
                            rombels.find(r => r.name === selectedRombel)?.name +
                            (rombels.find(r => r.name === selectedRombel)?.status === 'PKL' ? ' (PKL)' : '') ||
                            selectedRombel
                        }
                  }
                  onChange={(_, newValue) => {
                    setSelectedRombel(newValue ? newValue.value : 'all');
                  }}
                  disableClearable
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Pilih / Cari Rombel"
                      placeholder="Cari rombel..."
                      sx={{
                        '& .MuiInputBase-root': {
                          bgcolor: isDark ? 'rgba(30, 41, 59, 0.8)' : '#ffffff',
                          color: preset.textColorPrimary,
                        },
                        '& .MuiInputLabel-root': { color: preset.textColorSecondary }
                      }}
                    />
                  )}
                />
              </Grid>
            )}

            {/* FILTER GURU WITH SEARCH */}
            {activeTab === 'guru' && (
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Autocomplete
                  size="small"
                  fullWidth
                  options={[
                    { value: 'all', label: `Semua Guru (${teachers.length} Orang)` },
                    ...teachers.map(t => ({
                      value: t.id,
                      label: `${t.name}${t.nip ? ` (NIP: ${t.nip})` : ''}`
                    }))
                  ]}
                  getOptionLabel={(option) => (typeof option === 'string' ? option : option.label)}
                  isOptionEqualToValue={(option, val) =>
                    option.value === (typeof val === 'string' ? val : val.value)
                  }
                  value={
                    selectedTeacher === 'all'
                      ? { value: 'all', label: `Semua Guru (${teachers.length} Orang)` }
                      : {
                          value: selectedTeacher,
                          label:
                            teachers.find(t => t.id === selectedTeacher)
                              ? `${teachers.find(t => t.id === selectedTeacher)?.name}${
                                  teachers.find(t => t.id === selectedTeacher)?.nip
                                    ? ` (NIP: ${teachers.find(t => t.id === selectedTeacher)?.nip})`
                                    : ''
                                }`
                              : selectedTeacher
                        }
                  }
                  onChange={(_, newValue) => {
                    setSelectedTeacher(newValue ? newValue.value : 'all');
                  }}
                  disableClearable
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Pilih / Cari Guru"
                      placeholder="Cari nama guru..."
                      sx={{
                        '& .MuiInputBase-root': {
                          bgcolor: isDark ? 'rgba(30, 41, 59, 0.8)' : '#ffffff',
                          color: preset.textColorPrimary,
                        },
                        '& .MuiInputLabel-root': { color: preset.textColorSecondary }
                      }}
                    />
                  )}
                />
              </Grid>
            )}

            {/* ACTIVE PERIOD LABEL CHIP & REALTIME TODAY INDICATOR */}
            <Grid size={{ xs: 12, sm: 12, md: 4 }}>
              <Box sx={{ bgcolor: 'action.hover', p: 1.2, borderRadius: 2, border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTimeIcon fontSize="small" color="primary" />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1, fontSize: '0.68rem' }}>
                      Periode ({periodType.toUpperCase()}):
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary', fontSize: { xs: '0.78rem', sm: '0.85rem' } }}>
                      {currentPeriodText}
                    </Typography>
                  </Box>
                </Box>
                {filterDate === format(new Date(), 'yyyy-MM-dd') && (
                  <Chip
                    label="HARI INI"
                    size="small"
                    color="success"
                    sx={{ height: 22, fontSize: '0.65rem', fontWeight: 800, borderRadius: 1.5 }}
                  />
                )}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* TAB NAVIGATION: REKAP ROMBEL vs REKAP GURU vs DETAIL SESI */}
      <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: { xs: 1, sm: 2 }, pt: 1, bgcolor: 'background.paper' }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              minHeight: 48,
              '& .MuiTab-root': {
                fontWeight: 700,
                textTransform: 'none',
                py: { xs: 1, sm: 1.2 },
                px: { xs: 1.2, sm: 2.2 },
                fontSize: { xs: '0.78rem', sm: '0.875rem' },
                minHeight: 48
              }
            }}
          >
            <Tab
              value="rombel"
              icon={<ClassIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label={`Rekap Rombel (${periodType === 'daily' ? 'Matrix JP' : 'Rekapitulasi'})`}
            />
            <Tab
              value="guru"
              icon={<PersonIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label={`Rekap Guru (${teacherSummary.filter(t => t.totalJp > 0).length} Hadir)`}
            />
            <Tab
              value="detail"
              icon={<FactCheckIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label={`Detail Sesi (${attendanceList.length})`}
            />
          </Tabs>
        </Box>

        <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
          {/* TAB 1: REKAP KEHADIRAN ROMBEL */}
          {activeTab === 'rombel' && (
            <Box>
              {/* SUB-VIEW 1A: HARIAN (MATRIX JP 1..10) */}
              {periodType === 'daily' && (
                <Box>
                  <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: { xs: '0.78rem', sm: '0.875rem' } }}>
                      Matrix keterisian JP per rombel tanggal <strong>{filterDate}</strong>:
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Stack direction="row" spacing={0.8} sx={{ flexWrap: 'wrap' }}>
                        <Chip label="Hijau: Guru Hadir" size="small" sx={{ bgcolor: 'rgba(34, 197, 94, 0.15)', color: 'success.dark', fontWeight: 600, fontSize: '0.68rem', height: 22 }} />
                        <Chip label="Abu: Kosong" size="small" sx={{ bgcolor: 'action.hover', fontWeight: 600, fontSize: '0.68rem', height: 22 }} />
                      </Stack>
                      <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
                        <ToggleButtonGroup
                          size="small"
                          value={mobileViewMode}
                          exclusive
                          onChange={(_, val) => val && setMobileViewMode(val)}
                          sx={{ height: 26 }}
                        >
                          <ToggleButton value="cards" sx={{ textTransform: 'none', px: 1, fontSize: '0.7rem', fontWeight: 700 }}>
                            🗂️ Kartu
                          </ToggleButton>
                          <ToggleButton value="table" sx={{ textTransform: 'none', px: 1, fontSize: '0.7rem', fontWeight: 700 }}>
                            📊 Tabel
                          </ToggleButton>
                        </ToggleButtonGroup>
                      </Box>
                    </Box>
                  </Box>

                  {/* SMARTPHONE CARD VIEW FOR DAILY MATRIX */}
                  <Box sx={{ display: { xs: mobileViewMode === 'cards' ? 'block' : 'none', md: 'none' } }}>
                    {rombelMatrix.length === 0 ? (
                      <Paper elevation={0} sx={{ p: 3, textAlign: 'center', borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
                        <Typography variant="body2" color="text.secondary">Tidak ada data rombel ditemukan.</Typography>
                      </Paper>
                    ) : (
                      <Stack spacing={1.5}>
                        {rombelMatrix.map((rm) => {
                          const periods = activeDaySchedule.periods.filter(p => p.category_name.toUpperCase() !== 'ISTIRAHAT');
                          const fillPercent = periods.length > 0 ? Math.round((rm.filledCount / periods.length) * 100) : 0;

                          return (
                            <Paper
                              key={rm.rombelName}
                              elevation={0}
                              sx={{
                                p: 1.8,
                                borderRadius: 2.5,
                                border: '1px solid #e2e8f0',
                                bgcolor: '#ffffff',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                              }}
                            >
                              {/* Header: Class & Status */}
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                <Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                    <SchoolIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                                      {rm.rombelName}
                                    </Typography>
                                  </Box>
                                  {rm.gradeLevel && (
                                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.2 }}>
                                      Tingkat {rm.gradeLevel}
                                    </Typography>
                                  )}
                                </Box>

                                {rm.emptyCount === 0 ? (
                                  <Chip
                                    label="Lengkap (100%)"
                                    color="success"
                                    size="small"
                                    sx={{ fontWeight: 800, fontSize: '0.68rem', height: 24, borderRadius: 1.5 }}
                                  />
                                ) : (
                                  <Chip
                                    label={`${rm.emptyCount} Kosong`}
                                    color={rm.filledCount === 0 ? 'error' : 'warning'}
                                    size="small"
                                    sx={{ fontWeight: 800, fontSize: '0.68rem', height: 24, borderRadius: 1.5 }}
                                  />
                                )}
                              </Box>

                              {/* Progress bar */}
                              <Box sx={{ mb: 1.2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                                  <Typography variant="caption" sx={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                                    Keterisian Jam Pelajaran
                                  </Typography>
                                  <Typography variant="caption" sx={{ fontSize: '0.68rem', color: '#0f172a', fontWeight: 800 }}>
                                    {rm.filledCount} / {periods.length} JP ({fillPercent}%)
                                  </Typography>
                                </Box>
                                <LinearProgress
                                  variant="determinate"
                                  value={fillPercent}
                                  color={fillPercent === 100 ? 'success' : fillPercent >= 50 ? 'primary' : 'warning'}
                                  sx={{ height: 6, borderRadius: 3, bgcolor: '#f1f5f9' }}
                                />
                              </Box>

                              {/* Grid of JP items */}
                              <Grid container spacing={0.8}>
                                {periods.map((p) => {
                                  const status = rm.jpStatus[p.jp_number];
                                  const isFilled = status && status.filled;

                                  return (
                                    <Grid size={{ xs: 6, sm: 4 }} key={p.jp_number}>
                                      <Box
                                        sx={{
                                          p: 0.8,
                                          borderRadius: 2,
                                          border: '1px solid',
                                          borderColor: isFilled ? '#bbf7d0' : '#e2e8f0',
                                          bgcolor: isFilled ? '#f0fdf4' : '#f8fafc',
                                          height: '100%',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          justifyContent: 'space-between'
                                        }}
                                      >
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.4 }}>
                                          <Chip
                                            label={`JP ${p.jp_number}`}
                                            size="small"
                                            sx={{
                                              height: 18,
                                              fontSize: '0.62rem',
                                              fontWeight: 800,
                                              bgcolor: isFilled ? '#dcfce7' : '#e2e8f0',
                                              color: isFilled ? '#166534' : '#64748b'
                                            }}
                                          />
                                          <Typography variant="caption" sx={{ fontSize: '0.62rem', color: '#64748b' }}>
                                            {p.start_time}
                                          </Typography>
                                        </Box>

                                        {isFilled ? (
                                          <Box>
                                            <Typography
                                              variant="body2"
                                              sx={{
                                                fontWeight: 700,
                                                color: '#166534',
                                                fontSize: '0.73rem',
                                                lineHeight: 1.2,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                              }}
                                            >
                                              {status.teacherName}
                                            </Typography>
                                            <Typography
                                              variant="caption"
                                              sx={{
                                                color: '#15803d',
                                                fontSize: '0.65rem',
                                                display: 'block',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                              }}
                                            >
                                              {status.subject}
                                            </Typography>
                                          </Box>
                                        ) : (
                                          <Typography variant="caption" sx={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.65rem' }}>
                                            Kosong
                                          </Typography>
                                        )}
                                      </Box>
                                    </Grid>
                                  );
                                })}
                              </Grid>
                            </Paper>
                          );
                        })}
                      </Stack>
                    )}
                  </Box>

                  {/* TABLE VIEW (ALWAYS ON DESKTOP/LAPTOP, TOGGLEABLE ON MOBILE) */}
                  <Box sx={{ display: { xs: mobileViewMode === 'table' ? 'block' : 'none', md: 'block' } }}>
                    {/* Swipe indicator for mobile */}
                    <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 0.8, mb: 1.5, px: 1.5, py: 0.6, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', color: '#475569' }}>
                      <Typography variant="caption" sx={{ fontSize: '0.72rem', fontWeight: 600 }}>
                        👉 <b>Geser tabel ke samping</b> untuk melihat seluruh JP di layar smartphone
                      </Typography>
                    </Box>

                    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                      <Table size="small" sx={{ minWidth: 800 }}>
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                          <TableRow>
                            <TableCell
                              sx={{
                                fontWeight: 800,
                                width: { xs: 120, sm: 140 },
                                position: 'sticky',
                                left: 0,
                                bgcolor: '#f1f5f9',
                                zIndex: 4,
                                borderRight: '2px solid #cbd5e1'
                              }}
                            >
                              Rombel
                            </TableCell>
                            {activeDaySchedule.periods
                              .filter(p => p.category_name.toUpperCase() !== 'ISTIRAHAT')
                              .map(p => (
                                <TableCell key={p.jp_number} sx={{ fontWeight: 800, textAlign: 'center', minWidth: 80 }}>
                                  JP {p.jp_number}
                                  <Typography variant="caption" sx={{ display: 'block', fontSize: '0.65rem', color: 'text.secondary' }}>
                                    {p.start_time}
                                  </Typography>
                                </TableCell>
                              ))}
                            <TableCell sx={{ fontWeight: 800, textAlign: 'center', width: 120 }}>Status KBM</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {rombelMatrix.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={activeDaySchedule.periods.length + 2} sx={{ textAlign: 'center', py: 4 }}>
                                Tidak ada data rombel ditemukan.
                              </TableCell>
                            </TableRow>
                          ) : (
                            rombelMatrix.map(rm => {
                              const periods = activeDaySchedule.periods.filter(p => p.category_name.toUpperCase() !== 'ISTIRAHAT');
                              return (
                                <TableRow key={rm.rombelName} hover>
                                  <TableCell
                                    sx={{
                                      fontWeight: 800,
                                      position: 'sticky',
                                      left: 0,
                                      bgcolor: '#ffffff',
                                      zIndex: 2,
                                      borderRight: '2px solid #e2e8f0',
                                      boxShadow: '2px 0 6px rgba(0,0,0,0.04)'
                                    }}
                                  >
                                    {rm.rombelName}
                                    {rm.gradeLevel && (
                                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.7rem' }}>
                                        Tingkat {rm.gradeLevel}
                                      </Typography>
                                    )}
                                  </TableCell>

                                  {periods.map(p => {
                                    const status = rm.jpStatus[p.jp_number];
                                    if (status && status.filled) {
                                      return (
                                        <TableCell key={p.jp_number} sx={{ textAlign: 'center', bgcolor: 'rgba(34, 197, 94, 0.08)' }}>
                                          <Tooltip title={`${status.teacherName} - ${status.subject} ${status.topic ? `(${status.topic})` : ''}`}>
                                            <Box sx={{ p: 0.5, borderRadius: 1 }}>
                                              <Typography variant="caption" sx={{ fontWeight: 700, color: 'success.dark', display: 'block', fontSize: '0.7rem', lineHeight: 1.2 }}>
                                                {status.teacherName?.split(' ')[0]}
                                              </Typography>
                                              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {status.subject}
                                              </Typography>
                                            </Box>
                                          </Tooltip>
                                        </TableCell>
                                      );
                                    }
                                    return (
                                      <TableCell key={p.jp_number} sx={{ textAlign: 'center', bgcolor: 'action.hover', opacity: 0.6 }}>
                                        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', fontStyle: 'italic' }}>
                                          Kosong
                                        </Typography>
                                      </TableCell>
                                    );
                                  })}

                                  <TableCell sx={{ textAlign: 'center' }}>
                                    {rm.emptyCount === 0 ? (
                                      <Chip label="Lengkap" color="success" size="small" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                                    ) : (
                                      <Chip
                                        label={`${rm.emptyCount} JP Kosong`}
                                        color={rm.filledCount === 0 ? 'error' : 'warning'}
                                        size="small"
                                        sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                                      />
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </Box>
              )}

              {/* SUB-VIEW 1B: MINGGUAN & BULANAN (REKAPITULASI KBM ROMBEL) */}
              {periodType !== 'daily' && (
                <Box>
                  <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: { xs: '0.78rem', sm: '0.875rem' } }}>
                      Rekapitulasi Keterisian Jam Pelajaran Rombongan Belajar ({currentPeriodText}):
                    </Typography>
                    <Chip
                      label={`${rombelAggregate.length} Rombel Terpantau`}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 700, height: 24, fontSize: '0.72rem' }}
                    />
                  </Box>

                  {/* Swipe indicator for mobile */}
                  <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 0.8, mb: 1.5, px: 1.5, py: 0.6, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', color: '#475569' }}>
                    <Typography variant="caption" sx={{ fontSize: '0.72rem', fontWeight: 600 }}>
                      👉 <b>Geser tabel ke samping</b> untuk melihat detail sesi dan guru pengajar
                    </Typography>
                  </Box>

                  <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                    <Table size="small" sx={{ minWidth: 800 }}>
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 800, width: 50 }}>No</TableCell>
                          <TableCell
                            sx={{
                              fontWeight: 800,
                              position: 'sticky',
                              left: 0,
                              bgcolor: '#f1f5f9',
                              zIndex: 4,
                              borderRight: '2px solid #cbd5e1',
                              minWidth: 160
                            }}
                          >
                            Rombongan Belajar
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Wali Kelas</TableCell>
                          <TableCell sx={{ fontWeight: 800, textAlign: 'center' }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 800, textAlign: 'center' }}>Sesi KBM</TableCell>
                          <TableCell sx={{ fontWeight: 800, textAlign: 'center' }}>Akumulasi JP</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Guru Pengajar</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Mata Pelajaran</TableCell>
                          <TableCell sx={{ fontWeight: 800, textAlign: 'center', width: 90 }}>Aksi</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rombelAggregate.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} sx={{ textAlign: 'center', py: 4 }}>
                              Tidak ada data rombongan belajar ditemukan.
                            </TableCell>
                          </TableRow>
                        ) : (
                          rombelAggregate.map((r, idx) => (
                            <TableRow key={r.rombelName} hover>
                              <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>{idx + 1}</TableCell>
                              <TableCell
                                sx={{
                                  fontWeight: 800,
                                  position: 'sticky',
                                  left: 0,
                                  bgcolor: '#ffffff',
                                  zIndex: 2,
                                  borderRight: '2px solid #e2e8f0',
                                  boxShadow: '2px 0 6px rgba(0,0,0,0.04)'
                                }}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <SchoolIcon sx={{ color: 'primary.main', fontSize: 18 }} />
                                  <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{r.rombelName}</Typography>
                                    {r.gradeLevel && (
                                      <Typography variant="caption" color="text.secondary">Tingkat {r.gradeLevel}</Typography>
                                    )}
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                                {r.waliKelas}
                              </TableCell>
                              <TableCell sx={{ textAlign: 'center' }}>
                                <Chip
                                  label={r.status}
                                  size="small"
                                  color={r.status === 'AKTIF' ? 'success' : 'default'}
                                  variant="outlined"
                                  sx={{ fontWeight: 700, fontSize: '0.65rem', height: 22 }}
                                />
                              </TableCell>
                              <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>
                                <Chip
                                  label={`${r.totalSessions} Sesi`}
                                  size="small"
                                  color={r.totalSessions > 0 ? 'primary' : 'default'}
                                  sx={{ fontWeight: 700, height: 22, fontSize: '0.72rem' }}
                                />
                              </TableCell>
                              <TableCell sx={{ textAlign: 'center', fontWeight: 800 }}>
                                <Typography variant="body2" sx={{ fontWeight: 800, color: r.totalJp > 0 ? 'primary.main' : 'text.disabled' }}>
                                  {r.totalJp} JP
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ maxWidth: 220 }}>
                                {r.teachers.length > 0 ? (
                                  <Typography variant="caption" sx={{ display: 'block', color: 'text.primary', fontWeight: 600 }}>
                                    {r.teachers.slice(0, 3).join(', ')}
                                    {r.teachers.length > 3 && ` (+${r.teachers.length - 3} lainnya)`}
                                  </Typography>
                                ) : (
                                  <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>Belum ada sesi</Typography>
                                )}
                              </TableCell>
                              <TableCell sx={{ maxWidth: 200 }}>
                                {r.subjects.length > 0 ? (
                                  <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                                    {r.subjects.slice(0, 2).join(', ')}
                                    {r.subjects.length > 2 && ` (+${r.subjects.length - 2})`}
                                  </Typography>
                                ) : (
                                  <Typography variant="caption" sx={{ color: 'text.disabled' }}>-</Typography>
                                )}
                              </TableCell>
                              <TableCell sx={{ textAlign: 'center' }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<ViewIcon sx={{ fontSize: '14px !important' }} />}
                                  onClick={() => handleOpenDetailModal(`Rincian KBM: ${r.rombelName}`, `Periode ${currentPeriodText}`, r.records)}
                                  disabled={r.records.length === 0}
                                  sx={{ textTransform: 'none', fontSize: '0.7rem', py: 0.2, px: 1, borderRadius: 2 }}
                                >
                                  Detail
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          )}

          {/* TAB 2: REKAP KEHADIRAN GURU */}
          {activeTab === 'guru' && (
            <Box>
              <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: { xs: '0.78rem', sm: '0.875rem' } }}>
                  Rekapitulasi Jam Mengajar Guru ({currentPeriodText}):
                </Typography>
                <Chip
                  label={`${teacherSummary.filter(t => t.totalJp > 0).length} Guru Aktif Hadir`}
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{ fontWeight: 700, height: 24, fontSize: '0.72rem' }}
                />
              </Box>

              {/* Swipe indicator for mobile */}
              <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 0.8, mb: 1.5, px: 1.5, py: 0.6, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', color: '#475569' }}>
                <Typography variant="caption" sx={{ fontSize: '0.72rem', fontWeight: 600 }}>
                  👉 <b>Geser tabel ke samping</b> untuk melihat NIP, wali kelas, dan akumulasi JP
                </Typography>
              </Box>

              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                <Table size="small" sx={{ minWidth: 720 }}>
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, width: 44, fontSize: '0.74rem', textAlign: 'center' }}>No</TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 800,
                          position: 'sticky',
                          left: 0,
                          bgcolor: '#f1f5f9',
                          zIndex: 4,
                          borderRight: '2px solid #cbd5e1',
                          minWidth: 160,
                          maxWidth: 220,
                          fontSize: '0.74rem'
                        }}
                      >
                        Nama Guru
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.74rem' }}>NIP</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.74rem' }}>Wali Kelas</TableCell>
                      <TableCell sx={{ fontWeight: 800, textAlign: 'center', fontSize: '0.74rem' }}>Total JP</TableCell>
                      <TableCell sx={{ fontWeight: 800, textAlign: 'center', fontSize: '0.74rem' }}>Jumlah Sesi</TableCell>
                      <TableCell sx={{ fontWeight: 800, textAlign: 'center', fontSize: '0.74rem' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 800, textAlign: 'center', width: 75, fontSize: '0.74rem' }}>Rincian</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {teacherSummary.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4, fontSize: '0.8rem' }}>
                          Tidak ada data guru ditemukan.
                        </TableCell>
                      </TableRow>
                    ) : (
                      teacherSummary.map((t, idx) => (
                        <TableRow key={t.teacherId} hover>
                          <TableCell sx={{ fontWeight: 700, color: 'text.secondary', textAlign: 'center', fontSize: '0.75rem', p: '6px 4px' }}>{idx + 1}</TableCell>
                          <TableCell
                            sx={{
                              fontWeight: 700,
                              position: 'sticky',
                              left: 0,
                              bgcolor: '#ffffff',
                              zIndex: 2,
                              borderRight: '2px solid #e2e8f0',
                              boxShadow: '2px 0 6px rgba(0,0,0,0.04)',
                              p: '6px 8px',
                              maxWidth: 220
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                              <PersonIcon sx={{ color: 'primary.main', fontSize: 16, flexShrink: 0 }} />
                              <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 700,
                                    fontSize: '0.78rem',
                                    lineHeight: 1.25,
                                    color: '#0f172a'
                                  }}
                                >
                                  {t.teacherName}
                                </Typography>
                                {t.whatsapp && (
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: 'success.dark',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 0.3,
                                      fontSize: '0.68rem',
                                      mt: 0.2
                                    }}
                                  >
                                    <WhatsAppIcon sx={{ fontSize: 11 }} /> {t.whatsapp}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ color: 'text.secondary', fontSize: '0.74rem', p: '6px 8px' }}>{t.nip || '-'}</TableCell>
                          <TableCell sx={{ p: '6px 8px' }}>
                            {t.waliKelasOf && t.waliKelasOf !== '-' ? (
                              <Chip label={`Wali: ${t.waliKelasOf}`} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.7rem', height: 20 }} />
                            ) : (
                              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.72rem' }}>-</Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center', fontWeight: 800, p: '6px 8px' }}>
                            <Chip
                              label={`${t.totalJp} JP`}
                              color={t.totalJp > 0 ? 'primary' : 'default'}
                              size="small"
                              sx={{ fontWeight: 700, height: 20, fontSize: '0.7rem' }}
                            />
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, p: '6px 8px' }}>{t.recordCount} Sesi</TableCell>
                          <TableCell sx={{ textAlign: 'center', p: '6px 8px' }}>
                            {t.totalJp > 0 ? (
                              <Chip label="Aktif" color="success" size="small" sx={{ fontSize: '0.65rem', fontWeight: 700, height: 18 }} />
                            ) : (
                              <Chip label="Belum Mengisi" size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />
                            )}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center', p: '6px 8px' }}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleOpenDetailModal(`Rincian Pertemuan: ${t.teacherName}`, `Periode ${currentPeriodText}`, t.records)}
                              disabled={t.records.length === 0}
                              sx={{ textTransform: 'none', fontSize: '0.68rem', py: 0.2, px: 0.8, borderRadius: 1.5, minWidth: 'auto' }}
                            >
                              Lihat
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* TAB 3: DETAIL SESI PRESENSI */}
          {activeTab === 'detail' && (
            <Box>
              {/* Swipe indicator for mobile */}
              <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 0.8, mb: 1.5, px: 1.5, py: 0.6, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', color: '#475569' }}>
                <Typography variant="caption" sx={{ fontSize: '0.72rem', fontWeight: 600 }}>
                  👉 <b>Geser tabel ke samping</b> untuk melihat topik materi, lokasi GPS &amp; verifikasi QR
                </Typography>
              </Box>

              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                <Table size="small" sx={{ minWidth: 750 }}>
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Waktu / Tanggal</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Nama Guru</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Kelas & Mapel</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>JP</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Materi / Topik</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Verifikasi Lokasi & Siswa</TableCell>
                      <TableCell sx={{ fontWeight: 800, width: 80, textAlign: 'center' }}>Aksi</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {attendanceList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                          Belum ada catatan presensi KBM pada periode {currentPeriodText}.
                        </TableCell>
                      </TableRow>
                    ) : (
                      attendanceList.map(a => (
                        <TableRow key={a.id} hover>
                          <TableCell sx={{ fontSize: '0.8rem' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatWIBDateDDMMYYYY(a.date)}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {a.created_at ? new Date(a.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>
                            {a.teacher_name}
                            {a.nip && <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>NIP: {a.nip}</Typography>}
                          </TableCell>
                          <TableCell>
                            <Chip label={a.rombel_id} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700, mr: 0.5 }} />
                            <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>{a.subject}</Typography>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>
                            {a.jp_list && a.jp_list.length > 0 ? (
                              <Chip label={`JP ${a.jp_list.join(', ')}`} size="small" sx={{ fontWeight: 700 }} />
                            ) : (
                              <Chip label={`JP ${a.jp_start}-${a.jp_end}`} size="small" sx={{ fontWeight: 700 }} />
                            )}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                            {a.topic || '-'}
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                              <Chip
                                icon={<LocationOnIcon sx={{ fontSize: '14px !important' }} />}
                                label={a.location_distance ? `${Math.round(a.location_distance)}m (Valid)` : 'Lokasi Terverifikasi'}
                                size="small"
                                color="success"
                                sx={{ fontSize: '0.65rem' }}
                              />
                              <Chip
                                icon={<QrCodeScannerIcon sx={{ fontSize: '14px !important' }} />}
                                label={`${a.verified_students?.length || 0} Siswa Discan`}
                                size="small"
                                color="info"
                                sx={{ fontSize: '0.65rem' }}
                              />
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            <IconButton size="small" color="error" onClick={() => handleDeleteRecord(a.id)} title="Hapus sesi presensi">
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* POPUP MODAL DRILLDOWN DETAIL SESI */}
      <Dialog
        open={detailModal.open}
        onClose={() => setDetailModal(prev => ({ ...prev, open: false }))}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 0.5, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          {detailModal.title}
        </DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 1.5, sm: 2.5 } }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontSize: { xs: '0.78rem', sm: '0.875rem' } }}>
            {detailModal.subtitle} - Total {detailModal.records.length} Pertemuan KBM
          </Typography>

          {/* Swipe indicator for mobile */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 0.8, mb: 1.5, px: 1.5, py: 0.6, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', color: '#475569' }}>
            <Typography variant="caption" sx={{ fontSize: '0.72rem', fontWeight: 600 }}>
              👉 <b>Geser tabel ke samping</b> untuk melihat materi dan verifikasi siswa
            </Typography>
          </Box>

          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
            <Table size="small" sx={{ minWidth: 640 }}>
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Tanggal</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Guru</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Kelas &amp; Mapel</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Jam (JP)</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Materi Pembelajaran</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Verifikasi Siswa</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detailModal.records.map(r => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>{formatWIBDateDDMMYYYY(r.date)}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{r.teacher_name}</TableCell>
                    <TableCell>
                      <Chip label={r.rombel_id} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700, mr: 0.5 }} />
                      {r.subject}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      {r.jp_list && r.jp_list.length > 0 ? `JP ${r.jp_list.join(', ')}` : `JP ${r.jp_start}-${r.jp_end}`}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{r.topic || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        icon={<QrCodeScannerIcon sx={{ fontSize: '13px !important' }} />}
                        label={`${r.verified_students?.length || 0} Siswa`}
                        size="small"
                        color="info"
                        sx={{ fontSize: '0.65rem' }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDetailModal(prev => ({ ...prev, open: false }))} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Tutup
          </Button>
        </DialogActions>
      </Dialog>

      {/* WHATSAPP MODAL */}
      <Dialog open={waModalOpen} onClose={() => setWaModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WhatsAppIcon color="success" />
          Kirim Rekap Ke WhatsApp ({periodType.toUpperCase()})
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Nomor Tujuan (Opsional)"
              placeholder="Contoh: 628123456789 atau kosongkan untuk memilih kontak/grup"
              size="small"
              fullWidth
              value={waTargetNumber}
              onChange={e => setWaTargetNumber(e.target.value)}
              helperText="Jika dikosongkan, Anda dapat memilih kontak atau grup WhatsApp langsung di aplikasi WhatsApp"
            />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Pratinjau Pesan WhatsApp:
            </Typography>
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                {waMessagePreview}
              </Typography>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setWaModalOpen(false)} sx={{ textTransform: 'none' }}>
            Batal
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<WhatsAppIcon />}
            onClick={handleSendWa}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            Buka WhatsApp & Kirim
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODERN POPUP MODAL FEEDBACK */}
      <Dialog
        open={resultPopup.open}
        onClose={() => setResultPopup(prev => ({ ...prev, open: false }))}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: 3, p: 1, textAlign: 'center' }
          }
        }}
      >
        <DialogContent>
          <Box sx={{ my: 1 }}>
            <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main', mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
              {resultPopup.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {resultPopup.message}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button
            variant="contained"
            onClick={() => setResultPopup(prev => ({ ...prev, open: false }))}
            sx={{ borderRadius: 2, px: 4, textTransform: 'none', fontWeight: 700 }}
          >
            Selesai
          </Button>
        </DialogActions>
      </Dialog>
      </Box>

      {/* ========================================================================= */}
      {/* CETAK / PDF KHUSUS PRINTABLE AREA (A4 RAPI, TERSTRUKTUR & TIDAK TERPOTONG)*/}
      {/* ========================================================================= */}
      {typeof document !== 'undefined' && document.getElementById('print-root') ? (
        createPortal(
          <Box
            id="printable-area"
            sx={{
              display: 'block',
              width: '100%',
              backgroundColor: '#ffffff',
              color: '#000000',
              p: 0,
              m: 0
            }}
          >
        <style>{`
          @media print {
            @page {
              size: A4 ${effectiveOrientation};
              margin: 10mm 10mm 12mm 10mm;
            }
            *, *::before, *::after {
              box-sizing: border-box !important;
            }
            body, html {
              margin: 0 !important;
              padding: 0 !important;
              background-color: #ffffff !important;
              color: #000000 !important;
              font-family: Arial, Helvetica, sans-serif !important;
              width: 100% !important;
              font-size: 8pt !important;
            }
            .no-print, .no-print *, .MuiLinearProgress-root, .MuiCircularProgress-root, [role="progressbar"], [class*="LinearProgress"], [class*="CircularProgress"] {
              display: none !important;
              visibility: hidden !important;
              opacity: 0 !important;
              height: 0 !important;
              width: 0 !important;
            }
            #printable-area {
              display: block !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .print-kop-container {
              text-align: center;
              border-bottom: 3px double #000000;
              padding-bottom: 8px;
              margin-bottom: 12px;
            }
            .print-school-title {
              font-size: 13pt;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin: 0;
              line-height: 1.2;
            }
            .print-school-sub {
              font-size: 8pt;
              color: #333333;
              margin: 3px 0 0 0;
            }
            .print-doc-header {
              text-align: center;
              margin-bottom: 12px;
            }
            .print-doc-header h3 {
              font-size: 11pt;
              font-weight: 800;
              text-transform: uppercase;
              text-decoration: underline;
              margin: 0 0 3px 0;
            }
            .print-doc-header p {
              font-size: 8.5pt;
              font-weight: 600;
              margin: 0;
            }
            .print-summary-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 8px;
              margin-bottom: 12px;
            }
            .print-summary-card {
              border: 1px solid #94a3b8;
              background-color: #f8fafc !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              padding: 6px 8px;
              border-radius: 4px;
              text-align: center;
            }
            .print-summary-card .label {
              font-size: 7pt;
              font-weight: 700;
              text-transform: uppercase;
              color: #475569;
              display: block;
              margin-bottom: 2px;
            }
            .print-summary-card .value {
              font-size: 11pt;
              font-weight: 800;
              color: #0f172a;
            }
            .print-table {
              width: 100% !important;
              max-width: 100% !important;
              border-collapse: collapse !important;
              page-break-inside: auto !important;
              table-layout: fixed !important;
              margin-bottom: 14px;
            }
            .print-table tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .print-table th, .print-table td {
              border: 1px solid #475569 !important;
              padding: ${effectiveOrientation === 'landscape' ? '3px 4px' : '4px 6px'} !important;
              font-size: ${effectiveOrientation === 'landscape' ? (activeTab === 'rombel' && periodType === 'daily' ? '6.8pt' : '7.5pt') : '8pt'} !important;
              line-height: 1.2 !important;
              word-break: break-word !important;
              overflow-wrap: break-word !important;
              box-sizing: border-box !important;
              text-align: left;
            }
            .print-table th {
              background-color: #e2e8f0 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              color: #0f172a !important;
              font-weight: 800 !important;
              text-align: center !important;
              text-transform: uppercase;
            }
            .cell-filled {
              background-color: #f0fdf4 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              color: #14532d !important;
            }
            .cell-empty {
              background-color: #fef2f2 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              color: #991b1b !important;
              text-align: center;
              font-weight: 600;
            }
            thead {
              display: table-header-group !important;
            }
            tfoot {
              display: table-footer-group !important;
            }
            .print-signatures-box {
              margin-top: 18px;
              display: flex;
              justify-content: space-between;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              padding: 0 20px;
            }
            .print-sig-column {
              text-align: center;
              width: 240px;
            }
          }
        `}</style>

        {/* KOP RESMI LAPORAN SEKOLAH */}
        <Box className="print-kop-container">
          <Typography className="print-school-title">
            {schoolSettings?.websiteName || schoolSettings?.school_name || 'LAPORAN AKADEMIK & KEGIATAN BELAJAR MENGAJAR'}
          </Typography>
          <Typography className="print-school-sub">
            {schoolSettings?.schoolAddress || schoolSettings?.address || 'Sistem Informasi Manajemen Presensi & KBM Digital'}
            {schoolSettings?.schoolPhone ? ` | Telp: ${schoolSettings.schoolPhone}` : ''}
          </Typography>
        </Box>

        {/* JUDUL DOKUMEN & SUBJUDUL */}
        <Box className="print-doc-header">
          <Typography component="h3" sx={{ fontWeight: 800 }}>
            {activeTab === 'rombel'
              ? (periodType === 'daily' ? 'REKAP KETERISIAN JAM PELAJARAN (JP) HARIAN PER ROMBEL' : 'REKAPITULASI KBM PER ROMBONGAN BELAJAR')
              : activeTab === 'guru'
              ? 'REKAPITULASI KEHADIRAN & DISTRIBUSI MENGAJAR GURU'
              : 'LOG RINCIAN DETAIL JURNAL & PRESENSI KBM GURU'}
          </Typography>
          <Typography component="p">
            Periode: {currentPeriodText} | Dicetak: {format(new Date(), 'EEEE, dd MMMM yyyy HH:mm', { locale: id })} WIB
          </Typography>
        </Box>

        {/* RINGKASAN STATISTIK RESMI */}
        <Box className="print-summary-grid">
          {activeTab === 'rombel' && (
            <>
              <Box className="print-summary-card">
                <span className="label">Total Rombel Aktif</span>
                <span className="value">{summaryStats.activeRombels} Kelas</span>
              </Box>
              <Box className="print-summary-card">
                <span className="label">Total Sesi Terlaksana</span>
                <span className="value">{summaryStats.totalSessions} Sesi</span>
              </Box>
              <Box className="print-summary-card">
                <span className="label">Akumulasi Jam (JP)</span>
                <span className="value">{summaryStats.totalJp} JP</span>
              </Box>
              <Box className="print-summary-card">
                <span className="label">Guru Pengajar Bertugas</span>
                <span className="value">{summaryStats.activeTeachers} / {summaryStats.totalTeachers} Guru</span>
              </Box>
            </>
          )}

          {activeTab === 'guru' && (
            <>
              <Box className="print-summary-card">
                <span className="label">Total Guru Terdaftar</span>
                <span className="value">{summaryStats.totalTeachers} Guru</span>
              </Box>
              <Box className="print-summary-card">
                <span className="label">Guru Aktif Mengajar</span>
                <span className="value">{summaryStats.activeTeachers} Guru</span>
              </Box>
              <Box className="print-summary-card">
                <span className="label">Total Sesi KBM</span>
                <span className="value">{summaryStats.totalSessions} Sesi</span>
              </Box>
              <Box className="print-summary-card">
                <span className="label">Total Akumulasi JP</span>
                <span className="value">{summaryStats.totalJp} JP</span>
              </Box>
            </>
          )}

          {activeTab === 'detail' && (
            <>
              <Box className="print-summary-card">
                <span className="label">Total Record Log</span>
                <span className="value">{attendanceList.length} Record</span>
              </Box>
              <Box className="print-summary-card">
                <span className="label">Akumulasi Jam (JP)</span>
                <span className="value">{summaryStats.totalJp} JP</span>
              </Box>
              <Box className="print-summary-card">
                <span className="label">Rombel Tercover</span>
                <span className="value">{summaryStats.activeRombels} Rombel</span>
              </Box>
              <Box className="print-summary-card">
                <span className="label">Guru Pengajar</span>
                <span className="value">{summaryStats.activeTeachers} Guru</span>
              </Box>
            </>
          )}
        </Box>

        {/* TABEL SESUAI PILIHAN LAPORAN */}
        {activeTab === 'rombel' && periodType === 'daily' && (
          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: '25px' }}>No</th>
                <th style={{ width: '130px' }}>Rombongan Belajar</th>
                <th style={{ width: '45px' }}>Tkt</th>
                <th style={{ width: '110px' }}>Wali Kelas</th>
                <th style={{ width: '35px' }}>Total</th>
                <th style={{ width: '35px' }}>Terisi</th>
                <th style={{ width: '35px' }}>Ksg</th>
                <th style={{ width: '40px' }}>%</th>
                {activeDaySchedule.periods
                  .filter(p => p.category_name.toUpperCase() !== 'ISTIRAHAT')
                  .map(p => (
                    <th key={p.jp_number} style={{ minWidth: '65px' }}>
                      JP {p.jp_number}<br />
                      <span style={{ fontSize: '6pt', fontWeight: 'normal' }}>{p.start_time}-{p.end_time}</span>
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {rombelMatrix.map((r, idx) => {
                const pct = Math.round((r.filledCount / (r.totalJp || 1)) * 100);
                const activePeriods = activeDaySchedule.periods.filter(p => p.category_name.toUpperCase() !== 'ISTIRAHAT');
                return (
                  <tr key={r.rombelName}>
                    <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 'bold' }}>{r.rombelName}</td>
                    <td style={{ textAlign: 'center' }}>{r.gradeLevel || '-'}</td>
                    <td>{r.waliKelas || '-'}</td>
                    <td style={{ textAlign: 'center' }}>{r.totalJp}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{r.filledCount}</td>
                    <td style={{ textAlign: 'center', color: r.emptyCount > 0 ? '#b91c1c' : 'inherit', fontWeight: r.emptyCount > 0 ? 'bold' : 'normal' }}>
                      {r.emptyCount}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{pct}%</td>
                    {activePeriods.map(p => {
                      const status = r.jpStatus[p.jp_number];
                      return (
                        <td
                          key={p.jp_number}
                          className={status?.filled ? 'cell-filled' : 'cell-empty'}
                        >
                          {status?.filled ? (
                            <div>
                              <strong>{status.teacherName}</strong>
                              <div style={{ fontSize: '6pt', color: '#166534' }}>{status.subject}</div>
                            </div>
                          ) : (
                            <span>Kosong</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {activeTab === 'rombel' && periodType !== 'daily' && (
          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: '28px' }}>No</th>
                <th>Rombongan Belajar</th>
                <th style={{ width: '55px' }}>Tingkat</th>
                <th>Wali Kelas</th>
                <th style={{ width: '55px' }}>Status</th>
                <th style={{ width: '60px' }}>Total Sesi</th>
                <th style={{ width: '60px' }}>Total JP</th>
                <th style={{ width: '60px' }}>Hari Aktif</th>
                <th>Guru Mengajar</th>
                <th>Mata Pelajaran</th>
              </tr>
            </thead>
            <tbody>
              {rombelAggregate.map((r, idx) => (
                <tr key={r.rombelName}>
                  <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                  <td style={{ fontWeight: 'bold' }}>{r.rombelName}</td>
                  <td style={{ textAlign: 'center' }}>{r.gradeLevel || '-'}</td>
                  <td>{r.waliKelas || '-'}</td>
                  <td style={{ textAlign: 'center' }}>{r.status}</td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{r.totalSessions}</td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{r.totalJp}</td>
                  <td style={{ textAlign: 'center' }}>{r.activeDaysCount}</td>
                  <td>{r.teachers.join(', ') || '-'}</td>
                  <td>{r.subjects.join(', ') || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'guru' && (
          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: '28px' }}>No</th>
                <th>Nama Guru Pengajar</th>
                <th style={{ width: '110px' }}>NIP</th>
                <th>Wali Kelas</th>
                <th style={{ width: '60px' }}>Total JP</th>
                <th style={{ width: '65px' }}>Jumlah Sesi</th>
                <th style={{ width: '60px' }}>Hari Aktif</th>
                <th style={{ width: '95px' }}>No. WhatsApp</th>
              </tr>
            </thead>
            <tbody>
              {teacherSummary.map((t, idx) => (
                <tr key={t.teacherId}>
                  <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                  <td style={{ fontWeight: 'bold' }}>{t.teacherName}</td>
                  <td>{t.nip || '-'}</td>
                  <td>{t.waliKelasOf || '-'}</td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{t.totalJp}</td>
                  <td style={{ textAlign: 'center' }}>{t.recordCount}</td>
                  <td style={{ textAlign: 'center' }}>{t.activeDays}</td>
                  <td style={{ fontSize: '7pt' }}>{t.whatsapp || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'detail' && (
          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: '25px' }}>No</th>
                <th style={{ width: '65px' }}>Tanggal</th>
                <th>Nama Guru</th>
                <th style={{ width: '60px' }}>Rombel</th>
                <th>Mata Pelajaran</th>
                <th style={{ width: '65px' }}>Jam (JP)</th>
                <th>Materi / Topik KBM</th>
                <th style={{ width: '55px' }}>GPS</th>
                <th style={{ width: '60px' }}>Verifikasi</th>
              </tr>
            </thead>
            <tbody>
              {attendanceList.map((a, idx) => {
                const jpText = a.jp_list && a.jp_list.length > 0 ? a.jp_list.map(j => `JP ${j}`).join(', ') : `JP ${a.jp_start}-${a.jp_end}`;
                const studentCount = a.verification_count || (a.verified_students || []).length;
                return (
                  <tr key={a.id}>
                    <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ textAlign: 'center' }}>{formatWIBDateDDMMYYYY(a.date)}</td>
                    <td style={{ fontWeight: 'bold' }}>{a.teacher_name}</td>
                    <td style={{ textAlign: 'center' }}>{a.rombel_id}</td>
                    <td>{a.subject}</td>
                    <td style={{ textAlign: 'center' }}>{jpText}</td>
                    <td>{a.topic || '-'}</td>
                    <td style={{ textAlign: 'center' }}>{a.location_valid ? 'Valid' : 'Diluar'}</td>
                    <td style={{ textAlign: 'center' }}>{studentCount} Siswa</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* TANDA TANGAN PENGESAHAN DOKUMEN RESMI */}
        <Box className="print-signatures-box">
          <Box className="print-sig-column">
            <Typography variant="body2" sx={{ fontSize: '8.5pt' }}>Mengetahui,</Typography>
            <Typography variant="body2" sx={{ fontSize: '9pt', fontWeight: 700 }}>Kepala Sekolah</Typography>
            <Box sx={{ height: '55px' }} />
            <Typography variant="body2" sx={{ fontSize: '9pt', fontWeight: 700, textDecoration: 'underline' }}>
              ( {schoolSettings?.headmaster_name || schoolSettings?.headmasterName || '..................................................'} )
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '8pt', display: 'block' }}>
              NIP. {schoolSettings?.headmaster_nip || schoolSettings?.headmasterNip || '..........................................'}
            </Typography>
          </Box>
          <Box className="print-sig-column">
            <Typography variant="body2" sx={{ fontSize: '8.5pt' }}>
              {format(new Date(), 'dd MMMM yyyy', { locale: id })}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '9pt', fontWeight: 700 }}>Waka Kurikulum</Typography>
            <Box sx={{ height: '55px' }} />
            <Typography variant="body2" sx={{ fontSize: '9pt', fontWeight: 700, textDecoration: 'underline' }}>
              ( {wakaKurikulum?.name || '..................................................'} )
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '8pt', display: 'block' }}>
              NIP. {wakaKurikulum?.nip || '..........................................'}
            </Typography>
          </Box>
        </Box>
      </Box>,
      document.getElementById('print-root')!
    )
  ) : null}
</Box>
  );
}
