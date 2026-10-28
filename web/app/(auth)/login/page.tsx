"use client";
import { useState } from "react";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, firebaseConfigured } from "@/lib/firebase";
import { Btn, Card } from "@/components/ui/ui";

export default function Login() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const go = () => r.replace("/dashboard");
  if (!firebaseConfigured) {
    return <main className="max-w-sm mx-auto p-8"><Card>
      <h1 className="font-serif text-2xl mb-2">Sign in (dev mode)</h1>
      <p className="text-sm text-muted mb-4">Firebase not configured — dev bypass is on.</p>
      <Btn onClick={go} className="w-full">Continue to dashboard</Btn>
    </Card></main>;
  }
  return (
    <main className="max-w-sm mx-auto p-8">
      <h1 className="font-serif text-3xl mb-1">✳ Vyapaar</h1>
      <p className="text-sm text-muted mb-6">GST invoicing for small businesses.</p>
      <Card>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="mb-3" />
        <input placeholder="Password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="mb-3" />
        {err && <p className="text-red-600 text-sm mb-3">{err}</p>}
        <Btn className="w-full" disabled={loading} onClick={async () => {
          setLoading(true); setErr("");
          try { await signInWithEmailAndPassword(auth, email, pw); go(); }
          catch (e) { setErr((e as Error).message); }
          finally { setLoading(false); }
        }}>{loading ? "Signing in…" : "Sign in"}</Btn>
        <button className="w-full mt-2 text-sm border border-hairline rounded-md h-10" onClick={async () => {
          try { await signInWithPopup(auth, new GoogleAuthProvider()); go(); }
          catch (e) { setErr((e as Error).message); }
        }}>Continue with Google</button>
        <p className="text-sm text-muted mt-4">No account? <Link href="/register" className="text-primary">Register</Link></p>
      </Card>
    </main>
  );
}
