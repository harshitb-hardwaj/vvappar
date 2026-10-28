import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { amountInWords } from "@invoice/shared";

// WinAnsi (Helvetica) has no ₹ glyph — use Rs. in PDFs.
const inr = (paise: number): string =>
  `Rs. ${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export type PdfInvoice = {
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: string;
  subtotal: number;
  discount: number;
  taxable_amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total_tax: number;
  grand_total: number;
  amount_paid: number;
  amount_due: number;
  notes?: string | null;
  terms?: string | null;
  items: Array<{
    description: string;
    hsn_sac?: string | null;
    quantity: number;
    unit?: string | null;
    unit_price: number;
    gst_rate: number;
    total: number;
  }>;
  customer: { name: string; address?: string | null; city?: string | null; state?: string | null; pincode?: string | null; gstin?: string | null; phone?: string | null; email?: string | null } | null;
  business: { name: string; address?: string | null; city?: string | null; state?: string | null; pincode?: string | null; gstin?: string | null; phone?: string | null; email?: string | null; bank_name?: string | null; account_number?: string | null; ifsc?: string | null; upi_id?: string | null } | null;
};

const INK = rgb(0.08, 0.08, 0.07);
const MUTED = rgb(0.42, 0.41, 0.39);
const CORAL = rgb(0.8, 0.47, 0.36);
const HAIR = rgb(0.9, 0.87, 0.85);

// A4: 595 x 842. Clean printable layout, single page overflow -> new page.
export async function renderInvoicePdf(inv: PdfInvoice): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page = doc.addPage([595, 842]);
  let y = 800;
  const L = 48;
  const R = 547;

  const text = (s: string, x: number, yy: number, size = 9, b = false, color = INK, maxW?: number) => {
    let str = s ?? "";
    const f = b ? bold : font;
    if (maxW) {
      while (str.length > 4 && f.widthOfTextAtSize(str, size) > maxW) str = str.slice(0, -2);
    }
    page.drawText(str, { x, y: yy, size, font: f, color });
  };
  const line = (yy: number) => {
    page.drawLine({ start: { x: L, y: yy }, end: { x: R, y: yy }, thickness: 0.75, color: HAIR });
  };
  const need = (h: number) => {
    if (y - h < 48) {
      page = doc.addPage([595, 842]);
      y = 800;
    }
  };

  const biz = inv.business || { name: "Business" };
  // Header
  text(biz.name, L, y, 20, true); y -= 18;
  const addr = [biz.address, [biz.city, biz.state, biz.pincode].filter(Boolean).join(" "), biz.phone, biz.email, biz.gstin ? `GSTIN: ${biz.gstin}` : ""].filter(Boolean) as string[];
  for (const a of addr.slice(0, 4)) { text(String(a), L, y, 8, false, MUTED); y -= 12; }
  // Invoice title block right
  text("TAX INVOICE", R - 150, 800, 13, true, CORAL);
  text(`${inv.invoice_number}  •  ${inv.status}`, R - 150, 784, 9, true);
  text(`Issued ${inv.issue_date}   Due ${inv.due_date}`, R - 150, 770, 8, false, MUTED);
  y = Math.min(y, 700);
  line(y); y -= 18;

  // Bill to
  text("Billed to", L, y, 8, true, MUTED); y -= 14;
  const c = inv.customer || { name: "—" };
  text(c.name, L, y, 12, true); y -= 15;
  const caddr = [c.address, [c.city, c.state, c.pincode].filter(Boolean).join(" "), c.gstin ? `GSTIN: ${c.gstin}` : "", c.phone || ""].filter(Boolean) as string[];
  for (const a of caddr.slice(0, 4)) { text(String(a), L, y, 8, false, MUTED); y -= 11; }
  y -= 8; line(y); y -= 16;

  // Table header
  const cols = [L, 260, 310, 350, 400, 460]; // desc, qty, price, gst, amount
  text("Description", cols[0], y, 8, true, MUTED);
  text("Qty", cols[1], y, 8, true, MUTED);
  text("Price", cols[2], y, 8, true, MUTED);
  text("GST%", cols[3], y, 8, true, MUTED);
  text("Amount", cols[4], y, 8, true, MUTED);
  y -= 10; line(y); y -= 14;

  for (const it of inv.items) {
    need(28);
    text(it.description.slice(0, 48), cols[0], y, 9, false, INK, 200);
    if (it.hsn_sac) text(`HSN ${it.hsn_sac}`, cols[0], y - 11, 7, false, MUTED);
    text(`${it.quantity}${it.unit ? " " + it.unit : ""}`, cols[1], y, 9);
    text(inr(it.unit_price), cols[2], y, 9);
    text(`${it.gst_rate}%`, cols[3], y, 9);
    const amt = inr(it.total);
    text(amt, cols[4], y, 9, true);
    y -= it.hsn_sac ? 26 : 18;
  }
  line(y); y -= 16;

  // Summary right
  const row = (label: string, val: number, boldRow = false) => {
    need(16);
    text(label, 360, y, 9, false, boldRow ? INK : MUTED);
    text(inr(val), 470, y, 9, boldRow);
    y -= 14;
  };
  row("Subtotal", inv.subtotal);
  if (inv.discount) row("Discount", inv.discount);
  row("Taxable", inv.taxable_amount);
  if (inv.cgst) row("CGST", inv.cgst);
  if (inv.sgst) row("SGST", inv.sgst);
  if (inv.igst) row("IGST", inv.igst);
  row("Tax total", inv.total_tax);
  row("Grand total", inv.grand_total, true);
  row("Paid", inv.amount_paid);
  row("Due", inv.amount_due, true);
  y -= 6;

  need(40);
  text("Amount in words", L, y, 8, true, MUTED); y -= 12;
  text(amountInWords(inv.grand_total), L, y, 9, true, INK, 500); y -= 22;

  const payLines = [
    biz.bank_name ? `Bank: ${biz.bank_name}` : "",
    biz.account_number ? `A/c: ${biz.account_number}` : "",
    biz.ifsc ? `IFSC: ${biz.ifsc}` : "",
    biz.upi_id ? `UPI: ${biz.upi_id}` : "",
  ].filter(Boolean);
  if (payLines.length) {
    text("Payment details", L, y, 8, true, MUTED); y -= 12;
    for (const pl of payLines) { text(pl, L, y, 8); y -= 11; }
    y -= 4;
  }
  if (inv.notes) { need(30); text("Notes", L, y, 8, true, MUTED); y -= 12; text(inv.notes.slice(0, 300), L, y, 8, false, INK, 500); y -= 20; }
  if (inv.terms) { need(30); text("Terms", L, y, 8, true, MUTED); y -= 12; text(inv.terms.slice(0, 300), L, y, 8, false, INK, 500); y -= 20; }

  y -= 24;
  text("Authorised signature", R - 170, y, 8, false, MUTED);
  page.drawLine({ start: { x: R - 170, y: y + 22 }, end: { x: R, y: y + 22 }, thickness: 0.75, color: HAIR });

  return doc.save();
}
