import { Hono } from "hono";
import { cors } from "hono/cors";
import { getDb, type Env } from "./db/index.js";
import type { Db } from "./db/index.js";
import { authMiddleware, type AuthContext } from "./middleware/auth.js";
import { meRoutes } from "./routes/me.js";
import { businessRoutes } from "./routes/businesses.js";
import { customerRoutes } from "./routes/customers.js";
import { productRoutes } from "./routes/products.js";
import { invoiceRoutes } from "./routes/invoices.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { pdfRoutes } from "./routes/pdf.js";

type Variables = { db: Db; auth: AuthContext };
const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use("*", cors({ origin: "*", allowHeaders: ["*"], allowMethods: ["*"] }));
app.use("/api/*", async (c, next) => {
  // Workers: c.env has bindings; Node dev: fall back to process.env
  c.set("db", getDb({ ...(process.env as object), ...c.env } as Env));
  return next();
});
app.get("/health", (c) => c.json({ success: true, data: { ok: true } }));

// Public ^ (health only). Everything below requires auth.
app.use("/api/*", authMiddleware());
app.route("/api/me", meRoutes);
app.route("/api/business", businessRoutes);
app.route("/api/customers", customerRoutes);
app.route("/api/products", productRoutes);
app.route("/api/dashboard", dashboardRoutes);
app.route("/api/invoices", invoiceRoutes);
// PDF sub-route needs :id — mount separately to capture param
app.route("/api/invoices/:id/pdf", pdfRoutes);

app.notFound((c) => c.json({ success: false, error: { code: "NOT_FOUND", message: "Not found" } }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, 500);
});

export default app;
