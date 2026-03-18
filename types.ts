
export type StorageMode = 'local' | 'session' | 'file';

export interface AppLogo {
  id: string; // Unique identifier (integer string or uuid)
  name: string;
  data: string; // Base64 or URL
  isDefault?: boolean;
}

export interface OTPAccount {
  id: string;
  issuer: string;
  account: string;
  secret: string;
  period: number;
  notes?: string;
  logoId?: string; // Reference to AppLogo.id
  algorithm?: string;
  digits?: number;
  createdAt: number;
}

export interface ImportCandidate {
  raw: string;
  issuer: string;
  account: string;
  secret: string;
  period: number;
  isValid: boolean;
  notes?: string;
  logoId?: string;
}

export interface DefaultLogo {
  id: number;
  name: string;
  data: string;
}

export interface FileSpace {
  id: string;
  displayName: string;
  handle: FileSystemFileHandle | null; // Nullable for legacy browser support
  isEncrypted: boolean;
  password?: string; // Temporarily store password in memory for auto-saving
  isVirtual?: boolean; // True if using legacy <input type="file"> method (no auto-save)
  needsPermission?: boolean; // UI state for persisted handles
}