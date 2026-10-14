/**
 * Kiosk Offline Queue & Auto-Sync Engine for DietPi OS (Chromium Kiosk Mode)
 * - Persistent storage with navigator.storage.persist()
 * - Clock offset calibration with server time (NTP / Hardware RTC drift compensation)
 * - FIFO IndexedDB offline queue
 * - Rate-limited batch sync with idempotency handling
 * - Emergency data export (JSON/CSV)
 */

import axios from 'axios';
import { safeStorage } from '../safeStorage';

const DB_NAME = 'DietPiKioskAttendanceDB';
const DB_VERSION = 1;
const STORE_SCANS = 'offline_scans';
const STORE_STUDENTS = 'cached_students';

export interface OfflineScanItem {
  id?: number;
  barcode: string;
  timestamp: string; // Calibrated server time ISO
  localTimestamp: string; // Original client local time ISO
  clockOffsetMs: number;
  type: 'ARRIVAL' | 'DEPARTURE';
  terminalId: string;
  status: 'pending' | 'synced';
  createdAt: number;
  studentName?: string;
  studentClass?: string;
}

export interface CachedStudentItem {
  id: string;
  name: string;
  nisn: string;
  nis: string;
  qr_code: string;
  class: string;
  year: string;
}

let dbInstance: IDBDatabase | null = null;
let clockOffsetMs: number = Number(safeStorage.getItem('kiosk_clock_offset_ms', '0')) || 0;
let isStoragePersisted = false;

/**
 * 1. PERSISTENSI INDEXEDDB PADA CHROMIUM KIOSK
 * Requests persistent storage to prevent Chromium from discarding DB during low disk/RAM.
 */
export async function initKioskStorage(): Promise<IDBDatabase> {
  // Request persistent storage
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const persisted = await navigator.storage.persist();
      isStoragePersisted = persisted;
      console.log(`[KioskStorage] Persistent storage granted: ${persisted}`);
    } catch (err) {
      console.warn('[KioskStorage] navigator.storage.persist error:', err);
    }
  }

  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_SCANS)) {
        const scanStore = db.createObjectStore(STORE_SCANS, { keyPath: 'id', autoIncrement: true });
        scanStore.createIndex('status', 'status', { unique: false });
        scanStore.createIndex('timestamp', 'timestamp', { unique: false });
        scanStore.createIndex('barcode', 'barcode', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_STUDENTS)) {
        const studentStore = db.createObjectStore(STORE_STUDENTS, { keyPath: 'id' });
        studentStore.createIndex('nisn', 'nisn', { unique: false });
        studentStore.createIndex('qr_code', 'qr_code', { unique: false });
        studentStore.createIndex('nis', 'nis', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('[KioskStorage] Failed to open IndexedDB:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * 1. IDENTIFIKASI KIOSK BERBASIS PERSISTENT UUID (BUKAN IP ADDRESS)
 * Memeriksa terminal_id di LocalStorage secara permanen.
 * Jika belum ada, auto-generate kode unik UUID permanen format "KIOSK-POS-[RANDOM_STRING]".
 */
export function getTerminalId(): string {
  let terminalId = '';
  try {
    if (typeof localStorage !== 'undefined') {
      terminalId = localStorage.getItem('terminal_id') || '';
    }
  } catch (e) {}

  if (!terminalId) {
    terminalId = safeStorage.getItem('kiosk_terminal_id') || '';
  }

  if (!terminalId) {
    // Format: KIOSK-POS-[RANDOM_STRING] (Persistent UUID)
    let randomPart = '';
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      try {
        randomPart = crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase();
      } catch (e) {}
    }
    if (!randomPart) {
      const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
      const timeHex = Date.now().toString(36).substring(3, 7).toUpperCase();
      randomPart = `${randomHex}${timeHex}`;
    }
    terminalId = `KIOSK-POS-${randomPart}`;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('terminal_id', terminalId);
      }
    } catch (e) {}
    safeStorage.setItem('kiosk_terminal_id', terminalId);
  } else {
    // Sinkronkan kedua key agar selalu ada
    try {
      if (typeof localStorage !== 'undefined' && !localStorage.getItem('terminal_id')) {
        localStorage.setItem('terminal_id', terminalId);
      }
    } catch (e) {}
    safeStorage.setItem('kiosk_terminal_id', terminalId);
  }

  return terminalId;
}

export function setTerminalId(newId: string): void {
  const clean = newId.trim().toUpperCase() || 'KIOSK-POS-DEFAULT';
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('terminal_id', clean);
    }
  } catch (e) {}
  safeStorage.setItem('kiosk_terminal_id', clean);
}

/**
 * 2. KALIBRASI WAKTU KIOSK (CLOCK OFFSET DENGAN SERVER)
 * Menghitung selisih waktu antara jam lokal DietPi dan server resmi dengan memperhitungkan RTT latency.
 */
export async function calibrateServerClock(): Promise<number> {
  try {
    const t0 = Date.now();
    const res = await axios.get('/api/time', { timeout: 3500 });
    const t1 = Date.now();

    if (res.data && res.data.serverTime) {
      const serverTimestamp = new Date(res.data.serverTime).getTime();
      const latency = Math.max(0, (t1 - t0) / 2);
      const calculatedOffset = Math.round((serverTimestamp + latency) - t1);

      clockOffsetMs = calculatedOffset;
      safeStorage.setItem('kiosk_clock_offset_ms', String(calculatedOffset));
      console.log(`[ClockCalibration] Server clock calibrated. Delta offset: ${calculatedOffset}ms`);
      return calculatedOffset;
    }
  } catch (err) {
    console.warn('[ClockCalibration] Could not calibrate clock with server, using previous offset:', clockOffsetMs);
  }
  return clockOffsetMs;
}

export function getClockOffset(): number {
  return clockOffsetMs;
}

/**
 * Mendapatkan Date yang telah terkalibrasi dengan jam server
 */
export function getCalibratedDate(): Date {
  return new Date(Date.now() + clockOffsetMs);
}

/**
 * Mendapatkan ISO string waktu yang telah terkalibrasi
 */
export function getCalibratedISOString(): string {
  return getCalibratedDate().toISOString();
}

/**
 * Simpan data siswa ke cache IndexedDB untuk pencarian offline instan
 */
export async function cacheStudents(students: CachedStudentItem[]): Promise<void> {
  try {
    const db = await initKioskStorage();
    const tx = db.transaction(STORE_STUDENTS, 'readwrite');
    const store = tx.objectStore(STORE_STUDENTS);

    for (const student of students) {
      if (student && student.id) {
        store.put(student);
      }
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[KioskStorage] Failed to cache students:', err);
  }
}

/**
 * Cari data siswa secara offline dari cache IndexedDB
 */
export async function lookupStudentOffline(barcode: string): Promise<CachedStudentItem | null> {
  try {
    const clean = barcode.trim();
    const db = await initKioskStorage();
    const tx = db.transaction(STORE_STUDENTS, 'readonly');
    const store = tx.objectStore(STORE_STUDENTS);

    return new Promise((resolve) => {
      // 1. Direct ID get
      const reqId = store.get(clean);
      reqId.onsuccess = () => {
        if (reqId.result) return resolve(reqId.result);

        // 2. Try NISN index
        const idxNisn = store.index('nisn');
        const reqNisn = idxNisn.get(clean);
        reqNisn.onsuccess = () => {
          if (reqNisn.result) return resolve(reqNisn.result);

          // 3. Try QR code index
          const idxQr = store.index('qr_code');
          const reqQr = idxQr.get(clean);
          reqQr.onsuccess = () => {
            if (reqQr.result) return resolve(reqQr.result);

            // 4. Try NIS index
            const idxNis = store.index('nis');
            const reqNis = idxNis.get(clean);
            reqNis.onsuccess = () => {
              if (reqNis.result) return resolve(reqNis.result);
              resolve(null);
            };
            reqNis.onerror = () => resolve(null);
          };
          reqQr.onerror = () => resolve(null);
        };
        reqNisn.onerror = () => resolve(null);
      };
      reqId.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
}

/**
 * Mencatat hasil scan ke antrean IndexedDB lokal saat offline
 */
export async function enqueueOfflineScan(params: {
  barcode: string;
  type: 'ARRIVAL' | 'DEPARTURE';
  cachedStudent?: CachedStudentItem | null;
}): Promise<OfflineScanItem> {
  const db = await initKioskStorage();
  const terminalId = getTerminalId();
  const calibratedTimestamp = getCalibratedISOString();
  const localTimestamp = new Date().toISOString();

  let studentName = params.cachedStudent?.name;
  let studentClass = params.cachedStudent ? `${params.cachedStudent.year || ''} ${params.cachedStudent.class || ''}`.trim() : '';

  if (!studentName) {
    const found = await lookupStudentOffline(params.barcode);
    if (found) {
      studentName = found.name;
      studentClass = `${found.year || ''} ${found.class || ''}`.trim();
    }
  }

  const record: OfflineScanItem = {
    barcode: params.barcode.trim(),
    timestamp: calibratedTimestamp,
    localTimestamp: localTimestamp,
    clockOffsetMs: clockOffsetMs,
    type: params.type,
    terminalId: terminalId,
    status: 'pending',
    createdAt: Date.now(),
    studentName: studentName || `Siswa (${params.barcode})`,
    studentClass: studentClass || 'Antrean Offline'
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SCANS, 'readwrite');
    const store = tx.objectStore(STORE_SCANS);
    const req = store.add(record);

    req.onsuccess = (e) => {
      record.id = (e.target as IDBRequest).result as number;
      resolve(record);
    };

    req.onerror = () => {
      reject(req.error);
    };
  });
}

/**
 * Mendapatkan jumlah rekaman antrean yang berstatus 'pending'
 */
export async function getPendingScansCount(): Promise<number> {
  try {
    const db = await initKioskStorage();
    const tx = db.transaction(STORE_SCANS, 'readonly');
    const store = tx.objectStore(STORE_SCANS);
    const index = store.index('status');
    const req = index.count('pending');

    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    });
  } catch (err) {
    return 0;
  }
}

/**
 * Mengambil rekaman antrean 'pending' secara FIFO
 */
export async function getPendingScans(limit = 100): Promise<OfflineScanItem[]> {
  try {
    const db = await initKioskStorage();
    const tx = db.transaction(STORE_SCANS, 'readonly');
    const store = tx.objectStore(STORE_SCANS);
    const index = store.index('status');
    const req = index.getAll('pending', limit);

    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        const items = (req.result || []) as OfflineScanItem[];
        // Sort FIFO based on ID / createdAt ASC
        items.sort((a, b) => (a.id || 0) - (b.id || 0));
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    return [];
  }
}

/**
 * Menghapus rekaman yang telah berhasil dikonfirmasi oleh server
 */
export async function removeScansFromQueue(ids: number[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  const db = await initKioskStorage();
  const tx = db.transaction(STORE_SCANS, 'readwrite');
  const store = tx.objectStore(STORE_SCANS);

  for (const id of ids) {
    store.delete(id);
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * 3. SINKRONISASI BATCH SAAT JARINGAN PULIH
 * Mengirimkan data dalam kumpulan kecil (batch 10-15 rekaman) dengan jeda 300-500ms
 */
export async function syncOfflineQueueBatch(
  onProgress?: (synced: number, total: number) => void
): Promise<{
  success: boolean;
  totalProcessed: number;
  totalDuplicates: number;
  remaining: number;
}> {
  const pendingItems = await getPendingScans(250);
  if (pendingItems.length === 0) {
    return { success: true, totalProcessed: 0, totalDuplicates: 0, remaining: 0 };
  }

  const BATCH_SIZE = 12;
  const terminalId = getTerminalId();
  let totalProcessed = 0;
  let totalDuplicates = 0;

  for (let i = 0; i < pendingItems.length; i += BATCH_SIZE) {
    const batch = pendingItems.slice(i, i + BATCH_SIZE);

    try {
      const response = await axios.post('/api/attendance/sync-batch', {
        terminalId,
        records: batch.map(b => ({
          id: b.id,
          localId: b.id,
          barcode: b.barcode,
          timestamp: b.timestamp,
          type: b.type
        }))
      }, { timeout: 10000 });

      if (response.data && response.data.success) {
        const results = response.data.results || [];
        const successIds: number[] = [];

        for (const resItem of results) {
          if (resItem.success && resItem.localId) {
            successIds.push(Number(resItem.localId));
          }
        }

        // Hapus dari IndexedDB hanya setelah server merespons konfirmasi sukses
        await removeScansFromQueue(successIds);

        totalProcessed += (response.data.processedCount || 0);
        totalDuplicates += (response.data.duplicateCount || 0);

        if (onProgress) {
          onProgress(totalProcessed + totalDuplicates, pendingItems.length);
        }

        // Jeda waktu 350ms antar-batch agar tidak membebani server/jaringan DietPi
        if (i + BATCH_SIZE < pendingItems.length) {
          await new Promise((r) => setTimeout(r, 350));
        }
      } else {
        break; // Stop sync if batch failed
      }
    } catch (err) {
      console.warn('[KioskSync] Batch sync failed at index', i, err);
      break;
    }
  }

  const remaining = await getPendingScansCount();
  return {
    success: true,
    totalProcessed,
    totalDuplicates,
    remaining
  };
}

/**
 * 5. CADANGAN DARURAT: EKSPOR DATA ANTREAN KE JSON ATAU CSV
 */
export async function exportQueueToJson(): Promise<void> {
  const pendingItems = await getPendingScans(10000);
  const terminalId = getTerminalId();
  const dateStr = new Date().toISOString().substring(0, 10);

  const payload = {
    exportedAt: new Date().toISOString(),
    terminalId,
    clockOffsetMs,
    totalRecords: pendingItems.length,
    records: pendingItems
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `antrean_presensi_${terminalId}_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportQueueToCsv(): Promise<void> {
  const pendingItems = await getPendingScans(10000);
  const terminalId = getTerminalId();
  const dateStr = new Date().toISOString().substring(0, 10);

  let csvContent = 'ID,Barcode,Nama_Siswa,Kelas,Sesi,Timestamp_Kalibrasi,Timestamp_Lokal,Terminal_ID,Status\n';

  for (const item of pendingItems) {
    const row = [
      item.id || '',
      `"${item.barcode}"`,
      `"${item.studentName || ''}"`,
      `"${item.studentClass || ''}"`,
      item.type,
      item.timestamp,
      item.localTimestamp,
      item.terminalId,
      item.status
    ];
    csvContent += row.join(',') + '\n';
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `antrean_presensi_${terminalId}_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
