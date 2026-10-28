import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { businesses, customers, invoice_items, invoices } from "../db/schema.js";
import { renderInvoicePdf } from "../services/pdf.js";
import { withComputedStatus } from "./invoices.js";
import { fail } from "../lib/http.js";
import type { Db } from "../db/index.js";
import type { AuthContext } from "../middleware/auth.js";

type V = { db: Db; auth: AuthContext };
export const pdfRoutes = new Hono<{ Variables: V }>();

// Mounted at /api/invoices/:id/pdf via main app (needs :id param passthrough)
pdfRoutes.get("/", async (c) => {
  const db = c.get("db");
  const auth = c.get("auth");
  const id = c.req.param("id") as string;
  if (!id) return fail(c, "NOT_FOUND", "Invoice not found", 404);
  const rows = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.business_id, auth.businessId!)))
    .limit(1);
  if (!rows[0]) return fail(c, "NOT_FOUND", "Invoice not found", 404);
  const inv = withComputedStatus(rows[0]);
  const items = await db.select().from(invoice_items).where(eq(invoice_items.invoice_id, id));
  const cust = await db.select().from(customers).where(eq(customers.id, inv.customer_id)).limit(1);
  const biz = await db.select().from(businesses).where(eq(businesses.id, auth.businessId!)).limit(1);
  const pdf = await renderInvoicePdf({
    ...inv,
    items: items.map((i) => ({
      description: i.description,
      hsn_sac: i.hsn_sac,
      quantity: i.quantity_milli / 1000,
      unit: i.unit,
      unit_price: i.unit_price,
      gst_rate: i.gst_rate_bps / 100,
      total: i.total,
    })),
    customer: cust[0] || null,
    business: biz[0] || null,
  });
  // Uint8Array body — hono supports Response directly
  return new Response(pdf as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${inv.invoice_number}.pdf"`,
    },
  });
});
