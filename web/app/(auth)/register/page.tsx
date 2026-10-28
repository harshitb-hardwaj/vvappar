"use client";
import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, firebaseConfigured } from "@/lib/firebase";
import { Btn, Card } from "@/components/ui/ui";

export default function Register() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  return (
    <main className="max-w-sm mx-auto p-8">
      <h1 className="font-serif text-3xl mb-1">Create account</h1>
      <p className="text-sm text-muted mb-6">Start invoicing in minutes.</p>
      <Card>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="mb-3" />
        <input placeholder="Password (6+ chars)" type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="mb-3" />
        {err && <p className="text-red-600 text-sm mb-3">{err}</p>}
        <Btn className="w-full" onClick={async () => {
          if (!firebaseConfigured) { r.replace("/settings"); return; }
          try { await createUserWithEmailAndPassword(auth, email, pw); r.replace("/settings"); }
          catch (e) { setErr((e as Error).message); }
        }}>Register</Btn>
        <p className="text-sm text-muted mt-4"><Link href="/login" className="text-primary">Back to sign in</Link></p>
      </Card>
    </main>
  );
}
