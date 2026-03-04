import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { PlatformId, VerifyOptions } from "../types.js";
import { loadConfig } from "../config/loader.js";
import { resolveAssets } from "../config/resolver.js";
import { detectPlatform, parsePlatform } from "../utils/platform.js";
import { sha256File } from "../utils/hash.js";

export interface VerifyResult {
  total: number;
  valid: number;
  invalid: number;
  missing: number;
  details: Array<{
    name: string;
    status: "valid" | "invalid" | "missing";
    message?: string;
  }>;
}

/** Verify that all assets are present and have correct checksums */
export async function verifyAssets(options: VerifyOptions): Promise<VerifyResult> {
  const { config } = await loadConfig(options.configPath);
  const platform: PlatformId = options.platform
    ? parsePlatform(options.platform)
    : detectPlatform();
  const env = options.env || process.env.DEADMAN_ENV || "dev";

  const assets = resolveAssets(config, platform, env, options.assetNames);

  const result: VerifyResult = {
    total: assets.length,
    valid: 0,
    invalid: 0,
    missing: 0,
    details: [],
  };

  for (const asset of assets) {
    const destPath = resolve(asset.dest);

    if (!existsSync(destPath)) {
      result.missing++;
      result.details.push({
        name: asset.name,
        status: "missing",
        message: `Not found at ${asset.dest}`,
      });
      if (!options.quiet) {
        console.log(`  [MISSING] ${asset.name} — ${asset.dest}`);
      }
      continue;
    }

    // Check SHA256 if available (not for build assets with sha256: false)
    if (asset.sha256) {
      const actualHash = await sha256File(destPath);
      if (actualHash !== asset.sha256) {
        result.invalid++;
        result.details.push({
          name: asset.name,
          status: "invalid",
          message: `Checksum mismatch: expected ${asset.sha256}, got ${actualHash}`,
        });
        if (!options.quiet) {
          console.log(`  [INVALID] ${asset.name} — checksum mismatch`);
        }
        continue;
      }
    }

    result.valid++;
    result.details.push({ name: asset.name, status: "valid" });
    if (!options.quiet) {
      console.log(`  [OK] ${asset.name}`);
    }
  }

  return result;
}
