import type { RollbackOptions } from "../types.js";
import { readLockFile, writeLockFile } from "./lockfile.js";
import { fetchAssets } from "./fetch.js";

export interface RollbackResult {
  name: string;
  from: string | null;
  to: string;
  status: "rolled_back" | "failed";
  error?: string;
}

/** Roll back an asset to a previous version */
export async function rollbackAsset(
  options: RollbackOptions
): Promise<RollbackResult> {
  const lockFile = await readLockFile();

  if (!lockFile) {
    return {
      name: options.assetName,
      from: null,
      to: "unknown",
      status: "failed",
      error: "No lockfile found. Nothing to roll back.",
    };
  }

  const lockEntry = lockFile.assets[options.assetName];
  if (!lockEntry) {
    return {
      name: options.assetName,
      from: null,
      to: "unknown",
      status: "failed",
      error: `Asset '${options.assetName}' not found in lockfile.`,
    };
  }

  const previousVersions = lockEntry.previous_versions || [];
  if (previousVersions.length === 0) {
    return {
      name: options.assetName,
      from: lockEntry.version || null,
      to: "unknown",
      status: "failed",
      error: `No previous versions available for '${options.assetName}'.`,
    };
  }

  // Find target version
  let target;
  if (options.target && options.target !== "previous") {
    target = previousVersions.find((pv) => pv.version === options.target);
    if (!target) {
      return {
        name: options.assetName,
        from: lockEntry.version || null,
        to: options.target,
        status: "failed",
        error: `Version '${options.target}' not found in rollback history for '${options.assetName}'. Available: ${previousVersions.map((pv) => pv.version).join(", ")}`,
      };
    }
  } else {
    // Default: most recent previous version
    target = previousVersions[0];
  }

  const currentVersion = lockEntry.version || null;

  // Fetch the target version first, then update lockfile on success
  try {
    // Force re-fetch with the target version override so ${version} expands correctly
    const fetchResult = await fetchAssets({
      env: process.env.DEADMAN_ENV || "dev",
      force: true,
      configPath: options.configPath,
      assetNames: [options.assetName],
      versionOverrides: { [options.assetName]: target.version },
      quiet: true,
    });

    if (fetchResult.failed > 0) {
      const error = fetchResult.errors.find((e) => e.asset === options.assetName);
      return {
        name: options.assetName,
        from: currentVersion,
        to: target.version,
        status: "failed",
        error: error?.error || "Fetch failed during rollback",
      };
    }

    // Fetch succeeded — now update rollback history in the lockfile
    // Re-read the lockfile that fetchAssets just wrote
    const updatedLock = await readLockFile();
    if (updatedLock) {
      const entry = updatedLock.assets[options.assetName];
      if (entry) {
        // Update previous_versions: remove the target we rolled back to
        entry.previous_versions = previousVersions.filter(
          (pv) => pv.version !== target!.version
        );
        entry.version_constraint = lockEntry.version_constraint;
      }
      await writeLockFile(updatedLock);
    }

    return {
      name: options.assetName,
      from: currentVersion,
      to: target.version,
      status: "rolled_back",
    };
  } catch (err) {
    return {
      name: options.assetName,
      from: currentVersion,
      to: target.version,
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
