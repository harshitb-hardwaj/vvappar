import { Hono } from "hono";
import { and, desc, eq, like, or } from "drizzle-orm";
import { products } from "../db/schema.js";
import { productSchema } from "@invoice/shared";
import { fail, nowIso, ok, parseOr400, uid } from "../lib/http.js";
import type { Db } from "../db/index.js";
import type { AuthContext } from "../middleware/auth.js";

type V = { db: Db; auth: AuthContext };
export const productRoutes = new Hono<{ Variables: V }>();

productRoutes.get("/", async (c) => {
  const db = c.get("db");
  const auth = c.get("auth");
  const q = c.req.query("q")?.trim() || "";
  const where = q
    ? and(
        eq(products.business_id, auth.businessId!),
        or(like(products.name, `%${q}%`), like(products.sku, `%${q}%`))
      )
    : eq(products.business_id, auth.businessId!);
  const rows = await db.select().from(products).where(where).orderBy(desc(products.created_at)).limit(200);
  return ok(c, rows.map((r) => ({ ...r, gst_rate: r.gst_rate_bps / 100, price: r.price })));
});

productRoutes.post("/", async (c) => {
  const db = c.get("db");
  const auth = c.get("auth");
  const body = await c.req.json().catch(() => ({}));
  const parsed = parseOr400(c, productSchema, body);
  if (!parsed) return c.json({ success: false }, 400);
  const now = nowIso();
  const row = {
    id: uid(),
    business_id: auth.businessId!,
    name: parsed.name,
    description: parsed.description || null,
    sku: parsed.sku || null,
    hsn_sac: parsed.hsn_sac || null,
    unit: parsed.unit || null,
    price: parsed.price,
    gst_rate_bps: Math.round(parsed.gst_rate * 100),
    created_at: now,
    updated_at: now,
  };
  await db.insert(products).values(row);
  return ok(c, { ...row, gst_rate: parsed.gst_rate }, 201);
});

productRoutes.get("/:id", async (c) => {
  const db = c.get("db");
  const auth = c.get("auth");
  const id = c.req.param("id");
  const rows = await db.select().from(products).where(and(eq(products.id, id), eq(products.business_id, auth.businessId!))).limit(1);
  if (!rows[0]) return fail(c, "NOT_FOUND", "Product not found", 404);
  return ok(c, { ...rows[0], gst_rate: rows[0].gst_rate_bps / 100 });
});

productRoutes.patch("/:id", async (c) => {
  const db = c.get("db");
  const auth = c.get("auth");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const parsed = parseOr400(c, productSchema.partial(), body);
  if (!parsed) return c.json({ success: false }, 400);
  const existing = await db.select().from(products).where(and(eq(products.id, id), eq(products.business_id, auth.businessId!))).limit(1);
  if (!existing[0]) return fail(c, "NOT_FOUND", "Product not found", 404);
  const { gst_rate, ...rest } = parsed as Record<string, unknown>;
  await db
    .update(products)
    .set({
      ...rest,
      ...(gst_rate !== undefined ? { gst_rate_bps: Math.round(Number(gst_rate) * 100) } : {}),
      updated_at: nowIso(),
    } as never)
    .where(eq(products.id, id));
  return ok(c, { updated: true });
});

productRoutes.delete("/:id", async (c) => {
  const db = c.get("db");
  const auth = c.get("auth");
  const id = c.req.param("id");
  const existing = await db.select().from(products).where(and(eq(products.id, id), eq(products.business_id, auth.businessId!))).limit(1);
  if (!existing[0]) return fail(c, "NOT_FOUND", "Product not found", 404);
  await db.delete(products).where(eq(products.id, id));
  return ok(c, { deleted: true });
});
