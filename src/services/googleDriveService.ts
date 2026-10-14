/**
 * Compatibility Adapter: Mengalihkan panggilan Google Drive ke Nextcloud WebDAV Service.
 * Seluruh ketergantungan library 'googleapis' telah dihapus sepenuhnya sesuai instruksi refaktor.
 */
import { nextcloudWebdavService, NextcloudConfig } from './nextcloudWebdavService.ts';

export interface GDriveConfig {
  client_id?: string;
  client_secret?: string;
  refresh_token?: string;
  client_email?: string;
  private_key?: string;
  project_id?: string;
  parent_folder_id?: string;
  is_configured?: boolean;
  auth_type?: 'oauth2' | 'service_account';
  nextcloud?: NextcloudConfig;
}

export interface UploadResult {
  fileId: string;
  fileName: string;
  webViewLink: string;
  webContentLink?: string;
  isDrive: boolean;
}

class GoogleDriveServiceCompat {
  public async getConfig(): Promise<any> {
    const nc = await nextcloudWebdavService.getConfig();
    return {
      is_configured: nc.is_configured,
      auth_type: 'nextcloud_webdav',
      server_url: nc.server_url,
      username: nc.username,
      base_path: nc.base_path,
      nextcloud: nc
    };
  }

  public async saveConfig(data: any): Promise<any> {
    return nextcloudWebdavService.saveConfig(data);
  }

  public async testConnection(customConfig?: any): Promise<any> {
    return nextcloudWebdavService.testConnection(customConfig);
  }

  public async uploadFile(
    filePath: string,
    fileName: string,
    mimeType: string,
    tahunAjaran: string,
    semester: string,
    teacherFolder?: string,
    mapelFolder?: string
  ): Promise<UploadResult> {
    const res = await nextcloudWebdavService.uploadFile(
      filePath,
      fileName,
      mimeType,
      tahunAjaran,
      semester,
      teacherFolder || 'Guru',
      mapelFolder
    );

    return {
      fileId: res.filePath,
      fileName: res.fileName,
      webViewLink: `/api/v1/perangkat/preview/file?path=${encodeURIComponent(res.filePath)}`,
      webContentLink: `/api/v1/perangkat/preview/file?path=${encodeURIComponent(res.filePath)}`,
      isDrive: false
    };
  }

  public async ensurePeriodFolder(tahunAjaran: string, semester: string): Promise<void> {
    return nextcloudWebdavService.ensurePeriodFolder(tahunAjaran, semester);
  }
}

export const googleDriveService = new GoogleDriveServiceCompat();
export default googleDriveService;
