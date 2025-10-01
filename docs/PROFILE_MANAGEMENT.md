# Profile Management System

## Overview

The v0 AI Curated Podcast App uses a simplified profile management system where users can create and manage their personalized podcast feeds through bundle selection.

## System Architecture

### Current Implementation (Simplified)

The current system operates on a **single active profile** model with **immediate activation**:

1. **Profile Creation**: Users create a profile by selecting a curated bundle
2. **Immediate Activation**: Profiles are created in an active state (no draft/pending states)
3. **One Active Profile**: Users can only have one active profile at a time
4. **Bundle-Based**: Profiles are primarily bundle-based selections

### Key Features

- **Single Active Profile**: Each user can have exactly one active `UserCurationProfile` at a time
- **Bundle Selection**: Profiles are created by selecting from pre-curated podcast bundles
- **Plan Gating**: Bundles are gated by subscription plans (FREE_SLICE, CASUAL_LISTENER, CURATE_CONTROL)
- **Immediate Access**: Once created, profiles provide immediate access to episodes from selected bundles

## Database Schema

```prisma
model UserCurationProfile {
  profile_id            String           @id @default(uuid())
  user_id               String           @unique
  name                  String
  audio_url             String?
  image_url             String?
  created_at            DateTime         @default(now())
  updated_at            DateTime         @updatedAt
  generated_at          DateTime?
  last_generation_date  DateTime?
  next_generation_date  DateTime?
  is_active             Boolean          @default(true)
  is_bundle_selection   Boolean          @default(false)
  selected_bundle_id    String?
  
  episodes              Episode[]
  profile_podcast       ProfilePodcast[]
  selectedBundle        Bundle?          @relation(...)
  user                  User             @relation(...)
}
```

### Key Fields

- `is_active`: Indicates if the profile is currently active (default: true)
- `is_bundle_selection`: Whether the profile uses a curated bundle
- `selected_bundle_id`: Reference to the selected bundle
- **Removed**: `status` field (previously used for Draft/Generated/Failed states)

## API Endpoints

### GET `/api/user-curation-profiles`

Retrieves the user's active profile.

**Response:**
- Returns the active profile with selected bundle details and episodes
- Returns `null` if no active profile exists

### POST `/api/user-curation-profiles`

Creates a new profile for the user.

**Request Body:**
```json
{
  "name": "My Feed Name",
  "isBundleSelection": true,
  "selectedBundleId": "bundle_id"
}
```

**Validation:**
- Checks if user already has an active profile (409 error if exists)
- Validates bundle access based on user's subscription plan
- Creates profile in active state immediately

### PATCH `/api/user-curation-profiles/[id]`

Updates an existing profile.

**Request Body:**
```json
{
  "name": "Updated Name",
  "selected_bundle_id": "new_bundle_id"
}
```

**Validation:**
- Validates bundle plan gate access
- Updates profile settings

### DELETE `/api/user-curation-profiles/[id]`

Deactivates a profile (soft delete).

**Behavior:**
- Sets `is_active` to `false`
- Preserves profile data for potential reactivation

## User Workflow

### Creating a Profile

1. User navigates to profile creation wizard
2. System checks for existing active profile
3. If no active profile exists:
   - User selects a curated bundle
   - User provides a name for their feed
   - Profile is created immediately in active state
4. If active profile exists:
   - User is directed to manage existing profile

### Managing a Profile

1. User can view their active profile on the dashboard
2. User can edit profile name or change bundle selection
3. User can deactivate profile to create a new one

## What Changed

### Old System (Removed)

The old system had a **draft-generate workflow**:

- Profiles started in "Draft" status
- Users had to manually trigger podcast generation
- System would transition through states: Draft → Generating → Generated/Failed
- Frontend showed status indicators and generation progress
- Polling mechanism to check generation status

### New System (Current)

The new system uses **immediate activation**:

- Profiles are created directly in active state
- No generation step required
- Episodes are available immediately from selected bundles
- Simpler user experience with fewer states to manage
- Removed status field and related UI components

### Files Modified

1. **Schema**: `prisma/schema.prisma`
   - Removed `status` field from `UserCurationProfile`

2. **API Routes**:
   - `app/api/user-curation-profiles/route.ts` - Removed status field from POST
   - `app/api/user-curation-profiles/[id]/route.ts` - Removed status field from PATCH

3. **Components**:
   - `components/saved-collection-card.tsx` - Removed status checking and generation logic
   - `components/features/saved-feed-card.tsx` - Removed status checking and generation logic

4. **Documentation**:
   - Created `docs/PROFILE_MANAGEMENT.md` (this file)

## Plan Gating

Profiles respect the subscription tier system:

```typescript
// Hierarchical access model:
// NONE = only NONE access
// FREE_SLICE = NONE + FREE_SLICE access  
// CASUAL_LISTENER = NONE + FREE_SLICE + CASUAL_LISTENER access
// CURATE_CONTROL = ALL access
```

When creating or updating a profile with a bundle selection, the system validates that the user's subscription plan provides access to the selected bundle's `min_plan` requirement.

## Future Considerations

### Potential Enhancements

1. **Multiple Profiles**: Support for multiple active profiles per user
2. **Custom Podcast Selection**: Allow users to create custom feeds by selecting individual podcasts
3. **Profile Templates**: Pre-configured profile templates for common use cases
4. **Profile Sharing**: Allow users to share their profile configurations
5. **Schedule Management**: Automated episode refresh scheduling

### Migration Notes

If you need to migrate from the old system:

1. Run Prisma migration to remove `status` column:
   ```bash
   npx prisma migrate dev --name remove_profile_status
   ```

2. Any existing profiles with status values will have those values dropped
3. All profiles will be treated as active/ready immediately

## Development Guidelines

### Creating New Profile Features

When adding new features to profiles:

1. Ensure single-profile constraint is maintained
2. Validate plan gate access for premium features
3. Update both API and frontend simultaneously
4. Test edge cases around profile switching
5. Consider backward compatibility with existing profiles

### Testing Profiles

Key test scenarios:

- Creating a profile when none exists
- Attempting to create a profile when one exists
- Updating bundle selection
- Plan gate validation
- Profile deactivation and reactivation
- Episode fetching from selected bundles

## Support

For questions or issues with the profile management system, please refer to:

- API documentation in the route files
- Component documentation in the component files  
- Database schema in `prisma/schema.prisma`
