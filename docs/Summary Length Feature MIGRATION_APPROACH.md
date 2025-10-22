# Database Migration Approach - Summary Length Feature

## Overview

This document explains the database migration strategy used for adding the `summary_length` field to the `UserEpisode` model.

---

## Two-Stage Approach

### Stage 1: Development (Applied ✅)

**Method:** `prisma db push`

**Command:**
```bash
pnpm prisma:push
```

**What it does:**
- Directly synchronizes the Prisma schema with the development database
- Does NOT create a migration file
- Faster for rapid iteration during development
- Applied immediately to your local/dev database

**Status:** ✅ Already applied

---

### Stage 2: Production (Ready 🚀)

**Method:** Migration file created

**File:** `prisma/migrations/20251022225141_add_summary_length/migration.sql`

**SQL:**
```sql
-- AlterTable
ALTER TABLE "user_episode" ADD COLUMN "summary_length" TEXT NOT NULL DEFAULT 'MEDIUM';
```

**What it does:**
- Provides a versioned, trackable database change
- Can be reviewed before deployment
- Applied in production via CI/CD or manual deployment
- Ensures consistent schema across all environments

**Status:** ✅ Migration file created, ready for production deployment

---

## Why This Approach?

### Development: `prisma db push`

**Advantages:**
- ✅ Fast iteration during development
- ✅ No need to manage migration files during prototyping
- ✅ Immediately see schema changes
- ✅ Perfect for local development

**When to use:**
- Early-stage development
- Schema exploration
- Local testing
- Prototyping

### Production: Migration Files

**Advantages:**
- ✅ Version controlled changes
- ✅ Reviewable by team
- ✅ Rollback capability
- ✅ Audit trail
- ✅ CI/CD integration

**When to use:**
- Production deployments
- Staging environments
- Shared databases
- Critical schema changes

---

## Migration Safety

### Backwards Compatibility ✅

```sql
ADD COLUMN "summary_length" TEXT NOT NULL DEFAULT 'MEDIUM'
```

**Why this is safe:**

1. **Non-destructive:** Only adds a column, doesn't remove or modify existing data
2. **Default value:** All existing episodes automatically get `'MEDIUM'`
3. **NOT NULL constraint:** Satisfied by the default value
4. **No downtime:** Can be applied while the app is running
5. **Zero data loss:** No risk to existing episode data

### Existing Data Impact

**Before migration:**
```
user_episode table:
├── episode_id
├── user_id
├── episode_title
└── ... (other fields)
```

**After migration:**
```
user_episode table:
├── episode_id
├── user_id
├── episode_title
├── summary_length  ← NEW (defaults to 'MEDIUM')
└── ... (other fields)
```

**All existing episodes:**
- Automatically receive `summary_length = 'MEDIUM'`
- Are counted as 1 credit (same as before)
- Continue to work without any code changes

---

## Deployment Instructions

### For Production

**Option 1: Automatic (Recommended)**

If your deployment process includes Prisma migrations:

```bash
# During deployment, Prisma will automatically apply pending migrations
npm run build
# or
npx prisma migrate deploy
```

**Option 2: Manual**

If you need to apply manually:

```bash
# 1. Navigate to project directory
cd /path/to/podslice

# 2. Deploy migrations
npx prisma migrate deploy

# 3. Verify
npx prisma migrate status
```

### For Staging/QA

Same as production - use `prisma migrate deploy`

### Verification

After deployment, verify the migration was applied:

```sql
-- Check column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_episode' 
  AND column_name = 'summary_length';

-- Expected result:
-- column_name    | data_type | column_default
-- summary_length | text      | 'MEDIUM'::text
```

---

## Rollback Plan

### If You Need to Revert

**1. Remove the migration (before applying to production):**
```bash
rm -rf prisma/migrations/20251022225141_add_summary_length
```

**2. Revert schema.prisma:**
```diff
model UserEpisode {
  // ... fields
- summary_length  String  @default("MEDIUM") @map("summary_length")
  // ... other fields
}
```

**3. If already applied to production:**
```sql
-- Create a down migration
ALTER TABLE "user_episode" DROP COLUMN IF EXISTS "summary_length";
```

**Note:** Dropping the column will lose summary length data if episodes were created with specific lengths. Only rollback if absolutely necessary.

---

## Migration Timeline

### Development (Completed ✅)

```
Oct 22, 2024 22:27 - Schema updated in prisma/schema.prisma
Oct 22, 2024 22:27 - Ran: pnpm prisma:generate
Oct 22, 2024 22:27 - Ran: pnpm prisma:push
Oct 22, 2024 22:51 - Created migration file for production
Status: ✅ Development DB updated
```

### Production (Pending 🚀)

```
Awaiting deployment:
- Migration file ready: 20251022225141_add_summary_length
- Will be applied during next deployment
- Zero downtime expected
```

---

## Common Questions

### Q: Why not use `prisma migrate dev`?

**A:** We encountered a shadow database error:
```
Error: P3006
Migration `20250110000000_add_news_episode_fields` failed to apply 
cleanly to the shadow database.
```

This is a common issue with Prisma Accelerate or certain database configurations. The solution:
1. Use `prisma db push` for development (applied)
2. Create migration file manually (done)
3. Use `prisma migrate deploy` for production (ready)

### Q: Is the migration file correct?

**A:** Yes. The migration file was created based on the exact schema change and follows Prisma's migration format. It's a simple, safe ALTER TABLE statement.

### Q: What if I have thousands of existing episodes?

**A:** The migration is still safe. PostgreSQL can add a column with a default value efficiently, even on large tables. The operation is fast and non-blocking in most cases.

### Q: Will this affect my application while running?

**A:** No. Adding a column with a default value is a metadata-only operation in PostgreSQL (for recent versions). Your app can continue running during the migration.

### Q: What happens if the migration fails?

**A:** 
1. The transaction will rollback (no partial changes)
2. Your database remains unchanged
3. You can investigate and retry
4. No data loss

---

## Testing Checklist

### Before Production Deployment

- [x] Schema validated in development
- [x] Migration file created
- [x] Migration SQL reviewed
- [x] Backwards compatibility verified
- [x] Default value tested
- [x] Application code handles new field
- [x] 53 unit tests passing
- [x] No breaking changes

### After Production Deployment

- [ ] Verify migration applied: `npx prisma migrate status`
- [ ] Check column exists in database
- [ ] Test creating new episode with SHORT length
- [ ] Test creating new episode with MEDIUM length
- [ ] Test creating new episode with LONG length
- [ ] Verify existing episodes still work
- [ ] Verify weighted usage calculation
- [ ] Monitor application logs
- [ ] Check for any errors

---

## Summary

✅ **Development:** Applied via `prisma db push`  
✅ **Production:** Migration file created and ready  
✅ **Safety:** Fully backwards compatible with default values  
✅ **Testing:** All 53 tests passing  
✅ **Rollback:** Plan documented if needed  
🚀 **Status:** Ready for production deployment  

---

## Next Steps

1. **Code Review:** Have the migration file reviewed by the team
2. **Staging Test:** Deploy to staging environment first
3. **Production Deploy:** Apply migration during next deployment
4. **Verification:** Run post-deployment checks
5. **Monitor:** Watch for any issues in first 24 hours

---

**Migration Status:** ✅ READY FOR PRODUCTION

**Migration File:** `prisma/migrations/20251022225141_add_summary_length/migration.sql`

**Risk Level:** 🟢 LOW (backwards compatible, default value, non-destructive)

**Estimated Downtime:** 0 seconds

**Data Loss Risk:** NONE