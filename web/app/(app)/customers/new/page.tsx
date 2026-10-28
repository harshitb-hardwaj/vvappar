"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Btn, Card, Field } from "@/components/ui/ui";

export default function NewCustomer() {
  const r = useRouter();
  const [f, setF] = useState({ name: "", phone: "", email: "", gstin: "", address: "", city: "", state: "", pincode: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="max-w-lg">
      <h1 className="font-serif text-3xl mb-4">Add customer</h1>
      <Card>
        <Field label="Name *"><input value={f.name} onChange={set("name")} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone"><input value={f.phone} onChange={set("phone")} /></Field>
          <Field label="Email"><input value={f.email} onChange={set("email")} /></Field>
        </div>
        <Field label="GSTIN"><input value={f.gstin} onChange={set("gstin")} placeholder="22AAAAA0000A1Z5" /></Field>
        <Field label="Address"><input value={f.address} onChange={set("address")} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="City"><input value={f.city} onChange={set("city")} /></Field>
          <Field label="State"><input value={f.state} onChange={set("state")} /></Field>
          <Field label="Pincode"><input value={f.pincode} onChange={set("pincode")} /></Field>
        </div>
        {err && <p className="text-red-600 text-sm mb-2">{err}</p>}
        <Btn className="w-full" disabled={loading || !f.name} onClick={async () => {
          setLoading(true);
          try { await api.post("/api/customers", { ...f, email: f.email || null }); r.push("/customers"); }
          catch (e) { setErr((e as Error).message); }
          finally { setLoading(false); }
        }}>{loading ? "Saving…" : "Save customer"}</Btn>
      </Card>
    </div>
  );
}
