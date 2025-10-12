# Public Episode Sharing Feature

## Overview
This feature allows users to make their user-generated episodes publicly accessible by toggling between public and private states. When an episode is made public, it's copied to a shared GCS bucket and can be accessed by anyone with the link.

## Architecture

### Database Changes
- Added `is_public` (boolean, default: false) field to `UserEpisode` model
- Added `public_gcs_audio_url` (string, nullable) to store the public GCS URL
- Added index on `is_public` for efficient querying

### GCS Buckets
- **Private Bucket**: `GOOGLE_CLOUD_STORAGE_BUCKET_NAME` - Stores private user episodes
- **Shared Bucket**: `GOOGLE_CLOUD_SHARED_STORAGE_BUCKET_NAME` - Stores public episodes with public access

### API Endpoints

#### Toggle Public/Private Status
`POST /api/user-episodes/[id]/toggle-public`

**Behavior:**
- If episode is private → Copies to shared bucket, makes public, updates DB
- If episode is public → Deletes from shared bucket (optional), updates DB to private
- Only completed episodes can be made public
- User must be active (have valid subscription)

### Public Route
`/shared/episodes/[id]` - Publicly accessible route (outside protected scope)

**Features:**
- No authentication required
- Only shows public episodes (`is_public: true`)
- Doesn't expose transcript in public view
- Shows episode metadata, summary, and embedded audio player
- Renders same UI as private episodes for consistency

### UI Components

#### PublicToggleButton
- Toggle button to switch between public/private
- Shows current state (Public/Private)
- Icon changes based on state (Globe/Lock)
- Toast notifications on state change
- Loading state during API call

#### PlayAndShare Updates
- Accepts `isPublic` prop
- Generates public URL (`/shared/episodes/[id]`) when episode is public
- Shows warning toast when sharing private episodes
- Success toast with context ("Anyone with this link can listen")

### User Flow

1. User creates an episode (defaults to private)
2. User navigates to episode detail page (`/my-episodes/[id]`)
3. User clicks "Private" button to make public
4. System:
   - Copies audio file from private bucket to shared bucket
   - Makes file public in shared bucket
   - Updates DB with `is_public: true` and `public_gcs_audio_url`
5. Button changes to "Public", share link now points to `/shared/episodes/[id]`
6. User can share the public link with anyone
7. To make private again, user clicks "Public" button
8. System:
   - Deletes file from shared bucket (optional - kept for now)
   - Updates DB with `is_public: false` and `public_gcs_audio_url: null`

### Security Considerations

- Only episode owner can toggle public/private status
- Only active users (with valid subscription) can make episodes public
- Only completed episodes can be made public
- Full transcript is not exposed in public view
- Private episodes return 404 on public route

### Environment Variables Required

```bash
GOOGLE_CLOUD_STORAGE_BUCKET_NAME=your-private-bucket
GOOGLE_CLOUD_SHARED_STORAGE_BUCKET_NAME=your-public-bucket
```

### File Structure

```
app/
  api/
    user-episodes/
      [id]/
        toggle-public/
          route.ts              # Toggle endpoint
  shared/
    episodes/
      [id]/
        page.tsx                # Public episode view
  (protected)/
    my-episodes/
      [id]/
        page.tsx                # Private episode view (updated)

components/
  features/
    episodes/
      public-toggle-button.tsx  # Toggle component
      play-and-share.tsx        # Updated with public URL support

lib/
  inngest/
    utils/
      gcs.ts                    # Updated with bucket utilities
```

### Testing Checklist

- [ ] Create a user episode
- [ ] Toggle episode to public
- [ ] Verify file exists in shared bucket
- [ ] Access episode via `/shared/episodes/[id]` (no auth)
- [ ] Verify audio plays from public URL
- [ ] Share public link with non-authenticated user
- [ ] Toggle episode back to private
- [ ] Verify public URL returns 404
- [ ] Test with inactive user (should fail)
- [ ] Test with non-completed episode (should fail)
- [ ] Test with non-owner user (should fail)

### Future Enhancements

- Analytics for public episode views
- Custom share links with slugs
- Social media preview cards (OpenGraph)
- Download limits or rate limiting
- Expiring share links
- Password-protected sharing

