import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { customers, invoices } from "../db/schema.js";
import { isOverdue } from "@invoice/shared";
import { ok } from "../lib/http.js";
import type { Db } from "../db/index.js";
import type { AuthContext } from "../middleware/auth.js";

type V = { db: Db; auth: AuthContext };
export const dashboardRoutes = new Hono<{ Variables: V }>();

dashboardRoutes.get("/", async (c) => {
  const db = c.get("db");
  const auth = c.get("auth");
  const businessId = auth.businessId!;
  const rows = await db.select().from(invoices).where(eq(invoices.business_id, businessId));
  const live = rows.filter((i) => i.status !== "CANCELLED" && i.status !== "DRAFT");
  const monthPrefix = new Date().toISOString().slice(0, 7); // YYYY-MM
  const inMonth = live.filter((i) => i.issue_date.startsWith(monthPrefix));
  const revenue = inMonth.reduce((s, i) => s + i.grand_total, 0);
  // Paid this month: approximate via amount_paid on month invoices (simple, deterministic)
  const paid = inMonth.reduce((s, i) => s + i.amount_paid, 0);
  const outstanding = live
    .filter((i) => i.amount_due > 0)
    .reduce((s, i) => s + i.amount_due, 0);
  const overdue = live
    .filter((i) => isOverdue(i.due_date, i.amount_due))
    .reduce((s, i) => s + i.amount_due, 0);

  const custRows = await db.select().from(customers).where(eq(customers.business_id, businessId));
  const custMap = new Map(custRows.map((x) => [x.id, x.name]));
  const recent = [...rows]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 8)
    .map((i) => ({
      id: i.id,
      invoice_number: i.invoice_number,
      customer: custMap.get(i.customer_id) || "—",
      issue_date: i.issue_date,
      grand_total: i.grand_total,
      status:
        (i.status === "UNPAID" || i.status === "PARTIALLY_PAID") &&
        isOverdue(i.due_date, i.amount_due)
          ? "OVERDUE"
          : i.status,
    }));
  return ok(c, { revenue, paid, outstanding, overdue, recent });
});
