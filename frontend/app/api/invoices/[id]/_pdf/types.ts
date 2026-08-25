export type InvoiceRow = {
  id: string;
  job_id: string | null;
  commercial_type: "service" | "machinery_sale" | "parts" | "general" | null;
  invoice_number: string;
  status: string;

  subtotal: number | string | null;
  vat_rate: number | string | null;
  vat_amount: number | string | null;
  total: number | string | null;
  amount_paid: number | string | null;

  payment_terms: string | null;
  notes: string | null;

  payment_url: string | null;
  payment_provider: string | null;
  revolut_order_id: string | null;
  revolut_order_state: string | null;
  paid_at: string | null;
  payment_method: string | null;

  issue_date: string | null;
  due_date: string | null;

  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  billing_address: string | null;
};

export type InvoiceItemRow = {
  id: string;
  item_type: string;
  description: string;
  quantity: number | string | null;
  unit_price: number | string | null;
  line_total: number | string | null;
  sort_order: number | null;
};

export type JobRow = {
  id: string;
  job_number: string;
  fault_reported: string | null;
  diagnosis: string | null;
  work_carried_out: string | null;
  machine_hours: number | string | null;
  engineer_name: string | null;
  machine_id: string | null;
};

export type MachineRow = {
  id: string;
  make: string | null;
  model: string | null;
  registration: string | null;
  serial_number: string | null;
};

export type PhotoRow = {
  id: string;
  file_path: string;
  caption: string | null;
  created_at: string;
};

export type InvoicePdfData = {
  invoice: InvoiceRow;
  items: InvoiceItemRow[];
  job: JobRow | null;
  machine: MachineRow | null;
  photos: PhotoRow[];
};