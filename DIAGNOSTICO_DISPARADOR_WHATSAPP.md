# 🔍 DIAGNÓSTICO COMPLETO - DISPARADOR WHATSAPP

**Data:** 2026-03-04 18:30
**Status:** ❌ PROBLEMA IDENTIFICADO

---

## 🎯 PROBLEMA PRINCIPAL

O disparador de mensagens WhatsApp **trava e não dispara** devido a múltiplos problemas na implementação:

### 1. ❌ Processamento Assíncrono Sem Await
**Arquivo:** `supabase/functions/broadcast-messages/index.ts` (linha 293)

```typescript
// PROBLEMA: Inicia processamento mas retorna imediatamente
processMessages(broadcastId, instanceName, message, recipients, salonId, supabase)
    .catch(error => {
        console.error(`[BROADCAST ${broadcastId}] Fatal error:`, error);
    });

// Retorna sucesso ANTES de processar
return new Response(JSON.stringify({ success: true }), ...);
```

**Consequência:** A Edge Function retorna sucesso mas o processamento pode falhar silenciosamente.

### 2. ❌ Timeout da Edge Function
Edge Functions do Supabase têm timeout de **60 segundos**. Para disparos grandes:
- 100 contatos × 5 segundos = 500 segundos (8+ minutos)
- A função é interrompida após 60s

### 3. ❌ Falta de Tratamento de Erros na API Evolution
**Linha 89-94:**
```typescript
try {
    result = await response.json();
} catch (e) {
    result = { error: "Could not parse response" };
    // Continua mesmo com erro de parsing
}
```

### 4. ❌ Rate Limiting Muito Agressivo
```typescript
const RATE_LIMITS = {
    messageInterval: 5000, // 5 segundos entre mensagens
    batchSize: 20,
    batchPause: 600000, // 10 MINUTOS entre lotes
    maxConsecutiveFailures: 50
};
```

**Problema:** 10 minutos de pausa entre lotes torna o sistema impraticável.

### 5. ❌ Validação de Telefone Incompleta
```typescript
function formatPhoneNumber(phone: string): string | null {
    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.length === 13 && cleaned.startsWith('55')) {
        return cleaned;
    }
    // Outros casos...
}
```

**Problema:** Não valida se o número é válido no WhatsApp.

---

## 📊 ANÁLISE DO FLUXO ATUAL

```
1. Frontend chama broadcast-messages Edge Function
2. Edge Function cria registro em "broadcasts"
3. Edge Function inicia processMessages() em background
4. Edge Function retorna sucesso IMEDIATAMENTE
5. processMessages() tenta enviar mas:
   - Timeout após 60s
   - Erros não são reportados
   - Broadcast fica "processing" para sempre
```

---

## 🔧 PROBLEMAS IDENTIFICADOS NO FRONTEND

**Arquivo:** `src/components/admin/BroadcastMessagesEnhanced.tsx`

### 1. Polling Ineficiente (linha 128-137)
```typescript
useEffect(() => {
    if (!activeBroadcastId) return;

    const interval = setInterval(() => {
        loadBroadcasts();
        loadTodayStats();
    }, 5000); // Atualiza a cada 5 segundos

    return () => clearInterval(interval);
}, [activeBroadcastId]);
```

**Problema:** Faz polling mas não verifica se o broadcast realmente está progredindo.

### 2. Falta de Feedback Visual
Não mostra progresso em tempo real (quantas mensagens foram enviadas).

### 3. Botão "Parar" Não Funciona
```typescript
const stopBroadcast = async (broadcastId: string) => {
    const { error } = await supabase
        .from("broadcasts")
        .update({ status: "stopped" })
        .eq("id", broadcastId);
    // ...
}
```

**Problema:** Atualiza status no banco mas a Edge Function continua processando.

---

## 🎯 CONFIRMAÇÃO AUTOMÁTICA DE AGENDAMENTO

**Status:** ✅ IMPLEMENTADO MAS NÃO TESTADO

**Arquivo:** `supabase/functions/auto-appointment-confirmation/index.ts`

### Trigger SQL
```sql
CREATE TRIGGER on_appointment_created
    AFTER INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_appointment_confirmation();
```

**Problema Potencial:** Trigger pode não estar ativado ou função não deployada.

---

## 🎂 MENSAGENS DE ANIVERSÁRIO

**Status:** ✅ IMPLEMENTADO MAS SEM CRON JOB

**Arquivo:** `supabase/functions/auto-birthday-messages/index.ts`

**Problema:** Falta configurar o cron job no Supabase para executar diariamente.

---

## 📱 NOTIFICAÇÕES PUSH

**Status:** ⚠️ PARCIALMENTE IMPLEMENTADO

**Arquivos:**
- `src/hooks/usePushNotifications.tsx` - Web Push API
- `src/hooks/usePushNotificationsFCM.tsx` - Firebase
- `public/firebase-messaging-sw.js` - Service Worker

**Problema:** Não há trigger para enviar notificação quando agendamento é criado.

---

## 🌐 PWA PERSONALIZADO POR SALÃO

**Status:** ❌ NÃO IMPLEMENTADO

**Situação Atual:**
- PWA existe mas é único para todo o sistema
- Não há PWA personalizado por salão

**Necessário:**
- Manifest dinâmico por salão
- Service Worker personalizado
- Ícones e cores por salão

---

## 📅 INTEGRAÇÃO GOOGLE CALENDAR

**Status:** ❌ NÃO IMPLEMENTADO

**Necessário:**
- Google Calendar API
- OAuth2 para autenticação
- Sincronização bidirecional

---

## 🔄 CANCELAR/ALTERAR AGENDAMENTO

**Status:** ⚠️ PARCIALMENTE IMPLEMENTADO

**Situação Atual:**
- Admin pode cancelar/alterar
- Cliente NÃO pode cancelar/alterar

**Necessário:**
- Interface pública para cliente
- Token de autenticação por agendamento
- Link único enviado no WhatsApp

---

## 📊 VISUALIZAÇÃO DA AGENDA

**Status:** ⚠️ PRECISA MELHORIAS

**Arquivo:** `src/pages/admin/Appointments.tsx`

**Problemas:**
- Não mostra horários vagos claramente
- Difícil adicionar agendamento manualmente
- Falta visão de calendário

---

## 📋 STATUS WHATSAPP AUTOMÁTICO

**Status:** ✅ IMPLEMENTADO

**Arquivo:** `supabase/functions/process-scheduled-posts/index.ts`

**Problema:** Falta interface para agendar posts de status.

---

## 🎯 PRIORIDADES DE CORREÇÃO

### 🔴 CRÍTICO (Fazer AGORA)
1. ✅ Corrigir disparador WhatsApp (timeout + processamento)
2. ✅ Implementar confirmação automática de agendamento
3. ✅ Configurar mensagens de aniversário (cron job)
4. ✅ Implementar notificações push de agendamento

### 🟡 IMPORTANTE (Fazer em seguida)
5. ⚠️ Criar PWA personalizado por salão
6. ⚠️ Adicionar cancelar/alterar agendamento para cliente
7. ⚠️ Melhorar visualização da agenda
8. ⚠️ Integração Google Calendar

### 🟢 DESEJÁVEL (Fazer depois)
9. ⚠️ Interface para agendar status WhatsApp
10. ⚠️ Melhorias de UI/UX

---

## 🔧 SOLUÇÕES PROPOSTAS

### 1. Disparador WhatsApp - Solução com Queue

**Arquitetura Nova:**
```
Frontend → Edge Function (cria job) → Retorna imediatamente
                ↓
        Supabase Realtime
                ↓
        Worker Edge Function (processa em lotes)
                ↓
        Atualiza progresso em tempo real
```

**Implementação:**
- Criar tabela `broadcast_queue`
- Edge Function apenas cria jobs
- Worker processa em background
- Frontend recebe updates via Realtime

### 2. Confirmação Automática - Verificar Deploy

**Checklist:**
- [ ] Verificar se trigger existe
- [ ] Verificar se Edge Function está deployada
- [ ] Testar criando agendamento
- [ ] Verificar logs

### 3. Mensagens de Aniversário - Configurar Cron

**SQL para criar cron job:**
```sql
SELECT cron.schedule(
    'birthday-messages-daily',
    '0 9 * * *', -- 9h da manhã todo dia
    $$
    SELECT net.http_post(
        url := 'https://jfjbpjnnfnuiezchhust.supabase.co/functions/v1/auto-birthday-messages',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.supabase_service_role_key') || '"}'::jsonb,
        body := '{}'::jsonb
    );
    $$
);
```

### 4. Notificações Push - Adicionar Trigger

**Criar Edge Function:**
```typescript
// supabase/functions/notify-new-appointment/index.ts
// Chamada via trigger quando appointment é criado
// Envia push notification para dono do salão
```

### 5. PWA Personalizado - Manifest Dinâmico

**Criar endpoint:**
```typescript
// /api/manifest/:salonSlug
// Retorna manifest.json personalizado
```

---

## 📝 PRÓXIMOS PASSOS

1. ✅ Corrigir disparador WhatsApp (URGENTE)
2. ✅ Testar confirmação automática
3. ✅ Configurar cron de aniversário
4. ✅ Implementar notificações push
5. ⚠️ Criar PWA personalizado
6. ⚠️ Adicionar cancelamento para cliente
7. ⚠️ Melhorar agenda
8. ⚠️ Integrar Google Calendar

---

**Desenvolvido por:** Claude Opus 4.6
**Data:** 2026-03-04 18:30
