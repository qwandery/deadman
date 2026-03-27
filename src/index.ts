// Public API
export type {
  DeadManConfig,
  AssetDefinition,
  ConfigDefaults,
  ResolvedAsset,
  LockFile,
  LockFileAsset,
  PreviousVersion,
  PlatformId,
  OsId,
  ArchId,
  FetchOptions,
  VerifyOptions,
  ListOptions,
  CleanOptions,
  OutdatedOptions,
  UpgradeOptions,
  RollbackOptions,
  VersionSource,
  VersionConstraint,
} from "./types.js";

export { ExitCode } from "./types.js";
export { loadConfig, discoverConfigPath, resolveAssets, resolveAssetsAsync } from "./config/index.js";
export {
  fetchAssets,
  verifyAssets,
  listAssets,
  cleanAssets,
  initConfig,
  checkOutdated,
  upgradeAssets,
  rollbackAsset,
  auditAssets,
  verifySignature,
} from "./core/index.js";
export { detectPlatform, parsePlatform } from "./utils/platform.js";
export { sha256File, sha256String } from "./utils/hash.js";
export {
  resolveVersion,
  isExactPin,
  listAvailableVersions,
  clearVersionCache,
} from "./version/index.js";
export type {
  VersionInfo,
  VersionProvider,
  ResolvedVersion,
} from "./version/index.js";
