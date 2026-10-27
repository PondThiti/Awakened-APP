import xpConfigJson from '../../../assets/config/xp_config.json';
import {
  ActivityRecord,
  ComebackQuestState,
  InactivityPenaltySettings,
  OnboardingProfile,
  QuestInstance,
  StreakDayStatus,
  TrainingPlanDay,
  XpEventRecord,
} from './types';
import { isMinorAgeBand } from './onboardingEngine';
import { computeLevelState } from './levelEngine';
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

// ============================================================================
// Section 1: Inactivity 30% EXP Penalty + Grace Period + Vacation + Shield
// ============================================================================

const rawInactivityCfg = (xpConfigJson as Record<string, any>).inactivity_penalty ?? {};

export const INACTIVITY: InactivityPenaltySettings = {
  enabled: rawInactivityCfg.enabled ?? true,
  graceDays: rawInactivityCfg.grace_days ?? 2,
  penaltyPercent: rawInactivityCfg.penalty_percent ?? 30,
  scope: (rawInactivityCfg.scope as 'level' | 'total') ?? 'total',
  repeat: (rawInactivityCfg.repeat as 'every3days' | 'once') ?? 'every3days',
  missRule: (rawInactivityCfg.miss_rule as 'any' | 'all') ?? 'all',
  restDayCountsAsKept: rawInactivityCfg.rest_day_counts_as_kept ?? true,
  comebackRefundPercent: rawInactivityCfg.comeback_refund_percent ?? 50,
};

export function resolveInactivitySettings(
  overrides?: Partial<InactivityPenaltySettings> | null
): InactivityPenaltySettings {
  return {
    ...INACTIVITY,
    ...(overrides ?? {}),
  };
}

export function isDayKeptForInactivity(opts: {
  dayKey: string;
  settings: InactivityPenaltySettings;
  trainingPlan: TrainingPlanDay[];
  activities: ActivityRecord[];
  dailyQuestsByDay: Record<string, QuestInstance[]>;
  streakLogs: Record<string, StreakDayStatus>;
  restModeToday?: string | null;
  vacationStartDayKey?: string | null;
  vacationUntilDayKey?: string | null;
  vacationDaysSet?: Set<string>;
}): { kept: boolean; isRestOrVacation: boolean } {
  const {
    dayKey,
    settings,
    trainingPlan,
    activities,
    dailyQuestsByDay,
    streakLogs,
    restModeToday,
    vacationStartDayKey,
    vacationUntilDayKey,
    vacationDaysSet,
  } = opts;

  const weekday = getWeekdayOneBased(dayKey);
  const plannedRest = trainingPlan.find((d) => d.weekday === weekday)?.dayType === 'rest';
  const logStatus = streakLogs[dayKey];
  const dayActs = activities.filter(
    (a) => !a.deletedAt && getLocalDayKey(a.occurredAt, a.tzOffsetMin) === dayKey
  );
  const hasRestAct = dayActs.some((a) => a.type === 'rest');
  const isManualRest = restModeToday === dayKey || logStatus === 'rest' || hasRestAct;
  const inVacationRange = Boolean(
    vacationUntilDayKey &&
      dayKey <= vacationUntilDayKey &&
      (!vacationStartDayKey || dayKey >= vacationStartDayKey)
  );
  const isVacation = Boolean(vacationDaysSet?.has(dayKey)) || inVacationRange;

  const isRestOrVacation = plannedRest || isManualRest || isVacation;
  if (settings.restDayCountsAsKept && isRestOrVacation) {
    return { kept: true, isRestOrVacation: true };
  }

  const quests = dailyQuestsByDay[dayKey] ?? [];
  if (settings.missRule === 'all') {
    if (quests.length > 0) {
      return {
        kept: quests.every((q) => q.status === 'completed'),
        isRestOrVacation: false,
      };
    }
    return {
      kept: dayActs.length > 0 || logStatus === 'active',
      isRestOrVacation: false,
    };
  }

  // Default missRule === 'any': at least 1 completed quest OR at least 1 logged activity / active log
  const anyQuestDone = quests.some((q) => q.status === 'completed');
  const anyActDone = dayActs.length > 0 || logStatus === 'active';
  return {
    kept: anyQuestDone || anyActDone,
    isRestOrVacation: false,
  };
}

export interface SettleInactivityInput {
  todayKey: string;
  /** Account creation timestamp (ms) or start date key; days on/before creation day are not penalized. */
  createdAt: number;
  startDayKey?: string;
  totalXp: number;
  xpEvents: XpEventRecord[];
  trainingPlan: TrainingPlanDay[];
  activities: ActivityRecord[];
  dailyQuestsByDay: Record<string, QuestInstance[]>;
  streakLogs: Record<string, StreakDayStatus>;
  restModeToday?: string | null;
  vacationStartDayKey?: string | null;
  vacationUntilDayKey?: string | null;
  vacationDaysSet?: Set<string>;
  penaltyShields?: number;
  settings?: Partial<InactivityPenaltySettings> | null;
  nowMs?: number;
}

export interface SettleInactivityResult {
  newTotalXp: number;
  totalDeductedXp: number;
  newEvents: XpEventRecord[];
  shieldsRemaining: number;
  shieldsUsed: number;
  /** Consecutive missed days leading into today (e.g. 2 means Day-2 warning should be shown). */
  consecutiveMissedDays: number;
  /** True when consecutiveMissedDays === graceDays and today is not yet kept/rest/vacation. */
  warningActive: boolean;
  /** Estimated XP loss if today is also missed (30% of current xpInLevel or totalXp). */
  estimatedPenaltyXp: number;
  /** Populated when a penalty was newly applied (or remains unclaimed from the current run). */
  comebackQuest: ComebackQuestState | null;
}

/**
 * Retroactively settles completed past days up to yesterday (`todayKey - 1 day`)
 * for the 30% Inactivity EXP Penalty.
 * - Idempotent via `idemKey = penalty:${runStart}:${run}` stored in `xpEvents`.
 * - Respects graceDays (default 2 -> triggers on 3rd consecutive missed day).
 * - Respects scope ('level' never drops the player's current level).
 * - Consumes a Penalty Shield if available before deducting EXP.
 */
export function settleInactivity(input: SettleInactivityInput): SettleInactivityResult {
  const settings = resolveInactivitySettings(input.settings);
  const nowMs = input.nowMs ?? Date.now();
  let runningTotalXp = Math.max(0, input.totalXp);
  let shieldsRemaining = Math.max(0, input.penaltyShields ?? 0);
  let shieldsUsed = 0;
  let totalDeductedXp = 0;
  const newEvents: XpEventRecord[] = [];
  let latestComebackQuest: ComebackQuestState | null = null;

  if (!settings.enabled) {
    return {
      newTotalXp: runningTotalXp,
      totalDeductedXp: 0,
      newEvents: [],
      shieldsRemaining,
      shieldsUsed: 0,
      consecutiveMissedDays: 0,
      warningActive: false,
      estimatedPenaltyXp: 0,
      comebackQuest: null,
    };
  }

  const createdDayKey = input.startDayKey ?? getLocalDayKey(input.createdAt);
  const firstCheckDayKey = addDaysToDayKey(createdDayKey, 1);
  const yesterdayKey = addDaysToDayKey(input.todayKey, -1);

  const existingIdemKeys = new Set<string>();
  for (const ev of input.xpEvents) {
    if (ev.idemKey) existingIdemKeys.add(ev.idemKey);
  }

  const threshold = Math.max(1, settings.graceDays + 1); // default 2 + 1 = 3
  let run = 0;
  let runStart: string | null = null;
  let nextEventId =
    input.xpEvents.reduce((maxId, e) => (e.id > maxId ? e.id : maxId), 0) + 1;

  if (firstCheckDayKey <= yesterdayKey) {
    let cursor = firstCheckDayKey;
    let safetyCounter = 0;
    while (cursor <= yesterdayKey && safetyCounter < 730) {
      safetyCounter += 1;
      const { kept } = isDayKeptForInactivity({
        dayKey: cursor,
        settings,
        trainingPlan: input.trainingPlan,
        activities: input.activities,
        dailyQuestsByDay: input.dailyQuestsByDay,
        streakLogs: input.streakLogs,
        restModeToday: input.restModeToday,
        vacationStartDayKey: input.vacationStartDayKey,
        vacationUntilDayKey: input.vacationUntilDayKey,
        vacationDaysSet: input.vacationDaysSet,
      });

      if (kept) {
        run = 0;
        runStart = null;
      } else {
        if (run === 0) runStart = cursor;
        run += 1;

        const shouldTrigger =
          settings.repeat === 'every3days'
            ? run >= threshold && run % threshold === 0
            : run === threshold;

        if (shouldTrigger && runStart) {
          const idemKey = `penalty:${runStart}:${run}`;
          if (!existingIdemKeys.has(idemKey)) {
            existingIdemKeys.add(idemKey);

            if (shieldsRemaining > 0) {
              shieldsRemaining -= 1;
              shieldsUsed += 1;
              const shieldEvent: XpEventRecord = {
                id: nextEventId++,
                amount: 0,
                sourceType: 'penalty',
                sourceId: cursor,
                reasonKey: 'inactivity_shield_used',
                configVersion: 1,
                occurredAt: nowMs,
                idemKey,
                dayKey: cursor,
              };
              newEvents.push(shieldEvent);
            } else {
              const lvl = computeLevelState(runningTotalXp);
              const base = settings.scope === 'level' ? lvl.xpInLevel : runningTotalXp;
              const rawLoss = Math.floor(base * (settings.penaltyPercent / 100));
              const loss =
                settings.scope === 'level'
                  ? Math.min(rawLoss, lvl.xpInLevel)
                  : Math.min(rawLoss, runningTotalXp);

              runningTotalXp = Math.max(0, runningTotalXp - loss);
              totalDeductedXp += loss;

              const penaltyEvent: XpEventRecord = {
                id: nextEventId++,
                amount: -loss,
                sourceType: 'penalty',
                sourceId: cursor,
                reasonKey: 'inactivity_3d',
                configVersion: 1,
                occurredAt: nowMs,
                idemKey,
                dayKey: cursor,
              };
              newEvents.push(penaltyEvent);

              if (loss > 0) {
                const refundableXp = Math.floor(
                  loss * (settings.comebackRefundPercent / 100)
                );
                latestComebackQuest = {
                  penaltyEventId: penaltyEvent.id,
                  penaltyIdemKey: idemKey,
                  penaltyDayKey: cursor,
                  missedDaysRun: run,
                  deductedXp: loss,
                  refundableXp,
                  claimedAt: null,
                  dismissedAt: null,
                };
              }
            }
          }
        }
      }

      cursor = addDaysToDayKey(cursor, 1);
    }
  }

  // Evaluate today's status to see if the user already completed a quest today (which clears the warning)
  const todayCheck = isDayKeptForInactivity({
    dayKey: input.todayKey,
    settings,
    trainingPlan: input.trainingPlan,
    activities: input.activities,
    dailyQuestsByDay: input.dailyQuestsByDay,
    streakLogs: input.streakLogs,
    restModeToday: input.restModeToday,
    vacationStartDayKey: input.vacationStartDayKey,
    vacationUntilDayKey: input.vacationUntilDayKey,
    vacationDaysSet: input.vacationDaysSet,
  });

  const consecutiveMissedDays = todayCheck.kept ? 0 : run;
  const nextIfMissedToday = consecutiveMissedDays + 1;
  const wouldTriggerTonight =
    !todayCheck.kept &&
    (settings.repeat === 'every3days'
      ? nextIfMissedToday >= threshold && nextIfMissedToday % threshold === 0
      : nextIfMissedToday === threshold);

  const currentLvl = computeLevelState(runningTotalXp);
  const estBase = settings.scope === 'level' ? currentLvl.xpInLevel : runningTotalXp;
  const estimatedPenaltyXp = Math.floor(estBase * (settings.penaltyPercent / 100));

  return {
    newTotalXp: runningTotalXp,
    totalDeductedXp,
    newEvents,
    shieldsRemaining,
    shieldsUsed,
    consecutiveMissedDays,
    warningActive: wouldTriggerTonight,
    estimatedPenaltyXp,
    comebackQuest: latestComebackQuest,
  };
}
