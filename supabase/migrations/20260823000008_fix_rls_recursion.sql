-- Stage 7H: Fix RLS Infinite Recursion

-- 1. Dynamically drop ALL existing policies on tourists and emergency_contacts
-- This guarantees we eliminate any rogue recursive policies currently in the database.
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE tablename IN ('tourists', 'emergency_contacts') 
      AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- 2. Re-create strictly FLAT (non-recursive) ownership policies for Tourists

-- Tourists can manage their own profile
CREATE POLICY "Users can manage their own profile"
ON public.tourists
FOR ALL
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- Tourists can manage their own emergency contacts
CREATE POLICY "Users can manage their own emergency contacts"
ON public.emergency_contacts
FOR ALL
USING (
  tourist_id IN (
    SELECT id FROM public.tourists WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  tourist_id IN (
    SELECT id FROM public.tourists WHERE auth_user_id = auth.uid()
  )
);

-- 3. Re-create necessary Authority policies

-- Authorities can view tourists
CREATE POLICY "Authorities can view tourists"
  ON public.tourists FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.authority_profiles 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('AUTHORITY', 'ADMIN')
  ));

-- Authorities can view emergency contacts
CREATE POLICY "Authorities can view emergency contacts"
  ON public.emergency_contacts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.authority_profiles 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('AUTHORITY', 'ADMIN')
  ));
