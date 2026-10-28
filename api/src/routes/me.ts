import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { users } from "../db/schema.js";
import { ok } from "../lib/http.js";
import type { Db } from "../db/index.js";
import type { AuthContext } from "../middleware/auth.js";

type V = { db: Db; auth: AuthContext };
export const meRoutes = new Hono<{ Variables: V }>();

meRoutes.get("/", async (c) => {
  const db = c.get("db");
  const auth = c.get("auth");
  const rows = await db.select().from(users).where(eq(users.id, auth.userId)).limit(1);
  return ok(c, { user: rows[0] || null, businessId: auth.businessId });
});
