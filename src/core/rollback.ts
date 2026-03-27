import type { RollbackOptions } from "../types.js";
import { readLockFile, writeLockFile, setLockFileAsset } from "./lockfile.js";
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

  // Re-fetch the target version by forcing a fetch
  // The version resolution will need to pick up the right version
  // For now, we update the lockfile entry directly since we have the hash
  try {
    // Update lockfile with the rolled-back version
    setLockFileAsset(lockFile, options.assetName, {
      status: lockEntry.status,
      path: lockEntry.path,
      sha256: target.sha256,
      fetched_at: new Date().toISOString(),
      source: lockEntry.source,
      version: target.version,
      version_constraint: lockEntry.version_constraint,
      previous_versions: previousVersions.filter(
        (pv) => pv.version !== target!.version
      ),
    });

    await writeLockFile(lockFile);

    // Force re-fetch to get the actual files
    await fetchAssets({
      env: process.env.DEADMAN_ENV || "dev",
      force: true,
      configPath: options.configPath,
      assetNames: [options.assetName],
      quiet: true,
    });

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
