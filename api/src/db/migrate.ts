import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// Minimal migrator: applies init.sql statements. Keeps local dev simple.
// For Turso remote, same HTTP path works via libsql client.
export async function migrate() {
  const url = process.env.TURSO_DATABASE_URL || "file:./local.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const client = createClient({ url, authToken });
  const ddl = readFileSync(join(here, "init.sql"), "utf-8");
  const statements = ddl
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const stmt of statements) {
    await client.execute(stmt);
  }
  console.log(`migrated ${statements.length} statements -> ${url}`);
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
