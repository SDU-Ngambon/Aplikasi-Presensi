const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/Rombel.tsx', 'utf-8');

const regex = /<Grid size=\{\{ xs: 12, sm: 6 \}\}>\s*<Typography variant="body2" sx=\{\{ fontWeight: 600, mb: 1 \}\}>\s*Tingkat yang Diproses\s*<\/Typography>\s*<TextField\s*select[\s\S]*?<\/TextField>\s*<\/Grid>/m;

const replaceTextField = `$&
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    Tahun Ajaran Baru (Opsional)
                  </Typography>
                  <TextField
                    select
                    label="Pilih Tahun Ajaran Aktif"
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
                    Tahun ajaran ini hanya sebagai referensi proses (Tahun Angkatan siswa tetap/tidak diubah).
                  </Typography>
                </Grid>
`;

code = code.replace(regex, replaceTextField);
fs.writeFileSync('src/pages/admin/Rombel.tsx', code);
