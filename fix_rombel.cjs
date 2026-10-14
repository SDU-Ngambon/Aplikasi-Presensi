const fs = require('fs');

let code = fs.readFileSync('src/pages/admin/Rombel.tsx', 'utf-8');

const fetchTaCode = `
  const [activeTaList, setActiveTaList] = useState<any[]>([]);

  useEffect(() => {
    if (promoteOpen) {
      axios.get('/api/tahun-ajaran').then(({ data }) => {
        const activeOnly = data.filter((ta: any) => ta.is_active);
        setActiveTaList(activeOnly);
        if (activeOnly.length > 0 && !newYearInput) {
           setNewYearInput(activeOnly[0].nama);
        }
      }).catch(() => {});
    }
  }, [promoteOpen]);
`;

code = code.replace(/const \[newYearInput, setNewYearInput\] = useState\(''\);/, 'const [newYearInput, setNewYearInput] = useState(\'\');\n' + fetchTaCode);

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

code = code.replace(/<TextField[^>]*newYearInput[^>]*\/>/, replaceTextField);
code = code.replace(/helperText="Jika diisi, tahun angkatan siswa yang naik kelas akan diperbarui"/, '');

fs.writeFileSync('src/pages/admin/Rombel.tsx', code);
