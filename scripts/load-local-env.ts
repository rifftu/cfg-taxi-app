import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Loads .env.local for Node-based validation scripts without printing secrets. */
export function loadLocalEnv(cwd = process.cwd()) {
  const envPath = resolve(cwd, ".env.local");

  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1).trim();

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function hasEnvValues(keys: string[]) {
  return keys.every((key) => Boolean(process.env[key]?.trim()));
}
