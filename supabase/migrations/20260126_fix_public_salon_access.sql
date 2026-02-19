-- =============================================
-- SYSHAIR - FIX PUBLIC SALON ACCESS
-- Permite acesso público à página do salão
-- =============================================

-- Criar policy para permitir leitura pública de salões ativos com slug
-- Isso é necessário para a página pública funcionar sem login

DROP POLICY IF EXISTS "Public can read active salons by slug" ON public.salons;

CREATE POLICY "Public can read active salons by slug"
ON public.salons
FOR SELECT
TO anon, authenticated
USING (
    slug IS NOT NULL 
    AND (is_active IS NULL OR is_active = true)
);

-- Também garantir que serviços possam ser lidos publicamente para salões ativos
DROP POLICY IF EXISTS "Public can read services of active salons" ON public.services;

CREATE POLICY "Public can read services of active salons"
ON public.services
FOR SELECT
TO anon, authenticated
USING (
    active = true
    AND salon_id IN (
        SELECT id FROM public.salons 
        WHERE slug IS NOT NULL 
        AND (is_active IS NULL OR is_active = true)
    )
);

-- Profissionais também precisam ser lidos publicamente
DROP POLICY IF EXISTS "Public can read professionals of active salons" ON public.professionals;

CREATE POLICY "Public can read professionals of active salons"
ON public.professionals
FOR SELECT
TO anon, authenticated
USING (
    active = true
    AND salon_id IN (
        SELECT id FROM public.salons 
        WHERE slug IS NOT NULL 
        AND (is_active IS NULL OR is_active = true)
    )
);

-- Produtos públicos
DROP POLICY IF EXISTS "Public can read products of active salons" ON public.products;

CREATE POLICY "Public can read products of active salons"
ON public.products
FOR SELECT
TO anon, authenticated
USING (
    active = true
    AND salon_id IN (
        SELECT id FROM public.salons 
        WHERE slug IS NOT NULL 
        AND (is_active IS NULL OR is_active = true)
    )
);

-- Galeria pública
DROP POLICY IF EXISTS "Public can read gallery of active salons" ON public.gallery;

CREATE POLICY "Public can read gallery of active salons"
ON public.gallery
FOR SELECT
TO anon, authenticated
USING (
    is_public = true
    AND salon_id IN (
        SELECT id FROM public.salons 
        WHERE slug IS NOT NULL 
        AND (is_active IS NULL OR is_active = true)
    )
);

-- Permitir inserção de agendamentos por usuários anônimos (booking público)
DROP POLICY IF EXISTS "Public can create appointments" ON public.appointments;

CREATE POLICY "Public can create appointments"
ON public.appointments
FOR INSERT
TO anon, authenticated
WITH CHECK (
    salon_id IN (
        SELECT id FROM public.salons 
        WHERE public_booking_enabled = true
        AND (is_active IS NULL OR is_active = true)
    )
);

-- Permitir leitura de cupons para validação
DROP POLICY IF EXISTS "Public can read active coupons" ON public.coupons;

CREATE POLICY "Public can read active coupons"
ON public.coupons
FOR SELECT
TO anon, authenticated
USING (
    is_active = true
    AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
);

COMMENT ON POLICY "Public can read active salons by slug" ON public.salons IS 'Permite acesso público à página do salão via slug';
