import { NativeModules, Platform } from 'react-native';

/**
 * Thin, crash-safe wrapper around the Android `AwakenedNative` module
 * (see android/app/src/main/java/com/awakened/liferpg/AwakenedNativeModule.kt).
 * Every call degrades gracefully (no-op / null / false) on web, iOS or when the native module
 * is missing, so UI code never has to guard against it.
 */
interface AwakenedNativeApi {
  getNotificationPermissionStatus(): Promise<'granted' | 'denied'>;
  requestNotificationPermission(): Promise<boolean>;
  openNotificationSettings(): void;
  scheduleReminder(
    id: number,
    hour: number,
    minute: number,
    title: string,
    body: string,
    skipToday: boolean
  ): void;
  cancelReminder(id: number): void;
  scheduleAlarm(
    hour: number,
    minute: number,
    days: number[],
    title: string,
    body: string,
    snoozeLabel: string
  ): void;
  cancelAlarm(): void;
  updateWidgetData(json: string): void;
  requestPinWidget(): Promise<boolean>;
  pickProfileImage(): Promise<string | null>;
  requestPinShortcut(label: string, avatarPath: string | null): Promise<boolean>;
  copyToClipboard(text: string): void;
  getDeviceRegion(): Promise<string>;
  canAuthenticateBiometric(): Promise<boolean>;
  authenticateBiometric(title: string, subtitle: string): Promise<boolean>;
}

function getNative(): Partial<AwakenedNativeApi> | null {
  if (Platform.OS !== 'android') return null;
  return (NativeModules?.AwakenedNative as Partial<AwakenedNativeApi> | undefined) ?? null;
}

export function isNativeBridgeAvailable(): boolean {
  return getNative() !== null;
}

async function safe<T>(fn: (() => Promise<T> | T) | undefined, fallback: T): Promise<T> {
  try {
    if (!fn) return fallback;
    return await fn();
  } catch {
    return fallback;
  }
}

export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied'> {
  const n = getNative();
  return safe(n?.getNotificationPermissionStatus?.bind(n), 'denied' as const);
}

export async function requestNotificationPermission(): Promise<boolean> {
  const n = getNative();
  return safe(n?.requestNotificationPermission?.bind(n), false);
}

export function openNotificationSettings(): void {
  try {
    getNative()?.openNotificationSettings?.();
  } catch {
    // ignore
  }
}

export function scheduleReminder(
  id: number,
  hour: number,
  minute: number,
  title: string,
  body: string,
  skipToday: boolean
): void {
  try {
    getNative()?.scheduleReminder?.(id, hour, minute, title, body, skipToday);
  } catch {
    // ignore
  }
}

export function cancelReminder(id: number): void {
  try {
    getNative()?.cancelReminder?.(id);
  } catch {
    // ignore
  }
}

export function scheduleAlarm(
  hour: number,
  minute: number,
  days: number[],
  title: string,
  body: string,
  snoozeLabel: string
): void {
  try {
    getNative()?.scheduleAlarm?.(hour, minute, days, title, body, snoozeLabel);
  } catch {
    // ignore
  }
}

export function cancelAlarm(): void {
  try {
    getNative()?.cancelAlarm?.();
  } catch {
    // ignore
  }
}

export function updateWidgetData(payload: Record<string, unknown>): void {
  try {
    getNative()?.updateWidgetData?.(JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export async function requestPinWidget(): Promise<boolean> {
  const n = getNative();
  return safe(n?.requestPinWidget?.bind(n), false);
}

/** Opens the system gallery, returns a `file://` URI of a square 512px copy, or null. */
export async function pickProfileImage(): Promise<string | null> {
  const n = getNative();
  return safe(n?.pickProfileImage?.bind(n), null as string | null);
}

export async function requestPinShortcut(
  label: string,
  avatarPath: string | null
): Promise<boolean> {
  const n = getNative();
  if (!n?.requestPinShortcut) return false;
  return safe(() => n.requestPinShortcut!(label, avatarPath), false);
}

export function copyToClipboard(text: string): void {
  try {
    getNative()?.copyToClipboard?.(text);
  } catch {
    // ignore
  }
}

/** Uppercase ISO country code of the device locale (e.g. "TH"), or "" if unknown. */
export async function getDeviceRegion(): Promise<string> {
  const n = getNative();
  return safe(n?.getDeviceRegion?.bind(n), '');
}

export async function canAuthenticateBiometric(): Promise<boolean> {
  const n = getNative();
  return safe(n?.canAuthenticateBiometric?.bind(n), false);
}

export async function authenticateBiometric(
  title: string,
  subtitle: string
): Promise<boolean> {
  const n = getNative();
  if (!n?.authenticateBiometric) return false;
  return safe(() => n.authenticateBiometric!(title, subtitle), false);
}
