import { rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { PlatformId, CleanOptions } from "../types.js";
import { loadConfig } from "../config/loader.js";
import { resolveAssets } from "../config/resolver.js";
import { detectPlatform, parsePlatform } from "../utils/platform.js";
import { deleteLockFile } from "./lockfile.js";

export interface CleanResult {
  total: number;
  deleted: number;
  notFound: number;
  details: Array<{ name: string; path: string; deleted: boolean }>;
}

/** Remove fetched assets */
export async function cleanAssets(options: CleanOptions): Promise<CleanResult> {
  const { config } = await loadConfig(options.configPath);
  const platform: PlatformId = options.platform
    ? parsePlatform(options.platform as string)
    : detectPlatform();

  // If --all, resolve for all environments; otherwise use default
  const env = options.all ? undefined : (process.env.DEADMAN_ENV || "dev");

  // Collect all assets to clean
  const assetsToClean: Array<{ name: string; dest: string }> = [];

  if (options.all) {
    // Resolve for all environments to get all possible assets
    for (const [name, def] of Object.entries(config.assets)) {
      if (options.assetNames?.length && !options.assetNames.includes(name)) {
        continue;
      }
      if (def.dest) {
        assetsToClean.push({ name, dest: def.dest });
      }
    }
  } else {
    const assets = resolveAssets(config, platform, env || "dev", options.assetNames);
    for (const asset of assets) {
      assetsToClean.push({ name: asset.name, dest: asset.dest });
    }
  }

  const result: CleanResult = {
    total: assetsToClean.length,
    deleted: 0,
    notFound: 0,
    details: [],
  };

  for (const asset of assetsToClean) {
    const destPath = resolve(asset.dest);

    if (!existsSync(destPath)) {
      result.notFound++;
      result.details.push({ name: asset.name, path: asset.dest, deleted: false });
      continue;
    }

    if (options.dryRun) {
      console.log(`  [dry-run] Would delete: ${asset.dest}`);
      result.deleted++;
      result.details.push({ name: asset.name, path: asset.dest, deleted: true });
      continue;
    }

    await rm(destPath, { force: true, recursive: true });
    result.deleted++;
    result.details.push({ name: asset.name, path: asset.dest, deleted: true });
  }

  // Delete lock file unless --keep-lock
  if (!options.keepLock && !options.dryRun) {
    await deleteLockFile();
  }

  return result;
}

