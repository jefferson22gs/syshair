-- =============================================
-- Create storage bucket for WhatsApp Status media
-- Migration: 20260125_create_status_media_bucket.sql
-- =============================================

-- Create the bucket for status media (images and videos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'status-media',
  'status-media',
  true,
  52428800, -- 50MB limit for videos
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Anyone can view status media (public bucket)
CREATE POLICY "Public Access Status Media"
ON storage.objects FOR SELECT
USING (bucket_id = 'status-media');

-- Policy: Authenticated users can upload to their salon folder
CREATE POLICY "Salon owners can upload status media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'status-media'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.salons WHERE owner_id = auth.uid()
  )
);

-- Policy: Salon owners can update their own files
CREATE POLICY "Salon owners can update status media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'status-media'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.salons WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'status-media'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.salons WHERE owner_id = auth.uid()
  )
);

-- Policy: Salon owners can delete their own files
CREATE POLICY "Salon owners can delete status media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'status-media'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.salons WHERE owner_id = auth.uid()
  )
);
