import { describe, it, expect, vi, beforeEach } from "vitest";
import { upgradeAssets } from "../../src/core/upgrade.js";

// Mock dependencies
vi.mock("../../src/config/loader.js", () => ({
  loadConfig: vi.fn().mockResolvedValue({
    config: {
      version: 2,
      assets: {
        tool: {
          url: "https://example.com/tool-${version}.tar.gz",
          sha256: "abc123",
          dest: "vendor/tool",
          version: {
            range: "^1.0.0",
            source: { github: "example/tool" },
          },
        },
      },
    },
    rawContent: "mock",
  }),
}));

vi.mock("../../src/core/lockfile.js", () => ({
  readLockFile: vi.fn().mockResolvedValue({
    lockfile_version: 2,
    generated_at: "2026-03-27T00:00:00Z",
    platform: "linux-x64",
    environment: "dev",
    config_hash: "sha256:test",
    assets: {
      tool: {
        status: "present",
        path: "vendor/tool",
        sha256: "abc",
        version: "1.0.0",
      },
    },
  }),
}));

vi.mock("../../src/version/resolver.js", () => ({
  resolveVersion: vi.fn().mockResolvedValue({
    version: "1.2.0",
    tag: "v1.2.0",
    constraint: "^1.0.0",
    provider: "github",
  }),
}));

vi.mock("../../src/core/fetch.js", () => ({
  fetchAssets: vi.fn().mockResolvedValue({
    total: 1,
    fetched: 1,
    skipped: 0,
    failed: 0,
    errors: [],
  }),
}));

describe("upgradeAssets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should detect assets that need upgrading", async () => {
    const result = await upgradeAssets({
      env: "dev",
      dryRun: true,
    });

    expect(result.totalUpgraded).toBe(1);
    expect(result.entries[0].name).toBe("tool");
    expect(result.entries[0].from).toBe("1.0.0");
    expect(result.entries[0].to).toBe("1.2.0");
  });

  it("should skip assets that are up to date", async () => {
    const { resolveVersion } = await import("../../src/version/resolver.js");
    vi.mocked(resolveVersion).mockResolvedValueOnce({
      version: "1.0.0",
      tag: "v1.0.0",
      constraint: "^1.0.0",
      provider: "github",
    });

    const result = await upgradeAssets({
      env: "dev",
      dryRun: true,
    });

    expect(result.totalSkipped).toBe(1);
    expect(result.entries[0].status).toBe("skipped");
  });

  it("should block major version bumps by default", async () => {
    const { resolveVersion } = await import("../../src/version/resolver.js");
    vi.mocked(resolveVersion).mockResolvedValueOnce({
      version: "2.0.0",
      tag: "v2.0.0",
      constraint: "^1.0.0",
      provider: "github",
    });

    const result = await upgradeAssets({
      env: "dev",
      dryRun: true,
    });

    expect(result.totalSkipped).toBe(1);
    expect(result.entries[0].error).toContain("Major version bump");
  });

  it("should allow major version bumps with --major flag", async () => {
    const { resolveVersion } = await import("../../src/version/resolver.js");
    vi.mocked(resolveVersion).mockResolvedValueOnce({
      version: "2.0.0",
      tag: "v2.0.0",
      constraint: "^1.0.0",
      provider: "github",
    });

    const result = await upgradeAssets({
      env: "dev",
      dryRun: true,
      major: true,
    });

    expect(result.totalUpgraded).toBe(1);
    expect(result.entries[0].to).toBe("2.0.0");
  });
});
