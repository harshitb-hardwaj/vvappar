import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const ts = {
  created_at: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updated_at: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
};

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    firebase_uid: text("firebase_uid").notNull().unique(),
    email: text("email").notNull(),
    name: text("name"),
    ...ts,
  },
  (t) => [index("users_email_idx").on(t.email)]
);

export const businesses = sqliteTable("businesses", {
  id: text("id").primaryKey(),
  owner_id: text("owner_id").notNull(),
  name: text("name").notNull(),
  legal_name: text("legal_name"),
  logo_url: text("logo_url"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  gstin: text("gstin"),
  pan: text("pan"),
  invoice_prefix: text("invoice_prefix").notNull().default("INV"),
  next_invoice_number: integer("next_invoice_number").notNull().default(1),
  bank_name: text("bank_name"),
  account_number: text("account_number"),
  ifsc: text("ifsc"),
  upi_id: text("upi_id"),
  ...ts,
});

export const customers = sqliteTable(
  "customers",
  {
    id: text("id").primaryKey(),
    business_id: text("business_id").notNull(),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    pincode: text("pincode"),
    gstin: text("gstin"),
    ...ts,
  },
  (t) => [
    index("customers_business_idx").on(t.business_id),
    index("customers_phone_idx").on(t.phone),
    index("customers_email_idx").on(t.email),
  ]
);

export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    business_id: text("business_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    sku: text("sku"),
    hsn_sac: text("hsn_sac"),
    unit: text("unit"),
    price: integer("price").notNull().default(0), // paise
    gst_rate_bps: integer("gst_rate_bps").notNull().default(1800), // bps; 18% = 1800
    ...ts,
  },
  (t) => [
    index("products_business_idx").on(t.business_id),
    index("products_sku_idx").on(t.sku),
  ]
);

export const invoices = sqliteTable(
  "invoices",
  {
    id: text("id").primaryKey(),
    business_id: text("business_id").notNull(),
    customer_id: text("customer_id").notNull(),
    invoice_number: text("invoice_number").notNull(),
    issue_date: text("issue_date").notNull(), // YYYY-MM-DD
    due_date: text("due_date").notNull(),
    is_inter_state: integer("is_inter_state").notNull().default(0),
    subtotal: integer("subtotal").notNull().default(0),
    discount: integer("discount").notNull().default(0),
    taxable_amount: integer("taxable_amount").notNull().default(0),
    cgst: integer("cgst").notNull().default(0),
    sgst: integer("sgst").notNull().default(0),
    igst: integer("igst").notNull().default(0),
    total_tax: integer("total_tax").notNull().default(0),
    grand_total: integer("grand_total").notNull().default(0),
    amount_paid: integer("amount_paid").notNull().default(0),
    amount_due: integer("amount_due").notNull().default(0),
    status: text("status").notNull().default("UNPAID"),
    notes: text("notes"),
    terms: text("terms"),
    ...ts,
  },
  (t) => [
    index("invoices_business_idx").on(t.business_id),
    index("invoices_customer_idx").on(t.customer_id),
    index("invoices_status_idx").on(t.status),
    uniqueIndex("invoices_business_number_uq").on(t.business_id, t.invoice_number),
  ]
);

export const invoice_items = sqliteTable("invoice_items", {
  id: text("id").primaryKey(),
  invoice_id: text("invoice_id").notNull(),
  product_id: text("product_id"),
  description: text("description").notNull(),
  hsn_sac: text("hsn_sac"),
  quantity_milli: integer("quantity_milli").notNull(), // qty*1000 to support 3 decimals
  unit: text("unit"),
  unit_price: integer("unit_price").notNull(), // paise
  discount: integer("discount").notNull().default(0),
  gst_rate_bps: integer("gst_rate_bps").notNull().default(1800),
  taxable_amount: integer("taxable_amount").notNull(),
  cgst: integer("cgst").notNull().default(0),
  sgst: integer("sgst").notNull().default(0),
  igst: integer("igst").notNull().default(0),
  total: integer("total").notNull(),
});

export const payments = sqliteTable(
  "payments",
  {
    id: text("id").primaryKey(),
    business_id: text("business_id").notNull(),
    invoice_id: text("invoice_id").notNull(),
    amount: integer("amount").notNull(), // paise
    payment_method: text("payment_method").notNull().default("UPI"),
    reference_number: text("reference_number"),
    notes: text("notes"),
    paid_at: text("paid_at").notNull(),
    ...ts,
  },
  (t) => [
    index("payments_business_idx").on(t.business_id),
    index("payments_invoice_idx").on(t.invoice_id),
  ]
);

export { sql };
