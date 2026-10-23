import { addDaysToDayKey, getDaysInWeekRange } from '../utils/dateUtils';
import { StreakDayStatus, StreakLogEntry, TrainingPlanDay } from './types';

export interface StreakEvaluationResult {
  currentStreak: number;
  longestStreak: number;
  freezeTokensRemaining: number;
  freezeTokensUsedDays: string[];
  todayStatus: StreakDayStatus | 'pending';
  weeklyActiveDays: number;
  weeklyGoalDays: number;
  weeklyGoalMet: boolean;
  updatedLogs: Record<string, StreakDayStatus>;
}

/**
 * Evaluates Daily Streak, Freeze Token auto-protection, Planned Rest Days,
 * and Weekly Consistency (Section 9 of Awakened.md).
 *
 * Rules:
 * - Active day = >=1 Daily Quest completed OR >=1 non-backfilled activity OR Rest Day check-in
 * - Planned Rest Day does NOT break streak
 * - Missing 1 day with freezeTokens > 0 automatically consumes 1 freeze token and preserves streak
 * - Missing a day with 0 freezeTokens resets currentStreak to 0, NEVER deducts XP/Level/Rank
 */
export function evaluateStreakState(options: {
  todayKey: string;
  activeDaysSet: Set<string>;
  restCheckinDaysSet: Set<string>;
  existingLogs: Record<string, StreakDayStatus>;
  trainingPlan: TrainingPlanDay[];
  initialFreezeTokens: number;
  previousLongestStreak: number;
  weeklyGoalDays: number;
  weekStartDay?: number;
  lookbackDays?: number;
}): StreakEvaluationResult {
  const lookback = options.lookbackDays ?? 30;
  const logs: Record<string, StreakDayStatus> = { ...options.existingLogs };
  let freezeTokens = Math.min(2, Math.max(0, options.initialFreezeTokens));
  const freezeUsedDays: string[] = [];

  // Mark explicitly active or rest check-in days first
  for (const d of options.activeDaysSet) {
    logs[d] = 'active';
  }
  for (const d of options.restCheckinDaysSet) {
    if (logs[d] !== 'active') {
      logs[d] = 'rest';
    }
  }

  // Find earliest day to evaluate from
  const allKnownDays = Object.keys(logs)
    .filter((d) => logs[d] === 'active' || logs[d] === 'rest' || logs[d] === 'frozen')
    .sort();

  if (allKnownDays.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: options.previousLongestStreak,
      freezeTokensRemaining: freezeTokens,
      freezeTokensUsedDays: [],
      todayStatus: 'pending',
      weeklyActiveDays: 0,
      weeklyGoalDays: options.weeklyGoalDays,
      weeklyGoalMet: false,
      updatedLogs: logs,
    };
  }

  const startDay = allKnownDays[0];
  let cursor = startDay;
  let streak = 0;
  let maxStreak = options.previousLongestStreak;

  // Walk day by day from earliest active day up to yesterday (today is still in progress if not active yet)
  while (cursor < options.todayKey) {
    const status = logs[cursor];
    if (status === 'active' || status === 'rest') {
      streak += 1;
      if (streak > maxStreak) maxStreak = streak;
    } else if (status === 'frozen') {
      // Already frozen previously, streak continues without incrementing or resetting
    } else {
      // Check if it was a scheduled rest day and user was active earlier in the streak
      if (streak > 0 && freezeTokens > 0) {
        freezeTokens -= 1;
        logs[cursor] = 'frozen';
        freezeUsedDays.push(cursor);
      } else {
        logs[cursor] = 'missed';
        streak = 0;
      }
    }
    cursor = addDaysToDayKey(cursor, 1);
    if (cursor > options.todayKey) break;
    // Safety bound
    if (allKnownDays.length > 0 && lookback > 3650) break;
  }

  // Check today
  const todayCurrent = logs[options.todayKey];
  let todayStatus: StreakDayStatus | 'pending' = 'pending';
  if (todayCurrent === 'active' || todayCurrent === 'rest') {
    streak += 1;
    if (streak > maxStreak) maxStreak = streak;
    todayStatus = todayCurrent;
  }

  // Weekly consistency calculation
  const weekDays = getDaysInWeekRange(options.todayKey, options.weekStartDay ?? 1);
  let weeklyActiveDays = 0;
  for (const wd of weekDays) {
    if (logs[wd] === 'active' || logs[wd] === 'rest') {
      weeklyActiveDays += 1;
    }
  }

  return {
    currentStreak: streak,
    longestStreak: maxStreak,
    freezeTokensRemaining: freezeTokens,
    freezeTokensUsedDays: freezeUsedDays,
    todayStatus,
    weeklyActiveDays,
    weeklyGoalDays: options.weeklyGoalDays,
    weeklyGoalMet: weeklyActiveDays >= options.weeklyGoalDays,
    updatedLogs: logs,
  };
}
