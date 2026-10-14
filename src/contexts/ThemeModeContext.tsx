import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { THEME_PRESETS, ThemePreset, resolvePresetId } from '../theme';
import { safeStorage } from '../safeStorage';

export type PortalKey = 'admin' | 'teacher' | 'picket' | 'scanner';

export function detectPortalFromPath(pathname: string): PortalKey {
  if (!pathname) return 'scanner';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/guru')) return 'teacher';
  if (pathname.startsWith('/piket')) return 'picket';
  return 'scanner';
}

export function computeThemePreset(activePreset: ThemePreset, presetId: string, isDark: boolean): ThemePreset {
  if (presetId === 'aqua_glass') {
    if (isDark) {
      return {
        ...activePreset,
        isDark: true,
        primary: '#38bdf8',
        secondary: '#34d399',
        accent: '#38bdf8',
        sidebarBg: 'rgba(15, 23, 42, 0.65)',
        sidebarActiveGradient: 'linear-gradient(135deg, rgba(56, 189, 248, 0.4), rgba(2, 132, 199, 0.6))',
        bgDefault: '#030712',
        bgPaper: 'rgba(15, 23, 42, 0.58)',
        cardBg: 'rgba(15, 23, 42, 0.56)',
        glassBg: 'rgba(15, 23, 42, 0.55)',
        headerBg: 'rgba(15, 23, 42, 0.60)',
        tableHeaderBg: 'rgba(30, 41, 59, 0.65)',
        textColorPrimary: '#f8fafc',
        textColorSecondary: '#94a3b8',
        glassBorder: 'rgba(255, 255, 255, 0.14)',
        headerBorder: 'rgba(255, 255, 255, 0.12)',
        glassShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.50), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        accentGlow: '0 0 24px rgba(56, 189, 248, 0.45)',
        tableRowHover: 'rgba(255, 255, 255, 0.06)'
      };
    } else {
      return {
        ...activePreset,
        isDark: false,
        primary: '#0284c7',
        secondary: '#059669',
        accent: '#0284c7',
        sidebarBg: 'rgba(255, 255, 255, 0.70)',
        sidebarActiveGradient: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
        bgDefault: '#f0fdfa',
        bgPaper: 'rgba(255, 255, 255, 0.65)',
        cardBg: 'rgba(255, 255, 255, 0.60)',
        glassBg: 'rgba(255, 255, 255, 0.62)',
        headerBg: 'rgba(255, 255, 255, 0.68)',
        tableHeaderBg: 'rgba(240, 253, 250, 0.75)',
        textColorPrimary: '#0f172a',
        textColorSecondary: '#334155',
        glassBorder: 'rgba(255, 255, 255, 0.75)',
        headerBorder: 'rgba(255, 255, 255, 0.70)',
        glassShadow: '0 8px 32px 0 rgba(2, 132, 199, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        accentGlow: '0 0 20px rgba(2, 132, 199, 0.25)',
        tableRowHover: 'rgba(255, 255, 255, 0.45)'
      };
    }
  }

  if (isDark && !activePreset.isDark) {
    return {
      ...activePreset,
      isDark: true,
      bgDefault: '#0b0f19',
      bgPaper: '#111827',
      cardBg: 'rgba(17, 24, 39, 0.90)',
      glassBg: 'rgba(17, 24, 39, 0.80)',
      headerBg: 'rgba(17, 24, 39, 0.88)',
      tableHeaderBg: 'rgba(30, 41, 59, 0.90)',
      textColorPrimary: '#f8fafc',
      textColorSecondary: '#94a3b8',
      glassBorder: 'rgba(255, 255, 255, 0.12)',
      headerBorder: 'rgba(255, 255, 255, 0.12)',
      glassShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
      accentGlow: '0 0 20px rgba(6, 182, 212, 0.35)',
      tableRowHover: 'rgba(255, 255, 255, 0.05)'
    };
  } else if (!isDark && activePreset.isDark) {
    return {
      ...activePreset,
      isDark: false,
      bgDefault: '#f8fafc',
      bgPaper: '#ffffff',
      cardBg: '#ffffff',
      glassBg: 'rgba(255, 255, 255, 0.90)',
      headerBg: 'rgba(255, 255, 255, 0.90)',
      tableHeaderBg: '#f1f5f9',
      textColorPrimary: '#0f172a',
      textColorSecondary: '#64748b',
      glassBorder: '#e2e8f0',
      headerBorder: '#e2e8f0',
      glassShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
      accentGlow: '0 4px 16px rgba(26, 115, 232, 0.25)',
      tableRowHover: '#f8fafc'
    };
  }
  return activePreset;
}

interface ThemeModeContextValue {
  presetId: string;
  activePreset: ThemePreset;
  portalDarkStates: Record<PortalKey, boolean>;
  toggleDark: (portal?: PortalKey) => void;
  setPortalDark: (portal: PortalKey, isDark: boolean) => void;
  setTheme: (id: string, customColor?: string) => Promise<void>;
  currentPath: string;
}

const ThemeModeContext = createContext<ThemeModeContextValue>({
  presetId: 'indigo',
  activePreset: THEME_PRESETS.indigo,
  portalDarkStates: {
    admin: false,
    teacher: false,
    picket: false,
    scanner: false
  },
  toggleDark: () => {},
  setPortalDark: () => {},
  setTheme: async () => {},
  currentPath: '/'
});

export const ThemeModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [presetId, setPresetId] = useState<string>(() => {
    const saved = safeStorage.getItem('appThemePreset', 'indigo') || 'indigo';
    return resolvePresetId(saved);
  });

  const [customColor, setCustomColor] = useState<string>(() => {
    return safeStorage.getItem('appThemeColor', '') || '';
  });

  const [currentPath, setCurrentPath] = useState<string>(() => {
    return typeof window !== 'undefined' ? window.location.pathname : '/';
  });

  // Independent portal dark states
  const [portalDarkStates, setPortalDarkStates] = useState<Record<PortalKey, boolean>>(() => {
    return {
      admin: safeStorage.getItem('adminDarkMode') === 'true',
      teacher: safeStorage.getItem('teacherDarkMode') === 'true' || safeStorage.getItem('guruThemeMode') === 'dark',
      picket: safeStorage.getItem('picketDarkMode') === 'true',
      scanner: safeStorage.getItem('scannerDarkMode') === 'true'
    };
  });

  const activePreset = THEME_PRESETS[presetId] || THEME_PRESETS.indigo;

  // Track URL pathname changes dynamically
  useEffect(() => {
    const handleLocation = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocation);

    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && window.location.pathname !== currentPath) {
        setCurrentPath(window.location.pathname);
      }
    }, 200);

    return () => {
      window.removeEventListener('popstate', handleLocation);
      clearInterval(interval);
    };
  }, [currentPath]);

  // Sync settings and storage updates
  useEffect(() => {
    const handleStorageOrThemeChange = () => {
      const savedPreset = safeStorage.getItem('appThemePreset', 'indigo') || 'indigo';
      setPresetId(resolvePresetId(savedPreset));
      setCustomColor(safeStorage.getItem('appThemeColor', '') || '');

      setPortalDarkStates({
        admin: safeStorage.getItem('adminDarkMode') === 'true',
        teacher: safeStorage.getItem('teacherDarkMode') === 'true' || safeStorage.getItem('guruThemeMode') === 'dark',
        picket: safeStorage.getItem('picketDarkMode') === 'true',
        scanner: safeStorage.getItem('scannerDarkMode') === 'true'
      });
    };

    window.addEventListener('themeChanged', handleStorageOrThemeChange);
    window.addEventListener('storage', handleStorageOrThemeChange);
    window.addEventListener('portalThemeChanged', handleStorageOrThemeChange);

    axios.get('/api/settings').then(res => {
      if (res.data) {
        const sPreset = res.data.themePreset || res.data.theme_preset || res.data.appTheme;
        const sColor = res.data.themeColor || res.data.theme_color;
        if (sPreset) {
          const resolved = resolvePresetId(sPreset);
          safeStorage.setItem('appThemePreset', resolved);
          if (sColor) safeStorage.setItem('appThemeColor', sColor);
          setPresetId(resolved);
          if (sColor) setCustomColor(sColor);
        }
      }
    }).catch(() => {});

    return () => {
      window.removeEventListener('themeChanged', handleStorageOrThemeChange);
      window.removeEventListener('storage', handleStorageOrThemeChange);
      window.removeEventListener('portalThemeChanged', handleStorageOrThemeChange);
    };
  }, []);

  const setPortalDark = (portal: PortalKey, isDark: boolean) => {
    setPortalDarkStates(prev => ({ ...prev, [portal]: isDark }));
    if (portal === 'admin') safeStorage.setItem('adminDarkMode', String(isDark));
    if (portal === 'teacher') {
      safeStorage.setItem('teacherDarkMode', String(isDark));
      safeStorage.setItem('guruThemeMode', isDark ? 'dark' : 'light');
    }
    if (portal === 'picket') safeStorage.setItem('picketDarkMode', String(isDark));
    if (portal === 'scanner') safeStorage.setItem('scannerDarkMode', String(isDark));

    window.dispatchEvent(new CustomEvent('portalThemeChanged', { detail: { portal, isDark } }));
  };

  const toggleDark = (portal?: PortalKey) => {
    const targetPortal = portal || detectPortalFromPath(currentPath);
    const nextDark = !portalDarkStates[targetPortal];
    setPortalDark(targetPortal, nextDark);
  };

  // Determine effective dark mode for active screen
  const currentPortal = detectPortalFromPath(currentPath);
  const isCurrentDark = Boolean(portalDarkStates[currentPortal]);
  const currentComputedPreset = useMemo(() => {
    return computeThemePreset(activePreset, presetId, isCurrentDark);
  }, [activePreset, presetId, isCurrentDark]);

  // Set HTML root & body attributes/classes for Tailwind and global backgrounds
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    Array.from(root.classList).forEach(cls => {
      if (cls.startsWith('theme-') || cls === 'dark' || cls === 'light') {
        root.classList.remove(cls);
      }
    });
    if (body) {
      Array.from(body.classList).forEach(cls => {
        if (cls.startsWith('theme-') || cls === 'dark' || cls === 'light') {
          body.classList.remove(cls);
        }
      });
    }

    root.classList.add(`theme-${presetId}`);
    if (body) body.classList.add(`theme-${presetId}`);

    if (isCurrentDark) {
      root.style.colorScheme = 'dark';
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
      if (body) {
        body.classList.add('dark');
        body.classList.remove('light');
      }
    } else {
      root.style.colorScheme = 'light';
      root.classList.add('light');
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      if (body) {
        body.classList.add('light');
        body.classList.remove('dark');
      }
    }

    // Dynamic CSS variables for high-contrast adaptive styling
    root.style.setProperty('--color-primary', currentComputedPreset.primary);
    root.style.setProperty('--color-primary-contrast', currentComputedPreset.contrastText || '#ffffff');
    root.style.setProperty('--color-secondary', currentComputedPreset.secondary);
    root.style.setProperty('--color-accent', currentComputedPreset.accent);
    root.style.setProperty('--bg-default', currentComputedPreset.bgDefault || '#f8fafc');
    root.style.setProperty('--bg-paper', currentComputedPreset.bgPaper || '#ffffff');
    root.style.setProperty('--card-bg', currentComputedPreset.cardBg || '#ffffff');
    root.style.setProperty('--glass-bg', currentComputedPreset.glassBg || 'rgba(255, 255, 255, 0.85)');
    root.style.setProperty('--header-bg', currentComputedPreset.headerBg || 'rgba(255, 255, 255, 0.88)');
    root.style.setProperty('--header-border', currentComputedPreset.headerBorder || 'rgba(255, 255, 255, 0.2)');
    root.style.setProperty('--text-primary', currentComputedPreset.textColorPrimary || '#0f172a');
    root.style.setProperty('--text-secondary', currentComputedPreset.textColorSecondary || '#475569');
    root.style.setProperty('--text-shadow-adaptive', currentComputedPreset.textShadow || 'none');
    root.style.setProperty('--glass-blur', currentComputedPreset.backdropBlur || 'blur(16px)');
    root.style.setProperty('--glass-border', currentComputedPreset.glassBorder || 'rgba(255, 255, 255, 0.2)');
    root.style.setProperty('--glass-shadow', currentComputedPreset.glassShadow || 'none');
    root.style.setProperty('--accent-glow', currentComputedPreset.accentGlow || 'none');
    root.style.setProperty('--badge-success-bg', currentComputedPreset.badgeSuccessBg || '#dcfce7');
    root.style.setProperty('--badge-success-text', currentComputedPreset.badgeSuccessColor || '#15803d');
    root.style.setProperty('--badge-warning-bg', currentComputedPreset.badgeWarningBg || '#fef3c7');
    root.style.setProperty('--badge-warning-text', currentComputedPreset.badgeWarningColor || '#b45309');
    root.style.setProperty('--badge-error-bg', currentComputedPreset.badgeErrorBg || '#fee2e2');
    root.style.setProperty('--badge-error-text', currentComputedPreset.badgeErrorColor || '#b91c1c');
  }, [presetId, currentComputedPreset, isCurrentDark]);

  const setTheme = async (newId: string, newColor?: string) => {
    const resolved = resolvePresetId(newId);
    setPresetId(resolved);
    safeStorage.setItem('appThemePreset', resolved);

    if (newColor !== undefined) {
      setCustomColor(newColor);
      safeStorage.setItem('appThemeColor', newColor);
    }

    window.dispatchEvent(new Event('themeChanged'));

    try {
      await axios.post('/api/settings', {
        themePreset: resolved,
        appTheme: resolved,
        themeColor: newColor !== undefined ? newColor : customColor
      });
    } catch (e) {
      console.warn('Gagal sinkron tema ke server:', e);
    }
  };

  return (
    <ThemeModeContext.Provider
      value={{
        presetId,
        activePreset,
        portalDarkStates,
        toggleDark,
        setPortalDark,
        setTheme,
        currentPath
      }}
    >
      {children}
    </ThemeModeContext.Provider>
  );
};

export const useAppTheme = (portalOverride?: PortalKey) => {
  const context = useContext(ThemeModeContext);
  const path = context.currentPath || (typeof window !== 'undefined' ? window.location.pathname : '');
  const portalKey = portalOverride || detectPortalFromPath(path);

  const isDark = Boolean(context.portalDarkStates[portalKey]);
  const preset = useMemo(() => {
    return computeThemePreset(context.activePreset, context.presetId, isDark);
  }, [context.activePreset, context.presetId, isDark]);

  return {
    presetId: context.presetId,
    preset,
    isDark,
    activePortal: portalKey,
    toggleDark: (p?: PortalKey) => context.toggleDark(p || portalKey),
    setPortalDark: context.setPortalDark,
    setTheme: context.setTheme,
    portalDarkStates: context.portalDarkStates
  };
};
