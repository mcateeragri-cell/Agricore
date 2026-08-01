import type { FaultCode } from "../parser-engine/types";

const FAULT_CODE_PATTERN =
  /\b([A-Z]{1,4}\d{2,6}(?:[-./]\d{1,4})?|[A-Z]{1,3}\d{4,7}|SPN\s*\d+(?:\s*FMI\s*\d+)?)\b/gi;

const SECTION_END_PATTERN =
  /^(?:software versions?|controllers?|control units?|calibrations?|report generated|end of report)\b/i;

const STATUS_PATTERN =
  /\b(active|inactive|historic|stored|intermittent|cleared)\b/i;

const SEVERITY_PATTERN =
  /\b(critical|high|medium|low|warning|information)\b/i;

function normaliseCode(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function cleanDescription(value: string) {
  return value
    .trim()
    .replace(/^[-:–—\s]+/, "")
    .replace(/\s+/g, " ");
}

function mapSeverity(
  value: string | undefined,
): FaultCode["severity"] {
  switch (value?.toLowerCase()) {
    case "critical":
      return "critical";
    case "high":
      return "high";
    case "medium":
    case "warning":
      return "medium";
    case "low":
    case "information":
      return "low";
    default:
      return undefined;
  }
}

function mapStatus(
  value: string | undefined,
): FaultCode["status"] {
  switch (value?.toLowerCase()) {
    case "active":
      return "active";
    case "inactive":
      return "inactive";
    case "historic":
    case "stored":
    case "intermittent":
    case "cleared":
      return "historic";
    default:
      return undefined;
  }
}

function looksLikeDescription(value: string) {
  if (!value) {
    return false;
  }

  if (SECTION_END_PATTERN.test(value)) {
    return false;
  }

  if (FAULT_CODE_PATTERN.test(value)) {
    FAULT_CODE_PATTERN.lastIndex = 0;
    return false;
  }

  FAULT_CODE_PATTERN.lastIndex = 0;

  return /[A-Za-z]{3,}/.test(value);
}

export function extractFaultCodes(
  text: string,
): FaultCode[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim());

  const faults: FaultCode[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (!line) {
      continue;
    }

    const matches = Array.from(
      line.matchAll(FAULT_CODE_PATTERN),
    );

    for (const match of matches) {
      const code = normaliseCode(match[1]);

      if (!code || seen.has(code)) {
        continue;
      }

      const trailingText = cleanDescription(
        line.slice((match.index ?? 0) + match[0].length),
      );

      let description = trailingText;

      if (!looksLikeDescription(description)) {
        const nextLine = lines[index + 1] ?? "";

        if (looksLikeDescription(nextLine)) {
          description = cleanDescription(nextLine);
        } else {
          description = "";
        }
      }

      const surroundingText = [
        line,
        lines[index - 1] ?? "",
        lines[index + 1] ?? "",
      ].join(" ");

      const statusMatch =
        surroundingText.match(STATUS_PATTERN);
      const severityMatch =
        surroundingText.match(SEVERITY_PATTERN);

      faults.push({
        code,
        description: description || undefined,
        status: mapStatus(statusMatch?.[1]),
        severity: mapSeverity(severityMatch?.[1]),
      });

      seen.add(code);
    }
  }

  return faults;
}