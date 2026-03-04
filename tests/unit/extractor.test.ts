import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFile, mkdir, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { extractFromArchive, placeFile } from "../../src/core/extractor.js";
import AdmZip from "adm-zip";
import { create as tarCreate } from "tar";

describe("extractor", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `deadman-test-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe("placeFile", () => {
    it("should copy a file to destination", async () => {
      const src = join(testDir, "source.bin");
      const dest = join(testDir, "output", "dest.bin");
      await writeFile(src, "file-content");

      await placeFile(src, dest);

      const content = await readFile(dest, "utf-8");
      expect(content).toBe("file-content");
    });

    it("should create destination directory", async () => {
      const src = join(testDir, "source.bin");
      const dest = join(testDir, "deep", "nested", "dest.bin");
      await writeFile(src, "content");

      await placeFile(src, dest);

      const content = await readFile(dest, "utf-8");
      expect(content).toBe("content");
    });
  });

  describe("extractFromArchive - zip", () => {
    it("should extract a file from a zip archive", async () => {
      // Create a zip file with adm-zip
      const zip = new AdmZip();
      zip.addFile("inner/tool.bin", Buffer.from("tool-binary-data"));
      const zipPath = join(testDir, "archive.zip");
      zip.writeZip(zipPath);

      const destPath = join(testDir, "output", "tool.bin");
      await extractFromArchive(zipPath, "inner/tool.bin", destPath, "https://example.com/archive.zip");

      const content = await readFile(destPath, "utf-8");
      expect(content).toBe("tool-binary-data");
    });

    it("should throw for missing extract path in zip", async () => {
      const zip = new AdmZip();
      zip.addFile("other.bin", Buffer.from("data"));
      const zipPath = join(testDir, "archive.zip");
      zip.writeZip(zipPath);

      const destPath = join(testDir, "output", "tool.bin");
      await expect(
        extractFromArchive(zipPath, "nonexistent.bin", destPath, "https://example.com/archive.zip")
      ).rejects.toThrow("not found in zip archive");
    });
  });

  describe("extractFromArchive - tar.gz", () => {
    it("should extract a file from a tar.gz archive", async () => {
      // Create a directory with a file, then tar it
      const srcDir = join(testDir, "tar-source");
      const innerDir = join(srcDir, "inner");
      await mkdir(innerDir, { recursive: true });
      await writeFile(join(innerDir, "tool.bin"), "tar-tool-data");

      const tarPath = join(testDir, "archive.tar.gz");
      await tarCreate(
        { gzip: true, file: tarPath, cwd: srcDir },
        ["inner/tool.bin"]
      );

      const destPath = join(testDir, "output", "tool.bin");
      await extractFromArchive(tarPath, "inner/tool.bin", destPath, "https://example.com/archive.tar.gz");

      const content = await readFile(destPath, "utf-8");
      expect(content).toBe("tar-tool-data");
    });

    it("should throw for missing extract path in tar", async () => {
      const srcDir = join(testDir, "tar-source");
      await mkdir(srcDir, { recursive: true });
      await writeFile(join(srcDir, "other.bin"), "data");

      const tarPath = join(testDir, "archive.tar.gz");
      await tarCreate(
        { gzip: true, file: tarPath, cwd: srcDir },
        ["other.bin"]
      );

      const destPath = join(testDir, "output", "tool.bin");
      await expect(
        extractFromArchive(tarPath, "nonexistent.bin", destPath, "https://example.com/archive.tar.gz")
      ).rejects.toThrow("not found in archive");
    });
  });

  describe("archive type detection", () => {
    it("should throw for unknown archive format", async () => {
      const filePath = join(testDir, "file.bin");
      await writeFile(filePath, "data");

      await expect(
        extractFromArchive(filePath, "inner", join(testDir, "out"), "https://example.com/file.bin")
      ).rejects.toThrow("Unknown archive format");
    });
  });
});
