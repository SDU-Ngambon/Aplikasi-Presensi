import toast, { Toaster } from 'react-hot-toast';

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { id } from 'date-fns/locale';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { format, parseISO, eachDayOfInterval, isWeekend } from 'date-fns';
import * as xlsx from 'xlsx';

// MUI Imports
import {
  Box, Typography, Button, TextField, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tabs, Tab, Stack, FormControl,
  InputLabel, Select, MenuItem, Chip, Alert, CircularProgress, Tooltip,
  LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  Divider, IconButton
} from '@mui/material';

import {
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  Send as SendIcon,
  Settings as SettingsIcon,
  WhatsApp as WhatsAppIcon,
  Groups as GroupsIcon,
  FilterList as FilterListIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  PersonOff as PersonOffIcon,
  Close as CloseIcon,
  Error as ErrorIcon,
  WarningAmber as WarningAmberIcon,
  OpenInNew as OpenInNewIcon,
  ContentCopy as ContentCopyIcon
} from '@mui/icons-material';
import WhatsAppSettingsCard from '../../components/WhatsAppSettingsCard';
import { formatWIBDateDDMMYYYY, formatWIBDateTimeIndo, formatWIBDateIndo, getWIBTimeString } from '../../timezone';
import MonitoringKbmSiswa from '../guru/MonitoringKbmSiswa';

interface SendProgressState {
  active: boolean;
  mode: 'broadcast' | 'group_all' | 'group_class' | 'wali';
  modeTitle: string;
  targetDescription: string;
  progress: number;
  stepText: string;
  activeKey?: string;
}

interface SendStatusNotification {
  open: boolean;
  modeTitle: string;
  modeType: 'broadcast' | 'group_all' | 'group_class' | 'wali';
  isSuccess: boolean;
  isWarning?: boolean;
  title: string;
  message: string;
  timestamp: string;
  date: string;
  targetInfo: string;
  channel: 'gateway' | 'web' | 'system';
  stats?: {
    total?: number;
    sent?: number;
    skipped?: number;
    failed?: number;
  };
  details?: Array<{
    target: string;
    status: 'sent' | 'skipped' | 'error';
    note?: string;
  }>;
  actionUrl?: string;
  actionLabel?: string;
  rawText?: string;
}

export default function Reports() {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [izin, setIzin] = useState<any[]>([]);
  const [rombelStatusMap, setRombelStatusMap] = useState<Record<string, string>>({});
  
  const [paperSize, setPaperSize] = useState('A4');
  const [orientation, setOrientation] = useState('landscape');
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-01'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [filterClass, setFilterClass] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [activeTab, setActiveTab] = useState('rekap');
  const [settings, setSettings] = useState<any>({});
  const [waNote, setWaNote] = useState('');
  const [waSendFilter, setWaSendFilter] = useState<'ALL' | 'HADIR_ONLY' | 'TIDAK_HADIR_ONLY'>('ALL');
  const [sendingGroup, setSendingGroup] = useState(false);

  // Status progress bar dan notifikasi modern hasil pengiriman WA
  const [sendProgress, setSendProgress] = useState<SendProgressState>({
    active: false,
    mode: 'broadcast',
    modeTitle: '',
    targetDescription: '',
    progress: 0,
    stepText: '',
    activeKey: undefined
  });

  const [sendStatusNotification, setSendStatusNotification] = useState<SendStatusNotification>({
    open: false,
    modeTitle: '',
    modeType: 'broadcast',
    isSuccess: true,
    title: '',
    message: '',
    timestamp: '',
    date: '',
    targetInfo: '',
    channel: 'gateway'
  });

  // Menyimpan referensi elemen untuk cetak PDF Native
  const printRef = useRef<HTMLDivElement>(null);
  const [matrixData, setMatrixData] = useState<any[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filterDate, filterClass, filterYear, activeTab]);

  async function fetchData() {
    try {
      let attUrl = '/api/attendance';
      if (activeTab === 'rekap' || activeTab === 'perkelas') {
          attUrl += `?date=${filterDate}`;
          if (filterClass && filterClass !== 'ALL') attUrl += `&class=${encodeURIComponent(filterClass)}`;
          if (filterYear && filterYear !== 'ALL') attUrl += `&year=${encodeURIComponent(filterYear)}`;
      }

      const [{ data: att }, { data: set }, { data: teach }, { data: studs }, { data: iz }, { data: rStatus }] = await Promise.all([
          axios.get(attUrl),
          axios.get('/api/settings'),
          axios.get('/api/teachers'),
          axios.get('/api/students'),
          axios.get('/api/piket/izin'),
          axios.get('/api/rombel/status-all').catch(() => ({ data: {} }))
      ]);
      setAttendance(att);
      setSettings(set);
      setTeachers(teach);
      setStudents(studs);
      setIzin(iz);
      setRombelStatusMap(rStatus || {});
    } catch (e) {
      setAttendance([]);
    }
  }

  const availableClasses = useMemo(() => Array.from(new Set(students.map(s => s.class).filter(Boolean))), [students]);
  const availableYears = useMemo(() => Array.from(new Set(students.map(s => s.year).filter(Boolean))), [students]);

  // Helper untuk mencari Wali Kelas dengan sinkronisasi pintar
  const findTeacherForClass = (className: string, year?: string) => {
    if (!className) return null;
    const cleanClass = className.trim().toLowerCase();
    
    // 1. Cocokkan nama kelas dan angkatan/tahun
    if (year) {
      const cleanYear = year.trim().toLowerCase();
      const matchBoth = teachers.find(t => 
        t.class && t.class.trim().toLowerCase() === cleanClass && 
        t.year && t.year.trim().toLowerCase() === cleanYear
      );
      if (matchBoth) return matchBoth;
    }
    
    // 2. Cocokkan berdasarkan nama rombel/kelas (hasil sinkronisasi dari Rombongan Belajar)
    const matchClass = teachers.find(t => 
      t.class && t.class.trim().toLowerCase() === cleanClass
    );
    if (matchClass) return matchClass;

    // 3. Cocokkan tanpa spasi (misal: "X RPL 1" vs "XRPL1")
    const stripped = cleanClass.replace(/[^a-z0-9]/g, '');
    const matchFuzzy = teachers.find(t => 
      t.class && t.class.toLowerCase().replace(/[^a-z0-9]/g, '') === stripped
    );
    return matchFuzzy || null;
  };

  // Helper untuk generate teks laporan presensi per kelas dengan filter
  const generateClassReportText = (className: string, year: string) => {
    // Filter hanya siswa aktif (bukan PKL dan bukan LULUS)
    const rawClassStudents = students.filter(s => s.class === className && s.year === year);
    const classStudents = rawClassStudents.filter(s => s.status !== 'PKL' && s.status !== 'LULUS');
    const recordsForClassDay = attendance.filter((r:any) => r.student?.class === className && r.student?.year === year && r.student?.status !== 'PKL');
    const arrivals = recordsForClassDay.filter((r:any) => r.type === 'ARRIVAL');
    const departures = recordsForClassDay.filter((r:any) => r.type === 'DEPARTURE');
    const arrivedStudentIds = new Set(arrivals.map((r:any) => r.student.id));
    const departedStudentIds = new Set(departures.map((r:any) => r.student.id));

    const isClassPkl = rombelStatusMap[className] === 'PKL';
    const notArrived = classStudents.filter(s => !arrivedStudentIds.has(s.id));
    const notDeparted = classStudents.filter((s:any) => arrivedStudentIds.has(s.id) && !departedStudentIds.has(s.id));

    const studentsIzin = notArrived.map(s => {
        const izinData = izin.find(i => i.nisn === s.nisn && i.tanggal_mulai <= filterDate && i.tanggal_selesai >= filterDate);
        return {
            ...s,
            statusIzin: izinData ? izinData.keterangan : 'Alpa'
        };
    });

    const countAlpa = studentsIzin.filter(s => s.statusIzin === 'Alpa').length;
    const countIzin = studentsIzin.filter(s => s.statusIzin !== 'Alpa').length;
    const countHadir = arrivals.length;
    const lateArrivals = arrivals.filter(r => r.status === 'LATE');

    let text = `*LAPORAN PRESENSI SISWA*\n`;
    text += `Kelas: *${className}* (Angkatan ${year || '-'})\n`;
    text += `Tanggal: ${format(new Date(filterDate), 'dd/MM/yyyy')}\n\n`;

    if (waSendFilter === 'HADIR_ONLY') {
      text += `*[ DAFTAR SISWA HADIR ]*\n`;
      text += `Total Hadir: ${countHadir} siswa (Tepat waktu: ${countHadir - lateArrivals.length}, Terlambat: ${lateArrivals.length})\n\n`;
      if (arrivals.length === 0) {
        text += `- Belum ada siswa yang hadir.\n`;
      } else {
        arrivals.forEach((r, idx) => {
          const sName = r.student?.name || 'Siswa';
          const scanTime = r.timestamp ? new Date(r.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) : '';
          const lateTag = r.status === 'LATE' ? ' (Terlambat)' : '';
          text += `${idx + 1}. ${sName} [${scanTime}]${lateTag}\n`;
        });
      }
    } else if (waSendFilter === 'TIDAK_HADIR_ONLY') {
      text += `*[ DAFTAR SISWA TIDAK HADIR ]*\n`;
      text += `• Izin/Sakit/Dispensasi: ${countIzin}\n`;
      text += `• Alpa: ${countAlpa}\n\n`;
      if (studentsIzin.length === 0) {
        text += `Alhamdulillah seluruh siswa hadir.\n`;
      } else {
        studentsIzin.forEach((s, idx) => {
          text += `${idx + 1}. ${s.name} (${s.statusIzin})\n`;
        });
      }
    } else {
      // ALL
      text += `*[ STATISTIK KEHADIRAN ]*\n`;
      text += `• Total Siswa: ${classStudents.length}\n`;
      text += `• Hadir: ${countHadir}\n`;
      text += `• Izin/Sakit/Dispensasi: ${countIzin}\n`;
      text += `• Alpa: ${countAlpa}\n`;
      text += `• Sudah Pulang: ${[...departedStudentIds].length}\n\n`;

      if (studentsIzin.length > 0) {
        text += `*Daftar Siswa Tidak Hadir / Keterangan:*\n`;
        studentsIzin.forEach((s, i) => {
          text += `${i + 1}. ${s.name} (${s.statusIzin})\n`;
        });
        text += `\n`;
      }
    }

    if (waNote.trim()) {
      text += `*Catatan Tambahan:*\n${waNote}\n\n`;
    }
    text += `_Dikirim melalui Sistem Presensi ${settings.websiteName || 'Sekolah'}_`;
    return text;
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const copyToClipboard = (text: string) => {
    if (!text) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success('Teks laporan berhasil disalin!');
    } else {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      toast.success('Teks laporan berhasil disalin!');
    }
  };

  const generateSchoolDailySummaryText = () => {
    const websiteName = settings.websiteName || 'Sistem Presensi';
    let text = `*📢 REKAP PRESENSI HARIAN SEKOLAH*\n`;
    text += `*${websiteName}*\n`;
    text += `📅 Tanggal: ${format(new Date(filterDate), 'dd/MM/yyyy')}\n`;
    text += `📋 Mode: ${waSendFilter === 'HADIR_ONLY' ? 'Hanya Siswa Hadir' : waSendFilter === 'TIDAK_HADIR_ONLY' ? 'Hanya Siswa Tidak Hadir' : 'Lengkap Seluruh Siswa'}\n\n`;

    const classesToProcess = Object.keys(classGroups);
    let totalSchoolStudents = 0;
    let totalSchoolHadir = 0;
    let totalSchoolIzin = 0;
    let totalSchoolAlpa = 0;

    const classSummaries: string[] = [];
    const classDetails: string[] = [];

    classesToProcess.forEach(key => {
      const [year, className] = key.split('_');
      const isPkl = rombelStatusMap[className] === 'PKL';
      // Jangan ikut sertakan kelas yang berstatus PKL
      if (isPkl) return;

      const rawRecords = classGroups[key] || [];
      // Filter hanya siswa aktif (jangan sertakan siswa berstatus PKL atau LULUS)
      const records = rawRecords.filter((r: any) => r.student?.status !== 'PKL' && r.statusText !== 'PKL' && r.student?.status !== 'LULUS');
      if (records.length === 0) return;

      totalSchoolStudents += records.length;

      const hadirRecords = records.filter((r: any) => r.arrival);
      const lateCount = hadirRecords.filter((r: any) => r.arrival?.status === 'LATE').length;
      const alpaRecords = records.filter((r: any) => r.statusText === 'Alpa');
      const izinRecords = records.filter((r: any) => r.statusText !== 'Alpa' && !r.arrival);

      totalSchoolHadir += hadirRecords.length;
      totalSchoolAlpa += alpaRecords.length;
      totalSchoolIzin += izinRecords.length;

      classSummaries.push(`• *${className}*: Hadir ${hadirRecords.length}/${records.length} (Terlambat ${lateCount}), Izin ${izinRecords.length}, Alpa ${alpaRecords.length}`);

      if (waSendFilter === 'HADIR_ONLY') {
        if (hadirRecords.length > 0) {
          const listLines = hadirRecords.map((r: any, idx: number) => {
            const scanTime = r.arrival?.timestamp ? new Date(r.arrival.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) : '';
            const lateTag = r.arrival?.status === 'LATE' ? ' (Terlambat)' : '';
            return `   ${idx + 1}. ${r.student.name} [${scanTime}]${lateTag}`;
          }).join('\n');
          classDetails.push(`*${className}* (Hadir ${hadirRecords.length} Siswa):\n${listLines}`);
        }
      } else if (waSendFilter === 'TIDAK_HADIR_ONLY') {
        const tidakHadir = records.filter((r: any) => !r.arrival);
        if (tidakHadir.length > 0) {
          const listLines = tidakHadir.map((r: any, idx: number) => `   ${idx + 1}. ${r.student.name} (${r.statusText})`).join('\n');
          classDetails.push(`*${className}* (Tidak Hadir ${tidakHadir.length} Siswa):\n${listLines}`);
        }
      } else {
        const tidakHadir = records.filter((r: any) => !r.arrival);
        if (tidakHadir.length > 0) {
          const listLines = tidakHadir.map((r: any, idx: number) => `   ${idx + 1}. ${r.student.name} (${r.statusText})`).join('\n');
          classDetails.push(`*${className}* (Keterangan Tidak Hadir):\n${listLines}`);
        }
      }
    });

    text += `📊 *RINGKASAN PER KELAS (${classSummaries.length} Rombel Aktif):*\n`;
    text += classSummaries.join('\n') + '\n\n';

    if (classDetails.length > 0) {
      text += `📝 *DAFTAR SISWA PER KELAS:*\n`;
      text += classDetails.join('\n\n') + '\n\n';
    }

    text += `📈 *TOTAL KESELURUHAN SEKOLAH:*\n`;
    text += `• Total Siswa Terdata: ${totalSchoolStudents}\n`;
    text += `• Total Hadir: ${totalSchoolHadir}\n`;
    text += `• Total Izin/Sakit: ${totalSchoolIzin}\n`;
    text += `• Total Alpa: ${totalSchoolAlpa}\n`;

    if (waNote.trim()) {
      text += `\n*Catatan Khusus:*\n${waNote}\n`;
    }
    text += `\n_Laporan otomatis dikirim oleh Sistem Presensi ${websiteName}_`;
    return text;
  };

  // 1. KIRIM KE WALI KELAS
  const sendToWA = async (groupKey: string) => {
    if (sendProgress.active) return;
    const [year, className] = groupKey.split('_');
    const teacher = findTeacherForClass(className, year);
    const modeTitle = `Kirim ke Wali Kelas (${className})`;

    if (!teacher) {
      setSendStatusNotification({
        open: true,
        modeTitle,
        modeType: 'wali',
        isSuccess: false,
        isWarning: true,
        title: 'Wali Kelas Belum Ditetapkan',
        message: `Belum ada data Wali Kelas yang terdaftar untuk Kelas ${className}. Silakan tetapkan nama Wali Kelas di menu Rombongan Belajar atau Data Guru.`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB',
        date: format(new Date(filterDate), 'dd MMMM yyyy', { locale: id }),
        targetInfo: `Kelas: ${className} (Wali Kelas Belum Ditentukan)`,
        channel: 'system'
      });
      toast.error(`Belum ada data Wali Kelas untuk Kelas ${className}`);
      return;
    }

    if (!teacher.whatsapp) {
      setSendStatusNotification({
        open: true,
        modeTitle,
        modeType: 'wali',
        isSuccess: false,
        isWarning: true,
        title: 'Nomor WhatsApp Belum Terdaftar',
        message: `Wali Kelas ${teacher.name} belum memiliki nomor WhatsApp terdaftar. Silakan lengkapi kontak pada menu Data Guru.`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB',
        date: format(new Date(filterDate), 'dd MMMM yyyy', { locale: id }),
        targetInfo: `${teacher.name} (Nomor WA Tidak Ada)`,
        channel: 'system'
      });
      toast.error(`Wali Kelas (${teacher.name}) belum memiliki nomor WhatsApp`);
      return;
    }

    const text = generateClassReportText(className, year);
    let phone = teacher.whatsapp.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.substring(1);
    const waWebUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

    setSendProgress({
      active: true,
      mode: 'wali',
      modeTitle,
      targetDescription: `${teacher.name} (${phone}) - Kelas ${className}`,
      progress: 25,
      stepText: `Menyiapkan format laporan presensi Kelas ${className}...`,
      activeKey: groupKey
    });

    try {
      await sleep(350);
      setSendProgress(prev => ({
        ...prev,
        progress: 60,
        stepText: settings.waApiKey 
          ? `Menghubungkan ke API Gateway untuk pengiriman ke ${teacher.name}...` 
          : 'Menyiapkan tautan kirim via WhatsApp Web...'
      }));
      await sleep(300);

      // Jika API Key WhatsApp sudah dikonfigurasi, kirim langsung via Server Gateway
      if (settings.waApiKey) {
        setSendProgress(prev => ({
          ...prev,
          progress: 85,
          stepText: 'Mentransmisikan data pesan ke WhatsApp Gateway...'
        }));

        const { data } = await axios.post('/api/reports/send-wa-wali', {
          phone,
          message: text,
          teacherName: teacher.name,
          className,
          date: filterDate
        });

        setSendProgress(prev => ({
          ...prev,
          progress: 100,
          stepText: 'Pengiriman selesai!'
        }));
        await sleep(300);

        if (data.success) {
          setSendStatusNotification({
            open: true,
            modeTitle,
            modeType: 'wali',
            isSuccess: true,
            title: 'Laporan Berhasil Terkirim ke Wali Kelas!',
            message: `Pesan rekap presensi Kelas ${className} berhasil diteruskan ke Wali Kelas ${teacher.name} (${phone}) melalui WhatsApp Gateway.`,
            timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB',
            date: format(new Date(filterDate), 'dd MMMM yyyy', { locale: id }),
            targetInfo: `${teacher.name} (${phone}) - Kelas ${className}`,
            channel: 'gateway',
            rawText: text
          });
          toast.success(`Berhasil mengirim rekap ke Wali Kelas: ${teacher.name}`);
          return;
        } else {
          window.open(waWebUrl, '_blank');
          setSendStatusNotification({
            open: true,
            modeTitle,
            modeType: 'wali',
            isSuccess: true,
            isWarning: true,
            title: 'Pengiriman Dialihkan ke WhatsApp Web',
            message: `${data.error || 'Server Gateway belum merespons.'} Pesan presensi telah dialihkan dan disiapkan melalui WhatsApp Web.`,
            timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB',
            date: format(new Date(filterDate), 'dd MMMM yyyy', { locale: id }),
            targetInfo: `${teacher.name} (${phone}) - Kelas ${className}`,
            channel: 'web',
            actionUrl: waWebUrl,
            actionLabel: 'Buka Ulang di WhatsApp Web',
            rawText: text
          });
          toast('Dialihkan ke WhatsApp Web', { icon: 'ℹ️' });
          return;
        }
      }

      setSendProgress(prev => ({
        ...prev,
        progress: 100,
        stepText: 'Membuka WhatsApp Web...'
      }));
      await sleep(200);

      window.open(waWebUrl, '_blank');
      setSendStatusNotification({
        open: true,
        modeTitle,
        modeType: 'wali',
        isSuccess: true,
        title: 'Tautan WhatsApp Web Berhasil Disiapkan!',
        message: `Pesan rekap presensi untuk Wali Kelas ${teacher.name} (${phone}) telah dibuka di WhatsApp Web.`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB',
        date: format(new Date(filterDate), 'dd MMMM yyyy', { locale: id }),
        targetInfo: `${teacher.name} (${phone}) - Kelas ${className}`,
        channel: 'web',
        actionUrl: waWebUrl,
        actionLabel: 'Buka Ulang di WhatsApp Web',
        rawText: text
      });
      toast.success(`Membuka WhatsApp Web untuk Wali Kelas: ${teacher.name}`);
    } catch (err: any) {
      window.open(waWebUrl, '_blank');
      setSendStatusNotification({
        open: true,
        modeTitle,
        modeType: 'wali',
        isSuccess: true,
        isWarning: true,
        title: 'Pengiriman Dialihkan ke WhatsApp Web',
        message: 'Koneksi ke API Gateway mengalami kendala. Pesan dialihkan dan dibuka di WhatsApp Web.',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB',
        date: format(new Date(filterDate), 'dd MMMM yyyy', { locale: id }),
        targetInfo: `${teacher.name} (${phone}) - Kelas ${className}`,
        channel: 'web',
        actionUrl: waWebUrl,
        actionLabel: 'Buka Ulang di WhatsApp Web',
        rawText: text
      });
      toast('Dialihkan ke WhatsApp Web', { icon: 'ℹ️' });
    } finally {
      setSendProgress(prev => ({ ...prev, active: false, activeKey: undefined }));
    }
  };

  // 2 & 3. KIRIM KE WHATSAPP GROUP (HARI INI / PER KELAS)
  const handleSendToGroup = async (groupKey?: string) => {
    if (sendProgress.active) return;
    const isPerClass = !!groupKey;
    const groupId = settings.waGroupId || settings.wa_group_id;
    const groupName = settings.waGroupName || settings.wa_group_name || 'Grup WhatsApp Sekolah';

    let classNameForMode = '';
    let yearForMode = '';
    if (isPerClass) {
      const [year, cName] = groupKey.split('_');
      classNameForMode = cName;
      yearForMode = year;
    }

    const modeTitle = isPerClass 
      ? `Kirim ke Grup WA (Kelas ${classNameForMode})` 
      : 'Kirim Rekap Hari Ini ke Grup WA';

    if (!groupId) {
      setSendStatusNotification({
        open: true,
        modeTitle,
        modeType: isPerClass ? 'group_class' : 'group_all',
        isSuccess: false,
        isWarning: true,
        title: 'ID WhatsApp Group Belum Dikonfigurasi',
        message: 'Pengiriman ke grup WhatsApp tidak dapat dilakukan karena ID Grup WhatsApp belum diatur. Silakan atur ID Grup pada menu Pengaturan API WA.',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB',
        date: format(new Date(filterDate), 'dd MMMM yyyy', { locale: id }),
        targetInfo: 'WhatsApp Group (Belum Terkonfigurasi)',
        channel: 'system'
      });
      toast.error('ID WhatsApp Group belum dikonfigurasi');
      return;
    }

    setSendProgress({
      active: true,
      mode: isPerClass ? 'group_class' : 'group_all',
      modeTitle,
      targetDescription: `${groupName} (${groupId})`,
      progress: 20,
      stepText: isPerClass 
        ? `Menyiapkan format rekap kehadiran Kelas ${classNameForMode}...` 
        : 'Menyusun rekapitulasi kehadiran seluruh kelas...',
      activeKey: groupKey || 'group_all'
    });

    try {
      setSendingGroup(true);
      await sleep(350);

      let messageToSend = '';
      if (isPerClass) {
        messageToSend = generateClassReportText(classNameForMode, yearForMode);
      } else if (filterClass && filterClass !== 'ALL') {
        messageToSend = generateClassReportText(filterClass, filterYear);
      } else {
        messageToSend = generateSchoolDailySummaryText();
      }

      setSendProgress(prev => ({
        ...prev,
        progress: 55,
        stepText: `Menghubungkan ke WhatsApp Group: ${groupName}...`
      }));
      await sleep(300);

      setSendProgress(prev => ({
        ...prev,
        progress: 80,
        stepText: 'Mentransmisikan data rekap ke server WhatsApp Gateway...'
      }));

      const { data } = await axios.post('/api/settings/wa-send-group', {
        targetGroupId: groupId,
        message: messageToSend,
        date: filterDate,
        filter: waSendFilter,
        sendAllClasses: !isPerClass && (!filterClass || filterClass === 'ALL')
      });

      setSendProgress(prev => ({
        ...prev,
        progress: 100,
        stepText: 'Pengiriman ke grup berhasil!'
      }));
      await sleep(300);

      if (data.success) {
        setSendStatusNotification({
          open: true,
          modeTitle,
          modeType: isPerClass ? 'group_class' : 'group_all',
          isSuccess: true,
          title: isPerClass 
            ? `Laporan Kelas ${classNameForMode} Berhasil Terkirim!` 
            : 'Rekap Presensi Harian Berhasil Terkirim ke Grup WA!',
          message: data.message || `Rekap kehadiran presensi tanggal ${format(new Date(filterDate), 'dd/MM/yyyy')} berhasil dikirim ke grup WhatsApp.`,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB',
          date: format(new Date(filterDate), 'dd MMMM yyyy', { locale: id }),
          targetInfo: `${groupName} (ID: ${groupId})`,
          channel: 'gateway',
          rawText: messageToSend
        });
        toast.success(data.message || 'Laporan berhasil dikirim ke grup WhatsApp!');
      } else {
        setSendStatusNotification({
          open: true,
          modeTitle,
          modeType: isPerClass ? 'group_class' : 'group_all',
          isSuccess: false,
          title: 'Gagal Mengirim ke Grup WhatsApp',
          message: data.error || 'Server WhatsApp Gateway menolak transmisi pesan grup.',
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB',
          date: format(new Date(filterDate), 'dd MMMM yyyy', { locale: id }),
          targetInfo: `${groupName} (ID: ${groupId})`,
          channel: 'gateway'
        });
        toast.error(data.error || 'Gagal mengirim ke grup WhatsApp');
      }
    } catch (e: any) {
      setSendStatusNotification({
        open: true,
        modeTitle,
        modeType: isPerClass ? 'group_class' : 'group_all',
        isSuccess: false,
        title: 'Kesalahan Sistem Pengiriman Grup',
        message: e.response?.data?.error || e.message || 'Gagal terhubung ke WhatsApp Gateway untuk pengiriman ke grup.',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB',
        date: format(new Date(filterDate), 'dd MMMM yyyy', { locale: id }),
        targetInfo: `${groupName} (ID: ${groupId})`,
        channel: 'gateway'
      });
      toast.error(e.response?.data?.error || 'Gagal mengirim ke WhatsApp Group');
    } finally {
      setSendingGroup(false);
      setSendProgress(prev => ({ ...prev, active: false, activeKey: undefined }));
    }
  };

  // 4. BROADCAST KIRIM WA (SELURUH KELAS & GRUP)
  const handleBroadcastWA = async () => {
    if (sendProgress.active) return;
    setSendProgress({
      active: true,
      mode: 'broadcast',
      modeTitle: 'Broadcast Kirim WA',
      targetDescription: 'Seluruh Wali Kelas & WhatsApp Group Sekolah',
      progress: 15,
      stepText: 'Menyiapkan data absensi harian seluruh rombongan belajar...',
      activeKey: 'broadcast'
    });

    try {
      await sleep(400);
      setSendProgress(prev => ({
        ...prev,
        progress: 45,
        stepText: 'Menghubungkan ke Server WhatsApp Gateway...'
      }));

      const { data } = await axios.post('/api/settings/wa-send-daily-reports', { date: filterDate });

      setSendProgress(prev => ({
        ...prev,
        progress: 85,
        stepText: 'Menerima konfirmasi transmisi broadcast presensi...'
      }));
      await sleep(350);

      setSendProgress(prev => ({
        ...prev,
        progress: 100,
        stepText: 'Proses broadcast selesai!'
      }));
      await sleep(300);

      if (data.success) {
        const detailsList = (data.details || []).map((d: any) => ({
          target: d.class === 'ALL_GROUP' ? `Grup WhatsApp (${d.target || 'Sekolah'})` : `Kelas ${d.class} (${d.teacher || 'Wali Kelas'})`,
          status: d.status as 'sent' | 'skipped' | 'error',
          note: d.reason || d.error || (d.status === 'sent' ? 'Berhasil terkirim' : '')
        }));
        const sentCount = data.sentCount || detailsList.filter((d: any) => d.status === 'sent').length;
        const skippedCount = detailsList.filter((d: any) => d.status === 'skipped').length;
        const failedCount = detailsList.filter((d: any) => d.status === 'error').length;

        setSendStatusNotification({
          open: true,
          modeTitle: 'Broadcast Kirim WA',
          modeType: 'broadcast',
          isSuccess: true,
          title: 'Broadcast Presensi Selesai Diproses',
          message: `Sebanyak ${sentCount} pesan rekap kehadiran berhasil diproses dan dikirim via WhatsApp Gateway.`,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB',
          date: format(new Date(filterDate), 'dd MMMM yyyy', { locale: id }),
          targetInfo: 'Seluruh Wali Kelas & WhatsApp Group Sekolah',
          channel: 'gateway',
          stats: {
            total: detailsList.length,
            sent: sentCount,
            skipped: skippedCount,
            failed: failedCount
          },
          details: detailsList
        });
        toast.success(`Broadcast berhasil: ${sentCount} pesan terkirim.`);
      } else {
        setSendStatusNotification({
          open: true,
          modeTitle: 'Broadcast Kirim WA',
          modeType: 'broadcast',
          isSuccess: false,
          title: 'Broadcast Mengalami Kendala',
          message: data.error || 'Server WhatsApp Gateway tidak dapat memproses broadcast.',
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB',
          date: format(new Date(filterDate), 'dd MMMM yyyy', { locale: id }),
          targetInfo: 'Seluruh Wali Kelas & WhatsApp Group',
          channel: 'gateway'
        });
        toast.error(`Broadcast gagal: ${data.error || 'Terjadi kesalahan'}`);
      }
    } catch (e: any) {
      setSendStatusNotification({
        open: true,
        modeTitle: 'Broadcast Kirim WA',
        modeType: 'broadcast',
        isSuccess: false,
        title: 'Kesalahan Sistem Broadcast',
        message: e.response?.data?.error || e.message || 'Gagal menghubungi server WhatsApp Gateway.',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB',
        date: format(new Date(filterDate), 'dd MMMM yyyy', { locale: id }),
        targetInfo: 'Seluruh Wali Kelas & WhatsApp Group',
        channel: 'gateway'
      });
      toast.error('Error saat menghubungi server broadcast');
    } finally {
      setSendProgress(prev => ({ ...prev, active: false, activeKey: undefined }));
    }
  };

  const handleSaveAPI = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          await axios.post('/api/settings', settings);
          toast.success('Konfigurasi API WA berhasil disimpan');
      } catch (error: any) { toast.error('Gagal menyimpan konfigurasi API'); }
  };

  // --- EXPORT EXCEL (LIGHTWEIGHT) ---
  
  const fetchMatrixData = async () => {
      if (!filterClass || !filterYear) {
          toast.error("Silakan pilih Kelas dan Angkatan terlebih dahulu!");
          return null;
      }
      try {
          const { data: matrix } = await axios.get('/api/attendance/matrix', {
              params: { startDate, endDate, class: filterClass, year: filterYear }
          });
          
          // Group by class if we selected ALL
          const grouped: any = {};
          matrix.forEach((row: any) => {
              const key = `${row.year}_${row.className}`;
              if (!grouped[key]) grouped[key] = { className: row.className, year: row.year, matrix: [] };
              grouped[key].matrix.push(row);
          });
          return Object.values(grouped);
      } catch (e) {
          toast.error("Gagal mengambil data matriks");
          return null;
      }
  };

  const handlePreviewMatrix = async () => {
      const data = await fetchMatrixData();
      if (data) {
          setPreviewData(data);
          setShowPreview(true);
      }
  };

  const handleExportMatrixPDF = async () => {
      const data = previewData.length > 0 ? previewData : await fetchMatrixData();
      if (data) {
          setPreviewData(data);
          setShowPreview(true);
          setTimeout(() => {
              setIsPrinting(true);
              setTimeout(() => {
                  window.print();
                  setIsPrinting(false);
              }, 500);
          }, 100);
      }
  };

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

  const handleExportMatrixExcel = async () => {
    if (!filterClass || !filterYear) return toast.error("Silakan pilih Kelas dan Angkatan terlebih dahulu!");
    try {
        const { data: matrix } = await axios.get('/api/attendance/matrix', {
            params: { startDate, endDate, class: filterClass, year: filterYear }
        });
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = eachDayOfInterval({ start, end });
        
        const rows: any[][] = [];
        const schoolName = settings?.nama_website || settings?.namaWebsite || settings?.judul_aplikasi || 'SMK';
        
        rows.push([schoolName.toUpperCase()]);
        rows.push([isCrossMonth ? `LAPORAN REKAPITULASI PRESENSI SISWA (LINTAS BULAN) KELAS ${filterClass}` : `REKAPITULASI PRESENSI SISWA KELAS ${filterClass}`]);
        rows.push([`Periode: ${format(start, 'dd/MM/yyyy')} - ${format(end, 'dd/MM/yyyy')}${isCrossMonth ? ' (Rekapitulasi Lintas Bulan)' : ''}`]);
        rows.push([]);

        let totalColH = 0;
        let totalColS = 0;
        let totalColI = 0;
        let totalColA = 0;

        if (isCrossMonth) {
          // Lintas bulan: Hanya kolom rekapitulasi H, S, I, A, %
          const headers = ['NO', 'NAMA LENGKAP SISWA', 'NISN', 'KELAS', 'HADIR (H)', 'SAKIT (S)', 'IZIN (I)', 'ALPA (A)', 'TOTAL KEHADIRAN (%)'];
          rows.push(headers);

          matrix.forEach((rowItem: any, idx: number) => {
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
              rowItem.className || filterClass,
              h,
              s,
              i,
              a,
              percentage
            ]);
          });

          const totalAll = totalColH + totalColS + totalColI + totalColA;
          const totalPct = totalAll > 0 ? `${Math.round((totalColH / totalAll) * 100)}%` : '100%';
          rows.push(['TOTAL KESELURUHAN KELAS', '', '', '', totalColH, totalColS, totalColI, totalColA, totalPct]);

          const worksheet = xlsx.utils.aoa_to_sheet(rows);
          worksheet['!cols'] = [
            { wch: 6 },
            { wch: 32 },
            { wch: 15 },
            { wch: 12 },
            { wch: 12 },
            { wch: 12 },
            { wch: 12 },
            { wch: 12 },
            { wch: 22 }
          ];

          const workbook = xlsx.utils.book_new();
          xlsx.utils.book_append_sheet(workbook, worksheet, "Rekap");
          xlsx.writeFile(workbook, `Rekap_Presensi_LintasBulan_${filterClass}_${startDate}_${endDate}.xlsx`);
        } else {
          const headers = ['NO', 'NAMA SISWA', 'NISN', 'KELAS'];
          days.forEach(d => headers.push(format(d, 'dd/MM')));
          headers.push('H', 'S', 'I', 'A');
          rows.push(headers);
          
          matrix.forEach((rowItem: any, idx: number) => {
              const rowData: any[] = [idx + 1, rowItem.name, rowItem.nisn || '-', rowItem.className || filterClass];
              days.forEach(d => rowData.push(rowItem.attendance[format(d, 'yyyy-MM-dd')] || '-'));
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

          const footerRow: any[] = ['TOTAL KESELURUHAN KELAS', '', '', ''];
          days.forEach(() => footerRow.push(''));
          footerRow.push(totalColH, totalColS, totalColI, totalColA);
          rows.push(footerRow);

          const worksheet = xlsx.utils.aoa_to_sheet(rows);
          const colWidths = [
            { wch: 5 },
            { wch: 30 },
            { wch: 15 },
            { wch: 12 }
          ];
          days.forEach(() => colWidths.push({ wch: 7 }));
          colWidths.push({ wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 });
          worksheet['!cols'] = colWidths;

          const workbook = xlsx.utils.book_new();
          xlsx.utils.book_append_sheet(workbook, worksheet, "Rekap");
          xlsx.writeFile(workbook, `Rekap_Matriks_${filterClass}_${startDate}_${endDate}.xlsx`);
        }
        toast.success("File Excel matriks presensi berhasil diunduh!");
    } catch (e) { toast.error("Gagal melakukan ekspor Excel."); }
  };

  

  const classGroups = students.reduce((acc: any, student: any) => {
    // Only process students if they match filters
    if (filterClass && filterClass !== 'ALL' && student.class !== filterClass) return acc;
    if (filterYear && filterYear !== 'ALL' && student.year !== filterYear) return acc;
    
    // Check if student has graduated or inactive
    if (student.status === 'LULUS' || student.status === 'INACTIVE') return acc;
    
    const key = `${student.year || 'Unknown'}_${student.class || 'Unknown'}`;
    if (!acc[key]) acc[key] = [];
    
    // Find attendance records
    const studentRecords = attendance.filter((r: any) => r.student?.id === student.id);
    const arrival = studentRecords.find((r: any) => r.type === 'ARRIVAL');
    const departure = studentRecords.find((r: any) => r.type === 'DEPARTURE');
    
    // Find izin
    const izinData = izin.find((i: any) => i.nisn === student.nisn && i.tanggal_mulai <= filterDate && i.tanggal_selesai >= filterDate);
    
    // Status PKL: jika kelas berstatus PKL atau siswa berstatus PKL, jangan pernah tandai Alpa!
    const isPkl = student.status === 'PKL' || rombelStatusMap[student.class] === 'PKL';
    let statusText = isPkl ? 'PKL' : 'Alpa';
    let statusColor = isPkl ? 'secondary' : 'error';
    if (arrival) {
      statusText = arrival.status === 'LATE' ? 'Terlambat' : 'Hadir';
      statusColor = arrival.status === 'LATE' ? 'warning' : 'success';
    } else if (izinData) {
      statusText = izinData.keterangan;
      statusColor = 'info';
    }
    
    acc[key].push({
      student,
      arrival,
      departure,
      statusText,
      statusColor,
      izinData,
      isPkl
    });
    return acc;
  }, {});

  const currentDays = eachDayOfInterval({ start: new Date(startDate), end: new Date(endDate) });

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={id}>
    <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
      
      {/* TAMPILAN NORMAL (DISEMBUNYIKAN SAAT PRINT PDF) */}
      <Box sx={{ '@media print': { display: 'none' } }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }} color="text.primary">Laporan Presensi Siswa</Typography>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={(_, newValue) => { setActiveTab(newValue); setShowPreview(false); }} indicatorColor="primary" textColor="primary">
            <Tab label="Rekap Laporan" value="rekap" sx={{ textTransform: 'none', fontWeight: 'medium' }} />
            <Tab label="Rekap Perkelas & WA" value="perkelas" sx={{ textTransform: 'none', fontWeight: 'medium' }} />
            <Tab label="Ekspor Laporan Matriks" value="ekspor" sx={{ textTransform: 'none', fontWeight: 'medium' }} />
            <Tab label="Rekap Laporan KBM Siswa" value="rekap-kbm-siswa" sx={{ textTransform: 'none', fontWeight: 'medium' }} />
          </Tabs>
        </Box>

        {(activeTab === 'rekap' || activeTab === 'perkelas') && (
          <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end' }}>
            <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", alignItems: 'flex-end' }}>
              <DatePicker label="Tanggal Laporan" format="dd/MM/yyyy" slotProps={{ textField: { size: 'small', sx: { width: 200 } } }} value={parseISO(filterDate)} onChange={(v: any) => v && setFilterDate(format(v, 'yyyy-MM-dd'))} />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Kelas (Opsional)</InputLabel>
                  <Select value={filterClass} onChange={e => setFilterClass(e.target.value)} label="Kelas (Opsional)">
                    <MenuItem value="">Semua Kelas</MenuItem>
                    <MenuItem value="ALL">Semua Kelas</MenuItem>
                    {availableClasses.map(c => <MenuItem key={c as string} value={c as string}>{c as string}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Angkatan (Opsional)</InputLabel>
                  <Select value={filterYear} onChange={e => setFilterYear(e.target.value)} label="Angkatan (Opsional)">
                    <MenuItem value="">Semua Angkatan</MenuItem>
                    <MenuItem value="ALL">Semua Angkatan</MenuItem>
                    {availableYears.map(y => <MenuItem key={y as string} value={y as string}>{y as string}</MenuItem>)}
                  </Select>
                </FormControl>
              {activeTab === 'perkelas' && (
                <Button 
                  variant="contained" 
                  color="success" 
                  startIcon={sendProgress.active && sendProgress.activeKey === 'broadcast' ? <CircularProgress size={18} color="inherit" /> : <WhatsAppIcon />} 
                  disabled={sendProgress.active}
                  onClick={handleBroadcastWA}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  {sendProgress.active && sendProgress.activeKey === 'broadcast' ? 'Memproses Broadcast...' : 'Broadcast Kirim WA'}
                </Button>
              )}
            </Stack>
          </Paper>
        )}

        {activeTab === 'ekspor' && (
          <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>Ekspor Matriks Presensi Bulanan</Typography>
            <Stack spacing={3} sx={{ maxWidth: 600 }}>
              <Stack direction="row" spacing={2}>
                <DatePicker label="Tanggal Mulai" format="dd/MM/yyyy" slotProps={{ textField: { fullWidth: true, required: true } }} value={parseISO(startDate)} onChange={(v: any) => v && setStartDate(format(v, 'yyyy-MM-dd'))} />
                <DatePicker label="Tanggal Selesai" format="dd/MM/yyyy" slotProps={{ textField: { fullWidth: true, required: true } }} value={parseISO(endDate)} onChange={(v: any) => v && setEndDate(format(v, 'yyyy-MM-dd'))} />
              </Stack>
              <Stack direction="row" spacing={2}>
                <FormControl fullWidth required>
                  <InputLabel>Pilih Kelas</InputLabel>
                  <Select value={filterClass} onChange={e => setFilterClass(e.target.value)} label="Pilih Kelas">
                    <MenuItem value="ALL">Semua Kelas</MenuItem>
                    {availableClasses.map(c => <MenuItem key={c as string} value={c as string}>{c as string}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth required>
                  <InputLabel>Pilih Angkatan</InputLabel>
                  <Select value={filterYear} onChange={e => setFilterYear(e.target.value)} label="Pilih Angkatan">
                    <MenuItem value="ALL">Semua Angkatan</MenuItem>
                    {availableYears.map(y => <MenuItem key={y as string} value={y as string}>{y as string}</MenuItem>)}
                  </Select>
                </FormControl>
              </Stack>
              <FormControl fullWidth sx={{ mb: 2 }}>
                 <InputLabel>Orientasi</InputLabel>
                 <Select value={orientation} onChange={e => setOrientation(e.target.value)} label="Orientasi">
                    <MenuItem value="portrait">Portrait</MenuItem>
                    <MenuItem value="landscape">Landscape</MenuItem>
                 </Select>
              </FormControl>
              <FormControl fullWidth>
                 <InputLabel>Ukuran Kertas (PDF)</InputLabel>
                 <Select value={paperSize} onChange={e => setPaperSize(e.target.value)} label="Ukuran Kertas (PDF)">
                    <MenuItem value="A4">A4</MenuItem>
                    <MenuItem value="F4">F4 (Folio)</MenuItem>
                 </Select>
              </FormControl>
              <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                  <Button variant="contained" color="primary" onClick={handlePreviewMatrix} sx={{ flex: 1, py: 1.5, minWidth: '150px' }}>TAMPILKAN (PREVIEW)</Button>
                  <Button variant="contained" color="success" startIcon={<DownloadIcon />} onClick={handleExportMatrixExcel} sx={{ flex: 1, py: 1.5, minWidth: '150px' }}>EKSPOR EXCEL</Button>
                  <Button variant="contained" color="error" startIcon={<PdfIcon />} onClick={handleExportMatrixPDF} sx={{ flex: 1, py: 1.5, minWidth: '150px' }}>CETAK / PDF</Button>
              </Box>
            </Stack>
          </Paper>
        )}

        {activeTab === 'rekap' && (
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2, overflow: 'hidden' }}>
              <TableContainer>
                  <Table sx={{ minWidth: 650 }}>
                      <TableHead sx={{ bgcolor: 'grey.50' }}>
                        <TableRow>
                            <TableCell><Typography variant="caption" sx={{ fontWeight: 'bold' }} color="text.secondary">NAMA SISWA</Typography></TableCell>
                            <TableCell><Typography variant="caption" sx={{ fontWeight: 'bold' }} color="text.secondary">KELAS</Typography></TableCell>
                            <TableCell><Typography variant="caption" sx={{ fontWeight: 'bold' }} color="text.secondary">WAKTU TERAKHIR SCAN</Typography></TableCell>
                            <TableCell><Typography variant="caption" sx={{ fontWeight: 'bold' }} color="text.secondary">TIPE</Typography></TableCell>
                            <TableCell><Typography variant="caption" sx={{ fontWeight: 'bold' }} color="text.secondary">STATUS</Typography></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                          {attendance.map((r: any) => (
                            <TableRow key={r.id} hover>
                              <TableCell><Typography variant="body2">{r.student?.name}</Typography></TableCell>
                              <TableCell><Typography variant="body2">{r.student?.class}</Typography></TableCell>
                              <TableCell><Typography variant="body2">{formatWIBDateTimeIndo(r.timestamp, true)}</Typography></TableCell>
                              <TableCell><Typography variant="body2">{r.type === 'ARRIVAL' ? 'Datang' : 'Pulang'}</Typography></TableCell>
                              <TableCell><Chip label={r.status} size="small" color={r.status === 'LATE' ? 'warning' : 'success'} variant="outlined"/></TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </TableContainer>
            </Paper>
        )}

        {activeTab === 'perkelas' && (
          <Stack spacing={3}>
            {/* FITUR PROGRESS BAR PENGIRIMAN REKAP PRESENSI */}
            {sendProgress.active && (
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  border: '1.5px solid',
                  borderColor: 'success.main',
                  bgcolor: '#f0fdf4',
                  borderRadius: 2.5,
                  boxShadow: '0 8px 24px rgba(16, 185, 129, 0.12)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                      <Box sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        bgcolor: 'success.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        boxShadow: '0 2px 8px rgba(16,185,129,0.3)'
                      }}>
                        <WhatsAppIcon fontSize="small" />
                      </Box>
                      <Box>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'success.dark' }}>
                            {sendProgress.modeTitle}
                          </Typography>
                          <Chip
                            size="small"
                            label="Sedang Diproses"
                            color="success"
                            variant="filled"
                            sx={{ fontWeight: 700, height: 22, fontSize: '0.75rem' }}
                          />
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2 }}>
                          Target: <strong>{sendProgress.targetDescription}</strong>
                        </Typography>
                      </Box>
                    </Stack>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: 'success.dark', fontVariantNumeric: 'tabular-nums' }}>
                      {sendProgress.progress}%
                    </Typography>
                  </Box>

                  <LinearProgress
                    variant="determinate"
                    value={sendProgress.progress}
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      bgcolor: '#dcfce7',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 5,
                        bgcolor: 'success.main',
                        transition: 'transform 0.4s ease'
                      }
                    }}
                  />

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <CircularProgress size={14} color="success" thickness={6} />
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.dark' }}>
                        {sendProgress.stepText}
                      </Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      Harap tunggu hingga proses pengiriman terverifikasi...
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            )}

            {/* WhatsApp Group & Filter Panel */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                border: '1px solid',
                borderColor: 'primary.light',
                bgcolor: '#f8fafc',
                borderRadius: 2
              }}
            >
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between' }}>
                <Box>
                  <Stack direction="row" spacing={1.5} sx={{ mb: 0.5, alignItems: 'center' }}>
                    <GroupsIcon color="primary" />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Integrasi WhatsApp Group & Filter Laporan
                    </Typography>
                  </Stack>
                  <Typography
                    variant="body2"
                    component="div"
                    color="text.secondary"
                    sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}
                  >
                    <span>Status WhatsApp Group:</span>
                    {(settings.waGroupId || settings.wa_group_id) ? (
                      <Chip
                        size="small"
                        color="success"
                        variant="outlined"
                        label={`Terhubung: ${settings.waGroupName || settings.wa_group_name || settings.waGroupId || settings.wa_group_id}`}
                        sx={{ fontWeight: 600 }}
                      />
                    ) : (
                      <Chip
                        size="small"
                        color="warning"
                        variant="outlined"
                        label="Belum Dikonfigurasi (Atur di Pengaturan)"
                        sx={{ fontWeight: 600 }}
                      />
                    )}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    disabled={sendProgress.active || !(settings.waGroupId || settings.wa_group_id)}
                    startIcon={sendProgress.active && sendProgress.activeKey === 'group_all' ? <CircularProgress size={18} color="inherit" /> : <GroupsIcon />}
                    onClick={() => handleSendToGroup()}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    {sendProgress.active && sendProgress.activeKey === 'group_all' ? 'Mengirim ke Grup...' : 'Kirim Rekap Hari Ini ke Grup WA'}
                  </Button>
                </Stack>
              </Stack>

              {/* Filter Pilihan Data yang Dikirim */}
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed', borderColor: 'grey.300' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <FilterListIcon fontSize="small" color="action" />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Filter Data Dikirim:
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                    <Chip
                      label="Semua Siswa (Rekap Lengkap)"
                      color={waSendFilter === 'ALL' ? 'primary' : 'default'}
                      variant={waSendFilter === 'ALL' ? 'filled' : 'outlined'}
                      onClick={() => setWaSendFilter('ALL')}
                      clickable
                      sx={{ fontWeight: waSendFilter === 'ALL' ? 700 : 500 }}
                    />
                    <Chip
                      label="Hanya Siswa Hadir"
                      color={waSendFilter === 'HADIR_ONLY' ? 'success' : 'default'}
                      variant={waSendFilter === 'HADIR_ONLY' ? 'filled' : 'outlined'}
                      onClick={() => setWaSendFilter('HADIR_ONLY')}
                      clickable
                      icon={<CheckCircleIcon />}
                      sx={{ fontWeight: waSendFilter === 'HADIR_ONLY' ? 700 : 500 }}
                    />
                    <Chip
                      label="Hanya Siswa Tidak Hadir (Izin / Sakit / Alpa)"
                      color={waSendFilter === 'TIDAK_HADIR_ONLY' ? 'error' : 'default'}
                      variant={waSendFilter === 'TIDAK_HADIR_ONLY' ? 'filled' : 'outlined'}
                      onClick={() => setWaSendFilter('TIDAK_HADIR_ONLY')}
                      clickable
                      icon={<CancelIcon />}
                      sx={{ fontWeight: waSendFilter === 'TIDAK_HADIR_ONLY' ? 700 : 500 }}
                    />
                  </Stack>
                </Stack>
              </Box>
            </Paper>

            {settings.waMode !== 'auto' && (
              <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'info.main', bgcolor: 'info.50', borderRadius: 2 }}>
                  <TextField fullWidth multiline rows={2} variant="outlined" label="Catatan Tambahan Pesan WhatsApp (Opsional)" value={waNote} onChange={e => setWaNote(e.target.value)} sx={{ bgcolor: 'white' }} />
              </Paper>
            )}

            {Object.keys(classGroups).map(groupKey => {
                const records = classGroups[groupKey];
                const [year, className] = groupKey.split('_');
                const isClassPkl = rombelStatusMap[className] === 'PKL';
                const teacher = findTeacherForClass(className, year);

                // Hitung statistik per kelas
                const countHadir = records.filter((r: any) => r.arrival).length;
                const countAlpa = records.filter((r: any) => r.statusText === 'Alpa').length;
                const countIzin = records.filter((r: any) => r.statusText !== 'Alpa' && r.statusText !== 'PKL' && !r.arrival).length;
                const countPkl = records.filter((r: any) => r.statusText === 'PKL').length;

                // Filter siswa yang ditampilkan jika dipilih
                const displayedRecords = records.filter((r: any) => {
                  if (waSendFilter === 'HADIR_ONLY') return !!r.arrival;
                  if (waSendFilter === 'TIDAK_HADIR_ONLY') return !r.arrival;
                  return true;
                });

                return (
                  <Paper key={groupKey} elevation={0} sx={{ border: '1px solid', borderColor: isClassPkl ? 'secondary.light' : 'grey.200', borderRadius: 2, overflow: 'hidden' }}>
                    <Box sx={{
                      bgcolor: isClassPkl ? '#fdf2f8' : 'grey.50',
                      p: 2,
                      borderBottom: '1px solid',
                      borderColor: 'grey.200',
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 1.5
                    }}>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            Kelas: {className} - Angkatan {year}
                          </Typography>
                          {teacher ? (
                            <Chip
                              icon={<PersonIcon fontSize="small" />}
                              label={`Wali: ${teacher.name}${teacher.whatsapp ? ` (${teacher.whatsapp})` : ' (No WA kosong)'}`}
                              size="small"
                              color="primary"
                              variant="filled"
                              sx={{ fontWeight: 600 }}
                            />
                          ) : (
                            <Chip
                              icon={<PersonOffIcon fontSize="small" />}
                              label="Belum ada Wali Kelas"
                              size="small"
                              color="warning"
                              variant="outlined"
                              sx={{ fontWeight: 600 }}
                            />
                          )}
                          {isClassPkl && (
                            <Chip label="Status: PKL" size="small" color="secondary" sx={{ fontWeight: 700 }} />
                          )}
                          <Chip label={`Hadir: ${countHadir}/${records.length}`} size="small" color="success" variant="outlined" />
                          <Chip label={`Izin: ${countIzin}`} size="small" color="info" variant="outlined" />
                          <Chip label={`Alpa: ${countAlpa}`} size="small" color={countAlpa > 0 ? 'error' : 'default'} variant="outlined" />
                          {countPkl > 0 && <Chip label={`PKL: ${countPkl}`} size="small" color="secondary" variant="outlined" />}
                        </Stack>

                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            startIcon={sendProgress.active && sendProgress.activeKey === groupKey && sendProgress.mode === 'group_class' ? <CircularProgress size={16} color="inherit" /> : <GroupsIcon />}
                            disabled={sendProgress.active || !(settings.waGroupId || settings.wa_group_id)}
                            onClick={() => handleSendToGroup(groupKey)}
                            sx={{ textTransform: 'none', fontWeight: 600 }}
                          >
                            {sendProgress.active && sendProgress.activeKey === groupKey && sendProgress.mode === 'group_class' ? 'Mengirim...' : 'Kirim ke Grup WA'}
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={sendProgress.active && sendProgress.activeKey === groupKey && sendProgress.mode === 'wali' ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                            disabled={sendProgress.active}
                            onClick={() => sendToWA(groupKey)}
                            sx={{ textTransform: 'none', fontWeight: 600 }}
                          >
                            {sendProgress.active && sendProgress.activeKey === groupKey && sendProgress.mode === 'wali' ? 'Mengirim...' : 'Kirim WA Wali Kelas'}
                          </Button>
                        </Stack>
                    </Box>
                    <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                                <TableCell>NAMA</TableCell>
                                <TableCell>DATANG</TableCell>
                                <TableCell>PULANG</TableCell>
                                <TableCell>STATUS</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {displayedRecords.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} align="center" sx={{ py: 2, color: 'text.secondary' }}>
                                  Tidak ada siswa pada filter "{waSendFilter === 'HADIR_ONLY' ? 'Hanya Siswa Hadir' : 'Hanya Siswa Tidak Hadir'}"
                                </TableCell>
                              </TableRow>
                            ) : (
                              displayedRecords.map((r: any) => (
                                <TableRow key={r.student.id}>
                                  <TableCell sx={{ fontWeight: 500 }}>{r.student.name}</TableCell>
                                  <TableCell>{r.arrival ? new Date(r.arrival.timestamp).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '-'}</TableCell>
                                  <TableCell>{r.departure ? new Date(r.departure.timestamp).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '-'}</TableCell>
                                  <TableCell>
                                    <Chip
                                      label={r.statusText}
                                      size="small"
                                      color={r.statusColor as any}
                                      variant={r.statusText === 'PKL' ? 'filled' : 'outlined'}
                                      sx={{ fontWeight: 600 }}
                                    />
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                    </TableContainer>
                  </Paper>
                )
            })}
          </Stack>
        )}

        {activeTab === 'rekap-kbm-siswa' && (
          <MonitoringKbmSiswa />
        )}
      </Box>
    </Box>
      {/* AREA PRINT & PREVIEW (Tampil rapi mulai dari halaman pertama) */}
      <style>
        {`
          @media print {
            @page { 
              size: ${paperSize === 'F4' ? '215.9mm 330.2mm' : 'A4'} ${orientation || 'landscape'}; 
              margin: 5mm 6mm; 
            }
            #printable-area {
              display: block !important;
              position: static !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              box-sizing: border-box !important;
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
              max-width: 100% !important;
              table-layout: fixed !important;
              font-size: ${isCrossMonth ? '8.5pt' : '6.5pt'} !important; 
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
              padding: ${isCrossMonth ? '4px 6px' : '2px 1px'} !important; 
              overflow: hidden !important;
              word-break: normal !important; 
            }
            .print-avoid-break {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        `}
      </style>
      {typeof document !== 'undefined' && document.getElementById('print-root') ? (
        createPortal(
          <Box id="printable-area" sx={{ width: '100%', bgcolor: '#ffffff', color: '#000000', p: 0, m: 0 }}>
             {previewData.map((group: any, idx) => {
               const intervalDays = eachDayOfInterval({ start: new Date(startDate), end: new Date(endDate) });
               let totalColH = 0;
               let totalColS = 0;
               let totalColI = 0;
               let totalColA = 0;
               group.matrix.forEach((r: any) => {
                 totalColH += Number(r.totals?.H || 0);
                 totalColS += Number(r.totals?.S || 0);
                 totalColI += Number(r.totals?.I || 0);
                 totalColA += Number(r.totals?.A || 0);
               });

               return (
                 <Box key={idx} className="print-class-block" sx={{ mb: 4, pt: 1 }}>
                   {/* Kop Laporan Formal */}
                   <Box sx={{ textAlign: 'center', mb: 2, borderBottom: '2px solid #000', pb: 1.5 }}>
                     <Typography variant="h6" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '13pt', color: '#000' }}>
                       {settings?.nama_website || settings?.namaWebsite || settings?.judul_aplikasi || 'SMK NEGERI / SWASTA'}
                     </Typography>
                     <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '11pt', color: '#000' }}>
                       {isCrossMonth ? 'LAPORAN REKAPITULASI PRESENSI SISWA (REKAP LINTAS BULAN)' : 'LAPORAN REKAPITULASI PRESENSI SISWA (MATRIKS BULANAN)'}
                     </Typography>
                     <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, px: 1, fontSize: '9pt', fontWeight: 600, color: '#222' }}>
                       <span>KELAS: <b>{group.className}</b> (Angkatan: {group.year})</span>
                       <span>PERIODE: <b>{format(new Date(startDate), 'dd/MM/yyyy')} - {format(new Date(endDate), 'dd/MM/yyyy')}{isCrossMonth ? ' (LINTAS BULAN)' : ''}</b></span>
                       <span>TOTAL SISWA: <b>{group.matrix.length} Siswa</b></span>
                     </Box>
                   </Box>

                   {/* Tabel Matriks Rekapitulasi */}
                   <Box sx={{ overflowX: 'auto', width: '100%', mb: 2 }}>
                     <table className="print-matrix-table" style={{ width: '100%', borderCollapse: 'collapse', color: '#000' }}>
                        <thead>
                           <tr style={{ backgroundColor: '#e2e8f0', color: '#000' }}>
                             <th style={{ width: isCrossMonth ? '32px' : '24px', textAlign: 'center' }}>NO</th>
                             {isCrossMonth && (
                               <th style={{ width: '85px', textAlign: 'center' }}>NISN</th>
                             )}
                             <th style={{ textAlign: 'left', minWidth: isCrossMonth ? '160px' : '130px', width: isCrossMonth ? 'auto' : '22%', paddingLeft: '4px' }}>NAMA LENGKAP SISWA</th>
                             {!isCrossMonth && intervalDays.map(d => (
                               <th key={d.toString()} style={{ textAlign: 'center', minWidth: '13px', maxWidth: '17px', fontSize: intervalDays.length > 25 ? '6pt' : '7pt', backgroundColor: isWeekend(d) ? '#cbd5e1' : '#e2e8f0' }}>
                                 {format(d, 'dd')}
                               </th>
                             ))}
                             <th style={{ width: isCrossMonth ? '50px' : '18px', textAlign: 'center', backgroundColor: '#dcfce7' }}>H</th>
                             <th style={{ width: isCrossMonth ? '50px' : '18px', textAlign: 'center', backgroundColor: '#fef9c3' }}>S</th>
                             <th style={{ width: isCrossMonth ? '50px' : '18px', textAlign: 'center', backgroundColor: '#e0f2fe' }}>I</th>
                             <th style={{ width: isCrossMonth ? '50px' : '18px', textAlign: 'center', backgroundColor: '#fee2e2' }}>A</th>
                             {isCrossMonth && (
                               <th style={{ width: '65px', textAlign: 'center', backgroundColor: '#f1f5f9' }}>TOTAL %</th>
                             )}
                           </tr>
                        </thead>
                        <tbody>
                           {group.matrix.map((row: any, i: number) => {
                             const h = Number(row.totals?.H || 0);
                             const s = Number(row.totals?.S || 0);
                             const iCount = Number(row.totals?.I || 0);
                             const a = Number(row.totals?.A || 0);
                             const sum = h + s + iCount + a;
                             const pct = sum > 0 ? `${Math.round((h / sum) * 100)}%` : '100%';

                             return (
                               <tr key={i} style={{ backgroundColor: i % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                                 <td style={{ textAlign: 'center' }}>{i + 1}</td>
                                 {isCrossMonth && (
                                   <td style={{ textAlign: 'center' }}>{row.nisn || '-'}</td>
                                 )}
                                 <td style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingLeft: '4px' }}>{row.name}</td>
                                 {!isCrossMonth && intervalDays.map(d => {
                                    const dateKey = format(d, 'yyyy-MM-dd');
                                    const val = row.attendance?.[dateKey] || '-';
                                    const weekend = isWeekend(d);
                                    const bg = weekend ? '#e2e8f0' : val === 'H' ? 'transparent' : val === 'S' ? '#fef08a' : val === 'I' ? '#bae6fd' : val === 'A' ? '#fecaca' : 'transparent';
                                    return (
                                      <td key={d.toString()} style={{ textAlign: 'center', backgroundColor: bg, fontWeight: val === 'H' ? 'normal' : 'bold' }}>
                                        {val}
                                      </td>
                                    );
                                 })}
                                 <td style={{ textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f0fdf4' }}>{h}</td>
                                 <td style={{ textAlign: 'center', fontWeight: 'bold', backgroundColor: '#fefce8' }}>{s}</td>
                                 <td style={{ textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f0f9ff' }}>{iCount}</td>
                                 <td style={{ textAlign: 'center', fontWeight: 'bold', backgroundColor: '#fef2f2' }}>{a}</td>
                                 {isCrossMonth && (
                                   <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{pct}</td>
                                 )}
                               </tr>
                             );
                           })}
                        </tbody>
                        <tfoot>
                           <tr style={{ backgroundColor: '#e2e8f0', fontWeight: 'bold' }}>
                             <td colSpan={isCrossMonth ? 3 : (2 + intervalDays.length)} style={{ textAlign: 'right', paddingRight: '8px' }}>
                               TOTAL KESELURUHAN KELAS:
                             </td>
                             <td style={{ textAlign: 'center', backgroundColor: '#dcfce7' }}>{totalColH}</td>
                             <td style={{ textAlign: 'center', backgroundColor: '#fef9c3' }}>{totalColS}</td>
                             <td style={{ textAlign: 'center', backgroundColor: '#e0f2fe' }}>{totalColI}</td>
                             <td style={{ textAlign: 'center', backgroundColor: '#fee2e2' }}>{totalColA}</td>
                             {isCrossMonth && (
                               <td style={{ textAlign: 'center' }}>-</td>
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
                         <Typography variant="caption" sx={{ fontSize: '7.5pt', display: 'block' }}>NIP. {settings?.headmaster_nip || settings?.headmasterNip || '..........................................'}</Typography>
                       </Box>

                       {(() => {
                         const teacher = findTeacherForClass(group.className);
                         return (
                           <Box sx={{ textAlign: 'center', minWidth: '170px' }}>
                             <Typography variant="body2" sx={{ fontSize: '8.5pt' }}>
                               {format(new Date(), 'dd MMMM yyyy', { locale: id })}
                             </Typography>
                             <Typography variant="body2" sx={{ fontSize: '8.5pt', fontWeight: 700 }}>Wali Kelas {group.className}</Typography>
                             <Box sx={{ height: '48px' }} />
                             <Typography variant="body2" sx={{ fontSize: '8.5pt', fontWeight: 700, textDecoration: 'underline' }}>
                               ( {teacher?.name || '..................................................'} )
                             </Typography>
                             <Typography variant="caption" sx={{ fontSize: '7.5pt', display: 'block' }}>NIP. {teacher?.nip || '..........................................'}</Typography>
                           </Box>
                         );
                       })()}
                     </Box>
                   </Box>
                 </Box>
               );
             })}
          </Box>,
          document.getElementById('print-root')!
        )
      ) : null}

      {/* NOTIFIKASI MODERN STATUS HASIL PENGIRIMAN REKAP PRESENSI */}
      <Dialog
        open={sendStatusNotification.open}
        onClose={() => setSendStatusNotification(prev => ({ ...prev, open: false }))}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }
          }
        }}
      >
        <Box sx={{
          p: 2.5,
          bgcolor: sendStatusNotification.isWarning 
            ? '#fffbeb' 
            : sendStatusNotification.isSuccess 
              ? '#f0fdf4' 
              : '#fef2f2',
          borderBottom: '1px solid',
          borderColor: sendStatusNotification.isWarning 
            ? '#fde68a' 
            : sendStatusNotification.isSuccess 
              ? '#bbf7d0' 
              : '#fecaca',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box sx={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              bgcolor: sendStatusNotification.isWarning 
                ? '#fef3c7' 
                : sendStatusNotification.isSuccess 
                  ? '#dcfce7' 
                  : '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {sendStatusNotification.isWarning ? (
                <WarningAmberIcon sx={{ color: 'warning.main', fontSize: 26 }} />
              ) : sendStatusNotification.isSuccess ? (
                <CheckCircleIcon sx={{ color: 'success.main', fontSize: 26 }} />
              ) : (
                <ErrorIcon sx={{ color: 'error.main', fontSize: 26 }} />
              )}
            </Box>
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.2 }}>
                <Chip
                  size="small"
                  label={sendStatusNotification.modeTitle}
                  color={sendStatusNotification.isWarning ? 'warning' : sendStatusNotification.isSuccess ? 'success' : 'error'}
                  sx={{ fontWeight: 700, height: 22, fontSize: '0.75rem' }}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={sendStatusNotification.channel === 'gateway' ? 'WhatsApp Gateway' : sendStatusNotification.channel === 'web' ? 'WhatsApp Web' : 'Sistem'}
                  sx={{ height: 22, fontSize: '0.7rem' }}
                />
              </Stack>
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
                {sendStatusNotification.title}
              </Typography>
            </Box>
          </Stack>
          <IconButton
            size="small"
            onClick={() => setSendStatusNotification(prev => ({ ...prev, open: false }))}
            sx={{ color: 'text.secondary' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            {/* Waktu & Target Metadata */}
            <Box sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: '#f8fafc',
              border: '1px solid #e2e8f0'
            }}>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">Tanggal Presensi:</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {sendStatusNotification.date}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">Waktu Pengiriman:</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {sendStatusNotification.timestamp}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">Tujuan / Sasaran:</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', textAlign: 'right', maxWidth: '65%' }}>
                    {sendStatusNotification.targetInfo}
                  </Typography>
                </Box>
              </Stack>
            </Box>

            {/* Pesan Keterangan */}
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
              {sendStatusNotification.message}
            </Typography>

            {/* Statistik Ringkasan (Jika ada) */}
            {sendStatusNotification.stats && (
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 1.5,
                p: 1.5,
                borderRadius: 2,
                bgcolor: '#f1f5f9'
              }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Terkirim</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: 'success.main' }}>
                    {sendStatusNotification.stats.sent ?? 0}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Dilewati (PKL/Nonaktif)</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                    {sendStatusNotification.stats.skipped ?? 0}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Gagal</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: 'error.main' }}>
                    {sendStatusNotification.stats.failed ?? 0}
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Rincian item broadcast jika ada */}
            {sendStatusNotification.details && sendStatusNotification.details.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Rincian Transmisi per Rombel:
                </Typography>
                <Box sx={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 1.5 }}>
                  {sendStatusNotification.details.map((item, i) => (
                    <Box key={i} sx={{
                      p: 1.2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: i < (sendStatusNotification.details?.length || 0) - 1 ? '1px solid #f1f5f9' : 'none',
                      bgcolor: i % 2 === 0 ? '#fafafa' : '#ffffff'
                    }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        {item.target}
                      </Typography>
                      <Chip
                        size="small"
                        label={item.status === 'sent' ? 'Terkirim' : item.status === 'skipped' ? 'Dilewati' : 'Gagal'}
                        color={item.status === 'sent' ? 'success' : item.status === 'skipped' ? 'default' : 'error'}
                        sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                      />
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2, px: 3, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', justifyContent: 'space-between' }}>
          {sendStatusNotification.rawText ? (
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              startIcon={<ContentCopyIcon />}
              onClick={() => copyToClipboard(sendStatusNotification.rawText || '')}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Salin Teks Pesan
            </Button>
          ) : <Box />}

          <Stack direction="row" spacing={1}>
            {sendStatusNotification.actionUrl && (
              <Button
                size="small"
                variant="outlined"
                color="success"
                startIcon={<OpenInNewIcon />}
                onClick={() => window.open(sendStatusNotification.actionUrl, '_blank')}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                {sendStatusNotification.actionLabel || 'Buka di WhatsApp'}
              </Button>
            )}
            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={() => setSendStatusNotification(prev => ({ ...prev, open: false }))}
              sx={{ textTransform: 'none', fontWeight: 700, px: 2.5 }}
            >
              Tutup
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
