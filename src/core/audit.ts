import * as semver from "semver";
import type { PlatformId, VersionConstraint } from "../types.js";
import { loadConfig } from "../config/loader.js";
import { detectPlatform, parsePlatform } from "../utils/platform.js";
import { readLockFile } from "./lockfile.js";
import { listAvailableVersions } from "../version/resolver.js";

export interface AuditEntry {
  name: string;
  currentVersion: string | null;
  latestVersion: string | null;
  versionsBehind: number;
  severity: "ok" | "info" | "warn" | "critical";
  message: string;
}

export interface AuditResult {
  entries: AuditEntry[];
  totalAudited: number;
  warnings: number;
  critical: number;
}

export interface AuditOptions {
  env?: string;
  platform?: PlatformId;
  configPath?: string;
  /** Maximum versions behind before warning (default: 5) */
  warnThreshold?: number;
  /** Maximum versions behind before critical (default: 10) */
  criticalThreshold?: number;
  json?: boolean;
}

/** Audit versioned assets for age and update status */
export async function auditAssets(options: AuditOptions): Promise<AuditResult> {
  const { config } = await loadConfig(options.configPath);
  const platform: PlatformId = options.platform
    ? parsePlatform(options.platform)
    : detectPlatform();
  const env = options.env || process.env.DEADMAN_ENV || "dev";
  void platform;
  void env;

  const lockFile = await readLockFile();
  const warnThreshold = options.warnThreshold ?? 5;
  const criticalThreshold = options.criticalThreshold ?? 10;
  const entries: AuditEntry[] = [];

  for (const [name, def] of Object.entries(config.assets)) {
    if (!def.version) continue;

    const constraint: VersionConstraint =
      typeof def.version === "string"
        ? { range: def.version, source: {} }
        : def.version;

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

      let versionsBehind = 0;
      if (currentVersion) {
        versionsBehind = stableVersions.filter((v) =>
          semver.gt(v, currentVersion)
        ).length;
      } else {
        versionsBehind = stableVersions.length;
      }

      let severity: AuditEntry["severity"] = "ok";
      let message = "Up to date";

      if (versionsBehind >= criticalThreshold) {
        severity = "critical";
        message = `${versionsBehind} versions behind — strongly recommend updating`;
      } else if (versionsBehind >= warnThreshold) {
        severity = "warn";
        message = `${versionsBehind} versions behind — consider updating`;
      } else if (versionsBehind > 0) {
        severity = "info";
        message = `${versionsBehind} version${versionsBehind === 1 ? "" : "s"} behind`;
      }

      entries.push({
        name,
        currentVersion,
        latestVersion: stableVersions[0] || null,
        versionsBehind,
        severity,
        message,
      });
    } catch {
      entries.push({
        name,
        currentVersion,
        latestVersion: null,
        versionsBehind: 0,
        severity: "warn",
        message: "Unable to check — version source unavailable",
      });
    }
  }

  return {
    entries,
    totalAudited: entries.length,
    warnings: entries.filter((e) => e.severity === "warn").length,
    critical: entries.filter((e) => e.severity === "critical").length,
  };
}

/** Format audit results as a table */
export function formatAuditTable(result: AuditResult): string {
  if (result.entries.length === 0) {
    return "No versioned assets with update sources found.";
  }

  const header = "ASSET          CURRENT   LATEST    BEHIND  SEVERITY  MESSAGE";
  const lines = result.entries.map((e) => {
    const name = e.name.padEnd(15);
    const current = (e.currentVersion || "unknown").padEnd(10);
    const latest = (e.latestVersion || "error").padEnd(10);
    const behind = String(e.versionsBehind).padEnd(8);
    const severity = e.severity.padEnd(10);
    return `${name}${current}${latest}${behind}${severity}${e.message}`;
  });
  return [header, ...lines].join("\n");
}
