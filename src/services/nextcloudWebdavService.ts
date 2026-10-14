import fs from 'fs';
import path from 'path';
import { createClient, WebDAVClient } from 'webdav';
import axios from 'axios';
import { safeDbQuery } from '../db.ts';

export interface NextcloudConfig {
  server_url: string;      // Contoh: http://192.168.1.100 atau https://nextcloud.sekolah.sch.id
  username: string;        // Contoh: admin / presensi_gateway
  password: string;        // App Password / Token Nextcloud
  base_path: string;       // Contoh: /Perangkat_Ajar
  is_configured?: boolean;
}

export interface UploadResult {
  success: boolean;
  filePath: string;
  fileName: string;
  fileSize?: number;
}

class NextcloudWebdavService {
  private cachedConfig: NextcloudConfig | null = null;
  private clientInstance: WebDAVClient | null = null;

  /**
   * Normalisasi server URL (menghilangkan trailing slash dan path dav jika ada)
   */
  public normalizeServerUrl(url: string): string {
    if (!url) return '';
    let clean = url.trim().replace(/\/+$/, '');
    // Jika user memasukkan path /remote.php/dav/files... secara tidak sengaja
    clean = clean.replace(/\/remote\.php\/dav.*$/i, '');
    return clean;
  }

  /**
   * Normalisasi base folder path (diawali slash, tanpa trailing slash)
   */
  public normalizeBasePath(basePath: string): string {
    if (!basePath || basePath.trim() === '' || basePath.trim() === '/') {
      return '/Perangkat_Ajar';
    }
    let clean = basePath.trim();
    if (!clean.startsWith('/')) {
      clean = '/' + clean;
    }
    return clean.replace(/\/+$/, '');
  }

  /**
   * Mengambil konfigurasi Nextcloud dari Env, file JSON, atau Database
   */
  public async getConfig(): Promise<NextcloudConfig> {
    if (this.cachedConfig && this.cachedConfig.is_configured) {
      return this.cachedConfig;
    }

    // 1. Cek Environment Variables
    const envUrl = process.env.NEXTCLOUD_SERVER_URL || process.env.NEXTCLOUD_URL;
    const envUser = process.env.NEXTCLOUD_USERNAME || process.env.NEXTCLOUD_USER;
    const envPass = process.env.NEXTCLOUD_PASSWORD || process.env.NEXTCLOUD_APP_PASSWORD || process.env.NEXTCLOUD_TOKEN;
    const envBase = process.env.NEXTCLOUD_BASE_PATH || '/Perangkat_Ajar';

    if (envUrl && envUser && envPass) {
      this.cachedConfig = {
        server_url: this.normalizeServerUrl(envUrl),
        username: envUser.trim(),
        password: envPass.trim(),
        base_path: this.normalizeBasePath(envBase),
        is_configured: true
      };
      return this.cachedConfig;
    }

    // 2. Cek dari file lokal ./data/nextcloud_config.json
    const localConfigPath = path.join(process.cwd(), 'data', 'nextcloud_config.json');
    if (fs.existsSync(localConfigPath)) {
      try {
        const content = fs.readFileSync(localConfigPath, 'utf8');
        const parsed = JSON.parse(content);
        if (parsed.server_url && parsed.username && parsed.password) {
          this.cachedConfig = {
            server_url: this.normalizeServerUrl(parsed.server_url),
            username: parsed.username.trim(),
            password: parsed.password.trim(),
            base_path: this.normalizeBasePath(parsed.base_path || '/Perangkat_Ajar'),
            is_configured: true
          };
          return this.cachedConfig;
        }
      } catch (e) {
        console.warn('[Nextcloud] Gagal membaca ./data/nextcloud_config.json:', e);
      }
    }

    // 3. Cek dari tabel khusus nextcloud_settings di Postgres
    try {
      const resSettings = await safeDbQuery(`SELECT * FROM nextcloud_settings WHERE id = 1 LIMIT 1`);
      if (resSettings.success && resSettings.rows.length > 0) {
        const row = resSettings.rows[0];
        if (row.server_url && row.username && row.password) {
          this.cachedConfig = {
            server_url: this.normalizeServerUrl(row.server_url),
            username: row.username.trim(),
            password: row.password.trim(),
            base_path: this.normalizeBasePath(row.base_path || '/Perangkat_Ajar'),
            is_configured: true
          };
          return this.cachedConfig;
        }
      }
    } catch (e) {}

    // 4. Cek dari database pengaturan (JSONB kolom data.nextcloud_config)
    try {
      const res = await safeDbQuery(`SELECT data FROM pengaturan WHERE id = 1 LIMIT 1`);
      if (res.success && res.rows.length > 0 && res.rows[0].data?.nextcloud_config) {
        const dbConf = res.rows[0].data.nextcloud_config;
        if (dbConf.server_url && dbConf.username && dbConf.password) {
          this.cachedConfig = {
            server_url: this.normalizeServerUrl(dbConf.server_url),
            username: dbConf.username.trim(),
            password: dbConf.password.trim(),
            base_path: this.normalizeBasePath(dbConf.base_path || '/Perangkat_Ajar'),
            is_configured: true
          };
          return this.cachedConfig;
        }
      }
    } catch (e) {
      console.warn('[Nextcloud] Gagal membaca config dari database pengaturan:', e);
    }

    // Default belum terkonfigurasi
    return {
      server_url: '',
      username: '',
      password: '',
      base_path: '/Perangkat_Ajar',
      is_configured: false
    };
  }

  /**
   * Menyimpan konfigurasi Nextcloud ke database dan file konfigurasi lokal
   */
  public async saveConfig(newConfig: Partial<NextcloudConfig>): Promise<{ success: boolean; message: string }> {
    const server_url = this.normalizeServerUrl(newConfig.server_url || '');
    const username = (newConfig.username || '').trim();
    const password = (newConfig.password || '').trim();
    const base_path = this.normalizeBasePath(newConfig.base_path || '/Perangkat_Ajar');

    if (!server_url || !username || !password) {
      throw new Error('Server URL, Username, dan App Password / Token wajib diisi.');
    }

    const conf: NextcloudConfig = {
      server_url,
      username,
      password,
      base_path,
      is_configured: true
    };

    // Update Cache
    this.cachedConfig = conf;
    this.clientInstance = null;

    // 1. Simpan ke file lokal ./data/nextcloud_config.json
    try {
      const dir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(path.join(dir, 'nextcloud_config.json'), JSON.stringify(conf, null, 2), 'utf8');
    } catch (e) {
      console.warn('[Nextcloud] Gagal menulis ke ./data/nextcloud_config.json:', e);
    }

    // 2. Simpan ke tabel nextcloud_settings (upsert)
    try {
      await safeDbQuery(`
        CREATE TABLE IF NOT EXISTS nextcloud_settings (
          id INT PRIMARY KEY DEFAULT 1,
          server_url TEXT,
          username TEXT,
          password TEXT,
          base_path TEXT DEFAULT '/Perangkat_Ajar',
          is_configured BOOLEAN DEFAULT FALSE,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await safeDbQuery(`
        INSERT INTO nextcloud_settings (id, server_url, username, password, base_path, is_configured, updated_at)
        VALUES (1, $1, $2, $3, $4, TRUE, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET
          server_url = EXCLUDED.server_url,
          username = EXCLUDED.username,
          password = EXCLUDED.password,
          base_path = EXCLUDED.base_path,
          is_configured = TRUE,
          updated_at = CURRENT_TIMESTAMP
      `, [server_url, username, password, base_path]);
    } catch (e) {
      console.warn('[Nextcloud] Gagal update tabel nextcloud_settings:', e);
    }

    // 3. Simpan ke JSONB pengaturan
    try {
      const cur = await safeDbQuery(`SELECT data FROM pengaturan WHERE id = 1 LIMIT 1`);
      let existingData = {};
      if (cur.success && cur.rows.length > 0 && cur.rows[0].data) {
        existingData = cur.rows[0].data;
      }
      const updatedData = { ...existingData, nextcloud_config: conf };
      await safeDbQuery(`UPDATE pengaturan SET data = $1 WHERE id = 1`, [JSON.stringify(updatedData)]);
    } catch (e) {
      console.warn('[Nextcloud] Gagal update JSONB pengaturan:', e);
    }

    return {
      success: true,
      message: 'Konfigurasi Nextcloud WebDAV berhasil disimpan.'
    };
  }

  /**
   * Membuat WebDAV client instance
   */
  public async getClient(customConfig?: Partial<NextcloudConfig>): Promise<{
    client: WebDAVClient;
    config: NextcloudConfig;
    remoteBaseUrl: string;
    authHeader: string;
  }> {
    const config = customConfig
      ? {
          server_url: this.normalizeServerUrl(customConfig.server_url || ''),
          username: (customConfig.username || '').trim(),
          password: (customConfig.password || '').trim(),
          base_path: this.normalizeBasePath(customConfig.base_path || '/Perangkat_Ajar'),
          is_configured: true
        }
      : await this.getConfig();

    if (!config.server_url || !config.username || !config.password) {
      throw new Error('Konfigurasi Nextcloud WebDAV belum lengkap (Server URL, Username, dan App Password wajib diisi).');
    }

    // Endpoint WebDAV resmi Nextcloud: /remote.php/dav/files/{username}
    const remoteBaseUrl = `${config.server_url}/remote.php/dav/files/${encodeURIComponent(config.username)}`;
    const authHeader = 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64');

    const client = createClient(remoteBaseUrl, {
      username: config.username,
      password: config.password,
      headers: {
        'OCS-APIREQUEST': 'true'
      }
    });

    return { client, config, remoteBaseUrl, authHeader };
  }

  /**
   * Uji Koneksi ke Nextcloud WebDAV menggunakan HTTP PROPFIND
   * Memvalidasi apakah kredensial dan base folder path valid dan dapat diakses.
   */
  public async testConnection(customConfig?: Partial<NextcloudConfig>): Promise<{
    success: boolean;
    message: string;
    server_url?: string;
    username?: string;
    base_path?: string;
    quota_info?: string;
    details?: any;
    troubleshooting?: string;
  }> {
    try {
      const { config, remoteBaseUrl, authHeader } = await this.getClient(customConfig);
      const cleanBasePath = this.normalizeBasePath(config.base_path);

      // 1. Tembak PROPFIND ke base folder Nextcloud
      const targetUrl = `${remoteBaseUrl}${cleanBasePath}`;
      const startTime = Date.now();

      let folderExists = false;
      let propfindResponse: any = null;

      try {
        propfindResponse = await axios({
          method: 'PROPFIND',
          url: targetUrl,
          headers: {
            'Authorization': authHeader,
            'Depth': '0',
            'Content-Type': 'application/xml; charset=utf-8'
          },
          timeout: 10000,
          validateStatus: (status) => status < 500
        });

        if (propfindResponse.status === 207 || propfindResponse.status === 200) {
          folderExists = true;
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          folderExists = false;
        } else {
          throw err;
        }
      }

      // 2. Jika base folder belum ada (404), uji root folder kredensialnya dahulu
      if (!folderExists) {
        const rootTestResponse = await axios({
          method: 'PROPFIND',
          url: remoteBaseUrl + '/',
          headers: {
            'Authorization': authHeader,
            'Depth': '0',
            'Content-Type': 'application/xml; charset=utf-8'
          },
          timeout: 10000,
          validateStatus: (status) => status < 500
        });

        if (rootTestResponse.status === 401 || rootTestResponse.status === 403) {
          return {
            success: false,
            message: 'Autentikasi Nextcloud gagal (HTTP ' + rootTestResponse.status + '). Username atau App Password salah.',
            server_url: config.server_url,
            username: config.username,
            base_path: cleanBasePath,
            troubleshooting: 'Pastikan Username dan App Password/Token Nextcloud sudah benar. Buat App Password di menu Nextcloud: Pengaturan Profil -> Keamanan -> Perangkat & Sesi -> Buat App Password baru.'
          };
        }

        if (rootTestResponse.status !== 200 && rootTestResponse.status !== 207) {
          return {
            success: false,
            message: `Nextcloud merespon status HTTP ${rootTestResponse.status}: ${rootTestResponse.statusText}`,
            server_url: config.server_url,
            username: config.username,
            base_path: cleanBasePath,
            troubleshooting: 'Periksa URL server Nextcloud dan pastikan modul WebDAV remote.php/dav aktif di server.'
          };
        }

        // Kredensial valid, coba buat folder utama (MKCOL) jika belum ada
        try {
          await this.ensureDirectoryRecursive(cleanBasePath, config);
          folderExists = true;
        } catch (createErr: any) {
          console.warn('[Nextcloud] Gagal membuat base folder saat uji coba:', createErr.message);
        }
      }

      const elapsedMs = Date.now() - startTime;

      return {
        success: true,
        message: folderExists
          ? `Koneksi Nextcloud WebDAV Berhasil! Folder utama "${cleanBasePath}" siap digunakan (${elapsedMs}ms).`
          : `Koneksi kredensial WebDAV Berhasil, namun folder "${cleanBasePath}" belum terbuat. Folder akan dibuat otomatis saat pertama kali file diunggah.`,
        server_url: config.server_url,
        username: config.username,
        base_path: cleanBasePath,
        details: {
          responseTimeMs: elapsedMs,
          folderExists
        }
      };
    } catch (error: any) {
      const status = error.response?.status;
      const errorMsg = error.response?.statusText || error.message || 'Gagal terhubung ke Nextcloud WebDAV';

      let troubleshooting = 'Periksa apakah server Nextcloud hidup, dapat diakses dari server aplikasi, dan URL serta kredensial diisi dengan benar.';
      if (status === 401) {
        troubleshooting = 'Username atau App Password / Token salah. Harap generate App Password baru di menu Keamanan Nextcloud.';
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        troubleshooting = 'Alamat server Nextcloud tidak dapat dijangkau. Pastikan IP / domain server benar dan port terbuka di jaringan.';
      } else if (error.code === 'ETIMEDOUT') {
        troubleshooting = 'Waktu koneksi ke server Nextcloud habis (Timeout). Pastikan jaringan atau firewall tidak memblokir akses.';
      }

      return {
        success: false,
        message: `Koneksi WebDAV Gagal: ${errorMsg}${status ? ` (HTTP ${status})` : ''}`,
        troubleshooting
      };
    }
  }

  /**
   * Membuat struktur direktori di Nextcloud secara bertahap / rekursif (MKCOL)
   */
  public async ensureDirectoryRecursive(
    targetFolderPath: string,
    customConfig?: Partial<NextcloudConfig>
  ): Promise<string> {
    const { client, remoteBaseUrl, authHeader } = await this.getClient(customConfig);
    const cleanPath = targetFolderPath.replace(/\/+/g, '/').replace(/\/+$/, '');
    if (!cleanPath || cleanPath === '/') return '/';

    const segments = cleanPath.split('/').filter(Boolean);
    let currentPath = '';

    for (const segment of segments) {
      currentPath += '/' + segment;

      try {
        const checkUrl = `${remoteBaseUrl}${currentPath}`;
        const checkRes = await axios({
          method: 'PROPFIND',
          url: checkUrl,
          headers: {
            'Authorization': authHeader,
            'Depth': '0'
          },
          validateStatus: (s) => s < 500,
          timeout: 8000
        });

        // Jika status 404 (belum ada), buat dengan MKCOL
        if (checkRes.status === 404) {
          await axios({
            method: 'MKCOL',
            url: checkUrl,
            headers: {
              'Authorization': authHeader
            },
            validateStatus: (s) => s === 201 || s === 405 || s === 200,
            timeout: 8000
          });
        }
      } catch (err: any) {
        // Fallback coba createDirectory dari library webdav
        try {
          const exists = await client.exists(currentPath);
          if (!exists) {
            await client.createDirectory(currentPath);
          }
        } catch (innerErr: any) {
          // Abaikan jika folder sudah ada (405 Method Not Allowed)
          if (!innerErr.message?.includes('405')) {
            console.warn(`[Nextcloud WebDAV] Warning creating directory "${currentPath}":`, innerErr.message);
          }
        }
      }
    }

    return cleanPath;
  }

  /**
   * Mengunggah berkas ke struktur folder otomatis Nextcloud WebDAV:
   * [Base_Folder]/[Tahun Ajaran]/Semester [Semester]/[Nama Guru]/[Mata Pelajaran]/[Nama Berkas]
   */
  public async uploadFile(
    fileSource: string | Buffer,
    fileName: string,
    mimeType: string,
    tahunAjaran: string,
    semester: string,
    teacherName: string,
    mapelName?: string
  ): Promise<UploadResult> {
    const config = await this.getConfig();
    if (!config.is_configured) {
      throw new Error('Server Nextcloud WebDAV belum dikonfigurasi. Silakan atur di menu Pengaturan Perangkat Ajar Admin.');
    }

    const { client, remoteBaseUrl, authHeader } = await this.getClient();

    // 1. Sanitasi nama segmen folder agar aman di WebDAV / URL
    const sanitizeFolder = (str: string) => (str || '').trim().replace(/[\\/:*?"<>|]/g, '_');
    const cleanTa = sanitizeFolder(tahunAjaran || '2025-2026').replace(/\//g, '-');
    
    let cleanSem = (semester || 'Ganjil').trim();
    if (!cleanSem.toLowerCase().startsWith('semester')) {
      cleanSem = `Semester ${cleanSem}`;
    }
    cleanSem = sanitizeFolder(cleanSem);

    const cleanTeacher = sanitizeFolder(teacherName || 'Guru_Umum');
    const cleanMapel = sanitizeFolder(mapelName || '_Perangkat_Pusat_Kurikulum');
    const cleanFileName = sanitizeFolder(fileName).replace(/^\.+/, '');

    // 2. Susun hierarki folder lengkap
    // [Base_Folder]/[Tahun Ajaran]/Semester [Semester]/[Nama Guru]/[Mata Pelajaran]
    const basePath = this.normalizeBasePath(config.base_path);
    const targetFolderPath = `${basePath}/${cleanTa}/${cleanSem}/${cleanTeacher}/${cleanMapel}`;

    // Pastikan seluruh tingkatan direktori ada (Recursive MKCOL)
    await this.ensureDirectoryRecursive(targetFolderPath);

    // 3. Siapkan buffer berkas dari memori / disk
    let fileBuffer: Buffer;
    if (Buffer.isBuffer(fileSource)) {
      fileBuffer = fileSource;
    } else if (typeof fileSource === 'string') {
      if (fs.existsSync(fileSource)) {
        fileBuffer = fs.readFileSync(fileSource);
      } else {
        throw new Error(`Berkas sementara tidak ditemukan di: ${fileSource}`);
      }
    } else {
      throw new Error('Format fileSource tidak valid (harus berupa Buffer atau file path string).');
    }

    // 4. Unggah berkas via HTTP PUT ke Nextcloud WebDAV
    const targetFilePath = `${targetFolderPath}/${cleanFileName}`;
    const uploadUrl = `${remoteBaseUrl}${targetFilePath}`;

    try {
      // Prioritas 1: Kirim langsung dengan Axios PUT
      await axios({
        method: 'PUT',
        url: uploadUrl,
        data: fileBuffer,
        headers: {
          'Authorization': authHeader,
          'Content-Type': mimeType || 'application/octet-stream',
          'Content-Length': fileBuffer.length
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 30000
      });
    } catch (putErr: any) {
      // Prioritas 2: Fallback ke client.putFileContents dari library webdav
      try {
        await client.putFileContents(targetFilePath, fileBuffer, { overwrite: true });
      } catch (fallbackErr: any) {
        throw new Error(`Gagal mengunggah file ke Nextcloud WebDAV: ${putErr.message || fallbackErr.message}`);
      }
    }

    // Hapus file sementara lokal jika berbentuk string path di tmpdir
    if (typeof fileSource === 'string' && fs.existsSync(fileSource)) {
      try {
        fs.unlinkSync(fileSource);
      } catch (e) {}
    }

    return {
      success: true,
      filePath: targetFilePath,
      fileName: cleanFileName,
      fileSize: fileBuffer.length
    };
  }

  /**
   * Mengambil file stream dari Nextcloud WebDAV untuk Streaming Proxy PDF
   */
  public async getFileStream(filePath: string): Promise<{
    stream: NodeJS.ReadableStream;
    contentType: string;
    contentLength?: string;
  }> {
    const { remoteBaseUrl, authHeader } = await this.getClient();
    const cleanPath = filePath.startsWith('/') ? filePath : '/' + filePath;
    const downloadUrl = `${remoteBaseUrl}${cleanPath}`;

    const response = await axios({
      method: 'GET',
      url: downloadUrl,
      headers: {
        'Authorization': authHeader
      },
      responseType: 'stream',
      timeout: 25000
    });

    const contentType = String(response.headers['content-type'] || 'application/pdf');
    const contentLength = response.headers['content-length'] ? String(response.headers['content-length']) : undefined;

    return {
      stream: response.data,
      contentType,
      contentLength
    };
  }

  /**
   * Memastikan folder periode terbuat saat tahun ajaran / semester diubah
   */
  public async ensurePeriodFolder(tahunAjaran: string, semester: string): Promise<void> {
    try {
      const config = await this.getConfig();
      if (!config.is_configured) return;

      const sanitize = (s: string) => (s || '').trim().replace(/[\\/:*?"<>|]/g, '_');
      const cleanTa = sanitize(tahunAjaran).replace(/\//g, '-');
      let cleanSem = sanitize(semester);
      if (!cleanSem.toLowerCase().startsWith('semester')) {
        cleanSem = `Semester ${cleanSem}`;
      }

      const basePath = this.normalizeBasePath(config.base_path);
      const periodPath = `${basePath}/${cleanTa}/${cleanSem}`;
      await this.ensureDirectoryRecursive(periodPath);
      await this.ensureDirectoryRecursive(`${periodPath}/_Perangkat_Pusat_Kurikulum`);
    } catch (e) {
      console.warn('[Nextcloud] Gagal memastikan folder periode:', e);
    }
  }
}

export const nextcloudWebdavService = new NextcloudWebdavService();
export default nextcloudWebdavService;
