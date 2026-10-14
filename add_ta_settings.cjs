const fs = require('fs');

let code = fs.readFileSync('src/pages/admin/Settings.tsx', 'utf-8');

const importAxios = `import axios from 'axios';`;
if (!code.includes("import axios")) {
  code = code.replace("import React", "import React\n" + importAxios);
}

const componentCode = `
const TahunAjaranSettings = () => {
  const [list, setList] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [newNama, setNewNama] = React.useState('');

  const fetchTA = async () => {
    try {
      const { data } = await axios.get('/api/tahun-ajaran');
      setList(data);
    } catch (e) {
      toast.error('Gagal mengambil Tahun Ajaran');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchTA();
  }, []);

  const handleAdd = async () => {
    if (!newNama.trim()) return;
    try {
      await axios.post('/api/tahun-ajaran', { nama: newNama });
      toast.success('Tahun Ajaran ditambahkan');
      setNewNama('');
      fetchTA();
    } catch (e) {
      toast.error('Gagal menambah');
    }
  };

  const handleToggle = async (id, currentStatus) => {
    try {
      await axios.put(\`/api/tahun-ajaran/\${id}/active\`, { is_active: !currentStatus });
      toast.success('Status diubah');
      fetchTA();
    } catch (e) {
      toast.error('Gagal mengubah status');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus Tahun Ajaran?')) return;
    try {
      await axios.delete(\`/api/tahun-ajaran/\${id}\`);
      toast.success('Dihapus');
      fetchTA();
    } catch (e) {
      toast.error('Gagal menghapus');
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2, mt: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Tahun Ajaran</Typography>
      </Box>
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField size="small" label="Tahun Ajaran Baru (Misal: 2024/2025)" value={newNama} onChange={e => setNewNama(e.target.value)} sx={{ flexGrow: 1 }} />
        <Button variant="contained" onClick={handleAdd}>Tambah</Button>
      </Box>
      <Table size="small">
        <TableHead><TableRow><TableCell>Nama</TableCell><TableCell>Status Aktif</TableCell><TableCell>Aksi</TableCell></TableRow></TableHead>
        <TableBody>
          {list.map(ta => (
            <TableRow key={ta.id}>
              <TableCell>{ta.nama}</TableCell>
              <TableCell>
                <Switch checked={ta.is_active} onChange={() => handleToggle(ta.id, ta.is_active)} />
              </TableCell>
              <TableCell>
                <Button color="error" size="small" onClick={() => handleDelete(ta.id)}>Hapus</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
};
`;

code = code.replace(/export default function Settings/g, componentCode + '\nexport default function Settings');
code = code.replace(/\{\/\* Pengaturan Judul & Akun Piket \*\/\}/, `{(categoryTab === 'all' || categoryTab === 'info') && <TahunAjaranSettings />}\n      {/* Pengaturan Judul & Akun Piket */}`);

fs.writeFileSync('src/pages/admin/Settings.tsx', code);
