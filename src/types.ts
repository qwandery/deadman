/** Supported platform identifiers */
export type PlatformId =
  | "darwin-arm64"
  | "darwin-x64"
  | "win32-x64"
  | "win32-arm64"
  | "linux-x64"
  | "linux-arm64";

/** OS component of a platform */
export type OsId = "darwin" | "win32" | "linux";

/** Architecture component of a platform */
export type ArchId = "arm64" | "x64";

/** Platform-specific source configuration */
export interface PlatformSource {
  url: string;
  sha256?: string;
  trusted?: boolean;
  extract?: string;
  dest?: string;
  rename?: string;
  /** Per-platform version override (config v2) */
  version?: string;
}

/** Build configuration for locally-built assets */
export interface BuildConfig {
  command: string;
  platforms?: Partial<Record<PlatformId, { command: string }>>;
  check?: string;
  sha256?: false;
}

/** Version source configuration — how deadman discovers available versions */
export interface VersionSource {
  /** GitHub releases: "owner/repo" */
  github?: string;
  /** Static manifest URL containing version->URL mappings */
  manifest?: string;
  /** URL pattern with ${version} placeholder for HEAD probing */
  pattern?: string;
}

/** Version constraint for an asset (config v2) */
export interface VersionConstraint {
  /** Semver range ("^1.0.0", ">=2.0", "~3.1"), exact pin ("1.2.3"), or "latest" */
  range: string;
  /** Where to look for available versions */
  source: VersionSource;
}

/** Single asset definition from config */
export interface AssetDefinition {
  description?: string;
  platforms?: PlatformId[] | Record<string, PlatformSource>;
  environments?: string[];
  url?: string;
  sha256?: string;
  trusted?: boolean;
  extract?: string;
  dest?: string;
  rename?: string;
  executable?: boolean;
  build?: BuildConfig;
  /** Version constraint (config v2): string for exact pin, object for range + source */
  version?: string | VersionConstraint;
}

/** Top-level defaults section */
export interface ConfigDefaults {
  base_url?: string;
  dest_dir?: string;
}

/** Top-level config structure */
export interface DeadManConfig {
  /** Config format version: 1 (legacy) or 2 (version-aware) */
  version: 1 | 2;
  defaults?: ConfigDefaults;
  variables?: Record<string, string>;
  assets: Record<string, AssetDefinition>;
}

/** Resolved asset ready for fetching */
export interface ResolvedAsset {
  name: string;
  description?: string;
  url?: string;
  sha256?: string;
  trusted?: boolean;
  extract?: string;
  dest: string;
  rename?: string;
  executable?: boolean;
  build?: {
    command: string;
    check?: string;
    skipChecksum: boolean;
  };
  /** Resolved concrete version (config v2) */
  version?: string;
}

/** Previous version record for rollback support */
export interface PreviousVersion {
  version: string;
  sha256: string;
  fetched_at: string;
}

/** Lock file asset entry */
export interface LockFileAsset {
  status: "present" | "missing" | "invalid";
  path: string;
  sha256?: string;
  fetched_at?: string;
  source?: string;
  /** Resolved version (lockfile v2) */
  version?: string;
  /** Version constraint used to resolve (lockfile v2) */
  version_constraint?: string;
  /** Previous versions for rollback (lockfile v2, max 3) */
  previous_versions?: PreviousVersion[];
}

/** Lock file structure */
export interface LockFile {
  /** Lockfile format version: 1 (legacy) or 2 (version-aware) */
  lockfile_version?: number;
  generated_at: string;
  platform: string;
  environment: string;
  config_hash: string;
  assets: Record<string, LockFileAsset>;
}

/** Exit codes per specification */
export const ExitCode = {
  SUCCESS: 0,
  VERIFICATION_FAILED: 1,
  CONFIG_ERROR: 2,
  NETWORK_ERROR: 3,
  FILESYSTEM_ERROR: 4,
  BUILD_FAILED: 5,
  CHECKSUM_MISMATCH: 6,
  VERSION_RESOLUTION_FAILED: 7,
  UPGRADE_FAILED: 8,
} as const;

export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode];

/** Fetch options */
export interface FetchOptions {
  env: string;
  platform?: PlatformId;
  force?: boolean;
  dryRun?: boolean;
  parallel?: number;
  configPath?: string;
  quiet?: boolean;
  verbose?: boolean;
  allowInsecure?: boolean;
  assetNames?: string[];
}

/** Verify options */
export interface VerifyOptions {
  env: string;
  platform?: PlatformId;
  configPath?: string;
  quiet?: boolean;
  assetNames?: string[];
}

/** List options */
export interface ListOptions {
  env?: string;
  platform?: PlatformId;
  status?: "present" | "missing" | "invalid" | "all";
  configPath?: string;
  json?: boolean;
}

/** Clean options */
export interface CleanOptions {
  all?: boolean;
  keepLock?: boolean;
  configPath?: string;
  dryRun?: boolean;
  assetNames?: string[];
  platform?: PlatformId;
}

/** Outdated check options */
export interface OutdatedOptions {
  env?: string;
  platform?: PlatformId;
  configPath?: string;
  json?: boolean;
}

/** Upgrade options */
export interface UpgradeOptions {
  env?: string;
  platform?: PlatformId;
  configPath?: string;
  dryRun?: boolean;
  assetNames?: string[];
  /** Allow major version bumps */
  major?: boolean;
  /** Update SHA256 values in config file */
  writeConfig?: boolean;
}

/** Rollback options */
export interface RollbackOptions {
  assetName: string;
  configPath?: string;
  /** Target version to roll back to, or "previous" */
  target?: string;
}
