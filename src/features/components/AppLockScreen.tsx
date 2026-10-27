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
import { playSystemFeedback } from '../../services/soundService';

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

  const keypadNumbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const dotsArray = Array.from({ length: pinLength }, (_, i) => i);

  return (
    <Modal visible animationType="fade" transparent={false}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

        <View style={styles.headerArea}>
          <View style={styles.avatarWrap}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <AwakenedBrandIcon size={56} />
            )}
          </View>

          <Text style={[styles.systemStatus, { color: theme.primary }]}>
            AWAKENED SYSTEM LOCK
          </Text>
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
              ? `กรุณากรอกรหัส PIN ${pinLength} หลักเพื่อเข้าสู่ระบบ`
              : `Enter ${pinLength}-digit PIN to access system`}
          </Text>

          {/* 4 or 6 PIN Dots */}
          <Animated.View
            style={[
              styles.pinDotsRow,
              { transform: [{ translateX: shakeAnim }] },
            ]}
          >
            {dotsArray.map((index) => {
              const filled = enteredPin.length > index;
              return (
                <View
                  key={index}
                  style={[
                    styles.pinDot,
                    {
                      backgroundColor: filled
                        ? isLockedOut
                          ? theme.danger
                          : theme.primary
                        : 'transparent',
                      borderColor: isLockedOut
                        ? theme.danger
                        : filled
                        ? theme.primary
                        : theme.border,
                    },
                  ]}
                />
              );
            })}
          </Animated.View>

          {errorMsg ? (
            <Text style={[styles.errorText, { color: theme.danger }]}>
              {errorMsg}
            </Text>
          ) : (
            <View style={{ height: 22 }} />
          )}
        </View>

        {/* 3x4 Keypad */}
        <View style={styles.keypadContainer}>
          <View style={[styles.keypadGrid, isLockedOut && { opacity: 0.45 }]}>
            {keypadNumbers.map((num) => (
              <Pressable
                key={num}
                disabled={isLockedOut}
                style={[
                  styles.keypadBtn,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
                onPress={() => handleKeyPress(num)}
              >
                <Text style={[styles.keypadText, { color: theme.text }]}>
                  {num}
                </Text>
              </Pressable>
            ))}

            {/* Bottom Row: Biometric, 0, Backspace */}
            {hasBiometric && biometricEnabled ? (
              <Pressable
                disabled={isLockedOut}
                style={[
                  styles.keypadBtn,
                  { backgroundColor: theme.cardElevated, borderColor: theme.border },
                ]}
                onPress={handleBiometricAuth}
              >
                <AppIcon name="shield" size={24} color={theme.primary} />
              </Pressable>
            ) : (
              <View style={styles.keypadBtnEmpty} />
            )}

            <Pressable
              disabled={isLockedOut}
              style={[
                styles.keypadBtn,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              onPress={() => handleKeyPress('0')}
            >
              <Text style={[styles.keypadText, { color: theme.text }]}>0</Text>
            </Pressable>

            <Pressable
              disabled={isLockedOut}
              style={[
                styles.keypadBtn,
                { backgroundColor: theme.cardElevated, borderColor: theme.border },
              ]}
              onPress={handleDelete}
            >
              <Text style={{ color: theme.textSecondary, fontSize: 18, fontWeight: '800' }}>⌫</Text>
            </Pressable>
          </View>

          {/* Forgot PIN Button */}
          <Pressable
            style={styles.forgotBtn}
            onPress={() => {
              setRecoveryInput('');
              setRecoveryError(null);
              setResetStep(0);
              setResetConfirmText('');
              setForgotModalOpen(true);
            }}
          >
            <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '800' }}>
              {isTh ? 'ลืมรหัส PIN? (กู้คืนด้วย Recovery Code / รีเซ็ต)' : 'Forgot PIN? (Recovery Code / Reset)'}
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
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  headerArea: {
    alignItems: 'center',
    marginTop: 16,
  },
  avatarWrap: {
    marginBottom: 10,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#5B8CFF',
  },
  systemStatus: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  hunterName: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  hunterRank: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  instruction: {
    fontSize: 13,
    marginTop: 16,
    marginBottom: 14,
    textAlign: 'center',
  },
  pinDotsRow: {
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'center',
    marginVertical: 8,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
    minHeight: 22,
    textAlign: 'center',
  },
  keypadContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  keypadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: 280,
    gap: 14,
  },
  keypadBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    elevation: 2,
  },
  keypadBtnEmpty: {
    width: 72,
    height: 72,
  },
  keypadText: {
    fontSize: 24,
    fontWeight: '800',
  },
  forgotBtn: {
    marginTop: 14,
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
