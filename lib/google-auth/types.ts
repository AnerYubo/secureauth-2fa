export enum Algorithm {
  ALGO_INVALID = 0,
  SHA1 = 1,
  SHA256 = 2,
  SHA512 = 3,
  MD5 = 4,
}

export enum DigitCount {
  DIGIT_COUNT_INVALID = 0,
  SIX = 1,
  EIGHT = 2,
}

export enum OtpType {
  OTP_INVALID = 0,
  HOTP = 1,
  TOTP = 2,
}

export interface OTPAccount {
  secret: string; // Base32 encoded string for UI
  name: string;
  issuer: string;
  algorithm: Algorithm;
  digits: DigitCount;
  type: OtpType;
  counter: number;
}

export interface MigrationPayload {
  otpParameters: OTPAccount[];
  version: number;
  batchSize: number;
  batchIndex: number;
  batchId: number;
}