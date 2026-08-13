import "server-only";

export type ResendDomainRecord = {
  record?: string;
  name: string;
  type: string;
  value: string;
  ttl?: string | number;
  status?: string;
  priority?: number;
};

export type ResendDomain = {
  id: string;
  name: string;
  status: string;
  region?: string;
  records?: ResendDomainRecord[];
};

function apiKey() {
  const value = process.env.RESEND_API_KEY?.trim();
  if (!value) throw new Error("RESEND_API_KEY is not configured.");
  return value;
}

async function resendRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://api.resend.com${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  let body: any = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const detail =
      body?.message ||
      body?.error?.message ||
      body?.name ||
      `Resend API request failed (${response.status}).`;

    if (response.status === 403) {
      throw new Error(
        `${detail} The AgriCore RESEND_API_KEY must have Full Access to manage customer sending domains.`,
      );
    }

    throw new Error(detail);
  }

  return body as T;
}

export function createResendDomain(name: string) {
  return resendRequest<ResendDomain>("/domains", {
    method: "POST",
    body: JSON.stringify({
      name,
      capabilities: {
        sending: "enabled",
        receiving: "disabled",
      },
    }),
  });
}

export function getResendDomain(id: string) {
  return resendRequest<ResendDomain>(`/domains/${encodeURIComponent(id)}`, {
    method: "GET",
  });
}

export function verifyResendDomain(id: string) {
  return resendRequest<{ id: string; object?: string }>(
    `/domains/${encodeURIComponent(id)}/verify`,
    { method: "POST" },
  );
}

export function cleanDomain(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

export function isValidCompanyDomain(value: string) {
  const domain = cleanDomain(value);
  if (
    !domain ||
    domain.includes("@") ||
    domain.includes(" ") ||
    !domain.includes(".")
  ) {
    return false;
  }

  if (
    domain === "gmail.com" ||
    domain === "outlook.com" ||
    domain === "hotmail.com" ||
    domain === "icloud.com" ||
    domain === "yahoo.com"
  ) {
    return false;
  }

  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(
    domain,
  );
}
