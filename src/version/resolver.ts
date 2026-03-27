import * as semver from "semver";
import type {
  VersionSource,
  VersionConstraint,
  VersionInfo,
  ResolvedVersion,
} from "./types.js";
import { getCachedVersions, setCachedVersions } from "./cache.js";
import { githubProvider } from "./providers/github.js";
import { manifestProvider } from "./providers/manifest.js";
import { patternProvider } from "./providers/pattern.js";

/** Build a cache key from a version source */
function cacheKey(source: VersionSource): string {
  if (source.github) return `github:${source.github}`;
  if (source.manifest) return `manifest:${source.manifest}`;
  if (source.pattern) return `pattern:${source.pattern}`;
  throw new Error("Version source must have at least one provider field");
}

/** Determine the provider for a version source */
function getProviderName(source: VersionSource): string {
  if (source.github) return "github";
  if (source.manifest) return "manifest";
  if (source.pattern) return "pattern";
  throw new Error("Version source must have at least one provider field");
}

/** Fetch versions from the appropriate provider, with caching */
async function fetchVersions(source: VersionSource): Promise<VersionInfo[]> {
  const key = cacheKey(source);

  // Check cache first
  const cached = await getCachedVersions(key);
  if (cached) {
    return cached;
  }

  // Fetch from provider
  let versions: VersionInfo[];
  if (source.github) {
    versions = await githubProvider.listVersions(source);
  } else if (source.manifest) {
    versions = await manifestProvider.listVersions(source);
  } else if (source.pattern) {
    versions = await patternProvider.listVersions(source);
  } else {
    throw new Error("Version source must have at least one provider field");
  }

  // Cache results
  await setCachedVersions(key, versions);

  return versions;
}

/** Check if a range string is an exact version pin (no range operators) */
export function isExactPin(range: string): boolean {
  if (range === "latest") return false;
  const parsed = semver.valid(range);
  return parsed !== null;
}

/** Resolve a version constraint to a concrete version */
export async function resolveVersion(
  constraint: VersionConstraint
): Promise<ResolvedVersion> {
  const { range, source } = constraint;
  const providerName = getProviderName(source);

  // Exact pin: use directly, no provider query needed
  if (isExactPin(range)) {
    const version = semver.valid(range);
    if (!version) {
      throw new Error(`Invalid version pin: ${range}`);
    }
    return {
      version,
      tag: `v${version}`,
      constraint: range,
      provider: providerName,
    };
  }

  // Fetch available versions from provider
  const versions = await fetchVersions(source);
  if (versions.length === 0) {
    throw new Error(
      `No versions found from ${providerName} source`
    );
  }

  // "latest": select the most recent non-prerelease version
  if (range === "latest") {
    const latest = versions.find((v) => !semver.prerelease(v.version));
    if (!latest) {
      throw new Error("No stable (non-prerelease) versions found");
    }
    return {
      version: latest.version,
      tag: latest.tag,
      constraint: range,
      provider: providerName,
    };
  }

  // Semver range: find the highest matching version
  const versionStrings = versions.map((v) => v.version);
  const matched = semver.maxSatisfying(versionStrings, range);
  if (!matched) {
    throw new Error(
      `No version matching "${range}" found. Available: ${versionStrings.slice(0, 5).join(", ")}${versionStrings.length > 5 ? "..." : ""}`
    );
  }

  const matchedInfo = versions.find((v) => v.version === matched)!;
  return {
    version: matched,
    tag: matchedInfo.tag,
    constraint: range,
    provider: providerName,
  };
}

/** Get available versions for a source (for outdated checking) */
export async function listAvailableVersions(
  source: VersionSource
): Promise<VersionInfo[]> {
  return fetchVersions(source);
}

/** Find the latest version matching a constraint */
export async function getLatestMatching(
  constraint: VersionConstraint
): Promise<VersionInfo | null> {
  const resolved = await resolveVersion(constraint);
  const versions = await fetchVersions(constraint.source);
  return versions.find((v) => v.version === resolved.version) || null;
}
