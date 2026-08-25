-- Stage 8: Fix Realtime RLS Dropping Events
-- Supabase Realtime sometimes fails to evaluate RLS policies that contain EXISTS/JOIN queries 
-- against other tables (like authority_profiles) because the WAL decoding context is restricted.
-- By wrapping the check in a SECURITY DEFINER function, we guarantee Realtime can execute it reliably.

CREATE OR REPLACE FUNCTION public.is_authority_user()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.authority_profiles 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('AUTHORITY', 'ADMIN')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Fix incidents SELECT policy
DROP POLICY IF EXISTS "Authorities can view incidents" ON public.incidents;

CREATE POLICY "Authorities can view incidents"
  ON public.incidents FOR SELECT
  USING (public.is_authority_user());

-- 2. Fix tourists SELECT policy (since they also use the same logic and might drop realtime events)
DROP POLICY IF EXISTS "Authorities can view tourists" ON public.tourists;

CREATE POLICY "Authorities can view tourists"
  ON public.tourists FOR SELECT
  USING (public.is_authority_user());

-- 3. Fix emergency_contacts SELECT policy
DROP POLICY IF EXISTS "Authorities can view emergency contacts" ON public.emergency_contacts;

CREATE POLICY "Authorities can view emergency contacts"
  ON public.emergency_contacts FOR SELECT
  USING (public.is_authority_user());
