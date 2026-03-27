import { Command } from "commander";
import { ExitCode } from "../types.js";
import { fetchAssets } from "../core/fetch.js";
import { verifyAssets } from "../core/verify.js";
import { listAssets, formatListTable } from "../core/list.js";
import { cleanAssets } from "../core/clean.js";
import { initConfig } from "../core/init.js";
import { sha256File } from "../utils/hash.js";
import { checkOutdated, formatOutdatedTable } from "../core/outdated.js";
import { upgradeAssets } from "../core/upgrade.js";
import { rollbackAsset } from "../core/rollback.js";
import { auditAssets, formatAuditTable } from "../core/audit.js";

/** Read environment variable defaults */
function envDefault<T>(envVar: string, fallback: T): T {
  const val = process.env[envVar];
  if (val === undefined) return fallback;
  if (typeof fallback === "boolean") return (val === "1" || val === "true") as T;
  if (typeof fallback === "number") return parseInt(val, 10) as T;
  return val as T;
}

export function createFetchCommand(): Command {
  return new Command("fetch")
    .description("Fetch assets for the current platform and environment")
    .argument("[asset-names...]", "Specific assets to fetch (default: all)")
    .option("--env <environment>", "Environment: dev or prod", process.env.DEADMAN_ENV || "dev")
    .option("--platform <platform>", "Override platform detection")
    .option("--force", "Re-fetch even if valid", false)
    .option("--dry-run", "Show what would happen", false)
    .option("--parallel <n>", "Concurrent downloads", String(envDefault("DEADMAN_PARALLEL", 3)))
    .option("--config <path>", "Config file path", process.env.DEADMAN_CONFIG)
    .option("--quiet", "Minimal output", envDefault("DEADMAN_QUIET", false))
    .option("--verbose", "Detailed output", envDefault("DEADMAN_VERBOSE", false))
    .option("--allow-insecure", "Allow HTTP downloads", false)
    .action(async (assetNames: string[], opts) => {
      try {
        const result = await fetchAssets({
          env: opts.env,
          platform: opts.platform,
          force: opts.force,
          dryRun: opts.dryRun,
          parallel: parseInt(opts.parallel, 10),
          configPath: opts.config,
          quiet: opts.quiet,
          verbose: opts.verbose,
          allowInsecure: opts.allowInsecure,
          assetNames: assetNames.length > 0 ? assetNames : undefined,
        });

        if (!opts.quiet) {
          console.log(
            `\nFetch complete: ${result.fetched} fetched, ${result.skipped} skipped, ${result.failed} failed`
          );
        }

        if (result.failed > 0) {
          for (const err of result.errors) {
            console.error(`  Error: ${err.asset} — ${err.error}`);
          }
          const firstError = result.errors[0]?.error || "";
          if (firstError.includes("Checksum mismatch")) {
            process.exit(ExitCode.CHECKSUM_MISMATCH);
          } else if (firstError.includes("Build")) {
            process.exit(ExitCode.BUILD_FAILED);
          } else {
            process.exit(ExitCode.NETWORK_ERROR);
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error: ${message}`);
        if (message.includes("Config") || message.includes("config") || message.includes("YAML")) {
          process.exit(ExitCode.CONFIG_ERROR);
        }
        process.exit(ExitCode.FILESYSTEM_ERROR);
      }
    });
}

export function createVerifyCommand(): Command {
  return new Command("verify")
    .description("Check that all assets are present and valid")
    .argument("[asset-names...]", "Specific assets to verify")
    .option("--env <environment>", "Environment to verify", process.env.DEADMAN_ENV || "dev")
    .option("--platform <platform>", "Platform to verify")
    .option("--config <path>", "Config file path", process.env.DEADMAN_CONFIG)
    .option("--quiet", "Only output errors", envDefault("DEADMAN_QUIET", false))
    .action(async (assetNames: string[], opts) => {
      try {
        const result = await verifyAssets({
          env: opts.env,
          platform: opts.platform,
          configPath: opts.config,
          quiet: opts.quiet,
          assetNames: assetNames.length > 0 ? assetNames : undefined,
        });

        if (!opts.quiet) {
          console.log(
            `\nVerify: ${result.valid} valid, ${result.missing} missing, ${result.invalid} invalid`
          );
        }

        if (result.missing > 0 || result.invalid > 0) {
          process.exit(ExitCode.VERIFICATION_FAILED);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error: ${message}`);
        process.exit(ExitCode.CONFIG_ERROR);
      }
    });
}

export function createListCommand(): Command {
  return new Command("list")
    .description("Show all defined assets and their status")
    .option("--env <environment>", "Filter by environment", process.env.DEADMAN_ENV)
    .option("--platform <platform>", "Filter by platform")
    .option("--status <status>", "Filter: present, missing, invalid, all", "all")
    .option("--config <path>", "Config file path", process.env.DEADMAN_CONFIG)
    .option("--json", "Output as JSON", false)
    .action(async (opts) => {
      try {
        const entries = await listAssets({
          env: opts.env,
          platform: opts.platform,
          status: opts.status,
          configPath: opts.config,
          json: opts.json,
        });

        if (opts.json) {
          console.log(JSON.stringify(entries, null, 2));
        } else {
          console.log(formatListTable(entries));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error: ${message}`);
        process.exit(ExitCode.CONFIG_ERROR);
      }
    });
}

export function createCleanCommand(): Command {
  return new Command("clean")
    .description("Remove fetched assets")
    .argument("[asset-names...]", "Specific assets to clean")
    .option("--all", "Remove assets for all platforms/environments", false)
    .option("--keep-lock", "Don't delete lock file", false)
    .option("--config <path>", "Config file path", process.env.DEADMAN_CONFIG)
    .option("--dry-run", "Show what would be deleted", false)
    .option("--platform <platform>", "Override platform detection")
    .action(async (assetNames: string[], opts) => {
      try {
        const result = await cleanAssets({
          all: opts.all,
          keepLock: opts.keepLock,
          configPath: opts.config,
          dryRun: opts.dryRun,
          platform: opts.platform,
          assetNames: assetNames.length > 0 ? assetNames : undefined,
        });

        console.log(
          `Clean complete: ${result.deleted} deleted, ${result.notFound} not found`
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error: ${message}`);
        process.exit(ExitCode.CONFIG_ERROR);
      }
    });
}

export function createInitCommand(): Command {
  return new Command("init")
    .description("Create a starter config file")
    .option("--format <format>", "yaml or json", "yaml")
    .option("--output <path>", "Output path")
    .action(async (opts) => {
      try {
        const outputPath = await initConfig({
          format: opts.format,
          output: opts.output,
        });
        console.log(`Created config file: ${outputPath}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error: ${message}`);
        process.exit(ExitCode.FILESYSTEM_ERROR);
      }
    });
}

export function createHashCommand(): Command {
  return new Command("hash")
    .description("Compute sha256 hash for a file")
    .argument("<file>", "File to hash")
    .action(async (file: string) => {
      try {
        const hash = await sha256File(file);
        console.log(`sha256:${hash}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error: ${message}`);
        process.exit(ExitCode.FILESYSTEM_ERROR);
      }
    });
}

export function createOutdatedCommand(): Command {
  return new Command("outdated")
    .description("Check for available asset version updates")
    .option("--env <environment>", "Environment to check", process.env.DEADMAN_ENV || "dev")
    .option("--platform <platform>", "Platform to check")
    .option("--config <path>", "Config file path", process.env.DEADMAN_CONFIG)
    .option("--json", "Output as JSON", false)
    .action(async (opts) => {
      try {
        const result = await checkOutdated({
          env: opts.env,
          platform: opts.platform,
          configPath: opts.config,
          json: opts.json,
        });

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(formatOutdatedTable(result));
          if (result.totalOutdated > 0) {
            console.log(
              `\n${result.totalOutdated} of ${result.totalChecked} versioned assets can be updated.`
            );
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error: ${message}`);
        if (message.includes("rate limit")) {
          process.exit(ExitCode.NETWORK_ERROR);
        }
        process.exit(ExitCode.VERSION_RESOLUTION_FAILED);
      }
    });
}

export function createUpgradeCommand(): Command {
  return new Command("upgrade")
    .description("Upgrade versioned assets to their latest matching versions")
    .argument("[asset-names...]", "Specific assets to upgrade (default: all)")
    .option("--env <environment>", "Environment", process.env.DEADMAN_ENV || "dev")
    .option("--platform <platform>", "Platform")
    .option("--config <path>", "Config file path", process.env.DEADMAN_CONFIG)
    .option("--dry-run", "Preview without changing anything", false)
    .option("--major", "Allow major version bumps", false)
    .action(async (assetNames: string[], opts) => {
      try {
        const result = await upgradeAssets({
          env: opts.env,
          platform: opts.platform,
          configPath: opts.config,
          dryRun: opts.dryRun,
          major: opts.major,
          assetNames: assetNames.length > 0 ? assetNames : undefined,
        });

        console.log(
          `\nUpgrade complete: ${result.totalUpgraded} upgraded, ${result.totalSkipped} skipped, ${result.totalFailed} failed`
        );

        if (result.totalFailed > 0) {
          for (const entry of result.entries.filter(
            (e) => e.status === "failed"
          )) {
            console.error(`  Error: ${entry.name} — ${entry.error}`);
          }
          process.exit(ExitCode.UPGRADE_FAILED);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error: ${message}`);
        process.exit(ExitCode.UPGRADE_FAILED);
      }
    });
}

export function createRollbackCommand(): Command {
  return new Command("rollback")
    .description("Roll back an asset to a previous version")
    .argument("<asset-name>", "Asset to roll back")
    .option("--to <version>", "Target version (default: previous)")
    .option("--config <path>", "Config file path", process.env.DEADMAN_CONFIG)
    .action(async (assetName: string, opts) => {
      try {
        const result = await rollbackAsset({
          assetName,
          target: opts.to,
          configPath: opts.config,
        });

        if (result.status === "rolled_back") {
          console.log(
            `  [rollback] ${result.name} ${result.from || "unknown"} -> ${result.to}`
          );
          console.log("Rollback complete.");
        } else {
          console.error(`Error: ${result.error}`);
          process.exit(ExitCode.UPGRADE_FAILED);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error: ${message}`);
        process.exit(ExitCode.UPGRADE_FAILED);
      }
    });
}

export function createAuditCommand(): Command {
  return new Command("audit")
    .description("Audit versioned assets for age and update status")
    .option("--env <environment>", "Environment", process.env.DEADMAN_ENV || "dev")
    .option("--platform <platform>", "Platform")
    .option("--config <path>", "Config file path", process.env.DEADMAN_CONFIG)
    .option("--json", "Output as JSON", false)
    .option("--warn-threshold <n>", "Versions behind to warn", "5")
    .option("--critical-threshold <n>", "Versions behind for critical", "10")
    .action(async (opts) => {
      try {
        const result = await auditAssets({
          env: opts.env,
          platform: opts.platform,
          configPath: opts.config,
          json: opts.json,
          warnThreshold: parseInt(opts.warnThreshold, 10),
          criticalThreshold: parseInt(opts.criticalThreshold, 10),
        });

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(formatAuditTable(result));
          if (result.critical > 0) {
            console.log(`\n${result.critical} critical issue(s) found.`);
          } else if (result.warnings > 0) {
            console.log(`\n${result.warnings} warning(s) found.`);
          } else {
            console.log("\nAll versioned assets are up to date.");
          }
        }

        if (result.critical > 0) {
          process.exit(ExitCode.VERIFICATION_FAILED);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error: ${message}`);
        process.exit(ExitCode.VERSION_RESOLUTION_FAILED);
      }
    });
}
