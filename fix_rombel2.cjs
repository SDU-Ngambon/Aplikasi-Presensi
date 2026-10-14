const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/Rombel.tsx', 'utf-8');

const regex = /<TextField[\s\S]*?value=\{newYearInput\}[\s\S]*?\/>/m;

const replaceTextField = `
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
  {activeTaList.map(ta => (
    <option key={ta.id} value={ta.nama}>{ta.nama}</option>
  ))}
</TextField>
<Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
  Tahun ajaran ini hanya sebagai referensi proses (Tahun Angkatan siswa tetap/tidak diubah).
</Typography>
`;

code = code.replace(regex, replaceTextField);
fs.writeFileSync('src/pages/admin/Rombel.tsx', code);
