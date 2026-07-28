import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
const FIVE_MINUTES_MS = 5 * 60 * 1000;
function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function verifyRevolutWebhookSignature(input: { rawBody: string; timestamp: string | null; signatureHeader: string | null; secret: string }): boolean {
  const { rawBody, timestamp, signatureHeader, secret } = input;
  if (!timestamp || !signatureHeader || !secret) return false;
  const timestampMs = Number(timestamp);
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > FIVE_MINUTES_MS) return false;
  const expected = `v1=${createHmac("sha256", secret).update(`v1.${timestamp}.${rawBody}`, "utf8").digest("hex")}`;
  return signatureHeader.split(",").map(v => v.trim()).some(signature => safeEqual(signature, expected));
}
