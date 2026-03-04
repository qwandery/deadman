import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import {
  createLockFile,
  setLockFileAsset,
  writeLockFile,
  readLockFile,
  deleteLockFile,
  getLockFilePath,
} from "../../src/core/lockfile.js";

describe("lock file", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `deadman-test-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("should create a lock file structure", () => {
    const lock = createLockFile("linux-x64", "dev", "abc123");
    expect(lock.platform).toBe("linux-x64");
    expect(lock.environment).toBe("dev");
    expect(lock.config_hash).toBe("sha256:abc123");
    expect(lock.assets).toEqual({});
  });

  it("should set asset entries in lock file", () => {
    const lock = createLockFile("linux-x64", "dev", "abc123");
    setLockFileAsset(lock, "tool", {
      status: "present",
      path: "vendor/tool",
      sha256: "def456",
      fetched_at: "2026-03-04T15:30:00Z",
      source: "https://example.com/tool",
    });

    expect(lock.assets.tool.status).toBe("present");
    expect(lock.assets.tool.sha256).toBe("def456");
  });

  it("should write and read lock file", async () => {
    const lock = createLockFile("linux-x64", "dev", "abc123");
    setLockFileAsset(lock, "tool", {
      status: "present",
      path: "vendor/tool",
      sha256: "def456",
    });

    await writeLockFile(lock, testDir);
    const read = await readLockFile(testDir);
    expect(read).not.toBeNull();
    expect(read!.platform).toBe("linux-x64");
    expect(read!.assets.tool.sha256).toBe("def456");
  });

  it("should return null for missing lock file", async () => {
    const result = await readLockFile(testDir);
    expect(result).toBeNull();
  });

  it("should delete lock file", async () => {
    const lock = createLockFile("linux-x64", "dev", "abc123");
    await writeLockFile(lock, testDir);

    await deleteLockFile(testDir);
    const result = await readLockFile(testDir);
    expect(result).toBeNull();
  });

  it("should get lock file path", () => {
    const path = getLockFilePath(testDir);
    expect(path).toBe(join(testDir, "deadman.lock"));
  });
});
