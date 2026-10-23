import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import achievementsJson from '../../assets/config/achievements.json';
import questsJson from '../../assets/config/quests.json';
import xpConfigJson from '../../assets/config/xp_config.json';
import {
  AchievementDef,
  AchievementUnlock,
  ActivityRecord,
  CelebrationEvent,
  CustomIntensity,
  FocusDetail,
  JournalEntry,
  LanguageCode,
  LevelState,
  MealDetail,
  MoodEntry,
  QuestInstance,
  QuestTemplate,
  RankDef,
  StreakDayStatus,
  ThemeMode,
  TrainingDayType,
  TrainingPlanDay,
  UserProfile,
  WorkoutDetail,
  XpEventRecord,
} from '../core/engine/types';
import { computeLevelState } from '../core/engine/levelEngine';
import { getRankForLevel, MonarchEligibility } from '../core/engine/rankEngine';
import {
  calculateActivityXp,
  canRevertXpOnDelete,
  getCustomActivityKey,
  XpActivityKey,
} from '../core/engine/xpEngine';
import {
  clampPersonalQuestXp,
  DailyMetricsSnapshot,
  evaluateQuestProgress,
  generateDailyQuestsForDay,
} from '../core/engine/questEngine';
import { evaluateStreakState, StreakEvaluationResult } from '../core/engine/streakEngine';
import {
  AdaptivePlanRecommendation,
  evaluateAdaptivePlan,
} from '../core/engine/adaptivePlanEngine';
import {
  getCurrentTzOffsetMin,
  getDaysInWeekRange,
  getLocalDayKey,
  getWeekdayOneBased,
  getWeekStartDayKey,
} from '../core/utils/dateUtils';
import { playSystemFeedback } from '../services/soundService';
import { ThaiFoodItem } from '../services/foodScannerService';

const STORAGE_KEY = 'AWAKENED_LIFE_RPG_STATE_V1';

export interface ActiveTimerState {
  isRunning: boolean;
  isPaused: boolean;
  startedAtMs: number | null;
  accumulatedSec: number;
  targetSec: number;
  label: string;
  mode: 'focus' | 'short_break' | 'long_break' | 'workout';
  workoutType?: WorkoutDetail['workoutType'];
  roundCount?: number;
}

export interface AwakenedDatabaseState {
  profile: UserProfile;
  activities: ActivityRecord[];
  xpEvents: XpEventRecord[];
  dailyQuestsByDay: Record<string, QuestInstance[]>;
  weeklyQuestsByWeek: Record<string, QuestInstance[]>;
  milestoneQuests: QuestInstance[];
  personalQuestTemplates: QuestTemplate[];
  personalQuestDoneByDay: Record<string, string[]>; // dayKey -> templateIds[]
  trainingPlan: TrainingPlanDay[];
  journals: JournalEntry[];
  moods: MoodEntry[];
  achievementsUnlocked: AchievementUnlock[];
  streakLogs: Record<string, StreakDayStatus>;
  customFoods: ThaiFoodItem[];
  activePomodoroTimer: ActiveTimerState | null;
  activeWorkoutTimer: ActiveTimerState | null;
}

const DEFAULT_TRAINING_PLAN: TrainingPlanDay[] = [
  { weekday: 1, dayType: 'upper', note: 'Push-up / Upper body' },
  { weekday: 2, dayType: 'cardio', note: 'Walk / Run 20m' },
  { weekday: 3, dayType: 'rest', note: 'Planned Rest & Stretch' },
  { weekday: 4, dayType: 'lower', note: 'Squat / Lunges' },
  { weekday: 5, dayType: 'full', note: 'Full Body Circuit' },
  { weekday: 6, dayType: 'stretch', note: 'Active Mobility' },
  { weekday: 7, dayType: 'rest', note: 'Sunday Recovery' },
];

const DEFAULT_PROFILE: UserProfile = {
  id: 1,
  displayName: 'Hunter',
  totalXp: 0,
  waterGoalMl: 2000,
  weeklyGoalDays: 4,
  weekStartDay: 1,
  longestStreak: 0,
  freezeTokens: 1,
  lastFreezeGrantWeek: getWeekStartDayKey(getLocalDayKey(), 1),
  availableMinutesPerDay: 30,
  restModeToday: null,
  dailyQuestSwapUsedDay: null,
  dashboardCardsOrder: ['quests', 'streak', 'water', 'stats', 'adaptive'],
  hiddenDashboardCards: [],
  language: 'th',
  theme: 'dark',
  soundEnabled: true,
  reduceEffects: false,
  appLockPin: null,
  createdAt: Date.now(),
};

function createInitialMilestoneQuests(): QuestInstance[] {
  const templates = (questsJson.quests as QuestTemplate[]).filter((q) => q.type === 'milestone');
  return templates.map((tpl, idx) => ({
    id: 1000 + idx,
    templateId: tpl.id,
    template: tpl,
    periodKey: 'milestone',
    progress: 0,
    target: typeof tpl.condition.target === 'number' ? tpl.condition.target : 1,
    status: 'available',
    completedAt: null,
  }));
}

function createInitialState(): AwakenedDatabaseState {
  const todayKey = getLocalDayKey();
  const weekday = getWeekdayOneBased(todayKey);
  const isRestToday = DEFAULT_TRAINING_PLAN.find((d) => d.weekday === weekday)?.dayType === 'rest';

  const dailyQuests = generateDailyQuestsForDay({
    dayKey: todayKey,
    isRestDay: Boolean(isRestToday),
    availableMinutesPerDay: DEFAULT_PROFILE.availableMinutesPerDay,
    waterGoalMl: DEFAULT_PROFILE.waterGoalMl,
  });

  const weekKey = getWeekStartDayKey(todayKey, 1);
  const weeklyTemplates = (questsJson.quests as QuestTemplate[]).filter((q) => q.type === 'weekly');
  const weeklyQuests: QuestInstance[] = weeklyTemplates.map((tpl, idx) => ({
    id: 500 + idx,
    templateId: tpl.id,
    template: tpl,
    periodKey: weekKey,
    progress: 0,
    target:
      tpl.condition.target === 'weekly_goal'
        ? DEFAULT_PROFILE.weeklyGoalDays
        : Number(tpl.condition.target),
    status: 'available',
    completedAt: null,
  }));

  return {
    profile: DEFAULT_PROFILE,
    activities: [],
    xpEvents: [],
    dailyQuestsByDay: { [todayKey]: dailyQuests },
    weeklyQuestsByWeek: { [weekKey]: weeklyQuests },
    milestoneQuests: createInitialMilestoneQuests(),
    personalQuestTemplates: [
      {
        id: 'personal_read_20m',
        type: 'personal',
        category: 'mind',
        title_th: 'อ่านหนังสือพัฒนาตัวเอง 20 นาที',
        title_en: 'Read a book for 20 minutes',
        condition: { metric: 'manual', op: '>=', target: 1 },
        reward_xp: 25,
        isCustom: true,
        isActive: true,
      },
    ],
    personalQuestDoneByDay: {},
    trainingPlan: DEFAULT_TRAINING_PLAN,
    journals: [],
    moods: [],
    achievementsUnlocked: [],
    streakLogs: {},
    customFoods: [],
    activePomodoroTimer: null,
    activeWorkoutTimer: null,
  };
}

export interface AwakenedContextValue {
  db: AwakenedDatabaseState;
  isLoaded: boolean;
  todayKey: string;
  levelState: LevelState;
  currentRank: RankDef;
  nextRank: RankDef | null;
  monarchEligibility: MonarchEligibility;
  streakState: StreakEvaluationResult;
  todayMetrics: DailyMetricsSnapshot;
  todayQuests: QuestInstance[];
  thisWeekQuests: QuestInstance[];
  adaptiveRecommendations: AdaptivePlanRecommendation[];
  dailyRepeatableXpToday: number;
  celebrationQueue: CelebrationEvent[];
  dismissCelebration: () => void;

  // Actions
  logWater: (amountMl: number) => void;
  logMeal: (title: string, detail: MealDetail, note?: string) => void;
  addCustomFoodTemplate: (food: Omit<ThaiFoodItem, 'id'>) => void;
  logWorkout: (title: string, detail: WorkoutDetail, note?: string) => void;
  logPomodoro: (detail: FocusDetail, note?: string) => void;
  logCustomActivity: (
    title: string,
    value: number,
    unit: string,
    intensity: CustomIntensity,
    note?: string,
    occurredAtMs?: number
  ) => void;
  logRestDayCheckin: (note?: string) => void;
  deleteActivity: (activityId: number) => { xpReverted: boolean; xpAmount: number };

  // Journal & Mood
  saveJournalEntry: (entry: { id?: number; title: string; body: string; category: string }) => void;
  deleteJournalEntry: (id: number) => void;
  logMoodEntry: (moodLevel: number, note: string, tags: string[]) => void;

  // Quests & Plan
  swapDailyQuest: (questInstanceId: number) => boolean;
  addPersonalQuest: (title: string, rewardXp: 10 | 25 | 50, category?: QuestTemplate['category']) => void;
  completePersonalQuest: (templateId: string) => void;
  deletePersonalQuest: (templateId: string) => void;
  toggleRestModeToday: () => void;
  updateTrainingPlanDay: (weekday: number, dayType: TrainingDayType, note?: string) => void;
  applyTrainingPreset: (preset: 'light' | 'balanced' | 'flexible') => void;

  // Persistent Timers
  setPomodoroTimerState: (timer: ActiveTimerState | null) => void;
  setWorkoutTimerState: (timer: ActiveTimerState | null) => void;

  // Profile, Settings & Data Management
  updateProfile: (patch: Partial<UserProfile>) => void;
  exportBackupJson: () => string;
  importBackupJson: (jsonStr: string) => { ok: boolean; message: string };
  deleteCategoryData: (category: 'meals' | 'journals' | 'moods') => void;
  resetAllData: () => void;
}

const AwakenedContext = createContext<AwakenedContextValue | null>(null);

export const AwakenedProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<AwakenedDatabaseState>(() => createInitialState());
  const [isLoaded, setIsLoaded] = useState(false);
  const [celebrationQueue, setCelebrationQueue] = useState<CelebrationEvent[]>([]);

  const todayKey = getLocalDayKey();
  const weekKey = getWeekStartDayKey(todayKey, db.profile.weekStartDay);

  // Load persisted state on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw && mounted) {
          const parsed = JSON.parse(raw) as AwakenedDatabaseState;
          setDb((prev) => ({
            ...prev,
            ...parsed,
            profile: { ...DEFAULT_PROFILE, ...parsed.profile },
          }));
        }
      } catch {
        // Fallback to initial state
      } finally {
        if (mounted) setIsLoaded(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Persist state on change
  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(db)).catch(() => {});
  }, [db, isLoaded]);

  // Ensure today's daily quests and this week's weekly quests exist
  useEffect(() => {
    if (!isLoaded) return;
    setDb((prev) => {
      let changed = false;
      const next = { ...prev };

      // Grant weekly +1 freeze token if entering a new week (capped at 2)
      if (prev.profile.lastFreezeGrantWeek !== weekKey) {
        next.profile = {
          ...prev.profile,
          freezeTokens: Math.min(2, prev.profile.freezeTokens + 1),
          lastFreezeGrantWeek: weekKey,
        };
        changed = true;
      }

      if (!prev.dailyQuestsByDay[todayKey]) {
        const weekday = getWeekdayOneBased(todayKey);
        const planRest =
          prev.trainingPlan.find((d) => d.weekday === weekday)?.dayType === 'rest' ||
          prev.profile.restModeToday === todayKey;

        const quests = generateDailyQuestsForDay({
          dayKey: todayKey,
          isRestDay: planRest,
          availableMinutesPerDay: prev.profile.availableMinutesPerDay,
          waterGoalMl: prev.profile.waterGoalMl,
        });
        next.dailyQuestsByDay = { ...prev.dailyQuestsByDay, [todayKey]: quests };
        changed = true;
      }

      if (!prev.weeklyQuestsByWeek[weekKey]) {
        const weeklyTemplates = (questsJson.quests as QuestTemplate[]).filter(
          (q) => q.type === 'weekly'
        );
        const wQuests: QuestInstance[] = weeklyTemplates.map((tpl, idx) => ({
          id: 500 + idx,
          templateId: tpl.id,
          template: tpl,
          periodKey: weekKey,
          progress: 0,
          target:
            tpl.condition.target === 'weekly_goal'
              ? prev.profile.weeklyGoalDays
              : Number(tpl.condition.target),
          status: 'available',
          completedAt: null,
        }));
        next.weeklyQuestsByWeek = { ...prev.weeklyQuestsByWeek, [weekKey]: wQuests };
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [isLoaded, todayKey, weekKey]);

  // Helper to compute metrics from state
  const computeMetricsForState = (state: AwakenedDatabaseState): {
    metrics: DailyMetricsSnapshot;
    streak: StreakEvaluationResult;
    dailyRepeatableXp: number;
  } => {
    const activeActivities = state.activities.filter((a) => !a.deletedAt);
    const todayActs = activeActivities.filter(
      (a) => getLocalDayKey(a.occurredAt, a.tzOffsetMin) === todayKey
    );

    const waterMl = todayActs
      .filter((a) => a.type === 'water')
      .reduce((sum, a) => sum + (a.value || 0), 0);
    const waterCount = todayActs.filter((a) => a.type === 'water').length;
    const mealCount = todayActs.filter((a) => a.type === 'meal').length;
    const workoutCount = todayActs.filter((a) => a.type === 'workout').length;
    const workoutMin = todayActs
      .filter((a) => a.type === 'workout')
      .reduce((sum, a) => sum + (a.value || 0), 0);
    const pomodoroCount = todayActs.filter(
      (a) => a.type === 'focus' && a.focusDetail?.completed !== false
    ).length;
    const journalCount = state.journals.filter(
      (j) => j.entryDate === todayKey && j.body.trim().length >= 20
    ).length;
    const moodCount = state.moods.filter((m) => m.dayKey === todayKey).length;
    const restOrStretch = todayActs.filter(
      (a) =>
        a.type === 'rest' ||
        (a.type === 'workout' && a.workoutDetail?.workoutType === 'stretch')
    ).length;

    // Active days sets for StreakEngine
    const activeDaysSet = new Set<string>();
    const restDaysSet = new Set<string>();

    for (const act of activeActivities) {
      if (act.isBackfilled) continue;
      const dk = getLocalDayKey(act.occurredAt, act.tzOffsetMin);
      if (act.type === 'rest') {
        restDaysSet.add(dk);
      } else {
        activeDaysSet.add(dk);
      }
    }
    for (const j of state.journals) {
      activeDaysSet.add(j.entryDate);
    }
    for (const m of state.moods) {
      activeDaysSet.add(m.dayKey);
    }

    const streak = evaluateStreakState({
      todayKey,
      activeDaysSet,
      restCheckinDaysSet: restDaysSet,
      existingLogs: state.streakLogs,
      trainingPlan: state.trainingPlan,
      initialFreezeTokens: state.profile.freezeTokens,
      previousLongestStreak: state.profile.longestStreak,
      weeklyGoalDays: state.profile.weeklyGoalDays,
      weekStartDay: state.profile.weekStartDay,
    });

    const weekDays = new Set(getDaysInWeekRange(todayKey, state.profile.weekStartDay));
    const weeklyFocusMin = activeActivities
      .filter(
        (a) =>
          a.type === 'focus' &&
          a.focusDetail?.completed !== false &&
          weekDays.has(getLocalDayKey(a.occurredAt, a.tzOffsetMin))
      )
      .reduce((sum, a) => sum + (a.value || 0), 0);

    const weeklyJournalDays = new Set(
      state.journals.filter((j) => weekDays.has(j.entryDate)).map((j) => j.entryDate)
    ).size;

    const totalActiveDays = Object.values(streak.updatedLogs).filter(
      (s) => s === 'active' || s === 'rest'
    ).length;

    const dailyRepeatableXp = state.xpEvents
      .filter(
        (e) =>
          e.sourceType === 'activity' &&
          getLocalDayKey(e.occurredAt) === todayKey &&
          e.amount > 0
      )
      .reduce((sum, e) => sum + e.amount, 0);

    const metrics: DailyMetricsSnapshot = {
      water_ml: waterMl,
      water_goal: state.profile.waterGoalMl,
      water_count: waterCount,
      meal_count: mealCount,
      workout_count: workoutCount,
      workout_min: workoutMin,
      pomodoro_count: pomodoroCount,
      journal_count: journalCount,
      mood_count: moodCount,
      rest_or_stretch: restOrStretch,
      weekly_active_days: streak.weeklyActiveDays,
      weekly_goal: state.profile.weeklyGoalDays,
      weekly_focus_min: weeklyFocusMin,
      weekly_journal_days: weeklyJournalDays,
      total_activities:
        activeActivities.length + state.journals.length + state.moods.length,
      longest_streak: streak.longestStreak,
      total_active_days: totalActiveDays,
    };

    return { metrics, streak, dailyRepeatableXp };
  };

  /**
   * Core atomic transaction runner (Section 11.3):
   * Runs state mutation -> evaluates quests -> checks achievements -> checks Level/Rank up -> queues celebrations!
   */
  const executeTransaction = (
    mutator: (
      draft: AwakenedDatabaseState,
      currentMetrics: DailyMetricsSnapshot,
      dailyRepXp: number
    ) => {
      nextState: AwakenedDatabaseState;
      directXpGained: number;
      directReasonLabel?: string;
    }
  ) => {
    setDb((prev) => {
      const prevLevelState = computeLevelState(prev.profile.totalXp);
      const prevUnlockedCategories = new Set(
        prev.achievementsUnlocked
          .map((u) =>
            (achievementsJson.achievements as AchievementDef[]).find(
              (a) => a.id === u.achievementId
            )?.category
          )
          .filter(Boolean)
      ).size;
      const { metrics: beforeMetrics, streak: beforeStreak, dailyRepeatableXp } =
        computeMetricsForState(prev);
      const prevRankInfo = getRankForLevel(prevLevelState.level, {
        totalActiveDays: beforeMetrics.total_active_days,
        unlockedBadgeCategoriesCount: prevUnlockedCategories,
      });

      const { nextState, directXpGained } = mutator(
        prev,
        beforeMetrics,
        dailyRepeatableXp
      );

      let working = { ...nextState };
      const newCelebrations: CelebrationEvent[] = [];
      const now = Date.now();

      // Recompute metrics after activity mutation
      const afterSnap = computeMetricsForState(working);
      working.streakLogs = afterSnap.streak.updatedLogs;
      working.profile = {
        ...working.profile,
        longestStreak: afterSnap.streak.longestStreak,
        freezeTokens: afterSnap.streak.freezeTokensRemaining,
      };

      // Evaluate Daily Quests
      const currentDaily = working.dailyQuestsByDay[todayKey] ?? [];
      const prevAllDailyDone =
        currentDaily.length > 0 && currentDaily.every((q) => q.status === 'completed');

      let questXpBonusTotal = 0;
      const updatedDaily = currentDaily.map((q) => {
        const res = evaluateQuestProgress(q, afterSnap.metrics, now);
        if (res.newlyCompleted) {
          questXpBonusTotal += res.updated.template.reward_xp;
          working.xpEvents = [
            ...working.xpEvents,
            {
              id: now + Math.floor(Math.random() * 10000),
              amount: res.updated.template.reward_xp,
              sourceType: 'quest',
              sourceId: res.updated.templateId,
              reasonKey: `quest_${res.updated.templateId}`,
              configVersion: xpConfigJson.version,
              occurredAt: now,
            },
          ];
          newCelebrations.push({
            id: `quest_${res.updated.templateId}_${now}`,
            tier: 1,
            title:
              working.profile.language === 'th'
                ? `ภารกิจสำเร็จ! +${res.updated.template.reward_xp} XP`
                : `Quest Complete! +${res.updated.template.reward_xp} XP`,
            subtitle:
              working.profile.language === 'th'
                ? res.updated.template.title_th
                : res.updated.template.title_en,
            xpGained: res.updated.template.reward_xp,
          });
        }
        return res.updated;
      });

      const nowAllDailyDone =
        updatedDaily.length > 0 && updatedDaily.every((q) => q.status === 'completed');
      if (!prevAllDailyDone && nowAllDailyDone) {
        const allDailyBonus = xpConfigJson.quest_bonus.all_daily_completed ?? 30;
        questXpBonusTotal += allDailyBonus;
        working.xpEvents = [
          ...working.xpEvents,
          {
            id: now + 999,
            amount: allDailyBonus,
            sourceType: 'bonus',
            reasonKey: 'all_daily_quests_completed',
            configVersion: xpConfigJson.version,
            occurredAt: now,
          },
        ];
        newCelebrations.push({
          id: `all_daily_${now}`,
          tier: 1,
          title:
            working.profile.language === 'th'
              ? `ครบทุก Daily Quest วันนี้! +${allDailyBonus} XP โบนัส`
              : `All Daily Quests Complete! +${allDailyBonus} Bonus XP`,
          subtitle:
            working.profile.language === 'th'
              ? 'ความสม่ำเสมอของคุณกำลังสร้างการเปลี่ยนแปลง'
              : 'Your consistency is building real momentum.',
          xpGained: allDailyBonus,
        });
      }
      working.dailyQuestsByDay = {
        ...working.dailyQuestsByDay,
        [todayKey]: updatedDaily,
      };

      // Evaluate Weekly Quests
      const currentWeekly = working.weeklyQuestsByWeek[weekKey] ?? [];
      const updatedWeekly = currentWeekly.map((q) => {
        const res = evaluateQuestProgress(q, afterSnap.metrics, now);
        if (res.newlyCompleted) {
          questXpBonusTotal += res.updated.template.reward_xp;
          working.xpEvents = [
            ...working.xpEvents,
            {
              id: now + Math.floor(Math.random() * 10000),
              amount: res.updated.template.reward_xp,
              sourceType: 'quest',
              sourceId: res.updated.templateId,
              reasonKey: `weekly_${res.updated.templateId}`,
              configVersion: xpConfigJson.version,
              occurredAt: now,
            },
          ];
          newCelebrations.push({
            id: `weekly_${res.updated.templateId}_${now}`,
            tier: 1,
            title:
              working.profile.language === 'th'
                ? `ภารกิจรายสัปดาห์สำเร็จ! +${res.updated.template.reward_xp} XP`
                : `Weekly Quest Complete! +${res.updated.template.reward_xp} XP`,
            subtitle:
              working.profile.language === 'th'
                ? res.updated.template.title_th
                : res.updated.template.title_en,
            xpGained: res.updated.template.reward_xp,
          });
        }
        return res.updated;
      });
      working.weeklyQuestsByWeek = {
        ...working.weeklyQuestsByWeek,
        [weekKey]: updatedWeekly,
      };

      // Evaluate Milestone Quests
      const updatedMilestones = working.milestoneQuests.map((q) => {
        const res = evaluateQuestProgress(q, afterSnap.metrics, now);
        if (res.newlyCompleted) {
          questXpBonusTotal += res.updated.template.reward_xp;
          working.xpEvents = [
            ...working.xpEvents,
            {
              id: now + Math.floor(Math.random() * 10000),
              amount: res.updated.template.reward_xp,
              sourceType: 'milestone',
              sourceId: res.updated.templateId,
              reasonKey: `milestone_${res.updated.templateId}`,
              configVersion: xpConfigJson.version,
              occurredAt: now,
            },
          ];
          newCelebrations.push({
            id: `milestone_${res.updated.templateId}_${now}`,
            tier: 4,
            title:
              working.profile.language === 'th'
                ? `บรรลุ Milestone ใหญ่! +${res.updated.template.reward_xp} XP`
                : `Milestone Unlocked! +${res.updated.template.reward_xp} XP`,
            subtitle:
              working.profile.language === 'th'
                ? res.updated.template.title_th
                : res.updated.template.title_en,
            xpGained: res.updated.template.reward_xp,
          });
        }
        return res.updated;
      });
      working.milestoneQuests = updatedMilestones;

      // Apply total XP (Single Source of Truth = never negative)
      const newTotalXp = Math.max(
        0,
        working.profile.totalXp + directXpGained + questXpBonusTotal
      );
      working.profile = {
        ...working.profile,
        totalXp: newTotalXp,
      };

      const newLevelState = computeLevelState(newTotalXp);

      // Evaluate Achievements / Badges
      const allAch = achievementsJson.achievements as AchievementDef[];
      const unlockedSet = new Set(working.achievementsUnlocked.map((u) => u.achievementId));
      const activeActs = working.activities.filter((a) => !a.deletedAt);
      const badgeMetrics: Record<string, number> = {
        total_activities: afterSnap.metrics.total_activities,
        total_water_logs: activeActs.filter((a) => a.type === 'water').length,
        total_meal_logs: activeActs.filter((a) => a.type === 'meal').length,
        total_workout_logs: activeActs.filter((a) => a.type === 'workout').length,
        total_pomodoro_logs: activeActs.filter(
          (a) => a.type === 'focus' && a.focusDetail?.completed !== false
        ).length,
        total_mind_logs: working.journals.length + working.moods.length,
        total_rest_logs: activeActs.filter((a) => a.type === 'rest').length,
        level: newLevelState.level,
      };

      for (const ach of allAch) {
        if (!unlockedSet.has(ach.id) && (badgeMetrics[ach.metric] ?? 0) >= ach.target) {
          unlockedSet.add(ach.id);
          working.achievementsUnlocked = [
            ...working.achievementsUnlocked,
            { achievementId: ach.id, unlockedAt: now },
          ];
          newCelebrations.push({
            id: `badge_${ach.id}_${now}`,
            tier: 4,
            title:
              working.profile.language === 'th'
                ? `ปลดล็อกเหรียญตรา: ${ach.title_th}`
                : `Badge Unlocked: ${ach.title_en}`,
            subtitle:
              working.profile.language === 'th' ? ach.description_th : ach.description_en,
            badge: ach,
          });
        }
      }

      const newUnlockedCategories = new Set(
        working.achievementsUnlocked
          .map((u) => allAch.find((a) => a.id === u.achievementId)?.category)
          .filter(Boolean)
      ).size;

      const newRankInfo = getRankForLevel(newLevelState.level, {
        totalActiveDays: afterSnap.metrics.total_active_days,
        unlockedBadgeCategoriesCount: newUnlockedCategories,
      });

      // Check Level Up (Tier 2 Celebration)
      if (newLevelState.level > prevLevelState.level) {
        newCelebrations.push({
          id: `levelup_${newLevelState.level}_${now}`,
          tier: 2,
          title:
            working.profile.language === 'th'
              ? `LEVEL UP! เลเวล ${newLevelState.level}`
              : `LEVEL UP! Level ${newLevelState.level}`,
          subtitle:
            working.profile.language === 'th'
              ? `คุณก้าวสู่ Lv ${newLevelState.level} แล้ว ทุกก้าวเล็ก ๆ มีความหมาย!`
              : `You reached Level ${newLevelState.level}. Every small step counts!`,
          newLevel: newLevelState.level,
        });
      }

      // Check Rank Promotion (Tier 3 Celebration)
      if (newRankInfo.currentRank.id !== prevRankInfo.currentRank.id) {
        newCelebrations.push({
          id: `rankup_${newRankInfo.currentRank.id}_${now}`,
          tier: 3,
          title:
            working.profile.language === 'th'
              ? `เลื่อนขั้นสู่ Rank ${newRankInfo.currentRank.id} – ${newRankInfo.currentRank.name}!`
              : `PROMOTED TO RANK ${newRankInfo.currentRank.id} – ${newRankInfo.currentRank.name}!`,
          subtitle:
            working.profile.language === 'th'
              ? `ฉายาใหม่: "${newRankInfo.currentRank.title_th}"`
              : `New Title: "${newRankInfo.currentRank.title_en}"`,
          newRank: newRankInfo.currentRank,
        });
      }

      // Play sound feedback
      if (newCelebrations.some((c) => c.tier === 3)) {
        playSystemFeedback('rankUp', working.profile.soundEnabled);
      } else if (newCelebrations.some((c) => c.tier === 2)) {
        playSystemFeedback('levelUp', working.profile.soundEnabled);
      } else if (newCelebrations.length > 0) {
        playSystemFeedback('quest', working.profile.soundEnabled);
      } else if (directXpGained > 0) {
        playSystemFeedback('xp', working.profile.soundEnabled);
      }

      if (newCelebrations.length > 0 && !working.profile.reduceEffects) {
        setCelebrationQueue((q) => [...q, ...newCelebrations]);
      }

      return working;
    });
  };

  // Helper to count how many times an activityKey earned XP today
  const getTodayKeyCountAndLastTime = (
    state: AwakenedDatabaseState,
    key: XpActivityKey,
    actType: ActivityRecord['type']
  ) => {
    const countTodayForKey = state.xpEvents.filter(
      (e) =>
        e.sourceType === 'activity' &&
        e.reasonKey === key &&
        getLocalDayKey(e.occurredAt) === todayKey &&
        e.amount > 0
    ).length;

    const customCountToday = state.xpEvents.filter(
      (e) =>
        e.sourceType === 'activity' &&
        e.reasonKey.startsWith('custom_') &&
        getLocalDayKey(e.occurredAt) === todayKey &&
        e.amount > 0
    ).length;

    const sameTypeActs = state.activities.filter(
      (a) => !a.deletedAt && a.type === actType
    );
    const lastSameTypeOccurredAtMs =
      sameTypeActs.length > 0
        ? Math.max(...sameTypeActs.map((a) => a.occurredAt))
        : null;

    return { countTodayForKey, customCountToday, lastSameTypeOccurredAtMs };
  };

  const logWater = (amountMl: number) => {
    const cleanMl = Math.max(10, Math.round(amountMl));
    executeTransaction((draft, currentMetrics, dailyRepXp) => {
      const now = Date.now();
      const { countTodayForKey, lastSameTypeOccurredAtMs } = getTodayKeyCountAndLastTime(
        draft,
        'water_log',
        'water'
      );

      const xpRes = calculateActivityXp({
        activityKey: 'water_log',
        countTodayForKey,
        dailyRepeatableXpSoFar: dailyRepXp,
        lastSameTypeOccurredAtMs,
        occurredAtMs: now,
        nowMs: now,
      });

      // Check if this water log crosses the daily water goal for the first time today
      const prevWater = currentMetrics.water_ml;
      const newWater = prevWater + cleanMl;
      const waterGoalCountToday = draft.xpEvents.filter(
        (e) =>
          e.reasonKey === 'water_goal' &&
          getLocalDayKey(e.occurredAt) === todayKey &&
          e.amount > 0
      ).length;

      let goalBonusXp = 0;
      const newEvents: XpEventRecord[] = [];
      const actId = now;

      if (xpRes.xpAwarded > 0) {
        newEvents.push({
          id: actId + 1,
          amount: xpRes.xpAwarded,
          sourceType: 'activity',
          sourceId: actId,
          reasonKey: 'water_log',
          configVersion: xpConfigJson.version,
          occurredAt: now,
        });
      }

      if (
        prevWater < draft.profile.waterGoalMl &&
        newWater >= draft.profile.waterGoalMl &&
        waterGoalCountToday === 0
      ) {
        const goalRes = calculateActivityXp({
          activityKey: 'water_goal',
          countTodayForKey: 0,
          dailyRepeatableXpSoFar: dailyRepXp + xpRes.xpAwarded,
          occurredAtMs: now,
          nowMs: now,
        });
        goalBonusXp = goalRes.xpAwarded;
        if (goalBonusXp > 0) {
          newEvents.push({
            id: actId + 2,
            amount: goalBonusXp,
            sourceType: 'activity',
            sourceId: actId,
            reasonKey: 'water_goal',
            configVersion: xpConfigJson.version,
            occurredAt: now,
          });
        }
      }

      const newAct: ActivityRecord = {
        id: actId,
        type: 'water',
        title:
          draft.profile.language === 'th'
            ? `ดื่มน้ำ ${cleanMl} มล.`
            : `Drank ${cleanMl} ml water`,
        value: cleanMl,
        unit: 'ml',
        occurredAt: now,
        tzOffsetMin: getCurrentTzOffsetMin(),
        isBackfilled: false,
        createdAt: now,
        xpAwarded: xpRes.xpAwarded + goalBonusXp,
      };

      return {
        nextState: {
          ...draft,
          activities: [newAct, ...draft.activities],
          xpEvents: [...draft.xpEvents, ...newEvents],
        },
        directXpGained: xpRes.xpAwarded + goalBonusXp,
      };
    });
  };

  const logMeal = (title: string, detail: MealDetail, note?: string) => {
    executeTransaction((draft, _metrics, dailyRepXp) => {
      const now = Date.now();
      const { countTodayForKey, lastSameTypeOccurredAtMs } = getTodayKeyCountAndLastTime(
        draft,
        'meal_log',
        'meal'
      );

      const xpRes = calculateActivityXp({
        activityKey: 'meal_log',
        countTodayForKey,
        dailyRepeatableXpSoFar: dailyRepXp,
        lastSameTypeOccurredAtMs,
        occurredAtMs: now,
        nowMs: now,
      });

      const actId = now;
      const newAct: ActivityRecord = {
        id: actId,
        type: 'meal',
        title: title.trim() || 'Meal',
        value: detail.caloriesEst ?? 0,
        unit: 'kcal',
        note,
        occurredAt: now,
        tzOffsetMin: getCurrentTzOffsetMin(),
        isBackfilled: false,
        createdAt: now,
        xpAwarded: xpRes.xpAwarded,
        mealDetail: detail,
      };

      const newEvents: XpEventRecord[] =
        xpRes.xpAwarded > 0
          ? [
              {
                id: actId + 1,
                amount: xpRes.xpAwarded,
                sourceType: 'activity',
                sourceId: actId,
                reasonKey: 'meal_log',
                configVersion: xpConfigJson.version,
                occurredAt: now,
              },
            ]
          : [];

      return {
        nextState: {
          ...draft,
          activities: [newAct, ...draft.activities],
          xpEvents: [...draft.xpEvents, ...newEvents],
        },
        directXpGained: xpRes.xpAwarded,
      };
    });
  };

  const addCustomFoodTemplate = (food: Omit<ThaiFoodItem, 'id'>) => {
    setDb((prev) => ({
      ...prev,
      customFoods: [
        {
          ...food,
          id: `custom_food_${Date.now()}`,
        },
        ...prev.customFoods,
      ],
    }));
  };

  const logWorkout = (title: string, detail: WorkoutDetail, note?: string) => {
    executeTransaction((draft, _metrics, dailyRepXp) => {
      const now = Date.now();
      const durationMin = Math.max(1, Math.round(detail.durationSec / 60));
      const { countTodayForKey, lastSameTypeOccurredAtMs } = getTodayKeyCountAndLastTime(
        draft,
        'workout',
        'workout'
      );

      const xpRes = calculateActivityXp({
        activityKey: 'workout',
        countTodayForKey,
        dailyRepeatableXpSoFar: dailyRepXp,
        lastSameTypeOccurredAtMs,
        occurredAtMs: now,
        nowMs: now,
        workoutDurationMinutes: durationMin,
        workoutPlanCompleted: detail.planCompleted,
      });

      const actId = now;
      const newAct: ActivityRecord = {
        id: actId,
        type: 'workout',
        title: title.trim() || 'Workout',
        value: durationMin,
        unit: 'min',
        note,
        occurredAt: now,
        tzOffsetMin: getCurrentTzOffsetMin(),
        isBackfilled: false,
        createdAt: now,
        xpAwarded: xpRes.xpAwarded,
        workoutDetail: detail,
      };

      const newEvents: XpEventRecord[] =
        xpRes.xpAwarded > 0
          ? [
              {
                id: actId + 1,
                amount: xpRes.xpAwarded,
                sourceType: 'activity',
                sourceId: actId,
                reasonKey: 'workout',
                configVersion: xpConfigJson.version,
                occurredAt: now,
              },
            ]
          : [];

      return {
        nextState: {
          ...draft,
          activities: [newAct, ...draft.activities],
          xpEvents: [...draft.xpEvents, ...newEvents],
        },
        directXpGained: xpRes.xpAwarded,
      };
    });
  };

  const logPomodoro = (detail: FocusDetail, note?: string) => {
    executeTransaction((draft, _metrics, dailyRepXp) => {
      const now = Date.now();
      const focusMin = Math.max(1, Math.round(detail.focusSec / 60));
      const { countTodayForKey, lastSameTypeOccurredAtMs } = getTodayKeyCountAndLastTime(
        draft,
        'pomodoro',
        'focus'
      );

      const xpRes = calculateActivityXp({
        activityKey: 'pomodoro',
        countTodayForKey,
        dailyRepeatableXpSoFar: dailyRepXp,
        lastSameTypeOccurredAtMs,
        occurredAtMs: now,
        nowMs: now,
        pomodoroCompleted: detail.completed,
      });

      const actId = now;
      const newAct: ActivityRecord = {
        id: actId,
        type: 'focus',
        title: detail.taskName.trim() || 'Pomodoro Focus',
        value: focusMin,
        unit: 'min',
        note,
        occurredAt: now,
        tzOffsetMin: getCurrentTzOffsetMin(),
        isBackfilled: false,
        createdAt: now,
        xpAwarded: xpRes.xpAwarded,
        focusDetail: detail,
      };

      const newEvents: XpEventRecord[] =
        xpRes.xpAwarded > 0
          ? [
              {
                id: actId + 1,
                amount: xpRes.xpAwarded,
                sourceType: 'activity',
                sourceId: actId,
                reasonKey: 'pomodoro',
                configVersion: xpConfigJson.version,
                occurredAt: now,
              },
            ]
          : [];

      return {
        nextState: {
          ...draft,
          activities: [newAct, ...draft.activities],
          xpEvents: [...draft.xpEvents, ...newEvents],
        },
        directXpGained: xpRes.xpAwarded,
      };
    });
  };

  const logCustomActivity = (
    title: string,
    value: number,
    unit: string,
    intensity: CustomIntensity,
    note?: string,
    occurredAtMs?: number
  ) => {
    executeTransaction((draft, _metrics, dailyRepXp) => {
      const now = Date.now();
      const occ = occurredAtMs ?? now;
      const key = getCustomActivityKey(intensity);
      const { countTodayForKey, customCountToday, lastSameTypeOccurredAtMs } =
        getTodayKeyCountAndLastTime(draft, key, 'custom');

      const xpRes = calculateActivityXp({
        activityKey: key,
        countTodayForKey,
        customCountToday,
        dailyRepeatableXpSoFar: dailyRepXp,
        lastSameTypeOccurredAtMs,
        occurredAtMs: occ,
        nowMs: now,
      });

      const actId = now;
      const newAct: ActivityRecord = {
        id: actId,
        type: 'custom',
        title: title.trim() || 'Custom Activity',
        value,
        unit: unit || 'min',
        note,
        customIntensity: intensity,
        occurredAt: occ,
        tzOffsetMin: getCurrentTzOffsetMin(),
        isBackfilled: xpRes.isBackfilled,
        createdAt: now,
        xpAwarded: xpRes.xpAwarded,
      };

      const newEvents: XpEventRecord[] =
        xpRes.xpAwarded > 0
          ? [
              {
                id: actId + 1,
                amount: xpRes.xpAwarded,
                sourceType: 'activity',
                sourceId: actId,
                reasonKey: key,
                configVersion: xpConfigJson.version,
                occurredAt: now,
              },
            ]
          : [];

      return {
        nextState: {
          ...draft,
          activities: [newAct, ...draft.activities],
          xpEvents: [...draft.xpEvents, ...newEvents],
        },
        directXpGained: xpRes.xpAwarded,
      };
    });
  };

  const logRestDayCheckin = (note?: string) => {
    executeTransaction((draft, _metrics, dailyRepXp) => {
      const now = Date.now();
      const { countTodayForKey } = getTodayKeyCountAndLastTime(
        draft,
        'rest_checkin',
        'rest'
      );

      const xpRes = calculateActivityXp({
        activityKey: 'rest_checkin',
        countTodayForKey,
        dailyRepeatableXpSoFar: dailyRepXp,
        occurredAtMs: now,
        nowMs: now,
      });

      const actId = now;
      const newAct: ActivityRecord = {
        id: actId,
        type: 'rest',
        title:
          draft.profile.language === 'th'
            ? 'เช็กอินวันพักผ่อนตามแผน (Rest Day)'
            : 'Planned Rest Day Check-in',
        value: 1,
        unit: 'day',
        note,
        occurredAt: now,
        tzOffsetMin: getCurrentTzOffsetMin(),
        isBackfilled: false,
        createdAt: now,
        xpAwarded: xpRes.xpAwarded,
      };

      const newEvents: XpEventRecord[] =
        xpRes.xpAwarded > 0
          ? [
              {
                id: actId + 1,
                amount: xpRes.xpAwarded,
                sourceType: 'activity',
                sourceId: actId,
                reasonKey: 'rest_checkin',
                configVersion: xpConfigJson.version,
                occurredAt: now,
              },
            ]
          : [];

      return {
        nextState: {
          ...draft,
          activities: [newAct, ...draft.activities],
          xpEvents: [...draft.xpEvents, ...newEvents],
        },
        directXpGained: xpRes.xpAwarded,
      };
    });
  };

  const deleteActivity = (
    activityId: number
  ): { xpReverted: boolean; xpAmount: number } => {
    let result = { xpReverted: false, xpAmount: 0 };
    const now = Date.now();

    setDb((prev) => {
      const target = prev.activities.find((a) => a.id === activityId && !a.deletedAt);
      if (!target) return prev;

      const revert = canRevertXpOnDelete(target.createdAt, now);
      const xpToRevert = revert ? target.xpAwarded : 0;
      result = { xpReverted: revert && xpToRevert > 0, xpAmount: xpToRevert };

      const updatedActivities = prev.activities.map((a) =>
        a.id === activityId ? { ...a, deletedAt: now } : a
      );

      const newEvents =
        revert && xpToRevert > 0
          ? [
              ...prev.xpEvents,
              {
                id: now,
                amount: -xpToRevert,
                sourceType: 'revert' as const,
                sourceId: activityId,
                reasonKey: 'delete_within_10m_revert',
                configVersion: xpConfigJson.version,
                occurredAt: now,
              },
            ]
          : prev.xpEvents;

      return {
        ...prev,
        profile: {
          ...prev.profile,
          totalXp: Math.max(0, prev.profile.totalXp - xpToRevert),
        },
        activities: updatedActivities,
        xpEvents: newEvents,
      };
    });

    return result;
  };

  const saveJournalEntry = (entry: {
    id?: number;
    title: string;
    body: string;
    category: string;
  }) => {
    executeTransaction((draft, _metrics, dailyRepXp) => {
      const now = Date.now();
      if (entry.id) {
        // Edit existing
        const updated = draft.journals.map((j) =>
          j.id === entry.id
            ? { ...j, title: entry.title, body: entry.body, category: entry.category, updatedAt: now }
            : j
        );
        return {
          nextState: { ...draft, journals: updated },
          directXpGained: 0,
        };
      }

      const countTodayForKey = draft.xpEvents.filter(
        (e) =>
          e.reasonKey === 'journal' &&
          getLocalDayKey(e.occurredAt) === todayKey &&
          e.amount > 0
      ).length;

      const xpRes = calculateActivityXp({
        activityKey: 'journal',
        countTodayForKey,
        dailyRepeatableXpSoFar: dailyRepXp,
        occurredAtMs: now,
        nowMs: now,
        journalCharCount: entry.body.trim().length,
      });

      const newJournal: JournalEntry = {
        id: now,
        entryDate: todayKey,
        title: entry.title.trim() || (draft.profile.language === 'th' ? 'บันทึกประจำวัน' : 'Daily Note'),
        body: entry.body,
        category: entry.category || 'general',
        createdAt: now,
        updatedAt: now,
        xpAwarded: xpRes.xpAwarded,
      };

      const newEvents: XpEventRecord[] =
        xpRes.xpAwarded > 0
          ? [
              {
                id: now + 1,
                amount: xpRes.xpAwarded,
                sourceType: 'activity',
                sourceId: newJournal.id,
                reasonKey: 'journal',
                configVersion: xpConfigJson.version,
                occurredAt: now,
              },
            ]
          : [];

      return {
        nextState: {
          ...draft,
          journals: [newJournal, ...draft.journals],
          xpEvents: [...draft.xpEvents, ...newEvents],
        },
        directXpGained: xpRes.xpAwarded,
      };
    });
  };

  const deleteJournalEntry = (id: number) => {
    // Deleting journal entry keeps earned XP per Principle P1 (No Punishment)
    setDb((prev) => ({
      ...prev,
      journals: prev.journals.filter((j) => j.id !== id),
    }));
  };

  const logMoodEntry = (moodLevel: number, note: string, tags: string[]) => {
    executeTransaction((draft, _metrics, dailyRepXp) => {
      const now = Date.now();
      const countTodayForKey = draft.xpEvents.filter(
        (e) =>
          e.reasonKey === 'mood' &&
          getLocalDayKey(e.occurredAt) === todayKey &&
          e.amount > 0
      ).length;

      const xpRes = calculateActivityXp({
        activityKey: 'mood',
        countTodayForKey,
        dailyRepeatableXpSoFar: dailyRepXp,
        occurredAtMs: now,
        nowMs: now,
      });

      const newMood: MoodEntry = {
        id: now,
        moodLevel: Math.min(7, Math.max(1, moodLevel)),
        note: note.trim(),
        tags,
        occurredAt: now,
        dayKey: todayKey,
        xpAwarded: xpRes.xpAwarded,
      };

      const newEvents: XpEventRecord[] =
        xpRes.xpAwarded > 0
          ? [
              {
                id: now + 1,
                amount: xpRes.xpAwarded,
                sourceType: 'activity',
                sourceId: newMood.id,
                reasonKey: 'mood',
                configVersion: xpConfigJson.version,
                occurredAt: now,
              },
            ]
          : [];

      return {
        nextState: {
          ...draft,
          moods: [newMood, ...draft.moods],
          xpEvents: [...draft.xpEvents, ...newEvents],
        },
        directXpGained: xpRes.xpAwarded,
      };
    });
  };

  const swapDailyQuest = (questInstanceId: number): boolean => {
    let swapped = false;
    setDb((prev) => {
      if (prev.profile.dailyQuestSwapUsedDay === todayKey) return prev;
      const list = prev.dailyQuestsByDay[todayKey] ?? [];
      const targetQuest = list.find((q) => q.id === questInstanceId);
      if (!targetQuest || targetQuest.status === 'completed') return prev;

      const currentIds = new Set(list.map((q) => q.templateId));
      const allDaily = (questsJson.quests as QuestTemplate[]).filter(
        (q) => q.type === 'daily' && !currentIds.has(q.id)
      );
      if (allDaily.length === 0) return prev;

      const replacementTpl = allDaily[0];
      const targetVal =
        replacementTpl.condition.target === 'user_goal'
          ? prev.profile.waterGoalMl
          : Number(replacementTpl.condition.target);

      const newList = list.map((q) =>
        q.id === questInstanceId
          ? {
              ...q,
              templateId: replacementTpl.id,
              template: replacementTpl,
              progress: 0,
              target: targetVal,
              status: 'available' as const,
            }
          : q
      );

      swapped = true;
      return {
        ...prev,
        profile: {
          ...prev.profile,
          dailyQuestSwapUsedDay: todayKey,
        },
        dailyQuestsByDay: {
          ...prev.dailyQuestsByDay,
          [todayKey]: newList,
        },
      };
    });
    return swapped;
  };

  const addPersonalQuest = (
    title: string,
    rewardXp: 10 | 25 | 50,
    category: QuestTemplate['category'] = 'mind'
  ) => {
    const clean = title.trim();
    if (!clean) return;
    const tpl: QuestTemplate = {
      id: `personal_${Date.now()}`,
      type: 'personal',
      category,
      title_th: clean,
      title_en: clean,
      condition: { metric: 'manual', op: '>=', target: 1 },
      reward_xp: rewardXp,
      isCustom: true,
      isActive: true,
    };
    setDb((prev) => ({
      ...prev,
      personalQuestTemplates: [tpl, ...prev.personalQuestTemplates],
    }));
  };

  const completePersonalQuest = (templateId: string) => {
    executeTransaction((draft) => {
      const doneToday = draft.personalQuestDoneByDay[todayKey] ?? [];
      if (doneToday.includes(templateId)) {
        return { nextState: draft, directXpGained: 0 };
      }

      const tpl = draft.personalQuestTemplates.find((t) => t.id === templateId);
      if (!tpl) return { nextState: draft, directXpGained: 0 };

      const personalXpToday = draft.xpEvents
        .filter(
          (e) =>
            e.sourceType === 'quest' &&
            e.reasonKey.startsWith('personal_') &&
            getLocalDayKey(e.occurredAt) === todayKey
        )
        .reduce((s, e) => s + e.amount, 0);

      const grantedXp = clampPersonalQuestXp(
        (tpl.reward_xp as 10 | 25 | 50) || 10,
        personalXpToday
      );
      const now = Date.now();

      return {
        nextState: {
          ...draft,
          personalQuestDoneByDay: {
            ...draft.personalQuestDoneByDay,
            [todayKey]: [...doneToday, templateId],
          },
          xpEvents:
            grantedXp > 0
              ? [
                  ...draft.xpEvents,
                  {
                    id: now,
                    amount: grantedXp,
                    sourceType: 'quest',
                    sourceId: templateId,
                    reasonKey: `personal_${templateId}`,
                    configVersion: xpConfigJson.version,
                    occurredAt: now,
                  },
                ]
              : draft.xpEvents,
        },
        directXpGained: grantedXp,
      };
    });
  };

  const deletePersonalQuest = (templateId: string) => {
    setDb((prev) => ({
      ...prev,
      personalQuestTemplates: prev.personalQuestTemplates.filter(
        (t) => t.id !== templateId
      ),
    }));
  };

  const toggleRestModeToday = () => {
    setDb((prev) => {
      const turningOn = prev.profile.restModeToday !== todayKey;
      const newRestMode = turningOn ? todayKey : null;
      const regenerated = generateDailyQuestsForDay({
        dayKey: todayKey,
        isRestDay: turningOn,
        availableMinutesPerDay: prev.profile.availableMinutesPerDay,
        waterGoalMl: prev.profile.waterGoalMl,
      });

      return {
        ...prev,
        profile: {
          ...prev.profile,
          restModeToday: newRestMode,
        },
        dailyQuestsByDay: {
          ...prev.dailyQuestsByDay,
          [todayKey]: regenerated,
        },
      };
    });
  };

  const updateTrainingPlanDay = (
    weekday: number,
    dayType: TrainingDayType,
    note?: string
  ) => {
    setDb((prev) => ({
      ...prev,
      trainingPlan: prev.trainingPlan.map((d) =>
        d.weekday === weekday ? { ...d, dayType, note: note ?? d.note } : d
      ),
    }));
  };

  const applyTrainingPreset = (preset: 'light' | 'balanced' | 'flexible') => {
    const presets: Record<'light' | 'balanced' | 'flexible', TrainingPlanDay[]> = {
      light: [
        { weekday: 1, dayType: 'stretch', note: 'Gentle Stretching 10m' },
        { weekday: 2, dayType: 'rest', note: 'Rest Day' },
        { weekday: 3, dayType: 'cardio', note: 'Brisk Walk 15m' },
        { weekday: 4, dayType: 'rest', note: 'Rest Day' },
        { weekday: 5, dayType: 'full', note: 'Light Bodyweight 15m' },
        { weekday: 6, dayType: 'rest', note: 'Rest Day' },
        { weekday: 7, dayType: 'rest', note: 'Sunday Rest' },
      ],
      balanced: DEFAULT_TRAINING_PLAN,
      flexible: [
        { weekday: 1, dayType: 'full', note: 'Full Body / Choice' },
        { weekday: 2, dayType: 'cardio', note: 'Cardio / Walk' },
        { weekday: 3, dayType: 'stretch', note: 'Mobility & Stretch' },
        { weekday: 4, dayType: 'rest', note: 'Mid-week Recovery' },
        { weekday: 5, dayType: 'upper', note: 'Strength Upper' },
        { weekday: 6, dayType: 'lower', note: 'Strength Lower' },
        { weekday: 7, dayType: 'rest', note: 'Rest & Reflect' },
      ],
    };
    setDb((prev) => ({
      ...prev,
      trainingPlan: presets[preset],
    }));
  };

  const setPomodoroTimerState = (timer: ActiveTimerState | null) => {
    setDb((prev) => ({ ...prev, activePomodoroTimer: timer }));
  };

  const setWorkoutTimerState = (timer: ActiveTimerState | null) => {
    setDb((prev) => ({ ...prev, activeWorkoutTimer: timer }));
  };

  const updateProfile = (patch: Partial<UserProfile>) => {
    setDb((prev) => ({
      ...prev,
      profile: { ...prev.profile, ...patch },
    }));
  };

  const exportBackupJson = (): string => {
    return JSON.stringify(
      {
        app: 'Awakened — Life RPG',
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        data: db,
      },
      null,
      2
    );
  };

  const importBackupJson = (jsonStr: string): { ok: boolean; message: string } => {
    try {
      const parsed = JSON.parse(jsonStr);
      const data = parsed.data ?? parsed;
      if (!data.profile || typeof data.profile.totalXp !== 'number') {
        return { ok: false, message: 'Invalid backup format' };
      }
      setDb({
        ...createInitialState(),
        ...data,
        profile: { ...DEFAULT_PROFILE, ...data.profile },
      });
      return { ok: true, message: 'Backup restored successfully!' };
    } catch (e) {
      return { ok: false, message: (e as Error).message || 'JSON parse error' };
    }
  };

  const deleteCategoryData = (category: 'meals' | 'journals' | 'moods') => {
    setDb((prev) => {
      if (category === 'meals') {
        return {
          ...prev,
          activities: prev.activities.filter((a) => a.type !== 'meal'),
        };
      }
      if (category === 'journals') {
        return { ...prev, journals: [] };
      }
      return { ...prev, moods: [] };
    });
  };

  const resetAllData = () => {
    const fresh = createInitialState();
    setDb(fresh);
    setCelebrationQueue([]);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  };

  const dismissCelebration = () => {
    setCelebrationQueue((q) => q.slice(1));
  };

  // Derived states
  const { metrics: todayMetrics, streak: streakState, dailyRepeatableXp: dailyRepeatableXpToday } =
    useMemo(() => computeMetricsForState(db), [db, todayKey]);

  const levelState = useMemo(
    () => computeLevelState(db.profile.totalXp),
    [db.profile.totalXp]
  );

  const unlockedCategoriesCount = useMemo(() => {
    const allAch = achievementsJson.achievements as AchievementDef[];
    return new Set(
      db.achievementsUnlocked
        .map((u) => allAch.find((a) => a.id === u.achievementId)?.category)
        .filter(Boolean)
    ).size;
  }, [db.achievementsUnlocked]);

  const { currentRank, nextRank, monarchEligibility } = useMemo(
    () =>
      getRankForLevel(levelState.level, {
        totalActiveDays: todayMetrics.total_active_days,
        unlockedBadgeCategoriesCount: unlockedCategoriesCount,
      }),
    [levelState.level, todayMetrics.total_active_days, unlockedCategoriesCount]
  );

  const todayQuests = db.dailyQuestsByDay[todayKey] ?? [];
  const thisWeekQuests = db.weeklyQuestsByWeek[weekKey] ?? [];

  const adaptiveRecommendations = useMemo(
    () =>
      evaluateAdaptivePlan({
        availableMinutesPerDay: db.profile.availableMinutesPerDay,
        isRestModeToday: db.profile.restModeToday === todayKey,
        consecutiveWeeksMissedGoal: 0,
        consecutiveWeeksExceededGoal: streakState.weeklyGoalMet ? 1 : 0,
        currentWeeklyGoalDays: db.profile.weeklyGoalDays,
        language: db.profile.language,
      }),
    [
      db.profile.availableMinutesPerDay,
      db.profile.restModeToday,
      db.profile.weeklyGoalDays,
      db.profile.language,
      todayKey,
      streakState.weeklyGoalMet,
    ]
  );

  const value: AwakenedContextValue = {
    db,
    isLoaded,
    todayKey,
    levelState,
    currentRank,
    nextRank,
    monarchEligibility,
    streakState,
    todayMetrics,
    todayQuests,
    thisWeekQuests,
    adaptiveRecommendations,
    dailyRepeatableXpToday,
    celebrationQueue,
    dismissCelebration,
    logWater,
    logMeal,
    addCustomFoodTemplate,
    logWorkout,
    logPomodoro,
    logCustomActivity,
    logRestDayCheckin,
    deleteActivity,
    saveJournalEntry,
    deleteJournalEntry,
    logMoodEntry,
    swapDailyQuest,
    addPersonalQuest,
    completePersonalQuest,
    deletePersonalQuest,
    toggleRestModeToday,
    updateTrainingPlanDay,
    applyTrainingPreset,
    setPomodoroTimerState,
    setWorkoutTimerState,
    updateProfile,
    exportBackupJson,
    importBackupJson,
    deleteCategoryData,
    resetAllData,
  };

  return <AwakenedContext.Provider value={value}>{children}</AwakenedContext.Provider>;
};

export function useAwakened(): AwakenedContextValue {
  const ctx = useContext(AwakenedContext);
  if (!ctx) {
    throw new Error('useAwakened must be used inside AwakenedProvider');
  }
  return ctx;
}
