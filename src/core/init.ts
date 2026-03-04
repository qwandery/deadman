import { writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { stringify as stringifyYaml } from "yaml";

const STARTER_CONFIG = {
  version: 1,
  defaults: {
    dest_dir: "vendor",
  },
  assets: {
    "example-tool": {
      description: "Example tool — replace with your actual assets",
      url: "https://example.com/tool-v1.0.tar.gz",
      sha256: "replace-with-actual-sha256-hash",
      dest: "vendor/example-tool",
      executable: true,
    },
  },
};

/** Create a starter config file */
export async function initConfig(options: {
  format?: "yaml" | "json";
  output?: string;
}): Promise<string> {
  const format = options.format || "yaml";
  const filename =
    options.output || (format === "json" ? "deadman.json" : "deadman.yaml");
  const outputPath = resolve(filename);

  if (existsSync(outputPath)) {
    throw new Error(`Config file already exists: ${outputPath}`);
  }

  let content: string;
  if (format === "json") {
    content = JSON.stringify(STARTER_CONFIG, null, 2) + "\n";
  } else {
    content = stringifyYaml(STARTER_CONFIG, { lineWidth: 0 });
  }

  await writeFile(outputPath, content, "utf-8");
  return outputPath;
}
