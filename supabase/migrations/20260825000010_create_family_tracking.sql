-- 20260825000010_create_family_tracking.sql

-- 1. Add family tracking enabled flag to tourists
ALTER TABLE public.tourists ADD COLUMN IF NOT EXISTS family_tracking_enabled boolean DEFAULT false;

-- 2. Create family_tracking_access table
CREATE TABLE IF NOT EXISTS public.family_tracking_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tourist_id uuid NOT NULL REFERENCES public.tourists(id) ON DELETE CASCADE,
  family_name text NOT NULL,
  family_contact text,
  access_token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz DEFAULT now(),
  revoked_at timestamptz,
  CONSTRAINT valid_status CHECK (status IN ('ACTIVE', 'REVOKED'))
);

-- Enable RLS
ALTER TABLE public.family_tracking_access ENABLE ROW LEVEL SECURITY;

-- 3. Tourist Policies (Allow tourists to manage their own sharing records)
CREATE POLICY "Tourists can view their own family tracking access"
  ON public.family_tracking_access FOR SELECT
  USING (tourist_id IN (SELECT id FROM public.tourists WHERE auth_user_id = auth.uid()));

CREATE POLICY "Tourists can create their own family tracking access"
  ON public.family_tracking_access FOR INSERT
  WITH CHECK (tourist_id IN (SELECT id FROM public.tourists WHERE auth_user_id = auth.uid()));

CREATE POLICY "Tourists can update their own family tracking access"
  ON public.family_tracking_access FOR UPDATE
  USING (tourist_id IN (SELECT id FROM public.tourists WHERE auth_user_id = auth.uid()))
  WITH CHECK (tourist_id IN (SELECT id FROM public.tourists WHERE auth_user_id = auth.uid()));

CREATE POLICY "Tourists can delete their own family tracking access"
  ON public.family_tracking_access FOR DELETE
  USING (tourist_id IN (SELECT id FROM public.tourists WHERE auth_user_id = auth.uid()));
