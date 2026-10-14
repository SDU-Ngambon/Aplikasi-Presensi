import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import * as XLSX from 'xlsx';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';

// MUI Imports
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Typography,
  Button,
  TextField,
  Paper,
  IconButton,
  Grid,
  LinearProgress,
  Collapse,
  Stack,
  InputAdornment,
  Chip,
  Card
} from '@mui/material';

// Icons
import {
  Add as AddIcon,
  FileUpload as UploadIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FileDownload as DownloadIcon,
  Settings as SettingsIcon,
  Description as FileDownIcon
} from '@mui/icons-material';

export default function StudentsDB() {
  const [students, setStudents] = useState<any[]>([]);
  const [filterYear, setFilterYear] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showCustomFieldsSettings, setShowCustomFieldsSettings] = useState(false);
  const [settings, setSettings] = useState<any>({ studentCustomFields: [] });
  
  const [newStudent, setNewStudent] = useState<any>({ name: '', nisn: '', nis: '', class: '', year: '', customFields: {} });
  const [newFieldName, setNewFieldName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(-1);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [imageRefreshKey, setImageRefreshKey] = useState(Date.now());

  const fetchData = async () => {
    try {
      const [stRes, setRes] = await Promise.all([
          axios.get('/api/students'),
          axios.get('/api/settings')
      ]);
      setStudents(stRes.data);
      setSettings(setRes.data || { studentCustomFields: [] });
    } catch (e) {
      console.error(e);
      setStudents([]);
      setSettings({ studentCustomFields: [] });
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await axios.post('/api/students', newStudent);
    setIsAdding(false);
    setNewStudent({ name: '', nisn: '', nis: '', class: '', year: '', customFields: {} });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus?')) {
      await axios.delete(`/api/students/${id}`);
      fetchData();
    }
  };

  const exportExcel = () => {
     // Prepare data mapping custom fields to columns
     const dataToExport = filtered.map(s => {
         const base = {
             Nama: s.name,
             NISN: s.nisn,
             NIS: s.nis,
             Kelas: s.class,
             Angkatan: s.year
         };
         if (s.customFields) {
             Object.keys(s.customFields).forEach(k => {
                 (base as any)[`Custom_${k}`] = s.customFields[k];
             });
         }
         return base;
     });
     const ws = XLSX.utils.json_to_sheet(dataToExport);
     const wb = XLSX.utils.book_new();
     XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");
     XLSX.writeFile(wb, "Data_Siswa.xlsx");
  };

  const downloadTemplate = () => {
     const baseRow: any = {
         Nama: 'Budi Santoso',
         NISN: '0012345678',
         NIS: '232410101',
         Kelas: '10 RPL 1',
         Angkatan: '2023/2024'
     };
     if (settings.studentCustomFields) {
         settings.studentCustomFields.forEach((k: string) => {
             baseRow[k] = '';
         });
     }
     const ws = XLSX.utils.json_to_sheet([baseRow]);
     const wb = XLSX.utils.book_new();
     XLSX.utils.book_append_sheet(wb, ws, "Format Import");
     XLSX.writeFile(wb, "Format_Import_Siswa.xlsx");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (evt) => {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);

          const studentsToImport = data.map((row: any) => {
              const customFields: Record<string, string> = {};
              if (settings.studentCustomFields) {
                  settings.studentCustomFields.forEach((k: string) => {
                      if (row[k] !== undefined) customFields[k] = String(row[k]);
                  });
              }
              return {
                  name: String(row.Nama || ''),
                  nisn: String(row.NISN || ''),
                  nis: String(row.NIS || ''),
                  class: String(row.Kelas || ''),
                  year: String(row.Angkatan || ''),
                  customFields
              };
          }).filter(s => s.name && s.nisn);

          if (studentsToImport.length > 0) {
              await axios.post('/api/import/students', { students: studentsToImport }, {
                  onUploadProgress: (progressEvent) => {
                      const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
                      setUploadProgress(percentCompleted);
                  }
              });
              fetchData();
              setUploadProgress(-1);
              toast.success(`Berhasil import ${studentsToImport.length} data siswa.`);
          } else {
              toast.error('Tidak ada data valid yang ditemukan untuk diimport. Pastikan format kolom sesuai dengan template.');
          }
      };
      reader.readAsBinaryString(file);
      e.target.value = '';
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.name.endsWith('.zip')) {
          toast.error('Harap unggah file .zip');
          return;
      }

      const formData = new FormData();
      formData.append('zipfile', file);

      try {
          setUploadProgress(0);
          const { data } = await axios.post('/api/students/upload-photos', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
              onUploadProgress: (progressEvent) => {
                  const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
                  setUploadProgress(percentCompleted);
              }
          });
          
          if (data.unmatchedNISN?.length === 0 && data.invalidFormat?.length === 0) {
              toast.success(`Semua foto berhasil di-import (${data.successCount} foto).`);
          } else {
              let msg = `Berhasil meng-import ${data.successCount} foto.\n`;
              if (data.unmatchedNISN?.length > 0) {
                  msg += `NISN tidak ditemukan: ${data.unmatchedNISN.join(', ')}.\n`;
              }
              if (data.invalidFormat?.length > 0) {
                  msg += `Format salah: ${data.invalidFormat.join(', ')}.`;
              }
              toast.error(msg, { duration: 6000 });
          }
      } catch (err: any) {
          toast.error(err.response?.data?.error || 'Gagal mengunggah foto');
      } finally {
          setUploadProgress(-1);
          if (zipInputRef.current) zipInputRef.current.value = '';
          setImageRefreshKey(Date.now());
          fetchData(); // In case we want to trigger re-render of images
      }
  };

  const addCustomField = async () => {
      if (!newFieldName.trim()) return;
      const updatedFields = [...(settings.studentCustomFields || []), newFieldName.trim()];
      try {
          const { data } = await axios.post('/api/settings', { ...settings, studentCustomFields: updatedFields });
          setSettings(data);
          setNewFieldName('');
      } catch (error: any) {
          toast.error('Gagal menambah atribut: ' + (error.response?.data?.error || error.message));
      }
  };

  const removeCustomField = async (name: string) => {
      const updatedFields = (settings.studentCustomFields || []).filter((f: string) => f !== name);
      try {
          const { data } = await axios.post('/api/settings', { ...settings, studentCustomFields: updatedFields });
          setSettings(data);
      } catch (error: any) {
          toast.error('Gagal menghapus atribut: ' + (error.response?.data?.error || error.message));
      }
  };

  const filtered = (students || []).filter(s => {
    if (!s) return false;
    const yearMatch = filterYear ? String(s.year || '') === String(filterYear) : true;
    const classMatch = filterClass ? String(s.class || '').toLowerCase().includes(filterClass.toLowerCase()) : true;
    return yearMatch && classMatch;
  });

  const columns: GridColDef[] = [
    {
      field: 'photo',
      headerName: 'FOTO',
      width: 70,
      renderCell: (params: GridRenderCellParams) => {
        const photoUrl = params?.row?.photo 
            ? (params.row.photo.startsWith('http') ? params.row.photo : `/uploads/photos/${params.row.photo.replace('photos/', '')}?t=${imageRefreshKey}`) 
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(params?.row?.name || 'Siswa')}&background=random`;
            
        return (
          <Box
            component="img"
            src={photoUrl}
            alt="foto"
            onError={(e: any) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(params?.row?.name || 'Siswa')}&background=random`;
            }}
            sx={{ width: 40, height: 48, objectFit: 'cover', borderRadius: 1, boxShadow: 1, mt: 0.5 }}
          />
        );
      },
      sortable: false,
      filterable: false,
    },
    { field: 'name', headerName: 'NAMA', flex: 1, minWidth: 150 },
    { 
      field: 'nisn_nis', 
      headerName: 'NISN / NIS', 
      width: 140,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
          <Typography variant="body2" sx={{ lineHeight: 1.2 }}>{params.row.nisn}</Typography>
          <Typography variant="caption" color="text.secondary">{params.row.nis}</Typography>
        </Box>
      )
    },
    { field: 'class', headerName: 'KELAS', width: 120 },
    { field: 'year', headerName: 'ANGKATAN', width: 120 },
    ...(settings.studentCustomFields || []).map((f: string) => ({
      field: `custom_${f}`,
      headerName: f.toUpperCase(),
      width: 130,
      valueGetter: (value: any, row: any) => row?.customFields?.[f] || '-'
    })),
    {
      field: 'qrCode',
      headerName: 'KODE (QR & BARCODE)',
      width: 250,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams) => (
         <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', height: '100%', justifyContent: 'center' }}>
            <Paper elevation={1} sx={{ display: 'inline-flex', padding: 0.5, bgcolor: 'background.paper' }}>
               {params.row.qrCode ? <QRCodeSVG value={params.row.qrCode} size={30} /> : <Box sx={{ width: 30, height: 30 }} />}
            </Paper>
            <Paper elevation={1} sx={{ display: 'inline-flex', padding: 0.5, bgcolor: 'background.paper', overflow: 'hidden', alignItems: 'center' }}>
               {params.row.qrCode ? <Barcode value={params.row.qrCode} format="CODE128" width={1} height={30} displayValue={false} background="transparent" margin={0} /> : <Box sx={{ width: 60, height: 30 }} />}
            </Paper>
         </Box>
      )
    },
    {
      field: 'actions',
      headerName: 'AKSI',
      width: 80,
      align: 'right',
      headerAlign: 'right',
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams) => (
         <IconButton size="small" color="error" onClick={() => handleDelete(params.row.id)}>
           <DeleteIcon fontSize="small" />
         </IconButton>
      )
    }
  ];

  return (
    <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }} color="text.primary">
          Database Siswa
        </Typography>
         <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }} >
           <Button 
             variant="contained" 
             color="success" 
             startIcon={<DownloadIcon />}
             onClick={exportExcel}
           >
             Export Excel
           </Button>
           
           
           <Button 
             variant="outlined" 
             color="inherit" 
             startIcon={<SettingsIcon />}
             onClick={() => setShowCustomFieldsSettings(!showCustomFieldsSettings)}
           >
             Atribut Info
           </Button>
           <Button 
             variant="contained" 
             color="secondary" 
             startIcon={<UploadIcon />}
             onClick={() => setImportDialogOpen(true)}
           >
             Import Massal
           </Button>
           <Button 
             variant="contained" 
             color="primary" 
             startIcon={<AddIcon />}
             onClick={() => setIsAdding(!isAdding)}
           >
             Tambah Siswa
           </Button>
        </Stack>
      </Box>

      

      
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import Massal Data & Foto</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }} gutterBottom>1. Import Data Siswa (Excel)</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Gunakan template Excel yang tersedia untuk import data siswa sekaligus.
                </Typography>
                <Stack direction="row" spacing={2}>
                   <Button 
             variant="outlined" 
             color="inherit" 
             startIcon={<FileDownIcon />}
             onClick={downloadTemplate}
           >
             Template Import
           </Button>
                   <Button component="label" variant="contained" startIcon={<UploadIcon />}> Upload File Excel <input type="file" hidden accept=".xlsx,.xls" onChange={handleImport} /></Button>
                </Stack>
            </Box>
            
            <Divider />

            <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }} gutterBottom>2. Import Foto Siswa (ZIP)</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Upload file .zip berisi foto-foto siswa dengan nama file menggunakan NISN (contoh: 12345678.jpg).
                </Typography>
                <Button component="label" variant="contained" color="secondary" startIcon={<UploadIcon />}> Upload File ZIP <input type="file" hidden accept=".zip" onChange={handlePhotoUpload} /></Button>
                
                {uploadProgress >= 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="info.dark" sx={{ fontWeight: 'medium' }}>Mengunggah...</Typography>
                        <Typography variant="body2" color="info.dark" sx={{ fontWeight: 'medium' }}>{uploadProgress}%</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 10, borderRadius: 5 }} />
                  </Box>
                )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Tutup</Button>
        </DialogActions>
      </Dialog>
      
      <Collapse in={showCustomFieldsSettings}>
          <Paper elevation={0} sx={{ p: 3, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200', borderRadius: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} color="warning.900" gutterBottom>Pengaturan Atribut Tambahan (Opsional)</Typography>
              <Typography variant="body2" color="warning.800" sx={{ mb: 2 }}>Tambahkan atribut data siswa selain data wajib. Ini otomatis memperbarui format Export/Import.</Typography>
              
              <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                  <TextField 
                    size="small"
                    placeholder="Nama Atribut (Contoh: Alamat)" 
                    value={newFieldName} 
                    onChange={e => setNewFieldName(e.target.value)} 
                    sx={{ flexGrow: 1, bgcolor: 'background.paper', borderRadius: 1 }}
                  />
                  <Button variant="contained" color="warning" onClick={addCustomField}>Tambah</Button>
              </Stack>
              
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }} >
                  {(settings.studentCustomFields || []).map((f: string) => (
                      <Chip
                        key={f}
                        label={f}
                        onDelete={() => removeCustomField(f)}
                        deleteIcon={<DeleteIcon />}
                        sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'warning.300' }}
                      />
                  ))}
                  {(settings.studentCustomFields || []).length === 0 && <Typography variant="body2" color="warning.700" sx={{ fontStyle: 'italic' }}>Belum ada atribut tambahan</Typography>}
              </Stack>
          </Paper>
      </Collapse>

      <Collapse in={isAdding}>
        <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 3 }}>Input Siswa Baru</Typography>
          <form onSubmit={handleAdd}>
             <Grid container spacing={2}>
                 <Grid size={{ xs: 12, sm: 6, md: 2.4 }} >
                   <TextField required fullWidth size="small" label="Nama Lengkap" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} />
                 </Grid>
                 <Grid size={{ xs: 12, sm: 6, md: 2.4 }} >
                   <TextField required fullWidth size="small" label="NISN" value={newStudent.nisn} onChange={e => setNewStudent({...newStudent, nisn: e.target.value})} />
                 </Grid>
                 <Grid size={{ xs: 12, sm: 6, md: 2.4 }} >
                   <TextField required fullWidth size="small" label="NIS" value={newStudent.nis} onChange={e => setNewStudent({...newStudent, nis: e.target.value})} />
                 </Grid>
                 <Grid size={{ xs: 12, sm: 6, md: 2.4 }} >
                   <TextField required fullWidth size="small" label="Kelas (Misal: 10 RPL 1)" value={newStudent.class} onChange={e => setNewStudent({...newStudent, class: e.target.value})} />
                 </Grid>
                 <Grid size={{ xs: 12, sm: 6, md: 2.4 }} >
                   <TextField required fullWidth size="small" label="Tahun Angkatan" value={newStudent.year} onChange={e => setNewStudent({...newStudent, year: e.target.value})} />
                 </Grid>
             </Grid>
             
             {(settings.studentCustomFields || []).length > 0 && (
                 <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'grey.100' }}>
                   <Grid container spacing={2}>
                       {(settings.studentCustomFields || []).map((f: string) => (
                           <Grid size={{ xs: 12, sm: 6, md: 4 }} key={f}>
                              <TextField fullWidth size="small" label={`Atribut: ${f}`} value={newStudent.customFields[f] || ''} onChange={e => setNewStudent({...newStudent, customFields: {...newStudent.customFields, [f]: e.target.value}})} />
                           </Grid>
                       ))}
                   </Grid>
                 </Box>
             )}
            <Box sx={{ mt: 3 }}>
               <Button type="submit" variant="contained" color="primary">Simpan</Button>
            </Box>
          </form>
        </Paper>
      </Collapse>

      <Card sx={{ display: 'flex', flexDirection: 'column', height: 600, mt: 3, overflow: 'visible' }}>
         <Box sx={{
             mt: -3,
             mx: 2,
             p: 3,
             background: 'linear-gradient(195deg, #49a3f1, #1A73E8)',
             borderRadius: '8px',
             boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.14), 0 7px 10px -5px rgba(26, 115, 232, 0.4)'
         }}>
             <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                 Data Siswa & Presensi
             </Typography>
         </Box>
         
         <Box sx={{ p: 3, pt: 2, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
             <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200', borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <Stack direction="row" spacing={2}>
                   <TextField 
                     size="small" 
                     placeholder="Filter Angkatan" 
                     value={filterYear}
                     onChange={e => setFilterYear(e.target.value)}
                     slotProps={{ input: { 
                       startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                      } }}
                     sx={{ bgcolor: 'background.paper', width: 180 }}
                   />
                   <TextField 
                     size="small" 
                     placeholder="Filter Kelas" 
                     value={filterClass}
                     onChange={e => setFilterClass(e.target.value)}
                     slotProps={{ input: { 
                       startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                      } }}
                     sx={{ bgcolor: 'background.paper', width: 180 }}
                   />
               </Stack>
               <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'medium' }}>Total: {filtered.length} Siswa</Typography>
             </Box>
             
             <Box sx={{ flexGrow: 1, width: '100%' }}>
                <DataGrid
                  rows={filtered}
                  columns={columns}
                  rowHeight={60}
                  disableRowSelectionOnClick
                />
             </Box>
         </Box>
      </Card>
    </Box>
  );
}
