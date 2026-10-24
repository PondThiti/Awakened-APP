import {
  ActivityRecord,
  OnboardingProfile,
  QuestInstance,
  StreakDayStatus,
  TrainingPlanDay,
} from './types';
import { isMinorAgeBand } from './onboardingEngine';
import {
  addDaysToDayKey,
  getLocalDayKey,
  getWeekdayOneBased,
} from '../utils/dateUtils';

/**
 * Hidden workout penalty.
 *
 * If the user skips the exercise requirement on a normal (non-rest) day, the NEXT non-rest day
 * multiplies the exercise quests by a rank-based factor. The factor is intentionally never shown
 * in the UI – the user is only told that skipping exercise leads to a penalty.
 *
 *   Rank E        -> x1.4
 *   Rank D, C     -> x1.8
 *   Rank B, A     -> x2.2
 *   Rank S and up -> x2.5   (S, SS, Monarch)
 *
 * Only exercise (body-slot workout) quests are affected. Minors and users with injury / medical /
 * pregnancy safety flags are exempt, in line with the safety rules of the app.
 */
export const WORKOUT_PENALTY_MULTIPLIER_BY_RANK: Record<string, number> = {
  E: 1.4,
  D: 1.8,
  C: 1.8,
  B: 2.2,
  A: 2.2,
  S: 2.5,
  SS: 2.5,
  M: 2.5,
};

export function getWorkoutPenaltyMultiplier(rankId: string): number {
  return WORKOUT_PENALTY_MULTIPLIER_BY_RANK[rankId] ?? 1;
}

export function isWorkoutPenaltyExempt(onboarding?: OnboardingProfile | null): boolean {
  if (!onboarding) return false;
  if (isMinorAgeBand(onboarding.ageBand)) return true;
  return (onboarding.safetyFlags ?? []).some(
    (f) => f === 'injured_now' || f === 'medical_limit' || f === 'pregnancy'
  );
}

/** Exercise quests that can be punished (recovery / rest quests never are). */
export function isPenalizableBodyQuest(q: {
  id?: string;
  slot?: string;
  tags?: string[];
  condition: { metric: string };
}): boolean {
  if (q.slot !== 'body') return false;
  if (q.id === 'daily_rest_recovery') return false;
  if (q.tags?.includes('rest')) return false;
  return q.condition.metric === 'workout_min' || q.condition.metric === 'workout_count';
}

/**
 * Returns a copy of the quest instance with the hidden penalty applied.
 * - workout_min quests: target minutes are multiplied (rounded up).
 * - workout_count quests: a hidden minimum workout duration is required in addition to the session.
 */
export function applyPenaltyToQuestInstance(
  inst: QuestInstance,
  multiplier: number
): QuestInstance {
  if (multiplier <= 1 || !isPenalizableBodyQuest({ ...inst.template, id: inst.templateId })) {
    return inst;
  }
  if (inst.template.condition.metric === 'workout_min') {
    return {
      ...inst,
      target: Math.ceil(inst.target * multiplier),
      penaltyMultiplier: multiplier,
    };
  }
  const baseMinutes = inst.template.duration_min?.[0] ?? 10;
  return {
    ...inst,
    penaltyMultiplier: multiplier,
    minWorkoutMin: Math.ceil(baseMinutes * multiplier),
  };
}

export interface WorkoutPenaltyResult {
  /** True when today's exercise quests are penalized. */
  active: boolean;
  multiplier: number;
  /** True when the user is exempt (minor / safety flag) so no penalty will ever apply. */
  exempt: boolean;
}

/**
 * Decides whether today's exercise quests are penalized.
 * Looks back (up to `lookbackDays`) for the most recent non-rest day before today and checks
 * whether the user fulfilled the exercise requirement on that day.
 */
export function evaluateWorkoutPenalty(opts: {
  todayKey: string;
  rankId: string;
  trainingPlan: TrainingPlanDay[];
  activities: ActivityRecord[];
  dailyQuestsByDay: Record<string, QuestInstance[]>;
  streakLogs: Record<string, StreakDayStatus>;
  /** Epoch ms when the profile was created – days on/before it are a grace period. */
  createdAt: number;
  onboarding?: OnboardingProfile | null;
  lookbackDays?: number;
}): WorkoutPenaltyResult {
  const multiplier = getWorkoutPenaltyMultiplier(opts.rankId);
  if (isWorkoutPenaltyExempt(opts.onboarding)) {
    return { active: false, multiplier: 1, exempt: true };
  }
  const none: WorkoutPenaltyResult = { active: false, multiplier, exempt: false };
  const lookback = opts.lookbackDays ?? 14;
  const graceDayKey = getLocalDayKey(opts.createdAt);

  const activeActs = opts.activities.filter((a) => !a.deletedAt);

  for (let i = 1; i <= lookback; i++) {
    const dk = addDaysToDayKey(opts.todayKey, -i);
    if (dk <= graceDayKey) return none; // account didn't exist yet / first day grace

    const weekday = getWeekdayOneBased(dk);
    const plannedRest =
      opts.trainingPlan.find((d) => d.weekday === weekday)?.dayType === 'rest';
    const logStatus = opts.streakLogs[dk];
    const dayActs = activeActs.filter((a) => getLocalDayKey(a.occurredAt, a.tzOffsetMin) === dk);
    // A 'frozen' (streak-protected) day is still a skipped workout, so it is NOT excused here.
    const usedRest = logStatus === 'rest' || dayActs.some((a) => a.type === 'rest');

    if (plannedRest || usedRest) continue; // rest days never break or reset the carry-over

    const quests = opts.dailyQuestsByDay[dk] ?? [];
    const wasPenalized = quests.some((q) => (q.penaltyMultiplier ?? 1) > 1);
    const hasWorkout = dayActs.some((a) => a.type === 'workout');
    const bodyQuestDone = quests.some(
      (q) =>
        q.status === 'completed' &&
        isPenalizableBodyQuest({ ...q.template, id: q.templateId })
    );
    const done = wasPenalized
      ? quests.some((q) => (q.penaltyMultiplier ?? 1) > 1 && q.status === 'completed')
      : hasWorkout || bodyQuestDone;

    return { active: !done, multiplier, exempt: false };
  }
  return none;
}
