import { readFile, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import type { LockFile, LockFileAsset } from "../types.js";

const LOCK_FILENAME = "deadman.lock";

/** Get the lock file path */
export function getLockFilePath(cwd: string = process.cwd()): string {
  return resolve(cwd, LOCK_FILENAME);
}

/** Read an existing lock file */
export async function readLockFile(
  cwd: string = process.cwd()
): Promise<LockFile | null> {
  const lockPath = getLockFilePath(cwd);
  if (!existsSync(lockPath)) {
    return null;
  }
  const content = await readFile(lockPath, "utf-8");
  return parseYaml(content) as LockFile;
}

/** Write a lock file */
export async function writeLockFile(
  lockFile: LockFile,
  cwd: string = process.cwd()
): Promise<void> {
  const lockPath = getLockFilePath(cwd);
  const content = stringifyYaml(lockFile, { lineWidth: 0 });
  await writeFile(lockPath, content, "utf-8");
}

/** Delete the lock file */
export async function deleteLockFile(
  cwd: string = process.cwd()
): Promise<void> {
  const lockPath = getLockFilePath(cwd);
  await rm(lockPath, { force: true });
}

/** Create a new lock file structure */
export function createLockFile(
  platform: string,
  environment: string,
  configHash: string
): LockFile {
  return {
    generated_at: new Date().toISOString(),
    platform,
    environment,
    config_hash: `sha256:${configHash}`,
    assets: {},
  };
}

/** Update a lock file with an asset entry */
export function setLockFileAsset(
  lockFile: LockFile,
  name: string,
  entry: LockFileAsset
): void {
  lockFile.assets[name] = entry;
  lockFile.generated_at = new Date().toISOString();
}
