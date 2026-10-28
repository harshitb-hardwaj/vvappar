import { Hono } from "hono";
import { and, desc, eq, like, or } from "drizzle-orm";
import { customers, invoices } from "../db/schema.js";
import { customerSchema } from "@invoice/shared";
import { fail, nowIso, ok, parseOr400, uid } from "../lib/http.js";
import type { Db } from "../db/index.js";
import type { AuthContext } from "../middleware/auth.js";

type V = { db: Db; auth: AuthContext };
export const customerRoutes = new Hono<{ Variables: V }>();

customerRoutes.get("/", async (c) => {
  const db = c.get("db");
  const auth = c.get("auth");
  const q = c.req.query("q")?.trim() || "";
  const where = q
    ? and(
        eq(customers.business_id, auth.businessId!),
        or(like(customers.name, `%${q}%`), like(customers.phone, `%${q}%`), like(customers.email, `%${q}%`))
      )
    : eq(customers.business_id, auth.businessId!);
  const rows = await db.select().from(customers).where(where).orderBy(desc(customers.created_at)).limit(200);
  return ok(c, rows);
});

customerRoutes.post("/", async (c) => {
  const db = c.get("db");
  const auth = c.get("auth");
  const body = await c.req.json().catch(() => ({}));
  const parsed = parseOr400(c, customerSchema, body);
  if (!parsed) return c.json({ success: false }, 400);
  const now = nowIso();
  const row = {
    id: uid(),
    business_id: auth.businessId!,
    name: parsed.name,
    email: parsed.email || null,
    phone: parsed.phone || null,
    address: parsed.address || null,
    city: parsed.city || null,
    state: parsed.state || null,
    pincode: parsed.pincode || null,
    gstin: parsed.gstin || null,
    created_at: now,
    updated_at: now,
  };
  await db.insert(customers).values(row);
  return ok(c, row, 201);
});

customerRoutes.get("/:id", async (c) => {
  const db = c.get("db");
  const auth = c.get("auth");
  const id = c.req.param("id");
  const rows = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.business_id, auth.businessId!)))
    .limit(1);
  if (!rows[0]) return fail(c, "NOT_FOUND", "Customer not found", 404);
  const inv = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.customer_id, id), eq(invoices.business_id, auth.businessId!)));
  const totalInvoiced = inv.filter((i) => i.status !== "CANCELLED").reduce((s, i) => s + i.grand_total, 0);
  const totalPaid = inv.reduce((s, i) => s + i.amount_paid, 0);
  return ok(c, { ...rows[0], stats: { totalInvoiced, totalPaid, outstanding: totalInvoiced - totalPaid }, invoices: inv });
});

customerRoutes.patch("/:id", async (c) => {
  const db = c.get("db");
  const auth = c.get("auth");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const parsed = parseOr400(c, customerSchema.partial(), body);
  if (!parsed) return c.json({ success: false }, 400);
  const existing = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.business_id, auth.businessId!)))
    .limit(1);
  if (!existing[0]) return fail(c, "NOT_FOUND", "Customer not found", 404);
  await db.update(customers).set({ ...parsed, updated_at: nowIso() }).where(eq(customers.id, id));
  return ok(c, { ...existing[0], ...parsed });
});

customerRoutes.delete("/:id", async (c) => {
  const db = c.get("db");
  const auth = c.get("auth");
  const id = c.req.param("id");
  const existing = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.business_id, auth.businessId!)))
    .limit(1);
  if (!existing[0]) return fail(c, "NOT_FOUND", "Customer not found", 404);
  await db.delete(customers).where(eq(customers.id, id));
  return ok(c, { deleted: true });
});
