import {
  mkdir,
  copyFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { extract as tarExtract } from "tar";
import AdmZip from "adm-zip";

/** Detect archive type from file extension */
function getArchiveType(
  url: string
): "zip" | "tar" | "tar.gz" | "tar.bz2" | "tar.xz" | null {
  const lower = url.toLowerCase();
  if (lower.endsWith(".zip")) return "zip";
  if (lower.endsWith(".tar.xz")) return "tar.xz";
  if (lower.endsWith(".tar.bz2")) return "tar.bz2";
  if (lower.endsWith(".tar.gz") || lower.endsWith(".tgz")) return "tar.gz";
  if (lower.endsWith(".tar")) return "tar";
  return null;
}

/** Extract a specific file from an archive */
export async function extractFromArchive(
  archivePath: string,
  extractPath: string,
  destPath: string,
  sourceUrl: string
): Promise<void> {
  const archiveType = getArchiveType(sourceUrl);

  if (!archiveType) {
    throw new Error(`Unknown archive format for URL: ${sourceUrl}`);
  }

  await mkdir(dirname(destPath), { recursive: true });

  if (archiveType === "zip") {
    await extractFromZip(archivePath, extractPath, destPath);
  } else {
    await extractFromTar(archivePath, extractPath, destPath, archiveType);
  }
}

async function extractFromTar(
  archivePath: string,
  extractPath: string,
  destPath: string,
  _type: "tar" | "tar.gz" | "tar.bz2" | "tar.xz"
): Promise<void> {
  const tempDir = `${archivePath}.extracted`;
  await mkdir(tempDir, { recursive: true });

  try {
    await tarExtract({
      file: archivePath,
      cwd: tempDir,
    });

    const targetPath = join(tempDir, extractPath);
    const targetStat = await stat(targetPath).catch(() => null);
    if (!targetStat) {
      throw new Error(
        `Extract path '${extractPath}' not found in archive`
      );
    }

    await mkdir(dirname(destPath), { recursive: true });
    await copyFile(targetPath, destPath);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function extractFromZip(
  archivePath: string,
  extractPath: string,
  destPath: string
): Promise<void> {
  const zip = new AdmZip(archivePath);
  const entry = zip.getEntry(extractPath);

  if (!entry) {
    // Try with forward slashes normalized
    const normalized = extractPath.replace(/\\/g, "/");
    const altEntry = zip.getEntry(normalized);
    if (!altEntry) {
      throw new Error(
        `Extract path '${extractPath}' not found in zip archive`
      );
    }
    const data = altEntry.getData();
    await mkdir(dirname(destPath), { recursive: true });
    await writeFile(destPath, data);
    return;
  }

  const data = entry.getData();
  await mkdir(dirname(destPath), { recursive: true });
  await writeFile(destPath, data);
}

/** Move a file to its final destination (no extraction needed) */
export async function placeFile(
  sourcePath: string,
  destPath: string
): Promise<void> {
  await mkdir(dirname(destPath), { recursive: true });
  await copyFile(sourcePath, destPath);
}
