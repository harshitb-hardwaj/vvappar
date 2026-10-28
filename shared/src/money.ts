// Money helpers — all amounts in integer paise. Never use floats for money.
// ponytail: integer-paise math, use decimal lib if multi-currency rounding matters.

export const toPaise = (rupees: number | string): number => {
  const n = typeof rupees === "string" ? parseFloat(rupees) : rupees;
  if (!Number.isFinite(n)) throw new Error("Invalid amount");
  return Math.round(n * 100);
};

export const fromPaise = (paise: number): number => paise / 100;

export const formatINR = (paise: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(paise / 100);

// Round half-up for integer division: (a*b)/10000 with basis points etc.
export const mulBps = (amountPaise: number, bps: number): number =>
  Math.round((amountPaise * bps) / 10_000);

// gstRate is percent e.g. 18 -> 1800 bps
export const gstBps = (gstRatePct: number): number => Math.round(gstRatePct * 100);
