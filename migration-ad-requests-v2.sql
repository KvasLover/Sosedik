-- Migration: Enhanced ad_requests model with new statuses and lifecycle management
-- Date: 2026-04-23
-- Purpose: Expand request lifecycle to include in_progress, rejected, cancelled, and disputed statuses
-- Backward compatible: Existing records will be preserved

-- 1. Update status column to support new values
-- Add CHECK constraint to ensure valid statuses
ALTER TABLE ad_requests
  ADD CONSTRAINT valid_status CHECK (status IN (
    'pending',      -- Ожидает решения автора объявления
    'accepted',     -- Выбран исполнителем (но работа еще не начата)
    'rejected',     -- Отклонен автором (аналог declined)
    'cancelled',    -- Отменен запросившим (аналог удаления)
    'in_progress',  -- Стороны договорились и выполняют работу
    'completed',    -- Обе стороны подтвердили выполнение
    'disputed'      -- Есть конфликт / спор между сторонами
  ));

-- 2. Add index for status to optimize queries filtering by status
CREATE INDEX IF NOT EXISTS idx_ad_requests_status_v2 ON ad_requests(status)
  WHERE status IN ('pending', 'accepted', 'in_progress');

-- 3. Add index for queries that need to find accepted/in_progress requests per ad
CREATE INDEX IF NOT EXISTS idx_ad_requests_ad_status ON ad_requests(ad_id, status)
  WHERE status IN ('accepted', 'in_progress');

-- 4. Rename old 'declined' to 'rejected' for consistency
-- This handles backward compatibility
UPDATE ad_requests SET status = 'rejected' WHERE status = 'declined';

-- 5. Convert deleted pending/cancelled requests to 'cancelled' status
-- Note: These were previously just deleted, but now we track them as cancelled
-- This maintains referential integrity and allows history tracking

-- 6. Add new column for tracking disputes (optional - for future use)
-- ALTER TABLE ad_requests ADD COLUMN IF NOT EXISTS dispute_reason TEXT;

-- 7. Add timestamp for status transitions (for audit trail)
-- ALTER TABLE ad_requests ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 8. Create trigger to automatically update updated_at on any column change
-- (This trigger should already exist from migration-ads-system.sql)
-- If not present, it can be created like this:
/*
CREATE OR REPLACE FUNCTION update_ad_requests_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ad_requests_timestamp_trigger ON ad_requests;
CREATE TRIGGER ad_requests_timestamp_trigger
  BEFORE UPDATE ON ad_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_ad_requests_timestamp();
*/

-- 9. Constraint: Only one accepted/in_progress request per ad
-- This is enforced in application logic, but can add a function to check:
/*
CREATE OR REPLACE FUNCTION check_single_active_request()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('accepted', 'in_progress') THEN
    IF (SELECT COUNT(*) FROM ad_requests 
        WHERE ad_id = NEW.ad_id 
        AND status IN ('accepted', 'in_progress')
        AND id != NEW.id) > 0 THEN
      RAISE EXCEPTION 'Only one request can be accepted or in_progress per ad';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS single_active_request_trigger ON ad_requests;
CREATE TRIGGER single_active_request_trigger
  BEFORE INSERT OR UPDATE ON ad_requests
  FOR EACH ROW
  EXECUTE FUNCTION check_single_active_request();
*/

-- Verification query: Check data consistency
-- SELECT id, ad_id, requester_id, status, created_at FROM ad_requests 
-- ORDER BY status, created_at DESC;
