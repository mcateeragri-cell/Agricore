import { calculateConfidence } from "./confidence";
import type { DiagnosticParser } from "./parser";
import type { ParsedDiagnosticReport } from "./types";

import {
  extractControllers,
  extractSoftwareVersions,
} from "../extractors/controllers";
import { extractFaultCodes } from "../extractors/fault-codes";
import { detectHours } from "../extractors/hours";
import { detectManufacturer } from "../extractors/manufacturer";
import { detectModel } from "../extractors/model";
import { detectRegistration } from "../extractors/registration";
import { detectReportDate } from "../extractors/report-date";
import { detectSerialNumber } from "../extractors/serial";

export const genericParser: DiagnosticParser = {
  name: "Generic Parser",

  async canParse(
    filename: string,
    text: string,
    mimeType?: string,
  ) {
    return text.trim().length > 0;
  },

  async parse(
    filename: string,
    text: string,
  ): Promise<ParsedDiagnosticReport> {
    const manufacturer = detectManufacturer(
      `${filename}\n${text}`,
    );

    const faultCodes = extractFaultCodes(text);
    const controllers = extractControllers(text);
    const softwareVersions =
      extractSoftwareVersions(text);

    const report: ParsedDiagnosticReport = {
      manufacturer,

      confidence: 0,

      machine: {
        make:
          manufacturer === "Unknown"
            ? undefined
            : manufacturer,
        model: detectModel(text),
        serialNumber: detectSerialNumber(text),
        registration: detectRegistration(text),
      },

      hours: detectHours(text),

      reportDate: detectReportDate(text),

      faultCodes,

      controllers,

      softwareVersions,

      warnings: [
        "Generic extraction only. Review all detected values before importing them into a machine record.",
      ],

      rawText: text,
    };

    report.confidence = calculateConfidence(report);

    return report;
  },
};