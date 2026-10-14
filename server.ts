import 'dotenv/config';
import express from 'express';
import bcrypt from 'bcrypt';
import cors from 'cors';
import path from 'path';
import { randomUUID } from 'crypto';
import { pool, initDb } from './src/db.ts';
import type { Student, Teacher, Attendance, Settings } from './src/db.ts';

import {
  getAllStudents,
  saveStudent,
  updateStudent,
  bulkPromoteStudentsAndTeachers,
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
  resetTeacherAttendanceReports,
  resetAllData,
  getDatabaseStats,
  getAllTahunAjaran,
  saveTahunAjaran,
  setTahunAjaranActive,
  deleteTahunAjaran,
  getAllMataPelajaran,
  saveMataPelajaran,
  bulkImportMataPelajaran,
  deleteMataPelajaran,
  getAllTeacherAccounts,
  saveTeacherAccount,
  updateTeacherAccount,
  regenerateTeacherPassword,
  deleteTeacherAccount,
  syncAllTeacherAccounts,
  bulkRegenerateTeacherAccounts,
  toggleTeacherAccountStatus,
  getAllPiketSchedule,
  savePiketSchedule,
  updatePiketSchedule,
  deletePiketSchedule,
  getPiketScheduleByDay,
  getAllPiketDuties,
  savePiketDuty,
  updatePiketDuty,
  deletePiketDuty,
  getTableColumns,
  getAllKbmCategories,
  saveKbmCategory,
  updateKbmCategory,
  deleteKbmCategory,
  getAllKbmSchedules,
  saveKbmDaySchedule,
  clearKbmDaySchedule,
  saveAllKbmSchedules,
  getKbmScheduleByDay,
  getAttendanceRules,
  saveAttendanceRules,
  getAllFreeAttendance,
  saveFreeAttendance,
  updateFreeAttendance,
  deleteFreeAttendance,
  syncNationalHolidays,
  checkDateFreeAttendance,
  recordTeacherKbmAttendance,
  getAllTeacherKbmAttendance,
  deleteTeacherKbmAttendance,
  getTeacherKbmRecap,
  getAllJadwalKbm,
  getJadwalKbmById,
  checkJadwalKbmConflict,
  createJadwalKbm,
  updateJadwalKbm,
  deleteJadwalKbm,
  getKepalaSekolahAccount,
  saveKepalaSekolahAccount,
  getSpecialRoleAccounts,
  setTeacherSpecialRole,
  removeTeacherSpecialRole,
  getAllTugasCategories,
  saveTugasCategory,
  updateTugasCategory,
  deleteTugasCategory,
  getAllTugasGuru,
  saveTugasGuru,
  updateTugasGuru,
  deleteTugasGuru,
  getAllStudentAccounts,
  saveStudentAccount,
  updateStudentAccount,
  deleteStudentAccount,
  syncStudentAccounts,
  massRegenerateStudentPasswords,
  regenerateStudentPassword,
  syncTeacherRole,
  syncAllTeacherRoles,
  getActivePeriod,
  getAssignedWakaKurikulum,
  updateSettings,
  getAllKioskTerminals,
  upsertKioskHeartbeat,
  updateKioskTerminalName,
  deleteKioskTerminal,
  importEmergencyAttendance,
  recordKioskCommandExecution
} from './src/dataStore.ts';

import { checkActivePeriodPendingStatus, getAllTeacherProgressReports } from './src/perangkatStore.ts';
import { nextcloudWebdavService } from './src/services/nextcloudWebdavService.ts';
import { formatPerangkatSupervisiWhatsAppMessage } from './src/services/whatsappService.ts';

import { 
  getWIBDateString, 
  getWIBTimeString, 
  getWIBDayName, 
  getWIBDayNameEnglish, 
  getWIBDayIndex, 
  getWIBISOString, 
  formatWIBDateIndo 
} from './src/timezone.ts';

import { 
  generateToken, 
  verifyToken, 
  requireAdmin, 
  authenticateToken, 
  AuthenticatedRequest 
} from './src/auth.ts';

import { safeDbQuery } from './src/db.ts';
import perangkatRoutes from './src/routes/perangkatRoutes.ts';

import multer from 'multer';
import AdmZip from 'adm-zip';
import fs from 'fs';
import os from 'os';
import cron from 'node-cron';
import { spawn } from 'child_process';
// @ts-ignore
import * as archiverModule from 'archiver';
const archiver = (archiverModule as any).default || archiverModule;

function handleDbError(e: any, res: any, defaultRes: any = []) {
  if (e.code === 'ECONNREFUSED') {
    return res.status(200).json(defaultRes);
  }
  return res.status(200).json(defaultRes);
}

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Port MUST strictly be 3000 as required by the reverse proxy infrastructure
const PORT = 3000;

// Setup upload directory safely with os.tmpdir fallback
const localCwdUploads = path.join(process.cwd(), 'uploads');
let baseUploadsDir = process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'uploads') : localCwdUploads;
try {
  if (!fs.existsSync(baseUploadsDir)) {
    fs.mkdirSync(baseUploadsDir, { recursive: true });
  }
  // Try writing a test file to check for read-only fs
  const testFile = path.join(baseUploadsDir, '.test');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
} catch (e) {
  baseUploadsDir = path.join(os.tmpdir(), 'presensi_uploads');
  try {
    if (!fs.existsSync(baseUploadsDir)) fs.mkdirSync(baseUploadsDir, { recursive: true });
  } catch (err) {}
}

const UPLOADS_DIR = baseUploadsDir;
const PHOTOS_DIR = path.join(UPLOADS_DIR, 'photos');
const BRANDING_DIR = path.join(UPLOADS_DIR, 'branding');
const SOUNDS_DIR = path.join(UPLOADS_DIR, 'sounds');
const TEMP_DIR = path.join(UPLOADS_DIR, 'temp');

// Pastikan semua direktori upload (baik di UPLOADS_DIR maupun di root project ./uploads) siap digunakan
const allDirectoriesToEnsure = [
  UPLOADS_DIR, PHOTOS_DIR, BRANDING_DIR, SOUNDS_DIR, TEMP_DIR,
  localCwdUploads,
  path.join(localCwdUploads, 'photos'),
  path.join(localCwdUploads, 'branding'),
  path.join(localCwdUploads, 'sounds'),
  path.join(localCwdUploads, 'temp')
];

allDirectoriesToEnsure.forEach(dir => {
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch (e) {}
});

function saveBase64ToFile(base64DataUrl: string, targetDir: string, defaultName: string): string {
  try {
    if (!base64DataUrl || typeof base64DataUrl !== 'string') return '';
    if (!base64DataUrl.startsWith('data:image/')) {
      return base64DataUrl;
    }
    const matches = base64DataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!matches) return base64DataUrl;
    let ext = matches[1] === 'jpeg' ? 'jpg' : matches[1] === 'svg+xml' ? 'svg' : matches[1];
    if (ext.length > 5) ext = 'png';
    const dataBuffer = Buffer.from(matches[2], 'base64');
    const timestamp = Date.now();
    const filename = `${defaultName}_${timestamp}.${ext}`;
    
    // Simpan ke targetDir
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, filename), dataBuffer);
    fs.writeFileSync(path.join(targetDir, `${defaultName}.${ext}`), dataBuffer);

    // Sinkronkan ke PHOTOS_DIR dan BRANDING_DIR
    [PHOTOS_DIR, BRANDING_DIR].forEach(dir => {
      try {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, filename), dataBuffer);
        fs.writeFileSync(path.join(dir, `${defaultName}.${ext}`), dataBuffer);
      } catch (e) {}
    });

    // Sinkronkan juga ke root cwd ./uploads/photos dan ./uploads/branding jika direktori terpisah
    const localPhotos = path.join(process.cwd(), 'uploads', 'photos');
    const localBranding = path.join(process.cwd(), 'uploads', 'branding');
    [localPhotos, localBranding].forEach(dir => {
      try {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, filename), dataBuffer);
        fs.writeFileSync(path.join(dir, `${defaultName}.${ext}`), dataBuffer);
      } catch (e) {}
    });

    return targetDir === BRANDING_DIR ? `/uploads/branding/${filename}` : `/uploads/photos/${filename}`;
  } catch (err) {
    console.error('Error saving base64 to file:', err);
    return base64DataUrl;
  }
}

const upload = multer({ dest: TEMP_DIR });

const SETTINGS_FILE = path.join(UPLOADS_DIR, 'settings.json');
const defaultSettings: any = {
  websiteName: 'Panel Admin SMK',
  judulAplikasi: 'Sistem Presensi Siswa',
  judul_aplikasi: 'Sistem Presensi Siswa',
  judulPiket: 'Portal Guru Piket & Perizinan',
  judul_piket: 'Portal Guru Piket & Perizinan',
  judulGuruPortal: 'Akses Data Guru',
  judul_guru_portal: 'Akses Data Guru',
  subjudulGuruPortal: 'Portal Kehadiran, Piket & Akun Guru',
  subjudul_guru_portal: 'Portal Kehadiran, Piket & Akun Guru',
  logoBase64: '',
  faviconBase64: '',
  globalArrivalMax: '12:00',
  globalDepartureMin: '13:00',
  scannerType: 'external',
  barcodeType: 'qrcode',
  suaraSukses: 'default1',
  suaraGagal: 'default2',
  fileSuaraSukses: '',
  fileSuaraGagal: '',
  scannerRunningText: 'Selamat Datang di Portal Presensi Siswa • Silakan scan kartu barcode/QR Anda pada scanner USB • Tetap tertib & jaga kedisiplinan',
  scannerThemePreset: 'indigo',
  scannerThemeColor: '',
  scannerBackgroundImage: '',
  scannerBoxBgColor: '#ffffff',
  scannerBoxOpacity: 96,
  waMode: 'manual',
  wa_mode: 'manual',
  waProvider: 'fonnte',
  waApiUrl: 'https://api.fonnte.com/send',
  wa_api_url: 'https://api.fonnte.com/send',
  waApiKey: '',
  wa_api_key: '',
  waApiSecret: '',
  wa_api_secret: '',
  waGroupId: '',
  wa_group_id: '',
  waGroupName: 'Grup Presensi SMK',
  wa_group_name: 'Grup Presensi SMK',
  waGroups: [],
  wa_groups: [],
  waCronTime: '15:00',
  wa_cron_time: '15:00',
  waCronDays: ['1', '2', '3', '4', '5'],
  wa_cron_days: ['1', '2', '3', '4', '5'],
  schedule: {
    Monday: { arrivalStart: '06:30', arrivalLate: '07:15', arrivalEnd: '12:00', departureStart: '13:00', departureEnd: '17:00' },
    Tuesday: { arrivalStart: '06:30', arrivalLate: '07:15', arrivalEnd: '12:00', departureStart: '13:00', departureEnd: '17:00' },
    Wednesday: { arrivalStart: '06:30', arrivalLate: '07:15', arrivalEnd: '12:00', departureStart: '13:00', departureEnd: '17:00' },
    Thursday: { arrivalStart: '06:30', arrivalLate: '07:15', arrivalEnd: '12:00', departureStart: '13:00', departureEnd: '17:00' },
    Friday: { arrivalStart: '06:30', arrivalLate: '07:15', arrivalEnd: '12:00', departureStart: '13:00', departureEnd: '17:00' },
  },
  studentCustomFields: []
};

function getLocalSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      return { ...defaultSettings, ...parsed };
    }
  } catch (e) {}
  return { ...defaultSettings };
}

function saveLocalSettings(data: any) {
  try {
    const current = getLocalSettings();
    const merged = { ...current, ...data };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2), 'utf-8');
    return merged;
  } catch (e) {
    return { ...defaultSettings, ...data };
  }
}

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // Serve uploads & photos static directories with robust fallbacks
  app.use('/uploads/photos', express.static(PHOTOS_DIR));
  app.use('/uploads/photos', express.static(path.join(localCwdUploads, 'photos')));
  app.use('/uploads/branding', express.static(BRANDING_DIR));
  app.use('/uploads/branding', express.static(path.join(localCwdUploads, 'branding')));
  app.use('/uploads/sounds', express.static(SOUNDS_DIR));
  app.use('/uploads/sounds', express.static(path.join(localCwdUploads, 'sounds')));
  app.use('/uploads', express.static(UPLOADS_DIR));
  app.use('/uploads', express.static(localCwdUploads));
  app.use('/photos', express.static(PHOTOS_DIR));
  app.use('/photos', express.static(path.join(localCwdUploads, 'photos')));
  app.use('/branding', express.static(BRANDING_DIR));
  app.use('/branding', express.static(path.join(localCwdUploads, 'branding')));
  app.use('/sounds', express.static(SOUNDS_DIR));
  app.use('/sounds', express.static(path.join(localCwdUploads, 'sounds')));

  // Health checks
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  app.get('/health', (req, res) => {
    res.status(200).send('OK');
  });
  app.get('/healthz', (req, res) => {
    res.status(200).send('OK');
  });
  app.get('/_health', (req, res) => {
    res.status(200).send('OK');
  });

  // --- MODUL PERENCANAAN PEMBELAJARAN (PERANGKAT AJAR) ---
  app.use('/api/perangkat', perangkatRoutes);
  app.use('/api/perangkat-ajar', perangkatRoutes);
  app.use('/api/v1/perangkat', perangkatRoutes);

  // --- API ROUTES ---

  function getPiketAccount() {
    const PIKET_FILE = path.join(UPLOADS_DIR, 'akun_piket.json');
    try {
      if (fs.existsSync(PIKET_FILE)) {
        return JSON.parse(fs.readFileSync(PIKET_FILE, 'utf-8'));
      }
    } catch (e) {}
    return { username: 'piket', password_hash: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' }; // default 'password123'
  }

  function savePiketAccount(account: any) {
    const PIKET_FILE = path.join(UPLOADS_DIR, 'akun_piket.json');
    try {
      fs.writeFileSync(PIKET_FILE, JSON.stringify(account, null, 2), 'utf-8');
    } catch (e) {}
  }

  function getAdminAccount() {
    const ADMIN_FILE = path.join(UPLOADS_DIR, 'akun_admin.json');
    try {
      if (fs.existsSync(ADMIN_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf-8'));
        if (parsed && parsed.username) return parsed;
      }
    } catch (e) {}
    // Default admin account (username: 'admin', password: 'admin')
    return { 
      id: '1', 
      username: 'admin', 
      password_hash: '$2b$10$B7W5dadEIm00k6o8XeVPHOxYSIpeF68BCBhS6sVZtD.Q9PD7dYVSC' 
    };
  }

  function saveAdminAccount(account: any) {
    const ADMIN_FILE = path.join(UPLOADS_DIR, 'akun_admin.json');
    try {
      fs.writeFileSync(ADMIN_FILE, JSON.stringify(account, null, 2), 'utf-8');
    } catch (e) {}
  }

  // --- ADMIN AUTH & ACCOUNT ENDPOINTS ---
  app.post('/api/admin/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username dan password wajib diisi' });
      }

      const inputUser = String(username).trim();
      const inputPass = String(password).trim();

      let user: any = null;
      try {
        const result = await pool.query('SELECT * FROM akun_admin WHERE LOWER(username) = LOWER($1)', [inputUser]);
        if (result.rows.length > 0) {
          user = result.rows[0];
        }
      } catch (dbErr) {}

      if (!user) {
        const localAdmin = getAdminAccount();
        if (localAdmin.username && localAdmin.username.toLowerCase() === inputUser.toLowerCase()) {
          user = localAdmin;
        }
      }

      if (user) {
        let match = false;
        const storedHash = user.password_hash || '';

        // Strictly verify using bcrypt or exact match if unhashed legacy
        if (storedHash.startsWith('$2b$') || storedHash.startsWith('$2a$')) {
          try {
            match = await bcrypt.compare(inputPass, storedHash);
          } catch (bErr) {
            match = false;
          }
        } else {
          match = (storedHash === inputPass);
        }

        if (match) {
          const adminUserData = {
            id: user.id || 'admin_id',
            username: user.username,
            role: 'admin',
            name: 'Administrator'
          };
          const token = generateToken(adminUserData, '24h');
          return res.json({ 
            success: true, 
            token,
            username: user.username,
            user: adminUserData
          });
        }
      }

      return res.status(401).json({ error: 'Username atau password admin salah' });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Gagal login admin' });
    }
  });

  app.get('/api/admin/account', async (req, res) => {
    try {
      let username = 'admin';
      try {
        const result = await pool.query('SELECT username FROM akun_admin LIMIT 1');
        if (result.rows.length > 0) {
          username = result.rows[0].username;
        }
      } catch (dbErr) {}

      if (username === 'admin') {
        const localAdmin = getAdminAccount();
        username = localAdmin.username || 'admin';
      }

      res.json({ success: true, username });
    } catch (e: any) {
      res.json({ success: true, username: 'admin' });
    }
  });

  app.post('/api/settings/admin-account', async (req, res) => {
    try {
      const { username, currentPassword, newPassword } = req.body;
      if (!username || !username.trim()) {
        return res.status(400).json({ error: 'Username admin tidak boleh kosong' });
      }

      let currentAdmin: any = null;
      try {
        const result = await pool.query('SELECT * FROM akun_admin LIMIT 1');
        if (result.rows.length > 0) currentAdmin = result.rows[0];
      } catch (e) {}

      if (!currentAdmin) {
        currentAdmin = getAdminAccount();
      }

      // If currentPassword is provided, verify it strictly
      if (currentPassword) {
        let match = false;
        const curPass = String(currentPassword).trim();
        const storedHash = currentAdmin.password_hash || '';

        if (storedHash.startsWith('$2b$') || storedHash.startsWith('$2a$')) {
          try {
            match = await bcrypt.compare(curPass, storedHash);
          } catch (e) {
            match = false;
          }
        } else {
          match = (storedHash === curPass);
        }

        if (!match) {
          return res.status(400).json({ error: 'Password lama / saat ini tidak cocok. Pastikan password lama yang dimasukkan sesuai.' });
        }
      }

      let passwordHash = currentAdmin.password_hash;
      if (newPassword && newPassword.trim()) {
        passwordHash = await bcrypt.hash(newPassword.trim(), 10);
      }

      const updatedAccount = {
        id: currentAdmin.id || '1',
        username: username.trim(),
        password_hash: passwordHash
      };

      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS akun_admin (
            id VARCHAR(255) PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL
          )
        `);
        // Clean any duplicate or orphaned rows to maintain single authoritative admin
        await pool.query(`DELETE FROM akun_admin WHERE id != $1`, [updatedAccount.id]);
        await pool.query(`
          INSERT INTO akun_admin (id, username, password_hash)
          VALUES ($1, $2, $3)
          ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, password_hash = EXCLUDED.password_hash
        `, [updatedAccount.id, updatedAccount.username, updatedAccount.password_hash]);
      } catch (dbErr) {
        console.error('Error saving akun_admin to pool:', dbErr);
      }

      saveAdminAccount(updatedAccount);
      res.json({ success: true, message: 'Akun admin berhasil diperbarui', username: updatedAccount.username });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Gagal mengubah akun admin' });
    }
  });

  // --- PIKET ENDPOINTS ---
  app.post('/api/piket/login', async (req, res) => {
    try {
      const { username, password, clientDay } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username dan password wajib diisi' });
      }

      const cleanUsername = String(username).trim();
      const cleanPassword = String(password).trim();

      // Dapatkan hari saat ini dalam bahasa Indonesia (WIB / Asia/Jakarta)
      const currentDayName = clientDay || getWIBDayName();

      // 1. Cek Akun Master Piket / Admin
      let masterUser: any = null;
      try {
        const result = await safeDbQuery('SELECT * FROM akun_piket WHERE username = $1', [cleanUsername]);
        if (result.rows && result.rows.length > 0) masterUser = result.rows[0];
      } catch (dbErr) {}

      if (!masterUser) {
        const localPiket = getPiketAccount();
        if (localPiket.username === cleanUsername) {
          masterUser = localPiket;
        }
      }

      if (masterUser) {
        let match = false;
        const storedHash = masterUser.password_hash || '';
        if (storedHash.startsWith('$2b$') || storedHash.startsWith('$2a$')) {
          try {
            match = await bcrypt.compare(cleanPassword, storedHash);
          } catch (bErr) {
            match = false;
          }
        } else {
          match = (storedHash === cleanPassword);
        }

        if (match) {
          const token = generateToken({
            id: masterUser.id || 'piket_admin',
            username: masterUser.username,
            role: 'admin_piket',
            name: 'Petugas Piket Utama'
          }, '24h');

          return res.json({
            success: true,
            token,
            user: {
              role: 'admin_piket',
              name: 'Petugas Piket Utama',
              username: masterUser.username,
              day: currentDayName,
              keterangan: 'Administrator Piket'
            }
          });
        }
      }

      // 2. Cek Akun Guru (Guru Piket Login)
      const allTeacherAccounts = await getAllTeacherAccounts();
      const teacherAccount = allTeacherAccounts.find(
        a => a.username.toLowerCase() === cleanUsername.toLowerCase() ||
             (a.nip && a.nip.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === cleanUsername.toLowerCase())
      );

      if (teacherAccount) {
        let isPassMatch = false;
        const storedHash = teacherAccount.password_hash || '';
        if (storedHash.startsWith('$2b$') || storedHash.startsWith('$2a$')) {
          try {
            isPassMatch = await bcrypt.compare(cleanPassword, storedHash);
          } catch (e) {
            isPassMatch = false;
          }
        }
        
        if (!isPassMatch && teacherAccount.password_plain === cleanPassword) {
          isPassMatch = true;
        }

        if (!isPassMatch) {
          return res.status(401).json({ error: 'Password yang Anda masukkan salah' });
        }

        if (teacherAccount.status === 'NONAKTIF') {
          return res.status(403).json({ error: 'Akun guru Anda saat ini berstatus NONAKTIF. Silakan hubungi admin sekolah.' });
        }

        // VALIDASI HARI PIKET (REQUIREMENT 3)
        const allPiketSchedules = await getAllPiketSchedule();
        const teacherSchedules = allPiketSchedules.filter(
          s => s.teacher_id === teacherAccount.teacher_id ||
               (s.teacher_name && s.teacher_name.toLowerCase() === teacherAccount.name.toLowerCase())
        );

        const isScheduledToday = teacherSchedules.find(
          s => s.day_name.toLowerCase() === currentDayName.toLowerCase()
        );

        if (!isScheduledToday) {
          const activeDays = teacherSchedules.map(s => s.day_name).join(', ');
          return res.status(403).json({
            error: `Akses Ditolak: Bapak/Ibu ${teacherAccount.name} tidak memiliki jadwal tugas piket pada hari ini (${currentDayName}). ${
              activeDays ? `Jadwal piket Anda adalah pada hari: ${activeDays}.` : 'Anda belum terdaftar dalam jadwal tugas piket mingguan.'
            }`
          });
        }

        // Login Berhasil untuk Guru Piket Terjadwal Hari Ini!
        const token = generateToken({
          id: teacherAccount.id,
          teacherId: teacherAccount.teacher_id,
          username: teacherAccount.username,
          role: 'guru_piket',
          name: teacherAccount.name
        }, '24h');

        return res.json({
          success: true,
          token,
          user: {
            role: 'guru_piket',
            teacherId: teacherAccount.teacher_id,
            name: teacherAccount.name,
            nip: teacherAccount.nip,
            username: teacherAccount.username,
            day: currentDayName,
            keterangan: isScheduledToday.keterangan || 'Guru Piket'
          }
        });
      }

      return res.status(401).json({ error: 'Username atau password tidak ditemukan' });
    } catch (e: any) { 
      res.status(500).json({ error: e.message || 'Gagal melakukan login' }); 
    }
  });

  // --- PORTAL KEHADIRAN GURU LOGIN ---
  app.post('/api/guru/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Username/NIP dan password wajib diisi' });
      }

      const cleanUsername = String(username).trim();
      const cleanPassword = String(password).trim();

      // 1. Cek jika akun Admin masuk (untuk supervisi KBM)
      let adminAccount: any = null;
      try {
        const result = await safeDbQuery('SELECT * FROM akun_admin WHERE LOWER(username) = LOWER($1)', [cleanUsername]);
        if (result.rows && result.rows.length > 0) adminAccount = result.rows[0];
      } catch (dbErr) {}

      if (!adminAccount) {
        const localAdmin = getAdminAccount();
        if (localAdmin.username && localAdmin.username.toLowerCase() === cleanUsername.toLowerCase()) {
          adminAccount = localAdmin;
        }
      }

      if (adminAccount) {
        let match = false;
        const storedHash = adminAccount.password_hash || '';
        if (storedHash.startsWith('$2b$') || storedHash.startsWith('$2a$')) {
          try {
            match = await bcrypt.compare(cleanPassword, storedHash);
          } catch (bErr) {
            match = false;
          }
        } else {
          match = (storedHash === cleanPassword);
        }

        if (match) {
          const token = generateToken({
            id: adminAccount.id || 'admin_supervisor',
            username: adminAccount.username,
            role: 'admin',
            name: 'Administrator (Supervisi KBM)'
          }, '24h');

          return res.json({
            success: true,
            token,
            teacher: {
              id: 'admin_supervisor',
              teacher_id: 'admin_supervisor',
              name: 'Administrator (Supervisi KBM)',
              nip: '198001012005011001',
              username: adminAccount.username,
              subject: 'Supervisi KBM',
              phone: '',
              role: 'admin'
            }
          });
        }
      }

      // 1.5 Cek Akun Kepala Sekolah
      const kepsekAcc = await getKepalaSekolahAccount();
      const cleanLower = cleanUsername.toLowerCase();
      const isKepsekUsername = cleanLower === 'kepsek' || 
                               cleanLower === (kepsekAcc.username || '').toLowerCase() || 
                               (kepsekAcc.nip && cleanLower === kepsekAcc.nip.replace(/[^a-zA-Z0-9]/g, '').toLowerCase());

      if (isKepsekUsername) {
        if (kepsekAcc.status === 'NONAKTIF') {
          return res.status(403).json({ success: false, error: 'Akun Kepala Sekolah saat ini berstatus NONAKTIF. Hubungi Administrator.' });
        }
        
        let matchKepsek = false;
        const storedHash = kepsekAcc.password_hash || '';
        if (storedHash.startsWith('$2b$') || storedHash.startsWith('$2a$')) {
          try {
            matchKepsek = await bcrypt.compare(cleanPassword, storedHash);
          } catch (e) {
            matchKepsek = false;
          }
        }
        if (!matchKepsek && kepsekAcc.password_plain === cleanPassword) {
          matchKepsek = true;
        }

        if (matchKepsek) {
          const token = generateToken({
            id: 'kepsek',
            username: kepsekAcc.username || 'kepsek',
            role: 'KEPALA_SEKOLAH',
            name: kepsekAcc.name || 'Kepala Sekolah'
          }, '24h');

          return res.json({
            success: true,
            token,
            teacher: {
              id: 'kepsek',
              teacher_id: 'kepsek',
              name: kepsekAcc.name || 'Kepala Sekolah',
              nip: kepsekAcc.nip || '',
              username: kepsekAcc.username || 'kepsek',
              subject: 'Kepala Sekolah',
              phone: '',
              class: '',
              role: 'KEPALA_SEKOLAH'
            }
          });
        }
      }

      // 2. Cek Akun Guru
      const [allTeacherAccounts, allTeachers] = await Promise.all([
        getAllTeacherAccounts(),
        getAllTeachers()
      ]);

      const teacherAccount = allTeacherAccounts.find(
        a => a.username.toLowerCase() === cleanUsername.toLowerCase() ||
             (a.nip && a.nip.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === cleanUsername.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()) ||
             (a.name && a.name.toLowerCase() === cleanUsername.toLowerCase())
      );

      if (!teacherAccount) {
        return res.status(401).json({ success: false, error: 'Akun guru dengan Username atau NIP tersebut tidak ditemukan' });
      }

      if (teacherAccount.status === 'NONAKTIF') {
        return res.status(403).json({ success: false, error: 'Akun guru Anda saat ini berstatus NONAKTIF. Silakan hubungi admin sekolah.' });
      }

      // Validasi Password
      let isPassMatch = false;
      const storedHash = teacherAccount.password_hash || '';
      if (storedHash.startsWith('$2b$') || storedHash.startsWith('$2a$')) {
        try {
          isPassMatch = await bcrypt.compare(cleanPassword, storedHash);
        } catch (e) {
          isPassMatch = false;
        }
      }
      if (!isPassMatch && teacherAccount.password_plain === cleanPassword) {
        isPassMatch = true;
      }

      if (!isPassMatch) {
        return res.status(401).json({ success: false, error: 'Password yang Anda masukkan salah' });
      }

      // Sync the teacher role based on active assignments before returning
      if (teacherAccount.teacher_id) {
        const liveRole = await syncTeacherRole(teacherAccount.teacher_id);
        teacherAccount.role = liveRole;
      }

      // Cari data profil guru lengkap
      const matchedTeacher = allTeachers.find(t => t.id === teacherAccount.teacher_id || t.name.toLowerCase() === teacherAccount.name.toLowerCase());

      const userRole = teacherAccount.role || 'GURU';
      const token = generateToken({
        id: teacherAccount.id,
        teacherId: teacherAccount.teacher_id,
        username: teacherAccount.username,
        role: userRole,
        name: teacherAccount.name
      }, '24h');

      return res.json({
        success: true,
        token,
        teacher: {
          id: teacherAccount.teacher_id,
          teacher_id: teacherAccount.teacher_id,
          name: teacherAccount.name,
          nip: teacherAccount.nip || (matchedTeacher ? (matchedTeacher as any).nip : '') || '',
          username: teacherAccount.username,
          subject: (matchedTeacher && ((matchedTeacher as any).subject || (matchedTeacher as any).mapel)) || 
                   (userRole === 'KEPALA_SEKOLAH' ? 'Kepala Sekolah' : userRole === 'GURU_BK' ? 'Bimbingan Konseling' : 'Guru Mata Pelajaran'),
          phone: (matchedTeacher && ((matchedTeacher as any).whatsapp || (matchedTeacher as any).phone)) || '',
          class: (matchedTeacher && matchedTeacher.class) || '',
          role: userRole
        }
      });
    } catch (e: any) {
      console.error('Error in /api/guru/login:', e);
      res.status(500).json({ success: false, error: e.message || 'Gagal melakukan login guru' });
    }
  });

  // Endpoint Ganti Password Akun Guru
  app.post('/api/guru/change-password', async (req, res) => {
    try {
      const { teacher_id, username, current_password, new_password, confirm_password } = req.body;
      if (!new_password || !String(new_password).trim()) {
        return res.status(400).json({ success: false, error: 'Password baru wajib diisi' });
      }
      if (String(new_password).trim().length < 4) {
        return res.status(400).json({ success: false, error: 'Password baru minimal 4 karakter' });
      }
      if (confirm_password && String(new_password).trim() !== String(confirm_password).trim()) {
        return res.status(400).json({ success: false, error: 'Konfirmasi password baru tidak cocok' });
      }

      const allAccounts = await getAllTeacherAccounts();
      const target = allAccounts.find(
        a => (teacher_id && (a.id === teacher_id || a.teacher_id === teacher_id)) ||
             (username && a.username.toLowerCase() === String(username).toLowerCase().trim())
      );

      if (!target) {
        return res.status(404).json({ success: false, error: 'Akun guru tidak ditemukan' });
      }

      // Verifikasi password saat ini jika diinput
      if (current_password) {
        const cleanCurr = String(current_password).trim();
        let isPassMatch = false;
        if (target.password_plain === cleanCurr || target.password_plain.toLowerCase() === cleanCurr.toLowerCase()) {
          isPassMatch = true;
        } else if (target.password_hash) {
          try {
            isPassMatch = await bcrypt.compare(cleanCurr, target.password_hash);
          } catch (e) {
            isPassMatch = false;
          }
        }
        if (!isPassMatch) {
          return res.status(400).json({ success: false, error: 'Password saat ini yang Anda masukkan salah' });
        }
      }

      const result = await regenerateTeacherPassword(target.id, String(new_password).trim());
      if (!result.success) {
        return res.status(500).json({ success: false, error: 'Gagal memperbarui password di database' });
      }

      return res.json({
        success: true,
        message: 'Password akun guru berhasil diperbarui!'
      });
    } catch (err: any) {
      console.error('Error in /api/guru/change-password:', err);
      res.status(500).json({ success: false, error: err.message || 'Gagal mengubah password' });
    }
  });

  app.get('/api/piket/izin', async (req, res) => {
    try {
      let rows: any[] = [];
      try {
        const cols = await getTableColumns('izin_siswa');
        const orderCol = cols.has('created_at') ? 'i.created_at' : (cols.has('dibuat_pada') ? 'i.dibuat_pada' : 'i.id');
        const result = await pool.query(`
          SELECT i.id, i.nisn, i.tanggal_mulai, i.tanggal_selesai, i.keterangan,
                 COALESCE(i.keperluan_dispensasi, '') as keperluan_dispensasi,
                 COALESCE(s.name, 'Siswa (' || i.nisn || ')') as student_name,
                 COALESCE(s.class, '-') as student_class
          FROM izin_siswa i
          LEFT JOIN students s ON TRIM(i.nisn) = TRIM(s.nisn)
          ORDER BY ${orderCol} DESC
        `);
        rows = result.rows || [];
      } catch (dbErr: any) {
        if (dbErr?.code !== 'ECONNREFUSED') {
          console.warn('[DATABASE] Error querying izin_siswa from pool:', dbErr?.message || dbErr);
        }
      }

      // Merge with local storage for high availability & guarantee zero data loss
      const [localIzinList, allStudents] = await Promise.all([
        getAllIzin(),
        getAllStudents()
      ]);

      const studentMap = new Map<string, any>();
      for (const s of allStudents) {
        studentMap.set(String(s.nisn).trim(), s);
      }

      const idSet = new Set(rows.map(r => String(r.id)));
      for (const loc of localIzinList) {
        if (!idSet.has(String(loc.id))) {
          const s = studentMap.get(String(loc.nisn).trim()) || {};
          rows.push({
            id: loc.id,
            nisn: loc.nisn,
            tanggal_mulai: loc.tanggal_mulai,
            tanggal_selesai: loc.tanggal_selesai,
            keterangan: loc.keterangan,
            student_name: s.name || `Siswa (${loc.nisn})`,
            student_class: s.class || '-'
          });
          idSet.add(String(loc.id));
        }
      }

      // Format all rows consistently
      const formatted = rows.map(r => {
        const s = studentMap.get(String(r.nisn).trim());
        const studentName = (r.student_name && !r.student_name.startsWith('Siswa ('))
          ? r.student_name
          : (s?.name || r.student_name || `Siswa (${r.nisn})`);
        const studentClass = (r.student_class && r.student_class !== '-')
          ? r.student_class
          : (s?.class || '-');

        let tglMulai = r.tanggal_mulai || r.tanggalMulai || '';
        if (tglMulai instanceof Date) tglMulai = tglMulai.toISOString().split('T')[0];
        else if (typeof tglMulai === 'string' && tglMulai.includes('T')) tglMulai = tglMulai.split('T')[0];

        let tglSelesai = r.tanggal_selesai || r.tanggalSelesai || tglMulai || '';
        if (tglSelesai instanceof Date) tglSelesai = tglSelesai.toISOString().split('T')[0];
        else if (typeof tglSelesai === 'string' && tglSelesai.includes('T')) tglSelesai = tglSelesai.split('T')[0];

        return {
          id: String(r.id),
          nisn: String(r.nisn).trim(),
          tanggal_mulai: tglMulai,
          tanggal_selesai: tglSelesai,
          keterangan: r.keterangan || 'Izin',
          keperluan_dispensasi: r.keperluan_dispensasi || '',
          student_name: studentName,
          student_class: studentClass,
          tanggalMulai: tglMulai,
          tanggalSelesai: tglSelesai
        };
      });

      return res.json(formatted);
    } catch (e: any) { 
      res.json([]); 
    }
  });

  app.get('/api/piket/check-attendance/:nisn', async (req, res) => {
    try {
      const { nisn } = req.params;
      const todayDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
      try {
        const checkRes = await pool.query(`
          SELECT a.id FROM attendance a
          JOIN students s ON a.student_id = s.id
          WHERE TRIM(s.nisn) = TRIM($1) AND TO_CHAR(timezone('Asia/Jakarta', a.timestamp::timestamp with time zone), 'YYYY-MM-DD') = $2
        `, [nisn, todayDateStr]);
        return res.json({ attended: checkRes.rows.length > 0 });
      } catch (dbErr) {
        const [allAtt, allStudents] = await Promise.all([
          getAllAttendance(),
          getAllStudents()
        ]);
        const student = allStudents.find(s => String(s.nisn).trim() === String(nisn).trim());
        if (!student) return res.json({ attended: false });
        const attended = allAtt.some(a => a.student_id === student.id && a.timestamp.startsWith(todayDateStr));
        return res.json({ attended });
      }
    } catch(e) {
      res.json({ attended: false });
    }
  });

  app.post('/api/piket/izin', async (req, res) => {
    try {
      const { nisn, tanggal_mulai, tanggal_selesai, keterangan, tanggalMulai, tanggalSelesai, keperluan_dispensasi, keperluanDispensasi, keperluan } = req.body;
      let tglMulai = (tanggal_mulai || tanggalMulai || '').trim();
      if (tglMulai.includes('T')) tglMulai = tglMulai.split('T')[0];
      let tglSelesai = (tanggal_selesai || tanggalSelesai || tglMulai || '').trim();
      if (tglSelesai.includes('T')) tglSelesai = tglSelesai.split('T')[0];
      const cleanNisn = String(nisn || '').trim();
      const dispDetail = String(keperluan_dispensasi || keperluanDispensasi || keperluan || '').trim();

      if (!cleanNisn) {
        return res.status(400).json({ error: 'NISN siswa wajib diisi' });
      }

      if (keterangan === 'Dispensasi' && !dispDetail) {
        return res.status(400).json({ error: 'Keterangan / Keperluan Dispensasi wajib diisi saat memilih jenis perizinan Dispensasi' });
      }

      const allIzin = await getAllIzin();
      const hasDuplicate = allIzin.some(i => {
        const iStart = (i.tanggal_mulai || '').split('T')[0].trim();
        const iEnd = (i.tanggal_selesai || iStart).split('T')[0].trim();
        return String(i.nisn).trim() === cleanNisn && iStart <= tglSelesai && iEnd >= tglMulai;
      });

      if (hasDuplicate) {
        return res.status(400).json({ error: 'Siswa sudah memiliki perizinan aktif pada rentang tanggal tersebut' });
      }

      const allAtt = await getAllAttendance();
      const allStudents = await getAllStudents();
      const student = allStudents.find(s => String(s.nisn).trim() === cleanNisn);
      if (student && keterangan !== 'Dispensasi') {
        const attendedToday = allAtt.some(a => a.student_id === student.id && a.timestamp.startsWith(tglMulai));
        if (attendedToday) {
          return res.status(400).json({ error: 'Siswa sudah melakukan presensi hari ini. Keterangan hanya boleh Dispensasi.' });
        }
      }

      const saved = await saveIzin({
        nisn: cleanNisn,
        tanggal_mulai: tglMulai,
        tanggal_selesai: tglSelesai,
        keterangan: keterangan || 'Izin',
        keperluan_dispensasi: dispDetail
      });

      res.json({ success: true, id: saved.id, data: saved });
    } catch (e: any) { 
      res.status(500).json({ error: e.message || 'Gagal menyimpan izin' }); 
    }
  });

  app.put('/api/piket/izin/:id', async (req, res) => {
    try {
      const { tanggal_mulai, tanggal_selesai, keterangan, tanggalMulai, tanggalSelesai, keperluan_dispensasi, keperluanDispensasi, keperluan } = req.body;
      let tglMulai = (tanggal_mulai || tanggalMulai || '').trim();
      if (tglMulai.includes('T')) tglMulai = tglMulai.split('T')[0];
      let tglSelesai = (tanggal_selesai || tanggalSelesai || tglMulai || '').trim();
      if (tglSelesai.includes('T')) tglSelesai = tglSelesai.split('T')[0];
      const id = String(req.params.id);
      const dispDetail = String(keperluan_dispensasi || keperluanDispensasi || keperluan || '').trim();

      if (keterangan === 'Dispensasi' && !dispDetail) {
        return res.status(400).json({ error: 'Keterangan / Keperluan Dispensasi wajib diisi saat memilih jenis perizinan Dispensasi' });
      }

      const allIzin = await getAllIzin();
      const targetIzin = allIzin.find(i => String(i.id) === id);
      if (!targetIzin) return res.status(404).json({ error: 'Data izin tidak ditemukan' });
      const cleanNisn = String(targetIzin.nisn).trim();

      const hasDuplicate = allIzin.some(i => {
        if (String(i.id) === id) return false;
        const iStart = (i.tanggal_mulai || '').split('T')[0].trim();
        const iEnd = (i.tanggal_selesai || iStart).split('T')[0].trim();
        return String(i.nisn).trim() === cleanNisn && iStart <= tglSelesai && iEnd >= tglMulai;
      });

      if (hasDuplicate) {
        return res.status(400).json({ error: 'Siswa sudah memiliki izin lain pada rentang tanggal tersebut' });
      }

      const allAtt = await getAllAttendance();
      const allStudents = await getAllStudents();
      const student = allStudents.find(s => String(s.nisn).trim() === cleanNisn);
      if (student && keterangan !== 'Dispensasi') {
        const attendedToday = allAtt.some(a => a.student_id === student.id && a.timestamp.startsWith(tglMulai));
        if (attendedToday) {
          return res.status(400).json({ error: 'Siswa sudah melakukan presensi hari ini. Keterangan hanya boleh Dispensasi.' });
        }
      }

      targetIzin.tanggal_mulai = tglMulai;
      targetIzin.tanggal_selesai = tglSelesai;
      targetIzin.keterangan = keterangan || 'Izin';
      targetIzin.keperluan_dispensasi = dispDetail;

      try {
        await pool.query(
          'UPDATE izin_siswa SET tanggal_mulai = $1, tanggal_selesai = $2, keterangan = $3, keperluan_dispensasi = $4 WHERE id = $5',
          [tglMulai, tglSelesai, targetIzin.keterangan, dispDetail, id]
        );
      } catch (dbErr) {}

      await saveIzin(targetIzin);
      res.json({ success: true, data: targetIzin });
      res.json({ success: true, data: targetIzin });
    } catch (e: any) { 
      res.status(500).json({ error: e.message || 'Gagal memperbarui izin' }); 
    }
  });

  app.delete('/api/piket/izin/:id', async (req, res) => {
    try {
      await deleteIzin(req.params.id);
      res.json({ success: true });
    } catch (e: any) { 
      res.status(500).json({ error: e.message || 'Gagal menghapus izin' }); 
    }
  });

  app.post('/api/settings/piket-password', async (req, res) => {
    try {
      const { password } = req.body;
      const hashed = await bcrypt.hash(password, 10);
      try {
        await pool.query('UPDATE akun_piket SET password_hash = $1 WHERE username = $2', [hashed, 'piket']);
      } catch (dbErr) {}
      savePiketAccount({ username: 'piket', password_hash: hashed });
      res.json({ success: true });
    } catch (e: any) { 
      res.status(500).json({ error: e.message || 'Gagal mengubah password piket' }); 
    }
  });


  initDb().catch(err => console.error("Database initialization failed:", err));
  
  const getSettings = async () => {
    try {
      const result = await pool.query('SELECT * FROM pengaturan WHERE id = 1');
      if (result.rows.length > 0) {
          const row = result.rows[0];
          const local = getLocalSettings();
          const rowData = row.data || {};
          return {
              ...local,
              ...rowData,
              globalArrivalMax: row.jam_masuk || rowData.globalArrivalMax || local.globalArrivalMax || '12:00',
              globalDepartureMin: row.jam_pulang || rowData.globalDepartureMin || local.globalDepartureMin || '13:00',
              websiteName: row.nama_website || rowData.websiteName || local.websiteName || 'Panel Admin SMK',
              judulAplikasi: row.judul_aplikasi || rowData.judulAplikasi || local.judulAplikasi || 'Sistem Presensi Siswa',
              judul_aplikasi: row.judul_aplikasi || rowData.judulAplikasi || local.judulAplikasi || 'Sistem Presensi Siswa',
              judulPiket: row.judul_piket || rowData.judulPiket || local.judulPiket || 'Portal Guru Piket & Perizinan',
              judul_piket: row.judul_piket || rowData.judulPiket || local.judulPiket || 'Portal Guru Piket & Perizinan',
              logoBase64: row.logo || rowData.logoBase64 || local.logoBase64 || '',
              faviconBase64: row.favicon || rowData.faviconBase64 || local.faviconBase64 || '',
              waMode: row.wa_mode || rowData.waMode || rowData.wa_mode || local.waMode || 'manual',
              wa_mode: row.wa_mode || rowData.waMode || rowData.wa_mode || local.waMode || 'manual',
              waTarget: row.wa_target || rowData.waTarget || rowData.wa_target || local.waTarget || 'both',
              wa_target: row.wa_target || rowData.waTarget || rowData.wa_target || local.waTarget || 'both',
              waProvider: row.wa_provider || rowData.waProvider || rowData.wa_provider || local.waProvider || (row.wa_api_url?.includes('wablas') ? 'wablas' : row.wa_api_url?.includes('starsender') ? 'starsender' : 'fonnte'),
              wa_provider: row.wa_provider || rowData.waProvider || rowData.wa_provider || local.waProvider || (row.wa_api_url?.includes('wablas') ? 'wablas' : row.wa_api_url?.includes('starsender') ? 'starsender' : 'fonnte'),
              waApiUrl: row.wa_api_url || rowData.waApiUrl || rowData.wa_api_url || local.waApiUrl || 'https://api.fonnte.com/send',
              wa_api_url: row.wa_api_url || rowData.waApiUrl || rowData.wa_api_url || local.waApiUrl || 'https://api.fonnte.com/send',
              waApiKey: row.wa_api_key || rowData.waApiKey || rowData.wa_api_key || local.waApiKey || '',
              wa_api_key: row.wa_api_key || rowData.waApiKey || rowData.wa_api_key || local.waApiKey || '',
              waApiSecret: row.wa_api_secret || rowData.waApiSecret || rowData.wa_api_secret || local.waApiSecret || '',
              wa_api_secret: row.wa_api_secret || rowData.waApiSecret || rowData.wa_api_secret || local.waApiSecret || '',
              waGroupId: row.wa_group_id || rowData.waGroupId || rowData.wa_group_id || local.waGroupId || '',
              wa_group_id: row.wa_group_id || rowData.waGroupId || rowData.wa_group_id || local.waGroupId || '',
              waGroupName: row.wa_group_name || rowData.waGroupName || rowData.wa_group_name || local.waGroupName || 'Grup Presensi SMK',
              wa_group_name: row.wa_group_name || rowData.waGroupName || rowData.wa_group_name || local.waGroupName || 'Grup Presensi SMK',
              waGroups: rowData.waGroups || rowData.wa_groups || local.waGroups || [],
              wa_groups: rowData.waGroups || rowData.wa_groups || local.waGroups || [],
              waCronTime: row.wa_cron_time || rowData.waCronTime || rowData.wa_cron_time || local.waCronTime || '15:00',
              wa_cron_time: row.wa_cron_time || rowData.waCronTime || rowData.wa_cron_time || local.waCronTime || '15:00',
              waCronDays: row.wa_cron_days ? (typeof row.wa_cron_days === 'string' ? JSON.parse(row.wa_cron_days) : row.wa_cron_days) : (rowData.waCronDays || local.waCronDays || ['1', '2', '3', '4', '5']),
              wa_cron_days: row.wa_cron_days ? (typeof row.wa_cron_days === 'string' ? JSON.parse(row.wa_cron_days) : row.wa_cron_days) : (rowData.waCronDays || local.waCronDays || ['1', '2', '3', '4', '5']),
              scannerType: row.scanner_type || rowData.scannerType || local.scannerType || 'external',
              barcodeType: row.barcode_type || rowData.barcodeType || local.barcodeType || 'qrcode',
              suaraSukses: row.suara_sukses || rowData.suaraSukses || local.suaraSukses || 'default1',
              suaraGagal: row.suara_gagal || rowData.suaraGagal || local.suaraGagal || 'default2',
              fileSuaraSukses: row.file_suara_sukses || rowData.fileSuaraSukses || local.fileSuaraSukses || '',
              fileSuaraGagal: row.file_suara_gagal || rowData.fileSuaraGagal || local.fileSuaraGagal || '',
              themePreset: rowData.themePreset || rowData.theme_preset || local.themePreset || 'indigo',
              themeColor: rowData.themeColor || rowData.theme_color || local.themeColor || ''
          };
      }
    } catch(e) {}
    return getLocalSettings();
  };

  const updateGlobalSettings = async (partial: Record<string, any>) => {
    try {
      saveLocalSettings(partial);
      await updateSettings(partial);
      const cur = await safeDbQuery('SELECT * FROM pengaturan WHERE id = 1');
      const taVal = partial.tahun_ajaran || partial.tahunAjaran || (cur.rows.length > 0 ? (cur.rows[0] as any).tahun_ajaran : '2024/2025');
      const semVal = partial.semester || (cur.rows.length > 0 ? (cur.rows[0] as any).semester : 'Ganjil');
      if (cur.success && cur.rows.length > 0) {
        const curData = (typeof (cur.rows[0] as any).data === 'string' ? JSON.parse((cur.rows[0] as any).data) : (cur.rows[0] as any).data) || {};
        const merged = { ...curData, ...partial };
        await safeDbQuery('UPDATE pengaturan SET data = $1, tahun_ajaran = $2, semester = $3 WHERE id = 1', [JSON.stringify(merged), taVal, semVal]);
      } else if (cur.success) {
        await safeDbQuery('INSERT INTO pengaturan (id, data, tahun_ajaran, semester) VALUES (1, $1, $2, $3)', [JSON.stringify(partial), taVal, semVal]);
      }
    } catch (e) {
      saveLocalSettings(partial);
      try {
        await updateSettings(partial);
      } catch (err) {}
    }
  };
  
  // --- WHATSAPP MESSAGING & AUTOMATION ENGINE ---
  const sendWhatsAppMessage = async ({
    url,
    apiKey,
    apiSecret,
    provider,
    phone,
    message
  }: {
    url?: string;
    apiKey?: string;
    apiSecret?: string;
    provider?: string;
    phone: string;
    message: string;
  }) => {
    const isGroup = phone.includes('@g.us') || phone.includes('-group') || phone.endsWith('@broadcast');
    let cleanPhone = phone;
    if (!isGroup) {
      cleanPhone = (phone || '').replace(/\D/g, '');
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '62' + cleanPhone.substring(1);
      }
      if (!cleanPhone.startsWith('62') && cleanPhone.length > 5) {
        cleanPhone = '62' + cleanPhone;
      }
    }

    const endpoint = (url || '').trim() || 'https://api.fonnte.com/send';
    const key = (apiKey || '').trim();
    const secret = (apiSecret || '').trim();
    const detectedProvider = provider || (
      endpoint.includes('fonnte') ? 'fonnte' : 
      endpoint.includes('wablas') ? 'wablas' : 
      endpoint.includes('starsender') ? 'starsender' : 'custom'
    );

    let reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    let reqBody: any = {};

    if (detectedProvider === 'fonnte') {
      reqHeaders['Authorization'] = key;
      reqBody = {
        target: cleanPhone,
        message: message,
        countryCode: isGroup ? undefined : '62'
      };
    } else if (detectedProvider === 'wablas') {
      reqHeaders['Authorization'] = key;
      if (secret) reqHeaders['Secret'] = secret;
      reqBody = {
        phone: cleanPhone,
        message: message,
        isGroup: isGroup ? 'true' : 'false'
      };
    } else if (detectedProvider === 'starsender') {
      reqHeaders['apikey'] = key;
      reqBody = {
        to: cleanPhone,
        message: message,
        isGroup: isGroup
      };
    } else {
      // Custom / Generic REST API
      if (key) {
        reqHeaders['Authorization'] = key.startsWith('Bearer ') ? key : `Bearer ${key}`;
        reqHeaders['x-api-key'] = key;
      }
      reqBody = {
        phone: cleanPhone,
        target: cleanPhone,
        number: cleanPhone,
        to: cleanPhone,
        message: message,
        text: message,
        isGroup: isGroup
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: reqHeaders,
      body: JSON.stringify(reqBody)
    });

    const respText = await response.text();
    let parsed: any;
    try {
      parsed = JSON.parse(respText);
    } catch {
      parsed = { raw: respText };
    }

    if (!response.ok) {
      const errDetail = parsed?.message || parsed?.reason || parsed?.detail || parsed?.error || `HTTP ${response.status}: ${respText}`;
      throw new Error(errDetail);
    }

    // Periksa respon internal provider (beberapa gateway seperti Fonnte/Wablas mengembalikan HTTP 200 namun status: false jika token salah/device disconnect)
    if (parsed && typeof parsed === 'object') {
      if (parsed.status === false || parsed.status === 'false' || parsed.status === 'failed' || parsed.status === 'error' || parsed.success === false) {
        const errDetail = parsed.reason || parsed.detail || parsed.message || parsed.error || (typeof parsed.data === 'string' ? parsed.data : '') || 'Provider WhatsApp menolak pengiriman pesan (Status False)';
        throw new Error(errDetail);
      }
    }

    return parsed;
  };

  const sendDailyAttendanceReports = async (dateStr?: string) => {
    try {
      const settings = await getSettings();
      if (!settings) return { success: false, error: 'Pengaturan tidak ditemukan' };
      const waUrl = settings.waApiUrl || 'https://api.fonnte.com/send';
      const waKey = settings.waApiKey;
      if (!waKey) {
        return { success: false, error: 'API Key WhatsApp belum dikonfigurasi di Pengaturan' };
      }

      const targetDate = dateStr || new Date().toISOString().split('T')[0];
      const [students, teachers, allAttendance, allIzin, rombelStatus] = await Promise.all([
        getAllStudents(),
        getAllTeachers(),
        getAllAttendance(),
        getAllIzin(),
        getAllRombelStatus()
      ]);

      const attendance = allAttendance.filter(a => a.timestamp.startsWith(targetDate));
      const activeIzin = allIzin.filter(i => i.tanggal_mulai <= targetDate && i.tanggal_selesai >= targetDate);

      const groups: Record<string, any[]> = {};
      for (const s of students) {
        if (s.status === 'LULUS') continue;
        const key = `${s.year || ''}_${s.class || ''}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
      }

      const results: any[] = [];
      const websiteName = settings.websiteName || 'SMK';
      const activeClassesSummary: string[] = [];
      const waTarget = String(settings.waTarget || settings.wa_target || 'both').toLowerCase();
      const shouldSendWaliKelas = waTarget === 'walikelas' || waTarget === 'both';
      const shouldSendGroup = waTarget === 'group' || waTarget === 'grup' || waTarget === 'both';

      for (const groupKey of Object.keys(groups)) {
        const [year, className] = groupKey.split('_');
        if (!className) continue;

        const rawStudents = groups[groupKey] || [];
        // Filter hanya siswa aktif (bukan PKL / LULUS)
        const classStudents = rawStudents.filter((s: any) => s.status !== 'PKL' && s.status !== 'LULUS');
        if (classStudents.length === 0) continue;

        const isPkl = rombelStatus[className] === 'PKL';

        if (isPkl) {
          results.push({
            class: className,
            year,
            status: 'skipped',
            reason: 'Kelas berstatus PKL (dikecualikan dari laporan presensi aktif)'
          });
          continue;
        }

        const records = attendance.filter((a: any) => {
          const student = classStudents.find((s: any) => s.id === a.student_id);
          return !!student;
        });

        const arrivals = records.filter((r: any) => r.type === 'ARRIVAL');
        const departures = records.filter((r: any) => r.type === 'DEPARTURE');
        const arrivedIds = new Set(arrivals.map((r: any) => r.student_id));
        const notArrived = classStudents.filter((s: any) => !arrivedIds.has(s.id));
        const lateArrivals = arrivals.filter((r: any) => r.status === 'LATE');
        
        const studentsIzin = notArrived.map((s: any) => {
            const izinData = activeIzin.find(i => i.nisn === s.nisn);
            return {
                ...s,
                statusIzin: izinData ? izinData.keterangan : 'Alpa'
            };
        });

        const countAlpa = studentsIzin.filter(s => s.statusIzin === 'Alpa').length;
        const countIzin = studentsIzin.filter(s => s.statusIzin !== 'Alpa').length;

        activeClassesSummary.push(`*${className}*: Hadir ${arrivals.length}/${classStudents.length} (Terlambat ${lateArrivals.length}), Izin/Sakit ${countIzin}, Alpa ${countAlpa}`);

        // Only send individual teacher message if enabled in settings
        if (!shouldSendWaliKelas) {
          continue;
        }

        const teacher = teachers.find((t: any) => t.class === className && (!year || t.year === year));
        if (!teacher || !teacher.whatsapp) {
          results.push({ class: className, year, status: 'skipped', reason: 'Tidak ada wali kelas atau nomor WA' });
          continue;
        }

        if (teacher.status === 'NONAKTIF' || teacher.status === 'INACTIVE') {
          results.push({
            class: className,
            year,
            teacher: teacher.name,
            status: 'skipped',
            reason: 'Wali kelas berstatus Nonaktif (tidak dikirimkan)'
          });
          continue;
        }

        let text = `*LAPORAN PRESENSI SISWA*\n`;
        text += `${websiteName} - Kelas ${className} (Angkatan ${year || '-'})\n`;
        text += `Tanggal: ${targetDate}\n\n`;
        text += `*Ringkasan Kehadiran:*\n`;
        text += `• Total Siswa: ${classStudents.length}\n`;
        text += `• Hadir Tepat Waktu: ${arrivals.length - lateArrivals.length}\n`;
        text += `• Terlambat: ${lateArrivals.length}\n`;
        text += `• Izin/Sakit/Dispensasi: ${countIzin}\n`;
        text += `• Belum Hadir / Alpa: ${countAlpa}\n`;
        text += `• Sudah Pulang: ${departures.length}\n\n`;

        if (studentsIzin.length > 0) {
          text += `*Daftar Siswa Tidak Hadir:*\n`;
          studentsIzin.slice(0, 20).forEach((s: any, idx: number) => {
            text += `${idx + 1}. ${s.name} (${s.statusIzin})\n`;
          });
          if (studentsIzin.length > 20) {
            text += `...dan ${studentsIzin.length - 20} siswa lainnya.\n`;
          }
          text += '\n';
        }

        text += `_Pesan otomatis dikirim oleh Sistem Presensi ${websiteName}_`;

        try {
          const res = await sendWhatsAppMessage({
            url: waUrl,
            apiKey: waKey,
            apiSecret: settings.waApiSecret,
            provider: settings.waProvider,
            phone: teacher.whatsapp,
            message: text
          });
          results.push({ class: className, year, teacher: teacher.name, phone: teacher.whatsapp, status: 'sent', res });
        } catch (err: any) {
          results.push({ class: className, year, teacher: teacher.name, phone: teacher.whatsapp, status: 'error', error: err.message });
        }
      }

      // If WhatsApp Groups are configured and shouldSendGroup is enabled, send overall summary of ALL classes
      const rawGroups: any[] = settings.waGroups || settings.wa_groups || [];
      const activeGroups = rawGroups.filter((g: any) => g && g.targetId && (g.isActive !== false));
      const targetGroupList = activeGroups.length > 0
        ? activeGroups.map((g: any) => ({ id: g.targetId, name: g.name }))
        : (settings.waGroupId || settings.wa_group_id ? [{ id: settings.waGroupId || settings.wa_group_id, name: settings.waGroupName || 'Grup Presensi' }] : []);

      if (shouldSendGroup && targetGroupList.length > 0 && activeClassesSummary.length > 0) {
        let groupText = `*📢 REKAP PRESENSI HARIAN SEKOLAH*\n`;
        groupText += `*${websiteName}*\n`;
        groupText += `Tanggal: ${targetDate}\n\n`;
        groupText += `*Ringkasan Seluruh Kelas:*\n`;
        groupText += activeClassesSummary.map(s => `• ${s}`).join('\n') + '\n\n';
        groupText += `_Laporan otomatis dikirim oleh Sistem Presensi ${websiteName}_`;

        for (const grp of targetGroupList) {
          try {
            await sendWhatsAppMessage({
              url: waUrl,
              apiKey: waKey,
              apiSecret: settings.waApiSecret,
              provider: settings.waProvider,
              phone: grp.id,
              message: groupText
            });
            results.push({ class: 'ALL_GROUP', target: grp.id, groupName: grp.name, status: 'sent', groupReport: true });
          } catch (gErr: any) {
            results.push({ class: 'ALL_GROUP', target: grp.id, groupName: grp.name, status: 'error', error: gErr.message, groupReport: true });
          }
        }
      }

      return { success: true, date: targetDate, sentCount: results.filter(r => r.status === 'sent').length, details: results };
    } catch (e: any) {
      console.error('sendDailyAttendanceReports error:', e);
      return { success: false, error: e.message || 'Gagal memproses laporan presensi' };
    }
  };

  // --- AUTOMATED WA REPORTS FOR TEACHER KBM ATTENDANCE ---
  const sendDailyTeacherKbmReports = async (dateStr?: string, periodType: string = 'daily') => {
    try {
      const settings = await getSettings();
      if (!settings) return { success: false, error: 'Pengaturan tidak ditemukan' };
      const waUrl = settings.waApiUrl || 'https://api.fonnte.com/send';
      const waKey = settings.waApiKey;
      if (!waKey) {
        return { success: false, error: 'API Key WhatsApp belum dikonfigurasi di Atur Gateway' };
      }

      const targets: any[] = settings.waTeacherTargets || settings.wa_teacher_targets || [];
      const activeTargets = targets.filter((t: any) => t && t.targetId && (t.isActive !== false));
      if (activeTargets.length === 0) {
        return { success: false, error: 'Belum ada target nomor WhatsApp atau Group ID aktif yang dikonfigurasi pada Otomasi Presensi Guru' };
      }

      const targetDate = dateStr || new Date().toISOString().split('T')[0];
      const recapData: any = await getTeacherKbmRecap({ type: (periodType as any) || 'daily', date: targetDate });

      const isInvalidClass = (name: string) => {
        if (!name || !name.trim()) return true;
        const cUpper = name.toUpperCase().trim();
        return (
          cUpper.startsWith('ALUMNI') ||
          cUpper.includes('PKL') ||
          cUpper.includes('LULUS') ||
          cUpper.startsWith('DUMMY') ||
          cUpper.includes('DUMMY') ||
          cUpper.startsWith('TEST') ||
          cUpper.includes('TEST') ||
          cUpper.startsWith('SAMPLE') ||
          cUpper.includes('CONTOH') ||
          cUpper.includes('NONAKTIF') ||
          cUpper === 'TANPA KELAS' ||
          cUpper === 'NULL' ||
          cUpper === 'UNDEFINED'
        );
      };

      const isInvalidTeacher = (name: string) => {
        if (!name || !name.trim()) return true;
        const nUpper = name.toUpperCase().trim();
        return (
          nUpper.startsWith('DUMMY') ||
          nUpper.includes('DUMMY') ||
          nUpper.startsWith('TEST') ||
          nUpper.includes('TEST') ||
          nUpper.startsWith('SAMPLE') ||
          nUpper.includes('CONTOH') ||
          nUpper === 'GURU DUMMY'
        );
      };

      const websiteName = settings.websiteName || 'SMK';
      const statusMap = await getAllRombelStatus();
      const rawRombelList = recapData?.rombelStats || recapData?.rombelMatrix || [];
      const rombelList = rawRombelList.filter((r: any) => {
        const rName = (r.name || r.rombel_name || r.rombelName || '').trim();
        if (!rName || isInvalidClass(rName)) return false;
        const st = (r.status || statusMap[rName] || 'AKTIF').toUpperCase().trim();
        if (st !== 'AKTIF') return false;
        return true;
      });
      const totalRombel = rombelList.length;
      const filledRombel = rombelList.filter((r: any) => r.isFilled || (r.filledCount && r.filledCount > 0)).length;
      const emptyRombel = Math.max(0, totalRombel - filledRombel);
      const totalSessions = recapData?.totalSessions || rombelList.reduce((acc: number, r: any) => acc + (r.sessionCount || r.filledCount || 0), 0);
      const totalJp = recapData?.totalJp || rombelList.reduce((acc: number, r: any) => acc + (r.jpCount || r.filledCount || 0), 0);
      const rawTeacherList = recapData?.teacherStats || recapData?.guruSummary || [];
      const teacherList = rawTeacherList.filter((t: any) => {
        const tName = t.name || t.teacher_name || t.teacherName;
        return !isInvalidTeacher(tName);
      });
      const totalTeachers = teacherList.length;

      // Filter settings checklist: Rekap Kehadiran Rombel, Rekap Kehadiran Guru, atau Keduanya
      const rawScope = settings.waTeacherReportScope || settings.wa_teacher_report_scope || 'both';
      const sendRombel = settings.waTeacherSendRombel !== false && settings.wa_teacher_send_rombel !== false && (rawScope === 'both' || rawScope === 'rombel');
      const sendGuru = settings.waTeacherSendGuru !== false && settings.wa_teacher_send_guru !== false && (rawScope === 'both' || rawScope === 'guru');
      const actualSendRombel = sendRombel || (!sendRombel && !sendGuru); // Fallback to at least one
      const actualSendGuru = sendGuru || (!sendRombel && !sendGuru);

      let periodLabel = `Harian (${targetDate})`;
      if (periodType === 'weekly') {
        periodLabel = `Mingguan (${recapData?.startDate || ''} s/d ${recapData?.endDate || ''})`;
      } else if (periodType === 'monthly') {
        periodLabel = `Bulanan (Bulan ${targetDate.substring(0, 7)})`;
      }

      let text = `📢 *LAPORAN KEHADIRAN KBM GURU*\n`;
      text += `🏫 ${websiteName}\n`;
      text += `📅 Periode: *${periodLabel}*\n`;
      const scopeLabel = (actualSendRombel && actualSendGuru)
        ? 'Rekap Rombel & Guru'
        : actualSendRombel
        ? 'Rekap Kehadiran Rombel'
        : 'Rekap Kehadiran Guru';
      text += `📑 Cakupan: *${scopeLabel}*\n\n`;

      text += `📊 *Ringkasan Pelaksanaan KBM:*\n`;
      text += `• Total Sesi KBM: *${totalSessions} sesi*\n`;
      text += `• Total Jam Pelajaran (JP): *${totalJp} JP*\n`;
      text += `• Rombel Terisi KBM: *${filledRombel} / ${totalRombel} Kelas*\n`;
      if (emptyRombel > 0) {
        text += `• Rombel Belum Terisi: *${emptyRombel} Kelas*\n`;
      }
      text += `• Guru Bertugas: *${totalTeachers} Guru*\n\n`;

      // 1. Rekap Kehadiran Rombel (jika dicentang)
      if (actualSendRombel) {
        text += `📋 *Rekapitulasi Keterisian per Rombel:*\n`;
        const rombelLines = rombelList.slice(0, 30).map((r: any) => {
          const rName = r.name || r.rombel_name || r.rombelName;
          const jp = r.jpCount || r.filled_jp || r.filledCount || 0;
          const ses = r.sessionCount || (r.filled_jp || r.filledCount ? 1 : 0);
          const isFilled = r.isFilled || (r.filled_jp && r.filled_jp > 0) || (r.filledCount && r.filledCount > 0);
          if (isFilled) {
            return `• *${rName}*: ${jp} JP (${ses} sesi)`;
          } else {
            return `• *${rName}*: _Belum Terisi_ ⚠️`;
          }
        });
        text += rombelLines.join('\n');
        if (rombelList.length > 30) {
          text += `\n...dan ${rombelList.length - 30} kelas lainnya.`;
        }
        text += `\n\n`;
      }

      // 2. Rekap Kehadiran Guru (jika dicentang)
      if (actualSendGuru) {
        text += `👨‍🏫 *Rekapitulasi Jam Mengajar Guru:*\n`;
        const activeTeachersWithJp = teacherList.filter((t: any) => (t.total_jp || t.totalJp || 0) > 0);
        if (activeTeachersWithJp.length === 0) {
          text += `_Belum ada guru yang mengisi KBM pada periode ini._\n`;
        } else {
          const guruLines = activeTeachersWithJp.slice(0, 30).map((t: any) => {
            const tName = t.name || t.teacher_name || t.teacherName;
            const jp = t.total_jp || t.totalJp || 0;
            const ses = t.total_sessions || t.recordCount || 1;
            const rombels = Array.isArray(t.rombels) ? t.rombels.join(', ') : (t.classes || '-');
            return `• *${tName}*: ${jp} JP (${ses} sesi di ${rombels})`;
          });
          text += guruLines.join('\n');
          if (activeTeachersWithJp.length > 30) {
            text += `\n...dan ${activeTeachersWithJp.length - 30} guru lainnya.`;
          }
        }
        text += `\n\n`;
      }

      text += `_Pesan otomatis dikirim oleh Sistem Presensi KBM Guru._`;

      const results: any[] = [];
      for (const tgt of activeTargets) {
        try {
          const res = await sendWhatsAppMessage({
            url: waUrl,
            apiKey: waKey,
            apiSecret: settings.waApiSecret,
            provider: settings.waProvider,
            phone: tgt.targetId,
            message: text
          });
          results.push({ target: tgt.targetId, name: tgt.name, status: 'sent', res });
        } catch (tErr: any) {
          results.push({ target: tgt.targetId, name: tgt.name, status: 'error', error: tErr.message });
        }
      }

      return {
        success: true,
        period: periodLabel,
        sentCount: results.filter(r => r.status === 'sent').length,
        totalTargets: activeTargets.length,
        details: results
      };
    } catch (err: any) {
      console.error('sendDailyTeacherKbmReports error:', err);
      return { success: false, error: err.message || 'Gagal mengirim laporan KBM guru' };
    }
  };

  const sendPerangkatSupervisiAutomatedReport = async () => {
    try {
      const settings = await getSettings();
      if (!settings) return { success: false, error: 'Pengaturan tidak ditemukan' };
      const waKey = settings.waApiKey;
      if (!waKey) return { success: false, error: 'Gateway WhatsApp belum diatur' };

      const config = settings.perangkat_wa_rekap || (settings.data && settings.data.perangkat_wa_rekap) || {};
      if (!config.is_active || !config.target_group_id) {
        return { success: false, error: 'Pengaturan WhatsApp Rekap tidak aktif atau target kosong' };
      }

      const activePeriod = await getActivePeriod();
      const ta = activePeriod?.tahun_ajaran || '2024/2025';
      const sem = activePeriod?.semester || 'Ganjil';

      const reports = await getAllTeacherProgressReports(ta, sem);
      const schoolName = settings.nama_sekolah || settings.schoolName || settings.nama_website || 'Sekolah';

      const message = formatPerangkatSupervisiWhatsAppMessage({
        schoolName,
        tahunAjaran: ta,
        semester: sem,
        reports,
        customNote: config.custom_message_header
      });

      const res = await sendWhatsAppMessage({
        url: settings.waApiUrl || 'https://api.fonnte.com/send',
        apiKey: waKey,
        apiSecret: settings.waApiSecret,
        provider: settings.waProvider,
        phone: config.target_group_id,
        message
      });

      // Update timestamp last_sent_at
      const nowIso = new Date().toISOString();
      const updatedConfig = {
        ...config,
        last_sent_at: nowIso
      };
      await pool.query('UPDATE pengaturan SET perangkat_wa_rekap = $1 WHERE id = 1', [JSON.stringify(updatedConfig)]);

      console.log(`[Auto-WA Perangkat] Rekapitulasi berhasil dikirim ke grup ${config.target_group_id}`);
      return { success: true, res };
    } catch (e: any) {
      console.error('[Auto-WA Perangkat Error]:', e);
      return { success: false, error: e.message };
    }
  };

  // Penjadwal WhatsApp Otomatis (Cron Job Berbasis Waktu WIB Asia/Jakarta)
  let lastSentDate = '';
  let lastTeacherSentDate = '';
  let lastPerangkatSentDate = '';
  
  cron.schedule('* * * * *', async () => {
    try {
      const settings = await getSettings();
      if (!settings || !settings.waApiKey) return;

      const currentTimeStr = getWIBTimeString();
      const dayIndex = getWIBDayIndex(); // '1'=Mon ... '7'=Sun (5=Jumat, 6=Sabtu, 7=Minggu)
      const todayDateStr = getWIBDateString();

      // Siswa Attendance Cron
      if (settings.waMode === 'auto') {
        const targetTime = (settings.waCronTime || '15:00').trim();
        const targetDays = settings.waCronDays || ['1', '2', '3', '4', '5'];

        if (currentTimeStr === targetTime && targetDays.includes(dayIndex) && lastSentDate !== todayDateStr) {
          lastSentDate = todayDateStr;
          console.log(`[Auto-WA Siswa] Triggering automated WhatsApp reports for ${todayDateStr} at ${currentTimeStr}`);
          await sendDailyAttendanceReports(todayDateStr);
        }
      }

      // Guru KBM Attendance Cron
      const teacherMode = settings.waTeacherMode || settings.wa_teacher_mode;
      if (teacherMode && teacherMode !== 'manual' && teacherMode !== 'nonaktif') {
        const targetTeacherTime = (settings.waTeacherCronTime || settings.wa_teacher_cron_time || '16:00').trim();
        if (currentTimeStr === targetTeacherTime && lastTeacherSentDate !== todayDateStr) {
          let shouldTrigger = false;
          if (teacherMode === 'daily') {
            const targetTeacherDays = settings.waTeacherCronDays || settings.wa_teacher_cron_days || ['1', '2', '3', '4', '5'];
            shouldTrigger = targetTeacherDays.includes(dayIndex);
          } else if (teacherMode === 'weekly') {
            const weeklyDay = String(settings.waTeacherWeeklyDay || settings.wa_teacher_weekly_day || '5');
            shouldTrigger = dayIndex === weeklyDay;
          } else if (teacherMode === 'monthly') {
            const monthlyDay = String(settings.waTeacherMonthlyDay || settings.wa_teacher_monthly_day || '28');
            const nowWIB = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
            const dom = String(nowWIB.getDate());
            shouldTrigger = dom === monthlyDay;
          }

          if (shouldTrigger) {
            lastTeacherSentDate = todayDateStr;
            console.log(`[Auto-WA Guru] Triggering automated Teacher KBM WhatsApp reports (${teacherMode}) for ${todayDateStr} at ${currentTimeStr}`);
            await sendDailyTeacherKbmReports(todayDateStr, teacherMode);
          }
        }
      }

      // Perangkat Ajar Supervisi Rekap Cron
      const perangkatWa = settings.perangkat_wa_rekap || (settings.data && settings.data.perangkat_wa_rekap);
      if (perangkatWa && perangkatWa.is_active && perangkatWa.target_group_id && perangkatWa.send_mode && perangkatWa.send_mode !== 'MANUAL') {
        const targetPerangkatTime = (perangkatWa.auto_send_time || '15:00').trim();
        if (currentTimeStr === targetPerangkatTime && lastPerangkatSentDate !== todayDateStr) {
          let shouldTriggerPerangkat = false;
          if (perangkatWa.send_mode === 'AUTO_FRIDAY') {
            shouldTriggerPerangkat = (dayIndex === '5'); // Jumat
          } else if (perangkatWa.send_mode === 'AUTO_WEEKEND') {
            shouldTriggerPerangkat = (dayIndex === '5' || dayIndex === '6' || dayIndex === '7'); // Akhir Minggu (Jumat/Sabtu/Minggu)
          }

          if (shouldTriggerPerangkat) {
            lastPerangkatSentDate = todayDateStr;
            console.log(`[Auto-WA Perangkat] Triggering automated Supervisi Perangkat reports for ${todayDateStr} at ${currentTimeStr}`);
            await sendPerangkatSupervisiAutomatedReport();
          }
        }
      }
    } catch (e) {
      console.error('[Auto-WA Cron Error]:', e);
    }
  }, { timezone: 'Asia/Jakarta' });

  // --- DATABASE & RESET ENDPOINTS (Dilindungi Autentikasi Admin) ---
  app.get('/api/database/stats', async (req, res) => {
    try {
      const stats = await getDatabaseStats();
      res.json({ success: true, data: stats });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message || 'Gagal mengambil statistik database' });
    }
  });

  const handleResetStudents = async (req: express.Request, res: express.Response) => {
    try {
      const result = await resetStudents();
      res.json({ 
        success: true, 
        message: 'Seluruh data siswa & riwayat presensi/izin berhasil dikosongkan.',
        details: result 
      });
    } catch(e: any) { 
      res.status(500).json({ success: false, error: e.message || 'Gagal menghapus data siswa' }); 
    }
  };
  app.delete('/api/reset/students', requireAdmin, handleResetStudents);
  app.post('/api/reset/students', requireAdmin, handleResetStudents);

  const handleResetTeachers = async (req: express.Request, res: express.Response) => {
    try {
      const result = await resetTeachers();
      res.json({ 
        success: true, 
        message: 'Seluruh data guru, akun guru, dan jadwal piket berhasil dikosongkan.',
        details: result 
      });
    } catch(e: any) { 
      res.status(500).json({ success: false, error: e.message || 'Gagal menghapus data guru' }); 
    }
  };
  app.delete('/api/reset/teachers', requireAdmin, handleResetTeachers);
  app.post('/api/reset/teachers', requireAdmin, handleResetTeachers);

  const handleResetReports = async (req: express.Request, res: express.Response) => {
    try {
      const result = await resetReports();
      res.json({ 
        success: true, 
        message: 'Seluruh data laporan siswa (presensi & perizinan) berhasil dikosongkan.',
        details: result 
      });
    } catch(e: any) { 
      res.status(500).json({ success: false, error: e.message || 'Gagal menghapus data laporan siswa' }); 
    }
  };
  app.delete('/api/reset/reports', requireAdmin, handleResetReports);
  app.post('/api/reset/reports', requireAdmin, handleResetReports);

  const handleResetTeacherReports = async (req: express.Request, res: express.Response) => {
    try {
      const result = await resetTeacherAttendanceReports();
      res.json({ 
        success: true, 
        message: 'Seluruh data laporan kehadiran KBM guru berhasil dikosongkan.',
        details: result 
      });
    } catch(e: any) { 
      res.status(500).json({ success: false, error: e.message || 'Gagal menghapus data laporan kehadiran guru' }); 
    }
  };
  app.delete('/api/reset/teacher-reports', requireAdmin, handleResetTeacherReports);
  app.post('/api/reset/teacher-reports', requireAdmin, handleResetTeacherReports);

  const handleResetAll = async (req: express.Request, res: express.Response) => {
    try {
      const result = await resetAllData();
      res.json({ 
        success: true, 
        message: 'Semua data operasional (guru, siswa, jadwal, presensi, izin & kehadiran KBM guru) berhasil dikosongkan secara menyeluruh.',
        details: result 
      });
    } catch(e: any) { 
      res.status(500).json({ success: false, error: e.message || 'Gagal menghapus semua data' }); 
    }
  };
  app.delete('/api/reset/all', requireAdmin, handleResetAll);
  app.post('/api/reset/all', requireAdmin, handleResetAll);

  // --- ATUR AKUN KEPALA SEKOLAH & ROLE KHUSUS ---
  app.get('/api/accounts/kepala-sekolah', async (req, res) => {
    try {
      const account = await getKepalaSekolahAccount();
      res.json({ success: true, data: account });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message || 'Gagal mengambil akun kepala sekolah' });
    }
  });

  app.post('/api/accounts/kepala-sekolah', async (req, res) => {
    try {
      const result = await saveKepalaSekolahAccount(req.body);
      res.json({ success: true, data: result, message: 'Akun Kepala Sekolah berhasil disimpan' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message || 'Gagal memperbarui akun kepala sekolah' });
    }
  });

  app.post('/api/accounts/kepala-sekolah/sync', async (req, res) => {
    try {
      const account = await getKepalaSekolahAccount();
      res.json({ success: true, data: account, message: 'Data Kepala Sekolah berhasil disinkronkan dari Informasi Sekolah' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message || 'Gagal sinkron data kepala sekolah' });
    }
  });

  app.get('/api/accounts/special-roles', async (req, res) => {
    try {
      const list = await getSpecialRoleAccounts();
      res.json({ success: true, data: list });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message || 'Gagal mengambil daftar akun khusus' });
    }
  });

  app.post('/api/accounts/special-roles', async (req, res) => {
    try {
      const { teacher_id, role, username, password, status } = req.body;
      if (!teacher_id) {
        return res.status(400).json({ success: false, error: 'Guru wajib dipilih' });
      }
      if (!role || !['WAKIL_KURIKULUM', 'WAKIL_KESISWAAN', 'GURU_BK', 'GURU'].includes(role)) {
        return res.status(400).json({ success: false, error: 'Pilihan peran tidak valid' });
      }
      const result = await setTeacherSpecialRole({ teacher_id, role, username, password, status });
      res.json({ success: true, data: result, message: 'Hak akses peran berhasil disimpan' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message || 'Gagal menyimpan hak akses peran' });
    }
  });

  app.delete('/api/accounts/special-roles/:teacher_id', async (req, res) => {
    try {
      const { teacher_id } = req.params;
      await removeTeacherSpecialRole(teacher_id);
      res.json({ success: true, message: 'Peran khusus berhasil dicabut' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message || 'Gagal mencabut peran khusus' });
    }
  });

  // --- TUGAS TAMBAHAN (KATEGORI & PENUGASAN GURU) ---
  app.get('/api/tugas-tambahan/categories', async (req, res) => {
    try {
      const categories = await getAllTugasCategories();
      res.json({ success: true, data: categories });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message || 'Gagal mengambil kategori tugas tambahan' });
    }
  });

  app.post('/api/tugas-tambahan/categories', async (req, res) => {
    try {
      const payload = {
        id: req.body.id,
        nama: req.body.nama || req.body.name || '',
        name: req.body.nama || req.body.name || '',
        kode: req.body.kode || req.body.code || '',
        code: req.body.kode || req.body.code || '',
        keterangan: req.body.keterangan !== undefined ? req.body.keterangan : (req.body.description !== undefined ? req.body.description : ''),
        description: req.body.keterangan !== undefined ? req.body.keterangan : (req.body.description !== undefined ? req.body.description : '')
      };
      const newCat = await saveTugasCategory(payload);
      res.json({ success: true, data: newCat, message: 'Kategori berhasil ditambahkan' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message || 'Gagal menambahkan kategori' });
    }
  });

  app.put('/api/tugas-tambahan/categories/:id', async (req, res) => {
    try {
      const payload = {
        id: req.params.id,
        nama: req.body.nama || req.body.name,
        name: req.body.nama || req.body.name,
        kode: req.body.kode || req.body.code,
        code: req.body.kode || req.body.code,
        keterangan: req.body.keterangan !== undefined ? req.body.keterangan : req.body.description,
        description: req.body.keterangan !== undefined ? req.body.keterangan : req.body.description
      };
      const updated = await updateTugasCategory(req.params.id, payload);
      res.json({ success: true, data: updated, message: 'Kategori berhasil diperbarui' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message || 'Gagal memperbarui kategori' });
    }
  });

  app.delete('/api/tugas-tambahan/categories/:id', async (req, res) => {
    try {
      await deleteTugasCategory(req.params.id);
      res.json({ success: true, message: 'Kategori berhasil dihapus' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message || 'Gagal menghapus kategori' });
    }
  });

  app.get('/api/tugas-tambahan/teachers', async (req, res) => {
    try {
      const list = await getAllTugasGuru();
      res.json({ success: true, data: list });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message || 'Gagal mengambil data tugas tambahan guru' });
    }
  });

  app.post('/api/tugas-tambahan/teachers', async (req, res) => {
    try {
      const teacher_id = req.body.teacher_id || req.body.guru_id || '';
      const category_id = req.body.category_id || req.body.kategori_id || '';
      const sk_nomor = req.body.nomor_sk || req.body.sk_nomor || req.body.no_sk || '';
      const keterangan = req.body.keterangan !== undefined ? req.body.keterangan : (req.body.description || '');
      const status = req.body.status || 'AKTIF';

      if (!teacher_id) return res.status(400).json({ success: false, error: 'Guru wajib dipilih' });
      if (!category_id) return res.status(400).json({ success: false, error: 'Kategori tugas tambahan wajib dipilih' });

      const created = await saveTugasGuru({ 
        teacher_id, 
        category_id, 
        keterangan, 
        sk_nomor, 
        nomor_sk: sk_nomor, 
        status 
      });
      res.json({ success: true, data: created, message: 'Tugas tambahan guru berhasil ditambahkan' });
    } catch (e: any) {
      console.error('Error saving tugas guru:', e);
      res.status(400).json({ success: false, error: e.message || 'Gagal menyimpan tugas tambahan guru' });
    }
  });

  app.put('/api/tugas-tambahan/teachers/:id', async (req, res) => {
    try {
      const teacher_id = req.body.teacher_id || req.body.guru_id;
      const category_id = req.body.category_id || req.body.kategori_id;
      const sk_nomor = req.body.nomor_sk !== undefined ? req.body.nomor_sk : req.body.sk_nomor;
      const keterangan = req.body.keterangan !== undefined ? req.body.keterangan : req.body.description;
      const status = req.body.status;

      const payload = {
        ...(teacher_id ? { teacher_id } : {}),
        ...(category_id ? { category_id } : {}),
        ...(sk_nomor !== undefined ? { sk_nomor, nomor_sk: sk_nomor } : {}),
        ...(keterangan !== undefined ? { keterangan, description: keterangan } : {}),
        ...(status ? { status } : {})
      };

      const updated = await updateTugasGuru(req.params.id, payload);
      res.json({ success: true, data: updated, message: 'Tugas tambahan guru berhasil diperbarui' });
    } catch (e: any) {
      console.error('Error updating tugas guru:', e);
      res.status(400).json({ success: false, error: e.message || 'Gagal memperbarui tugas tambahan guru' });
    }
  });

  app.put(['/api/tugas-tambahan/teachers/:id/toggle-status', '/api/tugas-tambahan/teachers/:id/status'], async (req, res) => {
    try {
      const all = await getAllTugasGuru();
      const target = all.find(t => t.id === req.params.id);
      if (!target) return res.status(404).json({ success: false, error: 'Penugasan tidak ditemukan' });

      const newStatus = req.body?.status ? req.body.status : (target.status === 'AKTIF' ? 'NONAKTIF' : 'AKTIF');
      const updated = await updateTugasGuru(req.params.id, { status: newStatus });
      res.json({ success: true, data: updated, message: `Status berhasil diubah menjadi ${newStatus}` });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message || 'Gagal mengubah status penugasan' });
    }
  });

  app.delete('/api/tugas-tambahan/teachers/:id', async (req, res) => {
    try {
      await deleteTugasGuru(req.params.id);
      res.json({ success: true, message: 'Tugas tambahan guru berhasil dihapus' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message || 'Gagal menghapus tugas tambahan guru' });
    }
  });

  // --- AKUN USER SISWA ---
  app.get('/api/student-accounts', async (req, res) => {
    try {
      const accounts = await getAllStudentAccounts();
      res.json({ success: true, data: accounts });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message || 'Gagal mengambil akun siswa' });
    }
  });

  app.post('/api/student-accounts', async (req, res) => {
    try {
      const { student_id, name, nisn, nis, class: className, username, password_plain, status } = req.body;
      if (!student_id || !username || !password_plain) {
        return res.status(400).json({ success: false, error: 'Siswa, username, dan password wajib diisi' });
      }
      const saved = await saveStudentAccount({ student_id, name, nisn, nis, class: className, username, password_plain, status });
      res.json({ success: true, data: saved, message: 'Akun siswa berhasil dibuat/disimpan' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message || 'Gagal menyimpan akun siswa' });
    }
  });

  app.put('/api/student-accounts/:id', async (req, res) => {
    try {
      const updated = await updateStudentAccount(req.params.id, req.body);
      res.json({ success: true, data: updated, message: 'Akun siswa berhasil diperbarui' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message || 'Gagal memperbarui akun siswa' });
    }
  });

  app.put(['/api/student-accounts/:id/toggle-status', '/api/student-accounts/:id/status'], async (req, res) => {
    try {
      const all = await getAllStudentAccounts();
      const target = all.find(a => a.id === req.params.id || a.student_id === req.params.id);
      if (!target) return res.status(404).json({ success: false, error: 'Akun siswa tidak ditemukan' });

      const newStatus = req.body?.status ? req.body.status : (target.status === 'AKTIF' ? 'NONAKTIF' : 'AKTIF');
      const updated = await updateStudentAccount(target.id, { status: newStatus });
      res.json({ success: true, data: updated, message: `Status akun siswa berhasil diubah menjadi ${newStatus}` });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message || 'Gagal mengubah status akun' });
    }
  });

  app.post(['/api/student-accounts/regenerate/:id', '/api/student-accounts/:id/reset-password'], async (req, res) => {
    try {
      const { password, chosenPassword, presetPassword } = req.body || {};
      const chosen = password || chosenPassword || presetPassword || '@Siswa123';
      const result = await regenerateStudentPassword(req.params.id, chosen);
      if (!result.success) {
        return res.status(404).json({ success: false, error: 'Akun siswa tidak ditemukan' });
      }
      res.json({
        success: true,
        message: `Password siswa berhasil direset menjadi "${result.newPasswordPlain}"`,
        newPassword: result.newPasswordPlain,
        account: result.account
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete('/api/student-accounts/:id', async (req, res) => {
    try {
      await deleteStudentAccount(req.params.id);
      res.json({ success: true, message: 'Akun siswa berhasil dihapus' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message || 'Gagal menghapus akun siswa' });
    }
  });

  app.post('/api/student-accounts/sync', async (req, res) => {
    try {
      const { presetPassword } = req.body;
      const result = await syncStudentAccounts(presetPassword || '@Siswa123');
      res.json({ 
        success: true, 
        data: result, 
        message: `Sinkronisasi selesai: ${result.created} akun baru dibuat, ${result.updated} akun diperbarui. Total ${result.total} akun siswa.` 
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message || 'Gagal melakukan sinkronisasi akun siswa' });
    }
  });

  app.post(['/api/student-accounts/mass-regenerate', '/api/student-accounts/regenerate', '/api/student-accounts/regenerate-all'], async (req, res) => {
    try {
      const { presetPassword, chosenPassword, password } = req.body || {};
      const chosen = chosenPassword || presetPassword || password || '@Siswa123';
      const count = await massRegenerateStudentPasswords(chosen);
      res.json({ success: true, count, chosenPassword: chosen, message: `Berhasil mereset password untuk ${count} akun siswa.` });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message || 'Gagal mereset password massal' });
    }
  });

  // --- STUDENTS ---
  app.get('/api/students', async (req, res) => {
    try {
      const students = await getAllStudents();
      const mapped = students.map((r) => ({ 
        ...r, 
        status: r.status || 'AKTIF',
        qrCode: r.qr_code || r.nisn, 
        customFields: r.custom_fields || {}
      }));
      res.json(mapped);
    } catch (e) { res.json([]); }
  });

  app.post('/api/students', async (req, res) => {
    try {
      const { name, nisn, nis, class: className, year, qrCode, customFields, status } = req.body;
      const saved = await saveStudent({
        name,
        nisn,
        nis,
        class: className,
        year,
        qr_code: qrCode || nisn || nis,
        custom_fields: customFields || {},
        status: status || 'AKTIF'
      });
      res.json({ success: true, id: saved.id });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put('/api/students/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, nisn, nis, class: className, year, qrCode, customFields, status } = req.body;
      await updateStudent(id, {
        name,
        nisn,
        nis,
        class: className,
        year,
        qr_code: qrCode || nisn || nis,
        custom_fields: customFields || {},
        status: status || 'AKTIF'
      });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/students/:id', async (req, res) => {
    try {
      await deleteStudent(req.params.id);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- ROMBONGAN BELAJAR (ROMBEL) & PROMOSI KELAS ---
  app.get('/api/rombel', async (req, res) => {
    try {
      const [students, teachers, statusMap, allTa] = await Promise.all([
        getAllStudents(),
        getAllTeachers(),
        getAllRombelStatus(),
        getAllTahunAjaran()
      ]);

      const activeTa = allTa.find(t => t.is_active)?.nama || '2025/2026';

      const normalizeCls = (str: string) => {
        if (!str) return '';
        let s = str.trim().toLowerCase();
        s = s.replace(/\bx\b/g, '10').replace(/\bxi\b/g, '11').replace(/\bxii\b/g, '12');
        return s.replace(/[^a-z0-9]/g, '');
      };

      const teacherMap = new Map<string, any>();
      const teacherNormMap = new Map<string, any>();
      for (const t of teachers) {
        if (t.class && t.class.trim()) {
          teacherMap.set(t.class.trim(), t);
          teacherNormMap.set(normalizeCls(t.class), t);
        }
      }

      // Collect all class names STRICTLY from existing students and assigned teachers
      const allClassNames = new Set<string>();

      for (const s of students) {
        if (s.class && s.class.trim()) {
          allClassNames.add(s.class.trim());
        }
      }
      for (const t of teachers) {
        if (t.class && t.class.trim()) {
          allClassNames.add(t.class.trim());
        }
      }

      const classesMap = new Map<string, any>();

      // Initialize classes strictly from actual existing data
      for (const clsName of allClassNames) {
        if (!clsName) continue;
        const grade = parseGradeLevel(clsName);
        const isAlumni = clsName.startsWith('Alumni');
        const assignedTeacher = teacherMap.get(clsName) || teacherNormMap.get(normalizeCls(clsName)) || null;
        
        classesMap.set(clsName, {
          name: clsName,
          grade: grade,
          year: activeTa,
          status: isAlumni ? 'LULUS' : (statusMap[clsName] || 'AKTIF'),
          teacher: assignedTeacher,
          homeroom_teacher: assignedTeacher ? assignedTeacher.name : null,
          wali_kelas: assignedTeacher ? assignedTeacher.name : null,
          waliKelas: assignedTeacher ? assignedTeacher.name : null,
          students: [],
          totalStudents: 0,
          activeStudents: 0,
          graduatedStudents: 0,
        });
      }

      // Populate students
      for (const s of students) {
        const clsName = s.class || 'Tanpa Kelas';
        if (!classesMap.has(clsName)) {
          const grade = parseGradeLevel(clsName);
          const isAlumni = clsName.startsWith('Alumni');
          classesMap.set(clsName, {
            name: clsName,
            grade: grade,
            year: s.year || activeTa,
            status: isAlumni ? 'LULUS' : (statusMap[clsName] || (s.status === 'LULUS' ? 'LULUS' : 'AKTIF')),
            teacher: teacherMap.get(clsName) || null,
            students: [],
            totalStudents: 0,
            activeStudents: 0,
            graduatedStudents: 0,
          });
        }
        const c = classesMap.get(clsName)!;
        if (s.year && !c.year) c.year = s.year;
        
        const sStatus = s.status || 'AKTIF';
        c.students.push({
          id: s.id,
          name: s.name,
          nisn: s.nisn,
          nis: s.nis,
          class: s.class,
          year: s.year,
          status: sStatus,
          photo: s.photo || s.foto || '',
          customFields: s.custom_fields || {}
        });
        c.totalStudents++;
        if (sStatus === 'LULUS' || clsName.startsWith('Alumni')) {
          c.graduatedStudents++;
        } else {
          c.activeStudents++;
        }
      }

      // Clean up any empty alumni classes that have no students and no teacher
      for (const [key, c] of classesMap.entries()) {
        if (key.startsWith('Alumni') && c.totalStudents === 0 && !c.teacher) {
          classesMap.delete(key);
        }
      }

      // Sort classes: standard grades 10 -> 11 -> 12, then alphabetical, Alumni at the end
      let classList = Array.from(classesMap.values()).sort((a, b) => {
        const aIsAlumni = a.name.startsWith('Alumni');
        const bIsAlumni = b.name.startsWith('Alumni');
        if (aIsAlumni && !bIsAlumni) return 1;
        if (!aIsAlumni && bIsAlumni) return -1;
        if (a.grade !== b.grade) return a.grade - b.grade;
        return a.name.localeCompare(b.name);
      });

      const summary = {
        totalClasses: classList.filter(c => !c.name.startsWith('Alumni')).length,
        grade10Count: classList.filter(c => c.grade === 10 && !c.name.startsWith('Alumni')).length,
        grade11Count: classList.filter(c => c.grade === 11 && !c.name.startsWith('Alumni')).length,
        grade12Count: classList.filter(c => c.grade === 12 && !c.name.startsWith('Alumni')).length,
        pklClassesCount: classList.filter(c => c.status === 'PKL').length,
        totalStudents: students.length,
        activeStudents: students.filter(s => (s.status || 'AKTIF') !== 'LULUS' && !s.class?.startsWith('Alumni')).length,
        graduatedStudents: students.filter(s => s.status === 'LULUS' || s.class?.startsWith('Alumni')).length,
      };

      // Filter by status if requested (e.g. status=AKTIF or only_active=true)
      if (req.query.status) {
        const targetStatus = String(req.query.status).toUpperCase();
        if (targetStatus === 'AKTIF') {
          classList = classList.filter(c => {
            const st = String(c.status || 'AKTIF').toUpperCase();
            const name = String(c.name || '').trim();
            return st === 'AKTIF' && !name.startsWith('Alumni') && name !== 'Tanpa Kelas' && !name.toLowerCase().includes('lulus');
          });
        } else {
          classList = classList.filter(c => String(c.status || 'AKTIF').toUpperCase() === targetStatus);
        }
      } else if (req.query.only_active === 'true' || req.query.active_only === 'true') {
        classList = classList.filter(c => {
          const st = String(c.status || 'AKTIF').toUpperCase();
          const name = String(c.name || '').trim();
          return st === 'AKTIF' && !name.startsWith('Alumni') && name !== 'Tanpa Kelas' && !name.toLowerCase().includes('lulus');
        });
      }

      if (req.query.format === 'array') {
        return res.json(classList);
      }
      res.json({ success: true, classes: classList, summary });
    } catch (e: any) {
      console.error('Error in /api/rombel:', e);
      if (req.query.format === 'array') {
        return res.json([]);
      }
      res.json({ success: false, classes: [], summary: {} });
    }
  });

  app.post('/api/rombel/status', async (req, res) => {
    try {
      const { className, status } = req.body;
      if (!className || !status) {
        return res.status(400).json({ error: 'className dan status wajib diisi' });
      }
      const cleanStatus = status === 'PKL' ? 'PKL' : 'AKTIF';
      await setClassStatus(className, cleanStatus);
      res.json({ success: true, className, status: cleanStatus });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Gagal memperbarui status kelas' });
    }
  });

  app.get('/api/rombel/status-all', async (req, res) => {
    try {
      const statusMap = await getAllRombelStatus();
      res.json(statusMap);
    } catch (e) {
      res.json({});
    }
  });

  app.post('/api/rombel/promote', async (req, res) => {
    try {
      const { dryRun = false, classNames, targetGrade, newYear } = req.body;
      const allStudents = await getAllStudents();
      const allTeachers = await getAllTeachers();
      const changes: any[] = [];
      const teacherChanges: any[] = [];
      const studentUpdatesToApply: Array<{ id: string; nisn?: string; class: string; year?: string; status: string }> = [];
      const teacherUpdatesToApply: Array<{ id: string; class: string; year?: string }> = [];
      let promotedCount = 0;
      let graduatedCount = 0;
      let teacherPromotedCount = 0;
      let alumniTeacherCount = 0;

      for (const student of allStudents) {
        if (student.status === 'LULUS' || (student.class && student.class.startsWith('Alumni'))) continue;
        if (Array.isArray(classNames) && classNames.length > 0 && !classNames.includes(student.class)) {
          continue;
        }

        const { newClass, isGraduating, grade } = getPromotedClassName(student.class);
        if (targetGrade && targetGrade !== 'ALL' && grade !== Number(targetGrade)) {
          continue;
        }

        if (isGraduating) {
          const alumniClass = student.class.startsWith('Alumni') ? student.class : `Alumni ${student.class}`;
          changes.push({
            id: student.id,
            name: student.name,
            nisn: student.nisn,
            oldClass: student.class,
            newClass: alumniClass,
            oldStatus: student.status || 'AKTIF',
            newStatus: 'LULUS',
            action: 'LULUS'
          });
          graduatedCount++;
          studentUpdatesToApply.push({
            id: student.id,
            nisn: student.nisn,
            class: alumniClass,
            status: 'LULUS'
          });
        } else if (newClass !== student.class) {
          const studentNewYear = newYear || student.year;
          changes.push({
            id: student.id,
            name: student.name,
            nisn: student.nisn,
            oldClass: student.class,
            newClass: newClass,
            oldYear: student.year,
            newYear: studentNewYear,
            oldStatus: student.status || 'AKTIF',
            newStatus: 'AKTIF',
            action: 'NAIK_KELAS'
          });
          promotedCount++;
          studentUpdatesToApply.push({
            id: student.id,
            nisn: student.nisn,
            class: newClass,
            year: studentNewYear,
            status: 'AKTIF'
          });
        }
      }

      // REQUIREMENT 4: Wali kelas mengikuti kenaikan kelas, kelas 12 jadi Wali Kelas Alumni, kelas 10 otomatis kosong
      for (const teacher of allTeachers) {
        if (!teacher.class) continue;
        if (teacher.class.startsWith('Alumni')) continue;
        if (Array.isArray(classNames) && classNames.length > 0 && !classNames.includes(teacher.class)) {
          continue;
        }

        const { newClass, isGraduating, grade } = getPromotedClassName(teacher.class);
        if (targetGrade && targetGrade !== 'ALL' && grade !== Number(targetGrade)) {
          continue;
        }

        if (isGraduating) {
          // Tetap cantumkan wali kelas untuk kelas 12 yang lulus sebagai data informasi wali kelas alumni
          const alumniClassLabel = `Alumni ${teacher.class}`;
          teacherChanges.push({
            id: teacher.id,
            name: teacher.name,
            nip: teacher.nip || '',
            whatsapp: teacher.whatsapp,
            oldClass: teacher.class,
            newClass: alumniClassLabel,
            action: 'WALI_ALUMNI',
            description: `Dicatat sebagai Wali Kelas Alumni untuk ${teacher.class}`
          });
          alumniTeacherCount++;
          teacherUpdatesToApply.push({
            id: teacher.id,
            class: alumniClassLabel
          });
        } else if (newClass !== teacher.class) {
          // Wali kelas mengikuti kenaikan kelas tersebut
          teacherChanges.push({
            id: teacher.id,
            name: teacher.name,
            nip: teacher.nip || '',
            whatsapp: teacher.whatsapp,
            oldClass: teacher.class,
            newClass: newClass,
            action: 'WALI_NAIK_KELAS',
            description: `Mengikuti kenaikan kelas dari ${teacher.class} ke ${newClass}`
          });
          teacherPromotedCount++;
          teacherUpdatesToApply.push({
            id: teacher.id,
            class: newClass,
            year: newYear || teacher.year
          });
        }
      }

      if (!dryRun) {
        await bulkPromoteStudentsAndTeachers(studentUpdatesToApply, teacherUpdatesToApply);
      }

      res.json({
        success: true,
        dryRun: Boolean(dryRun),
        promotedCount,
        graduatedCount,
        teacherPromotedCount,
        alumniTeacherCount,
        totalAffected: changes.length + teacherChanges.length,
        changes,
        teacherChanges
      });
    } catch (e: any) {
      console.error('Promote error:', e);
      res.status(500).json({ success: false, error: e.message || 'Gagal memproses kenaikan kelas', changes: [], teacherChanges: [] });
    }
  });

  // REQUIREMENT 3: Memasukkan wali kelas pada menu rombongan belajar
  app.post('/api/rombel/assign-teacher', async (req, res) => {
    try {
      const { className, teacherId, year } = req.body;
      if (!className) {
        return res.status(400).json({ success: false, error: 'Nama rombel/kelas wajib ditentukan' });
      }

      const assigned = await assignTeacherToClass(className, teacherId || null, year);
      res.json({
        success: true,
        message: assigned 
          ? `Guru ${assigned.name} berhasil ditugaskan sebagai Wali Kelas ${className}` 
          : `Wali kelas untuk ${className} berhasil dikosongkan`,
        teacher: assigned
      });
    } catch (e: any) {
      console.error('Assign teacher error:', e);
      res.status(500).json({ success: false, error: e.message || 'Gagal menugaskan wali kelas' });
    }
  });

  // --- TEACHERS (DATA GURU) ---
  app.get('/api/teachers', async (req, res) => {
    try {
      const teachers = await getAllTeachers();
      res.json(teachers);
    } catch (e) { res.json([]); }
  });

  app.post('/api/teachers', async (req, res) => {
    try {
      const { name, nip, whatsapp, class: className, year, status } = req.body;
      const saved = await saveTeacher({
        name,
        nip: nip || '',
        whatsapp,
        class: className || '',
        year: year || '',
        status: status || 'AKTIF'
      });
      res.json({ success: true, id: saved.id, teacher: saved });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put('/api/teachers/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, nip, whatsapp, class: className, year, status } = req.body;
      const updated = await saveTeacher({
        id,
        name,
        nip: nip || '',
        whatsapp,
        class: className !== undefined ? className : '',
        year: year || '',
        status: status || 'AKTIF'
      });
      res.json({ success: true, teacher: updated });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/teachers/:id', async (req, res) => {
    try {
      await deleteTeacher(req.params.id);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- WAKA KURIKULUM RESMI (UNTUK TANDA TANGAN & LAPORAN) ---
  app.get('/api/waka-kurikulum', async (req, res) => {
    try {
      const waka = await getAssignedWakaKurikulum();
      res.json(waka || {});
    } catch (e: any) {
      res.json({});
    }
  });

  // --- AKUN GURU (TEACHER ACCOUNTS) ---
  app.get('/api/teacher-accounts', async (req, res) => {
    try {
      const [accounts, teachers] = await Promise.all([
        getAllTeacherAccounts(),
        getAllTeachers()
      ]);

      const teacherMap = new Map<string, any>();
      for (const t of teachers) {
        teacherMap.set(t.id, t);
      }

      const merged = accounts.map(a => {
        const t = teacherMap.get(a.teacher_id) || {};
        return {
          ...a,
          teacher_name: t.name || a.name,
          teacher_nip: t.nip !== undefined ? t.nip : a.nip,
          teacher_whatsapp: t.whatsapp || '',
          teacher_class: t.class || '',
          teacher_status: t.status || a.status
        };
      });

      res.json({ success: true, data: merged });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message, data: [] });
    }
  });

  app.post('/api/teacher-accounts/sync', async (req, res) => {
    try {
      const result = await syncAllTeacherAccounts();
      res.json({
        success: true,
        message: `Sinkronisasi selesai. ${result.created} akun baru dibuat, ${result.updated} akun diperbarui.`,
        created: result.created,
        updated: result.updated,
        data: result.accounts
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post(['/api/teacher-accounts/regenerate/:id', '/api/teacher-accounts/:id/reset-password'], async (req, res) => {
    try {
      const { password, chosenPassword, presetPassword } = req.body || {};
      const custom = password || chosenPassword || presetPassword;
      const result = await regenerateTeacherPassword(req.params.id, custom);
      if (!result.success) {
        return res.status(404).json({ success: false, error: 'Akun guru tidak ditemukan' });
      }
      res.json({
        success: true,
        message: `Password berhasil digenerate otomatis dengan opsi: "${result.chosenPassword}"`,
        newPassword: result.newPasswordPlain,
        chosenPassword: result.chosenPassword,
        allOptions: result.allOptions,
        account: result.account
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post(['/api/teacher-accounts/regenerate', '/api/teacher-accounts/regenerate-all', '/api/teacher-accounts/mass-regenerate'], async (req, res) => {
    try {
      const { password, chosenPassword, presetPassword } = req.body || {};
      const custom = chosenPassword || presetPassword || password;
      const result = await bulkRegenerateTeacherAccounts(custom);
      res.json({
        success: true,
        message: `Berhasil men-generate ulang password untuk ${result.count} akun guru.`,
        count: result.count,
        chosenPassword: result.chosenPassword,
        accounts: result.accounts
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.put(['/api/teacher-accounts/:id/toggle-status', '/api/teacher-accounts/:id/status'], async (req, res) => {
    try {
      const all = await getAllTeacherAccounts();
      const target = all.find(a => a.id === req.params.id || a.teacher_id === req.params.id);
      if (!target) return res.status(404).json({ success: false, error: 'Akun guru tidak ditemukan' });

      let newStatus = req.body?.status;
      if (!newStatus) {
        newStatus = target.status === 'AKTIF' ? 'NONAKTIF' : 'AKTIF';
      }

      const updated = await updateTeacherAccount(target.id, { status: newStatus });
      res.json({
        success: true,
        message: `Status akun guru berhasil diubah menjadi ${newStatus}`,
        account: updated
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.put('/api/teacher-accounts/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { username, password, password_plain, status, nip, name, role } = req.body;
      const targetPassword = password !== undefined && password.trim() ? password.trim() : (password_plain !== undefined && password_plain.trim() ? password_plain.trim() : undefined);
      
      const updated = await updateTeacherAccount(id, {
        username: username !== undefined ? username.trim() : undefined,
        password_plain: targetPassword,
        status: status || undefined,
        nip: nip !== undefined ? nip : undefined,
        name: name !== undefined ? name : undefined,
        role: role || undefined
      });

      if (!updated) {
        return res.status(404).json({ success: false, error: 'Akun guru tidak ditemukan' });
      }

      // Re-sync role if teacher_id exists
      if (updated.teacher_id) {
        await syncTeacherRole(updated.teacher_id);
      }

      res.json({ success: true, message: 'Akun guru berhasil diperbarui', account: updated });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // --- GET TEACHER PROFILE & FRESH ROLE FOR PORTAL ---
  app.get(['/api/guru/profile', '/api/guru/me'], async (req, res) => {
    try {
      const teacher_id = (req.query.teacher_id || req.query.id || '') as string;
      const username = (req.query.username || '') as string;

      // Check if Kepala Sekolah
      if (teacher_id === 'kepsek' || username.toLowerCase() === 'kepsek') {
        const kepsek = await getKepalaSekolahAccount();
        return res.json({
          success: true,
          teacher: {
            id: 'kepsek',
            teacher_id: 'kepsek',
            name: kepsek.name || 'Kepala Sekolah',
            nip: kepsek.nip || '',
            username: kepsek.username || 'kepsek',
            subject: 'Kepala Sekolah',
            phone: kepsek.whatsapp || '',
            whatsapp: kepsek.whatsapp || '',
            class: '',
            role: 'KEPALA_SEKOLAH'
          }
        });
      }

      const allTeachers = await getAllTeachers();
      const allAccounts = await getAllTeacherAccounts();

      let targetTeacher = allTeachers.find(t => t.id === teacher_id);
      let targetAccount = allAccounts.find(a => a.teacher_id === teacher_id || a.id === teacher_id);

      if (!targetTeacher && username) {
        targetAccount = allAccounts.find(a => (a.username || '').toLowerCase() === username.toLowerCase());
        if (targetAccount) {
          targetTeacher = allTeachers.find(t => t.id === targetAccount?.teacher_id);
        }
      }

      if (!targetTeacher && !targetAccount) {
        return res.status(404).json({ success: false, error: 'Guru tidak ditemukan' });
      }

      const realTeacherId = targetTeacher?.id || targetAccount?.teacher_id || '';
      if (realTeacherId) {
        await syncTeacherRole(realTeacherId);
      }

      // Refresh account after role sync
      const freshAccounts = await getAllTeacherAccounts();
      const freshAccount = freshAccounts.find(a => a.teacher_id === realTeacherId || a.id === realTeacherId) || targetAccount;

      return res.json({
        success: true,
        teacher: {
          id: realTeacherId,
          teacher_id: realTeacherId,
          name: targetTeacher?.name || freshAccount?.name || '',
          nip: targetTeacher?.nip || freshAccount?.nip || '',
          username: freshAccount?.username || '',
          subject: (targetTeacher as any)?.subject || (targetTeacher as any)?.mapel || 'Guru',
          phone: targetTeacher?.whatsapp || '',
          whatsapp: targetTeacher?.whatsapp || '',
          class: targetTeacher?.class || '',
          role: freshAccount?.role || 'GURU'
        }
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message || 'Gagal memuat profil guru' });
    }
  });

  // --- MASTER TUGAS / KETERANGAN PIKET ---
  app.get('/api/piket-duties', async (req, res) => {
    try {
      const duties = await getAllPiketDuties();
      res.json({ success: true, data: duties });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message, data: [] });
    }
  });

  app.post('/api/piket-duties', async (req, res) => {
    try {
      const { name, description } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Nama tugas / keterangan wajib diisi' });
      }

      const existing = await getAllPiketDuties();
      if (existing.some(d => d.name.toLowerCase() === name.trim().toLowerCase())) {
        return res.status(400).json({ success: false, error: `Tugas "${name.trim()}" sudah ada dalam daftar` });
      }

      const saved = await savePiketDuty({
        name: name.trim(),
        description: description || ''
      });

      res.json({ success: true, message: 'Tugas piket baru berhasil ditambahkan', data: saved });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.put('/api/piket-duties/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Nama tugas / keterangan wajib diisi' });
      }

      const updated = await updatePiketDuty(id, {
        name: name.trim(),
        description: description !== undefined ? description : undefined
      });

      if (!updated) {
        return res.status(404).json({ success: false, error: 'Data tugas tidak ditemukan' });
      }

      res.json({ success: true, message: 'Tugas piket berhasil diperbarui', data: updated });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete('/api/piket-duties/:id', async (req, res) => {
    try {
      await deletePiketDuty(req.params.id);
      res.json({ success: true, message: 'Tugas piket berhasil dihapus' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // --- JADWAL GURU PIKET (PIKET SCHEDULE) ---
  app.get('/api/piket-schedule', async (req, res) => {
    try {
      const [schedules, teachers, accounts] = await Promise.all([
        getAllPiketSchedule(),
        getAllTeachers(),
        getAllTeacherAccounts()
      ]);

      const teacherMap = new Map<string, any>();
      for (const t of teachers) {
        teacherMap.set(t.id, t);
      }

      const accountMap = new Map<string, any>();
      for (const a of accounts) {
        accountMap.set(a.teacher_id, a);
      }

      const formatted = schedules.map(s => {
        const t = teacherMap.get(s.teacher_id) || {};
        const a = accountMap.get(s.teacher_id) || {};
        return {
          id: s.id,
          day_name: s.day_name,
          day_index: s.day_index,
          teacher_id: s.teacher_id,
          teacher_name: t.name || s.teacher_name,
          nip: t.nip !== undefined ? t.nip : (s.nip || ''),
          whatsapp: t.whatsapp || '',
          class: t.class || '',
          keterangan: s.keterangan || 'Guru Piket',
          has_account: Boolean(a.username),
          username: a.username || '',
          account_status: a.status || 'AKTIF',
          created_at: s.created_at
        };
      });

      res.json({ success: true, data: formatted });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message, data: [] });
    }
  });

  app.post('/api/piket-schedule', async (req, res) => {
    try {
      const { day_name, day_index, teacher_id, keterangan } = req.body;
      if (!day_name || !teacher_id) {
        return res.status(400).json({ success: false, error: 'Hari dan Guru wajib dipilih' });
      }

      const [teachers, allSchedules] = await Promise.all([
        getAllTeachers(),
        getAllPiketSchedule()
      ]);

      const teacher = teachers.find(t => t.id === teacher_id);
      if (!teacher) {
        return res.status(404).json({ success: false, error: 'Data guru tidak ditemukan' });
      }

      // Validasi duplikasi guru pada hari yang sama
      const duplicate = allSchedules.find(
        s => s.day_name.toLowerCase() === day_name.toLowerCase() && s.teacher_id === teacher_id
      );
      if (duplicate) {
        return res.status(400).json({
          success: false,
          error: `Guru ${teacher.name} sudah terdaftar dalam jadwal piket hari ${day_name}`
        });
      }

      const saved = await savePiketSchedule({
        day_name,
        day_index: day_index ? Number(day_index) : undefined,
        teacher_id,
        teacher_name: teacher.name,
        nip: teacher.nip || '',
        keterangan: keterangan || 'Guru Piket'
      });

      res.json({ success: true, message: `Guru piket hari ${day_name} berhasil ditambahkan`, data: saved });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.put('/api/piket-schedule/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { day_name, day_index, teacher_id, keterangan } = req.body;

      const teachers = await getAllTeachers();
      let teacherName = undefined;
      let teacherNip = undefined;

      if (teacher_id) {
        const teacher = teachers.find(t => t.id === teacher_id);
        if (teacher) {
          teacherName = teacher.name;
          teacherNip = teacher.nip || '';
        }
      }

      const updated = await updatePiketSchedule(id, {
        day_name,
        day_index: day_index ? Number(day_index) : undefined,
        teacher_id,
        teacher_name: teacherName,
        nip: teacherNip,
        keterangan
      });

      if (!updated) {
        return res.status(404).json({ success: false, error: 'Jadwal piket tidak ditemukan' });
      }

      res.json({ success: true, message: 'Jadwal piket berhasil diperbarui', data: updated });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete('/api/piket-schedule/:id', async (req, res) => {
    try {
      await deletePiketSchedule(req.params.id);
      res.json({ success: true, message: 'Jadwal piket berhasil dihapus' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ========================================================
  // ATUR PEMBELAJARAN (DATA KBM, ATURAN KEHADIRAN, BEBAS KEHADIRAN)
  // ========================================================

  // 1. KBM CATEGORIES
  app.get('/api/kbm/categories', async (req, res) => {
    try {
      const categories = await getAllKbmCategories();
      res.json(categories);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/kbm/categories', async (req, res) => {
    try {
      const { name, color, is_teaching, description } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Nama kategori wajib diisi' });
      }
      const saved = await saveKbmCategory({ name, color, is_teaching, description });
      res.json({ success: true, message: 'Kategori KBM berhasil ditambahkan', data: saved });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.put('/api/kbm/categories/:id', async (req, res) => {
    try {
      const { name, color, is_teaching, description } = req.body;
      const updated = await updateKbmCategory(req.params.id, { name, color, is_teaching, description });
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Kategori tidak ditemukan' });
      }
      res.json({ success: true, message: 'Kategori KBM berhasil diperbarui', data: updated });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete('/api/kbm/categories/:id', async (req, res) => {
    try {
      await deleteKbmCategory(req.params.id);
      res.json({ success: true, message: 'Kategori KBM berhasil dihapus' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // 2. KBM SCHEDULES (JP PER HARI)
  app.get('/api/kbm/schedules', async (req, res) => {
    try {
      const schedules = await getAllKbmSchedules();
      res.json(schedules);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/kbm/schedules', async (req, res) => {
    try {
      const { day_index, day_name, is_active, periods } = req.body;
      if (day_index === undefined || !day_name) {
        return res.status(400).json({ success: false, error: 'Data hari tidak lengkap' });
      }
      const saved = await saveKbmDaySchedule({
        day_index: Number(day_index),
        day_name,
        is_active: is_active ?? true,
        periods: periods || []
      });
      res.json({ success: true, message: `Pengaturan JP ${day_name} berhasil disimpan`, data: saved });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/kbm/schedules/bulk', async (req, res) => {
    try {
      const { schedules } = req.body;
      if (!Array.isArray(schedules)) {
        return res.status(400).json({ success: false, error: 'Format jadwal tidak valid' });
      }
      await saveAllKbmSchedules(schedules);
      res.json({ success: true, message: 'Semua jadwal KBM berhasil disimpan' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get('/api/kbm/schedules/day/:dayName', async (req, res) => {
    try {
      const schedule = await getKbmScheduleByDay(req.params.dayName);
      res.json(schedule || { day_name: req.params.dayName, is_active: false, periods: [] });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete('/api/kbm/schedules/day/:dayIndex', async (req, res) => {
    try {
      const dayIndex = Number(req.params.dayIndex);
      const cleared = await clearKbmDaySchedule(dayIndex);
      res.json({ success: true, message: 'Jadwal hari berhasil dikosongkan', data: cleared });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // 2.5 JADWAL JP KBM GURU & KELAS (SISTEM PENJADWALAN JP KBM)
  app.get('/api/jadwal-kbm', async (req, res) => {
    try {
      const { teacher_id, rombel_id, hari } = req.query;
      const list = await getAllJadwalKbm({
        teacher_id: teacher_id as string,
        rombel_id: rombel_id as string,
        hari: hari as string
      });
      res.json(list);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get('/api/jadwal-kbm/conflict', async (req, res) => {
    try {
      const { rombel_id, hari, jp_list, exclude_id } = req.query;
      if (!rombel_id || !hari) {
        return res.status(400).json({ success: false, error: 'rombel_id dan hari wajib disertakan' });
      }

      let parsedJps: number[] | undefined = undefined;
      if (jp_list) {
        if (Array.isArray(jp_list)) {
          parsedJps = jp_list.map(Number);
        } else if (typeof jp_list === 'string') {
          parsedJps = jp_list.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
        }
      }

      const result = await checkJadwalKbmConflict({
        rombel_id: String(rombel_id),
        hari: String(hari),
        jp_list: parsedJps,
        exclude_id: exclude_id ? String(exclude_id) : undefined
      });

      res.json({
        success: true,
        ...result
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/jadwal-kbm/batch', async (req, res) => {
    try {
      const { schedules } = req.body;
      if (!Array.isArray(schedules) || schedules.length === 0) {
        return res.status(400).json({ success: false, error: 'Daftar jadwal wajib berupa array non-kosong' });
      }

      // Check conflicts for all items first before inserting
      for (const item of schedules) {
        const { rombel_id, hari, jp_list, teacher_id, mapel_name, exclude_id } = item;
        if (!rombel_id || !hari || !Array.isArray(jp_list) || jp_list.length === 0) {
          continue;
        }
        const conflictCheck = await checkJadwalKbmConflict({
          rombel_id,
          hari,
          jp_list,
          exclude_id
        });
        if (conflictCheck.hasConflict) {
          const externalConflicts = conflictCheck.conflicts.filter(c => c.teacher_id !== teacher_id);
          if (externalConflicts.length > 0) {
            const first = externalConflicts[0];
            const conflictedStr = externalConflicts.map(c => `JP ${c.jp}`).join(', ');
            return res.status(400).json({
              success: false,
              error: `Bentrok pada kelas ${rombel_id} (Hari ${hari}): Slot ${conflictedStr} sudah ditempati oleh ${first.teacher_name} (${first.mapel_name})`
            });
          }
        }
      }

      // Insert or update all schedule entries
      const createdList = [];
      for (const item of schedules) {
        const { teacher_id, teacher_name, mapel_name, rombel_id, hari, jp_list } = item;
        if (!teacher_id || !mapel_name || !rombel_id || !hari || !Array.isArray(jp_list) || jp_list.length === 0) {
          continue;
        }
        const created = await createJadwalKbm({
          teacher_id,
          teacher_name,
          mapel_name,
          rombel_id,
          hari,
          jp_list
        });
        createdList.push(created);
      }

      res.json({
        success: true,
        message: `Berhasil mendaftarkan ${createdList.length} entri jadwal KBM`,
        data: createdList
      });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  app.post('/api/jadwal-kbm', async (req, res) => {
    try {
      const { teacher_id, teacher_name, mapel_name, rombel_id, rombel_ids, hari, jp_list } = req.body;

      if (!teacher_id || !mapel_name || !hari || !jp_list || !Array.isArray(jp_list) || jp_list.length === 0) {
        return res.status(400).json({ success: false, error: 'Guru, mata pelajaran, hari, dan slot JP wajib diisi' });
      }

      const targetRombels: string[] = Array.isArray(rombel_ids) && rombel_ids.length > 0 
        ? rombel_ids 
        : (rombel_id ? [rombel_id] : []);

      if (targetRombels.length === 0) {
        return res.status(400).json({ success: false, error: 'Minimal pilih satu rombel / kelas' });
      }

      // Check conflicts for all selected rombels first before inserting
      for (const rId of targetRombels) {
        const conflictCheck = await checkJadwalKbmConflict({
          rombel_id: rId,
          hari,
          jp_list
        });
        if (conflictCheck.hasConflict) {
          const first = conflictCheck.conflicts[0];
          const conflictedStr = conflictCheck.conflicts.map(c => `JP ${c.jp}`).join(', ');
          return res.status(400).json({
            success: false,
            error: `Bentrok pada kelas ${rId}: Slot ${conflictedStr} pada hari ${hari} sudah ditempati oleh ${first.teacher_name} (${first.mapel_name})`
          });
        }
      }

      const createdList = [];
      for (const rId of targetRombels) {
        const created = await createJadwalKbm({
          teacher_id,
          teacher_name,
          mapel_name,
          rombel_id: rId,
          hari,
          jp_list
        });
        createdList.push(created);
      }

      res.json({
        success: true,
        message: targetRombels.length > 1 
          ? `Berhasil mendaftarkan jadwal KBM untuk ${targetRombels.length} kelas` 
          : 'Jadwal KBM berhasil didaftarkan',
        data: createdList.length === 1 ? createdList[0] : createdList
      });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  app.put('/api/jadwal-kbm/:id', async (req, res) => {
    try {
      const updated = await updateJadwalKbm(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Jadwal KBM tidak ditemukan' });
      }
      res.json({ success: true, message: 'Jadwal KBM berhasil diperbarui', data: updated });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  app.delete('/api/jadwal-kbm/:id', async (req, res) => {
    try {
      await deleteJadwalKbm(req.params.id);
      res.json({ success: true, message: 'Jadwal KBM berhasil dihapus' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // 3. ATURAN KEHADIRAN (TITIK SEKOLAH, JARAK MAKSIMAL, MIN VERIFIKASI)
  app.get('/api/attendance-rules', async (req, res) => {
    try {
      const rules = await getAttendanceRules();
      res.json(rules);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/attendance-rules', async (req, res) => {
    try {
      const { school_latitude, school_longitude, school_location_name, max_distance_meters, min_student_verification, allow_manual_verification } = req.body;
      const saved = await saveAttendanceRules({
        school_latitude: school_latitude !== undefined ? Number(school_latitude) : undefined,
        school_longitude: school_longitude !== undefined ? Number(school_longitude) : undefined,
        school_location_name,
        max_distance_meters: max_distance_meters !== undefined ? Number(max_distance_meters) : undefined,
        min_student_verification: min_student_verification !== undefined ? Number(min_student_verification) : undefined,
        allow_manual_verification: allow_manual_verification !== undefined ? !!allow_manual_verification : undefined
      });
      res.json({ success: true, message: 'Aturan kehadiran berhasil disimpan', data: saved });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // 4. BEBAS KEHADIRAN (LIBUR NASIONAL & KHUSUS)
  app.get('/api/free-attendance', async (req, res) => {
    try {
      const list = await getAllFreeAttendance();
      res.json(list);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/free-attendance', async (req, res) => {
    try {
      const { start_date, end_date, name, type, description, rombel_scope } = req.body;
      if (!name || !start_date) {
        return res.status(400).json({ success: false, error: 'Nama libur dan tanggal mulai wajib diisi' });
      }
      const saved = await saveFreeAttendance({
        start_date,
        end_date: end_date || start_date,
        name,
        type: type || 'sekolah',
        description,
        rombel_scope: rombel_scope || 'all'
      });
      res.json({ success: true, message: 'Data bebas kehadiran berhasil ditambahkan', data: saved });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.put('/api/free-attendance/:id', async (req, res) => {
    try {
      const { start_date, end_date, name, type, description, rombel_scope } = req.body;
      const updated = await updateFreeAttendance(req.params.id, {
        start_date,
        end_date,
        name,
        type,
        description,
        rombel_scope
      });
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Data bebas kehadiran tidak ditemukan' });
      }
      res.json({ success: true, message: 'Data bebas kehadiran berhasil diperbarui', data: updated });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete('/api/free-attendance/:id', async (req, res) => {
    try {
      await deleteFreeAttendance(req.params.id);
      res.json({ success: true, message: 'Data bebas kehadiran berhasil dihapus' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/free-attendance/sync-national', async (req, res) => {
    try {
      const result = await syncNationalHolidays();
      res.json({
        success: true,
        message: `Sinkronisasi berhasil! ${result.count} hari libur nasional ditambahkan`,
        data: result.holidays
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get('/api/free-attendance/check/:date', async (req, res) => {
    try {
      const className = req.query.class as string | undefined;
      const result = await checkDateFreeAttendance(req.params.date, className);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // 5. KEHADIRAN KBM GURU REALTIME & LAPORAN
  app.post('/api/teacher-kbm-attendance/verify-student', async (req, res) => {
    try {
      const { barcode, nisn, rombel_id } = req.body;
      const code = (barcode || nisn || '').trim();
      if (!code) {
        return res.status(400).json({ success: false, error: 'Barcode / NISN tidak boleh kosong' });
      }

      const students = await getAllStudents();
      const student = students.find(s =>
        (s.qr_code && s.qr_code.trim() === code) ||
        (s.nisn && s.nisn.trim() === code) ||
        (s.nis && s.nis.trim() === code)
      );

      if (!student) {
        return res.status(404).json({ success: false, error: 'Data siswa dengan barcode/NISN tersebut tidak ditemukan' });
      }

      // Validasi rombel jika dicantumkan
      const isCorrectRombel = !rombel_id || student.class.trim().toLowerCase() === rombel_id.trim().toLowerCase();

      res.json({
        success: true,
        student: {
          student_id: student.id,
          nisn: student.nisn,
          nis: student.nis || '',
          name: student.name,
          class_name: student.class,
          status: student.status || 'AKTIF'
        },
        isCorrectRombel,
        message: isCorrectRombel ? 'Verifikasi kartu siswa berhasil' : `Peringatan: Siswa ini terdaftar di kelas ${student.class}, bukan ${rombel_id}`
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  const handleTeacherKbmAttendance = async (req: any, res: any) => {
    try {
      const {
        date,
        teacher_id,
        teacher_name,
        nip,
        rombel_id,
        subject,
        jp_list,
        jp_start,
        jp_end,
        topic,
        location_status,
        location_coords,
        location_distance,
        is_mocked,
        gps_accuracy,
        verified_students,
        status,
        jadwal_kbm_id,
        jadwal_id
      } = req.body;

      if (!teacher_id || !rombel_id || !subject) {
        return res.status(400).json({ success: false, error: 'Data guru, rombel, dan mata pelajaran wajib diisi' });
      }

      const saved = await recordTeacherKbmAttendance({
        date: date || new Date().toISOString().split('T')[0],
        teacher_id,
        teacher_name,
        nip,
        rombel_id,
        subject,
        jp_list,
        jp_start,
        jp_end,
        topic,
        location_status: location_status || 'VALID',
        location_coords,
        location_distance,
        is_mocked,
        gps_accuracy,
        verified_students,
        status: status || 'HADIR',
        jadwal_kbm_id: jadwal_kbm_id || jadwal_id || undefined
      });

      res.json({ success: true, message: 'Presensi KBM Guru berhasil dikirim dan diverifikasi!', data: saved });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  };

  app.post('/api/teacher-kbm-attendance', handleTeacherKbmAttendance);
  app.post('/api/kehadiran-guru', handleTeacherKbmAttendance);

  app.get('/api/teacher-kbm-attendance', async (req, res) => {
    try {
      const { date, startDate, endDate, rombel_id, teacher_id } = req.query;
      const list = await getAllTeacherKbmAttendance({
        date: date as string,
        startDate: startDate as string,
        endDate: endDate as string,
        rombel_id: rombel_id as string,
        teacher_id: teacher_id as string
      });
      res.json(list);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete('/api/teacher-kbm-attendance/:id', async (req, res) => {
    try {
      await deleteTeacherKbmAttendance(req.params.id);
      res.json({ success: true, message: 'Data presensi KBM guru berhasil dihapus' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // REKAP KEHADIRAN ROMBEL & GURU
  app.get('/api/teacher-kbm-attendance/recap', async (req, res) => {
    try {
      const type = (req.query.type as 'daily' | 'weekly' | 'monthly') || 'daily';
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const rombel_id = req.query.rombel_id as string | undefined;
      const teacher_id = req.query.teacher_id as string | undefined;

      const recap = await getTeacherKbmRecap({ type, date, rombel_id, teacher_id });
      res.json(recap);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // --- ATTENDANCE ---
  app.get('/api/attendance', async (req, res) => {
    try {
      const { date, class: className, year } = req.query;
      let mapped: any[] = [];
      try {
        let queryStr = "";
        let params: any[] = [];

        if (date) {
          queryStr = `
            SELECT a.*, 
              s.name as student_name, s.nisn as student_nisn, s.nis as student_nis, 
              s.class as student_class, s.year as student_year, s.photo as student_photo
            FROM attendance a
            LEFT JOIN students s ON a.student_id = s.id
            WHERE timezone('Asia/Jakarta', a.timestamp::timestamp with time zone)::date = $1::date
          `;
          params.push(date);
          
          if (className && className !== 'ALL' && className !== '') {
              params.push(className);
              queryStr += ` AND s.class = $${params.length}`;
          }
          if (year && year !== 'ALL' && year !== '') {
              params.push(year);
              queryStr += ` AND s.year = $${params.length}`;
          }
          queryStr += ` ORDER BY a.student_id, a.timestamp ASC`;
        } else {
          queryStr = `
            SELECT a.*, s.name as student_name, s.nisn as student_nisn, s.nis as student_nis, s.class as student_class, s.year as student_year, s.photo as student_photo
            FROM attendance a
            LEFT JOIN students s ON a.student_id = s.id
            ORDER BY a.timestamp DESC
          `;
        }

        const result = await pool.query(queryStr, params);
        mapped = result.rows.map((r) => ({
          id: r.id, 
          studentId: r.student_id, 
          timestamp: r.timestamp, 
          status: r.status, 
          type: r.type,
          student: {
            id: r.student_id,
            name: r.student_name,
            nisn: r.student_nisn,
            nis: r.student_nis,
            class: r.student_class,
            year: r.student_year,
            photo: r.student_photo
          }
        }));
      } catch (dbErr) {
        const [allAtt, allStudents] = await Promise.all([
          getAllAttendance(),
          getAllStudents()
        ]);
        const studentMap = new Map<string, any>();
        for (const s of allStudents) {
          studentMap.set(s.id, s);
        }
        let filtered = allAtt;
        if (date) {
          filtered = filtered.filter(a => a.timestamp.startsWith(String(date)));
        }
        mapped = filtered.map(a => {
          const s = studentMap.get(a.student_id) || {};
          return {
            id: a.id,
            studentId: a.student_id,
            timestamp: a.timestamp,
            status: a.status,
            type: a.type,
            student: {
              id: a.student_id,
              name: s.name || '',
              nisn: s.nisn || '',
              nis: s.nis || '',
              class: s.class || '',
              year: s.year || '',
              photo: s.photo || s.foto || ''
            }
          };
        });
        if (className && className !== 'ALL' && className !== '') {
          mapped = mapped.filter(m => m.student.class === className);
        }
        if (year && year !== 'ALL' && year !== '') {
          mapped = mapped.filter(m => m.student.year === year);
        }
      }
      res.json(mapped);
    } catch (e) { res.json([]); }
  });

  // --- ATTENDANCE MATRIX (Untuk Ekspor Bulanan/Range) ---
  app.get('/api/attendance/matrix', async (req, res) => {
    try {
      const { startDate, endDate, class: className, year } = req.query;
      
      if (!startDate || !endDate || !className || !year) {
         return res.status(400).json({ error: 'startDate, endDate, class, dan year wajib diisi' });
      }

      let students: any[] = [];
      let attRows: Array<{ student_id: string; att_date_str: string; status: string }> = [];
      let izinRows: Array<{ nisn: string; start_str: string; end_str: string; keterangan: string }> = [];

      try {
        const studentRes = await pool.query('SELECT * FROM students WHERE ($1 = \'ALL\' OR class = $1) AND ($2 = \'ALL\' OR year = $2) ORDER BY class ASC, name ASC', [className, year]);
        students = studentRes.rows;

        const attRes = await pool.query(`
          SELECT DISTINCT ON (a.student_id, TO_CHAR(timezone('Asia/Jakarta', a.timestamp::timestamp with time zone), 'YYYY-MM-DD')) 
            a.student_id, 
            TO_CHAR(timezone('Asia/Jakarta', a.timestamp::timestamp with time zone), 'YYYY-MM-DD') as att_date_str, 
            a.status 
          FROM attendance a
          LEFT JOIN students s ON a.student_id = s.id
          WHERE ($1 = 'ALL' OR s.class = $1) AND ($2 = 'ALL' OR s.year = $2) 
            AND TO_CHAR(timezone('Asia/Jakarta', a.timestamp::timestamp with time zone), 'YYYY-MM-DD') >= $3
            AND TO_CHAR(timezone('Asia/Jakarta', a.timestamp::timestamp with time zone), 'YYYY-MM-DD') <= $4
          ORDER BY a.student_id, TO_CHAR(timezone('Asia/Jakarta', a.timestamp::timestamp with time zone), 'YYYY-MM-DD'), a.timestamp ASC
        `, [className, year, startDate, endDate]);
        attRows = attRes.rows;

        const izinRes = await pool.query(`
          SELECT i.nisn, 
                 TO_CHAR(timezone('Asia/Jakarta', i.tanggal_mulai::timestamp with time zone), 'YYYY-MM-DD') as start_str,
                 TO_CHAR(timezone('Asia/Jakarta', i.tanggal_selesai::timestamp with time zone), 'YYYY-MM-DD') as end_str,
                 i.keterangan 
          FROM izin_siswa i
          JOIN students s ON i.nisn = s.nisn
          WHERE ($1 = 'ALL' OR s.class = $1) AND ($2 = 'ALL' OR s.year = $2)
            AND TO_CHAR(timezone('Asia/Jakarta', i.tanggal_mulai::timestamp with time zone), 'YYYY-MM-DD') <= $4
            AND TO_CHAR(timezone('Asia/Jakarta', i.tanggal_selesai::timestamp with time zone), 'YYYY-MM-DD') >= $3
        `, [className, year, startDate, endDate]);
        izinRows = izinRes.rows;
      } catch (dbErr) {
        const [allStudents, allAtt, allIzin] = await Promise.all([
          getAllStudents(),
          getAllAttendance(),
          getAllIzin()
        ]);
        students = allStudents.filter(s => 
          (className === 'ALL' || s.class === className) &&
          (year === 'ALL' || s.year === year)
        ).sort((a, b) => (a.class || '').localeCompare(b.class || '') || (a.name || '').localeCompare(b.name || ''));

        attRows = allAtt
          .filter(a => {
            const d = a.timestamp.split('T')[0];
            return d >= String(startDate) && d <= String(endDate);
          })
          .map(a => ({
            student_id: a.student_id,
            att_date_str: a.timestamp.split('T')[0],
            status: a.status
          }));

        izinRows = allIzin
          .filter(i => i.tanggal_mulai <= String(endDate) && i.tanggal_selesai >= String(startDate))
          .map(i => ({
            nisn: i.nisn,
            start_str: i.tanggal_mulai,
            end_str: i.tanggal_selesai,
            keterangan: i.keterangan
          }));
      }

      const rombelStatusMap = await getAllRombelStatus();

      const matrix = students.map(s => {
          const isPklStudent = s.status === 'PKL' || rombelStatusMap[s.class] === 'PKL';
          const isLulus = s.status === 'LULUS';
          const row = {
              studentId: s.id,
              name: s.name,
              nisn: s.nisn,
              className: s.class,
              year: s.year,
              status: s.status || (isPklStudent ? 'PKL' : 'AKTIF'),
              isPkl: isPklStudent,
              attendance: {} as Record<string, string>,
              totals: { H: 0, S: 0, I: 0, A: 0, PKL: 0 }
          };

          const sAtt = attRows.filter(a => a.student_id === s.id);
          const sIzin = izinRows.filter(i => i.nisn === s.nisn);

          let curr = new Date(String(startDate) + 'T00:00:00Z');
          const end = new Date(String(endDate) + 'T00:00:00Z');

          while (curr <= end) {
              const dateStr = curr.toISOString().split('T')[0];
              let dailyStatus = isPklStudent ? 'PKL' : 'A'; 

              const dayOfWeek = curr.getUTCDay();
              if (dayOfWeek === 0 || dayOfWeek === 6) {
                 dailyStatus = '-'; 
              } else if (isLulus) {
                 dailyStatus = '-';
              } else {
                 let hasIzin = false;
                 for (const iz of sIzin) {
                     if (dateStr >= iz.start_str && dateStr <= iz.end_str) {
                         const ket = (iz.keterangan || '').toLowerCase();
                         if (ket.includes('sakit')) dailyStatus = 'S';
                         else if (ket.includes('dispensasi')) dailyStatus = 'D';
                         else dailyStatus = 'I';
                         hasIzin = true;
                         break;
                     }
                 }

                 const att = sAtt.find(a => a.att_date_str === dateStr);
                 if (att) {
                     dailyStatus = 'H';
                 }

                 if (dailyStatus === 'H') row.totals.H++;
                 else if (dailyStatus === 'S') row.totals.S++;
                 else if (dailyStatus === 'I') row.totals.I++;
                 else if (dailyStatus === 'PKL') row.totals.PKL++;
                 else if (dailyStatus === 'A') {
                   // REQUIREMENT 4: Pastikan untuk siswa dengan status PKL tidak terdata alpha pada laporan
                   if (isPklStudent) {
                     dailyStatus = 'PKL';
                     row.totals.PKL++;
                   } else {
                     row.totals.A++;
                   }
                 }
              }
              row.attendance[dateStr] = dailyStatus;
              
              curr.setUTCDate(curr.getUTCDate() + 1);
          }
          return row;
      });

      res.json(matrix);
    } catch (e) { handleDbError(e, res, []); }
  });
  // --- UPLOAD PHOTOS & MEDIA ---
  app.post('/api/upload/photo', upload.single('photo'), async (req, res) => {
    try {
      let filename = '';
      if (req.file) {
        const originalExt = path.extname(req.file.originalname) || '.jpg';
        filename = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${originalExt}`;
        const targetPath = path.join(PHOTOS_DIR, filename);
        fs.copyFileSync(req.file.path, targetPath);
        
        // Salin juga ke local cwd ./uploads/photos dan ./uploads
        try {
          const localPhotoPath = path.join(process.cwd(), 'uploads', 'photos', filename);
          fs.copyFileSync(req.file.path, localPhotoPath);
          fs.copyFileSync(req.file.path, path.join(UPLOADS_DIR, filename));
        } catch (e) {}
        
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      } else if (req.body && req.body.photo) {
        const base64Data = req.body.photo.replace(/^data:image\/\w+;base64,/, '');
        const ext = (req.body.photo.match(/^data:image\/(\w+);base64,/) || [])[1] || 'jpg';
        filename = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
        const dataBuffer = Buffer.from(base64Data, 'base64');
        
        fs.writeFileSync(path.join(PHOTOS_DIR, filename), dataBuffer);
        try {
          fs.writeFileSync(path.join(process.cwd(), 'uploads', 'photos', filename), dataBuffer);
          fs.writeFileSync(path.join(UPLOADS_DIR, filename), dataBuffer);
        } catch (e) {}
      } else {
        return res.status(400).json({ success: false, error: 'File atau data foto tidak ditemukan' });
      }

      res.json({
        success: true,
        filename,
        url: `/uploads/photos/${filename}`,
        path: `/photos/${filename}`
      });
    } catch (e: any) {
      console.error('Error uploading photo:', e);
      res.status(500).json({ success: false, error: e.message || 'Gagal mengunggah foto' });
    }
  });

  app.post('/api/students/:id/photo', upload.single('photo'), async (req, res) => {
    try {
      const studentId = req.params.id;
      let filename = '';

      if (req.file) {
        const ext = path.extname(req.file.originalname) || '.jpg';
        filename = `${studentId}_${Date.now()}${ext}`;
        const targetPath = path.join(PHOTOS_DIR, filename);
        fs.copyFileSync(req.file.path, targetPath);
        
        try {
          fs.copyFileSync(req.file.path, path.join(process.cwd(), 'uploads', 'photos', filename));
          fs.copyFileSync(req.file.path, path.join(UPLOADS_DIR, filename));
        } catch (e) {}
        
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      } else if (req.body && req.body.photo) {
        const base64Data = req.body.photo.replace(/^data:image\/\w+;base64,/, '');
        const ext = (req.body.photo.match(/^data:image\/(\w+);base64,/) || [])[1] || 'jpg';
        filename = `${studentId}_${Date.now()}.${ext}`;
        const dataBuffer = Buffer.from(base64Data, 'base64');
        
        fs.writeFileSync(path.join(PHOTOS_DIR, filename), dataBuffer);
        try {
          fs.writeFileSync(path.join(process.cwd(), 'uploads', 'photos', filename), dataBuffer);
          fs.writeFileSync(path.join(UPLOADS_DIR, filename), dataBuffer);
        } catch (e) {}
      } else {
        return res.status(400).json({ success: false, error: 'Foto tidak ditemukan' });
      }

      const photoUrl = `/uploads/photos/${filename}`;
      try {
        await safeDbQuery(
          'UPDATE students SET photo = $1, foto = $1 WHERE id = $2 OR nisn = $2',
          [filename, studentId]
        );
      } catch (dbErr) {}

      // Update in dataStore
      const students = await getAllStudents();
      const st = students.find(s => s.id === studentId || s.nisn === studentId);
      if (st) {
        st.photo = filename;
        (st as any).foto = filename;
        await saveStudent(st);
      }

      res.json({ success: true, photo: filename, photoUrl });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message || 'Gagal menyimpan foto siswa' });
    }
  });

  app.post('/api/upload/logo', upload.single('logo'), async (req, res) => {
    try {
      let logoUrl = '';
      let filename = '';
      if (req.file) {
        const ext = path.extname(req.file.originalname) || '.png';
        filename = `logo_${Date.now()}${ext}`;
        const targetPath = path.join(BRANDING_DIR, filename);
        fs.copyFileSync(req.file.path, targetPath);
        
        // Simpan salinan logo.png & salin ke photos dir dan cwd
        try {
          fs.copyFileSync(req.file.path, path.join(BRANDING_DIR, `logo${ext}`));
          fs.copyFileSync(req.file.path, path.join(PHOTOS_DIR, filename));
          fs.copyFileSync(req.file.path, path.join(PHOTOS_DIR, `logo${ext}`));
          fs.copyFileSync(req.file.path, path.join(process.cwd(), 'uploads', 'branding', filename));
          fs.copyFileSync(req.file.path, path.join(process.cwd(), 'uploads', 'photos', filename));
        } catch (e) {}
        
        try { fs.unlinkSync(req.file.path); } catch (e) {}
        logoUrl = `/uploads/branding/${filename}`;
      } else if (req.body && req.body.logo) {
        logoUrl = saveBase64ToFile(req.body.logo, BRANDING_DIR, 'logo');
      } else {
        return res.status(400).json({ success: false, error: 'Logo tidak ditemukan' });
      }

      // Update pengaturan di DB & lokal
      try {
        await safeDbQuery('UPDATE pengaturan SET logo = $1 WHERE id = 1', [logoUrl]);
      } catch (e) {}
      saveLocalSettings({ logoBase64: logoUrl });

      // Broadcast update ke semua terminal Kiosk Portal Scanner
      broadcastKioskConfigUpdate({ logoBase64: logoUrl, logo: logoUrl, logoUrl });

      res.json({ success: true, logoUrl, filename });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message || 'Gagal mengunggah logo' });
    }
  });

  // --- UPLOAD FAVICON (Realtime Dynamic Favicon) ---
  app.post('/api/upload/favicon', upload.single('favicon'), async (req, res) => {
    try {
      let faviconUrl = '';
      let filename = '';
      if (req.file) {
        const ext = path.extname(req.file.originalname) || '.png';
        filename = `favicon_${Date.now()}${ext}`;
        const targetPath = path.join(BRANDING_DIR, filename);
        fs.copyFileSync(req.file.path, targetPath);
        
        try {
          fs.copyFileSync(req.file.path, path.join(BRANDING_DIR, `favicon${ext}`));
          fs.copyFileSync(req.file.path, path.join(PHOTOS_DIR, filename));
          fs.copyFileSync(req.file.path, path.join(process.cwd(), 'uploads', 'branding', filename));
          fs.copyFileSync(req.file.path, path.join(process.cwd(), 'public', `favicon${ext}`));
        } catch (e) {}
        
        try { fs.unlinkSync(req.file.path); } catch (e) {}
        faviconUrl = `/uploads/branding/${filename}`;
      } else if (req.body && req.body.favicon) {
        faviconUrl = saveBase64ToFile(req.body.favicon, BRANDING_DIR, 'favicon');
      } else {
        return res.status(400).json({ success: false, error: 'File favicon tidak ditemukan' });
      }

      // Update pengaturan di DB & lokal
      try {
        await safeDbQuery('ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS favicon TEXT');
        await safeDbQuery('UPDATE pengaturan SET favicon = $1 WHERE id = 1', [faviconUrl]);
      } catch (e) {}
      saveLocalSettings({ faviconBase64: faviconUrl, favicon: faviconUrl });

      res.json({ success: true, faviconUrl, url: faviconUrl, filename });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message || 'Gagal mengunggah favicon' });
    }
  });

  app.post('/api/upload/background', upload.single('background'), async (req, res) => {
    try {
      let backgroundUrl = '';
      let filename = '';
      if (req.file) {
        const ext = path.extname(req.file.originalname) || '.jpg';
        filename = `bg_${Date.now()}${ext}`;
        const targetPath = path.join(BRANDING_DIR, filename);
        fs.copyFileSync(req.file.path, targetPath);
        
        try {
          fs.copyFileSync(req.file.path, path.join(process.cwd(), 'uploads', 'branding', filename));
          fs.copyFileSync(req.file.path, path.join(UPLOADS_DIR, filename));
        } catch (e) {}
        
        try { fs.unlinkSync(req.file.path); } catch (e) {}
        backgroundUrl = `/uploads/branding/${filename}`;
      } else if (req.body && req.body.background) {
        backgroundUrl = saveBase64ToFile(req.body.background, BRANDING_DIR, 'background');
      } else {
        return res.status(400).json({ success: false, error: 'Foto background tidak ditemukan' });
      }

      // Update pengaturan di DB & lokal
      try {
        await safeDbQuery('ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS background_image TEXT');
        await safeDbQuery('UPDATE pengaturan SET background_image = $1 WHERE id = 1', [backgroundUrl]);
      } catch (e) {}
      saveLocalSettings({ backgroundImage: backgroundUrl, background_image: backgroundUrl });

      res.json({ success: true, backgroundUrl, url: backgroundUrl, filename });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message || 'Gagal mengunggah background' });
    }
  });

  app.post('/api/upload/sound', upload.single('sound'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, error: 'File suara tidak ditemukan' });
      const ext = path.extname(req.file.originalname) || '.mp3';
      const filename = `sound_${Date.now()}${ext}`;
      const targetPath = path.join(SOUNDS_DIR, filename);
      fs.copyFileSync(req.file.path, targetPath);
      try {
        fs.copyFileSync(req.file.path, path.join(process.cwd(), 'uploads', 'sounds', filename));
      } catch (e) {}
      try { fs.unlinkSync(req.file.path); } catch (e) {}

      const soundUrl = `/uploads/sounds/${filename}`;
      const type = req.body.type || 'success';
      if (type === 'success') {
        saveLocalSettings({ fileSuaraSukses: soundUrl });
      } else {
        saveLocalSettings({ fileSuaraGagal: soundUrl });
      }

      res.json({ success: true, soundUrl, filename });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message || 'Gagal mengunggah file suara' });
    }
  });

  app.post('/api/students/upload-photos', upload.single('zipfile'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const zip = new AdmZip(req.file.path);
      const zipEntries = zip.getEntries();
      let count = 0;
      for (const entry of zipEntries) {
         if (!entry.isDirectory) {
             const filename = entry.entryName;
             const nisnMatch = filename.match(/^(\d+)\./);
             if (nisnMatch) {
                 const nisn = nisnMatch[1];
                 const ext = filename.split('.').pop() || 'jpg';
                 const outName = `${nisn}.${ext}`;
                 const buffer = entry.getData();
                 
                 // Simpan ke PHOTOS_DIR, UPLOADS_DIR, dan local cwd
                 fs.writeFileSync(path.join(PHOTOS_DIR, outName), buffer);
                 fs.writeFileSync(path.join(UPLOADS_DIR, outName), buffer);
                 try {
                   fs.writeFileSync(path.join(process.cwd(), 'uploads', 'photos', outName), buffer);
                 } catch (e) {}

                 try {
                   await pool.query('UPDATE students SET photo = $1, foto = $1 WHERE nisn = $2 OR nis = $2', [outName, nisn]);
                 } catch (dbErr) {}

                 count++;
             }
         }
      }
      try { fs.unlinkSync(req.file.path); } catch (e) {}
      res.json({ success: true, count, message: `Berhasil mengekstrak dan menyimpan ${count} foto siswa ke folder /uploads/photos` });
    } catch (e) { handleDbError(e, res, {}); }
  });

  // --- IMPORT STUDENTS ---
  app.post('/api/import/students', async (req, res) => {
    try {
      const students = req.body.students || [];
      for (const s of students) {
        await saveStudent({
          name: s.name,
          nisn: s.nisn,
          nis: s.nis || '',
          class: s.class,
          year: s.year,
          status: s.status || 'AKTIF',
          custom_fields: s.customFields || {},
          qr_code: s.qrCode || s.nisn
        });
      }
      res.json({ success: true, added: students.length });
    } catch (e) { handleDbError(e, res, {}); }
  });

  app.get('/api/attendance/latest', async (req, res) => {
    try {
      const { since } = req.query;
      if (!since) return res.json([]);
      try {
        const result = await pool.query(`
          SELECT a.*, s.name as student_name, s.class as student_class
          FROM attendance a
          JOIN students s ON a.student_id = s.id
          WHERE a.timestamp > $1 AND a.type = 'ARRIVAL'
          ORDER BY a.timestamp ASC
        `, [since]);
        return res.json(result.rows);
      } catch (dbErr) {
        const [allAtt, allStudents] = await Promise.all([
          getAllAttendance(),
          getAllStudents()
        ]);
        const studentMap = new Map<string, any>();
        for (const s of allStudents) {
          studentMap.set(s.id, s);
        }
        const filtered = allAtt
          .filter(a => a.timestamp > String(since) && a.type === 'ARRIVAL')
          .map(a => {
            const s = studentMap.get(a.student_id) || {};
            return {
              ...a,
              student_name: s.name || '',
              student_class: s.class || ''
            };
          });
        return res.json(filtered);
      }
    } catch(e) {
      res.json([]);
    }
  });

  // --- TODAY ATTENDANCE HISTORY FOR MULTI-CLIENT KIOSK SYNC ---
  app.get('/api/attendance/today-history', async (req, res) => {
    try {
      const todayDateStr = getWIBDateString();
      const settings = await getSettings();
      const currentDay = getWIBDayNameEnglish();
      const currentDayIndo = getWIBDayName();

      const todaySchedule = settings.schedule?.[currentDay] || null;

      const currentTimeStr = getWIBTimeString();
      const parseTimeToMinutes = (timeStr: string) => {
        if (!timeStr) return 0;
        const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/);
        if (!match) return 0;
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const modifier = match[3] ? match[3].toUpperCase() : null;
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
      };

      const currentMinutes = parseTimeToMinutes(currentTimeStr);
      const arrivalStartMins = parseTimeToMinutes(todaySchedule?.arrivalStart || '');
      const arrivalEndMins = parseTimeToMinutes(todaySchedule?.arrivalEnd || settings.jam_masuk || '');
      const depStartMins = parseTimeToMinutes(todaySchedule?.departureStart || settings.jam_pulang || '');
      const depEndMins = parseTimeToMinutes(todaySchedule?.departureEnd || '');

      const isDayActive = Boolean(
        todaySchedule &&
        (arrivalStartMins > 0 || depStartMins > 0) &&
        todaySchedule.enabled !== false
      );

      let activeSession: 'ARRIVAL' | 'DEPARTURE' | 'OUTSIDE' = 'OUTSIDE';
      let gateClosedReason = '';

      if (!isDayActive) {
        activeSession = 'OUTSIDE';
        gateClosedReason = `Presensi ditutup. Hari ini (${currentDayIndo}) adalah hari libur / bukan hari sekolah aktif.`;
      } else if (arrivalStartMins > 0 && arrivalEndMins > 0 && currentMinutes >= arrivalStartMins && currentMinutes <= arrivalEndMins) {
        activeSession = 'ARRIVAL';
      } else if (depStartMins > 0 && depEndMins > 0 && currentMinutes >= depStartMins && currentMinutes <= depEndMins) {
        activeSession = 'DEPARTURE';
      } else {
        activeSession = 'OUTSIDE';
        if (arrivalStartMins > 0 && currentMinutes < arrivalStartMins) {
          gateClosedReason = `Gerbang Presensi Belum Dibuka: Jam kedatangan hari ini baru dibuka pukul ${todaySchedule.arrivalStart} WIB.`;
        } else if (arrivalEndMins > 0 && depStartMins > 0 && currentMinutes > arrivalEndMins && currentMinutes < depStartMins) {
          gateClosedReason = `Sesi Presensi Telah Berakhir: Jam kedatangan telah ditutup (${todaySchedule.arrivalEnd || settings.jam_masuk || '12:00'} WIB) dan jam kepulangan baru dibuka pukul ${todaySchedule.departureStart || settings.jam_pulang || '13:00'} WIB.`;
        } else if (depEndMins > 0 && currentMinutes > depEndMins) {
          gateClosedReason = `Sesi Presensi Telah Berakhir: Gerbang presensi hari ini telah ditutup (${todaySchedule.departureEnd} WIB).`;
        } else {
          gateClosedReason = `Presensi ditutup. Jam operasional presensi hari ini: Datang (${todaySchedule.arrivalStart} - ${todaySchedule.arrivalEnd || '12:00'}) • Pulang (${todaySchedule.departureStart || '13:00'} - ${todaySchedule.departureEnd || '17:00'}).`;
        }
      }

      const [allAtt, allStudents] = await Promise.all([
        getAllAttendance(),
        getAllStudents()
      ]);

      const studentMap = new Map<string, any>();
      for (const s of allStudents) {
        studentMap.set(s.id, s);
      }

      const todayAtt = allAtt.filter(a => getWIBDateString(new Date(a.timestamp)) === todayDateStr);
      todayAtt.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const history = todayAtt.slice(0, 50).map(a => {
        const s = studentMap.get(a.student_id) || {};
        return {
          record: {
            id: a.id,
            studentId: a.student_id,
            timestamp: a.timestamp,
            status: a.status,
            type: a.type
          },
          student: {
            id: s.id,
            name: s.name || 'Siswa',
            nisn: s.nisn || '',
            nis: s.nis || '',
            class: s.class || '',
            year: s.year || '',
            photo: s.photo || s.foto || ''
          }
        };
      });

      const totalScansToday = todayAtt.length;
      const uniqueStudentsToday = new Set(todayAtt.map(a => a.student_id)).size;

      return res.json({
        success: true,
        serverTime: getWIBISOString(),
        todayDate: todayDateStr,
        totalScansToday,
        uniqueStudentsToday,
        activeSession,
        isDayActive,
        gateClosedReason,
        schedule: todaySchedule,
        allSchedules: settings.schedule || {},
        isTestMode: Boolean(settings.is_test_mode || settings.isTestMode || false),
        settings: {
          judulAplikasi: settings.judulAplikasi || settings.judul_aplikasi || 'Sistem Presensi Siswa',
          websiteName: settings.websiteName || settings.nama_website || settings.school_name || settings.schoolName || 'Panel Admin SMK',
          nama_website: settings.websiteName || settings.nama_website || settings.school_name || settings.schoolName || 'Panel Admin SMK',
          school_name: settings.websiteName || settings.nama_website || settings.school_name || settings.schoolName || 'Panel Admin SMK',
          logoBase64: settings.logoBase64 || settings.logo || settings.logoUrl || '',
          logo: settings.logoBase64 || settings.logo || settings.logoUrl || '',
          logoUrl: settings.logoBase64 || settings.logo || settings.logoUrl || '',
          backgroundImage: settings.backgroundImage || settings.background_image || '',
          scannerThemePreset: settings.scannerThemePreset || 'indigo',
          scannerThemeColor: settings.scannerThemeColor || '',
          scannerBackgroundImage: settings.scannerBackgroundImage || '',
          scannerBoxBgColor: settings.scannerBoxBgColor || '#ffffff',
          scannerBoxOpacity: settings.scannerBoxOpacity !== undefined ? settings.scannerBoxOpacity : 96,
          scannerRunningText: settings.scannerRunningText || 'Selamat Datang di Portal Presensi Siswa • Silakan scan kartu barcode/QR Anda pada scanner USB • Tetap tertib & jaga kedisiplinan',
          schedule: settings.schedule || {},
          is_test_mode: Boolean(settings.is_test_mode || settings.isTestMode || false),
          isTestMode: Boolean(settings.is_test_mode || settings.isTestMode || false)
        },
        history
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // --- TEST SCAN / SIMULASI PRESENSI (DRY-RUN) ---
  const handleSimulatedScan = async (req: express.Request, res: express.Response) => {
    try {
      const { qrCode, type } = req.body;
      const cleanCode = String(qrCode || '').trim();
      const allStudents = await getAllStudents();
      const student = allStudents.find(s => 
        s.nisn === cleanCode || 
        s.qr_code === cleanCode || 
        s.id === cleanCode || 
        s.nis === cleanCode ||
        String(s.nisn).trim() === cleanCode
      );

      if (!student) {
        return res.status(404).json({
          success: false,
          error: `Siswa dengan barcode/NISN '${cleanCode}' tidak ditemukan di sistem`
        });
      }

      const detectedType = (type === 'ARRIVAL' || type === 'DEPARTURE') ? type : 'ARRIVAL';
      const nowIso = new Date().toISOString();

      // TIDAK ADA PENYIMPANAN KE DATABASE (PURE IN-MEMORY SIMULATION)
      res.json({
        success: true,
        simulated: true,
        isTestMode: true,
        message: `[UJI COBA] Presensi Terdeteksi: ${student.name} (${detectedType === 'DEPARTURE' ? 'Pulang' : 'Datang'}) - Tidak disimpan ke database`,
        student: {
          id: student.id,
          name: student.name,
          nisn: student.nisn,
          nis: student.nis,
          class: student.class,
          year: student.year,
          photo_url: (student as any).photo_url || (student as any).avatar || (student as any).foto || ''
        },
        record: {
          id: `sim-${Date.now()}`,
          timestamp: nowIso,
          status: 'PRESENT',
          type: detectedType,
          isTest: true
        }
      });
    } catch (e: any) {
      console.error('[TEST SCAN SIMULATE ERROR]', e);
      res.status(500).json({ success: false, error: e.message || 'Gagal simulasi scan' });
    }
  };

  app.post('/api/attendance/test-scan', handleSimulatedScan);
  app.post('/api/kiosk/simulate-scan', handleSimulatedScan);

  // --- ATTENDANCE SCAN ---
  app.post('/api/attendance/scan', async (req, res) => {
    try {
      const settings = await getSettings();
      const isTestMode = Boolean(settings?.is_test_mode ?? settings?.isTestMode ?? false);
      if (isTestMode) {
        // DOUBLE SAFEGUARD: Jika mode uji coba sedang aktif, alihkan ke simulasi in-memory
        return handleSimulatedScan(req, res);
      }

      const { qrCode, type } = req.body;
      const allStudents = await getAllStudents();
      const student = allStudents.find(s => 
        s.nisn === qrCode || 
        s.qr_code === qrCode || 
        s.id === qrCode || 
        s.nis === qrCode ||
        String(s.nisn).trim() === String(qrCode).trim()
      );
      
      if (!student) {
        return res.status(404).json({ error: 'Siswa tidak ditemukan' });
      }
      
      if (!settings || !settings.schedule) {
        return res.status(400).json({ error: 'Sistem pengaturan jadwal tidak ditemukan' });
      }

      const currentTimeStr = getWIBTimeString();
      const currentDayEn = getWIBDayNameEnglish();
      const currentDayIndo = getWIBDayName();

      const todaySchedule = settings.schedule?.[currentDayEn];

      const parseTimeToMinutes = (timeStr: string) => {
        if (!timeStr) return 0;
        const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/);
        if (!match) return 0;
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const modifier = match[3] ? match[3].toUpperCase() : null;

        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;

        return hours * 60 + minutes;
      };

      const arrivalStartMins = parseTimeToMinutes(todaySchedule?.arrivalStart || '');
      const arrivalEndMins = parseTimeToMinutes(todaySchedule?.arrivalEnd || settings.jam_masuk || '');
      const lateMinutes = parseTimeToMinutes(todaySchedule?.arrivalLate || '07:15');
      const depStartMins = parseTimeToMinutes(todaySchedule?.departureStart || settings.jam_pulang || '');
      const depEndMins = parseTimeToMinutes(todaySchedule?.departureEnd || '');

      // 1. VALIDASI HARI KERJA / SEKOLAH AKTIF
      const isDayActive = Boolean(
        todaySchedule && 
        (arrivalStartMins > 0 || depStartMins > 0) &&
        todaySchedule.enabled !== false
      );

      if (!isDayActive) {
        return res.status(403).json({
          success: false,
          code: 'OUT_OF_SCHEDULE',
          error: `Presensi Ditolak: Hari ini (${currentDayIndo}) adalah hari libur / di luar hari sekolah yang diizinkan.`
        });
      }

      // 2. VALIDASI RENTANG JAM SESI OPERASIONAL
      const currentMinutes = parseTimeToMinutes(currentTimeStr);

      const isBeforeArrival = arrivalStartMins > 0 && currentMinutes < arrivalStartMins;
      const isBetweenWindows = (arrivalEndMins > 0 && currentMinutes > arrivalEndMins) && (depStartMins > 0 && currentMinutes < depStartMins);
      const isAfterDeparture = depEndMins > 0 && currentMinutes > depEndMins;

      if (isBeforeArrival) {
        return res.status(403).json({
          success: false,
          code: 'OUT_OF_SCHEDULE',
          error: `Gerbang Presensi Belum Dibuka: Jam kedatangan hari ini baru dibuka pukul ${todaySchedule.arrivalStart} WIB.`
        });
      }
      if (isBetweenWindows) {
        return res.status(403).json({
          success: false,
          code: 'OUT_OF_SCHEDULE',
          error: `Sesi Presensi Telah Berakhir: Jam kedatangan telah ditutup (${todaySchedule.arrivalEnd || settings.jam_masuk || '12:00'} WIB) dan jam kepulangan baru dibuka pukul ${todaySchedule.departureStart || settings.jam_pulang || '13:00'} WIB.`
        });
      }
      if (isAfterDeparture) {
        return res.status(403).json({
          success: false,
          code: 'OUT_OF_SCHEDULE',
          error: `Sesi Presensi Telah Berakhir: Gerbang presensi hari ini telah ditutup (${todaySchedule.departureEnd} WIB).`
        });
      }

      const isInArrivalWindow = arrivalStartMins > 0 && arrivalEndMins > 0 && currentMinutes >= arrivalStartMins && currentMinutes <= arrivalEndMins;
      const isInDepartureWindow = depStartMins > 0 && depEndMins > 0 && currentMinutes >= depStartMins && currentMinutes <= depEndMins;

      if (!isInArrivalWindow && !isInDepartureWindow) {
        return res.status(403).json({
          success: false,
          code: 'OUT_OF_SCHEDULE',
          error: `Di Luar Jadwal Operasional: Waktu saat ini (${currentTimeStr} WIB) berada di luar jam operasional presensi resmi.`
        });
      }

      // Cek riwayat presensi siswa pada hari ini
      const todayDateStr = getWIBDateString();
      const allAtt = await getAllAttendance();
      const studentTodayAtt = allAtt.filter(a => 
        a.student_id === student.id && 
        getWIBDateString(new Date(a.timestamp)) === todayDateStr
      );
      const arrivalRecordToday = studentTodayAtt.find(a => a.type === 'ARRIVAL');
      const departureRecordToday = studentTodayAtt.find(a => a.type === 'DEPARTURE');
      const hasArrivalToday = Boolean(arrivalRecordToday);
      const hasDepartureToday = Boolean(departureRecordToday);

      // --- LOGIKA PENENTUAN SESI OTOMATIS (DATANG VS PULANG) ---
      let effectiveType: 'ARRIVAL' | 'DEPARTURE' = 'ARRIVAL';
      const isDuringDepartureWindow = depStartMins > 0 && currentMinutes >= depStartMins && currentMinutes <= depEndMins;

      if (isDuringDepartureWindow) {
        effectiveType = 'DEPARTURE';
      } else if (type === 'DEPARTURE') {
        effectiveType = 'DEPARTURE';
      } else {
        effectiveType = 'ARRIVAL';
      }

      let status: 'PRESENT' | 'LATE' = 'PRESENT';

      if (effectiveType === 'DEPARTURE') {
        if (hasDepartureToday) {
          const depTime = departureRecordToday?.timestamp ? getWIBTimeString(new Date(departureRecordToday.timestamp), true) : '';
          return res.status(400).json({ 
            error: `Siswa ${student.name} sudah tercatat presensi pulang hari ini${depTime ? ` (pukul ${depTime} WIB)` : ''}.` 
          });
        }
        status = 'PRESENT';
      } else {
        // Sesi ARRIVAL (Kedatangan)
        if (hasArrivalToday) {
          const arrTime = arrivalRecordToday?.timestamp ? getWIBTimeString(new Date(arrivalRecordToday.timestamp), true) : '';
          return res.status(400).json({ 
            error: `Siswa ${student.name} sudah tercatat presensi datang hari ini${arrTime ? ` (pukul ${arrTime} WIB)` : ''}.` 
          });
        }
        if (lateMinutes > 0 && currentMinutes > lateMinutes) {
          status = 'LATE';
        }
      }

      const rec = await recordAttendance({
        student_id: student.id,
        timestamp: getWIBISOString(),
        status,
        type: effectiveType
      });

      res.json({ 
        record: { id: rec.id, studentId: student.id, timestamp: rec.timestamp, status, type: effectiveType }, 
        student: { id: student.id, name: student.name, nisn: student.nisn, nis: student.nis, class: student.class, year: student.year, photo: student.photo || student.foto } 
      });
    } catch (e: any) { 
      console.error('[SCAN ERROR]', e); 
      res.status(500).json({ error: e.message || 'Terjadi kesalahan di server' }); 
    }
  });

  // --- KIOSK CLOCK CALIBRATION & HEARTBEAT ENDPOINT ---
  app.get('/api/time', (req, res) => {
    res.json({
      serverTime: new Date().toISOString(),
      serverTimeWIB: getWIBISOString(),
      timestamp: Date.now()
    });
  });

  // --- KIOSK OFFLINE CACHE: LIGHTWEIGHT STUDENT LIST ---
  app.get('/api/attendance/cached-students', async (req, res) => {
    try {
      const allStudents = await getAllStudents();
      const list = allStudents.map(s => ({
        id: s.id,
        name: s.name,
        nisn: s.nisn || '',
        nis: s.nis || '',
        qr_code: s.qr_code || s.nisn || '',
        class: s.class || '',
        year: s.year || ''
      }));
      res.json(list);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- KIOSK BATCH SYNC WITH IDEMPOTENCY & ANTI-DUPLICATION (Requirement 4) ---
  app.post('/api/attendance/sync-batch', async (req, res) => {
    try {
      const { records, terminalId } = req.body;
      if (!Array.isArray(records) || records.length === 0) {
        return res.json({ success: true, processedCount: 0, duplicateCount: 0, results: [] });
      }

      const allStudents = await getAllStudents();
      const allAtt = await getAllAttendance();
      const settings = await getSettings();

      const parseTimeToMinutes = (timeStr: string) => {
        if (!timeStr) return 0;
        const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/);
        if (!match) return 0;
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const modifier = match[3] ? match[3].toUpperCase() : null;
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
      };

      const results: any[] = [];
      let processedCount = 0;
      let duplicateCount = 0;

      for (const item of records) {
        const qrCode = String(item.barcode || item.qrCode || item.studentId || '').trim();
        const localId = item.id || item.localId;
        const targetType: 'ARRIVAL' | 'DEPARTURE' = item.type === 'DEPARTURE' ? 'DEPARTURE' : 'ARRIVAL';

        const student = allStudents.find(s =>
          s.nisn === qrCode ||
          s.qr_code === qrCode ||
          s.id === qrCode ||
          s.nis === qrCode ||
          String(s.nisn).trim() === qrCode
        );

        if (!student) {
          results.push({
            localId,
            success: false,
            error: 'Siswa tidak ditemukan di database server',
            barcode: qrCode
          });
          continue;
        }

        // Determine date of scan timestamp (calibrated)
        const scanDate = item.timestamp ? new Date(item.timestamp) : new Date();
        const dateStr = getWIBDateString(scanDate);

        // Idempotency check: Student ID + Date String + Type (Requirement 4a)
        const existingRecord = allAtt.find(a =>
          a.student_id === student.id &&
          a.type === targetType &&
          getWIBDateString(new Date(a.timestamp)) === dateStr
        );

        if (existingRecord) {
          // Gracefully ignore duplicate without interrupting other batch records (Requirement 4b)
          duplicateCount++;
          results.push({
            localId,
            success: true,
            status: 'duplicate_ignored',
            message: `Sudah tercatat presensi ${targetType === 'DEPARTURE' ? 'pulang' : 'datang'} pada tanggal ${dateStr}`,
            studentId: student.id,
            recordId: existingRecord.id
          });
          continue;
        }

        // Calculate schedule for the scan date / day to determine active day and late status accurately
        const dayEn = getWIBDayNameEnglish(scanDate);
        const dayIndo = getWIBDayName(scanDate);
        const daySchedule = settings?.schedule?.[dayEn];
        const isDayActive = Boolean(
          daySchedule &&
          (daySchedule.arrivalStart || daySchedule.departureStart) &&
          daySchedule.enabled !== false
        );

        if (!isDayActive) {
          results.push({
            localId,
            success: false,
            status: 'out_of_schedule_rejected',
            error: `Presensi Ditolak: Tanggal scan (${dateStr}, ${dayIndo}) adalah hari libur / di luar hari sekolah aktif.`,
            studentId: student.id
          });
          continue;
        }

        const scanTimeStr = getWIBTimeString(scanDate);
        const scanMins = parseTimeToMinutes(scanTimeStr);
        const arrStartMins = parseTimeToMinutes(daySchedule.arrivalStart || '');
        const arrEndMins = parseTimeToMinutes(daySchedule.arrivalEnd || settings?.jam_masuk || '');
        const depStartMins = parseTimeToMinutes(daySchedule.departureStart || settings?.jam_pulang || '');
        const depEndMins = parseTimeToMinutes(daySchedule.departureEnd || '');

        const isInArr = arrStartMins > 0 && arrEndMins > 0 && scanMins >= arrStartMins && scanMins <= arrEndMins;
        const isInDep = depStartMins > 0 && depEndMins > 0 && scanMins >= depStartMins && scanMins <= depEndMins;

        if (!isInArr && !isInDep) {
          results.push({
            localId,
            success: false,
            status: 'out_of_schedule_rejected',
            error: `Presensi Ditolak: Waktu scan (${scanTimeStr} WIB) berada di luar jam operasional presensi resmi.`,
            studentId: student.id
          });
          continue;
        }

        const lateMins = parseTimeToMinutes(daySchedule.arrivalLate || '07:15');

        let status: 'PRESENT' | 'LATE' = 'PRESENT';
        if (targetType === 'ARRIVAL' && lateMins > 0 && scanMins > lateMins) {
          status = 'LATE';
        }

        const timestampStr = scanDate.toISOString();
        const newRecord = await recordAttendance({
          student_id: student.id,
          timestamp: timestampStr,
          status,
          type: targetType
        });

        // Add to in-memory array to prevent intra-batch duplicate
        allAtt.push(newRecord);
        processedCount++;

        results.push({
          localId,
          success: true,
          status: 'processed',
          recordId: newRecord.id,
          studentId: student.id,
          studentName: student.name,
          timestamp: timestampStr,
          attendanceStatus: status,
          type: targetType
        });
      }

      res.json({
        success: true,
        terminalId: terminalId || 'KIOSK-DIETPI',
        processedCount,
        duplicateCount,
        totalSubmitted: records.length,
        results
      });
    } catch (e: any) {
      console.error('[SYNC BATCH ERROR]', e);
      res.status(500).json({ success: false, error: e.message || 'Gagal sinkronisasi batch' });
    }
  });

  // --- ACTIVE KIOSK SSE CLIENT CONNECTIONS MAP (Mapped by persistent terminal_id, NOT IP) ---
  const activeKioskClients = new Map<string, express.Response>();

  // Broadcast real-time configuration update to all connected Kiosk Portal Scanners
  const broadcastKioskConfigUpdate = async (customSettings?: any) => {
    try {
      const st = customSettings ? { ...(await getSettings()), ...customSettings } : await getSettings();
      const currentDay = getWIBDayNameEnglish();
      const currentDayIndo = getWIBDayName();
      const todaySchedule = st?.schedule?.[currentDay] || null;
      const isDayActive = Boolean(
        todaySchedule &&
        (todaySchedule.arrivalStart || todaySchedule.departureStart) &&
        todaySchedule.enabled !== false
      );

      const isTestMode = Boolean(st?.is_test_mode ?? st?.isTestMode ?? false);

      const eventPayload = {
        type: 'COMMAND',
        command: 'CONFIG_UPDATE',
        payload: {
          settings: {
            judulAplikasi: st?.judulAplikasi || st?.judul_aplikasi || 'Sistem Presensi Siswa',
            websiteName: st?.websiteName || st?.nama_website || st?.school_name || st?.schoolName || 'Panel Admin SMK',
            nama_website: st?.websiteName || st?.nama_website || st?.school_name || st?.schoolName || 'Panel Admin SMK',
            school_name: st?.websiteName || st?.nama_website || st?.school_name || st?.schoolName || 'Panel Admin SMK',
            logoBase64: st?.logoBase64 || st?.logo || st?.logoUrl || '',
            logo: st?.logoBase64 || st?.logo || st?.logoUrl || '',
            logoUrl: st?.logoBase64 || st?.logo || st?.logoUrl || '',
            backgroundImage: st?.backgroundImage || st?.background_image || '',
            scannerThemePreset: st?.scannerThemePreset || 'indigo',
            scannerThemeColor: st?.scannerThemeColor || '',
            scannerBackgroundImage: st?.scannerBackgroundImage || '',
            scannerBoxBgColor: st?.scannerBoxBgColor || '#ffffff',
            scannerBoxOpacity: st?.scannerBoxOpacity !== undefined ? st?.scannerBoxOpacity : 96,
            scannerRunningText: st?.scannerRunningText || 'Selamat Datang di Portal Presensi Siswa • Silakan scan kartu barcode/QR Anda pada scanner USB • Tetap tertib & jaga kedisiplinan',
            schedule: st?.schedule,
            is_test_mode: isTestMode,
            isTestMode: isTestMode
          },
          schedule: todaySchedule,
          isDayActive,
          todayDay: currentDay,
          todayDayIndo: currentDayIndo,
          is_test_mode: isTestMode,
          isTestMode: isTestMode,
          timestamp: new Date().toISOString()
        },
        issuedAt: new Date().toISOString()
      };

      const testModePayload = {
        type: 'COMMAND',
        command: 'SET_TEST_MODE',
        payload: {
          isTestMode: isTestMode,
          is_test_mode: isTestMode,
          timestamp: new Date().toISOString()
        },
        issuedAt: new Date().toISOString()
      };

      for (const [tId, clientRes] of activeKioskClients.entries()) {
        try {
          clientRes.write(`data: ${JSON.stringify(eventPayload)}\n\n`);
          clientRes.write(`data: ${JSON.stringify(testModePayload)}\n\n`);
        } catch (e) {
          activeKioskClients.delete(tId);
        }
      }
    } catch (e) {
      console.warn('[SSE BROADCAST ERROR]', e);
    }
  };

  // --- KIOSK MONITORING & HEARTBEAT ENDPOINTS ---
  app.post('/api/kiosk/heartbeat', async (req, res) => {
    try {
      const { terminalId, terminal_id, name, clockOffsetMs, clock_offset, pendingCount, antrean_lokal, appVersion, current_ip, ipAddress } = req.body;
      const detectedIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
      const resolvedIp = current_ip || ipAddress || (Array.isArray(detectedIp) ? detectedIp[0] : String(detectedIp)) || '';
      const userAgent = req.headers['user-agent'] || '';

      const effectiveTerminalId = (terminal_id || terminalId || 'KIOSK-POS-DEFAULT').trim().toUpperCase();

      const terminal = await upsertKioskHeartbeat({
        terminal_id: effectiveTerminalId,
        name,
        current_ip: resolvedIp,
        userAgent: String(userAgent),
        clock_offset: clock_offset !== undefined ? clock_offset : clockOffsetMs,
        antrean_lokal: antrean_lokal !== undefined ? antrean_lokal : pendingCount,
        appVersion
      });

      res.json({
        success: true,
        terminal,
        serverTime: new Date().toISOString(),
        isSseConnected: activeKioskClients.has(effectiveTerminalId)
      });
    } catch (e: any) {
      console.error('[KIOSK HEARTBEAT ERROR]', e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // --- 3. KONEKSI OUTBOUND PERSISTEN & REMOTE COMMAND VIA SSE ---
  // Peramban Kiosk menginisiasi koneksi SSE persistent ke server berdasarkan terminal_id
  app.get('/api/kiosk/events', async (req, res) => {
    const rawTerminalId = req.query.terminalId || req.query.terminal_id;
    if (!rawTerminalId) {
      return res.status(400).send('Query parameter terminalId diperlukan');
    }

    const terminalId = String(rawTerminalId).trim().toUpperCase();

    // Set headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // Map connection by persistent terminal_id (bukan IP address)
    activeKioskClients.set(terminalId, res);

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    // Record last seen & status
    upsertKioskHeartbeat({
      terminal_id: terminalId,
      current_ip: Array.isArray(clientIp) ? clientIp[0] : String(clientIp),
      userAgent: String(userAgent)
    }).catch(() => {});

    // Initial connection acknowledgement
    const currentSettings = await getSettings();
    const currentLocal = getLocalSettings();
    const currentTestMode = Boolean(currentSettings?.is_test_mode ?? currentLocal?.is_test_mode ?? false);

    res.write(`data: ${JSON.stringify({
      type: 'CONNECTED',
      terminalId,
      message: 'Koneksi persistent Kiosk SSE berhasil terhubung',
      isTestMode: currentTestMode,
      is_test_mode: currentTestMode,
      timestamp: new Date().toISOString()
    })}\n\n`);

    // Keepalive ping comment every 15 seconds
    const pingInterval = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch (e) {
        clearInterval(pingInterval);
        activeKioskClients.delete(terminalId);
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(pingInterval);
      activeKioskClients.delete(terminalId);
      console.log(`[SSE DISCONNECT] Kiosk client ${terminalId} terputus`);
    });
  });

  // Remote command endpoint (Admin mengirim perintah jarak jauh ke Kiosk)
  app.post('/api/kiosk/command', async (req, res) => {
    try {
      const { terminalId, command, payload } = req.body;
      const validCommands = ['FORCE_SYNC', 'RELOAD_PAGE', 'CONFIG_UPDATE', 'EXTERNAL_SCAN', 'SET_TEST_MODE'];

      if (!command || !validCommands.includes(command)) {
        return res.status(400).json({
          success: false,
          error: `Perintah '${command}' tidak valid. Pilihan yang didukung: ${validCommands.join(', ')}`
        });
      }

      const targetId = terminalId ? String(terminalId).trim().toUpperCase() : 'ALL';
      let sentCount = 0;

      let cmdPayload = payload || {};
      if (command === 'CONFIG_UPDATE' && (!payload || Object.keys(payload).length === 0)) {
        try {
          const st = await getSettings();
          const currentDay = getWIBDayNameEnglish();
          cmdPayload = {
            settings: st,
            schedule: st?.schedule?.[currentDay] || st?.schedule?.['Monday'] || st?.schedule
          };
        } catch (e) {}
      }

      const eventPayload = {
        type: 'COMMAND',
        command,
        payload: cmdPayload,
        issuedAt: new Date().toISOString()
      };

      if (targetId === 'ALL') {
        // Broadcast to all active SSE kiosks
        for (const [tId, clientRes] of activeKioskClients.entries()) {
          try {
            clientRes.write(`data: ${JSON.stringify(eventPayload)}\n\n`);
            recordKioskCommandExecution(tId, command).catch(() => {});
            sentCount++;
          } catch (e) {
            activeKioskClients.delete(tId);
          }
        }
        return res.json({
          success: true,
          broadcast: true,
          sentCount,
          totalActiveSockets: activeKioskClients.size,
          command
        });
      }

      // Send to specific terminal
      recordKioskCommandExecution(targetId, command).catch(() => {});
      const targetClient = activeKioskClients.get(targetId);

      if (targetClient) {
        targetClient.write(`data: ${JSON.stringify(eventPayload)}\n\n`);
        return res.json({
          success: true,
          delivered: true,
          terminalId: targetId,
          command,
          message: `Perintah '${command}' berhasil dikirim langsung ke terminal ${targetId}`
        });
      } else {
        return res.json({
          success: true,
          delivered: false,
          terminalId: targetId,
          command,
          message: `Terminal ${targetId} saat ini sedang offline dari koneksi SSE. Perintah telah dicatat.`
        });
      }
    } catch (e: any) {
      console.error('[KIOSK COMMAND ERROR]', e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // --- 3c. LIGHTWEIGHT LOCAL API ENDPOINT FOR WIRELESS / IOT / ESP32 SCANNER EVENT ---
  const handleExternalScanEvent = async (req: express.Request, res: express.Response) => {
    try {
      const { barcode, qrCode, code, type, channel, channelName, terminalId, port } = req.body;
      const scanCode = String(barcode || qrCode || code || '').trim();
      if (!scanCode || scanCode.length < 2) {
        return res.status(400).json({ success: false, error: 'Parameter barcode atau qrCode diperlukan' });
      }

      const channelLabel = channelName || channel || (port ? `Serial Bridge (${port})` : 'Network IoT / Wi-Fi Scanner');
      const eventPayload = {
        type: 'COMMAND',
        command: 'EXTERNAL_SCAN',
        payload: {
          barcode: scanCode,
          qrCode: scanCode,
          channel: channelLabel,
          channelId: 'scanner_network',
          type: type || null,
          terminalId: terminalId || 'ALL',
          receivedAt: new Date().toISOString()
        },
        issuedAt: new Date().toISOString()
      };

      let deliveredCount = 0;
      const targetTerminal = terminalId ? String(terminalId).trim().toUpperCase() : 'ALL';

      if (targetTerminal === 'ALL') {
        for (const [tId, clientRes] of activeKioskClients.entries()) {
          try {
            clientRes.write(`data: ${JSON.stringify(eventPayload)}\n\n`);
            deliveredCount++;
          } catch (e) {
            activeKioskClients.delete(tId);
          }
        }
      } else {
        const clientRes = activeKioskClients.get(targetTerminal);
        if (clientRes) {
          try {
            clientRes.write(`data: ${JSON.stringify(eventPayload)}\n\n`);
            deliveredCount++;
          } catch (e) {
            activeKioskClients.delete(targetTerminal);
          }
        }
      }

      res.json({
        success: true,
        message: 'Scan event berhasil disalurkan ke Portal Scanner',
        barcode: scanCode,
        channel: channelLabel,
        deliveredCount,
        activeKiosks: activeKioskClients.size
      });
    } catch (e: any) {
      console.error('[EXTERNAL SCAN EVENT ERROR]', e);
      res.status(500).json({ success: false, error: e.message || 'Gagal memproses event scan' });
    }
  };

  app.post('/api/scan-event', handleExternalScanEvent);
  app.post('/api/attendance/scan-event', handleExternalScanEvent);

  app.get('/api/kiosk/terminals', async (req, res) => {
    try {
      const terminals = await getAllKioskTerminals();
      const enriched = terminals.map(t => ({
        ...t,
        is_sse_connected: activeKioskClients.has(t.terminal_id)
      }));

      res.json({
        success: true,
        data: enriched,
        activeSseCount: activeKioskClients.size,
        timestamp: new Date().toISOString()
      });
    } catch (e: any) {
      console.error('[GET KIOSK TERMINALS ERROR]', e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.put('/api/kiosk/terminals/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      await updateKioskTerminalName(id, name || '');
      res.json({ success: true, message: 'Nama pos terminal berhasil diperbarui' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete('/api/kiosk/terminals/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await deleteKioskTerminal(id);
      activeKioskClients.delete(id.trim().toUpperCase());
      res.json({ success: true, message: 'Terminal berhasil dihapus' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // --- KIOSK TEST MODE / DRY-RUN ENDPOINTS ---
  app.get('/api/kiosk/test-mode', async (req, res) => {
    try {
      const st = await getSettings();
      const local = getLocalSettings();
      const isTestMode = Boolean(st?.is_test_mode ?? local?.is_test_mode ?? false);
      res.json({ success: true, isTestMode, is_test_mode: isTestMode });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/kiosk/test-mode', async (req, res) => {
    try {
      const isTestMode = Boolean(req.body.isTestMode ?? req.body.is_test_mode);

      // 1. Simpan ke database jika tabel dan kolom tersedia
      try {
        await safeDbQuery('ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS is_test_mode BOOLEAN DEFAULT FALSE');
        await safeDbQuery('UPDATE pengaturan SET is_test_mode = $1 WHERE id = 1', [isTestMode]);
      } catch (err) {}

      // 2. Simpan ke pengaturan lokal
      saveLocalSettings({ is_test_mode: isTestMode, isTestMode });
      try {
        await updateSettings({ is_test_mode: isTestMode, isTestMode });
      } catch (e) {}

      // 3. Siarkan perubahan secara real-time via SSE ke seluruh terminal Kiosk Portal Scanner
      await broadcastKioskConfigUpdate({ is_test_mode: isTestMode, isTestMode });

      res.json({
        success: true,
        isTestMode,
        is_test_mode: isTestMode,
        message: isTestMode
          ? 'Mode Uji Coba Scanner (Dry-Run) berhasil DIAKTIFKAN. Seluruh terminal Kiosk kini dalam mode simulasi.'
          : 'Mode Uji Coba Scanner berhasil DINONAKTIFKAN. Seluruh terminal Kiosk kembali ke mode operasional presensi normal.',
        activeKiosks: activeKioskClients.size
      });
    } catch (e: any) {
      console.error('[SET TEST MODE ERROR]', e);
      res.status(500).json({ success: false, error: e.message || 'Gagal mengubah mode uji coba' });
    }
  });

  // --- FAILSAFE EMERGENCY BACKUP IMPORT ENDPOINT ---
  app.post('/api/kiosk/import-emergency', async (req, res) => {
    try {
      const { records, terminalId, rawText } = req.body;
      let itemsToProcess: any[] = [];

      if (Array.isArray(records) && records.length > 0) {
        itemsToProcess = records;
      } else if (typeof rawText === 'string' && rawText.trim()) {
        const trimmed = rawText.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            itemsToProcess = parsed;
          } else if (parsed && Array.isArray(parsed.records)) {
            itemsToProcess = parsed.records;
          }
        } else {
          // Parse CSV
          const lines = trimmed.split(/\r?\n/).filter(l => l.trim().length > 0);
          if (lines.length > 1) {
            const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
            for (let i = 1; i < lines.length; i++) {
              const rowValues = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
              const rowObj: Record<string, string> = {};
              header.forEach((h, idx) => {
                rowObj[h] = rowValues[idx] || '';
              });
              itemsToProcess.push(rowObj);
            }
          }
        }
      }

      if (itemsToProcess.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Tidak ada rekaman data presensi yang valid ditemukan dalam berkas yang diunggah'
        });
      }

      const result = await importEmergencyAttendance(itemsToProcess, terminalId);
      res.json(result);
    } catch (e: any) {
      console.error('[IMPORT EMERGENCY ERROR]', e);
      res.status(500).json({ success: false, error: e.message || 'Gagal memproses berkas cadangan presensi' });
    }
  });

  // --- ADMIN IMPERSONATE ENDPOINT ---
  app.post('/api/admin/impersonate', async (req, res) => {
    try {
      const { targetRole } = req.body;
      const cleanRole = String(targetRole || '').toUpperCase();
      const currentDay = getWIBDayName();

      let userObj: any = null;
      let redirectUrl = '/guru/portal';

      if (cleanRole === 'PIKET' || cleanRole === 'GURU_PIKET' || cleanRole === 'PORTAL_PIKET') {
        userObj = {
          name: 'Guru Piket (Pratinjau)',
          nip: '198205052008011002',
          username: 'piket_preview',
          day: currentDay,
          role: 'PIKET',
          keterangan: 'Guru Piket Hari Ini',
          isPreview: true
        };
        redirectUrl = '/piket/dashboard';
      } else if (cleanRole === 'KEPALA_SEKOLAH') {
        userObj = {
          id: 'preview-kepsek',
          name: 'Dr. H. Kepala Sekolah, M.Pd.',
          nip: '197001011995011001',
          username: 'kepsek_preview',
          role: 'KEPALA_SEKOLAH',
          subject: 'Kepala Sekolah',
          class: '',
          isPreview: true
        };
        redirectUrl = '/guru/portal';
      } else if (cleanRole === 'WAKIL_KURIKULUM') {
        userObj = {
          id: 'preview-kurikulum',
          name: 'Waka Kurikulum, S.Pd., M.Kom.',
          nip: '197505052000031002',
          username: 'kurikulum_preview',
          role: 'WAKIL_KURIKULUM',
          subject: 'Informatika',
          class: '',
          isPreview: true
        };
        redirectUrl = '/guru/portal';
      } else if (cleanRole === 'WAKIL_KESISWAAN') {
        userObj = {
          id: 'preview-kesiswaan',
          name: 'Waka Kesiswaan, S.Pd.',
          nip: '198202022005011003',
          username: 'kesiswaan_preview',
          role: 'WAKIL_KESISWAAN',
          subject: 'Pendidikan Jasmani',
          class: '',
          isPreview: true
        };
        redirectUrl = '/guru/portal';
      } else if (cleanRole === 'GURU_BK') {
        userObj = {
          id: 'preview-bk',
          name: 'Guru BK, S.Psi., M.Pd.',
          nip: '198503032008012004',
          username: 'bk_preview',
          role: 'GURU_BK',
          subject: 'Bimbingan Konseling',
          class: '',
          isPreview: true
        };
        redirectUrl = '/guru/portal';
      } else if (cleanRole === 'WALI_KELAS') {
        userObj = {
          id: 'preview-wali',
          name: 'Wali Kelas X RPL 1, S.Kom.',
          nip: '198804042010011005',
          username: 'walikelas_preview',
          role: 'WALI_KELAS',
          subject: 'Pemrograman Web',
          class: 'X RPL 1',
          isPreview: true
        };
        redirectUrl = '/guru/portal';
      } else if (cleanRole === 'GURU' || cleanRole === 'GURU_MAPEL') {
        userObj = {
          id: 'preview-guru',
          name: 'Guru Mapel Bahasa Indonesia, S.Pd.',
          nip: '199005052015011006',
          username: 'guru_preview',
          role: 'GURU',
          subject: 'Bahasa Indonesia',
          class: '',
          isPreview: true
        };
        redirectUrl = '/guru/portal';
      } else if (cleanRole === 'SISWA') {
        userObj = {
          id: 'preview-siswa',
          name: 'Ahmad Siswa Pratinjau',
          nisn: '0081234567',
          nis: '23241001',
          class: 'X RPL 1',
          year: '2024/2025',
          role: 'SISWA',
          isPreview: true
        };
        redirectUrl = '/siswa';
      } else {
        userObj = {
          id: 'preview-user',
          name: req.body.targetName || `Pratinjau (${cleanRole})`,
          role: cleanRole,
          isPreview: true
        };
      }

      if (req.body.targetName) userObj.name = req.body.targetName;
      if (req.body.targetClass) userObj.class = req.body.targetClass;
      if (req.body.targetSubject) userObj.subject = req.body.targetSubject;

      const token = generateToken({
        id: userObj.id || 'preview-user',
        username: userObj.username || 'preview_user',
        role: userObj.role,
        name: userObj.name,
        class: userObj.class
      });

      res.json({
        success: true,
        role: userObj.role,
        user: userObj,
        token,
        redirectUrl
      });
    } catch (e: any) {
      console.error('Error in /api/admin/impersonate:', e);
      res.status(500).json({ success: false, error: e.message || 'Gagal memulai impersonasi' });
    }
  });

   
  // --- SETTINGS ---
  app.get('/api/settings', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM pengaturan WHERE id = 1');
      if (result.rows.length > 0) {
        const row = result.rows[0];
        const local = getLocalSettings();
        const rowData = row.data || {};
        const merged = {
          ...local,
          ...rowData,
          websiteName: row.nama_website || rowData.websiteName || local.websiteName || 'Panel Admin SMK',
          judulAplikasi: row.judul_aplikasi || rowData.judulAplikasi || local.judulAplikasi || 'Sistem Presensi Siswa',
          judul_aplikasi: row.judul_aplikasi || rowData.judulAplikasi || local.judulAplikasi || 'Sistem Presensi Siswa',
          judulPiket: row.judul_piket || rowData.judulPiket || local.judulPiket || 'Portal Guru Piket & Perizinan',
          judul_piket: row.judul_piket || rowData.judulPiket || local.judulPiket || 'Portal Guru Piket & Perizinan',
          judulGuruPortal: row.judul_guru_portal || rowData.judulGuruPortal || local.judulGuruPortal || 'Akses Data Guru',
          judul_guru_portal: row.judul_guru_portal || rowData.judul_guru_portal || local.judul_guru_portal || 'Akses Data Guru',
          subjudulGuruPortal: row.subjudul_guru_portal || rowData.subjudulGuruPortal || local.subjudulGuruPortal || 'Portal Kehadiran, Piket & Akun Guru',
          subjudul_guru_portal: row.subjudul_guru_portal || rowData.subjudul_guru_portal || local.subjudul_guru_portal || 'Portal Kehadiran, Piket & Akun Guru',
          logoBase64: row.logo || rowData.logoBase64 || local.logoBase64 || '',
          backgroundImage: row.background_image || rowData.backgroundImage || rowData.background_image || local.backgroundImage || '',
          background_image: row.background_image || rowData.backgroundImage || rowData.background_image || local.backgroundImage || '',
          themePreset: row.theme_preset || rowData.themePreset || rowData.theme_preset || local.themePreset || 'indigo',
          theme_preset: row.theme_preset || rowData.themePreset || rowData.theme_preset || local.themePreset || 'indigo',
          faviconBase64: row.favicon || rowData.faviconBase64 || local.faviconBase64 || '',
          globalArrivalMax: row.jam_masuk || rowData.globalArrivalMax || local.globalArrivalMax || '12:00',
          globalDepartureMin: row.jam_pulang || rowData.globalDepartureMin || local.globalDepartureMin || '13:00',
          scannerType: row.scanner_type || rowData.scannerType || local.scannerType || 'external',
          barcodeType: row.barcode_type || rowData.barcodeType || local.barcodeType || 'qrcode',
          suaraSukses: row.suara_sukses || rowData.suaraSukses || local.suaraSukses || 'default1',
          suaraGagal: row.suara_gagal || rowData.suaraGagal || local.suaraGagal || 'default2',
          fileSuaraSukses: row.file_suara_sukses || rowData.fileSuaraSukses || local.fileSuaraSukses || '',
          fileSuaraGagal: row.file_suara_gagal || rowData.fileSuaraGagal || local.fileSuaraGagal || '',
          scannerRunningText: row.scanner_running_text || rowData.scannerRunningText || rowData.scanner_running_text || local.scannerRunningText || 'Selamat Datang di Portal Presensi Siswa • Silakan scan kartu barcode/QR Anda pada scanner USB • Tetap tertib & jaga kedisiplinan',
          scannerThemePreset: row.scanner_theme_preset || rowData.scannerThemePreset || rowData.scanner_theme_preset || local.scannerThemePreset || 'indigo',
          scannerThemeColor: row.scanner_theme_color || rowData.scannerThemeColor || rowData.scanner_theme_color || local.scannerThemeColor || '',
          scannerBackgroundImage: row.scanner_background_image || rowData.scannerBackgroundImage || rowData.scanner_background_image || local.scannerBackgroundImage || '',
          scannerBoxBgColor: row.scanner_box_color || rowData.scannerBoxBgColor || rowData.scanner_box_color || local.scannerBoxBgColor || '#ffffff',
          scannerBoxOpacity: row.scanner_box_opacity !== undefined && row.scanner_box_opacity !== null ? Number(row.scanner_box_opacity) : rowData.scannerBoxOpacity !== undefined ? Number(rowData.scannerBoxOpacity) : local.scannerBoxOpacity !== undefined ? Number(local.scannerBoxOpacity) : 96,
          waMode: row.wa_mode || rowData.waMode || rowData.wa_mode || local.waMode || 'manual',
          wa_mode: row.wa_mode || rowData.waMode || rowData.wa_mode || local.waMode || 'manual',
          waTarget: row.wa_target || rowData.waTarget || rowData.wa_target || local.waTarget || 'both',
          wa_target: row.wa_target || rowData.waTarget || rowData.wa_target || local.waTarget || 'both',
          waProvider: row.wa_provider || rowData.waProvider || rowData.wa_provider || local.waProvider || (row.wa_api_url?.includes('wablas') ? 'wablas' : row.wa_api_url?.includes('starsender') ? 'starsender' : 'fonnte'),
          wa_provider: row.wa_provider || rowData.waProvider || rowData.wa_provider || local.waProvider || (row.wa_api_url?.includes('wablas') ? 'wablas' : row.wa_api_url?.includes('starsender') ? 'starsender' : 'fonnte'),
          waApiUrl: row.wa_api_url || rowData.waApiUrl || rowData.wa_api_url || local.waApiUrl || 'https://api.fonnte.com/send',
          wa_api_url: row.wa_api_url || rowData.waApiUrl || rowData.wa_api_url || local.waApiUrl || 'https://api.fonnte.com/send',
          waApiKey: row.wa_api_key || rowData.waApiKey || rowData.wa_api_key || local.waApiKey || '',
          wa_api_key: row.wa_api_key || rowData.waApiKey || rowData.wa_api_key || local.waApiKey || '',
          waApiSecret: row.wa_api_secret || rowData.waApiSecret || rowData.wa_api_secret || local.waApiSecret || '',
          wa_api_secret: row.wa_api_secret || rowData.waApiSecret || rowData.wa_api_secret || local.waApiSecret || '',
          waGroupId: row.wa_group_id || rowData.waGroupId || rowData.wa_group_id || local.waGroupId || '',
          wa_group_id: row.wa_group_id || rowData.waGroupId || rowData.wa_group_id || local.waGroupId || '',
          waGroupName: row.wa_group_name || rowData.waGroupName || rowData.wa_group_name || local.waGroupName || 'Grup Presensi SMK',
          wa_group_name: row.wa_group_name || rowData.waGroupName || rowData.wa_group_name || local.waGroupName || 'Grup Presensi SMK',
          waGroups: rowData.waGroups || rowData.wa_groups || local.waGroups || [],
          wa_groups: rowData.waGroups || rowData.wa_groups || local.waGroups || [],
          waCronTime: row.wa_cron_time || rowData.waCronTime || rowData.wa_cron_time || local.waCronTime || '15:00',
          wa_cron_time: row.wa_cron_time || rowData.waCronTime || rowData.wa_cron_time || local.waCronTime || '15:00',
          waCronDays: row.wa_cron_days ? (typeof row.wa_cron_days === 'string' ? JSON.parse(row.wa_cron_days) : row.wa_cron_days) : (rowData.waCronDays || local.waCronDays || ['1', '2', '3', '4', '5']),
          wa_cron_days: row.wa_cron_days ? (typeof row.wa_cron_days === 'string' ? JSON.parse(row.wa_cron_days) : row.wa_cron_days) : (rowData.waCronDays || local.waCronDays || ['1', '2', '3', '4', '5']),
          headmasterName: row.headmaster_name || row.kepala_sekolah_nama || rowData.headmasterName || rowData.headmaster_name || rowData.kepala_sekolah_nama || local.headmasterName || '',
          headmaster_name: row.headmaster_name || row.kepala_sekolah_nama || rowData.headmasterName || rowData.headmaster_name || rowData.kepala_sekolah_nama || local.headmasterName || '',
          headmasterNip: row.headmaster_nip || row.kepala_sekolah_nip || rowData.headmasterNip || rowData.headmaster_nip || rowData.kepala_sekolah_nip || local.headmasterNip || '',
          headmaster_nip: row.headmaster_nip || row.kepala_sekolah_nip || rowData.headmasterNip || rowData.headmaster_nip || rowData.kepala_sekolah_nip || local.headmasterNip || '',
          headmasterWhatsapp: row.headmaster_whatsapp || row.kepala_sekolah_whatsapp || rowData.headmasterWhatsapp || rowData.headmaster_whatsapp || rowData.kepala_sekolah_whatsapp || local.headmasterWhatsapp || local.headmaster_whatsapp || '',
          headmaster_whatsapp: row.headmaster_whatsapp || row.kepala_sekolah_whatsapp || rowData.headmasterWhatsapp || rowData.headmaster_whatsapp || rowData.kepala_sekolah_whatsapp || local.headmasterWhatsapp || local.headmaster_whatsapp || '',
          kepala_sekolah_nama: row.headmaster_name || row.kepala_sekolah_nama || rowData.headmasterName || rowData.headmaster_name || rowData.kepala_sekolah_nama || local.headmasterName || '',
          kepala_sekolah_nip: row.headmaster_nip || row.kepala_sekolah_nip || rowData.headmasterNip || rowData.headmaster_nip || rowData.kepala_sekolah_nip || local.headmasterNip || '',
          kepala_sekolah_whatsapp: row.headmaster_whatsapp || row.kepala_sekolah_whatsapp || rowData.headmasterWhatsapp || rowData.headmaster_whatsapp || rowData.kepala_sekolah_whatsapp || local.headmasterWhatsapp || local.headmaster_whatsapp || '',
          schedule: rowData.schedule || local.schedule,
          studentCustomFields: rowData.studentCustomFields || local.studentCustomFields || []
        };
        saveLocalSettings(merged);
        res.json(merged);
      } else {
        res.json(getLocalSettings());
      }
    } catch (e) {
      res.json(getLocalSettings());
    }
  });

  app.post('/api/settings', async (req, res) => {
    const settingsData = req.body;
    const localMerged = saveLocalSettings(settingsData);

    try {
      // 1. Ensure columns exist in DB
      const columnsToEnsure = [
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS judul_aplikasi VARCHAR(255) DEFAULT 'Sistem Presensi Siswa'",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS judul_piket VARCHAR(255) DEFAULT 'Portal Guru Piket & Perizinan'",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS judul_guru_portal VARCHAR(255) DEFAULT 'Akses Data Guru'",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS subjudul_guru_portal VARCHAR(255) DEFAULT 'Portal Kehadiran, Piket & Akun Guru'",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS headmaster_name VARCHAR(255) DEFAULT ''",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS headmaster_nip VARCHAR(100) DEFAULT ''",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS headmaster_whatsapp VARCHAR(50) DEFAULT ''",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS kepala_sekolah_nama VARCHAR(255) DEFAULT ''",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS kepala_sekolah_nip VARCHAR(100) DEFAULT ''",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS kepala_sekolah_whatsapp VARCHAR(50) DEFAULT ''",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS wa_mode VARCHAR(50) DEFAULT 'manual'",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS wa_target VARCHAR(50) DEFAULT 'both'",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS wa_provider VARCHAR(50) DEFAULT 'fonnte'",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS wa_endpoint TEXT",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS wa_api_url TEXT DEFAULT 'https://api.fonnte.com/send'",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS wa_api_key TEXT DEFAULT ''",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS wa_api_secret TEXT DEFAULT ''",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS wa_sender_phone VARCHAR(50) DEFAULT ''",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS wa_group_id VARCHAR(255) DEFAULT ''",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS wa_group_name VARCHAR(255) DEFAULT 'Grup Presensi SMK'",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS wa_schedule_time VARCHAR(50) DEFAULT '15:00'",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS wa_cron_time VARCHAR(50) DEFAULT '15:00'",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS wa_schedule_days JSONB DEFAULT '[\"1\",\"2\",\"3\",\"4\",\"5\"]'::jsonb",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS wa_cron_days JSONB DEFAULT '[\"1\",\"2\",\"3\",\"4\",\"5\"]'::jsonb",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS scanner_type VARCHAR(50) DEFAULT 'webcam'",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS barcode_type VARCHAR(50) DEFAULT 'qrcode'",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS suara_sukses VARCHAR(50) DEFAULT 'default1'",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS suara_gagal VARCHAR(50) DEFAULT 'default2'",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS file_suara_sukses TEXT",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS file_suara_gagal TEXT",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS background_image TEXT",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS theme_preset VARCHAR(50) DEFAULT 'indigo'",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS scanner_running_text TEXT DEFAULT 'Selamat Datang di Portal Presensi Siswa • Silakan scan kartu barcode/QR Anda pada scanner USB • Tetap tertib & jaga kedisiplinan'",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS scanner_theme_preset VARCHAR(50) DEFAULT 'indigo'",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS scanner_theme_color VARCHAR(50) DEFAULT ''",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS scanner_background_image TEXT DEFAULT ''",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS scanner_box_color VARCHAR(50) DEFAULT '#ffffff'",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS scanner_box_opacity INT DEFAULT 96",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS is_test_mode BOOLEAN DEFAULT FALSE",
        "ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb"
      ];

      for (const colQuery of columnsToEnsure) {
        try {
          await pool.query(colQuery);
        } catch (err) {}
      }

      const availableCols = await getTableColumns('pengaturan');
      const current = await pool.query('SELECT * FROM pengaturan WHERE id = 1');
      const curRow = current.rows[0] || {};
      const mergedData = { ...(curRow.data || {}), ...settingsData };

      const fieldValues: Record<string, any> = {};

      if (availableCols.has('is_test_mode') && (settingsData.isTestMode !== undefined || settingsData.is_test_mode !== undefined)) {
        fieldValues.is_test_mode = Boolean(settingsData.isTestMode ?? settingsData.is_test_mode);
      }

      if (availableCols.has('nama_website') && (settingsData.websiteName !== undefined || curRow.nama_website !== undefined)) {
        fieldValues['nama_website'] = settingsData.websiteName !== undefined ? settingsData.websiteName : (curRow.nama_website || 'Panel Admin SMK');
      }
      if (availableCols.has('judul_aplikasi')) {
        const val = settingsData.judulAplikasi ?? settingsData.judul_aplikasi ?? curRow.judul_aplikasi ?? 'Sistem Presensi Siswa';
        fieldValues['judul_aplikasi'] = val;
      }
      if (availableCols.has('judul_piket')) {
        const val = settingsData.judulPiket ?? settingsData.judul_piket ?? curRow.judul_piket ?? 'Portal Guru Piket & Perizinan';
        fieldValues['judul_piket'] = val;
      }
      if (availableCols.has('judul_guru_portal')) {
        const val = settingsData.judulGuruPortal ?? settingsData.judul_guru_portal ?? curRow.judul_guru_portal ?? 'Akses Data Guru';
        fieldValues['judul_guru_portal'] = val;
      }
      if (availableCols.has('subjudul_guru_portal')) {
        const val = settingsData.subjudulGuruPortal ?? settingsData.subjudul_guru_portal ?? curRow.subjudul_guru_portal ?? 'Portal Kehadiran, Piket & Akun Guru';
        fieldValues['subjudul_guru_portal'] = val;
      }
      if (availableCols.has('headmaster_name')) {
        const val = settingsData.headmasterName ?? settingsData.headmaster_name ?? settingsData.kepala_sekolah_nama ?? curRow.headmaster_name ?? '';
        fieldValues['headmaster_name'] = val;
      }
      if (availableCols.has('headmaster_nip')) {
        const val = settingsData.headmasterNip ?? settingsData.headmaster_nip ?? settingsData.kepala_sekolah_nip ?? curRow.headmaster_nip ?? '';
        fieldValues['headmaster_nip'] = val;
      }
      if (availableCols.has('headmaster_whatsapp')) {
        const val = settingsData.headmasterWhatsapp ?? settingsData.headmaster_whatsapp ?? settingsData.kepala_sekolah_whatsapp ?? curRow.headmaster_whatsapp ?? '';
        fieldValues['headmaster_whatsapp'] = val;
      }
      if (availableCols.has('kepala_sekolah_nama')) {
        const val = settingsData.headmasterName ?? settingsData.headmaster_name ?? settingsData.kepala_sekolah_nama ?? curRow.kepala_sekolah_nama ?? '';
        fieldValues['kepala_sekolah_nama'] = val;
      }
      if (availableCols.has('kepala_sekolah_nip')) {
        const val = settingsData.headmasterNip ?? settingsData.headmaster_nip ?? settingsData.kepala_sekolah_nip ?? curRow.kepala_sekolah_nip ?? '';
        fieldValues['kepala_sekolah_nip'] = val;
      }
      if (availableCols.has('logo') && (settingsData.logoBase64 !== undefined || curRow.logo !== undefined)) {
        let logoVal = settingsData.logoBase64 !== undefined ? settingsData.logoBase64 : (curRow.logo || '');
        if (typeof logoVal === 'string' && logoVal.startsWith('data:image/')) {
          logoVal = saveBase64ToFile(logoVal, BRANDING_DIR, 'logo');
          localMerged.logoBase64 = logoVal;
        }
        fieldValues['logo'] = logoVal;
      }
      if (availableCols.has('favicon') && (settingsData.faviconBase64 !== undefined || curRow.favicon !== undefined)) {
        let favVal = settingsData.faviconBase64 !== undefined ? settingsData.faviconBase64 : (curRow.favicon || '');
        if (typeof favVal === 'string' && favVal.startsWith('data:image/')) {
          favVal = saveBase64ToFile(favVal, BRANDING_DIR, 'favicon');
          localMerged.faviconBase64 = favVal;
        }
        fieldValues['favicon'] = favVal;
      }
      if (availableCols.has('jam_masuk') && (settingsData.globalArrivalMax !== undefined || curRow.jam_masuk !== undefined)) {
        fieldValues['jam_masuk'] = settingsData.globalArrivalMax !== undefined ? settingsData.globalArrivalMax : (curRow.jam_masuk || '12:00');
      }
      if (availableCols.has('jam_pulang') && (settingsData.globalDepartureMin !== undefined || curRow.jam_pulang !== undefined)) {
        fieldValues['jam_pulang'] = settingsData.globalDepartureMin !== undefined ? settingsData.globalDepartureMin : (curRow.jam_pulang || '13:00');
      }
      if (availableCols.has('scanner_type') && (settingsData.scannerType !== undefined || curRow.scanner_type !== undefined)) {
        fieldValues['scanner_type'] = settingsData.scannerType !== undefined ? settingsData.scannerType : (curRow.scanner_type || 'external');
      }
      if (availableCols.has('barcode_type') && (settingsData.barcodeType !== undefined || curRow.barcode_type !== undefined)) {
        fieldValues['barcode_type'] = settingsData.barcodeType !== undefined ? settingsData.barcodeType : (curRow.barcode_type || 'qrcode');
      }
      if (availableCols.has('suara_sukses') && (settingsData.suaraSukses !== undefined || curRow.suara_sukses !== undefined)) {
        fieldValues['suara_sukses'] = settingsData.suaraSukses !== undefined ? settingsData.suaraSukses : (curRow.suara_sukses || 'default1');
      }
      if (availableCols.has('suara_gagal') && (settingsData.suaraGagal !== undefined || curRow.suara_gagal !== undefined)) {
        fieldValues['suara_gagal'] = settingsData.suaraGagal !== undefined ? settingsData.suaraGagal : (curRow.suara_gagal || 'default2');
      }
      if (availableCols.has('file_suara_sukses') && (settingsData.fileSuaraSukses !== undefined || curRow.file_suara_sukses !== undefined)) {
        fieldValues['file_suara_sukses'] = settingsData.fileSuaraSukses !== undefined ? settingsData.fileSuaraSukses : (curRow.file_suara_sukses || '');
      }
      if (availableCols.has('file_suara_gagal') && (settingsData.fileSuaraGagal !== undefined || curRow.file_suara_gagal !== undefined)) {
        fieldValues['file_suara_gagal'] = settingsData.fileSuaraGagal !== undefined ? settingsData.fileSuaraGagal : (curRow.file_suara_gagal || '');
      }
      if (availableCols.has('background_image')) {
        const val = settingsData.backgroundImage ?? settingsData.background_image ?? curRow.background_image ?? '';
        fieldValues['background_image'] = val;
      }
      if (availableCols.has('theme_preset')) {
        const val = settingsData.themePreset ?? settingsData.theme_preset ?? curRow.theme_preset ?? 'indigo';
        fieldValues['theme_preset'] = val;
      }
      if (availableCols.has('scanner_running_text')) {
        const val = settingsData.scannerRunningText ?? settingsData.scanner_running_text ?? curRow.scanner_running_text ?? 'Selamat Datang di Portal Presensi Siswa • Silakan scan kartu barcode/QR Anda pada scanner USB • Tetap tertib & jaga kedisiplinan';
        fieldValues['scanner_running_text'] = val;
      }
      if (availableCols.has('scanner_theme_preset')) {
        const val = settingsData.scannerThemePreset ?? settingsData.scanner_theme_preset ?? curRow.scanner_theme_preset ?? 'indigo';
        fieldValues['scanner_theme_preset'] = val;
      }
      if (availableCols.has('scanner_theme_color')) {
        const val = settingsData.scannerThemeColor ?? settingsData.scanner_theme_color ?? curRow.scanner_theme_color ?? '';
        fieldValues['scanner_theme_color'] = val;
      }
      if (availableCols.has('scanner_background_image')) {
        const val = settingsData.scannerBackgroundImage ?? settingsData.scanner_background_image ?? curRow.scanner_background_image ?? '';
        fieldValues['scanner_background_image'] = val;
      }
      if (availableCols.has('scanner_box_color')) {
        const val = settingsData.scannerBoxBgColor ?? settingsData.scanner_box_color ?? curRow.scanner_box_color ?? '#ffffff';
        fieldValues['scanner_box_color'] = val;
      }
      if (availableCols.has('scanner_box_opacity')) {
        const val = settingsData.scannerBoxOpacity !== undefined ? Number(settingsData.scannerBoxOpacity) : settingsData.scanner_box_opacity !== undefined ? Number(settingsData.scanner_box_opacity) : curRow.scanner_box_opacity !== undefined ? Number(curRow.scanner_box_opacity) : 96;
        fieldValues['scanner_box_opacity'] = val;
      }

      // WhatsApp settings fields
      if (availableCols.has('wa_mode')) {
        const val = settingsData.waMode ?? settingsData.wa_mode ?? curRow.wa_mode ?? 'manual';
        fieldValues['wa_mode'] = val;
      }
      if (availableCols.has('wa_target')) {
        const val = settingsData.waTarget ?? settingsData.wa_target ?? curRow.wa_target ?? 'both';
        fieldValues['wa_target'] = val;
      }
      if (availableCols.has('wa_provider')) {
        const val = settingsData.waProvider ?? settingsData.wa_provider ?? curRow.wa_provider ?? 'fonnte';
        fieldValues['wa_provider'] = val;
      }
      if (availableCols.has('wa_api_url')) {
        const val = settingsData.waApiUrl ?? settingsData.wa_api_url ?? curRow.wa_api_url ?? 'https://api.fonnte.com/send';
        fieldValues['wa_api_url'] = val;
      }
      if (availableCols.has('wa_endpoint')) {
        const val = settingsData.waApiUrl ?? settingsData.wa_api_url ?? curRow.wa_endpoint ?? 'https://api.fonnte.com/send';
        fieldValues['wa_endpoint'] = val;
      }
      if (availableCols.has('wa_api_key')) {
        const val = settingsData.waApiKey ?? settingsData.wa_api_key ?? curRow.wa_api_key ?? '';
        fieldValues['wa_api_key'] = val;
      }
      if (availableCols.has('wa_api_secret')) {
        const val = settingsData.waApiSecret ?? settingsData.wa_api_secret ?? curRow.wa_api_secret ?? '';
        fieldValues['wa_api_secret'] = val;
      }
      if (availableCols.has('wa_sender_phone')) {
        const val = settingsData.waSenderPhone ?? settingsData.wa_sender_phone ?? curRow.wa_sender_phone ?? '';
        fieldValues['wa_sender_phone'] = val;
      }
      if (availableCols.has('wa_group_id')) {
        const val = settingsData.waGroupId ?? settingsData.wa_group_id ?? curRow.wa_group_id ?? '';
        fieldValues['wa_group_id'] = val;
      }
      if (availableCols.has('wa_group_name')) {
        const val = settingsData.waGroupName ?? settingsData.wa_group_name ?? curRow.wa_group_name ?? 'Grup Presensi SMK';
        fieldValues['wa_group_name'] = val;
      }
      if (availableCols.has('wa_cron_time')) {
        const val = settingsData.waCronTime ?? settingsData.wa_cron_time ?? curRow.wa_cron_time ?? '15:00';
        fieldValues['wa_cron_time'] = val;
      }
      if (availableCols.has('wa_schedule_time')) {
        const val = settingsData.waCronTime ?? settingsData.wa_cron_time ?? curRow.wa_schedule_time ?? '15:00';
        fieldValues['wa_schedule_time'] = val;
      }
      if (availableCols.has('wa_cron_days')) {
        const val = settingsData.waCronDays ?? settingsData.wa_cron_days ?? curRow.wa_cron_days ?? ['1', '2', '3', '4', '5'];
        fieldValues['wa_cron_days'] = JSON.stringify(Array.isArray(val) ? val : ['1', '2', '3', '4', '5']);
      }
      if (availableCols.has('wa_schedule_days')) {
        const val = settingsData.waCronDays ?? settingsData.wa_cron_days ?? curRow.wa_schedule_days ?? ['1', '2', '3', '4', '5'];
        fieldValues['wa_schedule_days'] = JSON.stringify(Array.isArray(val) ? val : ['1', '2', '3', '4', '5']);
      }
      if (availableCols.has('data')) {
        fieldValues['data'] = JSON.stringify(mergedData);
      }

      if (current.rows.length === 0) {
        fieldValues['id'] = 1;
        const keys = Object.keys(fieldValues);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const values = keys.map(k => fieldValues[k]);
        if (keys.length > 0) {
          await pool.query(
            `INSERT INTO pengaturan (${keys.join(', ')}) VALUES (${placeholders})`,
            values
          );
        }
      } else {
        const keys = Object.keys(fieldValues);
        if (keys.length > 0) {
          const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
          const values = keys.map(k => fieldValues[k]);
          await pool.query(
            `UPDATE pengaturan SET ${setClause} WHERE id = 1`,
            values
          );
        }
      }
    } catch (dbErr: any) {
      if (dbErr?.code !== 'ECONNREFUSED' && !String(dbErr?.message || '').includes('ECONNREFUSED')) {
        console.error('[SETTINGS POST DB ERROR]', dbErr);
      }
    }

    // Broadcast update real-time ke semua terminal Kiosk Portal Scanner
    broadcastKioskConfigUpdate(localMerged);

    res.json({ success: true, message: 'Settings saved successfully', data: localMerged });
  });

  // --- WHATSAPP GATEWAY ENDPOINTS ---
  app.post('/api/settings/wa-test-group', async (req, res) => {
    try {
      const { waApiUrl, waApiKey, waApiSecret, waProvider, targetGroupId, testMessage } = req.body;
      const settings = await getSettings();
      const groupId = targetGroupId || settings.waGroupId || settings.wa_group_id;
      if (!groupId) {
        return res.status(400).json({ success: false, error: 'ID WhatsApp Group belum diisi' });
      }

      const url = waApiUrl || settings.waApiUrl || 'https://api.fonnte.com/send';
      const key = waApiKey || settings.waApiKey;
      const secret = waApiSecret || settings.waApiSecret;
      const provider = waProvider || settings.waProvider;

      if (!key) {
        return res.status(400).json({ success: false, error: 'API Key WhatsApp belum diisi' });
      }

      const msg = testMessage || `📢 *[UJI COBA PESAN WHATSAPP GROUP]*\nHalo Anggota Grup!\nKoneksi API WhatsApp ke grup *${settings.waGroupName || 'Presensi'}* (${groupId}) berhasil terhubung dengan sistem presensi.`;

      const result = await sendWhatsAppMessage({
        url,
        apiKey: key,
        apiSecret: secret,
        provider,
        phone: groupId,
        message: msg
      });

      res.json({ success: true, message: `Pesan tes grup berhasil dikirim ke ${groupId}!`, result });
    } catch (err: any) {
      console.error('WA Test Group Error:', err);
      res.status(500).json({ success: false, error: err.message || 'Gagal mengirim pesan ke WhatsApp Group' });
    }
  });

  app.post('/api/settings/wa-send-group', async (req, res) => {
    try {
      const { targetGroupId, message, sendAllClasses = false, date } = req.body;
      const settings = await getSettings();
      const groupId = targetGroupId || settings.waGroupId || settings.wa_group_id;
      if (!groupId) {
        return res.status(400).json({ success: false, error: 'ID WhatsApp Group belum dikonfigurasi' });
      }

      const waKey = settings.waApiKey;
      if (!waKey) {
        return res.status(400).json({ success: false, error: 'API Key WhatsApp belum dikonfigurasi' });
      }

      let finalMessage = message;

      // REQUIREMENT 6: Rekap seluruh kelas otomatis
      if (sendAllClasses || !finalMessage) {
        const targetDate = date || new Date().toISOString().split('T')[0];
        const [students, allAttendance, allIzin, rombelStatus] = await Promise.all([
          getAllStudents(),
          getAllAttendance(),
          getAllIzin(),
          getAllRombelStatus()
        ]);

        const attendance = allAttendance.filter(a => a.timestamp.startsWith(targetDate));
        const activeIzin = allIzin.filter(i => i.tanggal_mulai <= targetDate && i.tanggal_selesai >= targetDate);

        const groups: Record<string, any[]> = {};
        for (const s of students) {
          if (s.status === 'LULUS') continue;
          const key = `${s.year || ''}_${s.class || ''}`;
          if (!groups[key]) groups[key] = [];
          groups[key].push(s);
        }

        const classKeys = Object.keys(groups).sort();
        const activeSummary: string[] = [];
        const absentSummary: string[] = [];

        let totalSiswaSchool = 0;
        let totalHadirSchool = 0;
        let totalIzinSchool = 0;
        let totalAlpaSchool = 0;

        for (const k of classKeys) {
          const [yr, cName] = k.split('_');
          if (!cName) continue;
          
          // Jangan ikut sertakan kelas yang berstatus PKL
          if (rombelStatus[cName] === 'PKL') {
            continue;
          }

          const rawStudents = groups[k] || [];
          // Filter hanya siswa aktif (bukan PKL / LULUS)
          const classStudents = rawStudents.filter((s: any) => s.status !== 'PKL' && s.status !== 'LULUS');
          if (classStudents.length === 0) continue;

          totalSiswaSchool += classStudents.length;

          const records = attendance.filter((a: any) => classStudents.some((s: any) => s.id === a.student_id));
          const arrivals = records.filter((r: any) => r.type === 'ARRIVAL');
          const lateArrivals = arrivals.filter((r: any) => r.status === 'LATE');
          const arrivedIds = new Set(arrivals.map((r: any) => r.student_id));
          const notArrived = classStudents.filter((s: any) => !arrivedIds.has(s.id));

          const studentsIzin = notArrived.map((s: any) => {
            const izinData = activeIzin.find(i => i.nisn === s.nisn);
            return {
              ...s,
              statusIzin: izinData ? izinData.keterangan : 'Alpa'
            };
          });

          const countAlpa = studentsIzin.filter(s => s.statusIzin === 'Alpa').length;
          const countIzin = studentsIzin.filter(s => s.statusIzin !== 'Alpa').length;

          totalHadirSchool += arrivals.length;
          totalIzinSchool += countIzin;
          totalAlpaSchool += countAlpa;

          activeSummary.push(`• *${cName}*: Hadir ${arrivals.length}/${classStudents.length} (Terlambat ${lateArrivals.length}), Izin/Sakit ${countIzin}, Alpa ${countAlpa}`);

          if (studentsIzin.length > 0) {
            const detailLines = studentsIzin.map((s: any, idx: number) => `   ${idx + 1}. ${s.name} (${s.statusIzin})`).join('\n');
            absentSummary.push(`*${cName}*:\n${detailLines}`);
          }
        }

        const websiteName = settings.websiteName || 'SMK';
        let generatedMsg = `*📢 REKAP PRESENSI HARIAN SEKOLAH*\n`;
        generatedMsg += `*${websiteName}*\n`;
        generatedMsg += `📅 Tanggal: ${targetDate}\n\n`;
        generatedMsg += `📊 *RINGKASAN SELURUH KELAS (${activeSummary.length} Kelas Aktif):*\n`;
        generatedMsg += activeSummary.join('\n') + '\n\n';

        if (absentSummary.length > 0) {
          generatedMsg += `📝 *DETAIL SISWA TIDAK HADIR PER KELAS:*\n`;
          generatedMsg += absentSummary.join('\n\n') + '\n\n';
        }

        generatedMsg += `📈 *TOTAL KESELURUHAN SEKOLAH:*\n`;
        generatedMsg += `• Total Siswa: ${totalSiswaSchool}\n`;
        generatedMsg += `• Total Hadir: ${totalHadirSchool}\n`;
        generatedMsg += `• Total Izin/Sakit: ${totalIzinSchool}\n`;
        generatedMsg += `• Total Alpa: ${totalAlpaSchool}\n\n`;
        generatedMsg += `_Laporan otomatis dikirim oleh Sistem Presensi ${websiteName}_`;

        finalMessage = generatedMsg;
      }

      const result = await sendWhatsAppMessage({
        url: settings.waApiUrl || 'https://api.fonnte.com/send',
        apiKey: waKey,
        apiSecret: settings.waApiSecret,
        provider: settings.waProvider,
        phone: groupId,
        message: finalMessage
      });

      res.json({ success: true, message: `Rekap seluruh kelas berhasil dikirim ke grup WhatsApp (${groupId})`, result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Gagal mengirim laporan ke WhatsApp Group' });
    }
  });

  app.post('/api/reports/send-wa-wali', async (req, res) => {
    try {
      const { phone, message, teacherName, className, date } = req.body;
      if (!phone || !message) {
        return res.status(400).json({ success: false, error: 'Nomor WhatsApp dan pesan wajib diisi' });
      }

      const settings = await getSettings();
      const waUrl = settings.waApiUrl || 'https://api.fonnte.com/send';
      const waKey = settings.waApiKey;

      if (!waKey) {
        return res.json({ 
          success: false, 
          fallbackToWeb: true, 
          error: 'API Key WhatsApp belum dikonfigurasi di Pengaturan API WA' 
        });
      }

      const gatewayRes = await sendWhatsAppMessage({
        url: waUrl,
        apiKey: waKey,
        apiSecret: settings.waApiSecret,
        provider: settings.waProvider,
        phone,
        message
      });

      res.json({ 
        success: true, 
        message: `Laporan berhasil dikirim ke Wali Kelas ${teacherName || className} (${phone})`, 
        gatewayRes 
      });
    } catch (e: any) {
      console.error('send-wa-wali error:', e);
      res.status(500).json({ success: false, error: e.message || 'Gagal mengirim pesan melalui WhatsApp Gateway' });
    }
  });

  // --- WHATSAPP GATEWAY ENDPOINTS ---
  const handleWaTest = async (req: any, res: any) => {
    try {
      const {
        phone, targetPhone, testPhone,
        url, waApiUrl,
        apiKey, waApiKey,
        apiSecret, waApiSecret,
        provider, waProvider,
        message, testMessage
      } = req.body || {};

      const settings = await getSettings();

      const finalPhone = phone || targetPhone || testPhone;
      if (!finalPhone) {
        return res.status(400).json({ success: false, error: 'Nomor WhatsApp tujuan harus diisi (contoh: 08123456789)' });
      }

      const finalKey = (apiKey || waApiKey || settings.waApiKey || settings.wa_api_key || '').trim();
      const finalUrl = (url || waApiUrl || settings.waApiUrl || settings.wa_api_url || 'https://api.fonnte.com/send').trim();
      const finalSecret = (apiSecret || waApiSecret || settings.waApiSecret || settings.wa_api_secret || '').trim();
      const finalProvider = (provider || waProvider || settings.waProvider || settings.wa_provider || 'fonnte').trim();

      if (!finalKey) {
        return res.status(400).json({ success: false, error: 'API Key / Token WhatsApp belum dikonfigurasi di menu Atur Gateway' });
      }

      const msg = message || testMessage || `✅ *[UJI COBA WHATSAPP GATEWAY]*\nHalo! Sistem Presensi Sekolah berhasil terhubung dengan Gateway ${finalProvider.toUpperCase()}.\nEndpoint: ${finalUrl}\nWaktu Tes: ${new Date().toLocaleString('id-ID')} WIB`;

      const result = await sendWhatsAppMessage({
        url: finalUrl,
        apiKey: finalKey,
        apiSecret: finalSecret,
        provider: finalProvider,
        phone: finalPhone,
        message: msg
      });

      res.json({ success: true, message: `Pesan tes berhasil dikirim ke ${finalPhone}!`, result });
    } catch (err: any) {
      console.error('WA Test Error:', err);
      res.status(500).json({ success: false, error: err.message || 'Gagal mengirim pesan WhatsApp' });
    }
  };

  app.post('/api/settings/test-wa', handleWaTest);
  app.post('/api/settings/wa-test', handleWaTest);

  app.post('/api/settings/wa-check-status', async (req, res) => {
    try {
      const { waApiUrl, waApiKey, waProvider } = req.body;
      if (!waApiKey) {
        return res.status(400).json({ success: false, error: 'API Key / Token belum diisi' });
      }

      const endpoint = (waApiUrl || '').trim();
      if (endpoint.includes('fonnte') || waProvider === 'fonnte') {
        try {
          const resp = await fetch('https://api.fonnte.com/device', {
            method: 'POST',
            headers: { 'Authorization': waApiKey }
          });
          const data = await resp.json();
          return res.json({ 
            success: true, 
            status: data.device_status || (data.status ? 'Terhubung / Aktif' : 'Device Disconnected'),
            detail: data 
          });
        } catch (e: any) {
          return res.json({ success: true, status: 'API Key Disimpan (Fonnte)', detail: { note: e.message } });
        }
      }

      if (endpoint.includes('wablas') || waProvider === 'wablas') {
        try {
          const baseUrl = endpoint.split('/api')[0] || 'https://api.wablas.com';
          const resp = await fetch(`${baseUrl}/api/device/info?token=${waApiKey}`);
          const data = await resp.json();
          return res.json({ 
            success: true, 
            status: data.status || 'Terhubung',
            detail: data 
          });
        } catch (e: any) {
          return res.json({ success: true, status: 'API Key Disimpan (Wablas)', detail: { note: e.message } });
        }
      }

      // Generic endpoint test
      return res.json({ success: true, status: 'Konfigurasi Tersimpan', detail: { message: 'URL Gateway aktif' } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Gagal memeriksa status WhatsApp Gateway' });
    }
  });

  app.post('/api/settings/wa-send-daily-reports', async (req, res) => {
    try {
      const { date } = req.body;
      const result = await sendDailyAttendanceReports(date);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Gagal mengirim laporan otomatis presensi' });
    }
  });

  app.post('/api/settings/send-teacher-kbm-reports', async (req, res) => {
    try {
      const { date, period } = req.body;
      const result = await sendDailyTeacherKbmReports(date, period);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Gagal mengirim laporan otomatis KBM guru' });
    }
  });

  const handleUpdateJudul = async (req: any, res: any) => {
    try {
      const { 
        judul_aplikasi, judul_piket, judul_guru_portal, subjudul_guru_portal,
        judulAplikasi, judulPiket, judulGuruPortal, subjudulGuruPortal 
      } = req.body;
      const appTitle = (judul_aplikasi !== undefined ? judul_aplikasi : judulAplikasi) || null;
      const piketTitle = (judul_piket !== undefined ? judul_piket : judulPiket) || null;
      const guruTitle = (judul_guru_portal !== undefined ? judul_guru_portal : judulGuruPortal) || null;
      const guruSubtitle = (subjudul_guru_portal !== undefined ? subjudul_guru_portal : subjudulGuruPortal) || null;

      if (appTitle) saveLocalSettings({ judulAplikasi: appTitle, judul_aplikasi: appTitle });
      if (piketTitle) saveLocalSettings({ judulPiket: piketTitle, judul_piket: piketTitle });
      if (guruTitle) saveLocalSettings({ judulGuruPortal: guruTitle, judul_guru_portal: guruTitle });
      if (guruSubtitle) saveLocalSettings({ subjudulGuruPortal: guruSubtitle, subjudul_guru_portal: guruSubtitle });

      try {
        await pool.query("ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS judul_piket VARCHAR(255) DEFAULT 'Portal Guru Piket & Perizinan'");
        await pool.query("ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS judul_guru_portal VARCHAR(255) DEFAULT 'Akses Data Guru'");
        await pool.query("ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS subjudul_guru_portal VARCHAR(255) DEFAULT 'Portal Kehadiran, Piket & Akun Guru'");
      } catch (err) {}

      const existing = await pool.query('SELECT * FROM pengaturan WHERE id = 1');
      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO pengaturan (id, judul_aplikasi, judul_piket, judul_guru_portal, subjudul_guru_portal) VALUES (1, $1, $2, $3, $4)`,
          [
            appTitle || 'Sistem Presensi Siswa', 
            piketTitle || 'Portal Guru Piket & Perizinan',
            guruTitle || 'Akses Data Guru',
            guruSubtitle || 'Portal Kehadiran, Piket & Akun Guru'
          ]
        );
      } else {
        const cur = existing.rows[0];
        const newAppTitle = appTitle !== null ? appTitle : (cur.judul_aplikasi || 'Sistem Presensi Siswa');
        const newPiketTitle = piketTitle !== null ? piketTitle : (cur.judul_piket || 'Portal Guru Piket & Perizinan');
        const newGuruTitle = guruTitle !== null ? guruTitle : (cur.judul_guru_portal || 'Akses Data Guru');
        const newGuruSubtitle = guruSubtitle !== null ? guruSubtitle : (cur.subjudul_guru_portal || 'Portal Kehadiran, Piket & Akun Guru');
        
        await pool.query(
          `UPDATE pengaturan SET judul_aplikasi = $1, judul_piket = $2, judul_guru_portal = $3, subjudul_guru_portal = $4 WHERE id = 1`,
          [newAppTitle, newPiketTitle, newGuruTitle, newGuruSubtitle]
        );
      }

      try {
        const curData = (existing.rows[0]?.data) || {};
        const updatedData = { ...curData };
        if (appTitle !== null) updatedData.judulAplikasi = appTitle;
        if (piketTitle !== null) updatedData.judulPiket = piketTitle;
        if (guruTitle !== null) updatedData.judulGuruPortal = guruTitle;
        if (guruSubtitle !== null) updatedData.subjudulGuruPortal = guruSubtitle;
        await pool.query('UPDATE pengaturan SET data = $1::jsonb WHERE id = 1', [JSON.stringify(updatedData)]);
      } catch (err) {}

      const local = getLocalSettings();
      broadcastKioskConfigUpdate({
        judulAplikasi: appTitle || local.judulAplikasi,
        judul_aplikasi: appTitle || local.judulAplikasi
      });
      res.json({ 
        success: true, 
        judul_aplikasi: appTitle || local.judulAplikasi, 
        judul_piket: piketTitle || local.judulPiket,
        judul_guru_portal: guruTitle || local.judulGuruPortal,
        subjudul_guru_portal: guruSubtitle || local.subjudulGuruPortal,
        judulAplikasi: appTitle || local.judulAplikasi,
        judulPiket: piketTitle || local.judulPiket,
        judulGuruPortal: guruTitle || local.judulGuruPortal,
        subjudulGuruPortal: guruSubtitle || local.subjudulGuruPortal
      });
    } catch (e: any) {
      const local = getLocalSettings();
      res.json({ 
        success: true, 
        message: 'Tersimpan dalam penyimpanan pengaturan',
        judul_aplikasi: req.body.judul_aplikasi || req.body.judulAplikasi || local.judulAplikasi, 
        judul_piket: req.body.judul_piket || req.body.judulPiket || local.judulPiket,
        judul_guru_portal: req.body.judul_guru_portal || req.body.judulGuruPortal || local.judulGuruPortal,
        subjudul_guru_portal: req.body.subjudul_guru_portal || req.body.subjudulGuruPortal || local.subjudulGuruPortal,
        judulAplikasi: req.body.judul_aplikasi || req.body.judulAplikasi || local.judulAplikasi,
        judulPiket: req.body.judul_piket || req.body.judulPiket || local.judulPiket,
        judulGuruPortal: req.body.judul_guru_portal || req.body.judulGuruPortal || local.judulGuruPortal,
        subjudulGuruPortal: req.body.subjudul_guru_portal || req.body.subjudulGuruPortal || local.subjudulGuruPortal
      });
    }
  };

  app.get('/api/settings/judul', async (req, res) => {
    try {
      try {
        await pool.query("ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS judul_piket VARCHAR(255) DEFAULT 'Portal Guru Piket & Perizinan'");
        await pool.query("ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS judul_guru_portal VARCHAR(255) DEFAULT 'Akses Data Guru'");
        await pool.query("ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS subjudul_guru_portal VARCHAR(255) DEFAULT 'Portal Kehadiran, Piket & Akun Guru'");
      } catch (err) {}
      const result = await pool.query('SELECT judul_aplikasi, judul_piket, judul_guru_portal, subjudul_guru_portal FROM pengaturan WHERE id = 1');
      const row = result.rows[0] || {};
      const local = getLocalSettings();
      res.json({ 
        judul_aplikasi: row.judul_aplikasi || local.judulAplikasi || 'Sistem Presensi Siswa',
        judul_piket: row.judul_piket || local.judulPiket || 'Portal Guru Piket & Perizinan',
        judul_guru_portal: row.judul_guru_portal || local.judulGuruPortal || 'Akses Data Guru',
        subjudul_guru_portal: row.subjudul_guru_portal || local.subjudulGuruPortal || 'Portal Kehadiran, Piket & Akun Guru',
        judulAplikasi: row.judul_aplikasi || local.judulAplikasi || 'Sistem Presensi Siswa',
        judulPiket: row.judul_piket || local.judulPiket || 'Portal Guru Piket & Perizinan',
        judulGuruPortal: row.judul_guru_portal || local.judulGuruPortal || 'Akses Data Guru',
        subjudulGuruPortal: row.subjudul_guru_portal || local.subjudulGuruPortal || 'Portal Kehadiran, Piket & Akun Guru'
      });
    } catch (e) {
      const local = getLocalSettings();
      res.json({ 
        judul_aplikasi: local.judulAplikasi || 'Sistem Presensi Siswa',
        judul_piket: local.judulPiket || 'Portal Guru Piket & Perizinan',
        judul_guru_portal: local.judulGuruPortal || 'Akses Data Guru',
        subjudul_guru_portal: local.subjudulGuruPortal || 'Portal Kehadiran, Piket & Akun Guru',
        judulAplikasi: local.judulAplikasi || 'Sistem Presensi Siswa',
        judulPiket: local.judulPiket || 'Portal Guru Piket & Perizinan',
        judulGuruPortal: local.judulGuruPortal || 'Akses Data Guru',
        subjudulGuruPortal: local.subjudulGuruPortal || 'Portal Kehadiran, Piket & Akun Guru'
      });
    }
  });

  app.put('/api/settings/judul', handleUpdateJudul);
  app.post('/api/settings/judul', handleUpdateJudul);

  app.post('/api/settings/reset', requireAdmin, async (req, res) => {
    try {
      await safeDbQuery('DELETE FROM attendance');
      await safeDbQuery('DELETE FROM izin_siswa');
      await safeDbQuery('DELETE FROM students');
      await safeDbQuery('DELETE FROM teachers');
      res.json({ success: true, message: 'Semua data siswa, wali kelas, izin, dan presensi berhasil direset.' });
    } catch (e: any) {
      handleDbError(e, res, { error: 'Gagal mereset database' });
    }
  });

  const escapeSql = (val: any): string => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return val.toString();
    return "'" + String(val).replace(/'/g, "''") + "'";
  };

  app.get('/api/settings/backup/sql', async (req, res) => {
    try {
      let sql = `-- BACKUP DATABASE PRESENSI\n-- Timestamp: ${new Date().toISOString()}\n\n`;
      const schemaPath = fs.existsSync(path.join(process.cwd(), 'database.sql')) 
        ? path.join(process.cwd(), 'database.sql') 
        : path.join(process.cwd(), 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        sql += fs.readFileSync(schemaPath, 'utf-8');
      }
      sql += '\n\n-- DATA BACKUP\n';

      const peng = await pool.query('SELECT * FROM pengaturan WHERE id = 1');
      if (peng.rows.length > 0) {
        const p = peng.rows[0];
        sql += `INSERT INTO pengaturan (id, nama_website, judul_aplikasi, judul_piket, jam_masuk, jam_pulang, logo, favicon, wa_mode, wa_endpoint, wa_api_url, wa_api_key, wa_cron_time, wa_cron_days, scanner_type, barcode_type, suara_sukses, suara_gagal, file_suara_sukses, file_suara_gagal, data) VALUES (1, ${escapeSql(p.nama_website)}, ${escapeSql(p.judul_aplikasi)}, ${escapeSql(p.judul_piket)}, ${escapeSql(p.jam_masuk)}, ${escapeSql(p.jam_pulang)}, ${escapeSql(p.logo)}, ${escapeSql(p.favicon)}, ${escapeSql(p.wa_mode)}, ${escapeSql(p.wa_endpoint)}, ${escapeSql(p.wa_api_url)}, ${escapeSql(p.wa_api_key)}, ${escapeSql(p.wa_cron_time)}, ${escapeSql(JSON.stringify(p.wa_cron_days || ['1','2','3','4','5']))}::jsonb, ${escapeSql(p.scanner_type)}, ${escapeSql(p.barcode_type)}, ${escapeSql(p.suara_sukses)}, ${escapeSql(p.suara_gagal)}, ${escapeSql(p.file_suara_sukses)}, ${escapeSql(p.file_suara_gagal)}, ${escapeSql(JSON.stringify(p.data || {}))}::jsonb) ON CONFLICT (id) DO UPDATE SET nama_website = EXCLUDED.nama_website, judul_aplikasi = EXCLUDED.judul_aplikasi, judul_piket = EXCLUDED.judul_piket, data = EXCLUDED.data;\n\n`;
      }

      const students = await pool.query('SELECT * FROM students');
      for (const s of students.rows) {
        sql += `INSERT INTO students (id, name, nisn, nis, class, year, qr_code, custom_fields, photo, foto) VALUES (${escapeSql(s.id)}, ${escapeSql(s.name)}, ${escapeSql(s.nisn)}, ${escapeSql(s.nis)}, ${escapeSql(s.class)}, ${escapeSql(s.year)}, ${escapeSql(s.qr_code)}, ${escapeSql(JSON.stringify(s.custom_fields || {}))}::jsonb, ${escapeSql(s.photo)}, ${escapeSql(s.foto)}) ON CONFLICT (id) DO NOTHING;\n`;
      }

      const teachers = await pool.query('SELECT * FROM teachers');
      for (const t of teachers.rows) {
        sql += `INSERT INTO teachers (id, name, whatsapp, class, year) VALUES (${escapeSql(t.id)}, ${escapeSql(t.name)}, ${escapeSql(t.whatsapp)}, ${escapeSql(t.class)}, ${escapeSql(t.year)}) ON CONFLICT (id) DO NOTHING;\n`;
      }

      const attendance = await pool.query('SELECT * FROM attendance');
      for (const a of attendance.rows) {
        sql += `INSERT INTO attendance (id, student_id, timestamp, status, type) VALUES (${escapeSql(a.id)}, ${escapeSql(a.student_id)}, ${escapeSql(a.timestamp)}, ${escapeSql(a.status)}, ${escapeSql(a.type)}) ON CONFLICT (id) DO NOTHING;\n`;
      }

      const izin = await pool.query('SELECT * FROM izin_siswa');
      for (const i of izin.rows) {
        sql += `INSERT INTO izin_siswa (id, nisn, keterangan, foto, tanggal_mulai, tanggal_selesai) VALUES (${escapeSql(i.id)}, ${escapeSql(i.nisn)}, ${escapeSql(i.keterangan)}, ${escapeSql(i.foto)}, ${escapeSql(i.tanggal_mulai)}, ${escapeSql(i.tanggal_selesai)}) ON CONFLICT (id) DO NOTHING;\n`;
      }
      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Content-Disposition', `attachment; filename="backup_presensi_${Date.now()}.sql"`);
      res.send(sql);
    } catch (e) {
      handleDbError(e, res, { error: 'Gagal membuat backup database SQL' });
    }
  });

  app.post('/api/settings/restore/sql', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'Tidak ada file SQL yang diunggah' });
      const sqlContent = fs.readFileSync(req.file.path, 'utf-8');
      fs.unlinkSync(req.file.path);
      await pool.query(sqlContent);
      res.json({ success: true, message: 'Database berhasil dipulihkan' });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Gagal memulihkan database' });
    }
  });

  app.get('/api/settings/backup/zip', async (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="backup_full_aplikasi_${Date.now()}.zip"`);
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(res);
      
      // Glob the entire directory, excluding heavy/generated folders
      archive.glob('**/*', {
        cwd: process.cwd(),
        ignore: [
          'node_modules/**', 
          'dist/**', 
          '.git/**', 
          '.env',
          '*.zip'
        ]
      });

      await archive.finalize();
    } catch (e) {
      handleDbError(e, res, { error: 'Gagal membuat backup zip' });
    }
  });

  app.post('/api/import/teachers', async (req, res) => {
      try {
        const teachers = req.body.teachers || [];
        for (const s of teachers) {
            await saveTeacher({
              id: s.id || randomUUID(),
              name: s.name,
              nip: s.nip || '',
              whatsapp: s.whatsapp,
              class: s.class || '',
              year: s.year || '',
              status: s.status || 'AKTIF'
            });
        }
        res.json({ success: true, added: teachers.length });
      } catch (e: any) { handleDbError(e, res, {}); }
  });

  

  

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
      const { nama, semester, is_active } = req.body;
      const ta = {
        id: randomUUID(),
        nama,
        semester: semester || 'Ganjil',
        is_active: is_active || false,
        dibuat_pada: new Date().toISOString()
      };
      await saveTahunAjaran(ta);
      if (ta.is_active) {
        await updateGlobalSettings({ tahun_ajaran: ta.nama, tahunAjaran: ta.nama, semester: ta.semester });
      }
      res.json({ success: true, data: ta });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/tahun-ajaran/:id/active', async (req, res) => {
    try {
      const { is_active, semester, confirm_override, force } = req.body;
      const all = await getAllTahunAjaran();
      const targetTa = all.find(t => t.id === req.params.id);

      if (is_active && targetTa) {
        const currentPeriod = await getActivePeriod();
        const nextTa = targetTa.nama;
        const nextSem = semester || targetTa.semester || 'Ganjil';

        // Jika mengubah ke periode/semester yang berbeda dan belum konfirmasi, cek berkas pending
        const isDifferentPeriod = (currentPeriod.tahun_ajaran !== nextTa) || (currentPeriod.semester !== nextSem);
        if (isDifferentPeriod && !confirm_override && !force) {
          const pendingStatus = await checkActivePeriodPendingStatus(currentPeriod.tahun_ajaran, currentPeriod.semester);
          if (pendingStatus.hasPending) {
            return res.json({
              success: false,
              warning: true,
              requires_confirmation: true,
              message: `Peringatan: Pada periode aktif saat ini (${currentPeriod.tahun_ajaran} - Semester ${currentPeriod.semester}) masih terdapat proses pengisian atau verifikasi perangkat ajar (${pendingStatus.menungguVerifikasiCount} menunggu verifikasi, ${pendingStatus.revisiCount} dalam revisi, ${pendingStatus.terkirimMapelCount} mapel terkirim). Apakah Anda yakin ingin mengganti periode aktif?`,
              pending_details: pendingStatus
            });
          }
        }

        await setTahunAjaranActive(req.params.id, is_active, nextSem);
        await updateGlobalSettings({ 
          tahun_ajaran: nextTa, 
          tahunAjaran: nextTa, 
          semester: nextSem 
        });

        // Otomatis pastikan direktori Nextcloud WebDAV terpisah untuk periode ini siap
        try {
          await nextcloudWebdavService.ensurePeriodFolder(nextTa, nextSem);
        } catch (err) {}

        return res.json({
          success: true,
          message: `Periode aktif berhasil diubah ke ${nextTa} - Semester ${nextSem}`,
          data: { tahun_ajaran: nextTa, semester: nextSem }
        });
      }

      await setTahunAjaranActive(req.params.id, is_active, semester);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/tahun-ajaran/active-config', async (req, res) => {
    try {
      const settings = await getLocalSettings();
      const allTa = await getAllTahunAjaran();
      const activeFromTable = allTa.find(t => t.is_active);

      const active_tahun_ajaran = settings.tahun_ajaran || settings.tahunAjaran || activeFromTable?.nama || '2024/2025';
      const active_semester = settings.semester || activeFromTable?.semester || 'Ganjil';

      res.json({
        success: true,
        data: {
          active_tahun_ajaran,
          active_semester,
          tahun_ajaran: active_tahun_ajaran,
          semester: active_semester
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/tahun-ajaran/active-config', async (req, res) => {
    try {
      const tahun_ajaran = req.body.tahun_ajaran || req.body.active_tahun_ajaran || req.body.tahunAjaran;
      const semester = req.body.semester || req.body.active_semester;
      const { confirm_override, force } = req.body;

      if (!tahun_ajaran || !semester) {
        return res.status(400).json({ error: 'tahun_ajaran dan semester wajib diisi' });
      }

      const currentPeriod = await getActivePeriod();
      const isDifferentPeriod = (currentPeriod.tahun_ajaran !== tahun_ajaran) || (currentPeriod.semester !== semester);

      if (isDifferentPeriod && !confirm_override && !force) {
        const pendingStatus = await checkActivePeriodPendingStatus(currentPeriod.tahun_ajaran, currentPeriod.semester);
        if (pendingStatus.hasPending) {
          return res.json({
            success: false,
            warning: true,
            requires_confirmation: true,
            message: `Peringatan: Pada periode aktif saat ini (${currentPeriod.tahun_ajaran} - Semester ${currentPeriod.semester}) masih terdapat proses pengisian atau verifikasi perangkat ajar (${pendingStatus.menungguVerifikasiCount} menunggu verifikasi, ${pendingStatus.revisiCount} dalam revisi, ${pendingStatus.terkirimMapelCount} mapel terkirim). Apakah Anda yakin ingin mengganti periode aktif?`,
            pending_details: pendingStatus
          });
        }
      }

      // Update global settings
      await updateGlobalSettings({
        tahun_ajaran,
        tahunAjaran: tahun_ajaran,
        semester
      });

      // Update in tahun_ajaran table
      const allTa = await getAllTahunAjaran();
      let match = allTa.find(t => (t.nama || '').toLowerCase().trim() === tahun_ajaran.toLowerCase().trim());
      if (match) {
        await setTahunAjaranActive(match.id, true, semester);
      } else {
        const newTa = {
          id: randomUUID(),
          nama: tahun_ajaran,
          semester,
          is_active: true,
          dibuat_pada: new Date().toISOString()
        };
        await saveTahunAjaran(newTa);
      }

      // Otomatis pastikan direktori Nextcloud WebDAV terpisah untuk periode baru ini dibuat
      try {
        await nextcloudWebdavService.ensurePeriodFolder(tahun_ajaran, semester);
      } catch (err) {}

      res.json({ 
        success: true, 
        message: `Periode aktif berhasil disetel: ${tahun_ajaran} - Semester ${semester}`,
        data: { 
          tahun_ajaran, 
          semester,
          active_tahun_ajaran: tahun_ajaran,
          active_semester: semester
        }
      });
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

  // ===================== MATA PELAJARAN ROUTES =====================
  app.get('/api/mata-pelajaran', async (req, res) => {
    try {
      const list = await getAllMataPelajaran();
      res.json(list);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/mata-pelajaran', async (req, res) => {
    try {
      const { id, kode_mapel, nama_mapel, kelompok, keterangan } = req.body;
      if (!nama_mapel || !kode_mapel) {
        return res.status(400).json({ error: 'Kode dan nama mata pelajaran wajib diisi' });
      }
      const saved = await saveMataPelajaran({ id, kode_mapel, nama_mapel, kelompok, keterangan });
      res.json({ success: true, data: saved });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/mata-pelajaran/import', async (req, res) => {
    try {
      let items = req.body?.items;
      if (!items && req.body && Array.isArray(req.body)) {
        items = req.body;
      }
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Data mata pelajaran untuk diimpor tidak ditemukan atau kosong' });
      }
      const result = await bulkImportMataPelajaran(items);
      res.json({
        success: true,
        message: `Berhasil mengimpor ${result.imported} mapel baru dan memperbarui ${result.updated} mapel.`,
        data: result
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/mata-pelajaran/:id', async (req, res) => {
    try {
      await deleteMataPelajaran(req.params.id);
      res.json({ success: true, message: 'Mata pelajaran berhasil dihapus' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vite + Frontend setup
  // Accurate environment detection:
  // In development, tsx runs the server without compiled dist bundle.
  const isDev = process.env.NODE_ENV === 'development' || 
    Boolean(process.env.npm_lifecycle_event === 'dev') ||
    process.argv.some(arg => typeof arg === 'string' && (arg.includes('tsx') || arg.includes('--port')));

  const isProduction = !isDev && (
    process.env.NODE_ENV === 'production' || 
    (typeof __filename !== 'undefined' && __filename.includes('dist')) ||
    fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'))
  );

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { 
        middlewareMode: true
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const candidateDistPaths = [
      path.join(process.cwd(), 'dist'),
      typeof __dirname !== 'undefined' ? __dirname : '',
      typeof __dirname !== 'undefined' ? path.join(__dirname, 'dist') : '',
      path.join(process.cwd(), 'applet', 'dist'),
      '/app/applet/dist',
      '/app/dist'
    ].filter(p => p && fs.existsSync(path.join(p, 'index.html')));

    const distPath = candidateDistPaths[0] || path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Not Found');
      }
    });
  }

  // --- AUTOMATED CRON JOB FOR WHATSAPP REPORTS ---
  cron.schedule('* * * * *', async () => {
    try {
      const settings = await getSettings();
      if (!settings || settings.waMode !== 'automatic') return;

      const now = new Date();
      // Format time exactly in HH:MM in Asia/Jakarta timezone
      const formatterTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false });
      const currentTime = formatterTime.format(now);
      
      // Get day of week (1=Monday...7=Sunday for Indonesia / standard usage, but Date.getDay() gives 0=Sunday)
      const formatterDay = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta', weekday: 'short' });
      const dayShort = formatterDay.format(now); // "Mon", "Tue", etc.
      
      let dayIndex = '0';
      if (dayShort === 'Mon') dayIndex = '1';
      else if (dayShort === 'Tue') dayIndex = '2';
      else if (dayShort === 'Wed') dayIndex = '3';
      else if (dayShort === 'Thu') dayIndex = '4';
      else if (dayShort === 'Fri') dayIndex = '5';
      else if (dayShort === 'Sat') dayIndex = '6';
      else if (dayShort === 'Sun') dayIndex = '7';

      const cronTime = settings.waCronTime || '15:00';
      const cronDays = settings.waCronDays || ['1', '2', '3', '4', '5'];

      if (currentTime === cronTime && cronDays.includes(dayIndex)) {
        // Prevent running multiple times in the same minute
        const markerFile = path.join(TEMP_DIR, `cron_${now.toISOString().split('T')[0]}.lock`);
        if (fs.existsSync(markerFile)) return;
        try {
          fs.writeFileSync(markerFile, currentTime);
        } catch (err) {}
        
        console.log(`[CRON] Triggering automated WhatsApp reports for ${cronTime}`);
        
        // Use local date formatted string YYYY-MM-DD
        const formatterDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }); // YYYY-MM-DD
        const todayStr = formatterDate.format(now);
        await sendDailyAttendanceReports(todayStr);
      }
    } catch (e) {
      console.error('[CRON] Error executing automated WhatsApp reports:', e);
    }
  });

  const DEFAULT_PORT = 3000;
  // In production (Cloud Run), listen on the port provided by the runtime environment (usually 8080)
  const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : null;
  const primaryPort = (isProduction && envPort && !isNaN(envPort)) ? envPort : DEFAULT_PORT;

  const server = app.listen(primaryPort, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${primaryPort} (${isProduction ? 'production' : 'development'})`);
  });

  // In production, if primaryPort is not 3000, also bind to port 3000 as fallback
  if (isProduction && primaryPort !== DEFAULT_PORT) {
    try {
      const fallbackServer = app.listen(DEFAULT_PORT, '0.0.0.0', () => {
        console.log(`Server also listening on http://0.0.0.0:${DEFAULT_PORT} (fallback)`);
      });
      fallbackServer.on('error', (err: any) => {
        console.log(`Port ${DEFAULT_PORT} fallback notice:`, err.message);
      });
    } catch (e) {}
  }
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
