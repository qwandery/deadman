import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { initConfig } from "../../src/core/init.js";

describe("init command", () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `deadman-test-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
    originalCwd = process.cwd();
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
  });

  it("should create a YAML config file", async () => {
    const outputPath = await initConfig({});
    expect(existsSync(outputPath)).toBe(true);

    const content = await readFile(outputPath, "utf-8");
    expect(content).toContain("version: 1");
    expect(content).toContain("example-tool");
  });

  it("should create a JSON config file", async () => {
    const outputPath = await initConfig({ format: "json" });
    expect(outputPath).toContain("deadman.json");

    const content = await readFile(outputPath, "utf-8");
    const parsed = JSON.parse(content);
    expect(parsed.version).toBe(1);
  });

  it("should use custom output path", async () => {
    const customPath = join(testDir, "custom-config.yaml");
    const outputPath = await initConfig({ output: customPath });
    expect(outputPath).toBe(customPath);
    expect(existsSync(customPath)).toBe(true);
  });

  it("should refuse to overwrite existing file", async () => {
    await initConfig({});
    await expect(initConfig({})).rejects.toThrow("already exists");
  });
});
