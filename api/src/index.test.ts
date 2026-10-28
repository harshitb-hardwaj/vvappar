import { describe, expect, it } from "vitest";
import app from "./index.js";

function devEnv() {
  return {
    TURSO_DATABASE_URL: "file::memory:?cache=shared",
    DEV_BYPASS_AUTH: "true",
    FIREBASE_PROJECT_ID: "test",
  };
}

describe("authorization", () => {
  it("rejects without token when bypass off", async () => {
    const res = await app.request("/api/me", {}, { TURSO_DATABASE_URL: "file::memory:" } as never);
    expect([401, 500]).toContain(res.status);
  });
  it("health is public", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
  });
});
