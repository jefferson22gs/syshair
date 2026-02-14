# SysHair - Guia para Desenvolvedores
## Como Trabalhar no Projeto Syshair com Claude AI

---

## 📋 Índice

1. [Sobre este Guia](#sobre-este-guia)
2. [Skills Disponíveis](#skills-disponíveis)
3. [Como Usar os Skills](#como-usar-os-skills)
4. [Fluxo de Trabalho Típico](#fluxo-de-trabalho-típico)
5. [Comandos Essenciais](#comandos-essenciais)
6. [Documentação Disponível](#documentação-disponível)
7. [Troubleshooting](#troubleshooting)
8. [Contato](#contato)

---

## Sobre este Guia

Este guia explica como desenvolvedores podem trabalhar eficientemente no projeto SysHair usando Claude AI com os skills especializados criados.

**Objetivo:** Criar um sistema de conhecimento que permite à IA entender imediatamente o contexto do projeto SysHair e resolver problemas rapidamente, sem precisar reexplicar toda a estrutura do sistema.

---

## Skills Disponíveis

### 1. **syshair-system** (Principal)
**Arquivo:** `.claude/skills/syshair-system/SKILL.md`

**O que faz:**
- Conhece toda arquitetura do sistema
- Sabe onde está cada arquivo e componente
- Conhece padrões de código, naming conventions
- Sabe como criar novas funcionalidades seguindo padrões
- Sabe como debugar problemas comuns

**Quando usar:**
- Sempre que precisar fazer qualquer mudança no sistema
- Criar novas features
- Debugar problemas
- Refatorar código
- Adicionar novas integrações

**Chaves de ativação:**
```
"ajuda com o sistema syshair"
"criar nova funcionalidade de agendamento"
"debugar erro no dashboard"
"adicionar integração novo pagamento"
```

### 2. **supabase-syshair** (Database)
**Arquivo:** `.claude/skills/supabase-syshair/SKILL.md`

**O que faz:**
- Conhece toda estrutura do banco de dados
- Sabe todas as tabelas e relacionamentos
- Conhece database functions
- Sabe como fazer queries complexas
- Conhece RLPs (Row Level Policies)
- Sabe como usar Supabase client corretamente

**Quando usar:**
- Criar/modificar queries ao banco
- Debugar erros de banco de dados
- Criar novas tables/modificar schema
- Configurar RLPs
- Otimizar performance de queries
- Criar database functions

**Chaves de ativação:**
```
"como fazer query de agendamentos"
"criar nova tabela no banco"
"debugar erro de conexão supabase"
"como usar joins no syshair"
```

---

## Como Usar os Skills

### Método 1: Ativação Manual (Mais Comum)

1. **Mencione explicitamente o que precisa:**
   ```
   "Preciso criar uma nova funcionalidade de agendamento no SysHair"
   ```

2. **A IA automaticamente:**
   - Detecta que está falando do SysHair
   - Carrega o skill `syshair-system`
   - Lê a documentação relevante
   - Resolva o problema seguindo padrões estabelecidos

### Método 2: Solicitação Específica

1. **Solicite skill específico:**
   ```
   "Usar skill syshair-system para adicionar validação de formulário"
   ```

2. **A IA:**
   - Carrega skill especificado
   - Explicar procedimentos passo a passo
   - Implementar solução seguindo padrões

### Método 3: Contexto Automático

1. **Basta mencionar o local do projeto:**
   ```
   "Estou trabalhando em D:\Projetos\syshair-main, preciso..."
   ```

2. **A IA:**
   - Detecta caminho do projeto SysHair
   - Carrega skills automaticamente
   - Fornece contexto completo

---

## Fluxo de Trabalho Típico

### Cenário 1: Criar Nova Funcionalidade

```
Você: "Preciso criar funcionalidade de exportar relatório financeiro em Excel"

IA (usando syshair-system):
1. Lê DOCUMENTACAO_COMPLETA.md → seção Financeiro
2. Verifica se já existe funcionalidade similar (grep)
3. Segue padrões:
   - Criar novo hook: hooks/useFinancialExport.tsx
   - Criar novo service: services/financialExportService.ts
   - Usar library xlsx para Excel
   - Adicionar botão em pages/admin/Financial.tsx
   - Usar React Query para fetch
   - Adicionar toast de sucesso/erro
4. Implementa código seguindo convenções
5. Testa e valida
```

### Cenário 2: Debugar Bug

```
Você: "O dashboard não está mostrando agendamentos de hoje"

IA (usando syshair-system + supabase-syshair):
1. Lê código do Dashboard (pages/admin/AdminDashboard.tsx)
2. Verifica query Supabase
3. Possíveis causas:
   - Query não filtra por data CORRETA
   - salon_id não está sendo passado
   - RLP bloqueia acesso
   - Error handling está escondendo erro
4. Debuga:
   - Adiciona console.log no query
   - Verifica se data está em formato correto (YYYY-MM-DD)
   - Verifica se user tem role 'admin'
5. Propõe solução
   - Ajusta query para filtrar por data
   - Adiciona error handling adequado
   - Teste e valida
```

### Cenário 3: Modificar Database

```
Você: "Preciso adicionar campo 'nota_interna' em appointments"

IA (usando supabase-syshair):
1. Verifica schema atual em types.ts
2. Sabe que NÃO usa migrations (mudanças manuais)
3. Instruções:
   - Ir ao Supabase Dashboard → SQL Editor
   - Executar: ALTER TABLE appointments ADD COLUMN nota_interna TEXT;
   - Ler novo schema com SELECT * FROM appointments LIMIT 1
   - Atualizar types.ts manualmente (ou re-generar com CLI)
4. Atualiza app:
   - Adicionar campo em forms
   - Adicionar em queries SELECT/INSERT/UPDATE
   - Teste e valida
```

---

## Comandos Essenciais

### Navegação no Projeto

```bash
# Ir ao diretório do projeto
cd D:\Projetos\syshair-main

# Verificar estrutura de arquivos
ls -la
ls -la src/
ls -la src/pages/
ls -la src/integrations/supabase/

# Buscar algo específico (usar ripgrep)
rg -i "agendamento" src/
rg -i "dashboard" src/
rg -i "mercado pago" src/

# Verificar tipos do banco
cat src/integrations/supabase/types.ts | head -50
```

### Desenvolvimento

```bash
# Iniciar servidor local
npm run dev

# Build para produção
npm run build

# Lint
npm run lint

# Preview da build
npm run preview
```

### Git

```bash
# Verificar status
cd D:\Projetos\syshair-main
git status

# Verificar branch atual
git branch

# Criar nova branch para feature
git checkout -b feature/nova-funcionalidade

# Adicionar mudanças
git add .
git commit -m "feat: adicionar nova funcionalidade de X"

# Push para remoto
git push origin feature/nova-funcionalidade

# Merge para main (after review)
git checkout main
git merge feature/nova-funcionalidade
git push origin main
```

### Troubleshooting

```bash
# Limpar cache e reinstalar
cd D:\Projetos\syshair-main
rm -rf node_modules package-lock.json
npm install

# Verificar vulnerabilidades
npm audit

# Verificar dependências outdated
npm outdated

# Atualizar dependências
npm update

# Verificar tamanho do bundle
npm run build
npx vite-bundle-visualizer dist/assets
```

---

## Documentação Disponível

| Arquivo | Quando Ler | Conteúdo |
|--------|-----------|----------|
| `DOCUMENTACAO_COMPLETA.md` | **SEMPRE** antes de mudar | Arquitetura, stack, DB schema, padrões |
| `GUIA_USO.md` | Quando precisa entender fluxo de usuário | Guia passo a passo de todas features |
| `DEMO_GUIDE.md` | Quando precisa entender features visuais | Screenshots e walkthrough |
| `README.md` | Quando precisa de overview básico | Setup, deploy, features principais |
| `MEMORIA_SISTEMA.md` | **SEMPRE** para contexto rápido | Resumo essencial de todo o sistema |
| `SKILL_SYSHAIR_SYSTEM.md` | **NA IA** | Skill principal da IA |
| `SKILL_SUPABASE_SYSHAIR.md` | **NA IA** | Skill de banco de dados |
| `IMPLEMENTATION_PLAN_SUPER_ADMIN.md` | Quando trabalhar com super admin | Plano de implementação |

### Como Acessar a Documentação na IA

**Basta pedir:**
```
"Ler DOCUMENTACAO_COMPLETA.md"
"Ler a seção de Financeiro na DOCUMENTACAO_COMPLETA.md"
"Verificar os enums appointment_status no types.ts"
```

---

## Troubleshooting

### IA Não Sabe o que Isso É

**Solução:** Forneça contexto explícito

**Exemplo INCORRETO:**
```
"O que significa appointment?"
```

**Exemplo CORRETO:**
```
"No sistema SysHair em D:\Projetos\syshair-main, estou vendo erro 'appointment' não definido"
```

### IA Não Segue Padrões do Sistema

**Solução:** Solicite explicitamente

**Exemplo:**
```
"Quando criar nova feature, seguir CONVENÇÕES DE CÓDIGO do SysHair (documentado em syshair-system skill)"
```

### IA Muda Muitas Coisas de Uma Vez

**Solução:** Peça para fazer uma mudança por vez

**Exemplo:**
```
"Primeiro: criar o componente X seguindo padrões
Depois: integrar com Y
Depois: testar
Não fazer tudo de uma vez"
```

### IA Propõe Solução Muito Complexa

**Solução:** Peça solução simples seguindo padrões

**Exemplo:**
```
"Quero uma solução SIMPLES que siga padrões existentes do código. Não preciso de arquitetura complexa"
```

---

## Exemplos de Uso dos Skills

### Exemplo 1: Adicionar Validação em Formulário

**Você:**
```
"Usar skill syshair-system para adicionar validação de telefone no formulário de cliente"
```

**IA (com skill):**
1. Lê o código do formulário de cliente (provavelmente em pages/admin/Clients.tsx)
2. Verifica schema Zod existente
3. Adiciona validação de telefone com regex:
   ```typescript
   const formSchema = z.object({
     name: z.string().min(1, "Nome é obrigatório"),
     phone: z.string()
       .min(11, "Telefone inválido")
       .regex(/^\(?\d{2}\)?\d{9}$/, "Formato: (DDD)9XXXX-XXXX"),
     // ...
   });
   ```
4. Segue padrões de code do projeto
5. Explica o que mudou

### Exemplo 2: Debugar Query Lenta

**Você:**
```
"No SysHair, a query de agendamentos está muito lenta (3s). Usar skill supabase-syshair para debugar"
```

**IA (com skill):**
1. Pede para ver a query SQL gerada
2. Sugere:
   - Verificar se faltam indexes na tabela
   - Usar EXPLAIN ANALYZE no Supabase
   - Otimizar query usando relationships
   - Usar cache com React Query
3. Propõe índice:
   ```sql
   CREATE INDEX idx_appointments_salon_date 
   ON appointments(salon_id, date desc, start_time);
   ```
4. Explica como testar

### Exemplo 3: Criar Nova Feature de Notificação

**Você:**
```
"Preciso criar funcionalidade de enviar notificação push quando agendamento é criado"
```

**IA (com skill syshair-system):
1. Verifica se já existe funcionalidade (sim, mas só webhook)
2. Segue padrões:
   - Modificar pages/admin/Appointments.tsx ou service
   - Usar hooks/usePushNotifications.tsx
   - Chamar sendPushNotification após criar appointment
   - Adicionar try-catch com error handling
   - Adicionar toast de sucesso/erro
3. Implementa seguindo essas convenções
4. Testa e valida

---

## 🎯 Dicas Maximizando Uso dos Skills

### 1. Seja Específico

**Ruim:**
```
"Ajuda a resolver algo no sistema"
```

**Bom:**
```
"No SysHair, o botão de 'Criar Agendamento' não está funcionando na página /admin/appointments"
```

### 2. Dê Contexto do Erro

**Ruim:**
```
"Está dando um erro"
```

**Bom:**
```
"Está dando erro '424 Failed Dependency' quando tento criar pagamento via Mercado Pago no SysHair"
```

### 3. Descreva o Que Quer

**Ruim:**
```
"Melhora o sistema"
```

**Bom:**
```
"Quero adicionar filtro de data na página de agendamentos do SysHair para ver apenas agendamentos de esta semana"
```

### 4. Passe o Caminho Completo Quando Necessário

**Quando não estiver no diretório do projeto:**
```
"Em D:\Projetos\syshair-main, preciso..."
```

### 5. Peça para Seguir Padrões

**IMPORTANTE:**
```
"Seguir todas as CONVENÇÕES DE CÓDIGO e PADRÕES do SysHair (documentado syshair-system skill)"
```

---

## 📚 Estrutura de Conhecimento Sistêmico

A IA tem acesso a um **sistema de conhecimento** sobre o SysHair:

1. **Skills** (Ativação)
   - `syshair-system` - Conhecimento principal
   - `supabase-syshair` - Conhecimento de banco de dados

2. **Documentação** (Leitura)
   - `DOCUMENTACAO_COMPLETA.md` - Guia técnico
   - `GUIA_USO.md` - Guia de usuário
   - `MEMORIA_SISTEMA.md` - Resumo essencial

3. **Código Fonte** (Exploração)
   - Estrutura de arquivos
   - Componentes existentes
   - Padrões de implementação

**Resultado:** A IA pode entender e resolver a maioria dos problemas rapidamente, **re-criando** conhecimento em vez de você ter que re-explicar tudo.

---

## 🆘 Quando Pedir Ajuda Humana

A IA pode resolver a maioria dos problemas, mas em alguns casos é melhor falar com o desenvolvedor (Código Base):

### Quando Pedir:
- **A IA não consegue resolver após 3 tentativas**
- **Precisa de uma decisão arquitetônica importante**
- **Problema em integrações externas (Mercado Pago, WhatsApp) que não consegue debugar**
- **Precisa de aprovação para mudanças críticas (ex: mudar de provedor de pagamento)**

### Como Pedir:
```
"Preciso falar com Código Base (WhatsApp: +55 11 98626-2240) porque..."

Ou envie email para jefferson22gs@gmail.com
```

---

## 📞 Contato

**Desenvolvedor:** Código Base  
**WhatsApp:** +55 11 98626-2240  
**Email:** jefferson22gs@gmail.com  
**Instagram:** @codigo.base  
**Horário de Suporte Des.:** SEG-SEX 09:00-18:00, SÁB 09:00-14:00

---

## 🎓 Aprendizado Rápido

### Para Novos Desenvolvedores no Projeto

1. **PRIMEIRO:** Ler `DOCUMENTACAO_COMPLETA.md` (primeiros 100 linhas)
2. **DEPOIS:** Ler `MEMORIA_SISTEMA.md` (resumo essencial)
3. **ENTÃO:** Explorar código para entender padrões
4. **FINALMENTE:** Começar trabalhos menores, solicitando ajuda da IA

### Para Desenvolvedores Experientes

1. Ler `MEMORIA_SISTEMA.md` (overview rápido)
2. Ler `DOCUMENTACAO_COMPLETA.md` apenas quando necessário
3. Usar skills da IA para acelerar desenvolvimento
4. Focar em padrões e convenções explicadas nos skills

---

## 🚀 Começando Agora

### Exemplo de Primeira Tarefa

**Você:**
```
"Estou começando a trabalhar no SysHair em D:\Projetos\syshair-main. Quero adicionar um filtro para ver apenas agendamentos pendentes na página de agendamentos"
```

**IA (com skill syshair-system):**
1. Localiza a página: `src/pages/admin/Appointments.tsx`
2. Verifica código atual de filtros
3. Sugere adicionar componente de Filter
4. Implementa filtro seguindo padrões ShadCN UI
5. Modifica query Supabase para adicionar `.eq('status', 'pending')`
6. Testa e valida

**Resultado:** Você aprende padrões do sistema enquanto IA implementa a feature corretamente.

---

**Última atualização:** Janeiro 2026  
**Versão:** 1.0.0

© 2026 SysHair - Todos os direitos reservados
Desenvolvido por Código Base
