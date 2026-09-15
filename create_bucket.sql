-- Run this in Supabase SQL Editor to create the screenshots storage bucket
-- Go to: Supabase Dashboard > SQL Editor > New Query

-- Create the screenshots bucket (public readable)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'screenshots',
  'screenshots',
  true,
  10485760,  -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read (view) screenshots
CREATE POLICY "Public read access for screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'screenshots');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload screenshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'screenshots');

-- Allow anonymous uploads too (for desktop app without login)
CREATE POLICY "Anonymous uploads allowed"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'screenshots' AND auth.role() = 'anon');
