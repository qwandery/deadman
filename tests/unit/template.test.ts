import { describe, it, expect } from "vitest";
import {
  buildTemplateContext,
  expandTemplate,
} from "../../src/utils/template.js";

describe("template utilities", () => {
  describe("buildTemplateContext", () => {
    it("should include platform, os, and arch", () => {
      const ctx = buildTemplateContext("darwin-arm64");
      expect(ctx.platform).toBe("darwin-arm64");
      expect(ctx.os).toBe("darwin");
      expect(ctx.arch).toBe("arm64");
    });

    it("should include custom variables", () => {
      const ctx = buildTemplateContext("linux-x64", { version: "1.0" });
      expect(ctx.version).toBe("1.0");
      expect(ctx.platform).toBe("linux-x64");
    });
  });

  describe("expandTemplate", () => {
    it("should expand platform variables", () => {
      const ctx = buildTemplateContext("darwin-arm64");
      expect(expandTemplate("tool-${platform}", ctx)).toBe(
        "tool-darwin-arm64"
      );
      expect(expandTemplate("tool-${os}-${arch}", ctx)).toBe(
        "tool-darwin-arm64"
      );
    });

    it("should expand custom variables", () => {
      const ctx = buildTemplateContext("linux-x64", { version: "2.0" });
      expect(expandTemplate("v${version}/tool-${platform}", ctx)).toBe(
        "v2.0/tool-linux-x64"
      );
    });

    it("should leave unresolved placeholders as-is", () => {
      const ctx = buildTemplateContext("linux-x64");
      expect(expandTemplate("${unknown}", ctx)).toBe("${unknown}");
    });

    it("should handle strings with no placeholders", () => {
      const ctx = buildTemplateContext("linux-x64");
      expect(expandTemplate("no-variables-here", ctx)).toBe(
        "no-variables-here"
      );
    });
  });
});
