-- =============================================
-- EXECUTAR NO SUPABASE SQL EDITOR COM URGÊNCIA
-- https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/sql
-- =============================================

-- 1. FIX broadcast_templates: renomear 'message' para 'content'
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'broadcast_templates'
        AND column_name = 'message'
    ) THEN
        ALTER TABLE public.broadcast_templates RENAME COLUMN message TO content;
        RAISE NOTICE 'broadcast_templates.message renomeado para content';
    ELSE
        RAISE NOTICE 'broadcast_templates.content já existe';
    END IF;
END $$;

-- 2. FIX ai_provider_keys: renomear 'key_value' para 'api_key'
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'ai_provider_keys'
        AND column_name = 'key_value'
    ) THEN
        ALTER TABLE public.ai_provider_keys RENAME COLUMN key_value TO api_key;
        RAISE NOTICE 'ai_provider_keys.key_value renomeado para api_key';
    ELSE
        RAISE NOTICE 'ai_provider_keys.api_key já existe';
    END IF;
END $$;

-- 3. FIX ai_provider_keys: converter 'status' TEXT para 'is_active' BOOLEAN
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'ai_provider_keys'
        AND column_name = 'status'
        AND data_type = 'text'
    ) THEN
        -- Adicionar nova coluna
        ALTER TABLE public.ai_provider_keys ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

        -- Migrar dados: 'active' -> true, outros -> false
        UPDATE public.ai_provider_keys SET is_active = (status = 'active');

        -- Remover coluna antiga
        ALTER TABLE public.ai_provider_keys DROP COLUMN status;

        RAISE NOTICE 'ai_provider_keys.status convertido para is_active';
    ELSE
        RAISE NOTICE 'ai_provider_keys.is_active já existe';
    END IF;
END $$;

-- 4. FIX broadcast_messages: adicionar colunas faltantes
ALTER TABLE public.broadcast_messages ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.broadcast_messages ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255);

-- 5. FIX broadcast_messages: renomear 'phone' para 'recipient_phone'
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'broadcast_messages'
        AND column_name = 'phone'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'broadcast_messages'
        AND column_name = 'recipient_phone'
    ) THEN
        ALTER TABLE public.broadcast_messages RENAME COLUMN phone TO recipient_phone;
        RAISE NOTICE 'broadcast_messages.phone renomeado para recipient_phone';
    ELSE
        RAISE NOTICE 'broadcast_messages.recipient_phone já existe';
    END IF;
END $$;

-- 6. Verificar resultado
SELECT
    'broadcast_templates' as tabela,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'broadcast_templates'
AND column_name IN ('message', 'content')

UNION ALL

SELECT
    'ai_provider_keys' as tabela,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'ai_provider_keys'
AND column_name IN ('key_value', 'api_key', 'status', 'is_active')

UNION ALL

SELECT
    'broadcast_messages' as tabela,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'broadcast_messages'
AND column_name IN ('phone', 'recipient_phone', 'recipient_name', 'sent_at')
ORDER BY tabela, column_name;
