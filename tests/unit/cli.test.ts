import { createRequire } from "node:module";
import { describe, it, expect } from "vitest";
import { createProgram } from "../../src/cli/index.js";

const require = createRequire(import.meta.url);
const pkg = require("../../package.json") as { version: string };

describe("CLI program", () => {
  it("should create program with all commands", () => {
    const program = createProgram();
    expect(program.name()).toBe("deadman");

    const commandNames = program.commands.map((c) => c.name());
    expect(commandNames).toContain("fetch");
    expect(commandNames).toContain("verify");
    expect(commandNames).toContain("list");
    expect(commandNames).toContain("clean");
    expect(commandNames).toContain("init");
    expect(commandNames).toContain("hash");
    expect(commandNames).toContain("outdated");
    expect(commandNames).toContain("upgrade");
    expect(commandNames).toContain("rollback");
    expect(commandNames).toContain("audit");
  });

  it("should have version matching package.json", () => {
    const program = createProgram();
    expect(program.version()).toBe(pkg.version);
  });
});
