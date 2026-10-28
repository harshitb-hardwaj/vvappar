"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Btn, Card, Field } from "@/components/ui/ui";

export default function NewProduct() {
  const r = useRouter();
  const [f, setF] = useState({ name: "", description: "", sku: "", hsn_sac: "", unit: "pcs", price: "1000", gst_rate: 18 });
  const [err, setErr] = useState("");
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: k === "gst_rate" ? Number(e.target.value) : e.target.value });
  return (
    <div className="max-w-lg">
      <h1 className="font-serif text-3xl mb-4">Add product / service</h1>
      <Card>
        <Field label="Name *"><input value={f.name} onChange={set("name")} /></Field>
        <Field label="Description"><input value={f.description} onChange={set("description")} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price ₹ *"><input value={f.price} onChange={set("price")} inputMode="decimal" /></Field>
          <Field label="GST %"><select value={f.gst_rate} onChange={set("gst_rate")}>{[0, 5, 12, 18, 28].map((g) => <option key={g} value={g}>{g}%</option>)}</select></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="SKU"><input value={f.sku} onChange={set("sku")} /></Field>
          <Field label="HSN/SAC"><input value={f.hsn_sac} onChange={set("hsn_sac")} /></Field>
          <Field label="Unit"><input value={f.unit} onChange={set("unit")} /></Field>
        </div>
        {err && <p className="text-red-600 text-sm mb-2">{err}</p>}
        <Btn className="w-full" disabled={!f.name} onClick={async () => {
          try {
            await api.post("/api/products", { ...f, price: Math.round(parseFloat(f.price || "0") * 100), sku: f.sku || null });
            r.push("/products");
          } catch (e) { setErr((e as Error).message); }
        }}>Save</Btn>
      </Card>
    </div>
  );
}
