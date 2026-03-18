import { encode as base32Encode, decode as base32Decode } from 'hi-base32';
import { MigrationPayloadType } from './proto';
import { OTPAccount, Algorithm, DigitCount, OtpType } from './types';

export * from './types';

// Helper to convert Uint8Array to Base32 string
const bytesToBase32 = (bytes: Uint8Array): string => {
  // hi-base32 expects number[] or string, convert Uint8Array to number[]
  const numberArray = Array.from(bytes);
  return base32Encode(numberArray).replace(/=/g, ''); // Remove padding for cleaner UI
};

// Helper to convert Base32 string to Uint8Array
const base32ToBytes = (base32: string): Uint8Array => {
  try {
    const normalized = base32.toUpperCase().replace(/\s/g, '');
    const numberArray = base32Decode.asBytes(normalized);
    return new Uint8Array(numberArray);
  } catch (e) {
    console.error("Invalid Base32 string", e);
    return new Uint8Array([]);
  }
};

export const parseMigrationURI = (uri: string): OTPAccount[] => {
  if (!uri.startsWith("otpauth-migration://offline?data=")) {
    throw new Error("Invalid URI format: Must start with otpauth-migration://offline?data=");
  }

  const queryParams = new URL(uri).searchParams;
  const data = queryParams.get("data");

  if (!data) {
    throw new Error("No data parameter found in URI");
  }

  try {
    // 1. Base64 Decode
    const binaryString = atob(data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // 2. Protobuf Decode
    const message = MigrationPayloadType.decode(bytes);
    const object = MigrationPayloadType.toObject(message, {
      longs: Number,
      enums: Number,
      bytes: Object, // Keep bytes as is (Buffer/Uint8Array)
    });

    // 3. Map to internal OTPAccount structure
    if (!object.otpParameters) return [];

    return object.otpParameters.map((param: any) => ({
      secret: bytesToBase32(param.secret || new Uint8Array()),
      name: param.name || "",
      issuer: param.issuer || "",
      algorithm: param.algorithm || Algorithm.SHA1,
      digits: param.digits || DigitCount.SIX,
      type: param.type || OtpType.TOTP,
      counter: param.counter || 0,
    }));

  } catch (err) {
    console.error(err);
    throw new Error("Failed to decode migration data. Ensure the URI is correct.");
  }
};

export const generateMigrationURI = (accounts: OTPAccount[]): string => {
  const otpParameters = accounts.map(acc => ({
    secret: base32ToBytes(acc.secret),
    name: acc.name,
    issuer: acc.issuer,
    algorithm: acc.algorithm,
    digits: acc.digits,
    type: acc.type,
    counter: acc.counter
  }));

  const payload = {
    otpParameters,
    version: 1,
    batchSize: accounts.length,
    batchIndex: 0,
    batchId: Math.floor(Math.random() * 100000)
  };

  // 1. Protobuf Encode
  const errMsg = MigrationPayloadType.verify(payload);
  if (errMsg) throw Error(errMsg);

  const message = MigrationPayloadType.create(payload);
  const buffer = MigrationPayloadType.encode(message).finish();

  // 2. Base64 Encode
  let binaryString = "";
  for (let i = 0; i < buffer.length; i++) {
    binaryString += String.fromCharCode(buffer[i]);
  }
  const base64 = btoa(binaryString);

  // 3. Construct URI
  // Note: encodeURIComponent is important because Base64 contains '+', '/', '=' which have special meaning in URLs
  return `otpauth-migration://offline?data=${encodeURIComponent(base64)}`;
};