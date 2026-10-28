import { z } from "zod";

export const InvoiceStatus = z.enum([
  "DRAFT",
  "UNPAID",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CANCELLED",
]);
export type InvoiceStatus = z.infer<typeof InvoiceStatus>;

export const PaymentMethod = z.enum([
  "CASH",
  "UPI",
  "BANK_TRANSFER",
  "CARD",
  "OTHER",
]);
export type PaymentMethod = z.infer<typeof PaymentMethod>;

export type InvoiceItemInput = {
  product_id?: string | null;
  description: string;
  hsn_sac?: string | null;
  quantity: number; // integer-ish, > 0 (supports decimals via qty*1000)
  unit?: string | null;
  unit_price: number; // paise, >= 0
  discount?: number; // paise, >= 0
  gst_rate: number; // percent, >= 0
};

export const invoiceItemSchema = z.object({
  product_id: z.string().min(1).nullable().optional(),
  description: z.string().min(1).max(500),
  hsn_sac: z.string().max(16).nullable().optional(),
  quantity: z.number().positive().max(1_000_000),
  unit: z.string().max(16).nullable().optional(),
  unit_price: z.number().int().min(0).max(100_000_000_00),
  discount: z.number().int().min(0).max(100_000_000_00).default(0),
  gst_rate: z.number().min(0).max(100).default(18),
});

export const createInvoiceSchema = z.object({
  customer_id: z.string().min(1),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(invoiceItemSchema).min(1).max(100),
  discount: z.number().int().min(0).default(0), // invoice-level discount paise
  is_inter_state: z.boolean().default(false),
  notes: z.string().max(2000).nullable().optional(),
  terms: z.string().max(2000).nullable().optional(),
  status: z.enum(["DRAFT", "UNPAID"]).default("UNPAID"),
});

export const customerSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().max(20).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  pincode: z.string().max(10).nullable().optional(),
  gstin: z
    .string()
    .max(15)
    .nullable()
    .optional()
    .refine((v) => !v || v === "" || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/.test(v), {
      message: "Invalid GSTIN format",
    }),
});

export const productSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  sku: z.string().max(64).nullable().optional(),
  hsn_sac: z.string().max(16).nullable().optional(),
  unit: z.string().max(16).nullable().optional(),
  price: z.number().int().min(0),
  gst_rate: z.number().min(0).max(100).default(18),
});

export const businessSchema = z.object({
  name: z.string().min(1).max(200),
  legal_name: z.string().max(200).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().max(20).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  pincode: z.string().max(10).nullable().optional(),
  gstin: z.string().max(15).nullable().optional(),
  pan: z.string().max(10).nullable().optional(),
  invoice_prefix: z.string().min(1).max(10).default("INV"),
  bank_name: z.string().max(200).nullable().optional(),
  account_number: z.string().max(34).nullable().optional(),
  ifsc: z.string().max(11).nullable().optional(),
  upi_id: z.string().max(100).nullable().optional(),
});

export const paymentSchema = z.object({
  amount: z.number().int().positive(),
  payment_method: PaymentMethod.default("UPI"),
  reference_number: z.string().max(100).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  paid_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
