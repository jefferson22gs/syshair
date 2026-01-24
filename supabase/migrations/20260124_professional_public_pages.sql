-- =============================================
-- SYSHAIR - LINK PÚBLICO POR PROFISSIONAL
-- Cada profissional pode ter seu próprio link de agendamento
-- =============================================

-- Adicionar campo slug para URL amigável do profissional
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS slug TEXT;

-- Adicionar campo para descrição/bio do profissional
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS bio TEXT;

-- Adicionar campo para Instagram do profissional
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS instagram TEXT;

-- Adicionar campo para habilitar agendamento público individual
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS public_booking_enabled BOOLEAN DEFAULT true;

-- Criar índice único para slug por salão
CREATE UNIQUE INDEX IF NOT EXISTS idx_professionals_salon_slug
ON public.professionals (salon_id, slug)
WHERE slug IS NOT NULL;

-- Atualizar profissionais existentes com slug baseado no nome
UPDATE public.professionals
SET slug = LOWER(REGEXP_REPLACE(
    REGEXP_REPLACE(name, '[^a-zA-Z0-9\s]', '', 'g'),
    '\s+', '-', 'g'
))
WHERE slug IS NULL;

-- Comentário na tabela
COMMENT ON COLUMN public.professionals.slug IS 'URL amigável única do profissional dentro do salão (ex: joao-silva)';
COMMENT ON COLUMN public.professionals.bio IS 'Descrição/biografia do profissional para a página pública';
COMMENT ON COLUMN public.professionals.instagram IS 'Instagram do profissional (@usuario)';
COMMENT ON COLUMN public.professionals.public_booking_enabled IS 'Se o profissional aceita agendamentos pelo link público';

-- Criar função para gerar slug automaticamente ao inserir profissional
CREATE OR REPLACE FUNCTION generate_professional_slug()
RETURNS TRIGGER AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        -- Gerar slug baseado no nome
        base_slug := LOWER(REGEXP_REPLACE(
            REGEXP_REPLACE(NEW.name, '[^a-zA-Z0-9\s]', '', 'g'),
            '\s+', '-', 'g'
        ));
        final_slug := base_slug;
        
        -- Verificar se já existe e adicionar número se necessário
        WHILE EXISTS (SELECT 1 FROM professionals WHERE salon_id = NEW.salon_id AND slug = final_slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
            counter := counter + 1;
            final_slug := base_slug || '-' || counter;
        END LOOP;
        
        NEW.slug := final_slug;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para gerar slug automaticamente
DROP TRIGGER IF EXISTS trigger_generate_professional_slug ON public.professionals;
CREATE TRIGGER trigger_generate_professional_slug
BEFORE INSERT OR UPDATE ON public.professionals
FOR EACH ROW
EXECUTE FUNCTION generate_professional_slug();
