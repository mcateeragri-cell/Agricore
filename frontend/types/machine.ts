export interface Machine {
  id: string;

  customerId: string;

  make: string;
  model: string;
  year?: number;

  serialNumber?: string;
  registration?: string;

  hours?: number;

  engineModel?: string;

  notes?: string;

  nextServiceHours?: number;
  nextServiceDate?: string;
}