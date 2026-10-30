import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppTheme, colors, radius, stroke } from '../../app/theme';
import { LanguageCode, UserProfile } from '../../core/engine/types';
import {
  getLockoutDurationMs,
  verifyPin,
  verifyRecoveryCode,
} from '../../core/utils/pinSecurity';
import { AppIcon } from './AppIcons';
import { AwakenMascot, DripEdge, MascotMood, PillButton } from './InkComponents';
import {
  authenticateBiometric,
  canAuthenticateBiometric,
} from '../../services/nativeBridge';
import { playSystemFeedback, triggerSelectionHaptic } from '../../services/soundService';

export interface BankPinDotsProps {
  pinLength: 4 | 6;
  filledCount: number;
  theme: AppTheme;
  isError?: boolean;
  shakeAnim?: Animated.Value;
  size?: number;
}

/**
 * Ink-Drop PIN Indicator Dots (Section 4.8: แถวจุด PIN เป็นหยดหมึกแทนวงกลมธรรมดา ขอบหนา 2.5px).
 * Uses soft Peach/Ink feedback on error instead of harsh neon red.
 */
export const BankPinDots: React.FC<BankPinDotsProps> = ({
  pinLength,
  filledCount,
  theme,
  isError = false,
  shakeAnim,
  size = 18,
}) => {
  const dots = Array.from({ length: pinLength }, (_, i) => i);
  const Container: any = shakeAnim ? Animated.View : View;
  const isDark = theme.mode === 'dark';

  return (
    <Container
      style={[
        styles.pinDotsRow,
        shakeAnim ? { transform: [{ translateX: shakeAnim }] } : null,
      ]}
    >
      {dots.map((index) => {
        const filled = filledCount > index;
        const fillCol = isError
          ? colors.peachSoft
          : filled
          ? colors.peach
          : isDark
          ? '#242042'
          : colors.white;
        const borderCol = isDark && !filled ? colors.peach : colors.ink;

        return (
          <View
            key={index}
            style={[
              styles.pinDotOuter,
              {
                width: size + 10,
                height: size + 10,
                borderRadius: (size + 10) / 2,
                backgroundColor: filled ? `${colors.peach}38` : 'transparent',
              },
            ]}
          >
            {/* Organic Teardrop / Ink Drop Shape */}
            <View
              style={{
                width: size,
                height: size,
                backgroundColor: fillCol,
                borderWidth: stroke,
                borderColor: borderCol,
                borderTopLeftRadius: 3,
                borderTopRightRadius: size * 0.55,
                borderBottomLeftRadius: size * 0.55,
                borderBottomRightRadius: size * 0.55,
                transform: [{ rotate: '45deg' }, { scale: filled ? 1.06 : 0.96 }],
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {filled && !isError && (
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: colors.ink,
                  }}
                />
              )}
            </View>
          </View>
        );
      })}
    </Container>
  );
};

export interface BankPinPadProps {
  onDigitPress: (digit: string) => void;
  onDeletePress: () => void;
  onClearLongPress?: () => void;
  leftActionType?: 'biometric' | 'clear' | 'none';
  leftActionLabel?: string;
  onLeftActionPress?: () => void;
  disabled?: boolean;
  compact?: boolean;
  theme: AppTheme;
  soundEnabled?: boolean;
}

const KEYPAD_ROWS: readonly (readonly string[])[] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

/**
 * 3x4 Numeric PIN Keypad with Thick Ink Outlines & Peach Press Highlights.
 * Strictly 3 columns per row:
 *   1  2  3
 *   4  5  6
 *   7  8  9
 *  [L] 0 [⌫]
 * Note: Duplicate bottom-left "Forgot PIN" button removed per v0.10.6 spec (Section 1.1).
 */
export const BankPinPad: React.FC<BankPinPadProps> = ({
  onDigitPress,
  onDeletePress,
  onClearLongPress,
  leftActionType = 'none',
  leftActionLabel,
  onLeftActionPress,
  disabled = false,
  compact = false,
  theme,
  soundEnabled = true,
}) => {
  const btnSize = compact ? 62 : 72;
  const numFontSize = compact ? 24 : 28;
  const rowGap = compact ? 11 : 14;
  const colGap = compact ? 20 : 24;
  const isDark = theme.mode === 'dark';

  const renderDigitButton = (digit: string) => (
    <Pressable
      key={digit}
      disabled={disabled}
      onPress={() => {
        triggerSelectionHaptic(soundEnabled);
        onDigitPress(digit);
      }}
      style={({ pressed }) => [
        styles.bankKeyCircle,
        {
          width: btnSize,
          height: btnSize,
          borderRadius: btnSize / 2,
          backgroundColor: pressed
            ? colors.peach
            : isDark
            ? '#211E3A'
            : colors.white,
          borderColor: isDark ? colors.peach : colors.ink,
          borderWidth: stroke,
          borderBottomWidth: pressed ? stroke : stroke + 2,
          borderRightWidth: pressed ? stroke : stroke + 2,
          transform: [{ translateY: pressed ? 1.5 : 0 }],
        },
      ]}
    >
      {({ pressed }) => (
        <Text
          style={[
            styles.bankKeyDigitText,
            {
              fontSize: numFontSize,
              color: pressed
                ? colors.ink
                : isDark
                ? colors.cream
                : colors.ink,
            },
          ]}
        >
          {digit}
        </Text>
      )}
    </Pressable>
  );

  return (
    <View
      style={[
        styles.bankKeypadWrap,
        { gap: rowGap },
        disabled && { opacity: 0.45 },
      ]}
    >
      {KEYPAD_ROWS.map((row, rIdx) => (
        <View key={rIdx} style={[styles.bankKeypadRow, { gap: colGap }]}>
          {row.map((digit) => renderDigitButton(digit))}
        </View>
      ))}

      {/* Bottom Row: Left Utility (Biometric / Clear / Empty) | 0 | Backspace */}
      <View style={[styles.bankKeypadRow, { gap: colGap }]}>
        {leftActionType !== 'none' && onLeftActionPress ? (
          <Pressable
            disabled={disabled}
            onPress={() => {
              triggerSelectionHaptic(soundEnabled);
              onLeftActionPress();
            }}
            style={({ pressed }) => [
              styles.bankKeyUtility,
              {
                width: btnSize,
                height: btnSize,
                borderRadius: btnSize / 2,
                backgroundColor: pressed
                  ? colors.peach
                  : isDark
                  ? '#211E3A'
                  : colors.peachSoft,
                borderWidth: stroke,
                borderColor: isDark ? colors.peach : colors.ink,
              },
            ]}
          >
            {leftActionType === 'biometric' ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <AppIcon
                  name="scan"
                  size={compact ? 20 : 24}
                  color={isDark ? colors.peach : colors.ink}
                />
                {leftActionLabel ? (
                  <Text
                    style={{
                      color: isDark ? colors.cream : colors.ink,
                      fontSize: 9.5,
                      fontWeight: '900',
                    }}
                    numberOfLines={1}
                  >
                    {leftActionLabel}
                  </Text>
                ) : null}
              </View>
            ) : (
              <Text
                style={{
                  color: isDark ? colors.cream : colors.ink,
                  fontSize: compact ? 12 : 13,
                  fontWeight: '900',
                  textAlign: 'center',
                }}
              >
                {leftActionLabel || 'Clear'}
              </Text>
            )}
          </Pressable>
        ) : (
          <View style={{ width: btnSize, height: btnSize }} />
        )}

        {/* Center 0 Digit */}
        {renderDigitButton('0')}

        {/* Right Backspace Slot */}
        <Pressable
          disabled={disabled}
          onPress={() => {
            triggerSelectionHaptic(soundEnabled);
            onDeletePress();
          }}
          onLongPress={() => {
            if (onClearLongPress) {
              triggerSelectionHaptic(soundEnabled);
              onClearLongPress();
            }
          }}
          style={({ pressed }) => [
            styles.bankKeyUtility,
            {
              width: btnSize,
              height: btnSize,
              borderRadius: btnSize / 2,
              backgroundColor: pressed
                ? colors.peach
                : isDark
                ? '#211E3A'
                : colors.peachSoft,
              borderWidth: stroke,
              borderColor: isDark ? colors.peach : colors.ink,
            },
          ]}
        >
          <View
            style={[
              styles.backspaceIconBox,
              {
                borderColor: isDark ? colors.cream : colors.ink,
                backgroundColor: isDark ? colors.ink : colors.white,
              },
            ]}
          >
            <Text
              style={{
                color: isDark ? colors.cream : colors.ink,
                fontSize: compact ? 12 : 13,
                fontWeight: '900',
                lineHeight: compact ? 14 : 15,
              }}
            >
              ⌫
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
};

interface AppLockScreenProps {
  profile?: UserProfile;
  correctPin?: string | null;
  biometricEnabled?: boolean;
  onUnlock: () => void;
  onUpdateProfile?: (patch: Partial<UserProfile>) => void;
  theme: AppTheme;
  lang: LanguageCode;
  displayName: string;
  rankName: string;
  avatarUri?: string | null;
  reduceMotion?: boolean;
  soundEnabled?: boolean;
}

export const AppLockScreen: React.FC<AppLockScreenProps> = ({
  profile,
  correctPin,
  biometricEnabled = true,
  onUnlock,
  onUpdateProfile,
  theme,
  lang,
  displayName,
  rankName,
  avatarUri,
  reduceMotion = false,
  soundEnabled = true,
}) => {
  const isTh = lang === 'th';
  const pinLength: 4 | 6 =
    profile?.appLockPinLength === 6 || correctPin?.length === 6 ? 6 : 4;

  const [enteredPin, setEnteredPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasBiometric, setHasBiometric] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [mascotMood, setMascotMood] = useState<MascotMood>('sleep');

  // Forgot PIN / Non-Destructive Recovery Modal state
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  const lockedUntilMs = profile?.appLockLockedUntilMs ?? null;
  const remainingLockSec =
    lockedUntilMs && lockedUntilMs > nowMs
      ? Math.ceil((lockedUntilMs - nowMs) / 1000)
      : 0;
  const isLockedOut = remainingLockSec > 0;

  useEffect(() => {
    if (!lockedUntilMs || lockedUntilMs <= Date.now()) return;
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 500);
    return () => clearInterval(timer);
  }, [lockedUntilMs]);

  // Gentle head-shake animation for incorrect PIN (Section 4.8)
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const triggerGentleShake = () => {
    setMascotMood('dizzy');
    playSystemFeedback('xp', soundEnabled);
    if (reduceMotion) return;
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 7, duration: 65, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -7, duration: 65, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 5, duration: 65, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -5, duration: 65, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 65, useNativeDriver: true }),
    ]).start();
  };

  const handleBiometricAuth = async (resetPinOnSuccess: boolean = false) => {
    if (isLockedOut && !resetPinOnSuccess) return;
    try {
      const ok = await authenticateBiometric(
        isTh ? 'ปลดล็อก Awakened' : 'Unlock Awakened',
        isTh
          ? 'ยืนยันตัวตนด้วยลายนิ้วมือหรือรหัสล็อกหน้าจอเครื่อง'
          : 'Verify with biometrics or device screen lock'
      );
      if (ok) {
        if (resetPinOnSuccess) {
          onUpdateProfile?.({
            appLockPin: null,
            appLockPinHash: null,
            appLockSalt: null,
            appLockFailedAttempts: 0,
            appLockLockedUntilMs: null,
          });
          setForgotModalOpen(false);
        } else {
          onUpdateProfile?.({
            appLockFailedAttempts: 0,
            appLockLockedUntilMs: null,
          });
        }
        setMascotMood('happy');
        playSystemFeedback('rankUp', soundEnabled);
        setTimeout(() => onUnlock(), 150);
      } else if (resetPinOnSuccess) {
        setRecoveryError(
          isTh
            ? 'ไม่สามารถยืนยันตัวตนด้วยระบบของเครื่องได้ กรุณาลองอีกครั้งหรือใช้ Recovery Code'
            : 'Device verification was cancelled or failed. Try again or use Recovery Code.'
        );
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    let isMounted = true;
    canAuthenticateBiometric().then((supported) => {
      if (isMounted) {
        setHasBiometric(supported);
        if (supported && biometricEnabled && !isLockedOut) {
          handleBiometricAuth(false);
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [biometricEnabled]);

  const handleKeyPress = (digit: string) => {
    if (isLockedOut) return;
    if (enteredPin.length >= pinLength) return;
    setErrorMsg(null);
    const next = enteredPin + digit;
    setEnteredPin(next);
    setMascotMood('idle');

    playSystemFeedback('quest', soundEnabled);

    if (next.length === pinLength) {
      const isValid = profile
        ? verifyPin(next, profile)
        : Boolean(correctPin && next === correctPin);

      if (isValid) {
        setMascotMood('happy');
        onUpdateProfile?.({
          appLockFailedAttempts: 0,
          appLockLockedUntilMs: null,
        });
        playSystemFeedback('rankUp', soundEnabled);
        setTimeout(() => onUnlock(), 180);
      } else {
        triggerGentleShake();
        const nextFails = (profile?.appLockFailedAttempts ?? 0) + 1;
        const cooldownMs = getLockoutDurationMs(nextFails);
        const until = cooldownMs > 0 ? Date.now() + cooldownMs : null;
        setNowMs(Date.now());
        onUpdateProfile?.({
          appLockFailedAttempts: nextFails,
          appLockLockedUntilMs: until,
        });
        if (cooldownMs > 0) {
          const sec = Math.ceil(cooldownMs / 1000);
          setErrorMsg(
            isTh
              ? `พักจังหวะสักนิดนะ ลองใหม่ได้ในอีก ${sec} วินาที`
              : `Let’s pause a moment. Try again in ${sec}s.`
          );
        } else {
          const left = Math.max(0, 5 - nextFails);
          setErrorMsg(
            isTh
              ? `รหัสยังไม่ตรงนะ ลองดูอีกครั้ง (เหลืออีก ${left} ครั้ง)`
              : `Not quite right. Try again (${left} tries left)`
          );
        }
        setTimeout(() => {
          setEnteredPin('');
          setMascotMood('sleep');
        }, 550);
      }
    }
  };

  const handleDelete = () => {
    if (isLockedOut) return;
    if (enteredPin.length > 0) {
      playSystemFeedback('quest', soundEnabled);
      const next = enteredPin.slice(0, -1);
      setEnteredPin(next);
      if (next.length === 0) setMascotMood('sleep');
      setErrorMsg(null);
    }
  };

  const handleVerifyRecovery = () => {
    if (!profile?.appLockRecoveryCode) {
      setRecoveryError(
        isTh
          ? 'ไม่พบรหัสกู้คืนในโปรไฟล์นี้ กรุณาใช้ปุ่มปลดล็อกด้วยระบบของเครื่องด้านล่าง'
          : 'No recovery code found. Please use the Device Screen Lock button below.'
      );
      return;
    }
    if (verifyRecoveryCode(recoveryInput, profile.appLockRecoveryCode)) {
      onUpdateProfile?.({
        appLockPin: null,
        appLockPinHash: null,
        appLockSalt: null,
        appLockFailedAttempts: 0,
        appLockLockedUntilMs: null,
      });
      setForgotModalOpen(false);
      setMascotMood('happy');
      playSystemFeedback('rankUp', soundEnabled);
      onUnlock();
    } else {
      setRecoveryError(
        isTh
          ? 'รหัสกู้คืนยังไม่ตรงนะ ลองตรวจสอบอีกครั้ง (เช่น AWK-XXXX-XXXX)'
          : 'Recovery Code did not match. Please check again (e.g. AWK-XXXX-XXXX).'
      );
    }
  };

  const openForgotModal = () => {
    setRecoveryInput('');
    setRecoveryError(null);
    setForgotModalOpen(true);
  };

  const isDark = theme.mode === 'dark';
  const surfaceBg = isDark ? colors.ink : colors.cream;

  return (
    <Modal visible animationType="fade" transparent={false}>
      <SafeAreaView style={[styles.container, { backgroundColor: surfaceBg }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.ink} />

        {/* Top Ink Header with Mascot & Organic DripEdge (Mockup Login "И снова привет!") */}
        <View>
          <View style={styles.inkTopBanner}>
            <View style={styles.mascotsAndAvatarRow}>
              <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                <AwakenMascot
                  rankId={rankName.includes('M') ? 'M' : rankName.includes('SS') ? 'SS' : 'C'}
                  level={10}
                  mood={mascotMood}
                  size={74}
                  reduceMotion={reduceMotion}
                />
              </Animated.View>

              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : null}
            </View>

            <Text style={styles.welcomeTitle}>
              {isTh ? 'กลับมาแล้วนะ!' : 'Welcome back!'}
            </Text>
            <Text style={styles.hunterMeta} numberOfLines={1}>
              {displayName || 'HUNTER'} · {rankName}
            </Text>
          </View>

          <DripEdge
            seed={1}
            color={colors.ink}
            bgColor={surfaceBg}
            height={28}
          />
        </View>

        {/* Center PIN Input Card Area */}
        <View style={styles.headerArea}>
          <Text style={[styles.instruction, { color: theme.text }]}>
            {isLockedOut
              ? isTh
                ? `⏳ พักสักครู่ รออีก ${remainingLockSec} วินาทีนะ`
                : `⏳ Resting a bit. Wait ${remainingLockSec}s`
              : mascotMood === 'happy'
              ? isTh
                ? '✦ ตื่นแล้ว! กำลังเปิดประตูมิติ...'
                : '✦ Awake! Opening system...'
              : isTh
              ? 'กดรหัส PIN เพื่อปลุกมาสคอตและเข้าแอป'
              : 'Enter PIN to wake Awaken & continue'}
          </Text>

          {/* Ink-Drop PIN Dots */}
          <BankPinDots
            pinLength={pinLength}
            filledCount={enteredPin.length}
            theme={theme}
            isError={Boolean(errorMsg) || isLockedOut}
            shakeAnim={shakeAnim}
            size={17}
          />

          {errorMsg ? (
            <View style={styles.softErrorBadge}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : (
            <View style={{ height: 28 }} />
          )}
        </View>

        {/* 3x4 PIN Keypad + Single Bottom Forgot PIN Button */}
        <View style={styles.keypadContainer}>
          <BankPinPad
            onDigitPress={handleKeyPress}
            onDeletePress={handleDelete}
            onClearLongPress={() => {
              setEnteredPin('');
              setErrorMsg(null);
              setMascotMood('sleep');
            }}
            leftActionType={
              hasBiometric && biometricEnabled ? 'biometric' : 'none'
            }
            leftActionLabel={
              hasBiometric && biometricEnabled
                ? isTh
                  ? 'สแกน'
                  : 'Scan'
                : undefined
            }
            onLeftActionPress={
              hasBiometric && biometricEnabled
                ? () => handleBiometricAuth(false)
                : undefined
            }
            disabled={isLockedOut}
            theme={theme}
            soundEnabled={soundEnabled}
          />

          {/* Single Bottom Forgot PIN Button (Section 1.1: เก็บเฉพาะอันล่าง) */}
          <Pressable style={styles.forgotBtn} onPress={openForgotModal}>
            <Text
              style={{
                color: isDark ? colors.peach : colors.ink,
                fontSize: 13.5,
                fontWeight: '900',
                textDecorationLine: 'underline',
              }}
            >
              {isTh ? 'ลืมรหัส PIN?' : 'Forgot PIN?'}
            </Text>
          </Pressable>
        </View>

        {/* Non-Destructive Forgot PIN Modal (Section 1.1: เอาปุ่มลบข้อมูลทั้งหมดออก) */}
        <Modal
          visible={forgotModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setForgotModalOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View
              style={[
                styles.recoveryCard,
                {
                  backgroundColor: isDark ? '#211E3A' : colors.white,
                  borderColor: isDark ? colors.peach : colors.ink,
                },
              ]}
            >
              <Text
                style={{
                  color: isDark ? colors.cream : colors.ink,
                  fontSize: 18,
                  fontWeight: '900',
                  marginBottom: 6,
                }}
              >
                {isTh ? '🔑 ลืมรหัส PIN ใช่ไหม?' : '🔑 Forgot Your PIN?'}
              </Text>

              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 12.5,
                  lineHeight: 18,
                  marginBottom: 10,
                }}
              >
                {isTh
                  ? 'กู้คืนการเข้าใช้งานได้โดยข้อมูลและเลเวลทั้งหมดยังอยู่ครบ 100% เลือกวิธีด้านล่างได้เลย:'
                  : 'Recover access with 100% of your data and levels intact using either method below:'}
              </Text>

              {/* Option 1: Unlock & Reset via Android Biometric / Screen Lock (Recommended in Section 1.1) */}
              {hasBiometric && (
                <View style={{ marginBottom: 12 }}>
                  <PillButton
                    label={
                      isTh
                        ? 'ปลดล็อกด้วยลายนิ้วมือ / รหัสหน้าจอเครื่อง'
                        : 'Unlock with Device Biometrics / Screen Lock'
                    }
                    icon="scan"
                    variant="primary"
                    onPress={() => handleBiometricAuth(true)}
                  />
                </View>
              )}

              {/* Option 2: Recovery Code */}
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 12,
                  fontWeight: '800',
                  marginBottom: 6,
                }}
              >
                {isTh
                  ? 'หรือกรอกรหัสกู้คืน (Recovery Code) ที่จดไว้ตอนตั้ง PIN:'
                  : 'Or enter the Recovery Code saved when setting your PIN:'}
              </Text>

              <TextInput
                value={recoveryInput}
                onChangeText={(txt) => {
                  setRecoveryInput(txt.toUpperCase());
                  setRecoveryError(null);
                }}
                placeholder="AWK-XXXX-XXXX"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="characters"
                style={[
                  styles.recoveryInput,
                  {
                    color: isDark ? colors.cream : colors.ink,
                    backgroundColor: isDark ? colors.ink : colors.cream,
                    borderColor: isDark ? colors.peach : colors.ink,
                  },
                ]}
              />

              {recoveryError && (
                <View style={[styles.softErrorBadge, { marginTop: 8 }]}>
                  <Text style={styles.errorText}>{recoveryError}</Text>
                </View>
              )}

              <View style={{ marginTop: 12 }}>
                <PillButton
                  label={
                    isTh ? 'รีเซ็ต PIN ด้วย Recovery Code' : 'Reset PIN with Recovery Code'
                  }
                  variant="dark"
                  onPress={handleVerifyRecovery}
                />
              </View>

              <Pressable
                style={{ marginTop: 14, alignSelf: 'center', padding: 6 }}
                onPress={() => setForgotModalOpen(false)}
              >
                <Text
                  style={{
                    color: theme.textMuted,
                    fontSize: 13,
                    fontWeight: '800',
                  }}
                >
                  {isTh ? 'ปิดหน้าต่าง' : 'Close'}
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  inkTopBanner: {
    backgroundColor: colors.ink,
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  mascotsAndAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  avatarImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: stroke,
    borderColor: colors.peach,
  },
  welcomeTitle: {
    color: colors.cream,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: 0.4,
  },
  hunterMeta: {
    color: colors.peach,
    fontSize: 12.5,
    fontWeight: '800',
    marginTop: 2,
  },
  headerArea: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  instruction: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  pinDotsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 6,
  },
  pinDotOuter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  softErrorBadge: {
    marginTop: 6,
    backgroundColor: colors.peachSoft,
    borderColor: colors.ink,
    borderWidth: 1.8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  errorText: {
    color: colors.ink,
    fontSize: 11.5,
    fontWeight: '900',
    textAlign: 'center',
  },
  keypadContainer: {
    alignItems: 'center',
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  bankKeypadWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankKeypadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankKeyCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankKeyDigitText: {
    fontWeight: '900',
    includeFontPadding: false,
  },
  bankKeyUtility: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  backspaceIconBox: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 2,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgotBtn: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: radius.chip,
    backgroundColor: colors.peachSoft,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(22, 20, 43, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  recoveryCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radius.card,
    borderWidth: stroke,
    borderBottomWidth: stroke + 3,
    borderRightWidth: stroke + 3,
    padding: 20,
  },
  recoveryInput: {
    borderWidth: stroke,
    borderRadius: radius.input,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
});
