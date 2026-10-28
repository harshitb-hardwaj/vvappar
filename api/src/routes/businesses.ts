import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { businesses } from "../db/schema.js";
import { businessSchema } from "@invoice/shared";
import { fail, nowIso, ok, parseOr400 } from "../lib/http.js";
import type { Db } from "../db/index.js";
import type { AuthContext } from "../middleware/auth.js";

type V = { db: Db; auth: AuthContext };
export const businessRoutes = new Hono<{ Variables: V }>();

businessRoutes.get("/", async (c) => {
  const { db, auth } = { db: c.get("db"), auth: c.get("auth") };
  if (!auth.businessId) return fail(c, "NO_BUSINESS", "No business found", 404);
  const rows = await db.select().from(businesses).where(eq(businesses.id, auth.businessId)).limit(1);
  if (!rows[0]) return fail(c, "NOT_FOUND", "Business not found", 404);
  return ok(c, rows[0]);
});

businessRoutes.patch("/", async (c) => {
  const db = c.get("db");
  const auth = c.get("auth");
  if (!auth.businessId) return fail(c, "NO_BUSINESS", "No business found", 404);
  const body = await c.req.json().catch(() => ({}));
  const parsed = parseOr400(c, businessSchema.partial(), body);
  if (!parsed) return c.json({ success: false }, 400);
  const clean = Object.fromEntries(
    Object.entries(parsed).filter(([, v]) => v !== undefined)
  );
  await db
    .update(businesses)
    .set({ ...clean, updated_at: nowIso() })
    .where(eq(businesses.id, auth.businessId));
  const rows = await db.select().from(businesses).where(eq(businesses.id, auth.businessId)).limit(1);
  return ok(c, rows[0]);
});
