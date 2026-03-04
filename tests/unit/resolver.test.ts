import { describe, it, expect } from "vitest";
import { resolveAssets } from "../../src/config/resolver.js";
import type { DeadManConfig } from "../../src/types.js";

const baseConfig: DeadManConfig = {
  version: 1,
  assets: {
    tool: {
      url: "https://example.com/tool.tar.gz",
      sha256: "abc123",
      dest: "vendor/tool",
      executable: true,
    },
  },
};

describe("asset resolver", () => {
  it("should resolve simple URL-based asset", () => {
    const assets = resolveAssets(baseConfig, "linux-x64", "dev");
    expect(assets).toHaveLength(1);
    expect(assets[0].name).toBe("tool");
    expect(assets[0].url).toBe("https://example.com/tool.tar.gz");
    expect(assets[0].sha256).toBe("abc123");
    expect(assets[0].dest).toBe("vendor/tool");
    expect(assets[0].executable).toBe(true);
  });

  it("should filter by environment", () => {
    const config: DeadManConfig = {
      version: 1,
      assets: {
        devTool: {
          url: "https://example.com/dev.bin",
          sha256: "aaa",
          dest: "vendor/dev",
          environments: ["dev"],
        },
        prodTool: {
          url: "https://example.com/prod.bin",
          sha256: "bbb",
          dest: "vendor/prod",
          environments: ["prod"],
        },
      },
    };

    const devAssets = resolveAssets(config, "linux-x64", "dev");
    expect(devAssets).toHaveLength(1);
    expect(devAssets[0].name).toBe("devTool");

    const prodAssets = resolveAssets(config, "linux-x64", "prod");
    expect(prodAssets).toHaveLength(1);
    expect(prodAssets[0].name).toBe("prodTool");
  });

  it("should resolve platform-specific sources", () => {
    const config: DeadManConfig = {
      version: 1,
      assets: {
        tool: {
          dest: "vendor/tool",
          platforms: {
            "linux-x64": {
              url: "https://example.com/tool-linux",
              sha256: "linux-hash",
            },
            "darwin-arm64": {
              url: "https://example.com/tool-darwin",
              sha256: "darwin-hash",
            },
          },
        },
      },
    };

    const linuxAssets = resolveAssets(config, "linux-x64", "dev");
    expect(linuxAssets).toHaveLength(1);
    expect(linuxAssets[0].url).toBe("https://example.com/tool-linux");

    const darwinAssets = resolveAssets(config, "darwin-arm64", "dev");
    expect(darwinAssets).toHaveLength(1);
    expect(darwinAssets[0].url).toBe("https://example.com/tool-darwin");

    // No entry for win32-x64
    const winAssets = resolveAssets(config, "win32-x64", "dev");
    expect(winAssets).toHaveLength(0);
  });

  it("should filter by platform array", () => {
    const config: DeadManConfig = {
      version: 1,
      assets: {
        tool: {
          url: "https://example.com/tool",
          sha256: "abc",
          dest: "vendor/tool",
          platforms: ["linux-x64", "darwin-arm64"],
        },
      },
    };

    expect(resolveAssets(config, "linux-x64", "dev")).toHaveLength(1);
    expect(resolveAssets(config, "win32-x64", "dev")).toHaveLength(0);
  });

  it("should filter by asset names", () => {
    const config: DeadManConfig = {
      version: 1,
      assets: {
        toolA: { url: "https://a.com/a", sha256: "a", dest: "a" },
        toolB: { url: "https://b.com/b", sha256: "b", dest: "b" },
      },
    };

    const filtered = resolveAssets(config, "linux-x64", "dev", ["toolA"]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("toolA");
  });

  it("should expand URL templates", () => {
    const config: DeadManConfig = {
      version: 1,
      variables: { version: "2.0" },
      assets: {
        tool: {
          url: "https://example.com/v${version}/tool-${platform}",
          sha256: "abc",
          dest: "vendor/tool",
        },
      },
    };

    const assets = resolveAssets(config, "linux-x64", "dev");
    expect(assets[0].url).toBe("https://example.com/v2.0/tool-linux-x64");
  });

  it("should apply default dest_dir", () => {
    const config: DeadManConfig = {
      version: 1,
      defaults: { dest_dir: "vendor" },
      assets: {
        tool: {
          url: "https://example.com/tool",
          sha256: "abc",
        },
      },
    };

    const assets = resolveAssets(config, "linux-x64", "dev");
    expect(assets[0].dest).toBe("vendor/tool");
  });

  it("should resolve build-based assets", () => {
    const config: DeadManConfig = {
      version: 1,
      assets: {
        tool: {
          dest: "vendor/tool",
          build: {
            command: "./build.sh",
            check: "vendor/tool",
            sha256: false,
          },
        },
      },
    };

    const assets = resolveAssets(config, "linux-x64", "dev");
    expect(assets).toHaveLength(1);
    expect(assets[0].build).toBeDefined();
    expect(assets[0].build?.command).toBe("./build.sh");
    expect(assets[0].build?.skipChecksum).toBe(true);
  });

  it("should use platform-specific build command", () => {
    const config: DeadManConfig = {
      version: 1,
      assets: {
        tool: {
          dest: "vendor/tool",
          build: {
            command: "./build.sh",
            platforms: {
              "win32-x64": { command: "build.ps1" },
            },
          },
        },
      },
    };

    const linuxAssets = resolveAssets(config, "linux-x64", "dev");
    expect(linuxAssets[0].build?.command).toBe("./build.sh");

    const winAssets = resolveAssets(config, "win32-x64", "dev");
    expect(winAssets[0].build?.command).toBe("build.ps1");
  });

  it("should apply base_url to relative URLs", () => {
    const config: DeadManConfig = {
      version: 1,
      defaults: { base_url: "https://releases.example.com/v1" },
      assets: {
        tool: {
          url: "tool-${platform}.tar.gz",
          sha256: "abc",
          dest: "vendor/tool",
        },
      },
    };

    const assets = resolveAssets(config, "linux-x64", "dev");
    expect(assets[0].url).toBe(
      "https://releases.example.com/v1/tool-linux-x64.tar.gz"
    );
  });
});
