-- =====================================================
-- SECURITY FIX: Tornando políticas mais restritivas
-- =====================================================

-- 1. CLIENTS: Corrigir para que apenas o dono do salão específico veja
DROP POLICY IF EXISTS "Salon members can view clients" ON public.clients;

CREATE POLICY "Salon members can view clients" 
ON public.clients 
FOR SELECT 
USING (
  -- Dono do salão pode ver clientes do SEU salão
  EXISTS (
    SELECT 1 FROM salons 
    WHERE salons.id = clients.salon_id 
    AND salons.owner_id = auth.uid()
  )
  -- Cliente pode ver seus próprios dados
  OR user_id = auth.uid()
  -- Profissional do salão pode ver clientes do salão
  OR EXISTS (
    SELECT 1 FROM professionals 
    WHERE professionals.salon_id = clients.salon_id 
    AND professionals.user_id = auth.uid()
  )
);


-- 2. APPOINTMENTS: Corrigir política para ser mais restritiva
DROP POLICY IF EXISTS "Salon members can view appointments" ON public.appointments;

CREATE POLICY "Salon members can view appointments" 
ON public.appointments 
FOR SELECT 
USING (
  -- Dono do salão pode ver agendamentos do SEU salão
  EXISTS (
    SELECT 1 FROM salons 
    WHERE salons.id = appointments.salon_id 
    AND salons.owner_id = auth.uid()
  )
  -- Profissional pode ver SEUS próprios agendamentos
  OR EXISTS (
    SELECT 1 FROM professionals 
    WHERE professionals.id = appointments.professional_id 
    AND professionals.user_id = auth.uid()
  )
  -- Cliente pode ver SEUS próprios agendamentos
  OR EXISTS (
    SELECT 1 FROM clients 
    WHERE clients.id = appointments.client_id 
    AND clients.user_id = auth.uid()
  )
);


-- 3. PROFESSIONAL_SERVICES: Restringir para público apenas ver serviços ativos
DROP POLICY IF EXISTS "Anyone can view professional services" ON public.professional_services;

-- Público pode ver serviços de profissionais ativos (necessário para booking)
CREATE POLICY "Public can view active professional services" 
ON public.professional_services 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM professionals 
    WHERE professionals.id = professional_services.professional_id 
    AND professionals.is_active = true
  )
);

-- Donos de salão podem gerenciar serviços dos profissionais
DROP POLICY IF EXISTS "Salon owners can manage professional services" ON public.professional_services;

CREATE POLICY "Salon owners can manage professional services" 
ON public.professional_services 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM professionals p
    JOIN salons s ON s.id = p.salon_id
    WHERE p.id = professional_services.professional_id 
    AND s.owner_id = auth.uid()
  )
);