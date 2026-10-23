import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Sound & Haptics Service (Section 6.9 & 15)
 * Uses Web Audio API synthesizer when available + native Haptics on Android/iOS,
 * requiring zero external audio files and strictly respecting `soundEnabled`.
 */
export function playSystemFeedback(
  type: 'xp' | 'quest' | 'levelUp' | 'rankUp' | 'timerDone',
  soundEnabled: boolean
): void {
  if (!soundEnabled) return;

  // Trigger native haptics on mobile devices
  if (Platform.OS !== 'web') {
    try {
      if (type === 'levelUp' || type === 'rankUp') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {
      // Ignore if device doesn't support haptics
    }
  }

  // Synthesize RPG System chime on Web / WebView
  if (typeof window !== 'undefined') {
    const AudioCtx =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      const ctx = new AudioCtx();
      const notes =
        type === 'xp'
          ? [523.25, 659.25]
          : type === 'quest'
          ? [523.25, 659.25, 783.99]
          : type === 'levelUp'
          ? [440, 554.37, 659.25, 880]
          : type === 'rankUp'
          ? [392, 523.25, 659.25, 783.99, 1046.5]
          : [783.99, 659.25, 783.99];

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const start = ctx.currentTime + idx * 0.08;
        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.23);
      });
    } catch {
      // AudioContext blocked or unavailable
    }
  }
}
