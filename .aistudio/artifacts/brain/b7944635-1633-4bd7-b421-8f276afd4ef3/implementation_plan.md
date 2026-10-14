# Desain UI/UX macOS Aqua & Glassmorphism ("Aqua Glass")

Pembaruan sistem visual presensi sekolah dengan konsep antarmuka modern bergaya macOS Aqua dan Glassmorphism. Menyediakan opsi tema baru **"Aqua Glass (macOS Modern)"** pada menu Pengaturan Admin > Tema yang diterapkan secara global ke seluruh portal (Admin, Guru/Kepsek/Waka, Piket, dan Pemindai Barcode) di perangkat Desktop maupun Smartphone.

## User Review & Critical Decisions

> [!IMPORTANT]
> Berdasarkan konfirmasi pada tahap klarifikasi:
> - **Gaya Latar & Bias Cahaya**: Dikonfirmasi menggunakan **Vibrant Aqua Emerald Mesh dengan orbs cahaya dinamis** (gradasi mesh aqua/emerald dengan bias bola cahaya halus di latar belakang).
> - **Label Pilihan Tema**: Dikonfirmasi menggunakan nama **"Aqua Glass (macOS Modern)"** pada preset tema di menu *Portal Admin > Pengaturan Admin > Tema*.

- **Confirmed Decision 1**: Preservasi seluruh preset tema lama (`indigo`, `emerald`, `slate`, `violet`, `crimson`, `amber`, `teal`, `rose`) tanpa menghapusnya, serta menambahkan `aqua_glass` sebagai opsi preset baru.
- **Confirmed Decision 2**: Penegakan aturan kontras dinamis yang ketat:
  - *Light Mode*: Teks utama hitam pekat/abu tua kontras tinggi (`#0f172a`, `#1e293b`) di atas panel kaca putih transparan (55%–65% opacity) dengan efek bias bola cahaya aqua/emerald. Dilarang menyisakan teks putih di atas kartu terang.
  - *Dark Mode*: Panel kaca gelap semi-transparan (50%–60% opacity, `rgba(15, 23, 42, 0.55)`) di atas latar malam berpendar lembut dengan teks utama putih berkontras tinggi (`#f8fafc`).
- **Confirmed Decision 3**: Batasan ketat: Tidak mengubah alur kerja kamera/pemindai barcode, validasi GPS Geofence, notifikasi WhatsApp, hak akses guru/kepsek/waka, maupun struktur database.

---

## 1. Overview & Core Concept

- **What It Does**: Membawa estetika khas macOS Aqua dan Glassmorphism ke dalam aplikasi presensi sekolah. Menggunakan material kaca buram (*frosted glass*), tepian berkilau halus (*specular border highlights*), bias pendaran cahaya vibrant aqua/emerald orbs, dan tombol bertekstur kapsul kaca mengilap.
- **Target Audience / Persona**: Administrator Sekolah, Kepala Sekolah, Wakil Kepala Sekolah (Waka), Guru Pengampu & Wali Kelas, serta Petugas Piket yang mengakses via smartphone maupun desktop PC.
- **Key Value**: Pengalaman visual yang segar, elegan, dan berkelas dunia tanpa mengorbankan keterbacaan data, kecepatan pemindaian barcode, atau kenyamanan penggunaan di lapangan.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Aktivasi Tema Global**: Admin membuka `Portal Admin > Pengaturan Admin > Tema` → Memilih kartu tema `"Aqua Glass (macOS Modern)"` → Klik "Terapkan Tema". Status tersimpan ke server (`/api/settings`) dan seketika menyinkronkan seluruh klien dan portal yang sedang aktif.
2. **Pengalaman Mobile Portal Guru**:
   - Guru membuka portal di smartphone → Menikmati **Sticky Glass Header** dengan avatar inisial, sapaan hangat, lencana peran dinamis, dan toggle dark mode instan.
   - Mengamati **Kartu Ringkasan Status Mengajar** (JP, KBM Terabsen, Piket, Kelas Wali) bertekstur frosted aqua/emerald glass.
   - Menemukan banner **Scan Kehadiran Siswa** bertekstur kaca berkilau dengan tombol kapsul **"Buka Scan"** berefek mengilap.
   - Menjelajahi **Grid Menu Utama (2 Kolom)** dengan ikon bergradasi pendar lembut (*soft glow*) dan badge pill status bertekstur kaca.
   - Bernavigasi melalui **Floating Glass Dock** di bagian bawah layar dengan tombol Beranda berbentuk lingkaran 3D bercahaya lembut.
3. **Pengalaman Desktop Admin Dashboard**:
   - Tampilan KPI Statistik tersusun dalam **Bento Grid** simetris berpanel kaca semi-transparan.
   - Tabel Log Pemindaian Terkini, Form Pengaturan, dan Modal Dialog tampil dengan panel *frosted glass* dan *subtle hairline borders*.
   - Sidebar navigasi desktop bertekstur kaca transparan senada dilengkapi tombol *collapsible toggle* modern di bagian atas.

### Visual Identity & Theme Tokens

```
┌────────────────────────────────────────────────────────────────────────┐
│                   AQUA GLASS THEME TOKENS                              │
├──────────────────────┬────────────────────────┬────────────────────────┤
│ Token                │ Light Mode             │ Dark Mode              │
├──────────────────────┼────────────────────────┼────────────────────────┤
│ Primary Accent       │ #0284c7 (Aqua Sky)     │ #38bdf8 (Electric Aqua)│
│ Secondary Emerald    │ #059669 (Emerald)      │ #34d399 (Mint Glow)    │
│ Background Canvas    │ Aqua Mesh Canvas       │ Deep Navy Night Mesh   │
│ Glass Surface Panel  │ rgba(255,255,255,0.60) │ rgba(15,23,42,0.58)    │
│ Glass Border         │ rgba(255,255,255,0.70) │ rgba(255,255,255,0.14) │
│ Backdrop Blur        │ blur(20px) saturate(180%)                       │
│ Text Primary         │ #0f172a (High Contrast)│ #f8fafc (Crisp White)  │
│ Text Secondary       │ #334155 (Slate 700)    │ #94a3b8 (Slate 400)    │
│ Specular Highlight   │ 0 1px 0 rgba(255,255,255,0.8) inset             │
│ Ambient Glow Shadow  │ 0 8px 32px 0 rgba(14,165,233,0.12)              │
└──────────────────────┴────────────────────────┴────────────────────────┘
```

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: CSS Variable Architecture & Root Theme Scope**:
  - *Approach*: Memetakan token Aqua Glass ke CSS variables di `src/theme.ts` dan `src/contexts/ThemeModeContext.tsx`, serta menerapkan kelas utility `.theme-aqua_glass` pada container global.
  - *Why*: Memungkinkan seluruh portal (Admin, Guru, Piket, Kiosk Scanner) secara otomatis beradaptasi tanpa perlu menulis ulang logika tiap halaman, sekaligus mendukung transisi mulus Dark/Light mode.
- **Decision 2: Strict Text Contrast Guard**:
  - *Approach*: Di mode terang, dilarang memakai teks putih pada kartu kaca terang; semua judul, angka numerik, dan label menggunakan `#0f172a` atau `#0369a1` dengan ketebalan yang tegas. Di mode gelap, otomatis beralih ke `#ffffff` / `#f8fafc`.
  - *Why*: Memenuhi standar aksesibilitas WCAG AA (rasio kontras > 4.5:1) dan instruksi tegas pengguna.
- **Decision 3: Non-Destructive Extension**:
  - *Approach*: Seluruh preset tema yang ada tetap dipertahankan. File kamera scanner, geofence, dan integrasi WhatsApp tidak tersentuh secara fungsional.

---

## 4. Technical Architecture & Data Strategy

### System & Component Architecture

```
                  ┌─────────────────────────────────────────┐
                  │    Admin Settings (Menu Tema)           │
                  │   - Preset: Aqua Glass (macOS Modern)   │
                  └────────────────────┬────────────────────┘
                                       │ (POST /api/settings)
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │       Server Settings Store             │
                  │       & Broadcast themeChanged          │
                  └────────────────────┬────────────────────┘
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
┌───────────────────────────────┐             ┌───────────────────────────────┐
│   ThemeModeContext.tsx        │             │        Global CSS & Canvas    │
│   - THEME_PRESETS.aqua_glass  │             │   - Aqua Emerald Orbs Mesh    │
│   - Dynamic Contrast Tokens   │             │   - Specular Frosted Glass    │
│   - Dark / Light Mode Sync    │             │   - Backdrop Blur Saturate    │
└───────────────┬───────────────┘             └───────────────┬───────────────┘
                │                                             │
      ┌─────────┴───────────────┬─────────────────────────────┴────────┐
      ▼                         ▼                                      ▼
┌──────────────────┐  ┌──────────────────────────────┐  ┌──────────────────────────┐
│   Admin Portal   │  │  Guru Portal (Mobile & Desk) │  │  Piket & Scanner Portal  │
│ - Glass Sidebar  │  │ - Sticky Glass Header        │  │ - Glass Card Container   │
│ - Bento Grid KPI │  │ - Frosted Emerald Banner     │  │ - High-Contrast Camera   │
│ - Frosted Modals │  │ - 2-Col Frosted Menu Cards   │  │   Scan & Geofence Frame  │
│ - Glass Tables   │  │ - Floating Glass Dock (Dock) │  │ - Emerald/Aqua Overlays  │
└──────────────────┘  └──────────────────────────────┘  └──────────────────────────┘
```

### Component State & Style Mapping

1. **`src/theme.ts`**:
   - Menambahkan preset `aqua_glass` ke `THEME_PRESETS` dengan konfigurasi warna, background gradasi, specular borders, dan glass shadows.
2. **`src/contexts/ThemeModeContext.tsx`**:
   - Memastikan saat `presetId === 'aqua_glass'`, perhitungan kontras gelap/terang menghasilkan opacity kartu 55%–65% (light) dan 50%–60% (dark), dengan CSS variables lengkap.
3. **`src/index.css`**:
   - Menambahkan utilitas background `.theme-aqua_glass` dengan latar orbs cahaya dinamis (vibrant aqua/emerald radial gradients) serta styling `.glass-mac-card`, `.glass-dock-bar`, dan `.glass-capsule-button`.
4. **`src/pages/admin/AdminLayout.tsx` & `Dashboard.tsx`**:
   - Memperbarui sidebar transparan dengan collapsible toggle, mengadaptasi kartu Bento Grid menjadi panel kaca semi-transparan.
5. **`src/pages/guru/GuruPortal.tsx`**:
   - Memperbarui Sticky Header, Kartu Ringkasan & Banner Scan (kapsul "Buka Scan"), Menu 2-Kolom, dan Floating Bottom Dock bergaya dock macOS dengan lingkaran 3D di tombol Beranda.

---

## 5. Verification & Test Plan

1. **Compilation Check**: Menjalankan build TypeScript untuk memastikan tidak ada kesalahan tipe data.
2. **Theme Switch Verification**: Menguji peralihan ke tema "Aqua Glass (macOS Modern)" di Pengaturan Admin dan memeriksa responsivitas global.
3. **Contrast Validation**: Menguji tampilan pada Light Mode dan Dark Mode untuk menjamin kontras teks memenuhi syarat (tidak ada teks putih di atas latar putih/terang).
4. **Mobile & Desktop Integrity**: Memverifikasi tampilan mobile smartphone Portal Guru (Dock, Banner, Sticky Header) serta tampilan desktop Admin (Bento Grid, Glass Sidebar).
5. **Regression Verification**: Memastikan Scanner Kamera, GPS Geofence, WhatsApp service, dan hak akses Guru/Kepsek/Waka tetap bekerja 100% normal.
