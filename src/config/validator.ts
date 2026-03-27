import type { DeadManConfig, AssetDefinition } from "../types.js";
import { isValidPlatform } from "../utils/platform.js";

/** Validate a parsed config object */
export function validateConfig(raw: unknown): DeadManConfig {
  if (!raw || typeof raw !== "object") {
    throw new Error("Config must be a YAML object");
  }

  const obj = raw as Record<string, unknown>;

  // version is required
  if (obj.version === undefined) {
    throw new Error("Config missing required field: version");
  }
  if (obj.version !== 1 && obj.version !== 2) {
    throw new Error(`Unsupported config version: ${obj.version}. Supported versions: 1, 2.`);
  }

  // assets is required
  if (!obj.assets || typeof obj.assets !== "object") {
    throw new Error("Config missing required field: assets");
  }

  // Validate defaults
  if (obj.defaults !== undefined) {
    if (typeof obj.defaults !== "object" || obj.defaults === null) {
      throw new Error("Config 'defaults' must be an object");
    }
  }

  // Validate variables
  if (obj.variables !== undefined) {
    if (typeof obj.variables !== "object" || obj.variables === null) {
      throw new Error("Config 'variables' must be an object");
    }
  }

  const configVersion = obj.version as number;
  const defaults = obj.defaults as Record<string, unknown> | undefined;
  const hasDefaultDest = !!(defaults && typeof defaults.dest_dir === "string");

  // Validate each asset
  const assets = obj.assets as Record<string, unknown>;
  for (const [name, asset] of Object.entries(assets)) {
    validateAsset(name, asset, configVersion, hasDefaultDest);
  }

  return obj as unknown as DeadManConfig;
}

function validateAsset(name: string, raw: unknown, configVersion: number, hasDefaultDest: boolean): void {
  if (!raw || typeof raw !== "object") {
    throw new Error(`Asset '${name}' must be an object`);
  }

  const asset = raw as Record<string, unknown>;

  // Must have either url, platforms (as object with urls), or build
  const hasUrl = typeof asset.url === "string";
  const hasPlatforms =
    asset.platforms !== undefined &&
    typeof asset.platforms === "object" &&
    !Array.isArray(asset.platforms);
  const hasBuild =
    asset.build !== undefined && typeof asset.build === "object";

  if (!hasUrl && !hasPlatforms && !hasBuild) {
    throw new Error(
      `Asset '${name}' must have one of: url, platforms (with URLs), or build`
    );
  }

  // Validate url-based asset requires sha256 or trusted
  if (hasUrl && !asset.sha256 && !asset.trusted) {
    throw new Error(`Asset '${name}' with url must have sha256 checksum or trusted: true`);
  }
  if (hasUrl && asset.sha256 && asset.trusted) {
    throw new Error(`Asset '${name}' cannot have both sha256 and trusted: true`);
  }

  // Validate platforms object entries
  if (hasPlatforms) {
    const platforms = asset.platforms as Record<string, unknown>;
    for (const [platKey, platVal] of Object.entries(platforms)) {
      if (!isValidPlatform(platKey)) {
        throw new Error(
          `Asset '${name}': invalid platform '${platKey}'`
        );
      }
      if (!platVal || typeof platVal !== "object") {
        throw new Error(
          `Asset '${name}': platform '${platKey}' must be an object with url and sha256`
        );
      }
      const pv = platVal as Record<string, unknown>;
      if (typeof pv.url !== "string") {
        throw new Error(
          `Asset '${name}': platform '${platKey}' missing url`
        );
      }
      if (typeof pv.sha256 !== "string" && !pv.trusted) {
        throw new Error(
          `Asset '${name}': platform '${platKey}' must have sha256 or trusted: true`
        );
      }
      if (pv.sha256 && pv.trusted) {
        throw new Error(
          `Asset '${name}': platform '${platKey}' cannot have both sha256 and trusted: true`
        );
      }
    }
  }

  // Validate build config
  if (hasBuild) {
    const build = asset.build as Record<string, unknown>;
    if (typeof build.command !== "string") {
      throw new Error(`Asset '${name}': build must have a 'command' string`);
    }
  }

  // Validate environments is an array of strings if present
  if (asset.environments !== undefined) {
    if (!Array.isArray(asset.environments)) {
      throw new Error(`Asset '${name}': environments must be an array`);
    }
  }

  // Validate platforms as array of strings (filter list, not source map)
  if (Array.isArray(asset.platforms)) {
    for (const p of asset.platforms as unknown[]) {
      if (typeof p !== "string" || !isValidPlatform(p)) {
        throw new Error(
          `Asset '${name}': invalid platform filter '${p}'`
        );
      }
    }
  }

  // dest is required unless platforms provide it or defaults.dest_dir is set
  if (!asset.dest && !hasPlatforms && !hasBuild && !hasDefaultDest) {
    throw new Error(`Asset '${name}' must have a 'dest' field (or set defaults.dest_dir)`);
  }

  // Validate version constraint (config v2 only)
  if (asset.version !== undefined) {
    if (configVersion < 2) {
      throw new Error(
        `Asset '${name}' has a 'version' field but config version is ${configVersion}. ` +
          `Set config version to 2 to use version constraints.`
      );
    }
    validateVersionConstraint(name, asset.version);
  }
}

function validateVersionConstraint(assetName: string, version: unknown): void {
  // String shorthand: exact version pin
  if (typeof version === "string") {
    if (!version.trim()) {
      throw new Error(`Asset '${assetName}': version string cannot be empty`);
    }
    return;
  }

  // Object: { range, source }
  if (typeof version === "object" && version !== null) {
    const vc = version as Record<string, unknown>;
    if (typeof vc.range !== "string" || !vc.range.trim()) {
      throw new Error(
        `Asset '${assetName}': version constraint must have a non-empty 'range' string`
      );
    }
    if (!vc.source || typeof vc.source !== "object") {
      throw new Error(
        `Asset '${assetName}': version constraint must have a 'source' object`
      );
    }
    const source = vc.source as Record<string, unknown>;
    const hasGithub = typeof source.github === "string";
    const hasManifest = typeof source.manifest === "string";
    const hasPattern = typeof source.pattern === "string";
    if (!hasGithub && !hasManifest && !hasPattern) {
      throw new Error(
        `Asset '${assetName}': version source must have at least one of: github, manifest, pattern`
      );
    }
    if (hasGithub) {
      const parts = (source.github as string).split("/");
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        throw new Error(
          `Asset '${assetName}': github source must be "owner/repo" format`
        );
      }
    }
    return;
  }

  throw new Error(
    `Asset '${assetName}': version must be a string (exact pin) or object (range + source)`
  );
}

/** Type guard to check if platforms is a source map (object) vs filter list (array) */
export function isPlatformSourceMap(
  platforms: AssetDefinition["platforms"]
): platforms is Record<string, { url: string; sha256?: string; trusted?: boolean; extract?: string; dest?: string; rename?: string }> {
  return platforms !== undefined && typeof platforms === "object" && !Array.isArray(platforms);
}
