import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Paper,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import SendIcon from '@mui/icons-material/Send';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

interface KirimWaRekapModalProps {
  open: boolean;
  onClose: () => void;
  tahunAjaran: string;
  semester: string;
  onOpenSettings?: () => void;
}

export const KirimWaRekapModal: React.FC<KirimWaRekapModalProps> = ({
  open,
  onClose,
  tahunAjaran,
  semester,
  onOpenSettings
}) => {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewText, setPreviewText] = useState('');
  const [targetGroupId, setTargetGroupId] = useState('');
  const [targetGroupName, setTargetGroupName] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [totalTeachers, setTotalTeachers] = useState(0);
  const [gatewayStatus, setGatewayStatus] = useState<any>(null);
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchPreviewAndConfig = async () => {
    setLoading(true);
    setAlertInfo(null);
    try {
      const token = localStorage.getItem('token');
      
      // 1. Fetch Config & Gateway Status
      const configRes = await fetch('/api/perangkat/whatsapp-rekap/config', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const configJson = await configRes.json();
      if (configJson.success) {
        setTargetGroupId(configJson.config?.target_group_id || '');
        setTargetGroupName(configJson.config?.target_group_name || '');
        setCustomNote(configJson.config?.custom_message_header || '');
        setGatewayStatus(configJson.gateway || null);
      }

      // 2. Fetch Preview
      const prevRes = await fetch('/api/perangkat/whatsapp-rekap/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          tahun_ajaran: tahunAjaran,
          semester: semester,
          custom_note: configJson.config?.custom_message_header || ''
        })
      });
      const prevJson = await prevRes.json();
      if (prevJson.success) {
        setPreviewText(prevJson.message || '');
        setTotalTeachers(prevJson.total_teachers || 0);
      } else {
        setAlertInfo({ type: 'error', message: prevJson.error || 'Gagal memuat pratinjau rekap' });
      }
    } catch (e: any) {
      setAlertInfo({ type: 'error', message: e.message || 'Gagal memuat data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchPreviewAndConfig();
    }
  }, [open, tahunAjaran, semester]);

  const handleRefreshPreview = async () => {
    try {
      const token = localStorage.getItem('token');
      const prevRes = await fetch('/api/perangkat/whatsapp-rekap/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          tahun_ajaran: tahunAjaran,
          semester: semester,
          custom_note: customNote
        })
      });
      const prevJson = await prevRes.json();
      if (prevJson.success) {
        setPreviewText(prevJson.message || '');
        setTotalTeachers(prevJson.total_teachers || 0);
      }
    } catch (e) {
      console.error('Error refreshing preview:', e);
    }
  };

  const handleSend = async () => {
    if (!targetGroupId.trim()) {
      setAlertInfo({ type: 'error', message: 'Silakan isi ID Grup atau nomor WhatsApp tujuan terlebih dahulu.' });
      return;
    }

    setSending(true);
    setAlertInfo(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/perangkat/whatsapp-rekap/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          tahun_ajaran: tahunAjaran,
          semester: semester,
          target_group_id: targetGroupId.trim(),
          custom_note: customNote
        })
      });
      const json = await res.json();
      if (json.success) {
        setAlertInfo({
          type: 'success',
          message: `Laporan Rekapitulasi Supervisi Perangkat Ajar (${totalTeachers} guru) berhasil dikirimkan ke WhatsApp (${targetGroupName || targetGroupId})!`
        });
      } else {
        setAlertInfo({ type: 'error', message: json.error || 'Gagal mengirim rekapitulasi ke WhatsApp' });
      }
    } catch (e: any) {
      setAlertInfo({ type: 'error', message: e.message || 'Gagal mengirim rekapitulasi' });
    } finally {
      setSending(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(previewText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, backgroundColor: '#f8fafc' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ p: 1, borderRadius: 2, backgroundColor: '#dcfce7', color: '#15803d', display: 'flex' }}>
            <WhatsAppIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>
              Kirim Rekap Supervisi via WhatsApp
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Periode {tahunAjaran} — Semester {semester} • {totalTeachers} Data Guru
            </Typography>
          </Box>
        </Box>

        {onOpenSettings && (
          <Tooltip title="Buka Pengaturan WhatsApp Rekap">
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              startIcon={<SettingsIcon />}
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}
            >
              Pengaturan
            </Button>
          </Tooltip>
        )}
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 5 }}>
            <CircularProgress size={36} color="success" />
            <Typography variant="body2" sx={{ mt: 2, color: '#64748b' }}>
              Memformat laporan rekapitulasi supervisi...
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {alertInfo && (
              <Alert severity={alertInfo.type} onClose={() => setAlertInfo(null)}>
                {alertInfo.message}
              </Alert>
            )}

            {/* GATEWAY STATUS BANNER */}
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, backgroundColor: gatewayStatus?.is_configured ? '#f0fdf4' : '#fffbeb', borderColor: gatewayStatus?.is_configured ? '#86efac' : '#fde68a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {gatewayStatus?.is_configured ? (
                  <CheckCircleIcon sx={{ color: '#16a34a', fontSize: 18 }} />
                ) : (
                  <WarningAmberIcon sx={{ color: '#d97706', fontSize: 18 }} />
                )}
                <Typography variant="caption" sx={{ fontWeight: 700, color: gatewayStatus?.is_configured ? '#166534' : '#92400e' }}>
                  Gateway Utama: {gatewayStatus?.provider?.toUpperCase() || 'WHATSAPP'} {gatewayStatus?.is_configured ? `(${gatewayStatus.masked_key})` : '— Belum Dikonfigurasi'}
                </Typography>
              </Box>

              <Chip
                size="small"
                label={gatewayStatus?.is_configured ? 'Gateway Siap' : 'Belum Ada Token'}
                color={gatewayStatus?.is_configured ? 'success' : 'warning'}
                sx={{ fontWeight: 700, height: 20, fontSize: '0.7rem' }}
              />
            </Paper>

            {/* TARGET GROUP INPUT */}
            <Box sx={{ display: 'flex', gap: 1.5, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField
                label="Tujuan Grup WhatsApp (Group ID / JID) *"
                placeholder="Misal: 1203630248234234@g.us"
                value={targetGroupId}
                onChange={(e) => setTargetGroupId(e.target.value)}
                fullWidth
                size="small"
                helperText={targetGroupName ? `Label: ${targetGroupName}` : 'Pastikan akun WhatsApp bot telah bergabung di grup ini.'}
              />
              <TextField
                label="Catatan Khusus (Opsional)"
                placeholder="Pesan tambahan..."
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                onBlur={handleRefreshPreview}
                fullWidth
                size="small"
              />
            </Box>

            {/* LIVE PREVIEW BOX */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.8 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e293b' }}>
                  📱 Pratinjau Pesan WhatsApp:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={handleRefreshPreview}
                    sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                  >
                    Segarkan
                  </Button>
                  <Button
                    size="small"
                    startIcon={<ContentCopyIcon />}
                    onClick={handleCopy}
                    color={copied ? 'success' : 'primary'}
                    sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                  >
                    {copied ? 'Tersalin!' : 'Salin Teks'}
                  </Button>
                </Box>
              </Box>

              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  backgroundColor: '#0f172a',
                  color: '#e2e8f0',
                  borderRadius: 2,
                  fontFamily: 'monospace',
                  fontSize: '0.82rem',
                  maxHeight: 280,
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.5,
                  border: '1px solid #334155'
                }}
              >
                {previewText || 'Memuat pesan...'}
              </Paper>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between', backgroundColor: '#f8fafc' }}>
        <Button onClick={onClose} color="inherit" disabled={sending}>
          Tutup
        </Button>

        <Button
          variant="contained"
          color="success"
          startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
          onClick={handleSend}
          disabled={loading || sending || !targetGroupId.trim() || !gatewayStatus?.is_configured}
          sx={{ textTransform: 'none', fontWeight: 800, px: 3 }}
        >
          {sending ? 'Mengirim ke WhatsApp...' : 'Kirim Rekap Sekarang'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
