-- 20260825000012_update_family_tracking_status.sql

-- Drop the old constraint
ALTER TABLE public.family_tracking_access DROP CONSTRAINT IF EXISTS valid_status;

-- Add the new constraint with expanded lifecycle states
ALTER TABLE public.family_tracking_access 
  ADD CONSTRAINT valid_status 
  CHECK (status IN ('PENDING', 'ACTIVE', 'REVOKED', 'DECLINED', 'EXPIRED'));
