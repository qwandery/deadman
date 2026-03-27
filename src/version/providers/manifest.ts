import * as semver from "semver";
import type { VersionSource, VersionInfo, VersionProvider } from "../types.js";

interface ManifestData {
  versions: Record<
    string,
    {
      platforms?: Record<string, { url: string; sha256?: string }>;
      url?: string;
      sha256?: string;
      published_at?: string;
    }
  >;
}

/** Static manifest version provider */
export const manifestProvider: VersionProvider = {
  name: "manifest",

  async listVersions(source: VersionSource): Promise<VersionInfo[]> {
    const url = source.manifest;
    if (!url) {
      throw new Error("Manifest source requires a 'manifest' URL");
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch manifest from ${url}: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as ManifestData;
    if (!data.versions || typeof data.versions !== "object") {
      throw new Error(`Invalid manifest format from ${url}: missing 'versions' object`);
    }

    const versions: VersionInfo[] = [];

    for (const [versionStr, entry] of Object.entries(data.versions)) {
      const cleaned = semver.valid(semver.clean(versionStr) || versionStr);
      if (!cleaned) continue;

      const assets: Record<string, { url: string; sha256?: string }> = {};
      if (entry.platforms) {
        for (const [platform, platformEntry] of Object.entries(
          entry.platforms
        )) {
          assets[platform] = {
            url: platformEntry.url,
            sha256: platformEntry.sha256,
          };
        }
      } else if (entry.url) {
        assets["default"] = { url: entry.url, sha256: entry.sha256 };
      }

      versions.push({
        version: cleaned,
        tag: versionStr,
        published_at: entry.published_at,
        assets,
      });
    }

    // Sort descending by semver
    versions.sort((a, b) => semver.rcompare(a.version, b.version));

    return versions;
  },
};
