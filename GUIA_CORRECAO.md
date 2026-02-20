# 🔧 GUIA DE CORREÇÃO - SYSHAIR
## Disparador de Transmissão e IA Chatbot

**Data:** 2026-02-20
**Status:** Pronto para execução

---

## 📋 RESUMO DOS PROBLEMAS

1. **Disparador de Lista de Transmissão não funcional**
2. **IA respondendo apenas: "Desculpe, não entendi sua mensagem. Pode reformular?"**

---

## 🚀 PASSO A PASSO PARA CORREÇÃO

### PASSO 1: Executar Diagnóstico (5 min)

1. Acessar o Supabase Dashboard:
   - URL: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust
   - Ir em: SQL Editor

2. Abrir o arquivo `DIAGNOSTICO_COMPLETO.sql` e executar todas as queries

3. Analisar os resultados:
   - ✅ **WhatsApp Status**: Deve estar `connected`
   - ✅ **API Key Length**: Deve ser > 0
   - ✅ **Horário Ativo**: Deve mostrar "ATIVO ✓"
   - ✅ **Base de Conhecimento**: Deve ter pelo menos 1 pergunta

---

### PASSO 2: Obter o Salon ID (2 min)

No resultado da última query do diagnóstico, você verá:

```
=== SALÕES CADASTRADOS ===
salon_id                              | name           | phone
--------------------------------------|----------------|-------------
123e4567-e89b-12d3-a456-426614174000 | Salão Exemplo  | (11) 9999-9999
```

**COPIE O `salon_id`** - você vai precisar dele!

---

### PASSO 3: Aplicar Correções (10 min)

1. Abrir o arquivo `CORRECOES_CHATBOT.sql`

2. **IMPORTANTE:** Substituir `'SEU_SALON_ID'` pelo ID copiado no Passo 2
   - Use Find & Replace (Ctrl+H)
   - Substituir: `'SEU_SALON_ID'`
   - Por: `'123e4567-e89b-12d3-a456-426614174000'` (seu ID real)

3. Executar as correções **NA ORDEM**:

   **Correção 1: Expandir Horário (EXECUTAR SEMPRE)**
   ```sql
   UPDATE chatbot_settings
   SET
       active_hours_start = '00:00',
       active_hours_end = '23:59',
       active_days = ARRAY[0, 1, 2, 3, 4, 5, 6],
       updated_at = NOW()
   WHERE enabled = true;
   ```

   **Correção 2: Melhorar System Prompt (EXECUTAR SEMPRE)**
   ```sql
   UPDATE chatbot_settings
   SET system_prompt = '...', custom_instructions = '...'
   WHERE enabled = true;
   ```

   **Correção 3: Melhorar Fallback Message (EXECUTAR SEMPRE)**
   ```sql
   UPDATE chatbot_settings
   SET fallback_message = '...'
   WHERE enabled = true;
   ```

   **Correção 4: Base de Conhecimento (EXECUTAR SE NÃO EXISTIR)**
   - Verificar se já existe: `SELECT COUNT(*) FROM chatbot_knowledge_base WHERE salon_id = 'SEU_ID';`
   - Se retornar 0, executar os INSERTs

   **Correção 5: API Key (EXECUTAR SE NÃO TIVER)**
   - Verificar se tem API key: `SELECT LENGTH(api_key) FROM chatbot_settings WHERE enabled = true;`
   - Se retornar 0 ou NULL:
     1. Obter API key gratuita em: https://console.groq.com
     2. Executar o INSERT com sua chave

   **Correção 6: Webhook (EXECUTAR SEMPRE)**
   ```sql
   UPDATE whatsapp_instances
   SET webhook_url = 'https://jfjbpjnnfnuiezchhust.supabase.co/functions/v1/evolution-webhook'
   WHERE webhook_url IS NULL OR webhook_url = '';
   ```

---

### PASSO 4: Verificar WhatsApp (5 min)

1. Acessar o sistema: http://localhost:5173/admin/whatsapp (ou URL de produção)

2. Verificar status da conexão:
   - ✅ **Verde/Conectado**: Tudo OK, pular para Passo 5
   - ❌ **Vermelho/Desconectado**: Seguir para reconexão

3. **Se desconectado:**
   - Clicar em "Conectar WhatsApp"
   - Escanear QR Code com o WhatsApp do salão
   - Aguardar status mudar para "Conectado"

---

### PASSO 5: Testar o Chatbot (10 min)

1. **Teste 1: Mensagem Simples**
   - Enviar no WhatsApp: "Olá"
   - ✅ **Esperado:** Resposta amigável
   - ❌ **Se responder "fora do horário":** Verificar Correção 1
   - ❌ **Se responder "não entendi":** Verificar Correção 5 (API key)

2. **Teste 2: Pergunta da Base**
   - Enviar: "Quais serviços vocês oferecem?"
   - ✅ **Esperado:** Lista de serviços
   - ❌ **Se não responder:** Verificar Correção 4

3. **Teste 3: Agendamento**
   - Enviar: "Quero agendar um corte"
   - ✅ **Esperado:** Perguntar data/horário

---

### PASSO 6: Testar o Broadcast (10 min)

1. Acessar: http://localhost:5173/admin/broadcast-messages

2. Clicar em "Carregar Contatos"
   - ✅ **Esperado:** Lista de contatos aparece
   - ❌ **Se não carregar:** Verificar Passo 4 (WhatsApp desconectado)

3. Selecionar 2-3 contatos (incluindo seu próprio número)

4. Escrever mensagem: "Teste de disparo - ignore esta mensagem"

5. Clicar em "Enviar"
   - ✅ **Esperado:** Status "Processando" → "Concluído"
   - ✅ **Esperado:** Mensagens recebidas no WhatsApp
   - ❌ **Se falhar:** Ver seção "Troubleshooting" abaixo

---

## 🔍 TROUBLESHOOTING

### Problema: Chatbot ainda responde "não entendi"

**Causa:** API Key não configurada ou inválida

**Solução:**
1. Verificar no banco:
   ```sql
   SELECT ai_provider, LENGTH(api_key) as key_length FROM chatbot_settings WHERE enabled = true;
   ```
2. Se `key_length = 0`:
   - Obter API key gratuita: https://console.groq.com
   - Executar Correção 5 com sua chave

3. Se `key_length > 0` mas ainda não funciona:
   - API key pode estar inválida
   - Gerar nova chave e atualizar:
   ```sql
   UPDATE chatbot_settings SET api_key = 'SUA_NOVA_CHAVE' WHERE enabled = true;
   ```

---

### Problema: Chatbot responde "fora do horário"

**Causa:** Horário de funcionamento muito restritivo

**Solução:**
1. Verificar horário atual:
   ```sql
   SELECT CURRENT_TIME, active_hours_start, active_hours_end FROM chatbot_settings;
   ```
2. Executar Correção 1 novamente (expandir para 24/7)

---

### Problema: Broadcast não envia mensagens

**Causa 1:** WhatsApp desconectado
- **Solução:** Seguir Passo 4 para reconectar

**Causa 2:** Credenciais Evolution API inválidas
- **Solução:** Verificar com o provedor da API

**Causa 3:** Números de telefone inválidos
- **Solução:** Verificar formato dos números (devem ter DDD)

---

### Problema: Erro "Unknown error" no broadcast

**Causa:** Evolution API retornando erro não descrito

**Solução:**
1. Verificar logs do Supabase:
   - Dashboard > Edge Functions > broadcast-messages > Logs
2. Procurar por erros específicos
3. O sistema já tem retry automático (3 tentativas)
4. Tolerância a 50 falhas consecutivas

---

## 📊 VERIFICAÇÃO FINAL

Execute esta query para confirmar que tudo está OK:

```sql
SELECT
    '✓ Chatbot Ativo' as check_item,
    cs.enabled as valor
FROM chatbot_settings cs WHERE cs.enabled = true
UNION ALL
SELECT
    '✓ API Key Configurada',
    CASE WHEN LENGTH(cs.api_key) > 0 THEN 'SIM' ELSE 'NÃO' END
FROM chatbot_settings cs WHERE cs.enabled = true
UNION ALL
SELECT
    '✓ Horário 24/7',
    CASE WHEN cs.active_hours_start = '00:00' AND cs.active_hours_end = '23:59' THEN 'SIM' ELSE 'NÃO' END
FROM chatbot_settings cs WHERE cs.enabled = true
UNION ALL
SELECT
    '✓ Base de Conhecimento',
    COUNT(*)::TEXT || ' perguntas'
FROM chatbot_knowledge_base WHERE enabled = true
UNION ALL
SELECT
    '✓ WhatsApp Conectado',
    wi.status
FROM whatsapp_instances wi
UNION ALL
SELECT
    '✓ Webhook Configurado',
    CASE WHEN wi.webhook_url IS NOT NULL THEN 'SIM' ELSE 'NÃO' END
FROM whatsapp_instances wi;
```

**Resultado esperado:**
```
✓ Chatbot Ativo          | true
✓ API Key Configurada    | SIM
✓ Horário 24/7           | SIM
✓ Base de Conhecimento   | 6 perguntas
✓ WhatsApp Conectado     | connected
✓ Webhook Configurado    | SIM
```

---

## 🎯 PRÓXIMOS PASSOS

Após todas as correções funcionarem:

1. **Ajustar horário de funcionamento** (se não quiser 24/7):
   ```sql
   UPDATE chatbot_settings
   SET
       active_hours_start = '08:00',
       active_hours_end = '22:00',
       active_days = ARRAY[1, 2, 3, 4, 5, 6]  -- Seg a Sáb
   WHERE enabled = true;
   ```

2. **Personalizar base de conhecimento**:
   - Adicionar mais perguntas específicas do salão
   - Atualizar preços, endereço, telefone

3. **Fazer commit das alterações**:
   ```bash
   cd D:\Projetos\syshair-main
   git add .
   git commit -m "fix: corrigir chatbot IA e disparador de transmissão"
   git push origin main
   ```

---

## 📞 SUPORTE

Se após seguir todos os passos ainda houver problemas:

1. Verificar logs do Supabase (Edge Functions)
2. Verificar console do navegador (F12) ao testar
3. Executar `DIAGNOSTICO_COMPLETO.sql` novamente e documentar resultados

---

**Tempo estimado total:** 40-50 minutos
**Dificuldade:** Média
**Requer:** Acesso ao Supabase Dashboard e WhatsApp do salão
