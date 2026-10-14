import React from 'react';
import {
  School as SchoolIcon,
  People as PeopleIcon,
  AssignmentInd as AssignmentIndIcon,
  Badge as BadgeIcon,
  Key as KeyIcon,
  Class as ClassIcon,
  MenuBook as MenuBookIcon,
  CreditCard as CreditCardIcon,
  Palette as PaletteIcon,
  Print as PrintIcon,
  PhonelinkSetup as MonitorSmartphoneIcon,
  Schedule as ScheduleIcon,
  EventNote as EventNoteIcon,
  Send as SendIcon,
  FolderOpen as FolderOpenIcon,
  AccessTime as AccessTimeIcon,
  LocationOn as LocationOnIcon,
  EventBusy as EventBusyIcon,
  FactCheck as FactCheckIcon,
  Assessment as AssessmentIcon,
  Description as DescriptionIcon,
  Tune as TuneIcon,
  Storage as StorageIcon,
  Router as RouterIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  AutoStories as AutoStoriesIcon,
  LaptopChromebook as LaptopChromebookIcon,
  Build as BuildIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';

export interface AdminMenuItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ fontSize?: 'small' | 'inherit' | 'large' | 'medium'; sx?: any }>;
  badge?: string;
}

export interface AdminMenuGroup {
  id: string;
  title: string;
  icon: React.ComponentType<{ fontSize?: 'small' | 'inherit' | 'large' | 'medium'; sx?: any }>;
  items: AdminMenuItem[];
}

export const ADMIN_MENU_GROUPS: AdminMenuGroup[] = [
  {
    id: 'sekolah',
    title: 'DATA SEKOLAH',
    icon: SchoolIcon,
    items: [
      { name: 'Informasi Sekolah', path: '/admin/settings?tab=info', icon: SchoolIcon },
      { name: 'Data Siswa', path: '/admin/students', icon: PeopleIcon },
      { name: 'Data Guru', path: '/admin/teachers', icon: AssignmentIndIcon },
      { name: 'Tugas Tambahan', path: '/admin/tugas-tambahan', icon: BadgeIcon },
      { name: 'Akun User', path: '/admin/user-accounts', icon: KeyIcon },
      { name: 'Rombongan Belajar', path: '/admin/rombel', icon: ClassIcon },
      { name: 'Mata Pelajaran', path: '/admin/mata-pelajaran', icon: MenuBookIcon },
    ]
  },
  {
    id: 'presensi_siswa',
    title: 'PRESENSI SISWA',
    icon: CreditCardIcon,
    items: [
      { name: 'Desain Kartu', path: '/admin/card-design', icon: PaletteIcon },
      { name: 'Cetak Kartu', path: '/admin/print-cards', icon: PrintIcon },
      { name: 'Perangkat & Suara', path: '/admin/settings?tab=perangkat', icon: MonitorSmartphoneIcon },
      { name: 'Jadwal Presensi', path: '/admin/settings?tab=jadwal', icon: ScheduleIcon },
      { name: 'Guru Piket', path: '/admin/guru-piket', icon: EventNoteIcon },
      { name: 'Otomasi Presensi Siswa', path: '/admin/settings?tab=wa-siswa', icon: SendIcon },
    ]
  },
  {
    id: 'presensi_guru',
    title: 'PRESENSI GURU',
    icon: FactCheckIcon,
    items: [
      { name: 'Data KBM', path: '/admin/kbm-data', icon: AccessTimeIcon },
      { name: 'Aturan Kehadiran', path: '/admin/attendance-rules', icon: LocationOnIcon },
      { name: 'Bebas Kehadiran', path: '/admin/free-attendance', icon: EventBusyIcon },
      { name: 'Otomasi Presensi Guru', path: '/admin/settings?tab=wa-guru', icon: FactCheckIcon },
    ]
  },
  {
    id: 'pembelajaran_asesmen',
    title: 'PEMBELAJARAN & ASESMEN',
    icon: AutoStoriesIcon,
    items: [
      { name: 'Perangkat Ajar', path: '/admin/perangkat-ajar', icon: FolderOpenIcon },
      { name: 'Atur LMS', path: '/admin/atur-lms', icon: LaptopChromebookIcon },
    ]
  },
  {
    id: 'laporan',
    title: 'LAPORAN',
    icon: AssessmentIcon,
    items: [
      { name: 'Laporan Presensi Siswa', path: '/admin/reports', icon: DescriptionIcon },
      { name: 'Laporan Kehadiran Guru', path: '/admin/teacher-attendance-reports', icon: FactCheckIcon },
      { name: 'Laporan Jurnal KBM', path: '/admin/laporan-jurnal-kbm', icon: MenuBookIcon },
    ]
  },
  {
    id: 'pengaturan',
    title: 'PENGATURAN UMUM',
    icon: TuneIcon,
    items: [
      { name: 'Database', path: '/admin/database', icon: StorageIcon },
      { name: 'Atur Gateway', path: '/admin/settings?tab=gateway', icon: RouterIcon },
      { name: 'Atur Akun', path: '/admin/settings?tab=akun', icon: AdminPanelSettingsIcon },
      { name: 'Tema', path: '/admin/settings?tab=theme', icon: PaletteIcon },
      { name: 'Maintanance', path: '/admin/maintenance', icon: BuildIcon },
      { name: 'Pratinjau', path: '/admin/pratinjau', icon: VisibilityIcon },
    ]
  }
];
