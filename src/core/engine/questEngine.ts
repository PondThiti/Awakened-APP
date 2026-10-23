import questsJson from '../../../assets/config/quests.json';
import xpConfigJson from '../../../assets/config/xp_config.json';
import { QuestInstance, QuestTemplate } from './types';

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
}

const defaultTemplates: QuestTemplate[] = questsJson.quests as QuestTemplate[];

/**
 * Generates Daily Quest instances for `dayKey` following Section 8.2:
 * 1. Covers multiple categories (health, focus, mind)
 * 2. Uses recovery set if `isRestDay` is true
 * 3. Prefers short quests if `availableMinutesPerDay < 20`
 * 4. Avoids > 50% overlap with yesterday's quests
 */
export function generateDailyQuestsForDay(options: {
  dayKey: string;
  isRestDay: boolean;
  availableMinutesPerDay: number;
  waterGoalMl: number;
  yesterdayTemplateIds?: string[];
  count?: number;
  templates?: QuestTemplate[];
}): QuestInstance[] {
  const templates = (options.templates ?? defaultTemplates).filter((t) => t.type === 'daily');
  const count = options.count ?? 4;
  const yesterdaySet = new Set(options.yesterdayTemplateIds ?? []);

  let pool = [...templates];

  if (options.isRestDay) {
    // Recovery set: exclude heavy workouts, include rest/stretch, water, mind, light focus
    pool = pool.filter((q) => q.id !== 'daily_workout_session');
  } else {
    // Normal day: exclude rest-only quest unless needed
    pool = pool.filter((q) => q.id !== 'daily_rest_recovery');
  }

  if (options.availableMinutesPerDay < 20) {
    // Adaptive Plan rule: prioritize 'short' or 'easy' quests
    pool.sort((a, b) => {
      const aShort = a.tags?.includes('short') || a.tags?.includes('easy') ? 0 : 1;
      const bShort = b.tags?.includes('short') || b.tags?.includes('easy') ? 0 : 1;
      return aShort - bShort;
    });
  }

  // Deterministic seed from dayKey so the same day selects consistently
  const seed = options.dayKey
    .split('')
    .reduce((acc, ch, idx) => acc + ch.charCodeAt(0) * (idx + 17), 0);

  const byCategory: Record<string, QuestTemplate[]> = {
    health: pool.filter((q) => q.category === 'health'),
    focus: pool.filter((q) => q.category === 'focus'),
    mind: pool.filter((q) => q.category === 'mind'),
  };

  const selected: QuestTemplate[] = [];
  const maxOverlap = Math.floor(count / 2);
  let overlapCount = 0;

  const pickFrom = (list: QuestTemplate[], offset: number) => {
    if (list.length === 0) return;
    for (let i = 0; i < list.length; i++) {
      const candidate = list[(seed + offset + i) % list.length];
      if (selected.some((s) => s.id === candidate.id)) continue;
      if (yesterdaySet.has(candidate.id) && overlapCount >= maxOverlap && list.length > 1) {
        continue;
      }
      selected.push(candidate);
      if (yesterdaySet.has(candidate.id)) overlapCount++;
      return;
    }
  };

  if (options.isRestDay) {
    const restQuest = pool.find((q) => q.id === 'daily_rest_recovery');
    if (restQuest) selected.push(restQuest);
  }

  pickFrom(byCategory.health, 1);
  pickFrom(byCategory.focus, 3);
  pickFrom(byCategory.mind, 5);

  // Fill remaining up to `count`
  let fillIdx = 0;
  while (selected.length < count && fillIdx < pool.length * 2) {
    const candidate = pool[(seed + fillIdx) % pool.length];
    fillIdx++;
    if (selected.some((s) => s.id === candidate.id)) continue;
    if (yesterdaySet.has(candidate.id) && overlapCount >= maxOverlap && pool.length > count) {
      continue;
    }
    selected.push(candidate);
    if (yesterdaySet.has(candidate.id)) overlapCount++;
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

  const metricKey = quest.template.condition.metric as keyof DailyMetricsSnapshot;
  const rawProgress = Number(metrics[metricKey] ?? 0);
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
