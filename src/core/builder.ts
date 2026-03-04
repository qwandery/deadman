import { exec } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const execAsync = promisify(exec);

export interface BuildResult {
  success: boolean;
  output: string;
  error?: string;
}

/** Execute a build command for a build-based asset */
export async function executeBuild(
  command: string,
  checkPath?: string,
  cwd: string = process.cwd()
): Promise<BuildResult> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout: 300_000, // 5 minute timeout
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    // Check that output file exists if check path is specified
    if (checkPath) {
      const fullCheckPath = resolve(cwd, checkPath);
      if (!existsSync(fullCheckPath)) {
        return {
          success: false,
          output: stdout,
          error: `Build command completed but expected output not found at: ${checkPath}`,
        };
      }
    }

    return {
      success: true,
      output: stdout + (stderr ? `\n${stderr}` : ""),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      output: "",
      error: `Build command failed: ${message}`,
    };
  }
}
