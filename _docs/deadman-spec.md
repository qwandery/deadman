# DeadMan Specification
**Version:** 0.6 (draft)
**Status:** In design

---

## Overview

DeadMan is a dead-simple, hardware-aware artifact manager for applications that depend on binaries, model weights, and other downloadable assets that live outside of package managers.

Its primary design target is multi-stage AI pipelines — local LLMs, transcription engines, inference runtimes, model weights — but it is not bespoke to that use case. Any application that needs to download and resolve the right files for the right environment can use it.

DeadMan's design philosophy:

- **Dead simple.** The manifest should be readable and writable without documentation in hand.
- **No assumptions.** DeadMan does not know what a "model" is, what "CUDA" means, or what counts as enough RAM. All environment knowledge comes from an external probe, and all selection logic lives in the manifest.
- **Perfect fit, not bespoke.** The vocabulary is general enough to cover any use case, but tuned so that AI pipeline manifests feel natural and first-class — not like they're fighting the tool.
- **Artifacts all the way down.** There is no structural distinction between a runtime binary and a model weight file. Both are artifacts. Dependencies between them are expressed explicitly.

---

## Core Concepts

### Artifact

An artifact is any file (or archive, or directory) that DeadMan can download, verify, and cache. It can be an executable binary, a model weight file, a vocabulary file, a plugin, a texture pack — anything.

Artifacts can depend on other artifacts. DeadMan resolves the full dependency graph before downloading anything.

### Platform

A named profile describing a hardware/OS environment. Platforms are declared in a top-level `platforms` section and referenced by name throughout the manifest. They are composable — a platform can extend another.

Platform definitions describe the environment; they do not contain download logic. DeadMan matches the current system against platform definitions using values supplied by the probe.

### Probe

A script or executable that inspects the current system and emits a flat key/value context document (YAML or JSON). DeadMan evaluates `when` expressions and `requires` constraints against this context.

DeadMan ships with a default probe covering common cases (OS, architecture, RAM, GPU detection). The probe is fully replaceable. The context schema is entirely defined by the manifest author — DeadMan treats all context keys as opaque.

### Source

A downloadable location for an artifact on a specific platform. An artifact can have multiple sources; DeadMan selects the one whose `platform` matches the current environment.

### Group

A named resolution slot. A group picks one artifact (or the best-scoring artifact) from a set of candidates based on `when` filters and optional `score` expressions. Groups are how the calling application asks DeadMan to resolve "the best model for this machine" without hardcoding specific artifact names.

---

## Manifest Structure

```yaml
deadman: "0.3"

platforms:
  # Named platform profiles (see Platforms section)

probe:
  # Optional: path to custom probe script

artifacts:
  # All downloadable things (see Artifacts section)

groups:
  # Named resolution slots (see Groups section)
```

---

## Platforms

Platforms are named profiles that describe a target environment. They are evaluated against the probe context at resolution time.

```yaml
platforms:
  win-x64:
    os: windows
    arch: x86-64

  win-x64-cuda:
    extends: win-x64
    gpu: nvidia-cuda

  win-x64-vulkan:
    extends: win-x64
    gpu: [nvidia, amd, intel]

  mac-arm64:
    os: macos
    arch: arm64

  mac-arm64-mlx:
    extends: mac-arm64
    gpu: apple-metal

  linux-x64:
    os: linux
    arch: x86-64

  linux-x64-cuda:
    extends: linux-x64
    gpu: nvidia-cuda
```

**`extends`** — inherits all fields from the named platform. Fields declared on the child override the parent.

**Array values** — `gpu: [nvidia, amd, intel]` means "any of these." The probe context must supply a value that matches one of the listed values for the platform to match.

Platform field names (`os`, `arch`, `gpu`, etc.) are not reserved by DeadMan. They are matched against probe context keys by name. If the probe emits `gpu: nvidia-cuda`, then `gpu: nvidia-cuda` in a platform definition matches.

**Tie-breaking:** When multiple sources within an artifact match the current platform, the first matching source in declaration order wins. Manifest authors should order sources from most specific to least specific.

---

## Artifacts

```yaml
artifacts:
  ffmpeg:
    category: utility
    source:
      mac:
        platform: [mac-arm64, mac-arm64-mlx]
        url: https://...
        checksum: sha256:abc123
      win:
        platform: [win-x64, win-x64-cuda, win-x64-vulkan]
        url: https://...
        checksum: sha256:def456
      linux:
        platform: linux-x64
        url: https://...
        checksum: sha256:ghi789

  whisper.cpp:
    category: transcription
    deps: [ffmpeg]
    source:
      win-cuda:
        platform: win-x64-cuda
        url: https://...
        checksum: sha256:...
      win-cpu:
        platform: win-x64
        url: https://...
        checksum: sha256:...
      mac:
        platform: [mac-arm64, mac-arm64-mlx]
        url: https://...
        checksum: sha256:...

  whisper-large-v3-turbo:
    title: "Whisper Large v3 Turbo"
    description: "Best accuracy, slower processing"
    version: "1.0.0"
    category: transcription
    deps: [whisper.cpp]
    capabilities: [transcription.generate]
    requires:
      ram_mb: 4000
    recommends:
      ram_mb: 8000
    when: "ram_mb >= 4000"
    score: "1"
    source:
      default:
        platform: [win-x64, win-x64-cuda, mac-arm64, mac-arm64-mlx, linux-x64]
        url: https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin
        checksum: sha256:...

  whisper-tiny:
    title: "Whisper Tiny"
    description: "Fastest processing, lower accuracy"
    version: "1.0.0"
    category: transcription
    deps: [whisper.cpp]
    capabilities: [transcription.generate]
    requires:
      ram_mb: 500
    when: "ram_mb >= 500"
    score: "0"
    source:
      default:
        platform: [win-x64, win-x64-cuda, mac-arm64, mac-arm64-mlx, linux-x64]
        url: https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin
        checksum: sha256:...

  llama.cpp:
    category: llm-runtime
    source:
      win-cuda:
        platform: win-x64-cuda
        url: https://...
        checksum: sha256:...
      win-cpu:
        platform: win-x64
        url: https://...
        checksum: sha256:...
      mac:
        platform: [mac-arm64, mac-arm64-mlx]
        url: https://...
        checksum: sha256:...

  qwen-7b-q4:
    title: "Qwen 2.5 7B Q4"
    description: "Balanced local assistant, recommended for most hardware"
    version: "1.0.0"
    category: assistant
    deps: [llama.cpp]
    capabilities:
      - llm.note_generation
      - llm.transcript_summary
      - llm.qa
    requires:
      ram_mb: 6000
    recommends:
      ram_mb: 10000
    when: "ram_mb >= 6000"
    score: "ram_mb - 6000"
    source:
      default:
        platform: [win-x64, win-x64-cuda, mac-arm64, mac-arm64-mlx]
        url: https://huggingface.co/...
        checksum: sha256:...

  qwen-14b-q4:
    title: "Qwen 2.5 14B Q4"
    description: "Higher capability, requires more RAM"
    version: "1.0.0"
    category: assistant
    deps: [llama.cpp]
    capabilities:
      - llm.note_generation
      - llm.transcript_summary
      - llm.qa
    requires:
      ram_mb: 12000
    recommends:
      ram_mb: 18000
    when: "ram_mb >= 12000"
    score: "ram_mb - 12000"
    source:
      default:
        platform: [win-x64, win-x64-cuda, mac-arm64, mac-arm64-mlx]
        url: https://huggingface.co/...
        checksum: sha256:...
```

### Artifact Fields

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Recommended | Human-readable display name. |
| `description` | No | Short description of the artifact's purpose or characteristics. |
| `version` | No | Version string for this artifact. Multiple versions of the same artifact can coexist in the manifest using the `id@version` key convention (e.g., `whisper.cpp@1.8.3`, `whisper.cpp@2.0.0`). When requesting a specific artifact by ID, version can be pinned with `@version` syntax. Otherwise, the first declared entry for a given base ID is assumed to be latest and is the default. |
| `category` | No | App-defined label. DeadMan treats as opaque. Conventional values: `utility`, `transcription`, `sanitizer`, `assistant`, `llm-runtime`, etc. |
| `deps` | No | List of artifact IDs that must also be resolved when this artifact is selected. Supports version pinning: `[whisper.cpp]` resolves to latest; `[whisper.cpp@1.8.3]` pins to a specific version. DeadMan resolves the full dep graph. |
| `capabilities` | No | App-defined list of capability strings, opaque to DeadMan. Used by groups and app queries to filter candidates. |
| `requires` | No | Key/value system resource constraints. Evaluated against probe context. If any constraint is not met, the artifact is ineligible. Hard gate — resolution fails for this artifact if requirements are unmet. |
| `recommends` | No | Key/value system resource hints. Same structure as `requires`. If not met, the artifact remains eligible but may be ranked lower or flagged to the calling application. Soft signal — not a gate. |
| `when` | No | Expression evaluated against probe context. If false, artifact is ineligible. More expressive than `requires` for complex conditions. |
| `score` | No | Expression evaluated against probe context. Higher score = preferred when multiple candidates are eligible. If absent, manifest declaration order determines priority. |
| `source` | Yes* | Named sub-entries, each declaring a platform and a download location. |
| `virtual` | No | If `true`, artifact has no source. Used for cloud/API entries or app-provided capabilities that satisfy the same capability contracts as downloadable artifacts. |
| `metadata` | No | Open key/value. Available to `when` and `score` expressions as `metadata.*`. Also passed to the calling application on resolution. |

*Required unless `virtual: true`.

### Source Fields

| Field | Required | Description |
|-------|----------|-------------|
| `platform` | Yes | Platform ID or array of platform IDs this source applies to. |
| `url` | Yes* | Direct download URL. |
| `checksum` | Recommended | `sha256:hex` or `trusted: true` to bypass verification (discouraged). |
| `script` | Yes* | Shell script to run instead of URL download. Escape hatch for cases where a direct URL is unavailable. |
| `archive_path` | No | Path within a zip/tar archive to extract. If absent, the whole archive is downloaded as-is. |

*One of `url` or `script` is required.

### `deps` vs `requires`

These are distinct:

- **`deps`**: artifact-level dependencies — other artifacts that must be present. DeadMan resolves and downloads them. Supports version pinning: `deps: [whisper.cpp]` resolves to latest; `deps: [whisper.cpp@1.8.3]` pins to a specific version.
- **`requires`**: system resource constraints — evaluated against probe context to determine eligibility. DeadMan does not provision these; it only checks them.

---

## Groups

Groups are named resolution slots. The calling application resolves a group to get the winning artifact (and its deps).

```yaml
groups:
  transcription-model:
    pick: best
    capabilities: [transcription.generate]

  note-generation-model:
    pick: best
    capabilities: [llm.note_generation]

  phi-scrubber:
    pick: best
    capabilities: [text.deidentify]
```

### Group Fields

| Field | Description |
|-------|-------------|
| `pick` | Resolution strategy. `best` = highest scoring eligible artifact. `one` = first eligible in manifest order. `all` = every eligible artifact. |
| `capabilities` | Filter: only consider artifacts that declare all listed capabilities. |
| `category` | Filter: only consider artifacts with this category. |
| `from` | Explicit list of artifact IDs to consider. If absent, all artifacts are candidates (filtered by `capabilities`/`category`). |

### Resolution Process

For a given group, DeadMan:

1. Collects candidate artifacts (filtered by `from`, `capabilities`, `category` as applicable)
2. Evaluates `when` and `requires` for each candidate against probe context — ineligible candidates are dropped
3. Selects the source within each remaining candidate whose `platform` matches the current environment — candidates with no matching source are dropped
4. Ranks remaining eligible candidates by the following preference order:
   - **Pinned version** — if a specific `@version` was requested, exact match ranks first
   - **Latest** — first declared entry for a base artifact ID
   - **Meets `recommends`** — artifacts whose `recommends` constraints are satisfied rank above those that don't
   - **Declaration order** — final tiebreaker
5. Applies `pick` strategy (`best` = highest ranked, `one` = first eligible, `all` = every eligible)
6. For the selected artifact(s), recursively resolves `deps`
7. Returns the full resolution plan (selected artifact + all transitive deps, each with their selected source URL)

---

## Probe

The probe is responsible for emitting a context document that DeadMan uses for all expression evaluation.

```yaml
probe:
  script: ./scripts/probe.sh   # stdout must be YAML or JSON
```

If `probe` is omitted, DeadMan uses its built-in default probe.

The built-in probe emits at minimum:

```yaml
os: windows | macos | linux
arch: x86-64 | arm64
ram_mb: <integer>
# GPU detection varies by platform
```

The probe output schema is entirely under the manifest author's control. DeadMan makes no assumptions about what keys exist or what they mean.

**Alternatives to script probing:**

- Hand-write a context file and point DeadMan at it (useful for CI, cross-compilation, reproducible testing)
- Inject context via environment variables or CLI flags (useful for overriding specific values)

---

## Expression Language

`when` and `score` expressions are evaluated against the flat probe context (plus `metadata.*` for the artifact's own metadata fields).

The expression language is a minimal, sandboxed subset:

- Comparison operators: `==`, `!=`, `<`, `<=`, `>`, `>=`
- Boolean operators: `and`, `or`, `not`
- Membership: `in` (e.g., `"cuda" in gpu_apis`)
- Arithmetic: `+`, `-`, `*`, `/` (for score expressions)
- Literals: strings (single-quoted), integers, floats, booleans
- Context references: bare key names (e.g., `ram_mb`, `os`)
- Metadata references: `metadata.key_name`

The expression language is intentionally constrained. It is not a scripting language. Complex selection logic belongs in the probe or in the calling application.

---

## Lock File

After resolution, DeadMan writes a lock file recording exactly what was resolved:

```yaml
resolved:
  whisper-large-v3-turbo:
    url: https://huggingface.co/...
    checksum: sha256:abc123
    platform: mac-arm64-mlx
    path: .deadman/cache/whisper-large-v3-turbo/ggml-large-v3-turbo.bin

  whisper.cpp:
    url: https://github.com/...
    checksum: sha256:def456
    platform: mac-arm64-mlx
    path: .deadman/cache/whisper.cpp/whisper-cpp
```

The lock file pins the resolved URLs and checksums. On subsequent runs, DeadMan can verify the cache against the lock file without re-resolving.

---

## Cloud / Virtual Artifacts

Some artifacts have no binary to download — they are API endpoints or app-provided capabilities that satisfy the same capability contracts as downloadable artifacts.

```yaml
artifacts:
  claude-cloud:
    category: assistant
    virtual: true
    capabilities:
      - llm.note_generation
      - llm.transcript_summary
      - llm.qa
    metadata:
      requires_network: true
      api_key_setting: anthropic_api_key
```

A virtual artifact participates in group resolution normally (it can win a `note-generation-model` group). Its `metadata` is available to the calling application. DeadMan does not attempt to download it.

---

## CLI

```
deadman resolve              # resolve all groups, download artifacts, write lock file
deadman get <id>             # download a specific artifact (latest version)
deadman get <id>@<version>   # download a specific artifact at a pinned version
deadman update               # re-resolve and re-download; refreshes lock file
deadman status               # show what is resolved, cached, and current
```

DeadMan downloads artifacts and manages the cache. Invocation of artifacts is entirely the calling application's responsibility.

## Implementation

**Current:** Node.js CLI using [commander](https://github.com/tj/commander.js). Fits naturally into the Tauri/TypeScript Cairn monorepo and allows the manifest to be consumed directly from TypeScript without a subprocess boundary.

**Roadmap:** Port to Rust. A Rust implementation would be self-contained, have no Node.js runtime dependency, and align with Tauri's native ecosystem. The manifest format and CLI interface defined in this spec should be treated as stable across both implementations.

---

## Design Decisions Log

| Decision | Resolution |
|----------|------------|
| Platform tie-breaking | Declaration order — first matching source wins |
| Capabilities vocabulary | App-defined, opaque to DeadMan, used as filters |
| `requires` vs `recommends` | `requires` is a hard gate; `recommends` is a ranking tier |
| Ranking order | Pinned version → latest → meets recommends → declaration order |
| Invocation metadata | Out of scope — DeadMan downloads, app invokes |
| Multi-file / directory artifacts | Use `script` source; `url` is single-file only |
| Update policy | Explicit `deadman update` only; never automatic |
| Version coexistence | `id@version` key convention; bare `id` = latest (first declared) |
| Implementation | Node.js / commander (current); Rust port planned |
