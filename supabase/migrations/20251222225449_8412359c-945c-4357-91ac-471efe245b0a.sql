-- Add slug column to salons table for public booking links
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Add description column for public page
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS description text;

-- Add public_booking_enabled column to control if booking is active
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS public_booking_enabled boolean DEFAULT true;

-- Create index for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_salons_slug ON public.salons(slug) WHERE slug IS NOT NULL;

-- Create a function to generate slug from name
CREATE OR REPLACE FUNCTION public.generate_salon_slug(salon_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter int := 0;
BEGIN
  -- Convert to lowercase, remove accents, replace spaces with hyphens
  base_slug := lower(trim(salon_name));
  base_slug := translate(base_slug, 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiioooooüuuuc');
  base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  final_slug := base_slug;
  
  -- Check for uniqueness and add counter if needed
  WHILE EXISTS(SELECT 1 FROM public.salons WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter::text;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- Create trigger to auto-generate slug on insert if not provided
CREATE OR REPLACE FUNCTION public.auto_generate_salon_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_salon_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_generate_salon_slug ON public.salons;
CREATE TRIGGER trigger_auto_generate_salon_slug
  BEFORE INSERT ON public.salons
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_salon_slug();

-- Update existing salons with slugs
DO $$
DECLARE
  salon_record RECORD;
BEGIN
  FOR salon_record IN SELECT id, name FROM public.salons WHERE slug IS NULL OR slug = ''
  LOOP
    UPDATE public.salons 
    SET slug = public.generate_salon_slug(salon_record.name)
    WHERE id = salon_record.id;
  END LOOP;
END $$;

-- Create RLS policy for public access to salon by slug
CREATE POLICY "Public can view salon by slug" 
ON public.salons 
FOR SELECT 
USING (slug IS NOT NULL AND is_active = true);