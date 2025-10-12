# Setup Guide: Public Episode Sharing

## Environment Variables

Add the following environment variable to your `.env` file:

```bash
# Shared/Public GCS Bucket for public episode sharing
GOOGLE_CLOUD_SHARED_STORAGE_BUCKET_NAME=your-public-bucket-name
```

### Bucket Setup

1. Create a new GCS bucket for public sharing:
   ```bash
   gsutil mb -p your-project-id -l us-central1 gs://your-public-bucket-name
   ```

2. Make the bucket publicly accessible:
   ```bash
   gsutil iam ch allUsers:objectViewer gs://your-public-bucket-name
   ```

3. Configure CORS for the public bucket:
   ```bash
   gsutil cors set cors.json gs://your-public-bucket-name
   ```

## Database Migration

The database schema has been updated and pushed. The new fields are:
- `user_episode.is_public` (boolean, default: false)
- `user_episode.public_gcs_audio_url` (text, nullable)

No action needed if you've already run `npx prisma db push`.

## Testing the Feature

1. **Create a test episode:**
   - Navigate to `/my-episodes`
   - Create a new episode from YouTube or news

2. **Make it public:**
   - Go to the episode detail page (`/my-episodes/[id]`)
   - Click the "Private" button in the top right
   - Should change to "Public" with a success toast

3. **Verify public access:**
   - Copy the share link (click "Share" button)
   - Open in incognito/private window
   - Should see the episode at `/shared/episodes/[id]`
   - Audio should play without authentication

4. **Make it private again:**
   - Click "Public" button
   - Should revert to "Private"
   - Public link should now return 404

## Implementation Files

### New Files
- `app/api/user-episodes/[id]/toggle-public/route.ts` - API endpoint
- `app/shared/episodes/[id]/page.tsx` - Public episode page
- `components/features/episodes/public-toggle-button.tsx` - Toggle button

### Modified Files
- `prisma/schema.prisma` - Added fields to UserEpisode model
- `lib/inngest/utils/gcs.ts` - Added bucket utility functions
- `components/features/episodes/play-and-share.tsx` - Added public URL support
- `app/(protected)/my-episodes/[id]/page.tsx` - Added toggle button

### Documentation
- `docs/PUBLIC_EPISODE_SHARING.md` - Feature documentation
- `docs/SETUP_PUBLIC_SHARING.md` - This file

