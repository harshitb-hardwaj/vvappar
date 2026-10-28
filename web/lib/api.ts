import { auth } from "./firebase";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";
const DEV_BYPASS =
  process.env.NEXT_PUBLIC_DEV_BYPASS === "true" ||
  !process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

async function headers(): Promise<Record<string, string>> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const t = await auth.currentUser?.getIdToken();
    if (t) h.Authorization = `Bearer ${t}`;
  } catch { /* no token */ }
  if (DEV_BYPASS) {
    h["x-dev-uid"] = localStorage.getItem("dev-uid") || "dev-user";
    h["x-dev-email"] = localStorage.getItem("dev-email") || "dev@example.com";
  }
  return h;
}

async function handle(res: Response) {
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error?.message || `Request failed (${res.status})`);
  }
  const j = await res.json();
  return j.data;
}

export const api = {
  get: async <T = any>(p: string): Promise<T> =>
    handle(await fetch(`${BASE}${p}`, { headers: await headers() })) as Promise<T>,
  post: async <T = any>(p: string, body?: unknown): Promise<T> =>
    handle(await fetch(`${BASE}${p}`, { method: "POST", headers: await headers(), body: JSON.stringify(body || {}) })) as Promise<T>,
  patch: async <T = any>(p: string, body?: unknown): Promise<T> =>
    handle(await fetch(`${BASE}${p}`, { method: "PATCH", headers: await headers(), body: JSON.stringify(body || {}) })) as Promise<T>,
  del: async <T = any>(p: string): Promise<T> =>
    handle(await fetch(`${BASE}${p}`, { method: "DELETE", headers: await headers() })) as Promise<T>,
  pdfUrl: (invoiceId: string) => `${BASE}/api/invoices/${invoiceId}/pdf`,
  authHeaders: headers,
  base: BASE,
};

export const fmt = (paise: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paise / 100);
