import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppTheme, colors, radius, stroke } from '../../app/theme';
import {
  SegmentedTabs,
  WeeklyCollectibleCardData,
  WeeklyInkCardShowcase,
} from '../components/InkComponents';
import { useAwakened } from '../../data/repository';
import { t } from '../../l10n/translations';
import { addDaysToDayKey, getLocalDayKey } from '../../core/utils/dateUtils';
import {
  buildMonthGrid,
  formatCalendarYear,
  getMonthName,
  getWeekdayHeaders,
  parseDayKey,
  shiftMonth,
  toDayKey,
  MONTH_NAMES_TH,
  MONTH_NAMES_EN,
} from '../../core/utils/calendarUtils';
import { AppIcon, AppIconName } from '../components/AppIcons';
import {
  AnimatedCard,
  AnimatedPressable,
  AnimatedProgressBar,
  AnimatedScreenWrapper,
} from '../components/AnimatedComponents';

const MOOD_LEVELS: ReadonlyArray<{
  level: number;
  color: string;
  th: string;
  en: string;
  symbol: string;
  icon: AppIconName;
  vibeTh: string;
  vibeEn: string;
  reflectionTh: string;
  reflectionEn: string;
}> = [
  {
    level: 1,
    color: '#FFB88A',
    th: 'ล้ามาก',
    en: 'Exhausted',
    symbol: '🌧️',
    icon: 'moon',
    vibeTh: 'พลังงานต่ำ · ต้องการการพักฟื้น',
    vibeEn: 'Low battery · Needs gentle recovery',
    reflectionTh: 'ร่างกายและใจกำลังขอเวลาพัก วันนี้ลดภาระที่ไม่จำเป็นและใจดีกับตัวเองให้มากที่สุดนะ',
    reflectionEn: 'Your mind and body are asking for rest. Lower the bar today and be gentle with yourself.',
  },
  {
    level: 2,
    color: '#FFB88A',
    th: 'เหนื่อย',
    en: 'Drained',
    symbol: '🌥️',
    icon: 'water',
    vibeTh: 'อ่อนล้า · ค่อย ๆ ผ่อนจังหวะ',
    vibeEn: 'Drained · Slow down your pace',
    reflectionTh: 'ผ่านเรื่องที่ใช้พลังงานมาเยอะแล้ว ลองดื่มน้ำสักแก้ว ยืดเส้นเบา ๆ หรือพักสายตาสักครู่',
    reflectionEn: 'You have spent a lot of energy. Sip some water, stretch lightly, or rest your eyes.',
  },
  {
    level: 3,
    color: '#FFB88A',
    th: 'เฉย ๆ',
    en: 'Neutral',
    symbol: '⛅',
    icon: 'clock',
    vibeTh: 'เรื่อย ๆ · จังหวะปกติของวัน',
    vibeEn: 'Steady · Normal everyday rhythm',
    reflectionTh: 'วันที่รู้สึกธรรมดาก็เป็นส่วนหนึ่งของการเดินทาง ค่อย ๆ ทำเควสต์เล็ก ๆ ไปตามจังหวะของตัวเอง',
    reflectionEn: 'Ordinary days are part of the journey too. Take small quests at your own pace.',
  },
  {
    level: 4,
    color: '#FFB88A',
    th: 'สงบ',
    en: 'Calm',
    symbol: '🌊',
    icon: 'shield',
    vibeTh: 'นิ่งและสมดุล · มีสติอยู่กับปัจจุบัน',
    vibeEn: 'Balanced & grounded · Present',
    reflectionTh: 'จังหวะใจที่นิ่งและสงบเหมาะมากกับการโฟกัสอ่านหนังสือ วางแผน หรือพักใจเงียบ ๆ',
    reflectionEn: 'A calm and grounded state—great for mindful focus, reading, or quiet reflection.',
  },
  {
    level: 5,
    color: '#FFB88A',
    th: 'ดี',
    en: 'Good',
    symbol: '🌿',
    icon: 'check',
    vibeTh: 'ปลอดโปร่ง · พร้อมลุยเควสต์ประจำวัน',
    vibeEn: 'Clear & positive · Ready for daily quests',
    reflectionTh: 'อารมณ์อยู่ในเกณฑ์ดี ลองใช้จังหวะนี้เก็บเควสต์สำคัญของวันนี้ให้สำเร็จกัน!',
    reflectionEn: 'Good momentum! Use this steady energy to clear an important quest today.',
  },
  {
    level: 6,
    color: '#FFB88A',
    th: 'สดชื่น',
    en: 'Energetic',
    symbol: '⚡',
    icon: 'bolt',
    vibeTh: 'กระฉับกระเฉง · มีพลังโฟกัสสูง',
    vibeEn: 'Vibrant · High focus and stamina',
    reflectionTh: 'พลังงานกำลังไหลลื่น เหมาะกับการออกกำลังกายหรือลุยงานที่ต้องใช้สมาธิขั้นสูง',
    reflectionEn: 'High energy flowing! Great time for a workout or deep focus session.',
  },
  {
    level: 7,
    color: '#FFB88A',
    th: 'ยอดเยี่ยม',
    en: 'Inspired',
    symbol: '✨',
    icon: 'star',
    vibeTh: 'เปี่ยมพลังใจ · แรงบันดาลใจเต็มเปี่ยม',
    vibeEn: 'Peak inspiration · Full of life',
    reflectionTh: 'พลังใจเต็มเปี่ยม! จดจำความรู้สึกดี ๆ ในวันนี้ไว้เป็นพลังใจให้ตัวเองในวันข้างหน้านะ',
    reflectionEn: 'Peak inspiration! Capture what made today feel great so you can revisit it anytime.',
  },
];

const MOOD_TAGS: ReadonlyArray<{
  id: string;
  th: string;
  en: string;
  icon: AppIconName;
}> = [
  { id: 'rest', th: 'พักผ่อน', en: 'Rest', icon: 'moon' },
  { id: 'work', th: 'งาน', en: 'Work', icon: 'quest' },
  { id: 'study', th: 'เรียน/อ่าน', en: 'Study', icon: 'brain' },
  { id: 'sleep', th: 'การนอน', en: 'Sleep', icon: 'clock' },
  { id: 'workout', th: 'ออกกำลัง', en: 'Workout', icon: 'dumbbell' },
  { id: 'family', th: 'คนรอบข้าง', en: 'Social', icon: 'heart' },
  { id: 'meal', th: 'อาหาร/น้ำดื่ม', en: 'Nutrition', icon: 'meal' },
  { id: 'focus', th: 'สมาธิ/โฟกัส', en: 'Deep Focus', icon: 'star' },
];

const QUICK_MOOD_NOTES: ReadonlyArray<{ th: string; en: string }> = [
  { th: 'นอนหลับได้เต็มอิ่ม', en: 'Slept well last night' },
  { th: 'ทำเควสต์วันนี้สำเร็จตามเป้า', en: 'Completed today’s quests' },
  { th: 'อยากพักสายตาและผ่อนคลาย', en: 'Need some quiet rest time' },
  { th: 'ได้ขยับร่างกายแล้วสดชื่นขึ้น', en: 'Moved my body and feel refreshed' },
  { th: 'ภูมิใจในก้าวเล็ก ๆ ของวันนี้', en: 'Proud of today’s small wins' },
];

export const JourneyScreen: React.FC<{ theme: AppTheme }> = ({ theme }) => {
  const {
    db,
    todayKey,
    levelState,
    currentRank,
    todayMetrics,
    streakState,
    saveJournalEntry,
    deleteJournalEntry,
    logMoodEntry,
    deleteMoodEntry,
    recordAppEvent,
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

  // Calendar state based on user's device local time
  const todayKeyParsed = parseDayKey(todayKey);
  const [calendarYear, setCalendarYear] = useState(todayKeyParsed.year);
  const [calendarMonthIndex, setCalendarMonthIndex] = useState(todayKeyParsed.monthIndex);
  const [selectedDayKey, setSelectedDayKey] = useState(todayKey);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);

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
  const last7Days = Array.from({ length: 7 }, (_, i) =>
    addDaysToDayKey(todayKey, -(6 - i))
  );

  // Mood derived state
  const activeMoodMeta =
    MOOD_LEVELS.find((m) => m.level === selectedMood) ?? MOOD_LEVELS[3];
  const todayMoodLogs = db.moods.filter((m) => m.dayKey === todayKey);
  const distinctMoodLevelsCount = new Set(db.moods.map((m) => m.moodLevel)).size;
  const recentMoodLogs = db.moods.slice(0, 8);

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

  const weeklyCards: WeeklyCollectibleCardData[] = [
    {
      id: 'wk_hydration',
      weekLabel: 'CARD #01',
      titleTh: 'ผู้พิทักษ์หยดน้ำ',
      titleEn: 'Keeper of the Ink Drop',
      captionTh: `ดื่มน้ำวันนี้ ${todayMetrics.water_ml.toLocaleString()} ml เติมความสดชื่น`,
      captionEn: `${todayMetrics.water_ml.toLocaleString()} ml logged — steady hydration`,
      badgeText: 'VIT ✦',
      mood: 'happy',
      seed: 1,
      unlocked: todayMetrics.water_ml > 0 || db.activities.some((a) => !a.deletedAt && a.type === 'water'),
    },
    {
      id: 'wk_rest',
      weekLabel: 'CARD #02',
      titleTh: 'พักก็คือแผนอย่างหนึ่ง',
      titleEn: 'Rest Is Part of the Plan',
      captionTh: 'รู้จักพักในวันที่ร่างกายต้องการ',
      captionEn: 'Honoring recovery days without guilt',
      badgeText: 'REST ✦',
      mood: 'sleep',
      seed: 2,
      unlocked: true,
    },
    {
      id: 'wk_focus',
      weekLabel: 'CARD #03',
      titleTh: 'นักรบสมาธิเงียบ',
      titleEn: 'Silent Focus Weaver',
      captionTh: `สะสมเวลาโฟกัส ${todayMetrics.weekly_focus_min} นาทีในสัปดาห์นี้`,
      captionEn: `${todayMetrics.weekly_focus_min} focus minutes this week`,
      badgeText: 'INT ✦',
      mood: 'calm',
      seed: 3,
      unlocked: todayMetrics.weekly_focus_min > 0 || db.journals.length > 0,
    },
    {
      id: 'wk_consistency',
      weekLabel: 'CARD #04',
      titleTh: 'ก้าวเล็ก ๆ ที่ไม่หยุดเดิน',
      titleEn: 'Unbroken Small Steps',
      captionTh: `ต่อเนื่อง ${streakState.currentStreak} วัน · ทำตามจังหวะตัวเอง`,
      captionEn: `${streakState.currentStreak}-day rhythm at your own pace`,
      badgeText: 'STR/WIL',
      mood: 'proud',
      seed: 4,
      unlocked: streakState.currentStreak > 0 || db.activities.length > 0,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <SegmentedTabs
        tabs={subTabs}
        activeId={subTab}
        onSelect={(id) => {
          setSubTab(id);
          if (id === 'recap') {
            recordAppEvent('recap_viewed_total', 1);
          }
        }}
        theme={theme}
        style={{ marginHorizontal: 16, marginTop: 10 }}
      />

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
                          {j.xpAwarded > 0
                            ? isTh
                              ? `ลบ (-${j.xpAwarded} XP)`
                              : `Delete (-${j.xpAwarded} XP)`
                            : isTh
                            ? 'ลบ'
                            : 'Delete'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </AnimatedCard>
            </>
          )}

          {/* 2. MOOD TRACKER (REDESIGNED) */}
          {subTab === 'mood' && (
            <>
              {/* 2A. Mood Aura Check-in Card */}
              <AnimatedCard
                index={0}
                reduceMotion={reduceMotion}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.card,
                    borderColor: `${activeMoodMeta.color}88`,
                    borderWidth: 1.5,
                  },
                ]}
              >
                {/* Header & Status Pills */}
                <View style={styles.headerRow}>
                  <View style={styles.inlineIconRow}>
                    <AppIcon name="heart" size={18} color={activeMoodMeta.color} />
                    <Text style={[styles.cardTitle, { color: theme.text }]}>
                      {isTh ? 'สำรวจคลื่นอารมณ์ตอนนี้' : 'Mood Pulse Check-in'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.moodQuotaBadge,
                      {
                        backgroundColor: `${activeMoodMeta.color}20`,
                        borderColor: `${activeMoodMeta.color}66`,
                      },
                    ]}
                  >
                    <Text style={{ color: activeMoodMeta.color, fontSize: 11, fontWeight: '900' }}>
                      {todayMoodLogs.length < 2
                        ? isTh
                          ? '+5 XP · วันนี้ ' + todayMoodLogs.length + '/2'
                          : '+5 XP · Today ' + todayMoodLogs.length + '/2'
                        : isTh
                        ? 'ครบโควต้า XP วันนี้ (' + todayMoodLogs.length + ')'
                        : 'Daily XP Cap Reached'}
                    </Text>
                  </View>
                </View>

                {/* Distinct Mood Shades Progress (Tied to mood_variety achievement) */}
                <View style={[styles.inlineIconRow, { marginTop: 6, marginBottom: 12 }]}>
                  <AppIcon name="star" size={13} color={theme.mind} />
                  <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                    {isTh
                      ? `รู้จักเฉดอารมณ์ของตัวเองแล้ว ${distinctMoodLevelsCount}/7 ระดับ (ครบ 5 เฉดปลดล็อกถ้วยรางวัล)`
                      : `Explored ${distinctMoodLevelsCount}/7 mood shades (5+ unlocks badge)`}
                  </Text>
                </View>

                {/* Active Mood Hero Showcase */}
                <View
                  style={[
                    styles.moodHeroBanner,
                    {
                      backgroundColor: `${activeMoodMeta.color}15`,
                      borderColor: `${activeMoodMeta.color}66`,
                    },
                  ]}
                >
                  <View style={styles.moodHeroTopRow}>
                    <View
                      style={[
                        styles.moodHeroOrb,
                        {
                          backgroundColor: `${activeMoodMeta.color}28`,
                          borderColor: activeMoodMeta.color,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 24 }}>{activeMoodMeta.symbol}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.inlineIconRow}>
                        <View
                          style={[
                            styles.moodLvPill,
                            { backgroundColor: activeMoodMeta.color },
                          ]}
                        >
                          <Text style={{ color: '#0E1220', fontSize: 10, fontWeight: '900' }}>
                            LV.{activeMoodMeta.level}
                          </Text>
                        </View>
                        <Text
                          style={{
                            color: activeMoodMeta.color,
                            fontSize: 18,
                            fontWeight: '900',
                          }}
                        >
                          {isTh ? activeMoodMeta.th : activeMoodMeta.en}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: theme.text,
                          fontSize: 12,
                          fontWeight: '700',
                          marginTop: 2,
                        }}
                      >
                        {isTh ? activeMoodMeta.vibeTh : activeMoodMeta.vibeEn}
                      </Text>
                    </View>
                  </View>

                  {/* 7-Segment Energy Resonance Bar */}
                  <View style={styles.moodResonanceRow}>
                    {MOOD_LEVELS.map((seg) => {
                      const lit = seg.level <= activeMoodMeta.level;
                      return (
                        <View
                          key={seg.level}
                          style={[
                            styles.moodResonanceSeg,
                            {
                              backgroundColor: lit
                                ? activeMoodMeta.color
                                : `${theme.border}88`,
                              opacity: lit ? 1 : 0.4,
                            },
                          ]}
                        />
                      );
                    })}
                  </View>

                  <Text
                    style={{
                      color: theme.textSecondary,
                      fontSize: 12,
                      lineHeight: 18,
                      marginTop: 8,
                    }}
                  >
                    {isTh ? activeMoodMeta.reflectionTh : activeMoodMeta.reflectionEn}
                  </Text>
                </View>

                {/* Continuous 7-Step Spectrum Strip */}
                <Text
                  style={{
                    color: theme.textSecondary,
                    fontSize: 12,
                    fontWeight: '700',
                    marginTop: 14,
                    marginBottom: 8,
                  }}
                >
                  {isTh ? 'เลือกระดับความรู้สึก (1 = ล้ามาก → 7 = ยอดเยี่ยม):' : 'Select Mood Level (1 → 7):'}
                </Text>

                <View
                  style={[
                    styles.spectrumStrip,
                    { backgroundColor: theme.bgSecondary, borderColor: theme.border },
                  ]}
                >
                  {MOOD_LEVELS.map((m) => {
                    const active = selectedMood === m.level;
                    return (
                      <Pressable
                        key={m.level}
                        style={[
                          styles.spectrumStep,
                          active && {
                            backgroundColor: `${m.color}30`,
                            borderColor: m.color,
                          },
                        ]}
                        onPress={() => setSelectedMood(m.level)}
                      >
                        <View
                          style={[
                            styles.spectrumDot,
                            {
                              backgroundColor: active ? m.color : `${m.color}55`,
                              transform: [{ scale: active ? 1.18 : 1 }],
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: active ? '#0E1220' : theme.text,
                              fontWeight: '900',
                              fontSize: 11,
                            }}
                          >
                            {m.level}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Symmetrical 3x2 Grid for Levels 1-6 + Featured Apex Card for Level 7 */}
                <View style={styles.moodGrid}>
                  {MOOD_LEVELS.slice(0, 6).map((m) => {
                    const active = selectedMood === m.level;
                    return (
                      <AnimatedPressable
                        key={m.level}
                        reduceMotion={reduceMotion}
                        style={[
                          styles.moodCardTile,
                          {
                            backgroundColor: active ? `${m.color}22` : theme.bgSecondary,
                            borderColor: active ? m.color : theme.border,
                            borderWidth: active ? 1.5 : 1,
                          },
                        ]}
                        onPress={() => setSelectedMood(m.level)}
                      >
                        <View style={styles.moodCardHeader}>
                          <Text style={{ fontSize: 16 }}>{m.symbol}</Text>
                          <View
                            style={[
                              styles.moodBadgeCircle,
                              {
                                backgroundColor: active ? m.color : `${m.color}24`,
                                borderColor: m.color,
                              },
                            ]}
                          >
                            <Text
                              style={{
                                color: active ? '#0E1220' : m.color,
                                fontWeight: '900',
                                fontSize: 11,
                              }}
                            >
                              {m.level}
                            </Text>
                          </View>
                        </View>
                        <Text
                          numberOfLines={1}
                          ellipsizeMode="tail"
                          style={{
                            color: active ? m.color : theme.text,
                            fontSize: 12,
                            fontWeight: '900',
                            marginTop: 4,
                          }}
                        >
                          {isTh ? m.th : m.en}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={{
                            color: theme.textMuted,
                            fontSize: 10,
                            marginTop: 2,
                          }}
                        >
                          {isTh ? m.en : `Level ${m.level}`}
                        </Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>

                {/* Featured Full-Width Apex Card for Level 7 (Inspired) */}
                {(() => {
                  const m7 = MOOD_LEVELS[6];
                  const active = selectedMood === m7.level;
                  return (
                    <AnimatedPressable
                      reduceMotion={reduceMotion}
                      style={[
                        styles.moodApexCard,
                        {
                          backgroundColor: active ? `${m7.color}24` : theme.bgSecondary,
                          borderColor: active ? m7.color : theme.border,
                          borderWidth: active ? 1.5 : 1,
                        },
                      ]}
                      onPress={() => setSelectedMood(m7.level)}
                    >
                      <View style={styles.inlineIconRow}>
                        <Text style={{ fontSize: 20 }}>{m7.symbol}</Text>
                        <View>
                          <Text
                            style={{
                              color: active ? m7.color : theme.text,
                              fontSize: 14,
                              fontWeight: '900',
                            }}
                          >
                            Lv.7 {isTh ? `${m7.th} (${m7.en})` : m7.en}
                          </Text>
                          <Text style={{ color: theme.textSecondary, fontSize: 11 }}>
                            {isTh ? m7.vibeTh : m7.vibeEn}
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.moodBadgeCircle,
                          {
                            backgroundColor: active ? m7.color : `${m7.color}25`,
                            borderColor: m7.color,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: active ? '#0E1220' : m7.color,
                            fontWeight: '900',
                            fontSize: 12,
                          }}
                        >
                          7
                        </Text>
                      </View>
                    </AnimatedPressable>
                  );
                })()}

                {/* Context Tags with Icons */}
                <Text
                  style={{
                    color: theme.textSecondary,
                    fontSize: 12,
                    fontWeight: '700',
                    marginTop: 14,
                    marginBottom: 8,
                  }}
                >
                  {isTh ? 'บริบทที่ส่งผลต่อความรู้สึกตอนนี้:' : 'What is influencing your mood?'}
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
                            backgroundColor: active
                              ? `${activeMoodMeta.color}24`
                              : theme.bgSecondary,
                            borderColor: active ? activeMoodMeta.color : theme.border,
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
                        <View style={styles.inlineIconRow}>
                          <AppIcon
                            name={tag.icon}
                            size={12}
                            color={active ? activeMoodMeta.color : theme.textSecondary}
                          />
                          <Text
                            style={{
                              color: active ? activeMoodMeta.color : theme.textSecondary,
                              fontSize: 12,
                              fontWeight: '800',
                            }}
                          >
                            {isTh ? tag.th : tag.en}
                          </Text>
                        </View>
                      </AnimatedPressable>
                    );
                  })}
                </View>

                {/* Quick Note Prompts */}
                <Text
                  style={{
                    color: theme.textSecondary,
                    fontSize: 12,
                    fontWeight: '700',
                    marginTop: 14,
                    marginBottom: 6,
                  }}
                >
                  {isTh ? 'ประโยคบันทึกไว (แตะเพื่อเติมข้อความ):' : 'Quick reflection prompts:'}
                </Text>
                <View style={styles.chipRow}>
                  {QUICK_MOOD_NOTES.map((prompt, idx) => {
                    const text = isTh ? prompt.th : prompt.en;
                    return (
                      <Pressable
                        key={idx}
                        style={[
                          styles.quickPromptChip,
                          {
                            backgroundColor: theme.bgSecondary,
                            borderColor: theme.border,
                          },
                        ]}
                        onPress={() =>
                          setMoodNote((prev) =>
                            prev.trim() ? `${prev.trim()} · ${text}` : text
                          )
                        }
                      >
                        <Text style={{ color: theme.textSecondary, fontSize: 11 }}>
                          + {text}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <TextInput
                  value={moodNote}
                  onChangeText={setMoodNote}
                  placeholder={
                    isTh
                      ? 'บันทึกความรู้สึกหรือสิ่งเล็ก ๆ ที่อยากบอกตัวเอง (ไม่บังคับ)...'
                      : 'Write a short note to yourself (optional)...'
                  }
                  placeholderTextColor={theme.textMuted}
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.bgSecondary,
                      color: theme.text,
                      borderColor: theme.border,
                      marginTop: 10,
                    },
                  ]}
                />

                <AnimatedPressable
                  reduceMotion={reduceMotion}
                  style={[
                    styles.primaryBtn,
                    { backgroundColor: activeMoodMeta.color, marginTop: 14 },
                  ]}
                  onPress={() => {
                    logMoodEntry(selectedMood, moodNote, selectedTags);
                    setMoodNote('');
                  }}
                >
                  <Text style={styles.primaryBtnText}>
                    {isTh
                      ? `บันทึกอารมณ์ "${activeMoodMeta.th}" (${todayMoodLogs.length < 2 ? '+5 XP' : 'บันทึกเพิ่ม'})`
                      : `Log "${activeMoodMeta.en}" Mood (${todayMoodLogs.length < 2 ? '+5 XP' : 'Save'})`}
                  </Text>
                </AnimatedPressable>
              </AnimatedCard>

              {/* 2B. 7-Day Mood Rhythm Wave Card */}
              <AnimatedCard
                index={1}
                reduceMotion={reduceMotion}
                style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <View style={styles.headerRow}>
                  <View style={styles.inlineIconRow}>
                    <AppIcon name="activity" size={18} color={theme.mind} />
                    <Text style={[styles.cardTitle, { color: theme.text }]}>
                      {isTh ? 'คลื่นอารมณ์ 7 วันล่าสุด' : '7-Day Mood Rhythm'}
                    </Text>
                  </View>
                  <Text style={{ color: theme.textMuted, fontSize: 11 }}>
                    {isTh ? 'ทั้งหมด ' + db.moods.length + ' ครั้ง' : db.moods.length + ' total logs'}
                  </Text>
                </View>

                <View style={styles.moodWaveChart}>
                  {last7Days.map((dk) => {
                    const dayMoods = db.moods.filter((m) => m.dayKey === dk);
                    const latestMood = dayMoods[0];
                    const lvl = latestMood?.moodLevel ?? 0;
                    const meta = MOOD_LEVELS.find((m) => m.level === lvl);
                    const barHeightPct = lvl > 0 ? Math.max(18, Math.round((lvl / 7) * 100)) : 10;
                    const isToday = dk === todayKey;

                    return (
                      <View key={dk} style={styles.moodWaveCol}>
                        <Text
                          style={{
                            color: meta ? meta.color : theme.textMuted,
                            fontSize: 11,
                            fontWeight: '800',
                            marginBottom: 4,
                          }}
                        >
                          {meta ? `${meta.symbol}${lvl}` : '—'}
                        </Text>
                        <View
                          style={[
                            styles.moodWaveTrack,
                            {
                              backgroundColor: theme.bgSecondary,
                              borderColor: isToday ? theme.primary : theme.border,
                            },
                          ]}
                        >
                          <View
                            style={{
                              width: '100%',
                              height: `${barHeightPct}%`,
                              backgroundColor: meta ? meta.color : `${theme.border}55`,
                              borderRadius: 6,
                            }}
                          />
                        </View>
                        <Text
                          style={{
                            color: isToday ? theme.primary : theme.textSecondary,
                            fontSize: 10,
                            fontWeight: isToday ? '900' : '600',
                            marginTop: 5,
                          }}
                        >
                          {isToday ? (isTh ? 'วันนี้' : 'Today') : dk.slice(5)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </AnimatedCard>

              {/* 2C. Recent Mood History Feed */}
              <AnimatedCard
                index={2}
                reduceMotion={reduceMotion}
                style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <View style={[styles.inlineIconRow, { marginBottom: 10 }]}>
                  <AppIcon name="clock" size={18} color={theme.primary} />
                  <Text style={[styles.cardTitle, { color: theme.text }]}>
                    {isTh ? 'ประวัติการสำรวจความรู้สึก' : 'Recent Mood Logs'}
                  </Text>
                </View>

                {recentMoodLogs.length === 0 ? (
                  <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                    {isTh
                      ? 'ยังไม่มีประวัติการบันทึกอารมณ์ ลองเลือกอารมณ์ด้านบนแล้วกดบันทึกได้เลย!'
                      : 'No mood logs yet. Select your mood above to start tracking!'}
                  </Text>
                ) : (
                  recentMoodLogs.map((entry) => {
                    const meta =
                      MOOD_LEVELS.find((m) => m.level === entry.moodLevel) ?? MOOD_LEVELS[3];
                    const timeStr = new Date(entry.occurredAt).toTimeString().slice(0, 5);
                    return (
                      <View
                        key={entry.id}
                        style={[
                          styles.moodHistoryCard,
                          {
                            backgroundColor: theme.bgSecondary,
                            borderColor: `${meta.color}44`,
                          },
                        ]}
                      >
                        <View style={styles.headerRow}>
                          <View style={styles.inlineIconRow}>
                            <View
                              style={[
                                styles.moodBadgeCircle,
                                {
                                  backgroundColor: `${meta.color}25`,
                                  borderColor: meta.color,
                                },
                              ]}
                            >
                              <Text style={{ fontSize: 13 }}>{meta.symbol}</Text>
                            </View>
                            <View>
                              <Text
                                style={{
                                  color: meta.color,
                                  fontWeight: '900',
                                  fontSize: 13,
                                }}
                              >
                                Lv.{meta.level} {isTh ? meta.th : meta.en}
                              </Text>
                              <Text style={{ color: theme.textMuted, fontSize: 11 }}>
                                {entry.dayKey} {timeStr ? `· ${timeStr}` : ''}
                              </Text>
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            {entry.xpAwarded > 0 && (
                              <Text
                                style={{
                                  color: theme.success,
                                  fontSize: 11,
                                  fontWeight: '800',
                                }}
                              >
                                +{entry.xpAwarded} XP
                              </Text>
                            )}
                            <Pressable
                              onPress={() => deleteMoodEntry(entry.id)}
                              style={{
                                paddingHorizontal: 6,
                                paddingVertical: 3,
                                borderRadius: 6,
                                borderWidth: 1,
                                borderColor: theme.danger,
                              }}
                            >
                              <Text style={{ color: theme.danger, fontSize: 10, fontWeight: '800' }}>
                                {entry.xpAwarded > 0
                                  ? isTh
                                    ? `ลบ (-${entry.xpAwarded} XP)`
                                    : `Del (-${entry.xpAwarded} XP)`
                                  : isTh
                                  ? 'ลบ'
                                  : 'Del'}
                              </Text>
                            </Pressable>
                          </View>
                        </View>

                        {entry.tags.length > 0 && (
                          <View style={[styles.chipRow, { marginTop: 8 }]}>
                            {entry.tags.map((tId) => {
                              const tagObj = MOOD_TAGS.find((mt) => mt.id === tId);
                              return (
                                <View
                                  key={tId}
                                  style={[
                                    styles.historyTagPill,
                                    {
                                      backgroundColor: `${meta.color}18`,
                                      borderColor: `${meta.color}44`,
                                    },
                                  ]}
                                >
                                  <Text
                                    style={{
                                      color: meta.color,
                                      fontSize: 10,
                                      fontWeight: '800',
                                    }}
                                  >
                                    #{tagObj ? (isTh ? tagObj.th : tagObj.en) : tId}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                        )}

                        {Boolean(entry.note) && (
                          <Text
                            style={{
                              color: theme.textSecondary,
                              fontSize: 12,
                              marginTop: 6,
                              lineHeight: 17,
                            }}
                          >
                            “{entry.note}”
                          </Text>
                        )}
                      </View>
                    );
                  })
                )}
              </AnimatedCard>
            </>
          )}

          {/* 3. CALENDAR VIEW (Standard Month & Year Picker based on device time) */}
          {subTab === 'calendar' && (() => {
            const monthWeeks = buildMonthGrid(calendarYear, calendarMonthIndex, db.profile.weekStartDay);
            const weekdayHeaders = getWeekdayHeaders(db.profile.weekStartDay, isTh);
            const selectedActivities = db.activities.filter(
              (a) => !a.deletedAt && getLocalDayKey(a.occurredAt, a.tzOffsetMin) === selectedDayKey
            );
            const selectedJournals = db.journals.filter((j) => j.entryDate === selectedDayKey);
            const selectedMoods = db.moods.filter((m) => m.dayKey === selectedDayKey);
            const selectedStreak = streakState.updatedLogs[selectedDayKey];
            const isSelectedToday = selectedDayKey === todayKey;

            return (
              <AnimatedCard
                index={0}
                reduceMotion={reduceMotion}
                style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                {/* Month & Year Navigation Header */}
                <View style={styles.calendarNavHeader}>
                  <AnimatedPressable
                    reduceMotion={reduceMotion}
                    style={[styles.monthNavBtn, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}
                    onPress={() => {
                      const next = shiftMonth(calendarYear, calendarMonthIndex, -1);
                      setCalendarYear(next.year);
                      setCalendarMonthIndex(next.monthIndex);
                    }}
                  >
                    <Text style={{ color: theme.text, fontSize: 16, fontWeight: '900' }}>‹</Text>
                  </AnimatedPressable>

                  <AnimatedPressable
                    reduceMotion={reduceMotion}
                    style={[styles.monthTitleBtn, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}
                    onPress={() => setShowCalendarPicker(!showCalendarPicker)}
                  >
                    <View style={styles.inlineIconRow}>
                      <AppIcon name="calendar" size={15} color={theme.primary} />
                      <Text style={{ color: theme.text, fontSize: 15, fontWeight: '900' }}>
                        {getMonthName(calendarMonthIndex, isTh)} {formatCalendarYear(calendarYear, isTh)}
                      </Text>
                      <Text style={{ color: theme.textMuted, fontSize: 11 }}>▼</Text>
                    </View>
                  </AnimatedPressable>

                  <AnimatedPressable
                    reduceMotion={reduceMotion}
                    style={[styles.monthNavBtn, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}
                    onPress={() => {
                      const next = shiftMonth(calendarYear, calendarMonthIndex, 1);
                      setCalendarYear(next.year);
                      setCalendarMonthIndex(next.monthIndex);
                    }}
                  >
                    <Text style={{ color: theme.text, fontSize: 16, fontWeight: '900' }}>›</Text>
                  </AnimatedPressable>

                  <AnimatedPressable
                    reduceMotion={reduceMotion}
                    style={[
                      styles.todayJumpBtn,
                      {
                        backgroundColor: `${theme.primary}22`,
                        borderColor: theme.primary,
                      },
                    ]}
                    onPress={() => {
                      setCalendarYear(todayKeyParsed.year);
                      setCalendarMonthIndex(todayKeyParsed.monthIndex);
                      setSelectedDayKey(todayKey);
                    }}
                  >
                    <Text style={{ color: theme.primary, fontSize: 11, fontWeight: '800' }}>
                      {isTh ? 'วันนี้' : 'Today'}
                    </Text>
                  </AnimatedPressable>
                </View>

                {/* Quick Month & Year Picker Drawer */}
                {showCalendarPicker && (
                  <View style={[styles.calendarPickerBox, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
                    <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '800', marginBottom: 6 }}>
                      {isTh ? 'เลือกปี:' : 'Select Year:'}
                    </Text>
                    <View style={styles.chipRow}>
                      {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => {
                        const active = calendarYear === y;
                        return (
                          <Pressable
                            key={y}
                            style={[
                              styles.calendarYearChip,
                              {
                                backgroundColor: active ? theme.primary : theme.card,
                                borderColor: active ? theme.primary : theme.border,
                              },
                            ]}
                            onPress={() => setCalendarYear(y)}
                          >
                            <Text style={{ color: active ? '#0E1220' : theme.text, fontSize: 11, fontWeight: '800' }}>
                              {formatCalendarYear(y, isTh)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '800', marginTop: 10, marginBottom: 6 }}>
                      {isTh ? 'เลือกเดือน:' : 'Select Month:'}
                    </Text>
                    <View style={styles.calendarMonthGrid}>
                      {Array.from({ length: 12 }, (_, i) => {
                        const active = calendarMonthIndex === i;
                        return (
                          <Pressable
                            key={i}
                            style={[
                              styles.calendarMonthChip,
                              {
                                backgroundColor: active ? theme.primary : theme.card,
                                borderColor: active ? theme.primary : theme.border,
                              },
                            ]}
                            onPress={() => {
                              setCalendarMonthIndex(i);
                              setShowCalendarPicker(false);
                            }}
                          >
                            <Text style={{ color: active ? '#0E1220' : theme.text, fontSize: 11, fontWeight: '800' }}>
                              {getMonthName(i, isTh, true)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* 7-Column Weekday Headers */}
                <View style={styles.weekdayHeaderRow}>
                  {weekdayHeaders.map((header, idx) => (
                    <View key={idx} style={styles.weekdayHeaderCell}>
                      <Text style={{ color: idx >= 5 ? theme.workout : theme.textMuted, fontSize: 11, fontWeight: '800' }}>
                        {header}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Month Weeks Grid — Peach Circle for Active Day, Bordered White Circle with Special Mark for Rest Day */}
                <View style={styles.monthCalendarGrid}>
                  {monthWeeks.map((week, wIdx) => (
                    <View key={wIdx} style={styles.monthCalendarRow}>
                      {week.map((dk, cIdx) => {
                        if (!dk) {
                          return <View key={`empty-${cIdx}`} style={styles.monthCalendarEmptyCell} />;
                        }
                        const parsed = parseDayKey(dk);
                        const isSelected = selectedDayKey === dk;
                        const isToday = todayKey === dk;
                        const st = streakState.updatedLogs[dk];
                        const hasJournal = db.journals.some((j) => j.entryDate === dk);
                        const hasMood = db.moods.some((m) => m.dayKey === dk);
                        const hasActivity = db.activities.some((a) => !a.deletedAt && getLocalDayKey(a.occurredAt, a.tzOffsetMin) === dk);
                        const isActiveDay = st === 'active' || hasActivity || hasJournal || hasMood;
                        const isRestDay = st === 'rest' || (isToday && db.profile.restModeToday === todayKey);

                        const circleBg = isActiveDay
                          ? colors.peach
                          : isRestDay
                          ? colors.peachSoft
                          : isSelected
                          ? `${colors.peach}45`
                          : theme.bgSecondary;

                        return (
                          <Pressable
                            key={dk}
                            style={[
                              styles.monthCalendarCell,
                              {
                                backgroundColor: circleBg,
                                borderColor:
                                  isSelected || isToday || isActiveDay || isRestDay
                                    ? colors.ink
                                    : theme.border,
                                borderWidth:
                                  isSelected || isToday || isActiveDay || isRestDay
                                    ? stroke
                                    : 1.5,
                                borderStyle: isRestDay && !isActiveDay ? 'dashed' : 'solid',
                              },
                            ]}
                            onPress={() => setSelectedDayKey(dk)}
                          >
                            <Text
                              style={{
                                color:
                                  isActiveDay || isRestDay
                                    ? colors.ink
                                    : theme.text,
                                fontSize: 12,
                                fontWeight:
                                  isSelected || isToday || isActiveDay || isRestDay
                                    ? '900'
                                    : '700',
                              }}
                            >
                              {parsed.day}
                            </Text>
                            {isRestDay && !isActiveDay ? (
                              <Text
                                style={{
                                  color: colors.ink,
                                  fontSize: 7.5,
                                  fontWeight: '900',
                                  marginTop: -2,
                                }}
                              >
                                พัก✦
                              </Text>
                            ) : isActiveDay ? (
                              <Text
                                style={{
                                  color: colors.ink,
                                  fontSize: 7.5,
                                  fontWeight: '900',
                                  marginTop: -2,
                                }}
                              >
                                ●
                              </Text>
                            ) : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}
                </View>

                {/* Circle Indicators Legend (Section 3: วันที่ทำเควสต์ = วงกลมพีช, วันพัก = วงกลมขอบดำพื้นพีชอ่อนมีเครื่องหมายพิเศษ) */}
                <View style={styles.calendarLegendRow}>
                  <View style={styles.legendItem}>
                    <View
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 7,
                        backgroundColor: colors.peach,
                        borderWidth: 2,
                        borderColor: colors.ink,
                      }}
                    />
                    <Text style={{ color: theme.text, fontSize: 11, fontWeight: '800' }}>
                      {isTh ? 'วันที่มีกิจกรรม / ทำเควสต์' : 'Active / Quest Done'}
                    </Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 7,
                        backgroundColor: colors.peachSoft,
                        borderWidth: 2,
                        borderColor: colors.ink,
                      }}
                    />
                    <Text style={{ color: theme.text, fontSize: 11, fontWeight: '800' }}>
                      {isTh ? 'วันพัก (พัก✦ ไม่นับเป็นวันขาด)' : 'Rest Day (Counts for Streak)'}
                    </Text>
                  </View>
                </View>

                {/* Selected Day Details Card */}
                <View
                  style={[
                    styles.selectedDayDetailBox,
                    {
                      backgroundColor: theme.bgSecondary,
                      borderColor: isSelectedToday ? theme.primary : theme.border,
                      borderWidth: 1.5,
                      marginTop: 12,
                    },
                  ]}
                >
                  <View style={styles.headerRow}>
                    <View style={styles.inlineIconRow}>
                      <AppIcon name="calendar" size={15} color={theme.primary} />
                      <Text style={{ color: theme.text, fontSize: 14, fontWeight: '900' }}>
                        {selectedDayKey} {isSelectedToday ? (isTh ? '(วันนี้)' : '(Today)') : ''}
                      </Text>
                    </View>
                    {selectedStreak && (
                      <View
                        style={[
                          styles.streakTagBadge,
                          {
                            backgroundColor:
                              selectedStreak === 'active' ? `${theme.success}25` : `${theme.primary}25`,
                            borderColor: selectedStreak === 'active' ? theme.success : theme.primary,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: selectedStreak === 'active' ? theme.success : theme.primary,
                            fontSize: 10,
                            fontWeight: '900',
                          }}
                        >
                          {selectedStreak === 'active'
                            ? isTh
                              ? '✓ สำเร็จ'
                              : '✓ Completed'
                            : isTh
                            ? 'พักผ่อน'
                            : 'Rest Day'}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <View style={{ flex: 1, backgroundColor: `${theme.border}33`, padding: 8, borderRadius: 8 }}>
                      <Text style={{ color: theme.textMuted, fontSize: 10 }}>{isTh ? 'กิจกรรม' : 'Activities'}</Text>
                      <Text style={{ color: theme.text, fontSize: 13, fontWeight: '800', marginTop: 2 }}>
                        {selectedActivities.length} {isTh ? 'รายการ' : 'logs'}
                      </Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: `${theme.mind}18`, padding: 8, borderRadius: 8 }}>
                      <Text style={{ color: theme.textMuted, fontSize: 10 }}>{isTh ? 'ไดอารี่' : 'Journals'}</Text>
                      <Text style={{ color: theme.mind, fontSize: 13, fontWeight: '800', marginTop: 2 }}>
                        {selectedJournals.length} {isTh ? 'บันทึก' : 'entries'}
                      </Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: `${theme.warning}18`, padding: 8, borderRadius: 8 }}>
                      <Text style={{ color: theme.textMuted, fontSize: 10 }}>{isTh ? 'อารมณ์' : 'Moods'}</Text>
                      <Text style={{ color: theme.warning, fontSize: 13, fontWeight: '800', marginTop: 2 }}>
                        {selectedMoods.length} {isTh ? 'ครั้ง' : 'logs'}
                      </Text>
                    </View>
                  </View>

                  {/* Journal Excerpts for Selected Day */}
                  {selectedJournals.length > 0 && (
                    <View style={{ marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: `${theme.border}44` }}>
                      {selectedJournals.map((j) => (
                        <Text key={j.id} numberOfLines={1} style={{ color: theme.mind, fontSize: 11, marginTop: 2 }}>
                          📖 {j.title || j.body.slice(0, 30)}
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Mood Logs for Selected Day */}
                  {selectedMoods.length > 0 && (
                    <View style={{ marginTop: 4 }}>
                      {selectedMoods.map((m) => {
                        const meta = MOOD_LEVELS.find((ml) => ml.level === m.moodLevel) ?? MOOD_LEVELS[3];
                        return (
                          <Text key={m.id} numberOfLines={1} style={{ color: meta.color, fontSize: 11, marginTop: 2 }}>
                            {meta.symbol} Lv.{m.moodLevel} {isTh ? meta.th : meta.en} {m.note ? `— "${m.note}"` : ''}
                          </Text>
                        );
                      })}
                    </View>
                  )}
                </View>
              </AnimatedCard>
            );
          })()}

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

              {/* Section 4.4: สรุปรายสัปดาห์แบบการ์ดสะสม (Weekly Collectible Ink Cards) */}
              <View style={{ marginTop: 16, paddingTop: 14, borderTopWidth: 2, borderTopColor: colors.line }}>
                <WeeklyInkCardShowcase
                  cards={weeklyCards}
                  rankId={currentRank.id}
                  level={levelState.level}
                  isTh={isTh}
                  theme={theme}
                />
              </View>
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
    borderRadius: radius.card,
    borderWidth: stroke,
    borderBottomWidth: stroke + 2.5,
    borderRightWidth: stroke + 2.5,
    padding: 15,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.chip,
    borderWidth: 2,
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.input,
    borderWidth: stroke,
    fontSize: 14,
    fontWeight: '700',
  },
  textArea: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.input,
    borderWidth: stroke,
    fontSize: 14,
    fontWeight: '700',
    minHeight: 96,
    textAlignVertical: 'top',
  },
  primaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.chip,
    borderWidth: stroke,
    borderBottomWidth: stroke + 2,
    borderRightWidth: stroke + 2,
    borderColor: colors.ink,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: colors.ink,
    fontWeight: '900',
    fontSize: 13,
  },
  journalCard: {
    padding: 12,
    borderRadius: 16,
    borderWidth: stroke,
    borderBottomWidth: stroke + 2,
    borderRightWidth: stroke + 2,
    marginBottom: 8,
  },
  moodQuotaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  moodHeroBanner: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  moodHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  moodHeroOrb: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodLvPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  moodResonanceRow: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 10,
  },
  moodResonanceSeg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  spectrumStrip: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 5,
    gap: 4,
  },
  spectrumStep: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spectrumDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
    marginTop: 10,
  },
  moodCardTile: {
    width: '31.5%',
    minHeight: 76,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
  },
  moodCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moodApexCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  moodBadgeCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickPromptChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  moodWaveChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 12,
    paddingTop: 6,
    gap: 6,
  },
  moodWaveCol: {
    flex: 1,
    alignItems: 'center',
  },
  moodWaveTrack: {
    width: '100%',
    height: 84,
    borderRadius: 8,
    borderWidth: 1,
    padding: 3,
    justifyContent: 'flex-end',
  },
  moodHistoryCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  historyTagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
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
  calendarNavHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 6,
  },
  monthNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitleBtn: {
    flex: 1,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayJumpBtn: {
    paddingHorizontal: 10,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarPickerBox: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  calendarYearChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  calendarMonthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  calendarMonthChip: {
    width: '23%',
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  weekdayHeaderRow: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#FFFFFF15',
  },
  weekdayHeaderCell: {
    flex: 1,
    alignItems: 'center',
  },
  monthCalendarGrid: {
    gap: 4,
  },
  monthCalendarRow: {
    flexDirection: 'row',
    gap: 4,
  },
  monthCalendarEmptyCell: {
    flex: 1,
    height: 44,
  },
  monthCalendarCell: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  calendarDotRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
    height: 5,
    alignItems: 'center',
  },
  calDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  calendarLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FFFFFF10',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectedDayDetailBox: {
    padding: 12,
    borderRadius: 12,
  },
  streakTagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
});
