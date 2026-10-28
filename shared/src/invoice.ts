import { gstBps, mulBps } from "./money";
import type { InvoiceItemInput } from "./schemas";

export type ComputedItem = {
  line_subtotal: number; // qty * unit_price (paise)
  discount: number;
  taxable_amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  tax_total: number;
  total: number;
};

export type ComputedInvoice = {
  subtotal: number;
  discount: number; // invoice-level
  taxable_amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total_tax: number;
  grand_total: number;
  items: ComputedItem[];
};

// quantity may be fractional (e.g. 1.5 hrs). Compute line_subtotal = round(qty * unit_price).
export function calculateItem(
  item: InvoiceItemInput,
  isInterState: boolean
): ComputedItem {
  if (item.quantity <= 0) throw new Error("Quantity must be > 0");
  if (item.unit_price < 0) throw new Error("Price cannot be negative");
  if (item.gst_rate < 0) throw new Error("GST rate cannot be negative");
  const discount = Math.max(0, Math.floor(item.discount ?? 0));
  const line_subtotal = Math.round(item.quantity * item.unit_price);
  if (discount > line_subtotal)
    throw new Error("Item discount cannot exceed line subtotal");
  const taxable_amount = line_subtotal - discount;
  const bps = gstBps(item.gst_rate);
  const tax_total = mulBps(taxable_amount, bps);
  let cgst = 0,
    sgst = 0,
    igst = 0;
  if (isInterState) {
    igst = tax_total;
  } else {
    // Split evenly; odd paise goes to CGST to stay deterministic.
    cgst = Math.ceil(tax_total / 2);
    sgst = tax_total - cgst;
  }
  return {
    line_subtotal,
    discount,
    taxable_amount,
    cgst,
    sgst,
    igst,
    tax_total,
    total: taxable_amount + tax_total,
  };
}

export function calculateInvoiceTotals(
  items: InvoiceItemInput[],
  opts: { invoiceDiscountPaise?: number; isInterState?: boolean } = {}
): ComputedInvoice {
  if (!items.length) throw new Error("Invoice must contain at least one item");
  const isInterState = opts.isInterState ?? false;
  const computed = items.map((i) => calculateItem(i, isInterState));
  const subtotal = computed.reduce((s, c) => s + c.line_subtotal, 0);
  const itemDiscount = computed.reduce((s, c) => s + c.discount, 0);
  const invoiceDiscount = Math.max(0, Math.floor(opts.invoiceDiscountPaise ?? 0));
  if (itemDiscount + invoiceDiscount > subtotal)
    throw new Error("Total discount cannot exceed subtotal");
  // Invoice-level discount reduces taxable proportionally is complex;
  // simplest deterministic rule: subtract it from taxable total, then
  // recompute tax proportionally is overkill. Instead: taxable = sum(taxable) - invoiceDiscount,
  // tax split pro-rata across items' tax. Keep deterministic + simple.
  const taxableBeforeInvoiceDisc = computed.reduce(
    (s, c) => s + c.taxable_amount,
    0
  );
  const taxable_amount = taxableBeforeInvoiceDisc - invoiceDiscount;
  // Pro-rata tax: scale each item tax by taxable_amount/taxableBefore.
  // If taxableBefore is 0, tax is 0.
  let cgst = 0,
    sgst = 0,
    igst = 0,
    total_tax = 0;
  if (taxableBeforeInvoiceDisc > 0 && taxable_amount > 0) {
    const ratio = taxable_amount / taxableBeforeInvoiceDisc;
    // Scale per-item then round; fix rounding drift on last item.
    let accC = 0,
      accS = 0,
      accI = 0;
    computed.forEach((c, idx) => {
      if (idx < computed.length - 1) {
        const cc = Math.round(c.cgst * ratio);
        const ss = Math.round(c.sgst * ratio);
        const ii = Math.round(c.igst * ratio);
        accC += cc;
        accS += ss;
        accI += ii;
      } else {
        // last item absorbs remainder vs scaled total
        const totC = Math.round(
          computed.reduce((s, x) => s + x.cgst, 0) * ratio
        );
        const totS = Math.round(
          computed.reduce((s, x) => s + x.sgst, 0) * ratio
        );
        const totI = Math.round(
          computed.reduce((s, x) => s + x.igst, 0) * ratio
        );
        accC = totC;
        accS = totS;
        accI = totI;
      }
    });
    cgst = accC;
    sgst = accS;
    igst = accI;
    total_tax = cgst + sgst + igst;
  }
  return {
    subtotal,
    discount: itemDiscount + invoiceDiscount,
    taxable_amount,
    cgst,
    sgst,
    igst,
    total_tax,
    grand_total: taxable_amount + total_tax,
    items: computed,
  };
}

export function calculatePaymentStatus(
  grandTotal: number,
  amountPaid: number
): "UNPAID" | "PARTIALLY_PAID" | "PAID" {
  if (amountPaid <= 0) return "UNPAID";
  if (amountPaid >= grandTotal) return "PAID";
  return "PARTIALLY_PAID";
}

export function isOverdue(dueDateYYYYMMDD: string, amountDue: number, now = new Date()): boolean {
  if (amountDue <= 0) return false;
  const today = now.toISOString().slice(0, 10);
  return dueDateYYYYMMDD < today;
}

export function generateInvoiceNumber(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(4, "0")}`;
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const r = n % 10;
  return r ? `${TENS[t]} ${ONES[r]}` : TENS[t];
}
function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const head = h ? `${ONES[h]} Hundred${r ? " " : ""}` : "";
  if (r === 0) return head.trim();
  return `${head}${twoDigits(r)}`.trim();
}

// Indian numbering: crore, lakh, thousand.
export function amountInWords(paise: number): string {
  const rupees = Math.floor(paise / 100);
  const p = paise % 100;
  if (rupees === 0 && p === 0) return "Zero Rupees Only";
  const parts: string[] = [];
  let n = rupees;
  const crore = Math.floor(n / 10_000_000);
  n %= 10_000_000;
  const lakh = Math.floor(n / 100_000);
  n %= 100_000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (n) parts.push(threeDigits(n));
  let words = parts.length ? `${parts.join(" ")} Rupees` : "Rupees";
  if (p) words += ` and ${twoDigits(p)} Paise`;
  return `${words} Only`;
}
