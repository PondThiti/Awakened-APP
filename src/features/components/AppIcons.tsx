import React from 'react';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Polygon,
  Polyline,
  Rect,
  Stop,
} from 'react-native-svg';

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

/**
 * Vector recreation of Awakened.ico (Dark Navy rounded box, Cyan-to-Emerald circular progress arc,
 * 4-point star sparkle at 9 o'clock, and bold white 'A' with emerald upward chevron crossbar).
 */
export const AwakenedBrandIcon: React.FC<{ size?: number }> = ({ size = 34 }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id="awkBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#1A2852" />
          <Stop offset="100%" stopColor="#0C1329" />
        </LinearGradient>
        <LinearGradient id="awkArc" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#46A6E8" />
          <Stop offset="55%" stopColor="#38D399" />
          <Stop offset="100%" stopColor="#48B2DF" />
        </LinearGradient>
      </Defs>

      {/* Rounded Square Background matching Awakened.ico */}
      <Rect x="2" y="2" width="60" height="60" rx="16" fill="url(#awkBg)" stroke="#2D497F" strokeWidth="1.5" />

      {/* Subtle Unfilled Top-Left Ring Track */}
      <Circle
        cx="32"
        cy="32"
        r="21"
        stroke="#364B7A"
        strokeWidth="4.2"
        fill="none"
        opacity={0.7}
      />

      {/* Glowing Cyan-Emerald Progress Arc (from 12 o'clock clockwise to 9 o'clock) */}
      <Path
        d="M 32 11 A 21 21 0 1 1 11 32"
        stroke="url(#awkArc)"
        strokeWidth="4.6"
        strokeLinecap="round"
        fill="none"
      />

      {/* Small Sparkle Dot at ~2 o'clock */}
      <Circle cx="47.5" cy="18" r="1.8" fill="#A7F3D0" />

      {/* 4-Point Star Sparkle at 9 o'clock on the Ring */}
      <Path
        d="M 11 26.5 L 12.4 30.6 L 16.5 32 L 12.4 33.4 L 11 37.5 L 9.6 33.4 L 5.5 32 L 9.6 30.6 Z"
        fill="#FFFFFF"
      />

      {/* Stylized Bold White 'A' */}
      <Path
        d="M 32 19 L 22 43 M 32 19 L 42 43"
        stroke="#FFFFFF"
        strokeWidth="5.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Emerald Upward Chevron Crossbar inside 'A' */}
      <Path
        d="M 25.5 39.5 L 32 34 L 38.5 39.5"
        stroke="#5EEAD4"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
};

/**
 * Unified Vector Icon Component sourced from freeicons.io SVG sets (stored in assets/icons/*.svg)
 */
export const AppIcon: React.FC<AppIconProps> = ({
  name,
  size = 20,
  color = '#38BDF8',
}) => {
  switch (name) {
    case 'home':
      // From assets/icons/home.svg (freeicons.io Iconly Home)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <G transform="translate(2.5, 2.0)" fill={color}>
            <Path d="M6.6348,18.7733 L6.6348,15.7156 C6.6348,14.9351 7.2722,14.3023 8.0584,14.3023 L10.9326,14.3023 C11.3102,14.3023 11.6723,14.4512 11.9393,14.7163 C12.2063,14.9813 12.3563,15.3408 12.3563,15.7156 L12.3563,18.7733 C12.3539,19.0978 12.4821,19.4099 12.7124,19.6402 C12.9427,19.8705 13.256,20 13.5829,20 L15.5438,20 C16.4596,20.0023 17.3388,19.6428 17.9872,19.0008 C18.6356,18.3588 19,17.487 19,16.5778 L19,7.8669 C19,7.1325 18.6721,6.4358 18.1046,5.9647 L11.434,0.6759 C10.2737,-0.2514 8.6111,-0.2215 7.4854,0.747 L0.967,5.9647 C0.3727,6.422 0.0176,7.1206 0,7.8669 L0,16.5689 C0,18.4639 1.5474,20 3.4562,20 L5.3723,20 C6.0512,20 6.603,19.4562 6.6079,18.7822 L6.6348,18.7733 Z" />
          </G>
        </Svg>
      );

    case 'user':
      // From assets/icons/profile.svg (freeicons.io Iconly Profile/User)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <G transform="translate(4.0, 2.0)" fill={color}>
            <Path d="M5.8485,13.5498 C7.2881,13.4338 8.7344,13.4338 10.1741,13.5498 C10.9581,13.5955 11.7383,13.6936 12.5099,13.8434 C14.1796,14.1815 15.2697,14.7331 15.7369,15.6228 C16.0877,16.3171 16.0877,17.1437 15.7369,17.8381 C15.2697,18.7278 14.2229,19.3149 12.4926,19.6174 C11.7216,19.7729 10.9412,19.874 10.1568,19.9199 C9.4301,20 8.7034,20 7.968,20 L6.6444,20 C6.3675,19.9644 6.0994,19.9466 5.8398,19.9466 C5.0554,19.9063 4.2748,19.8082 3.504,19.653 C1.8343,19.3327 0.7442,18.7633 0.2771,17.8737 C0.0967,17.529 0.0016,17.144 0.0001,16.7527 C-0.0035,16.3589 0.0887,15.9705 0.2684,15.6228 C0.7269,14.7331 1.817,14.1548 3.504,13.8434 C4.2782,13.6915 5.0614,13.5934 5.8485,13.5498 Z M8.0026,0 C10.9028,0 13.2539,2.4178 13.2539,5.4004 C13.2539,8.3829 10.9028,10.8007 8.0026,10.8007 C5.1024,10.8007 2.7513,8.3829 2.7513,5.4004 C2.7513,2.4178 5.1024,0 8.0026,0 Z" />
          </G>
        </Svg>
      );

    case 'water':
      // From assets/icons/water.svg (freeicons.io Water Droplet)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M12 2.2C12 2.2 5 10.1 5 15.2C5 19.07 8.13 22.2 12 22.2C15.87 22.2 19 19.07 19 15.2C19 10.1 12 2.2 12 2.2ZM9.5 18.2C8.1 17.2 7.5 15.4 7.8 13.6C7.9 13.1 8.4 12.8 8.9 12.9C9.4 13 9.7 13.5 9.6 14C9.4 15.1 9.8 16.2 10.6 16.8C11 17.1 11.1 17.7 10.8 18.1C10.4 18.5 9.9 18.5 9.5 18.2Z"
            fill={color}
          />
        </Svg>
      );

    case 'dumbbell':
      // From assets/icons/dumbbell.svg (freeicons.io Gym Dumbbell)
      return (
        <Svg width={size} height={size} viewBox="0 0 48 48">
          <Path
            d="M46.342,19.553,44,18.382V17a3,3,0,0,0-3-3H39V13a3,3,0,0,0-3-3H33a3,3,0,0,0-3,3v7H18V13a3,3,0,0,0-3-3H12a3,3,0,0,0-3,3v1H7a3,3,0,0,0-3,3v1.382L1.658,19.553A2.984,2.984,0,0,0,0,22.236v3.528a2.984,2.984,0,0,0,1.658,2.683L4,29.618V31a3,3,0,0,0,3,3H9v1a3,3,0,0,0,3,3h3a3,3,0,0,0,3-3V28H30v7a3,3,0,0,0,3,3h3a3,3,0,0,0,3-3V34h2a3,3,0,0,0,3-3V29.618l2.342-1.171A2.984,2.984,0,0,0,48,25.764V22.236A2.984,2.984,0,0,0,46.342,19.553Z"
            fill={color}
          />
        </Svg>
      );

    case 'journal':
      // From assets/icons/document.svg (freeicons.io Iconly Document/Journal)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <G transform="translate(3.0, 2.0)" fill={color}>
            <Path d="M13.191,0 C16.28,0 18,1.78 18,4.83 L18,15.16 C18,18.26 16.28,20 13.191,20 L4.81,20 C1.77,20 0,18.26 0,15.16 L0,4.83 C0,1.78 1.77,0 4.81,0 Z M5.08,13.74 C4.65,13.74 4.3,14.09 4.3,14.52 C4.3,14.95 4.65,15.31 5.08,15.31 L12.92,15.31 C13.35,15.31 13.7,14.95 13.7,14.52 C13.7,14.09 13.35,13.74 12.92,13.74 Z M12.92,9.179 L5.08,9.179 C4.649,9.179 4.3,9.53 4.3,9.96 C4.3,10.39 4.649,10.74 5.08,10.74 L12.92,10.74 C13.35,10.74 13.7,10.39 13.7,9.96 C13.7,9.53 13.35,9.179 12.92,9.179 Z M8.069,4.65 L5.08,4.65 C4.649,4.66 4.3,5.01 4.3,5.44 C4.3,5.87 4.649,6.22 5.08,6.22 L8.069,6.22 C8.5,6.22 8.85,5.87 8.85,5.429 C8.85,5 8.5,4.65 8.069,4.65 Z" />
          </G>
        </Svg>
      );

    case 'trophy':
      // From assets/icons/trophy.svg (freeicons.io Trophy)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M19 4H17V3C17 2.45 16.55 2 16 2H8C7.45 2 7 2.45 7 3V4H5C3.9 4 3 4.9 3 6V8C3 10.97 5.16 13.43 8 13.91V16.1C8 17.7 9.1 19.1 10.6 19.5V21H8C7.45 21 7 21.45 7 22C7 22.55 7.45 23 8 23H16C16.55 23 17 22.55 17 22C17 21.45 16.55 21 16 21H13.4V19.5C14.9 19.1 16 17.7 16 16.1V13.91C18.84 13.43 21 10.97 21 8V6C21 4.9 20.1 4 19 4ZM5 8V6H7V11.82C5.84 11.4 5 10.3 5 8ZM19 8C19 10.3 18.16 11.4 17 11.82V6H19V8Z"
            fill={color}
          />
        </Svg>
      );

    case 'fire':
      // From assets/icons/fire.svg (freeicons.io Fire/Streak)
      return (
        <Svg width={size} height={size} viewBox="0 0 25 25">
          <Path
            d="M17.35,3a12.08,12.08,0,0,0-4.72-3,.5.5,0,0,0-.52.16.5.5,0,0,0-.06.54,9,9,0,0,1,.83,6.4.16.16,0,0,1-.15.12c-.09,0-.11,0-.11-.07a10.31,10.31,0,0,0-3.7-4.57.5.5,0,0,0-.76.54c.59,2.31-.57,3.7-2,5.46S3,12.4,3,15.72a9.47,9.47,0,0,0,7.38,9.08A3.26,3.26,0,0,1,9,22.17c0-5.34,3.5-6.67,3.5-6.67C13.2,19,16,19.8,16,22.17a3.26,3.26,0,0,1-1.35,2.61,9.5,9.5,0,0,0,4-1.93A9.26,9.26,0,0,0,22,15.69C22,9,19.47,5.1,17.35,3Z"
            fill={color}
          />
        </Svg>
      );

    case 'settings':
      // From assets/icons/setting.svg (freeicons.io Iconly Setting)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <G transform="translate(2.5, 2.0)" fill={color}>
            <Path d="M10.2143,0.0004 C10.7643,-0.0096 11.2853,0.1894 11.6743,0.5704 C12.0653,0.9394 12.2743,1.4504 12.2743,1.9904 C12.2743,3.0904 13.1843,3.9814 14.3153,3.9814 C14.6643,3.9814 15.0143,3.8804 15.3253,3.7104 C16.2943,3.1894 17.5043,3.5204 18.0543,4.4504 L18.7353,5.6204 C18.9053,5.9204 19.0043,6.2604 19.0043,6.6104 C19.0043,7.3204 18.6153,7.9814 17.9853,8.3304 C17.6743,8.5004 17.4143,8.7604 17.2353,9.0614 C16.7043,10.0004 17.0353,11.1894 17.9853,11.7314 C18.9443,12.2804 19.2743,13.4814 18.7353,14.4304 L18.0543,15.5614 C17.6943,16.1804 17.0243,16.5614 16.3043,16.5614 C15.9443,16.5614 15.5843,16.4704 15.2853,16.2904 C14.9643,16.1204 14.6153,16.0204 14.2643,16.0204 C13.7243,16.0204 13.2043,16.2314 12.8253,16.6104 C12.4343,16.9814 12.2243,17.4904 12.2243,18.0204 C12.2243,19.1104 11.3153,20.0004 10.1843,20.0004 L8.8153,20.0004 C8.2743,20.0004 7.7643,19.7804 7.3943,19.4104 C7.0143,19.0304 6.8153,18.5304 6.8153,18.0104 C6.8153,16.9104 5.9143,16.0204 4.7853,16.0204 C4.4143,16.0204 4.0543,16.1204 3.7443,16.3114 C3.2743,16.5704 2.7143,16.6404 2.1943,16.5104 C1.6743,16.3704 1.2243,16.0304 0.9543,15.5804 L0.3153,14.4504 C0.0143,13.9814 -0.0757,13.4204 0.0653,12.8904 C0.2043,12.3604 0.5653,11.9104 1.0543,11.6404 C1.3653,11.4704 1.6243,11.2204 1.8043,10.9104 C2.3253,9.9704 1.9943,8.7904 1.0543,8.2404 C0.1043,7.7004 -0.2257,6.5104 0.3153,5.5704 L0.9543,4.4504 C1.2243,3.9814 1.6743,3.6404 2.2043,3.5004 C2.7353,3.3604 3.2943,3.4394 3.7643,3.7104 C4.0843,3.8804 4.4343,3.9704 4.7853,3.9704 C5.3253,3.9704 5.8443,3.7604 6.2243,3.3904 C6.6043,3.0204 6.8153,2.5104 6.8153,1.9904 C6.8153,0.8904 7.7243,0.0004 8.8543,0.0004 Z M10.6153,7.4814 C9.5653,7.0504 8.3543,7.2804 7.5443,8.0704 C6.7443,8.8504 6.4943,10.0404 6.9343,11.0614 C7.3653,12.0904 8.3843,12.7604 9.5243,12.7604 L9.5353,12.7604 C10.2853,12.7704 10.9853,12.4814 11.5143,11.9604 C12.0443,11.4504 12.3443,10.7504 12.3443,10.0204 C12.3543,8.9104 11.6643,7.9004 10.6153,7.4814 Z" />
          </G>
        </Svg>
      );

    case 'calendar':
      // From assets/icons/calendar.svg (freeicons.io Iconly Calendar)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="3" y="4" width="18" height="17" rx="4" stroke={color} strokeWidth="2.2" fill="none" />
          <Line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
          <Line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
          <Line x1="3" y1="9.5" x2="21" y2="9.5" stroke={color} strokeWidth="2" />
          <Circle cx="8" cy="14" r="1.3" fill={color} />
          <Circle cx="12" cy="14" r="1.3" fill={color} />
          <Circle cx="16" cy="14" r="1.3" fill={color} />
        </Svg>
      );

    case 'chart':
      // From assets/icons/chart.svg (freeicons.io Iconly Chart)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <G transform="translate(2.0, 2.0)" fill={color}>
            <Path d="M14.6694,0.0004 C18.0704,0.0004 19.9904,1.9294 20.0004,5.3304 L20.0004,14.6704 C20.0004,18.0704 18.0704,20.0004 14.6694,20.0004 L5.3304,20.0004 C1.9294,20.0004 0.0004,18.0704 0.0004,14.6704 L0.0004,5.3304 C0.0004,1.9294 1.9294,0.0004 5.3304,0.0004 Z M10.5004,4.1304 C10.2194,3.9604 9.8794,3.9604 9.6104,4.1304 C9.3394,4.2994 9.1904,4.6104 9.2194,4.9204 L9.2194,15.1104 C9.2704,15.5404 9.6294,15.8604 10.0494,15.8604 C10.4804,15.8604 10.8394,15.5404 10.8794,15.1104 L10.8794,4.9204 C10.9194,4.6104 10.7704,4.2994 10.5004,4.1304 Z M5.8304,7.4104 C5.5604,7.2404 5.2194,7.2404 4.9504,7.4104 C4.6794,7.5804 4.5304,7.8894 4.5604,8.2004 L4.5604,15.1104 C4.5994,15.5404 4.9594,15.8604 5.3894,15.8604 C5.8204,15.8604 6.1794,15.5404 6.2194,15.1104 L6.2194,8.2004 C6.2504,7.8894 6.0994,7.5804 5.8304,7.4104 Z M15.0894,11.0404 C14.8204,10.8704 14.4804,10.8704 14.2004,11.0404 C13.9294,11.2104 13.7804,11.5094 13.8204,11.8304 L13.8204,15.1104 C13.8604,15.5404 14.2194,15.8604 14.6504,15.8604 C15.0704,15.8604 15.4294,15.5404 15.4804,15.1104 L15.4804,11.8304 C15.5094,11.5094 15.3604,11.2104 15.0894,11.0404 Z" />
          </G>
        </Svg>
      );

    case 'activity':
      // From assets/icons/activity.svg (freeicons.io Iconly Activity)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <G transform="translate(2.0, 2.0)" fill={color}>
            <Path d="M13.45,1.7803 C13.41,2.0303 13.39,2.2803 13.39,2.5303 C13.39,4.7803 15.21,6.5993 17.45,6.5993 C17.7,6.5993 17.94,6.5703 18.19,6.5303 L18.19,14.5993 C18.19,17.9903 16.19,20.0003 12.79,20.0003 L5.401,20.0003 C2,20.0003 0,17.9903 0,14.5993 L0,7.2003 C0,3.8003 2,1.7803 5.401,1.7803 Z M13.651,7.8603 C13.38,7.8303 13.111,7.9503 12.95,8.1703 L10.531,11.3003 L7.76,9.1203 C7.39,8.9393 6.991,8.9903 6.69,9.2593 L3.731,13.1103 C3.5,13.5193 3.58,13.9293 3.88,14.1503 C4.2,14.35 4.65,14.28 4.93,14.0003 L7.44,10.7693 L10.29,12.9103 C10.7,13.1393 11.1,13.0603 11.33,12.7593 L14.22,9.0303 C14.42,8.65 14.151,7.95 13.651,7.8603 Z M17.5901,0 C18.9201,0 20.0001,1.08 20.0001,2.41 C20.0001,3.74 18.9201,4.82 17.5901,4.82 C16.2601,4.82 15.1801,3.74 15.1801,2.41 C15.1801,1.08 16.2601,0 17.5901,0 Z" />
          </G>
        </Svg>
      );

    case 'scan':
      // From assets/icons/scan.svg (freeicons.io Iconly Scan/Camera)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <G transform="translate(1.0, 3.0)" fill={color}>
            <Path d="M21.1972,9.2368 C21.65,9.2368 22,9.58 22,10.04 C22,10.5 21.65,10.6484 21.1972,10.6484 L20.1799,10.6484 L20.1799,13.3105 C20.18,15.9 18.05,18 15.4388,18 L14.6614,18 C14.2639,18 13.9416,17.6819 13.9416,17.2895 C13.9416,16.8971 14.2639,16.5789 14.6614,16.5789 L15.4388,16.5789 C17.2524,16.5582 18.7116,15.1009 18.7115,13.3105 L18.7115,10.6484 L16.0146,10.6484 L16.0146,11.7095 C16.0146,12.939 15.0048,13.9358 13.7592,13.9358 L8.2695,13.9358 C7.0239,13.9358 6.0142,12.939 6.0142,11.7095 L6.0142,10.6484 L3.3557,10.6484 L3.3557,13.3105 C3.3557,15.1156 4.8381,16.5789 6.6668,16.5789 L7.4922,16.5789 C7.8897,16.5789 8.212,16.8971 8.212,17.2895 C8.212,17.6819 7.8897,18 7.4922,18 L6.7148,18 C4.0832,18 1.9424,15.9081 1.9161,13.3105 L1.9161,10.6484 L0.8028,10.6484 C0.35,10.6484 0,10.3 0,9.94 C0,9.58 0.35,9.2368 0.8028,9.2368 Z M13.7497,4.0642 C15.0048,4.0642 16.005,5.061 16.005,6.2905 L16.005,7.5126 L6.0142,7.5126 L6.0142,6.2905 C6.0142,5.061 7.0239,4.0642 8.2695,4.0642 Z M15.4388,0 C18.0552,0.0465 20.1515,2.1537 20.1511,4.7368 L20.1511,5.7505 C20.1511,6.1429 19.8288,6.4611 19.4313,6.4611 C19.0338,6.4611 18.7115,6.1429 18.7115,5.7505 L18.7115,4.7368 C18.7115,2.92 17.25,1.4211 15.4388,1.4211 L14.6614,1.4211 C14.2639,1.4211 13.9416,1.1029 13.9416,0.7105 C13.9416,0.3181 14.2639,0 14.6614,0 Z M7.4442,0 C7.8395,0.0051 8.1588,0.3202 8.164,0.7105 C8.1588,1.1008 7.8395,1.416 7.4442,1.4211 L6.6668,1.4211 C4.85,1.4211 3.3557,2.92 3.3557,4.7368 L3.3557,5.7505 C3.3505,6.1408 3.0313,6.456 2.6359,6.4611 C2.182,6.4611 1.9161,6.1069 1.9161,5.7505 L1.9161,4.7368 C1.9159,2.1391 4.0353,0.026 6.6668,0 Z" />
          </G>
        </Svg>
      );

    case 'search':
      // From assets/icons/search.svg (freeicons.io Iconly Search)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <G transform="translate(2.0, 2.0)" fill={color}>
            <Path d="M15.6207,15.6543 C16.0072,15.2704 16.6268,15.2704 17.0134,15.6543 L19.6124,17.7164 C20.1292,18.2388 20.1292,19.0858 19.6124,19.6082 C19.0955,20.1306 18.2576,20.1306 17.7407,19.6082 L15.5403,17.0877 C15.22,16.68 15.26,16.02 15.6207,15.6543 Z M8.5776,0 C13.3149,0 17.1553,3.8817 17.1553,8.6699 C17.1553,13.4582 13.3149,17.3399 8.5776,17.3399 C3.8403,17.3399 0,13.4582 0,8.6699 C0,3.8817 3.8403,0 8.5776,0 Z M8.5776,2.8 C5.36,2.8 2.8,5.42 2.8,8.67 C2.8,11.92 5.36,14.54 8.5776,14.54 C11.79,14.54 14.35,11.92 14.35,8.67 C14.35,5.42 11.79,2.8 8.5776,2.8 Z" />
          </G>
        </Svg>
      );

    case 'plus':
      // From assets/icons/plus.svg (freeicons.io Iconly Plus)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth="2.8" strokeLinecap="round" />
          <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth="2.8" strokeLinecap="round" />
        </Svg>
      );

    case 'star':
      // From assets/icons/star.svg (freeicons.io Iconly Star)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <G transform="translate(2.0, 2.5)" fill={color}>
            <Path d="M15.9199,11.8203 C15.6599,12.0703 15.5399,12.4393 15.6009,12.7903 L16.4899,17.7103 C16.5609,18.1303 16.3909,18.5493 16.0399,18.7903 C15.6999,19.0403 15.2499,19.0703 14.8699,18.8703 L10.4409,16.5603 C10.15,16.41 9.68,16.41 9.3999,16.5193 L4.9699,18.8403 C4.2,19.15 3.25,18.48 3.3699,17.6793 L4.2599,12.7593 C4.3199,12.4003 4.1999,12.0403 3.9409,11.7803 L0.3299,8.2803 C-0.25,7.7 0.12,6.52 0.9499,6.4003 L5.9199,5.6793 C6.2999,5.6393 6.6299,5.4103 6.7999,5.0703 L8.9899,0.5803 C9.38,-0.18 10.62,-0.18 11.0209,0.5993 L13.2399,5.0703 C13.3999,5.4003 13.7099,5.6203 14.0699,5.6793 L19.0399,6.4003 C19.86,6.52 20.23,7.7 19.6599,8.2803 L15.9199,11.8203 Z" />
          </G>
        </Svg>
      );

    case 'heart':
      // From assets/icons/heart.svg (freeicons.io Iconly Heart/Mood)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M12 20.5C12 20.5 3.5 15.2 3.5 8.9C3.5 5.8 5.9 3.5 8.8 3.5C10.5 3.5 12 4.4 12 4.4C12 4.4 13.5 3.5 15.2 3.5C18.1 3.5 20.5 5.8 20.5 8.9C20.5 15.2 12 20.5 12 20.5Z"
            fill={color}
          />
        </Svg>
      );

    case 'clock':
      // From assets/icons/clock.svg (freeicons.io Clock/Timer)
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32">
          <Path
            d="M16,2C8.3,2,2,8.3,2,16s6.3,14,14,14s14-6.3,14-14S23.7,2,16,2z M23,17h-7c-0.6,0-1-0.4-1-1V7c0-0.6,0.4-1,1-1s1,0.4,1,1v8h6c0.6,0,1,0.4,1,1S23.6,17,23,17z"
            fill={color}
          />
        </Svg>
      );

    case 'crown':
      // From assets/icons/crown.svg (freeicons.io Crown/Monarch)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M3 18H21V20H3V18ZM3.5 16L2 7L7.5 11L12 4L16.5 11L22 7L20.5 16H3.5Z"
            fill={color}
          />
        </Svg>
      );

    case 'moon':
      // From assets/icons/moon.svg (freeicons.io Moon)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M20.35 15.35C19.3 15.77 18.15 16 16.95 16C11.98 16 7.95 11.97 7.95 7C7.95 5.24 8.46 3.6 9.33 2.21C5.36 3.16 2.4 6.73 2.4 11C2.4 16.03 6.47 20.1 11.5 20.1C15.56 20.1 19.01 17.44 20.18 13.77C20.24 14.3 20.35 15.35 20.35 15.35Z"
            fill={color}
          />
        </Svg>
      );

    case 'sun':
      // From assets/icons/sun.svg (freeicons.io Sun)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="5" fill={color} />
          <Line x1="12" y1="2" x2="12" y2="4.5" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
          <Line x1="12" y1="19.5" x2="12" y2="22" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
          <Line x1="2" y1="12" x2="4.5" y2="12" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
          <Line x1="19.5" y1="12" x2="22" y2="12" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
          <Line x1="4.93" y1="4.93" x2="6.7" y2="6.7" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
          <Line x1="17.3" y1="17.3" x2="19.07" y2="19.07" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
          <Line x1="19.07" y1="4.93" x2="17.3" y2="6.7" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
          <Line x1="6.7" y1="17.3" x2="4.93" y2="19.07" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
        </Svg>
      );

    case 'trash':
      // From assets/icons/trash.svg (freeicons.io Trash)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM19 4H15.5L14.5 3H9.5L8.5 4H5V6H19V4Z"
            fill={color}
          />
        </Svg>
      );

    case 'leaf':
      // From assets/icons/leaf.svg (freeicons.io Leaf/Rest)
      return (
        <Svg width={size} height={size} viewBox="0 0 32 48">
          <Path
            d="M30.81,27.18A14.9,14.9,0,1,1,1,27.18C1,20.09,12.07,5.67,15.14,1.8a1,1,0,0,1,1.55,0C19.76,5.67,30.81,20.09,30.81,27.18Z"
            fill="none"
            stroke={color}
            strokeWidth="3.5"
          />
          <Line x1="15.91" y1="6" x2="15.91" y2="46" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
        </Svg>
      );

    case 'bolt':
      // From assets/icons/lightning.svg (freeicons.io Lightning Bolt)
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32">
          <Polygon
            points="26,16 18.63,16 22.98,3 6,16 13.37,16 9.02,29"
            fill={color}
          />
        </Svg>
      );

    case 'shield':
      // From assets/icons/shield.svg (freeicons.io Shield)
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32">
          <Path
            d="M25,6.7c-3.4,0-6.6-1.4-9-3.7c-2.4,2.3-5.6,3.7-9,3.7C5.6,6.7,4.3,6.4,3,6c0,14,5.5,19.6,13,23c7.5-3.4,13-9,13-23C27.7,6.4,26.4,6.7,25,6.7z"
            fill="none"
            stroke={color}
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
          <Polyline
            points="11.5,16 14.8,19.2 21,13"
            fill="none"
            stroke={color}
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'edit':
      // From assets/icons/edit.svg (freeicons.io Edit)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z"
            fill={color}
          />
        </Svg>
      );

    case 'meal':
      // From assets/icons/meal.svg (Food Bowl)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M3 12H21C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12Z"
            fill={color}
          />
          <Path
            d="M4 9.5H20"
            stroke={color}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <Path
            d="M8 6C8 4.5 9.2 3.5 9.2 2M12 6C12 4.5 13.2 3.5 13.2 2M16 6C16 4.5 17.2 3.5 17.2 2"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      );

    case 'quest':
      // Target / Quest emblem
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2.2" fill="none" />
          <Circle cx="12" cy="12" r="5" stroke={color} strokeWidth="2" fill="none" />
          <Circle cx="12" cy="12" r="2" fill={color} />
        </Svg>
      );

    case 'check':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Polyline
            points="4,12.5 9.5,18 20,6.5"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'lock':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="5" y="11" width="14" height="10" rx="2.5" fill={color} />
          <Path
            d="M8 11V7C8 4.79 9.79 3 12 3C14.21 3 16 4.79 16 7V11"
            stroke={color}
            strokeWidth="2.4"
            fill="none"
          />
        </Svg>
      );

    case 'swap':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M17 4L21 8L17 12M3 8H20M7 20L3 16L7 12M21 16H4"
            stroke={color}
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      );

    case 'export':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M12 16V4M12 4L7.5 8.5M12 4L16.5 8.5M4 17V19C4 20.1 4.9 21 6 21H18C19.1 21 20 20.1 20 19V17"
            stroke={color}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      );

    case 'import':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M12 4V16M12 16L7.5 11.5M12 16L16.5 11.5M4 17V19C4 20.1 4.9 21 6 21H18C19.1 21 20 20.1 20 19V17"
            stroke={color}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      );

    case 'snowflake':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1="12" y1="2" x2="12" y2="22" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
          <Line x1="2" y1="12" x2="22" y2="12" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
          <Line x1="4.9" y1="4.9" x2="19.1" y2="19.1" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Line x1="19.1" y1="4.9" x2="4.9" y2="19.1" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );

    case 'brain':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M9.5 3C7.5 3 6 4.5 6 6.5C4.3 7.1 3 8.7 3 10.6C3 12.2 3.9 13.6 5.2 14.3C5 14.9 5 15.5 5 16C5 18.2 6.8 20 9 20H11V3H9.5ZM14.5 3C16.5 3 18 4.5 18 6.5C19.7 7.1 21 8.7 21 10.6C21 12.2 20.1 13.6 18.8 14.3C19 14.9 19 15.5 19 16C19 18.2 17.2 20 15 20H13V3H14.5Z"
            fill={color}
          />
        </Svg>
      );

    default:
      return null;
  }
};
