import * as semver from "semver";
import type { VersionSource, VersionInfo, VersionProvider } from "../types.js";

/** URL pattern version provider — probes URLs via HEAD requests */
export const patternProvider: VersionProvider = {
  name: "pattern",

  async listVersions(source: VersionSource): Promise<VersionInfo[]> {
    const pattern = source.pattern;
    if (!pattern) {
      throw new Error("Pattern source requires a 'pattern' URL template");
    }

    // Generate candidate versions to probe
    // This is inherently limited without a version list — we probe common versions
    const candidates = generateCandidates();
    const versions: VersionInfo[] = [];

    // Probe in parallel with concurrency limit
    const CONCURRENCY = 5;
    for (let i = 0; i < candidates.length; i += CONCURRENCY) {
      const batch = candidates.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        batch.map(async (version) => {
          const url = pattern.replace(/\$\{version\}/g, version);
          try {
            const response = await fetch(url, { method: "HEAD" });
            if (response.ok) {
              return { version, url };
            }
            return null;
          } catch {
            return null;
          }
        })
      );

      for (const result of results) {
        if (result) {
          versions.push({
            version: result.version,
            tag: result.version,
            assets: { default: { url: result.url } },
          });
        }
      }
    }

    // Sort descending by semver
    versions.sort((a, b) => semver.rcompare(a.version, b.version));

    return versions;
  },
};

/** Generate a reasonable set of version candidates to probe */
function generateCandidates(): string[] {
  const versions: string[] = [];

  // Probe recent major.minor.patch combinations
  for (let major = 0; major <= 20; major++) {
    for (let minor = 0; minor <= 20; minor++) {
      for (let patch = 0; patch <= 5; patch++) {
        versions.push(`${major}.${minor}.${patch}`);
      }
    }
  }

  return versions;
}
