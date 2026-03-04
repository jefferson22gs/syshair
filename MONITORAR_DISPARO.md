# 🔍 MONITORAR DISPARO - DANIEL CABELOS

**Data:** 04/03/2026 19:55
**Salão:** Daniel Cabelos
**Status:** Monitorando disparo em tempo real

---

## 🚨 EXECUTE ESTAS QUERIES AGORA

Acesse: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/sql

---

### Query 1: Ver Status do Broadcast

```sql
-- Ver broadcasts recentes do salão Daniel Cabelos
SELECT 
    b.id,
    b.status,
    b.total_recipients,
    b.sent_count,
    b.failed_count,
    b.progress_percent,
    b.created_at,
    b.last_activity_at,
    s.name as salon_name
FROM broadcasts b
JOIN salons s ON s.id = b.salon_id
WHERE s.name ILIKE '%daniel%cabelos%'
ORDER BY b.created_at DESC
LIMIT 5;
```

**O que verificar:**
- `status`: deve estar 'processing' ou 'completed'
- `sent_count`: quantas mensagens foram enviadas
- `failed_count`: quantas falharam
- `progress_percent`: progresso atual
- `last_activity_at`: última atividade (deve ser recente)

---

### Query 2: Ver Queue do Broadcast

```sql
-- Ver queue do broadcast mais recente
SELECT 
    bq.status,
    COUNT(*) as total,
    MIN(bq.created_at) as oldest,
    MAX(bq.updated_at) as newest
FROM broadcast_queue bq
JOIN broadcasts b ON b.id = bq.broadcast_id
JOIN salons s ON s.id = b.salon_id
WHERE s.name ILIKE '%daniel%cabelos%'
  AND b.created_at >= NOW() - INTERVAL '1 hour'
GROUP BY bq.status;
```

**O que verificar:**
- `pending`: mensagens aguardando envio
- `processing`: mensagens sendo enviadas
- `sent`: mensagens enviadas com sucesso
- `failed`: mensagens que falharam

---

### Query 3: Ver Mensagens Individuais

```sql
-- Ver mensagens individuais da queue
SELECT 
    bq.id,
    bq.recipient_phone,
    bq.status,
    bq.attempts,
    bq.error_message,
    bq.created_at,
    bq.updated_at
FROM broadcast_queue bq
JOIN broadcasts b ON b.id = bq.broadcast_id
JOIN salons s ON s.id = b.salon_id
WHERE s.name ILIKE '%daniel%cabelos%'
  AND b.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY bq.created_at DESC
LIMIT 20;
```

**O que verificar:**
- `error_message`: se houver erros, aparecerá aqui
- `attempts`: quantas tentativas foram feitas
- `status`: status individual de cada mensagem

---

## 🔧 PROBLEMAS COMUNS E SOLUÇÕES

### Problema 1: Queue não está processando (tudo 'pending')

**Causa:** Worker não está rodando ou cron job parado

**Solução:**
```sql
-- Verificar cron job
SELECT jobid, schedule, active 
FROM cron.job 
WHERE command LIKE '%broadcast-queue-worker%';

-- Se não estiver ativo, ativar
UPDATE cron.job 
SET active = true 
WHERE command LIKE '%broadcast-queue-worker%';

-- Executar worker manualmente
SELECT net.http_post(
    url := 'https://jfjbpjnnfnuiezchhust.supabase.co/functions/v1/broadcast-queue-worker',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
);
```

---

### Problema 2: Mensagens falhando (status 'failed')

**Causa:** Problema com API Evolution ou instância WhatsApp

**Solução:**
```sql
-- Ver erros específicos
SELECT error_message, COUNT(*) 
FROM broadcast_queue bq
JOIN broadcasts b ON b.id = bq.broadcast_id
JOIN salons s ON s.id = b.salon_id
WHERE s.name ILIKE '%daniel%cabelos%'
  AND bq.status = 'failed'
GROUP BY error_message;

-- Verificar instância WhatsApp
SELECT 
    instance_name,
    is_connected,
    last_check_at
FROM whatsapp_instances
WHERE salon_id = (SELECT id FROM salons WHERE name ILIKE '%daniel%cabelos%');
```

**Se instância desconectada:**
- Reconectar no Evolution API
- Verificar se o número está ativo

---

### Problema 3: Worker muito lento

**Causa:** Rate limiting ou delay configurado

**Solução:**
```sql
-- Processar mais rápido (executar worker várias vezes)
SELECT net.http_post(
    url := 'https://jfjbpjnnfnuiezchhust.supabase.co/functions/v1/broadcast-queue-worker',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
);

-- Executar 5x para acelerar
-- (copie e cole o comando acima 5 vezes)
```

---

### Problema 4: Broadcast travado

**Causa:** Broadcast sem atividade há muito tempo

**Solução:**
```sql
-- Ver broadcasts travados
SELECT 
    id,
    status,
    last_activity_at,
    EXTRACT(EPOCH FROM (NOW() - last_activity_at))/60 as minutes_inactive
FROM broadcasts
WHERE status = 'processing'
  AND last_activity_at < NOW() - INTERVAL '10 minutes';

-- Marcar como failed e reprocessar
UPDATE broadcasts
SET status = 'failed',
    error_message = 'Broadcast travado - reprocessar manualmente'
WHERE id = 'BROADCAST_ID_AQUI';

-- Voltar mensagens para pending
UPDATE broadcast_queue
SET status = 'pending',
    attempts = 0
WHERE broadcast_id = 'BROADCAST_ID_AQUI'
  AND status IN ('processing', 'failed');
```

---

## 📊 MONITORAMENTO EM TEMPO REAL

Execute esta query a cada 10 segundos para ver progresso:

```sql
SELECT 
    b.id,
    b.status,
    b.total_recipients,
    b.sent_count,
    b.failed_count,
    b.progress_percent,
    EXTRACT(EPOCH FROM (NOW() - b.last_activity_at)) as seconds_since_activity,
    (SELECT COUNT(*) FROM broadcast_queue WHERE broadcast_id = b.id AND status = 'pending') as pending,
    (SELECT COUNT(*) FROM broadcast_queue WHERE broadcast_id = b.id AND status = 'processing') as processing
FROM broadcasts b
JOIN salons s ON s.id = b.salon_id
WHERE s.name ILIKE '%daniel%cabelos%'
ORDER BY b.created_at DESC
LIMIT 1;
```

---

## 🚀 FORÇAR PROCESSAMENTO RÁPIDO

Se quiser acelerar o envio:

```sql
-- Executar worker 10 vezes seguidas
DO $$
BEGIN
    FOR i IN 1..10 LOOP
        PERFORM net.http_post(
            url := 'https://jfjbpjnnfnuiezchhust.supabase.co/functions/v1/broadcast-queue-worker',
            headers := '{"Content-Type": "application/json"}'::jsonb,
            body := '{}'::jsonb
        );
        PERFORM pg_sleep(2); -- Aguardar 2 segundos entre cada execução
    END LOOP;
END $$;
```

---

## ✅ CHECKLIST DE DIAGNÓSTICO

- [ ] Query 1 executada - Status do broadcast verificado
- [ ] Query 2 executada - Queue verificada
- [ ] Query 3 executada - Mensagens individuais verificadas
- [ ] Cron job verificado (ativo?)
- [ ] Instância WhatsApp verificada (conectada?)
- [ ] Erros identificados
- [ ] Solução aplicada

---

## 📞 INFORMAÇÕES

**Salão:** Daniel Cabelos
**Instância WhatsApp:** syshair_daniel_cabelos_1777c2a7
**Número:** +55 19 98214-3580

---

**Criado em:** 04/03/2026 19:55
**Status:** Aguardando diagnóstico
