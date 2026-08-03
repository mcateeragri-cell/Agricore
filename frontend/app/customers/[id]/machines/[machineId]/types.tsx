export type Customer = {
  id: string;
  contactName: string;
  businessName: string;
};

export type Machine = {
  id: string;
  customerId: string;
  make: string;
  model: string;
  machineType: string;
  year: string;
  registration: string;
  serialNumber: string;
  hours: string;
  usageProfile: "light" | "medium" | "heavy";
  estimatedHoursPerWeek: string;
  notes: string;
};

export type MachineForm = {
  make: string;
  model: string;
  machineType: string;
  year: string;
  registration: string;
  serialNumber: string;
  hours: string;
  usageProfile: "light" | "medium" | "heavy";
  estimatedHoursPerWeek: string;
  notes: string;
};

export type HourReading = {
  id: string;
  hours: number;
  readingDate: string;
  source: string;
  notes: string;
  createdAt: string;
};

export type HourReadingForm = {
  hours: string;
  readingDate: string;
  source: string;
  notes: string;
};

export function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

export const emptyMachineForm: MachineForm = {
  make: "",
  model: "",
  machineType: "Tractor",
  year: "",
  registration: "",
  serialNumber: "",
  hours: "",
  usageProfile: "medium",
  estimatedHoursPerWeek: "25",
  notes: "",
};

export const emptyHourReadingForm: HourReadingForm = {
  hours: "",
  readingDate: getTodayDate(),
  source: "manual",
  notes: "",
};
