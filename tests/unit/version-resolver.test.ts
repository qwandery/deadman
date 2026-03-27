import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveVersion, isExactPin } from "../../src/version/resolver.js";

// Mock the cache module
vi.mock("../../src/version/cache.js", () => ({
  getCachedVersions: vi.fn().mockResolvedValue(null),
  setCachedVersions: vi.fn().mockResolvedValue(undefined),
}));

// Mock the github provider
vi.mock("../../src/version/providers/github.js", () => ({
  githubProvider: {
    name: "github",
    listVersions: vi.fn().mockResolvedValue([
      { version: "7.1.0", tag: "v7.1.0", published_at: "2026-03-20T00:00:00Z" },
      { version: "7.0.2", tag: "v7.0.2", published_at: "2026-03-10T00:00:00Z" },
      { version: "7.0.1", tag: "v7.0.1", published_at: "2026-03-01T00:00:00Z" },
      { version: "6.1.0", tag: "v6.1.0", published_at: "2026-01-15T00:00:00Z" },
      { version: "8.0.0-beta.1", tag: "v8.0.0-beta.1", published_at: "2026-03-25T00:00:00Z" },
    ]),
  },
}));

describe("isExactPin", () => {
  it("should return true for valid semver strings", () => {
    expect(isExactPin("1.2.3")).toBe(true);
    expect(isExactPin("7.1.0")).toBe(true);
    expect(isExactPin("0.0.1")).toBe(true);
  });

  it("should return false for range expressions", () => {
    expect(isExactPin("^1.0.0")).toBe(false);
    expect(isExactPin("~2.5.0")).toBe(false);
    expect(isExactPin(">=1.0.0")).toBe(false);
    expect(isExactPin("1.x")).toBe(false);
  });

  it("should return false for 'latest'", () => {
    expect(isExactPin("latest")).toBe(false);
  });
});

describe("resolveVersion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should resolve exact pin without querying provider", async () => {
    const result = await resolveVersion({
      range: "7.0.2",
      source: { github: "example/tool" },
    });
    expect(result.version).toBe("7.0.2");
    expect(result.constraint).toBe("7.0.2");
    expect(result.provider).toBe("github");

    // Should NOT have called the provider
    const { githubProvider } = await import(
      "../../src/version/providers/github.js"
    );
    expect(githubProvider.listVersions).not.toHaveBeenCalled();
  });

  it("should resolve caret range to highest matching version", async () => {
    const result = await resolveVersion({
      range: "^7.0.0",
      source: { github: "example/tool" },
    });
    expect(result.version).toBe("7.1.0");
    expect(result.tag).toBe("v7.1.0");
  });

  it("should resolve tilde range", async () => {
    const result = await resolveVersion({
      range: "~7.0.0",
      source: { github: "example/tool" },
    });
    expect(result.version).toBe("7.0.2");
  });

  it("should resolve 'latest' to most recent stable version", async () => {
    const result = await resolveVersion({
      range: "latest",
      source: { github: "example/tool" },
    });
    // Should skip 8.0.0-beta.1 (prerelease) and pick 7.1.0
    expect(result.version).toBe("7.1.0");
  });

  it("should throw for unmatched range", async () => {
    await expect(
      resolveVersion({
        range: "^9.0.0",
        source: { github: "example/tool" },
      })
    ).rejects.toThrow('No version matching "^9.0.0"');
  });

  it("should resolve >=6.0.0 <7.0.0 range", async () => {
    const result = await resolveVersion({
      range: ">=6.0.0 <7.0.0",
      source: { github: "example/tool" },
    });
    expect(result.version).toBe("6.1.0");
  });

  it("should throw for manifest source when URL fails", async () => {
    // The manifest provider attempts to fetch the URL,
    // which will fail for a non-existent URL
    await expect(
      resolveVersion({
        range: "^1.0.0",
        source: { manifest: "https://example.com/versions.json" },
      })
    ).rejects.toThrow();
  });
});
