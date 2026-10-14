const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/Rombel.tsx', 'utf-8');

code = code.replace(/const \[activeClass, setActiveClass\] = useState<ClassItem \| null>\(null\);/, 
  "const [activeClass, setActiveClass] = useState<ClassItem | null>(null);\n  const [modalOpen, setModalOpen] = useState(false);");

const dialogCode = `
      {/* DIALOG DAFTAR SISWA */}
      <Dialog 
        open={modalOpen} 
        onClose={() => setModalOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, maxHeight: '90vh' } } }}
      >
        <DialogTitle sx={{ p: 2.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Daftar Siswa - {activeClass?.name}</Typography>
            <Typography variant="caption" color="text.secondary">Total {activeClass?.students.length || 0} siswa dalam rombongan belajar ini</Typography>
          </Box>
          <IconButton onClick={() => setModalOpen(false)} size="small" sx={{ bgcolor: '#e2e8f0' }}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0', bgcolor: '#fff' }}>
            <Grid container spacing={2} sx={{ alignItems: 'center' }}>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  fullWidth
                  placeholder="Cari nama atau NISN siswa..."
                  size="small"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="action" fontSize="small" />
                        </InputAdornment>
                      ),
                      sx: { borderRadius: 2, bgcolor: '#f8fafc' }
                    }
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Button 
                  fullWidth 
                  variant="outlined" 
                  startIcon={<DownloadIcon />} 
                  onClick={handleExportClass}
                  sx={{ borderRadius: 2, fontWeight: 700 }}
                >
                  Ekspor Excel
                </Button>
              </Grid>
            </Grid>
          </Box>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>NO</TableCell>
                  <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>NISN / NIS</TableCell>
                  <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>NAMA SISWA</TableCell>
                  <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>STATUS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student, index) => (
                    <TableRow key={student.id} hover>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{student.nisn}</Typography>
                        {student.nis && <Typography variant="caption" color="text.secondary">{student.nis}</Typography>}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{student.name}</TableCell>
                      <TableCell>
                        <Chip 
                          label={student.status} 
                          size="small" 
                          color={student.status === 'LULUS' ? 'success' : student.status === 'PKL' ? 'warning' : 'primary'} 
                          variant="outlined"
                          sx={{ fontWeight: 700, fontSize: '0.7rem' }} 
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">Tidak ada siswa ditemukan</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </DialogContent>
      </Dialog>
`;

code = code.replace(/<Dialog open=\{promoteOpen\}/, dialogCode + '\n      <Dialog open={promoteOpen}');
fs.writeFileSync('src/pages/admin/Rombel.tsx', code);
