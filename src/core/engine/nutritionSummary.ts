import { ActivityRecord, MealSlot } from './types';
import { addDaysToDayKey, getLocalDayKey } from '../utils/dateUtils';

export interface DailyNutritionSummary {
  dayKey: string;
  mealCount: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  bySlot: Record<MealSlot, number>;
}

function emptySummary(dayKey: string): DailyNutritionSummary {
  return {
    dayKey,
    mealCount: 0,
    kcal: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    bySlot: { breakfast: 0, lunch: 0, dinner: 0, snack: 0 },
  };
}

/**
 * Sums the (estimated) calories & macros of every non-deleted meal logged on `dayKey`
 * (day boundaries follow the timezone stored with each activity).
 */
export function getDailyNutritionSummary(
  activities: ActivityRecord[],
  dayKey: string
): DailyNutritionSummary {
  const summary = emptySummary(dayKey);
  for (const a of activities) {
    if (a.deletedAt || a.type !== 'meal') continue;
    if (getLocalDayKey(a.occurredAt, a.tzOffsetMin) !== dayKey) continue;
    const kcal = Math.max(0, a.mealDetail?.caloriesEst ?? a.value ?? 0);
    summary.mealCount += 1;
    summary.kcal += kcal;
    summary.proteinG += a.mealDetail?.proteinG ?? 0;
    summary.carbsG += a.mealDetail?.carbsG ?? 0;
    summary.fatG += a.mealDetail?.fatG ?? 0;
    const slot = a.mealDetail?.mealSlot ?? 'snack';
    summary.bySlot[slot] += kcal;
  }
  summary.kcal = Math.round(summary.kcal);
  summary.proteinG = Math.round(summary.proteinG * 10) / 10;
  summary.carbsG = Math.round(summary.carbsG * 10) / 10;
  summary.fatG = Math.round(summary.fatG * 10) / 10;
  return summary;
}

/** Daily summaries for the `days` days ending at `endDayKey` (oldest first). */
export function getNutritionHistory(
  activities: ActivityRecord[],
  endDayKey: string,
  days: number
): DailyNutritionSummary[] {
  return Array.from({ length: days }, (_, i) =>
    getDailyNutritionSummary(activities, addDaysToDayKey(endDayKey, -(days - 1 - i)))
  );
}
