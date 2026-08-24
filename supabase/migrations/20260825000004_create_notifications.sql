-- Phase 6: Create Notifications Table for Tourist Alerts

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tourist_id UUID REFERENCES public.tourists(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Tourists can view their own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (
  tourist_id IN (
    SELECT id FROM public.tourists WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Tourists can update their own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (
  tourist_id IN (
    SELECT id FROM public.tourists WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Authorities can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.authority_profiles 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('AUTHORITY', 'ADMIN')
  )
);

-- Note: We also allow trigger-based insertion or service_role insertion without policy.
-- Also add an index on tourist_id for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_tourist_id ON public.notifications(tourist_id);
