const SERIAL_LABEL_PATTERNS = [
  /\b(?:serial(?:\s+number)?|machine\s+serial|product\s+identification\s+number|pin|vin)\s*[:#-]?\s*([A-Z0-9][A-Z0-9._/-]{5,39})\b/i,
];

const GENERIC_SERIAL_PATTERNS = [
  /\b[A-Z]{2,6}[A-Z0-9]{6,24}\b/i,
  /\b[A-Z0-9]{12,24}\b/i,
];

const REJECTED_VALUES = new Set([
  "DIAGNOSTIC",
  "CONTROLLER",
  "SERVICEMASTER",
  "SERVICEADVISOR",
  "NEWHOLLAND",
  "JOHNDEERE",
]);

function cleanSerial(value: string) {
  return value
    .trim()
    .replace(/[),.;]+$/g, "")
    .toUpperCase();
}

function isLikelySerial(value: string) {
  const compact = value.replace(/[^A-Z0-9]/g, "");

  if (compact.length < 6 || compact.length > 40) {
    return false;
  }

  if (REJECTED_VALUES.has(compact)) {
    return false;
  }

  const hasLetter = /[A-Z]/.test(compact);
  const hasNumber = /\d/.test(compact);

  return hasLetter && hasNumber;
}

export function detectSerialNumber(
  text: string,
): string | undefined {
  for (const pattern of SERIAL_LABEL_PATTERNS) {
    const match = text.match(pattern);
    const candidate = match?.[1]
      ? cleanSerial(match[1])
      : "";

    if (candidate && isLikelySerial(candidate)) {
      return candidate;
    }
  }

  for (const pattern of GENERIC_SERIAL_PATTERNS) {
    const matches = text.match(new RegExp(pattern.source, "gi")) ?? [];

    for (const value of matches) {
      const candidate = cleanSerial(value);

      if (isLikelySerial(candidate)) {
        return candidate;
      }
    }
  }

  return undefined;
}