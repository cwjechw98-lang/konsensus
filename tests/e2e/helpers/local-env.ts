import fs from "node:fs";
import path from "node:path";

let cachedEnv: Record<string, string> | null = null;

function stripQuotes(value: string) {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

export function loadLocalEnv() {
  if (cachedEnv) return cachedEnv;

  const envPath = path.resolve(process.cwd(), ".env.local");
  const content = fs.readFileSync(envPath, "utf8");
  const env: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator <= 0) continue;

    const key = line.slice(0, separator).trim();
    const value = stripQuotes(line.slice(separator + 1).trim());
    env[key] = value;
  }

  cachedEnv = env;
  return env;
}

export function requireLocalEnv(key: string) {
  const value = process.env[key] ?? loadLocalEnv()[key];
  if (!value) {
    throw new Error(`Missing required env: ${key}`);
  }
  return value;
}
