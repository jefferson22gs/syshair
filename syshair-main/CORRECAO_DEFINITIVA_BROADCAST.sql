-- ============================================
-- CORREÇÃO DEFINITIVA - BROADCAST
-- Execute estas correções na ordem
-- Data: 2026-02-20 16:12
-- ============================================

-- CORREÇÃO 1: Limpar broadcasts antigos travados
UPDATE broadcasts
SET
    status = 'stopped',
    completed_at = NOW(),
    error_message = 'Parado manualmente - limpeza'
WHERE status IN ('processing', 'pending')
  OR (status = 'stopped' AND completed_at IS NULL);

-- Verificar resultado
SELECT
    'Broadcasts limpos' as status,
    COUNT(*) as quantidade
FROM broadcasts
WHERE status = 'stopped'
  AND completed_at >= NOW() - INTERVAL '1 minute';

-- CORREÇÃO 2: Limpar mensagens pendentes
UPDATE broadcast_messages
SET
    status = 'failed',
    error_message = 'Limpeza - broadcast não processado'
WHERE status = 'pending';

-- Verificar resultado
SELECT
    'Mensagens limpas' as status,
    COUNT(*) as quantidade
FROM broadcast_messages
WHERE status = 'failed'
  AND error_message = 'Limpeza - broadcast não processado';

-- CORREÇÃO 3: Verificar instância (já está correta)
SELECT
    'Instância atual' as info,
    instance_name,
    status,
    phone_number
FROM whatsapp_instances
LIMIT 1;

-- ============================================
-- TESTE MANUAL
-- ============================================

-- Agora faça um teste manual:
-- 1. Ir em /admin/broadcast-messages
-- 2. Carregar contatos
-- 3. Selecionar APENAS 1 contato (seu número)
-- 4. Escrever: "Teste final - funcionando!"
-- 5. Clicar em "Enviar"
-- 6. Aguardar 10 segundos
-- 7. Verificar se recebeu a mensagem

-- ============================================
-- VERIFICAR RESULTADO DO TESTE
-- ============================================

-- Após enviar o teste, execute esta query:
SELECT
    b.id,
    b.status,
    b.total_recipients,
    b.sent_count,
    b.failed_count,
    b.error_message,
    b.created_at,
    NOW() - b.created_at as tempo_decorrido
FROM broadcasts b
ORDER BY b.created_at DESC
LIMIT 1;

-- Ver mensagens do teste
SELECT
    recipient_phone,
    status,
    error_message,
    whatsapp_message_id,
    created_at,
    sent_at
FROM broadcast_messages
WHERE broadcast_id = (SELECT id FROM broadcasts ORDER BY created_at DESC LIMIT 1)
ORDER BY created_at DESC;

-- ============================================
-- INTERPRETAÇÃO DO RESULTADO:
-- ============================================

-- Se status = 'processing' e tempo_decorrido > 30 segundos:
--   → Broadcast travou, verificar logs do Supabase

-- Se status = 'completed' e sent_count = 1:
--   → SUCESSO! ✅ Broadcast funcionando

-- Se status = 'completed' e sent_count = 0:
--   → Problema na Edge Function, verificar logs

-- Se status = 'failed':
--   → Ver error_message para identificar causa
