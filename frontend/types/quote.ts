export interface Quote {
  id: string;

  customerId: string;

  quoteNumber: string;

  description: string;

  labour: number;
  parts: number;

  total: number;

  status:
    | "Draft"
    | "Sent"
    | "Accepted"
    | "Rejected";

  createdAt: string;
}