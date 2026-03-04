import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";

/** Compute SHA256 hash of a file, returns hex string */
export async function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

/** Compute SHA256 hash of a string, returns hex string */
export function sha256String(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}
