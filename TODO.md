# DeadMan — TODO

## Phase 1: Project Setup & Infrastructure

- [✅] Task 1.1: Initialize TypeScript project with package.json, tsconfig.json, ESLint, and Vitest
- [✅] Task 1.2: Set up project directory structure (src/, tests/, bin/)
- [✅] Task 1.3: Create build pipeline (TypeScript compilation, bundling for CLI)
- [✅] Task 1.4: Set up README.md with initial project information

## Phase 2: Core Configuration System

- [✅] Task 2.1: Implement YAML config parser and validator (deadman.yaml schema)
- [✅] Task 2.2: Implement config file discovery (deadman.yaml, deadman.yml, .deadman.yaml, .deadman.yml)
- [✅] Task 2.3: Implement platform detection (os + arch mapping to platform identifiers)
- [✅] Task 2.4: Implement environment handling (--env flag, DEADMAN_ENV, default: dev)
- [✅] Task 2.5: Implement URL template variable expansion (${platform}, ${os}, ${arch}, custom variables)
- [✅] Task 2.6: Implement defaults merging (base_url, dest_dir)
- [✅] Task 2.7: Write unit tests for configuration system

## Phase 3: Asset Resolution & Filtering

- [✅] Task 3.1: Implement asset resolution — resolve platform-specific sources, apply environment filters
- [✅] Task 3.2: Implement asset filtering by name (CLI positional args for specific assets)
- [✅] Task 3.3: Write unit tests for asset resolution and filtering

## Phase 4: Download & Verification Engine

- [✅] Task 4.1: Implement HTTP(S) download with streaming to disk
- [✅] Task 4.2: Implement SHA256 checksum verification (post-download, pre-write)
- [✅] Task 4.3: Implement archive extraction (zip, tar, tar.gz, tar.bz2, tar.xz)
- [✅] Task 4.4: Implement file placement (dest, rename, executable chmod)
- [✅] Task 4.5: Implement parallel downloads (configurable concurrency, default: 3)
- [✅] Task 4.6: Implement skip-if-valid logic (checksum match skips re-download)
- [✅] Task 4.7: Write unit tests for download and verification engine

## Phase 5: Build-Based Assets

- [✅] Task 5.1: Implement build command execution with platform-specific overrides
- [✅] Task 5.2: Implement build check (verify output path exists after build)
- [✅] Task 5.3: Write unit tests for build-based assets

## Phase 6: Lock File (deadman.lock)

- [✅] Task 6.1: Implement lock file generation after fetch (YAML format per spec)
- [✅] Task 6.2: Implement lock file reading for verification and caching
- [✅] Task 6.3: Write unit tests for lock file system

## Phase 7: CLI Commands

- [✅] Task 7.1: Set up CLI framework with Commander.js (bin entry point, global options)
- [✅] Task 7.2: Implement `deadman fetch` command (all options per spec)
- [✅] Task 7.3: Implement `deadman verify` command (check assets against lock file)
- [✅] Task 7.4: Implement `deadman list` command (table + JSON output)
- [✅] Task 7.5: Implement `deadman clean` command (remove fetched assets)
- [✅] Task 7.6: Implement `deadman init` command (generate starter config)
- [✅] Task 7.7: Implement `deadman hash` command (sha256 utility)
- [✅] Task 7.8: Implement environment variable support (DEADMAN_ENV, DEADMAN_CONFIG, etc.)
- [✅] Task 7.9: Implement exit codes per spec (0-6)
- [✅] Task 7.10: Write unit and integration tests for all CLI commands

## Phase 8: HTTPS Security & Error Handling

- [✅] Task 8.1: Implement HTTPS-only enforcement with --allow-insecure escape hatch
- [✅] Task 8.2: Implement comprehensive error handling and user-friendly error messages
- [✅] Task 8.3: Write tests for security and error handling

## Phase 9: End-to-End Testing & Polish

- [✅] Task 9.1: Write end-to-end tests simulating real workflows (fetch, verify, clean cycle)
- [✅] Task 9.2: Final README.md update with complete usage documentation
- [✅] Task 9.3: Final review and cleanup — remove dead code, verify all spec requirements met

## Phase 10: Critical Review Fixes

- [✅] Task 10.1: Add missing env var support (DEADMAN_CONFIG, DEADMAN_PARALLEL, DEADMAN_QUIET, DEADMAN_VERBOSE)
- [✅] Task 10.2: Implement rename feature in fetch pipeline
- [✅] Task 10.3: Wire --platform option through clean CLI command
- [✅] Task 10.4: Add HTTPS-only enforcement tests
- [✅] Task 10.5: Add comprehensive E2E workflow tests
- [✅] Task 10.6: Add zip extraction using native Node.js (replace external unzip/python3 dependency) NOTE: Replaced with adm-zip package
- [✅] Task 10.7: Verify CLI binary works end-to-end via `node dist/bin/deadman.js`
- [✅] Task 10.8: Implement DEADMAN_CACHE_DIR environment variable for custom cache directory
- [ ] Task 10.9: Add tests for environment variable support and rename feature
