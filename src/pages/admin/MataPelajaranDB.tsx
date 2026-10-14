import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Chip,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Stack,
  Divider,
  Alert,
  Grid,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  MenuBook as MenuBookIcon,
  School as SchoolIcon,
  FileDownload as FileDownloadIcon,
  FileUpload as FileUploadIcon,
  CloudUpload as CloudUploadIcon,
  RestartAlt as RestartAltIcon,
  CheckCircle as CheckCircleIcon,
  InfoOutlined as InfoOutlinedIcon
} from '@mui/icons-material';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';

export interface MataPelajaran {
  id: string;
  kode_mapel: string;
  nama_mapel: string;
  kelompok: string;
  keterangan?: string;
  created_at?: string;
}

const KELOMPOK_OPTIONS = [
  'Muatan Umum (A)',
  'Muatan Kejuruan',
  'Muatan Pilihan',
  'Muatan Lokal'
];

export default function MataPelajaranDB() {
  const [list, setList] = useState<MataPelajaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedKelompok, setSelectedKelompok] = useState('ALL');

  // Dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    kode_mapel: '',
    nama_mapel: '',
    kelompok: 'Muatan Kejuruan',
    keterangan: ''
  });

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Import dialog state
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [parsedImportData, setParsedImportData] = useState<Array<{
    kode_mapel: string;
    nama_mapel: string;
    kelompok: string;
    keterangan: string;
  }>>([]);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importing, setImporting] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/mata-pelajaran');
      setList(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast.error('Gagal mengambil data mata pelajaran');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      kode_mapel: '',
      nama_mapel: '',
      kelompok: 'Muatan Kejuruan',
      keterangan: ''
    });
    setOpenDialog(true);
  };

  const handleOpenEdit = (item: MataPelajaran) => {
    setEditingId(item.id);
    setFormData({
      kode_mapel: item.kode_mapel,
      nama_mapel: item.nama_mapel,
      kelompok: item.kelompok || 'Muatan Kejuruan',
      keterangan: item.keterangan || ''
    });
    setOpenDialog(true);
  };

  const handleSave = async () => {
    if (!formData.kode_mapel.trim() || !formData.nama_mapel.trim()) {
      toast.error('Kode dan nama mata pelajaran wajib diisi');
      return;
    }

    try {
      await axios.post('/api/mata-pelajaran', {
        id: editingId || undefined,
        ...formData
      });
      toast.success(editingId ? 'Mata pelajaran berhasil diperbarui' : 'Mata pelajaran berhasil ditambahkan');
      setOpenDialog(false);
      fetchList();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Gagal menyimpan mata pelajaran');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await axios.delete(`/api/mata-pelajaran/${deleteId}`);
      toast.success('Mata pelajaran berhasil dihapus');
      setDeleteId(null);
      fetchList();
    } catch (e: any) {
      toast.error('Gagal menghapus mata pelajaran');
    }
  };

  const handleExportExcel = () => {
    if (list.length === 0) {
      toast.error('Tidak ada data untuk diekspor');
      return;
    }
    const exportData = list.map((item, idx) => ({
      No: idx + 1,
      'Kode Mapel': item.kode_mapel,
      'Nama Mata Pelajaran': item.nama_mapel,
      'Kelompok Muatan': item.kelompok,
      Keterangan: item.keterangan || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mata Pelajaran');
    XLSX.writeFile(wb, `Data_Mata_Pelajaran_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Berhasil mengekspor data ke Excel');
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        kode_mapel: 'PAIBP',
        nama_mapel: 'Pendidikan Agama Islam dan Budi Pekerti',
        kelompok: 'Muatan Umum (A)',
        keterangan: 'Fase E & F kurikulum merdeka'
      },
      {
        kode_mapel: 'MTK',
        nama_mapel: 'Matematika',
        kelompok: 'Muatan Umum (A)',
        keterangan: 'Aljabar, Geometri, Trigonometri, Kalkulus dasar'
      },
      {
        kode_mapel: 'BING',
        nama_mapel: 'Bahasa Inggris',
        kelompok: 'Muatan Umum (A)',
        keterangan: 'Komunikasi bisnis & percakapan terapan'
      },
      {
        kode_mapel: 'DPK-RPL',
        nama_mapel: 'Dasar-dasar Program Keahlian RPL',
        kelompok: 'Muatan Kejuruan',
        keterangan: 'Pemrograman dasar, algoritma, basis data'
      },
      {
        kode_mapel: 'MULOK',
        nama_mapel: 'Bahasa Daerah / Muatan Lokal',
        kelompok: 'Muatan Lokal',
        keterangan: 'Kearifan lokal daerah'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template_Mata_Pelajaran');
    XLSX.writeFile(wb, 'Template_Impor_Mata_Pelajaran.xlsx');
    toast.success('Format template berhasil diunduh');
  };

  const handleFileImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          toast.error('Berkas Excel/CSV kosong');
          setParsedImportData([]);
          return;
        }

        const cleanItems: Array<{
          kode_mapel: string;
          nama_mapel: string;
          kelompok: string;
          keterangan: string;
        }> = [];

        rawJson.forEach(row => {
          const kode = (
            row.kode_mapel ||
            row['kode_mapel'] ||
            row['Kode Mapel'] ||
            row['Kode'] ||
            row['KODE'] ||
            row['KODE MAPEL'] ||
            ''
          ).toString().trim().toUpperCase();

          const nama = (
            row.nama_mapel ||
            row['nama_mapel'] ||
            row['Nama Mata Pelajaran'] ||
            row['Nama Mapel'] ||
            row['Mata Pelajaran'] ||
            row['NAMA'] ||
            ''
          ).toString().trim();

          const kelompok = (
            row.kelompok ||
            row['kelompok'] ||
            row['Kelompok'] ||
            row['Kelompok Muatan'] ||
            'Muatan Kejuruan'
          ).toString().trim();

          const keterangan = (
            row.keterangan ||
            row['keterangan'] ||
            row['Keterangan'] ||
            row['Deskripsi'] ||
            ''
          ).toString().trim();

          if (nama || kode) {
            cleanItems.push({
              kode_mapel: kode || `MP-${Math.floor(100 + Math.random() * 900)}`,
              nama_mapel: nama || kode,
              kelompok: kelompok || 'Muatan Kejuruan',
              keterangan
            });
          }
        });

        if (cleanItems.length === 0) {
          toast.error('Tidak ditemukan kolom nama_mapel atau kode_mapel yang valid');
          setParsedImportData([]);
          return;
        }

        setParsedImportData(cleanItems);
        toast.success(`Ditemukan ${cleanItems.length} baris data mata pelajaran siap diimpor`);
      } catch (err: any) {
        toast.error('Gagal membaca berkas Excel/CSV: ' + err.message);
        setParsedImportData([]);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleExecuteImport = async () => {
    if (parsedImportData.length === 0) {
      toast.error('Pilih berkas Excel/CSV dengan data valid terlebih dahulu');
      return;
    }

    setImporting(true);
    try {
      const res = await axios.post('/api/mata-pelajaran/import', { items: parsedImportData });
      toast.success(res.data.message || `Berhasil mengimpor ${parsedImportData.length} data mata pelajaran`);
      setOpenImportDialog(false);
      setParsedImportData([]);
      setImportFileName('');
      fetchList();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Gagal menyimpan data impor');
    } finally {
      setImporting(false);
    }
  };

  const filteredList = list.filter(item => {
    const matchSearch =
      item.kode_mapel.toLowerCase().includes(search.toLowerCase()) ||
      item.nama_mapel.toLowerCase().includes(search.toLowerCase()) ||
      (item.keterangan && item.keterangan.toLowerCase().includes(search.toLowerCase()));
    const matchKelompok = selectedKelompok === 'ALL' || item.kelompok === selectedKelompok;
    return matchSearch && matchKelompok;
  });

  const countUmum = list.filter(m => m.kelompok && m.kelompok.includes('Umum')).length;
  const countKejuruan = list.filter(m => m.kelompok && m.kelompok.includes('Kejuruan')).length;
  const countMulok = list.filter(m => m.kelompok && m.kelompok.includes('Lokal')).length;

  const getChipColor = (kelompok: string) => {
    if (kelompok.includes('Umum')) return 'primary';
    if (kelompok.includes('Kejuruan')) return 'secondary';
    if (kelompok.includes('Lokal')) return 'warning';
    return 'default';
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header & Title */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <MenuBookIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Database Mata Pelajaran
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Master data mata pelajaran untuk kurikulum, perangkat ajar, dan jadwal Kegiatan Belajar Mengajar (KBM)
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportExcel}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Ekspor Excel
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<FileUploadIcon />}
            onClick={() => {
              setParsedImportData([]);
              setImportFileName('');
              setOpenImportDialog(true);
            }}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Impor Excel / CSV
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAdd}
            sx={{ textTransform: 'none', fontWeight: 700, px: 2.5 }}
          >
            Tambah Mapel
          </Button>
        </Stack>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                Total Mata Pelajaran
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', mt: 0.5 }}>
                {list.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                Muatan Umum (A)
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'info.main', mt: 0.5 }}>
                {countUmum}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                Muatan Kejuruan
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'secondary.main', mt: 0.5 }}>
                {countKejuruan}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                Muatan Lokal
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'warning.main', mt: 0.5 }}>
                {countMulok}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter & Search Bar */}
      <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'grey.200', borderRadius: 2, mb: 2 }}>
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 7 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Cari kode atau nama mata pelajaran..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                  )
                }
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter Kelompok Muatan</InputLabel>
              <Select
                value={selectedKelompok}
                label="Filter Kelompok Muatan"
                onChange={e => setSelectedKelompok(e.target.value)}
              >
                <MenuItem value="ALL">Semua Kelompok</MenuItem>
                {KELOMPOK_OPTIONS.map(opt => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Table Data */}
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
        <Table size="medium">
          <TableHead sx={{ bgcolor: 'grey.50' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, width: 60 }}>No</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 140 }}>Kode Mapel</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Nama Mata Pelajaran</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 180 }}>Kelompok</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Keterangan</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: 110 }}>Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">Memuat data mata pelajaran...</Typography>
                </TableCell>
              </TableRow>
            ) : filteredList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                    Tidak ada data mata pelajaran yang sesuai
                  </Typography>
                  <Button variant="outlined" size="small" onClick={handleOpenAdd} startIcon={<AddIcon />}>
                    Tambah Mata Pelajaran Baru
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              filteredList.map((item, idx) => (
                <TableRow key={item.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>
                    <Chip
                      label={item.kode_mapel}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        letterSpacing: 0.5,
                        bgcolor: 'grey.100',
                        color: 'text.primary'
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{item.nama_mapel}</TableCell>
                  <TableCell>
                    <Chip
                      label={item.kelompok}
                      size="small"
                      color={getChipColor(item.kelompok) as any}
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell color="text.secondary">
                    {item.keterangan || '-'}
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'center' }}>
                      <Tooltip title="Edit Mata Pelajaran">
                        <IconButton size="small" color="primary" onClick={() => handleOpenEdit(item)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Hapus Mata Pelajaran">
                        <IconButton size="small" color="error" onClick={() => setDeleteId(item.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog Add / Edit */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingId ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Kode Mata Pelajaran"
              placeholder="Contoh: PAIBP, MTK, DPK, IPAS"
              fullWidth
              size="small"
              value={formData.kode_mapel}
              onChange={e => setFormData(prev => ({ ...prev, kode_mapel: e.target.value.toUpperCase() }))}
              helperText="Gunakan singkatan/kode unik huruf kapital"
              required
            />
            <TextField
              label="Nama Lengkap Mata Pelajaran"
              placeholder="Contoh: Pendidikan Agama Islam dan Budi Pekerti"
              fullWidth
              size="small"
              value={formData.nama_mapel}
              onChange={e => setFormData(prev => ({ ...prev, nama_mapel: e.target.value }))}
              required
            />
            <FormControl fullWidth size="small">
              <InputLabel>Kelompok Muatan</InputLabel>
              <Select
                value={formData.kelompok}
                label="Kelompok Muatan"
                onChange={e => setFormData(prev => ({ ...prev, kelompok: e.target.value }))}
              >
                {KELOMPOK_OPTIONS.map(opt => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Keterangan / Ruang Lingkup"
              placeholder="Catatan tambahan terkait mata pelajaran atau fase kurikulum"
              fullWidth
              size="small"
              multiline
              rows={3}
              value={formData.keterangan}
              onChange={e => setFormData(prev => ({ ...prev, keterangan: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpenDialog(false)} sx={{ textTransform: 'none' }}>
            Batal
          </Button>
          <Button variant="contained" onClick={handleSave} sx={{ textTransform: 'none', fontWeight: 700 }}>
            {editingId ? 'Simpan Perubahan' : 'Tambahkan'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Import Excel / CSV */}
      <Dialog open={openImportDialog} onClose={() => setOpenImportDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <FileUploadIcon color="primary" />
          Impor Data Mata Pelajaran (Excel / CSV)
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            {/* Template Card */}
            <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 2, border: '1px dashed', borderColor: 'primary.300', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.900' }}>
                  Gunakan Format Template Resmi
                </Typography>
                <Typography variant="caption" sx={{ color: 'primary.700', display: 'block' }}>
                  Kolom wajib: <b>kode_mapel</b>, <b>nama_mapel</b>, <b>kelompok</b>, <b>keterangan</b>.
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                startIcon={<FileDownloadIcon />}
                onClick={handleDownloadTemplate}
                sx={{ textTransform: 'none', fontWeight: 700, bgcolor: 'white' }}
              >
                Unduh Template Excel
              </Button>
            </Box>

            {/* File Upload Zone */}
            <Box
              sx={{
                border: '2px dashed',
                borderColor: parsedImportData.length > 0 ? 'success.main' : 'grey.300',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                bgcolor: parsedImportData.length > 0 ? 'success.50' : 'grey.50',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.50' }
              }}
              component="label"
            >
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                hidden
                onChange={handleFileImportChange}
              />
              <CloudUploadIcon sx={{ fontSize: 44, color: parsedImportData.length > 0 ? 'success.main' : 'text.secondary', mb: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {importFileName ? importFileName : 'Klik atau seret berkas Excel / CSV ke sini'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Mendukung format .xlsx, .xls, atau .csv (Maksimal 10MB)
              </Typography>
            </Box>

            {/* Preview of Parsed Data */}
            {parsedImportData.length > 0 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleIcon color="success" fontSize="small" />
                    Pratinjau Data Siap Diimpor ({parsedImportData.length} baris)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    *Data yang sudah ada (kode sama) akan diperbarui secara otomatis
                  </Typography>
                </Box>
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', maxHeight: 240 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>No</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Kode Mapel</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Nama Mata Pelajaran</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Kelompok</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Keterangan</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {parsedImportData.slice(0, 10).map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell><Chip label={row.kode_mapel} size="small" sx={{ fontWeight: 700 }} /></TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{row.nama_mapel}</TableCell>
                          <TableCell>{row.kelompok}</TableCell>
                          <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{row.keterangan || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {parsedImportData.length > 10 && (
                  <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1, color: 'text.secondary' }}>
                    ...dan {parsedImportData.length - 10} data lainnya
                  </Typography>
                )}
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpenImportDialog(false)} sx={{ textTransform: 'none' }}>
            Batal
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={importing ? <CircularProgress size={18} color="inherit" /> : <FileUploadIcon />}
            disabled={parsedImportData.length === 0 || importing}
            onClick={handleExecuteImport}
            sx={{ textTransform: 'none', fontWeight: 700, px: 3 }}
          >
            {importing ? 'Mengimpor...' : `Impor ${parsedImportData.length} Mata Pelajaran`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Delete Confirmation */}
      <Dialog open={Boolean(deleteId)} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Konfirmasi Hapus</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Apakah Anda yakin ingin menghapus data mata pelajaran ini? Tindakan ini tidak dapat dibatalkan.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteId(null)} sx={{ textTransform: 'none' }}>Batal</Button>
          <Button variant="contained" color="error" onClick={handleDelete} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Hapus
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
