# 🎯 GUIA VISUAL - Correção de Notificações em 3 Passos

**Data:** 23/02/2026 às 13:10
**Tempo estimado:** 5 minutos

---

## 📋 PASSO 1: Executar SQL no Supabase (2 min)

### 1.1 Acessar Supabase
1. Abra: https://supabase.com/dashboard
2. Faça login
3. Selecione o projeto **SysHair**

### 1.2 Abrir SQL Editor
1. No menu lateral esquerdo, clique em **SQL Editor**
2. Clique em **"+ New query"**

### 1.3 Executar Script
1. Abra o arquivo: `FIX_NOTIFICATIONS_COMPLETE.sql`
2. Copie TODO o conteúdo (Ctrl+A, Ctrl+C)
3. Cole no SQL Editor do Supabase (Ctrl+V)
4. Clique em **"Run"** (ou pressione Ctrl+Enter)

### 1.4 Verificar Resultado
Você deve ver no final:

```
✅ 1. Tabela existe: SIM
✅ 2. RLS habilitado: SIM
✅ 3. Políticas criadas: SIM (4 políticas)
✅ 4. Triggers criados: SIM (3 triggers)
✅ 5. Notificações criadas: SIM (1 notificações)
```

**Se todos estiverem ✅, prossiga para o Passo 2!**

---

## 🔌 PASSO 2: Habilitar Realtime (1 min)

### 2.1 Acessar Replication
1. No menu lateral do Supabase, clique em **Database**
2. Clique na aba **Replication**

### 2.2 Encontrar a Tabela
1. Você verá uma lista de tabelas
2. Procure por: **`admin_notifications`**
3. Se não aparecer, role a página ou use Ctrl+F para buscar

### 2.3 Habilitar Realtime
1. Ao lado de `admin_notifications`, há um **toggle/switch**
2. Clique para **HABILITAR** (deve ficar verde/azul)
3. Aguarde 5-10 segundos

### 2.4 Confirmar
Você deve ver:
```
Source: 1
admin_notifications [✓ Enabled]
```

**✅ Realtime habilitado com sucesso!**

---

## 🧪 PASSO 3: Testar no Frontend (2 min)

### 3.1 Abrir o Admin
1. Abra o navegador
2. Pressione **F12** para abrir DevTools
3. Vá para a aba **Console**
4. Acesse: `http://localhost:5173/admin`

### 3.2 Verificar Logs
Procure no console por:

**✅ SUCESSO - Deve aparecer:**
```
🔔 Iniciando notificações em tempo real para salon: 31a1af0c-...
🔔 Status do canal de notificações: SUBSCRIBED
🔔 Canal de notificações conectado com sucesso
```

**❌ ERRO - NÃO deve aparecer:**
```
🔔 Status do canal de notificações: CLOSED
🔔 Status do canal de notificações: CHANNEL_ERROR
```

### 3.3 Verificar o Sino
1. No canto superior direito, procure o **ícone de sino** 🔔
2. Deve ter um **badge vermelho** com número (ex: "1")
3. Clique no sino

### 3.4 Ver Notificação de Teste
Deve aparecer um dropdown com:

```
┌─────────────────────────────────────────┐
│ 🧪 Teste de Notificação - Sistema      │
│    Funcionando!                         │
│                                         │
│ Esta é uma notificação de teste...     │
│                                         │
│ Cliente Teste • 11999999999             │
│ 23/02/2026 às 13:10                     │
│                                         │
│ há poucos segundos                      │
└─────────────────────────────────────────┘
```

**✅ Se aparecer, o sistema está FUNCIONANDO!**

---

## 🎉 TESTE FINAL: Criar Agendamento Real

### 4.1 Abrir Página de Agendamento
1. Abra uma **nova aba anônima** (Ctrl+Shift+N)
2. Acesse: `http://localhost:5173/agendar`

### 4.2 Fazer Agendamento
1. Selecione um **serviço**
2. Selecione um **profissional**
3. Escolha uma **data** (hoje ou amanhã)
4. Escolha um **horário** disponível
5. Preencha:
   - Nome: "Teste Real"
   - Telefone: "11987654321" (seu número real)
6. Clique em **"Confirmar Agendamento"**

### 4.3 Verificar Notificação
1. Volte para a aba do **Admin**
2. Olhe o sino 🔔
3. O badge deve ter aumentado (ex: "2")
4. Clique no sino

**Deve aparecer:**
```
┌─────────────────────────────────────────┐
│ 🎉 Novo Agendamento                     │
│                                         │
│ Teste Real agendou Corte Feminino para │
│ 23/02/2026 às 14:00                     │
│                                         │
│ Teste Real • 11987654321                │
│ 23/02/2026 às 14:00                     │
│                                         │
│ há poucos segundos                      │
└─────────────────────────────────────────┘
```

### 4.4 Verificar WhatsApp
1. Abra o WhatsApp no número que você usou
2. Deve ter recebido uma mensagem do salão com:
   - Confirmação do agendamento
   - Detalhes (serviço, data, horário)
   - Link para gerenciar o agendamento

**✅ TUDO FUNCIONANDO!**

---

## 🐛 TROUBLESHOOTING

### Problema 1: SQL deu erro

**Erro:** `relation "admin_notifications" already exists`
- **Solução:** Ignore, a tabela já existe. Continue para o Passo 2.

**Erro:** `permission denied`
- **Solução:** Você não tem permissão de admin no Supabase. Peça ao dono do projeto.

### Problema 2: Realtime não aparece

**Sintoma:** Não encontro a tabela `admin_notifications` em Replication
- **Solução 1:** Aguarde 1-2 minutos e recarregue a página
- **Solução 2:** Verifique se o SQL foi executado com sucesso
- **Solução 3:** Vá em Database → Tables e procure `admin_notifications`

### Problema 3: Console ainda mostra "CHANNEL_ERROR"

**Solução:**
1. Limpe o cache do navegador (Ctrl+Shift+Delete)
2. Feche TODAS as abas do localhost
3. Feche o navegador completamente
4. Abra novamente e acesse `http://localhost:5173/admin`
5. Aguarde 10-15 segundos

### Problema 4: Sino não tem badge

**Verificar:**
1. Abra o console (F12)
2. Execute:
```javascript
// Ver se há notificações
fetch('http://localhost:54321/rest/v1/admin_notifications?select=*', {
  headers: {
    'apikey': 'sua-anon-key-aqui',
    'Authorization': 'Bearer seu-token-aqui'
  }
}).then(r => r.json()).then(console.log)
```

**Se retornar array vazio `[]`:**
- Notificações não foram criadas
- Execute o SQL novamente

**Se retornar erro 401:**
- Problema de autenticação
- Faça logout e login novamente

### Problema 5: WhatsApp não envia

**Verificar:**
1. Instância WhatsApp está conectada?
   - Acesse: `/admin/whatsapp`
   - Status deve ser "Conectado"

2. Testar manualmente:
```bash
curl -X POST "https://api.tubaraoemprestimo.com.br/message/sendText/syshair_daniel_cabelos_1777c2a7" \
  -H "Content-Type: application/json" \
  -H "apikey: B8959800-F546-407C-99E8-C40306E747F5" \
  -d '{"number":"5511987654321","text":"Teste"}'
```

---

## 📊 CHECKLIST FINAL

Marque conforme for completando:

### Banco de Dados
- [ ] SQL executado com sucesso
- [ ] Tabela `admin_notifications` existe
- [ ] RLS habilitado
- [ ] 4 políticas criadas
- [ ] 3 triggers criados
- [ ] Notificação de teste criada

### Supabase Dashboard
- [ ] Realtime habilitado em `admin_notifications`
- [ ] Toggle está verde/azul (Enabled)

### Frontend
- [ ] Console mostra "SUBSCRIBED"
- [ ] Sino aparece no canto superior direito
- [ ] Badge com número aparece no sino
- [ ] Ao clicar, mostra notificação de teste
- [ ] Notificação tem título, mensagem, data/hora

### Teste Real
- [ ] Criar agendamento gera nova notificação
- [ ] Badge aumenta o contador
- [ ] Notificação aparece no dropdown
- [ ] WhatsApp é enviado para o cliente
- [ ] Link de gerenciamento funciona

---

## 🎯 RESULTADO ESPERADO

Após seguir todos os passos:

1. ✅ Console sem erros de "CHANNEL_ERROR"
2. ✅ Sino com badge de notificações não lidas
3. ✅ Dropdown mostra notificações em tempo real
4. ✅ Criar agendamento gera notificação instantânea
5. ✅ WhatsApp enviado automaticamente
6. ✅ Sistema 100% funcional

---

## 📞 PRÓXIMOS PASSOS

Após confirmar que está funcionando:

1. **Testar cancelamento:**
   - Cancele um agendamento
   - Deve gerar notificação "❌ Agendamento Cancelado"

2. **Testar reagendamento:**
   - Reagende um agendamento
   - Deve gerar notificação "🔄 Agendamento Reagendado"

3. **Testar marcar como lida:**
   - Clique em uma notificação
   - Badge deve diminuir

4. **Testar limpar todas:**
   - Clique em "Limpar Tudo"
   - Todas devem ser marcadas como lidas
   - Badge deve zerar

---

## 🚀 COMMIT

Após tudo funcionando, faça commit:

```bash
cd D:\Projetos\syshair-main

git add .

git commit -m "fix: corrigir sistema de notificações em tempo real

- Executar migration completa de admin_notifications
- Habilitar Realtime no Supabase
- Criar políticas RLS corretas
- Criar triggers para new/cancelled/rescheduled
- Adicionar notificação de teste
- Corrigir CHANNEL_ERROR no AdminNotificationCenter

Fixes: Notificações não apareciam no sino do admin

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

git push origin main
```

---

**COMECE AGORA PELO PASSO 1!**

Abra o Supabase e execute o SQL: `FIX_NOTIFICATIONS_COMPLETE.sql`

Me avise quando terminar cada passo! 🚀
