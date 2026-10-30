import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, DeviceEventEmitter } from 'react-native';
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
  OnboardingProfile,
  PlayerStatKey,
  PlayerStats,
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
import {
  calculateInitialStats,
  createDefaultOnboardingProfile,
  finalizeOnboardingProfile,
} from '../core/engine/onboardingEngine';
import { computeLevelState } from '../core/engine/levelEngine';
import { getRankForLevel, MonarchEligibility } from '../core/engine/rankEngine';
import {
  calculateActivityXp,
  canRevertXpOnDelete,
  getCustomActivityKey,
  reconcileLedgerTotalXp,
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
  buildMergedAchievementCelebration,
  computeAchievementMetrics,
  evaluateAchievements,
  getAchievementCatalog,
} from '../core/engine/achievementEngine';
import {
  addDaysToDayKey,
  getCurrentTzOffsetMin,
  getDaysInWeekRange,
  getLocalDayKey,
  getWeekdayOneBased,
  getWeekStartDayKey,
} from '../core/utils/dateUtils';
import {
  evaluateWorkoutPenalty,
  INACTIVITY,
  settleInactivity,
  SettleInactivityResult,
  WorkoutPenaltyResult,
} from '../core/engine/penaltyEngine';
import { getDailyNutritionSummary, DailyNutritionSummary } from '../core/engine/nutritionSummary';
import {
  cancelAlarm,
  cancelReminder,
  consumePendingWidgetActions,
  scheduleAlarm,
  scheduleReminder,
  updateWidgetData,
} from '../services/nativeBridge';
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
  onboarding: OnboardingProfile;
  playerStats: PlayerStats;
  activities: ActivityRecord[];
  xpEvents: XpEventRecord[];
  dailyQuestsByDay: Record<string, QuestInstance[]>;
  manualDailyQuestDoneByDay: Record<string, string[]>; // dayKey -> templateIds[]
  weeklyQuestsByWeek: Record<string, QuestInstance[]>;
  milestoneQuests: QuestInstance[];
  personalQuestTemplates: QuestTemplate[];
  personalQuestDoneByDay: Record<string, string[]>; // dayKey -> templateIds[]
  trainingPlan: TrainingPlanDay[];
  journals: JournalEntry[];
  moods: MoodEntry[];
  achievementsUnlocked: AchievementUnlock[];
  metricCounters: Record<string, number>;
  visitedTabs: string[];
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
  avatarUri: null,
  notifications: {
    enabled: false,
    permissionAsked: false,
    morningReminderEnabled: true,
    morningReminderTime: '08:00',
    noonReminderEnabled: true,
    noonReminderTime: '12:00',
    eveningReminderEnabled: true,
    eveningReminderTime: '20:00',
  },
  alarm: {
    enabled: false,
    time: '07:00',
    days: [],
  },
  totalXp: 0,
  waterGoalMl: 2000,
  weeklyGoalDays: 4,
  weekStartDay: 1,
  longestStreak: 0,
  freezeTokens: 1,
  lastFreezeGrantWeek: getWeekStartDayKey(getLocalDayKey(), 1),
  availableMinutesPerDay: 30,
  restModeToday: null,
  lightModeToday: null,
  dailyQuestSwapUsedDay: null,
  dashboardCardsOrder: ['quests', 'streak', 'water', 'stats', 'adaptive'],
  hiddenDashboardCards: [],
  language: 'th',
  theme: 'light',
  soundEnabled: true,
  reduceEffects: false,
  muteAchievementAlerts: false,
  selectedTitleId: null,
  featuredBadgeIds: [],
  appLockPin: null,
  appLockPinLength: 4,
  appLockPinHash: null,
  appLockSalt: null,
  appLockRecoveryCode: null,
  appLockTimeoutSec: 30,
  appLockFailedAttempts: 0,
  appLockLockedUntilMs: null,
  hideQuestsOnWidgetWhenLocked: false,
  inactivitySettings: INACTIVITY,
  vacationUntilDayKey: null,
  penaltyShields: 1,
  lastShieldGrantMonth: getLocalDayKey().slice(0, 7),
  activeComebackQuest: null,
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
  const defaultOnboarding = createDefaultOnboardingProfile();
  const initialStats = calculateInitialStats(defaultOnboarding);

  const dailyQuests = generateDailyQuestsForDay({
    dayKey: todayKey,
    isRestDay: Boolean(isRestToday),
    availableMinutesPerDay: DEFAULT_PROFILE.availableMinutesPerDay,
    waterGoalMl: DEFAULT_PROFILE.waterGoalMl,
    onboarding: defaultOnboarding,
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
    onboarding: defaultOnboarding,
    playerStats: initialStats,
    activities: [],
    xpEvents: [],
    dailyQuestsByDay: { [todayKey]: dailyQuests },
    manualDailyQuestDoneByDay: {},
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
    metricCounters: { tabs_visited: 1 },
    visitedTabs: ['home'],
    streakLogs: {},
    customFoods: [],
    activePomodoroTimer: null,
    activeWorkoutTimer: null,
  };
}

export interface DeleteActivityPreview {
  activityId: number;
  title: string;
  directXp: number;
  revertedQuestXp: number;
  revertedBonusXp: number;
  totalXpLoss: number;
  oldTotalXp: number;
  newTotalXp: number;
  oldLevel: number;
  newLevel: number;
  revertedQuestTitles: string[];
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
  achievementMetrics: Record<string, number | string>;
  todayQuests: QuestInstance[];
  thisWeekQuests: QuestInstance[];
  dailyNutrition: DailyNutritionSummary;
  workoutPenalty: WorkoutPenaltyResult;
  inactivityStatus: SettleInactivityResult;
  adaptiveRecommendations: AdaptivePlanRecommendation[];
  dailyRepeatableXpToday: number;
  celebrationQueue: CelebrationEvent[];
  dismissCelebration: () => void;
  recordAppEvent: (metricKey: string, incrementBy?: number) => void;
  recordTabVisited: (tabId: string) => void;

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
  previewDeleteActivity: (activityId: number) => DeleteActivityPreview | null;
  deleteActivity: (activityId: number) => { xpReverted: boolean; xpAmount: number };

  // Journal & Mood
  saveJournalEntry: (entry: { id?: number; title: string; body: string; category: string }) => void;
  deleteJournalEntry: (id: number) => void;
  logMoodEntry: (moodLevel: number, note: string, tags: string[]) => void;
  deleteMoodEntry: (id: number) => void;

  // Inactivity & Comeback
  claimComebackQuest: () => number;
  dismissComebackQuest: () => void;
  setVacationMode: (days: number | null) => void;

  // Quests & Plan
  swapDailyQuest: (questInstanceId: number) => boolean;
  completeManualDailyQuest: (questInstanceId: number) => void;
  addPersonalQuest: (title: string, rewardXp: 10 | 25 | 50, category?: QuestTemplate['category']) => void;
  completePersonalQuest: (templateId: string) => void;
  deletePersonalQuest: (templateId: string) => void;
  toggleRestModeToday: () => void;
  toggleLightModeToday: () => void;
  updateTrainingPlanDay: (weekday: number, dayType: TrainingDayType, note?: string) => void;
  applyTrainingPreset: (preset: 'light' | 'balanced' | 'flexible') => void;

  // Onboarding Questionnaire v0.2
  updateOnboardingDraft: (patch: Partial<OnboardingProfile>) => void;
  completeOnboarding: (finalDraft: OnboardingProfile, pledged: boolean) => void;
  reopenOnboarding: () => void;

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
          const defaultOnb = createDefaultOnboardingProfile();
          const mergedOnboarding: OnboardingProfile = {
            ...defaultOnb,
            ...(parsed.onboarding ?? {}),
          };
          setDb((prev) => ({
            ...prev,
            ...parsed,
            profile: { ...DEFAULT_PROFILE, ...(parsed.profile ?? {}) },
            onboarding: mergedOnboarding,
            playerStats:
              parsed.playerStats ?? calculateInitialStats(mergedOnboarding),
            activities: Array.isArray(parsed.activities) ? parsed.activities : prev.activities,
            xpEvents: Array.isArray(parsed.xpEvents) ? parsed.xpEvents : prev.xpEvents,
            dailyQuestsByDay: parsed.dailyQuestsByDay ?? prev.dailyQuestsByDay,
            manualDailyQuestDoneByDay: parsed.manualDailyQuestDoneByDay ?? {},
            weeklyQuestsByWeek: parsed.weeklyQuestsByWeek ?? prev.weeklyQuestsByWeek,
            milestoneQuests: Array.isArray(parsed.milestoneQuests)
              ? parsed.milestoneQuests
              : prev.milestoneQuests,
            personalQuestTemplates: Array.isArray(parsed.personalQuestTemplates)
              ? parsed.personalQuestTemplates
              : prev.personalQuestTemplates,
            personalQuestDoneByDay: parsed.personalQuestDoneByDay ?? {},
            trainingPlan: Array.isArray(parsed.trainingPlan)
              ? parsed.trainingPlan
              : prev.trainingPlan,
            journals: Array.isArray(parsed.journals) ? parsed.journals : prev.journals,
            moods: Array.isArray(parsed.moods) ? parsed.moods : prev.moods,
            achievementsUnlocked: Array.isArray(parsed.achievementsUnlocked)
              ? parsed.achievementsUnlocked
              : prev.achievementsUnlocked,
            metricCounters: parsed.metricCounters ?? { tabs_visited: 1 },
            visitedTabs: Array.isArray(parsed.visitedTabs) ? parsed.visitedTabs : ['home'],
            streakLogs: parsed.streakLogs ?? {},
            customFoods: Array.isArray(parsed.customFoods) ? parsed.customFoods : [],
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

  // Ensure today's daily quests, weekly quests, ledger integrity, and inactivity settlement run on load/day change
  useEffect(() => {
    if (!isLoaded) return;
    setDb((prev) => {
      let changed = false;
      const next: AwakenedDatabaseState = {
        ...prev,
        profile: { ...prev.profile },
      };

      // 1. Ledger integrity check (Section 6.5): ensure SUM(xpEvents.amount) === profile.totalXp
      const reconciled = reconcileLedgerTotalXp(next.profile.totalXp, next.xpEvents);
      if (reconciled.addedOpeningEvent) {
        next.xpEvents = reconciled.events;
        changed = true;
      }

      // 2. Grant weekly +1 freeze token if entering a new week (capped at 2)
      if (next.profile.lastFreezeGrantWeek !== weekKey) {
        next.profile = {
          ...next.profile,
          freezeTokens: Math.min(2, next.profile.freezeTokens + 1),
          lastFreezeGrantWeek: weekKey,
        };
        changed = true;
      }

      // 3. Grant monthly +1 Penalty Shield if entering a new month (capped at 3)
      const monthKey = todayKey.slice(0, 7);
      if (next.profile.lastShieldGrantMonth !== monthKey) {
        next.profile = {
          ...next.profile,
          penaltyShields: Math.min(3, (next.profile.penaltyShields ?? 1) + 1),
          lastShieldGrantMonth: monthKey,
        };
        changed = true;
      }

      // 4. Retroactive offline settlement for 30% Inactivity EXP Penalty (Section 1.2)
      const settleRes = settleInactivity({
        todayKey,
        createdAt: next.profile.createdAt,
        totalXp: next.profile.totalXp,
        xpEvents: next.xpEvents,
        trainingPlan: next.trainingPlan,
        activities: next.activities,
        dailyQuestsByDay: next.dailyQuestsByDay,
        streakLogs: next.streakLogs ?? {},
        restModeToday: next.profile.restModeToday,
        vacationUntilDayKey: next.profile.vacationUntilDayKey,
        penaltyShields: next.profile.penaltyShields ?? 0,
        settings: next.profile.inactivitySettings,
      });

      if (settleRes.newEvents.length > 0) {
        next.xpEvents = [...next.xpEvents, ...settleRes.newEvents];
        next.profile = {
          ...next.profile,
          totalXp: settleRes.newTotalXp,
          penaltyShields: settleRes.shieldsRemaining,
          activeComebackQuest: settleRes.comebackQuest ?? next.profile.activeComebackQuest ?? null,
        };
        changed = true;
      }

      if (!next.dailyQuestsByDay[todayKey]) {
        const weekday = getWeekdayOneBased(todayKey);
        const planRest =
          next.trainingPlan.find((d) => d.weekday === weekday)?.dayType === 'rest' ||
          next.profile.restModeToday === todayKey;

        const penalty = evaluateWorkoutPenalty({
          todayKey,
          rankId: getRankForLevel(computeLevelState(next.profile.totalXp).level).currentRank.id,
          trainingPlan: next.trainingPlan,
          activities: next.activities,
          dailyQuestsByDay: next.dailyQuestsByDay,
          streakLogs: next.streakLogs ?? {},
          createdAt: next.profile.createdAt,
          onboarding: next.onboarding,
        });

        const quests = generateDailyQuestsForDay({
          dayKey: todayKey,
          isRestDay: planRest,
          availableMinutesPerDay: next.profile.availableMinutesPerDay,
          waterGoalMl: next.profile.waterGoalMl,
          onboarding: next.onboarding,
          missedDaysInRow: settleRes.consecutiveMissedDays,
          penaltyMultiplier: penalty.active ? penalty.multiplier : 1,
        });
        next.dailyQuestsByDay = { ...next.dailyQuestsByDay, [todayKey]: quests };
        changed = true;
      }

      if (!next.weeklyQuestsByWeek[weekKey]) {
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
              ? next.profile.weeklyGoalDays
              : Number(tpl.condition.target),
          status: 'available',
          completedAt: null,
        }));
        next.weeklyQuestsByWeek = { ...next.weeklyQuestsByWeek, [weekKey]: wQuests };
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [isLoaded, todayKey, weekKey]);

  // Helper to compute metrics from state
  const computeMetricsForState = (
    state: AwakenedDatabaseState,
    forDayKey: string = todayKey
  ): {
    metrics: DailyMetricsSnapshot;
    streak: StreakEvaluationResult;
    dailyRepeatableXp: number;
  } => {
    const activeActivities = state.activities.filter((a) => !a.deletedAt);
    const todayActs = activeActivities.filter(
      (a) => getLocalDayKey(a.occurredAt, a.tzOffsetMin) === forDayKey
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
      (j) => j.entryDate === forDayKey && j.body.trim().length >= 20
    ).length;
    const moodCount = state.moods.filter((m) => m.dayKey === forDayKey).length;
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

    const weekDays = new Set(getDaysInWeekRange(forDayKey, state.profile.weekStartDay));
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
          getLocalDayKey(e.occurredAt) === forDayKey &&
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
      manual_done_ids: state.manualDailyQuestDoneByDay?.[forDayKey] ?? [],
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
      const nextStats: PlayerStats = { ...(working.playerStats ?? { STR: 10, VIT: 10, INT: 10, WIL: 10 }) };
      const updatedDaily = currentDaily.map((q) => {
        const res = evaluateQuestProgress(q, afterSnap.metrics, now);
        if (res.newlyCompleted) {
          questXpBonusTotal += res.updated.template.reward_xp;
          const statKeys: PlayerStatKey[] = Array.isArray(res.updated.template.stat)
            ? res.updated.template.stat
            : res.updated.template.stat
            ? [res.updated.template.stat]
            : res.updated.template.slot === 'body'
            ? ['STR']
            : res.updated.template.slot === 'mind'
            ? ['WIL']
            : ['VIT'];
          for (const sk of statKeys) {
            nextStats[sk] = Math.min(100, (nextStats[sk] ?? 10) + 1);
          }
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

        // Auto-refund 50% Comeback Quest when all daily quests are completed (Section 1.3)
        const cq = working.profile.activeComebackQuest;
        if (cq && !cq.claimedAt && cq.refundableXp > 0) {
          questXpBonusTotal += cq.refundableXp;
          working.xpEvents = [
            ...working.xpEvents,
            {
              id: now + 1001,
              amount: cq.refundableXp,
              sourceType: 'adjust',
              sourceId: cq.penaltyEventId,
              reasonKey: 'comeback_quest_refund',
              configVersion: xpConfigJson.version,
              occurredAt: now,
              idemKey: `comeback_refund:${cq.penaltyIdemKey}`,
              dayKey: todayKey,
            },
          ];
          working.profile = {
            ...working.profile,
            activeComebackQuest: {
              ...cq,
              claimedAt: now,
            },
          };
          newCelebrations.push({
            id: `comeback_refund_${now}`,
            tier: 1,
            title:
              working.profile.language === 'th'
                ? `ภารกิจกู้คืนสำเร็จ! ได้รับคืน +${cq.refundableXp} XP (50%)`
                : `Comeback Quest Complete! Refunded +${cq.refundableXp} XP (50%)`,
            subtitle:
              working.profile.language === 'th'
                ? 'ยินดีต้อนรับกลับสู่ระบบ ก้าวต่อไปอย่างมั่นคง!'
                : 'Welcome back to the System. Keep moving forward!',
            xpGained: cq.refundableXp,
          });
        }
      }
      working.dailyQuestsByDay = {
        ...working.dailyQuestsByDay,
        [todayKey]: updatedDaily,
      };
      working.playerStats = nextStats;

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

      // Apply total XP before achievement evaluation (Single Source of Truth = never negative)
      const baseTotalXp = Math.max(
        0,
        working.profile.totalXp + directXpGained + questXpBonusTotal
      );
      working.profile = {
        ...working.profile,
        totalXp: baseTotalXp,
      };

      // Evaluate 199 Achievements Catalog with up to 5-round cascading (Section 6.3 of Awakened-Achievements.md)
      const allAch = getAchievementCatalog();
      const unlockedSet = new Set(working.achievementsUnlocked.map((u) => u.achievementId));
      const computedAchMetrics = computeAchievementMetrics({
        activities: working.activities,
        journals: working.journals,
        moods: working.moods,
        dailyQuestsByDay: working.dailyQuestsByDay,
        weeklyQuestsByWeek: working.weeklyQuestsByWeek,
        milestoneQuests: working.milestoneQuests,
        personalQuestDoneByDay: working.personalQuestDoneByDay,
        streakLogs: working.streakLogs,
        trainingPlan: working.trainingPlan,
        waterGoalMl: working.profile.waterGoalMl,
        weeklyGoalDays: working.profile.weeklyGoalDays,
        weekStartDay: working.profile.weekStartDay,
        longestStreak: afterSnap.streak.longestStreak,
        totalActiveDays: afterSnap.metrics.total_active_days,
        totalXp: baseTotalXp,
        playerStats: working.playerStats,
        ageBand: working.onboarding?.ageBand ?? '25-34',
        safetyFlags: working.onboarding?.safetyFlags ?? ['none'],
        pledgedAt: working.onboarding?.pledgedAt ?? null,
        bosses: working.onboarding?.bosses ?? [],
        unlockedIds: unlockedSet,
        existingCounters: working.metricCounters ?? {},
      });

      const achEval = evaluateAchievements({
        metrics: computedAchMetrics,
        unlockedIds: unlockedSet,
        totalXp: baseTotalXp,
        ageBand: working.onboarding?.ageBand ?? '25-34',
        safetyFlags: working.onboarding?.safetyFlags ?? ['none'],
        catalog: allAch,
      });

      if (achEval.newlyUnlocked.length > 0) {
        const newUnlockRecords: AchievementUnlock[] = achEval.newlyUnlocked.map((ach) => ({
          achievementId: ach.id,
          unlockedAt: now,
        }));
        const newAchXpEvents: XpEventRecord[] = achEval.newlyUnlocked.map((ach, idx) => ({
          id: now + 5000 + idx,
          amount: ach.xp || 25,
          sourceType: 'achievement',
          sourceId: ach.id,
          reasonKey: ach.id,
          configVersion: xpConfigJson.version,
          occurredAt: now,
        }));
        working.achievementsUnlocked = [
          ...working.achievementsUnlocked,
          ...newUnlockRecords,
        ];
        working.xpEvents = [...working.xpEvents, ...newAchXpEvents];
        working.profile = {
          ...working.profile,
          totalXp: achEval.finalTotalXp,
        };

        if (!working.profile.muteAchievementAlerts) {
          const mergedCeleb = buildMergedAchievementCelebration(
            achEval.newlyUnlocked,
            working.profile.language,
            working.onboarding?.bosses ?? [],
            now
          );
          if (mergedCeleb) {
            newCelebrations.push(mergedCeleb);
          }
        }
      }

      // Persist monotonic numeric counters (Rule R1)
      const nextNumericCounters: Record<string, number> = {
        ...(working.metricCounters ?? {}),
      };
      for (const [k, v] of Object.entries(achEval.updatedMetrics)) {
        if (typeof v === 'number') {
          nextNumericCounters[k] = Math.max(nextNumericCounters[k] ?? 0, v);
        }
      }
      working.metricCounters = nextNumericCounters;

      const newLevelState = computeLevelState(working.profile.totalXp);

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

  /**
   * Computes the full state and XP/Quest/Level rollback when deleting an activity (Section 6).
   * Always reverts direct XP, water_goal bonus (if dropping below waterGoalMl), any daily/weekly
   * quests that were completed because of this activity, and the all_daily_completed bonus.
   */
  const computeActivityDeleteOutcome = (
    state: AwakenedDatabaseState,
    activityId: number,
    nowMs: number = Date.now()
  ): {
    nextState: AwakenedDatabaseState;
    preview: DeleteActivityPreview;
  } | null => {
    const target = state.activities.find((a) => a.id === activityId && !a.deletedAt);
    if (!target) return null;

    const targetDayKey = getLocalDayKey(target.occurredAt, target.tzOffsetMin);
    const targetWeekKey = getWeekStartDayKey(targetDayKey, state.profile.weekStartDay);

    const beforeDaySnap = computeMetricsForState(state, targetDayKey);
    const updatedActivities = state.activities.map((a) =>
      a.id === activityId ? { ...a, deletedAt: nowMs } : a
    );
    const draftAfterAct: AwakenedDatabaseState = {
      ...state,
      activities: updatedActivities,
    };
    const afterDaySnap = computeMetricsForState(draftAfterAct, targetDayKey);

    let directXp = Math.max(0, target.xpAwarded || 0);

    // If deleting a water log causes daily water to drop below waterGoalMl, also check if
    // another water log on that day held the +20 water_goal XP while this log was needed to reach it
    if (
      target.type === 'water' &&
      beforeDaySnap.metrics.water_ml >= state.profile.waterGoalMl &&
      afterDaySnap.metrics.water_ml < state.profile.waterGoalMl
    ) {
      const targetHadGoalEvent = state.xpEvents.some(
        (e) => e.sourceId === activityId && e.reasonKey === 'water_goal' && e.amount > 0
      );
      if (!targetHadGoalEvent) {
        const otherGoalEvent = state.xpEvents.find(
          (e) =>
            e.reasonKey === 'water_goal' &&
            getLocalDayKey(e.occurredAt) === targetDayKey &&
            e.amount > 0
        );
        const alreadyRevertedGoal = state.xpEvents.some(
          (e) =>
            e.sourceType === 'revert' &&
            e.reasonKey === 'revert_water_goal' &&
            e.dayKey === targetDayKey
        );
        if (otherGoalEvent && !alreadyRevertedGoal) {
          directXp += otherGoalEvent.amount;
        }
      }
    }

    let revertedQuestXp = 0;
    let revertedBonusXp = 0;
    const revertedQuestTitles: string[] = [];
    const nextStats: PlayerStats = {
      ...(state.playerStats ?? { STR: 10, VIT: 10, INT: 10, WIL: 10 }),
    };

    const currentDaily = state.dailyQuestsByDay[targetDayKey] ?? [];
    const prevAllDailyDone =
      currentDaily.length > 0 && currentDaily.every((q) => q.status === 'completed');

    const updatedDaily = currentDaily.map((q) => {
      if (q.template.condition.metric === 'manual') {
        return q;
      }
      const resetQuest: QuestInstance = {
        ...q,
        progress: 0,
        status: 'available',
        completedAt: null,
      };
      const reEval = evaluateQuestProgress(resetQuest, afterDaySnap.metrics, nowMs);
      if (q.status === 'completed' && reEval.updated.status !== 'completed') {
        revertedQuestXp += q.template.reward_xp;
        revertedQuestTitles.push(
          state.profile.language === 'th' ? q.template.title_th : q.template.title_en
        );
        const statKeys: PlayerStatKey[] = Array.isArray(q.template.stat)
          ? q.template.stat
          : q.template.stat
          ? [q.template.stat]
          : q.template.slot === 'body'
          ? ['STR']
          : q.template.slot === 'mind'
          ? ['WIL']
          : ['VIT'];
        for (const sk of statKeys) {
          nextStats[sk] = Math.max(10, (nextStats[sk] ?? 10) - 1);
        }
      }
      return reEval.updated;
    });

    const nowAllDailyDone =
      updatedDaily.length > 0 && updatedDaily.every((q) => q.status === 'completed');
    if (prevAllDailyDone && !nowAllDailyDone) {
      revertedBonusXp += xpConfigJson.quest_bonus.all_daily_completed ?? 30;
    }

    const currentWeekly = state.weeklyQuestsByWeek[targetWeekKey] ?? [];
    const updatedWeekly = currentWeekly.map((wq) => {
      const resetWq: QuestInstance = {
        ...wq,
        progress: 0,
        status: 'available',
        completedAt: null,
      };
      const reEval = evaluateQuestProgress(resetWq, afterDaySnap.metrics, nowMs);
      if (wq.status === 'completed' && reEval.updated.status !== 'completed') {
        revertedQuestXp += wq.template.reward_xp;
        revertedQuestTitles.push(
          state.profile.language === 'th' ? wq.template.title_th : wq.template.title_en
        );
      }
      return reEval.updated;
    });

    const totalXpLoss = directXp + revertedQuestXp + revertedBonusXp;
    const oldTotalXp = state.profile.totalXp;
    const newTotalXp = Math.max(0, oldTotalXp - totalXpLoss);
    const actualDeducted = oldTotalXp - newTotalXp;

    const oldLevel = computeLevelState(oldTotalXp).level;
    const newLevel = computeLevelState(newTotalXp).level;

    const revertEvents: XpEventRecord[] = [];
    let nextEventId =
      state.xpEvents.reduce((max, e) => (e.id > max ? e.id : max), nowMs) + 1;

    if (actualDeducted > 0) {
      revertEvents.push({
        id: nextEventId++,
        amount: -actualDeducted,
        sourceType: 'revert',
        sourceId: activityId,
        reasonKey:
          revertedQuestXp > 0 || revertedBonusXp > 0
            ? 'delete_activity_and_quest_revert'
            : 'delete_activity_revert',
        configVersion: xpConfigJson.version,
        occurredAt: nowMs,
        dayKey: targetDayKey,
      });
    }

    const nextState: AwakenedDatabaseState = {
      ...state,
      profile: {
        ...state.profile,
        totalXp: newTotalXp,
        longestStreak: afterDaySnap.streak.longestStreak,
        freezeTokens: afterDaySnap.streak.freezeTokensRemaining,
      },
      playerStats: nextStats,
      activities: updatedActivities,
      xpEvents: [...state.xpEvents, ...revertEvents],
      dailyQuestsByDay: {
        ...state.dailyQuestsByDay,
        [targetDayKey]: updatedDaily,
      },
      weeklyQuestsByWeek: {
        ...state.weeklyQuestsByWeek,
        [targetWeekKey]: updatedWeekly,
      },
      streakLogs: afterDaySnap.streak.updatedLogs,
    };

    return {
      nextState,
      preview: {
        activityId,
        title: target.title,
        directXp,
        revertedQuestXp,
        revertedBonusXp,
        totalXpLoss: actualDeducted,
        oldTotalXp,
        newTotalXp,
        oldLevel,
        newLevel,
        revertedQuestTitles,
      },
    };
  };

  const previewDeleteActivity = (activityId: number): DeleteActivityPreview | null => {
    const outcome = computeActivityDeleteOutcome(db, activityId, Date.now());
    return outcome ? outcome.preview : null;
  };

  const deleteActivity = (
    activityId: number
  ): { xpReverted: boolean; xpAmount: number } => {
    let result = { xpReverted: false, xpAmount: 0 };
    const now = Date.now();

    setDb((prev) => {
      const outcome = computeActivityDeleteOutcome(prev, activityId, now);
      if (!outcome) return prev;
      result = {
        xpReverted: outcome.preview.totalXpLoss > 0,
        xpAmount: outcome.preview.totalXpLoss,
      };
      return outcome.nextState;
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
    const now = Date.now();
    setDb((prev) => {
      const target = prev.journals.find((j) => j.id === id);
      if (!target) return prev;
      const targetDayKey = target.entryDate;
      const updatedJournals = prev.journals.filter((j) => j.id !== id);
      const draftAfter: AwakenedDatabaseState = { ...prev, journals: updatedJournals };
      const afterSnap = computeMetricsForState(draftAfter, targetDayKey);

      let revertedXp = Math.max(0, target.xpAwarded || 0);
      const currentDaily = prev.dailyQuestsByDay[targetDayKey] ?? [];
      const prevAllDone =
        currentDaily.length > 0 && currentDaily.every((q) => q.status === 'completed');

      const updatedDaily = currentDaily.map((q) => {
        if (q.template.condition.metric === 'manual') return q;
        const resetQ: QuestInstance = {
          ...q,
          progress: 0,
          status: 'available',
          completedAt: null,
        };
        const reEval = evaluateQuestProgress(resetQ, afterSnap.metrics, now);
        if (q.status === 'completed' && reEval.updated.status !== 'completed') {
          revertedXp += q.template.reward_xp;
        }
        return reEval.updated;
      });

      const nowAllDone =
        updatedDaily.length > 0 && updatedDaily.every((q) => q.status === 'completed');
      if (prevAllDone && !nowAllDone) {
        revertedXp += xpConfigJson.quest_bonus.all_daily_completed ?? 30;
      }

      const newTotalXp = Math.max(0, prev.profile.totalXp - revertedXp);
      const actualLoss = prev.profile.totalXp - newTotalXp;

      return {
        ...prev,
        profile: { ...prev.profile, totalXp: newTotalXp },
        journals: updatedJournals,
        dailyQuestsByDay: {
          ...prev.dailyQuestsByDay,
          [targetDayKey]: updatedDaily,
        },
        xpEvents:
          actualLoss > 0
            ? [
                ...prev.xpEvents,
                {
                  id: now,
                  amount: -actualLoss,
                  sourceType: 'revert',
                  sourceId: id,
                  reasonKey: 'delete_journal_revert',
                  configVersion: xpConfigJson.version,
                  occurredAt: now,
                  dayKey: targetDayKey,
                },
              ]
            : prev.xpEvents,
      };
    });
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

  const deleteMoodEntry = (id: number) => {
    const now = Date.now();
    setDb((prev) => {
      const target = prev.moods.find((m) => m.id === id);
      if (!target) return prev;
      const targetDayKey = target.dayKey;
      const updatedMoods = prev.moods.filter((m) => m.id !== id);
      const draftAfter: AwakenedDatabaseState = { ...prev, moods: updatedMoods };
      const afterSnap = computeMetricsForState(draftAfter, targetDayKey);

      let revertedXp = Math.max(0, target.xpAwarded || 0);
      const currentDaily = prev.dailyQuestsByDay[targetDayKey] ?? [];
      const prevAllDone =
        currentDaily.length > 0 && currentDaily.every((q) => q.status === 'completed');

      const updatedDaily = currentDaily.map((q) => {
        if (q.template.condition.metric === 'manual') return q;
        const resetQ: QuestInstance = {
          ...q,
          progress: 0,
          status: 'available',
          completedAt: null,
        };
        const reEval = evaluateQuestProgress(resetQ, afterSnap.metrics, now);
        if (q.status === 'completed' && reEval.updated.status !== 'completed') {
          revertedXp += q.template.reward_xp;
        }
        return reEval.updated;
      });

      const nowAllDone =
        updatedDaily.length > 0 && updatedDaily.every((q) => q.status === 'completed');
      if (prevAllDone && !nowAllDone) {
        revertedXp += xpConfigJson.quest_bonus.all_daily_completed ?? 30;
      }

      const newTotalXp = Math.max(0, prev.profile.totalXp - revertedXp);
      const actualLoss = prev.profile.totalXp - newTotalXp;

      return {
        ...prev,
        profile: { ...prev.profile, totalXp: newTotalXp },
        moods: updatedMoods,
        dailyQuestsByDay: {
          ...prev.dailyQuestsByDay,
          [targetDayKey]: updatedDaily,
        },
        xpEvents:
          actualLoss > 0
            ? [
                ...prev.xpEvents,
                {
                  id: now,
                  amount: -actualLoss,
                  sourceType: 'revert',
                  sourceId: id,
                  reasonKey: 'delete_mood_revert',
                  configVersion: xpConfigJson.version,
                  occurredAt: now,
                  dayKey: targetDayKey,
                },
              ]
            : prev.xpEvents,
      };
    });
  };

  const claimComebackQuest = (): number => {
    let refunded = 0;
    executeTransaction((draft) => {
      const cq = draft.profile.activeComebackQuest;
      if (!cq || cq.claimedAt || cq.refundableXp <= 0) {
        return { nextState: draft, directXpGained: 0 };
      }
      const now = Date.now();
      refunded = cq.refundableXp;
      const refundEvent: XpEventRecord = {
        id: now + Math.floor(Math.random() * 1000),
        amount: refunded,
        sourceType: 'adjust',
        sourceId: cq.penaltyEventId,
        reasonKey: 'comeback_quest_refund',
        configVersion: xpConfigJson.version,
        occurredAt: now,
        idemKey: `comeback_refund:${cq.penaltyIdemKey}`,
        dayKey: todayKey,
      };
      return {
        nextState: {
          ...draft,
          profile: {
            ...draft.profile,
            activeComebackQuest: {
              ...cq,
              claimedAt: now,
            },
          },
          xpEvents: [...draft.xpEvents, refundEvent],
        },
        directXpGained: refunded,
      };
    });
    return refunded;
  };

  const dismissComebackQuest = () => {
    setDb((prev) => {
      if (!prev.profile.activeComebackQuest) return prev;
      return {
        ...prev,
        profile: {
          ...prev.profile,
          activeComebackQuest: {
            ...prev.profile.activeComebackQuest,
            dismissedAt: Date.now(),
          },
        },
      };
    });
  };

  const setVacationMode = (days: number | null) => {
    setDb((prev) => {
      const untilKey =
        days && days > 0 ? addDaysToDayKey(todayKey, Math.min(30, days) - 1) : null;
      return {
        ...prev,
        profile: {
          ...prev.profile,
          vacationUntilDayKey: untilKey,
        },
      };
    });
  };

  const swapDailyQuest = (questInstanceId: number): boolean => {
    let swapped = false;
    executeTransaction((draft) => {
      if (draft.profile.dailyQuestSwapUsedDay === todayKey) {
        return { nextState: draft, directXpGained: 0 };
      }
      const list = draft.dailyQuestsByDay[todayKey] ?? [];
      const targetQuest = list.find((q) => q.id === questInstanceId);
      if (!targetQuest || targetQuest.status === 'completed') {
        return { nextState: draft, directXpGained: 0 };
      }

      const currentIds = new Set(list.map((q) => q.templateId));
      const allDaily = (questsJson.quests as QuestTemplate[]).filter(
        (q) => q.type === 'daily' && !currentIds.has(q.id)
      );
      if (allDaily.length === 0) {
        return { nextState: draft, directXpGained: 0 };
      }

      const replacementTpl = allDaily[0];
      const targetVal =
        replacementTpl.condition.target === 'user_goal'
          ? draft.profile.waterGoalMl
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
      const prevSwaps = draft.metricCounters?.quest_swaps_total ?? 0;
      return {
        nextState: {
          ...draft,
          metricCounters: {
            ...(draft.metricCounters ?? {}),
            quest_swaps_total: prevSwaps + 1,
          },
          profile: {
            ...draft.profile,
            dailyQuestSwapUsedDay: todayKey,
          },
          dailyQuestsByDay: {
            ...draft.dailyQuestsByDay,
            [todayKey]: newList,
          },
        },
        directXpGained: 0,
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
    executeTransaction((draft) => ({
      nextState: {
        ...draft,
        personalQuestTemplates: [tpl, ...draft.personalQuestTemplates],
        metricCounters: {
          ...(draft.metricCounters ?? {}),
          'event:personal_quest_created': 1,
        },
      },
      directXpGained: 0,
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
      const penalty = turningOn
        ? { active: false, multiplier: 1 }
        : evaluateWorkoutPenalty({
            todayKey,
            rankId: getRankForLevel(computeLevelState(prev.profile.totalXp).level).currentRank.id,
            trainingPlan: prev.trainingPlan,
            activities: prev.activities,
            dailyQuestsByDay: prev.dailyQuestsByDay,
            streakLogs: prev.streakLogs ?? {},
            createdAt: prev.profile.createdAt,
            onboarding: prev.onboarding,
          });
      const regenerated = generateDailyQuestsForDay({
        dayKey: todayKey,
        isRestDay: turningOn,
        availableMinutesPerDay: prev.profile.availableMinutesPerDay,
        waterGoalMl: prev.profile.waterGoalMl,
        onboarding: prev.onboarding,
        penaltyMultiplier: penalty.active ? penalty.multiplier : 1,
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

  /**
   * Section 4.6 — โหมด "วันนี้ขอเบา ๆ" (Light Day Mode):
   * Reduces today's daily quests to a gentle 2-quest minimum while keeping 100% XP rewards
   * for each quest completed, helping users stay consistent without burning out.
   */
  const toggleLightModeToday = () => {
    setDb((prev) => {
      const turningOn = prev.profile.lightModeToday !== todayKey;
      const newLightMode = turningOn ? todayKey : null;
      const currentList = prev.dailyQuestsByDay[todayKey] ?? [];

      if (turningOn) {
        const sorted = [...currentList].sort((a, b) => {
          const aDone = a.status === 'completed' ? 0 : 1;
          const bDone = b.status === 'completed' ? 0 : 1;
          if (aDone !== bDone) return aDone - bDone;
          const aMicro = a.template.micro ? 0 : 1;
          const bMicro = b.template.micro ? 0 : 1;
          return aMicro - bMicro;
        });
        const lightList = sorted.slice(0, 2);
        return {
          ...prev,
          profile: {
            ...prev.profile,
            lightModeToday: newLightMode,
          },
          dailyQuestsByDay: {
            ...prev.dailyQuestsByDay,
            [todayKey]: lightList,
          },
        };
      }

      const isRest = prev.profile.restModeToday === todayKey;
      const regenerated = generateDailyQuestsForDay({
        dayKey: todayKey,
        isRestDay: isRest,
        availableMinutesPerDay: prev.profile.availableMinutesPerDay,
        waterGoalMl: prev.profile.waterGoalMl,
        onboarding: prev.onboarding,
        penaltyMultiplier: 1,
      }).map((q) => {
        const existing = currentList.find((c) => c.templateId === q.templateId);
        return existing ?? q;
      });

      return {
        ...prev,
        profile: {
          ...prev.profile,
          lightModeToday: newLightMode,
        },
        dailyQuestsByDay: {
          ...prev.dailyQuestsByDay,
          [todayKey]: regenerated,
        },
      };
    });
  };

  const completeManualDailyQuest = (questInstanceId: number) => {
    executeTransaction((draft) => {
      const list = draft.dailyQuestsByDay[todayKey] ?? [];
      const targetQuest = list.find((q) => q.id === questInstanceId);
      if (!targetQuest || targetQuest.status === 'completed') {
        return { nextState: draft, directXpGained: 0 };
      }

      const doneList = draft.manualDailyQuestDoneByDay?.[todayKey] ?? [];
      const nextDoneList = doneList.includes(targetQuest.templateId)
        ? doneList
        : [...doneList, targetQuest.templateId];

      // Also mark non-manual micro quests completed directly if triggered from quick complete
      const updatedList = list.map((q) =>
        q.id === questInstanceId && q.template.condition.metric !== 'manual'
          ? {
              ...q,
              progress: q.target,
              status: 'completed' as const,
              completedAt: Date.now(),
            }
          : q
      );

      let directBonus = 0;
      let nextXpEvents = draft.xpEvents;
      const nextStats: PlayerStats = { ...(draft.playerStats ?? { STR: 10, VIT: 10, INT: 10, WIL: 10 }) };

      if (targetQuest.template.condition.metric !== 'manual') {
        directBonus = targetQuest.template.reward_xp;
        const now = Date.now();
        nextXpEvents = [
          ...draft.xpEvents,
          {
            id: now + Math.floor(Math.random() * 10000),
            amount: directBonus,
            sourceType: 'quest',
            sourceId: targetQuest.templateId,
            reasonKey: `quest_${targetQuest.templateId}`,
            configVersion: xpConfigJson.version,
            occurredAt: now,
          },
        ];
        const statKeys: PlayerStatKey[] = Array.isArray(targetQuest.template.stat)
          ? targetQuest.template.stat
          : targetQuest.template.stat
          ? [targetQuest.template.stat]
          : ['STR'];
        for (const sk of statKeys) {
          nextStats[sk] = Math.min(100, (nextStats[sk] ?? 10) + 1);
        }
      }

      return {
        nextState: {
          ...draft,
          playerStats: nextStats,
          xpEvents: nextXpEvents,
          manualDailyQuestDoneByDay: {
            ...(draft.manualDailyQuestDoneByDay ?? {}),
            [todayKey]: nextDoneList,
          },
          dailyQuestsByDay: {
            ...draft.dailyQuestsByDay,
            [todayKey]: updatedList,
          },
        },
        directXpGained: directBonus,
      };
    });
  };

  const updateOnboardingDraft = (patch: Partial<OnboardingProfile>) => {
    if (patch.narrator || patch.vow !== undefined) {
      executeTransaction((draft) => {
        const nextCounters = { ...(draft.metricCounters ?? {}) };
        if (patch.narrator && patch.narrator !== draft.onboarding?.narrator) {
          nextCounters['event:narrator_changed'] = 1;
        }
        if (patch.vow !== undefined && draft.onboarding?.completed) {
          nextCounters['event:vow_reviewed'] = 1;
        }
        return {
          nextState: {
            ...draft,
            metricCounters: nextCounters,
            onboarding: {
              ...draft.onboarding,
              ...patch,
              updatedAt: Date.now(),
            },
          },
          directXpGained: 0,
        };
      });
      return;
    }
    setDb((prev) => ({
      ...prev,
      onboarding: {
        ...prev.onboarding,
        ...patch,
        updatedAt: Date.now(),
      },
    }));
  };

  const recordAppEvent = (metricKey: string, incrementBy: number = 1) => {
    executeTransaction((draft) => {
      const prevVal = draft.metricCounters?.[metricKey] ?? 0;
      const nextVal = metricKey.startsWith('event:')
        ? Math.max(1, prevVal + incrementBy)
        : prevVal + incrementBy;
      return {
        nextState: {
          ...draft,
          metricCounters: {
            ...(draft.metricCounters ?? {}),
            [metricKey]: nextVal,
          },
        },
        directXpGained: 0,
      };
    });
  };

  const recordTabVisited = (tabId: string) => {
    if (db.visitedTabs?.includes(tabId)) return;
    executeTransaction((draft) => {
      const visited = Array.from(new Set([...(draft.visitedTabs ?? ['home']), tabId]));
      return {
        nextState: {
          ...draft,
          visitedTabs: visited,
          metricCounters: {
            ...(draft.metricCounters ?? {}),
            tabs_visited: visited.length,
          },
        },
        directXpGained: 0,
      };
    });
  };

  const completeOnboarding = (finalDraft: OnboardingProfile, pledged: boolean) => {
    executeTransaction((draft) => {
      const now = Date.now();
      const finalized = finalizeOnboardingProfile(finalDraft, pledged, now);
      const calculatedStats = calculateInitialStats(finalized);

      // Keep higher of existing stats or newly calculated base stats (never decrease per Section 5.3)
      const mergedStats: PlayerStats = {
        STR: Math.max(draft.playerStats?.STR ?? 0, calculatedStats.STR),
        VIT: Math.max(draft.playerStats?.VIT ?? 0, calculatedStats.VIT),
        INT: Math.max(draft.playerStats?.INT ?? 0, calculatedStats.INT),
        WIL: Math.max(draft.playerStats?.WIL ?? 0, calculatedStats.WIL),
      };

      // Award +50 XP Awakening Bonus once when user pledges for the first time (Section 3 Q21 & 4.6)
      const alreadyGotPledgeBonus = draft.xpEvents.some(
        (e) => e.reasonKey === 'onboarding_awakening_pledge'
      );
      const pledgeBonusXp = pledged && !alreadyGotPledgeBonus ? 50 : 0;
      const nextXpEvents =
        pledgeBonusXp > 0
          ? [
              ...draft.xpEvents,
              {
                id: now + 777,
                amount: pledgeBonusXp,
                sourceType: 'bonus' as const,
                reasonKey: 'onboarding_awakening_pledge',
                configVersion: xpConfigJson.version,
                occurredAt: now,
              },
            ]
          : draft.xpEvents;

      const weekday = getWeekdayOneBased(todayKey);
      const isRest =
        draft.trainingPlan.find((d) => d.weekday === weekday)?.dayType === 'rest' ||
        draft.profile.restModeToday === todayKey;

      const regeneratedQuests = generateDailyQuestsForDay({
        dayKey: todayKey,
        isRestDay: Boolean(isRest),
        availableMinutesPerDay: finalized.minutesPerDay,
        waterGoalMl: finalized.waterGoalMl,
        onboarding: finalized,
        nowMs: now,
      });

      return {
        nextState: {
          ...draft,
          onboarding: finalized,
          playerStats: mergedStats,
          xpEvents: nextXpEvents,
          profile: {
            ...draft.profile,
            displayName: finalized.nickname || draft.profile.displayName,
            waterGoalMl: finalized.waterGoalMl || draft.profile.waterGoalMl,
            availableMinutesPerDay: finalized.minutesPerDay || draft.profile.availableMinutesPerDay,
          },
          dailyQuestsByDay: {
            ...draft.dailyQuestsByDay,
            [todayKey]: regeneratedQuests,
          },
        },
        directXpGained: pledgeBonusXp,
      };
    });
  };

  const reopenOnboarding = () => {
    setDb((prev) => ({
      ...prev,
      onboarding: {
        ...prev.onboarding,
        completed: false,
        currentStepIndex: 0,
      },
    }));
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
    executeTransaction((draft) => {
      const nextCounters = { ...(draft.metricCounters ?? {}) };
      if (patch.hiddenDashboardCards !== undefined || patch.dashboardCardsOrder !== undefined) {
        nextCounters['event:dashboard_customized'] = 1;
      }
      if (patch.weeklyGoalDays !== undefined || patch.availableMinutesPerDay !== undefined) {
        nextCounters['event:difficulty_adjusted'] = 1;
      }
      if (patch.appLockPin) {
        nextCounters['event:applock_set'] = 1;
      }
      return {
        nextState: {
          ...draft,
          metricCounters: nextCounters,
          profile: { ...draft.profile, ...patch },
        },
        directXpGained: 0,
      };
    });
  };

  const exportBackupJson = (): string => {
    const json = JSON.stringify(
      {
        app: 'Awakened — Life RPG',
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        data: db,
      },
      null,
      2
    );
    recordAppEvent('event:export_done', 1);
    return json;
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

  const unlockedTrophyCounts = useMemo(() => {
    const allAch = achievementsJson.achievements as AchievementDef[];
    const unlockedSet = new Set(db.achievementsUnlocked.map((u) => u.achievementId));
    let bronze = 0;
    let silver = 0;
    let gold = 0;
    let legend = 0;
    for (const a of allAch) {
      if (unlockedSet.has(a.id)) {
        if (a.tier === 'bronze') bronze++;
        else if (a.tier === 'silver') silver++;
        else if (a.tier === 'gold') gold++;
        else if (a.tier === 'legend') legend++;
      }
    }
    return { bronze, silver, gold, legend };
  }, [db.achievementsUnlocked]);

  const { currentRank, nextRank, monarchEligibility } = useMemo(
    () =>
      getRankForLevel(levelState.level, {
        totalActiveDays: todayMetrics.total_active_days,
        unlockedBadgeCategoriesCount: unlockedCategoriesCount,
        trophiesByTier: unlockedTrophyCounts,
      }),
    [levelState.level, todayMetrics.total_active_days, unlockedCategoriesCount, unlockedTrophyCounts]
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

  const achievementMetrics = useMemo(
    () =>
      computeAchievementMetrics({
        activities: db.activities,
        journals: db.journals,
        moods: db.moods,
        dailyQuestsByDay: db.dailyQuestsByDay,
        weeklyQuestsByWeek: db.weeklyQuestsByWeek,
        milestoneQuests: db.milestoneQuests,
        personalQuestDoneByDay: db.personalQuestDoneByDay,
        streakLogs: streakState.updatedLogs,
        trainingPlan: db.trainingPlan,
        waterGoalMl: db.profile.waterGoalMl,
        weeklyGoalDays: db.profile.weeklyGoalDays,
        weekStartDay: db.profile.weekStartDay,
        longestStreak: streakState.longestStreak,
        totalActiveDays: todayMetrics.total_active_days,
        totalXp: db.profile.totalXp,
        playerStats: db.playerStats,
        ageBand: db.onboarding?.ageBand ?? '25-34',
        safetyFlags: db.onboarding?.safetyFlags ?? ['none'],
        pledgedAt: db.onboarding?.pledgedAt ?? null,
        bosses: db.onboarding?.bosses ?? [],
        unlockedIds: db.achievementsUnlocked.map((u) => u.achievementId),
        existingCounters: db.metricCounters ?? {},
      }),
    [db, streakState, todayMetrics.total_active_days]
  );

  const dailyNutrition = useMemo(
    () => getDailyNutritionSummary(db.activities, todayKey),
    [db.activities, todayKey]
  );

  const workoutPenalty = useMemo(
    () =>
      evaluateWorkoutPenalty({
        todayKey,
        rankId: currentRank.id,
        trainingPlan: db.trainingPlan,
        activities: db.activities,
        dailyQuestsByDay: db.dailyQuestsByDay,
        streakLogs: db.streakLogs ?? {},
        createdAt: db.profile.createdAt,
        onboarding: db.onboarding,
      }),
    [
      todayKey,
      currentRank.id,
      db.trainingPlan,
      db.activities,
      db.dailyQuestsByDay,
      db.streakLogs,
      db.profile.createdAt,
      db.onboarding,
    ]
  );

  const inactivityStatus = useMemo(
    () =>
      settleInactivity({
        todayKey,
        createdAt: db.profile.createdAt,
        totalXp: db.profile.totalXp,
        xpEvents: db.xpEvents,
        trainingPlan: db.trainingPlan,
        activities: db.activities,
        dailyQuestsByDay: db.dailyQuestsByDay,
        streakLogs: db.streakLogs ?? {},
        restModeToday: db.profile.restModeToday,
        vacationUntilDayKey: db.profile.vacationUntilDayKey,
        penaltyShields: db.profile.penaltyShields ?? 0,
        settings: db.profile.inactivitySettings,
      }),
    [
      todayKey,
      db.profile.createdAt,
      db.profile.totalXp,
      db.xpEvents,
      db.trainingPlan,
      db.activities,
      db.dailyQuestsByDay,
      db.streakLogs,
      db.profile.restModeToday,
      db.profile.vacationUntilDayKey,
      db.profile.penaltyShields,
      db.profile.inactivitySettings,
    ]
  );

  // Consume pending actions triggered from the Android Home Screen Widget (Section 7)
  useEffect(() => {
    if (!isLoaded) return;
    const drainWidgetActions = async () => {
      const actions = await consumePendingWidgetActions();
      if (!actions || actions.length === 0) return;
      for (const act of actions) {
        if (act.type === 'water_250') {
          logWater(250);
        } else if (act.type === 'complete_quest' && typeof act.questId === 'number') {
          completeManualDailyQuest(act.questId);
        }
      }
    };
    drainWidgetActions();
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        drainWidgetActions();
      }
    });
    const evtSub = DeviceEventEmitter.addListener('AwakenedWidgetAction', () => {
      drainWidgetActions();
    });
    return () => {
      sub.remove();
      evtSub.remove();
    };
  }, [isLoaded, todayKey]);

  // Sync Android home screen widget whenever state changes
  useEffect(() => {
    if (!isLoaded) return;
    const isRest =
      db.profile.restModeToday === todayKey ||
      Boolean(db.profile.vacationUntilDayKey && todayKey <= db.profile.vacationUntilDayKey) ||
      db.trainingPlan.find((d) => d.weekday === getWeekdayOneBased(todayKey))?.dayType === 'rest';
    const doneQuests = todayQuests.filter((q) => q.status === 'completed').length;
    const hasAppLock = Boolean(db.profile.appLockPinHash || db.profile.appLockPin);
    const hideQuests = Boolean(hasAppLock && db.profile.hideQuestsOnWidgetWhenLocked);
    const xpEarnedToday = db.xpEvents
      .filter((e) => getLocalDayKey(e.occurredAt) === todayKey && e.amount > 0)
      .reduce((sum, e) => sum + e.amount, 0);
    updateWidgetData({
      dayKey: todayKey,
      lang: db.profile.language,
      name: db.profile.displayName || 'Hunter',
      avatarPath: db.profile.avatarUri ?? '',
      rankId: currentRank.id,
      level: levelState.level,
      xpPct: Math.round(levelState.progress * 100),
      restDay: Boolean(isRest),
      hideQuestsWhenLocked: hideQuests,
      questsDone: doneQuests,
      questsTotal: todayQuests.length,
      xpEarnedToday,
      questList: todayQuests.slice(0, 5).map((q, idx) => ({
        id: q.id,
        templateId: q.templateId,
        rewardXp: q.template.reward_xp,
        title: hideQuests
          ? db.profile.language === 'th'
            ? `ภารกิจลับ #${idx + 1} (ล็อกแอปอยู่)`
            : `Hidden Mission #${idx + 1} (Locked)`
          : db.profile.language === 'th'
          ? q.template.title_th || q.template.title_en
          : q.template.title_en,
        status: q.status,
        progress: q.progress,
        target: q.target,
        done: q.status === 'completed',
      })),
      waterMl: todayMetrics.water_ml,
      waterGoal: db.profile.waterGoalMl,
      kcal: dailyNutrition.kcal,
      kcalGoal: db.profile.dailyCalorieTarget || 2000,
      carbsG: dailyNutrition.carbsG,
      proteinG: dailyNutrition.proteinG,
      fatG: dailyNutrition.fatG,
      streak: streakState.currentStreak,
      trophiesDone: db.achievementsUnlocked.length,
      trophiesTotal: 199,
      bronzeDone: unlockedTrophyCounts.bronze,
      silverDone: unlockedTrophyCounts.silver,
      goldDone: unlockedTrophyCounts.gold,
      legendDone: unlockedTrophyCounts.legend,
      alarmTime: db.profile.alarm?.enabled ? db.profile.alarm.time : '',
      morningReminderTime:
        db.profile.notifications?.enabled && db.profile.notifications?.morningReminderEnabled
          ? db.profile.notifications.morningReminderTime || '08:00'
          : '',
      noonReminderTime:
        db.profile.notifications?.enabled && db.profile.notifications?.noonReminderEnabled
          ? db.profile.notifications.noonReminderTime || '12:00'
          : '',
      eveningReminderTime:
        db.profile.notifications?.enabled && db.profile.notifications?.eveningReminderEnabled
          ? db.profile.notifications.eveningReminderTime || '20:00'
          : '',
    });
  }, [
    isLoaded,
    todayKey,
    db.profile.language,
    db.profile.displayName,
    db.profile.avatarUri,
    db.profile.appLockPin,
    db.profile.appLockPinHash,
    db.profile.hideQuestsOnWidgetWhenLocked,
    db.profile.vacationUntilDayKey,
    db.profile.alarm?.enabled,
    db.profile.alarm?.time,
    db.profile.notifications?.enabled,
    db.profile.notifications?.morningReminderEnabled,
    db.profile.notifications?.morningReminderTime,
    db.profile.notifications?.noonReminderEnabled,
    db.profile.notifications?.noonReminderTime,
    db.profile.notifications?.eveningReminderEnabled,
    db.profile.notifications?.eveningReminderTime,
    db.achievementsUnlocked.length,
    unlockedTrophyCounts,
    currentRank.id,
    levelState.level,
    levelState.progress,
    todayQuests,
    todayMetrics.water_ml,
    db.profile.waterGoalMl,
    db.profile.dailyCalorieTarget,
    dailyNutrition.kcal,
    dailyNutrition.carbsG,
    dailyNutrition.proteinG,
    dailyNutrition.fatG,
    streakState.currentStreak,
  ]);

  // Sync notification reminders (เช้า เที่ยง เย็น)
  useEffect(() => {
    if (!isLoaded) return;
    const notifs = db.profile.notifications;
    if (notifs?.enabled) {
      // 1. Morning reminder (เช้า) — Non-pressuring human copy (Section 4.7)
      if (notifs.morningReminderEnabled) {
        const [h, m] = (notifs.morningReminderTime || '08:00').split(':').map(Number);
        scheduleReminder(
          1,
          h || 8,
          m || 0,
          db.profile.language === 'th' ? 'ยังอยู่นี่นะ ไม่รีบ ✦' : 'Still right here, no rush ✦',
          db.profile.language === 'th'
            ? `อรุณสวัสดิ์ ${db.profile.displayName} วันนี้ทำเท่าที่ไหวก็นับนะ แวะมาดื่มน้ำสักแก้วไหม`
            : `Good morning ${db.profile.displayName}! Even one small step counts today.`,
          false
        );
      } else {
        cancelReminder(1);
      }
      // 2. Evening reminder (เย็น)
      if (notifs.eveningReminderEnabled) {
        const [h, m] = (notifs.eveningReminderTime || '20:00').split(':').map(Number);
        scheduleReminder(
          2,
          h || 20,
          m || 0,
          db.profile.language === 'th' ? 'วันนี้เป็นยังไงบ้าง พักผ่อนได้นะ' : 'How was today? Rest easy',
          db.profile.language === 'th'
            ? 'แวะมาจดน้ำ อาหาร หรือกด "วันนี้ขอเบา ๆ" ก่อนพักผ่อนได้เลย ไม่กดดันนะ'
            : 'Log a quick note or switch to Light Day mode before winding down—no pressure.',
          false
        );
      } else {
        cancelReminder(2);
      }
      // 3. Noon reminder (เที่ยง)
      if (notifs.noonReminderEnabled) {
        const [h, m] = (notifs.noonReminderTime || '12:00').split(':').map(Number);
        scheduleReminder(
          3,
          h || 12,
          m || 0,
          db.profile.language === 'th' ? 'พักเที่ยงแล้ว ดื่มน้ำสักแก้วนะ' : 'Midday pause — grab some water',
          db.profile.language === 'th'
            ? `ยังอยู่นี่นะ ไม่รีบ ${db.profile.displayName} เติมพลังมื้อเที่ยงแล้วค่อยว่ากัน`
            : `Take a breather ${db.profile.displayName}. Enjoy lunch and hydrate at your own pace.`,
          false
        );
      } else {
        cancelReminder(3);
      }
    } else {
      cancelReminder(1);
      cancelReminder(2);
      cancelReminder(3);
    }
  }, [
    isLoaded,
    db.profile.notifications,
    db.profile.language,
    db.profile.displayName,
  ]);

  // Sync mission alarm
  useEffect(() => {
    if (!isLoaded) return;
    const alarm = db.profile.alarm;
    if (alarm?.enabled) {
      const [h, m] = (alarm.time || '07:00').split(':').map(Number);
      scheduleAlarm(
        h || 7,
        m || 0,
        alarm.days || [],
        db.profile.language === 'th' ? '⏰ ได้เวลาภารกิจประจำวัน!' : '⏰ Time for Daily Missions!',
        db.profile.language === 'th'
          ? `ตื่นรู้และพิชิตภารกิจประจำวันเพื่อเลเวลอัป (${db.profile.displayName})`
          : `Rise and conquer today's missions to level up (${db.profile.displayName})`,
        db.profile.language === 'th' ? 'เลื่อน 10 นาที' : 'Snooze 10 min'
      );
    } else {
      cancelAlarm();
    }
  }, [isLoaded, db.profile.alarm, db.profile.language, db.profile.displayName]);

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
    achievementMetrics,
    todayQuests,
    thisWeekQuests,
    dailyNutrition,
    workoutPenalty,
    inactivityStatus,
    adaptiveRecommendations,
    dailyRepeatableXpToday,
    celebrationQueue,
    dismissCelebration,
    recordAppEvent,
    recordTabVisited,
    logWater,
    logMeal,
    addCustomFoodTemplate,
    logWorkout,
    logPomodoro,
    logCustomActivity,
    logRestDayCheckin,
    previewDeleteActivity,
    deleteActivity,
    saveJournalEntry,
    deleteJournalEntry,
    logMoodEntry,
    deleteMoodEntry,
    claimComebackQuest,
    dismissComebackQuest,
    setVacationMode,
    swapDailyQuest,
    completeManualDailyQuest,
    addPersonalQuest,
    completePersonalQuest,
    deletePersonalQuest,
    toggleRestModeToday,
    toggleLightModeToday,
    updateTrainingPlanDay,
    applyTrainingPreset,
    updateOnboardingDraft,
    completeOnboarding,
    reopenOnboarding,
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
