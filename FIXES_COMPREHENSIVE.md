# Comprehensive Fixes for Size Limit Issues

## Problems Identified

### 1. Inngest Opcode Size Limit
**Error:** `"step output size is greater than the limit"`  
**Cause:** Returning large base64-encoded audio data (multiple MB) from Inngest steps

### 2. Prisma Response Size Limit  
**Error:** `"The response size of the query exceeded the maximum of 4MB with 5.19MB"`  
**Cause:** Fetching all UserEpisode fields including huge `transcript` and `summary` text fields

### 3. Memory Pressure
**Cause:** Accumulating multiple large base64 strings in memory during episode generation

## Solutions Implemented

### ✅ 1. GCS-Based Chunk Storage (Inngest Fix)

**Problem:** Returning audio chunks from steps exceeded Inngest's output size limit.

**Solution:** Upload chunks to GCS immediately, return only URLs from steps.

**Files Changed:**
- `lib/inngest/user-episode-generator.ts`
- `lib/inngest/user-episode-generator-multi.ts`  
- `lib/inngest/admin-episode-generator.ts`

**How It Works:**
```typescript
// OLD (BROKEN): Return large base64 data from steps
const chunks = await step.run("tts", async () => {
    const audio = await generateTTS(text);
    return audio.toString("base64"); // ❌ Too large!
});

// NEW (ROBUST): Upload to GCS, return only URLs
const chunkUrls = await step.run("tts", async () => {
    const urls = [];
    for (const part of parts) {
        const audio = await generateTTS(part);
        const gcsUrl = await uploadToGCS(audio, `temp/chunk-${i}.wav`);
        urls.push(gcsUrl); // ✅ Only URLs (small)
    }
    return urls;
});

// Later: Download, combine, upload final
await step.run("combine", async () => {
    const chunks = await Promise.all(
        chunkUrls.map(url => downloadFromGCS(url))
    );
    const final = combineWavs(chunks);
    await uploadToGCS(final, "final.wav");
    // Clean up temp files
});
```

**Benefits:**
- ✅ Step outputs are tiny (just URLs)
- ✅ No memory pressure
- ✅ Automatic cleanup of temp files
- ✅ Works for episodes of any length

---

### ✅ 2. Selective Field Loading (Prisma Fix)

**Problem:** Fetching all fields loaded multi-MB transcript/summary data, exceeding Prisma's 4MB response limit.

**Solution:** Explicitly exclude large fields in list queries.

**Files Changed:**
- `app/api/user-episodes/list/route.ts`
- `app/api/user-episodes/route.ts`
- `app/api/user-episodes/[id]/route.ts` (documented)

**How It Works:**
```typescript
// OLD (BROKEN): Fetch all fields
const episodes = await prisma.userEpisode.findMany({
    where: { user_id: userId },
});
// ❌ Returns transcript & summary = multi-MB response

// NEW (ROBUST): Exclude large fields
const episodes = await prisma.userEpisode.findMany({
    where: { user_id: userId },
    select: {
        episode_id: true,
        episode_title: true,
        // ... other small fields
        // Explicitly EXCLUDED: transcript, summary
    },
});
// ✅ Response stays under 4MB
```

**Rules:**
- **List queries** (`findMany`): ALWAYS exclude `transcript` and `summary`
- **Detail queries** (`findUnique`): Can include all fields (single record)

---

### ✅ 3. Prisma Query Helpers

**Problem:** Easy to accidentally load huge fields in future code.

**Solution:** Created typed select objects to enforce safe patterns.

**File Created:** `lib/prisma-helpers.ts`

**Usage:**
```typescript
import { userEpisodeListSelect } from "@/lib/prisma-helpers";

// Safe list query
const episodes = await prisma.userEpisode.findMany({
    where: { user_id: userId },
    select: userEpisodeListSelect, // ✅ Automatically excludes large fields
});

// Type-safe
import type { UserEpisodeListItem } from "@/lib/prisma-helpers";
const episode: UserEpisodeListItem = episodes[0]; // ✅ Type checked
```

**Benefits:**
- ✅ Prevents future bugs
- ✅ Type-safe
- ✅ Self-documenting
- ✅ Centralized field lists

---

## Architecture Pattern: Chunked Processing with GCS

The new pattern for handling large data in Inngest:

```
1. Generate chunk
     ↓
2. Upload to GCS immediately
     ↓
3. Return only GCS URL from step
     ↓
4. Download chunks in combine step
     ↓
5. Process & upload final
     ↓
6. Clean up temp chunks
```

**Key Principles:**
1. **Never return large data from steps** - Only metadata/URLs
2. **Use GCS as intermediate storage** - Not memory or step outputs
3. **Clean up temp files** - Delete chunks after combining
4. **Fail gracefully** - Wrap cleanup in try/catch

---

## Testing & Validation

### ✅ TypeScript Compilation
```bash
npx tsc --noEmit
# ✅ Passes
```

### ✅ Prisma Queries
- List endpoints now exclude large fields
- Single episode fetch still works (under 4MB per record)

### ✅ Inngest Workflows  
- Step outputs are now small (array of URLs)
- No more opcode size errors
- Memory usage reduced

---

## Environment Variables (Recap)

From the previous refactoring, these are now env-driven:

```bash
# Provider timeout (seconds)
PROVIDER_WINDOW_SECONDS=270  # 4.5 min for Hobby

# Episode target length (minutes)
EPISODE_TARGET_MINUTES=4  # Default

# Max input video length (seconds)
MAX_DURATION_SECONDS=7200  # 2 hours
```

---

## Migration Checklist

- [x] Fixed Inngest opcode size limit (GCS chunk storage)
- [x] Fixed Prisma response size limit (selective fields)
- [x] Created query helpers (future-proofing)
- [x] Updated all 3 episode generators
- [x] TypeScript passes
- [x] Environment variables refactored
- [x] Unit tests added for env helpers
- [x] Documentation created

---

## Limits Summary

| System | Limit | Our Solution |
|--------|-------|--------------|
| **Inngest step output** | ~few MB | Store in GCS, return URLs only |
| **Prisma response** | 4 MB | Exclude large fields in list queries |
| **Vercel Hobby serverless** | 5 min execution | Offload work to Inngest |
| **Memory** | Limited | Stream to GCS, don't accumulate in RAM |

---

## Key Takeaways

1. **Think about data size at every boundary:**
   - Step inputs/outputs
   - API responses
   - Database queries
   - Memory accumulation

2. **Use external storage for large data:**
   - GCS for audio/video/large text
   - Return references, not content

3. **Be explicit about fields:**
   - Don't use `select: *` for large tables
   - Create typed helpers to enforce patterns

4. **Design for scale:**
   - What works for 1 episode should work for 100
   - Consider worst-case sizes, not averages

---

## Future Improvements

1. **Consider pagination** for episode lists (if users have 100+ episodes)
2. **Add response size monitoring** to catch issues early
3. **Cache generated audio chunks** (before combining) for retry efficiency
4. **Compress large text fields** before storing in DB

---

## Rollback Plan

If issues occur:
1. Revert to previous commit
2. Restore old env vars (PROVIDER_TOTAL_WINDOW_SECONDS)
3. Redeploy

The changes are isolated to episode generation and list APIs, so rollback risk is low.
