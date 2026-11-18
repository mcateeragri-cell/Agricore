   "use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { PDFDocument } from "pdf-lib";

type Props = {
  customerId: string;
  machineId: string;
  make: string;
  model: string;
  companyLabel: string;
  companyId: string;
};
type Size = "63x38" | "50x30" | "70x40";
type Brand = { name: string; colour: string; logoUrl: string };
const SIZES: Record<Size, [number, number]> = {
  "63x38": [63.5, 38.1], "50x30": [50, 30], "70x40": [70, 40],
};
const MM_TO_PT = 72 / 25.4;
const safeColour = (value: string) => /^#[0-9a-f]{6}$/i.test(value) ? value : "#103D2E";

function imageFromUrl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load the image."));
    img.src = src;
  });
}

function fittedText(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, maxWidth: number, size: number, minSize = 8) {
  let fontSize = size;
  do {
    ctx.font = `700 ${fontSize}px Arial, sans-serif`;
    if (ctx.measureText(value).width <= maxWidth) break;
    fontSize -= 1;
  } while (fontSize > minSize);
  ctx.fillText(value, x, y, maxWidth);
}

/** QR destinations use the public, revocable machine passport token. */
export default function MachineQrSticker({ customerId, machineId, make, model, companyLabel, companyId }: Props) {
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState("");
  const [brand, setBrand] = useState<Brand>({ name: companyLabel, colour: "#103D2E", logoUrl: "" });
  const [size, setSize] = useState<Size>("63x38");
  const [sheet, setSheet] = useState(false);
  const [copies, setCopies] = useState(1);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setBrand({ name: companyLabel, colour: "#103D2E", logoUrl: "" });
    fetch("/api/machines/qr-branding", { credentials: "same-origin", cache: "no-store" })
      .then(async response => { if (!response.ok) throw new Error("Branding unavailable"); return response.json(); })
      .then((data: { companyId: string; name: string; colour: string; logoUrl: string | null }) => {
        if (!cancelled && data.companyId === companyId) {
          setBrand({ name: data.name || companyLabel, colour: safeColour(data.colour), logoUrl: data.logoUrl || "" });
        }
      }).catch(() => {});
   return () => { cancelled = true; };
  }, [companyId, companyLabel]);

  useEffect(() => {
    if (!open) {
      setQr("");
      setPreview("");
      return;
    }
    let cancelled = false;
    setQr("");
    setPreview("");
    setError("");

    async function preparePassportQr() {
      try {
        const response = await fetch(`/api/machines/${encodeURIComponent(machineId)}/passport`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        const data: { url?: string; error?: string } = await response.json();
        if (!response.ok || !data.url) {
          throw new Error(data.error || "Unable to issue machine passport.");
        }
        const passportUrl = new URL(data.url, window.location.origin);
        // Prevent an unexpected API response from generating an external QR destination.
        if (passportUrl.origin !== window.location.origin || !/^\/passport\/[0-9a-f-]{36}$/i.test(passportUrl.pathname)) {
          throw new Error("Invalid passport URL returned by server.");
        }
        const value = await QRCode.toDataURL(passportUrl.toString(), {
          width: 720, margin: 4, errorCorrectionLevel: "M",
        });
        if (!cancelled) setQr(value);
      } catch (err) {
        if (!cancelled) {
          setQr("");
          setPreview("");
          setError(err instanceof Error ? err.message : "Unable to generate machine passport QR code.");
        }
      }
    }
    void preparePassportQr();
    return () => { cancelled = true; };
  }, [open, machineId]);

  const drawLabel = async (labelSize: Size): Promise<HTMLCanvasElement> => {
    if (!qr) throw new Error("QR code is not ready.");
    const [widthMm, heightMm] = SIZES[labelSize];
    const scale = 12; // approximately 305 dpi
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(widthMm * scale);
    canvas.height = Math.round(heightMm * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable.");
    const w = canvas.width, h = canvas.height;
    const green = safeColour(brand.colour);
    const pad = Math.round(w * 0.026);
    const headerH = Math.round(h * 0.30);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = green;
    ctx.fillRect(0, 0, w, headerH);
    ctx.fillStyle = "#e5e7eb";
    ctx.fillRect(0, headerH, w, Math.max(2, h * 0.012));

    let logoW = 0;
    if (brand.logoUrl) {
      try {
        const logo = await imageFromUrl(brand.logoUrl);
        const maxW = w * 0.32, maxH = headerH * 0.76;
        const ratio = Math.min(maxW / logo.naturalWidth, maxH / logo.naturalHeight);
        logoW = Math.round(logo.naturalWidth * ratio);
        const logoH = Math.round(logo.naturalHeight * ratio);
        const logoX = pad + 4, logoY = Math.round((headerH - logoH) / 2);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(logoX - 3, logoY - 3, logoW + 6, logoH + 6);
        ctx.drawImage(logo, logoX, logoY, logoW, logoH);
      } catch { /* Keep company name visible when a signed logo URL has expired or CORS fails. */ }
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    const nameX = logoW ? pad + logoW + (w - pad * 2 - logoW) / 2 : w / 2;
    const nameMax = logoW ? w - logoW - pad * 3 : w - pad * 2;
    fittedText(ctx, brand.name, nameX, headerH * 0.52, nameMax, Math.round(headerH * 0.24), 9);

    const contentY = headerH + Math.round(h * 0.045);
    const bottom = h - Math.round(h * 0.055);
    const qrSide = Math.floor(Math.min(h * 0.54, w * 0.30, bottom - contentY - h * 0.08));
    const qrX = pad + Math.round(w * 0.02);
    const qrY = contentY;
    const qrImage = await imageFromUrl(qr);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(qrImage, qrX, qrY, qrSide, qrSide);
    ctx.imageSmoothingEnabled = true;
    ctx.fillStyle = green;
    ctx.textAlign = "center";
    fittedText(ctx, "SCAN MACHINE RECORD", qrX + qrSide / 2, qrY + qrSide + h * 0.042, qrSide + pad * 2, Math.round(h * 0.033), 8);

    const dividerX = qrX + qrSide + Math.round(w * 0.035);
    ctx.fillStyle = green;
    ctx.fillRect(dividerX, contentY, Math.max(2, w * 0.004), bottom - contentY);
    const rightX = dividerX + Math.round(w * 0.035);
    const rightW = w - rightX - pad;
    const titleY = contentY + h * 0.035;
    ctx.textAlign = "left";
    ctx.fillStyle = green;
    fittedText(ctx, "MACHINE RECORD", rightX, titleY, rightW, Math.round(h * 0.063), 9);
    ctx.fillStyle = "#111827";
    fittedText(ctx, `${make} ${model}`.trim() || "Machine", rightX, contentY + h * 0.18, rightW, Math.round(h * 0.087), 10);
    ctx.fillStyle = green;
    fittedText(ctx, "MODEL", rightX, contentY + h * 0.33, rightW, Math.round(h * 0.06), 9);
    ctx.strokeStyle = green;
    ctx.lineWidth = Math.max(2, w * 0.002);
    const lineY = contentY + h * 0.48;
    ctx.beginPath(); ctx.moveTo(rightX, lineY); ctx.lineTo(rightX + rightW, lineY); ctx.stroke();
    ctx.strokeStyle = green;
    ctx.lineWidth = Math.max(3, w * 0.006);
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
    return canvas;
  };

  useEffect(() => {
    if (!open || !qr) return;
    let cancelled = false;
    setPreview("");
    drawLabel(sheet ? "63x38" : size)
      .then(canvas => { if (!cancelled) setPreview(canvas.toDataURL("image/png")); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : "Preview unavailable."); });
  return () => { cancelled = true; };
    // drawLabel uses the latest render's branding and machine details.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, qr, brand, make, model, size, sheet]);

  const download = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 3000);
  };

  const exportFile = async (format: "png" | "pdf") => {
    setBusy(true); setError("");
    try {
      const effectiveSize: Size = sheet ? "63x38" : size;
      const canvas = await drawLabel(effectiveSize);
      const imageData = canvas.toDataURL("image/png");
      const filename = `machine-${machineId.slice(0, 8)}-${sheet ? "A4-sheet" : size}`;
      if (format === "png" && !sheet) {
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("PNG export failed.")), "image/png"));
        download(blob, `${filename}.png`);
        return;
      }
      const pdf = await PDFDocument.create();
      const embedded = await pdf.embedPng(imageData);
      if (sheet) {
        // 3 x 7, 63.5 x 38.1 mm, centered on A4 (not a proprietary sheet template).
        const page = pdf.addPage([210 * MM_TO_PT, 297 * MM_TO_PT]);
        const labelW = 63.5 * MM_TO_PT, labelH = 38.1 * MM_TO_PT;
        const left = (page.getWidth() - labelW * 3) / 2;
        const top = (page.getHeight() - labelH * 7) / 2;
        for (let i = 0; i < copies; i++) {
          const col = i % 3, row = Math.floor(i / 3);
          page.drawImage(embedded, { x: left + col * labelW, y: page.getHeight() - top - (row + 1) * labelH, width: labelW, height: labelH });
        }
      } else {
        const [widthMm, heightMm] = SIZES[size];
        const page = pdf.addPage([widthMm * MM_TO_PT, heightMm * MM_TO_PT]);
        page.drawImage(embedded, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
      }
      const bytes = await pdf.save();
      download(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), `${filename}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to export sticker.");
    } finally { setBusy(false); }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 text-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Machine QR sticker</h2>
          <p className="text-sm text-slate-600">Company-branded machine identification label.</p>
        </div>
        <button type="button" onClick={() => setOpen(value => !value)} className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
          {open ? "Close sticker" : "Create QR sticker"}
        </button>
      </div>
      {open && (
        <div className="mt-4 space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sheet} onChange={event => setSheet(event.target.checked)} />
            A4 sticker sheet (3 columns × 7 rows, 63.5 × 38.1 mm)
          </label>
          {sheet ? (
            <label className="block text-sm">Number of labels (1–21)
              <input type="number" min={1} max={21} value={copies} onChange={event => setCopies(Math.max(1, Math.min(21, Number(event.target.value) || 1)))} className="ml-2 w-20 rounded border border-slate-300 bg-white px-2 py-1 text-slate-900" />
            </label>
          ) : (
            <label className="block text-sm">Portable label size
              <select value={size} onChange={event => setSize(event.target.value as Size)} className="ml-2 rounded border border-slate-300 bg-white px-2 py-1 text-slate-900">
                <option value="63x38">63.5 × 38.1 mm</option>
                <option value="50x30">50 × 30 mm</option>
                <option value="70x40">70 × 40 mm</option>
              </select>
            </label>
          )}
          <p className="text-xs text-slate-600">Print PDFs at 100% / Actual size. For portable Bluetooth label printers, save the individual PNG or PDF and open it in the printer's app. A4 placement must match your label stock.</p>
          <p className="text-xs text-amber-800">QR codes open the limited public machine passport without login. Private records still require authorised AgriCore access.</p>
          {open && !qr && !error && <p className="text-sm text-slate-600">Preparing secure machine passport QR code…</p>}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          {preview && (
            <>
              <div className="overflow-x-auto rounded-xl bg-slate-100 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Company-branded machine QR sticker preview" className="mx-auto h-auto max-w-full rounded shadow" style={{ width: sheet ? 500 : 580 }} />
              </div>
              <div className="flex flex-wrap gap-2">
                {!sheet && <button type="button" disabled={busy} onClick={() => void exportFile("png")} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-50">Save PNG</button>}
                <button type="button" disabled={busy} onClick={() => void exportFile("pdf")} className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
                  {busy ? "Preparing…" : sheet ? "Download A4 PDF" : "Download label PDF"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
