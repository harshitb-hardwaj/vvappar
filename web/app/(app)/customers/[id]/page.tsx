"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api, fmt } from "@/lib/api";
import { Badge, Card } from "@/components/ui/ui";

export default function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [c, setC] = useState<{ name: string; phone?: string; email?: string; address?: string; city?: string; state?: string; gstin?: string; stats: { totalInvoiced: number; totalPaid: number; outstanding: number }; invoices: Array<{ id: string; invoice_number: string; grand_total: number; status: string }> } | null>(null);
  useEffect(() => { api.get(`/api/customers/${id}`).then(setC); }, [id]);
  if (!c) return <p className="text-muted">Loading…</p>;
  return (
    <div>
      <h1 className="font-serif text-3xl mb-1">{c.name}</h1>
      <p className="text-sm text-muted mb-4">{[c.phone, c.email, c.address, c.city, c.state].filter(Boolean).join(" · ")}</p>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <Card><p className="text-xs text-muted">Invoiced</p><p className="font-serif text-lg">{fmt(c.stats.totalInvoiced)}</p></Card>
        <Card><p className="text-xs text-muted">Paid</p><p className="font-serif text-lg">{fmt(c.stats.totalPaid)}</p></Card>
        <Card><p className="text-xs text-muted">Due</p><p className="font-serif text-lg">{fmt(c.stats.outstanding)}</p></Card>
      </div>
      <h2 className="font-medium mb-2">Invoices</h2>
      <div className="space-y-2">{c.invoices.map((i) => <Link key={i.id} href={`/invoices/${i.id}`}><Card className="flex justify-between"><span className="text-sm">{i.invoice_number}</span><span className="text-sm">{fmt(i.grand_total)} <Badge s={i.status} /></span></Card></Link>)}</div>
    </div>
  );
}
