import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { pipeline } from "node:stream/promises";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";

export interface DownloadResult {
  tempPath: string;
  sha256: string;
  size: number;
}

/** Download a file from a URL, streaming to disk, computing SHA256 on-the-fly */
export async function downloadFile(
  url: string,
  tempPath: string,
  allowInsecure: boolean = false
): Promise<DownloadResult> {
  // Enforce HTTPS
  if (!allowInsecure && url.startsWith("http://")) {
    throw new Error(
      `Refusing to download over insecure HTTP: ${url}. Use --allow-insecure to override.`
    );
  }

  await mkdir(dirname(tempPath), { recursive: true });

  const response = await fetch(url, { redirect: "follow" });

  if (!response.ok) {
    throw new Error(
      `Download failed: ${response.status} ${response.statusText} for ${url}`
    );
  }

  if (!response.body) {
    throw new Error(`No response body for ${url}`);
  }

  const hash = createHash("sha256");
  let size = 0;

  const writeStream = createWriteStream(tempPath);

  // Convert web ReadableStream to Node.js stream and pipe through
  const nodeStream = Readable.fromWeb(
    response.body as import("node:stream/web").ReadableStream
  );

  nodeStream.on("data", (chunk: Buffer) => {
    hash.update(chunk);
    size += chunk.length;
  });

  await pipeline(nodeStream, writeStream);

  return {
    tempPath,
    sha256: hash.digest("hex"),
    size,
  };
}
