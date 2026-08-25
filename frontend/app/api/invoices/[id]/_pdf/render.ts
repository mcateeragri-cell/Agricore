import {
  PDFDocument,
  PDFFont,
  PDFImage,
  PDFPage,
  StandardFonts,
  rgb,
} from "pdf-lib";
import QRCode from "qrcode";
import { formatCurrency as formatRegionalCurrency, normaliseRegionalSettings } from "@/lib/regional-settings";
import type { InvoiceItemRow, InvoicePdfData, InvoiceRow, MachineRow } from "./types";
import {
  loadCompanyLogoBytes,
  loadCompanySettings,
} from "@/app/api/_company/load-company-settings";

const W = 595.28;
const H = 841.89;
const M = 42;
const CW = W - M * 2;
const GREEN = rgb(0.063, 0.239, 0.18);
const PALE_GREEN = rgb(0.91, 0.97, 0.94);
const DARK = rgb(0.08, 0.1, 0.13);
const MID = rgb(0.35, 0.39, 0.44);
const LIGHT = rgb(0.92, 0.93, 0.95);
const SOFT = rgb(0.975, 0.98, 0.985);
const WHITE = rgb(1, 1, 1);

type SupabaseClient = Parameters<typeof loadCompanySettings>[0];
type CompanySettings = Awaited<ReturnType<typeof loadCompanySettings>>;

type Ctx = {
  pdf: PDFDocument;
  regular: PDFFont;
  bold: PDFFont;
  company: CompanySettings;
  companyLogo: PDFImage | null;
};

export async function renderInvoiceOnlyPdf(
  data: InvoicePdfData,
  supabase: SupabaseClient,
  companyId: string,
) {
  const ctx = await createContext(supabase, companyId);
  await addInvoice(ctx, data);
  addPageNumbers(ctx);
  return ctx.pdf.save();
}

export async function renderCombinedPdf(
  data: InvoicePdfData,
  supabase: SupabaseClient,
  companyId: string,
) {
  const ctx = await createContext(supabase, companyId);
  await addServiceReport(ctx, data, supabase);
  await addInvoice(ctx, data);
  addPageNumbers(ctx);
  return ctx.pdf.save();
}

async function createContext(supabase: SupabaseClient, companyId: string): Promise<Ctx> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const company = await loadCompanySettings(supabase, companyId);
  const logoBytes = await loadCompanyLogoBytes(supabase, company.logo_path);

  let companyLogo: PDFImage | null = null;

  if (logoBytes) {
    try {
      const logoPath = company.logo_path?.toLowerCase() ?? "";
      companyLogo =
        logoPath.endsWith(".jpg") || logoPath.endsWith(".jpeg")
          ? await pdf.embedJpg(logoBytes)
          : await pdf.embedPng(logoBytes);
    } catch (error) {
      console.error("Unable to embed company logo in PDF:", error);
    }
  }

  return {
    pdf,
    regular,
    bold,
    company,
    companyLogo,
  };
}

async function addInvoice(ctx: Ctx, data: InvoicePdfData) {
  const { invoice, items, job, machine } = data;
  const commercialType = invoice.commercial_type || (invoice.job_id ? "service" : "general");
  const title =
    commercialType === "machinery_sale" ? "MACHINERY SALES INVOICE" :
    commercialType === "parts" ? "PARTS INVOICE" :
    "TAX INVOICE";
  let page = ctx.pdf.addPage([W, H]);
  header(page, ctx, title);
  let y = H - 125;

  page.drawText(invoice.invoice_number, {
    x: M,
    y,
    size: 18,
    font: ctx.bold,
    color: DARK,
  });

  const metaX = W - M - 188;
  labelValue(page, ctx, metaX, y + 4, "Issue date", formatDate(invoice.issue_date));
  labelValue(page, ctx, metaX, y - 23, "Due date", formatDate(invoice.due_date));
  labelValue(page, ctx, metaX, y - 50, "Status", formatStatus(invoice.status));
  y -= 74;

  const gap = 12;
  const boxWidth = (CW - gap) / 2;
  infoBox(page, ctx, M, y, boxWidth, 118, "BILL TO", [
    invoice.customer_name || "Customer",
    invoice.billing_address || "",
    invoice.customer_email || "",
    invoice.customer_phone || "",
  ]);
  const detailTitle = commercialType === "machinery_sale" ? "MACHINE SALE" : commercialType === "parts" ? "SALE DETAILS" : "JOB & MACHINE";
  const detailLines =
    commercialType === "machinery_sale"
      ? [`Machine: ${machineName(machine)}`, `Registration: ${machine?.registration || "Not recorded"}`, `Serial: ${machine?.serial_number || "Not recorded"}`, "Department: Machinery Sales"]
      : commercialType === "parts"
        ? ["Parts-only customer sale", "No workshop job linked", "Department: Parts"]
        : [job?.job_number ? `Job: ${job.job_number}` : "Job: Not linked", `Machine: ${machineName(machine)}`, `Registration: ${machine?.registration || "Not recorded"}`, `Serial: ${machine?.serial_number || "Not recorded"}`, `Hours: ${job?.machine_hours ?? "Not recorded"}`];
  infoBox(page, ctx, M + boxWidth + gap, y, boxWidth, 118, detailTitle, detailLines);
  y -= 138;

  const printable = items.filter(
    (item) => item.item_type !== "other" || number(item.line_total) !== 0,
  );
  ({ page, y } = invoiceTable(ctx, page, y, printable, invoice.invoice_number));
  ({ page, y } = ensure(ctx, page, y, 245, title, invoice.invoice_number));

  y = totals(page, ctx, y, invoice);

  if (clean(invoice.payment_terms)) {
    ({ page, y } = ensure(ctx, page, y, 58, title, invoice.invoice_number));
    y -= 8;
    y = textBlock(page, ctx, y, "Payment terms", invoice.payment_terms || "");
  }

  if (clean(invoice.payment_url)) {
    ({ page, y } = ensure(ctx, page, y, 125, title, invoice.invoice_number));
    const qr = await makeQr(ctx.pdf, invoice.payment_url || "");
    y -= 8;
    y = paymentPanel(page, ctx, y, invoice, qr);
  }

  if (clean(invoice.notes)) {
    y -= 6;
    ({ page, y } = paginatedTextBlock(
      ctx,
      page,
      y,
      "Notes",
      invoice.notes || "",
      title,
      invoice.invoice_number,
    ));
  }

  footer(page, ctx, invoice.invoice_number);
}

async function addServiceReport(
  ctx: Ctx,
  data: InvoicePdfData,
  supabase: SupabaseClient,
) {
  const { invoice, items, job, machine, photos } = data;
  let page = ctx.pdf.addPage([W, H]);
  header(page, ctx, "SERVICE REPORT");
  let y = H - 125;

  y = summaryGrid(page, ctx, y, [
    ["Job number", job?.job_number || "Not linked", "Engineer", job?.engineer_name || "Not recorded"],
    ["Machine", machineName(machine), "Machine hours", String(job?.machine_hours ?? "Not recorded")],
    ["Registration", machine?.registration || "Not recorded", "Serial number", machine?.serial_number || "Not recorded"],
  ]);
  y -= 14;

  for (const [title, value] of [
    ["Fault Reported", clean(job?.fault_reported) || "Not recorded."],
    ["Diagnosis", clean(job?.diagnosis) || "Not recorded."],
    ["Work Carried Out", clean(job?.work_carried_out) || extractWork(items) || "Not recorded."],
  ] as const) {
    ({ page, y } = ensure(ctx, page, y, 110, "SERVICE REPORT", invoice.invoice_number));
    y = textBlock(page, ctx, y, title, value);
  }

  for (const [title, type] of [["Labour", "labour"], ["Parts Used", "part"]] as const) {
    const filtered = items.filter((item) => item.item_type === type);
    if (!filtered.length) continue;
    ({ page, y } = ensure(ctx, page, y, 100, "SERVICE REPORT", invoice.invoice_number));
    y = serviceItems(page, ctx, y, title, filtered);
  }

  const embedded: Array<{ image: PDFImage; caption: string }> = [];
  for (const photo of photos.slice(0, 4)) {
    const url = publicPhotoUrl(supabase, photo.file_path);
    const image = await fetchImage(ctx.pdf, url);
    if (image) embedded.push({ image, caption: clean(photo.caption) || "Job photo" });
  }

  if (embedded.length) {
    ({ page, y } = ensure(ctx, page, y, 230, "SERVICE REPORT", invoice.invoice_number));
    photosGrid(page, ctx, y, embedded);
  }

  footer(page, ctx, invoice.invoice_number);
}

function header(page: PDFPage, ctx: Ctx, title: string) {
  const companyName =
    clean(ctx.company.company_name) || "AgriCore Company";
  const contactLine =
    clean(ctx.company.contact_line) ||
    "Agricultural Engineering & Field Service";

  page.drawRectangle({
    x: 0,
    y: H - 92,
    width: W,
    height: 92,
    color: GREEN,
  });

  if (ctx.companyLogo) {
    const natural = ctx.companyLogo.scale(1);
    const maxWidth = 165;
    const maxHeight = 62;
    const scale = Math.min(
      maxWidth / natural.width,
      maxHeight / natural.height,
    );
    const logoWidth = natural.width * scale;
    const logoHeight = natural.height * scale;

    page.drawImage(ctx.companyLogo, {
      x: M,
      y: H - 77 + (maxHeight - logoHeight) / 2,
      width: logoWidth,
      height: logoHeight,
    });
  } else {
    page.drawText(companyName, {
      x: M,
      y: H - 39,
      size: 20,
      font: ctx.bold,
      color: WHITE,
    });

    page.drawText(contactLine, {
      x: M,
      y: H - 59,
      size: 9,
      font: ctx.regular,
      color: WHITE,
    });
  }

  const titleWidth = ctx.bold.widthOfTextAtSize(title, 17);
  page.drawText(title, {
    x: W - M - titleWidth,
    y: H - 47,
    size: 17,
    font: ctx.bold,
    color: WHITE,
  });
}

function infoBox(page: PDFPage, ctx: Ctx, x: number, y: number, width: number, height: number, title: string, lines: string[]) {
  page.drawRectangle({ x, y: y - height, width, height, color: SOFT, borderColor: LIGHT, borderWidth: 1 });
  page.drawText(title, { x: x + 12, y: y - 18, size: 8.5, font: ctx.bold, color: GREEN });
  let ty = y - 39;
  for (const raw of lines.filter(Boolean)) {
    for (const line of wrap(raw, ctx.regular, 8.5, width - 24)) {
      if (ty < y - height + 12) return;
      page.drawText(line, { x: x + 12, y: ty, size: 8.5, font: ctx.regular, color: DARK });
      ty -= 11;
    }
  }
}

function invoiceTable(ctx: Ctx, page: PDFPage, y: number, items: InvoiceItemRow[], reference: string) {
  const cols = { desc: M, qty: 355, unit: 420, total: 500 };
  const drawHead = (p: PDFPage, hy: number) => {
    p.drawRectangle({ x: M, y: hy - 22, width: CW, height: 25, color: GREEN });
    for (const [label, x] of [["Description", cols.desc + 8], ["Qty", cols.qty], ["Unit", cols.unit], ["Total", cols.total]] as const) {
      p.drawText(label, { x, y: hy - 14, size: 8.5, font: ctx.bold, color: WHITE });
    }
    return hy - 31;
  };
  y = drawHead(page, y);
  if (!items.length) {
    page.drawText("No billable line items.", { x: M + 8, y, size: 9, font: ctx.regular, color: MID });
    return { page, y: y - 25 };
  }
  for (const item of items) {
    const lines = wrap(item.description, ctx.regular, 8.5, 290);
    const rowHeight = Math.max(30, lines.length * 11 + 12);
    if (y - rowHeight < 75) {
      footer(page, ctx, reference);
      page = ctx.pdf.addPage([W, H]);
      header(page, ctx, "TAX INVOICE");
      y = drawHead(page, H - 120);
    }
    page.drawRectangle({ x: M, y: y - rowHeight + 7, width: CW, height: rowHeight, color: rgb(0.99, 0.992, 0.995), borderColor: LIGHT, borderWidth: 0.5 });
    let ty = y - 8;
    for (const line of lines) {
      page.drawText(line, { x: cols.desc + 8, y: ty, size: 8.5, font: ctx.regular, color: DARK });
      ty -= 11;
    }
    page.drawText(quantity(number(item.quantity)), { x: cols.qty, y: y - 8, size: 8.5, font: ctx.regular, color: DARK });
    page.drawText(money(number(item.unit_price), ctx.company), { x: cols.unit, y: y - 8, size: 8.5, font: ctx.regular, color: DARK });
    const total = money(number(item.line_total), ctx.company);
    page.drawText(total, { x: W - M - ctx.bold.widthOfTextAtSize(total, 8.5), y: y - 8, size: 8.5, font: ctx.bold, color: DARK });
    y -= rowHeight + 3;
  }
  return { page, y: y - 10 };
}

function totals(page: PDFPage, ctx: Ctx, y: number, invoice: InvoiceRow) {
  const x = W - M - 235;
  const right = W - M;
  const rows = [
    ["Subtotal", money(number(invoice.subtotal), ctx.company)],
    [`${ctx.company.tax_name || "Tax"} (${quantity(number(invoice.vat_rate))}%)`, money(number(invoice.vat_amount), ctx.company)],
    ["Amount paid", money(number(invoice.amount_paid), ctx.company)],
  ];
  rows.forEach(([label, value], i) => {
    const ry = y - i * 22;
    page.drawText(label, { x, y: ry, size: 9, font: ctx.regular, color: MID });
    page.drawText(value, { x: right - ctx.bold.widthOfTextAtSize(value, 9), y: ry, size: 9, font: ctx.bold, color: DARK });
  });
  y -= rows.length * 22 + 5;
  page.drawLine({ start: { x, y: y + 10 }, end: { x: right, y: y + 10 }, thickness: 1, color: LIGHT });
  const total = money(number(invoice.total), ctx.company);
  page.drawText("Total", { x, y: y - 8, size: 13, font: ctx.bold, color: DARK });
  page.drawText(total, { x: right - ctx.bold.widthOfTextAtSize(total, 15), y: y - 10, size: 15, font: ctx.bold, color: GREEN });
  y -= 37;
  const outstanding = money(Math.max(0, number(invoice.total) - number(invoice.amount_paid)), ctx.company);
  page.drawRectangle({ x, y: y - 29, width: 235, height: 38, color: PALE_GREEN, borderColor: GREEN, borderWidth: 1 });
  page.drawText("Outstanding", { x: x + 10, y: y - 15, size: 10, font: ctx.bold, color: GREEN });
  page.drawText(outstanding, { x: right - 10 - ctx.bold.widthOfTextAtSize(outstanding, 12), y: y - 16, size: 12, font: ctx.bold, color: GREEN });
  return y - 42;
}

function paymentPanel(page: PDFPage, ctx: Ctx, y: number, invoice: InvoiceRow, qr: PDFImage | null) {
  const height = 102;
  page.drawRectangle({ x: M, y: y - height, width: CW, height, color: PALE_GREEN, borderColor: GREEN, borderWidth: 1 });
  let tx = M + 14;
  if (qr) {
    page.drawImage(qr, { x: M + 12, y: y - 89, width: 76, height: 76 });
    tx = M + 102;
  }
  page.drawText("Pay securely online", { x: tx, y: y - 24, size: 12, font: ctx.bold, color: GREEN });
  const outstanding = Math.max(0, number(invoice.total) - number(invoice.amount_paid));
  page.drawText(`Outstanding: ${money(outstanding, ctx.company)}`, { x: tx, y: y - 43, size: 10, font: ctx.bold, color: DARK });
  page.drawText("Scan the QR code or use the secure payment link:", { x: tx, y: y - 60, size: 8.5, font: ctx.regular, color: MID });
  let py = y - 75;
  for (const line of wrap(invoice.payment_url || "", ctx.regular, 7.5, CW - (tx - M) - 15).slice(0, 2)) {
    page.drawText(line, { x: tx, y: py, size: 7.5, font: ctx.regular, color: DARK });
    py -= 10;
  }
  return y - height;
}

function summaryGrid(page: PDFPage, ctx: Ctx, y: number, rows: string[][]) {
  const width = CW / 2;
  rows.forEach((row, ri) => {
    const ry = y - ri * 42;
    for (let c = 0; c < 2; c += 1) {
      const x = M + c * width;
      page.drawRectangle({ x, y: ry - 38, width: width - 6, height: 36, color: SOFT, borderColor: LIGHT, borderWidth: 0.7 });
      page.drawText(row[c * 2], { x: x + 10, y: ry - 13, size: 8, font: ctx.bold, color: MID });
      page.drawText(truncate(row[c * 2 + 1], ctx.regular, 10, width - 26), { x: x + 10, y: ry - 28, size: 10, font: ctx.regular, color: DARK });
    }
  });
  return y - rows.length * 42;
}

function textBlock(page: PDFPage, ctx: Ctx, y: number, title: string, text: string) {
  page.drawText(title, { x: M, y, size: 11, font: ctx.bold, color: GREEN });
  y -= 16;
  for (const line of wrap(text, ctx.regular, 9.5, CW)) {
    page.drawText(line, { x: M, y, size: 9.5, font: ctx.regular, color: DARK });
    y -= 13;
  }
  return y - 13;
}


function paginatedTextBlock(
  ctx: Ctx,
  page: PDFPage,
  y: number,
  title: string,
  text: string,
  documentTitle: string,
  reference: string,
) {
  const lines = wrap(text, ctx.regular, 9.5, CW);
  const contentBottom = 58;

  const startBlock = (
    targetPage: PDFPage,
    targetY: number,
    continued: boolean,
  ) => {
    const blockTitle = continued ? `${title} (continued)` : title;
    targetPage.drawText(blockTitle, {
      x: M,
      y: targetY,
      size: 11,
      font: ctx.bold,
      color: GREEN,
    });

    return targetY - 16;
  };

  if (y - 32 < contentBottom) {
    footer(page, ctx, reference);
    page = ctx.pdf.addPage([W, H]);
    header(page, ctx, documentTitle);
    y = H - 120;
  }

  y = startBlock(page, y, false);

  for (const line of lines) {
    const lineHeight = line ? 13 : 9;

    if (y - lineHeight < contentBottom) {
      footer(page, ctx, reference);
      page = ctx.pdf.addPage([W, H]);
      header(page, ctx, documentTitle);
      y = startBlock(page, H - 120, true);
    }

    if (line) {
      page.drawText(line, {
        x: M,
        y,
        size: 9.5,
        font: ctx.regular,
        color: DARK,
      });
    }

    y -= lineHeight;
  }

  return { page, y: y - 8 };
}

function serviceItems(page: PDFPage, ctx: Ctx, y: number, title: string, items: InvoiceItemRow[]) {
  page.drawText(title, { x: M, y, size: 11, font: ctx.bold, color: GREEN });
  y -= 18;
  for (const item of items) {
    page.drawCircle({ x: M + 3, y: y + 3, size: 1.7, color: GREEN });
    for (const line of wrap(`${item.description} (${quantity(number(item.quantity))})`, ctx.regular, 9, CW - 15)) {
      page.drawText(line, { x: M + 12, y, size: 9, font: ctx.regular, color: DARK });
      y -= 12;
    }
    y -= 3;
  }
  return y - 8;
}

function photosGrid(page: PDFPage, ctx: Ctx, y: number, photos: Array<{ image: PDFImage; caption: string }>) {
  page.drawText("Job Photos", { x: M, y, size: 11, font: ctx.bold, color: GREEN });
  y -= 18;
  const gap = 12;
  const width = (CW - gap) / 2;
  const height = 145;
  photos.forEach((photo, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = M + col * (width + gap);
    const by = y - row * (height + 35) - height;
    const scaled = photo.image.scaleToFit(width, height);
    page.drawRectangle({ x, y: by, width, height, borderColor: LIGHT, borderWidth: 1, color: WHITE });
    page.drawImage(photo.image, { x: x + (width - scaled.width) / 2, y: by + (height - scaled.height) / 2, width: scaled.width, height: scaled.height });
    page.drawText(truncate(photo.caption, ctx.regular, 8, width), { x, y: by - 13, size: 8, font: ctx.regular, color: MID });
  });
}

function labelValue(page: PDFPage, ctx: Ctx, x: number, y: number, label: string, value: string) {
  page.drawText(label, { x, y, size: 8, font: ctx.regular, color: MID });
  page.drawText(value, { x: x + 69, y, size: 8.5, font: ctx.bold, color: DARK });
}

function footer(page: PDFPage, ctx: Ctx, reference: string) {
  page.drawLine({
    start: { x: M, y: 34 },
    end: { x: W - M, y: 34 },
    thickness: 0.6,
    color: LIGHT,
  });

  const companyName =
    clean(ctx.company.company_name) || "AgriCore Company";
  const companyRegistration = clean(ctx.company.company_registration);
  const vatNumber = clean(ctx.company.vat_number);

  const bits = [
    companyName,
    companyRegistration ? `Company No: ${companyRegistration}` : "",
    vatNumber ? `${ctx.company.tax_name || "Tax"} No: ${vatNumber}` : "",
    reference,
  ].filter(Boolean);

  const footerText = truncate(bits.join("  |  "), ctx.regular, 7.5, CW - 90);
  page.drawText(footerText, {
    x: M,
    y: 20,
    size: 7.5,
    font: ctx.regular,
    color: MID,
  });
}

function ensure(ctx: Ctx, page: PDFPage, y: number, required: number, title: string, reference: string) {
  if (y - required >= 55) return { page, y };
  footer(page, ctx, reference);
  const next = ctx.pdf.addPage([W, H]);
  header(next, ctx, title);
  return { page: next, y: H - 120 };
}

function addPageNumbers(ctx: Ctx) {
  const pages = ctx.pdf.getPages();
  pages.forEach((page, index) => {
    const text = `Page ${index + 1} of ${pages.length}`;
    page.drawText(text, { x: W - M - ctx.regular.widthOfTextAtSize(text, 8), y: 20, size: 8, font: ctx.regular, color: MID });
  });
}

async function makeQr(pdf: PDFDocument, value: string) {
  try {
    const dataUrl = await QRCode.toDataURL(value, { margin: 1, width: 320, errorCorrectionLevel: "M" });
    return embedDataUrl(pdf, dataUrl);
  } catch {
    return null;
  }
}

function publicPhotoUrl(supabase: SupabaseClient, path: string) {
  if (/^(https?:|data:)/i.test(path)) return path;
  return supabase.storage.from("job-photos").getPublicUrl(path).data.publicUrl;
}

async function fetchImage(pdf: PDFDocument, url: string) {
  try {
    if (url.startsWith("data:")) return embedDataUrl(pdf, url);
    const response = await fetch(url);
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    const type = response.headers.get("content-type") || "";
    return type.includes("png") || url.toLowerCase().includes(".png")
      ? pdf.embedPng(bytes)
      : pdf.embedJpg(bytes);
  } catch {
    return null;
  }
}

async function embedDataUrl(pdf: PDFDocument, value: string) {
  const match = value.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i);
  if (!match) return null;
  const bytes = Uint8Array.from(Buffer.from(match[2], "base64"));
  return match[1].toLowerCase() === "png" ? pdf.embedPng(bytes) : pdf.embedJpg(bytes);
}

function extractWork(items: InvoiceItemRow[]) {
  return items.find((item) => item.item_type === "other" && item.description.toLowerCase().startsWith("work carried out:"))
    ?.description.replace(/^work carried out:\s*/i, "") || "";
}

function machineName(machine: MachineRow | null) {
  return machine ? [machine.make, machine.model].filter(Boolean).join(" ").trim() || "Machine" : "Not linked";
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r/g, "").split("\n")) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of paragraph.split(/\s+/)) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) current = candidate;
      else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function truncate(text: string, font: PDFFont, size: number, maxWidth: number) {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let value = text;
  while (value && font.widthOfTextAtSize(`${value}...`, size) > maxWidth) value = value.slice(0, -1);
  return `${value}...`;
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: number, company: CompanySettings) {
  return formatRegionalCurrency(value, normaliseRegionalSettings(company));
}

function quantity(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-GB").format(date);
}

function formatStatus(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}