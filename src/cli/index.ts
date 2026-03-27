import { Command } from "commander";
import {
  createFetchCommand,
  createVerifyCommand,
  createListCommand,
  createCleanCommand,
  createInitCommand,
  createHashCommand,
  createOutdatedCommand,
  createUpgradeCommand,
  createRollbackCommand,
  createAuditCommand,
} from "./commands.js";

/** Create the main CLI program */
export function createProgram(): Command {
  const program = new Command();

  program
    .name("deadman")
    .description(
      "Dead-ass simple tool management — fetch and manage binary assets"
    )
    .version("1.0.0");

  program.addCommand(createFetchCommand());
  program.addCommand(createVerifyCommand());
  program.addCommand(createListCommand());
  program.addCommand(createCleanCommand());
  program.addCommand(createInitCommand());
  program.addCommand(createHashCommand());
  program.addCommand(createOutdatedCommand());
  program.addCommand(createUpgradeCommand());
  program.addCommand(createRollbackCommand());
  program.addCommand(createAuditCommand());

  return program;
}
