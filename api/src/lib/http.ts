import type { Context } from "hono";
import { ZodError } from "zod";

export const ok = <T>(c: Context, data: T, status = 200) =>
  c.json({ success: true, data }, status as 200);

export const fail = (
  c: Context,
  code: string,
  message: string,
  status = 400,
  details?: unknown
) => c.json({ success: false, error: { code, message, details } }, status as 400);

export function parseOr400<T>(c: Context, schema: { parse: (v: unknown) => T }, body: unknown): T | null {
  try {
    return schema.parse(body);
  } catch (e) {
    if (e instanceof ZodError) {
      fail(c, "VALIDATION_ERROR", e.errors[0]?.message || "Invalid input", 400, e.flatten());
    } else {
      fail(c, "VALIDATION_ERROR", "Invalid input", 400);
    }
    return null;
  }
}

export const uid = (): string =>
  // Workers-safe UUID (crypto.randomUUID available in Workers + Node 19+)
  crypto.randomUUID();

export const nowIso = () => new Date().toISOString();
