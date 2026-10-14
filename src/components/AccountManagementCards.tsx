import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Chip,
  Tabs,
  Tab,
  TextField,
  Button,
  Grid,
  Divider,
  Alert,
  IconButton,
  InputAdornment,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Tooltip,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  AdminPanelSettings as AdminPanelSettingsIcon,
  AccountCircle as AccountCircleIcon,
  School as SchoolIcon,
  Badge as BadgeIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Key as KeyIcon,
  PersonAdd as PersonAddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Security as SecurityIcon,
  Psychology as PsychologyIcon,
  MenuBook as MenuBookIcon,
  ContentCopy as ContentCopyIcon
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

const generatePassword = (): string => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const AccountManagementCards: React.FC<{
  adminCardComponent?: React.ReactNode;
}> = ({ adminCardComponent }) => {
  const [activeSubTab, setActiveSubTab] = useState<'admin' | 'kepsek' | 'special'>('kepsek');

  // --- KEPALA SEKOLAH STATE ---
  const [kepsekLoading, setKepsekLoading] = useState(false);
  const [kepsekSaving, setKepsekSaving] = useState(false);
  const [kepsekData, setKepsekData] = useState<{
    name: string;
    nip: string;
    username: string;
    password_plain: string;
    status: string;
  }>({
    name: '',
    nip: '',
    username: 'kepsek',
    password_plain: '',
    status: 'AKTIF'
  });
  const [showKepsekPass, setShowKepsekPass] = useState(false);

  // --- SPECIAL ROLES (WAKASEK & GURU BK) STATE ---
  const [specialLoading, setSpecialLoading] = useState(false);
  const [specialAccounts, setSpecialAccounts] = useState<any[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [teacherAccountsList, setTeacherAccountsList] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSaving, setDialogSaving] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'WAKIL_KURIKULUM' | 'WAKIL_KESISWAAN' | 'GURU_BK'>('WAKIL_KURIKULUM');
  const [formStatus, setFormStatus] = useState('AKTIF');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // 1. Fetch Kepala Sekolah Account
  const fetchKepsekAccount = async () => {
    setKepsekLoading(true);
    try {
      const res = await axios.get('/api/accounts/kepala-sekolah');
      if (res.data && res.data.data) {
        setKepsekData({
          name: res.data.data.name || '',
          nip: res.data.data.nip || '',
          username: res.data.data.username || 'kepsek',
          password_plain: res.data.data.password_plain || '',
          status: res.data.data.status || 'AKTIF'
        });
      }
    } catch (e: any) {
      console.error('Error fetching kepala sekolah account:', e);
    } finally {
      setKepsekLoading(false);
    }
  };

  // 2. Fetch Special Roles (Wakasek & Guru BK), Teachers & Teacher Accounts
  const fetchSpecialAccounts = async () => {
    setSpecialLoading(true);
    try {
      const [specRes, teachRes, accRes] = await Promise.all([
        axios.get('/api/accounts/special-roles'),
        axios.get('/api/teachers'),
        axios.get('/api/teacher-accounts')
      ]);
      if (specRes.data && specRes.data.data) {
        setSpecialAccounts(specRes.data.data);
      }
      if (teachRes.data && Array.isArray(teachRes.data)) {
        setTeachersList(teachRes.data);
      }
      if (accRes.data && Array.isArray(accRes.data.data)) {
        setTeacherAccountsList(accRes.data.data);
      }
    } catch (e: any) {
      console.error('Error fetching special role accounts:', e);
    } finally {
      setSpecialLoading(false);
    }
  };

  useEffect(() => {
    fetchKepsekAccount();
    fetchSpecialAccounts();
  }, []);

  // Save Kepala Sekolah Account
  const handleSaveKepsek = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kepsekData.username.trim()) {
      toast.error('Username Kepala Sekolah tidak boleh kosong');
      return;
    }
    if (!kepsekData.password_plain.trim()) {
      toast.error('Password Kepala Sekolah tidak boleh kosong');
      return;
    }

    setKepsekSaving(true);
    try {
      const res = await axios.post('/api/accounts/kepala-sekolah', {
        username: kepsekData.username.trim(),
        password: kepsekData.password_plain.trim(),
        status: kepsekData.status
      });
      if (res.data && res.data.success) {
        toast.success('Pengaturan Akun Kepala Sekolah berhasil disimpan!');
        fetchKepsekAccount();
      } else {
        toast.error(res.data.error || 'Gagal menyimpan akun kepala sekolah');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan akun kepala sekolah');
    } finally {
      setKepsekSaving(false);
    }
  };

  // Open Dialog for New/Edit Assignment
  const handleOpenAssignDialog = (existing?: any) => {
    if (existing) {
      setSelectedTeacherId(existing.teacher_id);
      setSelectedRole(existing.role);
      setFormStatus(existing.status || 'AKTIF');
    } else {
      setSelectedTeacherId('');
      setSelectedRole('WAKIL_KURIKULUM');
      setFormStatus('AKTIF');
    }
    setDialogOpen(true);
  };

  // Handle Teacher Selection Change in Dialog
  const handleTeacherChange = (teacherId: string) => {
    setSelectedTeacherId(teacherId);
  };

  // Save Special Role Assignment (Tanpa generate password ulang, mengikuti Akun Guru)
  const handleSaveSpecialRole = async () => {
    if (!selectedTeacherId) {
      toast.error('Pilih salah satu guru dari daftar Data Guru');
      return;
    }

    setDialogSaving(true);
    try {
      const res = await axios.post('/api/accounts/special-roles', {
        teacher_id: selectedTeacherId,
        role: selectedRole,
        status: formStatus
      });

      if (res.data && res.data.success) {
        toast.success(`Penugasan ${getRoleLabel(selectedRole)} berhasil disimpan!`);
        setDialogOpen(false);
        fetchSpecialAccounts();
      } else {
        toast.error(res.data.error || 'Gagal menyimpan penugasan peran khusus');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan peran khusus');
    } finally {
      setDialogSaving(false);
    }
  };

  // Remove Special Role
  const handleRemoveRole = async (teacher_id: string, name: string) => {
    if (!window.confirm(`Cabut peran khusus dari guru "${name}"? Akun akan kembali menjadi Akun Guru biasa.`)) {
      return;
    }
    try {
      const res = await axios.delete(`/api/accounts/special-roles/${teacher_id}`);
      if (res.data && res.data.success) {
        toast.success(`Hak peran khusus dicabut dari ${name}`);
        fetchSpecialAccounts();
      } else {
        toast.error('Gagal mencabut peran khusus');
      }
    } catch (err: any) {
      toast.error('Gagal mencabut peran khusus');
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'WAKIL_KURIKULUM':
        return 'Wakil Kepala Sekolah Bidang Kurikulum';
      case 'WAKIL_KESISWAAN':
        return 'Wakil Kepala Sekolah Bidang Kesiswaan';
      case 'GURU_BK':
        return 'Guru Bimbingan Konseling (BK)';
      default:
        return 'Guru Mata Pelajaran';
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'WAKIL_KURIKULUM':
        return (
          <Chip
            icon={<MenuBookIcon sx={{ fontSize: '16px !important' }} />}
            label="Wakasek Kurikulum"
            size="small"
            sx={{ bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 700 }}
          />
        );
      case 'WAKIL_KESISWAAN':
        return (
          <Chip
            icon={<SecurityIcon sx={{ fontSize: '16px !important' }} />}
            label="Wakasek Kesiswaan"
            size="small"
            sx={{ bgcolor: '#fef3c7', color: '#b45309', fontWeight: 700 }}
          />
        );
      case 'GURU_BK':
        return (
          <Chip
            icon={<PsychologyIcon sx={{ fontSize: '16px !important' }} />}
            label="Guru BK"
            size="small"
            sx={{ bgcolor: '#f3e8ff', color: '#7e22ce', fontWeight: 700 }}
          />
        );
      default:
        return <Chip label="Guru" size="small" />;
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} disalin ke clipboard`);
  };

  return (
    <Box id="account-management-suite" sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Sub-Header & Navigation Tabs */}
      <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #e2e8f0', borderRadius: 3, bgcolor: '#ffffff' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <SecurityIcon color="primary" sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                Atur Akun & Hak Akses
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Kelola akun Administrator, Kepala Sekolah, Wakil Kepala Sekolah (Kurikulum & Kesiswaan), serta Guru BK.
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Tabs
          value={activeSubTab}
          onChange={(_, val) => setActiveSubTab(val)}
          indicatorColor="primary"
          textColor="primary"
          sx={{
            minHeight: 44,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.88rem',
              minHeight: 44,
              py: 1
            }
          }}
        >
          <Tab
            id="tab-sub-kepsek"
            value="kepsek"
            icon={<SchoolIcon fontSize="small" />}
            iconPosition="start"
            label="Akun Kepala Sekolah"
          />
          <Tab
            id="tab-sub-special"
            value="special"
            icon={<BadgeIcon fontSize="small" />}
            iconPosition="start"
            label="Wakasek & Guru BK"
          />
          <Tab
            id="tab-sub-admin"
            value="admin"
            icon={<AdminPanelSettingsIcon fontSize="small" />}
            iconPosition="start"
            label="Akun Administrator"
          />
        </Tabs>
      </Paper>

      {/* VIEW 1: AKUN KEPALA SEKOLAH */}
      {activeSubTab === 'kepsek' && (
        <Paper elevation={0} sx={{ p: 3, border: '1px solid #e2e8f0', borderRadius: 3, bgcolor: '#ffffff' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <SchoolIcon color="primary" sx={{ fontSize: 28 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Pengaturan Akun Kepala Sekolah
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Data nama & NIP diambil dari <b>Data Sekolah &gt; Informasi Sekolah</b>. Memiliki hak akses monitoring kehadiran guru.
                </Typography>
              </Box>
            </Stack>

            <Chip
              icon={<CheckCircleIcon fontSize="small" />}
              label={`Hak Akses: Monitoring Kehadiran Guru`}
              color="success"
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
          </Box>

          <Divider sx={{ mb: 3 }} />

          {kepsekLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : (
            <form onSubmit={handleSaveKepsek}>
              <Grid container spacing={2.5}>
                {/* Info Card Profil Kepala Sekolah dari Data Sekolah */}
                <Grid size={{ xs: 12 }}>
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    Nama Kepala Sekolah: <b>{kepsekData.name || '(Belum diatur di Data Sekolah > Informasi Sekolah)'}</b> &bull; NIP: <b>{kepsekData.nip || '-'}</b>
                    <br />
                    <span style={{ fontSize: '0.8rem', color: '#475569' }}>
                      *Untuk mengubah nama atau NIP Kepala Sekolah, silakan ubah pada menu <b>Data Sekolah &gt; Informasi Sekolah</b>.
                    </span>
                  </Alert>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    id="input-kepsek-username"
                    fullWidth
                    label="Username Login"
                    value={kepsekData.username}
                    onChange={(e) => setKepsekData({ ...kepsekData, username: e.target.value })}
                    helperText="Username yang digunakan untuk login di Portal Akses Data Guru"
                    required
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    id="input-kepsek-password"
                    fullWidth
                    label="Password Akun"
                    type={showKepsekPass ? 'text' : 'password'}
                    value={kepsekData.password_plain}
                    onChange={(e) => setKepsekData({ ...kepsekData, password_plain: e.target.value })}
                    helperText="Password login Kepala Sekolah"
                    required
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onClick={() => setShowKepsekPass(!showKepsekPass)}
                              edge="end"
                            >
                              {showKepsekPass ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                            </IconButton>
                            <Tooltip title="Buat Password Otomatis">
                              <IconButton
                                size="small"
                                onClick={() => setKepsekData({ ...kepsekData, password_plain: generatePassword() })}
                              >
                                <KeyIcon fontSize="small" color="primary" />
                              </IconButton>
                            </Tooltip>
                          </InputAdornment>
                        )
                      }
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel id="label-kepsek-status">Status Akun</InputLabel>
                    <Select
                      labelId="label-kepsek-status"
                      id="select-kepsek-status"
                      value={kepsekData.status}
                      label="Status Akun"
                      onChange={(e) => setKepsekData({ ...kepsekData, status: e.target.value })}
                    >
                      <MenuItem value="AKTIF">AKTIF (Dapat Login)</MenuItem>
                      <MenuItem value="NONAKTIF">NONAKTIF (Akses Ditutup)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', width: '100%' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155', display: 'block' }}>
                      Portal Login
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#0f172a' }}>
                      Kepala Sekolah dapat login langsung melalui <b>Portal Akses Data Guru</b> (<code>/guru/login</code>).
                    </Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                    <Button
                      id="btn-save-kepsek-account"
                      type="submit"
                      variant="contained"
                      color="primary"
                      disabled={kepsekSaving}
                      startIcon={kepsekSaving ? <CircularProgress size={18} color="inherit" /> : <CheckCircleIcon />}
                      sx={{ fontWeight: 700, px: 3, py: 1 }}
                    >
                      {kepsekSaving ? 'Menyimpan...' : 'Simpan Akun Kepala Sekolah'}
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </form>
          )}
        </Paper>
      )}

      {/* VIEW 2: WAKASEK & GURU BK */}
      {activeSubTab === 'special' && (
        <Paper elevation={0} sx={{ p: 3, border: '1px solid #e2e8f0', borderRadius: 3, bgcolor: '#ffffff' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <BadgeIcon color="primary" sx={{ fontSize: 28 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Pengaturan Akun Wakil Kepala Sekolah &amp; Guru BK
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Data diambil dari <b>Data Guru</b>. Tentukan penugasan khusus sebagai Wakasek Kurikulum, Wakasek Kesiswaan, atau Guru BK.
                </Typography>
              </Box>
            </Stack>

            <Button
              id="btn-add-special-role"
              variant="contained"
              color="primary"
              startIcon={<PersonAddIcon />}
              onClick={() => handleOpenAssignDialog()}
              sx={{ fontWeight: 700 }}
            >
              Atur Penugasan Akun
            </Button>
          </Box>

          <Divider sx={{ mb: 2.5 }} />

          {specialLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : specialAccounts.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4, bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
              <BadgeIcon sx={{ fontSize: 44, color: '#94a3b8', mb: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#475569' }}>
                Belum ada Akun Wakasek atau Guru BK yang ditugaskan
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Klik tombol "Atur Penugasan Akun" untuk memilih guru dan menentukan perannya.
              </Typography>
              <Button
                variant="outlined"
                startIcon={<PersonAddIcon />}
                onClick={() => handleOpenAssignDialog()}
                sx={{ fontWeight: 700 }}
              >
                Tugaskan Sekarang
              </Button>
            </Box>
          ) : (
            <TableContainer sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflowX: 'auto', width: '100%' }}>
              <Table size="small" sx={{ minWidth: 700 }}>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, width: 40 }}>No</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Nama Guru</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>NIP</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Peran / Jabatan</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Username (Akun Guru)</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Password (Akun Guru)</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Hak Akses</TableCell>
                    <TableCell sx={{ fontWeight: 800, textAlign: 'center' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 800, textAlign: 'center', width: 100 }}>Aksi</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {specialAccounts.map((acc, idx) => (
                    <TableRow key={acc.id || acc.teacher_id} hover>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>{acc.name}</TableCell>
                      <TableCell>{acc.nip || '-'}</TableCell>
                      <TableCell>{getRoleBadge(acc.role)}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                          <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                            {acc.username}
                          </code>
                          <Tooltip title="Salin Username">
                            <IconButton
                              size="small"
                              onClick={() => copyToClipboard(acc.username, 'Username')}
                            >
                              <ContentCopyIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                          <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                            {visiblePasswords[acc.id] ? (acc.password_plain || '******') : '••••••••'}
                          </code>
                          <IconButton
                            size="small"
                            onClick={() =>
                              setVisiblePasswords(prev => ({ ...prev, [acc.id]: !prev[acc.id] }))
                            }
                          >
                            {visiblePasswords[acc.id] ? (
                              <VisibilityOffIcon sx={{ fontSize: 14 }} />
                            ) : (
                              <VisibilityIcon sx={{ fontSize: 14 }} />
                            )}
                          </IconButton>
                          {acc.password_plain && (
                            <Tooltip title="Salin Password">
                              <IconButton
                                size="small"
                                onClick={() => copyToClipboard(acc.password_plain, 'Password')}
                              >
                                <ContentCopyIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {acc.role === 'WAKIL_KURIKULUM' && (
                          <Chip label="Monitoring Kehadiran Guru" size="small" color="primary" variant="outlined" />
                        )}
                        {acc.role === 'WAKIL_KESISWAAN' && (
                          <Chip label="Monitoring Presensi Siswa" size="small" color="warning" variant="outlined" />
                        )}
                        {acc.role === 'GURU_BK' && (
                          <Chip label="Presensi Siswa &amp; Bimbingan" size="small" color="secondary" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Chip
                          label={acc.status || 'AKTIF'}
                          size="small"
                          color={acc.status === 'NONAKTIF' ? 'default' : 'success'}
                          sx={{ fontWeight: 700, height: 22 }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'center' }}>
                          <Tooltip title="Edit Akun &amp; Peran">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleOpenAssignDialog(acc)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Cabut Peran Khusus">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemoveRole(acc.teacher_id, acc.name)}
                            >
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

          {/* Dialog Tambah / Edit Penugasan */}
          <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 800 }}>
              Atur Akun Wakil Kepala Sekolah &amp; Guru BK
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2.5} sx={{ pt: 1 }}>
                <FormControl fullWidth required>
                  <InputLabel id="label-select-teacher">Pilih Guru (Dari Data Guru)</InputLabel>
                  <Select
                    labelId="label-select-teacher"
                    id="select-teacher-for-role"
                    value={selectedTeacherId}
                    label="Pilih Guru (Dari Data Guru)"
                    onChange={(e) => handleTeacherChange(e.target.value)}
                  >
                    {teachersList.map((t) => (
                      <MenuItem key={t.id} value={t.id}>
                        {t.name} {t.nip ? `(NIP: ${t.nip})` : ''} - {t.class ? `Wali Kelas: ${t.class}` : 'Guru'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {selectedTeacherId && (() => {
                  const selTeacher = teachersList.find(t => t.id === selectedTeacherId);
                  const matchedAcc = teacherAccountsList.find(a => a.teacher_id === selectedTeacherId);
                  const displayUser = matchedAcc?.username || (selTeacher?.nip ? selTeacher.nip.replace(/\s+/g, '') : selTeacher?.name?.toLowerCase().replace(/[^a-z0-9]/g, '')) || '-';
                  const displayPass = matchedAcc?.password_plain || (matchedAcc ? '******' : '(Mengikuti Akun Guru)');

                  return (
                    <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.8, mb: 1.5 }}>
                        <KeyIcon sx={{ fontSize: 16 }} /> Kredensial Login (Tersinkronisasi dari Menu Akun Guru)
                      </Typography>

                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                            Username Login:
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 0.5 }}>
                            <code style={{ background: '#e2e8f0', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '0.85rem' }}>
                              {displayUser}
                            </code>
                            {displayUser !== '-' && (
                              <Tooltip title="Salin Username">
                                <IconButton
                                  size="small"
                                  onClick={() => copyToClipboard(displayUser, 'Username')}
                                >
                                  <ContentCopyIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                            Password Akun Guru:
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 0.5 }}>
                            <code style={{ background: '#e2e8f0', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '0.85rem' }}>
                              {displayPass}
                            </code>
                            {matchedAcc?.password_plain && (
                              <Tooltip title="Salin Password">
                                <IconButton
                                  size="small"
                                  onClick={() => copyToClipboard(matchedAcc.password_plain, 'Password')}
                                >
                                  <ContentCopyIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </Grid>
                      </Grid>

                      <Alert severity="info" sx={{ mt: 1.5, py: 0.5, px: 1.5, fontSize: '0.78rem', borderRadius: 2 }}>
                        Username dan password untuk akun ini otomatis mengikuti data <b>Akun Guru</b> yang sudah diproses di <b>Menu Akun Guru</b>. Tidak perlu membuat/men-generate password lagi.
                      </Alert>
                    </Box>
                  );
                })()}

                <FormControl fullWidth required>
                  <InputLabel id="label-select-role">Pilih Penugasan / Peran</InputLabel>
                  <Select
                    labelId="label-select-role"
                    id="select-special-role"
                    value={selectedRole}
                    label="Pilih Penugasan / Peran"
                    onChange={(e) => setSelectedRole(e.target.value as any)}
                  >
                    <MenuItem value="WAKIL_KURIKULUM">
                      Wakil Kepala Sekolah Bidang Kurikulum (Akses Monitoring Kehadiran Guru)
                    </MenuItem>
                    <MenuItem value="WAKIL_KESISWAAN">
                      Wakil Kepala Sekolah Bidang Kesiswaan (Akses Monitoring Presensi Siswa)
                    </MenuItem>
                    <MenuItem value="GURU_BK">
                      Guru BK (Bimbingan Konseling - Akses Presensi Siswa &amp; Bimbingan)
                    </MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel id="label-role-status">Status Akun</InputLabel>
                  <Select
                    labelId="label-role-status"
                    id="select-role-status"
                    value={formStatus}
                    label="Status Akun"
                    onChange={(e) => setFormStatus(e.target.value)}
                  >
                    <MenuItem value="AKTIF">AKTIF</MenuItem>
                    <MenuItem value="NONAKTIF">NONAKTIF</MenuItem>
                  </Select>
                </FormControl>

                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  <b>Hak Akses Terkait:</b>
                  {selectedRole === 'WAKIL_KURIKULUM' && (
                    <span> Guru ini akan memperoleh akses khusus <b>Monitoring Kehadiran Guru</b> pada Portal Akses Data Guru.</span>
                  )}
                  {selectedRole === 'WAKIL_KESISWAAN' && (
                    <span> Guru ini akan memperoleh akses monitoring presensi seluruh rombel siswa dan perizinan.</span>
                  )}
                  {selectedRole === 'GURU_BK' && (
                    <span> Guru ini akan memperoleh akses presensi siswa dan catatan bimbingan konseling.</span>
                  )}
                </Alert>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setDialogOpen(false)} color="inherit">
                Batal
              </Button>
              <Button
                id="btn-save-role-dialog"
                variant="contained"
                onClick={handleSaveSpecialRole}
                disabled={dialogSaving}
                startIcon={dialogSaving ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                sx={{ fontWeight: 700 }}
              >
                {dialogSaving ? 'Menyimpan...' : 'Simpan Peran'}
              </Button>
            </DialogActions>
          </Dialog>
        </Paper>
      )}

      {/* VIEW 3: AKUN ADMINISTRATOR */}
      {activeSubTab === 'admin' && (
        <Box>
          {adminCardComponent}
        </Box>
      )}
    </Box>
  );
};
