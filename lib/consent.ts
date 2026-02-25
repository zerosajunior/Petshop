import { createHash, randomInt, timingSafeEqual } from "node:crypto";

export const CONSENT_CODE_TTL_MINUTES = 15;

export function generateConsentCode() {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  return code;
}

export function hashConsentCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export function sameConsentCode(rawCode: string, storedHash: string) {
  const received = Buffer.from(hashConsentCode(rawCode), "utf8");
  const stored = Buffer.from(storedHash, "utf8");

  if (received.length !== stored.length) {
    return false;
  }

  return timingSafeEqual(received, stored);
}
