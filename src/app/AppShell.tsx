import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  Image,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, getTheme, radius, stroke } from './theme';
import { useAwakened } from '../data/repository';
import { isAppLockEnabled } from '../core/utils/pinSecurity';
import { t } from '../l10n/translations';
import { HomeScreen } from '../features/home/HomeScreen';
import { TrackScreen } from '../features/track/TrackScreen';
import { TrainScreen } from '../features/train/TrainScreen';
import { JourneyScreen } from '../features/journey/JourneyScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { OnboardingQuestionnaireScreen } from '../features/onboarding/OnboardingQuestionnaireScreen';
import {
  CelebrationOverlay,
  QuickAddFabModal,
} from '../features/components/SystemSharedComponents';
import { AppLockScreen } from '../features/components/AppLockScreen';
import { DripEdge } from '../features/components/InkComponents';
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
    isLoaded,
    levelState,
    currentRank,
    celebrationQueue,
    dismissCelebration,
    recordTabVisited,
    logWater,
    logRestDayCheckin,
    updateProfile,
    updateOnboardingDraft,
    completeOnboarding,
  } = useAwakened();

  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const backgroundedAtRef = useRef<number | null>(null);

  const lockConfigured = isAppLockEnabled(db.profile);

  useEffect(() => {
    if (!lockConfigured) {
      setIsUnlocked(true);
    }
  }, [lockConfigured]);

  useEffect(() => {
    if (!lockConfigured) return;
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundedAtRef.current = Date.now();
        if ((db.profile.appLockTimeoutSec ?? 30) <= 0) {
          setIsUnlocked(false);
        }
      } else if (nextState === 'active') {
        const bgAt = backgroundedAtRef.current;
        backgroundedAtRef.current = null;
        if (bgAt !== null) {
          const timeoutMs = Math.max(0, (db.profile.appLockTimeoutSec ?? 30) * 1000);
          if (Date.now() - bgAt >= timeoutMs) {
            setIsUnlocked(false);
          }
        }
      }
    });
    return () => {
      sub.remove();
    };
  }, [lockConfigured, db.profile.appLockTimeoutSec]);

  const isAppLocked = isLoaded && lockConfigured && !isUnlocked;

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    recordTabVisited(tab);
  };

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

  const tabSeedMap: Record<NavTab, number> = {
    home: 2,
    track: 3,
    train: 4,
    journey: 5,
    profile: 6,
  };

  if (isLoaded && !db.onboarding?.completed) {
    return (
      <OnboardingQuestionnaireScreen
        initialDraft={db.onboarding}
        theme={theme}
        lang={lang}
        soundEnabled={db.profile.soundEnabled}
        reduceMotion={reduceMotion}
        onToggleLanguage={() =>
          updateProfile({ language: db.profile.language === 'th' ? 'en' : 'th' })
        }
        onSaveDraft={updateOnboardingDraft}
        onFinishOnboarding={(finalDraft, pledged) => {
          completeOnboarding(finalDraft, pledged);
          setActiveTab('home');
        }}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.ink}
      />

      {/* Top Ink Header Bar + Asymmetric DripEdge (Section 2.2 & 4.2) */}
      <View style={styles.topBar}>
        <Pressable
          style={styles.brandRow}
          onPress={() => setActiveTab('profile')}
          accessibilityRole="button"
          accessibilityLabel="Profile"
        >
          <AnimatedPulseView
            active
            reduceMotion={reduceMotion}
            minScale={1}
            maxScale={1.05}
            duration={2000}
          >
            <View style={styles.avatarRing}>
              {db.profile.avatarUri ? (
                <Image
                  source={{ uri: db.profile.avatarUri }}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                  }}
                />
              ) : (
                <AwakenedBrandIcon size={32} />
              )}
            </View>
          </AnimatedPulseView>
          <View>
            <View style={styles.brandNameRow}>
              <Text style={styles.brandTitle} numberOfLines={1}>
                {db.profile.displayName?.toUpperCase() || 'HUNTER'}
              </Text>
              <View style={[styles.rankDot, { backgroundColor: colors.peach }]} />
            </View>
            <Text style={styles.brandSub}>
              Lv.{levelState.level} · {currentRank.id}-{currentRank.name}
            </Text>
          </View>
        </Pressable>

        <View style={styles.topActions}>
          <AnimatedPressable
            reduceMotion={reduceMotion}
            style={styles.headerChip}
            onPress={() =>
              updateProfile({ language: db.profile.language === 'th' ? 'en' : 'th' })
            }
          >
            <Text style={{ color: colors.ink, fontWeight: '900', fontSize: 12 }}>
              {lang.toUpperCase()}
            </Text>
          </AnimatedPressable>

          <AnimatedPressable
            reduceMotion={reduceMotion}
            style={[
              styles.headerChip,
              {
                backgroundColor:
                  db.profile.theme === 'dark' ? colors.peach : colors.peachSoft,
              },
            ]}
            onPress={() =>
              updateProfile({ theme: db.profile.theme === 'dark' ? 'light' : 'dark' })
            }
          >
            <AppIcon
              name={db.profile.theme === 'dark' ? 'moon' : 'sun'}
              size={15}
              color={colors.ink}
            />
          </AnimatedPressable>
        </View>
      </View>

      {/* Organic Ink Drip Edge separating dark Ink header from screen canvas */}
      <DripEdge
        seed={tabSeedMap[activeTab]}
        color={colors.ink}
        bgColor={theme.bg}
        height={22}
      />

      {/* Main Content Area with Animated Tab Transitions & Floating +XP Toast */}
      <View style={styles.mainBody}>
        <FloatingXpToast
          totalXp={levelState.totalXp}
          primaryColor={colors.peach}
          reduceMotion={reduceMotion}
        />

        <AnimatedScreenWrapper triggerKey={activeTab} reduceMotion={reduceMotion}>
          {activeTab === 'home' && (
            <HomeScreen theme={theme} onNavigateTab={(tab) => handleSelectTab(tab)} />
          )}
          {activeTab === 'track' && <TrackScreen theme={theme} />}
          {activeTab === 'train' && <TrainScreen theme={theme} />}
          {activeTab === 'journey' && <JourneyScreen theme={theme} />}
          {activeTab === 'profile' && <ProfileScreen theme={theme} />}
        </AnimatedScreenWrapper>

        {/* Animated Floating Quick Add FAB — Peach Circle with Thick Ink Outline */}
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
              style={styles.fab}
              onPress={() => setQuickAddOpen(true)}
            >
              <Animated.View style={{ transform: [{ rotate: fabSpin }] }}>
                <AppIcon name="plus" size={24} color={colors.ink} />
              </Animated.View>
            </AnimatedPressable>
          </AnimatedPulseView>
        </View>
      </View>

      {/* 5-Tab Bottom Navigation Bar — Active Item Has Peach Circle Backing (Section 3 & 5) */}
      <View
        style={[
          styles.bottomNav,
          {
            backgroundColor: theme.card,
            borderTopColor: theme.mode === 'dark' ? colors.peach : colors.ink,
          },
        ]}
      >
        {navItems.map((item) => {
          const selected = activeTab === item.id;
          return (
            <Pressable
              key={item.id}
              style={styles.navItem}
              onPress={() => handleSelectTab(item.id)}
            >
              <View
                style={[
                  styles.navIconWrap,
                  selected && {
                    backgroundColor: colors.peach,
                    borderWidth: stroke,
                    borderColor: colors.ink,
                    transform: [{ translateY: -3 }],
                  },
                ]}
              >
                <AppIcon
                  name={item.icon}
                  size={19}
                  color={
                    selected
                      ? colors.ink
                      : theme.mode === 'dark'
                      ? colors.cream
                      : colors.ink
                  }
                />
              </View>
              <Text
                style={[
                  styles.navLabel,
                  {
                    color: selected
                      ? theme.mode === 'dark'
                        ? colors.peach
                        : colors.ink
                      : theme.textMuted,
                    fontWeight: selected ? '900' : '700',
                  },
                ]}
              >
                {item.label}
              </Text>
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
        onNavigateTab={(tab) => handleSelectTab(tab)}
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

      {/* Full-screen PIN Lock (Section 1.1 & 4.8) */}
      {isAppLocked && (
        <AppLockScreen
          profile={db.profile}
          correctPin={db.profile.appLockPin}
          biometricEnabled={db.profile.appLockBiometricEnabled ?? true}
          onUnlock={() => setIsUnlocked(true)}
          onUpdateProfile={updateProfile}
          theme={theme}
          lang={lang}
          displayName={db.profile.displayName}
          rankName={`Lv.${levelState.level} · ${currentRank.id}-${currentRank.name}`}
          avatarUri={db.profile.avatarUri}
          reduceMotion={reduceMotion}
          soundEnabled={db.profile.soundEnabled}
        />
      )}
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
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: colors.ink,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: stroke,
    borderColor: colors.peach,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
    color: colors.cream,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  brandSub: {
    color: colors.peach,
    fontSize: 11.5,
    fontWeight: '800',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.chip,
    backgroundColor: colors.peachSoft,
    borderWidth: 2,
    borderColor: colors.peach,
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
    backgroundColor: colors.peach,
    borderWidth: stroke,
    borderBottomWidth: stroke + 2.5,
    borderRightWidth: stroke + 2.5,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: stroke,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
    minHeight: 52,
    position: 'relative',
  },
  navIconWrap: {
    width: 40,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: 11,
    marginTop: 2,
  },
});
