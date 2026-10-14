/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AttendanceScanner from './pages/AttendanceScanner';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Rombel from './pages/admin/Rombel';
import StudentsDB from './pages/admin/StudentsDB';
import TeachersDB from './pages/admin/TeachersDB';
import TeacherAccountsDB from './pages/admin/TeacherAccountsDB';
import UserAccountsDB from './pages/admin/UserAccountsDB';
import TugasTambahan from './pages/admin/TugasTambahan';
import GuruPiketDB from './pages/admin/GuruPiketDB';
import CardDesign from './pages/admin/CardDesign';
import PrintCards from './pages/admin/PrintCards';
import Reports from './pages/admin/Reports';
import Settings from './pages/admin/Settings';
import Database from './pages/admin/Database';
import KioskMonitoring from './pages/admin/KioskMonitoring';
import KbmData from './pages/admin/KbmData';
import AttendanceRules from './pages/admin/AttendanceRules';
import FreeAttendance from './pages/admin/FreeAttendance';
import TeacherAttendanceReports from './pages/admin/TeacherAttendanceReports';
import RealtimeTeacherAttendance from './pages/guru/RealtimeTeacherAttendance';
import RekapJurnalKbm from './pages/guru/RekapJurnalKbm';
import GuruPortal from './pages/guru/GuruPortal';
import PerangkatAjarAdmin from './pages/admin/PerangkatAjarAdmin';
import MataPelajaranDB from './pages/admin/MataPelajaranDB';
import Login from './pages/Login';
import PiketLogin from './pages/piket/PiketLogin';
import PiketDashboard from './pages/piket/PiketDashboard';
import GuruLogin from './pages/guru/GuruLogin';
import AturLms from './pages/admin/AturLms';
import Maintenance from './pages/admin/Maintenance';
import Pratinjau from './pages/admin/Pratinjau';
import PreviewModeBanner from './components/PreviewModeBanner';
import SiswaLayout from './pages/siswa/SiswaLayout';
import SiswaLogin from './pages/siswa/SiswaLogin';
import SiswaDashboard from './pages/siswa/SiswaDashboard';
import SiswaJadwalKbm from './pages/siswa/SiswaJadwalKbm';
import SiswaMateriTugas from './pages/siswa/SiswaMateriTugas';
import SiswaAsesmen from './pages/siswa/SiswaAsesmen';
import SiswaHasilBelajar from './pages/siswa/SiswaHasilBelajar';

import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { getAppTheme } from './theme';
import { ThemeModeProvider, useAppTheme } from './contexts/ThemeModeContext';
import ErrorBoundary from './components/ErrorBoundary';
import { safeStorage } from './safeStorage';
import { updateFavicon } from './utils/favicon';

import axios from 'axios';

// --- ROUTE GUARDS / PROTECTED ROUTES ---
function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const isAuth = safeStorage.getItem('auth') === 'true';
  let user = safeStorage.getJSON('user', null);
  const isPreview = safeStorage.getItem('is_preview_mode') === 'true';

  // Otomatis lengkapi data user admin jika tiket auth aktif namun user belum tersimpan di safeStorage
  if (isAuth && (!user || typeof user !== 'object')) {
    user = {
      id: 'admin_id',
      username: safeStorage.getItem('adminUsername') || 'admin',
      role: 'admin',
      name: 'Administrator'
    };
    safeStorage.setJSON('user', user);
  }

  // Jika sesi user admin tersimpan namun flag auth belum aktif, sinkronkan otomatis
  if (user && (user.role === 'admin' || user.role === 'ADMIN')) {
    if (!isAuth) {
      safeStorage.setItem('auth', 'true');
    }
  }

  const hasAdminAccess = isAuth || (user && (user.role === 'admin' || user.role === 'ADMIN')) || isPreview;
  if (!hasAdminAccess) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function ProtectedGuruRoute({ children }: { children: React.ReactNode }) {
  const isAuth = safeStorage.getItem('guru_auth') === 'true';
  const user = safeStorage.getJSON('guru_user', null);
  const isPreview = safeStorage.getItem('is_preview_mode') === 'true';
  if ((!isAuth || !user) && !isPreview) {
    return <Navigate to="/guru/login" replace />;
  }
  return <>{children}</>;
}

function ProtectedPiketRoute({ children }: { children: React.ReactNode }) {
  const isAuth = safeStorage.getItem('piket_auth') === 'true';
  const user = safeStorage.getJSON('piket_user', null);
  const isPreview = safeStorage.getItem('is_preview_mode') === 'true';
  if ((!isAuth || !user) && !isPreview) {
    return <Navigate to="/piket" replace />;
  }
  return <>{children}</>;
}

function ProtectedSiswaRoute({ children }: { children: React.ReactNode }) {
  const isAuth = safeStorage.getItem('siswa_auth') === 'true';
  const user = safeStorage.getJSON('siswa_user', null);
  const isPreview = safeStorage.getItem('is_preview_mode') === 'true';
  if ((!isAuth || !user) && !isPreview) {
    return <Navigate to="/siswa/login" replace />;
  }
  return <>{children}</>;
}

function PublicAdminLoginRoute({ children }: { children: React.ReactNode }) {
  const isAuth = safeStorage.getItem('auth') === 'true';
  const user = safeStorage.getJSON('user', null);
  const isPreview = safeStorage.getItem('is_preview_mode') === 'true';
  const hasAdminAccess = (isAuth || (user && (user.role === 'admin' || user.role === 'ADMIN'))) && !isPreview;
  if (hasAdminAccess) {
    return <Navigate to="/admin" replace />;
  }
  return <>{children}</>;
}

function PublicGuruLoginRoute({ children }: { children: React.ReactNode }) {
  const isAuth = safeStorage.getItem('guru_auth') === 'true';
  const user = safeStorage.getJSON('guru_user', null);
  if (isAuth && user) {
    return <Navigate to="/guru/portal" replace />;
  }
  return <>{children}</>;
}

function PublicPiketLoginRoute({ children }: { children: React.ReactNode }) {
  const isAuth = safeStorage.getItem('piket_auth') === 'true';
  const user = safeStorage.getJSON('piket_user', null);
  if (isAuth && user) {
    return <Navigate to="/piket/dashboard" replace />;
  }
  return <>{children}</>;
}

function DynamicAppThemeProvider({ children }: { children: React.ReactNode }) {
  const { presetId, isDark } = useAppTheme();
  const [customColor, setCustomColor] = useState(() => safeStorage.getItem('appThemeColor', '') || '');

  useEffect(() => {
    const handleThemeChange = () => {
      setCustomColor(safeStorage.getItem('appThemeColor', '') || '');
    };
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  const dynamicMuiTheme = useMemo(() => {
    return getAppTheme(presetId, customColor, isDark);
  }, [presetId, customColor, isDark]);

  return (
    <ThemeProvider theme={dynamicMuiTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

export default function App() {
  useEffect(() => {
    const handleFaviconChange = (e: any) => {
      if (e.detail?.favicon) updateFavicon(e.detail.favicon);
    };
    window.addEventListener('appFaviconUpdated', handleFaviconChange);

    // Sync theme preset and favicon from server settings on startup
    axios.get('/api/settings').then(res => {
      if (res.data) {
        const sPreset = res.data.themePreset || res.data.theme_preset;
        const sColor = res.data.themeColor || res.data.theme_color;
        if (sPreset) {
          safeStorage.setItem('appThemePreset', sPreset);
          if (sColor) safeStorage.setItem('appThemeColor', sColor);
          window.dispatchEvent(new Event('themeChanged'));
        }
        if (res.data.faviconBase64 || res.data.favicon) {
          updateFavicon(res.data.faviconBase64 || res.data.favicon);
        }
      }
    }).catch(() => {});

    return () => {
      window.removeEventListener('appFaviconUpdated', handleFaviconChange);
    };
  }, []);

  return (
    <ErrorBoundary fallbackTitle="Aplikasi Presensi">
      <ThemeModeProvider>
        <DynamicAppThemeProvider>
          <Toaster
            position="top-center"
            reverseOrder={false}
            gutter={8}
            containerStyle={{
              zIndex: 999999,
              top: 20
            }}
            toastOptions={{
              duration: 2200,
              success: { duration: 2200 },
              error: { duration: 2800 },
              style: {
                borderRadius: '12px',
                background: '#0f172a',
                color: '#f8fafc',
                fontSize: '13.5px',
                fontWeight: 600,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.4), 0 8px 10px -6px rgba(0,0,0,0.2)',
                cursor: 'pointer'
              }
            }}
          />
          <BrowserRouter>
            <PreviewModeBanner />
            <Routes>
              <Route path="/" element={<AttendanceScanner />} />
              <Route path="/scanner" element={<AttendanceScanner />} />
              <Route path="/portal-scanner" element={<AttendanceScanner />} />
              <Route path="/login" element={<PublicAdminLoginRoute><Login /></PublicAdminLoginRoute>} />
              <Route path="/admin/login" element={<PublicAdminLoginRoute><Login /></PublicAdminLoginRoute>} />
              <Route path="/piket" element={<PublicPiketLoginRoute><PiketLogin /></PublicPiketLoginRoute>} />
              <Route path="/piket/dashboard" element={<ProtectedPiketRoute><PiketDashboard /></ProtectedPiketRoute>} />
              <Route path="/guru" element={<ProtectedGuruRoute><GuruPortal /></ProtectedGuruRoute>} />
              <Route path="/guru/login" element={<PublicGuruLoginRoute><GuruLogin /></PublicGuruLoginRoute>} />
              <Route path="/guru/portal" element={<ProtectedGuruRoute><GuruPortal /></ProtectedGuruRoute>} />
              <Route path="/guru/presensi" element={<ProtectedGuruRoute><GuruPortal /></ProtectedGuruRoute>} />
              <Route path="/guru/kehadiran" element={<ProtectedGuruRoute><GuruPortal /></ProtectedGuruRoute>} />
              <Route path="/kehadiran-guru" element={<ProtectedGuruRoute><GuruPortal /></ProtectedGuruRoute>} />
              <Route path="/guru/*" element={<ProtectedGuruRoute><GuruPortal /></ProtectedGuruRoute>} />
              <Route 
                path="/admin" 
                element={
                  <ProtectedAdminRoute>
                    <AdminLayout />
                  </ProtectedAdminRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="rombel" element={<Rombel />} />
                <Route path="mata-pelajaran" element={<MataPelajaranDB />} />
                <Route path="students" element={<StudentsDB />} />
                <Route path="teachers" element={<TeachersDB />} />
                <Route path="tugas-tambahan" element={<TugasTambahan />} />
                <Route path="user-accounts" element={<UserAccountsDB />} />
                <Route path="akun-user" element={<UserAccountsDB />} />
                <Route path="teacher-accounts" element={<UserAccountsDB />} />
                <Route path="akun-guru" element={<UserAccountsDB />} />
                <Route path="guru-piket" element={<GuruPiketDB />} />
                <Route path="piket-schedule" element={<GuruPiketDB />} />
                <Route path="card-design" element={<CardDesign />} />
                <Route path="print-cards" element={<PrintCards />} />
                <Route path="kiosk-monitoring" element={<KioskMonitoring />} />
                <Route path="monitoring-kiosk" element={<KioskMonitoring />} />
                <Route path="reports" element={<Reports />} />
                <Route path="kbm-data" element={<KbmData />} />
                <Route path="attendance-rules" element={<AttendanceRules />} />
                <Route path="aturan-kehadiran" element={<AttendanceRules />} />
                <Route path="free-attendance" element={<FreeAttendance />} />
                <Route path="bebas-kehadiran" element={<FreeAttendance />} />
                <Route path="teacher-attendance-reports" element={<TeacherAttendanceReports />} />
                <Route path="laporan-kehadiran-guru" element={<TeacherAttendanceReports />} />
                <Route path="laporan-jurnal-kbm" element={<RekapJurnalKbm isMonitoring={true} showTeacherFilter={true} />} />
                <Route path="presensi-guru" element={<RealtimeTeacherAttendance />} />
                <Route path="perangkat-ajar" element={<PerangkatAjarAdmin />} />
                <Route path="atur-lms" element={<AturLms />} />
                <Route path="maintenance" element={<Maintenance />} />
                <Route path="maintanance" element={<Maintenance />} />
                <Route path="pratinjau" element={<Pratinjau />} />
                <Route path="preview" element={<Pratinjau />} />
                <Route path="settings" element={<Settings />} />
                <Route path="database" element={<Database />} />
              </Route>

              {/* PORTAL SISWA ROUTES */}
              <Route path="/login-siswa" element={<SiswaLogin />} />
              <Route path="/siswa/login" element={<SiswaLogin />} />
              <Route 
                path="/siswa" 
                element={
                  <ProtectedSiswaRoute>
                    <SiswaLayout />
                  </ProtectedSiswaRoute>
                }
              >
                <Route index element={<SiswaDashboard />} />
                <Route path="jadwal" element={<SiswaJadwalKbm />} />
                <Route path="materi-tugas" element={<SiswaMateriTugas />} />
                <Route path="asesmen" element={<SiswaAsesmen />} />
                <Route path="hasil-belajar" element={<SiswaHasilBelajar />} />
              </Route>
              <Route path="/portal-siswa" element={<Navigate to="/siswa" replace />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </DynamicAppThemeProvider>
      </ThemeModeProvider>
    </ErrorBoundary>
  );
}
