import toast, { Toaster } from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CardTemplate from '../../components/CardTemplate';

// MUI Imports
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Card,
  Slider,
  Stack
} from '@mui/material';

// Icons
import {
  Upload as UploadIcon,
  Save as SaveIcon,
  Mouse as MousePointerClickIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

const AlphaColorPicker = ({ label, value, onChange }: any) => {
    const isTrans = value === 'transparent' || value === 'rgba(0,0,0,0)' || value === 'rgba(0, 0, 0, 0)';
    // Pastikan valid hex untuk input color HTML
    const getHexColor = (val: string) => {
        if (!val) return '#ffffff';
        if (val.startsWith('#')) return val.substring(0, 7);
        return '#ffffff';
    };
    return (
        <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'medium', display: "block", mb: 0.5 }}>{label}</Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <input 
                    type="color" 
                    value={isTrans ? '#ffffff' : getHexColor(value)} 
                    onChange={e => onChange(e.target.value)} 
                    disabled={isTrans}
                    style={{ width: '40px', height: '36px', padding: '0', border: '1px solid #ccc', borderRadius: '4px', cursor: isTrans ? 'not-allowed' : 'pointer' }} 
                />
                <TextField 
                    size="small" 
                    value={value || ''} 
                    onChange={e => onChange(e.target.value)} 
                    disabled={isTrans}
                    sx={{ flexGrow: 1 }}
                    placeholder="Hex / rgba()"
                />
            </Stack>
            <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <input 
                    type="checkbox" 
                    id={`trans-${label.replace(/\s+/g,'-')}`} 
                    checked={isTrans} 
                    onChange={e => onChange(e.target.checked ? 'transparent' : '#ffffff')}
                    style={{ cursor: 'pointer' }}
                />
                <label htmlFor={`trans-${label.replace(/\s+/g,'-')}`} style={{ fontSize: '12px', cursor: 'pointer' }}>Jadikan Transparan</label>
            </Box>
        </Box>
    );
};

export const defaultLayout = {
      headerBg: { x: 0, y: 0, w: 324, h: 50 },
      logoLeft: { x: 10, y: 5, w: 40, h: 40 },
      logoRight: { x: 274, y: 5, w: 40, h: 40 },
      headerText: { x: 55, y: 5, w: 214, h: 40 },
      subtitleText: { x: 0, y: 50, w: 324, h: 18 },
      photo: { x: 10, y: 80, w: 75, h: 95 },
      qrCode: { x: 17, y: 180, w: 60, h: 60 },
      identity: { x: 95, y: 80, w: 220, h: 80 },
      signatureText: { x: 160, y: 155, w: 150, h: 60 },
      signature: { x: 175, y: 180, w: 120, h: 40 },
      customImage: { x: 10, y: 200, w: 40, h: 40 }
};

export const defaultDesignState = {
    width: 85.6,
    height: 54, 
    unit: 'mm',
    fontFamily: 'sans-serif',
    titleSize: 18,
    textSize: 12, // legacy if needed
    headerTextColor: '#ffffff',
    headerTextAlign: 'center',
    headerTextWeight: 'bold',
    subtitleTextSize: 10,
    subtitleFontFamily: 'sans-serif',
    subtitleTextColor: '#ffffff',
    subtitleTextAlign: 'center',
    subtitleTextWeight: 'normal',
    identityTextSize: 12,
    identityTextColor: '#000000',
    identityTextAlign: 'left',
    identityTextWeight: 'normal',
    headmasterTextSize: 10,
    headmasterTextColor: '#000000',
    headmasterTextAlign: 'center',
    headmasterTextWeight: 'normal',
    bgColor: '#ffffff',
    headerColor: '#1e40af',
    subHeaderBgColor: '#1e40af',
    headerText1: 'KARTU PELAJAR',
    headerText2: 'SMK NEGERI 1',
    subtitleText: 'Alamat: Jl. Raya Pendidikan No. 123',
    headmasterName: 'Drs. Setiawan, M.Pd',
    headmasterNip: '19700101 199503 1 001',
    customTexts: [],
    layout: defaultLayout
};

export const defaultImagesState = {
    logoLeft: '',
    logoRight: '',
    signature: '',
    customImage: '',
    background: ''
};

export default function CardDesign() {
  const [design, setDesign] = useState<any>(defaultDesignState);

  const [images, setImages] = useState<any>(defaultImagesState);
  const [barcodeType, setBarcodeType] = useState("qrcode");

  useEffect(() => {
     axios.get('/api/settings').then(({ data }) => {
         if (data && data.barcodeType) { setBarcodeType(data.barcodeType); }
         if (data && data.cardDesign) {
             setDesign({ ...design, ...data.cardDesign });
         }
         if (data && data.cardImages) {
             setImages({ ...images, ...data.cardImages });
         }
     }).catch((e) => console.error(e));
  }, []);

  const handleSave = async () => {
      try {
         const { data: settings } = await axios.get('/api/settings');
         await axios.post('/api/settings', { ...settings, cardDesign: design, cardImages: images });
         toast.success('Desain berhasil disimpan!');
      } catch (e: any) {
         toast.error('Gagal menyimpan desain: ' + (e.response?.data?.error || e.message));
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
          const img = new Image();
          img.onload = () => {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;
              
              const maxSize = 800; // max size for card assets

              if (width > maxSize || height > maxSize) {
                  if (width > height) {
                      height = Math.round((height * maxSize) / width);
                      width = maxSize;
                  } else {
                      width = Math.round((width * maxSize) / height);
                      height = maxSize;
                  }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                  ctx.drawImage(img, 0, 0, width, height);
                  const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                  const dataUrl = canvas.toDataURL(mimeType, 0.8);
                  setImages((prev: any) => ({ ...prev, [key]: dataUrl }));
              } else {
                  setImages((prev: any) => ({ ...prev, [key]: reader.result as string }));
              }
          };
          img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const updateLayout = (key: string, field: 'x'|'y'|'w'|'h' | null, val: number | any) => {
     setDesign((prev: any) => {
         if (field === null) {
             return {
                 ...prev,
                 layout: {
                     ...prev.layout,
                     [key]: {
                         ...(prev.layout?.[key] || {}),
                         ...val
                     }
                 }
             };
         }
         return {
             ...prev,
             layout: {
                 ...prev.layout,
                 [key]: {
                     ...(prev.layout?.[key] || {}),
                     [field]: val
                 }
             }
         };
     });
  };

  const internalScale = design.unit === 'mm' ? 3.78 : (design.unit === 'cm' ? 37.8 : 1);
  const pxWidth = design.width * internalScale;
  const pxHeight = design.height * internalScale;
  const previewScale = 2; // Perbesar tampilan kanvas hingga 2x

  return (
    <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <Typography variant="h5" sx={{ fontWeight: 'bold' }} color="text.primary">
           Desain Kartu Pelajar
         </Typography>
         <Button variant="contained" color="primary" startIcon={<SaveIcon />} onClick={handleSave}>
            Simpan Desain
         </Button>
      </Box>
      
      {/* Live Preview Area */}
      <Box sx={{ mb: 4 }}>
          <Card sx={{ mt: 3, overflow: 'visible', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{
                mt: -3,
                mx: 2,
                p: 3,
                background: 'linear-gradient(195deg, #49a3f1, #1A73E8)',
                borderRadius: '8px',
                boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.14), 0 7px 10px -5px rgba(26, 115, 232, 0.4)'
            }}>
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                    Preview Kartu
                </Typography>
            </Box>
            <Box sx={{ p: 3, width: '100%', bgcolor: 'grey.200', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflowX: 'auto', minHeight: 600, position: 'relative' }}>
           <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'medium', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <MousePointerClickIcon fontSize="small" />
              Geser & Sesuaikan posisi (Drag & Drop) di dalam Kanvas Biru
           </Typography>
           
           <Box sx={{ position: 'relative', boxShadow: 6, flexShrink: 0, width: pxWidth * previewScale, height: pxHeight * previewScale }}>
               <CardTemplate 
                 design={design} 
                 images={images} 
                 student={null} 
                 scale={previewScale}
                 barcodeType={barcodeType} 
                 onLayoutChange={(k: string, r: any) => updateLayout(k, null as any, r as any)} 
               />
           </Box>
                  </Box>
          </Card>
      </Box>

      {/* Designer Settings Panel */}
      <Grid container spacing={3}>
             
           <Grid size={{ xs: 12, md: 6, lg: 4 }}>
             <Card sx={{ height: '100%', mt: 3, overflow: 'visible', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{
                    mt: -3,
                    mx: 2,
                    p: 2,
                    background: 'linear-gradient(195deg, #49a3f1, #1A73E8)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.14), 0 7px 10px -5px rgba(26, 115, 232, 0.4)'
                }}>
                    <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold' }}>
                        Dimensi & Latar
                    </Typography>
                </Box>
                <Box sx={{ p: 3, pt: 2, flexGrow: 1 }}>
                <Stack spacing={2}>
                   <Stack direction="row" spacing={2}>
                     <FormControl fullWidth size="small">
                       <InputLabel>Satuan</InputLabel>
                       <Select label="Satuan" value={design.unit} onChange={e => setDesign({...design, unit: e.target.value as string})}>
                         <MenuItem value="mm">Milimeter (mm)</MenuItem>
                         <MenuItem value="cm">Centimeter (cm)</MenuItem>
                         <MenuItem value="px">Pixels (px)</MenuItem>
                       </Select>
                     </FormControl>
                   </Stack>
                   <Stack direction="row" spacing={2}>
                     <TextField label="Lebar" type="number" size="small" fullWidth slotProps={{ htmlInput: { step: "0.1" } }} value={design.width} onChange={e => setDesign({...design, width: Number(e.target.value)})} />
                     <TextField label="Tinggi" type="number" size="small" fullWidth slotProps={{ htmlInput: { step: "0.1" } }} value={design.height} onChange={e => setDesign({...design, height: Number(e.target.value)})} />
                   </Stack>
                   <Box>
                     <AlphaColorPicker label="Warna Background (Solid)" value={design.bgColor} onChange={(val: string) => setDesign({...design, bgColor: val})} />
                   </Box>
                   <Box>
                      <Button variant="outlined" color="inherit" component="label" fullWidth startIcon={<UploadIcon />}>
                        Upload Background
                        <input type="file" hidden accept="image/*" onChange={e => handleImageUpload(e, 'background')} />
                      </Button>
                      {images.background && (
                         <Button color="error" size="small" fullWidth sx={{ mt: 1, textTransform: 'none', textDecoration: 'underline' }} onClick={() => setImages((p: any) => ({...p, background: ''}))}>
                            Hapus Gambar Latar
                         </Button>
                      )}
                   </Box>
                </Stack>
                </Box>
             </Card>
           </Grid>

             
           <Grid size={{ xs: 12, md: 6, lg: 4 }}>
             <Card sx={{ height: '100%', mt: 3, overflow: 'visible', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{
                    mt: -3,
                    mx: 2,
                    p: 2,
                    background: 'linear-gradient(195deg, #49a3f1, #1A73E8)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.14), 0 7px 10px -5px rgba(26, 115, 232, 0.4)'
                }}>
                    <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold' }}>
                        Header & Teks
                    </Typography>
                </Box>
                <Box sx={{ p: 3, pt: 2, flexGrow: 1 }}>
                <Stack spacing={2}>
                   <Box>
                     <AlphaColorPicker label="Warna Header" value={design.headerColor} onChange={(val: string) => setDesign({...design, headerColor: val})} />
                   </Box>
                   <TextField label="Baris 1 Header" size="small" fullWidth value={design.headerText1} onChange={e => setDesign({...design, headerText1: e.target.value})} />
                   <TextField label="Baris 2 Header" size="small" fullWidth value={design.headerText2} onChange={e => setDesign({...design, headerText2: e.target.value})} />
                   <TextField label="Sub Judul Bawah Header" size="small" fullWidth value={design.subtitleText} onChange={e => setDesign({...design, subtitleText: e.target.value})} />
                </Stack>
                </Box>
             </Card>
           </Grid>

             
           <Grid size={{ xs: 12, md: 6, lg: 4 }}>
             <Card sx={{ height: '100%', mt: 3, overflow: 'visible', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{
                    mt: -3,
                    mx: 2,
                    p: 2,
                    background: 'linear-gradient(195deg, #49a3f1, #1A73E8)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.14), 0 7px 10px -5px rgba(26, 115, 232, 0.4)'
                }}>
                    <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold' }}>
                        Informasi Tanda Tangan
                    </Typography>
                </Box>
                <Box sx={{ p: 3, pt: 2, flexGrow: 1 }}>
                <Stack spacing={2}>
                   <TextField label="Nama Kepala Sekolah" size="small" fullWidth value={design.headmasterName} onChange={e => setDesign({...design, headmasterName: e.target.value})} />
                   <TextField label="NIP Kepala Sekolah" size="small" fullWidth value={design.headmasterNip} onChange={e => setDesign({...design, headmasterNip: e.target.value})} />
                </Stack>
                </Box>
             </Card>
           </Grid>

             
           <Grid size={{ xs: 12, md: 6, lg: 4 }}>
             <Card sx={{ height: '100%', mt: 3, overflow: 'visible', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{
                    mt: -3,
                    mx: 2,
                    p: 2,
                    background: 'linear-gradient(195deg, #49a3f1, #1A73E8)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.14), 0 7px 10px -5px rgba(26, 115, 232, 0.4)'
                }}>
                    <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold' }}>
                        Pengaturan Style Header
                    </Typography>
                </Box>
                <Box sx={{ p: 3, pt: 2, flexGrow: 1 }}>
                <Stack spacing={2}>
                   <Box>
                      <Typography gutterBottom>Ukuran Font Header ({design.titleSize}px)</Typography>
                      <Slider value={design.titleSize} onChange={(e, val) => setDesign({...design, titleSize: val as number})} min={8} max={72} />
                   </Box>
                   <Box>
                      <AlphaColorPicker label="Warna Font Header" value={design.headerTextColor} onChange={(val: string) => setDesign({...design, headerTextColor: val})} />
                   </Box>
                   <FormControl fullWidth size="small">
                      <InputLabel>Alignment Header</InputLabel>
                      <Select label="Alignment Header" value={design.headerTextAlign} onChange={e => setDesign({...design, headerTextAlign: e.target.value as string})}>
                        <MenuItem value="left">Kiri</MenuItem>
                        <MenuItem value="center">Tengah</MenuItem>
                        <MenuItem value="right">Kanan</MenuItem>
                      </Select>
                   </FormControl>
                   <FormControl fullWidth size="small">
                      <InputLabel>Style Header</InputLabel>
                      <Select label="Style Header" value={design.headerTextWeight || 'bold'} onChange={e => setDesign({...design, headerTextWeight: e.target.value as string})}>
                        <MenuItem value="normal">Normal</MenuItem>
                        <MenuItem value="bold">Bold</MenuItem>
                        <MenuItem value="italic">Italic</MenuItem>
                      </Select>
                   </FormControl>
                </Stack>
                </Box>
             </Card>
           </Grid>

             
           <Grid size={{ xs: 12, md: 6, lg: 4 }}>
             <Card sx={{ height: '100%', mt: 3, overflow: 'visible', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{
                    mt: -3,
                    mx: 2,
                    p: 2,
                    background: 'linear-gradient(195deg, #49a3f1, #1A73E8)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.14), 0 7px 10px -5px rgba(26, 115, 232, 0.4)'
                }}>
                    <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold' }}>
                        Pengaturan Style Subtitle
                    </Typography>
                </Box>
                <Box sx={{ p: 3, pt: 2, flexGrow: 1 }}>
                <Stack spacing={2}>
                   <Box>
                      <Typography gutterBottom>Ukuran Font Subtitle ({design.subtitleTextSize || 10}px)</Typography>
                      <Slider value={design.subtitleTextSize || 10} onChange={(e, val) => setDesign({...design, subtitleTextSize: val as number})} min={8} max={72} />
                   </Box>
                   <FormControl fullWidth size="small">
                      <InputLabel>Jenis Font Subtitle</InputLabel>
                      <Select label="Jenis Font Subtitle" value={design.subtitleFontFamily || 'sans-serif'} onChange={e => setDesign({...design, subtitleFontFamily: e.target.value as string})}>
                        <MenuItem value="sans-serif">Sans Serif</MenuItem>
                        <MenuItem value="serif">Serif</MenuItem>
                        <MenuItem value="monospace">Monospace</MenuItem>
                      </Select>
                   </FormControl>
                   <Box>
                      <AlphaColorPicker label="Warna Font Subtitle" value={design.subtitleTextColor} onChange={(val: string) => setDesign({...design, subtitleTextColor: val})} />
                   </Box>
                   <Box>
                      <AlphaColorPicker label="Warna Background Subtitle" value={design.subHeaderBgColor !== undefined ? design.subHeaderBgColor : design.headerColor} onChange={(val: string) => setDesign({...design, subHeaderBgColor: val})} />
                   </Box>
                   <FormControl fullWidth size="small">
                      <InputLabel>Alignment Subtitle</InputLabel>
                      <Select label="Alignment Subtitle" value={design.subtitleTextAlign} onChange={e => setDesign({...design, subtitleTextAlign: e.target.value as string})}>
                        <MenuItem value="left">Kiri</MenuItem>
                        <MenuItem value="center">Tengah</MenuItem>
                        <MenuItem value="right">Kanan</MenuItem>
                      </Select>
                   </FormControl>
                   <FormControl fullWidth size="small">
                      <InputLabel>Style Subtitle</InputLabel>
                      <Select label="Style Subtitle" value={design.subtitleTextWeight || 'normal'} onChange={e => setDesign({...design, subtitleTextWeight: e.target.value as string})}>
                        <MenuItem value="normal">Normal</MenuItem>
                        <MenuItem value="bold">Bold</MenuItem>
                        <MenuItem value="italic">Italic</MenuItem>
                      </Select>
                   </FormControl>
                </Stack>
                </Box>
             </Card>
           </Grid>

             
           <Grid size={{ xs: 12, md: 6, lg: 4 }}>
             <Card sx={{ height: '100%', mt: 3, overflow: 'visible', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{
                    mt: -3,
                    mx: 2,
                    p: 2,
                    background: 'linear-gradient(195deg, #49a3f1, #1A73E8)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.14), 0 7px 10px -5px rgba(26, 115, 232, 0.4)'
                }}>
                    <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold' }}>
                        Pengaturan Teks Identitas
                    </Typography>
                </Box>
                <Box sx={{ p: 3, pt: 2, flexGrow: 1 }}>
                <Stack spacing={2}>
                   <Box>
                      <Typography gutterBottom>Ukuran Font Identitas ({design.identityTextSize}px)</Typography>
                      <Slider value={design.identityTextSize || 12} onChange={(e, val) => setDesign({...design, identityTextSize: val as number})} min={8} max={72} />
                   </Box>
                   <Box>
                      <AlphaColorPicker label="Warna Font Identitas" value={design.identityTextColor} onChange={(val: string) => setDesign({...design, identityTextColor: val})} />
                   </Box>
                   <FormControl fullWidth size="small">
                      <InputLabel>Alignment Identitas</InputLabel>
                      <Select label="Alignment Identitas" value={design.identityTextAlign} onChange={e => setDesign({...design, identityTextAlign: e.target.value as string})}>
                        <MenuItem value="left">Kiri</MenuItem>
                        <MenuItem value="center">Tengah</MenuItem>
                        <MenuItem value="right">Kanan</MenuItem>
                      </Select>
                   </FormControl>
                   <FormControl fullWidth size="small">
                      <InputLabel>Style Identitas</InputLabel>
                      <Select label="Style Identitas" value={design.identityTextWeight || 'normal'} onChange={e => setDesign({...design, identityTextWeight: e.target.value as string})}>
                        <MenuItem value="normal">Normal</MenuItem>
                        <MenuItem value="bold">Bold</MenuItem>
                        <MenuItem value="italic">Italic</MenuItem>
                      </Select>
                   </FormControl>
                </Stack>
                </Box>
             </Card>
           </Grid>

             
           <Grid size={{ xs: 12, md: 6, lg: 4 }}>
             <Card sx={{ height: '100%', mt: 3, overflow: 'visible', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{
                    mt: -3,
                    mx: 2,
                    p: 2,
                    background: 'linear-gradient(195deg, #49a3f1, #1A73E8)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.14), 0 7px 10px -5px rgba(26, 115, 232, 0.4)'
                }}>
                    <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold' }}>
                        Pengaturan Tanda Tangan
                    </Typography>
                </Box>
                <Box sx={{ p: 3, pt: 2, flexGrow: 1 }}>
                <Stack spacing={2}>
                   <Box>
                      <Typography gutterBottom>Ukuran Font Kepsek ({design.headmasterTextSize}px)</Typography>
                      <Slider value={design.headmasterTextSize || 10} onChange={(e, val) => setDesign({...design, headmasterTextSize: val as number})} min={8} max={72} />
                   </Box>
                   <Box>
                      <AlphaColorPicker label="Warna Font Kepsek" value={design.headmasterTextColor} onChange={(val: string) => setDesign({...design, headmasterTextColor: val})} />
                   </Box>
                   <FormControl fullWidth size="small">
                      <InputLabel>Alignment Tanda Tangan</InputLabel>
                      <Select label="Alignment Tanda Tangan" value={design.headmasterTextAlign} onChange={e => setDesign({...design, headmasterTextAlign: e.target.value as string})}>
                        <MenuItem value="left">Kiri</MenuItem>
                        <MenuItem value="center">Tengah</MenuItem>
                        <MenuItem value="right">Kanan</MenuItem>
                      </Select>
                   </FormControl>
                   <FormControl fullWidth size="small">
                      <InputLabel>Style Tanda Tangan</InputLabel>
                      <Select label="Style Tanda Tangan" value={design.headmasterTextWeight || 'normal'} onChange={e => setDesign({...design, headmasterTextWeight: e.target.value as string})}>
                        <MenuItem value="normal">Normal</MenuItem>
                        <MenuItem value="bold">Bold</MenuItem>
                        <MenuItem value="italic">Italic</MenuItem>
                      </Select>
                   </FormControl>
                </Stack>
                </Box>
             </Card>
           </Grid>

             
           <Grid size={{ xs: 12, md: 6, lg: 4 }}>
             <Card sx={{ height: '100%', mt: 3, overflow: 'visible', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{
                    mt: -3,
                    mx: 2,
                    p: 2,
                    background: 'linear-gradient(195deg, #49a3f1, #1A73E8)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.14), 0 7px 10px -5px rgba(26, 115, 232, 0.4)'
                }}>
                    <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold' }}>
                        Tipografi & Logo
                    </Typography>
                </Box>
                <Box sx={{ p: 3, pt: 2, flexGrow: 1 }}>
                <Stack spacing={2}>
                   <FormControl fullWidth size="small">
                      <InputLabel>Jenis Font Utama</InputLabel>
                      <Select label="Jenis Font Utama" value={design.fontFamily} onChange={e => setDesign({...design, fontFamily: e.target.value as string})}>
                        <MenuItem value="sans-serif">Sans Serif</MenuItem>
                        <MenuItem value="serif">Serif</MenuItem>
                        <MenuItem value="monospace">Monospace</MenuItem>
                      </Select>
                   </FormControl>
                   <Stack spacing={2}>
                     <Button variant="outlined" color="inherit" component="label" fullWidth startIcon={<UploadIcon />}>
                       Upload Logo Kiri
                       <input type="file" hidden accept="image/*" onChange={e => handleImageUpload(e, 'logoLeft')} />
                     </Button>
                     <Button variant="outlined" color="inherit" component="label" fullWidth startIcon={<UploadIcon />}>
                       Upload Logo Kanan
                       <input type="file" hidden accept="image/*" onChange={e => handleImageUpload(e, 'logoRight')} />
                     </Button>
                     <Button variant="outlined" color="inherit" component="label" fullWidth startIcon={<UploadIcon />}>
                       Upload TTD Kepsek
                       <input type="file" hidden accept="image/*" onChange={e => handleImageUpload(e, 'signature')} />
                     </Button>
                     <Button variant="outlined" color="inherit" component="label" fullWidth startIcon={<UploadIcon />}>
                       Upload Foto Kustom (.png)
                       <input type="file" hidden accept="image/png" onChange={e => handleImageUpload(e, 'customImage')} />
                     </Button>
                   </Stack>
                </Stack>
                </Box>
             </Card>
           </Grid>

             
           <Grid size={{ xs: 12, md: 6, lg: 4 }}>
             <Card sx={{ height: '100%', mt: 3, overflow: 'visible', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{
                    mt: -3,
                    mx: 2,
                    p: 2,
                    background: 'linear-gradient(195deg, #49a3f1, #1A73E8)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.14), 0 7px 10px -5px rgba(26, 115, 232, 0.4)'
                }}>
                    <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold' }}>
                        Teks Tambahan Kustom
                    </Typography>
                </Box>
                <Box sx={{ p: 3, pt: 2, flexGrow: 1 }}>
                <Stack spacing={2}>
                   {(design.customTexts || []).map((ct: any, idx: number) => (
                       <Card key={ct.id} elevation={0} sx={{ position: 'relative', bgcolor: 'grey.50', p: 2, border: '1px solid', borderColor: 'grey.200', borderRadius: 1 }}>
                        <IconButton size="small" color="error" sx={{ position: 'absolute', top: 4, right: 4 }} onClick={() => {
                            const newArr = [...design.customTexts];
                            newArr.splice(idx, 1);
                            setDesign({...design, customTexts: newArr});
                        }}>
                           <DeleteIcon fontSize="small" />
                        </IconButton>
                        <Stack spacing={2} sx={{ mt: 2 }}>
                           <TextField label="Teks" size="small" fullWidth value={ct.text} onChange={e => {
                               const newArr = [...design.customTexts];
                               newArr[idx].text = e.target.value;
                               setDesign({...design, customTexts: newArr});
                           }} />
                           
                           <Stack direction="row" spacing={2}>
                              <FormControl fullWidth size="small">
                                 <InputLabel>Font Family</InputLabel>
                                 <Select label="Font Family" value={ct.fontFamily || design.fontFamily} onChange={e => {
                                     const newArr = [...design.customTexts];
                                     newArr[idx].fontFamily = e.target.value as string;
                                     setDesign({...design, customTexts: newArr});
                                 }}>
                                   <MenuItem value="sans-serif">Sans Serif</MenuItem>
                                   <MenuItem value="serif">Serif</MenuItem>
                                   <MenuItem value="monospace">Monospace</MenuItem>
                                 </Select>
                              </FormControl>
                              
                              <FormControl fullWidth size="small">
                                 <InputLabel>Align</InputLabel>
                                 <Select label="Align" value={ct.textAlign || 'left'} onChange={e => {
                                     const newArr = [...design.customTexts];
                                     newArr[idx].textAlign = e.target.value as string;
                                     setDesign({...design, customTexts: newArr});
                                 }}>
                                   <MenuItem value="left">Kiri</MenuItem>
                                   <MenuItem value="center">Tengah</MenuItem>
                                   <MenuItem value="right">Kanan</MenuItem>
                                 </Select>
                              </FormControl>
                           </Stack>

                           <Stack direction="row" spacing={2}>
                              <FormControl fullWidth size="small">
                                 <InputLabel>Style</InputLabel>
                                 <Select label="Style" value={ct.fontWeight || 'normal'} onChange={e => {
                                     const newArr = [...design.customTexts];
                                     newArr[idx].fontWeight = e.target.value as string;
                                     setDesign({...design, customTexts: newArr});
                                 }}>
                                   <MenuItem value="normal">Normal</MenuItem>
                                   <MenuItem value="bold">Bold</MenuItem>
                                   <MenuItem value="italic">Italic</MenuItem>
                                 </Select>
                              </FormControl>
                           </Stack>

                           <Box>
                              <Typography variant="caption" sx={{ display: 'block' }}>Ukuran ({ct.size})</Typography>
                              <Slider size="small" value={ct.size || 12} onChange={(e, val) => {
                                   const newArr = [...design.customTexts];
                                   newArr[idx].size = val as number;
                                   setDesign({...design, customTexts: newArr});
                              }} min={8} max={72} />
                           </Box>
                           
                           <Box>
                              <AlphaColorPicker label="Warna" value={ct.color} onChange={(val: string) => {
                                  const newArr = [...design.customTexts];
                                  newArr[idx].color = val;
                                  setDesign({...design, customTexts: newArr});
                              }} />
                           </Box>
                        </Stack>
                      </Card>
                   ))}
                   <Button variant="outlined" color="inherit" fullWidth onClick={() => {
                       const newId = `customText_${Date.now()}`;
                       const layout = {...design.layout, [newId]: { x: 10, y: 10, w: 100, h: 20 }};
                       setDesign({
                           ...design, 
                           layout,
                           customTexts: [...(design.customTexts || []), { id: newId, text: 'Teks Baru', size: 12, color: '#000000', fontFamily: 'sans-serif' }]
                       });
                   }} sx={{ alignSelf: 'flex-start', mt: 1 }}>
                       + Tambah Teks Baru
                   </Button>
                </Stack>
                </Box>
             </Card>
           </Grid>
      </Grid>
    </Box>
  );
}
