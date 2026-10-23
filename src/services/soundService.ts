import { NativeModules, Platform, Vibration } from 'react-native';

/**
 * Sound & Haptics Service (Section 6.9 & 15)
 * Uses native Android ToneGenerator + Vibration on Android APK,
 * and Web Audio API synthesizer on Web, requiring zero external audio files
 * and strictly respecting `soundEnabled`.
 */
export function playSystemFeedback(
  type: 'xp' | 'quest' | 'levelUp' | 'rankUp' | 'timerDone',
  soundEnabled: boolean
): void {
  if (!soundEnabled) return;

  // Trigger native haptics & RPG tone on mobile devices
  if (Platform.OS !== 'web') {
    try {
      if (type === 'levelUp' || type === 'rankUp') {
        Vibration.vibrate([0, 50, 70, 110]);
      } else {
        Vibration.vibrate(25);
      }
    } catch {
      // Ignore if device doesn't support vibration
    }

    try {
      const nativeMod = NativeModules?.AwakenedNative;
      if (nativeMod && typeof nativeMod.playTone === 'function') {
        nativeMod.playTone(type);
      }
    } catch {
      // Ignore if native tone module is unavailable
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
