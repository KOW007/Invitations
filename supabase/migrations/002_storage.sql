-- Run this in your Supabase project's SQL editor

-- Create a public bucket for event images
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload into their own folder
CREATE POLICY "Users can upload event images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'event-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Anyone can read event images (needed for RSVP page and emails)
CREATE POLICY "Public can read event images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'event-images');

-- Users can delete only their own images
CREATE POLICY "Users can delete their images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'event-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
