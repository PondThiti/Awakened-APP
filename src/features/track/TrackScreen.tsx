import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AppTheme } from '../../app/theme';
import { useAwakened } from '../../data/repository';
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

export const TrackScreen: React.FC<{ theme: AppTheme }> = ({ theme }) => {
  const {
    db,
    todayKey,
    todayMetrics,
    logWater,
    logMeal,
    addCustomFoodTemplate,
    logCustomActivity,
    deleteActivity,
    updateProfile,
  } = useAwakened();

  const [subTab, setSubTab] = useState<'water' | 'food' | 'custom' | 'timeline'>('water');
  const lang = db.profile.language;
  const strings = t(lang);
  const isTh = lang === 'th';

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
  const [customMinutes, setCustomMinutes] = useState('20');
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
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        exif: false, // Privacy rule Section 14.2: strip EXIF/GPS metadata
      });
      if (!res.canceled && res.assets[0]) {
        const uri = res.assets[0].fileName || res.assets[0].uri || scanHint;
        const analyzed = analyzeFoodImageOnDevice(uri, db.customFoods);
        setScanResult(analyzed);
        setSelectedCandidateIdx(0);
        setEditableScanKcal(String(analyzed.candidates[0]?.food.calories_est ?? 500));
      }
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

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Sub-navigation Bar */}
      <View
        style={[
          styles.subTabBar,
          { backgroundColor: theme.card, borderBottomColor: theme.border },
        ]}
      >
        {(
          [
            { id: 'water', label: strings.track.waterTab },
            { id: 'food', label: strings.track.foodTab },
            { id: 'custom', label: strings.track.customTab },
            { id: 'timeline', label: strings.track.timelineTab },
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
        {/* 1. WATER TRACKER */}
        {subTab === 'water' && (
          <>
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                💧 {strings.home.waterToday}: {todayMetrics.water_ml.toLocaleString()} /{' '}
                {db.profile.waterGoalMl.toLocaleString()} ml
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>
                {strings.track.waterQuickAdd} · {strings.track.waterGoalBonus}
              </Text>

              <View
                style={[
                  styles.waterProgressTrack,
                  { backgroundColor: theme.bgSecondary, borderColor: theme.border },
                ]}
              >
                <View
                  style={[
                    styles.waterProgressFill,
                    {
                      width: `${Math.min(
                        100,
                        Math.round(
                          (todayMetrics.water_ml / Math.max(1, db.profile.waterGoalMl)) * 100
                        )
                      )}%`,
                      backgroundColor: theme.water,
                    },
                  ]}
                />
              </View>

              <View style={styles.waterGrid}>
                {[100, 150, 250, 500].map((ml) => (
                  <Pressable
                    key={ml}
                    style={[
                      styles.waterBigBtn,
                      { backgroundColor: `${theme.water}18`, borderColor: theme.water },
                    ]}
                    onPress={() => logWater(ml)}
                  >
                    <Text style={{ fontSize: 20 }}>💧</Text>
                    <Text style={{ color: theme.water, fontWeight: '900', fontSize: 16 }}>
                      +{ml} ml
                    </Text>
                    <Text style={{ color: theme.textMuted, fontSize: 11 }}>+2 XP</Text>
                  </Pressable>
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
                <Pressable
                  style={[styles.primaryBtn, { backgroundColor: theme.water }]}
                  onPress={() => logWater(Number(customWaterMl) || 200)}
                >
                  <Text style={styles.primaryBtnText}>
                    {isTh ? '+ บันทึกปริมาณกำหนดเอง' : '+ Log Custom ml'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Daily Goal Setting + 7-Day Chart */}
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                📊 {isTh ? 'กราฟการดื่มน้ำ 7 วันย้อนหลัง' : '7-Day Hydration History'}
              </Text>
              <View style={styles.chartRow}>
                {last7Days.map((dk) => {
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
                      <View
                        style={[
                          styles.chartBarTrack,
                          { backgroundColor: theme.bgSecondary },
                        ]}
                      >
                        <View
                          style={{
                            width: '100%',
                            height: `${hPct}%`,
                            backgroundColor:
                              ml >= db.profile.waterGoalMl ? theme.success : theme.water,
                            borderRadius: 6,
                          }}
                        />
                      </View>
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
                <Pressable
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
                </Pressable>
              </View>
            </View>
          </>
        )}

        {/* 2. FOOD TRACKER & AI SCANNER */}
        {subTab === 'food' && (
          <>
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                🍚 {isTh ? 'บันทึกมื้ออาหาร (+8 XP)' : 'Log Meal (+8 XP)'}
              </Text>
              <Text style={{ color: theme.success, fontSize: 12, marginTop: 4 }}>
                ✓ {strings.track.noCaloriePenaltyNote}
              </Text>

              {/* Meal Slot Selector */}
              <View style={[styles.chipRow, { marginTop: 10 }]}>
                {(['breakfast', 'lunch', 'dinner', 'snack'] as MealSlot[]).map((slot) => {
                  const active = mealSlot === slot;
                  return (
                    <Pressable
                      key={slot}
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
                    </Pressable>
                  );
                })}
              </View>

              {/* Food Mode Switcher */}
              <View style={[styles.chipRow, { marginTop: 10 }]}>
                {(
                  [
                    { id: 'db', label: `🍲 ${strings.track.searchThaiFood}` },
                    { id: 'scan', label: `📸 ${strings.track.aiFoodScanner}` },
                    { id: 'manual', label: `✏️ ${strings.track.manualFood}` },
                    {
                      id: 'create_template',
                      label: isTh ? '➕ สร้างอาหารของฉัน' : '➕ Create My Food',
                    },
                  ] as const
                ).map((m) => {
                  const active = foodMode === m.id;
                  return (
                    <Pressable
                      key={m.id}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? `${theme.primary}25` : theme.bgSecondary,
                          borderColor: active ? theme.primary : theme.border,
                        },
                      ]}
                      onPress={() => setFoodMode(m.id)}
                    >
                      <Text
                        style={{
                          color: active ? theme.primary : theme.textSecondary,
                          fontWeight: '800',
                          fontSize: 12,
                        }}
                      >
                        {m.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Mode A: Thai Food DB Search */}
            {foodMode === 'db' && (
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
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
                      <Pressable
                        key={p.mult}
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
                      </Pressable>
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

                      <Pressable
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
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Mode B: AI Food Scanner (Section 12) */}
            {foodMode === 'scan' && (
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  📸 {strings.track.aiFoodScanner} (On-Device)
                </Text>
                <Text style={{ color: theme.warning, fontSize: 12, marginTop: 4, lineHeight: 18 }}>
                  ⚠️ {strings.track.scanWarning}
                </Text>

                <View style={[styles.inlineInputRow, { marginTop: 12 }]}>
                  <Pressable
                    style={[styles.primaryBtn, { backgroundColor: theme.primary, flex: 1 }]}
                    onPress={handlePickCameraOrGallery}
                  >
                    <Text style={styles.primaryBtnText}>
                      📷 {isTh ? 'เลือกรูป / ถ่ายรูปอาหาร' : 'Pick Photo / Camera'}
                    </Text>
                  </Pressable>
                </View>

                <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 12, marginBottom: 6 }}>
                  {isTh
                    ? 'หรือทดสอบ AI จำแนกภาพอาหารจานด่วน (ลบพิกัด EXIF อัตโนมัติ):'
                    : 'Or test on-device dish recognition preset (EXIF stripped):'}
                </Text>
                <View style={styles.chipRow}>
                  {['ข้าวกะเพราไก่', 'ข้าวมันไก่', 'ผัดไทยกุ้งสด', 'ส้มตำไทย', 'ชาไทยเย็น'].map(
                    (sample) => (
                      <Pressable
                        key={sample}
                        style={[
                          styles.chip,
                          { backgroundColor: theme.bgSecondary, borderColor: theme.border },
                        ]}
                        onPress={() => handleRunSimulatedScan(sample)}
                      >
                        <Text style={{ color: theme.text, fontSize: 12 }}>🔍 {sample}</Text>
                      </Pressable>
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
                        🤖 Top-3 Candidates
                      </Text>
                      <View
                        style={[
                          styles.estimateBadge,
                          { backgroundColor: `${theme.warning}25`, borderColor: theme.warning },
                        ]}
                      >
                        <Text style={{ color: theme.warning, fontSize: 10, fontWeight: '800' }}>
                          {strings.track.scanEstimateBadge} · EXIF Stripped ✓
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
                        {isTh ? 'ปรับแก้แคลอรีได้ (kcal):' : 'Adjust kcal before saving:'}
                      </Text>
                      <TextInput
                        value={editableScanKcal}
                        onChangeText={setEditableScanKcal}
                        keyboardType="numeric"
                        style={[
                          styles.input,
                          {
                            width: 90,
                            backgroundColor: theme.card,
                            color: theme.text,
                            borderColor: theme.border,
                          },
                        ]}
                      />
                      <Pressable
                        style={[styles.primaryBtn, { backgroundColor: theme.success, flex: 1 }]}
                        onPress={() => {
                          const chosen = scanResult.candidates[selectedCandidateIdx] ?? scanResult.candidates[0];
                          if (!chosen) return;
                          logMeal(isTh ? chosen.food.name_th : chosen.food.name_en, {
                            mealSlot,
                            caloriesEst: Number(editableScanKcal) || chosen.food.calories_est,
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
                          ✓ {isTh ? 'ยืนยันบันทึก (+8 XP)' : 'Confirm & Log (+8 XP)'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Mode C & D: Manual Entry or Create Custom Food Template */}
            {(foodMode === 'manual' || foodMode === 'create_template') && (
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 10 }]}>
                  {foodMode === 'create_template'
                    ? isTh
                      ? '➕ สร้างเทมเพลตอาหารของฉัน'
                      : '➕ Save Custom Food Template'
                    : isTh
                    ? '✏️ บันทึกอาหารด้วยตนเอง'
                    : '✏️ Manual Meal Log'}
                </Text>

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

                <Pressable
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
                        ? '💾 บันทึกเป็นเทมเพลตอาหารของฉัน'
                        : '💾 Save to My Food Templates'
                      : isTh
                      ? '✓ บันทึกมื้ออาหาร (+8 XP)'
                      : '✓ Log Meal (+8 XP)'}
                  </Text>
                </Pressable>
              </View>
            )}
          </>
        )}

        {/* 3. CUSTOM ACTIVITY TRACKER */}
        {subTab === 'custom' && (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              ⚡ {isTh ? 'บันทึกกิจกรรมกำหนดเอง (สูงสุด 3 ครั้ง/วัน)' : 'Log Custom Activity (Max 3/day)'}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4, marginBottom: 12 }}>
              {isTh
                ? 'เช่น อ่านหนังสือ ยืดเหยียด เดินเล่น นั่งสมาธิ นอนพักผ่อน'
                : 'e.g., Reading, Stretching, Walking, Meditation, Nap'}
            </Text>

            <View style={[styles.chipRow, { marginBottom: 10 }]}>
              {[
                isTh ? '📖 อ่านหนังสือ' : '📖 Reading',
                isTh ? '🧘 ยืดเหยียด/สมาธิ' : '🧘 Stretch/Meditate',
                isTh ? '🚶 เดินเล่นรับลม' : '🚶 Casual Walk',
                isTh ? '😴 นอนพักเร็ว' : '😴 Early Sleep',
              ].map((preset) => (
                <Pressable
                  key={preset}
                  style={[
                    styles.chip,
                    { backgroundColor: theme.bgSecondary, borderColor: theme.border },
                  ]}
                  onPress={() => setCustomTitle(preset)}
                >
                  <Text style={{ color: theme.text, fontSize: 12 }}>{preset}</Text>
                </Pressable>
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
                  <Pressable
                    key={lv.id}
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
                  </Pressable>
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
                {isBackdatedDemo ? '☑ ' : '☐ '}
                {isTh
                  ? 'บันทึกย้อนหลัง > 24 ชม. (ได้ XP 50% และไม่นับ Streak ตามกติกา 7.6)'
                  : 'Backfill > 24h ago (50% XP, no Streak impact per Rule 7.6)'}
              </Text>
            </Pressable>

            <Pressable
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
                ✓ {isTh ? 'บันทึกกิจกรรม' : 'Log Custom Activity'}
              </Text>
            </Pressable>
          </View>
        )}

        {/* 4. TIMELINE (ACTIVITY LOG) */}
        {subTab === 'timeline' && (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 8 }]}>
              🕒 {isTh ? 'Timeline กิจกรรมทั้งหมด' : 'Activity Log Timeline'}
            </Text>

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

            <View style={[styles.chipRow, { marginBottom: 12 }]}>
              {(['all', 'water', 'meal', 'workout', 'focus', 'custom', 'rest'] as const).map(
                (f) => {
                  const active = timelineFilter === f;
                  return (
                    <Pressable
                      key={f}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? `${theme.primary}25` : theme.bgSecondary,
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
                    </Pressable>
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
                const within10m = canRevertXpOnDelete(act.createdAt);
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
                      <Pressable
                        style={[styles.deleteMiniBtn, { borderColor: theme.danger }]}
                        onPress={() => {
                          const res = deleteActivity(act.id);
                          setDeleteBanner(
                            res.xpReverted
                              ? isTh
                                ? `ลบรายการที่เพิ่งบันทึก (<10 นาที): ยกเลิก ${res.xpAmount} XP เรียบร้อย`
                                : `Deleted recent log (<10m): Reverted ${res.xpAmount} XP.`
                              : isTh
                              ? 'ลบรายการออกจาก Timeline แล้ว (XP สะสมคงเดิมตามหลักไม่ลงโทษ P1)'
                              : 'Removed from Timeline (XP preserved per No-Punishment Rule P1).'
                          );
                        }}
                      >
                        <Text style={{ color: theme.danger, fontSize: 10, fontWeight: '700' }}>
                          🗑️ {within10m ? (isTh ? 'ลบ (<10น.)' : 'Undo') : isTh ? 'ลบ' : 'Del'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}

            {db.activities.filter((a) => !a.deletedAt).length === 0 && (
              <Text style={{ color: theme.textMuted, textAlign: 'center', padding: 20 }}>
                {isTh ? 'ยังไม่มีรายการบันทึกวันนี้ เริ่มกดดื่มน้ำหรือบันทึกอาหารได้เลย!' : 'No activities logged yet today.'}
              </Text>
            )}
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
    borderRadius: 16,
    borderWidth: 1,
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
    fontWeight: '800',
  },
  waterProgressTrack: {
    height: 14,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
    marginVertical: 12,
  },
  waterProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
  waterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  waterBigBtn: {
    width: '48%',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 2,
  },
  inlineInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 14,
  },
  primaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#0E1220',
    fontWeight: '900',
    fontSize: 13,
  },
  secondaryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
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
  chartBarTrack: {
    width: 20,
    height: 85,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  foodItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  scanResultBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  timelineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  deleteMiniBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  banner: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
});
