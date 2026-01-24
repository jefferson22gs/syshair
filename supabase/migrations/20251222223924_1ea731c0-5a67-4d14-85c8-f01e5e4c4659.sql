-- =====================================================
-- SECURITY AUDIT: Corrigindo políticas RLS
-- =====================================================

-- 1. SALONS: Permitir visualização pública apenas de informações básicas
-- Primeiro, dropar a política existente de SELECT que está muito permissiva
DROP POLICY IF EXISTS "Owners can view their salons" ON public.salons;

-- Criar política para proprietários verem seus próprios salões
CREATE POLICY "Owners can view their salons" 
ON public.salons 
FOR SELECT 
USING (
  owner_id = auth.uid() 
  OR get_user_salon_id(auth.uid()) = id
);

-- Permitir leitura pública apenas para salões ativos (necessário para booking público)
CREATE POLICY "Public can view active salons basic info" 
ON public.salons 
FOR SELECT 
USING (is_active = true);


-- 2. PROFESSIONALS: Permitir visualização pública apenas de profissionais ativos
DROP POLICY IF EXISTS "Salon members can view professionals" ON public.professionals;

-- Donos do salão podem ver todos os profissionais
CREATE POLICY "Salon owners can view all professionals" 
ON public.professionals 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM salons 
    WHERE salons.id = professionals.salon_id 
    AND salons.owner_id = auth.uid()
  )
  OR user_id = auth.uid()
  OR get_user_salon_id(auth.uid()) = salon_id
);

-- Público pode ver profissionais ativos (para booking)
CREATE POLICY "Public can view active professionals" 
ON public.professionals 
FOR SELECT 
USING (is_active = true);


-- 3. SERVICES: Já está OK (Anyone can view active services)
-- Mantém como está


-- 4. APPOINTMENTS: Remover acesso público, manter apenas para membros do salão
DROP POLICY IF EXISTS "Anyone can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Salon members can view appointments" ON public.appointments;

-- Qualquer pessoa pode criar agendamentos (necessário para booking público)
CREATE POLICY "Anyone can create appointments" 
ON public.appointments 
FOR INSERT 
WITH CHECK (true);

-- Apenas membros do salão podem ver agendamentos
CREATE POLICY "Salon members can view appointments" 
ON public.appointments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM salons 
    WHERE salons.id = appointments.salon_id 
    AND salons.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM professionals 
    WHERE professionals.id = appointments.professional_id 
    AND professionals.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM clients 
    WHERE clients.id = appointments.client_id 
    AND clients.user_id = auth.uid()
  )
  OR get_user_salon_id(auth.uid()) = salon_id
);


-- 5. CLIENTS: Remover acesso público
DROP POLICY IF EXISTS "Salon members can view clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert themselves as clients" ON public.clients;

-- Apenas membros do salão podem ver clientes
CREATE POLICY "Salon members can view clients" 
ON public.clients 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM salons 
    WHERE salons.id = clients.salon_id 
    AND salons.owner_id = auth.uid()
  )
  OR user_id = auth.uid()
  OR get_user_salon_id(auth.uid()) = salon_id
);

-- Usuários podem se cadastrar como clientes
CREATE POLICY "Users can insert themselves as clients" 
ON public.clients 
FOR INSERT 
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);


-- 6. COUPONS: Manter visualização pública apenas do código para validação
-- Já está OK - cupons ativos são públicos para aplicação no checkout


-- 7. USER_ROLES: Garantir que não há como modificar roles pelo frontend
-- Já está OK - INSERT, UPDATE, DELETE bloqueados


-- 8. PROFILES: Garantir que apenas o próprio usuário vê seu perfil
-- Já está OK - políticas existentes são corretas


-- 9. PROFESSIONAL_SERVICES: Já está OK
-- Anyone can view, salon owners can manage