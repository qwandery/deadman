# DeadMan — Ecosystem Context & Tool Selection Guide

**Version:** 1.3  
**Date:** March 6, 2026  
**Purpose:** Help developers determine whether DeadMan addresses a real gap in their workflow, or whether existing tools already serve their needs

---

## Why This Document Exists

Before investing time in any new tool, it's worth asking:

1. **Does this tool need to exist?** Are there already established tools that solve the same problem?
2. **Is it right for my use case?** Even if DeadMan fills a real gap, is it the right tool for what I'm trying to do?

This document maps the landscape of package managers, version managers, binary fetchers, and related tools to help answer both questions honestly.

---

## The Gap DeadMan Aims to Fill

DeadMan is a **project-scoped asset fetcher** for files that don't belong to any package manager:

- Prebuilt native binaries (ffmpeg, whisper.cpp)
- Large model files (GGML, ONNX, safetensors)
- Bundled tools from other ecosystems (PyInstaller bundles, Go binaries)
- Platform-specific variants of the same tool

These assets typically end up managed by shell scripts, READMEs, or tribal knowledge. DeadMan proposes a declarative config file with verification.

Whether this gap is significant enough to warrant a dedicated tool — and whether existing tools already cover it adequately — is what this document explores.

---

## Tool Categories Overview

| Category | Examples | Overlap with DeadMan |
|----------|----------|----------------------|
| [**Binary Fetchers**](#category-1-binary-fetchers) | aqua, eget, stew, dra, bin, Huber | **Significant** — similar problem space |
| [**Language Package Managers**](#category-2-language-package-managers) | npm, pip, cargo, gem | None — different domain |
| [**System Package Managers**](#category-3-system-package-managers) | apt, dnf/yum, pacman | None — different domain |
| [**Platform App Installers**](#category-4-platform-app-installers) | Homebrew, Scoop, Chocolatey, winget | Minimal — different scope |
| [**Version Managers**](#category-5-version-managers) | mise, asdf, nvm, pyenv | None — different purpose |
| [**Build Systems**](#category-6-build-systems) | Make, Bazel, CMake | Minimal — DeadMan is fetch-only |
| [**Container/Environment Tools**](#category-7-container--environment-tools) | Docker, devcontainers, Nix | Tangential — different approach |
| [**Other Related Tools**](#category-8-other-related-tools) | Git LFS, DVC, curl/wget | Various |

### Quick Navigation — Binary Fetchers

Since this is the most relevant category, here are direct links:

- [aqua](#aqua) — Registry-based, 4000+ packages, lazy install, PATH integration
- [stew](#stew) — Interactive TUI, GitHub-focused, Stewfile config
- [eget](#eget) — CLI-only, zero config, ad-hoc fetching
- [dra](#dra) — GitHub release downloader, automatic asset selection
- [bin](#bin) — Multi-source (GitHub, GitLab, Codeberg, Docker, HashiCorp)
- [install-release (ir)](#install-release-ir) — Python-based, GitHub/GitLab, state sync
- [Huber](#huber) — Curated list, multiple versions, lock/unlock
- [Feature Comparison Matrix](#feature-comparison-matrix)

---

## Category 1: Binary Fetchers

**This is the category with the most overlap.** These tools also fetch prebuilt binaries. If you're evaluating DeadMan, start here.

### aqua

[aquaproj.github.io](https://aquaproj.github.io/)

| Aspect | aqua | DeadMan |
|--------|------|---------|
| **Registry** | 4000+ packages in standard registry | None, direct URLs |
| **Source support** | GitHub releases (primary), some HTTP | Any URL |
| **Lazy install** | Yes, installs on first use | No, explicit fetch |
| **PATH integration** | Yes, shims in ~/.local/share/aquaproj-aqua/bin | No, just places files |
| **Config format** | YAML (aqua.yaml) | YAML (deadman.yaml) |
| **Checksums** | Optional (from registry) | Required or explicit trust |
| **Environment filtering** | No | Yes (dev/prod) |
| **Build-based assets** | No | Yes |
| **Large file support** | Not designed for it | Yes |

**Use aqua when:**
- You want CLI tools available in PATH
- The tools are in aqua's registry (most common dev tools are)
- You value lazy installation
- You don't need environment-specific variants

**Use DeadMan when:**
- Your assets aren't in aqua's registry
- You need environment filtering (different assets for dev vs prod)
- You're fetching large files (multi-GB models)
- You need build-based assets (local script execution)
- You want project-local assets without PATH integration

---

### stew

[github.com/marwanhawari/stew](https://github.com/marwanhawari/stew)

| Aspect | stew | DeadMan |
|--------|------|---------|
| **Source support** | GitHub releases (primary) | Any URL |
| **Interface** | Interactive TUI | CLI only |
| **Checksums** | Auto-computed from GitHub | Explicit in config or trusted |
| **Config format** | Stewfile | YAML |
| **Lock file** | Stewfile.lock.json | deadman.lock |
| **Environment filtering** | No | Yes |
| **Build-based assets** | No | Yes |

**Use stew when:**
- You prefer interactive selection
- Your binaries are on GitHub releases
- You want automatic checksum handling
- You want headless install from a lock file

**Use DeadMan when:**
- Your assets aren't on GitHub
- You need environment filtering or build-based assets
- You want declarative, non-interactive operation

---

### eget

[github.com/zyedidia/eget](https://github.com/zyedidia/eget)

| Aspect | eget | DeadMan |
|--------|------|---------|
| **Config file** | Optional TOML (~/.eget.toml) | YAML (deadman.yaml) |
| **Source support** | GitHub releases, direct URLs | Any URL |
| **Declarative** | Partially (config file optional) | Yes |
| **State tracking** | No | Yes (lock file) |
| **Platform detection** | Automatic, smart heuristics | Explicit in config |

**Use eget when:**
- You want quick, ad-hoc binary fetching
- You trust eget's platform detection heuristics
- You don't need reproducibility or state tracking

**Use DeadMan when:**
- You want declarative, reproducible configuration
- You need to track what's installed
- You want explicit control over platform selection

---

### dra

[github.com/devmatteini/dra](https://github.com/devmatteini/dra)

| Aspect | dra | DeadMan |
|--------|-----|---------|
| **Source support** | GitHub releases only | Any URL |
| **Interface** | Interactive + non-interactive modes | CLI only |
| **Config file** | No | YAML |
| **Install support** | Yes (extract and chmod) | Yes |
| **Authentication** | GitHub token, gh CLI integration | N/A |
| **State tracking** | No | Yes (lock file) |

**Use dra when:**
- You want a simple GitHub release downloader
- You need interactive asset selection
- You want automatic OS/arch detection
- You're scripting GitHub release downloads

**Use DeadMan when:**
- You need assets from non-GitHub sources
- You want declarative project configuration
- You need environment filtering or build-based assets

---

### bin

[github.com/marcosnils/bin](https://github.com/marcosnils/bin)

| Aspect | bin | DeadMan |
|--------|-----|---------|
| **Source support** | GitHub, GitLab, Codeberg, Docker, HashiCorp, go install | Any URL |
| **Config file** | JSON (auto-managed) | YAML (user-managed) |
| **Version tracking** | Yes, with rollback | Yes (lock file) |
| **Update detection** | Yes (`bin update`) | Yes (`deadman list --status outdated`) |
| **Pin versions** | Yes (`bin pin`) | Via config |
| **Multi-source** | Yes (multiple providers) | URL or build script |
| **Environment filtering** | No | Yes |

**Use bin when:**
- You want a lightweight Homebrew alternative
- You need multi-source support (GitHub, Docker, HashiCorp, etc.)
- You want automatic update detection and rollback
- You're managing user-level tools across machines

**Use DeadMan when:**
- You need project-scoped assets (not user-level)
- You need environment filtering
- You want a declarative, version-controlled config
- You need build-based assets

---

### install-release (ir)

[github.com/Rishang/install-release](https://github.com/Rishang/install-release)

| Aspect | ir | DeadMan |
|--------|-----|---------|
| **Language** | Python | TypeScript/Node |
| **Source support** | GitHub, GitLab | Any URL |
| **State management** | JSON state file | YAML lock file |
| **State sync** | Push/pull to remote URL | No |
| **Package formats** | Binary, .deb, .rpm, AppImage | Binary only |
| **Environment filtering** | No | Yes |
| **Build-based assets** | No | Yes |

**Use ir when:**
- You want state synchronization across machines
- You need to install system packages (.deb, .rpm) from releases
- You use both GitHub and GitLab
- You want a Python-based solution

**Use DeadMan when:**
- You need project-scoped assets
- You need environment filtering or build-based assets
- You want language-agnostic tooling

---

### Huber

[github.com/innobead/huber](https://github.com/innobead/huber)

| Aspect | Huber | DeadMan |
|--------|-------|---------|
| **Registry** | Curated list of popular tools | None, direct URLs |
| **Multiple versions** | Yes (install multiple, switch with `current`) | No (one version per asset) |
| **Lock/unlock** | Yes (prevent updates) | Via config |
| **Save/restore** | Yes (export/import package lists) | Lock file |
| **Search** | Yes (search curated list) | No |
| **Environment filtering** | No | Yes |
| **Build-based assets** | No | Yes |
| **Large file support** | Not designed for it | Yes |

**Use Huber when:**
- You want a curated list of popular tools
- You need multiple versions of the same tool installed
- You want to search for packages
- You want to export/import tool lists across machines

**Use DeadMan when:**
- Your assets aren't in Huber's curated list
- You need project-scoped assets
- You need environment filtering or build-based assets
- You're fetching large files

---

### Feature Comparison Matrix

| Feature | DeadMan | aqua | stew | eget | dra | bin | ir | Huber |
|---------|---------|------|------|------|-----|-----|----|----|
| Declarative config | ✅ YAML | ✅ YAML | ✅ Stewfile | ⚠️ Optional | ❌ | ⚠️ Auto | ❌ | ❌ |
| Lock file | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Any URL source | ✅ | ⚠️ Limited | ⚠️ Limited | ⚠️ Limited | ❌ GitHub | ⚠️ Providers | ⚠️ GH/GL | ❌ |
| Registry system | ❌ | ✅ 4000+ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Curated |
| Checksum verification | ✅ or trusted | ⚠️ Optional | ⚠️ Auto | ⚠️ Optional | ❌ | ❌ | ❌ | ❌ |
| Platform filtering | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Environment filtering | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Build-based assets | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Large file support | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| PATH/shim integration | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Interactive TUI | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Lazy install | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Multiple versions | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| GitLab support | ✅ (any URL) | ⚠️ Limited | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |

---

## Category 2: Language Package Managers

These manage packages within a specific programming language ecosystem.

### npm (Node.js)

| Aspect | npm | DeadMan |
|--------|-----|---------|
| **What it manages** | JavaScript packages from npmjs.com | Arbitrary files from any URL |
| **Dependency resolution** | Yes, complex transitive dependencies | No dependencies |
| **Version ranges** | Yes (^1.0.0, ~2.3.0, etc.) | No, exact URLs only |
| **Registry** | Centralized (npmjs.com) | None, direct URLs |
| **Scope** | Project (node_modules/) | Project (configurable paths) |

**Relationship:** Complementary. npm handles JavaScript packages; DeadMan handles native binaries a Node project might need (e.g., ffmpeg for video processing).

---

### pip (Python)

| Aspect | pip | DeadMan |
|--------|-----|---------|
| **What it manages** | Python packages from PyPI | Arbitrary files from any URL |
| **Dependency resolution** | Yes (via pip-tools, poetry, etc.) | No dependencies |
| **Binary wheels** | Yes, platform-specific wheels | Yes, platform-specific assets |
| **Virtual environments** | Yes (venv, virtualenv) | No, just fetches files |

**Relationship:** Complementary. pip handles Python packages; DeadMan handles native tools or model files a Python project might invoke.

---

### Cargo (Rust), Bundler (Ruby), Composer (PHP), Go Modules

Same pattern. These manage packages within their respective ecosystems. DeadMan handles assets outside those ecosystems.

---

## Category 3: System Package Managers

These manage packages at the operating system level, typically requiring root/admin privileges.

### apt (Debian/Ubuntu)

| Aspect | apt | DeadMan |
|--------|-----|---------|
| **Scope** | System-wide | Project-local |
| **Privileges** | Requires root (sudo) | No root needed |
| **Package source** | Debian/Ubuntu repositories | Any URL |
| **What it installs** | System libraries, tools, services | Project assets only |
| **Rollback** | Difficult | Easy (just re-fetch) |

**Relationship:** Different domains. apt manages your OS; DeadMan manages your project's assets.

**Use apt for:** System-wide tools (git, curl, build-essential).  
**Use DeadMan for:** Project-specific binaries that shouldn't be system-wide.

---

### dnf/yum, pacman, apk

Same relationship as apt. System-level package management for their respective distributions.

---

## Category 4: Platform App Installers

These install applications on desktop operating systems, often with GUI integration.

### Homebrew (macOS/Linux)

| Aspect | Homebrew | DeadMan |
|--------|----------|---------|
| **Scope** | User-level (~/homebrew or /opt/homebrew) | Project-local |
| **What it installs** | CLI tools, libraries, GUI apps (casks) | Project assets |
| **Formula/Cask system** | Yes, community-maintained recipes | No registry, direct URLs |
| **Dependency resolution** | Yes | No |
| **Version management** | Limited (one version at a time) | N/A |

**Use Homebrew when:**
- You want a tool available system-wide
- The tool is in Homebrew's registry
- You don't need a specific version pinned per-project

**Use DeadMan when:**
- You need a specific version for your project
- The tool isn't in Homebrew
- You want reproducible project-local assets
- You're managing large files (models) that don't belong in Homebrew

---

### Scoop, Chocolatey, winget (Windows)

Similar to Homebrew. These are user-level or system-level tool installers. DeadMan is project-scoped.

---

## Category 5: Version Managers

These manage multiple versions of programming language runtimes or tools.

### mise (formerly rtx)

| Aspect | mise | DeadMan |
|--------|------|---------|
| **What it manages** | Runtime/tool versions (Node, Python, Go, etc.) | Arbitrary files/binaries |
| **Version switching** | Yes, per-directory | No, just fetches files |
| **Config file** | .mise.toml, .tool-versions | deadman.yaml |
| **Plugin system** | Yes, for different tools | No |

**Relationship:** Complementary. mise manages *which version of Node* you're using; DeadMan fetches *native binaries* your project needs.

**Typical combination:**
```
mise              → node = "20", python = "3.11"
npm/pip           → language packages
deadman           → native binaries, model files
```

---

### asdf, nvm, pyenv, rbenv

Same pattern. These manage runtime versions. DeadMan fetches arbitrary assets.

---

## Category 6: Build Systems

### Make

| Aspect | Make | DeadMan |
|--------|------|---------|
| **Purpose** | Build automation | Asset fetching |
| **Fetch capabilities** | Via shell commands (curl) | Native |
| **Checksum verification** | Manual | Built-in |

**Relationship:** Complementary. A Makefile might call `deadman fetch` as a target.

---

### Bazel

| Aspect | Bazel | DeadMan |
|--------|-------|---------|
| **External dependencies** | Yes (http_archive, etc.) | Yes |
| **Checksum verification** | Yes | Yes |
| **Complexity** | High | Low |

**If you're using Bazel:** Bazel has built-in external dependency fetching. You likely don't need DeadMan.

**If you're not using Bazel:** DeadMan is much simpler for projects that don't need Bazel's build graph.

---

## Category 7: Container & Environment Tools

### Docker

| Aspect | Docker | DeadMan |
|--------|--------|---------|
| **Scope** | Entire runtime environment | Just assets |
| **Reproducibility** | Yes (image layers) | Yes (checksums) |
| **Overhead** | Container runtime | None |

**Relationship:** Complementary. A Dockerfile might use DeadMan to fetch assets during image build.

---

### Nix / NixOS

| Aspect | Nix | DeadMan |
|--------|-----|---------|
| **Scope** | Entire system, fully reproducible | Just assets |
| **Learning curve** | Steep | Minimal |
| **Reproducibility** | Cryptographic, complete | Checksum-based |
| **Ecosystem** | Nixpkgs (80,000+ packages) | None |

**If you're using Nix:** You probably don't need DeadMan. Nix can fetch and verify anything.

**If you're not using Nix:** DeadMan is trivial to adopt. Nix requires significant investment.

---

## Category 8: Other Related Tools

### Git LFS

| Aspect | Git LFS | DeadMan |
|--------|---------|---------|
| **Storage** | Git LFS server | Any URL |
| **Checkout behavior** | Automatic | Explicit fetch |

**Use Git LFS when:** Large files are truly part of your repo history.  
**Use DeadMan when:** Large files are external dependencies with stable URLs.

---

### DVC (Data Version Control)

| Aspect | DVC | DeadMan |
|--------|-----|---------|
| **Purpose** | ML data/model versioning | Asset fetching |
| **Pipeline support** | Yes | No |
| **Complexity** | Medium | Low |

**Use DVC when:** You're doing ML with data pipelines and experiments.  
**Use DeadMan when:** You just need to fetch model files, no pipeline needed.

---

### curl / wget

| Aspect | curl/wget | DeadMan |
|--------|-----------|---------|
| **Declarative** | No (imperative) | Yes |
| **Checksum verification** | Manual | Built-in |
| **Platform handling** | Manual | Automatic |

DeadMan is essentially "declarative curl with checksums and platform handling." If you're writing shell scripts with curl and sha256sum, DeadMan codifies that pattern.

---

## Summary: Selecting the Right Tool

### DeadMan may be appropriate when you need:

- Prebuilt binaries from arbitrary URLs (not just GitHub)
- Large model files (GGML, ONNX, safetensors)
- Environment-specific assets (dev vs prod)
- Verification (checksums or explicit trust decisions)
- Project-scoped, reproducible asset management
- A simple, language-agnostic solution

### Other tools may be more appropriate for:

| Need | Consider |
|------|----------|
| JavaScript packages | npm, yarn, pnpm |
| Python packages | pip, poetry, uv |
| Rust crates | cargo |
| System packages (Linux) | apt, dnf, pacman |
| System tools (macOS) | Homebrew |
| System tools (Windows) | Scoop, Chocolatey, winget |
| Runtime version management | mise, asdf |
| CLI tools from GitHub with PATH integration | aqua, bin, Huber |
| Interactive GitHub release selection | stew, dra |
| Quick ad-hoc binary fetch | eget, dra |
| State sync across machines | ir, Huber |
| Full environment reproducibility | Nix, Docker |
| ML pipelines with data versioning | DVC |
| Large files tracked in Git history | Git LFS |

### Common Tool Combinations

For projects that need native binaries alongside language packages:

```
mise              → Manage Node/Python/Rust versions
npm/pip/cargo     → Manage language packages
deadman           → Fetch native binaries and model files
```

---

## Conclusion: Does This Tool Need to Exist?

The honest answer is: **it depends on your use case.**

**If your assets are in aqua's registry** and you don't need environment filtering or large file support, aqua is more mature and has a larger community.

**If you want multi-source support** (GitHub, GitLab, Codeberg, Docker, HashiCorp), bin covers more ground with less configuration.

**If you're using Nix or Bazel**, those tools already handle external dependencies with verification.

**If your needs are simple**, eget or dra may be sufficient for ad-hoc GitHub release fetching.

**DeadMan addresses a specific gap** for projects that need:
- Arbitrary URL sources (not just GitHub)
- Environment-specific variants (dev vs prod models)
- Local build scripts as a source option
- Large file support (multi-GB models)
- Verification without a registry dependency
- Project-scoped, declarative configuration

Whether that gap applies to your project is something only you can determine. This document aims to provide enough context to make that decision clearly.

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-04 | Brian Lacy | Initial comparison document |
| 1.1 | 2026-03-05 | Brian Lacy | Reframed as ecosystem context and tool selection guide; updated checksum policy |
| 1.2 | 2026-03-05 | Brian Lacy | Moved Binary Fetchers to top; added anchor links to overview table |
| 1.3 | 2026-03-06 | Brian Lacy | Expanded outline with individual tool links; added dra, bin, install-release (ir), and Huber to binary fetchers; expanded feature comparison matrix |
