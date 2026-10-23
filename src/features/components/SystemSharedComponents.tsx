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
import { AppTheme } from '../../app/theme';
import { CelebrationEvent, LanguageCode, LevelState, RankDef } from '../../core/engine/types';
import { TIER_METADATA } from '../../core/engine/achievementEngine';
import { AppIcon } from './AppIcons';
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
  const isHighRank = rank.id === 'S' || rank.id === 'SS' || rank.id === 'Monarch';

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
            borderColor: rank.color,
            backgroundColor: `${rank.color}18`,
            paddingHorizontal: isLg ? 14 : isSm ? 8 : 11,
            paddingVertical: isLg ? 8 : isSm ? 3 : 5,
          },
        ]}
      >
        <AppIcon
          name={isHighRank ? 'crown' : 'shield'}
          size={isLg ? 16 : isSm ? 11 : 13}
          color={rank.color}
        />
        <Text
          style={[
            styles.rankText,
            {
              color: rank.color,
              fontSize: isLg ? 15 : isSm ? 11 : 13,
            },
          ]}
        >
          RANK {rank.id} · {rank.name.toUpperCase()}
        </Text>
        {!isSm && (
          <Text style={[styles.rankSubTitle, { color: rank.color }]}>
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
  const pct = Math.min(100, Math.max(3, Math.round(levelState.progress * 100)));
  const softCapHit = dailyRepeatableXp >= 300;

  return (
    <View style={styles.xpContainer}>
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
        <Text style={[styles.xpFraction, { color: theme.primary }]}>
          {levelState.xpInLevel.toLocaleString()} / {levelState.xpToNext.toLocaleString()} XP ({pct}%)
        </Text>
      </View>

      <AnimatedProgressBar
        percent={pct}
        fillColor={theme.primary}
        trackColor={theme.bgSecondary}
        borderColor={theme.border}
        height={12}
        reduceMotion={reduceMotion}
      />

      <View style={styles.xpFooterRow}>
        <Text style={[styles.xpCapLabel, { color: theme.textMuted }]}>
          {lang === 'th'
            ? `XP กิจกรรมวันนี้: ${dailyRepeatableXp}/300 (Soft Cap)`
            : `Daily Activity XP: ${dailyRepeatableXp}/300 (Soft Cap)`}
        </Text>
        {softCapHit && (
          <View style={styles.inlineIconRow}>
            <AppIcon name="bolt" size={12} color={theme.warning} />
            <Text style={[styles.softCapWarning, { color: theme.warning }]}>
              {lang === 'th' ? 'โหมด 25% XP (พักผ่อนได้นะ)' : '25% Soft Cap Active'}
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
  const cardScale = useRef(new Animated.Value(0.75)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.8)).current;
  const ringOpacity = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    setShowExtraBadges(false);
    if (!event) return;
    if (reduceMotion) {
      cardScale.setValue(1);
      cardOpacity.setValue(1);
      return;
    }
    cardScale.setValue(0.7);
    cardOpacity.setValue(0);
    ringScale.setValue(0.75);
    ringOpacity.setValue(0.75);

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
      Animated.loop(
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 1.35,
            duration: 1300,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: 1300,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, [event, reduceMotion]);

  if (!event) return null;

  const isMajor = event.tier >= 2;
  const badgeTierMeta = event.badge?.tier ? TIER_METADATA[event.badge.tier] : null;
  const accentColor =
    event.tier === 3
      ? event.newRank?.color || theme.warning
      : event.tier === 2
      ? theme.primary
      : badgeTierMeta
      ? badgeTierMeta.color
      : theme.success;

  const iconName =
    event.tier === 3
      ? 'crown'
      : event.tier === 2
      ? 'bolt'
      : event.tier === 4
      ? 'trophy'
      : 'star';

  const extraBadges = event.additionalBadges ?? [];

  return (
    <Modal transparent animationType="fade" visible={Boolean(event)} onRequestClose={onDismiss}>
      <Pressable style={styles.modalBackdrop} onPress={onDismiss}>
        <Animated.View
          style={[
            styles.celebrationCard,
            {
              backgroundColor: theme.cardElevated,
              borderColor: accentColor,
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
            },
          ]}
        >
          <Text style={[styles.systemTag, { color: accentColor }]}>
            {event.tier === 3
              ? 'SYSTEM RANK PROMOTION'
              : event.tier === 2
              ? 'SYSTEM LEVEL UP'
              : event.tier === 4
              ? badgeTierMeta
                ? `${badgeTierMeta.badgeEmoji} ${
                    lang === 'th'
                      ? `ถ้วยรางวัลระดับ${badgeTierMeta.label_th}`
                      : `${badgeTierMeta.label_en.toUpperCase()} ACHIEVEMENT`
                  }`
                : 'ACHIEVEMENT UNLOCKED'
              : 'QUEST COMPLETED'}
          </Text>

          <View style={styles.emblemWrapper}>
            <Animated.View
              style={[
                styles.emblemPulseRing,
                {
                  borderColor: accentColor,
                  opacity: ringOpacity,
                  transform: [{ scale: ringScale }],
                },
              ]}
            />
            <View
              style={[
                styles.emblemCircle,
                { backgroundColor: `${accentColor}22`, borderColor: accentColor },
              ]}
            >
              <AppIcon name={iconName} size={36} color={accentColor} />
            </View>
          </View>

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
                  backgroundColor: `${theme.primary}18`,
                  borderColor: theme.primary,
                },
              ]}
              onPress={() => setShowExtraBadges((s) => !s)}
            >
              <Text
                style={{
                  color: theme.primary,
                  fontWeight: '800',
                  fontSize: 13,
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
                        style={{ color: theme.text, fontSize: 12, fontWeight: '700' }}
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
                { backgroundColor: `${accentColor}20`, borderColor: accentColor },
              ]}
            >
              <Text style={{ color: accentColor, fontWeight: '700', fontSize: 13, textAlign: 'center' }}>
                {badgeTierMeta
                  ? lang === 'th'
                    ? `ของแถมระดับ${badgeTierMeta.label_th}: ${badgeTierMeta.perk_th}`
                    : `${badgeTierMeta.label_en} Reward: ${badgeTierMeta.perk_en}`
                  : lang === 'th'
                  ? 'ความสม่ำเสมอของคุณกำลังเปลี่ยนชีวิตจริงให้เป็นเลเวลใหม่'
                  : 'Your daily consistency is forging real-life progress.'}
              </Text>
            </View>
          )}

          <AnimatedPressable
            style={[styles.celebrationButton, { backgroundColor: accentColor }]}
            onPress={onDismiss}
            reduceMotion={reduceMotion}
          >
            <Text style={styles.celebrationButtonText}>
              {lang === 'th' ? 'รับรางวัล (ดำเนินการต่อ)' : 'Claim & Continue'}
            </Text>
          </AnimatedPressable>
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

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.quickSheet,
            { backgroundColor: theme.cardElevated, borderColor: theme.border },
          ]}
        >
          <View style={styles.sheetHeader}>
            <View style={styles.inlineIconRow}>
              <AppIcon name="bolt" size={20} color={theme.primary} />
              <Text style={[styles.sheetTitle, { color: theme.text }]}>
                {isTh ? 'บันทึกด่วน (Quick Action)' : 'Quick Action Log'}
              </Text>
            </View>
            <Pressable onPress={onClose} style={{ padding: 4 }}>
              <Text style={{ color: theme.textMuted, fontSize: 16, fontWeight: '800' }}>✕</Text>
            </Pressable>
          </View>

          <View style={[styles.inlineIconRow, { marginBottom: 8 }]}>
            <AppIcon name="water" size={16} color={theme.water} />
            <Text style={[styles.sheetSectionLabel, { color: theme.textSecondary }]}>
              {isTh ? 'ดื่มน้ำทันที (+2 XP)' : 'Instant Water (+2 XP)'}
            </Text>
          </View>
          <View style={styles.quickRow}>
            {[150, 250, 500].map((ml) => (
              <AnimatedPressable
                key={ml}
                reduceMotion={reduceMotion}
                style={[
                  styles.quickWaterBtn,
                  { backgroundColor: `${theme.water}22`, borderColor: theme.water },
                ]}
                onPress={() => {
                  onQuickWater(ml);
                  onClose();
                }}
              >
                <Text style={{ color: theme.water, fontWeight: '800', fontSize: 15 }}>
                  +{ml} ml
                </Text>
              </AnimatedPressable>
            ))}
          </View>

          <View style={[styles.inlineIconRow, { marginTop: 14, marginBottom: 8 }]}>
            <AppIcon name="quest" size={16} color={theme.primary} />
            <Text style={[styles.sheetSectionLabel, { color: theme.textSecondary }]}>
              {isTh ? 'ไปยังหมวดบันทึก' : 'Jump to Activity'}
            </Text>
          </View>

          <View style={styles.quickGrid}>
            <AnimatedPressable
              reduceMotion={reduceMotion}
              style={[styles.quickActionTile, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => {
                onClose();
                onNavigateTab('track');
              }}
            >
              <View style={[styles.tileIconBadge, { backgroundColor: `${theme.meal}20` }]}>
                <AppIcon name="meal" size={20} color={theme.meal} />
              </View>
              <Text style={[styles.tileTitle, { color: theme.text }]}>
                {isTh ? 'บันทึกมื้ออาหาร / AI สแกน' : 'Log Meal / AI Scan'}
              </Text>
              <Text style={{ color: theme.meal, fontSize: 12, fontWeight: '700' }}>+8 XP</Text>
            </AnimatedPressable>

            <AnimatedPressable
              reduceMotion={reduceMotion}
              style={[styles.quickActionTile, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => {
                onClose();
                onNavigateTab('train');
              }}
            >
              <View style={[styles.tileIconBadge, { backgroundColor: `${theme.workout}20` }]}>
                <AppIcon name="dumbbell" size={20} color={theme.workout} />
              </View>
              <Text style={[styles.tileTitle, { color: theme.text }]}>
                {isTh ? 'ออกกำลังกาย / โฟกัส' : 'Workout / Focus'}
              </Text>
              <Text style={{ color: theme.workout, fontSize: 12, fontWeight: '700' }}>+15~55 XP</Text>
            </AnimatedPressable>

            <AnimatedPressable
              reduceMotion={reduceMotion}
              style={[styles.quickActionTile, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => {
                onClose();
                onNavigateTab('journey');
              }}
            >
              <View style={[styles.tileIconBadge, { backgroundColor: `${theme.mind}20` }]}>
                <AppIcon name="journal" size={20} color={theme.mind} />
              </View>
              <Text style={[styles.tileTitle, { color: theme.text }]}>
                {isTh ? 'ไดอารี่ & บันทึกอารมณ์' : 'Journal & Mood'}
              </Text>
              <Text style={{ color: theme.mind, fontSize: 12, fontWeight: '700' }}>+5~15 XP</Text>
            </AnimatedPressable>

            <AnimatedPressable
              reduceMotion={reduceMotion}
              style={[styles.quickActionTile, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => {
                onQuickRestCheckin();
                onClose();
              }}
            >
              <View style={[styles.tileIconBadge, { backgroundColor: `${theme.success}20` }]}>
                <AppIcon name="leaf" size={20} color={theme.success} />
              </View>
              <Text style={[styles.tileTitle, { color: theme.text }]}>
                {isTh ? 'เช็กอินวันพัก (Rest Day)' : 'Rest Day Check-in'}
              </Text>
              <Text style={{ color: theme.success, fontSize: 12, fontWeight: '700' }}>+25 XP</Text>
            </AnimatedPressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1.5,
    alignSelf: 'flex-start',
    gap: 6,
  },
  rankText: {
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  rankSubTitle: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.9,
  },
  xpContainer: {
    marginTop: 10,
  },
  xpHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
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
    fontWeight: '600',
  },
  xpFraction: {
    fontSize: 13,
    fontWeight: '700',
  },
  xpFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  inlineIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  xpCapLabel: {
    fontSize: 11,
  },
  softCapWarning: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 9, 18, 0.80)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  celebrationCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 22,
    borderWidth: 2,
    padding: 24,
    alignItems: 'center',
  },
  systemTag: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  emblemWrapper: {
    width: 82,
    height: 82,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  emblemPulseRing: {
    position: 'absolute',
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 2,
  },
  emblemCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationTitle: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
    marginTop: 4,
  },
  celebrationSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  celebrationBadgeBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    width: '100%',
  },
  celebrationButton: {
    width: 240,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  celebrationButtonText: {
    color: '#0E1220',
    fontWeight: '900',
    fontSize: 15,
  },
  quickSheet: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  sheetSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickWaterBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
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
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  tileIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
});
