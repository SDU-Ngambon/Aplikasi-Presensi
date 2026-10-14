const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');
const autoTableModule = require('jspdf-autotable');
const autoTable = autoTableModule.default || autoTableModule;

function generateProposalPdf() {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let y = margin;

  const schoolName = 'SMA / SMK NEGERI 1 CONTOH';
  const schoolAddress = 'Jl. Pendidikan No. 45, Kompleks Pendidikan, Kota Administrasi';
  const kepsekName = 'Drs. H. Ahmad Sanusi, M.Pd';
  const kepsekNip = '19750814 200003 1 002';
  const pengusulName = 'Budi Prasetyo, S.Kom';
  const pengusulNip = '19881120 201502 1 004';
  const tahunAjaran = '2026/2027';
  const targetDate = '12 September 2026';

  const checkPageBreak = (neededHeight = 20) => {
    if (y + neededHeight > pageHeight - margin - 15) {
      doc.addPage();
      y = margin + 10;
      return true;
    }
    return false;
  };

  // COVER PAGE
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 20, 'F');
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 20, pageWidth, 4, 'F');

  y = 45;
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('DOKUMEN PROPOSAL TEKNIS & PENERAPAN', pageWidth / 2, y, { align: 'center' });

  y += 10;
  doc.setFontSize(18);
  doc.setTextColor(37, 99, 235);
  doc.text('SISTEM PRESENSI & KESISWAAN DIGITAL', pageWidth / 2, y, { align: 'center' });

  y += 7;
  doc.setFontSize(12);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.text('BERBASIS SMART QR CODE & WHATSAPP GATEWAY', pageWidth / 2, y, { align: 'center' });

  y += 12;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.8);
  doc.line(margin + 20, y, pageWidth - margin - 20, y);

  y += 25;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 75, 4, 4, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 75, 4, 4, 'S');

  let boxY = y + 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('INSTANSI PENERIMA:', margin + 10, boxY);
  boxY += 6;
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(schoolName, margin + 10, boxY);
  boxY += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(schoolAddress, margin + 10, boxY);

  boxY += 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('DISUSUN OLEH:', margin + 10, boxY);
  boxY += 6;
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${pengusulName} (Tim IT & Kesiswaan)`, margin + 10, boxY);

  boxY += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('TAHUN PELAJARAN:', margin + 10, boxY);
  boxY += 6;
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(tahunAjaran, margin + 10, boxY);

  y = 210;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const ringkasanText = 'Proposal ini menyajikan rancangan komprehensif implementasi sistem presensi mandiri, manajemen rombel, perizinan piket, percetakan kartu identitas digital, serta otomasi notifikasi orang tua untuk mewujudkan ekosistem sekolah digital yang transparan dan tertib.';
  const splitRingkasan = doc.splitTextToSize(ringkasanText, contentWidth - 20);
  doc.text(splitRingkasan, margin + 10, y);

  doc.setFillColor(30, 41, 59);
  doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
  doc.setTextColor(248, 250, 252);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Sistem Presensi Digital - Dokumen Resmi Penerapan Sistem', margin, pageHeight - 6);
  doc.text(targetDate, pageWidth - margin, pageHeight - 6, { align: 'right' });

  // PAGE 2: BAB I & BAB II
  doc.addPage();
  y = margin + 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text('BAB I: RINGKASAN EKSEKUTIF & LATAR BELAKANG', margin, y);
  y += 3;
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.6);
  doc.line(margin, y, margin + 50, y);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(37, 99, 235);
  doc.text('1.1 Latar Belakang Masalah', margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const p1 = 'Pencatatan kehadiran peserta didik secara manual di sekolah seringkali menghadapi kendala keterlambatan informasi ke pihak orang tua, pemborosan kertas, rekapitulasi data yang memakan waktu berhari-hari, dan kurangnya transparansi arus perizinan siswa di pos piket gerbang sekolah.';
  doc.text(doc.splitTextToSize(p1, contentWidth), margin, y);
  y += 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(37, 99, 235);
  doc.text('1.2 Tujuan Penerapan Sistem', margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const p2 = '1. Mengotomatisasi absensi siswa dan guru menggunakan Smart QR Code / Barcode yang cepat dan anti-antrean.\n2. Memberikan notifikasi instan kehadiran dan keterlambatan langsung ke WhatsApp orang tua / wali murid.\n3. Memudahkan Guru Piket mengelola izin keluar/masuk, sakit, dispensasi, serta mencetak surat izin resmi.\n4. Mempermudah manajemen rombel dan kenaikan kelas massal otomatis tanpa duplikasi data.\n5. Menyediakan fitur mandiri desain dan cetak Kartu Pelajar Digital A4/PVC berstandar resmi.';
  doc.text(doc.splitTextToSize(p2, contentWidth), margin, y);
  y += 24;

  // BAB II: MODUL
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text('BAB II: RINCIAN MODUL & KEGUNAAN APLIKASI', margin, y);
  y += 3;
  doc.setDrawColor(37, 99, 235);
  doc.line(margin, y, margin + 50, y);
  y += 7;

  const modulesTable = [
    ['1', 'Scanner Presensi Mandiri (Smart QR/Barcode)', 'Pemindaian instan via Webcam/Smartphone/Scanner USB, audio feedback bersuara, validasi batas jam masuk/pulang, dan kesiapan offline.'],
    ['2', 'Portal Guru Piket & Perizinan', 'Pencatatan status Sakit (S), Izin (I), Dispensasi (D), Terlambat (T), arsip surat dokter, cetak Surat Izin Masuk Kelas, dan monitoring live.'],
    ['3', 'Database Master Siswa & Guru', 'Pengelolaan data lengkap (NISN, NIP, WhatsApp Ortu, Foto), impor/ekspor Excel massal, serta kolom kustom dinamis.'],
    ['4', 'Rombel & Kenaikan Kelas Otomatis', 'Pengorganisasian kelas, status PKL/Magang, wali kelas, serta Kenaikan Kelas Otomatis (10->11, 11->12, 12->Alumni) tanpa duplikasi.'],
    ['5', 'Desain & Percetakan ID Card', 'Visual designer kartu pelajar drag-and-drop, generator QR Code/Barcode, dan siap cetak massal format A4 (10 kartu/lembar) maupun PVC.'],
    ['6', 'Rekapitulasi Laporan & Analitik', 'Laporan periodik harian, mingguan, bulanan, grafik disiplin, filter rombel, dan ekspor laporan resmi ke Microsoft Excel (.xlsx).'],
    ['7', 'Otomasi WhatsApp Gateway & Scheduler', 'Integrasi multi-provider (Fonnte, Wablas, Starsender), notifikasi kedatangan instan, dan broadcast otomatis rekap harian ke Wali Kelas/Ortu.'],
    ['8', 'Branding & Keamanan Database', 'Kustomisasi identitas sekolah, logo, favicon, multi-tema resmi, serta cadangan basis data PostgreSQL ganda.']
  ];

  autoTable(doc, {
    startY: y,
    head: [['No', 'Modul Sistem', 'Fungsi & Kegunaan Utama']],
    body: modulesTable,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 50, fontStyle: 'bold' },
      2: { cellWidth: 110 }
    },
    margin: { left: margin, right: margin }
  });

  // PAGE 3: BAB III & BAB IV & BAB V
  doc.addPage();
  y = margin + 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text('BAB III: ARSITEKTUR SISTEM & KEBUTUHAN PERANGKAT', margin, y);
  y += 3;
  doc.setDrawColor(37, 99, 235);
  doc.line(margin, y, margin + 50, y);
  y += 7;

  const hwTable = [
    ['Pos Scanner Gerbang', '1x Laptop/PC atau Tablet Android + 1x Scanner Barcode 2D/QR USB / Webcam HD', 'Ditempatkan di pintu masuk gerbang utama sekolah.'],
    ['Meja Guru Piket', '1x Laptop/PC terhubung internet + 1x Printer Dokumen / Termal (opsional)', 'Untuk memproses izin keluar-masuk dan cetak slip izin masuk kelas.'],
    ['Ruang Tata Usaha / Admin', '1x PC Admin + 1x Printer Kartu PVC atau Printer Inkjet A4', 'Untuk impor master data, cetak kartu massal, dan rekap bulanan.']
  ];

  autoTable(doc, {
    startY: y,
    head: [['Lokasi / Pos', 'Kebutuhan Perangkat Keras', 'Keterangan Operasional']],
    body: hwTable,
    theme: 'grid',
    headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold' },
      1: { cellWidth: 70 },
      2: { cellWidth: 60 }
    },
    margin: { left: margin, right: margin }
  });

  y = doc.lastAutoTable.finalY + 12;

  // BAB IV: TIMELINE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text('BAB IV: JADWAL KERJA PENERAPAN (TIMELINE 4 PEKAN)', margin, y);
  y += 3;
  doc.setDrawColor(37, 99, 235);
  doc.line(margin, y, margin + 50, y);
  y += 7;

  const timelineTable = [
    ['Pekan I', 'Pengumpulan Data Master Siswa, Kelas & Guru dari format Excel', 'Database 100% tervalidasi'],
    ['Pekan II', 'Finalisasi Desain Kartu, Generate QR Code & Cetak Kartu Pelajar Massal', 'Seluruh siswa memiliki kartu presensi'],
    ['Pekan III', 'Instalasi Scanner Gerbang, Konfigurasi WA Gateway & Pelatihan Guru Piket', 'Petugas terlatih mengoperasikan sistem'],
    ['Pekan IV', 'Peluncuran Resmi (Go-Live) dan Evaluasi Kedisiplinan Mingguan', 'Presensi mandiri berjalan stabil']
  ];

  autoTable(doc, {
    startY: y,
    head: [['Tahap', 'Aktivitas Utama', 'Target Luaran']],
    body: timelineTable,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 25, fontStyle: 'bold' },
      1: { cellWidth: 85 },
      2: { cellWidth: 60 }
    },
    margin: { left: margin, right: margin }
  });

  y = doc.lastAutoTable.finalY + 15;
  checkPageBreak(50);

  // LEMBAR PENGESAHAN
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('BAB V: LEMBAR PENGESAHAN PROPOSAL', margin, y);
  y += 3;
  doc.setDrawColor(37, 99, 235);
  doc.line(margin, y, margin + 40, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text('Proposal Penerapan Sistem Presensi & Kesiswaan Digital ini diajukan untuk disetujui:', margin, y);
  y += 12;

  const signTable = [
    [
      `Mengetahui & Menyetujui,\nKepala Sekolah\n\n\n\n\n${kepsekName}\nNIP. ${kepsekNip}`,
      `Diajukan Oleh,\nKetua Tim IT / Kesiswaan\n\n\n\n\n${pengusulName}\nNIP. ${pengusulNip}`
    ]
  ];

  autoTable(doc, {
    startY: y,
    body: signTable,
    theme: 'plain',
    bodyStyles: { halign: 'center', fontSize: 8.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: contentWidth / 2 },
      1: { cellWidth: contentWidth / 2 }
    },
    margin: { left: margin, right: margin }
  });

  // Footer for all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    if (i > 1) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
      doc.text(`Proposal Sistem Presensi Digital - ${schoolName}`, margin, pageHeight - 7);
      doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
    }
  }

  const outputPath = path.join(process.cwd(), 'PROPOSAL_PENERAPAN_SISTEM.pdf');
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  fs.writeFileSync(outputPath, pdfBuffer);
  console.log('PDF successfully generated at:', outputPath);
}

generateProposalPdf();
