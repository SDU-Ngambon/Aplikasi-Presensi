import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Box, Select, MenuItem, IconButton, Tooltip, Typography, Stack } from '@mui/material';
import FlipCameraAndroidIcon from '@mui/icons-material/FlipCameraAndroid';
import VideocamIcon from '@mui/icons-material/Videocam';

interface CustomScannerProps {
  id: string;
  onScan: (text: string) => void;
  preferredFacingMode?: 'environment' | 'user';
  fps?: number;
}

export default function CustomScanner({
  id,
  onScan,
  preferredFacingMode = 'environment',
  fps = 15
}: CustomScannerProps) {
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [isStarted, setIsStarted] = useState(false);
  const targetId = `qr-reader-${id}`;
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Keep latest onScan in a ref to prevent camera restarts on parent re-render
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  // Find optimal rear/back camera or fallback
  const selectPreferredCamera = (devices: any[], pref: 'environment' | 'user') => {
    if (!devices || devices.length === 0) return '';
    if (pref === 'environment') {
      const backCam = devices.find(d => {
        const lbl = (d.label || '').toLowerCase();
        return (
          lbl.includes('back') ||
          lbl.includes('rear') ||
          lbl.includes('belakang') ||
          lbl.includes('environment') ||
          lbl.includes('facing back') ||
          lbl.includes('camera2 0')
        );
      });
      if (backCam) return backCam.id;
      // Many mobile devices place the back camera as the last item
      if (devices.length > 1) return devices[devices.length - 1].id;
      return devices[0].id;
    } else {
      const frontCam = devices.find(d => {
        const lbl = (d.label || '').toLowerCase();
        return (
          lbl.includes('front') ||
          lbl.includes('user') ||
          lbl.includes('depan') ||
          lbl.includes('selfie') ||
          lbl.includes('facing front')
        );
      });
      if (frontCam) return frontCam.id;
      return devices[0].id;
    }
  };

  useEffect(() => {
    let isMounted = true;
    Html5Qrcode.getCameras()
      .then(devices => {
        if (isMounted && devices && devices.length > 0) {
          setCameras(devices);
          const defaultCamId = selectPreferredCamera(devices, preferredFacingMode);
          setSelectedCamera(defaultCamId || devices[0].id);
        }
      })
      .catch(err => {
        console.warn('Error getting cameras:', err);
      });
    return () => {
      isMounted = false;
    };
  }, [preferredFacingMode]);

  useEffect(() => {
    if (!selectedCamera) return;

    let isSubscribed = true;
    let html5QrCode = html5QrCodeRef.current;

    const startScanner = async () => {
      try {
        if (!html5QrCode) {
          html5QrCode = new Html5Qrcode(targetId, {
            verbose: false,
            formatsToSupport: [
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.DATA_MATRIX
            ]
          } as any);
          html5QrCodeRef.current = html5QrCode;
        }

        if (html5QrCode.isScanning) {
          await html5QrCode.stop();
        }

        if (!isSubscribed) return;

        await html5QrCode.start(
          selectedCamera,
          {
            fps: fps,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minDim = Math.min(viewfinderWidth, viewfinderHeight);
              const boxSize = Math.max(180, Math.floor(minDim * 0.78));
              return { width: boxSize, height: boxSize };
            },
            aspectRatio: 1.0
          },
          (decodedText) => {
            if (onScanRef.current) {
              onScanRef.current(decodedText);
            }
          },
          () => {} // Silent on non-detect frames for performance
        );

        if (isSubscribed) {
          setIsStarted(true);
        }
      } catch (e) {
        console.warn('Scanner start error:', e);
      }
    };

    const timer = setTimeout(startScanner, 80);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode
          .stop()
          .then(() => html5QrCode?.clear())
          .catch(e => console.warn('Scanner stop error:', e));
      }
    };
  }, [selectedCamera, targetId, fps]);

  const handleToggleCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(c => c.id === selectedCamera);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setSelectedCamera(cameras[nextIndex].id);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, alignItems: 'center', mb: 1 }}>
        <Select
          size="small"
          value={selectedCamera}
          onChange={e => setSelectedCamera(e.target.value)}
          sx={{
            flex: 1,
            bgcolor: 'white',
            borderRadius: 2,
            fontSize: '0.82rem',
            '& .MuiSelect-select': {
              py: 0.8,
              display: 'flex',
              alignItems: 'center',
              gap: 0.8
            }
          }}
          displayEmpty
          renderValue={val => {
            const cam = cameras.find(c => c.id === val);
            const label = cam ? (cam.label || `Kamera ${cam.id.slice(0, 5)}`) : 'Memuat Kamera...';
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <VideocamIcon fontSize="small" sx={{ color: 'primary.main', fontSize: 18 }} />
                <span>{label}</span>
              </Box>
            );
          }}
        >
          <MenuItem value="" disabled>Pilih Kamera</MenuItem>
          {cameras.map(cam => (
            <MenuItem key={cam.id} value={cam.id} sx={{ fontSize: '0.85rem' }}>
              {cam.label || `Kamera ${cam.id}`}
            </MenuItem>
          ))}
        </Select>

        {cameras.length > 1 && (
          <Tooltip title="Ganti Kamera Depan / Belakang">
            <IconButton
              onClick={handleToggleCamera}
              sx={{
                bgcolor: '#f1f5f9',
                color: 'primary.main',
                border: '1px solid #e2e8f0',
                '&:hover': { bgcolor: '#e2e8f0' }
              }}
              size="small"
            >
              <FlipCameraAndroidIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Box
        sx={{
          position: 'relative',
          width: '100%',
          overflow: 'hidden',
          borderRadius: 2.5,
          bgcolor: '#000000',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          border: '2px solid #3b82f6',
          '& > div': {
            width: '100% !important',
            border: 'none !important'
          },
          '& video': {
            objectFit: 'cover',
            borderRadius: '8px',
            width: '100% !important'
          }
        }}
      >
        <Box id={targetId} />
      </Box>
    </Box>
  );
}
