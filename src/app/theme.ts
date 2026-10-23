import { ThemeMode } from '../core/engine/types';

export interface AppTheme {
  mode: ThemeMode;
  bg: string;
  bgSecondary: string;
  card: string;
  cardElevated: string;
  border: string;
  primary: string;
  primaryGlow: string;
  success: string;
  warning: string;
  danger: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  water: string;
  meal: string;
  workout: string;
  focus: string;
  mind: string;
}

/**
 * Section 15.2 UI/UX Theme Palette:
 * Dark RPG / System Window (#0E1220 bg, #171C2E card, #5B8CFF primary, #3DDC97 success, #FFB84D warning)
 * + WCAG AA accessible Light Mode
 */
export const DARK_THEME: AppTheme = {
  mode: 'dark',
  bg: '#0E1220',
  bgSecondary: '#121829',
  card: '#171C2E',
  cardElevated: '#1F263D',
  border: '#283252',
  primary: '#5B8CFF',
  primaryGlow: 'rgba(91, 140, 255, 0.25)',
  success: '#3DDC97',
  warning: '#FFB84D',
  danger: '#FF5C77',
  text: '#F3F6FF',
  textSecondary: '#B4C0E0',
  textMuted: '#7884A8',
  water: '#38BDF8',
  meal: '#FB923C',
  workout: '#F43F5E',
  focus: '#A78BFA',
  mind: '#34D399',
};

export const LIGHT_THEME: AppTheme = {
  mode: 'light',
  bg: '#F4F7FE',
  bgSecondary: '#E9EFFD',
  card: '#FFFFFF',
  cardElevated: '#F8FAFF',
  border: '#D6E0F5',
  primary: '#3B6EF6',
  primaryGlow: 'rgba(59, 110, 246, 0.16)',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  text: '#111827',
  textSecondary: '#374151',
  textMuted: '#6B7280',
  water: '#0284C7',
  meal: '#EA580C',
  workout: '#E11D48',
  focus: '#7C3AED',
  mind: '#059669',
};

export function getTheme(mode: ThemeMode): AppTheme {
  return mode === 'light' ? LIGHT_THEME : DARK_THEME;
}
