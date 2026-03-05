-- ============================================
-- CORREÇÃO URGENTE - BROADCAST NÃO ENVIA
-- Data: 2026-02-20 14:21
-- ============================================

-- PROBLEMA IDENTIFICADO:
-- O broadcast fica "rodando" mas não envia mensagens
-- Possíveis causas:
-- 1. Instância WhatsApp desconectada
-- 2. Nome da instância incorreto
-- 3. Formato de número incorreto
-- 4. Timeout na Evolution API

-- ============================================
-- PASSO 1: VERIFICAR INSTÂNCIAS DISPONÍVEIS
-- ============================================

-- Instâncias encontradas na Evolution API:
-- 1. tubarao - CONECTADA ✓
-- 2. syshair_daniel_cabelos_1777c2a7 - CONECTADA ✓
-- 3. syshair_jefferson_santos_31a1af0c - DESCONECTADA ✗

-- Verificar qual instância está no banco:
SELECT
    'Instância no banco' as info,
    instance_name,
    status,
    phone_number,
    salon_id
FROM whatsapp_instances
ORDER BY updated_at DESC;

-- ============================================
-- PASSO 2: ATUALIZAR INSTÂNCIA SE NECESSÁRIO
-- ============================================

-- Se a instância no banco estiver desconectada ou com nome errado,
-- atualizar para uma instância conectada:

-- Opção A: Usar instância "syshair_daniel_cabelos_1777c2a7"
UPDATE whatsapp_instances
SET
    instance_name = 'syshair_daniel_cabelos_1777c2a7',
    status = 'connected',
    phone_number = '5519982143580',
    updated_at = NOW()
WHERE salon_id = (SELECT id FROM salons LIMIT 1);

-- Opção B: Usar instância "tubarao" (se preferir)
-- UPDATE whatsapp_instances
-- SET
--     instance_name = 'tubarao',
--     status = 'connected',
--     phone_number = '5511986262240',
--     updated_at = NOW()
-- WHERE salon_id = (SELECT id FROM salons LIMIT 1);

-- Verificar resultado:
SELECT
    'Instância atualizada' as status,
    instance_name,
    status,
    phone_number
FROM whatsapp_instances;

-- ============================================
-- PASSO 3: PARAR BROADCASTS TRAVADOS
-- ============================================

-- Se houver broadcasts com status "processing" há muito tempo, parar:
UPDATE broadcasts
SET
    status = 'stopped',
    error_message = 'Parado manualmente - broadcast travado',
    completed_at = NOW()
WHERE status = 'processing'
  AND created_at < NOW() - INTERVAL '10 minutes';

-- Verificar resultado:
SELECT
    'Broadcasts parados' as status,
    COUNT(*) as quantidade
FROM broadcasts
WHERE status = 'stopped'
  AND completed_at >= NOW() - INTERVAL '1 minute';

-- ============================================
-- PASSO 4: LIMPAR MENSAGENS PENDENTES
-- ============================================

-- Marcar mensagens pendentes antigas como failed:
UPDATE broadcast_messages
SET
    status = 'failed',
    error_message = 'Timeout - broadcast travado'
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '10 minutes';

-- Verificar resultado:
SELECT
    'Mensagens limpas' as status,
    COUNT(*) as quantidade
FROM broadcast_messages
WHERE status = 'failed'
  AND error_message = 'Timeout - broadcast travado';

-- ============================================
-- PASSO 5: VERIFICAR FORMATO DOS NÚMEROS
-- ============================================

-- Verificar se os números dos clientes estão no formato correto:
SELECT
    'Formato dos números' as info,
    phone,
    LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) as tamanho_numerico,
    CASE
        WHEN LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) = 13 THEN '✓ Formato correto (55 + DDD + número)'
        WHEN LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) = 11 THEN '⚠️ Falta DDI 55'
        WHEN LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) = 10 THEN '⚠️ Falta DDI 55 e 9'
        ELSE '✗ Formato inválido'
    END as validacao
FROM clients
WHERE phone IS NOT NULL
LIMIT 10;

-- ============================================
-- PASSO 6: TESTE MANUAL DE ENVIO
-- ============================================

-- Para testar manualmente, use o curl:
-- curl -X POST "https://api.tubaraoemprestimo.com.br/message/sendText/syshair_daniel_cabelos_1777c2a7" \
--   -H "apikey: B8959800-F546-407C-99E8-C40306E747F5" \
--   -H "Content-Type: application/json" \
--   -d '{
--     "number": "5519982143580@s.whatsapp.net",
--     "text": "Teste de envio"
--   }'

-- ============================================
-- PASSO 7: VERIFICAÇÃO FINAL
-- ============================================

-- Verificar se tudo está OK:
SELECT
    '=== VERIFICAÇÃO FINAL ===' as secao,
    wi.instance_name,
    wi.status as whatsapp_status,
    wi.phone_number,
    (SELECT COUNT(*) FROM broadcasts WHERE status = 'processing') as broadcasts_rodando,
    (SELECT COUNT(*) FROM broadcast_messages WHERE status = 'pending') as mensagens_pendentes,
    (SELECT COUNT(*) FROM clients WHERE phone IS NOT NULL) as clientes_com_telefone
FROM whatsapp_instances wi
LIMIT 1;

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- instance_name: syshair_daniel_cabelos_1777c2a7 (ou tubarao)
-- whatsapp_status: connected
-- broadcasts_rodando: 0
-- mensagens_pendentes: 0
-- clientes_com_telefone: > 0
