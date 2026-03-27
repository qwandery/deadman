import * as semver from "semver";
import type { VersionSource, VersionInfo, VersionProvider } from "../types.js";

interface GitHubRelease {
  tag_name: string;
  prerelease: boolean;
  draft: boolean;
  published_at: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
  }>;
}

/** Parse a GitHub "owner/repo" string */
function parseGithubSource(source: VersionSource): {
  owner: string;
  repo: string;
} {
  const github = source.github;
  if (!github) {
    throw new Error("GitHub source requires a 'github' field (owner/repo)");
  }
  const parts = github.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(
      `Invalid GitHub source "${github}" — expected "owner/repo"`
    );
  }
  return { owner: parts[0], repo: parts[1] };
}

/** Build request headers with optional auth */
function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "deadman-cli",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/** Fetch JSON from a URL */
async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: getHeaders() });
  if (!response.ok) {
    if (response.status === 403 || response.status === 429) {
      throw new Error(
        `GitHub API rate limit exceeded. Set GITHUB_TOKEN to increase the limit.`
      );
    }
    throw new Error(
      `GitHub API request failed: ${response.status} ${response.statusText}`
    );
  }
  return (await response.json()) as T;
}

/** Extract semver from a tag name (strips leading 'v') */
function tagToVersion(tag: string): string | null {
  const cleaned = semver.clean(tag);
  if (cleaned) return cleaned;

  // Try stripping common prefixes
  const stripped = tag.replace(/^v/, "");
  const parsed = semver.valid(stripped);
  if (parsed) return parsed;

  // Try coercing (handles tags like "release-1.2.3")
  const coerced = semver.coerce(tag);
  return coerced ? coerced.version : null;
}

/** Checksum file patterns to look for in release assets */
const CHECKSUM_PATTERNS = [
  "SHA256SUMS",
  "sha256sums",
  "checksums.txt",
  "CHECKSUMS",
  "sha256sums.txt",
  "SHA256SUMS.txt",
];

/** Parse a checksum file (format: "hash  filename" or "hash filename") */
function parseChecksumFile(content: string): Record<string, string> {
  const checksums: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Format: "hash  filename" or "hash *filename" (binary mode)
    const match = trimmed.match(/^([a-fA-F0-9]{64})\s+\*?(.+)$/);
    if (match) {
      checksums[match[2].trim()] = match[1].toLowerCase();
    }
  }
  return checksums;
}

/** GitHub Releases version provider */
export const githubProvider: VersionProvider = {
  name: "github",

  async listVersions(source: VersionSource): Promise<VersionInfo[]> {
    const { owner, repo } = parseGithubSource(source);
    const url = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=100`;

    const releases = await fetchJson<GitHubRelease[]>(url);
    const versions: VersionInfo[] = [];

    for (const release of releases) {
      if (release.draft) continue;

      const version = tagToVersion(release.tag_name);
      if (!version) continue;

      const releaseAssets: Record<string, { url: string; sha256?: string }> =
        {};
      for (const asset of release.assets) {
        releaseAssets[asset.name] = {
          url: asset.browser_download_url,
        };
      }

      versions.push({
        version,
        tag: release.tag_name,
        published_at: release.published_at,
        assets: releaseAssets,
      });
    }

    // Sort descending by semver
    versions.sort((a, b) => semver.rcompare(a.version, b.version));

    return versions;
  },

  async getChecksums(
    source: VersionSource,
    version: string
  ): Promise<Record<string, string> | null> {
    const { owner, repo } = parseGithubSource(source);
    const url = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=100`;

    const releases = await fetchJson<GitHubRelease[]>(url);
    const release = releases.find((r) => {
      const v = tagToVersion(r.tag_name);
      return v === version;
    });

    if (!release) return null;

    // Look for checksum files in release assets
    for (const asset of release.assets) {
      if (CHECKSUM_PATTERNS.some((p) => asset.name.includes(p))) {
        const response = await fetch(asset.browser_download_url, {
          headers: getHeaders(),
        });
        if (response.ok) {
          const content = await response.text();
          return parseChecksumFile(content);
        }
      }
    }

    return null;
  },
};
