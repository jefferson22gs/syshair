-- Add description column to salons table
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS description TEXT;

-- Comment for documentation
COMMENT ON COLUMN public.salons.description IS 'Breve descrição do salão para exibir na página pública';
