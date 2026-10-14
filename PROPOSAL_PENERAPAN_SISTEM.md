# PROPOSAL PENERAPAN SISTEM PRESENSI & MANAJEMEN KESISWAAN DIGITAL BERBASIS SMART QR CODE & WHATSAPP GATEWAY

**Instansi:** Satuan Pendidikan / Sekolah Menengah Atas / Kejuruan  
**Dokumen:** Dokumen Proposal Teknis & Penerapan Sistem  
**Tahun Pelajaran:** 2026/2027  
**Penyusun:** Tim Pengembang IT & Kesiswaan  

---

## DAFTAR ISI
1. [BAB I: Ringkasan Eksekutif & Latar Belakang](#bab-i-ringkasan-eksekutif--latar-belakang)
2. [BAB II: Rincian Modul & Fungsionalitas Aplikasi](#bab-ii-rincian-modul--fungsionalitas-aplikasi)
3. [BAB III: Arsitektur Sistem, Kebutuhan Perangkat & Keamanan Data](#bab-iii-arsitektur-sistem-kebutuhan-perangkat--keamanan-data)
4. [BAB IV: Alur Operasional Harian Sekolah](#bab-iv-alur-operasional-harian-sekolah)
5. [BAB V: Rencana Implementasi & Jadwal Kerja (Timeline)](#bab-v-rencana-implementasi--jadwal-kerja-timeline)
6. [BAB VI: Lembar Pengesahan](#bab-vi-lembar-pengesahan)

---

## BAB I: RINGKASAN EKSEKUTIF & LATAR BELAKANG

### 1.1 Latar Belakang Masalah
Pencatatan presensi siswa di lingkungan sekolah secara konvensional (menggunakan kertas daftar hadir atau absensi manual di kelas) menghadapi berbagai tantangan operasional:
1. **Keterlambatan Informasi ke Orang Tua:** Pihak orang tua seringkali tidak mengetahui apakah putra/putrinya telah sampai di sekolah tepat waktu atau membolos.
2. **Beban Rekapitulasi Manual:** Guru piket dan wali kelas menghabiskan waktu berjam-jam setiap minggu/bulan untuk menghitung persentase kehadiran dan ketidakhadiran (Sakit, Izin, Alpa).
3. **Potensi Kesalahan Data (*Human Error*):** Catatan presensi kertas rentan hilang, rusak, atau terlewat saat penyusunan laporan evaluasi disiplin.
4. **Ketiadaan Notifikasi *Real-Time*:** Belum adanya jembatan otomatis antara sistem gerbang masuk sekolah dengan pesan langsung ke aplikasi pesan yang paling banyak digunakan masyarakat, yaitu WhatsApp.

### 1.2 Maksud dan Tujuan
Penerapan **Sistem Presensi & Manajemen Kesiswaan Digital** ini bertujuan untuk:
- Memodernisasi proses pencatatan presensi siswa dan guru secara otomatis dan instan menggunakan kartu identitas ber-QR Code/Barcode.
- Menyediakan transparansi kehadiran kepada orang tua/wali siswa secara *real-time* melalui integrasi WhatsApp Gateway.
- Memberikan kemudahan bagi Guru Piket dalam memproses izin keluar-masuk, sakit, terlambat, dan dispensasi.
- Mengotomatiskan manajemen rombongan belajar (rombel), termasuk fitur **Kenaikan Kelas Massal** otomatis dari Kelas 10 $\rightarrow$ 11 $\rightarrow$ 12 $\rightarrow$ Alumni.
- Menyediakan fasilitas desain dan cetak Kartu Pelajar Digital mandiri berstandar siap cetak (kertas A4 / kartu PVC).

### 1.3 Nilai Tambah & Manfaat Utama
- **Efisiensi Waktu:** Waktu rekapitulasi presensi berkurang dari hitungan hari menjadi hitungan detik dengan fitur ekspor Excel otomatis.
- **Peningkatan Disiplin:** Siswa terdorong hadir tepat waktu karena sistem mencatat jam dan menit presensi secara presisi dengan status Tepat Waktu atau Terlambat.
- **Kemitraan Erat dengan Orang Tua:** Notifikasi kedatangan/kepulangan terkirim langsung ke nomor WhatsApp wali murid, meminimalkan risiko bolos di jalan.

---

## BAB II: RINCIAN MODUL & FUNGSIONALITAS APLIKASI

Aplikasi ini dirancang modular dengan 8 modul inti yang saling terintegrasi secara *real-time*:

### 1. Modul Scanner Presensi Mandiri (Smart QR & Barcode)
- **Fungsi Utama:** Terminal gerbang sekolah untuk memindai kartu presensi siswa dan guru.
- **Fitur-Fitur:**
  - Dukungan pemindaian melalui Kamera Webcam laptop, Kamera Smartphone, atau Scanner Barcode Fisik (USB/Wireless).
  - *Audio Feedback & Voice Confirmation* (suara konfirmasi otomatis menyebut status presensi).
  - Validasi batas jam masuk, jam dispensasi terlambat, dan jam buka kepulangan.
  - Tampilan *Live Card Feedback* memunculkan foto, nama, NISN, kelas, dan status kedatangan siswa.
  - Dukungan mode *Offline / Local Fallback* jika terjadi gangguan jaringan sesaat.

### 2. Modul Portal Guru Piket & Manajemen Perizinan
- **Fungsi Utama:** Layanan meja piket harian untuk menangani siswa yang datang terlambat, izin sakit, atau izin keluar lingkungan sekolah.
- **Fitur-Fitur:**
  - Pencatatan status khusus: **Sakit (S)**, **Izin (I)**, **Dispensasi (D)**, **Terlambat (T)**, dan **Alpa (A)**.
  - Form unggah surat izin dokter / surat keterangan orang tua.
  - Fitur cetak **Surat Izin Masuk Kelas (SIMK)** dan **Surat Izin Meninggalkan Sekolah (SIMS)** langsung ke printer termal atau standar.
  - *Live Monitoring Feed* pergerakan siswa yang masuk dan keluar gerbang pada hari berjalan.

### 3. Modul Database Master Siswa & Guru
- **Fungsi Utama:** Pengelolaan data induk kesiswaan dan tenaga pendidik.
- **Fitur-Fitur:**
  - Penyimpanan data komprehensif: NIS, NISN, Nama Lengkap, Jenis Kelamin, Nomor WhatsApp Orang Tua, Alamat, dan Foto Profil.
  - Fitur **Impor Data Massal dari file Excel / Spreadsheet** (.xlsx, .csv) dengan pemetaan kolom otomatis.
  - Fitur **Ekspor Data Master** ke file Excel (.xlsx).
  - Dukungan *Custom Fields* untuk atribut spesifik sekolah (e.g. Asal SMP, No KIP/PIP, Golongan Darah).

### 4. Modul Rombongan Belajar (Rombel) & Kenaikan Kelas Otomatis
- **Fungsi Utama:** Pengorganisasian struktur kelas, penetapan wali kelas, dan kenaikan jenjang.
- **Fitur-Fitur:**
  - Manajemen daftar rombel per tingkat (Kelas 10, Kelas 11, Kelas 12) dan status khusus (Siswa PKL / Magang Industri).
  - **Engine Kenaikan Kelas Otomatis**: Memindahkan seluruh siswa kelas 10 ke kelas 11, kelas 11 ke kelas 12, serta meluluskan kelas 12 ke status **Alumni** dengan satu klik tanpa merusak histori kehadiran tahun sebelumnya.
  - Alokasi pembagian wali kelas dan nomor kontak koordinasi kelas.

### 5. Modul Desain Kartu & Percetakan ID Card Digital
- **Fungsi Utama:** Perancangan visual kartu identitas pelajar dan percetakan massal siap pakai.
- **Fitur-Fitur:**
  - *Interactive Visual Designer*: Kustomisasi warna tema kartu, logo instansi, tanda tangan kepala sekolah, stempel resmi, dan teks kartu.
  - Generator otomatis **QR Code** unik dan **Barcode Code128** yang terhubung langsung dengan nomor identitas siswa.
  - Mode cetak ganda:
    - **Cetak Massal Format Lembar A4** (layout 10 kartu per lembar dengan garis potong presisi).
    - **Cetak Satuan Format Kartu PVC Standar ISO (85.6 x 53.98 mm)** untuk mesin cetak ID Card (Fargo, Zebra, Evolis).

### 6. Modul Rekapitulasi Laporan & Analitik Kehadiran
- **Fungsi Utama:** Analisis data kehadiran dan penyusunan laporan pertanggungjawaban kesiswaan.
- **Fitur-Fitur:**
  - Rekapitulasi periodik: Harian, Mingguan, Bulanan, dan Semesteran.
  - Filter analitik berdasarkan Rombel/Kelas, Rentang Tanggal, dan Status Kehadiran.
  - Grafik tren persentase kedisiplinan dan deteksi dini siswa dengan tingkat ketidakhadiran tinggi.
  - Ekspor laporan ke format **Microsoft Excel (.xlsx)** dan dokumen siap cetak.

### 7. Modul Otomasi WhatsApp Gateway & Notifikasi Terjadwal
- **Fungsi Utama:** Komunikasi otomatis ke nomor WhatsApp orang tua siswa dan grup koordinasi wali kelas.
- **Fitur-Fitur:**
  - Kompatibilitas multi-provider gateway (Fonnte, Wablas, Starsender, atau Custom REST API Gateway).
  - Notifikasi *real-time* saat siswa melakukan scan kartu di gerbang (berisi nama, jam presensi, status, dan lokasi scan).
  - Fitur pesan terjadwal (*Scheduled Broadcast*) rekap harian siswa yang belum hadir pada pukul 08.00 WIB kepada wali kelas dan orang tua.

### 8. Modul Pengaturan Branding, Multi-Tema & Keamanan Database
- **Fungsi Utama:** Kustomisasi identitas instansi sekolah dan manajemen ketahanan data.
- **Fitur-Fitur:**
  - Pengaturan nama sekolah, NPSN, alamat, kontak, logo instansi, dan favicon.
  - *Multi-Theme Preset Engine* (Pilihan palet warna resmi: Indigo Modern, Emerald Green, Ocean Navy, Crimson Red, Gold Amber).
  - Sinkronisasi ganda: Database Cloud/Server PostgreSQL dengan opsi *Backup & Restore* file JSON/SQL berkala.

---

## BAB III: ARSITEKTUR SISTEM, KEBUTUHAN PERANGKAT & KEAMANAN DATA

### 3.1 Arsitektur Software
- **Frontend Layer:** React 19, TypeScript, Material UI (MUI v5), Vite (performa tinggi dan responsif di desktop maupun tablet).
- **Backend API Layer:** Node.js & Express API Server (RESTful Endpoint Architecture).
- **Database Engine:** PostgreSQL Database Relasional dengan skema terindeks cepat.
- **Messaging Service:** WhatsApp Cloud Gateway API dengan mekanisme *Queue & Retry*.

### 3.2 Kebutuhan Hardware Minimal
| Posisi / Lokasi | Perangkat yang Direkomendasikan | Keterangan |
| :--- | :--- | :--- |
| **Terminal Gerbang (Pos Scanner)** | 1x Laptop/PC atau Tablet Android + 1x Scanner Barcode 2D/QR USB atau Webcam HD 1080p | Ditempatkan di pos satpam / pintu masuk gerbang utama sekolah. |
| **Meja Guru Piket** | 1x Laptop/PC terhubung internet + 1x Printer Dokumen / Printer Termal (opsional) | Untuk entri izin, sakit, dan cetak Surat Izin Masuk Kelas. |
| **Ruang Tata Usaha / Admin IT** | 1x PC Admin + 1x Printer Kartu PVC (atau Printer Inkjet + Kertas Glossy A4) | Untuk manajemen master data, cetak kartu massal, dan rekap bulanan. |

### 3.3 Keamanan & Privasi Data
- Enkripsi transmisi data menggunakan protokol HTTPS / TLS.
- Akses bertingkat dengan hak otorisasi (*Role-Based Access Control*): Administrator Utama vs Guru Piket.
- Nomor WhatsApp tersimpan secara terlindungi dan hanya digunakan untuk pengiriman pesan resmi institusi sekolah.

---

## BAB IV: ALUR OPERASIONAL HARIAN SEKOLAH

```
[Siswa Datang di Gerbang]
           │
           ▼
[Scan Kartu Pelajar di Scanner Gerbang]
     ├── Jika Tepat Waktu (06.00 - 07.00) ──> Audio: "Presensi Berhasil, Selamat Belajar!"
     │                                        └── Kirim Notifikasi WA ke Orang Tua (Hadir Tepat Waktu)
     │
     └── Jika Terlambat (> 07.00) ───────────> Siswa diarahkan ke Meja Guru Piket
                                              ├── Guru Piket input alasan & rekam data
                                              ├── Cetak Surat Izin Masuk Kelas (SIMK)
                                              └── Kirim Notifikasi WA ke Orang Tua (Terlambat & Jam Masuk)

[Pukul 08.00 WIB] ───────────────────────────> Sistem otomatis kirim rekap siswa tidak hadir (Alpa/Tanpa Keterangan) ke Wali Kelas
```

---

## BAB V: RENCANA IMPLEMENTASI & JADWAL KERJA (TIMELINE)

Implementasi sistem direncanakan berjalan selama **4 (Empat) Pekan Kerja**:

```
Pekan 1: Pengumpulan & Verifikasi Master Data (Data Siswa, Kelas, Guru, No. WA Orang Tua)
Pekan 2: Konfigurasi Sistem, Desain Kartu Pelajar, & Percetakan Kartu Massal
Pekan 3: Instalasi Perangkat Pos Scanner, Uji Coba Lapangan & Simulasi Presensi Guru Piket
Pekan 4: Peluncuran Resmi (Go-Live), Sosialisasi kepada Siswa & Wali Murid
```

| Pekan | Aktivitas Utama | Output / Target |
| :--- | :--- | :--- |
| **Pekan I** | Sosialisasi & Input Master Data Siswa/Guru dari format Excel | Master database siswa dan rombel 100% tervalidasi |
| **Pekan II** | Finalisasi desain ID Card, generate QR Code, dan pencetakan kartu | Seluruh siswa menerima Kartu Pelajar Digital |
| **Pekan III**| Pemasangan pos scanner, konfigurasi WA Gateway, dan pelatihan guru piket | Petugas piket dan satpam terlatih mengoperasikan sistem |
| **Pekan IV** | *Go-Live* operasional harian dan evaluasi mingguan pertama | Sistem presensi berjalan mandiri dan laporan tersaji otomatis |

---

## BAB VI: LEMBAR PENGESAHAN

Proposal Penerapan Sistem Presensi & Manajemen Kesiswaan Digital ini diajukan untuk disetujui dan diterapkan sebagai sistem operasional resmi sekolah:

<br />

| Mengetahui / Menyetujui,<br />**Kepala Sekolah** | Diajukan oleh,<br />**Ketua Tim IT / Kesiswaan** |
| :---: | :---: |
| <br /><br /><br /><br />____________________________________<br />**NIP. .................................................** | <br /><br /><br /><br />____________________________________<br />**NIP/NUPTK. .................................** |

---
*Dokumen ini dibuat secara otomatis sebagai panduan resmi implementasi sistem presensi digital sekolah.*
