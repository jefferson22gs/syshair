# 📱 Deploy Manual da Edge Function - broadcast-messages

## Opção 1: Via Dashboard do Supabase (Recomendado)

### Passos:

1. **Acesse o Dashboard do Supabase:**
   - URL: https://app.supabase.com/project/jfjbpjnnfnuiezchhust/functions

2. **Crie ou edite a função `broadcast-messages`:**
   - Se não existe: Clique em "New Function" → Nome: `broadcast-messages`
   - Se existe: Clique em `broadcast-messages` → "Edit"

3. **Substitua todo o código pelo conteúdo atualizado:**
   - Copie todo o conteúdo do arquivo: `supabase/functions/broadcast-messages/index.ts`
   - Cole no editor do dashboard

4. **Configurar Environment Variables (se necessário):**
   - Clique em "Environment Variables"
   - Adicionar:
     - EVOLUTION_API_URL = `https://api.tubaraoemprestimo.com.br`
     - EVOLUTION_API_KEY = `B8959800-F546-407C-99E8-C40306E747F5`
     - SUPABASE_URL = `https://jfjbpjnnfnuiezchhust.supabase.co`
     - SUPABASE_SERVICE_ROLE_KEY = `eyJhbGciOiJIUzI1NiIs...` (do .env)

5. **Salvar e Deploy:**
   - Clique em "Save"
   - Aguarde o deploy terminar (verde ✅)

6. **Testar:**
   - Clique em "Invoke"
   - Body de teste:
   ```json
   {
     "action": "get_status",
     "broadcastId": "seu-broadcast-id"
   }
   ```

---

## Opção 2: Via Git Integration (Vercel → Supabase)

Notificação automática está ativada no Vercel quando você faz push para GitHub.

---

## 🔧 Troubleshooting

### Se o deploy falhar:

1. **Verifique se as migrations foram rodadas:**
   ```sql
   SELECT * FROM migrations ORDER BY created_at DESC LIMIT 5;
   ```

2. **Verifique se as tabelas existem:**
   ```sql
   SELECT * FROM broadcasts LIMIT 1;
   SELECT * FROM broadcast_messages LIMIT 1;
   ```

3. **Logs da Function:**
   - Dashboard → Edge Functions → broadcast-messages → Logs
   - Procure por `=== BROADCAST STARTED ===`

---

## ✅ Após Deploy

1. **Teste novamente o envio de broadcast**
2. **Verifique os logs em tempo real** no dashboard do Supabase
3. **Monitore com script:**
   ```bash
   node check-broadcasts.cjs
   ```

---

## 📊 Status Atual (Antes do Deploy)

Últimos broadcasts:
- Broadcast 1: Status `stopped` - 3 contatos, 0 enviados, 1 falha (Erro: Unknown error)
- Broadcast 2: Status `stopped` - 500 contatos, 1 enviado, 1 falha (Erro: Unknown error)

**Problema identificado:** APIs retornando erro "Unknown error" sem descrição.

**Solução aplicada:** Aumentei tolerância de falhas (5 → 50 consecutivas) para evitar parar rapidamente.

---

## 🎯 Próximos Passos Após Deploy

1. Fazer um teste com 3-5 contatos
2. Monitorar os logs: deve ver `=== BROADCAST STARTED ===`
3. Verificar se consegue ver erros mais detalhados
4. Se continuar falhando, verificar API Evolution diretamente:
   ```bash
   curl -X POST https://api.tubaraoemprestimo.com.br/message/sendText/SUA_INSTANCE \
     -H "apikey: SUA_KEY" \
     -H "Content-Type: application/json" \
     -d '{"number":"55NUMERO@s.whatsapp.net","text":"Teste"}'
   ```
