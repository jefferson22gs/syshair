# ✅ CHECKLIST INTERATIVO - Correção de Notificações

**Data:** 23/02/2026 às 13:11
**Marque [x] conforme for completando**

---

## 📋 PRÉ-REQUISITOS

- [ ] Tenho acesso ao Supabase Dashboard
- [ ] Tenho permissão de admin no projeto
- [ ] O servidor local está rodando (localhost:5173)
- [ ] Estou logado no sistema como admin

---

## 🗄️ PASSO 1: EXECUTAR SQL (2 min)

### 1.1 Acessar Supabase
- [ ] Abri https://supabase.com/dashboard
- [ ] Fiz login
- [ ] Selecionei o projeto SysHair

### 1.2 Abrir SQL Editor
- [ ] Cliquei em "SQL Editor" no menu lateral
- [ ] Cliquei em "+ New query"

### 1.3 Executar Script
- [ ] Abri o arquivo `FIX_NOTIFICATIONS_COMPLETE.sql`
- [ ] Copiei TODO o conteúdo (Ctrl+A, Ctrl+C)
- [ ] Colei no SQL Editor (Ctrl+V)
- [ ] Cliquei em "Run" (ou Ctrl+Enter)

### 1.4 Verificar Resultado
- [ ] Vi mensagens de "NOTICE" no console
- [ ] Vi a tabela de verificação final
- [ ] Todos os itens estão com ✅ SIM
- [ ] Vi "=== ÚLTIMAS NOTIFICAÇÕES ===" com 1 notificação de teste

**✅ PASSO 1 COMPLETO!**

---

## 🔌 PASSO 2: HABILITAR REALTIME (1 min)

### 2.1 Acessar Replication
- [ ] Cliquei em "Database" no menu lateral
- [ ] Cliquei na aba "Replication"

### 2.2 Encontrar a Tabela
- [ ] Vi a lista de tabelas
- [ ] Encontrei "admin_notifications" na lista
- [ ] (Se não aparecer, aguardei 1 min e recarreguei a página)

### 2.3 Habilitar Realtime
- [ ] Cliquei no toggle/switch ao lado de "admin_notifications"
- [ ] O toggle ficou verde/azul (Enabled)
- [ ] Aguardei 10 segundos

### 2.4 Confirmar
- [ ] Vi "admin_notifications [✓ Enabled]"

**✅ PASSO 2 COMPLETO!**

---

## 🧪 PASSO 3: TESTAR NO FRONTEND (2 min)

### 3.1 Abrir o Admin
- [ ] Abri o navegador
- [ ] Pressionei F12 (DevTools)
- [ ] Fui para a aba "Console"
- [ ] Acessei http://localhost:5173/admin

### 3.2 Verificar Logs
- [ ] Vi no console: "🔔 Iniciando notificações em tempo real"
- [ ] Vi no console: "🔔 Status do canal de notificações: SUBSCRIBED"
- [ ] Vi no console: "🔔 Canal de notificações conectado com sucesso"
- [ ] NÃO vi: "CHANNEL_ERROR" ou "CLOSED"

### 3.3 Verificar o Sino
- [ ] Vi o ícone de sino 🔔 no canto superior direito
- [ ] Vi um badge vermelho com número (ex: "1")
- [ ] Cliquei no sino

### 3.4 Ver Notificação de Teste
- [ ] Abriu um dropdown com notificações
- [ ] Vi a notificação: "🧪 Teste de Notificação - Sistema Funcionando!"
- [ ] Vi os detalhes: Cliente Teste, data, horário
- [ ] Vi "há poucos segundos" ou tempo relativo

**✅ PASSO 3 COMPLETO!**

---

## 🎉 TESTE FINAL: AGENDAMENTO REAL (3 min)

### 4.1 Abrir Página de Agendamento
- [ ] Abri nova aba anônima (Ctrl+Shift+N)
- [ ] Acessei http://localhost:5173/agendar

### 4.2 Fazer Agendamento
- [ ] Selecionei um serviço
- [ ] Selecionei um profissional
- [ ] Escolhi uma data (hoje ou amanhã)
- [ ] Escolhi um horário disponível
- [ ] Preenchi nome: "Teste Real"
- [ ] Preenchi telefone: "11987654321" (meu número)
- [ ] Cliquei em "Confirmar Agendamento"
- [ ] Vi mensagem de sucesso
- [ ] Fui redirecionado para página de confirmação

### 4.3 Verificar Notificação no Admin
- [ ] Voltei para a aba do Admin
- [ ] O badge do sino aumentou (ex: "2")
- [ ] Cliquei no sino
- [ ] Vi nova notificação: "🎉 Novo Agendamento"
- [ ] Vi os detalhes do agendamento que acabei de criar

### 4.4 Verificar WhatsApp (Opcional)
- [ ] Abri o WhatsApp no número que usei
- [ ] Recebi mensagem do salão
- [ ] Mensagem tem detalhes do agendamento
- [ ] Mensagem tem link de gerenciamento

**✅ TESTE FINAL COMPLETO!**

---

## 🔧 TESTES ADICIONAIS (Opcional)

### Teste de Cancelamento
- [ ] Cancelei um agendamento
- [ ] Recebi notificação: "❌ Agendamento Cancelado"

### Teste de Reagendamento
- [ ] Reagendei um agendamento
- [ ] Recebi notificação: "🔄 Agendamento Reagendado"

### Teste de Marcar como Lida
- [ ] Cliquei em uma notificação
- [ ] Badge diminuiu o contador

### Teste de Limpar Todas
- [ ] Cliquei em "Limpar Tudo"
- [ ] Todas foram marcadas como lidas
- [ ] Badge zerou

---

## 🐛 TROUBLESHOOTING

### Se SQL deu erro:
- [ ] Copiei a mensagem de erro
- [ ] Verifiquei se é "already exists" (pode ignorar)
- [ ] Se for outro erro, avisei o Claude

### Se Realtime não aparece:
- [ ] Aguardei 2 minutos
- [ ] Recarreguei a página (F5)
- [ ] Verifiquei em Database → Tables se a tabela existe

### Se Console mostra "CHANNEL_ERROR":
- [ ] Limpei cache do navegador (Ctrl+Shift+Delete)
- [ ] Fechei TODAS as abas do localhost
- [ ] Fechei o navegador completamente
- [ ] Abri novamente e testei

### Se Sino não tem badge:
- [ ] Verifiquei se estou logado
- [ ] Verifiquei se sou owner do salão
- [ ] Executei SQL de verificação no Supabase

---

## 📊 RESULTADO FINAL

### Status do Sistema
- [ ] ✅ SQL executado com sucesso
- [ ] ✅ Realtime habilitado
- [ ] ✅ Console mostra "SUBSCRIBED"
- [ ] ✅ Sino com badge funcionando
- [ ] ✅ Notificações aparecem em tempo real
- [ ] ✅ Criar agendamento gera notificação
- [ ] ✅ WhatsApp sendo enviado

### Verificação Técnica
- [ ] ✅ Tabela admin_notifications existe
- [ ] ✅ RLS habilitado
- [ ] ✅ 4 políticas RLS criadas
- [ ] ✅ 3 triggers criados
- [ ] ✅ Realtime habilitado na tabela

---

## 🚀 COMMIT E DEPLOY

### Commit
- [ ] Abri terminal no projeto
- [ ] Executei: `git add .`
- [ ] Executei: `git commit -m "fix: corrigir sistema de notificações"`
- [ ] Executei: `git push origin main`

### Deploy (Se aplicável)
- [ ] GitHub Actions executou
- [ ] Deploy concluído com sucesso
- [ ] Testei em produção

---

## 📝 NOTAS

**Problemas encontrados:**
```
(Anote aqui qualquer problema que encontrou)
```

**Soluções aplicadas:**
```
(Anote aqui como resolveu)
```

**Tempo total gasto:**
```
___ minutos
```

---

## ✅ CONCLUSÃO

- [ ] Sistema de notificações 100% funcional
- [ ] Todos os testes passaram
- [ ] Commit realizado
- [ ] Documentação atualizada

**Status:** 🟢 FUNCIONANDO

**Data de conclusão:** ___/___/2026 às ___:___

---

## 📞 PRÓXIMOS PASSOS

Após marcar todos os checkboxes acima:

1. [ ] Avisar o Claude: "Tudo funcionando!"
2. [ ] Testar com usuários reais
3. [ ] Monitorar logs por 24h
4. [ ] Documentar no README (se necessário)

---

**Boa sorte! 🎉**

**Comece marcando os checkboxes conforme avança!**
