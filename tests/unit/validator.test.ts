import { describe, it, expect } from "vitest";
import { validateConfig } from "../../src/config/validator.js";

describe("config validator", () => {
  it("should accept a minimal valid config", () => {
    const config = validateConfig({
      version: 1,
      assets: {
        tool: {
          url: "https://example.com/tool.tar.gz",
          sha256: "abc123",
          dest: "vendor/tool",
        },
      },
    });
    expect(config.version).toBe(1);
    expect(config.assets.tool.url).toBe("https://example.com/tool.tar.gz");
  });

  it("should reject missing version", () => {
    expect(() =>
      validateConfig({ assets: { tool: { url: "a", sha256: "b", dest: "c" } } })
    ).toThrow("version");
  });

  it("should reject unsupported version", () => {
    expect(() =>
      validateConfig({ version: 2, assets: { tool: { url: "a", sha256: "b", dest: "c" } } })
    ).toThrow("Unsupported config version");
  });

  it("should reject missing assets", () => {
    expect(() => validateConfig({ version: 1 })).toThrow("assets");
  });

  it("should reject null config", () => {
    expect(() => validateConfig(null)).toThrow("must be a YAML object");
  });

  it("should reject asset without url, platforms, or build", () => {
    expect(() =>
      validateConfig({
        version: 1,
        assets: { tool: { dest: "vendor/tool" } },
      })
    ).toThrow("must have one of");
  });

  it("should reject url asset without sha256 or trusted", () => {
    expect(() =>
      validateConfig({
        version: 1,
        assets: { tool: { url: "https://example.com/tool", dest: "vendor/tool" } },
      })
    ).toThrow("sha256");
  });

  it("should accept url asset with trusted instead of sha256", () => {
    const config = validateConfig({
      version: 1,
      assets: {
        tool: {
          url: "https://example.com/tool",
          trusted: true,
          dest: "vendor/tool",
        },
      },
    });
    expect(config.assets.tool.trusted).toBe(true);
  });

  it("should reject asset with both sha256 and trusted", () => {
    expect(() =>
      validateConfig({
        version: 1,
        assets: {
          tool: {
            url: "https://example.com/tool",
            sha256: "abc123",
            trusted: true,
            dest: "vendor/tool",
          },
        },
      })
    ).toThrow("cannot have both sha256 and trusted");
  });

  it("should accept platform source with trusted instead of sha256", () => {
    const config = validateConfig({
      version: 1,
      assets: {
        tool: {
          dest: "vendor/tool",
          platforms: {
            "linux-x64": {
              url: "https://example.com/tool-linux",
              trusted: true,
            },
          },
        },
      },
    });
    expect(config.assets.tool).toBeDefined();
  });

  it("should reject platform source with both sha256 and trusted", () => {
    expect(() =>
      validateConfig({
        version: 1,
        assets: {
          tool: {
            dest: "vendor/tool",
            platforms: {
              "linux-x64": {
                url: "https://example.com/tool-linux",
                sha256: "abc",
                trusted: true,
              },
            },
          },
        },
      })
    ).toThrow("cannot have both sha256 and trusted");
  });

  it("should accept platform source map", () => {
    const config = validateConfig({
      version: 1,
      assets: {
        tool: {
          dest: "vendor/tool",
          platforms: {
            "linux-x64": {
              url: "https://example.com/tool-linux",
              sha256: "abc123",
            },
          },
        },
      },
    });
    expect(config.assets.tool).toBeDefined();
  });

  it("should reject invalid platform in source map", () => {
    expect(() =>
      validateConfig({
        version: 1,
        assets: {
          tool: {
            dest: "vendor/tool",
            platforms: {
              "invalid-platform": {
                url: "https://example.com/tool",
                sha256: "abc",
              },
            },
          },
        },
      })
    ).toThrow("invalid platform");
  });

  it("should accept build-based asset", () => {
    const config = validateConfig({
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
    });
    expect(config.assets.tool.build?.command).toBe("./build.sh");
  });

  it("should accept asset with environment filter", () => {
    const config = validateConfig({
      version: 1,
      assets: {
        tool: {
          url: "https://example.com/tool",
          sha256: "abc",
          dest: "vendor/tool",
          environments: ["dev", "test"],
        },
      },
    });
    expect(config.assets.tool.environments).toEqual(["dev", "test"]);
  });

  it("should accept config with defaults and variables", () => {
    const config = validateConfig({
      version: 1,
      defaults: { base_url: "https://example.com", dest_dir: "vendor" },
      variables: { version: "1.0" },
      assets: {
        tool: {
          url: "https://example.com/tool",
          sha256: "abc",
          dest: "vendor/tool",
        },
      },
    });
    expect(config.defaults?.base_url).toBe("https://example.com");
    expect(config.variables?.version).toBe("1.0");
  });
});
