# Qwandery Cairn — Technical Specification

**Version:** 1.4  
**Date:** March 5, 2026  
**Author:** Brian Lacy, Qwandery Inc.  
**Platforms:** macOS (Apple Silicon), Windows (x64)  
**Recommended Hardware:** Mac Mini M4 (16GB)

---

## Executive Summary

Qwandery Cairn is a standalone desktop application for mental health therapists to transcribe and de-identify therapy session audio. The application runs entirely offline with no cloud dependencies, ensuring HIPAA-compliant privacy. Users import audio files, associate them with patients, run transcription, apply automatic PII redaction, and export sanitized transcripts.

### Core Principles

1. **Zero Configuration** — Works immediately after installation with no setup steps
2. **Fully Offline** — No network calls, no telemetry, no cloud features
3. **Privacy First** — All data stays on device; PII is automatically detected and redacted
4. **Simplicity Over Features** — Minimal UI, obvious workflow, impossible to misconfigure
5. **Reliability Over Performance** — Slower is acceptable; crashes and data loss are not
6. **Cross-Platform** — Develop on Windows, recommend Mac Mini M4 for production

---

## AI Ethics and Transparency

Mental health professionals operate under strict ethical obligations and are navigating new, unsettled territory around AI use in clinical practice. Cairn is designed to reduce — not add to — that burden. This section documents how Cairn addresses the known ethical limitations of its transcription engine and what obligations it places on the product.

### Transcription Engine Limitations

Cairn uses Whisper (via whisper.cpp), which carries inherent limitations that are relevant in a clinical context:

**Accent and dialect bias** — Whisper was trained on internet-sourced audio with uneven representation across accents, dialects, and non-native English speakers. Transcription accuracy may be meaningfully lower for clients who speak AAVE, heavily accented English, or non-standard dialects. Therapists should apply additional scrutiny when reviewing transcripts for these clients.

**Hallucination** — Whisper may occasionally generate words or short phrases not present in the audio, particularly during silence, cross-talk, or low-quality recordings. These errors are indistinguishable from accurate transcription without listening to the audio.

**No speaker identification** — Whisper does not identify who is speaking. All speech is transcribed as a single undifferentiated stream (v1 limitation).

### How Cairn Mitigates These Risks

1. **Fully offline, local processing** — Audio never leaves the device. No therapy content is used for model training or any external purpose.
2. **PII redaction** — Automatic de-identification reduces risk from transcript handling and export.
3. **Model provenance on every export** — Every exported transcript includes the model used to generate it, making the document self-documenting about its AI provenance.
4. **First-launch disclosure** — The application displays a plain-language AI disclosure on first launch (see UI section).
5. **Transcript editing (v2)** — Therapists will be able to correct transcription errors before export or filing.

### What Cairn Does Not Claim

Cairn does not produce clinically validated transcripts. It produces AI-generated transcripts that are useful for documentation workflows when reviewed by the clinician. The therapist remains responsible for verifying accuracy before using any transcript in clinical documentation.

---

## Target User

- Licensed mental health therapist (LCSW, LMFT, psychologist, etc.)
- Non-technical — cannot troubleshoot errors, edit config files, or use terminal
- Will use either their existing computer (Windows/Mac) or purchase recommended hardware
- Processes 4-10 therapy sessions per day, each 45-60 minutes
- Needs transcripts for clinical documentation with patient PII removed

---

## Platform Requirements

### Recommended (Primary Target)
- Mac Mini M4 with 16GB unified memory
- macOS 14.0 or later

### Minimum Supported
- **macOS:** Apple Silicon (M1/M2/M3/M4), 16GB RAM, macOS 11.0+
- **Windows:** x64 processor, 16GB RAM, Windows 10/11, dedicated GPU recommended

### Development Environment
- Windows (developer's primary machine)
- Testing against Mac Mini M4 before release

### Not Supported
- Intel Macs (lacks Metal performance for acceptable transcription speed)
- Systems with less than 16GB RAM
- Linux (could be added later, not v1 priority)

---

## Application Architecture

### Overview

The application consists of three presentation layers sharing common business logic:

1. **Desktop GUI** — Tauri shell hosting React/TypeScript UI for end users
2. **Command Line Interface** — Commander.js CLI for automation and integration
3. **Core Library** — Shared TypeScript modules for database, transcription, and de-identification

Transcription and de-identification are handled by external binaries spawned as child processes.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Presentation Layer                          │
├─────────────────────────────┬───────────────────────────────────┤
│      Tauri + React GUI      │        Commander.js CLI           │
│   (End user interface)      │   (Automation & integration)      │
└─────────────────────────────┴───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Core Library                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Database   │  │  Whisper    │  │  Presidio   │             │
│  │  (SQLite)   │  │  Interface  │  │  Interface  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Audio     │  │   Export    │  │   Queue     │             │
│  │  Handling   │  │  Functions  │  │  Manager    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Binaries                            │
│         whisper.cpp  ·  ffmpeg  ·  presidio-cli                 │
└─────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Technology | Role |
|-----------|------------|------|
| Desktop App | Tauri 2.0 + React | GUI for end users |
| CLI | Commander.js | Automation, scripting, AI integration |
| Core Library | TypeScript | Shared business logic |
| Transcription | whisper.cpp | Audio to text conversion |
| Audio Conversion | ffmpeg | Convert audio formats to WAV |
| De-identification | Microsoft Presidio | PII detection and redaction |
| Database | SQLite (via sql.js/better-sqlite3) | Local data persistence |
| Models | Whisper GGML variants | Multiple models bundled (tiny, medium, large-v3-turbo) |

### No Custom Native Code

The developer does not write Rust, Python, or C++. All native functionality is accessed through:
- Prebuilt binaries invoked via shell commands (works in both Tauri and CLI contexts)
- JavaScript libraries running in Node.js (CLI) or Tauri webview (GUI)
- Tauri's built-in file system and dialog APIs (GUI only)

If a feature would require custom native code, find an alternative approach or defer the feature.

### Shared Core Library

The core business logic is implemented as pure TypeScript modules with no GUI or CLI dependencies. Both presentation layers import from the same core:

- **database.ts** — Patient, session, transcript CRUD operations
- **whisper.ts** — Spawn whisper.cpp, parse output, report progress
- **presidio.ts** — Spawn presidio-cli, parse results
- **audio.ts** — Audio file validation, format conversion via ffmpeg
- **export.ts** — Generate TXT and DOCX exports
- **queue.ts** — Processing queue management
- **config.ts** — Environment detection, model selection, paths

The core library uses dependency injection for platform-specific concerns (e.g., path resolution, process spawning) so the same code works in both Tauri and Node.js CLI contexts.

### Cross-Platform Binary Strategy

Each platform requires its own set of prebuilt binaries:

| Binary | macOS (arm64) | Windows (x64) |
|--------|---------------|---------------|
| whisper.cpp | Metal acceleration | CUDA or CPU fallback |
| ffmpeg | Static build | Static build |
| presidio-cli | PyInstaller bundle | PyInstaller bundle |

The Tauri build process selects the appropriate binaries for each target platform.

---

## Data Model

### Patient

Represents a therapy client. Fields:
- Unique identifier (UUID)
- Display name (therapist-assigned, can be pseudonym/initials)
- Optional notes
- Created and updated timestamps

### Session

Represents a single therapy session. Fields:
- Unique identifier (UUID)
- Reference to patient
- Session date
- Audio filename (original name for display)
- Audio path (location in app data directory)
- Duration in seconds (populated after import)
- Processing status: pending, transcribing, transcribed, sanitizing, complete, or error
- Created and updated timestamps

### Transcript

Represents the output of transcription and sanitization. Fields:
- Unique identifier (UUID)
- Reference to session
- Raw text (original transcription)
- Sanitized text (PII-redacted version, nullable until sanitization runs)
- Segments array (timestamped portions of transcript)
- Detected entities array (PII found during sanitization)
- Model identifier used
- Processing timestamps

### Transcript Segment

A timestamped portion of the transcript:
- Start time in seconds
- End time in seconds
- Text content

### Detected Entity

A PII element found during sanitization:
- Entity type (PERSON, PHONE, DATE, etc.)
- Original value (the text that was redacted)
- Character offsets in raw text
- Replacement text (e.g., "[PERSON]")

---

## Storage

### Location

All application data is stored in the OS-standard application data directory:
- **macOS:** ~/Library/Application Support/com.qwandery.cairn/
- **Windows:** %APPDATA%\com.qwandery.cairn\

### Structure

The data directory contains:
- SQLite database file for all structured data
- Audio subdirectory for imported audio files
- Logs subdirectory for application logs
- Temp subdirectory for processing intermediates

### Audio Import Behavior

When a user imports an audio file, the application COPIES the file into the audio subdirectory. The original file is not modified or referenced. This ensures the application works even if the original file is moved or deleted.

Audio files are converted to 16kHz mono WAV format during import (required by Whisper).

---

## User Interface

### Design Principles

1. **Single Window** — No multi-window complexity
2. **Two-Panel Layout** — Left sidebar for navigation, right panel for content
3. **Minimal Clicks** — Common actions in 1-2 clicks
4. **Clear Status** — Always obvious what the system is doing
5. **No Settings** — Zero configuration in v1; sensible defaults only

6. **Informed Use** — AI limitations disclosed at first launch; transcripts are AI-generated and require clinician review

### First-Launch Disclosure

On first launch (tracked via a flag in the database or config), the application displays a modal disclosure before the main UI is accessible. The disclosure must:

- Be written in plain language, not legal boilerplate
- State clearly that transcripts are generated by AI and may contain errors
- Note that accuracy may vary for different accents, dialects, and audio quality
- State that the therapist is responsible for reviewing transcripts before clinical use
- Include a single acknowledgment button ("I understand")
- Never appear again after acknowledgment

Example disclosure text:

> **About AI Transcription**
>
> Qwandery Cairn uses AI to transcribe your session recordings. AI transcription is highly accurate but not perfect — it can make errors, and may perform less consistently with certain accents or audio conditions.
>
> All processing happens entirely on this device. Nothing leaves your computer.
>
> Please review every transcript before using it in clinical documentation. You are responsible for the accuracy of any records you file.



The main window has a fixed left sidebar and a flexible right content area.

**Left Sidebar:**
- Patient list with session counts
- Selected patient highlighted
- Add Patient button
- Processing queue status summary

**Right Content Area:**
- Changes based on selection
- Shows either session list or session detail

### Views

**Patient List (sidebar)**
- Alphabetically sorted patient names
- Badge showing session count per patient
- Click to select and show sessions

**Session List (right panel when patient selected, no session selected)**
- Sessions for selected patient, newest first
- Each row: date, duration, status icon
- Status icons: checkmark (complete), hourglass (pending), spinner (processing), warning (error)
- Import Audio button

**Session Detail (right panel when session selected)**
- Back button to return to session list
- Audio player with play/pause, seek, duration display
- Tab selector: Raw Transcript / Sanitized Transcript
- Transcript display with timestamps
- Clicking timestamp seeks audio to that position
- Action buttons: Transcribe (if pending), Sanitize (if transcribed), Export

**Export Dialog (modal)**
- Version selector: Raw or Sanitized (default: Sanitized)
- Format selector: Plain Text or Word Document (default: Plain Text)
- Optional inclusions: timestamps, patient identifier, session date
- Cancel and Export buttons

**Export Output Requirements**

Every exported transcript must include a provenance footer or header containing:
- Export date and time
- Whisper model used to generate the transcript (e.g., "Transcribed using Whisper large-v3-turbo")
- A brief disclaimer: "This transcript was generated by AI and should be reviewed for accuracy before use in clinical documentation."

This provenance block appears in both TXT and DOCX exports and cannot be disabled in v1.

**New Patient Dialog (modal)**
- Single text field for display name
- Helper text encouraging use of initials/pseudonyms for privacy
- Cancel and Create buttons

### Processing Queue

The sidebar shows a processing summary:
- Count of pending items
- Count of currently processing items

Processing happens sequentially (one at a time) to avoid resource contention and ensure predictable behavior.

---

## Command Line Interface

### Purpose

The CLI provides programmatic access to all Qwandery Cairn functionality, enabling:
- Automation and scripting
- Integration with other applications
- AI agent interaction (e.g., Claude, GPT)
- Batch processing workflows
- Headless server deployment (future)

### Design Principles

1. **Complete Feature Parity** — Every GUI action has a CLI equivalent
2. **Machine-Readable Output** — JSON output for all commands (default), human-readable optional
3. **Composable** — Commands can be piped and chained
4. **Predictable** — Consistent argument patterns, exit codes, error formats
5. **Self-Documenting** — Comprehensive help for every command

### Command Structure

All commands follow the pattern:

```
cairn <resource> <action> [options] [arguments]
```

Resources: patient, session, transcript, queue, config
Actions vary by resource (list, get, create, delete, etc.)

### Global Options

| Option | Description |
|--------|-------------|
| --json | Output as JSON (default) |
| --human | Output as human-readable text |
| --quiet | Suppress non-essential output |
| --verbose | Include debug information |
| --data-dir PATH | Override default data directory |
| --help | Show help for command |
| --version | Show version information |

### Patient Commands

**List all patients**
- Command: cairn patient list
- Output: Array of patient objects
- Options: --sort (name, created, updated), --limit, --offset

**Get patient details**
- Command: cairn patient get <patient-id>
- Output: Patient object with session count
- Error: Exit code 1 if not found

**Create patient**
- Command: cairn patient create --name "J.D."
- Output: Created patient object with ID
- Options: --notes "Optional notes"

**Update patient**
- Command: cairn patient update <patient-id> --name "New Name"
- Output: Updated patient object
- Options: --name, --notes

**Delete patient**
- Command: cairn patient delete <patient-id>
- Output: Confirmation with deleted ID
- Behavior: Also deletes all sessions and transcripts for patient
- Options: --force (skip confirmation in human mode)

### Session Commands

**List sessions**
- Command: cairn session list
- Output: Array of session objects
- Options: --patient <id> (filter by patient), --status (pending, complete, etc.), --sort, --limit

**Get session details**
- Command: cairn session get <session-id>
- Output: Session object with transcript summary
- Includes: patient info, audio metadata, processing status

**Import audio**
- Command: cairn session import <audio-file> --patient <patient-id>
- Output: Created session object
- Options: --date YYYY-MM-DD (defaults to today)
- Behavior: Copies and converts audio to app data directory

**Delete session**
- Command: cairn session delete <session-id>
- Output: Confirmation with deleted ID
- Behavior: Also deletes transcript and audio file
- Options: --force

### Transcript Commands

**Get transcript**
- Command: cairn transcript get <session-id>
- Output: Transcript object with full text and segments
- Options: --raw (include raw text), --sanitized (include sanitized text, default both)

**Transcribe session**
- Command: cairn transcript transcribe <session-id>
- Output: Progress updates (if --human), final transcript object
- Behavior: Runs whisper.cpp on session audio
- Options: --model (tiny, medium, large-v3-turbo), --wait (block until complete, default), --no-wait (return immediately)
- Progress: Outputs JSON progress events to stdout when --no-wait

**Sanitize transcript**
- Command: cairn transcript sanitize <session-id>
- Output: Sanitized transcript with entity list
- Behavior: Runs presidio on raw transcript
- Prerequisite: Session must be in 'transcribed' status

**Export transcript**
- Command: cairn transcript export <session-id> --output <file>
- Output: Path to exported file
- Options: --format (txt, docx), --version (raw, sanitized), --timestamps (include/exclude)

### Queue Commands

**Show queue status**
- Command: cairn queue status
- Output: Queue state (pending count, active item, etc.)

**Process next item**
- Command: cairn queue process
- Output: Processing result
- Behavior: Processes one pending item (transcription or sanitization)

**Process all pending**
- Command: cairn queue process-all
- Output: Array of results
- Behavior: Processes all pending items sequentially
- Options: --stop-on-error (halt on first failure)

### Config Commands

**Show configuration**
- Command: cairn config show
- Output: Current configuration (data directory, model, platform info)

**Detect environment**
- Command: cairn config detect
- Output: Detected platform, available models, recommended settings

### Pipeline Example

The CLI enables powerful automation. Example workflow for processing a batch of audio files:

1. Create patient (or get existing ID)
2. Import each audio file as a session
3. Transcribe all sessions
4. Sanitize all transcripts
5. Export sanitized transcripts

This can be scripted or driven by an AI agent making sequential CLI calls.

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Resource not found |
| 2 | Invalid arguments |
| 3 | Processing error (transcription/sanitization failed) |
| 4 | File system error |
| 5 | Database error |

### JSON Output Format

All JSON output follows a consistent envelope:

**Success:**
```
{
  "success": true,
  "data": <result object or array>
}
```

**Error:**
```
{
  "success": false,
  "error": {
    "code": <exit code>,
    "message": "Human-readable error message",
    "details": { ... optional additional context ... }
  }
}
```

**Progress (for long-running operations with --no-wait):**
```
{
  "type": "progress",
  "sessionId": "...",
  "percent": 45,
  "message": "Transcribing..."
}
```

### Installation

The CLI is bundled with the desktop application and also available as a standalone npm package:

**Bundled:** The desktop app includes the CLI accessible via the "cairn" command when the app's bin directory is in PATH. The installer optionally adds this to PATH.

**Standalone:** For headless/server use or development:
- Install via npm: npm install -g @qwandery/cairn-cli
- Requires Node.js 20+
- Requires external binaries (whisper.cpp, ffmpeg, presidio-cli) to be installed separately or paths configured

### AI Integration Notes

The CLI is designed for AI agent consumption:

- JSON output is parseable without ambiguity
- Error messages are specific and actionable
- Commands are idempotent where possible (re-running won't corrupt state)
- Session IDs are stable UUIDs that can be stored and referenced
- Progress events enable responsive feedback loops

An AI agent can effectively use Qwandery Cairn by:
1. Calling "cairn config detect" to understand the environment
2. Using patient/session commands to manage data
3. Orchestrating transcription and sanitization workflows
4. Exporting results for further processing

---

## Transcription

### Engine

Transcription uses whisper.cpp, a C++ implementation of OpenAI's Whisper model optimized for local execution.

### Models

The application supports multiple Whisper models to accommodate different hardware capabilities and use cases:

| Model | Size | Speed | Accuracy | Use Case |
|-------|------|-------|----------|----------|
| tiny.en | ~75MB | Fastest | Lower | Development, quick tests |
| medium.en | ~1.5GB | Moderate | Good | Windows production, modest hardware |
| large-v3-turbo | ~3GB | Slower | Best | Mac Mini M4, high-end GPUs |

All models are English-only variants (.en) for better English accuracy and smaller size.

### Model Selection Logic

The application selects a default model based on environment and detected hardware:

**Development Mode:**
- Always defaults to tiny.en for fast iteration
- Developer can override via environment variable if needed

**Production Mode (macOS):**
- Defaults to large-v3-turbo (assumes Apple Silicon with 16GB+ unified memory)
- No runtime detection needed — minimum requirements guarantee capability

**Production Mode (Windows):**
- Defaults to medium.en (safe baseline for varied hardware)
- Future enhancement: detect NVIDIA GPU with 8GB+ VRAM and upgrade to large-v3-turbo

The selected model is not user-configurable in v1. The application uses the appropriate default for the platform. Model switching could be exposed as a "power user" setting in v2.

### Model Bundling Strategy

**Development builds:** Bundle only tiny.en (~75MB) to keep build times fast

**Production builds:** Bundle all three models:
- tiny.en for fallback/testing
- medium.en for Windows default
- large-v3-turbo for Mac default

Total model storage: ~4.6GB

Alternative approach: Download models on first run based on detected platform. This reduces installer size but adds first-run complexity. Recommend bundling for v1 simplicity ("works out of the box").

### Invocation

The TypeScript application spawns whisper.cpp as a child process using Tauri's shell plugin, passing:
- Path to the selected model file
- Path to the audio file
- Language (English, hardcoded for v1)
- Output format (JSON with timestamps)

### Progress Reporting

whisper.cpp outputs progress percentages to stderr. The application parses these to update the UI progress indicator.

### Audio Format Handling

Whisper requires 16kHz mono WAV input. The application uses ffmpeg to convert other formats (MP3, M4A, AAC, OGG, FLAC) during import.

Supported import formats: WAV, MP3, M4A, AAC, OGG, FLAC

### Platform Differences

- **macOS (Apple Silicon):** Uses Metal acceleration, fastest performance
- **Windows:** Uses CUDA if available, falls back to CPU if not

### Performance Expectations

**Mac Mini M4 (large-v3-turbo):**
- 15-minute audio: 3-5 minutes processing
- 45-minute audio: 9-15 minutes processing
- 60-minute audio: 12-20 minutes processing

**Windows with medium.en (CPU or modest GPU):**
- 15-minute audio: 8-15 minutes processing
- 45-minute audio: 25-45 minutes processing
- 60-minute audio: 35-60 minutes processing

**Development with tiny.en:**
- 15-minute audio: 1-2 minutes processing
- 60-minute audio: 4-8 minutes processing

Accuracy varies by model. Large-v3-turbo is recommended for clinical use where accuracy matters. Medium.en is acceptable for most cases. Tiny.en is suitable for testing workflows but may miss words or produce errors.

---

## De-identification

### Engine

De-identification uses Microsoft Presidio, an open-source PII detection and anonymization library. Presidio is packaged as a standalone executable using PyInstaller so users don't need Python installed.

### Invocation

The TypeScript application spawns presidio-cli as a child process, passing transcript text via stdin and receiving JSON output via stdout.

### Detected Entity Types

| Type | Example | Replacement |
|------|---------|-------------|
| Person names | "John Smith" | [PERSON] |
| Phone numbers | "801-555-1234" | [PHONE] |
| Email addresses | "john@example.com" | [EMAIL] |
| Dates and times | "March 4, 2026" | [DATE] |
| Locations | "Salt Lake City" | [LOCATION] |
| Social Security numbers | "123-45-6789" | [SSN] |
| Credit card numbers | "4111-1111-1111-1111" | [CREDIT_CARD] |
| Driver's license numbers | "DL12345678" | [ID] |
| Medical license numbers | "MD12345" | [ID] |
| IP addresses | "192.168.1.1" | [IP] |
| URLs | "https://example.com" | [URL] |

### Output

Presidio returns:
- Sanitized text with PII replaced by bracketed type indicators
- List of detected entities with original values, positions, and replacements

Both the raw and sanitized transcripts are stored, allowing the user to choose which to export.

### Performance

Presidio processing is fast (under 10 seconds for typical session transcripts).

---

## Error Handling

### Principles

1. **Never Crash** — All errors caught and displayed gracefully
2. **Never Lose Data** — Database operations are transactional
3. **Clear Messages** — Human-readable errors, not technical jargon
4. **Recoverable** — Failed operations can be retried

### Error Categories

**Audio Import Errors**
- File not found, unsupported format, file too large, conversion failed
- Show friendly message, suggest alternatives

**Transcription Errors**
- Binary not found (critical, shouldn't happen in packaged app)
- Process crashed, out of memory
- Mark session as error status, allow retry

**Sanitization Errors**
- Binary not found (critical)
- Process crashed
- Mark session as error status, allow retry

**Database Errors**
- Corruption, write failure
- Show clear message, suggest contacting support

### Logging

All errors logged to a file in the logs subdirectory with:
- Timestamp
- Error type and message
- Relevant context (session ID, file path, etc.)

Logs rotate daily, retained for 7 days.

---

## Security and Privacy

### Data at Rest

No application-level encryption in v1. Relies on OS-level protection:
- macOS FileVault
- Windows BitLocker

Encryption could be added in v2 if required.

### Network

The application makes ZERO network calls. No:
- Telemetry or analytics
- Crash reporting
- Update checking
- Cloud sync
- License validation

Works identically online or offline.

### PII Handling

- Encourages pseudonyms for patient display names
- Automatically detects and redacts PII in transcripts
- Stores both raw and sanitized versions
- User chooses which to export
- No PII ever leaves the device

### Bundled Binaries

All bundled binaries should be:
- Obtained from official sources or built from source
- Code-signed (macOS) or verified (Windows)
- Verified at build time

---

## Installation and Distribution

### Distribution Method

**macOS:** DMG disk image, direct download from website (not Mac App Store)
**Windows:** MSI or NSIS installer, direct download

### Code Signing

**macOS:** Requires Apple Developer ID certificate and notarization to avoid Gatekeeper warnings. Apple Developer Program membership required ($99/year).

**Windows:** Should be signed with a code signing certificate to avoid SmartScreen warnings. Optional but recommended.

### Installation Flow

1. User downloads installer (~4.5GB for production with all models, ~200MB for dev builds)
2. User runs installer (macOS: drag to Applications; Windows: run installer wizard)
3. User launches application
4. First launch: system requirements check, data directory creation
5. Application ready to use immediately — no setup wizard, no model downloads

### Requirements Check

On first launch, verify:
- Supported OS version
- Apple Silicon (macOS) or x64 (Windows)
- Minimum 16GB RAM
- Sufficient disk space

If requirements not met, show clear error and exit.

### Uninstallation

Standard OS uninstall process. User data in app data directory preserved unless manually deleted.

---

## Project Structure

### Source Organization

- **packages/core/** — Shared TypeScript library (database, whisper, presidio, audio, export, queue, config)
- **packages/cli/** — Commander.js CLI application
- **packages/desktop/** — Tauri + React desktop application
- **binaries/** — Prebuilt native binaries (gitignored, downloaded during build)
- **models/** — Whisper model files (gitignored, downloaded during build; tiny.en only for dev, all three for prod)
- **scripts/** — Build and release automation

### Monorepo Structure

The project uses a monorepo (npm workspaces or similar) to share code between CLI and desktop:

- **packages/core/** contains all business logic with no UI dependencies
- **packages/cli/** imports from core, adds Commander.js interface
- **packages/desktop/** imports from core, adds Tauri + React interface

### Key Modules in packages/core/

- **database.ts** — SQLite operations (CRUD for patients, sessions, transcripts)
- **whisper.ts** — Transcription interface (spawn process, parse output, progress)
- **presidio.ts** — De-identification interface (spawn process, parse results)
- **audio.ts** — Audio file handling (validation, format detection, conversion)
- **export.ts** — Export functionality (TXT, DOCX generation)
- **queue.ts** — Processing queue management
- **config.ts** — Environment detection, model selection, path resolution
- **types.ts** — Shared TypeScript type definitions

### Key Modules in packages/cli/

- **index.ts** — CLI entry point, Commander.js setup
- **commands/** — Command implementations (patient.ts, session.ts, transcript.ts, queue.ts, config.ts)
- **output.ts** — JSON/human output formatting
- **progress.ts** — Progress reporting for long operations

### Key Directories in packages/desktop/

- **src/components/** — React UI components
- **src/hooks/** — React hooks for state management
- **src-tauri/** — Tauri configuration and minimal boilerplate

### Tauri Configuration

The Tauri configuration must:
- Define shell plugin scope allowing execution of whisper-cpp, ffmpeg, and presidio-cli
- Define file system scope for app data directory
- Bundle platform-specific binaries as resources
- Set minimum window dimensions
- Disable all network-related features

---

## Build Process

### Development

**CLI Development:**
- Navigate to packages/cli
- Run in watch mode for fast iteration
- Uses tiny.en model only
- Tests against local database

**Desktop Development:**
- Standard Tauri development workflow
- Run Tauri dev server with hot reload
- Uses tiny.en model only

Both share packages/core, so changes to core are reflected in both.

### Release Build

**CLI Release:**
1. Build packages/core
2. Build packages/cli
3. Package as npm tarball or standalone executable (using pkg or similar)

**Desktop Release:**
1. Build packages/core
2. Download/verify required binaries for target platform
3. Download all Whisper models (tiny.en, medium.en, large-v3-turbo)
4. Build packages/desktop (React + Tauri)
5. Sign and notarize (macOS)
6. Create installer package

**Combined Installer:**
The desktop installer includes the CLI binary, making "cairn" command available system-wide when installed.

### Binary Acquisition

**whisper.cpp:** Build from source with platform-specific acceleration (Metal for macOS, CUDA for Windows) or download official releases.

**ffmpeg:** Download static builds from official sources.

**presidio-cli:** Build using PyInstaller from a minimal Python wrapper script that invokes Presidio analyzer and anonymizer.

### Model Acquisition

Download GGML-format models from Hugging Face (ggerganov/whisper.cpp repository):
- ggml-tiny.en.bin (~75MB)
- ggml-medium.en.bin (~1.5GB)  
- ggml-large-v3-turbo.bin (~3GB)

---

## Testing Requirements

### Pre-Release Manual Testing

**Installation**
- Desktop installer runs without errors
- Application launches successfully
- Requirements check works correctly
- CLI command available in terminal after install

**CLI Functionality**
- cairn --version returns version
- cairn --help shows all commands
- cairn patient create/list/get/delete work correctly
- cairn session import processes audio file
- cairn transcript transcribe completes successfully
- cairn transcript sanitize detects PII
- cairn transcript export creates valid files
- JSON output is valid and parseable
- Exit codes are correct for success/failure
- Error messages are clear and actionable

**Desktop Patient Management**
- Create patient with various name formats
- Patient list displays correctly
- Data persists after restart

**Desktop Audio Import**
- WAV, MP3, M4A formats import successfully
- Unsupported format shows clear error
- Large files (1+ hour) work correctly
- Audio copied to app directory (original unchanged)

**Desktop Transcription**
- Progress indicator updates
- Completes successfully
- Transcript displays with timestamps
- Accuracy spot-check (play audio, verify text)

**Desktop Sanitization**
- Names, phones, dates detected
- Redacted view shows replacements
- Entity list populated

**Desktop Export**
- TXT export works
- DOCX export works
- Both raw and sanitized options work
- Files open correctly in target applications

**Desktop Audio Playback**
- Play/pause works
- Seeking works
- Timestamp clicking seeks correctly

**Cross-Interface Consistency**
- Session created via CLI appears in desktop app
- Transcript created via desktop accessible via CLI
- Data modifications in one interface reflected in other

**Error Recovery**
- Corrupted audio handled gracefully
- Application recovers from process failures
- CLI provides useful error output

**Performance**
- 60-minute audio completes in reasonable time on target hardware
- UI remains responsive during processing

---

## Known Limitations (v1)

Explicitly out of scope:

1. No speaker diarization (cannot distinguish voices)
2. No transcript editing *(top v2 priority — required for clinical accuracy workflow)*
3. No batch processing (one at a time)
4. No settings or preferences
5. No backup/restore feature
6. English only
7. No real-time transcription *(early v2 priority)*
8. No EHR integration
9. No custom redaction rules
10. No undo for deletions

---

## Future Considerations (v2+)

### v2 Priorities (in order)

1. **Transcript editing** — Inline editing of transcript text before export; essential for clinical accuracy workflow and the primary ethics gap in v1
2. **Real-time transcription** — Live transcription during session recording, not just post-session import
3. **Speaker diarization** — Distinguish therapist vs. client voice in transcript
4. **Auto-process queue** — Transcribe + sanitize in one step after import
5. **Batch processing** — Import and process multiple sessions at once
6. **User-selectable model** — Expose tiny/medium/large choice in settings
7. **Runtime GPU detection** — Automatically upgrade to large-v3-turbo on capable Windows systems
8. **Backup and restore**

### v3 Backlog

- **Multi-pass transcription verification** — Run a second model pass (e.g., tiny.en as a lightweight check) and compare against the primary transcript; flag segments with significant variance for priority review during editing. Gives therapists a guided editing experience rather than cold full-text review.
- Custom redaction rules
- Multi-language support
- EHR integration
- Keyboard shortcuts
- Dark mode
- Linux support

---

## Support

### User Documentation

Simple one-page getting started guide covering basic workflow. Included in installer and on website.

### Troubleshooting

Common issues documented:
- Slow transcription: close other applications, verify hardware meets requirements
- Application won't start: verify RAM and OS requirements
- Audio won't import: try converting to WAV externally

### Support Contact

Email address for support requests. Users should provide:
- Log file from app data directory
- Screenshots of errors
- OS version and hardware details

---

## Appendix: Presidio CLI Wrapper

The presidio-cli binary is a PyInstaller-bundled Python script that:

1. Reads transcript text from stdin
2. Initializes Presidio analyzer and anonymizer engines
3. Analyzes text for the defined entity types (PERSON, PHONE_NUMBER, EMAIL_ADDRESS, DATE_TIME, LOCATION, US_SSN, CREDIT_CARD, US_DRIVER_LICENSE, MEDICAL_LICENSE, IP_ADDRESS, URL)
4. Anonymizes by replacing each entity with a bracketed type indicator
5. Outputs JSON to stdout containing the sanitized text and list of detected entities
6. Handles errors gracefully, outputting error JSON to stderr

The wrapper is minimal (under 50 lines) and stateless. Each invocation is independent.

---

## Appendix: Whisper.cpp Invocation

The application invokes whisper.cpp with parameters specifying:
- Model file path (selected based on platform/environment)
- Input audio file path
- Output format (JSON)
- Language (English)
- Output file path

Model selection:
- Development mode: tiny.en
- Production macOS: large-v3-turbo
- Production Windows: medium.en

The application monitors stderr for progress updates (percentage complete) and stdout/output file for results.

On completion, the JSON output contains the full transcript text and an array of segments with start time, end time, and text for each.

The Transcript record stores which model was used, allowing the user to see if a transcript was generated with a lower-accuracy model.

---

## Appendix: Tauri Shell Plugin Scope

The Tauri configuration must explicitly allow execution of:
- whisper-cpp binary with arbitrary arguments
- ffmpeg binary with arbitrary arguments  
- presidio-cli binary with arbitrary arguments

Binaries are referenced relative to the application resources directory, which Tauri resolves differently per platform.

---

## Appendix: Cross-Platform Considerations

### File Paths
- Use Tauri's path APIs to resolve app data directory
- Use forward slashes internally, let Tauri handle OS conversion
- Never hardcode path separators

### Binary Names
- macOS: no extension (whisper-cpp, ffmpeg, presidio-cli)
- Windows: .exe extension (whisper-cpp.exe, ffmpeg.exe, presidio-cli.exe)
- Tauri configuration should handle this automatically

### Process Spawning
- Use Tauri's shell plugin, not Node.js child_process
- Handle stdout/stderr as streams for progress monitoring
- Set appropriate timeouts (transcription can take 20+ minutes)

### UI Considerations
- Test on both platforms for visual consistency
- Respect OS conventions for dialogs (save/open)
- Window chrome handled by Tauri

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-04 | Brian Lacy | Initial specification |
| 1.1 | 2026-03-04 | Brian Lacy | Renamed to Qwandery Cairn, added cross-platform support, removed code blocks |
| 1.2 | 2026-03-04 | Brian Lacy | Added multi-model support (tiny, medium, large-v3-turbo) with platform-based defaults |
| 1.3 | 2026-03-04 | Brian Lacy | Added comprehensive Commander.js CLI, refactored to monorepo structure with shared core library |
| 1.4 | 2026-03-05 | Brian Lacy | Added AI Ethics section, first-launch disclosure UI requirement, export provenance requirements, prioritized v2/v3 roadmap |
