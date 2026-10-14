import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  TextField,
  MenuItem,
  Button,
  Chip,
  Stack,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  useTheme,
  alpha
} from '@mui/material';
import {
  AutoAwesome as SparklesIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  School as SchoolIcon,
  Psychology as PsychologyIcon
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

interface GuruGeneratorSoalProps {
  currentUser: any;
  onNavigateToBankSoal?: () => void;
}

export default function GuruGeneratorSoal({ currentUser, onNavigateToBankSoal }: GuruGeneratorSoalProps) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedList, setGeneratedList] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    mapel: currentUser?.subject || 'Informatika',
    kelas: 'X RPL',
    cakupan_materi: 'Logika Algoritma, Percabangan Kondisional, dan Perulangan Loop',
    kisi_kisi: 'Siswa dapat menganalisis alur program, menentukan output logika if-else, dan menyelesaikan kasus perulangan terstruktur',
    jenis_soal: 'PILIHAN_GANDA' as 'PILIHAN_GANDA' | 'ESSAY',
    jumlah_soal: 5,
    tingkat_kesulitan: 'SEDANG' as 'MUDAH' | 'SEDANG' | 'SULIT'
  });

  const teacherId = currentUser?.teacher_id || currentUser?.id || '';

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cakupan_materi.trim()) {
      toast.error('Cakupan materi wajib diisi');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/lms/generate-soal', {
        ...formData,
        teacher_id: teacherId
      });

      if (res.data && res.data.success && Array.isArray(res.data.soal)) {
        setGeneratedList(res.data.soal);
        toast.success(`Berhasil membuat ${res.data.soal.length} butir soal ${formData.jenis_soal === 'PILIHAN_GANDA' ? 'Pilihan Ganda' : 'Essay'}!`);
      } else {
        toast.error('Gagal menghasilkan soal');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Gagal memproses pembuatan soal AI');
    } finally {
      setLoading(false);
    }
  };

  const handleSendToBankSoal = async () => {
    if (generatedList.length === 0) {
      toast.error('Tidak ada butir soal untuk dikirim');
      return;
    }

    setSaving(true);
    try {
      const payload = generatedList.map(item => ({
        teacher_id: teacherId,
        mapel: formData.mapel,
        cakupan_materi: formData.cakupan_materi,
        kisi_kisi: formData.kisi_kisi,
        jenis_soal: item.jenis_soal || formData.jenis_soal,
        pertanyaan: item.pertanyaan,
        opsi_jawaban: item.opsi_jawaban || [],
        kunci_jawaban: item.kunci_jawaban || '',
        pembahasan: item.pembahasan || '',
        tingkat_kesulitan: item.tingkat_kesulitan || formData.tingkat_kesulitan,
        sumber: 'AI_GENERATOR'
      }));

      const res = await axios.post('/api/lms/bank-soal/bulk', { items: payload });
      toast.success(`${payload.length} butir soal berhasil disimpan ke Bank Soal!`);
      if (onNavigateToBankSoal) {
        onNavigateToBankSoal();
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Gagal menyimpan ke Bank Soal');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveQuestion = (index: number) => {
    setGeneratedList(prev => prev.filter((_, i) => i !== index));
    toast.success('Soal dihapus dari pratinjau');
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Banner Intro */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3 },
          mb: 3,
          borderRadius: 3.5,
          background: isDarkMode
            ? 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)'
            : 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: isDarkMode ? '0 10px 25px rgba(0,0,0,0.4)' : '0 10px 25px rgba(79, 70, 229, 0.25)'
        }}
      >
        <Chip
          icon={<SparklesIcon sx={{ fontSize: '15px !important', color: '#fef08a' }} />}
          label="INTEGRASI AI GENERATOR SOAL"
          size="small"
          sx={{
            bgcolor: 'rgba(255,255,255,0.2)',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '0.72rem',
            mb: 1.5,
            backdropFilter: 'blur(6px)'
          }}
        />
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.02em' }}>
          Generator Soal Ujian Otomatis Berbasis AI
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9, maxWidth: 820, lineHeight: 1.6 }}>
          Buat butir soal ujian (Pilihan Ganda dengan 5 opsi atau Uraian Essay) secara cerdas dan relevan dengan memasukkan cakupan materi serta kisi-kisi pembelajaran. Hasil generate dapat ditelaah langsung dan dikirim dalam satu klik ke <strong>Bank Soal</strong>.
        </Typography>
      </Paper>

      <Grid container spacing={3}>
        {/* Left Side: Generator Form */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper
            elevation={0}
            component="form"
            onSubmit={handleGenerate}
            sx={{
              p: 3,
              borderRadius: 3.5,
              bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
              border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 2.2
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, color: isDarkMode ? '#f8fafc' : '#0f172a', display: 'flex', alignItems: 'center', gap: 1 }}>
              <PsychologyIcon sx={{ color: theme.palette.primary.main }} />
              Parameter Pembuatan Soal
            </Typography>

            <Grid container spacing={2}>
              <Grid size={{ xs: 7 }}>
                <TextField
                  label="Mata Pelajaran"
                  fullWidth
                  size="small"
                  required
                  value={formData.mapel}
                  onChange={(e) => setFormData({ ...formData, mapel: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 5 }}>
                <TextField
                  label="Kelas / Tingkat"
                  fullWidth
                  size="small"
                  value={formData.kelas}
                  onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                />
              </Grid>
            </Grid>

            <TextField
              label="Cakupan Materi"
              multiline
              rows={3}
              fullWidth
              required
              value={formData.cakupan_materi}
              onChange={(e) => setFormData({ ...formData, cakupan_materi: e.target.value })}
              placeholder="Contoh: Logika Algoritma, Konsep Array, Fungsi Rekursif, Penggunaan Looping For/While..."
              helperText="Tuliskan topik bahasan materi yang ingin diujikan"
            />

            <TextField
              label="Kisi-Kisi & Indikator Soal"
              multiline
              rows={3}
              fullWidth
              value={formData.kisi_kisi}
              onChange={(e) => setFormData({ ...formData, kisi_kisi: e.target.value })}
              placeholder="Contoh: Siswa mampu menganalisis alur logika percabangan if-else majemuk dan menentukan output program..."
              helperText="Indikator ketercapaian tujuan pembelajaran"
            />

            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  select
                  label="Jenis Soal"
                  fullWidth
                  size="small"
                  value={formData.jenis_soal}
                  onChange={(e) => setFormData({ ...formData, jenis_soal: e.target.value as any })}
                >
                  <MenuItem value="PILIHAN_GANDA">Pilihan Ganda (A-E)</MenuItem>
                  <MenuItem value="ESSAY">Uraian / Essay</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  select
                  label="Jumlah Soal"
                  fullWidth
                  size="small"
                  value={formData.jumlah_soal}
                  onChange={(e) => setFormData({ ...formData, jumlah_soal: Number(e.target.value) })}
                >
                  <MenuItem value={3}>3 Butir Soal</MenuItem>
                  <MenuItem value={5}>5 Butir Soal</MenuItem>
                  <MenuItem value={10}>10 Butir Soal</MenuItem>
                  <MenuItem value={15}>15 Butir Soal</MenuItem>
                </TextField>
              </Grid>
            </Grid>

            <TextField
              select
              label="Tingkat Kesulitan"
              fullWidth
              size="small"
              value={formData.tingkat_kesulitan}
              onChange={(e) => setFormData({ ...formData, tingkat_kesulitan: e.target.value as any })}
            >
              <MenuItem value="MUDAH">Mudah (C1 - C2: Mengingat & Memahami)</MenuItem>
              <MenuItem value="SEDANG">Sedang (C3 - C4: Mengaplikasikan & Menganalisis)</MenuItem>
              <MenuItem value="SULIT">Sulit / HOTS (C5 - C6: Mengevaluasi & Mencipta)</MenuItem>
            </TextField>

            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SparklesIcon />}
              sx={{
                mt: 1,
                py: 1.3,
                borderRadius: 2.5,
                fontWeight: 800,
                textTransform: 'none',
                background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)'
              }}
            >
              {loading ? 'Sedang Memproses AI...' : 'Generate Soal Sekarang'}
            </Button>
          </Paper>
        </Grid>

        {/* Right Side: Generated Questions Preview */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3.5,
              bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
              border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
              minHeight: 480,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
                  Pratinjau Hasil Soal ({generatedList.length})
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Telaah hasil pembuatan soal AI sebelum dikirim ke repositori Bank Soal
                </Typography>
              </Box>

              {generatedList.length > 0 && (
                <Button
                  variant="contained"
                  color="success"
                  disabled={saving}
                  onClick={handleSendToBankSoal}
                  startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SendIcon sx={{ fontSize: 16 }} />}
                  sx={{ borderRadius: 2.5, fontWeight: 700, textTransform: 'none', px: 2 }}
                >
                  {saving ? 'Menyimpan...' : 'Kirim Langsung ke Bank Soal'}
                </Button>
              )}
            </Box>

            <Divider sx={{ mb: 2.5, borderColor: isDarkMode ? '#334155' : '#f1f5f9' }} />

            {loading ? (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8 }}>
                <CircularProgress size={44} sx={{ mb: 2, color: '#4f46e5' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
                  AI Sedang Merumuskan Butir Soal...
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, maxWidth: 380, textAlign: 'center' }}>
                  Menyelaraskan dengan kurikulum merdeka, tingkat kesulitan {formData.tingkat_kesulitan}, dan kisi-kisi materi.
                </Typography>
              </Box>
            ) : generatedList.length === 0 ? (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8 }}>
                <SparklesIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.4, mb: 1.5 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
                  Belum Ada Soal Yang Di-generate
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 360, textAlign: 'center', mt: 0.5 }}>
                  Isi formulir parameter di sebelah kiri lalu klik tombol "Generate Soal Sekarang" untuk memicu pembuatan soal otomatis.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2.5}>
                {generatedList.map((item, idx) => (
                  <Card
                    key={idx}
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 2.5,
                      bgcolor: isDarkMode ? '#0f172a' : '#f8fafc',
                      border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                      position: 'relative'
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Chip
                          label={`Nomor ${idx + 1}`}
                          size="small"
                          color="primary"
                          sx={{ fontWeight: 800, fontSize: '0.72rem', height: 22 }}
                        />
                        <Chip
                          label={item.jenis_soal || formData.jenis_soal}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 700, fontSize: '0.68rem', height: 22 }}
                        />
                        <Chip
                          label={item.tingkat_kesulitan || formData.tingkat_kesulitan}
                          size="small"
                          sx={{ fontWeight: 700, fontSize: '0.68rem', height: 22, bgcolor: isDarkMode ? '#334155' : '#e2e8f0' }}
                        />
                      </Stack>
                      <IconButton size="small" color="error" onClick={() => handleRemoveQuestion(idx)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    <Typography variant="body1" sx={{ fontWeight: 700, color: isDarkMode ? '#f8fafc' : '#0f172a', mb: 2, lineHeight: 1.5 }}>
                      {item.pertanyaan}
                    </Typography>

                    {item.opsi_jawaban && item.opsi_jawaban.length > 0 && (
                      <Stack spacing={0.8} sx={{ mb: 2 }}>
                        {item.opsi_jawaban.map((op: any, oIdx: number) => {
                          const isCorrect = item.kunci_jawaban === op.key;
                          return (
                            <Box
                              key={oIdx}
                              sx={{
                                p: 1,
                                px: 1.5,
                                borderRadius: 1.5,
                                bgcolor: isCorrect
                                  ? (isDarkMode ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7')
                                  : (isDarkMode ? '#1e293b' : '#ffffff'),
                                border: `1px solid ${isCorrect ? '#22c55e' : (isDarkMode ? '#334155' : '#e2e8f0')}`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                              }}
                            >
                              <Typography sx={{ fontWeight: 800, width: 22, color: isCorrect ? '#16a34a' : 'text.secondary' }}>
                                {op.key}.
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: isCorrect ? 700 : 500, color: isCorrect ? (isDarkMode ? '#86efac' : '#15803d') : 'text.primary' }}>
                                {op.text}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Stack>
                    )}

                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDarkMode ? '#1e293b' : '#f1f5f9', borderLeft: '3px solid #10b981' }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: '#10b981', display: 'block', mb: 0.3 }}>
                        KUNCI JAWABAN & PEMBAHASAN:
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.85rem', color: isDarkMode ? '#cbd5e1' : '#334155' }}>
                        <strong>Kunci: {item.kunci_jawaban}</strong> — {item.pembahasan || 'Sesuai dengan analisis konsep dasar pada materi ini.'}
                      </Typography>
                    </Box>
                  </Card>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
