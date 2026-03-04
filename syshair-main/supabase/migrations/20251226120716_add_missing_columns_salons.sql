-- Add missing columns to salons table for salon settings functionality

-- Slug for public booking URL
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Enable/disable public booking
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS public_booking_enabled BOOLEAN DEFAULT true;

-- Comments for documentation
COMMENT ON COLUMN public.salons.slug IS 'URL slug for the public booking page (e.g., /s/salon-name)';
COMMENT ON COLUMN public.salons.public_booking_enabled IS 'Whether the salon accepts public online bookings';

-- Create index for slug lookups
CREATE INDEX IF NOT EXISTS idx_salons_slug ON public.salons(slug);
