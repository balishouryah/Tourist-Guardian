-- Add live safety intelligence columns to tourists table
ALTER TABLE public.tourists
ADD COLUMN IF NOT EXISTS current_safety_score INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS current_safety_severity TEXT DEFAULT 'SAFE';

-- Create safety_events table to track safety intelligence and score changes
CREATE TABLE IF NOT EXISTS public.safety_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tourist_id UUID REFERENCES public.tourists(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- e.g., 'ZONE_ENTRY', 'SCORE_CHANGE', 'QUESTIONNAIRE', 'GPS_DROPOUT'
    severity TEXT NOT NULL,   -- e.g., 'SAFE', 'CAUTION', 'HIGH', 'CRITICAL'
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    zone_id TEXT,             -- Optional: The ID of the zone entered
    risk_score INTEGER NOT NULL,
    detected_signals JSONB DEFAULT '[]'::jsonb, -- Array of strings explaining the factors
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_safety_events_tourist_id ON public.safety_events(tourist_id);
CREATE INDEX IF NOT EXISTS idx_safety_events_created_at ON public.safety_events(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.safety_events ENABLE ROW LEVEL SECURITY;

-- Tourists can insert their own events
CREATE POLICY "Tourists can insert own safety events"
    ON public.safety_events FOR INSERT
    WITH CHECK (
        tourist_id IN (
            SELECT id FROM public.tourists WHERE auth_user_id = auth.uid()
        )
    );

-- Tourists can view their own events
CREATE POLICY "Tourists can view own safety events"
    ON public.safety_events FOR SELECT
    USING (
        tourist_id IN (
            SELECT id FROM public.tourists WHERE auth_user_id = auth.uid()
        )
    );

-- Authorities can view all safety events
CREATE POLICY "Authorities can view all safety events"
    ON public.safety_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.authorities WHERE auth_user_id = auth.uid()
        )
    );
