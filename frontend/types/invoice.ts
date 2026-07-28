export type InvoiceStatus =
  | "draft"
  | "approved"
  | "sent"
  | "part_paid"
  | "paid"
  | "overdue"
  | "void";

export type InvoiceItemType =
  | "labour"
  | "part"
  | "callout"
  | "travel"
  | "other";

export interface InvoiceItem {
  id: string;
  invoiceId: string;

  itemType: InvoiceItemType;

  sourceId: string | null;

  description: string;

  quantity: number;
  unitPrice: number;
  lineTotal: number;

  sortOrder: number;
}

export interface Invoice {
  id: string;

  jobId: string | null;
  customerId: string | null;

  invoiceNumber: string;

  status: InvoiceStatus;

  issueDate: string | null;
  dueDate: string | null;

  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  amountPaid: number;

  customerName: string;
  customerEmail: string;
  customerPhone: string;
  billingAddress: string;

  notes: string;
  paymentTerms: string;

  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  stripePaymentUrl: string | null;

  sentAt: string | null;
  paidAt: string | null;

  createdAt: string;
  updatedAt: string;

  items?: InvoiceItem[];
}