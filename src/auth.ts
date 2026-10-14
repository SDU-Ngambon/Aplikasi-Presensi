import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'presensi_jwt_secret_key_v1_secure_2026';
const JWT_EXPIRES_IN = '24h'; // Tiket digital resmi berbatas waktu 24 jam

export interface AuthTokenPayload {
  id?: string;
  username: string;
  role: 'admin' | 'GURU' | 'KEPALA_SEKOLAH' | 'WAKIL_KURIKULUM' | 'WAKIL_KESISWAAN' | 'GURU_BK' | 'WALI_KELAS' | 'admin_piket' | 'guru_piket' | 'SISWA' | string;
  name?: string;
  teacherId?: string;
  student_id?: string;
  studentId?: string;
  class?: string;
  nisn?: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

/**
 * Membuat tiket digital (JWT Token) resmi yang ditandatangani dan memiliki masa berlaku
 */
export function generateToken(payload: Omit<AuthTokenPayload, 'iat' | 'exp'>, expiresIn = JWT_EXPIRES_IN): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn as any });
}

/**
 * Memverifikasi keabsahan tiket digital
 */
export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    if (!token) return null;
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
    return jwt.verify(cleanToken, JWT_SECRET) as AuthTokenPayload;
  } catch (err) {
    return null;
  }
}

/**
 * Middleware untuk memverifikasi tiket digital pada setiap request penting
 */
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.split(' ')[1] 
    : (req.query?.token as string || req.body?.token as string);

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Tiket digital (Token Autentikasi) tidak ditemukan. Silakan login kembali.' 
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ 
      success: false, 
      error: 'Tiket digital tidak valid atau sudah kadaluarsa. Silakan login ulang.' 
    });
  }

  req.user = decoded;
  next();
}

/**
 * Middleware untuk memverifikasi bahwa pengakses adalah Admin yang sah
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.split(' ')[1] 
    : (req.query?.token as string || req.body?.token as string);

  // Jika token diberikan, verifikasi tiket digital
  if (token) {
    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Akses Ditolak: Tindakan ini memerlukan hak akses Administrator yang sah.' 
      });
    }
    req.user = decoded;
    return next();
  }

  // Jika tanpa token, tolak akses berbahaya
  return res.status(401).json({ 
    success: false, 
    error: 'Akses Ditolak: Anda harus login sebagai Administrator untuk melakukan tindakan ini.' 
  });
}
