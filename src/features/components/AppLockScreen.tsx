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
import { AppTheme } from '../../app/theme';
import { LanguageCode, UserProfile } from '../../core/engine/types';
import {
  getLockoutDurationMs,
  verifyPin,
  verifyRecoveryCode,
} from '../../core/utils/pinSecurity';
import { AppIcon, AwakenedBrandIcon } from './AppIcons';
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
 * Standard Banking-App style PIN indicator dots (4 or 6 dots).
 */
export const BankPinDots: React.FC<BankPinDotsProps> = ({
  pinLength,
  filledCount,
  theme,
  isError = false,
  shakeAnim,
  size = 16,
}) => {
  const dots = Array.from({ length: pinLength }, (_, i) => i);
  const Container: any = shakeAnim ? Animated.View : View;

  return (
    <Container
      style={[
        styles.pinDotsRow,
        shakeAnim ? { transform: [{ translateX: shakeAnim }] } : null,
      ]}
    >
      {dots.map((index) => {
        const filled = filledCount > index;
        const activeColor = isError ? theme.danger : theme.primary;
        return (
          <View
            key={index}
            style={[
              styles.pinDotOuter,
              {
                width: size + 8,
                height: size + 8,
                borderRadius: (size + 8) / 2,
                backgroundColor: filled ? `${activeColor}22` : 'transparent',
              },
            ]}
          >
            <View
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: filled ? activeColor : 'transparent',
                borderWidth: 2,
                borderColor: isError
                  ? theme.danger
                  : filled
                  ? activeColor
                  : theme.textMuted,
              }}
            />
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
  leftActionType?: 'biometric' | 'forgot' | 'clear' | 'none';
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
 * Authentic Banking-Style 3x4 Numeric PIN Keypad (like K PLUS / SCB EASY).
 * Strictly 3 columns per row:
 *   1  2  3
 *   4  5  6
 *   7  8  9
 *  [L] 0 [⌫]
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
  const btnSize = compact ? 64 : 76;
  const numFontSize = compact ? 25 : 29;
  const rowGap = compact ? 12 : 16;
  const colGap = compact ? 22 : 28;

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
            ? `${theme.primary}2E`
            : theme.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.05)'
            : 'rgba(15, 23, 42, 0.04)',
          borderColor: pressed
            ? theme.primary
            : theme.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.16)'
            : 'rgba(15, 23, 42, 0.15)',
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
      ]}
    >
      {({ pressed }) => (
        <Text
          style={[
            styles.bankKeyDigitText,
            {
              fontSize: numFontSize,
              color: pressed ? theme.primary : theme.text,
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
        disabled && { opacity: 0.42 },
      ]}
    >
      {KEYPAD_ROWS.map((row, rIdx) => (
        <View key={rIdx} style={[styles.bankKeypadRow, { gap: colGap }]}>
          {row.map((digit) => renderDigitButton(digit))}
        </View>
      ))}

      {/* Bottom Row: Left Action | 0 | Backspace */}
      <View style={[styles.bankKeypadRow, { gap: colGap }]}>
        {/* Left Action Slot */}
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
                backgroundColor: pressed ? `${theme.primary}1E` : 'transparent',
              },
            ]}
          >
            {leftActionType === 'biometric' ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <AppIcon name="scan" size={compact ? 22 : 26} color={theme.primary} />
                {leftActionLabel ? (
                  <Text
                    style={{
                      color: theme.primary,
                      fontSize: 9.5,
                      fontWeight: '700',
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
                  color: theme.textSecondary,
                  fontSize: compact ? 12 : 13,
                  fontWeight: '700',
                  textAlign: 'center',
                }}
              >
                {leftActionLabel || 'ลืมรหัส?'}
              </Text>
            )}
          </Pressable>
        ) : (
          <View style={{ width: btnSize, height: btnSize }} />
        )}

        {/* Center 0 Digit */}
        {renderDigitButton('0')}

        {/* Right Backspace Slot (Frameless banking backspace icon) */}
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
              backgroundColor: pressed ? `${theme.textMuted}22` : 'transparent',
            },
          ]}
        >
          <View
            style={[
              styles.backspaceIconBox,
              {
                borderColor: theme.textSecondary,
              },
            ]}
          >
            <Text
              style={{
                color: theme.text,
                fontSize: compact ? 13 : 14,
                fontWeight: '900',
                lineHeight: compact ? 15 : 16,
              }}
            >
              ✕
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
  onResetAllData?: () => void;
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
  onResetAllData,
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

  // Forgot PIN / Recovery Modal state
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [resetStep, setResetStep] = useState<0 | 1>(0);
  const [resetConfirmText, setResetConfirmText] = useState('');

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

  // Shake animation for incorrect PIN
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    playSystemFeedback('xp', soundEnabled);
    if (reduceMotion) return;
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleBiometricAuth = async () => {
    if (isLockedOut) return;
    try {
      const ok = await authenticateBiometric(
        isTh ? 'ปลดล็อกระบบ Awakened' : 'Unlock Awakened System',
        isTh ? 'ยืนยันตัวตนด้วยลายนิ้วมือหรือใบหน้า' : 'Verify with fingerprint or biometrics'
      );
      if (ok) {
        onUpdateProfile?.({
          appLockFailedAttempts: 0,
          appLockLockedUntilMs: null,
        });
        playSystemFeedback('rankUp', soundEnabled);
        onUnlock();
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
          handleBiometricAuth();
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

    playSystemFeedback('quest', soundEnabled);

    if (next.length === pinLength) {
      const isValid = profile
        ? verifyPin(next, profile)
        : Boolean(correctPin && next === correctPin);

      if (isValid) {
        onUpdateProfile?.({
          appLockFailedAttempts: 0,
          appLockLockedUntilMs: null,
        });
        playSystemFeedback('rankUp', soundEnabled);
        setTimeout(() => onUnlock(), 120);
      } else {
        triggerShake();
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
              ? `ผิดเกินกำหนด (${nextFails} ครั้ง) ล็อกชั่วคราว ${sec} วินาที`
              : `Too many attempts (${nextFails}). Locked for ${sec}s.`
          );
        } else {
          const left = Math.max(0, 5 - nextFails);
          setErrorMsg(
            isTh
              ? `รหัส PIN ไม่ถูกต้อง (เหลือโอกาสอีก ${left} ครั้งก่อนพักเวลา)`
              : `Incorrect PIN (${left} attempts remaining before cooldown)`
          );
        }
        setTimeout(() => setEnteredPin(''), 450);
      }
    }
  };

  const handleDelete = () => {
    if (isLockedOut) return;
    if (enteredPin.length > 0) {
      playSystemFeedback('quest', soundEnabled);
      setEnteredPin((prev) => prev.slice(0, -1));
      setErrorMsg(null);
    }
  };

  const handleVerifyRecovery = () => {
    if (!profile?.appLockRecoveryCode) {
      setRecoveryError(
        isTh
          ? 'ไม่พบรหัสกู้คืนในโปรไฟล์นี้ กรุณาใช้ตัวเลือกรีเซ็ตข้อมูล'
          : 'No recovery code found on this profile. Please use Reset Data.'
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
      playSystemFeedback('rankUp', soundEnabled);
      onUnlock();
    } else {
      setRecoveryError(
        isTh
          ? 'รหัสกู้คืนไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง (เช่น AWK-XXXX-XXXX)'
          : 'Invalid Recovery Code. Please check again (e.g. AWK-XXXX-XXXX).'
      );
    }
  };

  const handleConfirmResetAll = () => {
    const clean = resetConfirmText.trim().toUpperCase();
    if (clean !== 'RESET' && resetConfirmText.trim() !== 'ลบข้อมูล') {
      setRecoveryError(
        isTh
          ? 'กรุณาพิมพ์คำว่า RESET หรือ ลบข้อมูล เพื่อยืนยัน'
          : 'Please type RESET to confirm.'
      );
      return;
    }
    setForgotModalOpen(false);
    onResetAllData?.();
    onUnlock();
  };

  const openForgotModal = () => {
    setRecoveryInput('');
    setRecoveryError(null);
    setResetStep(0);
    setResetConfirmText('');
    setForgotModalOpen(true);
  };

  return (
    <Modal visible animationType="fade" transparent={false}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <StatusBar
          barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={theme.bg}
        />

        <View style={styles.headerArea}>
          <View style={styles.avatarWrap}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <AwakenedBrandIcon size={58} />
            )}
          </View>

          <Text style={[styles.hunterName, { color: theme.text }]} numberOfLines={1}>
            {displayName || 'HUNTER'}
          </Text>
          <Text style={[styles.hunterRank, { color: theme.textMuted }]}>
            {rankName}
          </Text>

          <Text style={[styles.instruction, { color: theme.textSecondary }]}>
            {isLockedOut
              ? isTh
                ? `⏳ ระบบล็อกชั่วคราว กรุณารออีก ${remainingLockSec} วินาที`
                : `⏳ Temporarily locked. Please wait ${remainingLockSec}s`
              : isTh
              ? 'กรุณาใส่รหัส PIN เพื่อเข้าใช้งาน'
              : 'Enter PIN to unlock'}
          </Text>

          {/* Banking-Style PIN Dots */}
          <BankPinDots
            pinLength={pinLength}
            filledCount={enteredPin.length}
            theme={theme}
            isError={Boolean(errorMsg) || isLockedOut}
            shakeAnim={shakeAnim}
            size={15}
          />

          {errorMsg ? (
            <Text style={[styles.errorText, { color: theme.danger }]}>
              {errorMsg}
            </Text>
          ) : (
            <View style={{ height: 22 }} />
          )}
        </View>

        {/* Banking-Style 3x4 PIN Keypad */}
        <View style={styles.keypadContainer}>
          <BankPinPad
            onDigitPress={handleKeyPress}
            onDeletePress={handleDelete}
            onClearLongPress={() => {
              setEnteredPin('');
              setErrorMsg(null);
            }}
            leftActionType={
              hasBiometric && biometricEnabled ? 'biometric' : 'forgot'
            }
            leftActionLabel={
              hasBiometric && biometricEnabled
                ? isTh
                  ? 'สแกน'
                  : 'Scan'
                : isTh
                ? 'ลืมรหัส?'
                : 'Forgot?'
            }
            onLeftActionPress={
              hasBiometric && biometricEnabled
                ? handleBiometricAuth
                : openForgotModal
            }
            disabled={isLockedOut}
            theme={theme}
            soundEnabled={soundEnabled}
          />

          {/* Bottom Forgot PIN link */}
          <Pressable style={styles.forgotBtn} onPress={openForgotModal}>
            <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '700' }}>
              {isTh ? 'ลืมรหัส PIN?' : 'Forgot PIN?'}
            </Text>
          </Pressable>
        </View>

        {/* Recovery Code / Reset All Data Modal */}
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
                { backgroundColor: theme.cardElevated, borderColor: theme.border },
              ]}
            >
              <Text style={{ color: theme.text, fontSize: 17, fontWeight: '900', marginBottom: 6 }}>
                {isTh ? '🔑 กู้คืนการเข้าถึงแอป' : '🔑 Recover App Access'}
              </Text>

              {resetStep === 0 ? (
                <>
                  <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 18, marginBottom: 10 }}>
                    {isTh
                      ? 'กรอกรหัสกู้คืน (Recovery Code) ที่ได้บันทึกไว้ตอนตั้งค่า PIN เพื่อปลดล็อกโดยที่ข้อมูลและเลเวลทั้งหมดยังอยู่ครบ:'
                      : 'Enter the Recovery Code saved when you set up your PIN to unlock without losing any data:'}
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
                        color: theme.text,
                        backgroundColor: theme.bgSecondary,
                        borderColor: theme.border,
                      },
                    ]}
                  />
                  {recoveryError && (
                    <Text style={{ color: theme.danger, fontSize: 12, fontWeight: '700', marginTop: 6 }}>
                      {recoveryError}
                    </Text>
                  )}

                  <Pressable
                    style={[styles.primaryActionBtn, { backgroundColor: theme.primary, marginTop: 12 }]}
                    onPress={handleVerifyRecovery}
                  >
                    <Text style={{ color: '#0E1220', fontWeight: '900', fontSize: 14 }}>
                      {isTh ? 'ปลดล็อกด้วย Recovery Code' : 'Unlock with Recovery Code'}
                    </Text>
                  </Pressable>

                  <View style={[styles.divider, { backgroundColor: theme.border }]} />

                  <Text style={{ color: theme.textMuted, fontSize: 11, lineHeight: 16 }}>
                    {isTh
                      ? 'หากไม่ได้เก็บรหัสกู้คืนไว้ คุณสามารถล้างข้อมูลทั้งหมดเพื่อเริ่มใช้งานแอปใหม่ได้:'
                      : 'If you lost your Recovery Code, you can wipe all app data and start fresh:'}
                  </Text>
                  <Pressable
                    style={[
                      styles.secondaryActionBtn,
                      { borderColor: theme.danger, backgroundColor: `${theme.danger}15`, marginTop: 8 },
                    ]}
                    onPress={() => {
                      setRecoveryError(null);
                      setResetStep(1);
                    }}
                  >
                    <Text style={{ color: theme.danger, fontWeight: '800', fontSize: 12 }}>
                      {isTh ? '⚠️ ล้างข้อมูลทั้งหมดและรีเซ็ตแอป...' : '⚠️ Wipe All Data & Reset App...'}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={{ color: theme.danger, fontSize: 13, fontWeight: '800', lineHeight: 19, marginBottom: 8 }}>
                    {isTh
                      ? 'คำเตือน: การรีเซ็ตจะลบเลเวล, EXP, ถ้วยรางวัล, และประวัติทั้งหมดอย่างถาวร ไม่สามารถกู้คืนได้'
                      : 'WARNING: Resetting will permanently delete your level, EXP, trophies, and all history.'}
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 8 }}>
                    {isTh
                      ? 'พิมพ์คำว่า RESET หรือ ลบข้อมูล เพื่อยืนยัน:'
                      : 'Type RESET below to confirm:'}
                  </Text>
                  <TextInput
                    value={resetConfirmText}
                    onChangeText={(txt) => {
                      setResetConfirmText(txt);
                      setRecoveryError(null);
                    }}
                    placeholder={isTh ? 'พิมพ์ RESET หรือ ลบข้อมูล' : 'Type RESET'}
                    placeholderTextColor={theme.textMuted}
                    autoCapitalize="characters"
                    style={[
                      styles.recoveryInput,
                      {
                        color: theme.text,
                        backgroundColor: theme.bgSecondary,
                        borderColor: theme.danger,
                      },
                    ]}
                  />
                  {recoveryError && (
                    <Text style={{ color: theme.danger, fontSize: 12, fontWeight: '700', marginTop: 6 }}>
                      {recoveryError}
                    </Text>
                  )}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                    <Pressable
                      style={[
                        styles.secondaryActionBtn,
                        { flex: 1, borderColor: theme.border, backgroundColor: theme.bgSecondary },
                      ]}
                      onPress={() => {
                        setResetStep(0);
                        setRecoveryError(null);
                      }}
                    >
                      <Text style={{ color: theme.textSecondary, fontWeight: '800', fontSize: 13 }}>
                        {isTh ? 'ย้อนกลับ' : 'Back'}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.primaryActionBtn,
                        { flex: 1, backgroundColor: theme.danger },
                      ]}
                      onPress={handleConfirmResetAll}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 13 }}>
                        {isTh ? 'ยืนยันลบข้อมูลทั้งหมด' : 'Confirm Wipe'}
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}

              <Pressable
                style={{ marginTop: 14, alignSelf: 'center', padding: 6 }}
                onPress={() => setForgotModalOpen(false)}
              >
                <Text style={{ color: theme.textMuted, fontSize: 13, fontWeight: '700' }}>
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
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  headerArea: {
    alignItems: 'center',
    marginTop: 22,
  },
  avatarWrap: {
    marginBottom: 10,
  },
  avatarImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#5B8CFF',
  },
  hunterName: {
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hunterRank: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  instruction: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 14,
    textAlign: 'center',
  },
  pinDotsRow: {
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  pinDotOuter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 6,
    minHeight: 22,
    textAlign: 'center',
  },
  keypadContainer: {
    alignItems: 'center',
    marginBottom: 16,
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
    borderWidth: 1.2,
  },
  bankKeyDigitText: {
    fontWeight: '600',
    includeFontPadding: false,
  },
  bankKeyUtility: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  backspaceIconBox: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1.6,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgotBtn: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 9, 18, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  recoveryCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 20,
  },
  recoveryInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  primaryActionBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
});
