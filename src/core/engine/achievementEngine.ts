import achievementsJson from '../../../assets/config/achievements.json';
import { computeLevelState } from './levelEngine';
import { isMinorAgeBand } from './onboardingEngine';
import { getRankForLevel } from './rankEngine';
import {
  AchievementCategory,
  AchievementDef,
  AchievementTier,
  ActivityRecord,
  AgeBand,
  BossId,
  CelebrationEvent,
  JournalEntry,
  LanguageCode,
  MoodEntry,
  PlayerStats,
  QuestInstance,
  SafetyFlag,
  StreakDayStatus,
  TrainingPlanDay,
} from './types';
import { getLocalDayKey, getWeekStartDayKey } from '../utils/dateUtils';

/**
 * Daily counting caps per Rule R5 in Awakened-Achievements.md:
 * Prevents unrealistic numbers and overtraining pressure.
 */
export const ACHIEVEMENT_DAILY_CAPS = {
  pushup_reps: 300,
  squat_reps: 500,
  plank_minutes: 30,
  distance_km: 100,
  workout_minutes: 180,
  water_logs: 5,
  pomodoro_rounds: 8,
} as const;

export const TIER_PRIORITY: Record<AchievementTier, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
  legend: 4,
};

export const TIER_METADATA: Record<
  AchievementTier,
  {
    xp: number;
    color: string;
    badgeEmoji: string;
    label_th: string;
    label_en: string;
    perk_th: string;
    perk_en: string;
  }
> = {
  bronze: {
    xp: achievementsJson.tier_xp?.bronze ?? 25,
    color: '#D97706',
    badgeEmoji: '🥉',
    label_th: 'ทองแดง',
    label_en: 'Bronze',
    perk_th: 'ตราในห้องถ้วยรางวัล',
    perk_en: 'Trophy Room Emblem',
  },
  silver: {
    xp: achievementsJson.tier_xp?.silver ?? 75,
    color: '#94A3B8',
    badgeEmoji: '🥈',
    label_th: 'เงิน',
    label_en: 'Silver',
    perk_th: 'ตรา + เลือกแสดงบนโปรไฟล์ได้',
    perk_en: 'Emblem + Profile Showcase',
  },
  gold: {
    xp: achievementsJson.tier_xp?.gold ?? 200,
    color: '#F59E0B',
    badgeEmoji: '🥇',
    label_th: 'ทอง',
    label_en: 'Gold',
    perk_th: 'ตรา + ปลดล็อกสีธีมหนึ่งชุด',
    perk_en: 'Emblem + Theme Accent',
  },
  legend: {
    xp: achievementsJson.tier_xp?.legend ?? 500,
    color: '#38BDF8',
    badgeEmoji: '💎',
    label_th: 'ตำนาน',
    label_en: 'Legend',
    perk_th: 'ตรา + กรอบโปรไฟล์ + ฉายาพิเศษ',
    perk_en: 'Emblem + Profile Frame + Special Title',
  },
};

export interface CategoryMeta {
  id: AchievementCategory;
  name_th: string;
  name_en: string;
  title_th: string; // Section 5 Category Completion Title
  title_en: string;
}

/**
 * 12 Categories and their completion titles from Section 1 & Section 5 of Awakened-Achievements.md
 */
export const ACHIEVEMENT_CATEGORIES: ReadonlyArray<CategoryMeta> = [
  {
    id: 'first',
    name_th: 'เริ่มต้น',
    name_en: 'First Steps',
    title_th: 'นักเดินทางผู้เริ่มต้น',
    title_en: 'The Beginner',
  },
  {
    id: 'train',
    name_th: 'ร่างกายและการฝึก',
    name_en: 'Body & Training',
    title_th: 'นักรบเหล็ก',
    title_en: 'Iron Warrior',
  },
  {
    id: 'life',
    name_th: 'พื้นฐานชีวิตและการพัก',
    name_en: 'Life & Rest',
    title_th: 'ผู้ดูแลตัวเอง',
    title_en: 'Self-Keeper',
  },
  {
    id: 'focus',
    name_th: 'โฟกัสและการเรียนรู้',
    name_en: 'Focus & Learning',
    title_th: 'จอมสมาธิ',
    title_en: 'Focus Master',
  },
  {
    id: 'will',
    name_th: 'วินัยและความต่อเนื่อง',
    name_en: 'Discipline & Streak',
    title_th: 'ผู้มีวินัยเหล็ก',
    title_en: 'Iron Discipline',
  },
  {
    id: 'mind',
    name_th: 'ไดอารี่และใจตัวเอง',
    name_en: 'Journal & Mind',
    title_th: 'ผู้รู้ใจตัวเอง',
    title_en: 'Self-Aware',
  },
  {
    id: 'food',
    name_th: 'บันทึกอาหาร',
    name_en: 'Food Logging',
    title_th: 'นักจดมื้ออาหาร',
    title_en: 'The Recorder',
  },
  {
    id: 'rank',
    name_th: 'เลเวลและแรงค์',
    name_en: 'Level & Rank',
    title_th: 'ผู้พิชิตแรงค์',
    title_en: 'Rank Conqueror',
  },
  {
    id: 'quest',
    name_th: 'เควสต์',
    name_en: 'Quests',
    title_th: 'นักผจญภัยตัวจริง',
    title_en: 'True Adventurer',
  },
  {
    id: 'stat',
    name_th: 'ค่าสถานะ',
    name_en: 'Player Stats',
    title_th: 'ผู้สมดุล',
    title_en: 'The Balanced',
  },
  {
    id: 'app',
    name_th: 'รู้จักแอป',
    name_en: 'Know the App',
    title_th: 'ผู้รู้จักบ้านตัวเอง',
    title_en: 'Home Keeper',
  },
  {
    id: 'secret',
    name_th: 'หมุดหมายยาว ๆ และของลับ',
    name_en: 'Milestones & Secrets',
    title_th: 'ผู้ค้นพบ',
    title_en: 'The Finder',
  },
];

const RANK_ORDER: Record<string, number> = {
  E: 0,
  D: 1,
  C: 2,
  B: 3,
  A: 4,
  S: 5,
  SS: 6,
  M: 7,
  Monarch: 7,
};

export function getAchievementCatalog(): AchievementDef[] {
  return achievementsJson.achievements as unknown as AchievementDef[];
}

/**
 * Rule R9: Standard exercise matching (only standard catalog exercises count, not arbitrary free-text).
 */
export function classifyStandardExercise(
  exerciseName: string
): 'pushup' | 'squat' | 'plank_sec' | 'plank_min' | 'situp' | 'lunges' | 'pullup' | 'burpee' | null {
  const norm = exerciseName.trim().toLowerCase();
  if (norm === 'push-up' || norm === 'pushup' || norm === 'วิดพื้น') return 'pushup';
  if (norm === 'squat' || norm === 'squats' || norm === 'สควอต') return 'squat';
  if (norm === 'plank (sec)' || norm === 'plank_sec') return 'plank_sec';
  if (norm === 'plank' || norm === 'plank (min)' || norm === 'plank_min' || norm === 'แพลงก์')
    return 'plank_min';
  if (norm === 'sit-up' || norm === 'situp') return 'situp';
  if (norm === 'lunges' || norm === 'lunge') return 'lunges';
  if (norm === 'pull-up' || norm === 'pullup') return 'pullup';
  if (norm === 'burpee' || norm === 'burpees') return 'burpee';
  return null;
}

/**
 * Rules R8 & R11: Checks whether an achievement is visible/eligible for the user's ageBand and safetyFlags.
 */
export function isAchievementVisibleForUser(
  ach: AchievementDef,
  ageBand: AgeBand = '25-34',
  safetyFlags: SafetyFlag[] = ['none'],
  disabledOptions: string[] = []
): boolean {
  // Rule R8: Hide late-night/early-morning achievements for minors (< 18)
  if (ach.hide_for_minor && isMinorAgeBand(ageBand)) {
    return false;
  }

  // Rule R8 & R11: Hide achievements excluded by user's safety flags (e.g. cold shower when medical_limit/pregnancy/injured_now)
  const excluded = ach.excluded_flags ?? [];
  if (excluded.length > 0 && safetyFlags.some((flag) => excluded.includes(flag))) {
    return false;
  }
  if (
    ach.id.startsWith('cold_') &&
    safetyFlags.some((f) =>
      ['injured_now', 'medical_limit', 'pregnancy', 'unsure'].includes(f)
    )
  ) {
    return false;
  }

  // Rule R11: Hide if user explicitly disabled a feature this achievement requires
  if (disabledOptions.includes('cold_shower') && ach.id.startsWith('cold_')) {
    return false;
  }

  return true;
}

/**
 * Evaluates a single achievement's criteria against the current metrics dictionary.
 */
export function isAchievementCriteriaMet(
  ach: AchievementDef,
  metrics: Record<string, number | string>
): boolean {
  const { metric, op, target } = ach.criteria;
  const val = metrics[metric];

  if (metric === 'rank_reached') {
    const currentRankStr = typeof val === 'string' ? val : 'E';
    const currentOrder = RANK_ORDER[currentRankStr] ?? 0;
    const targetOrder = RANK_ORDER[String(target)] ?? 99;
    return currentOrder >= targetOrder;
  }

  const numVal = typeof val === 'number' ? val : Number(val ?? 0);
  const numTarget = typeof target === 'number' ? target : Number(target ?? 0);
  if (Number.isNaN(numVal) || Number.isNaN(numTarget)) return false;

  if (op === '==') {
    return numVal === numTarget;
  }
  return numVal >= numTarget;
}

/**
 * Computes the numeric progress & target for UI display in the Trophy Room (Section 7).
 */
export function getAchievementProgress(
  ach: AchievementDef,
  metrics: Record<string, number | string>
): { current: number; target: number; percent: number } {
  const { metric, target } = ach.criteria;
  if (metric === 'rank_reached') {
    const currentRankStr = typeof metrics[metric] === 'string' ? (metrics[metric] as string) : 'E';
    const currentOrder = RANK_ORDER[currentRankStr] ?? 0;
    const targetOrder = Math.max(1, RANK_ORDER[String(target)] ?? 1);
    const clamped = Math.min(targetOrder, currentOrder);
    return {
      current: clamped >= targetOrder ? 1 : 0,
      target: 1,
      percent: Math.min(100, Math.round((clamped / targetOrder) * 100)),
    };
  }

  const numTarget = Math.max(1, typeof target === 'number' ? target : Number(target) || 1);
  const rawCurrent = typeof metrics[metric] === 'number' ? (metrics[metric] as number) : Number(metrics[metric] ?? 0);
  const current = Math.min(numTarget, Math.max(0, Math.floor(rawCurrent)));
  const percent = Math.min(100, Math.round((rawCurrent / numTarget) * 100));
  return { current, target: numTarget, percent };
}

/**
 * Dynamic title formatting (e.g., `boss_slayer` adapts to the user's chosen Big Boss per Section 4).
 */
export function getAchievementDisplayTitle(
  ach: AchievementDef,
  lang: LanguageCode,
  bosses: BossId[] = []
): string {
  if (ach.id === 'boss_slayer' && bosses.length > 0) {
    const primaryBoss = bosses[0];
    const bossNamesTh: Record<BossId, string> = {
      fading_fire: 'ล้มบอสไฟมอดไว',
      self_defeat: 'ล้มบอสแพ้ใจตัวเอง',
      no_direction: 'ล้มบอสไร้ทิศทาง',
      drained: 'ล้มบอสหมดพลัง',
      no_time: 'ล้มบอสไม่มีเวลา',
    };
    const bossNamesEn: Record<BossId, string> = {
      fading_fire: 'Fading Fire Slayer',
      self_defeat: 'Self-Defeat Slayer',
      no_direction: 'Chaos Slayer',
      drained: 'Fatigue Slayer',
      no_time: 'Time Boss Slayer',
    };
    return lang === 'th' ? bossNamesTh[primaryBoss] : bossNamesEn[primaryBoss];
  }
  return lang === 'th' ? ach.title_th : ach.title_en;
}

/**
 * Returns a gentle non-spoiler hint for hidden achievements (`hidden: true`) before they are unlocked (Section 7).
 */
export function getSecretHint(ach: AchievementDef, lang: LanguageCode): string {
  const hintsTh: Record<string, string> = {
    swap_10: 'คำใบ้: ลองปรับเปลี่ยนภารกิจประจำวันให้เข้ากับจังหวะชีวิตของคุณ',
    boss_slayer: 'คำใบ้: ยืนหยัดทำเควสต์ต่อกรกับบอสใหญ่ที่คุณเลือกไว้ตอนเริ่มต้น',
    anniversary: 'คำใบ้: กลับมาพบกันในวันครบรอบแห่งการตื่นรู้',
    new_year: 'คำใบ้: เริ่มต้นขยับตัวตั้งแต่วันแรกของศักราชใหม่',
    songkran: 'คำใบ้: เติมความชุ่มฉ่ำในช่วงเทศกาลปีใหม่ไทย',
    midnight: 'คำใบ้: ปิดจ๊อบภารกิจสำเร็จก่อนเข็มนาฬิกาข้ามวันใหม่เพียงเสี้ยวนาที',
    early_bird: 'คำใบ้: พิชิตภารกิจตั้งแต่ฟ้ายังไม่สาง',
    exact_xp: 'คำใบ้: ก้าวข้ามเลเวลด้วยแต้มสะสมที่ลงตัวเป๊ะไร้เศษเหลือ',
    door_open: 'คำใบ้: ประตูบานนี้เปิดต้อนรับการกลับมาเสมอ ไม่ว่าคุณจะพักไปนานแค่ไหน',
  };
  const hintsEn: Record<string, string> = {
    swap_10: 'Hint: Customize your daily quest selection several times.',
    boss_slayer: 'Hint: Keep completing quests that counter your chosen Big Boss.',
    anniversary: 'Hint: Log an activity on the 1-year anniversary of your Awakening.',
    new_year: 'Hint: Make a move on the very first day of the year.',
    songkran: 'Hint: Stay hydrated during the Thai New Year festival (Apr 13–15).',
    midnight: 'Hint: Finish a quest right before the clock strikes midnight.',
    early_bird: 'Hint: Complete a quest before the sun rises.',
    exact_xp: 'Hint: Level up with your remaining XP landing on exactly zero.',
    door_open: 'Hint: The door is always open when you return after a long break.',
  };
  if (lang === 'th') {
    return hintsTh[ach.id] ?? 'คำใบ้: ถ้วยลับที่ซ่อนอยู่ในจังหวะพิเศษของการเดินทาง';
  }
  return hintsEn[ach.id] ?? 'Hint: A secret trophy hidden along your journey.';
}

export interface AchievementMetricsInput {
  activities: ActivityRecord[];
  journals: JournalEntry[];
  moods: MoodEntry[];
  dailyQuestsByDay: Record<string, QuestInstance[]>;
  weeklyQuestsByWeek: Record<string, QuestInstance[]>;
  milestoneQuests: QuestInstance[];
  personalQuestDoneByDay: Record<string, string[]>;
  streakLogs: Record<string, StreakDayStatus>;
  trainingPlan?: TrainingPlanDay[];
  waterGoalMl: number;
  weeklyGoalDays: number;
  weekStartDay?: number;
  longestStreak: number;
  totalActiveDays: number;
  totalXp: number;
  playerStats: PlayerStats;
  ageBand?: AgeBand;
  safetyFlags?: SafetyFlag[];
  pledgedAt?: number | null;
  bosses?: BossId[];
  unlockedIds: Iterable<string>;
  existingCounters?: Record<string, number>;
}

/**
 * Computes all 76 achievement metrics from app state while strictly enforcing:
 * - Rule R1: Monotonic preservation of existing `metric_counter` values (deleting an activity never decreases counters)
 * - Rule R4: Activities backfilled > 24h (`isBackfilled === true`) are ignored
 * - Rule R5: Daily caps on pushups (300), squats (500), plank (30m), distance (100km), workout min (180m), water logs (5), pomodoro rounds (8)
 * - Rule R8: Minor age-band (<18) does not count `event:quest_before_midnight` or `event:quest_before_6am`
 * - Rule R9: Standard exercises only for `reps_pushup_total`, `reps_squat_total`, `plank_minutes_total`
 */
export function computeAchievementMetrics(
  input: AchievementMetricsInput
): Record<string, number | string> {
  const prev = input.existingCounters ?? {};
  const isMinor = isMinorAgeBand(input.ageBand ?? '25-34');
  const bossesSet = new Set(input.bosses ?? []);

  // Rule R4: Exclude soft-deleted and backfilled (>24h) activities
  const validActivities = input.activities.filter((a) => !a.deletedAt && !a.isBackfilled);

  // Per-day buckets for Rule R5 daily caps
  const waterLogsByDay: Record<string, number> = {};
  const waterMlByDay: Record<string, number> = {};
  const workoutMinByDay: Record<string, number> = {};
  const pushupsByDay: Record<string, number> = {};
  const squatsByDay: Record<string, number> = {};
  const plankMinByDay: Record<string, number> = {};
  const distanceKmByDay: Record<string, number> = {};
  const pomoRoundsByDay: Record<string, number> = {};
  const pomoFocusMinByDay: Record<string, number> = {};
  const mealSlotsByDay: Record<string, Set<string>> = {};

  let workoutSessionsTotal = 0;
  let restCheckinsTotal = 0;
  let stretchSessionsTotal = 0;
  let mealLogsTotal = 0;
  let mealPhotosTotal = 0;
  let eventActivityOnJan1 = 0;
  let eventWaterOnSongkran = 0;
  let eventAnniversary = 0;

  const workoutTypesSet = new Set<string>();
  const exerciseHistoryChrono: Record<string, number[]> = {};

  // Sort chronologically for Personal Best (PB) detection
  const sortedActivities = [...validActivities].sort((a, b) => a.occurredAt - b.occurredAt);

  for (const act of sortedActivities) {
    const dk = getLocalDayKey(act.occurredAt, act.tzOffsetMin);
    const mmdd = dk.slice(5); // 'MM-DD'

    if (mmdd === '01-01') {
      eventActivityOnJan1 = 1;
    }
    if (
      input.pledgedAt &&
      act.occurredAt >= input.pledgedAt + 365 * 86400 * 1000
    ) {
      eventAnniversary = 1;
    }

    if (act.type === 'water') {
      const currentDayCount = waterLogsByDay[dk] ?? 0;
      // Rule R5: Cap water logs at 5 per day
      if (currentDayCount < ACHIEVEMENT_DAILY_CAPS.water_logs) {
        waterLogsByDay[dk] = currentDayCount + 1;
        waterMlByDay[dk] = (waterMlByDay[dk] ?? 0) + (act.value || 0);
      }
      if (mmdd === '04-13' || mmdd === '04-14' || mmdd === '04-15') {
        eventWaterOnSongkran = 1;
      }
    } else if (act.type === 'meal') {
      mealLogsTotal += 1;
      if (act.mealDetail?.mealSlot) {
        if (!mealSlotsByDay[dk]) mealSlotsByDay[dk] = new Set();
        mealSlotsByDay[dk].add(act.mealDetail.mealSlot);
      }
      if (act.mealDetail?.photoPath || act.mealDetail?.source === 'scan') {
        mealPhotosTotal += 1;
      }
    } else if (act.type === 'rest') {
      restCheckinsTotal += 1;
    } else if (act.type === 'focus') {
      if (act.focusDetail?.completed !== false) {
        const prevRounds = pomoRoundsByDay[dk] ?? 0;
        // Rule R5: Cap Pomodoro rounds at 8 per day
        if (prevRounds < ACHIEVEMENT_DAILY_CAPS.pomodoro_rounds) {
          pomoRoundsByDay[dk] = prevRounds + 1;
          const focusMin =
            act.value > 0
              ? act.value
              : Math.max(1, Math.round((act.focusDetail?.focusSec ?? 1500) / 60));
          pomoFocusMinByDay[dk] = (pomoFocusMinByDay[dk] ?? 0) + focusMin;
        }
      }
    } else if (act.type === 'workout') {
      workoutSessionsTotal += 1;
      const wType = act.workoutDetail?.workoutType ?? 'other';
      workoutTypesSet.add(`type:${wType}`);
      if (wType === 'stretch') {
        stretchSessionsTotal += 1;
      }

      const durMin =
        act.value > 0
          ? act.value
          : Math.max(1, Math.round((act.workoutDetail?.durationSec ?? 60) / 60));
      workoutMinByDay[dk] = Math.min(
        ACHIEVEMENT_DAILY_CAPS.workout_minutes,
        (workoutMinByDay[dk] ?? 0) + durMin
      );

      // Distance km (if recorded in distanceM or walk/run/bike)
      const distKm = act.workoutDetail?.distanceM
        ? act.workoutDetail.distanceM / 1000
        : 0;
      if (distKm > 0) {
        distanceKmByDay[dk] = Math.min(
          ACHIEVEMENT_DAILY_CAPS.distance_km,
          (distanceKmByDay[dk] ?? 0) + distKm
        );
        const key = `dist:${wType}`;
        if (!exerciseHistoryChrono[key]) exerciseHistoryChrono[key] = [];
        exerciseHistoryChrono[key].push(distKm);
      }

      // Sets & Standard Exercises (Rule R9)
      const sets = act.workoutDetail?.sets ?? [];
      const sessionRepsByEx: Record<string, number> = {};
      for (const s of sets) {
        const std = classifyStandardExercise(s.exerciseName);
        if (!std) continue;
        workoutTypesSet.add(`ex:${std}`);
        sessionRepsByEx[std] = (sessionRepsByEx[std] ?? 0) + (s.reps || 0);

        if (std === 'pushup') {
          pushupsByDay[dk] = Math.min(
            ACHIEVEMENT_DAILY_CAPS.pushup_reps,
            (pushupsByDay[dk] ?? 0) + (s.reps || 0)
          );
        } else if (std === 'squat') {
          squatsByDay[dk] = Math.min(
            ACHIEVEMENT_DAILY_CAPS.squat_reps,
            (squatsByDay[dk] ?? 0) + (s.reps || 0)
          );
        } else if (std === 'plank_sec') {
          const mins = (s.reps || 0) / 60;
          plankMinByDay[dk] = Math.min(
            ACHIEVEMENT_DAILY_CAPS.plank_minutes,
            (plankMinByDay[dk] ?? 0) + mins
          );
        } else if (std === 'plank_min') {
          plankMinByDay[dk] = Math.min(
            ACHIEVEMENT_DAILY_CAPS.plank_minutes,
            (plankMinByDay[dk] ?? 0) + (s.reps || 0)
          );
        }
      }

      for (const [exKey, totalRepsInSession] of Object.entries(sessionRepsByEx)) {
        const key = `reps:${exKey}`;
        if (!exerciseHistoryChrono[key]) exerciseHistoryChrono[key] = [];
        exerciseHistoryChrono[key].push(totalRepsInSession);
      }
    }
  }

  // Personal Best (PB) count: needs at least 3 prior sessions of the same exercise/activity and exceeds previous max by >= 1 unit
  let computedPbCount = 0;
  for (const series of Object.values(exerciseHistoryChrono)) {
    if (series.length < 4) continue;
    let maxSoFar = Math.max(series[0], series[1], series[2]);
    for (let i = 3; i < series.length; i++) {
      if (series[i] >= maxSoFar + 1) {
        computedPbCount += 1;
        maxSoFar = series[i];
      } else if (series[i] > maxSoFar) {
        maxSoFar = series[i];
      }
    }
  }

  // Check Jan 1 for journals and moods as well
  for (const j of input.journals) {
    if (j.entryDate.slice(5) === '01-01') eventActivityOnJan1 = 1;
  }
  for (const m of input.moods) {
    if (m.dayKey.slice(5) === '01-01') eventActivityOnJan1 = 1;
  }

  const totalWaterLogsCapped = Object.values(waterLogsByDay).reduce((s, v) => s + v, 0);
  const waterGoalDaysTotal = Object.values(waterMlByDay).filter(
    (ml) => ml >= Math.max(500, input.waterGoalMl)
  ).length;
  const workoutMinutesTotal = Object.values(workoutMinByDay).reduce((s, v) => s + v, 0);
  const repsPushupTotal = Object.values(pushupsByDay).reduce((s, v) => s + v, 0);
  const repsSquatTotal = Object.values(squatsByDay).reduce((s, v) => s + v, 0);
  const plankMinutesTotal = Math.floor(
    Object.values(plankMinByDay).reduce((s, v) => s + v, 0)
  );
  const distanceKmTotal =
    Math.round(Object.values(distanceKmByDay).reduce((s, v) => s + v, 0) * 100) / 100;

  const pomodoroRoundsTotal = Object.values(pomoRoundsByDay).reduce((s, v) => s + v, 0);
  const focusMinutesTotal = Object.values(pomoFocusMinByDay).reduce((s, v) => s + v, 0);
  const pomodoroRoundsDayMax = Math.min(
    ACHIEVEMENT_DAILY_CAPS.pomodoro_rounds,
    Object.values(pomoRoundsByDay).reduce((max, v) => Math.max(max, v), 0)
  );

  const fullMealDaysTotal = Object.values(mealSlotsByDay).filter(
    (slots) => slots.has('breakfast') && slots.has('lunch') && slots.has('dinner')
  ).length;

  // Journal & Mood metrics
  const journalEntriesTotal = input.journals.length;
  const journalEntryCharsMax = input.journals.reduce(
    (max, j) => Math.max(max, j.body.trim().length),
    0
  );
  const journalDaysByMonth: Record<string, Set<string>> = {};
  for (const j of input.journals) {
    const ym = j.entryDate.slice(0, 7); // 'YYYY-MM'
    if (!journalDaysByMonth[ym]) journalDaysByMonth[ym] = new Set();
    journalDaysByMonth[ym].add(j.entryDate);
  }
  let journalFullMonth = 0;
  for (const [ym, daysSet] of Object.entries(journalDaysByMonth)) {
    const [yrStr, moStr] = ym.split('-');
    const daysInMonth = new Date(Number(yrStr), Number(moStr), 0).getDate() || 30;
    if (daysSet.size >= daysInMonth) {
      journalFullMonth = 1;
      break;
    }
  }

  const moodLogsTotal = input.moods.length;
  const moodsDistinct = new Set(input.moods.map((m) => m.moodLevel)).size;

  // Quest metrics
  let dailyQuestsDone = 0;
  let allDailyDaysTotal = 0;
  let sleepOntimeDays = 0;
  let learningDays = 0;
  let noSnoozeDays = 0;
  let screenFreeDays = 0;
  let coldShowerDays = 0;
  let comebackCount = 0;
  let bossQuestsTotal = 0;
  let eventQuestBeforeMidnight = 0;
  let eventQuestBefore6am = 0;

  for (const [, qList] of Object.entries(input.dailyQuestsByDay)) {
    if (qList.length > 0 && qList.every((q) => q.status === 'completed')) {
      allDailyDaysTotal += 1;
    }
    for (const q of qList) {
      if (q.status !== 'completed') continue;
      dailyQuestsDone += 1;

      const tplId = q.templateId.toLowerCase();
      const picks = q.template.boosts?.discipline_picks ?? [];
      if (tplId.includes('sleep') || picks.includes('sleep_on_time')) {
        sleepOntimeDays += 1;
      }
      if (tplId.includes('read') || tplId.includes('learn') || picks.includes('read_learn_15m')) {
        learningDays += 1;
      }
      if (tplId.includes('snooze') || picks.includes('no_snooze')) {
        noSnoozeDays += 1;
      }
      if (tplId.includes('social') || tplId.includes('screen') || picks.includes('no_social_30m')) {
        screenFreeDays += 1;
      }
      if (tplId.includes('cold') || picks.includes('cold_shower')) {
        coldShowerDays += 1;
      }
      if (q.template.comeback) {
        comebackCount += 1;
      }
      if (
        q.template.boosts?.bosses?.some((b) => bossesSet.has(b))
      ) {
        bossQuestsTotal += 1;
      }

      if (q.completedAt && !isMinor) {
        const dt = new Date(q.completedAt);
        const hr = dt.getHours();
        const mn = dt.getMinutes();
        if (hr === 23 && mn >= 55) {
          eventQuestBeforeMidnight = 1;
        }
        if (hr < 6) {
          eventQuestBefore6am = 1;
        }
      }
    }
  }

  let weeklyQuestsDone = 0;
  for (const [, wList] of Object.entries(input.weeklyQuestsByWeek)) {
    for (const q of wList) {
      if (q.status === 'completed') weeklyQuestsDone += 1;
    }
  }

  const milestoneQuestsDone = input.milestoneQuests.filter(
    (q) => q.status === 'completed'
  ).length;

  let personalQuestsCompleted = 0;
  for (const doneIds of Object.values(input.personalQuestDoneByDay)) {
    personalQuestsCompleted += doneIds.length;
  }

  const questsTotal =
    dailyQuestsDone + weeklyQuestsDone + milestoneQuestsDone + personalQuestsCompleted;

  // Weekly consistency weeks & training plan weeks from streakLogs
  const activeDaysByWeek: Record<string, number> = {};
  for (const [dayKey, status] of Object.entries(input.streakLogs)) {
    if (status === 'active' || status === 'rest' || status === 'frozen') {
      const wk = getWeekStartDayKey(dayKey, input.weekStartDay ?? 1);
      activeDaysByWeek[wk] = (activeDaysByWeek[wk] ?? 0) + 1;
    }
  }
  const weeklyGoalWeeksTotal = Object.values(activeDaysByWeek).filter(
    (cnt) => cnt >= Math.max(1, input.weeklyGoalDays)
  ).length;
  const planWeeksCompleted = Object.values(activeDaysByWeek).filter(
    (cnt) => cnt >= 7
  ).length;

  // Level & Rank & Meta
  const levelState = computeLevelState(input.totalXp);
  const catalog = getAchievementCatalog();
  const unlockedList = Array.from(input.unlockedIds);
  const nonMetaUnlockedCount = unlockedList.filter((id) => !id.startsWith('meta_')).length;
  const unlockedCategoriesCount = new Set(
    unlockedList
      .map((id) => catalog.find((a) => a.id === id)?.category)
      .filter(Boolean)
  ).size;

  const rankInfo = getRankForLevel(levelState.level, {
    totalActiveDays: Math.max(input.totalActiveDays, prev.active_days_total ?? 0),
    unlockedBadgeCategoriesCount: unlockedCategoriesCount,
  });

  const statSTR = input.playerStats?.STR ?? 10;
  const statVIT = input.playerStats?.VIT ?? 10;
  const statINT = input.playerStats?.INT ?? 10;
  const statWIL = input.playerStats?.WIL ?? 10;
  const statMinAll = Math.min(statSTR, statVIT, statINT, statWIL);

  const rawNumeric: Record<string, number> = {
    'event:pledge': input.pledgedAt ? 1 : 0,
    'event:water_log': totalWaterLogsCapped > 0 ? 1 : 0,
    'event:meal_log': mealLogsTotal > 0 ? 1 : 0,
    'event:workout': workoutSessionsTotal > 0 ? 1 : 0,
    'event:pomodoro': pomodoroRoundsTotal > 0 ? 1 : 0,
    'event:journal': journalEntriesTotal > 0 ? 1 : 0,
    'event:mood': moodLogsTotal > 0 ? 1 : 0,
    'event:quest_done': questsTotal > 0 ? 1 : 0,
    'event:levelup': levelState.level >= 2 ? 1 : 0,
    'event:rest_checkin': restCheckinsTotal > 0 ? 1 : 0,
    'event:personal_quest_created': 0,
    active_days_total: input.totalActiveDays,
    workout_sessions_total: workoutSessionsTotal,
    workout_minutes_total: workoutMinutesTotal,
    reps_pushup_total: repsPushupTotal,
    reps_squat_total: repsSquatTotal,
    plank_minutes_total: plankMinutesTotal,
    distance_km_total: distanceKmTotal,
    workout_types_tried: workoutTypesSet.size,
    pb_count: computedPbCount,
    plan_weeks_completed: planWeeksCompleted,
    water_goal_days_total: waterGoalDaysTotal,
    sleep_ontime_days_total: sleepOntimeDays,
    rest_checkins_total: restCheckinsTotal,
    stretch_sessions_total: stretchSessionsTotal,
    pomodoro_rounds_total: pomodoroRoundsTotal,
    focus_minutes_total: focusMinutesTotal,
    pomodoro_rounds_day_max: pomodoroRoundsDayMax,
    learning_days_total: learningDays,
    all_daily_days_total: allDailyDaysTotal,
    streak_days_max: input.longestStreak,
    weekly_goal_weeks_total: weeklyGoalWeeksTotal,
    no_snooze_days_total: noSnoozeDays,
    screen_free_days_total: screenFreeDays,
    cold_shower_days_total: coldShowerDays,
    comeback_count: comebackCount,
    journal_entries_total: journalEntriesTotal,
    mood_logs_total: moodLogsTotal,
    journal_entry_chars_max: journalEntryCharsMax,
    recap_viewed_total: 0,
    journal_full_month: journalFullMonth,
    moods_distinct: moodsDistinct,
    meal_logs_total: mealLogsTotal,
    full_meal_days_total: fullMealDaysTotal,
    scan_corrections_total: 0,
    meal_photos_total: mealPhotosTotal,
    level_reached: levelState.level,
    quests_total: questsTotal,
    weekly_quests_total: weeklyQuestsDone,
    milestone_quests_total: milestoneQuestsDone,
    personal_quests_completed: personalQuestsCompleted,
    quest_swaps_total: 0,
    stat_STR: statSTR,
    stat_VIT: statVIT,
    stat_INT: statINT,
    stat_WIL: statWIL,
    stat_min_all: statMinAll,
    'event:dashboard_customized': 0,
    'event:export_done': 0,
    'event:applock_set': 0,
    'event:narrator_changed': 0,
    'event:widget_added': 0,
    tabs_visited: 1,
    'event:difficulty_adjusted': 0,
    'event:credits_viewed': 0,
    boss_quests_total: bossQuestsTotal,
    'event:vow_reviewed': 0,
    'event:anniversary_activity': eventAnniversary,
    'event:activity_on_jan1': eventActivityOnJan1,
    'event:water_on_songkran': eventWaterOnSongkran,
    'event:quest_before_midnight': eventQuestBeforeMidnight,
    'event:quest_before_6am': eventQuestBefore6am,
    'event:levelup_exact': levelState.level > 1 && levelState.xpInLevel === 0 ? 1 : 0,
    'event:return_after_30d': 0,
    achievements_unlocked_total: nonMetaUnlockedCount,
  };

  // Merge monotonically with existingCounters per Rule R1
  const merged: Record<string, number | string> = {};
  for (const [k, v] of Object.entries(rawNumeric)) {
    if (isMinor && (k === 'event:quest_before_midnight' || k === 'event:quest_before_6am')) {
      merged[k] = 0;
    } else {
      merged[k] = Math.max(v, prev[k] ?? 0);
    }
  }
  for (const [k, v] of Object.entries(prev)) {
    if (!(k in merged)) {
      merged[k] = v;
    }
  }

  merged.rank_reached = rankInfo.currentRank.id;
  return merged;
}

export interface CheckAchievementsInput {
  metrics: Record<string, number | string>;
  unlockedIds: Iterable<string>;
  totalXp: number;
  ageBand?: AgeBand;
  safetyFlags?: SafetyFlag[];
  disabledOptions?: string[];
  changedMetrics?: Iterable<string>; // Optional subset of changed metrics; if omitted, checks all metrics
  catalog?: AchievementDef[];
}

export interface CheckAchievementsResult {
  newlyUnlocked: AchievementDef[];
  xpGainedFromAchievements: number;
  finalTotalXp: number;
  finalLevel: number;
  finalRankId: string;
  updatedMetrics: Record<string, number | string>;
  roundsExecuted: number;
}

/**
 * Pure Achievement Evaluation Engine (Section 6.3 of Awakened-Achievements.md):
 * Evaluates candidate achievements in up to 5 cascading rounds.
 * If unlocking an achievement grants XP that triggers a Level Up, Rank Up, or Meta Collector threshold,
 * subsequent rounds automatically catch and unlock those follow-up achievements!
 */
export function evaluateAchievements(
  input: CheckAchievementsInput
): CheckAchievementsResult {
  const catalog = input.catalog ?? getAchievementCatalog();
  const ageBand = input.ageBand ?? '25-34';
  const safetyFlags = input.safetyFlags ?? ['none'];
  const disabledOptions = input.disabledOptions ?? [];
  const isMinor = isMinorAgeBand(ageBand);

  const unlockedSet = new Set<string>(input.unlockedIds);
  const workingMetrics: Record<string, number | string> = { ...input.metrics };

  // Enforce Rule R8 for minors on late/early metrics
  if (isMinor) {
    workingMetrics['event:quest_before_midnight'] = 0;
    workingMetrics['event:quest_before_6am'] = 0;
  }

  let workingTotalXp = input.totalXp;
  let xpGainedTotal = 0;
  const newlyUnlocked: AchievementDef[] = [];

  let activeChangedSet: Set<string> | null = input.changedMetrics
    ? new Set(input.changedMetrics)
    : null;

  let roundsExecuted = 0;

  for (let round = 0; round < 5; round++) {
    // Sync level, rank, and non-meta achievement count into workingMetrics before checking
    const lvlState = computeLevelState(workingTotalXp);
    const nonMetaCount = Array.from(unlockedSet).filter(
      (id) => !id.startsWith('meta_')
    ).length;
    const unlockedCatsCount = new Set(
      Array.from(unlockedSet)
        .map((id) => catalog.find((a) => a.id === id)?.category)
        .filter(Boolean)
    ).size;
    const rnkInfo = getRankForLevel(lvlState.level, {
      totalActiveDays: Number(workingMetrics.active_days_total ?? 0),
      unlockedBadgeCategoriesCount: unlockedCatsCount,
    });

    workingMetrics.level_reached = Math.max(
      Number(workingMetrics.level_reached ?? 1),
      lvlState.level
    );
    if (lvlState.level >= 2) {
      workingMetrics['event:levelup'] = 1;
    }
    if (lvlState.level > 1 && lvlState.xpInLevel === 0) {
      workingMetrics['event:levelup_exact'] = 1;
    }
    workingMetrics.rank_reached = rnkInfo.currentRank.id;
    workingMetrics.achievements_unlocked_total = nonMetaCount;

    const roundCandidates = catalog.filter((ach) => {
      if (unlockedSet.has(ach.id)) return false;
      if (activeChangedSet && !activeChangedSet.has(ach.criteria.metric)) {
        return false;
      }
      if (!isAchievementVisibleForUser(ach, ageBand, safetyFlags, disabledOptions)) {
        return false;
      }
      return isAchievementCriteriaMet(ach, workingMetrics);
    });

    if (roundCandidates.length === 0) {
      break;
    }

    roundsExecuted = round + 1;
    for (const ach of roundCandidates) {
      unlockedSet.add(ach.id);
      newlyUnlocked.push(ach);
      const rewardXp = ach.xp ?? TIER_METADATA[ach.tier]?.xp ?? 25;
      workingTotalXp += rewardXp;
      xpGainedTotal += rewardXp;
    }

    // Next cascade round checks metrics affected by unlocking achievements & gaining XP
    activeChangedSet = new Set([
      'level_reached',
      'event:levelup',
      'event:levelup_exact',
      'rank_reached',
      'achievements_unlocked_total',
    ]);
  }

  const finalLvl = computeLevelState(workingTotalXp);
  const finalCats = new Set(
    Array.from(unlockedSet)
      .map((id) => catalog.find((a) => a.id === id)?.category)
      .filter(Boolean)
  ).size;
  const finalRank = getRankForLevel(finalLvl.level, {
    totalActiveDays: Number(workingMetrics.active_days_total ?? 0),
    unlockedBadgeCategoriesCount: finalCats,
  });

  workingMetrics.level_reached = Math.max(
    Number(workingMetrics.level_reached ?? 1),
    finalLvl.level
  );
  workingMetrics.rank_reached = finalRank.currentRank.id;
  workingMetrics.achievements_unlocked_total = Array.from(unlockedSet).filter(
    (id) => !id.startsWith('meta_')
  ).length;

  return {
    newlyUnlocked,
    xpGainedFromAchievements: xpGainedTotal,
    finalTotalXp: workingTotalXp,
    finalLevel: finalLvl.level,
    finalRankId: finalRank.currentRank.id,
    updatedMetrics: workingMetrics,
    roundsExecuted,
  };
}

/**
 * Section 3 & Section 6.4 (Test Case 8):
 * Merges multiple simultaneously unlocked achievements into a single CelebrationEvent
 * showcasing the highest-tier achievement first, plus a summary of the remaining unlocked achievements ("ปลดล็อกอีก X ใบ").
 */
export function buildMergedAchievementCelebration(
  unlocked: AchievementDef[],
  lang: LanguageCode = 'th',
  bosses: BossId[] = [],
  nowMs: number = Date.now()
): CelebrationEvent | null {
  if (unlocked.length === 0) return null;

  const sorted = [...unlocked].sort(
    (a, b) => (TIER_PRIORITY[b.tier] ?? 1) - (TIER_PRIORITY[a.tier] ?? 1)
  );
  const primary = sorted[0];
  const others = sorted.slice(1);
  const totalXp = unlocked.reduce((s, a) => s + (a.xp || 25), 0);
  const primaryTitle = getAchievementDisplayTitle(primary, lang, bosses);
  const tierMeta = TIER_METADATA[primary.tier] ?? TIER_METADATA.bronze;

  const summaryText =
    others.length > 0
      ? lang === 'th'
        ? `ปลดล็อกอีก ${others.length} ใบ`
        : `+${others.length} more unlocked`
      : undefined;

  return {
    id: `ach_${primary.id}_${nowMs}`,
    tier: 4,
    title:
      lang === 'th'
        ? `${tierMeta.badgeEmoji} ปลดล็อกถ้วยรางวัล: ${primaryTitle}`
        : `${tierMeta.badgeEmoji} Achievement Unlocked: ${primaryTitle}`,
    subtitle:
      others.length > 0
        ? `${primary.description} (+${primary.xp} XP) · ${summaryText}`
        : `${primary.description} (+${primary.xp} XP)`,
    xpGained: totalXp,
    badge: primary,
    additionalBadges: others,
    extraUnlockedCount: others.length,
    summaryText,
  };
}

/**
 * Section 5: Evaluates which Category Completion Titles (`ฉายาจากการสะสมครบหมวด`) the user has earned.
 * Excludes achievements hidden for the user by Rule R11.
 */
export function getCategoryTitleProgress(
  unlockedIds: Iterable<string>,
  ageBand: AgeBand = '25-34',
  safetyFlags: SafetyFlag[] = ['none'],
  disabledOptions: string[] = [],
  catalog: AchievementDef[] = getAchievementCatalog()
): Array<{
  category: CategoryMeta;
  unlockedCount: number;
  eligibleTotal: number;
  isCompleted: boolean;
}> {
  const unlockedSet = new Set(unlockedIds);
  return ACHIEVEMENT_CATEGORIES.map((cat) => {
    const eligible = catalog.filter(
      (a) =>
        a.category === cat.id &&
        isAchievementVisibleForUser(a, ageBand, safetyFlags, disabledOptions)
    );
    const unlockedCount = eligible.filter((a) => unlockedSet.has(a.id)).length;
    const eligibleTotal = eligible.length;
    return {
      category: cat,
      unlockedCount,
      eligibleTotal,
      isCompleted: eligibleTotal > 0 && unlockedCount >= eligibleTotal,
    };
  });
}

/**
 * Section 7 ("ใกล้ได้แล้ว"):
 * Returns up to 3 locked, non-hidden, eligible achievements with >= 70% progress
 * (or top closest in-progress achievements if fewer than 3 have reached 70%).
 */
export function getNearCompletionAchievements(
  metrics: Record<string, number | string>,
  unlockedIds: Iterable<string>,
  ageBand: AgeBand = '25-34',
  safetyFlags: SafetyFlag[] = ['none'],
  catalog: AchievementDef[] = getAchievementCatalog(),
  limit: number = 3
): Array<{
  achievement: AchievementDef;
  current: number;
  target: number;
  percent: number;
}> {
  const unlockedSet = new Set(unlockedIds);
  const candidates = catalog
    .filter(
      (a) =>
        !unlockedSet.has(a.id) &&
        !a.hidden &&
        isAchievementVisibleForUser(a, ageBand, safetyFlags)
    )
    .map((achievement) => {
      const prog = getAchievementProgress(achievement, metrics);
      return {
        achievement,
        ...prog,
      };
    })
    .filter((item) => item.percent > 0 && item.percent < 100)
    .sort((a, b) => b.percent - a.percent);

  const over70 = candidates.filter((c) => c.percent >= 70);
  if (over70.length >= limit) {
    return over70.slice(0, limit);
  }
  return candidates.slice(0, limit);
}
