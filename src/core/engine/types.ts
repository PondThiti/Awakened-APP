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

// Onboarding Questionnaire v0.2 Types
export type AgeBand =
  | 'under_13'
  | '13-15'
  | '16-17'
  | '18-24'
  | '25-34'
  | '35-44'
  | '45-54'
  | '55-64'
  | '65+';

export type GenderOption = 'male' | 'female' | 'other' | 'undisclosed';
export type AwakeningPath = 'strength' | 'discipline' | 'full';
export type DailyFeeling = 'uneasy' | 'neutral' | 'satisfied';
export type BossId = 'fading_fire' | 'self_defeat' | 'no_direction' | 'drained' | 'no_time';
export type FutureFeel = 'regret' | 'loop' | 'start_now';
export type FutureSelfId = 'strong_energetic' | 'calm_controlled' | 'confident' | 'role_model';
export type EquipmentOption = 'bodyweight' | 'home_gym' | 'full_gym' | 'outdoor';
export type BestTimeOption = 'morning' | 'noon' | 'evening' | 'night' | 'varies';
export type SafetyFlag =
  | 'none'
  | 'past_injury'
  | 'injured_now'
  | 'medical_limit'
  | 'pregnancy'
  | 'unsure'
  | 'undisclosed';

export type ActivityPreference =
  | 'walk'
  | 'run'
  | 'bodyweight'
  | 'weights'
  | 'yoga_stretch'
  | 'bike'
  | 'swim'
  | 'dance'
  | 'sport_martial'
  | 'unsure';

export type DisciplinePickId =
  | 'no_snooze'
  | 'water_goal'
  | 'no_social_30m'
  | 'read_learn_15m'
  | 'cold_shower'
  | 'reduce_sugar_fried'
  | 'meditate_3m'
  | 'journal_short'
  | 'sleep_on_time';

export type NarratorTone = 'gentle' | 'friend' | 'coach' | 'adventurer';
export type StarterClassId = 'warrior' | 'monk' | 'ranger' | 'scholar' | 'awakened';
export type PlayerStatKey = 'STR' | 'VIT' | 'INT' | 'WIL';
export type QuestSlot = 'body' | 'mind' | 'foundation' | 'bonus';

export interface PlayerStats {
  STR: number;
  VIT: number;
  INT: number;
  WIL: number;
}

export interface OnboardingProfile {
  id: 1;
  nickname: string;
  ageBand: AgeBand;
  gender: GenderOption;
  path: AwakeningPath;
  feeling: DailyFeeling | null;
  bosses: BossId[];
  futureFeel: FutureFeel | null;
  vow: string;
  futureSelf: FutureSelfId | null;
  freqBand: 0 | 1 | 2 | 3;
  pushupBand: 0 | 1 | 2 | 3 | null;
  equipment: EquipmentOption;
  minutesPerDay: 10 | 15 | 30 | 60;
  bestTime: BestTimeOption;
  safetyFlags: SafetyFlag[];
  energy: 1 | 2 | 3 | 4 | 5;
  bedtime: string;
  wakeTime: string;
  activities: ActivityPreference[];
  disciplinePicks: DisciplinePickId[];
  waterGoalMl: number;
  narrator: NarratorTone;
  startTier: 1 | 2 | 3 | 4;
  starterClass: StarterClassId;
  quickWinsUntil: number | null;
  pledgedAt: number | null;
  completed: boolean;
  currentStepIndex: number;
  lastComebackBonusAt: number | null;
  version: number;
  updatedAt: number;
}

/** Local notification preferences (reminders shown in the phone's notification shade). */
export interface NotificationSettings {
  /** Master switch – only true after the user explicitly allowed notifications. */
  enabled: boolean;
  /** True once the app has asked the user for permission (so we never nag). */
  permissionAsked: boolean;
  morningReminderEnabled: boolean;
  morningReminderTime: string; // 'HH:MM'
  eveningReminderEnabled: boolean;
  eveningReminderTime: string; // 'HH:MM'
}

/** Daily-mission alarm clock settings. */
export interface AlarmSettings {
  enabled: boolean;
  time: string; // 'HH:MM'
  days: number[]; // ISO weekdays 1 (Mon) .. 7 (Sun); empty = every day
}

export interface UserProfile {
  id: 1;
  displayName: string;
  /** file:// URI of the user's profile picture (square JPEG saved inside app storage). */
  avatarUri?: string | null;
  notifications?: NotificationSettings;
  alarm?: AlarmSettings;
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
  muteAchievementAlerts?: boolean;
  selectedTitleId?: string | null;
  featuredBadgeIds?: string[];
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
  sourceType: 'activity' | 'quest' | 'milestone' | 'achievement' | 'bonus' | 'revert';
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
  slot?: QuestSlot;
  stat?: PlayerStatKey | PlayerStatKey[];
  title_th: string;
  title_en: string;
  condition: QuestCondition;
  reward_xp: number;
  tags?: string[];
  tier?: number[];
  duration_min?: [number, number];
  micro?: boolean;
  comeback?: boolean;
  requires?: {
    equipment_any?: EquipmentOption[];
  };
  excludes?: {
    safety_flags?: SafetyFlag[];
    age_band?: AgeBand[];
  };
  boosts?: {
    bosses?: BossId[];
    path?: AwakeningPath[];
    discipline_picks?: DisciplinePickId[];
    activities?: ActivityPreference[];
  };
  warning_th?: string;
  warning_en?: string;
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
  /** Hidden workout-penalty multiplier (> 1 when the previous workout day was skipped). */
  penaltyMultiplier?: number;
  /** Hidden minimum workout minutes required to finish a penalized count-based body quest. */
  minWorkoutMin?: number;
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

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'legend';

export type AchievementCategory =
  | 'first'
  | 'train'
  | 'life'
  | 'focus'
  | 'will'
  | 'mind'
  | 'food'
  | 'rank'
  | 'quest'
  | 'stat'
  | 'app'
  | 'secret';

export interface AchievementCriteria {
  metric: string;
  op: '>=' | '==';
  target: number | string;
}

export interface AchievementDef {
  id: string;
  category: AchievementCategory | string;
  title_th: string;
  title_en: string;
  description: string;
  tier: AchievementTier;
  xp: number;
  stat: PlayerStatKey | null;
  hidden: boolean;
  phase: 1 | 2 | 3;
  criteria: AchievementCriteria;
  hide_for_minor: boolean;
  excluded_flags: SafetyFlag[];
  // Optional legacy fields for backward compatibility
  icon?: string;
  description_th?: string;
  description_en?: string;
  metric?: string;
  target?: number;
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
  additionalBadges?: AchievementDef[];
  extraUnlockedCount?: number;
  summaryText?: string;
}
