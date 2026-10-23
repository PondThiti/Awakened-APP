import xpConfigJson from '../../../assets/config/xp_config.json';
import { RankDef } from './types';

export interface MonarchEligibility {
  eligible: boolean;
  levelMet: boolean;
  activeDaysMet: boolean;
  badgeCategoriesMet: boolean;
  currentActiveDays: number;
  requiredActiveDays: number;
  currentBadgeCategories: number;
  requiredBadgeCategories: number;
}

const defaultRanks: RankDef[] = xpConfigJson.ranks as RankDef[];

/**
 * Determines the user's Rank based on current Level and Monarch special unlock requirements
 * (Section 7.5: Monarch requires Lv 221+ AND 365 active days AND badges from >= 4 categories).
 */
export function getRankForLevel(
  level: number,
  options: {
    totalActiveDays?: number;
    unlockedBadgeCategoriesCount?: number;
    ranks?: RankDef[];
  } = {}
): {
  currentRank: RankDef;
  nextRank: RankDef | null;
  monarchEligibility: MonarchEligibility;
} {
  const ranks = options.ranks ?? defaultRanks;
  const totalActiveDays = options.totalActiveDays ?? 0;
  const unlockedBadgeCategoriesCount = options.unlockedBadgeCategoriesCount ?? 0;

  const monarchRank = ranks.find((r) => r.id === 'M')!;
  const reqDays = monarchRank?.requires_special?.min_active_days ?? 365;
  const reqCats = monarchRank?.requires_special?.min_badge_categories ?? 4;

  const levelMet = level >= (monarchRank?.min_level ?? 221);
  const activeDaysMet = totalActiveDays >= reqDays;
  const badgeCategoriesMet = unlockedBadgeCategoriesCount >= reqCats;
  const monarchEligible = levelMet && activeDaysMet && badgeCategoriesMet;

  const monarchEligibility: MonarchEligibility = {
    eligible: monarchEligible,
    levelMet,
    activeDaysMet,
    badgeCategoriesMet,
    currentActiveDays: totalActiveDays,
    requiredActiveDays: reqDays,
    currentBadgeCategories: unlockedBadgeCategoriesCount,
    requiredBadgeCategories: reqCats,
  };

  let matchedIndex = 0;
  for (let i = 0; i < ranks.length; i++) {
    const r = ranks[i];
    if (level >= r.min_level) {
      if (r.id === 'M' && !monarchEligible) {
        // Stays at SS – National Level until Monarch special trials are completed
        break;
      }
      matchedIndex = i;
    }
  }

  const currentRank = ranks[matchedIndex];
  const nextRank = matchedIndex + 1 < ranks.length ? ranks[matchedIndex + 1] : null;

  return {
    currentRank,
    nextRank,
    monarchEligibility,
  };
}
