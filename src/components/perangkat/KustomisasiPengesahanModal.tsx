import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  TextField,
  FormControlLabel,
  Switch,
  MenuItem,
  Divider,
  CircularProgress,
  IconButton,
  Tooltip,
  Alert
} from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import SyncIcon from '@mui/icons-material/Sync';
import axios from 'axios';
import toast from 'react-hot-toast';

interface KustomisasiPengesahanModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function KustomisasiPengesahanModal({ open, onClose, onSaved }: KustomisasiPengesahanModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeWakaInfo, setActiveWakaInfo] = useState<{ name: string; nip: string } | null>(null);
  const [formData, setFormData] = useState({
    instansi_induk: 'PEMERINTAH DAERAH PROVINSI',
    dinas_pendidikan: 'DINAS PENDIDIKAN',
    nama_sekolah: '',
    alamat_sekolah: '',
    kontak_sekolah: '',
    judul_lembar: 'LEMBAR PENGESAHAN PERANGKAT AJAR',
    redaksi_pembuka: 'Setelah melalui tahapan penyusunan, telaah teknis, dan verifikasi kelayakan akademik oleh Tim Pengembang Kurikulum Sekolah, Perangkat Perencanaan Pembelajaran (Perangkat Ajar) yang disusun oleh:',
    redaksi_persetujuan: 'Dinyatakan telah MEMENUHI STANDAR KELENGKAPAN KURIKULUM dan DISAHKAN untuk dipergunakan sebagai pedoman operasional Kegiatan Belajar Mengajar (KBM).',
    titimangsa_kota: '',
    tampilkan_ttd_guru: true,
    tampilkan_ttd_kurikulum: true,
    nama_waka_kurikulum: '',
    nip_waka_kurikulum: '',
    nama_kepsek: '',
    nip_kepsek: '',
    tipe_pengesahan_default: 'QR_CODE',
    catatan_kaki: 'Dokumen ini telah diverifikasi secara elektronik dan dinyatakan sah sebagai dokumen mutu pembelajaran.'
  });

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || localStorage.getItem('guru_token') || sessionStorage.getItem('token');
      const res = await axios.get('/api/perangkat/pengesahan-template', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.data && res.data.data) {
        const data = res.data.data;
        if (res.data.active_waka) {
          setActiveWakaInfo(res.data.active_waka);
        }
        setFormData(prev => ({
          ...prev,
          ...data,
          nama_waka_kurikulum: data.nama_waka_kurikulum || res.data.active_waka?.name || prev.nama_waka_kurikulum || '',
          nip_waka_kurikulum: data.nip_waka_kurikulum || res.data.active_waka?.nip || prev.nip_waka_kurikulum || ''
        }));
      }
    } catch (e) {
      toast.error('Gagal mengambil template pengesahan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchTemplate();
    }
  }, [open]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSyncWaka = () => {
    if (activeWakaInfo) {
      setFormData(prev => ({
        ...prev,
        nama_waka_kurikulum: activeWakaInfo.name,
        nip_waka_kurikulum: activeWakaInfo.nip || '-'
      }));
      toast.success(`Data Waka Kurikulum disinkronkan: ${activeWakaInfo.name}`);
    } else {
      toast.error('Tidak ditemukan guru dengan tugas tambahan Waka Kurikulum yang aktif.');
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token') || localStorage.getItem('guru_token') || sessionStorage.getItem('token');
      const res = await axios.post('/api/perangkat/pengesahan-template', formData, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      toast.success(res.data?.message || 'Kustomisasi Lembar Pengesahan berhasil disimpan');
      if (onSaved) onSaved();
      onClose();
    } catch (e: any) {
      console.error('Save template error:', e);
      toast.error(e.response?.data?.error || 'Gagal menyimpan template pengesahan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: '1px solid #e2e8f0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <EditNoteIcon color="primary" sx={{ fontSize: 28 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Kustomisasi Lembar Pengesahan</Typography>
            <Typography variant="caption" color="text.secondary">
              Sesuaikan kop surat, redaksi pembuka, format persetujuan, dan susunan penandatangan.
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" color="inherit">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            {/* Bagian Kop Surat */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', mb: 1.5 }}>
                1. Header & Kop Surat Resmi
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Instansi Induk (Baris 1)"
                    value={formData.instansi_induk}
                    onChange={e => handleChange('instansi_induk', e.target.value)}
                    placeholder="Contoh: PEMERINTAH PROVINSI JAWA TIMUR"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Dinas Terkait (Baris 2)"
                    value={formData.dinas_pendidikan}
                    onChange={e => handleChange('dinas_pendidikan', e.target.value)}
                    placeholder="Contoh: DINAS PENDIDIKAN"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Nama Satuan Pendidikan / Sekolah"
                    value={formData.nama_sekolah}
                    onChange={e => handleChange('nama_sekolah', e.target.value)}
                    placeholder="Contoh: SMK NEGERI 1 JAKARTA"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Alamat Lengkap Sekolah"
                    value={formData.alamat_sekolah}
                    onChange={e => handleChange('alamat_sekolah', e.target.value)}
                    placeholder="Jl. Merdeka No. 45"
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Kontak / Telepon / Website Sekolah"
                    value={formData.kontak_sekolah}
                    onChange={e => handleChange('kontak_sekolah', e.target.value)}
                    placeholder="Telp: (021) 555-1234 | Website: www.sekolah.sch.id"
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* Bagian Judul & Redaksi */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', mb: 1.5 }}>
                2. Judul Dokumen & Redaksi Pengesahan
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Judul Lembar Pengesahan"
                    value={formData.judul_lembar}
                    onChange={e => handleChange('judul_lembar', e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    size="small"
                    label="Redaksi Pembuka"
                    value={formData.redaksi_pembuka}
                    onChange={e => handleChange('redaksi_pembuka', e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    size="small"
                    label="Redaksi Pernyataan Pengesahan / Persetujuan"
                    value={formData.redaksi_persetujuan}
                    onChange={e => handleChange('redaksi_persetujuan', e.target.value)}
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* Bagian Titimangsa & Tanda Tangan */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                  3. Titimangsa & Penandatangan
                </Typography>
                {activeWakaInfo && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    startIcon={<SyncIcon />}
                    onClick={handleSyncWaka}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                  >
                    Tarik Data Waka dari Tugas Tambahan ({activeWakaInfo.name})
                  </Button>
                )}
              </Box>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Kota Penetapan (Titimangsa)"
                    value={formData.titimangsa_kota}
                    onChange={e => handleChange('titimangsa_kota', e.target.value)}
                    placeholder="Contoh: Bojonegoro"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Metode Pengesahan Default"
                    value={formData.tipe_pengesahan_default}
                    onChange={e => handleChange('tipe_pengesahan_default', e.target.value)}
                  >
                    <MenuItem value="QR_CODE">QR Code Resmi (Sertifikasi Digital)</MenuItem>
                    <MenuItem value="TTD_DIGITAL">Tanda Tangan Digital / Goresan</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, bgcolor: '#f8fafc', p: 1, borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={formData.tampilkan_ttd_guru}
                          onChange={e => handleChange('tampilkan_ttd_guru', e.target.checked)}
                        />
                      }
                      label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Tampilkan TTD Guru</Typography>}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={formData.tampilkan_ttd_kurikulum}
                          onChange={e => handleChange('tampilkan_ttd_kurikulum', e.target.checked)}
                        />
                      }
                      label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Tampilkan TTD Waka Kurikulum</Typography>}
                    />
                  </Box>
                </Grid>

                {formData.tampilkan_ttd_kurikulum && (
                  <>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Nama Waka Kurikulum (Penelaah Akademik)"
                        value={formData.nama_waka_kurikulum}
                        onChange={e => handleChange('nama_waka_kurikulum', e.target.value)}
                        helperText={activeWakaInfo ? `Terdeteksi di Tugas Tambahan: ${activeWakaInfo.name}` : undefined}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="NIP Waka Kurikulum"
                        value={formData.nip_waka_kurikulum}
                        onChange={e => handleChange('nip_waka_kurikulum', e.target.value)}
                      />
                    </Grid>
                  </>
                )}

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Nama Kepala Sekolah"
                    value={formData.nama_kepsek}
                    onChange={e => handleChange('nama_kepsek', e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="NIP Kepala Sekolah"
                    value={formData.nip_kepsek}
                    onChange={e => handleChange('nip_kepsek', e.target.value)}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Catatan Kaki (Footer Catatan Resmi)"
                    value={formData.catatan_kaki}
                    onChange={e => handleChange('catatan_kaki', e.target.value)}
                  />
                </Grid>
              </Grid>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
        <Button onClick={onClose} variant="outlined" color="inherit" sx={{ borderRadius: 2, textTransform: 'none' }}>
          Batal
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
          disabled={saving || loading}
          sx={{ fontWeight: 800, borderRadius: 2, textTransform: 'none' }}
        >
          {saving ? 'Menyimpan...' : 'Simpan Kustomisasi'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
