import React, { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getTheme } from './theme';
import { useAwakened } from '../data/repository';
import { t } from '../l10n/translations';
import { HomeScreen } from '../features/home/HomeScreen';
import { TrackScreen } from '../features/track/TrackScreen';
import { TrainScreen } from '../features/train/TrainScreen';
import { JourneyScreen } from '../features/journey/JourneyScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import {
  CelebrationOverlay,
  QuickAddFabModal,
} from '../features/components/SystemSharedComponents';

export type NavTab = 'home' | 'track' | 'train' | 'journey' | 'profile';

export const AppShell: React.FC = () => {
  const {
    db,
    levelState,
    currentRank,
    celebrationQueue,
    dismissCelebration,
    logWater,
    logRestDayCheckin,
    updateProfile,
  } = useAwakened();

  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const theme = getTheme(db.profile.theme);
  const lang = db.profile.language;
  const strings = t(lang);

  const currentCelebration = celebrationQueue[0] ?? null;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      <StatusBar
        barStyle={db.profile.theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.bg}
      />

      {/* Top RPG App Header */}
      <View
        style={[
          styles.topBar,
          { backgroundColor: theme.card, borderBottomColor: theme.border },
        ]}
      >
        <View style={styles.brandRow}>
          <View style={[styles.rankDot, { backgroundColor: currentRank.color }]} />
          <View>
            <Text style={[styles.brandTitle, { color: theme.text }]}>
              AWAKENED
            </Text>
            <Text style={[styles.brandSub, { color: theme.textMuted }]}>
              Lv.{levelState.level} · {currentRank.id}-{currentRank.name}
            </Text>
          </View>
        </View>

        <View style={styles.topActions}>
          <Pressable
            style={[
              styles.headerChip,
              { backgroundColor: theme.bgSecondary, borderColor: theme.border },
            ]}
            onPress={() =>
              updateProfile({ language: db.profile.language === 'th' ? 'en' : 'th' })
            }
          >
            <Text style={{ color: theme.primary, fontWeight: '800', fontSize: 12 }}>
              {lang.toUpperCase()}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.headerChip,
              { backgroundColor: theme.bgSecondary, borderColor: theme.border },
            ]}
            onPress={() =>
              updateProfile({ theme: db.profile.theme === 'dark' ? 'light' : 'dark' })
            }
          >
            <Text style={{ fontSize: 13 }}>
              {db.profile.theme === 'dark' ? '🌙' : '☀️'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Main Content Area */}
      <View style={styles.mainBody}>
        {activeTab === 'home' && (
          <HomeScreen theme={theme} onNavigateTab={(tab) => setActiveTab(tab)} />
        )}
        {activeTab === 'track' && <TrackScreen theme={theme} />}
        {activeTab === 'train' && <TrainScreen theme={theme} />}
        {activeTab === 'journey' && <JourneyScreen theme={theme} />}
        {activeTab === 'profile' && <ProfileScreen theme={theme} />}

        {/* Floating Quick Add FAB (Section 5.1 & 15.3) */}
        <Pressable
          accessibilityLabel="Quick Add Activity"
          style={[
            styles.fab,
            {
              backgroundColor: theme.primary,
              shadowColor: theme.primary,
            },
          ]}
          onPress={() => setQuickAddOpen(true)}
        >
          <Text style={styles.fabPlus}>＋</Text>
        </Pressable>
      </View>

      {/* 5-Tab Bottom Navigation Bar (Section 5) */}
      <View
        style={[
          styles.bottomNav,
          { backgroundColor: theme.card, borderTopColor: theme.border },
        ]}
      >
        {(
          [
            { id: 'home', icon: '⚡', label: strings.nav.home },
            { id: 'track', icon: '💧', label: strings.nav.track },
            { id: 'train', icon: '🏋️', label: strings.nav.train },
            { id: 'journey', icon: '📔', label: strings.nav.journey },
            { id: 'profile', icon: '🛡️', label: strings.nav.profile },
          ] as const
        ).map((item) => {
          const selected = activeTab === item.id;
          return (
            <Pressable
              key={item.id}
              style={styles.navItem}
              onPress={() => setActiveTab(item.id)}
            >
              <Text style={[styles.navIcon, { opacity: selected ? 1 : 0.65 }]}>
                {item.icon}
              </Text>
              <Text
                style={[
                  styles.navLabel,
                  {
                    color: selected ? theme.primary : theme.textMuted,
                    fontWeight: selected ? '900' : '600',
                  },
                ]}
              >
                {item.label}
              </Text>
              {selected && (
                <View
                  style={[styles.navActiveBar, { backgroundColor: theme.primary }]}
                />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Quick Add Modal */}
      <QuickAddFabModal
        visible={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        theme={theme}
        lang={lang}
        onQuickWater={(ml) => logWater(ml)}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onQuickRestCheckin={() => logRestDayCheckin('Quick Rest Check-in')}
      />

      {/* Celebration Overlay (4 Tiers) */}
      <CelebrationOverlay
        event={currentCelebration}
        onDismiss={dismissCelebration}
        theme={theme}
        lang={lang}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rankDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  brandSub: {
    fontSize: 11,
    fontWeight: '700',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  mainBody: {
    flex: 1,
    position: 'relative',
  },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  fabPlus: {
    color: '#0E1220',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 30,
  },
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minHeight: 48,
    position: 'relative',
  },
  navIcon: {
    fontSize: 18,
  },
  navLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  navActiveBar: {
    position: 'absolute',
    top: -6,
    width: 24,
    height: 3,
    borderRadius: 2,
  },
});
