const fs = require('fs');

let code = fs.readFileSync('src/dataStore.ts', 'utf-8');

const newFunctions = `
export interface TahunAjaran {
  id: string;
  nama: string;
  is_active: boolean;
  dibuat_pada: string;
}

export async function getAllTahunAjaran(): Promise<TahunAjaran[]> {
  try {
    const res = await pool.query('SELECT * FROM tahun_ajaran ORDER BY dibuat_pada DESC');
    return res.rows;
  } catch (e) {
    console.error('getAllTahunAjaran DB error:', e);
    return [];
  }
}

export async function saveTahunAjaran(ta: TahunAjaran): Promise<boolean> {
  try {
    if (ta.is_active) {
       await pool.query('UPDATE tahun_ajaran SET is_active = false');
    }
    const query = 'INSERT INTO tahun_ajaran (id, nama, is_active, dibuat_pada) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET nama = $2, is_active = $3';
    await pool.query(query, [ta.id, ta.nama, ta.is_active, ta.dibuat_pada]);
    return true;
  } catch (e) {
    console.error('saveTahunAjaran DB error:', e);
    return false;
  }
}

export async function setTahunAjaranActive(id: string, is_active: boolean): Promise<boolean> {
  try {
    if (is_active) {
       await pool.query('UPDATE tahun_ajaran SET is_active = false');
    }
    await pool.query('UPDATE tahun_ajaran SET is_active = $1 WHERE id = $2', [is_active, id]);
    return true;
  } catch (e) {
    console.error('setTahunAjaranActive DB error:', e);
    return false;
  }
}

export async function deleteTahunAjaran(id: string): Promise<boolean> {
  try {
    await pool.query('DELETE FROM tahun_ajaran WHERE id = $1', [id]);
    return true;
  } catch (e) {
    console.error('deleteTahunAjaran DB error:', e);
    return false;
  }
}
`;

code = code + newFunctions;
fs.writeFileSync('src/dataStore.ts', code);
