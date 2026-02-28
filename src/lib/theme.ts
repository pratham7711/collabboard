import { useBoardStore } from '../store/boardStore';

export interface ThemeColors {
  bg: string;
  canvasBg: string;
  canvasGrid: string;
  surface: string;
  surfaceHover: string;
  surfaceBorder: string;
  surfaceActive: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentBg: string;
  accentMuted: string;
  danger: string;
  dangerBg: string;
  online: string;
}

export const darkTheme: ThemeColors = {
  bg: '#0F1117',
  canvasBg: '#1A1A2E',
  canvasGrid: 'rgba(255,255,255,0.05)',
  surface: 'rgba(22, 33, 62, 0.97)',
  surfaceHover: 'rgba(255,255,255,0.08)',
  surfaceBorder: 'rgba(255,255,255,0.08)',
  surfaceActive: 'rgba(79,70,229,0.9)',
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.7)',
  textFaint: 'rgba(255,255,255,0.4)',
  accent: '#4F46E5',
  accentBg: 'rgba(99,102,241,0.15)',
  accentMuted: 'rgba(79,70,229,0.2)',
  danger: '#EF4444',
  dangerBg: 'rgba(239,68,68,0.1)',
  online: '#10B981',
};

export const lightTheme: ThemeColors = {
  bg: '#E8ECF8',
  canvasBg: '#F5F7FF',
  canvasGrid: 'rgba(79,70,229,0.06)',
  surface: 'rgba(240, 244, 255, 0.97)',
  surfaceHover: 'rgba(79, 70, 229, 0.07)',
  surfaceBorder: 'rgba(79, 70, 229, 0.15)',
  surfaceActive: 'rgba(79,70,229,0.9)',
  text: '#1E1B4B',
  textMuted: 'rgba(30, 27, 75, 0.75)',
  textFaint: 'rgba(30, 27, 75, 0.45)',
  accent: '#4F46E5',
  accentBg: 'rgba(79,70,229,0.1)',
  accentMuted: 'rgba(79,70,229,0.18)',
  danger: '#DC2626',
  dangerBg: 'rgba(220,38,38,0.08)',
  online: '#059669',
};

export function useTheme(): ThemeColors {
  const theme = useBoardStore((s) => s.theme);
  return theme === 'dark' ? darkTheme : lightTheme;
}
