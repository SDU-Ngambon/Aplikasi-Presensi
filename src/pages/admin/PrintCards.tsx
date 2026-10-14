import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import CardTemplate from '../../components/CardTemplate';

// MUI Imports
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TablePagination
} from '@mui/material';

// Icons
import {
  Print as PrinterIcon
} from '@mui/icons-material';

import { defaultDesignState, defaultImagesState } from './CardDesign';

export default function PrintCards() {
  const [students, setStudents] = useState<any[]>([]);
  const [design, setDesign] = useState<any>(null);
  const [images, setImages] = useState<any>(null);
  const [barcodeType, setBarcodeType] = useState('qrcode');

  const [filterYear, setFilterYear] = useState('');
  const [filterClass, setFilterClass] = useState('');
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12);

  const [printSingleId, setPrintSingleId] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stRes, setRes] = await Promise.all([
          axios.get(`/api/students?t=${Date.now()}`),
          axios.get(`/api/settings?t=${Date.now()}`)
        ]);
        setStudents(stRes.data || []);
        if (setRes.data && Object.keys(setRes.data).length > 0) {
          setDesign(setRes.data.cardDesign || defaultDesignState);
          setImages(setRes.data.cardImages || defaultImagesState);
          setBarcodeType(setRes.data.barcodeType || 'qrcode');
        } else {
          setDesign(defaultDesignState);
          setImages(defaultImagesState);
        }
      } catch (e) {
        console.error(e);
        setStudents([]);
      }
    };
    fetchData();
  }, []);

  const availableClasses = useMemo(() => Array.from(new Set(students.map(s => s.class).filter(Boolean))), [students]);
  const availableYears = useMemo(() => Array.from(new Set(students.map(s => s.year).filter(Boolean))), [students]);

  const filtered = useMemo(() => {
    return (students || []).filter(s => 
      (filterYear && filterYear !== 'ALL' ? s.year === filterYear : true) &&
      (filterClass && filterClass !== 'ALL' ? s.class === filterClass : true)
    );
  }, [students, filterYear, filterClass]);

  const displayedStudents = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filtered.slice(startIndex, startIndex + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  useEffect(() => {
    setPage(0);
  }, [filterClass, filterYear]);

  // Clean print handler with body class isolation & afterprint cleanup
  const executePrint = () => {
    document.body.classList.add('has-print-root');
    setIsPrinting(true);

    const cleanup = () => {
      document.body.classList.remove('has-print-root');
      setIsPrinting(false);
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);

    // Give DOM time to update portal container
    setTimeout(() => {
      window.print();
      // Fallback cleanup if afterprint doesn't fire
      setTimeout(cleanup, 2000);
    }, 150);
  };

  const printAll = () => {
    setPrintSingleId(null);
    executePrint();
  };

  const printSingle = (id: string) => {
    setPrintSingleId(id);
    executePrint();
  };

  if (!design || !images) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">Memuat konfigurasi desain...</Typography>
      </Box>
    );
  }

  // Cards to be printed
  const cardsToPrint = printSingleId
    ? displayedStudents.filter(s => s.id === printSingleId)
    : displayedStudents;

  const printRootElement = document.getElementById('print-root');

  return (
    <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }} className="print-container">
      {/* SCREEN CONTROLS & PREVIEW (Hidden during print) */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2 }} className="no-print print-hide">
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }} color="text.primary">
            Cetak Kartu Pelajar
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cetak kartu identitas barcode/QR siswa. Area cetak diisolasi otomatis khusus kartu.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PrinterIcon />}
            onClick={printAll}
            disabled={displayedStudents.length === 0}
            sx={{ borderRadius: 2, fontWeight: 700, px: 2.5 }}
          >
            Cetak Halaman Ini ({displayedStudents.length} Kartu)
          </Button>
        </Stack>
      </Box>

      {/* FILTER BAR */}
      <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }} className="no-print print-hide">
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Kelas</InputLabel>
            <Select value={filterClass} onChange={e => setFilterClass(e.target.value)} label="Kelas">
              <MenuItem value="">Pilih Kelas</MenuItem>
              <MenuItem value="ALL">Semua Kelas</MenuItem>
              {availableClasses.map(c => <MenuItem key={c as string} value={c as string}>{c as string}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Angkatan</InputLabel>
            <Select value={filterYear} onChange={e => setFilterYear(e.target.value)} label="Angkatan">
              <MenuItem value="">Pilih Angkatan</MenuItem>
              <MenuItem value="ALL">Semua Angkatan</MenuItem>
              {availableYears.map(y => <MenuItem key={y as string} value={y as string}>{y as string}</MenuItem>)}
            </Select>
          </FormControl>
          <Box sx={{ flexGrow: 1 }} />
          <TablePagination
            component="div"
            count={filtered.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[6, 12, 24, 48]}
            labelRowsPerPage="Per halaman:"
          />
        </Stack>
      </Paper>

      {/* SCREEN CARDS GRID (Visible on Screen, with Cetak Satuan button) */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5, justifyContent: 'center', mt: 1 }} className="no-print print-hide">
        {displayedStudents.map(student => (
          <Box
            key={student.id}
            sx={{
              boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
              border: '1px solid',
              borderColor: 'grey.200',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              bgcolor: 'white',
              p: 1.5,
              borderRadius: 3,
              transition: 'transform 0.15s',
              '&:hover': { transform: 'translateY(-2px)' }
            }}
          >
            <CardTemplate design={design} images={images} student={student} scale={1} barcodeType={barcodeType} />
            <Button
              variant="outlined"
              color="primary"
              size="small"
              sx={{ mt: 1.5, width: '100%', borderRadius: 2, fontWeight: 600 }}
              onClick={() => printSingle(student.id)}
              startIcon={<PrinterIcon />}
            >
              Cetak Satuan
            </Button>
          </Box>
        ))}
        {displayedStudents.length === 0 && (
          <Typography color="text.secondary" sx={{ py: 6 }}>
            Tidak ada siswa yang ditemukan dengan filter yang dipilih.
          </Typography>
        )}
      </Box>

      {/* PRINT-ONLY AREA FOR NATIVE & BUTTON PRINTING */}
      <div id="printable-cards-area" className="printable-cards-area print-only">
        {cardsToPrint.map(student => (
          <div
            key={student.id}
            style={{
              pageBreakInside: 'avoid',
              breakInside: 'avoid',
              margin: '0 0 10px 0',
              padding: '0',
              backgroundColor: 'transparent'
            }}
          >
            <CardTemplate design={design} images={images} student={student} scale={1} barcodeType={barcodeType} />
          </div>
        ))}
      </div>

      {/* REACT PORTAL TO #print-root */}
      {printRootElement && createPortal(
        <div
          id="print-root-inner"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
            padding: '10px',
            margin: '0',
            backgroundColor: '#ffffff',
            width: '100%'
          }}
        >
          {cardsToPrint.map(student => (
            <div
              key={student.id}
              style={{
                pageBreakInside: 'avoid',
                breakInside: 'avoid',
                margin: '0 0 10px 0',
                padding: '0',
                backgroundColor: 'transparent'
              }}
            >
              <CardTemplate design={design} images={images} student={student} scale={1} barcodeType={barcodeType} />
            </div>
          ))}
        </div>,
        printRootElement
      )}
    </Box>
  );
}
