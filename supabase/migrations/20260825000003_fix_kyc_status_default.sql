-- Fix KYC Status Default and reset incorrectly pending tourists
ALTER TABLE public.tourists ALTER COLUMN kyc_status SET DEFAULT 'NOT_SUBMITTED';

UPDATE public.tourists
SET kyc_status = 'NOT_SUBMITTED'
WHERE kyc_status = 'PENDING' AND (kyc_document_path IS NULL OR kyc_submitted_at IS NULL);
