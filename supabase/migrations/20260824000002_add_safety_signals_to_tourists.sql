-- Add live safety intelligence signals column to tourists table
ALTER TABLE public.tourists
ADD COLUMN IF NOT EXISTS current_safety_signals JSONB DEFAULT '[]'::jsonb;
