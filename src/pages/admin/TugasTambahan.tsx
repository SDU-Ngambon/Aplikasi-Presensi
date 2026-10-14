import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

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
  Stack,
  Chip,
  Avatar,
  Card,
  CardContent,
  Tooltip,
  MenuItem,
  CircularProgress,
  Grid,
  InputAdornment,
  Switch,
  FormControlLabel,
  Divider,
  Tabs,
  Tab,
  Autocomplete
} from '@mui/material';

// Icons
import {
  Badge as BadgeIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Category as CategoryIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
  AssignmentInd as AssignmentIndIcon,
  Save as SaveIcon,
  Close as CloseIcon
} from '@mui/icons-material';

import { TugasTambahanCategory, TugasTambahanGuru, Teacher } from '../../types';

export default function TugasTambahan() {
  const [activeTab, setActiveTab] = useState<'penugasan' | 'kategori'>('penugasan');

  // Data states
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<TugasTambahanCategory[]>([]);
  const [assignments, setAssignments] = useState<TugasTambahanGuru[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');

  // Assignment Dialog State
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<TugasTambahanGuru | null>(null);
  const [assignmentForm, setAssignmentForm] = useState<{
    teacher_id: string;
    category_id: string;
    nomor_sk: string;
    keterangan: string;
    status: 'AKTIF' | 'NONAKTIF';
  }>({
    teacher_id: '',
    category_id: '',
    nomor_sk: '',
    keterangan: '',
    status: 'AKTIF'
  });
  const [savingAssignment, setSavingAssignment] = useState(false);

  // Category Dialog State
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TugasTambahanCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState<{
    nama: string;
    kode: string;
    keterangan: string;
  }>({
    nama: '',
    kode: '',
    keterangan: ''
  });
  const [savingCategory, setSavingCategory] = useState(false);

  // Initial Fetch
  const fetchData = async () => {
    setLoading(true);
    try {
      const [catRes, assignRes, teachRes] = await Promise.all([
        axios.get('/api/tugas-tambahan/categories'),
        axios.get('/api/tugas-tambahan/teachers'),
        axios.get('/api/teachers')
      ]);

      if (catRes.data?.data) {
        setCategories(catRes.data.data);
      } else if (Array.isArray(catRes.data)) {
        setCategories(catRes.data);
      }

      if (assignRes.data?.data) {
        setAssignments(assignRes.data.data);
      } else if (Array.isArray(assignRes.data)) {
        setAssignments(assignRes.data);
      }

      if (teachRes.data && Array.isArray(teachRes.data)) {
        setTeachers(teachRes.data);
      } else if (teachRes.data?.data && Array.isArray(teachRes.data.data)) {
        setTeachers(teachRes.data.data);
      }
    } catch (e: any) {
      console.error('Error fetching data tugas tambahan:', e);
      toast.error('Gagal memuat data tugas tambahan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Handlers for Penugasan ---
  const handleOpenAddAssignment = () => {
    setEditingAssignment(null);
    setAssignmentForm({
      teacher_id: '',
      category_id: categories.length > 0 ? categories[0].id : '',
      nomor_sk: '',
      keterangan: '',
      status: 'AKTIF'
    });
    setAssignmentDialogOpen(true);
  };

  const handleOpenEditAssignment = (item: TugasTambahanGuru) => {
    setEditingAssignment(item);
    setAssignmentForm({
      teacher_id: item.teacher_id,
      category_id: item.category_id,
      nomor_sk: item.nomor_sk || item.sk_nomor || '',
      keterangan: item.keterangan || '',
      status: item.status
    });
    setAssignmentDialogOpen(true);
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentForm.teacher_id) {
      toast.error('Silakan pilih Guru');
      return;
    }
    if (!assignmentForm.category_id) {
      toast.error('Silakan pilih Kategori Tugas Tambahan');
      return;
    }

    setSavingAssignment(true);
    try {
      if (editingAssignment) {
        const res = await axios.put(`/api/tugas-tambahan/teachers/${editingAssignment.id}`, assignmentForm);
        toast.success('Tugas tambahan berhasil diperbarui');
        if (res.data?.data) {
          setAssignments(prev => prev.map(a => a.id === editingAssignment.id ? res.data.data : a));
        }
      } else {
        const res = await axios.post('/api/tugas-tambahan/teachers', assignmentForm);
        toast.success('Tugas tambahan guru berhasil ditambahkan');
        if (res.data?.data) {
          setAssignments(prev => [res.data.data, ...prev]);
        }
      }
      setAssignmentDialogOpen(false);
      await fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Gagal menyimpan tugas tambahan');
    } finally {
      setSavingAssignment(false);
    }
  };

  const handleDeleteAssignment = async (id: string, name: string) => {
    if (!confirm(`Hapus penugasan tugas tambahan untuk guru "${name}"?`)) return;
    try {
      await axios.delete(`/api/tugas-tambahan/teachers/${id}`);
      toast.success('Penugasan berhasil dihapus');
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Gagal menghapus penugasan');
    }
  };

  const handleToggleStatusAssignment = async (id: string, currentStatus: 'AKTIF' | 'NONAKTIF') => {
    const nextStatus = currentStatus === 'AKTIF' ? 'NONAKTIF' : 'AKTIF';
    try {
      await axios.put(`/api/tugas-tambahan/teachers/${id}/status`, { status: nextStatus });
      toast.success(`Status tugas diubah menjadi ${nextStatus}`);
      fetchData();
    } catch (e: any) {
      toast.error('Gagal memperbarui status');
    }
  };

  // --- Handlers for Kategori ---
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryForm({
      nama: '',
      kode: '',
      keterangan: ''
    });
    setCategoryDialogOpen(true);
  };

  const handleOpenEditCategory = (cat: TugasTambahanCategory) => {
    setEditingCategory(cat);
    setCategoryForm({
      nama: cat.nama || cat.name || '',
      kode: cat.kode || cat.code || '',
      keterangan: cat.keterangan || cat.description || ''
    });
    setCategoryDialogOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.nama.trim()) {
      toast.error('Nama kategori wajib diisi');
      return;
    }

    setSavingCategory(true);
    try {
      if (editingCategory) {
        await axios.put(`/api/tugas-tambahan/categories/${editingCategory.id}`, categoryForm);
        toast.success('Kategori berhasil diperbarui');
      } else {
        await axios.post('/api/tugas-tambahan/categories', categoryForm);
        toast.success('Kategori baru berhasil ditambahkan');
      }
      setCategoryDialogOpen(false);
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Gagal menyimpan kategori');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (cat: TugasTambahanCategory) => {
    const catName = cat.nama || cat.name || 'Kategori';
    if (!confirm(`Hapus kategori "${catName}"? Guru yang terhubung dengan kategori ini akan dilepaskan.`)) return;
    try {
      await axios.delete(`/api/tugas-tambahan/categories/${cat.id}`);
      toast.success('Kategori berhasil dihapus');
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Gagal menghapus kategori');
    }
  };

  // Filtered assignments
  const filteredAssignments = assignments.filter(item => {
    const matchesSearch = 
      (item.teacher_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.teacher_nip || item.nip || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.nomor_sk || item.sk_nomor || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategoryFilter === 'ALL' || item.category_id === selectedCategoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header Banner */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'grey.200',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: 'white'
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
          <Box>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.5 }}>
              <BadgeIcon sx={{ fontSize: 28, color: '#38bdf8' }} />
              <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                Tugas Tambahan Guru
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: 'grey.300', maxWidth: 750 }}>
              Kelola tugas tambahan guru di luar wali kelas, seperti Wakil Kepala Sekolah (Kurikulum, Kesiswaan, Humas, Sarpras), Guru BK, dan Kepala Konsentrasi Keahlian.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              onClick={fetchData}
              startIcon={<RefreshIcon />}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.05)' } }}
            >
              Segarkan
            </Button>
            {activeTab === 'penugasan' ? (
              <Button
                variant="contained"
                onClick={handleOpenAddAssignment}
                startIcon={<AddIcon />}
                sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' }, fontWeight: 700 }}
              >
                Tambah Penugasan
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleOpenAddCategory}
                startIcon={<AddIcon />}
                sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' }, fontWeight: 700 }}
              >
                Tambah Kategori
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card elevation={0} sx={{ borderRadius: 2.5, border: '1px solid', borderColor: 'grey.200' }}>
            <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.50', color: 'primary.main', width: 48, height: 48 }}>
                <AssignmentTurnedInIcon />
              </Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  TOTAL GURU BERTUGAS
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {assignments.length} Guru
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card elevation={0} sx={{ borderRadius: 2.5, border: '1px solid', borderColor: 'grey.200' }}>
            <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'success.50', color: 'success.main', width: 48, height: 48 }}>
                <CheckCircleIcon />
              </Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  TUGAS AKTIF
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {assignments.filter(a => a.status === 'AKTIF').length} Penugasan
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card elevation={0} sx={{ borderRadius: 2.5, border: '1px solid', borderColor: 'grey.200' }}>
            <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'info.50', color: 'info.main', width: 48, height: 48 }}>
                <CategoryIcon />
              </Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  KATEGORI TUGAS
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {categories.length} Kategori
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs Menu */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, bgcolor: 'grey.50' }}>
          <Tabs
            value={activeTab}
            onChange={(e, val) => setActiveTab(val)}
            sx={{
              '& .MuiTab-root': {
                py: 2,
                fontWeight: 700,
                fontSize: '0.9rem',
                textTransform: 'none'
              }
            }}
          >
            <Tab
              value="penugasan"
              label={`Daftar Penugasan Guru (${assignments.length})`}
              icon={<AssignmentIndIcon />}
              iconPosition="start"
            />
            <Tab
              value="kategori"
              label={`Kelola Kategori Tugas Tambahan (${categories.length})`}
              icon={<CategoryIcon />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* TAB 1: DAFTAR PENUGASAN GURU */}
        {activeTab === 'penugasan' && (
          <Box sx={{ p: 3 }}>
            {/* Filter & Search Bar */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3, justifyContent: 'space-between' }}>
              <TextField
                size="small"
                placeholder="Cari guru, NIP, kategori tugas, atau No SK..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                sx={{ width: { xs: '100%', md: 380 } }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" fontSize="small" />
                      </InputAdornment>
                    )
                  }
                }}
              />

              <Stack direction="row" spacing={1.5}>
                <TextField
                  select
                  size="small"
                  label="Filter Kategori"
                  value={selectedCategoryFilter}
                  onChange={e => setSelectedCategoryFilter(e.target.value)}
                  sx={{ minWidth: 200 }}
                >
                  <MenuItem value="ALL">Semua Kategori</MenuItem>
                  {categories.map(cat => (
                    <MenuItem key={cat.id} value={cat.id}>
                      {cat.nama || cat.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </Stack>

            {loading ? (
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <CircularProgress size={36} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                  Memuat data penugasan tugas tambahan...
                </Typography>
              </Box>
            ) : filteredAssignments.length === 0 ? (
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <BadgeIcon sx={{ fontSize: 54, color: 'grey.300', mb: 1 }} />
                <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Belum ada guru dengan tugas tambahan
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Klik tombol "Tambah Penugasan" untuk menugaskan guru dengan jabatan Waka, BK, Ka. Program, dll.
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAddAssignment}>
                  Tambah Penugasan Sekarang
                </Button>
              </Box>
            ) : (
              <TableContainer sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'grey.50' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, width: 50 }}>No</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Nama Guru</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>NIP</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Tugas Tambahan</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Nomor SK & Keterangan</TableCell>
                      <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700, textAlign: 'center', width: 120 }}>Aksi</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredAssignments.map((item, idx) => (
                      <TableRow key={item.id} hover>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                            <Avatar sx={{ width: 32, height: 32, fontSize: '0.85rem', bgcolor: 'primary.100', color: 'primary.800' }}>
                              {(item.teacher_name || 'G')[0]}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                {item.teacher_name}
                              </Typography>
                              {(item.teacher_whatsapp || item.whatsapp) && (
                                <Typography variant="caption" color="text.secondary">
                                  WA: {item.teacher_whatsapp || item.whatsapp}
                                </Typography>
                              )}
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {item.teacher_nip || item.nip || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={item.category_name}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box>
                            {(item.nomor_sk || item.sk_nomor) ? (
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                SK: {item.nomor_sk || item.sk_nomor}
                              </Typography>
                            ) : (
                              <Typography variant="caption" color="text.secondary">
                                Tanpa SK
                              </Typography>
                            )}
                            {item.keterangan && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                {item.keterangan}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <FormControlLabel
                            control={
                              <Switch
                                size="small"
                                checked={item.status === 'AKTIF'}
                                onChange={() => handleToggleStatusAssignment(item.id, item.status)}
                                color="success"
                              />
                            }
                            label={
                              <Typography variant="caption" sx={{ fontWeight: 700, color: item.status === 'AKTIF' ? 'success.main' : 'text.secondary' }}>
                                {item.status}
                              </Typography>
                            }
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'center' }}>
                            <Tooltip title="Edit Penugasan">
                              <IconButton size="small" color="primary" onClick={() => handleOpenEditAssignment(item)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Hapus Penugasan">
                              <IconButton size="small" color="error" onClick={() => handleDeleteAssignment(item.id, item.teacher_name || '')}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {/* TAB 2: KELOLA KATEGORI */}
        {activeTab === 'kategori' && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Daftar Master Kategori Tugas Tambahan
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Anda dapat menambah, mengubah, atau menghapus kategori tugas tambahan sesuai struktur organisasi sekolah.
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={handleOpenAddCategory}
              >
                Tambah Kategori Baru
              </Button>
            </Box>

            <Grid container spacing={2}>
              {categories.map((cat) => {
                const assignedCount = assignments.filter(a => a.category_id === cat.id).length;
                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={cat.id}>
                    <Card
                      elevation={0}
                      sx={{
                        border: '1px solid',
                        borderColor: 'grey.200',
                        borderRadius: 2.5,
                        transition: 'all 0.2s',
                        '&:hover': { borderColor: 'primary.300', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }
                      }}
                    >
                      <CardContent sx={{ p: 2.5 }}>
                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Chip
                            label={cat.kode || cat.code || 'TUGAS'}
                            size="small"
                            color="secondary"
                            sx={{ fontWeight: 800, fontSize: '0.75rem' }}
                          />
                          <Stack direction="row" spacing={0.5}>
                            <IconButton size="small" onClick={() => handleOpenEditCategory(cat)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteCategory(cat)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </Stack>

                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, fontSize: '1.05rem' }}>
                          {cat.nama || cat.name}
                        </Typography>

                        <Typography variant="body2" color="text.secondary" sx={{ minHeight: 40, mb: 2 }}>
                          {cat.keterangan || cat.description || 'Tidak ada deskripsi khusus untuk kategori ini.'}
                        </Typography>

                        <Divider sx={{ mb: 1.5 }} />

                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" color="text.secondary">
                            Guru ditugaskan:
                          </Typography>
                          <Chip
                            label={`${assignedCount} Guru`}
                            size="small"
                            color={assignedCount > 0 ? 'success' : 'default'}
                            variant="outlined"
                            sx={{ fontWeight: 700 }}
                          />
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}
      </Paper>

      {/* DIALOG: FORM PENUGASAN GURU */}
      <Dialog
        open={assignmentDialogOpen}
        onClose={() => !savingAssignment && setAssignmentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleSaveAssignment}>
          <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {editingAssignment ? 'Edit Tugas Tambahan Guru' : 'Tambah Penugasan Tugas Tambahan'}
            <IconButton size="small" onClick={() => setAssignmentDialogOpen(false)} disabled={savingAssignment}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              <Autocomplete
                options={teachers}
                getOptionLabel={(option) => `${option.name} (NIP: ${option.nip || '-'})`}
                value={teachers.find(t => t.id === assignmentForm.teacher_id) || null}
                onChange={(event, newValue) => {
                  setAssignmentForm({
                    ...assignmentForm,
                    teacher_id: newValue ? newValue.id : ''
                  });
                }}
                disabled={Boolean(editingAssignment)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Pilih Guru *"
                    placeholder="Ketik nama atau NIP guru..."
                    size="small"
                    required
                  />
                )}
              />

              <TextField
                select
                size="small"
                label="Kategori Tugas Tambahan *"
                value={assignmentForm.category_id}
                onChange={e => setAssignmentForm({ ...assignmentForm, category_id: e.target.value })}
                required
              >
                {categories.map(cat => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.nama || cat.name} ({cat.kode || cat.code || 'TUGAS'})
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                size="small"
                label="Nomor SK Penugasan (Opsional)"
                placeholder="Contoh: 800/123/SMK/2026"
                value={assignmentForm.nomor_sk}
                onChange={e => setAssignmentForm({ ...assignmentForm, nomor_sk: e.target.value })}
              />

              <TextField
                size="small"
                label="Keterangan / Uraian Tugas"
                placeholder="Contoh: Mengkoordinasikan kurikulum dan jadwal pembelajaran"
                multiline
                rows={2}
                value={assignmentForm.keterangan}
                onChange={e => setAssignmentForm({ ...assignmentForm, keterangan: e.target.value })}
              />

              <TextField
                select
                size="small"
                label="Status Penugasan"
                value={assignmentForm.status}
                onChange={e => setAssignmentForm({ ...assignmentForm, status: e.target.value as any })}
              >
                <MenuItem value="AKTIF">AKTIF</MenuItem>
                <MenuItem value="NONAKTIF">NONAKTIF</MenuItem>
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setAssignmentDialogOpen(false)} disabled={savingAssignment}>
              Batal
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={savingAssignment}
              startIcon={savingAssignment ? <CircularProgress size={16} /> : <SaveIcon />}
            >
              {savingAssignment ? 'Menyimpan...' : 'Simpan Penugasan'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* DIALOG: FORM KATEGORI TUGAS TAMBAHAN */}
      <Dialog
        open={categoryDialogOpen}
        onClose={() => !savingCategory && setCategoryDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <form onSubmit={handleSaveCategory}>
          <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {editingCategory ? 'Edit Kategori Tugas' : 'Tambah Kategori Tugas Tambahan'}
            <IconButton size="small" onClick={() => setCategoryDialogOpen(false)} disabled={savingCategory}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              <TextField
                size="small"
                label="Nama Kategori *"
                placeholder="Contoh: Waka Kurikulum, Guru BK, dll."
                value={categoryForm.nama}
                onChange={e => setCategoryForm({ ...categoryForm, nama: e.target.value })}
                required
              />

              <TextField
                size="small"
                label="Kode Singkatan (Opsional)"
                placeholder="Contoh: WAKA_KUR, BK, KAJUR"
                value={categoryForm.kode}
                onChange={e => setCategoryForm({ ...categoryForm, kode: e.target.value })}
              />

              <TextField
                size="small"
                label="Keterangan Deskripsi"
                placeholder="Uraian ruang lingkup tugas..."
                multiline
                rows={3}
                value={categoryForm.keterangan}
                onChange={e => setCategoryForm({ ...categoryForm, keterangan: e.target.value })}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setCategoryDialogOpen(false)} disabled={savingCategory}>
              Batal
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={savingCategory}
              startIcon={savingCategory ? <CircularProgress size={16} /> : <SaveIcon />}
            >
              {savingCategory ? 'Menyimpan...' : 'Simpan Kategori'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
