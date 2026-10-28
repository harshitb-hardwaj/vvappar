import { createClient } from "@libsql/client";
import { randomUUID } from "node:crypto";

// Seed realistic Indian demo data (clearly marked DEMO).
const now = new Date().toISOString();
const url = process.env.TURSO_DATABASE_URL || "file:./local.db";
const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

const bizId = randomUUID();
const userId = randomUUID();
const q = (s: string, args: unknown[] = []) => client.execute({ sql: s, args: args as never[] });

await q(`INSERT OR IGNORE INTO users (id, firebase_uid, email, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
  [userId, "demo-user", "demo@vyapaar.example", "Demo Owner", now, now]);
await q(`INSERT OR IGNORE INTO businesses (id, owner_id, name, legal_name, email, phone, address, city, state, pincode, gstin, invoice_prefix, next_invoice_number, bank_name, account_number, ifsc, upi_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [bizId, userId, "DEMO Sharma Traders", "DEMO Sharma Traders Pvt Ltd", "care@sharma.example", "9876543210", "14 MG Road", "Bengaluru", "Karnataka", "560001", "29ABCDE1234F1Z5", "INV", 6, "HDFC Bank", "50200012345678", "HDFC0001234", "sharma@upi", now, now]);

const customers = [
  ["Rahul Verma", "rahul@example.com", "9811111111", "Jaipur", "Rajasthan"],
  ["Priya Nair", "priya@example.com", "9822222222", "Kochi", "Kerala"],
  ["Amit Patel", "amit@example.com", "9833333333", "Ahmedabad", "Gujarat"],
];
const custIds: string[] = [];
for (const [name, email, phone, city, state] of customers) {
  const id = randomUUID();
  custIds.push(id);
  await q(`INSERT INTO customers (id, business_id, name, email, phone, city, state, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, bizId, `DEMO ${name}`, email, phone, city, state, now, now]);
}

const products: Array<[string, number, number]> = [
  ["Website Development", 1500000, 18],
  ["Logo Design", 250000, 18],
  ["Annual Maintenance", 600000, 18],
  ["GST Filing Service", 500000, 18],
  ["Domain + Hosting", 300000, 18],
];
const prodIds: string[] = [];
for (const [name, price, gst] of products) {
  const id = randomUUID();
  prodIds.push(id);
  await q(`INSERT INTO products (id, business_id, name, price, gst_rate_bps, unit, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, bizId, `DEMO ${name}`, price, gst * 100, "pcs", now, now]);
}

// 5 invoices with varied statuses
const invSeed: Array<[number, string, number, number, string]> = [
  [1, custIds[0], 1_500_000, 0, "PAID"],
  [2, custIds[1], 250_000, 250_000, "UNPAID"],
  [3, custIds[2], 600_000, 300_000, "PARTIALLY_PAID"],
  [4, custIds[0], 500_000, 500_000, "UNPAID"],
  [5, custIds[1], 300_000, 0, "DRAFT"],
];
for (const [seq, custId, taxable, paid, status] of invSeed) {
  const id = randomUUID();
  const tax = Math.round(taxable * 0.18);
  const total = taxable + tax;
  await q(`INSERT INTO invoices (id, business_id, customer_id, invoice_number, issue_date, due_date, is_inter_state, subtotal, discount, taxable_amount, cgst, sgst, igst, total_tax, grand_total, amount_paid, amount_due, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, bizId, custId, `INV-${String(seq).padStart(4, "0")}`, "2026-08-10", status === "UNPAID" ? "2026-07-01" : "2026-09-30", 0, taxable, 0, taxable, Math.ceil(tax / 2), Math.floor(tax / 2), 0, tax, total, paid, total - paid, status, now, now]);
  await q(`INSERT INTO invoice_items (id, invoice_id, description, quantity_milli, unit_price, discount, gst_rate_bps, taxable_amount, cgst, sgst, igst, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [randomUUID(), id, "DEMO service", 1000, taxable, 0, 1800, taxable, Math.ceil(tax / 2), Math.floor(tax / 2), 0, total]);
  if (paid > 0) {
    await q(`INSERT INTO payments (id, business_id, invoice_id, amount, payment_method, paid_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [randomUUID(), bizId, id, paid, "UPI", "2026-08-15", now, now]);
  }
}
console.log("seeded DEMO data ->", url);
process.exit(0);
