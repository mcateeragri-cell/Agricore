export interface Job {
  id: string;

  customerId: string;
  machineId?: string;

  title: string;
  description: string;

  status:
    | "Booked"
    | "In Progress"
    | "Waiting Parts"
    | "Completed"
    | "Invoiced";

  priority:
    | "Low"
    | "Normal"
    | "High"
    | "Emergency";

  bookedDate: string;
  dueDate?: string;

  labourHours: number;

  totalCost?: number;
}