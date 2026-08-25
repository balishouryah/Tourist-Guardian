-- Add blockchain_hash to tourists table for digital identity verification
ALTER TABLE public.tourists
ADD COLUMN IF NOT EXISTS blockchain_hash TEXT;
