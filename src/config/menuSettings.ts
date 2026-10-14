export interface MenuSettingItem {
  menu_key: string;
  name: string;
  category: 'kepsek' | 'tugas-tambahan' | 'guru' | 'siswa';
  description: string;
  is_enabled: boolean;
  updated_at?: string;
}

export const DEFAULT_MENU_SETTINGS: MenuSettingItem[] = [
  // 1. Portal Kepala Sekolah
  {
    menu_key: 'perangkat-supervisi',
    name: 'Supervisi Perangkat Ajar',
    category: 'kepsek',
    description: 'Monitoring kelengkapan berkas perangkat ajar guru secara terpusat',
    is_enabled: true
  },
  {
    menu_key: 'perangkat-pengesahan',
    name: 'Validasi & Pengesahan Perangkat',
    category: 'kepsek',
    description: 'Tanda tangan digital dan penerbitan barcode QR pengesahan resmi',
    is_enabled: true
  },
  {
    menu_key: 'monitoring',
    name: 'Monitoring Kehadiran Guru',
    category: 'kepsek',
    description: 'Rekapitulasi jam mengajar, kehadiran KBM, dan keterlambatan guru',
    is_enabled: true
  },
  {
    menu_key: 'wali-kelas-kepsek',
    name: 'Monitoring Kelas Siswa',
    category: 'kepsek',
    description: 'Supervisi monitoring presensi siswa dan jurnal kelas',
    is_enabled: true
  },

  // 2. Tugas Tambahan Guru
  {
    menu_key: 'wali-kelas',
    name: 'Menu Wali Kelas',
    category: 'tugas-tambahan',
    description: 'Akses kelola data presensi harian, izin, dan rekap siswa binaan kelas',
    is_enabled: true
  },
  {
    menu_key: 'presensi-kesiswaan',
    name: 'Monitoring Presensi Siswa',
    category: 'tugas-tambahan',
    description: 'Monitoring kehadiran siswa menyeluruh untuk Waka Kesiswaan & Guru BK',
    is_enabled: true
  },
  {
    menu_key: 'perangkat-verifikasi',
    name: 'Verifikasi Perangkat Ajar',
    category: 'tugas-tambahan',
    description: 'Pemeriksaan telaah modul & materi ajar guru oleh Waka Kurikulum',
    is_enabled: true
  },
  {
    menu_key: 'perangkat-setting',
    name: 'Pengaturan Perangkat Ajar',
    category: 'tugas-tambahan',
    description: 'Penentuan instrumen verifikasi perangkat ajar guru oleh Kurikulum',
    is_enabled: true
  },
  {
    menu_key: 'piket',
    name: 'Tugas Piket & Perizinan',
    category: 'tugas-tambahan',
    description: 'Akses operasional guru piket dan persetujuan izin terlambat/keluar siswa',
    is_enabled: true
  },

  // 3. Portal Guru
  {
    menu_key: 'perangkat-guru',
    name: 'Upload Perangkat Ajar',
    category: 'guru',
    description: 'Pengunggahan modul ajar, ATP, CP, dan berkas administrasi guru',
    is_enabled: true
  },
  {
    menu_key: 'jadwal-kbm',
    name: 'Jadwal JP KBM',
    category: 'guru',
    description: 'Informasi jam mengajar tatap muka guru per minggu',
    is_enabled: true
  },
  {
    menu_key: 'kehadiran',
    name: 'Kehadiran Guru',
    category: 'guru',
    description: 'Pencatatan presensi masuk KBM kelas dan riwayat kehadiran guru',
    is_enabled: true
  },
  {
    menu_key: 'kelas-diampu',
    name: 'Kelas Diampu',
    category: 'guru',
    description: 'Daftar kelas dinamis yang diampu guru berdasarkan jadwal KBM aktif',
    is_enabled: true
  },
  {
    menu_key: 'materi-tugas',
    name: 'Materi & Tugas',
    category: 'guru',
    description: 'Distribusi modul materi bacaan, pengumpulan tugas, dan projek kelas',
    is_enabled: true
  },
  {
    menu_key: 'rencana-asesmen',
    name: 'Rencana Asesmen',
    category: 'guru',
    description: 'Perencanaan asesmen sumatif lingkup materi, ASTS, dan ASAS/ASAT',
    is_enabled: true
  },
  {
    menu_key: 'generator-soal',
    name: 'Generator Soal AI',
    category: 'guru',
    description: 'Integrasi pembuatan soal otomatis berbasis AI dari cakupan materi',
    is_enabled: true
  },
  {
    menu_key: 'bank-soal',
    name: 'Bank Soal',
    category: 'guru',
    description: 'Repositori butir soal dan modul import manual format dokumen Word',
    is_enabled: true
  },
  {
    menu_key: 'atur-asesmen',
    name: 'Atur Asesmen',
    category: 'guru',
    description: 'Perakitan ujian online kelas, token akses ujian, dan timer pengerjaan',
    is_enabled: true
  },
  {
    menu_key: 'hasil-penilaian',
    name: 'Hasil Penilaian',
    category: 'guru',
    description: 'Rekapitulasi nilai rapor siswa, sinkronisasi ujian, dan import Excel',
    is_enabled: true
  },

  // 4. Portal Siswa
  {
    menu_key: 'siswa-dashboard',
    name: 'Dashboard Siswa',
    category: 'siswa',
    description: 'Ringkasan presensi harian, agenda hari ini, dan aktivitas belajar siswa',
    is_enabled: true
  },
  {
    menu_key: 'siswa-jadwal',
    name: 'Jadwal KBM',
    category: 'siswa',
    description: 'Tabel jadwal mata pelajaran dan ruang kelas harian',
    is_enabled: true
  },
  {
    menu_key: 'siswa-materi-tugas',
    name: 'Materi & Tugas',
    category: 'siswa',
    description: 'Unduh materi pelajaran dan pengunggahan berkas tugas belajar',
    is_enabled: true
  },
  {
    menu_key: 'siswa-asesmen',
    name: 'Asesmen Ujian',
    category: 'siswa',
    description: 'Daftar ujian dan kuis daring yang harus dikerjakan siswa',
    is_enabled: true
  },
  {
    menu_key: 'siswa-hasil-belajar',
    name: 'Hasil Belajar',
    category: 'siswa',
    description: 'Transkrip nilai tugas, harian, ujian, dan rekap capaian belajar',
    is_enabled: true
  }
];
