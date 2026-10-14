import React from 'react';
import { Box, Tooltip, IconButton } from '@mui/material';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarFloatingToggleProps {
  collapsed: boolean;
  onToggle: () => void;
  tooltipTitle?: string;
  top?: number | string;
  isDark?: boolean;
  primaryColor?: string;
  rightOffset?: number;
}

/**
 * Modern floating toggle button placed along the right border of sidebars
 * Minimalist, does not consume horizontal content space, smoothly transitions
 */
export const SidebarFloatingToggle: React.FC<SidebarFloatingToggleProps> = ({
  collapsed,
  onToggle,
  tooltipTitle,
  top = '28px',
  isDark = false,
  primaryColor = '#2563eb',
  rightOffset = -13
}) => {
  const defaultTitle = collapsed ? 'Buka Sidebar (Expand)' : 'Tutup Sidebar (Collapse)';
  const label = tooltipTitle || defaultTitle;

  return (
    <Tooltip title={label} placement="right" arrow>
      <Box
        component="div"
        sx={{
          position: 'absolute',
          top: top,
          right: rightOffset,
          zIndex: 1300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <IconButton
          id="btn-sidebar-floating-toggle"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          aria-label={label}
          size="small"
          sx={{
            width: 26,
            height: 26,
            padding: 0,
            borderRadius: '50%',
            bgcolor: isDark ? '#1e293b' : '#ffffff',
            color: isDark ? '#94a3b8' : '#475569',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(203, 213, 225, 0.9)'}`,
            boxShadow: isDark
              ? '0 3px 10px rgba(0, 0, 0, 0.5), 0 1px 3px rgba(0, 0, 0, 0.3)'
              : '0 2px 8px rgba(15, 23, 42, 0.12), 0 1px 2px rgba(15, 23, 42, 0.08)',
            cursor: 'pointer',
            transition: 'all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
            '&:hover': {
              bgcolor: isDark ? '#334155' : '#f8fafc',
              color: primaryColor,
              borderColor: primaryColor,
              transform: 'scale(1.15)',
              boxShadow: `0 4px 14px ${primaryColor}40`
            },
            '&:active': {
              transform: 'scale(0.92)'
            }
          }}
        >
          {collapsed ? (
            <ChevronRight size={15} strokeWidth={2.5} />
          ) : (
            <ChevronLeft size={15} strokeWidth={2.5} />
          )}
        </IconButton>
      </Box>
    </Tooltip>
  );
};

export default SidebarFloatingToggle;
