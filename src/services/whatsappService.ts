import { getSettings } from '../dataStore';

export interface WhatsAppSendParams {
  url?: string;
  apiKey?: string;
  apiSecret?: string;
  provider?: string;
  phone: string;
  message: string;
}

export interface GatewayStatusInfo {
  is_configured: boolean;
  provider: string;
  url: string;
  masked_key: string;
  phone_sender?: string;
}

/**
 * Pengirim Pesan WhatsApp Universal melalui REST API Gateway
 * Mendukung Fonnte, Wablas, Starsender, dan Custom REST Gateway.
 */
export async function sendWhatsAppMessage({
  url,
  apiKey,
  apiSecret,
  provider,
  phone,
  message
}: WhatsAppSendParams): Promise<any> {
  if (!phone || !phone.trim()) {
    throw new Error('Nomor atau ID Grup WhatsApp tujuan wajib diisi.');
  }
  if (!message || !message.trim()) {
    throw new Error('Pesan WhatsApp tidak boleh kosong.');
  }

  const rawPhone = phone.trim();
  const isGroup = rawPhone.includes('@g.us') || rawPhone.includes('-group') || rawPhone.endsWith('@broadcast');
  let cleanPhone = rawPhone;
  if (!isGroup) {
    cleanPhone = rawPhone.replace(/\D/g, '');
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
  const detectedProvider = (provider || '').trim().toLowerCase() || (
    endpoint.includes('fonnte') ? 'fonnte' :
    endpoint.includes('wablas') ? 'wablas' :
    endpoint.includes('starsender') ? 'starsender' : 'custom'
  );

  const reqHeaders: Record<string, string> = {
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

  // Periksa respon internal status provider
  if (parsed && typeof parsed === 'object') {
    if (parsed.status === false || parsed.status === 'false' || parsed.status === 'failed' || parsed.status === 'error' || parsed.success === false) {
      const errDetail = parsed.reason || parsed.detail || parsed.message || parsed.error || (typeof parsed.data === 'string' ? parsed.data : '') || 'Gateway WhatsApp menolak transmisi pesan (Status: False/Failed)';
      throw new Error(errDetail);
    }
  }

  return parsed;
}

/**
 * Mengirim pesan WhatsApp menggunakan Gateway Utama dari Menu "Atur Gateway"
 */
export async function sendWhatsAppViaConfiguredGateway(
  phone: string,
  message: string,
  customSettings?: any
): Promise<any> {
  const settings = customSettings || await getSettings();
  const waKey = (settings?.waApiKey || settings?.wa_api_key || '').trim();
  const waUrl = (settings?.waApiUrl || settings?.wa_api_url || 'https://api.fonnte.com/send').trim();
  const waSecret = (settings?.waApiSecret || settings?.wa_api_secret || '').trim();
  const waProvider = (settings?.waProvider || settings?.wa_provider || 'fonnte').trim();

  if (!waKey) {
    throw new Error('Gateway WhatsApp utama belum dikonfigurasi. Silakan buka menu "Atur Gateway" pada Administrator untuk memasukkan API Key / Token WhatsApp.');
  }

  return await sendWhatsAppMessage({
    url: waUrl,
    apiKey: waKey,
    apiSecret: waSecret,
    provider: waProvider,
    phone,
    message
  });
}

/**
 * Mendapatkan info status kesiapan Gateway WhatsApp Utama
 */
export async function getWhatsAppGatewayStatus(): Promise<GatewayStatusInfo> {
  const settings = await getSettings();
  const waKey = (settings?.waApiKey || settings?.wa_api_key || '').trim();
  const waUrl = (settings?.waApiUrl || settings?.wa_api_url || 'https://api.fonnte.com/send').trim();
  const waProvider = (settings?.waProvider || settings?.wa_provider || 'fonnte').trim();
  const waSender = (settings?.waSenderPhone || settings?.wa_sender_phone || '').trim();

  const isConfigured = Boolean(waKey && waKey.length > 3);
  const maskedKey = isConfigured
    ? (waKey.length > 8 ? `${waKey.substring(0, 4)}••••${waKey.substring(waKey.length - 4)}` : '••••••••')
    : '';

  return {
    is_configured: isConfigured,
    provider: waProvider,
    url: waUrl,
    masked_key: maskedKey,
    phone_sender: waSender
  };
}

/**
 * Memformat pesan WhatsApp untuk Rekapitulasi Supervisi & Pengesahan Perangkat Ajar
 */
export function formatPerangkatSupervisiWhatsAppMessage({
  schoolName,
  tahunAjaran,
  semester,
  reports,
  appUrl,
  customNote
}: {
  schoolName: string;
  tahunAjaran: string;
  semester: string;
  reports: any[];
  appUrl?: string;
  customNote?: string;
}): string {
  const now = new Date();
  const formattedTime = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }) + ` pukul ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;

  const totalTeachers = reports.length;
  const totalDisahkan = reports.filter(r => r.status_pengesahan === 'DISAHKAN').length;
  const totalSiap = reports.filter(r => r.status_pengesahan === 'MENUNGGU_PENGESAHAN').length;
  const totalBelumLengkap = totalTeachers - totalDisahkan - totalSiap;

  const avgProgress = totalTeachers > 0
    ? Math.round(reports.reduce((acc, r) => acc + (r.persentase || 0), 0) / totalTeachers)
    : 0;

  let msg = `📊 *LAPORAN REKAPITULASI SUPERVISI PERANGKAT AJAR*\n`;
  msg += `🏫 *${schoolName.toUpperCase()}*\n`;
  msg += `📅 *Periode:* ${tahunAjaran} — *Semester:* ${semester}\n`;
  msg += `🕒 *Waktu Laporan:* ${formattedTime}\n\n`;

  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📈 *RINGKASAN STATISTIK SUPERVISI:*\n`;
  msg += `👥 Total Dewan Guru: *${totalTeachers} Orang*\n`;
  msg += `📊 Rata-rata Kelengkapan: *${avgProgress}%*\n`;
  msg += `✅ Telah Disahkan Kepsek: *${totalDisahkan} Guru*\n`;
  msg += `⏳ Menunggu Pengesahan: *${totalSiap} Guru*\n`;
  msg += `⚠️ Belum Lengkap / Telaah: *${totalBelumLengkap} Guru*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  msg += `📋 *RINCIAN STATUS GURU:*\n`;

  if (reports.length === 0) {
    msg += `_(Belum ada data guru pada periode ini)_\n`;
  } else {
    // Tampilkan rincian guru
    reports.forEach((r, idx) => {
      const mapelName = r.mapel_list && r.mapel_list.length > 0
        ? r.mapel_list.map((m: any) => m.mapel_name).join(', ')
        : (r.subject || r.class || 'Guru');

      let iconStatus = '⚠️';
      let textStatus = `${r.persentase || 0}%`;

      if (r.status_pengesahan === 'DISAHKAN') {
        iconStatus = '✅';
        textStatus = `DISAHKAN KEPSEK (${r.persentase || 100}%)`;
      } else if (r.status_pengesahan === 'MENUNGGU_PENGESAHAN' || r.persentase >= 100) {
        iconStatus = '⏳';
        textStatus = `Siap Disahkan (${r.persentase || 100}%)`;
      } else if (r.sudah_upload === 0) {
        iconStatus = '❌';
        textStatus = `Belum Upload (0%)`;
      } else if (r.perlu_revisi > 0) {
        iconStatus = '⚠️';
        textStatus = `${r.perlu_revisi} Perlu Revisi (${r.persentase || 0}%)`;
      } else if (r.menunggu_verifikasi > 0) {
        iconStatus = '🔍';
        textStatus = `${r.menunggu_verifikasi} Belum Telaah (${r.persentase || 0}%)`;
      }

      msg += `${idx + 1}. *${r.name}* [${mapelName}]\n`;
      msg += `   └ ${iconStatus} ${textStatus} • ${r.sudah_upload || 0}/${r.target_total || 0} Berkas\n`;
    });
  }

  if (customNote && customNote.trim()) {
    msg += `\n💬 *Catatan Khusus:*\n${customNote.trim()}\n`;
  }

  msg += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `ℹ️ _Laporan otomatis digenerate melalui Sistem Monitoring & Supervisi Perangkat Ajar._\n`;
  if (appUrl) {
    msg += `🌐 _Akses Aplikasi: ${appUrl}_\n`;
  }

  return msg;
}
