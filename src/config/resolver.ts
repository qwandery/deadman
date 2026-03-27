import type {
  DeadManConfig,
  PlatformId,
  ResolvedAsset,
  VersionConstraint,
} from "../types.js";
import { isPlatformSourceMap } from "./validator.js";
import { buildTemplateContext, expandTemplate } from "../utils/template.js";
import { resolveVersion, isExactPin } from "../version/resolver.js";

/** Normalize an asset's version field into a VersionConstraint or undefined */
function normalizeVersionConstraint(
  version: string | VersionConstraint | undefined
): VersionConstraint | undefined {
  if (!version) return undefined;
  if (typeof version === "string") {
    // Exact pin string — no source needed, resolver handles this
    return { range: version, source: {} };
  }
  return version;
}

/** Resolve all assets for a given platform and environment */
export function resolveAssets(
  config: DeadManConfig,
  platform: PlatformId,
  environment: string,
  assetNames?: string[]
): ResolvedAsset[] {
  // Synchronous version — for v1 configs and v2 configs without version constraints
  return resolveAssetsSync(config, platform, environment, assetNames);
}

/** Async version that resolves version constraints (config v2) */
export async function resolveAssetsAsync(
  config: DeadManConfig,
  platform: PlatformId,
  environment: string,
  assetNames?: string[]
): Promise<ResolvedAsset[]> {
  // First do synchronous resolution
  const assets = resolveAssetsSync(config, platform, environment, assetNames);

  // If config v1, no version resolution needed
  if (config.version < 2) return assets;

  // For v2 configs, resolve any version constraints
  const resolvedAssets: ResolvedAsset[] = [];
  for (const asset of assets) {
    const def = config.assets[asset.name];
    const constraint = normalizeVersionConstraint(def?.version);

    if (constraint && constraint.range) {
      // Only resolve if there's actually a source to query (not bare exact pins handled by template)
      const hasSource =
        constraint.source.github ||
        constraint.source.manifest ||
        constraint.source.pattern;

      if (hasSource || !isExactPin(constraint.range)) {
        const resolved = await resolveVersion(constraint);
        // Re-expand templates with the resolved version injected
        const context = buildTemplateContext(platform, {
          ...config.variables,
          version: resolved.version,
        });
        const baseUrl = config.defaults?.base_url
          ? expandTemplate(config.defaults.base_url, context)
          : undefined;

        // Re-resolve URL and sha256 with new version context
        if (asset.url) {
          asset.url = resolveUrl(
            config.assets[asset.name]?.url ||
              getOriginalUrl(config, asset.name, platform) ||
              asset.url,
            baseUrl,
            context
          );
        }
        if (def?.sha256) {
          asset.sha256 = expandTemplate(def.sha256, context);
        }
        asset.version = resolved.version;
      } else {
        // Exact pin with no source — just set the version
        asset.version = constraint.range;
      }
    }
    resolvedAssets.push(asset);
  }

  return resolvedAssets;
}

/** Get the original URL template from a platform source map */
function getOriginalUrl(
  config: DeadManConfig,
  assetName: string,
  platform: PlatformId
): string | undefined {
  const def = config.assets[assetName];
  if (!def) return undefined;
  if (isPlatformSourceMap(def.platforms)) {
    return def.platforms[platform]?.url;
  }
  return def.url;
}

function resolveAssetsSync(
  config: DeadManConfig,
  platform: PlatformId,
  environment: string,
  assetNames?: string[]
): ResolvedAsset[] {
  const context = buildTemplateContext(platform, config.variables);
  const defaultDest = config.defaults?.dest_dir;
  const baseUrl = config.defaults?.base_url
    ? expandTemplate(config.defaults.base_url, context)
    : undefined;

  const resolved: ResolvedAsset[] = [];

  for (const [name, def] of Object.entries(config.assets)) {
    // Filter by specific asset names if provided
    if (assetNames && assetNames.length > 0 && !assetNames.includes(name)) {
      continue;
    }

    // Filter by environment
    if (def.environments && !def.environments.includes(environment)) {
      continue;
    }

    // Handle platform-specific sources (object map)
    if (isPlatformSourceMap(def.platforms)) {
      const platSource = def.platforms[platform];
      if (!platSource) {
        continue; // No source for this platform
      }

      const url = resolveUrl(platSource.url, baseUrl, context);
      const dest = platSource.dest || def.dest || joinDest(defaultDest, name);

      resolved.push({
        name,
        description: def.description,
        url,
        sha256: platSource.sha256
          ? expandTemplate(platSource.sha256, context)
          : undefined,
        trusted: platSource.trusted || def.trusted,
        extract: platSource.extract
          ? expandTemplate(platSource.extract, context)
          : def.extract
            ? expandTemplate(def.extract, context)
            : undefined,
        dest: expandTemplate(dest, context),
        rename: platSource.rename || def.rename,
        executable: def.executable,
      });
      continue;
    }

    // Filter by platform list (array filter)
    if (Array.isArray(def.platforms)) {
      if (!def.platforms.includes(platform)) {
        continue;
      }
    }

    // Build-based asset
    if (def.build) {
      const buildCommand =
        def.build.platforms?.[platform]?.command || def.build.command;
      const dest = def.dest || joinDest(defaultDest, name);

      resolved.push({
        name,
        description: def.description,
        dest: expandTemplate(dest, context),
        executable: def.executable,
        build: {
          command: expandTemplate(buildCommand, context),
          check: def.build.check
            ? expandTemplate(def.build.check, context)
            : undefined,
          skipChecksum: def.build.sha256 === false,
        },
      });
      continue;
    }

    // Simple URL-based asset
    if (def.url && (def.sha256 || def.trusted)) {
      const url = resolveUrl(def.url, baseUrl, context);
      const dest = def.dest || joinDest(defaultDest, name);

      resolved.push({
        name,
        description: def.description,
        url,
        sha256: def.sha256 ? expandTemplate(def.sha256, context) : undefined,
        trusted: def.trusted,
        extract: def.extract ? expandTemplate(def.extract, context) : undefined,
        dest: expandTemplate(dest, context),
        rename: def.rename,
        executable: def.executable,
      });
    }
  }

  return resolved;
}

function resolveUrl(
  url: string,
  baseUrl: string | undefined,
  context: Record<string, string>
): string {
  let expanded = expandTemplate(url, context);
  // If URL is relative and base_url is set, prepend it
  if (baseUrl && !expanded.startsWith("http://") && !expanded.startsWith("https://")) {
    expanded = baseUrl.replace(/\/$/, "") + "/" + expanded.replace(/^\//, "");
  }
  return expanded;
}

function joinDest(defaultDir: string | undefined, name: string): string {
  if (defaultDir) {
    return `${defaultDir}/${name}`;
  }
  return name;
}
