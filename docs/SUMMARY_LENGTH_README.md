# Summary Length Feature Documentation

## Overview

The Summary Length feature allows users to choose between three different episode durations when creating their own episodes:

- **Quick Slice (2-3 mins)** - 1 credit
- **Standard Summary (5-7 mins)** - 1 credit  
- **Deep Dive (7-10 mins)** - 2 credits

This feature implements a **weighted usage system** where longer episodes consume more of the user's monthly episode quota.

## Architecture

### Database Schema

```prisma
model UserEpisode {
  // ... existing fields
  summary_length  String  @default("MEDIUM") @map("summary_length")
  // ... remaining fields
}
```

**Valid values:** `"SHORT"`, `"MEDIUM"`, `"LONG"`

**Default:** `"MEDIUM"` (backwards compatible with existing episodes)

### Type Definitions

Location: `lib/types/summary-length.ts`

```typescript
export const SUMMARY_LENGTH_OPTIONS = {
  SHORT: {
    minutes: [2, 3],      // Target duration range
    words: [280, 540],    // Target word count for script
    label: "Quick Slice (2-3 mins)",
    description: "Perfect for a quick overview",
    usageCount: 1,        // Credits consumed
  },
  MEDIUM: { /* ... */ usageCount: 1 },
  LONG: { /* ... */ usageCount: 2 },  // Double credit cost
}
```

## API Reference

### Core Functions

#### `getSummaryLengthConfig(length: SummaryLengthOption)`

Retrieves the configuration object for a specific summary length.

**Parameters:**
- `length`: `"SHORT"` | `"MEDIUM"` | `"LONG"`

**Returns:** Configuration object with `minutes`, `words`, `label`, `description`, and `usageCount`

**Example:**
```typescript
const config = getSummaryLengthConfig("LONG");
console.log(config.minutes);    // [7, 10]
console.log(config.usageCount); // 2
```

---

#### `calculateWeightedUsage(episodes: Array<{ summary_length?: string | null }>)`

Calculates the total weighted usage count for a collection of episodes.

**Parameters:**
- `episodes`: Array of episode objects with optional `summary_length` field

**Returns:** `number` - Total weighted credit usage

**Behavior:**
- `SHORT` episodes count as 1 credit
- `MEDIUM` episodes count as 1 credit
- `LONG` episodes count as 2 credits
- `null` or `undefined` defaults to `MEDIUM` (1 credit)
- Invalid values default to `MEDIUM` (1 credit)

**Example:**
```typescript
const episodes = [
  { summary_length: "SHORT" },  // 1
  { summary_length: "LONG" },   // 2
  { summary_length: null },     // 1 (defaults to MEDIUM)
];
const usage = calculateWeightedUsage(episodes); // Returns 4
```

---

#### `canCreateEpisode(currentUsage, requestedLength, episodeLimit)`

Checks if a user has sufficient credits to create an episode of the given length.

**Parameters:**
- `currentUsage`: `number` - Current weighted usage count
- `requestedLength`: `SummaryLengthOption` - Desired episode length
- `episodeLimit`: `number` - User's total episode limit

**Returns:** Object with:
```typescript
{
  canCreate: boolean,              // Whether episode can be created
  remainingCredits: number,        // Credits available before creation
  requiredCredits: number,         // Credits needed for this episode
  remainingAfterCreation: number   // Credits that would remain after
}
```

**Example:**
```typescript
const result = canCreateEpisode(28, "LONG", 30);
// {
//   canCreate: true,
//   remainingCredits: 2,
//   requiredCredits: 2,
//   remainingAfterCreation: 0
// }
```

---

#### `getInsufficientCreditsMessage(currentUsage, requestedLength, episodeLimit)`

Generates a user-friendly error message when episode creation is blocked.

**Parameters:**
- `currentUsage`: `number` - Current weighted usage count
- `requestedLength`: `SummaryLengthOption` - Desired episode length
- `episodeLimit`: `number` - User's total episode limit

**Returns:** `string` - Formatted error message

**Example:**
```typescript
const message = getInsufficientCreditsMessage(29, "LONG", 30);
// "Creating this deep dive (7-10 mins) episode would exceed your limit. 
//  You have 1 credit remaining, but this episode requires 2 credits."
```

## Usage in API Routes

### Episode Creation Flow

```typescript
// app/api/user-episodes/create/route.ts
import { 
  calculateWeightedUsage, 
  canCreateEpisode,
  getInsufficientCreditsMessage,
  SUMMARY_LENGTH_OPTIONS 
} from "@/lib/types/summary-length";

export async function POST(request: Request) {
  const { summaryLength } = await request.json();
  
  // 1. Fetch completed episodes with their lengths
  const completedEpisodes = await prisma.userEpisode.findMany({
    where: { user_id: userId, status: "COMPLETED" },
    select: { summary_length: true },
  });
  
  // 2. Calculate current weighted usage
  const currentUsage = calculateWeightedUsage(completedEpisodes);
  
  // 3. Check if creation is allowed
  const check = canCreateEpisode(currentUsage, summaryLength, EPISODE_LIMIT);
  
  if (!check.canCreate) {
    const message = getInsufficientCreditsMessage(
      currentUsage,
      summaryLength,
      EPISODE_LIMIT
    );
    return new NextResponse(message, { status: 403 });
  }
  
  // 4. Create episode with summary_length
  const episode = await prisma.userEpisode.create({
    data: {
      // ... other fields
      summary_length: summaryLength,
    },
  });
  
  // 5. Pass to Inngest for processing
  await inngest.send({
    name: "user.episode.generate.requested",
    data: { userEpisodeId: episode.episode_id, summaryLength },
  });
}
```

## Usage in Inngest Functions

### Script Generation with Length Adjustment

```typescript
// lib/inngest/user-episode-generator.ts
import { getSummaryLengthConfig } from "@/lib/types/summary-length";

export const generateUserEpisode = inngest.createFunction(
  { /* config */ },
  { event: "user.episode.generate.requested" },
  async ({ event, step }) => {
    const { userEpisodeId, summaryLength = "MEDIUM" } = event.data;
    
    const script = await step.run("generate-script", async () => {
      // Get word/minute targets based on selected length
      const config = getSummaryLengthConfig(summaryLength);
      const [minWords, maxWords] = config.words;
      const [minMinutes, maxMinutes] = config.minutes;
      
      return genText(
        modelName,
        `Write a ${minWords}-${maxWords} word (about ${minMinutes}-${maxMinutes} minutes) podcast segment...`
      );
    });
  }
);
```

## Usage in UI Components

### Summary Length Selector

```typescript
import { SummaryLengthSelector } from "@/components/features/episode-generation/summary-length-selector";

function EpisodeCreator() {
  const [summaryLength, setSummaryLength] = useState<SummaryLengthOption>("MEDIUM");
  const [showWarning, setShowWarning] = useState(false);
  
  return (
    <>
      <SummaryLengthSelector
        value={summaryLength}
        onChange={setSummaryLength}
        onLongOptionSelect={() => setShowWarning(true)}
        disabled={isCreating}
      />
      
      <LongEpisodeWarningDialog
        open={showWarning}
        onOpenChange={setShowWarning}
        remainingCredits={usage.limit - usage.count}
        onConfirm={() => {
          setSummaryLength("LONG");
          setShowWarning(false);
        }}
      />
    </>
  );
}
```

## Integration Points

### Files Modified

1. **Database Layer**
   - `prisma/schema.prisma` - Added `summary_length` field

2. **API Routes**
   - `app/api/user-episodes/create/route.ts` - Validation & usage checking
   - `app/api/user-episodes/create-news/route.ts` - Same as above
   - `app/api/user-episodes/route.ts` - Weighted count calculation

3. **Background Jobs**
   - `lib/inngest/user-episode-generator.ts` - Script length adjustment
   - `lib/inngest/user-episode-generator-multi.ts` - Multi-speaker script adjustment
   - `lib/inngest/user-news-episode-generator.ts` - News episode adjustment

4. **UI Components**
   - `components/features/episode-generation/summary-length-selector.tsx` (NEW)
   - `components/features/episode-generation/long-episode-warning-dialog.tsx` (NEW)
   - `app/(protected)/my-episodes/_components/episode-creator.tsx`
   - `components/dashboard/episode-status-table.tsx` - Visual indicators

5. **State Management**
   - `lib/stores/user-episodes-store.ts` - Weighted count fetching

## Testing

### Verification Script

Run comprehensive tests without database setup:

```bash
npx tsx scripts/verify-summary-length.ts
```

This script tests:
- Configuration constants
- Utility function calculations
- Edge cases (null, invalid values)
- Integration scenarios

### Unit Tests

```bash
pnpm test summary-length
```

**Note:** Requires test database configuration. See `tests/summary-length.test.ts`

### Manual Testing Checklist

- [ ] Create SHORT episode - uses 1 credit
- [ ] Create MEDIUM episode - uses 1 credit
- [ ] Create LONG episode - uses 2 credits
- [ ] Warning dialog appears when selecting LONG
- [ ] Cannot create LONG with only 1 credit remaining
- [ ] Can create SHORT/MEDIUM with 1 credit remaining
- [ ] Usage display shows weighted count correctly
- [ ] Episode lists show length indicators
- [ ] Legacy episodes (null length) work correctly

## Migration Guide

### Existing Episodes

All existing episodes will have `summary_length = "MEDIUM"` by default. This is:

✅ **Backwards compatible** - No data migration needed  
✅ **Credit neutral** - MEDIUM = 1 credit (same as before)  
✅ **User transparent** - No impact on existing usage calculations

### Database Migration

The schema change is **non-breaking**:

```sql
-- Applied automatically by Prisma
ALTER TABLE "user_episode" 
ADD COLUMN "summary_length" TEXT DEFAULT 'MEDIUM';
```

No manual data migration required.

## Error Handling

### Common Scenarios

**1. Insufficient Credits**
```
Status: 403 Forbidden
Message: "Creating this deep dive (7-10 mins) episode would exceed your limit. 
         You have 1 credit remaining, but this episode requires 2 credits."
```

**2. Invalid Length Value**
```
Status: 400 Bad Request
Message: Zod validation error (handled by API schema)
```

**3. Missing Length Parameter**
- Defaults to `"MEDIUM"`
- No error thrown

## Performance Considerations

### Database Queries

The weighted usage calculation requires fetching `summary_length` for all completed episodes:

```typescript
// Efficient: Only fetch needed field
const episodes = await prisma.userEpisode.findMany({
  where: { user_id: userId, status: "COMPLETED" },
  select: { summary_length: true }, // Only this field
});
```

**Impact:** Minimal - `summary_length` is a small string field

### Caching Strategy

Consider caching weighted usage count:

```typescript
// Cache in user session or Redis
const cachedUsage = await getFromCache(`usage:${userId}`);
if (cachedUsage !== null) return cachedUsage;

const episodes = await fetchEpisodes();
const usage = calculateWeightedUsage(episodes);
await setCache(`usage:${userId}`, usage, { ttl: 300 }); // 5 min
```

## Future Enhancements

### Potential Features

1. **Dynamic Pricing**
   - Different credit costs based on user plan
   - Premium plans: LONG episodes = 1.5 credits instead of 2

2. **Custom Length Ranges**
   - Allow users to specify exact minute targets
   - "I want a 4-minute episode"

3. **Length-Based Quality**
   - LONG episodes get more detailed analysis
   - SHORT episodes use faster models

4. **Analytics**
   - Track which lengths are most popular
   - Optimize word counts based on actual durations

5. **Rollover Credits**
   - Unused credits roll over to next month
   - Max 10 rollover credits

### Implementation Considerations

All enhancements should:
- Maintain backwards compatibility
- Use the existing weighted usage system
- Not break the credit calculation logic
- Be testable with existing verification script

## Troubleshooting

### Issue: Episodes not counting correctly

**Check:**
1. Episode status is `COMPLETED` (PENDING/FAILED don't count)
2. `summary_length` field is valid (`"SHORT"`, `"MEDIUM"`, or `"LONG"`)
3. Calculation includes current billing period only

**Debug:**
```typescript
const episodes = await prisma.userEpisode.findMany({
  where: { user_id: userId, status: "COMPLETED" },
  select: { summary_length: true, created_at: true },
});
console.log("Episodes:", episodes);
console.log("Weighted usage:", calculateWeightedUsage(episodes));
```

### Issue: User can't create LONG episode

**Check:**
1. Remaining credits: `limit - currentUsage >= 2`
2. Warning dialog appears and user confirmed
3. API receives correct `summaryLength` parameter

**Debug:**
```typescript
const check = canCreateEpisode(currentUsage, "LONG", episodeLimit);
console.log("Can create:", check);
```

### Issue: Generated episode wrong length

**Check:**
1. Inngest function received `summaryLength` parameter
2. Script generation uses correct word counts
3. TTS doesn't truncate audio

**Note:** Actual duration varies due to:
- Speaking pace of TTS voice
- Complexity of content
- Natural pauses in speech

## Support

### Key Files
- Type definitions: `lib/types/summary-length.ts`
- Verification script: `scripts/verify-summary-length.ts`
- Tests: `tests/summary-length.test.ts`

### Resources
- Implementation plan: See project documentation
- API reference: This document
- Testing guide: Run `npx tsx scripts/verify-summary-length.ts`

---

**Last Updated:** Phase 1 Implementation  
**Version:** 1.0.0  
**Status:** ✅ Database & Types Complete