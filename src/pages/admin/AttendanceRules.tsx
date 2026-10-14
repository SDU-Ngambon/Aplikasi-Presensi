import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  FormControlLabel,
  Switch,
  Alert,
  Paper,
  Stack,
  Divider,
  LinearProgress,
  Dialog,
  DialogContent,
  DialogActions,
  InputAdornment,
  Chip
} from '@mui/material';
import {
  LocationOn as LocationOnIcon,
  MyLocation as MyLocationIcon,
  Save as SaveIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  Map as MapIcon,
  InfoOutlined as InfoIcon,
  QrCodeScanner as QrCodeScannerIcon,
  Tune as TuneIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { AttendanceRule } from '../../types';

export default function AttendanceRules() {
  const [rules, setRules] = useState<AttendanceRule>({
    school_latitude: -6.2088,
    school_longitude: 106.8456,
    school_location_name: 'SMK Kampus Utama',
    max_distance_meters: 100,
    min_student_verification: 2,
    allow_manual_verification: false
  });

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);

  // Result Feedback Popup
  const [resultPopup, setResultPopup] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({
    open: false,
    title: '',
    message: ''
  });

  const loadRules = async () => {
    setLoading(true);
    setProgress(30);
    try {
      const res = await fetch('/api/attendance-rules');
      setProgress(70);
      const data = await res.json();
      if (data && typeof data === 'object') {
        setRules(prev => ({
          ...prev,
          ...data
        }));
      }
      setProgress(100);
    } catch (e: any) {
      toast.error('Gagal memuat aturan kehadiran: ' + e.message);
    } finally {
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 300);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  // Deteksi GPS saat ini via browser Geolocation API
  const handleDetectCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Perangkat/Browser Anda tidak mendukung Geolocation GPS.');
      return;
    }

    setDetectingGps(true);
    toast.loading('Mendeteksi sinyal GPS koordinat sekolah...', { id: 'gps-detect' });

    navigator.geolocation.getCurrentPosition(
      pos => {
        setDetectingGps(false);
        toast.dismiss('gps-detect');
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        const accuracy = Math.round(pos.coords.accuracy);

        setRules(prev => ({
          ...prev,
          school_latitude: lat,
          school_longitude: lng
        }));

        toast.success(`Koordinat terdeteksi (Akurasi: ±${accuracy}m): ${lat}, ${lng}`);
      },
      err => {
        setDetectingGps(false);
        toast.dismiss('gps-detect');
        let errMsg = 'Gagal mendeteksi lokasi GPS.';
        if (err.code === err.PERMISSION_DENIED) {
          errMsg = 'Izin akses lokasi ditolak oleh browser.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          errMsg = 'Sinyal lokasi tidak tersedia.';
        } else if (err.code === err.TIMEOUT) {
          errMsg = 'Permintaan lokasi GPS melebihi batas waktu (timeout).';
        }
        toast.error(errMsg);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleSaveRules = async () => {
    if (rules.max_distance_meters < 10) {
      toast.error('Jarak maksimal minimal 10 meter');
      return;
    }
    if (rules.min_student_verification < 1) {
      toast.error('Minimal verifikasi siswa harus minimal 1 kali');
      return;
    }

    setIsProcessing(true);
    setProgress(20);

    try {
      const pInterval = setInterval(() => {
        setProgress(p => (p < 85 ? p + 20 : p));
      }, 100);

      const res = await fetch('/api/attendance-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rules)
      });
      const data = await res.json();
      clearInterval(pInterval);
      setProgress(100);

      if (!data.success) {
        throw new Error(data.error || 'Gagal menyimpan aturan kehadiran');
      }

      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        setResultPopup({
          open: true,
          title: 'Aturan Kehadiran Berhasil Disimpan',
          message: `Titik koordinat (${rules.school_latitude}, ${rules.school_longitude}) dengan radius batas ${rules.max_distance_meters}m dan kewajiban verifikasi ${rules.min_student_verification} kartu siswa telah aktif.`
        });
      }, 350);
    } catch (e: any) {
      setIsProcessing(false);
      setProgress(0);
      toast.error(e.message || 'Gagal menyimpan aturan');
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Top progress bar */}
      {(loading || isProcessing) && (
        <Box sx={{ width: '100%', position: 'fixed', top: 0, left: 0, zIndex: 9999 }}>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 4 }} />
        </Box>
      )}

      {/* Header Banner */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocationOnIcon sx={{ color: 'primary.main', fontSize: 30 }} />
          Pengaturan Aturan Kehadiran Guru
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Tentukan titik pusat sekolah, radius jangkauan maksimal geofencing, serta jumlah validasi kartu pelajar siswa untuk presensi KBM yang akurat dan anti-kecurangan.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* CARD 1: TITIK KOORDINAT SEKOLAH & RADIUS */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MapIcon sx={{ color: 'primary.main', fontSize: 22 }} />
                  Titik Lokasi Sekolah (Geofencing)
                </Typography>
                <Chip
                  label="Wajib Akurat"
                  color="primary"
                  size="small"
                  sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                />
              </Box>

              <Alert severity="info" icon={<InfoIcon fontSize="small" />} sx={{ mb: 3, borderRadius: 2 }}>
                Saat guru melakukan presensi KBM di kelas, sistem akan mencocokkan posisi GPS perangkat guru terhadap titik koordinat ini. Jika berada di luar batas maksimal, kehadiran akan ditandai atau ditolak.
              </Alert>

              <Stack spacing={2.5}>
                <TextField
                  label="Nama Lokasi / Kampus Sekolah"
                  fullWidth
                  size="small"
                  value={rules.school_location_name}
                  onChange={e => setRules({ ...rules, school_location_name: e.target.value })}
                  placeholder="Misal: SMK Negeri 1 Jakarta - Kampus Utama"
                />

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Latitude (Garis Lintang)"
                      type="number"
                      fullWidth
                      size="small"
                      value={rules.school_latitude}
                      onChange={e => setRules({ ...rules, school_latitude: parseFloat(e.target.value) || 0 })}
                      helperText="Contoh: -6.2088"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Longitude (Garis Bujur)"
                      type="number"
                      fullWidth
                      size="small"
                      value={rules.school_longitude}
                      onChange={e => setRules({ ...rules, school_longitude: parseFloat(e.target.value) || 0 })}
                      helperText="Contoh: 106.8456"
                    />
                  </Grid>
                </Grid>

                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<MyLocationIcon />}
                    onClick={handleDetectCurrentLocation}
                    disabled={detectingGps}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                  >
                    {detectingGps ? 'Mendeteksi GPS...' : 'Ambil Koordinat Saya Sekarang'}
                  </Button>
                  <Button
                    variant="text"
                    size="small"
                    component="a"
                    href={`https://www.google.com/maps?q=${rules.school_latitude},${rules.school_longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    sx={{ textTransform: 'none' }}
                  >
                    Buka di Google Maps ↗
                  </Button>
                </Box>

                <Divider sx={{ my: 1 }} />

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    Jarak Maksimal Kehadiran yang Diperbolehkan:
                  </Typography>
                  <TextField
                    type="number"
                    fullWidth
                    size="small"
                    value={rules.max_distance_meters}
                    onChange={e => setRules({ ...rules, max_distance_meters: Math.max(10, parseInt(e.target.value) || 0) })}
                    slotProps={{
                      input: {
                        endAdornment: <InputAdornment position="end">Meter (Radius)</InputAdornment>
                      }
                    }}
                    helperText="Rekomendasi area sekolah: 50 s/d 200 meter dari titik pusat gedung sekolah"
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* CARD 2: ATURAN VERIFIKASI KARTU PELAJAR & KEAMANAN */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SecurityIcon sx={{ color: 'primary.main', fontSize: 22 }} />
                  Verifikasi Kartu Siswa
                </Typography>
                <Chip
                  label="Anti Manipulasi"
                  color="success"
                  size="small"
                  sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                />
              </Box>

              <Alert severity="success" icon={<QrCodeScannerIcon fontSize="small" />} sx={{ mb: 3, borderRadius: 2 }}>
                Fitur ini memastikan guru benar-benar berada di dalam ruang kelas dengan cara memindai (scan) barcode kartu pelajar siswa di kelas tersebut.
              </Alert>

              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    Minimal Jumlah Kartu Siswa yang Wajib Discan:
                  </Typography>
                  <TextField
                    type="number"
                    fullWidth
                    size="small"
                    value={rules.min_student_verification}
                    onChange={e => setRules({ ...rules, min_student_verification: Math.max(1, parseInt(e.target.value) || 1) })}
                    slotProps={{
                      input: {
                        endAdornment: <InputAdornment position="end">Siswa Berbeda</InputAdornment>
                      }
                    }}
                    helperText="Contoh: 2 siswa. Guru wajib scan minimal 2 kartu pelajar siswa di kelas tersebut sebelum tombol kirim kehadiran aktif."
                  />
                </Box>

                <Paper elevation={0} sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={rules.allow_manual_verification}
                        onChange={e => setRules({ ...rules, allow_manual_verification: e.target.checked })}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          Izinkan Input NISN Manual
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Jika kamera ponsel guru rusak atau barcode kartu kotor, guru dapat mengetikkan NISN siswa secara manual.
                        </Typography>
                      </Box>
                    }
                  />
                </Paper>

                <Box sx={{ pt: 2 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveRules}
                    disabled={isProcessing}
                    sx={{
                      borderRadius: 2.5,
                      py: 1.3,
                      textTransform: 'none',
                      fontWeight: 700,
                      boxShadow: '0 4px 14px rgba(37,99,235,0.3)'
                    }}
                  >
                    Simpan Perubahan Aturan
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* MODERN POPUP MODAL FEEDBACK */}
      <Dialog
        open={resultPopup.open}
        onClose={() => setResultPopup(prev => ({ ...prev, open: false }))}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: 3, p: 1, textAlign: 'center' }
          }
        }}
      >
        <DialogContent>
          <Box sx={{ my: 1 }}>
            <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main', mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
              {resultPopup.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {resultPopup.message}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button
            variant="contained"
            onClick={() => setResultPopup(prev => ({ ...prev, open: false }))}
            sx={{ borderRadius: 2, px: 4, textTransform: 'none', fontWeight: 700 }}
          >
            Selesai
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
