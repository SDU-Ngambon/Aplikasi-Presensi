-- ==============================================================================
-- SKEMA LENGKAP & BERSIH DATABASE SISTEM PRESENSI & KBM SMK
-- ==============================================================================
-- Kompatibel dengan: PostgreSQL (Cloud SQL / Supabase / Neon / Local PostgreSQL)
-- dan MySQL / MariaDB (dengan penyesuaian tipe JSONB -> JSON & BOOLEAN -> TINYINT)
-- ==============================================================================

-- 1. TABEL PENGATURAN UMUM APLIKASI
CREATE TABLE IF NOT EXISTS pengaturan (
    id INTEGER PRIMARY KEY DEFAULT 1,
    nama_website VARCHAR(255) DEFAULT 'Panel Admin SMK',
    judul_aplikasi VARCHAR(255) DEFAULT 'Sistem Presensi Siswa',
    judul_piket VARCHAR(255) DEFAULT 'Portal Guru Piket & Perizinan',
    judul_guru_portal VARCHAR(255) DEFAULT 'Akses Data Guru',
    subjudul_guru_portal VARCHAR(255) DEFAULT 'Portal Kehadiran, Piket & Akun Guru',
    headmaster_name VARCHAR(255) DEFAULT '',
    headmaster_nip VARCHAR(100) DEFAULT '',
    headmaster_whatsapp VARCHAR(100) DEFAULT '',
    headmaster_username VARCHAR(255) DEFAULT 'kepsek',
    headmaster_password VARCHAR(255) DEFAULT 'kepsek123',
    headmaster_status VARCHAR(50) DEFAULT 'AKTIF',
    kepala_sekolah_nama VARCHAR(255) DEFAULT '',
    kepala_sekolah_nip VARCHAR(100) DEFAULT '',
    kepala_sekolah_whatsapp VARCHAR(100) DEFAULT '',
    jam_masuk VARCHAR(50) DEFAULT '12:00',
    jam_pulang VARCHAR(50) DEFAULT '17:00',
    toleransi_terlambat VARCHAR(50) DEFAULT '15',
    logo TEXT,
    logo_bg TEXT,
    favicon TEXT,
    theme_color VARCHAR(50) DEFAULT '#1976d2',
    wa_mode VARCHAR(20) DEFAULT 'manual', -- 'manual' | 'otomatis'
    wa_target VARCHAR(50) DEFAULT 'both', -- 'both' | 'group' | 'walikelas'
    wa_provider VARCHAR(50) DEFAULT 'fonnte', -- 'fonnte' | 'wablas'
    wa_endpoint TEXT,
    wa_api_url VARCHAR(255) DEFAULT 'https://api.fonnte.com/send',
    wa_api_key VARCHAR(255) DEFAULT '',
    wa_api_secret VARCHAR(255) DEFAULT '',
    wa_group_id VARCHAR(255) DEFAULT '',
    wa_group_name VARCHAR(255) DEFAULT 'Grup Presensi SMK',
    wa_cron_time VARCHAR(50) DEFAULT '15:00',
    wa_schedule_time VARCHAR(50) DEFAULT '15:00',
    wa_cron_days JSONB DEFAULT '["1","2","3","4","5"]'::jsonb,
    wa_schedule_days JSONB DEFAULT '["1","2","3","4","5"]'::jsonb,
    wa_sender_phone VARCHAR(50) DEFAULT '',
    scanner_type VARCHAR(50) DEFAULT 'kamera', -- 'kamera' | 'webcam' | 'external'
    barcode_type VARCHAR(50) DEFAULT 'qrcode',
    suara_sukses VARCHAR(50) DEFAULT 'default1',
    suara_gagal VARCHAR(50) DEFAULT 'default2',
    file_suara_sukses TEXT,
    file_suara_gagal TEXT,
    semester VARCHAR(20) DEFAULT 'Ganjil',
    tahun_ajaran VARCHAR(50) DEFAULT '2024/2025',
    pengesahan_template JSONB DEFAULT '{}'::jsonb,
    perangkat_wa_rekap JSONB DEFAULT '{}'::jsonb,
    data JSONB DEFAULT '{}'::jsonb
);

-- Seed default data pengaturan (jika belum ada)
INSERT INTO pengaturan (
    id, nama_website, judul_aplikasi, judul_piket, judul_guru_portal, subjudul_guru_portal,
    jam_masuk, jam_pulang, toleransi_terlambat, wa_mode, wa_target, wa_provider, 
    wa_api_url, wa_group_name, wa_cron_time, wa_schedule_time, wa_cron_days, wa_schedule_days,
    scanner_type, barcode_type, headmaster_username, headmaster_password, headmaster_status
) VALUES (
    1, 'Panel Admin SMK', 'Sistem Presensi Siswa', 'Portal Guru Piket & Perizinan', 'Akses Data Guru', 'Portal Kehadiran, Piket & Akun Guru',
    '12:00', '17:00', '15', 'manual', 'both', 'fonnte', 
    'https://api.fonnte.com/send', 'Grup Presensi SMK', '15:00', '15:00', '["1","2","3","4","5"]'::jsonb, '["1","2","3","4","5"]'::jsonb,
    'kamera', 'qrcode', 'kepsek', 'kepsek123', 'AKTIF'
) ON CONFLICT (id) DO NOTHING;

-- 2. TABEL DATA SISWA
CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    nisn VARCHAR(255) NOT NULL UNIQUE,
    nis VARCHAR(255) DEFAULT '',
    class VARCHAR(255) NOT NULL,
    year VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'AKTIF', -- 'AKTIF' | 'LULUS' | 'PKL' | 'MUTASI' | 'NONAKTIF'
    qr_code VARCHAR(255),
    custom_fields JSONB DEFAULT '{}'::jsonb,
    photo TEXT,
    foto TEXT
);

CREATE INDEX IF NOT EXISTS idx_students_nisn ON students(nisn);
CREATE INDEX IF NOT EXISTS idx_students_qr_code ON students(qr_code);
CREATE INDEX IF NOT EXISTS idx_students_class_year ON students(class, year);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);

-- 3. TABEL DATA GURU & WALI KELAS
CREATE TABLE IF NOT EXISTS teachers (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    nip VARCHAR(255) DEFAULT '',
    whatsapp VARCHAR(255) NOT NULL,
    class VARCHAR(255) DEFAULT '',
    year VARCHAR(255) DEFAULT '',
    status VARCHAR(50) DEFAULT 'AKTIF' -- 'AKTIF' | 'NONAKTIF'
);

CREATE INDEX IF NOT EXISTS idx_teachers_class_year ON teachers(class, year);
CREATE INDEX IF NOT EXISTS idx_teachers_status ON teachers(status);

-- 4. TABEL AKUN LOGIN GURU & PEJABAT STRUKTURAL
CREATE TABLE IF NOT EXISTS akun_guru (
    id VARCHAR(255) PRIMARY KEY,
    teacher_id VARCHAR(255) NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    nip VARCHAR(255) DEFAULT '',
    username VARCHAR(255) NOT NULL UNIQUE,
    password_plain VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'AKTIF', -- 'AKTIF' | 'NONAKTIF'
    role VARCHAR(50) DEFAULT 'GURU',    -- 'GURU' | 'WALI_KELAS' | 'WAKIL_KURIKULUM' | 'WAKIL_KESISWAAN' | 'GURU_BK' | 'WAKA_HUMAS' | 'WAKA_SARPRAS' | 'KA_KONSENTRASI_KEAHLIAN' | 'KEPALA_SEKOLAH'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_akun_guru_teacher_id ON akun_guru(teacher_id);
CREATE INDEX IF NOT EXISTS idx_akun_guru_username ON akun_guru(username);
CREATE INDEX IF NOT EXISTS idx_akun_guru_role ON akun_guru(role);

-- 5. TABEL AKUN LOGIN SISWA
CREATE TABLE IF NOT EXISTS akun_siswa (
    id VARCHAR(255) PRIMARY KEY,
    student_id VARCHAR(255) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    nisn VARCHAR(255) NOT NULL UNIQUE,
    nis VARCHAR(255) DEFAULT '',
    class VARCHAR(255) DEFAULT '',
    username VARCHAR(255) NOT NULL UNIQUE,
    password_plain VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'AKTIF', -- 'AKTIF' | 'NONAKTIF'
    role VARCHAR(50) DEFAULT 'SISWA',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_akun_siswa_student_id ON akun_siswa(student_id);
CREATE INDEX IF NOT EXISTS idx_akun_siswa_nisn ON akun_siswa(nisn);
CREATE INDEX IF NOT EXISTS idx_akun_siswa_username ON akun_siswa(username);

-- 6. TABEL AKUN LOGIN ADMIN
CREATE TABLE IF NOT EXISTS akun_admin (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL
);

-- Seed Default Akun Admin (Username: admin, Password default: admin)
INSERT INTO akun_admin (id, username, password_hash) 
VALUES ('1', 'admin', '$2b$10$B7W5dadEIm00k6o8XeVPHOxYSIpeF68BCBhS6sVZtD.Q9PD7dYVSC') 
ON CONFLICT (id) DO NOTHING;

-- 7. TABEL AKUN LOGIN GURU PIKET UMUM
CREATE TABLE IF NOT EXISTS akun_piket (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL
);

-- Seed Default Akun Piket (Username: piket, Password default: password123)
INSERT INTO akun_piket (id, username, password_hash)
VALUES ('1', 'piket', 'password123')
ON CONFLICT (id) DO NOTHING;

-- 8. TABEL KATEGORI TUGAS TAMBAHAN (WAKA, BK, KEPALA BENGKEL, DLL.)
CREATE TABLE IF NOT EXISTS tugas_tambahan_categories (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255),
    nama VARCHAR(255),
    code VARCHAR(100) DEFAULT '',
    kode VARCHAR(100) DEFAULT '',
    description TEXT DEFAULT '',
    keterangan TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Default Kategori Tugas Tambahan
INSERT INTO tugas_tambahan_categories (id, name, nama, code, kode, description, keterangan) VALUES 
  ('cat-1', 'Waka Kurikulum', 'Waka Kurikulum', 'WAKA_KURIKULUM', 'WAKA_KURIKULUM', 'Membidangi kurikulum, pembelajaran, dan supervisi akademik', 'Membidangi kurikulum, pembelajaran, dan supervisi akademik'),
  ('cat-2', 'Waka Kesiswaan', 'Waka Kesiswaan', 'WAKA_KESISWAAN', 'WAKA_KESISWAAN', 'Membidangi ketertiban, kedisiplinan, dan kegiatan siswa', 'Membidangi ketertiban, kedisiplinan, dan kegiatan siswa'),
  ('cat-3', 'Waka Humas', 'Waka Humas', 'WAKA_HUMAS', 'WAKA_HUMAS', 'Membidangi hubungan masyarakat dan dunia industri / kerja', 'Membidangi hubungan masyarakat dan dunia industri / kerja'),
  ('cat-4', 'Waka Sarpras', 'Waka Sarpras', 'WAKA_SARPRAS', 'WAKA_SARPRAS', 'Membidangi sarana prasarana dan inventaris sekolah', 'Membidangi sarana prasarana dan inventaris sekolah'),
  ('cat-5', 'Guru BK', 'Guru BK', 'GURU_BK', 'GURU_BK', 'Bimbingan konseling dan penanganan perkembangan siswa', 'Bimbingan konseling dan penanganan perkembangan siswa'),
  ('cat-6', 'Ka Konsentrasi Keahlian', 'Ka Konsentrasi Keahlian', 'KA_KONSENTRASI_KEAHLIAN', 'KA_KONSENTRASI_KEAHLIAN', 'Ketua / Koordinator Program & Konsentrasi Keahlian', 'Ketua / Koordinator Program & Konsentrasi Keahlian')
ON CONFLICT (id) DO NOTHING;

-- 9. TABEL PENUGASAN TUGAS TAMBAHAN GURU
CREATE TABLE IF NOT EXISTS tugas_tambahan_guru (
    id VARCHAR(255) PRIMARY KEY,
    teacher_id VARCHAR(255) NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    teacher_name VARCHAR(255) NOT NULL,
    nip VARCHAR(255) DEFAULT '',
    category_id VARCHAR(255) NOT NULL,
    category_name VARCHAR(255) NOT NULL,
    keterangan TEXT DEFAULT '',
    sk_nomor VARCHAR(255) DEFAULT '',
    status VARCHAR(50) DEFAULT 'AKTIF', -- 'AKTIF' | 'NONAKTIF'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tugas_guru_teacher_id ON tugas_tambahan_guru(teacher_id);
CREATE INDEX IF NOT EXISTS idx_tugas_guru_category_id ON tugas_tambahan_guru(category_id);
CREATE INDEX IF NOT EXISTS idx_tugas_guru_status ON tugas_tambahan_guru(status);

-- 10. TABEL MASTER TUGAS / DESKRIPSI PIKET
CREATE TABLE IF NOT EXISTS master_tugas_piket (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Default Master Tugas Piket
INSERT INTO master_tugas_piket (id, name, description) VALUES
  ('duty-1', 'Koordinator Piket', 'Memimpin dan mengkoordinasikan kegiatan piket harian'),
  ('duty-2', 'Guru Piket (Umum)', 'Membantu ketertiban dan presensi siswa umum'),
  ('duty-3', 'Guru Piket Gerbang Depan', 'Menjaga dan menyambut siswa di pintu gerbang utama'),
  ('duty-4', 'Guru Piket Gerbang Belakang', 'Memantau akses keluar masuk gerbang belakang'),
  ('duty-5', 'Guru Piket Lantai 1', 'Pengawasan area kelas dan lorong lantai 1'),
  ('duty-6', 'Guru Piket Lantai 2', 'Pengawasan area kelas dan lorong lantai 2'),
  ('duty-7', 'Guru Piket Pos Satpam', 'Koordinasi perizinan dan tamu di pos keamanan'),
  ('duty-8', 'Guru Piket Ruang BK', 'Penanganan siswa terlambat dan konseling')
ON CONFLICT (name) DO NOTHING;

-- 11. TABEL JADWAL PIKET GURU
CREATE TABLE IF NOT EXISTS jadwal_piket (
    id VARCHAR(255) PRIMARY KEY,
    day_name VARCHAR(50) NOT NULL, -- 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Minggu'
    day_index INTEGER NOT NULL,    -- 1 = Senin, 2 = Selasa, ..., 7 = Minggu
    teacher_id VARCHAR(255) NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    teacher_name VARCHAR(255) NOT NULL,
    nip VARCHAR(255) DEFAULT '',
    keterangan VARCHAR(255) DEFAULT 'Guru Piket',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jadwal_piket_day ON jadwal_piket(day_name, day_index);
CREATE INDEX IF NOT EXISTS idx_jadwal_piket_teacher ON jadwal_piket(teacher_id);

-- 12. TABEL PRESENSI SISWA (DATANG / PULANG)
CREATE TABLE IF NOT EXISTS attendance (
    id VARCHAR(255) PRIMARY KEY,
    student_id VARCHAR(255) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    timestamp VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'PRESENT' | 'LATE'
    type VARCHAR(50) NOT NULL    -- 'ARRIVAL' | 'DEPARTURE'
);

CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance(timestamp);
CREATE INDEX IF NOT EXISTS idx_attendance_type ON attendance(type);

-- 13. TABEL PERIZINAN SISWA (SAKIT / IZIN / DISPENSASI)
CREATE TABLE IF NOT EXISTS izin_siswa (
    id VARCHAR(255) PRIMARY KEY,
    nisn VARCHAR(255) NOT NULL,
    tanggal_mulai VARCHAR(255) NOT NULL,
    tanggal_selesai VARCHAR(255) NOT NULL,
    keterangan VARCHAR(255) NOT NULL,
    foto TEXT,
    dibuat_pada VARCHAR(255) DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_izin_siswa_nisn ON izin_siswa(nisn);
CREATE INDEX IF NOT EXISTS idx_izin_siswa_tanggal ON izin_siswa(tanggal_mulai, tanggal_selesai);

-- 14. TABEL STATUS ROMBEL (AKTIF / PKL)
CREATE TABLE IF NOT EXISTS rombel_status (
    class_name VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'AKTIF', -- 'AKTIF' | 'PKL'
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. TABEL TAHUN AJARAN
CREATE TABLE IF NOT EXISTS tahun_ajaran (
    id VARCHAR(255) PRIMARY KEY,
    nama VARCHAR(255) NOT NULL,
    semester VARCHAR(20) DEFAULT 'Ganjil',
    is_active BOOLEAN DEFAULT false,
    dibuat_pada VARCHAR(255)
);

-- 16. TABEL KATEGORI KBM / JAM PELAJARAN
CREATE TABLE IF NOT EXISTS kbm_categories (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(50) DEFAULT '#2563eb',
    is_teaching BOOLEAN DEFAULT true,
    description TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. TABEL JADWAL STRUKTUR JAM KBM (JP)
CREATE TABLE IF NOT EXISTS kbm_schedules (
    id VARCHAR(255) PRIMARY KEY,
    day_name VARCHAR(50) NOT NULL,
    day_index INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    periods JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 18. TABEL ATURAN KEHADIRAN GURU & RADIUS LOKASI
CREATE TABLE IF NOT EXISTS aturan_kehadiran_guru (
    id VARCHAR(255) PRIMARY KEY,
    school_latitude DOUBLE PRECISION DEFAULT -6.2088,
    school_longitude DOUBLE PRECISION DEFAULT 106.8456,
    school_location_name VARCHAR(255) DEFAULT 'SMK Kampus Utama',
    max_distance_meters INTEGER DEFAULT 100,
    min_student_verification INTEGER DEFAULT 2,
    allow_manual_verification BOOLEAN DEFAULT false,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Default Aturan Kehadiran Guru
INSERT INTO aturan_kehadiran_guru (id, school_latitude, school_longitude, school_location_name, max_distance_meters, min_student_verification, allow_manual_verification)
VALUES ('default_rule', -6.2088, 106.8456, 'SMK Kampus Utama', 100, 2, false)
ON CONFLICT (id) DO NOTHING;

-- 19. TABEL HARI LIBUR & BEBAS KEHADIRAN
CREATE TABLE IF NOT EXISTS bebas_kehadiran (
    id VARCHAR(255) PRIMARY KEY,
    start_date VARCHAR(20) NOT NULL,
    end_date VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'sekolah',
    description TEXT DEFAULT '',
    rombel_scope TEXT DEFAULT 'all',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 20. TABEL KEHADIRAN KBM GURU DI KELAS
CREATE TABLE IF NOT EXISTS kehadiran_kbm_guru (
    id VARCHAR(255) PRIMARY KEY,
    date VARCHAR(20) NOT NULL,
    teacher_id VARCHAR(255) NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
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
    is_mocked BOOLEAN DEFAULT false,
    gps_accuracy DOUBLE PRECISION DEFAULT 0,
    status VARCHAR(50) DEFAULT 'HADIR', -- 'HADIR' | 'IZIN' | 'SAKIT' | 'DINAS'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kehadiran_kbm_date ON kehadiran_kbm_guru(date);
CREATE INDEX IF NOT EXISTS idx_kehadiran_kbm_date_rombel ON kehadiran_kbm_guru(date, rombel_id);
CREATE INDEX IF NOT EXISTS idx_kehadiran_kbm_teacher ON kehadiran_kbm_guru(teacher_id, date);

-- 21. TABEL MATA PELAJARAN
CREATE TABLE IF NOT EXISTS mata_pelajaran (
    id VARCHAR(255) PRIMARY KEY,
    kode_mapel VARCHAR(50) UNIQUE NOT NULL,
    nama_mapel VARCHAR(255) NOT NULL,
    kelompok VARCHAR(100) DEFAULT 'Muatan Kejuruan',
    keterangan TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mata_pelajaran_kode ON mata_pelajaran(kode_mapel);

-- 22. TABEL INTEGRASI GOOGLE DRIVE (SERVICE ACCOUNT & OAUTH)
CREATE TABLE IF NOT EXISTS gdrive_settings (
    id INT PRIMARY KEY DEFAULT 1,
    auth_type TEXT,
    client_id TEXT,
    client_secret TEXT,
    refresh_token TEXT,
    client_email TEXT,
    private_key TEXT,
    project_id TEXT,
    parent_folder_id TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 23. TABEL KATEGORI PERANGKAT AJAR (SILABUS/CP, ATP, MODUL AJAR, DSB.)
CREATE TABLE IF NOT EXISTS perangkat_categories (
    id VARCHAR(255) PRIMARY KEY,
    nama VARCHAR(255) NOT NULL,
    target_jumlah INTEGER DEFAULT 1,
    tipe_pengadaan VARCHAR(50) DEFAULT 'DARI_GURU', -- 'DARI_GURU' | 'DARI_KURIKULUM'
    file_kurikulum_url TEXT,
    file_kurikulum_name VARCHAR(255),
    gdrive_folder_id VARCHAR(255),
    tahun_ajaran VARCHAR(50) DEFAULT '',
    semester VARCHAR(20) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Default Kategori Perangkat Ajar
INSERT INTO perangkat_categories (id, nama, target_jumlah, tipe_pengadaan, file_kurikulum_name) VALUES
    ('pkg-1', 'Capaian Pembelajaran (CP)', 1, 'DARI_GURU', NULL),
    ('pkg-2', 'Alur Tujuan Pembelajaran (ATP)', 1, 'DARI_GURU', NULL),
    ('pkg-3', 'Modul Ajar / RPP', 2, 'DARI_GURU', NULL),
    ('pkg-4', 'Program Tahunan (Prota)', 1, 'DARI_GURU', NULL),
    ('pkg-5', 'Program Semester (Promes)', 1, 'DARI_GURU', NULL),
    ('pkg-6', 'Kriteria Ketercapaian Tujuan Pembelajaran (KKTP)', 1, 'DARI_GURU', NULL),
    ('pkg-7', 'Kalender Pendidikan (Kaldik)', 1, 'DARI_KURIKULUM', 'Kalender_Pendidikan.pdf'),
    ('pkg-8', 'Jadwal & SK Pembagian Tugas KBM', 1, 'DARI_KURIKULUM', 'SK_Pembagian_Tugas_KBM.pdf')
ON CONFLICT (id) DO NOTHING;

-- 24. TABEL DOKUMEN PERANGKAT AJAR GURU
CREATE TABLE IF NOT EXISTS perangkat_dokumen (
    id VARCHAR(255) PRIMARY KEY,
    category_id VARCHAR(255) NOT NULL REFERENCES perangkat_categories(id) ON DELETE CASCADE,
    teacher_id VARCHAR(255) NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    teacher_name VARCHAR(255) DEFAULT '',
    teacher_mapel_id VARCHAR(255) DEFAULT '',
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT DEFAULT 0,
    gdrive_file_id VARCHAR(255),
    gdrive_web_view_link TEXT,
    status VARCHAR(50) DEFAULT 'MENUNGGU_VERIFIKASI', -- 'MENUNGGU_VERIFIKASI' | 'TERVERIFIKASI_KURIKULUM' | 'DITOLAK_KURIKULUM' | 'REVISI_KEPSEK' | 'DISETUJUI_KEPSEK'
    catatan_revisi TEXT DEFAULT '',
    mapel VARCHAR(255) DEFAULT '',
    sub_mapel VARCHAR(255) DEFAULT '',
    rombel VARCHAR(255) DEFAULT '',
    tahun_ajaran VARCHAR(50) DEFAULT '',
    semester VARCHAR(20) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_perangkat_doc_teacher ON perangkat_dokumen(teacher_id);
CREATE INDEX IF NOT EXISTS idx_perangkat_doc_category ON perangkat_dokumen(category_id);
CREATE INDEX IF NOT EXISTS idx_perangkat_doc_status ON perangkat_dokumen(status);
CREATE INDEX IF NOT EXISTS idx_perangkat_doc_periode ON perangkat_dokumen(tahun_ajaran, semester);

-- 25. TABEL PENGESAHAN RESMI KEPALA SEKOLAH
CREATE TABLE IF NOT EXISTS perangkat_pengesahan (
    id VARCHAR(255) PRIMARY KEY,
    teacher_id VARCHAR(255) NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    teacher_name VARCHAR(255) DEFAULT '',
    nip VARCHAR(255) DEFAULT '',
    mapel VARCHAR(255) DEFAULT '',
    rombel VARCHAR(255) DEFAULT '',
    tahun_ajaran VARCHAR(50) NOT NULL,
    semester VARCHAR(20) NOT NULL,
    kepsek_id VARCHAR(255),
    kepsek_name VARCHAR(255) DEFAULT '',
    nip_kepsek VARCHAR(100) DEFAULT '',
    tipe_pengesahan VARCHAR(50) NOT NULL, -- 'TTD_DIGITAL' | 'QR_CODE'
    ttd_image_base64 TEXT,
    qr_signature_data JSONB DEFAULT '{}'::jsonb,
    tanggal_pengesahan VARCHAR(50),
    status VARCHAR(50) DEFAULT 'DISAHKAN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_perangkat_pengesahan_teacher ON perangkat_pengesahan(teacher_id);
CREATE INDEX IF NOT EXISTS idx_perangkat_pengesahan_periode ON perangkat_pengesahan(tahun_ajaran, semester);

-- 26. TABEL LOG APPROVAL & CATATAN REVISI PERANGKAT
CREATE TABLE IF NOT EXISTS perangkat_approval_logs (
    id VARCHAR(255) PRIMARY KEY,
    dokumen_id VARCHAR(255),
    teacher_id VARCHAR(255),
    user_id VARCHAR(255),
    user_name VARCHAR(255),
    role VARCHAR(50),
    action VARCHAR(50),
    catatan TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_perangkat_logs_teacher ON perangkat_approval_logs(teacher_id);
CREATE INDEX IF NOT EXISTS idx_perangkat_logs_dokumen ON perangkat_approval_logs(dokumen_id);

-- 27. TABEL MATA PELAJARAN & ROMBEL YANG DIAMPU GURU (PERANGKAT AJAR)
CREATE TABLE IF NOT EXISTS perangkat_teacher_mapel (
    id VARCHAR(255) PRIMARY KEY,
    teacher_id VARCHAR(255) NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    teacher_name VARCHAR(255) DEFAULT '',
    mapel_id VARCHAR(255) DEFAULT '',
    mapel_name VARCHAR(255) NOT NULL,
    sub_mapel VARCHAR(255) DEFAULT '',
    rombel JSONB DEFAULT '[]'::jsonb, -- Array string rombel/kelas, contoh: ["X RPL 1", "X RPL 2"]
    tahun_ajaran VARCHAR(50) DEFAULT '',
    semester VARCHAR(20) DEFAULT '',
    status_submit VARCHAR(50) DEFAULT 'DRAFT', -- 'DRAFT' | 'TERKIRIM'
    submitted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_perangkat_tm_teacher ON perangkat_teacher_mapel(teacher_id);
CREATE INDEX IF NOT EXISTS idx_perangkat_tm_periode ON perangkat_teacher_mapel(tahun_ajaran, semester);

-- ==============================================================================
-- QUERY MIGRASI / UPDATE DATABASE LAMA (JIKA SUDAH MEMILIKI DATABASE YANG BERJALAN)
-- ==============================================================================
-- Jalankan query berikut di pgAdmin / DBeaver / Cloud SQL jika memperbarui database sebelumnya:
--
-- ALTER TABLE perangkat_dokumen ADD COLUMN IF NOT EXISTS teacher_mapel_id VARCHAR(255);
-- CREATE TABLE IF NOT EXISTS perangkat_teacher_mapel (
--     id VARCHAR(255) PRIMARY KEY,
--     teacher_id VARCHAR(255) NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
--     teacher_name VARCHAR(255) DEFAULT '',
--     mapel_id VARCHAR(255) DEFAULT '',
--     mapel_name VARCHAR(255) NOT NULL,
--     sub_mapel VARCHAR(255) DEFAULT '',
--     rombel JSONB DEFAULT '[]'::jsonb,
--     tahun_ajaran VARCHAR(50) DEFAULT '',
--     semester VARCHAR(20) DEFAULT '',
--     status_submit VARCHAR(50) DEFAULT 'DRAFT',
--     submitted_at TIMESTAMP,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
-- ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS headmaster_whatsapp VARCHAR(100) DEFAULT '';
-- ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS headmaster_username VARCHAR(255) DEFAULT 'kepsek';
-- ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS headmaster_password VARCHAR(255) DEFAULT 'kepsek123';
-- ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS headmaster_status VARCHAR(50) DEFAULT 'AKTIF';
-- ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS judul_guru_portal VARCHAR(255) DEFAULT 'Akses Data Guru';
-- ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS subjudul_guru_portal VARCHAR(255) DEFAULT 'Portal Kehadiran, Piket & Akun Guru';
-- ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS scanner_type VARCHAR(50) DEFAULT 'kamera';
-- ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS barcode_type VARCHAR(50) DEFAULT 'qrcode';
-- ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS suara_sukses VARCHAR(50) DEFAULT 'default1';
-- ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS suara_gagal VARCHAR(50) DEFAULT 'default2';
-- ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS wa_sender_phone VARCHAR(50) DEFAULT '';
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'AKTIF';
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS photo TEXT;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS foto TEXT;
-- ALTER TABLE teachers ADD COLUMN IF NOT EXISTS nip VARCHAR(255) DEFAULT '';
-- ALTER TABLE teachers ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'AKTIF';
-- ALTER TABLE akun_guru ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'GURU';
-- ALTER TABLE izin_siswa ADD COLUMN IF NOT EXISTS dibuat_pada VARCHAR(255) DEFAULT CURRENT_TIMESTAMP;
-- ALTER TABLE izin_siswa ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
-- ALTER TABLE izin_siswa ADD COLUMN IF NOT EXISTS foto TEXT;
-- ALTER TABLE izin_siswa ALTER COLUMN dibuat_pada DROP NOT NULL;
-- ALTER TABLE kehadiran_kbm_guru ADD COLUMN IF NOT EXISTS is_mocked BOOLEAN DEFAULT false;
-- ALTER TABLE kehadiran_kbm_guru ADD COLUMN IF NOT EXISTS gps_accuracy DOUBLE PRECISION DEFAULT 0;
-- ALTER TABLE tahun_ajaran ADD COLUMN IF NOT EXISTS semester VARCHAR(20) DEFAULT 'Ganjil';
-- ALTER TABLE perangkat_dokumen ADD COLUMN IF NOT EXISTS mapel VARCHAR(255) DEFAULT '';
-- ALTER TABLE perangkat_dokumen ADD COLUMN IF NOT EXISTS sub_mapel VARCHAR(255) DEFAULT '';
-- ALTER TABLE perangkat_dokumen ADD COLUMN IF NOT EXISTS rombel VARCHAR(255) DEFAULT '';
-- ALTER TABLE perangkat_pengesahan ADD COLUMN IF NOT EXISTS mapel VARCHAR(255) DEFAULT '';
-- ALTER TABLE perangkat_pengesahan ADD COLUMN IF NOT EXISTS rombel VARCHAR(255) DEFAULT '';
-- ALTER TABLE gdrive_settings ADD COLUMN IF NOT EXISTS auth_type TEXT;
-- ALTER TABLE gdrive_settings ADD COLUMN IF NOT EXISTS client_id TEXT;
-- ALTER TABLE gdrive_settings ADD COLUMN IF NOT EXISTS client_secret TEXT;
-- ALTER TABLE gdrive_settings ADD COLUMN IF NOT EXISTS refresh_token TEXT;
--
-- ==============================================================================
-- QUERY PEMBERSIHAN DATA (DATA SANITIZATION / HOUSEKEEPING)
-- ==============================================================================
-- 1. Hapus akun guru yang datanya sudah tidak ada di tabel teachers:
-- DELETE FROM akun_guru WHERE teacher_id NOT IN (SELECT id FROM teachers) AND teacher_id != 'kepsek' AND id != 'kepsek_account';
--
-- 2. Hapus akun siswa yang datanya sudah tidak ada di tabel students:
-- DELETE FROM akun_siswa WHERE student_id NOT IN (SELECT id FROM students);
--
-- 3. Hapus jadwal piket yang gurunya sudah dihapus dari tabel teachers:
-- DELETE FROM jadwal_piket WHERE teacher_id NOT IN (SELECT id FROM teachers);
--
-- 4. Hapus tugas tambahan guru yang datanya sudah tidak ada di tabel teachers:
-- DELETE FROM tugas_tambahan_guru WHERE teacher_id NOT IN (SELECT id FROM teachers);
--
-- 5. Perbaiki status akun_guru & akun_siswa jika NULL:
-- UPDATE akun_guru SET status = 'AKTIF' WHERE status IS NULL OR status = '';
-- UPDATE akun_siswa SET status = 'AKTIF' WHERE status IS NULL OR status = '';
--
-- ==============================================================================
-- QUERY SINKRONISASI ROLE AKUN GURU DENGAN TUGAS TAMBAHAN AKTIF
-- ==============================================================================
-- Jalankan query di bawah ini jika ingin me-reset & menyinkronkan ulang role semua akun guru:
--
-- Langkah 1: Reset semua akun guru ke 'GURU' atau 'WALI_KELAS' (jika memiliki rombel):
-- UPDATE akun_guru
-- SET role = CASE
--     WHEN t.class IS NOT NULL AND TRIM(t.class) != '' AND TRIM(t.class) != '-' THEN 'WALI_KELAS'
--     ELSE 'GURU'
-- END
-- FROM teachers t
-- WHERE (akun_guru.teacher_id = t.id OR akun_guru.id = t.id)
--   AND akun_guru.role != 'KEPALA_SEKOLAH'
--   AND akun_guru.teacher_id != 'kepsek';
--
-- Langkah 2: Berikan role khusus sesuai tugas tambahan yang berstatus 'AKTIF':
-- -- A. Waka Kurikulum
-- UPDATE akun_guru ag
-- SET role = 'WAKIL_KURIKULUM'
-- FROM tugas_tambahan_guru tg
-- JOIN tugas_tambahan_categories tc ON tg.category_id = tc.id
-- WHERE (ag.teacher_id = tg.teacher_id OR ag.id = tg.teacher_id)
--   AND tg.status = 'AKTIF'
--   AND (UPPER(tc.code) = 'WAKA_KURIKULUM' OR LOWER(tc.name) LIKE '%kurikulum%');
--
-- -- B. Waka Kesiswaan
-- UPDATE akun_guru ag
-- SET role = 'WAKIL_KESISWAAN'
-- FROM tugas_tambahan_guru tg
-- JOIN tugas_tambahan_categories tc ON tg.category_id = tc.id
-- WHERE (ag.teacher_id = tg.teacher_id OR ag.id = tg.teacher_id)
--   AND tg.status = 'AKTIF'
--   AND (UPPER(tc.code) = 'WAKA_KESISWAAN' OR LOWER(tc.name) LIKE '%kesiswaan%');
--
-- -- C. Guru BK
-- UPDATE akun_guru ag
-- SET role = 'GURU_BK'
-- FROM tugas_tambahan_guru tg
-- JOIN tugas_tambahan_categories tc ON tg.category_id = tc.id
-- WHERE (ag.teacher_id = tg.teacher_id OR ag.id = tg.teacher_id)
--   AND tg.status = 'AKTIF'
--   AND (UPPER(tc.code) = 'GURU_BK' OR LOWER(tc.name) LIKE '%bk%' OR LOWER(tc.name) LIKE '%konseling%');
--
-- -- D. Waka Humas
-- UPDATE akun_guru ag
-- SET role = 'WAKA_HUMAS'
-- FROM tugas_tambahan_guru tg
-- JOIN tugas_tambahan_categories tc ON tg.category_id = tc.id
-- WHERE (ag.teacher_id = tg.teacher_id OR ag.id = tg.teacher_id)
--   AND tg.status = 'AKTIF'
--   AND (UPPER(tc.code) = 'WAKA_HUMAS' OR LOWER(tc.name) LIKE '%humas%');
--
-- -- E. Waka Sarpras
-- UPDATE akun_guru ag
-- SET role = 'WAKA_SARPRAS'
-- FROM tugas_tambahan_guru tg
-- JOIN tugas_tambahan_categories tc ON tg.category_id = tc.id
-- WHERE (ag.teacher_id = tg.teacher_id OR ag.id = tg.teacher_id)
--   AND tg.status = 'AKTIF'
--   AND (UPPER(tc.code) = 'WAKA_SARPRAS' OR LOWER(tc.name) LIKE '%sarpras%' OR LOWER(tc.name) LIKE '%sarana%');
--
-- ==============================================================================
-- QUERY PENDUKUNG KUSTOMISASI LEMBAR PENGESAHAN & REKAP SUPERVISI WHATSAPP
-- ==============================================================================
-- 1. Tambah kolom pengesahan_template pada tabel pengaturan jika belum ada:
-- ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS pengesahan_template JSONB DEFAULT '{}'::jsonb;
--
-- 2. Tambah kolom pengaturan WhatsApp Rekap Perangkat Ajar:
-- ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS perangkat_wa_rekap JSONB DEFAULT '{}'::jsonb;
--
-- 3. Tambah kolom penandatangan pada tabel perangkat_pengesahan:
-- ALTER TABLE perangkat_pengesahan ADD COLUMN IF NOT EXISTS nip_kepsek VARCHAR(100) DEFAULT '';
-- ALTER TABLE perangkat_pengesahan ADD COLUMN IF NOT EXISTS mapel VARCHAR(255) DEFAULT '';
-- ALTER TABLE perangkat_pengesahan ADD COLUMN IF NOT EXISTS rombel VARCHAR(255) DEFAULT '';
-- ==============================================================================

-- ==============================================================================
-- SISTEM PENJADWALAN JP KBM & INTEGRASI PRESENSI KEHADIRAN GURU
-- ==============================================================================
CREATE TABLE IF NOT EXISTS jadwal_kbm (
    id VARCHAR(100) PRIMARY KEY,
    teacher_id VARCHAR(100) NOT NULL,
    mapel_name VARCHAR(255) NOT NULL,
    rombel_id VARCHAR(100) NOT NULL,
    hari VARCHAR(50) NOT NULL,
    jp_list JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jadwal_kbm_teacher ON jadwal_kbm(teacher_id);
CREATE INDEX IF NOT EXISTS idx_jadwal_kbm_rombel_hari ON jadwal_kbm(rombel_id, hari);

-- Hubungkan pencatatan riwayat presensi KBM ke jadwal KBM
ALTER TABLE teacher_kbm_attendance ADD COLUMN IF NOT EXISTS jadwal_kbm_id VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_teacher_kbm_attendance_jadwal ON teacher_kbm_attendance(jadwal_kbm_id);
-- ==============================================================================

