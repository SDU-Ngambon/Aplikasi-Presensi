import React, { useRef, useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  IconButton
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import CloseIcon from '@mui/icons-material/Close';
import VerifiedIcon from '@mui/icons-material/Verified';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';

interface LembarPengesahanModalProps {
  open: boolean;
  onClose: () => void;
  teacher: {
    name: string;
    nip?: string;
    subject?: string;
    class?: string;
  };
  pengesahan?: {
    tipe_pengesahan?: 'QR_CODE' | 'TTD_DIGITAL';
    ttd_image_base64?: string;
    qr_signature_data?: any;
    tanggal_pengesahan?: string;
    tahun_ajaran?: string;
    semester?: string;
    kepsek_name?: string;
    nip_kepsek?: string;
  };
  dokumenList?: Array<{
    id: string;
    category_nama?: string;
    category_id?: string;
    nama_kategori?: string;
    file_name?: string;
    original_name?: string;
    nama_file?: string;
    status: string;
    mapel?: string;
    rombel?: string;
    created_at?: string;
  }>;
  schoolSettings?: {
    nama_website?: string;
    schoolName?: string;
    school_name?: string;
    nama_sekolah?: string;
    schoolAddress?: string;
    school_address?: string;
    alamat_sekolah?: string;
    headmaster_name?: string;
    headmasterName?: string;
    kepala_sekolah?: string;
    headmaster_nip?: string;
    headmasterNip?: string;
    nip_kepala_sekolah?: string;
    logoBase64?: string;
    logo?: string;
    logo_url?: string;
  };
}

export default function LembarPengesahanModal({
  open,
  onClose,
  teacher,
  pengesahan,
  dokumenList = [],
  schoolSettings: initialSchoolSettings
}: LembarPengesahanModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [template, setTemplate] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<any>(initialSchoolSettings || {});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      const token = localStorage.getItem('token') || localStorage.getItem('guru_token') || sessionStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      Promise.all([
        axios.get('/api/perangkat/pengesahan-template', { headers }).catch(() => ({ data: {} })),
        axios.get('/api/settings', { headers }).catch(() => ({ data: {} })),
        axios.get('/api/perangkat/categories', { headers }).catch(() => ({ data: {} }))
      ]).then(([tplRes, setRes, catRes]) => {
        if (tplRes.data && tplRes.data.data) {
          setTemplate(tplRes.data.data);
        }
        if (setRes.data) {
          setSchoolSettings(setRes.data);
        }
        if (catRes.data && Array.isArray(catRes.data.data)) {
          setCategories(catRes.data.data);
        }
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [open]);

  // Data Sekolah & Kop Surat
  const schoolName = template?.nama_sekolah || schoolSettings?.nama_sekolah || schoolSettings?.schoolName || schoolSettings?.nama_website || 'SMK NEGERI CONTOH';
  const schoolAddress = template?.alamat_sekolah || schoolSettings?.alamat_sekolah || schoolSettings?.schoolAddress || 'Jl. Raya Pendidikan No. 123';
  const instansiInduk = template?.instansi_induk || schoolSettings?.instansi_induk || 'PEMERINTAH PROVINSI JAWA TIMUR';
  const dinasPendidikan = template?.dinas_pendidikan || schoolSettings?.dinas_pendidikan || 'DINAS PENDIDIKAN';
  const kontakSekolah = template?.kontak_sekolah || schoolSettings?.kontak_sekolah || '';
  const logoUrl = schoolSettings?.logoBase64 || schoolSettings?.logo || schoolSettings?.logo_url;

  // Redaksi & Judul
  const judulLembar = template?.judul_lembar || 'LEMBAR PENGESAHAN PERANGKAT AJAR';
  const redaksiPembuka = template?.redaksi_pembuka || 'Setelah melalui tahapan penyusunan, telaah teknis, dan verifikasi kelayakan akademik oleh Tim Pengembang Kurikulum Sekolah, Perangkat Perencanaan Pembelajaran (Perangkat Ajar) yang disusun oleh:';
  const redaksiPersetujuan = template?.redaksi_persetujuan || 'Dinyatakan telah MEMENUHI STANDAR KELENGKAPAN KURIKULUM dan DISAHKAN untuk dipergunakan sebagai pedoman operasional Kegiatan Belajar Mengajar (KBM).';
  const catatanKaki = template?.catatan_kaki || 'Dokumen ini telah diverifikasi secara elektronik dan dinyatakan sah sebagai dokumen mutu pembelajaran.';

  // Pejabat Penandatangan
  const kepsekName = (template?.nama_kepsek && template.nama_kepsek.trim())
    || (schoolSettings?.headmaster_name && schoolSettings.headmaster_name.trim())
    || (schoolSettings?.headmasterName && schoolSettings.headmasterName.trim())
    || (schoolSettings?.kepala_sekolah && schoolSettings.kepala_sekolah.trim())
    || (pengesahan?.kepsek_name && !['Administrator', 'admin', 'Admin', 'Kepala Sekolah'].includes(pengesahan.kepsek_name) ? pengesahan.kepsek_name : '')
    || 'Kepala Sekolah';

  const kepsekNip = (template?.nip_kepsek && template.nip_kepsek.trim())
    || (schoolSettings?.headmaster_nip && schoolSettings.headmaster_nip.trim())
    || (schoolSettings?.headmasterNip && schoolSettings.headmasterNip.trim())
    || (schoolSettings?.nip_kepala_sekolah && schoolSettings.nip_kepala_sekolah.trim())
    || (pengesahan?.nip_kepsek && pengesahan.nip_kepsek !== '-' ? pengesahan.nip_kepsek : '')
    || '-';

  const wakaName = template?.nama_waka_kurikulum || schoolSettings?.nama_waka_kurikulum || 'Waka Bidang Kurikulum';
  const wakaNip = template?.nip_waka_kurikulum || schoolSettings?.nip_waka_kurikulum || '-';
  const titimangsaKota = template?.titimangsa_kota || schoolSettings?.titimangsa_kota || schoolSettings?.kota || 'Bojonegoro';

  const tahunAjaran = pengesahan?.tahun_ajaran || template?.tahun_ajaran || '2024/2025';
  const semester = pengesahan?.semester || template?.semester || 'Ganjil';

  // Helper untuk mendapatkan nama jenis perangkat
  const getCategoryName = (doc: any) => {
    if (doc.category_nama && doc.category_nama.trim()) return doc.category_nama;
    if (doc.category_id && categories.length > 0) {
      const found = categories.find((c: any) => c.id === doc.category_id);
      if (found && found.nama) return found.nama;
    }
    if (doc.nama_kategori && doc.nama_kategori.trim()) return doc.nama_kategori;
    return 'Perangkat Pembelajaran';
  };

  const getFileName = (doc: any) => {
    return doc.file_name || doc.original_name || doc.nama_file || 'Berkas Terlampir';
  };

  // Hitung Nama Mata Pelajaran
  const distinctMapelsFromDocs = Array.from(new Set((dokumenList || []).map(d => d.mapel).filter(Boolean)));
  const teacherSubjectDisplay = (teacher.subject && teacher.subject !== teacher.class && teacher.subject !== '-')
    ? teacher.subject
    : distinctMapelsFromDocs.length > 0
    ? distinctMapelsFromDocs.join(', ')
    : (teacher.class && teacher.class !== '-' ? teacher.class : 'Guru Mata Pelajaran');

  const formattedDate = pengesahan?.tanggal_pengesahan 
    ? new Date(pengesahan.tanggal_pengesahan).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  // Print function with isolated iframe
  const handlePrint = () => {
    const el = printRef.current;
    if (!el) {
      window.print();
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    const innerContent = el.innerHTML;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="utf-8" />
        <title>Lembar Pengesahan - ${teacher.name}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 10mm 12mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: 'Times New Roman', Times, serif, Arial, sans-serif;
            color: #000000;
            background: #ffffff;
            font-size: 10.5pt;
            line-height: 1.35;
          }
          table.pengesahan-doc-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
          }
          table.pengesahan-doc-table th, table.pengesahan-doc-table td {
            border: 1px solid #000000 !important;
            padding: 4px 6px;
            font-size: 9.5pt;
            color: #000000;
          }
          table.pengesahan-doc-table thead {
            display: table-header-group;
            background-color: #f1f5f9 !important;
          }
          .kop-container {
            border-bottom: 3px double #000000;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }
          .pengesahan-title-section {
            text-align: center !important;
            width: 100% !important;
            margin-top: 6px !important;
            margin-bottom: 14px !important;
          }
          .pengesahan-title-main {
            font-family: inherit;
            font-weight: 900 !important;
            text-align: center !important;
            text-decoration: underline !important;
            text-transform: uppercase !important;
            font-size: 11.5pt !important;
            letter-spacing: 0.5px;
            line-height: 1.3 !important;
            margin: 0 auto 4px auto !important;
            display: block !important;
          }
          .pengesahan-title-sub {
            font-family: inherit;
            font-weight: 700 !important;
            text-align: center !important;
            font-size: 10pt !important;
            margin: 0 auto !important;
            display: block !important;
          }
          img.kop-logo-img {
            width: 60px !important;
            height: 60px !important;
            max-width: 60px !important;
            max-height: 60px !important;
            object-fit: contain !important;
          }
          .signature-box-item {
            page-break-inside: avoid;
            break-inside: avoid;
            margin-top: 14px;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        </style>
      </head>
      <body>
        ${innerContent}
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Print iframe error:', err);
        window.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1200);
      }
    }, 400);
  };

  const qrGuruPayload = JSON.stringify({
    role: 'GURU_PENYUSUN',
    school: schoolName,
    teacher: teacher.name,
    nip: teacher.nip || '-',
    subject: teacherSubjectDisplay,
    academic_year: `${tahunAjaran} - ${semester}`,
    status: 'DISUSUN_LENGKAP',
    verified_at: formattedDate
  });

  const qrWakaPayload = JSON.stringify({
    role: 'VERIFIKASI_KURIKULUM',
    school: schoolName,
    inspector: wakaName,
    nip: wakaNip,
    target_teacher: teacher.name,
    academic_year: `${tahunAjaran} - ${semester}`,
    status: 'TERVERIFIKASI_AKADEMIK',
    verified_at: formattedDate
  });

  const qrKepsekPayload = JSON.stringify({
    role: 'PENGESAHAN_KEPALA_SEKOLAH',
    school: schoolName,
    headmaster: kepsekName,
    nip: kepsekNip,
    teacher: teacher.name,
    subject: teacherSubjectDisplay,
    academic_year: `${tahunAjaran} - ${semester}`,
    status: 'RESMI_DISAHKAN',
    date: formattedDate,
    hash: pengesahan?.qr_signature_data?.security_hash || `SAH-${(teacher.nip || 'GURU').replace(/\s+/g, '')}-${tahunAjaran.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString(36).toUpperCase()}`
  });

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            p: 1
          }
        }
      }}
    >
      <DialogTitle 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          borderBottom: '1px solid #e2e8f0', 
          pb: 1.5
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VerifiedIcon color="success" />
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
            Lembar Pengesahan Perangkat Ajar Resmi
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" color="inherit">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 1, sm: 3 }, bgcolor: '#ffffff', overflowX: 'auto' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box id="printable-area" ref={printRef} sx={{ color: '#0f172a', fontFamily: 'serif', p: { xs: 1, sm: 2 }, minWidth: { xs: 580, md: 'auto' } }}>
            {/* KOP SURAT RESMI */}
            <div className="kop-container">
              <table style={{ width: '100%', border: 'none', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    {logoUrl && (
                      <td style={{ width: '70px', textAlign: 'center', verticalAlign: 'middle', border: 'none', padding: '0 8px 0 0' }}>
                        <img
                          src={logoUrl}
                          alt="Logo Sekolah"
                          className="kop-logo-img"
                          style={{ width: '60px', height: '60px', maxWidth: '60px', maxHeight: '60px', objectFit: 'contain' }}
                        />
                      </td>
                    )}
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', border: 'none', padding: 0 }}>
                      <div style={{ textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.2 }}>
                        {instansiInduk}
                      </div>
                      <div style={{ textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.2, marginTop: '2px' }}>
                        {dinasPendidikan}
                      </div>
                      <div style={{ textTransform: 'uppercase', fontWeight: 900, fontFamily: 'serif', fontSize: '1.25rem', margin: '3px 0', lineHeight: 1.2 }}>
                        {schoolName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#1e293b', lineHeight: 1.2 }}>
                        {schoolAddress} {kontakSekolah ? `• ${kontakSekolah}` : ''}
                      </div>
                    </td>
                    {logoUrl && (
                      <td style={{ width: '70px', border: 'none' }} />
                    )}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* JUDUL LEMBAR PENGESAHAN (Explicitly Centered in Print & Screen) */}
            <div className="pengesahan-title-section" style={{ textAlign: 'center', width: '100%', marginBottom: '14px', marginTop: '6px' }}>
              <div className="pengesahan-title-main" style={{ textAlign: 'center', fontWeight: 900, textDecoration: 'underline', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '1.05rem', lineHeight: 1.2, margin: '0 auto 4px auto' }}>
                {judulLembar}
              </div>
              <div className="pengesahan-title-sub" style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.85rem', margin: '0 auto' }}>
                Tahun Ajaran {tahunAjaran} — Semester {semester}
              </div>
            </div>

            {/* REDAKSI PEMBUKA */}
            <Typography variant="body2" sx={{ textAlign: 'justify', lineHeight: 1.4, mb: 1.5, fontSize: '0.85rem' }}>
              {redaksiPembuka}
            </Typography>

            {/* IDENTITAS GURU PENYUSUN */}
            <Box sx={{ mb: 2, px: { xs: 1, sm: 2 } }}>
              <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '160px', fontWeight: 600, padding: '2px 0' }}>Nama Lengkap Guru</td>
                    <td style={{ width: '15px' }}>:</td>
                    <td style={{ fontWeight: 800 }}>{teacher.name}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600, padding: '2px 0' }}>NIP / NUPTK</td>
                    <td>:</td>
                    <td>{teacher.nip || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600, padding: '2px 0' }}>Mata Pelajaran</td>
                    <td>:</td>
                    <td style={{ fontWeight: 700 }}>{teacherSubjectDisplay}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600, padding: '2px 0' }}>Satuan Pendidikan</td>
                    <td>:</td>
                    <td>{schoolName}</td>
                  </tr>
                </tbody>
              </table>
            </Box>

            {/* REDAKSI PERSETUJUAN */}
            <Typography variant="body2" sx={{ textAlign: 'justify', lineHeight: 1.4, mb: 2, fontSize: '0.85rem' }}>
              {redaksiPersetujuan}
            </Typography>

            {/* DAFTAR DOKUMEN YANG DISAHKAN */}
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.8, fontSize: '0.85rem' }}>
                Daftar Dokumen Perangkat Pembelajaran yang Disahkan:
              </Typography>
              <table className="pengesahan-doc-table" style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000' }}>
                <thead style={{ backgroundColor: '#f1f5f9' }}>
                  <tr>
                    <th style={{ width: '35px', textAlign: 'center', border: '1px solid #334155', padding: '4px 3px', fontSize: '10px' }}>No</th>
                    <th style={{ textAlign: 'left', border: '1px solid #334155', padding: '4px 6px', fontSize: '10px' }}>Jenis Perangkat</th>
                    <th style={{ textAlign: 'left', border: '1px solid #334155', padding: '4px 6px', fontSize: '10px' }}>Nama Berkas</th>
                    <th style={{ textAlign: 'left', border: '1px solid #334155', padding: '4px 6px', fontSize: '10px' }}>Mapel & Rombel</th>
                    <th style={{ textAlign: 'center', width: '110px', border: '1px solid #334155', padding: '4px 3px', fontSize: '10px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dokumenList.length > 0 ? (
                    dokumenList.map((doc, idx) => (
                      <tr key={doc.id || idx}>
                        <td style={{ textAlign: 'center', border: '1px solid #334155', padding: '3px 2px', fontSize: '9.5px' }}>{idx + 1}</td>
                        <td style={{ fontWeight: 600, border: '1px solid #334155', padding: '3px 5px', fontSize: '9.5px' }}>
                          {getCategoryName(doc)}
                        </td>
                        <td style={{ fontFamily: 'monospace', border: '1px solid #334155', padding: '3px 5px', fontSize: '9px' }}>
                          {getFileName(doc)}
                        </td>
                        <td style={{ border: '1px solid #334155', padding: '3px 5px', fontSize: '9.5px' }}>
                          {doc.mapel || teacherSubjectDisplay}{doc.rombel ? ` (${doc.rombel})` : ''}
                        </td>
                        <td style={{ textAlign: 'center', color: '#166534', fontWeight: 700, border: '1px solid #334155', padding: '3px 2px', fontSize: '9px' }}>
                          Terverifikasi & Sah
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '10px', border: '1px solid #334155', fontSize: '9.5px' }}>
                        Seluruh Berkas Perangkat Ajar Wajib
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Box>

            {/* TITIKMANGSA & TANDA TANGAN 3 PIHAK */}
            <div className="signature-box-item" style={{ pageBreakInside: 'avoid', marginTop: '16px' }}>
              <div style={{ textAlign: 'right', marginBottom: '12px', fontSize: '0.85rem' }}>
                Ditetapkan di: <b>{titimangsaKota}</b><br />
                Pada Tanggal: <b>{formattedDate}</b>
              </div>

              <table style={{ width: '100%', border: 'none', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    {/* 1. GURU PENGAMPU */}
                    <td style={{ width: '33.3%', textAlign: 'center', verticalAlign: 'top', border: 'none' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.8rem', lineHeight: 1.2, marginBottom: '6px' }}>
                        Guru Pengampu,<br />(Penyusun)
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '4px 0' }}>
                        <QRCodeSVG value={qrGuruPayload} size={65} level="M" />
                        <span style={{ fontSize: '7.5px', color: '#64748b', marginTop: '3px' }}>
                          Tanda Tangan Penyusun
                        </span>
                      </div>
                      <div style={{ fontWeight: 800, textDecoration: 'underline', fontSize: '0.85rem', marginTop: '4px' }}>
                        {teacher.name}
                      </div>
                      <div style={{ fontSize: '0.75rem' }}>
                        NIP. {teacher.nip || '-'}
                      </div>
                    </td>

                    {/* 2. WAKA KURIKULUM */}
                    <td style={{ width: '33.3%', textAlign: 'center', verticalAlign: 'top', border: 'none' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.8rem', lineHeight: 1.2, marginBottom: '6px' }}>
                        Memeriksa & Memverifikasi:<br />Waka Bidang Kurikulum,
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '4px 0' }}>
                        <QRCodeSVG value={qrWakaPayload} size={65} level="M" />
                        <span style={{ fontSize: '7.5px', color: '#64748b', marginTop: '3px' }}>
                          Verifikasi Akademik
                        </span>
                      </div>
                      <div style={{ fontWeight: 800, textDecoration: 'underline', fontSize: '0.85rem', marginTop: '4px' }}>
                        {wakaName}
                      </div>
                      <div style={{ fontSize: '0.75rem' }}>
                        NIP. {wakaNip}
                      </div>
                    </td>

                    {/* 3. KEPALA SEKOLAH */}
                    <td style={{ width: '33.3%', textAlign: 'center', verticalAlign: 'top', border: 'none' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.8rem', lineHeight: 1.2, marginBottom: '6px' }}>
                        Mengetahui & Mengesahkan:<br />Kepala Sekolah,
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '4px 0' }}>
                        {pengesahan?.tipe_pengesahan === 'TTD_DIGITAL' && pengesahan?.ttd_image_base64 ? (
                          <img
                            src={pengesahan.ttd_image_base64}
                            alt="Tanda Tangan Kepala Sekolah"
                            style={{ height: '55px', objectFit: 'contain', margin: '4px 0' }}
                          />
                        ) : (
                          <QRCodeSVG value={qrKepsekPayload} size={65} level="M" />
                        )}
                        <span style={{ fontSize: '7.5px', color: '#64748b', marginTop: '3px' }}>
                          Sertifikasi Sah Digital
                        </span>
                      </div>
                      <div style={{ fontWeight: 800, textDecoration: 'underline', fontSize: '0.85rem', marginTop: '4px' }}>
                        {kepsekName}
                      </div>
                      <div style={{ fontSize: '0.75rem' }}>
                        NIP. {kepsekNip}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* CATATAN KAKI */}
              <div style={{ marginTop: '18px', paddingTop: '6px', borderTop: '1px dashed #cbd5e1', textAlign: 'center' }}>
                <span style={{ fontStyle: 'italic', color: '#64748b', fontSize: '0.72rem' }}>
                  Catatan: {catatanKaki}
                </span>
              </div>
            </div>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
        <Button onClick={onClose} variant="outlined" color="inherit" sx={{ fontWeight: 600, borderRadius: 2, textTransform: 'none' }}>
          Tutup
        </Button>
        <Button
          onClick={handlePrint}
          variant="contained"
          color="primary"
          startIcon={<PrintIcon />}
          sx={{ fontWeight: 800, borderRadius: 2, textTransform: 'none' }}
        >
          Cetak Lembar Pengesahan (PDF)
        </Button>
      </DialogActions>
    </Dialog>
  );
}
