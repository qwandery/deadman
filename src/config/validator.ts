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
  if (obj.version !== 1) {
    throw new Error(`Unsupported config version: ${obj.version}. Only version 1 is supported.`);
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

  // Validate each asset
  const assets = obj.assets as Record<string, unknown>;
  for (const [name, asset] of Object.entries(assets)) {
    validateAsset(name, asset);
  }

  return obj as unknown as DeadManConfig;
}

function validateAsset(name: string, raw: unknown): void {
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

  // Validate url-based asset requires sha256
  if (hasUrl && !asset.sha256) {
    throw new Error(`Asset '${name}' with url must have sha256 checksum`);
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
      if (typeof pv.sha256 !== "string") {
        throw new Error(
          `Asset '${name}': platform '${platKey}' missing sha256`
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

  // dest is required unless platforms provide it
  if (!asset.dest && !hasPlatforms && !hasBuild) {
    throw new Error(`Asset '${name}' must have a 'dest' field`);
  }
}

/** Type guard to check if platforms is a source map (object) vs filter list (array) */
export function isPlatformSourceMap(
  platforms: AssetDefinition["platforms"]
): platforms is Record<string, { url: string; sha256: string; extract?: string; dest?: string; rename?: string }> {
  return platforms !== undefined && typeof platforms === "object" && !Array.isArray(platforms);
}
