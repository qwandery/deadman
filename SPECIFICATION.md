# DeadMan — Dead-Ass Simple Tool Management

**Version:** 1.0  
**Date:** March 4, 2026  
**Author:** Brian Lacy  
**License:** MIT

---

## Overview

DeadMan is a minimal, cross-platform CLI tool for fetching and managing binary assets that don't fit into traditional package managers. It handles prebuilt binaries, large model files, and other artifacts that vary by platform and environment.

### The Problem

Modern projects often depend on assets outside their primary ecosystem:
- Prebuilt native binaries (ffmpeg, whisper.cpp, sqlite)
- Machine learning models (GGML, ONNX, safetensors)
- Bundled tools from other ecosystems (PyInstaller bundles, Go binaries)
- Platform-specific variants of the same tool

These don't belong in npm, pip, or cargo. They're too large for git. They vary by OS and architecture. Teams end up with fragile setup scripts, outdated wikis, and "works on my machine" problems.

### The Solution

One config file. One command. One manifest.

```
deadman fetch
```

That's the entire mental model.

---

## Design Principles

1. **Dead Simple** — If it takes more than 5 minutes to understand, it's too complex
2. **Declarative** — Config describes desired state, not procedures
3. **Verifiable** — Every asset has a checksum; integrity is guaranteed
4. **Ecosystem Agnostic** — Works alongside npm, pip, cargo, or none of them
5. **Platform Aware** — Handles OS/arch variants cleanly
6. **Environment Aware** — Different assets for dev vs prod
7. **Transparent** — No magic; every action is inspectable and predictable
8. **Offline Friendly** — Once fetched, works without network

---

## Installation

DeadMan is distributed as a standalone binary and as an npm package.

**Standalone Binary:**
Download from releases, place in PATH. No runtime dependencies.

**npm Package:**
```
npm install -g deadman
```
or as a dev dependency:
```
npm install --save-dev deadman
```

**npx (no install):**
```
npx deadman fetch
```

---

## Quick Start

**1. Create deadman.yaml in your project root:**

```yaml
version: 1

assets:
  ffmpeg:
    description: "FFmpeg audio/video converter"
    platforms:
      darwin-arm64:
        url: "https://evermeet.cx/ffmpeg/ffmpeg-7.1-arm64.zip"
        sha256: "abc123..."
        extract: "ffmpeg"
      win32-x64:
        url: "https://example.com/ffmpeg-win64.zip"
        sha256: "def456..."
        extract: "bin/ffmpeg.exe"
    dest: "vendor/ffmpeg"
    executable: true
```

**2. Fetch assets:**

```
deadman fetch
```

**3. Done.** The binary is at `vendor/ffmpeg` (or `vendor/ffmpeg.exe` on Windows).

---

## Configuration Reference

### File Location

DeadMan looks for configuration in this order:
1. `deadman.yaml`
2. `deadman.yml`
3. `.deadman.yaml`
4. `.deadman.yml`

Or specify explicitly: `deadman fetch --config path/to/config.yaml`

### Top-Level Structure

```yaml
version: 1                    # Config format version (required)

defaults:                     # Optional defaults for all assets
  base_url: "https://..."     # Prepended to relative URLs
  dest_dir: "vendor"          # Default destination directory

assets:                       # Asset definitions (required)
  asset-name:
    ...
```

### Asset Definition

Each asset is a named entry under `assets`:

```yaml
assets:
  asset-name:
    # Metadata
    description: "Human-readable description"
    
    # Availability (optional filters)
    platforms: [darwin-arm64, win32-x64]    # If omitted, available on all
    environments: [dev, prod]                # If omitted, available in all
    
    # Source (one of: url, platforms with urls, or build)
    url: "https://..."                       # Simple case: same URL for all platforms
    
    # Destination
    dest: "path/to/destination"              # Where to put it
    
    # Options
    sha256: "..."                            # Checksum (required for url sources)
    extract: "path/in/archive"               # If URL is archive, extract this path
    executable: true                         # chmod +x after fetch (Unix)
    rename: "new-filename"                   # Rename after fetch/extract
```

### Platform-Specific Sources

When a tool has different binaries per platform:

```yaml
assets:
  whisper-cpp:
    description: "Whisper.cpp transcription engine"
    dest: "vendor/whisper-cpp"
    executable: true
    platforms:
      darwin-arm64:
        url: "https://.../whisper-darwin-arm64"
        sha256: "..."
      darwin-x64:
        url: "https://.../whisper-darwin-x64"
        sha256: "..."
      win32-x64:
        url: "https://.../whisper-win64.exe"
        sha256: "..."
        rename: "whisper-cpp.exe"            # Platform-specific options
      linux-x64:
        url: "https://.../whisper-linux-x64"
        sha256: "..."
```

### Build-Based Assets

For assets that must be built locally (no prebuilt binary available):

```yaml
assets:
  presidio-cli:
    description: "Presidio de-identification tool"
    dest: "vendor/presidio-cli"
    executable: true
    build:
      command: "./scripts/build-presidio.sh"
      platforms:
        win32-x64:
          command: "scripts\\build-presidio.ps1"
      check: "vendor/presidio-cli"           # Verify this path exists after build
      sha256: false                          # Skip checksum for built assets
```

Build assets run a command instead of downloading. The command is responsible for producing the output at the specified destination.

### Environment Filtering

Fetch different assets in different environments:

```yaml
assets:
  model-tiny:
    description: "Small model for development"
    environments: [dev]
    url: "https://.../tiny-model.bin"
    sha256: "..."
    dest: "models/model.bin"
    
  model-large:
    description: "Full model for production"
    environments: [prod]
    url: "https://.../large-model.bin"
    sha256: "..."
    dest: "models/model.bin"
```

Run with: `deadman fetch --env prod`

### Archive Extraction

DeadMan supports extracting from archives:

```yaml
assets:
  ffmpeg:
    url: "https://.../ffmpeg-7.1.tar.gz"
    sha256: "..."
    extract: "ffmpeg-7.1/bin/ffmpeg"    # Path within archive
    dest: "vendor/ffmpeg"
```

Supported archive formats:
- `.zip`
- `.tar`
- `.tar.gz` / `.tgz`
- `.tar.bz2`
- `.tar.xz`

### URL Templates

Use placeholders for cleaner configs:

```yaml
defaults:
  base_url: "https://github.com/example/tool/releases/download/v${version}"

variables:
  version: "1.7.2"

assets:
  tool:
    url: "${base_url}/tool-${platform}.tar.gz"   # Expands platform automatically
    ...
```

Available template variables:
- `${platform}` — Full platform string (e.g., darwin-arm64)
- `${os}` — Operating system (darwin, win32, linux)
- `${arch}` — Architecture (arm64, x64)
- `${version}` — From variables section
- Any custom variable defined in `variables`

---

## Manifest: deadman.lock

After fetching, DeadMan writes a lock file recording the current state:

```yaml
generated_at: "2026-03-04T15:30:00Z"
platform: darwin-arm64
environment: dev
config_hash: "sha256:abc123..."

assets:
  ffmpeg:
    status: present
    path: "vendor/ffmpeg"
    sha256: "def456..."
    fetched_at: "2026-03-04T15:30:00Z"
    source: "https://evermeet.cx/ffmpeg/ffmpeg-7.1-arm64.zip"
    
  whisper-cpp:
    status: present
    path: "vendor/whisper-cpp"
    sha256: "789xyz..."
    fetched_at: "2026-03-04T15:28:00Z"
    source: "https://.../whisper-darwin-arm64"
```

### Lock File Uses

**Verification:** `deadman verify` checks assets against the lock file.

**Caching:** CI systems can cache based on lock file hash.

**Auditing:** See exactly what versions/sources are in use.

**Reproducibility:** Lock file records the exact state for a given fetch.

### Committing the Lock File

Your choice:

**Commit it:** Enables verification, documents exact versions, helps CI caching.

**Gitignore it:** Treats each fetch as fresh, avoids lock file churn.

For most projects, committing is recommended.

---

## CLI Reference

### deadman fetch

Fetch assets for the current platform and environment.

```
deadman fetch [options] [asset-names...]

Arguments:
  asset-names           Specific assets to fetch (default: all)

Options:
  --env <environment>   Environment: dev or prod (default: dev)
  --platform <platform> Override platform detection
  --force               Re-fetch even if valid
  --dry-run             Show what would happen
  --parallel <n>        Concurrent downloads (default: 3)
  --config <path>       Config file path
  --quiet               Minimal output
  --verbose             Detailed output
```

**Examples:**

```bash
# Fetch all dev assets for current platform
deadman fetch

# Fetch production assets
deadman fetch --env prod

# Fetch specific asset
deadman fetch ffmpeg

# Fetch multiple specific assets
deadman fetch ffmpeg whisper-cpp

# See what would happen without doing it
deadman fetch --dry-run

# Force re-download
deadman fetch --force
```

### deadman verify

Check that all assets are present and valid.

```
deadman verify [options] [asset-names...]

Options:
  --env <environment>   Environment to verify
  --platform <platform> Platform to verify
  --config <path>       Config file path
  --quiet               Only output errors
```

Exit codes:
- 0: All assets valid
- 1: One or more assets missing or invalid

**Examples:**

```bash
# Verify all assets
deadman verify

# Verify in CI (quiet, fail on error)
deadman verify --quiet || exit 1
```

### deadman list

Show all defined assets and their status.

```
deadman list [options]

Options:
  --env <environment>   Filter by environment
  --platform <platform> Filter by platform
  --status <status>     Filter: present, missing, invalid, all (default: all)
  --config <path>       Config file path
  --json                Output as JSON
```

**Example Output:**

```
ASSET          PLATFORM      ENV   STATUS    SIZE      PATH
ffmpeg         darwin-arm64  all   present   85.2 MB   vendor/ffmpeg
whisper-cpp    darwin-arm64  all   present   4.2 MB    vendor/whisper-cpp
model-tiny     darwin-arm64  dev   present   75.5 MB   models/tiny.bin
model-large    darwin-arm64  prod  missing   -         models/large.bin
presidio-cli   darwin-arm64  all   invalid   -         vendor/presidio-cli
```

### deadman clean

Remove fetched assets.

```
deadman clean [options] [asset-names...]

Options:
  --all                 Remove assets for all platforms/environments
  --keep-lock           Don't delete lock file
  --config <path>       Config file path
  --dry-run             Show what would be deleted
```

**Examples:**

```bash
# Clean all assets
deadman clean

# Clean specific asset
deadman clean ffmpeg

# See what would be deleted
deadman clean --dry-run
```

### deadman init

Create a starter config file.

```
deadman init [options]

Options:
  --format <format>     yaml or json (default: yaml)
  --output <path>       Output path (default: deadman.yaml)
```

### deadman hash

Compute sha256 hash for a file (utility command).

```
deadman hash <file>

# Output: sha256:abc123def456...
```

Useful when adding new assets to config.

---

## Platforms

DeadMan recognizes these platform identifiers:

| Platform | OS | Architecture |
|----------|-----|--------------|
| darwin-arm64 | macOS | Apple Silicon |
| darwin-x64 | macOS | Intel |
| win32-x64 | Windows | x64 |
| win32-arm64 | Windows | ARM64 |
| linux-x64 | Linux | x64 |
| linux-arm64 | Linux | ARM64 |

Platform is auto-detected but can be overridden with `--platform`.

---

## Environments

Environments are arbitrary strings. Common conventions:

| Environment | Typical Use |
|-------------|-------------|
| dev | Development: minimal assets, smallest models |
| prod | Production: full assets, largest models |
| test | Testing: may differ from dev |
| ci | CI builds: may include extra tooling |

Default is `dev`. Set via `--env` or `DEADMAN_ENV` environment variable.

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Asset verification failed (missing or invalid) |
| 2 | Configuration error (invalid YAML, missing required fields) |
| 3 | Network error (download failed) |
| 4 | File system error (permission denied, disk full) |
| 5 | Build command failed |
| 6 | Checksum mismatch |

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| DEADMAN_ENV | Default environment (overridden by --env) |
| DEADMAN_CONFIG | Default config path (overridden by --config) |
| DEADMAN_CACHE_DIR | Custom cache directory for downloads |
| DEADMAN_PARALLEL | Default parallel downloads |
| DEADMAN_QUIET | Set to 1 for quiet mode |
| DEADMAN_VERBOSE | Set to 1 for verbose mode |

---

## Integration Patterns

### npm Scripts

```json
{
  "scripts": {
    "setup": "deadman fetch && npm install",
    "setup:prod": "deadman fetch --env prod && npm install",
    "verify": "deadman verify",
    "clean": "deadman clean && rm -rf node_modules"
  }
}
```

### Makefile

```makefile
.PHONY: setup verify clean

setup:
	deadman fetch
	npm install

setup-prod:
	deadman fetch --env prod
	npm install

verify:
	deadman verify

clean:
	deadman clean
	rm -rf node_modules
```

### GitHub Actions

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Cache DeadMan assets
        uses: actions/cache@v4
        with:
          path: |
            vendor/
            models/
          key: deadman-${{ runner.os }}-${{ hashFiles('deadman.lock') }}
          
      - name: Fetch assets
        run: npx deadman fetch --env prod
        
      - name: Verify assets
        run: npx deadman verify --env prod
```

### Docker

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY deadman.yaml deadman.lock ./

# Fetch production assets
RUN npx deadman fetch --env prod

COPY package*.json ./
RUN npm ci

COPY . .
CMD ["npm", "start"]
```

### Pre-commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit

# Verify assets are present and valid
deadman verify --quiet
if [ $? -ne 0 ]; then
  echo "DeadMan assets invalid. Run 'deadman fetch' first."
  exit 1
fi
```

---

## Security Considerations

### Checksum Verification

Every downloaded asset must have a sha256 checksum in the config. DeadMan refuses to fetch assets without checksums (unless explicitly disabled for build assets).

The checksum is verified:
- After download, before writing to destination
- During `deadman verify`

If a checksum fails, the partial download is deleted and an error is reported.

### HTTPS Only

DeadMan only fetches from HTTPS URLs by default. HTTP URLs are rejected unless `--allow-insecure` is passed (not recommended).

### No Code Execution from Remote

Downloaded assets are never executed as part of the fetch process. Marking an asset as `executable: true` only sets file permissions; it doesn't run the file.

Build assets run local commands that are defined in your config file, not remote code.

### Audit via Lock File

The lock file records exactly what was fetched and from where. Review it to audit your dependencies.

---

## Comparison with Other Tools

| Tool | Purpose | DeadMan Overlap |
|------|---------|-----------------|
| npm/pip/cargo | Package management | None — different domain |
| mise/asdf | Tool version management | Minimal — DeadMan doesn't manage versions of interpreters |
| curl/wget | File download | DeadMan wraps this with verification and manifest |
| git-lfs | Large files in git | Alternative approach — DeadMan fetches externally |
| DVC | ML model versioning | Overlaps for models, but DeadMan is simpler and broader |
| Bazel/Buck | Build systems | DeadMan is fetch-only, not a build system |

DeadMan intentionally has a narrow scope: fetch declared assets, verify them, done. It complements other tools rather than replacing them.

---

## Implementation Notes

### Runtime

DeadMan is implemented in TypeScript and compiled to a standalone binary using a bundler. It can also run via Node.js for npm package distribution.

### Dependencies

Minimal external dependencies:
- YAML parser
- Archive extraction (tar, unzip)
- HTTP client (built-in node:https or fetch)
- Crypto (built-in node:crypto for sha256)

No framework dependencies. No runtime dependencies for standalone binary.

### File Size

Target: < 5 MB for standalone binary.

### Performance

- Parallel downloads (configurable)
- Skip already-valid assets (checksum match)
- Stream downloads (don't buffer in memory)
- Incremental lock file updates

---

## Roadmap

### v1.0 (Initial Release)
- Core fetch/verify/list/clean commands
- Platform and environment filtering
- Archive extraction
- Lock file generation
- npm package distribution

### v1.1
- Standalone binary distribution
- URL templates with variables
- `deadman init` command
- `deadman hash` utility

### v1.2
- Mirror/fallback URLs
- Progress bars for large downloads
- Resume interrupted downloads
- Proxy support

### Future Considerations
- Signed checksums (GPG verification)
- Private repository authentication
- Asset groups/tags
- Watch mode (re-fetch on config change)
- Plugin system for custom sources

---

## Example: Complete Project Config

```yaml
version: 1

defaults:
  dest_dir: "vendor"

variables:
  whisper_version: "1.7.2"
  ffmpeg_version: "7.1"

assets:
  # Platform-specific binary
  whisper-cpp:
    description: "Whisper.cpp speech recognition"
    executable: true
    platforms:
      darwin-arm64:
        url: "https://github.com/ggerganov/whisper.cpp/releases/download/v${whisper_version}/whisper-v${whisper_version}-darwin-arm64"
        sha256: "a1b2c3d4e5f6..."
        dest: "vendor/whisper-cpp"
      darwin-x64:
        url: "https://github.com/ggerganov/whisper.cpp/releases/download/v${whisper_version}/whisper-v${whisper_version}-darwin-x64"
        sha256: "b2c3d4e5f6a1..."
        dest: "vendor/whisper-cpp"
      win32-x64:
        url: "https://github.com/ggerganov/whisper.cpp/releases/download/v${whisper_version}/whisper-v${whisper_version}-win64.exe"
        sha256: "c3d4e5f6a1b2..."
        dest: "vendor/whisper-cpp.exe"
      linux-x64:
        url: "https://github.com/ggerganov/whisper.cpp/releases/download/v${whisper_version}/whisper-v${whisper_version}-linux-x64"
        sha256: "d4e5f6a1b2c3..."
        dest: "vendor/whisper-cpp"

  # Archive extraction
  ffmpeg:
    description: "FFmpeg audio converter"
    executable: true
    platforms:
      darwin-arm64:
        url: "https://evermeet.cx/ffmpeg/ffmpeg-${ffmpeg_version}-arm64.zip"
        sha256: "e5f6a1b2c3d4..."
        extract: "ffmpeg"
        dest: "vendor/ffmpeg"
      win32-x64:
        url: "https://www.gyan.dev/ffmpeg/builds/ffmpeg-${ffmpeg_version}-essentials.zip"
        sha256: "f6a1b2c3d4e5..."
        extract: "ffmpeg-${ffmpeg_version}-essentials/bin/ffmpeg.exe"
        dest: "vendor/ffmpeg.exe"
      linux-x64:
        url: "https://johnvansickle.com/ffmpeg/releases/ffmpeg-${ffmpeg_version}-amd64-static.tar.xz"
        sha256: "a1b2c3d4e5f6..."
        extract: "ffmpeg-${ffmpeg_version}-amd64-static/ffmpeg"
        dest: "vendor/ffmpeg"

  # Build-based asset
  presidio-cli:
    description: "Presidio PII detection (built locally)"
    executable: true
    dest: "vendor/presidio-cli"
    build:
      command: "./scripts/build-presidio.sh"
      platforms:
        win32-x64:
          command: "powershell -File scripts/build-presidio.ps1"
      check: "vendor/presidio-cli"
      sha256: false

  # Environment-specific models
  model-tiny:
    description: "Whisper tiny.en (development)"
    environments: [dev]
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin"
    sha256: "1a2b3c4d5e6f..."
    dest: "models/ggml-tiny.en.bin"

  model-medium:
    description: "Whisper medium.en (production Windows)"
    environments: [prod]
    platforms: [win32-x64]
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.en.bin"
    sha256: "2b3c4d5e6f1a..."
    dest: "models/ggml-medium.en.bin"

  model-large:
    description: "Whisper large-v3-turbo (production Mac/Linux)"
    environments: [prod]
    platforms: [darwin-arm64, darwin-x64, linux-x64]
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin"
    sha256: "3c4d5e6f1a2b..."
    dest: "models/ggml-large-v3-turbo.bin"
```

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-04 | Brian Lacy | Initial specification |
