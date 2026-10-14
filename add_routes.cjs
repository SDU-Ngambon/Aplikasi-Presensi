const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf-8');

const importReplacement = `
import {
  getAllStudents,
  saveStudent,
  updateStudent,
  deleteStudent,
  getAllTeachers,
  saveTeacher,
  deleteTeacher,
  assignTeacherToClass,
  getAllRombelStatus,
  setClassStatus,
  parseGradeLevel,
  getPromotedClassName,
  getAllAttendance,
  recordAttendance,
  getAllIzin,
  saveIzin,
  deleteIzin,
  resetStudents,
  resetTeachers,
  resetReports,
  getAllTahunAjaran,
  saveTahunAjaran,
  setTahunAjaranActive,
  deleteTahunAjaran
} from './src/dataStore.ts';
`;

code = code.replace(/import\s+\{[^}]+\}\s+from\s+'\.\/src\/dataStore\.ts';/s, importReplacement);

const newRoutes = `

  app.get('/api/tahun-ajaran', async (req, res) => {
    try {
      const data = await getAllTahunAjaran();
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/tahun-ajaran', async (req, res) => {
    try {
      const { nama, is_active } = req.body;
      const ta = {
        id: randomUUID(),
        nama,
        is_active: is_active || false,
        dibuat_pada: new Date().toISOString()
      };
      await saveTahunAjaran(ta);
      res.json({ success: true, data: ta });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/tahun-ajaran/:id/active', async (req, res) => {
    try {
      const { is_active } = req.body;
      await setTahunAjaranActive(req.params.id, is_active);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/tahun-ajaran/:id', async (req, res) => {
    try {
      await deleteTahunAjaran(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
`;

code = code.replace(/app\.listen\(/, newRoutes + '\n  app.listen(');

fs.writeFileSync('server.ts', code);
