const LABELLED_DATE_PATTERNS = [
  /\b(?:report\s+generated|report\s+date|diagnostic\s+date|date)\s*[:#-]?\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\b/i,
  /\b(?:report\s+generated|report\s+date|diagnostic\s+date|date)\s*[:#-]?\s*(\d{4}-\d{2}-\d{2})\b/i,
  /\b(?:report\s+generated|report\s+date|diagnostic\s+date|date)\s*[:#-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})\b/i,
];

function parseDate(value: string) {
  const ukDateMatch = value.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/,
  );

  if (ukDateMatch) {
    const [, day, month, year] = ukDateMatch;
    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
    );

    return Number.isNaN(parsed.getTime())
      ? undefined
      : parsed;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? undefined
    : parsed;
}

export function detectReportDate(
  text: string,
): Date | undefined {
  for (const pattern of LABELLED_DATE_PATTERNS) {
    const match = text.match(pattern);

    if (!match?.[1]) {
      continue;
    }

    const date = parseDate(match[1]);

    if (date) {
      return date;
    }
  }

  return undefined;
}