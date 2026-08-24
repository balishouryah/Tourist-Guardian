-- Stage 7F: Authority Authentication & Security

-- 1. Create authority_profiles table
CREATE TABLE IF NOT EXISTS public.authority_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'AUTHORITY',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_role CHECK (role IN ('AUTHORITY', 'ADMIN'))
);

-- Enable RLS on authority_profiles
ALTER TABLE public.authority_profiles ENABLE ROW LEVEL SECURITY;

-- Authority profile policies
CREATE POLICY "Authorities can view their own profile"
  ON public.authority_profiles FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "Authorities can update their own profile"
  ON public.authority_profiles FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Add updated_at trigger
CREATE TRIGGER update_authority_profiles_updated_at
BEFORE UPDATE ON public.authority_profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 2. Modify incidents policies
-- Drop the temporary anonymous policy
DROP POLICY IF EXISTS "Authority prototype demo can view incidents" ON public.incidents;

-- Create secure policy for Authorities
CREATE POLICY "Authorities can view incidents"
  ON public.incidents FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.authority_profiles 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('AUTHORITY', 'ADMIN')
  ));

CREATE POLICY "Authorities can update incidents"
  ON public.incidents FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.authority_profiles 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('AUTHORITY', 'ADMIN')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.authority_profiles 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('AUTHORITY', 'ADMIN')
  ));

-- 3. Allow Authorities to view tourist profiles
CREATE POLICY "Authorities can view tourists"
  ON public.tourists FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.authority_profiles 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('AUTHORITY', 'ADMIN')
  ));

-- 4. Allow Authorities to view emergency contacts
CREATE POLICY "Authorities can view emergency contacts"
  ON public.emergency_contacts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.authority_profiles 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('AUTHORITY', 'ADMIN')
  ));
