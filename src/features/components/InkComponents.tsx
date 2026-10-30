import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { AppTheme, colors, radius, stroke } from '../../app/theme';
import { AppIcon, AppIconName } from './AppIcons';
import { triggerSelectionHaptic } from '../../services/soundService';

// ============================================================================
// 1. DripEdge — Organic Asymmetric Ink Drip Border (Pure RN Views, Crash-Safe)
// ============================================================================
export interface DripEdgeProps {
  seed?: number;
  color?: string;
  bgColor?: string;
  height?: number;
  flip?: boolean;
  style?: StyleProp<ViewStyle>;
}

const DRIP_PATTERNS: ReadonlyArray<ReadonlyArray<number>> = [
  [0.55, 0.22, 0.85, 0.3, 0.65, 0.18, 0.92, 0.28, 0.5, 0.2, 0.72],
  [0.35, 0.78, 0.24, 0.9, 0.32, 0.68, 0.2, 0.82, 0.26, 0.6, 0.3],
  [0.7, 0.25, 0.58, 0.2, 0.95, 0.34, 0.62, 0.22, 0.84, 0.28, 0.45],
  [0.42, 0.88, 0.28, 0.64, 0.2, 0.76, 0.3, 0.92, 0.22, 0.54, 0.36],
  [0.8, 0.26, 0.68, 0.22, 0.48, 0.86, 0.24, 0.6, 0.3, 0.9, 0.25],
  [0.5, 0.2, 0.9, 0.28, 0.58, 0.24, 0.78, 0.32, 0.94, 0.22, 0.62],
];

export const DripEdge: React.FC<DripEdgeProps> = ({
  seed = 1,
  color = colors.ink,
  bgColor = colors.cream,
  height = 28,
  flip = false,
  style,
}) => {
  const pattern = DRIP_PATTERNS[Math.abs(seed) % DRIP_PATTERNS.length];

  return (
    <View
      pointerEvents="none"
      style={[
        {
          width: '100%',
          height,
          backgroundColor: bgColor,
          overflow: 'hidden',
          transform: flip ? [{ scaleY: -1 }] : undefined,
        },
        style,
      ]}
    >
      {/* Top solid ink bar connecting all drips */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: Math.max(8, Math.round(height * 0.36)),
          backgroundColor: color,
        }}
      />

      {/* Organic alternating ink fingers & cream hollows */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          width: '100%',
          height,
        }}
      >
        {pattern.map((ratio, idx) => {
          const isDrip = idx % 2 === 0;
          const segHeight = Math.max(8, Math.round(height * ratio));
          if (isDrip) {
            const hasFloatingDrop = ratio >= 0.85;
            return (
              <View
                key={idx}
                style={{
                  flex: 1.15,
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    width: '100%',
                    height: segHeight,
                    backgroundColor: color,
                    borderBottomLeftRadius: 999,
                    borderBottomRightRadius: 999,
                  }}
                />
                {hasFloatingDrop && (
                  <View
                    style={{
                      width: 6,
                      height: 7,
                      borderRadius: 4,
                      backgroundColor: color,
                      marginTop: 2,
                    }}
                  />
                )}
              </View>
            );
          }

          const cutoutHeight = Math.max(
            6,
            Math.round(height * (1 - ratio) * 0.68)
          );
          return (
            <View
              key={idx}
              style={{
                flex: 0.9,
                height,
                justifyContent: 'flex-end',
              }}
            >
              <View
                style={{
                  width: '100%',
                  height: cutoutHeight,
                  backgroundColor: bgColor,
                  borderTopLeftRadius: 999,
                  borderTopRightRadius: 999,
                }}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
};

// ============================================================================
// 2. InkCard — Thick 2.5px Ink Border + Crisp Hard Offset Shadow
// ============================================================================
export interface InkCardProps {
  children: React.ReactNode;
  theme?: AppTheme;
  variant?: 'default' | 'peach' | 'ink' | 'soft';
  noShadow?: boolean;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

export const InkCard: React.FC<InkCardProps> = ({
  children,
  theme,
  variant = 'default',
  noShadow = false,
  style,
  onPress,
}) => {
  const isDark = theme?.mode === 'dark';
  const bg =
    variant === 'peach'
      ? colors.peach
      : variant === 'soft'
      ? isDark
        ? '#2A2444'
        : colors.peachSoft
      : variant === 'ink'
      ? colors.ink
      : theme?.card ?? colors.white;

  const borderCol = isDark ? colors.peach : colors.ink;
  const cardStyle: ViewStyle = {
    backgroundColor: bg,
    borderColor: borderCol,
    borderWidth: stroke,
    borderBottomWidth: noShadow ? stroke : stroke + 2.5,
    borderRightWidth: noShadow ? stroke : stroke + 2.5,
    borderRadius: radius.card,
    padding: 16,
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          cardStyle,
          pressed && { transform: [{ translateY: 1.5 }] },
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
};

// ============================================================================
// 3. PillButton — Full Capsule Button with Thick Ink Outline
// ============================================================================
export interface PillButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'dark' | 'outline' | 'soft';
  icon?: AppIconName;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  soundEnabled?: boolean;
}

export const PillButton: React.FC<PillButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  size = 'md',
  style,
  soundEnabled = true,
}) => {
  const bg =
    variant === 'primary'
      ? colors.peach
      : variant === 'dark'
      ? colors.ink
      : variant === 'soft'
      ? colors.peachSoft
      : colors.white;

  const textColor = variant === 'dark' ? colors.white : colors.ink;
  const padV = size === 'sm' ? 7 : size === 'lg' ? 13 : 10;
  const padH = size === 'sm' ? 12 : size === 'lg' ? 22 : 16;
  const fontSize = size === 'sm' ? 12 : size === 'lg' ? 15 : 13.5;

  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        triggerSelectionHaptic(soundEnabled);
        onPress();
      }}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          backgroundColor: bg,
          borderColor: colors.ink,
          borderWidth: stroke,
          borderBottomWidth: pressed ? stroke : stroke + 2,
          borderRightWidth: pressed ? stroke : stroke + 2,
          borderRadius: radius.chip,
          paddingVertical: padV,
          paddingHorizontal: padH,
          opacity: disabled ? 0.45 : 1,
          transform: [{ translateY: pressed ? 1.5 : 0 }],
        },
        style,
      ]}
    >
      {icon && <AppIcon name={icon} size={size === 'sm' ? 13 : 16} color={textColor} />}
      <Text
        style={{
          color: textColor,
          fontSize,
          fontWeight: '900',
          letterSpacing: 0.2,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
};

// ============================================================================
// 4. AvatarChip — Circular Stat/Filter Chip with Outer Peach Selection Ring
// ============================================================================
export interface AvatarChipProps {
  label: string;
  value?: string | number;
  icon?: AppIconName;
  selected?: boolean;
  onPress?: () => void;
  theme?: AppTheme;
  size?: number;
}

export const AvatarChip: React.FC<AvatarChipProps> = ({
  label,
  value,
  icon,
  selected = false,
  onPress,
  theme,
  size = 56,
}) => {
  const isDark = theme?.mode === 'dark';
  return (
    <Pressable
      onPress={onPress}
      style={{
        alignItems: 'center',
        gap: 4,
      }}
    >
      {/* Outer Peach Ring when Selected */}
      <View
        style={{
          width: size + 8,
          height: size + 8,
          borderRadius: (size + 8) / 2,
          borderWidth: selected ? 3 : 0,
          borderColor: colors.peach,
          backgroundColor: selected ? `${colors.peach}28` : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: selected
              ? colors.peach
              : isDark
              ? '#242042'
              : colors.white,
            borderWidth: stroke,
            borderColor: isDark && !selected ? colors.peach : colors.ink,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon ? (
            <AppIcon
              name={icon}
              size={Math.round(size * 0.36)}
              color={selected ? colors.ink : isDark ? colors.cream : colors.ink}
            />
          ) : null}
          {value !== undefined && (
            <Text
              style={{
                color: selected ? colors.ink : isDark ? colors.cream : colors.ink,
                fontSize: icon ? 11 : 14,
                fontWeight: '900',
                marginTop: icon ? 1 : 0,
              }}
            >
              {value}
            </Text>
          )}
        </View>
      </View>
      <View
        style={{
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 999,
          backgroundColor: selected ? colors.ink : 'transparent',
        }}
      >
        <Text
          style={{
            color: selected
              ? colors.white
              : isDark
              ? colors.cream
              : colors.ink,
            fontSize: 11,
            fontWeight: '900',
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
};

// ============================================================================
// 5. SegmentedTabs — Thick Bordered Segmented Control (Selected = Ink Fill)
// ============================================================================
export interface SegmentedTabItem<T extends string> {
  id: T;
  label: string;
  icon?: AppIconName;
}

export function SegmentedTabs<T extends string>({
  tabs,
  activeId,
  onSelect,
  theme,
  style,
}: {
  tabs: ReadonlyArray<SegmentedTabItem<T>>;
  activeId: T;
  onSelect: (id: T) => void;
  theme?: AppTheme;
  style?: StyleProp<ViewStyle>;
}) {
  const isDark = theme?.mode === 'dark';
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          backgroundColor: isDark ? '#211E3A' : colors.white,
          borderRadius: radius.chip,
          borderWidth: stroke,
          borderColor: isDark ? colors.peach : colors.ink,
          padding: 3,
          gap: 4,
        },
        style,
      ]}
    >
      {tabs.map((tab) => {
        const selected = tab.id === activeId;
        const activeBg = isDark ? colors.peach : colors.ink;
        const activeText = isDark ? colors.ink : colors.white;
        const inactiveText = isDark ? colors.cream : colors.ink;

        return (
          <Pressable
            key={tab.id}
            onPress={() => {
              triggerSelectionHaptic(true);
              onSelect(tab.id);
            }}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              paddingVertical: 8,
              paddingHorizontal: 6,
              borderRadius: radius.chip,
              backgroundColor: selected ? activeBg : 'transparent',
            }}
          >
            {tab.icon && (
              <AppIcon
                name={tab.icon}
                size={13}
                color={selected ? activeText : inactiveText}
              />
            )}
            <Text
              numberOfLines={1}
              style={{
                color: selected ? activeText : inactiveText,
                fontSize: 12,
                fontWeight: '900',
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ============================================================================
// 6. DateDot — Peach Circle for Active Day, Bordered Cream Circle for Rest Day
// ============================================================================
export interface DateDotProps {
  label: string;
  subLabel?: string;
  status?: 'active' | 'rest' | 'frozen' | 'none';
  isToday?: boolean;
  isSelected?: boolean;
  onPress?: () => void;
  theme?: AppTheme;
}

export const DateDot: React.FC<DateDotProps> = ({
  label,
  subLabel,
  status = 'none',
  isToday = false,
  isSelected = false,
  onPress,
  theme,
}) => {
  const isDark = theme?.mode === 'dark';
  const circleBg =
    status === 'active'
      ? colors.peach
      : status === 'rest' || status === 'frozen'
      ? colors.peachSoft
      : isSelected
      ? `${colors.peach}40`
      : isDark
      ? '#242042'
      : colors.white;

  const textCol =
    status === 'active' || status === 'rest' || status === 'frozen'
      ? colors.ink
      : isDark
      ? colors.cream
      : colors.ink;

  const Wrapper: any = onPress ? Pressable : View;

  return (
    <Wrapper
      onPress={onPress}
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        gap: 3,
      }}
    >
      {subLabel ? (
        <Text
          style={{
            color: isToday
              ? colors.peach
              : isDark
              ? colors.line
              : colors.ink,
            fontSize: 10.5,
            fontWeight: isToday ? '900' : '800',
          }}
        >
          {subLabel}
        </Text>
      ) : null}
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: circleBg,
          borderWidth: status !== 'none' || isToday || isSelected ? stroke : 1.5,
          borderColor:
            isToday || isSelected
              ? isDark
                ? colors.peach
                : colors.ink
              : isDark
              ? colors.line
              : colors.ink,
          borderStyle: status === 'rest' ? 'dashed' : 'solid',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: textCol,
            fontSize: 12,
            fontWeight: '900',
          }}
        >
          {label}
        </Text>
        {status === 'rest' && (
          <Text
            style={{
              color: colors.ink,
              fontSize: 7.5,
              fontWeight: '900',
              marginTop: -2,
            }}
          >
            พัก✦
          </Text>
        )}
      </View>
    </Wrapper>
  );
};

// ============================================================================
// 7. InkDifficultyDrops — 1 to 3 Ink Drops Showing Quest Difficulty
// ============================================================================
export const InkDifficultyDrops: React.FC<{
  level: 1 | 2 | 3;
  isTh?: boolean;
}> = ({ level, isTh = true }) => {
  const labelsTh = { 1: 'เบา ๆ', 2: 'พอดี', 3: 'เข้มข้น' };
  const labelsEn = { 1: 'Light', 2: 'Steady', 3: 'Intense' };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.peachSoft,
        borderColor: colors.ink,
        borderWidth: 1.5,
        borderRadius: 999,
        paddingHorizontal: 7,
        paddingVertical: 2,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        {[1, 2, 3].map((idx) => {
          const filled = idx <= level;
          return (
            <View
              key={idx}
              style={{
                width: 7,
                height: 7,
                backgroundColor: filled ? colors.ink : 'transparent',
                borderWidth: 1.2,
                borderColor: colors.ink,
                borderTopLeftRadius: 1,
                borderTopRightRadius: 5,
                borderBottomLeftRadius: 5,
                borderBottomRightRadius: 5,
                transform: [{ rotate: '45deg' }],
              }}
            />
          );
        })}
      </View>
      <Text
        style={{
          color: colors.ink,
          fontSize: 9.5,
          fontWeight: '900',
          marginLeft: 2,
        }}
      >
        {isTh ? labelsTh[level] : labelsEn[level]}
      </Text>
    </View>
  );
};

// ============================================================================
// 8. StatMiniCard — Thick Bordered Stat Card with Mini Sparkline Trend
// ============================================================================
export interface StatMiniCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: AppIconName;
  trendValues?: number[];
  onPress?: () => void;
  theme: AppTheme;
}

export const StatMiniCard: React.FC<StatMiniCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trendValues = [30, 55, 45, 70, 60, 85, 90],
  onPress,
  theme,
}) => {
  const isDark = theme.mode === 'dark';
  const maxVal = Math.max(1, ...trendValues);

  return (
    <InkCard
      theme={theme}
      onPress={onPress}
      style={{
        width: '48.2%',
        padding: 13,
        justifyContent: 'space-between',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            color: theme.textSecondary,
            fontSize: 11.5,
            fontWeight: '900',
            flex: 1,
          }}
        >
          {title}
        </Text>
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: colors.peachSoft,
            borderWidth: 1.5,
            borderColor: colors.ink,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppIcon name={icon} size={13} color={colors.ink} />
        </View>
      </View>

      <Text
        numberOfLines={1}
        style={{
          color: theme.text,
          fontSize: 20,
          fontWeight: '900',
          marginTop: 6,
        }}
      >
        {value}
      </Text>

      {/* Mini 7-Day Sparkline Bars & Nodes */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          height: 26,
          marginTop: 8,
          paddingTop: 4,
          gap: 4,
        }}
      >
        {trendValues.slice(-7).map((v, i, arr) => {
          const hPct = Math.max(20, Math.round((v / maxVal) * 100));
          const isLast = i === arr.length - 1;
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: '100%',
                justifyContent: 'flex-end',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: '100%',
                  height: `${hPct}%`,
                  backgroundColor: isLast
                    ? colors.peach
                    : isDark
                    ? '#3A3560'
                    : colors.peachSoft,
                  borderRadius: 999,
                  borderWidth: 1.2,
                  borderColor: isLast
                    ? colors.ink
                    : isDark
                    ? colors.peach
                    : colors.ink,
                }}
              />
            </View>
          );
        })}
      </View>

      {subtitle ? (
        <Text
          numberOfLines={1}
          style={{
            color: theme.textMuted,
            fontSize: 10.5,
            fontWeight: '700',
            marginTop: 5,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </InkCard>
  );
};

// ============================================================================
// 9. AwakenMascot — Shadow-Cat / Ink-Drop Mascot (8 Ranks + Expressive Poses)
// ============================================================================
export type MascotMood = 'idle' | 'happy' | 'sleep' | 'dizzy' | 'calm' | 'proud';

export interface AwakenMascotProps {
  rankId?: string;
  level?: number;
  mood?: MascotMood;
  size?: number;
  caption?: string;
  reduceMotion?: boolean;
}

export const AwakenMascot: React.FC<AwakenMascotProps> = ({
  rankId = 'E',
  level = 1,
  mood = 'idle',
  size = 84,
  caption,
  reduceMotion = false,
}) => {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -4,
          duration: mood === 'sleep' ? 1800 : 1100,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: mood === 'sleep' ? 1800 : 1100,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [mood, reduceMotion]);

  // Evolution stage by Rank (E -> D -> C -> B -> A -> S -> SS -> M)
  const rankOrder = ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'M'];
  const stageIdx = Math.max(0, rankOrder.indexOf(rankId));
  const hasCatEars = stageIdx >= 1 || level >= 5;
  const hasAuraRing = stageIdx >= 3 || level >= 25;
  const hasCrown = stageIdx >= 6 || rankId === 'M' || rankId === 'SS';
  const dropletCount = Math.min(4, Math.floor(stageIdx / 2) + 1);

  const bodySize = Math.round(size * (0.76 + Math.min(0.18, stageIdx * 0.025)));
  const earSize = Math.round(bodySize * 0.28);

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          width: size + 20,
          height: size + 16,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ translateY: floatAnim }],
        }}
      >
        {/* Outer Peach Aura Ring for Mid/High Ranks */}
        {hasAuraRing && (
          <View
            style={{
              position: 'absolute',
              width: bodySize + 22,
              height: bodySize + 22,
              borderRadius: (bodySize + 22) / 2,
              backgroundColor: `${colors.peach}35`,
              borderWidth: 2,
              borderColor: colors.peach,
              borderStyle: stageIdx >= 5 ? 'solid' : 'dashed',
            }}
          />
        )}

        {/* Orbiting Ink Droplets */}
        {Array.from({ length: dropletCount }).map((_, idx) => {
          const positions: ViewStyle[] = [
            { top: 4, left: 6 },
            { top: 8, right: 6 },
            { bottom: 10, left: 4 },
            { bottom: 8, right: 8 },
          ];
          return (
            <View
              key={idx}
              style={[
                {
                  position: 'absolute',
                  width: 9,
                  height: 9,
                  backgroundColor: idx % 2 === 0 ? colors.ink : colors.peach,
                  borderWidth: 1.5,
                  borderColor: colors.ink,
                  borderTopLeftRadius: 2,
                  borderTopRightRadius: 6,
                  borderBottomLeftRadius: 6,
                  borderBottomRightRadius: 6,
                  transform: [{ rotate: '45deg' }],
                },
                positions[idx],
              ]}
            />
          );
        })}

        {/* Monarch / SS Crown */}
        {hasCrown && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: 3,
              marginBottom: -6,
              zIndex: 5,
            }}
          >
            <View
              style={{
                width: 8,
                height: 10,
                backgroundColor: colors.peach,
                borderWidth: 1.8,
                borderColor: colors.ink,
                borderTopLeftRadius: 3,
                borderTopRightRadius: 6,
                transform: [{ rotate: '-12deg' }],
              }}
            />
            <View
              style={{
                width: 10,
                height: 14,
                backgroundColor: colors.peach,
                borderWidth: 1.8,
                borderColor: colors.ink,
                borderTopLeftRadius: 5,
                borderTopRightRadius: 5,
              }}
            />
            <View
              style={{
                width: 8,
                height: 10,
                backgroundColor: colors.peach,
                borderWidth: 1.8,
                borderColor: colors.ink,
                borderTopLeftRadius: 6,
                borderTopRightRadius: 3,
                transform: [{ rotate: '12deg' }],
              }}
            />
          </View>
        )}

        {/* Shadow-Cat Ears */}
        {hasCatEars && (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              width: bodySize * 0.78,
              marginBottom: -Math.round(earSize * 0.45),
              zIndex: 1,
            }}
          >
            <View
              style={{
                width: earSize,
                height: earSize,
                backgroundColor: colors.ink,
                borderWidth: 2,
                borderColor: colors.peach,
                borderTopLeftRadius: 4,
                borderTopRightRadius: earSize * 0.6,
                borderBottomLeftRadius: earSize * 0.5,
                transform: [{ rotate: '-12deg' }],
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: earSize * 0.42,
                  height: earSize * 0.42,
                  backgroundColor: colors.peach,
                  borderRadius: 3,
                }}
              />
            </View>
            <View
              style={{
                width: earSize,
                height: earSize,
                backgroundColor: colors.ink,
                borderWidth: 2,
                borderColor: colors.peach,
                borderTopRightRadius: 4,
                borderTopLeftRadius: earSize * 0.6,
                borderBottomRightRadius: earSize * 0.5,
                transform: [{ rotate: '12deg' }],
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: earSize * 0.42,
                  height: earSize * 0.42,
                  backgroundColor: colors.peach,
                  borderRadius: 3,
                }}
              />
            </View>
          </View>
        )}

        {/* Main Ink Body */}
        <View
          style={{
            width: bodySize,
            height: bodySize * 0.92,
            borderTopLeftRadius: bodySize * 0.48,
            borderTopRightRadius: bodySize * 0.48,
            borderBottomLeftRadius: bodySize * 0.42,
            borderBottomRightRadius: bodySize * 0.42,
            backgroundColor: colors.ink,
            borderWidth: 2.5,
            borderColor: colors.peach,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
          }}
        >
          {/* Eyes Row */}
          {mood === 'sleep' ? (
            <View style={{ flexDirection: 'row', gap: bodySize * 0.18, marginTop: 4 }}>
              <View
                style={{
                  width: bodySize * 0.18,
                  height: 5,
                  borderBottomWidth: 2.5,
                  borderColor: colors.peach,
                  borderRadius: 6,
                }}
              />
              <View
                style={{
                  width: bodySize * 0.18,
                  height: 5,
                  borderBottomWidth: 2.5,
                  borderColor: colors.peach,
                  borderRadius: 6,
                }}
              />
            </View>
          ) : mood === 'dizzy' ? (
            <View style={{ flexDirection: 'row', gap: bodySize * 0.16, alignItems: 'center' }}>
              <Text style={{ color: colors.peach, fontSize: bodySize * 0.22, fontWeight: '900' }}>
                ＞
              </Text>
              <Text style={{ color: colors.peach, fontSize: bodySize * 0.22, fontWeight: '900' }}>
                ＜
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: bodySize * 0.18, alignItems: 'center' }}>
              {['left', 'right'].map((side) => (
                <View
                  key={side}
                  style={{
                    width: bodySize * 0.21,
                    height:
                      mood === 'calm' || stageIdx === 0
                        ? bodySize * 0.14
                        : bodySize * 0.21,
                    borderRadius: bodySize * 0.12,
                    backgroundColor: colors.peach,
                    alignItems: 'flex-end',
                    justifyContent: 'flex-start',
                    padding: 2,
                  }}
                >
                  <View
                    style={{
                      width: bodySize * 0.06,
                      height: bodySize * 0.06,
                      borderRadius: bodySize * 0.03,
                      backgroundColor: colors.white,
                    }}
                  />
                </View>
              ))}
            </View>
          )}

          {/* Cheek Blush & Mouth */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginTop: 4,
            }}
          >
            <View
              style={{
                width: 7,
                height: 4,
                borderRadius: 2,
                backgroundColor: `${colors.peach}88`,
              }}
            />
            <Text
              style={{
                color: colors.cream,
                fontSize: 10,
                fontWeight: '900',
              }}
            >
              {mood === 'sleep'
                ? '︵'
                : mood === 'dizzy'
                ? '﹏'
                : mood === 'happy' || mood === 'proud'
                ? 'ω'
                : 'ㅅ'}
            </Text>
            <View
              style={{
                width: 7,
                height: 4,
                borderRadius: 2,
                backgroundColor: `${colors.peach}88`,
              }}
            />
          </View>
        </View>

        {/* Sleeping "zZ" Sticker Bubble */}
        {mood === 'sleep' && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              backgroundColor: colors.peachSoft,
              borderColor: colors.ink,
              borderWidth: 2,
              borderRadius: 999,
              paddingHorizontal: 6,
              paddingVertical: 2,
              transform: [{ rotate: '10deg' }],
              zIndex: 6,
            }}
          >
            <Text style={{ color: colors.ink, fontSize: 10, fontWeight: '900' }}>
              zZ
            </Text>
          </View>
        )}

        {/* Happy / Proud Sparkle Sticker */}
        {(mood === 'happy' || mood === 'proud') && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: -2,
              backgroundColor: colors.peach,
              borderColor: colors.ink,
              borderWidth: 2,
              borderRadius: 999,
              paddingHorizontal: 6,
              paddingVertical: 1,
              transform: [{ rotate: '12deg' }],
              zIndex: 6,
            }}
          >
            <Text style={{ color: colors.ink, fontSize: 9.5, fontWeight: '900' }}>
              ✦ Lv.{level}
            </Text>
          </View>
        )}
      </Animated.View>

      {caption ? (
        <View
          style={{
            marginTop: 4,
            backgroundColor: colors.peachSoft,
            borderColor: colors.ink,
            borderWidth: 2,
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 4,
            transform: [{ rotate: '-1deg' }],
          }}
        >
          <Text
            style={{
              color: colors.ink,
              fontSize: 11.5,
              fontWeight: '900',
              textAlign: 'center',
            }}
          >
            {caption}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

// ============================================================================
// 10. WeeklyInkCardShowcase — Collectible Weekly Summary Cards (Section 4.4)
// ============================================================================
export interface WeeklyCollectibleCardData {
  id: string;
  weekLabel: string;
  titleTh: string;
  titleEn: string;
  captionTh: string;
  captionEn: string;
  badgeText: string;
  mood: MascotMood;
  seed: number;
  unlocked: boolean;
}

export const WeeklyInkCardShowcase: React.FC<{
  cards: ReadonlyArray<WeeklyCollectibleCardData>;
  rankId: string;
  level: number;
  isTh: boolean;
  theme: AppTheme;
}> = ({ cards, rankId, level, isTh, theme }) => {
  return (
    <View style={{ gap: 10 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AppIcon name="star" size={16} color={colors.peach} />
          <Text style={{ color: theme.text, fontSize: 15, fontWeight: '900' }}>
            {isTh ? 'สมุดสะสมการ์ดหมึกรายสัปดาห์' : 'Weekly Collectible Ink Cards'}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: colors.peachSoft,
            borderColor: colors.ink,
            borderWidth: 1.8,
            borderRadius: 999,
            paddingHorizontal: 9,
            paddingVertical: 2,
          }}
        >
          <Text style={{ color: colors.ink, fontSize: 11, fontWeight: '900' }}>
            {cards.filter((c) => c.unlocked).length}/{cards.length}{' '}
            {isTh ? 'ใบ' : 'Cards'}
          </Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        {cards.map((c, idx) => (
          <View
            key={c.id}
            style={{
              width: '48%',
              backgroundColor: c.unlocked ? colors.white : theme.bgSecondary,
              borderColor: colors.ink,
              borderWidth: stroke,
              borderBottomWidth: stroke + 2.5,
              borderRightWidth: stroke + 2.5,
              borderRadius: 18,
              overflow: 'hidden',
              opacity: c.unlocked ? 1 : 0.65,
              transform: [{ rotate: idx % 2 === 0 ? '-0.6deg' : '0.6deg' }],
            }}
          >
            {/* Mini Ink Header with DripEdge */}
            <View
              style={{
                backgroundColor: colors.ink,
                paddingTop: 8,
                paddingHorizontal: 10,
                paddingBottom: 2,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: colors.cream, fontSize: 10, fontWeight: '900' }}>
                {c.weekLabel}
              </Text>
              <View
                style={{
                  backgroundColor: colors.peach,
                  borderRadius: 999,
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                }}
              >
                <Text style={{ color: colors.ink, fontSize: 9, fontWeight: '900' }}>
                  {c.badgeText}
                </Text>
              </View>
            </View>
            <DripEdge
              seed={c.seed}
              color={colors.ink}
              bgColor={c.unlocked ? colors.white : theme.bgSecondary}
              height={16}
            />

            <View style={{ padding: 10, alignItems: 'center' }}>
              <AwakenMascot
                rankId={rankId}
                level={level}
                mood={c.mood}
                size={54}
                reduceMotion
              />
              <Text
                numberOfLines={1}
                style={{
                  color: colors.ink,
                  fontSize: 12.5,
                  fontWeight: '900',
                  marginTop: 4,
                  textAlign: 'center',
                }}
              >
                {isTh ? c.titleTh : c.titleEn}
              </Text>
              <Text
                numberOfLines={2}
                style={{
                  color: '#3A3752',
                  fontSize: 10.5,
                  fontWeight: '700',
                  marginTop: 2,
                  textAlign: 'center',
                  lineHeight: 14,
                }}
              >
                {isTh ? c.captionTh : c.captionEn}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({});
