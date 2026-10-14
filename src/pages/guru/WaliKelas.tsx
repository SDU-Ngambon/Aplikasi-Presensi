import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Chip,
  Avatar,
  Stack,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Divider,
  Autocomplete
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Groups as GroupsIcon,
  CalendarToday as CalendarTodayIcon,
  Download as DownloadIcon,
  WhatsApp as WhatsAppIcon,
  ContentCopy as ContentCopyIcon,
  Refresh as RefreshIcon,
  Help as HelpIcon,
  AccessTime as AccessTimeIcon,
  Info as InfoIcon,
  Search as SearchIcon,
  PictureAsPdf as PdfIcon,
  Visibility as VisibilityIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import {
  Users as LucideUsers,
  UserCheck as LucideUserCheck,
  Clock as LucideClock,
  HeartPulse as LucideHeartPulse,
  FileText as LucideFileText,
  Award as LucideAward,
  AlertCircle as LucideAlertCircle,
  FileSpreadsheet as LucideFileSpreadsheet,
  Send as LucideSend,
  Copy as LucideCopy,
  Sparkles as LucideSparkles
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format, eachDayOfInterval, isWeekend } from 'date-fns';
import { id } from 'date-fns/locale';
import * as xlsx from 'xlsx';
import { formatWIBDateDDMMYYYY, formatWIBDateIndo, getWIBDateString } from '../../timezone';
import { useAppTheme } from '../../contexts/ThemeModeContext';
import MonitoringKbmSiswa from './MonitoringKbmSiswa';

interface WaliKelasProps {
  currentUser: any;
  forcePrivilegedMode?: boolean;
  titleOverride?: string;
}

export default function WaliKelas({ currentUser, forcePrivilegedMode, titleOverride }: WaliKelasProps) {
  const theme = useTheme();
  const { isDark, preset } = useAppTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const isPrivilegedRole = forcePrivilegedMode !== undefined
    ? forcePrivilegedMode
    : ['KEPALA_SEKOLAH', 'WAKIL_KURIKULUM', 'WAKIL_KESISWAAN', 'GURU_BK', 'admin'].includes(currentUser?.role);

  // Tab State: 0 = Laporan Harian, 1 = Laporan Matriks
  const [activeTab, setActiveTab] = useState(0);

  // Teacher Profile & Class assignment
  const [teacherData, setTeacherData] = useState<any>(currentUser || null);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [assignedClass, setAssignedClass] = useState<string>('');
  const [assignedYear, setAssignedYear] = useState<string>('');
  const [availableRombels, setAvailableRombels] = useState<any[]>([]);
  const [allStudentsList, setAllStudentsList] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Daily Report State
  const [filterDate, setFilterDate] = useState<string>(() => getWIBDateString());
  const [dailyAttendance, setDailyAttendance] = useState<any[]>([]);
  const [dailyIzin, setDailyIzin] = useState<any[]>([]);
  const [isDailyLoading, setIsDailyLoading] = useState(false);
  const [searchStudent, setSearchStudent] = useState('');
  const [statusFilter, setStatusFilter] = useState('SEMUA');

  // Matrix Report State
  const [startDate, setStartDate] = useState<string>(() => {
    const today = getWIBDateString();
    return today.substring(0, 7) + '-01';
  });
  const [endDate, setEndDate] = useState<string>(() => getWIBDateString());
  const [orientation, setOrientation] = useState('landscape');
  const [paperSize, setPaperSize] = useState('A4');
  const [matrixData, setMatrixData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [printMode, setPrintMode] = useState<'daily' | 'matrix'>('daily');
  const [isMatrixLoading, setIsMatrixLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrintDaily = () => {
    setPrintMode('daily');
    setShowPreview(true);
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  // Load Teacher and Class Data
  const loadClassData = async () => {
    setLoading(true);
    try {
      const [teachRes, rombelRes, setRes, studRes] = await Promise.all([
        axios.get('/api/teachers').catch(() => ({ data: [] })),
        axios.get('/api/rombel?format=array').catch(() => ({ data: [] })),
        axios.get('/api/settings').catch(() => ({ data: {} })),
        axios.get('/api/students').catch(() => ({ data: [] }))
      ]);

      const allTeachers: any[] = Array.isArray(teachRes.data) ? teachRes.data : [];
      const allRombels: any[] = Array.isArray(rombelRes.data) ? rombelRes.data : [];
      const allStudents: any[] = Array.isArray(studRes.data) ? studRes.data : (studRes.data?.data || []);

      setSettings(setRes.data || {});
      setTeachersList(allTeachers);
      setAvailableRombels(allRombels.filter((r: any) => (r.status || 'AKTIF') === 'AKTIF'));
      setAllStudentsList(allStudents);

      // Find logged-in teacher in fresh list
      const teacherId = currentUser?.id || currentUser?.teacher_id;
      const teacherName = (currentUser?.name || '').trim().toLowerCase();

      const matchedTeacher = allTeachers.find(
        t => (teacherId && t.id === teacherId) ||
             (t.name && t.name.trim().toLowerCase() === teacherName)
      ) || currentUser;

      setTeacherData(matchedTeacher);

      // Determine assigned class
      let cls = matchedTeacher?.class || matchedTeacher?.teacher_class || '';
      let yr = matchedTeacher?.year || matchedTeacher?.teacher_year || '';

      const isPrivileged = isPrivilegedRole;

      // Fallback check from rombel list
      if (!cls && allRombels.length > 0) {
        const foundRombel = allRombels.find(
          r => (r.teacher && (r.teacher.id === teacherId || r.teacher.name?.trim().toLowerCase() === teacherName)) ||
               (r.wali_kelas_name && r.wali_kelas_name.trim().toLowerCase() === teacherName)
        );
        if (foundRombel) {
          cls = foundRombel.name;
          yr = foundRombel.year || '';
        } else if (isPrivileged) {
          const firstActive = allRombels.find((r: any) => (r.status || 'AKTIF') === 'AKTIF') || allRombels[0];
          if (firstActive) {
            cls = firstActive.name;
            yr = firstActive.year || '';
          }
        }
      }

      setAssignedClass(cls);
      setAssignedYear(yr);

      if (cls) {
        const filteredStudents = allStudents.filter(
          (s: any) => s.class && s.class.trim().toLowerCase() === cls.trim().toLowerCase() && s.status !== 'LULUS'
        );
        setStudents(filteredStudents);
      }
    } catch (e) {
      console.error('Error loading Wali Kelas data:', e);
      toast.error('Gagal memuat data kelas');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClass = (newCls: string) => {
    setAssignedClass(newCls);
    const rObj = availableRombels.find((r: any) => r.name === newCls);
    if (rObj && rObj.year) {
      setAssignedYear(rObj.year);
    }
    const filtered = allStudentsList.filter(
      (s: any) => s.class && s.class.trim().toLowerCase() === newCls.trim().toLowerCase() && s.status !== 'LULUS'
    );
    setStudents(filtered);
  };

  // Resolve true assigned Wali Kelas for the current class from Rombel / Teachers data
  const getWaliKelasForClass = (clsName: string) => {
    if (!clsName) return { name: teacherData?.name || '-', nip: teacherData?.nip || '-' };
    const cleanCls = clsName.trim().toLowerCase();

    // 1. Search in available rombels list
    const rombel = availableRombels.find(
      (r: any) => (r.name && r.name.trim().toLowerCase() === cleanCls) || (r.id && r.id.toString().toLowerCase() === cleanCls)
    );

    if (rombel) {
      if (rombel.teacher && (rombel.teacher.name || rombel.teacher.nama)) {
        return {
          name: rombel.teacher.name || rombel.teacher.nama,
          nip: rombel.teacher.nip || rombel.teacher.teacher_nip || '-'
        };
      }
      const wkName = rombel.wali_kelas_name || rombel.teacher_name || '';
      const tId = rombel.teacher_id;
      if (tId || wkName) {
        const matched = teachersList.find(
          (t: any) => (tId && (t.id === tId || t.teacher_id === tId)) ||
                      (wkName && t.name && t.name.trim().toLowerCase() === wkName.trim().toLowerCase())
        );
        if (matched) {
          return { name: matched.name, nip: matched.nip || matched.teacher_nip || '-' };
        }
        if (wkName) {
          return { name: wkName, nip: rombel.wali_kelas_nip || rombel.teacher_nip || '-' };
        }
      }
    }

    // 2. Search in teachersList by assigned class
    const teacherByClass = teachersList.find(
      (t: any) => (t.class && t.class.trim().toLowerCase() === cleanCls) ||
                  (t.teacher_class && t.teacher_class.trim().toLowerCase() === cleanCls)
    );
    if (teacherByClass) {
      return { name: teacherByClass.name, nip: teacherByClass.nip || teacherByClass.teacher_nip || '-' };
    }

    // 3. If regular Wali Kelas is viewing their own assigned class
    if (!isPrivilegedRole && teacherData?.name) {
      return { name: teacherData.name, nip: teacherData.nip || '-' };
    }

    return {
      name: rombel?.wali_kelas_name || '..................................................',
      nip: rombel?.wali_kelas_nip || '..........................................'
    };
  };

  const activeWaliKelas = useMemo(() => {
    return getWaliKelasForClass(assignedClass);
  }, [assignedClass, availableRombels, teachersList, teacherData, isPrivilegedRole]);

  useEffect(() => {
    loadClassData();
  }, [currentUser]);

  // Fetch Daily Attendance
  const fetchDailyData = async () => {
    if (!assignedClass) return;
    setIsDailyLoading(true);
    try {
      const [attRes, izinRes, studRes] = await Promise.all([
        axios.get(`/api/attendance?date=${filterDate}&class=${encodeURIComponent(assignedClass)}`),
        axios.get('/api/piket/izin'),
        axios.get('/api/students')
      ]);

      const attList = Array.isArray(attRes.data) ? attRes.data : [];
      const izinAll = Array.isArray(izinRes.data) ? izinRes.data : (izinRes.data?.data || []);
      const allStuds = Array.isArray(studRes.data) ? studRes.data : (studRes.data?.data || []);

      const classStuds = allStuds.filter(
        (s: any) => s.class && s.class.trim().toLowerCase() === assignedClass.trim().toLowerCase() && s.status !== 'LULUS'
      );

      // Also ensure students state is updated if empty
      if (classStuds.length > 0 && students.length === 0) {
        setStudents(classStuds);
      }

      const activeStudentList = classStuds.length > 0 ? classStuds : students;

      const classIzin = izinAll.filter((i: any) => {
        const matchStudent = activeStudentList.some((s: any) =>
          (s.nisn && i.nisn && String(s.nisn).trim() === String(i.nisn).trim()) ||
          (s.id && i.student_id && String(s.id) === String(i.student_id)) ||
          (s.name && (i.nama_siswa || i.namaSiswa) && s.name.trim().toLowerCase() === (i.nama_siswa || i.namaSiswa).trim().toLowerCase())
        );
        const start = i.tanggal_mulai || i.tanggalMulai || '';
        const end = i.tanggal_selesai || i.tanggalSelesai || '';
        return matchStudent && filterDate >= start && filterDate <= end;
      });

      setDailyAttendance(attList);
      setDailyIzin(classIzin);
    } catch (e) {
      console.error(e);
      toast.error('Gagal memuat presensi harian');
    } finally {
      setIsDailyLoading(false);
    }
  };

  useEffect(() => {
    if (assignedClass && activeTab === 0) {
      fetchDailyData();
    }
  }, [assignedClass, filterDate, activeTab]);

  // Fetch Matrix Data
  const fetchMatrix = async () => {
    if (!assignedClass) return null;
    setIsMatrixLoading(true);
    try {
      const res = await axios.get('/api/attendance/matrix', {
        params: {
          startDate,
          endDate,
          class: assignedClass,
          year: 'ALL'
        }
      });
      const rows = Array.isArray(res.data) ? res.data : [];
      setMatrixData(rows);
      return rows;
    } catch (e) {
      console.error(e);
      toast.error('Gagal memuat data matriks presensi');
      return null;
    } finally {
      setIsMatrixLoading(false);
    }
  };

  useEffect(() => {
    if (assignedClass && activeTab === 1) {
      fetchMatrix();
    }
  }, [assignedClass, startDate, endDate, activeTab]);

  // Daily summary stats
  const dailyStats = useMemo(() => {
    const total = students.length;
    let hadir = 0;
    let terlambat = 0;
    let izin = 0;
    let sakit = 0;
    let dispensasi = 0;
    let alpa = 0;
    let pulang = 0;

    const arrivedStudentIds = new Set<string>();

    dailyAttendance.forEach(a => {
      if (a.type === 'ARRIVAL') {
        arrivedStudentIds.add(a.studentId || a.student?.id);
        hadir++;
        if (a.status === 'LATE') terlambat++;
      } else if (a.type === 'DEPARTURE') {
        pulang++;
      }
    });

    students.forEach(s => {
      if (!arrivedStudentIds.has(s.id)) {
        const studentIzin = dailyIzin.find(i => i.nisn === s.nisn);
        if (studentIzin) {
          const ket = (studentIzin.keterangan || '').toLowerCase();
          if (ket.includes('sakit')) sakit++;
          else if (ket.includes('dispensasi')) dispensasi++;
          else izin++;
        } else {
          alpa++;
        }
      }
    });

    return { total, hadir, terlambat, izin, sakit, dispensasi, alpa, pulang };
  }, [students, dailyAttendance, dailyIzin]);

  // Filtered students for daily view (Search + Status filter)
  const processedDailyStudents = useMemo(() => {
    return students.map(student => {
      const arrival = dailyAttendance.find(
        a => (a.studentId === student.id || a.student?.id === student.id) && a.type === 'ARRIVAL'
      );
      const departure = dailyAttendance.find(
        a => (a.studentId === student.id || a.student?.id === student.id) && a.type === 'DEPARTURE'
      );
      const izinRecord = dailyIzin.find(i => i.nisn === student.nisn);

      let statusCategory = 'Alpa';
      let statusLabel = 'Alpa';
      let statusColor: 'success' | 'warning' | 'info' | 'error' | 'secondary' = 'error';
      let note = '-';

      if (arrival) {
        if (arrival.status === 'LATE') {
          statusCategory = 'Terlambat';
          statusLabel = 'Terlambat';
          statusColor = 'warning';
        } else {
          statusCategory = 'Hadir';
          statusLabel = 'Hadir';
          statusColor = 'success';
        }
      } else if (izinRecord) {
        const ket = izinRecord.keterangan || 'Izin';
        statusLabel = ket;
        if (ket.toLowerCase().includes('sakit')) {
          statusCategory = 'Sakit';
          statusColor = 'warning';
        } else if (ket.toLowerCase().includes('dispensasi')) {
          statusCategory = 'Dispensasi';
          statusColor = 'secondary';
        } else {
          statusCategory = 'Izin';
          statusColor = 'info';
        }
        note = `Izin: ${izinRecord.tanggal_mulai || '-'} s/d ${izinRecord.tanggal_selesai || '-'}`;
      }

      const arrivalTime = arrival?.timestamp
        ? new Date(arrival.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        : '-';
      const departureTime = departure?.timestamp
        ? new Date(departure.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        : '-';

      return {
        ...student,
        arrival,
        departure,
        statusCategory,
        statusLabel,
        statusColor,
        arrivalTime,
        departureTime,
        note
      };
    }).filter(s => {
      // Apply search filter
      const matchSearch =
        !searchStudent ||
        s.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
        (s.nisn && s.nisn.includes(searchStudent));

      // Apply status category filter
      const matchStatus =
        statusFilter === 'SEMUA' ||
        s.statusCategory === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [students, dailyAttendance, dailyIzin, searchStudent, statusFilter]);

  // Generate WhatsApp Class Report Message
  const generateWaReportText = () => {
    const websiteName = settings?.nama_website || settings?.namaWebsite || settings?.judul_aplikasi || 'SMK';
    const dateFormatted = format(new Date(filterDate), 'dd MMMM yyyy', { locale: id });
    let text = `*📢 REKAP PRESENSI KELAS ${assignedClass}*\n`;
    text += `*${websiteName}*\n`;
    text += `📅 Hari/Tanggal: ${dateFormatted}\n`;
    text += `👨‍🏫 Wali Kelas: ${activeWaliKelas?.name || '-'}\n\n`;
    text += `*[ STATISTIK KEHADIRAN ]*\n`;
    text += `• Total Siswa: ${dailyStats.total}\n`;
    text += `• Hadir: ${dailyStats.hadir} (Terlambat: ${dailyStats.terlambat})\n`;
    text += `• Sakit: ${dailyStats.sakit}\n`;
    text += `• Izin: ${dailyStats.izin}\n`;
    text += `• Dispensasi: ${dailyStats.dispensasi}\n`;
    text += `• Alpa: ${dailyStats.alpa}\n`;
    text += `• Sudah Pulang: ${dailyStats.pulang}\n\n`;

    // List Siswa Tidak Hadir
    const unpresent: any[] = [];
    students.forEach(s => {
      const arrived = dailyAttendance.find(a => (a.studentId === s.id || a.student?.id === s.id) && a.type === 'ARRIVAL');
      if (!arrived) {
        const studentIzin = dailyIzin.find(i => i.nisn === s.nisn);
        unpresent.push({
          name: s.name,
          status: studentIzin ? studentIzin.keterangan : 'Alpa'
        });
      }
    });

    if (unpresent.length > 0) {
      text += `*Daftar Siswa Tidak Hadir / Keterangan:*\n`;
      unpresent.forEach((item, idx) => {
        text += `${idx + 1}. ${item.name} (${item.status})\n`;
      });
      text += `\n`;
    }

    text += `_Laporan dibuat oleh Wali Kelas ${assignedClass} melalui Portal Sistem Presensi ${websiteName}_`;
    return text;
  };

  const handleCopyWaText = () => {
    const text = generateWaReportText();
    navigator.clipboard.writeText(text);
    toast.success('Format teks rekap kelas berhasil disalin!');
  };

  const handleSendWaWeb = () => {
    const text = generateWaReportText();
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Preview Matrix
  const handlePreviewMatrix = async () => {
    setShowPreview(true);
    const data = await fetchMatrix();
    if (data && data.length > 0) {
      toast.success(`Matriks presensi ${assignedClass} berhasil ditampilkan (${data.length} siswa)`);
    } else {
      toast(`Data presensi untuk kelas ${assignedClass} pada periode tersebut belum tersedia`, { icon: 'ℹ️' });
    }
    setTimeout(() => {
      const el = document.getElementById('matrix-preview-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  };

  // Export Matrix to Excel (.xlsx) - Exactly matching Admin Reports layout
  const handleExportExcel = async () => {
    try {
      const currentData = matrixData.length > 0 ? matrixData : await fetchMatrix();
      if (!currentData || currentData.length === 0) {
        toast.error('Data matriks kosong atau belum dimuat');
        return;
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = eachDayOfInterval({ start, end });

      const rows: any[][] = [];
      const schoolName = settings?.nama_website || settings?.namaWebsite || settings?.judul_aplikasi || 'SMK';
      
      // Header Kop Formal
      rows.push([schoolName.toUpperCase()]);
      rows.push([isCrossMonth ? `LAPORAN REKAPITULASI PRESENSI SISWA (LINTAS BULAN) KELAS ${assignedClass}` : `LAPORAN REKAPITULASI PRESENSI SISWA KELAS ${assignedClass}`]);
      rows.push([`Wali Kelas: ${activeWaliKelas?.name || '-'}`]);
      rows.push([`Periode: ${format(start, 'dd/MM/yyyy')} - ${format(end, 'dd/MM/yyyy')}${isCrossMonth ? ' (Rekapitulasi Lintas Bulan)' : ''}`]);
      rows.push([]);

      let totalColH = 0;
      let totalColS = 0;
      let totalColI = 0;
      let totalColA = 0;

      if (isCrossMonth) {
        // Mode Lintas Bulan: Hanya tampilkan rekapitulasi jumlah H, S, I, A
        const headers = ['NO', 'NAMA LENGKAP SISWA', 'NISN', 'KELAS', 'HADIR (H)', 'SAKIT (S)', 'IZIN (I)', 'ALPA (A)', 'TOTAL KEHADIRAN (%)'];
        rows.push(headers);

        currentData.forEach((rowItem: any, idx: number) => {
          const h = Number(rowItem.totals?.H || 0);
          const s = Number(rowItem.totals?.S || 0);
          const i = Number(rowItem.totals?.I || 0);
          const a = Number(rowItem.totals?.A || 0);
          const totalDays = h + s + i + a;
          const percentage = totalDays > 0 ? `${Math.round((h / totalDays) * 100)}%` : '100%';

          totalColH += h;
          totalColS += s;
          totalColI += i;
          totalColA += a;

          rows.push([
            idx + 1,
            rowItem.name,
            rowItem.nisn || '-',
            rowItem.className || assignedClass,
            h,
            s,
            i,
            a,
            percentage
          ]);
        });

        // Total Footer Row
        const totalAll = totalColH + totalColS + totalColI + totalColA;
        const totalPct = totalAll > 0 ? `${Math.round((totalColH / totalAll) * 100)}%` : '100%';
        rows.push(['TOTAL KESELURUHAN KELAS', '', '', '', totalColH, totalColS, totalColI, totalColA, totalPct]);

        const worksheet = xlsx.utils.aoa_to_sheet(rows);
        worksheet['!cols'] = [
          { wch: 6 },  // NO
          { wch: 32 }, // NAMA
          { wch: 15 }, // NISN
          { wch: 12 }, // KELAS
          { wch: 12 }, // H
          { wch: 12 }, // S
          { wch: 12 }, // I
          { wch: 12 }, // A
          { wch: 22 }  // %
        ];

        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, `Rekap_${assignedClass}`);
        xlsx.writeFile(workbook, `Rekap_Presensi_LintasBulan_${assignedClass}_${startDate}_${endDate}.xlsx`);
      } else {
        // Mode Satu Bulan: Tampilkan kolom harian + H, S, I, A
        const headers = ['NO', 'NAMA LENGKAP SISWA', 'NISN', 'KELAS'];
        days.forEach(d => headers.push(format(d, 'dd/MM')));
        headers.push('H', 'S', 'I', 'A');
        rows.push(headers);

        // Data Rows
        currentData.forEach((rowItem: any, idx: number) => {
          const rowData: any[] = [idx + 1, rowItem.name, rowItem.nisn || '-', rowItem.className || assignedClass];
          days.forEach(d => {
            const dateKey = format(d, 'yyyy-MM-dd');
            rowData.push(rowItem.attendance?.[dateKey] || '-');
          });
          const h = Number(rowItem.totals?.H || 0);
          const s = Number(rowItem.totals?.S || 0);
          const i = Number(rowItem.totals?.I || 0);
          const a = Number(rowItem.totals?.A || 0);
          
          totalColH += h;
          totalColS += s;
          totalColI += i;
          totalColA += a;

          rowData.push(h, s, i, a);
          rows.push(rowData);
        });

        // Total Footer Row
        const footerRow: any[] = ['TOTAL KESELURUHAN KELAS', '', '', ''];
        days.forEach(() => footerRow.push(''));
        footerRow.push(totalColH, totalColS, totalColI, totalColA);
        rows.push(footerRow);

        const worksheet = xlsx.utils.aoa_to_sheet(rows);

        // Auto Column Sizing for clean opening in MS Excel / WPS
        const colWidths = [
          { wch: 5 },  // NO
          { wch: 30 }, // NAMA
          { wch: 15 }, // NISN
          { wch: 12 }  // KELAS
        ];
        days.forEach(() => colWidths.push({ wch: 7 }));
        colWidths.push({ wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 });
        worksheet['!cols'] = colWidths;

        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, `Rekap_${assignedClass}`);
        xlsx.writeFile(workbook, `Rekap_Matriks_${assignedClass}_${startDate}_${endDate}.xlsx`);
      }
      toast.success('File Excel matriks presensi berhasil diunduh!');
    } catch (e) {
      console.error(e);
      toast.error('Gagal melakukan ekspor Excel');
    }
  };

  // Print / PDF Matrix Report - Exactly matching Admin Reports layout
  const handlePrintMatrix = async () => {
    setPrintMode('matrix');
    let currentData = matrixData;
    if (currentData.length === 0) {
      const res = await fetchMatrix();
      if (!res || res.length === 0) {
        toast.error('Data matriks presensi belum dimuat');
        return;
      }
      currentData = res;
    }
    setShowPreview(true);
    setTimeout(() => {
      setIsPrinting(true);
      setTimeout(() => {
        window.print();
        setIsPrinting(false);
      }, 500);
    }, 100);
  };

  const intervalDays = useMemo(() => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start > end) return [];
      return eachDayOfInterval({ start, end });
    } catch {
      return [];
    }
  }, [startDate, endDate]);

  const isCrossMonth = useMemo(() => {
    try {
      if (!startDate || !endDate) return false;
      const start = new Date(startDate);
      const end = new Date(endDate);
      return start.getFullYear() !== end.getFullYear() || start.getMonth() !== end.getMonth();
    } catch {
      return false;
    }
  }, [startDate, endDate]);

  // Column totals for matrix
  const matrixColumnTotals = useMemo(() => {
    let totalH = 0;
    let totalS = 0;
    let totalI = 0;
    let totalA = 0;
    matrixData.forEach(row => {
      totalH += Number(row.totals?.H || 0);
      totalS += Number(row.totals?.S || 0);
      totalI += Number(row.totals?.I || 0);
      totalA += Number(row.totals?.A || 0);
    });
    return { totalH, totalS, totalI, totalA };
  }, [matrixData]);

  if (loading) {
    return (
      <Box sx={{ py: 10, textAlign: 'center' }}>
        <CircularProgress size={40} />
        <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary', fontWeight: 600 }}>
          Memeriksa status penugasan Wali Kelas...
        </Typography>
      </Box>
    );
  }

  // --- EMPTY STATE: IF NOT ASSIGNED AS WALI KELAS ---
  if (!assignedClass) {
    return (
      <Box sx={{ maxWidth: 900, mx: 'auto', p: { xs: 1.5, sm: 3 } }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4.5 },
            borderRadius: 3.5,
            bgcolor: isDark ? preset.cardBg : '#ffffff',
            border: `1px solid ${preset.glassBorder}`,
            textAlign: 'center',
            boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 4px 20px -2px rgba(0,0,0,0.05)'
          }}
        >
          <Box
            sx={{
              width: 72,
              height: 72,
              mx: 'auto',
              borderRadius: '50%',
              bgcolor: alpha(theme.palette.warning.main, 0.12),
              color: theme.palette.warning.main,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2.5
            }}
          >
            <HelpIcon sx={{ fontSize: 40 }} />
          </Box>

          <Chip
            label="Informasi Penugasan Wali Kelas"
            color="warning"
            variant="outlined"
            size="small"
            sx={{ fontWeight: 800, mb: 1.5, px: 1 }}
          />

          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              color: preset.textColorPrimary,
              letterSpacing: -0.5,
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
              mb: 1.5
            }}
          >
            Anda Belum Ditugaskan Sebagai Wali Kelas
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: preset.textColorSecondary,
              maxWidth: 580,
              mx: 'auto',
              lineHeight: 1.6,
              fontSize: { xs: '0.9rem', sm: '0.95rem' }
            }}
          >
            Bapak/Ibu <b>{teacherData?.name || 'Guru'}</b> saat ini belum memiliki data penugasan kelas sebagai Wali Kelas di sistem sekolah.
          </Typography>

          <Box
            sx={{
              mt: 3.5,
              p: 2.5,
              bgcolor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f8fafc',
              borderRadius: 2.5,
              border: `1px dashed ${preset.glassBorder}`,
              maxWidth: 600,
              mx: 'auto',
              textAlign: 'left'
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: preset.textColorPrimary, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <InfoIcon color="primary" fontSize="small" /> Langkah Pengaktifan:
            </Typography>
            <Typography variant="body2" sx={{ color: preset.textColorSecondary, mb: 0.8, fontSize: '0.85rem' }}>
              1. Hubungi <b>Administrator Sekolah</b> untuk menautkan nama Anda ke rombel/kelas yang diampu.
            </Typography>
            <Typography variant="body2" sx={{ color: preset.textColorSecondary, mb: 0.8, fontSize: '0.85rem' }}>
              2. Pengaturan penugasan dilakukan melalui menu <b>Data Guru</b> atau <b>Informasi Rombel</b> pada panel Admin.
            </Typography>
            <Typography variant="body2" sx={{ color: preset.textColorSecondary, fontSize: '0.85rem' }}>
              3. Setelah ditetapkan, menu ini akan otomatis menampilkan <b>Laporan Presensi Harian</b> dan <b>Ekspor Matriks Presensi Siswa</b> sesuai kelas Anda.
            </Typography>
          </Box>

          <Button
            variant="outlined"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={loadClassData}
            sx={{ mt: 3.5, borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3, py: 1 }}
          >
            Periksa Ulang Penugasan
          </Button>
        </Paper>
      </Box>
    );
  }

  // --- MAIN WALI KELAS VIEW (IF ASSIGNED) ---
  return (
    <Box sx={{ width: '100%', maxWidth: '100%', p: { xs: 1, sm: 2, md: 2.5 }, pb: { xs: 8, md: 3 } }}>

      {/* STYLES FOR CRISP PRINT & PDF (ADMIN-COMPLIANT) */}
      <style>
        {`
          @media print {
            @page { 
              size: ${paperSize === 'F4' ? '215.9mm 330.2mm' : paperSize === 'Legal' ? '215.9mm 355.6mm' : 'A4'} ${orientation}; 
              margin: 6mm 8mm; 
            }
            body {
              background-color: #ffffff !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #printable-area {
              display: block !important;
              position: static !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .print-class-block {
              page-break-after: always !important;
              break-after: page !important;
              margin-bottom: 0 !important;
              padding-bottom: 15px !important;
            }
            .print-class-block:last-child {
              page-break-after: avoid !important;
              break-after: avoid !important;
            }
            table.print-matrix-table { 
              width: 100% !important; 
              font-size: 8.5pt !important; 
              border-collapse: collapse !important; 
              page-break-inside: auto !important; 
              font-family: Arial, sans-serif !important;
            }
            table.print-matrix-table tr { 
              page-break-inside: avoid !important; 
              break-inside: avoid !important; 
            }
            table.print-matrix-table thead { 
              display: table-header-group !important; 
            }
            table.print-matrix-table tfoot { 
              display: table-footer-group !important; 
            }
            table.print-matrix-table th, table.print-matrix-table td { 
              border: 1px solid #333333 !important;
              padding: 3px 4px !important; 
              word-break: break-word !important; 
            }
            .print-avoid-break {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        `}
      </style>

      {/* NORMAL SCREEN VIEW (HIDDEN DURING PRINT) */}
      <Box sx={{ '@media print': { display: 'none' } }}>
        {/* HEADER SECTION: WALI KELAS INFO */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.25, sm: 2.5 },
            mb: 1.5,
            borderRadius: { xs: 2.5, sm: 3 },
            bgcolor: isDark ? preset.cardBg : '#ffffff',
            border: `1px solid ${preset.glassBorder}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 1.25
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, width: '100%', minWidth: 0 }}>
            <Avatar
              sx={{
                width: { xs: 36, sm: 50 },
                height: { xs: 36, sm: 50 },
                bgcolor: theme.palette.primary.main,
                color: preset.contrastText || '#ffffff',
                fontWeight: 800,
                fontSize: { xs: '0.95rem', sm: '1.2rem' },
                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                flexShrink: 0
              }}
            >
              <GroupsIcon sx={{ fontSize: { xs: 20, sm: 26 } }} />
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, flexWrap: 'wrap' }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: preset.textColorPrimary, fontSize: { xs: '0.88rem', sm: '1.2rem' }, lineHeight: 1.2 }}>
                  {titleOverride
                    ? titleOverride
                    : currentUser?.role === 'KEPALA_SEKOLAH'
                    ? 'Monitoring Kelas'
                    : currentUser?.role === 'WAKIL_KESISWAAN'
                    ? 'Presensi Kesiswaan'
                    : currentUser?.role === 'GURU_BK'
                    ? 'Presensi Siswa BK'
                    : 'Wali Kelas'}: <Box component="span" sx={{ color: theme.palette.primary.main, display: 'inline-block' }}>{assignedClass}</Box>
                </Typography>
                <Chip
                  label={`${students.length} Siswa`}
                  size="small"
                  color="primary"
                  sx={{ fontWeight: 700, height: 20, fontSize: '0.65rem' }}
                />
              </Box>
              <Typography noWrap variant="caption" sx={{ color: preset.textColorSecondary, display: 'block', mt: 0.2, fontWeight: 500, fontSize: { xs: '0.68rem', sm: '0.78rem' } }}>
                {isPrivilegedRole ? `Wali Kelas: ${activeWaliKelas?.name || '-'}${activeWaliKelas?.nip ? ` (NIP: ${activeWaliKelas.nip})` : ''}` : `${teacherData?.name || 'Guru'} ${teacherData?.nip ? `(NIP: ${teacherData.nip})` : ''}`}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: { xs: '100%', sm: 'auto' }, flexWrap: { xs: 'nowrap', sm: 'wrap' } }}>
            {availableRombels.length > 0 && isPrivilegedRole && (
              <Autocomplete
                size="small"
                options={availableRombels.map((r: any) => r.name || r.id)}
                value={assignedClass || null}
                onChange={(_, newValue) => {
                  if (newValue) handleSelectClass(newValue);
                }}
                disableClearable
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Pilih / Cari Kelas"
                    placeholder="Cari kelas..."
                    sx={{
                      bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc',
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        fontWeight: 700,
                        fontSize: { xs: '0.78rem', sm: '0.85rem' }
                      }
                    }}
                  />
                )}
                sx={{
                  minWidth: { xs: 0, sm: 200 },
                  flex: { xs: 1, sm: 'none' }
                }}
              />
            )}

            <Button
              size="small"
              variant="outlined"
              color="primary"
              startIcon={<RefreshIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />}
              onClick={() => {
                loadClassData();
                if (activeTab === 0) fetchDailyData();
                else fetchMatrix();
              }}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700,
                minHeight: { xs: 34, sm: 38 },
                fontSize: { xs: '0.75rem', sm: '0.82rem' },
                px: { xs: 1.2, sm: 2 },
                flexShrink: 0
              }}
            >
              Segarkan
            </Button>
          </Box>
        </Paper>

        {/* TABS NAVIGATION */}
        <Paper
          elevation={0}
          sx={{
            mb: 1.5,
            borderRadius: { xs: 2, sm: 2.5 },
            bgcolor: isDark ? preset.cardBg : '#ffffff',
            border: `1px solid ${preset.glassBorder}`,
            overflow: 'hidden'
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, val) => {
              setActiveTab(val);
              setShowPreview(false);
            }}
            indicatorColor="primary"
            textColor="primary"
            variant={isMobile ? 'fullWidth' : 'standard'}
            sx={{
              borderBottom: `1px solid ${preset.glassBorder}`,
              minHeight: { xs: 38, sm: 48 },
              '& .MuiTab-root': {
                fontWeight: 700,
                textTransform: 'none',
                fontSize: { xs: '0.75rem', sm: '0.92rem' },
                py: { xs: 0.8, sm: 1.4 },
                minHeight: { xs: 38, sm: 48 },
                color: preset.textColorSecondary
              }
            }}
          >
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                  <CalendarTodayIcon sx={{ fontSize: { xs: 15, sm: 18 } }} />
                  <span>Presensi Harian</span>
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                  <DownloadIcon sx={{ fontSize: { xs: 15, sm: 18 } }} />
                  <span>Ekspor & Matriks</span>
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                  <GroupsIcon sx={{ fontSize: { xs: 15, sm: 18 } }} />
                  <span>Rekap KBM Siswa</span>
                </Box>
              }
            />
          </Tabs>

          {/* ========================================================================= */}
          {/* TAB 0: LAPORAN PRESENSI HARIAN KELAS (RESPONSIVE SMARTPHONE & DESKTOP) */}
          {/* ========================================================================= */}
          {activeTab === 0 && (
            <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
              {/* Filter Date Bar & WhatsApp Actions */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  justifyContent: 'space-between',
                  alignItems: { xs: 'stretch', md: 'center' },
                  gap: 1.5,
                  mb: 2,
                  bgcolor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f8fafc',
                  p: { xs: 1.5, sm: 2 },
                  borderRadius: 2,
                  border: `1px solid ${preset.glassBorder}`
                }}
              >
                {/* Date Selection */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
                  <TextField
                    id="wali-filter-date"
                    type="date"
                    label="Tanggal Presensi"
                    size="small"
                    value={filterDate}
                    onChange={e => setFilterDate(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={{ width: { xs: '100%', sm: 200 }, bgcolor: isDark ? 'rgba(15, 23, 42, 0.8)' : '#ffffff' }}
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setFilterDate(getWIBDateString())}
                    sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, height: 40 }}
                  >
                    Hari Ini
                  </Button>
                </Stack>

                {/* WhatsApp & Print Action Buttons */}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: 'stretch',
                    gap: 1,
                    width: { xs: '100%', md: 'auto' }
                  }}
                >
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    startIcon={<PrintIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />}
                    onClick={handlePrintDaily}
                    sx={{
                      borderRadius: 2.5,
                      textTransform: 'none',
                      fontWeight: 800,
                      px: { xs: 1.5, sm: 2 },
                      fontSize: { xs: '0.8rem', sm: '0.875rem' },
                      whiteSpace: 'nowrap',
                      minHeight: 40,
                      boxShadow: { xs: '0 2px 8px rgba(239, 68, 68, 0.25)', md: '0 4px 14px rgba(239, 68, 68, 0.35)' },
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        md: {
                          transform: 'translateY(-1.5px)',
                          boxShadow: '0 6px 20px rgba(239, 68, 68, 0.45)'
                        }
                      },
                      '&:active': { transform: 'scale(0.97)' }
                    }}
                  >
                    Cetak / PDF Harian
                  </Button>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr 1fr', sm: 'auto auto' },
                      gap: 1,
                      width: { xs: '100%', sm: 'auto' }
                    }}
                  >
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      startIcon={<WhatsAppIcon sx={{ fontSize: { xs: 17, sm: 19 } }} />}
                      onClick={handleSendWaWeb}
                      fullWidth
                      sx={{
                        borderRadius: 2.5,
                        textTransform: 'none',
                        fontWeight: 800,
                        px: { xs: 1.2, sm: 2 },
                        fontSize: { xs: '0.75rem', sm: '0.85rem' },
                        whiteSpace: 'nowrap',
                        minHeight: 40,
                        boxShadow: { xs: '0 2px 8px rgba(34, 197, 94, 0.25)', md: '0 4px 14px rgba(34, 197, 94, 0.35)' },
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          md: {
                            transform: 'translateY(-1.5px)',
                            boxShadow: '0 6px 20px rgba(34, 197, 94, 0.45)'
                          }
                        },
                        '&:active': { transform: 'scale(0.97)' }
                      }}
                    >
                      Kirim WA Rekap
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      startIcon={<ContentCopyIcon sx={{ fontSize: { xs: 17, sm: 19 } }} />}
                      onClick={handleCopyWaText}
                      fullWidth
                      sx={{
                        borderRadius: 2.5,
                        textTransform: 'none',
                        fontWeight: 800,
                        px: { xs: 1.2, sm: 2 },
                        fontSize: { xs: '0.75rem', sm: '0.85rem' },
                        whiteSpace: 'nowrap',
                        minHeight: 40,
                        bgcolor: isDark ? 'rgba(15, 23, 42, 0.8)' : '#ffffff',
                        color: preset.textColorPrimary,
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          md: {
                            transform: 'translateY(-1.5px)',
                            bgcolor: alpha(theme.palette.primary.main, 0.12)
                          }
                        },
                        '&:active': { transform: 'scale(0.97)' }
                      }}
                    >
                      Salin Format WA
                    </Button>
                  </Box>
                </Box>
              </Box>

              {/* Statistics Counters Cards */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(2, 1fr)',
                    sm: 'repeat(4, 1fr)',
                    md: 'repeat(7, 1fr)'
                  },
                  gap: { xs: 0.75, sm: 1.25 },
                  mb: 2
                }}
              >
                {/* 1. TOTAL SISWA */}
                <Box
                  sx={{
                    p: { xs: 0.75, sm: 1.25, md: 1.75 },
                    borderRadius: { xs: 2, sm: 2.5, md: 3 },
                    background: isDark ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0'}`,
                    boxShadow: { xs: 'none', md: '0 4px 12px -2px rgba(15,23,42,0.04)' },
                    textAlign: 'center',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.3 }}>
                    <Box sx={{ width: { xs: 20, sm: 24 }, height: { xs: 20, sm: 24 }, borderRadius: 1.5, bgcolor: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9', color: isDark ? '#cbd5e1' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <LucideUsers size={12} strokeWidth={2.4} />
                    </Box>
                    <Typography variant="caption" sx={{ color: isDark ? '#cbd5e1' : '#475569', fontWeight: 800, fontSize: { xs: '0.62rem', sm: '0.68rem' }, letterSpacing: 0.2 }}>
                      TOTAL
                    </Typography>
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: preset.textColorPrimary, fontSize: { xs: '1.05rem', sm: '1.3rem', md: '1.5rem' }, lineHeight: 1.1 }}>
                    {dailyStats.total}
                  </Typography>
                </Box>

                {/* 2. HADIR */}
                <Box
                  sx={{
                    p: { xs: 0.75, sm: 1.25, md: 1.75 },
                    borderRadius: { xs: 2, sm: 2.5, md: 3 },
                    background: isDark ? 'linear-gradient(135deg, rgba(20, 83, 45, 0.35) 0%, rgba(15, 23, 42, 0.9) 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
                    border: `1px solid ${isDark ? 'rgba(34, 197, 94, 0.3)' : '#bbf7d0'}`,
                    boxShadow: { xs: 'none', md: '0 4px 12px -2px rgba(22,101,52,0.06)' },
                    textAlign: 'center',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.3 }}>
                    <Box sx={{ width: { xs: 20, sm: 24 }, height: { xs: 20, sm: 24 }, borderRadius: 1.5, bgcolor: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <LucideUserCheck size={12} strokeWidth={2.4} />
                    </Box>
                    <Typography variant="caption" sx={{ color: isDark ? '#4ade80' : '#166534', fontWeight: 800, fontSize: { xs: '0.62rem', sm: '0.68rem' }, letterSpacing: 0.2 }}>
                      HADIR
                    </Typography>
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: isDark ? '#4ade80' : '#15803d', fontSize: { xs: '1.05rem', sm: '1.3rem', md: '1.5rem' }, lineHeight: 1.1 }}>
                    {dailyStats.hadir}
                  </Typography>
                </Box>

                {/* 3. TERLAMBAT */}
                <Box
                  sx={{
                    p: { xs: 0.75, sm: 1.25, md: 1.75 },
                    borderRadius: { xs: 2, sm: 2.5, md: 3 },
                    background: isDark ? 'linear-gradient(135deg, rgba(120, 53, 15, 0.35) 0%, rgba(15, 23, 42, 0.9) 100%)' : 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)',
                    border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.3)' : '#fde68a'}`,
                    boxShadow: { xs: 'none', md: '0 4px 12px -2px rgba(180,83,9,0.06)' },
                    textAlign: 'center',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.3 }}>
                    <Box sx={{ width: { xs: 20, sm: 24 }, height: { xs: 20, sm: 24 }, borderRadius: 1.5, bgcolor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <LucideClock size={12} strokeWidth={2.4} />
                    </Box>
                    <Typography variant="caption" sx={{ color: isDark ? '#fbbf24' : '#92400e', fontWeight: 800, fontSize: { xs: '0.62rem', sm: '0.68rem' }, letterSpacing: 0.2 }}>
                      TERLAMBAT
                    </Typography>
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: isDark ? '#fbbf24' : '#b45309', fontSize: { xs: '1.05rem', sm: '1.3rem', md: '1.5rem' }, lineHeight: 1.1 }}>
                    {dailyStats.terlambat}
                  </Typography>
                </Box>

                {/* 4. SAKIT */}
                <Box
                  sx={{
                    p: { xs: 0.75, sm: 1.25, md: 1.75 },
                    borderRadius: { xs: 2, sm: 2.5, md: 3 },
                    background: isDark ? 'linear-gradient(135deg, rgba(113, 63, 18, 0.35) 0%, rgba(15, 23, 42, 0.9) 100%)' : 'linear-gradient(135deg, #ffffff 0%, #fefce8 100%)',
                    border: `1px solid ${isDark ? 'rgba(234, 179, 8, 0.3)' : '#fef08a'}`,
                    boxShadow: { xs: 'none', md: '0 4px 12px -2px rgba(161,98,7,0.06)' },
                    textAlign: 'center',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.3 }}>
                    <Box sx={{ width: { xs: 20, sm: 24 }, height: { xs: 20, sm: 24 }, borderRadius: 1.5, bgcolor: 'rgba(234, 179, 8, 0.2)', color: '#facc15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <LucideHeartPulse size={12} strokeWidth={2.4} />
                    </Box>
                    <Typography variant="caption" sx={{ color: isDark ? '#facc15' : '#854d0e', fontWeight: 800, fontSize: { xs: '0.62rem', sm: '0.68rem' }, letterSpacing: 0.2 }}>
                      SAKIT
                    </Typography>
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: isDark ? '#facc15' : '#a16207', fontSize: { xs: '1.05rem', sm: '1.3rem', md: '1.5rem' }, lineHeight: 1.1 }}>
                    {dailyStats.sakit}
                  </Typography>
                </Box>

                {/* 5. IZIN */}
                <Box
                  sx={{
                    p: { xs: 0.75, sm: 1.25, md: 1.75 },
                    borderRadius: { xs: 2, sm: 2.5, md: 3 },
                    background: isDark ? 'linear-gradient(135deg, rgba(12, 74, 110, 0.35) 0%, rgba(15, 23, 42, 0.9) 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
                    border: `1px solid ${isDark ? 'rgba(56, 189, 248, 0.3)' : '#bae6fd'}`,
                    boxShadow: { xs: 'none', md: '0 4px 12px -2px rgba(2,132,199,0.06)' },
                    textAlign: 'center',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.3 }}>
                    <Box sx={{ width: { xs: 20, sm: 24 }, height: { xs: 20, sm: 24 }, borderRadius: 1.5, bgcolor: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <LucideFileText size={12} strokeWidth={2.4} />
                    </Box>
                    <Typography variant="caption" sx={{ color: isDark ? '#38bdf8' : '#075985', fontWeight: 800, fontSize: { xs: '0.62rem', sm: '0.68rem' }, letterSpacing: 0.2 }}>
                      IZIN
                    </Typography>
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: isDark ? '#38bdf8' : '#0284c7', fontSize: { xs: '1.05rem', sm: '1.3rem', md: '1.5rem' }, lineHeight: 1.1 }}>
                    {dailyStats.izin}
                  </Typography>
                </Box>

                {/* 6. DISPENSASI */}
                <Box
                  sx={{
                    p: { xs: 0.75, sm: 1.25, md: 1.75 },
                    borderRadius: { xs: 2, sm: 2.5, md: 3 },
                    background: isDark ? 'linear-gradient(135deg, rgba(91, 33, 182, 0.35) 0%, rgba(15, 23, 42, 0.9) 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)',
                    border: `1px solid ${isDark ? 'rgba(168, 85, 247, 0.3)' : '#ddd6fe'}`,
                    boxShadow: { xs: 'none', md: '0 4px 12px -2px rgba(124,58,237,0.06)' },
                    textAlign: 'center',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.3 }}>
                    <Box sx={{ width: { xs: 20, sm: 24 }, height: { xs: 20, sm: 24 }, borderRadius: 1.5, bgcolor: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <LucideAward size={12} strokeWidth={2.4} />
                    </Box>
                    <Typography variant="caption" sx={{ color: isDark ? '#c084fc' : '#5b21b6', fontWeight: 800, fontSize: { xs: '0.62rem', sm: '0.68rem' }, letterSpacing: 0.2 }}>
                      DISPEN
                    </Typography>
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: isDark ? '#c084fc' : '#7c3aed', fontSize: { xs: '1.05rem', sm: '1.3rem', md: '1.5rem' }, lineHeight: 1.1 }}>
                    {dailyStats.dispensasi}
                  </Typography>
                </Box>

                {/* 7. ALPA */}
                <Box
                  sx={{
                    p: { xs: 0.75, sm: 1.25, md: 1.75 },
                    borderRadius: { xs: 2, sm: 2.5, md: 3 },
                    background: isDark ? 'linear-gradient(135deg, rgba(127, 29, 29, 0.35) 0%, rgba(15, 23, 42, 0.9) 100%)' : 'linear-gradient(135deg, #ffffff 0%, #fef2f2 100%)',
                    border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca'}`,
                    boxShadow: { xs: 'none', md: '0 4px 12px -2px rgba(220,38,38,0.06)' },
                    textAlign: 'center',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                    gridColumn: { xs: 'span 2', sm: 'span 1' }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.3 }}>
                    <Box sx={{ width: { xs: 20, sm: 24 }, height: { xs: 20, sm: 24 }, borderRadius: 1.5, bgcolor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <LucideAlertCircle size={12} strokeWidth={2.4} />
                    </Box>
                    <Typography variant="caption" sx={{ color: isDark ? '#f87171' : '#991b1b', fontWeight: 800, fontSize: { xs: '0.62rem', sm: '0.68rem' }, letterSpacing: 0.2 }}>
                      ALPA
                    </Typography>
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: isDark ? '#f87171' : '#dc2626', fontSize: { xs: '1.05rem', sm: '1.3rem', md: '1.5rem' }, lineHeight: 1.1 }}>
                    {dailyStats.alpa}
                  </Typography>
                </Box>
              </Box>

              {/* Search & Status Quick Filter Chips */}
              <Box sx={{ mb: 1.5, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1, alignItems: { sm: 'center' } }}>
                <TextField
                  id="wali-search-student"
                  size="small"
                  placeholder="Cari nama atau NISN siswa..."
                  value={searchStudent}
                  onChange={e => setSearchStudent(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                        </InputAdornment>
                      )
                    }
                  }}
                  sx={{
                    width: { xs: '100%', sm: 240 },
                    bgcolor: isDark ? 'rgba(15, 23, 42, 0.8)' : '#ffffff',
                    '& .MuiOutlinedInput-root': {
                      fontSize: { xs: '0.78rem', sm: '0.85rem' },
                      borderRadius: 2
                    }
                  }}
                />

                <Box sx={{ display: 'flex', gap: 0.5, overflowX: 'auto', pb: { xs: 0.5, sm: 0 }, width: '100%', '&::-webkit-scrollbar': { display: 'none' } }}>
                  {['SEMUA', 'Hadir', 'Terlambat', 'Sakit', 'Izin', 'Dispensasi', 'Alpa'].map(st => (
                    <Chip
                      key={st}
                      label={st}
                      size="small"
                      clickable
                      onClick={() => setStatusFilter(st)}
                      color={statusFilter === st ? 'primary' : 'default'}
                      variant={statusFilter === st ? 'filled' : 'outlined'}
                      sx={{ fontWeight: 700, height: { xs: 24, sm: 28 }, fontSize: { xs: '0.68rem', sm: '0.75rem' }, flexShrink: 0 }}
                    />
                  ))}
                </Box>
              </Box>

              {/* Student Attendance List: Smartphone Card View vs Desktop Table */}
              {isDailyLoading ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <CircularProgress size={32} />
                  <Typography variant="body2" sx={{ mt: 1.5, color: preset.textColorSecondary }}>Memuat data presensi harian...</Typography>
                </Box>
              ) : processedDailyStudents.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center', bgcolor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f8fafc', borderRadius: 2, border: `1px dashed ${preset.glassBorder}` }}>
                  <Typography variant="body2" sx={{ color: preset.textColorSecondary, fontWeight: 600, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                    {searchStudent || statusFilter !== 'SEMUA'
                      ? 'Tidak ada siswa yang cocok dengan filter pencarian.'
                      : `Tidak ada siswa aktif terdaftar pada kelas ${assignedClass}.`}
                  </Typography>
                </Box>
              ) : isMobile ? (
                /* SMARTPHONE CARD VIEW */
                <Stack spacing={1}>
                  {processedDailyStudents.map((student, idx) => (
                    <Card
                      key={student.id || idx}
                      variant="outlined"
                      sx={{
                        borderRadius: 2,
                        borderColor: preset.glassBorder,
                        bgcolor: isDark ? preset.cardBg : '#ffffff',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        '&:hover': { borderColor: 'primary.main' }
                      }}
                    >
                      <CardContent sx={{ p: 1.2, '&:last-child': { pb: 1.2 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.8 }}>
                          <Box sx={{ minWidth: 0, pr: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: preset.textColorPrimary, lineHeight: 1.2, fontSize: '0.82rem' }}>
                              {idx + 1}. {student.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: preset.textColorSecondary, fontSize: '0.68rem' }}>
                              NISN: {student.nisn || '-'}
                            </Typography>
                          </Box>
                          <Chip
                            label={student.statusLabel}
                            size="small"
                            color={student.statusColor}
                            sx={{ fontWeight: 800, height: 22, fontSize: '0.68rem', flexShrink: 0 }}
                          />
                        </Box>

                        <Divider sx={{ my: 0.8, borderColor: preset.glassBorder }} />

                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.8, bgcolor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f8fafc', p: 0.8, borderRadius: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <AccessTimeIcon sx={{ fontSize: 14, color: '#0284c7' }} />
                            <Box>
                              <Typography variant="caption" sx={{ color: preset.textColorSecondary, display: 'block', fontSize: '0.62rem' }}>Masuk</Typography>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: preset.textColorPrimary, fontSize: '0.72rem' }}>
                                {student.arrivalTime}
                              </Typography>
                            </Box>
                          </Box>

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <AccessTimeIcon sx={{ fontSize: 14, color: '#16a34a' }} />
                            <Box>
                              <Typography variant="caption" sx={{ color: preset.textColorSecondary, display: 'block', fontSize: '0.62rem' }}>Pulang</Typography>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: preset.textColorPrimary, fontSize: '0.72rem' }}>
                                {student.departureTime}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>

                        {student.note !== '-' && (
                          <Typography variant="caption" sx={{ color: preset.textColorSecondary, display: 'block', mt: 0.6, fontSize: '0.68rem', fontStyle: 'italic' }}>
                            {student.note}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              ) : (
                /* DESKTOP TABLE VIEW */
                <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${preset.glassBorder}`, borderRadius: 2, bgcolor: isDark ? preset.cardBg : '#ffffff' }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: isDark ? 'rgba(30, 41, 59, 0.85)' : '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800, width: 45, textAlign: 'center', color: preset.textColorPrimary }}>No</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: preset.textColorPrimary }}>Nama Lengkap Siswa</TableCell>
                        <TableCell sx={{ fontWeight: 800, width: 120, color: preset.textColorPrimary }}>NISN</TableCell>
                        <TableCell sx={{ fontWeight: 800, width: 130, color: preset.textColorPrimary }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 800, width: 110, color: preset.textColorPrimary }}>Jam Masuk</TableCell>
                        <TableCell sx={{ fontWeight: 800, width: 110, color: preset.textColorPrimary }}>Jam Pulang</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: preset.textColorPrimary }}>Keterangan</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {processedDailyStudents.map((student, idx) => (
                        <TableRow key={student.id || idx} hover sx={{ '&:nth-of-type(even)': { bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#fcfcfd' } }}>
                          <TableCell sx={{ textAlign: 'center', color: preset.textColorSecondary }}>{idx + 1}</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: preset.textColorPrimary }}>{student.name}</TableCell>
                          <TableCell sx={{ color: preset.textColorSecondary, fontSize: '0.82rem' }}>{student.nisn || '-'}</TableCell>
                          <TableCell>
                            <Chip
                              label={student.statusLabel}
                              size="small"
                              color={student.statusColor}
                              sx={{ fontWeight: 700, height: 22, fontSize: '0.72rem' }}
                            />
                          </TableCell>
                          <TableCell sx={{ color: preset.textColorPrimary, fontWeight: 600 }}>{student.arrivalTime}</TableCell>
                          <TableCell sx={{ color: preset.textColorPrimary, fontWeight: 600 }}>{student.departureTime}</TableCell>
                          <TableCell sx={{ color: preset.textColorSecondary, fontSize: '0.8rem' }}>{student.note}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: EKSPOR & LAPORAN MATRIKS PRESENSI SISWA (ADMIN-MATCHED LAYOUT) */}
          {/* ========================================================================= */}
          {activeTab === 1 && (
            <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
              {/* Form Konfigurasi Ekspor Matriks */}
              <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, mb: 3, border: `1px solid ${preset.glassBorder}`, borderRadius: 2.5, bgcolor: isDark ? preset.cardBg : '#ffffff' }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, color: preset.textColorPrimary, fontSize: { xs: '1.05rem', sm: '1.25rem' } }}>
                  Ekspor Matriks Presensi Bulanan ({assignedClass})
                </Typography>

                <Stack spacing={2.5} sx={{ maxWidth: 700 }}>
                  {/* Privileged Class Selector with Search */}
                  {isPrivilegedRole && availableRombels.length > 0 && (
                    <Autocomplete
                      size="small"
                      fullWidth
                      options={availableRombels.map((r: any) => r.name || r.id)}
                      value={assignedClass || null}
                      onChange={(_, newValue) => {
                        if (newValue) handleSelectClass(newValue);
                      }}
                      disableClearable
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Pilih / Cari Rombongan Belajar (Kelas)"
                          placeholder="Ketik untuk mencari kelas (misal: 10 TKJ 1)..."
                          sx={{
                            bgcolor: '#f8fafc',
                            '& .MuiOutlinedInput-root': {
                              fontWeight: 700
                            }
                          }}
                        />
                      )}
                    />
                  )}

                  {/* Date Pickers */}
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      id="wali-matrix-start-date"
                      type="date"
                      label="Tanggal Mulai"
                      size="small"
                      fullWidth
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                    <TextField
                      id="wali-matrix-end-date"
                      type="date"
                      label="Tanggal Selesai"
                      size="small"
                      fullWidth
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Stack>

                  {/* Orientation & Paper Size (Admin-Compliant) */}
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <FormControl size="small" fullWidth>
                      <InputLabel>Orientasi Cetak</InputLabel>
                      <Select value={orientation} onChange={e => setOrientation(e.target.value)} label="Orientasi Cetak">
                        <MenuItem value="landscape">Landscape (Disarankan untuk Matriks)</MenuItem>
                        <MenuItem value="portrait">Portrait</MenuItem>
                      </Select>
                    </FormControl>

                    <FormControl size="small" fullWidth>
                      <InputLabel>Ukuran Kertas (PDF)</InputLabel>
                      <Select value={paperSize} onChange={e => setPaperSize(e.target.value)} label="Ukuran Kertas (PDF)">
                        <MenuItem value="A4">A4 (210 × 297 mm)</MenuItem>
                        <MenuItem value="F4">F4 / Folio (215.9 × 330.2 mm)</MenuItem>
                        <MenuItem value="Legal">Legal (215.9 × 355.6 mm)</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>

                  {/* Action Buttons: Preview, Excel, Print PDF */}
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', pt: 1 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<VisibilityIcon />}
                      onClick={handlePreviewMatrix}
                      disabled={isMatrixLoading}
                      sx={{
                        flex: { xs: '1 1 100%', sm: '1 1 auto' },
                        py: 1.3,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 800
                      }}
                    >
                      {isMatrixLoading ? 'Memuat...' : 'TAMPILKAN (PREVIEW)'}
                    </Button>

                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<DownloadIcon />}
                      onClick={handleExportExcel}
                      disabled={isMatrixLoading}
                      sx={{
                        flex: { xs: '1 1 100%', sm: '1 1 auto' },
                        py: 1.3,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 800
                      }}
                    >
                      EKSPOR EXCEL (.xlsx)
                    </Button>

                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<PdfIcon />}
                      onClick={handlePrintMatrix}
                      disabled={isMatrixLoading}
                      sx={{
                        flex: { xs: '1 1 100%', sm: '1 1 auto' },
                        py: 1.3,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 800
                      }}
                    >
                      CETAK / PDF MATRIKS
                    </Button>
                  </Box>
                </Stack>
              </Paper>

              {/* Matrix Legend */}
              <Box id="matrix-preview-section" sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: preset.textColorSecondary }}>Keterangan Kode:</Typography>
                <Chip label="H = Hadir" size="small" sx={{ bgcolor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7', color: isDark ? '#4ade80' : '#166534', fontWeight: 700, height: 22, fontSize: '0.7rem' }} />
                <Chip label="S = Sakit" size="small" sx={{ bgcolor: isDark ? 'rgba(234, 179, 8, 0.2)' : '#fef9c3', color: isDark ? '#facc15' : '#854d0e', fontWeight: 700, height: 22, fontSize: '0.7rem' }} />
                <Chip label="I = Izin" size="small" sx={{ bgcolor: isDark ? 'rgba(56, 189, 248, 0.2)' : '#e0f2fe', color: isDark ? '#38bdf8' : '#075985', fontWeight: 700, height: 22, fontSize: '0.7rem' }} />
                <Chip label="A = Alpa" size="small" sx={{ bgcolor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2', color: isDark ? '#f87171' : '#991b1b', fontWeight: 700, height: 22, fontSize: '0.7rem' }} />
                <Chip label="Abu-abu = Libur / Akhir Pekan" size="small" sx={{ bgcolor: isDark ? 'rgba(51, 65, 85, 0.6)' : '#e2e8f0', color: isDark ? '#94a3b8' : '#475569', fontWeight: 600, height: 22, fontSize: '0.7rem' }} />
              </Box>

              {/* Interactive Matrix Table Preview */}
              {isMatrixLoading ? (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                  <CircularProgress size={36} />
                  <Typography variant="body2" sx={{ mt: 2, color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}>
                    Menyusun rekapitulasi matriks presensi siswa...
                  </Typography>
                </Box>
              ) : matrixData.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center', bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc', borderRadius: 2, border: `1px dashed ${isDark ? '#334155' : '#cbd5e1'}` }}>
                  <Typography variant="subtitle2" sx={{ color: isDark ? '#cbd5e1' : '#475569', fontWeight: 700 }}>
                    Tidak ada data matriks presensi untuk periode ini.
                  </Typography>
                  <Typography variant="caption" sx={{ color: isDark ? '#94a3b8' : '#94a3b8', mt: 0.5, display: 'block' }}>
                    Silakan klik tombol "TAMPILKAN (PREVIEW)" atau periksa tanggal filter.
                  </Typography>
                </Box>
              ) : (
                <Box>
                  {isCrossMonth && (
                    <Box sx={{ mb: 1.5, p: 1.2, bgcolor: isDark ? 'rgba(30, 58, 138, 0.3)' : '#eff6ff', border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.4)' : '#bfdbfe'}`, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label="Rekap Lintas Bulan" size="small" color="primary" sx={{ fontWeight: 800, fontSize: '0.68rem', height: 22 }} />
                      <Typography variant="caption" sx={{ color: isDark ? '#93c5fd' : '#1e40af', fontWeight: 600 }}>
                        Rentang tanggal mencakup lintas bulan ({format(new Date(startDate), 'dd MMM yyyy', { locale: id })} - {format(new Date(endDate), 'dd MMM yyyy', { locale: id })}). Menampilkan rekapitulasi akumulasi Hadir (H), Sakit (S), Izin (I), dan Alpha (A).
                      </Typography>
                    </Box>
                  )}
                  <TableContainer
                    component={Paper}
                    elevation={0}
                    sx={{
                      border: '1px solid #cbd5e1',
                      borderRadius: 2,
                      maxHeight: 620,
                      overflowX: 'auto',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}
                  >
                    <Table size="small" stickyHeader sx={{ minWidth: isCrossMonth ? 550 : 700 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ bgcolor: isDark ? 'rgba(30, 41, 59, 0.95)' : '#f1f5f9', fontWeight: 800, width: 36, textAlign: 'center', borderRight: `1px solid ${preset.glassBorder}`, p: '6px 4px', fontSize: '0.72rem', color: preset.textColorPrimary }}>NO</TableCell>
                          <TableCell sx={{ bgcolor: isDark ? 'rgba(30, 41, 59, 0.95)' : '#f1f5f9', fontWeight: 800, minWidth: 160, maxWidth: 220, position: 'sticky', left: 0, zIndex: 3, borderRight: `2px solid ${preset.glassBorder}`, p: '6px 8px', fontSize: '0.74rem', color: preset.textColorPrimary }}>
                            NAMA LENGKAP SISWA
                          </TableCell>
                          {!isCrossMonth && intervalDays.map(d => {
                            const weekend = isWeekend(d);
                            return (
                              <TableCell
                                key={d.toISOString()}
                                sx={{
                                  bgcolor: weekend ? (isDark ? 'rgba(51, 65, 85, 0.8)' : '#cbd5e1') : (isDark ? 'rgba(30, 41, 59, 0.95)' : '#e2e8f0'),
                                  fontWeight: 800,
                                  textAlign: 'center',
                                  fontSize: '0.68rem',
                                  p: '4px 2px',
                                  minWidth: 26,
                                  maxWidth: 28,
                                  color: weekend ? (isDark ? '#94a3b8' : '#475569') : preset.textColorPrimary,
                                  borderRight: `1px solid ${preset.glassBorder}`
                                }}
                              >
                                {format(d, 'dd')}
                              </TableCell>
                            );
                          })}
                          <TableCell sx={{ bgcolor: isDark ? 'rgba(20, 83, 45, 0.6)' : '#dcfce7', fontWeight: 800, textAlign: 'center', width: isCrossMonth ? 65 : 32, p: '4px 2px', fontSize: '0.72rem', color: isDark ? '#4ade80' : '#166534' }}>H</TableCell>
                          <TableCell sx={{ bgcolor: isDark ? 'rgba(113, 63, 18, 0.6)' : '#fef9c3', fontWeight: 800, textAlign: 'center', width: isCrossMonth ? 65 : 32, p: '4px 2px', fontSize: '0.72rem', color: isDark ? '#facc15' : '#854d0e' }}>S</TableCell>
                          <TableCell sx={{ bgcolor: isDark ? 'rgba(12, 74, 110, 0.6)' : '#e0f2fe', fontWeight: 800, textAlign: 'center', width: isCrossMonth ? 65 : 32, p: '4px 2px', fontSize: '0.72rem', color: isDark ? '#38bdf8' : '#075985' }}>I</TableCell>
                          <TableCell sx={{ bgcolor: isDark ? 'rgba(127, 29, 29, 0.6)' : '#fee2e2', fontWeight: 800, textAlign: 'center', width: isCrossMonth ? 65 : 32, p: '4px 2px', fontSize: '0.72rem', color: isDark ? '#f87171' : '#991b1b' }}>A</TableCell>
                          {isCrossMonth && (
                            <TableCell sx={{ bgcolor: isDark ? 'rgba(30, 41, 59, 0.95)' : '#f1f5f9', fontWeight: 800, textAlign: 'center', width: 85, p: '4px 2px', fontSize: '0.72rem', color: preset.textColorSecondary }}>KEHADIRAN</TableCell>
                          )}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {matrixData.map((row: any, i: number) => {
                          const h = Number(row.totals?.H || 0);
                          const s = Number(row.totals?.S || 0);
                          const iCount = Number(row.totals?.I || 0);
                          const a = Number(row.totals?.A || 0);
                          const sum = h + s + iCount + a;
                          const pct = sum > 0 ? `${Math.round((h / sum) * 100)}%` : '100%';

                          return (
                            <TableRow key={row.studentId || i} hover sx={{ '&:nth-of-type(even)': { bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc' } }}>
                              <TableCell sx={{ textAlign: 'center', color: preset.textColorSecondary, fontSize: '0.74rem', borderRight: `1px solid ${preset.glassBorder}`, p: '5px 4px' }}>{i + 1}</TableCell>
                              <TableCell
                                title={row.name}
                                sx={{
                                  fontWeight: 600,
                                  color: preset.textColorPrimary,
                                  position: 'sticky',
                                  left: 0,
                                  bgcolor: isDark ? preset.cardBg : '#ffffff',
                                  zIndex: 1,
                                  borderRight: `2px solid ${preset.glassBorder}`,
                                  whiteSpace: 'nowrap',
                                  maxWidth: 220,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  fontSize: '0.75rem',
                                  p: '5px 8px'
                                }}
                              >
                                {row.name}
                              </TableCell>
                              {!isCrossMonth && intervalDays.map(d => {
                                const dateKey = format(d, 'yyyy-MM-dd');
                                const val = row.attendance?.[dateKey] || '-';
                                const weekend = isWeekend(d);
                                const bg = weekend
                                  ? (isDark ? 'rgba(51, 65, 85, 0.5)' : '#e2e8f0')
                                  : val === 'H'
                                  ? 'transparent'
                                  : val === 'S'
                                  ? (isDark ? 'rgba(234, 179, 8, 0.3)' : '#fef08a')
                                  : val === 'I'
                                  ? (isDark ? 'rgba(56, 189, 248, 0.3)' : '#bae6fd')
                                  : val === 'A'
                                  ? (isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca')
                                  : 'transparent';
                                const textColor = val === 'H' ? (isDark ? '#4ade80' : '#166534') : val === 'S' ? (isDark ? '#facc15' : '#854d0e') : val === 'I' ? (isDark ? '#38bdf8' : '#075985') : val === 'A' ? (isDark ? '#f87171' : '#991b1b') : preset.textColorSecondary;

                                return (
                                  <TableCell
                                    key={d.toISOString()}
                                    sx={{
                                      textAlign: 'center',
                                      bgcolor: bg,
                                      fontWeight: val === 'H' ? 500 : 800,
                                      fontSize: '0.7rem',
                                      p: '4px 2px',
                                      color: textColor,
                                      borderRight: `1px solid ${preset.glassBorder}`
                                    }}
                                  >
                                    {val}
                                  </TableCell>
                                );
                              })}
                              <TableCell sx={{ textAlign: 'center', fontWeight: 800, bgcolor: isDark ? 'rgba(20, 83, 45, 0.3)' : '#f0fdf4', color: isDark ? '#4ade80' : '#166534', p: '4px 2px', fontSize: '0.74rem' }}>{h}</TableCell>
                              <TableCell sx={{ textAlign: 'center', fontWeight: 800, bgcolor: isDark ? 'rgba(113, 63, 18, 0.3)' : '#fefce8', color: isDark ? '#facc15' : '#854d0e', p: '4px 2px', fontSize: '0.74rem' }}>{s}</TableCell>
                              <TableCell sx={{ textAlign: 'center', fontWeight: 800, bgcolor: isDark ? 'rgba(12, 74, 110, 0.3)' : '#f0f9ff', color: isDark ? '#38bdf8' : '#075985', p: '4px 2px', fontSize: '0.74rem' }}>{iCount}</TableCell>
                              <TableCell sx={{ textAlign: 'center', fontWeight: 800, bgcolor: isDark ? 'rgba(127, 29, 29, 0.3)' : '#fef2f2', color: isDark ? '#f87171' : '#991b1b', p: '4px 2px', fontSize: '0.74rem' }}>{a}</TableCell>
                              {isCrossMonth && (
                                <TableCell sx={{ textAlign: 'center', fontWeight: 800, color: preset.textColorSecondary, p: '4px 2px', fontSize: '0.74rem' }}>{pct}</TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                      <tfoot>
                        <TableRow sx={{ bgcolor: isDark ? 'rgba(30, 41, 59, 0.95)' : '#e2e8f0', fontWeight: 'bold' }}>
                          <TableCell colSpan={isCrossMonth ? 2 : (2 + intervalDays.length)} sx={{ textAlign: 'right', fontWeight: 800, pr: 2, color: preset.textColorPrimary, fontSize: '0.75rem', p: '6px 8px' }}>
                            TOTAL KESELURUHAN KELAS {assignedClass}:
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center', fontWeight: 800, bgcolor: isDark ? 'rgba(20, 83, 45, 0.6)' : '#dcfce7', color: isDark ? '#4ade80' : '#166534', fontSize: '0.75rem', p: '6px 2px' }}>{matrixColumnTotals.totalH}</TableCell>
                          <TableCell sx={{ textAlign: 'center', fontWeight: 800, bgcolor: isDark ? 'rgba(113, 63, 18, 0.6)' : '#fef9c3', color: isDark ? '#facc15' : '#854d0e', fontSize: '0.75rem', p: '6px 2px' }}>{matrixColumnTotals.totalS}</TableCell>
                          <TableCell sx={{ textAlign: 'center', fontWeight: 800, bgcolor: isDark ? 'rgba(12, 74, 110, 0.6)' : '#e0f2fe', color: isDark ? '#38bdf8' : '#075985', fontSize: '0.75rem', p: '6px 2px' }}>{matrixColumnTotals.totalI}</TableCell>
                          <TableCell sx={{ textAlign: 'center', fontWeight: 800, bgcolor: isDark ? 'rgba(127, 29, 29, 0.6)' : '#fee2e2', color: isDark ? '#f87171' : '#991b1b', fontSize: '0.75rem', p: '6px 2px' }}>{matrixColumnTotals.totalA}</TableCell>
                          {isCrossMonth && (
                            <TableCell sx={{ textAlign: 'center', fontWeight: 800, color: preset.textColorPrimary, fontSize: '0.75rem', p: '6px 2px' }}>-</TableCell>
                          )}
                        </TableRow>
                      </tfoot>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: REKAP KBM SISWA KELAS BINAAN */}
          {/* ========================================================================= */}
          {activeTab === 2 && (
            <Box sx={{ p: { xs: 1, sm: 2 } }}>
              <MonitoringKbmSiswa restrictedClass={assignedClass} />
            </Box>
          )}
        </Paper>
      </Box>

      {/* ========================================================================= */}
      {/* FORMAL PRINTABLE LAYOUT (Laporan Harian & Matriks Bulanan Siswa) */}
      {/* ========================================================================= */}
      {/* 1. On-Screen Preview Modal / Card in Web Interface */}
      {showPreview && (
        <Box
          className="no-print"
          sx={{
            mt: 3,
            p: { xs: 2, sm: 3.5 },
            bgcolor: '#ffffff',
            borderRadius: 3,
            border: '2px solid #cbd5e1',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)'
          }}
        >
          {/* Preview Control Banner (Hidden on print) */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2.5,
              pb: 2,
              borderBottom: '1px solid #e2e8f0',
              flexWrap: 'wrap',
              gap: 1.5
            }}
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                📄 Pratinjau Dokumen Cetak / PDF Formal ({assignedClass}) - {printMode === 'daily' ? 'Laporan Harian' : 'Laporan Matriks'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                Format resmi sekolah dengan Kop, parameter lengkap, ringkasan statistik, dan lembar pengesahan
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="contained"
                color="error"
                startIcon={<PrintIcon />}
                onClick={() => window.print()}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
              >
                Cetak / PDF Sekarang
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setShowPreview(false)}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
              >
                Tutup Pratinjau
              </Button>
            </Stack>
          </Box>

          <Typography variant="body2" sx={{ color: '#64748b', mb: 2, fontStyle: 'italic' }}>
            * Klik tombol &quot;Cetak / PDF Sekarang&quot; di atas untuk mencetak atau menyimpan dokumen sebagai PDF. Sistem akan mengisolasi lembar dokumen resmi tanpa elemen website.
          </Typography>
        </Box>
      )}

      {/* 2. Isolated Print Portal rendered into #print-root */}
      {typeof document !== 'undefined' && document.getElementById('print-root') ? (
        createPortal(
          <Box id="printable-area-student" sx={{ width: '100%', bgcolor: '#ffffff', color: '#000000', p: 0, m: 0 }}>
            {printMode === 'daily' ? (
              <Box className="print-class-block" sx={{ mb: 2, pt: 1 }}>
                <style>{`
                  @media print {
                    @page {
                      size: ${paperSize === 'F4' ? '215.9mm 330.2mm' : paperSize === 'Legal' ? '215.9mm 355.6mm' : 'A4'} ${orientation || 'portrait'};
                      margin: 6mm 8mm;
                    }
                    body {
                      background-color: #ffffff !important;
                      -webkit-print-color-adjust: exact !important;
                      print-color-adjust: exact !important;
                    }
                    .print-table th, .print-table td {
                      border: 1px solid #475569 !important;
                    }
                  }
                `}</style>

                {/* Formal Kop Laporan */}
                <Box sx={{ textAlign: 'center', mb: 2, borderBottom: '3px double #000', pb: 1.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '13pt', color: '#000' }}>
                    {settings?.nama_website || settings?.namaWebsite || settings?.school_name || 'SMK NEGERI'}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '8.5pt', color: '#333', mb: 0.5 }}>
                    {settings?.alamat_sekolah || settings?.schoolAddress || 'Sistem Informasi Manajemen Presensi Siswa Digital'}
                    {settings?.telepon_sekolah ? ` | Telp: ${settings.telepon_sekolah}` : ''}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: '11pt', color: '#000', textDecoration: 'underline', mt: 1 }}>
                    LAPORAN REKAPITULASI PRESENSI SISWA HARIAN
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '8.5pt', fontWeight: 600, color: '#333', display: 'block', mt: 0.5 }}>
                    ROMBEL: {assignedClass} | WALI KELAS: {activeWaliKelas?.name || '-'} | PERIODE: {format(new Date(filterDate), 'EEEE, dd MMMM yyyy', { locale: id })} | DICETAK: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: id })} WIB
                  </Typography>
                </Box>

                {/* Ringkasan Statistik */}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 2 }}>
                  <Box sx={{ border: '1px solid #475569', p: 0.75, borderRadius: 1, textAlign: 'center', bgcolor: '#f8fafc' }}>
                    <Typography sx={{ fontSize: '6.5pt', fontWeight: 700, color: '#475569' }}>TOTAL SISWA</Typography>
                    <Typography sx={{ fontSize: '11pt', fontWeight: 800, color: '#0f172a' }}>{dailyStats.total}</Typography>
                  </Box>
                  <Box sx={{ border: '1px solid #16a34a', p: 0.75, borderRadius: 1, textAlign: 'center', bgcolor: '#f0fdf4' }}>
                    <Typography sx={{ fontSize: '6.5pt', fontWeight: 700, color: '#166534' }}>HADIR</Typography>
                    <Typography sx={{ fontSize: '11pt', fontWeight: 800, color: '#15803d' }}>{dailyStats.hadir}</Typography>
                  </Box>
                  <Box sx={{ border: '1px solid #d97706', p: 0.75, borderRadius: 1, textAlign: 'center', bgcolor: '#fffbeb' }}>
                    <Typography sx={{ fontSize: '6.5pt', fontWeight: 700, color: '#92400e' }}>TERLAMBAT</Typography>
                    <Typography sx={{ fontSize: '11pt', fontWeight: 800, color: '#b45309' }}>{dailyStats.terlambat}</Typography>
                  </Box>
                  <Box sx={{ border: '1px solid #ca8a04', p: 0.75, borderRadius: 1, textAlign: 'center', bgcolor: '#fefce8' }}>
                    <Typography sx={{ fontSize: '6.5pt', fontWeight: 700, color: '#854d0e' }}>SAKIT</Typography>
                    <Typography sx={{ fontSize: '11pt', fontWeight: 800, color: '#a16207' }}>{dailyStats.sakit}</Typography>
                  </Box>
                  <Box sx={{ border: '1px solid #0284c7', p: 0.75, borderRadius: 1, textAlign: 'center', bgcolor: '#f0f9ff' }}>
                    <Typography sx={{ fontSize: '6.5pt', fontWeight: 700, color: '#075985' }}>IZIN</Typography>
                    <Typography sx={{ fontSize: '11pt', fontWeight: 800, color: '#0369a1' }}>{dailyStats.izin}</Typography>
                  </Box>
                  <Box sx={{ border: '1px solid #7c3aed', p: 0.75, borderRadius: 1, textAlign: 'center', bgcolor: '#faf5ff' }}>
                    <Typography sx={{ fontSize: '6.5pt', fontWeight: 700, color: '#5b21b6' }}>DISPENSASI</Typography>
                    <Typography sx={{ fontSize: '11pt', fontWeight: 800, color: '#6d28d9' }}>{dailyStats.dispensasi}</Typography>
                  </Box>
                  <Box sx={{ border: '1px solid #dc2626', p: 0.75, borderRadius: 1, textAlign: 'center', bgcolor: '#fef2f2' }}>
                    <Typography sx={{ fontSize: '6.5pt', fontWeight: 700, color: '#991b1b' }}>ALPA</Typography>
                    <Typography sx={{ fontSize: '11pt', fontWeight: 800, color: '#b91c1c' }}>{dailyStats.alpa}</Typography>
                  </Box>
                </Box>

                {/* Daily Student Table */}
                <Box sx={{ overflowX: 'auto', width: '100%', mb: 2 }}>
                  <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt', color: '#000' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#e2e8f0', color: '#000' }}>
                        <th style={{ width: '30px', textAlign: 'center', padding: '6px', border: '1px solid #475569' }}>NO</th>
                        <th style={{ textAlign: 'left', padding: '6px', minWidth: '180px', border: '1px solid #475569' }}>NAMA LENGKAP SISWA</th>
                        <th style={{ width: '110px', textAlign: 'center', padding: '6px', border: '1px solid #475569' }}>NISN</th>
                        <th style={{ width: '100px', textAlign: 'center', padding: '6px', border: '1px solid #475569' }}>STATUS</th>
                        <th style={{ width: '80px', textAlign: 'center', padding: '6px', border: '1px solid #475569' }}>MASUK</th>
                        <th style={{ width: '80px', textAlign: 'center', padding: '6px', border: '1px solid #475569' }}>PULANG</th>
                        <th style={{ textAlign: 'left', padding: '6px', border: '1px solid #475569' }}>KETERANGAN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processedDailyStudents.map((s, idx) => {
                        const statusColor = s.status === 'HADIR' ? '#f0fdf4' : s.status === 'TERLAMBAT' ? '#fffbeb' : s.status === 'SAKIT' ? '#fefce8' : s.status === 'IZIN' ? '#f0f9ff' : s.status === 'DISPENSASI' ? '#faf5ff' : s.status === 'ALPA' ? '#fef2f2' : '#ffffff';
                        const textColor = s.status === 'HADIR' ? '#166534' : s.status === 'TERLAMBAT' ? '#92400e' : s.status === 'SAKIT' ? '#854d0e' : s.status === 'IZIN' ? '#075985' : s.status === 'DISPENSASI' ? '#5b21b6' : s.status === 'ALPA' ? '#991b1b' : '#334155';
                        return (
                          <tr key={s.id || idx} style={{ backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                            <td style={{ textAlign: 'center', padding: '5px', border: '1px solid #475569' }}>{idx + 1}</td>
                            <td style={{ fontWeight: 600, padding: '5px', border: '1px solid #475569' }}>{s.name}</td>
                            <td style={{ textAlign: 'center', padding: '5px', border: '1px solid #475569' }}>{s.nisn || '-'}</td>
                            <td style={{ textAlign: 'center', padding: '5px', backgroundColor: statusColor, color: textColor, fontWeight: 'bold', border: '1px solid #475569' }}>
                              {s.status}
                            </td>
                            <td style={{ textAlign: 'center', padding: '5px', border: '1px solid #475569' }}>{s.timeIn}</td>
                            <td style={{ textAlign: 'center', padding: '5px', border: '1px solid #475569' }}>{s.timeOut}</td>
                            <td style={{ padding: '5px', border: '1px solid #475569' }}>{s.note || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Box>

                {/* Tanda Tangan */}
                <Box className="print-avoid-break" sx={{ mt: 3, pt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <Box sx={{ textAlign: 'center', minWidth: '180px' }}>
                    <Typography variant="body2" sx={{ fontSize: '8.5pt' }}>Mengetahui,</Typography>
                    <Typography variant="body2" sx={{ fontSize: '8.5pt', fontWeight: 700 }}>Kepala Sekolah</Typography>
                    <Box sx={{ height: '50px' }} />
                    <Typography variant="body2" sx={{ fontSize: '8.5pt', fontWeight: 700, textDecoration: 'underline' }}>
                      ( {settings?.headmaster_name || settings?.headmasterName || '..................................................'} )
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: '7.5pt', display: 'block' }}>
                      NIP. {settings?.headmaster_nip || settings?.headmasterNip || '..........................................'}
                    </Typography>
                  </Box>

                  <Box sx={{ textAlign: 'center', minWidth: '180px' }}>
                    <Typography variant="body2" sx={{ fontSize: '8.5pt' }}>
                      {format(new Date(), 'dd MMMM yyyy', { locale: id })}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '8.5pt', fontWeight: 700 }}>Wali Kelas {assignedClass}</Typography>
                    <Box sx={{ height: '50px' }} />
                    <Typography variant="body2" sx={{ fontSize: '8.5pt', fontWeight: 700, textDecoration: 'underline' }}>
                      ( {activeWaliKelas?.name || '..................................................'} )
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: '7.5pt', display: 'block' }}>
                      NIP. {activeWaliKelas?.nip || '..........................................'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ) : (
              <Box className="print-class-block" sx={{ mb: 2, pt: 1 }}>
                <style>{`
                  @media print {
                    @page {
                      size: ${paperSize === 'F4' ? '215.9mm 330.2mm' : paperSize === 'Legal' ? '215.9mm 355.6mm' : 'A4'} ${orientation || 'landscape'};
                      margin: 5mm 6mm;
                    }
                    body {
                      background-color: #ffffff !important;
                      -webkit-print-color-adjust: exact !important;
                      print-color-adjust: exact !important;
                    }
                    #printable-area-student, .print-class-block {
                      width: 100% !important;
                      max-width: 100% !important;
                      margin: 0 !important;
                      padding: 0 !important;
                      box-sizing: border-box !important;
                    }
                    table.print-matrix-table {
                      width: 100% !important;
                      max-width: 100% !important;
                      table-layout: fixed !important;
                      border-collapse: collapse !important;
                      font-size: ${isCrossMonth ? '8.5pt' : intervalDays.length > 25 ? '6.2pt' : intervalDays.length > 15 ? '7pt' : '8pt'} !important;
                      font-family: Arial, sans-serif !important;
                      page-break-inside: auto !important;
                    }
                    table.print-matrix-table tr {
                      page-break-inside: avoid !important;
                      break-inside: avoid !important;
                    }
                    table.print-matrix-table thead {
                      display: table-header-group !important;
                    }
                    table.print-matrix-table tfoot {
                      display: table-footer-group !important;
                    }
                    table.print-matrix-table th, table.print-matrix-table td {
                      border: 1px solid #334155 !important;
                      padding: ${isCrossMonth ? '4px 6px' : '2px 1px'} !important;
                      overflow: hidden !important;
                      word-break: normal !important;
                    }
                  }
                `}</style>

                {/* Formal Kop Laporan Matriks */}
                <Box sx={{ textAlign: 'center', mb: 2, borderBottom: '3px double #000', pb: 1.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '13pt', color: '#000' }}>
                    {settings?.nama_website || settings?.namaWebsite || settings?.school_name || 'SMK NEGERI'}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '8.5pt', color: '#333', mb: 0.5 }}>
                    {settings?.alamat_sekolah || settings?.schoolAddress || 'Sistem Informasi Manajemen Presensi Siswa Digital'}
                    {settings?.telepon_sekolah ? ` | Telp: ${settings.telepon_sekolah}` : ''}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: '11pt', color: '#000', textDecoration: 'underline', mt: 1 }}>
                    {isCrossMonth ? 'LAPORAN REKAPITULASI PRESENSI SISWA (REKAP LINTAS BULAN)' : 'LAPORAN REKAPITULASI PRESENSI SISWA (MATRIKS BULANAN)'}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '8.5pt', fontWeight: 600, color: '#333', display: 'block', mt: 0.5 }}>
                    ROMBEL: {assignedClass} | WALI KELAS: {activeWaliKelas?.name || '-'} | PERIODE: {format(new Date(startDate), 'dd/MM/yyyy')} - {format(new Date(endDate), 'dd/MM/yyyy')}{isCrossMonth ? ' (LINTAS BULAN)' : ''} | DICETAK: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: id })} WIB
                  </Typography>
                </Box>

                {/* Summary Stats Grid */}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1, mb: 2 }}>
                  <Box sx={{ border: '1px solid #475569', p: 0.75, borderRadius: 1, textAlign: 'center', bgcolor: '#f8fafc' }}>
                    <Typography sx={{ fontSize: '7.5pt', fontWeight: 700, color: '#475569' }}>TOTAL SISWA</Typography>
                    <Typography sx={{ fontSize: '11pt', fontWeight: 800, color: '#0f172a' }}>{matrixData.length}</Typography>
                  </Box>
                  <Box sx={{ border: '1px solid #16a34a', p: 0.75, borderRadius: 1, textAlign: 'center', bgcolor: '#f0fdf4' }}>
                    <Typography sx={{ fontSize: '7.5pt', fontWeight: 700, color: '#166534' }}>AKUMULASI HADIR (H)</Typography>
                    <Typography sx={{ fontSize: '11pt', fontWeight: 800, color: '#15803d' }}>{matrixColumnTotals.totalH}</Typography>
                  </Box>
                  <Box sx={{ border: '1px solid #ca8a04', p: 0.75, borderRadius: 1, textAlign: 'center', bgcolor: '#fefce8' }}>
                    <Typography sx={{ fontSize: '7.5pt', fontWeight: 700, color: '#854d0e' }}>AKUMULASI SAKIT (S)</Typography>
                    <Typography sx={{ fontSize: '11pt', fontWeight: 800, color: '#a16207' }}>{matrixColumnTotals.totalS}</Typography>
                  </Box>
                  <Box sx={{ border: '1px solid #0284c7', p: 0.75, borderRadius: 1, textAlign: 'center', bgcolor: '#f0f9ff' }}>
                    <Typography sx={{ fontSize: '7.5pt', fontWeight: 700, color: '#075985' }}>AKUMULASI IZIN (I)</Typography>
                    <Typography sx={{ fontSize: '11pt', fontWeight: 800, color: '#0369a1' }}>{matrixColumnTotals.totalI}</Typography>
                  </Box>
                  <Box sx={{ border: '1px solid #dc2626', p: 0.75, borderRadius: 1, textAlign: 'center', bgcolor: '#fef2f2' }}>
                    <Typography sx={{ fontSize: '7.5pt', fontWeight: 700, color: '#991b1b' }}>AKUMULASI ALPA (A)</Typography>
                    <Typography sx={{ fontSize: '11pt', fontWeight: 800, color: '#b91c1c' }}>{matrixColumnTotals.totalA}</Typography>
                  </Box>
                </Box>

                {/* Matrix Table */}
                <Box sx={{ overflowX: 'auto', width: '100%', mb: 2 }}>
                  <table className="print-matrix-table" style={{ width: '100%', borderCollapse: 'collapse', color: '#000' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#e2e8f0', color: '#000' }}>
                        <th style={{ width: isCrossMonth ? '32px' : '24px', textAlign: 'center', border: '1px solid #475569' }}>NO</th>
                        {isCrossMonth && (
                          <th style={{ width: '85px', textAlign: 'center', border: '1px solid #475569' }}>NISN</th>
                        )}
                        <th style={{ textAlign: 'left', minWidth: isCrossMonth ? '160px' : '130px', width: isCrossMonth ? 'auto' : '22%', border: '1px solid #475569', paddingLeft: '4px' }}>NAMA LENGKAP SISWA</th>
                        {!isCrossMonth && intervalDays.map(d => (
                          <th key={d.toString()} style={{ textAlign: 'center', minWidth: '13px', maxWidth: '17px', fontSize: intervalDays.length > 25 ? '6pt' : '7pt', backgroundColor: isWeekend(d) ? '#cbd5e1' : '#e2e8f0', border: '1px solid #475569' }}>
                            {format(d, 'dd')}
                          </th>
                        ))}
                        <th style={{ width: isCrossMonth ? '50px' : '18px', textAlign: 'center', backgroundColor: '#dcfce7', border: '1px solid #475569' }}>H</th>
                        <th style={{ width: isCrossMonth ? '50px' : '18px', textAlign: 'center', backgroundColor: '#fef9c3', border: '1px solid #475569' }}>S</th>
                        <th style={{ width: isCrossMonth ? '50px' : '18px', textAlign: 'center', backgroundColor: '#e0f2fe', border: '1px solid #475569' }}>I</th>
                        <th style={{ width: isCrossMonth ? '50px' : '18px', textAlign: 'center', backgroundColor: '#fee2e2', border: '1px solid #475569' }}>A</th>
                        {isCrossMonth && (
                          <th style={{ width: '65px', textAlign: 'center', backgroundColor: '#f1f5f9', border: '1px solid #475569' }}>TOTAL %</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {matrixData.map((row: any, i: number) => {
                        const h = Number(row.totals?.H || 0);
                        const s = Number(row.totals?.S || 0);
                        const iCount = Number(row.totals?.I || 0);
                        const a = Number(row.totals?.A || 0);
                        const sum = h + s + iCount + a;
                        const pct = sum > 0 ? `${Math.round((h / sum) * 100)}%` : '100%';

                        return (
                          <tr key={i} style={{ backgroundColor: i % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                            <td style={{ textAlign: 'center', border: '1px solid #475569' }}>{i + 1}</td>
                            {isCrossMonth && (
                              <td style={{ textAlign: 'center', border: '1px solid #475569' }}>{row.nisn || '-'}</td>
                            )}
                            <td style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', border: '1px solid #475569', paddingLeft: '4px' }}>{row.name}</td>
                            {!isCrossMonth && intervalDays.map(d => {
                              const dateKey = format(d, 'yyyy-MM-dd');
                              const val = row.attendance?.[dateKey] || '-';
                              const weekend = isWeekend(d);
                              const bg = weekend ? '#e2e8f0' : val === 'H' ? 'transparent' : val === 'S' ? '#fef08a' : val === 'I' ? '#bae6fd' : val === 'A' ? '#fecaca' : 'transparent';
                              return (
                                <td key={d.toString()} style={{ textAlign: 'center', backgroundColor: bg, fontWeight: val === 'H' ? 'normal' : 'bold', border: '1px solid #475569' }}>
                                  {val}
                                </td>
                              );
                            })}
                            <td style={{ textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f0fdf4', border: '1px solid #475569' }}>{h}</td>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', backgroundColor: '#fefce8', border: '1px solid #475569' }}>{s}</td>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f0f9ff', border: '1px solid #475569' }}>{iCount}</td>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', backgroundColor: '#fef2f2', border: '1px solid #475569' }}>{a}</td>
                            {isCrossMonth && (
                              <td style={{ textAlign: 'center', fontWeight: 'bold', border: '1px solid #475569' }}>{pct}</td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ backgroundColor: '#e2e8f0', fontWeight: 'bold' }}>
                        <td colSpan={isCrossMonth ? 3 : (2 + intervalDays.length)} style={{ textAlign: 'right', paddingRight: '8px', border: '1px solid #475569' }}>
                          TOTAL KESELURUHAN KELAS {assignedClass}:
                        </td>
                        <td style={{ textAlign: 'center', backgroundColor: '#dcfce7', border: '1px solid #475569' }}>{matrixColumnTotals.totalH}</td>
                        <td style={{ textAlign: 'center', backgroundColor: '#fef9c3', border: '1px solid #475569' }}>{matrixColumnTotals.totalS}</td>
                        <td style={{ textAlign: 'center', backgroundColor: '#e0f2fe', border: '1px solid #475569' }}>{matrixColumnTotals.totalI}</td>
                        <td style={{ textAlign: 'center', backgroundColor: '#fee2e2', border: '1px solid #475569' }}>{matrixColumnTotals.totalA}</td>
                        {isCrossMonth && (
                          <td style={{ textAlign: 'center', border: '1px solid #475569' }}>-</td>
                        )}
                      </tr>
                    </tfoot>
                  </table>
                </Box>

                {/* Keterangan & Bagian Tanda Tangan */}
                <Box className="print-avoid-break" sx={{ mt: 2, pt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <Box sx={{ fontSize: '8pt', color: '#333', maxWidth: '320px' }}>
                    <b>Keterangan Status:</b><br />
                    • <b>H</b> : Hadir Tepat Waktu / Terlambat<br />
                    • <b>S</b> : Sakit (Ada Keterangan/Surat)<br />
                    • <b>I</b> : Izin Resmi Disetujui<br />
                    • <b>A</b> : Alpa (Tanpa Keterangan)
                  </Box>

                  <Box sx={{ display: 'flex', gap: 4 }}>
                    <Box sx={{ textAlign: 'center', minWidth: '170px' }}>
                      <Typography variant="body2" sx={{ fontSize: '8.5pt' }}>Mengetahui,</Typography>
                      <Typography variant="body2" sx={{ fontSize: '8.5pt', fontWeight: 700 }}>Kepala Sekolah</Typography>
                      <Box sx={{ height: '48px' }} />
                      <Typography variant="body2" sx={{ fontSize: '8.5pt', fontWeight: 700, textDecoration: 'underline' }}>
                        ( {settings?.headmaster_name || settings?.headmasterName || '..................................................'} )
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: '7.5pt', display: 'block' }}>
                        NIP. {settings?.headmaster_nip || settings?.headmasterNip || '..........................................'}
                      </Typography>
                    </Box>

                    <Box sx={{ textAlign: 'center', minWidth: '170px' }}>
                      <Typography variant="body2" sx={{ fontSize: '8.5pt' }}>
                        {format(new Date(), 'dd MMMM yyyy', { locale: id })}
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '8.5pt', fontWeight: 700 }}>Wali Kelas {assignedClass}</Typography>
                      <Box sx={{ height: '48px' }} />
                      <Typography variant="body2" sx={{ fontSize: '8.5pt', fontWeight: 700, textDecoration: 'underline' }}>
                        ( {activeWaliKelas?.name || '..................................................'} )
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: '7.5pt', display: 'block' }}>
                        NIP. {activeWaliKelas?.nip || '..........................................'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}
          </Box>,
          document.getElementById('print-root')!
        )
      ) : null}
    </Box>
  );
}
