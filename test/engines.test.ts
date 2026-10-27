import { describe, expect, it } from 'vitest';
import { computeLevelState, totalXpForLevel, xpToNext, applyXp } from '../src/core/engine/levelEngine';
import { getRankForLevel, visibleRanks, formatRankLevelRange, getRankDescriptions } from '../src/core/engine/rankEngine';
import { calculateActivityXp, canRevertXpOnDelete, computeLedgerTotalXp, reconcileLedgerTotalXp } from '../src/core/engine/xpEngine';
import { evaluateStreakState } from '../src/core/engine/streakEngine';
import { clampPersonalQuestXp, evaluateQuestProgress, generateDailyQuestsForDay } from '../src/core/engine/questEngine';
import { evaluateAdaptivePlan } from '../src/core/engine/adaptivePlanEngine';
import {
  calculateInitialStats,
  calculateStartingTier,
  createDefaultOnboardingProfile,
  finalizeOnboardingProfile,
  shouldHideColdShower,
  shouldHideReduceSugar,
  shouldSkipPushupTest,
} from '../src/core/engine/onboardingEngine';
import {
  AchievementMetricsInput,
  buildMergedAchievementCelebration,
  computeAchievementMetrics,
  evaluateAchievements,
  getAchievementCatalog,
  getSecretHint,
  isAchievementVisibleForUser,
} from '../src/core/engine/achievementEngine';
import {
  evaluateWorkoutPenalty,
  getWorkoutPenaltyMultiplier,
  isWorkoutPenaltyExempt,
  settleInactivity,
  WORKOUT_PENALTY_MULTIPLIER_BY_RANK,
} from '../src/core/engine/penaltyEngine';
import {
  generatePinSalt,
  generateRecoveryCode,
  getLockoutDurationMs,
  hashPin,
  verifyPin,
  verifyRecoveryCode,
} from '../src/core/utils/pinSecurity';
import { getDailyNutritionSummary } from '../src/core/engine/nutritionSummary';
import {
  buildMonthGrid,
  formatCalendarYear,
  getMonthName,
  getWeekdayHeaders,
  parseDayKey,
  shiftMonth,
} from '../src/core/utils/calendarUtils';
import { TRANSLATIONS } from '../src/l10n/translations';

describe('Awakened Core Engines — Section 18.1 Unit Tests', () => {
  it('1. LevelEngine: computes exact xpToNext and totalXpForLevel matching Appendix B', () => {
    expect(xpToNext(1)).toBe(100);
    expect(xpToNext(5)).toBe(180);
    expect(xpToNext(10)).toBe(280);
    expect(xpToNext(25)).toBe(580);
    expect(xpToNext(50)).toBe(1080);
    expect(xpToNext(100)).toBe(2080);
    expect(xpToNext(220)).toBe(4480);

    expect(totalXpForLevel(1)).toBe(0);
    expect(totalXpForLevel(2)).toBe(100);
    expect(totalXpForLevel(5)).toBe(520);
    expect(totalXpForLevel(10)).toBe(1620);
    expect(totalXpForLevel(11)).toBe(1900); // Rank D threshold
    expect(totalXpForLevel(26)).toBe(8500); // Rank C threshold
    expect(totalXpForLevel(46)).toBe(24300); // Rank B threshold
    expect(totalXpForLevel(71)).toBe(55300); // Rank A threshold
    expect(totalXpForLevel(101)).toBe(109000); // Rank S threshold
    expect(totalXpForLevel(151)).toBe(238500); // Rank SS threshold
    expect(totalXpForLevel(221)).toBe(503800); // Rank Monarch threshold
  });

  it('2. LevelEngine: handles multi-level jumps accurately from total_xp', () => {
    // At 1,900 XP, user should be exactly Level 11 with 0 XP in level
    const lv11 = computeLevelState(1900);
    expect(lv11.level).toBe(11);
    expect(lv11.xpInLevel).toBe(0);
    expect(lv11.xpToNext).toBe(300);

    // Jumping from Lv 1 (0 XP) by +360 XP -> should land at Lv 4 with 0 XP remaining
    const jump = applyXp(1, 0, 360);
    expect(jump.level).toBe(4);
    expect(jump.xpInLevel).toBe(0);
  });

  it('3. XpEngine: awards exact XP matching config and enforces max_per_day (e.g. 6th water log = 0 XP)', () => {
    const now = 1_700_000_000_000;
    // 1st water log -> +2 XP
    const firstWater = calculateActivityXp({
      activityKey: 'water_log',
      countTodayForKey: 0,
      dailyRepeatableXpSoFar: 0,
      occurredAtMs: now,
      nowMs: now,
    });
    expect(firstWater.xpAwarded).toBe(2);

    // 6th water log (countTodayForKey = 5, max_per_day = 5) -> 0 XP
    const sixthWater = calculateActivityXp({
      activityKey: 'water_log',
      countTodayForKey: 5,
      dailyRepeatableXpSoFar: 10,
      occurredAtMs: now,
      nowMs: now,
    });
    expect(sixthWater.xpAwarded).toBe(0);
    expect(sixthWater.cappedByDailyMax).toBe(true);
  });

  it('4. XpEngine: enforces 2-minute anti-spam cooldown for duplicate logs', () => {
    const now = 1_700_000_000_000;
    const dup = calculateActivityXp({
      activityKey: 'water_log',
      countTodayForKey: 1,
      dailyRepeatableXpSoFar: 2,
      lastSameTypeOccurredAtMs: now - 45_000, // 45 seconds ago (< 120s)
      occurredAtMs: now,
      nowMs: now,
    });
    expect(dup.xpAwarded).toBe(0);
    expect(dup.blockedByCooldown).toBe(true);
  });

  it('5. XpEngine: applies 25% multiplier after reaching 300 XP daily soft cap', () => {
    const now = 1_700_000_000_000;
    const overCap = calculateActivityXp({
      activityKey: 'workout',
      countTodayForKey: 0,
      dailyRepeatableXpSoFar: 300, // Already at Soft Cap
      occurredAtMs: now,
      nowMs: now,
      workoutDurationMinutes: 20, // 30 base + 10 duration = 40 raw XP
    });
    expect(overCap.rawXp).toBe(40);
    expect(overCap.softCapApplied).toBe(true);
    expect(overCap.xpAwarded).toBe(10); // 25% of 40 = 10 XP
  });

  it('6. XpEngine: backfill > 24 hours gives 50% XP and does not count for streak', () => {
    const now = 1_700_000_000_000;
    const twoDaysAgo = now - 48 * 3600 * 1000;
    const backfilled = calculateActivityXp({
      activityKey: 'meal_log',
      countTodayForKey: 0,
      dailyRepeatableXpSoFar: 0,
      occurredAtMs: twoDaysAgo,
      nowMs: now,
    });
    expect(backfilled.isBackfilled).toBe(true);
    expect(backfilled.countsForStreak).toBe(false);
    expect(backfilled.xpAwarded).toBe(4); // 50% of 8 XP
  });

  it('7. XpEngine: delete rule reverts XP within 10 minutes, preserves XP after 10 minutes', () => {
    const created = 1_700_000_000_000;
    expect(canRevertXpOnDelete(created, created + 5 * 60 * 1000)).toBe(true); // 5 min
    expect(canRevertXpOnDelete(created, created + 15 * 60 * 1000)).toBe(false); // 15 min
  });

  it('8. RankEngine: promotes to Rank D at Lv 11 and checks Monarch special requirements at Lv 221', () => {
    expect(getRankForLevel(10).currentRank.id).toBe('E');
    expect(getRankForLevel(11).currentRank.id).toBe('D');
    expect(getRankForLevel(26).currentRank.id).toBe('C');

    // Level 221 without 365 days & 5 badge categories stays at SS
    const preMonarch = getRankForLevel(221, {
      totalActiveDays: 120,
      unlockedBadgeCategoriesCount: 2,
    });
    expect(preMonarch.currentRank.id).toBe('SS');
    expect(preMonarch.monarchEligibility.eligible).toBe(false);

    // 4 badge categories is no longer enough (requirement is 5)
    const fourCats = getRankForLevel(221, {
      totalActiveDays: 365,
      unlockedBadgeCategoriesCount: 4,
    });
    expect(fourCats.currentRank.id).toBe('SS');
    expect(fourCats.monarchEligibility.requiredBadgeCategories).toBe(5);
    expect(fourCats.monarchEligibility.badgeCategoriesMet).toBe(false);

    // Level 221 with 365 days & 5 badge categories unlocks Monarch!
    const monarch = getRankForLevel(221, {
      totalActiveDays: 365,
      unlockedBadgeCategoriesCount: 5,
    });
    expect(monarch.currentRank.id).toBe('M');
    expect(monarch.monarchEligibility.eligible).toBe(true);

    // Monarch Trophy Requirements: all bronze (68), all silver (49), half gold (29), 10 diamond (10)
    const missingBronze = getRankForLevel(221, {
      totalActiveDays: 365,
      unlockedBadgeCategoriesCount: 5,
      trophiesByTier: { bronze: 67, silver: 49, gold: 29, legend: 10 },
    });
    expect(missingBronze.currentRank.id).toBe('SS');
    expect(missingBronze.monarchEligibility.bronzeMet).toBe(false);

    const missingGoldHalf = getRankForLevel(221, {
      totalActiveDays: 365,
      unlockedBadgeCategoriesCount: 5,
      trophiesByTier: { bronze: 68, silver: 49, gold: 28, legend: 10 },
    });
    expect(missingGoldHalf.currentRank.id).toBe('SS');
    expect(missingGoldHalf.monarchEligibility.goldMet).toBe(false);

    const missingDiamond = getRankForLevel(221, {
      totalActiveDays: 365,
      unlockedBadgeCategoriesCount: 5,
      trophiesByTier: { bronze: 68, silver: 49, gold: 29, legend: 9 },
    });
    expect(missingDiamond.currentRank.id).toBe('SS');
    expect(missingDiamond.monarchEligibility.diamondMet).toBe(false);

    const fullTrophiesMonarch = getRankForLevel(221, {
      totalActiveDays: 365,
      unlockedBadgeCategoriesCount: 5,
      trophiesByTier: { bronze: 68, silver: 49, gold: 29, legend: 10 },
    });
    expect(fullTrophiesMonarch.currentRank.id).toBe('M');
    expect(fullTrophiesMonarch.monarchEligibility.eligible).toBe(true);
    expect(fullTrophiesMonarch.monarchEligibility.bronzeMet).toBe(true);
    expect(fullTrophiesMonarch.monarchEligibility.silverMet).toBe(true);
    expect(fullTrophiesMonarch.monarchEligibility.goldMet).toBe(true);
    expect(fullTrophiesMonarch.monarchEligibility.diamondMet).toBe(true);
  });

  it('9. StreakEngine: preserves streak with Freeze Token when 1 day is missed, resets to 0 without Freeze, and counts Rest Day', () => {
    // Case A: Missed 1 day WITH 1 Freeze Token -> Streak preserved, freeze token -1
    const withFreeze = evaluateStreakState({
      todayKey: '2026-10-23',
      activeDaysSet: new Set(['2026-10-20', '2026-10-21', '2026-10-23']), // missed 2026-10-22
      restCheckinDaysSet: new Set(),
      existingLogs: {},
      trainingPlan: [],
      initialFreezeTokens: 1,
      previousLongestStreak: 0,
      weeklyGoalDays: 4,
    });
    expect(withFreeze.currentStreak).toBe(3);
    expect(withFreeze.freezeTokensRemaining).toBe(0);
    expect(withFreeze.updatedLogs['2026-10-22']).toBe('frozen');

    // Case B: Missed 1 day WITHOUT Freeze Token -> Streak resets to 1 (today only), longestStreak kept
    const withoutFreeze = evaluateStreakState({
      todayKey: '2026-10-23',
      activeDaysSet: new Set(['2026-10-20', '2026-10-21', '2026-10-23']),
      restCheckinDaysSet: new Set(),
      existingLogs: {},
      trainingPlan: [],
      initialFreezeTokens: 0,
      previousLongestStreak: 2,
      weeklyGoalDays: 4,
    });
    expect(withoutFreeze.currentStreak).toBe(1);
    expect(withoutFreeze.longestStreak).toBe(2);

    // Case C: Planned Rest Day check-in keeps streak continuous without using freeze token
    const withRest = evaluateStreakState({
      todayKey: '2026-10-23',
      activeDaysSet: new Set(['2026-10-21', '2026-10-23']),
      restCheckinDaysSet: new Set(['2026-10-22']),
      existingLogs: {},
      trainingPlan: [],
      initialFreezeTokens: 1,
      previousLongestStreak: 0,
      weeklyGoalDays: 4,
    });
    expect(withRest.currentStreak).toBe(3);
    expect(withRest.freezeTokensRemaining).toBe(1);
  });

  it('10. QuestEngine & AdaptivePlanEngine: generates recovery quests on rest day and caps personal quest XP at 50', () => {
    const recoveryQuests = generateDailyQuestsForDay({
      dayKey: '2026-10-23',
      isRestDay: true,
      availableMinutesPerDay: 15,
      waterGoalMl: 2000,
    });
    expect(recoveryQuests.some((q) => q.templateId === 'daily_rest_recovery')).toBe(true);
    expect(recoveryQuests.some((q) => q.templateId === 'daily_workout_session')).toBe(false);

    expect(clampPersonalQuestXp(50, 25)).toBe(25); // 50 daily cap - 25 already earned = 25

    const recs = evaluateAdaptivePlan({
      availableMinutesPerDay: 15,
      isRestModeToday: true,
      consecutiveWeeksMissedGoal: 2,
      consecutiveWeeksExceededGoal: 0,
      currentWeeklyGoalDays: 5,
      language: 'th',
    });
    expect(recs.some((r) => r.type === 'recovery_mode')).toBe(true);
    expect(recs.some((r) => r.type === 'short_routine')).toBe(true);
    expect(recs.some((r) => r.type === 'lower_goal')).toBe(true);
  });

  it('11. Integration Flow (Section 18.2): Water log -> XP -> Quest complete -> Level Up', () => {
    const quests = generateDailyQuestsForDay({
      dayKey: '2026-10-23',
      isRestDay: false,
      availableMinutesPerDay: 30,
      waterGoalMl: 2000,
    });
    const waterQuest = quests.find((q) => q.templateId === 'daily_water_goal') ?? quests[0];

    const evalRes = evaluateQuestProgress(waterQuest, {
      water_ml: 2000,
      water_goal: 2000,
      water_count: 4,
      meal_count: 2,
      workout_count: 1,
      workout_min: 20,
      pomodoro_count: 2,
      journal_count: 1,
      mood_count: 1,
      rest_or_stretch: 1,
      weekly_active_days: 4,
      weekly_goal: 4,
      weekly_focus_min: 100,
      weekly_journal_days: 3,
      total_activities: 10,
      longest_streak: 5,
      total_active_days: 5,
    });

    expect(evalRes.newlyCompleted).toBe(true);
    expect(evalRes.updated.status).toBe('completed');

    // Verify config formula changes recalculate level accurately from total_xp
    const customLevelState = computeLevelState(520, { base: 100, per_level: 20 });
    expect(customLevelState.level).toBe(5);
    expect(customLevelState.xpInLevel).toBe(0);
  });

  it('12. OnboardingEngine (Section 11.1): enforces teen safety rules (16-17), injury safety flags, Quick Wins, and Comeback Quests', () => {
    const now = 1_700_000_000_000;
    const base = createDefaultOnboardingProfile(now);

    // Case A: Age 16-17 skips Q11 pushup test & hides reduce_sugar_fried
    expect(shouldSkipPushupTest('16-17', ['none'])).toBe(true);
    expect(shouldHideReduceSugar('16-17')).toBe(true);
    const teenFinal = finalizeOnboardingProfile(
      {
        ...base,
        ageBand: '16-17',
        pushupBand: 3,
        disciplinePicks: ['reduce_sugar_fried', 'water_goal'],
      },
      true,
      now
    );
    expect(teenFinal.pushupBand).toBeNull();
    expect(teenFinal.disciplinePicks.includes('reduce_sugar_fried')).toBe(false);

    // Case B: Q15 = injured_now forces Tier 1 & hides cold_shower
    expect(shouldHideColdShower(['injured_now'])).toBe(true);
    const injuredTier = calculateStartingTier({
      ageBand: '25-34',
      freqBand: 3,
      pushupBand: 3,
      energy: 5,
      path: 'strength',
      bosses: [],
      safetyFlags: ['injured_now'],
    });
    expect(injuredTier).toBe(1);

    // Case C: Q6 fading_fire enables Quick Wins mode for 7 days & selects micro body quests
    const fadingFireProfile = finalizeOnboardingProfile(
      {
        ...base,
        bosses: ['fading_fire'],
        minutesPerDay: 10,
      },
      true,
      now
    );
    expect(fadingFireProfile.quickWinsUntil).toBe(now + 7 * 86400000);
    const quickWinQuests = generateDailyQuestsForDay({
      dayKey: '2026-10-23',
      isRestDay: false,
      availableMinutesPerDay: 10,
      waterGoalMl: 2000,
      onboarding: fadingFireProfile,
      nowMs: now + 1000,
    });
    expect(quickWinQuests.length).toBeGreaterThanOrEqual(3);
    expect(quickWinQuests.every((q) => q.template.micro || q.template.slot !== 'body')).toBe(true);

    // Case D: Missed >= 2 days triggers Comeback Quest set without penalty
    const comebackQuests = generateDailyQuestsForDay({
      dayKey: '2026-10-25',
      isRestDay: false,
      availableMinutesPerDay: 15,
      waterGoalMl: 2000,
      onboarding: fadingFireProfile,
      missedDaysInRow: 2,
      nowMs: now + 2 * 86400000,
    });
    expect(comebackQuests.some((q) => q.template.comeback || q.template.micro)).toBe(true);

    // Case E: Not ready button saves pledgedAt = null and valid initial stats
    const unpledged = finalizeOnboardingProfile(base, false, now);
    expect(unpledged.pledgedAt).toBeNull();
    expect(unpledged.completed).toBe(true);
    const stats = calculateInitialStats(unpledged);
    expect(stats.STR).toBeGreaterThanOrEqual(10);
    expect(stats.VIT).toBeGreaterThanOrEqual(10);
    expect(stats.INT).toBeGreaterThanOrEqual(10);
    expect(stats.WIL).toBeGreaterThanOrEqual(10);
  });

  it('13. AchievementEngine (Section 6.4): validates all 199 achievements and Rules R1–R11', () => {
    const catalog = getAchievementCatalog();
    expect(catalog.length).toBe(199);

    const baseInput: AchievementMetricsInput = {
      activities: [],
      journals: [],
      moods: [],
      dailyQuestsByDay: {},
      weeklyQuestsByWeek: {},
      milestoneQuests: [],
      personalQuestDoneByDay: {},
      streakLogs: {},
      waterGoalMl: 2000,
      weeklyGoalDays: 4,
      longestStreak: 1,
      totalActiveDays: 1,
      totalXp: 0,
      playerStats: { STR: 10, VIT: 10, INT: 10, WIL: 10 },
      unlockedIds: new Set(),
      existingCounters: {},
    };

    // 1. Idempotency: already unlocked streak_3 is not returned or awarded XP again
    const alreadyUnlockedSet = new Set(['streak_3']);
    const idemEval = evaluateAchievements({
      metrics: { streak_days_max: 5, active_days_total: 5 },
      unlockedIds: alreadyUnlockedSet,
      totalXp: 100,
    });
    expect(idemEval.newlyUnlocked.some((a) => a.id === 'streak_3')).toBe(false);

    // 2. Non-revocation on activity delete (Rule R1): monotonic metric_counter preserves event:water_log
    const metricsBeforeDelete = computeAchievementMetrics({
      ...baseInput,
      activities: [
        {
          id: 1,
          type: 'water',
          title: 'Water 250ml',
          value: 250,
          unit: 'ml',
          occurredAt: 1_700_000_000_000,
          tzOffsetMin: 0,
          createdAt: 1_700_000_000_000,
          isBackfilled: false,
          deletedAt: null,
          xpAwarded: 2,
        },
      ],
    });
    expect(metricsBeforeDelete['event:water_log']).toBe(1);

    const evalWater = evaluateAchievements({
      metrics: metricsBeforeDelete,
      unlockedIds: new Set(),
      totalXp: 0,
    });
    expect(evalWater.newlyUnlocked.some((a) => a.id === 'fs_water')).toBe(true);

    // Simulate deleting the water log while preserving existingCounters & unlockedIds
    const unlockedAfterWater = new Set(evalWater.newlyUnlocked.map((a) => a.id));
    const numericCountersOnly: Record<string, number> = {};
    for (const [k, v] of Object.entries(metricsBeforeDelete)) {
      if (typeof v === 'number') numericCountersOnly[k] = v;
    }
    const metricsAfterDelete = computeAchievementMetrics({
      ...baseInput,
      activities: [],
      existingCounters: numericCountersOnly,
    });
    expect(metricsAfterDelete['event:water_log']).toBe(1);
    expect(unlockedAfterWater.has('fs_water')).toBe(true);

    // 3. Cascading Unlock (5-round loop): unlocking an achievement whose XP pushes player to Level 10/11 unlocks level_10 & rank_d in the next round
    // Level 11 (Rank D) requires 1,900 total XP. Start at 1,880 XP and unlock streak_3 (+25 XP) -> 1,905 XP -> Level 11 -> unlocks level_5, level_10, rank_d!
    const cascadeEval = evaluateAchievements({
      metrics: { streak_days_max: 3, active_days_total: 10 },
      unlockedIds: new Set(),
      totalXp: 1880,
    });
    const cascadeIds = cascadeEval.newlyUnlocked.map((a) => a.id);
    expect(cascadeIds).toContain('streak_3');
    expect(cascadeIds).toContain('level_10');
    expect(cascadeIds).toContain('rank_D');
    expect(cascadeEval.finalLevel).toBeGreaterThanOrEqual(11);

    // 4. Minor < 18 Filter (Rule R8): ageBand === '16-17' suppresses event:quest_before_midnight and hides midnight & early_bird
    const teenMetrics = computeAchievementMetrics({
      ...baseInput,
      ageBand: '16-17',
      existingCounters: {
        'event:quest_before_midnight': 1,
        'event:quest_before_6am': 1,
      },
    });
    expect(teenMetrics['event:quest_before_midnight']).toBe(0);
    expect(teenMetrics['event:quest_before_6am']).toBe(0);
    const teenEval = evaluateAchievements({
      metrics: { 'event:quest_before_midnight': 1 },
      unlockedIds: new Set(),
      totalXp: 0,
      ageBand: '16-17',
    });
    expect(teenEval.newlyUnlocked.some((a) => a.id === 'midnight')).toBe(false);

    // 5. Health Safety Flag Filter (Rule R11): safetyFlags includes 'medical_limit' -> blocks cold_7 and cold_30
    const coldEval = evaluateAchievements({
      metrics: { cold_shower_days_total: 35 },
      unlockedIds: new Set(),
      totalXp: 0,
      safetyFlags: ['medical_limit'],
    });
    expect(coldEval.newlyUnlocked.some((a) => a.id === 'cold_7')).toBe(false);
    expect(coldEval.newlyUnlocked.some((a) => a.id === 'cold_30')).toBe(false);
    const cold7Def = catalog.find((a) => a.id === 'cold_7')!;
    expect(isAchievementVisibleForUser(cold7Def, '25-34', ['medical_limit'])).toBe(false);

    // 6. Daily Counting Cap (Rule R5): logging 500 pushups in a single day caps reps_pushup_total at 300/day
    const pushupMetrics = computeAchievementMetrics({
      ...baseInput,
      activities: [
        {
          id: 1,
          type: 'workout',
          title: 'Strength',
          value: 30,
          unit: 'min',
          occurredAt: 1_700_000_000_000,
          tzOffsetMin: 0,
          createdAt: 1_700_000_000_000,
          isBackfilled: false,
          deletedAt: null,
          xpAwarded: 45,
          workoutDetail: {
            workoutType: 'strength',
            durationSec: 1800,
            sets: [{ exerciseName: 'Push-up', setIndex: 1, reps: 500 }],
          },
        },
      ],
    });
    expect(pushupMetrics.reps_pushup_total).toBe(300);

    // 7. Backfill > 24h Exclusion (Rule R4): backfilled activities > 24h do not count toward meal_logs_total
    const backfillMetrics = computeAchievementMetrics({
      ...baseInput,
      activities: [
        {
          id: 2,
          type: 'meal',
          title: 'Lunch',
          value: 500,
          unit: 'kcal',
          occurredAt: 1_700_000_000_000,
          tzOffsetMin: 0,
          createdAt: 1_700_000_000_000 + 72 * 3600 * 1000,
          isBackfilled: true,
          deletedAt: null,
          xpAwarded: 4,
          mealDetail: {
            mealSlot: 'lunch',
            caloriesEst: 500,
            proteinG: 25,
            carbsG: 50,
            fatG: 15,
            isEstimate: true,
            source: 'manual',
          },
        },
      ],
    });
    expect(backfillMetrics.meal_logs_total).toBe(0);

    // 8. Secret Achievement Hint Masking (Rule R7) & Multi-Unlock Popup Merging (Section 3):
    const secretAchs = catalog.filter((a) => a.hidden);
    expect(secretAchs.length).toBe(9);
    for (const sec of secretAchs) {
      const hint = getSecretHint(sec, 'th');
      expect(hint.length).toBeGreaterThan(5);
    }

    const mergedCelebration = buildMergedAchievementCelebration(
      cascadeEval.newlyUnlocked,
      'th'
    );
    expect(mergedCelebration).not.toBeNull();
    expect(mergedCelebration!.extraUnlockedCount).toBeGreaterThan(0);
    expect(mergedCelebration!.summaryText).toContain('ปลดล็อกอีก');
  });

  it('14. PenaltyEngine: enforces exact multipliers (E x1.4, D/C x1.8, B/A x2.2, S+ x2.5) only for exercise', () => {
    expect(getWorkoutPenaltyMultiplier('E')).toBe(1.4);
    expect(getWorkoutPenaltyMultiplier('D')).toBe(1.8);
    expect(getWorkoutPenaltyMultiplier('C')).toBe(1.8);
    expect(getWorkoutPenaltyMultiplier('B')).toBe(2.2);
    expect(getWorkoutPenaltyMultiplier('A')).toBe(2.2);
    expect(getWorkoutPenaltyMultiplier('S')).toBe(2.5);
    expect(getWorkoutPenaltyMultiplier('SS')).toBe(2.5);
    expect(getWorkoutPenaltyMultiplier('M')).toBe(2.5);

    // Minors (<18) and injured/medical users are exempt
    const minorOnboarding = {
      ...createDefaultOnboardingProfile(),
      ageBand: '16-17' as const,
    };
    expect(isWorkoutPenaltyExempt(minorOnboarding)).toBe(true);

    const injuredOnboarding = {
      ...createDefaultOnboardingProfile(),
      safetyFlags: ['injured_now' as const],
    };
    expect(isWorkoutPenaltyExempt(injuredOnboarding)).toBe(true);

    // Standard user is not exempt
    const normalOnboarding = createDefaultOnboardingProfile();
    expect(isWorkoutPenaltyExempt(normalOnboarding)).toBe(false);

    // Generate penalized quests for Rank E (x1.4)
    const quests = generateDailyQuestsForDay({
      dayKey: '2026-10-24',
      isRestDay: false,
      availableMinutesPerDay: 30,
      waterGoalMl: 2000,
      penaltyMultiplier: 1.4,
    });
    // Exercise quests should have multiplier applied and target rounded up
    const exerciseQuest = quests.find(
      (q) => q.template.slot === 'body' && q.template.condition.metric === 'workout_min'
    );
    if (exerciseQuest) {
      expect(exerciseQuest.penaltyMultiplier).toBe(1.4);
      expect(exerciseQuest.target).toBeGreaterThan(exerciseQuest.template.condition.target as number);
    }
  });

  it('15. QuestEngine: exercise-focus path completely excludes journaling and mood check-in quests', () => {
    const strengthOnboarding = {
      ...createDefaultOnboardingProfile(),
      path: 'strength' as const,
    };
    const quests = generateDailyQuestsForDay({
      dayKey: '2026-10-24',
      isRestDay: false,
      availableMinutesPerDay: 45,
      waterGoalMl: 2500,
      onboarding: strengthOnboarding,
    });

    const hasJournal = quests.some((q) => q.templateId === 'daily_journal_write');
    const hasMood = quests.some((q) => q.templateId === 'daily_mood_check');
    expect(hasJournal).toBe(false);
    expect(hasMood).toBe(false);
  });

  it('16. NutritionSummary: accurately sums daily kcal, macros and by-slot totals', () => {
    const activities = [
      {
        id: 1,
        type: 'meal' as const,
        title: 'ข้าวกะเพราไก่ไข่ดาว',
        value: 630,
        unit: 'kcal',
        occurredAt: new Date('2026-10-24T12:30:00Z').getTime(),
        tzOffsetMin: 0,
        createdAt: Date.now(),
        deletedAt: null,
        isBackfilled: false,
        xpAwarded: 8,
        mealDetail: {
          mealSlot: 'lunch' as const,
          caloriesEst: 630,
          proteinG: 28,
          carbsG: 65,
          fatG: 22,
          isEstimate: true,
          source: 'manual' as const,
        },
      },
      {
        id: 2,
        type: 'meal' as const,
        title: 'เวย์โปรตีน + กล้วย',
        value: 280,
        unit: 'kcal',
        occurredAt: new Date('2026-10-24T17:00:00Z').getTime(),
        tzOffsetMin: 0,
        createdAt: Date.now(),
        deletedAt: null,
        isBackfilled: false,
        xpAwarded: 8,
        mealDetail: {
          mealSlot: 'snack' as const,
          caloriesEst: 280,
          proteinG: 26,
          carbsG: 32,
          fatG: 3,
          isEstimate: false,
          source: 'manual' as const,
        },
      },
    ];

    const summary = getDailyNutritionSummary(activities, '2026-10-24');
    expect(summary.mealCount).toBe(2);
    expect(summary.kcal).toBe(910);
    expect(summary.proteinG).toBe(54);
    expect(summary.carbsG).toBe(97);
    expect(summary.fatG).toBe(25);
    expect(summary.bySlot.lunch).toBe(630);
    expect(summary.bySlot.snack).toBe(280);
    expect(summary.bySlot.breakfast).toBe(0);
  });

  it('17. CalendarUtils: standard month grid, year formatting, and month shifting', () => {
    // October 2026 (31 days)
    const grid = buildMonthGrid(2026, 9, 1); // 9 = October
    expect(grid.length).toBeGreaterThanOrEqual(4);
    const flattened = grid.flat().filter(Boolean);
    expect(flattened.length).toBe(31);
    expect(flattened[0]).toBe('2026-10-01');
    expect(flattened[30]).toBe('2026-10-31');

    // Thai year (พ.ศ. 2569)
    expect(formatCalendarYear(2026, true)).toBe('2569');
    expect(formatCalendarYear(2026, false)).toBe('2026');

    // Month shifting
    const shifted = shiftMonth(2026, 9, 1);
    expect(shifted.year).toBe(2026);
    expect(shifted.monthIndex).toBe(10); // November

    const shiftedYear = shiftMonth(2026, 11, 1);
    expect(shiftedYear.year).toBe(2027);
    expect(shiftedYear.monthIndex).toBe(0); // January
  });

  it('18. L10n: 100% key and structure parity between Thai and English translations', () => {
    function collectKeys(obj: Record<string, unknown>, prefix = ''): string[] {
      let keys: string[] = [];
      for (const k of Object.keys(obj)) {
        const val = obj[k];
        if (typeof val === 'object' && val !== null) {
          keys = keys.concat(collectKeys(val as Record<string, unknown>, `${prefix}${k}.`));
        } else {
          keys.push(`${prefix}${k}`);
          expect(typeof val).toBe('string');
          expect((val as string).trim().length).toBeGreaterThan(0);
        }
      }
      return keys;
    }

    const thKeys = collectKeys(TRANSLATIONS.th).sort();
    const enKeys = collectKeys(TRANSLATIONS.en).sort();
    expect(enKeys).toEqual(thKeys);
  });

  it('19. InactivityPenalty (v0.10.5 Section 1 & 10): deducts 30% XP after 3 missed days (graceDays=2), respects scope (level vs total), shields, rest days, vacation, and idempotency', () => {
    const makeDayQuests = (dayKey: string, completedCount: number, totalCount = 3) => {
      const generated = generateDailyQuestsForDay({
        dayKey,
        isRestDay: false,
        availableMinutesPerDay: 20,
        waterGoalMl: 2000,
      }).slice(0, totalCount);
      return generated.map((q, i) => ({
        ...q,
        progress: i < completedCount ? q.target : 0,
        status: (i < completedCount ? 'completed' : 'in_progress') as 'completed' | 'in_progress',
        completedAt: i < completedCount ? 1_700_000_000_000 : undefined,
      }));
    };

    // Acceptance Case 1: 2 missed days + quest completed on day 3 => 0 penalty
    const twoMissThenDone = settleInactivity({
      startDayKey: '2026-10-20',
      todayKey: '2026-10-24',
      createdAt: 1_700_000_000_000,
      totalXp: 2000,
      xpEvents: [],
      trainingPlan: [],
      activities: [],
      dailyQuestsByDay: {
        '2026-10-20': makeDayQuests('2026-10-20', 3, 3),
        '2026-10-21': makeDayQuests('2026-10-21', 0, 3), // miss 1
        '2026-10-22': makeDayQuests('2026-10-22', 0, 3), // miss 2
        '2026-10-23': makeDayQuests('2026-10-23', 3, 3), // kept on day 3!
      },
      streakLogs: {},
    });
    expect(twoMissThenDone.totalDeductedXp).toBe(0);
    expect(twoMissThenDone.newTotalXp).toBe(2000);

    // 3 consecutive missed days (2026-10-21 has 2/3 quests -> still missed under missRule='all')
    const dailyQuestsByDay = {
      '2026-10-20': makeDayQuests('2026-10-20', 3, 3), // kept
      '2026-10-21': makeDayQuests('2026-10-21', 2, 3), // miss 1 (partial does not count under missRule='all')
      '2026-10-22': makeDayQuests('2026-10-22', 0, 3), // miss 2
      '2026-10-23': makeDayQuests('2026-10-23', 0, 3), // miss 3 -> triggers 30% penalty!
    };

    // Acceptance Case 2: Scope='level' deducts 30% of xpInLevel and never drops level
    // At 2,000 totalXp -> Level 11 (1,900 threshold) with xpInLevel = 100 -> 30% of 100 = 30 XP deducted -> 1,970 XP (still Level 11!)
    const scopeLevel = settleInactivity({
      startDayKey: '2026-10-20',
      todayKey: '2026-10-24',
      createdAt: 1_700_000_000_000,
      totalXp: 2000,
      penaltyShields: 0,
      xpEvents: [],
      trainingPlan: [],
      activities: [],
      dailyQuestsByDay,
      streakLogs: {},
      settings: { scope: 'level' },
    });
    expect(scopeLevel.totalDeductedXp).toBe(30);
    expect(scopeLevel.newTotalXp).toBe(1970);
    expect(computeLevelState(scopeLevel.newTotalXp).level).toBe(11);

    // Acceptance Case 3: Scope='level' when xpInLevel = 0 (at exact level threshold 1,900) => 0 XP deducted
    const zeroInLevel = settleInactivity({
      startDayKey: '2026-10-20',
      todayKey: '2026-10-24',
      createdAt: 1_700_000_000_000,
      totalXp: 1900,
      penaltyShields: 0,
      xpEvents: [],
      trainingPlan: [],
      activities: [],
      dailyQuestsByDay,
      streakLogs: {},
      settings: { scope: 'level' },
    });
    expect(zeroInLevel.totalDeductedXp).toBe(0);
    expect(zeroInLevel.newTotalXp).toBe(1900);

    // Shield Case: With 1 Shield -> Shield is consumed, 0 XP deducted
    const withShield = settleInactivity({
      startDayKey: '2026-10-20',
      todayKey: '2026-10-24',
      createdAt: 1_700_000_000_000,
      totalXp: 2000,
      penaltyShields: 1,
      xpEvents: [],
      trainingPlan: [],
      activities: [],
      dailyQuestsByDay,
      streakLogs: {},
    });
    expect(withShield.shieldsUsed).toBe(1);
    expect(withShield.shieldsRemaining).toBe(0);
    expect(withShield.totalDeductedXp).toBe(0);
    expect(withShield.newTotalXp).toBe(2000);

    // Scope='total' without Shield -> 30% of 2000 XP = 600 XP deducted -> 1400 XP & Comeback Quest refunds 50% (300 XP)
    const noShield = settleInactivity({
      startDayKey: '2026-10-20',
      todayKey: '2026-10-24',
      createdAt: 1_700_000_000_000,
      totalXp: 2000,
      penaltyShields: 0,
      xpEvents: [],
      trainingPlan: [],
      activities: [],
      dailyQuestsByDay,
      streakLogs: {},
      settings: { scope: 'total' },
    });
    expect(noShield.totalDeductedXp).toBe(600);
    expect(noShield.newTotalXp).toBe(1400);
    expect(noShield.comebackQuest).not.toBeNull();
    expect(noShield.comebackQuest?.refundableXp).toBe(300);

    // Acceptance Case 4: Idempotency -> Running settleInactivity 5 times with recorded newEvents never deducts again
    let currentXp = noShield.newTotalXp;
    let events = [...noShield.newEvents];
    for (let i = 0; i < 5; i++) {
      const rerun = settleInactivity({
        startDayKey: '2026-10-20',
        todayKey: '2026-10-24',
        createdAt: 1_700_000_000_000,
        totalXp: currentXp,
        penaltyShields: 0,
        xpEvents: events,
        trainingPlan: [],
        activities: [],
        dailyQuestsByDay,
        streakLogs: {},
        settings: { scope: 'total' },
      });
      expect(rerun.totalDeductedXp).toBe(0);
      expect(rerun.newTotalXp).toBe(1400);
      currentXp = rerun.newTotalXp;
      events = [...events, ...rerun.newEvents];
    }

    // Acceptance Case 5: Rest Day & Vacation Mode reset the missed run and prevent penalty
    const onVacation = settleInactivity({
      startDayKey: '2026-10-20',
      todayKey: '2026-10-24',
      createdAt: 1_700_000_000_000,
      totalXp: 2000,
      penaltyShields: 0,
      xpEvents: [],
      trainingPlan: [],
      activities: [],
      vacationStartDayKey: '2026-10-21',
      vacationUntilDayKey: '2026-10-25',
      dailyQuestsByDay,
      streakLogs: {},
    });
    expect(onVacation.totalDeductedXp).toBe(0);
    expect(onVacation.newTotalXp).toBe(2000);
  });

  it('20. RankEngine (v0.10.5 Section 5 & 6): hides Final Rank M until unlocked and provides bilingual rank lore', () => {
    const lockedRanks = visibleRanks(160, false);
    expect(lockedRanks.length).toBe(7);
    expect(lockedRanks.some((r) => r.id === 'M')).toBe(false);

    const ssRank = lockedRanks.find((r) => r.id === 'SS')!;
    expect(formatRankLevelRange(ssRank, false)).toBe('Lv. 151+');
    expect(formatRankLevelRange(ssRank, true)).toBe('Lv. 151 – 220');

    // When Rank M is locked, getRankForLevel at Lv 160 hides nextRank (returns null)
    const ssInfo = getRankForLevel(160, {
      totalActiveDays: 100,
      unlockedBadgeCategoriesCount: 3,
    });
    expect(ssInfo.currentRank.id).toBe('SS');
    expect(ssInfo.nextRank).toBeNull();

    // When Rank M is unlocked, visibleRanks returns all 8 ranks
    const unlockedRanks = visibleRanks(225, true);
    expect(unlockedRanks.length).toBe(8);
    expect(unlockedRanks[7].id).toBe('M');

    for (const r of unlockedRanks) {
      const thDesc = getRankDescriptions(r, 'th');
      const enDesc = getRankDescriptions(r, 'en');
      expect(thDesc.game.length).toBeGreaterThan(10);
      expect(thDesc.real.length).toBeGreaterThan(10);
      expect(enDesc.game.length).toBeGreaterThan(10);
      expect(enDesc.real.length).toBeGreaterThan(10);
    }
  });

  it('21. PinSecurity & XpLedger (v0.10.5 Section 2 & 4): salted SHA-256 PIN verification, recovery code, lockout, and ledger reconciliation', () => {
    const salt = generatePinSalt();
    const hashed = hashPin('2580', salt);
    expect(hashed).not.toBe('2580');
    expect(
      verifyPin('2580', { appLockPin: null, appLockPinHash: hashed, appLockSalt: salt })
    ).toBe(true);
    expect(
      verifyPin('0000', { appLockPin: null, appLockPinHash: hashed, appLockSalt: salt })
    ).toBe(false);

    const recovery = generateRecoveryCode();
    expect(recovery.startsWith('AWK-')).toBe(true);
    expect(verifyRecoveryCode(recovery.toLowerCase(), recovery)).toBe(true);
    expect(verifyRecoveryCode('AWK-0000-0000', recovery)).toBe(false);

    expect(getLockoutDurationMs(4)).toBe(0);
    expect(getLockoutDurationMs(5)).toBe(30_000);
    expect(getLockoutDurationMs(6)).toBe(60_000);
    expect(getLockoutDurationMs(7)).toBe(300_000);
    expect(getLockoutDurationMs(8)).toBe(900_000);

    const reconciled = reconcileLedgerTotalXp(
      120,
      [
        {
          id: 1,
          amount: 100,
          sourceType: 'activity',
          sourceId: 10,
          reasonKey: 'workout',
          configVersion: 1,
          occurredAt: 1000,
        },
        {
          id: 2,
          amount: -30,
          sourceType: 'penalty',
          sourceId: '2026-10-23',
          reasonKey: 'inactivity_3d',
          configVersion: 1,
          occurredAt: 2000,
        },
      ],
      3000
    );
    expect(reconciled.addedOpeningEvent?.amount).toBe(50);
    expect(computeLedgerTotalXp(reconciled.events)).toBe(120);
  });
});
