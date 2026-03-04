// Public API
export type {
  DeadManConfig,
  AssetDefinition,
  ConfigDefaults,
  ResolvedAsset,
  LockFile,
  LockFileAsset,
  PlatformId,
  OsId,
  ArchId,
  FetchOptions,
  VerifyOptions,
  ListOptions,
  CleanOptions,
} from "./types.js";

export { ExitCode } from "./types.js";
export { loadConfig, discoverConfigPath, resolveAssets } from "./config/index.js";
export {
  fetchAssets,
  verifyAssets,
  listAssets,
  cleanAssets,
  initConfig,
} from "./core/index.js";
export { detectPlatform, parsePlatform } from "./utils/platform.js";
export { sha256File, sha256String } from "./utils/hash.js";
