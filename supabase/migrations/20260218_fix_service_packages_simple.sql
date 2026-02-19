-- ==============================================================================
-- CORREÇÃO: Remover coluna service_id da tabela service_packages
-- Data: 2026-02-18
-- ==============================================================================

-- 1. Remover coluna service_id de service_packages (se existir)
ALTER TABLE public.service_packages DROP COLUMN IF EXISTS service_id;

-- 2. Verificar estrutura
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'service_packages'
ORDER BY ordinal_position;

-- 3. Mensagem de sucesso
SELECT '✅ Coluna service_id removida com sucesso!' as status;
