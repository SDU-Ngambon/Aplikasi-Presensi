const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/Rombel.tsx', 'utf-8');

const regex = /<TextField\s+select\s+label="Pilih Tahun Ajaran Aktif"[\s\S]*?<\/Typography>/m;

const originalSearch = `
<TextField
  fullWidth
  size="small"
  placeholder="Cari nama kelas atau wali kelas..."
  value={searchQuery}
  onChange={e => setSearchQuery(e.target.value)}
  slotProps={{
    input: {
      startAdornment: (
        <InputAdornment position="start">
          <SearchIcon color="action" fontSize="small" />
        </InputAdornment>
      ),
    }
  }}
/>
`;

code = code.replace(regex, originalSearch);

const regex2 = /<TextField\s+placeholder="Contoh: 2026\/2027 atau 2026"[\s\S]*?onChange=\{e => setNewYearInput\(e\.target\.value\)\}\s*\/>/;

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
  {activeTaList.map((ta: any) => (
    <option key={ta.id} value={ta.nama}>{ta.nama}</option>
  ))}
</TextField>
<Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
  Tahun ajaran ini hanya sebagai referensi proses (Tahun Angkatan siswa tetap/tidak diubah).
</Typography>
`;

code = code.replace(regex2, replaceTextField);
fs.writeFileSync('src/pages/admin/Rombel.tsx', code);
