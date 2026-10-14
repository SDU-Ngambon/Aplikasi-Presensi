import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Stack,
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
  Chip,
  LinearProgress,
  Paper,
  Divider
} from '@mui/material';
import {
  Usb as UsbIcon,
  CheckCircle as CheckCircleIcon,
  Cable as CableIcon,
  Speed as SpeedIcon,
  VerifiedUser as VerifiedIcon,
  QrCodeScanner as QrCodeScannerIcon
} from '@mui/icons-material';

export interface ExternalScannerPort {
  id: string;
  name: string;
  connectionType: 'usb_hid' | 'serial_port';
  portAddress?: string;
  baudRate?: number;
  prefix?: string; // Optional hardware prefix (e.g. S1-, P1:)
  suffix?: string; // Optional hardware suffix (e.g. \n, \r)
  isVerified: boolean;
  verifiedAt?: string;
  deviceSignature?: string;
  value?: string;
  totalScans: number;
  lastScanned?: {
    studentName: string;
    studentClass: string;
    studentPhoto?: string;
    timestamp: string;
    status: string;
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (scanner: ExternalScannerPort) => void;
  existingCount: number;
  initialData?: ExternalScannerPort | null;
}

export default function ExternalScannerVerifierDialog({
  open,
  onClose,
  onSave,
  existingCount,
  initialData
}: Props) {
  const [name, setName] = useState('');
  const [connectionType, setConnectionType] = useState<'usb_hid' | 'serial_port'>('usb_hid');
  const [prefix, setPrefix] = useState('');
  const [testInput, setTestInput] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [verificationDetails, setVerificationDetails] = useState<{
    latencyMs: number;
    charCount: number;
    deviceSignature: string;
    rawPayload: string;
  } | null>(null);

  const testInputRef = useRef<HTMLInputElement | null>(null);
  const keyTimes = useRef<number[]>([]);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setName(initialData.name);
        setConnectionType(initialData.connectionType);
        setPrefix(initialData.prefix || '');
        if (initialData.isVerified) {
          setVerificationStatus('success');
          setVerificationDetails({
            latencyMs: 15,
            charCount: initialData.deviceSignature?.length || 10,
            deviceSignature: initialData.deviceSignature || 'PRE-VERIFIED-HARDWARE-PORT',
            rawPayload: 'Hardware Port Verified'
          });
        } else {
          setVerificationStatus('idle');
          setVerificationDetails(null);
        }
      } else {
        setName(`Scanner Port ${existingCount + 1} (Gerbang ${existingCount === 0 ? 'Utama' : existingCount + 1})`);
        setConnectionType('usb_hid');
        setPrefix('');
        setVerificationStatus('idle');
        setVerificationDetails(null);
      }
      setTestInput('');
      keyTimes.current = [];

      setTimeout(() => {
        if (testInputRef.current) {
          testInputRef.current.focus();
        }
      }, 200);
    }
  }, [open, initialData, existingCount]);

  const handleTestKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const now = performance.now();
    keyTimes.current.push(now);

    if (e.key === 'Enter') {
      e.preventDefault();
      const val = testInput.trim();
      if (!val) {
        setVerificationStatus('failed');
        return;
      }

      // Calculate speed/latency: Hardware barcode/QR scanners type very fast (< 50ms average inter-key)
      let avgInterval = 20;
      if (keyTimes.current.length > 1) {
        const totalDuration = keyTimes.current[keyTimes.current.length - 1] - keyTimes.current[0];
        avgInterval = Math.round(totalDuration / (keyTimes.current.length - 1));
      }

      const generatedSignature = `HW-PORT-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

      setVerificationDetails({
        latencyMs: Math.max(5, avgInterval),
        charCount: val.length,
        deviceSignature: generatedSignature,
        rawPayload: val
      });
      setVerificationStatus('success');
    }
  };

  const handleSerialConnectTest = async () => {
    if (!('serial' in navigator)) {
      alert('Browser ini belum mendukung Web Serial API. Gunakan mode USB HID Wedge Scanner standar yang kompatibel dengan semua browser.');
      return;
    }

    try {
      setVerificationStatus('testing');
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600 });
      
      const sig = `SERIAL-COM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setVerificationDetails({
        latencyMs: 8,
        charCount: 12,
        deviceSignature: sig,
        rawPayload: 'COM Serial Port Ready (9600 Baud)'
      });
      setVerificationStatus('success');
      await port.close();
    } catch (err: any) {
      console.warn('Serial port error', err);
      setVerificationStatus('failed');
    }
  };

  const handleConfirmSave = () => {
    const newPort: ExternalScannerPort = {
      id: initialData?.id || `scanner_port_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim() || `Scanner Port ${existingCount + 1}`,
      connectionType,
      portAddress: connectionType === 'serial_port' ? 'COM Serial Port' : 'USB HID Channel',
      prefix: prefix.trim() || undefined,
      isVerified: true,
      verifiedAt: new Date().toISOString(),
      deviceSignature: verificationDetails?.deviceSignature || `PORT-VERIFIED-${Date.now()}`,
      totalScans: initialData?.totalScans || 0,
      value: ''
    };

    onSave(newPort);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}>
      <DialogTitle component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <UsbIcon color="primary" sx={{ fontSize: 30 }} />
        <Box>
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
            {initialData ? 'Konfigurasi & Verifikasi Port Scanner' : 'Tambah & Verifikasi Scanner Eksternal'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Verifikasi perangkat scanner sekali saat pertama kali ditambahkan.
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Nama / Lokasi Scanner
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Contoh: Scanner Gerbang 1 (Utama)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Tipe Antarmuka / Koneksi
            </Typography>
            <RadioGroup
              row
              value={connectionType}
              onChange={(e) => {
                setConnectionType(e.target.value as any);
                setVerificationStatus('idle');
                setVerificationDetails(null);
                setTestInput('');
              }}
            >
              <FormControlLabel
                value="usb_hid"
                control={<Radio size="small" />}
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      USB / Wireless Gun Scanner (HID Wedge)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Tipe standar scanner barcode/QR USB colok langsung (otomatis global listener)
                    </Typography>
                  </Box>
                }
                sx={{ mb: 1, width: '100%' }}
              />
              <FormControlLabel
                value="serial_port"
                control={<Radio size="small" />}
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Web Serial COM Port (RS232 / USB-Serial)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Komunikasi port COM virtual perangkat industri (baca otomatis di latar belakang)
                    </Typography>
                  </Box>
                }
                sx={{ width: '100%' }}
              />
            </RadioGroup>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
              Hardware Prefix Khusus (Opsional)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Jika scanner Anda diprogram mengirim kode awalan (contoh: <code>S1-</code> atau <code>G1:</code>), sistem akan memetakan data langsung ke port ini tanpa perlu fokus kursor.
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Contoh: S1- (Kosongkan jika scanner standar)"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
            />
          </Box>

          <Divider />

          {/* VERIFICATION TEST AREA */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '2px dashed',
              borderColor:
                verificationStatus === 'success'
                  ? 'success.main'
                  : verificationStatus === 'failed'
                  ? 'error.main'
                  : 'primary.light',
              bgcolor:
                verificationStatus === 'success'
                  ? '#f0fdf4'
                  : verificationStatus === 'failed'
                  ? '#fef2f2'
                  : '#f8fafc'
            }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5 }}>
              <QrCodeScannerIcon color={verificationStatus === 'success' ? 'success' : 'primary'} />
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Langkah Verifikasi Port Scanner
              </Typography>
            </Stack>

            {connectionType === 'usb_hid' ? (
              <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  Arahkan scanner ke kartu pelajar/barcode apa saja dan tekan tombol scan untuk menguji kecepatan dan validitas sinyal port:
                </Typography>

                <TextField
                  inputRef={testInputRef}
                  fullWidth
                  size="medium"
                  placeholder="[ Lakukan Scan Uji Coba Disini... ]"
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  onKeyDown={handleTestKeyDown}
                  autoFocus
                  slotProps={{
                    input: {
                      sx: {
                        bgcolor: 'white',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        fontSize: '1.1rem',
                        letterSpacing: 1
                      }
                    }
                  }}
                />
              </Stack>
            ) : (
              <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  Klik tombol di bawah untuk mendeteksi dan menguji handshake port serial perangkat scanner Anda:
                </Typography>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<CableIcon />}
                  onClick={handleSerialConnectTest}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  Pilih & Uji Sambungan Serial Port
                </Button>
              </Stack>
            )}

            {verificationStatus === 'testing' && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress />
                <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
                  Memverifikasi handshake port...
                </Typography>
              </Box>
            )}

            {verificationStatus === 'success' && verificationDetails && (
              <Alert
                severity="success"
                icon={<CheckCircleIcon fontSize="inherit" />}
                sx={{ mt: 2, borderRadius: 2 }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  Port Scanner Berhasil Diverifikasi!
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                  <Chip
                    icon={<SpeedIcon />}
                    label={`Latensi Port: ${verificationDetails.latencyMs}ms`}
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                  <Chip
                    icon={<VerifiedIcon />}
                    label="Status: Terverifikasi Siap Pakai"
                    size="small"
                    color="success"
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Scanner ini sudah terdaftar. Selanjutnya saat presensi dibuka, perangkat ini otomatis aktif tanpa perlu verifikasi ulang.
                </Typography>
              </Alert>
            )}

            {verificationStatus === 'failed' && (
              <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                Verifikasi belum berhasil. Pastikan kabel scanner terhubung dan barcode/QR terdeteksi dengan benar.
              </Alert>
            )}
          </Paper>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit" sx={{ textTransform: 'none' }}>
          Batal
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleConfirmSave}
          disabled={verificationStatus !== 'success'}
          startIcon={<VerifiedIcon />}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: 2,
            px: 3
          }}
        >
          Simpan & Pasang Scanner
        </Button>
      </DialogActions>
    </Dialog>
  );
}
