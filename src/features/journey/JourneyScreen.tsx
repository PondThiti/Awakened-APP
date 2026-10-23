import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppTheme } from '../../app/theme';
import { useAwakened } from '../../data/repository';
import { t } from '../../l10n/translations';
import { addDaysToDayKey, getLocalDayKey } from '../../core/utils/dateUtils';
import { AppIcon, AppIconName } from '../components/AppIcons';
import {
  AnimatedCard,
  AnimatedPressable,
  AnimatedProgressBar,
  AnimatedScreenWrapper,
} from '../components/AnimatedComponents';

const MOOD_LEVELS = [
  { level: 1, color: '#EF4444', th: 'ล้ามาก', en: 'Exhausted' },
  { level: 2, color: '#F97316', th: 'เหนื่อย', en: 'Drained' },
  { level: 3, color: '#EAB308', th: 'เฉย ๆ', en: 'Neutral' },
  { level: 4, color: '#38BDF8', th: 'สงบ', en: 'Calm' },
  { level: 5, color: '#10B981', th: 'ดี', en: 'Good' },
  { level: 6, color: '#8B5CF6', th: 'สดชื่น', en: 'Energetic' },
  { level: 7, color: '#EC4899', th: 'ยอดเยี่ยม', en: 'Inspired' },
];

const MOOD_TAGS = [
  { id: 'work', th: 'งาน', en: 'Work' },
  { id: 'study', th: 'เรียน', en: 'Study' },
  { id: 'sleep', th: 'การนอน', en: 'Sleep' },
  { id: 'workout', th: 'ออกกำลัง', en: 'Workout' },
  { id: 'rest', th: 'พักผ่อน', en: 'Rest' },
  { id: 'family', th: 'คนรอบข้าง', en: 'Social' },
];

export const JourneyScreen: React.FC<{ theme: AppTheme }> = ({ theme }) => {
  const {
    db,
    todayKey,
    todayMetrics,
    streakState,
    saveJournalEntry,
    deleteJournalEntry,
    logMoodEntry,
  } = useAwakened();

  const [subTab, setSubTab] = useState<'journal' | 'mood' | 'calendar' | 'recap'>('journal');
  const lang = db.profile.language;
  const strings = t(lang);
  const isTh = lang === 'th';
  const reduceMotion = db.profile.reduceEffects;

  // Journal state
  const [editingId, setEditingId] = useState<number | undefined>(undefined);
  const [journalTitle, setJournalTitle] = useState('');
  const [journalBody, setJournalBody] = useState('');
  const [journalCat, setJournalCat] = useState('reflection');
  const [searchText, setSearchText] = useState('');

  // Mood state
  const [selectedMood, setSelectedMood] = useState(4);
  const [selectedTags, setSelectedTags] = useState<string[]>(['rest']);
  const [moodNote, setMoodNote] = useState('');

  // Calendar selected day
  const [selectedDayKey, setSelectedDayKey] = useState(todayKey);

  const charCount = journalBody.trim().length;
  const filteredJournals = db.journals.filter(
    (j) =>
      !searchText.trim() ||
      j.title.toLowerCase().includes(searchText.toLowerCase()) ||
      j.body.toLowerCase().includes(searchText.toLowerCase()) ||
      j.entryDate.includes(searchText.trim())
  );

  const last14Days = Array.from({ length: 14 }, (_, i) =>
    addDaysToDayKey(todayKey, -(13 - i))
  );

  // Mood counts for Recap (strictly descriptive, non-diagnostic per Section 6.7)
  const moodDistribution = MOOD_LEVELS.map((m) => ({
    ...m,
    count: db.moods.filter((entry) => entry.moodLevel === m.level).length,
  }));
  const topMood = [...moodDistribution].sort((a, b) => b.count - a.count)[0];

  const subTabs: ReadonlyArray<{
    id: 'journal' | 'mood' | 'calendar' | 'recap';
    icon: AppIconName;
    label: string;
  }> = [
    { id: 'journal', icon: 'journal', label: strings.journey.journalTab },
    { id: 'mood', icon: 'heart', label: strings.journey.moodTab },
    { id: 'calendar', icon: 'calendar', label: strings.journey.calendarTab },
    { id: 'recap', icon: 'activity', label: strings.journey.recapTab },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View
        style={[
          styles.subTabBar,
          { backgroundColor: theme.card, borderBottomColor: theme.border },
        ]}
      >
        {subTabs.map((tab) => {
          const active = subTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              style={[
                styles.subTabBtn,
                active && {
                  backgroundColor: `${theme.primary}22`,
                  borderColor: theme.primary,
                },
              ]}
              onPress={() => setSubTab(tab.id)}
            >
              <View style={styles.inlineIconRow}>
                <AppIcon
                  name={tab.icon}
                  size={14}
                  color={active ? theme.primary : theme.textSecondary}
                />
                <Text
                  style={{
                    color: active ? theme.primary : theme.textSecondary,
                    fontWeight: '800',
                    fontSize: 12,
                  }}
                >
                  {tab.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <AnimatedScreenWrapper triggerKey={subTab} reduceMotion={reduceMotion}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* 1. DAILY JOURNAL */}
          {subTab === 'journal' && (
            <>
              <AnimatedCard
                index={0}
                reduceMotion={reduceMotion}
                style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <View style={styles.inlineIconRow}>
                  <AppIcon name="journal" size={18} color={theme.mind} />
                  <Text style={[styles.cardTitle, { color: theme.text }]}>
                    {editingId
                      ? isTh
                        ? 'แก้ไขไดอารี่'
                        : 'Edit Journal'
                      : isTh
                      ? 'เขียนบันทึกประจำวัน'
                      : 'Write Daily Journal'}
                  </Text>
                </View>
                <Text
                  style={{
                    color: charCount >= 20 ? theme.success : theme.textSecondary,
                    fontSize: 12,
                    marginTop: 4,
                    marginBottom: 10,
                  }}
                >
                  {strings.journey.journalHint} ({charCount}/20 {isTh ? 'ตัวอักษร' : 'chars'})
                </Text>

                <View style={[styles.chipRow, { marginBottom: 10 }]}>
                  {(
                    [
                      { id: 'reflection', icon: 'brain' as AppIconName, label: isTh ? 'ทบทวนตัวเอง' : 'Reflection' },
                      { id: 'gratitude', icon: 'heart' as AppIconName, label: isTh ? 'ขอบคุณสิ่งดี ๆ' : 'Gratitude' },
                      { id: 'wins', icon: 'trophy' as AppIconName, label: isTh ? 'ความสำเร็จเล็ก ๆ' : 'Small Wins' },
                    ]
                  ).map((c) => {
                    const active = journalCat === c.id;
                    return (
                      <AnimatedPressable
                        key={c.id}
                        reduceMotion={reduceMotion}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: active ? `${theme.mind}25` : theme.bgSecondary,
                            borderColor: active ? theme.mind : theme.border,
                          },
                        ]}
                        onPress={() => setJournalCat(c.id)}
                      >
                        <View style={styles.inlineIconRow}>
                          <AppIcon
                            name={c.icon}
                            size={13}
                            color={active ? theme.mind : theme.textSecondary}
                          />
                          <Text
                            style={{
                              color: active ? theme.mind : theme.textSecondary,
                              fontWeight: '800',
                              fontSize: 12,
                            }}
                          >
                            {c.label}
                          </Text>
                        </View>
                      </AnimatedPressable>
                    );
                  })}
                </View>

                <TextInput
                  value={journalTitle}
                  onChangeText={setJournalTitle}
                  placeholder={isTh ? 'หัวข้อวันนี้ (ไม่บังคับ)...' : 'Entry title (optional)...'}
                  placeholderTextColor={theme.textMuted}
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.bgSecondary,
                      color: theme.text,
                      borderColor: theme.border,
                      marginBottom: 8,
                    },
                  ]}
                />

                <TextInput
                  value={journalBody}
                  onChangeText={setJournalBody}
                  multiline
                  numberOfLines={4}
                  placeholder={
                    isTh
                      ? 'วันนี้เกิดอะไรขึ้นบ้าง? คุณได้เรียนรู้อะไร หรืออยากขอบคุณตัวเองเรื่องอะไร...'
                      : 'What happened today? What small win are you proud of?'
                  }
                  placeholderTextColor={theme.textMuted}
                  style={[
                    styles.textArea,
                    {
                      backgroundColor: theme.bgSecondary,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                />

                <AnimatedPressable
                  reduceMotion={reduceMotion}
                  style={[
                    styles.primaryBtn,
                    { backgroundColor: theme.mind, marginTop: 12 },
                  ]}
                  onPress={() => {
                    if (!journalBody.trim()) return;
                    saveJournalEntry({
                      id: editingId,
                      title: journalTitle,
                      body: journalBody,
                      category: journalCat,
                    });
                    setEditingId(undefined);
                    setJournalTitle('');
                    setJournalBody('');
                  }}
                >
                  <Text style={styles.primaryBtnText}>
                    {editingId
                      ? isTh
                        ? 'บันทึกการแก้ไข'
                        : 'Save Changes'
                      : isTh
                      ? 'บันทึกไดอารี่ (+15 XP เมื่อ ≥20 ตัวอักษร)'
                      : 'Save Journal (+15 XP if ≥20 chars)'}
                  </Text>
                </AnimatedPressable>
              </AnimatedCard>

              {/* Search & Past Entries */}
              <AnimatedCard
                index={1}
                reduceMotion={reduceMotion}
                style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <TextInput
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder={isTh ? 'ค้นหาข้อความหรือวันที่ (YYYY-MM-DD)...' : 'Search journal entries...'}
                  placeholderTextColor={theme.textMuted}
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.bgSecondary,
                      color: theme.text,
                      borderColor: theme.border,
                      marginBottom: 10,
                    },
                  ]}
                />

                {filteredJournals.map((j) => (
                  <View
                    key={j.id}
                    style={[
                      styles.journalCard,
                      { backgroundColor: theme.bgSecondary, borderColor: theme.border },
                    ]}
                  >
                    <View style={styles.headerRow}>
                      <Text style={{ color: theme.text, fontWeight: '800', fontSize: 14 }}>
                        {j.title}
                      </Text>
                      <Text style={{ color: theme.mind, fontSize: 11, fontWeight: '700' }}>
                        {j.entryDate} · +{j.xpAwarded} XP
                      </Text>
                    </View>
                    <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 6, lineHeight: 19 }}>
                      {j.body}
                    </Text>
                    <View style={[styles.chipRow, { marginTop: 8 }]}>
                      <Pressable
                        style={styles.inlineIconRow}
                        onPress={() => {
                          setEditingId(j.id);
                          setJournalTitle(j.title);
                          setJournalBody(j.body);
                          setJournalCat(j.category);
                        }}
                      >
                        <AppIcon name="edit" size={13} color={theme.primary} />
                        <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '700' }}>
                          {isTh ? 'แก้ไข' : 'Edit'}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[styles.inlineIconRow, { marginLeft: 8 }]}
                        onPress={() => deleteJournalEntry(j.id)}
                      >
                        <AppIcon name="trash" size={13} color={theme.danger} />
                        <Text style={{ color: theme.danger, fontSize: 12, fontWeight: '700' }}>
                          {isTh ? 'ลบ' : 'Delete'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </AnimatedCard>
            </>
          )}

          {/* 2. MOOD TRACKER */}
          {subTab === 'mood' && (
            <AnimatedCard
              index={0}
              reduceMotion={reduceMotion}
              style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <View style={styles.inlineIconRow}>
                <AppIcon name="heart" size={18} color={theme.mind} />
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  {isTh ? 'สำรวจความรู้สึกตอนนี้ (+5 XP, สูงสุด 2 ครั้ง/วัน)' : 'Mood Check-in (+5 XP, up to 2x/day)'}
                </Text>
              </View>

              <View style={styles.moodRow}>
                {MOOD_LEVELS.map((m) => {
                  const active = selectedMood === m.level;
                  return (
                    <AnimatedPressable
                      key={m.level}
                      reduceMotion={reduceMotion}
                      style={[
                        styles.moodBtn,
                        {
                          backgroundColor: active ? `${m.color}22` : theme.bgSecondary,
                          borderColor: active ? m.color : theme.border,
                        },
                      ]}
                      onPress={() => setSelectedMood(m.level)}
                    >
                      <View
                        style={[
                          styles.moodBadgeCircle,
                          { backgroundColor: `${m.color}28`, borderColor: m.color },
                        ]}
                      >
                        <Text style={{ color: m.color, fontWeight: '900', fontSize: 13 }}>
                          {m.level}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: active ? m.color : theme.textSecondary,
                          fontSize: 11,
                          fontWeight: '800',
                          marginTop: 4,
                        }}
                      >
                        {isTh ? m.th : m.en}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>

              <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 12, marginBottom: 6 }}>
                {isTh ? 'แท็กบริบทที่เกี่ยวข้อง:' : 'Context tags:'}
              </Text>
              <View style={styles.chipRow}>
                {MOOD_TAGS.map((tag) => {
                  const active = selectedTags.includes(tag.id);
                  return (
                    <AnimatedPressable
                      key={tag.id}
                      reduceMotion={reduceMotion}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? `${theme.mind}25` : theme.bgSecondary,
                          borderColor: active ? theme.mind : theme.border,
                        },
                      ]}
                      onPress={() => {
                        setSelectedTags((prev) =>
                          prev.includes(tag.id)
                            ? prev.filter((t) => t !== tag.id)
                            : [...prev, tag.id]
                        );
                      }}
                    >
                      <Text
                        style={{
                          color: active ? theme.mind : theme.textSecondary,
                          fontSize: 12,
                          fontWeight: '700',
                        }}
                      >
                        #{isTh ? tag.th : tag.en}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>

              <TextInput
                value={moodNote}
                onChangeText={setMoodNote}
                placeholder={isTh ? 'คำอธิบายสั้น ๆ (ไม่บังคับ)...' : 'Short note (optional)...'}
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

              <AnimatedPressable
                reduceMotion={reduceMotion}
                style={[styles.primaryBtn, { backgroundColor: theme.mind, marginTop: 12 }]}
                onPress={() => {
                  logMoodEntry(selectedMood, moodNote, selectedTags);
                  setMoodNote('');
                }}
              >
                <Text style={styles.primaryBtnText}>
                  {isTh ? 'บันทึกอารมณ์ (+5 XP)' : 'Log Mood (+5 XP)'}
                </Text>
              </AnimatedPressable>
            </AnimatedCard>
          )}

          {/* 3. CALENDAR VIEW */}
          {subTab === 'calendar' && (
            <AnimatedCard
              index={0}
              reduceMotion={reduceMotion}
              style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <View style={[styles.inlineIconRow, { marginBottom: 10 }]}>
                <AppIcon name="calendar" size={18} color={theme.primary} />
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  {isTh ? 'ปฏิทินการเดินทาง 14 วันล่าสุด' : '14-Day Journey Calendar'}
                </Text>
              </View>

              <View style={styles.calendarGrid}>
                {last14Days.map((dk) => {
                  const st = streakState.updatedLogs[dk];
                  const hasJournal = db.journals.some((j) => j.entryDate === dk);
                  const hasMood = db.moods.some((m) => m.dayKey === dk);
                  const selected = selectedDayKey === dk;

                  return (
                    <AnimatedPressable
                      key={dk}
                      reduceMotion={reduceMotion}
                      style={[
                        styles.calCell,
                        {
                          backgroundColor: selected ? `${theme.primary}25` : theme.bgSecondary,
                          borderColor: selected ? theme.primary : theme.border,
                        },
                      ]}
                      onPress={() => setSelectedDayKey(dk)}
                    >
                      <Text style={{ color: theme.text, fontWeight: '800', fontSize: 12 }}>
                        {dk.slice(5)}
                      </Text>
                      <View style={styles.dotRow}>
                        {st === 'active' && (
                          <View style={[styles.dot, { backgroundColor: theme.success }]} />
                        )}
                        {st === 'rest' && (
                          <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                        )}
                        {hasJournal && (
                          <View style={[styles.dot, { backgroundColor: theme.mind }]} />
                        )}
                        {hasMood && (
                          <View style={[styles.dot, { backgroundColor: theme.warning }]} />
                        )}
                      </View>
                    </AnimatedPressable>
                  );
                })}
              </View>

              <View
                style={[
                  styles.journalCard,
                  { backgroundColor: theme.bgSecondary, borderColor: theme.border, marginTop: 14 },
                ]}
              >
                <View style={styles.inlineIconRow}>
                  <AppIcon name="calendar" size={14} color={theme.primary} />
                  <Text style={{ color: theme.primary, fontWeight: '800', fontSize: 14 }}>
                    {isTh ? `สรุปวันที่ ${selectedDayKey}` : `Logs on ${selectedDayKey}`}
                  </Text>
                </View>
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>
                  • {isTh ? 'กิจกรรมที่บันทึก:' : 'Activities:'}{' '}
                  {
                    db.activities.filter(
                      (a) =>
                        !a.deletedAt &&
                        getLocalDayKey(a.occurredAt, a.tzOffsetMin) === selectedDayKey
                    ).length
                  }{' '}
                  {isTh ? 'รายการ' : 'items'}
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                  • {isTh ? 'ไดอารี่:' : 'Journals:'}{' '}
                  {db.journals.filter((j) => j.entryDate === selectedDayKey).length}
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                  • {isTh ? 'บันทึกอารมณ์:' : 'Mood logs:'}{' '}
                  {db.moods.filter((m) => m.dayKey === selectedDayKey).length}
                </Text>
              </View>
            </AnimatedCard>
          )}

          {/* 4. JOURNEY RECAP (Non-Diagnostic Rule Section 6.7) */}
          {subTab === 'recap' && (
            <AnimatedCard
              index={0}
              reduceMotion={reduceMotion}
              style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <View style={styles.inlineIconRow}>
                <AppIcon name="activity" size={18} color={theme.primary} />
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  {isTh ? 'สรุปการเดินทาง (Journey Recap)' : 'Journey Recap'}
                </Text>
              </View>
              <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 4, marginBottom: 12 }}>
                {strings.journey.recapDisclaimer}
              </Text>

              <View
                style={[
                  styles.journalCard,
                  { backgroundColor: theme.bgSecondary, borderColor: theme.border },
                ]}
              >
                <Text style={{ color: theme.text, fontWeight: '800', fontSize: 14 }}>
                  {isTh
                    ? `สัปดาห์นี้คุณมีวัน Active ${streakState.weeklyActiveDays} วัน และสะสมเวลาโฟกัส ${todayMetrics.weekly_focus_min} นาที`
                    : `This week you logged ${streakState.weeklyActiveDays} active days and ${todayMetrics.weekly_focus_min} focus minutes.`}
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 6 }}>
                  {topMood && topMood.count > 0
                    ? isTh
                      ? `จากการบันทึกของคุณ คุณเลือกอารมณ์ '${topMood.th}' ${topMood.count} ครั้ง`
                      : `Based on your logs, you selected the mood '${topMood.en}' ${topMood.count} times.`
                    : isTh
                    ? 'ยังไม่มีการบันทึกอารมณ์ในสัปดาห์นี้ ลองบันทึกอารมณ์เพื่อดูสถิติย้อนหลังได้นะ'
                    : 'No mood entries logged yet this week.'}
                </Text>
              </View>

              {/* Animated Mood Distribution Bars */}
              <Text style={{ color: theme.text, fontWeight: '800', marginTop: 12, marginBottom: 8 }}>
                {isTh ? 'การกระจายอารมณ์ที่คุณเลือก:' : 'Mood Selection Distribution:'}
              </Text>
              {moodDistribution.map((m) => (
                <View key={m.level} style={styles.distRow}>
                  <Text style={{ width: 90, color: theme.textSecondary, fontSize: 12, fontWeight: '700' }}>
                    Lv.{m.level} {isTh ? m.th : m.en}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <AnimatedProgressBar
                      percent={Math.min(100, m.count * 20)}
                      fillColor={m.color}
                      trackColor={theme.bgSecondary}
                      borderColor={theme.border}
                      height={10}
                      reduceMotion={reduceMotion}
                    />
                  </View>
                  <Text style={{ width: 35, textAlign: 'right', color: theme.text, fontSize: 12 }}>
                    {m.count}
                  </Text>
                </View>
              ))}
            </AnimatedCard>
          )}
        </ScrollView>
      </AnimatedScreenWrapper>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  inlineIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subTabBar: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 100,
    gap: 14,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 15,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 14,
  },
  textArea: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 14,
    minHeight: 96,
    textAlignVertical: 'top',
  },
  primaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#0E1220',
    fontWeight: '900',
    fontSize: 13,
  },
  journalCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  moodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  moodBtn: {
    width: 74,
    flexGrow: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  moodBadgeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  calCell: {
    width: 72,
    flexGrow: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 4,
    height: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
});
