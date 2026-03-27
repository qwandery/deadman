import { existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import type { PlatformId, ListOptions } from "../types.js";
import { loadConfig } from "../config/loader.js";
import { resolveAssets } from "../config/resolver.js";
import { detectPlatform, parsePlatform } from "../utils/platform.js";
import { sha256File } from "../utils/hash.js";
import { readLockFile } from "./lockfile.js";

export interface ListEntry {
  name: string;
  platform: string;
  environment: string;
  status: "present" | "missing" | "invalid";
  size: string | null;
  path: string;
  version?: string;
}

/** List all assets and their status */
export async function listAssets(options: ListOptions): Promise<ListEntry[]> {
  const { config } = await loadConfig(options.configPath);
  const platform: PlatformId = options.platform
    ? parsePlatform(options.platform)
    : detectPlatform();
  const env = options.env || process.env.DEADMAN_ENV || "dev";

  const assets = resolveAssets(config, platform, env);
  const lockFile = await readLockFile();
  const entries: ListEntry[] = [];

  for (const asset of assets) {
    const destPath = resolve(asset.finalDest);
    let status: "present" | "missing" | "invalid" = "missing";
    let size: string | null = null;

    if (existsSync(destPath)) {
      const fileStat = await stat(destPath);
      size = formatSize(fileStat.size);

      if (fileStat.isDirectory()) {
        // Extracted archive — can't checksum-verify the directory
        status = "present";
      } else if (fileStat.size === 0) {
        // Empty file is invalid regardless of checksum or trusted
        status = "invalid";
      } else if (asset.sha256) {
        const actualHash = await sha256File(destPath);
        status = actualHash === asset.sha256 ? "present" : "invalid";
      } else {
        status = "present";
      }
    }

    // Determine environment display
    const assetDef = config.assets[asset.name];
    const envDisplay = assetDef?.environments
      ? assetDef.environments.join(",")
      : "all";

    entries.push({
      name: asset.name,
      platform,
      environment: envDisplay,
      status,
      size,
      path: asset.finalDest,
      version: lockFile?.assets[asset.name]?.version,
    });
  }

  // Filter by status
  if (options.status && options.status !== "all") {
    return entries.filter((e) => e.status === options.status);
  }

  return entries;
}

/** Format table output for list command */
export function formatListTable(entries: ListEntry[]): string {
  const hasVersions = entries.some((e) => e.version);

  if (hasVersions) {
    const header =
      "ASSET          VERSION   PLATFORM      ENV   STATUS    SIZE      PATH";
    const lines = entries.map((e) => {
      const name = e.name.padEnd(15);
      const ver = (e.version || "-").padEnd(10);
      const plat = e.platform.padEnd(14);
      const env = e.environment.padEnd(6);
      const status = e.status.padEnd(10);
      const size = (e.size || "-").padEnd(10);
      return `${name}${ver}${plat}${env}${status}${size}${e.path}`;
    });
    return [header, ...lines].join("\n");
  }

  const header = "ASSET          PLATFORM      ENV   STATUS    SIZE      PATH";
  const lines = entries.map((e) => {
    const name = e.name.padEnd(15);
    const plat = e.platform.padEnd(14);
    const env = e.environment.padEnd(6);
    const status = e.status.padEnd(10);
    const size = (e.size || "-").padEnd(10);
    return `${name}${plat}${env}${status}${size}${e.path}`;
  });
  return [header, ...lines].join("\n");
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
