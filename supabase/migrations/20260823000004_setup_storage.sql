-- Stage 7D.5: Setup Storage for Profile Photos

-- Enable storage if not already enabled (assuming storage extension is available)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the bucket for profile photos
-- Ensure you have the storage schema in your Supabase project
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profile-photos', 'profile-photos', false, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for Storage
-- Note: Requires auth.uid() to match the path of the file (e.g., auth_user_id/filename.jpg)
CREATE POLICY "Users can upload their own profile photo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own profile photo"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read their own profile photo"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own profile photo"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
