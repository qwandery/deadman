import { describe, it, expect } from "vitest";
import {
  detectPlatform,
  parsePlatform,
  getOs,
  getArch,
  isValidPlatform,
} from "../../src/utils/platform.js";

describe("platform utilities", () => {
  describe("detectPlatform", () => {
    it("should return a valid platform string", () => {
      const platform = detectPlatform();
      expect(isValidPlatform(platform)).toBe(true);
    });
  });

  describe("parsePlatform", () => {
    it("should accept valid platforms", () => {
      expect(parsePlatform("darwin-arm64")).toBe("darwin-arm64");
      expect(parsePlatform("linux-x64")).toBe("linux-x64");
      expect(parsePlatform("win32-x64")).toBe("win32-x64");
    });

    it("should reject invalid platforms", () => {
      expect(() => parsePlatform("invalid")).toThrow("Invalid platform");
      expect(() => parsePlatform("linux-arm32")).toThrow("Invalid platform");
    });
  });

  describe("getOs", () => {
    it("should extract OS from platform", () => {
      expect(getOs("darwin-arm64")).toBe("darwin");
      expect(getOs("win32-x64")).toBe("win32");
      expect(getOs("linux-x64")).toBe("linux");
    });
  });

  describe("getArch", () => {
    it("should extract arch from platform", () => {
      expect(getArch("darwin-arm64")).toBe("arm64");
      expect(getArch("linux-x64")).toBe("x64");
    });
  });

  describe("isValidPlatform", () => {
    it("should return true for valid platforms", () => {
      expect(isValidPlatform("darwin-arm64")).toBe(true);
      expect(isValidPlatform("linux-x64")).toBe(true);
    });

    it("should return false for invalid platforms", () => {
      expect(isValidPlatform("invalid")).toBe(false);
      expect(isValidPlatform("")).toBe(false);
    });
  });
});
