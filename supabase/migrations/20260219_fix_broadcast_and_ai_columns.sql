-- =============================================
-- FIX: Corrigir colunas das tabelas broadcast_templates e ai_provider_keys
-- Data: 2026-02-19
-- =============================================

-- Fix broadcast_templates: renomear 'message' para 'content'
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'broadcast_templates'
        AND column_name = 'message'
    ) THEN
        ALTER TABLE public.broadcast_templates RENAME COLUMN message TO content;
    END IF;
END $$;

-- Fix ai_provider_keys: renomear 'key_value' para 'api_key' e 'status' para 'is_active'
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ai_provider_keys'
        AND column_name = 'key_value'
    ) THEN
        ALTER TABLE public.ai_provider_keys RENAME COLUMN key_value TO api_key;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ai_provider_keys'
        AND column_name = 'status'
    ) THEN
        -- Primeiro adicionar a nova coluna
        ALTER TABLE public.ai_provider_keys ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

        -- Migrar dados: 'active' -> true, outros -> false
        UPDATE public.ai_provider_keys SET is_active = (status = 'active');

        -- Remover coluna antiga
        ALTER TABLE public.ai_provider_keys DROP COLUMN status;
    END IF;
END $$;

-- Adicionar coluna sent_at se não existir em broadcast_messages
ALTER TABLE public.broadcast_messages ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE;

-- Adicionar coluna recipient_name se não existir em broadcast_messages
ALTER TABLE public.broadcast_messages ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255);

-- Renomear phone para recipient_phone se necessário
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'broadcast_messages'
        AND column_name = 'phone'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'broadcast_messages'
        AND column_name = 'recipient_phone'
    ) THEN
        ALTER TABLE public.broadcast_messages RENAME COLUMN phone TO recipient_phone;
    END IF;
END $$;

COMMENT ON COLUMN public.broadcast_templates.content IS 'Conteúdo da mensagem do template';
COMMENT ON COLUMN public.ai_provider_keys.api_key IS 'Chave de API do provedor de IA';
COMMENT ON COLUMN public.ai_provider_keys.is_active IS 'Se a chave está ativa';
