import { existsSync, readFileSync } from "node:fs";

/** Minimal .env.local loader for CLI scripts (Next loads it automatically for the app). */
export function loadEnv(file = ".env.local") {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
export function requireWriteEnv() {
  const miss = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter((k) => !process.env[k]);
  if (miss.length) { console.error(`Missing ${miss.join(", ")}. Add to .env.local (Supabase → Project Settings → API → service_role key).`); process.exit(1); }
}
