import { describe, it, expect } from "vitest";
import { downloadFile } from "../../src/core/downloader.js";

describe("downloader", () => {
  it("should reject HTTP URLs by default", async () => {
    await expect(
      downloadFile("http://example.com/tool.bin", "/tmp/test-download", false)
    ).rejects.toThrow("Refusing to download over insecure HTTP");
  });

  it("should reject HTTP URLs with allowInsecure=false", async () => {
    await expect(
      downloadFile("http://example.com/tool.bin", "/tmp/test-download", false)
    ).rejects.toThrow("insecure HTTP");
  });
});
