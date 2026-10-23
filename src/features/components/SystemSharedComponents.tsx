import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppTheme } from '../../app/theme';
import { CelebrationEvent, LanguageCode, LevelState, RankDef } from '../../core/engine/types';

export const RankBadge: React.FC<{
  rank: RankDef;
  lang: LanguageCode;
  size?: 'sm' | 'md' | 'lg';
}> = ({ rank, lang, size = 'md' }) => {
  const isLg = size === 'lg';
  const isSm = size === 'sm';
  const title = lang === 'th' ? rank.title_th : rank.title_en;

  return (
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
      <View style={[styles.rankGem, { backgroundColor: rank.color }]} />
      <Text
        style={[
          styles.rankText,
          {
            color: rank.color,
            fontSize: isLg ? 16 : isSm ? 11 : 13,
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
  );
};

export const XpBar: React.FC<{
  levelState: LevelState;
  theme: AppTheme;
  dailyRepeatableXp: number;
  lang: LanguageCode;
}> = ({ levelState, theme, dailyRepeatableXp, lang }) => {
  const pct = Math.min(100, Math.max(2, Math.round(levelState.progress * 100)));
  const softCapHit = dailyRepeatableXp >= 300;

  return (
    <View style={styles.xpContainer}>
      <View style={styles.xpHeaderRow}>
        <View style={styles.levelPill}>
          <Text style={[styles.levelNumber, { color: theme.text }]}>
            Lv.{levelState.level}
          </Text>
          <Text style={[styles.totalXpText, { color: theme.textMuted }]}>
            {lang === 'th' ? 'XP สะสม' : 'Total'}: {levelState.totalXp.toLocaleString()} XP
          </Text>
        </View>
        <Text style={[styles.xpFraction, { color: theme.primary }]}>
          {levelState.xpInLevel.toLocaleString()} / {levelState.xpToNext.toLocaleString()} XP ({pct}%)
        </Text>
      </View>

      <View
        style={[
          styles.xpTrack,
          { backgroundColor: theme.bgSecondary, borderColor: theme.border },
        ]}
      >
        <View
          style={[
            styles.xpFill,
            {
              width: `${pct}%`,
              backgroundColor: theme.primary,
            },
          ]}
        />
      </View>

      <View style={styles.xpFooterRow}>
        <Text style={[styles.xpCapLabel, { color: theme.textMuted }]}>
          {lang === 'th'
            ? `XP กิจกรรมวันนี้: ${dailyRepeatableXp}/300 (Soft Cap)`
            : `Daily Activity XP: ${dailyRepeatableXp}/300 (Soft Cap)`}
        </Text>
        {softCapHit && (
          <Text style={[styles.softCapWarning, { color: theme.warning }]}>
            {lang === 'th' ? '⚡ โหมด 25% XP (พักผ่อนได้นะ)' : '⚡ 25% Soft Cap Active'}
          </Text>
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
}> = ({ event, onDismiss, theme, lang }) => {
  if (!event) return null;

  const isMajor = event.tier >= 2;
  const accentColor =
    event.tier === 3
      ? event.newRank?.color || theme.warning
      : event.tier === 2
      ? theme.primary
      : theme.success;

  return (
    <Modal transparent animationType="fade" visible={Boolean(event)} onRequestClose={onDismiss}>
      <Pressable style={styles.modalBackdrop} onPress={onDismiss}>
        <Pressable
          style={[
            styles.celebrationCard,
            {
              backgroundColor: theme.cardElevated,
              borderColor: accentColor,
            },
          ]}
        >
          <Text style={[styles.systemTag, { color: accentColor }]}>
            {event.tier === 3
              ? '★ SYSTEM RANK PROMOTION ★'
              : event.tier === 2
              ? '▲ SYSTEM LEVEL UP ▲'
              : event.tier === 4
              ? '🏆 ACHIEVEMENT UNLOCKED 🏆'
              : '✓ QUEST COMPLETED'}
          </Text>

          <Text style={[styles.celebrationEmoji]}>
            {event.tier === 3
              ? '👑'
              : event.tier === 2
              ? '⚡'
              : event.tier === 4
              ? '🏅'
              : '✨'}
          </Text>

          <Text style={[styles.celebrationTitle, { color: theme.text }]}>
            {event.title}
          </Text>
          <Text style={[styles.celebrationSubtitle, { color: theme.textSecondary }]}>
            {event.subtitle}
          </Text>

          {isMajor && (
            <View
              style={[
                styles.celebrationBadgeBox,
                { backgroundColor: `${accentColor}20`, borderColor: accentColor },
              ]}
            >
              <Text style={{ color: accentColor, fontWeight: '700', fontSize: 13 }}>
                {lang === 'th'
                  ? 'ความสม่ำเสมอของคุณกำลังเปลี่ยนชีวิตจริงให้เป็นเลเวลใหม่'
                  : 'Your daily consistency is forging real-life progress.'}
              </Text>
            </View>
          )}

          <Pressable
            style={[styles.celebrationButton, { backgroundColor: accentColor }]}
            onPress={onDismiss}
          >
            <Text style={styles.celebrationButtonText}>
              {lang === 'th' ? 'รับรางวัล (ดำเนินการต่อ)' : 'Claim & Continue'}
            </Text>
          </Pressable>
        </Pressable>
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
}> = ({
  visible,
  onClose,
  theme,
  lang,
  onQuickWater,
  onNavigateTab,
  onQuickRestCheckin,
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
            <Text style={[styles.sheetTitle, { color: theme.text }]}>
              {isTh ? '⚡ บันทึกด่วน (Quick Action)' : '⚡ Quick Action Log'}
            </Text>
            <Pressable onPress={onClose}>
              <Text style={{ color: theme.textMuted, fontSize: 18, fontWeight: '700' }}>✕</Text>
            </Pressable>
          </View>

          <Text style={[styles.sheetSectionLabel, { color: theme.textSecondary }]}>
            {isTh ? '💧 ดื่มน้ำทันที (+2 XP)' : '💧 Instant Water (+2 XP)'}
          </Text>
          <View style={styles.quickRow}>
            {[150, 250, 500].map((ml) => (
              <Pressable
                key={ml}
                style={[
                  styles.quickWaterBtn,
                  { backgroundColor: `${theme.water}22`, borderColor: theme.water },
                ]}
                onPress={() => {
                  onQuickWater(ml);
                  onClose();
                }}
              >
                <Text style={{ color: theme.water, fontWeight: '700', fontSize: 15 }}>
                  +{ml} ml
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.sheetSectionLabel, { color: theme.textSecondary, marginTop: 14 }]}>
            {isTh ? '🎯 ไปยังหมวดบันทึก' : '🎯 Jump to Activity'}
          </Text>

          <View style={styles.quickGrid}>
            <Pressable
              style={[styles.quickActionTile, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => {
                onClose();
                onNavigateTab('track');
              }}
            >
              <Text style={styles.tileIcon}>🍚</Text>
              <Text style={[styles.tileTitle, { color: theme.text }]}>
                {isTh ? 'บันทึกมื้ออาหาร / AI สแกน' : 'Log Meal / AI Scan'}
              </Text>
              <Text style={{ color: theme.meal, fontSize: 12, fontWeight: '600' }}>+8 XP</Text>
            </Pressable>

            <Pressable
              style={[styles.quickActionTile, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => {
                onClose();
                onNavigateTab('train');
              }}
            >
              <Text style={styles.tileIcon}>🏋️</Text>
              <Text style={[styles.tileTitle, { color: theme.text }]}>
                {isTh ? 'ออกกำลังกาย / Pomodoro' : 'Workout / Pomodoro'}
              </Text>
              <Text style={{ color: theme.workout, fontSize: 12, fontWeight: '600' }}>+15~55 XP</Text>
            </Pressable>

            <Pressable
              style={[styles.quickActionTile, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => {
                onClose();
                onNavigateTab('journey');
              }}
            >
              <Text style={styles.tileIcon}>📔</Text>
              <Text style={[styles.tileTitle, { color: theme.text }]}>
                {isTh ? 'ไดอารี่ & บันทึกอารมณ์' : 'Journal & Mood'}
              </Text>
              <Text style={{ color: theme.mind, fontSize: 12, fontWeight: '600' }}>+5~15 XP</Text>
            </Pressable>

            <Pressable
              style={[styles.quickActionTile, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => {
                onQuickRestCheckin();
                onClose();
              }}
            >
              <Text style={styles.tileIcon}>🌿</Text>
              <Text style={[styles.tileTitle, { color: theme.text }]}>
                {isTh ? 'เช็กอินวันพัก (Rest Day)' : 'Rest Day Check-in'}
              </Text>
              <Text style={{ color: theme.success, fontSize: 12, fontWeight: '600' }}>+25 XP</Text>
            </Pressable>
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
  rankGem: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  xpTrack: {
    height: 12,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: 999,
  },
  xpFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
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
    backgroundColor: 'rgba(6, 9, 18, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  celebrationCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 2,
    padding: 24,
    alignItems: 'center',
  },
  systemTag: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  celebrationEmoji: {
    fontSize: 48,
    marginVertical: 8,
  },
  celebrationTitle: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
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
    width: '100%',
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
    fontSize: 18,
    fontWeight: '800',
  },
  sheetSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
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
    width: '48%',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  tileIcon: {
    fontSize: 24,
  },
  tileTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
});
