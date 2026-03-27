import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import type { VersionInfo } from "./types.js";

interface CacheEntry {
  versions: VersionInfo[];
  fetched_at: string;
}

interface CacheData {
  entries: Record<string, CacheEntry>;
}

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Get the cache file path */
function getCachePath(): string {
  const cacheDir =
    process.env.DEADMAN_CACHE_DIR ||
    resolve(process.cwd(), "node_modules", ".cache", "deadman");
  return resolve(cacheDir, "versions.json");
}

/** Get TTL from environment or default */
function getTtlMs(): number {
  const envTtl = process.env.DEADMAN_VERSION_CACHE_TTL;
  if (envTtl) {
    const seconds = parseInt(envTtl, 10);
    if (!isNaN(seconds) && seconds >= 0) {
      return seconds * 1000;
    }
  }
  return DEFAULT_TTL_MS;
}

/** Read the cache file */
async function readCache(): Promise<CacheData> {
  const cachePath = getCachePath();
  if (!existsSync(cachePath)) {
    return { entries: {} };
  }
  try {
    const content = await readFile(cachePath, "utf-8");
    return JSON.parse(content) as CacheData;
  } catch {
    return { entries: {} };
  }
}

/** Write the cache file */
async function writeCache(data: CacheData): Promise<void> {
  const cachePath = getCachePath();
  const dir = dirname(cachePath);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(cachePath, JSON.stringify(data, null, 2), "utf-8");
}

/** Get cached versions for a source key, or null if expired/missing */
export async function getCachedVersions(
  key: string
): Promise<VersionInfo[] | null> {
  const cache = await readCache();
  const entry = cache.entries[key];
  if (!entry) {
    return null;
  }

  const age = Date.now() - new Date(entry.fetched_at).getTime();
  if (age > getTtlMs()) {
    return null;
  }

  return entry.versions;
}

/** Store versions in the cache */
export async function setCachedVersions(
  key: string,
  versions: VersionInfo[]
): Promise<void> {
  const cache = await readCache();
  cache.entries[key] = {
    versions,
    fetched_at: new Date().toISOString(),
  };
  await writeCache(cache);
}

/** Clear the entire version cache */
export async function clearVersionCache(): Promise<void> {
  await writeCache({ entries: {} });
}
