import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LEN = 64;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, originalHash] = stored.split(":");
  if (!salt || !originalHash) {
    return false;
  }

  const hashBuffer = Buffer.from(originalHash, "hex");
  const inputBuffer = scryptSync(password, salt, hashBuffer.length);
  return timingSafeEqual(hashBuffer, inputBuffer);
}
