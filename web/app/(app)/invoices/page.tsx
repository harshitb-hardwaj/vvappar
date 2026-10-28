"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, fmt } from "@/lib/api";
import { Badge, Btn, Card, Empty } from "@/components/ui/ui";

const FILTERS: Array<[string, string]> = [["All", "All"], ["DRAFT", "Draft"], ["UNPAID", "Not paid"], ["PARTIALLY_PAID", "Partly paid"], ["PAID", "Paid"], ["OVERDUE", "Overdue"], ["CANCELLED", "Cancelled"]];

export default function Invoices() {
  const [rows, setRows] = useState<Array<{ id: string; invoice_number: string; customer?: { name: string } | null; issue_date: string; due_date: string; grand_total: number; amount_paid: number; amount_due: number; status: string }>>([]);
  const [status, setStatus] = useState("All");
  const [q, setQ] = useState("");
  const load = () => api.get<typeof rows>(`/api/invoices?status=${status}${q ? `&q=${encodeURIComponent(q)}` : ""}`).then(setRows);
  useEffect(() => { load(); }, [status]);
  return (
    <div>
      <div className="flex justify-between items-center mb-4"><h1 className="font-serif text-3xl">Invoices</h1><Link href="/invoices/new"><Btn>+ Create</Btn></Link></div>
      <div className="flex gap-2 mb-3"><input placeholder="Search number / customer…" value={q} onChange={(e) => setQ(e.target.value)} /><Btn onClick={load}>Go</Btn></div>
      <div className="flex gap-1.5 overflow-x-auto mb-1">
        {FILTERS.map(([v, l]) => <button key={v} onClick={() => setStatus(v)} className={`text-xs px-3 py-1.5 rounded-md whitespace-nowrap ${status === v ? "bg-card font-semibold" : "text-muted"}`}>{l}</button>)}
      </div>
      <p className="text-xs text-muted mb-4">Not paid = nothing received yet · Partly paid = some received · Paid = fully received · Overdue = past due date with money due.</p>
      {!rows.length ? <Empty title="No invoices yet" sub="Create your first invoice in less than a minute." action={<Link href="/invoices/new"><Btn>Create Invoice</Btn></Link>} /> :
        <div className="space-y-2">{rows.map((i) => (
          <Link key={i.id} href={`/invoices/${i.id}`}><Card className="flex justify-between items-center">
            <div><p className="text-sm font-medium">{i.invoice_number} · {i.customer?.name || ""}</p><p className="text-xs text-muted">{i.issue_date} → {i.due_date}</p></div>
            <div className="text-right"><p className="text-sm font-medium">{fmt(i.grand_total)}</p><p className="text-xs text-muted">due {fmt(i.amount_due)}</p><Badge s={i.status} /></div>
          </Card></Link>))}
        </div>}
    </div>
  );
}
