# 🤖 Guia de Correção - Chatbot IA WhatsApp

## 🔴 Problema Relatado
A IA só responde: "Olá! No momento estamos fora do horário de atendimento. Retornaremos em breve!"

## 🔍 Diagnóstico

### Causas Possíveis:
1. **Horário de funcionamento muito restritivo** - A IA verifica horário ANTES de processar a mensagem
2. **Campo `custom_instructions` vazio** - A IA não tem contexto do salão
3. **API Key não configurada** - A IA não consegue gerar respostas
4. **Dias da semana incorretos** - Configuração de `active_days` errada

## ✅ Solução Passo a Passo

### PASSO 1: Verificar Configurações Atuais
Execute no **Supabase SQL Editor**:
```sql
-- Ver arquivo: CHECK_CHATBOT_CONFIG.sql
```

### PASSO 2: Aplicar Correções
Execute no **Supabase SQL Editor**:
```sql
-- Ver arquivo: FIX_CHATBOT_AI.sql
```

### PASSO 3: Configurar no Painel Admin

1. Acesse: **Admin → Chatbot IA → Aba "Configurações"**

2. **Verificar Horário de Funcionamento:**
   - Início: `00:00` (ou horário desejado)
   - Fim: `23:59` (ou horário desejado)
   - Dias Ativos: Marque TODOS os dias (ou os dias desejados)

3. **Verificar API Key:**
   - Provedor: OpenAI, Gemini, Groq, etc.
   - API Key: Deve estar preenchida
   - Se vazia, configure uma chave válida

4. **Aba "Treinamento":**
   - **Prompt do Sistema**: Deve ter instruções claras
   - **Instruções Personalizadas**: Adicione informações do salão:
     ```
     Informações do Salão:
     - Nome: [Nome do Salão]
     - Endereço: [Endereço completo]
     - Telefone: [Telefone]
     - Horário: Segunda a Sábado, 9h às 18h

     Serviços Principais:
     - Corte Masculino: R$ 50,00 (30 min)
     - Barba: R$ 30,00 (20 min)
     - Corte + Barba: R$ 70,00 (45 min)

     Formas de Pagamento:
     - Dinheiro, PIX, Cartão de Crédito/Débito
     ```

5. **Base de Conhecimento** (Opcional mas recomendado):
   - Adicione perguntas frequentes
   - Exemplo:
     - P: "Qual o preço do corte?"
     - R: "O corte masculino custa R$ 50,00 e leva cerca de 30 minutos."

6. **Salvar Configurações**

### PASSO 4: Testar

1. **Teste no Painel Admin:**
   - Vá na aba "Testar"
   - Envie uma mensagem: "Olá, quais serviços vocês oferecem?"
   - A IA deve responder com informações do salão

2. **Teste no WhatsApp:**
   - Envie uma mensagem para o número do salão
   - A IA deve responder com contexto, não apenas "fora do horário"

## 🐛 Debug Avançado

### Ver Logs da Edge Function:
1. Acesse: Supabase Dashboard → Edge Functions → `evolution-webhook`
2. Clique em "Logs"
3. Envie uma mensagem no WhatsApp
4. Verifique os logs:
   - ✅ "Message from [número]" - Mensagem recebida
   - ✅ "Using global API key" - API key encontrada
   - ❌ "Chatbot disabled" - Chatbot desativado
   - ❌ "out_of_hours_message_sent" - Fora do horário

### Verificar Horário Atual do Servidor:
```sql
SELECT
    NOW() as horario_servidor,
    EXTRACT(DOW FROM NOW()) as dia_semana,
    TO_CHAR(NOW(), 'HH24:MI') as hora_atual;
```

### Verificar se Mensagem Está Chegando:
```sql
SELECT *
FROM chatbot_conversations
ORDER BY created_at DESC
LIMIT 10;
```

## 📋 Checklist Final

- [ ] Horário de funcionamento configurado (00:00 - 23:59 para 24/7)
- [ ] Todos os dias da semana marcados
- [ ] API Key configurada e válida
- [ ] System Prompt preenchido
- [ ] Custom Instructions com informações do salão
- [ ] Chatbot ativado (switch ligado)
- [ ] WhatsApp conectado e funcionando
- [ ] Testado no painel admin
- [ ] Testado no WhatsApp real

## 🎯 Resultado Esperado

Após as correções, ao enviar "Olá" no WhatsApp, a IA deve responder algo como:

> "Olá! Bem-vindo ao [Nome do Salão]! 😊
>
> Sou o assistente virtual e estou aqui para ajudar. Como posso te atender hoje?
>
> Posso te informar sobre:
> - Nossos serviços e preços
> - Horários disponíveis
> - Localização e contato
> - Agendar um horário"

## 🆘 Se Ainda Não Funcionar

1. Execute `CHECK_CHATBOT_CONFIG.sql` e envie o resultado
2. Verifique os logs da Edge Function
3. Confirme que a API Key está válida (teste em https://platform.openai.com)
4. Verifique se há saldo na conta da API (OpenAI, Gemini, etc.)
