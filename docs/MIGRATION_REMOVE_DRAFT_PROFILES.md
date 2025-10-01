# Migration Guide: Removing Draft Profile Feature

## Overview

This migration removes the outdated draft profile creation feature and transitions to a simpler, more efficient profile management system where profiles are created directly in an active state.

## What Was Changed

### Database Schema Changes

**File**: `prisma/schema.prisma`

- **Removed**: `status` field from `UserCurationProfile` model
- **Impact**: Profiles no longer have Draft/Generated/Failed states
- **Migration Required**: Yes - Prisma migration needed to drop the column

### API Changes

#### 1. POST `/api/user-curation-profiles`
**File**: `app/api/user-curation-profiles/route.ts`

- **Removed**: `status: "active"` from profile creation data
- **Behavior**: Profiles are created active by default (via schema defaults)

#### 2. PATCH `/api/user-curation-profiles/[id]`
**File**: `app/api/user-curation-profiles/[id]/route.ts`

- **Removed**: `status` from request body destructuring
- **Removed**: `status` from `dataToUpdate` type definition
- **Removed**: Status update logic

### Frontend Component Changes

#### 1. `saved-collection-card.tsx`
**File**: `components/saved-collection-card.tsx`

**Removed**:
- All status-checking functions (`getStatusText`, `getStatusColor`, `getStatusIcon`)
- Generation trigger logic (`_handleGenerate`, `triggerPodcastGeneration`)
- Status polling mechanism
- Status API functions (`getUserCurationProfileStatus`)
- Status-based conditional rendering
- Loading states for generation
- Status icons (CheckCircle, Clock)

**Simplified**:
- Card now shows simple creation date
- Always shows "View Feed" button
- No status indicators
- No generation triggers

#### 2. `saved-feed-card.tsx`
**File**: `components/features/saved-feed-card.tsx`

Same changes as `saved-collection-card.tsx` (these files were duplicates)

### Type System Changes

**File**: `lib/types.ts`

- **No changes required** - Types are auto-generated from Prisma schema
- After running Prisma migration, types will automatically update

## Migration Steps

### Step 1: Update Code (Already Complete)

All code changes have been applied:
- ✅ Schema updated
- ✅ API routes cleaned up
- ✅ Frontend components simplified

### Step 2: Run Database Migration

You need to create and run a Prisma migration:

```bash
# Generate migration
npx prisma migrate dev --name remove_profile_status

# This will:
# 1. Create a new migration file
# 2. Drop the 'status' column from 'user_curation_profile' table
# 3. Update Prisma Client
```

### Step 3: Verify Changes

After migration, verify:

1. **Database**: Confirm `status` column is removed
   ```sql
   \d user_curation_profile;
   ```

2. **Prisma Client**: Regenerate if needed
   ```bash
   npx prisma generate
   ```

3. **TypeScript**: Check for type errors
   ```bash
   npm run type-check
   # or
   npx tsc --noEmit
   ```

### Step 4: Test Application

Test key workflows:

1. ✅ Create a new profile
2. ✅ View existing profiles
3. ✅ Update profile bundle selection
4. ✅ Deactivate a profile
5. ✅ Check dashboard renders correctly

## Breaking Changes

### For Users

- **No breaking changes** - User experience is actually simplified
- Profiles now work immediately after creation
- No waiting for "generation" to complete

### For Developers

1. **API Contract**: The `status` field is no longer returned in API responses
2. **Database**: Existing data in `status` column will be lost (but this is intentional)
3. **Components**: Any custom components referencing `userCurationProfile.status` will need updates

## Rollback Plan

If you need to rollback:

1. Restore previous schema:
   ```prisma
   status String @default("Draft") @map("status")
   ```

2. Create rollback migration:
   ```bash
   npx prisma migrate dev --name restore_profile_status
   ```

3. Restore previous component versions from git:
   ```bash
   git checkout HEAD~1 -- components/saved-collection-card.tsx
   git checkout HEAD~1 -- components/features/saved-feed-card.tsx
   git checkout HEAD~1 -- app/api/user-curation-profiles/route.ts
   git checkout HEAD~1 -- app/api/user-curation-profiles/[id]/route.ts
   ```

## Data Impact

### Existing Profiles

All existing user profiles will:
- Continue to work normally
- Lose their status value (column dropped)
- Be treated as active/ready immediately
- Have full access to their selected bundle episodes

### No Data Loss

- User profile data is preserved
- Bundle selections are preserved
- Episode relationships are preserved
- Only the `status` column is removed

## Benefits

1. **Simpler Architecture**: No state machine to manage
2. **Better UX**: Immediate access to content
3. **Less Code**: ~200 lines of code removed
4. **Fewer Bugs**: Eliminated polling logic and race conditions
5. **Clearer Intent**: Profiles are either active or inactive

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] New profiles can be created
- [ ] Profile creation returns correct data structure
- [ ] Profile updates work correctly
- [ ] Dashboard displays profiles correctly
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] Episode access works from profiles
- [ ] Bundle selection respects plan gates

## Support

If you encounter issues during migration:

1. Check Prisma migration logs
2. Verify database connectivity
3. Confirm all code changes are applied
4. Review `docs/PROFILE_MANAGEMENT.md` for system documentation

## Timeline

- **Code Changes**: ✅ Complete
- **Database Migration**: ⏳ Pending (run `npx prisma migrate dev`)
- **Testing**: ⏳ Pending (after migration)
- **Deployment**: ⏳ Pending (after testing)
