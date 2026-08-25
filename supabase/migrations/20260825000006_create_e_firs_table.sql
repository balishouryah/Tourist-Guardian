-- Migration for E-FIR / Missing Tourist system
CREATE TABLE IF NOT EXISTS public.e_firs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fir_reference TEXT UNIQUE NOT NULL,
    tourist_id UUID NOT NULL REFERENCES public.tourists(id) ON DELETE CASCADE,
    incident_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'RESOLVED')),
    generated_by UUID,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID,

    -- Snapshots for historical integrity
    tourist_name_snapshot TEXT,
    safety_id_snapshot TEXT,
    nationality_snapshot TEXT,
    phone_snapshot TEXT,
    kyc_status_snapshot TEXT,

    last_known_latitude DOUBLE PRECISION,
    last_known_longitude DOUBLE PRECISION,
    last_known_location_at TIMESTAMP WITH TIME ZONE,

    safety_score_snapshot INTEGER,
    risk_severity_snapshot TEXT,
    risk_signals_snapshot JSONB DEFAULT '[]'::jsonb,

    incident_summary TEXT,
    authority_notes TEXT,
    resolution_notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.e_firs ENABLE ROW LEVEL SECURITY;

-- Authority read/write policy (demo style for prototype)
CREATE POLICY "Authority prototype demo can view E-FIRs"
    ON public.e_firs FOR SELECT
    USING (auth.role() = 'anon' OR auth.role() = 'authenticated');

CREATE POLICY "Authority prototype demo can create E-FIRs"
    ON public.e_firs FOR INSERT
    WITH CHECK (auth.role() = 'anon' OR auth.role() = 'authenticated');

CREATE POLICY "Authority prototype demo can update E-FIRs"
    ON public.e_firs FOR UPDATE
    USING (auth.role() = 'anon' OR auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'anon' OR auth.role() = 'authenticated');

-- Trigger to update updated_at
CREATE TRIGGER update_e_firs_updated_at
BEFORE UPDATE ON public.e_firs
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add e_firs to real-time publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.e_firs;
