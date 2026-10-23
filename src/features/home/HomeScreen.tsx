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
import { getDaysInWeekRange, getWeekdayOneBased } from '../../core/utils/dateUtils';

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
    adaptiveRecommendations,
    dailyRepeatableXpToday,
    logWater,
    swapDailyQuest,
    toggleRestModeToday,
    logRestDayCheckin,
    updateProfile,
  } = useAwakened();

  const [showCustomize, setShowCustomize] = useState(false);
  const lang = db.profile.language;
  const strings = t(lang);
  const isTh = lang === 'th';

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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
    >
      {/* Top RPG System Window Card */}
      <View
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
            <Text style={[styles.systemLabel, { color: theme.primary }]}>
              ◈ {strings.home.systemStatus}
            </Text>
            <Text style={[styles.playerName, { color: theme.text }]}>
              {db.profile.displayName}
            </Text>
          </View>
          <Pressable
            style={[
              styles.customizeBtn,
              { backgroundColor: theme.cardElevated, borderColor: theme.border },
            ]}
            onPress={() => setShowCustomize(!showCustomize)}
          >
            <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '700' }}>
              ⚙️ {strings.home.customizeCards}
            </Text>
          </Pressable>
        </View>

        <View style={{ marginTop: 8 }}>
          <RankBadge rank={currentRank} lang={lang} size="md" />
        </View>

        <XpBar
          levelState={levelState}
          theme={theme}
          dailyRepeatableXp={dailyRepeatableXpToday}
          lang={lang}
        />

        {/* Rest Mode / Recovery Toggle Bar */}
        <View style={styles.recoveryBar}>
          <Pressable
            style={[
              styles.restModeBtn,
              {
                backgroundColor: isRestToday ? `${theme.success}22` : theme.bgSecondary,
                borderColor: isRestToday ? theme.success : theme.border,
              },
            ]}
            onPress={toggleRestModeToday}
          >
            <Text
              style={{
                color: isRestToday ? theme.success : theme.textSecondary,
                fontSize: 12,
                fontWeight: '700',
              }}
            >
              {isRestToday ? strings.home.restDayActive : `🌿 ${strings.home.restDayButton}`}
            </Text>
          </Pressable>

          {isRestToday && (
            <Pressable
              style={[styles.restCheckinBtn, { backgroundColor: theme.success }]}
              onPress={() => logRestDayCheckin('Recovery check-in')}
            >
              <Text style={{ color: '#0E1220', fontSize: 12, fontWeight: '800' }}>
                ✓ {strings.home.checkInRest}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Dashboard Card Customizer Drawer */}
      {showCustomize && (
        <View
          style={[
            styles.card,
            { backgroundColor: theme.cardElevated, borderColor: theme.primary },
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 8 }]}>
            {isTh ? 'เปิด/ปิดการ์ดบนหน้า Dashboard' : 'Toggle Dashboard Cards'}
          </Text>
          <View style={styles.chipRow}>
            {[
              { key: 'water', label: isTh ? '💧 ดื่มน้ำด่วน' : '💧 Quick Water' },
              { key: 'quests', label: isTh ? '⚔️ ภารกิจรายวัน' : '⚔️ Daily Quests' },
              { key: 'streak', label: isTh ? '🔥 ความต่อเนื่อง' : '🔥 Streak' },
              { key: 'stats', label: isTh ? '📊 สรุปวันนี้' : '📊 Today Stats' },
              { key: 'adaptive', label: isTh ? '🧠 แผนปรับตัว' : '🧠 Adaptive Plan' },
            ].map((item) => {
              const active = !hiddenCards.has(item.key);
              return (
                <Pressable
                  key={item.key}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? `${theme.primary}25` : theme.bgSecondary,
                      borderColor: active ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => toggleCardVisibility(item.key)}
                >
                  <Text
                    style={{
                      color: active ? theme.primary : theme.textMuted,
                      fontWeight: '700',
                      fontSize: 12,
                    }}
                  >
                    {active ? '✓ ' : '+ '}
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* 1. One-Tap Water Card (<= 2 taps Principle 15.1) */}
      {!hiddenCards.has('water') && (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              💧 {strings.home.waterToday}
            </Text>
            <Text style={{ color: theme.water, fontWeight: '800', fontSize: 14 }}>
              {todayMetrics.water_ml.toLocaleString()} / {db.profile.waterGoalMl.toLocaleString()} ml
            </Text>
          </View>

          <View
            style={[
              styles.progressBarBg,
              { backgroundColor: theme.bgSecondary, borderColor: theme.border },
            ]}
          >
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(
                    100,
                    Math.round((todayMetrics.water_ml / Math.max(1, db.profile.waterGoalMl)) * 100)
                  )}%`,
                  backgroundColor: theme.water,
                },
              ]}
            />
          </View>

          <View style={styles.waterQuickRow}>
            {[100, 150, 250, 500].map((ml) => (
              <Pressable
                key={ml}
                style={[
                  styles.waterQuickBtn,
                  { backgroundColor: `${theme.water}18`, borderColor: theme.water },
                ]}
                onPress={() => logWater(ml)}
              >
                <Text style={{ color: theme.water, fontWeight: '800', fontSize: 13 }}>
                  +{ml}ml
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* 2. Daily Quests Card */}
      {!hiddenCards.has('quests') && (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              ⚔️ {strings.home.dailyQuests}
            </Text>
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
                {completedQuestsCount} / {todayQuests.length} ✓
              </Text>
            </View>
          </View>

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
                    <Text
                      style={[
                        styles.questTitle,
                        {
                          color: done ? theme.success : theme.text,
                          textDecorationLine: done ? 'line-through' : 'none',
                        },
                      ]}
                    >
                      {done ? '☑ ' : '☐ '}
                      {isTh ? q.template.title_th : q.template.title_en}
                    </Text>
                  </View>
                  <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>
                    {isTh ? 'ความคืบหน้า' : 'Progress'}: {q.progress} / {q.target} ({pct}%)
                  </Text>
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
                  {!done && !swapAlreadyUsed && (
                    <Pressable
                      style={[styles.swapMiniBtn, { borderColor: theme.border }]}
                      onPress={() => swapDailyQuest(q.id)}
                    >
                      <Text style={{ color: theme.textSecondary, fontSize: 10 }}>
                        🔄 {isTh ? 'สลับ' : 'Swap'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}

          <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 6 }}>
            {isTh
              ? '💡 ทำครบทุกข้อรับโบนัสพิเศษ +30 XP (ไม่คิดรวมใน Soft Cap)'
              : '💡 Complete all Daily Quests for +30 Bonus XP (bypasses Soft Cap)'}
          </Text>
        </View>
      )}

      {/* 3. Streak & Weekly Consistency Card */}
      {!hiddenCards.has('streak') && (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              🔥 {strings.home.streakTitle}
            </Text>
            <Text style={{ color: theme.warning, fontWeight: '800', fontSize: 14 }}>
              🔥 {streakState.currentStreak} {isTh ? 'วัน' : 'days'}
            </Text>
          </View>

          <View style={styles.streakStatsRow}>
            <View style={[styles.streakBox, { backgroundColor: theme.bgSecondary }]}>
              <Text style={[styles.streakNum, { color: theme.warning }]}>
                {streakState.currentStreak}
              </Text>
              <Text style={[styles.streakLabel, { color: theme.textSecondary }]}>
                {strings.home.dayStreak}
              </Text>
            </View>

            <View style={[styles.streakBox, { backgroundColor: theme.bgSecondary }]}>
              <Text style={[styles.streakNum, { color: theme.water }]}>
                ❄️ {streakState.freezeTokensRemaining}/2
              </Text>
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
                  <Text
                    style={{
                      color: st ? '#0E1220' : theme.textMuted,
                      fontSize: 10,
                    }}
                  >
                    {st === 'active' ? '✓' : st === 'rest' ? '🌿' : st === 'frozen' ? '❄️' : '·'}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* 4. 2x2 Summary Stat Grid (Matches Wireframe 15.5) */}
      {!hiddenCards.has('stats') && (
        <View style={styles.statsGrid}>
          <Pressable
            style={[styles.statTile, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => onNavigateTab('track')}
          >
            <Text style={[styles.statTileHeader, { color: theme.water }]}>
              💧 {strings.home.waterToday}
            </Text>
            <Text style={[styles.statTileValue, { color: theme.text }]}>
              {todayMetrics.water_ml.toLocaleString()} ml
            </Text>
            <Text style={{ color: theme.textMuted, fontSize: 11 }}>
              {isTh ? `เป้าหมาย ${db.profile.waterGoalMl} ml` : `Goal ${db.profile.waterGoalMl} ml`}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.statTile, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => onNavigateTab('train')}
          >
            <Text style={[styles.statTileHeader, { color: theme.focus }]}>
              ⏱️ {strings.home.focusToday}
            </Text>
            <Text style={[styles.statTileValue, { color: theme.text }]}>
              {todayMetrics.pomodoro_count} {isTh ? 'รอบ' : 'rounds'}
            </Text>
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
            <Text style={[styles.statTileHeader, { color: theme.workout }]}>
              🏋️ {strings.home.workoutToday}
            </Text>
            <Text style={[styles.statTileValue, { color: theme.text }]}>
              {todayMetrics.workout_min} {isTh ? 'นาที' : 'min'}
            </Text>
            <Text style={{ color: theme.textMuted, fontSize: 11 }}>
              {todayMetrics.workout_count} {isTh ? 'ครั้งวันนี้' : 'sessions today'}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.statTile, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => onNavigateTab('track')}
          >
            <Text style={[styles.statTileHeader, { color: theme.meal }]}>
              🍚 {strings.home.mealsToday}
            </Text>
            <Text style={[styles.statTileValue, { color: theme.text }]}>
              {todayMetrics.meal_count} {isTh ? 'มื้อ' : 'meals'}
            </Text>
            <Text style={{ color: theme.textMuted, fontSize: 11 }}>
              ~{totalEstKcal.toLocaleString()} kcal ({strings.track.estimateBadge})
            </Text>
          </Pressable>
        </View>
      )}

      {/* 5. Adaptive Personal Plan Card */}
      {!hiddenCards.has('adaptive') && (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 8 }]}>
            🧠 {strings.profile.adaptivePlan}
          </Text>
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
                <Pressable
                  style={[styles.adaptiveActionBtn, { backgroundColor: theme.primary }]}
                  onPress={() =>
                    updateProfile({ weeklyGoalDays: rec.suggestedWeeklyGoalDays })
                  }
                >
                  <Text style={{ color: '#0E1220', fontWeight: '800', fontSize: 12 }}>
                    {rec.actionLabel}
                  </Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
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
  progressBarBg: {
    height: 10,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
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
