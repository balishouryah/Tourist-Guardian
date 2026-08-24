-- Create the incidents table
CREATE TABLE IF NOT EXISTS public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tourist_id uuid NOT NULL REFERENCES public.tourists(id) ON DELETE CASCADE,
  incident_type text NOT NULL,
  status text NOT NULL,
  severity text NOT NULL,
  risk_score integer,
  latitude double precision,
  longitude double precision,
  location_accuracy_m double precision,
  detected_signals jsonb,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz,

  CONSTRAINT valid_incident_type CHECK (incident_type IN ('SOS', 'AI_DISTRESS', 'NEED_HELP', 'ROUTE_DEVIATION')),
  CONSTRAINT valid_status CHECK (status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESPONDING', 'RESOLVED', 'CANCELLED', 'ESCALATED')),
  CONSTRAINT valid_severity CHECK (severity IN ('SAFE', 'CAUTION', 'HIGH_RISK', 'CRITICAL', 'HIGH'))
);

-- Enable RLS
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- 1. Tourist Policy: Full access to their own incidents
CREATE POLICY "Tourists can view their own incidents"
  ON public.incidents FOR SELECT
  USING (tourist_id IN (SELECT id FROM public.tourists WHERE auth_user_id = auth.uid()));

CREATE POLICY "Tourists can create their own incidents"
  ON public.incidents FOR INSERT
  WITH CHECK (tourist_id IN (SELECT id FROM public.tourists WHERE auth_user_id = auth.uid()));

CREATE POLICY "Tourists can update their own incidents"
  ON public.incidents FOR UPDATE
  USING (tourist_id IN (SELECT id FROM public.tourists WHERE auth_user_id = auth.uid()))
  WITH CHECK (tourist_id IN (SELECT id FROM public.tourists WHERE auth_user_id = auth.uid()));

CREATE POLICY "Tourists can delete their own incidents"
  ON public.incidents FOR DELETE
  USING (tourist_id IN (SELECT id FROM public.tourists WHERE auth_user_id = auth.uid()));

-- 2. Authority Prototype Policy: Allow anonymous READ ONLY access 
-- (Strictly to allow the unauthenticated Authority demo dashboard to receive Realtime updates)
-- NOTE: In a future stage with proper Authority Auth, this will be restricted to an authority role.
CREATE POLICY "Authority prototype demo can view incidents"
  ON public.incidents FOR SELECT
  USING (auth.role() = 'anon');

-- Add incidents to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;

-- Create an updated_at trigger for incidents
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_incidents_updated_at
BEFORE UPDATE ON public.incidents
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
