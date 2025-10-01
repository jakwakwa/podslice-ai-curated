# Episode Card Refactoring

## Overview

This refactoring standardizes the play button styling and behavior across all episode cards in the application, reducing code duplication and ensuring consistency.

## Changes Made

### 1. **Standardized PlayButton Component** (`components/episodes/play-button.tsx`)

A canonical play button component that enforces consistent styling:

- **Variant**: `play`
- **Size**: `sm`
- **Icon**: `PlayIcon`
- **Base className**: `btn-playicon rounded-[14px]`

**Features**:
- Consistent accessibility with `aria-label` and `aria-pressed`
- Optional `isPlaying` prop for active state
- Keyboard navigation support (Enter/Space)
- Extensible className for custom styling

**Usage**:
```tsx
import { PlayButton } from "@/components/episodes/play-button";

<PlayButton
  onClick={() => playEpisode(episode)}
  aria-label={`Play ${episode.title}`}
  isPlaying={false}
/>
```

### 2. **Episode Normalization Utilities** (`lib/episodes/normalize.ts`)

Type-safe utilities to work with both `Episode` and `UserEpisode` types:

- `normalizeEpisode()` - Converts any episode to a consistent shape
- `isUserEpisode()` - Type guard for UserEpisode
- `isBundleEpisode()` - Type guard for Episode
- `getArtworkUrlForEpisode()` - Smart artwork URL resolution
- `normalizeEpisodes()` - Batch normalization

**Benefits**:
- Single source of truth for episode data structure
- Type-safe episode handling
- Easier to add new episode sources in the future

### 3. **Episode Player Hook** (`hooks/use-episode-player.ts`)

Abstraction layer over the audio player store:

```tsx
import { useEpisodePlayer } from "@/hooks/use-episode-player";

const { playEpisode, isPlaying } = useEpisodePlayer();

// Play any episode type
playEpisode(episode);

// Check if episode is playing
const playing = isPlaying(episode.episode_id);
```

**Benefits**:
- Decouples components from store implementation
- Easier to test
- Consistent logging and debugging

## Pages Migrated

### ✅ Dashboard (`app/(protected)/dashboard/page.tsx`)
- **Latest Bundle Episode**: Now uses `PlayButton`
- **User Episodes**: Now uses `PlayButton`
- All play buttons have consistent styling and aria-labels

### ✅ Episodes (`app/(protected)/episodes/page.tsx`)
- **Episode List**: Migrated from `variant="ghost"` to `PlayButton`
- Removed custom play button styling
- Maintains existing filtering and download logic

### ✅ My Episodes (`app/(protected)/my-episodes/page.tsx`)
- **User Episode List**: Now uses `PlayButton`
- Removed inline styling hacks (`outline-accent outline-1 w-32`)
- Consistent with other pages

## Code Reduction

### Before:
- **3 different play button implementations**
- Inconsistent variants: `play`, `ghost`, custom styling
- Inconsistent icon sizes: `64`, `32`, default
- Repeated normalization logic
- Direct store access in multiple places

### After:
- **1 canonical PlayButton component**
- Consistent `variant="play"` and `size="sm"`
- Standard icon size
- Centralized normalization utilities
- Clean hook abstraction for player integration

## Visual Consistency

All episode cards now have:
- ✅ Same play button variant and size
- ✅ Same rounded corners (`rounded-[14px]`)
- ✅ Same base classes (`btn-playicon`)
- ✅ Consistent hover/focus states
- ✅ Proper accessibility attributes

## Testing Recommendations

1. **Unit Tests**:
   - `PlayButton` component rendering and props
   - Episode normalization utilities
   - `useEpisodePlayer` hook

2. **Integration Tests**:
   - Play button click updates audio player
   - Episode selection from all three pages
   - Deep linking behavior

3. **Visual QA**:
   - Verify identical button appearance across pages
   - Check hover/focus states
   - Validate responsiveness

4. **Accessibility**:
   - Screen reader announces episode titles correctly
   - Keyboard navigation works consistently
   - Focus indicators are visible

## Advanced Components (Implemented)

### 4. **PlayableEpisodeCard Component** (`components/episodes/playable-episode-card.tsx`)

Unified component that renders episode cards consistently:

```tsx
import { PlayableEpisodeCard } from "@/components/episodes";

<PlayableEpisodeCard
  episode={episode}
  showDownload={hasTier3Access}
  selected={false}
  isPlaying={isCurrentlyPlaying}
  onPlay={(ep) => customPlayHandler(ep)}
  renderActions={(ep) => <CustomButton />}
/>
```

**Features**:
- Works with both Episode and UserEpisode
- Automatic episode normalization
- Built-in download support for tier 3
- Extensible actions via renderActions
- Selection and playing states

### 5. **UnifiedEpisodeList Component** (`components/episodes/unified-episode-list.tsx`)

Single component for rendering episode lists:

```tsx
import { UnifiedEpisodeList } from "@/components/episodes";

<UnifiedEpisodeList
  episodes={episodes}
  showDownload={hasTier3Access}
  selectedId={selectedEpisodeId}
  playingEpisodeId={currentEpisodeId}
  filterCompleted={true}
  autoScrollToSelected={true}
  layout="list" // or "grid"
  emptyState={<CustomEmptyState />}
  onPlayEpisode={(ep) => handlePlay(ep)}
  renderActions={(ep) => <CustomActions />}
/>
```

**Features**:
- List or grid layouts
- Auto-scroll to selected episode
- Filter completed episodes
- Custom empty state
- Per-episode custom actions
- Consistent PlayableEpisodeCard rendering

### 6. **Episode Normalization & Tests** (`lib/episodes/__tests__/normalize.test.ts`)

Comprehensive unit tests for all normalization utilities:
- ✅ Type guard tests (isUserEpisode, isBundleEpisode)
- ✅ Normalization tests (handles both episode types)
- ✅ Artwork URL resolution tests
- ✅ Edge case handling (missing data, null values)
- ✅ Batch normalization tests

## Implementation Status

### ✅ Completed

1. **Core Components**
   - ✅ PlayButton with canonical styling
   - ✅ PlayableEpisodeCard unified component
   - ✅ UnifiedEpisodeList consolidated list

2. **Utilities & Hooks**
   - ✅ Episode normalization utilities
   - ✅ useEpisodePlayer hook
   - ✅ Type guards and helpers

3. **Page Migrations**
   - ✅ Dashboard page
   - ✅ Episodes page
   - ✅ My Episodes page

4. **Infrastructure**
   - ✅ Barrel exports (components/episodes/index.ts)
   - ✅ Unit tests for normalization
   - ✅ TypeScript types
   - ✅ Documentation

5. **Features**
   - ✅ Deep-link auto-scroll (built into UnifiedEpisodeList)
   - ✅ Download button logic (built into PlayableEpisodeCard)
   - ✅ Selection highlighting
   - ✅ Playing state indication

### 📋 Remaining (Optional)

1. **Visual QA** - Manual verification of styling consistency
2. **Integration Tests** - Component integration with audio player
3. **E2E Tests** - Full user flow testing
4. **Performance Testing** - Bundle size and render performance
5. **Accessibility Audit** - Screen reader and keyboard nav testing
6. **Storybook Stories** - Visual component documentation

## Migration Guide

### For New Episode Cards:

```tsx
// ✅ DO: Use the shared PlayButton
import { PlayButton } from "@/components/episodes/play-button";
import { useEpisodePlayer } from "@/hooks/use-episode-player";

const { playEpisode } = useEpisodePlayer();

<PlayButton
  onClick={() => playEpisode(episode)}
  aria-label={`Play ${episode.title}`}
/>
```

```tsx
// ❌ DON'T: Create custom play buttons
<Button
  variant="ghost"
  onClick={...}
  icon={<PlayIcon size={32} />}
  className="custom-play-button"
/>
```

### For Episode Data:

```tsx
// ✅ DO: Use normalization utilities
import { normalizeEpisode } from "@/lib/episodes/normalize";

const normalized = normalizeEpisode(episode);
// Works with both Episode and UserEpisode!
```

## Rollback Plan

If issues arise:
1. The changes are non-breaking and backwards compatible
2. Original components still exist and can be reverted
3. Database schema unchanged
4. No API changes

## Related Files

**New Files**:
- `components/episodes/play-button.tsx`
- `components/episodes/index.ts`
- `lib/episodes/normalize.ts`
- `hooks/use-episode-player.ts`

**Modified Files**:
- `app/(protected)/dashboard/page.tsx`
- `components/episode-list.tsx`
- `app/(protected)/my-episodes/_components/episode-list.tsx`

## Questions?

Contact: [Your Team Contact Info]
