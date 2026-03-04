import os from "node:os";
import type { PlatformId, OsId, ArchId } from "../types.js";

const VALID_PLATFORMS: PlatformId[] = [
  "darwin-arm64",
  "darwin-x64",
  "win32-x64",
  "win32-arm64",
  "linux-x64",
  "linux-arm64",
];

/** Map Node.js os.platform() to our OS identifiers */
function mapOs(platform: string): OsId {
  switch (platform) {
    case "darwin":
      return "darwin";
    case "win32":
      return "win32";
    case "linux":
      return "linux";
    default:
      throw new Error(`Unsupported operating system: ${platform}`);
  }
}

/** Map Node.js os.arch() to our architecture identifiers */
function mapArch(arch: string): ArchId {
  switch (arch) {
    case "arm64":
      return "arm64";
    case "x64":
      return "x64";
    default:
      throw new Error(`Unsupported architecture: ${arch}`);
  }
}

/** Detect the current platform */
export function detectPlatform(): PlatformId {
  const osId = mapOs(os.platform());
  const archId = mapArch(os.arch());
  return `${osId}-${archId}` as PlatformId;
}

/** Parse a platform string, validating it */
export function parsePlatform(platformStr: string): PlatformId {
  if (!VALID_PLATFORMS.includes(platformStr as PlatformId)) {
    throw new Error(
      `Invalid platform: ${platformStr}. Valid platforms: ${VALID_PLATFORMS.join(", ")}`
    );
  }
  return platformStr as PlatformId;
}

/** Extract OS from platform identifier */
export function getOs(platform: PlatformId): OsId {
  return platform.split("-")[0] as OsId;
}

/** Extract arch from platform identifier */
export function getArch(platform: PlatformId): ArchId {
  return platform.split("-")[1] as ArchId;
}

export function isValidPlatform(str: string): str is PlatformId {
  return VALID_PLATFORMS.includes(str as PlatformId);
}
