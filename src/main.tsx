import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import axios from 'axios';
import { safeStorage } from './safeStorage.ts';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import App from './App.tsx';
import './index.css';

// Interseptor Global Axios: Lampirkan Tiket Digital (JWT) secara otomatis ke setiap permintaan
axios.interceptors.request.use((config) => {
  const token = safeStorage.getItem('admin_token') || 
                safeStorage.getItem('guru_token') || 
                safeStorage.getItem('piket_token') || 
                safeStorage.getItem('token');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interseptor Respon Global Axios: Tangani kedaluwarsa sesi (401/403) dan alihkan ke login
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      const isPreview = safeStorage.getItem('is_preview_mode') === 'true';
      if (!isPreview) {
        const path = window.location.pathname;
        if (path.startsWith('/admin')) {
          safeStorage.removeItem('auth');
          safeStorage.removeItem('user');
          safeStorage.removeItem('token');
          safeStorage.removeItem('admin_token');
          window.location.href = '/login';
        } else if (path.startsWith('/guru')) {
          safeStorage.removeItem('guru_auth');
          safeStorage.removeItem('guru_user');
          safeStorage.removeItem('guru_token');
          window.location.href = '/guru/login';
        } else if (path.startsWith('/piket')) {
          safeStorage.removeItem('piket_auth');
          safeStorage.removeItem('piket_user');
          safeStorage.removeItem('piket_token');
          window.location.href = '/piket';
        } else if (path.startsWith('/siswa')) {
          safeStorage.removeItem('siswa_auth');
          safeStorage.removeItem('siswa_user');
          safeStorage.removeItem('siswa_token');
          window.location.href = '/siswa/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
