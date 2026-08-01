const REGISTRATION_PATTERNS = [
  /\b(?:registration|registration\s+number|reg(?:istration)?\s*no\.?|vehicle\s+registration)\s*[:#-]?\s*([A-Z0-9 -]{3,12})\b/i,
];

function normaliseRegistration(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[),.;]+$/g, "")
    .toUpperCase();
}

export function detectRegistration(
  text: string,
): string | undefined {
  for (const pattern of REGISTRATION_PATTERNS) {
    const match = text.match(pattern);

    if (!match?.[1]) {
      continue;
    }

    const registration = normaliseRegistration(match[1]);

    if (registration.length >= 3) {
      return registration;
    }
  }

  return undefined;
}