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
  View,
} from 'react-native';
import { AppTheme } from '../../app/theme';
import { LanguageCode } from '../../core/engine/types';
import { AppIcon, AwakenedBrandIcon } from './AppIcons';
import {
  authenticateBiometric,
  canAuthenticateBiometric,
} from '../../services/nativeBridge';
import { playSystemFeedback } from '../../services/soundService';

interface AppLockScreenProps {
  correctPin: string;
  biometricEnabled?: boolean;
  onUnlock: () => void;
  theme: AppTheme;
  lang: LanguageCode;
  displayName: string;
  rankName: string;
  avatarUri?: string | null;
  reduceMotion?: boolean;
  soundEnabled?: boolean;
}

export const AppLockScreen: React.FC<AppLockScreenProps> = ({
  correctPin,
  biometricEnabled = true,
  onUnlock,
  theme,
  lang,
  displayName,
  rankName,
  avatarUri,
  reduceMotion = false,
  soundEnabled = true,
}) => {
  const isTh = lang === 'th';
  const [enteredPin, setEnteredPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasBiometric, setHasBiometric] = useState(false);

  // Shake animation for incorrect PIN
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    playSystemFeedback('xp', soundEnabled);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleBiometricAuth = async () => {
    try {
      const ok = await authenticateBiometric(
        isTh ? 'ปลดล็อกระบบ Awakened' : 'Unlock Awakened System',
        isTh ? 'ยืนยันตัวตนด้วยลายนิ้วมือหรือใบหน้า' : 'Verify with fingerprint or biometrics'
      );
      if (ok) {
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
        if (supported && biometricEnabled) {
          handleBiometricAuth();
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [biometricEnabled]);

  const handleKeyPress = (digit: string) => {
    if (enteredPin.length >= 4) return;
    setErrorMsg(null);
    const next = enteredPin + digit;
    setEnteredPin(next);

    playSystemFeedback('quest', soundEnabled);

    if (next.length === 4) {
      if (next === correctPin) {
        playSystemFeedback('rankUp', soundEnabled);
        setTimeout(() => onUnlock(), 120);
      } else {
        triggerShake();
        setErrorMsg(isTh ? 'รหัส PIN ไม่ถูกต้อง' : 'Incorrect PIN');
        setTimeout(() => setEnteredPin(''), 500);
      }
    }
  };

  const handleDelete = () => {
    if (enteredPin.length > 0) {
      playSystemFeedback('quest', soundEnabled);
      setEnteredPin((prev) => prev.slice(0, -1));
      setErrorMsg(null);
    }
  };

  const keypadNumbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

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
            {isTh
              ? 'กรุณากรอกรหัส PIN 4 หลักเพื่อเข้าสู่ระบบ'
              : 'Enter 4-digit PIN to access system'}
          </Text>

          {/* 4 PIN Dots */}
          <Animated.View
            style={[
              styles.pinDotsRow,
              { transform: [{ translateX: shakeAnim }] },
            ]}
          >
            {[0, 1, 2, 3].map((index) => {
              const filled = enteredPin.length > index;
              return (
                <View
                  key={index}
                  style={[
                    styles.pinDot,
                    {
                      backgroundColor: filled ? theme.primary : 'transparent',
                      borderColor: filled ? theme.primary : theme.border,
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
            <View style={{ height: 20 }} />
          )}
        </View>

        {/* 3x4 Keypad */}
        <View style={styles.keypadContainer}>
          <View style={styles.keypadGrid}>
            {keypadNumbers.map((num) => (
              <Pressable
                key={num}
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
              style={[
                styles.keypadBtn,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              onPress={() => handleKeyPress('0')}
            >
              <Text style={[styles.keypadText, { color: theme.text }]}>0</Text>
            </Pressable>

            <Pressable
              style={[
                styles.keypadBtn,
                { backgroundColor: theme.cardElevated, borderColor: theme.border },
              ]}
              onPress={handleDelete}
            >
              <Text style={{ color: theme.textSecondary, fontSize: 18, fontWeight: '800' }}>⌫</Text>
            </Pressable>
          </View>
        </View>
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
    marginTop: 20,
  },
  avatarWrap: {
    marginBottom: 12,
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
    marginTop: 18,
    marginBottom: 16,
  },
  pinDotsRow: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    marginVertical: 10,
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
    height: 20,
  },
  keypadContainer: {
    alignItems: 'center',
    marginBottom: 20,
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
});
