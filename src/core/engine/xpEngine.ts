import xpConfigJson from '../../../assets/config/xp_config.json';
import { CustomIntensity } from './types';

export type XpActivityKey =
  | 'water_log'
  | 'water_goal'
  | 'meal_log'
  | 'workout'
  | 'pomodoro'
  | 'journal'
  | 'mood'
  | 'rest_checkin'
  | 'custom_light'
  | 'custom_mid'
  | 'custom_hard';

export interface XpCalculationInput {
  activityKey: XpActivityKey;
  /** Number of times this specific activityKey has already awarded XP on this day */
  countTodayForKey: number;
  /** Total custom activities (light+mid+hard combined) that already awarded XP today */
  customCountToday?: number;
  /** Total repeatable activity XP already earned on this day (excluding quests/milestones) */
  dailyRepeatableXpSoFar: number;
  /** Timestamp (ms) of the last logged item of the same activity type, if any */
  lastSameTypeOccurredAtMs?: number | null;
  /** Timestamp (ms) when this activity occurred */
  occurredAtMs: number;
  /** Current clock timestamp (ms) */
  nowMs?: number;
  /** Optional workout duration in minutes for workout bonus calculation */
  workoutDurationMinutes?: number;
  /** Optional flag if workout completed all planned sets/reps */
  workoutPlanCompleted?: boolean;
  /** Optional journal character length (requires >= 20 chars) */
  journalCharCount?: number;
  /** Optional Pomodoro completed flag (cancelled mid-way = 0 XP) */
  pomodoroCompleted?: boolean;
}

export interface XpCalculationResult {
  xpAwarded: number;
  rawXp: number;
  reasonKey: string;
  isBackfilled: boolean;
  countsForStreak: boolean;
  softCapApplied: boolean;
  cappedByDailyMax: boolean;
  blockedByCooldown: boolean;
}

export function getCustomActivityKey(intensity: CustomIntensity = 'mid'): XpActivityKey {
  if (intensity === 'light') return 'custom_light';
  if (intensity === 'hard') return 'custom_hard';
  return 'custom_mid';
}

export function calculateActivityXp(
  input: XpCalculationInput,
  config = xpConfigJson
): XpCalculationResult {
  const nowMs = input.nowMs ?? Date.now();
  const occurredAtMs = input.occurredAtMs;

  // 1. Prevent future clock cheating (> 5 minutes in the future)
  if (occurredAtMs > nowMs + 5 * 60 * 1000) {
    return {
      xpAwarded: 0,
      rawXp: 0,
      reasonKey: 'future_timestamp_blocked',
      isBackfilled: false,
      countsForStreak: false,
      softCapApplied: false,
      cappedByDailyMax: false,
      blockedByCooldown: false,
    };
  }

  // 2. Check Pomodoro completion requirement (Section 6.6)
  if (input.activityKey === 'pomodoro' && input.pomodoroCompleted === false) {
    return {
      xpAwarded: 0,
      rawXp: 0,
      reasonKey: 'pomodoro_incomplete',
      isBackfilled: false,
      countsForStreak: false,
      softCapApplied: false,
      cappedByDailyMax: false,
      blockedByCooldown: false,
    };
  }

  // 3. Check Journal minimum character requirement (Section 7.1: >= 20 chars)
  if (input.activityKey === 'journal') {
    const minChars = config.activities.journal.min_chars ?? 20;
    if ((input.journalCharCount ?? 0) < minChars) {
      return {
        xpAwarded: 0,
        rawXp: 0,
        reasonKey: 'journal_too_short',
        isBackfilled: false,
        countsForStreak: true,
        softCapApplied: false,
        cappedByDailyMax: false,
        blockedByCooldown: false,
      };
    }
  }

  // 4. Anti-spam cooldown (< 2 minutes from previous same activity type, except water_goal bonus)
  const cooldownMs = (config.duplicate_cooldown_sec ?? 120) * 1000;
  if (
    input.activityKey !== 'water_goal' &&
    input.lastSameTypeOccurredAtMs != null &&
    Math.abs(occurredAtMs - input.lastSameTypeOccurredAtMs) < cooldownMs
  ) {
    return {
      xpAwarded: 0,
      rawXp: 0,
      reasonKey: 'duplicate_cooldown',
      isBackfilled: false,
      countsForStreak: true,
      softCapApplied: false,
      cappedByDailyMax: false,
      blockedByCooldown: true,
    };
  }

  // 5. Check max_per_day cap
  const actSpec = config.activities[input.activityKey];
  const maxPerDay = actSpec.max_per_day;
  const effectiveCount = input.activityKey.startsWith('custom_')
    ? (input.customCountToday ?? input.countTodayForKey)
    : input.countTodayForKey;

  if (effectiveCount >= maxPerDay) {
    return {
      xpAwarded: 0,
      rawXp: 0,
      reasonKey: `${input.activityKey}_daily_max_reached`,
      isBackfilled: false,
      countsForStreak: true,
      softCapApplied: false,
      cappedByDailyMax: true,
      blockedByCooldown: false,
    };
  }

  // 6. Compute base + bonus raw XP
  let rawXp = actSpec.xp;
  if (input.activityKey === 'workout') {
    const wSpec = config.activities.workout;
    const durationMin = Math.max(0, input.workoutDurationMinutes ?? 0);
    const durationBonus = Math.min(
      wSpec.bonus_cap ?? 15,
      Math.floor(durationMin / 2) * (wSpec.bonus_per_2min ?? 1)
    );
    const planBonus = input.workoutPlanCompleted ? (wSpec.plan_complete_bonus ?? 10) : 0;
    rawXp += durationBonus + planBonus;
  }

  // 7. Check Backfill (> 24 hours in the past => 50% XP and does not count for streak)
  const backfillThresholdMs = (config.backfill_threshold_hours ?? 24) * 3600 * 1000;
  const isBackfilled = nowMs - occurredAtMs > backfillThresholdMs;
  let adjustedXp = rawXp;
  if (isBackfilled) {
    adjustedXp = Math.max(1, Math.floor(adjustedXp * (config.backfill_multiplier ?? 0.5)));
  }

  // 8. Check Daily Soft Cap (300 XP/day from repeatable activities -> 25% above cap)
  const softCap = config.daily_soft_cap ?? 300;
  const overCapMult = config.over_cap_multiplier ?? 0.25;
  const soFar = Math.max(0, input.dailyRepeatableXpSoFar);

  let finalXp = adjustedXp;
  let softCapApplied = false;

  if (soFar >= softCap) {
    softCapApplied = true;
    finalXp = Math.max(1, Math.floor(adjustedXp * overCapMult));
  } else if (soFar + adjustedXp > softCap) {
    softCapApplied = true;
    const normalPart = softCap - soFar;
    const overPart = soFar + adjustedXp - softCap;
    finalXp = normalPart + Math.max(1, Math.floor(overPart * overCapMult));
  }

  return {
    xpAwarded: finalXp,
    rawXp,
    reasonKey: input.activityKey,
    isBackfilled,
    countsForStreak: !isBackfilled,
    softCapApplied,
    cappedByDailyMax: false,
    blockedByCooldown: false,
  };
}

/**
 * Section 7.6: Deleting an activity within 10 minutes of creation reverts its XP.
 * Deleting after 10 minutes keeps XP intact (No Punishment principle).
 */
export function canRevertXpOnDelete(
  createdAtMs: number,
  nowMs: number = Date.now(),
  config = xpConfigJson
): boolean {
  const windowMs = (config.delete_revert_window_sec ?? 600) * 1000;
  return Math.max(0, nowMs - createdAtMs) <= windowMs;
}
