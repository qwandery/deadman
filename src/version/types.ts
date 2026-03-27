/** Where to discover available versions for an asset */
export interface VersionSource {
  /** GitHub releases: "owner/repo" */
  github?: string;
  /** Static manifest URL containing version->URL mappings */
  manifest?: string;
  /** URL pattern with ${version} placeholder for HEAD probing */
  pattern?: string;
}

/** Version constraint for an asset */
export interface VersionConstraint {
  /** Semver range ("^1.0.0", ">=2.0", "~3.1"), exact pin ("1.2.3"), or "latest" */
  range: string;
  /** Where to look for available versions */
  source: VersionSource;
}

/** Information about a discovered version */
export interface VersionInfo {
  /** Semver-normalized version string */
  version: string;
  /** Raw tag name from source (e.g., "v7.1.0") */
  tag: string;
  /** ISO date when this version was published */
  published_at?: string;
  /** Release assets with URLs and optional checksums */
  assets?: Record<string, { url: string; sha256?: string }>;
}

/** Interface for version discovery providers */
export interface VersionProvider {
  /** Provider name for logging */
  name: string;
  /** List available versions from a source */
  listVersions(source: VersionSource): Promise<VersionInfo[]>;
  /** Optionally fetch checksums for a specific version */
  getChecksums?(
    source: VersionSource,
    version: string
  ): Promise<Record<string, string> | null>;
}

/** Result of version resolution */
export interface ResolvedVersion {
  /** The concrete version that was resolved */
  version: string;
  /** The raw tag from the source */
  tag: string;
  /** The constraint that was used to resolve */
  constraint: string;
  /** The provider that resolved it */
  provider: string;
}
