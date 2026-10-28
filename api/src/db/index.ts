import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema.js";

export type Env = {
  TURSO_DATABASE_URL?: string;
  TURSO_AUTH_TOKEN?: string;
  FIREBASE_PROJECT_ID?: string;
  DEV_BYPASS_AUTH?: string;
  R2_BUCKET?: unknown; // future: Cloudflare R2 binding for logos/PDFs
};

export function getDb(env: Env) {
  const url = env.TURSO_DATABASE_URL || "file:./local.db";
  const authToken = env.TURSO_AUTH_TOKEN;
  const client = createClient({ url, authToken });
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof getDb>;
