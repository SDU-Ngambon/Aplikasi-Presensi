export interface KbmCategory {
  id: string;
  name: string;
  color: string;
  is_teaching: boolean;
  description?: string;
}

export interface KbmPeriod {
  id?: string;
  jp_number: number; // 0 jika kegiatan non-KBM (Upacara, Istirahat, Apel, dsb), 1, 2, 3... jika Jam Pelajaran KBM
  is_teaching?: boolean;
  name?: string;
  start_time: string;
  end_time: string;
  category_id: string;
  category_name: string;
  category_color?: string;
  notes?: string;
}

export interface KbmDaySchedule {
  day_index: number; // 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis, 5=Jumat, 6=Sabtu
  day_name: string;
  is_active: boolean;
  periods: KbmPeriod[];
}

export interface AttendanceRule {
  id?: string;
  school_latitude: number;
  school_longitude: number;
  school_location_name: string;
  max_distance_meters: number;
  min_student_verification: number;
  allow_manual_verification: boolean;
  updated_at?: string;
}

export interface FreeAttendanceDay {
  id: string;
  start_date: string;
  end_date: string;
  name: string;
  type: 'nasional' | 'sekolah' | 'kegiatan' | 'khusus';
  description?: string;
  rombel_scope: 'all' | string[];
  created_at?: string;
}

export type FreeAttendanceItem = FreeAttendanceDay;

export interface Teacher {
  id: string;
  name: string;
  nip?: string;
  whatsapp?: string;
  class?: string;
  year?: string;
  status?: string;
}

export interface TugasTambahanCategory {
  id: string;
  name?: string;
  nama?: string;
  code?: string;
  kode?: string;
  description?: string;
  keterangan?: string;
  created_at?: string;
}

export interface TugasTambahanGuru {
  id: string;
  teacher_id: string;
  teacher_name: string;
  nip?: string;
  teacher_nip?: string;
  category_id: string;
  category_name: string;
  keterangan?: string;
  nomor_sk?: string;
  sk_nomor?: string;
  status: 'AKTIF' | 'NONAKTIF';
  created_at?: string;
  updated_at?: string;
  whatsapp?: string;
  teacher_whatsapp?: string;
}

export interface StudentAccountRecord {
  id: string;
  student_id: string;
  name: string;
  student_name?: string;
  nisn: string;
  nis?: string;
  class?: string;
  class_name?: string;
  whatsapp?: string;
  username: string;
  password_plain: string;
  plain_password?: string;
  password_hash: string;
  status: 'AKTIF' | 'NONAKTIF';
  created_at?: string;
  updated_at?: string;
}

export interface VerifiedStudent {
  student_id: string;
  nisn: string;
  name: string;
  student_name?: string;
  class_name: string;
  scanned_at: string;
}

export type VerifiedStudentCard = VerifiedStudent;

export interface AbsentStudentKbm {
  student_id?: string;
  nisn: string;
  name: string;
  class_name?: string;
  reason?: string;
  recorded_at?: string;
}

export interface TeacherKbmAttendance {
  id: string;
  date: string; // YYYY-MM-DD
  teacher_id: string;
  teacher_name: string;
  nip?: string;
  teacher_nip?: string;
  rombel_id: string;
  subject: string;
  jp_list: number[];
  jp_start: number;
  jp_end: number;
  total_jp: number;
  topic?: string;
  location_status: 'VALID' | 'OUT_OF_RANGE' | 'MANUAL' | 'FAKE_GPS_DETECTED';
  location_valid?: boolean;
  is_mocked?: boolean;
  gps_accuracy?: number;
  location_coords?: {
    latitude: number;
    longitude: number;
  };
  location_distance: number;
  distance_meters?: number;
  verified_students: VerifiedStudent[];
  verification_count: number;
  absent_students?: AbsentStudentKbm[];
  status: 'HADIR' | 'TERLAMBAT' | 'IZIN';
  created_at: string;
  timestamp?: string;
  jadwal_kbm_id?: string;
}

export interface JadwalKbm {
  id: string;
  teacher_id: string;
  teacher_name?: string;
  mapel_name: string;
  rombel_id: string;
  hari: string; // 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu'
  jp_list: number[];
  created_at?: string;
  updated_at?: string;
}
