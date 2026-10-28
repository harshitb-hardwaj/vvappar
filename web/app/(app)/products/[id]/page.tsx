"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Btn, Card, Field } from "@/components/ui/ui";

export default function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const r = useRouter();
  const [f, setF] = useState<{ name: string; price: number; gst_rate: number; sku?: string; hsn_sac?: string; unit?: string; description?: string } | null>(null);
  useEffect(() => { api.get(`/api/products/${id}`).then(setF); }, [id]);
  if (!f) return <p className="text-muted">Loading…</p>;
  return (
    <div className="max-w-lg">
      <h1 className="font-serif text-3xl mb-4">Edit product</h1>
      <Card>
        <Field label="Name"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Price (paise)"><input type="number" value={f.price} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} /></Field>
        <Field label="GST %"><input type="number" value={f.gst_rate} onChange={(e) => setF({ ...f, gst_rate: Number(e.target.value) })} /></Field>
        <div className="flex gap-2">
          <Btn onClick={async () => { await api.patch(`/api/products/${id}`, f); r.push("/products"); }}>Save</Btn>
          <button className="text-sm text-red-600 border border-hairline rounded-md px-4" onClick={async () => { if (confirm("Delete?")) { await api.del(`/api/products/${id}`); r.push("/products"); } }}>Delete</button>
        </div>
      </Card>
    </div>
  );
}
