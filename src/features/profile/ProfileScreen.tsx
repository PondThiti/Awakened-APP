import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import achievementsJson from '../../../assets/config/achievements.json';
import xpConfigJson from '../../../assets/config/xp_config.json';
import { AppTheme } from '../../app/theme';
import { useAwakened } from '../../data/repository';
import { t } from '../../l10n/translations';
import { AchievementDef, RankDef } from '../../core/engine/types';
import { RankBadge, XpBar } from '../components/SystemSharedComponents';
import { AppIcon } from '../components/AppIcons';
import {
  AnimatedCard,
  AnimatedPressable,
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
    addPersonalQuest,
    completePersonalQuest,
    deletePersonalQuest,
    updateProfile,
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

  const allRanks = xpConfigJson.ranks as RankDef[];
  const allAchievements = achievementsJson.achievements as AchievementDef[];
  const unlockedSet = new Set(db.achievementsUnlocked.map((u) => u.achievementId));
  const donePersonalToday = new Set(db.personalQuestDoneByDay[todayKey] ?? []);

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
          <View
            style={[
              styles.avatarCircle,
              {
                backgroundColor: `${currentRank.color}20`,
                borderColor: currentRank.color,
              },
            ]}
          >
            <AppIcon name="user" size={28} color={currentRank.color} />
          </View>
          <View style={{ flex: 1 }}>
            <RankBadge rank={currentRank} lang={lang} size="md" reduceMotion={reduceMotion} />
            <Text style={[styles.playerTitle, { color: theme.text }]}>
              {db.profile.displayName}
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
            • Badge Categories 4+: {monarchEligibility.currentBadgeCategories}/
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

      {/* 3. Achievements & Badges */}
      <AnimatedCard
        index={2}
        reduceMotion={reduceMotion}
        style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
      >
        <View style={[styles.inlineIconRow, { marginBottom: 10 }]}>
          <AppIcon name="trophy" size={18} color={theme.warning} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            {strings.profile.achievements} ({db.achievementsUnlocked.length}/
            {allAchievements.length})
          </Text>
        </View>
        <View style={styles.badgeGrid}>
          {allAchievements.map((ach) => {
            const unlocked = unlockedSet.has(ach.id);
            return (
              <View
                key={ach.id}
                style={[
                  styles.badgeTile,
                  {
                    backgroundColor: unlocked ? `${theme.success}16` : theme.bgSecondary,
                    borderColor: unlocked ? theme.success : theme.border,
                    opacity: unlocked ? 1 : 0.65,
                  },
                ]}
              >
                <View
                  style={[
                    styles.badgeIconCircle,
                    {
                      backgroundColor: unlocked ? `${theme.success}25` : theme.card,
                    },
                  ]}
                >
                  <AppIcon
                    name={unlocked ? 'trophy' : 'lock'}
                    size={18}
                    color={unlocked ? theme.success : theme.textMuted}
                  />
                </View>
                <Text style={{ color: theme.text, fontWeight: '800', fontSize: 12, marginTop: 6 }}>
                  {isTh ? ach.title_th : ach.title_en}
                </Text>
                <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 2 }}>
                  {isTh ? ach.description_th : ach.description_en}
                </Text>
              </View>
            );
          })}
        </View>
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
        <View style={styles.inlineIconRow}>
          <AppIcon name="shield" size={18} color={theme.primary} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            {strings.profile.disclaimerTitle}
          </Text>
        </View>
        <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 6, lineHeight: 18 }}>
          {strings.profile.disclaimerBody}
        </Text>
        <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 10 }}>
          Open-Source Licenses: React Native & Expo (MIT), AsyncStorage & SQLite (MIT), React Native SVG (MIT), Vector Icons sourced from FreeIcons.io (Iconly Essential & Free Vector Sets), Thai Food Nutrition Reference (Public Domain / DOH Estimation).
        </Text>
      </AnimatedCard>
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
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeTile: {
    width: '48%',
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
});
