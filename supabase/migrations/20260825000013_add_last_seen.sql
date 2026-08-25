-- Add last_seen column to tourists to track active presence regardless of GPS
ALTER TABLE public.tourists ADD COLUMN IF NOT EXISTS last_seen timestamp with time zone;

-- We already have RLS policy allowing tourists to update their own row, but let's be explicit if needed.
-- "Users can manage their own profile" covers it, but we can verify it just in case.
-- The existing policy:
-- CREATE POLICY "Users can manage their own profile" ON public.tourists FOR ALL USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());
-- This fully allows the tourist to update `last_seen`.
