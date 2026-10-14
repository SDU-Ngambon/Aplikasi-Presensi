import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  LinearProgress,
  Divider,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Card,
  CardContent
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LaunchIcon from '@mui/icons-material/Launch';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HistoryIcon from '@mui/icons-material/History';
import DescriptionIcon from '@mui/icons-material/Description';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ClassIcon from '@mui/icons-material/Class';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import PrintIcon from '@mui/icons-material/Print';
import axios from 'axios';
import toast from 'react-hot-toast';
import DocumentPreviewModal from './DocumentPreviewModal';
import LembarPengesahanModal from './LembarPengesahanModal';

interface DrillDownModalProps {
  open: boolean;
  onClose: () => void;
  report: any;
  userRole?: string; // 'admin' | 'WAKIL_KURIKULUM' | 'KEPALA_SEKOLAH'
  onRefresh?: () => void;
}

export default function DrillDownPerangkatModal({
  open,
  onClose,
  report,
  userRole = 'admin',
  onRefresh
}: DrillDownModalProps) {
  const [selectedDocForRevision, setSelectedDocForRevision] = useState<any | null>(null);
  const [catatanRevisi, setCatatanRevisi] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [showPengesahanModal, setShowPengesahanModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{
    open: boolean;
    title: string;
    fileName: string;
    fileUrl: string | null;
    statusBadge?: string;
  }>({
    open: false,
    title: '',
    fileName: '',
    fileUrl: null,
    statusBadge: ''
  });

  if (!report) return null;

  const isKepsek = userRole === 'KEPALA_SEKOLAH';
  const isKurikulumOrAdmin = userRole === 'WAKIL_KURIKULUM' || userRole === 'admin';

  const handleAction = async (docId: string, status: 'TERVERIFIKASI_KURIKULUM' | 'DITOLAK_KURIKULUM' | 'REVISI_KEPSEK', catatan: string = '') => {
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token') || localStorage.getItem('guru_token') || sessionStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      if (isKepsek) {
        await axios.post(
          `/api/perangkat/dokumen/${docId}/validasi-kepsek`,
          { status: 'REVISI_KEPSEK', catatan, teacher_id: report.teacher_id },
          { headers }
        );
        toast.success('Catatan revisi Kepala Sekolah berhasil dikirim');
      } else {
        await axios.post(
          `/api/perangkat/dokumen/${docId}/verifikasi-kurikulum`,
          { status, catatan, teacher_id: report.teacher_id },
          { headers }
        );
        toast.success(status === 'TERVERIFIKASI_KURIKULUM' ? 'Dokumen berhasil diverifikasi Kurikulum' : 'Dokumen diminta revisi oleh Kurikulum');
      }

      setSelectedDocForRevision(null);
      setCatatanRevisi('');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal memproses verifikasi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetDocStatus = async (docId: string, docName: string) => {
    if (!window.confirm(`Reset status berkas "${docName}" kembali ke Menunggu Verifikasi?`)) return;
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token') || localStorage.getItem('guru_token') || sessionStorage.getItem('token');
      await axios.post(
        `/api/perangkat/dokumen/${docId}/reset-status`,
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      toast.success('Status berkas berhasil direset ke Menunggu Verifikasi');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal mereset status berkas');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPengesahan = async () => {
    if (!window.confirm(`Batalkan/Reset Pengesahan Kepala Sekolah untuk guru "${report.name}"? Dokumen akan kembali ke status siap ditelaah.`)) return;
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token') || localStorage.getItem('guru_token') || sessionStorage.getItem('token');
      await axios.post(
        `/api/perangkat/pengesahan/${report.teacher_id}/reset`,
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      toast.success('Status pengesahan berhasil direset');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal mereset pengesahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyAllForTeacher = async () => {
    if (!window.confirm(`Verifikasi semua berkas milik guru "${report.name}" sekaligus oleh Kurikulum?`)) return;
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token') || localStorage.getItem('guru_token') || sessionStorage.getItem('token');
      const res = await axios.post(
        '/api/perangkat/verify-all',
        { teacher_id: report.teacher_id },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      toast.success(res.data.message || 'Semua berkas guru berhasil diverifikasi');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal memverifikasi seluruh berkas');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoadLogs = async () => {
    setShowLogs(!showLogs);
    if (!showLogs && report?.teacher_id) {
      try {
        const res = await axios.get('/api/perangkat/logs', { params: { teacher_id: report.teacher_id } });
        if (res.data && res.data.data) {
          setLogs(res.data.data);
        }
      } catch (e) {}
    }
  };

  // Group documents by Mapel
  const mapelGroups: { [key: string]: { mapel: any; docs: any[] } } = {};

  if (report.mapel_list && Array.isArray(report.mapel_list) && report.mapel_list.length > 0) {
    report.mapel_list.forEach((m: any) => {
      mapelGroups[m.id] = {
        mapel: m,
        docs: (report.dokumen_list || []).filter((d: any) => (d.teacher_mapel_id && d.teacher_mapel_id === m.id) || (!d.teacher_mapel_id && d.mapel === m.mapel_name))
      };
    });
  } else {
    // Fallback: Group by doc.mapel
    const uniqueMapels = Array.from(new Set((report.dokumen_list || []).map((d: any) => d.mapel || 'Mata Pelajaran')));
    uniqueMapels.forEach((mName: any) => {
      mapelGroups[mName] = {
        mapel: { id: mName, mapel_name: mName, rombel: report.class ? [report.class] : [], percentage: report.persentase },
        docs: (report.dokumen_list || []).filter((d: any) => (d.mapel || 'Mata Pelajaran') === mName)
      };
    });
  }

  const mapelGroupKeys = Object.keys(mapelGroups);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: { xs: 3, sm: 3 },
            p: { xs: 0.5, sm: 1 },
            width: { xs: '94%', sm: '100%' },
            maxWidth: { xs: '480px', md: 'lg' },
            mx: { xs: 'auto', sm: 'auto' },
            my: { xs: 2, sm: 'auto' }
          }
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '1px solid #e2e8f0',
          p: { xs: 1.5, sm: 2.5 },
          gap: 1
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.2, flex: 1, minWidth: 0, textAlign: 'left' }}>
          <DescriptionIcon color="primary" sx={{ fontSize: { xs: 24, md: 28 }, mt: 0.3, flexShrink: 0 }} />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                color: '#0f172a',
                fontSize: { xs: '0.95rem', sm: '1.2rem' },
                lineHeight: 1.3,
                wordBreak: 'break-word'
              }}
            >
              Verifikasi Perangkat Ajar: {report.name}
            </Typography>
            <Typography
              variant="caption"
              color="#64748b"
              sx={{ display: 'block', mt: 0.5, fontSize: { xs: '0.72rem', sm: '0.75rem' }, lineHeight: 1.4, wordBreak: 'break-word' }}
            >
              NIP: {report.nip || '-'} • WA: {report.whatsapp || '-'}
            </Typography>
            <Typography
              variant="caption"
              sx={{ display: 'block', color: '#0284c7', fontWeight: 700, mt: 0.3, fontSize: '0.72rem' }}
            >
              Mode: <b>{isKepsek ? 'Kepala Sekolah (Verifikasi Akhir)' : 'Waka Kurikulum (Telaah Akademik)'}</b>
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" color="inherit" sx={{ p: 0.5, alignSelf: 'flex-start', ml: 0.5 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 1.5, sm: 3 } }}>
        {/* PROGRESS BAR & OVERALL STATS */}
        <Box sx={{ mb: 3, p: { xs: 1.5, sm: 2.5 }, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { md: 'center' }, mb: 1, gap: 1.5 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#334155', fontSize: { xs: '0.82rem', sm: '0.875rem' } }}>
                Total Berkas Diunggah: {report.sudah_upload} dari {report.total_wajib} slot wajib ({report.persentase}%)
              </Typography>
              <Typography variant="caption" color="#64748b" sx={{ display: 'block', mt: 0.3, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                Terverifikasi Kurikulum: {report.terverifikasi} • Menunggu Telaah: {report.menunggu_verifikasi} • Perlu Revisi: {report.perlu_revisi}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={
                  report.status_pengesahan === 'DISAHKAN'
                    ? 'TELAH DISAHKAN KEPSEK'
                    : report.status_pengesahan === 'MENUNGGU_PENGESAHAN'
                    ? 'SIAP DISAHKAN KEPSEK'
                    : 'BELUM LENGKAP'
                }
                color={
                  report.status_pengesahan === 'DISAHKAN'
                    ? 'success'
                    : report.status_pengesahan === 'MENUNGGU_PENGESAHAN'
                    ? 'primary'
                    : 'warning'
                }
                size="small"
                sx={{ fontWeight: 800 }}
              />

              {/* Cetak Lembar Pengesahan jika sudah disahkan */}
              {report.status_pengesahan === 'DISAHKAN' && (
                <Button
                  size="small"
                  variant="contained"
                  color="info"
                  startIcon={<PrintIcon sx={{ fontSize: 16 }} />}
                  onClick={() => setShowPengesahanModal(true)}
                  sx={{ fontWeight: 800, textTransform: 'none', py: 0.4, px: 1.5, borderRadius: 2, fontSize: '0.75rem' }}
                >
                  Cetak Lembar Pengesahan
                </Button>
              )}

              {/* Reset Pengesahan jika sudah disahkan */}
              {report.status_pengesahan === 'DISAHKAN' && (userRole === 'admin' || isKepsek || isKurikulumOrAdmin) && (
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  startIcon={<RestartAltIcon sx={{ fontSize: 16 }} />}
                  onClick={handleResetPengesahan}
                  disabled={isSubmitting}
                  sx={{ fontWeight: 700, textTransform: 'none', py: 0.4, px: 1, fontSize: '0.75rem' }}
                >
                  Reset Pengesahan
                </Button>
              )}

              {/* Verifikasi Semua Berkas oleh Kurikulum */}
              {isKurikulumOrAdmin && report.dokumen_list && report.dokumen_list.length > 0 && (
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  startIcon={<DoneAllIcon sx={{ fontSize: 16 }} />}
                  onClick={handleVerifyAllForTeacher}
                  disabled={isSubmitting}
                  sx={{ fontWeight: 800, textTransform: 'none', py: 0.4, px: 1.5, borderRadius: 2, fontSize: '0.75rem' }}
                >
                  Verifikasi Semua Berkas
                </Button>
              )}
            </Box>
          </Box>

          <LinearProgress
            variant="determinate"
            value={report.persentase}
            sx={{
              height: 10,
              borderRadius: 5,
              bgcolor: '#e2e8f0',
              mt: 1,
              '& .MuiLinearProgress-bar': {
                bgcolor: report.persentase === 100 ? '#10b981' : report.persentase > 50 ? '#3b82f6' : '#f59e0b',
                borderRadius: 5
              }
            }}
          />
        </Box>

        {/* DAFTAR MAPEL & DOKUMEN PERANGKAT */}
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', mb: 2 }}>
          Berkas Berdasarkan Mata Pelajaran & Kelas yang Didaftarkan:
        </Typography>

        {mapelGroupKeys.length > 0 ? (
          <Stack spacing={2.5}>
            {mapelGroupKeys.map((key, mIdx) => {
              const group = mapelGroups[key];
              const mapel = group.mapel;
              const docs = group.docs;
              const mapelPercentage = mapel.percentage ?? (mapel.total_wajib > 0 ? Math.round((mapel.uploaded_count / mapel.total_wajib) * 100) : 0);

              return (
                <Card
                  key={key}
                  sx={{
                    borderRadius: 2.5,
                    border: '1px solid #cbd5e1',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    overflow: 'hidden'
                  }}
                >
                  {/* MAPEL HEADER BAR */}
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: '#f1f5f9',
                      borderBottom: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 1.5
                    }}
                  >
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <MenuBookIcon sx={{ color: '#0284c7', fontSize: 20 }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                          {mapel.mapel_name || key}
                        </Typography>
                        {mapel.sub_mapel && (
                          <Chip label={`Sub: ${mapel.sub_mapel}`} size="small" color="secondary" sx={{ fontWeight: 700 }} />
                        )}
                        <Chip
                          label={`Progres: ${mapelPercentage}%`}
                          size="small"
                          color={mapelPercentage === 100 ? 'success' : 'primary'}
                          sx={{ fontWeight: 800 }}
                        />
                      </Box>

                      {/* Rombel Chips */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 1, flexWrap: 'wrap' }}>
                        <ClassIcon sx={{ fontSize: 16, color: '#64748b' }} />
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569' }}>
                          Kelas/Rombel:
                        </Typography>
                        {Array.isArray(mapel.rombel) && mapel.rombel.length > 0 ? (
                          mapel.rombel.map((r: string, rIdx: number) => (
                            <Chip key={rIdx} label={r} size="small" variant="outlined" color="default" sx={{ fontSize: '0.72rem', height: 22 }} />
                          ))
                        ) : (
                          <Chip label={typeof mapel.rombel === 'string' ? mapel.rombel : 'Semua Rombel'} size="small" variant="outlined" sx={{ fontSize: '0.72rem', height: 22 }} />
                        )}
                      </Box>
                    </Box>

                    <Chip
                      label={mapel.status_submit === 'TERKIRIM' ? 'Sudah Dikirim Guru' : 'Draft Guru'}
                      color={mapel.status_submit === 'TERKIRIM' ? 'info' : 'default'}
                      size="small"
                      sx={{ fontWeight: 800 }}
                    />
                  </Box>

                  {/* TABLE OF DOCUMENTS FOR THIS MAPEL (DESKTOP >= 768px) & CARD VIEW (MOBILE < 768px) */}
                  <CardContent sx={{ p: 0 }}>
                    {docs.length > 0 ? (
                      <>
                        {/* DESKTOP TABLE VIEW */}
                        <Box sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto' }}>
                          <Table size="small">
                            <TableHead sx={{ bgcolor: '#f8fafc' }}>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 800, width: 220 }}>Jenis Perangkat</TableCell>
                                <TableCell sx={{ fontWeight: 800 }}>Nama Berkas</TableCell>
                                <TableCell sx={{ fontWeight: 800, textAlign: 'center', width: 180 }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 800, textAlign: 'center', width: 170 }}>Aksi Verifikasi</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {docs.map((doc: any) => {
                                const isVerified = doc.status === 'TERVERIFIKASI_KURIKULUM' || doc.status === 'DISETUJUI_KEPSEK';
                                const isRejected = doc.status === 'DITOLAK_KURIKULUM' || doc.status === 'REVISI_KEPSEK';

                                return (
                                  <TableRow key={doc.id} hover>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>
                                      {doc.category_nama || 'Perangkat Ajar'}
                                    </TableCell>
                                    <TableCell>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                                          {doc.file_name}
                                        </Typography>
                                        {(doc.file_path || doc.file_url || doc.gdrive_web_view_link) && (
                                          <Tooltip title="Pratinjau Dokumen di Aplikasi">
                                            <Button
                                              size="small"
                                              variant="outlined"
                                              color="primary"
                                              startIcon={<VisibilityIcon sx={{ fontSize: 14 }} />}
                                              onClick={() => setPreviewDoc({
                                                open: true,
                                                title: `${doc.category_nama || 'Perangkat Ajar'} — ${report.name}`,
                                                fileName: doc.file_name,
                                                fileUrl: doc.id ? `/api/v1/perangkat/preview/${doc.id}` : (doc.file_url || doc.gdrive_web_view_link),
                                                statusBadge: doc.status
                                              })}
                                              sx={{ minWidth: 'auto', px: 1, py: 0.2, fontSize: '0.72rem', textTransform: 'none' }}
                                            >
                                              Pratinjau
                                            </Button>
                                          </Tooltip>
                                        )}
                                      </Box>
                                      {doc.catatan_revisi && (
                                        <Alert severity="error" sx={{ mt: 0.5, py: 0, px: 1, fontSize: '0.75rem' }}>
                                          <b>Catatan Revisi:</b> {doc.catatan_revisi}
                                        </Alert>
                                      )}
                                    </TableCell>
                                    <TableCell sx={{ textAlign: 'center' }}>
                                      <Chip
                                        label={
                                          doc.status === 'DISETUJUI_KEPSEK'
                                            ? 'Disetujui Kepsek'
                                            : doc.status === 'TERVERIFIKASI_KURIKULUM'
                                            ? 'Terverifikasi Kurikulum'
                                            : doc.status === 'DITOLAK_KURIKULUM'
                                            ? 'Perlu Revisi Kurikulum'
                                            : doc.status === 'REVISI_KEPSEK'
                                            ? 'Perlu Revisi Kepsek'
                                            : 'Menunggu Verifikasi'
                                        }
                                        size="small"
                                        color={
                                          doc.status === 'DISETUJUI_KEPSEK' || doc.status === 'TERVERIFIKASI_KURIKULUM'
                                            ? 'success'
                                            : isRejected
                                            ? 'error'
                                            : 'warning'
                                        }
                                        sx={{ fontWeight: 800, fontSize: '0.7rem' }}
                                      />
                                    </TableCell>
                                    <TableCell sx={{ textAlign: 'center' }}>
                                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                                        {isKurikulumOrAdmin && (
                                          <>
                                            <Tooltip title="Verifikasi & Setujui Berkas (Kurikulum)">
                                              <span>
                                                <IconButton
                                                  size="small"
                                                  color="success"
                                                  disabled={isSubmitting || isVerified}
                                                  onClick={() => handleAction(doc.id, 'TERVERIFIKASI_KURIKULUM')}
                                                >
                                                  <CheckCircleIcon fontSize="small" />
                                                </IconButton>
                                              </span>
                                            </Tooltip>
                                            <Tooltip title="Minta Revisi Berkas (Kurikulum)">
                                              <IconButton
                                                size="small"
                                                color="error"
                                                disabled={isSubmitting}
                                                onClick={() => {
                                                  setSelectedDocForRevision(doc);
                                                  setCatatanRevisi(doc.catatan_revisi || '');
                                                }}
                                              >
                                                <CancelIcon fontSize="small" />
                                              </IconButton>
                                            </Tooltip>
                                          </>
                                        )}

                                        {isKepsek && (
                                          <Tooltip title="Minta Revisi oleh Kepala Sekolah">
                                            <IconButton
                                              size="small"
                                              color="error"
                                              disabled={isSubmitting}
                                              onClick={() => {
                                                setSelectedDocForRevision(doc);
                                                setCatatanRevisi(doc.catatan_revisi || '');
                                              }}
                                            >
                                              <CancelIcon fontSize="small" />
                                            </IconButton>
                                          </Tooltip>
                                        )}

                                        <Tooltip title="Reset Status Berkas">
                                          <IconButton
                                            size="small"
                                            color="default"
                                            disabled={isSubmitting}
                                            onClick={() => handleResetDocStatus(doc.id, doc.file_name)}
                                          >
                                            <RestartAltIcon fontSize="small" />
                                          </IconButton>
                                        </Tooltip>
                                      </Box>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </Box>

                        {/* MOBILE CARD VIEW FOR DOCUMENTS (< 768px) */}
                        <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.2, p: 1.5 }}>
                          {docs.map((doc: any) => {
                            const isVerified = doc.status === 'TERVERIFIKASI_KURIKULUM' || doc.status === 'DISETUJUI_KEPSEK';
                            const isRejected = doc.status === 'DITOLAK_KURIKULUM' || doc.status === 'REVISI_KEPSEK';

                            return (
                              <Box
                                key={doc.id}
                                sx={{
                                  p: 1.5,
                                  borderRadius: 2,
                                  bgcolor: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 1
                                }}
                              >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                                  <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Typography variant="caption" sx={{ color: '#0284c7', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.68rem', display: 'block' }}>
                                      {doc.category_nama || 'Perangkat Ajar'}
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a', wordBreak: 'break-word', mt: 0.2 }}>
                                      {doc.file_name}
                                    </Typography>
                                  </Box>
                                  <Chip
                                    label={
                                      doc.status === 'DISETUJUI_KEPSEK'
                                        ? 'Disetujui Kepsek'
                                        : doc.status === 'TERVERIFIKASI_KURIKULUM'
                                        ? 'Terverifikasi'
                                        : doc.status === 'DITOLAK_KURIKULUM'
                                        ? 'Revisi Kurikulum'
                                        : doc.status === 'REVISI_KEPSEK'
                                        ? 'Revisi Kepsek'
                                        : 'Menunggu'
                                    }
                                    size="small"
                                    color={
                                      doc.status === 'DISETUJUI_KEPSEK' || doc.status === 'TERVERIFIKASI_KURIKULUM'
                                        ? 'success'
                                        : isRejected
                                        ? 'error'
                                        : 'warning'
                                    }
                                    sx={{ fontWeight: 800, fontSize: '0.68rem', height: 22, flexShrink: 0 }}
                                  />
                                </Box>

                                {doc.catatan_revisi && (
                                  <Alert severity="error" sx={{ py: 0.3, px: 1, fontSize: '0.72rem' }}>
                                    <b>Catatan Revisi:</b> {doc.catatan_revisi}
                                  </Alert>
                                )}

                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, pt: 0.8, borderTop: '1px dashed #cbd5e1' }}>
                                  {(doc.file_path || doc.file_url || doc.gdrive_web_view_link) ? (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="primary"
                                      startIcon={<VisibilityIcon sx={{ fontSize: 14 }} />}
                                      onClick={() => setPreviewDoc({
                                        open: true,
                                        title: `${doc.category_nama || 'Perangkat Ajar'} — ${report.name}`,
                                        fileName: doc.file_name,
                                        fileUrl: doc.id ? `/api/v1/perangkat/preview/${doc.id}` : (doc.file_url || doc.gdrive_web_view_link),
                                        statusBadge: doc.status
                                      })}
                                      sx={{ py: 0.3, px: 1, fontSize: '0.72rem', textTransform: 'none', fontWeight: 700 }}
                                    >
                                      Pratinjau
                                    </Button>
                                  ) : (
                                    <Box />
                                  )}

                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    {isKurikulumOrAdmin && (
                                      <>
                                        <Tooltip title="Verifikasi & Setujui Berkas">
                                          <span>
                                            <IconButton
                                              size="small"
                                              color="success"
                                              disabled={isSubmitting || isVerified}
                                              onClick={() => handleAction(doc.id, 'TERVERIFIKASI_KURIKULUM')}
                                              sx={{ bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}
                                            >
                                              <CheckCircleIcon fontSize="small" />
                                            </IconButton>
                                          </span>
                                        </Tooltip>
                                        <Tooltip title="Minta Revisi Berkas">
                                          <IconButton
                                            size="small"
                                            color="error"
                                            disabled={isSubmitting}
                                            onClick={() => {
                                              setSelectedDocForRevision(doc);
                                              setCatatanRevisi(doc.catatan_revisi || '');
                                            }}
                                            sx={{ bgcolor: '#fef2f2', border: '1px solid #fecaca' }}
                                          >
                                            <CancelIcon fontSize="small" />
                                          </IconButton>
                                        </Tooltip>
                                      </>
                                    )}

                                    {isKepsek && (
                                      <Tooltip title="Minta Revisi Kepala Sekolah">
                                        <IconButton
                                          size="small"
                                          color="error"
                                          disabled={isSubmitting}
                                          onClick={() => {
                                            setSelectedDocForRevision(doc);
                                            setCatatanRevisi(doc.catatan_revisi || '');
                                          }}
                                          sx={{ bgcolor: '#fef2f2', border: '1px solid #fecaca' }}
                                        >
                                          <CancelIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    )}

                                    <Tooltip title="Reset Status Berkas">
                                      <IconButton
                                        size="small"
                                        color="default"
                                        disabled={isSubmitting}
                                        onClick={() => handleResetDocStatus(doc.id, doc.file_name)}
                                        sx={{ bgcolor: '#f1f5f9', border: '1px solid #cbd5e1' }}
                                      >
                                        <RestartAltIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </Box>
                              </Box>
                            );
                          })}
                        </Box>
                      </>
                    ) : (
                      <Box sx={{ p: 2.5, textAlign: 'center', color: '#94a3b8' }}>
                        <Typography variant="body2">
                          Guru belum mengunggah berkas untuk mata pelajaran ini.
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 3, border: '1px dashed #cbd5e1' }}>
            <Typography variant="body1" color="#64748b">
              Guru belum mendaftarkan mata pelajaran atau mengunggah berkas perangkat pembelajaran.
            </Typography>
          </Box>
        )}

        {/* DIALOG CATATAN REVISI */}
        {selectedDocForRevision && (
          <Box sx={{ mt: 3, p: 2.5, bgcolor: '#fef2f2', borderRadius: 2.5, border: '1px solid #fecdd3' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#991b1b', mb: 1 }}>
              Formulir Pengembalian Revisi: {selectedDocForRevision.file_name}
            </Typography>
            <TextField
              label="Alasan / Catatan Perbaikan untuk Guru"
              placeholder="Contoh: Format modul ajar belum menyertakan asesmen diagnostik, mohon diperbaiki..."
              multiline
              rows={3}
              fullWidth
              value={catatanRevisi}
              onChange={(e) => setCatatanRevisi(e.target.value)}
              sx={{ bgcolor: '#ffffff', mb: 2 }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button
                size="small"
                onClick={() => setSelectedDocForRevision(null)}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Batal
              </Button>
              <Button
                size="small"
                variant="contained"
                color="error"
                disabled={isSubmitting || !catatanRevisi.trim()}
                onClick={() => handleAction(
                  selectedDocForRevision.id,
                  isKepsek ? 'REVISI_KEPSEK' : 'DITOLAK_KURIKULUM',
                  catatanRevisi
                )}
                sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2 }}
              >
                Kirim Catatan Revisi ke Guru
              </Button>
            </Box>
          </Box>
        )}

        {/* LOG RIWAYAT VERIFIKASI & PENGESAHAN */}
        {showLogs && (
          <Box sx={{ mt: 3, p: 2.5, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #cbd5e1' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <HistoryIcon color="primary" />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                  Log Riwayat Unggah, Telaah & Pengesahan
                </Typography>
              </Box>
              <Chip label={`${logs.length} Aktivitas Tercatat`} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
            </Box>

            {logs.length > 0 ? (
              <Stack spacing={1.5}>
                {logs.map((log: any, lIdx: number) => {
                  let actionColor: 'primary' | 'success' | 'warning' | 'error' | 'default' = 'default';
                  let actionLabel = log.action;

                  if (log.action === 'UPLOAD' || log.action === 'REPLACE') {
                    actionColor = 'primary';
                    actionLabel = log.action === 'REPLACE' ? 'Pembaruan Berkas' : 'Unggah Berkas Baru';
                  } else if (log.action === 'SUBMIT_MAPEL_PERANGKAT') {
                    actionColor = 'primary';
                    actionLabel = 'Pengiriman Berkas Mapel';
                  } else if (log.action === 'SETUJU_KURIKULUM' || log.action === 'VERIFIKASI_SEMUA_KURIKULUM') {
                    actionColor = 'success';
                    actionLabel = 'Verifikasi Disetujui';
                  } else if (log.action === 'TOLAK_KURIKULUM' || log.action === 'REVISI_KEPSEK') {
                    actionColor = 'error';
                    actionLabel = 'Permintaan Revisi';
                  } else if (log.action === 'PENGESAHAN_KEPSEK' || log.action === 'PENGESAHAN_SEMUA_KEPSEK') {
                    actionColor = 'success';
                    actionLabel = 'Pengesahan Resmi';
                  } else if (log.action === 'RESET_STATUS' || log.action === 'RESET_PENGESAHAN') {
                    actionColor = 'warning';
                    actionLabel = 'Reset Status';
                  }

                  const dateFormatted = log.created_at
                    ? new Date(log.created_at).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : '-';

                  return (
                    <Box
                      key={log.id || lIdx}
                      sx={{
                        p: 1.5,
                        bgcolor: '#ffffff',
                        borderRadius: 2,
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        justifyContent: 'space-between',
                        alignItems: { sm: 'center' },
                        gap: 1
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                          <Chip label={actionLabel} size="small" color={actionColor} sx={{ fontWeight: 800, height: 22, fontSize: '0.7rem' }} />
                          <Typography variant="body2" sx={{ fontWeight: 800, color: '#1e293b' }}>
                            {log.user_name || 'Pengguna'}
                          </Typography>
                          {log.role && (
                            <Chip label={log.role} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600 }} />
                          )}
                        </Box>
                        <Typography variant="body2" color="#475569" sx={{ fontSize: '0.85rem' }}>
                          {log.catatan || 'Tidak ada catatan.'}
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {dateFormatted}
                      </Typography>
                    </Box>
                  );
                })}
              </Stack>
            ) : (
              <Box sx={{ p: 3, textAlign: 'center', color: '#94a3b8', bgcolor: '#ffffff', borderRadius: 2 }}>
                <Typography variant="body2">Belum ada catatan aktivitas untuk guru ini.</Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: { xs: 1.5, sm: 2.5 }, borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: { xs: 'column-reverse', sm: 'row' }, justifyContent: 'space-between', gap: 1 }}>
        <Button
          size="small"
          startIcon={<HistoryIcon />}
          onClick={handleLoadLogs}
          fullWidth
          sx={{
            fontWeight: 700,
            textTransform: 'none',
            py: 1,
            width: { xs: '100%', sm: 'auto' }
          }}
        >
          {showLogs ? 'Sembunyikan Log Aktivitas' : 'Lihat Log Riwayat Verifikasi'}
        </Button>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            fontWeight: 700,
            borderRadius: 2,
            py: 1,
            width: { xs: '100%', sm: 'auto' }
          }}
        >
          Tutup
        </Button>
      </DialogActions>

      {/* MODAL PRATINJAU DOKUMEN */}
      <DocumentPreviewModal
        open={previewDoc.open}
        onClose={() => setPreviewDoc(prev => ({ ...prev, open: false }))}
        title={previewDoc.title}
        fileName={previewDoc.fileName}
        fileUrl={previewDoc.fileUrl || ''}
        statusBadge={previewDoc.statusBadge}
      />

      {/* MODAL LEMBAR PENGESAHAN */}
      {showPengesahanModal && (
        <LembarPengesahanModal
          open={showPengesahanModal}
          onClose={() => setShowPengesahanModal(false)}
          teacher={{
            name: report.name,
            nip: report.nip || '-',
            subject: report.subject || (report.mapel_list && report.mapel_list.length > 0 ? report.mapel_list.map((m: any) => m.mapel_name).filter(Boolean).join(', ') : '') || report.class || 'Guru Mata Pelajaran',
            class: report.class
          }}
          pengesahan={report.pengesahan}
          dokumenList={report.dokumen_list}
        />
      )}
    </Dialog>
  );
}
