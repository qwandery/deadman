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
    // Use a set of all known environments to resolve all assets with finalDest
    const envSet = new Set<string>();
    for (const def of Object.values(config.assets)) {
      if (def.environments) {
        for (const e of def.environments) envSet.add(e);
      }
    }
    if (envSet.size === 0) envSet.add("dev");

    const seen = new Set<string>();
    for (const e of envSet) {
      const assets = resolveAssets(config, platform, e, options.assetNames);
      for (const asset of assets) {
        if (!seen.has(asset.name)) {
          seen.add(asset.name);
          assetsToClean.push({ name: asset.name, dest: asset.finalDest });
        }
      }
    }
  } else {
    const assets = resolveAssets(config, platform, env || "dev", options.assetNames);
    for (const asset of assets) {
      assetsToClean.push({ name: asset.name, dest: asset.finalDest });
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

