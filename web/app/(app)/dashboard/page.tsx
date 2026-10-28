"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, fmt } from "@/lib/api";
import { Badge, Btn, Card, Empty } from "@/components/ui/ui";

export default function Dashboard() {
  const [d, setD] = useState<{ revenue: number; paid: number; outstanding: number; overdue: number; recent: Array<{ id: string; invoice_number: string; customer: string; issue_date: string; grand_total: number; status: string }> } | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { api.get("/api/dashboard").then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <p className="text-red-600 p-4">{err}</p>;
  if (!d) return <p className="p-4 text-muted">Loading dashboard…</p>;
  const stats = [["Revenue (month)", d.revenue], ["Paid (month)", d.paid], ["Outstanding", d.outstanding], ["Overdue", d.overdue]] as const;
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-serif text-3xl">Dashboard</h1>
        <Link href="/invoices/new"><Btn>+ Create Invoice</Btn></Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {stats.map(([l, v]) => <Card key={l}><p className="text-xs text-muted">{l}</p><p className="font-serif text-xl">{fmt(v)}</p></Card>)}
      </div>
      <div className="flex gap-2 mb-5">
        <Link href="/customers/new" className="text-sm border border-hairline bg-white rounded-md px-4 py-2">+ Add Customer</Link>
        <Link href="/products/new" className="text-sm border border-hairline bg-white rounded-md px-4 py-2">+ Add Product</Link>
      </div>
      <h2 className="font-medium mb-2">Recent invoices</h2>
      {!d.recent.length ? <Empty title="No invoices yet" sub="Create your first invoice in less than a minute." action={<Link href="/invoices/new"><Btn>Create Invoice</Btn></Link>} /> :
        <div className="space-y-2">{d.recent.map((i) => (
          <Link key={i.id} href={`/invoices/${i.id}`}><Card className="flex justify-between items-center">
            <div><p className="font-medium text-sm">{i.invoice_number} · {i.customer}</p><p className="text-xs text-muted">{i.issue_date}</p></div>
            <div className="text-right"><p className="text-sm font-medium">{fmt(i.grand_total)}</p><Badge s={i.status} /></div>
          </Card></Link>))}
        </div>}
    </div>
  );
}
