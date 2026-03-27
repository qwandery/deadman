import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { githubProvider } from "../../src/version/providers/github.js";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("githubProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GITHUB_TOKEN;
  });

  afterEach(() => {
    delete process.env.GITHUB_TOKEN;
  });

  describe("listVersions", () => {
    it("should parse GitHub releases into version info", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            tag_name: "v7.1.0",
            prerelease: false,
            draft: false,
            published_at: "2026-03-20T00:00:00Z",
            assets: [
              {
                name: "tool-linux-x64.tar.gz",
                browser_download_url:
                  "https://github.com/example/tool/releases/download/v7.1.0/tool-linux-x64.tar.gz",
              },
            ],
          },
          {
            tag_name: "v7.0.0",
            prerelease: false,
            draft: false,
            published_at: "2026-03-01T00:00:00Z",
            assets: [],
          },
        ],
      });

      const versions = await githubProvider.listVersions({
        github: "example/tool",
      });

      expect(versions).toHaveLength(2);
      expect(versions[0].version).toBe("7.1.0");
      expect(versions[0].tag).toBe("v7.1.0");
      expect(versions[1].version).toBe("7.0.0");
    });

    it("should skip draft releases", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            tag_name: "v2.0.0",
            prerelease: false,
            draft: true,
            published_at: "2026-03-20T00:00:00Z",
            assets: [],
          },
          {
            tag_name: "v1.0.0",
            prerelease: false,
            draft: false,
            published_at: "2026-03-01T00:00:00Z",
            assets: [],
          },
        ],
      });

      const versions = await githubProvider.listVersions({
        github: "example/tool",
      });

      expect(versions).toHaveLength(1);
      expect(versions[0].version).toBe("1.0.0");
    });

    it("should handle tags without 'v' prefix", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            tag_name: "1.5.0",
            prerelease: false,
            draft: false,
            published_at: "2026-03-20T00:00:00Z",
            assets: [],
          },
        ],
      });

      const versions = await githubProvider.listVersions({
        github: "example/tool",
      });

      expect(versions).toHaveLength(1);
      expect(versions[0].version).toBe("1.5.0");
      expect(versions[0].tag).toBe("1.5.0");
    });

    it("should skip non-semver tags", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            tag_name: "latest-stable",
            prerelease: false,
            draft: false,
            published_at: "2026-03-20T00:00:00Z",
            assets: [],
          },
          {
            tag_name: "v1.0.0",
            prerelease: false,
            draft: false,
            published_at: "2026-03-01T00:00:00Z",
            assets: [],
          },
        ],
      });

      const versions = await githubProvider.listVersions({
        github: "example/tool",
      });

      expect(versions).toHaveLength(1);
      expect(versions[0].version).toBe("1.0.0");
    });

    it("should include GITHUB_TOKEN in headers when set", async () => {
      process.env.GITHUB_TOKEN = "test-token-123";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await githubProvider.listVersions({ github: "example/tool" });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token-123",
          }),
        })
      );
    });

    it("should throw on rate limit (403)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
      });

      await expect(
        githubProvider.listVersions({ github: "example/tool" })
      ).rejects.toThrow("rate limit");
    });

    it("should throw on invalid github source format", async () => {
      await expect(
        githubProvider.listVersions({ github: "invalid" })
      ).rejects.toThrow('expected "owner/repo"');
    });

    it("should throw when github field is missing", async () => {
      await expect(githubProvider.listVersions({})).rejects.toThrow(
        "requires a 'github' field"
      );
    });
  });

  describe("getChecksums", () => {
    it("should parse checksum files from release assets", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              tag_name: "v1.0.0",
              prerelease: false,
              draft: false,
              published_at: "2026-03-01T00:00:00Z",
              assets: [
                {
                  name: "SHA256SUMS",
                  browser_download_url:
                    "https://github.com/example/tool/releases/download/v1.0.0/SHA256SUMS",
                },
                {
                  name: "tool-linux.tar.gz",
                  browser_download_url:
                    "https://github.com/example/tool/releases/download/v1.0.0/tool-linux.tar.gz",
                },
              ],
            },
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () =>
            "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890  tool-linux.tar.gz\n" +
            "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef  tool-darwin.tar.gz\n",
        });

      const checksums = await githubProvider.getChecksums!(
        { github: "example/tool" },
        "1.0.0"
      );

      expect(checksums).toEqual({
        "tool-linux.tar.gz":
          "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        "tool-darwin.tar.gz":
          "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      });
    });

    it("should return null when no checksum file found", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            tag_name: "v1.0.0",
            prerelease: false,
            draft: false,
            published_at: "2026-03-01T00:00:00Z",
            assets: [
              {
                name: "tool-linux.tar.gz",
                browser_download_url: "https://example.com/tool.tar.gz",
              },
            ],
          },
        ],
      });

      const checksums = await githubProvider.getChecksums!(
        { github: "example/tool" },
        "1.0.0"
      );

      expect(checksums).toBeNull();
    });

    it("should return null when version not found", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            tag_name: "v2.0.0",
            prerelease: false,
            draft: false,
            published_at: "2026-03-01T00:00:00Z",
            assets: [],
          },
        ],
      });

      const checksums = await githubProvider.getChecksums!(
        { github: "example/tool" },
        "1.0.0"
      );

      expect(checksums).toBeNull();
    });
  });
});
