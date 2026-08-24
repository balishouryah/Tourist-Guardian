-- Stage 7I: Allow Authorities to update tourists (e.g. KYC Approval)

-- Authorities can update tourists
CREATE POLICY "Authorities can update tourists"
  ON public.tourists FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.authority_profiles 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('AUTHORITY', 'ADMIN')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.authority_profiles 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('AUTHORITY', 'ADMIN')
  ));
