export interface FaultCode {
  code: string;
  description?: string;
  ecu?: string;
  severity?: "low" | "medium" | "high" | "critical";
  status?: "active" | "inactive" | "historic";
}

export interface Controller {
  name: string;
  partNumber?: string;
  softwareVersion?: string;
  hardwareVersion?: string;
}

export interface SoftwareVersion {
  controller: string;
  version: string;
}

export interface MachineIdentity {
  make?: string;
  model?: string;
  serialNumber?: string;
  registration?: string;
}

export interface ParsedDiagnosticReport {
  manufacturer: string;

  confidence: number;

  machine: MachineIdentity;

  hours?: number;

  reportDate?: Date;

  faultCodes: FaultCode[];

  controllers: Controller[];

  softwareVersions: SoftwareVersion[];

  warnings: string[];

  rawText: string;
}