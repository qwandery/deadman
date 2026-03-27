export type {
  VersionSource,
  VersionConstraint,
  VersionInfo,
  VersionProvider,
  ResolvedVersion,
} from "./types.js";

export {
  resolveVersion,
  isExactPin,
  listAvailableVersions,
  getLatestMatching,
} from "./resolver.js";

export {
  getCachedVersions,
  setCachedVersions,
  clearVersionCache,
} from "./cache.js";

export { githubProvider } from "./providers/github.js";
export { manifestProvider } from "./providers/manifest.js";
export { patternProvider } from "./providers/pattern.js";
