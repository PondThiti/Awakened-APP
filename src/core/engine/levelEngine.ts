import xpConfigJson from '../../../assets/config/xp_config.json';
import { LevelState } from './types';

export interface LevelFormulaConfig {
  base: number;
  per_level: number;
}

const defaultFormula: LevelFormulaConfig = xpConfigJson.level_formula;

/**
 * XP needed to advance from `level` to `level + 1`:
 * xp_to_next(L) = 100 + 20 * (L - 1)
 */
export function xpToNext(level: number, formula: LevelFormulaConfig = defaultFormula): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return formula.base + formula.per_level * (safeLevel - 1);
}

/**
 * Cumulative XP required to start `level` N:
 * total_xp(N) = 100 * (N - 1) + 10 * (N - 1) * (N - 2)
 */
export function totalXpForLevel(level: number, formula: LevelFormulaConfig = defaultFormula): number {
  const n = Math.max(1, Math.floor(level));
  return formula.base * (n - 1) + (formula.per_level / 2) * (n - 1) * (n - 2);
}

/**
 * Computes LevelState from cumulative `totalXp` (Single Source of Truth per Section 7.4).
 * Never allows negative XP or level < 1 (Principle P1: No Punishment).
 */
export function computeLevelState(
  totalXp: number,
  formula: LevelFormulaConfig = defaultFormula
): LevelState {
  const safeTotalXp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  let remainingXp = safeTotalXp;

  while (remainingXp >= xpToNext(level, formula)) {
    remainingXp -= xpToNext(level, formula);
    level += 1;
  }

  const needed = xpToNext(level, formula);
  return {
    level,
    xpInLevel: remainingXp,
    xpToNext: needed,
    progress: needed > 0 ? Math.min(1, remainingXp / needed) : 0,
    totalXp: safeTotalXp,
  };
}

/**
 * Helper matching the pseudo-code in Section 7.4 of Awakened.md
 */
export function applyXp(
  currentLevel: number,
  currentXpInLevel: number,
  gained: number,
  formula: LevelFormulaConfig = defaultFormula
): { level: number; xpInLevel: number } {
  let level = Math.max(1, currentLevel);
  let xp = Math.max(0, currentXpInLevel) + Math.max(0, gained);
  while (xp >= xpToNext(level, formula)) {
    xp -= xpToNext(level, formula);
    level += 1;
  }
  return { level, xpInLevel: xp };
}
