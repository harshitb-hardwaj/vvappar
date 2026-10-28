"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, fmt } from "@/lib/api";
import { Btn, Card, Empty } from "@/components/ui/ui";

export default function Products() {
  const [rows, setRows] = useState<Array<{ id: string; name: string; price: number; gst_rate: number; sku?: string }>>([]);
  const [q, setQ] = useState("");
  const load = () => api.get<typeof rows>(`/api/products${q ? `?q=${encodeURIComponent(q)}` : ""}`).then(setRows);
  useEffect(() => { load(); }, []);
  return (
    <div>
      <div className="flex justify-between items-center mb-4"><h1 className="font-serif text-3xl">Products</h1><Link href="/products/new"><Btn>+ Add</Btn></Link></div>
      <div className="flex gap-2 mb-4"><input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} /><Btn onClick={load}>Search</Btn></div>
      {!rows.length ? <Empty title="No products yet" sub="Add services or products you sell." action={<Link href="/products/new"><Btn>Add Product</Btn></Link>} /> :
        <div className="space-y-2">{rows.map((p) => <Link key={p.id} href={`/products/${p.id}`}><Card className="flex justify-between"><div><p className="text-sm font-medium">{p.name}</p><p className="text-xs text-muted">{p.sku || ""} · GST {p.gst_rate}%</p></div><p className="text-sm font-medium">{fmt(p.price)}</p></Card></Link>)}</div>}
    </div>
  );
}
