import "server-only";
import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pin, salt, 64).toString("hex")}`;
}
export function verifyPin(pin: string, encoded: string): boolean {
  const [salt, hex] = encoded.split(":");
  if (!salt || !/^[0-9a-f]{32}$/i.test(salt) || !hex || !/^[0-9a-f]{128}$/i.test(hex)) return false;
  const expected = Buffer.from(hex, "hex");
  return timingSafeEqual(expected, scryptSync(pin, salt, expected.length));
}
export function ipDigest(ip: string): string {
  const secret = process.env.PASSPORT_RATE_LIMIT_SECRET;
  if (!secret) throw new Error("Missing rate-limit secret");
  return createHash("sha256").update(`${secret}:${ip}`).digest("hex");
}
