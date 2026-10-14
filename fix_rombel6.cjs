const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/Rombel.tsx', 'utf-8');

const regex = /\{\/\* Ringkasan Otomatis \*\/\}/;

const injectDialog = `
      <Dialog
        open={promoteOpen}
        onClose={() => !executingPromote && setPromoteOpen(false)}
        maxWidth="lg"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ p: 2.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Naik Kelas & Kelulusan
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Proses kenaikan kelas dan kelulusan siswa secara massal.
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 2.5 }}>
          <Tabs value={promoteTab} onChange={(e, v) => setPromoteTab(v)} sx={{ mb: 2 }}>
            <Tab label="Konfigurasi" value="config" />
            <Tab label="Preview Data" value="preview" />
          </Tabs>
          
          {promoteTab === 'config' && (
            <Stack spacing={3}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                      Tingkat yang Diproses
                    </Typography>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      value={promoteGrade}
                      onChange={e => setPromoteGrade(e.target.value)}
                      slotProps={{ select: { native: true } }}
                    >
                      <option value="ALL">Semua Kelas</option>
                      <option value="10">Kelas 10 (Naik ke Kelas 11)</option>
                      <option value="11">Kelas 11 (Naik ke Kelas 12)</option>
                      <option value="12">Kelas 12 (Lulus / Alumni)</option>
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    Tahun Ajaran Aktif
                  </Typography>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={newYearInput}
                    onChange={e => setNewYearInput(e.target.value)}
                    slotProps={{ select: { native: true } }}
                  >
                    <option value="">-- Pilih --</option>
                    {activeTaList.map((ta: any) => (
                      <option key={ta.id} value={ta.nama}>{ta.nama}</option>
                    ))}
                  </TextField>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Hanya untuk riwayat / referensi proses (Tahun Angkatan siswa tetap/tidak diubah).
                  </Typography>
                </Grid>
              </Grid>
              </Paper>
              {/* Ringkasan Otomatis */}
`;

code = code.replace(regex, injectDialog);
fs.writeFileSync('src/pages/admin/Rombel.tsx', code);
