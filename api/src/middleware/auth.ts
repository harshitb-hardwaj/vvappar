import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Context, Next } from "hono";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { businesses, users } from "../db/schema.js";
import type { Db, Env } from "../db/index.js";

export type AuthContext = {
  userId: string;
  firebaseUid: string;
  email: string;
  businessId: string | null;
};

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(
        "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
      )
    );
  }
  return jwks;
}

export async function verifyFirebaseToken(
  token: string,
  projectId: string
): Promise<{ uid: string; email?: string; name?: string }> {
  const { payload } = await jwtVerify(token, getJwks(), {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });
  const uid = payload.sub;
  if (!uid) throw new Error("Invalid token: no sub");
  return {
    uid,
    email: (payload.email as string) || "",
    name: (payload.name as string) || "",
  };
}

export function authMiddleware() {
  return async (c: Context<{ Bindings: Env; Variables: { db: Db; auth: AuthContext } }>, next: Next) => {
    const db = c.get("db") as Db;
    const env = { ...(process.env as object), ...c.env } as Env;

    // Local-dev bypass: DEV_BYPASS_AUTH=true + x-dev-uid header. Never enable in prod.
    if (env.DEV_BYPASS_AUTH === "true") {
      const devUid = c.req.header("x-dev-uid") || "dev-user";
      const devEmail = c.req.header("x-dev-email") || "dev@example.com";
      const { userId, businessId } = await findOrCreateUser(db, devUid, devEmail, "Dev User");
      c.set("auth", { userId, firebaseUid: devUid, email: devEmail, businessId });
      return next();
    }

    const header = c.req.header("Authorization") || "";
    const m = header.match(/^Bearer (.+)$/);
    if (!m) return c.json({ success: false, error: { code: "UNAUTHORIZED", message: "Missing token" } }, 401);
    const projectId = env.FIREBASE_PROJECT_ID;
    if (!projectId)
      return c.json({ success: false, error: { code: "SERVER_MISCONFIGURED", message: "FIREBASE_PROJECT_ID missing" } }, 500);
    try {
      const { uid, email, name } = await verifyFirebaseToken(m[1], projectId);
      const { userId, businessId } = await findOrCreateUser(db, uid, email || "", name || "");
      c.set("auth", { userId, firebaseUid: uid, email: email || "", businessId });
      return next();
    } catch {
      return c.json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid token" } }, 401);
    }
  };
}

export async function findOrCreateUser(db: Db, firebaseUid: string, email: string, name: string) {
  const existing = await db.select().from(users).where(eq(users.firebase_uid, firebaseUid)).limit(1);
  if (existing[0]) {
    const biz = await db.select().from(businesses).where(eq(businesses.owner_id, existing[0].id)).limit(1);
    return { userId: existing[0].id, businessId: biz[0]?.id ?? null };
  }
  const now = new Date().toISOString();
  const userId = randomUUID();
  await db.insert(users).values({ id: userId, firebase_uid: firebaseUid, email, name, created_at: now, updated_at: now });
  // Auto-create business shell; user completes profile in onboarding.
  const businessId = randomUUID();
  await db.insert(businesses).values({
    id: businessId,
    owner_id: userId,
    name: "My Business",
    invoice_prefix: "INV",
    next_invoice_number: 1,
    created_at: now,
    updated_at: now,
  });
  return { userId, businessId };
}

export function requireBusiness(c: Context<{ Variables: { auth: AuthContext } }>): string | null {
  return c.get("auth").businessId;
}
