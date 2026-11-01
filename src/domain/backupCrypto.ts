// Encrypted backup (PRD 10.6): PBKDF2-SHA-256 -> AES-256-GCM. The passphrase is never stored.
export interface EncryptedBackup {
  app: 'dsa-studio';
  encrypted: true;
  v: 1;
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number; salt: string };
  iv: string;
  ciphertext: string;
}

export const KDF_ITERATIONS = 600_000;

const b64 = (b: Uint8Array) => {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
};
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function key(pass: string, salt: Uint8Array, iterations: number) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
  );
}

export async function encryptBackup(plain: string, pass: string, iterations = KDF_ITERATIONS): Promise<EncryptedBackup> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, await key(pass, salt, iterations), new TextEncoder().encode(plain));
  return {
    app: 'dsa-studio', encrypted: true, v: 1,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations, salt: b64(salt) },
    iv: b64(iv), ciphertext: b64(new Uint8Array(ct)),
  };
}

export const isEncrypted = (x: unknown): x is EncryptedBackup =>
  typeof x === 'object' && x !== null && (x as { encrypted?: unknown }).encrypted === true && (x as { app?: unknown }).app === 'dsa-studio';

/** Throws "Wrong passphrase or damaged file." when authentication fails. */
export async function decryptBackup(f: EncryptedBackup, pass: string): Promise<string> {
  try {
    const k = await key(pass, unb64(f.kdf.salt), f.kdf.iterations);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(f.iv) as BufferSource }, k, unb64(f.ciphertext) as BufferSource);
    return new TextDecoder().decode(pt);
  } catch {
    throw new Error('Wrong passphrase or damaged file.');
  }
}
