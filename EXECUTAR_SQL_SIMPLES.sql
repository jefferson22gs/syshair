-- =============================================
-- SCRIPT SIMPLIFICADO - EXECUTAR NO SUPABASE SQL EDITOR
-- https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/sql
-- =============================================

-- IMPORTANTE: Execute cada bloco separadamente, um por vez

-- ========== BLOCO 1: Fix broadcast_templates ==========
ALTER TABLE public.broadcast_templates
RENAME COLUMN message TO content;

-- ========== BLOCO 2: Fix ai_provider_keys parte 1 ==========
ALTER TABLE public.ai_provider_keys
RENAME COLUMN key_value TO api_key;

-- ========== BLOCO 3: Fix ai_provider_keys parte 2 ==========
ALTER TABLE public.ai_provider_keys
ADD COLUMN is_active BOOLEAN DEFAULT true;

-- ========== BLOCO 4: Fix ai_provider_keys parte 3 ==========
UPDATE public.ai_provider_keys
SET is_active = (status = 'active');

-- ========== BLOCO 5: Fix ai_provider_keys parte 4 ==========
ALTER TABLE public.ai_provider_keys
DROP COLUMN status;

-- ========== BLOCO 6: Fix broadcast_messages ==========
ALTER TABLE public.broadcast_messages
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255);

-- ========== BLOCO 7: Fix broadcast_messages rename ==========
ALTER TABLE public.broadcast_messages
RENAME COLUMN phone TO recipient_phone;

-- ========== VERIFICAÇÃO FINAL ==========
-- Execute este SELECT para confirmar que tudo está correto
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

-- Resultado esperado:
-- ai_provider_keys | api_key | text
-- ai_provider_keys | is_active | boolean
-- broadcast_messages | recipient_name | character varying
-- broadcast_messages | recipient_phone | character varying
-- broadcast_messages | sent_at | timestamp with time zone
-- broadcast_templates | content | text
