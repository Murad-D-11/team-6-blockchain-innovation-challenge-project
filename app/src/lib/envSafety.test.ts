import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// app/src/lib -> app. Resolved from this file, not process.cwd().
const APP_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const STELLAR_SECRET = /\bS[A-Z2-7]{55}\b/;

const files = [".env", ".env.example"]
  .map((name) => ({ name, path: resolve(APP_DIR, name) }))
  .filter((f) => existsSync(f.path));

describe("tracked env files hold no secrets", () => {
  it("checks app/.env at least", () => {
    expect(files.map((f) => f.name)).toContain(".env");
  });

  for (const f of files) {
    const text = readFileSync(f.path, "utf8");

    it(`${f.name}: every non-comment line is a NEXT_PUBLIC_ variable`, () => {
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l !== "" && !l.startsWith("#"));
      for (const line of lines) expect(line.startsWith("NEXT_PUBLIC_"), `bad line: ${line.split("=")[0]}`).toBe(true);
    });

    it(`${f.name}: contains nothing that looks like a Stellar secret key`, () => {
      expect(STELLAR_SECRET.test(text)).toBe(false);
    });
  }

  it("the secret-key pattern matches a real-looking key", () => {
    expect(STELLAR_SECRET.test("S" + "A".repeat(55))).toBe(true);
    expect(STELLAR_SECRET.test("G" + "A".repeat(55))).toBe(false);
  });
});
