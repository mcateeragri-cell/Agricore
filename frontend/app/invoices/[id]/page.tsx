"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams } from "next/navigation";
import RevolutPayButton from "@/Components/invoices/revolut-pay-button";




type InvoiceStatus =
  | "draft"
  | "approved"
  | "sent"
  | "part_paid"
  | "paid"
  | "overdue"
  | "void";

type InvoiceItemType =
  | "labour"
  | "part"
  | "callout"
  | "travel"
  | "other";

type PageTab =
  | "invoice"
  | "service_report"
  | "activity";

type SendDocumentType =
  | "invoice_only"
  | "service_report_and_invoice";

type InvoiceRow = {
  id: string;
  invoice_number: string;
  job_id: string | null;
  customer_id: string | null;

  status: InvoiceStatus;

  issue_date: string | null;
  due_date: string | null;

  subtotal: number | string | null;
  vat_rate: number | string | null;
  vat_amount: number | string | null;
  total: number | string | null;
  amount_paid: number | string | null;

  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  billing_address: string | null;

  notes: string | null;
  payment_terms: string | null;

  payment_url: string | null;
  payment_provider: string | null;
  revolut_order_id: string | null;
  revolut_order_state: string | null;

  sent_at: string | null;
  paid_at: string | null;
};

type InvoiceItemRow = {
  id: string;
  invoice_id: string;
  item_type: InvoiceItemType;
  source_id: string | null;
  description: string;
  quantity: number | string;
  unit_price: number | string;
  line_total: number | string;
  sort_order: number;
};

type EditableInvoiceItem = {
  id: string;
  itemType: InvoiceItemType;
  sourceId: string | null;
  description: string;
  quantity: string;
  unitPrice: string;
  sortOrder: number;
};

type JobRow = {
  id: string;
  job_number: string;
  fault_reported: string | null;
  diagnosis: string | null;
  work_carried_out: string | null;
  machine_hours: number | null;
};

type MachineRow = {
  id: string;
  make: string | null;
  model: string | null;
  registration: string | null;
  serial_number: string | null;
};

type InvoiceDetailResponse = {
  invoice?: InvoiceRow;
  items?: InvoiceItemRow[];
  job?: JobRow | null;
  machine?: MachineRow | null;
  error?: string;
};

type SaveResponse = {
  success?: boolean;
  invoice?: InvoiceRow;
  items?: InvoiceItemRow[];
  error?: string;
};

type SendResponse = {
  success?: boolean;
  error?: string;
};

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();

  const invoiceId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [activeTab, setActiveTab] =
    useState<PageTab>("invoice");

  const [invoice, setInvoice] =
    useState<InvoiceRow | null>(null);

  const [items, setItems] = useState<
    EditableInvoiceItem[]
  >([]);

  const [job, setJob] =
    useState<JobRow | null>(null);

  const [machine, setMachine] =
    useState<MachineRow | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState("");

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [customerName, setCustomerName] =
    useState("");

  const [customerEmail, setCustomerEmail] =
    useState("");

  const [customerPhone, setCustomerPhone] =
    useState("");

  const [billingAddress, setBillingAddress] =
    useState("");

  const [issueDate, setIssueDate] =
    useState("");

  const [dueDate, setDueDate] =
    useState("");

  const [vatRate, setVatRate] =
    useState("20");

  const [notes, setNotes] =
    useState("");

  const [paymentTerms, setPaymentTerms] =
    useState("Payment due within 7 days");

  const [customerEditing, setCustomerEditing] =
    useState(false);

  const [sendModalOpen, setSendModalOpen] =
    useState(false);

  const [sendDocumentType, setSendDocumentType] =
    useState<SendDocumentType>(
      "service_report_and_invoice",
    );

  const [sendRecipient, setSendRecipient] =
    useState("");

  const [sendSubject, setSendSubject] =
    useState("");

  const [sendMessage, setSendMessage] =
    useState("");

  const [sendCopy, setSendCopy] =
    useState(false);

  const [
    includePaymentLinkInEmail,
    setIncludePaymentLinkInEmail,
  ] = useState(true);

  const loadInvoice = useCallback(async () => {
    if (!invoiceId) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/invoices/${invoiceId}`,
        {
          cache: "no-store",
        },
      );

      const body =
        (await response.json()) as InvoiceDetailResponse;

      if (!response.ok || !body.invoice) {
        throw new Error(
          body.error ??
            "Unable to load invoice.",
        );
      }

      const loadedInvoice = body.invoice;

      setInvoice(loadedInvoice);
      setJob(body.job ?? null);
      setMachine(body.machine ?? null);

      setCustomerName(
        loadedInvoice.customer_name ?? "",
      );

      setCustomerEmail(
        loadedInvoice.customer_email ?? "",
      );

      setCustomerPhone(
        loadedInvoice.customer_phone ?? "",
      );

      setBillingAddress(
        loadedInvoice.billing_address ?? "",
      );

      setIssueDate(
        loadedInvoice.issue_date ?? "",
      );

      setDueDate(
        loadedInvoice.due_date ?? "",
      );

      setVatRate(
        String(
          asNumber(loadedInvoice.vat_rate),
        ),
      );

      setNotes(
        loadedInvoice.notes ?? "",
      );

      setPaymentTerms(
        loadedInvoice.payment_terms ??
          "Payment due within 7 days",
      );

      setSendRecipient(
        loadedInvoice.customer_email ?? "",
      );

      setSendSubject(
        `Service Report & Invoice ${loadedInvoice.invoice_number}`,
      );

      setSendMessage(
        buildDefaultEmailMessage(
          loadedInvoice.customer_name,
          loadedInvoice.invoice_number,
        ),
      );

      setItems(
        (body.items ?? []).map(
          (item, index) => ({
            id: item.id,
            itemType: item.item_type,
            sourceId: item.source_id,
            description: item.description,
            quantity: String(
              asNumber(item.quantity),
            ),
            unitPrice: String(
              asNumber(item.unit_price),
            ),
            sortOrder:
              typeof item.sort_order ===
              "number"
                ? item.sort_order
                : index,
          }),
        ),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load invoice.",
      );
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    void loadInvoice();
  }, [loadInvoice]);

  const calculatedTotals = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) =>
        sum +
        asNumber(item.quantity) *
          asNumber(item.unitPrice),
      0,
    );

    const vat =
      subtotal *
      (asNumber(vatRate) / 100);

    return {
      subtotal: roundMoney(subtotal),
      vat: roundMoney(vat),
      total: roundMoney(subtotal + vat),
    };
  }, [items, vatRate]);

  const outstanding = Math.max(
    0,
    calculatedTotals.total -
      asNumber(invoice?.amount_paid),
  );

  const isLocked =
    invoice?.status === "paid" ||
    invoice?.status === "void";

  const daysUntilDue =
    calculateDaysUntilDue(dueDate);

  const activityItems = useMemo(() => {
    if (!invoice) {
      return [];
    }

    const activity: {
      title: string;
      detail: string;
      date: string | null;
    }[] = [
      {
        title: "Invoice created",
        detail:
          `Invoice ${invoice.invoice_number} was created from the completed job.`,
        date: invoice.issue_date,
      },
    ];

    if (
      invoice.status === "approved" ||
      invoice.status === "sent" ||
      invoice.status === "part_paid" ||
      invoice.status === "paid"
    ) {
      activity.push({
        title: "Invoice approved",
        detail:
          "The invoice was approved for customer issue.",
        date: invoice.issue_date,
      });
    }

    if (invoice.payment_url) {
      activity.push({
        title: "Payment link generated",
        detail:
          "A Revolut payment page is available for this invoice.",
        date: invoice.issue_date,
      });
    }

    if (invoice.sent_at) {
      activity.push({
        title: "Invoice emailed",
        detail:
          `Sent to ${invoice.customer_email || "the customer"}.`,
        date: invoice.sent_at,
      });
    }

    if (invoice.paid_at) {
      activity.push({
        title: "Payment received",
        detail:
          `Payment recorded for ${formatMoney(
            asNumber(invoice.total),
          )}.`,
        date: invoice.paid_at,
      });
    }

    return activity;
  }, [invoice]);

  function updateItem(
    index: number,
    field: keyof EditableInvoiceItem,
    value: string,
  ) {
    setItems((currentItems) =>
      currentItems.map(
        (item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                [field]: value,
              }
            : item,
      ),
    );
  }

  function addItem(
    type: InvoiceItemType = "other",
  ) {
    setItems((currentItems) => [
      ...currentItems,
      {
        id: crypto.randomUUID(),
        itemType: type,
        sourceId: null,
        description:
          type === "callout"
            ? "Call-out charge"
            : type === "travel"
              ? "Travel"
              : type === "labour"
                ? "Engineering labour"
                : type === "part"
                  ? "Part supplied"
                  : "Additional charge",
        quantity: "1",
        unitPrice: "0",
        sortOrder: currentItems.length,
      },
    ]);
  }

  function removeItem(index: number) {
    setItems((currentItems) =>
      currentItems.filter(
        (_, itemIndex) =>
          itemIndex !== index,
      ),
    );
  }

  async function saveInvoice(
    nextStatus?: InvoiceStatus,
  ) {
    if (!invoiceId || !invoice) {
      return false;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/invoices/${invoiceId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            status: nextStatus,
            customerName,
            customerEmail,
            customerPhone,
            billingAddress,
            issueDate,
            dueDate,
            vatRate: asNumber(vatRate),
            notes,
            paymentTerms,
            items: items.map(
              (item, index) => ({
                itemType: item.itemType,
                sourceId: item.sourceId,
                description:
                  item.description.trim(),
                quantity: asNumber(
                  item.quantity,
                ),
                unitPrice: asNumber(
                  item.unitPrice,
                ),
                sortOrder: index,
              }),
            ),
          }),
        },
      );

      const body =
        (await response.json()) as SaveResponse;

      if (!response.ok || !body.invoice) {
        throw new Error(
          body.error ??
            "Unable to save invoice.",
        );
      }

      setInvoice(body.invoice);

      setItems(
        (body.items ?? []).map(
          (item, index) => ({
            id: item.id,
            itemType: item.item_type,
            sourceId: item.source_id,
            description: item.description,
            quantity: String(
              asNumber(item.quantity),
            ),
            unitPrice: String(
              asNumber(item.unit_price),
            ),
            sortOrder:
              typeof item.sort_order ===
              "number"
                ? item.sort_order
                : index,
          }),
        ),
      );

      setMessage(
        nextStatus === "approved"
          ? "Invoice approved."
          : nextStatus === "paid"
            ? "Invoice marked as paid."
            : "Invoice saved.",
      );

      return true;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save invoice.",
      );

      return false;
    } finally {
      setSaving(false);
    }
  }

  async function createPaymentLink() {
  if (!invoiceId) {
    return;
  }

  setActionLoading("payment");
  setError("");
  setMessage("");

  try {
    const saved = await saveInvoice();

    if (!saved) {
      return;
    }

    const response = await fetch(
      "/api/payments/revolut/create",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invoiceId,
          forceNew: true,
        }),
      },
    );

    const body = await response.json();

    if (
      !response.ok ||
      !body.success ||
      !body.paymentUrl
    ) {
      throw new Error(
        body.error ??
          "Unable to create payment link.",
      );
    }

    setMessage("New payment link created.");

    window.open(
      body.paymentUrl,
      "_blank",
      "noopener,noreferrer",
    );

    await loadInvoice();
  } catch (caughtError) {
    setError(
      caughtError instanceof Error
        ? caughtError.message
        : "Unable to create payment link.",
    );
  } finally {
    setActionLoading("");
  }
}

  function openSendModal() {
    if (!invoice) {
      return;
    }

    setSendRecipient(
      customerEmail.trim() ||
        invoice.customer_email ||
        "",
    );

    setSendSubject(
      sendDocumentType ===
        "invoice_only"
        ? `Invoice ${invoice.invoice_number}`
        : `Service Report & Invoice ${invoice.invoice_number}`,
    );

    setSendMessage(
      buildDefaultEmailMessage(
        customerName ||
          invoice.customer_name,
        invoice.invoice_number,
      ),
    );

    setSendModalOpen(true);
  }

  function changeSendDocumentType(
    nextType: SendDocumentType,
  ) {
    setSendDocumentType(nextType);

    if (!invoice) {
      return;
    }

    setSendSubject(
      nextType === "invoice_only"
        ? `Invoice ${invoice.invoice_number}`
        : `Service Report & Invoice ${invoice.invoice_number}`,
    );
  }

  async function sendCustomerDocuments() {
    if (!invoiceId) {
      return;
    }

    if (!sendRecipient.trim()) {
      setError(
        "Enter a recipient email address before sending.",
      );

      return;
    }

    setActionLoading("send");
    setError("");
    setMessage("");

    try {
      const saved =
        await saveInvoice();

      if (!saved) {
        return;
      }

      const response = await fetch(
        `/api/invoices/${invoiceId}/send`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            documentType:
              sendDocumentType,
            recipient:
              sendRecipient.trim(),
            subject:
              sendSubject.trim(),
            message:
              sendMessage.trim(),
            sendCopy,
            includePaymentLink:
              includePaymentLinkInEmail,
          }),
        },
      );

      const body =
        (await response.json()) as SendResponse;

      if (
        !response.ok ||
        !body.success
      ) {
        throw new Error(
          body.error ??
            "Unable to send customer documents.",
        );
      }

      setMessage(
        sendDocumentType ===
          "invoice_only"
          ? `Invoice sent to ${sendRecipient}.`
          : `Service report and invoice sent to ${sendRecipient}.`,
      );

      setSendModalOpen(false);

      await loadInvoice();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to send customer documents.",
      );
    } finally {
      setActionLoading("");
    }
  }

  function previewInvoice() {
    if (!invoiceId) {
      return;
    }

    window.open(
      `/api/invoices/${invoiceId}/invoice-pdf`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function previewCombinedReport() {
    if (!invoiceId) {
      return;
    }

    window.open(
      `/api/invoices/${invoiceId}/pdf`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function copyPaymentLink() {
    if (!invoice?.payment_url) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        invoice.payment_url,
      );

      setMessage(
        "Payment link copied.",
      );
    } catch {
      setError(
        "Unable to copy the payment link.",
      );
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-6xl rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
          Loading invoice…
        </div>
      </main>
    );
  }

  if (error && !invoice) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-6xl rounded-xl border border-red-200 bg-white p-8 shadow-sm">
          <p className="font-semibold text-red-700">
            {error}
          </p>

          <Link
            href="/invoices"
            className="mt-4 inline-flex rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
          >
            Back to invoices
          </Link>
        </div>
      </main>
    );
  }

  if (!invoice) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <Link
                href="/invoices"
                className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
              >
                ← Back to invoices
              </Link>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-slate-950">
                  Invoice No:{" "}
                  {invoice.invoice_number}
                </h1>

                <StatusBadge
                  status={invoice.status}
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                <span>
                  Customer:{" "}
                  <strong className="text-slate-900">
                    {customerName ||
                      "Not recorded"}
                  </strong>
                </span>

                <span>
                  Due:{" "}
                  <strong className="text-slate-900">
                    {formatDateDisplay(
                      dueDate,
                    )}
                  </strong>
                </span>

                <span>
                  Outstanding:{" "}
                  <strong className="text-slate-950">
                    {formatMoney(
                      outstanding,
                    )}
                  </strong>
                </span>
              </div>
            </div>

            <div className="flex max-w-3xl flex-wrap gap-2">
              <button
                type="button"
                disabled={
                  saving ||
                  isLocked
                }
                onClick={() =>
                  void saveInvoice()
                }
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving…"
                  : "Save"}
              </button>

              <button
                type="button"
                disabled={
                  saving ||
                  isLocked
                }
                onClick={() =>
                  void saveInvoice(
                    "approved",
                  )
                }
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Approve
              </button>

              <button
                type="button"
                onClick={previewInvoice}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-100"
              >
                Preview invoice
              </button>

              <button
                type="button"
                onClick={
                  previewCombinedReport
                }
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-100"
              >
                Preview service report
              </button>

              <RevolutPayButton
                invoiceId={invoice.id}
                existingPaymentUrl={invoice.payment_url}
                disabled={
                  actionLoading !== "" ||
                  isLocked
                }
              />

              <button
                type="button"
                disabled={
                  actionLoading !== ""
                }
                onClick={openSendModal}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send customer
              </button>
            </div>
          </div>

          <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-slate-200">
            <TabButton
              active={
                activeTab === "invoice"
              }
              label="Invoice"
              onClick={() =>
                setActiveTab("invoice")
              }
            />

            <TabButton
              active={
                activeTab ===
                "service_report"
              }
              label="Service report"
              onClick={() =>
                setActiveTab(
                  "service_report",
                )
              }
            />

            <TabButton
              active={
                activeTab === "activity"
              }
              label="Activity"
              onClick={() =>
                setActiveTab("activity")
              }
            />
          </nav>
        </header>

        {message ? (
          <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {error}
          </div>
        ) : null}

        {isLocked ? (
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            This invoice is{" "}
            {invoice.status} and cannot
            be edited.
          </div>
        ) : null}

        {activeTab === "invoice" ? (
          <InvoiceTab
            invoice={invoice}
            items={items}
            customerName={customerName}
            customerEmail={customerEmail}
            customerPhone={customerPhone}
            billingAddress={billingAddress}
            issueDate={issueDate}
            dueDate={dueDate}
            vatRate={vatRate}
            notes={notes}
            paymentTerms={paymentTerms}
            customerEditing={
              customerEditing
            }
            isLocked={isLocked}
            calculatedTotals={
              calculatedTotals
            }
            outstanding={outstanding}
            daysUntilDue={daysUntilDue}
            saving={saving}
            onCustomerEditingChange={
              setCustomerEditing
            }
            onCustomerNameChange={
              setCustomerName
            }
            onCustomerEmailChange={
              setCustomerEmail
            }
            onCustomerPhoneChange={
              setCustomerPhone
            }
            onBillingAddressChange={
              setBillingAddress
            }
            onIssueDateChange={
              setIssueDate
            }
            onDueDateChange={
              setDueDate
            }
            onVatRateChange={
              setVatRate
            }
            onNotesChange={setNotes}
            onPaymentTermsChange={
              setPaymentTerms
            }
            onUpdateItem={updateItem}
            onAddItem={addItem}
            onRemoveItem={removeItem}
            onCreatePaymentLink={() =>
              void createPaymentLink()
            }
            onCopyPaymentLink={() =>
              void copyPaymentLink()
            }
            onMarkPaid={() =>
              void saveInvoice("paid")
            }
          />
        ) : null}

        {activeTab ===
        "service_report" ? (
          <ServiceReportTab
            job={job}
            machine={machine}
            items={items}
            onPreview={
              previewCombinedReport
            }
          />
        ) : null}

        {activeTab === "activity" ? (
          <ActivityTab
            items={activityItems}
          />
        ) : null}
      </div>

      {sendModalOpen ? (
        <SendCustomerModal
          invoiceNumber={
            invoice.invoice_number
          }
          documentType={
            sendDocumentType
          }
          recipient={sendRecipient}
          subject={sendSubject}
          message={sendMessage}
          sendCopy={sendCopy}
          includePaymentLink={
            includePaymentLinkInEmail
          }
          hasPaymentLink={
            Boolean(
              invoice.payment_url,
            )
          }
          sending={
            actionLoading === "send"
          }
          onDocumentTypeChange={
            changeSendDocumentType
          }
          onRecipientChange={
            setSendRecipient
          }
          onSubjectChange={
            setSendSubject
          }
          onMessageChange={
            setSendMessage
          }
          onSendCopyChange={
            setSendCopy
          }
          onIncludePaymentLinkChange={
            setIncludePaymentLinkInEmail
          }
          onClose={() =>
            setSendModalOpen(false)
          }
          onSend={() =>
            void sendCustomerDocuments()
          }
        />
      ) : null}
    </main>
  );
}

function InvoiceTab({
  invoice,
  items,
  customerName,
  customerEmail,
  customerPhone,
  billingAddress,
  issueDate,
  dueDate,
  vatRate,
  notes,
  paymentTerms,
  customerEditing,
  isLocked,
  calculatedTotals,
  outstanding,
  daysUntilDue,
  saving,
  onCustomerEditingChange,
  onCustomerNameChange,
  onCustomerEmailChange,
  onCustomerPhoneChange,
  onBillingAddressChange,
  onIssueDateChange,
  onDueDateChange,
  onVatRateChange,
  onNotesChange,
  onPaymentTermsChange,
  onUpdateItem,
  onAddItem,
  onRemoveItem,
  onCreatePaymentLink,
  onCopyPaymentLink,
  onMarkPaid,
}: {
  invoice: InvoiceRow;
  items: EditableInvoiceItem[];
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  billingAddress: string;
  issueDate: string;
  dueDate: string;
  vatRate: string;
  notes: string;
  paymentTerms: string;
  customerEditing: boolean;
  isLocked: boolean;
  calculatedTotals: {
    subtotal: number;
    vat: number;
    total: number;
  };
  outstanding: number;
  daysUntilDue: number | null;
  saving: boolean;
  onCustomerEditingChange: (
    value: boolean,
  ) => void;
  onCustomerNameChange: (
    value: string,
  ) => void;
  onCustomerEmailChange: (
    value: string,
  ) => void;
  onCustomerPhoneChange: (
    value: string,
  ) => void;
  onBillingAddressChange: (
    value: string,
  ) => void;
  onIssueDateChange: (
    value: string,
  ) => void;
  onDueDateChange: (
    value: string,
  ) => void;
  onVatRateChange: (
    value: string,
  ) => void;
  onNotesChange: (
    value: string,
  ) => void;
  onPaymentTermsChange: (
    value: string,
  ) => void;
  onUpdateItem: (
    index: number,
    field: keyof EditableInvoiceItem,
    value: string,
  ) => void;
  onAddItem: (
    type?: InvoiceItemType,
  ) => void;
  onRemoveItem: (
    index: number,
  ) => void;
  onCreatePaymentLink: () => void;
  onCopyPaymentLink: () => void;
  onMarkPaid: () => void;
}) {
  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Customer details
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Customer information shown on
                the invoice.
              </p>
            </div>

            {!isLocked ? (
              <button
                type="button"
                onClick={() =>
                  onCustomerEditingChange(
                    !customerEditing,
                  )
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                {customerEditing
                  ? "Finish editing"
                  : "Edit"}
              </button>
            ) : null}
          </div>

          {customerEditing ? (
            <>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field
                  label="Customer name"
                  value={customerName}
                  disabled={isLocked}
                  onChange={
                    onCustomerNameChange
                  }
                />

                <Field
                  label="Email"
                  type="email"
                  value={customerEmail}
                  disabled={isLocked}
                  onChange={
                    onCustomerEmailChange
                  }
                />

                <Field
                  label="Phone"
                  value={customerPhone}
                  disabled={isLocked}
                  onChange={
                    onCustomerPhoneChange
                  }
                />

                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Issue date"
                    type="date"
                    value={issueDate}
                    disabled={isLocked}
                    onChange={
                      onIssueDateChange
                    }
                  />

                  <Field
                    label="Due date"
                    type="date"
                    value={dueDate}
                    disabled={isLocked}
                    onChange={
                      onDueDateChange
                    }
                  />
                </div>
              </div>

              <label className="mt-4 block">
                <span className="text-sm font-medium text-slate-700">
                  Billing address
                </span>

                <textarea
                  value={billingAddress}
                  disabled={isLocked}
                  onChange={(event) =>
                    onBillingAddressChange(
                      event.target.value,
                    )
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 disabled:bg-slate-100"
                />
              </label>
            </>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <InfoCard
                label="Customer"
                value={
                  customerName ||
                  "Not recorded"
                }
              />

              <InfoCard
                label="Email"
                value={
                  customerEmail ||
                  "Not recorded"
                }
              />

              <InfoCard
                label="Phone"
                value={
                  customerPhone ||
                  "Not recorded"
                }
              />

              <InfoCard
                label="Billing address"
                value={
                  billingAddress ||
                  "Not recorded"
                }
              />

              <InfoCard
                label="Issue date"
                value={formatDateDisplay(
                  issueDate,
                )}
              />

              <InfoCard
                label="Due date"
                value={formatDateDisplay(
                  dueDate,
                )}
              />
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Invoice items
              </h2>

              <p className="text-sm text-slate-500">
                Labour, parts, call-out,
                travel and other charges.
              </p>
            </div>

            {!isLocked ? (
              <div className="flex flex-wrap gap-2">
                <SmallButton
                  label="+ Labour"
                  onClick={() =>
                    onAddItem("labour")
                  }
                />

                <SmallButton
                  label="+ Part"
                  onClick={() =>
                    onAddItem("part")
                  }
                />

                <SmallButton
                  label="+ Call-out"
                  onClick={() =>
                    onAddItem("callout")
                  }
                />

                <SmallButton
                  label="+ Travel"
                  onClick={() =>
                    onAddItem("travel")
                  }
                />

                <SmallButton
                  label="+ Other"
                  onClick={() =>
                    onAddItem("other")
                  }
                />
              </div>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-[130px_minmax(280px,1fr)_110px_140px_130px_52px] gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span>Type</span>
                <span>Description</span>
                <span>Qty</span>
                <span>Unit price</span>
                <span>Total</span>
                <span />
              </div>

              <div className="divide-y divide-slate-200">
                {items.map(
                  (item, index) => {
                    const lineTotal =
                      asNumber(
                        item.quantity,
                      ) *
                      asNumber(
                        item.unitPrice,
                      );

                    return (
                      <div
                        key={item.id}
                        className="grid grid-cols-[130px_minmax(280px,1fr)_110px_140px_130px_52px] gap-3 px-5 py-4"
                      >
                        <select
                          value={
                            item.itemType
                          }
                          disabled={
                            isLocked
                          }
                          onChange={(
                            event,
                          ) =>
                            onUpdateItem(
                              index,
                              "itemType",
                              event.target
                                .value,
                            )
                          }
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                        >
                          <option value="labour">
                            Labour
                          </option>
                          <option value="part">
                            Part
                          </option>
                          <option value="callout">
                            Call-out
                          </option>
                          <option value="travel">
                            Travel
                          </option>
                          <option value="other">
                            Other
                          </option>
                        </select>

                        <input
                          value={
                            item.description
                          }
                          disabled={
                            isLocked
                          }
                          onChange={(
                            event,
                          ) =>
                            onUpdateItem(
                              index,
                              "description",
                              event.target
                                .value,
                            )
                          }
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                        />

                        <input
                          type="number"
                          step="0.01"
                          value={
                            item.quantity
                          }
                          disabled={
                            isLocked
                          }
                          onChange={(
                            event,
                          ) =>
                            onUpdateItem(
                              index,
                              "quantity",
                              event.target
                                .value,
                            )
                          }
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                        />

                        <input
                          type="number"
                          step="0.01"
                          value={
                            item.unitPrice
                          }
                          disabled={
                            isLocked
                          }
                          onChange={(
                            event,
                          ) =>
                            onUpdateItem(
                              index,
                              "unitPrice",
                              event.target
                                .value,
                            )
                          }
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                        />

                        <div className="flex items-center font-semibold text-slate-950">
                          {formatMoney(
                            lineTotal,
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={
                            isLocked
                          }
                          onClick={() =>
                            onRemoveItem(
                              index,
                            )
                          }
                          className="h-10 rounded-lg border border-red-200 text-lg font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="Remove item"
                        >
                          ×
                        </button>
                      </div>
                    );
                  },
                )}

                {items.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    No invoice items have
                    been added.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Customer-facing notes
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            These details appear on the
            customer invoice.
          </p>

          <textarea
            value={notes}
            disabled={isLocked}
            onChange={(event) =>
              onNotesChange(
                event.target.value,
              )
            }
            rows={8}
            className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-6 text-slate-900 outline-none focus:border-emerald-600 disabled:bg-slate-100"
          />

          <label className="mt-4 block">
            <span className="text-sm font-medium text-slate-700">
              Payment terms
            </span>

            <input
              value={paymentTerms}
              disabled={isLocked}
              onChange={(event) =>
                onPaymentTermsChange(
                  event.target.value,
                )
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 disabled:bg-slate-100"
            />
          </label>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-6">
          <h2 className="text-lg font-semibold text-slate-950">
            Invoice summary
          </h2>

          <div className="mt-4 grid gap-3">
            <SummaryDetail
              label="Status"
              value={displayStatus(
                invoice.status,
              )}
            />

            <SummaryDetail
              label="Due date"
              value={formatDateDisplay(
                dueDate,
              )}
            />

            <SummaryDetail
              label="Days remaining"
              value={formatDaysRemaining(
                daysUntilDue,
              )}
            />
          </div>

          <label className="mt-5 block">
            <span className="text-sm font-medium text-slate-700">
              VAT rate
            </span>

            <div className="mt-1 flex overflow-hidden rounded-lg border border-slate-300">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={vatRate}
                disabled={isLocked}
                onChange={(event) =>
                  onVatRateChange(
                    event.target.value,
                  )
                }
                className="min-w-0 flex-1 px-3 py-2 text-sm outline-none disabled:bg-slate-100"
              />

              <span className="border-l border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                %
              </span>
            </div>
          </label>

          <div className="mt-6 space-y-3 border-t border-slate-200 pt-5">
            <TotalRow
              label="Subtotal"
              value={
                calculatedTotals.subtotal
              }
            />

            <TotalRow
              label={`VAT (${asNumber(
                vatRate,
              )}%)`}
              value={calculatedTotals.vat}
            />

            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
              <span className="font-semibold text-slate-950">
                Total
              </span>

              <span className="text-2xl font-bold text-slate-950">
                {formatMoney(
                  calculatedTotals.total,
                )}
              </span>
            </div>

            <TotalRow
              label="Amount paid"
              value={asNumber(
                invoice.amount_paid,
              )}
            />

            <TotalRow
              label="Outstanding"
              value={outstanding}
              strong
            />
          </div>

          <div className="mt-6 border-t border-slate-200 pt-5">
            <h3 className="text-sm font-semibold text-slate-950">
              Payment
            </h3>

            {invoice.payment_url ? (
              <div className="mt-3 space-y-2">
                <a
                  href={
                    invoice.payment_url
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-900 hover:bg-amber-100"
                >
                  Open payment page
                </a>

                <button
                  type="button"
                  onClick={
                    onCopyPaymentLink
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Copy payment link
                </button>

                <button
                  type="button"
                  disabled={isLocked}
                  onClick={
                    onCreatePaymentLink
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Generate new link
                </button>
              </div>
            ) : (
              <div className="mt-3">
                <RevolutPayButton
                  invoiceId={invoice.id}
                  existingPaymentUrl={invoice.payment_url}
                  disabled={isLocked}
                />
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={
              saving ||
              invoice.status === "paid"
            }
            onClick={onMarkPaid}
            className="mt-5 w-full rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Mark as paid manually
          </button>
        </section>
      </aside>
    </div>
  );
}

function ServiceReportTab({
  job,
  machine,
  items,
  onPreview,
}: {
  job: JobRow | null;
  machine: MachineRow | null;
  items: EditableInvoiceItem[];
  onPreview: () => void;
}) {
  const labourItems = items.filter(
    (item) =>
      item.itemType === "labour",
  );

  const partItems = items.filter(
    (item) =>
      item.itemType === "part",
  );

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Service report
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Review the engineering record
              before sending it to the customer.
            </p>
          </div>

          <button
            type="button"
            onClick={onPreview}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Preview service report PDF
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <InfoCard
            label="Job number"
            value={
              job?.job_number ||
              "Not linked"
            }
          />

          <InfoCard
            label="Machine"
            value={buildMachineName(
              machine,
            )}
          />

          <InfoCard
            label="Machine hours"
            value={
              job?.machine_hours !==
              null &&
              job?.machine_hours !==
                undefined
                ? String(
                    job.machine_hours,
                  )
                : "Not recorded"
            }
          />

          <InfoCard
            label="Registration"
            value={
              machine?.registration ||
              "Not recorded"
            }
          />

          <InfoCard
            label="Serial number"
            value={
              machine?.serial_number ||
              "Not recorded"
            }
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <ReportSection
          title="Fault reported"
          value={job?.fault_reported}
        />

        <ReportSection
          title="Diagnosis"
          value={job?.diagnosis}
        />

        <ReportSection
          title="Work carried out"
          value={job?.work_carried_out}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <ReportItemsTable
          title="Labour"
          items={labourItems}
        />

        <ReportItemsTable
          title="Parts used"
          items={partItems}
        />
      </section>

      <section className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
        <h3 className="font-semibold text-slate-950">
          Job photos
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Job photos can be displayed here
          once the invoice API returns the
          completion photo records.
        </p>
      </section>
    </div>
  );
}

function ActivityTab({
  items,
}: {
  items: {
    title: string;
    detail: string;
    date: string | null;
  }[];
}) {
  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">
        Invoice activity
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        A record of invoice, email and
        payment events.
      </p>

      <div className="mt-6 space-y-5">
        {items.map((item, index) => (
          <div
            key={`${item.title}-${index}`}
            className="relative pl-8"
          >
            <span className="absolute left-0 top-1.5 h-3 w-3 rounded-full bg-emerald-600" />

            {index <
            items.length - 1 ? (
              <span className="absolute left-[5px] top-5 h-[calc(100%+10px)] w-px bg-slate-200" />
            ) : null}

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-950">
                  {item.title}
                </h3>

                <span className="text-xs text-slate-500">
                  {formatDateTimeDisplay(
                    item.date,
                  )}
                </span>
              </div>

              <p className="mt-1 text-sm text-slate-600">
                {item.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SendCustomerModal({
  invoiceNumber,
  documentType,
  recipient,
  subject,
  message,
  sendCopy,
  includePaymentLink,
  hasPaymentLink,
  sending,
  onDocumentTypeChange,
  onRecipientChange,
  onSubjectChange,
  onMessageChange,
  onSendCopyChange,
  onIncludePaymentLinkChange,
  onClose,
  onSend,
}: {
  invoiceNumber: string;
  documentType: SendDocumentType;
  recipient: string;
  subject: string;
  message: string;
  sendCopy: boolean;
  includePaymentLink: boolean;
  hasPaymentLink: boolean;
  sending: boolean;
  onDocumentTypeChange: (
    value: SendDocumentType,
  ) => void;
  onRecipientChange: (
    value: string,
  ) => void;
  onSubjectChange: (
    value: string,
  ) => void;
  onMessageChange: (
    value: string,
  ) => void;
  onSendCopyChange: (
    value: boolean,
  ) => void;
  onIncludePaymentLinkChange: (
    value: boolean,
  ) => void;
  onClose: () => void;
  onSend: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 p-5">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Send customer
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Invoice {invoiceNumber}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-2xl text-slate-500 hover:bg-slate-100"
            aria-label="Close send modal"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 p-5">
          <fieldset>
            <legend className="text-sm font-semibold text-slate-950">
              Attachments
            </legend>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-4 hover:border-emerald-400">
                <input
                  type="radio"
                  name="documentType"
                  checked={
                    documentType ===
                    "invoice_only"
                  }
                  onChange={() =>
                    onDocumentTypeChange(
                      "invoice_only",
                    )
                  }
                  className="mt-1"
                />

                <span>
                  <span className="block font-semibold text-slate-950">
                    Invoice only
                  </span>

                  <span className="mt-1 block text-sm text-slate-500">
                    Send the accounts invoice
                    without the service report.
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-4 hover:border-emerald-400">
                <input
                  type="radio"
                  name="documentType"
                  checked={
                    documentType ===
                    "service_report_and_invoice"
                  }
                  onChange={() =>
                    onDocumentTypeChange(
                      "service_report_and_invoice",
                    )
                  }
                  className="mt-1"
                />

                <span>
                  <span className="block font-semibold text-slate-950">
                    Service report +
                    invoice
                  </span>

                  <span className="mt-1 block text-sm text-slate-500">
                    Send the full engineering
                    report and invoice.
                  </span>
                </span>
              </label>
            </div>
          </fieldset>

          <Field
            label="Recipient"
            type="email"
            value={recipient}
            onChange={
              onRecipientChange
            }
          />

          <Field
            label="Subject"
            value={subject}
            onChange={
              onSubjectChange
            }
          />

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Message
            </span>

            <textarea
              value={message}
              onChange={(event) =>
                onMessageChange(
                  event.target.value,
                )
              }
              rows={8}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-6 text-slate-900 outline-none focus:border-emerald-600"
            />
          </label>

          <div className="space-y-3 rounded-xl bg-slate-50 p-4">
            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={sendCopy}
                onChange={(event) =>
                  onSendCopyChange(
                    event.target.checked,
                  )
                }
              />

              Send a copy to the office
            </label>

            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={
                  includePaymentLink
                }
                disabled={!hasPaymentLink}
                onChange={(event) =>
                  onIncludePaymentLinkChange(
                    event.target.checked,
                  )
                }
              />

              Include Revolut payment link
            </label>

            {!hasPaymentLink ? (
              <p className="text-xs text-amber-700">
                Create a payment link before
                enabling this option.
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 p-5">
          <button
            type="button"
            disabled={sending}
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={sending}
            onClick={onSend}
            className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending
              ? "Sending…"
              : "Send email"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportSection({
  title,
  value,
}: {
  title: string;
  value: string | null | undefined;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-slate-950">
        {title}
      </h3>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
        {value?.trim() ||
          "Not recorded."}
      </p>
    </article>
  );
}

function ReportItemsTable({
  title,
  items,
}: {
  title: string;
  items: EditableInvoiceItem[];
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h3 className="font-semibold text-slate-950">
          {title}
        </h3>
      </div>

      <div className="divide-y divide-slate-200">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start justify-between gap-4 p-4"
          >
            <div>
              <p className="font-medium text-slate-950">
                {item.description}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Quantity:{" "}
                {item.quantity}
              </p>
            </div>

            <span className="font-semibold text-slate-950">
              {formatMoney(
                asNumber(item.quantity) *
                  asNumber(
                    item.unitPrice,
                  ),
              )}
            </span>
          </div>
        ))}

        {items.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            Nothing recorded.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Field({
  label,
  type = "text",
  value,
  disabled = false,
  onChange,
}: {
  label: string;
  type?: string;
  value: string;
  disabled?: boolean;
  onChange: (
    value: string,
  ) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">
        {label}
      </span>

      <input
        type={type}
        value={value}
        disabled={disabled}
        step={
          type === "number"
            ? "0.01"
            : undefined
        }
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 disabled:bg-slate-100"
      />
    </label>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 whitespace-pre-wrap font-medium text-slate-950">
        {value}
      </p>
    </div>
  );
}

function SmallButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
    >
      {label}
    </button>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "border-b-2 border-emerald-700 px-4 py-3 text-sm font-semibold text-emerald-800"
          : "border-b-2 border-transparent px-4 py-3 text-sm font-semibold text-slate-500 hover:text-slate-900"
      }
    >
      {label}
    </button>
  );
}

function SummaryDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-sm text-slate-600">
        {label}
      </span>

      <span className="text-sm font-semibold text-slate-950">
        {value}
      </span>
    </div>
  );
}

function TotalRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={
          strong
            ? "font-semibold text-slate-950"
            : "text-sm text-slate-600"
        }
      >
        {label}
      </span>

      <span
        className={
          strong
            ? "font-bold text-slate-950"
            : "text-sm font-semibold text-slate-950"
        }
      >
        {formatMoney(value)}
      </span>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const value =
    normaliseStatus(status);

  const classes: Record<
    string,
    string
  > = {
    draft:
      "bg-slate-100 text-slate-700",
    approved:
      "bg-blue-100 text-blue-800",
    sent:
      "bg-amber-100 text-amber-800",
    part_paid:
      "bg-orange-100 text-orange-800",
    paid:
      "bg-emerald-100 text-emerald-800",
    overdue:
      "bg-red-100 text-red-800",
    void:
      "bg-slate-200 text-slate-600",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        classes[value] ??
        "bg-slate-100 text-slate-700"
      }`}
    >
      {displayStatus(value)}
    </span>
  );
}

function buildMachineName(
  machine: MachineRow | null,
) {
  if (!machine) {
    return "No machine linked";
  }

  return (
    [machine.make, machine.model]
      .filter(Boolean)
      .join(" ")
      .trim() || "Machine"
  );
}

function buildDefaultEmailMessage(
  customerName:
    | string
    | null
    | undefined,
  invoiceNumber: string,
) {
  const greetingName =
    customerName?.trim()
      ? customerName.trim()
      : "Customer";

  return [
    `Hi ${greetingName},`,
    "",
    `Please find attached the documents for invoice ${invoiceNumber}.`,
    "",
    "You can use the secure payment link in this email where available.",
    "",
    "Kind regards,",
    "McAteer Agricultural Services",
  ].join("\n");
}

function calculateDaysUntilDue(
  dueDate: string,
) {
  if (!dueDate) {
    return null;
  }

  const due = new Date(
    `${dueDate}T00:00:00`,
  );

  if (
    Number.isNaN(due.getTime())
  ) {
    return null;
  }

  const today = new Date();

  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );

  const dueUtc = Date.UTC(
    due.getUTCFullYear(),
    due.getUTCMonth(),
    due.getUTCDate(),
  );

  return Math.ceil(
    (dueUtc - todayUtc) /
      86_400_000,
  );
}

function formatDaysRemaining(
  value: number | null,
) {
  if (value === null) {
    return "Not available";
  }

  if (value === 0) {
    return "Due today";
  }

  if (value < 0) {
    const overdueDays =
      Math.abs(value);

    return `${overdueDays} day${
      overdueDays === 1 ? "" : "s"
    } overdue`;
  }

  return `${value} day${
    value === 1 ? "" : "s"
  } remaining`;
}

function formatDateDisplay(
  value: string | null,
) {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(
    `${value.slice(0, 10)}T00:00:00`,
  );

  if (
    Number.isNaN(date.getTime())
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}

function formatDateTimeDisplay(
  value: string | null,
) {
  if (!value) {
    return "Date not recorded";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

function normaliseStatus(
  value: string,
) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function displayStatus(
  value: string,
) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

function asNumber(
  value: unknown,
) {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function roundMoney(
  value: number,
) {
  return (
    Math.round(value * 100) /
    100
  );
}

function formatMoney(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-GB",
    {
      style: "currency",
      currency: "GBP",
    },
  ).format(value);
}