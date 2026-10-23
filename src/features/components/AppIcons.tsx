import React from 'react';
import { Image, ImageSourcePropType } from 'react-native';

export type AppIconName =
  | 'home'
  | 'user'
  | 'water'
  | 'dumbbell'
  | 'journal'
  | 'trophy'
  | 'fire'
  | 'settings'
  | 'calendar'
  | 'chart'
  | 'activity'
  | 'scan'
  | 'search'
  | 'plus'
  | 'star'
  | 'heart'
  | 'clock'
  | 'crown'
  | 'moon'
  | 'sun'
  | 'trash'
  | 'leaf'
  | 'bolt'
  | 'shield'
  | 'edit'
  | 'meal'
  | 'quest'
  | 'check'
  | 'lock'
  | 'swap'
  | 'export'
  | 'import'
  | 'snowflake'
  | 'brain';

export interface AppIconProps {
  name: AppIconName;
  size?: number;
  color?: string;
}

const BRAND_ICON_SOURCE: ImageSourcePropType = require('../../../assets/icon.png');

/**
 * High-DPI (@3x 96x96px) transparent icons rasterized directly from freeicons.io SVG sets
 * in assets/icons/*.svg and rendered via React Native's core <Image tintColor={color} />
 * so zero external native view managers are required on Android/iOS/Web.
 */
const ICON_SOURCES: Record<AppIconName, ImageSourcePropType> = {
  home: require('../../../assets/icons/png/home.png'),
  user: require('../../../assets/icons/png/user.png'),
  water: require('../../../assets/icons/png/water.png'),
  dumbbell: require('../../../assets/icons/png/dumbbell.png'),
  journal: require('../../../assets/icons/png/journal.png'),
  trophy: require('../../../assets/icons/png/trophy.png'),
  fire: require('../../../assets/icons/png/fire.png'),
  settings: require('../../../assets/icons/png/settings.png'),
  calendar: require('../../../assets/icons/png/calendar.png'),
  chart: require('../../../assets/icons/png/chart.png'),
  activity: require('../../../assets/icons/png/activity.png'),
  scan: require('../../../assets/icons/png/scan.png'),
  search: require('../../../assets/icons/png/search.png'),
  plus: require('../../../assets/icons/png/plus.png'),
  star: require('../../../assets/icons/png/star.png'),
  heart: require('../../../assets/icons/png/heart.png'),
  clock: require('../../../assets/icons/png/clock.png'),
  crown: require('../../../assets/icons/png/crown.png'),
  moon: require('../../../assets/icons/png/moon.png'),
  sun: require('../../../assets/icons/png/sun.png'),
  trash: require('../../../assets/icons/png/trash.png'),
  leaf: require('../../../assets/icons/png/leaf.png'),
  bolt: require('../../../assets/icons/png/bolt.png'),
  shield: require('../../../assets/icons/png/shield.png'),
  edit: require('../../../assets/icons/png/edit.png'),
  meal: require('../../../assets/icons/png/meal.png'),
  quest: require('../../../assets/icons/png/quest.png'),
  check: require('../../../assets/icons/png/check.png'),
  lock: require('../../../assets/icons/png/lock.png'),
  swap: require('../../../assets/icons/png/swap.png'),
  export: require('../../../assets/icons/png/export.png'),
  import: require('../../../assets/icons/png/import.png'),
  snowflake: require('../../../assets/icons/png/snowflake.png'),
  brain: require('../../../assets/icons/png/brain.png'),
};

/**
 * Brand Emblem rendered directly from Awakened.ico (assets/icon.png).
 */
export const AwakenedBrandIcon: React.FC<{ size?: number }> = ({ size = 34 }) => {
  return (
    <Image
      source={BRAND_ICON_SOURCE}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.24),
      }}
      resizeMode="contain"
    />
  );
};

/**
 * Unified Icon Component sourced from freeicons.io SVG sets (stored in assets/icons/*.svg
 * and pre-rendered to high-DPI tintable PNGs in assets/icons/png/*.png).
 */
export const AppIcon: React.FC<AppIconProps> = ({
  name,
  size = 20,
  color = '#38BDF8',
}) => {
  const source = ICON_SOURCES[name];
  if (!source) return null;

  return (
    <Image
      source={source}
      tintColor={color}
      style={{
        width: size,
        height: size,
        tintColor: color,
      }}
      resizeMode="contain"
    />
  );
};
