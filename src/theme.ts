import { createTheme, Theme } from '@mui/material/styles';

export interface ThemePreset {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  sidebarBg: string;
  sidebarActiveGradient: string;
  accent: string;
  description: string;
  isDark?: boolean;
  contrastText?: string;
  bgDefault?: string;
  bgPaper?: string;
  cardBg?: string;
  glassBg?: string;
  headerBg?: string;
  tableHeaderBg?: string;
  textColorPrimary?: string;
  textColorSecondary?: string;
  glassBorder?: string;
  textShadow?: string;
  backdropBlur?: string;
  badgeSuccessBg?: string;
  badgeSuccessColor?: string;
  badgeWarningBg?: string;
  badgeWarningColor?: string;
  badgeErrorBg?: string;
  badgeErrorColor?: string;
  glassShadow?: string;
  accentGlow?: string;
  headerBorder?: string;
  tableRowHover?: string;
}

export const THEME_PRESETS: Record<string, ThemePreset> = {
  indigo: {
    id: 'indigo',
    name: 'Modern Indigo (Default Tech)',
    primary: '#1A73E8',
    secondary: '#e91e63',
    sidebarBg: '#202940',
    sidebarActiveGradient: 'linear-gradient(195deg, #49a3f1, #1A73E8)',
    accent: '#49a3f1',
    description: 'Tampilan bersih, modern, dan profesional standar Google Material.',
    isDark: false,
    contrastText: '#ffffff',
    bgDefault: '#f8fafc',
    bgPaper: '#ffffff',
    cardBg: '#ffffff',
    glassBg: 'rgba(255, 255, 255, 0.90)',
    headerBg: 'rgba(255, 255, 255, 0.90)',
    tableHeaderBg: '#f1f5f9',
    textColorPrimary: '#0f172a',
    textColorSecondary: '#64748b',
    glassBorder: '#e2e8f0',
    backdropBlur: 'blur(16px)',
    badgeSuccessBg: '#dcfce7',
    badgeSuccessColor: '#15803d',
    badgeWarningBg: '#fef3c7',
    badgeWarningColor: '#b45309',
    badgeErrorBg: '#fee2e2',
    badgeErrorColor: '#b91c1c',
    glassShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
    accentGlow: '0 4px 16px rgba(26, 115, 232, 0.25)',
    headerBorder: '#e2e8f0',
    tableRowHover: '#f8fafc'
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Academy (Nuansa Edukasi)',
    primary: '#059669',
    secondary: '#d97706',
    sidebarBg: '#064e3b',
    sidebarActiveGradient: 'linear-gradient(195deg, #34d399, #059669)',
    accent: '#10b981',
    description: 'Warna hijau zamrud yang sejuk, prestisius, dan khas instansi pendidikan.',
    isDark: false,
    contrastText: '#ffffff',
    bgDefault: '#f8fafc',
    bgPaper: '#ffffff',
    cardBg: '#ffffff',
    glassBg: 'rgba(255, 255, 255, 0.90)',
    headerBg: 'rgba(255, 255, 255, 0.90)',
    tableHeaderBg: '#f1f5f9',
    textColorPrimary: '#0f172a',
    textColorSecondary: '#64748b',
    glassBorder: '#e2e8f0',
    backdropBlur: 'blur(16px)',
    badgeSuccessBg: '#dcfce7',
    badgeSuccessColor: '#15803d',
    badgeWarningBg: '#fef3c7',
    badgeWarningColor: '#b45309',
    badgeErrorBg: '#fee2e2',
    badgeErrorColor: '#b91c1c',
    glassShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
    accentGlow: '0 4px 16px rgba(5, 150, 105, 0.25)',
    headerBorder: '#e2e8f0',
    tableRowHover: '#f8fafc'
  },
  slate: {
    id: 'slate',
    name: 'Royal Slate (Modern Corporate)',
    primary: '#2563eb',
    secondary: '#06b6d4',
    sidebarBg: '#0f172a',
    sidebarActiveGradient: 'linear-gradient(195deg, #60a5fa, #2563eb)',
    accent: '#38bdf8',
    description: 'Warna biru navy dengan dark slate futuristik, rapi dan kontras tinggi.',
    isDark: false,
    contrastText: '#ffffff',
    bgDefault: '#f8fafc',
    bgPaper: '#ffffff',
    cardBg: '#ffffff',
    glassBg: 'rgba(255, 255, 255, 0.90)',
    headerBg: 'rgba(255, 255, 255, 0.90)',
    tableHeaderBg: '#f1f5f9',
    textColorPrimary: '#0f172a',
    textColorSecondary: '#64748b',
    glassBorder: '#e2e8f0',
    backdropBlur: 'blur(16px)',
    badgeSuccessBg: '#dcfce7',
    badgeSuccessColor: '#15803d',
    badgeWarningBg: '#fef3c7',
    badgeWarningColor: '#b45309',
    badgeErrorBg: '#fee2e2',
    badgeErrorColor: '#b91c1c',
    glassShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
    accentGlow: '0 4px 16px rgba(37, 99, 235, 0.25)',
    headerBorder: '#e2e8f0',
    tableRowHover: '#f8fafc'
  },
  violet: {
    id: 'violet',
    name: 'Violet Luxury (Estetik & Kreatif)',
    primary: '#7c3aed',
    secondary: '#ec4899',
    sidebarBg: '#1e1b4b',
    sidebarActiveGradient: 'linear-gradient(195deg, #a78bfa, #7c3aed)',
    accent: '#8b5cf6',
    description: 'Gradasi ungu mewah yang modern, estetik, dan elegan.',
    isDark: false,
    contrastText: '#ffffff',
    bgDefault: '#f8fafc',
    bgPaper: '#ffffff',
    cardBg: '#ffffff',
    glassBg: 'rgba(255, 255, 255, 0.90)',
    headerBg: 'rgba(255, 255, 255, 0.90)',
    tableHeaderBg: '#f1f5f9',
    textColorPrimary: '#0f172a',
    textColorSecondary: '#64748b',
    glassBorder: '#e2e8f0',
    backdropBlur: 'blur(16px)',
    badgeSuccessBg: '#dcfce7',
    badgeSuccessColor: '#15803d',
    badgeWarningBg: '#fef3c7',
    badgeWarningColor: '#b45309',
    badgeErrorBg: '#fee2e2',
    badgeErrorColor: '#b91c1c',
    glassShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
    accentGlow: '0 4px 16px rgba(124, 58, 237, 0.25)',
    headerBorder: '#e2e8f0',
    tableRowHover: '#f8fafc'
  },
  crimson: {
    id: 'crimson',
    name: 'Crimson Dynamic (Tegas & Aktif)',
    primary: '#dc2626',
    secondary: '#f97316',
    sidebarBg: '#3f0c0c',
    sidebarActiveGradient: 'linear-gradient(195deg, #f87171, #dc2626)',
    accent: '#ef4444',
    description: 'Kombinasi merah karmin yang tegas, berenergi, dan berwibawa.',
    isDark: false,
    contrastText: '#ffffff',
    bgDefault: '#f8fafc',
    bgPaper: '#ffffff',
    cardBg: '#ffffff',
    glassBg: 'rgba(255, 255, 255, 0.90)',
    headerBg: 'rgba(255, 255, 255, 0.90)',
    tableHeaderBg: '#f1f5f9',
    textColorPrimary: '#0f172a',
    textColorSecondary: '#64748b',
    glassBorder: '#e2e8f0',
    backdropBlur: 'blur(16px)',
    badgeSuccessBg: '#dcfce7',
    badgeSuccessColor: '#15803d',
    badgeWarningBg: '#fef3c7',
    badgeWarningColor: '#b45309',
    badgeErrorBg: '#fee2e2',
    badgeErrorColor: '#b91c1c',
    glassShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
    accentGlow: '0 4px 16px rgba(220, 38, 38, 0.25)',
    headerBorder: '#e2e8f0',
    tableRowHover: '#f8fafc'
  },
  amber: {
    id: 'amber',
    name: 'Sunset Amber (Hangat & Ramah)',
    primary: '#d97706',
    secondary: '#0284c7',
    sidebarBg: '#292524',
    sidebarActiveGradient: 'linear-gradient(195deg, #fbbf24, #d97706)',
    accent: '#f59e0b',
    description: 'Nuansa amber emas dan kopi hangat dengan kenyamanan visual tinggi.',
    isDark: false,
    contrastText: '#ffffff',
    bgDefault: '#f8fafc',
    bgPaper: '#ffffff',
    cardBg: '#ffffff',
    glassBg: 'rgba(255, 255, 255, 0.90)',
    headerBg: 'rgba(255, 255, 255, 0.90)',
    tableHeaderBg: '#f1f5f9',
    textColorPrimary: '#0f172a',
    textColorSecondary: '#64748b',
    glassBorder: '#e2e8f0',
    backdropBlur: 'blur(16px)',
    badgeSuccessBg: '#dcfce7',
    badgeSuccessColor: '#15803d',
    badgeWarningBg: '#fef3c7',
    badgeWarningColor: '#b45309',
    badgeErrorBg: '#fee2e2',
    badgeErrorColor: '#b91c1c',
    glassShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
    accentGlow: '0 4px 16px rgba(217, 119, 6, 0.25)',
    headerBorder: '#e2e8f0',
    tableRowHover: '#f8fafc'
  },
  teal: {
    id: 'teal',
    name: 'Teal Oceanic (Modern Tailwind)',
    primary: '#0d9488',
    secondary: '#06b6d4',
    sidebarBg: '#134e4a',
    sidebarActiveGradient: 'linear-gradient(195deg, #2dd4bf, #0d9488)',
    accent: '#14b8a6',
    description: 'Tema Tailwind Teal laut yang segar, tenang, dan kontemporer.',
    isDark: false,
    contrastText: '#ffffff',
    bgDefault: '#f8fafc',
    bgPaper: '#ffffff',
    cardBg: '#ffffff',
    glassBg: 'rgba(255, 255, 255, 0.90)',
    headerBg: 'rgba(255, 255, 255, 0.90)',
    tableHeaderBg: '#f1f5f9',
    textColorPrimary: '#0f172a',
    textColorSecondary: '#64748b',
    glassBorder: '#e2e8f0',
    backdropBlur: 'blur(16px)',
    badgeSuccessBg: '#dcfce7',
    badgeSuccessColor: '#15803d',
    badgeWarningBg: '#fef3c7',
    badgeWarningColor: '#b45309',
    badgeErrorBg: '#fee2e2',
    badgeErrorColor: '#b91c1c',
    glassShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
    accentGlow: '0 4px 16px rgba(13, 148, 136, 0.25)',
    headerBorder: '#e2e8f0',
    tableRowHover: '#f8fafc'
  },
  rose: {
    id: 'rose',
    name: 'Rose Elegance (Kreatif & Elegan)',
    primary: '#e11d48',
    secondary: '#f43f5e',
    sidebarBg: '#4c0519',
    sidebarActiveGradient: 'linear-gradient(195deg, #fb7185, #e11d48)',
    accent: '#f43f5e',
    description: 'Warna mawar modern yang energik, ramah, dan memukau.',
    isDark: false,
    contrastText: '#ffffff',
    bgDefault: '#f8fafc',
    bgPaper: '#ffffff',
    cardBg: '#ffffff',
    glassBg: 'rgba(255, 255, 255, 0.90)',
    headerBg: 'rgba(255, 255, 255, 0.90)',
    tableHeaderBg: '#f1f5f9',
    textColorPrimary: '#0f172a',
    textColorSecondary: '#64748b',
    glassBorder: '#e2e8f0',
    backdropBlur: 'blur(16px)',
    badgeSuccessBg: '#dcfce7',
    badgeSuccessColor: '#15803d',
    badgeWarningBg: '#fef3c7',
    badgeWarningColor: '#b45309',
    badgeErrorBg: '#fee2e2',
    badgeErrorColor: '#b91c1c',
    glassShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
    accentGlow: '0 4px 16px rgba(225, 29, 72, 0.25)',
    headerBorder: '#e2e8f0',
    tableRowHover: '#f8fafc'
  },
  aqua_glass: {
    id: 'aqua_glass',
    name: 'Aqua Glass (macOS Modern)',
    primary: '#0284c7',
    secondary: '#059669',
    sidebarBg: 'rgba(15, 23, 42, 0.82)',
    sidebarActiveGradient: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
    accent: '#38bdf8',
    description: 'Konsep desain modern macOS Aqua & Glassmorphism dengan bias bola cahaya aqua/emerald dinamis dan kartu kaca transparan.',
    isDark: false,
    contrastText: '#ffffff',
    bgDefault: '#f0fdfa',
    bgPaper: 'rgba(255, 255, 255, 0.65)',
    cardBg: 'rgba(255, 255, 255, 0.62)',
    glassBg: 'rgba(255, 255, 255, 0.60)',
    headerBg: 'rgba(255, 255, 255, 0.68)',
    tableHeaderBg: 'rgba(240, 253, 250, 0.75)',
    textColorPrimary: '#0f172a',
    textColorSecondary: '#334155',
    glassBorder: 'rgba(255, 255, 255, 0.75)',
    backdropBlur: 'blur(20px)',
    badgeSuccessBg: 'rgba(16, 185, 129, 0.18)',
    badgeSuccessColor: '#047857',
    badgeWarningBg: 'rgba(245, 158, 11, 0.18)',
    badgeWarningColor: '#b45309',
    badgeErrorBg: 'rgba(239, 68, 68, 0.18)',
    badgeErrorColor: '#b91c1c',
    glassShadow: '0 8px 32px 0 rgba(2, 132, 199, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
    accentGlow: '0 0 24px rgba(56, 189, 248, 0.35)',
    headerBorder: 'rgba(255, 255, 255, 0.70)',
    tableRowHover: 'rgba(255, 255, 255, 0.45)'
  }
};

export function resolvePresetId(presetId?: string): string {
  if (!presetId) return 'indigo';
  if (THEME_PRESETS[presetId]) return presetId;
  return 'indigo';
}

export function getAppTheme(presetId?: string, customPrimary?: string, isDarkOverride?: boolean): Theme {
  const resolvedId = resolvePresetId(presetId);
  const activePreset = THEME_PRESETS[resolvedId] || THEME_PRESETS.indigo;
  const isDark = isDarkOverride !== undefined ? isDarkOverride : Boolean(activePreset.isDark);
  const primaryColor = customPrimary || (isDark && resolvedId === 'aqua_glass' ? '#38bdf8' : activePreset.primary);

  return createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      background: {
        default: isDark ? (resolvedId === 'aqua_glass' ? '#030712' : '#0b0f19') : (activePreset.bgDefault || '#f0f2f5'),
        paper: isDark ? (resolvedId === 'aqua_glass' ? 'rgba(15, 23, 42, 0.65)' : '#111827') : (activePreset.bgPaper || '#ffffff'),
      },
      primary: {
        main: primaryColor,
        contrastText: activePreset.contrastText || '#ffffff',
      },
      secondary: {
        main: isDark && resolvedId === 'aqua_glass' ? '#34d399' : activePreset.secondary,
      },
      text: {
        primary: isDark ? '#f8fafc' : '#0f172a',
        secondary: isDark ? '#94a3b8' : '#334155',
      },
    },
    typography: {
      fontFamily: "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
      fontWeightLight: 300,
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightBold: 700,
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            border: 'none',
            boxShadow: '0 4px 12px 0 rgba(0, 0, 0, 0.05), 0 1px 3px 0 rgba(0, 0, 0, 0.02)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            color: isDark ? '#f8fafc' : '#0f172a',
          }
        }
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: 'none',
            fontWeight: 600,
          },
          contained: {
            boxShadow: '0 4px 10px 0 rgba(0, 0, 0, 0.1)',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.65)' : activePreset.sidebarBg,
            color: isDark ? '#ffffff' : '#0f172a',
            borderRight: 'none',
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            color: isDark ? '#f8fafc' : '#0f172a',
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.60)' : 'rgba(255, 255, 255, 0.75)',
            borderRadius: 10,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? 'rgba(255, 255, 255, 0.24)' : 'rgba(0, 0, 0, 0.20)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? 'rgba(255, 255, 255, 0.50)' : 'rgba(2, 132, 199, 0.50)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? '#38bdf8' : '#0284c7',
              borderWidth: '1.5px',
            },
            '& .MuiSvgIcon-root': {
              color: isDark ? '#cbd5e1' : '#475569',
            },
            '&:hover .MuiSvgIcon-root': {
              color: isDark ? '#ffffff' : '#0f172a',
            },
            '& input::-webkit-calendar-picker-indicator': {
              filter: isDark ? 'invert(1) brightness(1.2)' : 'none',
            },
          },
          input: {
            color: isDark ? '#f8fafc' : '#0f172a',
            '&::placeholder': {
              color: isDark ? '#94a3b8' : '#64748b',
              opacity: 1,
            },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: isDark ? '#cbd5e1' : '#334155',
            fontWeight: 600,
            '&.Mui-focused': {
              color: isDark ? '#38bdf8' : '#0284c7',
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          select: {
            color: isDark ? '#f8fafc' : '#0f172a',
          },
          icon: {
            color: isDark ? '#cbd5e1' : '#475569',
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            color: isDark ? '#f8fafc' : '#0f172a',
            borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
          },
          head: {
            color: isDark ? '#f8fafc' : '#0f172a',
            fontWeight: 800,
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : (activePreset.tableHeaderBg || '#f8fafc'),
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            color: isDark ? '#f8fafc' : '#0f172a',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid #e2e8f0',
            boxShadow: isDark ? '0 12px 32px rgba(0, 0, 0, 0.6)' : '0 12px 32px rgba(0, 0, 0, 0.1)',
          }
        }
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            color: isDark ? '#f8fafc' : '#0f172a',
            '&:hover': {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
            },
            '&.Mui-selected': {
              backgroundColor: isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(2, 132, 199, 0.12)',
              '&:hover': {
                backgroundColor: isDark ? 'rgba(56, 189, 248, 0.28)' : 'rgba(2, 132, 199, 0.18)',
              }
            }
          }
        }
      },
      MuiAutocomplete: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            color: isDark ? '#f8fafc' : '#0f172a',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid #e2e8f0',
          },
          option: {
            color: isDark ? '#f8fafc' : '#0f172a',
            '&[aria-selected="true"]': {
              backgroundColor: isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(2, 132, 199, 0.12)',
            },
            '&:hover, &.Mui-focused': {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
            }
          },
          noOptions: {
            color: isDark ? '#94a3b8' : '#64748b',
          }
        }
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            fontWeight: 600,
            '&.MuiAlert-standardWarning': {
              backgroundColor: isDark ? 'rgba(217, 119, 6, 0.25)' : '#fef3c7',
              color: isDark ? '#fef08a' : '#78350f',
              border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.4)' : '#fde68a'}`,
              '& .MuiAlert-icon': {
                color: isDark ? '#fbbf24' : '#b45309',
              },
              '& .MuiAlert-message': {
                color: isDark ? '#fef08a' : '#78350f',
                fontWeight: 600,
              },
            },
            '&.MuiAlert-standardSuccess': {
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#f0fdf4',
              color: isDark ? '#86efac' : '#14532d',
              border: `1px solid ${isDark ? 'rgba(34, 197, 94, 0.3)' : '#bbf7d0'}`,
              '& .MuiAlert-icon': {
                color: isDark ? '#4ade80' : '#16a34a',
              },
              '& .MuiAlert-message': {
                color: isDark ? '#86efac' : '#14532d',
                fontWeight: 600,
              },
            },
            '&.MuiAlert-standardError': {
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fef2f2',
              color: isDark ? '#fca5a5' : '#7f1d1d',
              border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca'}`,
              '& .MuiAlert-icon': {
                color: isDark ? '#f87171' : '#dc2626',
              },
              '& .MuiAlert-message': {
                color: isDark ? '#fca5a5' : '#7f1d1d',
                fontWeight: 600,
              },
            },
            '&.MuiAlert-standardInfo': {
              backgroundColor: isDark ? 'rgba(14, 165, 233, 0.2)' : '#f0f9ff',
              color: isDark ? '#7dd3fc' : '#0c4a6e',
              border: `1px solid ${isDark ? 'rgba(56, 189, 248, 0.3)' : '#bae6fd'}`,
              '& .MuiAlert-icon': {
                color: isDark ? '#38bdf8' : '#0284c7',
              },
              '& .MuiAlert-message': {
                color: isDark ? '#7dd3fc' : '#0c4a6e',
                fontWeight: 600,
              },
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          colorWarning: {
            backgroundColor: isDark ? 'rgba(217, 119, 6, 0.25)' : '#fef3c7',
            color: isDark ? '#fde047' : '#78350f',
            border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.4)' : '#fde68a'}`,
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : '#f8fafc',
            '& .MuiTableCell-root': {
              color: isDark ? '#f8fafc' : '#0f172a',
              fontWeight: 800,
            },
          },
        },
      },
    },
  });
}

const theme = getAppTheme();

export default theme;
