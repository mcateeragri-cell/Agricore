import type { ParsedDiagnosticReport } from "./types";

export function calculateConfidence(
  report: ParsedDiagnosticReport,
): number {
  let score = 0;

  if (
    report.manufacturer &&
    report.manufacturer !== "Unknown"
  ) {
    score += 20;
  }

  if (report.machine.model) {
    score += 15;
  }

  if (report.machine.serialNumber) {
    score += 20;
  }

  if (report.machine.registration) {
    score += 5;
  }

  if (
    report.hours !== undefined &&
    Number.isFinite(report.hours)
  ) {
    score += 15;
  }

  if (report.reportDate) {
    score += 5;
  }

  if (report.faultCodes.length > 0) {
    score += 10;
  }

  if (report.controllers.length > 0) {
    score += 5;
  }

  if (report.softwareVersions.length > 0) {
    score += 5;
  }

  return Math.min(score, 100);
}