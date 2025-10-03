# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Removed - 2025-10-03

#### GCS Debug Logging System Removal

**Breaking Change**: The GCS-based debug logging system has been completely removed from the application. All debugging and monitoring is now exclusively handled through the Inngest dashboard.

**Rationale**: The Inngest dashboard provides comprehensive logging for all workflow executions, making the redundant GCS debug logging system unnecessary and costly.

**What was removed:**

- **Core module**: `lib/debug-logger.ts`
  - `writeEpisodeDebugLog()` function
  - `writeEpisodeDebugReport()` function

- **Inngest workflow debug logging** (30 total calls removed):
  - `lib/inngest/transcribe-from-metadata.ts` - 10 debug log calls
  - `lib/inngest/transcription-saga.ts` - 11 debug log calls + 2 debug report calls
  - `lib/inngest/providers/gemini-video-worker.ts` - 9 debug log calls

- **API endpoint**: `app/api/user-episodes/[id]/debug/logs/route.ts`
  - Endpoint for retrieving debug logs from GCS

- **UI components** in `app/(protected)/my-episodes/_components/episode-list.tsx`:
  - `debugLogs` state management
  - `enableDebug` flag
  - `handleViewRunLog()` function
  - "View Run Log" button
  - Debug logs display panel

- **Environment variables**:
  - `ENABLE_EPISODE_DEBUG` (server-side)
  - `NEXT_PUBLIC_ENABLE_EPISODE_DEBUG` (client-side)

**Migration Guide:**

If you were using the debug logging system:

1. **For debugging episode generation workflows**:
   - Navigate to your Inngest dashboard
   - All function executions, steps, and errors are logged there
   - Search by episode ID or job ID to find specific runs

2. **For viewing historical debug logs**:
   - Historical GCS debug logs are not migrated
   - Future debugging should use Inngest dashboard exclusively

3. **For admin/developer debugging**:
   - No code changes required
   - Remove any references to `ENABLE_EPISODE_DEBUG` environment variables from your deployment configs

**Benefits:**
- Reduced GCS storage costs (no redundant log files)
- Simplified codebase (removed ~30 debug logging calls)
- Centralized logging via Inngest dashboard
- Better debugging experience with Inngest's native tools

**Commit**: `2e404c54f` - chore: remove GCS debug logging system

---

## Template for Future Entries

### Added
- New features

### Changed
- Changes in existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security fixes
