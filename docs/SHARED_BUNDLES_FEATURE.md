# Shared Bundles Feature

## Overview
The Shared Bundles feature allows users with the `CURATE_CONTROL` plan to create and share collections of their generated episodes with other authenticated users.

## Features Implemented

### 1. Database Schema
**Location:** `prisma/schema.prisma`

Two new models added:
- `SharedBundle`: Represents a collection of shared episodes
  - `shared_bundle_id` (UUID, primary key)
  - `owner_user_id` (foreign key to User)
  - `name` (string, max 100 chars)
  - `description` (optional, max 500 chars)
  - `is_active` (boolean, default true)
  - `created_at` (timestamp)

- `SharedBundleEpisode`: Junction table linking bundles to episodes
  - Composite primary key: `(shared_bundle_id, episode_id)`
  - `display_order` (integer, for episode ordering)
  - `is_active` (boolean, for individual episode visibility)

**Migration:** `prisma/migrations/.../add_shared_bundles`

### 2. API Routes

#### Private Routes (Owner Only)

**POST `/api/shared-bundles`**
- Creates a new shared bundle
- Validations:
  - User must have `CURATE_CONTROL` plan
  - Maximum 5 bundles per user
  - Maximum 10 episodes per bundle
  - Episodes must be owned by user and in `COMPLETED` status
- Request body: `{ name, description?, episode_ids[] }`

**GET `/api/shared-bundles`**
- Lists all bundles owned by the current user
- Includes episode details and counts
- Returns bundles with full episode information

**PATCH `/api/shared-bundles/[bundleId]`**
- Updates bundle details and/or episode statuses
- Owner verification
- Request body: `{ name?, description?, is_active?, episodeUpdates? }`

**DELETE `/api/shared-bundles/[bundleId]`**
- Permanently deletes a bundle
- Validation: All episodes must be inactive before deletion
- Owner verification

#### Public Routes (Authenticated Users)

**GET `/api/public/shared-bundles/[bundleId]`**
- Fetches active bundle details for viewing
- Requires authentication but not ownership
- Only returns active bundles and episodes
- Exposes minimal user information (name only)

**GET `/api/public/shared-bundles/[bundleId]/episodes/[episodeId]/play`**
- Generates signed GCS URLs for episode audio playback
- **30-day expiration** (vs 15-minute for regular episodes)
- Validates bundle and episode are both active
- Requires authentication

### 3. UI Components

#### Create Bundle Modal
**Location:** `components/features/shared-bundles/create-bundle-modal.tsx`

Multi-step wizard:
1. **Bundle Details**: Name and description input
2. **Episode Selection**: Choose up to 10 completed episodes

Features:
- Real-time validation
- Episode filtering (completed only)
- Episode metadata display (title, date, duration)
- Maximum episode warning

#### Bundle Management List
**Location:** `app/(protected)/my-bundles/_components/bundle-list.tsx`

Features:
- Display all user bundles with metadata
- Active/Inactive status badges
- Quick actions:
  - Copy share link
  - Toggle bundle active/inactive
  - Navigate to detail page
  - Delete bundle
- Episode count display
- Created date

#### Bundle Detail Page
**Location:** `app/(protected)/my-bundles/[bundleId]/page.tsx`

Features:
- Edit bundle name and description
- Toggle individual episode active/inactive status
- Ordered episode list with metadata
- Copy share link
- Save/cancel edit mode
- Real-time validation

#### Public Bundle View
**Location:** `app/(protected)/shared/[bundleId]/page.tsx`

Features:
- View bundle details and owner information
- Play episodes directly from bundle
- Share bundle link
- Total duration calculation
- Episode ordering preserved

### 4. Pages

- **`/my-episodes`** - Updated with "Create Bundle" button
- **`/my-bundles`** - Bundle management dashboard
- **`/my-bundles/[bundleId]`** - Individual bundle detail/edit page
- **`/shared/[bundleId]`** - Public bundle viewing page

### 5. Navigation

Updated sidebar navigation to include "My Shared Bundles" link with Share2 icon.

## Validation Rules

### Bundle Creation
1. User must have `CURATE_CONTROL` plan
2. Maximum 5 bundles per user
3. Bundle name required (1-100 characters)
4. Description optional (max 500 characters)
5. Minimum 1 episode, maximum 10 episodes
6. All episodes must:
   - Be owned by the user
   - Have status `COMPLETED`

### Bundle Updates
1. Only owner can update
2. Episode status changes tracked individually
3. At least one field must be provided for update

### Bundle Deletion
1. Only owner can delete
2. All episodes must be inactive before deletion
3. Deletion is permanent (no soft delete)

### Public Viewing
1. Must be authenticated
2. Bundle must be active
3. Only active episodes shown
4. Audio URLs valid for 30 days

## Security Considerations

1. **Authentication**: All routes require Clerk authentication
2. **Authorization**: 
   - Ownership verified for management operations
   - Plan validation for bundle creation
3. **Data Exposure**: 
   - Public views only expose necessary information
   - User details limited to name
   - Audio URLs are time-limited signed URLs
4. **Rate Limiting**: Consider implementing rate limits on bundle creation

## Usage Limits (CURATE_CONTROL Plan)

- Maximum bundles: **5**
- Maximum episodes per bundle: **10**
- Signed URL duration: **30 days**

## File Structure

```
app/
├── (protected)/
│   ├── my-episodes/
│   │   ├── _components/
│   │   │   └── create-bundle-modal-wrapper.tsx
│   │   └── page.tsx (updated)
│   ├── my-bundles/
│   │   ├── [bundleId]/
│   │   │   ├── _components/
│   │   │   │   └── bundle-details-client.tsx
│   │   │   └── page.tsx
│   │   ├── _components/
│   │   │   └── bundle-list.tsx
│   │   └── page.tsx
│   └── shared/
│       └── [bundleId]/
│           ├── _components/
│           │   └── shared-bundle-view.tsx
│           └── page.tsx
├── api/
│   ├── shared-bundles/
│   │   ├── [bundleId]/
│   │   │   └── route.ts (PATCH, DELETE)
│   │   └── route.ts (GET, POST)
│   └── public/
│       └── shared-bundles/
│           └── [bundleId]/
│               ├── episodes/
│               │   └── [episodeId]/
│               │       └── play/
│               │           └── route.ts
│               └── route.ts
components/
└── features/
    └── shared-bundles/
        └── create-bundle-modal.tsx
```

## Testing Checklist

### Bundle Creation
- [ ] Create bundle with CURATE_CONTROL plan
- [ ] Attempt creation without proper plan (should fail)
- [ ] Create maximum number of bundles (5)
- [ ] Attempt to create 6th bundle (should fail)
- [ ] Add 1 episode to bundle
- [ ] Add 10 episodes to bundle
- [ ] Attempt to add 11th episode (should be prevented)

### Bundle Management
- [ ] Edit bundle name and description
- [ ] Toggle bundle active/inactive
- [ ] Toggle individual episode active/inactive
- [ ] Copy share link
- [ ] Delete bundle with active episodes (should fail)
- [ ] Disable all episodes, then delete bundle

### Public Viewing
- [ ] View active bundle as authenticated user
- [ ] Attempt to view inactive bundle (should fail)
- [ ] Play episode from shared bundle
- [ ] Share link works for other authenticated users
- [ ] Audio playback with 30-day signed URL

### Edge Cases
- [ ] Bundle with no episodes
- [ ] Bundle with deleted episodes
- [ ] Concurrent bundle edits
- [ ] Very long bundle names/descriptions
- [ ] Special characters in bundle names

## Future Enhancements

1. **Analytics**: Track bundle views and plays
2. **Collaboration**: Allow multiple owners/editors
3. **Comments**: Enable discussions on shared bundles
4. **Categories/Tags**: Organize bundles by topic
5. **Search**: Search within bundles and across all shared bundles
6. **Embed Player**: Widget for embedding bundles on external sites
7. **RSS Feed**: Generate RSS feeds for bundles
8. **Download**: Allow downloading entire bundle as zip
9. **Playlists**: Auto-play through bundle episodes
10. **Privacy Settings**: Granular sharing controls (public/private/link-only)

## Notes

- All timestamps are in UTC
- Bundle IDs are UUIDs for security
- Episode ordering is preserved via `display_order` field
- Soft delete not implemented (bundles are permanently deleted)
- Consider adding bundle versioning for future updates
