import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
} from 'react-native';
import { AppTheme } from '../../app/theme';
import {
  ActivityPreference,
  AgeBand,
  AwakeningPath,
  BestTimeOption,
  BossId,
  DailyFeeling,
  DisciplinePickId,
  EquipmentOption,
  FutureFeel,
  FutureSelfId,
  GenderOption,
  LanguageCode,
  NarratorTone,
  OnboardingProfile,
  SafetyFlag,
} from '../../core/engine/types';
import {
  calculateInitialStats,
  calculateStartingTier,
  determineStarterClass,
  finalizeOnboardingProfile,
  getNarratorMessages,
  getPathLabel,
  getStarterClassLabel,
  isMinorAgeBand,
  shouldHideColdShower,
  shouldHideReduceSugar,
  shouldSkipPushupTest,
} from '../../core/engine/onboardingEngine';
import { generateDailyQuestsForDay } from '../../core/engine/questEngine';
import { playSystemFeedback } from '../../services/soundService';
import { AppIcon, AppIconName, AwakenedBrandIcon } from '../components/AppIcons';
import {
  AnimatedCard,
  AnimatedPressable,
  AnimatedProgressBar,
  AnimatedPulseView,
} from '../components/AnimatedComponents';

type StepId =
  | 'welcome'
  | 'Q1'
  | 'Q2'
  | 'Q3'
  | 'Q4'
  | 'Q5'
  | 'Q6'
  | 'Q7'
  | 'interstitial'
  | 'Q8'
  | 'Q9'
  | 'Q10'
  | 'Q11'
  | 'Q12'
  | 'Q13'
  | 'Q14'
  | 'Q15'
  | 'Q16'
  | 'Q17'
  | 'Q18'
  | 'Q19'
  | 'Q20'
  | 'Q21'
  | 'status_window';

const ALL_ORDERED_STEPS: StepId[] = [
  'welcome',
  'Q1',
  'Q2',
  'Q3',
  'Q4',
  'Q5',
  'Q6',
  'Q7',
  'interstitial',
  'Q8',
  'Q9',
  'Q10',
  'Q11',
  'Q12',
  'Q13',
  'Q14',
  'Q15',
  'Q16',
  'Q17',
  'Q18',
  'Q19',
  'Q20',
  'Q21',
  'status_window',
];

function getPhaseForStep(step: StepId): 0 | 1 | 2 | 3 | 4 | 5 {
  if (step === 'welcome') return 0;
  if (step === 'Q1' || step === 'Q2' || step === 'Q3' || step === 'Q4') return 1;
  if (
    step === 'Q5' ||
    step === 'Q6' ||
    step === 'Q7' ||
    step === 'interstitial' ||
    step === 'Q8' ||
    step === 'Q9'
  ) {
    return 2;
  }
  if (
    step === 'Q10' ||
    step === 'Q11' ||
    step === 'Q12' ||
    step === 'Q13' ||
    step === 'Q14' ||
    step === 'Q15' ||
    step === 'Q16' ||
    step === 'Q17' ||
    step === 'Q18'
  ) {
    return 3;
  }
  if (step === 'Q19' || step === 'Q20' || step === 'Q21') return 4;
  return 5;
}

export const OnboardingQuestionnaireScreen: React.FC<{
  initialDraft: OnboardingProfile;
  theme: AppTheme;
  lang: LanguageCode;
  soundEnabled: boolean;
  reduceMotion: boolean;
  onToggleLanguage: () => void;
  onSaveDraft: (patch: Partial<OnboardingProfile>) => void;
  onFinishOnboarding: (finalDraft: OnboardingProfile, pledged: boolean) => void;
}> = ({
  initialDraft,
  theme,
  lang,
  soundEnabled,
  reduceMotion,
  onToggleLanguage,
  onSaveDraft,
  onFinishOnboarding,
}) => {
  const isTh = lang === 'th';
  const [draft, setDraft] = useState<OnboardingProfile>(initialDraft);

  // Build dynamic active steps (auto-skips Q11 if Age < 18 or injury flag is set per Section 3 & 8.1)
  const activeSteps = useMemo(() => {
    const skipQ11 = shouldSkipPushupTest(draft.ageBand, draft.safetyFlags ?? []);
    return ALL_ORDERED_STEPS.filter((s) => (s === 'Q11' && skipQ11 ? false : true));
  }, [draft.ageBand, draft.safetyFlags]);

  const [stepIdx, setStepIdx] = useState<number>(() => {
    const savedIdx = initialDraft.currentStepIndex ?? 0;
    return Math.min(Math.max(0, savedIdx), ALL_ORDERED_STEPS.length - 2);
  });

  const currentStep: StepId =
    activeSteps[Math.min(stepIdx, activeSteps.length - 1)] ?? 'welcome';
  const currentPhase = getPhaseForStep(currentStep);

  const updateField = <K extends keyof OnboardingProfile>(
    key: K,
    val: OnboardingProfile[K]
  ) => {
    setDraft((prev) => {
      const next = { ...prev, [key]: val, updatedAt: Date.now() };
      onSaveDraft({ [key]: val });
      return next;
    });
  };

  const goNext = () => {
    const nextIdx = Math.min(activeSteps.length - 1, stepIdx + 1);
    setStepIdx(nextIdx);
    onSaveDraft({ currentStepIndex: nextIdx });
  };

  const goBack = () => {
    const prevIdx = Math.max(0, stepIdx - 1);
    setStepIdx(prevIdx);
    onSaveDraft({ currentStepIndex: prevIdx });
  };

  // Interstitial text fade-in animation (Section 4.3)
  const interFade1 = useRef(new Animated.Value(0)).current;
  const interFade2 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (currentStep !== 'interstitial') return;
    if (reduceMotion) {
      interFade1.setValue(1);
      interFade2.setValue(1);
      return;
    }
    interFade1.setValue(0);
    interFade2.setValue(0);
    Animated.sequence([
      Animated.timing(interFade1, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.delay(450),
      Animated.timing(interFade2, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStep, reduceMotion]);

  // 3-Second Hold Pledge Button state (Section 4.5 / Q21)
  const [isHoldingPledge, setIsHoldingPledge] = useState(false);
  const [holdPercent, setHoldPercent] = useState(0);
  const holdAnim = useRef(new Animated.Value(0)).current;
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopHold = () => {
    setIsHoldingPledge(false);
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    holdAnim.stopAnimation();
    holdAnim.setValue(0);
    setHoldPercent(0);
  };

  const triggerPledgeSuccess = () => {
    stopHold();
    try {
      Vibration.vibrate([0, 60, 40, 120]);
    } catch {
      // Ignore if vibration unsupported
    }
    playSystemFeedback('levelUp', soundEnabled);
    const statusIdx = activeSteps.indexOf('status_window');
    if (statusIdx >= 0) {
      setStepIdx(statusIdx);
    }
  };

  const startHoldPledge = () => {
    if (reduceMotion) {
      triggerPledgeSuccess();
      return;
    }
    setIsHoldingPledge(true);
    try {
      Vibration.vibrate(25);
    } catch {
      // Ignore
    }
    const startMs = Date.now();
    const durationMs = 3000;
    Animated.timing(holdAnim, {
      toValue: 100,
      duration: durationMs,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startMs;
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setHoldPercent(pct);
      if (pct === 35 || pct === 70) {
        try {
          Vibration.vibrate(35);
        } catch {
          // Ignore
        }
      }
      if (elapsed >= durationMs) {
        triggerPledgeSuccess();
      }
    }, 60);
  };

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    };
  }, []);

  // Calculated preview for Status Window (Section 5.1)
  const previewFinalized = useMemo(
    () => finalizeOnboardingProfile(draft, true),
    [draft]
  );
  const previewStats = useMemo(
    () => calculateInitialStats(previewFinalized),
    [previewFinalized]
  );
  const previewQuests = useMemo(
    () =>
      generateDailyQuestsForDay({
        dayKey: 'onboarding_day_1',
        isRestDay: false,
        availableMinutesPerDay: previewFinalized.minutesPerDay,
        waterGoalMl: previewFinalized.waterGoalMl,
        onboarding: previewFinalized,
      }),
    [previewFinalized]
  );

  // Ambient brightness progression per phase (Section 4.2)
  const bgByPhase = [
    '#090D1C',
    '#0C1226',
    '#101833',
    '#131D3B',
    '#162244',
    '#141C3D',
  ][currentPhase];

  // Phase 1..4 ring segments
  const renderAwakeningRingHeader = () => {
    const canSkip = currentStep !== 'Q2' && currentStep !== 'Q21';
    const phaseTitlesTh = [
      '',
      'ช่วงที่ 1 · ตัวตนและสายพลัง',
      'ช่วงที่ 2 · ปลุกไฟในตัวคุณ',
      'ช่วงที่ 3 · ประเมินค่าสถานะเริ่มต้น',
      'ช่วงที่ 4 · พันธสัญญาแห่งการตื่นรู้',
    ];
    const phaseTitlesEn = [
      '',
      'Phase 1 · Player Profile & Class',
      'Phase 2 · Emotional Trigger',
      'Phase 3 · Base Stats & Constraints',
      'Phase 4 · Awakening & Commitment',
    ];

    return (
      <View style={styles.topHeader}>
        <View style={styles.headerRow}>
          <Pressable onPress={goBack} style={styles.backBtn}>
            <Text style={{ color: '#94A3B8', fontWeight: '800', fontSize: 13 }}>
              ← {isTh ? 'ย้อนกลับ' : 'Back'}
            </Text>
          </Pressable>

          {/* Awakening XP Ring Indicator (Section 4.2 — No "x/21" numbers) */}
          <View style={styles.ringCenterWrap}>
            <View style={styles.ringSegmentsRow}>
              {[1, 2, 3, 4].map((p) => {
                const active = currentPhase >= p;
                const current = currentPhase === p;
                return (
                  <View
                    key={p}
                    style={[
                      styles.ringSegmentPill,
                      {
                        backgroundColor: active
                          ? p === 4
                            ? '#3DDC97'
                            : '#5B8CFF'
                          : 'rgba(255,255,255,0.14)',
                        width: current ? 28 : 18,
                      },
                    ]}
                  />
                );
              })}
            </View>
            <Text style={styles.phaseLabel}>
              {isTh ? phaseTitlesTh[currentPhase] : phaseTitlesEn[currentPhase]}
            </Text>
          </View>

          <View style={styles.rightHeaderBtns}>
            <Pressable onPress={onToggleLanguage} style={styles.langMiniChip}>
              <Text style={{ color: '#5B8CFF', fontWeight: '800', fontSize: 11 }}>
                {lang.toUpperCase()}
              </Text>
            </Pressable>
            {canSkip && (
              <Pressable onPress={goNext} style={styles.skipBtn}>
                <Text style={{ color: '#94A3B8', fontWeight: '700', fontSize: 13 }}>
                  {isTh ? 'ข้าม' : 'Skip'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  };

  // 4.1 Welcome Screen
  if (currentStep === 'welcome') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: '#090D1C' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#090D1C" />
        <View style={styles.welcomeTopBar}>
          <Pressable onPress={onToggleLanguage} style={styles.langMiniChip}>
            <Text style={{ color: '#5B8CFF', fontWeight: '800', fontSize: 12 }}>
              {isTh ? 'ภาษา: TH' : 'Lang: EN'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.welcomeContainer}>
          <AnimatedPulseView
            active
            reduceMotion={reduceMotion}
            minScale={0.96}
            maxScale={1.06}
            duration={2200}
          >
            <View style={styles.welcomeGlowCircle}>
              <AwakenedBrandIcon size={108} />
            </View>
          </AnimatedPulseView>

          <Text style={styles.welcomeSystemBadge}>✦ AWAKENED SYSTEM ✦</Text>

          <Text style={styles.welcomeQuoteMain}>
            {isTh
              ? '“บางส่วนของคุณยังหลับอยู่\nและบางส่วนกำลังรอให้วันนี้มาถึง”'
              : '“Part of you is still asleep.\nAnd part of you has been waiting for today.”'}
          </Text>

          <Text style={styles.welcomeSubDesc}>
            {isTh
              ? 'ตอบคำถามสั้น ๆ เพื่อสร้าง Status Window และ Daily Quest ที่ออกแบบมาเพื่อชีวิตจริงของคุณโดยเฉพาะ (ข้อมูลเก็บในเครื่อง 100%)'
              : 'Answer a few quick questions to forge your personal Status Window and Daily Quests (100% on-device privacy).'}
          </Text>

          {/* Mandatory Medical Disclaimer at Start (Section 8.2) */}
          <View style={styles.disclaimerBox}>
            <AppIcon name="shield" size={16} color="#3DDC97" />
            <Text style={styles.disclaimerText}>
              {isTh
                ? 'Awakened ไม่ใช่เครื่องมือทางการแพทย์ หากมีโรคประจำตัวหรืออาการผิดปกติ ควรปรึกษาแพทย์ก่อนเริ่มออกกำลังกาย'
                : 'Awakened is not a medical device. Consult a physician before starting if you have medical conditions.'}
            </Text>
          </View>

          <AnimatedPressable
            reduceMotion={reduceMotion}
            style={styles.welcomePrimaryBtn}
            onPress={() => {
              playSystemFeedback('xp', soundEnabled);
              goNext();
            }}
          >
            <Text style={styles.welcomePrimaryBtnText}>
              {isTh ? '[ เริ่มปลุก ]' : '[ Begin Awakening ]'}
            </Text>
          </AnimatedPressable>

          <Pressable
            style={styles.welcomeSkipAllBtn}
            onPress={() => onFinishOnboarding(draft, false)}
          >
            <Text style={styles.welcomeSkipAllText}>
              {isTh
                ? 'ยังไม่พร้อมตอบตอนนี้ — เข้าแอปด้วยค่าเริ่มต้นปลอดภัย'
                : 'Not ready right now — Enter with safe defaults'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // 4.3 Dark Interstitial Screen (After Q7)
  if (currentStep === 'interstitial') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: '#050811' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#050811" />
        <View style={styles.interstitialContainer}>
          <View style={styles.interstitialIconWrap}>
            <AwakenedBrandIcon size={64} />
          </View>

          <Animated.View style={{ opacity: interFade1, marginBottom: 22 }}>
            <Text style={styles.interstitialQuote1}>
              {isTh
                ? '“รู้ไหม? คนส่วนใหญ่ไม่ได้ล้มเหลวเพราะอ่อนแอ\nแต่ล้มเหลวเพราะใช้ ‘อารมณ์’ นำทาง\nแทนที่จะใช้ ‘ระบบ’...”'
                : '“Most people do not fail because they are weak.\nThey fail because they rely on emotion\ninstead of a system...”'}
            </Text>
          </Animated.View>

          <Animated.View style={{ opacity: interFade2, marginBottom: 36 }}>
            <Text style={styles.interstitialQuote2}>
              {isTh
                ? '“นับจากวินาทีนี้ ระบบจะเปลี่ยนเป้าหมายของคุณ\nให้กลายเป็นเควสที่จับต้องได้ในทุก ๆ วัน”'
                : '“From this second forward, the System will turn your goals into tangible Daily Quests.”'}
            </Text>
          </Animated.View>

          <AnimatedPressable
            reduceMotion={reduceMotion}
            style={styles.welcomePrimaryBtn}
            onPress={goNext}
          >
            <Text style={styles.welcomePrimaryBtnText}>
              {isTh ? '[ ต่อไป ]' : '[ Continue ]'}
            </Text>
          </AnimatedPressable>
        </View>
      </SafeAreaView>
    );
  }

  // 5.1 Status Window / Awakening Profile Result Screen
  if (currentStep === 'status_window') {
    const classInfo = getStarterClassLabel(previewFinalized.starterClass, lang);
    const narratorInfo = getNarratorMessages(previewFinalized.narrator, lang);
    const statRows: Array<{
      key: 'STR' | 'VIT' | 'INT' | 'WIL';
      label: string;
      val: number;
      color: string;
    }> = [
      {
        key: 'STR',
        label: isTh ? 'แข็งแรง (Strength)' : 'Strength',
        val: previewStats.STR,
        color: '#F97316',
      },
      {
        key: 'VIT',
        label: isTh ? 'ความอึด (Vitality)' : 'Vitality',
        val: previewStats.VIT,
        color: '#3DDC97',
      },
      {
        key: 'INT',
        label: isTh ? 'ปัญญา/โฟกัส (Intellect)' : 'Intellect',
        val: previewStats.INT,
        color: '#5B8CFF',
      },
      {
        key: 'WIL',
        label: isTh ? 'วินัย (Willpower)' : 'Willpower',
        val: previewStats.WIL,
        color: '#A855F7',
      },
    ];

    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: '#0E142C' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#0E142C" />
        <ScrollView contentContainerStyle={styles.statusScroll}>
          <AnimatedCard index={0} reduceMotion={reduceMotion} style={styles.statusWindowCard}>
            <View style={styles.statusHeaderCenter}>
              <AwakenedBrandIcon size={56} />
              <Text style={styles.statusTitleBanner}>✦ STATUS WINDOW ✦</Text>
              <View style={styles.xpBonusBadge}>
                <Text style={styles.xpBonusBadgeText}>
                  +50 XP {isTh ? 'โบนัสตื่นรู้ครั้งแรก!' : 'First Awakening Bonus!'}
                </Text>
              </View>
            </View>

            <View style={styles.statusIdentityBox}>
              <Text style={styles.statusPlayerName}>
                {previewFinalized.nickname}{' '}
                <Text style={{ color: '#3DDC97', fontSize: 15 }}>
                  · Rank E (Dormant) · Lv.1
                </Text>
              </Text>
              <Text style={styles.statusMetaLine}>
                {isTh ? 'สายหลัก:' : 'Path:'} {getPathLabel(previewFinalized.path, lang)}
              </Text>
              <Text style={styles.statusMetaLine}>
                {isTh ? 'คลาสเริ่มต้น:' : 'Starter Class:'} {classInfo.name}
              </Text>
              <Text style={styles.statusMetaLine}>
                {isTh ? 'ระดับเริ่มต้น:' : 'Starting Tier:'} Tier {previewFinalized.startTier} / 4 · ~
                {previewFinalized.minutesPerDay} {isTh ? 'นาที/วัน' : 'min/day'}
              </Text>
              {previewFinalized.quickWinsUntil && (
                <Text style={[styles.statusMetaLine, { color: '#3DDC97', marginTop: 4 }]}>
                  ⚡ {isTh ? 'เปิดโหมด Quick Wins (7 วันแรกเน้นชนะไว ไม่ให้ไฟมอด)' : 'Quick Wins Mode Active (First 7 Days)'}
                </Text>
              )}
            </View>

            {/* 4 Base Stats Bars (STR / VIT / INT / WIL) */}
            <View style={styles.statsSection}>
              {statRows.map((st) => (
                <View key={st.key} style={styles.statBarRow}>
                  <View style={styles.statLabelRow}>
                    <Text style={[styles.statKeyText, { color: st.color }]}>{st.key}</Text>
                    <Text style={styles.statDescText}>{st.label}</Text>
                    <Text style={[styles.statValText, { color: st.color }]}>{st.val}</Text>
                  </View>
                  <AnimatedProgressBar
                    percent={Math.min(100, st.val * 2)}
                    fillColor={st.color}
                    trackColor="#0A0F20"
                    borderColor="#233058"
                    height={9}
                    reduceMotion={reduceMotion}
                  />
                </View>
              ))}
            </View>

            {/* Vow */}
            <View style={styles.vowBox}>
              <Text style={styles.vowLabel}>
                {isTh ? 'พันธสัญญา 66 วัน (Vow):' : '66-Day Vow:'}
              </Text>
              <Text style={styles.vowQuote}>“{previewFinalized.vow}”</Text>
              <Text style={styles.narratorQuote}>
                — {narratorInfo.name}: “{narratorInfo.dailyGreeting}”
              </Text>
            </View>

            {/* First Day Quests Preview */}
            <Text style={styles.questPreviewHeader}>
              {isTh
                ? `เควสต์วันแรกของคุณ (${previewQuests.length} ข้อ):`
                : `Your Day 1 Quests (${previewQuests.length}):`}
            </Text>
            {previewQuests.map((q) => (
              <View key={q.templateId} style={styles.questPreviewItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.questPreviewTitle}>
                    • {isTh ? q.template.title_th : q.template.title_en}
                  </Text>
                  <Text style={styles.questPreviewMeta}>
                    {q.template.slot?.toUpperCase() || 'DAILY'} · +{q.template.reward_xp} XP
                  </Text>
                </View>
              </View>
            ))}

            <AnimatedPressable
              reduceMotion={reduceMotion}
              style={[styles.welcomePrimaryBtn, { marginTop: 18, width: '100%' }]}
              onPress={() => onFinishOnboarding(previewFinalized, true)}
            >
              <Text style={styles.welcomePrimaryBtnText}>
                {isTh ? '[ เริ่มเควสต์แรก ]' : '[ Start First Quest ]'}
              </Text>
            </AnimatedPressable>
          </AnimatedCard>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Under-13 Guard Screen (Rule 8.1)
  if (draft.ageBand === 'under_13' && currentStep !== 'Q2') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: '#090D1C' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#090D1C" />
        <View style={styles.welcomeContainer}>
          <AppIcon name="shield" size={48} color="#F59E0B" />
          <Text style={[styles.welcomeQuoteMain, { marginTop: 16 }]}>
            {isTh
              ? 'ขออภัย แอปนี้ยังไม่รองรับผู้ใช้อายุต่ำกว่า 13 ปี'
              : 'Awakened does not yet support users under 13'}
          </Text>
          <Text style={styles.welcomeSubDesc}>
            {isTh
              ? 'เพื่อความปลอดภัยด้านสุขภาพและความเป็นส่วนตัว แนะนำให้ผู้ปกครองหรือครูช่วยดูแลกิจกรรมแทน ระบบจะไม่เก็บข้อมูลส่วนตัวใด ๆ ต่อ'
              : 'For safety and privacy, we recommend parental guidance. No personal data is collected.'}
          </Text>
          <AnimatedPressable
            reduceMotion={reduceMotion}
            style={styles.welcomePrimaryBtn}
            onPress={() => {
              updateField('ageBand', '18-24');
              setStepIdx(activeSteps.indexOf('Q2'));
            }}
          >
            <Text style={styles.welcomePrimaryBtnText}>
              {isTh ? '← กลับไปเลือกช่วงอายุใหม่' : '← Go back to Age Selection'}
            </Text>
          </AnimatedPressable>
        </View>
      </SafeAreaView>
    );
  }

  // Helper for single-choice card
  const renderOptionCard = (opts: {
    selected: boolean;
    title: string;
    subtitle?: string;
    icon?: AppIconName;
    accentColor?: string;
    onPress: () => void;
  }) => {
    const accent = opts.accentColor || '#5B8CFF';
    return (
      <AnimatedPressable
        key={opts.title}
        reduceMotion={reduceMotion}
        style={[
          styles.optionCard,
          {
            backgroundColor: opts.selected ? `${accent}22` : '#131B36',
            borderColor: opts.selected ? accent : '#243156',
          },
        ]}
        onPress={opts.onPress}
      >
        {opts.icon && (
          <View
            style={[
              styles.optionIconBadge,
              { backgroundColor: opts.selected ? `${accent}30` : '#1A2448' },
            ]}
          >
            <AppIcon
              name={opts.icon}
              size={20}
              color={opts.selected ? accent : '#94A3B8'}
            />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.optionTitle,
              { color: opts.selected ? '#FFFFFF' : '#E2E8F0' },
            ]}
          >
            {opts.title}
          </Text>
          {opts.subtitle && (
            <Text style={styles.optionSubtitle}>{opts.subtitle}</Text>
          )}
        </View>
        <View
          style={[
            styles.radioCircle,
            {
              borderColor: opts.selected ? accent : '#475569',
              backgroundColor: opts.selected ? accent : 'transparent',
            },
          ]}
        >
          {opts.selected && <AppIcon name="check" size={11} color="#090D1C" />}
        </View>
      </AnimatedPressable>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgByPhase }]}>
      <StatusBar barStyle="light-content" backgroundColor={bgByPhase} />
      {renderAwakeningRingHeader()}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.questionScroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Q1: Nickname */}
        {currentStep === 'Q1' && (
          <View style={styles.stepBlock}>
            <Text style={styles.qTitle}>
              {isTh ? 'ให้เราเรียกคุณว่าอะไรดี?' : 'What should we call you?'}
            </Text>
            <Text style={styles.qHint}>
              {isTh
                ? 'ชื่อที่จะปรากฏบนหน้าต่างสถานะ (Status Window) และคำปฏิญาณของคุณ'
                : 'Displayed on your Status Window and Awakening Vow.'}
            </Text>
            <TextInput
              value={draft.nickname}
              onChangeText={(txt) => updateField('nickname', txt)}
              placeholder="Player"
              placeholderTextColor="#64748B"
              style={styles.textInputBox}
              maxLength={28}
            />
            <View style={styles.presetChipsRow}>
              {['Player', 'Hunter', 'Traveler', 'Awakened'].map((preset) => (
                <Pressable
                  key={preset}
                  style={[
                    styles.presetChip,
                    draft.nickname === preset && styles.presetChipActive,
                  ]}
                  onPress={() => updateField('nickname', preset)}
                >
                  <Text
                    style={{
                      color: draft.nickname === preset ? '#3DDC97' : '#94A3B8',
                      fontWeight: '700',
                      fontSize: 13,
                    }}
                  >
                    {preset}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Q2: Age Band (Mandatory) */}
        {currentStep === 'Q2' && (
          <View style={styles.stepBlock}>
            <Text style={styles.qTitle}>
              {isTh ? 'อายุอยู่ในช่วงไหน?' : 'Which age group are you in?'}
            </Text>
            <Text style={styles.qHint}>
              {isTh
                ? 'ใช้เพื่อตั้งค่าความปลอดภัยของเควสต์ตามช่วงวัย เก็บเฉพาะในเครื่องเท่านั้น'
                : 'Used only for age-appropriate quest safety rules on your device.'}
            </Text>
            {(
              [
                { id: 'under_13', label: isTh ? 'ต่ำกว่า 13 ปี' : 'Under 13' },
                { id: '13-15', label: '13–15' },
                { id: '16-17', label: '16–17' },
                { id: '18-24', label: '18–24' },
                { id: '25-34', label: '25–34' },
                { id: '35-44', label: '35–44' },
                { id: '45-54', label: '45–54' },
                { id: '55-64', label: '55–64' },
                { id: '65+', label: isTh ? '65 ปีขึ้นไป' : '65+' },
              ] as Array<{ id: AgeBand; label: string }>
            ).map((opt) =>
              renderOptionCard({
                selected: draft.ageBand === opt.id,
                title: opt.label,
                onPress: () => updateField('ageBand', opt.id),
              })
            )}
            {(draft.ageBand === '13-15' || draft.ageBand === '16-17') && (
              <View style={styles.safetyNoticeCard}>
                <AppIcon name="shield" size={16} color="#3DDC97" />
                <Text style={styles.safetyNoticeText}>
                  {isTh
                    ? 'โหมดปลอดภัยสำหรับวัยรุ่น: ควรให้ผู้ปกครองหรือครูทราบแผนของคุณ ระบบจะเน้นกีฬา การเคลื่อนไหว และการพักผ่อนที่เพียงพอ'
                    : 'Teen Safety Mode: Please share your plan with a parent or teacher. Focuses on sports, movement, and healthy sleep.'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Q3: Gender */}
        {currentStep === 'Q3' && (
          <View style={styles.stepBlock}>
            <Text style={styles.qTitle}>
              {isTh ? 'เพศของคุณคือ?' : 'What is your gender?'}
            </Text>
            <Text style={styles.qHint}>
              {isTh
                ? 'ใช้เพื่อเลือกตัวอย่างเริ่มต้นเท่านั้น ปรับทุกอย่างได้เองภายหลัง ไม่จำกัดเควสต์ใด ๆ'
                : 'Used only for initial examples. Does not restrict any quests.'}
            </Text>
            {(
              [
                { id: 'male', label: isTh ? 'ชาย' : 'Male' },
                { id: 'female', label: isTh ? 'หญิง' : 'Female' },
                {
                  id: 'undisclosed',
                  label: isTh ? 'อื่น ๆ / ไม่ต้องการระบุ' : 'Other / Prefer not to say',
                },
              ] as Array<{ id: GenderOption; label: string }>
            ).map((opt) =>
              renderOptionCard({
                selected: draft.gender === opt.id,
                title: opt.label,
                onPress: () => updateField('gender', opt.id),
              })
            )}
          </View>
        )}

        {/* Q4: Main Path (Class) */}
        {currentStep === 'Q4' && (
          <View style={styles.stepBlock}>
            <Text style={styles.qTitle}>
              {isTh
                ? 'เป้าหมายหลักที่คุณอยาก “รีเซ็ตตัวเอง” ที่สุดตอนนี้คืออะไร?'
                : 'What is the main goal you want to reset right now?'}
            </Text>
            <Text style={styles.qHint}>
              {isTh
                ? 'เลือกสายหลักเพื่อกำหนดสัดส่วน Daily Quest ของคุณ'
                : 'Choose your main path to shape your Daily Quest balance.'}
            </Text>
            {(
              [
                {
                  id: 'strength' as AwakeningPath,
                  icon: 'dumbbell' as AppIconName,
                  accent: '#F97316',
                  title: 'สาย Strength & Physique',
                  sub: isTh
                    ? 'อยากแข็งแรงขึ้น เพิ่มกล้ามเนื้อ มีพลัง และรูปร่างที่ตัวเองภูมิใจ'
                    : 'Build physical strength, muscle, energy, and confidence.',
                },
                {
                  id: 'discipline' as AwakeningPath,
                  icon: 'brain' as AppIconName,
                  accent: '#A855F7',
                  title: 'สาย Iron Discipline',
                  sub: isTh
                    ? 'อยากชนะความขี้เกียจ เลิกผลัดวันประกันพรุ่ง จัดระเบียบชีวิตใหม่'
                    : 'Overcome procrastination, sharpen focus, and build iron habits.',
                },
                {
                  id: 'full' as AwakeningPath,
                  icon: 'bolt' as AppIconName,
                  accent: '#3DDC97',
                  title: 'สาย Full Awakening',
                  sub: isTh
                    ? 'อยากปั้นทั้งร่างกายและวินัยไปพร้อมกันอย่างสมดุล'
                    : 'Forge both physical vitality and mental discipline together.',
                },
              ]
            ).map((opt) =>
              renderOptionCard({
                selected: draft.path === opt.id,
                title: opt.title,
                subtitle: opt.sub,
                icon: opt.icon,
                accentColor: opt.accent,
                onPress: () => updateField('path', opt.id),
              })
            )}
          </View>
        )}

        {/* Q5: Daily Feeling */}
        {currentStep === 'Q5' && (
          <View style={styles.stepBlock}>
            <Text style={styles.qTitle}>
              {isTh
                ? 'พูดกับตัวเองตรง ๆ... ตอนนี้คุณรู้สึกยังไงกับชีวิตประจำวันของตัวเอง?'
                : 'Honestly... how do you feel about your daily routine right now?'}
            </Text>
            {(
              [
                {
                  id: 'uneasy' as DailyFeeling,
                  icon: 'fire' as AppIconName,
                  title: isTh ? 'อึดอัด' : 'Restless',
                  sub: isTh
                    ? 'รู้สึกว่าปล่อยไปเยอะ และอยากเอาเวลาของตัวเองกลับคืนมา'
                    : 'Feel like I have let things slide and want my time back.',
                },
                {
                  id: 'neutral' as DailyFeeling,
                  icon: 'activity' as AppIconName,
                  title: isTh
                    ? 'เฉย ๆ แต่ลึก ๆ รู้ว่าไปได้ไกลกว่านี้'
                    : 'Okay, but I know I have untapped potential',
                  sub: isTh
                    ? 'ศักยภาพยังไม่ถูกใช้เต็มที่'
                    : 'My true potential has not been unlocked yet.',
                },
                {
                  id: 'satisfied' as DailyFeeling,
                  icon: 'bolt' as AppIconName,
                  title: isTh ? 'ค่อนข้างพอใจ แต่อยากอัปเกรด' : 'Doing well, ready to level up',
                  sub: isTh ? 'พร้อมก้าวขึ้นไปอีกขั้น' : 'Ready to push to the next tier.',
                },
              ]
            ).map((opt) =>
              renderOptionCard({
                selected: draft.feeling === opt.id,
                title: opt.title,
                subtitle: opt.sub,
                icon: opt.icon,
                onPress: () => updateField('feeling', opt.id),
              })
            )}
          </View>
        )}

        {/* Q6: Big Bosses (Max 2) */}
        {currentStep === 'Q6' && (
          <View style={styles.stepBlock}>
            <Text style={styles.qTitle}>
              {isTh
                ? '“บอสใหญ่” ที่ทำให้คุณล้มเลิกกลางคันทุกที คืออะไร?'
                : 'Which “Big Boss” usually derails your progress?'}
            </Text>
            <Text style={styles.qHint}>
              {isTh
                ? `เลือกได้สูงสุด 2 ข้อ (เลือกแล้ว ${draft.bosses.length}/2)`
                : `Select up to 2 (${draft.bosses.length}/2 selected)`}
            </Text>
            {(
              [
                {
                  id: 'fading_fire' as BossId,
                  icon: 'fire' as AppIconName,
                  title: isTh ? 'ไฟมอดไว' : 'Fading Fire',
                  sub: isTh
                    ? 'ฮึดได้แค่ไม่กี่วัน พอเหนื่อยหรือยุ่งก็กลับไปแบบเดิม'
                    : 'Motivated for a few days, then fade when tired or busy.',
                },
                {
                  id: 'self_defeat' as BossId,
                  icon: 'lock' as AppIconName,
                  title: isTh ? 'แพ้ใจตัวเอง' : 'Distraction & Doomscrolling',
                  sub: isTh
                    ? 'ติดไถมือถือ นอนดึก ตื่นสาย คุมตัวเองไม่ได้'
                    : 'Stuck scrolling phone, staying up late, hitting snooze.',
                },
                {
                  id: 'no_direction' as BossId,
                  icon: 'quest' as AppIconName,
                  title: isTh ? 'ไร้ทิศทาง' : 'Overwhelmed / No Direction',
                  sub: isTh
                    ? 'ไม่รู้ว่าแต่ละวันต้องทำอะไร หรือแผนยากเกินไปจนท้อ'
                    : 'Unsure what to do each day, or plans feel too complex.',
                },
                {
                  id: 'drained' as BossId,
                  icon: 'moon' as AppIconName,
                  title: isTh ? 'หมดพลัง' : 'Drained Energy',
                  sub: isTh
                    ? 'เหนื่อยจากเรียน/ทำงานจนไม่อยากขยับ'
                    : 'Exhausted from work or study with little energy left.',
                },
                {
                  id: 'no_time' as BossId,
                  icon: 'clock' as AppIconName,
                  title: isTh ? 'ไม่มีเวลา' : 'No Time',
                  sub: isTh ? 'ตารางชีวิตแน่นมาก' : 'Packed daily schedule.',
                },
              ]
            ).map((opt) => {
              const selected = draft.bosses.includes(opt.id);
              return renderOptionCard({
                selected,
                title: opt.title,
                subtitle: opt.sub,
                icon: opt.icon,
                accentColor: '#F59E0B',
                onPress: () => {
                  if (selected) {
                    updateField(
                      'bosses',
                      draft.bosses.filter((b) => b !== opt.id)
                    );
                  } else if (draft.bosses.length < 2) {
                    updateField('bosses', [...draft.bosses, opt.id]);
                  }
                },
              });
            })}
          </View>
        )}

        {/* Q7: 6 Months Future Feel */}
        {currentStep === 'Q7' && (
          <View style={styles.stepBlock}>
            <Text style={styles.qTitle}>
              {isTh
                ? 'จินตนาการถึงตัวเองในอีก 6 เดือนข้างหน้า... ถ้าวันนี้คุณกดปิดแอปแล้วกลับไปใช้ชีวิตแบบเดิม คุณจะรู้สึกยังไง?'
                : 'Imagine yourself 6 months from now... if you close the app today and nothing changes, how will you feel?'}
            </Text>
            {(
              [
                {
                  id: 'regret' as FutureFeel,
                  title: isTh ? 'เสียดาย' : 'Regretful',
                  sub: isTh ? 'เสียดายที่ไม่ได้เริ่มสักที' : 'Wishing I had started today.',
                },
                {
                  id: 'loop' as FutureFeel,
                  title: isTh ? 'ติดอยู่ในลูปเดิม' : 'Stuck in the same loop',
                  sub: isTh
                    ? 'ทั้งที่รู้ว่าตัวเองทำได้มากกว่านี้'
                    : 'Knowing I was capable of so much more.',
                },
                {
                  id: 'start_now' as FutureFeel,
                  title: isTh ? 'ไม่อยากให้เป็นแบบนั้น' : 'I refuse to let that happen',
                  sub: isTh ? 'ฉันขอเริ่มตั้งแต่วันนี้!' : 'I am starting today!',
                },
              ]
            ).map((opt) =>
              renderOptionCard({
                selected: draft.futureFeel === opt.id,
                title: opt.title,
                subtitle: opt.sub,
                accentColor: '#3DDC97',
                onPress: () => updateField('futureFeel', opt.id),
              })
            )}
          </View>
        )}

        {/* Q8: 66-Day Vow */}
        {currentStep === 'Q8' && (
          <View style={styles.stepBlock}>
            <Text style={styles.qTitle}>
              {isTh
                ? 'ถ้า 66 วันจากนี้ คุณเปลี่ยนได้เพียงเรื่องเดียว อยากให้เป็นเรื่องอะไร?'
                : 'If you could transform one thing in the next 66 days, what would it be?'}
            </Text>
            <Text style={styles.qHint}>
              {isTh
                ? 'ประโยคนี้จะกลายเป็น Vow (คำมั่นประจำตัว) บนหน้า Home ของคุณทุกเช้า'
                : 'This becomes your personal Vow displayed on your Home screen.'}
            </Text>
            <TextInput
              value={draft.vow}
              onChangeText={(txt) => updateField('vow', txt)}
              placeholder={isTh ? 'พิมพ์คำมั่นของคุณ หรือแตะเลือกด้านล่าง...' : 'Write your vow or tap below...'}
              placeholderTextColor="#64748B"
              style={styles.textInputBox}
              maxLength={80}
            />
            <View style={styles.presetList}>
              {[
                'ตื่นมาแล้วรู้สึกมีแรง',
                'ทำสิ่งที่ตั้งใจให้ครบทุกวัน',
                'กล้าเริ่มสิ่งที่เลื่อนมานาน',
                'ไม่หอบเมื่อขึ้นบันได',
              ].map((sample) => (
                <Pressable
                  key={sample}
                  style={[
                    styles.vowSampleBtn,
                    draft.vow === sample && styles.presetChipActive,
                  ]}
                  onPress={() => updateField('vow', sample)}
                >
                  <Text
                    style={{
                      color: draft.vow === sample ? '#3DDC97' : '#CBD5E1',
                      fontWeight: '700',
                      fontSize: 13,
                    }}
                  >
                    “{sample}”
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Q9: 3-Month Future Self */}
        {currentStep === 'Q9' && (
          <View style={styles.stepBlock}>
            <Text style={styles.qTitle}>
              {isTh
                ? 'นึกถึงตัวคุณในอีก 3 เดือนที่ทุกอย่างเริ่มลงตัว ภาพนั้นเป็นอย่างไร?'
                : 'Picture yourself 3 months from now when everything clicks. What does that look like?'}
            </Text>
            {(
              [
                {
                  id: 'strong_energetic' as FutureSelfId,
                  icon: 'bolt' as AppIconName,
                  title: isTh ? 'แข็งแรงและมีพลังทั้งวัน' : 'Strong & energetic all day',
                },
                {
                  id: 'calm_controlled' as FutureSelfId,
                  icon: 'leaf' as AppIconName,
                  title: isTh ? 'ใจนิ่งและคุมตัวเองได้' : 'Calm, focused, and in control',
                },
                {
                  id: 'confident' as FutureSelfId,
                  icon: 'crown' as AppIconName,
                  title: isTh ? 'มั่นใจในตัวเอง' : 'Confident in myself',
                },
                {
                  id: 'role_model' as FutureSelfId,
                  icon: 'heart' as AppIconName,
                  title: isTh ? 'เป็นแบบอย่างให้คนใกล้ตัว' : 'An inspiration to people around me',
                },
              ]
            ).map((opt) =>
              renderOptionCard({
                selected: draft.futureSelf === opt.id,
                title: opt.title,
                icon: opt.icon,
                onPress: () => updateField('futureSelf', opt.id),
              })
            )}
          </View>
        )}

        {/* Q10: Exercise Frequency */}
        {currentStep === 'Q10' && (
          <View style={styles.stepBlock}>
            <Text style={styles.qTitle}>
              {isTh
                ? 'ปัจจุบันคุณออกกำลังกายบ่อยแค่ไหน?'
                : 'How often do you currently exercise?'}
            </Text>
            {(
              [
                {
                  val: 0 as const,
                  title: isTh ? 'แทบไม่ขยับตัวเลย (สายนั่งหน้าจอ)' : 'Rarely / Mostly sedentary',
                },
                {
                  val: 1 as const,
                  title: isTh ? 'ออกบ้างนาน ๆ ที (1–2 ครั้ง/สัปดาห์)' : 'Occasionally (1–2 times/week)',
                },
                {
                  val: 2 as const,
                  title: isTh ? 'สม่ำเสมอ (3–4 ครั้ง/สัปดาห์)' : 'Consistent (3–4 times/week)',
                },
                {
                  val: 3 as const,
                  title: isTh ? 'ออกหนักเกือบทุกวัน' : 'Intense almost every day',
                },
              ]
            ).map((opt) =>
              renderOptionCard({
                selected: draft.freqBand === opt.val,
                title: opt.title,
                onPress: () => updateField('freqBand', opt.val),
              })
            )}
          </View>
        )}

        {/* Q11: Push-up Memory Assessment */}
        {currentStep === 'Q11' && (
          <View style={styles.stepBlock}>
            <Text style={styles.qTitle}>
              {isTh
                ? 'ทดสอบพละกำลังพื้นฐาน: ตามที่จำได้ คุณวิดพื้นติดต่อกันได้สูงสุดกี่ครั้งในเซตเดียว?'
                : 'Baseline Strength: From memory, how many push-ups can you do in one set?'}
            </Text>
            <Text style={styles.qHint}>
              {isTh
                ? 'ตอบจากความจำ ไม่ต้องลงมือทดสอบตอนนี้ ใช้ประเมินค่า STR เริ่มต้นเท่านั้น'
                : 'Answer from memory — no need to test right now. Used for initial STR.'}
            </Text>
            {(
              [
                {
                  val: 0 as const,
                  title: isTh ? 'น้อยกว่า 5 ครั้ง (หรือต้องวางเข่า)' : 'Fewer than 5 (or knee push-ups)',
                },
                { val: 1 as const, title: isTh ? '5–15 ครั้ง' : '5–15 reps' },
                { val: 2 as const, title: isTh ? '16–30 ครั้ง' : '16–30 reps' },
                { val: 3 as const, title: isTh ? 'มากกว่า 30 ครั้ง' : 'More than 30 reps' },
                { val: null, title: isTh ? 'ไม่แน่ใจ / ข้ามไปก่อน' : 'Not sure / Skip for now' },
              ]
            ).map((opt) =>
              renderOptionCard({
                selected: draft.pushupBand === opt.val,
                title: opt.title,
                onPress: () => updateField('pushupBand', opt.val),
              })
            )}
          </View>
        )}

        {/* Q12: Equipment & Location */}
        {currentStep === 'Q12' && (
          <View style={styles.stepBlock}>
            <Text style={styles.qTitle}>
              {isTh
                ? 'สถานที่และอุปกรณ์ที่คุณพร้อมใช้ทำเควสต์คือแบบไหน?'
                : 'What space and equipment do you have available?'}
            </Text>
            {(
              [
                {
                  id: 'bodyweight' as EquipmentOption,
                  icon: 'home' as AppIconName,
                  title: isTh ? 'มือเปล่าในห้อง (Bodyweight 100%)' : 'Bodyweight in my room',
                  sub: isTh ? 'ท่าที่ใช้พื้นที่น้อย ไม่ต้องใช้อุปกรณ์' : 'Zero equipment, small space.',
                },
                {
                  id: 'home_gym' as EquipmentOption,
                  icon: 'dumbbell' as AppIconName,
                  title: isTh ? 'โฮมยิมขนาดย่อม' : 'Small Home Gym',
                  sub: isTh ? 'ดัมเบล เสื่อโยคะ ยางยืด หรือบาร์โหน' : 'Dumbbells, mat, bands, or pull-up bar.',
                },
                {
                  id: 'full_gym' as EquipmentOption,
                  icon: 'trophy' as AppIconName,
                  title: isTh ? 'ฟิตเนสเต็มรูปแบบ' : 'Full Fitness Gym',
                  sub: isTh ? 'เครื่องและเวทเทรนนิ่งครบ' : 'Full machines and free weights.',
                },
                {
                  id: 'outdoor' as EquipmentOption,
                  icon: 'leaf' as AppIconName,
                  title: isTh ? 'กลางแจ้ง' : 'Outdoors / Park',
                  sub: isTh ? 'เดิน วิ่ง ปั่นจักรยาน' : 'Walking, running, cycling.',
                },
              ]
            ).map((opt) =>
              renderOptionCard({
                selected: draft.equipment === opt.id,
                title: opt.title,
                subtitle: opt.sub,
                icon: opt.icon,
                onPress: () => updateField('equipment', opt.id),
              })
            )}
          </View>
        )}

        {/* Q13: Available Minutes Per Day */}
        {currentStep === 'Q13' && (
          <View style={styles.stepBlock}>
            <Text style={styles.qTitle}>
              {isTh
                ? 'วันหนึ่งคุณสละเวลามาทำเควสต์ให้ตัวเองได้กี่นาที?'
                : 'How many minutes a day can you realistically commit?'}
            </Text>
            <Text style={styles.qHint}>
              {isTh
                ? 'เลือกเวลาที่ทำได้จริงแม้ในวันที่ยุ่งที่สุด (ระบบจะไม่จัดเควสต์เกินเวลานี้)'
                : 'Pick what works even on your busiest days.'}
            </Text>
            {(
              [
                {
                  mins: 10 as const,
                  title: isTh ? '5–10 นาที: Micro เริ่มจากนิดเดียว' : '5–10 min: Micro Start',
                  sub: isTh ? 'เน้นสร้างนิสัยแบบไม่กดดัน' : 'Quick wins with zero friction.',
                },
                {
                  mins: 15 as const,
                  title: isTh ? '10–15 นาที: เร็ว กระชับ' : '10–15 min: Fast & Consistent',
                  sub: isTh ? 'สร้างนิสัยต่อเนื่องทุกวัน' : 'Build steady daily momentum.',
                },
                {
                  mins: 30 as const,
                  title: isTh ? '20–30 นาที: กำลังดี' : '20–30 min: Balanced Session',
                  sub: isTh ? 'ได้เหงื่อและเห็นผลชัดเจน' : 'Solid sweat and clear results.',
                },
                {
                  mins: 60 as const,
                  title: isTh ? '45–60 นาที: จัดเต็มพร้อมลุยหนัก' : '45–60 min: Full Training',
                  sub: isTh ? 'สำหรับคนที่มีเวลาทำตามตารางเต็มรูปแบบ' : 'Full dedicated workout & focus blocks.',
                },
              ]
            ).map((opt) =>
              renderOptionCard({
                selected: draft.minutesPerDay === opt.mins,
                title: opt.title,
                subtitle: opt.sub,
                icon: 'clock',
                accentColor: '#3DDC97',
                onPress: () => updateField('minutesPerDay', opt.mins),
              })
            )}
          </View>
        )}

        {/* Q14: Best Time of Day */}
        {currentStep === 'Q14' && (
          <View style={styles.stepBlock}>
            <Text style={styles.qTitle}>
              {isTh
                ? 'ช่วงไหนของวันที่คุณมีแรงและใจพร้อมที่สุด?'
                : 'What time of day do you feel most energized?'}
            </Text>
            {(
              [
                { id: 'morning' as BestTimeOption, label: isTh ? 'ช่วงเช้า' : 'Morning' },
                { id: 'noon' as BestTimeOption, label: isTh ? 'กลางวัน' : 'Midday / Noon' },
                { id: 'evening' as BestTimeOption, label: isTh ? 'ช่วงเย็นหลังเลิกเรียน/งาน' : 'Evening' },
                { id: 'night' as BestTimeOption, label: isTh ? 'ช่วงดึก' : 'Night' },
                { id: 'varies' as BestTimeOption, label: isTh ? 'ไม่แน่นอน' : 'Varies by day' },
              ]
            ).map((opt) =>
              renderOptionCard({
                selected: draft.bestTime === opt.id,
                title: opt.label,
                onPress: () => updateField('bestTime', opt.id),
              })
            )}
          </View>
        )}

        {/* Q15: Physical Safety Flags (With Consent Notice 8.5) */}
        {currentStep === 'Q15' && (
          <View style={styles.stepBlock}>
            <View style={styles.privacyBanner}>
              <AppIcon name="lock" size={16} color="#3DDC97" />
              <Text style={styles.privacyBannerText}>
                {isTh
                  ? 'ข้อมูลนี้เก็บเฉพาะในเครื่องของคุณ ใช้เพื่อเลือกเควสต์ที่ปลอดภัยเท่านั้น ข้ามได้'
                  : 'Stored strictly on your device to filter safe quests only. Skippable.'}
              </Text>
            </View>
            <Text style={styles.qTitle}>
              {isTh
                ? 'มีเรื่องร่างกายที่เราควรรู้ไว้ก่อนไหม? (เลือกได้หลายข้อ)'
                : 'Any physical considerations we should know?'}
            </Text>
            {(
              [
                { id: 'none' as SafetyFlag, label: isTh ? 'ไม่มีข้อจำกัด' : 'None' },
                {
                  id: 'past_injury' as SafetyFlag,
                  label: isTh
                    ? 'เคยบาดเจ็บ / ปวดเข่า หลัง หรือข้อ (ลดท่ากระแทกสูง)'
                    : 'Past knee, back, or joint pain (low-impact mode)',
                },
                {
                  id: 'injured_now' as SafetyFlag,
                  label: isTh
                    ? 'กำลังบาดเจ็บอยู่ (ใช้ชุดเควสต์ฟื้นฟูเบา ๆ)'
                    : 'Currently injured (recovery & gentle mobility only)',
                },
                {
                  id: 'medical_limit' as SafetyFlag,
                  label: isTh
                    ? 'แพทย์เคยแนะนำให้จำกัดการออกกำลังกาย'
                    : 'Doctor advised limiting exercise intensity',
                },
                {
                  id: 'pregnancy' as SafetyFlag,
                  label: isTh ? 'ตั้งครรภ์ / หลังคลอด' : 'Pregnant / Postpartum',
                },
                { id: 'unsure' as SafetyFlag, label: isTh ? 'ไม่แน่ใจ (เริ่มจากเบาไว้ก่อน)' : 'Not sure (start extra light)' },
                {
                  id: 'undisclosed' as SafetyFlag,
                  label: isTh ? 'ไม่ต้องการระบุ' : 'Prefer not to say',
                },
              ]
            ).map((opt) => {
              const selected = draft.safetyFlags.includes(opt.id);
              return renderOptionCard({
                selected,
                title: opt.label,
                onPress: () => {
                  if (opt.id === 'none') {
                    updateField('safetyFlags', ['none']);
                    return;
                  }
                  const withoutNone = draft.safetyFlags.filter((f) => f !== 'none');
                  if (selected) {
                    const next = withoutNone.filter((f) => f !== opt.id);
                    updateField('safetyFlags', next.length > 0 ? next : ['none']);
                  } else {
                    updateField('safetyFlags', [...withoutNone, opt.id]);
                  }
                },
              });
            })}
          </View>
        )}

        {/* Q16: Energy Level 1..5 */}
        {currentStep === 'Q16' && (
          <View style={styles.stepBlock}>
            <Text style={styles.qTitle}>
              {isTh
                ? 'ช่วงนี้พลังงานของคุณอยู่ระดับไหน?'
                : 'Where is your energy level lately?'}
            </Text>
            <Text style={styles.qHint}>
              {isTh
                ? '1 = หมดแรงมาก ←→ 5 = พลังเต็มพร้อมลุย'
                : '1 = Completely drained ←→ 5 = Fully charged'}
            </Text>
            <View style={styles.energyScaleRow}>
              {([1, 2, 3, 4, 5] as const).map((lvl) => {
                const active = draft.energy === lvl;
                return (
                  <AnimatedPressable
                    key={lvl}
                    reduceMotion={reduceMotion}
                    style={[
                      styles.energyBtn,
                      {
                        backgroundColor: active ? '#3DDC97' : '#131B36',
                        borderColor: active ? '#3DDC97' : '#243156',
                      },
                    ]}
                    onPress={() => updateField('energy', lvl)}
                  >
                    <Text
                      style={{
                        color: active ? '#090D1C' : '#E2E8F0',
                        fontWeight: '900',
                        fontSize: 20,
                      }}
                    >
                      {lvl}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
            <View style={styles.energyLabelsRow}>
              <Text style={{ color: '#94A3B8', fontSize: 12 }}>
                {isTh ? '1 · หมดแรงมาก' : '1 · Very Low'}
              </Text>
              <Text style={{ color: '#3DDC97', fontSize: 12, fontWeight: '700' }}>
                {isTh ? '5 · พลังเต็ม' : '5 · High Energy'}
              </Text>
            </View>
          </View>
        )}

        {/* Q17: Bedtime & Wake Time */}
        {currentStep === 'Q17' && (
          <View style={styles.stepBlock}>
            <Text style={styles.qTitle}>
              {isTh
                ? 'ปกติคุณเข้านอนและตื่นประมาณกี่โมง?'
                : 'Around what time do you usually go to bed and wake up?'}
            </Text>
            <Text style={[styles.qHint, { marginBottom: 8 }]}>
              {isTh ? 'เวลาเข้านอนโดยประมาณ:' : 'Typical Bedtime:'}
            </Text>
            <View style={styles.presetChipsRow}>
              {['21:30', '22:00', '22:30', '23:00', '23:30', '00:00', '01:00'].map((tm) => (
                <Pressable
                  key={tm}
                  style={[
                    styles.presetChip,
                    draft.bedtime === tm && styles.presetChipActive,
                  ]}
                  onPress={() => updateField('bedtime', tm)}
                >
                  <Text
                    style={{
                      color: draft.bedtime === tm ? '#3DDC97' : '#CBD5E1',
                      fontWeight: '800',
                    }}
                  >
                    {tm}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.qHint, { marginTop: 18, marginBottom: 8 }]}>
              {isTh ? 'เวลาตื่นนอนโดยประมาณ:' : 'Typical Wake-up Time:'}
            </Text>
            <View style={styles.presetChipsRow}>
              {['05:30', '06:00', '06:30', '07:00', '07:30', '08:00', '09:00'].map((tm) => (
                <Pressable
                  key={tm}
                  style={[
                    styles.presetChip,
                    draft.wakeTime === tm && styles.presetChipActive,
                  ]}
                  onPress={() => updateField('wakeTime', tm)}
                >
                  <Text
                    style={{
                      color: draft.wakeTime === tm ? '#3DDC97' : '#CBD5E1',
                      fontWeight: '800',
                    }}
                  >
                    {tm}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Q18: Preferred Activities */}
        {currentStep === 'Q18' && (
          <View style={styles.stepBlock}>
            <Text style={styles.qTitle}>
              {isTh
                ? 'อยากลองกิจกรรมแบบไหนบ้าง? (เลือกได้หลายข้อ)'
                : 'Which activities do you enjoy or want to try?'}
            </Text>
            <View style={styles.presetChipsRow}>
              {(
                [
                  { id: 'walk' as ActivityPreference, label: isTh ? 'เดิน' : 'Walking' },
                  { id: 'run' as ActivityPreference, label: isTh ? 'วิ่ง' : 'Running' },
                  {
                    id: 'bodyweight' as ActivityPreference,
                    label: isTh ? 'ท่าน้ำหนักตัว (Bodyweight)' : 'Bodyweight',
                  },
                  { id: 'weights' as ActivityPreference, label: isTh ? 'ยกน้ำหนัก / เวท' : 'Weights' },
                  {
                    id: 'yoga_stretch' as ActivityPreference,
                    label: isTh ? 'โยคะ / ยืดเหยียด' : 'Yoga / Stretch',
                  },
                  { id: 'bike' as ActivityPreference, label: isTh ? 'ปั่นจักรยาน' : 'Cycling' },
                  { id: 'swim' as ActivityPreference, label: isTh ? 'ว่ายน้ำ' : 'Swimming' },
                  { id: 'dance' as ActivityPreference, label: isTh ? 'เต้น' : 'Dance' },
                  {
                    id: 'sport_martial' as ActivityPreference,
                    label: isTh ? 'กีฬา / ศิลปะการต่อสู้' : 'Sports / Martial Arts',
                  },
                  {
                    id: 'unsure' as ActivityPreference,
                    label: isTh ? 'ไม่แน่ใจ ลองหลายอย่าง' : 'Open to anything',
                  },
                ]
              ).map((act) => {
                const active = draft.activities.includes(act.id);
                return (
                  <Pressable
                    key={act.id}
                    style={[styles.activityChip, active && styles.presetChipActive]}
                    onPress={() => {
                      if (active) {
                        updateField(
                          'activities',
                          draft.activities.filter((a) => a !== act.id)
                        );
                      } else {
                        updateField('activities', [...draft.activities, act.id]);
                      }
                    }}
                  >
                    <Text
                      style={{
                        color: active ? '#3DDC97' : '#CBD5E1',
                        fontWeight: '700',
                        fontSize: 13,
                      }}
                    >
                      {active ? '✓ ' : ''}
                      {act.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Q19: Daily Discipline Quests (Max 3) */}
        {currentStep === 'Q19' && (
          <View style={styles.stepBlock}>
            <Text style={styles.qTitle}>
              {isTh
                ? 'นอกจากเควสออกกำลังกาย คุณอยากให้ระบบบรรจุ “เควสฝึกวินัยประจำวัน” ข้อไหนเพิ่มเข้าไปบ้าง?'
                : 'Which Daily Discipline Quests would you like in your rotation?'}
            </Text>
            <Text style={styles.qHint}>
              {isTh
                ? `เลือกได้สูงสุด 3 ข้อ (เลือกแล้ว ${draft.disciplinePicks.length}/3)`
                : `Select up to 3 (${draft.disciplinePicks.length}/3 selected)`}
            </Text>
            {(
              [
                {
                  id: 'no_snooze' as DisciplinePickId,
                  title: isTh
                    ? 'ตื่นนอนตามเวลาที่ตั้ง โดยไม่กดเลื่อนปลุก (No Snooze)'
                    : 'Wake up on time without hitting Snooze',
                },
                {
                  id: 'water_goal' as DisciplinePickId,
                  title: isTh
                    ? `ดื่มน้ำให้ครบเป้า (${draft.waterGoalMl} มล./วัน)`
                    : `Hit daily water goal (${draft.waterGoalMl} ml/day)`,
                },
                {
                  id: 'no_social_30m' as DisciplinePickId,
                  title: isTh
                    ? 'งดไถโซเชียล 30 นาที หลังตื่นและก่อนนอน'
                    : 'No social media 30m after waking & before bed',
                },
                {
                  id: 'read_learn_15m' as DisciplinePickId,
                  title: isTh
                    ? 'อ่านหนังสือหรือเรียนรู้ทักษะใหม่ 15 นาที'
                    : 'Read or learn a skill for 15 minutes',
                },
                {
                  id: 'cold_shower' as DisciplinePickId,
                  title: isTh
                    ? 'อาบน้ำเย็นตอนเช้า ฝึกความแข็งแกร่งของใจ'
                    : 'Morning cold shower for mental grit',
                  warning: isTh
                    ? 'หมายเหตุสุขภาพ: ไม่เหมาะกับบางคน เช่น ผู้มีโรคหัวใจหรือความดัน เริ่มจากน้ำเย็นพอทนและเวลาสั้น ๆ'
                    : 'Health Note: Not suitable for heart/blood pressure conditions. Start mildly cool & brief.',
                },
                {
                  id: 'reduce_sugar_fried' as DisciplinePickId,
                  title: isTh
                    ? 'ลดน้ำหวาน / ของทอด / ของจุกจิกหลัง 2 ทุ่ม'
                    : 'Reduce sugary drinks / fried foods / snacks after 8 PM',
                },
                {
                  id: 'meditate_3m' as DisciplinePickId,
                  title: isTh ? 'ทำสมาธิ / หายใจลึก 3 นาที' : '3-minute mindfulness / deep breathing',
                },
                {
                  id: 'journal_short' as DisciplinePickId,
                  title: isTh ? 'เขียนไดอารี่สั้น ๆ ทบทวนตัวเอง' : 'Write a short daily reflection journal',
                },
                {
                  id: 'sleep_on_time' as DisciplinePickId,
                  title: isTh ? 'เข้านอนตามเวลาที่ตั้ง' : 'Go to bed on time',
                },
              ]
            )
              .filter((item) => {
                if (item.id === 'cold_shower' && shouldHideColdShower(draft.safetyFlags)) {
                  return false;
                }
                if (item.id === 'reduce_sugar_fried' && shouldHideReduceSugar(draft.ageBand)) {
                  return false;
                }
                return true;
              })
              .map((item) => {
                const selected = draft.disciplinePicks.includes(item.id);
                return (
                  <View key={item.id}>
                    {renderOptionCard({
                      selected,
                      title: item.title,
                      subtitle: item.warning,
                      accentColor: '#3DDC97',
                      onPress: () => {
                        if (selected) {
                          updateField(
                            'disciplinePicks',
                            draft.disciplinePicks.filter((p) => p !== item.id)
                          );
                        } else if (draft.disciplinePicks.length < 3) {
                          updateField('disciplinePicks', [
                            ...draft.disciplinePicks,
                            item.id,
                          ]);
                        }
                      },
                    })}
                    {item.id === 'water_goal' && selected && (
                      <View style={[styles.presetChipsRow, { marginBottom: 10, marginLeft: 8 }]}>
                        {[1500, 2000, 2500, 3000].map((ml) => (
                          <Pressable
                            key={ml}
                            style={[
                              styles.presetChip,
                              draft.waterGoalMl === ml && styles.presetChipActive,
                            ]}
                            onPress={() => updateField('waterGoalMl', ml)}
                          >
                            <Text
                              style={{
                                color: draft.waterGoalMl === ml ? '#3DDC97' : '#94A3B8',
                                fontWeight: '800',
                                fontSize: 12,
                              }}
                            >
                              {(ml / 1000).toFixed(1)} L ({ml} ml)
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
          </View>
        )}

        {/* Q20: Narrator Tone */}
        {currentStep === 'Q20' && (
          <View style={styles.stepBlock}>
            <Text style={styles.qTitle}>
              {isTh ? 'ให้เราพูดกับคุณแบบไหนดี?' : 'How should your System Guide speak to you?'}
            </Text>
            {(
              [
                {
                  id: 'gentle' as NarratorTone,
                  title: isTh ? 'อ่อนโยน' : 'Gentle Guide',
                  sub: isTh
                    ? '“ขอบคุณที่ดูแลตัวเองวันนี้นะ · ไม่เป็นไร พรุ่งนี้ค่อยเริ่มใหม่”'
                    : '“Thank you for taking care of yourself today.”',
                },
                {
                  id: 'friend' as NarratorTone,
                  title: isTh ? 'เพื่อนสนิท' : 'Close Friend',
                  sub: isTh
                    ? '“เฮ้ย ทำได้จริงด้วย! +20 XP · ช่างมัน วันนี้พัก พรุ่งนี้ลุยกันใหม่”'
                    : '“Hey, you nailed it! +20 XP”',
                },
                {
                  id: 'coach' as NarratorTone,
                  title: isTh ? 'โค้ชเข้ม (ยังสุภาพ)' : 'Focused Coach (Respectful)',
                  sub: isTh
                    ? '“นี่แหละคือวินัย ไปต่อ! · เมื่อวานผ่านไปแล้ว วันนี้คือวันที่เริ่มใหม่ได้”'
                    : '“That is discipline. Keep moving forward!”',
                },
                {
                  id: 'adventurer' as NarratorTone,
                  title: isTh ? 'นักผจญภัย' : 'RPG Adventurer',
                  sub: isTh
                    ? '“ด่านนี้ผ่านแล้ว นักเดินทาง · แผนที่ยังอยู่ ออกเดินใหม่ได้เสมอ”'
                    : '“Stage cleared, Traveler! The map remains open.”',
                },
              ]
            ).map((opt) =>
              renderOptionCard({
                selected: draft.narrator === opt.id,
                title: opt.title,
                subtitle: opt.sub,
                onPress: () => updateField('narrator', opt.id),
              })
            )}
          </View>
        )}

        {/* Q21: Awakening Commitment (3-Second Hold Button + Single-Tap Accessibility) */}
        {currentStep === 'Q21' && (
          <View style={styles.stepBlock}>
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <AwakenedBrandIcon size={72} />
            </View>
            <Text style={[styles.qTitle, { textAlign: 'center' }]}>
              {isTh
                ? 'ระบบคำนวณเส้นทางการพัฒนาของคุณเสร็จแล้ว'
                : 'Your Awakening Path is Ready'}
            </Text>
            <Text style={[styles.qHint, { textAlign: 'center' }]}>
              {isTh
                ? 'ถ้าได้รับเควสประจำวัน คุณพร้อมจะลงมือทำทีละก้าวหรือไม่?'
                : 'When your Daily Quests arrive, are you ready to take action step by step?'}
            </Text>

            <View style={styles.pledgeVowCard}>
              <Text style={styles.pledgeVowText}>
                {isTh
                  ? `“ฉัน ${draft.nickname || 'Player'} ขอเริ่มตื่นขึ้น ณ วันนี้\nไม่ใช่เพื่อสมบูรณ์แบบ แต่เพื่อก้าวต่อไปทีละวัน”`
                  : `“I, ${draft.nickname || 'Player'}, choose to awaken today.\nNot for perfection, but to move forward one day at a time.”`}
              </Text>
              <Text style={styles.pledgeGoalSub}>
                Vow: “{draft.vow || (isTh ? 'ตื่นมาแล้วรู้สึกมีแรง' : 'Wake up feeling energized and ready')}”
              </Text>
            </View>

            {/* 3-Second Hold Button */}
            <Pressable
              onPressIn={startHoldPledge}
              onPressOut={stopHold}
              style={[
                styles.holdPledgeBtn,
                isHoldingPledge && { borderColor: '#3DDC97', transform: [{ scale: 0.98 }] },
              ]}
            >
              <View
                style={[
                  styles.holdFillBar,
                  { width: `${holdPercent}%` },
                ]}
              />
              <Text style={styles.holdPledgeBtnText}>
                {isHoldingPledge
                  ? isTh
                    ? `กำลังปลุกพลัง... ${holdPercent}%`
                    : `Awakening... ${holdPercent}%`
                  : isTh
                  ? '[ กดค้าง 3 วินาที: ฉันยอมรับพันธสัญญา พร้อมเริ่มต้นเลเวล 1 ]'
                  : '[ Hold 3 Seconds: I Accept the Pledge — Start Level 1 ]'}
              </Text>
            </Pressable>

            {/* Accessibility Single-Tap Alternative (Section 4.5 & 10.4) */}
            <Pressable
              style={styles.singleTapAccessBtn}
              onPress={triggerPledgeSuccess}
            >
              <Text style={styles.singleTapAccessText}>
                {isTh
                  ? 'แตะครั้งเดียวเพื่อยอมรับพันธสัญญา (ทางเลือกเมื่อไม่สะดวกกดค้าง)'
                  : 'Single-tap to accept pledge (Accessibility option)'}
              </Text>
            </Pressable>

            {/* Non-Confirmshaming Secondary Button (Section 0.3 & 4.5) */}
            <Pressable
              style={styles.notReadyBtn}
              onPress={() => onFinishOnboarding(draft, false)}
            >
              <Text style={styles.notReadyBtnText}>
                {isTh
                  ? 'ยังไม่พร้อมตอนนี้ — กลับมาเมื่อไรก็ได้'
                  : 'Not ready right now — Come back anytime'}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Bottom Next Button for Q1..Q20 */}
      {currentStep !== 'Q21' && (
        <View style={styles.bottomBar}>
          <AnimatedPressable
            reduceMotion={reduceMotion}
            style={[
              styles.nextPrimaryBtn,
              draft.ageBand === 'under_13' && currentStep === 'Q2' && { backgroundColor: '#F59E0B' },
            ]}
            onPress={goNext}
          >
            <Text style={styles.nextPrimaryBtnText}>
              {isTh ? 'ต่อไป →' : 'Continue →'}
            </Text>
          </AnimatedPressable>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  welcomeTopBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  welcomeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  welcomeGlowCircle: {
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: 'rgba(91, 140, 255, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(61, 220, 151, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  welcomeSystemBadge: {
    color: '#3DDC97',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: 14,
  },
  welcomeQuoteMain: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 14,
  },
  welcomeSubDesc: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(20, 28, 61, 0.85)',
    borderColor: '#243156',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  disclaimerText: {
    flex: 1,
    color: '#CBD5E1',
    fontSize: 11.5,
    lineHeight: 17,
  },
  welcomePrimaryBtn: {
    backgroundColor: '#3DDC97',
    paddingVertical: 15,
    paddingHorizontal: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 360,
  },
  welcomePrimaryBtnText: {
    color: '#090D1C',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  welcomeSkipAllBtn: {
    marginTop: 18,
    paddingVertical: 8,
  },
  welcomeSkipAllText: {
    color: '#64748B',
    fontSize: 12.5,
    fontWeight: '700',
  },
  topHeader: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    paddingVertical: 6,
    paddingRight: 8,
  },
  ringCenterWrap: {
    alignItems: 'center',
  },
  ringSegmentsRow: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 4,
  },
  ringSegmentPill: {
    height: 5,
    borderRadius: 3,
  },
  phaseLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  rightHeaderBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langMiniChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#243156',
    backgroundColor: '#131B36',
  },
  skipBtn: {
    paddingVertical: 6,
    paddingLeft: 4,
  },
  questionScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  stepBlock: {
    gap: 10,
  },
  qTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 28,
    marginBottom: 2,
  },
  qHint: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  textInputBox: {
    backgroundColor: '#131B36',
    borderColor: '#5B8CFF',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  presetChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#131B36',
    borderWidth: 1,
    borderColor: '#243156',
  },
  presetChipActive: {
    borderColor: '#3DDC97',
    backgroundColor: 'rgba(61, 220, 151, 0.16)',
  },
  activityChip: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#131B36',
    borderWidth: 1,
    borderColor: '#243156',
  },
  presetList: {
    gap: 8,
    marginTop: 8,
  },
  vowSampleBtn: {
    padding: 13,
    borderRadius: 12,
    backgroundColor: '#131B36',
    borderWidth: 1,
    borderColor: '#243156',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 15,
    borderWidth: 1.5,
    gap: 12,
  },
  optionIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
  },
  optionSubtitle: {
    color: '#94A3B8',
    fontSize: 12.5,
    marginTop: 3,
    lineHeight: 18,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(61, 220, 151, 0.12)',
    borderWidth: 1,
    borderColor: '#3DDC97',
    marginTop: 6,
  },
  safetyNoticeText: {
    flex: 1,
    color: '#E2E8F0',
    fontSize: 12,
    lineHeight: 18,
  },
  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 11,
    borderRadius: 12,
    backgroundColor: 'rgba(61, 220, 151, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(61, 220, 151, 0.4)',
    marginBottom: 6,
  },
  privacyBannerText: {
    flex: 1,
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 17,
  },
  energyScaleRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  energyBtn: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  energyLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  interstitialContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  interstitialIconWrap: {
    marginBottom: 28,
  },
  interstitialQuote1: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 30,
  },
  interstitialQuote2: {
    color: '#3DDC97',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 25,
  },
  pledgeVowCard: {
    backgroundColor: '#131B36',
    borderColor: '#5B8CFF',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 18,
    marginVertical: 10,
    alignItems: 'center',
  },
  pledgeVowText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 25,
  },
  pledgeGoalSub: {
    color: '#3DDC97',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
  },
  holdPledgeBtn: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#1A254B',
    borderColor: '#5B8CFF',
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  holdFillBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(61, 220, 151, 0.35)',
  },
  holdPledgeBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    textAlign: 'center',
  },
  singleTapAccessBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  singleTapAccessText: {
    color: '#5B8CFF',
    fontSize: 12.5,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  notReadyBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  notReadyBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  nextPrimaryBtn: {
    backgroundColor: '#5B8CFF',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextPrimaryBtnText: {
    color: '#090D1C',
    fontWeight: '900',
    fontSize: 16,
  },
  statusScroll: {
    padding: 18,
    paddingBottom: 40,
  },
  statusWindowCard: {
    backgroundColor: '#131B36',
    borderColor: '#5B8CFF',
    borderWidth: 2,
    borderRadius: 20,
    padding: 20,
  },
  statusHeaderCenter: {
    alignItems: 'center',
    marginBottom: 14,
  },
  statusTitleBanner: {
    color: '#5B8CFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 8,
  },
  xpBonusBadge: {
    marginTop: 6,
    backgroundColor: 'rgba(61, 220, 151, 0.18)',
    borderColor: '#3DDC97',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  xpBonusBadgeText: {
    color: '#3DDC97',
    fontWeight: '800',
    fontSize: 12,
  },
  statusIdentityBox: {
    backgroundColor: '#0C1226',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#243156',
    marginBottom: 14,
    gap: 4,
  },
  statusPlayerName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  statusMetaLine: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
  },
  statsSection: {
    gap: 10,
    marginBottom: 16,
  },
  statBarRow: {
    gap: 4,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statKeyText: {
    fontWeight: '900',
    fontSize: 13,
    width: 38,
  },
  statDescText: {
    flex: 1,
    color: '#94A3B8',
    fontSize: 12,
  },
  statValText: {
    fontWeight: '900',
    fontSize: 13,
  },
  vowBox: {
    backgroundColor: 'rgba(91, 140, 255, 0.10)',
    borderColor: '#5B8CFF',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  vowLabel: {
    color: '#94A3B8',
    fontSize: 11.5,
    fontWeight: '700',
  },
  vowQuote: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 4,
  },
  narratorQuote: {
    color: '#3DDC97',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  questPreviewHeader: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  questPreviewItem: {
    backgroundColor: '#0C1226',
    borderRadius: 10,
    padding: 11,
    borderWidth: 1,
    borderColor: '#243156',
    marginBottom: 6,
  },
  questPreviewTitle: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
  },
  questPreviewMeta: {
    color: '#5B8CFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});
