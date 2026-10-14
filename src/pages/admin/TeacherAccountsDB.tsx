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
  LinearProgress,
  Grid,
  Alert,
  InputAdornment,
  Switch,
  FormControlLabel,
  Divider,
  Badge
} from '@mui/material';

// Icons
import {
  VpnKey as KeyIcon,
  Refresh as RefreshIcon,
  AutoFixHigh as AutoFixHighIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Sync as SyncIcon,
  Badge as BadgeIcon,
  ContentCopy as ContentCopyIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  Security as SecurityIcon,
  Check as CheckIcon,
  Download as DownloadIcon,
  Shuffle as ShuffleIcon
} from '@mui/icons-material';

import { safeStorage } from '../../safeStorage';

interface TeacherAccount {
  id: string;
  teacher_id: string;
  username: string;
  password?: string;
  plain_password?: string;
  role: string;
  status: 'AKTIF' | 'NONAKTIF';
  created_at?: string;
  updated_at?: string;
  teacher_name?: string;
  teacher_nip?: string;
  name?: string;
  nip?: string;
  whatsapp?: string;
  class?: string;
}

const PASSWORD_PRESETS = [
  'Guru@123',
  '@Guru123',
  '@Guru2026',
  'Guru@2026'
];

export default function TeacherAccountsDB() {
  const [accounts, setAccounts] = useState<TeacherAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modern progress bar states
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [progressSuccessMsg, setProgressSuccessMsg] = useState('');
  const [massChosenPassword, setMassChosenPassword] = useState<string>('');

  // Password visibility map (id -> boolean)
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Edit Modal State
  const [editingAccount, setEditingAccount] = useState<TeacherAccount | null>(null);
  const [editForm, setEditForm] = useState({
    username: '',
    password: '',
    status: 'AKTIF',
    chosenOptionNote: ''
  });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Single Account Regenerate confirmation
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  // Mass regenerate state
  const [massRegenerateDialogOpen, setMassRegenerateDialogOpen] = useState(false);

  // Status & Generated Password Notification Popup
  const [generatedResultPopup, setGeneratedResultPopup] = useState<{
    open: boolean;
    teacherName: string;
    username: string;
    chosenPassword: string;
    allOptions: string[];
  } | null>(null);

  const fetchAccounts = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await axios.get('/api/teacher-accounts');
      if (res.data && res.data.data) {
        setAccounts(res.data.data);
        safeStorage.setJSON('cached_teacher_accounts', res.data.data);
      }
    } catch (err) {
      const cached = safeStorage.getJSON('cached_teacher_accounts', []);
      if (cached.length > 0) {
        setAccounts(cached);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  /**
   * PROSES SEGARKAN:
   * Hanya merefresh status & data guru dari server,
   * TIDAK mengubah atau men-generate password apapun!
   */
  const handleRefreshStatusOnly = async () => {
    setIsProcessing(true);
    setProgressValue(25);
    setProgressLabel('Membaca dan menyegarkan status data guru...');
    try {
      await new Promise(r => setTimeout(r, 200));
      setProgressValue(70);
      const res = await axios.get('/api/teacher-accounts');
      if (res.data && res.data.data) {
        setAccounts(res.data.data);
        safeStorage.setJSON('cached_teacher_accounts', res.data.data);
      }
      setProgressValue(100);
      toast.success('Status & data guru berhasil disegarkan (Password tetap aman)');
    } catch (err: any) {
      toast.error('Gagal menyegarkan data guru');
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setProgressValue(0);
        setProgressLabel('');
      }, 300);
    }
  };

  /**
   * SINKRONISASI DATA GURU KE AKUN:
   * Menambahkan akun guru baru yang belum terdaftar.
   */
  const handleSyncAccounts = async () => {
    setProgressDialogOpen(true);
    setIsProcessing(true);
    setProgressValue(15);
    setProgressLabel('Membaca master data guru...');
    setProgressSuccessMsg('');
    setMassChosenPassword('');

    try {
      await new Promise(r => setTimeout(r, 300));
      setProgressValue(50);
      setProgressLabel('Menyesuaikan NIP, nama lengkap, dan username otomatis...');

      await new Promise(r => setTimeout(r, 300));
      setProgressValue(80);
      setProgressLabel('Menerapkan alokasi password otomatis (1 dari 4 pilihan resmi)...');

      const res = await axios.post('/api/teacher-accounts/sync');
      
      setProgressValue(100);
      setProgressLabel('Sinkronisasi selesai!');
      
      if (res.data && res.data.success) {
        const msg = res.data.message || 'Sinkronisasi akun guru berhasil!';
        setProgressSuccessMsg(msg);
        toast.success(msg);
        await fetchAccounts(true);
      }
    } catch (err: any) {
      setProgressDialogOpen(false);
      toast.error(err.response?.data?.error || 'Gagal menyinkronkan akun guru');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * GENERATE PASSWORD OTOMATIS (PER GURU):
   * Otomatis memilih salah satu dari 4 pilihan password dan menginformasikannya ke admin.
   */
  const handleRegeneratePassword = async (account: TeacherAccount) => {
    setRegeneratingId(account.id);
    setIsProcessing(true);
    setProgressValue(35);
    const teacherName = account.teacher_name || account.name || 'Guru';
    setProgressLabel(`Memilih salah satu dari 4 password otomatis untuk ${teacherName}...`);

    try {
      await new Promise(r => setTimeout(r, 250));
      setProgressValue(80);
      const res = await axios.post(`/api/teacher-accounts/regenerate/${account.id}`);
      setProgressValue(100);
      
      if (res.data && res.data.success) {
        const chosen = res.data.chosenPassword || res.data.newPassword || '';
        toast.success(`Password baru untuk ${teacherName}: ${chosen}`);
        
        // Inform user which password option was chosen!
        setGeneratedResultPopup({
          open: true,
          teacherName: teacherName,
          username: account.username,
          chosenPassword: chosen,
          allOptions: PASSWORD_PRESETS
        });

        await fetchAccounts(true);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal generate ulang password');
    } finally {
      setRegeneratingId(null);
      setIsProcessing(false);
      setProgressValue(0);
      setProgressLabel('');
    }
  };

  /**
   * GENERATE ULANG SEMUA PASSWORD:
   * Menerapkan salah satu dari 4 pilihan password secara otomatis ke semua akun guru dan menampilkannya.
   */
  const handleMassRegenerate = async () => {
    setMassRegenerateDialogOpen(false);
    setProgressDialogOpen(true);
    setIsProcessing(true);
    setProgressValue(20);
    setProgressLabel('Menganalisis daftar seluruh akun guru...');
    setProgressSuccessMsg('');
    setMassChosenPassword('');

    try {
      await new Promise(r => setTimeout(r, 350));
      setProgressValue(55);
      setProgressLabel('Memilih salah satu dari 4 opsi password resmi...');

      await new Promise(r => setTimeout(r, 350));
      setProgressValue(85);
      setProgressLabel('Mengenkripsi kredensial & menyimpan ke database...');

      const res = await axios.post('/api/teacher-accounts/regenerate-all');
      
      setProgressValue(100);
      setProgressLabel('Generate ulang password selesai!');

      if (res.data && res.data.success) {
        const chosen = res.data.chosenPassword || PASSWORD_PRESETS[0];
        const count = res.data.count || totalAccounts;
        setMassChosenPassword(chosen);
        setProgressSuccessMsg(`Berhasil men-generate ulang password untuk ${count} akun guru.`);
        toast.success(`Password berhasil diterapkan: ${chosen}`);
        await fetchAccounts(true);
      }
    } catch (err: any) {
      setProgressDialogOpen(false);
      toast.error(err.response?.data?.error || 'Gagal generate massal akun');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * AKTIFKAN / NONAKTIFKAN STATUS AKUN:
   */
  const handleToggleStatus = async (account: TeacherAccount) => {
    const nextStatus = account.status === 'AKTIF' ? 'NONAKTIF' : 'AKTIF';
    setTogglingId(account.id);

    // Optimistic UI update
    setAccounts(prev => prev.map(a => a.id === account.id ? { ...a, status: nextStatus } : a));

    try {
      const res = await axios.put(`/api/teacher-accounts/${account.id}/toggle-status`);
      if (res.data && res.data.success) {
        const updatedStatus = res.data.account?.status || nextStatus;
        toast.success(`Status akun ${account.teacher_name || account.name} kini ${updatedStatus}`);
        await fetchAccounts(true);
      }
    } catch (err: any) {
      // Revert if failed
      setAccounts(prev => prev.map(a => a.id === account.id ? { ...a, status: account.status } : a));
      toast.error(err.response?.data?.error || 'Gagal mengubah status akun');
    } finally {
      setTogglingId(null);
    }
  };

  const handleOpenEdit = (account: TeacherAccount) => {
    setEditingAccount(account);
    setEditForm({
      username: account.username || '',
      password: account.plain_password || account.password || '',
      status: (account.status as 'AKTIF' | 'NONAKTIF') || 'AKTIF',
      chosenOptionNote: ''
    });
    setShowEditPassword(false);
  };

  const handleSaveEdit = async () => {
    if (!editingAccount) return;
    if (!editForm.username.trim()) {
      toast.error('Username tidak boleh kosong');
      return;
    }

    setSavingEdit(true);
    try {
      const res = await axios.put(`/api/teacher-accounts/${editingAccount.id}`, {
        username: editForm.username.trim(),
        password: editForm.password.trim(),
        status: editForm.status
      });

      if (res.data && res.data.success) {
        toast.success('Akun guru berhasil diperbarui');
        setEditingAccount(null);
        await fetchAccounts(true);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan perubahan akun');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAutoPickPresetInEdit = () => {
    // Pick randomly from 4 options
    const randIdx = Math.floor(Math.random() * PASSWORD_PRESETS.length);
    const chosen = PASSWORD_PRESETS[randIdx];
    setEditForm(prev => ({
      ...prev,
      password: chosen,
      chosenOptionNote: `Sistem memilih opsi #${randIdx + 1}: "${chosen}"`
    }));
    setShowEditPassword(true);
    toast.success(`Sistem memilih: ${chosen}`);
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleCopyCredentials = (account: TeacherAccount) => {
    const text = `Akun Guru:\nNama: ${account.teacher_name || account.name}\nUsername: ${account.username}\nPassword: ${account.plain_password || account.password || '******'}`;
    navigator.clipboard.writeText(text);
    setCopiedId(account.id);
    toast.success(`Akun ${account.teacher_name || account.name} disalin ke clipboard!`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCopySinglePassword = (password: string) => {
    navigator.clipboard.writeText(password);
    toast.success(`Password "${password}" disalin!`);
  };

  const handleCopyAllCredentials = () => {
    if (accounts.length === 0) {
      toast.error('Tidak ada data akun guru untuk disalin');
      return;
    }
    const lines = accounts.map((a, i) => 
      `${i + 1}. ${a.teacher_name || a.name || 'Guru'} | Username: ${a.username} | Password: ${a.plain_password || a.password || '******'} | Status: ${a.status}`
    );
    const text = `DAFTAR AKUN GURU PIKET & PERIZINAN\n${'='.repeat(45)}\n${lines.join('\n')}`;
    navigator.clipboard.writeText(text);
    toast.success(`Berhasil menyalin ${accounts.length} akun guru ke clipboard!`);
  };

  const handleExportCSV = () => {
    if (accounts.length === 0) {
      toast.error('Tidak ada data akun guru untuk diekspor');
      return;
    }
    const headers = ['No', 'Nama Guru', 'NIP', 'Username', 'Password', 'Status'];
    const rows = accounts.map((a, i) => [
      i + 1,
      `"${(a.teacher_name || a.name || '').replace(/"/g, '""')}"`,
      `"${a.teacher_nip || a.nip || '-'}"`,
      `"${a.username || ''}"`,
      `"${a.plain_password || a.password || ''}"`,
      `"${a.status || 'AKTIF'}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Daftar_Akun_Guru_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('File CSV berhasil diunduh');
  };

  // Filter accounts
  const filteredAccounts = accounts.filter(acc => {
    const query = searchQuery.toLowerCase();
    const name = (acc.teacher_name || acc.name || '').toLowerCase();
    const nip = (acc.teacher_nip || acc.nip || '').toLowerCase();
    const username = (acc.username || '').toLowerCase();

    const matchesQuery = name.includes(query) || nip.includes(query) || username.includes(query);
    const matchesStatus = statusFilter === 'ALL' || acc.status === statusFilter;

    return matchesQuery && matchesStatus;
  });

  const totalAccounts = accounts.length;
  const activeAccounts = accounts.filter(a => a.status === 'AKTIF').length;
  const inactiveAccounts = accounts.filter(a => a.status === 'NONAKTIF').length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, position: 'relative' }}>
      {/* Top Modern Linear Progress Bar */}
      {isProcessing && !progressDialogOpen && (
        <Box sx={{ width: '100%', position: 'sticky', top: 0, zIndex: 1100, mb: 2 }}>
          <LinearProgress
            variant={progressValue > 0 ? 'determinate' : 'indeterminate'}
            value={progressValue}
            sx={{ height: 6, borderRadius: 3, bgcolor: 'primary.light' }}
          />
          {progressLabel && (
            <Typography variant="caption" sx={{ mt: 0.5, display: 'block', fontWeight: 600, color: 'primary.main' }}>
              {progressLabel} ({progressValue}%)
            </Typography>
          )}
        </Box>
      )}

      {/* Header Bar */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <KeyIcon sx={{ color: 'primary.main', fontSize: 28 }} />
            Manajemen Akun Guru
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Kelola username dan password akun guru untuk login ke Portal Guru Piket & Perizinan.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Tooltip title="Hanya merefresh status guru dari database tanpa mengubah password">
            <Button
              variant="outlined"
              color="primary"
              startIcon={<RefreshIcon />}
              onClick={handleRefreshStatusOnly}
              disabled={isProcessing}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
            >
              Segarkan Status Guru
            </Button>
          </Tooltip>

          <Button
            variant="outlined"
            color="primary"
            startIcon={<SyncIcon />}
            onClick={handleSyncAccounts}
            disabled={isProcessing}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            Sinkronkan Data Baru
          </Button>

          <Button
            variant="contained"
            color="secondary"
            startIcon={<AutoFixHighIcon />}
            onClick={() => setMassRegenerateDialogOpen(true)}
            disabled={isProcessing}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            Generate Ulang Semua
          </Button>

          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportCSV}
            disabled={accounts.length === 0}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            Ekspor CSV
          </Button>
        </Stack>
      </Box>

      {/* Info Alert with 4 Password Presets */}
      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="body2">
            <strong>Aturan Password Otomatis:</strong> Ketika melakukan generate password otomatis, sistem akan memilih salah satu dari 4 opsi resmi:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
            {PASSWORD_PRESETS.map((p, idx) => (
              <Chip
                key={p}
                label={`Opsi ${idx + 1}: ${p}`}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontFamily: 'monospace', fontWeight: 700, bgcolor: 'background.paper' }}
              />
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            • Tombol <strong>"Segarkan Status Guru"</strong> hanya memperbarui status aktif/nonaktif akun tanpa mengganti password.<br />
            • Tombol <strong>"Generate"</strong> akan memilih salah satu dari 4 password di atas dan menginformasikan password mana yang diterapkan.
          </Typography>
        </Box>
      </Alert>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ borderRadius: 2.5, boxShadow: 1, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Total Akun Guru
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
                    {totalAccounts}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', width: 48, height: 48 }}>
                  <PersonIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ borderRadius: 2.5, boxShadow: 1, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Akun Aktif (Dapat Login)
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: 'success.main' }}>
                    {activeAccounts}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#ecfdf5', color: '#10b981', width: 48, height: 48 }}>
                  <CheckCircleIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ borderRadius: 2.5, boxShadow: 1, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Akun Nonaktif (Dinonaktifkan)
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: inactiveAccounts > 0 ? 'error.main' : 'text.secondary' }}>
                    {inactiveAccounts}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#fef2f2', color: '#ef4444', width: 48, height: 48 }}>
                  <CancelIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter and Search Bar */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2.5, boxShadow: 1, border: '1px solid', borderColor: 'divider' }}>
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, sm: 6, md: 7 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Cari berdasarkan nama guru, NIP, atau username..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchQuery('')}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  )
                }
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Grid>

          <Grid size={{ xs: 6, sm: 3, md: 3 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Status Akun"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            >
              <MenuItem value="ALL">Semua Status ({totalAccounts})</MenuItem>
              <MenuItem value="AKTIF">Aktif ({activeAccounts})</MenuItem>
              <MenuItem value="NONAKTIF">Nonaktif ({inactiveAccounts})</MenuItem>
            </TextField>
          </Grid>

          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRefreshStatusOnly}
              disabled={loading || isProcessing}
              sx={{ height: 40, textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
            >
              Segarkan
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Table Section */}
      <Paper sx={{ borderRadius: 2.5, boxShadow: 1, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: 'background.paper', fontWeight: 700 } }}>
                <TableCell width={60} align="center">No</TableCell>
                <TableCell>Nama Guru</TableCell>
                <TableCell>NIP / Identitas</TableCell>
                <TableCell>Username</TableCell>
                <TableCell>Password</TableCell>
                <TableCell align="center" width={160}>Aktivasi Akun</TableCell>
                <TableCell align="center" width={180}>Aksi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} sx={{ mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Memuat data akun guru...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <PersonIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Tidak Ada Data Akun Guru
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {searchQuery
                        ? 'Tidak ada akun yang sesuai dengan kriteria pencarian.'
                        : 'Belum ada data guru atau akun belum disinkronkan.'}
                    </Typography>
                    {!searchQuery && (
                      <Button
                        variant="contained"
                        startIcon={<SyncIcon />}
                        onClick={handleSyncAccounts}
                        disabled={isProcessing}
                        sx={{ textTransform: 'none', borderRadius: 2 }}
                      >
                        Sinkronkan Akun Dari Data Guru
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAccounts.map((account, index) => {
                  const teacherName = account.teacher_name || account.name || 'Guru';
                  const teacherNip = account.teacher_nip || account.nip || '-';
                  const isPassVisible = Boolean(visiblePasswords[account.id]);
                  const displayPassword = account.plain_password || account.password || '******';
                  const isRegenerating = regeneratingId === account.id;
                  const isToggling = togglingId === account.id;
                  const isAccountActive = account.status === 'AKTIF';

                  return (
                    <TableRow key={account.id} hover sx={{ opacity: isAccountActive ? 1 : 0.75 }}>
                      <TableCell align="center" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        {index + 1}
                      </TableCell>

                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ bgcolor: isAccountActive ? 'primary.main' : 'text.disabled', width: 36, height: 36, fontSize: 14, fontWeight: 700 }}>
                            {teacherName.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                              {teacherName}
                            </Typography>
                            {account.class && (
                              <Typography variant="caption" color="text.secondary">
                                Wali: {account.class}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          {teacherNip !== '-' ? teacherNip : '-'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {teacherNip !== '-' ? 'NIP Terdaftar' : 'Akun Non-NIP'}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={account.username}
                          size="small"
                          color={isAccountActive ? 'primary' : 'default'}
                          variant="outlined"
                          sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem' }}
                        />
                      </TableCell>

                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              letterSpacing: isPassVisible ? 0.5 : 2,
                              color: isPassVisible ? 'text.primary' : 'text.secondary'
                            }}
                          >
                            {isPassVisible ? displayPassword : '••••••••'}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => togglePasswordVisibility(account.id)}
                            sx={{ p: 0.5 }}
                          >
                            {isPassVisible ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                          </IconButton>
                        </Box>
                      </TableCell>

                      {/* Interactive Activation Switch */}
                      <TableCell align="center">
                        <Tooltip title={isAccountActive ? 'Klik untuk NONAKTIFKAN akun' : 'Klik untuk AKTIFKAN akun'}>
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                            {isToggling ? (
                              <CircularProgress size={20} />
                            ) : (
                              <Switch
                                size="small"
                                checked={isAccountActive}
                                onChange={() => handleToggleStatus(account)}
                                color="success"
                              />
                            )}
                            <Chip
                              label={account.status}
                              size="small"
                              color={isAccountActive ? 'success' : 'error'}
                              sx={{ fontWeight: 700, fontSize: '0.7rem', height: 22 }}
                            />
                          </Box>
                        </Tooltip>
                      </TableCell>

                      <TableCell align="center">
                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
                          <Tooltip title="Salin Info Akun">
                            <IconButton
                              size="small"
                              color={copiedId === account.id ? 'success' : 'default'}
                              onClick={() => handleCopyCredentials(account)}
                              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
                            >
                              {copiedId === account.id ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Generate Otomatis Dari 4 Pilihan (Guru@123, @Guru123, @Guru2026, Guru@2026)">
                            <IconButton
                              size="small"
                              color="secondary"
                              onClick={() => handleRegeneratePassword(account)}
                              disabled={isRegenerating || isProcessing}
                              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
                            >
                              {isRegenerating ? <CircularProgress size={18} /> : <AutoFixHighIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Edit Username / Password Manual">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleOpenEdit(account)}
                              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Modern Progress Dialog for Sync & Mass Generation */}
      <Dialog
        open={progressDialogOpen}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 2, textAlign: 'center' } } }}
      >
        <DialogContent sx={{ py: 3 }}>
          {isProcessing ? (
            <Box>
              <CircularProgress size={48} sx={{ mb: 2, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Sedang Memproses...
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                {progressLabel}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={progressValue}
                sx={{ height: 8, borderRadius: 4, mb: 1 }}
              />
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {progressValue}%
              </Typography>
            </Box>
          ) : (
            <Box>
              <Avatar sx={{ bgcolor: '#ecfdf5', color: '#10b981', width: 56, height: 56, mx: 'auto', mb: 1.5 }}>
                <CheckCircleIcon sx={{ fontSize: 36 }} />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                Proses Selesai!
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: massChosenPassword ? 2 : 3, whiteSpace: 'pre-line' }}>
                {progressSuccessMsg || 'Data akun guru telah berhasil diproses dan disimpan ke sistem.'}
              </Typography>

              {massChosenPassword && (
                <Box sx={{ bgcolor: '#ecfdf5', border: '1px solid #10b981', p: 2, borderRadius: 2.5, mb: 2.5, textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#065f46', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    Password Yang Berhasil Diterapkan
                  </Typography>
                  <Typography variant="h5" sx={{ fontFamily: 'monospace', fontWeight: 800, color: '#047857', my: 0.8, letterSpacing: 1 }}>
                    {massChosenPassword}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    color="success"
                    startIcon={<ContentCopyIcon fontSize="small" />}
                    onClick={() => handleCopySinglePassword(massChosenPassword)}
                    sx={{ mt: 0.5, textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', borderRadius: 1.5 }}
                  >
                    Salin Password
                  </Button>
                </Box>
              )}

              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={() => {
                  setProgressDialogOpen(false);
                  setMassChosenPassword('');
                }}
                sx={{ borderRadius: 2, fontWeight: 700 }}
              >
                Tutup
              </Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Generated Result Notification Popup (Informs which password was chosen) */}
      <Dialog
        open={Boolean(generatedResultPopup)}
        onClose={() => setGeneratedResultPopup(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <DialogTitle component="div" sx={{ pb: 1, textAlign: 'center' }}>
          <Avatar sx={{ bgcolor: '#eff6ff', color: '#3b82f6', width: 52, height: 52, mx: 'auto', mb: 1.5 }}>
            <KeyIcon sx={{ fontSize: 30 }} />
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Password Baru Berhasil Dibuat
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Sistem telah memilih 1 dari 4 opsi password resmi
          </Typography>
        </DialogTitle>

        <DialogContent dividers sx={{ py: 2.5 }}>
          <Stack spacing={2}>
            <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                INFORMASI GURU
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {generatedResultPopup?.teacherName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Username: <strong>{generatedResultPopup?.username}</strong>
              </Typography>
            </Box>

            <Box sx={{ bgcolor: '#ecfdf5', border: '1px solid #10b981', p: 2, borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: '#065f46', fontWeight: 700, textTransform: 'uppercase' }}>
                Password Yang Diterapkan
              </Typography>
              <Typography variant="h5" sx={{ fontFamily: 'monospace', fontWeight: 800, color: '#047857', my: 0.5, letterSpacing: 1 }}>
                {generatedResultPopup?.chosenPassword}
              </Typography>
              <Typography variant="caption" sx={{ color: '#065f46' }}>
                (Salah satu dari: Guru@123, @Guru123, @Guru2026, Guru@2026)
              </Typography>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ContentCopyIcon />}
            onClick={() => generatedResultPopup && handleCopySinglePassword(generatedResultPopup.chosenPassword)}
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
          >
            Salin Password
          </Button>
          <Button
            variant="contained"
            onClick={() => setGeneratedResultPopup(null)}
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700 }}
          >
            Selesai
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Account Modal */}
      <Dialog
        open={Boolean(editingAccount)}
        onClose={() => !savingEdit && setEditingAccount(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <DialogTitle component="div" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
              <KeyIcon fontSize="small" />
            </Avatar>
            <Box>
              <Typography variant="h6" component="div" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                Edit Akun Guru
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {editingAccount?.teacher_name || editingAccount?.name}
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setEditingAccount(null)} disabled={savingEdit}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ py: 2.5 }}>
          <Stack spacing={2.5}>
            <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                INFORMASI GURU
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5 }}>
                {editingAccount?.teacher_name || editingAccount?.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {editingAccount?.teacher_nip || editingAccount?.nip ? `NIP: ${editingAccount?.teacher_nip || editingAccount?.nip}` : 'Tanpa NIP (Username Nama)'}
              </Typography>
            </Box>

            <TextField
              label="Username"
              fullWidth
              size="small"
              value={editForm.username}
              onChange={e => setEditForm(prev => ({ ...prev, username: e.target.value }))}
              helperText="Username digunakan oleh guru saat login ke Portal Guru Piket"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon fontSize="small" color="action" />
                    </InputAdornment>
                  )
                }
              }}
            />

            <Box>
              <TextField
                label="Password Akun"
                fullWidth
                size="small"
                type={showEditPassword ? 'text' : 'password'}
                value={editForm.password}
                onChange={e => setEditForm(prev => ({ ...prev, password: e.target.value, chosenOptionNote: '' }))}
                helperText={editForm.chosenOptionNote || "Pilih salah satu dari 4 opsi password di bawah atau masukkan password manual"}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <KeyIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowEditPassword(prev => !prev)}>
                          {showEditPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                        <Button
                          size="small"
                          onClick={handleAutoPickPresetInEdit}
                          startIcon={<ShuffleIcon fontSize="small" />}
                          sx={{ ml: 1, textTransform: 'none', fontSize: '0.75rem', fontWeight: 600 }}
                        >
                          Pilih Acak (1 dari 4)
                        </Button>
                      </InputAdornment>
                    )
                  }
                }}
              />

              {/* 4 Password Presets Chips */}
              <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  4 Pilihan Password:
                </Typography>
                {PASSWORD_PRESETS.map((preset, idx) => (
                  <Chip
                    key={preset}
                    label={`Opsi ${idx + 1}: ${preset}`}
                    size="small"
                    clickable
                    color={editForm.password === preset ? 'primary' : 'default'}
                    variant={editForm.password === preset ? 'filled' : 'outlined'}
                    onClick={() => {
                      setEditForm(prev => ({
                        ...prev,
                        password: preset,
                        chosenOptionNote: `Sistem memilih opsi #${idx + 1}: "${preset}"`
                      }));
                      setShowEditPassword(true);
                    }}
                    sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.75rem' }}
                  />
                ))}
              </Box>
            </Box>

            <Divider />

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Status Akses Akun Guru
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {editForm.status === 'AKTIF' ? 'Akun AKTIF (Guru dapat login ke Portal Piket)' : 'Akun NONAKTIF (Akses login diblokir)'}
                </Typography>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={editForm.status === 'AKTIF'}
                    onChange={e => setEditForm(prev => ({ ...prev, status: e.target.checked ? 'AKTIF' : 'NONAKTIF' }))}
                    color="success"
                  />
                }
                label={
                  <Chip
                    label={editForm.status}
                    size="small"
                    color={editForm.status === 'AKTIF' ? 'success' : 'error'}
                    sx={{ fontWeight: 700 }}
                  />
                }
                sx={{ m: 0 }}
              />
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setEditingAccount(null)}
            disabled={savingEdit}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Batal
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEdit}
            disabled={savingEdit}
            startIcon={savingEdit ? <CircularProgress size={16} /> : <CheckCircleIcon />}
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
          >
            {savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mass Regenerate Confirmation Dialog */}
      <Dialog
        open={massRegenerateDialogOpen}
        onClose={() => setMassRegenerateDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <DialogTitle component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'secondary.main', fontWeight: 700 }}>
          <AutoFixHighIcon />
          Generate Ulang Semua Password?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            Sistem akan secara otomatis <strong>memilih salah satu dari 4 opsi password resmi</strong> dan menerapkannya ke seluruh <strong>{totalAccounts} akun guru</strong>:
          </Typography>
          <Stack spacing={0.5} sx={{ mb: 2, bgcolor: 'action.hover', p: 1.5, borderRadius: 2 }}>
            {PASSWORD_PRESETS.map((p, idx) => (
              <Typography key={p} variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                {idx + 1}. {p}
              </Typography>
            ))}
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Setelah proses selesai, sistem akan menampilkan password yang terpilih untuk Anda salin atau bagikan ke guru piket.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setMassRegenerateDialogOpen(false)}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Batal
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleMassRegenerate}
            startIcon={<AutoFixHighIcon />}
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
          >
            Ya, Generate Ulang Semua
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
