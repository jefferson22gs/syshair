# FUNCIONALIDADES FALTANTES - PLANO DE IMPLEMENTAÇÃO
Data: 2026-03-05

## ✅ JÁ FUNCIONANDO
- Sistema de broadcast com fila (corrigido)
- Agendamento básico na página pública

## ❌ FALTANDO IMPLEMENTAR

### 1. Confirmação WhatsApp ao agendar
**Status:** Trigger foi removido (causava erro)
**Solução:** Recriar trigger sem usar `app.supabase_url`
- Opção A: Usar cron job que verifica novos agendamentos a cada minuto
- Opção B: Chamar Edge Function diretamente do frontend após agendar

### 2. Notificações Push para dono do salão
**Status:** Função foi removida (causava erro)
**Solução:** Recriar sem usar `app.supabase_url`
- Implementar Web Push API no frontend
- Criar Edge Function que envia notificação
- Chamar do frontend após criar agendamento

### 3. PWA Personalizado por Salão
**Status:** Migrations criadas mas não testadas
**Arquivos:**
- `supabase/migrations/20260304_pwa_personalized_system.sql`
- Precisa criar endpoint `/api/manifest/[salonSlug]`
- Precisa adicionar service worker

### 4. Botão Adicionar ao Google Calendar
**Status:** Migrations criadas mas não implementadas no frontend
**Solução:**
- Adicionar botão na confirmação de agendamento
- Gerar link do Google Calendar com dados do agendamento

### 5. Chatbot IA
**Status:** Migrations criadas mas não testadas
**Arquivos:**
- `CONFIGURAR_GROQ_API.sql` (precisa executar com API key real)
- `supabase/migrations/20260304_fix_chatbot_prompts.sql`

## PRIORIDADE DE IMPLEMENTAÇÃO
1. Confirmação WhatsApp (mais crítico)
2. Botão Google Calendar (mais fácil)
3. Notificações Push
4. PWA
5. Testar Chatbot
