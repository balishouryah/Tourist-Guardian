-- Add is_missing to tourists table
ALTER TABLE public.tourists ADD COLUMN IF NOT EXISTS is_missing BOOLEAN DEFAULT false;
