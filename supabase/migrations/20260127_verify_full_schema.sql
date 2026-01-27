-- ==============================================================================
-- SCRIPT DE INTEGRIDADE GERAL - SUPABASE/SYSHAIR
-- DESCRIÇÃO: Este script verifica e cria/corrige tabelas e colunas necessárias
--            para o funcionamento completo do Super Admin Dashboard.
-- EXECUÇÃO:  Rode este script completo no Supabase SQL Editor.
-- ==============================================================================

-- 1. Tabela de Salões (Core)
CREATE TABLE IF NOT EXISTS public.salons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id),
  name TEXT,
  slug TEXT UNIQUE,
  phone TEXT,
  owner_email TEXT,
  is_active BOOLEAN DEFAULT true,
  public_booking_enabled BOOLEAN DEFAULT false,
  whatsapp_connected BOOLEAN DEFAULT false,
  chatbot_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Garantir colunas em salons
DO $$
BEGIN
    ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS owner_email TEXT;
    ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS whatsapp_connected BOOLEAN DEFAULT false;
    ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS chatbot_enabled BOOLEAN DEFAULT false;
END $$;

-- 2. Tabela de Assinaturas (Subscriptions)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'trial',
  plan_id TEXT DEFAULT 'syshair-premium',
  is_trial BOOLEAN DEFAULT true,
  trial_end_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(salon_id)
);

-- Garantir colunas em subscriptions (correção de nomes)
DO $$
BEGIN
    ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT true;
    ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ;
    ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS plan_id TEXT DEFAULT 'syshair-premium';
END $$;

-- 3. Tabela de Notificações
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  title TEXT,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabela de Instâncias WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    instance_name TEXT NOT NULL,
    status TEXT DEFAULT 'disconnected',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(salon_id)
);

-- 5. Configurações Chatbot
CREATE TABLE IF NOT EXISTS public.chatbot_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(salon_id)
);

-- ==============================================================================
-- PERMISSÕES DE SUPER ADMIN (SEGURANÇA RLS)
-- ==============================================================================

-- Função auxiliar para verificar email de super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT email 
    FROM auth.users 
    WHERE id = auth.uid()
  ) IN ('jefferson22gs@gmail.com', 'admin@syshair.com');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Habilitar RLS se não estiver
ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas de super admin para evitar duplicação/erro
DROP POLICY IF EXISTS "Super Admins can select all salons" ON public.salons;
DROP POLICY IF EXISTS "Super Admins can update all salons" ON public.salons;
DROP POLICY IF EXISTS "Super Admins can delete salons" ON public.salons;
DROP POLICY IF EXISTS "Super Admins can manage subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Super Admins can manage notifications" ON public.notifications;

-- Criar Policies
CREATE POLICY "Super Admins can select all salons" ON public.salons FOR SELECT TO authenticated USING (is_super_admin());
CREATE POLICY "Super Admins can update all salons" ON public.salons FOR UPDATE TO authenticated USING (is_super_admin());
CREATE POLICY "Super Admins can delete salons" ON public.salons FOR DELETE TO authenticated USING (is_super_admin());

CREATE POLICY "Super Admins can manage subscriptions" ON public.subscriptions FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "Super Admins can manage notifications" ON public.notifications FOR ALL TO authenticated USING (is_super_admin());

-- Configurar bucket para mídias se não existir (Status Scheduler)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('status-media', 'status-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access Status Media" ON storage.objects FOR SELECT USING (bucket_id = 'status-media');
CREATE POLICY "Authenticated Upload Status Media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'status-media');

-- FIM DO SCRIPT
