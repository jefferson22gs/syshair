-- ============================================
-- VERIFICAR ESTRUTURA DA TABELA
-- Execute esta query primeiro
-- ============================================

-- Ver todas as colunas da tabela broadcast_messages
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'broadcast_messages'
  AND table_schema = 'public'
ORDER BY ordinal_position;
