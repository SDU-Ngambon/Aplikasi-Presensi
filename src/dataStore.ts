import fs from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import { pool, safeDbQuery } from './db.ts';
import { TugasTambahanCategory, TugasTambahanGuru, StudentAccountRecord, JadwalKbm } from './types.ts';
import { 
  getWIBDateString, 
  getWIBTimeString, 
  getWIBISOString, 
  getWIBDayName, 
  getWIBDayNameEnglish,
  getWIBDayIndex 
} from './timezone.ts';

// Paths - robust writable directory resolution
let baseDataDir = process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'uploads') : path.join(process.cwd(), 'uploads');
try {
  if (!fs.existsSync(baseDataDir)) {
    fs.mkdirSync(baseDataDir, { recursive: true });
  }
  const testFile = path.join(baseDataDir, '.test_write');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
} catch (e) {
  baseDataDir = path.join(os.tmpdir(), 'presensi_uploads');
  try {
    if (!fs.existsSync(baseDataDir)) {
      fs.mkdirSync(baseDataDir, { recursive: true });
    }
  } catch (err) {}
}

const DATA_DIR = baseDataDir;

const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');
const TEACHERS_FILE = path.join(DATA_DIR, 'teachers.json');
const ATTENDANCE_FILE = path.join(DATA_DIR, 'attendance.json');
const IZIN_FILE = path.join(DATA_DIR, 'izin_siswa.json');
const ROMBEL_STATUS_FILE = path.join(DATA_DIR, 'rombel_status.json');
const PIKET_FILE = path.join(DATA_DIR, 'akun_piket.json');
const TAHUN_AJARAN_FILE = path.join(DATA_DIR, 'tahun_ajaran.json');
const AKUN_GURU_FILE = path.join(DATA_DIR, 'akun_guru.json');
const JADWAL_PIKET_FILE = path.join(DATA_DIR, 'jadwal_piket.json');
const KBM_CATEGORIES_FILE = path.join(DATA_DIR, 'kbm_categories.json');
const KBM_SCHEDULES_FILE = path.join(DATA_DIR, 'kbm_schedules.json');
const ATURAN_KEHADIRAN_FILE = path.join(DATA_DIR, 'aturan_kehadiran.json');
const BEBAS_KEHADIRAN_FILE = path.join(DATA_DIR, 'bebas_kehadiran.json');
const KEHADIRAN_KBM_FILE = path.join(DATA_DIR, 'kehadiran_kbm.json');
const TUGAS_CATEGORIES_FILE = path.join(DATA_DIR, 'tugas_tambahan_categories.json');
const MATA_PELAJARAN_FILE = path.join(DATA_DIR, 'mata_pelajaran.json');
const TUGAS_GURU_FILE = path.join(DATA_DIR, 'tugas_tambahan_guru.json');
const AKUN_SISWA_FILE = path.join(DATA_DIR, 'akun_siswa.json');
const JADWAL_KBM_FILE = path.join(DATA_DIR, 'jadwal_kbm.json');
const KIOSK_TERMINALS_FILE = path.join(DATA_DIR, 'kiosk_terminals.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

export async function getSettings(): Promise<any> {
  let dbSettings: any = {};
  try {
    const res = await pool.query('SELECT * FROM pengaturan WHERE id = 1');
    if (res.rows.length > 0) {
      const row = res.rows[0];
      const rowData = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {});
      const rowTmpl = typeof row.pengesahan_template === 'string' ? JSON.parse(row.pengesahan_template) : (row.pengesahan_template || {});
      
      dbSettings = {
        ...rowData,
        headmaster_name: row.headmaster_name || row.kepala_sekolah_nama || row.kepala_sekolah || rowData.headmaster_name || rowData.headmasterName || 'Kepala Sekolah',
        headmaster_nip: row.headmaster_nip || row.kepala_sekolah_nip || row.nip_kepala_sekolah || rowData.headmaster_nip || rowData.headmasterNip || '',
        headmaster_whatsapp: row.headmaster_whatsapp || row.kepala_sekolah_whatsapp || rowData.headmaster_whatsapp || rowData.headmasterWhatsapp || '',
        headmaster_username: rowData.headmaster_username || 'kepsek',
        headmaster_password: rowData.headmaster_password || 'Kepsek@123',
        headmaster_status: rowData.headmaster_status || 'AKTIF',
        semester: row.semester || rowData.semester || 'Ganjil',
        tahun_ajaran: row.tahun_ajaran || rowData.tahun_ajaran || '2024/2025',
        tahunAjaran: row.tahun_ajaran || rowData.tahun_ajaran || rowData.tahunAjaran || '2024/2025',
        pengesahan_template: (rowTmpl && Object.keys(rowTmpl).length > 0) ? rowTmpl : (rowData.pengesahan_template || {})
      };
    }
  } catch (e) {}

  const localFallback = readJsonFile<any>(SETTINGS_FILE, {});
  return {
    semester: 'Ganjil',
    tahun_ajaran: '2024/2025',
    tahunAjaran: '2024/2025',
    ...localFallback,
    ...dbSettings,
    pengesahan_template: {
      ...(localFallback.pengesahan_template || {}),
      ...(dbSettings.pengesahan_template || {})
    }
  };
}

export async function updateSettings(data: any): Promise<any> {
  const current = await getSettings();
  const merged = { ...current, ...data };
  if (data.pengesahan_template) {
    merged.pengesahan_template = {
      ...(current.pengesahan_template || {}),
      ...data.pengesahan_template
    };
  }
  writeJsonFile(SETTINGS_FILE, merged);

  try {
    const res = await safeDbQuery('SELECT id, data FROM pengaturan WHERE id = 1');
    const taVal = data.tahun_ajaran || data.tahunAjaran || null;
    const semVal = data.semester || null;
    const tmplVal = data.pengesahan_template ? JSON.stringify(data.pengesahan_template) : null;

    if (res.success && res.rows.length > 0) {
      const existingData = (typeof res.rows[0].data === 'string' ? JSON.parse(res.rows[0].data) : res.rows[0].data) || {};
      const updatedData = { ...existingData, ...data };
      if (data.pengesahan_template) {
        updatedData.pengesahan_template = {
          ...(existingData.pengesahan_template || {}),
          ...data.pengesahan_template
        };
      }
      
      // Update data jsonb, semester, and tahun_ajaran
      await safeDbQuery(
        `UPDATE pengaturan SET 
           data = $1, 
           semester = COALESCE($2, semester), 
           tahun_ajaran = COALESCE($3, tahun_ajaran)
         WHERE id = 1`, 
        [JSON.stringify(updatedData), semVal, taVal]
      );

      // Also try updating explicit pengesahan_template column if it exists in schema
      if (tmplVal) {
        await safeDbQuery('UPDATE pengaturan SET pengesahan_template = $1::jsonb WHERE id = 1', [tmplVal]);
      }
    } else if (res.success) {
      await safeDbQuery(
        'INSERT INTO pengaturan (id, data, semester, tahun_ajaran) VALUES (1, $1, $2, $3)',
        [JSON.stringify(merged), merged.semester || 'Ganjil', merged.tahun_ajaran || '2024/2025']
      );
      if (tmplVal) {
        await safeDbQuery('UPDATE pengaturan SET pengesahan_template = $1::jsonb WHERE id = 1', [tmplVal]);
      }
    }
  } catch (e: any) {
    if (e?.code !== 'ECONNREFUSED' && !String(e?.message || '').includes('ECONNREFUSED')) {
      console.error('Error in updateSettings db sync:', e?.message || e);
    }
  }
  return merged;
}

/**
 * Mencari guru yang saat ini aktif ditugaskan sebagai Waka Kurikulum di Tugas Tambahan
 */
export async function getAssignedWakaKurikulum(): Promise<{ name: string; nip: string; teacher_id?: string } | null> {
  try {
    const assignments = await getAllTugasGuru();
    const categories = await getAllTugasCategories();
    const teachers = await getAllTeachers();

    const wakaAssign = assignments.find(a => {
      if (a.status !== 'AKTIF') return false;
      const cat = categories.find(c => c.id === a.category_id);
      const catCode = (cat?.code || cat?.kode || '').toUpperCase();
      const catName = (cat?.name || cat?.nama || a.category_name || '').toLowerCase();
      return catCode === 'WAKA_KURIKULUM' || catName.includes('kurikulum');
    });

    if (wakaAssign) {
      const teacher = teachers.find(t => t.id === wakaAssign.teacher_id);
      if (teacher) {
        return {
          teacher_id: teacher.id,
          name: teacher.name || wakaAssign.teacher_name,
          nip: teacher.nip || wakaAssign.nip || '-'
        };
      }
      return {
        teacher_id: wakaAssign.teacher_id,
        name: wakaAssign.teacher_name,
        nip: wakaAssign.nip || '-'
      };
    }

    // Fallback: cari di akun_guru dengan role WAKIL_KURIKULUM
    const accounts = await getAllTeacherAccounts();
    const wakaAcc = accounts.find(a => a.role === 'WAKIL_KURIKULUM' && a.status === 'AKTIF');
    if (wakaAcc) {
      return {
        teacher_id: wakaAcc.teacher_id || wakaAcc.id,
        name: wakaAcc.name,
        nip: wakaAcc.nip || '-'
      };
    }
  } catch (e) {}
  return null;
}

/**
 * Mengambil periode aktif (Tahun Ajaran & Semester) resmi dari database / pengaturan
 */
export async function getActivePeriod(): Promise<{ tahun_ajaran: string; semester: string }> {
  try {
    const settings = await getSettings();
    const allTa = await getAllTahunAjaran();
    const activeFromTa = allTa.find(t => t.is_active);

    const tahun_ajaran = (settings.tahun_ajaran || settings.tahunAjaran || activeFromTa?.nama || '2024/2025').trim();
    const semester = (settings.semester || activeFromTa?.semester || 'Ganjil').trim();
    return { tahun_ajaran, semester };
  } catch (e) {
    return { tahun_ajaran: '2024/2025', semester: 'Ganjil' };
  }
}

import { KbmCategory, KbmDaySchedule, AttendanceRule, FreeAttendanceDay, TeacherKbmAttendance, VerifiedStudent } from './types';
import { DEFAULT_NATIONAL_HOLIDAYS } from './data/holidays';

// Types
export interface TeacherAccountRecord {
  id: string;
  teacher_id: string;
  name: string;
  nip: string;
  username: string;
  password_plain: string;
  password_hash: string;
  status: string; // 'AKTIF' | 'NONAKTIF'
  role?: string; // 'GURU' | 'KEPALA_SEKOLAH' | 'WAKIL_KURIKULUM' | 'WAKIL_KESISWAAN' | 'GURU_BK'
  created_at: string;
  updated_at: string;
}

export interface PiketScheduleRecord {
  id: string;
  day_name: string; // 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Minggu'
  day_index: number; // 1 = Senin, 2 = Selasa, ..., 7 = Minggu
  teacher_id: string;
  teacher_name: string;
  nip?: string;
  keterangan: string; // 'Koordinator Piket', 'Guru Piket', etc.
  created_at?: string;
}

// Types
export interface StudentRecord {
  id: string;
  name: string;
  nisn: string;
  nis?: string;
  class: string;
  year: string;
  status: string; // 'AKTIF' | 'LULUS' | 'PKL' | 'MUTASI'
  qr_code?: string;
  custom_fields?: Record<string, any>;
  photo?: string;
  foto?: string;
}

export interface TeacherRecord {
  id: string;
  name: string;
  nip?: string;
  whatsapp: string;
  class: string;
  year: string;
  status: string; // 'AKTIF' | 'NONAKTIF'
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  timestamp: string;
  status: string; // 'PRESENT' | 'LATE'
  type: string;   // 'ARRIVAL' | 'DEPARTURE'
}

export interface IzinRecord {
  id: string;
  nisn: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  keterangan: string;
  keperluan_dispensasi?: string;
  created_at?: string;
}

export interface RombelStatusRecord {
  class_name: string;
  status: 'AKTIF' | 'PKL';
  updated_at: string;
}

// Initial Seed Data for Vocational High School (SMK)
const initialStudents: StudentRecord[] = [
  // Kelas 10 RPL 1
  { id: 's10-1', name: 'Aditya Pratama Putra', nisn: '0071234001', nis: '2401', class: '10 RPL 1', year: '2024/2025', status: 'AKTIF' },
  { id: 's10-2', name: 'Alifia Nurul Hidayah', nisn: '0071234002', nis: '2402', class: '10 RPL 1', year: '2024/2025', status: 'AKTIF' },
  { id: 's10-3', name: 'Bima Satria Yudha', nisn: '0071234003', nis: '2403', class: '10 RPL 1', year: '2024/2025', status: 'AKTIF' },
  { id: 's10-4', name: 'Citra Kirana Azzahra', nisn: '0071234004', nis: '2404', class: '10 RPL 1', year: '2024/2025', status: 'AKTIF' },
  { id: 's10-5', name: 'Davin Rafasya', nisn: '0071234005', nis: '2405', class: '10 RPL 1', year: '2024/2025', status: 'AKTIF' },

  // Kelas 10 TKJ 1
  { id: 's10-6', name: 'Eka Bagus Saputra', nisn: '0071234006', nis: '2406', class: '10 TKJ 1', year: '2024/2025', status: 'AKTIF' },
  { id: 's10-7', name: 'Farhan Maulana', nisn: '0071234007', nis: '2407', class: '10 TKJ 1', year: '2024/2025', status: 'AKTIF' },
  { id: 's10-8', name: 'Gita Permata Sari', nisn: '0071234008', nis: '2408', class: '10 TKJ 1', year: '2024/2025', status: 'AKTIF' },
  { id: 's10-9', name: 'Hafizh Nur Rohman', nisn: '0071234009', nis: '2409', class: '10 TKJ 1', year: '2024/2025', status: 'AKTIF' },

  // Kelas 11 RPL 1
  { id: 's11-1', name: 'Ilham Wahyu Ramadhan', nisn: '0061234001', nis: '2301', class: '11 RPL 1', year: '2023/2024', status: 'AKTIF' },
  { id: 's11-2', name: 'Jessica Aurelia Putri', nisn: '0061234002', nis: '2302', class: '11 RPL 1', year: '2023/2024', status: 'AKTIF' },
  { id: 's11-3', name: 'Kurniawan Dwi Saputra', nisn: '0061234003', nis: '2303', class: '11 RPL 1', year: '2023/2024', status: 'AKTIF' },
  { id: 's11-4', name: 'Laila Munawaroh', nisn: '0061234004', nis: '2304', class: '11 RPL 1', year: '2023/2024', status: 'AKTIF' },

  // Kelas 11 TKJ 1 (Status: PKL)
  { id: 's11-5', name: 'Muhammad Fadhil Akbar', nisn: '0061234005', nis: '2305', class: '11 TKJ 1', year: '2023/2024', status: 'AKTIF' },
  { id: 's11-6', name: 'Nabila Syakieb Maharani', nisn: '0061234006', nis: '2306', class: '11 TKJ 1', year: '2023/2024', status: 'AKTIF' },
  { id: 's11-7', name: 'Oky Kurniawan', nisn: '0061234007', nis: '2307', class: '11 TKJ 1', year: '2023/2024', status: 'AKTIF' },
  { id: 's11-8', name: 'Putri Ayu Wandira', nisn: '0061234008', nis: '2308', class: '11 TKJ 1', year: '2023/2024', status: 'AKTIF' },

  // Kelas 12 RPL 1
  { id: 's12-1', name: 'Rian Hidayatullah', nisn: '0051234001', nis: '2201', class: '12 RPL 1', year: '2022/2023', status: 'AKTIF' },
  { id: 's12-2', name: 'Salsabila Putri Utami', nisn: '0051234002', nis: '2202', class: '12 RPL 1', year: '2022/2023', status: 'AKTIF' },
  { id: 's12-3', name: 'Teguh Prasetyo', nisn: '0051234003', nis: '2203', class: '12 RPL 1', year: '2022/2023', status: 'AKTIF' },

  // Kelas 12 TKJ 1
  { id: 's12-4', name: 'Umar Farouq', nisn: '0051234004', nis: '2204', class: '12 TKJ 1', year: '2022/2023', status: 'AKTIF' },
  { id: 's12-5', name: 'Vina Panduwinata', nisn: '0051234005', nis: '2205', class: '12 TKJ 1', year: '2022/2023', status: 'AKTIF' },
  { id: 's12-6', name: 'Wahyu Tri Pamungkas', nisn: '0051234006', nis: '2206', class: '12 TKJ 1', year: '2022/2023', status: 'AKTIF' }
];

const initialTeachers: TeacherRecord[] = [
  { id: 't1', name: 'Budi Prasetyo, S.Kom', nip: '198501152010011001', whatsapp: '081234567891', class: '10 RPL 1', year: '2024/2025', status: 'AKTIF' },
  { id: 't2', name: 'Siti Aminah, S.Pd', nip: '198703202012022002', whatsapp: '081234567892', class: '10 TKJ 1', year: '2024/2025', status: 'AKTIF' },
  { id: 't3', name: 'Joko Susilo, M.Kom', nip: '198207112008011003', whatsapp: '081234567893', class: '11 RPL 1', year: '2023/2024', status: 'AKTIF' },
  { id: 't4', name: 'Hendra Wijaya, S.T', nip: '198912042015031004', whatsapp: '081234567894', class: '11 TKJ 1', year: '2023/2024', status: 'AKTIF' },
  { id: 't5', name: 'Maya Anggraini, S.Pd', nip: '199004182016022005', whatsapp: '081234567895', class: '12 RPL 1', year: '2022/2023', status: 'AKTIF' },
  { id: 't6', name: 'Agus Wahyudi, S.Kom', nip: '198409252009011006', whatsapp: '081234567896', class: '12 TKJ 1', year: '2022/2023', status: 'AKTIF' },
  { id: 't7', name: 'Lina Marlina, S.Pd', nip: '199205102018022007', whatsapp: '081234567897', class: '10 RPL 2', year: '2024/2025', status: 'NONAKTIF' }
];

const initialRombelStatus: Record<string, 'AKTIF' | 'PKL'> = {};

// Safe File Read/Write Helpers
function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.warn(`Error reading ${filePath}:`, e);
  }
  return fallback;
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error(`Error writing to ${filePath}:`, e);
  }
}

export async function getTableColumns(tableName: string): Promise<Set<string>> {
  try {
    const res = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
      [tableName]
    );
    if (res.rows && res.rows.length > 0) {
      return new Set(res.rows.map(r => String(r.column_name).toLowerCase()));
    }
  } catch (e) {}
  return new Set();
}

// Initialise storage with seeds if empty
export function initLocalStorage(): void {
  if (!fs.existsSync(STUDENTS_FILE)) {
    writeJsonFile(STUDENTS_FILE, initialStudents);
  }
  if (!fs.existsSync(TEACHERS_FILE)) {
    writeJsonFile(TEACHERS_FILE, initialTeachers);
  }
  if (!fs.existsSync(ROMBEL_STATUS_FILE)) {
    writeJsonFile(ROMBEL_STATUS_FILE, initialRombelStatus);
  }
  if (!fs.existsSync(ATTENDANCE_FILE)) {
    // Generate sample attendance for today
    const today = new Date().toISOString().split('T')[0];
    const sampleAttendance: AttendanceRecord[] = [
      { id: 'att-1', student_id: 's10-1', timestamp: `${today}T06:45:00+07:00`, status: 'PRESENT', type: 'ARRIVAL' },
      { id: 'att-2', student_id: 's10-2', timestamp: `${today}T07:05:00+07:00`, status: 'PRESENT', type: 'ARRIVAL' },
      { id: 'att-3', student_id: 's10-3', timestamp: `${today}T07:25:00+07:00`, status: 'LATE', type: 'ARRIVAL' },
      { id: 'att-4', student_id: 's11-1', timestamp: `${today}T06:50:00+07:00`, status: 'PRESENT', type: 'ARRIVAL' },
      { id: 'att-5', student_id: 's11-2', timestamp: `${today}T07:20:00+07:00`, status: 'LATE', type: 'ARRIVAL' },
      { id: 'att-6', student_id: 's12-1', timestamp: `${today}T06:40:00+07:00`, status: 'PRESENT', type: 'ARRIVAL' }
    ];
    writeJsonFile(ATTENDANCE_FILE, sampleAttendance);
  }
  if (!fs.existsSync(IZIN_FILE)) {
    const today = new Date().toISOString().split('T')[0];
    const sampleIzin: IzinRecord[] = [
      { id: 'iz-1', nisn: '0071234004', tanggal_mulai: today, tanggal_selesai: today, keterangan: 'Sakit (Demam)', created_at: new Date().toISOString() }
    ];
    writeJsonFile(IZIN_FILE, sampleIzin);
  }
}

// Initialise immediately
initLocalStorage();

// =================== STUDENTS ===================
export async function getAllStudents(): Promise<StudentRecord[]> {
  try {
    const res = await pool.query('SELECT * FROM students ORDER BY name ASC');
    if (res.rows && res.rows.length > 0) {
      const dbStudents = res.rows.map(r => {
        let status = r.status;
        if (!status) {
          if (r.class && (r.class.startsWith('Alumni') || r.class.toLowerCase().includes('lulus'))) {
            status = 'LULUS';
          } else {
            status = 'AKTIF';
          }
        }
        return {
          id: r.id,
          name: r.name,
          nisn: r.nisn,
          nis: r.nis || '',
          class: r.class,
          year: r.year,
          status: status,
          qr_code: r.qr_code || r.nisn,
          custom_fields: r.custom_fields || {},
          photo: r.photo || r.foto || ''
        };
      });
      writeJsonFile(STUDENTS_FILE, dbStudents);
      return dbStudents;
    }
  } catch (e) {
    // Postgres unreachable, fallback
  }
  return readJsonFile<StudentRecord[]>(STUDENTS_FILE, initialStudents);
}

export async function saveStudent(student: Partial<StudentRecord>): Promise<StudentRecord> {
  const newStudent: StudentRecord = {
    id: student.id || randomUUID(),
    name: student.name || '',
    nisn: student.nisn || '',
    nis: student.nis || '',
    class: student.class || '',
    year: student.year || '',
    status: student.status || (student.class && student.class.startsWith('Alumni') ? 'LULUS' : 'AKTIF'),
    qr_code: student.qr_code || student.nisn || randomUUID(),
    custom_fields: student.custom_fields || {},
    photo: student.photo || student.foto || ''
  };

  try {
    const cols = await getTableColumns('students');
    if (cols.has('status')) {
      await pool.query(
        `INSERT INTO students (id, name, nisn, nis, class, year, status, qr_code, custom_fields, photo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, nisn = EXCLUDED.nisn, nis = EXCLUDED.nis,
         class = EXCLUDED.class, year = EXCLUDED.year, status = EXCLUDED.status,
         qr_code = EXCLUDED.qr_code, custom_fields = EXCLUDED.custom_fields, photo = EXCLUDED.photo`,
        [newStudent.id, newStudent.name, newStudent.nisn, newStudent.nis, newStudent.class, newStudent.year, newStudent.status, newStudent.qr_code, JSON.stringify(newStudent.custom_fields || {}), newStudent.photo]
      );
    } else {
      await pool.query(
        `INSERT INTO students (id, name, nisn, nis, class, year, qr_code, custom_fields, photo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, nisn = EXCLUDED.nisn, nis = EXCLUDED.nis,
         class = EXCLUDED.class, year = EXCLUDED.year,
         qr_code = EXCLUDED.qr_code, custom_fields = EXCLUDED.custom_fields, photo = EXCLUDED.photo`,
        [newStudent.id, newStudent.name, newStudent.nisn, newStudent.nis, newStudent.class, newStudent.year, newStudent.qr_code, JSON.stringify(newStudent.custom_fields || {}), newStudent.photo]
      );
    }
  } catch (e) {}

  const current = readJsonFile<StudentRecord[]>(STUDENTS_FILE, initialStudents);
  const existingIdx = current.findIndex(s => s.id === newStudent.id || (newStudent.nisn && s.nisn === newStudent.nisn));
  if (existingIdx >= 0) {
    current[existingIdx] = { ...current[existingIdx], ...newStudent };
  } else {
    current.push(newStudent);
  }
  writeJsonFile(STUDENTS_FILE, current);
  return newStudent;
}

export async function updateStudent(id: string, data: Partial<StudentRecord>): Promise<boolean> {
  try {
    const cols = await getTableColumns('students');
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.name !== undefined && (cols.size === 0 || cols.has('name'))) {
      fields.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.nisn !== undefined && (cols.size === 0 || cols.has('nisn'))) {
      fields.push(`nisn = $${idx++}`);
      values.push(data.nisn);
    }
    if (data.nis !== undefined && (cols.size === 0 || cols.has('nis'))) {
      fields.push(`nis = $${idx++}`);
      values.push(data.nis);
    }
    if (data.class !== undefined && (cols.size === 0 || cols.has('class'))) {
      fields.push(`class = $${idx++}`);
      values.push(data.class);
    }
    if (data.year !== undefined && (cols.size === 0 || cols.has('year'))) {
      fields.push(`year = $${idx++}`);
      values.push(data.year);
    }
    if (data.status !== undefined && cols.has('status')) {
      fields.push(`status = $${idx++}`);
      values.push(data.status);
    }
    if (data.qr_code !== undefined && (cols.size === 0 || cols.has('qr_code'))) {
      fields.push(`qr_code = $${idx++}`);
      values.push(data.qr_code);
    }
    if (data.photo !== undefined && (cols.size === 0 || cols.has('photo'))) {
      fields.push(`photo = $${idx++}`);
      values.push(data.photo);
    }
    if (data.custom_fields !== undefined && (cols.size === 0 || cols.has('custom_fields'))) {
      fields.push(`custom_fields = $${idx++}`);
      values.push(JSON.stringify(data.custom_fields));
    }

    if (fields.length > 0) {
      values.push(id);
      let query = `UPDATE students SET ${fields.join(', ')} WHERE id = $${idx}`;
      if (data.nisn) {
        values.push(data.nisn);
        query = `UPDATE students SET ${fields.join(', ')} WHERE (id = $${idx} OR nisn = $${idx + 1})`;
      }
      await pool.query(query, values);
    }
  } catch (e: any) {
    if (e.code !== 'ECONNREFUSED') {
      console.error('updateStudent DB error:', e);
    }
  }

  const current = readJsonFile<StudentRecord[]>(STUDENTS_FILE, initialStudents);
  const idx = current.findIndex(s => s.id === id || (data.nisn && s.nisn === data.nisn));
  if (idx >= 0) {
    current[idx] = { ...current[idx], ...data };
    writeJsonFile(STUDENTS_FILE, current);
    return true;
  } else {
    current.push({
      id,
      name: data.name || '',
      nisn: data.nisn || '',
      nis: data.nis || '',
      class: data.class || '',
      year: data.year || '',
      status: data.status || (data.class && data.class.startsWith('Alumni') ? 'LULUS' : 'AKTIF'),
      qr_code: data.qr_code || '',
      custom_fields: data.custom_fields || {},
      photo: data.photo || ''
    });
    writeJsonFile(STUDENTS_FILE, current);
    return true;
  }
}

export async function bulkPromoteStudentsAndTeachers(
  studentUpdates: Array<{ id: string; nisn?: string; class: string; year?: string; status: string }>,
  teacherUpdates: Array<{ id: string; class: string; year?: string }>
): Promise<{ success: boolean; updatedStudents: number; updatedTeachers: number }> {
  console.log(`[bulkPromote] Starting promotion: ${studentUpdates.length} students, ${teacherUpdates.length} teachers`);

  // 1. Try to add status columns if permissions allow (best effort)
  try {
    await pool.query("ALTER TABLE students ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'AKTIF'");
  } catch (e) {}
  try {
    await pool.query("ALTER TABLE students ADD COLUMN IF NOT EXISTS photo TEXT");
  } catch (e) {}
  try {
    await pool.query("ALTER TABLE students ADD COLUMN IF NOT EXISTS foto TEXT");
  } catch (e) {}
  try {
    await pool.query("ALTER TABLE teachers ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'AKTIF'");
  } catch (e) {}
  try {
    await pool.query("ALTER TABLE teachers ADD COLUMN IF NOT EXISTS nip VARCHAR(255) DEFAULT ''");
  } catch (e) {}

  const studentCols = await getTableColumns('students');
  const hasStudentStatus = studentCols.has('status');

  // 2. Perform student updates in PostgreSQL
  let pgStudentSuccess = 0;
  for (const su of studentUpdates) {
    const studentId = su.id ? String(su.id).trim() : '';
    const studentNisn = su.nisn ? String(su.nisn).trim() : null;
    const targetClass = su.class ? String(su.class).trim() : '';
    const targetStatus = su.status ? String(su.status).trim() : 'AKTIF';
    const targetYear = su.year ? String(su.year).trim() : null;

    if (!studentId && !studentNisn) continue;

    try {
      if (hasStudentStatus) {
        if (studentNisn) {
          const res = await pool.query(
            'UPDATE students SET class = $1, status = $2, year = COALESCE($3, year) WHERE id = $4 OR nisn = $5',
            [targetClass, targetStatus, targetYear, studentId, studentNisn]
          );
          if (res.rowCount && res.rowCount > 0) pgStudentSuccess += res.rowCount;
        } else {
          const res = await pool.query(
            'UPDATE students SET class = $1, status = $2, year = COALESCE($3, year) WHERE id = $4',
            [targetClass, targetStatus, targetYear, studentId]
          );
          if (res.rowCount && res.rowCount > 0) pgStudentSuccess += res.rowCount;
        }
      } else {
        // Fallback for tables without 'status' column
        if (studentNisn) {
          const res = await pool.query(
            'UPDATE students SET class = $1, year = COALESCE($2, year) WHERE id = $3 OR nisn = $4',
            [targetClass, targetYear, studentId, studentNisn]
          );
          if (res.rowCount && res.rowCount > 0) pgStudentSuccess += res.rowCount;
        } else {
          const res = await pool.query(
            'UPDATE students SET class = $1, year = COALESCE($2, year) WHERE id = $3',
            [targetClass, targetYear, studentId]
          );
          if (res.rowCount && res.rowCount > 0) pgStudentSuccess += res.rowCount;
        }
      }
    } catch (e: any) {
      if (e.code !== 'ECONNREFUSED') {
        console.warn(`[bulkPromote] Primary update error for student id=${studentId}:`, e.message);
        try {
          if (studentId) {
            await pool.query('UPDATE students SET class = $1 WHERE id = $2', [targetClass, studentId]);
            pgStudentSuccess++;
          } else if (studentNisn) {
            await pool.query('UPDATE students SET class = $1 WHERE nisn = $2', [targetClass, studentNisn]);
            pgStudentSuccess++;
          }
        } catch (err2: any) {
          console.error(`[bulkPromote] Secondary fallback update error for student:`, err2.message);
        }
      }
    }
  }
  console.log(`[bulkPromote] Completed student DB updates. Affected rows: ${pgStudentSuccess}`);

  // 3. Perform teacher updates in PostgreSQL
  let pgTeacherSuccess = 0;
  for (const tu of teacherUpdates) {
    const teacherId = tu.id ? String(tu.id).trim() : '';
    const targetClass = tu.class ? String(tu.class).trim() : '';
    const targetYear = tu.year ? String(tu.year).trim() : null;

    if (!teacherId) continue;

    try {
      const res = await pool.query(
        'UPDATE teachers SET class = $1, year = COALESCE($2, year) WHERE id = $3',
        [targetClass, targetYear, teacherId]
      );
      if (res.rowCount && res.rowCount > 0) pgTeacherSuccess += res.rowCount;
    } catch (e: any) {
      if (e.code !== 'ECONNREFUSED') {
        console.error(`[bulkPromote] Error updating teacher ${teacherId}:`, e.message);
      }
    }
  }
  console.log(`[bulkPromote] Completed teacher DB updates. Affected rows: ${pgTeacherSuccess}`);

  // 4. Synchronously Update in JSON Storage
  const currentStudents = readJsonFile<StudentRecord[]>(STUDENTS_FILE, initialStudents);
  const studentMap = new Map<string, typeof studentUpdates[0]>();
  for (const su of studentUpdates) {
    if (su.id) studentMap.set(String(su.id), su);
    if (su.nisn) studentMap.set(String(su.nisn), su);
  }

  for (let i = 0; i < currentStudents.length; i++) {
    const s = currentStudents[i];
    const update = studentMap.get(String(s.id)) || (s.nisn ? studentMap.get(String(s.nisn)) : undefined);
    if (update) {
      currentStudents[i] = {
        ...s,
        class: update.class,
        status: update.status,
        year: update.year || s.year
      };
    }
  }
  writeJsonFile(STUDENTS_FILE, currentStudents);

  const currentTeachers = readJsonFile<TeacherRecord[]>(TEACHERS_FILE, initialTeachers);
  const teacherMap = new Map<string, typeof teacherUpdates[0]>();
  for (const tu of teacherUpdates) {
    if (tu.id) teacherMap.set(String(tu.id), tu);
  }

  for (let i = 0; i < currentTeachers.length; i++) {
    const t = currentTeachers[i];
    const update = teacherMap.get(String(t.id));
    if (update) {
      currentTeachers[i] = {
        ...t,
        class: update.class,
        year: update.year || t.year
      };
    }
  }
  writeJsonFile(TEACHERS_FILE, currentTeachers);

  return {
    success: true,
    updatedStudents: studentUpdates.length,
    updatedTeachers: teacherUpdates.length
  };
}

export async function deleteStudent(id: string): Promise<boolean> {
  try {
    await pool.query('DELETE FROM students WHERE id = $1', [id]);
  } catch (e) {}

  const current = readJsonFile<StudentRecord[]>(STUDENTS_FILE, initialStudents);
  const filtered = current.filter(s => s.id !== id);
  writeJsonFile(STUDENTS_FILE, filtered);
  return true;
}

// =================== TEACHERS ===================
export async function getAllTeachers(): Promise<TeacherRecord[]> {
  try {
    const res = await pool.query('SELECT * FROM teachers ORDER BY name ASC');
    if (res.rows.length > 0) {
      return res.rows.map(r => ({
        id: r.id,
        name: r.name,
        nip: r.nip || '',
        whatsapp: r.whatsapp,
        class: r.class || '',
        year: r.year || '',
        status: r.status || 'AKTIF'
      }));
    }
  } catch (e) {}
  return readJsonFile<TeacherRecord[]>(TEACHERS_FILE, initialTeachers);
}

export async function saveTeacher(teacher: Partial<TeacherRecord>): Promise<TeacherRecord> {
  const newTeacher: TeacherRecord = {
    id: teacher.id || randomUUID(),
    name: teacher.name || '',
    nip: teacher.nip || '',
    whatsapp: teacher.whatsapp || '',
    class: teacher.class || '',
    year: teacher.year || '',
    status: teacher.status || 'AKTIF'
  };

  try {
    const cols = await getTableColumns('teachers');
    const fields: string[] = ['id', 'name', 'whatsapp', 'class', 'year'];
    const placeholders: string[] = ['$1', '$2', '$3', '$4', '$5'];
    const updateSets: string[] = [
      'name = EXCLUDED.name',
      'whatsapp = EXCLUDED.whatsapp',
      'class = EXCLUDED.class',
      'year = EXCLUDED.year'
    ];
    const vals: any[] = [newTeacher.id, newTeacher.name, newTeacher.whatsapp, newTeacher.class, newTeacher.year];
    let pIdx = 6;

    if (cols.has('nip')) {
      fields.push('nip');
      placeholders.push(`$${pIdx++}`);
      updateSets.push('nip = EXCLUDED.nip');
      vals.push(newTeacher.nip);
    }
    if (cols.has('status')) {
      fields.push('status');
      placeholders.push(`$${pIdx++}`);
      updateSets.push('status = EXCLUDED.status');
      vals.push(newTeacher.status);
    }

    await pool.query(
      `INSERT INTO teachers (${fields.join(', ')})
       VALUES (${placeholders.join(', ')})
       ON CONFLICT (id) DO UPDATE SET ${updateSets.join(', ')}`,
      vals
    );
  } catch (e) {}

  const current = readJsonFile<TeacherRecord[]>(TEACHERS_FILE, initialTeachers);
  const idx = current.findIndex(t => t.id === newTeacher.id);
  if (idx >= 0) current[idx] = newTeacher;
  else current.push(newTeacher);
  writeJsonFile(TEACHERS_FILE, current);

  // Auto-sync account for this teacher
  try {
    const existingAccounts = await getAllTeacherAccounts();
    const existing = existingAccounts.find(a => a.teacher_id === newTeacher.id);
    if (!existing) {
      const usedUsernames = new Set<string>(existingAccounts.map(a => (a.username || '').toLowerCase()));
      const username = generateUsernameForTeacher(newTeacher.name, newTeacher.nip, usedUsernames);
      const plainPassword = generateRandomPassword();
      let hash = plainPassword;
      try {
        hash = await bcrypt.hash(plainPassword, 10);
      } catch (e) {}

      await saveTeacherAccount({
        teacher_id: newTeacher.id,
        name: newTeacher.name,
        nip: newTeacher.nip || '',
        username,
        password_plain: plainPassword,
        password_hash: hash,
        status: newTeacher.status || 'AKTIF'
      });
    } else {
      if (existing.name !== newTeacher.name || existing.nip !== (newTeacher.nip || '') || existing.status !== newTeacher.status) {
        await updateTeacherAccount(existing.id, {
          name: newTeacher.name,
          nip: newTeacher.nip || '',
          status: newTeacher.status || 'AKTIF'
        });
      }
    }
    await syncTeacherRole(newTeacher.id);
  } catch (syncErr) {}

  return newTeacher;
}

export async function assignTeacherToClass(className: string, teacherId: string | null, year?: string): Promise<TeacherRecord | null> {
  const teachers = await getAllTeachers();

  // If year not provided, try to find the year from students of this class
  let classYear = year;
  if (!classYear) {
    const students = await getAllStudents();
    const studentInClass = students.find(s => s.class === className);
    if (studentInClass && studentInClass.year) {
      classYear = studentInClass.year;
    }
  }

  // If assigning a new teacher to this class, clear any previous teacher that was assigned to this class
  for (const t of teachers) {
    if (t.class === className && t.id !== teacherId) {
      t.class = '';
      await saveTeacher(t);
    }
  }

  if (!teacherId) {
    return null;
  }

  const targetTeacher = teachers.find(t => t.id === teacherId);
  if (targetTeacher) {
    targetTeacher.class = className;
    if (classYear) {
      targetTeacher.year = classYear;
    }
    await saveTeacher(targetTeacher);
    return targetTeacher;
  }

  return null;
}

export async function deleteTeacher(id: string): Promise<boolean> {
  try {
    await pool.query('DELETE FROM teachers WHERE id = $1', [id]);
    await pool.query('DELETE FROM akun_guru WHERE teacher_id = $1', [id]);
    await pool.query('DELETE FROM jadwal_piket WHERE teacher_id = $1', [id]);
  } catch (e) {}

  const current = readJsonFile<TeacherRecord[]>(TEACHERS_FILE, initialTeachers);
  const filtered = current.filter(t => t.id !== id);
  writeJsonFile(TEACHERS_FILE, filtered);

  await deleteTeacherAccount(id);
  const allScheds = readJsonFile<PiketScheduleRecord[]>(JADWAL_PIKET_FILE, initialPiketSchedule);
  writeJsonFile(JADWAL_PIKET_FILE, allScheds.filter(s => s.teacher_id !== id));

  return true;
}

// =================== ROMBEL & STATUS ===================
export async function getAllRombelStatus(): Promise<Record<string, 'AKTIF' | 'PKL'>> {
  const fileData = readJsonFile<Record<string, 'AKTIF' | 'PKL'>>(ROMBEL_STATUS_FILE, {});
  try {
    const res = await pool.query('SELECT * FROM rombel_status');
    if (res.rows.length > 0) {
      const map: Record<string, 'AKTIF' | 'PKL'> = { ...fileData };
      for (const row of res.rows) {
        map[row.class_name] = (row.status === 'PKL' ? 'PKL' : 'AKTIF');
      }
      return map;
    }
  } catch (e) {}
  return { ...fileData };
}

export async function setClassStatus(className: string, status: 'AKTIF' | 'PKL'): Promise<void> {
  const cleanStatus: 'AKTIF' | 'PKL' = status === 'PKL' ? 'PKL' : 'AKTIF';
  try {
    await pool.query(
      `INSERT INTO rombel_status (class_name, status, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (class_name) DO UPDATE SET status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP`,
      [className, cleanStatus]
    );
  } catch (e) {}

  const current = readJsonFile<Record<string, 'AKTIF' | 'PKL'>>(ROMBEL_STATUS_FILE, initialRombelStatus);
  current[className] = cleanStatus;
  writeJsonFile(ROMBEL_STATUS_FILE, current);
}

// Grade parser
export function parseGradeLevel(className: string): number {
  if (!className) return 0;
  const upper = className.trim().toUpperCase();
  if (upper.startsWith('ALUMNI') || upper.includes('LULUS') || upper.includes('ALUMNI')) return 0;

  // 1. Check Roman numerals (XII, XI, X)
  if (/\bXII\b/.test(upper) || upper.startsWith('XII ') || upper.startsWith('XII-') || upper.startsWith('XII.') || upper.includes('KELAS XII') || upper.includes('KELAS 12')) {
    return 12;
  }
  if (/\bXI\b/.test(upper) || upper.startsWith('XI ') || upper.startsWith('XI-') || upper.startsWith('XI.') || upper.includes('KELAS XI') || upper.includes('KELAS 11')) {
    return 11;
  }
  if (/\bX\b/.test(upper) || upper.startsWith('X ') || upper.startsWith('X-') || upper.startsWith('X.') || upper.includes('KELAS X') || upper.includes('KELAS 10')) {
    return 10;
  }

  // 2. Check Number prefixes (12, 11, 10)
  if (/\b12\b/.test(upper) || upper.startsWith('12 ') || upper.startsWith('12-') || upper.startsWith('12.') || /^12[A-Z0-9]/i.test(upper)) {
    return 12;
  }
  if (/\b11\b/.test(upper) || upper.startsWith('11 ') || upper.startsWith('11-') || upper.startsWith('11.') || /^11[A-Z0-9]/i.test(upper)) {
    return 11;
  }
  if (/\b10\b/.test(upper) || upper.startsWith('10 ') || upper.startsWith('10-') || upper.startsWith('10.') || /^10[A-Z0-9]/i.test(upper)) {
    return 10;
  }

  // 3. Fallback regex to find 10, 11, or 12 anywhere
  const numMatch = upper.match(/(?:^|\D)(10|11|12)(?:\D|$)/);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }

  // 4. Fallback for Roman numerals attached directly e.g. XIIA, XIA, XA
  if (/^XII/i.test(upper)) return 12;
  if (/^XI/i.test(upper)) return 11;
  if (/^X/i.test(upper)) return 10;

  return 0;
}

export function getPromotedClassName(className: string): { newClass: string; isGraduating: boolean; grade: number } {
  if (!className) return { newClass: className, isGraduating: false, grade: 0 };
  const trimmed = className.trim();
  if (trimmed.toUpperCase().startsWith('ALUMNI') || trimmed.toUpperCase().includes('LULUS')) {
    return { newClass: trimmed, isGraduating: false, grade: 0 };
  }

  const grade = parseGradeLevel(trimmed);
  if (grade === 12) {
    return { newClass: trimmed, isGraduating: true, grade: 12 };
  }

  if (grade === 11) {
    let newClass = trimmed;
    // Replace XI -> XII or 11 -> 12
    if (/\bXI\b/i.test(newClass)) {
      newClass = newClass.replace(/\bXI\b/i, 'XII');
    } else if (/\b11\b/.test(newClass)) {
      newClass = newClass.replace(/\b11\b/, '12');
    } else if (/^XI/i.test(newClass)) {
      newClass = 'XII' + newClass.slice(2);
    } else if (/^11/.test(newClass)) {
      newClass = '12' + newClass.slice(2);
    } else if (newClass.includes('11')) {
      newClass = newClass.replace('11', '12');
    } else if (newClass.toUpperCase().includes('XI')) {
      newClass = newClass.replace(/XI/i, 'XII');
    }
    return { newClass, isGraduating: false, grade: 11 };
  }

  if (grade === 10) {
    let newClass = trimmed;
    // Replace X -> XI or 10 -> 11
    if (/\bX\b/i.test(newClass)) {
      newClass = newClass.replace(/\bX\b/i, 'XI');
    } else if (/\b10\b/.test(newClass)) {
      newClass = newClass.replace(/\b10\b/, '11');
    } else if (/^X(?![I|V|X])/i.test(newClass)) {
      newClass = 'XI' + newClass.slice(1);
    } else if (/^10/.test(newClass)) {
      newClass = '11' + newClass.slice(2);
    } else if (newClass.includes('10')) {
      newClass = newClass.replace('10', '11');
    } else if (/\bX\b/i.test(newClass)) {
      newClass = newClass.replace(/\bX\b/i, 'XI');
    }
    return { newClass, isGraduating: false, grade: 10 };
  }

  return { newClass: trimmed, isGraduating: false, grade: 0 };
}

// =================== ATTENDANCE & IZIN ===================
export async function getAllAttendance(): Promise<AttendanceRecord[]> {
  try {
    const res = await pool.query('SELECT * FROM attendance ORDER BY timestamp DESC');
    if (res.rows.length > 0) {
      return res.rows;
    }
  } catch (e) {}
  return readJsonFile<AttendanceRecord[]>(ATTENDANCE_FILE, []);
}

export async function recordAttendance(record: Partial<AttendanceRecord>): Promise<AttendanceRecord> {
  const newAtt: AttendanceRecord = {
    id: record.id || randomUUID(),
    student_id: record.student_id || '',
    timestamp: record.timestamp || getWIBISOString(),
    status: record.status || 'PRESENT',
    type: record.type || 'ARRIVAL'
  };

  try {
    await safeDbQuery(
      'INSERT INTO attendance (id, student_id, timestamp, status, type) VALUES ($1, $2, $3, $4, $5)',
      [newAtt.id, newAtt.student_id, newAtt.timestamp, newAtt.status, newAtt.type]
    );
  } catch (e) {}

  const current = readJsonFile<AttendanceRecord[]>(ATTENDANCE_FILE, []);
  current.push(newAtt);
  writeJsonFile(ATTENDANCE_FILE, current);
  return newAtt;
}

export async function getAllIzin(): Promise<IzinRecord[]> {
  const localList = readJsonFile<IzinRecord[]>(IZIN_FILE, []);
  try {
    const cols = await getTableColumns('izin_siswa');
    const orderCol = cols.has('created_at') ? 'created_at' : (cols.has('dibuat_pada') ? 'dibuat_pada' : 'id');
    const res = await safeDbQuery(`SELECT * FROM izin_siswa ORDER BY ${orderCol} DESC`);
    if (res.rows && res.rows.length > 0) {
      const dbList: IzinRecord[] = res.rows.map((r: any) => {
        let tglMulai = r.tanggal_mulai || '';
        if (tglMulai instanceof Date) tglMulai = getWIBDateString(tglMulai);
        else if (typeof tglMulai === 'string' && tglMulai.includes('T')) tglMulai = tglMulai.split('T')[0];

        let tglSelesai = r.tanggal_selesai || r.tanggal_mulai || '';
        if (tglSelesai instanceof Date) tglSelesai = getWIBDateString(tglSelesai);
        else if (typeof tglSelesai === 'string' && tglSelesai.includes('T')) tglSelesai = tglSelesai.split('T')[0];

        return {
          id: String(r.id),
          nisn: String(r.nisn).trim(),
          tanggal_mulai: tglMulai || getWIBDateString(),
          tanggal_selesai: tglSelesai || tglMulai || getWIBDateString(),
          keterangan: r.keterangan,
          keperluan_dispensasi: r.keperluan_dispensasi || '',
          created_at: r.created_at || r.dibuat_pada || getWIBISOString()
        };
      });

      // Merge with local list if local has entries not in DB
      const dbIdSet = new Set(dbList.map(d => d.id));
      for (const loc of localList) {
        if (!dbIdSet.has(loc.id)) {
          dbList.push(loc);
        }
      }
      return dbList;
    }
  } catch (e) {}
  return localList;
}

export async function saveIzin(izin: Partial<IzinRecord>): Promise<IzinRecord> {
  let tglMulai = (izin.tanggal_mulai || '').trim();
  if (tglMulai.includes('T')) tglMulai = tglMulai.split('T')[0];
  if (!tglMulai) tglMulai = getWIBDateString();

  let tglSelesai = (izin.tanggal_selesai || tglMulai || '').trim();
  if (tglSelesai.includes('T')) tglSelesai = tglSelesai.split('T')[0];
  if (!tglSelesai) tglSelesai = tglMulai;

  const newIzin: IzinRecord = {
    id: izin.id || randomUUID(),
    nisn: String(izin.nisn || '').trim(),
    tanggal_mulai: tglMulai,
    tanggal_selesai: tglSelesai,
    keterangan: izin.keterangan || 'Izin',
    keperluan_dispensasi: izin.keperluan_dispensasi || (izin as any).keperluan || '',
    created_at: izin.created_at || getWIBISOString()
  };

  try {
    const cols = await getTableColumns('izin_siswa');
    const fields = ['id', 'nisn', 'tanggal_mulai', 'tanggal_selesai', 'keterangan'];
    const placeholders = ['$1', '$2', '$3', '$4', '$5'];
    const vals: any[] = [newIzin.id, newIzin.nisn, newIzin.tanggal_mulai, newIzin.tanggal_selesai, newIzin.keterangan];
    let idx = 6;

    if (cols.has('keperluan_dispensasi')) {
      fields.push('keperluan_dispensasi');
      placeholders.push(`$${idx++}`);
      vals.push(newIzin.keperluan_dispensasi || '');
    }
    if (cols.has('created_at')) {
      fields.push('created_at');
      placeholders.push(`$${idx++}`);
      vals.push(new Date());
    }
    if (cols.has('dibuat_pada')) {
      fields.push('dibuat_pada');
      placeholders.push(`$${idx++}`);
      vals.push(newIzin.created_at);
    }

    const query = `
      INSERT INTO izin_siswa (${fields.join(', ')})
      VALUES (${placeholders.join(', ')})
      ON CONFLICT (id) DO UPDATE SET
        tanggal_mulai = EXCLUDED.tanggal_mulai,
        tanggal_selesai = EXCLUDED.tanggal_selesai,
        keterangan = EXCLUDED.keterangan
        ${cols.has('keperluan_dispensasi') ? ', keperluan_dispensasi = EXCLUDED.keperluan_dispensasi' : ''}
    `;
    await safeDbQuery(query, vals);
  } catch (e) {
    try {
      await safeDbQuery(
        `INSERT INTO izin_siswa (id, nisn, tanggal_mulai, tanggal_selesai, keterangan)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           tanggal_mulai = EXCLUDED.tanggal_mulai,
           tanggal_selesai = EXCLUDED.tanggal_selesai,
           keterangan = EXCLUDED.keterangan`,
        [newIzin.id, newIzin.nisn, newIzin.tanggal_mulai, newIzin.tanggal_selesai, newIzin.keterangan]
      );
    } catch (err2) {}
  }

  const current = readJsonFile<IzinRecord[]>(IZIN_FILE, []);
  const existingIndex = current.findIndex(i => i.id === newIzin.id);
  if (existingIndex >= 0) {
    current[existingIndex] = newIzin;
  } else {
    current.push(newIzin);
  }
  writeJsonFile(IZIN_FILE, current);
  return newIzin;
}

export async function deleteIzin(id: string): Promise<boolean> {
  try {
    await pool.query('DELETE FROM izin_siswa WHERE id = $1', [id]);
  } catch (e) {}

  const current = readJsonFile<IzinRecord[]>(IZIN_FILE, []);
  const filtered = current.filter(i => i.id !== id);
  writeJsonFile(IZIN_FILE, filtered);
  return true;
}

// Reset functions
export async function resetStudents(): Promise<{ deletedStudents: number; deletedAttendance: number; deletedIzin: number }> {
  let deletedStudents = 0;
  let deletedAttendance = 0;
  let deletedIzin = 0;
  try {
    const rAtt = await pool.query('DELETE FROM attendance');
    deletedAttendance = rAtt.rowCount || 0;
    const rIz = await pool.query('DELETE FROM izin_siswa');
    deletedIzin = rIz.rowCount || 0;
    const rSt = await pool.query('DELETE FROM students');
    deletedStudents = rSt.rowCount || 0;
  } catch (e) {}

  const locStudents = readJsonFile<StudentRecord[]>(STUDENTS_FILE, []);
  if (deletedStudents === 0) deletedStudents = locStudents.length;
  writeJsonFile(STUDENTS_FILE, []);
  writeJsonFile(ATTENDANCE_FILE, []);
  writeJsonFile(IZIN_FILE, []);
  return { deletedStudents, deletedAttendance, deletedIzin };
}

export async function resetTeachers(): Promise<{ deletedTeachers: number; deletedSchedules: number; deletedAccounts: number }> {
  let deletedTeachers = 0;
  let deletedSchedules = 0;
  let deletedAccounts = 0;
  try {
    const rSch = await pool.query('DELETE FROM piket_schedules');
    deletedSchedules = rSch.rowCount || 0;
    try {
      const rAcc = await pool.query('DELETE FROM guru_accounts');
      deletedAccounts = rAcc.rowCount || 0;
    } catch (e) {}
    try {
      await pool.query('DELETE FROM teacher_credentials');
    } catch (e) {}
    const rTc = await pool.query('DELETE FROM teachers');
    deletedTeachers = rTc.rowCount || 0;
  } catch (e) {}

  const locTeachers = readJsonFile<TeacherRecord[]>(TEACHERS_FILE, []);
  if (deletedTeachers === 0) deletedTeachers = locTeachers.length;
  writeJsonFile(TEACHERS_FILE, []);
  writeJsonFile(AKUN_GURU_FILE, []);
  writeJsonFile(JADWAL_PIKET_FILE, []);
  return { deletedTeachers, deletedSchedules, deletedAccounts };
}

export async function resetReports(): Promise<{ deletedAttendance: number; deletedIzin: number }> {
  let deletedAttendance = 0;
  let deletedIzin = 0;
  try {
    const rAtt = await pool.query('DELETE FROM attendance');
    deletedAttendance = rAtt.rowCount || 0;
    const rIz = await pool.query('DELETE FROM izin_siswa');
    deletedIzin = rIz.rowCount || 0;
  } catch (e) {}
  const locAtt = readJsonFile<AttendanceRecord[]>(ATTENDANCE_FILE, []);
  if (deletedAttendance === 0) deletedAttendance = locAtt.length;
  const locIz = readJsonFile<IzinRecord[]>(IZIN_FILE, []);
  if (deletedIzin === 0) deletedIzin = locIz.length;
  writeJsonFile(ATTENDANCE_FILE, []);
  writeJsonFile(IZIN_FILE, []);
  return { deletedAttendance, deletedIzin };
}

export async function resetTeacherAttendanceReports(): Promise<{ deletedTeacherAttendance: number }> {
  let deletedTeacherAttendance = 0;
  try {
    const r = await pool.query('DELETE FROM kehadiran_kbm_guru');
    deletedTeacherAttendance = r.rowCount || 0;
  } catch (e) {}
  const loc = readJsonFile<TeacherKbmAttendance[]>(KEHADIRAN_KBM_FILE, []);
  if (deletedTeacherAttendance === 0) deletedTeacherAttendance = loc.length;
  writeJsonFile(KEHADIRAN_KBM_FILE, []);
  return { deletedTeacherAttendance };
}

export async function resetAllData(): Promise<{ students: number; teachers: number; attendance: number; izin: number; piket_schedules: number; teacher_attendance: number }> {
  const repRes = await resetReports();
  const stRes = await resetStudents();
  const tcRes = await resetTeachers();
  const tAttRes = await resetTeacherAttendanceReports();
  return {
    students: stRes.deletedStudents,
    teachers: tcRes.deletedTeachers,
    attendance: repRes.deletedAttendance || stRes.deletedAttendance,
    izin: repRes.deletedIzin || stRes.deletedIzin,
    piket_schedules: tcRes.deletedSchedules,
    teacher_attendance: tAttRes.deletedTeacherAttendance
  };
}

export async function getDatabaseStats(): Promise<{
  studentsCount: number;
  teachersCount: number;
  attendanceCount: number;
  izinCount: number;
  piketSchedulesCount: number;
  teacherAccountsCount: number;
  teacherAttendanceCount: number;
  lastUpdated: string;
}> {
  const [students, teachers, attendance, izin, piket, accounts, teacherKbm] = await Promise.all([
    getAllStudents(),
    getAllTeachers(),
    getAllAttendance(),
    getAllIzin(),
    getAllPiketSchedule(),
    getAllTeacherAccounts(),
    getAllTeacherKbmAttendance()
  ]);

  return {
    studentsCount: students.length,
    teachersCount: teachers.length,
    attendanceCount: attendance.length,
    izinCount: izin.length,
    piketSchedulesCount: piket.length,
    teacherAccountsCount: accounts.length,
    teacherAttendanceCount: teacherKbm.length,
    lastUpdated: new Date().toISOString()
  };
}

export interface TahunAjaran {
  id: string;
  nama: string;
  semester?: 'Ganjil' | 'Genap' | string;
  is_active: boolean;
  dibuat_pada: string;
}

export async function getAllTahunAjaran(): Promise<TahunAjaran[]> {
  try {
    const res = await pool.query('SELECT * FROM tahun_ajaran ORDER BY dibuat_pada DESC');
    if (res.rows.length > 0) return res.rows;
  } catch (e) {
  }
  return readJsonFile<TahunAjaran[]>(TAHUN_AJARAN_FILE, []);
}

export async function saveTahunAjaran(ta: TahunAjaran): Promise<boolean> {
  const semester = ta.semester || 'Ganjil';
  try {
    if (ta.is_active) {
       await pool.query('UPDATE tahun_ajaran SET is_active = false');
    }
    const query = 'INSERT INTO tahun_ajaran (id, nama, semester, is_active, dibuat_pada) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET nama = $2, semester = $3, is_active = $4';
    await pool.query(query, [ta.id, ta.nama, semester, ta.is_active, ta.dibuat_pada]);
  } catch (e) {
  }
  const current = readJsonFile<TahunAjaran[]>(TAHUN_AJARAN_FILE, []);
  if (ta.is_active) {
    current.forEach(t => t.is_active = false);
  }
  const existingIdx = current.findIndex(t => t.id === ta.id);
  const updatedTa = { ...ta, semester };
  if (existingIdx >= 0) {
    current[existingIdx] = updatedTa;
  } else {
    current.push(updatedTa);
  }
  writeJsonFile(TAHUN_AJARAN_FILE, current);
  return true;
}

export async function setTahunAjaranActive(id: string, is_active: boolean, semester?: string): Promise<boolean> {
  try {
    if (is_active) {
       await pool.query('UPDATE tahun_ajaran SET is_active = false');
    }
    if (semester) {
      await pool.query('UPDATE tahun_ajaran SET is_active = $1, semester = $2 WHERE id = $3', [is_active, semester, id]);
    } else {
      await pool.query('UPDATE tahun_ajaran SET is_active = $1 WHERE id = $2', [is_active, id]);
    }
  } catch (e) {
  }
  const current = readJsonFile<TahunAjaran[]>(TAHUN_AJARAN_FILE, []);
  if (is_active) {
    current.forEach(t => t.is_active = false);
  }
  const target = current.find(t => t.id === id);
  if (target) {
    target.is_active = is_active;
    if (semester) target.semester = semester;
    writeJsonFile(TAHUN_AJARAN_FILE, current);
  }
  return true;
}

export async function deleteTahunAjaran(id: string): Promise<boolean> {
  try {
    await pool.query('DELETE FROM tahun_ajaran WHERE id = $1', [id]);
  } catch (e) {
  }
  const current = readJsonFile<TahunAjaran[]>(TAHUN_AJARAN_FILE, []);
  const filtered = current.filter(t => t.id !== id);
  writeJsonFile(TAHUN_AJARAN_FILE, filtered);
  return true;
}

// =================== MATA PELAJARAN ===================

export interface MataPelajaran {
  id: string;
  kode_mapel: string;
  nama_mapel: string;
  kelompok: string;
  keterangan?: string;
  created_at?: string;
}

const DEFAULT_MATA_PELAJARAN: MataPelajaran[] = [
  { id: 'mp-1', kode_mapel: 'PAIBP', nama_mapel: 'Pendidikan Agama Islam dan Budi Pekerti', kelompok: 'Muatan Umum (A)', keterangan: 'Pendidikan Agama & Karakter' },
  { id: 'mp-2', kode_mapel: 'PPKN', nama_mapel: 'Pendidikan Pancasila dan Kewarganegaraan', kelompok: 'Muatan Umum (A)', keterangan: 'Pendidikan Kewarganegaraan' },
  { id: 'mp-3', kode_mapel: 'BINDO', nama_mapel: 'Bahasa Indonesia', kelompok: 'Muatan Umum (A)', keterangan: 'Kemampuan Literasi dan Komunikasi Bahasa Indonesia' },
  { id: 'mp-4', kode_mapel: 'PJOK', nama_mapel: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', kelompok: 'Muatan Umum (A)', keterangan: 'Kebugaran jasmani dan kesehatan' },
  { id: 'mp-5', kode_mapel: 'SEJ', nama_mapel: 'Sejarah Indonesia', kelompok: 'Muatan Umum (A)', keterangan: 'Wawasan sejarah nasional' },
  { id: 'mp-6', kode_mapel: 'SNB', nama_mapel: 'Seni Budaya', kelompok: 'Muatan Umum (A)', keterangan: 'Pengembangan apresiasi estetika dan seni' },
  { id: 'mp-7', kode_mapel: 'MTK', nama_mapel: 'Matematika', kelompok: 'Muatan Umum (A)', keterangan: 'Keterampilan berhitung, logika, dan analisis kuantitatif' },
  { id: 'mp-8', kode_mapel: 'BING', nama_mapel: 'Bahasa Inggris', kelompok: 'Muatan Umum (A)', keterangan: 'Kemampuan komunikasi bahasa asing' },
  { id: 'mp-9', kode_mapel: 'INFOR', nama_mapel: 'Informatika', kelompok: 'Muatan Kejuruan', keterangan: 'Dasar logika komputasi dan teknologi informasi' },
  { id: 'mp-10', kode_mapel: 'IPAS', nama_mapel: 'Projek Ilmu Pengetahuan Alam dan Sosial (IPAS)', kelompok: 'Muatan Kejuruan', keterangan: 'Pendekatan sains kontekstual dan sosial' },
  { id: 'mp-11', kode_mapel: 'DPK', nama_mapel: 'Dasar-Dasar Program Keahlian', kelompok: 'Muatan Kejuruan', keterangan: 'Kompetensi kejuruan tingkat dasar' },
  { id: 'mp-12', kode_mapel: 'KK', nama_mapel: 'Konsentrasi Keahlian', kelompok: 'Muatan Kejuruan', keterangan: 'Keahlian teknis dan kompetensi spesifik kejuruan' },
  { id: 'mp-13', kode_mapel: 'PKK', nama_mapel: 'Projek Kreatif dan Kewirausahaan (PKK)', kelompok: 'Muatan Kejuruan', keterangan: 'Produk kreatif, inovasi, dan bisnis wirausaha' },
  { id: 'mp-14', kode_mapel: 'MULOK', nama_mapel: 'Muatan Lokal (Bahasa Daerah)', kelompok: 'Muatan Lokal', keterangan: 'Pelestarian bahasa dan kearifan lokal daerah' }
];

export async function getAllMataPelajaran(): Promise<MataPelajaran[]> {
  try {
    const res = await pool.query('SELECT * FROM mata_pelajaran ORDER BY kelompok ASC, nama_mapel ASC');
    if (res.rows.length > 0) return res.rows;
  } catch (e) {}
  const loc = readJsonFile<MataPelajaran[]>(MATA_PELAJARAN_FILE, DEFAULT_MATA_PELAJARAN);
  return loc;
}

export async function saveMataPelajaran(mapel: Partial<MataPelajaran>): Promise<MataPelajaran> {
  const item: MataPelajaran = {
    id: mapel.id || `mp-${Date.now()}-${randomUUID().slice(0, 4)}`,
    kode_mapel: (mapel.kode_mapel || '').trim().toUpperCase(),
    nama_mapel: (mapel.nama_mapel || '').trim(),
    kelompok: mapel.kelompok || 'Muatan Kejuruan',
    keterangan: mapel.keterangan || '',
    created_at: mapel.created_at || new Date().toISOString()
  };

  try {
    await pool.query(
      `INSERT INTO mata_pelajaran (id, kode_mapel, nama_mapel, kelompok, keterangan, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         kode_mapel = EXCLUDED.kode_mapel,
         nama_mapel = EXCLUDED.nama_mapel,
         kelompok = EXCLUDED.kelompok,
         keterangan = EXCLUDED.keterangan`,
      [item.id, item.kode_mapel, item.nama_mapel, item.kelompok, item.keterangan, item.created_at]
    );
  } catch (e) {}

  const loc = readJsonFile<MataPelajaran[]>(MATA_PELAJARAN_FILE, DEFAULT_MATA_PELAJARAN);
  const idx = loc.findIndex(m => m.id === item.id);
  if (idx >= 0) {
    loc[idx] = item;
  } else {
    loc.push(item);
  }
  writeJsonFile(MATA_PELAJARAN_FILE, loc);
  return item;
}

export async function deleteMataPelajaran(id: string): Promise<boolean> {
  try {
    await pool.query('DELETE FROM mata_pelajaran WHERE id = $1', [id]);
  } catch (e) {}
  const loc = readJsonFile<MataPelajaran[]>(MATA_PELAJARAN_FILE, DEFAULT_MATA_PELAJARAN);
  const filtered = loc.filter(m => m.id !== id);
  writeJsonFile(MATA_PELAJARAN_FILE, filtered);
  return true;
}

export async function bulkImportMataPelajaran(items: Array<{
  id?: string;
  kode_mapel?: string;
  nama_mapel?: string;
  kelompok?: string;
  keterangan?: string;
}>): Promise<{ imported: number; updated: number; total: number }> {
  let imported = 0;
  let updated = 0;

  const currentList = await getAllMataPelajaran();

  for (const item of items) {
    const kode = (item.kode_mapel || '').trim().toUpperCase();
    const nama = (item.nama_mapel || '').trim();
    if (!nama && !kode) continue;

    const kelompok = (item.kelompok || 'Muatan Kejuruan').trim();
    const keterangan = (item.keterangan || '').trim();

    // Check existing by kode or nama
    const existing = currentList.find(m => 
      (kode && m.kode_mapel.toUpperCase() === kode) || 
      (nama && m.nama_mapel.toLowerCase() === nama.toLowerCase())
    );

    if (existing) {
      await saveMataPelajaran({
        id: existing.id,
        kode_mapel: kode || existing.kode_mapel,
        nama_mapel: nama || existing.nama_mapel,
        kelompok: kelompok || existing.kelompok,
        keterangan: keterangan || existing.keterangan
      });
      updated++;
    } else {
      await saveMataPelajaran({
        id: item.id || `mp-${Date.now()}-${randomUUID().slice(0, 4)}`,
        kode_mapel: kode || `MP-${Math.floor(100 + Math.random() * 900)}`,
        nama_mapel: nama || kode,
        kelompok,
        keterangan
      });
      imported++;
    }
  }

  return { imported, updated, total: imported + updated };
}

// =================== AKUN GURU (TEACHER ACCOUNTS) ===================

/**
 * Generate a clean, unique username from teacher NIP or full name.
 * Rule: Otomatis dari NIP jika ada. Apabila tidak mempunyai NIP maka menggunakan nama lengkap.
 */
export function generateUsernameForTeacher(name: string, nip?: string, existingUsernames: Set<string> = new Set()): string {
  const cleanNip = (nip || '').replace(/[^a-zA-Z0-9]/g, '').trim().toLowerCase();
  if (cleanNip.length >= 3) {
    let candidate = cleanNip;
    let counter = 2;
    while (existingUsernames.has(candidate)) {
      candidate = `${cleanNip}_${counter++}`;
    }
    return candidate;
  }

  // Bersihkan gelar akademik (Dra., Drs., S.Pd, M.Pd, dsb.) dan karakter non-alfanumerik
  let cleanName = (name || 'guru')
    .replace(/\b(Dra|Drs|Dr|Prof|Hj?|S\.Pd|M\.Pd|S\.Kom|M\.Kom|S\.T|M\.T|S\.Ag|M\.Ag|S\.Si|M\.Si|Gr|M\.M|S\.E|M\.E|S\.Sos|M\.Sos)\b/gi, '')
    .replace(/[.,\/'"#!$%^&*;:{}=\-_`~()]/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  if (!cleanName || cleanName.length < 2) {
    cleanName = 'guru_' + Math.floor(1000 + Math.random() * 9000);
  }

  let candidate = cleanName;
  let counter = 2;
  while (existingUsernames.has(candidate)) {
    candidate = `${cleanName}${counter++}`;
  }
  return candidate;
}

/**
 * Pilihan password otomatis rotasi sesuai permintaan:
 * (Guru@123, @Guru123, @Guru2026, Guru@2026)
 */
export const TEACHER_PASSWORD_OPTIONS = [
  'Guru@123',
  '@Guru123',
  '@Guru2026',
  'Guru@2026'
];

export const PIKET_PASSWORD_OPTIONS = TEACHER_PASSWORD_OPTIONS;

let piketPasswordCounter = 0;

export function getNextPiketPassword(index?: number): string {
  if (typeof index === 'number') {
    return TEACHER_PASSWORD_OPTIONS[Math.abs(index) % TEACHER_PASSWORD_OPTIONS.length];
  }
  const pwd = TEACHER_PASSWORD_OPTIONS[piketPasswordCounter % TEACHER_PASSWORD_OPTIONS.length];
  piketPasswordCounter = (piketPasswordCounter + 1) % TEACHER_PASSWORD_OPTIONS.length;
  return pwd;
}

/**
 * Generate password otomatis dengan sistem rotasi dari pilihan resmi:
 * Guru@123, @Guru123, @Guru2026, Guru@2026
 */
export function generateRandomPassword(index?: number): string {
  return getNextPiketPassword(index);
}

export async function getAllTeacherAccounts(): Promise<TeacherAccountRecord[]> {
  try {
    const res = await pool.query(`
      SELECT a.*, t.name as teacher_name, t.nip as teacher_nip, t.whatsapp as teacher_whatsapp, t.class as teacher_class
      FROM akun_guru a
      LEFT JOIN teachers t ON a.teacher_id = t.id
      WHERE (a.role IS NULL OR a.role != 'KEPALA_SEKOLAH') 
        AND a.teacher_id != 'kepsek' 
        AND a.id != 'kepsek_account'
      ORDER BY a.name ASC
    `);
    if (res.rows.length > 0) {
      return res.rows.map(r => ({
        id: r.id,
        teacher_id: r.teacher_id,
        name: r.teacher_name || r.name,
        nip: r.teacher_nip !== undefined ? r.teacher_nip : (r.nip || ''),
        username: r.username,
        password_plain: r.password_plain,
        password_hash: r.password_hash,
        status: r.status || 'AKTIF',
        role: r.role || 'GURU',
        created_at: r.created_at || '',
        updated_at: r.updated_at || ''
      }));
    }
  } catch (e) {}

  const fileList = readJsonFile<TeacherAccountRecord[]>(AKUN_GURU_FILE, []);
  return fileList.filter(a => a.role !== 'KEPALA_SEKOLAH' && a.teacher_id !== 'kepsek' && a.id !== 'kepsek_account');
}

export async function saveTeacherAccount(acc: Partial<TeacherAccountRecord>): Promise<TeacherAccountRecord> {
  const plainPassword = acc.password_plain || generateRandomPassword();
  let hash = acc.password_hash;
  if (!hash) {
    try {
      hash = await bcrypt.hash(plainPassword, 10);
    } catch (e) {
      hash = plainPassword;
    }
  }

  const newAcc: TeacherAccountRecord = {
    id: acc.id || randomUUID(),
    teacher_id: acc.teacher_id || '',
    name: acc.name || '',
    nip: acc.nip || '',
    username: acc.username || '',
    password_plain: plainPassword,
    password_hash: hash,
    status: acc.status || 'AKTIF',
    role: acc.role || 'GURU',
    created_at: acc.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    await pool.query(`
      INSERT INTO akun_guru (id, teacher_id, name, nip, username, password_plain, password_hash, status, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        nip = EXCLUDED.nip,
        username = EXCLUDED.username,
        password_plain = EXCLUDED.password_plain,
        password_hash = EXCLUDED.password_hash,
        status = EXCLUDED.status,
        role = EXCLUDED.role,
        updated_at = CURRENT_TIMESTAMP
    `, [
      newAcc.id, newAcc.teacher_id, newAcc.name, newAcc.nip, newAcc.username,
      newAcc.password_plain, newAcc.password_hash, newAcc.status, newAcc.role, newAcc.created_at, newAcc.updated_at
    ]);
  } catch (e) {
    try {
      await pool.query(`
        INSERT INTO akun_guru (id, teacher_id, name, nip, username, password_plain, password_hash, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          nip = EXCLUDED.nip,
          username = EXCLUDED.username,
          password_plain = EXCLUDED.password_plain,
          password_hash = EXCLUDED.password_hash,
          status = EXCLUDED.status,
          updated_at = CURRENT_TIMESTAMP
      `, [
        newAcc.id, newAcc.teacher_id, newAcc.name, newAcc.nip, newAcc.username,
        newAcc.password_plain, newAcc.password_hash, newAcc.status, newAcc.created_at, newAcc.updated_at
      ]);
    } catch (e2) {}
  }

  const current = readJsonFile<TeacherAccountRecord[]>(AKUN_GURU_FILE, []);
  const idx = current.findIndex(a => a.id === newAcc.id || a.teacher_id === newAcc.teacher_id);
  if (idx >= 0) current[idx] = newAcc;
  else current.push(newAcc);
  writeJsonFile(AKUN_GURU_FILE, current);
  return newAcc;
}

export async function updateTeacherAccount(id: string, data: Partial<TeacherAccountRecord>): Promise<TeacherAccountRecord | null> {
  const current = await getAllTeacherAccounts();
  const target = current.find(a => a.id === id || a.teacher_id === id);
  if (!target) return null;

  let newPlain = data.password_plain !== undefined ? data.password_plain : target.password_plain;
  let newHash = target.password_hash;
  if (data.password_plain && data.password_plain !== target.password_plain) {
    try {
      newHash = await bcrypt.hash(data.password_plain, 10);
    } catch (e) {
      newHash = data.password_plain;
    }
  }

  const updated: TeacherAccountRecord = {
    ...target,
    name: data.name !== undefined ? data.name : target.name,
    nip: data.nip !== undefined ? data.nip : target.nip,
    username: data.username !== undefined ? data.username.trim() : target.username,
    password_plain: newPlain,
    password_hash: newHash,
    status: data.status !== undefined ? data.status : target.status,
    role: data.role !== undefined ? data.role : (target.role || 'GURU'),
    updated_at: new Date().toISOString()
  };

  try {
    await pool.query(`
      UPDATE akun_guru
      SET name = $1, nip = $2, username = $3, password_plain = $4, password_hash = $5, status = $6, role = $7, updated_at = CURRENT_TIMESTAMP
      WHERE id = $8 OR teacher_id = $8
    `, [updated.name, updated.nip, updated.username, updated.password_plain, updated.password_hash, updated.status, updated.role, target.id]);
  } catch (e) {
    try {
      await pool.query(`
        UPDATE akun_guru
        SET name = $1, nip = $2, username = $3, password_plain = $4, password_hash = $5, status = $6, updated_at = CURRENT_TIMESTAMP
        WHERE id = $7 OR teacher_id = $7
      `, [updated.name, updated.nip, updated.username, updated.password_plain, updated.password_hash, updated.status, target.id]);
    } catch (e2) {}
  }

  const fileAccounts = readJsonFile<TeacherAccountRecord[]>(AKUN_GURU_FILE, []);
  const fIdx = fileAccounts.findIndex(a => a.id === target.id || a.teacher_id === target.teacher_id);
  if (fIdx >= 0) fileAccounts[fIdx] = updated;
  else fileAccounts.push(updated);
  writeJsonFile(AKUN_GURU_FILE, fileAccounts);
  return updated;
}

// --- PENGATURAN AKUN KEPALA SEKOLAH & ROLE KHUSUS ---

export async function getKepalaSekolahAccount(): Promise<{
  name: string;
  nip: string;
  whatsapp?: string;
  username: string;
  password_plain: string;
  password_hash?: string;
  status: string;
}> {
  const settings = await getSettings();
  const headName = settings.headmaster_name || settings.headmasterName || 'Kepala Sekolah';
  const headNip = settings.headmaster_nip || settings.headmasterNip || '';
  const headWa = settings.headmaster_whatsapp || settings.headmasterWhatsapp || '';
  const headUsername = (settings as any).headmaster_username || (headNip ? headNip.replace(/[^a-zA-Z0-9]/g, '') : 'kepsek');
  const headPassword = (settings as any).headmaster_password || 'Kepsek@123';
  const headPasswordHash = (settings as any).headmaster_password_hash || '';
  const headStatus = (settings as any).headmaster_status || 'AKTIF';

  return {
    name: headName,
    nip: headNip,
    whatsapp: headWa,
    username: headUsername,
    password_plain: headPassword,
    password_hash: headPasswordHash,
    status: headStatus
  };
}

export async function saveKepalaSekolahAccount(data: {
  name?: string;
  nip?: string;
  whatsapp?: string;
  username?: string;
  password_plain?: string;
  status?: string;
}): Promise<any> {
  const settings = await getSettings();
  const headName = data.name !== undefined ? data.name.trim() : (settings.headmaster_name || settings.headmasterName || 'Kepala Sekolah');
  const headNip = data.nip !== undefined ? data.nip.trim() : (settings.headmaster_nip || settings.headmasterNip || '');
  const headWa = data.whatsapp !== undefined ? data.whatsapp.trim() : (settings.headmaster_whatsapp || settings.headmasterWhatsapp || '');
  const username = data.username ? data.username.trim() : ((settings as any).headmaster_username || (headNip ? headNip.replace(/[^a-zA-Z0-9]/g, '') : 'kepsek'));
  const password = data.password_plain ? data.password_plain.trim() : ((settings as any).headmaster_password || 'Kepsek@123');
  const status = data.status || (settings as any).headmaster_status || 'AKTIF';

  await updateSettings({
    ...(settings as any),
    headmaster_name: headName,
    headmaster_nip: headNip,
    headmaster_whatsapp: headWa,
    headmaster_username: username,
    headmaster_password: password,
    headmaster_status: status
  });

  // Ensure any legacy kepsek rows are purged from akun_guru so there are no duplicates
  try {
    await pool.query("DELETE FROM akun_guru WHERE teacher_id = 'kepsek' OR id = 'kepsek_account' OR role = 'KEPALA_SEKOLAH'");
  } catch (e) {}
  const fileAccounts = readJsonFile<TeacherAccountRecord[]>(AKUN_GURU_FILE, []);
  const cleanedFileAccounts = fileAccounts.filter(a => a.teacher_id !== 'kepsek' && a.id !== 'kepsek_account' && a.role !== 'KEPALA_SEKOLAH');
  if (cleanedFileAccounts.length !== fileAccounts.length) {
    writeJsonFile(AKUN_GURU_FILE, cleanedFileAccounts);
  }

  return {
    success: true,
    name: headName,
    nip: headNip,
    whatsapp: headWa,
    username,
    password_plain: password,
    status
  };
}

// --- TUGAS TAMBAHAN CATEGORIES ---

export const DEFAULT_TUGAS_CATEGORIES: TugasTambahanCategory[] = [
  {
    id: 'cat-1',
    name: 'Waka Kurikulum',
    code: 'WAKA_KURIKULUM',
    description: 'Membidangi kurikulum, pembelajaran, dan supervisi akademik',
    created_at: new Date().toISOString()
  },
  {
    id: 'cat-2',
    name: 'Waka Kesiswaan',
    code: 'WAKA_KESISWAAN',
    description: 'Membidangi ketertiban, kedisiplinan, dan kegiatan siswa',
    created_at: new Date().toISOString()
  },
  {
    id: 'cat-3',
    name: 'Waka Humas',
    code: 'WAKA_HUMAS',
    description: 'Membidangi hubungan masyarakat dan dunia industri / kerja',
    created_at: new Date().toISOString()
  },
  {
    id: 'cat-4',
    name: 'Waka Sarpras',
    code: 'WAKA_SARPRAS',
    description: 'Membidangi sarana prasarana dan inventaris sekolah',
    created_at: new Date().toISOString()
  },
  {
    id: 'cat-5',
    name: 'Guru BK',
    code: 'GURU_BK',
    description: 'Bimbingan konseling dan penanganan perkembangan siswa',
    created_at: new Date().toISOString()
  },
  {
    id: 'cat-6',
    name: 'Ka Konsentrasi Keahlian',
    code: 'KA_KONSENTRASI_KEAHLIAN',
    description: 'Ketua / Koordinator Program & Konsentrasi Keahlian',
    created_at: new Date().toISOString()
  }
];

export async function getAllTugasCategories(): Promise<TugasTambahanCategory[]> {
  let categories: TugasTambahanCategory[] = [];
  try {
    const res = await safeDbQuery('SELECT * FROM tugas_tambahan_categories ORDER BY created_at ASC');
    if (res.rows && res.rows.length > 0) {
      categories = res.rows.map(r => {
        const catName = (r.nama || r.name || '').trim();
        const catCode = (r.kode || r.code || '').trim();
        const catDesc = (r.keterangan !== undefined && r.keterangan !== null ? r.keterangan : (r.description || '')).trim();
        return {
          id: r.id,
          name: catName,
          nama: catName,
          code: catCode,
          kode: catCode,
          description: catDesc,
          keterangan: catDesc,
          created_at: r.created_at || getWIBISOString()
        };
      });
      writeJsonFile(TUGAS_CATEGORIES_FILE, categories);
      return categories;
    }
  } catch (e) {}

  const local = readJsonFile<any[]>(TUGAS_CATEGORIES_FILE, []);
  if (local.length > 0) {
    return local.map(r => {
      const catName = (r.nama || r.name || '').trim();
      const catCode = (r.kode || r.code || '').trim();
      const catDesc = (r.keterangan !== undefined && r.keterangan !== null ? r.keterangan : (r.description || '')).trim();
      return {
        id: r.id,
        name: catName,
        nama: catName,
        code: catCode,
        kode: catCode,
        description: catDesc,
        keterangan: catDesc,
        created_at: r.created_at || getWIBISOString()
      };
    });
  }

  // If empty, save default
  for (const cat of DEFAULT_TUGAS_CATEGORIES) {
    try {
      await safeDbQuery(
        'INSERT INTO tugas_tambahan_categories (id, name, nama, code, kode, description, keterangan) VALUES ($1, $2, $2, $3, $3, $4, $4) ON CONFLICT (id) DO NOTHING',
        [cat.id, cat.name, cat.code || '', cat.description || '']
      );
    } catch (e) {
      try {
        await safeDbQuery(
          'INSERT INTO tugas_tambahan_categories (id, name, code, description) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
          [cat.id, cat.name, cat.code || '', cat.description || '']
        );
      } catch (e2) {}
    }
  }
  const defaultMapped: TugasTambahanCategory[] = DEFAULT_TUGAS_CATEGORIES.map(r => ({
    id: r.id,
    name: r.name,
    nama: r.name,
    code: r.code || '',
    kode: r.code || '',
    description: r.description || '',
    keterangan: r.description || '',
    created_at: getWIBISOString()
  }));
  writeJsonFile(TUGAS_CATEGORIES_FILE, defaultMapped);
  return defaultMapped;
}

export async function saveTugasCategory(category: any): Promise<TugasTambahanCategory> {
  const all = await getAllTugasCategories();
  const name = (category.nama || category.name || '').trim();
  if (!name) throw new Error('Nama kategori tidak boleh kosong');

  const existing = all.find(c => (c.nama || c.name || '').toLowerCase() === name.toLowerCase());
  if (existing) throw new Error(`Kategori "${name}" sudah ada`);

  const code = (category.kode || category.code || '').trim() || name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const description = (category.keterangan !== undefined && category.keterangan !== null 
    ? category.keterangan 
    : (category.description !== undefined && category.description !== null ? category.description : '')).trim();

  const newCat: TugasTambahanCategory = {
    id: category.id || `cat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name,
    nama: name,
    code,
    kode: code,
    description,
    keterangan: description,
    created_at: getWIBISOString()
  };

  try {
    const cols = await getTableColumns('tugas_tambahan_categories');
    if (cols.has('nama') && cols.has('name')) {
      await safeDbQuery(
        'INSERT INTO tugas_tambahan_categories (id, name, nama, code, kode, description, keterangan, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, nama = EXCLUDED.nama, code = EXCLUDED.code, kode = EXCLUDED.kode, description = EXCLUDED.description, keterangan = EXCLUDED.keterangan',
        [newCat.id, newCat.name, newCat.nama, newCat.code, newCat.kode, newCat.description, newCat.keterangan, newCat.created_at]
      );
    } else if (cols.has('nama')) {
      await safeDbQuery(
        'INSERT INTO tugas_tambahan_categories (id, nama, kode, keterangan, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET nama = EXCLUDED.nama, kode = EXCLUDED.kode, keterangan = EXCLUDED.keterangan',
        [newCat.id, newCat.nama, newCat.kode, newCat.keterangan, newCat.created_at]
      );
    } else {
      await safeDbQuery(
        'INSERT INTO tugas_tambahan_categories (id, name, code, description, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, description = EXCLUDED.description',
        [newCat.id, newCat.name, newCat.code, newCat.description, newCat.created_at]
      );
    }
  } catch (e) {
    try {
      await safeDbQuery(
        'INSERT INTO tugas_tambahan_categories (id, name, nama, code, kode, description, keterangan, created_at) VALUES ($1, $2, $2, $3, $3, $4, $4, $5)',
        [newCat.id, newCat.name, newCat.code, newCat.description, newCat.created_at]
      );
    } catch (e2) {
      try {
        await safeDbQuery(
          'INSERT INTO tugas_tambahan_categories (id, name, code, description, created_at) VALUES ($1, $2, $3, $4, $5)',
          [newCat.id, newCat.name, newCat.code, newCat.description, newCat.created_at]
        );
      } catch (e3) {
        try {
          await safeDbQuery(
            'INSERT INTO tugas_tambahan_categories (id, nama, kode, keterangan, created_at) VALUES ($1, $2, $3, $4, $5)',
            [newCat.id, newCat.nama, newCat.kode, newCat.keterangan, newCat.created_at]
          );
        } catch (e4) {}
      }
    }
  }

  const updated = [...all, newCat];
  writeJsonFile(TUGAS_CATEGORIES_FILE, updated);
  return newCat;
}

export async function updateTugasCategory(id: string, category: any): Promise<TugasTambahanCategory> {
  const all = await getAllTugasCategories();
  const index = all.findIndex(c => c.id === id);
  if (index === -1) throw new Error('Kategori tidak ditemukan');

  const name = (category.nama || category.name || all[index].nama || all[index].name || '').trim();
  const code = (category.kode || category.code || all[index].kode || all[index].code || '').trim();
  const description = (category.keterangan !== undefined && category.keterangan !== null 
    ? category.keterangan 
    : (category.description !== undefined && category.description !== null 
      ? category.description 
      : (all[index].keterangan || all[index].description || ''))).trim();

  const updatedCat: TugasTambahanCategory = {
    ...all[index],
    id,
    name,
    nama: name,
    code,
    kode: code,
    description,
    keterangan: description
  };

  try {
    const cols = await getTableColumns('tugas_tambahan_categories');
    if (cols.has('nama') && cols.has('name')) {
      await safeDbQuery(
        'UPDATE tugas_tambahan_categories SET name = $1, nama = $2, code = $3, kode = $4, description = $5, keterangan = $6 WHERE id = $7',
        [name, name, code, code, description, description, id]
      );
    } else if (cols.has('nama')) {
      await safeDbQuery(
        'UPDATE tugas_tambahan_categories SET nama = $1, kode = $2, keterangan = $3 WHERE id = $4',
        [name, code, description, id]
      );
    } else {
      await safeDbQuery(
        'UPDATE tugas_tambahan_categories SET name = $1, code = $2, description = $3 WHERE id = $4',
        [name, code, description, id]
      );
    }
  } catch (e) {
    try {
      await safeDbQuery(
        'UPDATE tugas_tambahan_categories SET name = $1, nama = $1, code = $2, kode = $2, description = $3, keterangan = $3 WHERE id = $4',
        [name, code, description, id]
      );
    } catch (e2) {
      try {
        await safeDbQuery(
          'UPDATE tugas_tambahan_categories SET name = $1, code = $2, description = $3 WHERE id = $4',
          [name, code, description, id]
        );
      } catch (e3) {
        try {
          await safeDbQuery(
            'UPDATE tugas_tambahan_categories SET nama = $1, kode = $2, keterangan = $3 WHERE id = $4',
            [name, code, description, id]
          );
        } catch (e4) {}
      }
    }
  }

  // Also update category_name in tugas_tambahan_guru
  try {
    await safeDbQuery('UPDATE tugas_tambahan_guru SET category_name = $1 WHERE category_id = $2', [name, id]);
  } catch (e) {}

  const allTugas = await getAllTugasGuru();
  let anyTugasChanged = false;
  for (const t of allTugas) {
    if (t.category_id === id) {
      t.category_name = name;
      anyTugasChanged = true;
    }
  }
  if (anyTugasChanged) {
    writeJsonFile(TUGAS_GURU_FILE, allTugas);
  }

  all[index] = updatedCat;
  writeJsonFile(TUGAS_CATEGORIES_FILE, all);
  return updatedCat;
}

export async function deleteTugasCategory(id: string): Promise<boolean> {
  const all = await getAllTugasCategories();
  const filtered = all.filter(c => c.id !== id);
  writeJsonFile(TUGAS_CATEGORIES_FILE, filtered);

  const allTugas = await getAllTugasGuru();
  const affectedAssignments = allTugas.filter(t => t.category_id === id);
  const affectedTeacherIds = Array.from(new Set(affectedAssignments.map(a => a.teacher_id)));

  try {
    await pool.query('DELETE FROM tugas_tambahan_categories WHERE id = $1', [id]);
    await pool.query('DELETE FROM tugas_tambahan_guru WHERE category_id = $1', [id]);
  } catch (e) {}

  const remainingTugas = allTugas.filter(t => t.category_id !== id);
  writeJsonFile(TUGAS_GURU_FILE, remainingTugas);

  // Sync roles for all affected teachers
  for (const teacherId of affectedTeacherIds) {
    await syncTeacherRole(teacherId);
  }

  return true;
}

// --- TUGAS TAMBAHAN GURU ---

export async function getAllTugasGuru(): Promise<TugasTambahanGuru[]> {
  try {
    const res = await safeDbQuery('SELECT * FROM tugas_tambahan_guru ORDER BY created_at DESC');
    if (res && res.rows && res.rows.length > 0) {
      const mapped: TugasTambahanGuru[] = res.rows.map(r => {
        const teacherName = (r.teacher_name || r.nama_guru || r.name || r.nama || '').trim();
        const catName = (r.category_name || r.nama_kategori || r.kategori || '').trim();
        const sk = (r.sk_nomor || r.nomor_sk || r.no_sk || '').trim();
        const ket = (r.keterangan !== undefined && r.keterangan !== null ? r.keterangan : (r.description || '')).trim();
        return {
          id: r.id,
          teacher_id: r.teacher_id || r.guru_id || '',
          teacher_name: teacherName,
          nip: r.nip || r.teacher_nip || '',
          category_id: r.category_id || r.kategori_id || '',
          category_name: catName,
          keterangan: ket,
          sk_nomor: sk,
          nomor_sk: sk,
          status: (r.status || 'AKTIF').toUpperCase() as 'AKTIF' | 'NONAKTIF',
          whatsapp: r.whatsapp || r.teacher_whatsapp || '',
          created_at: r.created_at || getWIBISOString(),
          updated_at: r.updated_at || getWIBISOString()
        };
      });
      writeJsonFile(TUGAS_GURU_FILE, mapped);
      return mapped;
    }
  } catch (e: any) {
    if (e?.code !== 'ECONNREFUSED' && !String(e?.message || '').includes('ECONNREFUSED')) {
      console.error('Error fetching tugas_tambahan_guru from DB:', e);
    }
  }
  const local = readJsonFile<any[]>(TUGAS_GURU_FILE, []);
  return local.map(r => ({
    id: r.id,
    teacher_id: r.teacher_id || r.guru_id || '',
    teacher_name: r.teacher_name || r.nama_guru || r.name || '',
    nip: r.nip || '',
    category_id: r.category_id || r.kategori_id || '',
    category_name: r.category_name || r.nama_kategori || '',
    keterangan: r.keterangan || r.description || '',
    sk_nomor: r.sk_nomor || r.nomor_sk || '',
    nomor_sk: r.sk_nomor || r.nomor_sk || '',
    status: r.status || 'AKTIF',
    whatsapp: r.whatsapp || '',
    created_at: r.created_at || getWIBISOString(),
    updated_at: r.updated_at || getWIBISOString()
  }));
}

export async function syncTeacherRole(teacherId: string): Promise<string> {
  const teachers = await getAllTeachers();
  const teacher = teachers.find(t => t.id === teacherId);
  const assignments = await getAllTugasGuru();
  const categories = await getAllTugasCategories();
  const teacherAssignments = assignments.filter(a => a.teacher_id === teacherId && a.status === 'AKTIF');

  let targetRole = 'GURU';

  // Check active tugas tambahan first
  for (const assign of teacherAssignments) {
    const cat = categories.find(c => c.id === assign.category_id);
    const catCode = (cat?.code || cat?.kode || '').toUpperCase();
    const catName = ((cat?.name || cat?.nama || assign.category_name || '')).toLowerCase();

    if (catCode === 'WAKA_KURIKULUM' || catName.includes('kurikulum')) {
      targetRole = 'WAKIL_KURIKULUM';
      break;
    } else if (catCode === 'WAKA_KESISWAAN' || catName.includes('kesiswaan')) {
      targetRole = 'WAKIL_KESISWAAN';
      break;
    } else if (catCode === 'GURU_BK' || catName.includes('bk') || catName.includes('konseling')) {
      targetRole = 'GURU_BK';
      break;
    } else if (catCode === 'WAKA_HUMAS' || catName.includes('humas')) {
      targetRole = 'WAKA_HUMAS';
      break;
    } else if (catCode === 'WAKA_SARPRAS' || catName.includes('sarpras') || catName.includes('sarana')) {
      targetRole = 'WAKA_SARPRAS';
      break;
    } else if (catCode === 'KA_KONSENTRASI_KEAHLIAN' || catName.includes('konsentrasi') || catName.includes('program') || catName.includes('keahlian')) {
      targetRole = 'KA_KONSENTRASI_KEAHLIAN';
      break;
    }
  }

  // If no active waka/bk role, check if teacher is a Wali Kelas (has class assigned)
  if (targetRole === 'GURU' && teacher && teacher.class && teacher.class.trim() && teacher.class.trim() !== '-') {
    targetRole = 'WALI_KELAS';
  }

  // Update akun_guru record in DB & local file
  try {
    await safeDbQuery(
      `UPDATE akun_guru 
       SET role = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE teacher_id = $2 OR id = $2`,
      [targetRole, teacherId]
    );
  } catch (e) {}

  const fileAccounts = readJsonFile<TeacherAccountRecord[]>(AKUN_GURU_FILE, []);
  let fileUpdated = false;
  for (const acc of fileAccounts) {
    if (acc.teacher_id === teacherId || acc.id === teacherId) {
      acc.role = targetRole;
      acc.updated_at = new Date().toISOString();
      fileUpdated = true;
    }
  }
  if (fileUpdated) {
    writeJsonFile(AKUN_GURU_FILE, fileAccounts);
  }

  return targetRole;
}

export async function syncAllTeacherRoles(): Promise<void> {
  const teachers = await getAllTeachers();
  for (const t of teachers) {
    await syncTeacherRole(t.id);
  }
}

export async function saveTugasGuru(payload: {
  teacher_id?: string;
  guru_id?: string;
  category_id?: string;
  kategori_id?: string;
  keterangan?: string;
  description?: string;
  sk_nomor?: string;
  nomor_sk?: string;
  status?: 'AKTIF' | 'NONAKTIF';
}): Promise<TugasTambahanGuru> {
  const teacherId = (payload.teacher_id || payload.guru_id || '').trim();
  const categoryId = (payload.category_id || payload.kategori_id || '').trim();
  if (!teacherId) throw new Error('Guru wajib dipilih');
  if (!categoryId) throw new Error('Kategori tugas tambahan wajib dipilih');

  const teachers = await getAllTeachers();
  const teacher = teachers.find(t => t.id === teacherId || t.nip === teacherId);
  if (!teacher) throw new Error('Data guru tidak ditemukan');

  const categories = await getAllTugasCategories();
  const category = categories.find(c => c.id === categoryId);
  if (!category) throw new Error('Kategori tugas tambahan tidak ditemukan');

  const all = await getAllTugasGuru();
  const existing = all.find(item => item.teacher_id === teacher.id && item.category_id === category.id);
  if (existing) {
    throw new Error(`Guru ${teacher.name} sudah memiliki penugasan pada kategori ${category.nama || category.name}`);
  }

  const skNumber = (payload.sk_nomor !== undefined ? payload.sk_nomor : (payload.nomor_sk !== undefined ? payload.nomor_sk : '')).trim();
  const ket = (payload.keterangan !== undefined ? payload.keterangan : (payload.description || '')).trim();
  const status = (payload.status || 'AKTIF').toUpperCase() as 'AKTIF' | 'NONAKTIF';
  const nowIso = getWIBISOString();

  const newItem: TugasTambahanGuru = {
    id: `tg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    teacher_id: teacher.id,
    teacher_name: teacher.name,
    nip: teacher.nip || '',
    category_id: category.id,
    category_name: category.nama || category.name || '',
    keterangan: ket,
    sk_nomor: skNumber,
    nomor_sk: skNumber,
    status: status,
    whatsapp: teacher.whatsapp || '',
    created_at: nowIso,
    updated_at: nowIso
  };

  try {
    const cols = await getTableColumns('tugas_tambahan_guru');
    
    // Siapkan mapping kolom dinamis
    const insertCols: string[] = ['id', 'teacher_id', 'teacher_name', 'nip', 'category_id', 'category_name', 'keterangan', 'sk_nomor', 'status', 'created_at', 'updated_at'];
    const insertVals: any[] = [newItem.id, newItem.teacher_id, newItem.teacher_name, newItem.nip, newItem.category_id, newItem.category_name, newItem.keterangan, newItem.sk_nomor, newItem.status, newItem.created_at, newItem.updated_at];
    
    if (cols.has('guru_id')) { insertCols.push('guru_id'); insertVals.push(newItem.teacher_id); }
    if (cols.has('nama_guru')) { insertCols.push('nama_guru'); insertVals.push(newItem.teacher_name); }
    if (cols.has('kategori_id')) { insertCols.push('kategori_id'); insertVals.push(newItem.category_id); }
    if (cols.has('nama_kategori')) { insertCols.push('nama_kategori'); insertVals.push(newItem.category_name); }
    if (cols.has('nomor_sk')) { insertCols.push('nomor_sk'); insertVals.push(newItem.sk_nomor); }
    if (cols.has('no_sk')) { insertCols.push('no_sk'); insertVals.push(newItem.sk_nomor); }
    if (cols.has('whatsapp')) { insertCols.push('whatsapp'); insertVals.push(newItem.whatsapp); }
    if (cols.has('description')) { insertCols.push('description'); insertVals.push(newItem.keterangan); }

    let finalCols = insertCols;
    let finalVals = insertVals;
    if (cols.size > 0) {
      finalCols = [];
      finalVals = [];
      for (let i = 0; i < insertCols.length; i++) {
        if (cols.has(insertCols[i].toLowerCase())) {
          finalCols.push(insertCols[i]);
          finalVals.push(insertVals[i]);
        }
      }
    }

    const placeholders = finalCols.map((_, i) => `$${i + 1}`).join(', ');
    const query = `INSERT INTO tugas_tambahan_guru (${finalCols.join(', ')}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET updated_at = EXCLUDED.updated_at`;
    await safeDbQuery(query, finalVals);
  } catch (e: any) {
    console.error('Error inserting into tugas_tambahan_guru in safeDbQuery:', e);
    try {
      await safeDbQuery(
        `INSERT INTO tugas_tambahan_guru (id, teacher_id, teacher_name, nip, category_id, category_name, keterangan, sk_nomor, status, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [newItem.id, newItem.teacher_id, newItem.teacher_name, newItem.nip, newItem.category_id, newItem.category_name, newItem.keterangan, newItem.sk_nomor, newItem.status, newItem.created_at, newItem.updated_at]
      );
    } catch (e2) {
      console.error('Fallback query tugas_tambahan_guru failed:', e2);
    }
  }

  const updated = [newItem, ...all];
  writeJsonFile(TUGAS_GURU_FILE, updated);

  // Sync teacher role immediately
  await syncTeacherRole(teacher.id);

  return newItem;
}

export async function updateTugasGuru(id: string, payload: any): Promise<TugasTambahanGuru> {
  const all = await getAllTugasGuru();
  const index = all.findIndex(t => t.id === id);
  if (index === -1) throw new Error('Penugasan tidak ditemukan');

  const current = all[index];
  const catId = payload.category_id || payload.kategori_id || current.category_id;
  let catName = current.category_name;
  if (catId && catId !== current.category_id) {
    const categories = await getAllTugasCategories();
    const cat = categories.find(c => c.id === catId);
    if (cat) catName = cat.nama || cat.name || '';
  }

  const skNumber = (payload.sk_nomor !== undefined ? payload.sk_nomor : (payload.nomor_sk !== undefined ? payload.nomor_sk : current.sk_nomor)).trim();
  const ket = (payload.keterangan !== undefined ? payload.keterangan : (payload.description !== undefined ? payload.description : current.keterangan)).trim();
  const nowIso = getWIBISOString();

  const updatedItem: TugasTambahanGuru = {
    ...current,
    category_id: catId,
    category_name: catName,
    keterangan: ket,
    sk_nomor: skNumber,
    nomor_sk: skNumber,
    status: payload.status || current.status,
    updated_at: nowIso
  };

  try {
    const cols = await getTableColumns('tugas_tambahan_guru');
    const updateSets: string[] = [];
    const updateVals: any[] = [];
    let pIdx = 1;

    if (cols.has('category_id') || cols.size === 0) { updateSets.push(`category_id = $${pIdx++}`); updateVals.push(catId); }
    if (cols.has('kategori_id')) { updateSets.push(`kategori_id = $${pIdx++}`); updateVals.push(catId); }
    if (cols.has('category_name') || cols.size === 0) { updateSets.push(`category_name = $${pIdx++}`); updateVals.push(catName); }
    if (cols.has('nama_kategori')) { updateSets.push(`nama_kategori = $${pIdx++}`); updateVals.push(catName); }
    if (cols.has('keterangan') || cols.size === 0) { updateSets.push(`keterangan = $${pIdx++}`); updateVals.push(ket); }
    if (cols.has('description')) { updateSets.push(`description = $${pIdx++}`); updateVals.push(ket); }
    if (cols.has('sk_nomor') || cols.size === 0) { updateSets.push(`sk_nomor = $${pIdx++}`); updateVals.push(skNumber); }
    if (cols.has('nomor_sk')) { updateSets.push(`nomor_sk = $${pIdx++}`); updateVals.push(skNumber); }
    if (cols.has('no_sk')) { updateSets.push(`no_sk = $${pIdx++}`); updateVals.push(skNumber); }
    if (cols.has('status') || cols.size === 0) { updateSets.push(`status = $${pIdx++}`); updateVals.push(updatedItem.status); }
    if (cols.has('updated_at') || cols.size === 0) { updateSets.push(`updated_at = $${pIdx++}`); updateVals.push(nowIso); }

    updateVals.push(id);
    const query = `UPDATE tugas_tambahan_guru SET ${updateSets.join(', ')} WHERE id = $${pIdx}`;
    await safeDbQuery(query, updateVals);
  } catch (e) {
    try {
      await safeDbQuery(
        `UPDATE tugas_tambahan_guru 
         SET category_id = $1, category_name = $2, keterangan = $3, sk_nomor = $4, status = $5, updated_at = $6 
         WHERE id = $7`,
        [updatedItem.category_id, updatedItem.category_name, updatedItem.keterangan, updatedItem.sk_nomor, updatedItem.status, updatedItem.updated_at, id]
      );
    } catch (e2) {}
  }

  all[index] = updatedItem;
  writeJsonFile(TUGAS_GURU_FILE, all);

  await syncTeacherRole(updatedItem.teacher_id);
  return updatedItem;
}

export async function deleteTugasGuru(id: string): Promise<boolean> {
  const all = await getAllTugasGuru();
  const target = all.find(t => t.id === id);
  const teacherId = target?.teacher_id;

  const filtered = all.filter(t => t.id !== id);
  writeJsonFile(TUGAS_GURU_FILE, filtered);

  try {
    await safeDbQuery('DELETE FROM tugas_tambahan_guru WHERE id = $1', [id]);
  } catch (e) {}

  if (teacherId) {
    await syncTeacherRole(teacherId);
  }

  return true;
}

// --- AKUN USER SISWA ---

export async function getAllStudentAccounts(): Promise<StudentAccountRecord[]> {
  try {
    const res = await pool.query('SELECT * FROM akun_siswa ORDER BY class ASC, name ASC');
    if (res.rows && res.rows.length > 0) {
      writeJsonFile(AKUN_SISWA_FILE, res.rows);
      return res.rows;
    }
  } catch (e) {}
  return readJsonFile<StudentAccountRecord[]>(AKUN_SISWA_FILE, []);
}

export async function saveStudentAccount(data: {
  student_id: string;
  name: string;
  nisn: string;
  nis?: string;
  class?: string;
  username: string;
  password_plain: string;
  status?: 'AKTIF' | 'NONAKTIF';
}): Promise<StudentAccountRecord> {
  const all = await getAllStudentAccounts();
  const username = data.username.trim();
  const passwordPlain = data.password_plain.trim();
  const passwordHash = await bcrypt.hash(passwordPlain, 10);

  const newAcc: StudentAccountRecord = {
    id: `acc-s-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    student_id: data.student_id,
    name: data.name,
    nisn: data.nisn,
    nis: data.nis || '',
    class: data.class || '',
    username,
    password_plain: passwordPlain,
    password_hash: passwordHash,
    status: data.status || 'AKTIF',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    await pool.query(
      `INSERT INTO akun_siswa 
       (id, student_id, name, nisn, nis, class, username, password_plain, password_hash, status, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (username) DO UPDATE SET 
         password_plain = EXCLUDED.password_plain, 
         password_hash = EXCLUDED.password_hash, 
         name = EXCLUDED.name, 
         class = EXCLUDED.class, 
         status = EXCLUDED.status, 
         updated_at = EXCLUDED.updated_at`,
      [newAcc.id, newAcc.student_id, newAcc.name, newAcc.nisn, newAcc.nis, newAcc.class, newAcc.username, newAcc.password_plain, newAcc.password_hash, newAcc.status, newAcc.created_at, newAcc.updated_at]
    );
  } catch (e) {}

  const filtered = all.filter(a => a.student_id !== data.student_id && a.username !== username);
  const updated = [newAcc, ...filtered];
  writeJsonFile(AKUN_SISWA_FILE, updated);
  return newAcc;
}

export async function updateStudentAccount(id: string, data: Partial<StudentAccountRecord>): Promise<StudentAccountRecord> {
  const all = await getAllStudentAccounts();
  const index = all.findIndex(a => a.id === id);
  if (index === -1) throw new Error('Akun siswa tidak ditemukan');

  const current = all[index];
  let passwordPlain = current.password_plain;
  let passwordHash = current.password_hash;

  if (data.password_plain && data.password_plain.trim() !== current.password_plain) {
    passwordPlain = data.password_plain.trim();
    passwordHash = await bcrypt.hash(passwordPlain, 10);
  }

  const updatedAcc: StudentAccountRecord = {
    ...current,
    username: data.username ? data.username.trim() : current.username,
    password_plain: passwordPlain,
    password_hash: passwordHash,
    status: data.status || current.status,
    name: data.name || current.name,
    class: data.class || current.class,
    updated_at: new Date().toISOString()
  };

  try {
    await pool.query(
      `UPDATE akun_siswa 
       SET username = $1, password_plain = $2, password_hash = $3, status = $4, name = $5, class = $6, updated_at = $7 
       WHERE id = $8`,
      [updatedAcc.username, updatedAcc.password_plain, updatedAcc.password_hash, updatedAcc.status, updatedAcc.name, updatedAcc.class, updatedAcc.updated_at, id]
    );
  } catch (e) {}

  all[index] = updatedAcc;
  writeJsonFile(AKUN_SISWA_FILE, all);
  return updatedAcc;
}

export async function deleteStudentAccount(id: string): Promise<boolean> {
  const all = await getAllStudentAccounts();
  const filtered = all.filter(a => a.id !== id);
  writeJsonFile(AKUN_SISWA_FILE, filtered);

  try {
    await pool.query('DELETE FROM akun_siswa WHERE id = $1', [id]);
  } catch (e) {}

  return true;
}

export async function syncStudentAccounts(presetPassword = '@Siswa123'): Promise<{ created: number; updated: number; total: number }> {
  const students = await getAllStudents();
  const existingAccounts = await getAllStudentAccounts();
  const existingMap = new Map<string, StudentAccountRecord>();
  existingAccounts.forEach(a => existingMap.set(a.student_id, a));

  let createdCount = 0;
  let updatedCount = 0;
  const newAccountList: StudentAccountRecord[] = [...existingAccounts];

  for (const s of students) {
    const cleanNisn = (s.nisn || '').trim();
    if (!cleanNisn) continue;

    const existing = existingMap.get(s.id);
    if (!existing) {
      const passwordPlain = presetPassword || '@Siswa123';
      const passwordHash = await bcrypt.hash(passwordPlain, 10);
      const newAcc: StudentAccountRecord = {
        id: `acc-s-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        student_id: s.id,
        name: s.name,
        nisn: cleanNisn,
        nis: s.nis || '',
        class: s.class || '',
        username: cleanNisn,
        password_plain: passwordPlain,
        password_hash: passwordHash,
        status: (s.status as any) === 'NONAKTIF' ? 'NONAKTIF' : 'AKTIF',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      try {
        await pool.query(
          `INSERT INTO akun_siswa 
           (id, student_id, name, nisn, nis, class, username, password_plain, password_hash, status, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (username) DO NOTHING`,
          [newAcc.id, newAcc.student_id, newAcc.name, newAcc.nisn, newAcc.nis, newAcc.class, newAcc.username, newAcc.password_plain, newAcc.password_hash, newAcc.status, newAcc.created_at, newAcc.updated_at]
        );
      } catch (e) {}

      newAccountList.push(newAcc);
      createdCount++;
    } else {
      // Update name/class if synchronized
      if (existing.name !== s.name || existing.class !== s.class || existing.nis !== s.nis) {
        existing.name = s.name;
        existing.class = s.class || '';
        existing.nis = s.nis || '';
        existing.updated_at = new Date().toISOString();
        try {
          await pool.query(
            'UPDATE akun_siswa SET name = $1, class = $2, nis = $3, updated_at = $4 WHERE id = $5',
            [existing.name, existing.class, existing.nis, existing.updated_at, existing.id]
          );
        } catch (e) {}
        updatedCount++;
      }
    }
  }

  writeJsonFile(AKUN_SISWA_FILE, newAccountList);
  return {
    created: createdCount,
    updated: updatedCount,
    total: newAccountList.length
  };
}

export async function massRegenerateStudentPasswords(presetPassword?: string): Promise<number> {
  const accounts = await getAllStudentAccounts();
  const passwordPlain = presetPassword && presetPassword.trim() ? presetPassword.trim() : '@Siswa123';
  const passwordHash = await bcrypt.hash(passwordPlain, 10);
  const now = new Date().toISOString();

  for (const acc of accounts) {
    acc.password_plain = passwordPlain;
    acc.password_hash = passwordHash;
    acc.updated_at = now;
  }

  try {
    await pool.query(
      'UPDATE akun_siswa SET password_plain = $1, password_hash = $2, updated_at = $3',
      [passwordPlain, passwordHash, now]
    );
  } catch (e) {}

  writeJsonFile(AKUN_SISWA_FILE, accounts);
  return accounts.length;
}

export async function regenerateStudentPassword(
  idOrStudentId: string,
  customPassword?: string
): Promise<{ success: boolean; newPasswordPlain?: string; account?: StudentAccountRecord }> {
  const all = await getAllStudentAccounts();
  const target = all.find(a => a.id === idOrStudentId || a.student_id === idOrStudentId);
  if (!target) return { success: false };

  const newPlain = customPassword && customPassword.trim() ? customPassword.trim() : '@Siswa123';
  const newHash = await bcrypt.hash(newPlain, 10);
  target.password_plain = newPlain;
  target.password_hash = newHash;
  target.updated_at = new Date().toISOString();

  try {
    await pool.query(
      'UPDATE akun_siswa SET password_plain = $1, password_hash = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 OR student_id = $3',
      [newPlain, newHash, target.id]
    );
  } catch (e) {}

  writeJsonFile(AKUN_SISWA_FILE, all);
  return { success: true, newPasswordPlain: newPlain, account: target };
}

export async function getSpecialRoleAccounts(): Promise<any[]> {
  const allAccounts = await getAllTeacherAccounts();
  const allTeachers = await getAllTeachers();

  const specialRoles = ['WAKIL_KURIKULUM', 'WAKIL_KESISWAAN', 'GURU_BK'];
  const assigned = allAccounts.filter(a => a.role && specialRoles.includes(a.role));

  return assigned.map(acc => {
    const teacher = allTeachers.find(t => t.id === acc.teacher_id);
    return {
      id: acc.id,
      teacher_id: acc.teacher_id,
      name: acc.name || (teacher ? teacher.name : ''),
      nip: acc.nip || (teacher ? teacher.nip : ''),
      username: acc.username,
      password_plain: acc.password_plain,
      status: acc.status || 'AKTIF',
      role: acc.role,
      subject: (teacher as any)?.subject || (teacher as any)?.mapel || 'Guru',
      class: teacher?.class || ''
    };
  });
}

export async function setTeacherSpecialRole(payload: {
  teacher_id: string;
  role: 'WAKIL_KURIKULUM' | 'WAKIL_KESISWAAN' | 'GURU_BK' | 'GURU';
  username?: string;
  password?: string;
  status?: string;
}): Promise<any> {
  const { teacher_id, role, username, password, status } = payload;
  const allTeachers = await getAllTeachers();
  const teacher = allTeachers.find(t => t.id === teacher_id);
  if (!teacher) throw new Error('Data guru tidak ditemukan');

  const allAccounts = await getAllTeacherAccounts();
  const existingAccount = allAccounts.find(a => a.teacher_id === teacher_id);

  const cleanStatus = status || existingAccount?.status || 'AKTIF';

  if (existingAccount) {
    // Kredensial mengikuti akun guru yang sudah ada di Menu Akun Guru
    const updated = await updateTeacherAccount(existingAccount.id, {
      role: role,
      status: cleanStatus,
      ...(username && username.trim() ? { username: username.trim() } : {}),
      ...(password && password.trim() ? { password_plain: password.trim() } : {})
    });
    return updated;
  } else {
    // Jika belum memiliki akun di tabel akun_guru, buat akun awal berdasarkan NIP/Nama
    const cleanUsername = username?.trim() || (teacher.nip ? teacher.nip.replace(/\s+/g, '') : teacher.name.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const cleanPassword = password?.trim() || (teacher.nip ? teacher.nip.replace(/\s+/g, '') : 'guru1234');
    const created = await saveTeacherAccount({
      teacher_id,
      name: teacher.name,
      nip: teacher.nip || '',
      username: cleanUsername,
      password_plain: cleanPassword,
      role: role,
      status: cleanStatus
    });
    return created;
  }
}

export async function removeTeacherSpecialRole(teacher_id: string): Promise<boolean> {
  const allAccounts = await getAllTeacherAccounts();
  const existingAccount = allAccounts.find(a => a.teacher_id === teacher_id || a.id === teacher_id);
  if (!existingAccount) return false;

  // Remove active tugas tambahan assignments under special roles (Waka Kurikulum, Waka Kesiswaan, Guru BK)
  try {
    const categories = await getAllTugasCategories();
    const specialCatIds = categories
      .filter(c => ['WAKA_KURIKULUM', 'WAKA_KESISWAAN', 'GURU_BK'].includes((c.code || '').toUpperCase()) || 
                   ['kurikulum', 'kesiswaan', 'bk', 'konseling'].some(k => (c.name || '').toLowerCase().includes(k)))
      .map(c => c.id);

    if (specialCatIds.length > 0) {
      await pool.query(
        'DELETE FROM tugas_tambahan_guru WHERE teacher_id = $1 AND category_id = ANY($2::text[])',
        [teacher_id, specialCatIds]
      );
    }
  } catch (e) {}

  // Update local file for tugas_tambahan_guru
  const allTugas = readJsonFile<TugasTambahanGuru[]>(TUGAS_GURU_FILE, []);
  const remainingTugas = allTugas.filter(t => {
    if (t.teacher_id !== teacher_id) return true;
    const catName = (t.category_name || '').toLowerCase();
    return !catName.includes('kurikulum') && !catName.includes('kesiswaan') && !catName.includes('bk') && !catName.includes('konseling');
  });
  writeJsonFile(TUGAS_GURU_FILE, remainingTugas);

  await syncTeacherRole(teacher_id);
  return true;
}

export async function regenerateTeacherPassword(
  idOrTeacherId: string,
  customPassword?: string
): Promise<{
  success: boolean;
  newPasswordPlain?: string;
  chosenPassword?: string;
  allOptions?: string[];
  account?: TeacherAccountRecord;
}> {
  const current = await getAllTeacherAccounts();
  const target = current.find(a => a.id === idOrTeacherId || a.teacher_id === idOrTeacherId);
  if (!target) return { success: false };

  const newPlain = customPassword && customPassword.trim() 
    ? customPassword.trim() 
    : generateRandomPassword();
  let newHash = newPlain;
  try {
    newHash = await bcrypt.hash(newPlain, 10);
  } catch (e) {}

  target.password_plain = newPlain;
  target.password_hash = newHash;
  target.updated_at = new Date().toISOString();

  try {
    await pool.query(`
      UPDATE akun_guru
      SET password_plain = $1, password_hash = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 OR teacher_id = $3
    `, [newPlain, newHash, target.id]);
  } catch (e) {}

  const fileAccounts = readJsonFile<TeacherAccountRecord[]>(AKUN_GURU_FILE, []);
  const fIdx = fileAccounts.findIndex(a => a.id === target.id || a.teacher_id === target.teacher_id);
  if (fIdx >= 0) fileAccounts[fIdx] = target;
  else fileAccounts.push(target);
  writeJsonFile(AKUN_GURU_FILE, fileAccounts);

  return {
    success: true,
    newPasswordPlain: newPlain,
    chosenPassword: newPlain,
    allOptions: PIKET_PASSWORD_OPTIONS,
    account: target
  };
}

export async function deleteTeacherAccount(id: string): Promise<boolean> {
  try {
    await pool.query('DELETE FROM akun_guru WHERE id = $1 OR teacher_id = $1', [id]);
  } catch (e) {}

  const current = readJsonFile<TeacherAccountRecord[]>(AKUN_GURU_FILE, []);
  const filtered = current.filter(a => a.id !== id && a.teacher_id !== id);
  writeJsonFile(AKUN_GURU_FILE, filtered);
  return true;
}

export async function bulkRegenerateTeacherAccounts(customPassword?: string): Promise<{ count: number; chosenPassword: string; accounts: TeacherAccountRecord[] }> {
  const accounts = await getAllTeacherAccounts();
  const updatedAccounts: TeacherAccountRecord[] = [];

  const chosenPlain = customPassword && customPassword.trim() ? customPassword.trim() : generateRandomPassword();
  let chosenHash = chosenPlain;
  try {
    chosenHash = await bcrypt.hash(chosenPlain, 10);
  } catch (e) {}

  for (let i = 0; i < accounts.length; i++) {
    const acc = { ...accounts[i] };
    acc.password_plain = chosenPlain;
    acc.password_hash = chosenHash;
    acc.updated_at = new Date().toISOString();

    try {
      await pool.query(`
        UPDATE akun_guru
        SET password_plain = $1, password_hash = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 OR teacher_id = $3
      `, [chosenPlain, chosenHash, acc.id]);
    } catch (e) {}

    updatedAccounts.push(acc);
  }

  writeJsonFile(AKUN_GURU_FILE, updatedAccounts);
  return { count: updatedAccounts.length, chosenPassword: chosenPlain, accounts: updatedAccounts };
}

export async function toggleTeacherAccountStatus(id: string): Promise<TeacherAccountRecord | null> {
  const current = await getAllTeacherAccounts();
  const target = current.find(a => a.id === id || a.teacher_id === id);
  if (!target) return null;

  const newStatus = target.status === 'AKTIF' ? 'NONAKTIF' : 'AKTIF';
  return updateTeacherAccount(target.id, { status: newStatus });
}

/**
 * Sync all teachers with akun_guru table.
 * Ensures every teacher has an auto-generated account (username from NIP or name, and default/secure password).
 */
export async function syncAllTeacherAccounts(): Promise<{ created: number; updated: number; accounts: TeacherAccountRecord[] }> {
  const teachers = await getAllTeachers();
  const existingAccounts = await getAllTeacherAccounts();
  const accountByTeacherId = new Map<string, TeacherAccountRecord>();
  const usedUsernames = new Set<string>();

  for (const acc of existingAccounts) {
    if (acc.teacher_id) accountByTeacherId.set(acc.teacher_id, acc);
    if (acc.username) usedUsernames.add(acc.username.toLowerCase());
  }

  let created = 0;
  let updated = 0;
  const resultAccounts: TeacherAccountRecord[] = [];

  for (let i = 0; i < teachers.length; i++) {
    const t = teachers[i];
    const existing = accountByTeacherId.get(t.id);
    if (!existing) {
      const username = generateUsernameForTeacher(t.name, t.nip, usedUsernames);
      usedUsernames.add(username.toLowerCase());
      const plainPassword = getNextPiketPassword(i);
      let hash = plainPassword;
      try {
        hash = await bcrypt.hash(plainPassword, 10);
      } catch (e) {}

      const newAcc: TeacherAccountRecord = {
        id: randomUUID(),
        teacher_id: t.id,
        name: t.name,
        nip: t.nip || '',
        username,
        password_plain: plainPassword,
        password_hash: hash,
        status: t.status || 'AKTIF',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await saveTeacherAccount(newAcc);
      resultAccounts.push(newAcc);
      created++;
    } else {
      // Sync name / nip / status if changed
      let needUpdate = false;
      if (existing.name !== t.name || existing.nip !== (t.nip || '') || existing.status !== t.status) {
        existing.name = t.name;
        existing.nip = t.nip || '';
        existing.status = t.status || 'AKTIF';
        needUpdate = true;
      }
      if (needUpdate) {
        await updateTeacherAccount(existing.id, existing);
        updated++;
      }
      resultAccounts.push(existing);
    }
  }

  return { created, updated, accounts: resultAccounts };
}

// =================== MASTER TUGAS / KETERANGAN PIKET ===================

export interface PiketDutyOption {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
}

const MASTER_TUGAS_FILE = path.join(DATA_DIR, 'master_tugas_piket.json');

const initialPiketDuties: PiketDutyOption[] = [
  { id: 'duty-1', name: 'Koordinator Piket', description: 'Memimpin dan mengkoordinasikan kegiatan piket harian' },
  { id: 'duty-2', name: 'Guru Piket (Umum)', description: 'Membantu ketertiban dan presensi siswa umum' },
  { id: 'duty-3', name: 'Guru Piket Gerbang Depan', description: 'Menjaga dan menyambut siswa di pintu gerbang utama' },
  { id: 'duty-4', name: 'Guru Piket Gerbang Belakang', description: 'Memantau akses keluar masuk gerbang belakang' },
  { id: 'duty-5', name: 'Guru Piket Lantai 1', description: 'Pengawasan area kelas dan lorong lantai 1' },
  { id: 'duty-6', name: 'Guru Piket Lantai 2', description: 'Pengawasan area kelas dan lorong lantai 2' },
  { id: 'duty-7', name: 'Guru Piket Pos Satpam', description: 'Koordinasi perizinan dan tamu di pos keamanan' },
  { id: 'duty-8', name: 'Guru Piket Ruang BK', description: 'Penanganan siswa terlambat dan konseling' }
];

export async function getAllPiketDuties(): Promise<PiketDutyOption[]> {
  try {
    const res = await pool.query('SELECT * FROM master_tugas_piket ORDER BY name ASC');
    if (res.rows.length > 0) {
      return res.rows.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description || '',
        created_at: r.created_at || ''
      }));
    }
  } catch (e) {}

  return readJsonFile<PiketDutyOption[]>(MASTER_TUGAS_FILE, initialPiketDuties);
}

export async function savePiketDuty(duty: Partial<PiketDutyOption>): Promise<PiketDutyOption> {
  const newDuty: PiketDutyOption = {
    id: duty.id || randomUUID(),
    name: (duty.name || '').trim(),
    description: duty.description || '',
    created_at: duty.created_at || new Date().toISOString()
  };

  try {
    await pool.query(`
      INSERT INTO master_tugas_piket (id, name, description, created_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description
    `, [newDuty.id, newDuty.name, newDuty.description, newDuty.created_at]);
  } catch (e) {}

  const current = readJsonFile<PiketDutyOption[]>(MASTER_TUGAS_FILE, initialPiketDuties);
  const idx = current.findIndex(d => d.id === newDuty.id || d.name.toLowerCase() === newDuty.name.toLowerCase());
  if (idx >= 0) current[idx] = newDuty;
  else current.push(newDuty);
  writeJsonFile(MASTER_TUGAS_FILE, current);
  return newDuty;
}

export async function updatePiketDuty(id: string, data: Partial<PiketDutyOption>): Promise<PiketDutyOption | null> {
  const current = await getAllPiketDuties();
  const target = current.find(d => d.id === id);
  if (!target) return null;

  const oldName = target.name;
  const newName = data.name !== undefined ? data.name.trim() : target.name;

  const updated: PiketDutyOption = {
    ...target,
    name: newName,
    description: data.description !== undefined ? data.description : target.description
  };

  try {
    await pool.query(`
      UPDATE master_tugas_piket
      SET name = $1, description = $2
      WHERE id = $3
    `, [updated.name, updated.description, target.id]);

    if (oldName && oldName !== newName) {
      await pool.query('UPDATE jadwal_piket SET keterangan = $1 WHERE keterangan = $2', [newName, oldName]);
    }
  } catch (e) {}

  const fileDuties = readJsonFile<PiketDutyOption[]>(MASTER_TUGAS_FILE, initialPiketDuties);
  const fIdx = fileDuties.findIndex(d => d.id === target.id);
  if (fIdx >= 0) fileDuties[fIdx] = updated;
  else fileDuties.push(updated);
  writeJsonFile(MASTER_TUGAS_FILE, fileDuties);

  // Sync in-file schedule if name changed
  if (oldName && oldName !== newName) {
    const fileScheds = readJsonFile<PiketScheduleRecord[]>(JADWAL_PIKET_FILE, initialPiketSchedule);
    let changed = false;
    for (const s of fileScheds) {
      if (s.keterangan === oldName) {
        s.keterangan = newName;
        changed = true;
      }
    }
    if (changed) writeJsonFile(JADWAL_PIKET_FILE, fileScheds);
  }

  return updated;
}

export async function deletePiketDuty(id: string): Promise<boolean> {
  try {
    await pool.query('DELETE FROM master_tugas_piket WHERE id = $1', [id]);
  } catch (e) {}

  const current = readJsonFile<PiketDutyOption[]>(MASTER_TUGAS_FILE, initialPiketDuties);
  const filtered = current.filter(d => d.id !== id);
  writeJsonFile(MASTER_TUGAS_FILE, filtered);
  return true;
}

// =================== JADWAL PIKET (PIKET SCHEDULE) ===================

const initialPiketSchedule: PiketScheduleRecord[] = [
  { id: 'pik-1', day_name: 'Senin', day_index: 1, teacher_id: 't-1', teacher_name: 'Budi Santoso, S.Kom', nip: '198001012005011001', keterangan: 'Koordinator Piket' },
  { id: 'pik-2', day_name: 'Senin', day_index: 1, teacher_id: 't-2', teacher_name: 'Siti Rahmawati, M.Kom', nip: '198502022008012002', keterangan: 'Guru Piket Gerbang Depan' },
  { id: 'pik-3', day_name: 'Selasa', day_index: 2, teacher_id: 't-3', teacher_name: 'Ahmad Fauzi, S.Pd', nip: '197903032003011003', keterangan: 'Koordinator Piket' },
  { id: 'pik-4', day_name: 'Rabu', day_index: 3, teacher_id: 't-4', teacher_name: 'Dewi Lestari, S.Pd', nip: '198804042010012004', keterangan: 'Koordinator Piket' },
  { id: 'pik-5', day_name: 'Kamis', day_index: 4, teacher_id: 't-5', teacher_name: 'Eko Prasetyo, M.T', nip: '198205052006011005', keterangan: 'Koordinator Piket' },
  { id: 'pik-6', day_name: 'Jumat', day_index: 5, teacher_id: 't-6', teacher_name: 'Fitri Handayani, S.Pd', nip: '199006062014012006', keterangan: 'Koordinator Piket' }
];

export async function getAllPiketSchedule(): Promise<PiketScheduleRecord[]> {
  try {
    const res = await pool.query(`
      SELECT j.*, t.name as current_teacher_name, t.nip as current_teacher_nip
      FROM jadwal_piket j
      LEFT JOIN teachers t ON j.teacher_id = t.id
      ORDER BY j.day_index ASC, j.created_at ASC
    `);
    if (res.rows.length > 0) {
      return res.rows.map(r => ({
        id: r.id,
        day_name: r.day_name,
        day_index: Number(r.day_index),
        teacher_id: r.teacher_id,
        teacher_name: r.current_teacher_name || r.teacher_name,
        nip: r.current_teacher_nip !== undefined ? r.current_teacher_nip : (r.nip || ''),
        keterangan: r.keterangan || 'Guru Piket',
        created_at: r.created_at || ''
      }));
    }
  } catch (e) {}

  return readJsonFile<PiketScheduleRecord[]>(JADWAL_PIKET_FILE, initialPiketSchedule);
}

export async function savePiketSchedule(sched: Partial<PiketScheduleRecord>): Promise<PiketScheduleRecord> {
  const dayIndexMap: Record<string, number> = {
    'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6, 'Minggu': 7
  };

  const dayName = sched.day_name || 'Senin';
  const dayIndex = sched.day_index || dayIndexMap[dayName] || 1;

  const newSched: PiketScheduleRecord = {
    id: sched.id || randomUUID(),
    day_name: dayName,
    day_index: dayIndex,
    teacher_id: sched.teacher_id || '',
    teacher_name: sched.teacher_name || '',
    nip: sched.nip || '',
    keterangan: sched.keterangan || 'Guru Piket',
    created_at: sched.created_at || new Date().toISOString()
  };

  try {
    await pool.query(`
      INSERT INTO jadwal_piket (id, day_name, day_index, teacher_id, teacher_name, nip, keterangan, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        day_name = EXCLUDED.day_name,
        day_index = EXCLUDED.day_index,
        teacher_id = EXCLUDED.teacher_id,
        teacher_name = EXCLUDED.teacher_name,
        nip = EXCLUDED.nip,
        keterangan = EXCLUDED.keterangan
    `, [
      newSched.id, newSched.day_name, newSched.day_index, newSched.teacher_id,
      newSched.teacher_name, newSched.nip, newSched.keterangan, newSched.created_at
    ]);
  } catch (e) {}

  const current = readJsonFile<PiketScheduleRecord[]>(JADWAL_PIKET_FILE, initialPiketSchedule);
  const idx = current.findIndex(s => s.id === newSched.id);
  if (idx >= 0) current[idx] = newSched;
  else current.push(newSched);
  writeJsonFile(JADWAL_PIKET_FILE, current);
  return newSched;
}

export async function updatePiketSchedule(id: string, data: Partial<PiketScheduleRecord>): Promise<PiketScheduleRecord | null> {
  const current = await getAllPiketSchedule();
  const target = current.find(s => s.id === id);
  if (!target) return null;

  const dayIndexMap: Record<string, number> = {
    'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6, 'Minggu': 7
  };

  const dayName = data.day_name || target.day_name;
  const dayIndex = data.day_index || dayIndexMap[dayName] || target.day_index;

  const updated: PiketScheduleRecord = {
    ...target,
    day_name: dayName,
    day_index: dayIndex,
    teacher_id: data.teacher_id !== undefined ? data.teacher_id : target.teacher_id,
    teacher_name: data.teacher_name !== undefined ? data.teacher_name : target.teacher_name,
    nip: data.nip !== undefined ? data.nip : target.nip,
    keterangan: data.keterangan !== undefined ? data.keterangan : target.keterangan
  };

  try {
    await pool.query(`
      UPDATE jadwal_piket
      SET day_name = $1, day_index = $2, teacher_id = $3, teacher_name = $4, nip = $5, keterangan = $6
      WHERE id = $7
    `, [updated.day_name, updated.day_index, updated.teacher_id, updated.teacher_name, updated.nip, updated.keterangan, target.id]);
  } catch (e) {}

  const fileScheds = readJsonFile<PiketScheduleRecord[]>(JADWAL_PIKET_FILE, initialPiketSchedule);
  const fIdx = fileScheds.findIndex(s => s.id === target.id);
  if (fIdx >= 0) fileScheds[fIdx] = updated;
  else fileScheds.push(updated);
  writeJsonFile(JADWAL_PIKET_FILE, fileScheds);
  return updated;
}

export async function deletePiketSchedule(id: string): Promise<boolean> {
  try {
    await pool.query('DELETE FROM jadwal_piket WHERE id = $1', [id]);
  } catch (e) {}

  const current = readJsonFile<PiketScheduleRecord[]>(JADWAL_PIKET_FILE, initialPiketSchedule);
  const filtered = current.filter(s => s.id !== id);
  writeJsonFile(JADWAL_PIKET_FILE, filtered);
  return true;
}

export async function getPiketScheduleByDay(dayName: string): Promise<PiketScheduleRecord[]> {
  const all = await getAllPiketSchedule();
  return all.filter(s => s.day_name.toLowerCase() === dayName.toLowerCase());
}

// ==========================================
// KBM CATEGORIES & SCHEDULES
// ==========================================

export const initialKbmCategories: KbmCategory[] = [
  { id: 'cat_upacara', name: 'Upacara', color: '#ef4444', is_teaching: false, description: 'Upacara bendera / apel kebangsaan' },
  { id: 'cat_apel', name: 'Apel', color: '#10b981', is_teaching: false, description: 'Apel pagi & pembiasaan' },
  { id: 'cat_kbm', name: 'KBM', color: '#2563eb', is_teaching: true, description: 'Kegiatan Belajar Mengajar tatap muka' },
  { id: 'cat_istirahat', name: 'Istirahat', color: '#f59e0b', is_teaching: false, description: 'Istirahat & waktu ibadah' },
];

export const initialKbmSchedules: KbmDaySchedule[] = [
  {
    day_index: 1,
    day_name: 'Senin',
    is_active: true,
    periods: [
      { jp_number: 0, is_teaching: false, name: 'Upacara Bendera', start_time: '07:00', end_time: '07:45', category_id: 'cat_upacara', category_name: 'Upacara' },
      { jp_number: 1, is_teaching: true, start_time: '07:45', end_time: '08:30', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 2, is_teaching: true, start_time: '08:30', end_time: '09:15', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 3, is_teaching: true, start_time: '09:15', end_time: '10:00', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 0, is_teaching: false, name: 'Istirahat 1', start_time: '10:00', end_time: '10:30', category_id: 'cat_istirahat', category_name: 'Istirahat' },
      { jp_number: 4, is_teaching: true, start_time: '10:30', end_time: '11:15', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 5, is_teaching: true, start_time: '11:15', end_time: '12:00', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 0, is_teaching: false, name: 'Istirahat 2 / Sholat Dhuhur', start_time: '12:00', end_time: '12:45', category_id: 'cat_istirahat', category_name: 'Istirahat' },
      { jp_number: 6, is_teaching: true, start_time: '12:45', end_time: '13:30', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 7, is_teaching: true, start_time: '13:30', end_time: '14:15', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 8, is_teaching: true, start_time: '14:15', end_time: '15:00', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 9, is_teaching: true, start_time: '15:00', end_time: '15:45', category_id: 'cat_kbm', category_name: 'KBM' },
    ]
  },
  {
    day_index: 2,
    day_name: 'Selasa',
    is_active: true,
    periods: [
      { jp_number: 0, is_teaching: false, name: 'Apel Pagi / Pembiasaan', start_time: '07:00', end_time: '07:45', category_id: 'cat_apel', category_name: 'Apel' },
      { jp_number: 1, is_teaching: true, start_time: '07:45', end_time: '08:30', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 2, is_teaching: true, start_time: '08:30', end_time: '09:15', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 3, is_teaching: true, start_time: '09:15', end_time: '10:00', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 0, is_teaching: false, name: 'Istirahat 1', start_time: '10:00', end_time: '10:30', category_id: 'cat_istirahat', category_name: 'Istirahat' },
      { jp_number: 4, is_teaching: true, start_time: '10:30', end_time: '11:15', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 5, is_teaching: true, start_time: '11:15', end_time: '12:00', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 0, is_teaching: false, name: 'Istirahat 2 / Sholat Dhuhur', start_time: '12:00', end_time: '12:45', category_id: 'cat_istirahat', category_name: 'Istirahat' },
      { jp_number: 6, is_teaching: true, start_time: '12:45', end_time: '13:30', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 7, is_teaching: true, start_time: '13:30', end_time: '14:15', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 8, is_teaching: true, start_time: '14:15', end_time: '15:00', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 9, is_teaching: true, start_time: '15:00', end_time: '15:45', category_id: 'cat_kbm', category_name: 'KBM' },
    ]
  },
  {
    day_index: 3,
    day_name: 'Rabu',
    is_active: true,
    periods: [
      { jp_number: 0, is_teaching: false, name: 'Apel Pagi / Pembiasaan', start_time: '07:00', end_time: '07:45', category_id: 'cat_apel', category_name: 'Apel' },
      { jp_number: 1, is_teaching: true, start_time: '07:45', end_time: '08:30', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 2, is_teaching: true, start_time: '08:30', end_time: '09:15', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 3, is_teaching: true, start_time: '09:15', end_time: '10:00', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 0, is_teaching: false, name: 'Istirahat 1', start_time: '10:00', end_time: '10:30', category_id: 'cat_istirahat', category_name: 'Istirahat' },
      { jp_number: 4, is_teaching: true, start_time: '10:30', end_time: '11:15', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 5, is_teaching: true, start_time: '11:15', end_time: '12:00', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 0, is_teaching: false, name: 'Istirahat 2 / Sholat Dhuhur', start_time: '12:00', end_time: '12:45', category_id: 'cat_istirahat', category_name: 'Istirahat' },
      { jp_number: 6, is_teaching: true, start_time: '12:45', end_time: '13:30', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 7, is_teaching: true, start_time: '13:30', end_time: '14:15', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 8, is_teaching: true, start_time: '14:15', end_time: '15:00', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 9, is_teaching: true, start_time: '15:00', end_time: '15:45', category_id: 'cat_kbm', category_name: 'KBM' },
    ]
  },
  {
    day_index: 4,
    day_name: 'Kamis',
    is_active: true,
    periods: [
      { jp_number: 0, is_teaching: false, name: 'Apel Pagi / Literasi', start_time: '07:00', end_time: '07:45', category_id: 'cat_apel', category_name: 'Apel' },
      { jp_number: 1, is_teaching: true, start_time: '07:45', end_time: '08:30', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 2, is_teaching: true, start_time: '08:30', end_time: '09:15', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 3, is_teaching: true, start_time: '09:15', end_time: '10:00', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 0, is_teaching: false, name: 'Istirahat 1', start_time: '10:00', end_time: '10:30', category_id: 'cat_istirahat', category_name: 'Istirahat' },
      { jp_number: 4, is_teaching: true, start_time: '10:30', end_time: '11:15', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 5, is_teaching: true, start_time: '11:15', end_time: '12:00', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 0, is_teaching: false, name: 'Istirahat 2 / Sholat Dhuhur', start_time: '12:00', end_time: '12:45', category_id: 'cat_istirahat', category_name: 'Istirahat' },
      { jp_number: 6, is_teaching: true, start_time: '12:45', end_time: '13:30', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 7, is_teaching: true, start_time: '13:30', end_time: '14:15', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 8, is_teaching: true, start_time: '14:15', end_time: '15:00', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 9, is_teaching: true, start_time: '15:00', end_time: '15:45', category_id: 'cat_kbm', category_name: 'KBM' },
    ]
  },
  {
    day_index: 5,
    day_name: 'Jumat',
    is_active: true,
    periods: [
      { jp_number: 1, is_teaching: true, start_time: '07:00', end_time: '07:45', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 2, is_teaching: true, start_time: '07:45', end_time: '08:30', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 3, is_teaching: true, start_time: '08:30', end_time: '09:15', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 0, is_teaching: false, name: 'Istirahat', start_time: '09:15', end_time: '09:45', category_id: 'cat_istirahat', category_name: 'Istirahat' },
      { jp_number: 4, is_teaching: true, start_time: '09:45', end_time: '10:30', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 5, is_teaching: true, start_time: '10:30', end_time: '11:15', category_id: 'cat_kbm', category_name: 'KBM' },
    ]
  },
  {
    day_index: 6,
    day_name: 'Sabtu',
    is_active: true,
    periods: [
      { jp_number: 1, is_teaching: true, start_time: '07:00', end_time: '07:45', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 2, is_teaching: true, start_time: '07:45', end_time: '08:30', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 3, is_teaching: true, start_time: '08:30', end_time: '09:15', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 0, is_teaching: false, name: 'Istirahat', start_time: '09:15', end_time: '09:45', category_id: 'cat_istirahat', category_name: 'Istirahat' },
      { jp_number: 4, is_teaching: true, start_time: '09:45', end_time: '10:30', category_id: 'cat_kbm', category_name: 'KBM' },
      { jp_number: 5, is_teaching: true, start_time: '10:30', end_time: '11:15', category_id: 'cat_kbm', category_name: 'KBM' },
    ]
  }
];

export async function getAllKbmCategories(): Promise<KbmCategory[]> {
  try {
    const res = await pool.query('SELECT * FROM kbm_categories ORDER BY created_at ASC');
    if (res.rows && res.rows.length > 0) {
      return res.rows.map(r => ({
        id: r.id,
        name: r.name,
        color: r.color || '#2563eb',
        is_teaching: r.is_teaching ?? true,
        description: r.description || ''
      }));
    }
  } catch (e) {}

  const fileCats = readJsonFile<KbmCategory[]>(KBM_CATEGORIES_FILE, initialKbmCategories);
  if (!fs.existsSync(KBM_CATEGORIES_FILE)) {
    writeJsonFile(KBM_CATEGORIES_FILE, initialKbmCategories);
  }
  return fileCats;
}

export async function saveKbmCategory(cat: Partial<KbmCategory>): Promise<KbmCategory> {
  const newCat: KbmCategory = {
    id: cat.id || `cat_${randomUUID().slice(0, 8)}`,
    name: (cat.name || '').trim(),
    color: cat.color || '#2563eb',
    is_teaching: cat.is_teaching ?? true,
    description: cat.description || ''
  };

  try {
    await pool.query(`
      INSERT INTO kbm_categories (id, name, color, is_teaching, description)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET name = $2, color = $3, is_teaching = $4, description = $5
    `, [newCat.id, newCat.name, newCat.color, newCat.is_teaching, newCat.description]);
  } catch (e) {}

  const current = await getAllKbmCategories();
  const idx = current.findIndex(c => c.id === newCat.id);
  if (idx >= 0) current[idx] = newCat;
  else current.push(newCat);
  writeJsonFile(KBM_CATEGORIES_FILE, current);
  return newCat;
}

export async function updateKbmCategory(id: string, data: Partial<KbmCategory>): Promise<KbmCategory | null> {
  const current = await getAllKbmCategories();
  const target = current.find(c => c.id === id);
  if (!target) return null;

  const updated: KbmCategory = {
    ...target,
    ...data,
    id: target.id
  };

  try {
    await pool.query(`
      UPDATE kbm_categories
      SET name = $1, color = $2, is_teaching = $3, description = $4
      WHERE id = $5
    `, [updated.name, updated.color, updated.is_teaching, updated.description, id]);
  } catch (e) {}

  const idx = current.findIndex(c => c.id === id);
  if (idx >= 0) current[idx] = updated;
  writeJsonFile(KBM_CATEGORIES_FILE, current);
  return updated;
}

export async function deleteKbmCategory(id: string): Promise<boolean> {
  try {
    await pool.query('DELETE FROM kbm_categories WHERE id = $1', [id]);
  } catch (e) {}

  const current = await getAllKbmCategories();
  const filtered = current.filter(c => c.id !== id);
  writeJsonFile(KBM_CATEGORIES_FILE, filtered);
  return true;
}

// Schedules
export async function getAllKbmSchedules(): Promise<KbmDaySchedule[]> {
  try {
    const res = await pool.query('SELECT * FROM kbm_schedules ORDER BY day_index ASC');
    if (res.rows && res.rows.length > 0) {
      return res.rows.map(r => ({
        day_index: r.day_index,
        day_name: r.day_name,
        is_active: r.is_active ?? true,
        periods: typeof r.periods === 'string' ? JSON.parse(r.periods) : (r.periods || [])
      }));
    }
  } catch (e) {}

  const fileScheds = readJsonFile<KbmDaySchedule[]>(KBM_SCHEDULES_FILE, initialKbmSchedules);
  if (!fs.existsSync(KBM_SCHEDULES_FILE)) {
    writeJsonFile(KBM_SCHEDULES_FILE, initialKbmSchedules);
  }
  return fileScheds;
}

export async function saveKbmDaySchedule(sched: KbmDaySchedule): Promise<KbmDaySchedule> {
  try {
    const id = `sched_day_${sched.day_index}`;
    await pool.query(`
      INSERT INTO kbm_schedules (id, day_name, day_index, is_active, periods)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET day_name = $2, day_index = $3, is_active = $4, periods = $5, updated_at = CURRENT_TIMESTAMP
    `, [id, sched.day_name, sched.day_index, sched.is_active, JSON.stringify(sched.periods || [])]);
  } catch (e) {}

  const current = await getAllKbmSchedules();
  const idx = current.findIndex(s => s.day_index === sched.day_index);
  if (idx >= 0) current[idx] = sched;
  else current.push(sched);
  writeJsonFile(KBM_SCHEDULES_FILE, current);
  return sched;
}

export async function clearKbmDaySchedule(dayIndex: number): Promise<KbmDaySchedule | null> {
  const dayNames = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const dayName = dayNames[dayIndex] || `Hari ${dayIndex}`;
  const cleared: KbmDaySchedule = {
    day_index: dayIndex,
    day_name: dayName,
    is_active: true,
    periods: []
  };

  try {
    const id = `sched_day_${dayIndex}`;
    await pool.query(`
      INSERT INTO kbm_schedules (id, day_name, day_index, is_active, periods)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET is_active = $4, periods = $5, updated_at = CURRENT_TIMESTAMP
    `, [id, dayName, dayIndex, true, JSON.stringify([])]);
  } catch (e) {}

  const current = await getAllKbmSchedules();
  const idx = current.findIndex(s => s.day_index === dayIndex);
  if (idx >= 0) current[idx] = cleared;
  else current.push(cleared);
  writeJsonFile(KBM_SCHEDULES_FILE, current);
  return cleared;
}

export async function saveAllKbmSchedules(schedules: KbmDaySchedule[]): Promise<boolean> {
  for (const s of schedules) {
    await saveKbmDaySchedule(s);
  }
  return true;
}

export async function getKbmScheduleByDay(dayName: string): Promise<KbmDaySchedule | null> {
  const all = await getAllKbmSchedules();
  return all.find(s => s.day_name.toLowerCase() === dayName.toLowerCase()) || null;
}

// ==========================================
// ATURAN KEHADIRAN GURU
// ==========================================

export const initialAttendanceRule: AttendanceRule = {
  school_latitude: -6.2088,
  school_longitude: 106.8456,
  school_location_name: 'SMK Kampus Utama',
  max_distance_meters: 100,
  min_student_verification: 2,
  allow_manual_verification: false,
  updated_at: new Date().toISOString()
};

export async function getAttendanceRules(): Promise<AttendanceRule> {
  try {
    const res = await pool.query('SELECT * FROM aturan_kehadiran_guru LIMIT 1');
    if (res.rows && res.rows.length > 0) {
      const r = res.rows[0];
      return {
        id: r.id,
        school_latitude: parseFloat(r.school_latitude) || -6.2088,
        school_longitude: parseFloat(r.school_longitude) || 106.8456,
        school_location_name: r.school_location_name || 'SMK Kampus Utama',
        max_distance_meters: parseInt(r.max_distance_meters) || 100,
        min_student_verification: parseInt(r.min_student_verification) || 2,
        allow_manual_verification: !!r.allow_manual_verification,
        updated_at: r.updated_at
      };
    }
  } catch (e) {}

  const fileRules = readJsonFile<AttendanceRule>(ATURAN_KEHADIRAN_FILE, initialAttendanceRule);
  if (!fs.existsSync(ATURAN_KEHADIRAN_FILE)) {
    writeJsonFile(ATURAN_KEHADIRAN_FILE, initialAttendanceRule);
  }
  return fileRules;
}

export async function saveAttendanceRules(rules: Partial<AttendanceRule>): Promise<AttendanceRule> {
  const current = await getAttendanceRules();
  const updated: AttendanceRule = {
    ...current,
    ...rules,
    id: current.id || 'rule_main',
    updated_at: new Date().toISOString()
  };

  try {
    await pool.query(`
      INSERT INTO aturan_kehadiran_guru (id, school_latitude, school_longitude, school_location_name, max_distance_meters, min_student_verification, allow_manual_verification, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        school_latitude = $2,
        school_longitude = $3,
        school_location_name = $4,
        max_distance_meters = $5,
        min_student_verification = $6,
        allow_manual_verification = $7,
        updated_at = CURRENT_TIMESTAMP
    `, [
      updated.id,
      updated.school_latitude,
      updated.school_longitude,
      updated.school_location_name,
      updated.max_distance_meters,
      updated.min_student_verification,
      updated.allow_manual_verification
    ]);
  } catch (e) {}

  writeJsonFile(ATURAN_KEHADIRAN_FILE, updated);
  return updated;
}

// ==========================================
// BEBAS KEHADIRAN (HARI LIBUR & KHUSUS)
// ==========================================

export async function getAllFreeAttendance(): Promise<FreeAttendanceDay[]> {
  try {
    const res = await pool.query('SELECT * FROM bebas_kehadiran ORDER BY start_date ASC');
    if (res.rows && res.rows.length > 0) {
      return res.rows.map(r => ({
        id: r.id,
        start_date: r.start_date,
        end_date: r.end_date,
        name: r.name,
        type: r.type || 'sekolah',
        description: r.description || '',
        rombel_scope: r.rombel_scope ? (r.rombel_scope.startsWith('[') ? JSON.parse(r.rombel_scope) : r.rombel_scope) : 'all',
        created_at: r.created_at
      }));
    }
  } catch (e) {}

  let fileList = readJsonFile<FreeAttendanceDay[]>(BEBAS_KEHADIRAN_FILE, []);
  if (!fileList || fileList.length === 0) {
    fileList = [...DEFAULT_NATIONAL_HOLIDAYS];
    writeJsonFile(BEBAS_KEHADIRAN_FILE, fileList);
  }
  return fileList;
}

export async function saveFreeAttendance(item: Partial<FreeAttendanceDay>): Promise<FreeAttendanceDay> {
  const newItem: FreeAttendanceDay = {
    id: item.id || `free_${randomUUID().slice(0, 8)}`,
    start_date: item.start_date || new Date().toISOString().split('T')[0],
    end_date: item.end_date || item.start_date || new Date().toISOString().split('T')[0],
    name: (item.name || '').trim(),
    type: item.type || 'sekolah',
    description: item.description || '',
    rombel_scope: item.rombel_scope || 'all',
    created_at: new Date().toISOString()
  };

  try {
    const scopeStr = typeof newItem.rombel_scope === 'object' ? JSON.stringify(newItem.rombel_scope) : newItem.rombel_scope;
    await pool.query(`
      INSERT INTO bebas_kehadiran (id, start_date, end_date, name, type, description, rombel_scope)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        start_date = $2, end_date = $3, name = $4, type = $5, description = $6, rombel_scope = $7
    `, [newItem.id, newItem.start_date, newItem.end_date, newItem.name, newItem.type, newItem.description, scopeStr]);
  } catch (e) {}

  const current = await getAllFreeAttendance();
  const idx = current.findIndex(f => f.id === newItem.id);
  if (idx >= 0) current[idx] = newItem;
  else current.push(newItem);
  writeJsonFile(BEBAS_KEHADIRAN_FILE, current);
  return newItem;
}

export async function updateFreeAttendance(id: string, data: Partial<FreeAttendanceDay>): Promise<FreeAttendanceDay | null> {
  const current = await getAllFreeAttendance();
  const target = current.find(f => f.id === id);
  if (!target) return null;

  const updated: FreeAttendanceDay = {
    ...target,
    ...data,
    id: target.id
  };

  try {
    const scopeStr = typeof updated.rombel_scope === 'object' ? JSON.stringify(updated.rombel_scope) : updated.rombel_scope;
    await pool.query(`
      UPDATE bebas_kehadiran
      SET start_date = $1, end_date = $2, name = $3, type = $4, description = $5, rombel_scope = $6
      WHERE id = $7
    `, [updated.start_date, updated.end_date, updated.name, updated.type, updated.description, scopeStr, id]);
  } catch (e) {}

  const idx = current.findIndex(f => f.id === id);
  if (idx >= 0) current[idx] = updated;
  writeJsonFile(BEBAS_KEHADIRAN_FILE, current);
  return updated;
}

export async function deleteFreeAttendance(id: string): Promise<boolean> {
  try {
    await pool.query('DELETE FROM bebas_kehadiran WHERE id = $1', [id]);
  } catch (e) {}

  const current = await getAllFreeAttendance();
  const filtered = current.filter(f => f.id !== id);
  writeJsonFile(BEBAS_KEHADIRAN_FILE, filtered);
  return true;
}

export async function syncNationalHolidays(): Promise<{ count: number; holidays: FreeAttendanceDay[] }> {
  const current = await getAllFreeAttendance();
  let addedCount = 0;

  for (const defHol of DEFAULT_NATIONAL_HOLIDAYS) {
    const exists = current.some(c => c.start_date === defHol.start_date && c.name.toLowerCase() === defHol.name.toLowerCase());
    if (!exists) {
      current.push(defHol);
      addedCount++;
      try {
        await pool.query(`
          INSERT INTO bebas_kehadiran (id, start_date, end_date, name, type, description, rombel_scope)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO NOTHING
        `, [defHol.id, defHol.start_date, defHol.end_date, defHol.name, defHol.type, defHol.description, 'all']);
      } catch (e) {}
    }
  }

  writeJsonFile(BEBAS_KEHADIRAN_FILE, current);
  return { count: addedCount, holidays: current };
}

export async function checkDateFreeAttendance(dateStr: string, className?: string): Promise<{ isFree: boolean; detail: FreeAttendanceDay | null }> {
  const list = await getAllFreeAttendance();
  for (const item of list) {
    if (item.start_date <= dateStr && dateStr <= item.end_date) {
      if (item.rombel_scope === 'all') {
        return { isFree: true, detail: item };
      }
      if (className && Array.isArray(item.rombel_scope) && item.rombel_scope.includes(className)) {
        return { isFree: true, detail: item };
      }
    }
  }
  return { isFree: false, detail: null };
}

// ==========================================
// KEHADIRAN KBM GURU (REALTIME & REKAP)
// ==========================================

export async function recordTeacherKbmAttendance(attendance: Partial<TeacherKbmAttendance>): Promise<TeacherKbmAttendance> {
  // 1. Anti Fake-GPS check
  if (attendance.is_mocked || attendance.location_status === 'FAKE_GPS_DETECTED') {
    throw new Error('Presensi KBM ditolak: Terdeteksi penggunaan Fake GPS atau manipulasi lokasi pada perangkat.');
  }

  const jpList = attendance.jp_list || (attendance.jp_start && attendance.jp_end ? Array.from({ length: attendance.jp_end - attendance.jp_start + 1 }, (_, i) => (attendance.jp_start! + i)) : [1]);
  const minJp = Math.min(...jpList);
  const maxJp = Math.max(...jpList);
  const targetDate = attendance.date || getWIBDateString();
  const targetRombel = attendance.rombel_id || '';

  // 2. Prevent Overwriting JP of another teacher in the same class and day
  const existingList = await getAllTeacherKbmAttendance({
    date: targetDate,
    rombel_id: targetRombel
  });
  const conflict = existingList.find(a =>
    a.id !== attendance.id &&
    (a.jp_list || []).some(jp => jpList.includes(jp))
  );

  if (conflict) {
    const overlap = (conflict.jp_list || []).filter(jp => jpList.includes(jp));
    throw new Error(`Jam Pelajaran (JP) ${overlap.join(', ')} untuk kelas ${targetRombel} pada tanggal ini sudah diisi oleh Guru ${conflict.teacher_name} (${conflict.subject}). Guru tidak dapat menimpa JP yang telah terisi.`);
  }

  // Deduplicate verified students strictly by student_id, nisn, and name
  const seenStudentIds = new Set<string>();
  const seenNisns = new Set<string>();
  const seenNames = new Set<string>();
  const uniqueStudents = (attendance.verified_students || []).filter(s => {
    const sid = s.student_id ? String(s.student_id).trim().toLowerCase() : '';
    const snisn = s.nisn ? String(s.nisn).trim().toLowerCase() : '';
    const sname = (s.name || s.student_name) ? String(s.name || s.student_name).trim().toLowerCase() : '';

    if (sid && seenStudentIds.has(sid)) return false;
    if (snisn && seenNisns.has(snisn)) return false;
    if (sname && seenNames.has(sname)) return false;

    if (sid) seenStudentIds.add(sid);
    if (snisn) seenNisns.add(snisn);
    if (sname) seenNames.add(sname);
    return true;
  });

  const record: TeacherKbmAttendance = {
    id: attendance.id || `kbm_att_${randomUUID()}`,
    date: targetDate,
    teacher_id: attendance.teacher_id || '',
    teacher_name: attendance.teacher_name || '',
    nip: attendance.nip || '',
    rombel_id: targetRombel,
    subject: attendance.subject || '',
    jp_list: jpList,
    jp_start: minJp,
    jp_end: maxJp,
    total_jp: jpList.length,
    topic: attendance.topic || '',
    location_status: attendance.location_status || 'VALID',
    location_coords: attendance.location_coords,
    location_distance: attendance.location_distance || 0,
    is_mocked: !!attendance.is_mocked,
    gps_accuracy: attendance.gps_accuracy || 0,
    verified_students: uniqueStudents,
    verification_count: uniqueStudents.length,
    absent_students: Array.isArray(attendance.absent_students) ? attendance.absent_students : [],
    status: attendance.status || 'HADIR',
    created_at: new Date().toISOString(),
    jadwal_kbm_id: attendance.jadwal_kbm_id || (attendance as any).jadwal_id || undefined
  };

  try {
    await pool.query(`
      INSERT INTO kehadiran_kbm_guru (
        id, date, teacher_id, teacher_name, nip, rombel_id, subject, jp_list,
        jp_start, jp_end, total_jp, topic, location_status, location_coords,
        location_distance, verified_students, verification_count, absent_students, status,
        is_mocked, gps_accuracy, jadwal_kbm_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
      ) ON CONFLICT (id) DO UPDATE SET
        subject = $7, jp_list = $8, jp_start = $9, jp_end = $10, total_jp = $11,
        topic = $12, location_status = $13, location_coords = $14,
        location_distance = $15, verified_students = $16, verification_count = $17,
        absent_students = $18, status = $19, is_mocked = $20, gps_accuracy = $21, jadwal_kbm_id = $22
    `, [
      record.id,
      record.date,
      record.teacher_id,
      record.teacher_name,
      record.nip,
      record.rombel_id,
      record.subject,
      JSON.stringify(record.jp_list),
      record.jp_start,
      record.jp_end,
      record.total_jp,
      record.topic,
      record.location_status,
      JSON.stringify(record.location_coords || {}),
      record.location_distance,
      JSON.stringify(record.verified_students),
      record.verification_count,
      JSON.stringify(record.absent_students || []),
      record.status,
      record.is_mocked,
      record.gps_accuracy,
      record.jadwal_kbm_id || null
    ]);
  } catch (e) {
    // Fallback if columns don't exist yet in legacy db
    try {
      await pool.query(`
        INSERT INTO kehadiran_kbm_guru (
          id, date, teacher_id, teacher_name, nip, rombel_id, subject, jp_list,
          jp_start, jp_end, total_jp, topic, location_status, location_coords,
          location_distance, verified_students, verification_count, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        ) ON CONFLICT (id) DO UPDATE SET
          subject = $7, jp_list = $8, jp_start = $9, jp_end = $10, total_jp = $11,
          topic = $12, location_status = $13, location_coords = $14,
          location_distance = $15, verified_students = $16, verification_count = $17, status = $18
      `, [
        record.id,
        record.date,
        record.teacher_id,
        record.teacher_name,
        record.nip,
        record.rombel_id,
        record.subject,
        JSON.stringify(record.jp_list),
        record.jp_start,
        record.jp_end,
        record.total_jp,
        record.topic,
        record.location_status,
        JSON.stringify(record.location_coords || {}),
        record.location_distance,
        JSON.stringify(record.verified_students),
        record.verification_count,
        record.status
      ]);
    } catch (e2) {
      console.error('Error recording teacher kbm in pool:', e2);
    }
  }

  const current = readJsonFile<TeacherKbmAttendance[]>(KEHADIRAN_KBM_FILE, []);
  const idx = current.findIndex(a => a.id === record.id);
  if (idx >= 0) current[idx] = record;
  else current.push(record);
  writeJsonFile(KEHADIRAN_KBM_FILE, current);
  return record;
}

export async function getAllTeacherKbmAttendance(filter?: {
  date?: string;
  startDate?: string;
  endDate?: string;
  rombel_id?: string;
  teacher_id?: string;
}): Promise<TeacherKbmAttendance[]> {
  try {
    let sql = 'SELECT * FROM kehadiran_kbm_guru WHERE 1=1';
    const params: any[] = [];
    let pIdx = 1;

    if (filter?.date) {
      sql += ` AND date = $${pIdx++}`;
      params.push(filter.date);
    } else {
      if (filter?.startDate) {
        sql += ` AND date >= $${pIdx++}`;
        params.push(filter.startDate);
      }
      if (filter?.endDate) {
        sql += ` AND date <= $${pIdx++}`;
        params.push(filter.endDate);
      }
    }
    if (filter?.rombel_id) {
      sql += ` AND rombel_id = $${pIdx++}`;
      params.push(filter.rombel_id);
    }
    if (filter?.teacher_id) {
      sql += ` AND teacher_id = $${pIdx++}`;
      params.push(filter.teacher_id);
    }
    sql += ' ORDER BY date DESC, jp_start ASC';

    const res = await pool.query(sql, params);
    if (res.rows && res.rows.length > 0) {
      return res.rows.map(r => ({
        id: r.id,
        date: r.date,
        teacher_id: r.teacher_id,
        teacher_name: r.teacher_name,
        nip: r.nip || '',
        rombel_id: r.rombel_id,
        subject: r.subject,
        jp_list: typeof r.jp_list === 'string' ? JSON.parse(r.jp_list) : (r.jp_list || []),
        jp_start: r.jp_start,
        jp_end: r.jp_end,
        total_jp: r.total_jp,
        topic: r.topic || '',
        location_status: r.location_status || 'VALID',
        location_coords: typeof r.location_coords === 'string' ? JSON.parse(r.location_coords) : r.location_coords,
        location_distance: parseFloat(r.location_distance) || 0,
        verified_students: typeof r.verified_students === 'string' ? JSON.parse(r.verified_students) : (r.verified_students || []),
        verification_count: r.verification_count || 0,
        absent_students: typeof r.absent_students === 'string' ? JSON.parse(r.absent_students) : (r.absent_students || []),
        status: r.status || 'HADIR',
        created_at: r.created_at
      }));
    }
  } catch (e) {}

  let list = readJsonFile<TeacherKbmAttendance[]>(KEHADIRAN_KBM_FILE, []);
  if (filter?.date) list = list.filter(l => l.date === filter.date);
  if (filter?.startDate && filter?.endDate) list = list.filter(l => l.date >= filter.startDate! && l.date <= filter.endDate!);
  if (filter?.rombel_id) list = list.filter(l => l.rombel_id === filter.rombel_id);
  if (filter?.teacher_id) list = list.filter(l => l.teacher_id === filter.teacher_id);
  return list.sort((a, b) => b.date.localeCompare(a.date) || a.jp_start - b.jp_start);
}

export async function deleteTeacherKbmAttendance(id: string): Promise<boolean> {
  try {
    await pool.query('DELETE FROM kehadiran_kbm_guru WHERE id = $1', [id]);
  } catch (e) {}

  const current = readJsonFile<TeacherKbmAttendance[]>(KEHADIRAN_KBM_FILE, []);
  const filtered = current.filter(a => a.id !== id);
  writeJsonFile(KEHADIRAN_KBM_FILE, filtered);
  return true;
}

// Rekap Kehadiran Guru & Rombel
export async function getTeacherKbmRecap(params: {
  type: 'daily' | 'weekly' | 'monthly';
  date: string; // reference date "YYYY-MM-DD"
  rombel_id?: string;
  teacher_id?: string;
}) {
  const { type, date, rombel_id, teacher_id } = params;
  let startDate = date;
  let endDate = date;

  if (type === 'weekly') {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sun, 1 = Mon ...
    const diffToMon = day === 0 ? -6 : 1 - day;
    const mon = new Date(d);
    mon.setDate(d.getDate() + diffToMon);
    const sat = new Date(mon);
    sat.setDate(mon.getDate() + 5);
    startDate = mon.toISOString().split('T')[0];
    endDate = sat.toISOString().split('T')[0];
  } else if (type === 'monthly') {
    const [y, m] = date.split('-');
    startDate = `${y}-${m}-01`;
    const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
    endDate = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
  }

  // 1. Ambil semua rombel aktif (HANYA status AKTIF, rombel PKL / LULUS / ALUMNI / DUMMY tidak ditampilkan)
  const rombelStatuses = await getAllRombelStatus();
  const students = await getAllStudents();
  const teachers = await getAllTeachers();

  const isInvalidOrDummyClass = (name: string) => {
    if (!name || !name.trim()) return true;
    const cUpper = name.toUpperCase().trim();
    return (
      cUpper.startsWith('ALUMNI') ||
      cUpper.includes('PKL') ||
      cUpper.includes('LULUS') ||
      cUpper.startsWith('DUMMY') ||
      cUpper.includes('DUMMY') ||
      cUpper.startsWith('TEST') ||
      cUpper.includes('TEST') ||
      cUpper.startsWith('SAMPLE') ||
      cUpper.includes('CONTOH') ||
      cUpper.includes('NONAKTIF') ||
      cUpper === 'TANPA KELAS' ||
      cUpper === 'NULL' ||
      cUpper === 'UNDEFINED'
    );
  };
  
  // Filter siswa aktif saja
  const activeStudents = students.filter(s => {
    const st = String(s.status || 'AKTIF').toUpperCase().trim();
    return st === 'AKTIF' || !st;
  });

  const allClassSet = new Set<string>();
  // Masukkan rombel dari siswa aktif
  activeStudents.forEach(s => {
    if (s.class && !isInvalidOrDummyClass(s.class)) {
      const cls = s.class.trim();
      const st = (rombelStatuses[cls] || 'AKTIF').toUpperCase().trim();
      if (st === 'AKTIF') {
        allClassSet.add(cls);
      }
    }
  });

  // Masukkan rombel dari penugasan wali kelas guru yang aktif
  teachers.forEach(t => {
    const tSt = String(t.status || 'AKTIF').toUpperCase().trim();
    if ((tSt === 'AKTIF' || !tSt) && t.class && !isInvalidOrDummyClass(t.class)) {
      const cls = t.class.trim();
      const st = (rombelStatuses[cls] || 'AKTIF').toUpperCase().trim();
      if (st === 'AKTIF') {
        allClassSet.add(cls);
      }
    }
  });

  // Ambil data presensi KBM pada rentang tanggal lebih awal untuk melengkapi rombel jika ada
  const attendances = await getAllTeacherKbmAttendance({
    startDate,
    endDate,
    rombel_id,
    teacher_id
  });

  attendances.forEach(a => {
    if (a.rombel_id && !isInvalidOrDummyClass(a.rombel_id)) {
      const cls = a.rombel_id.trim();
      const st = (rombelStatuses[cls] || 'AKTIF').toUpperCase().trim();
      if (st === 'AKTIF') {
        allClassSet.add(cls);
      }
    }
  });

  const activeRombels = Array.from(allClassSet)
    .filter(c => {
      const st = (rombelStatuses[c] || 'AKTIF').toUpperCase().trim();
      return st === 'AKTIF' && !isInvalidOrDummyClass(c);
    })
    .sort();

  // 2. Ambil jadwal KBM hari ini untuk mengecek JP aktif dan kategori
  const dateObj = new Date(date);
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const currentDayName = dayNames[dateObj.getDay()];
  const daySchedule = await getKbmScheduleByDay(currentDayName);
  const periods = daySchedule?.periods || [];

  // 4. Ambil status bebas kehadiran / libur
  const freeCheck = await checkDateFreeAttendance(date);

  // 5. Build Sub-Menu 1: Rekap Kehadiran Rombel (Matrix Rombel x JP)
  const rombelMatrix = activeRombels.map(rombelName => {
    const rombelAttendances = attendances.filter(a => a.date === date && a.rombel_id === rombelName);
    
    // Per-JP status
    const jpStatusList = periods.map(p => {
      const isTeaching = (p.is_teaching !== false && p.category_name.toUpperCase() === 'KBM') || (p.jp_number > 0 && p.is_teaching !== false);
      const isActualKbmJp = isTeaching && p.jp_number > 0;

      if (isActualKbmJp) {
        const match = rombelAttendances.find(a => (a.jp_list || []).includes(p.jp_number));
        if (match) {
          return {
            jp_number: p.jp_number,
            name: p.name,
            time: `${p.start_time} - ${p.end_time}`,
            category: p.category_name,
            is_kbm: true,
            status: 'TERISI',
            teacher_name: match.teacher_name,
            subject: match.subject,
            topic: match.topic,
            location_status: match.location_status,
            attendance_id: match.id,
            verified_students_count: match.verification_count
          };
        }
        
        return {
          jp_number: p.jp_number,
          name: p.name,
          time: `${p.start_time} - ${p.end_time}`,
          category: p.category_name,
          is_kbm: true,
          status: freeCheck.isFree ? 'LIBUR' : 'JAM_KOSONG',
          teacher_name: null,
          subject: null,
          topic: null,
          location_status: null,
          attendance_id: null,
          verified_students_count: 0
        };
      }

      // Non-KBM activity (Apel, Upacara, Istirahat, dll)
      return {
        jp_number: 0,
        name: p.name || p.category_name,
        time: `${p.start_time} - ${p.end_time}`,
        category: p.category_name,
        is_kbm: false,
        status: p.name || p.category_name.toUpperCase(),
        teacher_name: null,
        subject: null,
        topic: null,
        location_status: null,
        attendance_id: null,
        verified_students_count: 0
      };
    });

    const totalJp = periods.filter(p => p.category_name.toUpperCase() === 'KBM').length;
    const filledJp = jpStatusList.filter(s => s.status === 'TERISI').length;
    const emptyJp = totalJp - filledJp;

    return {
      rombel_name: rombelName,
      total_kbm_jp: totalJp,
      filled_jp: filledJp,
      empty_jp: Math.max(0, emptyJp),
      percentage: totalJp > 0 ? Math.round((filledJp / totalJp) * 100) : 100,
      jp_status: jpStatusList
    };
  });

  // 6. Build Sub-Menu 2: Rekap Kehadiran Guru (Hanya Guru Berstatus Aktif & Non-Dummy)
  const activeTeachers = teachers.filter(t => {
    const st = String(t.status || 'AKTIF').toUpperCase().trim();
    const nameUpper = String(t.name || '').toUpperCase().trim();
    if (st !== 'AKTIF' && st !== '') return false;
    if (nameUpper.startsWith('DUMMY') || nameUpper.includes('DUMMY') || nameUpper.startsWith('TEST') || nameUpper === 'GURU DUMMY') return false;
    return true;
  });
  const guruSummary = activeTeachers.map(t => {
    const tAtt = attendances.filter(a => a.teacher_id === t.id || a.teacher_name.toLowerCase() === t.name.toLowerCase());
    const totalJpTaught = tAtt.reduce((sum, a) => sum + (a.total_jp || a.jp_list.length || 1), 0);
    const rombelsTaught = Array.from(new Set(tAtt.map(a => a.rombel_id)));

    return {
      teacher_id: t.id,
      teacher_name: t.name,
      nip: t.nip || '',
      whatsapp: t.whatsapp || '',
      total_sessions: tAtt.length,
      total_jp: totalJpTaught,
      rombels: rombelsTaught,
      details: tAtt.map(a => ({
        id: a.id,
        date: a.date,
        rombel_id: a.rombel_id,
        subject: a.subject,
        jp_range: a.jp_list.length > 1 ? `JP ${a.jp_start}-${a.jp_end}` : `JP ${a.jp_start}`,
        jp_count: a.total_jp,
        topic: a.topic,
        location_status: a.location_status,
        distance_meters: a.location_distance,
        verification_count: a.verification_count
      }))
    };
  }).filter(g => (teacher_id ? g.teacher_id === teacher_id : true));

  return {
    type,
    date,
    startDate,
    endDate,
    dayName: currentDayName,
    isFreeDay: freeCheck.isFree,
    freeDetail: freeCheck.detail,
    periods,
    rombelMatrix,
    guruSummary
  };
}

// ==========================================
// SISTEM PENJADWALAN JP KBM (JADWAL_KBM)
// ==========================================

export async function getAllJadwalKbm(filters?: { teacher_id?: string; rombel_id?: string; hari?: string }): Promise<JadwalKbm[]> {
  try {
    let sql = 'SELECT * FROM jadwal_kbm WHERE 1=1';
    const params: any[] = [];

    if (filters?.teacher_id) {
      params.push(filters.teacher_id);
      sql += ` AND teacher_id = $${params.length}`;
    }
    if (filters?.rombel_id) {
      params.push(filters.rombel_id);
      sql += ` AND rombel_id = $${params.length}`;
    }
    if (filters?.hari) {
      params.push(filters.hari);
      sql += ` AND LOWER(hari) = LOWER($${params.length})`;
    }

    sql += ' ORDER BY hari ASC, created_at ASC';
    const res = await safeDbQuery(sql, params);
    if (res.success && res.rows && res.rows.length > 0) {
      return res.rows.map(r => ({
        id: r.id,
        teacher_id: r.teacher_id,
        teacher_name: r.teacher_name || '',
        mapel_name: r.mapel_name,
        rombel_id: r.rombel_id,
        hari: r.hari,
        jp_list: Array.isArray(r.jp_list) ? r.jp_list : (typeof r.jp_list === 'string' ? JSON.parse(r.jp_list) : []),
        created_at: r.created_at,
        updated_at: r.updated_at
      }));
    }
  } catch (e: any) {
    if (e?.code !== 'ECONNREFUSED') {
      console.warn('Jadwal KBM DB query warning, fallback to JSON:', e?.message || e);
    }
  }

  // Fallback to JSON file
  let list = readJsonFile<JadwalKbm[]>(JADWAL_KBM_FILE, []);
  if (filters?.teacher_id) {
    list = list.filter(j => j.teacher_id === filters.teacher_id);
  }
  if (filters?.rombel_id) {
    list = list.filter(j => j.rombel_id.toLowerCase() === filters.rombel_id!.toLowerCase());
  }
  if (filters?.hari) {
    list = list.filter(j => j.hari.toLowerCase() === filters.hari!.toLowerCase());
  }
  return list;
}

export async function getJadwalKbmById(id: string): Promise<JadwalKbm | null> {
  try {
    const res = await safeDbQuery('SELECT * FROM jadwal_kbm WHERE id = $1', [id]);
    if (res.success && res.rows && res.rows.length > 0) {
      const r = res.rows[0];
      return {
        id: r.id,
        teacher_id: r.teacher_id,
        teacher_name: r.teacher_name || '',
        mapel_name: r.mapel_name,
        rombel_id: r.rombel_id,
        hari: r.hari,
        jp_list: Array.isArray(r.jp_list) ? r.jp_list : (typeof r.jp_list === 'string' ? JSON.parse(r.jp_list) : []),
        created_at: r.created_at,
        updated_at: r.updated_at
      };
    }
  } catch (e) {}

  const list = readJsonFile<JadwalKbm[]>(JADWAL_KBM_FILE, []);
  return list.find(j => j.id === id) || null;
}

export async function checkJadwalKbmConflict(params: {
  rombel_id: string;
  hari: string;
  jp_list?: number[];
  exclude_id?: string;
}): Promise<{
  hasConflict: boolean;
  conflicts: any[];
  occupiedJps: { jp: number; teacher_id: string; teacher_name: string; mapel_name: string; schedule_id: string }[];
}> {
  const allSchedules = await getAllJadwalKbm({
    rombel_id: params.rombel_id,
    hari: params.hari
  });

  const activeSchedules = allSchedules.filter(s => !params.exclude_id || s.id !== params.exclude_id);
  const occupiedJps: { jp: number; teacher_id: string; teacher_name: string; mapel_name: string; schedule_id: string }[] = [];

  activeSchedules.forEach(s => {
    (s.jp_list || []).forEach(jp => {
      occupiedJps.push({
        jp,
        teacher_id: s.teacher_id,
        teacher_name: s.teacher_name || 'Guru Pengampu',
        mapel_name: s.mapel_name,
        schedule_id: s.id
      });
    });
  });

  const conflicts: any[] = [];
  if (params.jp_list && params.jp_list.length > 0) {
    params.jp_list.forEach(jp => {
      const occ = occupiedJps.find(o => o.jp === jp);
      if (occ) {
        conflicts.push(occ);
      }
    });
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
    occupiedJps
  };
}

export async function createJadwalKbm(data: {
  teacher_id: string;
  teacher_name?: string;
  mapel_name: string;
  rombel_id: string;
  hari: string;
  jp_list: number[];
}): Promise<JadwalKbm> {
  const conflictCheck = await checkJadwalKbmConflict({
    rombel_id: data.rombel_id,
    hari: data.hari,
    jp_list: data.jp_list
  });

  if (conflictCheck.hasConflict) {
    const firstConflict = conflictCheck.conflicts[0];
    const conflictedJps = conflictCheck.conflicts.map(c => `JP ${c.jp}`).join(', ');
    throw new Error(`Slot ${conflictedJps} di kelas ${data.rombel_id} pada hari ${data.hari} sudah ditempati oleh ${firstConflict.teacher_name} (${firstConflict.mapel_name})`);
  }

  const newId = `jdw_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const now = new Date().toISOString();

  let teacherName = data.teacher_name || '';
  if (!teacherName) {
    try {
      const tRes = await safeDbQuery('SELECT name FROM teachers WHERE id = $1', [data.teacher_id]);
      if (tRes.success && tRes.rows && tRes.rows.length > 0) {
        teacherName = tRes.rows[0].name;
      }
    } catch (e) {}
  }

  const newItem: JadwalKbm = {
    id: newId,
    teacher_id: data.teacher_id,
    teacher_name: teacherName,
    mapel_name: data.mapel_name,
    rombel_id: data.rombel_id,
    hari: data.hari,
    jp_list: (data.jp_list || []).sort((a, b) => a - b),
    created_at: now,
    updated_at: now
  };

  try {
    await safeDbQuery(`
      INSERT INTO jadwal_kbm (id, teacher_id, teacher_name, mapel_name, rombel_id, hari, jp_list, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
    `, [
      newItem.id,
      newItem.teacher_id,
      newItem.teacher_name,
      newItem.mapel_name,
      newItem.rombel_id,
      newItem.hari,
      JSON.stringify(newItem.jp_list),
      newItem.created_at,
      newItem.updated_at
    ]);
  } catch (e: any) {
    if (e?.code !== 'ECONNREFUSED') {
      console.warn('Error saving jadwal_kbm to DB:', e?.message || e);
    }
  }

  const list = readJsonFile<JadwalKbm[]>(JADWAL_KBM_FILE, []);
  list.push(newItem);
  writeJsonFile(JADWAL_KBM_FILE, list);

  return newItem;
}

export async function updateJadwalKbm(id: string, data: Partial<JadwalKbm>): Promise<JadwalKbm | null> {
  const existing = await getJadwalKbmById(id);
  if (!existing) return null;

  const rombel_id = data.rombel_id || existing.rombel_id;
  const hari = data.hari || existing.hari;
  const jp_list = data.jp_list ? (data.jp_list || []).sort((a, b) => a - b) : existing.jp_list;

  const conflictCheck = await checkJadwalKbmConflict({
    rombel_id,
    hari,
    jp_list,
    exclude_id: id
  });

  if (conflictCheck.hasConflict) {
    const firstConflict = conflictCheck.conflicts[0];
    const conflictedJps = conflictCheck.conflicts.map(c => `JP ${c.jp}`).join(', ');
    throw new Error(`Slot ${conflictedJps} di kelas ${rombel_id} pada hari ${hari} sudah ditempati oleh ${firstConflict.teacher_name} (${firstConflict.mapel_name})`);
  }

  const now = new Date().toISOString();
  let teacherName = data.teacher_name || existing.teacher_name || '';
  if (data.teacher_id && data.teacher_id !== existing.teacher_id && !data.teacher_name) {
    try {
      const tRes = await safeDbQuery('SELECT name FROM teachers WHERE id = $1', [data.teacher_id]);
      if (tRes.success && tRes.rows && tRes.rows.length > 0) {
        teacherName = tRes.rows[0].name;
      }
    } catch (e) {}
  }

  const updatedItem: JadwalKbm = {
    ...existing,
    ...data,
    teacher_name: teacherName,
    rombel_id,
    hari,
    jp_list,
    updated_at: now
  };

  try {
    await safeDbQuery(`
      UPDATE jadwal_kbm 
      SET teacher_id = $2, teacher_name = $3, mapel_name = $4, rombel_id = $5, hari = $6, jp_list = $7::jsonb, updated_at = $8
      WHERE id = $1
    `, [
      updatedItem.id,
      updatedItem.teacher_id,
      updatedItem.teacher_name,
      updatedItem.mapel_name,
      updatedItem.rombel_id,
      updatedItem.hari,
      JSON.stringify(updatedItem.jp_list),
      updatedItem.updated_at
    ]);
  } catch (e: any) {
    if (e?.code !== 'ECONNREFUSED') {
      console.warn('Error updating jadwal_kbm in DB:', e?.message || e);
    }
  }

  const list = readJsonFile<JadwalKbm[]>(JADWAL_KBM_FILE, []);
  const idx = list.findIndex(j => j.id === id);
  if (idx !== -1) {
    list[idx] = updatedItem;
    writeJsonFile(JADWAL_KBM_FILE, list);
  }

  return updatedItem;
}

export async function deleteJadwalKbm(id: string): Promise<boolean> {
  try {
    await safeDbQuery('DELETE FROM jadwal_kbm WHERE id = $1', [id]);
  } catch (e: any) {
    if (e?.code !== 'ECONNREFUSED') {
      console.warn('Error deleting jadwal_kbm from DB:', e?.message || e);
    }
  }

  const list = readJsonFile<JadwalKbm[]>(JADWAL_KBM_FILE, []);
  const filtered = list.filter(j => j.id !== id);
  writeJsonFile(JADWAL_KBM_FILE, filtered);
  return true;
}

// ==============================================================================
// MODUL PEMBELAJARAN & ASESMEN (LMS) DATA STORE
// ==============================================================================

export interface LmsKebijakan {
  id: number;
  bobot_tugas: number;
  bobot_harian: number;
  bobot_asts: number;
  bobot_asas: number;
  kkm_default: number;
  default_deadline_days: number;
  allow_late_submission: boolean;
  late_penalty_points: number;
  gemini_api_key: string;
  ai_model: string;
  data?: Record<string, any>;
}

export interface LmsMateriTugas {
  id: string;
  teacher_id: string;
  teacher_name?: string;
  mapel: string;
  rombel_id: string;
  judul: string;
  tipe: 'MATERI' | 'TUGAS' | 'PROJEK';
  deskripsi: string;
  file_url?: string;
  file_name?: string;
  deadline?: string;
  terkumpul?: number;
  total_siswa?: number;
  created_at: string;
  updated_at: string;
}

export interface RencanaAsesmen {
  id: string;
  teacher_id: string;
  teacher_name?: string;
  mapel: string;
  rombel_id: string;
  nama_asesmen: string;
  jenis_asesmen: 'SUMATIF' | 'ASTS' | 'ASAS' | 'ASAT';
  kategori_penilaian?: string;
  bobot_persen: number;
  kkm: number;
  status: 'AKTIF' | 'DRAF' | 'SELESAI';
  keterangan?: string;
  created_at: string;
  updated_at: string;
}

export interface BankSoal {
  id: string;
  teacher_id: string;
  mapel: string;
  cakupan_materi?: string;
  kisi_kisi?: string;
  jenis_soal: 'PILIHAN_GANDA' | 'ESSAY';
  pertanyaan: string;
  opsi_jawaban?: { key: string; text: string }[];
  kunci_jawaban?: string;
  pembahasan?: string;
  tingkat_kesulitan?: 'MUDAH' | 'SEDANG' | 'SULIT';
  sumber: 'AI_GENERATOR' | 'IMPORT_WORD' | 'MANUAL';
  created_at: string;
}

export interface AturAsesmen {
  id: string;
  teacher_id: string;
  mapel: string;
  rombel_id: string;
  rencana_asesmen_id?: string;
  judul_ujian: string;
  durasi_menit: number;
  jadwal_mulai: string;
  jadwal_selesai?: string;
  token_ujian: string;
  soal_ids: string[];
  acak_soal: boolean;
  status: 'DRAF' | 'TERJADWAL' | 'BERLANGSUNG' | 'SELESAI';
  created_at: string;
}

export interface HasilPenilaian {
  id: string;
  asesmen_id?: string;
  teacher_id?: string;
  student_id: string;
  student_name: string;
  student_nisn: string;
  rombel_id: string;
  mapel: string;
  nilai_tugas: number;
  nilai_harian: number;
  nilai_ujian: number;
  nilai_akhir: number;
  kkm: number;
  status_tuntas: 'TUNTAS' | 'REMEDIAL';
  tipe_input: 'SISTEM_ONLINE' | 'IMPORT_EXCEL' | 'MANUAL';
  catatan?: string;
  created_at: string;
  updated_at: string;
}

const LMS_KEBIJAKAN_FILE = path.join(process.cwd(), 'uploads', 'lms_kebijakan.json');
const LMS_MATERI_TUGAS_FILE = path.join(process.cwd(), 'uploads', 'lms_materi_tugas.json');
const RENCANA_ASESMEN_FILE = path.join(process.cwd(), 'uploads', 'rencana_asesmen.json');
const BANK_SOAL_FILE = path.join(process.cwd(), 'uploads', 'bank_soal.json');
const ATUR_ASESMEN_FILE = path.join(process.cwd(), 'uploads', 'atur_asesmen.json');
const HASIL_PENILAIAN_FILE = path.join(process.cwd(), 'uploads', 'hasil_penilaian.json');

const DEFAULT_LMS_KEBIJAKAN: LmsKebijakan = {
  id: 1,
  bobot_tugas: 30,
  bobot_harian: 20,
  bobot_asts: 25,
  bobot_asas: 25,
  kkm_default: 75,
  default_deadline_days: 7,
  allow_late_submission: true,
  late_penalty_points: 5,
  gemini_api_key: process.env.GEMINI_API_KEY || '',
  ai_model: 'gemini-3.8-flash',
  data: {}
};

export async function getLmsKebijakan(): Promise<LmsKebijakan> {
  try {
    const res = await safeDbQuery('SELECT * FROM lms_kebijakan WHERE id = 1 LIMIT 1');
    if (res?.rows && res.rows.length > 0) {
      const dbRow = res.rows[0];
      const model = (dbRow.ai_model === 'gemini-2.5-flash' || !dbRow.ai_model) ? 'gemini-3.8-flash' : dbRow.ai_model;
      return {
        ...DEFAULT_LMS_KEBIJAKAN,
        ...dbRow,
        ai_model: model,
        gemini_api_key: dbRow.gemini_api_key || process.env.GEMINI_API_KEY || ''
      };
    }
  } catch (e) {}

  const fileData = readJsonFile<LmsKebijakan | null>(LMS_KEBIJAKAN_FILE, null);
  if (fileData) {
    const model = (fileData.ai_model === 'gemini-2.5-flash' || !fileData.ai_model) ? 'gemini-3.8-flash' : fileData.ai_model;
    return {
      ...DEFAULT_LMS_KEBIJAKAN,
      ...fileData,
      ai_model: model,
      gemini_api_key: fileData.gemini_api_key || process.env.GEMINI_API_KEY || ''
    };
  }
  return DEFAULT_LMS_KEBIJAKAN;
}

export async function updateLmsKebijakan(data: Partial<LmsKebijakan>): Promise<LmsKebijakan> {
  const current = await getLmsKebijakan();
  const updated: LmsKebijakan = {
    ...current,
    ...data,
    id: 1
  };

  try {
    await safeDbQuery(
      `INSERT INTO lms_kebijakan (id, bobot_tugas, bobot_harian, bobot_asts, bobot_asas, kkm_default, default_deadline_days, allow_late_submission, late_penalty_points, gemini_api_key, ai_model, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO UPDATE SET
         bobot_tugas = EXCLUDED.bobot_tugas,
         bobot_harian = EXCLUDED.bobot_harian,
         bobot_asts = EXCLUDED.bobot_asts,
         bobot_asas = EXCLUDED.bobot_asas,
         kkm_default = EXCLUDED.kkm_default,
         default_deadline_days = EXCLUDED.default_deadline_days,
         allow_late_submission = EXCLUDED.allow_late_submission,
         late_penalty_points = EXCLUDED.late_penalty_points,
         gemini_api_key = EXCLUDED.gemini_api_key,
         ai_model = EXCLUDED.ai_model,
         data = EXCLUDED.data`,
      [
        1,
        updated.bobot_tugas,
        updated.bobot_harian,
        updated.bobot_asts,
        updated.bobot_asas,
        updated.kkm_default,
        updated.default_deadline_days,
        updated.allow_late_submission,
        updated.late_penalty_points,
        updated.gemini_api_key,
        updated.ai_model,
        JSON.stringify(updated.data || {})
      ]
    );
  } catch (e) {}

  writeJsonFile(LMS_KEBIJAKAN_FILE, updated);
  return updated;
}

// 1. MATERI & TUGAS
export async function getAllMateriTugas(filter?: { teacher_id?: string; rombel_id?: string; mapel?: string }): Promise<LmsMateriTugas[]> {
  try {
    let query = 'SELECT * FROM lms_materi_tugas WHERE 1=1';
    const params: any[] = [];
    if (filter?.teacher_id) {
      params.push(filter.teacher_id);
      query += ` AND teacher_id = $${params.length}`;
    }
    if (filter?.rombel_id) {
      params.push(filter.rombel_id);
      query += ` AND (rombel_id = $${params.length} OR rombel_id = 'SEMUA' OR rombel_id LIKE '%' || $${params.length} || '%')`;
    }
    query += ' ORDER BY created_at DESC';
    const res = await safeDbQuery(query, params);
    if (res?.rows && res.rows.length > 0) {
      return res.rows;
    }
  } catch (e) {}

  let all = readJsonFile<LmsMateriTugas[]>(LMS_MATERI_TUGAS_FILE, []);
  if (filter?.teacher_id) {
    all = all.filter(m => m.teacher_id === filter.teacher_id);
  }
  if (filter?.rombel_id) {
    all = all.filter(m => m.rombel_id === filter.rombel_id || m.rombel_id === 'SEMUA' || m.rombel_id.includes(filter.rombel_id!));
  }
  return all;
}

export async function saveMateriTugas(item: Omit<LmsMateriTugas, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<LmsMateriTugas> {
  const all = readJsonFile<LmsMateriTugas[]>(LMS_MATERI_TUGAS_FILE, []);
  const now = new Date().toISOString();
  const id = item.id || `mat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const newItem: LmsMateriTugas = {
    ...item,
    id,
    created_at: now,
    updated_at: now
  };

  try {
    await safeDbQuery(
      `INSERT INTO lms_materi_tugas (id, teacher_id, teacher_name, mapel, rombel_id, judul, tipe, deskripsi, file_url, file_name, deadline, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO UPDATE SET
         judul = EXCLUDED.judul,
         tipe = EXCLUDED.tipe,
         deskripsi = EXCLUDED.deskripsi,
         file_url = EXCLUDED.file_url,
         file_name = EXCLUDED.file_name,
         deadline = EXCLUDED.deadline,
         updated_at = EXCLUDED.updated_at`,
      [
        newItem.id,
        newItem.teacher_id,
        newItem.teacher_name || '',
        newItem.mapel,
        newItem.rombel_id,
        newItem.judul,
        newItem.tipe,
        newItem.deskripsi,
        newItem.file_url || '',
        newItem.file_name || '',
        newItem.deadline || null,
        newItem.created_at,
        newItem.updated_at
      ]
    );
  } catch (e) {}

  const existingIdx = all.findIndex(m => m.id === id);
  if (existingIdx !== -1) {
    all[existingIdx] = newItem;
  } else {
    all.unshift(newItem);
  }
  writeJsonFile(LMS_MATERI_TUGAS_FILE, all);
  return newItem;
}

export async function deleteMateriTugas(id: string): Promise<boolean> {
  try {
    await safeDbQuery('DELETE FROM lms_materi_tugas WHERE id = $1', [id]);
  } catch (e) {}

  const all = readJsonFile<LmsMateriTugas[]>(LMS_MATERI_TUGAS_FILE, []);
  const filtered = all.filter(m => m.id !== id);
  writeJsonFile(LMS_MATERI_TUGAS_FILE, filtered);
  return true;
}

// 2. RENCANA ASESMEN
export async function getAllRencanaAsesmen(filter?: { teacher_id?: string; rombel_id?: string; mapel?: string }): Promise<RencanaAsesmen[]> {
  try {
    let query = 'SELECT * FROM rencana_asesmen WHERE 1=1';
    const params: any[] = [];
    if (filter?.teacher_id) {
      params.push(filter.teacher_id);
      query += ` AND teacher_id = $${params.length}`;
    }
    if (filter?.rombel_id) {
      params.push(filter.rombel_id);
      query += ` AND (rombel_id = $${params.length} OR rombel_id = 'SEMUA' OR rombel_id LIKE '%' || $${params.length} || '%')`;
    }
    query += ' ORDER BY created_at DESC';
    const res = await safeDbQuery(query, params);
    if (res?.rows && res.rows.length > 0) {
      return res.rows;
    }
  } catch (e) {}

  let all = readJsonFile<RencanaAsesmen[]>(RENCANA_ASESMEN_FILE, []);
  if (filter?.teacher_id) {
    all = all.filter(r => r.teacher_id === filter.teacher_id);
  }
  if (filter?.rombel_id) {
    all = all.filter(r => r.rombel_id === filter.rombel_id || r.rombel_id === 'SEMUA' || r.rombel_id.includes(filter.rombel_id!));
  }
  return all;
}

export async function saveRencanaAsesmen(item: Omit<RencanaAsesmen, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<RencanaAsesmen> {
  const all = readJsonFile<RencanaAsesmen[]>(RENCANA_ASESMEN_FILE, []);
  const now = new Date().toISOString();
  const id = item.id || `rcn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const newItem: RencanaAsesmen = {
    ...item,
    id,
    created_at: now,
    updated_at: now
  };

  try {
    await safeDbQuery(
      `INSERT INTO rencana_asesmen (id, teacher_id, teacher_name, mapel, rombel_id, nama_asesmen, jenis_asesmen, kategori_penilaian, bobot_persen, kkm, status, keterangan, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (id) DO UPDATE SET
         nama_asesmen = EXCLUDED.nama_asesmen,
         jenis_asesmen = EXCLUDED.jenis_asesmen,
         kategori_penilaian = EXCLUDED.kategori_penilaian,
         bobot_persen = EXCLUDED.bobot_persen,
         kkm = EXCLUDED.kkm,
         status = EXCLUDED.status,
         keterangan = EXCLUDED.keterangan,
         updated_at = EXCLUDED.updated_at`,
      [
        newItem.id,
        newItem.teacher_id,
        newItem.teacher_name || '',
        newItem.mapel,
        newItem.rombel_id,
        newItem.nama_asesmen,
        newItem.jenis_asesmen,
        newItem.kategori_penilaian || '',
        newItem.bobot_persen,
        newItem.kkm,
        newItem.status,
        newItem.keterangan || '',
        newItem.created_at,
        newItem.updated_at
      ]
    );
  } catch (e) {}

  const idx = all.findIndex(r => r.id === id);
  if (idx !== -1) {
    all[idx] = newItem;
  } else {
    all.unshift(newItem);
  }
  writeJsonFile(RENCANA_ASESMEN_FILE, all);
  return newItem;
}

export async function deleteRencanaAsesmen(id: string): Promise<boolean> {
  try {
    await safeDbQuery('DELETE FROM rencana_asesmen WHERE id = $1', [id]);
  } catch (e) {}

  const all = readJsonFile<RencanaAsesmen[]>(RENCANA_ASESMEN_FILE, []);
  const filtered = all.filter(r => r.id !== id);
  writeJsonFile(RENCANA_ASESMEN_FILE, filtered);
  return true;
}

// 3. BANK SOAL
export async function getAllBankSoal(filter?: { teacher_id?: string; mapel?: string; jenis_soal?: string }): Promise<BankSoal[]> {
  try {
    let query = 'SELECT * FROM bank_soal WHERE 1=1';
    const params: any[] = [];
    if (filter?.teacher_id) {
      params.push(filter.teacher_id);
      query += ` AND teacher_id = $${params.length}`;
    }
    if (filter?.mapel) {
      params.push(filter.mapel);
      query += ` AND mapel = $${params.length}`;
    }
    if (filter?.jenis_soal) {
      params.push(filter.jenis_soal);
      query += ` AND jenis_soal = $${params.length}`;
    }
    query += ' ORDER BY created_at DESC';
    const res = await safeDbQuery(query, params);
    if (res?.rows && res.rows.length > 0) {
      return res.rows.map(r => ({
        ...r,
        opsi_jawaban: typeof r.opsi_jawaban === 'string' ? JSON.parse(r.opsi_jawaban) : r.opsi_jawaban
      }));
    }
  } catch (e) {}

  let all = readJsonFile<BankSoal[]>(BANK_SOAL_FILE, []);
  if (filter?.teacher_id) {
    all = all.filter(b => b.teacher_id === filter.teacher_id);
  }
  if (filter?.mapel) {
    all = all.filter(b => b.mapel.toLowerCase() === filter.mapel!.toLowerCase());
  }
  if (filter?.jenis_soal) {
    all = all.filter(b => b.jenis_soal === filter.jenis_soal);
  }
  return all;
}

export async function saveBankSoal(item: Omit<BankSoal, 'id' | 'created_at'> & { id?: string }): Promise<BankSoal> {
  const all = readJsonFile<BankSoal[]>(BANK_SOAL_FILE, []);
  const now = new Date().toISOString();
  const id = item.id || `soal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const newItem: BankSoal = {
    ...item,
    id,
    created_at: now
  };

  try {
    await safeDbQuery(
      `INSERT INTO bank_soal (id, teacher_id, mapel, cakupan_materi, kisi_kisi, jenis_soal, pertanyaan, opsi_jawaban, kunci_jawaban, pembahasan, tingkat_kesulitan, sumber, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO UPDATE SET
         pertanyaan = EXCLUDED.pertanyaan,
         opsi_jawaban = EXCLUDED.opsi_jawaban,
         kunci_jawaban = EXCLUDED.kunci_jawaban,
         pembahasan = EXCLUDED.pembahasan,
         tingkat_kesulitan = EXCLUDED.tingkat_kesulitan`,
      [
        newItem.id,
        newItem.teacher_id,
        newItem.mapel,
        newItem.cakupan_materi || '',
        newItem.kisi_kisi || '',
        newItem.jenis_soal,
        newItem.pertanyaan,
        JSON.stringify(newItem.opsi_jawaban || []),
        newItem.kunci_jawaban || '',
        newItem.pembahasan || '',
        newItem.tingkat_kesulitan || 'SEDANG',
        newItem.sumber || 'MANUAL',
        newItem.created_at
      ]
    );
  } catch (e) {}

  const idx = all.findIndex(b => b.id === id);
  if (idx !== -1) {
    all[idx] = newItem;
  } else {
    all.unshift(newItem);
  }
  writeJsonFile(BANK_SOAL_FILE, all);
  return newItem;
}

export async function bulkSaveBankSoal(items: (Omit<BankSoal, 'id' | 'created_at'> & { id?: string })[]): Promise<BankSoal[]> {
  const saved: BankSoal[] = [];
  for (const item of items) {
    const s = await saveBankSoal(item);
    saved.push(s);
  }
  return saved;
}

export async function deleteBankSoal(id: string): Promise<boolean> {
  try {
    await safeDbQuery('DELETE FROM bank_soal WHERE id = $1', [id]);
  } catch (e) {}

  const all = readJsonFile<BankSoal[]>(BANK_SOAL_FILE, []);
  const filtered = all.filter(b => b.id !== id);
  writeJsonFile(BANK_SOAL_FILE, filtered);
  return true;
}

// 4. ATUR ASESMEN (PERAKITAN UJIAN)
export async function getAllAturAsesmen(filter?: { teacher_id?: string; rombel_id?: string }): Promise<AturAsesmen[]> {
  try {
    let query = 'SELECT * FROM atur_asesmen WHERE 1=1';
    const params: any[] = [];
    if (filter?.teacher_id) {
      params.push(filter.teacher_id);
      query += ` AND teacher_id = $${params.length}`;
    }
    if (filter?.rombel_id) {
      params.push(filter.rombel_id);
      query += ` AND rombel_id = $${params.length}`;
    }
    query += ' ORDER BY created_at DESC';
    const res = await safeDbQuery(query, params);
    if (res?.rows && res.rows.length > 0) {
      return res.rows.map(r => ({
        ...r,
        soal_ids: typeof r.soal_ids === 'string' ? JSON.parse(r.soal_ids) : r.soal_ids
      }));
    }
  } catch (e) {}

  let all = readJsonFile<AturAsesmen[]>(ATUR_ASESMEN_FILE, []);
  if (filter?.teacher_id) {
    all = all.filter(a => a.teacher_id === filter.teacher_id);
  }
  if (filter?.rombel_id) {
    all = all.filter(a => a.rombel_id === filter.rombel_id);
  }
  return all;
}

export async function saveAturAsesmen(item: Omit<AturAsesmen, 'id' | 'created_at'> & { id?: string }): Promise<AturAsesmen> {
  const all = readJsonFile<AturAsesmen[]>(ATUR_ASESMEN_FILE, []);
  const now = new Date().toISOString();
  const id = item.id || `exam-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const newItem: AturAsesmen = {
    ...item,
    id,
    created_at: now
  };

  try {
    await safeDbQuery(
      `INSERT INTO atur_asesmen (id, teacher_id, mapel, rombel_id, rencana_asesmen_id, judul_ujian, durasi_menit, jadwal_mulai, jadwal_selesai, token_ujian, soal_ids, acak_soal, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (id) DO UPDATE SET
         judul_ujian = EXCLUDED.judul_ujian,
         durasi_menit = EXCLUDED.durasi_menit,
         jadwal_mulai = EXCLUDED.jadwal_mulai,
         jadwal_selesai = EXCLUDED.jadwal_selesai,
         token_ujian = EXCLUDED.token_ujian,
         soal_ids = EXCLUDED.soal_ids,
         acak_soal = EXCLUDED.acak_soal,
         status = EXCLUDED.status`,
      [
        newItem.id,
        newItem.teacher_id,
        newItem.mapel,
        newItem.rombel_id,
        newItem.rencana_asesmen_id || null,
        newItem.judul_ujian,
        newItem.durasi_menit,
        newItem.jadwal_mulai,
        newItem.jadwal_selesai || null,
        newItem.token_ujian,
        JSON.stringify(newItem.soal_ids || []),
        newItem.acak_soal,
        newItem.status,
        newItem.created_at
      ]
    );
  } catch (e) {}

  const idx = all.findIndex(a => a.id === id);
  if (idx !== -1) {
    all[idx] = newItem;
  } else {
    all.unshift(newItem);
  }
  writeJsonFile(ATUR_ASESMEN_FILE, all);
  return newItem;
}

export async function deleteAturAsesmen(id: string): Promise<boolean> {
  try {
    await safeDbQuery('DELETE FROM atur_asesmen WHERE id = $1', [id]);
  } catch (e) {}

  const all = readJsonFile<AturAsesmen[]>(ATUR_ASESMEN_FILE, []);
  const filtered = all.filter(a => a.id !== id);
  writeJsonFile(ATUR_ASESMEN_FILE, filtered);
  return true;
}

// 5. HASIL PENILAIAN
export async function getAllHasilPenilaian(filter?: { rombel_id?: string; mapel?: string; teacher_id?: string }): Promise<HasilPenilaian[]> {
  try {
    let query = 'SELECT * FROM hasil_penilaian WHERE 1=1';
    const params: any[] = [];
    if (filter?.rombel_id) {
      params.push(filter.rombel_id);
      query += ` AND rombel_id = $${params.length}`;
    }
    if (filter?.mapel) {
      params.push(filter.mapel);
      query += ` AND mapel = $${params.length}`;
    }
    if (filter?.teacher_id) {
      params.push(filter.teacher_id);
      query += ` AND teacher_id = $${params.length}`;
    }
    query += ' ORDER BY student_name ASC';
    const res = await safeDbQuery(query, params);
    if (res?.rows && res.rows.length > 0) {
      return res.rows;
    }
  } catch (e) {}

  let all = readJsonFile<HasilPenilaian[]>(HASIL_PENILAIAN_FILE, []);
  if (filter?.rombel_id) {
    all = all.filter(h => h.rombel_id === filter.rombel_id);
  }
  if (filter?.mapel) {
    all = all.filter(h => h.mapel.toLowerCase() === filter.mapel!.toLowerCase());
  }
  if (filter?.teacher_id) {
    all = all.filter(h => h.teacher_id === filter.teacher_id);
  }
  return all;
}

export async function saveHasilPenilaian(item: Omit<HasilPenilaian, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<HasilPenilaian> {
  const all = readJsonFile<HasilPenilaian[]>(HASIL_PENILAIAN_FILE, []);
  const now = new Date().toISOString();
  const id = item.id || `nil-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const finalScore = Number(item.nilai_akhir || ((item.nilai_tugas * 0.3) + (item.nilai_harian * 0.3) + (item.nilai_ujian * 0.4)).toFixed(2));
  const tuntas = finalScore >= (item.kkm || 75) ? 'TUNTAS' : 'REMEDIAL';

  const newItem: HasilPenilaian = {
    ...item,
    id,
    nilai_akhir: finalScore,
    status_tuntas: tuntas,
    created_at: now,
    updated_at: now
  };

  try {
    await safeDbQuery(
      `INSERT INTO hasil_penilaian (id, asesmen_id, teacher_id, student_id, student_name, student_nisn, rombel_id, mapel, nilai_tugas, nilai_harian, nilai_ujian, nilai_akhir, kkm, status_tuntas, tipe_input, catatan, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       ON CONFLICT (id) DO UPDATE SET
         nilai_tugas = EXCLUDED.nilai_tugas,
         nilai_harian = EXCLUDED.nilai_harian,
         nilai_ujian = EXCLUDED.nilai_ujian,
         nilai_akhir = EXCLUDED.nilai_akhir,
         kkm = EXCLUDED.kkm,
         status_tuntas = EXCLUDED.status_tuntas,
         tipe_input = EXCLUDED.tipe_input,
         catatan = EXCLUDED.catatan,
         updated_at = EXCLUDED.updated_at`,
      [
        newItem.id,
        newItem.asesmen_id || null,
        newItem.teacher_id || null,
        newItem.student_id,
        newItem.student_name,
        newItem.student_nisn,
        newItem.rombel_id,
        newItem.mapel,
        newItem.nilai_tugas,
        newItem.nilai_harian,
        newItem.nilai_ujian,
        newItem.nilai_akhir,
        newItem.kkm,
        newItem.status_tuntas,
        newItem.tipe_input,
        newItem.catatan || '',
        newItem.created_at,
        newItem.updated_at
      ]
    );
  } catch (e) {}

  const idx = all.findIndex(h => h.id === id || (h.student_id === newItem.student_id && h.mapel === newItem.mapel && h.rombel_id === newItem.rombel_id));
  if (idx !== -1) {
    all[idx] = newItem;
  } else {
    all.push(newItem);
  }
  writeJsonFile(HASIL_PENILAIAN_FILE, all);
  return newItem;
}

export async function bulkSaveHasilPenilaian(items: (Omit<HasilPenilaian, 'id' | 'created_at' | 'updated_at'> & { id?: string })[]): Promise<HasilPenilaian[]> {
  const result: HasilPenilaian[] = [];
  for (const item of items) {
    const s = await saveHasilPenilaian(item);
    result.push(s);
  }
  return result;
}

// ==============================================================================
// MANAJEMEN MENU & HAK AKSES (MAINTENANCE & PRATINJAU)
// ==============================================================================
import type { MenuSettingItem } from './config/menuSettings.ts';
import { DEFAULT_MENU_SETTINGS } from './config/menuSettings.ts';
export type { MenuSettingItem };
export { DEFAULT_MENU_SETTINGS };

const MENU_SETTINGS_FILE = path.join(DATA_DIR, 'menu_settings.json');

export async function getAllMenuSettings(): Promise<MenuSettingItem[]> {
  try {
    const res = await safeDbQuery('SELECT * FROM menu_settings ORDER BY category, menu_key');
    if (res?.rows && res.rows.length > 0) {
      // Merge with default list to guarantee all menus are represented
      const dbMap = new Map<string, any>(res.rows.map(r => [r.menu_key, r]));
      return DEFAULT_MENU_SETTINGS.map(def => {
        const found = dbMap.get(def.menu_key);
        if (found) {
          return {
            ...def,
            name: found.name || def.name,
            category: found.category || def.category,
            description: found.description || def.description,
            is_enabled: found.is_enabled !== false && found.is_enabled !== 'false' && found.is_enabled !== 0,
            updated_at: found.updated_at
          };
        }
        return def;
      });
    }
  } catch (e) {}

  // File fallback
  const fileList = readJsonFile<MenuSettingItem[]>(MENU_SETTINGS_FILE, []);
  if (fileList && fileList.length > 0) {
    const fileMap = new Map<string, any>(fileList.map(r => [r.menu_key, r]));
    return DEFAULT_MENU_SETTINGS.map(def => {
      const found = fileMap.get(def.menu_key);
      if (found) {
        return {
          ...def,
          ...found,
          is_enabled: found.is_enabled !== false
        };
      }
      return def;
    });
  }

  // Write default to file on first run
  writeJsonFile(MENU_SETTINGS_FILE, DEFAULT_MENU_SETTINGS);
  return DEFAULT_MENU_SETTINGS;
}

export async function updateMenuSetting(menu_key: string, is_enabled: boolean): Promise<MenuSettingItem> {
  const all = await getAllMenuSettings();
  const target = all.find(m => m.menu_key === menu_key) || DEFAULT_MENU_SETTINGS.find(m => m.menu_key === menu_key) || {
    menu_key,
    name: menu_key,
    category: 'guru' as const,
    description: '',
    is_enabled: true
  };

  const updated: MenuSettingItem = {
    ...target,
    is_enabled,
    updated_at: new Date().toISOString()
  };

  try {
    await safeDbQuery(
      `INSERT INTO menu_settings (menu_key, name, category, description, is_enabled, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (menu_key) DO UPDATE SET
         is_enabled = EXCLUDED.is_enabled,
         updated_at = EXCLUDED.updated_at`,
      [updated.menu_key, updated.name, updated.category, updated.description, updated.is_enabled, updated.updated_at]
    );
  } catch (e) {}

  const idx = all.findIndex(m => m.menu_key === menu_key);
  if (idx !== -1) {
    all[idx] = updated;
  } else {
    all.push(updated);
  }
  writeJsonFile(MENU_SETTINGS_FILE, all);
  return updated;
}

export async function bulkUpdateMenuSettings(settingsMap: Record<string, boolean>): Promise<MenuSettingItem[]> {
  const all = await getAllMenuSettings();
  const updatedList: MenuSettingItem[] = [];

  for (const [key, val] of Object.entries(settingsMap)) {
    const item = await updateMenuSetting(key, val);
    updatedList.push(item);
  }

  return getAllMenuSettings();
}

export async function getMenuSettingsMap(): Promise<Record<string, boolean>> {
  const all = await getAllMenuSettings();
  const map: Record<string, boolean> = {};
  for (const item of all) {
    map[item.menu_key] = item.is_enabled;
  }
  return map;
}

// ==========================================
// KIOSK TERMINAL MONITORING & EMERGENCY IMPORT
// ==========================================

export interface KioskTerminal {
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
  created_at?: string;
  updated_at?: string;
  is_online?: boolean;
  seconds_ago?: number;
}

export async function getAllKioskTerminals(): Promise<KioskTerminal[]> {
  let list: KioskTerminal[] = [];
  try {
    const res = await safeDbQuery<any>('SELECT * FROM kiosk_terminals ORDER BY last_seen DESC');
    if (res.success && res.rows.length > 0) {
      list = res.rows.map(r => ({
        terminal_id: r.terminal_id,
        name: r.name || r.terminal_id,
        ip_address: r.ip_address || '',
        user_agent: r.user_agent || '',
        last_seen: r.last_seen ? new Date(r.last_seen).toISOString() : new Date().toISOString(),
        clock_offset_ms: Number(r.clock_offset_ms) || 0,
        pending_queue_count: Number(r.pending_queue_count) || 0,
        status: r.status || 'ONLINE',
        app_version: r.app_version || '1.0',
        last_command: r.last_command || '',
        last_command_time: r.last_command_time ? new Date(r.last_command_time).toISOString() : undefined,
        created_at: r.created_at ? new Date(r.created_at).toISOString() : undefined,
        updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : undefined
      }));
    }
  } catch (e) {}

  if (list.length === 0) {
    list = readJsonFile<KioskTerminal[]>(KIOSK_TERMINALS_FILE, []) || [];
  }

  // Compute realtime online status (heartbeat in last 30 seconds)
  const now = Date.now();
  return (list || []).map(item => {
    const lastSeenTime = new Date(item.last_seen).getTime();
    const secondsAgo = Math.max(0, Math.floor((now - lastSeenTime) / 1000));
    const isOnline = secondsAgo <= 30;
    return {
      ...item,
      seconds_ago: secondsAgo,
      is_online: isOnline,
      status: isOnline ? 'ONLINE' : 'OFFLINE'
    };
  });
}

export async function upsertKioskHeartbeat(data: {
  terminalId?: string;
  terminal_id?: string;
  name?: string;
  ipAddress?: string;
  current_ip?: string;
  userAgent?: string;
  clockOffsetMs?: number;
  clock_offset?: number;
  pendingCount?: number;
  antrean_lokal?: number;
  appVersion?: string;
}): Promise<KioskTerminal> {
  const terminalId = (data.terminal_id || data.terminalId || 'KIOSK-POS-DEFAULT').trim().toUpperCase();
  const nowIso = new Date().toISOString();
  const offset = Number(data.clock_offset !== undefined ? data.clock_offset : data.clockOffsetMs) || 0;
  const pending = Math.max(0, Number(data.antrean_lokal !== undefined ? data.antrean_lokal : data.pendingCount) || 0);

  const existingList = await getAllKioskTerminals();
  const existing = existingList.find(t => t.terminal_id === terminalId);
  const name = (data.name || existing?.name || terminalId).trim();
  const ipAddress = (data.current_ip || data.ipAddress || existing?.ip_address || '').trim();

  const terminalRecord: KioskTerminal = {
    terminal_id: terminalId,
    name,
    ip_address: ipAddress,
    user_agent: data.userAgent || existing?.user_agent || '',
    last_seen: nowIso,
    clock_offset_ms: offset,
    pending_queue_count: pending,
    status: 'ONLINE',
    app_version: data.appVersion || existing?.app_version || '1.0',
    last_command: existing?.last_command || '',
    last_command_time: existing?.last_command_time || undefined,
    updated_at: nowIso,
    created_at: existing?.created_at || nowIso,
    is_online: true,
    seconds_ago: 0
  };

  try {
    await safeDbQuery(
      `INSERT INTO kiosk_terminals 
        (terminal_id, name, ip_address, user_agent, last_seen, clock_offset_ms, pending_queue_count, status, app_version, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (terminal_id) DO UPDATE SET
         name = COALESCE(NULLIF(EXCLUDED.name, ''), kiosk_terminals.name),
         ip_address = COALESCE(NULLIF(EXCLUDED.ip_address, ''), kiosk_terminals.ip_address),
         user_agent = COALESCE(NULLIF(EXCLUDED.user_agent, ''), kiosk_terminals.user_agent),
         last_seen = EXCLUDED.last_seen,
         clock_offset_ms = EXCLUDED.clock_offset_ms,
         pending_queue_count = EXCLUDED.pending_queue_count,
         status = 'ONLINE',
         app_version = EXCLUDED.app_version,
         updated_at = EXCLUDED.updated_at`,
      [
        terminalRecord.terminal_id,
        terminalRecord.name,
        terminalRecord.ip_address,
        terminalRecord.user_agent,
        terminalRecord.last_seen,
        terminalRecord.clock_offset_ms,
        terminalRecord.pending_queue_count,
        'ONLINE',
        terminalRecord.app_version,
        terminalRecord.updated_at
      ]
    );
  } catch (e) {}

  // File fallback
  const allFromFile = readJsonFile<KioskTerminal[]>(KIOSK_TERMINALS_FILE, []) || [];
  const idx = allFromFile.findIndex(t => t.terminal_id === terminalId);
  if (idx !== -1) {
    allFromFile[idx] = terminalRecord;
  } else {
    allFromFile.push(terminalRecord);
  }
  writeJsonFile(KIOSK_TERMINALS_FILE, allFromFile);

  return terminalRecord;
}

export async function recordKioskCommandExecution(terminalId: string, command: string): Promise<void> {
  const cleanId = terminalId.trim().toUpperCase();
  const nowIso = new Date().toISOString();
  try {
    await safeDbQuery(
      'UPDATE kiosk_terminals SET last_command = $1, last_command_time = NOW(), updated_at = NOW() WHERE terminal_id = $2',
      [command, cleanId]
    );
  } catch (e) {}

  const allFromFile = readJsonFile<KioskTerminal[]>(KIOSK_TERMINALS_FILE, []) || [];
  const target = allFromFile.find(t => t.terminal_id === cleanId);
  if (target) {
    target.last_command = command;
    target.last_command_time = nowIso;
    target.updated_at = nowIso;
    writeJsonFile(KIOSK_TERMINALS_FILE, allFromFile);
  }
}

export async function updateKioskTerminalName(terminalId: string, name: string): Promise<boolean> {
  const cleanId = terminalId.trim().toUpperCase();
  const cleanName = name.trim();
  try {
    await safeDbQuery('UPDATE kiosk_terminals SET name = $1, updated_at = NOW() WHERE terminal_id = $2', [cleanName, cleanId]);
  } catch (e) {}

  const allFromFile = readJsonFile<KioskTerminal[]>(KIOSK_TERMINALS_FILE, []) || [];
  const target = allFromFile.find(t => t.terminal_id === cleanId);
  if (target) {
    target.name = cleanName;
    target.updated_at = new Date().toISOString();
    writeJsonFile(KIOSK_TERMINALS_FILE, allFromFile);
  }
  return true;
}

export async function deleteKioskTerminal(terminalId: string): Promise<boolean> {
  const cleanId = terminalId.trim().toUpperCase();
  try {
    await safeDbQuery('DELETE FROM kiosk_terminals WHERE terminal_id = $1', [cleanId]);
  } catch (e) {}

  let allFromFile = readJsonFile<KioskTerminal[]>(KIOSK_TERMINALS_FILE, []) || [];
  allFromFile = allFromFile.filter(t => t.terminal_id !== cleanId);
  writeJsonFile(KIOSK_TERMINALS_FILE, allFromFile);
  return true;
}

export async function importEmergencyAttendance(rawItems: any[], sourceTerminalId?: string) {
  const allStudents = await getAllStudents();
  const allAtt = await getAllAttendance();
  const settings = await getSettings();

  const parseTimeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const modifier = match[3] ? match[3].toUpperCase() : null;
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const results: any[] = [];
  let successCount = 0;
  let duplicateCount = 0;
  let notFoundCount = 0;

  for (const item of rawItems) {
    const rawBarcode = String(item.barcode || item.Barcode || item.qrCode || item.studentId || item.NISN || item.nisn || '').trim();
    const rawType = String(item.type || item.Sesi || item.sesi || item.typePresensi || 'ARRIVAL').trim().toUpperCase();
    const targetType: 'ARRIVAL' | 'DEPARTURE' = rawType.includes('PULANG') || rawType === 'DEPARTURE' ? 'DEPARTURE' : 'ARRIVAL';

    if (!rawBarcode) {
      continue;
    }

    // Parse timestamp
    let scanDate: Date;
    const rawTime = item.timestamp || item.Timestamp_Kalibrasi || item.Timestamp_Lokal || item.waktu || item.time || item.tanggal;
    if (rawTime) {
      scanDate = new Date(rawTime);
      if (isNaN(scanDate.getTime())) {
        scanDate = new Date();
      }
    } else {
      scanDate = new Date();
    }

    const dateStr = getWIBDateString(scanDate);
    const student = allStudents.find(s => 
      String(s.nisn).trim() === rawBarcode ||
      String(s.qr_code).trim() === rawBarcode ||
      String(s.id).trim() === rawBarcode ||
      String(s.nis).trim() === rawBarcode
    );

    if (!student) {
      notFoundCount++;
      results.push({
        barcode: rawBarcode,
        studentName: item.studentName || item.Nama_Siswa || item.name || 'Siswa Tidak Dikenal',
        studentClass: item.studentClass || item.Kelas || '-',
        date: dateStr,
        time: getWIBTimeString(scanDate),
        type: targetType,
        status: 'STUDENT_NOT_FOUND',
        message: `Siswa dengan barcode/NISN '${rawBarcode}' tidak ditemukan dalam database`
      });
      continue;
    }

    // Anti-duplication check: student_id + dateStr + type
    const isDuplicate = allAtt.some(a => 
      a.student_id === student.id &&
      a.type === targetType &&
      getWIBDateString(new Date(a.timestamp)) === dateStr
    );

    if (isDuplicate) {
      duplicateCount++;
      results.push({
        barcode: rawBarcode,
        studentId: student.id,
        studentName: student.name,
        studentClass: `${student.year} ${student.class}`,
        date: dateStr,
        time: getWIBTimeString(scanDate),
        type: targetType,
        status: 'DUPLICATE_SKIPPED',
        message: `Data presensi ${targetType === 'DEPARTURE' ? 'Pulang' : 'Datang'} sudah ada pada ${dateStr} (dilewati)`
      });
      continue;
    }

    // Determine status LATE / PRESENT
    const dayEn = getWIBDayNameEnglish(scanDate);
    const daySchedule = settings?.schedule?.[dayEn] || settings?.schedule?.['Monday'] || { arrivalLate: '07:15' };
    const scanTimeStr = getWIBTimeString(scanDate);
    const scanMins = parseTimeToMinutes(scanTimeStr);
    const lateMins = parseTimeToMinutes(daySchedule.arrivalLate || '07:15');

    let attStatus: 'PRESENT' | 'LATE' = 'PRESENT';
    if (targetType === 'ARRIVAL' && lateMins > 0 && scanMins > lateMins) {
      attStatus = 'LATE';
    }

    const timestampStr = scanDate.toISOString();
    const newRecord = await recordAttendance({
      student_id: student.id,
      timestamp: timestampStr,
      status: attStatus,
      type: targetType
    });

    allAtt.push(newRecord);
    successCount++;

    results.push({
      barcode: rawBarcode,
      studentId: student.id,
      studentName: student.name,
      studentClass: `${student.year} ${student.class}`,
      date: dateStr,
      time: scanTimeStr,
      type: targetType,
      status: 'INSERTED',
      attendanceStatus: attStatus,
      message: `Presensi ${targetType === 'DEPARTURE' ? 'Pulang' : 'Datang'} (${attStatus === 'LATE' ? 'Terlambat' : 'Tepat Waktu'}) berhasil dicatat`
    });
  }

  return {
    success: true,
    totalParsed: rawItems.length,
    successCount,
    duplicateCount,
    notFoundCount,
    terminalId: sourceTerminalId || 'IMPORT-CADANGAN',
    results
  };
}




