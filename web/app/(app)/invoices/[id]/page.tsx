"use client";
import { use, useEffect, useState } from "react";
import { api, fmt } from "@/lib/api";
import { Badge, Btn, Card, Field, Secondary } from "@/components/ui/ui";

type Detail = {
  id: string; invoice_number: string; status: string; issue_date: string; due_date: string;
  subtotal: number; discount: number; taxable_amount: number; cgst: number; sgst: number; igst: number;
  total_tax: number; grand_total: number; amount_paid: number; amount_due: number; notes?: string; terms?: string;
  customer?: { name: string; address?: string; gstin?: string } | null;
  items: Array<{ description: string; hsn_sac?: string; quantity: number; unit?: string; unit_price: number; gst_rate: number; total: number }>;
  payments: Array<{ id: string; amount: number; payment_method: string; paid_at: string; reference_number?: string }>;
};

export default function InvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [inv, setInv] = useState<Detail | null>(null);
  const [err, setErr] = useState("");
  const [pay, setPay] = useState({ amount: "", method: "UPI", ref: "" });
  const [busy, setBusy] = useState("");
  const load = () => api.get<Detail>(`/api/invoices/${id}`).then(setInv).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [id]);
  if (err) return <p className="text-red-600">{err}</p>;
  if (!inv) return <p className="text-muted">Loading invoice…</p>;

  const download = async () => {
    setBusy("Generating PDF…");
    try {
      const h = await api.authHeaders();
      delete h["Content-Type"];
      const res = await fetch(`${api.base}/api/invoices/${id}/pdf`, { headers: h });
      if (!res.ok) throw new Error("PDF failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${inv.invoice_number}.pdf`;
      a.click();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(""); }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex justify-between items-start mb-4">
        <div><h1 className="font-serif text-3xl">{inv.invoice_number}</h1><p className="text-sm text-muted">{inv.customer?.name} · {inv.issue_date} → {inv.due_date}</p></div>
        <Badge s={inv.status} />
      </div>
      <p className="text-sm text-muted -mt-2 mb-4">
        {inv.status === "PAID" ? `Fully paid — ${fmt(inv.amount_paid)} received.` :
         inv.status === "PARTIALLY_PAID" ? `${fmt(inv.amount_paid)} received — ${fmt(inv.amount_due)} still due.` :
         inv.status === "OVERDUE" ? `${fmt(inv.amount_due)} still due — was due on ${inv.due_date}.` :
         inv.status === "UNPAID" ? `Nothing received yet — ${fmt(inv.grand_total)} due by ${inv.due_date}.` : ""}
      </p>

      <Card>
        {inv.items.map((it, i) => (
          <div key={i} className="flex justify-between text-sm py-2 border-b border-hairline last:border-0">
            <div><p className="font-medium">{it.description}</p><p className="text-xs text-muted">{it.quantity} {it.unit || ""} × {fmt(it.unit_price)} · GST {it.gst_rate}%</p></div>
            <p className="font-medium">{fmt(it.total)}</p>
          </div>
        ))}
        <div className="mt-3 text-sm">
          {[["Subtotal", inv.subtotal], ["Taxable", inv.taxable_amount], ["CGST", inv.cgst], ["SGST", inv.sgst], ["IGST", inv.igst], ["Grand total", inv.grand_total], ["Paid", inv.amount_paid], ["Due", inv.amount_due]].filter(([, v]) => v).map(([l, v]) => (
            <p key={l} className="flex justify-between py-0.5"><span className="text-muted">{l}</span><span className="font-medium">{fmt(v as number)}</span></p>
          ))}
        </div>
      </Card>

      <div className="flex gap-2 mt-4 flex-wrap">
        <Btn onClick={download} disabled={!!busy}>{busy || "Download PDF"}</Btn>
        <Secondary onClick={() => window.print()}>Print</Secondary>
        {inv.status !== "CANCELLED" && inv.status !== "PAID" && (
          <Secondary onClick={async () => {
            if (!confirm(`Cancel ${inv.invoice_number}?`)) return;
            await api.post(`/api/invoices/${id}/cancel`, {});
            load();
          }}>Cancel invoice</Secondary>
        )}
      </div>

      <h2 className="font-medium mt-6 mb-2">Record payment</h2>
      <Card>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Amount ₹"><input value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} inputMode="decimal" /></Field>
          <Field label="Method"><select value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>{["UPI", "CASH", "BANK_TRANSFER", "CARD", "OTHER"].map((m) => <option key={m}>{m}</option>)}</select></Field>
          <Field label="Ref #"><input value={pay.ref} onChange={(e) => setPay({ ...pay, ref: e.target.value })} /></Field>
        </div>
        <Btn disabled={!pay.amount} onClick={async () => {
          setBusy("Recording payment…");
          try {
            await api.post(`/api/invoices/${id}/payments`, { amount: Math.round(parseFloat(pay.amount) * 100), payment_method: pay.method, reference_number: pay.ref || null });
            setPay({ amount: "", method: "UPI", ref: "" });
            load();
          } catch (e) { setErr((e as Error).message); }
          finally { setBusy(""); }
        }}>{busy === "Recording payment…" ? busy : "Record payment"}</Btn>
      </Card>

      <h2 className="font-medium mt-6 mb-2">Payments</h2>
      {!inv.payments.length ? <p className="text-sm text-muted">No payments yet.</p> :
        inv.payments.map((p) => <Card key={p.id} className="mb-2 flex justify-between text-sm"><span>{p.paid_at} · {p.payment_method} {p.reference_number || ""}</span><span className="font-medium">{fmt(p.amount)}</span></Card>)}
    </div>
  );
}
