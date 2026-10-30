import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppTheme, colors, radius, stroke } from '../../app/theme';
import { CelebrationEvent, LanguageCode, LevelState, RankDef } from '../../core/engine/types';
import { TIER_METADATA } from '../../core/engine/achievementEngine';
import { AppIcon, AppIconName } from './AppIcons';
import { AwakenMascot, DripEdge } from './InkComponents';
import {
  AnimatedNumberText,
  AnimatedPressable,
  AnimatedProgressBar,
  AnimatedPulseView,
} from './AnimatedComponents';

export const RankBadge: React.FC<{
  rank: RankDef;
  lang: LanguageCode;
  size?: 'sm' | 'md' | 'lg';
  reduceMotion?: boolean;
}> = ({ rank, lang, size = 'md', reduceMotion = false }) => {
  const isLg = size === 'lg';
  const isSm = size === 'sm';
  const title = lang === 'th' ? rank.title_th : rank.title_en;
  const isHighRank =
    rank.id === 'S' || rank.id === 'SS' || rank.id === 'M' || rank.id === 'Monarch';

  return (
    <AnimatedPulseView
      active={isHighRank || isLg}
      reduceMotion={reduceMotion}
      minScale={1}
      maxScale={1.035}
      duration={1800}
    >
      <View
        style={[
          styles.rankBadge,
          {
            borderColor: colors.ink,
            backgroundColor: isHighRank ? colors.peach : colors.peachSoft,
            paddingHorizontal: isLg ? 14 : isSm ? 9 : 12,
            paddingVertical: isLg ? 7 : isSm ? 3 : 5,
          },
        ]}
      >
        <AppIcon
          name={isHighRank ? 'crown' : 'shield'}
          size={isLg ? 16 : isSm ? 11 : 13}
          color={colors.ink}
        />
        <Text
          style={[
            styles.rankText,
            {
              color: colors.ink,
              fontSize: isLg ? 14.5 : isSm ? 11 : 12.5,
            },
          ]}
        >
          RANK {rank.id} · {rank.name.toUpperCase()}
        </Text>
        {!isSm && (
          <Text style={[styles.rankSubTitle, { color: colors.ink }]}>
            ({title})
          </Text>
        )}
      </View>
    </AnimatedPulseView>
  );
};

export const XpBar: React.FC<{
  levelState: LevelState;
  theme: AppTheme;
  dailyRepeatableXp: number;
  lang: LanguageCode;
  reduceMotion?: boolean;
}> = ({ levelState, theme, dailyRepeatableXp, lang, reduceMotion = false }) => {
  const pct = Math.min(100, Math.max(4, Math.round(levelState.progress * 100)));
  const softCapHit = dailyRepeatableXp >= 300;
  const isDark = theme.mode === 'dark';

  // Section 4.2: ตอนได้ XP หยดหมึกหยดหนึ่งไหลจากด้านบนลงมาเติมแถบ XP (~600 ms)
  const prevXpRef = useRef(levelState.totalXp);
  const dropY = useRef(new Animated.Value(-18)).current;
  const dropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (levelState.totalXp > prevXpRef.current && !reduceMotion) {
      dropY.setValue(-18);
      dropOpacity.setValue(1);
      Animated.parallel([
        Animated.timing(dropY, {
          toValue: 8,
          duration: 580,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(380),
          Animated.timing(dropOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
    prevXpRef.current = levelState.totalXp;
  }, [levelState.totalXp, reduceMotion]);

  return (
    <View style={styles.xpContainer}>
      {/* Animated Ink Droplet falling into XP Bar */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          right: 26,
          top: 0,
          opacity: dropOpacity,
          transform: [{ translateY: dropY }],
          zIndex: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 3,
        }}
      >
        <View
          style={{
            width: 11,
            height: 11,
            backgroundColor: colors.peach,
            borderWidth: 2,
            borderColor: colors.ink,
            borderTopLeftRadius: 2,
            borderTopRightRadius: 7,
            borderBottomLeftRadius: 7,
            borderBottomRightRadius: 7,
            transform: [{ rotate: '45deg' }],
          }}
        />
      </Animated.View>

      <View style={styles.xpHeaderRow}>
        <View style={styles.levelPill}>
          <AnimatedNumberText
            value={levelState.level}
            reduceMotion={reduceMotion}
            style={[styles.levelNumber, { color: theme.text }]}
          >
            Lv.{levelState.level}
          </AnimatedNumberText>
          <Text style={[styles.totalXpText, { color: theme.textMuted }]}>
            {lang === 'th' ? 'XP สะสม' : 'Total'}: {levelState.totalXp.toLocaleString()} XP
          </Text>
        </View>
        <View
          style={{
            backgroundColor: colors.peachSoft,
            borderColor: colors.ink,
            borderWidth: 1.5,
            borderRadius: 999,
            paddingHorizontal: 8,
            paddingVertical: 2,
          }}
        >
          <Text style={[styles.xpFraction, { color: colors.ink }]}>
            {levelState.xpInLevel.toLocaleString()} / {levelState.xpToNext.toLocaleString()} XP ({pct}%)
          </Text>
        </View>
      </View>

      <AnimatedProgressBar
        percent={pct}
        fillColor={colors.peach}
        trackColor={isDark ? '#2A2548' : colors.white}
        borderColor={isDark ? colors.peach : colors.ink}
        height={14}
        reduceMotion={reduceMotion}
      />

      <View style={styles.xpFooterRow}>
        <Text style={[styles.xpCapLabel, { color: theme.textMuted }]}>
          {lang === 'th'
            ? `XP กิจกรรมวันนี้: ${dailyRepeatableXp}/300`
            : `Daily Activity XP: ${dailyRepeatableXp}/300`}
        </Text>
        {softCapHit && (
          <View style={styles.inlineIconRow}>
            <AppIcon name="leaf" size={12} color={theme.textSecondary} />
            <Text style={[styles.softCapWarning, { color: theme.textSecondary }]}>
              {lang === 'th' ? 'วันนี้ทำเยอะแล้ว พักผ่อนได้นะ (โหมด 25% XP)' : 'Rest easy! 25% Soft Cap Active'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export const CelebrationOverlay: React.FC<{
  event: CelebrationEvent | null;
  onDismiss: () => void;
  theme: AppTheme;
  lang: LanguageCode;
  reduceMotion?: boolean;
}> = ({ event, onDismiss, theme, lang, reduceMotion = false }) => {
  const [showExtraBadges, setShowExtraBadges] = useState(false);
  const cardScale = useRef(new Animated.Value(0.8)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const dripSlide = useRef(new Animated.Value(-40)).current;

  useEffect(() => {
    setShowExtraBadges(false);
    if (!event) return;
    if (reduceMotion) {
      cardScale.setValue(1);
      cardOpacity.setValue(1);
      dripSlide.setValue(0);
      return;
    }
    cardScale.setValue(0.78);
    cardOpacity.setValue(0);
    dripSlide.setValue(-45);

    Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        speed: 16,
        bounciness: 10,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(dripSlide, {
        toValue: 0,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [event, reduceMotion]);

  if (!event) return null;

  const isMajor = event.tier >= 2;
  const badgeTierMeta = event.badge?.tier ? TIER_METADATA[event.badge.tier] : null;
  const extraBadges = event.additionalBadges ?? [];
  const isDark = theme.mode === 'dark';
  const cardBg = isDark ? '#211E3A' : colors.white;

  return (
    <Modal transparent animationType="fade" visible={Boolean(event)} onRequestClose={onDismiss}>
      <Pressable style={styles.modalBackdrop} onPress={onDismiss}>
        <Animated.View
          style={[
            styles.celebrationCard,
            {
              backgroundColor: cardBg,
              borderColor: isDark ? colors.peach : colors.ink,
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
            },
          ]}
        >
          {/* Ink Drip Header Flood Reveal on Level Up / Rank Up (Section 4.2) */}
          <Animated.View
            style={{
              width: '100%',
              transform: [{ translateY: dripSlide }],
            }}
          >
            <View style={styles.celebrationInkHeader}>
              <Text style={styles.systemTag}>
                {event.tier === 3
                  ? lang === 'th'
                    ? '✦ เลื่อนระดับแรงค์ใหม่!'
                    : '✦ RANK PROMOTION!'
                  : event.tier === 2
                  ? lang === 'th'
                    ? '✦ เลเวลอัปแล้วนะ!'
                    : '✦ LEVEL UP!'
                  : event.tier === 4
                  ? badgeTierMeta
                    ? `${badgeTierMeta.badgeEmoji} ${
                        lang === 'th'
                          ? `ปลดล็อกถ้วยระดับ${badgeTierMeta.label_th}`
                          : `${badgeTierMeta.label_en.toUpperCase()} TROPHY`
                      }`
                    : '✦ TROPHY UNLOCKED'
                  : lang === 'th'
                  ? '✦ ทำเควสต์สำเร็จ!'
                  : '✦ QUEST COMPLETED'}
              </Text>
              <AwakenMascot
                rankId={event.newRank?.id ?? 'C'}
                level={event.newLevel ?? 10}
                mood="proud"
                size={68}
                reduceMotion={reduceMotion}
              />
            </View>
            <DripEdge seed={9} color={colors.ink} bgColor={cardBg} height={22} />
          </Animated.View>

          <View style={styles.celebrationBody}>
            <Text style={[styles.celebrationTitle, { color: theme.text }]}>
              {event.title}
            </Text>
            <Text style={[styles.celebrationSubtitle, { color: theme.textSecondary }]}>
              {event.subtitle}
            </Text>

            {extraBadges.length > 0 && (
              <Pressable
                style={[
                  styles.celebrationBadgeBox,
                  {
                    backgroundColor: colors.peachSoft,
                    borderColor: colors.ink,
                  },
                ]}
                onPress={() => setShowExtraBadges((s) => !s)}
              >
                <Text
                  style={{
                    color: colors.ink,
                    fontWeight: '900',
                    fontSize: 12.5,
                    textAlign: 'center',
                  }}
                >
                  {lang === 'th'
                    ? `🏆 ปลดล็อกอีก ${extraBadges.length} ใบพร้อมกัน (${
                        showExtraBadges ? 'แตะเพื่อย่อ' : 'แตะเพื่อดู'
                      })`
                    : `🏆 +${extraBadges.length} more unlocked (${
                        showExtraBadges ? 'tap to hide' : 'tap to view'
                      })`}
                </Text>
                {showExtraBadges && (
                  <View style={{ marginTop: 8, gap: 4 }}>
                    {extraBadges.map((b) => {
                      const bm = TIER_METADATA[b.tier] ?? TIER_METADATA.bronze;
                      return (
                        <Text
                          key={b.id}
                          style={{ color: colors.ink, fontSize: 12, fontWeight: '800' }}
                        >
                          {bm.badgeEmoji} {lang === 'th' ? b.title_th : b.title_en} (+{b.xp} XP)
                        </Text>
                      );
                    })}
                  </View>
                )}
              </Pressable>
            )}

            {isMajor && (
              <View
                style={[
                  styles.celebrationBadgeBox,
                  { backgroundColor: colors.peachSoft, borderColor: colors.ink },
                ]}
              >
                <Text
                  style={{
                    color: colors.ink,
                    fontWeight: '800',
                    fontSize: 12.5,
                    textAlign: 'center',
                  }}
                >
                  {badgeTierMeta
                    ? lang === 'th'
                      ? `ของแถมระดับ${badgeTierMeta.label_th}: ${badgeTierMeta.perk_th}`
                      : `${badgeTierMeta.label_en} Reward: ${badgeTierMeta.perk_en}`
                    : lang === 'th'
                    ? 'ก้าวเล็ก ๆ ของวันนี้ กำลังพาคุณเติบโตขึ้นจริง ๆ นะ'
                    : 'Every small step today is building real-life momentum.'}
                </Text>
              </View>
            )}

            <AnimatedPressable
              style={styles.celebrationButton}
              onPress={onDismiss}
              reduceMotion={reduceMotion}
            >
              <Text style={styles.celebrationButtonText}>
                {lang === 'th' ? 'ไปกันต่อเลย!' : 'Keep Going!'}
              </Text>
            </AnimatedPressable>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

export const QuickAddFabModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  theme: AppTheme;
  lang: LanguageCode;
  onQuickWater: (ml: number) => void;
  onNavigateTab: (tab: 'track' | 'train' | 'journey') => void;
  onQuickRestCheckin: () => void;
  reduceMotion?: boolean;
}> = ({
  visible,
  onClose,
  theme,
  lang,
  onQuickWater,
  onNavigateTab,
  onQuickRestCheckin,
  reduceMotion = false,
}) => {
  const isTh = lang === 'th';
  const isDark = theme.mode === 'dark';

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.quickSheet,
            {
              backgroundColor: isDark ? '#211E3A' : colors.white,
              borderColor: isDark ? colors.peach : colors.ink,
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <View style={styles.inlineIconRow}>
              <AppIcon name="bolt" size={20} color={colors.peach} />
              <Text style={[styles.sheetTitle, { color: theme.text }]}>
                {isTh ? 'จดบันทึกไว (Quick Add)' : 'Quick Action Log'}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeCircleBtn}>
              <Text style={{ color: colors.ink, fontSize: 13, fontWeight: '900' }}>✕</Text>
            </Pressable>
          </View>

          <View style={[styles.inlineIconRow, { marginBottom: 8 }]}>
            <AppIcon name="water" size={16} color={theme.text} />
            <Text style={[styles.sheetSectionLabel, { color: theme.textSecondary }]}>
              {isTh ? 'ดื่มน้ำอีกนิดไหม (+2 XP)' : 'Drink Water (+2 XP)'}
            </Text>
          </View>
          <View style={styles.quickRow}>
            {[150, 250, 500].map((ml) => (
              <AnimatedPressable
                key={ml}
                reduceMotion={reduceMotion}
                style={[
                  styles.quickWaterBtn,
                  {
                    backgroundColor: colors.peach,
                    borderColor: colors.ink,
                  },
                ]}
                onPress={() => {
                  onQuickWater(ml);
                  onClose();
                }}
              >
                <Text style={{ color: colors.ink, fontWeight: '900', fontSize: 15 }}>
                  +{ml} ml
                </Text>
              </AnimatedPressable>
            ))}
          </View>

          <View style={[styles.inlineIconRow, { marginTop: 14, marginBottom: 8 }]}>
            <AppIcon name="quest" size={16} color={theme.text} />
            <Text style={[styles.sheetSectionLabel, { color: theme.textSecondary }]}>
              {isTh ? 'เลือกสิ่งที่อยากทำตอนนี้' : 'Jump to Activity'}
            </Text>
          </View>

          <View style={styles.quickGrid}>
            <AnimatedPressable
              reduceMotion={reduceMotion}
              style={[
                styles.quickActionTile,
                {
                  backgroundColor: isDark ? '#282446' : colors.cream,
                  borderColor: isDark ? colors.peach : colors.ink,
                },
              ]}
              onPress={() => {
                onClose();
                onNavigateTab('track');
              }}
            >
              <View style={styles.tileIconBadge}>
                <AppIcon name="meal" size={19} color={colors.ink} />
              </View>
              <Text style={[styles.tileTitle, { color: theme.text }]}>
                {isTh ? 'จดมื้ออาหาร / สแกนรูป' : 'Log Meal / Scan'}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 11.5, fontWeight: '800' }}>
                +8 XP
              </Text>
            </AnimatedPressable>

            <AnimatedPressable
              reduceMotion={reduceMotion}
              style={[
                styles.quickActionTile,
                {
                  backgroundColor: isDark ? '#282446' : colors.cream,
                  borderColor: isDark ? colors.peach : colors.ink,
                },
              ]}
              onPress={() => {
                onClose();
                onNavigateTab('train');
              }}
            >
              <View style={styles.tileIconBadge}>
                <AppIcon name="dumbbell" size={19} color={colors.ink} />
              </View>
              <Text style={[styles.tileTitle, { color: theme.text }]}>
                {isTh ? 'ขยับร่างกาย / จับเวลาโฟกัส' : 'Workout / Focus'}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 11.5, fontWeight: '800' }}>
                +15~55 XP
              </Text>
            </AnimatedPressable>

            <AnimatedPressable
              reduceMotion={reduceMotion}
              style={[
                styles.quickActionTile,
                {
                  backgroundColor: isDark ? '#282446' : colors.cream,
                  borderColor: isDark ? colors.peach : colors.ink,
                },
              ]}
              onPress={() => {
                onClose();
                onNavigateTab('journey');
              }}
            >
              <View style={styles.tileIconBadge}>
                <AppIcon name="journal" size={19} color={colors.ink} />
              </View>
              <Text style={[styles.tileTitle, { color: theme.text }]}>
                {isTh ? 'จดไดอารี่ & ความรู้สึก' : 'Journal & Mood'}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 11.5, fontWeight: '800' }}>
                +5~15 XP
              </Text>
            </AnimatedPressable>

            <AnimatedPressable
              reduceMotion={reduceMotion}
              style={[
                styles.quickActionTile,
                {
                  backgroundColor: colors.peachSoft,
                  borderColor: colors.ink,
                },
              ]}
              onPress={() => {
                onQuickRestCheckin();
                onClose();
              }}
            >
              <View style={[styles.tileIconBadge, { backgroundColor: colors.peach }]}>
                <AppIcon name="leaf" size={19} color={colors.ink} />
              </View>
              <Text style={[styles.tileTitle, { color: colors.ink }]}>
                {isTh ? 'วันนี้พักก็นับนะ (Rest)' : 'Rest Day Check-in'}
              </Text>
              <Text style={{ color: colors.ink, fontSize: 11.5, fontWeight: '900' }}>
                +25 XP
              </Text>
            </AnimatedPressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ============================================================================
// 5. ScreenHeader (Mathematically Centered Sub-Window Header with Ink Border)
// ============================================================================
export const ScreenHeader: React.FC<{
  title: string;
  icon?: AppIconName;
  iconColor?: string;
  onBack?: () => void;
  backLabel?: string;
  rightSlot?: React.ReactNode;
  theme: AppTheme;
  reduceMotion?: boolean;
}> = ({
  title,
  icon,
  iconColor,
  onBack,
  backLabel = 'ย้อนกลับ',
  rightSlot,
  theme,
  reduceMotion,
}) => {
  return (
    <View
      style={[
        styles.screenHeaderBar,
        {
          backgroundColor: theme.card,
          borderBottomColor: theme.mode === 'dark' ? colors.peach : colors.ink,
        },
      ]}
    >
      <View style={styles.screenHeaderSide}>
        {onBack ? (
          <AnimatedPressable
            reduceMotion={reduceMotion}
            onPress={onBack}
            style={styles.screenHeaderBackBtn}
            accessibilityRole="button"
            accessibilityLabel={backLabel}
          >
            <Text
              style={{
                color: colors.ink,
                fontSize: 16,
                fontWeight: '900',
              }}
            >
              ‹ {backLabel}
            </Text>
          </AnimatedPressable>
        ) : null}
      </View>

      <View style={styles.screenHeaderCenter}>
        {icon ? (
          <AppIcon name={icon} size={16} color={iconColor ?? theme.text} />
        ) : null}
        <Text
          numberOfLines={1}
          style={[styles.screenHeaderTitle, { color: theme.text }]}
        >
          {title}
        </Text>
      </View>

      <View style={[styles.screenHeaderSide, { alignItems: 'flex-end' }]}>
        {rightSlot ?? null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.chip,
    borderWidth: stroke,
    alignSelf: 'flex-start',
    gap: 6,
  },
  rankText: {
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  rankSubTitle: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  xpContainer: {
    marginTop: 10,
    position: 'relative',
  },
  xpHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  levelPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  levelNumber: {
    fontSize: 24,
    fontWeight: '900',
  },
  totalXpText: {
    fontSize: 12,
    fontWeight: '700',
  },
  xpFraction: {
    fontSize: 11.5,
    fontWeight: '900',
  },
  xpFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  inlineIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  xpCapLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  softCapWarning: {
    fontSize: 11,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(22, 20, 43, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  celebrationCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radius.card,
    borderWidth: stroke,
    borderBottomWidth: stroke + 3,
    borderRightWidth: stroke + 3,
    overflow: 'hidden',
  },
  celebrationInkHeader: {
    backgroundColor: colors.ink,
    paddingTop: 18,
    paddingBottom: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  celebrationBody: {
    paddingHorizontal: 22,
    paddingBottom: 22,
    paddingTop: 6,
    alignItems: 'center',
  },
  systemTag: {
    color: colors.peach,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  celebrationTitle: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
    marginTop: 4,
  },
  celebrationSubtitle: {
    fontSize: 13.5,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 19,
  },
  celebrationBadgeBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: stroke,
    marginBottom: 14,
    width: '100%',
  },
  celebrationButton: {
    width: 240,
    paddingVertical: 12,
    borderRadius: radius.chip,
    backgroundColor: colors.peach,
    borderWidth: stroke,
    borderBottomWidth: stroke + 2,
    borderRightWidth: stroke + 2,
    borderColor: colors.ink,
    alignItems: 'center',
  },
  celebrationButtonText: {
    color: colors.ink,
    fontWeight: '900',
    fontSize: 15,
  },
  quickSheet: {
    width: '100%',
    maxWidth: 480,
    borderRadius: radius.card,
    borderWidth: stroke,
    borderBottomWidth: stroke + 3,
    borderRightWidth: stroke + 3,
    padding: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  closeCircleBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.peachSoft,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  sheetSectionLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickWaterBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: radius.chip,
    borderWidth: stroke,
    borderBottomWidth: stroke + 2,
    borderRightWidth: stroke + 2,
    alignItems: 'center',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickActionTile: {
    width: 148,
    flexGrow: 1,
    padding: 13,
    borderRadius: 16,
    borderWidth: stroke,
    borderBottomWidth: stroke + 2,
    borderRightWidth: stroke + 2,
    gap: 6,
  },
  tileIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.peachSoft,
    borderWidth: 1.8,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  screenHeaderBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: stroke,
  },
  screenHeaderSide: {
    width: 96,
    justifyContent: 'center',
  },
  screenHeaderBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.chip,
    backgroundColor: colors.peach,
    borderWidth: 2,
    borderColor: colors.ink,
    alignSelf: 'flex-start',
  },
  screenHeaderCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  screenHeaderTitle: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '900',
  },
});
