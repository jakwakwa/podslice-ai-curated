# Environment Variable Migration Guide

## Summary of Changes

This migration refactors environment variable handling for episode generation and transcription timeouts:

### New Environment Variables
- **`PROVIDER_WINDOW_SECONDS`** - Controls the timeout for transcription provider operations
  - Default: `270` (4.5 minutes, suitable for Vercel Hobby plan)
  - Recommended for Hobby: `270`
  - Recommended for Pro: `840` (14 minutes)
  
- **`EPISODE_TARGET_MINUTES`** - Controls the target length of generated episodes
  - Default: `4` minutes
  - Can be overridden to any positive number

### Removed Environment Variables
- **`PROVIDER_TOTAL_WINDOW_SECONDS`** - No longer supported (replaced by `PROVIDER_WINDOW_SECONDS`)

### Code Changes
- New centralized env helpers in `lib/env.ts`:
  - `getProviderWindowSeconds()` - Returns provider window timeout
  - `getEpisodeTargetMinutes()` - Returns target episode length
- Renamed config file: `config/get-processing-config.ts` → `config/processing-limits.ts`
- Renamed export: `getProcessingConfig()` → `getProcessingLimits()`
- Config key renamed: `providerTotalWindowSeconds` → `providerWindowSeconds`
- Transcription saga now uses dynamic timeouts from env instead of hardcoded `600s`
- Episode generators use env helper instead of inline parsing with `Math.max` clamps

## Migration Steps

### 1. Update Your `.env` File

Remove the deprecated variable:
```bash
# REMOVE THIS LINE:
PROVIDER_TOTAL_WINDOW_SECONDS="600"
```

Add the new variables (or update existing ones):
```bash
# For Vercel Hobby plan (or any plan where you want 4.5min timeout):
PROVIDER_WINDOW_SECONDS=270

# Target episode length (optional, defaults to 4):
EPISODE_TARGET_MINUTES=4
```

### 2. Update Vercel Environment Variables

If you're deploying to Vercel:

1. Go to your Vercel project settings → Environment Variables
2. **Delete** `PROVIDER_TOTAL_WINDOW_SECONDS` (if present)
3. **Add** `PROVIDER_WINDOW_SECONDS` with value `270` (or your preferred value)
4. **Add or update** `EPISODE_TARGET_MINUTES` with value `4` (or your preferred value)
5. Redeploy to apply changes

### 3. Verify Changes

After updating your environment:

**Local Development:**
```bash
# With no env vars set (should use defaults):
# - Provider window: 270 seconds
# - Episode target: 4 minutes

# With custom overrides:
PROVIDER_WINDOW_SECONDS=180 EPISODE_TARGET_MINUTES=6 npm run dev
```

**Run Tests:**
```bash
TEST_DATABASE_URL="postgresql://test:test@localhost:5432/test_db" npm test
```

## Default Values

| Variable | Default | Notes |
|----------|---------|-------|
| `PROVIDER_WINDOW_SECONDS` | `270` | 4.5 minutes - safe for Vercel Hobby |
| `EPISODE_TARGET_MINUTES` | `4` | Target episode length in minutes |

## Rollback Plan

If you need to rollback these changes:

1. Revert the commit containing these changes
2. Restore `PROVIDER_TOTAL_WINDOW_SECONDS` in your `.env` and Vercel settings
3. Redeploy

## Validation Checklist

Before merging, verify:

- ✅ No `PROVIDER_TOTAL_WINDOW_SECONDS` references in codebase
- ✅ No hardcoded `timeout: "600s"` strings remain
- ✅ No `providerTotalWindowSeconds` keys remain
- ✅ All tests pass
- ✅ TypeScript compilation succeeds
- ✅ Environment variables documented

## Questions?

If you encounter issues:
1. Check that your `.env` file is properly formatted
2. Verify no legacy variable names remain in your environment
3. Ensure positive numeric values for both variables
4. Check the console for `[ENV]` log messages in development mode
