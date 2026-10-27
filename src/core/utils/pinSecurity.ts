import { UserProfile } from '../engine/types';

/**
 * Pure TypeScript SHA-256 + multi-round key stretching for 100% offline, synchronous
 * PIN verification across React Native Hermes and Vitest.
 */
const K: number[] = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function rotr(n: number, x: number): number {
  return (x >>> n) | (x << (32 - n));
}

export function sha256Hex(ascii: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < ascii.length; i++) {
    const code = ascii.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }

  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while ((bytes.length % 64) !== 56) {
    bytes.push(0);
  }
  // Append 64-bit length
  bytes.push(0, 0, 0, 0);
  bytes.push(
    (bitLen >>> 24) & 0xff,
    (bitLen >>> 16) & 0xff,
    (bitLen >>> 8) & 0xff,
    bitLen & 0xff
  );

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Array<number>(64);
  for (let chunk = 0; chunk < bytes.length; chunk += 64) {
    for (let i = 0; i < 16; i++) {
      const idx = chunk + i * 4;
      w[i] =
        ((bytes[idx] << 24) |
          (bytes[idx + 1] << 16) |
          (bytes[idx + 2] << 8) |
          bytes[idx + 3]) >>>
        0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = (rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3)) >>> 0;
      const s1 = (rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10)) >>> 0;
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = (rotr(6, e) ^ rotr(11, e) ^ rotr(25, e)) >>> 0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = (rotr(2, a) ^ rotr(13, a) ^ rotr(22, a)) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((n) => n.toString(16).padStart(8, '0'))
    .join('');
}

export function generatePinSalt(): string {
  const chars = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < 16; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function hashPin(pin: string, salt: string): string {
  let digest = sha256Hex(`awakened:v1:${salt}:${pin}`);
  for (let i = 0; i < 64; i++) {
    digest = sha256Hex(`${digest}:${salt}:${i}`);
  }
  return digest;
}

export function generateRecoveryCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const block = () => {
    let s = '';
    for (let i = 0; i < 4; i++) {
      s += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return s;
  };
  return `AWK-${block()}-${block()}`;
}

export function isAppLockEnabled(
  profile?: Pick<UserProfile, 'appLockPin' | 'appLockPinHash'> | null
): boolean {
  if (!profile) return false;
  return Boolean(profile.appLockPinHash || profile.appLockPin);
}

export function verifyPin(
  inputPin: string,
  profile: Pick<UserProfile, 'appLockPin' | 'appLockPinHash' | 'appLockSalt'>
): boolean {
  if (!inputPin) return false;
  if (profile.appLockPinHash && profile.appLockSalt) {
    return hashPin(inputPin, profile.appLockSalt) === profile.appLockPinHash;
  }
  if (profile.appLockPin) {
    return inputPin === profile.appLockPin;
  }
  return false;
}

export function verifyRecoveryCode(
  inputCode: string,
  storedCode?: string | null
): boolean {
  if (!inputCode || !storedCode) return false;
  const normalize = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return normalize(inputCode) === normalize(storedCode);
}

/**
 * Escalating cooldown after consecutive failed PIN attempts:
 * - < 5 attempts: 0s
 * - 5 attempts: 30s
 * - 6 attempts: 60s (1m)
 * - 7 attempts: 300s (5m)
 * - >= 8 attempts: 900s (15m)
 */
export function getLockoutDurationMs(failedAttempts: number): number {
  if (failedAttempts < 5) return 0;
  if (failedAttempts === 5) return 30_000;
  if (failedAttempts === 6) return 60_000;
  if (failedAttempts === 7) return 300_000;
  return 900_000;
}
