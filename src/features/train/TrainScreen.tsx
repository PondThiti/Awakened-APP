import React, { useEffect, useState } from 'react';
import {
  NativeModules,
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
import {
  TrainingDayType,
  WorkoutSetItem,
  WorkoutType,
} from '../../core/engine/types';
import {
  addDaysToDayKey,
  formatDurationMMSS,
  getLocalDayKey,
  getWeekdayOneBased,
} from '../../core/utils/dateUtils';
import { playSystemFeedback } from '../../services/soundService';
import { AppIcon, AppIconName } from '../components/AppIcons';
import {
  AnimatedBarColumn,
  AnimatedCard,
  AnimatedNumberText,
  AnimatedPressable,
  AnimatedPulseView,
  AnimatedScreenWrapper,
} from '../components/AnimatedComponents';

interface ExerciseItem {
  id: string;
  en: string;
  th: string;
}

const EXERCISES: ExerciseItem[] = [
  { id: 'Push-up', en: 'Push-up', th: 'วิดพื้น' },
  { id: 'Sit-up', en: 'Sit-up', th: 'ซิทอัพ' },
  { id: 'Squat', en: 'Squat', th: 'สควอท' },
  { id: 'Plank (sec)', en: 'Plank (sec)', th: 'แพลงก์ (วินาที)' },
  { id: 'Lunges', en: 'Lunges', th: 'ก้าวขาย่อ' },
  { id: 'Pull-up', en: 'Pull-up', th: 'ดึงข้อ' },
  { id: 'Burpee', en: 'Burpee', th: 'เบอร์ปี' },
  { id: 'Jumping Jacks', en: 'Jumping Jacks', th: 'กระโดดตบ' },
];

function getExerciseDisplayName(exerciseId: string, isTh: boolean): string {
  const match = EXERCISES.find((e) => e.id.toLowerCase() === exerciseId.toLowerCase());
  if (match) {
    return isTh ? `${match.th} (${match.en})` : match.en;
  }
  return exerciseId;
}

export const TrainScreen: React.FC<{ theme: AppTheme }> = ({ theme }) => {
  // Keep screen awake during workouts & timers (Section 6.5)
  useEffect(() => {
    try {
      NativeModules?.AwakenedNative?.setKeepScreenOn?.(true);
    } catch {
      // Ignore if unavailable
    }
    return () => {
      try {
        NativeModules?.AwakenedNative?.setKeepScreenOn?.(false);
      } catch {
        // Ignore if unavailable
      }
    };
  }, []);

  const {
    db,
    todayKey,
    logWorkout,
    logPomodoro,
    logRestDayCheckin,
    updateTrainingPlanDay,
    applyTrainingPreset,
    setPomodoroTimerState,
    setWorkoutTimerState,
  } = useAwakened();

  const [subTab, setSubTab] = useState<'reps' | 'timer' | 'pomodoro' | 'plan' | 'history'>('reps');
  const lang = db.profile.language;
  const strings = t(lang);
  const isTh = lang === 'th';
  const reduceMotion = db.profile.reduceEffects;

  // 1. Rep Counter state
  const [selectedExercise, setSelectedExercise] = useState('Push-up');
  const [customExercise, setCustomExercise] = useState('');
  const [currentReps, setCurrentReps] = useState(12);
  const [loggedSets, setLoggedSets] = useState<WorkoutSetItem[]>([]);
  const [restCountdownSec, setRestCountdownSec] = useState(0);
  const [feelingRating, setFeelingRating] = useState(4);

  // Rest countdown effect
  useEffect(() => {
    if (restCountdownSec <= 0) return;
    const id = setInterval(() => {
      setRestCountdownSec((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [restCountdownSec]);

  // 2. Timestamp-based Workout Timer (Section 6.5)
  const [workoutType, setWorkoutType] = useState<WorkoutType>('walk');
  const [distanceKmInput, setDistanceKmInput] = useState('');
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const wTimer = db.activeWorkoutTimer;
  const workoutElapsedSec = wTimer
    ? wTimer.accumulatedSec +
      (wTimer.isRunning && wTimer.startedAtMs
        ? Math.floor((Date.now() - wTimer.startedAtMs) / 1000)
        : 0)
    : 0;

  // 3. Timestamp-based Pomodoro Timer (Section 6.6)
  const [pomoTaskName, setPomoTaskName] = useState('');
  const [pomoFocusMin, setPomoFocusMin] = useState(25);
  const pTimer = db.activePomodoroTimer;
  const pomoElapsedSec = pTimer
    ? pTimer.accumulatedSec +
      (pTimer.isRunning && pTimer.startedAtMs
        ? Math.floor((Date.now() - pTimer.startedAtMs) / 1000)
        : 0)
    : 0;
  const pomoRemainingSec = pTimer
    ? Math.max(0, pTimer.targetSec - pomoElapsedSec)
    : pomoFocusMin * 60;

  const last7Days = Array.from({ length: 7 }, (_, i) =>
    addDaysToDayKey(todayKey, -(6 - i))
  );

  const subTabs: ReadonlyArray<{
    id: 'reps' | 'timer' | 'pomodoro' | 'plan' | 'history';
    icon: AppIconName;
    label: string;
  }> = [
    { id: 'reps', icon: 'dumbbell', label: strings.train.repCounterTab },
    { id: 'timer', icon: 'clock', label: strings.train.timerTab },
    { id: 'pomodoro', icon: 'quest', label: strings.train.pomodoroTab },
    { id: 'plan', icon: 'calendar', label: strings.train.planTab },
    { id: 'history', icon: 'chart', label: strings.train.historyTab },
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
                  size={13}
                  color={active ? theme.primary : theme.textSecondary}
                />
                <Text
                  style={{
                    color: active ? theme.primary : theme.textSecondary,
                    fontWeight: '800',
                    fontSize: 11,
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
          {/* 1. REP COUNTER */}
          {subTab === 'reps' && (
            <AnimatedCard
              index={0}
              reduceMotion={reduceMotion}
              style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <View style={styles.headerRow}>
                <View style={styles.inlineIconRow}>
                  <AppIcon name="dumbbell" size={18} color={theme.workout} />
                  <Text style={[styles.cardTitle, { color: theme.text }]}>
                    {isTh ? 'นับจำนวนครั้ง & เซต (Rep Counter)' : 'Exercise Rep & Set Counter'}
                  </Text>
                </View>
                <View style={styles.inlineIconRow}>
                  <AppIcon name="shield" size={12} color={theme.success} />
                  <Text style={{ color: theme.success, fontSize: 10, fontWeight: '700' }}>
                    Wakelock
                  </Text>
                </View>
              </View>

              <View style={[styles.chipRow, { marginTop: 10 }]}>
                {EXERCISES.map((ex) => {
                  const active = selectedExercise === ex.id;
                  return (
                    <AnimatedPressable
                      key={ex.id}
                      reduceMotion={reduceMotion}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? `${theme.workout}25` : theme.bgSecondary,
                          borderColor: active ? theme.workout : theme.border,
                        },
                      ]}
                      onPress={() => setSelectedExercise(ex.id)}
                    >
                      <Text
                        style={{
                          color: active ? theme.workout : theme.textSecondary,
                          fontWeight: '800',
                          fontSize: 12,
                        }}
                      >
                        {isTh ? `${ex.th} (${ex.en})` : ex.en}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>

              <TextInput
                value={customExercise}
                onChangeText={(txt) => {
                  setCustomExercise(txt);
                  if (txt.trim()) setSelectedExercise(txt.trim());
                }}
                placeholder={isTh ? 'หรือพิมพ์ชื่อท่าฝึกเอง...' : 'Or type custom exercise...'}
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

              {/* Big Animated Rep Counter Display */}
              <View
                style={[
                  styles.repBox,
                  { backgroundColor: theme.bgSecondary, borderColor: theme.border },
                ]}
              >
                <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '700' }}>
                  {getExerciseDisplayName(selectedExercise, isTh)} · {isTh ? `เซตที่ #${loggedSets.length + 1}` : `Set #${loggedSets.length + 1}`}
                </Text>
                <AnimatedNumberText
                  value={currentReps}
                  reduceMotion={reduceMotion}
                  style={[styles.repNumber, { color: theme.workout }]}
                />
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>REPS</Text>

                <View style={styles.repBtnRow}>
                  <AnimatedPressable
                    reduceMotion={reduceMotion}
                    style={[styles.repControlBtn, { borderColor: theme.border, backgroundColor: theme.card }]}
                    onPress={() => setCurrentReps((r) => Math.max(1, r - 1))}
                  >
                    <Text style={[styles.repControlText, { color: theme.text }]}>−1</Text>
                  </AnimatedPressable>
                  <AnimatedPressable
                    reduceMotion={reduceMotion}
                    style={[styles.repControlBtn, { borderColor: theme.workout, backgroundColor: `${theme.workout}20` }]}
                    onPress={() => setCurrentReps((r) => r + 1)}
                  >
                    <Text style={[styles.repControlText, { color: theme.workout }]}>+1</Text>
                  </AnimatedPressable>
                  <AnimatedPressable
                    reduceMotion={reduceMotion}
                    style={[styles.repControlBtn, { borderColor: theme.primary, backgroundColor: `${theme.primary}20` }]}
                    onPress={() => setCurrentReps((r) => r + 5)}
                  >
                    <Text style={[styles.repControlText, { color: theme.primary }]}>+5</Text>
                  </AnimatedPressable>
                </View>

                <AnimatedPressable
                  reduceMotion={reduceMotion}
                  style={[styles.primaryBtn, { backgroundColor: theme.workout, width: 260, marginTop: 12 }]}
                  onPress={() => {
                    setLoggedSets((prev) => [
                      ...prev,
                      {
                        exerciseName: selectedExercise,
                        setIndex: prev.length + 1,
                        reps: currentReps,
                        restSec: 60,
                      },
                    ]);
                    setRestCountdownSec(60);
                    playSystemFeedback('xp', db.profile.soundEnabled);
                  }}
                >
                  <Text style={styles.primaryBtnText}>
                    {strings.train.finishSet} (Set #{loggedSets.length + 1}) & พัก 60 วินาที
                  </Text>
                </AnimatedPressable>

                {restCountdownSec > 0 && (
                  <View style={styles.restBanner}>
                    <View style={styles.inlineIconRow}>
                      <AppIcon name="clock" size={14} color={theme.warning} />
                      <Text style={{ color: theme.warning, fontWeight: '800', fontSize: 14 }}>
                        {isTh ? 'เวลาพักระหว่างเซต:' : 'Rest Timer:'}{' '}
                        {formatDurationMMSS(restCountdownSec)}
                      </Text>
                    </View>
                    <Pressable onPress={() => setRestCountdownSec(0)}>
                      <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                        {isTh ? 'ข้ามเวลาพัก' : 'Skip Rest'}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>

              {/* Logged Sets & Complete Workout */}
              {loggedSets.length > 0 && (
                <View style={{ marginTop: 14 }}>
                  <Text style={{ color: theme.text, fontWeight: '800', marginBottom: 6 }}>
                    {isTh ? `เซตที่ทำแล้ว (${loggedSets.length} เซต):` : `Completed Sets (${loggedSets.length}):`}
                  </Text>
                  {loggedSets.map((s, idx) => (
                    <Text key={idx} style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 2 }}>
                      • {isTh ? `เซตที่ #${s.setIndex}` : `Set #${s.setIndex}`}: {getExerciseDisplayName(s.exerciseName, isTh)} — {s.reps} reps
                    </Text>
                  ))}

                  {/* Feeling 1-5 */}
                  <View style={[styles.chipRow, { marginTop: 10 }]}>
                    <Text style={{ color: theme.textSecondary, fontSize: 12, alignSelf: 'center' }}>
                      {isTh ? 'ความรู้สึกหลังฝึก (1-5):' : 'Feeling (1-5):'}
                    </Text>
                    {[1, 2, 3, 4, 5].map((f) => (
                      <AnimatedPressable
                        key={f}
                        reduceMotion={reduceMotion}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: feelingRating === f ? `${theme.success}25` : theme.bgSecondary,
                            borderColor: feelingRating === f ? theme.success : theme.border,
                          },
                        ]}
                        onPress={() => setFeelingRating(f)}
                      >
                        <View style={styles.inlineIconRow}>
                          <Text style={{ color: feelingRating === f ? theme.success : theme.text, fontWeight: '800' }}>
                            {f}
                          </Text>
                          <AppIcon
                            name="star"
                            size={12}
                            color={feelingRating === f ? theme.success : theme.warning}
                          />
                        </View>
                      </AnimatedPressable>
                    ))}
                  </View>

                  <AnimatedPressable
                    reduceMotion={reduceMotion}
                    style={[
                      styles.primaryBtn,
                      { backgroundColor: theme.success, marginTop: 12, alignItems: 'center' },
                    ]}
                    onPress={() => {
                      const estDurationSec = Math.max(300, loggedSets.length * 180);
                      logWorkout(
                        `${getExerciseDisplayName(selectedExercise, isTh)} (${loggedSets.length} sets)`,
                        {
                          workoutType: 'strength',
                          durationSec: estDurationSec,
                          feeling: feelingRating,
                          planCompleted: loggedSets.length >= 3,
                          sets: loggedSets,
                        },
                        `Completed ${loggedSets.length} sets`
                      );
                      setLoggedSets([]);
                      setRestCountdownSec(0);
                    }}
                  >
                    <View style={styles.inlineIconRow}>
                      <AppIcon name="trophy" size={16} color="#0E1220" />
                      <Text style={styles.primaryBtnText}>
                        {strings.train.completeWorkout} {isTh ? '(+30 XP พื้นฐาน + โบนัส)' : '(+30 base XP + bonus)'}
                      </Text>
                    </View>
                  </AnimatedPressable>
                </View>
              )}
            </AnimatedCard>
          )}

          {/* 2. WORKOUT TIMER */}
          {subTab === 'timer' && (
            <AnimatedCard
              index={0}
              reduceMotion={reduceMotion}
              style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <View style={styles.inlineIconRow}>
                <AppIcon name="clock" size={18} color={theme.primary} />
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  {isTh ? 'จับเวลาออกกำลังกาย (Timestamp-Based)' : 'Workout Timer (Timestamp-Based)'}
                </Text>
              </View>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>
                {isTh
                  ? 'ทำงานต่อแม้พับหน้าจอหรือปิดแอป คำนวณเวลาจริงจาก Timestamp เสมอ'
                  : 'Continues across backgrounding/reopening via wall-clock timestamps.'}
              </Text>

              <View style={[styles.chipRow, { marginTop: 10 }]}>
                {(['walk', 'run', 'bike', 'stretch', 'cardio', 'strength'] as WorkoutType[]).map(
                  (wt) => {
                    const active = workoutType === wt;
                    return (
                      <AnimatedPressable
                        key={wt}
                        reduceMotion={reduceMotion}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: active ? `${theme.workout}25` : theme.bgSecondary,
                            borderColor: active ? theme.workout : theme.border,
                          },
                        ]}
                        onPress={() => setWorkoutType(wt)}
                      >
                        <Text
                          style={{
                            color: active ? theme.workout : theme.textSecondary,
                            fontWeight: '800',
                            fontSize: 12,
                          }}
                        >
                          {wt.toUpperCase()}
                        </Text>
                      </AnimatedPressable>
                    );
                  }
                )}
              </View>

              {(workoutType === 'walk' || workoutType === 'run' || workoutType === 'bike') && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                    {isTh ? 'ระยะทาง (กม. - ไม่บังคับ):' : 'Distance (km - optional):'}
                  </Text>
                  <TextInput
                    value={distanceKmInput}
                    onChangeText={setDistanceKmInput}
                    keyboardType="numeric"
                    placeholder="2.5"
                    placeholderTextColor={theme.textMuted}
                    style={[
                      styles.input,
                      {
                        width: 90,
                        backgroundColor: theme.bgSecondary,
                        color: theme.text,
                        borderColor: theme.border,
                      },
                    ]}
                  />
                </View>
              )}

              <View
                style={[
                  styles.repBox,
                  { backgroundColor: theme.bgSecondary, borderColor: theme.border, marginTop: 14 },
                ]}
              >
                <AnimatedPulseView
                  active={Boolean(wTimer?.isRunning)}
                  reduceMotion={reduceMotion}
                  minScale={1}
                  maxScale={1.06}
                  duration={1000}
                >
                  <Text style={[styles.repNumber, { color: theme.primary }]}>
                    {formatDurationMMSS(workoutElapsedSec)}
                  </Text>
                </AnimatedPulseView>
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                  {isTh
                    ? '+30 XP พื้นฐาน และ +1 XP ทุก 2 นาที (สูงสุด +15 XP)'
                    : '+30 base XP + 1 XP per 2 min (up to +15 XP)'}
                </Text>

                <View style={[styles.repBtnRow, { marginTop: 14 }]}>
                  {!wTimer?.isRunning ? (
                    <AnimatedPressable
                      reduceMotion={reduceMotion}
                      style={[styles.primaryBtn, { backgroundColor: theme.primary, flex: 1 }]}
                      onPress={() =>
                        setWorkoutTimerState({
                          isRunning: true,
                          isPaused: false,
                          startedAtMs: Date.now(),
                          accumulatedSec: wTimer?.accumulatedSec ?? 0,
                          targetSec: 0,
                          label: workoutType,
                          mode: 'workout',
                          workoutType,
                        })
                      }
                    >
                      <Text style={styles.primaryBtnText}>
                        {wTimer ? (isTh ? 'ทำต่อ (Resume)' : 'Resume') : isTh ? 'เริ่มจับเวลา' : 'Start Workout'}
                      </Text>
                    </AnimatedPressable>
                  ) : (
                    <AnimatedPressable
                      reduceMotion={reduceMotion}
                      style={[styles.primaryBtn, { backgroundColor: theme.warning, flex: 1 }]}
                      onPress={() =>
                        setWorkoutTimerState({
                          ...wTimer,
                          isRunning: false,
                          isPaused: true,
                          accumulatedSec: workoutElapsedSec,
                          startedAtMs: null,
                        })
                      }
                    >
                      <Text style={styles.primaryBtnText}>{isTh ? 'พักชั่วคราว' : 'Pause'}</Text>
                    </AnimatedPressable>
                  )}

                  {workoutElapsedSec > 0 && (
                    <AnimatedPressable
                      reduceMotion={reduceMotion}
                      style={[styles.primaryBtn, { backgroundColor: theme.success, flex: 1 }]}
                      onPress={() => {
                        const distKm = parseFloat(distanceKmInput);
                        logWorkout(
                          `${workoutType.toUpperCase()} Session`,
                          {
                            workoutType,
                            durationSec: Math.max(60, workoutElapsedSec),
                            distanceM: !Number.isNaN(distKm) && distKm > 0 ? Math.round(distKm * 1000) : undefined,
                            feeling: 4,
                            planCompleted: true,
                          }
                        );
                        setWorkoutTimerState(null);
                        setDistanceKmInput('');
                      }}
                    >
                      <Text style={styles.primaryBtnText}>
                        {isTh ? 'จบและรับ XP' : 'Finish & Claim XP'}
                      </Text>
                    </AnimatedPressable>
                  )}
                </View>
              </View>
            </AnimatedCard>
          )}

          {/* 3. POMODORO FOCUS TIMER */}
          {subTab === 'pomodoro' && (
            <AnimatedCard
              index={0}
              reduceMotion={reduceMotion}
              style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <View style={styles.inlineIconRow}>
                <AppIcon name="quest" size={18} color={theme.focus} />
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  Pomodoro Focus Timer
                </Text>
              </View>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>
                {strings.train.pomodoroNote}
              </Text>

              <TextInput
                value={pomoTaskName}
                onChangeText={setPomoTaskName}
                placeholder={isTh ? 'สิ่งที่กำลังโฟกัส เช่น อ่านบทที่ 3, เขียนโค้ด...' : 'Task name...'}
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

              {/* Duration Presets */}
              <View style={[styles.chipRow, { marginTop: 10 }]}>
                {[
                  { min: 25, label: '25 min (Standard)' },
                  { min: 15, label: '15 min (Short)' },
                  { min: 45, label: '45 min (Deep)' },
                ].map((p) => {
                  const active = pomoFocusMin === p.min && !pTimer;
                  return (
                    <AnimatedPressable
                      key={p.min}
                      reduceMotion={reduceMotion}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? `${theme.focus}25` : theme.bgSecondary,
                          borderColor: active ? theme.focus : theme.border,
                        },
                      ]}
                      onPress={() => {
                        setPomoFocusMin(p.min);
                        setPomodoroTimerState(null);
                      }}
                    >
                      <Text
                        style={{
                          color: active ? theme.focus : theme.textSecondary,
                          fontWeight: '800',
                          fontSize: 12,
                        }}
                      >
                        {p.label}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>

              <View
                style={[
                  styles.repBox,
                  { backgroundColor: theme.bgSecondary, borderColor: theme.border, marginTop: 14 },
                ]}
              >
                <Text style={{ color: theme.focus, fontWeight: '800', fontSize: 13 }}>
                  {pomoTaskName.trim() || (isTh ? 'รอบโฟกัสปัจจุบัน' : 'Focus Session')}
                </Text>
                <AnimatedPulseView
                  active={Boolean(pTimer?.isRunning)}
                  reduceMotion={reduceMotion}
                  minScale={1}
                  maxScale={1.06}
                  duration={1000}
                >
                  <Text style={[styles.repNumber, { color: theme.focus }]}>
                    {formatDurationMMSS(pomoRemainingSec)}
                  </Text>
                </AnimatedPulseView>

                <View style={[styles.repBtnRow, { marginTop: 12 }]}>
                  {!pTimer?.isRunning ? (
                    <AnimatedPressable
                      reduceMotion={reduceMotion}
                      style={[styles.primaryBtn, { backgroundColor: theme.focus, flex: 1 }]}
                      onPress={() =>
                        setPomodoroTimerState({
                          isRunning: true,
                          isPaused: false,
                          startedAtMs: Date.now(),
                          accumulatedSec: pTimer?.accumulatedSec ?? 0,
                          targetSec: pTimer?.targetSec ?? pomoFocusMin * 60,
                          label: pomoTaskName || 'Focus',
                          mode: 'focus',
                        })
                      }
                    >
                      <Text style={styles.primaryBtnText}>
                        {pTimer ? (isTh ? 'โฟกัสต่อ' : 'Resume') : isTh ? 'เริ่มโฟกัส' : 'Start Focus'}
                      </Text>
                    </AnimatedPressable>
                  ) : (
                    <AnimatedPressable
                      reduceMotion={reduceMotion}
                      style={[styles.primaryBtn, { backgroundColor: theme.warning, flex: 1 }]}
                      onPress={() =>
                        setPomodoroTimerState({
                          ...pTimer,
                          isRunning: false,
                          isPaused: true,
                          accumulatedSec: pomoElapsedSec,
                          startedAtMs: null,
                        })
                      }
                    >
                      <Text style={styles.primaryBtnText}>{isTh ? 'พัก' : 'Pause'}</Text>
                    </AnimatedPressable>
                  )}

                  {pTimer && (
                    <AnimatedPressable
                      reduceMotion={reduceMotion}
                      style={[styles.secondaryBtn, { borderColor: theme.danger }]}
                      onPress={() => setPomodoroTimerState(null)}
                    >
                      <Text style={{ color: theme.danger, fontWeight: '800', fontSize: 12 }}>
                        {isTh ? 'ยกเลิก (ไม่หัก XP)' : 'Cancel (0 Penalty)'}
                      </Text>
                    </AnimatedPressable>
                  )}
                </View>

                <AnimatedPressable
                  reduceMotion={reduceMotion}
                  style={[
                    styles.primaryBtn,
                    { backgroundColor: theme.success, width: 260, marginTop: 12 },
                  ]}
                  onPress={() => {
                    playSystemFeedback('timerDone', db.profile.soundEnabled);
                    logPomodoro({
                      taskName: pomoTaskName.trim() || (isTh ? 'โฟกัสงานสำเร็จ' : 'Pomodoro Session'),
                      focusSec: pomoFocusMin * 60,
                      plannedSec: pomoFocusMin * 60,
                      completed: true,
                    });
                    setPomodoroTimerState(null);
                    setPomoTaskName('');
                  }}
                >
                  <Text style={styles.primaryBtnText}>
                    {isTh ? 'ยืนยันจบรอบโฟกัส (+15 XP)' : 'Complete Focus Round (+15 XP)'}
                  </Text>
                </AnimatedPressable>
              </View>
            </AnimatedCard>
          )}

          {/* 4. WEEKLY TRAINING PLAN */}
          {subTab === 'plan' && (
            <AnimatedCard
              index={0}
              reduceMotion={reduceMotion}
              style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <View style={styles.inlineIconRow}>
                <AppIcon name="calendar" size={18} color={theme.primary} />
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  {isTh ? 'ตารางฝึกซ้อมรายสัปดาห์ (วันพัก = ทำตามแผนสำเร็จ)' : 'Weekly Training Plan'}
                </Text>
              </View>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4, marginBottom: 10 }}>
                {isTh
                  ? 'เลือกแม่แบบเริ่มต้น หรือแตะแต่ละวันเพื่อสลับประเภทการฝึกและวันพัก (Rest Day)'
                  : 'Choose a preset template or tap any day to customize your schedule & Rest Days.'}
              </Text>

              <View style={[styles.chipRow, { marginBottom: 12 }]}>
                {(
                  [
                    { id: 'light', icon: 'leaf' as AppIconName, label: isTh ? 'แผนเริ่มต้น (เบา)' : 'Light Preset' },
                    { id: 'balanced', icon: 'shield' as AppIconName, label: isTh ? 'แผนสมดุล (กลาง)' : 'Balanced Preset' },
                    { id: 'flexible', icon: 'bolt' as AppIconName, label: isTh ? 'แผนอิสระ' : 'Flexible Preset' },
                  ] as const
                ).map((pr) => (
                  <AnimatedPressable
                    key={pr.id}
                    reduceMotion={reduceMotion}
                    style={[
                      styles.chip,
                      { backgroundColor: theme.bgSecondary, borderColor: theme.primary },
                    ]}
                    onPress={() => applyTrainingPreset(pr.id)}
                  >
                    <View style={styles.inlineIconRow}>
                      <AppIcon name={pr.icon} size={13} color={theme.primary} />
                      <Text style={{ color: theme.primary, fontWeight: '800', fontSize: 12 }}>
                        {pr.label}
                      </Text>
                    </View>
                  </AnimatedPressable>
                ))}
              </View>

              {db.trainingPlan.map((day) => {
                const dayNames = isTh
                  ? ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์']
                  : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                const types: TrainingDayType[] = [
                  'upper',
                  'lower',
                  'full',
                  'cardio',
                  'stretch',
                  'rest',
                ];
                const isTodayWeekday = getWeekdayOneBased(todayKey) === day.weekday;

                return (
                  <View
                    key={day.weekday}
                    style={[
                      styles.planRow,
                      {
                        backgroundColor: isTodayWeekday
                          ? `${theme.primary}15`
                          : theme.bgSecondary,
                        borderColor: isTodayWeekday ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <View style={{ width: 90 }}>
                      <Text style={{ color: theme.text, fontWeight: '800', fontSize: 13 }}>
                        {dayNames[day.weekday - 1]}
                      </Text>
                      {isTodayWeekday && (
                        <Text style={{ color: theme.primary, fontSize: 10, fontWeight: '800' }}>
                          {isTh ? 'วันนี้' : 'TODAY'}
                        </Text>
                      )}
                    </View>

                    <View style={[styles.chipRow, { flex: 1 }]}>
                      {types.map((tp) => {
                        const active = day.dayType === tp;
                        return (
                          <Pressable
                            key={tp}
                            style={[
                              styles.miniPlanChip,
                              {
                                backgroundColor: active
                                  ? tp === 'rest'
                                    ? theme.success
                                    : theme.primary
                                  : theme.card,
                                borderColor: theme.border,
                              },
                            ]}
                            onPress={() => updateTrainingPlanDay(day.weekday, tp)}
                          >
                            <Text
                              style={{
                                color: active ? '#0E1220' : theme.textSecondary,
                                fontSize: 10,
                                fontWeight: '800',
                              }}
                            >
                              {tp.toUpperCase()}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}

              <AnimatedPressable
                reduceMotion={reduceMotion}
                style={[
                  styles.primaryBtn,
                  { backgroundColor: theme.success, marginTop: 12, alignItems: 'center' },
                ]}
                onPress={() => logRestDayCheckin('Scheduled Rest Day Check-in')}
              >
                <View style={styles.inlineIconRow}>
                  <AppIcon name="leaf" size={14} color="#0E1220" />
                  <Text style={styles.primaryBtnText}>
                    {isTh ? 'เช็กอินวันพักตามแผนวันนี้ (+25 XP)' : 'Check-in Planned Rest Day (+25 XP)'}
                  </Text>
                </View>
              </AnimatedPressable>
            </AnimatedCard>
          )}

          {/* 5. TRAINING & FOCUS HISTORY */}
          {subTab === 'history' && (
            <AnimatedCard
              index={0}
              reduceMotion={reduceMotion}
              style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <View style={styles.inlineIconRow}>
                <AppIcon name="chart" size={18} color={theme.workout} />
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  {isTh ? 'สถิติการฝึก & โฟกัส 7 วันย้อนหลัง' : '7-Day Workout & Focus Trends'}
                </Text>
              </View>

              <View style={styles.chartRow}>
                {last7Days.map((dk, idx) => {
                  const wMin = db.activities
                    .filter(
                      (a) =>
                        !a.deletedAt &&
                        a.type === 'workout' &&
                        getLocalDayKey(a.occurredAt, a.tzOffsetMin) === dk
                    )
                    .reduce((s, a) => s + a.value, 0);
                  const fMin = db.activities
                    .filter(
                      (a) =>
                        !a.deletedAt &&
                        a.type === 'focus' &&
                        getLocalDayKey(a.occurredAt, a.tzOffsetMin) === dk
                    )
                    .reduce((s, a) => s + a.value, 0);
                  const total = wMin + fMin;
                  const hPct = Math.min(100, Math.max(8, Math.round((total / 60) * 100)));

                  return (
                    <View key={dk} style={styles.chartBarCol}>
                      <Text style={{ color: theme.textMuted, fontSize: 10 }}>{total}m</Text>
                      <AnimatedBarColumn
                        percent={hPct}
                        color={wMin >= fMin ? theme.workout : theme.focus}
                        trackColor={theme.bgSecondary}
                        delay={idx * 45}
                        reduceMotion={reduceMotion}
                      />
                      <Text style={{ color: theme.textSecondary, fontSize: 10 }}>
                        {dk.slice(8)}
                      </Text>
                    </View>
                  );
                })}
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
    gap: 5,
  },
  subTabBar: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
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
    fontSize: 15,
    fontWeight: '800',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
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
  repBox: {
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  repNumber: {
    fontSize: 48,
    fontWeight: '900',
    marginVertical: 4,
  },
  repBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    width: '100%',
    justifyContent: 'center',
  },
  repControlBtn: {
    width: 82,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  repControlText: {
    fontSize: 18,
    fontWeight: '900',
  },
  primaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#0E1220',
    fontWeight: '900',
    fontSize: 13,
  },
  secondaryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 8,
  },
  miniPlanChip: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 130,
    marginTop: 14,
  },
  chartBarCol: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
});
