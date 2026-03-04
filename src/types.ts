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
  sha256: string;
  extract?: string;
  dest?: string;
  rename?: string;
}

/** Build configuration for locally-built assets */
export interface BuildConfig {
  command: string;
  platforms?: Partial<Record<PlatformId, { command: string }>>;
  check?: string;
  sha256?: false;
}

/** Single asset definition from config */
export interface AssetDefinition {
  description?: string;
  platforms?: PlatformId[] | Record<string, PlatformSource>;
  environments?: string[];
  url?: string;
  sha256?: string;
  extract?: string;
  dest?: string;
  rename?: string;
  executable?: boolean;
  build?: BuildConfig;
}

/** Top-level defaults section */
export interface ConfigDefaults {
  base_url?: string;
  dest_dir?: string;
}

/** Top-level config structure */
export interface DeadManConfig {
  version: number;
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
  extract?: string;
  dest: string;
  rename?: string;
  executable?: boolean;
  build?: {
    command: string;
    check?: string;
    skipChecksum: boolean;
  };
}

/** Lock file asset entry */
export interface LockFileAsset {
  status: "present" | "missing" | "invalid";
  path: string;
  sha256?: string;
  fetched_at?: string;
  source?: string;
}

/** Lock file structure */
export interface LockFile {
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
