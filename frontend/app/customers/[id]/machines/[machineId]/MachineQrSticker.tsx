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

/**
 * Internal-only machine QR sticker.
 * Encodes the existing authenticated machine profile URL; it does not create
 * public machine access or bypass Supabase permissions.
 */
export default function MachineQrSticker({
  customerId, machineId, make, model, companyLabel, companyId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState("");
  const [brand, setBrand] = useState({ name: companyLabel, colour: "#103D2E", logoUrl: "" });
  const [copies, setCopies] = useState(1);
  const [sheet, setSheet] = useState(false);
  const [error, setError] = useState("");
  const [labelSize, setLabelSize] = useState<"63x38" | "50x30" | "70x40">("63x38");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setBrand({ name: companyLabel, colour: "#103D2E", logoUrl: "" });
    fetch("/api/machines/qr-branding", { credentials: "same-origin", cache: "no-store" })
      .then(async r => { if (!r.ok) throw new Error("Branding unavailable"); return r.json(); })
      .then((data: { companyId: string; name: string; colour: string; logoUrl: string | null }) => {
        if (!cancelled && data.companyId === companyId) {
          setBrand({ name: data.name || companyLabel, colour: data.colour, logoUrl: data.logoUrl || "" });
        }
      }).catch(() => {});
    return () => { cancelled = true; };
  }, [companyLabel, companyId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const url = `${window.location.origin}/customers/${encodeURIComponent(customerId)}/machines/${encodeURIComponent(machineId)}`;
    QRCode.toDataURL(url, { width: 420, margin: 2, errorCorrectionLevel: "M" })
      .then((data) => { if (!cancelled) { setQr(data); setError(""); } })
      .catch(() => { if (!cancelled) setError("Could not generate QR code."); });
    return () => { cancelled = true; };
  }, [open, customerId, machineId]);

  const dimensions = labelSize === "50x30" ? [50, 30] : labelSize === "70x40" ? [70, 40] : [63.5, 38.1];

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const drawLabel = async () => {
    if (!qr) throw new Error("QR code is not ready.");
    const [widthMm, heightMm] = dimensions;
    const pxPerMm = 12; // ~305 DPI for export
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(widthMm * pxPerMm);
    canvas.height = Math.round(heightMm * pxPerMm);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Image export is unavailable on this device.");

    const w = canvas.width;
    const h = canvas.height;
    const headerH = Math.round(h * 0.22);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = brand.colour;
    ctx.fillRect(0, 0, w, headerH);

    const loadImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Image failed to load."));
      img.src = url;
    });

    let logoWidth = 0;
    if (brand.logoUrl) {
      try {
        const logo = await loadImage(brand.logoUrl);
        const maxH = headerH * 0.75;
        const maxW = w * 0.15;
        const scale = Math.min(maxW / logo.width, maxH / logo.height);
        logoWidth = Math.round(logo.width * scale);
        const logoH = Math.round(logo.height * scale);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(8, (headerH - logoH) / 2 - 2, logoWidth + 4, logoH + 4);
        ctx.drawImage(logo, 10, (headerH - logoH) / 2, logoWidth, logoH);
      } catch {
        // Some storage/CDN configurations disallow canvas image reads.
        // Export a usable branded text label rather than failing.
      }
    }
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${Math.round(headerH * 0.33)}px Arial, sans-serif`;
    ctx.textAlign = "center";
    const name = brand.name.length > 42 ? `${brand.name.slice(0, 39)}…` : brand.name;
    const textX = (w + logoWidth) / 2;
    const availableWidth = w - logoWidth - 22;
    ctx.fillText(name, textX, headerH * 0.63, availableWidth);

    const qrImage = await loadImage(qr);
    const qrSide = Math.round(Math.min(h * 0.55, w * 0.36));
    const qrX = Math.round((w - qrSide) / 2);
    const qrY = headerH + 3;
    ctx.drawImage(qrImage, qrX, qrY, qrSide, qrSide);

    ctx.fillStyle = brand.colour;
    ctx.textAlign = "center";
    ctx.font = `bold ${Math.max(11, Math.round(h * 0.043))}px Arial, sans-serif`;
    const captionY = Math.min(h - 28, qrY + qrSide + 13);
    ctx.fillText("SCAN MACHINE RECORD", w / 2, captionY, w - 20);
    ctx.fillStyle = "#111111";
    ctx.font = `${Math.max(10, Math.round(h * 0.038))}px Arial, sans-serif`;
    ctx.fillText(`${make} ${model}`.trim(), w / 2, Math.min(h - 15, captionY + 15), w - 20);
    ctx.fillText("Model: __________________", w / 2, h - 4, w - 20);
    return canvas;
  };

  const exportLabel = async (format: "png" | "pdf") => {
    setBusy(true);
    setError("");
    try {
      const canvas = await drawLabel();
      const png = canvas.toDataURL("image/png");
      const filename = `machine-${machineId.slice(0, 8)}-${labelSize}`;
      if (format === "png") {
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob((value) => value ? resolve(value) : reject(new Error("PNG export failed.")), "image/png")
        );
        downloadBlob(blob, `${filename}.png`);
      } else {
        const doc = await PDFDocument.create();
        const [widthMm, heightMm] = dimensions;
        const mmToPt = 72 / 25.4;
        const page = doc.addPage([widthMm * mmToPt, heightMm * mmToPt]);
        const image = await doc.embedPng(png);
        page.drawImage(image, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
        const bytes = await doc.save();
        downloadBlob(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), `${filename}.pdf`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to export label.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Machine QR sticker</h2>
          <p className="text-sm text-slate-600">Print a company-branded sticker for authorised AgriCore users.</p>
        </div>
        <button type="button" onClick={() => setOpen((value) => !value)}
          className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900">
          {open ? "Close sticker" : "Create QR sticker"}
        </button>
      </div>
      {open && (
        <div className="mt-4 space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sheet} onChange={e => setSheet(e.target.checked)} />
            Print A4 label sheet (3 columns × 7 rows)
          </label>
          {sheet && <label className="text-sm">Number of labels:
            <input type="number" min={1} max={21} value={copies} onChange={e => setCopies(Math.max(1, Math.min(21, Number(e.target.value) || 1)))} className="ml-2 w-16 rounded border px-2 py-1" />
          </label>}
          <label className="block text-sm font-medium text-slate-700">
            Portable label dimensions
            <select value={labelSize} onChange={e => setLabelSize(e.target.value as typeof labelSize)}
              className="ml-2 rounded border border-slate-300 bg-white px-2 py-1">
              <option value="63x38">63.5 × 38.1 mm</option>
              <option value="50x30">50 × 30 mm</option>
              <option value="70x40">70 × 40 mm</option>
            </select>
          </label>
          <p className="text-xs text-slate-600">
            Export PNG or exact-size PDF for your printer app on iPhone, iPad or Android, or a desktop printer driver.
            The A4 sheet layout stays at 63.5 × 38.1 mm.
          </p>
          <p className="text-xs text-amber-800">
            QR codes open the existing login-protected machine profile. They do not give customers public access.
          </p>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          {qr && (
            <>
              <div id="agricore-qr-print" className={sheet ? "agricore-qr-sheet" : "agricore-qr-single"}>
                {Array.from({ length: sheet ? copies : 1 }, (_, i) => (
                  <div className="agricore-qr-sticker" key={i} style={{ borderColor: brand.colour }}>
                    <div className="agricore-qr-header" style={{ backgroundColor: brand.colour }}>
                      {brand.logoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={brand.logoUrl} alt="" className="agricore-qr-logo" />
                      )}
                      <strong>{brand.name}</strong>
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qr} alt="Machine QR code" className="agricore-qr-code" />
                    <strong className="agricore-qr-caption">SCAN MACHINE RECORD</strong>
                    <span>{make} {model}</span>
                    <span>Model: ________________</span>
                  </div>
                ))}
              </div>
              <div>
                <button type="button" onClick={() => window.print()}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
                  Print sticker
                </button>
                <button type="button" disabled={busy} onClick={() => void exportLabel("png")}
                  className="ml-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">
                  Save PNG
                </button>
                <button type="button" disabled={busy} onClick={() => void exportLabel("pdf")}
                  className="ml-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">
                  Save label PDF
                </button>
              </div>
            </>
          )}
          <style jsx global>{`
            #agricore-qr-print { display: grid; gap: 6px; }
            .agricore-qr-sheet { grid-template-columns: repeat(3, 63.5mm); }
            .agricore-qr-sticker { box-sizing: border-box; width: 63.5mm; height: 38.1mm; overflow: hidden; border: 1px solid; display: flex; flex-direction: column; align-items: center; background: white; color: black; font-size: 7px; break-inside: avoid; }
            .agricore-qr-header { box-sizing: border-box; height: 9mm; width: 100%; color: white; display: flex; align-items: center; justify-content: center; gap: 4px; padding: 2px; text-align: center; font-size: 9px; }
            .agricore-qr-logo { max-height: 7mm; max-width: 12mm; object-fit: contain; background: white; }
            .agricore-qr-code { width: 17mm; height: 17mm; }
            .agricore-qr-caption { font-size: 7px; }
            @media print {
              @page { size: A4 portrait; margin: 0; }
              body * { visibility: hidden !important; }
              #agricore-qr-print, #agricore-qr-print * { visibility: visible !important; }
              #agricore-qr-print { position: fixed !important; left: 9.75mm !important; top: 14.85mm !important; gap: 0 !important; }
              #agricore-qr-print.agricore-qr-single { left: 12mm !important; top: 12mm !important; }
              .agricore-qr-sticker { print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
            }
          `}</style>
        </div>
      )}
    </section>
  );
}
