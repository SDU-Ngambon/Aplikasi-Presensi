import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Chip,
  Tooltip,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import DescriptionIcon from '@mui/icons-material/Description';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useAppTheme } from '../../contexts/ThemeModeContext';

interface DocumentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  fileName?: string;
  fileUrl?: string | null;
  fileType?: string;
  statusBadge?: string;
}

export default function DocumentPreviewModal({
  open,
  onClose,
  title = 'Pratinjau Dokumen Perangkat Ajar',
  fileName = 'Dokumen',
  fileUrl,
  fileType,
  statusBadge
}: DocumentPreviewModalProps) {
  const { preset, isDark } = useAppTheme();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (!open) return null;

  // Convert URLs for optimal iframe preview
  const getEmbedUrl = (url: string | null | undefined): string => {
    if (!url) return '';
    
    // If it's a Google Drive preview or view URL
    if (url.includes('drive.google.com')) {
      if (url.includes('/view')) {
        return url.replace(/\/view(\?.*)?$/, '/preview');
      }
      if (url.includes('id=')) {
        const idMatch = url.match(/id=([a-zA-Z0-9_-]+)/);
        if (idMatch && idMatch[1]) {
          return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
        }
      }
    }

    // If it's an office document or external file that needs Google Docs Viewer
    const lower = url.toLowerCase();
    const isOfficeDoc = lower.endsWith('.docx') || lower.endsWith('.doc') || 
                        lower.endsWith('.xlsx') || lower.endsWith('.xls') || 
                        lower.endsWith('.pptx') || lower.endsWith('.ppt');

    if (isOfficeDoc && !url.includes('docs.google.com/viewer')) {
      const fullUrl = url.startsWith('http') ? url : window.location.origin + url;
      return `https://docs.google.com/viewer?url=${encodeURIComponent(fullUrl)}&embedded=true`;
    }

    return url;
  };

  const previewUrl = getEmbedUrl(fileUrl);
  const isImage = fileUrl && (/\.(jpg|jpeg|png|gif|webp|svg)($|\?)/i.test(fileUrl));

  const handleDownload = () => {
    if (!fileUrl) return;
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName || 'dokumen';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isFullscreen}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: isFullscreen ? 0 : 3,
            height: isFullscreen ? '100vh' : '88vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }
        }
      }}
    >
      {/* Dialog Header */}
      <DialogTitle
        sx={{
          p: 2,
          bgcolor: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <DescriptionIcon sx={{ color: '#38bdf8', fontSize: 28 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 800, color: '#f8fafc', lineHeight: 1.2 }}>
              {title}
            </Typography>
            <Typography variant="caption" noWrap sx={{ color: '#94a3b8', display: 'block' }}>
              {fileName}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {statusBadge && (
            <Chip
              label={statusBadge}
              size="small"
              sx={{
                bgcolor: 'rgba(56, 189, 248, 0.2)',
                color: '#38bdf8',
                fontWeight: 700,
                border: '1px solid rgba(56, 189, 248, 0.4)'
              }}
            />
          )}
          <Tooltip title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}>
            <IconButton
              size="small"
              onClick={() => setIsFullscreen(!isFullscreen)}
              sx={{ color: '#94a3b8', '&:hover': { color: '#ffffff' } }}
            >
              {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Tutup">
            <IconButton
              size="small"
              onClick={onClose}
              sx={{ color: '#94a3b8', '&:hover': { color: '#ffffff' } }}
            >
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>

      {/* Dialog Body / In-App Viewer */}
      <DialogContent sx={{ p: 0, flex: 1, bgcolor: '#f1f5f9', position: 'relative', overflow: 'hidden' }}>
        {!fileUrl ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', p: 4, textAlign: 'center' }}>
            <DescriptionIcon sx={{ fontSize: 64, color: '#94a3b8', mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#334155' }}>
              Tautan Dokumen Tidak Tersedia
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 400 }}>
              Berkas belum diunggah atau tautan penyimpanan dokumen tidak ditemukan.
            </Typography>
          </Box>
        ) : isImage ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 2, overflow: 'auto', bgcolor: '#1e293b' }}>
            <Box
              component="img"
              src={fileUrl}
              alt={fileName}
              sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 1.5, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
            />
          </Box>
        ) : (
          <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
            {isLoading && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: '#ffffff',
                  zIndex: 2
                }}
              >
                <CircularProgress size={40} thickness={4} />
                <Typography variant="body2" sx={{ mt: 2, fontWeight: 700, color: '#64748b' }}>
                  Memuat pratinjau dokumen...
                </Typography>
              </Box>
            )}
            <iframe
              src={previewUrl}
              title={fileName}
              width="100%"
              height="100%"
              style={{ border: 'none', display: 'block', backgroundColor: '#ffffff' }}
              onLoad={() => setIsLoading(false)}
              allow="autoplay"
            />
          </Box>
        )}
      </DialogContent>

      {/* Dialog Footer Actions */}
      <DialogActions sx={{ p: 1.5, bgcolor: isDark ? 'rgba(15, 23, 42, 0.95)' : '#f8fafc', borderTop: `1px solid ${preset.glassBorder}`, justifyContent: 'space-between' }}>
        <Typography variant="caption" sx={{ color: preset.textColorSecondary, pl: 1 }}>
          In-App Document Viewer • Tetap berada di halaman aplikasi
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {fileUrl && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={handleDownload}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Unduh Berkas
            </Button>
          )}
          <Button
            variant="contained"
            size="small"
            onClick={onClose}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Tutup Pratinjau
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
