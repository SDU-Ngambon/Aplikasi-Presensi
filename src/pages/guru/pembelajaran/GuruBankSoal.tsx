import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  Divider,
  CircularProgress,
  Alert,
  Tooltip,
  useTheme,
  alpha
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  FileUpload as ImportIcon,
  Search as SearchIcon,
  Description as WordIcon,
  AutoAwesome as SparklesIcon,
  HelpOutlined as QuestionIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

interface GuruBankSoalProps {
  currentUser: any;
  onNavigateToGenerator?: () => void;
}

interface BankSoalItem {
  id: string;
  teacher_id: string;
  mapel: string;
  cakupan_materi?: string;
  kisi_kisi?: string;
  jenis_soal: 'PILIHAN_GANDA' | 'ESSAY';
  pertanyaan: string;
  opsi_jawaban?: { key: string; text: string }[];
  kunci_jawaban?: string;
  pembahasan?: string;
  tingkat_kesulitan?: 'MUDAH' | 'SEDANG' | 'SULIT';
  sumber: 'AI_GENERATOR' | 'IMPORT_WORD' | 'MANUAL';
  created_at: string;
}

export default function GuruBankSoal({ currentUser, onNavigateToGenerator }: GuruBankSoalProps) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [soalList, setSoalList] = useState<BankSoalItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterJenis, setFilterJenis] = useState('SEMUA');
  const [filterSumber, setFilterSumber] = useState('SEMUA');

  // Import Word Dialog
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [wordText, setWordText] = useState('');
  const [importMapel, setImportMapel] = useState(currentUser?.subject || 'Informatika');
  const [parsedPreview, setParsedPreview] = useState<any[]>([]);

  // Manual Add/Edit Dialog
  const [openManualDialog, setOpenManualDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<BankSoalItem | null>(null);
  const [manualForm, setManualForm] = useState({
    mapel: currentUser?.subject || 'Informatika',
    cakupan_materi: '',
    jenis_soal: 'PILIHAN_GANDA' as 'PILIHAN_GANDA' | 'ESSAY',
    pertanyaan: '',
    opsi_a: '',
    opsi_b: '',
    opsi_c: '',
    opsi_d: '',
    opsi_e: '',
    kunci_jawaban: 'A',
    pembahasan: '',
    tingkat_kesulitan: 'SEDANG' as 'MUDAH' | 'SEDANG' | 'SULIT'
  });

  const teacherId = currentUser?.teacher_id || currentUser?.id || '';

  useEffect(() => {
    fetchBankSoal();
  }, [teacherId]);

  const fetchBankSoal = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/lms/bank-soal', {
        params: { teacher_id: teacherId }
      });
      const data: BankSoalItem[] = Array.isArray(res.data) ? res.data : [];

      if (data.length === 0) {
        // Seed default initial questions for demonstration
        const sampleQuestions: BankSoalItem[] = [
          {
            id: 'soal-sample-1',
            teacher_id: teacherId,
            mapel: currentUser?.subject || 'Informatika',
            cakupan_materi: 'Algoritma & Pemrograman',
            jenis_soal: 'PILIHAN_GANDA',
            pertanyaan: 'Dalam struktur data berarah (directed graph), jalur yang dimulai dan diakhiri pada simpul (vertex) yang sama tanpa perulangan simpul perantara disebut...',
            opsi_jawaban: [
              { key: 'A', text: 'Cycle / Siklus Tertutup' },
              { key: 'B', text: 'Spanning Tree' },
              { key: 'C', text: 'Adjacency Matrix' },
              { key: 'D', text: 'Bipartite Set' },
              { key: 'E', text: 'Topological Sequence' }
            ],
            kunci_jawaban: 'A',
            pembahasan: 'Cycle atau siklus adalah lintasan tertutup dalam graph di mana vertex awal sama dengan vertex akhir.',
            tingkat_kesulitan: 'SEDANG',
            sumber: 'AI_GENERATOR',
            created_at: new Date().toISOString()
          },
          {
            id: 'soal-sample-2',
            teacher_id: teacherId,
            mapel: currentUser?.subject || 'Informatika',
            cakupan_materi: 'Keamanan Jaringan',
            jenis_soal: 'PILIHAN_GANDA',
            pertanyaan: 'Protokol keamanan yang menggunakan enkripsi asimetris untuk otentikasi kunci publik dan enkripsi simetris untuk transmisi data sesi web adalah...',
            opsi_jawaban: [
              { key: 'A', text: 'TLS / SSL (HTTPS)' },
              { key: 'B', text: 'FTP Standar' },
              { key: 'C', text: 'Telnet Port 23' },
              { key: 'D', text: 'HTTP Plaintext' },
              { key: 'E', text: 'SNMPv1' }
            ],
            kunci_jawaban: 'A',
            pembahasan: 'TLS/SSL menggabungkan enkripsi asimetris pada fase handshake dan enkripsi simetris untuk kecepatan transfer data.',
            tingkat_kesulitan: 'SEDANG',
            sumber: 'AI_GENERATOR',
            created_at: new Date().toISOString()
          },
          {
            id: 'soal-sample-3',
            teacher_id: teacherId,
            mapel: currentUser?.subject || 'Informatika',
            cakupan_materi: 'Pemrograman Berorientasi Objek',
            jenis_soal: 'ESSAY',
            pertanyaan: 'Jelaskan perbedaan mendasar antara konsep "Overloading" dan "Overriding" pada pemrograman berorientasi objek (OOP) beserta contoh penerapannya!',
            opsi_jawaban: [],
            kunci_jawaban: 'Overloading: Method dengan nama sama pada class yang sama namun parameter berbeda. Overriding: Pendefinisian ulang method class induk pada class turunan.',
            pembahasan: 'Penilaian menekankan pemahaman signature method, inheritance, dan waktu resolusi (compile time vs runtime).',
            tingkat_kesulitan: 'SULIT',
            sumber: 'IMPORT_WORD',
            created_at: new Date().toISOString()
          }
        ];
        setSoalList(sampleQuestions);
      } else {
        setSoalList(data);
      }
    } catch (e) {
      console.error(e);
      toast.error('Gagal memuat bank soal');
    } finally {
      setLoading(false);
    }
  };

  // Structured Word Text Parser
  const parseWordDocumentText = (rawText: string) => {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed: any[] = [];
    let currentSoal: any = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match question start: "1.", "1)", "[1]", "Soal 1:"
      const qMatch = line.match(/^(\d+)[\.\)]\s*(.+)/i) || line.match(/^Soal\s*\d+[\.\:]\s*(.+)/i);
      if (qMatch) {
        if (currentSoal && currentSoal.pertanyaan) {
          parsed.push(currentSoal);
        }
        currentSoal = {
          pertanyaan: qMatch[1] && !line.startsWith('Soal') ? qMatch[2] : line.replace(/^Soal\s*\d+[\.\:]\s*/i, ''),
          opsi_jawaban: [],
          kunci_jawaban: '',
          pembahasan: '',
          jenis_soal: 'PILIHAN_GANDA',
          tingkat_kesulitan: 'SEDANG',
          sumber: 'IMPORT_WORD'
        };
        continue;
      }

      // Match option: "A.", "A)", "a."
      const optMatch = line.match(/^([A-E])[\.\)]\s*(.+)/i);
      if (optMatch && currentSoal) {
        currentSoal.opsi_jawaban.push({
          key: optMatch[1].toUpperCase(),
          text: optMatch[2]
        });
        continue;
      }

      // Match Answer Key: "Kunci: A" or "Jawaban: B"
      const keyMatch = line.match(/^(?:Kunci|Jawaban|Kunci Jawaban)[\:\s]+([A-Ea-e])/i);
      if (keyMatch && currentSoal) {
        currentSoal.kunci_jawaban = keyMatch[1].toUpperCase();
        continue;
      }

      // Match Explanation: "Pembahasan: ..."
      const pembMatch = line.match(/^(?:Pembahasan|Penjelasan)[\:\s]+(.+)/i);
      if (pembMatch && currentSoal) {
        currentSoal.pembahasan = pembMatch[1];
        continue;
      }

      // If continuous question text
      if (currentSoal && currentSoal.opsi_jawaban.length === 0) {
        currentSoal.pertanyaan += ' ' + line;
      }
    }

    if (currentSoal && currentSoal.pertanyaan) {
      if (currentSoal.opsi_jawaban.length === 0) {
        currentSoal.jenis_soal = 'ESSAY';
      }
      parsed.push(currentSoal);
    }

    setParsedPreview(parsed);
  };

  const handleSaveImportedWord = async () => {
    if (parsedPreview.length === 0) {
      toast.error('Tidak ada butir soal yang berhasil diparsing');
      return;
    }

    try {
      const payload = parsedPreview.map(item => ({
        teacher_id: teacherId,
        mapel: importMapel,
        jenis_soal: item.jenis_soal || (item.opsi_jawaban?.length > 0 ? 'PILIHAN_GANDA' : 'ESSAY'),
        pertanyaan: item.pertanyaan,
        opsi_jawaban: item.opsi_jawaban || [],
        kunci_jawaban: item.kunci_jawaban || (item.opsi_jawaban?.length > 0 ? 'A' : ''),
        pembahasan: item.pembahasan || 'Diimpor dari dokumen Word terstruktur',
        tingkat_kesulitan: item.tingkat_kesulitan || 'SEDANG',
        sumber: 'IMPORT_WORD'
      }));

      await axios.post('/api/lms/bank-soal/bulk', { items: payload });
      toast.success(`Berhasil mengimpor ${payload.length} butir soal dari Word!`);
      setOpenImportDialog(false);
      setWordText('');
      setParsedPreview([]);
      fetchBankSoal();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Gagal menyimpan hasil impor soal');
    }
  };

  const handleOpenManualCreate = () => {
    setEditingItem(null);
    setManualForm({
      mapel: currentUser?.subject || 'Informatika',
      cakupan_materi: '',
      jenis_soal: 'PILIHAN_GANDA',
      pertanyaan: '',
      opsi_a: '',
      opsi_b: '',
      opsi_c: '',
      opsi_d: '',
      opsi_e: '',
      kunci_jawaban: 'A',
      pembahasan: '',
      tingkat_kesulitan: 'SEDANG'
    });
    setOpenManualDialog(true);
  };

  const handleOpenManualEdit = (item: BankSoalItem) => {
    setEditingItem(item);
    const getOpt = (k: string) => item.opsi_jawaban?.find(o => o.key === k)?.text || '';
    setManualForm({
      mapel: item.mapel,
      cakupan_materi: item.cakupan_materi || '',
      jenis_soal: item.jenis_soal,
      pertanyaan: item.pertanyaan,
      opsi_a: getOpt('A'),
      opsi_b: getOpt('B'),
      opsi_c: getOpt('C'),
      opsi_d: getOpt('D'),
      opsi_e: getOpt('E'),
      kunci_jawaban: item.kunci_jawaban || 'A',
      pembahasan: item.pembahasan || '',
      tingkat_kesulitan: item.tingkat_kesulitan || 'SEDANG'
    });
    setOpenManualDialog(true);
  };

  const handleSaveManual = async () => {
    if (!manualForm.pertanyaan.trim()) {
      toast.error('Pertanyaan soal wajib diisi');
      return;
    }

    try {
      const opsi_jawaban = manualForm.jenis_soal === 'PILIHAN_GANDA' ? [
        { key: 'A', text: manualForm.opsi_a },
        { key: 'B', text: manualForm.opsi_b },
        { key: 'C', text: manualForm.opsi_c },
        { key: 'D', text: manualForm.opsi_d },
        { key: 'E', text: manualForm.opsi_e }
      ].filter(o => o.text.trim() !== '') : [];

      const payload = {
        id: editingItem ? editingItem.id : undefined,
        teacher_id: teacherId,
        mapel: manualForm.mapel,
        cakupan_materi: manualForm.cakupan_materi,
        jenis_soal: manualForm.jenis_soal,
        pertanyaan: manualForm.pertanyaan,
        opsi_jawaban,
        kunci_jawaban: manualForm.kunci_jawaban,
        pembahasan: manualForm.pembahasan,
        tingkat_kesulitan: manualForm.tingkat_kesulitan,
        sumber: editingItem ? editingItem.sumber : 'MANUAL'
      };

      await axios.post('/api/lms/bank-soal', payload);
      toast.success(editingItem ? 'Soal berhasil diperbarui' : 'Soal berhasil ditambahkan ke Bank Soal');
      setOpenManualDialog(false);
      fetchBankSoal();
    } catch (e: any) {
      toast.error('Gagal menyimpan butir soal');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus soal ini dari Bank Soal?')) return;
    try {
      await axios.delete(`/api/lms/bank-soal/${id}`);
      toast.success('Soal berhasil dihapus');
      setSoalList(prev => prev.filter(s => s.id !== id));
    } catch (e: any) {
      toast.error('Gagal menghapus soal');
    }
  };

  const filteredList = soalList.filter(s => {
    const matchSearch = searchTerm === '' || 
      s.pertanyaan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.cakupan_materi && s.cakupan_materi.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchJenis = filterJenis === 'SEMUA' || s.jenis_soal === filterJenis;
    const matchSumber = filterSumber === 'SEMUA' || s.sumber === filterSumber;
    return matchSearch && matchJenis && matchSumber;
  });

  return (
    <Box sx={{ width: '100%' }}>
      {/* Top Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
            Repositori Bank Soal
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.3 }}>
            Pusat penyimpanan butir soal ujian dari hasil <strong>AI Generator</strong>, <strong>Import Word</strong>, maupun input manual.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<WordIcon />}
            onClick={() => {
              setWordText(`1. Protokol transport layer yang bersifat connection-oriented dan menjamin pengiriman paket data tanpa kehilangan adalah...
A. TCP (Transmission Control Protocol)
B. UDP (User Datagram Protocol)
C. ICMP
D. ARP
E. IP
Kunci: A
Pembahasan: TCP menjamin pengiriman data melalui mekanisme 3-way handshake dan acknowledgement.

2. Jelaskan fungsi dari subnet mask dalam konfigurasi IP addressing IPv4!
Kunci: Subnet mask memisahkan porsi Network ID dan Host ID.`);
              parseWordDocumentText(`1. Protokol transport layer yang bersifat connection-oriented dan menjamin pengiriman paket data tanpa kehilangan adalah...
A. TCP (Transmission Control Protocol)
B. UDP (User Datagram Protocol)
C. ICMP
D. ARP
E. IP
Kunci: A
Pembahasan: TCP menjamin pengiriman data melalui mekanisme 3-way handshake dan acknowledgement.

2. Jelaskan fungsi dari subnet mask dalam konfigurasi IP addressing IPv4!
Kunci: Subnet mask memisahkan porsi Network ID dan Host ID.`);
              setOpenImportDialog(true);
            }}
            sx={{ borderRadius: 2.5, fontWeight: 700, textTransform: 'none' }}
          >
            Import dari Word
          </Button>

          <Button
            variant="contained"
            color="secondary"
            startIcon={<SparklesIcon />}
            onClick={onNavigateToGenerator}
            sx={{ borderRadius: 2.5, fontWeight: 700, textTransform: 'none' }}
          >
            Generate AI
          </Button>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenManualCreate}
            sx={{ borderRadius: 2.5, fontWeight: 700, textTransform: 'none' }}
          >
            + Buat Manual
          </Button>
        </Stack>
      </Box>

      {/* Filter and Search Bar */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 3,
          bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
          border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2
        }}
      >
        <TextField
          size="small"
          placeholder="Cari pertanyaan soal atau cakupan materi..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          slotProps={{ input: { startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} /> } }}
          sx={{ minWidth: 280, flex: 1 }}
        />

        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <TextField
            select
            size="small"
            value={filterJenis}
            onChange={(e) => setFilterJenis(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="SEMUA">Semua Jenis</MenuItem>
            <MenuItem value="PILIHAN_GANDA">Pilihan Ganda</MenuItem>
            <MenuItem value="ESSAY">Uraian / Essay</MenuItem>
          </TextField>

          <TextField
            select
            size="small"
            value={filterSumber}
            onChange={(e) => setFilterSumber(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="SEMUA">Semua Sumber</MenuItem>
            <MenuItem value="AI_GENERATOR">Dari AI Generator</MenuItem>
            <MenuItem value="IMPORT_WORD">Dari Import Word</MenuItem>
            <MenuItem value="MANUAL">Input Manual</MenuItem>
          </TextField>

          <Tooltip title="Muat Ulang Soal">
            <IconButton onClick={fetchBankSoal}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>

      {/* Questions List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredList.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: 3.5,
            bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
            border: `1px dashed ${isDarkMode ? '#334155' : '#cbd5e1'}`
          }}
        >
          <QuestionIcon sx={{ fontSize: 52, color: 'text.secondary', mb: 1.5, opacity: 0.5 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
            Tidak Ada Soal Yang Sesuai
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Gunakan Generator AI atau fitur Import Word untuk menambahkan butir soal baru ke repositori Anda.
          </Typography>
          <Button variant="contained" onClick={onNavigateToGenerator} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
            Buka Generator Soal AI
          </Button>
        </Paper>
      ) : (
        <Stack spacing={2.5}>
          {filteredList.map((item, index) => (
            <Card
              key={item.id}
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
                border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: theme.palette.primary.main,
                  boxShadow: isDarkMode ? '0 8px 24px rgba(0,0,0,0.3)' : '0 8px 24px rgba(0,0,0,0.05)'
                }
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: theme.palette.primary.main }}>
                    #{index + 1}
                  </Typography>
                  <Chip
                    label={item.jenis_soal === 'PILIHAN_GANDA' ? 'Pilihan Ganda' : 'Essay / Uraian'}
                    size="small"
                    color={item.jenis_soal === 'PILIHAN_GANDA' ? 'primary' : 'secondary'}
                    sx={{ fontWeight: 800, fontSize: '0.7rem', height: 22 }}
                  />
                  <Chip
                    label={item.mapel}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 700, fontSize: '0.7rem', height: 22 }}
                  />
                  <Chip
                    label={item.sumber === 'AI_GENERATOR' ? 'AI Generator' : item.sumber === 'IMPORT_WORD' ? 'Import Word' : 'Manual'}
                    size="small"
                    icon={item.sumber === 'AI_GENERATOR' ? <SparklesIcon sx={{ fontSize: '13px !important' }} /> : <WordIcon sx={{ fontSize: '13px !important' }} />}
                    sx={{ fontWeight: 700, fontSize: '0.68rem', height: 22, bgcolor: isDarkMode ? '#0f172a' : '#f1f5f9' }}
                  />
                  <Chip
                    label={item.tingkat_kesulitan || 'SEDANG'}
                    size="small"
                    sx={{ fontWeight: 700, fontSize: '0.68rem', height: 20 }}
                  />
                </Stack>

                <Stack direction="row" spacing={0.5}>
                  <IconButton size="small" onClick={() => handleOpenManualEdit(item)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(item.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Box>

              <Typography variant="body1" sx={{ fontWeight: 700, color: isDarkMode ? '#f8fafc' : '#0f172a', mb: 2, lineHeight: 1.5 }}>
                {item.pertanyaan}
              </Typography>

              {item.opsi_jawaban && item.opsi_jawaban.length > 0 && (
                <Grid container spacing={1} sx={{ mb: 2 }}>
                  {item.opsi_jawaban.map((op, oIdx) => {
                    const isKey = item.kunci_jawaban === op.key;
                    return (
                      <Grid size={{ xs: 12, md: 6 }} key={oIdx}>
                        <Box
                          sx={{
                            p: 1.2,
                            px: 1.5,
                            borderRadius: 2,
                            bgcolor: isKey
                              ? (isDarkMode ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7')
                              : (isDarkMode ? '#0f172a' : '#f8fafc'),
                            border: `1px solid ${isKey ? '#22c55e' : (isDarkMode ? '#334155' : '#e2e8f0')}`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}
                        >
                          <Typography sx={{ fontWeight: 800, width: 22, color: isKey ? '#16a34a' : 'text.secondary' }}>
                            {op.key}.
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: isKey ? 700 : 500, color: isKey ? (isDarkMode ? '#86efac' : '#15803d') : 'text.primary' }}>
                            {op.text}
                          </Typography>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              )}

              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDarkMode ? '#0f172a' : '#f8fafc', borderLeft: '3px solid #10b981' }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#10b981', display: 'block' }}>
                  KUNCI JAWABAN: {item.kunci_jawaban}
                </Typography>
                {item.pembahasan && (
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.3 }}>
                    Pembahasan: {item.pembahasan}
                  </Typography>
                )}
              </Box>
            </Card>
          ))}
        </Stack>
      )}

      {/* Modal Dialog Import Word Terstruktur */}
      <Dialog
        open={openImportDialog}
        onClose={() => setOpenImportDialog(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WordIcon color="primary" />
          Import Soal dari Dokumen Word Terstruktur
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.2 }}>
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Tempelkan (Paste) naskah soal dari dokumen Word (.docx) Anda ke kolom di bawah ini. Sistem cerdas akan mengenali nomor soal, opsi A-E, kunci jawaban, dan pembahasan secara otomatis.
          </Alert>

          <TextField
            label="Mata Pelajaran Tujuan"
            fullWidth
            size="small"
            value={importMapel}
            onChange={(e) => setImportMapel(e.target.value)}
          />

          <TextField
            label="Naskah Dokumen Soal (Paste Di Sini)"
            multiline
            rows={8}
            fullWidth
            value={wordText}
            onChange={(e) => {
              setWordText(e.target.value);
              parseWordDocumentText(e.target.value);
            }}
            placeholder={`1. Pertanyaan soal pertama...
A. Pilihan jawaban A
B. Pilihan jawaban B
C. Pilihan jawaban C
D. Pilihan jawaban D
E. Pilihan jawaban E
Kunci: A
Pembahasan: Alasan jawaban benar...`}
          />

          <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: isDarkMode ? '#0f172a' : '#f8fafc', border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}` }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
              Hasil Deteksi Otomatis ({parsedPreview.length} Butir Soal Terdeteksi):
            </Typography>
            {parsedPreview.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                Tempelkan teks soal di atas untuk melihat pratinjau deteksi.
              </Typography>
            ) : (
              <Stack spacing={1} sx={{ maxHeight: 220, overflowY: 'auto' }}>
                {parsedPreview.map((p, pIdx) => (
                  <Box key={pIdx} sx={{ p: 1.2, borderRadius: 1.5, bgcolor: isDarkMode ? '#1e293b' : '#ffffff', border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}` }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {pIdx + 1}. {p.pertanyaan}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {p.opsi_jawaban.length > 0 ? `${p.opsi_jawaban.length} Opsi (Kunci: ${p.kunci_jawaban || 'A'})` : 'Soal Essay'}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenImportDialog(false)} color="inherit" sx={{ fontWeight: 600 }}>
            Batal
          </Button>
          <Button
            onClick={handleSaveImportedWord}
            variant="contained"
            disabled={parsedPreview.length === 0}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Simpan {parsedPreview.length} Soal ke Bank Soal
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Dialog Manual Add/Edit Soal */}
      <Dialog
        open={openManualDialog}
        onClose={() => setOpenManualDialog(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editingItem ? 'Edit Butir Soal' : 'Tambah Soal Manual'}
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <TextField
                label="Mata Pelajaran"
                fullWidth
                size="small"
                value={manualForm.mapel}
                onChange={(e) => setManualForm({ ...manualForm, mapel: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                select
                label="Jenis Soal"
                fullWidth
                size="small"
                value={manualForm.jenis_soal}
                onChange={(e) => setManualForm({ ...manualForm, jenis_soal: e.target.value as any })}
              >
                <MenuItem value="PILIHAN_GANDA">Pilihan Ganda (A-E)</MenuItem>
                <MenuItem value="ESSAY">Uraian / Essay</MenuItem>
              </TextField>
            </Grid>
          </Grid>

          <TextField
            label="Pertanyaan Soal"
            multiline
            rows={3}
            fullWidth
            required
            value={manualForm.pertanyaan}
            onChange={(e) => setManualForm({ ...manualForm, pertanyaan: e.target.value })}
          />

          {manualForm.jenis_soal === 'PILIHAN_GANDA' && (
            <Stack spacing={1.5}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                Opsi Pilihan Jawaban:
              </Typography>
              <TextField
                size="small"
                label="Pilihan A"
                fullWidth
                value={manualForm.opsi_a}
                onChange={(e) => setManualForm({ ...manualForm, opsi_a: e.target.value })}
              />
              <TextField
                size="small"
                label="Pilihan B"
                fullWidth
                value={manualForm.opsi_b}
                onChange={(e) => setManualForm({ ...manualForm, opsi_b: e.target.value })}
              />
              <TextField
                size="small"
                label="Pilihan C"
                fullWidth
                value={manualForm.opsi_c}
                onChange={(e) => setManualForm({ ...manualForm, opsi_c: e.target.value })}
              />
              <TextField
                size="small"
                label="Pilihan D"
                fullWidth
                value={manualForm.opsi_d}
                onChange={(e) => setManualForm({ ...manualForm, opsi_d: e.target.value })}
              />
              <TextField
                size="small"
                label="Pilihan E"
                fullWidth
                value={manualForm.opsi_e}
                onChange={(e) => setManualForm({ ...manualForm, opsi_e: e.target.value })}
              />
            </Stack>
          )}

          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              {manualForm.jenis_soal === 'PILIHAN_GANDA' ? (
                <TextField
                  select
                  label="Kunci Jawaban"
                  fullWidth
                  size="small"
                  value={manualForm.kunci_jawaban}
                  onChange={(e) => setManualForm({ ...manualForm, kunci_jawaban: e.target.value })}
                >
                  <MenuItem value="A">A</MenuItem>
                  <MenuItem value="B">B</MenuItem>
                  <MenuItem value="C">C</MenuItem>
                  <MenuItem value="D">D</MenuItem>
                  <MenuItem value="E">E</MenuItem>
                </TextField>
              ) : (
                <TextField
                  label="Kata Kunci Jawaban"
                  fullWidth
                  size="small"
                  value={manualForm.kunci_jawaban}
                  onChange={(e) => setManualForm({ ...manualForm, kunci_jawaban: e.target.value })}
                />
              )}
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                select
                label="Tingkat Kesulitan"
                fullWidth
                size="small"
                value={manualForm.tingkat_kesulitan}
                onChange={(e) => setManualForm({ ...manualForm, tingkat_kesulitan: e.target.value as any })}
              >
                <MenuItem value="MUDAH">Mudah</MenuItem>
                <MenuItem value="SEDANG">Sedang</MenuItem>
                <MenuItem value="SULIT">Sulit</MenuItem>
              </TextField>
            </Grid>
          </Grid>

          <TextField
            label="Pembahasan Ringkas"
            multiline
            rows={2}
            fullWidth
            value={manualForm.pembahasan}
            onChange={(e) => setManualForm({ ...manualForm, pembahasan: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenManualDialog(false)} color="inherit" sx={{ fontWeight: 600 }}>
            Batal
          </Button>
          <Button onClick={handleSaveManual} variant="contained" sx={{ fontWeight: 700, borderRadius: 2 }}>
            Simpan Soal
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
