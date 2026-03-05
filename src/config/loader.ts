import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import type { DeadManConfig } from "../types.js";
import { validateConfig } from "./validator.js";

/** Config file names in priority order */
const CONFIG_FILENAMES = [
  "deadman.yaml",
  "deadman.yml",
  ".deadman.yaml",
  ".deadman.yml",
];

/** Discover the config file path */
export function discoverConfigPath(cwd: string = process.cwd()): string | null {
  for (const filename of CONFIG_FILENAMES) {
    const fullPath = resolve(cwd, filename);
    if (existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

/** Load and parse a config file */
export async function loadConfig(configPath?: string): Promise<{
  config: DeadManConfig;
  configPath: string;
  rawContent: string;
}> {
  let resolvedPath: string;

  if (configPath) {
    resolvedPath = resolve(configPath);
    if (!existsSync(resolvedPath)) {
      throw new Error(`Config file not found: ${resolvedPath}`);
    }
  } else {
    const discovered = discoverConfigPath();
    if (!discovered) {
      throw new Error(
        `No config file found. Looked for: ${CONFIG_FILENAMES.join(", ")}`
      );
    }
    resolvedPath = discovered;
  }

  const rawContent = await readFile(resolvedPath, "utf-8");

  let parsed: unknown;
  try {
    parsed = parseYaml(rawContent);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse YAML in ${resolvedPath}: ${message}`);
  }

  const config = validateConfig(parsed);

  // Expand environment variable references in variables section
  if (config.variables) {
    for (const [key, value] of Object.entries(config.variables)) {
      if (value.startsWith("$") && !value.startsWith("${")) {
        const envName = value.slice(1);
        const envValue = process.env[envName];
        if (envValue === undefined) {
          throw new Error(
            `Variable '${key}' references environment variable '${envName}' which is not set`
          );
        }
        config.variables[key] = envValue;
      }
    }
  }

  return { config, configPath: resolvedPath, rawContent };
}
