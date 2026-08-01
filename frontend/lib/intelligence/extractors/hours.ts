const HOURS_PATTERNS = [
  /\b(?:engine\s+hours|machine\s+hours|operating\s+hours|total\s+hours|hour\s+meter|hours)\s*[:#-]?\s*([\d,.]+)\s*(?:h|hrs|hours)?\b/i,
  /\b([\d,.]+)\s*(?:engine\s+hours|machine\s+hours|operating\s+hours|hrs)\b/i,
];

function parseHours(value: string) {
  const normalised = value.replace(/,/g, "").trim();
  const hours = Number(normalised);

  if (
    !Number.isFinite(hours) ||
    hours < 0 ||
    hours > 500_000
  ) {
    return undefined;
  }

  return Math.round(hours * 100) / 100;
}

export function detectHours(
  text: string,
): number | undefined {
  for (const pattern of HOURS_PATTERNS) {
    const match = text.match(pattern);

    if (!match?.[1]) {
      continue;
    }

    const hours = parseHours(match[1]);

    if (hours !== undefined) {
      return hours;
    }
  }

  return undefined;
}