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
import FactCheckIcon from '@mui/icons-material/FactCheck';
import axios from 'axios';

interface RekapSupervisiModalProps {
  open: boolean;
  onClose: () => void;
  reports: any[];
  tahunAjaran: string;
  semester: string;
  schoolSettings?: any;
}

export default function RekapSupervisiModal({
  open,
  onClose,
  reports,
  tahunAjaran,
  semester,
  schoolSettings: initialSchoolSettings
}: RekapSupervisiModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [template, setTemplate] = useState<any>(null);
  const [schoolSettings, setSchoolSettings] = useState<any>(initialSchoolSettings || {});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      const token = localStorage.getItem('token') || localStorage.getItem('guru_token') || sessionStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      Promise.all([
        axios.get('/api/perangkat/pengesahan-template', { headers }).catch(() => ({ data: {} })),
        axios.get('/api/settings', { headers }).catch(() => ({ data: {} }))
      ]).then(([tplRes, setRes]) => {
        if (tplRes.data && tplRes.data.data) {
          setTemplate(tplRes.data.data);
        }
        if (setRes.data) {
          setSchoolSettings(setRes.data);
        }
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [open]);

  // Robust isolated print helper that works across all browsers & iframes
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
        <title>Rekapitulasi Supervisi Perangkat Ajar - ${tahunAjaran} (${semester})</title>
        <style>
          @page {
            size: A4 landscape;
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
            font-size: 10pt;
            line-height: 1.3;
          }
          table.rekap-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            page-break-inside: auto;
          }
          table.rekap-table th, table.rekap-table td {
            border: 1px solid #000000 !important;
            padding: 4px 6px;
            font-size: 9.5pt;
            color: #000000;
          }
          table.rekap-table thead {
            display: table-header-group;
            background-color: #f1f5f9 !important;
          }
          table.rekap-table tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          .kop-container {
            border-bottom: 3px double #000000;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }
          .rekap-title-section {
            text-align: center !important;
            width: 100% !important;
            margin-top: 6px !important;
            margin-bottom: 14px !important;
          }
          .rekap-title-main {
            font-family: inherit;
            font-weight: 900 !important;
            text-align: center !important;
            text-decoration: underline !important;
            text-transform: uppercase !important;
            font-size: 11pt !important;
            letter-spacing: 0.5px;
            line-height: 1.3 !important;
            margin: 0 auto 4px auto !important;
            display: block !important;
          }
          .rekap-title-sub {
            font-family: inherit;
            font-weight: 700 !important;
            text-align: center !important;
            font-size: 9.5pt !important;
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
          .signature-section-rekap {
            page-break-inside: avoid;
            break-inside: avoid;
            margin-top: 18px;
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

  // Header & Kop Surat Resmi dari Kustomisasi & Settings
  const instansiInduk = template?.instansi_induk || schoolSettings?.instansi_induk || 'PEMERINTAH PROVINSI JAWA TIMUR';
  const dinasPendidikan = template?.dinas_pendidikan || schoolSettings?.dinas_pendidikan || 'DINAS PENDIDIKAN';
  const schoolName = template?.nama_sekolah || schoolSettings?.nama_sekolah || schoolSettings?.schoolName || schoolSettings?.nama_website || 'SMK NEGERI CONTOH';
  const schoolAddress = template?.alamat_sekolah || schoolSettings?.alamat_sekolah || schoolSettings?.schoolAddress || 'Jl. Raya Pendidikan No. 123';
  const kontakSekolah = template?.kontak_sekolah || schoolSettings?.kontak_sekolah || '';
  const logoUrl = schoolSettings?.logoBase64 || schoolSettings?.logo || schoolSettings?.logo_url;

  // Titimangsa & Penandatangan Resmi dari Kustomisasi & Settings
  const titimangsaKota = template?.titimangsa_kota || schoolSettings?.titimangsa_kota || schoolSettings?.kota || 'Bojonegoro';
  const wakaName = template?.nama_waka_kurikulum || schoolSettings?.nama_waka_kurikulum || 'Waka Bidang Kurikulum';
  const wakaNip = template?.nip_waka_kurikulum || schoolSettings?.nip_waka_kurikulum || '-';
  
  const kepsekName = (template?.nama_kepsek && template.nama_kepsek.trim())
    || (schoolSettings?.headmaster_name && schoolSettings.headmaster_name.trim())
    || (schoolSettings?.headmasterName && schoolSettings.headmasterName.trim())
    || (schoolSettings?.kepala_sekolah && schoolSettings.kepala_sekolah.trim())
    || 'Kepala Sekolah';

  const kepsekNip = (template?.nip_kepsek && template.nip_kepsek.trim())
    || (schoolSettings?.headmaster_nip && schoolSettings.headmaster_nip.trim())
    || (schoolSettings?.headmasterNip && schoolSettings.headmasterNip.trim())
    || (schoolSettings?.nip_kepala_sekolah && schoolSettings.nip_kepala_sekolah.trim())
    || '-';

  const today = new Date();
  const formattedDate = today.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const totalTeachers = reports.length;
  const totalDisahkan = reports.filter(r => r.status_pengesahan === 'DISAHKAN').length;
  const totalSiap = reports.filter(r => r.status_pengesahan === 'MENUNGGU_PENGESAHAN').length;
  const avgProgress = totalTeachers > 0
    ? Math.round(reports.reduce((acc, r) => acc + (r.persentase || 0), 0) / totalTeachers)
    : 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
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
          <FactCheckIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
            Pratinjau Cetak: Rekapitulasi Supervisi Perangkat Ajar
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
          <Box
            id="rekap-printable-area"
            ref={printRef}
            sx={{
              color: '#0f172a',
              fontFamily: 'serif',
              p: { xs: 1, sm: 2 },
              minWidth: { xs: 680, md: 'auto' }
            }}
          >
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

            {/* JUDUL REKAP (Explicitly Centered in Print & Screen) */}
            <div className="rekap-title-section" style={{ textAlign: 'center', width: '100%', marginBottom: '14px', marginTop: '6px' }}>
              <div className="rekap-title-main" style={{ textAlign: 'center', fontWeight: 900, textDecoration: 'underline', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '1.05rem', lineHeight: 1.2, margin: '0 auto 4px auto' }}>
                REKAPITULASI SUPERVISI & PENGESAHAN PERANGKAT AJAR GURU
              </div>
              <div className="rekap-title-sub" style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.85rem', margin: '0 auto' }}>
                Tahun Ajaran: {tahunAjaran} — Semester: {semester}
              </div>
            </div>

            {/* SUMMARY STATS */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, px: 0.5, fontSize: '0.8rem' }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#0f172a' }}>
                Total Dewan Guru: <b>{totalTeachers} Orang</b> | Rata-rata Progres: <b>{avgProgress}%</b>
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#0f172a' }}>
                Telah Disahkan: <b>{totalDisahkan}</b> | Siap Disahkan: <b>{totalSiap}</b> | Belum Lengkap: <b>{totalTeachers - totalDisahkan - totalSiap}</b>
              </Typography>
            </Box>

            {/* TABEL REKAP SUPERVISI */}
            <table className="rekap-table" style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000' }}>
              <thead style={{ backgroundColor: '#f1f5f9' }}>
                <tr>
                  <th style={{ width: '35px', fontWeight: 800, textAlign: 'center', border: '1px solid #334155', padding: '5px 4px', fontSize: '11px' }}>No</th>
                  <th style={{ fontWeight: 800, minWidth: '150px', textAlign: 'left', border: '1px solid #334155', padding: '5px 6px', fontSize: '11px' }}>Nama Guru</th>
                  <th style={{ fontWeight: 800, width: '130px', textAlign: 'left', border: '1px solid #334155', padding: '5px 6px', fontSize: '11px' }}>NIP</th>
                  <th style={{ fontWeight: 800, minWidth: '180px', textAlign: 'left', border: '1px solid #334155', padding: '5px 6px', fontSize: '11px' }}>Mata Pelajaran & Rombel</th>
                  <th style={{ fontWeight: 800, textAlign: 'center', width: '75px', border: '1px solid #334155', padding: '5px 4px', fontSize: '11px' }}>Berkas</th>
                  <th style={{ fontWeight: 800, textAlign: 'center', width: '65px', border: '1px solid #334155', padding: '5px 4px', fontSize: '11px' }}>Progres</th>
                  <th style={{ fontWeight: 800, textAlign: 'center', width: '115px', border: '1px solid #334155', padding: '5px 4px', fontSize: '11px' }}>Status Telaah</th>
                  <th style={{ fontWeight: 800, textAlign: 'center', width: '120px', border: '1px solid #334155', padding: '5px 4px', fontSize: '11px' }}>Status Pengesahan</th>
                </tr>
              </thead>
              <tbody>
                {reports.length > 0 ? (
                  reports.map((row, idx) => {
                    const mapelText = row.mapel_list && row.mapel_list.length > 0
                      ? row.mapel_list.map((m: any) => {
                          const rombel = Array.isArray(m.rombel) ? m.rombel.join(', ') : (m.rombel || '');
                          return `${m.mapel_name}${m.sub_mapel ? ` (${m.sub_mapel})` : ''}${rombel ? ` [${rombel}]` : ''}`;
                        }).join('; ')
                      : (row.subject || row.class || '-');

                    const statusKurikulum = row.terverifikasi === row.sudah_upload && row.sudah_upload > 0
                      ? 'Terverifikasi Lengkap'
                      : row.menunggu_verifikasi > 0
                      ? `${row.menunggu_verifikasi} Belum Telaah`
                      : row.perlu_revisi > 0
                      ? `${row.perlu_revisi} Perlu Revisi`
                      : 'Belum Upload';

                    const statusPengesahan = row.status_pengesahan === 'DISAHKAN'
                      ? 'Disahkan Kepala Sekolah'
                      : row.status_pengesahan === 'MENUNGGU_PENGESAHAN'
                      ? 'Siap Pengesahan'
                      : 'Belum Lengkap';

                    return (
                      <tr key={row.teacher_id || idx}>
                        <td style={{ textAlign: 'center', border: '1px solid #334155', padding: '4px 3px', fontSize: '10.5px' }}>{idx + 1}</td>
                        <td style={{ fontWeight: 700, border: '1px solid #334155', padding: '4px 6px', fontSize: '10.5px' }}>{row.name}</td>
                        <td style={{ border: '1px solid #334155', padding: '4px 6px', fontSize: '10.5px' }}>{row.nip || '-'}</td>
                        <td style={{ border: '1px solid #334155', padding: '4px 6px', fontSize: '10.5px' }}>{mapelText}</td>
                        <td style={{ textAlign: 'center', border: '1px solid #334155', padding: '4px 3px', fontSize: '10.5px' }}>{row.sudah_upload} / {row.total_wajib}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700, border: '1px solid #334155', padding: '4px 3px', fontSize: '10.5px' }}>{row.persentase}%</td>
                        <td style={{ textAlign: 'center', border: '1px solid #334155', padding: '4px 3px', fontSize: '10.5px' }}>{statusKurikulum}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: row.status_pengesahan === 'DISAHKAN' ? '#166534' : 'inherit', border: '1px solid #334155', padding: '4px 3px', fontSize: '10.5px' }}>
                          {statusPengesahan}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '16px', border: '1px solid #334155' }}>
                      Tidak ada data supervisi pada periode ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* TANDA TANGAN */}
            <div className="signature-section-rekap" style={{ marginTop: '24px', pageBreakInside: 'avoid' }}>
              <table style={{ width: '100%', border: 'none', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td colSpan={2} style={{ border: 'none', textAlign: 'right', paddingBottom: '12px', fontSize: '0.85rem' }}>
                      Ditetapkan di: <b>{titimangsaKota}</b><br />
                      Pada Tanggal: <b>{formattedDate}</b>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', border: 'none' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.3 }}>
                        Memeriksa & Memverifikasi:<br />
                        Waka Bidang Kurikulum,
                      </div>
                      <div style={{ height: '60px' }} />
                      <div style={{ fontWeight: 800, textDecoration: 'underline', fontSize: '0.9rem' }}>
                        {wakaName}
                      </div>
                      <div style={{ fontSize: '0.75rem' }}>
                        NIP. {wakaNip}
                      </div>
                    </td>
                    <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', border: 'none' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.3 }}>
                        Mengetahui & Menyetujui:<br />
                        Kepala Sekolah,
                      </div>
                      <div style={{ height: '60px' }} />
                      <div style={{ fontWeight: 800, textDecoration: 'underline', fontSize: '0.9rem' }}>
                        {kepsekName}
                      </div>
                      <div style={{ fontSize: '0.75rem' }}>
                        NIP. {kepsekNip}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
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
          Cetak Dokumen Rekapitulasi (PDF)
        </Button>
      </DialogActions>
    </Dialog>
  );
}
