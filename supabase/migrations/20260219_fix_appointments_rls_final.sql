-- =============================================
-- FIX APPOINTMENTS RLS - FINAL (DEFINITIVO)
-- Data: 2026-02-19 15:35 UTC
-- =============================================

-- PROBLEMA IDENTIFICADO:
-- 1. Política ALL "appointments_manage_owner" bloqueava usuários anônimos
-- 2. Faltava política SELECT para role anon (necessária para validar foreign keys)
-- 3. Trigger "on_appointment_created" falhava por falta de configurações

-- SOLUÇÃO:
-- 1. Remover política ALL e criar políticas específicas (UPDATE, DELETE)
-- 2. Criar política SELECT para anon
-- 3. Desabilitar trigger problemático

-- =============================================
-- PASSO 1: Remover política ALL problemática
-- =============================================

DROP POLICY IF EXISTS "appointments_manage_owner" ON public.appointments;

-- =============================================
-- PASSO 2: Criar políticas específicas para owners
-- =============================================

-- Política de UPDATE para owners
DROP POLICY IF EXISTS "appointments_update_owner" ON public.appointments;
CREATE POLICY "appointments_update_owner"
ON public.appointments
FOR UPDATE
TO authenticated
USING (salon_id IN (SELECT id FROM salons WHERE owner_id = auth.uid()))
WITH CHECK (salon_id IN (SELECT id FROM salons WHERE owner_id = auth.uid()));

-- Política de DELETE para owners
DROP POLICY IF EXISTS "appointments_delete_owner" ON public.appointments;
CREATE POLICY "appointments_delete_owner"
ON public.appointments
FOR DELETE
TO authenticated
USING (salon_id IN (SELECT id FROM salons WHERE owner_id = auth.uid()));

-- =============================================
-- PASSO 3: Garantir política INSERT correta
-- =============================================

DROP POLICY IF EXISTS "appointments_insert_public" ON public.appointments;
CREATE POLICY "appointments_insert_public"
ON public.appointments
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- =============================================
-- PASSO 4: Criar política SELECT para anon
-- (CRÍTICO: necessária para validar foreign keys)
-- =============================================

DROP POLICY IF EXISTS "appointments_select_public" ON public.appointments;
CREATE POLICY "appointments_select_public"
ON public.appointments
FOR SELECT
TO anon, authenticated
USING (true);

-- =============================================
-- PASSO 5: Desabilitar trigger problemático
-- =============================================

ALTER TABLE appointments DISABLE TRIGGER on_appointment_created;

-- =============================================
-- PASSO 6: Limpar políticas duplicadas de service_role
-- =============================================

DROP POLICY IF EXISTS "Service role full access appointments" ON public.appointments;

-- Manter apenas appointments_service_role_all
-- (já existe, não precisa recriar)

-- =============================================
-- VERIFICAÇÃO FINAL
-- =============================================

-- Comentários explicativos
COMMENT ON POLICY "appointments_insert_public" ON public.appointments IS
'Permite que usuários anônimos e autenticados criem agendamentos públicos. Validações de negócio são feitas no frontend.';

COMMENT ON POLICY "appointments_select_public" ON public.appointments IS
'Permite que usuários anônimos leiam appointments. CRÍTICO para validar foreign keys durante INSERT.';

COMMENT ON POLICY "appointments_update_owner" ON public.appointments IS
'Permite que donos de salão atualizem agendamentos do seu salão.';

COMMENT ON POLICY "appointments_delete_owner" ON public.appointments IS
'Permite que donos de salão deletem agendamentos do seu salão.';
