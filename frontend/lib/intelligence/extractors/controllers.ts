import type {
  Controller,
  SoftwareVersion,
} from "../parser-engine/types";

const CONTROLLER_SECTION =
  /(?:controllers detected|controllers|control units)\s*-*\s*([\s\S]*?)(?=\n\s*(?:active faults|stored faults|historic faults|software versions|report generated|end of report)\b|$)/i;

const SOFTWARE_SECTION =
  /(?:software versions?)\s*-*\s*([\s\S]*?)(?=\n\s*(?:active faults|stored faults|historic faults|controllers|report generated|end of report)\b|$)/i;

function uniqueBy<T>(
  values: T[],
  key: (value: T) => string,
) {
  const seen = new Set<string>();

  return values.filter((value) => {
    const currentKey = key(value).toLowerCase();

    if (!currentKey || seen.has(currentKey)) {
      return false;
    }

    seen.add(currentKey);
    return true;
  });
}

export function extractControllers(
  text: string,
): Controller[] {
  const section = text.match(CONTROLLER_SECTION)?.[1];

  if (!section) {
    return [];
  }

  const controllers = section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^[-=]+$/.test(line))
    .map((line) => ({
      name: line.replace(/^[-•]\s*/, ""),
    }));

  return uniqueBy(controllers, (controller) => controller.name);
}

export function extractSoftwareVersions(
  text: string,
): SoftwareVersion[] {
  const section = text.match(SOFTWARE_SECTION)?.[1];

  if (!section) {
    return [];
  }

  const versions = section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^[-=]+$/.test(line))
    .flatMap((line) => {
      const match = line.match(
        /^[-•]?\s*(.+?)\s*[:=-]\s*([A-Za-z0-9._-]+)\s*$/,
      );

      if (!match) {
        return [];
      }

      return [
        {
          controller: match[1].trim(),
          version: match[2].trim(),
        },
      ];
    });

  return uniqueBy(
    versions,
    (version) =>
      `${version.controller}:${version.version}`,
  );
}