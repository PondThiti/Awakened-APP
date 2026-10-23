import {
  AgeBand,
  AwakeningPath,
  DisciplinePickId,
  LanguageCode,
  NarratorTone,
  OnboardingProfile,
  PlayerStats,
  SafetyFlag,
  StarterClassId,
} from './types';

export function isMinorAgeBand(ageBand: AgeBand): boolean {
  return ageBand === 'under_13' || ageBand === '13-15' || ageBand === '16-17';
}

export function shouldSkipPushupTest(
  ageBand: AgeBand,
  safetyFlags: SafetyFlag[]
): boolean {
  if (isMinorAgeBand(ageBand)) return true;
  return safetyFlags.some(
    (f) => f === 'injured_now' || f === 'medical_limit' || f === 'pregnancy'
  );
}

export function shouldHideColdShower(safetyFlags: SafetyFlag[]): boolean {
  return safetyFlags.some(
    (f) => f === 'injured_now' || f === 'medical_limit' || f === 'pregnancy'
  );
}

export function shouldHideReduceSugar(ageBand: AgeBand): boolean {
  return isMinorAgeBand(ageBand);
}

/**
 * Section 6.3 & 8.2: Calculates starting difficulty Tier (1..4)
 */
export function calculateStartingTier(
  input: Pick<
    OnboardingProfile,
    'ageBand' | 'freqBand' | 'pushupBand' | 'energy' | 'path' | 'bosses' | 'safetyFlags'
  >
): 1 | 2 | 3 | 4 {
  const flags = input.safetyFlags ?? [];
  if (
    flags.includes('injured_now') ||
    flags.includes('medical_limit') ||
    flags.includes('pregnancy')
  ) {
    return 1;
  }

  const freq = input.freqBand ?? 0;
  const pushup = shouldSkipPushupTest(input.ageBand, flags)
    ? 0
    : input.pushupBand ?? 0;
  const energyScore = input.energy <= 2 ? 0 : input.energy === 3 ? 1 : 2;
  const pathBonus = 0;
  const bossPenalty =
    input.bosses.includes('fading_fire') || input.bosses.includes('no_direction')
      ? 1
      : 0;

  const score = Math.max(0, freq + pushup + energyScore + pathBonus - bossPenalty);
  let tier = Math.min(4, Math.max(1, 1 + Math.floor(score / 3)));

  // Safety & age reduction (Section 6.3 "ถ้าไม่แน่ใจ ลดลง 1 ขั้นเสมอ" & 8.1/8.2)
  if (
    flags.includes('past_injury') ||
    flags.includes('unsure') ||
    flags.includes('undisclosed') ||
    input.ageBand === '55-64' ||
    input.ageBand === '65+'
  ) {
    tier = Math.max(1, tier - 1);
  }

  if (isMinorAgeBand(input.ageBand)) {
    tier = Math.min(3, tier);
  }

  return tier as 1 | 2 | 3 | 4;
}

/**
 * Section 5.2: Determines decorative Starter Class from answers
 */
export function determineStarterClass(
  input: Pick<OnboardingProfile, 'path' | 'equipment' | 'activities' | 'disciplinePicks'>
): StarterClassId {
  const acts = input.activities ?? [];
  const picks = input.disciplinePicks ?? [];

  if (
    input.path === 'strength' &&
    (acts.includes('weights') ||
      acts.includes('sport_martial') ||
      acts.includes('bodyweight') ||
      input.equipment === 'full_gym' ||
      input.equipment === 'home_gym')
  ) {
    return 'warrior';
  }

  if (
    input.path === 'discipline' &&
    (acts.includes('yoga_stretch') || picks.includes('meditate_3m'))
  ) {
    return 'monk';
  }

  if (
    input.equipment === 'outdoor' ||
    acts.includes('run') ||
    acts.includes('bike')
  ) {
    return 'ranger';
  }

  if (
    picks.includes('read_learn_15m') ||
    picks.includes('journal_short')
  ) {
    return 'scholar';
  }

  if (input.path === 'strength') return 'warrior';
  if (input.path === 'discipline') return 'monk';
  return 'awakened';
}

/**
 * Section 5.3: Calculates initial STR / VIT / INT / WIL stats (never decrease)
 */
export function calculateInitialStats(
  input: Pick<
    OnboardingProfile,
    | 'ageBand'
    | 'path'
    | 'freqBand'
    | 'pushupBand'
    | 'energy'
    | 'bosses'
    | 'disciplinePicks'
    | 'safetyFlags'
  >
): PlayerStats {
  const skipPush = shouldSkipPushupTest(input.ageBand, input.safetyFlags ?? []);
  const push = skipPush ? 0 : input.pushupBand ?? 0;
  const freq = input.freqBand ?? 0;
  const energy = input.energy ?? 3;
  const picks = input.disciplinePicks ?? [];
  const bosses = input.bosses ?? [];

  const str = Math.min(
    45,
    Math.max(
      10,
      10 +
        freq * 5 +
        push * 6 +
        (input.path === 'strength' ? 6 : input.path === 'full' ? 3 : 0)
    )
  );

  const vit = Math.min(
    45,
    Math.max(
      10,
      10 +
        freq * 4 +
        energy * 3 +
        (picks.includes('water_goal') ? 4 : 0) +
        (picks.includes('sleep_on_time') ? 4 : 0)
    )
  );

  const intStat = Math.min(
    45,
    Math.max(
      10,
      10 +
        (picks.includes('read_learn_15m') ? 8 : 0) +
        (picks.includes('journal_short') ? 6 : 0) +
        (input.path === 'discipline' ? 5 : 3)
    )
  );

  const bossPenalty =
    bosses.includes('self_defeat') || bosses.includes('fading_fire') ? 3 : 0;
  const wil = Math.min(
    45,
    Math.max(
      10,
      14 +
        picks.length * 5 +
        (input.path === 'discipline' ? 6 : 3) -
        bossPenalty
    )
  );

  return {
    STR: str,
    VIT: vit,
    INT: intStat,
    WIL: wil,
  };
}

export function getStarterClassLabel(
  classId: StarterClassId,
  lang: LanguageCode
): { name: string; desc: string } {
  const isTh = lang === 'th';
  switch (classId) {
    case 'warrior':
      return {
        name: isTh ? 'นักรบ (Warrior)' : 'Warrior',
        desc: isTh ? 'โดดเด่นด้านพละกำลังและความแข็งแกร่ง' : 'Focused on physical strength & power',
      };
    case 'monk':
      return {
        name: isTh ? 'นักพรต (Monk)' : 'Monk',
        desc: isTh ? 'โดดเด่นด้านความนิ่งของจิตใจและวินัย' : 'Focused on mindfulness & iron discipline',
      };
    case 'ranger':
      return {
        name: isTh ? 'นักเดินทาง (Ranger)' : 'Ranger',
        desc: isTh ? 'โดดเด่นด้านความอึดและการเคลื่อนไหว' : 'Focused on endurance & outdoor movement',
      };
    case 'scholar':
      return {
        name: isTh ? 'นักปราชญ์ (Scholar)' : 'Scholar',
        desc: isTh ? 'โดดเด่นด้านสมาธิและการเรียนรู้' : 'Focused on deep focus & continuous learning',
      };
    default:
      return {
        name: isTh ? 'ผู้ตื่นรู้ (Awakened)' : 'Awakened',
        desc: isTh ? 'สมดุลทั้งร่างกาย จิตใจ และวินัย' : 'Balanced across body, mind, and discipline',
      };
  }
}

export function getPathLabel(path: AwakeningPath, lang: LanguageCode): string {
  const isTh = lang === 'th';
  if (path === 'strength') {
    return isTh ? 'สาย Strength & Physique' : 'Strength & Physique';
  }
  if (path === 'discipline') {
    return isTh ? 'สาย Iron Discipline' : 'Iron Discipline';
  }
  return isTh ? 'สาย Full Awakening' : 'Full Awakening';
}

export function getNarratorMessages(
  narrator: NarratorTone,
  lang: LanguageCode
): {
  name: string;
  onSuccess: string;
  onComeback: string;
  dailyGreeting: string;
} {
  const isTh = lang === 'th';
  switch (narrator) {
    case 'gentle':
      return {
        name: isTh ? 'อ่อนโยน' : 'Gentle Guide',
        onSuccess: isTh
          ? 'ขอบคุณที่ดูแลตัวเองวันนี้นะ'
          : 'Thank you for taking care of yourself today.',
        onComeback: isTh
          ? 'ไม่เป็นไร พรุ่งนี้ค่อยเริ่มใหม่ ทุกอย่างที่สะสมยังอยู่'
          : 'It is okay. Every bit of progress you built is still here.',
        dailyGreeting: isTh
          ? 'ค่อย ๆ ก้าวไปในจังหวะของตัวเองนะ วันนี้เริ่มจากเรื่องเล็ก ๆ กัน'
          : 'Move at your own gentle pace today.',
      };
    case 'coach':
      return {
        name: isTh ? 'โค้ชเข้ม (สุภาพ)' : 'Focused Coach',
        onSuccess: isTh
          ? 'นี่แหละคือวินัย ไปต่อ!'
          : 'That is true discipline. Keep moving forward!',
        onComeback: isTh
          ? 'เมื่อวานผ่านไปแล้ว วันนี้คือวันที่เริ่มใหม่ได้'
          : 'Yesterday is done. Today is a fresh rep.',
        dailyGreeting: isTh
          ? 'ระบบพร้อมแล้ว ลงมือทำตามแผนทีละข้อ พักได้เมื่อร่างกายต้องการ'
          : 'System ready. Execute one step at a time.',
      };
    case 'adventurer':
      return {
        name: isTh ? 'นักผจญภัย' : 'Adventurer',
        onSuccess: isTh
          ? 'ด่านนี้ผ่านแล้ว นักเดินทาง'
          : 'Stage cleared, Traveler!',
        onComeback: isTh
          ? 'แผนที่ยังอยู่ ออกเดินใหม่ได้เสมอ'
          : 'The map remains open. Set forth whenever you are ready.',
        dailyGreeting: isTh
          ? 'เส้นทางวันนี้เปิดออกแล้ว เลือกเควสต์แรกแล้วออกเดินทางกันเลย'
          : 'Today’s path is open. Begin your first quest.',
      };
    case 'friend':
    default:
      return {
        name: isTh ? 'เพื่อนสนิท' : 'Close Friend',
        onSuccess: isTh
          ? 'เฮ้ย ทำได้จริงด้วย! เยี่ยมมาก!'
          : 'Hey, you nailed it! Awesome job!',
        onComeback: isTh
          ? 'ช่างมัน วันนี้พัก พรุ่งนี้ลุยกันใหม่'
          : 'No worries! Start light today and we roll again.',
        dailyGreeting: isTh
          ? 'พร้อมลุยวันนี้หรือยัง? เก็บเควสต์ง่าย ๆ ชิ้นแรกกันก่อนเลย!'
          : 'Ready for today? Let’s knock out an easy win first!',
      };
  }
}

export function createDefaultOnboardingProfile(nowMs: number = Date.now()): OnboardingProfile {
  const base: OnboardingProfile = {
    id: 1,
    nickname: 'Player',
    ageBand: '18-24',
    gender: 'undisclosed',
    path: 'full',
    feeling: 'neutral',
    bosses: ['fading_fire'],
    futureFeel: 'start_now',
    vow: 'ตื่นมาแล้วรู้สึกมีแรง',
    futureSelf: 'strong_energetic',
    freqBand: 1,
    pushupBand: null,
    equipment: 'bodyweight',
    minutesPerDay: 15,
    bestTime: 'morning',
    safetyFlags: ['none'],
    energy: 3,
    bedtime: '23:00',
    wakeTime: '07:00',
    activities: ['walk', 'bodyweight'],
    disciplinePicks: ['water_goal', 'no_snooze'],
    waterGoalMl: 2000,
    narrator: 'friend',
    startTier: 1,
    starterClass: 'awakened',
    quickWinsUntil: nowMs + 7 * 86400000,
    pledgedAt: null,
    completed: false,
    currentStepIndex: 0,
    lastComebackBonusAt: null,
    version: 2,
    updatedAt: nowMs,
  };

  base.startTier = calculateStartingTier(base);
  base.starterClass = determineStarterClass(base);
  return base;
}

export function finalizeOnboardingProfile(
  draft: OnboardingProfile,
  pledged: boolean,
  nowMs: number = Date.now()
): OnboardingProfile {
  const sanitizedFlags: SafetyFlag[] =
    draft.safetyFlags.length > 0 ? draft.safetyFlags : ['none'];
  const sanitizedPicks: DisciplinePickId[] = draft.disciplinePicks
    .filter((p) => {
      if (p === 'cold_shower' && shouldHideColdShower(sanitizedFlags)) return false;
      if (p === 'reduce_sugar_fried' && shouldHideReduceSugar(draft.ageBand)) return false;
      return true;
    })
    .slice(0, 3);

  const sanitizedPushup = shouldSkipPushupTest(draft.ageBand, sanitizedFlags)
    ? null
    : draft.pushupBand;

  const updated: OnboardingProfile = {
    ...draft,
    nickname: draft.nickname.trim() || 'Player',
    vow: draft.vow.trim() || 'ตื่นมาแล้วรู้สึกมีแรง',
    safetyFlags: sanitizedFlags,
    disciplinePicks: sanitizedPicks,
    pushupBand: sanitizedPushup,
    waterGoalMl: draft.waterGoalMl || 2000,
    minutesPerDay: draft.minutesPerDay || 15,
    narrator: draft.narrator || 'friend',
  };

  updated.startTier = calculateStartingTier(updated);
  updated.starterClass = determineStarterClass(updated);
  updated.quickWinsUntil = updated.bosses.includes('fading_fire')
    ? nowMs + 7 * 86400000
    : null;
  updated.pledgedAt = pledged ? nowMs : null;
  updated.completed = true;
  updated.updatedAt = nowMs;

  return updated;
}
