import { ThemeMode } from '../core/engine/types';

/**
 * Awakened v0.10.6 Design System — Ink / Cream / Peach Palette
 * Strictly 3 core color families: Ink (#16142B), Cream (#FBF8F3 / #FFFFFF), Peach (#FFB88A / #FFE3CC)
 * with thick 2.5px ink outlines, full pill chips, and hard offset shadows.
 */
export const colors = {
  ink: '#16142B',
  cream: '#FBF8F3',
  white: '#FFFFFF',
  peach: '#FFB88A',
  peachSoft: '#FFE3CC',
  line: '#D9D6DE',
};

export const stroke = 2.5; // ความหนาเส้นขอบทุกชิ้น
export const radius = { chip: 999, card: 20, input: 14 };
export const hardShadow = { offset: 3, color: colors.ink }; // เงาแข็ง ไม่เบลอ

export interface AppTheme {
  mode: ThemeMode;
  ink: string;
  cream: string;
  white: string;
  peach: string;
  peachSoft: string;
  line: string;
  stroke: number;
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
 * Dark Mode (Ink / Peach / Cream):
 * Deep Ink (#16142B) canvas with Peach (#FFB88A) primary accents and Cream (#FBF8F3) typography.
 */
export const DARK_THEME: AppTheme = {
  mode: 'dark',
  ink: colors.ink,
  cream: colors.cream,
  white: colors.white,
  peach: colors.peach,
  peachSoft: colors.peachSoft,
  line: colors.line,
  stroke,
  bg: '#16142B',
  bgSecondary: '#211E3A',
  card: '#1D1A36',
  cardElevated: '#262344',
  border: '#FFB88A',
  primary: '#FFB88A',
  primaryGlow: 'rgba(255, 184, 138, 0.25)',
  success: '#FFB88A',
  warning: '#FFE3CC',
  danger: '#FF9E8A',
  text: '#FBF8F3',
  textSecondary: '#D9D6DE',
  textMuted: '#9B96B0',
  water: '#FFB88A',
  meal: '#FFB88A',
  workout: '#FFB88A',
  focus: '#FFB88A',
  mind: '#FFB88A',
};

/**
 * Light Mode (Cream / White / Ink / Peach — Mockup Default Look):
 * Warm Cream (#FBF8F3) & White (#FFFFFF) cards with thick Ink (#16142B) borders and Peach (#FFB88A) highlights.
 */
export const LIGHT_THEME: AppTheme = {
  mode: 'light',
  ink: colors.ink,
  cream: colors.cream,
  white: colors.white,
  peach: colors.peach,
  peachSoft: colors.peachSoft,
  line: colors.line,
  stroke,
  bg: '#FBF8F3',
  bgSecondary: '#F3EFE6',
  card: '#FFFFFF',
  cardElevated: '#FBF8F3',
  border: '#16142B',
  primary: '#FFB88A',
  primaryGlow: 'rgba(255, 184, 138, 0.35)',
  success: '#16142B',
  warning: '#E07A38',
  danger: '#C94A38',
  text: '#16142B',
  textSecondary: '#3A3752',
  textMuted: '#726E86',
  water: '#16142B',
  meal: '#16142B',
  workout: '#16142B',
  focus: '#16142B',
  mind: '#16142B',
};

export function getTheme(mode: ThemeMode): AppTheme {
  return mode === 'light' ? LIGHT_THEME : DARK_THEME;
}
