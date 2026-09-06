/**
 * Throwaway contract check for wayfinder ticket 10.
 * Confirms Bun can load OPENROUTER_API_KEY from app-root `.env` and hard-fails clearly when missing.
 * Product Hono wiring stays for `/implement`.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const envPath = resolve(root, ".env");

// Bun auto-loads `.env` from cwd; also accept an explicit path if present.
if (existsSync(envPath)) {
  const loaded = await Bun.file(envPath).text();
  for (const line of loaded.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env) || process.env[key] === "") {
      process.env[key] = value;
    }
  }
}

const key = process.env.OPENROUTER_API_KEY?.trim() ?? "";

if (!key) {
  console.error(
    [
      "OPENROUTER_API_KEY is missing or empty.",
      "Add it to a gitignored app-root `.env` (see `.env.example`).",
      "Create a key at https://openrouter.ai/keys — never commit the secret.",
    ].join("\n"),
  );
  process.exit(1);
}

if (key.length < 16) {
  console.error(
    "OPENROUTER_API_KEY looks invalid (too short). Check `.env` and rotate at https://openrouter.ai/keys if needed.",
  );
  process.exit(1);
}

console.log("OPENROUTER_API_KEY present (value not printed). Env hard-fail check passed.");
