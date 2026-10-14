import { Pool } from 'pg';

export interface ScheduleDay {
  arrivalStart: string;
  arrivalLate: string;
  arrivalEnd: string;
  departureStart: string;
  departureEnd: string;
}

export interface Student {
  id: string;
  name: string;
  nisn: string;
  nis: string;
  class: string;
  year: string;
  qrCode: string;
  customFields?: Record<string, string>;
  photo?: string;
}

export interface Teacher {
  id: string;
  name: string;
  whatsapp: string;
  class: string;
  year: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  timestamp: string; // ISO date string
  status: 'PRESENT' | 'LATE';
  type: 'ARRIVAL' | 'DEPARTURE';
}

export interface Settings {
  schedule: Record<string, ScheduleDay>;
  adminUsername?: string;
  adminPassword?: string;
  studentCustomFields: string[];
  waApiUrl: string;
  waApiKey: string;
  waApiSecret: string;
  scannerType: 'webcam' | 'external';
}

export interface AppDatabase {
  students: Student[];
  teachers: Teacher[];
  attendance: Attendance[];
  settings: Settings;
}

export const pool = new Pool({
  user: process.env.DB_USER || 'admin_presensi',
  database: process.env.DB_NAME || 'db_presensi',
  password: process.env.DB_PASSWORD || '',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  connectionTimeoutMillis: 2000, // Fail fast if DB is unreachable
  max: 20, // Connection pool size limit
  idleTimeoutMillis: 30000
});

pool.on('error', (err: any, client) => {
  if (err.code !== 'ECONNREFUSED') {
    console.error('[DATABASE] Unexpected error on idle client:', err.message);
  }
});

/**
 * Resilient Database Query Wrapper
 * Menangkap error database secara otomatis tanpa menyebabkan aplikasi crash
 */
export async function safeDbQuery<T = any>(
  text: string, 
  params?: any[]
): Promise<{ rows: T[]; rowCount: number; success: boolean; error?: any }> {
  try {
    const res = await pool.query(text, params);
    return {
      rows: (res.rows || []) as T[],
      rowCount: res.rowCount || 0,
      success: true
    };
  } catch (err: any) {
    if (err.code !== 'ECONNREFUSED') {
      console.warn(`[DATABASE CATCH] Query warning (${err.code || 'UNKNOWN'}):`, err.message);
    }
    return {
      rows: [],
      rowCount: 0,
      success: false,
      error: err
    };
  }
}

export async function initDb() {
  try {
    // 1. CREATE TABLES
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pengaturan (
        id INTEGER PRIMARY KEY DEFAULT 1,
        nama_website VARCHAR(255) DEFAULT 'Panel Admin SMK',
        judul_aplikasi VARCHAR(255) DEFAULT 'Sistem Presensi Siswa',
        judul_piket VARCHAR(255) DEFAULT 'Portal Guru Piket & Perizinan',
        jam_masuk VARCHAR(50) DEFAULT '12:00',
        jam_pulang VARCHAR(50) DEFAULT '13:00',
        logo TEXT,
        favicon TEXT,
        wa_mode VARCHAR(50) DEFAULT 'manual',
        wa_endpoint TEXT,
        wa_api_url TEXT,
        wa_api_key TEXT,
        wa_api_secret TEXT,
        wa_schedule_time VARCHAR(50) DEFAULT '15:00',
        wa_cron_time VARCHAR(50) DEFAULT '15:00',
        wa_schedule_days JSONB DEFAULT '["1","2","3","4","5"]'::jsonb,
        wa_cron_days JSONB DEFAULT '["1","2","3","4","5"]'::jsonb,
        scanner_type VARCHAR(50) DEFAULT 'webcam',
        barcode_type VARCHAR(50) DEFAULT 'qrcode',
        suara_sukses VARCHAR(50) DEFAULT 'default1',
        suara_gagal VARCHAR(50) DEFAULT 'default2',
        file_suara_sukses TEXT,
        file_suara_gagal TEXT,
        data JSONB DEFAULT '{}'::jsonb
      );
      
      CREATE TABLE IF NOT EXISTS students (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        nisn VARCHAR(255) NOT NULL UNIQUE,
        nis VARCHAR(255),
        class VARCHAR(255) NOT NULL,
        year VARCHAR(255) NOT NULL,
        qr_code VARCHAR(255),
        custom_fields JSONB DEFAULT '{}'::jsonb,
        photo TEXT,
        foto TEXT
      );

      CREATE TABLE IF NOT EXISTS teachers (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        whatsapp VARCHAR(255) NOT NULL,
        class VARCHAR(255) NOT NULL,
        year VARCHAR(255) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS attendance (
        id VARCHAR(255) PRIMARY KEY,
        student_id VARCHAR(255) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        timestamp VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL,
        type VARCHAR(50) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS akun_piket (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS akun_admin (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS izin_siswa (
        id VARCHAR(255) PRIMARY KEY,
        nisn VARCHAR(255) NOT NULL,
        tanggal_mulai VARCHAR(255) NOT NULL,
        tanggal_selesai VARCHAR(255) NOT NULL,
        keterangan VARCHAR(255) NOT NULL,
        dibuat_pada VARCHAR(255) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS rombel_status (
        class_name VARCHAR(255) PRIMARY KEY,
        status VARCHAR(50) DEFAULT 'AKTIF',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS akun_guru (
        id VARCHAR(255) PRIMARY KEY,
        teacher_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        nip VARCHAR(255) DEFAULT '',
        username VARCHAR(255) NOT NULL UNIQUE,
        password_plain VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'AKTIF',
        role VARCHAR(50) DEFAULT 'GURU',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tugas_tambahan_categories (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        nama VARCHAR(255),
        code VARCHAR(100) DEFAULT '',
        kode VARCHAR(100) DEFAULT '',
        description TEXT DEFAULT '',
        keterangan TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tugas_tambahan_guru (
        id VARCHAR(255) PRIMARY KEY,
        teacher_id VARCHAR(255) NOT NULL,
        teacher_name VARCHAR(255) NOT NULL,
        nip VARCHAR(255) DEFAULT '',
        category_id VARCHAR(255) NOT NULL,
        category_name VARCHAR(255) NOT NULL,
        keterangan TEXT DEFAULT '',
        sk_nomor VARCHAR(255) DEFAULT '',
        status VARCHAR(50) DEFAULT 'AKTIF',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS akun_siswa (
        id VARCHAR(255) PRIMARY KEY,
        student_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        nisn VARCHAR(255) NOT NULL UNIQUE,
        nis VARCHAR(255) DEFAULT '',
        class VARCHAR(255) DEFAULT '',
        username VARCHAR(255) NOT NULL UNIQUE,
        password_plain VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'AKTIF',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS jadwal_piket (
        id VARCHAR(255) PRIMARY KEY,
        day_name VARCHAR(50) NOT NULL,
        day_index INTEGER NOT NULL,
        teacher_id VARCHAR(255) NOT NULL,
        teacher_name VARCHAR(255) NOT NULL,
        nip VARCHAR(255) DEFAULT '',
        keterangan VARCHAR(255) DEFAULT 'Guru Piket',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS jadwal_kbm (
        id VARCHAR(255) PRIMARY KEY,
        teacher_id VARCHAR(255) NOT NULL,
        teacher_name VARCHAR(255) DEFAULT '',
        mapel_name VARCHAR(255) NOT NULL,
        rombel_id VARCHAR(255) NOT NULL,
        hari VARCHAR(50) NOT NULL,
        jp_list JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_students_nisn ON students(nisn);
      CREATE INDEX IF NOT EXISTS idx_students_qr_code ON students(qr_code);
      CREATE INDEX IF NOT EXISTS idx_students_class_year ON students(class, year);
      CREATE INDEX IF NOT EXISTS idx_teachers_class_year ON teachers(class, year);
      CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance(timestamp);
      CREATE INDEX IF NOT EXISTS idx_attendance_type ON attendance(type);
      CREATE INDEX IF NOT EXISTS idx_izin_siswa_nisn ON izin_siswa(nisn);
      CREATE INDEX IF NOT EXISTS idx_izin_siswa_tanggal ON izin_siswa(tanggal_mulai, tanggal_selesai);
      CREATE INDEX IF NOT EXISTS idx_akun_guru_teacher_id ON akun_guru(teacher_id);
      CREATE INDEX IF NOT EXISTS idx_akun_guru_username ON akun_guru(username);
      CREATE INDEX IF NOT EXISTS idx_jadwal_piket_day ON jadwal_piket(day_name, day_index);
      CREATE INDEX IF NOT EXISTS idx_jadwal_piket_teacher ON jadwal_piket(teacher_id);
      CREATE INDEX IF NOT EXISTS idx_jadwal_kbm_teacher ON jadwal_kbm(teacher_id);
      CREATE INDEX IF NOT EXISTS idx_jadwal_kbm_rombel_hari ON jadwal_kbm(rombel_id, hari);
    `);

    // 2. AUTOMATED SCHEMA MIGRATION / SYNC (ALTER TABLE ... ADD COLUMN IF NOT EXISTS)
    const tablesToEnsure = [
      `CREATE TABLE IF NOT EXISTS rombel_status (
        class_name VARCHAR(255) PRIMARY KEY,
        status VARCHAR(50) DEFAULT 'AKTIF',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS tahun_ajaran (
        id VARCHAR(255) PRIMARY KEY,
        nama VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT false,
        dibuat_pada VARCHAR(255)
      );`,
      `CREATE TABLE IF NOT EXISTS akun_guru (
        id VARCHAR(255) PRIMARY KEY,
        teacher_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        nip VARCHAR(255) DEFAULT '',
        username VARCHAR(255) NOT NULL UNIQUE,
        password_plain VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'AKTIF',
        role VARCHAR(50) DEFAULT 'GURU',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS jadwal_piket (
        id VARCHAR(255) PRIMARY KEY,
        day_name VARCHAR(50) NOT NULL,
        day_index INTEGER NOT NULL,
        teacher_id VARCHAR(255) NOT NULL,
        teacher_name VARCHAR(255) NOT NULL,
        nip VARCHAR(255) DEFAULT '',
        keterangan VARCHAR(255) DEFAULT 'Guru Piket',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS master_tugas_piket (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS kbm_categories (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        color VARCHAR(50) DEFAULT '#2563eb',
        is_teaching BOOLEAN DEFAULT true,
        description TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS kbm_schedules (
        id VARCHAR(255) PRIMARY KEY,
        day_name VARCHAR(50) NOT NULL,
        day_index INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT true,
        periods JSONB NOT NULL DEFAULT '[]'::jsonb,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS aturan_kehadiran_guru (
        id VARCHAR(255) PRIMARY KEY,
        school_latitude DOUBLE PRECISION DEFAULT -6.2088,
        school_longitude DOUBLE PRECISION DEFAULT 106.8456,
        school_location_name VARCHAR(255) DEFAULT 'SMK Kampus Utama',
        max_distance_meters INTEGER DEFAULT 100,
        min_student_verification INTEGER DEFAULT 2,
        allow_manual_verification BOOLEAN DEFAULT false,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS bebas_kehadiran (
        id VARCHAR(255) PRIMARY KEY,
        start_date VARCHAR(20) NOT NULL,
        end_date VARCHAR(20) NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) DEFAULT 'sekolah',
        description TEXT DEFAULT '',
        rombel_scope TEXT DEFAULT 'all',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS kiosk_terminals (
        terminal_id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) DEFAULT '',
        ip_address VARCHAR(100) DEFAULT '',
        user_agent TEXT DEFAULT '',
        last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        clock_offset_ms INTEGER DEFAULT 0,
        pending_queue_count INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'ONLINE',
        app_version VARCHAR(50) DEFAULT '1.0',
        last_command VARCHAR(100) DEFAULT '',
        last_command_time TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE INDEX IF NOT EXISTS idx_kiosk_terminals_last_seen ON kiosk_terminals(last_seen);`,
      `ALTER TABLE kiosk_terminals ADD COLUMN IF NOT EXISTS last_command VARCHAR(100) DEFAULT '';`,
      `ALTER TABLE kiosk_terminals ADD COLUMN IF NOT EXISTS last_command_time TIMESTAMP WITH TIME ZONE;`,
      `CREATE TABLE IF NOT EXISTS kehadiran_kbm_guru (
        id VARCHAR(255) PRIMARY KEY,
        date VARCHAR(20) NOT NULL,
        teacher_id VARCHAR(255) NOT NULL,
        teacher_name VARCHAR(255) NOT NULL,
        nip VARCHAR(255) DEFAULT '',
        rombel_id VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        jp_list JSONB NOT NULL DEFAULT '[]'::jsonb,
        jp_start INTEGER DEFAULT 1,
        jp_end INTEGER DEFAULT 1,
        total_jp INTEGER DEFAULT 1,
        topic TEXT DEFAULT '',
        location_status VARCHAR(50) DEFAULT 'VALID',
        location_coords JSONB DEFAULT '{}'::jsonb,
        location_distance DOUBLE PRECISION DEFAULT 0,
        verified_students JSONB DEFAULT '[]'::jsonb,
        verification_count INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'HADIR',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS tugas_tambahan_categories (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        nama VARCHAR(255),
        code VARCHAR(100) DEFAULT '',
        kode VARCHAR(100) DEFAULT '',
        description TEXT DEFAULT '',
        keterangan TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS tugas_tambahan_guru (
        id VARCHAR(255) PRIMARY KEY,
        teacher_id VARCHAR(255) NOT NULL,
        teacher_name VARCHAR(255) NOT NULL,
        nip VARCHAR(255) DEFAULT '',
        category_id VARCHAR(255) NOT NULL,
        category_name VARCHAR(255) NOT NULL,
        keterangan TEXT DEFAULT '',
        sk_nomor VARCHAR(255) DEFAULT '',
        status VARCHAR(50) DEFAULT 'AKTIF',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS akun_siswa (
        id VARCHAR(255) PRIMARY KEY,
        student_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        nisn VARCHAR(255) NOT NULL UNIQUE,
        nis VARCHAR(255) DEFAULT '',
        class VARCHAR(255) DEFAULT '',
        username VARCHAR(255) NOT NULL UNIQUE,
        password_plain VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'AKTIF',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS perangkat_categories (
        id VARCHAR(255) PRIMARY KEY,
        nama VARCHAR(255) NOT NULL,
        target_jumlah INTEGER DEFAULT 1,
        tipe_pengadaan VARCHAR(50) DEFAULT 'DARI_GURU',
        file_kurikulum_url TEXT,
        file_kurikulum_name VARCHAR(255),
        gdrive_folder_id VARCHAR(255),
        tahun_ajaran VARCHAR(50) DEFAULT '',
        semester VARCHAR(20) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS perangkat_dokumen (
        id VARCHAR(255) PRIMARY KEY,
        category_id VARCHAR(255) NOT NULL,
        teacher_id VARCHAR(255) NOT NULL,
        teacher_name VARCHAR(255) DEFAULT '',
        file_name VARCHAR(255) NOT NULL,
        file_size BIGINT DEFAULT 0,
        file_path TEXT,
        gdrive_file_id VARCHAR(255),
        gdrive_web_view_link TEXT,
        status VARCHAR(50) DEFAULT 'MENUNGGU_VERIFIKASI',
        catatan_revisi TEXT DEFAULT '',
        tahun_ajaran VARCHAR(50) DEFAULT '',
        semester VARCHAR(20) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS perangkat_pengesahan (
        id VARCHAR(255) PRIMARY KEY,
        teacher_id VARCHAR(255) NOT NULL,
        teacher_name VARCHAR(255) DEFAULT '',
        nip VARCHAR(255) DEFAULT '',
        tahun_ajaran VARCHAR(50) NOT NULL,
        semester VARCHAR(20) NOT NULL,
        kepsek_id VARCHAR(255),
        kepsek_name VARCHAR(255) DEFAULT '',
        tipe_pengesahan VARCHAR(50) NOT NULL,
        ttd_image_base64 TEXT,
        qr_signature_data JSONB DEFAULT '{}'::jsonb,
        tanggal_pengesahan VARCHAR(50),
        status VARCHAR(50) DEFAULT 'DISAHKAN',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS perangkat_approval_logs (
        id VARCHAR(255) PRIMARY KEY,
        dokumen_id VARCHAR(255),
        teacher_id VARCHAR(255),
        user_id VARCHAR(255),
        user_name VARCHAR(255),
        role VARCHAR(50),
        action VARCHAR(50),
        catatan TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS mata_pelajaran (
        id VARCHAR(255) PRIMARY KEY,
        kode_mapel VARCHAR(50) UNIQUE NOT NULL,
        nama_mapel VARCHAR(255) NOT NULL,
        kelompok VARCHAR(100) DEFAULT 'Muatan Kejuruan',
        keterangan TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS jadwal_kbm (
        id VARCHAR(255) PRIMARY KEY,
        teacher_id VARCHAR(255) NOT NULL,
        teacher_name VARCHAR(255) DEFAULT '',
        mapel_name VARCHAR(255) NOT NULL,
        rombel_id VARCHAR(255) NOT NULL,
        hari VARCHAR(50) NOT NULL,
        jp_list JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS menu_settings (
        menu_key VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        description TEXT DEFAULT '',
        is_enabled BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );`
    ];

    for (const tblSql of tablesToEnsure) {
      try {
        await pool.query(tblSql);
      } catch (e) {}
    }

    // Seed default menu_settings jika masih kosong
    try {
      const existingMenuSettings = await pool.query('SELECT COUNT(*) FROM menu_settings');
      if (parseInt(existingMenuSettings.rows[0].count) === 0) {
        const defaultMenus = [
          // 1. Portal Kepala Sekolah
          ['perangkat-supervisi', 'Supervisi Perangkat Ajar', 'kepsek', 'Monitoring kelengkapan berkas perangkat ajar guru secara terpusat', true],
          ['perangkat-pengesahan', 'Validasi & Pengesahan Perangkat', 'kepsek', 'Tanda tangan digital dan penerbitan barcode QR pengesahan resmi', true],
          ['monitoring', 'Monitoring Kehadiran Guru', 'kepsek', 'Rekapitulasi jam mengajar, kehadiran KBM, dan keterlambatan guru', true],
          ['wali-kelas-kepsek', 'Monitoring Kelas Siswa', 'kepsek', 'Supervisi monitoring presensi siswa dan jurnal kelas', true],

          // 2. Tugas Tambahan Guru
          ['wali-kelas', 'Menu Wali Kelas', 'tugas-tambahan', 'Akses kelola data presensi harian, izin, dan rekap siswa binaan kelas', true],
          ['presensi-kesiswaan', 'Monitoring Presensi Siswa', 'tugas-tambahan', 'Monitoring kehadiran siswa menyeluruh untuk Waka Kesiswaan & Guru BK', true],
          ['perangkat-verifikasi', 'Verifikasi Perangkat Ajar', 'tugas-tambahan', 'Pemeriksaan telaah modul & materi ajar guru oleh Waka Kurikulum', true],
          ['perangkat-setting', 'Pengaturan Perangkat Ajar', 'tugas-tambahan', 'Penentuan instrumen verifikasi perangkat ajar guru oleh Kurikulum', true],
          ['piket', 'Tugas Piket & Perizinan', 'tugas-tambahan', 'Akses operasional guru piket dan persetujuan izin terlambat/keluar siswa', true],

          // 3. Portal Guru
          ['perangkat-guru', 'Upload Perangkat Ajar', 'guru', 'Pengunggahan modul ajar, ATP, CP, dan berkas administrasi guru', true],
          ['jadwal-kbm', 'Jadwal JP KBM', 'guru', 'Informasi jam mengajar tatap muka guru per minggu', true],
          ['kehadiran', 'Kehadiran Guru', 'guru', 'Pencatatan presensi masuk KBM kelas dan riwayat kehadiran guru', true],
          ['kelas-diampu', 'Kelas Diampu', 'guru', 'Daftar kelas dinamis yang diampu guru berdasarkan jadwal KBM aktif', true],
          ['materi-tugas', 'Materi & Tugas', 'guru', 'Distribusi modul materi bacaan, pengumpulan tugas, dan projek kelas', true],
          ['rencana-asesmen', 'Rencana Asesmen', 'guru', 'Perencanaan asesmen sumatif lingkup materi, ASTS, dan ASAS/ASAT', true],
          ['generator-soal', 'Generator Soal AI', 'guru', 'Integrasi pembuatan soal otomatis berbasis AI dari cakupan materi', true],
          ['bank-soal', 'Bank Soal', 'guru', 'Repositori butir soal dan modul import manual format dokumen Word', true],
          ['atur-asesmen', 'Atur Asesmen', 'guru', 'Perakitan ujian online kelas, token akses ujian, dan timer pengerjaan', true],
          ['hasil-penilaian', 'Hasil Penilaian', 'guru', 'Rekapitulasi nilai rapor siswa, sinkronisasi ujian, dan import Excel', true],

          // 4. Portal Siswa
          ['siswa-dashboard', 'Dashboard Siswa', 'siswa', 'Ringkasan presensi harian, agenda hari ini, dan aktivitas belajar siswa', true],
          ['siswa-jadwal', 'Jadwal KBM', 'siswa', 'Tabel jadwal mata pelajaran dan ruang kelas harian', true],
          ['siswa-materi-tugas', 'Materi & Tugas', 'siswa', 'Unduh materi pelajaran dan pengunggahan berkas tugas belajar', true],
          ['siswa-asesmen', 'Asesmen Ujian', 'siswa', 'Daftar ujian dan kuis daring yang harus dikerjakan siswa', true],
          ['siswa-hasil-belajar', 'Hasil Belajar', 'siswa', 'Transkrip nilai tugas, harian, ujian, dan rekap capaian belajar', true]
        ];

        for (const [key, name, cat, desc, enabled] of defaultMenus) {
          try {
            await pool.query(
              'INSERT INTO menu_settings (menu_key, name, category, description, is_enabled) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (menu_key) DO NOTHING',
              [key, name, cat, desc, enabled]
            );
          } catch (eSeed) {}
        }
      }
    } catch (eMenu) {}

    // Seed default tugas_tambahan_categories if empty
    try {
      const existingTugasCats = await pool.query('SELECT COUNT(*) FROM tugas_tambahan_categories');
      if (parseInt(existingTugasCats.rows[0].count) === 0) {
        const defaultCats = [
          ['cat-1', 'Waka Kurikulum', 'WAKA_KURIKULUM', 'Membidangi kurikulum, pembelajaran, dan supervisi akademik'],
          ['cat-2', 'Waka Kesiswaan', 'WAKA_KESISWAAN', 'Membidangi ketertiban, kedisiplinan, dan kegiatan siswa'],
          ['cat-3', 'Waka Humas', 'WAKA_HUMAS', 'Membidangi hubungan masyarakat dan dunia industri / kerja'],
          ['cat-4', 'Waka Sarpras', 'WAKA_SARPRAS', 'Membidangi sarana prasarana dan inventaris sekolah'],
          ['cat-5', 'Guru BK', 'GURU_BK', 'Bimbingan konseling dan penanganan perkembangan siswa'],
          ['cat-6', 'Ka Konsentrasi Keahlian', 'KA_KONSENTRASI_KEAHLIAN', 'Ketua / Koordinator Program & Konsentrasi Keahlian']
        ];
        for (const [id, name, code, desc] of defaultCats) {
          try {
            await pool.query(
              'INSERT INTO tugas_tambahan_categories (id, name, nama, code, kode, description, keterangan) VALUES ($1, $2, $2, $3, $3, $4, $4) ON CONFLICT (id) DO NOTHING',
              [id, name, code, desc]
            );
          } catch (e) {
            try {
              await pool.query(
                'INSERT INTO tugas_tambahan_categories (id, name, code, description) VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO NOTHING',
                [id, name, code, desc]
              );
            } catch (e2) {}
          }
        }
      }
    } catch (e) {}

    // Seed default perangkat_categories jika masih kosong
    try {
      const existingPerangkatCats = await pool.query('SELECT COUNT(*) FROM perangkat_categories');
      if (parseInt(existingPerangkatCats.rows[0].count) === 0) {
        const defaultPerangkat = [
          ['pkg-1', 'Capaian Pembelajaran (CP)', 1, 'DARI_GURU', null, null],
          ['pkg-2', 'Alur Tujuan Pembelajaran (ATP)', 1, 'DARI_GURU', null, null],
          ['pkg-3', 'Modul Ajar / RPP', 2, 'DARI_GURU', null, null],
          ['pkg-4', 'Program Tahunan (Prota)', 1, 'DARI_GURU', null, null],
          ['pkg-5', 'Program Semester (Promes)', 1, 'DARI_GURU', null, null],
          ['pkg-6', 'Kriteria Ketercapaian Tujuan Pembelajaran (KKTP)', 1, 'DARI_GURU', null, null],
          ['pkg-7', 'Kalender Pendidikan (Kaldik)', 1, 'DARI_KURIKULUM', null, 'Kalender_Pendidikan.pdf'],
          ['pkg-8', 'Jadwal & SK Pembagian Tugas KBM', 1, 'DARI_KURIKULUM', null, 'SK_Pembagian_Tugas_KBM.pdf']
        ];
        for (const [id, nama, target, tipe, url, fname] of defaultPerangkat) {
          try {
            await pool.query(
              'INSERT INTO perangkat_categories (id, nama, target_jumlah, tipe_pengadaan, file_kurikulum_url, file_kurikulum_name) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING',
              [id, nama, target, tipe, url, fname]
            );
          } catch (errPkg) {}
        }
      }
    } catch (e) {}

    // Tabel tugas_tambahan_categories - Pastikan kolom nama, name, kode, code, keterangan, description ada
    const tugasCatColumns = [
      'nama VARCHAR(255)',
      'name VARCHAR(255)',
      'kode VARCHAR(100) DEFAULT \'\'',
      'code VARCHAR(100) DEFAULT \'\'',
      'keterangan TEXT DEFAULT \'\'',
      'description TEXT DEFAULT \'\''
    ];
    for (const col of tugasCatColumns) {
      try {
        await pool.query(`ALTER TABLE tugas_tambahan_categories ADD COLUMN IF NOT EXISTS ${col};`);
      } catch (e) {}
    }
    try {
      await pool.query(`ALTER TABLE tugas_tambahan_categories ALTER COLUMN name DROP NOT NULL;`);
    } catch (e) {}

    // Tabel tugas_tambahan_guru - Pastikan semua kolom penting dan aliasnya tersedia
    const tugasGuruColumns = [
      'teacher_id VARCHAR(255)',
      'guru_id VARCHAR(255)',
      'teacher_name VARCHAR(255)',
      'nama_guru VARCHAR(255)',
      'nip VARCHAR(255) DEFAULT \'\'',
      'category_id VARCHAR(255)',
      'kategori_id VARCHAR(255)',
      'category_name VARCHAR(255)',
      'nama_kategori VARCHAR(255)',
      'keterangan TEXT DEFAULT \'\'',
      'description TEXT DEFAULT \'\'',
      'sk_nomor VARCHAR(255) DEFAULT \'\'',
      'nomor_sk VARCHAR(255) DEFAULT \'\'',
      'no_sk VARCHAR(255) DEFAULT \'\'',
      'status VARCHAR(50) DEFAULT \'AKTIF\'',
      'whatsapp VARCHAR(50) DEFAULT \'\'',
      'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
      'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
    ];
    for (const col of tugasGuruColumns) {
      try {
        await pool.query(`ALTER TABLE tugas_tambahan_guru ADD COLUMN IF NOT EXISTS ${col};`);
      } catch (e) {}
    }
    try {
      await pool.query(`ALTER TABLE tugas_tambahan_guru ALTER COLUMN teacher_name DROP NOT NULL;`);
      await pool.query(`ALTER TABLE tugas_tambahan_guru ALTER COLUMN category_name DROP NOT NULL;`);
    } catch (e) {}

    // Seed default master_tugas_piket if empty
    try {
      const existingDuties = await pool.query('SELECT COUNT(*) FROM master_tugas_piket');
      if (parseInt(existingDuties.rows[0].count) === 0) {
        const defaults = [
          ['duty-1', 'Koordinator Piket', 'Memimpin dan mengkoordinasikan kegiatan piket harian'],
          ['duty-2', 'Guru Piket (Umum)', 'Membantu ketertiban dan presensi siswa umum'],
          ['duty-3', 'Guru Piket Gerbang Depan', 'Menjaga dan menyambut siswa di pintu gerbang utama'],
          ['duty-4', 'Guru Piket Gerbang Belakang', 'Memantau akses keluar masuk gerbang belakang'],
          ['duty-5', 'Guru Piket Lantai 1', 'Pengawasan area kelas dan lorong lantai 1'],
          ['duty-6', 'Guru Piket Lantai 2', 'Pengawasan area kelas dan lorong lantai 2'],
          ['duty-7', 'Guru Piket Pos Satpam', 'Koordinasi perizinan dan tamu di pos keamanan'],
          ['duty-8', 'Guru Piket Ruang BK', 'Penanganan siswa terlambat dan konseling']
        ];
        for (const [id, name, desc] of defaults) {
          await pool.query(
            'INSERT INTO master_tugas_piket (id, name, description) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING',
            [id, name, desc]
          );
        }
      }
    } catch (e) {}

    // Tabel students (siswa) - Pastikan kolom status, class, year, photo, foto ada
    const studentsColumns = [
      'status VARCHAR(50) DEFAULT \'AKTIF\'',
      'photo TEXT',
      'foto TEXT',
      'nis VARCHAR(255)',
      'custom_fields JSONB DEFAULT \'{}\'::jsonb'
    ];

    for (const col of studentsColumns) {
      try {
        await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS ${col};`);
      } catch (e) {}
    }

    // Tabel teachers (guru) - Pastikan kolom nip, status, class, year ada
    const teachersColumns = [
      'nip VARCHAR(255) DEFAULT \'\'',
      'status VARCHAR(50) DEFAULT \'AKTIF\'',
      'class VARCHAR(255) DEFAULT \'\'',
      'year VARCHAR(255) DEFAULT \'\''
    ];

    for (const col of teachersColumns) {
      try {
        await pool.query(`ALTER TABLE teachers ADD COLUMN IF NOT EXISTS ${col};`);
      } catch (e) {}
    }

    // Tabel pengaturan
    const pengaturanColumns = [
      'jam_masuk VARCHAR(50) DEFAULT \'12:00\'',
      'jam_pulang VARCHAR(50) DEFAULT \'13:00\'',
      'nama_website VARCHAR(255) DEFAULT \'Panel Admin SMK\'',
      'judul_aplikasi VARCHAR(255) DEFAULT \'Sistem Presensi Siswa\'',
      'judul_piket VARCHAR(255) DEFAULT \'Portal Guru Piket & Perizinan\'',
      'logo TEXT',
      'favicon TEXT',
      'wa_mode VARCHAR(50) DEFAULT \'manual\'',
      'wa_target VARCHAR(50) DEFAULT \'both\'',
      'wa_provider VARCHAR(50) DEFAULT \'fonnte\'',
      'wa_endpoint TEXT',
      'wa_api_url TEXT DEFAULT \'https://api.fonnte.com/send\'',
      'wa_api_key TEXT DEFAULT \'\'',
      'wa_api_secret TEXT DEFAULT \'\'',
      'wa_group_id VARCHAR(255) DEFAULT \'\'',
      'wa_group_name VARCHAR(255) DEFAULT \'Grup Presensi SMK\'',
      'wa_schedule_time VARCHAR(50) DEFAULT \'15:00\'',
      'wa_cron_time VARCHAR(50) DEFAULT \'15:00\'',
      'wa_schedule_days JSONB DEFAULT \'["1","2","3","4","5"]\'::jsonb',
      'wa_cron_days JSONB DEFAULT \'["1","2","3","4","5"]\'::jsonb',
      'scanner_type VARCHAR(50) DEFAULT \'webcam\'',
      'suara_sukses VARCHAR(50) DEFAULT \'default1\'',
      'suara_gagal VARCHAR(50) DEFAULT \'default2\'',
      'file_suara_sukses TEXT',
      'file_suara_gagal TEXT',
      'headmaster_name VARCHAR(255) DEFAULT \'\'',
      'headmaster_nip VARCHAR(100) DEFAULT \'\'',
      'headmaster_whatsapp VARCHAR(100) DEFAULT \'\'',
      'kepala_sekolah_nama VARCHAR(255) DEFAULT \'\'',
      'kepala_sekolah_nip VARCHAR(100) DEFAULT \'\'',
      'kepala_sekolah_whatsapp VARCHAR(100) DEFAULT \'\'',
      'barcode_type VARCHAR(50) DEFAULT \'qrcode\'',
      'headmaster_username VARCHAR(255) DEFAULT \'\'',
      'headmaster_password VARCHAR(255) DEFAULT \'kepsek123\'',
      'headmaster_status VARCHAR(50) DEFAULT \'AKTIF\'',
      'semester VARCHAR(20) DEFAULT \'Ganjil\'',
      'tahun_ajaran VARCHAR(50) DEFAULT \'2024/2025\'',
      'pengesahan_template JSONB DEFAULT \'{}\'::jsonb',
      'perangkat_wa_rekap JSONB DEFAULT \'{}\'::jsonb',
      'data JSONB DEFAULT \'{}\'::jsonb'
    ];

    for (const col of pengaturanColumns) {
      try {
        await pool.query(`ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS ${col};`);
      } catch (e) {}
    }

    // Pastikan tabel tahun_ajaran memiliki kolom semester
    try {
      await pool.query(`ALTER TABLE tahun_ajaran ADD COLUMN IF NOT EXISTS semester VARCHAR(20) DEFAULT 'Ganjil';`);
    } catch (e) {}

    // Pastikan tabel perangkat_dokumen memiliki kolom mapel, sub_mapel, rombel, file_path
    try {
      await pool.query(`ALTER TABLE perangkat_dokumen ADD COLUMN IF NOT EXISTS mapel VARCHAR(255) DEFAULT '';`);
      await pool.query(`ALTER TABLE perangkat_dokumen ADD COLUMN IF NOT EXISTS sub_mapel VARCHAR(255) DEFAULT '';`);
      await pool.query(`ALTER TABLE perangkat_dokumen ADD COLUMN IF NOT EXISTS rombel VARCHAR(255) DEFAULT '';`);
      await pool.query(`ALTER TABLE perangkat_dokumen ADD COLUMN IF NOT EXISTS file_path TEXT;`);
    } catch (e) {}

    // Pastikan tabel nextcloud_settings tersedia untuk integrasi WebDAV
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS nextcloud_settings (
        id INT PRIMARY KEY DEFAULT 1,
        server_url TEXT,
        username TEXT,
        password TEXT,
        base_path TEXT DEFAULT '/Perangkat_Ajar',
        is_configured BOOLEAN DEFAULT FALSE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`);
    } catch (e) {}

    // Pastikan tabel perangkat_pengesahan memiliki kolom mapel, rombel
    try {
      await pool.query(`ALTER TABLE perangkat_pengesahan ADD COLUMN IF NOT EXISTS mapel VARCHAR(255) DEFAULT '';`);
      await pool.query(`ALTER TABLE perangkat_pengesahan ADD COLUMN IF NOT EXISTS rombel VARCHAR(255) DEFAULT '';`);
    } catch (e) {}

    // Seed default mata_pelajaran jika masih kosong
    try {
      const existingMapel = await pool.query('SELECT COUNT(*) FROM mata_pelajaran');
      if (parseInt(existingMapel.rows[0].count) === 0) {
        const defaultMapel = [
          ['mp-1', 'PAIBP', 'Pendidikan Agama Islam dan Budi Pekerti', 'Muatan Umum (A)', 'Pendidikan Agama & Karakter'],
          ['mp-2', 'PPKN', 'Pendidikan Pancasila dan Kewarganegaraan', 'Muatan Umum (A)', 'Pendidikan Kewarganegaraan'],
          ['mp-3', 'BINDO', 'Bahasa Indonesia', 'Muatan Umum (A)', 'Kemampuan Literasi dan Komunikasi Bahasa Indonesia'],
          ['mp-4', 'PJOK', 'Pendidikan Jasmani, Olahraga, dan Kesehatan', 'Muatan Umum (A)', 'Kebugaran jasmani dan kesehatan'],
          ['mp-5', 'SEJ', 'Sejarah Indonesia', 'Muatan Umum (A)', 'Wawasan sejarah nasional'],
          ['mp-6', 'SNB', 'Seni Budaya', 'Muatan Umum (A)', 'Pengembangan apresiasi estetika dan seni'],
          ['mp-7', 'MTK', 'Matematika', 'Muatan Umum (A)', 'Keterampilan berhitung, logika, dan analisis kuantitatif'],
          ['mp-8', 'BING', 'Bahasa Inggris', 'Muatan Umum (A)', 'Kemampuan komunikasi bahasa asing'],
          ['mp-9', 'INFOR', 'Informatika', 'Muatan Kejuruan', 'Dasar logika komputasi dan teknologi informasi'],
          ['mp-10', 'IPAS', 'Projek Ilmu Pengetahuan Alam dan Sosial (IPAS)', 'Muatan Kejuruan', 'Pendekatan sains kontekstual dan sosial'],
          ['mp-11', 'DPK', 'Dasar-Dasar Program Keahlian', 'Muatan Kejuruan', 'Kompetensi kejuruan tingkat dasar'],
          ['mp-12', 'KK', 'Konsentrasi Keahlian', 'Muatan Kejuruan', 'Keahlian teknis dan kompetensi spesifik kejuruan'],
          ['mp-13', 'PKK', 'Projek Kreatif dan Kewirausahaan (PKK)', 'Muatan Kejuruan', 'Produk kreatif, inovasi, dan bisnis wirausaha'],
          ['mp-14', 'MULOK', 'Muatan Lokal (Bahasa Daerah)', 'Muatan Lokal', 'Pelestarian bahasa dan kearifan lokal daerah']
        ];
        for (const [id, kode, nama, kelompok, ket] of defaultMapel) {
          try {
            await pool.query(
              'INSERT INTO mata_pelajaran (id, kode_mapel, nama_mapel, kelompok, keterangan) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
              [id, kode, nama, kelompok, ket]
            );
          } catch (errM) {}
        }
      }
    } catch (e) {}

    // Pastikan tabel akun_guru memiliki kolom role untuk hak akses khusus (Kepsek, Waka Kurikulum, Waka Kesiswaan, Guru BK)
    try {
      await pool.query(`ALTER TABLE akun_guru ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'GURU';`);
    } catch (e) {}

    // Tabel izin_siswa - pastikan kolom dibuat_pada dan created_at sinkron dan tidak ada NOT NULL constraint yang menghalangi insert
    try {
      await pool.query(`ALTER TABLE izin_siswa ALTER COLUMN dibuat_pada DROP NOT NULL;`);
    } catch (e) {}
    const izinColumns = [
      'dibuat_pada VARCHAR(255) DEFAULT CURRENT_TIMESTAMP',
      'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
    ];
    for (const col of izinColumns) {
      try {
        await pool.query(`ALTER TABLE izin_siswa ADD COLUMN IF NOT EXISTS ${col};`);
      } catch (e) {}
    }

    // Pastikan tabel kehadiran_kbm_guru memiliki kolom jadwal_kbm_id dan absent_students
    try {
      await pool.query(`ALTER TABLE kehadiran_kbm_guru ADD COLUMN IF NOT EXISTS jadwal_kbm_id VARCHAR(255);`);
      await pool.query(`ALTER TABLE kehadiran_kbm_guru ADD COLUMN IF NOT EXISTS absent_students JSONB DEFAULT '[]'::jsonb;`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_jadwal_kbm_teacher ON jadwal_kbm(teacher_id);`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_jadwal_kbm_rombel_hari ON jadwal_kbm(rombel_id, hari);`);
    } catch (e) {}

    // 3. Initialize default settings if empty
    const res = await pool.query(`SELECT count(*) FROM pengaturan`);
    if (parseInt(res.rows[0].count) === 0) {
      const defaultScheduleDay = {
        arrivalStart: '06:00',
        arrivalLate: '07:15',
        arrivalEnd: '08:00',
        departureStart: '15:00',
        departureEnd: '17:00'
      };
      
      const defaultData = {
        schedule: {
          'Monday': { ...defaultScheduleDay },
          'Tuesday': { ...defaultScheduleDay },
          'Wednesday': { ...defaultScheduleDay },
          'Thursday': { ...defaultScheduleDay },
          'Friday': { ...defaultScheduleDay }
        },
        adminUsername: 'admin',
        adminPassword: 'password',
        studentCustomFields: [],
        waApiSecret: ''
      };
      
      await pool.query(
        `INSERT INTO pengaturan (id, jam_masuk, jam_pulang, nama_website, judul_aplikasi, judul_piket, wa_mode, wa_api_url, wa_api_key, wa_cron_time, wa_cron_days, scanner_type, data) 
         VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12::jsonb)
         ON CONFLICT (id) DO NOTHING`,
        ['12:00', '13:00', 'Panel Admin SMK', 'Sistem Presensi Siswa', 'Portal Guru Piket & Perizinan', 'manual', '', '', '15:00', JSON.stringify(['1','2','3','4','5']), 'webcam', JSON.stringify(defaultData)]
      );
    }
    
    // Seed Piket
    const piketRes = await pool.query(`SELECT count(*) FROM akun_piket`);
    if (parseInt(piketRes.rows[0].count) === 0) {
      await pool.query(
        `INSERT INTO akun_piket (id, username, password_hash) VALUES ($1, $2, $3)`,
        ['1', 'piket', 'password123']
      );
    }
    console.log("[DATABASE] Schema synchronized successfully. All columns are up to date.");
  } catch (error: any) {
    if (error.code !== 'ECONNREFUSED') {
       console.error("[DATABASE] Error during schema synchronization:", error);
    } else {
       console.log("[DATABASE] Connection refused. Ensure PostgreSQL is running on VPS.");
    }
  }
}

