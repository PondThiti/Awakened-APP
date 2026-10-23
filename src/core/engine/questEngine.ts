import questsJson from '../../../assets/config/quests.json';
import xpConfigJson from '../../../assets/config/xp_config.json';
import {
  OnboardingProfile,
  QuestInstance,
  QuestSlot,
  QuestTemplate,
} from './types';
import { isMinorAgeBand } from './onboardingEngine';

export interface DailyMetricsSnapshot {
  water_ml: number;
  water_goal: number;
  water_count: number;
  meal_count: number;
  workout_count: number;
  workout_min: number;
  pomodoro_count: number;
  journal_count: number;
  mood_count: number;
  rest_or_stretch: number;
  weekly_active_days: number;
  weekly_goal: number;
  weekly_focus_min: number;
  weekly_journal_days: number;
  total_activities: number;
  longest_streak: number;
  total_active_days: number;
  manual_done_ids?: string[];
}

const defaultTemplates: QuestTemplate[] = questsJson.quests as QuestTemplate[];

function getQuestMaxDurationMin(q: QuestTemplate): number {
  if (q.duration_min && q.duration_min.length === 2) {
    return q.duration_min[0];
  }
  return q.tags?.includes('short') || q.micro ? 3 : 10;
}

function isQuestEligibleForOnboarding(
  q: QuestTemplate,
  onboarding: OnboardingProfile | undefined,
  nowMs: number
): boolean {
  if (!onboarding) return true;

  // Age Band exclusions (Section 8.1)
  if (q.excludes?.age_band?.includes(onboarding.ageBand)) {
    return false;
  }
  if (isMinorAgeBand(onboarding.ageBand)) {
    if (
      q.tags?.includes('calorie_control') ||
      q.tags?.includes('diet_restrict') ||
      q.tags?.includes('max_effort_test') ||
      q.id === 'disc_reduce_sugar_fried'
    ) {
      return false;
    }
  }

  // Safety Flag exclusions (Section 8.2)
  const flags = onboarding.safetyFlags ?? [];
  if (q.excludes?.safety_flags?.some((sf) => flags.includes(sf))) {
    return false;
  }
  if (
    (flags.includes('injured_now') ||
      flags.includes('medical_limit') ||
      flags.includes('pregnancy')) &&
    q.slot === 'body' &&
    !q.tags?.includes('recovery') &&
    !q.tags?.includes('low_impact') &&
    !q.micro
  ) {
    return false;
  }

  // Equipment check (Q12)
  if (
    q.requires?.equipment_any &&
    q.requires.equipment_any.length > 0 &&
    !q.requires.equipment_any.includes(onboarding.equipment)
  ) {
    return false;
  }

  // Quick Wins 7-day micro-quest enforcement for "fading_fire" boss (Section 6.5 & 6.6)
  const quickWinsActive =
    Boolean(onboarding.quickWinsUntil && nowMs < onboarding.quickWinsUntil) &&
    onboarding.bosses.includes('fading_fire');
  if (quickWinsActive && !q.micro && q.slot === 'body') {
    return false;
  }

  // Tier check (allow <= startTier + 1 or micro)
  if (q.tier && q.tier.length > 0) {
    const maxAllowedTier = quickWinsActive ? 1 : onboarding.startTier;
    const minQuestTier = Math.min(...q.tier);
    if (minQuestTier > maxAllowedTier) {
      return false;
    }
  }

  // Time fit check (Q13)
  if (getQuestMaxDurationMin(q) > onboarding.minutesPerDay) {
    return false;
  }

  return true;
}

function computeBoostScore(
  q: QuestTemplate,
  onboarding: OnboardingProfile | undefined
): number {
  if (!onboarding) return 1;
  let score = 1;
  const boosts = q.boosts;
  if (boosts) {
    if (boosts.path?.includes(onboarding.path)) score += 3;
    if (boosts.bosses?.some((b) => onboarding.bosses.includes(b))) score += 4;
    if (
      boosts.discipline_picks?.some((dp) =>
        onboarding.disciplinePicks.includes(dp)
      )
    ) {
      score += 6;
    }
    if (boosts.activities?.some((act) => onboarding.activities.includes(act))) {
      score += 2;
    }
  }

  // Tier exact match bonus
  if (q.tier?.includes(onboarding.startTier)) {
    score += 2;
  }

  // Short time preference
  if (onboarding.minutesPerDay <= 15 && q.micro) {
    score += 3;
  }

  return score;
}

/**
 * Generates Daily Quest instances for `dayKey` following Section 8.2 & Onboarding Questionnaire Section 6:
 * 1. Covers 3 Main Slots (Body, Mind/Discipline, Foundation) + 1 Bonus Quest
 * 2. Uses recovery set if `isRestDay` is true
 * 3. Uses Comeback Quest set if `missedDaysInRow >= 2` (Zero Penalty!)
 * 4. Respects Onboarding Tier, Quick Wins (7 days), Safety Flags, Age Rules, Discipline Picks (Q19), and Daily Time Cap (Q13)
 * 5. Avoids > 1/3 overlap with yesterday's quests
 */
export function generateDailyQuestsForDay(options: {
  dayKey: string;
  isRestDay: boolean;
  availableMinutesPerDay: number;
  waterGoalMl: number;
  yesterdayTemplateIds?: string[];
  count?: number;
  templates?: QuestTemplate[];
  onboarding?: OnboardingProfile;
  missedDaysInRow?: number;
  nowMs?: number;
}): QuestInstance[] {
  const nowMs = options.nowMs ?? Date.now();
  const templates = (options.templates ?? defaultTemplates).filter(
    (t) => t.type === 'daily'
  );
  const yesterdaySet = new Set(options.yesterdayTemplateIds ?? []);
  const onboarding = options.onboarding;
  const maxMinutes = onboarding?.minutesPerDay ?? options.availableMinutesPerDay ?? 30;

  // Section 6.8: Comeback Quest when missed >= 2 days in a row (light micro + mind set, zero penalty)
  if ((options.missedDaysInRow ?? 0) >= 2) {
    const comebackPool = templates.filter(
      (q) =>
        (q.comeback || q.micro) &&
        isQuestEligibleForOnboarding(q, onboarding, nowMs)
    );
    const chosenComeback = comebackPool.slice(0, 3);
    if (chosenComeback.length >= 2) {
      return chosenComeback.map((tpl, idx) => ({
        id: idx + 1,
        templateId: tpl.id,
        template: tpl,
        periodKey: options.dayKey,
        progress: 0,
        target:
          tpl.condition.target === 'user_goal'
            ? options.waterGoalMl
            : typeof tpl.condition.target === 'number'
            ? tpl.condition.target
            : 1,
        status: 'available',
        completedAt: null,
      }));
    }
  }

  let pool = templates.filter((q) =>
    isQuestEligibleForOnboarding(q, onboarding, nowMs)
  );
  if (pool.length < 3) {
    pool = [...templates];
  }

  if (options.isRestDay) {
    pool = pool.filter(
      (q) =>
        q.id !== 'daily_workout_session' &&
        q.id !== 'body_volume_pushup_50' &&
        q.id !== 'body_full_hypertrophy_45m'
    );
  } else {
    pool = pool.filter((q) => q.id !== 'daily_rest_recovery');
  }

  // Deterministic seed from dayKey
  const seed = options.dayKey
    .split('')
    .reduce((acc, ch, idx) => acc + ch.charCodeAt(0) * (idx + 17), 0);

  // Sort pool by boost score descending, then deterministic seed order
  const scoredPool = [...pool].sort((a, b) => {
    const diff = computeBoostScore(b, onboarding) - computeBoostScore(a, onboarding);
    if (diff !== 0) return diff;
    return ((seed + a.id.charCodeAt(0)) % 13) - ((seed + b.id.charCodeAt(0)) % 13);
  });

  const count =
    options.count ??
    (onboarding?.bosses.includes('no_direction') ? 3 : 4);

  const selected: QuestTemplate[] = [];
  const maxOverlap = 1; // Section 11.1: <= 1 in 3 overlap with yesterday
  let overlapCount = 0;
  let usedMinutes = 0;

  const getSlot = (q: QuestTemplate): QuestSlot => {
    if (q.slot) return q.slot;
    if (q.category === 'health' && q.tags?.includes('workout')) return 'body';
    if (q.category === 'focus' || q.category === 'mind') return 'mind';
    return 'foundation';
  };

  const pickForSlot = (slot: QuestSlot, offset: number) => {
    const slotCandidates = scoredPool.filter((q) => getSlot(q) === slot);
    if (slotCandidates.length === 0) return;

    for (let i = 0; i < slotCandidates.length; i++) {
      const candidate = slotCandidates[(seed + offset + i) % slotCandidates.length];
      if (selected.some((s) => s.id === candidate.id)) continue;
      if (
        yesterdaySet.has(candidate.id) &&
        overlapCount >= maxOverlap &&
        slotCandidates.length > 1
      ) {
        continue;
      }
      const dur = getQuestMaxDurationMin(candidate);
      if (usedMinutes + dur > maxMinutes && !candidate.micro && slotCandidates.some((c) => c.micro)) {
        continue;
      }
      selected.push(candidate);
      usedMinutes += dur;
      if (yesterdaySet.has(candidate.id)) overlapCount++;
      return;
    }
  };

  if (options.isRestDay) {
    const restQuest = scoredPool.find((q) => q.id === 'daily_rest_recovery');
    if (restQuest) {
      selected.push(restQuest);
      usedMinutes += getQuestMaxDurationMin(restQuest);
    }
  }

  // Slot A: Body (every path gets >= 1 Body quest unless rest day, per Section 6.2)
  if (!options.isRestDay) {
    pickForSlot('body', 0);
  }
  // Slot B: Mind / Discipline
  pickForSlot('mind', 1);
  // Slot C: Foundation
  pickForSlot('foundation', 2);

  // Bonus Slot (prioritize Q19 discipline picks or path priority)
  const bonusSlotPriority: QuestSlot =
    onboarding?.path === 'strength'
      ? 'body'
      : onboarding?.path === 'discipline'
      ? 'mind'
      : 'mind';
  if (selected.length < count) {
    pickForSlot(bonusSlotPriority, 3);
  }

  // Fill any remaining slots while respecting maxMinutes
  for (let i = 0; i < scoredPool.length && selected.length < count; i++) {
    const candidate = scoredPool[(seed + i) % scoredPool.length];
    if (selected.some((s) => s.id === candidate.id)) continue;
    const dur = getQuestMaxDurationMin(candidate);
    if (usedMinutes + dur > maxMinutes && !candidate.micro) continue;
    selected.push(candidate);
    usedMinutes += dur;
  }

  // Fallback if still < 3
  for (let i = 0; i < scoredPool.length && selected.length < Math.min(3, count); i++) {
    const candidate = scoredPool[i];
    if (!selected.some((s) => s.id === candidate.id)) {
      selected.push(candidate);
    }
  }

  return selected.slice(0, count).map((tpl, idx) => {
    const targetVal =
      tpl.condition.target === 'user_goal'
        ? options.waterGoalMl
        : typeof tpl.condition.target === 'number'
        ? tpl.condition.target
        : 1;

    return {
      id: idx + 1,
      templateId: tpl.id,
      template: tpl,
      periodKey: options.dayKey,
      progress: 0,
      target: targetVal,
      status: 'available',
      completedAt: null,
    };
  });
}

/**
 * Evaluates a quest instance against current metrics and returns updated progress & completion state.
 */
export function evaluateQuestProgress(
  quest: QuestInstance,
  metrics: DailyMetricsSnapshot,
  nowMs: number = Date.now()
): { updated: QuestInstance; newlyCompleted: boolean } {
  if (quest.status === 'completed' || quest.status === 'skipped') {
    return { updated: quest, newlyCompleted: false };
  }

  // Support manual/discipline quests completed via 1-tap check
  if (quest.template.condition.metric === 'manual') {
    const doneManual = metrics.manual_done_ids?.includes(quest.templateId) ?? false;
    if (doneManual) {
      return {
        updated: {
          ...quest,
          progress: quest.target,
          status: 'completed',
          completedAt: nowMs,
        },
        newlyCompleted: true,
      };
    }
    return {
      updated: quest,
      newlyCompleted: false,
    };
  }

  const metricKey = quest.template.condition.metric as keyof DailyMetricsSnapshot;
  const rawValue = metrics[metricKey];
  const rawProgress = typeof rawValue === 'number' ? rawValue : 0;
  const target =
    quest.template.condition.target === 'user_goal'
      ? metrics.water_goal
      : quest.template.condition.target === 'weekly_goal'
      ? metrics.weekly_goal
      : Number(quest.target);

  const clampedProgress = Math.min(target, Math.max(0, rawProgress));
  const isDone = rawProgress >= target;

  if (isDone) {
    return {
      updated: {
        ...quest,
        target,
        progress: target,
        status: 'completed',
        completedAt: nowMs,
      },
      newlyCompleted: true,
    };
  }

  return {
    updated: {
      ...quest,
      target,
      progress: clampedProgress,
      status: clampedProgress > 0 ? 'in_progress' : 'available',
    },
    newlyCompleted: false,
  };
}

/**
 * Enforces Section 8.4: Personal Quests can award at most 50 XP/day in total.
 */
export function clampPersonalQuestXp(
  requestedXp: 10 | 25 | 50,
  personalQuestXpEarnedToday: number,
  config = xpConfigJson
): number {
  const cap = config.personal_quest_daily_cap ?? 50;
  const remaining = Math.max(0, cap - personalQuestXpEarnedToday);
  return Math.min(requestedXp, remaining);
}
