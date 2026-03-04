import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { verifyAssets } from "../../src/core/verify.js";

describe("environment variable support", () => {
  let testDir: string;
  let originalCwd: string;
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(async () => {
    testDir = join(tmpdir(), `deadman-env-test-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
    originalCwd = process.cwd();
    process.chdir(testDir);

    // Save env vars
    for (const key of [
      "DEADMAN_ENV",
      "DEADMAN_CONFIG",
      "DEADMAN_CACHE_DIR",
      "DEADMAN_PARALLEL",
      "DEADMAN_QUIET",
      "DEADMAN_VERBOSE",
    ]) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });

    // Restore env vars
    for (const [key, val] of Object.entries(savedEnv)) {
      if (val === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = val;
      }
    }
  });

  it("should use DEADMAN_ENV for environment filtering", async () => {
    const configContent = `
version: 1
assets:
  dev-only:
    url: "https://example.com/dev"
    sha256: "aaa"
    dest: "vendor/dev"
    environments: [dev]
  prod-only:
    url: "https://example.com/prod"
    sha256: "bbb"
    dest: "vendor/prod"
    environments: [prod]
`;
    const configPath = join(testDir, "deadman.yaml");
    await writeFile(configPath, configContent);

    // Default (no DEADMAN_ENV) should resolve to dev
    const devResult = await verifyAssets({
      env: "dev",
      configPath,
      quiet: true,
    });
    expect(devResult.total).toBe(1);
    expect(devResult.details[0].name).toBe("dev-only");

    // Explicit prod
    const prodResult = await verifyAssets({
      env: "prod",
      configPath,
      quiet: true,
    });
    expect(prodResult.total).toBe(1);
    expect(prodResult.details[0].name).toBe("prod-only");
  });

  it("should respect DEADMAN_CACHE_DIR env var in fetch temp path", () => {
    process.env.DEADMAN_CACHE_DIR = "/custom/cache";
    expect(process.env.DEADMAN_CACHE_DIR).toBe("/custom/cache");
    delete process.env.DEADMAN_CACHE_DIR;
  });
});
