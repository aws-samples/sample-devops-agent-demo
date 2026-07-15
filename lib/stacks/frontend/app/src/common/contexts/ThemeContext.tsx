/**
 * Theme Context
 * 
 * Provides theme management across the application including:
 * - Light/Dark mode (Cloudscape Mode)
 * - Visual density (Cloudscape Density)
 * - Color accent themes (custom CSS variables)
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { applyMode, applyDensity, Mode, Density } from '@cloudscape-design/global-styles';

// Color accent themes with CSS variable overrides
export type ColorTheme = 'default' | 'ocean' | 'forest' | 'sunset' | 'midnight';

interface ColorThemeConfig {
  name: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  bgGradientFrom?: string;
  bgGradientTo?: string;
}

export const COLOR_THEMES: Record<ColorTheme, ColorThemeConfig> = {
  default: {
    name: 'Classic',
    description: 'Clean neutral theme',
    primaryColor: '#0972d3',
    accentColor: '#0073bb',
  },
  ocean: {
    name: 'Ocean',
    description: 'Cool blue tones',
    primaryColor: '#0ea5e9',
    accentColor: '#0284c7',
    bgGradientFrom: '#f0f9ff',
    bgGradientTo: '#e0f2fe',
  },
  forest: {
    name: 'Forest',
    description: 'Natural green tones',
    primaryColor: '#10b981',
    accentColor: '#059669',
    bgGradientFrom: '#f0fdf4',
    bgGradientTo: '#dcfce7',
  },
  sunset: {
    name: 'Sunset',
    description: 'Warm orange tones',
    primaryColor: '#f97316',
    accentColor: '#ea580c',
    bgGradientFrom: '#fff7ed',
    bgGradientTo: '#ffedd5',
  },
  midnight: {
    name: 'Midnight',
    description: 'Deep purple tones',
    primaryColor: '#8b5cf6',
    accentColor: '#7c3aed',
    bgGradientFrom: '#faf5ff',
    bgGradientTo: '#f3e8ff',
  },
};

interface ThemeContextType {
  mode: Mode;
  density: Density;
  colorTheme: ColorTheme;
  setMode: (mode: Mode) => void;
  setDensity: (density: Density) => void;
  setColorTheme: (theme: ColorTheme) => void;
  toggleMode: () => void;
  toggleDensity: () => void;
  isDarkMode: boolean;
  isCompactDensity: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEYS = {
  mode: 'theme',
  density: 'density',
  colorTheme: 'colorTheme',
};

// Convert hex to RGB values
const hexToRgb = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '9, 114, 211';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
};

// Apply color theme CSS variables and inject dynamic styles
const applyColorTheme = (theme: ColorTheme, isDark: boolean) => {
  const config = COLOR_THEMES[theme];
  const root = document.documentElement;
  
  // Set custom CSS variables for accent colors
  root.style.setProperty('--app-primary-color', config.primaryColor);
  root.style.setProperty('--app-accent-color', config.accentColor);
  root.style.setProperty('--app-primary-rgb', hexToRgb(config.primaryColor));
  
  // Light mode = ocean gradient, Dark mode = dark background
  if (isDark) {
    document.body.style.background = '#0a0a1a';
    document.body.style.minHeight = '100vh';
    root.style.removeProperty('--app-bg-gradient-from');
    root.style.removeProperty('--app-bg-gradient-to');
  } else {
    const gradFrom = config.bgGradientFrom || '#f0f9ff';
    const gradTo = config.bgGradientTo || '#e0f2fe';
    root.style.setProperty('--app-bg-gradient-from', gradFrom);
    root.style.setProperty('--app-bg-gradient-to', gradTo);
    document.body.style.background = `linear-gradient(135deg, ${gradFrom} 0%, ${gradTo} 100%)`;
    document.body.style.minHeight = '100vh';
  }
  
  // Inject dynamic CSS to override Cloudscape components
  const styleId = 'theme-dynamic-styles';
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }
  
  const primaryColor = config.primaryColor;
  const accentColor = config.accentColor;
  const primaryRgb = hexToRgb(config.primaryColor);
  
  styleEl.textContent = `
    /* Primary buttons */
    [class*="awsui_button"][class*="variant-primary"],
    button[class*="awsui"][class*="primary"] {
      background-color: ${primaryColor} !important;
      border-color: ${primaryColor} !important;
    }
    [class*="awsui_button"][class*="variant-primary"]:hover,
    button[class*="awsui"][class*="primary"]:hover {
      background-color: ${accentColor} !important;
      border-color: ${accentColor} !important;
    }
    
    /* Links */
    [class*="awsui_link"],
    a[class*="awsui"] {
      color: ${primaryColor} !important;
    }
    [class*="awsui_link"]:hover,
    a[class*="awsui"]:hover {
      color: ${accentColor} !important;
    }
    
    /* Container headers - add left border accent */
    [class*="awsui_header"][class*="variant-h2"] > [class*="awsui_title"],
    [class*="awsui_header-variant-h2"] {
      border-left: 4px solid ${primaryColor} !important;
      padding-left: 12px !important;
    }
    
    /* Toggle switches when checked */
    [class*="awsui_toggle"][class*="checked"] [class*="awsui_toggle-handle"],
    [class*="awsui_toggle-handle-checked"] {
      background-color: ${primaryColor} !important;
    }
    
    /* Progress bars */
    [class*="awsui_progress"] [class*="awsui_percentage"],
    [class*="awsui_percentage-bar"] {
      background-color: ${primaryColor} !important;
    }
    
    /* Side navigation active items */
    [class*="awsui_side-navigation"] [class*="active"],
    [class*="awsui_link-active"] {
      color: ${primaryColor} !important;
      border-left-color: ${primaryColor} !important;
    }
    
    /* Tabs active */
    [class*="awsui_tabs"] [class*="active"] [class*="awsui_tab-link"],
    [class*="awsui_tab-link-active"] {
      color: ${primaryColor} !important;
      border-bottom-color: ${primaryColor} !important;
    }
    
    /* Breadcrumb current */
    [class*="awsui_breadcrumb"] [class*="current"] {
      color: ${primaryColor} !important;
    }
    
    /* Focus rings */
    [class*="awsui"]:focus-visible,
    [class*="awsui_focus-visible"] {
      outline-color: ${primaryColor} !important;
      box-shadow: 0 0 0 2px rgba(${primaryRgb}, 0.3) !important;
    }
    
    /* Spinner */
    [class*="awsui_spinner"] [class*="awsui_circle"] {
      stroke: ${primaryColor} !important;
    }
    
    /* Status indicator info */
    [class*="awsui_status-indicator"][class*="info"] [class*="awsui_icon"] {
      color: ${primaryColor} !important;
    }
    
    /* Alert info type */
    [class*="awsui_alert"][class*="info"] {
      border-left-color: ${primaryColor} !important;
    }
    
    /* Selection control (radio/checkbox) when checked */
    [class*="awsui_styled-control"][class*="checked"] {
      background-color: ${primaryColor} !important;
      border-color: ${primaryColor} !important;
    }
    
    /* Top navigation bar accent */
    [class*="awsui_top-navigation"] {
      border-bottom: 3px solid ${primaryColor} !important;
    }
    
    /* Header bar accent line */
    header[class*="awsui"] {
      border-bottom-color: ${primaryColor} !important;
    }
  `;
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<Mode>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.mode);
    return saved === 'dark' ? Mode.Dark : Mode.Light;
  });

  const [density, setDensityState] = useState<Density>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.density);
    return saved === 'compact' ? Density.Compact : Density.Comfortable;
  });

  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.colorTheme);
    return (saved as ColorTheme) || 'ocean';
  });

  // Apply mode changes — keep Cloudscape, body background, AND Tailwind `dark` class in sync
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.mode, mode === Mode.Dark ? 'dark' : 'light');
    applyMode(mode);
    applyColorTheme(colorTheme, mode === Mode.Dark);

    // Sync Tailwind dark class on <html>
    const root = document.documentElement;
    if (mode === Mode.Dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [mode, colorTheme]);

  // Apply density changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.density, density === Density.Compact ? 'compact' : 'comfortable');
    applyDensity(density);
  }, [density]);

  // Apply color theme changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.colorTheme, colorTheme);
    applyColorTheme(colorTheme, mode === Mode.Dark);
  }, [colorTheme, mode]);

  const setMode = useCallback((newMode: Mode) => {
    setModeState(newMode);
  }, []);

  const setDensity = useCallback((newDensity: Density) => {
    setDensityState(newDensity);
  }, []);

  const setColorTheme = useCallback((newTheme: ColorTheme) => {
    setColorThemeState(newTheme);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState(prev => prev === Mode.Light ? Mode.Dark : Mode.Light);
  }, []);

  const toggleDensity = useCallback(() => {
    setDensityState(prev => prev === Density.Comfortable ? Density.Compact : Density.Comfortable);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        mode,
        density,
        colorTheme,
        setMode,
        setDensity,
        setColorTheme,
        toggleMode,
        toggleDensity,
        isDarkMode: mode === Mode.Dark,
        isCompactDensity: density === Density.Compact,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
