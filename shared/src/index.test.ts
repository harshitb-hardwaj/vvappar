import { describe, expect, it } from "vitest";
import {
  amountInWords,
  calculateInvoiceTotals,
  calculatePaymentStatus,
  generateInvoiceNumber,
  isOverdue,
} from "./index";

describe("GST calculations (spec example: 10000 + 18%)", () => {
  it("intra-state splits CGST/SGST 900/900, total 11800", () => {
    const r = calculateInvoiceTotals(
      [
        {
          description: "Website",
          quantity: 1,
          unit_price: 1_000_000,
          discount: 0,
          gst_rate: 18,
        },
      ],
      { isInterState: false }
    );
    expect(r.subtotal).toBe(1_000_000);
    expect(r.cgst).toBe(90_000);
    expect(r.sgst).toBe(90_000);
    expect(r.igst).toBe(0);
    expect(r.grand_total).toBe(1_180_000);
  });

  it("inter-state uses IGST 1800", () => {
    const r = calculateInvoiceTotals(
      [
        {
          description: "Website",
          quantity: 1,
          unit_price: 1_000_000,
          discount: 0,
          gst_rate: 18,
        },
      ],
      { isInterState: true }
    );
    expect(r.igst).toBe(180_000);
    expect(r.cgst).toBe(0);
    expect(r.sgst).toBe(0);
    expect(r.grand_total).toBe(1_180_000);
  });

  it("rejects empty items and bad qty", () => {
    expect(() => calculateInvoiceTotals([], {})).toThrow();
    expect(() =>
      calculateInvoiceTotals([
        { description: "x", quantity: 0, unit_price: 100, gst_rate: 18 },
      ])
    ).toThrow();
  });
});

describe("payments + overdue + numbering", () => {
  it("payment status transitions", () => {
    expect(calculatePaymentStatus(1000, 0)).toBe("UNPAID");
    expect(calculatePaymentStatus(1000, 400)).toBe("PARTIALLY_PAID");
    expect(calculatePaymentStatus(1000, 1000)).toBe("PAID");
  });
  it("overdue detection", () => {
    expect(isOverdue("2000-01-01", 100, new Date("2026-01-02"))).toBe(true);
    expect(isOverdue("2099-01-01", 100, new Date("2026-01-02"))).toBe(false);
    expect(isOverdue("2000-01-01", 0, new Date("2026-01-02"))).toBe(false);
  });
  it("invoice numbering", () => {
    expect(generateInvoiceNumber("INV", 1)).toBe("INV-0001");
    expect(generateInvoiceNumber("INV", 42)).toBe("INV-0042");
  });
  it("amount in words", () => {
    expect(amountInWords(1_180_000)).toBe(
      "Eleven Thousand Eight Hundred Rupees Only"
    );
  });
});
