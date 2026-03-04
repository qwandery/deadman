import { describe, it, expect } from "vitest";
import { writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { sha256File, sha256String } from "../../src/utils/hash.js";

describe("hash utilities", () => {
  describe("sha256String", () => {
    it("should hash a string", () => {
      const hash = sha256String("hello");
      expect(hash).toBe(
        "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
      );
    });

    it("should produce different hashes for different inputs", () => {
      expect(sha256String("a")).not.toBe(sha256String("b"));
    });
  });

  describe("sha256File", () => {
    it("should hash a file", async () => {
      const tempFile = join(tmpdir(), `deadman-test-${randomUUID()}`);
      await writeFile(tempFile, "hello", "utf-8");
      try {
        const hash = await sha256File(tempFile);
        expect(hash).toBe(sha256String("hello"));
      } finally {
        await rm(tempFile, { force: true });
      }
    });

    it("should reject for missing file", async () => {
      await expect(sha256File("/nonexistent/file")).rejects.toThrow();
    });
  });
});
