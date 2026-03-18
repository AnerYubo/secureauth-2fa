import * as OTPAuth from 'otpauth';

// --- TOTP Generation ---
export const generateToken = (secret: string, period: number = 30) => {
  try {
    const cleanSecret = secret.replace(/\s+/g, '');
    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(cleanSecret),
      period: period,
      algorithm: 'SHA1',
      digits: 6,
    });

    const token = totp.generate();
    const seconds = period - (Math.floor(Date.now() / 1000) % period);
    const progress = (seconds / period) * 100;

    return { token, seconds, progress, valid: true };
  } catch (e) {
    return { token: 'ERROR', seconds: 0, progress: 0, valid: false };
  }
};

export const generateRandomSecret = (length: number = 16): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const generateShortId = (): string => {
  return Math.random().toString(36).substring(2, 10);
};

export const parseOTPAuthURL = (url: string): Partial<import('../types').OTPAccount> | null => {
  try {
    const parsed = OTPAuth.URI.parse(url);
    if (parsed instanceof OTPAuth.TOTP) {
      return {
        issuer: parsed.issuer,
        account: parsed.label,
        secret: parsed.secret.base32,
        period: parsed.period,
        algorithm: parsed.algorithm,
        digits: parsed.digits,
      };
    }
  } catch (e) {
    console.error("Invalid OTP Auth URL", e);
  }
  return null;
};

export const parseLine = (line: string, separator: string = ','): import('../types').ImportCandidate => {
  const trimmed = line.trim();
  if (!trimmed) return { raw: line, issuer: '', account: '', secret: '', period: 30, isValid: false };

  // Case 1: Standard OTPAuth URI
  if (trimmed.startsWith('otpauth://')) {
    const parsed = parseOTPAuthURL(trimmed);
    if (parsed && parsed.secret) {
      return {
        raw: line,
        issuer: parsed.issuer || 'Unknown',
        account: parsed.account || 'Unknown',
        secret: parsed.secret,
        period: parsed.period || 30,
        isValid: true
      };
    }
  }
  
  // Case 2: Migration URI handled specifically at Modal level, 
  // but if encountered here as a single line, we mark it for modal processing or invalid if it can't be split.
  if (trimmed.startsWith('otpauth-migration://')) {
    // We return a specialized candidate that the Modal logic will expand
    return {
      raw: trimmed,
      issuer: 'Google Migration',
      account: 'Multi-account package',
      secret: 'MIGRATION_BLOB',
      period: 30,
      isValid: true,
      notes: 'Migration URI'
    };
  }

  // Case 3: CSV Format (Issuer, Account, Secret, Period, Notes, LogoID)
  // Example: 123,31,BINV6HXE4DYR6Q2P,30,123,36
  const parts = trimmed.split(separator).map(p => p.trim());
  if (parts.length >= 3) {
    const periodVal = parts[3] ? parseInt(parts[3], 10) : 30;
    return {
      raw: line,
      issuer: parts[0],
      account: parts[1],
      secret: parts[2],
      period: isNaN(periodVal) ? 30 : periodVal,
      notes: parts[4] || '',
      logoId: parts[5] ? String(parts[5]) : '',
      isValid: true
    };
  }

  return { raw: line, issuer: '', account: '', secret: '', period: 30, isValid: false };
};


// --- Encryption / Security ---

// 1. Generate a random salt for PBKDF2
export const generateSalt = (): string => {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
};

// 2. Hash Password (PBKDF2-SHA256) for verification
export const hashPassword = async (password: string, salt: string): Promise<string> => {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const exported = await window.crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
};

// 3. Derive Key for Encryption
const getKey = async (password: string, salt: string): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

// 4. Encrypt Data
export const encryptData = async (data: string, password: string, salt: string): Promise<string> => {
  const key = await getKey(password, salt);
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // IV
  const encodedData = new TextEncoder().encode(data);

  const encryptedContent = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encodedData
  );

  const encryptedBytes = new Uint8Array(encryptedContent);
  const combined = new Uint8Array(iv.length + encryptedBytes.length);
  combined.set(iv);
  combined.set(encryptedBytes, iv.length);

  return btoa(String.fromCharCode(...combined));
};

// 5. Decrypt Data
export const decryptData = async (encryptedBase64: string, password: string, salt: string): Promise<string | null> => {
  try {
    const key = await getKey(password, salt);
    const combined = new Uint8Array(atob(encryptedBase64).split("").map(c => c.charCodeAt(0)));
    
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decryptedContent = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      data
    );

    return new TextDecoder().decode(decryptedContent);
  } catch (e) {
    console.error("Decryption failed", e);
    return null;
  }
};
