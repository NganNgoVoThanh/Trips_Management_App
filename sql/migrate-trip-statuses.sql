-- Migration script to update trip statuses to new convention
-- Run this ONCE to clean up old statuses in database

-- Step 1: Update old statuses to new ones (preserve existing data)
UPDATE trips
SET status = 'approved'
WHERE status = 'pending_optimization';

UPDATE trips
SET status = 'approved'
WHERE status = 'proposed';

UPDATE trips
SET status = 'pending_approval'
WHERE status = 'draft';

UPDATE trips
SET status = 'pending_approval'
WHERE status = 'pending';

UPDATE trips
SET status = 'approved'
WHERE status = 'confirmed';

-- Step 2: Verify migration
SELECT status, COUNT(*) as count
FROM trips
GROUP BY status
ORDER BY count DESC;

-- Step 3: Update ENUM to remove old values
-- Note: DEFAULT only applies to NEW records without status specified
ALTER TABLE trips
MODIFY COLUMN status ENUM(
  'pending_approval',
  'pending_urgent',
  'auto_approved',
  'approved',
  'approved_solo',
  'optimized',
  'rejected',
  'cancelled',
  'expired'
) DEFAULT 'pending_approval';

-- Step 4: Verify no old statuses remain
SELECT status, COUNT(*) as count
FROM trips
WHERE status IN ('draft', 'pending', 'pending_optimization', 'proposed', 'confirmed')
GROUP BY status;

-- If above query returns 0 rows, migration successful!
