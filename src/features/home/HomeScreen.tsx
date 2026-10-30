import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppTheme, colors, radius, stroke } from '../../app/theme';
import { useAwakened } from '../../data/repository';
import { t } from '../../l10n/translations';
import { PlayerStatKey } from '../../core/engine/types';
import { RankBadge, XpBar } from '../components/SystemSharedComponents';
import { AppIcon, AppIconName } from '../components/AppIcons';
import {
  AvatarChip,
  AwakenMascot,
  DateDot,
  DripEdge,
  InkCard,
  InkDifficultyDrops,
  PillButton,
  StatMiniCard,
} from '../components/InkComponents';
import {
  AnimatedCard,
  AnimatedNumberText,
  AnimatedPressable,
  AnimatedProgressBar,
} from '../components/AnimatedComponents';
import {
  addDaysToDayKey,
  getDaysInWeekRange,
  getLocalDayKey,
  getWeekdayOneBased,
} from '../../core/utils/dateUtils';
import {
  getNarratorMessages,
  getPathLabel,
  getStarterClassLabel,
} from '../../core/engine/onboardingEngine';

const HUMAN_TIPS: ReadonlyArray<{
  id: string;
  tagTh: string;
  tagEn: string;
  titleTh: string;
  titleEn: string;
  bodyTh: string;
  bodyEn: string;
}> = [
  {
    id: 'tip_rest',
    tagTh: 'มุมคิดวันพัก',
    tagEn: 'Rest Philosophy',
    titleTh: 'ทำไมวันพักก็สำคัญไม่แพ้วันลุย',
    titleEn: 'Why rest days count just as much',
    bodyTh: 'กล้ามเนื้อและสมาธิเติบโตตอนที่เราพัก วันไหนเหนื่อยมาก กด "วันนี้พัก" หรือ "วันนี้ขอเบา ๆ" ได้เลย ความต่อเนื่องไม่หายนะ',
    bodyEn: 'Strength and focus grow during recovery. Tap "Rest Today" or "Light Day" whenever you need—your streak stays safe.',
  },
  {
    id: 'tip_small',
    tagTh: 'ก้าวเล็ก ๆ',
    tagEn: 'Small Wins',
    titleTh: 'ดื่มน้ำอีกสองแก้ว ก็ถือว่าดูแลตัวเองแล้ว',
    titleEn: 'Two more glasses of water is already a win',
    bodyTh: 'วันที่ยุ่งจนไม่มีเวลาออกกำลังกาย แค่ดื่มน้ำให้พอกับยืดเส้น 2 นาที ก็ช่วยให้ร่างกายไม่ล้าสะสมแล้ว',
    bodyEn: 'On busy days, staying hydrated and stretching for 2 minutes keeps your momentum alive without burnout.',
  },
];

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
    inactivityStatus,
    adaptiveRecommendations,
    dailyRepeatableXpToday,
    logWater,
    swapDailyQuest,
    completeManualDailyQuest,
    toggleRestModeToday,
    toggleLightModeToday,
    logRestDayCheckin,
    claimComebackQuest,
    dismissComebackQuest,
    setVacationMode,
    updateProfile,
    reopenOnboarding,
  } = useAwakened();

  const [showCustomize, setShowCustomize] = useState(false);
  const [showVacationPicker, setShowVacationPicker] = useState(false);
  const [selectedStatFilter, setSelectedStatFilter] = useState<'ALL' | PlayerStatKey>('ALL');
  const [activeTipIdx, setActiveTipIdx] = useState(0);

  const lang = db.profile.language;
  const strings = t(lang);
  const isTh = lang === 'th';
  const reduceMotion = db.profile.reduceEffects;
  const isDark = theme.mode === 'dark';

  const completedQuestsCount = todayQuests.filter((q) => q.status === 'completed').length;
  const swapAlreadyUsed = db.profile.dailyQuestSwapUsedDay === todayKey;
  const isRestToday =
    db.profile.restModeToday === todayKey ||
    db.trainingPlan.find((d) => d.weekday === getWeekdayOneBased(todayKey))?.dayType === 'rest';
  const isLightToday = db.profile.lightModeToday === todayKey;

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

  const waterPct = Math.min(
    100,
    Math.round((todayMetrics.water_ml / Math.max(1, db.profile.waterGoalMl)) * 100)
  );

  // Filter today's quests by selected circular stat chip (STR / VIT / INT / WIL)
  const filteredQuests = todayQuests.filter((q) => {
    if (selectedStatFilter === 'ALL') return true;
    const st = q.template.stat;
    if (Array.isArray(st)) return st.includes(selectedStatFilter);
    if (st) return st === selectedStatFilter;
    // Fallback mapping by slot
    if (selectedStatFilter === 'STR' && q.template.slot === 'body') return true;
    if (selectedStatFilter === 'VIT' && q.template.slot === 'body') return true;
    if (selectedStatFilter === 'INT' && q.template.slot === 'mind') return true;
    if (selectedStatFilter === 'WIL' && (q.template.slot === 'mind' || q.template.slot === 'bonus')) return true;
    return false;
  });

  // Compute 7-day sparkline series for StatMiniCards
  const last7DayKeys = Array.from({ length: 7 }, (_, i) =>
    addDaysToDayKey(todayKey, -(6 - i))
  );
  const activeActs = db.activities.filter((a) => !a.deletedAt);
  const water7Series = last7DayKeys.map((dk) =>
    activeActs
      .filter((a) => a.type === 'water' && getLocalDayKey(a.occurredAt, a.tzOffsetMin) === dk)
      .reduce((s, a) => s + (a.value || 0), 0)
  );
  const focus7Series = last7DayKeys.map((dk) =>
    activeActs
      .filter((a) => a.type === 'focus' && getLocalDayKey(a.occurredAt, a.tzOffsetMin) === dk)
      .reduce((s, a) => s + (a.value || 0), 0)
  );
  const workout7Series = last7DayKeys.map((dk) =>
    activeActs
      .filter((a) => a.type === 'workout' && getLocalDayKey(a.occurredAt, a.tzOffsetMin) === dk)
      .reduce((s, a) => s + (a.value || 0), 0)
  );
  const meal7Series = last7DayKeys.map((dk) =>
    activeActs.filter((a) => a.type === 'meal' && getLocalDayKey(a.occurredAt, a.tzOffsetMin) === dk)
      .length
  );

  const currentTip = HUMAN_TIPS[activeTipIdx % HUMAN_TIPS.length];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
    >
      {/* 0. Circular Avatar Chips Row (Mockup "Мои питомцы" → STR / VIT / INT / WIL Filter) */}
      <View>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionHeaderTitle, { color: theme.text }]}>
            {isTh ? 'ค่าสถานะ & กรองเควสต์' : 'Stats & Quest Filter'}
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 11.5, fontWeight: '800' }}>
            {isTh ? 'แตะวงกลมเพื่อกรอง' : 'Tap circle to filter'}
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.avatarChipsRow}
        >
          <AvatarChip
            label={isTh ? 'ทั้งหมด' : 'ALL'}
            value={`${completedQuestsCount}/${todayQuests.length}`}
            icon="quest"
            selected={selectedStatFilter === 'ALL'}
            onPress={() => setSelectedStatFilter('ALL')}
            theme={theme}
          />
          <AvatarChip
            label="STR"
            value={db.playerStats?.STR ?? 12}
            icon="dumbbell"
            selected={selectedStatFilter === 'STR'}
            onPress={() =>
              setSelectedStatFilter(selectedStatFilter === 'STR' ? 'ALL' : 'STR')
            }
            theme={theme}
          />
          <AvatarChip
            label="VIT"
            value={db.playerStats?.VIT ?? 12}
            icon="water"
            selected={selectedStatFilter === 'VIT'}
            onPress={() =>
              setSelectedStatFilter(selectedStatFilter === 'VIT' ? 'ALL' : 'VIT')
            }
            theme={theme}
          />
          <AvatarChip
            label="INT"
            value={db.playerStats?.INT ?? 12}
            icon="clock"
            selected={selectedStatFilter === 'INT'}
            onPress={() =>
              setSelectedStatFilter(selectedStatFilter === 'INT' ? 'ALL' : 'INT')
            }
            theme={theme}
          />
          <AvatarChip
            label="WIL"
            value={db.playerStats?.WIL ?? 12}
            icon="journal"
            selected={selectedStatFilter === 'WIL'}
            onPress={() =>
              setSelectedStatFilter(selectedStatFilter === 'WIL' ? 'ALL' : 'WIL')
            }
            theme={theme}
          />
        </ScrollView>
      </View>

      {/* 1. Character & Mascot Hero Card (Mockup "Огурец" — Mascot on Ink + 3 Thick Stat Cards) */}
      <AnimatedCard index={0} reduceMotion={reduceMotion} style={styles.heroCardOuter}>
        <View style={styles.heroInkBanner}>
          <View style={styles.systemTopRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <RankBadge
                rank={currentRank}
                lang={lang}
                size="sm"
                reduceMotion={reduceMotion}
              />
              <Text
                style={styles.playerNameInk}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {db.profile.displayName}
              </Text>
              {db.onboarding && (
                <Text style={{ color: colors.peach, fontSize: 11.5, fontWeight: '800', marginTop: 2 }}>
                  {getStarterClassLabel(db.onboarding.starterClass, lang).name} ·{' '}
                  {getPathLabel(db.onboarding.path, lang)}
                </Text>
              )}
            </View>

            <AnimatedPressable
              reduceMotion={reduceMotion}
              style={styles.customizeBtn}
              onPress={() => setShowCustomize(!showCustomize)}
            >
              <View style={styles.inlineIconRow}>
                <AppIcon name="settings" size={13} color={colors.ink} />
                <Text style={{ color: colors.ink, fontSize: 11.5, fontWeight: '900' }}>
                  {strings.home.customizeCards}
                </Text>
              </View>
            </AnimatedPressable>
          </View>

          {/* Awaken Mascot — Sleeps on Rest Day, Happy when all quests done */}
          <View style={{ marginVertical: 6 }}>
            <AwakenMascot
              rankId={currentRank.id}
              level={levelState.level}
              mood={
                isRestToday
                  ? 'sleep'
                  : completedQuestsCount > 0 && completedQuestsCount === todayQuests.length
                  ? 'proud'
                  : isLightToday
                  ? 'calm'
                  : 'idle'
              }
              size={82}
              caption={
                isRestToday
                  ? isTh
                    ? 'พักก็คือแผนอย่างหนึ่ง — วันนี้พักก็นับนะ'
                    : 'Rest is part of the plan — today counts too'
                  : isLightToday
                  ? isTh
                    ? 'โหมดวันนี้ขอเบา ๆ — ทำแค่ 2 อย่างก็ได้ XP เต็มนะ'
                    : 'Light Day Mode — 2 gentle quests, full XP'
                  : completedQuestsCount === todayQuests.length && todayQuests.length > 0
                  ? isTh
                    ? 'วันนี้เก็บครบหมดแล้ว เก่งมากเลย!'
                    : 'All quests done for today! Great job!'
                  : getNarratorMessages(db.onboarding?.narrator ?? 'system', lang).dailyGreeting
              }
              reduceMotion={reduceMotion}
            />
          </View>
        </View>

        <DripEdge
          seed={11}
          color={colors.ink}
          bgColor={theme.card}
          height={20}
        />

        <View style={[styles.heroCardBody, { backgroundColor: theme.card }]}>
          {/* 3 Thick-Bordered Character Stat Pills (Level · XP · Rank) */}
          <View style={styles.threeHeroStatsRow}>
            <View
              style={[
                styles.heroMiniStatBox,
                { backgroundColor: isDark ? '#262246' : colors.cream },
              ]}
            >
              <Text style={[styles.heroMiniStatLabel, { color: theme.textMuted }]}>
                LEVEL
              </Text>
              <Text style={[styles.heroMiniStatValue, { color: theme.text }]}>
                Lv.{levelState.level}
              </Text>
            </View>
            <View
              style={[
                styles.heroMiniStatBox,
                { backgroundColor: colors.peachSoft },
              ]}
            >
              <Text style={[styles.heroMiniStatLabel, { color: colors.ink }]}>
                TOTAL XP
              </Text>
              <Text style={[styles.heroMiniStatValue, { color: colors.ink }]}>
                {levelState.totalXp.toLocaleString()}
              </Text>
            </View>
            <View
              style={[
                styles.heroMiniStatBox,
                { backgroundColor: isDark ? '#262246' : colors.cream },
              ]}
            >
              <Text style={[styles.heroMiniStatLabel, { color: theme.textMuted }]}>
                RANK
              </Text>
              <Text style={[styles.heroMiniStatValue, { color: theme.text }]}>
                {currentRank.id}-{currentRank.name}
              </Text>
            </View>
          </View>

          <XpBar
            levelState={levelState}
            theme={theme}
            dailyRepeatableXp={dailyRepeatableXpToday}
            lang={lang}
            reduceMotion={reduceMotion}
          />

          {/* Rest Day ("วันนี้พัก") & Light Day ("วันนี้ขอเบา ๆ") Action Row (Section 4.3 & 4.6) */}
          <View style={styles.recoveryBar}>
            <PillButton
              label={
                isRestToday
                  ? isTh
                    ? '✦ วันนี้พักอยู่ (แตะสลับ)'
                    : '✦ Resting Today'
                  : isTh
                  ? 'วันนี้พัก'
                  : 'Rest Today'
              }
              icon="leaf"
              variant={isRestToday ? 'primary' : 'soft'}
              size="sm"
              style={{ flex: 1 }}
              onPress={toggleRestModeToday}
            />

            <PillButton
              label={
                isLightToday
                  ? isTh
                    ? '✦ วันนี้ขอเบา ๆ (เปิดอยู่)'
                    : '✦ Light Day ON'
                  : isTh
                  ? 'วันนี้ขอเบา ๆ'
                  : 'Light Day'
              }
              icon="heart"
              variant={isLightToday ? 'dark' : 'outline'}
              size="sm"
              style={{ flex: 1 }}
              onPress={toggleLightModeToday}
            />
          </View>

          {isRestToday && (
            <View style={{ marginTop: 8 }}>
              <PillButton
                label={
                  isTh
                    ? 'เช็กอินวันพัก (+25 XP · รักษาความต่อเนื่อง)'
                    : 'Rest Day Check-in (+25 XP · Keeps Streak)'
                }
                icon="check"
                variant="primary"
                size="sm"
                onPress={() => logRestDayCheckin('Recovery check-in')}
              />
            </View>
          )}

          {/* Penalty Shield & Vacation / Sick Mode Bar */}
          <View
            style={{
              marginTop: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <View style={styles.shieldPill}>
              <AppIcon name="shield" size={13} color={colors.ink} />
              <Text style={{ color: colors.ink, fontSize: 11.5, fontWeight: '900' }}>
                {isTh
                  ? `โล่กันพลาด: ${db.profile.penaltyShields ?? 0}/3`
                  : `Shields: ${db.profile.penaltyShields ?? 0}/3`}
              </Text>
            </View>

            {db.profile.vacationUntilDayKey && db.profile.vacationUntilDayKey >= todayKey ? (
              <AnimatedPressable
                reduceMotion={reduceMotion}
                onPress={() => setVacationMode(null)}
                style={[styles.shieldPill, { backgroundColor: colors.peach }]}
              >
                <AppIcon name="leaf" size={13} color={colors.ink} />
                <Text style={{ color: colors.ink, fontSize: 11.5, fontWeight: '900' }}>
                  {isTh
                    ? `ลาพัก/ป่วย ถึง ${db.profile.vacationUntilDayKey} (แตะเพื่อปิด)`
                    : `Vacation until ${db.profile.vacationUntilDayKey} (Tap to end)`}
                </Text>
              </AnimatedPressable>
            ) : (
              <AnimatedPressable
                reduceMotion={reduceMotion}
                onPress={() => setShowVacationPicker((v) => !v)}
                style={[styles.shieldPill, { backgroundColor: colors.white }]}
              >
                <AppIcon name="calendar" size={13} color={colors.ink} />
                <Text style={{ color: colors.ink, fontSize: 11.5, fontWeight: '800' }}>
                  {isTh ? 'โหมดลาพัก / ป่วย' : 'Vacation / Sick Mode'}
                </Text>
              </AnimatedPressable>
            )}
          </View>

          {showVacationPicker &&
            !(db.profile.vacationUntilDayKey && db.profile.vacationUntilDayKey >= todayKey) && (
              <View style={styles.vacationDrawer}>
                <Text style={{ color: colors.ink, fontSize: 11.5, fontWeight: '800' }}>
                  {isTh
                    ? 'ไม่สบายหรือเดินทาง พักระบบนับวันขาดไว้ก่อนได้เลย (ไม่เสีย EXP):'
                    : 'Pause missed-day tracking while sick or traveling (no EXP loss):'}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                  {[1, 3, 7].map((days) => (
                    <PillButton
                      key={days}
                      label={isTh ? `พัก ${days} วัน` : `${days}d`}
                      variant="primary"
                      size="sm"
                      style={{ flex: 1 }}
                      onPress={() => {
                        setVacationMode(days);
                        setShowVacationPicker(false);
                      }}
                    />
                  ))}
                </View>
              </View>
            )}

          {db.onboarding && !db.onboarding.pledgedAt && (
            <View style={{ marginTop: 10 }}>
              <PillButton
                label={
                  isTh
                    ? 'ทำคำปฏิญาณเริ่มต้นเพื่อรับ +50 XP'
                    : 'Complete Awakening Pledge (+50 XP)'
                }
                variant="soft"
                size="sm"
                onPress={reopenOnboarding}
              />
            </View>
          )}
        </View>
      </AnimatedCard>

      {/* Day-2 Inactivity Warning Banner */}
      {inactivityStatus.warningActive && (
        <InkCard theme={theme} variant="soft">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AppIcon name="fire" size={18} color={colors.ink} />
            <Text style={{ color: colors.ink, fontSize: 14, fontWeight: '900', flex: 1 }}>
              {isTh
                ? `ไม่ได้แวะมา ${inactivityStatus.consecutiveMissedDays} วันติดแล้วนะ`
                : `${inactivityStatus.consecutiveMissedDays} days away in a row`}
            </Text>
          </View>
          <Text
            style={{
              color: colors.ink,
              fontSize: 12.5,
              fontWeight: '700',
              marginTop: 6,
              lineHeight: 18,
            }}
          >
            {isTh
              ? `วันนี้ลองกด "วันนี้ขอเบา ๆ" หรือทำเควสต์ให้ครบเพื่อรักษา ${
                  db.profile.inactivitySettings?.penaltyPercent ?? 30
                }% EXP (≈ ${inactivityStatus.estimatedPenaltyXp} XP) ไว้ด้วยกันนะ`
              : `Tap "Light Day" or complete today’s quests to protect ${
                  db.profile.inactivitySettings?.penaltyPercent ?? 30
                }% total EXP (≈ ${inactivityStatus.estimatedPenaltyXp} XP).`}
          </Text>
        </InkCard>
      )}

      {/* Comeback Quest Card */}
      {db.profile.activeComebackQuest &&
        !db.profile.activeComebackQuest.claimedAt &&
        !db.profile.activeComebackQuest.dismissedAt && (
          <InkCard theme={theme} variant="soft">
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <AppIcon name="bolt" size={18} color={colors.ink} />
                <Text style={{ color: colors.ink, fontSize: 14, fontWeight: '900' }}>
                  {isTh
                    ? `ภารกิจทวงคืนพลัง (+${db.profile.activeComebackQuest.refundableXp} EXP)`
                    : `Comeback Quest (+${db.profile.activeComebackQuest.refundableXp} EXP)`}
                </Text>
              </View>
              <Pressable onPress={dismissComebackQuest} style={{ padding: 4 }}>
                <Text style={{ color: colors.ink, fontSize: 15, fontWeight: '900' }}>✕</Text>
              </Pressable>
            </View>

            <Text
              style={{
                color: colors.ink,
                fontSize: 12.5,
                fontWeight: '700',
                marginTop: 6,
                lineHeight: 18,
              }}
            >
              {isTh
                ? `กลับมาเริ่มกันใหม่นะ! ทำเควสต์วันนี้เพียง 1 ข้อเพื่อรับคืน +${db.profile.activeComebackQuest.refundableXp} EXP ทันที`
                : `Welcome back! Complete 1 quest today to reclaim +${db.profile.activeComebackQuest.refundableXp} EXP.`}
            </Text>

            <View style={{ marginTop: 10 }}>
              <PillButton
                label={
                  completedQuestsCount >= 1
                    ? isTh
                      ? `✦ รับคืน +${db.profile.activeComebackQuest.refundableXp} EXP เลย!`
                      : `✦ Claim +${db.profile.activeComebackQuest.refundableXp} EXP!`
                    : isTh
                    ? `รอทำเควสต์วันนี้ (${completedQuestsCount}/1)`
                    : `Complete 1 quest (${completedQuestsCount}/1)`
                }
                variant="primary"
                disabled={completedQuestsCount < 1}
                onPress={() => claimComebackQuest()}
              />
            </View>
          </InkCard>
        )}

      {/* Dashboard Card Customizer Drawer */}
      {showCustomize && (
        <InkCard theme={theme}>
          <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 8 }]}>
            {isTh ? 'เลือกการ์ดที่อยากแสดงบนหน้าแรก' : 'Toggle Dashboard Cards'}
          </Text>
          <View style={styles.chipRow}>
            {(
              [
                { key: 'quests', icon: 'quest' as AppIconName, label: isTh ? 'แผนวันนี้' : 'Quests' },
                { key: 'water', icon: 'water' as AppIconName, label: isTh ? 'ดื่มน้ำไว' : 'Water' },
                { key: 'streak', icon: 'fire' as AppIconName, label: isTh ? 'ปฏิทิน 7 วัน' : 'Streak' },
                { key: 'stats', icon: 'chart' as AppIconName, label: isTh ? 'กราฟสถิติ' : 'Stats' },
                { key: 'adaptive', icon: 'brain' as AppIconName, label: isTh ? 'บทความ & แผน' : 'Tips & Plan' },
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
                      backgroundColor: active ? colors.peach : colors.white,
                      borderColor: colors.ink,
                    },
                  ]}
                  onPress={() => toggleCardVisibility(item.key)}
                >
                  <View style={styles.inlineIconRow}>
                    <AppIcon name={item.icon} size={13} color={colors.ink} />
                    <Text style={{ color: colors.ink, fontWeight: '900', fontSize: 12 }}>
                      {item.label}
                    </Text>
                  </View>
                </AnimatedPressable>
              );
            })}
          </View>
        </InkCard>
      )}

      {/* 2. Daily Quests Card (Mockup "Планы" — PeachSoft Recommended Row + 1-3 Ink Drops) */}
      {!hiddenCards.has('quests') && (
        <InkCard theme={theme}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.inlineIconRow}>
              <AppIcon name="quest" size={18} color={theme.text} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {isTh ? 'แผนเควสต์วันนี้' : "Today's Quests"}
                {selectedStatFilter !== 'ALL' ? ` (${selectedStatFilter})` : ''}
              </Text>
            </View>
            <View style={styles.questCountBadge}>
              <Text style={{ color: colors.ink, fontWeight: '900', fontSize: 12.5 }}>
                {completedQuestsCount} / {todayQuests.length}
              </Text>
            </View>
          </View>

          {workoutPenalty.active && (
            <View style={styles.penaltyNotice}>
              <Text style={{ color: colors.ink, fontSize: 11.5, fontWeight: '800', flex: 1 }}>
                {isTh
                  ? '✦ วันนี้มีเควสต์ชดเชยจากรอบก่อน ทำเท่าที่ไหวหรือสลับเป็นวันพักได้เสมอนะ'
                  : '✦ Bonus catch-up intensity active today. Switch to Rest Day anytime if needed.'}
              </Text>
            </View>
          )}

          {filteredQuests.length === 0 ? (
            <View style={{ paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '800' }}>
                {isTh
                  ? `วันนี้ไม่มีเควสต์หมวด ${selectedStatFilter} แตะ "ทั้งหมด" ด้านบนเพื่อดูเควสต์อื่นนะ`
                  : `No ${selectedStatFilter} quests today. Tap "ALL" above to view all quests.`}
              </Text>
            </View>
          ) : (
            filteredQuests.map((q, idx) => {
              const done = q.status === 'completed';
              const pct = Math.min(100, Math.round((q.progress / Math.max(1, q.target)) * 100));
              // First incomplete quest is highlighted in PeachSoft ("เควสต์ที่แนะนำ")
              const isRecommended = !done && idx === filteredQuests.findIndex((item) => item.status !== 'completed');
              const diffLevel: 1 | 2 | 3 = q.template.micro
                ? 1
                : q.template.reward_xp >= 35
                ? 3
                : 2;

              const rowBg = done
                ? isDark
                  ? '#262344'
                  : colors.cream
                : isRecommended
                ? colors.peachSoft
                : isDark
                ? '#211E3A'
                : colors.white;

              const textPrimaryCol = isRecommended && !done ? colors.ink : theme.text;
              const textSubCol = isRecommended && !done ? '#3A3752' : theme.textMuted;

              return (
                <View
                  key={q.id}
                  style={[
                    styles.questRow,
                    {
                      backgroundColor: rowBg,
                      borderColor: isDark && !isRecommended ? colors.peach : colors.ink,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.questTitleLine}>
                      <View
                        style={[
                          styles.checkCircle,
                          {
                            borderColor: colors.ink,
                            backgroundColor: done ? colors.peach : colors.white,
                          },
                        ]}
                      >
                        {done && <AppIcon name="check" size={12} color={colors.ink} />}
                      </View>
                      <Text
                        style={[
                          styles.questTitle,
                          {
                            color: textPrimaryCol,
                            textDecorationLine: done ? 'line-through' : 'none',
                            flex: 1,
                          },
                        ]}
                      >
                        {isTh ? q.template.title_th : q.template.title_en}
                      </Text>
                    </View>

                    {/* Ink Drops Difficulty + Recommended Tag (Section 4.5) */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 6,
                        marginTop: 6,
                      }}
                    >
                      <InkDifficultyDrops level={diffLevel} isTh={isTh} />
                      {isRecommended && (
                        <View
                          style={{
                            backgroundColor: colors.peach,
                            borderColor: colors.ink,
                            borderWidth: 1.5,
                            borderRadius: 999,
                            paddingHorizontal: 7,
                            paddingVertical: 1,
                          }}
                        >
                          <Text style={{ color: colors.ink, fontSize: 9.5, fontWeight: '900' }}>
                            {isTh ? 'แนะนำตอนนี้' : 'Suggested'}
                          </Text>
                        </View>
                      )}
                      <Text style={{ color: textSubCol, fontSize: 11.5, fontWeight: '800' }}>
                        {q.progress}/{q.target} ({pct}%)
                      </Text>
                    </View>
                  </View>

                  <View style={styles.questRightCol}>
                    <View
                      style={{
                        backgroundColor: done ? colors.peach : colors.white,
                        borderColor: colors.ink,
                        borderWidth: 1.8,
                        borderRadius: 999,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                      }}
                    >
                      <Text style={{ color: colors.ink, fontWeight: '900', fontSize: 12 }}>
                        +{q.template.reward_xp} XP
                      </Text>
                    </View>

                    {!done && (
                      <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center', marginTop: 2 }}>
                        {(q.template.condition.metric === 'manual' || q.template.micro) && (
                          <AnimatedPressable
                            reduceMotion={reduceMotion}
                            style={[
                              styles.swapMiniBtn,
                              {
                                backgroundColor: colors.peach,
                                borderColor: colors.ink,
                              },
                            ]}
                            onPress={() => completeManualDailyQuest(q.id)}
                          >
                            <View style={styles.inlineIconRow}>
                              <AppIcon name="check" size={11} color={colors.ink} />
                              <Text style={{ color: colors.ink, fontSize: 10.5, fontWeight: '900' }}>
                                {isTh ? 'ทำแล้ว' : 'Done'}
                              </Text>
                            </View>
                          </AnimatedPressable>
                        )}
                        {!swapAlreadyUsed && (
                          <AnimatedPressable
                            reduceMotion={reduceMotion}
                            style={[
                              styles.swapMiniBtn,
                              {
                                backgroundColor: colors.white,
                                borderColor: colors.ink,
                              },
                            ]}
                            onPress={() => swapDailyQuest(q.id)}
                          >
                            <View style={styles.inlineIconRow}>
                              <AppIcon name="swap" size={11} color={colors.ink} />
                              <Text style={{ color: colors.ink, fontSize: 10.5, fontWeight: '800' }}>
                                {isTh ? 'เปลี่ยน' : 'Swap'}
                              </Text>
                            </View>
                          </AnimatedPressable>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}

          <View style={[styles.inlineIconRow, { marginTop: 4 }]}>
            <AppIcon name="star" size={13} color={theme.textSecondary} />
            <Text style={{ color: theme.textSecondary, fontSize: 11.5, fontWeight: '700' }}>
              {isTh
                ? 'ทำครบทุกข้อรับโบนัส +30 XP · ถ้าวันนี้เหนื่อย กด "วันนี้ขอเบา ๆ" ด้านบนได้นะ'
                : 'Complete all for +30 Bonus XP · Feeling tired? Tap "Light Day" above'}
            </Text>
          </View>
        </InkCard>
      )}

      {/* 3. One-Tap Water Card */}
      {!hiddenCards.has('water') && (
        <InkCard theme={theme}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.inlineIconRow, { flex: 1, marginRight: 8 }]}>
              <AppIcon name="water" size={18} color={theme.text} />
              <Text style={[styles.cardTitle, { color: theme.text, flexShrink: 1 }]}>
                {isTh ? 'ดื่มน้ำอีกสักแก้วไหม' : strings.home.waterToday}
              </Text>
            </View>
            <AnimatedNumberText
              value={todayMetrics.water_ml}
              reduceMotion={reduceMotion}
              style={{ color: theme.text, fontWeight: '900', fontSize: 14, flexShrink: 0 }}
            >
              {todayMetrics.water_ml.toLocaleString()} / {db.profile.waterGoalMl.toLocaleString()} ml
            </AnimatedNumberText>
          </View>

          <AnimatedProgressBar
            percent={waterPct}
            fillColor={colors.peach}
            trackColor={isDark ? '#262246' : colors.cream}
            borderColor={isDark ? colors.peach : colors.ink}
            height={12}
            reduceMotion={reduceMotion}
            style={{ marginBottom: 12 }}
          />

          <View style={styles.waterQuickRow}>
            {[100, 150, 250, 500].map((ml) => (
              <PillButton
                key={ml}
                label={`+${ml}ml`}
                variant={ml === 250 ? 'primary' : 'soft'}
                size="sm"
                style={{ flex: 1, paddingHorizontal: 4 }}
                onPress={() => logWater(ml)}
              />
            ))}
          </View>
        </InkCard>
      )}

      {/* 4. 7-Day Calendar & Streak with DateDot (Section 3 & 4.3) */}
      {!hiddenCards.has('streak') && (
        <InkCard theme={theme}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.inlineIconRow}>
              <AppIcon name="fire" size={18} color={theme.text} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {isTh ? 'จังหวะความต่อเนื่อง 7 วัน' : strings.home.streakTitle}
              </Text>
            </View>
            <View style={styles.questCountBadge}>
              <Text style={{ color: colors.ink, fontWeight: '900', fontSize: 12.5 }}>
                {streakState.currentStreak} {isTh ? 'วันติด' : 'days'}
              </Text>
            </View>
          </View>

          <View style={styles.weekPillsRow}>
            {weekDays.map((dk, idx) => {
              const st = streakState.updatedLogs[dk];
              const isToday = dk === todayKey;
              return (
                <DateDot
                  key={dk}
                  subLabel={isTh ? dayNamesTh[idx] : dayNamesEn[idx]}
                  label={dk.slice(8)}
                  status={
                    st === 'active'
                      ? 'active'
                      : st === 'rest' || (isToday && isRestToday)
                      ? 'rest'
                      : st === 'frozen'
                      ? 'frozen'
                      : 'none'
                  }
                  isToday={isToday}
                  theme={theme}
                  onPress={() => onNavigateTab('journey')}
                />
              );
            })}
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 10,
              paddingTop: 8,
              borderTopWidth: 1.5,
              borderTopColor: colors.line,
            }}
          >
            <Text style={{ color: theme.textSecondary, fontSize: 11.5, fontWeight: '800' }}>
              {isTh
                ? `สัปดาห์นี้ทำแล้ว ${streakState.weeklyActiveDays}/${streakState.weeklyGoalDays} วัน`
                : `Weekly goal: ${streakState.weeklyActiveDays}/${streakState.weeklyGoalDays} days`}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 11.5, fontWeight: '800' }}>
              {isTh
                ? `ตั๋วแช่แข็ง: ${streakState.freezeTokensRemaining}/2`
                : `Freeze: ${streakState.freezeTokensRemaining}/2`}
            </Text>
          </View>
        </InkCard>
      )}

      {/* 5. Paired StatMiniCards with 7-Day Sparklines (Mockup "Статистика здоровья") */}
      {!hiddenCards.has('stats') && (
        <View style={styles.statsGrid}>
          <StatMiniCard
            title={isTh ? 'น้ำดื่ม 7 วัน' : '7-Day Water'}
            value={`${todayMetrics.water_ml.toLocaleString()} ml`}
            subtitle={isTh ? `เป้า ${db.profile.waterGoalMl} ml/วัน` : `Goal ${db.profile.waterGoalMl} ml`}
            icon="water"
            trendValues={water7Series}
            theme={theme}
            onPress={() => onNavigateTab('track')}
          />

          <StatMiniCard
            title={isTh ? 'โฟกัส 7 วัน' : '7-Day Focus'}
            value={`${todayMetrics.weekly_focus_min} ${isTh ? 'นาที' : 'min'}`}
            subtitle={isTh ? `วันนี้ ${todayMetrics.pomodoro_count} รอบ` : `${todayMetrics.pomodoro_count} rounds today`}
            icon="clock"
            trendValues={focus7Series}
            theme={theme}
            onPress={() => onNavigateTab('train')}
          />

          <StatMiniCard
            title={isTh ? 'ขยับร่างกาย 7 วัน' : '7-Day Workout'}
            value={`${todayMetrics.workout_min} ${isTh ? 'นาที' : 'min'}`}
            subtitle={isTh ? `วันนี้ ${todayMetrics.workout_count} เซสชัน` : `${todayMetrics.workout_count} sessions today`}
            icon="dumbbell"
            trendValues={workout7Series}
            theme={theme}
            onPress={() => onNavigateTab('train')}
          />

          <StatMiniCard
            title={isTh ? 'มื้ออาหารวันนี้' : 'Meals & Kcal'}
            value={`${dailyNutrition.kcal.toLocaleString()} kcal`}
            subtitle={`P:${dailyNutrition.proteinG}g · C:${dailyNutrition.carbsG}g · F:${dailyNutrition.fatG}g`}
            icon="meal"
            trendValues={meal7Series}
            theme={theme}
            onPress={() => onNavigateTab('track')}
          />
        </View>
      )}

      {/* 6. Tips / Guide Article Card + Adaptive Plan (Mockup "Статьи") */}
      {!hiddenCards.has('adaptive') && (
        <InkCard theme={theme} variant="soft">
          <View style={styles.cardHeaderRow}>
            <View
              style={{
                backgroundColor: colors.ink,
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 3,
              }}
            >
              <Text style={{ color: colors.white, fontSize: 10.5, fontWeight: '900' }}>
                {isTh ? currentTip.tagTh : currentTip.tagEn}
              </Text>
            </View>
            <Pressable
              onPress={() => setActiveTipIdx((i) => i + 1)}
              style={{
                backgroundColor: colors.white,
                borderColor: colors.ink,
                borderWidth: 1.8,
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 3,
              }}
            >
              <Text style={{ color: colors.ink, fontSize: 11, fontWeight: '900' }}>
                {isTh ? 'อ่านบทความถัดไป ›' : 'Next Tip ›'}
              </Text>
            </Pressable>
          </View>

          <Text style={{ color: colors.ink, fontSize: 15.5, fontWeight: '900', marginTop: 2 }}>
            {isTh ? currentTip.titleTh : currentTip.titleEn}
          </Text>
          <Text
            style={{
              color: '#2A273E',
              fontSize: 12.5,
              fontWeight: '700',
              marginTop: 5,
              lineHeight: 18,
            }}
          >
            {isTh ? currentTip.bodyTh : currentTip.bodyEn}
          </Text>

          {adaptiveRecommendations.slice(0, 1).map((rec) => (
            <View
              key={rec.id}
              style={{
                marginTop: 10,
                paddingTop: 10,
                borderTopWidth: 1.5,
                borderTopColor: colors.ink,
              }}
            >
              <Text style={{ color: colors.ink, fontWeight: '900', fontSize: 12.5 }}>
                ✦ {rec.title}
              </Text>
              <Text style={{ color: '#2A273E', fontSize: 12, fontWeight: '700', marginTop: 2 }}>
                {rec.description}
              </Text>
            </View>
          ))}
        </InkCard>
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
    paddingBottom: 105,
    gap: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  avatarChipsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 2,
  },
  inlineIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroCardOuter: {
    borderRadius: radius.card,
    borderWidth: stroke,
    borderBottomWidth: stroke + 3,
    borderRightWidth: stroke + 3,
    borderColor: colors.ink,
    overflow: 'hidden',
  },
  heroInkBanner: {
    backgroundColor: colors.ink,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  heroCardBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 6,
  },
  systemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  playerNameInk: {
    color: colors.cream,
    fontSize: 21,
    fontWeight: '900',
    marginTop: 6,
  },
  customizeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.chip,
    backgroundColor: colors.peachSoft,
    borderWidth: 2,
    borderColor: colors.peach,
  },
  threeHeroStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  heroMiniStatBox: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: stroke,
    borderColor: colors.ink,
    alignItems: 'center',
  },
  heroMiniStatLabel: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  heroMiniStatValue: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  recoveryBar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  shieldPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.chip,
    backgroundColor: colors.peachSoft,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  vacationDrawer: {
    marginTop: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.peachSoft,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  waterQuickRow: {
    flexDirection: 'row',
    gap: 8,
  },
  questCountBadge: {
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: radius.chip,
    backgroundColor: colors.peach,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  penaltyNotice: {
    backgroundColor: colors.peachSoft,
    borderColor: colors.ink,
    borderWidth: 2,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 16,
    borderWidth: stroke,
    borderBottomWidth: stroke + 2,
    borderRightWidth: stroke + 2,
    marginBottom: 9,
    gap: 10,
  },
  questTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  questRightCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  swapMiniBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.chip,
    borderWidth: 1.8,
  },
  weekPillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.chip,
    borderWidth: 2,
  },
});
