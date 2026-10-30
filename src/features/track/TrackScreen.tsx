import React, { useState } from 'react';
import {
  Modal,
  NativeModules,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppTheme, colors, radius, stroke } from '../../app/theme';
import { SegmentedTabs } from '../components/InkComponents';
import { DeleteActivityPreview, useAwakened } from '../../data/repository';
import { t } from '../../l10n/translations';
import {
  ActivityType,
  CustomIntensity,
  MealSlot,
} from '../../core/engine/types';
import { canRevertXpOnDelete } from '../../core/engine/xpEngine';
import {
  addDaysToDayKey,
  formatTimeHHMM,
  getLocalDayKey,
} from '../../core/utils/dateUtils';
import {
  analyzeFoodImageOnDevice,
  FoodScanResult,
  scaleFoodPortion,
  searchThaiFoodDatabase,
  ThaiFoodItem,
} from '../../services/foodScannerService';
import { AppIcon, AppIconName } from '../components/AppIcons';
import {
  AnimatedBarColumn,
  AnimatedCard,
  AnimatedNumberText,
  AnimatedPressable,
  AnimatedProgressBar,
  AnimatedScreenWrapper,
} from '../components/AnimatedComponents';

export const TrackScreen: React.FC<{ theme: AppTheme }> = ({ theme }) => {
  const {
    db,
    todayKey,
    todayMetrics,
    dailyNutrition,
    logWater,
    logMeal,
    addCustomFoodTemplate,
    logCustomActivity,
    previewDeleteActivity,
    deleteActivity,
    updateProfile,
    recordAppEvent,
  } = useAwakened();

  const [subTab, setSubTab] = useState<'water' | 'food' | 'custom' | 'timeline'>('water');
  const [pendingDeletePreview, setPendingDeletePreview] =
    useState<DeleteActivityPreview | null>(null);
  const [showLedgerView, setShowLedgerView] = useState(false);
  const lang = db.profile.language;
  const strings = t(lang);
  const isTh = lang === 'th';
  const reduceMotion = db.profile.reduceEffects;

  // Water state
  const [customWaterMl, setCustomWaterMl] = useState('350');
  const [goalInput, setGoalInput] = useState(String(db.profile.waterGoalMl));

  // Food state
  const [foodMode, setFoodMode] = useState<'db' | 'scan' | 'manual' | 'create_template'>('db');
  const [mealSlot, setMealSlot] = useState<MealSlot>('lunch');
  const [searchQuery, setSearchQuery] = useState('');
  const [portionMultiplier, setPortionMultiplier] = useState<number>(1.0);

  // Manual food state
  const [manualFoodName, setManualFoodName] = useState('');
  const [manualKcal, setManualKcal] = useState('450');
  const [manualProtein, setManualProtein] = useState('25');
  const [manualCarbs, setManualCarbs] = useState('50');
  const [manualFat, setManualFat] = useState('15');

  // AI Scanner state
  const [scanHint, setScanHint] = useState('ข้าวกะเพราไก่ไข่ดาว');
  const [scanResult, setScanResult] = useState<FoodScanResult | null>(() =>
    analyzeFoodImageOnDevice('ข้าวกะเพราไก่ไข่ดาว')
  );
  const [selectedCandidateIdx, setSelectedCandidateIdx] = useState(0);
  const [editableScanKcal, setEditableScanKcal] = useState('630');

  // Custom Activity state
  const [customTitle, setCustomTitle] = useState('');
  const [customMinutes] = useState('20');
  const [customIntensity, setCustomIntensity] = useState<CustomIntensity>('mid');
  const [isBackdatedDemo, setIsBackdatedDemo] = useState(false);

  // Timeline filter state
  const [timelineFilter, setTimelineFilter] = useState<'all' | ActivityType>('all');
  const [deleteBanner, setDeleteBanner] = useState<string | null>(null);

  const foodResults = searchThaiFoodDatabase(searchQuery, db.customFoods);

  // 7-day water history
  const last7Days = Array.from({ length: 7 }, (_, i) =>
    addDaysToDayKey(todayKey, -(6 - i))
  );

  const handlePickCameraOrGallery = async () => {
    try {
      if (NativeModules?.AwakenedNative?.pickImage) {
        const pickedName: string | null = await NativeModules.AwakenedNative.pickImage();
        if (pickedName) {
          const analyzed = analyzeFoodImageOnDevice(pickedName, db.customFoods);
          setScanResult(analyzed);
          setSelectedCandidateIdx(0);
          setEditableScanKcal(String(analyzed.candidates[0]?.food.calories_est ?? 500));
          return;
        }
      }
      const analyzed = analyzeFoodImageOnDevice(scanHint, db.customFoods);
      setScanResult(analyzed);
      setSelectedCandidateIdx(0);
      setEditableScanKcal(String(analyzed.candidates[0]?.food.calories_est ?? 500));
    } catch {
      const analyzed = analyzeFoodImageOnDevice(scanHint, db.customFoods);
      setScanResult(analyzed);
      setSelectedCandidateIdx(0);
      setEditableScanKcal(String(analyzed.candidates[0]?.food.calories_est ?? 500));
    }
  };

  const handleRunSimulatedScan = (dishHint: string) => {
    setScanHint(dishHint);
    const analyzed = analyzeFoodImageOnDevice(dishHint, db.customFoods);
    setScanResult(analyzed);
    setSelectedCandidateIdx(0);
    setEditableScanKcal(String(analyzed.candidates[0]?.food.calories_est ?? 500));
  };

  const waterPct = Math.min(
    100,
    Math.round((todayMetrics.water_ml / Math.max(1, db.profile.waterGoalMl)) * 100)
  );

  const subTabs: ReadonlyArray<{
    id: 'water' | 'food' | 'custom' | 'timeline';
    icon: AppIconName;
    label: string;
  }> = [
    { id: 'water', icon: 'water', label: strings.track.waterTab },
    { id: 'food', icon: 'meal', label: strings.track.foodTab },
    { id: 'custom', icon: 'bolt', label: strings.track.customTab },
    { id: 'timeline', icon: 'clock', label: strings.track.timelineTab },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Segmented Tabs Bar (Ink / Cream / Peach v0.10.6) */}
      <SegmentedTabs
        tabs={subTabs}
        activeId={subTab}
        onSelect={setSubTab}
        theme={theme}
        style={{ marginHorizontal: 16, marginTop: 10 }}
      />

      <AnimatedScreenWrapper triggerKey={subTab} reduceMotion={reduceMotion}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* 1. WATER TRACKER */}
          {subTab === 'water' && (
            <>
              <AnimatedCard
                index={0}
                reduceMotion={reduceMotion}
                style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <View style={styles.inlineIconRow}>
                  <AppIcon name="water" size={18} color={theme.water} />
                  <AnimatedNumberText
                    value={todayMetrics.water_ml}
                    reduceMotion={reduceMotion}
                    style={[styles.cardTitle, { color: theme.text }]}
                  >
                    {strings.home.waterToday}: {todayMetrics.water_ml.toLocaleString()} /{' '}
                    {db.profile.waterGoalMl.toLocaleString()} ml
                  </AnimatedNumberText>
                </View>
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>
                  {strings.track.waterQuickAdd} · {strings.track.waterGoalBonus}
                </Text>

                <AnimatedProgressBar
                  percent={waterPct}
                  fillColor={theme.water}
                  trackColor={theme.bgSecondary}
                  borderColor={theme.border}
                  height={14}
                  reduceMotion={reduceMotion}
                  style={{ marginVertical: 12 }}
                />

                <View style={styles.waterGrid}>
                  {[100, 150, 250, 500].map((ml) => (
                    <AnimatedPressable
                      key={ml}
                      reduceMotion={reduceMotion}
                      style={[
                        styles.waterBigBtn,
                        { backgroundColor: `${theme.water}18`, borderColor: theme.water },
                      ]}
                      onPress={() => logWater(ml)}
                    >
                      <AppIcon name="water" size={20} color={theme.water} />
                      <Text style={{ color: theme.water, fontWeight: '900', fontSize: 16 }}>
                        +{ml} ml
                      </Text>
                      <Text style={{ color: theme.textMuted, fontSize: 11 }}>+2 XP</Text>
                    </AnimatedPressable>
                  ))}
                </View>

                {/* Custom water amount */}
                <View style={styles.inlineInputRow}>
                  <TextInput
                    value={customWaterMl}
                    onChangeText={setCustomWaterMl}
                    keyboardType="numeric"
                    placeholder="ml"
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
                  <AnimatedPressable
                    reduceMotion={reduceMotion}
                    style={[styles.primaryBtn, { backgroundColor: theme.water }]}
                    onPress={() => logWater(Number(customWaterMl) || 200)}
                  >
                    <Text style={styles.primaryBtnText}>
                      {isTh ? '+ บันทึกปริมาณกำหนดเอง' : '+ Log Custom ml'}
                    </Text>
                  </AnimatedPressable>
                </View>
              </AnimatedCard>

              {/* Daily Goal Setting + 7-Day Chart */}
              <AnimatedCard
                index={1}
                reduceMotion={reduceMotion}
                style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <View style={styles.inlineIconRow}>
                  <AppIcon name="chart" size={18} color={theme.water} />
                  <Text style={[styles.cardTitle, { color: theme.text }]}>
                    {isTh ? 'กราฟการดื่มน้ำ 7 วันย้อนหลัง' : '7-Day Hydration History'}
                  </Text>
                </View>
                <View style={styles.chartRow}>
                  {last7Days.map((dk, idx) => {
                    const ml = db.activities
                      .filter(
                        (a) =>
                          !a.deletedAt &&
                          a.type === 'water' &&
                          getLocalDayKey(a.occurredAt, a.tzOffsetMin) === dk
                      )
                      .reduce((s, a) => s + a.value, 0);
                    const hPct = Math.min(
                      100,
                      Math.max(6, Math.round((ml / Math.max(1, db.profile.waterGoalMl)) * 100))
                    );
                    return (
                      <View key={dk} style={styles.chartBarCol}>
                        <Text style={{ color: theme.textMuted, fontSize: 10 }}>
                          {ml > 0 ? `${Math.round(ml / 100) / 10}L` : '0'}
                        </Text>
                        <AnimatedBarColumn
                          percent={hPct}
                          color={ml >= db.profile.waterGoalMl ? theme.success : theme.water}
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

                <View style={[styles.inlineInputRow, { marginTop: 14 }]}>
                  <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                    {isTh ? 'เป้าหมายน้ำ/วัน (ml):' : 'Daily Water Goal (ml):'}
                  </Text>
                  <TextInput
                    value={goalInput}
                    onChangeText={setGoalInput}
                    keyboardType="numeric"
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
                  <AnimatedPressable
                    reduceMotion={reduceMotion}
                    style={[styles.secondaryBtn, { borderColor: theme.primary }]}
                    onPress={() =>
                      updateProfile({
                        waterGoalMl: Math.max(500, Number(goalInput) || 2000),
                      })
                    }
                  >
                    <Text style={{ color: theme.primary, fontWeight: '800', fontSize: 12 }}>
                      {isTh ? 'บันทึกเป้า' : 'Save Goal'}
                    </Text>
                  </AnimatedPressable>
                </View>
              </AnimatedCard>
            </>
          )}

          {/* 2. FOOD TRACKER & AI SCANNER */}
          {subTab === 'food' && (
            <>
              <AnimatedCard
                index={0}
                reduceMotion={reduceMotion}
                style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <View style={styles.inlineIconRow}>
                  <AppIcon name="meal" size={18} color={theme.meal} />
                  <Text style={[styles.cardTitle, { color: theme.text }]}>
                    {isTh ? 'บันทึกมื้ออาหาร (+8 XP)' : 'Log Meal (+8 XP)'}
                  </Text>
                </View>
                <Text style={{ color: theme.success, fontSize: 12, marginTop: 4 }}>
                  {strings.track.noCaloriePenaltyNote}
                </Text>

                {/* Daily Calorie & Macro Summary Card */}
                <View
                  style={{
                    backgroundColor: theme.bgSecondary,
                    borderColor: `${theme.meal}44`,
                    borderWidth: 1,
                    borderRadius: 12,
                    padding: 12,
                    marginTop: 10,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={styles.inlineIconRow}>
                      <AppIcon name="meal" size={15} color={theme.meal} />
                      <Text style={{ color: theme.text, fontSize: 13, fontWeight: '800' }}>
                        {isTh ? 'รวมแคลอรี่วันนี้ (สรุป)' : "Today's Calorie Summary"}
                      </Text>
                    </View>
                    <Text style={{ color: theme.meal, fontSize: 15, fontWeight: '900' }}>
                      {dailyNutrition.kcal.toLocaleString()} kcal
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: `${theme.primary}15`,
                        padding: 6,
                        borderRadius: 8,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: theme.textMuted, fontSize: 10 }}>
                        {isTh ? 'โปรตีน' : 'Protein'}
                      </Text>
                      <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '800', marginTop: 2 }}>
                        {dailyNutrition.proteinG}g
                      </Text>
                    </View>
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: `${theme.warning}15`,
                        padding: 6,
                        borderRadius: 8,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: theme.textMuted, fontSize: 10 }}>
                        {isTh ? 'คาร์โบไฮเดรต' : 'Carbs'}
                      </Text>
                      <Text style={{ color: theme.warning, fontSize: 12, fontWeight: '800', marginTop: 2 }}>
                        {dailyNutrition.carbsG}g
                      </Text>
                    </View>
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: `${theme.danger}15`,
                        padding: 6,
                        borderRadius: 8,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: theme.textMuted, fontSize: 10 }}>
                        {isTh ? 'ไขมัน' : 'Fat'}
                      </Text>
                      <Text style={{ color: theme.danger, fontSize: 12, fontWeight: '800', marginTop: 2 }}>
                        {dailyNutrition.fatG}g
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginTop: 8,
                      paddingTop: 6,
                      borderTopWidth: 1,
                      borderTopColor: `${theme.border}44`,
                    }}
                  >
                    <Text style={{ color: theme.textMuted, fontSize: 11 }}>
                      {isTh
                        ? `เช้า ${dailyNutrition.bySlot.breakfast} · กลางวัน ${dailyNutrition.bySlot.lunch} · เย็น ${dailyNutrition.bySlot.dinner} · ของว่าง ${dailyNutrition.bySlot.snack} kcal`
                        : `B: ${dailyNutrition.bySlot.breakfast} · L: ${dailyNutrition.bySlot.lunch} · D: ${dailyNutrition.bySlot.dinner} · S: ${dailyNutrition.bySlot.snack} kcal`}
                    </Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '700' }}>
                      {dailyNutrition.mealCount} {isTh ? 'มื้อ' : 'meals'}
                    </Text>
                  </View>
                </View>

                {/* Meal Slot Selector */}
                <View style={[styles.chipRow, { marginTop: 10 }]}>
                  {(['breakfast', 'lunch', 'dinner', 'snack'] as MealSlot[]).map((slot) => {
                    const active = mealSlot === slot;
                    return (
                      <AnimatedPressable
                        key={slot}
                        reduceMotion={reduceMotion}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: active ? `${theme.meal}25` : theme.bgSecondary,
                            borderColor: active ? theme.meal : theme.border,
                          },
                        ]}
                        onPress={() => setMealSlot(slot)}
                      >
                        <Text
                          style={{
                            color: active ? theme.meal : theme.textSecondary,
                            fontWeight: '800',
                            fontSize: 12,
                          }}
                        >
                          {strings.track.mealSlots[slot]}
                        </Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>

                {/* Food Mode Switcher */}
                <View style={[styles.chipRow, { marginTop: 10 }]}>
                  {(
                    [
                      { id: 'db', icon: 'search' as AppIconName, label: strings.track.searchThaiFood },
                      { id: 'scan', icon: 'scan' as AppIconName, label: strings.track.aiFoodScanner },
                      { id: 'manual', icon: 'edit' as AppIconName, label: strings.track.manualFood },
                      {
                        id: 'create_template',
                        icon: 'plus' as AppIconName,
                        label: isTh ? 'สร้างอาหารของฉัน' : 'Create My Food',
                      },
                    ] as const
                  ).map((m) => {
                    const active = foodMode === m.id;
                    return (
                      <AnimatedPressable
                        key={m.id}
                        reduceMotion={reduceMotion}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: active ? `${theme.primary}25` : theme.bgSecondary,
                            borderColor: active ? theme.primary : theme.border,
                          },
                        ]}
                        onPress={() => setFoodMode(m.id)}
                      >
                        <View style={styles.inlineIconRow}>
                          <AppIcon
                            name={m.icon}
                            size={13}
                            color={active ? theme.primary : theme.textSecondary}
                          />
                          <Text
                            style={{
                              color: active ? theme.primary : theme.textSecondary,
                              fontWeight: '800',
                              fontSize: 12,
                            }}
                          >
                            {m.label}
                          </Text>
                        </View>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </AnimatedCard>

              {/* Mode A: Thai Food DB Search */}
              {foodMode === 'db' && (
                <AnimatedCard
                  index={1}
                  reduceMotion={reduceMotion}
                  style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder={
                      isTh
                        ? 'ค้นหาอาหารไทย เช่น กะเพรา, ข้าวมันไก่, ส้มตำ, โจ๊ก...'
                        : 'Search Thai dishes e.g. Pad Thai, Kra Pao, Congee...'
                    }
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

                  {/* Portion Size Selector */}
                  <View style={[styles.chipRow, { marginBottom: 12 }]}>
                    {[
                      { mult: 0.75, label: isTh ? 'จานเล็ก (0.75x)' : 'Small (0.75x)' },
                      { mult: 1.0, label: isTh ? 'จานปกติ (1.0x)' : 'Regular (1.0x)' },
                      { mult: 1.35, label: isTh ? 'พิเศษ/จานใหญ่ (1.35x)' : 'Large (1.35x)' },
                    ].map((p) => {
                      const active = portionMultiplier === p.mult;
                      return (
                        <AnimatedPressable
                          key={p.mult}
                          reduceMotion={reduceMotion}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: active ? `${theme.success}22` : theme.bgSecondary,
                              borderColor: active ? theme.success : theme.border,
                            },
                          ]}
                          onPress={() => setPortionMultiplier(p.mult)}
                        >
                          <Text
                            style={{
                              color: active ? theme.success : theme.textSecondary,
                              fontSize: 12,
                              fontWeight: '700',
                            }}
                          >
                            {p.label}
                          </Text>
                        </AnimatedPressable>
                      );
                    })}
                  </View>

                  {foodResults.map((dish: ThaiFoodItem) => {
                    const scaled = scaleFoodPortion(dish, portionMultiplier);
                    return (
                      <View
                        key={dish.id}
                        style={[
                          styles.foodItemRow,
                          { backgroundColor: theme.bgSecondary, borderColor: theme.border },
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: theme.text, fontWeight: '800', fontSize: 14 }}>
                            {isTh ? dish.name_th : dish.name_en}
                          </Text>
                          <View style={styles.estimateRow}>
                            <Text style={{ color: theme.meal, fontWeight: '700', fontSize: 12 }}>
                              ~{scaled.caloriesMin}–{scaled.caloriesMax} kcal
                            </Text>
                            <View
                              style={[
                                styles.estimateBadge,
                                { backgroundColor: `${theme.warning}22`, borderColor: theme.warning },
                              ]}
                            >
                              <Text style={{ color: theme.warning, fontSize: 10, fontWeight: '800' }}>
                                {strings.track.estimateBadge}
                              </Text>
                            </View>
                          </View>
                          <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 2 }}>
                            P: {scaled.proteinG}g · C: {scaled.carbsG}g · F: {scaled.fatG}g
                          </Text>
                        </View>

                        <AnimatedPressable
                          reduceMotion={reduceMotion}
                          style={[styles.primaryBtn, { backgroundColor: theme.meal }]}
                          onPress={() =>
                            logMeal(isTh ? dish.name_th : dish.name_en, {
                              mealSlot,
                              caloriesEst: scaled.caloriesEst,
                              caloriesMin: scaled.caloriesMin,
                              caloriesMax: scaled.caloriesMax,
                              proteinG: scaled.proteinG,
                              carbsG: scaled.carbsG,
                              fatG: scaled.fatG,
                              isEstimate: true,
                              source: 'database',
                            })
                          }
                        >
                          <Text style={styles.primaryBtnText}>+8 XP</Text>
                        </AnimatedPressable>
                      </View>
                    );
                  })}
                </AnimatedCard>
              )}

              {/* Mode B: AI Food Scanner (Section 12) */}
              {foodMode === 'scan' && (
                <AnimatedCard
                  index={1}
                  reduceMotion={reduceMotion}
                  style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                  <View style={styles.inlineIconRow}>
                    <AppIcon name="scan" size={18} color={theme.primary} />
                    <Text style={[styles.cardTitle, { color: theme.text }]}>
                      {strings.track.aiFoodScanner} (On-Device)
                    </Text>
                  </View>
                  <Text style={{ color: theme.warning, fontSize: 12, marginTop: 4, lineHeight: 18 }}>
                    {strings.track.scanWarning}
                  </Text>

                  <View style={[styles.inlineInputRow, { marginTop: 12 }]}>
                    <AnimatedPressable
                      reduceMotion={reduceMotion}
                      style={[styles.primaryBtn, { backgroundColor: theme.primary, flex: 1, alignItems: 'center' }]}
                      onPress={handlePickCameraOrGallery}
                    >
                      <View style={styles.inlineIconRow}>
                        <AppIcon name="scan" size={16} color="#0E1220" />
                        <Text style={styles.primaryBtnText}>
                          {isTh ? 'เลือกรูป / ถ่ายรูปอาหาร' : 'Pick Photo / Camera'}
                        </Text>
                      </View>
                    </AnimatedPressable>
                  </View>

                  <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 12, marginBottom: 6 }}>
                    {isTh
                      ? 'หรือทดสอบ AI จำแนกภาพอาหารจานด่วน (ลบพิกัด EXIF อัตโนมัติ):'
                      : 'Or test on-device dish recognition preset (EXIF stripped):'}
                  </Text>
                  <View style={styles.chipRow}>
                    {['ข้าวกะเพราไก่', 'ข้าวมันไก่', 'ผัดไทยกุ้งสด', 'ส้มตำไทย', 'ชาไทยเย็น'].map(
                      (sample) => (
                        <AnimatedPressable
                          key={sample}
                          reduceMotion={reduceMotion}
                          style={[
                            styles.chip,
                            { backgroundColor: theme.bgSecondary, borderColor: theme.border },
                          ]}
                          onPress={() => handleRunSimulatedScan(sample)}
                        >
                          <View style={styles.inlineIconRow}>
                            <AppIcon name="search" size={12} color={theme.primary} />
                            <Text style={{ color: theme.text, fontSize: 12 }}>{sample}</Text>
                          </View>
                        </AnimatedPressable>
                      )
                    )}
                  </View>

                  {scanResult && (
                    <View
                      style={[
                        styles.scanResultBox,
                        { backgroundColor: theme.bgSecondary, borderColor: theme.primary },
                      ]}
                    >
                      <View style={styles.cardHeaderRow}>
                        <Text style={{ color: theme.primary, fontWeight: '800', fontSize: 13 }}>
                          Top-3 Candidates
                        </Text>
                        <View
                          style={[
                            styles.estimateBadge,
                            { backgroundColor: `${theme.warning}25`, borderColor: theme.warning },
                          ]}
                        >
                          <Text style={{ color: theme.warning, fontSize: 10, fontWeight: '800' }}>
                            {strings.track.scanEstimateBadge} · EXIF Stripped
                          </Text>
                        </View>
                      </View>

                      {scanResult.candidates.map((cand, idx) => {
                        const selected = selectedCandidateIdx === idx;
                        const confPct = Math.round(cand.confidence * 100);
                        return (
                          <Pressable
                            key={cand.food.id}
                            style={[
                              styles.foodItemRow,
                              {
                                backgroundColor: selected ? `${theme.primary}20` : theme.card,
                                borderColor: selected ? theme.primary : theme.border,
                              },
                            ]}
                            onPress={() => {
                              setSelectedCandidateIdx(idx);
                              setEditableScanKcal(String(cand.food.calories_est));
                            }}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: theme.text, fontWeight: '800', fontSize: 13 }}>
                                #{idx + 1} {isTh ? cand.food.name_th : cand.food.name_en}
                              </Text>
                              <Text style={{ color: theme.meal, fontSize: 12, fontWeight: '700' }}>
                                {isTh ? 'ประมาณ' : 'Est.'} {cand.food.calories_min}–
                                {cand.food.calories_max} kcal
                              </Text>
                            </View>
                            <Text
                              style={{
                                color:
                                  cand.confidenceLevel === 'high'
                                    ? theme.success
                                    : cand.confidenceLevel === 'medium'
                                    ? theme.warning
                                    : theme.danger,
                                fontWeight: '800',
                                fontSize: 12,
                              }}
                            >
                              {confPct}% ({cand.confidenceLevel.toUpperCase()})
                            </Text>
                          </Pressable>
                        );
                      })}

                      <View style={[styles.inlineInputRow, { marginTop: 8 }]}>
                        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                          {isTh ? 'ปรับแก้แคลอรีได้ (kcal):' : 'Adjust kcal:'}
                        </Text>
                        <TextInput
                          value={editableScanKcal}
                          onChangeText={setEditableScanKcal}
                          keyboardType="numeric"
                          style={[
                            styles.input,
                            {
                              width: 85,
                              backgroundColor: theme.card,
                              color: theme.text,
                              borderColor: theme.border,
                            },
                          ]}
                        />
                        <AnimatedPressable
                          reduceMotion={reduceMotion}
                          style={[styles.primaryBtn, { backgroundColor: theme.success, flex: 1, alignItems: 'center' }]}
                          onPress={() => {
                            const chosen =
                              scanResult.candidates[selectedCandidateIdx] ?? scanResult.candidates[0];
                            if (!chosen) return;
                            const editedKcal = Number(editableScanKcal) || chosen.food.calories_est;
                            if (
                              selectedCandidateIdx > 0 ||
                              editedKcal !== chosen.food.calories_est
                            ) {
                              recordAppEvent('scan_corrections_total', 1);
                            }
                            logMeal(isTh ? chosen.food.name_th : chosen.food.name_en, {
                              mealSlot,
                              caloriesEst: editedKcal,
                              caloriesMin: chosen.food.calories_min,
                              caloriesMax: chosen.food.calories_max,
                              proteinG: chosen.food.protein_g,
                              carbsG: chosen.food.carbs_g,
                              fatG: chosen.food.fat_g,
                              isEstimate: true,
                              source: 'scan',
                              confidence: chosen.confidence,
                            });
                          }}
                        >
                          <Text style={styles.primaryBtnText}>
                            {isTh ? 'ยืนยัน (+8 XP)' : 'Confirm (+8 XP)'}
                          </Text>
                        </AnimatedPressable>
                      </View>
                    </View>
                  )}
                </AnimatedCard>
              )}

              {/* Mode C & D: Manual Entry or Create Custom Food Template */}
              {(foodMode === 'manual' || foodMode === 'create_template') && (
                <AnimatedCard
                  index={1}
                  reduceMotion={reduceMotion}
                  style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                  <View style={[styles.inlineIconRow, { marginBottom: 10 }]}>
                    <AppIcon
                      name={foodMode === 'create_template' ? 'plus' : 'edit'}
                      size={16}
                      color={theme.primary}
                    />
                    <Text style={[styles.cardTitle, { color: theme.text }]}>
                      {foodMode === 'create_template'
                        ? isTh
                          ? 'สร้างเทมเพลตอาหารของฉัน'
                          : 'Save Custom Food Template'
                        : isTh
                        ? 'บันทึกอาหารด้วยตนเอง'
                        : 'Manual Meal Log'}
                    </Text>
                  </View>

                  <TextInput
                    value={manualFoodName}
                    onChangeText={setManualFoodName}
                    placeholder={isTh ? 'ชื่อเมนูอาหาร...' : 'Food name...'}
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

                  <View style={styles.inlineInputRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.textMuted, fontSize: 11 }}>kcal</Text>
                      <TextInput
                        value={manualKcal}
                        onChangeText={setManualKcal}
                        keyboardType="numeric"
                        style={[
                          styles.input,
                          { backgroundColor: theme.bgSecondary, color: theme.text, borderColor: theme.border },
                        ]}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.textMuted, fontSize: 11 }}>Protein (g)</Text>
                      <TextInput
                        value={manualProtein}
                        onChangeText={setManualProtein}
                        keyboardType="numeric"
                        style={[
                          styles.input,
                          { backgroundColor: theme.bgSecondary, color: theme.text, borderColor: theme.border },
                        ]}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.textMuted, fontSize: 11 }}>Carbs (g)</Text>
                      <TextInput
                        value={manualCarbs}
                        onChangeText={setManualCarbs}
                        keyboardType="numeric"
                        style={[
                          styles.input,
                          { backgroundColor: theme.bgSecondary, color: theme.text, borderColor: theme.border },
                        ]}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.textMuted, fontSize: 11 }}>Fat (g)</Text>
                      <TextInput
                        value={manualFat}
                        onChangeText={setManualFat}
                        keyboardType="numeric"
                        style={[
                          styles.input,
                          { backgroundColor: theme.bgSecondary, color: theme.text, borderColor: theme.border },
                        ]}
                      />
                    </View>
                  </View>

                  <AnimatedPressable
                    reduceMotion={reduceMotion}
                    style={[
                      styles.primaryBtn,
                      { backgroundColor: theme.meal, marginTop: 12, alignItems: 'center' },
                    ]}
                    onPress={() => {
                      const name = manualFoodName.trim() || (isTh ? 'มื้ออาหารทั่วไป' : 'Custom Meal');
                      const kcal = Number(manualKcal) || 400;
                      if (foodMode === 'create_template') {
                        addCustomFoodTemplate({
                          name_th: name,
                          name_en: name,
                          category: 'custom',
                          calories_est: kcal,
                          calories_min: Math.round(kcal * 0.85),
                          calories_max: Math.round(kcal * 1.15),
                          protein_g: Number(manualProtein) || 0,
                          carbs_g: Number(manualCarbs) || 0,
                          fat_g: Number(manualFat) || 0,
                          keywords: [name],
                        });
                        setFoodMode('db');
                        setSearchQuery(name);
                      } else {
                        logMeal(name, {
                          mealSlot,
                          caloriesEst: kcal,
                          proteinG: Number(manualProtein) || 0,
                          carbsG: Number(manualCarbs) || 0,
                          fatG: Number(manualFat) || 0,
                          isEstimate: false,
                          source: 'manual',
                        });
                        setManualFoodName('');
                      }
                    }}
                  >
                    <Text style={styles.primaryBtnText}>
                      {foodMode === 'create_template'
                        ? isTh
                          ? 'บันทึกเป็นเทมเพลตอาหารของฉัน'
                          : 'Save to My Food Templates'
                        : isTh
                        ? 'บันทึกมื้ออาหาร (+8 XP)'
                        : 'Log Meal (+8 XP)'}
                    </Text>
                  </AnimatedPressable>
                </AnimatedCard>
              )}
            </>
          )}

          {/* 3. CUSTOM ACTIVITY TRACKER */}
          {subTab === 'custom' && (
            <AnimatedCard
              index={0}
              reduceMotion={reduceMotion}
              style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <View style={styles.inlineIconRow}>
                <AppIcon name="bolt" size={18} color={theme.primary} />
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  {isTh ? 'บันทึกกิจกรรมกำหนดเอง (สูงสุด 3 ครั้ง/วัน)' : 'Log Custom Activity (Max 3/day)'}
                </Text>
              </View>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4, marginBottom: 12 }}>
                {isTh
                  ? 'เช่น อ่านหนังสือ ยืดเหยียด เดินเล่น นั่งสมาธิ นอนพักผ่อน'
                  : 'e.g., Reading, Stretching, Walking, Meditation, Nap'}
              </Text>

              <View style={[styles.chipRow, { marginBottom: 10 }]}>
                {[
                  isTh ? 'อ่านหนังสือ' : 'Reading',
                  isTh ? 'ยืดเหยียด/สมาธิ' : 'Stretch/Meditate',
                  isTh ? 'เดินเล่นรับลม' : 'Casual Walk',
                  isTh ? 'นอนพักเร็ว' : 'Early Sleep',
                ].map((preset) => (
                  <AnimatedPressable
                    key={preset}
                    reduceMotion={reduceMotion}
                    style={[
                      styles.chip,
                      { backgroundColor: theme.bgSecondary, borderColor: theme.border },
                    ]}
                    onPress={() => setCustomTitle(preset)}
                  >
                    <Text style={{ color: theme.text, fontSize: 12 }}>{preset}</Text>
                  </AnimatedPressable>
                ))}
              </View>

              <TextInput
                value={customTitle}
                onChangeText={setCustomTitle}
                placeholder={isTh ? 'ชื่อกิจกรรม...' : 'Activity name...'}
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

              <View style={[styles.chipRow, { marginBottom: 10 }]}>
                {(
                  [
                    { id: 'light', label: isTh ? 'เบา (+5 XP)' : 'Light (+5 XP)' },
                    { id: 'mid', label: isTh ? 'ปานกลาง (+10 XP)' : 'Medium (+10 XP)' },
                    { id: 'hard', label: isTh ? 'เข้มข้น (+20 XP)' : 'Intense (+20 XP)' },
                  ] as const
                ).map((lv) => {
                  const active = customIntensity === lv.id;
                  return (
                    <AnimatedPressable
                      key={lv.id}
                      reduceMotion={reduceMotion}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? `${theme.primary}25` : theme.bgSecondary,
                          borderColor: active ? theme.primary : theme.border,
                        },
                      ]}
                      onPress={() => setCustomIntensity(lv.id)}
                    >
                      <Text
                        style={{
                          color: active ? theme.primary : theme.textSecondary,
                          fontWeight: '800',
                          fontSize: 12,
                        }}
                      >
                        {lv.label}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>

              <Pressable
                style={[
                  styles.chip,
                  {
                    backgroundColor: isBackdatedDemo ? `${theme.warning}22` : theme.bgSecondary,
                    borderColor: isBackdatedDemo ? theme.warning : theme.border,
                    marginBottom: 12,
                    alignSelf: 'flex-start',
                  },
                ]}
                onPress={() => setIsBackdatedDemo(!isBackdatedDemo)}
              >
                <Text style={{ color: isBackdatedDemo ? theme.warning : theme.textSecondary, fontSize: 12 }}>
                  {isBackdatedDemo ? '✓ ' : ''}
                  {isTh
                    ? 'บันทึกย้อนหลัง > 24 ชม. (ได้ XP 50% และไม่นับ Streak ตามกติกา 7.6)'
                    : 'Backfill > 24h ago (50% XP, no Streak impact per Rule 7.6)'}
                </Text>
              </Pressable>

              <AnimatedPressable
                reduceMotion={reduceMotion}
                style={[styles.primaryBtn, { backgroundColor: theme.primary, alignItems: 'center' }]}
                onPress={() => {
                  const occ = isBackdatedDemo ? Date.now() - 30 * 3600 * 1000 : Date.now();
                  logCustomActivity(
                    customTitle || (isTh ? 'กิจกรรมพัฒนาตัวเอง' : 'Self-Improvement'),
                    Number(customMinutes) || 20,
                    'min',
                    customIntensity,
                    undefined,
                    occ
                  );
                  setCustomTitle('');
                }}
              >
                <Text style={styles.primaryBtnText}>
                  {isTh ? 'บันทึกกิจกรรม' : 'Log Custom Activity'}
                </Text>
              </AnimatedPressable>
            </AnimatedCard>
          )}

          {/* 4. TIMELINE (ACTIVITY LOG & XP LEDGER) */}
          {subTab === 'timeline' && (
            <AnimatedCard
              index={0}
              reduceMotion={reduceMotion}
              style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <View style={styles.inlineIconRow}>
                  <AppIcon name="clock" size={18} color={theme.primary} />
                  <Text style={[styles.cardTitle, { color: theme.text }]}>
                    {showLedgerView
                      ? isTh
                        ? 'สมุดบัญชี EXP (XP Ledger)'
                        : 'XP Event Ledger'
                      : isTh
                      ? 'Timeline กิจกรรมทั้งหมด'
                      : 'Activity Log Timeline'}
                  </Text>
                </View>

                <AnimatedPressable
                  reduceMotion={reduceMotion}
                  onPress={() => setShowLedgerView((v) => !v)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 999,
                    backgroundColor: showLedgerView
                      ? `${theme.primary}25`
                      : theme.bgSecondary,
                    borderWidth: 1,
                    borderColor: showLedgerView ? theme.primary : theme.border,
                  }}
                >
                  <Text
                    style={{
                      color: showLedgerView ? theme.primary : theme.textSecondary,
                      fontSize: 11,
                      fontWeight: '800',
                    }}
                  >
                    {showLedgerView
                      ? isTh
                        ? 'ดูรายการกิจกรรม'
                        : 'Activity View'
                      : isTh
                      ? 'ดูบัญชี EXP'
                      : 'XP Ledger'}
                  </Text>
                </AnimatedPressable>
              </View>

              {deleteBanner && (
                <View
                  style={[
                    styles.banner,
                    { backgroundColor: `${theme.primary}20`, borderColor: theme.primary },
                  ]}
                >
                  <Text style={{ color: theme.text, fontSize: 12, fontWeight: '700' }}>
                    {deleteBanner}
                  </Text>
                </View>
              )}

              {showLedgerView ? (
                <View style={{ gap: 8 }}>
                  {db.xpEvents
                    .slice()
                    .reverse()
                    .slice(0, 60)
                    .map((ev) => {
                      const isPositive = ev.amount >= 0;
                      const isPenalty = ev.sourceType === 'penalty';
                      return (
                        <View
                          key={`${ev.id}_${ev.occurredAt}`}
                          style={[
                            styles.timelineItem,
                            {
                              backgroundColor: theme.bgSecondary,
                              borderColor: isPenalty ? `${theme.danger}66` : theme.border,
                            },
                          ]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: theme.text, fontWeight: '800', fontSize: 13 }}>
                              {ev.reasonKey} ({ev.sourceType.toUpperCase()})
                            </Text>
                            <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 2 }}>
                              {ev.dayKey ?? getLocalDayKey(ev.occurredAt)} ·{' '}
                              {formatTimeHHMM(ev.occurredAt)}
                              {isPenalty
                                ? isTh
                                  ? ' · [รายการระบบ ลบไม่ได้]'
                                  : ' · [Locked System Entry]'
                                : ''}
                            </Text>
                          </View>
                          <Text
                            style={{
                              color: isPositive ? theme.success : theme.danger,
                              fontWeight: '900',
                              fontSize: 13,
                            }}
                          >
                            {isPositive ? `+${ev.amount}` : `${ev.amount}`} XP
                          </Text>
                        </View>
                      );
                    })}
                </View>
              ) : (
                <>
                  <View style={[styles.chipRow, { marginBottom: 12 }]}>
                    {(['all', 'water', 'meal', 'workout', 'focus', 'custom', 'rest'] as const).map(
                      (f) => {
                        const active = timelineFilter === f;
                        return (
                          <AnimatedPressable
                            key={f}
                            reduceMotion={reduceMotion}
                            style={[
                              styles.chip,
                              {
                                backgroundColor: active
                                  ? `${theme.primary}25`
                                  : theme.bgSecondary,
                                borderColor: active ? theme.primary : theme.border,
                              },
                            ]}
                            onPress={() => setTimelineFilter(f)}
                          >
                            <Text
                              style={{
                                color: active ? theme.primary : theme.textSecondary,
                                fontSize: 11,
                                fontWeight: '700',
                              }}
                            >
                              {f.toUpperCase()}
                            </Text>
                          </AnimatedPressable>
                        );
                      }
                    )}
                  </View>

                  {db.activities
                    .filter(
                      (a) =>
                        !a.deletedAt && (timelineFilter === 'all' || a.type === timelineFilter)
                    )
                    .map((act) => {
                      return (
                        <View
                          key={act.id}
                          style={[
                            styles.timelineItem,
                            { backgroundColor: theme.bgSecondary, borderColor: theme.border },
                          ]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: theme.text, fontWeight: '800', fontSize: 14 }}>
                              {act.title}
                            </Text>
                            <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 2 }}>
                              {getLocalDayKey(act.occurredAt, act.tzOffsetMin)}{' '}
                              {formatTimeHHMM(act.occurredAt)} · {act.value} {act.unit}
                              {act.mealDetail?.isEstimate ? ` (${strings.track.estimateBadge})` : ''}
                              {act.isBackfilled ? ' · [Backfilled 50% XP]' : ''}
                            </Text>
                          </View>

                          <View style={{ alignItems: 'flex-end', gap: 4 }}>
                            <Text style={{ color: theme.success, fontWeight: '800', fontSize: 13 }}>
                              +{act.xpAwarded} XP
                            </Text>
                            <AnimatedPressable
                              reduceMotion={reduceMotion}
                              style={[styles.deleteMiniBtn, { borderColor: theme.danger }]}
                              onPress={() => {
                                const preview = previewDeleteActivity(act.id);
                                if (preview) {
                                  setPendingDeletePreview(preview);
                                }
                              }}
                            >
                              <View style={styles.inlineIconRow}>
                                <AppIcon name="trash" size={11} color={theme.danger} />
                                <Text
                                  style={{ color: theme.danger, fontSize: 10, fontWeight: '700' }}
                                >
                                  {isTh ? 'ลบ' : 'Del'}
                                </Text>
                              </View>
                            </AnimatedPressable>
                          </View>
                        </View>
                      );
                    })}

                  {db.activities.filter((a) => !a.deletedAt).length === 0 && (
                    <Text style={{ color: theme.textMuted, textAlign: 'center', padding: 20 }}>
                      {isTh
                        ? 'ยังไม่มีรายการบันทึกวันนี้ เริ่มกดดื่มน้ำหรือบันทึกอาหารได้เลย!'
                        : 'No activities logged yet today.'}
                    </Text>
                  )}
                </>
              )}
            </AnimatedCard>
          )}
        </ScrollView>
      </AnimatedScreenWrapper>

      {/* Delete Confirmation Modal with Exact EXP & Level Impact (Section 6.5) */}
      <Modal
        visible={Boolean(pendingDeletePreview)}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingDeletePreview(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(6, 9, 18, 0.82)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          {pendingDeletePreview && (
            <View
              style={{
                width: '100%',
                maxWidth: 380,
                backgroundColor: theme.card,
                borderColor: theme.danger,
                borderWidth: 1.5,
                borderRadius: 18,
                padding: 20,
                gap: 10,
              }}
            >
              <View style={styles.inlineIconRow}>
                <AppIcon name="trash" size={18} color={theme.danger} />
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: '900' }}>
                  {isTh ? 'ยืนยันการลบรายการ' : 'Confirm Activity Deletion'}
                </Text>
              </View>

              <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '700' }}>
                “{pendingDeletePreview.title}”
              </Text>

              <View
                style={{
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: theme.bgSecondary,
                  borderWidth: 1,
                  borderColor: theme.border,
                  gap: 4,
                }}
              >
                <Text style={{ color: theme.danger, fontSize: 14, fontWeight: '900' }}>
                  {isTh
                    ? `ลบรายการนี้จะ −${pendingDeletePreview.totalXpLoss} EXP (เลเวล ${pendingDeletePreview.oldLevel} → ${pendingDeletePreview.newLevel}) ยืนยันหรือไม่?`
                    : `Deleting this item will deduct −${pendingDeletePreview.totalXpLoss} EXP (Lv.${pendingDeletePreview.oldLevel} → Lv.${pendingDeletePreview.newLevel}). Confirm?`}
                </Text>

                <Text style={{ color: theme.textMuted, fontSize: 11.5, marginTop: 2 }}>
                  {isTh
                    ? `• EXP จากรายการโดยตรง: −${pendingDeletePreview.directXp} XP`
                    : `• Direct activity XP: −${pendingDeletePreview.directXp} XP`}
                </Text>

                {pendingDeletePreview.revertedQuestXp > 0 && (
                  <Text style={{ color: theme.warning, fontSize: 11.5, fontWeight: '700' }}>
                    {isTh
                      ? `• ยกเลิกเควสที่เคยสำเร็จ: −${pendingDeletePreview.revertedQuestXp} XP (${pendingDeletePreview.revertedQuestTitles.join(', ')})`
                      : `• Reverted quest XP: −${pendingDeletePreview.revertedQuestXp} XP (${pendingDeletePreview.revertedQuestTitles.join(', ')})`}
                  </Text>
                )}

                {pendingDeletePreview.revertedBonusXp > 0 && (
                  <Text style={{ color: theme.warning, fontSize: 11.5, fontWeight: '700' }}>
                    {isTh
                      ? `• ยกเลิกโบนัสครบทุกเควสรายวัน: −${pendingDeletePreview.revertedBonusXp} XP`
                      : `• Reverted all-daily quest bonus: −${pendingDeletePreview.revertedBonusXp} XP`}
                  </Text>
                )}
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <Pressable
                  onPress={() => setPendingDeletePreview(null)}
                  style={{
                    flex: 1,
                    paddingVertical: 11,
                    borderRadius: 10,
                    backgroundColor: theme.bgSecondary,
                    borderWidth: 1,
                    borderColor: theme.border,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: theme.textSecondary, fontWeight: '800', fontSize: 13 }}>
                    {isTh ? 'ยกเลิก' : 'Cancel'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    const targetId = pendingDeletePreview.activityId;
                    const oldLv = pendingDeletePreview.oldLevel;
                    const newLv = pendingDeletePreview.newLevel;
                    const res = deleteActivity(targetId);
                    setPendingDeletePreview(null);
                    setDeleteBanner(
                      isTh
                        ? `ลบรายการและหักคืน −${res.xpAmount} EXP เรียบร้อย (Lv.${oldLv} → Lv.${newLv})`
                        : `Deleted item and reverted −${res.xpAmount} EXP (Lv.${oldLv} → Lv.${newLv}).`
                    );
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 11,
                    borderRadius: 10,
                    backgroundColor: theme.danger,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 13 }}>
                    {isTh ? 'ยืนยันลบรายการ' : 'Confirm Delete'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </Modal>
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
    paddingHorizontal: 12,
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
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  waterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  waterBigBtn: {
    width: 145,
    flexGrow: 1,
    paddingVertical: 14,
    borderRadius: radius.card,
    borderWidth: stroke,
    borderBottomWidth: stroke + 2,
    borderRightWidth: stroke + 2,
    alignItems: 'center',
    gap: 3,
  },
  inlineInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.input,
    borderWidth: stroke,
    fontSize: 14,
    fontWeight: '700',
  },
  primaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: radius.chip,
    borderWidth: stroke,
    borderBottomWidth: stroke + 2,
    borderRightWidth: stroke + 2,
    borderColor: colors.ink,
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: colors.ink,
    fontWeight: '900',
    fontSize: 13,
  },
  secondaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.chip,
    borderWidth: stroke,
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    marginTop: 12,
    paddingHorizontal: 6,
  },
  chartBarCol: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.chip,
    borderWidth: 2,
  },
  foodItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 16,
    borderWidth: stroke,
    borderBottomWidth: stroke + 2,
    borderRightWidth: stroke + 2,
    marginBottom: 8,
    gap: 10,
  },
  estimateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  estimateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.chip,
    borderWidth: 1.5,
  },
  scanResultBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 16,
    borderWidth: stroke,
  },
  timelineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: stroke,
    borderBottomWidth: stroke + 2,
    borderRightWidth: stroke + 2,
    marginBottom: 8,
  },
  deleteMiniBtn: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.chip,
    borderWidth: 1.8,
  },
  banner: {
    padding: 10,
    borderRadius: 14,
    borderWidth: stroke,
    marginBottom: 10,
  },
});
