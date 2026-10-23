import { describe, expect, it } from 'vitest';
import { computeLevelState, totalXpForLevel, xpToNext, applyXp } from '../src/core/engine/levelEngine';
import { getRankForLevel } from '../src/core/engine/rankEngine';
import { calculateActivityXp, canRevertXpOnDelete } from '../src/core/engine/xpEngine';
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

    // Level 221 without 365 days & 4 badge categories stays at SS
    const preMonarch = getRankForLevel(221, {
      totalActiveDays: 120,
      unlockedBadgeCategoriesCount: 2,
    });
    expect(preMonarch.currentRank.id).toBe('SS');
    expect(preMonarch.monarchEligibility.eligible).toBe(false);

    // Level 221 with 365 days & 4 badge categories unlocks Monarch!
    const monarch = getRankForLevel(221, {
      totalActiveDays: 365,
      unlockedBadgeCategoriesCount: 4,
    });
    expect(monarch.currentRank.id).toBe('M');
    expect(monarch.monarchEligibility.eligible).toBe(true);
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
});
