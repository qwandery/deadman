import { describe, it, expect } from "vitest";
import { createProgram } from "../../src/cli/index.js";

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
  });

  it("should have correct version", () => {
    const program = createProgram();
    expect(program.version()).toBe("1.0.0");
  });
});
