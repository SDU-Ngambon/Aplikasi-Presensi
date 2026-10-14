const fs = require('fs');
let code = fs.readFileSync('src/dataStore.ts', 'utf-8');

const constantRegex = /const PIKET_FILE = path\.join\(DATA_DIR, 'akun_piket\.json'\);/;
code = code.replace(constantRegex, "const PIKET_FILE = path.join(DATA_DIR, 'akun_piket.json');\nconst TAHUN_AJARAN_FILE = path.join(DATA_DIR, 'tahun_ajaran.json');");

const taRegex = /export interface TahunAjaran \{[\s\S]*?export async function deleteTahunAjaran\(id: string\): Promise<boolean> \{[\s\S]*?\}\n\}/;

const newTaFns = `export interface TahunAjaran {
  id: string;
  nama: string;
  is_active: boolean;
  dibuat_pada: string;
}

export async function getAllTahunAjaran(): Promise<TahunAjaran[]> {
  try {
    const res = await pool.query('SELECT * FROM tahun_ajaran ORDER BY dibuat_pada DESC');
    if (res.rows.length > 0) return res.rows;
  } catch (e) {
  }
  return readJsonFile<TahunAjaran[]>(TAHUN_AJARAN_FILE, []);
}

export async function saveTahunAjaran(ta: TahunAjaran): Promise<boolean> {
  try {
    if (ta.is_active) {
       await pool.query('UPDATE tahun_ajaran SET is_active = false');
    }
    const query = 'INSERT INTO tahun_ajaran (id, nama, is_active, dibuat_pada) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET nama = $2, is_active = $3';
    await pool.query(query, [ta.id, ta.nama, ta.is_active, ta.dibuat_pada]);
  } catch (e) {
  }
  const current = readJsonFile<TahunAjaran[]>(TAHUN_AJARAN_FILE, []);
  if (ta.is_active) {
    current.forEach(t => t.is_active = false);
  }
  const existingIdx = current.findIndex(t => t.id === ta.id);
  if (existingIdx >= 0) {
    current[existingIdx] = ta;
  } else {
    current.push(ta);
  }
  writeJsonFile(TAHUN_AJARAN_FILE, current);
  return true;
}

export async function setTahunAjaranActive(id: string, is_active: boolean): Promise<boolean> {
  try {
    if (is_active) {
       await pool.query('UPDATE tahun_ajaran SET is_active = false');
    }
    await pool.query('UPDATE tahun_ajaran SET is_active = $1 WHERE id = $2', [is_active, id]);
  } catch (e) {
  }
  const current = readJsonFile<TahunAjaran[]>(TAHUN_AJARAN_FILE, []);
  if (is_active) {
    current.forEach(t => t.is_active = false);
  }
  const target = current.find(t => t.id === id);
  if (target) {
    target.is_active = is_active;
    writeJsonFile(TAHUN_AJARAN_FILE, current);
  }
  return true;
}

export async function deleteTahunAjaran(id: string): Promise<boolean> {
  try {
    await pool.query('DELETE FROM tahun_ajaran WHERE id = $1', [id]);
  } catch (e) {
  }
  const current = readJsonFile<TahunAjaran[]>(TAHUN_AJARAN_FILE, []);
  const filtered = current.filter(t => t.id !== id);
  writeJsonFile(TAHUN_AJARAN_FILE, filtered);
  return true;
}`;

code = code.replace(taRegex, newTaFns);
fs.writeFileSync('src/dataStore.ts', code);
