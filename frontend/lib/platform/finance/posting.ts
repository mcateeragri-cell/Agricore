import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlatformQueueTask } from "@/lib/platform/core";
import { loadFinanceProfile } from "./profile";
import { reverseFinanceJournal } from "./reversal";

type InvoiceRow = {
  id: string;
  invoice_number: string;
  status: string;
  issue_date: string | null;
  subtotal: number | string | null;
  vat_amount: number | string | null;
  total: number | string | null;
  amount_paid: number | string | null;
};
type InvoiceItem = { item_type: string | null; line_total: number | string | null; description: string | null };
type PostingLine = {
  account_system_key?: string;
  account_id?: string;
  debit?: number;
  credit?: number;
  tax_amount?: number;
  tax_code?: string;
  description?: string;
  metadata?: Record<string, unknown>;
};

type PurchaseInvoiceRow = {
  id: string;
  supplier_id: string;
  invoice_number: string;
  invoice_date: string;
  status: string;
  currency_code: string;
  subtotal: number | string | null;
  tax_amount: number | string | null;
  total: number | string | null;
};

type PurchaseInvoiceLineRow = {
  id: string;
  account_id: string;
  tax_code_id: string | null;
  description: string;
  net_amount: number | string | null;
  tax_amount: number | string | null;
  gross_amount: number | string | null;
};

type PurchaseTaxCodeRow = {
  id: string;
  code: string;
  recoverable: boolean;
};

type SupplierPaymentRow = {
  id: string;
  supplier_id: string;
  bank_account_id: string | null;
  payment_date: string;
  amount: number | string | null;
  currency_code: string;
  reference: string | null;
  status: string;
};

function money(value: unknown) { const n = Number(value ?? 0); return Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : 0; }
function revenueKey(type: string | null) {
  switch (String(type || "").toLowerCase()) {
    case "labour": return "labour_sales";
    case "part": return "parts_sales";
    case "callout": case "travel": return "travel_sales";
    default: return "other_sales";
  }
}
function addCredit(lines: PostingLine[], key: string, amount: number, description: string) {
  const value = money(amount); if (value <= 0) return;
  const existing = lines.find((line) => line.account_system_key === key && !line.debit && !line.tax_code);
  if (existing) existing.credit = money((existing.credit ?? 0) + value);
  else lines.push({ account_system_key: key, credit: value, description });
}

async function invoiceData(admin: SupabaseClient, companyId: string, invoiceId: string) {
  const [invoiceResult, itemsResult] = await Promise.all([
    admin.from("invoices").select("id,invoice_number,status,issue_date,subtotal,vat_amount,total,amount_paid").eq("company_id", companyId).eq("id", invoiceId).maybeSingle(),
    admin.from("invoice_items").select("item_type,line_total,description").eq("company_id", companyId).eq("invoice_id", invoiceId),
  ]);
  if (invoiceResult.error) throw new Error(invoiceResult.error.message);
  if (itemsResult.error) throw new Error(itemsResult.error.message);
  if (!invoiceResult.data) throw new Error(`Invoice ${invoiceId} was not found.`);
  return { invoice: invoiceResult.data as InvoiceRow, items: (itemsResult.data ?? []) as InvoiceItem[] };
}

async function postJournal(admin: SupabaseClient, args: {
  companyId: string; sourceType: string; sourceId: string; sourceAction: string; sourceEventId: string | null;
  journalDate: string; currencyCode: string; reference: string; description: string; lines: PostingLine[]; metadata?: Record<string, unknown>;
}) {
  const { data, error } = await admin.rpc("finance_post_journal", {
    p_company_id: args.companyId,
    p_source_type: args.sourceType,
    p_source_id: args.sourceId,
    p_source_action: args.sourceAction,
    p_source_event_id: args.sourceEventId,
    p_journal_date: args.journalDate,
    p_currency_code: args.currencyCode,
    p_reference: args.reference,
    p_description: args.description,
    p_lines: args.lines,
    p_metadata: args.metadata ?? {},
  });
  if (error) throw new Error(error.message);
  return String(data);
}

async function postAccrualInvoice(admin: SupabaseClient, task: PlatformQueueTask, profile: Awaited<ReturnType<typeof loadFinanceProfile>>) {
  if (!task.entity_id || !profile) throw new Error("Invoice posting is missing source context.");
  const { invoice, items } = await invoiceData(admin, task.company_id, task.entity_id);
  const subtotal = money(invoice.subtotal), tax = money(invoice.vat_amount), total = money(invoice.total);
  if (total <= 0) throw new Error(`Invoice ${invoice.invoice_number} has no positive total to post.`);
  const lines: PostingLine[] = [{ account_system_key: "accounts_receivable", debit: total, description: invoice.invoice_number }];
  let itemNet = 0;
  for (const item of items) { const value = money(item.line_total); itemNet = money(itemNet + value); addCredit(lines, revenueKey(item.item_type), value, item.description || invoice.invoice_number); }
  const fallback = money(subtotal - itemNet); if (fallback > 0.01) addCredit(lines, "other_sales", fallback, invoice.invoice_number);
  if (tax > 0) lines.push({ account_system_key: "tax_payable", credit: tax, tax_amount: tax, tax_code: "STANDARD", description: `${profile.tax_label} on ${invoice.invoice_number}` });
  return postJournal(admin, { companyId: task.company_id, sourceType: "invoice", sourceId: invoice.id, sourceAction: "invoice_issued", sourceEventId: task.source_event_id, journalDate: invoice.issue_date || new Date().toISOString().slice(0,10), currencyCode: profile.base_currency_code, reference: invoice.invoice_number, description: `Customer invoice ${invoice.invoice_number}`, lines, metadata: { accounting_method: "accrual", status: invoice.status } });
}

async function postPayment(admin: SupabaseClient, task: PlatformQueueTask, profile: Awaited<ReturnType<typeof loadFinanceProfile>>) {
  if (!task.entity_id || !profile) throw new Error("Payment posting is missing source context.");
  const { invoice, items } = await invoiceData(admin, task.company_id, task.entity_id);
  const delta = money(task.payload?.payment_delta);
  if (delta <= 0) return null;
  const action = `customer_payment_${money(task.payload?.amount_paid).toFixed(2)}`;
  if (profile.accounting_method === "accrual") {
    return postJournal(admin, { companyId: task.company_id, sourceType: "invoice", sourceId: invoice.id, sourceAction: action, sourceEventId: task.source_event_id, journalDate: new Date().toISOString().slice(0,10), currencyCode: profile.base_currency_code, reference: invoice.invoice_number, description: `Customer payment for ${invoice.invoice_number}`, lines: [
      { account_system_key: "bank", debit: delta, description: invoice.invoice_number },
      { account_system_key: "accounts_receivable", credit: delta, description: invoice.invoice_number },
    ], metadata: { accounting_method: "accrual", payment_delta: delta } });
  }

  // Cash accounting recognises revenue/tax as cash is received. Allocate proportionally for partial receipts.
  const total = money(invoice.total), subtotal = money(invoice.subtotal), tax = money(invoice.vat_amount);
  if (total <= 0) throw new Error(`Invoice ${invoice.invoice_number} has no positive total to allocate.`);
  const netReceipt = money(delta * (subtotal / total));
  const taxReceipt = money(delta - netReceipt);
  const lines: PostingLine[] = [{ account_system_key: "bank", debit: delta, description: invoice.invoice_number }];
  const itemSubtotal = items.reduce((sum, item) => money(sum + money(item.line_total)), 0);
  if (itemSubtotal > 0) {
    let allocated = 0;
    items.forEach((item, index) => {
      const isLast = index === items.length - 1;
      const amount = isLast ? money(netReceipt - allocated) : money(netReceipt * (money(item.line_total) / itemSubtotal));
      allocated = money(allocated + amount); addCredit(lines, revenueKey(item.item_type), amount, item.description || invoice.invoice_number);
    });
  } else addCredit(lines, "other_sales", netReceipt, invoice.invoice_number);
  if (taxReceipt > 0) lines.push({ account_system_key: "tax_payable", credit: taxReceipt, tax_amount: taxReceipt, tax_code: "STANDARD", description: `${profile.tax_label} received on ${invoice.invoice_number}` });
  return postJournal(admin, { companyId: task.company_id, sourceType: "invoice", sourceId: invoice.id, sourceAction: action, sourceEventId: task.source_event_id, journalDate: new Date().toISOString().slice(0,10), currencyCode: profile.base_currency_code, reference: invoice.invoice_number, description: `Cash-basis customer receipt ${invoice.invoice_number}`, lines, metadata: { accounting_method: "cash", payment_delta: delta } });
}


async function postCreditNote(admin: SupabaseClient, task: PlatformQueueTask, profile: Awaited<ReturnType<typeof loadFinanceProfile>>) {
  if (!task.entity_id || !profile) throw new Error("Credit-note posting is missing source context.");
  const { data: note, error: noteError } = await admin.from("finance_credit_notes")
    .select("id,invoice_id,credit_note_number,issue_date,subtotal,tax_amount,total,status")
    .eq("company_id", task.company_id).eq("id", task.entity_id).maybeSingle();
  if (noteError) throw new Error(noteError.message);
  if (!note || note.status !== "issued") return null;
  const { data: lines, error: linesError } = await admin.from("finance_credit_note_lines")
    .select("item_type,description,line_total").eq("company_id", task.company_id).eq("credit_note_id", note.id).order("sort_order");
  if (linesError) throw new Error(linesError.message);
  const total = money(note.total), tax = money(note.tax_amount), subtotal = money(note.subtotal);
  if (total <= 0) throw new Error(`Credit note ${note.credit_note_number} has no positive total to post.`);
  const postingLines: PostingLine[] = [{ account_system_key: "accounts_receivable", credit: total, description: note.credit_note_number }];
  let allocatedNet = 0;
  for (const line of lines ?? []) {
    const value = money(line.line_total); if (value <= 0) continue;
    allocatedNet = money(allocatedNet + value);
    postingLines.push({ account_system_key: revenueKey(line.item_type), debit: value, description: line.description || note.credit_note_number });
  }
  const fallback = money(subtotal - allocatedNet);
  if (fallback > 0.01) postingLines.push({ account_system_key: "other_sales", debit: fallback, description: note.credit_note_number });
  if (tax > 0) postingLines.push({ account_system_key: "tax_payable", debit: tax, tax_amount: tax, tax_code: "STANDARD", description: `${profile.tax_label} credit ${note.credit_note_number}` });
  return postJournal(admin, { companyId: task.company_id, sourceType: "credit_note", sourceId: note.id, sourceAction: "credit_note_issued", sourceEventId: task.source_event_id, journalDate: note.issue_date, currencyCode: profile.base_currency_code, reference: note.credit_note_number, description: `Credit note ${note.credit_note_number}`, lines: postingLines, metadata: { invoice_id: note.invoice_id } });
}


async function purchaseInvoiceData(
  admin: SupabaseClient,
  companyId: string,
  purchaseInvoiceId: string,
) {
  const [invoiceResult, linesResult, taxCodesResult] = await Promise.all([
    admin
      .from("finance_purchase_invoices")
      .select("id,supplier_id,invoice_number,invoice_date,status,currency_code,subtotal,tax_amount,total")
      .eq("company_id", companyId)
      .eq("id", purchaseInvoiceId)
      .maybeSingle(),
    admin
      .from("finance_purchase_invoice_lines")
      .select("id,account_id,tax_code_id,description,net_amount,tax_amount,gross_amount")
      .eq("company_id", companyId)
      .eq("purchase_invoice_id", purchaseInvoiceId)
      .order("sort_order"),
    admin
      .from("finance_tax_codes")
      .select("id,code,recoverable")
      .eq("company_id", companyId),
  ]);

  if (invoiceResult.error) throw new Error(invoiceResult.error.message);
  if (linesResult.error) throw new Error(linesResult.error.message);
  if (taxCodesResult.error) throw new Error(taxCodesResult.error.message);
  if (!invoiceResult.data) throw new Error(`Purchase invoice ${purchaseInvoiceId} was not found.`);

  const taxCodes = new Map<string, PurchaseTaxCodeRow>();
  for (const row of taxCodesResult.data ?? []) {
    const code = row as PurchaseTaxCodeRow;
    taxCodes.set(code.id, code);
  }

  return {
    invoice: invoiceResult.data as PurchaseInvoiceRow,
    lines: (linesResult.data ?? []) as PurchaseInvoiceLineRow[],
    taxCodes,
  };
}

async function postPurchaseInvoice(
  admin: SupabaseClient,
  task: PlatformQueueTask,
  profile: Awaited<ReturnType<typeof loadFinanceProfile>>,
) {
  if (!task.entity_id || !profile) throw new Error("Purchase invoice posting is missing source context.");

  const { invoice, lines, taxCodes } = await purchaseInvoiceData(admin, task.company_id, task.entity_id);
  if (invoice.status !== "posted") return null;

  const subtotal = money(invoice.subtotal);
  const taxTotal = money(invoice.tax_amount);
  const total = money(invoice.total);

  if (total <= 0) throw new Error(`Purchase invoice ${invoice.invoice_number} has no positive total to post.`);
  if (!lines.length) throw new Error(`Purchase invoice ${invoice.invoice_number} has no purchase lines.`);

  const postingLines: PostingLine[] = [];
  let calculatedNet = 0;
  let calculatedTax = 0;

  for (const line of lines) {
    const net = money(line.net_amount);
    const tax = money(line.tax_amount);
    const gross = money(line.gross_amount);

    if (Math.abs(gross - money(net + tax)) > 0.01) {
      throw new Error(`Purchase invoice line ${line.id} gross does not equal net plus tax.`);
    }

    calculatedNet = money(calculatedNet + net);
    calculatedTax = money(calculatedTax + tax);

    const taxCode = line.tax_code_id ? taxCodes.get(line.tax_code_id) : undefined;
    if (line.tax_code_id && !taxCode) {
      throw new Error(`Purchase invoice line ${line.id} references an unavailable tax code.`);
    }

    const recoverableTax = Boolean(taxCode?.recoverable && tax > 0);
    const accountAmount = recoverableTax ? net : gross;

    if (accountAmount > 0) {
      postingLines.push({
        account_id: line.account_id,
        debit: accountAmount,
        description: line.description || invoice.invoice_number,
        metadata: {
          purchase_invoice_line_id: line.id,
          supplier_id: invoice.supplier_id,
          tax_recoverable: recoverableTax,
        },
      });
    }

    if (recoverableTax && taxCode) {
      postingLines.push({
        account_system_key: "tax_recoverable",
        debit: tax,
        tax_amount: tax,
        tax_code: taxCode.code,
        description: `${profile.tax_label} recoverable on ${invoice.invoice_number}`,
        metadata: {
          purchase_invoice_line_id: line.id,
          supplier_id: invoice.supplier_id,
        },
      });
    }
  }

  if (Math.abs(calculatedNet - subtotal) > 0.02) {
    throw new Error(`Purchase invoice ${invoice.invoice_number} line net total does not match the invoice subtotal.`);
  }
  if (Math.abs(calculatedTax - taxTotal) > 0.02) {
    throw new Error(`Purchase invoice ${invoice.invoice_number} line tax total does not match the invoice tax total.`);
  }

  postingLines.push({
    account_system_key: "accounts_payable",
    credit: total,
    description: invoice.invoice_number,
    metadata: { supplier_id: invoice.supplier_id },
  });

  return postJournal(admin, {
    companyId: task.company_id,
    sourceType: "purchase_invoice",
    sourceId: invoice.id,
    sourceAction: "purchase_invoice_posted",
    sourceEventId: task.source_event_id,
    journalDate: invoice.invoice_date,
    currencyCode: invoice.currency_code || profile.base_currency_code,
    reference: invoice.invoice_number,
    description: `Supplier invoice ${invoice.invoice_number}`,
    lines: postingLines,
    metadata: {
      supplier_id: invoice.supplier_id,
      accounting_method: profile.accounting_method,
    },
  });
}

async function supplierPaymentData(
  admin: SupabaseClient,
  companyId: string,
  paymentId: string,
) {
  const { data, error } = await admin
    .from("finance_supplier_payments")
    .select("id,supplier_id,bank_account_id,payment_date,amount,currency_code,reference,status")
    .eq("company_id", companyId)
    .eq("id", paymentId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Supplier payment ${paymentId} was not found.`);
  return data as SupplierPaymentRow;
}

async function supplierPaymentBankLine(
  admin: SupabaseClient,
  companyId: string,
  payment: SupplierPaymentRow,
  amount: number,
): Promise<PostingLine> {
  if (!payment.bank_account_id) {
    return {
      account_system_key: "bank",
      credit: amount,
      description: payment.reference || "Supplier payment",
    };
  }

  const { data, error } = await admin
    .from("finance_bank_accounts")
    .select("finance_account_id")
    .eq("company_id", companyId)
    .eq("id", payment.bank_account_id)
    .eq("active", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("The selected bank account is invalid or inactive.");

  return {
    account_id: String(data.finance_account_id),
    credit: amount,
    description: payment.reference || "Supplier payment",
  };
}

async function postSupplierPayment(
  admin: SupabaseClient,
  task: PlatformQueueTask,
  profile: Awaited<ReturnType<typeof loadFinanceProfile>>,
) {
  if (!task.entity_id || !profile) throw new Error("Supplier payment posting is missing source context.");

  const payment = await supplierPaymentData(admin, task.company_id, task.entity_id);
  if (payment.status !== "posted") return null;

  const amount = money(payment.amount);
  if (amount <= 0) throw new Error("Supplier payment must have a positive amount.");

  const bankLine = await supplierPaymentBankLine(admin, task.company_id, payment, amount);

  if (profile.accounting_method === "cash") {
    /*
     * Do not create a false Accounts Payable debit when the purchase invoice
     * itself was intentionally not recognised under cash accounting.
     * Cash-basis purchase recognition needs allocation-aware expense/tax
     * posting, which is a separate posting path.
     */
    throw new Error(
      "Cash-basis supplier-payment posting requires allocation-aware purchase recognition and cannot use the accrual Accounts Payable posting path.",
    );
  }

  return postJournal(admin, {
    companyId: task.company_id,
    sourceType: "supplier_payment",
    sourceId: payment.id,
    sourceAction: "supplier_payment_posted",
    sourceEventId: task.source_event_id,
    journalDate: payment.payment_date,
    currencyCode: payment.currency_code || profile.base_currency_code,
    reference: payment.reference || payment.id,
    description: payment.reference ? `Supplier payment ${payment.reference}` : "Supplier payment",
    lines: [
      {
        account_system_key: "accounts_payable",
        debit: amount,
        description: payment.reference || "Supplier payment",
        metadata: { supplier_id: payment.supplier_id },
      },
      bankLine,
    ],
    metadata: {
      supplier_id: payment.supplier_id,
      bank_account_id: payment.bank_account_id,
    },
  });
}


export async function processFinancePostingTask(admin: SupabaseClient, task: PlatformQueueTask) {
  if (task.task_type !== "finance_posting") return null;
  const profile = await loadFinanceProfile(admin, task.company_id);
  if (!profile) throw new Error("Atlas Finance profile is not configured.");
  const eventId = task.source_event_id;
  if (!eventId) throw new Error("Finance posting task has no source event.");
  const { data: event, error } = await admin.from("atlas_events").select("event_type").eq("id", eventId).eq("company_id", task.company_id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!event) throw new Error("Finance source event was not found.");
  switch (event.event_type) {
    case "finance.invoice.issued":
      if (profile.accounting_method === "cash") return null;
      return postAccrualInvoice(admin, task, profile);
    case "finance.invoice.payment_recorded": return postPayment(admin, task, profile);
    case "finance.purchase_invoice.posted":
      if (profile.accounting_method === "cash") return null;
      return postPurchaseInvoice(admin, task, profile);
    case "finance.supplier_payment.posted":
      return postSupplierPayment(admin, task, profile);
    case "finance.credit_note.issued": return postCreditNote(admin, task, profile);
    case "finance.invoice.voided": {
      const amountPaid = money(task.payload?.amount_paid);
      if (amountPaid > 0) throw new Error("A paid/part-paid invoice cannot be automatically voided. Record the refund/credit workflow before reversing the receivable.");
      if (profile.accounting_method === "cash") return null;
      const { data: original, error: originalError } = await admin
        .from("finance_journals")
        .select("id")
        .eq("company_id", task.company_id)
        .eq("source_type", "invoice")
        .eq("source_id", task.entity_id)
        .eq("source_action", "invoice_issued")
        .maybeSingle();
      if (originalError) throw new Error(originalError.message);
      if (!original) return null;
      return reverseFinanceJournal(admin, {
        companyId: task.company_id,
        journalId: String(original.id),
        reversalDate: new Date().toISOString().slice(0, 10),
        reason: "Invoice voided before payment",
        sourceEventId: task.source_event_id,
      });
    }
    default: return null;
  }
}
