-- URGENT: Check current status distribution
SELECT status, COUNT(*) as count
FROM trips
GROUP BY status
ORDER BY count DESC;

-- If you see all trips are 'pending_approval', run this to fix:
-- (ONLY run if needed - check result above first!)

-- Restore to 'approved' for trips that should be approved
UPDATE trips
SET status = 'approved'
WHERE status = 'pending_approval'
  AND id IN (
    SELECT id FROM (
      SELECT id FROM trips
      WHERE created_at < NOW() - INTERVAL 1 HOUR
    ) as temp
  );
