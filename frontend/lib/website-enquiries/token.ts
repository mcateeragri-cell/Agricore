import "server-only";

import { createHash, randomBytes } from "node:crypto";

export function hashWebsiteIntegrationToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createWebsiteIntegrationToken() {
  const prefix = randomBytes(4).toString("hex");
  const secret = randomBytes(32).toString("base64url");
  const token = `acwi_${prefix}_${secret}`;

  return {
    token,
    keyPrefix: `acwi_${prefix}`,
    secretHash: hashWebsiteIntegrationToken(token),
  };
}
