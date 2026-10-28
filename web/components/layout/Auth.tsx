"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth, firebaseConfigured } from "@/lib/firebase";

const Ctx = createContext<{ user: User | null; loading: boolean }>({ user: null, loading: true });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!firebaseConfigured) {
      setUser({ uid: "dev" } as User); // dev bypass
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);
  return <Ctx.Provider value={{ user, loading }}>{children}</Ctx.Provider>;
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const r = useRouter();
  useEffect(() => {
    if (!loading && !user) r.replace("/login");
  }, [loading, user, r]);
  if (loading) return <p className="p-8 text-muted">Loading…</p>;
  if (!user) return null;
  return <>{children}</>;
}
