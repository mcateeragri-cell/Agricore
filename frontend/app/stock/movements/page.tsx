"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { loadActiveCompany } from "@/lib/company-context-client";
import { loadClientBranchContext } from "@/lib/branches/client";
import Card from "../../../Components/ui/Card";
import StockProNav from "../../../Components/stock/StockProNav";

type Item = { id: string; part_number: string | null; description: string; quantity_in_stock: number };
type Movement = {
  id: string;
  stock_item_id: string;
  movement_type: string;
  quantity: number;
  reference: string | null;
  notes: string | null;
  created_at: string;
  stock_items?: { part_number: string | null; description: string } | null;
};

const labels: Record<string, string> = {
  opening_balance: "Opening balance",
  receipt: "Goods received",
  job_usage: "Used on job",
  job_return: "Returned from job",
  adjustment_in: "Adjustment in",
  adjustment_out: "Adjustment out",
  transfer_in: "Transfer in",
  transfer_out: "Transfer out",
};

function qty(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [itemId, setItemId] = useState("");
  const [direction, setDirection] = useState<"adjustment_in" | "adjustment_out">("adjustment_in");
  const [quantity, setQuantity] = useState("1");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const company = await loadActiveCompany();
      const branch = await loadClientBranchContext();
      const [{ data: itemData, error: itemError }, { data: movementData, error: movementError }] = await Promise.all([
        supabase.from("stock_items").select("id,part_number,description,quantity_in_stock").eq("company_id", company.id).eq("active", true).order("description"),
        supabase.from("stock_movements").select("id,stock_item_id,movement_type,quantity,reference,notes,created_at,stock_items(part_number,description)").eq("company_id", company.id).order("created_at", { ascending: false }).limit(250),
      ]);
      if (itemError) throw itemError;
      if (movementError) throw movementError;
      setItems((itemData ?? []) as Item[]);
      setMovements((movementData ?? []) as unknown as Movement[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load stock movements.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return movements;
    return movements.filter((m) => [m.stock_items?.part_number, m.stock_items?.description, labels[m.movement_type], m.reference, m.notes].some((v) => v?.toLowerCase().includes(q)));
  }, [movements, search]);

  async function submitAdjustment(event: FormEvent) {
    event.preventDefault();
    setError("");
    const amount = Number(quantity);
    if (!itemId || !Number.isFinite(amount) || amount <= 0) {
      setError("Choose a stock item and enter a quantity greater than zero.");
      return;
    }
    const item = items.find((row) => row.id === itemId);
    if (!item) return;
    const signed = direction === "adjustment_in" ? amount : -amount;
    const newQty = Number(item.quantity_in_stock) + signed;
    if (newQty < 0) {
      setError("That adjustment would make the stock quantity negative.");
      return;
    }
    setSaving(true);
    try {
      const company = await loadActiveCompany();
      const branch = await loadClientBranchContext();
      if (!branch.activeBranchId) throw new Error("Select a specific depot before making a stock adjustment.");
      const now = new Date().toISOString();
      const { error: updateError } = await supabase.from("stock_items").update({ quantity_in_stock: newQty, updated_at: now }).eq("id", itemId).eq("company_id", company.id);
      if (updateError) throw updateError;
      const { error: movementError } = await supabase.from("stock_movements").insert({ company_id: company.id, stock_item_id: itemId, branch_id: branch.activeBranchId, movement_type: direction, quantity: signed, reference: reference.trim() || null, notes: notes.trim() || null, created_at: now });
      if (movementError) {
        await supabase.from("stock_items").update({ quantity_in_stock: item.quantity_in_stock, updated_at: new Date().toISOString() }).eq("id", itemId).eq("company_id", company.id);
        throw movementError;
      }
      setItemId(""); setQuantity("1"); setReference(""); setNotes("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save adjustment.");
    } finally { setSaving(false); }
  }

  return (
    <div className="w-full space-y-6 px-5 py-5 lg:px-7">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold text-green-700">Stock Pro</p>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Stock movements</h1>
          <p className="mt-1 text-sm text-slate-500">Audit every receipt, job issue, return and manual adjustment.</p>
        </div>
        <StockProNav />
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <Card>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Manual adjustment</h2>
        <p className="mt-1 text-sm text-slate-500">Use this for stock counts, damaged parts or corrections. Job usage and purchase receipts are logged automatically.</p>
        <form onSubmit={submitAdjustment} className="mt-5 grid gap-3 lg:grid-cols-6">
          <select value={itemId} onChange={(e) => setItemId(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm lg:col-span-2 dark:border-slate-700 dark:bg-slate-900">
            <option value="">Choose stock item</option>
            {items.map((item) => <option key={item.id} value={item.id}>{item.part_number ? `${item.part_number} — ` : ""}{item.description} ({qty(item.quantity_in_stock)})</option>)}
          </select>
          <select value={direction} onChange={(e) => setDirection(e.target.value as typeof direction)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-900">
            <option value="adjustment_in">Add stock</option><option value="adjustment_out">Remove stock</option>
          </select>
          <input type="number" min="0.001" step="0.001" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-900" placeholder="Quantity" />
          <input value={reference} onChange={(e) => setReference(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-900" placeholder="Reference" />
          <button disabled={saving} className="rounded-xl bg-[#103d2e] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save adjustment"}</button>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-3 text-sm lg:col-span-6 dark:border-slate-700 dark:bg-slate-900" placeholder="Adjustment notes" rows={2} />
        </form>
      </Card>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Movement history</h2><p className="text-sm text-slate-500">Latest 250 movements in the active company.</p></div>
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900" placeholder="Search movements..." />
        </div>
        {loading ? <p className="py-10 text-center text-sm text-slate-500">Loading movements...</p> : filtered.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">No stock movements recorded yet.</p> : (
          <div className="mt-5 overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-3">Date</th><th className="px-3 py-3">Part</th><th className="px-3 py-3">Type</th><th className="px-3 py-3 text-right">Quantity</th><th className="px-3 py-3">Reference</th><th className="px-3 py-3">Notes</th></tr></thead><tbody>{filtered.map((m) => <tr key={m.id} className="border-b border-slate-100"><td className="px-3 py-3 whitespace-nowrap">{new Date(m.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</td><td className="px-3 py-3"><Link className="font-semibold text-green-800 hover:underline" href={`/stock/${m.stock_item_id}`}>{m.stock_items?.part_number ? `${m.stock_items.part_number} — ` : ""}{m.stock_items?.description ?? "Stock item"}</Link></td><td className="px-3 py-3">{labels[m.movement_type] ?? m.movement_type}</td><td className={`px-3 py-3 text-right font-bold ${Number(m.quantity) >= 0 ? "text-green-700" : "text-red-700"}`}>{Number(m.quantity) > 0 ? "+" : ""}{qty(m.quantity)}</td><td className="px-3 py-3">{m.reference || "—"}</td><td className="px-3 py-3 text-slate-500">{m.notes || "—"}</td></tr>)}</tbody></table></div>
        )}
      </Card>
    </div>
  );
}
