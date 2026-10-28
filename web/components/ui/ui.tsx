export function Btn({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: never }) {
  return <button {...p} className={`bg-primary hover:bg-primaryActive text-white rounded-md h-10 px-5 text-sm font-medium disabled:opacity-50 ${p.className || ""}`}>{children}</button>;
}
export function Secondary({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...p} className={`border border-hairline bg-white rounded-md h-10 px-4 text-sm ${p.className || ""}`}>{children}</button>;
}
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white border border-hairline rounded-xl p-4 md:p-5 ${className}`}>{children}</div>;
}
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block mb-3"><span className="text-xs text-muted block mb-1">{label}</span>{children}</label>;
}
export function Badge({ s }: { s: string }) {
  const map: Record<string, [string, string]> = {
    PAID: ["Paid", "bg-green-100 text-green-800"],
    UNPAID: ["Not paid", "bg-amber-100 text-amber-800"],
    PARTIALLY_PAID: ["Partly paid", "bg-blue-100 text-blue-800"],
    OVERDUE: ["Overdue", "bg-red-100 text-red-800"],
    DRAFT: ["Draft", "bg-gray-100 text-gray-700"],
    CANCELLED: ["Cancelled", "bg-gray-200 text-gray-500"],
  };
  const [label, cls] = map[s] || [s, "bg-card"];
  return <span className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}
export const statusLabel = (s: string) =>
  ({ PAID: "Paid", UNPAID: "Not paid", PARTIALLY_PAID: "Partly paid", OVERDUE: "Overdue", DRAFT: "Draft", CANCELLED: "Cancelled" } as Record<string, string>)[s] || s;
export function Empty({ title, sub, action }: { title: string; sub: string; action?: React.ReactNode }) {
  return <Card className="text-center py-10 bg-card"><h3 className="font-serif text-xl mb-1">{title}</h3><p className="text-sm text-muted mb-4">{sub}</p>{action}</Card>;
}
