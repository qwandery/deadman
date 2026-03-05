import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { discoverConfigPath, loadConfig } from "../../src/config/loader.js";

describe("config loader", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `deadman-test-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe("discoverConfigPath", () => {
    it("should find deadman.yaml", async () => {
      await writeFile(join(testDir, "deadman.yaml"), "version: 1\nassets: {}");
      const path = discoverConfigPath(testDir);
      expect(path).toBe(join(testDir, "deadman.yaml"));
    });

    it("should find deadman.yml", async () => {
      await writeFile(join(testDir, "deadman.yml"), "version: 1\nassets: {}");
      const path = discoverConfigPath(testDir);
      expect(path).toBe(join(testDir, "deadman.yml"));
    });

    it("should find .deadman.yaml", async () => {
      await writeFile(join(testDir, ".deadman.yaml"), "version: 1\nassets: {}");
      const path = discoverConfigPath(testDir);
      expect(path).toBe(join(testDir, ".deadman.yaml"));
    });

    it("should prefer deadman.yaml over deadman.yml", async () => {
      await writeFile(join(testDir, "deadman.yaml"), "version: 1\nassets: {}");
      await writeFile(join(testDir, "deadman.yml"), "version: 1\nassets: {}");
      const path = discoverConfigPath(testDir);
      expect(path).toBe(join(testDir, "deadman.yaml"));
    });

    it("should return null when no config found", () => {
      const path = discoverConfigPath(testDir);
      expect(path).toBeNull();
    });
  });

  describe("loadConfig", () => {
    it("should load and parse a valid config file", async () => {
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

      const { config, rawContent } = await loadConfig(configPath);
      expect(config.version).toBe(1);
      expect(config.assets.tool.url).toBe("https://example.com/tool");
      expect(rawContent).toBe(configContent);
    });

    it("should throw for missing config file", async () => {
      await expect(loadConfig("/nonexistent/path.yaml")).rejects.toThrow(
        "Config file not found"
      );
    });

    it("should throw for invalid YAML", async () => {
      const configPath = join(testDir, "deadman.yaml");
      await writeFile(configPath, "{{invalid yaml");

      await expect(loadConfig(configPath)).rejects.toThrow("Failed to parse YAML");
    });

    it("should throw for invalid config structure", async () => {
      const configPath = join(testDir, "deadman.yaml");
      await writeFile(configPath, "version: 1\n");

      await expect(loadConfig(configPath)).rejects.toThrow("assets");
    });
  });

  describe("environment variable expansion in variables", () => {
    it("should expand $ENV_VAR references in variables", async () => {
      process.env.DEADMAN_TEST_SERVER = "https://builds.example.com";
      const configContent = `
version: 1
variables:
  server: "$DEADMAN_TEST_SERVER"
assets:
  tool:
    url: "https://example.com/tool"
    sha256: "abc123"
    dest: "vendor/tool"
`;
      const configPath = join(testDir, "deadman.yaml");
      await writeFile(configPath, configContent);

      const { config } = await loadConfig(configPath);
      expect(config.variables?.server).toBe("https://builds.example.com");
      delete process.env.DEADMAN_TEST_SERVER;
    });

    it("should throw when env var is not set", async () => {
      delete process.env.DEADMAN_NONEXISTENT_VAR;
      const configContent = `
version: 1
variables:
  server: "$DEADMAN_NONEXISTENT_VAR"
assets:
  tool:
    url: "https://example.com/tool"
    sha256: "abc123"
    dest: "vendor/tool"
`;
      const configPath = join(testDir, "deadman.yaml");
      await writeFile(configPath, configContent);

      await expect(loadConfig(configPath)).rejects.toThrow(
        "environment variable 'DEADMAN_NONEXISTENT_VAR' which is not set"
      );
    });

    it("should not treat ${template} syntax as env var", async () => {
      const configContent = `
version: 1
variables:
  version: "1.0"
assets:
  tool:
    url: "https://example.com/tool"
    sha256: "abc123"
    dest: "vendor/tool"
`;
      const configPath = join(testDir, "deadman.yaml");
      await writeFile(configPath, configContent);

      const { config } = await loadConfig(configPath);
      expect(config.variables?.version).toBe("1.0");
    });

    it("should leave regular string values untouched", async () => {
      const configContent = `
version: 1
variables:
  version: "2.5.0"
assets:
  tool:
    url: "https://example.com/tool"
    sha256: "abc123"
    dest: "vendor/tool"
`;
      const configPath = join(testDir, "deadman.yaml");
      await writeFile(configPath, configContent);

      const { config } = await loadConfig(configPath);
      expect(config.variables?.version).toBe("2.5.0");
    });
  });
});
