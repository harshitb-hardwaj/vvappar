"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthProvider, RequireAuth } from "@/components/layout/Auth";

const links = [
  ["Dashboard", "/dashboard"],
  ["Invoices", "/invoices"],
  ["Customers", "/customers"],
  ["Products", "/products"],
  ["Settings", "/settings"],
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <AuthProvider>
      <RequireAuth>
        <div className="min-h-screen pb-20 md:pb-0 md:pl-56">
          <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-56 flex-col bg-dark text-white p-5 gap-1">
            <p className="font-serif text-xl mb-6">✳ Vyapaar</p>
            {links.map(([l, h]) => (
              <Link key={h} href={h} className={`px-3 py-2 rounded-md text-sm ${path.startsWith(h) ? "bg-darkElev" : "opacity-70 hover:opacity-100"}`}>
                {l}
              </Link>
            ))}
            <Link href="/invoices/new" className="mt-4 bg-primary text-white text-center text-sm font-medium rounded-md py-2.5">+ Create Invoice</Link>
          </aside>
          <main className="max-w-3xl mx-auto p-4 md:p-8">{children}</main>
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-hairline flex justify-around py-2 text-xs">
            {links.map(([l, h]) => (
              <Link key={h} href={h} className={`px-2 py-1 ${path.startsWith(h) ? "text-primary font-semibold" : "text-muted"}`}>{l}</Link>
            ))}
          </nav>
        </div>
      </RequireAuth>
    </AuthProvider>
  );
}
