import { Hono } from "hono";
import { and, desc, eq, inArray, like, or } from "drizzle-orm";
import {
  businesses,
  customers,
  invoice_items,
  invoices,
  payments,
  products,
} from "../db/schema.js";
import {
  calculateInvoiceTotals,
  calculatePaymentStatus,
  createInvoiceSchema,
  generateInvoiceNumber,
  isOverdue,
  paymentSchema,
} from "@invoice/shared";
import { fail, nowIso, ok, parseOr400, uid } from "../lib/http.js";
import type { Db } from "../db/index.js";
import type { AuthContext } from "../middleware/auth.js";

type V = { db: Db; auth: AuthContext };
export const invoiceRoutes = new Hono<{ Variables: V }>();

export function withComputedStatus<T extends { status: string; due_date: string; amount_due: number }>(inv: T): T {
  if (
    (inv.status === "UNPAID" || inv.status === "PARTIALLY_PAID") &&
    isOverdue(inv.due_date, inv.amount_due)
  ) {
    return { ...inv, status: "OVERDUE" };
  }
  return inv;
}

invoiceRoutes.get("/", async (c) => {
  const db = c.get("db");
  const auth = c.get("auth");
  const status = c.req.query("status") || "All";
  const q = c.req.query("q")?.trim() || "";
  let rows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.business_id, auth.businessId!))
    .orderBy(desc(invoices.created_at))
    .limit(500);
  // join customer names (small N; avoids join complexity)
  const custRows = await db.select().from(customers).where(eq(customers.business_id, auth.businessId!));
  const custMap = new Map(custRows.map((x) => [x.id, x]));
  let out = rows.map((r) => ({ ...withComputedStatus(r), customer: custMap.get(r.customer_id) || null }));
  if (q) {
    const ql = q.toLowerCase();
    out = out.filter(
      (r) =>
        r.invoice_number.toLowerCase().includes(ql) ||
        (r.customer?.name || "").toLowerCase().includes(ql)
    );
  }
  if (status !== "All") out = out.filter((r) => r.status === status);
  return ok(c, out);
});

invoiceRoutes.post("/", async (c) => {
  const db = c.get("db");
  const auth = c.get("auth");
  const businessId = auth.businessId!;
  const body = await c.req.json().catch(() => ({}));
  const parsed = parseOr400(c, createInvoiceSchema, body);
  if (!parsed) return c.json({ success: false }, 400);

  // Verify customer belongs to business
  const cust = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, parsed.customer_id), eq(customers.business_id, businessId)))
    .limit(1);
  if (!cust[0]) return fail(c, "VALIDATION_ERROR", "Invalid customer", 400);

  // Verify products belong to business (if product_id supplied)
  const pIds = [...new Set(parsed.items.map((i) => i.product_id).filter(Boolean))] as string[];
  if (pIds.length) {
    const prods = await db.select().from(products).where(inArray(products.id, pIds));
    for (const p of prods) {
      if (p.business_id !== businessId)
        return fail(c, "VALIDATION_ERROR", "Invalid product", 400);
    }
    if (prods.length !== pIds.length)
      return fail(c, "VALIDATION_ERROR", "Invalid product", 400);
  }

  // Server-side totals. Never trust frontend totals.
  let totals;
  try {
    totals = calculateInvoiceTotals(
      parsed.items.map((i) => ({ ...i })),
      { invoiceDiscountPaise: parsed.discount, isInterState: parsed.is_inter_state }
    );
  } catch (e) {
    return fail(c, "VALIDATION_ERROR", (e as Error).message, 400);
  }

  // Transactional invoice number + insert. Retry on unique conflict (concurrency).
  for (let attempt = 0; attempt < 3; attempt++) {
    const bizRows = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
    const biz = bizRows[0];
    if (!biz) return fail(c, "NO_BUSINESS", "No business", 404);
    const invoiceNumber = generateInvoiceNumber(biz.invoice_prefix, biz.next_invoice_number);
    const now = nowIso();
    const invoiceId = uid();
    const status = parsed.status === "DRAFT" ? "DRAFT" : "UNPAID";
    try {
      await db.insert(invoices).values({
        id: invoiceId,
        business_id: businessId,
        customer_id: parsed.customer_id,
        invoice_number: invoiceNumber,
        issue_date: parsed.issue_date,
        due_date: parsed.due_date,
        is_inter_state: parsed.is_inter_state ? 1 : 0,
        subtotal: totals.subtotal,
        discount: totals.discount,
        taxable_amount: totals.taxable_amount,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst,
        total_tax: totals.total_tax,
        grand_total: totals.grand_total,
        amount_paid: 0,
        amount_due: totals.grand_total,
        status,
        notes: parsed.notes || null,
        terms: parsed.terms || null,
        created_at: now,
        updated_at: now,
      });
      // Items: snapshot price/desc/tax/HSN (historical accuracy)
      for (let idx = 0; idx < parsed.items.length; idx++) {
        const input = parsed.items[idx];
        const comp = totals.items[idx];
        await db.insert(invoice_items).values({
          id: uid(),
          invoice_id: invoiceId,
          product_id: input.product_id || null,
          description: input.description,
          hsn_sac: input.hsn_sac || null,
          quantity_milli: Math.round(input.quantity * 1000),
          unit: input.unit || null,
          unit_price: input.unit_price,
          discount: Math.floor(input.discount ?? 0),
          gst_rate_bps: Math.round(input.gst_rate * 100),
          taxable_amount: comp.taxable_amount,
          cgst: comp.cgst,
          sgst: comp.sgst,
          igst: comp.igst,
          total: comp.total,
        });
      }
      await db
        .update(businesses)
        .set({ next_invoice_number: biz.next_invoice_number + 1, updated_at: now })
        .where(eq(businesses.id, businessId));
      const created = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
      return ok(c, created[0], 201);
    } catch (e) {
      // Unique violation -> retry with fresh seq
      const msg = String((e as Error)?.message || "");
      if (msg.includes("UNIQUE") && attempt < 2) continue;
      throw e;
    }
  }
  return fail(c, "CONFLICT", "Could not generate invoice number, retry", 409);
});

invoiceRoutes.get("/:id", async (c) => {
  const db = c.get("db");
  const auth = c.get("auth");
  const id = c.req.param("id");
  const rows = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.business_id, auth.businessId!)))
    .limit(1);
  if (!rows[0]) return fail(c, "NOT_FOUND", "Invoice not found", 404);
  const items = await db.select().from(invoice_items).where(eq(invoice_items.invoice_id, id));
  const pays = await db
    .select()
    .from(payments)
    .where(and(eq(payments.invoice_id, id), eq(payments.business_id, auth.businessId!)))
    .orderBy(desc(payments.paid_at));
  const cust = await db.select().from(customers).where(eq(customers.id, rows[0].customer_id)).limit(1);
  const biz = await db.select().from(businesses).where(eq(businesses.id, auth.businessId!)).limit(1);
  return ok(c, {
    ...withComputedStatus(rows[0]),
    items: items.map((i) => ({ ...i, quantity: i.quantity_milli / 1000, gst_rate: i.gst_rate_bps / 100 })),
    payments: pays,
    customer: cust[0] || null,
    business: biz[0] || null,
  });
});

invoiceRoutes.patch("/:id", async (c) => {
  const db = c.get("db");
  const auth = c.get("auth");
  const id = c.req.param("id");
  const rows = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.business_id, auth.businessId!)))
    .limit(1);
  if (!rows[0]) return fail(c, "NOT_FOUND", "Invoice not found", 404);
  if (rows[0].status !== "DRAFT") return fail(c, "INVALID_STATE", "Only DRAFT invoices can be edited", 400);
  const body = await c.req.json().catch(() => ({}));
  const allowed = ["notes", "terms", "due_date", "issue_date", "status"] as const;
  const patch: Record<string, unknown> = {};
  for (const k of allowed) if (body[k] !== undefined) patch[k] = body[k];
  if (patch.status && patch.status !== "DRAFT" && patch.status !== "UNPAID")
    return fail(c, "VALIDATION_ERROR", "Draft can only move to UNPAID", 400);
  await db.update(invoices).set({ ...patch, updated_at: nowIso() }).where(eq(invoices.id, id));
  return ok(c, { updated: true });
});

invoiceRoutes.post("/:id/cancel", async (c) => {
  const db = c.get("db");
  const auth = c.get("auth");
  const id = c.req.param("id");
  const rows = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.business_id, auth.businessId!)))
    .limit(1);
  if (!rows[0]) return fail(c, "NOT_FOUND", "Invoice not found", 404);
  await db.update(invoices).set({ status: "CANCELLED", updated_at: nowIso() }).where(eq(invoices.id, id));
  return ok(c, { cancelled: true });
});

// Payments nested under invoices
invoiceRoutes.get("/:id/payments", async (c) => {
  const db = c.get("db");
  const auth = c.get("auth");
  const id = c.req.param("id");
  const inv = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.business_id, auth.businessId!)))
    .limit(1);
  if (!inv[0]) return fail(c, "NOT_FOUND", "Invoice not found", 404);
  const pays = await db.select().from(payments).where(eq(payments.invoice_id, id)).orderBy(desc(payments.paid_at));
  return ok(c, pays);
});

invoiceRoutes.post("/:id/payments", async (c) => {
  const db = c.get("db");
  const auth = c.get("auth");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const parsed = parseOr400(c, paymentSchema, body);
  if (!parsed) return c.json({ success: false }, 400);
  const invRows = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.business_id, auth.businessId!)))
    .limit(1);
  const inv = invRows[0];
  if (!inv) return fail(c, "NOT_FOUND", "Invoice not found", 404);
  if (inv.status === "CANCELLED" || inv.status === "DRAFT")
    return fail(c, "INVALID_STATE", "Cannot record payment on draft/cancelled invoice", 400);
  if (parsed.amount + inv.amount_paid > inv.grand_total)
    return fail(c, "VALIDATION_ERROR", "Payment exceeds invoice total", 400);
  const now = nowIso();
  const pay = {
    id: uid(),
    business_id: auth.businessId!,
    invoice_id: id,
    amount: parsed.amount,
    payment_method: parsed.payment_method,
    reference_number: parsed.reference_number || null,
    notes: parsed.notes || null,
    paid_at: parsed.paid_at || now.slice(0, 10),
    created_at: now,
    updated_at: now,
  };
  await db.insert(payments).values(pay);
  const newPaid = inv.amount_paid + parsed.amount;
  const newDue = inv.grand_total - newPaid;
  const storedStatus = calculatePaymentStatus(inv.grand_total, newPaid);
  await db
    .update(invoices)
    .set({ amount_paid: newPaid, amount_due: newDue, status: storedStatus, updated_at: now })
    .where(eq(invoices.id, id));
  return ok(c, { ...pay, invoice_status: storedStatus }, 201);
});
