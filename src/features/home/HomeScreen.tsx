import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppTheme } from '../../app/theme';
import { useAwakened } from '../../data/repository';
import { t } from '../../l10n/translations';
import { RankBadge, XpBar } from '../components/SystemSharedComponents';
import { AppIcon, AppIconName } from '../components/AppIcons';
import {
  AnimatedCard,
  AnimatedNumberText,
  AnimatedPressable,
  AnimatedProgressBar,
  AnimatedPulseView,
} from '../components/AnimatedComponents';
import { getDaysInWeekRange, getWeekdayOneBased } from '../../core/utils/dateUtils';
import {
  getNarratorMessages,
  getPathLabel,
  getStarterClassLabel,
} from '../../core/engine/onboardingEngine';

export const HomeScreen: React.FC<{
  theme: AppTheme;
  onNavigateTab: (tab: 'home' | 'track' | 'train' | 'journey' | 'profile') => void;
}> = ({ theme, onNavigateTab }) => {
  const {
    db,
    todayKey,
    levelState,
    currentRank,
    streakState,
    todayMetrics,
    todayQuests,
    dailyNutrition,
    workoutPenalty,
    adaptiveRecommendations,
    dailyRepeatableXpToday,
    logWater,
    swapDailyQuest,
    completeManualDailyQuest,
    toggleRestModeToday,
    logRestDayCheckin,
    updateProfile,
    reopenOnboarding,
  } = useAwakened();

  const [showCustomize, setShowCustomize] = useState(false);
  const lang = db.profile.language;
  const strings = t(lang);
  const isTh = lang === 'th';
  const reduceMotion = db.profile.reduceEffects;

  const completedQuestsCount = todayQuests.filter((q) => q.status === 'completed').length;
  const swapAlreadyUsed = db.profile.dailyQuestSwapUsedDay === todayKey;
  const isRestToday =
    db.profile.restModeToday === todayKey ||
    db.trainingPlan.find((d) => d.weekday === getWeekdayOneBased(todayKey))?.dayType === 'rest';

  const weekDays = getDaysInWeekRange(todayKey, db.profile.weekStartDay);
  const dayNamesTh = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];
  const dayNamesEn = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const hiddenCards = new Set(db.profile.hiddenDashboardCards ?? []);
  const toggleCardVisibility = (cardKey: string) => {
    const next = new Set(hiddenCards);
    if (next.has(cardKey)) next.delete(cardKey);
    else next.add(cardKey);
    updateProfile({ hiddenDashboardCards: Array.from(next) });
  };

  // Calculate today's estimated calories range
  const todayMeals = db.activities.filter(
    (a) => !a.deletedAt && a.type === 'meal' && a.occurredAt >= new Date(todayKey).getTime() - 86400000
  );
  const totalEstKcal = todayMeals.reduce((s, m) => s + (m.mealDetail?.caloriesEst ?? m.value ?? 0), 0);
  const waterPct = Math.min(
    100,
    Math.round((todayMetrics.water_ml / Math.max(1, db.profile.waterGoalMl)) * 100)
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
    >
      {/* Top RPG System Window Card */}
      <AnimatedCard
        index={0}
        reduceMotion={reduceMotion}
        style={[
          styles.systemWindow,
          {
            backgroundColor: theme.card,
            borderColor: currentRank.color,
          },
        ]}
      >
        <View style={styles.systemTopRow}>
          <View>
            <View style={styles.inlineIconRow}>
              <AppIcon name="bolt" size={14} color={theme.primary} />
              <Text style={[styles.systemLabel, { color: theme.primary }]}>
                {strings.home.systemStatus}
              </Text>
            </View>
            <Text style={[styles.playerName, { color: theme.text }]}>
              {db.profile.displayName}
            </Text>
          </View>
          <AnimatedPressable
            reduceMotion={reduceMotion}
            style={[
              styles.customizeBtn,
              { backgroundColor: theme.cardElevated, borderColor: theme.border },
            ]}
            onPress={() => setShowCustomize(!showCustomize)}
          >
            <View style={styles.inlineIconRow}>
              <AppIcon name="settings" size={14} color={theme.textSecondary} />
              <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '700' }}>
                {strings.home.customizeCards}
              </Text>
            </View>
          </AnimatedPressable>
        </View>

        <View style={{ marginTop: 8 }}>
          <RankBadge rank={currentRank} lang={lang} size="md" reduceMotion={reduceMotion} />
        </View>

        <XpBar
          levelState={levelState}
          theme={theme}
          dailyRepeatableXp={dailyRepeatableXpToday}
          lang={lang}
          reduceMotion={reduceMotion}
        />

        {/* Awakening Vow, Starter Class & Base Stats (STR / VIT / INT / WIL) */}
        {db.onboarding && (
          <View
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 12,
              backgroundColor: theme.bgSecondary,
              borderWidth: 1,
              borderColor: theme.border,
              gap: 6,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
              <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '800' }}>
                {getStarterClassLabel(db.onboarding.starterClass, lang).name} ·{' '}
                {getPathLabel(db.onboarding.path, lang)}
              </Text>
              <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700' }}>
                Tier {db.onboarding.startTier}/4 · ~{db.onboarding.minutesPerDay}m
              </Text>
            </View>

            {Boolean(db.onboarding.vow) && (
              <Text style={{ color: theme.text, fontSize: 13, fontWeight: '800' }}>
                Vow: “{db.onboarding.vow}”
              </Text>
            )}

            <Text style={{ color: theme.success, fontSize: 11.5, fontWeight: '600' }}>
              {getNarratorMessages(db.onboarding.narrator, lang).dailyGreeting}
            </Text>

            {/* 4 RPG Stats Pills */}
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
              {(
                [
                  { k: 'STR', v: db.playerStats?.STR ?? 12, c: '#F97316' },
                  { k: 'VIT', v: db.playerStats?.VIT ?? 12, c: '#3DDC97' },
                  { k: 'INT', v: db.playerStats?.INT ?? 12, c: '#5B8CFF' },
                  { k: 'WIL', v: db.playerStats?.WIL ?? 12, c: '#A855F7' },
                ] as const
              ).map((st) => (
                <View
                  key={st.k}
                  style={{
                    flex: 1,
                    paddingVertical: 6,
                    paddingHorizontal: 6,
                    borderRadius: 8,
                    backgroundColor: theme.card,
                    borderWidth: 1,
                    borderColor: `${st.c}55`,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: st.c, fontSize: 10.5, fontWeight: '900' }}>{st.k}</Text>
                  <Text style={{ color: theme.text, fontSize: 14, fontWeight: '900' }}>
                    {st.v}
                  </Text>
                </View>
              ))}
            </View>

            {!db.onboarding.pledgedAt && (
              <AnimatedPressable
                reduceMotion={reduceMotion}
                style={{
                  marginTop: 6,
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  borderRadius: 8,
                  backgroundColor: `${theme.primary}20`,
                  borderWidth: 1,
                  borderColor: theme.primary,
                  alignItems: 'center',
                }}
                onPress={reopenOnboarding}
              >
                <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '800' }}>
                  {isTh
                    ? 'พร้อมทำแบบสอบถาม / ปฏิญาณเริ่มต้นเพื่อรับ +50 XP คลิกที่นี่'
                    : 'Ready to complete your Awakening Pledge (+50 XP)? Tap here'}
                </Text>
              </AnimatedPressable>
            )}
          </View>
        )}

        {/* Rest Mode / Recovery Toggle Bar */}
        <View style={styles.recoveryBar}>
          <AnimatedPressable
            reduceMotion={reduceMotion}
            style={[
              styles.restModeBtn,
              {
                backgroundColor: isRestToday ? `${theme.success}22` : theme.bgSecondary,
                borderColor: isRestToday ? theme.success : theme.border,
              },
            ]}
            onPress={toggleRestModeToday}
          >
            <View style={styles.inlineIconRow}>
              <AppIcon
                name="leaf"
                size={14}
                color={isRestToday ? theme.success : theme.textSecondary}
              />
              <Text
                style={{
                  color: isRestToday ? theme.success : theme.textSecondary,
                  fontSize: 12,
                  fontWeight: '700',
                }}
              >
                {isRestToday ? strings.home.restDayActive : strings.home.restDayButton}
              </Text>
            </View>
          </AnimatedPressable>

          {isRestToday && (
            <AnimatedPressable
              reduceMotion={reduceMotion}
              style={[styles.restCheckinBtn, { backgroundColor: theme.success }]}
              onPress={() => logRestDayCheckin('Recovery check-in')}
            >
              <View style={styles.inlineIconRow}>
                <AppIcon name="check" size={13} color="#0E1220" />
                <Text style={{ color: '#0E1220', fontSize: 12, fontWeight: '800' }}>
                  {strings.home.checkInRest}
                </Text>
              </View>
            </AnimatedPressable>
          )}
        </View>
      </AnimatedCard>

      {/* Dashboard Card Customizer Drawer */}
      {showCustomize && (
        <AnimatedCard
          index={1}
          reduceMotion={reduceMotion}
          style={[
            styles.card,
            { backgroundColor: theme.cardElevated, borderColor: theme.primary },
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 8 }]}>
            {isTh ? 'เปิด/ปิดการ์ดบนหน้า Dashboard' : 'Toggle Dashboard Cards'}
          </Text>
          <View style={styles.chipRow}>
            {(
              [
                { key: 'water', icon: 'water' as AppIconName, label: isTh ? 'ดื่มน้ำด่วน' : 'Quick Water' },
                { key: 'quests', icon: 'quest' as AppIconName, label: isTh ? 'ภารกิจรายวัน' : 'Daily Quests' },
                { key: 'streak', icon: 'fire' as AppIconName, label: isTh ? 'ความต่อเนื่อง' : 'Streak' },
                { key: 'stats', icon: 'chart' as AppIconName, label: isTh ? 'สรุปวันนี้' : 'Today Stats' },
                { key: 'adaptive', icon: 'brain' as AppIconName, label: isTh ? 'แผนปรับตัว' : 'Adaptive Plan' },
              ]
            ).map((item) => {
              const active = !hiddenCards.has(item.key);
              return (
                <AnimatedPressable
                  key={item.key}
                  reduceMotion={reduceMotion}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? `${theme.primary}25` : theme.bgSecondary,
                      borderColor: active ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => toggleCardVisibility(item.key)}
                >
                  <View style={styles.inlineIconRow}>
                    <AppIcon
                      name={item.icon}
                      size={13}
                      color={active ? theme.primary : theme.textMuted}
                    />
                    <Text
                      style={{
                        color: active ? theme.primary : theme.textMuted,
                        fontWeight: '700',
                        fontSize: 12,
                      }}
                    >
                      {item.label}
                    </Text>
                  </View>
                </AnimatedPressable>
              );
            })}
          </View>
        </AnimatedCard>
      )}

      {/* 1. One-Tap Water Card (<= 2 taps Principle 15.1) */}
      {!hiddenCards.has('water') && (
        <AnimatedCard
          index={1}
          reduceMotion={reduceMotion}
          style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.inlineIconRow}>
              <AppIcon name="water" size={18} color={theme.water} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {strings.home.waterToday}
              </Text>
            </View>
            <AnimatedNumberText
              value={todayMetrics.water_ml}
              reduceMotion={reduceMotion}
              style={{ color: theme.water, fontWeight: '800', fontSize: 14 }}
            >
              {todayMetrics.water_ml.toLocaleString()} / {db.profile.waterGoalMl.toLocaleString()} ml
            </AnimatedNumberText>
          </View>

          <AnimatedProgressBar
            percent={waterPct}
            fillColor={theme.water}
            trackColor={theme.bgSecondary}
            borderColor={theme.border}
            height={10}
            reduceMotion={reduceMotion}
            style={{ marginBottom: 12 }}
          />

          <View style={styles.waterQuickRow}>
            {[100, 150, 250, 500].map((ml) => (
              <AnimatedPressable
                key={ml}
                reduceMotion={reduceMotion}
                style={[
                  styles.waterQuickBtn,
                  { backgroundColor: `${theme.water}18`, borderColor: theme.water },
                ]}
                onPress={() => logWater(ml)}
              >
                <Text style={{ color: theme.water, fontWeight: '800', fontSize: 13 }}>
                  +{ml}ml
                </Text>
              </AnimatedPressable>
            ))}
          </View>
        </AnimatedCard>
      )}

      {/* 2. Daily Quests Card */}
      {!hiddenCards.has('quests') && (
        <AnimatedCard
          index={2}
          reduceMotion={reduceMotion}
          style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.inlineIconRow}>
              <AppIcon name="quest" size={18} color={theme.primary} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {strings.home.dailyQuests}
              </Text>
            </View>
            <View
              style={[
                styles.questCountBadge,
                {
                  backgroundColor:
                    completedQuestsCount === todayQuests.length
                      ? `${theme.success}25`
                      : `${theme.primary}22`,
                },
              ]}
            >
              <Text
                style={{
                  color:
                    completedQuestsCount === todayQuests.length ? theme.success : theme.primary,
                  fontWeight: '800',
                  fontSize: 13,
                }}
              >
                {completedQuestsCount} / {todayQuests.length}
              </Text>
            </View>
          </View>

          {/* Active Workout Penalty Warning Banner */}
          {workoutPenalty.active && (
            <View
              style={{
                backgroundColor: `${theme.danger}20`,
                borderColor: theme.danger,
                borderWidth: 1,
                borderRadius: 10,
                padding: 10,
                marginTop: 8,
                marginBottom: 6,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 16 }}>⚠️</Text>
              <Text style={{ color: theme.danger, fontSize: 11, fontWeight: '800', flex: 1 }}>
                {isTh
                  ? '⚠️ ระบบเปิดใช้งานบทลงโทษ: ภารกิจฝึกร่างกายวันนี้เข้มงวดยิ่งขึ้นเนื่องจากมีบทลงโทษที่ยังไม่เสร็จสิ้น (ไม่ทำจะได้รับบทลงโทษต่อเนื่อง)'
                  : '⚠️ Workout Penalty Active: Today’s workout training requirement is intensified.'}
              </Text>
            </View>
          )}

          {todayQuests.map((q) => {
            const done = q.status === 'completed';
            const pct = Math.min(100, Math.round((q.progress / Math.max(1, q.target)) * 100));
            return (
              <View
                key={q.id}
                style={[
                  styles.questRow,
                  {
                    backgroundColor: done ? `${theme.success}12` : theme.bgSecondary,
                    borderColor: done ? theme.success : theme.border,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.questTitleLine}>
                    <View
                      style={[
                        styles.checkCircle,
                        {
                          borderColor: done ? theme.success : theme.textMuted,
                          backgroundColor: done ? theme.success : 'transparent',
                        },
                      ]}
                    >
                      {done && <AppIcon name="check" size={11} color="#0E1220" />}
                    </View>
                    <Text
                      style={[
                        styles.questTitle,
                        {
                          color: done ? theme.success : theme.text,
                          textDecorationLine: done ? 'line-through' : 'none',
                        },
                      ]}
                    >
                      {isTh ? q.template.title_th : q.template.title_en}
                    </Text>
                  </View>
                  <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 4 }}>
                    {isTh ? 'ความคืบหน้า' : 'Progress'}: {q.progress} / {q.target} ({pct}%)
                  </Text>
                  {q.template.warning_th && (
                    <Text style={{ color: theme.warning, fontSize: 11, marginTop: 3 }}>
                      {isTh ? q.template.warning_th : q.template.warning_en}
                    </Text>
                  )}
                </View>

                <View style={styles.questRightCol}>
                  <Text
                    style={{
                      color: done ? theme.success : theme.primary,
                      fontWeight: '800',
                      fontSize: 13,
                    }}
                  >
                    +{q.template.reward_xp} XP
                  </Text>
                  {!done && (
                    <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
                      {(q.template.condition.metric === 'manual' || q.template.micro) && (
                        <AnimatedPressable
                          reduceMotion={reduceMotion}
                          style={[
                            styles.swapMiniBtn,
                            {
                              backgroundColor: `${theme.success}22`,
                              borderColor: theme.success,
                            },
                          ]}
                          onPress={() => completeManualDailyQuest(q.id)}
                        >
                          <View style={styles.inlineIconRow}>
                            <AppIcon name="check" size={11} color={theme.success} />
                            <Text
                              style={{
                                color: theme.success,
                                fontSize: 10,
                                fontWeight: '800',
                              }}
                            >
                              {isTh ? 'สำเร็จ' : 'Done'}
                            </Text>
                          </View>
                        </AnimatedPressable>
                      )}
                      {!swapAlreadyUsed && (
                        <AnimatedPressable
                          reduceMotion={reduceMotion}
                          style={[styles.swapMiniBtn, { borderColor: theme.border }]}
                          onPress={() => swapDailyQuest(q.id)}
                        >
                          <View style={styles.inlineIconRow}>
                            <AppIcon name="swap" size={11} color={theme.textSecondary} />
                            <Text
                              style={{
                                color: theme.textSecondary,
                                fontSize: 10,
                                fontWeight: '700',
                              }}
                            >
                              {isTh ? 'สลับ' : 'Swap'}
                            </Text>
                          </View>
                        </AnimatedPressable>
                      )}
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          <View style={[styles.inlineIconRow, { marginTop: 6 }]}>
            <AppIcon name="star" size={13} color={theme.warning} />
            <Text style={{ color: theme.textMuted, fontSize: 11 }}>
              {isTh
                ? 'ทำครบทุกข้อรับโบนัสพิเศษ +30 XP (ไม่คิดรวมใน Soft Cap)'
                : 'Complete all Daily Quests for +30 Bonus XP (bypasses Soft Cap)'}
            </Text>
          </View>

          <View style={[styles.inlineIconRow, { marginTop: 4 }]}>
            <AppIcon name="shield" size={12} color={theme.textMuted} />
            <Text style={{ color: theme.textMuted, fontSize: 11 }}>
              {isTh
                ? 'คำเตือน: ไม่ทำจะได้รับบทลงโทษในวันถัดไป'
                : 'Warning: Incomplete daily missions will trigger penalties on the next active day.'}
            </Text>
          </View>
        </AnimatedCard>
      )}

      {/* 3. Streak & Weekly Consistency Card */}
      {!hiddenCards.has('streak') && (
        <AnimatedCard
          index={3}
          reduceMotion={reduceMotion}
          style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.inlineIconRow}>
              <AnimatedPulseView
                active={streakState.currentStreak > 0}
                reduceMotion={reduceMotion}
                minScale={1}
                maxScale={1.12}
                duration={1200}
              >
                <AppIcon name="fire" size={18} color={theme.warning} />
              </AnimatedPulseView>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {strings.home.streakTitle}
              </Text>
            </View>
            <Text style={{ color: theme.warning, fontWeight: '800', fontSize: 14 }}>
              {streakState.currentStreak} {isTh ? 'วัน' : 'days'}
            </Text>
          </View>

          <View style={styles.streakStatsRow}>
            <View style={[styles.streakBox, { backgroundColor: theme.bgSecondary }]}>
              <AnimatedNumberText
                value={streakState.currentStreak}
                reduceMotion={reduceMotion}
                style={[styles.streakNum, { color: theme.warning }]}
              />
              <Text style={[styles.streakLabel, { color: theme.textSecondary }]}>
                {strings.home.dayStreak}
              </Text>
            </View>

            <View style={[styles.streakBox, { backgroundColor: theme.bgSecondary }]}>
              <View style={styles.inlineIconRow}>
                <AppIcon name="snowflake" size={14} color={theme.water} />
                <Text style={[styles.streakNum, { color: theme.water }]}>
                  {streakState.freezeTokensRemaining}/2
                </Text>
              </View>
              <Text style={[styles.streakLabel, { color: theme.textSecondary }]}>
                {strings.home.freezeTokens}
              </Text>
            </View>

            <View style={[styles.streakBox, { backgroundColor: theme.bgSecondary }]}>
              <Text style={[styles.streakNum, { color: theme.success }]}>
                {streakState.weeklyActiveDays}/{streakState.weeklyGoalDays}
              </Text>
              <Text style={[styles.streakLabel, { color: theme.textSecondary }]}>
                {strings.home.weeklyConsistency}
              </Text>
            </View>
          </View>

          {/* 7-day Week Pills */}
          <View style={styles.weekPillsRow}>
            {weekDays.map((dk, idx) => {
              const st = streakState.updatedLogs[dk];
              const isToday = dk === todayKey;
              const bg =
                st === 'active'
                  ? theme.success
                  : st === 'rest'
                  ? theme.primary
                  : st === 'frozen'
                  ? theme.water
                  : theme.bgSecondary;
              return (
                <View
                  key={dk}
                  style={[
                    styles.dayPill,
                    {
                      backgroundColor: bg,
                      borderColor: isToday ? theme.warning : theme.border,
                      borderWidth: isToday ? 2 : 1,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: st ? '#0E1220' : theme.textSecondary,
                      fontWeight: '800',
                      fontSize: 11,
                    }}
                  >
                    {isTh ? dayNamesTh[idx] : dayNamesEn[idx]}
                  </Text>
                  <View style={{ marginTop: 2, height: 12, justifyContent: 'center' }}>
                    {st === 'active' ? (
                      <AppIcon name="check" size={11} color="#0E1220" />
                    ) : st === 'rest' ? (
                      <AppIcon name="leaf" size={11} color="#0E1220" />
                    ) : st === 'frozen' ? (
                      <AppIcon name="snowflake" size={11} color="#0E1220" />
                    ) : (
                      <Text style={{ color: theme.textMuted, fontSize: 10 }}>·</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </AnimatedCard>
      )}

      {/* 4. 2x2 Summary Stat Grid (Matches Wireframe 15.5) */}
      {!hiddenCards.has('stats') && (
        <AnimatedCard index={4} reduceMotion={reduceMotion} style={styles.statsGrid}>
          <Pressable
            style={[styles.statTile, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => onNavigateTab('track')}
          >
            <View style={styles.inlineIconRow}>
              <AppIcon name="water" size={15} color={theme.water} />
              <Text style={[styles.statTileHeader, { color: theme.water }]}>
                {strings.home.waterToday}
              </Text>
            </View>
            <AnimatedNumberText
              value={todayMetrics.water_ml}
              reduceMotion={reduceMotion}
              style={[styles.statTileValue, { color: theme.text }]}
            >
              {todayMetrics.water_ml.toLocaleString()} ml
            </AnimatedNumberText>
            <Text style={{ color: theme.textMuted, fontSize: 11 }}>
              {isTh ? `เป้าหมาย ${db.profile.waterGoalMl} ml` : `Goal ${db.profile.waterGoalMl} ml`}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.statTile, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => onNavigateTab('train')}
          >
            <View style={styles.inlineIconRow}>
              <AppIcon name="clock" size={15} color={theme.focus} />
              <Text style={[styles.statTileHeader, { color: theme.focus }]}>
                {strings.home.focusToday}
              </Text>
            </View>
            <AnimatedNumberText
              value={todayMetrics.pomodoro_count}
              reduceMotion={reduceMotion}
              style={[styles.statTileValue, { color: theme.text }]}
            >
              {todayMetrics.pomodoro_count} {isTh ? 'รอบ' : 'rounds'}
            </AnimatedNumberText>
            <Text style={{ color: theme.textMuted, fontSize: 11 }}>
              {isTh
                ? `สัปดาห์นี้ ${todayMetrics.weekly_focus_min} นาที`
                : `${todayMetrics.weekly_focus_min} min this week`}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.statTile, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => onNavigateTab('train')}
          >
            <View style={styles.inlineIconRow}>
              <AppIcon name="dumbbell" size={15} color={theme.workout} />
              <Text style={[styles.statTileHeader, { color: theme.workout }]}>
                {strings.home.workoutToday}
              </Text>
            </View>
            <AnimatedNumberText
              value={todayMetrics.workout_min}
              reduceMotion={reduceMotion}
              style={[styles.statTileValue, { color: theme.text }]}
            >
              {todayMetrics.workout_min} {isTh ? 'นาที' : 'min'}
            </AnimatedNumberText>
            <Text style={{ color: theme.textMuted, fontSize: 11 }}>
              {todayMetrics.workout_count} {isTh ? 'ครั้งวันนี้' : 'sessions today'}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.statTile, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => onNavigateTab('track')}
          >
            <View style={styles.inlineIconRow}>
              <AppIcon name="meal" size={15} color={theme.meal} />
              <Text style={[styles.statTileHeader, { color: theme.meal }]}>
                {strings.home.mealsToday}
              </Text>
            </View>
            <AnimatedNumberText
              value={todayMetrics.meal_count}
              reduceMotion={reduceMotion}
              style={[styles.statTileValue, { color: theme.text }]}
            >
              {todayMetrics.meal_count} {isTh ? 'มื้อ' : 'meals'}
            </AnimatedNumberText>
            <Text style={{ color: theme.textMuted, fontSize: 11 }}>
              {dailyNutrition.kcal.toLocaleString()} kcal ({dailyNutrition.mealCount} {isTh ? 'มื้อ' : 'meals'})
            </Text>
          </Pressable>

          {/* Daily Calorie & Nutrition Summary Breakdown */}
          <View
            style={[
              styles.adaptiveItem,
              {
                backgroundColor: theme.bgSecondary,
                borderColor: `${theme.meal}55`,
                borderWidth: 1,
                marginTop: 10,
                borderRadius: 12,
                padding: 12,
              },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <View style={styles.inlineIconRow}>
                <AppIcon name="meal" size={16} color={theme.meal} />
                <Text style={{ color: theme.text, fontSize: 13, fontWeight: '800' }}>
                  {isTh ? 'สรุปแคลอรี่วันนี้ (Daily Calories)' : "Today's Calorie Summary"}
                </Text>
              </View>
              <Text style={{ color: theme.meal, fontSize: 14, fontWeight: '900' }}>
                {dailyNutrition.kcal.toLocaleString()} kcal
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: `${theme.primary}15`,
                  padding: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: `${theme.primary}33`,
                }}
              >
                <Text style={{ color: theme.textMuted, fontSize: 10, fontWeight: '700' }}>
                  {isTh ? 'โปรตีน' : 'Protein'}
                </Text>
                <Text
                  style={{
                    color: theme.primary,
                    fontSize: 13,
                    fontWeight: '900',
                    marginTop: 2,
                  }}
                >
                  {dailyNutrition.proteinG} g
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  backgroundColor: `${theme.warning}15`,
                  padding: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: `${theme.warning}33`,
                }}
              >
                <Text style={{ color: theme.textMuted, fontSize: 10, fontWeight: '700' }}>
                  {isTh ? 'คาร์บ' : 'Carbs'}
                </Text>
                <Text
                  style={{
                    color: theme.warning,
                    fontSize: 13,
                    fontWeight: '900',
                    marginTop: 2,
                  }}
                >
                  {dailyNutrition.carbsG} g
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  backgroundColor: `${theme.danger}15`,
                  padding: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: `${theme.danger}33`,
                }}
              >
                <Text style={{ color: theme.textMuted, fontSize: 10, fontWeight: '700' }}>
                  {isTh ? 'ไขมัน' : 'Fat'}
                </Text>
                <Text
                  style={{
                    color: theme.danger,
                    fontSize: 13,
                    fontWeight: '900',
                    marginTop: 2,
                  }}
                >
                  {dailyNutrition.fatG} g
                </Text>
              </View>
            </View>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: 8,
                paddingTop: 6,
                borderTopWidth: 1,
                borderTopColor: `${theme.border}44`,
              }}
            >
              <Text style={{ color: theme.textMuted, fontSize: 11 }}>
                {isTh
                  ? `เช้า ${dailyNutrition.bySlot.breakfast} · เที่ยง ${dailyNutrition.bySlot.lunch} · เย็น ${dailyNutrition.bySlot.dinner} · ว่าง ${dailyNutrition.bySlot.snack} kcal`
                  : `B: ${dailyNutrition.bySlot.breakfast} · L: ${dailyNutrition.bySlot.lunch} · D: ${dailyNutrition.bySlot.dinner} · S: ${dailyNutrition.bySlot.snack} kcal`}
              </Text>
            </View>
          </View>
        </AnimatedCard>
      )}

      {/* 5. Adaptive Personal Plan Card */}
      {!hiddenCards.has('adaptive') && (
        <AnimatedCard
          index={5}
          reduceMotion={reduceMotion}
          style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <View style={[styles.inlineIconRow, { marginBottom: 8 }]}>
            <AppIcon name="brain" size={18} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {strings.profile.adaptivePlan}
            </Text>
          </View>
          {adaptiveRecommendations.map((rec) => (
            <View
              key={rec.id}
              style={[
                styles.adaptiveItem,
                { backgroundColor: theme.bgSecondary, borderColor: theme.border },
              ]}
            >
              <Text style={{ color: theme.primary, fontWeight: '800', fontSize: 13 }}>
                {rec.title}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4, lineHeight: 18 }}>
                {rec.description}
              </Text>
              {rec.suggestedWeeklyGoalDays && (
                <AnimatedPressable
                  reduceMotion={reduceMotion}
                  style={[styles.adaptiveActionBtn, { backgroundColor: theme.primary }]}
                  onPress={() =>
                    updateProfile({ weeklyGoalDays: rec.suggestedWeeklyGoalDays })
                  }
                >
                  <Text style={{ color: '#0E1220', fontWeight: '800', fontSize: 12 }}>
                    {rec.actionLabel}
                  </Text>
                </AnimatedPressable>
              )}
            </View>
          ))}
        </AnimatedCard>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
    gap: 14,
  },
  inlineIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  systemWindow: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
  },
  systemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  systemLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  playerName: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  customizeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  recoveryBar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  restModeBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restCheckinBtn: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 15,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  waterQuickRow: {
    flexDirection: 'row',
    gap: 8,
  },
  waterQuickBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  questCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  questTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  questRightCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  swapMiniBtn: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  streakStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  streakBox: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  streakNum: {
    fontSize: 18,
    fontWeight: '900',
  },
  streakLabel: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  weekPillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  dayPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statTile: {
    width: '48.2%',
    borderRadius: 15,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  statTileHeader: {
    fontSize: 12,
    fontWeight: '800',
  },
  statTileValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  adaptiveItem: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  adaptiveActionBtn: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
});
