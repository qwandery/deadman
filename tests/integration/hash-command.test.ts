import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { sha256File } from "../../src/utils/hash.js";

describe("hash command integration", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `deadman-test-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("should compute correct hash for a known file", async () => {
    const filePath = join(testDir, "test.bin");
    await writeFile(filePath, "test content");
    const hash = await sha256File(filePath);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
