import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

/**
 * 1. Tactile Spring Scale Pressable
 */
export const AnimatedPressable: React.FC<
  PressableProps & {
    style?: StyleProp<ViewStyle>;
    scaleTo?: number;
    reduceMotion?: boolean;
    children: React.ReactNode;
  }
> = ({ style, scaleTo = 0.95, reduceMotion = false, onPressIn, onPressOut, children, ...rest }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = (e: any) => {
    if (!reduceMotion) {
      Animated.spring(scale, {
        toValue: scaleTo,
        useNativeDriver: true,
        speed: 35,
        bounciness: 6,
      }).start();
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    if (!reduceMotion) {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 24,
        bounciness: 10,
      }).start();
    }
    onPressOut?.(e);
  };

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} {...rest}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

/**
 * 2. Smooth Screen / Tab Entrance Transition
 */
export const AnimatedScreenWrapper: React.FC<{
  triggerKey: string;
  reduceMotion?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}> = ({ triggerKey, reduceMotion = false, style, children }) => {
  const opacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(reduceMotion ? 0 : 14)).current;
  const scale = useRef(new Animated.Value(reduceMotion ? 1 : 0.985)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      scale.setValue(1);
      return;
    }
    opacity.setValue(0);
    translateY.setValue(14);
    scale.setValue(0.985);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        speed: 20,
        bounciness: 6,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        speed: 22,
        bounciness: 5,
        useNativeDriver: true,
      }),
    ]).start();
  }, [triggerKey, reduceMotion]);

  return (
    <Animated.View
      style={[
        { flex: 1 },
        style,
        {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

/**
 * 3. Staggered Card Entrance Animation
 */
export const AnimatedCard: React.FC<{
  index?: number;
  reduceMotion?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}> = ({ index = 0, reduceMotion = false, style, children }) => {
  const opacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(reduceMotion ? 0 : 18)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }
    const delay = Math.min(index * 65, 320);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay,
        speed: 18,
        bounciness: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }, [reduceMotion]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

/**
 * 4. Smooth Animated Progress Bar with Shimmer Glow
 */
export const AnimatedProgressBar: React.FC<{
  percent: number;
  fillColor: string;
  trackColor: string;
  borderColor: string;
  height?: number;
  reduceMotion?: boolean;
  style?: StyleProp<ViewStyle>;
}> = ({
  percent,
  fillColor,
  trackColor,
  borderColor,
  height = 12,
  reduceMotion = false,
  style,
}) => {
  const clamped = Math.min(100, Math.max(0, percent));
  const animWidth = useRef(new Animated.Value(clamped)).current;
  const pulseOpacity = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    if (reduceMotion) {
      animWidth.setValue(clamped);
      return;
    }
    Animated.timing(animWidth, {
      toValue: clamped,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [clamped, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, {
          toValue: 0.6,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(pulseOpacity, {
          toValue: 0.15,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion]);

  const widthInterpolated = animWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      style={[
        {
          height,
          borderRadius: 999,
          borderWidth: 1,
          backgroundColor: trackColor,
          borderColor,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          height: '100%',
          width: widthInterpolated,
          backgroundColor: fillColor,
          borderRadius: 999,
        }}
      >
        <Animated.View
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 24,
            backgroundColor: '#FFFFFF',
            opacity: pulseOpacity,
            borderRadius: 999,
          }}
        />
      </Animated.View>
    </View>
  );
};

/**
 * 5. Animated Vertical Chart Bar Column
 */
export const AnimatedBarColumn: React.FC<{
  percent: number;
  color: string;
  trackColor: string;
  delay?: number;
  reduceMotion?: boolean;
}> = ({ percent, color, trackColor, delay = 0, reduceMotion = false }) => {
  const clamped = Math.min(100, Math.max(6, percent));
  const animHeight = useRef(new Animated.Value(reduceMotion ? clamped : 6)).current;

  useEffect(() => {
    if (reduceMotion) {
      animHeight.setValue(clamped);
      return;
    }
    Animated.timing(animHeight, {
      toValue: clamped,
      duration: 500,
      delay,
      easing: Easing.out(Easing.back(1.2)),
      useNativeDriver: false,
    }).start();
  }, [clamped, delay, reduceMotion]);

  const heightInterpolated = animHeight.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      style={{
        width: 20,
        height: 85,
        borderRadius: 6,
        justifyContent: 'flex-end',
        overflow: 'hidden',
        backgroundColor: trackColor,
      }}
    >
      <Animated.View
        style={{
          width: '100%',
          height: heightInterpolated,
          backgroundColor: color,
          borderRadius: 6,
        }}
      />
    </View>
  );
};

/**
 * 6. Continuous Gentle Breathing / Pulse Wrapper
 */
export const AnimatedPulseView: React.FC<{
  active?: boolean;
  reduceMotion?: boolean;
  minScale?: number;
  maxScale?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}> = ({
  active = true,
  reduceMotion = false,
  minScale = 1,
  maxScale = 1.07,
  duration = 1500,
  style,
  children,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active || reduceMotion) {
      scale.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: maxScale,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: minScale,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, reduceMotion, minScale, maxScale, duration]);

  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      {children}
    </Animated.View>
  );
};

/**
 * 7. Spring Number Pop Text (pops whenever value changes)
 */
export const AnimatedNumberText: React.FC<{
  value: number | string;
  style?: StyleProp<TextStyle>;
  reduceMotion?: boolean;
  children?: React.ReactNode;
}> = ({ value, style, reduceMotion = false, children }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    if (reduceMotion) return;
    scale.setValue(1.24);
    Animated.spring(scale, {
      toValue: 1,
      speed: 20,
      bounciness: 12,
      useNativeDriver: true,
    }).start();
  }, [value, reduceMotion]);

  return (
    <Animated.Text style={[style, { transform: [{ scale }] }]}>
      {children ?? value}
    </Animated.Text>
  );
};

/**
 * 8. Floating "+XP" Toast Notification when Total XP increases
 */
export const FloatingXpToast: React.FC<{
  totalXp: number;
  primaryColor: string;
  reduceMotion?: boolean;
}> = ({ totalXp, primaryColor, reduceMotion = false }) => {
  const prevXp = useRef(totalXp);
  const [delta, setDelta] = useState<number | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const diff = totalXp - prevXp.current;
    prevXp.current = totalXp;
    if (diff > 0) {
      setDelta(diff);
      if (reduceMotion) {
        opacity.setValue(1);
        translateY.setValue(0);
        scale.setValue(1);
        const timer = setTimeout(() => setDelta(null), 1300);
        return () => clearTimeout(timer);
      }

      opacity.setValue(1);
      translateY.setValue(12);
      scale.setValue(0.75);

      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          speed: 22,
          bounciness: 12,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -18,
          duration: 1100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(650),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 450,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => setDelta(null));
    }
  }, [totalXp, reduceMotion]);

  if (!delta) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.xpToast,
        {
          backgroundColor: primaryColor,
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <Text style={styles.xpToastText}>+{delta} XP</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  xpToast: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    zIndex: 999,
    elevation: 10,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
  },
  xpToastText: {
    color: '#0B1020',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.8,
  },
});
