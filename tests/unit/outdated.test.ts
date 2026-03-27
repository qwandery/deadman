import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkOutdated, formatOutdatedTable } from "../../src/core/outdated.js";

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
        "pinned-tool": {
          url: "https://example.com/pinned.tar.gz",
          sha256: "def456",
          dest: "vendor/pinned",
          version: "1.0.0", // exact pin, no source
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
  listAvailableVersions: vi.fn().mockResolvedValue([
    { version: "1.2.0", tag: "v1.2.0" },
    { version: "1.1.0", tag: "v1.1.0" },
    { version: "1.0.0", tag: "v1.0.0" },
  ]),
}));

describe("checkOutdated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should detect outdated assets", async () => {
    const result = await checkOutdated({ env: "dev" });

    expect(result.totalChecked).toBe(1); // only 'tool' has a source
    expect(result.totalOutdated).toBe(1);
    expect(result.entries[0].name).toBe("tool");
    expect(result.entries[0].current).toBe("1.0.0");
    expect(result.entries[0].latest).toBe("1.2.0");
    expect(result.entries[0].upToDate).toBe(false);
  });

  it("should skip assets without version sources", async () => {
    const result = await checkOutdated({ env: "dev" });
    // 'pinned-tool' has no source, should not appear
    const pinned = result.entries.find((e) => e.name === "pinned-tool");
    expect(pinned).toBeUndefined();
  });
});

describe("formatOutdatedTable", () => {
  it("should format entries as a table", () => {
    const result = {
      entries: [
        {
          name: "tool",
          current: "1.0.0",
          latest: "1.2.0",
          constraint: "^1.0.0",
          upToDate: false,
        },
      ],
      totalChecked: 1,
      totalOutdated: 1,
    };

    const output = formatOutdatedTable(result);
    expect(output).toContain("ASSET");
    expect(output).toContain("tool");
    expect(output).toContain("1.0.0");
    expect(output).toContain("1.2.0");
  });

  it("should show message when no versioned assets found", () => {
    const result = { entries: [], totalChecked: 0, totalOutdated: 0 };
    const output = formatOutdatedTable(result);
    expect(output).toContain("No versioned assets");
  });
});
