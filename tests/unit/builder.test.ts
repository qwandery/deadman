import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { executeBuild } from "../../src/core/builder.js";

describe("builder", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `deadman-test-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("should execute a successful build command", async () => {
    const result = await executeBuild("echo hello", undefined, testDir);
    expect(result.success).toBe(true);
    expect(result.output).toContain("hello");
  });

  it("should fail on invalid command", async () => {
    const result = await executeBuild(
      "nonexistent-command-xyz-123",
      undefined,
      testDir
    );
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should verify check path exists after build", async () => {
    const outputFile = join(testDir, "output.txt");
    const result = await executeBuild(
      `echo done > "${outputFile}"`,
      outputFile,
      testDir
    );
    expect(result.success).toBe(true);
  });

  it("should fail when check path doesn't exist after build", async () => {
    const result = await executeBuild(
      "echo done",
      join(testDir, "nonexistent"),
      testDir
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });
});
