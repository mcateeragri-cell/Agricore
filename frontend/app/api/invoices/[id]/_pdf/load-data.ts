import { getOfficeAuth } from "../../../office/_shared";
import type {
  InvoiceItemRow,
  InvoicePdfData,
  InvoiceRow,
  JobRow,
  MachineRow,
  PhotoRow,
} from "./types";

type OfficeAuth = Awaited<ReturnType<typeof getOfficeAuth>>;

export class InvoiceNotFoundError extends Error {
  constructor() {
    super("Invoice was not found.");
    this.name = "InvoiceNotFoundError";
  }
}

export async function loadInvoicePdfData({
  invoiceId,
  auth,
  includePhotos,
}: {
  invoiceId: string;
  auth: OfficeAuth;
  includePhotos: boolean;
}): Promise<InvoicePdfData> {
  const invoiceResult = await auth.supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .eq("company_id", auth.companyId)
    .maybeSingle();

  if (invoiceResult.error) throw new Error(invoiceResult.error.message);
  if (!invoiceResult.data) throw new InvoiceNotFoundError();

  const invoice = invoiceResult.data as InvoiceRow;

  const itemResult = await auth.supabase
    .from("invoice_items")
    .select("id, item_type, description, quantity, unit_price, line_total, sort_order")
    .eq("invoice_id", invoiceId)
    .eq("company_id", auth.companyId)
    .order("sort_order", { ascending: true });

  if (itemResult.error) throw new Error(itemResult.error.message);

  let job: JobRow | null = null;
  let machine: MachineRow | null = null;
  let photos: PhotoRow[] = [];

  if (invoice.job_id) {
    const jobResult = await auth.supabase
      .from("jobs")
      .select("id, job_number, fault_reported, diagnosis, work_carried_out, machine_hours, engineer_name, machine_id")
      .eq("id", invoice.job_id)
      .eq("company_id", auth.companyId)
      .maybeSingle();

    if (jobResult.error) throw new Error(jobResult.error.message);
    job = jobResult.data as JobRow | null;

    if (includePhotos) {
      const photoResult = await auth.supabase
        .from("job_photos")
        .select("id, file_path, caption, created_at")
        .eq("job_id", invoice.job_id)
        .eq("company_id", auth.companyId)
        .order("created_at", { ascending: true })
        .limit(6);

      if (photoResult.error) throw new Error(photoResult.error.message);
      photos = (photoResult.data ?? []) as PhotoRow[];
    }

    if (job?.machine_id) {
      const machineResult = await auth.supabase
        .from("machines")
        .select("id, make, model, registration, serial_number")
        .eq("id", job.machine_id)
        .eq("company_id", auth.companyId)
        .maybeSingle();

      if (machineResult.error) throw new Error(machineResult.error.message);
      machine = machineResult.data as MachineRow | null;
    }
  }

  return {
    invoice,
    items: (itemResult.data ?? []) as InvoiceItemRow[],
    job,
    machine,
    photos,
  };
}