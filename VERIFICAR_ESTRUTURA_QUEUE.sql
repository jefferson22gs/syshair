-- =====================================================
-- VERIFICAR ESTRUTURA DA TABELA broadcast_queue
-- Data: 2026-03-04 20:34
-- =====================================================

-- Ver todas as colunas da tabela broadcast_queue
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'broadcast_queue'
AND table_schema = 'public'
ORDER BY ordinal_position;
