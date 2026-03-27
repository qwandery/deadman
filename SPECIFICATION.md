# DeadMan — Dead-Ass Simple Tool & Asset Management

**Version:** 2.0
**Date:** March 27, 2026
**Author:** Brian Lacy (Qwandery Inc.)
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
version: 2                    # Config format version (required, 1 or 2)

defaults:                     # Optional defaults for all assets
  base_url: "https://..."     # Prepended to relative URLs
  dest_dir: "vendor"          # Default destination directory

assets:                       # Asset definitions (required)
  asset-name:
    ...
```

Config version 1 remains fully supported. Version 2 enables version management features (version constraints, outdated/upgrade/rollback commands). All v1 configs work unchanged.

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
- `${version}` — From variables section, or resolved from version constraint (v2)
- Any custom variable defined in `variables`

### Version Constraints (Config v2)

Config version 2 adds first-class version management. Each asset can declare a `version` field that tells DeadMan how to discover and resolve versions.

**Exact version pin** (string shorthand):

```yaml
version: 2
assets:
  ffmpeg:
    version: "7.1.0"
    url: "https://example.com/ffmpeg-${version}-arm64.zip"
    sha256: "abc123..."
    dest: "vendor/ffmpeg"
```

The `${version}` template variable is automatically populated from the resolved version.

**Semver range with GitHub source:**

```yaml
version: 2
assets:
  ffmpeg:
    version:
      range: "^7.0"
      source:
        github: "BtbN/FFmpeg-Builds"
    platforms:
      darwin-arm64:
        url: "https://github.com/BtbN/FFmpeg-Builds/releases/download/v${version}/ffmpeg-${version}-macOS-arm64.zip"
        sha256: "..."
        dest: "vendor/ffmpeg"
```

**Version constraint fields:**

| Field | Type | Description |
|-------|------|-------------|
| `range` | string | Semver range (`^1.0.0`, `~2.5`, `>=1.0 <2.0`), exact pin (`1.2.3`), or `"latest"` |
| `source.github` | string | GitHub repository (`owner/repo`) — discovers versions from GitHub Releases |
| `source.manifest` | string | URL to a JSON version manifest |
| `source.pattern` | string | URL template with `${version}` for HEAD-request probing |

**Supported semver range syntax:**
- `^1.0.0` — Compatible with 1.x.x (>=1.0.0, <2.0.0)
- `~1.5.0` — Approximately 1.5.x (>=1.5.0, <1.6.0)
- `>=2.0.0` — Greater than or equal to 2.0.0
- `>=1.0.0 <3.0.0` — Range between versions
- `1.2.3` — Exact pin
- `latest` — Most recent stable (non-prerelease) version

**Version manifest format** (for `source.manifest`):

```json
{
  "versions": {
    "7.1.0": {
      "platforms": {
        "darwin-arm64": { "url": "https://...", "sha256": "..." },
        "win32-x64": { "url": "https://...", "sha256": "..." }
      }
    }
  }
}
```

---

## Manifest: deadman.lock

After fetching, DeadMan writes a lock file recording the current state.

**Lockfile v1** (config version 1):

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
```

**Lockfile v2** (config version 2, with version metadata):

```yaml
lockfile_version: 2
generated_at: "2026-03-27T15:30:00Z"
platform: darwin-arm64
environment: dev
config_hash: "sha256:abc123..."

assets:
  ffmpeg:
    status: present
    path: "vendor/ffmpeg"
    sha256: "def456..."
    fetched_at: "2026-03-27T15:30:00Z"
    source: "https://github.com/BtbN/FFmpeg-Builds/releases/download/v7.1.0/..."
    version: "7.1.0"
    version_constraint: "^7.0"
    previous_versions:
      - version: "7.0.2"
        sha256: "789abc..."
        fetched_at: "2026-03-20T15:30:00Z"
```

The `previous_versions` array (bounded to 3 entries) enables rollback. When an asset is upgraded, the current entry is preserved in history. V1 lockfiles are auto-upgraded to v2 on the next write.

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

When version metadata is present in the lockfile (config v2), a VERSION column is shown:

```
ASSET          VERSION   PLATFORM      ENV   STATUS    SIZE      PATH
ffmpeg         7.1.0     darwin-arm64  all   present   85.2 MB   vendor/ffmpeg
whisper-cpp    1.7.2     darwin-arm64  all   present   4.2 MB    vendor/whisper-cpp
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

### deadman outdated

Check for available asset version updates (config v2).

```
deadman outdated [options]

Options:
  --env <environment>   Environment to check (default: dev)
  --platform <platform> Platform to check
  --config <path>       Config file path
  --json                Output as JSON
```

**Example Output:**

```
ASSET          CURRENT   LATEST    CONSTRAINT
ffmpeg         7.0.2     7.1.0     ^7.0
whisper-cpp    1.5.4     1.7.2     ^1.5
presidio       2.2.0     2.2.0     ^2.0        (up to date)
```

Only assets with a version source (e.g., `source.github`) are checked. Assets with exact pins or no version field are skipped.

### deadman upgrade

Upgrade versioned assets to their latest matching versions (config v2).

```
deadman upgrade [options] [asset-names...]

Arguments:
  asset-names           Specific assets to upgrade (default: all)

Options:
  --env <environment>   Environment (default: dev)
  --platform <platform> Platform
  --config <path>       Config file path
  --dry-run             Preview without changing anything
  --major               Allow major version bumps
```

**Examples:**

```bash
# Upgrade all versioned assets
deadman upgrade

# Upgrade specific asset
deadman upgrade ffmpeg

# Preview upgrades
deadman upgrade --dry-run

# Allow major version bumps
deadman upgrade --major
```

By default, major version bumps are blocked. Use `--major` to allow them.

### deadman rollback

Roll back an asset to a previous version (config v2).

```
deadman rollback <asset-name> [options]

Arguments:
  asset-name            Asset to roll back (required)

Options:
  --to <version>        Target version (default: most recent previous)
  --config <path>       Config file path
```

**Examples:**

```bash
# Roll back to previous version
deadman rollback ffmpeg

# Roll back to a specific version
deadman rollback ffmpeg --to 7.0.2
```

Rollback history is stored in the lockfile (up to 3 previous versions).

### deadman audit

Audit versioned assets for age and update status (config v2).

```
deadman audit [options]

Options:
  --env <environment>         Environment (default: dev)
  --platform <platform>       Platform
  --config <path>             Config file path
  --json                      Output as JSON
  --warn-threshold <n>        Versions behind to warn (default: 5)
  --critical-threshold <n>    Versions behind for critical (default: 10)
```

**Example Output:**

```
ASSET          CURRENT   LATEST    BEHIND  SEVERITY  MESSAGE
ffmpeg         7.0.2     7.1.0     1       info      1 version behind
whisper-cpp    1.2.0     1.7.2     12      critical  12 versions behind — strongly recommend updating
presidio       2.2.0     2.2.0     0       ok        Up to date
```

Exit code 1 if any critical issues are found.

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
| 7 | Version resolution failed |
| 8 | Upgrade failed |

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
| GITHUB_TOKEN | GitHub API token for rate limit avoidance (version sources) |
| DEADMAN_VERSION_CACHE_TTL | Cache TTL in seconds for version queries (default: 3600) |

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

### Version Source Integrity (Config v2)

When using version constraints with external sources:

- **HTTPS only** — All version source API calls use HTTPS (GitHub API, manifest URLs).
- **Checksum manifest auto-detection** — When fetching from GitHub Releases, DeadMan automatically looks for `SHA256SUMS` or `checksums.txt` release assets and can cross-reference downloaded file hashes.
- **Version age warnings** — `deadman audit` flags assets that are many versions behind, helping identify potentially vulnerable dependencies.
- **Rate limit protection** — Set `GITHUB_TOKEN` to avoid GitHub API rate limits. Version query results are cached (default: 1 hour, configurable via `DEADMAN_VERSION_CACHE_TTL`).
- **Signature verification** (planned) — Future support for GPG/Minisign signature verification of downloaded assets.

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
- YAML parser (yaml)
- Archive extraction (tar, adm-zip)
- Semver resolution (semver)
- CLI framework (commander)
- HTTP client (built-in fetch)
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

### v1.0 (Initial Release) — Complete
- Core fetch/verify/list/clean commands
- Platform and environment filtering
- Archive extraction
- Lock file generation
- npm package distribution

### v1.1 — Complete
- URL templates with variables
- `deadman init` command
- `deadman hash` utility

### v2.0 — Version Management — Complete
- Config format v2 with version constraints (semver ranges, exact pins, "latest")
- Version source providers: GitHub Releases, static manifests, URL pattern probing
- `deadman outdated` — check for available updates
- `deadman upgrade` — upgrade assets to latest matching versions
- `deadman rollback` — revert to previous versions
- `deadman audit` — audit assets for age and update status
- Lockfile v2 with version metadata and rollback history
- Version query caching with configurable TTL
- Automatic checksum manifest detection from GitHub release assets

### v2.1
- Signature verification (GPG/Minisign)
- Mirror/fallback URLs
- Progress bars for large downloads
- Resume interrupted downloads
- Proxy support

### Future Considerations
- Private repository authentication
- Asset groups/tags
- Watch mode (re-fetch on config change)
- Plugin system for custom sources
- Standalone binary distribution

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

## Example: Version-Managed Config (v2)

```yaml
version: 2

defaults:
  dest_dir: "vendor"

assets:
  # Version-managed binary from GitHub Releases
  whisper-cpp:
    description: "Whisper.cpp speech recognition"
    executable: true
    version:
      range: "^1.5"
      source:
        github: "ggerganov/whisper.cpp"
    platforms:
      darwin-arm64:
        url: "https://github.com/ggerganov/whisper.cpp/releases/download/v${version}/whisper-v${version}-darwin-arm64"
        sha256: "a1b2c3d4e5f6..."
        dest: "vendor/whisper-cpp"
      win32-x64:
        url: "https://github.com/ggerganov/whisper.cpp/releases/download/v${version}/whisper-v${version}-win64.exe"
        sha256: "c3d4e5f6a1b2..."
        dest: "vendor/whisper-cpp.exe"

  # Version-managed with exact pin
  ffmpeg:
    description: "FFmpeg audio converter"
    version: "7.1.0"
    executable: true
    platforms:
      darwin-arm64:
        url: "https://evermeet.cx/ffmpeg/ffmpeg-${version}-arm64.zip"
        sha256: "e5f6a1b2c3d4..."
        extract: "ffmpeg"
        dest: "vendor/ffmpeg"
      win32-x64:
        url: "https://www.gyan.dev/ffmpeg/builds/ffmpeg-${version}-essentials.zip"
        sha256: "f6a1b2c3d4e5..."
        extract: "ffmpeg-${version}-essentials/bin/ffmpeg.exe"
        dest: "vendor/ffmpeg.exe"

  # Build-based asset (no version management)
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

  # Environment-specific models (no version management)
  model-tiny:
    description: "Whisper tiny.en (development)"
    environments: [dev]
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin"
    sha256: "1a2b3c4d5e6f..."
    dest: "models/ggml-tiny.en.bin"
```

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-04 | Brian Lacy | Initial specification |
| 2.0 | 2026-03-27 | Brian Lacy | Version management system: config v2, lockfile v2, version constraints, outdated/upgrade/rollback/audit commands, GitHub/manifest/pattern providers |
