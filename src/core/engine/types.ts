export type LanguageCode = 'th' | 'en';
export type ThemeMode = 'dark' | 'light';

export type ActivityType = 'water' | 'meal' | 'workout' | 'focus' | 'custom' | 'rest';
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type WorkoutType = 'strength' | 'cardio' | 'stretch' | 'walk' | 'run' | 'bike' | 'other';
export type TrainingDayType = 'upper' | 'lower' | 'full' | 'cardio' | 'stretch' | 'rest';
export type CustomIntensity = 'light' | 'mid' | 'hard';
export type QuestType = 'daily' | 'weekly' | 'milestone' | 'personal';
export type QuestStatus = 'available' | 'in_progress' | 'completed' | 'skipped' | 'expired';
export type StreakDayStatus = 'active' | 'rest' | 'frozen' | 'missed';

export interface UserProfile {
  id: 1;
  displayName: string;
  totalXp: number;
  waterGoalMl: number;
  weeklyGoalDays: number;
  weekStartDay: number; // 1 = Monday
  longestStreak: number;
  freezeTokens: number;
  lastFreezeGrantWeek: string;
  availableMinutesPerDay: number;
  restModeToday: string | null; // YYYY-MM-DD if user requested recovery mode today
  dailyQuestSwapUsedDay: string | null; // YYYY-MM-DD
  dashboardCardsOrder: string[];
  hiddenDashboardCards: string[];
  language: LanguageCode;
  theme: ThemeMode;
  soundEnabled: boolean;
  reduceEffects: boolean;
  appLockPin: string | null;
  createdAt: number;
}

export interface MealDetail {
  mealSlot: MealSlot;
  caloriesEst?: number;
  caloriesMin?: number;
  caloriesMax?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  isEstimate: boolean;
  source: 'manual' | 'scan' | 'database';
  confidence?: number; // 0..1
  photoPath?: string;
}

export interface WorkoutSetItem {
  id?: number;
  exerciseName: string;
  setIndex: number;
  reps: number;
  restSec?: number;
}

export interface WorkoutDetail {
  workoutType: WorkoutType;
  durationSec: number;
  distanceM?: number;
  feeling?: number; // 1..5
  planCompleted?: boolean;
  sets?: WorkoutSetItem[];
}

export interface FocusDetail {
  taskName: string;
  focusSec: number;
  plannedSec: number;
  completed: boolean;
}

export interface ActivityRecord {
  id: number;
  type: ActivityType;
  title: string;
  value: number; // ml, minutes, kcal, etc.
  unit: string;
  note?: string;
  customIntensity?: CustomIntensity;
  occurredAt: number;
  tzOffsetMin: number;
  isBackfilled: boolean;
  createdAt: number;
  deletedAt?: number | null;
  xpAwarded: number;
  mealDetail?: MealDetail;
  workoutDetail?: WorkoutDetail;
  focusDetail?: FocusDetail;
}

export interface XpEventRecord {
  id: number;
  amount: number;
  sourceType: 'activity' | 'quest' | 'milestone' | 'bonus' | 'revert';
  sourceId?: number | string;
  reasonKey: string;
  configVersion: number;
  occurredAt: number;
}

export interface QuestCondition {
  metric: string;
  op: '>=' | '==';
  target: number | 'user_goal' | 'weekly_goal';
}

export interface QuestTemplate {
  id: string;
  type: QuestType;
  category: 'health' | 'focus' | 'mind' | 'consistency';
  title_th: string;
  title_en: string;
  condition: QuestCondition;
  reward_xp: number;
  tags?: string[];
  isCustom?: boolean;
  isActive?: boolean;
}

export interface QuestInstance {
  id: number;
  templateId: string;
  template: QuestTemplate;
  periodKey: string; // YYYY-MM-DD for daily, weekStart for weekly, 'milestone' for milestone
  progress: number;
  target: number;
  status: QuestStatus;
  completedAt?: number | null;
}

export interface TrainingPlanDay {
  weekday: number; // 1..7 (Mon..Sun)
  dayType: TrainingDayType;
  note?: string;
}

export interface JournalEntry {
  id: number;
  entryDate: string; // YYYY-MM-DD
  title: string;
  body: string;
  category: string;
  createdAt: number;
  updatedAt: number;
  xpAwarded: number;
}

export interface MoodEntry {
  id: number;
  moodLevel: number; // 1..7
  note: string;
  tags: string[];
  occurredAt: number;
  dayKey: string;
  xpAwarded: number;
}

export interface AchievementDef {
  id: string;
  category: string;
  icon: string;
  title_th: string;
  title_en: string;
  description_th: string;
  description_en: string;
  metric: string;
  target: number;
}

export interface AchievementUnlock {
  achievementId: string;
  unlockedAt: number;
}

export interface StreakLogEntry {
  day: string; // YYYY-MM-DD
  status: StreakDayStatus;
}

export interface LevelState {
  level: number;
  xpInLevel: number;
  xpToNext: number;
  progress: number; // 0..1
  totalXp: number;
}

export interface RankDef {
  id: string;
  name: string;
  title_th: string;
  title_en: string;
  min_level: number;
  max_level: number;
  min_total_xp: number;
  color: string;
  requires_special?: {
    min_active_days: number;
    min_badge_categories: number;
  };
}

export interface CelebrationEvent {
  id: string;
  tier: 1 | 2 | 3 | 4; // 1: Quest/XP, 2: Level Up, 3: Rank Up, 4: Milestone/Badge
  title: string;
  subtitle: string;
  xpGained?: number;
  newLevel?: number;
  newRank?: RankDef;
  badge?: AchievementDef;
}
