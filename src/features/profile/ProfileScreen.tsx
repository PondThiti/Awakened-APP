import React, { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  copyToClipboard,
  getDeviceRegion,
  getNotificationPermissionStatus,
  pickProfileImage,
  requestNotificationPermission,
  requestPinShortcut,
  requestPinWidget,
  testAlarmSound,
} from '../../services/nativeBridge';
import xpConfigJson from '../../../assets/config/xp_config.json';
import { AppTheme } from '../../app/theme';
import { useAwakened } from '../../data/repository';
import { t } from '../../l10n/translations';
import {
  AchievementCategory,
  AchievementDef,
  AchievementTier,
  RankDef,
} from '../../core/engine/types';
import {
  ACHIEVEMENT_CATEGORIES,
  TIER_METADATA,
  getAchievementCatalog,
  getAchievementDisplayTitle,
  getAchievementProgress,
  getCategoryTitleProgress,
  getNearCompletionAchievements,
  getSecretHint,
  isAchievementVisibleForUser,
} from '../../core/engine/achievementEngine';
import { RankBadge, XpBar } from '../components/SystemSharedComponents';
import { AppIcon } from '../components/AppIcons';
import {
  AnimatedCard,
  AnimatedPressable,
  AnimatedProgressBar,
} from '../components/AnimatedComponents';

export const ProfileScreen: React.FC<{ theme: AppTheme }> = ({ theme }) => {
  const {
    db,
    todayKey,
    levelState,
    currentRank,
    nextRank,
    monarchEligibility,
    thisWeekQuests,
    dailyRepeatableXpToday,
    achievementMetrics,
    addPersonalQuest,
    completePersonalQuest,
    deletePersonalQuest,
    updateProfile,
    updateOnboardingDraft,
    reopenOnboarding,
    recordAppEvent,
    exportBackupJson,
    importBackupJson,
    deleteCategoryData,
    resetAllData,
  } = useAwakened();

  const lang = db.profile.language;
  const strings = t(lang);
  const isTh = lang === 'th';
  const reduceMotion = db.profile.reduceEffects;

  const [nameInput, setNameInput] = useState(db.profile.displayName);
  const [newQuestTitle, setNewQuestTitle] = useState('');
  const [newQuestReward, setNewQuestReward] = useState<10 | 25 | 50>(25);
  const [backupJsonBox, setBackupJsonBox] = useState('');
  const [backupStatusMsg, setBackupStatusMsg] = useState<string | null>(null);
  const [resetConfirmStep, setResetConfirmStep] = useState<0 | 1>(0);

  // Trophy Room collapsed state
  const [isTrophyRoomExpanded, setIsTrophyRoomExpanded] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [copiedDonation, setCopiedDonation] = useState(false);
  const [shortcutFeedback, setShortcutFeedback] = useState<string | null>(null);
  const [widgetFeedback, setWidgetFeedback] = useState<string | null>(null);
  const [notifGranted, setNotifGranted] = useState(false);

  // Navigation Horizontal Tabs below Profile
  type ProfileMainTab =
    | 'personal_quests'
    | 'trophies'
    | 'all_ranks'
    | 'support'
    | 'settings'
    | 'footer';
  const [profileTab, setProfileTab] = useState<ProfileMainTab>('personal_quests');

  type SettingsSubTab = 'privacy' | 'personal_data' | 'notifications' | 'widgets';
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTab>('notifications');

  // Custom Alarm Time Modal (Mobile Phone Style)
  const [customAlarmModalOpen, setCustomAlarmModalOpen] = useState(false);
  const [customAlarmHours, setCustomAlarmHours] = useState('07');
  const [customAlarmMinutes, setCustomAlarmMinutes] = useState('00');
  const [alarmTimeTab, setAlarmTimeTab] = useState<'hour' | 'minute'>('hour');
  const [alarmRepeatDays, setAlarmRepeatDays] = useState<number[]>(db.profile.alarm?.days ?? [1, 2, 3, 4, 5, 6, 7]);
  const [isAlarmTesting, setIsAlarmTesting] = useState(false);

  // App Lock Modal
  const [appLockModalOpen, setAppLockModalOpen] = useState(false);
  const [appLockInputPin, setAppLockInputPin] = useState('');
  const [appLockConfirmPin, setAppLockConfirmPin] = useState('');
  const [appLockBiometricOpt, setAppLockBiometricOpt] = useState(true);
  const [appLockStep, setAppLockStep] = useState<'enter_pin' | 'confirm_pin' | 'manage'>('enter_pin');
  const [appLockError, setAppLockError] = useState<string | null>(null);
  const [appLockSuccessMsg, setAppLockSuccessMsg] = useState<string | null>(null);
  const [verifyCurrentPin, setVerifyCurrentPin] = useState('');
  const [pinVerified, setPinVerified] = useState(false);

  const adjustAlarmTime = (deltaHours: number, deltaMinutes: number) => {
    const current = db.profile.alarm?.time ?? '07:00';
    const [h, m] = current.split(':').map(Number);
    const totalMin = (((h * 60 + m + deltaHours * 60 + deltaMinutes) % (24 * 60)) + 24 * 60) % (24 * 60);
    const newH = String(Math.floor(totalMin / 60)).padStart(2, '0');
    const newM = String(totalMin % 60).padStart(2, '0');
    const newTimeStr = `${newH}:${newM}`;
    updateProfile({
      alarm: {
        ...(db.profile.alarm ?? { days: [] }),
        enabled: true,
        time: newTimeStr,
      },
    });
  };

  useEffect(() => {
    getNotificationPermissionStatus().then((status) => {
      setNotifGranted(status === 'granted');
    });
  }, []);

  // Trophy Room filters
  const [selectedCategory, setSelectedCategory] = useState<'all' | AchievementCategory>('all');
  const [selectedTier, setSelectedTier] = useState<'all' | AchievementTier>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [searchAchievement, setSearchAchievement] = useState('');
  const [showTitlesDrawer, setShowTitlesDrawer] = useState(false);
  const [vowReviewedBanner, setVowReviewedBanner] = useState(false);

  const allRanks = xpConfigJson.ranks as RankDef[];
  const allCategories = ACHIEVEMENT_CATEGORIES;
  const unlockedSet = new Set(db.achievementsUnlocked.map((u) => u.achievementId));
  const unlockedAtMap = new Map(
    db.achievementsUnlocked.map((u) => [u.achievementId, u.unlockedAt])
  );
  const donePersonalToday = new Set(db.personalQuestDoneByDay[todayKey] ?? []);

  const catalog = getAchievementCatalog();
  const visibleAchievements = catalog.filter((ach) =>
    isAchievementVisibleForUser(
      ach,
      db.onboarding.ageBand,
      db.onboarding.safetyFlags
    )
  );
  const categoryTitlesProgress = getCategoryTitleProgress(
    unlockedSet,
    db.onboarding.ageBand,
    db.onboarding.safetyFlags,
    [],
    catalog
  );
  const nearCompletionAchievements = getNearCompletionAchievements(
    achievementMetrics,
    unlockedSet,
    db.onboarding.ageBand,
    db.onboarding.safetyFlags,
    catalog,
    3
  );

  // Visible unlocked count
  const visibleUnlockedCount = visibleAchievements.filter((a) =>
    unlockedSet.has(a.id)
  ).length;
  const overallAchPct =
    visibleAchievements.length > 0
      ? Math.round((visibleUnlockedCount / visibleAchievements.length) * 100)
      : 0;

  // Tier breakdown counts
  const tierCounts = (['bronze', 'silver', 'gold', 'legend'] as const).map((tier) => {
    const totalInTier = visibleAchievements.filter((a) => a.tier === tier).length;
    const unlockedInTier = visibleAchievements.filter(
      (a) => a.tier === tier && unlockedSet.has(a.id)
    ).length;
    return {
      tier,
      meta: TIER_METADATA[tier],
      unlocked: unlockedInTier,
      total: totalInTier,
    };
  });

  // Filtered achievements for Trophy Room
  const filteredAchievements = visibleAchievements.filter((ach) => {
    if (selectedCategory !== 'all' && ach.category !== selectedCategory) return false;
    if (selectedTier !== 'all' && ach.tier !== selectedTier) return false;
    const isUnlocked = unlockedSet.has(ach.id);
    if (statusFilter === 'unlocked' && !isUnlocked) return false;
    if (statusFilter === 'locked' && isUnlocked) return false;
    if (searchAchievement.trim()) {
      const q = searchAchievement.trim().toLowerCase();
      if (ach.hidden && !isUnlocked) {
        return '???'.includes(q) || String(ach.category).toLowerCase().includes(q);
      }
      const title = getAchievementDisplayTitle(ach, lang, db.onboarding.bosses).toLowerCase();
      const desc = (ach.description ?? '').toLowerCase();
      return title.includes(q) || desc.includes(q) || ach.id.toLowerCase().includes(q);
    }
    return true;
  });

  // Equipped Category Title & Featured Badges
  const equippedTitleDef = ACHIEVEMENT_CATEGORIES.find(
    (ct) => ct.id === db.profile.selectedTitleId
  );
  const featuredIds = db.profile.featuredBadgeIds ?? [];
  const featuredBadges = featuredIds
    .map((id) => visibleAchievements.find((a) => a.id === id))
    .filter((a): a is AchievementDef => Boolean(a));

  const toggleFeaturedBadge = (achId: string) => {
    const current = db.profile.featuredBadgeIds ?? [];
    if (current.includes(achId)) {
      updateProfile({ featuredBadgeIds: current.filter((id) => id !== achId) });
    } else if (current.length < 3) {
      updateProfile({ featuredBadgeIds: [...current, achId] });
    } else {
      updateProfile({ featuredBadgeIds: [...current.slice(1), achId] });
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
    >
      {/* 1. Player Profile & Rank Card */}
      <AnimatedCard
        index={0}
        reduceMotion={reduceMotion}
        style={[
          styles.card,
          { backgroundColor: theme.card, borderColor: currentRank.color, borderWidth: 1.5 },
        ]}
      >
        <View style={styles.profileHeaderRow}>
          <Pressable
            style={[
              styles.avatarCircle,
              {
                backgroundColor: `${currentRank.color}20`,
                borderColor: currentRank.color,
                position: 'relative',
              },
            ]}
            onPress={() => setAvatarModalOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Change Profile Avatar"
          >
            {db.profile.avatarUri ? (
              <Image
                source={{ uri: db.profile.avatarUri }}
                style={{ width: 56, height: 56, borderRadius: 28 }}
              />
            ) : (
              <AppIcon name="user" size={28} color={currentRank.color} />
            )}
            <View
              style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                backgroundColor: theme.primary,
                borderRadius: 10,
                width: 20,
                height: 20,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1.5,
                borderColor: theme.card,
              }}
            >
              <AppIcon name="edit" size={11} color="#0E1220" />
            </View>
          </Pressable>
          <View style={{ flex: 1 }}>
            <RankBadge rank={currentRank} lang={lang} size="md" reduceMotion={reduceMotion} />
            <Text style={[styles.playerTitle, { color: theme.text }]}>
              {db.profile.displayName}
            </Text>
            {equippedTitleDef && (
              <View style={[styles.inlineIconRow, { marginTop: 4 }]}>
                <AppIcon name="crown" size={13} color={theme.warning} />
                <Text style={{ color: theme.warning, fontSize: 12, fontWeight: '900' }}>
                  « {isTh ? equippedTitleDef.title_th : equippedTitleDef.title_en} »
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Profile Avatar Actions */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <AnimatedPressable
            reduceMotion={reduceMotion}
            style={[
              styles.avatarActionBtn,
              { backgroundColor: theme.bgSecondary, borderColor: theme.border },
            ]}
            onPress={() => setAvatarModalOpen(true)}
          >
            <View style={styles.inlineIconRow}>
              <AppIcon name="edit" size={13} color={theme.primary} />
              <Text style={{ color: theme.primary, fontSize: 11, fontWeight: '800' }}>
                {isTh ? 'เปลี่ยนรูปโปรไฟล์' : 'Change Avatar'}
              </Text>
            </View>
          </AnimatedPressable>

          <AnimatedPressable
            reduceMotion={reduceMotion}
            style={[
              styles.avatarActionBtn,
              { backgroundColor: theme.bgSecondary, borderColor: theme.border },
            ]}
            onPress={async () => {
              const success = await requestPinShortcut(
                db.profile.displayName,
                db.profile.avatarUri ?? null
              );
              setShortcutFeedback(
                success
                  ? isTh
                    ? '✓ สร้างไอคอนแอปโปรไฟล์บนหน้าจอหลักแล้ว'
                    : '✓ Pinned profile icon to home screen'
                  : isTh
                  ? 'อุปกรณ์นี้ไม่รองรับการปักหมุดไอคอนอัตโนมัติ'
                  : 'Pinning shortcut not supported on this launcher'
              );
              setTimeout(() => setShortcutFeedback(null), 3500);
            }}
          >
            <View style={styles.inlineIconRow}>
              <AppIcon name="bolt" size={13} color={theme.warning} />
              <Text style={{ color: theme.warning, fontSize: 11, fontWeight: '800' }}>
                {isTh ? 'ตั้งเป็นไอคอนแอปหน้าจอ' : 'Pin App Icon'}
              </Text>
            </View>
          </AnimatedPressable>
        </View>

        {shortcutFeedback && (
          <Text style={{ color: theme.success, fontSize: 11, fontWeight: '700', marginTop: 6 }}>
            {shortcutFeedback}
          </Text>
        )}

        {/* Featured Badges Showcase (up to 3 pinned badges) */}
        {featuredBadges.length > 0 && (
          <View style={[styles.chipRow, { marginTop: 10 }]}>
            {featuredBadges.map((fb) => {
              const tMeta = TIER_METADATA[fb.tier];
              return (
                <View
                  key={fb.id}
                  style={[
                    styles.featuredBadgePill,
                    {
                      backgroundColor: `${tMeta.color}18`,
                      borderColor: tMeta.color,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 11 }}>{tMeta.badgeEmoji}</Text>
                  <Text style={{ color: tMeta.color, fontSize: 11, fontWeight: '900' }}>
                    {getAchievementDisplayTitle(fb, lang, db.onboarding.bosses)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Personal Vow & Vow Review Trigger (onb_vow / vow_review) */}
        {Boolean(db.onboarding?.vow) && (
          <View
            style={[
              styles.subBox,
              {
                backgroundColor: `${theme.primary}12`,
                borderColor: `${theme.primary}44`,
                marginTop: 10,
              },
            ]}
          >
            <View style={styles.headerRowBetween}>
              <View style={styles.inlineIconRow}>
                <AppIcon name="star" size={13} color={theme.primary} />
                <Text style={{ color: theme.primary, fontSize: 11, fontWeight: '800' }}>
                  {isTh ? 'คำสัตย์ปฏิญาณของฉัน' : 'My Hunter Vow'}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  recordAppEvent('event:vow_reviewed', 1);
                  setVowReviewedBanner(true);
                }}
              >
                <Text style={{ color: theme.success, fontSize: 11, fontWeight: '800' }}>
                  {vowReviewedBanner
                    ? isTh
                      ? '✓ ทบทวนคำสัตย์แล้ว'
                      : '✓ Vow Reviewed'
                    : isTh
                    ? 'ทบทวนคำสัตย์'
                    : 'Review Vow'}
                </Text>
              </Pressable>
            </View>
            <Text
              style={{
                color: theme.text,
                fontSize: 12,
                fontStyle: 'italic',
                marginTop: 4,
              }}
            >
              “{db.onboarding?.vow}”
            </Text>
          </View>
        )}

        <XpBar
          levelState={levelState}
          theme={theme}
          dailyRepeatableXp={dailyRepeatableXpToday}
          lang={lang}
          reduceMotion={reduceMotion}
        />

        {nextRank && (
          <View style={[styles.inlineIconRow, { marginTop: 10 }]}>
            <AppIcon name="quest" size={14} color={theme.primary} />
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
              {strings.profile.rankProgress}: Rank {nextRank.id} – {nextRank.name} (Lv.
              {nextRank.min_level} / {nextRank.min_total_xp.toLocaleString()} XP)
            </Text>
          </View>
        )}

        {/* Monarch Special Unlock Trials (Section 7.5) */}
        {/* Only show when currentRank is SS or Monarch (M) as requested: "เงื่อนไขปลดล็อกแรงค์สูงสุด ให้ซ่อนไว้ก่อน ค่อยแสดงตอนอยู่แรงค์ SS" */}
        {(currentRank.id === 'SS' || currentRank.id === 'M') && (
          <View
            style={[
              styles.subBox,
              { backgroundColor: theme.bgSecondary, borderColor: theme.border, marginTop: 12 },
            ]}
          >
            <View style={styles.inlineIconRow}>
              <AppIcon name="crown" size={14} color={theme.warning} />
              <Text style={{ color: theme.warning, fontWeight: '800', fontSize: 12 }}>
                {strings.profile.monarchTrials}:
              </Text>
            </View>
            <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4 }}>
              • Level 221+: {levelState.level}/221 {monarchEligibility.levelMet ? '✓' : ''}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 11 }}>
              • Active Days 365+: {monarchEligibility.currentActiveDays}/
              {monarchEligibility.requiredActiveDays} {monarchEligibility.activeDaysMet ? '✓' : ''}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 11 }}>
              • Badge Categories 5+: {monarchEligibility.currentBadgeCategories}/
              {monarchEligibility.requiredBadgeCategories}{' '}
              {monarchEligibility.badgeCategoriesMet ? '✓' : ''}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 11 }}>
              • {isTh ? 'ถ้วยทองแดงทั้งหมด' : 'All Bronze Trophies'}: {monarchEligibility.bronzeCount}/
              {monarchEligibility.totalBronze} {monarchEligibility.bronzeMet ? '✓' : ''}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 11 }}>
              • {isTh ? 'ถ้วยเงินทั้งหมด' : 'All Silver Trophies'}: {monarchEligibility.silverCount}/
              {monarchEligibility.totalSilver} {monarchEligibility.silverMet ? '✓' : ''}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 11 }}>
              • {isTh ? 'ถ้วยทองครึ่งหนึ่งจากทั้งหมด (50%)' : 'Half of Gold Trophies (50%)'}: {monarchEligibility.goldCount}/
              {monarchEligibility.requiredGold} {monarchEligibility.goldMet ? '✓' : ''}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 11 }}>
              • {isTh ? 'ถ้วยเพชร 10 อัน' : '10 Diamond Trophies'}: {monarchEligibility.diamondCount}/
              {monarchEligibility.requiredDiamond} {monarchEligibility.diamondMet ? '✓' : ''}
            </Text>
          </View>
        )}
      </AnimatedCard>

      {/* Horizontal Navigation Tab Bar underneath Player Profile */}
      <View style={{ marginVertical: 8 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 2, paddingVertical: 4 }}
        >
          {[
            { id: 'personal_quests', label: isTh ? 'ภารกิจส่วนตัว' : 'Personal Quests', icon: 'quest' as const },
            { id: 'trophies', label: isTh ? 'ห้องถ้วยรางวัล' : 'Trophy Room', icon: 'trophy' as const },
            { id: 'all_ranks', label: 'All Rank', icon: 'shield' as const },
            { id: 'support', label: isTh ? 'สนับสนุนผู้พัฒนา' : 'Support Developer', icon: 'heart' as const },
            { id: 'settings', label: isTh ? 'การตั้งค่า' : 'Settings', icon: 'gear' as const },
            { id: 'footer', label: isTh ? 'ส่วนท้ายของโปรไฟล์' : 'Profile Footer', icon: 'info' as const },
          ].map((tab) => {
            const active = profileTab === tab.id;
            return (
              <AnimatedPressable
                key={tab.id}
                reduceMotion={reduceMotion}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? `${theme.primary}25` : theme.card,
                    borderColor: active ? theme.primary : theme.border,
                    paddingVertical: 7,
                    paddingHorizontal: 14,
                  },
                ]}
                onPress={() => setProfileTab(tab.id as ProfileMainTab)}
              >
                <Text
                  style={{
                    color: active ? theme.primary : theme.textSecondary,
                    fontWeight: '800',
                    fontSize: 12,
                  }}
                >
                  {tab.label}
                </Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      </View>

      {/* 2. Personal Quest Manager (Section 8.4) */}
      {profileTab === 'personal_quests' && (
      <AnimatedCard
        index={1}
        reduceMotion={reduceMotion}
        style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
      >
        <View style={styles.inlineIconRow}>
          <AppIcon name="quest" size={18} color={theme.primary} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            {strings.profile.personalQuests} (Max 50 XP/{isTh ? 'วัน' : 'day'})
          </Text>
        </View>
        <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4, marginBottom: 10 }}>
          {isTh
            ? 'สร้างภารกิจที่เข้ากับชีวิตของคุณเอง เช่น อ่านหนังสือ 20 นาที หรือฝึกภาษา'
            : 'Create custom quests tailored to your life.'}
        </Text>

        <View style={styles.inlineRow}>
          <TextInput
            value={newQuestTitle}
            onChangeText={setNewQuestTitle}
            placeholder={isTh ? 'ชื่อภารกิจส่วนตัว...' : 'New personal quest...'}
            placeholderTextColor={theme.textMuted}
            style={[
              styles.input,
              {
                flex: 1,
                backgroundColor: theme.bgSecondary,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
          />
        </View>

        <View style={[styles.inlineRow, { marginTop: 8, marginBottom: 12 }]}>
          {([10, 25, 50] as const).map((xp) => {
            const active = newQuestReward === xp;
            return (
              <AnimatedPressable
                key={xp}
                reduceMotion={reduceMotion}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? `${theme.primary}25` : theme.bgSecondary,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setNewQuestReward(xp)}
              >
                <Text
                  style={{
                    color: active ? theme.primary : theme.textSecondary,
                    fontWeight: '800',
                    fontSize: 12,
                  }}
                >
                  +{xp} XP
                </Text>
              </AnimatedPressable>
            );
          })}
          <AnimatedPressable
            reduceMotion={reduceMotion}
            style={[styles.primaryBtn, { backgroundColor: theme.primary, flex: 1 }]}
            onPress={() => {
              addPersonalQuest(newQuestTitle, newQuestReward);
              setNewQuestTitle('');
            }}
          >
            <Text style={styles.primaryBtnText}>
              + {isTh ? 'เพิ่มเควสต์' : 'Add Quest'}
            </Text>
          </AnimatedPressable>
        </View>

        {db.personalQuestTemplates.map((pq) => {
          const done = donePersonalToday.has(pq.id);
          return (
            <View
              key={pq.id}
              style={[
                styles.questItem,
                { backgroundColor: theme.bgSecondary, borderColor: done ? theme.success : theme.border },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>
                  {isTh ? pq.title_th : pq.title_en}
                </Text>
                <Text style={{ color: theme.primary, fontSize: 11, fontWeight: '700' }}>
                  +{pq.reward_xp} XP
                </Text>
              </View>
              {!done ? (
                <AnimatedPressable
                  reduceMotion={reduceMotion}
                  style={[styles.primaryBtn, { backgroundColor: theme.success }]}
                  onPress={() => completePersonalQuest(pq.id)}
                >
                  <Text style={styles.primaryBtnText}>
                    {isTh ? 'ทำสำเร็จ' : 'Complete'}
                  </Text>
                </AnimatedPressable>
              ) : (
                <View style={styles.inlineIconRow}>
                  <AppIcon name="check" size={14} color={theme.success} />
                  <Text style={{ color: theme.success, fontWeight: '800', fontSize: 12 }}>
                    {isTh ? 'สำเร็จวันนี้แล้ว' : 'Done Today'}
                  </Text>
                </View>
              )}
              <Pressable onPress={() => deletePersonalQuest(pq.id)} style={{ padding: 6 }}>
                <AppIcon name="trash" size={14} color={theme.textMuted} />
              </Pressable>
            </View>
          );
        })}

        {/* Weekly & Milestone Quests Summary */}
        <View style={[styles.inlineIconRow, { marginTop: 14, marginBottom: 8 }]}>
          <AppIcon name="calendar" size={16} color={theme.primary} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            Weekly & Milestone Quests
          </Text>
        </View>
        {[...thisWeekQuests, ...db.milestoneQuests].map((mq) => (
          <View
            key={`${mq.templateId}_${mq.periodKey}`}
            style={[
              styles.questItem,
              { backgroundColor: theme.bgSecondary, borderColor: theme.border },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: '700', fontSize: 12 }}>
                [{mq.template.type.toUpperCase()}]{' '}
                {isTh ? mq.template.title_th : mq.template.title_en}
              </Text>
              <Text style={{ color: theme.textMuted, fontSize: 11 }}>
                {mq.progress} / {mq.target} · +{mq.template.reward_xp} XP
              </Text>
            </View>
            <Text
              style={{
                color: mq.status === 'completed' ? theme.success : theme.primary,
                fontWeight: '800',
                fontSize: 12,
              }}
            >
              {mq.status === 'completed' ? 'DONE' : 'IN PROGRESS'}
            </Text>
          </View>
        ))}
      </AnimatedCard>
      )}

      {/* 3. Trophy Room — ห้องถ้วยรางวัล (199 Achievements, Section 5 & 7) */}
      {profileTab === 'trophies' && (
      <AnimatedCard
        index={2}
        reduceMotion={reduceMotion}
        style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
      >
        {/* Header & Overall Progress */}
        <View style={styles.headerRowBetween}>
          <View style={styles.inlineIconRow}>
            <AppIcon name="trophy" size={18} color={theme.warning} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {isTh ? 'ห้องถ้วยรางวัล (Trophy Room)' : 'Trophy Room'}
            </Text>
          </View>
          <Text style={{ color: theme.warning, fontWeight: '900', fontSize: 13 }}>
            {visibleUnlockedCount} / {visibleAchievements.length} ({overallAchPct}%)
          </Text>
        </View>

        <View style={{ marginTop: 8, marginBottom: 12 }}>
          <AnimatedProgressBar
            percent={overallAchPct}
            fillColor={theme.warning}
            trackColor={theme.bgSecondary}
            borderColor={theme.border}
            height={10}
            reduceMotion={reduceMotion}
          />
        </View>

        {/* Tier Breakdown Summary (Bronze / Silver / Gold / Legend) */}
        <View style={styles.tierSummaryRow}>
          {tierCounts.map(({ tier, meta, unlocked, total }) => {
            const active = selectedTier === tier;
            return (
              <AnimatedPressable
                key={tier}
                reduceMotion={reduceMotion}
                style={[
                  styles.tierSummaryPill,
                  {
                    backgroundColor: active ? `${meta.color}25` : theme.bgSecondary,
                    borderColor: active ? meta.color : `${meta.color}55`,
                  },
                ]}
                onPress={() => setSelectedTier(active ? 'all' : tier)}
              >
                <Text style={{ fontSize: 14 }}>{meta.badgeEmoji}</Text>
                <Text style={{ color: meta.color, fontSize: 11, fontWeight: '900' }}>
                  {unlocked}/{total}
                </Text>
                <Text style={{ color: theme.textMuted, fontSize: 9, fontWeight: '700' }}>
                  +{meta.xp} XP
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>

        {/* Toggle Expand / Collapse Trophy Room */}
        {!isTrophyRoomExpanded ? (
          <AnimatedPressable
            reduceMotion={reduceMotion}
            style={[
              styles.trophyToggleBtn,
              { backgroundColor: `${theme.warning}18`, borderColor: theme.warning, marginTop: 12 },
            ]}
            onPress={() => setIsTrophyRoomExpanded(true)}
          >
            <View style={styles.inlineIconRow}>
              <AppIcon name="trophy" size={16} color={theme.warning} />
              <Text style={{ color: theme.warning, fontSize: 13, fontWeight: '900' }}>
                {isTh
                  ? '🏆 เปิดดูห้องถ้วยรางวัลทั้งหมด 199 รายการ (แตะเพื่อขยาย)'
                  : '🏆 Expand Trophy Room (199 Achievements)'}
              </Text>
              <Text style={{ color: theme.warning, fontSize: 12 }}>▼</Text>
            </View>
          </AnimatedPressable>
        ) : (
          <>
            <AnimatedPressable
              reduceMotion={reduceMotion}
              style={[
                styles.trophyToggleBtn,
                { backgroundColor: theme.bgSecondary, borderColor: theme.border, marginTop: 12 },
              ]}
              onPress={() => setIsTrophyRoomExpanded(false)}
            >
              <View style={styles.inlineIconRow}>
                <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '800' }}>
                  {isTh ? '▲ ย่อห้องถ้วยรางวัล' : '▲ Collapse Trophy Room'}
                </Text>
              </View>
            </AnimatedPressable>

            {/* Category Completion Titles Drawer Toggle (Section 5) */}
            <AnimatedPressable
          reduceMotion={reduceMotion}
          style={[
            styles.subBox,
            {
              backgroundColor: `${theme.warning}12`,
              borderColor: `${theme.warning}55`,
              marginTop: 12,
            },
          ]}
          onPress={() => setShowTitlesDrawer((prev) => !prev)}
        >
          <View style={styles.headerRowBetween}>
            <View style={styles.inlineIconRow}>
              <AppIcon name="crown" size={15} color={theme.warning} />
              <Text style={{ color: theme.warning, fontWeight: '900', fontSize: 12 }}>
                {isTh
                  ? `ฉายาประจำหมวดหมู่ (${categoryTitlesProgress.filter((c) => c.isCompleted).length}/12 ฉายา)`
                  : `Category Mastery Titles (${categoryTitlesProgress.filter((c) => c.isCompleted).length}/12)`}
              </Text>
            </View>
            <Text style={{ color: theme.primary, fontSize: 11, fontWeight: '800' }}>
              {showTitlesDrawer
                ? isTh
                  ? 'ซ่อน ▲'
                  : 'Hide ▲'
                : isTh
                ? 'เลือกฉายา ▼'
                : 'Select Title ▼'}
            </Text>
          </View>
        </AnimatedPressable>

        {showTitlesDrawer && (
          <View style={{ marginTop: 8, gap: 6 }}>
            {categoryTitlesProgress.map((ct) => {
              const isEquipped = db.profile.selectedTitleId === ct.category.id;
              return (
                <Pressable
                  key={ct.category.id}
                  style={[
                    styles.titleMasteryRow,
                    {
                      backgroundColor: isEquipped
                        ? `${theme.warning}22`
                        : theme.bgSecondary,
                      borderColor: isEquipped
                        ? theme.warning
                        : ct.isCompleted
                        ? `${theme.success}66`
                        : theme.border,
                    },
                  ]}
                  onPress={() => {
                    if (ct.isCompleted) {
                      updateProfile({
                        selectedTitleId: isEquipped ? null : ct.category.id,
                      });
                    }
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: ct.isCompleted ? theme.warning : theme.textSecondary,
                        fontWeight: '900',
                        fontSize: 12,
                      }}
                    >
                      {ct.isCompleted ? '👑 ' : '🔒 '}
                      {isTh ? ct.category.title_th : ct.category.title_en}
                    </Text>
                    <Text style={{ color: theme.textMuted, fontSize: 10 }}>
                      {isTh ? ct.category.name_th : ct.category.name_en} · {ct.unlockedCount}/
                      {ct.eligibleTotal}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: isEquipped
                        ? theme.warning
                        : ct.isCompleted
                        ? theme.success
                        : theme.textMuted,
                      fontSize: 11,
                      fontWeight: '800',
                    }}
                  >
                    {isEquipped
                      ? isTh
                        ? 'สวมใส่แล้ว'
                        : 'Equipped'
                      : ct.isCompleted
                      ? isTh
                        ? 'แตะเพื่อสวมใส่'
                        : 'Tap to Equip'
                      : `${Math.round((ct.unlockedCount / Math.max(1, ct.eligibleTotal)) * 100)}%`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Near Completion Section ("ใกล้ได้แล้ว" >= 70%, Section 7.1) */}
        {nearCompletionAchievements.length > 0 && (
          <View
            style={[
              styles.subBox,
              {
                backgroundColor: `${theme.primary}12`,
                borderColor: `${theme.primary}55`,
                marginTop: 12,
              },
            ]}
          >
            <View style={[styles.inlineIconRow, { marginBottom: 8 }]}>
              <AppIcon name="fire" size={15} color={theme.primary} />
              <Text style={{ color: theme.primary, fontWeight: '900', fontSize: 12 }}>
                {isTh
                  ? 'ใกล้ปลดล็อกแล้ว (ความคืบหน้าสูงสุด)'
                  : 'Near Completion'}
              </Text>
            </View>
            {nearCompletionAchievements.map(({ achievement, current, target, percent }) => {
              const tMeta = TIER_METADATA[achievement.tier];
              return (
                <View key={achievement.id} style={styles.nearItemRow}>
                  <View style={styles.headerRowBetween}>
                    <Text style={{ color: theme.text, fontWeight: '800', fontSize: 12 }}>
                      {tMeta.badgeEmoji}{' '}
                      {getAchievementDisplayTitle(achievement, lang, db.onboarding.bosses)}
                    </Text>
                    <Text style={{ color: theme.primary, fontWeight: '900', fontSize: 11 }}>
                      {current}/{target} ({percent}%)
                    </Text>
                  </View>
                  <Text style={{ color: theme.textSecondary, fontSize: 11, marginBottom: 4 }}>
                    {achievement.description}
                  </Text>
                  <AnimatedProgressBar
                    percent={percent}
                    fillColor={theme.primary}
                    trackColor={theme.card}
                    borderColor={theme.border}
                    height={7}
                    reduceMotion={reduceMotion}
                  />
                </View>
              );
            })}
          </View>
        )}

        {/* Search & Status Filters */}
        <TextInput
          value={searchAchievement}
          onChangeText={setSearchAchievement}
          placeholder={
            isTh
              ? 'ค้นหาชื่อถ้วยรางวัล หรือเงื่อนไข...'
              : 'Search achievements...'
          }
          placeholderTextColor={theme.textMuted}
          style={[
            styles.input,
            {
              backgroundColor: theme.bgSecondary,
              color: theme.text,
              borderColor: theme.border,
              marginTop: 12,
            },
          ]}
        />

        {/* Status Filter Row */}
        <View style={[styles.chipRow, { marginTop: 8 }]}>
          {(
            [
              { id: 'all', th: 'ทั้งหมด', en: 'All' },
              { id: 'unlocked', th: 'ปลดล็อกแล้ว', en: 'Unlocked' },
              { id: 'locked', th: 'ยังไม่ปลดล็อก', en: 'Locked' },
            ] as const
          ).map((st) => {
            const active = statusFilter === st.id;
            return (
              <Pressable
                key={st.id}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? `${theme.primary}24` : theme.bgSecondary,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setStatusFilter(st.id)}
              >
                <Text
                  style={{
                    color: active ? theme.primary : theme.textSecondary,
                    fontSize: 11,
                    fontWeight: '800',
                  }}
                >
                  {isTh ? st.th : st.en}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* 12 Category Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.categoryScrollRow, { marginTop: 8, marginBottom: 12 }]}
        >
          <Pressable
            style={[
              styles.chip,
              {
                backgroundColor:
                  selectedCategory === 'all' ? `${theme.warning}25` : theme.bgSecondary,
                borderColor: selectedCategory === 'all' ? theme.warning : theme.border,
              },
            ]}
            onPress={() => setSelectedCategory('all')}
          >
            <Text
              style={{
                color: selectedCategory === 'all' ? theme.warning : theme.textSecondary,
                fontSize: 11,
                fontWeight: '900',
              }}
            >
              {isTh ? `ทั้งหมด (${visibleAchievements.length})` : `All (${visibleAchievements.length})`}
            </Text>
          </Pressable>

          {allCategories.map((cat) => {
            const active = selectedCategory === cat.id;
            const catTotal = visibleAchievements.filter((a) => a.category === cat.id).length;
            const catUnlocked = visibleAchievements.filter(
              (a) => a.category === cat.id && unlockedSet.has(a.id)
            ).length;
            return (
              <Pressable
                key={cat.id}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? `${theme.warning}25` : theme.bgSecondary,
                    borderColor: active ? theme.warning : theme.border,
                  },
                ]}
                onPress={() => setSelectedCategory(active ? 'all' : cat.id)}
              >
                <Text
                  style={{
                    color: active ? theme.warning : theme.textSecondary,
                    fontSize: 11,
                    fontWeight: '800',
                  }}
                >
                  {isTh ? cat.name_th : cat.name_en} ({catUnlocked}/{catTotal})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Achievements Grid */}
        <View style={styles.badgeGrid}>
          {filteredAchievements.map((ach) => {
            const unlocked = unlockedSet.has(ach.id);
            const unlockedAt = unlockedAtMap.get(ach.id);
            const tMeta = TIER_METADATA[ach.tier];
            const isMaskedSecret = ach.hidden && !unlocked;
            const prog = getAchievementProgress(ach, achievementMetrics);
            const isPinned = featuredIds.includes(ach.id);

            return (
              <View
                key={ach.id}
                style={[
                  styles.badgeTile,
                  {
                    backgroundColor: unlocked
                      ? `${tMeta.color}15`
                      : theme.bgSecondary,
                    borderColor: unlocked ? tMeta.color : theme.border,
                    borderWidth: unlocked ? 1.5 : 1,
                    opacity: unlocked ? 1 : 0.85,
                  },
                ]}
              >
                {/* Top Row: Tier Badge + Stat Tag */}
                <View style={styles.headerRowBetween}>
                  <View
                    style={[
                      styles.tierMiniPill,
                      {
                        backgroundColor: `${tMeta.color}24`,
                        borderColor: `${tMeta.color}66`,
                      },
                    ]}
                  >
                    <Text style={{ color: tMeta.color, fontSize: 10, fontWeight: '900' }}>
                      {tMeta.badgeEmoji} +{ach.xp} XP
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: unlocked ? theme.success : theme.textMuted,
                      fontSize: 10,
                      fontWeight: '800',
                    }}
                  >
                    {ach.stat ?? 'ALL'}
                  </Text>
                </View>

                {/* Title */}
                <Text
                  style={{
                    color: unlocked ? theme.text : theme.textSecondary,
                    fontWeight: '900',
                    fontSize: 13,
                    marginTop: 8,
                  }}
                >
                  {isMaskedSecret
                    ? '🔒 ???'
                    : getAchievementDisplayTitle(ach, lang, db.onboarding.bosses)}
                </Text>

                {/* Description or Secret Hint */}
                <Text
                  style={{
                    color: theme.textMuted,
                    fontSize: 11,
                    marginTop: 3,
                    lineHeight: 15,
                  }}
                >
                  {isMaskedSecret
                    ? getSecretHint(ach, lang)
                    : ach.description}
                </Text>

                {/* Progress Bar (for locked non-secret) or Unlocked Footer */}
                {!unlocked && !isMaskedSecret && (
                  <View style={{ marginTop: 8 }}>
                    <View style={[styles.headerRowBetween, { marginBottom: 3 }]}>
                      <Text style={{ color: theme.textMuted, fontSize: 10 }}>
                        {isTh ? 'ความคืบหน้า' : 'Progress'}
                      </Text>
                      <Text
                        style={{
                          color: prog.percent >= 70 ? theme.primary : theme.textSecondary,
                          fontSize: 10,
                          fontWeight: '800',
                        }}
                      >
                        {prog.current}/{prog.target} ({prog.percent}%)
                      </Text>
                    </View>
                    <AnimatedProgressBar
                      percent={prog.percent}
                      fillColor={prog.percent >= 70 ? theme.primary : tMeta.color}
                      trackColor={theme.card}
                      borderColor={theme.border}
                      height={6}
                      reduceMotion={reduceMotion}
                    />
                  </View>
                )}

                {unlocked && (
                  <View style={[styles.headerRowBetween, { marginTop: 8 }]}>
                    <Text style={{ color: theme.success, fontSize: 10, fontWeight: '800' }}>
                      ✓{' '}
                      {unlockedAt
                        ? new Date(unlockedAt).toISOString().slice(0, 10)
                        : isTh
                        ? 'ปลดล็อกแล้ว'
                        : 'Unlocked'}
                    </Text>
                    <Pressable onPress={() => toggleFeaturedBadge(ach.id)}>
                      <Text
                        style={{
                          color: isPinned ? theme.warning : theme.primary,
                          fontSize: 10,
                          fontWeight: '900',
                        }}
                      >
                        {isPinned
                          ? isTh
                            ? '★ ติดโปรไฟล์แล้ว'
                            : '★ Pinned'
                          : isTh
                          ? '+ ติดโปรไฟล์'
                          : '+ Pin'}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
        </View>

            <AnimatedPressable
              reduceMotion={reduceMotion}
              style={[
                styles.trophyToggleBtn,
                { backgroundColor: theme.bgSecondary, borderColor: theme.border, marginTop: 14 },
              ]}
              onPress={() => setIsTrophyRoomExpanded(false)}
            >
              <View style={styles.inlineIconRow}>
                <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '800' }}>
                  {isTh ? '▲ ย่อห้องถ้วยรางวัล' : '▲ Collapse Trophy Room'}
                </Text>
              </View>
            </AnimatedPressable>
          </>
        )}
      </AnimatedCard>
      )}

      {/* 4. All 8 Ranks Reference Table */}
      {profileTab === 'all_ranks' && (
      <AnimatedCard
        index={3}
        reduceMotion={reduceMotion}
        style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
      >
        <View style={[styles.inlineIconRow, { marginBottom: 8 }]}>
          <AppIcon name="shield" size={18} color={theme.primary} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            {isTh ? 'ทำเนียบ Rank ทั้ง 8 ระดับ' : 'All 8 Awakened Ranks'}
          </Text>
        </View>
        {allRanks.map((r) => (
          <View
            key={r.id}
            style={[
              styles.rankRow,
              {
                borderColor: r.id === currentRank.id ? r.color : theme.border,
                backgroundColor: r.id === currentRank.id ? `${r.color}18` : theme.bgSecondary,
              },
            ]}
          >
            <View style={styles.inlineIconRow}>
              <AppIcon
                name={r.id === 'Monarch' || r.id === 'SS' || r.id === 'S' ? 'crown' : 'shield'}
                size={14}
                color={r.color}
              />
              <Text style={{ color: r.color, fontWeight: '900', fontSize: 13 }}>
                {r.id} – {r.name} ({isTh ? r.title_th : r.title_en})
              </Text>
            </View>
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
              Lv.{r.min_level}+ · {r.min_total_xp.toLocaleString()} XP
            </Text>
          </View>
        ))}
      </AnimatedCard>
      )}

      {/* 4C. Developer Support & Donation (Thailand Only) */}
      {profileTab === 'support' && (
        <AnimatedCard
          index={4}
          reduceMotion={reduceMotion}
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: '#138F46', borderWidth: 1.5 },
          ]}
        >
          <View style={styles.headerRowBetween}>
            <View style={styles.inlineIconRow}>
              <Text style={{ fontSize: 18 }}>💚</Text>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {isTh ? 'สนับสนุนผู้พัฒนา (Donation)' : 'Support Developer (Donation)'}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: '#138F4625',
                borderColor: '#138F46',
                borderWidth: 1,
                borderRadius: 6,
                paddingHorizontal: 7,
                paddingVertical: 2,
              }}
            >
              <Text style={{ color: '#138F46', fontSize: 10, fontWeight: '900' }}>
                {isTh ? 'ประเทศไทยเท่านั้น' : 'Thailand Only'}
              </Text>
            </View>
          </View>

          <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 6, lineHeight: 18 }}>
            {isTh
              ? 'ทุกการสนับสนุนช่วยให้โปรเจกต์ Awakened Life RPG พัฒนาต่อเนื่องและไม่มีโฆษณาคั่น ขอบคุณมากครับ!'
              : 'Your support helps keep Awakened Life RPG ad-free and continuously updated. Thank you!'}
          </Text>

          <View
            style={{
              backgroundColor: theme.bgSecondary,
              borderColor: '#138F4666',
              borderWidth: 1,
              borderRadius: 12,
              padding: 12,
              marginTop: 10,
            }}
          >
            <View style={styles.inlineIconRow}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#138F46' }} />
              <Text style={{ color: theme.text, fontSize: 13, fontWeight: '800' }}>
                {isTh ? 'ธนาคารกสิกรไทย (KBANK)' : 'Kasikorn Bank (KBANK)'}
              </Text>
            </View>
            <Text
              style={{
                color: '#3DDC97',
                fontSize: 20,
                fontWeight: '900',
                letterSpacing: 1.5,
                marginTop: 4,
              }}
            >
              1638680528
            </Text>

            <View style={[styles.inlineIconRow, { marginTop: 6 }]}>
              <AppIcon name="user" size={13} color={theme.textSecondary} />
              <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '700' }}>
                {isTh ? 'ชื่อบัญชี:' : 'Account Name:'}
              </Text>
              <Text style={{ color: theme.text, fontSize: 13, fontWeight: '900' }}>
                นาย ฐิติวุฒน์ วงศ์ละคร
              </Text>
            </View>

            <AnimatedPressable
              reduceMotion={reduceMotion}
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: copiedDonation ? theme.success : '#138F46',
                  marginTop: 10,
                  alignItems: 'center',
                },
              ]}
              onPress={() => {
                copyToClipboard('1638680528');
                setCopiedDonation(true);
                setTimeout(() => setCopiedDonation(false), 3000);
              }}
            >
              <View style={styles.inlineIconRow}>
                <AppIcon name="edit" size={14} color="#0E1220" />
                <Text style={{ color: '#0E1220', fontWeight: '900', fontSize: 12 }}>
                  {copiedDonation
                    ? isTh
                      ? '✓ คัดลอกเลขบัญชี 1638680528 แล้ว'
                      : '✓ Copied KBANK 1638680528'
                    : isTh
                    ? 'คัดลอกเลขบัญชี (นาย ฐิติวุฒน์ วงศ์ละคร)'
                    : 'Copy Account (Thitiwut Wonglakhon)'}
                </Text>
              </View>
            </AnimatedPressable>
          </View>
        </AnimatedCard>
      )}

      {/* 5. Settings, Preferences & Privacy with 4 Sub-Tabs */}
      {profileTab === 'settings' && (
        <AnimatedCard
          index={4}
          reduceMotion={reduceMotion}
          style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          {/* Header */}
          <View style={[styles.inlineIconRow, { marginBottom: 12 }]}>
            <AppIcon name="settings" size={18} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {strings.profile.settings}
            </Text>
          </View>

          {/* Sub-tab Navigation Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingBottom: 10 }}
          >
            {[
              { id: 'privacy', label: isTh ? '🔒 ตั้งค่าความเป็นส่วนตัว' : '🔒 Privacy & Security' },
              { id: 'personal_data', label: isTh ? '👤 จัดการข้อมูลส่วนตัว' : '👤 Personal Data' },
              { id: 'notifications', label: isTh ? '🔔 การแจ้งเตือน' : '🔔 Notifications' },
              { id: 'widgets', label: isTh ? '📱 วิดเจ็ต' : '📱 Widgets' },
            ].map((subTab) => {
              const active = settingsSubTab === subTab.id;
              return (
                <AnimatedPressable
                  key={subTab.id}
                  reduceMotion={reduceMotion}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? theme.primary : theme.bgSecondary,
                      borderColor: active ? theme.primary : theme.border,
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                    },
                  ]}
                  onPress={() => setSettingsSubTab(subTab.id as SettingsSubTab)}
                >
                  <Text
                    style={{
                      color: active ? '#0E1220' : theme.textSecondary,
                      fontSize: 12,
                      fontWeight: active ? '900' : '700',
                    }}
                  >
                    {subTab.label}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </ScrollView>

          {/* Sub-Tab 1: Privacy & Security */}
          {settingsSubTab === 'privacy' && (
            <View style={{ marginTop: 4 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 8 }}>
                {isTh ? 'ความปลอดภัยและการแสดงผลระบบ:' : 'Security & System Display:'}
              </Text>

              {/* App Lock PIN Chip */}
              <AnimatedPressable
                reduceMotion={reduceMotion}
                style={[
                  styles.chip,
                  {
                    backgroundColor: Boolean(db.profile.appLockPin)
                      ? `${theme.success}18`
                      : theme.bgSecondary,
                    borderColor: Boolean(db.profile.appLockPin) ? theme.success : theme.border,
                    marginBottom: 8,
                    paddingVertical: 10,
                  },
                ]}
                onPress={() => {
                  setAppLockInputPin('');
                  setAppLockConfirmPin('');
                  setVerifyCurrentPin('');
                  setPinVerified(false);
                  setAppLockError(null);
                  setAppLockSuccessMsg(null);
                  setAppLockStep(db.profile.appLockPin ? 'manage' : 'enter_pin');
                  setAppLockModalOpen(true);
                }}
              >
                <View style={styles.inlineIconRow}>
                  <AppIcon
                    name="lock"
                    size={14}
                    color={Boolean(db.profile.appLockPin) ? theme.success : theme.textSecondary}
                  />
                  <Text style={{ color: theme.text, fontWeight: '700', fontSize: 12 }}>
                    {Boolean(db.profile.appLockPin)
                      ? isTh
                        ? 'ล็อกแอปด้วย PIN: เปิดแล้ว ✓ (แตะเพื่อจัดการ)'
                        : 'App Lock PIN: Enabled ✓ (Tap to manage)'
                      : isTh
                      ? 'เปิดใช้งานล็อกแอป (App Lock)'
                      : 'Enable App Lock'}
                  </Text>
                </View>
              </AnimatedPressable>

              <View style={styles.chipRow}>
                {/* Sound Effects */}
                <AnimatedPressable
                  reduceMotion={reduceMotion}
                  style={[styles.chip, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}
                  onPress={() => updateProfile({ soundEnabled: !db.profile.soundEnabled })}
                >
                  <Text style={{ color: theme.text, fontWeight: '700', fontSize: 12 }}>
                    {db.profile.soundEnabled
                      ? isTh
                        ? 'เสียงเอฟเฟกต์: เปิด'
                        : 'Sound Effects: ON'
                      : isTh
                      ? 'เสียงเอฟเฟกต์: ปิด'
                      : 'Sound Effects: OFF'}
                  </Text>
                </AnimatedPressable>

                {/* Reduce Motion */}
                <AnimatedPressable
                  reduceMotion={reduceMotion}
                  style={[styles.chip, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}
                  onPress={() => updateProfile({ reduceEffects: !db.profile.reduceEffects })}
                >
                  <View style={styles.inlineIconRow}>
                    <AppIcon
                      name="bolt"
                      size={13}
                      color={db.profile.reduceEffects ? theme.textMuted : theme.success}
                    />
                    <Text style={{ color: theme.text, fontWeight: '700', fontSize: 12 }}>
                      {db.profile.reduceEffects
                        ? isTh
                          ? 'ลดแอนิเมชัน: เปิด'
                          : 'Reduce Motion: ON'
                        : isTh
                        ? 'แอนิเมชันเต็มรูปแบบ: เปิด'
                        : 'Full Animations: ON'}
                    </Text>
                  </View>
                </AnimatedPressable>

                {/* Mute Badges */}
                <AnimatedPressable
                  reduceMotion={reduceMotion}
                  style={[styles.chip, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}
                  onPress={() =>
                    updateProfile({ muteAchievementAlerts: !db.profile.muteAchievementAlerts })
                  }
                >
                  <View style={styles.inlineIconRow}>
                    <AppIcon
                      name="trophy"
                      size={13}
                      color={db.profile.muteAchievementAlerts ? theme.textMuted : theme.warning}
                    />
                    <Text style={{ color: theme.text, fontWeight: '700', fontSize: 12 }}>
                      {db.profile.muteAchievementAlerts
                        ? isTh
                          ? 'ปิดป๊อปอัปถ้วย: เปิด'
                          : 'Mute Badges: ON'
                        : isTh
                        ? 'ป๊อปอัปถ้วย: แสดงปกติ'
                        : 'Badge Popups: ON'}
                    </Text>
                  </View>
                </AnimatedPressable>
              </View>
            </View>
          )}

          {/* Sub-Tab 2: Personal Data */}
          {settingsSubTab === 'personal_data' && (
            <View style={{ marginTop: 4 }}>
              {/* Display Name */}
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4 }}>
                {isTh ? 'ชื่อผู้เล่น (Display Name):' : 'Display Name:'}
              </Text>
              <View style={[styles.inlineRow, { marginBottom: 10 }]}>
                <TextInput
                  value={nameInput}
                  onChangeText={setNameInput}
                  style={[
                    styles.input,
                    {
                      flex: 1,
                      backgroundColor: theme.bgSecondary,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                />
                <AnimatedPressable
                  reduceMotion={reduceMotion}
                  style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
                  onPress={() => updateProfile({ displayName: nameInput.trim() || 'Hunter' })}
                >
                  <Text style={styles.primaryBtnText}>{isTh ? 'เปลี่ยนชื่อ' : 'Save Name'}</Text>
                </AnimatedPressable>
              </View>

              {/* Language & Theme */}
              <View style={[styles.chipRow, { marginBottom: 10 }]}>
                <AnimatedPressable
                  reduceMotion={reduceMotion}
                  style={[styles.chip, { backgroundColor: theme.bgSecondary, borderColor: theme.primary }]}
                  onPress={() =>
                    updateProfile({ language: db.profile.language === 'th' ? 'en' : 'th' })
                  }
                >
                  <Text style={{ color: theme.primary, fontWeight: '800', fontSize: 12 }}>
                    {isTh ? 'ภาษา: ไทย (แตะเพื่อเปลี่ยน EN)' : 'Language: EN (Tap for TH)'}
                  </Text>
                </AnimatedPressable>

                <AnimatedPressable
                  reduceMotion={reduceMotion}
                  style={[styles.chip, { backgroundColor: theme.bgSecondary, borderColor: theme.primary }]}
                  onPress={() =>
                    updateProfile({ theme: db.profile.theme === 'dark' ? 'light' : 'dark' })
                  }
                >
                  <View style={styles.inlineIconRow}>
                    <AppIcon
                      name={db.profile.theme === 'dark' ? 'moon' : 'sun'}
                      size={13}
                      color={theme.primary}
                    />
                    <Text style={{ color: theme.primary, fontWeight: '800', fontSize: 12 }}>
                      {db.profile.theme === 'dark' ? 'Dark RPG Mode' : 'Light Mode'}
                    </Text>
                  </View>
                </AnimatedPressable>
              </View>

              {/* System Narrator Tone Selector */}
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 6 }}>
                {isTh ? 'โทนเสียงผู้บรรยายของระบบ (System Narrator):' : 'System Narrator Tone:'}
              </Text>
              <View style={[styles.chipRow, { marginBottom: 10 }]}>
                {(
                  [
                    { id: 'gentle', th: 'อ่อนโยน (Gentle)', en: 'Gentle' },
                    { id: 'friend', th: 'เพื่อนลุย (Friend)', en: 'Friend' },
                    { id: 'coach', th: 'โค้ชจริงจัง (Coach)', en: 'Coach' },
                    { id: 'adventurer', th: 'นักผจญภัย (Adventurer)', en: 'Adventurer' },
                  ] as const
                ).map((tone) => {
                  const currentNarrator = db.onboarding?.narrator ?? 'gentle';
                  const active = currentNarrator === tone.id;
                  return (
                    <AnimatedPressable
                      key={tone.id}
                      reduceMotion={reduceMotion}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? `${theme.primary}25` : theme.bgSecondary,
                          borderColor: active ? theme.primary : theme.border,
                        },
                      ]}
                      onPress={() => {
                        updateOnboardingDraft({ narrator: tone.id });
                        recordAppEvent('event:narrator_changed', 1);
                      }}
                    >
                      <Text
                        style={{
                          color: active ? theme.primary : theme.textSecondary,
                          fontSize: 12,
                          fontWeight: '700',
                        }}
                      >
                        {isTh ? tone.th : tone.en}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>

              {/* Available Daily Time */}
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 6 }}>
                {isTh ? 'เวลาว่างต่อวัน (มีผลต่อ Adaptive Plan):' : 'Available time/day (Adaptive Plan):'}
              </Text>
              <View style={[styles.chipRow, { marginBottom: 10 }]}>
                {[10, 15, 30, 60].map((mins) => {
                  const active = db.profile.availableMinutesPerDay === mins;
                  return (
                    <AnimatedPressable
                      key={mins}
                      reduceMotion={reduceMotion}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? `${theme.primary}25` : theme.bgSecondary,
                          borderColor: active ? theme.primary : theme.border,
                        },
                      ]}
                      onPress={() => updateProfile({ availableMinutesPerDay: mins })}
                    >
                      <Text style={{ color: active ? theme.primary : theme.textSecondary, fontSize: 12 }}>
                        {mins} {isTh ? 'นาที/วัน' : 'min/day'}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>

              {/* Edit / Re-run Onboarding Questionnaire */}
              <AnimatedPressable
                reduceMotion={reduceMotion}
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: `${theme.primary}22`,
                    borderColor: theme.primary,
                    borderWidth: 1,
                    marginBottom: 14,
                  },
                ]}
                onPress={reopenOnboarding}
              >
                <View style={styles.inlineIconRow}>
                  <AppIcon name="edit" size={14} color={theme.primary} />
                  <Text style={{ color: theme.primary, fontWeight: '900', fontSize: 13 }}>
                    {isTh
                      ? 'ปรับแผนของฉัน (แก้ไขคำตอบแบบสอบถามเริ่มต้น)'
                      : 'Adjust My Plan (Edit Onboarding Questionnaire)'}
                  </Text>
                </View>
              </AnimatedPressable>

              {/* Export / Import Backup JSON */}
              <View style={[styles.inlineIconRow, { marginTop: 4, marginBottom: 8 }]}>
                <AppIcon name="shield" size={16} color={theme.primary} />
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  {isTh ? 'จัดการข้อมูลสำรอง (Offline-First 100%)' : 'Offline Data & Backup'}
                </Text>
              </View>

              <View style={styles.inlineRow}>
                <AnimatedPressable
                  reduceMotion={reduceMotion}
                  style={[styles.primaryBtn, { backgroundColor: theme.primary, flex: 1 }]}
                  onPress={() => {
                    const json = exportBackupJson();
                    setBackupJsonBox(json);
                    setBackupStatusMsg(
                      isTh
                        ? 'สร้างข้อมูลสำรอง JSON สำเร็จ (คัดลอกข้อความด้านล่างเก็บไว้ได้เลย)'
                        : 'Exported JSON backup below.'
                    );
                  }}
                >
                  <View style={styles.inlineIconRow}>
                    <AppIcon name="export" size={14} color="#0E1220" />
                    <Text style={styles.primaryBtnText}>{strings.profile.exportData}</Text>
                  </View>
                </AnimatedPressable>

                <AnimatedPressable
                  reduceMotion={reduceMotion}
                  style={[styles.primaryBtn, { backgroundColor: theme.success, flex: 1 }]}
                  onPress={() => {
                    if (!backupJsonBox.trim()) return;
                    const res = importBackupJson(backupJsonBox);
                    setBackupStatusMsg(res.message);
                  }}
                >
                  <View style={styles.inlineIconRow}>
                    <AppIcon name="import" size={14} color="#0E1220" />
                    <Text style={styles.primaryBtnText}>{strings.profile.importData}</Text>
                  </View>
                </AnimatedPressable>
              </View>

              {backupStatusMsg && (
                <Text style={{ color: theme.success, fontSize: 12, marginTop: 6, fontWeight: '700' }}>
                  {backupStatusMsg}
                </Text>
              )}

              <TextInput
                value={backupJsonBox}
                onChangeText={setBackupJsonBox}
                multiline
                numberOfLines={3}
                placeholder={
                  isTh
                    ? 'กดปุ่ม Export เพื่อดู JSON หรือวาง JSON ที่นี่แล้วกด Import...'
                    : 'Press Export to generate JSON, or paste backup JSON here to Import...'
                }
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.bgSecondary,
                    color: theme.text,
                    borderColor: theme.border,
                    marginTop: 8,
                    minHeight: 70,
                  },
                ]}
              />

              {/* Delete by category & 2-Step Reset All */}
              <View style={[styles.chipRow, { marginTop: 12 }]}>
                <AnimatedPressable
                  reduceMotion={reduceMotion}
                  style={[styles.chip, { borderColor: theme.warning, backgroundColor: theme.bgSecondary }]}
                  onPress={() => deleteCategoryData('meals')}
                >
                  <View style={styles.inlineIconRow}>
                    <AppIcon name="trash" size={12} color={theme.warning} />
                    <Text style={{ color: theme.warning, fontSize: 11, fontWeight: '700' }}>
                      {isTh ? 'ลบเฉพาะประวัติอาหาร' : 'Clear Meals Only'}
                    </Text>
                  </View>
                </AnimatedPressable>
                <AnimatedPressable
                  reduceMotion={reduceMotion}
                  style={[styles.chip, { borderColor: theme.warning, backgroundColor: theme.bgSecondary }]}
                  onPress={() => deleteCategoryData('journals')}
                >
                  <View style={styles.inlineIconRow}>
                    <AppIcon name="trash" size={12} color={theme.warning} />
                    <Text style={{ color: theme.warning, fontSize: 11, fontWeight: '700' }}>
                      {isTh ? 'ลบเฉพาะไดอารี่' : 'Clear Journals Only'}
                    </Text>
                  </View>
                </AnimatedPressable>
              </View>

              <AnimatedPressable
                reduceMotion={reduceMotion}
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: resetConfirmStep === 1 ? theme.danger : theme.bgSecondary,
                    borderColor: theme.danger,
                    borderWidth: 1,
                    marginTop: 12,
                  },
                ]}
                onPress={() => {
                  if (resetConfirmStep === 0) {
                    setResetConfirmStep(1);
                  } else {
                    resetAllData();
                    setResetConfirmStep(0);
                  }
                }}
              >
                <View style={styles.inlineIconRow}>
                  <AppIcon
                    name="trash"
                    size={14}
                    color={resetConfirmStep === 1 ? '#FFFFFF' : theme.danger}
                  />
                  <Text
                    style={{
                      color: resetConfirmStep === 1 ? '#FFFFFF' : theme.danger,
                      fontWeight: '900',
                      fontSize: 13,
                    }}
                  >
                    {resetConfirmStep === 0
                      ? strings.profile.resetAllData
                      : isTh
                      ? 'ยืนยันขั้นที่ 2: แตะอีกครั้งเพื่อลบข้อมูลทั้งหมดถาวร'
                      : 'Step 2 Confirm: Tap again to permanently wipe all data'}
                  </Text>
                </View>
              </AnimatedPressable>
            </View>
          )}

          {/* Sub-Tab 3: Notifications & Daily Mission Alarm Clock */}
          {settingsSubTab === 'notifications' && (
            <View style={{ marginTop: 4 }}>
              <View style={styles.headerRowBetween}>
                <View style={styles.inlineIconRow}>
                  <AppIcon name="clock" size={16} color={theme.primary} />
                  <Text style={{ color: theme.text, fontSize: 13, fontWeight: '800' }}>
                    {isTh ? 'สิทธิ์การแจ้งเตือนบนระบบ' : 'System Notification Permission'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.notifBadge,
                    {
                      backgroundColor: notifGranted ? `${theme.success}25` : `${theme.warning}25`,
                      borderColor: notifGranted ? theme.success : theme.warning,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: notifGranted ? theme.success : theme.warning,
                      fontSize: 10,
                      fontWeight: '900',
                    }}
                  >
                    {notifGranted
                      ? isTh
                        ? '✓ อนุญาตแล้ว'
                        : '✓ Allowed'
                      : isTh
                      ? 'รอการอนุญาต'
                      : 'Permission Needed'}
                  </Text>
                </View>
              </View>

              {!notifGranted && (
                <View
                  style={{
                    backgroundColor: `${theme.primary}15`,
                    borderColor: `${theme.primary}44`,
                    borderWidth: 1,
                    borderRadius: 10,
                    padding: 10,
                    marginTop: 8,
                  }}
                >
                  <Text style={{ color: theme.text, fontSize: 12, lineHeight: 18 }}>
                    {isTh
                      ? 'เพื่อให้แอปสามารถแจ้งเตือนภารกิจรายวันและส่งเสียงปลุกบนแถบแจ้งเตือนมือถือได้ กรุณากดอนุญาตการแจ้งเตือน'
                      : 'Allow notifications so Awakened can remind you of daily missions on your device.'}
                  </Text>
                  <AnimatedPressable
                    reduceMotion={reduceMotion}
                    style={[
                      styles.primaryBtn,
                      { backgroundColor: theme.primary, marginTop: 8, alignItems: 'center' },
                    ]}
                    onPress={async () => {
                      const granted = await requestNotificationPermission();
                      setNotifGranted(granted);
                      if (granted) {
                        updateProfile({
                          notifications: {
                            ...(db.profile.notifications ?? {
                              permissionAsked: true,
                              morningReminderEnabled: true,
                              morningReminderTime: '08:00',
                              noonReminderEnabled: true,
                              noonReminderTime: '12:00',
                              eveningReminderEnabled: true,
                              eveningReminderTime: '20:00',
                            }),
                            enabled: true,
                            permissionAsked: true,
                          },
                        });
                      }
                    }}
                  >
                    <Text style={{ color: '#0E1220', fontWeight: '900', fontSize: 12 }}>
                      {isTh ? '🔔 อนุญาตการแจ้งเตือนบนมือถือ' : '🔔 Allow Notifications'}
                    </Text>
                  </AnimatedPressable>
                </View>
              )}

              {/* Daily Mission Alarm Clock Section (Mobile Phone Style) */}
              <View
                style={{
                  backgroundColor: theme.bgSecondary,
                  borderColor: theme.border,
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 12,
                  marginTop: 12,
                }}
              >
                <View style={styles.headerRowBetween}>
                  <View style={[styles.inlineIconRow, { flex: 1, marginRight: 8 }]}>
                    <Text style={{ fontSize: 16 }}>⏰</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontSize: 13, fontWeight: '800' }}>
                        {isTh ? 'นาฬิกาปลุกภารกิจประจำวัน' : 'Daily Mission Alarm Clock'}
                      </Text>
                      <Text style={{ color: theme.textMuted, fontSize: 11, flexShrink: 1 }}>
                        {isTh
                          ? 'ส่งเสียงปลุกระดับ USAGE_ALARM พร้อมปุ่ม Snooze'
                          : 'Genuine USAGE_ALARM audio with snooze'}
                      </Text>
                    </View>
                  </View>
                  <AnimatedPressable
                    reduceMotion={reduceMotion}
                    style={[
                      styles.togglePill,
                      {
                        backgroundColor: db.profile.alarm?.enabled ? theme.success : theme.border,
                      },
                    ]}
                    onPress={() => {
                      const current = db.profile.alarm ?? {
                        enabled: false,
                        time: '07:00',
                        days: [1, 2, 3, 4, 5, 6, 7],
                      };
                      updateProfile({
                        alarm: {
                          ...current,
                          enabled: !current.enabled,
                        },
                      });
                    }}
                  >
                    <Text style={{ color: '#0E1220', fontSize: 11, fontWeight: '900' }}>
                      {db.profile.alarm?.enabled ? (isTh ? 'เปิด' : 'ON') : (isTh ? 'ปิด' : 'OFF')}
                    </Text>
                  </AnimatedPressable>
                </View>

                {/* Alarm Time Selector & Mobile Style Trigger */}
                <View
                  style={{
                    marginTop: 10,
                    paddingTop: 8,
                    borderTopWidth: 1,
                    borderTopColor: `${theme.border}44`,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '700' }}>
                      {isTh ? 'เวลาปลุกปัจจุบัน:' : 'Current Alarm Time:'}
                    </Text>
                    <Pressable
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: `${theme.primary}20`,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: theme.primary,
                      }}
                      onPress={() => {
                        const [h, m] = (db.profile.alarm?.time ?? '07:00').split(':');
                        setCustomAlarmHours(h || '07');
                        setCustomAlarmMinutes(m || '00');
                        setAlarmRepeatDays(db.profile.alarm?.days ?? [1, 2, 3, 4, 5, 6, 7]);
                        setCustomAlarmModalOpen(true);
                      }}
                    >
                      <AppIcon name="clock" size={14} color={theme.primary} />
                      <Text style={{ color: theme.primary, fontSize: 15, fontWeight: '900' }}>
                        {db.profile.alarm?.time ?? '07:00'}
                      </Text>
                      <AppIcon name="edit" size={12} color={theme.primary} />
                    </Pressable>
                  </View>

                  {/* Stepper Buttons */}
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                    <Pressable
                      style={[
                        styles.timeChip,
                        {
                          backgroundColor: theme.card,
                          borderColor: theme.border,
                          flex: 1,
                          alignItems: 'center',
                        },
                      ]}
                      onPress={() => adjustAlarmTime(-1, 0)}
                    >
                      <Text style={{ color: theme.text, fontSize: 11, fontWeight: '800' }}>-1 ชม.</Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.timeChip,
                        {
                          backgroundColor: theme.card,
                          borderColor: theme.border,
                          flex: 1,
                          alignItems: 'center',
                        },
                      ]}
                      onPress={() => adjustAlarmTime(0, -5)}
                    >
                      <Text style={{ color: theme.text, fontSize: 11, fontWeight: '800' }}>-5 นาที</Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.timeChip,
                        {
                          backgroundColor: theme.card,
                          borderColor: theme.border,
                          flex: 1,
                          alignItems: 'center',
                        },
                      ]}
                      onPress={() => adjustAlarmTime(0, 5)}
                    >
                      <Text style={{ color: theme.text, fontSize: 11, fontWeight: '800' }}>+5 นาที</Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.timeChip,
                        {
                          backgroundColor: theme.card,
                          borderColor: theme.border,
                          flex: 1,
                          alignItems: 'center',
                        },
                      ]}
                      onPress={() => adjustAlarmTime(1, 0)}
                    >
                      <Text style={{ color: theme.text, fontSize: 11, fontWeight: '800' }}>+1 ชม.</Text>
                    </Pressable>
                  </View>

                  {/* Sound Test Button */}
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                    <Pressable
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: isAlarmTesting ? theme.warning : `${theme.primary}20`,
                        borderColor: isAlarmTesting ? theme.warning : theme.primary,
                        borderWidth: 1,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 8,
                      }}
                      onPress={() => {
                        const next = !isAlarmTesting;
                        setIsAlarmTesting(next);
                        testAlarmSound(next);
                      }}
                    >
                      <Text
                        style={{
                          color: isAlarmTesting ? '#0E1220' : theme.primary,
                          fontSize: 11,
                          fontWeight: '800',
                        }}
                      >
                        {isAlarmTesting ? (isTh ? '⏹ หยุดทดสอบเสียงปลุก' : '⏹ Stop Alarm Test') : (isTh ? '🔊 ทดสอบเสียงนาฬิกาปลุก' : '🔊 Test Alarm Sound')}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* 3 Time-of-Day Reminders: เช้า / เที่ยง / เย็น */}
              <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '700', marginTop: 14, marginBottom: 6 }}>
                {isTh ? 'การแจ้งเตือนเควสประจำวัน (เช้า / เที่ยง / เย็น):' : 'Daily Quest Reminders (Morning / Noon / Evening):'}
              </Text>

              {/* Morning (เช้า - 08:00) */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: theme.bgSecondary,
                  padding: 10,
                  borderRadius: 10,
                  marginBottom: 6,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ color: theme.text, fontSize: 12, fontWeight: '700' }}>
                    🌅 {isTh ? 'แจ้งเตือนเควสตอนเช้า (08:00)' : 'Morning Quest Reminder (08:00)'}
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 10 }}>
                    {isTh ? 'เริ่มทำภารกิจรายวันเพื่อสะสมแต้ม XP' : 'Start your daily quests and earn XP'}
                  </Text>
                </View>
                <AnimatedPressable
                  reduceMotion={reduceMotion}
                  style={[
                    styles.togglePill,
                    {
                      backgroundColor:
                        db.profile.notifications?.enabled &&
                        db.profile.notifications?.morningReminderEnabled
                          ? theme.primary
                          : theme.border,
                    },
                  ]}
                  onPress={() => {
                    const current = db.profile.notifications ?? {
                      enabled: true,
                      permissionAsked: true,
                      morningReminderEnabled: true,
                      morningReminderTime: '08:00',
                      noonReminderEnabled: true,
                      noonReminderTime: '12:00',
                      eveningReminderEnabled: true,
                      eveningReminderTime: '20:00',
                    };
                    updateProfile({
                      notifications: {
                        ...current,
                        morningReminderEnabled: !current.morningReminderEnabled,
                      },
                    });
                  }}
                >
                  <Text style={{ color: '#0E1220', fontSize: 11, fontWeight: '900' }}>
                    {db.profile.notifications?.morningReminderEnabled ? 'ON' : 'OFF'}
                  </Text>
                </AnimatedPressable>
              </View>

              {/* Noon (เที่ยง - 12:00) */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: theme.bgSecondary,
                  padding: 10,
                  borderRadius: 10,
                  marginBottom: 6,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ color: theme.text, fontSize: 12, fontWeight: '700' }}>
                    ☀️ {isTh ? 'แจ้งเตือนเควสตอนเที่ยง (12:00)' : 'Noon Quest Reminder (12:00)'}
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 10 }}>
                    {isTh ? 'เช็กความคืบหน้าระหว่างวัน บันทึกมื้อเที่ยง & ดื่มน้ำ' : 'Midday check-in, log lunch & hydrate'}
                  </Text>
                </View>
                <AnimatedPressable
                  reduceMotion={reduceMotion}
                  style={[
                    styles.togglePill,
                    {
                      backgroundColor:
                        db.profile.notifications?.enabled &&
                        db.profile.notifications?.noonReminderEnabled !== false
                          ? theme.primary
                          : theme.border,
                    },
                  ]}
                  onPress={() => {
                    const current = db.profile.notifications ?? {
                      enabled: true,
                      permissionAsked: true,
                      morningReminderEnabled: true,
                      morningReminderTime: '08:00',
                      noonReminderEnabled: true,
                      noonReminderTime: '12:00',
                      eveningReminderEnabled: true,
                      eveningReminderTime: '20:00',
                    };
                    updateProfile({
                      notifications: {
                        ...current,
                        noonReminderEnabled: current.noonReminderEnabled === false ? true : false,
                      },
                    });
                  }}
                >
                  <Text style={{ color: '#0E1220', fontSize: 11, fontWeight: '900' }}>
                    {db.profile.notifications?.noonReminderEnabled !== false ? 'ON' : 'OFF'}
                  </Text>
                </AnimatedPressable>
              </View>

              {/* Evening (เย็น - 20:00) */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: theme.bgSecondary,
                  padding: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ color: theme.text, fontSize: 12, fontWeight: '700' }}>
                    🌙 {isTh ? 'แจ้งเตือนเควสตอนค่ำ (20:00)' : 'Evening Check-in (20:00)'}
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 10 }}>
                    {isTh ? 'สรุปภารกิจก่อนหมดวันเพื่อรักษา Daily Streak' : 'Complete remaining quests to protect Streak'}
                  </Text>
                </View>
                <AnimatedPressable
                  reduceMotion={reduceMotion}
                  style={[
                    styles.togglePill,
                    {
                      backgroundColor:
                        db.profile.notifications?.enabled &&
                        db.profile.notifications?.eveningReminderEnabled
                          ? theme.primary
                          : theme.border,
                    },
                  ]}
                  onPress={() => {
                    const current = db.profile.notifications ?? {
                      enabled: true,
                      permissionAsked: true,
                      morningReminderEnabled: true,
                      morningReminderTime: '08:00',
                      noonReminderEnabled: true,
                      noonReminderTime: '12:00',
                      eveningReminderEnabled: true,
                      eveningReminderTime: '20:00',
                    };
                    updateProfile({
                      notifications: {
                        ...current,
                        eveningReminderEnabled: !current.eveningReminderEnabled,
                      },
                    });
                  }}
                >
                  <Text style={{ color: '#0E1220', fontSize: 11, fontWeight: '900' }}>
                    {db.profile.notifications?.eveningReminderEnabled ? 'ON' : 'OFF'}
                  </Text>
                </AnimatedPressable>
              </View>
            </View>
          )}

          {/* Sub-Tab 4: 4 Widgets + All-in-One */}
          {settingsSubTab === 'widgets' && (
            <View style={{ marginTop: 4 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 18, marginBottom: 10 }}>
                {isTh
                  ? 'คุณสามารถแยกเพิ่มวิดเจ็ต 4 แบบลงหน้าจอมือถือได้ตามต้องการ หรือกดค้างที่หน้าจอหลักของโทรศัพท์เพื่อเพิ่มวิดเจ็ต'
                  : 'Add any of the 4 dedicated widgets directly to your home screen or long-press your home screen.'}
              </Text>

              {/* 4 Separate Widgets */}
              <View style={{ gap: 8 }}>
                {/* 1. Daily Quests Widget */}
                <View
                  style={{
                    backgroundColor: theme.bgSecondary,
                    borderColor: theme.border,
                    borderWidth: 1,
                    borderRadius: 10,
                    padding: 10,
                  }}
                >
                  <View style={styles.headerRowBetween}>
                    <View style={styles.inlineIconRow}>
                      <AppIcon name="quest" size={15} color={theme.primary} />
                      <Text style={{ color: theme.text, fontSize: 13, fontWeight: '800' }}>
                        {isTh ? '1. วิดเจ็ต เควสประจำวัน' : '1. Daily Quests Widget'}
                      </Text>
                    </View>
                    <AnimatedPressable
                      reduceMotion={reduceMotion}
                      style={[styles.primaryBtn, { backgroundColor: theme.primary, paddingVertical: 4, paddingHorizontal: 10 }]}
                      onPress={async () => {
                        const res = await requestPinWidget('quests');
                        setWidgetFeedback(
                          res
                            ? isTh ? '✓ ส่งคำขอเพิ่มวิดเจ็ตเควสประจำวันแล้ว' : '✓ Daily Quests widget pinned'
                            : isTh ? 'คุณสามารถกดค้างที่หน้าจอหลักเพื่อเพิ่มวิดเจ็ต Awakened Daily Quests' : 'Long-press home screen to add Awakened Quests widget'
                        );
                        setTimeout(() => setWidgetFeedback(null), 4000);
                      }}
                    >
                      <Text style={{ color: '#0E1220', fontWeight: '900', fontSize: 11 }}>
                        {isTh ? '+ เพิ่มวิดเจ็ต' : '+ Add Widget'}
                      </Text>
                    </AnimatedPressable>
                  </View>
                  <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 4 }}>
                    {isTh ? 'แสดงรายการภารกิจวันนี้ ว่ามีเควสอะไรบ้าง และสถานะสำเร็จแล้วกี่ข้อ' : 'Shows today’s quest list and completed progress'}
                  </Text>
                </View>

                {/* 2. Clock Widget */}
                <View
                  style={{
                    backgroundColor: theme.bgSecondary,
                    borderColor: theme.border,
                    borderWidth: 1,
                    borderRadius: 10,
                    padding: 10,
                  }}
                >
                  <View style={styles.headerRowBetween}>
                    <View style={styles.inlineIconRow}>
                      <AppIcon name="clock" size={15} color={theme.primary} />
                      <Text style={{ color: theme.text, fontSize: 13, fontWeight: '800' }}>
                        {isTh ? '2. วิดเจ็ต นาฬิกา & การแจ้งเตือน' : '2. Clock & Alerts Widget'}
                      </Text>
                    </View>
                    <AnimatedPressable
                      reduceMotion={reduceMotion}
                      style={[styles.primaryBtn, { backgroundColor: theme.primary, paddingVertical: 4, paddingHorizontal: 10 }]}
                      onPress={async () => {
                        const res = await requestPinWidget('clock');
                        setWidgetFeedback(
                          res
                            ? isTh ? '✓ ส่งคำขอเพิ่มวิดเจ็ตนาฬิกาแล้ว' : '✓ Clock widget pinned'
                            : isTh ? 'คุณสามารถกดค้างที่หน้าจอหลักเพื่อเพิ่มวิดเจ็ต Awakened Clock' : 'Long-press home screen to add Awakened Clock widget'
                        );
                        setTimeout(() => setWidgetFeedback(null), 4000);
                      }}
                    >
                      <Text style={{ color: '#0E1220', fontWeight: '900', fontSize: 11 }}>
                        {isTh ? '+ เพิ่มวิดเจ็ต' : '+ Add Widget'}
                      </Text>
                    </AnimatedPressable>
                  </View>
                  <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 4 }}>
                    {isTh ? 'แสดงเวลาปัจจุบัน เวลาที่ตั้งปลุก และรอบเตือนภารกิจ (เช้า 08:00 | เที่ยง 12:00 | เย็น 20:00)' : 'Shows clock time, alarm time, and quest notification schedules'}
                  </Text>
                </View>

                {/* 3. Calorie Summary Widget */}
                <View
                  style={{
                    backgroundColor: theme.bgSecondary,
                    borderColor: theme.border,
                    borderWidth: 1,
                    borderRadius: 10,
                    padding: 10,
                  }}
                >
                  <View style={styles.headerRowBetween}>
                    <View style={styles.inlineIconRow}>
                      <Text style={{ fontSize: 14 }}>🔥</Text>
                      <Text style={{ color: theme.text, fontSize: 13, fontWeight: '800' }}>
                        {isTh ? '3. วิดเจ็ต สรุปแคลอรี่' : '3. Calorie Summary Widget'}
                      </Text>
                    </View>
                    <AnimatedPressable
                      reduceMotion={reduceMotion}
                      style={[styles.primaryBtn, { backgroundColor: theme.primary, paddingVertical: 4, paddingHorizontal: 10 }]}
                      onPress={async () => {
                        const res = await requestPinWidget('calorie');
                        setWidgetFeedback(
                          res
                            ? isTh ? '✓ ส่งคำขอเพิ่มวิดเจ็ตสรุปแคลอรี่แล้ว' : '✓ Calorie widget pinned'
                            : isTh ? 'คุณสามารถกดค้างที่หน้าจอหลักเพื่อเพิ่มวิดเจ็ต Awakened Calories' : 'Long-press home screen to add Awakened Calorie widget'
                        );
                        setTimeout(() => setWidgetFeedback(null), 4000);
                      }}
                    >
                      <Text style={{ color: '#0E1220', fontWeight: '900', fontSize: 11 }}>
                        {isTh ? '+ เพิ่มวิดเจ็ต' : '+ Add Widget'}
                      </Text>
                    </AnimatedPressable>
                  </View>
                  <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 4 }}>
                    {isTh ? 'แสดงแคลอรี่ที่บริโภค / เผาผลาญ ปริมาณน้ำดื่ม และสารอาหาร คาร์บ/โปรตีน/ไขมัน' : 'Shows consumed & burned kcal, water intake, and macros'}
                  </Text>
                </View>

                {/* 4. Trophy Room Widget */}
                <View
                  style={{
                    backgroundColor: theme.bgSecondary,
                    borderColor: theme.border,
                    borderWidth: 1,
                    borderRadius: 10,
                    padding: 10,
                  }}
                >
                  <View style={styles.headerRowBetween}>
                    <View style={styles.inlineIconRow}>
                      <AppIcon name="trophy" size={15} color={theme.warning} />
                      <Text style={{ color: theme.text, fontSize: 13, fontWeight: '800' }}>
                        {isTh ? '4. วิดเจ็ต ถ้วยรางวัล' : '4. Trophy Room Widget'}
                      </Text>
                    </View>
                    <AnimatedPressable
                      reduceMotion={reduceMotion}
                      style={[styles.primaryBtn, { backgroundColor: theme.primary, paddingVertical: 4, paddingHorizontal: 10 }]}
                      onPress={async () => {
                        const res = await requestPinWidget('trophy');
                        setWidgetFeedback(
                          res
                            ? isTh ? '✓ ส่งคำขอเพิ่มวิดเจ็ตถ้วยรางวัลแล้ว' : '✓ Trophy widget pinned'
                            : isTh ? 'คุณสามารถกดค้างที่หน้าจอหลักเพื่อเพิ่มวิดเจ็ต Awakened Trophies' : 'Long-press home screen to add Awakened Trophy widget'
                        );
                        setTimeout(() => setWidgetFeedback(null), 4000);
                      }}
                    >
                      <Text style={{ color: '#0E1220', fontWeight: '900', fontSize: 11 }}>
                        {isTh ? '+ เพิ่มวิดเจ็ต' : '+ Add Widget'}
                      </Text>
                    </AnimatedPressable>
                  </View>
                  <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 4 }}>
                    {isTh ? 'แสดงจำนวนถ้วยรางวัลที่ปลดล็อกแล้ว แยกตามระดับ Bronze / Silver / Gold / Legend' : 'Shows unlocked trophies breakdown by tier'}
                  </Text>
                </View>
              </View>

              {/* Extra Shortcuts */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <AnimatedPressable
                  reduceMotion={reduceMotion}
                  style={[
                    styles.primaryBtn,
                    {
                      flex: 1,
                      backgroundColor: `${theme.primary}20`,
                      borderColor: theme.primary,
                      borderWidth: 1,
                      alignItems: 'center',
                    },
                  ]}
                  onPress={async () => {
                    const res = await requestPinWidget('all');
                    setWidgetFeedback(
                      res
                        ? isTh ? '✓ ส่งคำขอเพิ่มวิดเจ็ตรวมแล้ว' : '✓ All-in-one widget pinned'
                        : isTh ? 'คุณสามารถกดค้างที่หน้าจอหลักเพื่อเพิ่มวิดเจ็ต' : 'Long-press to add widget'
                    );
                    setTimeout(() => setWidgetFeedback(null), 4000);
                  }}
                >
                  <View style={styles.inlineIconRow}>
                    <AppIcon name="bolt" size={13} color={theme.primary} />
                    <Text style={{ color: theme.primary, fontWeight: '900', fontSize: 11 }}>
                      {isTh ? 'วิดเจ็ตรวมทั้งหมด' : 'All-in-One Widget'}
                    </Text>
                  </View>
                </AnimatedPressable>

                <AnimatedPressable
                  reduceMotion={reduceMotion}
                  style={[
                    styles.primaryBtn,
                    {
                      flex: 1,
                      backgroundColor: `${theme.warning}20`,
                      borderColor: theme.warning,
                      borderWidth: 1,
                      alignItems: 'center',
                    },
                  ]}
                  onPress={async () => {
                    const res = await requestPinShortcut(
                      db.profile.displayName,
                      db.profile.avatarUri ?? null
                    );
                    setShortcutFeedback(
                      res
                        ? isTh ? '✓ สร้างไอคอนโปรไฟล์บนหน้าจอหลักแล้ว' : '✓ Profile icon pinned'
                        : isTh ? 'อุปกรณ์นี้ไม่รองรับการปักหมุดไอคอนอัตโนมัติ' : 'Not supported on launcher'
                    );
                    setTimeout(() => setShortcutFeedback(null), 4000);
                  }}
                >
                  <View style={styles.inlineIconRow}>
                    <AppIcon name="user" size={13} color={theme.warning} />
                    <Text style={{ color: theme.warning, fontWeight: '900', fontSize: 11 }}>
                      {isTh ? 'ปักหมุดไอคอนโปรไฟล์' : 'Pin Profile Icon'}
                    </Text>
                  </View>
                </AnimatedPressable>
              </View>

              {(widgetFeedback || shortcutFeedback) && (
                <Text style={{ color: theme.success, fontSize: 11, fontWeight: '700', marginTop: 8 }}>
                  {widgetFeedback || shortcutFeedback}
                </Text>
              )}
            </View>
          )}
        </AnimatedCard>
      )}

      {/* 6. Health Disclaimer & Open-Source Credits (Profile Footer) */}
      {profileTab === 'footer' && (
        <AnimatedCard
          index={5}
          reduceMotion={reduceMotion}
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              overflow: 'hidden',
              padding: 14,
            },
          ]}
        >
          <View style={styles.headerRowBetween}>
            <View style={[styles.inlineIconRow, { flexShrink: 1, marginRight: 8 }]}>
              <AppIcon name="shield" size={18} color={theme.primary} />
              <Text style={[styles.cardTitle, { color: theme.text, flexShrink: 1 }]}>
                {strings.profile.disclaimerTitle}
              </Text>
            </View>
            <AnimatedPressable
              reduceMotion={reduceMotion}
              style={[
                styles.chip,
                {
                  backgroundColor: `${theme.primary}20`,
                  borderColor: theme.primary,
                  paddingVertical: 4,
                  flexShrink: 0,
                },
              ]}
              onPress={() => recordAppEvent('event:credits_viewed', 1)}
            >
              <Text style={{ color: theme.primary, fontSize: 11, fontWeight: '800' }}>
                {Number(achievementMetrics['event:credits_viewed'] ?? 0) >= 1
                  ? isTh
                    ? '✓ อ่านแล้ว'
                    : '✓ Read'
                  : isTh
                  ? 'ยืนยันการอ่าน'
                  : 'Acknowledge'}
              </Text>
            </AnimatedPressable>
          </View>
          <Text
            style={{
              color: theme.textSecondary,
              fontSize: 12,
              marginTop: 8,
              lineHeight: 18,
              flexShrink: 1,
              flexWrap: 'wrap',
            }}
          >
            {strings.profile.disclaimerBody}
          </Text>
          <View
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTopWidth: 1,
              borderTopColor: `${theme.border}44`,
            }}
          >
            <Text
              style={{
                color: theme.textMuted,
                fontSize: 11,
                lineHeight: 16,
                flexShrink: 1,
                flexWrap: 'wrap',
              }}
            >
              Awakened v0.10.3 · Open-Source Licenses: React Native & Expo (MIT), AsyncStorage & SQLite (MIT), React Native SVG (MIT), Vector Icons sourced from FreeIcons.io (Iconly Essential & Free Vector Sets), Thai Food Nutrition Reference (Public Domain / DOH Estimation).
            </Text>
          </View>
        </AnimatedCard>
      )}

      {/* Profile Avatar Selection Modal */}
      <Modal
        visible={avatarModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View style={styles.headerRowBetween}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {isTh ? 'เลือกรูปโปรไฟล์' : 'Choose Profile Picture'}
              </Text>
              <Pressable onPress={() => setAvatarModalOpen(false)}>
                <Text style={{ color: theme.textMuted, fontSize: 16 }}>✕</Text>
              </Pressable>
            </View>

            {/* Custom Photo Option from Gallery */}
            <AnimatedPressable
              reduceMotion={reduceMotion}
              style={[
                styles.primaryBtn,
                { backgroundColor: theme.primary, marginTop: 14, alignItems: 'center' },
              ]}
              onPress={async () => {
                const uri = await pickProfileImage();
                if (uri) {
                  updateProfile({ avatarUri: uri });
                  setAvatarModalOpen(false);
                }
              }}
            >
              <View style={styles.inlineIconRow}>
                <AppIcon name="edit" size={15} color="#0E1220" />
                <Text style={{ color: '#0E1220', fontWeight: '900', fontSize: 13 }}>
                  {isTh ? 'เลือกรูปจากเครื่อง / แกลเลอรี' : 'Choose from Device / Gallery'}
                </Text>
              </View>
            </AnimatedPressable>

            {/* Remove Avatar Button */}
            {Boolean(db.profile.avatarUri) && (
              <AnimatedPressable
                reduceMotion={reduceMotion}
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: `${theme.danger}20`,
                    borderColor: theme.danger,
                    borderWidth: 1,
                    marginTop: 10,
                    alignItems: 'center',
                  },
                ]}
                onPress={() => {
                  updateProfile({ avatarUri: null });
                  setAvatarModalOpen(false);
                }}
              >
                <Text style={{ color: theme.danger, fontWeight: '800', fontSize: 12 }}>
                  {isTh ? 'ลบรูปโปรไฟล์ (ใช้อวตารเริ่มต้น)' : 'Remove Custom Avatar'}
                </Text>
              </AnimatedPressable>
            )}

            <Pressable
              style={{ marginTop: 14, alignItems: 'center', padding: 8 }}
              onPress={() => setAvatarModalOpen(false)}
            >
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                {isTh ? 'ยกเลิก' : 'Cancel'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Custom Alarm Time Picker Modal (Mobile Phone Style) */}
      <Modal
        visible={customAlarmModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          testAlarmSound(false);
          setIsAlarmTesting(false);
          setCustomAlarmModalOpen(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.card, borderColor: theme.border, maxHeight: '90%' },
            ]}
          >
            <View style={styles.headerRowBetween}>
              <View style={styles.inlineIconRow}>
                <Text style={{ fontSize: 18 }}>⏰</Text>
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  {isTh ? 'ตั้งนาฬิกาปลุกภารกิจ' : 'Mission Alarm Clock'}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  testAlarmSound(false);
                  setIsAlarmTesting(false);
                  setCustomAlarmModalOpen(false);
                }}
              >
                <Text style={{ color: theme.textMuted, fontSize: 18, padding: 4 }}>✕</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Big Digital Clock Display (Touch Hour or Minute like phone clock) */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginVertical: 12,
                  padding: 10,
                  backgroundColor: `${theme.primary}12`,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: `${theme.primary}33`,
                }}
              >
                <Pressable
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 12,
                    backgroundColor: alarmTimeTab === 'hour' ? `${theme.primary}35` : 'transparent',
                    borderWidth: 2,
                    borderColor: alarmTimeTab === 'hour' ? theme.primary : 'transparent',
                  }}
                  onPress={() => setAlarmTimeTab('hour')}
                >
                  <Text
                    style={{
                      color: alarmTimeTab === 'hour' ? theme.primary : theme.text,
                      fontSize: 42,
                      fontWeight: '900',
                    }}
                  >
                    {customAlarmHours.padStart(2, '0')}
                  </Text>
                  <Text
                    style={{
                      color: alarmTimeTab === 'hour' ? theme.primary : theme.textMuted,
                      fontSize: 10,
                      fontWeight: '800',
                      textAlign: 'center',
                    }}
                  >
                    {isTh ? 'ชั่วโมง' : 'HOUR'}
                  </Text>
                </Pressable>

                <Text
                  style={{
                    color: theme.textSecondary,
                    fontSize: 36,
                    fontWeight: '900',
                    marginHorizontal: 8,
                    paddingBottom: 14,
                  }}
                >
                  :
                </Text>

                <Pressable
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 12,
                    backgroundColor: alarmTimeTab === 'minute' ? `${theme.primary}35` : 'transparent',
                    borderWidth: 2,
                    borderColor: alarmTimeTab === 'minute' ? theme.primary : 'transparent',
                  }}
                  onPress={() => setAlarmTimeTab('minute')}
                >
                  <Text
                    style={{
                      color: alarmTimeTab === 'minute' ? theme.primary : theme.text,
                      fontSize: 42,
                      fontWeight: '900',
                    }}
                  >
                    {customAlarmMinutes.padStart(2, '0')}
                  </Text>
                  <Text
                    style={{
                      color: alarmTimeTab === 'minute' ? theme.primary : theme.textMuted,
                      fontSize: 10,
                      fontWeight: '800',
                      textAlign: 'center',
                    }}
                  >
                    {isTh ? 'นาที' : 'MIN'}
                  </Text>
                </Pressable>
              </View>

              {/* Hour / Minute Selection Views */}
              {alarmTimeTab === 'hour' ? (
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '700' }}>
                      {isTh ? 'เลือกชั่วโมง (00 - 23):' : 'Select Hour (00 - 23):'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <Pressable
                        style={[styles.timeChip, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}
                        onPress={() => {
                          const h = (Number(customAlarmHours) - 1 + 24) % 24;
                          setCustomAlarmHours(String(h).padStart(2, '0'));
                        }}
                      >
                        <Text style={{ color: theme.text, fontWeight: '900' }}>-1 ชม.</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.timeChip, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}
                        onPress={() => {
                          const h = (Number(customAlarmHours) + 1) % 24;
                          setCustomAlarmHours(String(h).padStart(2, '0'));
                        }}
                      >
                        <Text style={{ color: theme.text, fontWeight: '900' }}>+1 ชม.</Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* 24 Hour Grid */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((hh) => {
                      const sel = customAlarmHours === hh;
                      return (
                        <Pressable
                          key={hh}
                          style={{
                            width: '14.5%',
                            aspectRatio: 1.2,
                            borderRadius: 8,
                            backgroundColor: sel ? theme.primary : theme.bgSecondary,
                            borderColor: sel ? theme.primary : theme.border,
                            borderWidth: 1,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onPress={() => {
                            setCustomAlarmHours(hh);
                            setAlarmTimeTab('minute');
                          }}
                        >
                          <Text
                            style={{
                              color: sel ? '#0E1220' : theme.text,
                              fontSize: 12,
                              fontWeight: '800',
                            }}
                          >
                            {hh}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : (
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '700' }}>
                      {isTh ? 'เลือกนาที (00 - 59):' : 'Select Minute (00 - 59):'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <Pressable
                        style={[styles.timeChip, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}
                        onPress={() => {
                          const m = (Number(customAlarmMinutes) - 1 + 60) % 60;
                          setCustomAlarmMinutes(String(m).padStart(2, '0'));
                        }}
                      >
                        <Text style={{ color: theme.text, fontWeight: '900' }}>-1</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.timeChip, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}
                        onPress={() => {
                          const m = (Number(customAlarmMinutes) + 1) % 60;
                          setCustomAlarmMinutes(String(m).padStart(2, '0'));
                        }}
                      >
                        <Text style={{ color: theme.text, fontWeight: '900' }}>+1</Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Minute Increments Grid */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((mm) => {
                      const sel = customAlarmMinutes === mm;
                      return (
                        <Pressable
                          key={mm}
                          style={{
                            width: '23%',
                            aspectRatio: 1.5,
                            borderRadius: 8,
                            backgroundColor: sel ? theme.primary : theme.bgSecondary,
                            borderColor: sel ? theme.primary : theme.border,
                            borderWidth: 1,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onPress={() => setCustomAlarmMinutes(mm)}
                        >
                          <Text
                            style={{
                              color: sel ? '#0E1220' : theme.text,
                              fontSize: 13,
                              fontWeight: '800',
                            }}
                          >
                            :{mm}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Repeat Days (เหมือนการตั้งนาฬิกาในมือถือ) */}
              <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '700', marginTop: 6, marginBottom: 6 }}>
                {isTh ? 'ทำซ้ำในวัน:' : 'Repeat on Days:'}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                {[
                  { id: 1, th: 'จ', en: 'M' },
                  { id: 2, th: 'อ', en: 'T' },
                  { id: 3, th: 'พ', en: 'W' },
                  { id: 4, th: 'พฤ', en: 'T' },
                  { id: 5, th: 'ศ', en: 'F' },
                  { id: 6, th: 'ส', en: 'S' },
                  { id: 7, th: 'อา', en: 'S' },
                ].map((day) => {
                  const sel = alarmRepeatDays.includes(day.id);
                  return (
                    <Pressable
                      key={day.id}
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        backgroundColor: sel ? theme.primary : theme.bgSecondary,
                        borderColor: sel ? theme.primary : theme.border,
                        borderWidth: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPress={() => {
                        if (sel) {
                          setAlarmRepeatDays(alarmRepeatDays.filter((d) => d !== day.id));
                        } else {
                          setAlarmRepeatDays([...alarmRepeatDays, day.id]);
                        }
                      }}
                    >
                      <Text
                        style={{
                          color: sel ? '#0E1220' : theme.text,
                          fontSize: 12,
                          fontWeight: '800',
                        }}
                      >
                        {isTh ? day.th : day.en}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* System Alarm Sound & Test */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 10,
                  backgroundColor: theme.bgSecondary,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                  marginVertical: 8,
                }}
              >
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ color: theme.text, fontSize: 12, fontWeight: '700' }}>
                    {isTh ? '🔊 เสียงนาฬิกาปลุกของระบบ' : '🔊 System Alarm Sound'}
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 10 }}>
                    {isTh ? 'ใช้เสียงปลุกจริงระดับ USAGE_ALARM ของเครื่อง' : 'Plays genuine Android alarm sound'}
                  </Text>
                </View>
                <Pressable
                  style={{
                    backgroundColor: isAlarmTesting ? theme.warning : `${theme.primary}25`,
                    borderColor: isAlarmTesting ? theme.warning : theme.primary,
                    borderWidth: 1,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                  }}
                  onPress={() => {
                    const next = !isAlarmTesting;
                    setIsAlarmTesting(next);
                    testAlarmSound(next);
                  }}
                >
                  <Text
                    style={{
                      color: isAlarmTesting ? '#0E1220' : theme.primary,
                      fontSize: 11,
                      fontWeight: '800',
                    }}
                  >
                    {isAlarmTesting ? (isTh ? '⏹ หยุดเสียง' : '⏹ Stop') : (isTh ? '▶ ทดสอบเสียง' : '▶ Test Sound')}
                  </Text>
                </Pressable>
              </View>

              {/* Save Button */}
              <AnimatedPressable
                reduceMotion={reduceMotion}
                style={[
                  styles.primaryBtn,
                  { backgroundColor: theme.primary, alignItems: 'center', marginTop: 10 },
                ]}
                onPress={() => {
                  testAlarmSound(false);
                  setIsAlarmTesting(false);
                  const finalTime = `${customAlarmHours.padStart(2, '0')}:${customAlarmMinutes.padStart(2, '0')}`;
                  updateProfile({
                    alarm: {
                      enabled: true,
                      time: finalTime,
                      days: alarmRepeatDays,
                    },
                  });
                  setCustomAlarmModalOpen(false);
                }}
              >
                <Text style={{ color: '#0E1220', fontWeight: '900', fontSize: 13 }}>
                  {isTh
                    ? `✓ บันทึกเวลาปลุก (${customAlarmHours.padStart(2, '0')}:${customAlarmMinutes.padStart(2, '0')})`
                    : `✓ Save Alarm (${customAlarmHours.padStart(2, '0')}:${customAlarmMinutes.padStart(2, '0')})`}
                </Text>
              </AnimatedPressable>

              <Pressable
                style={{ marginTop: 8, alignItems: 'center', padding: 6 }}
                onPress={() => {
                  testAlarmSound(false);
                  setIsAlarmTesting(false);
                  setCustomAlarmModalOpen(false);
                }}
              >
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                  {isTh ? 'ยกเลิก' : 'Cancel'}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* App Lock Manager Modal */}
      <Modal
        visible={appLockModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAppLockModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View style={styles.headerRowBetween}>
              <View style={styles.inlineIconRow}>
                <AppIcon name="lock" size={18} color={theme.primary} />
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  {isTh ? 'ระบบล็อกแอป (App Lock)' : 'App Lock Manager'}
                </Text>
              </View>
              <Pressable onPress={() => setAppLockModalOpen(false)}>
                <Text style={{ color: theme.textMuted, fontSize: 16 }}>✕</Text>
              </Pressable>
            </View>

            {/* Mode 1: Already Set -> Manage / Turn Off / Change PIN */}
            {db.profile.appLockPin && appLockStep === 'manage' ? (
              <View style={{ marginTop: 12 }}>
                <View
                  style={{
                    backgroundColor: `${theme.success}18`,
                    borderColor: theme.success,
                    borderWidth: 1,
                    borderRadius: 10,
                    padding: 10,
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ color: theme.success, fontSize: 12, fontWeight: '800' }}>
                    {isTh
                      ? '✓ กำลังเปิดใช้งานการล็อกแอปด้วยรหัส PIN'
                      : '✓ App Lock is currently ENABLED'}
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 2 }}>
                    {isTh
                      ? 'ระบบจะถามรหัส PIN ทุกครั้งที่เปิดแอปเพื่อความปลอดภัย'
                      : 'App requires PIN upon cold launch to secure your data.'}
                  </Text>
                </View>

                {!pinVerified ? (
                  <View>
                    <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 8 }}>
                      {isTh
                        ? 'กรุณากรอกรหัส PIN ปัจจุบัน 4 หลักเพื่อดำเนินการ:'
                        : 'Enter your current 4-digit PIN to manage:'}
                    </Text>

                    {/* PIN Dots */}
                    <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'center', marginVertical: 10 }}>
                      {[0, 1, 2, 3].map((idx) => (
                        <View
                          key={idx}
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: 7,
                            backgroundColor: verifyCurrentPin.length > idx ? theme.primary : 'transparent',
                            borderWidth: 1.5,
                            borderColor: verifyCurrentPin.length > idx ? theme.primary : theme.border,
                          }}
                        />
                      ))}
                    </View>

                    {appLockError && (
                      <Text style={{ color: theme.danger, fontSize: 11, fontWeight: '700', textAlign: 'center', marginBottom: 6 }}>
                        {appLockError}
                      </Text>
                    )}

                    {/* Compact keypad */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginVertical: 8 }}>
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                        <Pressable
                          key={k}
                          style={{
                            width: 58,
                            height: 44,
                            borderRadius: 8,
                            backgroundColor: theme.bgSecondary,
                            borderWidth: 1,
                            borderColor: theme.border,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onPress={() => {
                            setAppLockError(null);
                            if (k === 'C') {
                              setVerifyCurrentPin('');
                            } else if (k === '⌫') {
                              setVerifyCurrentPin((p) => p.slice(0, -1));
                            } else {
                              const next = verifyCurrentPin + k;
                              if (next.length <= 4) {
                                setVerifyCurrentPin(next);
                                if (next.length === 4) {
                                  if (next === db.profile.appLockPin) {
                                    setPinVerified(true);
                                    setVerifyCurrentPin('');
                                  } else {
                                    setAppLockError(isTh ? 'รหัส PIN ไม่ถูกต้อง' : 'Incorrect PIN');
                                    setTimeout(() => setVerifyCurrentPin(''), 500);
                                  }
                                }
                              }
                            }
                          }}
                        >
                          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800' }}>{k}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    {/* Disable App Lock Button */}
                    <AnimatedPressable
                      reduceMotion={reduceMotion}
                      style={[
                        styles.primaryBtn,
                        {
                          backgroundColor: `${theme.danger}20`,
                          borderColor: theme.danger,
                          borderWidth: 1,
                          alignItems: 'center',
                        },
                      ]}
                      onPress={() => {
                        updateProfile({ appLockPin: null, appLockBiometricEnabled: false });
                        setAppLockSuccessMsg(isTh ? '✓ ปิดใช้งานการล็อกแอปแล้ว' : '✓ App lock disabled');
                        setTimeout(() => {
                          setAppLockModalOpen(false);
                          setPinVerified(false);
                        }, 800);
                      }}
                    >
                      <Text style={{ color: theme.danger, fontWeight: '900', fontSize: 13 }}>
                        {isTh ? '🔓 ปิดการใช้งานการล็อกแอป (Disable Lock)' : '🔓 Disable App Lock'}
                      </Text>
                    </AnimatedPressable>

                    {/* Change PIN Button */}
                    <AnimatedPressable
                      reduceMotion={reduceMotion}
                      style={[
                        styles.primaryBtn,
                        { backgroundColor: theme.primary, alignItems: 'center' },
                      ]}
                      onPress={() => {
                        setAppLockStep('enter_pin');
                        setAppLockInputPin('');
                        setAppLockConfirmPin('');
                        setAppLockError(null);
                      }}
                    >
                      <Text style={{ color: '#0E1220', fontWeight: '900', fontSize: 13 }}>
                        {isTh ? '🔑 เปลี่ยนรหัส PIN ใหม่' : '🔑 Change PIN'}
                      </Text>
                    </AnimatedPressable>

                    {/* Toggle Biometric Unlock */}
                    <Pressable
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 10,
                        backgroundColor: theme.bgSecondary,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: theme.border,
                      }}
                      onPress={() => {
                        updateProfile({
                          appLockBiometricEnabled: !db.profile.appLockBiometricEnabled,
                        });
                      }}
                    >
                      <Text style={{ color: theme.text, fontSize: 12, fontWeight: '700' }}>
                        {isTh ? 'สแกนลายนิ้วมือ / Biometric' : 'Fingerprint / Biometric'}
                      </Text>
                      <Text
                        style={{
                          color: db.profile.appLockBiometricEnabled ? theme.success : theme.textMuted,
                          fontWeight: '800',
                          fontSize: 12,
                        }}
                      >
                        {db.profile.appLockBiometricEnabled ? (isTh ? 'เปิด' : 'ON') : (isTh ? 'ปิด' : 'OFF')}
                      </Text>
                    </Pressable>

                    {appLockSuccessMsg && (
                      <Text style={{ color: theme.success, fontSize: 12, fontWeight: '800', textAlign: 'center' }}>
                        {appLockSuccessMsg}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            ) : (
              /* Mode 2: Setup New PIN */
              <View style={{ marginTop: 12 }}>
                <Text style={{ color: theme.textSecondary, fontSize: 12, textAlign: 'center' }}>
                  {appLockStep === 'enter_pin'
                    ? isTh
                      ? 'กำหนดรหัส PIN 4 หลักใหม่:'
                      : 'Enter new 4-digit PIN:'
                    : isTh
                    ? 'ยืนยันรหัส PIN 4 หลักอีกครั้ง:'
                    : 'Confirm new 4-digit PIN:'}
                </Text>

                {/* PIN Dots */}
                <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'center', marginVertical: 14 }}>
                  {[0, 1, 2, 3].map((idx) => {
                    const currentPinStr = appLockStep === 'enter_pin' ? appLockInputPin : appLockConfirmPin;
                    return (
                      <View
                        key={idx}
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 8,
                          backgroundColor: currentPinStr.length > idx ? theme.primary : 'transparent',
                          borderWidth: 2,
                          borderColor: currentPinStr.length > idx ? theme.primary : theme.border,
                        }}
                      />
                    );
                  })}
                </View>

                {appLockError && (
                  <Text style={{ color: theme.danger, fontSize: 11, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
                    {appLockError}
                  </Text>
                )}

                {appLockSuccessMsg && (
                  <Text style={{ color: theme.success, fontSize: 12, fontWeight: '800', textAlign: 'center', marginBottom: 8 }}>
                    {appLockSuccessMsg}
                  </Text>
                )}

                {/* Keypad */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginVertical: 8 }}>
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                    <Pressable
                      key={k}
                      style={{
                        width: 58,
                        height: 46,
                        borderRadius: 8,
                        backgroundColor: theme.bgSecondary,
                        borderWidth: 1,
                        borderColor: theme.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPress={() => {
                        setAppLockError(null);
                        if (appLockStep === 'enter_pin') {
                          if (k === 'C') {
                            setAppLockInputPin('');
                          } else if (k === '⌫') {
                            setAppLockInputPin((p) => p.slice(0, -1));
                          } else {
                            const next = appLockInputPin + k;
                            if (next.length <= 4) {
                              setAppLockInputPin(next);
                              if (next.length === 4) {
                                setTimeout(() => setAppLockStep('confirm_pin'), 150);
                              }
                            }
                          }
                        } else {
                          // confirm_pin
                          if (k === 'C') {
                            setAppLockConfirmPin('');
                          } else if (k === '⌫') {
                            setAppLockConfirmPin((p) => p.slice(0, -1));
                          } else {
                            const next = appLockConfirmPin + k;
                            if (next.length <= 4) {
                              setAppLockConfirmPin(next);
                              if (next.length === 4) {
                                if (next === appLockInputPin) {
                                  updateProfile({
                                    appLockPin: appLockInputPin,
                                    appLockBiometricEnabled: appLockBiometricOpt,
                                  });
                                  recordAppEvent('event:applock_set', 1);
                                  setAppLockSuccessMsg(isTh ? '✓ เปิดใช้งานการล็อกแอปสำเร็จ' : '✓ App lock enabled successfully');
                                  setTimeout(() => {
                                    setAppLockModalOpen(false);
                                    setAppLockInputPin('');
                                    setAppLockConfirmPin('');
                                  }, 700);
                                } else {
                                  setAppLockError(isTh ? 'รหัส PIN ไม่ตรงกัน กรุณากรอกใหม่' : 'PINs do not match, try again');
                                  setTimeout(() => setAppLockConfirmPin(''), 500);
                                }
                              }
                            }
                          }
                        }
                      }}
                    >
                      <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800' }}>{k}</Text>
                    </Pressable>
                  ))}
                </View>

                {/* Back / Cancel button */}
                <Pressable
                  style={{ marginTop: 8, alignItems: 'center', padding: 8 }}
                  onPress={() => {
                    if (appLockStep === 'confirm_pin') {
                      setAppLockStep('enter_pin');
                      setAppLockConfirmPin('');
                    } else {
                      setAppLockModalOpen(false);
                    }
                  }}
                >
                  <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                    {appLockStep === 'confirm_pin' ? (isTh ? '← ย้อนกลับ' : '← Back') : (isTh ? 'ยกเลิก' : 'Cancel')}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  headerRowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 15,
  },
  playerTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  subBox: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 13,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  primaryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#0E1220',
    fontWeight: '900',
    fontSize: 12,
  },
  questItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    gap: 8,
  },
  tierSummaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tierSummaryPill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  titleMasteryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  nearItemRow: {
    marginBottom: 10,
  },
  categoryScrollRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  tierMiniPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeTile: {
    width: '48%',
    flexGrow: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  avatarActionBtn: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyToggleBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  togglePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  timeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
});
