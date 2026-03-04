import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { loadConfig } from "../../src/config/loader.js";
import { resolveAssets } from "../../src/config/resolver.js";
import {
  createLockFile,
  setLockFileAsset,
  writeLockFile,
  readLockFile,
  deleteLockFile,
} from "../../src/core/lockfile.js";
import { verifyAssets } from "../../src/core/verify.js";
import { cleanAssets } from "../../src/core/clean.js";
import { initConfig } from "../../src/core/init.js";
import { sha256File, sha256String } from "../../src/utils/hash.js";

describe("E2E workflow", () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `deadman-e2e-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
    originalCwd = process.cwd();
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
  });

  it("should init, load config, and resolve assets", async () => {
    // Init
    const configPath = await initConfig({});
    expect(existsSync(configPath)).toBe(true);

    // Load
    const { config } = await loadConfig(configPath);
    expect(config.version).toBe(1);

    // Resolve
    const assets = resolveAssets(config, "linux-x64", "dev");
    expect(assets.length).toBeGreaterThan(0);
    expect(assets[0].name).toBe("example-tool");
  });

  it("should create and read lock files through full cycle", async () => {
    const configHash = sha256String("test-config");
    const lock = createLockFile("linux-x64", "dev", configHash);

    setLockFileAsset(lock, "tool", {
      status: "present",
      path: "vendor/tool",
      sha256: "abc123",
      fetched_at: new Date().toISOString(),
      source: "https://example.com/tool",
    });

    await writeLockFile(lock);

    const readBack = await readLockFile();
    expect(readBack).not.toBeNull();
    expect(readBack!.assets.tool.sha256).toBe("abc123");
    expect(readBack!.platform).toBe("linux-x64");

    // Clean up lock file
    await deleteLockFile();
    const afterDelete = await readLockFile();
    expect(afterDelete).toBeNull();
  });

  it("should verify missing assets correctly", async () => {
    const configContent = `
version: 1
assets:
  tool:
    url: "https://example.com/tool"
    sha256: "abc123"
    dest: "vendor/tool"
`;
    const configPath = join(testDir, "deadman.yaml");
    await writeFile(configPath, configContent);

    const result = await verifyAssets({
      env: "dev",
      configPath,
      quiet: true,
    });

    expect(result.missing).toBe(1);
    expect(result.valid).toBe(0);
    expect(result.details[0].status).toBe("missing");
  });

  it("should verify present assets with matching checksum", async () => {
    // Create a file and compute its hash
    const vendorDir = join(testDir, "vendor");
    await mkdir(vendorDir, { recursive: true });
    const toolPath = join(vendorDir, "tool");
    await writeFile(toolPath, "tool-binary-content");
    const hash = await sha256File(toolPath);

    const configContent = `
version: 1
assets:
  tool:
    url: "https://example.com/tool"
    sha256: "${hash}"
    dest: "vendor/tool"
`;
    const configPath = join(testDir, "deadman.yaml");
    await writeFile(configPath, configContent);

    const result = await verifyAssets({
      env: "dev",
      configPath,
      quiet: true,
    });

    expect(result.valid).toBe(1);
    expect(result.missing).toBe(0);
    expect(result.invalid).toBe(0);
  });

  it("should detect invalid assets with mismatched checksum", async () => {
    const vendorDir = join(testDir, "vendor");
    await mkdir(vendorDir, { recursive: true });
    await writeFile(join(vendorDir, "tool"), "wrong-content");

    const configContent = `
version: 1
assets:
  tool:
    url: "https://example.com/tool"
    sha256: "0000000000000000000000000000000000000000000000000000000000000000"
    dest: "vendor/tool"
`;
    const configPath = join(testDir, "deadman.yaml");
    await writeFile(configPath, configContent);

    const result = await verifyAssets({
      env: "dev",
      configPath,
      quiet: true,
    });

    expect(result.invalid).toBe(1);
  });

  it("should clean assets and lock file", async () => {
    // Create config and asset file
    const vendorDir = join(testDir, "vendor");
    await mkdir(vendorDir, { recursive: true });
    const toolPath = join(vendorDir, "tool");
    await writeFile(toolPath, "tool-content");

    const configContent = `
version: 1
assets:
  tool:
    url: "https://example.com/tool"
    sha256: "abc123"
    dest: "vendor/tool"
`;
    const configPath = join(testDir, "deadman.yaml");
    await writeFile(configPath, configContent);

    // Create lock file
    const lock = createLockFile("linux-x64", "dev", "hash");
    await writeLockFile(lock);

    expect(existsSync(toolPath)).toBe(true);
    expect(await readLockFile()).not.toBeNull();

    // Clean
    const result = await cleanAssets({
      configPath,
    });

    expect(result.deleted).toBe(1);
    expect(existsSync(toolPath)).toBe(false);
    expect(await readLockFile()).toBeNull();
  });

  it("should clean with --keep-lock", async () => {
    const vendorDir = join(testDir, "vendor");
    await mkdir(vendorDir, { recursive: true });
    await writeFile(join(vendorDir, "tool"), "content");

    const configContent = `
version: 1
assets:
  tool:
    url: "https://example.com/tool"
    sha256: "abc123"
    dest: "vendor/tool"
`;
    await writeFile(join(testDir, "deadman.yaml"), configContent);
    const lock = createLockFile("linux-x64", "dev", "hash");
    await writeLockFile(lock);

    await cleanAssets({
      configPath: join(testDir, "deadman.yaml"),
      keepLock: true,
    });

    expect(await readLockFile()).not.toBeNull();
  });

  it("should handle environment filtering end-to-end", async () => {
    const configContent = `
version: 1
assets:
  dev-model:
    url: "https://example.com/dev-model"
    sha256: "aaa"
    dest: "models/dev.bin"
    environments: [dev]
  prod-model:
    url: "https://example.com/prod-model"
    sha256: "bbb"
    dest: "models/prod.bin"
    environments: [prod]
`;
    const configPath = join(testDir, "deadman.yaml");
    await writeFile(configPath, configContent);

    const devResult = await verifyAssets({
      env: "dev",
      configPath,
      quiet: true,
    });
    expect(devResult.total).toBe(1);
    expect(devResult.details[0].name).toBe("dev-model");

    const prodResult = await verifyAssets({
      env: "prod",
      configPath,
      quiet: true,
    });
    expect(prodResult.total).toBe(1);
    expect(prodResult.details[0].name).toBe("prod-model");
  });
});
