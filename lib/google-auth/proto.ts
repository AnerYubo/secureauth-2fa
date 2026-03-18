import { Root } from 'protobufjs';

// We define the schema programmatically to avoid needing a .proto file at runtime
const schemaJson = {
  nested: {
    googleauth: {
      nested: {
        MigrationPayload: {
          fields: {
            otpParameters: { rule: "repeated", type: "OTPParameters", id: 1 },
            version: { type: "int32", id: 2 },
            batchSize: { type: "int32", id: 3 },
            batchIndex: { type: "int32", id: 4 },
            batchId: { type: "int32", id: 5 }
          },
          nested: {
            Algorithm: {
              values: {
                ALGO_INVALID: 0,
                SHA1: 1,
                SHA256: 2,
                SHA512: 3,
                MD5: 4
              }
            },
            DigitCount: {
              values: {
                DIGIT_COUNT_INVALID: 0,
                SIX: 1,
                EIGHT: 2
              }
            },
            OtpType: {
              values: {
                OTP_INVALID: 0,
                HOTP: 1,
                TOTP: 2
              }
            },
            OTPParameters: {
              fields: {
                secret: { type: "bytes", id: 1 },
                name: { type: "string", id: 2 },
                issuer: { type: "string", id: 3 },
                algorithm: { type: "Algorithm", id: 4 },
                digits: { type: "DigitCount", id: 5 },
                type: { type: "OtpType", id: 6 },
                counter: { type: "int64", id: 7 }
              }
            }
          }
        }
      }
    }
  }
};

export const root = Root.fromJSON(schemaJson);
export const MigrationPayloadType = root.lookupType("googleauth.MigrationPayload");