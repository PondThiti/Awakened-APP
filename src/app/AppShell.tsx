import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
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
import {
  AppIcon,
  AppIconName,
  AwakenedBrandIcon,
} from '../features/components/AppIcons';
import {
  AnimatedPressable,
  AnimatedPulseView,
  AnimatedScreenWrapper,
  FloatingXpToast,
} from '../features/components/AnimatedComponents';

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
  const reduceMotion = db.profile.reduceEffects;

  const currentCelebration = celebrationQueue[0] ?? null;

  // FAB rotation animation when Quick Add modal opens
  const fabRotate = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(fabRotate, {
      toValue: quickAddOpen ? 1 : 0,
      speed: 20,
      bounciness: 8,
      useNativeDriver: true,
    }).start();
  }, [quickAddOpen]);

  const fabSpin = fabRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const navItems: ReadonlyArray<{
    id: NavTab;
    icon: AppIconName;
    label: string;
  }> = [
    { id: 'home', icon: 'home', label: strings.nav.home },
    { id: 'track', icon: 'water', label: strings.nav.track },
    { id: 'train', icon: 'dumbbell', label: strings.nav.train },
    { id: 'journey', icon: 'journal', label: strings.nav.journey },
    { id: 'profile', icon: 'user', label: strings.nav.profile },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      <StatusBar
        barStyle={db.profile.theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.bg}
      />

      {/* Top RPG App Header with Awakened.ico Brand Emblem */}
      <View
        style={[
          styles.topBar,
          { backgroundColor: theme.card, borderBottomColor: theme.border },
        ]}
      >
        <View style={styles.brandRow}>
          <AnimatedPulseView
            active
            reduceMotion={reduceMotion}
            minScale={1}
            maxScale={1.05}
            duration={2000}
          >
            <AwakenedBrandIcon size={36} />
          </AnimatedPulseView>
          <View>
            <View style={styles.brandNameRow}>
              <Text style={[styles.brandTitle, { color: theme.text }]}>
                AWAKENED
              </Text>
              <View style={[styles.rankDot, { backgroundColor: currentRank.color }]} />
            </View>
            <Text style={[styles.brandSub, { color: theme.textMuted }]}>
              Lv.{levelState.level} · {currentRank.id}-{currentRank.name}
            </Text>
          </View>
        </View>

        <View style={styles.topActions}>
          <AnimatedPressable
            reduceMotion={reduceMotion}
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
          </AnimatedPressable>

          <AnimatedPressable
            reduceMotion={reduceMotion}
            style={[
              styles.headerChip,
              { backgroundColor: theme.bgSecondary, borderColor: theme.border },
            ]}
            onPress={() =>
              updateProfile({ theme: db.profile.theme === 'dark' ? 'light' : 'dark' })
            }
          >
            <AppIcon
              name={db.profile.theme === 'dark' ? 'moon' : 'sun'}
              size={15}
              color={db.profile.theme === 'dark' ? theme.primary : theme.warning}
            />
          </AnimatedPressable>
        </View>
      </View>

      {/* Main Content Area with Animated Tab Transitions & Floating +XP Toast */}
      <View style={styles.mainBody}>
        <FloatingXpToast
          totalXp={levelState.totalXp}
          primaryColor={theme.primary}
          reduceMotion={reduceMotion}
        />

        <AnimatedScreenWrapper triggerKey={activeTab} reduceMotion={reduceMotion}>
          {activeTab === 'home' && (
            <HomeScreen theme={theme} onNavigateTab={(tab) => setActiveTab(tab)} />
          )}
          {activeTab === 'track' && <TrackScreen theme={theme} />}
          {activeTab === 'train' && <TrainScreen theme={theme} />}
          {activeTab === 'journey' && <JourneyScreen theme={theme} />}
          {activeTab === 'profile' && <ProfileScreen theme={theme} />}
        </AnimatedScreenWrapper>

        {/* Animated Floating Quick Add FAB (Section 5.1 & 15.3) */}
        <View style={styles.fabContainer}>
          <AnimatedPulseView
            active={!quickAddOpen}
            reduceMotion={reduceMotion}
            minScale={1}
            maxScale={1.06}
            duration={1600}
          >
            <AnimatedPressable
              accessibilityLabel="Quick Add Activity"
              reduceMotion={reduceMotion}
              style={[
                styles.fab,
                {
                  backgroundColor: theme.primary,
                  shadowColor: theme.primary,
                },
              ]}
              onPress={() => setQuickAddOpen(true)}
            >
              <Animated.View style={{ transform: [{ rotate: fabSpin }] }}>
                <AppIcon name="plus" size={24} color="#0E1220" />
              </Animated.View>
            </AnimatedPressable>
          </AnimatedPulseView>
        </View>
      </View>

      {/* 5-Tab Bottom Navigation Bar with FreeIcons Vector SVGs */}
      <View
        style={[
          styles.bottomNav,
          { backgroundColor: theme.card, borderTopColor: theme.border },
        ]}
      >
        {navItems.map((item) => {
          const selected = activeTab === item.id;
          return (
            <Pressable
              key={item.id}
              style={styles.navItem}
              onPress={() => setActiveTab(item.id)}
            >
              <View
                style={[
                  styles.navIconWrap,
                  selected && {
                    backgroundColor: `${theme.primary}20`,
                    transform: [{ translateY: -2 }],
                  },
                ]}
              >
                <AppIcon
                  name={item.icon}
                  size={20}
                  color={selected ? theme.primary : theme.textMuted}
                />
              </View>
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
        reduceMotion={reduceMotion}
      />

      {/* Celebration Overlay (4 Tiers) */}
      <CelebrationOverlay
        event={currentCelebration}
        onDismiss={dismissCelebration}
        theme={theme}
        lang={lang}
        reduceMotion={reduceMotion}
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
  brandNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rankDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainBody: {
    flex: 1,
    position: 'relative',
  },
  fabContainer: {
    position: 'absolute',
    right: 18,
    bottom: 18,
  },
  fab: {
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
    paddingVertical: 3,
    minHeight: 50,
    position: 'relative',
  },
  navIconWrap: {
    width: 36,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
