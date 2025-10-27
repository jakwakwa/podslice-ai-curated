# Optimistic UI Update Implementation

## Overview
This document explains the optimistic UI update pattern implemented for the public/private episode toggle feature. This pattern ensures users see immediate feedback when toggling episode visibility, with the share URL updating instantly from `/my-episodes/[id]` to `/shared/episodes/[id]`.

## What is Optimistic UI?
Optimistic UI is a pattern where the user interface updates immediately when a user performs an action, **before** waiting for the server to confirm the change. The assumption is that the action will succeed (we're "optimistic"), providing instant feedback to users.

## Implementation Flow

### 1. User Action
User clicks the "Public/Private" toggle button on an episode page.

### 2. Immediate UI Update (Optimistic)
```
┌─────────────────────────────────┐
│ PublicToggleButton              │
│ • Stores previous state         │
│ • Updates local state to new    │
│ • Calls onToggleSuccess callback│
│ • Sends API request             │
└─────────────┬───────────────────┘
              │
              │ onToggleSuccess(newState)
              ▼
┌─────────────────────────────────┐
│ EpisodeActionsWrapper           │
│ • Receives state update         │
│ • Forwards to PlayAndShare      │
└─────────────┬───────────────────┘
              │
              │ updateCallback(newState)
              ▼
┌─────────────────────────────────┐
│ PlayAndShare                    │
│ • Updates isPublic state        │
│ • Recomputes shareUrl via memo  │
│ • ShareDialog shows new URL     │
└─────────────────────────────────┘
```

### 3. Network Request
API call is made to `/api/user-episodes/[id]/toggle-public` in the background.

### 4a. Success Path
- Server confirms the change
- UI already displays correct state
- Success toast notification shown
- No additional UI updates needed

### 4b. Failure Path (Rollback)
- Server returns an error
- UI reverts to previous state
- Error toast notification shown
- Share URL reverts to original value

## Key Components

### EpisodeActionsWrapper (New)
**File:** `components/features/episodes/episode-actions-wrapper.tsx`

Client component that coordinates state between `PlayAndShare` and `PublicToggleButton`.

**Responsibilities:**
- Manages the callback reference bridge
- Allows PublicToggleButton to notify PlayAndShare of state changes
- Registers PlayAndShare's update callback

**Key Pattern:**
```typescript
const playAndShareCallbackRef = useRef<((newIsPublic: boolean) => void) | null>(null);

// PublicToggleButton calls this when state changes
const handleToggleSuccess = (newIsPublic: boolean) => {
  if (playAndShareCallbackRef.current) {
    playAndShareCallbackRef.current(newIsPublic);
  }
};

// PlayAndShare registers its callback here
const registerPlayAndShareCallback = (callback: (newIsPublic: boolean) => void) => {
  playAndShareCallbackRef.current = callback;
};
```

### PlayAndShare (Modified)
**File:** `components/features/episodes/play-and-share.tsx`

**Changes:**
- Now manages local `isPublic` state (initialized from prop)
- Accepts `onPublicStateChange` callback prop
- Registers its state updater with the parent
- Recomputes `shareUrl` when `isPublic` changes

**Key Implementation:**
```typescript
const [isPublic, setIsPublic] = useState(initialIsPublic);

// Register callback for when toggle button updates the state
useEffect(() => {
  if (onPublicStateChange) {
    onPublicStateChange((newIsPublic: boolean) => {
      setIsPublic(newIsPublic);
    });
  }
}, [onPublicStateChange]);

// shareUrl recomputes automatically via useMemo
const shareUrl = useMemo(() => {
  if (kind === "user" && isPublic) {
    return `${window.location.origin}/shared/episodes/${episodeId}`;
  }
  return window.location.href;
}, [kind, isPublic, episode]);
```

### PublicToggleButton (Modified)
**File:** `components/features/episodes/public-toggle-button.tsx`

**Changes:**
- Implements optimistic update pattern
- Updates UI **before** API call
- Calls `onToggleSuccess` callback immediately
- Rolls back state on error

**Key Implementation:**
```typescript
const handleToggle = async () => {
  const previousState = isPublic;
  const newState = !isPublic;
  
  // OPTIMISTIC UPDATE: Update UI immediately
  setIsPublic(newState);
  onToggleSuccess?.(newState);
  setIsLoading(true);

  try {
    const response = await fetch(...);
    // Success handling
  } catch (error) {
    // ROLLBACK: Revert to previous state on failure
    setIsPublic(previousState);
    onToggleSuccess?.(previousState);
    // Show error toast
  }
};
```

### Episode Page (Modified)
**File:** `app/(protected)/my-episodes/[id]/page.tsx`

**Changes:**
- Uses `EpisodeActionsWrapper` instead of individual components
- Simplified component structure

**Before:**
```tsx
<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
  <PlayAndShare ... />
  <PublicToggleButton ... />
</div>
```

**After:**
```tsx
<EpisodeActionsWrapper
  episode={episode}
  signedAudioUrl={episode.signedAudioUrl}
  isPublic={episode.is_public}
/>
```

## Benefits

### User Experience
1. **Instant Feedback**: Users see changes immediately without waiting for the server
2. **Perceived Performance**: App feels faster and more responsive
3. **Correct Share URLs**: Share dialog always shows the correct URL for the current state
4. **No Page Refresh Needed**: State updates happen in-place

### Technical Benefits
1. **Clean Separation**: Each component has a single responsibility
2. **Type Safety**: Full TypeScript support throughout
3. **Error Handling**: Graceful rollback on failures
4. **Reusability**: Pattern can be applied to other optimistic updates

## Testing Scenarios

### Happy Path
1. Episode starts as private
2. User clicks "Make Public" button
3. Button immediately shows "Public" state
4. Share URL immediately updates to `/shared/episodes/[id]`
5. Server confirms change
6. Success toast appears
7. State remains as "Public"

### Error Path
1. Episode is private
2. User clicks "Make Public" button
3. Button immediately shows "Public" state
4. Share URL immediately updates
5. Server returns error (e.g., network failure)
6. Button reverts to "Private" state
7. Share URL reverts to `/my-episodes/[id]`
8. Error toast appears

### Edge Cases
- **Server Mismatch**: If server returns different state than expected, UI corrects itself
- **Rapid Toggling**: Loading state prevents multiple concurrent requests
- **Component Unmount**: Cleanup prevents state updates on unmounted components

## Future Enhancements

Potential improvements to consider:
1. Add loading skeleton in ShareDialog during optimistic update
2. Implement retry logic for failed requests
3. Add analytics tracking for toggle actions
4. Consider implementing with a state management library (Zustand/Jotai) for more complex scenarios

## Related Files
- `components/features/episodes/episode-actions-wrapper.tsx` (new)
- `components/features/episodes/play-and-share.tsx` (modified)
- `components/features/episodes/public-toggle-button.tsx` (modified)
- `components/features/episodes/share-dialog.tsx` (unchanged, but benefits from updates)
- `app/(protected)/my-episodes/[id]/page.tsx` (modified)

