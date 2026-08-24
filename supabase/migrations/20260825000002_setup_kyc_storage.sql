-- Phase 6: Setup Storage for KYC Documents

-- Create the bucket for KYC documents (Private Bucket)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('kyc-documents', 'kyc-documents', false, 5242880, ARRAY['image/jpeg', 'image/png', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for KYC Documents Storage

-- Tourists can upload their own KYC document
CREATE POLICY "Tourists can upload their own KYC document"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'kyc-documents' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Tourists can view their own KYC document
CREATE POLICY "Tourists can view their own KYC document"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Authorities can view all KYC documents
CREATE POLICY "Authorities can view all KYC documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents' AND 
  EXISTS (
    SELECT 1 FROM public.authority_profiles 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('AUTHORITY', 'ADMIN')
  )
);
