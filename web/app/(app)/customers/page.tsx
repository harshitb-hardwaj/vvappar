"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Btn, Card, Empty } from "@/components/ui/ui";

export default function Customers() {
  const [rows, setRows] = useState<Array<{ id: string; name: string; phone?: string; email?: string }>>([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const load = () => api.get<typeof rows>(`/api/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`).then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  return (
    <div>
      <div className="flex justify-between items-center mb-4"><h1 className="font-serif text-3xl">Customers</h1><Link href="/customers/new"><Btn>+ Add</Btn></Link></div>
      <div className="flex gap-2 mb-4"><input placeholder="Search name, phone, email…" value={q} onChange={(e) => setQ(e.target.value)} /><Btn onClick={load}>Search</Btn></div>
      {err && <p className="text-red-600 text-sm mb-2">{err}</p>}
      {!rows.length ? <Empty title="No customers yet" sub="Add your first customer to start invoicing." action={<Link href="/customers/new"><Btn>Add Customer</Btn></Link>} /> :
        <div className="space-y-2">{rows.map((c) => <Link key={c.id} href={`/customers/${c.id}`}><Card><p className="font-medium text-sm">{c.name}</p><p className="text-xs text-muted">{c.phone || ""} {c.email || ""}</p></Card></Link>)}</div>}
    </div>
  );
}
