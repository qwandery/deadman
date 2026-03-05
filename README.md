# DeadMan

Dead-ass simple tool & asset management — fetch and manage CLIs and binary assets that don't fit into traditional package managers.

## What It Does

DeadMan handles prebuilt binaries, ML models, and other artifacts that vary by platform and environment. One config file, one command:

```bash
deadman fetch
```

## Installation

```bash
npm install -g deadman
```

Or as a dev dependency:

```bash
npm install --save-dev deadman
```

Or via npx:

```bash
npx deadman fetch
```

## Quick Start

1. Create `deadman.yaml` in your project root:

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
    dest: "vendor/ffmpeg"
    executable: true
```

2. Fetch assets:

```bash
deadman fetch
```

3. Done. The binary is at `vendor/ffmpeg`.

## Commands

| Command | Description |
|---------|-------------|
| `deadman fetch` | Fetch assets for current platform/environment |
| `deadman verify` | Check all assets are present and valid |
| `deadman list` | Show defined assets and their status |
| `deadman clean` | Remove fetched assets |
| `deadman init` | Create a starter config file |
| `deadman hash <file>` | Compute SHA256 hash of a file |

## Common Options

| Option | Description |
|--------|-------------|
| `--env <env>` | Environment (default: `dev`) |
| `--platform <platform>` | Override platform detection |
| `--config <path>` | Config file path |
| `--force` | Re-fetch even if valid |
| `--dry-run` | Show what would happen |
| `--quiet` | Minimal output |
| `--verbose` | Detailed output |

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DEADMAN_ENV` | Default environment |
| `DEADMAN_CONFIG` | Default config path |
| `DEADMAN_CACHE_DIR` | Custom cache directory |
| `DEADMAN_PARALLEL` | Default parallel downloads |
| `DEADMAN_QUIET` | Set to `1` for quiet mode |
| `DEADMAN_VERBOSE` | Set to `1` for verbose mode |

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Lint
npm run lint

# Run CLI locally
node dist/bin/deadman.js fetch
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Verification failed |
| 2 | Configuration error |
| 3 | Network error |
| 4 | File system error |
| 5 | Build command failed |
| 6 | Checksum mismatch |

## License

MIT
