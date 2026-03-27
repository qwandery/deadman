import { existsSync, statSync } from "node:fs";
import { chmod, rm, mkdir, rename } from "node:fs/promises";
import { resolve, dirname, join as pathJoin } from "node:path";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type {
  ResolvedAsset,
  LockFile,
  FetchOptions,
  PlatformId,
} from "../types.js";
import { loadConfig } from "../config/loader.js";
import { resolveAssetsAsync, applyVersionOverrides } from "../config/resolver.js";
import { detectPlatform, parsePlatform } from "../utils/platform.js";
import { sha256File, sha256String } from "../utils/hash.js";
import { downloadFile } from "./downloader.js";
import { extractFromArchive, placeFile } from "./extractor.js";
import { executeBuild } from "./builder.js";
import {
  createLockFile,
  setLockFileAsset,
  setLockFileAssetWithVersion,
  writeLockFile,
  readLockFile,
} from "./lockfile.js";

export interface FetchResult {
  total: number;
  fetched: number;
  skipped: number;
  failed: number;
  errors: Array<{ asset: string; error: string }>;
}

/** Fetch assets based on config and options */
export async function fetchAssets(options: FetchOptions): Promise<FetchResult> {
  const { config, rawContent } = await loadConfig(options.configPath);
  const platform: PlatformId = options.platform
    ? parsePlatform(options.platform)
    : detectPlatform();
  const env = options.env || process.env.DEADMAN_ENV || "dev";

  let assets = await resolveAssetsAsync(config, platform, env, options.assetNames);

  // Apply version overrides (used by upgrade/rollback to force specific versions)
  if (options.versionOverrides) {
    assets = applyVersionOverrides(assets, options.versionOverrides, config, platform);
  }

  const configHash = sha256String(rawContent);

  // Read existing lock file for skip-if-valid
  const existingLock = await readLockFile();
  const lockFile = createLockFile(platform, env, configHash);

  const result: FetchResult = {
    total: assets.length,
    fetched: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  if (assets.length === 0) {
    if (!options.quiet) {
      console.log("No assets to fetch for current platform/environment.");
    }
    await writeLockFile(lockFile);
    return result;
  }

  // Process assets with concurrency control
  const parallel = options.parallel ?? 3;
  const chunks = chunkArray(assets, parallel);

  for (const chunk of chunks) {
    const promises = chunk.map((asset) =>
      fetchSingleAsset(asset, {
        force: options.force ?? false,
        dryRun: options.dryRun ?? false,
        quiet: options.quiet ?? false,
        verbose: options.verbose ?? false,
        allowInsecure: options.allowInsecure ?? false,
        existingLock,
        lockFile,
      }).then((fetchResult) => {
        if (fetchResult === "skipped") {
          result.skipped++;
        } else if (fetchResult === "fetched") {
          result.fetched++;
        } else {
          result.failed++;
          result.errors.push({ asset: asset.name, error: fetchResult });
        }
      })
    );
    await Promise.all(promises);
  }

  // Write lock file
  if (!options.dryRun) {
    await writeLockFile(lockFile);
  }

  return result;
}

async function fetchSingleAsset(
  asset: ResolvedAsset,
  opts: {
    force: boolean;
    dryRun: boolean;
    quiet: boolean;
    verbose: boolean;
    allowInsecure: boolean;
    existingLock: LockFile | null;
    lockFile: LockFile;
  }
): Promise<"fetched" | "skipped" | string> {
  const destPath = resolve(asset.dest);

  // Check if already valid (skip-if-valid)
  if (!opts.force && existsSync(destPath)) {
    if (asset.sha256) {
      try {
        const existingHash = await sha256File(destPath);
        if (existingHash === asset.sha256) {
          if (!opts.quiet) {
            console.log(`  [skip] ${asset.name} — already valid`);
          }
          setLockFileAsset(opts.lockFile, asset.name, {
            status: "present",
            path: asset.dest,
            sha256: existingHash,
            fetched_at: opts.existingLock?.assets[asset.name]?.fetched_at,
            source: asset.url,
          });
          return "skipped";
        }
      } catch {
        // File exists but can't be read — proceed with fetch
      }
    } else if (asset.trusted) {
      // Trusted asset: skip if exists with non-zero size
      try {
        const st = statSync(destPath);
        if ((st.isFile() && st.size > 0) || st.isDirectory()) {
          if (!opts.quiet) {
            console.log(`  [skip] ${asset.name} — already present (trusted)`);
          }
          setLockFileAsset(opts.lockFile, asset.name, {
            status: "present",
            path: asset.dest,
            fetched_at: opts.existingLock?.assets[asset.name]?.fetched_at,
            source: asset.url,
          });
          return "skipped";
        }
      } catch {
        // Can't stat — proceed with fetch
      }
    }
  }

  if (opts.dryRun) {
    if (asset.build) {
      console.log(`  [dry-run] ${asset.name} — would build: ${asset.build.command}`);
    } else {
      console.log(`  [dry-run] ${asset.name} — would fetch: ${asset.url}`);
    }
    return "fetched";
  }

  // Build-based asset
  if (asset.build) {
    if (!opts.quiet) {
      console.log(`  [build] ${asset.name}...`);
    }
    const buildResult = await executeBuild(asset.build.command, asset.build.check);
    if (!buildResult.success) {
      return buildResult.error || "Build failed";
    }

    if (asset.executable) {
      await setExecutable(destPath);
    }

    setLockFileAsset(opts.lockFile, asset.name, {
      status: "present",
      path: asset.dest,
      sha256: asset.build.skipChecksum
        ? undefined
        : await sha256File(destPath).catch(() => undefined),
      fetched_at: new Date().toISOString(),
      source: `build:${asset.build.command}`,
    });
    return "fetched";
  }

  // Download-based asset
  if (!asset.url) {
    return "No URL specified for asset";
  }

  if (!opts.quiet) {
    console.log(`  [fetch] ${asset.name}...`);
  }

  const cacheDir = process.env.DEADMAN_CACHE_DIR || tmpdir();
  const tempPath = join(cacheDir, `deadman-${randomUUID()}`);

  try {
    const dlResult = await downloadFile(asset.url, tempPath, opts.allowInsecure);

    // Verify checksum
    if (asset.sha256 && dlResult.sha256 !== asset.sha256) {
      await rm(tempPath, { force: true });
      return `Checksum mismatch for ${asset.name}: expected ${asset.sha256}, got ${dlResult.sha256}`;
    }

    // Extract or place
    if (asset.extract) {
      await extractFromArchive(tempPath, asset.extract, destPath, asset.url);
      await rm(tempPath, { force: true });
    } else {
      await mkdir(dirname(destPath), { recursive: true });
      await placeFile(tempPath, destPath);
      await rm(tempPath, { force: true });
    }

    // Rename if specified
    let finalPath = destPath;
    if (asset.rename) {
      const renamedPath = pathJoin(dirname(destPath), asset.rename);
      await rename(destPath, renamedPath);
      finalPath = renamedPath;
    }

    // Set executable
    if (asset.executable) {
      await setExecutable(finalPath);
    }

    if (opts.verbose) {
      console.log(
        `    Downloaded ${formatSize(dlResult.size)} from ${asset.url}`
      );
    }

    const lockEntry = {
      status: "present" as const,
      path: asset.rename ? pathJoin(dirname(asset.dest), asset.rename) : asset.dest,
      sha256: dlResult.sha256,
      fetched_at: new Date().toISOString(),
      source: asset.url,
    };

    if (asset.version) {
      setLockFileAssetWithVersion(
        opts.lockFile,
        asset.name,
        lockEntry,
        asset.version
      );
    } else {
      setLockFileAsset(opts.lockFile, asset.name, lockEntry);
    }

    return "fetched";
  } catch (err) {
    await rm(tempPath, { force: true }).catch(() => {});
    const message = err instanceof Error ? err.message : String(err);
    return message;
  }
}

async function setExecutable(filePath: string): Promise<void> {
  if (process.platform !== "win32") {
    await chmod(filePath, 0o755);
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
