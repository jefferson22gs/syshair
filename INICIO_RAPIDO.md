# 🎯 INÍCIO RÁPIDO - 5 MINUTOS

**Última atualização:** 2026-02-20 13:40

---

## ⚡ AÇÃO IMEDIATA

### 1️⃣ Abrir Supabase (1 min)
```
https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust
```
- Fazer login
- Clicar em "SQL Editor" (menu lateral)

### 2️⃣ Executar Diagnóstico (2 min)
- Abrir arquivo: `DIAGNOSTICO_COMPLETO.sql`
- Copiar TODO o conteúdo (Ctrl+A, Ctrl+C)
- Colar no SQL Editor (Ctrl+V)
- Clicar em "Run" ou pressionar Ctrl+Enter
- **ANOTAR o `salon_id`** que aparece no final

### 3️⃣ Aplicar Correções (2 min)
- Abrir arquivo: `CORRECOES_CHATBOT.sql`
- Substituir `'SEU_SALON_ID'` pelo ID anotado (Ctrl+H)
- Copiar TODO o conteúdo
- Colar no SQL Editor
- Clicar em "Run"

---

## 🔑 OBTER API KEY (5 min)

**Escolha UMA opção:**

### Opção A: Groq (Recomendado)
1. Ir em: https://console.groq.com
2. Criar conta (email + senha)
3. Clicar em "API Keys"
4. Clicar em "Create API Key"
5. Copiar a chave (começa com `gsk_`)

### Opção B: Google Gemini
1. Ir em: https://makersuite.google.com/app/apikey
2. Fazer login com Google
3. Clicar em "Create API Key"
4. Copiar a chave

### Inserir a Chave no Banco
Voltar ao SQL Editor do Supabase e executar:

```sql
-- Para Groq:
INSERT INTO ai_provider_keys (provider, api_key, is_active)
VALUES ('groq', 'gsk_SUA_CHAVE_AQUI', true)
ON CONFLICT (provider) DO UPDATE
SET api_key = EXCLUDED.api_key, is_active = true;

UPDATE chatbot_settings
SET ai_provider = 'groq', ai_model = 'llama3-70b-8192'
WHERE enabled = true;
```

---

## 📱 RECONECTAR WHATSAPP (3 min)

1. Abrir: http://localhost:5173/admin/whatsapp
   - OU a URL de produção

2. Se aparecer "Desconectado":
   - Clicar em "Conectar WhatsApp"
   - Escanear QR Code
   - Aguardar status "Conectado"

3. Se já estiver "Conectado":
   - Pular para próximo passo ✓

---

## ✅ TESTAR (5 min)

### Teste 1: Chatbot
1. Abrir WhatsApp do salão
2. Enviar mensagem: "Olá"
3. ✅ Deve responder de forma amigável
4. ❌ Se responder "não entendi": Verificar API key

### Teste 2: Broadcast
1. Abrir: http://localhost:5173/admin/broadcast-messages
2. Clicar em "Carregar Contatos"
3. Selecionar seu número
4. Escrever: "Teste - ignore"
5. Clicar em "Enviar"
6. ✅ Deve receber no WhatsApp

---

## 🎉 PRONTO!

Se os 2 testes funcionaram, está tudo OK! 🚀

**Tempo total:** ~20 minutos

---

## 📚 DOCUMENTAÇÃO COMPLETA

Para mais detalhes, consulte:
- `LEIA_PRIMEIRO.md` - Instruções detalhadas
- `GUIA_CORRECAO.md` - Troubleshooting completo
- `RESUMO_CORRECOES.md` - Resumo do que foi feito

---

## 🆘 PROBLEMAS?

### Chatbot não responde
→ Verificar se executou a inserção da API key

### Broadcast não envia
→ Verificar se WhatsApp está conectado

### Erro "salon_id not found"
→ Executar novamente o diagnóstico e copiar o ID correto

---

**Deploy automático:** GitHub Actions fará o deploy após o push ✓
**Status:** Commit realizado com sucesso (35a157e)
