import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Grid,
  Card,
  Chip,
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useTheme,
  alpha
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  Timer as TimerIcon,
  FilePresent as FilePresentIcon,
  Send as SendIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';

interface SiswaContentItem {
  id: string;
  judul: string;
  mapel: string;
  guru: string;
  tipe: 'Materi' | 'Tugas';
  format: string;
  tanggalUpload: string;
  deadline?: string;
  statusKumpul?: 'Belum Mengumpulkan' | 'Sudah Dikumpulkan';
  nilai?: number;
  isNew?: boolean;
  deskripsi: string;
}

export default function SiswaMateriTugas() {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const [activeTab, setActiveTab] = useState(0);

  const [items, setItems] = useState<SiswaContentItem[]>([
    {
      id: 'it-1',
      judul: 'Tugas Praktik 01: Implementasi Array & Looping Javascript',
      mapel: 'Pemrograman Web',
      guru: 'Siti Nurhaliza, S.Pd',
      tipe: 'Tugas',
      format: 'Tugas Koding (ZIP / Link Github)',
      tanggalUpload: '25 Sep 2026',
      deadline: 'Besok, 23:59 WIB',
      statusKumpul: 'Belum Mengumpulkan',
      isNew: true,
      deskripsi: 'Buatlah program sederhana untuk mengelola daftar belanja menggunakan Array of Objects dengan operasi tambah, hapus, dan hitung total harga.'
    },
    {
      id: 'it-2',
      judul: 'Modul 01: Pengantar Algoritma dan Pemrograman Modern',
      mapel: 'Informatika',
      guru: 'Budi Hartono, M.Kom',
      tipe: 'Materi',
      format: 'PDF (2.4 MB)',
      tanggalUpload: '24 Sep 2026',
      isNew: true,
      deskripsi: 'Materi dasar logika berpikir komputasional, algoritma pseudocode, dan flowchart standar ISO untuk siswa kelas X.'
    },
    {
      id: 'it-3',
      judul: 'Slide Presentasi: Relasi Database & Normalisasi 1NF-3NF',
      mapel: 'Basis Data',
      guru: 'Rahmat Pratama, M.T',
      tipe: 'Materi',
      format: 'PPTX (5.1 MB)',
      tanggalUpload: '22 Sep 2026',
      isNew: false,
      deskripsi: 'Penjelasan detail mengenai Primary Key, Foreign Key, dan teknik normalisasi tabel agar tidak terjadi redundansi data.'
    },
    {
      id: 'it-4',
      judul: 'Tugas Analisis Kasus: Etika Penggunaan Kecerdasan Buatan',
      mapel: 'Pendidikan Pancasila',
      guru: 'Drs. Hendro Wibowo',
      tipe: 'Tugas',
      format: 'Esai PDF (Maks 3 Halaman)',
      tanggalUpload: '20 Sep 2026',
      deadline: '30 Sep 2026, 17:00 WIB',
      statusKumpul: 'Sudah Dikumpulkan',
      nilai: 92,
      isNew: false,
      deskripsi: 'Buat esai refleksi kritis mengenai dampak etis pemanfaatan Generative AI dalam kehidupan sosial masyarakat Indonesia.'
    }
  ]);

  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<SiswaContentItem | null>(null);
  const [submissionLink, setSubmissionLink] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');

  const handleOpenSubmit = (item: SiswaContentItem) => {
    setSelectedTask(item);
    setSubmissionLink('');
    setSubmissionNotes('');
    setSubmitModalOpen(true);
  };

  const handleSubmitTask = () => {
    if (!selectedTask) return;
    setItems(items.map(it => it.id === selectedTask.id ? { ...it, statusKumpul: 'Sudah Dikumpulkan' } : it));
    toast.success(`Tugas "${selectedTask.judul}" berhasil dikumpulkan ke Guru!`);
    setSubmitModalOpen(false);
  };

  const filteredItems = items.filter(it => {
    if (activeTab === 1) return it.tipe === 'Materi';
    if (activeTab === 2) return it.tipe === 'Tugas';
    return true;
  });

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* HEADER SECTION */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 3,
          mb: 3,
          bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
          border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: -0.3 }}>
              Materi Pembelajaran & Tugas Siswa
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Unduh modul belajar mandiri, pelajari materi digital, dan kumpulkan tugas sebelum batas waktu
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label="2 Materi Baru"
              color="info"
              sx={{ fontWeight: 700, borderRadius: 1.5 }}
            />
            <Chip
              label="1 Tugas Menunggu"
              color="error"
              sx={{ fontWeight: 700, borderRadius: 1.5 }}
            />
          </Box>
        </Box>
      </Paper>

      {/* FILTER TABS */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`,
          bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
          mb: 3,
          overflow: 'hidden'
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          sx={{
            px: 2,
            pt: 1,
            borderBottom: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0'}`,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 800,
              fontSize: '0.92rem',
              py: 1.5
            }
          }}
        >
          <Tab label="Semua Aktivitas" />
          <Tab label="Materi & Modul" />
          <Tab label="Tugas & Projek" />
        </Tabs>
      </Paper>

      {/* CARDS LIST */}
      <Grid container spacing={2.5}>
        {filteredItems.map((item) => (
          <Grid size={{ xs: 12, md: 6 }} key={item.id}>
            <Card
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
                border: `1px solid ${
                  item.isNew
                    ? (isDarkMode ? 'rgba(59, 130, 246, 0.4)' : alpha(theme.palette.primary.main, 0.35))
                    : (isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0')
                }`,
                boxShadow: item.isNew
                  ? `0 4px 20px ${alpha(theme.palette.primary.main, 0.12)}`
                  : 'none',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Chip
                      label={item.mapel}
                      size="small"
                      color="primary"
                      sx={{ fontWeight: 800, borderRadius: 1.5 }}
                    />
                    <Chip
                      label={item.tipe}
                      size="small"
                      variant="outlined"
                      color={item.tipe === 'Tugas' ? 'warning' : 'info'}
                      sx={{ fontWeight: 700, borderRadius: 1.5 }}
                    />
                  </Box>

                  {/* NOTIFICATION 'BARU' BADGE */}
                  {item.isNew && (
                    <Chip
                      label="BARU"
                      size="small"
                      sx={{
                        fontWeight: 900,
                        fontSize: '10px',
                        letterSpacing: 0.5,
                        borderRadius: 1.5,
                        bgcolor: '#ef4444',
                        color: '#ffffff',
                        boxShadow: '0 0 10px rgba(239, 68, 68, 0.6)'
                      }}
                    />
                  )}
                </Box>

                <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.3, mb: 1 }}>
                  {item.judul}
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.86rem', lineHeight: 1.5 }}>
                  {item.deskripsi}
                </Typography>

                <Divider sx={{ my: 1.5 }} />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                  <Typography variant="caption" color="text.secondary">
                    Guru Pengampu: <b>{item.guru}</b>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Format: <b>{item.format}</b> • Diunggah: {item.tanggalUpload}
                  </Typography>
                  {item.deadline && (
                    <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TimerIcon fontSize="inherit" /> Batas Pengumpulan: {item.deadline}
                    </Typography>
                  )}
                </Box>
              </Box>

              <Box sx={{ mt: 2.5, pt: 1.5, borderTop: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}` }}>
                {item.tipe === 'Materi' ? (
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<DownloadIcon />}
                    onClick={() => toast.success(`Mengunduh materi: ${item.judul}`)}
                    sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
                  >
                    Buka / Unduh Modul Materi
                  </Button>
                ) : (
                  <Box sx={{ width: '100%' }}>
                    {item.statusKumpul === 'Sudah Dikumpulkan' ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <Chip
                          icon={<CheckCircleIcon />}
                          label="Sudah Dikumpulkan"
                          color="success"
                          sx={{ fontWeight: 800, borderRadius: 2 }}
                        />
                        {item.nilai !== undefined && (
                          <Chip
                            label={`Nilai: ${item.nilai} (A)`}
                            color="primary"
                            sx={{ fontWeight: 900, borderRadius: 2 }}
                          />
                        )}
                      </Box>
                    ) : (
                      <Button
                        variant="contained"
                        color="error"
                        fullWidth
                        startIcon={<CloudUploadIcon />}
                        onClick={() => handleOpenSubmit(item)}
                        sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
                      >
                        Kumpulkan Tugas Sekarang
                      </Button>
                    )}
                  </Box>
                )}
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* DIALOG MODAL KUMPULKAN TUGAS */}
      <Dialog open={submitModalOpen} onClose={() => setSubmitModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Pengumpulan Tugas Siswa
        </DialogTitle>
        <DialogContent dividers>
          {selectedTask && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: isDarkMode ? 'rgba(15, 23, 42, 0.5)' : '#f8fafc' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  {selectedTask.judul}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedTask.mapel} • {selectedTask.guru}
                </Typography>
              </Box>

              <TextField
                label="Tautan Berkas Tugas (Google Drive / GitHub / URL Dokumen)"
                fullWidth
                size="small"
                placeholder="https://drive.google.com/... atau https://github.com/..."
                value={submissionLink}
                onChange={(e) => setSubmissionLink(e.target.value)}
              />

              <Box
                sx={{
                  p: 3,
                  border: '2px dashed #94a3b8',
                  borderRadius: 2.5,
                  textAlign: 'center',
                  cursor: 'pointer',
                  bgcolor: isDarkMode ? 'rgba(255,255,255,0.02)' : '#f8fafc'
                }}
                onClick={() => toast.success('Pilih file tugas dari penyimpanan perangkat...')}
              >
                <FilePresentIcon sx={{ fontSize: 36, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Unggah File Langsung (PDF, ZIP, DOCX)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Ukuran maksimal berkas: 25 MB
                </Typography>
              </Box>

              <TextField
                label="Catatan untuk Guru (Opsional)"
                fullWidth
                multiline
                rows={2}
                size="small"
                placeholder="Tuliskan catatan tambahan terkait pengerjaan tugas ini..."
                value={submissionNotes}
                onChange={(e) => setSubmissionNotes(e.target.value)}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setSubmitModalOpen(false)} sx={{ fontWeight: 600 }}>
            Batal
          </Button>
          <Button variant="contained" color="primary" onClick={handleSubmitTask} endIcon={<SendIcon />} sx={{ fontWeight: 700 }}>
            Kirimkan Tugas
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
