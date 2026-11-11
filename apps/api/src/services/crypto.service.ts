import crypto from 'crypto';
import { ENCRYPTION_KEY } from '../config';

// Derive 32-byte key for AES-256-GCM using SHA-256
const ALGORITHM = 'aes-256-gcm';
const KEY = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();

/**
 * Encrypts a plaintext string using AES-256-GCM with authentication tag.
 * Returns formatted: iv:authTag:encryptedData (hex encoded).
 */
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 */
export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generates a high-entropy random PKCE code verifier (43-128 chars base64url).
 */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generates an S256 PKCE code challenge from a code verifier.
 */
export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

/**
 * Generates a random cryptographic nonce.
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generates a signed, tamper-proof state token for OAuth flows.
 */
export function createSignedOAuthState(payload: Record<string, any>): string {
  const json = JSON.stringify({
    ...payload,
    timestamp: Date.now(),
  });
  const data = Buffer.from(json, 'utf8').toString('base64url');
  const hmac = crypto.createHmac('sha256', KEY).update(data).digest('base64url');
  return `${data}.${hmac}`;
}

/**
 * Verifies and parses a signed OAuth state token.
 * Rejects if signature is invalid or if expired (> 15 minutes).
 */
export function verifySignedOAuthState<T = any>(stateToken: string): T | null {
  try {
    const [data, hmac] = stateToken.split('.');
    if (!data || !hmac) return null;

    const expectedHmac = crypto.createHmac('sha256', KEY).update(data).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    // Expire state after 15 minutes
    if (Date.now() - payload.timestamp > 15 * 60 * 1000) {
      return null;
    }

    return payload as T;
  } catch {
    return null;
  }
}
