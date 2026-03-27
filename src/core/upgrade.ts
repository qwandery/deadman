import * as semver from "semver";
import type {
  UpgradeOptions,
  PlatformId,
  VersionConstraint,
} from "../types.js";
import { loadConfig } from "../config/loader.js";
import { detectPlatform, parsePlatform } from "../utils/platform.js";
import { readLockFile } from "./lockfile.js";
import { resolveVersion } from "../version/resolver.js";
import { fetchAssets } from "./fetch.js";

export interface UpgradeEntry {
  name: string;
  from: string | null;
  to: string;
  status: "upgraded" | "skipped" | "failed";
  error?: string;
}

export interface UpgradeResult {
  entries: UpgradeEntry[];
  totalUpgraded: number;
  totalSkipped: number;
  totalFailed: number;
}

/** Upgrade versioned assets to their latest matching versions */
export async function upgradeAssets(
  options: UpgradeOptions
): Promise<UpgradeResult> {
  const { config } = await loadConfig(options.configPath);
  const platform: PlatformId = options.platform
    ? parsePlatform(options.platform)
    : detectPlatform();
  const env = options.env || process.env.DEADMAN_ENV || "dev";

  const lockFile = await readLockFile();
  const entries: UpgradeEntry[] = [];

  // Find which assets need upgrading
  const assetsToUpgrade: Array<{
    name: string;
    constraint: VersionConstraint;
    currentVersion: string | null;
    newVersion: string;
  }> = [];

  for (const [name, def] of Object.entries(config.assets)) {
    // Filter by specific asset names if provided
    if (
      options.assetNames &&
      options.assetNames.length > 0 &&
      !options.assetNames.includes(name)
    ) {
      continue;
    }

    if (!def.version) continue;

    const constraint: VersionConstraint =
      typeof def.version === "string"
        ? { range: def.version, source: {} }
        : def.version;

    // Need a source to upgrade from
    const hasSource =
      constraint.source.github ||
      constraint.source.manifest ||
      constraint.source.pattern;
    if (!hasSource) continue;

    const currentVersion = lockFile?.assets[name]?.version || null;

    try {
      const resolved = await resolveVersion(constraint);

      // Check if upgrade is needed
      if (currentVersion && currentVersion === resolved.version) {
        entries.push({
          name,
          from: currentVersion,
          to: resolved.version,
          status: "skipped",
        });
        continue;
      }

      // Check major version bump protection
      if (
        !options.major &&
        currentVersion &&
        semver.major(resolved.version) > semver.major(currentVersion)
      ) {
        entries.push({
          name,
          from: currentVersion,
          to: resolved.version,
          status: "skipped",
          error: `Major version bump (${semver.major(currentVersion)} -> ${semver.major(resolved.version)}). Use --major to allow.`,
        });
        continue;
      }

      assetsToUpgrade.push({
        name,
        constraint,
        currentVersion,
        newVersion: resolved.version,
      });
    } catch (err) {
      entries.push({
        name,
        from: currentVersion,
        to: "unknown",
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (options.dryRun) {
    for (const asset of assetsToUpgrade) {
      console.log(
        `  [upgrade] ${asset.name} ${asset.currentVersion || "unknown"} -> ${asset.newVersion}`
      );
      entries.push({
        name: asset.name,
        from: asset.currentVersion,
        to: asset.newVersion,
        status: "upgraded",
      });
    }

    return {
      entries,
      totalUpgraded: assetsToUpgrade.length,
      totalSkipped: entries.filter((e) => e.status === "skipped").length,
      totalFailed: entries.filter((e) => e.status === "failed").length,
    };
  }

  // Perform upgrades by re-fetching with force
  if (assetsToUpgrade.length > 0) {
    const assetNames = assetsToUpgrade.map((a) => a.name);

    const fetchResult = await fetchAssets({
      env,
      platform,
      force: true,
      configPath: options.configPath,
      assetNames,
      quiet: false,
    });

    for (const asset of assetsToUpgrade) {
      const failed = fetchResult.errors.find((e) => e.asset === asset.name);
      if (failed) {
        entries.push({
          name: asset.name,
          from: asset.currentVersion,
          to: asset.newVersion,
          status: "failed",
          error: failed.error,
        });
      } else {
        console.log(
          `  [upgrade] ${asset.name} ${asset.currentVersion || "unknown"} -> ${asset.newVersion}`
        );
        entries.push({
          name: asset.name,
          from: asset.currentVersion,
          to: asset.newVersion,
          status: "upgraded",
        });
      }
    }
  }

  return {
    entries,
    totalUpgraded: entries.filter((e) => e.status === "upgraded").length,
    totalSkipped: entries.filter((e) => e.status === "skipped").length,
    totalFailed: entries.filter((e) => e.status === "failed").length,
  };
}
