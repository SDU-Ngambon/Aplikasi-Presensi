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
  Switch,
  FormControlLabel,
  RadioGroup,
  Radio,
  FormControl,
  FormLabel,
  Alert,
  CircularProgress,
  Divider,
  Paper,
  Chip
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TuneIcon from '@mui/icons-material/Tune';

interface PengaturanWaRekapModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PengaturanWaRekapModal: React.FC<PengaturanWaRekapModalProps> = ({
  open,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const [gatewayStatus, setGatewayStatus] = useState<any>(null);

  const [isActive, setIsActive] = useState(true);
  const [targetGroupId, setTargetGroupId] = useState('');
  const [targetGroupName, setTargetGroupName] = useState('');
  const [sendMode, setSendMode] = useState<'MANUAL' | 'AUTO_FRIDAY' | 'AUTO_WEEKEND'>('AUTO_FRIDAY');
  const [autoSendTime, setAutoSendTime] = useState('15:00');
  const [customMessageHeader, setCustomMessageHeader] = useState('');
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);

  const fetchConfig = async () => {
    setLoading(true);
    setAlertInfo(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/perangkat/whatsapp-rekap/config', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        const c = json.config || {};
        setIsActive(c.is_active ?? true);
        setTargetGroupId(c.target_group_id || '');
        setTargetGroupName(c.target_group_name || '');
        setSendMode(c.send_mode || 'AUTO_FRIDAY');
        setAutoSendTime(c.auto_send_time || '15:00');
        setCustomMessageHeader(c.custom_message_header || '');
        setLastSentAt(c.last_sent_at || null);
        setGatewayStatus(json.gateway || null);
      } else {
        setAlertInfo({ type: 'error', message: json.error || 'Gagal memuat pengaturan' });
      }
    } catch (e: any) {
      setAlertInfo({ type: 'error', message: e.message || 'Gagal menghubungi server' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchConfig();
    }
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    setAlertInfo(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/perangkat/whatsapp-rekap/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          is_active: isActive,
          target_group_id: targetGroupId.trim(),
          target_group_name: targetGroupName.trim(),
          send_mode: sendMode,
          auto_send_time: autoSendTime,
          custom_message_header: customMessageHeader
        })
      });
      const json = await res.json();
      if (json.success) {
        setAlertInfo({ type: 'success', message: 'Pengaturan Rekap WhatsApp berhasil disimpan!' });
        if (onSuccess) onSuccess();
      } else {
        setAlertInfo({ type: 'error', message: json.error || 'Gagal menyimpan pengaturan' });
      }
    } catch (e: any) {
      setAlertInfo({ type: 'error', message: e.message || 'Gagal menyimpan pengaturan' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!targetGroupId.trim()) {
      setAlertInfo({ type: 'error', message: 'Silakan isi ID Grup atau Nomor WhatsApp tujuan sebelum melakukan tes koneksi.' });
      return;
    }

    setTesting(true);
    setAlertInfo(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/perangkat/whatsapp-rekap/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          target_group_id: targetGroupId.trim(),
          target_group_name: targetGroupName.trim() || targetGroupId.trim()
        })
      });
      const json = await res.json();
      if (json.success) {
        setAlertInfo({ type: 'success', message: json.message || 'Pesan uji coba berhasil terkirim ke WhatsApp!' });
      } else {
        setAlertInfo({ type: 'error', message: json.error || 'Gagal mengirim pesan uji coba WhatsApp' });
      }
    } catch (e: any) {
      setAlertInfo({ type: 'error', message: e.message || 'Gagal melakukan tes koneksi' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1, backgroundColor: '#f8fafc' }}>
        <Box sx={{ p: 1, borderRadius: 2, backgroundColor: '#dcfce7', color: '#15803d', display: 'flex' }}>
          <WhatsAppIcon />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>
            Pengaturan Kirim Rekap WhatsApp
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748b' }}>
            Konfigurasi grup tujuan, jadwal pengiriman otomatis & gateway WhatsApp utama
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            <CircularProgress size={36} />
            <Typography variant="body2" sx={{ mt: 2, color: '#64748b' }}>
              Memuat konfigurasi...
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {alertInfo && (
              <Alert severity={alertInfo.type} onClose={() => setAlertInfo(null)}>
                {alertInfo.message}
              </Alert>
            )}

            {/* STATUS GATEWAY UTAMA */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, backgroundColor: gatewayStatus?.is_configured ? '#f0fdf4' : '#fffbeb', borderColor: gatewayStatus?.is_configured ? '#86efac' : '#fde68a' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {gatewayStatus?.is_configured ? (
                    <CheckCircleIcon sx={{ color: '#16a34a', fontSize: 20 }} />
                  ) : (
                    <WarningAmberIcon sx={{ color: '#d97706', fontSize: 20 }} />
                  )}
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: gatewayStatus?.is_configured ? '#166534' : '#92400e' }}>
                    Gateway WhatsApp Utama ({gatewayStatus?.provider?.toUpperCase() || 'GATEWAY'})
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={gatewayStatus?.is_configured ? 'Terkoneksi' : 'Belum Diatur'}
                  color={gatewayStatus?.is_configured ? 'success' : 'warning'}
                  sx={{ fontWeight: 700, height: 22, fontSize: '0.72rem' }}
                />
              </Box>

              <Typography variant="caption" sx={{ display: 'block', color: '#475569', lineHeight: 1.4 }}>
                {gatewayStatus?.is_configured ? (
                  <>
                    Menggunakan gateway yang diatur pada menu <b>Atur Gateway</b> (Endpoint: <code>{gatewayStatus?.url}</code> | Token: <code>{gatewayStatus?.masked_key}</code>).
                  </>
                ) : (
                  <>
                    ⚠️ Gateway WhatsApp utama belum dikonfigurasi. Silakan lengkapi token WhatsApp pada menu <b>Atur Gateway</b> (Akses Administrator).
                  </>
                )}
              </Typography>
            </Paper>

            {/* TOGGLE AKTIFKAN REKAP */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderRadius: 2, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  Aktifkan Layanan Rekap WhatsApp
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Izinkan pengiriman rekap supervisi manual dan otomatis
                </Typography>
              </Box>
              <Switch
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                color="success"
              />
            </Box>

            {/* TARGET WHATSAPP */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e293b' }}>
                🎯 Tujuan Rekapitulasi WhatsApp
              </Typography>
              
              <TextField
                label="ID Grup WhatsApp Tujuan (Group JID) *"
                placeholder="Contoh: 1203630248234234@g.us atau nomor HP/Grup"
                value={targetGroupId}
                onChange={(e) => setTargetGroupId(e.target.value)}
                fullWidth
                size="small"
                helperText="Masukkan ID Grup WhatsApp (berakhiran @g.us) atau nomor telepon yang akan menerima rekapitulasi."
              />

              <TextField
                label="Nama Label Grup / Target (Opsional)"
                placeholder="Contoh: Grup Dewan Guru & Kurikulum"
                value={targetGroupName}
                onChange={(e) => setTargetGroupName(e.target.value)}
                fullWidth
                size="small"
              />
            </Box>

            <Divider />

            {/* METODE & JADWAL PENGIRIMAN */}
            <FormControl component="fieldset">
              <FormLabel component="legend" sx={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem', mb: 1 }}>
                ⏰ Opsi & Mode Pengiriman Rekap
              </FormLabel>
              <RadioGroup
                value={sendMode}
                onChange={(e) => setSendMode(e.target.value as any)}
              >
                <FormControlLabel
                  value="AUTO_FRIDAY"
                  control={<Radio color="success" size="small" />}
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        Otomasi Setiap Hari Jumat (Rekomendasi)
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        Sistem otomatis mengirimkan rekapitulasi ke grup WhatsApp setiap hari Jumat saat jam kerja berakhir.
                      </Typography>
                    </Box>
                  }
                  sx={{ mb: 1, alignItems: 'flex-start' }}
                />

                <FormControlLabel
                  value="AUTO_WEEKEND"
                  control={<Radio color="success" size="small" />}
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        Otomasi Setiap Akhir Minggu (Jumat, Sabtu, & Minggu)
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        Mengirimkan evaluasi rekap mingguan menjelang persiapan pekan KBM berikutnya.
                      </Typography>
                    </Box>
                  }
                  sx={{ mb: 1, alignItems: 'flex-start' }}
                />

                <FormControlLabel
                  value="MANUAL"
                  control={<Radio color="success" size="small" />}
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        Hanya Kirim Manual
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        Otomasi non-aktif. Rekapitulasi hanya dikirim saat Admin, Waka Kurikulum, atau Kepala Sekolah menekan tombol kirim.
                      </Typography>
                    </Box>
                  }
                  sx={{ alignItems: 'flex-start' }}
                />
              </RadioGroup>
            </FormControl>

            {sendMode !== 'MANUAL' && (
              <Box sx={{ pl: 4 }}>
                <TextField
                  label="Jam Pengiriman Otomatis (WIB)"
                  type="time"
                  value={autoSendTime}
                  onChange={(e) => setAutoSendTime(e.target.value)}
                  size="small"
                  sx={{ width: 180 }}
                  slotProps={{
                    inputLabel: { shrink: true },
                    htmlInput: { step: 300 }
                  }}
                  helperText="Format 24 jam (misal 15:00)"
                />
              </Box>
            )}

            <Divider />

            {/* CATATAN HEADER TAMBAHAN */}
            <TextField
              label="Pesan / Catatan Tambahan (Opsional)"
              placeholder="Contoh: Mohon bapak/ibu guru yang belum melengkapi berkas supervisi untuk segera mengunggah sebelum..."
              value={customMessageHeader}
              onChange={(e) => setCustomMessageHeader(e.target.value)}
              multiline
              rows={2}
              fullWidth
              size="small"
              helperText="Catatan ini akan otomatis disisipkan di bagian bawah laporan rekapitulasi WhatsApp."
            />

            {/* LAST SENT STATUS */}
            {lastSentAt && (
              <Typography variant="caption" sx={{ color: '#64748b', fontStyle: 'italic' }}>
                Terakhir dikirimkan: {new Date(lastSentAt).toLocaleString('id-ID')}
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between', backgroundColor: '#f8fafc' }}>
        <Button
          variant="outlined"
          color="secondary"
          startIcon={testing ? <CircularProgress size={16} /> : <SendIcon />}
          onClick={handleTestConnection}
          disabled={loading || testing || !targetGroupId.trim()}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          {testing ? 'Mengirim Tes...' : 'Tes Koneksi'}
        </Button>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose} color="inherit" disabled={saving}>
            Batal
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={loading || saving}
            sx={{ textTransform: 'none', fontWeight: 800 }}
          >
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
