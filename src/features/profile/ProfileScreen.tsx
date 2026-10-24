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
              <Text style={{ fontSize: 10 }}>📷</Text>
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
              <AppIcon name="scan" size={13} color={theme.primary} />
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
        </View>
      </AnimatedCard>

      {/* 2. Personal Quest Manager (Section 8.4) */}
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

      {/* 3. Trophy Room — ห้องถ้วยรางวัล (199 Achievements, Section 5 & 7) */}
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

      {/* 4. All 8 Ranks Reference Table */}
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

      {/* 4A. Home Screen Widget & App Icon */}
      <AnimatedCard
        index={4}
        reduceMotion={reduceMotion}
        style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
      >
        <View style={styles.headerRowBetween}>
          <View style={styles.inlineIconRow}>
            <AppIcon name="bolt" size={18} color={theme.warning} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {isTh ? 'วิดเจ็ตหน้าจอหลัก & ไอคอนแอป' : 'Home Screen Widget & Icon'}
            </Text>
          </View>
        </View>
        <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4, lineHeight: 18 }}>
          {isTh
            ? 'ติดตามภารกิจประจำวัน ปริมาณน้ำ แคลอรี่ และสตรีคของคุณได้ทันทีบนหน้าจอมือถือโดยไม่ต้องเปิดแอป'
            : 'Track your daily missions, water, calories and streak directly on your Android home screen.'}
        </Text>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <AnimatedPressable
            reduceMotion={reduceMotion}
            style={[
              styles.primaryBtn,
              { flex: 1, backgroundColor: theme.primary, alignItems: 'center' },
            ]}
            onPress={async () => {
              const res = await requestPinWidget();
              setWidgetFeedback(
                res
                  ? isTh
                    ? '✓ ส่งคำขอเพิ่มวิดเจ็ตลงหน้าจอหลักแล้ว'
                    : '✓ Widget pinned to home screen'
                  : isTh
                  ? 'คุณสามารถกดค้างที่หน้าจอหลักของโทรศัพท์เพื่อเพิ่มวิดเจ็ต Awakened ได้เอง'
                  : 'Long-press your phone home screen to place Awakened widget'
              );
              setTimeout(() => setWidgetFeedback(null), 4000);
            }}
          >
            <View style={styles.inlineIconRow}>
              <AppIcon name="plus" size={13} color="#0E1220" />
              <Text style={{ color: '#0E1220', fontWeight: '900', fontSize: 12 }}>
                {isTh ? 'เพิ่มวิดเจ็ตลงหน้าจอ' : 'Add Widget'}
              </Text>
            </View>
          </AnimatedPressable>

          <AnimatedPressable
            reduceMotion={reduceMotion}
            style={[
              styles.primaryBtn,
              {
                flex: 1,
                backgroundColor: `${theme.warning}25`,
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
                  ? isTh
                    ? '✓ สร้างไอคอนโปรไฟล์บนหน้าจอหลักแล้ว'
                    : '✓ Profile icon pinned'
                  : isTh
                  ? 'อุปกรณ์นี้ไม่รองรับการปักหมุดไอคอนอัตโนมัติ'
                  : 'Not supported on launcher'
              );
              setTimeout(() => setShortcutFeedback(null), 4000);
            }}
          >
            <View style={styles.inlineIconRow}>
              <AppIcon name="user" size={13} color={theme.warning} />
              <Text style={{ color: theme.warning, fontWeight: '900', fontSize: 12 }}>
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
      </AnimatedCard>

      {/* 4B. Notifications & Daily Mission Alarm Clock */}
      <AnimatedCard
        index={5}
        reduceMotion={reduceMotion}
        style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
      >
        <View style={styles.headerRowBetween}>
          <View style={styles.inlineIconRow}>
            <AppIcon name="clock" size={18} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {isTh ? 'การแจ้งเตือน & นาฬิกาปลุกภารกิจ' : 'Notifications & Mission Alarm'}
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

        {/* Permission Request Prompt if not granted */}
        {!notifGranted && (
          <View
            style={{
              backgroundColor: `${theme.primary}15`,
              borderColor: `${theme.primary}44`,
              borderWidth: 1,
              borderRadius: 10,
              padding: 10,
              marginTop: 10,
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

        {/* Daily Mission Alarm Clock Section */}
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
            <View style={styles.inlineIconRow}>
              <Text style={{ fontSize: 16 }}>⏰</Text>
              <View>
                <Text style={{ color: theme.text, fontSize: 13, fontWeight: '800' }}>
                  {isTh ? 'นาฬิกาปลุกภารกิจประจำวัน' : 'Daily Mission Alarm Clock'}
                </Text>
                <Text style={{ color: theme.textMuted, fontSize: 11 }}>
                  {isTh
                    ? 'แจ้งเตือนระดับสูงให้มาพิชิตภารกิจ (พร้อมปุ่มเลื่อน 10 นาที)'
                    : 'High-priority wake alarm to complete missions (with snooze)'}
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
                  days: [],
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

          {/* Alarm Time Selector */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 10,
              paddingTop: 8,
              borderTopWidth: 1,
              borderTopColor: `${theme.border}44`,
            }}
          >
            <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '700' }}>
              {isTh ? 'เวลาปลุก:' : 'Alarm Time:'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {['06:00', '07:00', '08:00', '09:00'].map((timeStr) => {
                const active = (db.profile.alarm?.time ?? '07:00') === timeStr;
                return (
                  <Pressable
                    key={timeStr}
                    style={[
                      styles.timeChip,
                      {
                        backgroundColor: active ? theme.primary : theme.card,
                        borderColor: active ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => {
                      const current = db.profile.alarm ?? {
                        enabled: true,
                        time: timeStr,
                        days: [],
                      };
                      updateProfile({
                        alarm: {
                          ...current,
                          time: timeStr,
                        },
                      });
                    }}
                  >
                    <Text
                      style={{
                        color: active ? '#0E1220' : theme.text,
                        fontSize: 11,
                        fontWeight: '800',
                      }}
                    >
                      {timeStr}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* Notification Reminders Toggle */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 12,
          }}
        >
          <View>
            <Text style={{ color: theme.text, fontSize: 12, fontWeight: '700' }}>
              {isTh ? 'เตือนทำภารกิจตอนเช้า (08:00)' : 'Morning Mission Reminder (08:00)'}
            </Text>
            <Text style={{ color: theme.textMuted, fontSize: 10 }}>
              {isTh ? 'เตือนภารกิจรายวันบนแถบแจ้งเตือน' : 'Notification tray reminder'}
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

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 10,
          }}
        >
          <View>
            <Text style={{ color: theme.text, fontSize: 12, fontWeight: '700' }}>
              {isTh ? 'เตือนสรุปภารกิจตอนค่ำ (20:00)' : 'Evening Check-in (20:00)'}
            </Text>
            <Text style={{ color: theme.textMuted, fontSize: 10 }}>
              {isTh ? 'เตือนก่อนหมดวันเพื่อรักษา Streak' : 'Streak protection check-in'}
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
      </AnimatedCard>

      {/* 4C. Developer Support & Donation (Thailand Only) */}
      <AnimatedCard
        index={6}
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
                  ? 'คัดลอกเลขบัญชีกสิกร (1638680528)'
                  : 'Copy KBANK Account (1638680528)'}
              </Text>
            </View>
          </AnimatedPressable>
        </View>
      </AnimatedCard>

      {/* 5. Settings, Preferences & Privacy (Section 14 & 15) */}
      <AnimatedCard
        index={4}
        reduceMotion={reduceMotion}
        style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
      >
        <View style={[styles.inlineIconRow, { marginBottom: 12 }]}>
          <AppIcon name="settings" size={18} color={theme.primary} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            {strings.profile.settings}
          </Text>
        </View>

        {/* Display Name */}
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

        {/* Toggles: Language, Theme, Sound, Reduce Motion */}
        <View style={styles.chipRow}>
          <AnimatedPressable
            reduceMotion={reduceMotion}
            style={[styles.chip, { backgroundColor: theme.bgSecondary, borderColor: theme.primary }]}
            onPress={() =>
              updateProfile({ language: db.profile.language === 'th' ? 'en' : 'th' })
            }
          >
            <Text style={{ color: theme.primary, fontWeight: '800', fontSize: 12 }}>
              {isTh ? 'ภาษา: ไทย (แตะเปลี่ยนเป็น EN)' : 'Language: EN (Tap for TH)'}
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
                    ? 'ลดแอนิเมชัน (Reduce Motion): เปิด'
                    : 'Reduce Motion: ON'
                  : isTh
                  ? 'แอนิเมชันเต็มรูปแบบ: เปิด'
                  : 'Full Animations: ON'}
              </Text>
            </View>
          </AnimatedPressable>

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
                    ? 'ปิดป๊อปอัปถ้วยรางวัล: เปิด'
                    : 'Mute Badge Popups: ON'
                  : isTh
                  ? 'ป๊อปอัปถ้วยรางวัล: แสดงปกติ'
                  : 'Badge Popups: ON'}
              </Text>
            </View>
          </AnimatedPressable>

          <AnimatedPressable
            reduceMotion={reduceMotion}
            style={[styles.chip, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}
            onPress={() => recordAppEvent('event:applock_set', 1)}
          >
            <View style={styles.inlineIconRow}>
              <AppIcon
                name="lock"
                size={13}
                color={
                  Number(achievementMetrics['event:applock_set'] ?? 0) >= 1
                    ? theme.success
                    : theme.textSecondary
                }
              />
              <Text style={{ color: theme.text, fontWeight: '700', fontSize: 12 }}>
                {Number(achievementMetrics['event:applock_set'] ?? 0) >= 1
                  ? isTh
                    ? 'ล็อกแอปด้วย PIN/Biometric: เปิดแล้ว ✓'
                    : 'App Lock: Enabled ✓'
                  : isTh
                  ? 'เปิดใช้งานล็อกแอป (App Lock)'
                  : 'Enable App Lock'}
              </Text>
            </View>
          </AnimatedPressable>
        </View>

        {/* System Narrator Tone Selector (Unlocks app_narrator) */}
        <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 12, marginBottom: 6 }}>
          {isTh ? 'โทนเสียงผู้บรรยายของระบบ (System Narrator):' : 'System Narrator Tone:'}
        </Text>
        <View style={styles.chipRow}>
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

        {/* Available Daily Time & Weekly Goal */}
        <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 12, marginBottom: 6 }}>
          {isTh ? 'เวลาว่างต่อวัน (มีผลต่อ Adaptive Plan):' : 'Available time/day (Adaptive Plan):'}
        </Text>
        <View style={styles.chipRow}>
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

        {/* Edit / Re-run Onboarding Questionnaire (Section 1 & 11.1) */}
        <AnimatedPressable
          reduceMotion={reduceMotion}
          style={[
            styles.primaryBtn,
            {
              backgroundColor: `${theme.primary}22`,
              borderColor: theme.primary,
              borderWidth: 1,
              marginTop: 14,
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
        <View style={[styles.inlineIconRow, { marginTop: 16, marginBottom: 8 }]}>
          <AppIcon name="shield" size={16} color={theme.primary} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            {isTh ? 'จัดการข้อมูลส่วนตัว (Offline-First 100%)' : 'Offline Data & Backup'}
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
      </AnimatedCard>

      {/* 6. Health Disclaimer & Open-Source Credits (Section 14.3 & 19) */}
      <AnimatedCard
        index={5}
        reduceMotion={reduceMotion}
        style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
      >
        <View style={styles.headerRowBetween}>
          <View style={styles.inlineIconRow}>
            <AppIcon name="shield" size={18} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>
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
              },
            ]}
            onPress={() => recordAppEvent('event:credits_viewed', 1)}
          >
            <Text style={{ color: theme.primary, fontSize: 11, fontWeight: '800' }}>
              {Number(achievementMetrics['event:credits_viewed'] ?? 0) >= 1
                ? isTh
                  ? '✓ อ่านเครดิตแล้ว'
                  : '✓ Credits Viewed'
                : isTh
                ? 'ยืนยันการอ่านคำชี้แจง & เครดิต'
                : 'Acknowledge Credits & Disclaimer'}
            </Text>
          </AnimatedPressable>
        </View>
        <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 6, lineHeight: 18 }}>
          {strings.profile.disclaimerBody}
        </Text>
        <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 10 }}>
          Awakened v0.9.5 · Open-Source Licenses: React Native & Expo (MIT), AsyncStorage & SQLite (MIT), React Native SVG (MIT), Vector Icons sourced from FreeIcons.io (Iconly Essential & Free Vector Sets), Thai Food Nutrition Reference (Public Domain / DOH Estimation).
        </Text>
      </AnimatedCard>

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
                <AppIcon name="scan" size={15} color="#0E1220" />
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
