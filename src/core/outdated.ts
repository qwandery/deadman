import * as semver from "semver";
import type { OutdatedOptions, PlatformId, VersionConstraint } from "../types.js";
import { loadConfig } from "../config/loader.js";
import { detectPlatform, parsePlatform } from "../utils/platform.js";
import { readLockFile } from "./lockfile.js";
import { listAvailableVersions } from "../version/resolver.js";

export interface OutdatedEntry {
  name: string;
  current: string | null;
  latest: string | null;
  constraint: string;
  upToDate: boolean;
}

export interface OutdatedResult {
  entries: OutdatedEntry[];
  totalChecked: number;
  totalOutdated: number;
}

/** Check which versioned assets have newer versions available */
export async function checkOutdated(
  options: OutdatedOptions
): Promise<OutdatedResult> {
  const { config } = await loadConfig(options.configPath);
  const platform: PlatformId = options.platform
    ? parsePlatform(options.platform)
    : detectPlatform();
  const env = options.env || process.env.DEADMAN_ENV || "dev";
  void platform; // Used for context, not filtering here
  void env;

  const lockFile = await readLockFile();
  const entries: OutdatedEntry[] = [];

  for (const [name, def] of Object.entries(config.assets)) {
    if (!def.version) continue;

    const constraint: VersionConstraint =
      typeof def.version === "string"
        ? { range: def.version, source: {} }
        : def.version;

    // Need a source to check for updates
    const hasSource =
      constraint.source.github ||
      constraint.source.manifest ||
      constraint.source.pattern;
    if (!hasSource) continue;

    const currentVersion = lockFile?.assets[name]?.version || null;

    try {
      const available = await listAvailableVersions(constraint.source);
      const stableVersions = available
        .filter((v) => !semver.prerelease(v.version))
        .map((v) => v.version);

      // Find the latest matching the constraint
      let latestMatching: string | null;
      if (constraint.range === "latest") {
        latestMatching = stableVersions[0] || null;
      } else {
        latestMatching =
          semver.maxSatisfying(stableVersions, constraint.range) || null;
      }

      const upToDate =
        currentVersion !== null &&
        latestMatching !== null &&
        currentVersion === latestMatching;

      entries.push({
        name,
        current: currentVersion,
        latest: latestMatching,
        constraint: constraint.range,
        upToDate,
      });
    } catch {
      entries.push({
        name,
        current: currentVersion,
        latest: null,
        constraint: constraint.range,
        upToDate: false,
      });
    }
  }

  return {
    entries,
    totalChecked: entries.length,
    totalOutdated: entries.filter((e) => !e.upToDate).length,
  };
}

/** Format outdated results as a table */
export function formatOutdatedTable(result: OutdatedResult): string {
  if (result.entries.length === 0) {
    return "No versioned assets with update sources found.";
  }

  const header = "ASSET          CURRENT   LATEST    CONSTRAINT";
  const lines = result.entries.map((e) => {
    const name = e.name.padEnd(15);
    const current = (e.current || "unknown").padEnd(10);
    const latest = (e.latest || "error").padEnd(10);
    const constraint = e.constraint;
    const suffix = e.upToDate ? " (up to date)" : "";
    return `${name}${current}${latest}${constraint}${suffix}`;
  });
  return [header, ...lines].join("\n");
}
