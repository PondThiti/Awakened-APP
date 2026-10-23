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

const MOOD_LEVELS = [
  { level: 1, emoji: '😣', th: 'ล้ามาก', en: 'Exhausted' },
  { level: 2, emoji: '😔', th: 'เหนื่อย', en: 'Drained' },
  { level: 3, emoji: '😐', th: 'เฉย ๆ', en: 'Neutral' },
  { level: 4, emoji: '😌', th: 'สงบ', en: 'Calm' },
  { level: 5, emoji: '🙂', th: 'ดี', en: 'Good' },
  { level: 6, emoji: '😄', th: 'สดชื่น', en: 'Energetic' },
  { level: 7, emoji: '🤩', th: 'ยอดเยี่ยม', en: 'Inspired' },
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

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View
        style={[
          styles.subTabBar,
          { backgroundColor: theme.card, borderBottomColor: theme.border },
        ]}
      >
        {(
          [
            { id: 'journal', label: strings.journey.journalTab },
            { id: 'mood', label: strings.journey.moodTab },
            { id: 'calendar', label: strings.journey.calendarTab },
            { id: 'recap', label: strings.journey.recapTab },
          ] as const
        ).map((tab) => {
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
              <Text
                style={{
                  color: active ? theme.primary : theme.textSecondary,
                  fontWeight: '800',
                  fontSize: 12,
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* 1. DAILY JOURNAL */}
        {subTab === 'journal' && (
          <>
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                📔 {editingId ? (isTh ? 'แก้ไขไดอารี่' : 'Edit Journal') : isTh ? 'เขียนบันทึกประจำวัน' : 'Write Daily Journal'}
              </Text>
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
                {[
                  { id: 'reflection', label: isTh ? '💭 ทบทวนตัวเอง' : '💭 Reflection' },
                  { id: 'gratitude', label: isTh ? '🙏 ขอบคุณสิ่งดี ๆ' : '🙏 Gratitude' },
                  { id: 'wins', label: isTh ? '🏆 ความสำเร็จเล็ก ๆ' : '🏆 Small Wins' },
                ].map((c) => {
                  const active = journalCat === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? `${theme.mind}25` : theme.bgSecondary,
                          borderColor: active ? theme.mind : theme.border,
                        },
                      ]}
                      onPress={() => setJournalCat(c.id)}
                    >
                      <Text
                        style={{
                          color: active ? theme.mind : theme.textSecondary,
                          fontWeight: '800',
                          fontSize: 12,
                        }}
                      >
                        {c.label}
                      </Text>
                    </Pressable>
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

              <Pressable
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
                  ✓ {editingId ? (isTh ? 'บันทึกการแก้ไข' : 'Save Changes') : isTh ? 'บันทึกไดอารี่ (+15 XP เมื่อ ≥20 ตัวอักษร)' : 'Save Journal (+15 XP if ≥20 chars)'}
                </Text>
              </Pressable>
            </View>

            {/* Search & Past Entries */}
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                placeholder={isTh ? '🔍 ค้นหาข้อความหรือวันที่ (YYYY-MM-DD)...' : '🔍 Search journal entries...'}
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
                      onPress={() => {
                        setEditingId(j.id);
                        setJournalTitle(j.title);
                        setJournalBody(j.body);
                        setJournalCat(j.category);
                      }}
                    >
                      <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '700' }}>
                        ✏️ {isTh ? 'แก้ไข' : 'Edit'}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => deleteJournalEntry(j.id)}>
                      <Text style={{ color: theme.danger, fontSize: 12, fontWeight: '700' }}>
                        🗑️ {isTh ? 'ลบ' : 'Delete'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* 2. MOOD TRACKER */}
        {subTab === 'mood' && (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              🙂 {isTh ? 'สำรวจความรู้สึกตอนนี้ (+5 XP, สูงสุด 2 ครั้ง/วัน)' : 'Mood Check-in (+5 XP, up to 2x/day)'}
            </Text>

            <View style={styles.moodRow}>
              {MOOD_LEVELS.map((m) => {
                const active = selectedMood === m.level;
                return (
                  <Pressable
                    key={m.level}
                    style={[
                      styles.moodBtn,
                      {
                        backgroundColor: active ? `${theme.primary}25` : theme.bgSecondary,
                        borderColor: active ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => setSelectedMood(m.level)}
                  >
                    <Text style={{ fontSize: 24 }}>{m.emoji}</Text>
                    <Text
                      style={{
                        color: active ? theme.primary : theme.textSecondary,
                        fontSize: 10,
                        fontWeight: '800',
                        marginTop: 2,
                      }}
                    >
                      {isTh ? m.th : m.en}
                    </Text>
                  </Pressable>
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
                  <Pressable
                    key={tag.id}
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
                  </Pressable>
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

            <Pressable
              style={[styles.primaryBtn, { backgroundColor: theme.mind, marginTop: 12 }]}
              onPress={() => {
                logMoodEntry(selectedMood, moodNote, selectedTags);
                setMoodNote('');
              }}
            >
              <Text style={styles.primaryBtnText}>
                ✓ {isTh ? 'บันทึกอารมณ์ (+5 XP)' : 'Log Mood (+5 XP)'}
              </Text>
            </Pressable>
          </View>
        )}

        {/* 3. CALENDAR VIEW */}
        {subTab === 'calendar' && (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 10 }]}>
              🗓️ {isTh ? 'ปฏิทินการเดินทาง 14 วันล่าสุด' : '14-Day Journey Calendar'}
            </Text>

            <View style={styles.calendarGrid}>
              {last14Days.map((dk) => {
                const st = streakState.updatedLogs[dk];
                const hasJournal = db.journals.some((j) => j.entryDate === dk);
                const hasMood = db.moods.some((m) => m.dayKey === dk);
                const selected = selectedDayKey === dk;

                return (
                  <Pressable
                    key={dk}
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
                  </Pressable>
                );
              })}
            </View>

            <View
              style={[
                styles.journalCard,
                { backgroundColor: theme.bgSecondary, borderColor: theme.border, marginTop: 14 },
              ]}
            >
              <Text style={{ color: theme.primary, fontWeight: '800', fontSize: 14 }}>
                📌 {isTh ? `สรุปวันที่ ${selectedDayKey}` : `Logs on ${selectedDayKey}`}
              </Text>
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
          </View>
        )}

        {/* 4. JOURNEY RECAP (Non-Diagnostic Rule Section 6.7) */}
        {subTab === 'recap' && (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              📈 {isTh ? 'สรุปการเดินทาง (Journey Recap)' : 'Journey Recap'}
            </Text>
            <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 4, marginBottom: 12 }}>
              ℹ️ {strings.journey.recapDisclaimer}
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

            {/* Mood Distribution Bars */}
            <Text style={{ color: theme.text, fontWeight: '800', marginTop: 12, marginBottom: 8 }}>
              {isTh ? 'การกระจายอารมณ์ที่คุณเลือก:' : 'Mood Selection Distribution:'}
            </Text>
            {moodDistribution.map((m) => (
              <View key={m.level} style={styles.distRow}>
                <Text style={{ width: 90, color: theme.textSecondary, fontSize: 12 }}>
                  {m.emoji} {isTh ? m.th : m.en}
                </Text>
                <View style={[styles.distBarBg, { backgroundColor: theme.bgSecondary }]}>
                  <View
                    style={{
                      width: `${Math.min(100, m.count * 20)}%`,
                      height: '100%',
                      backgroundColor: theme.mind,
                      borderRadius: 6,
                    }}
                  />
                </View>
                <Text style={{ width: 35, textAlign: 'right', color: theme.text, fontSize: 12 }}>
                  {m.count}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    width: '22%',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  calCell: {
    width: '22.5%',
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
  distBarBg: {
    flex: 1,
    height: 10,
    borderRadius: 6,
    overflow: 'hidden',
  },
});
