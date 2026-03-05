import type {
  DeadManConfig,
  PlatformId,
  ResolvedAsset,
} from "../types.js";
import { isPlatformSourceMap } from "./validator.js";
import { buildTemplateContext, expandTemplate } from "../utils/template.js";

/** Resolve all assets for a given platform and environment */
export function resolveAssets(
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
