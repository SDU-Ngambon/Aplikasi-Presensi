import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

// MUI Imports
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Grid,
  Collapse,
  Stack,
  InputAdornment,
  Chip,
  Avatar,
  Card,
  Tooltip
} from '@mui/material';

// Icons
import {
  Add as AddIcon,
  FileUpload as UploadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Description as FileDownIcon,
  WhatsApp as WhatsAppIcon,
  AssignmentInd as AssignmentIndIcon,
  School as SchoolIcon,
  Badge as BadgeIcon,
  Close as CloseIcon,
  QrCode2 as QrCode2Icon,
  Print as PrintIcon
} from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';

interface Teacher {
  id: string;
  name: string;
  nip?: string;
  whatsapp: string;
  class?: string;
  year?: string;
  status?: string;
}

export default function TeachersDB() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  
  // New teacher form state (Nama, NIP, Nomor Whatsapp)
  const [newTeacher, setNewTeacher] = useState({
    name: '',
    nip: '',
    whatsapp: ''
  });

  // Edit teacher modal state
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [selectedTeacherForQr, setSelectedTeacherForQr] = useState<Teacher | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    nip: '',
    whatsapp: ''
  });

  const fetchTeachers = async () => {
    try {
      const { data } = await axios.get('/api/teachers');
      setTeachers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setTeachers([]);
      toast.error('Gagal mengambil data guru');
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacher.name.trim()) {
      toast.error('Nama guru wajib diisi');
      return;
    }
    if (!newTeacher.whatsapp.trim()) {
      toast.error('Nomor WhatsApp wajib diisi');
      return;
    }

    try {
      await axios.post('/api/teachers', {
        name: newTeacher.name.trim(),
        nip: newTeacher.nip.trim(),
        whatsapp: newTeacher.whatsapp.trim(),
        class: '',
        year: ''
      });
      toast.success(`Data guru ${newTeacher.name} berhasil ditambahkan.`);
      setIsAdding(false);
      setNewTeacher({ name: '', nip: '', whatsapp: '' });
      fetchTeachers();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Gagal menambahkan data guru');
    }
  };

  const handleOpenEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setEditForm({
      name: teacher.name || '',
      nip: teacher.nip || '',
      whatsapp: teacher.whatsapp || ''
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;

    try {
      await axios.put(`/api/teachers/${editingTeacher.id}`, {
        name: editForm.name.trim(),
        nip: editForm.nip.trim(),
        whatsapp: editForm.whatsapp.trim(),
        class: editingTeacher.class || '',
        year: editingTeacher.year || ''
      });
      toast.success('Data guru berhasil diperbarui');
      setEditingTeacher(null);
      fetchTeachers();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Gagal memperbarui data guru');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Yakin ingin menghapus data guru: "${name}"?`)) {
      try {
        await axios.delete(`/api/teachers/${id}`);
        toast.success(`Guru "${name}" telah dihapus.`);
        fetchTeachers();
      } catch (e: any) {
        toast.error('Gagal menghapus data guru');
      }
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        Nama: 'Drs. H. Bambang Sudarsono, M.Pd',
        NIP: '19700101 199501 1 002',
        WhatsApp: '081234567890'
      },
      {
        Nama: 'Siti Aminah, S.Kom',
        NIP: '19850512 201001 2 015',
        WhatsApp: '082198765432'
      },
      {
        Nama: 'Rudi Hartono, S.T',
        NIP: '-',
        WhatsApp: '085711223344'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Format Data Guru");
    XLSX.writeFile(wb, "Template_Data_Guru.xlsx");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const teachersToImport = data.map((row: any) => ({
          name: String(row.Nama || row.nama || '').trim(),
          nip: String(row.NIP || row.nip || '').trim(),
          whatsapp: String(row.WhatsApp || row.whatsapp || row['No. WhatsApp'] || '').trim(),
          class: String(row.Wali_Kelas || row.Kelas || '').trim(),
          year: String(row.Angkatan || row.Tahun || '').trim()
        })).filter(t => t.name && t.whatsapp);

        if (teachersToImport.length > 0) {
          const res = await axios.post('/api/import/teachers', { teachers: teachersToImport });
          fetchTeachers();
          setImportDialogOpen(false);
          toast.success(res.data?.message || `Berhasil import ${teachersToImport.length} data guru.`);
        } else {
          toast.error('Tidak ada data valid yang ditemukan untuk diimport. Pastikan kolom Nama dan WhatsApp terisi.');
        }
      } catch (err: any) {
        toast.error('Gagal memproses file Excel.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const filtered = teachers.filter(t => {
    if (!t) return false;
    const q = (searchQuery || '').toLowerCase();
    const matchName = t.name ? String(t.name).toLowerCase().includes(q) : false;
    const matchNip = t.nip ? String(t.nip).toLowerCase().includes(q) : false;
    const matchWa = t.whatsapp ? String(t.whatsapp).toLowerCase().includes(q) : false;
    const matchClass = t.class ? String(t.class).toLowerCase().includes(q) : false;
    return matchName || matchNip || matchWa || matchClass;
  });

  const totalTeachers = teachers.length;
  const assignedTeachers = teachers.filter(t => t.class && !t.class.startsWith('Alumni')).length;
  const unassignedTeachers = totalTeachers - assignedTeachers;

  return (
    <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.5px' }}>
            Data Guru
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Kelola data guru (Nama, NIP, Nomor WhatsApp) serta status penugasan wali kelas pada rombongan belajar.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }}>
          <Button 
            variant="outlined" 
            color="inherit" 
            startIcon={<UploadIcon />}
            onClick={() => setImportDialogOpen(true)}
            sx={{ borderRadius: 2 }}
          >
            Import Excel
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={() => setIsAdding(!isAdding)}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            {isAdding ? 'Batal Tambah' : 'Tambah Guru Baru'}
          </Button>
        </Stack>
      </Box>

      {/* KPI Stats Cards */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ p: 2.5, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: 'background.paper' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
              TOTAL DATA GURU
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', mt: 0.5 }}>
              {totalTeachers}
            </Typography>
            <Typography variant="caption" color="text.secondary">Guru Terdaftar</Typography>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ p: 2.5, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: 'background.paper' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
              WALI KELAS AKTIF
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'success.main', mt: 0.5 }}>
              {assignedTeachers}
            </Typography>
            <Typography variant="caption" color="text.secondary">Ditugaskan pada Rombel</Typography>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ p: 2.5, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: 'background.paper' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
              BELUM DITUGASKAN
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#64748b', mt: 0.5 }}>
              {unassignedTeachers}
            </Typography>
            <Typography variant="caption" color="text.secondary">Guru Mata Pelajaran / Cadangan</Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Form Input Guru Baru (Nama, NIP, Nomor Whatsapp) */}
      <Collapse in={isAdding}>
        <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'primary.light', borderRadius: 3, bgcolor: '#f8faff' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5, color: 'primary.main' }}>
            Input Data Guru Baru
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2.5 }}>
            Masukkan data guru dengan format Nama, NIP (Nomor Induk Pegawai), dan Nomor WhatsApp aktif.
          </Typography>

          <form onSubmit={handleAdd}>
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField 
                  required 
                  fullWidth 
                  size="small" 
                  label="Nama Guru Lengkap" 
                  placeholder="Contoh: Ahmad Mulyadi, S.Pd"
                  value={newTeacher.name} 
                  onChange={e => setNewTeacher({ ...newTeacher, name: e.target.value })} 
                />
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <TextField 
                  fullWidth 
                  size="small" 
                  label="NIP (Nomor Induk Pegawai)" 
                  placeholder="Contoh: 19850715 201001 1 008 (atau - jika non-PNS)"
                  value={newTeacher.nip} 
                  onChange={e => setNewTeacher({ ...newTeacher, nip: e.target.value })} 
                />
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <TextField 
                  required 
                  fullWidth 
                  size="small" 
                  label="Nomor WhatsApp" 
                  placeholder="Contoh: 081234567890"
                  value={newTeacher.whatsapp} 
                  onChange={e => setNewTeacher({ ...newTeacher, whatsapp: e.target.value })} 
                  helperText="Format: 08xxxxxxxxxx atau 628xxxxxxxxxx"
                />
              </Grid>

              <Grid size={12}>
                <Stack direction="row" spacing={1.5}>
                  <Button type="submit" variant="contained" color="primary" sx={{ px: 4, borderRadius: 2, fontWeight: 700 }}>
                    Simpan Data Guru
                  </Button>
                  <Button variant="outlined" color="inherit" onClick={() => setIsAdding(false)} sx={{ borderRadius: 2 }}>
                    Batal
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Collapse>

      {/* Table Data Guru */}
      <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2 }}>
          <TextField 
            size="small" 
            placeholder="Cari nama guru, NIP, WhatsApp, atau kelas..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            slotProps={{
              input: { 
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }
            }}
            sx={{ bgcolor: 'background.paper', width: { xs: '100%', sm: 360 } }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Menampilkan: {filtered.length} dari {teachers.length} Guru
          </Typography>
        </Box>
        
        <TableContainer>
          <Table size="medium">
            <TableHead sx={{ bgcolor: '#f1f5f9' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: 60 }}>NO</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>NAMA GURU</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>NIP</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>NOMOR WHATSAPP</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>PENUGASAN WALI KELAS</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>AKSI</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((t, idx) => {
                let cleanPhone = (t.whatsapp || '').replace(/\D/g, '');
                if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.substring(1);

                const isAssigned = !!t.class;
                const isAlumni = t.class?.startsWith('Alumni');

                return (
                  <TableRow key={t.id} hover>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 500 }}>
                      {idx + 1}
                    </TableCell>

                    <TableCell>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.light', fontSize: '0.875rem', fontWeight: 700 }}>
                          {t.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            {t.name}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600, color: t.nip && t.nip !== '-' ? 'text.primary' : 'text.disabled' }}>
                        {t.nip && t.nip !== '-' ? t.nip : '- (Non-PNS)'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {t.whatsapp}
                        </Typography>
                        {cleanPhone && (
                          <Tooltip title="Kirim Chat WhatsApp">
                            <IconButton 
                              size="small" 
                              color="success" 
                              component="a" 
                              href={`https://wa.me/${cleanPhone}`} 
                              target="_blank"
                              sx={{ p: 0.5 }}
                            >
                              <WhatsAppIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>

                    <TableCell>
                      {isAssigned ? (
                        <Chip 
                          icon={<SchoolIcon fontSize="small" />} 
                          label={isAlumni ? `Wali Alumni (${t.class.replace('Alumni ', '')})` : `Wali Kelas: ${t.class}`} 
                          size="small" 
                          color={isAlumni ? 'default' : 'primary'} 
                          variant={isAlumni ? 'outlined' : 'filled'}
                          sx={{ fontWeight: 700 }}
                        />
                      ) : (
                        <Chip 
                          label="Belum Ditugaskan" 
                          size="small" 
                          variant="outlined" 
                          color="default"
                          sx={{ color: 'text.secondary', fontStyle: 'italic' }}
                        />
                      )}
                    </TableCell>

                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                        <Tooltip title="QR Code Data Guru">
                          <IconButton size="small" color="secondary" onClick={() => setSelectedTeacherForQr(t)}>
                            <QrCode2Icon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Data Guru">
                          <IconButton size="small" color="primary" onClick={() => handleOpenEdit(t)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Hapus Guru">
                          <IconButton size="small" color="error" onClick={() => handleDelete(t.id, t.name)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}

              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <AssignmentIndIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Tidak ada data guru yang ditemukan
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Klik "Tambah Guru Baru" atau "Import Excel" untuk memasukkan data guru.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Dialog Edit Guru */}
      <Dialog open={!!editingTeacher} onClose={() => setEditingTeacher(null)} maxWidth="sm" fullWidth>
        <DialogTitle component="div" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 800 }}>Edit Data Guru</Typography>
          <IconButton size="small" onClick={() => setEditingTeacher(null)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <form onSubmit={handleSaveEdit}>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField 
              required 
              fullWidth 
              size="small" 
              label="Nama Guru Lengkap" 
              value={editForm.name} 
              onChange={e => setEditForm({ ...editForm, name: e.target.value })} 
            />
            <TextField 
              fullWidth 
              size="small" 
              label="NIP (Nomor Induk Pegawai)" 
              placeholder="Contoh: 19850715 201001 1 008 (atau - jika non-PNS)"
              value={editForm.nip} 
              onChange={e => setEditForm({ ...editForm, nip: e.target.value })} 
            />
            <TextField 
              required 
              fullWidth 
              size="small" 
              label="Nomor WhatsApp" 
              value={editForm.whatsapp} 
              onChange={e => setEditForm({ ...editForm, whatsapp: e.target.value })} 
              helperText="Format: 08xxxxxxxxxx atau 628xxxxxxxxxx"
            />
            {editingTeacher?.class && (
              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>
                  STATUS PENUGASAN SAAT INI:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                  Wali Kelas: {editingTeacher.class} {editingTeacher.year ? `(Angkatan: ${editingTeacher.year})` : ''}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  *Penugasan wali kelas dapat diubah langsung melalui menu Rombongan Belajar.
                </Typography>
              </Paper>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2, px: 3 }}>
            <Button onClick={() => setEditingTeacher(null)} color="inherit">Batal</Button>
            <Button type="submit" variant="contained" color="primary" sx={{ px: 3 }}>Simpan Perubahan</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog Import Excel */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Import Data Guru Massal (Excel)</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Typography variant="body2" color="text.secondary">
              Gunakan template Excel berikut untuk mengunggah data guru secara sekaligus ke dalam sistem. Data yang dibutuhkan meliputi <b>Nama Guru</b>, <b>NIP</b>, dan <b>Nomor WhatsApp</b>.
            </Typography>

            <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Langkah-langkah:
              </Typography>
              <Typography variant="body2" component="div" color="text.secondary">
                1. Unduh template Excel data guru.<br />
                2. Buka file dan isi kolom Nama, NIP, dan WhatsApp.<br />
                3. Simpan file lalu klik "Upload File Excel" di bawah.
              </Typography>
            </Paper>

            <Stack direction="row" spacing={2} sx={{ pt: 1 }}>
              <Button 
                variant="outlined" 
                color="inherit" 
                startIcon={<FileDownIcon />}
                onClick={downloadTemplate}
                sx={{ borderRadius: 2 }}
              >
                Unduh Template Excel
              </Button>
              <Button 
                component="label" 
                variant="contained" 
                color="primary" 
                startIcon={<UploadIcon />}
                sx={{ borderRadius: 2 }}
              >
                Upload File Excel
                <input type="file" hidden accept=".xlsx,.xls" onChange={handleImport} />
              </Button>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setImportDialogOpen(false)}>Tutup</Button>
        </DialogActions>
      </Dialog>

      {/* MODAL QR CODE DATA GURU */}
      <Dialog
        open={Boolean(selectedTeacherForQr)}
        onClose={() => setSelectedTeacherForQr(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1, textAlign: 'center' } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', pb: 1 }}>
          QR Code Resmi Data Guru
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 1 }}>
          {selectedTeacherForQr && (
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Box
                id="printable-teacher-qr"
                sx={{
                  p: 2.5,
                  border: '2px solid #e2e8f0',
                  borderRadius: 3,
                  bgcolor: '#ffffff',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Kartu Identitas Digital Guru
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mt: 0.5 }}>
                  {selectedTeacherForQr.name}
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
                  NIP: {selectedTeacherForQr.nip || '-'}
                </Typography>

                <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #cbd5e1', my: 1 }}>
                  <QRCodeSVG
                    value={JSON.stringify({
                      type: 'TEACHER_IDENTITY',
                      id: selectedTeacherForQr.id,
                      name: selectedTeacherForQr.name,
                      nip: selectedTeacherForQr.nip || '-',
                      whatsapp: selectedTeacherForQr.whatsapp,
                      class: selectedTeacherForQr.class || '-'
                    })}
                    size={170}
                    level="H"
                  />
                </Box>

                <Typography variant="caption" sx={{ color: '#475569', mt: 1, fontSize: '10px' }}>
                  Scan untuk verifikasi kehadiran, perangkat ajar & tugas sekolah.
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
          <Button onClick={() => setSelectedTeacherForQr(null)} color="inherit">
            Tutup
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Cetak Kartu
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
