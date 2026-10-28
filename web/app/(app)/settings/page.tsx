"use client";
import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth, firebaseConfigured } from "@/lib/firebase";
import { api } from "@/lib/api";
import { Btn, Card, Field } from "@/components/ui/ui";

export default function Settings() {
  const r = useRouter();
  const [f, setF] = useState<Record<string, string>>({ name: "", phone: "", email: "", address: "", city: "", state: "", pincode: "", gstin: "", invoice_prefix: "INV", upi_id: "", bank_name: "", account_number: "", ifsc: "" });
  const [msg, setMsg] = useState("");
  useEffect(() => { api.get("/api/business").then((b) => setF({ ...f, ...(b as object) })).catch(() => {}); }, []);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="max-w-lg">
      <h1 className="font-serif text-3xl mb-1">Business setup</h1>
      <p className="text-sm text-muted mb-4">Skip optional fields, complete them later.</p>
      <Card>
        {(["name", "phone", "email", "address", "city", "state", "pincode", "gstin", "invoice_prefix", "upi_id", "bank_name", "account_number", "ifsc"] as const).map((k) => (
          <Field key={k} label={k.replace("_", " ")}><input value={f[k] || ""} onChange={set(k)} /></Field>
        ))}
        {msg && <p className="text-sm text-green-700 mb-2">{msg}</p>}
        <Btn className="w-full" onClick={async () => {
          try { await api.patch("/api/business", { ...f, email: f.email || null }); setMsg("Saved ✓"); }
          catch (e) { setMsg((e as Error).message); }
        }}>Save business</Btn>
        <button className="text-sm text-muted mt-4" onClick={async () => {
          if (firebaseConfigured) await signOut(auth);
          r.replace("/login");
        }}>Log out</button>
      </Card>
    </div>
  );
}
