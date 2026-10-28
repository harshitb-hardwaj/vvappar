"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, fmt } from "@/lib/api";
import { Btn, Card, Field, Secondary } from "@/components/ui/ui";
import { calculateInvoiceTotals } from "@invoice/shared";

type Item = { product_id?: string; description: string; quantity: number; unit_price: number; discount: number; gst_rate: number; hsn_sac?: string; unit?: string };

export default function NewInvoice() {
  const r = useRouter();
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string; price: number; gst_rate: number; hsn_sac?: string; unit?: string }>>([]);
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<Item[]>([{ description: "", quantity: 1, unit_price: 0, discount: 0, gst_rate: 18 }]);
  const [issue, setIssue] = useState(new Date().toISOString().slice(0, 10));
  const [due, setDue] = useState(new Date(Date.now() + 15 * 864e5).toISOString().slice(0, 10));
  const [inter, setInter] = useState(false);
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<typeof customers>("/api/customers").then(setCustomers).catch(() => {});
    api.get<typeof products>("/api/products").then(setProducts).catch(() => {});
  }, []);

  const totals = useMemo(() => {
    try {
      const valid = items.filter((i) => i.description && i.quantity > 0);
      if (!valid.length) return null;
      return calculateInvoiceTotals(valid.map((i) => ({ ...i, unit_price: Math.round(i.unit_price) })), { isInterState: inter });
    } catch { return null; }
  }, [items, inter]);

  const upd = (idx: number, patch: Partial<Item>) =>
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const save = async (status: "DRAFT" | "UNPAID") => {
    setErr(""); setSaving(true);
    try {
      const payload = {
        customer_id: customerId,
        issue_date: issue,
        due_date: due,
        is_inter_state: inter,
        discount: 0,
        notes: notes || null,
        status,
        items: items.map((i) => ({
          product_id: i.product_id || null,
          description: i.description,
          quantity: Number(i.quantity),
          unit_price: Math.round(Number(i.unit_price)),
          discount: Math.round(Number(i.discount) || 0),
          gst_rate: Number(i.gst_rate),
          hsn_sac: i.hsn_sac || null,
          unit: i.unit || null,
        })),
      };
      const inv = await api.post<{ id: string }>("/api/invoices", payload);
      r.push(`/invoices/${inv.id}`);
    } catch (e) { setErr((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-3xl mb-4">New invoice</h1>
      <Card>
        <Field label="Customer *">
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Select customer…</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Issue date"><input type="date" value={issue} onChange={(e) => setIssue(e.target.value)} /></Field>
          <Field label="Due date"><input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
        </div>
        <label className="text-sm flex gap-2 items-center mb-4"><input type="checkbox" checked={inter} onChange={(e) => setInter(e.target.checked)} className="w-4" /> Inter-state (IGST instead of CGST+SGST)</label>
      </Card>

      <h2 className="font-medium mt-5 mb-2">Items</h2>
      {items.map((it, idx) => (
        <Card key={idx} className="mb-2">
          <Field label="Product (optional)">
            <select value={it.product_id || ""} onChange={(e) => {
              const p = products.find((x) => x.id === e.target.value);
              upd(idx, p ? { product_id: p.id, description: p.name, unit_price: p.price, gst_rate: p.gst_rate, hsn_sac: p.hsn_sac, unit: p.unit } : { product_id: undefined });
            }}>
              <option value="">Custom…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name} — {fmt(p.price)}</option>)}
            </select>
          </Field>
          <Field label="Description *"><input value={it.description} onChange={(e) => upd(idx, { description: e.target.value })} /></Field>
          <div className="grid grid-cols-4 gap-2">
            <Field label="Qty"><input type="number" min={0} step="any" value={it.quantity} onChange={(e) => upd(idx, { quantity: Number(e.target.value) })} /></Field>
            <Field label="Price ₹"><input type="number" min={0} value={Math.round(it.unit_price / 100)} onChange={(e) => upd(idx, { unit_price: Number(e.target.value) * 100 })} /></Field>
            <Field label="GST %"><input type="number" min={0} value={it.gst_rate} onChange={(e) => upd(idx, { gst_rate: Number(e.target.value) })} /></Field>
            <Field label="Disc ₹"><input type="number" min={0} value={Math.round(it.discount / 100)} onChange={(e) => upd(idx, { discount: Number(e.target.value) * 100 })} /></Field>
          </div>
          <button className="text-xs text-red-600" onClick={() => setItems(items.filter((_, i) => i !== idx))}>Remove</button>
        </Card>
      ))}
      <Secondary onClick={() => setItems([...items, { description: "", quantity: 1, unit_price: 0, discount: 0, gst_rate: 18 }])}>+ Add item</Secondary>

      {totals && (
        <Card className="mt-4 bg-card">
          <h3 className="font-serif text-lg mb-2">Preview</h3>
          {[["Subtotal", totals.subtotal], ["Taxable", totals.taxable_amount], ...(inter ? [["IGST", totals.igst]] : [["CGST", totals.cgst], ["SGST", totals.sgst]]), ["Total", totals.grand_total]].map(([l, v]) => (
            <p key={l} className="flex justify-between text-sm py-0.5"><span className="text-muted">{l}</span><span className="font-medium">{fmt(v as number)}</span></p>
          ))}
        </Card>
      )}

      <Field label="Notes"><input value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      {err && <p className="text-red-600 text-sm my-2">{err}</p>}
      <div className="flex gap-2 mt-3">
        <Secondary onClick={() => save("DRAFT")} disabled={saving || !customerId}>Save Draft</Secondary>
        <Btn onClick={() => save("UNPAID")} disabled={saving || !customerId || !totals}>{saving ? "Creating invoice…" : "Save Invoice"}</Btn>
      </div>
    </div>
  );
}
