-- Add CHECK constraint to ensure paddle_subscription_id is either NULL or starts with 'sub_'
-- This prevents customer IDs (ctm_*) from being stored in the subscription ID field

-- Step 1: Add CHECK constraint
ALTER TABLE "subscription" 
ADD CONSTRAINT "subscription_paddle_subscription_id_format_check" 
CHECK (paddle_subscription_id IS NULL OR paddle_subscription_id LIKE 'sub_%');

-- Step 2: Create partial unique index on paddle_subscription_id
-- This index only applies to non-NULL values starting with 'sub_'
-- PostgreSQL's existing unique constraint allows multiple NULLs, but we want to be explicit
-- and ensure only valid subscription IDs are indexed for uniqueness

-- Note: The existing unique constraint from Prisma schema already handles uniqueness,
-- but we're adding this partial index for performance and explicit validation
CREATE INDEX IF NOT EXISTS "subscription_paddle_subscription_id_valid_idx" 
ON "subscription" (paddle_subscription_id) 
WHERE paddle_subscription_id LIKE 'sub_%';

