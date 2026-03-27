import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getCachedVersions, setCachedVersions, clearVersionCache } from "../../src/version/cache.js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

// Mock fs modules
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn().mockReturnValue(false),
}));

const mockReadFile = vi.mocked(readFile);
const mockWriteFile = vi.mocked(writeFile);
const mockExistsSync = vi.mocked(existsSync);

describe("version cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.DEADMAN_CACHE_DIR;
    delete process.env.DEADMAN_VERSION_CACHE_TTL;
  });

  afterEach(() => {
    delete process.env.DEADMAN_CACHE_DIR;
    delete process.env.DEADMAN_VERSION_CACHE_TTL;
  });

  describe("getCachedVersions", () => {
    it("should return null when cache file does not exist", async () => {
      mockExistsSync.mockReturnValue(false);
      const result = await getCachedVersions("github:example/tool");
      expect(result).toBeNull();
    });

    it("should return null when cache entry is missing", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify({ entries: {} }));
      const result = await getCachedVersions("github:example/tool");
      expect(result).toBeNull();
    });

    it("should return cached versions when within TTL", async () => {
      const versions = [
        { version: "1.0.0", tag: "v1.0.0" },
      ];
      const recentTime = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 min ago

      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(
        JSON.stringify({
          entries: {
            "github:example/tool": {
              versions,
              fetched_at: recentTime,
            },
          },
        })
      );

      const result = await getCachedVersions("github:example/tool");
      expect(result).toEqual(versions);
    });

    it("should return null when cache entry is expired", async () => {
      const oldTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago

      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(
        JSON.stringify({
          entries: {
            "github:example/tool": {
              versions: [{ version: "1.0.0", tag: "v1.0.0" }],
              fetched_at: oldTime,
            },
          },
        })
      );

      const result = await getCachedVersions("github:example/tool");
      expect(result).toBeNull();
    });

    it("should respect DEADMAN_VERSION_CACHE_TTL", async () => {
      process.env.DEADMAN_VERSION_CACHE_TTL = "10"; // 10 seconds
      const recentTime = new Date(Date.now() - 5 * 1000).toISOString(); // 5 sec ago

      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(
        JSON.stringify({
          entries: {
            "github:example/tool": {
              versions: [{ version: "1.0.0", tag: "v1.0.0" }],
              fetched_at: recentTime,
            },
          },
        })
      );

      const result = await getCachedVersions("github:example/tool");
      expect(result).toEqual([{ version: "1.0.0", tag: "v1.0.0" }]);
    });

    it("should return null on corrupt cache file", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue("not valid json");
      const result = await getCachedVersions("github:example/tool");
      expect(result).toBeNull();
    });
  });

  describe("setCachedVersions", () => {
    it("should write versions to cache file", async () => {
      mockExistsSync.mockReturnValue(false);
      const versions = [{ version: "1.0.0", tag: "v1.0.0" }];

      await setCachedVersions("github:example/tool", versions);

      expect(mockWriteFile).toHaveBeenCalledTimes(1);
      const writtenContent = JSON.parse(
        mockWriteFile.mock.calls[0][1] as string
      );
      expect(writtenContent.entries["github:example/tool"].versions).toEqual(
        versions
      );
      expect(
        writtenContent.entries["github:example/tool"].fetched_at
      ).toBeDefined();
    });

    it("should create cache directory if needed", async () => {
      mockExistsSync.mockReturnValue(false);
      await setCachedVersions("test", []);
      expect(mkdir).toHaveBeenCalled();
    });
  });

  describe("clearVersionCache", () => {
    it("should write empty cache", async () => {
      mockExistsSync.mockReturnValue(false);
      await clearVersionCache();
      expect(mockWriteFile).toHaveBeenCalledTimes(1);
      const writtenContent = JSON.parse(
        mockWriteFile.mock.calls[0][1] as string
      );
      expect(writtenContent.entries).toEqual({});
    });
  });
});
