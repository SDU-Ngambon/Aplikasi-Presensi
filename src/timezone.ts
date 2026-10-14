/**
 * Timezone Utility for Asia/Jakarta (WIB = UTC+7)
 * Menyeragamkan seluruh pencatatan tanggal dan waktu ke Waktu Indonesia Barat (WIB)
 */

export const TIMEZONE_WIB = 'Asia/Jakarta';

export const DAYS_INDO = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const MONTHS_INDO = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Mendapatkan tanggal dalam format YYYY-MM-DD di zona Asia/Jakarta
 */
export function getWIBDateString(date: Date | string | number = new Date()): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) {
    const now = new Date();
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE_WIB,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);
  }
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_WIB,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

/**
 * Mendapatkan jam saat ini dalam format HH:mm atau HH:mm:ss di zona Asia/Jakarta
 */
export function getWIBTimeString(date: Date | string | number = new Date(), withSeconds = false): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return '00:00';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE_WIB,
    hour: '2-digit',
    minute: '2-digit',
    second: withSeconds ? '2-digit' : undefined,
    hour12: false
  }).format(d);
}

/**
 * Mendapatkan nama hari bahasa Indonesia (Senin, Selasa, dll) di zona Asia/Jakarta
 */
export function getWIBDayName(date: Date | string | number = new Date()): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return 'Senin';
  const dayNameEn = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE_WIB,
    weekday: 'long'
  }).format(d);
  
  const dayMap: Record<string, string> = {
    'Sunday': 'Minggu',
    'Monday': 'Senin',
    'Tuesday': 'Selasa',
    'Wednesday': 'Rabu',
    'Thursday': 'Kamis',
    'Friday': 'Jumat',
    'Saturday': 'Sabtu'
  };
  return dayMap[dayNameEn] || 'Senin';
}

/**
 * Mendapatkan nama hari bahasa Inggris (Monday, Tuesday, dll) di zona Asia/Jakarta
 */
export function getWIBDayNameEnglish(date: Date | string | number = new Date()): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return 'Monday';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE_WIB,
    weekday: 'long'
  }).format(d);
}

/**
 * Mendapatkan indeks hari (1=Senin, ..., 7=Minggu) di zona Asia/Jakarta
 */
export function getWIBDayIndex(date: Date | string | number = new Date()): string {
  const dayName = getWIBDayName(date);
  const indexMap: Record<string, string> = {
    'Senin': '1',
    'Selasa': '2',
    'Rabu': '3',
    'Kamis': '4',
    'Jumat': '5',
    'Sabtu': '6',
    'Minggu': '7'
  };
  return indexMap[dayName] || '1';
}

/**
 * Mengubah ISO string / Date ke timestamp ISO dengan offset +07:00 (WIB)
 * Contoh output: 2026-09-18T06:30:15+07:00
 */
export function getWIBISOString(date: Date | string | number = new Date()): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) {
    const now = new Date();
    const dateStr = getWIBDateString(now);
    const timeStr = getWIBTimeString(now, true);
    return `${dateStr}T${timeStr}+07:00`;
  }
  const dateStr = getWIBDateString(d);
  const timeStr = getWIBTimeString(d, true);
  return `${dateStr}T${timeStr}+07:00`;
}

/**
 * Format tanggal standar Indonesia (DD/MM/YYYY) di zona Asia/Jakarta
 * Contoh output: 18/09/2026
 */
export function formatWIBDateDDMMYYYY(date: Date | string | number = new Date()): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) {
    // Coba periksa jika formatnya sudah YYYY-MM-DD
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
      const parts = date.split('T')[0].split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return '';
  }
  const dateStr = getWIBDateString(d);
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Format tanggal dan waktu standar Indonesia (DD/MM/YYYY HH:mm:ss) di zona Asia/Jakarta
 */
export function formatWIBDateTimeIndo(date: Date | string | number = new Date(), withSeconds = true): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return '';
  const dateFormatted = formatWIBDateDDMMYYYY(d);
  const timeFormatted = getWIBTimeString(d, withSeconds);
  return `${dateFormatted} ${timeFormatted}`;
}

/**
 * Format teks tanggal lengkap Indonesia (contoh: Senin, 18 September 2026)
 */
export function formatWIBDateIndo(date: Date | string | number = new Date()): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return '';
  const dayName = getWIBDayName(d);
  const dateStr = getWIBDateString(d);
  const [year, month, day] = dateStr.split('-').map(Number);
  const monthName = MONTHS_INDO[month - 1] || '';
  return `${dayName}, ${day} ${monthName} ${year}`;
}

