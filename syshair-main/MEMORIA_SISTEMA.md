# SysHair - Conhecimento e Memória da IA
## Sistema de Gestão para Salões de Beleza e Barbearias

---

## 🧠 Memória do Sistema

### Informação essencial que a IA deve lembrar

**Nome do Sistema:** SysHair  
**Desenvolvedor:** Código Base  
**Responsável:** Jefferson (jefferson22gs@gmail.com)  
**Contato Suporte:** +55 11 98626-2240  
**Instagram:** @codigo.base  

---

## 📦 Localização

**Diretório Local:** `D:\Projetos\syshair-main`  
**Repositório GitHub:** `https://github.com/jefferson22gs/syshair.git`  
**Deploy:** Vercel (https://syshair.vercel.app ou similar)

---

## 🏗️ Arquitetura

### Stack Tecnológico
- **Frontend:** React 18.3.1 + TypeScript 5.8.3 + Vite 5.4.19
- **Estilização:** TailwindCSS 3.4.17 + ShadCN UI + Radix UI
- **Animações:** Framer Motion 12.23.26
- **Backend:** Supabase (PostgreSQL 14+)
- **Pagamentos:** Mercado Pago
- **WhatsApp:** API Evolution
- **Notificações Push:** Firebase (FCM)
- **PWA:** Vite PWA Plugin 1.2.0

### Scripts Principais
```bash
cd D:\Projetos\syshair-main

npm run dev          # Servidor local (http://localhost:8080)
npm run build        # Build para produção
npm run build:dev    # Build para development
npm run lint         # ESLint
npm run preview      # Preview da build
```

---

## 🗄️ Banco de Dados (Supabase)

### Instância
**URL:** https://jfjbpjnnfnuiezchhust.supabase.co  
**Schema:** public  
**Types:** `src/integrations/supabase/types.ts` (auto-generated)

### Tabelas Principais

| Tabela | Descriçao | Chave Primária |
|--------|-----------|----------------|
| `salons` | Salões de beleza | id (UUID) |
| `professionals` | Profissionais | id (UUID) |
| `services` | Serviços | id (UUID) |
| `appointments` | Agendamentos | id (UUID) |
| `clients` | Clientes (CRM) | id (UUID) |
| `subscriptions` | Assinaturas | id (UUID) |
| `subscription_payments` | Pagamentos de assinatura | id (UUID) |
| `coupons` | Cupons de desconto | id (UUID) |
| `service_packages` | Pacotes de serviços | id (UUID) |
| `client_credits` | Créditos de pacotes | id (UUID) |
| `notifications` | Notificações | id (UUID) |
| `push_subscriptions` | Subscrições push | id (UUID) |
| `reviews` | Avaliações | id (UUID) |
| `client_metrics` | Métricas de cliente (IA) | id (UUID) |
| `salon_insights` | Insights do salão (IA) | id (UUID) |
| `products` | Produtos | id (UUID) |
| `product_sales` | Vendas de produtos | id (UUID) |
| `client_gallery` | Galeria (Before/After) | id (UUID) |
| `salon_groups` | Grupos de salão (multi-unidades) | id (UUID) |
| `salon_plans` | Planos de salão | id (UUID) |
| `profiles` | Perfil de usuário (Supabase Auth) | id (UUID) |
| `user_roles` | Papéis de usuário | id (UUID) |
| `professional_services` | Serviços por profissional | id (UUID) |

### Enums

```typescript
appointment_status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show"
coupon_type: "percentage" | "fixed"
user_role: "admin" | "professional" | "client"
```

### Database Functions

| Function | Descrição | Parâmetros |
|----------|-----------|-----------|
| `has_role()` | Verifica role de usuário | _role, _user_id |
| `get_user_salon_id()` | Obtém ID do salão do usuário | _user_id |
| `is_subscription_active()` | Verifica se assinatura ativa | p_salon_id |
| `get_subscription_status()` | Obtém status da assinatura | p_salon_id |
| `get_salon_analytics()` | Analytics do salão | p_salon_id, p_period? |
| `calculate_client_metrics()` | Calcula métricas do cliente | p_client_id |
| `generate_salon_insights()` | Gera insights do salão | p_salon_id |
| `check_birthday_notifications()` | Verifica aniversários | - |

---

## 🔑 Environment Variables

### Arquivo `.env` (NÃO commitar)

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://jfjbpjnnfnuiezchhust.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=YpRIa+/6y8hrxSfPWHw9gY3WueDEpOTFk...

# Database Connection
DATABASE_URL=postgres://postgres.jfjbpjnnfnuiezchhust:...

# Mercado Pago (Production)
VITE_MERCADOPAGO_PUBLIC_KEY=APP_USR-e14a9254-52d5-4bf9-8ea6...
MERCADOPAGO_ACCESS_TOKEN=APP_USR-2942812428056652...
MERCADOPAGO_CLIENT_ID=2942812428056652
MERCADOPAGO_CLIENT_SECRET=RXInmB0AQmVIVYE4RfYbnM3uK...

# Developer Info
DEVELOPER_WHATSAPP=5511986262240
DEVELOPER_INSTAGRAM=codigo.base
```

---

## 🛣️ Estrutura de Rotas

### Rotas Públicas
- `/` - Landing Page
- `/login` - Login
- `/register` - Registro
- `/booking` ou `/booking/:salonId` - Fluxo de agendamento
- `/s/:slug` - Página pública do salão
- `/s/:salonSlug/:professionalSlug` - Página pública do profissional
- `/agendar` ou `/agendar/:salonSlug` - Agendamento público avançado
- `/checkout` - Checkout de assinatura
- `/install` - Instalação PWA
- `/waitlist/:salonId` - Fila de espera pública
- `/avaliar/:appointmentId` - Página de avaliação

### Rotas Protegidas (Admin)
- `/admin` - Dashboard administrativo
- `/admin/settings` - Configurações do salão
- `/admin/professionals` - Gestão de profissionais
- `/admin/services` - Gestão de serviços
- `/admin/coupons` - Gestão de cupons
- `/admin/appointments` - Gestão de agendamentos
- `/admin/clients` - Gestão de clientes (CRM)
- `/admin/financial` - Financeiro
- `/admin/analytics` - Analytics e relatórios
- `/admin/packages` - Pacotes de serviços
- `/admin/products` - Produtos
- `/admin/reviews` - Avaliações
- `/admin/multi-units` - Multi-unidades
- `/admin/gallery` - Galeria
- `/admin/advanced` - Recursos avançados (BI, Fidelidade, Fila, etc.)
- `/admin/subscription` - Gestão de assinatura
- `/admin/marketing` - Marketing
- `/admin/chatbot` - Chatbot IA
- `/admin/status-scheduler` - Status scheduler
- `/admin/whatsapp` - Conexão WhatsApp
- `/admin/broadcast` - Mensagens em massa
- `/admin/import-contacts` - Importar contatos

### Rotas Protegidas (Profissional)
- `/professional` - Dashboard do profissional

### Rotas Protegidas (Cliente)
- `/profile` - Perfil do cliente

### Rotas Super Admin
- `/super-admin` - Dashboard Super Admin

---

## 🎨 Padrões de UI/UX

### Temas Disponíveis
1. **Gold** (Padrão) - Dourado elegante
2. **Rose** - Rosa suave
3. **Emerald** - Verde esmeralda
4. **Purple** - Roxo sofisticado
5. **Blue** - Azul profissional
6. **Coral** - Coral vibrante

### ShadCN UI Components
- Button, Input, Select, Dialog, Alert
- Table, ScrollArea, Cards
- Forms com React Hook Form + Zod
- Toast/Sonner para notificações
- Loading/Spinner para loading states

---

## 🔐 Autenticação e Permissões

### Roles do Sistema
- **`admin`** - Dono/gestor do salão (acesso total)
- **`professional`** - Profissional (acesso a seus agendamentos)
- **`client`** - Cliente (acesso a perfil e histórico)

### Flow de Autenticação
```
1. Usuário faz login/register
   ↓
2. Supabase Auth cria session (jwt token)
   ↓
3. Hooks useAuth verificam auth state
   ↓
4. ProtectedRoute verifica role
   ↓
5. Acesso concedido ou redirecionado
```

### Multi-tenancy
- Cada `salon_id` = salão diferente
- TODAS queries filtram por salon_id
- RLPs garantem isolamento de dados por salão

---

## 💳 Integração Mercado Pago

### Pagamentos One-Time
```typescript
// Criar preferência de pagamento
services/mercadoPago.ts
{
  items: [{ title, quantity, currency_id, unit_price }]
  back_urls: { success, pending, failure }
  auto_return: 'approved'
}
```

### Assinaturas Recorrentes (Preapproval)
```typescript
// Criar assinatura recorrente
{
  reason: 'SysHair Premium'
  auto_recurring: {
    frequency: 1
    frequency_type: 'months'
    transaction_amount: 39.90
    start_date: new Date().toISOString()
  }
}
```

### Webhooks
- `/api/webhook/mercado-pago` - Recebe eventos de pagamento
- Atualiza status: `pending` → `approved` → `active`

---

## 📱 Integração WhatsApp (API Evolution)

### Configuração
```typescript
{
  apiUrl: 'https://api.evolution.com'
  apiKey: process.env.EVOLUTION_API_KEY
  instanceId: process.env.EVOLUTION_INSTANCE_ID
}
```

### Mensagens Enviadas Automaticamente
1. ✅ Confirmação de agendamento
2. ⏰ Lembrete 1h antes
3. ❌ Cancelamento/modificação
4. 🎉 Promoções/Broadcast

---

## 🎯 Funcionalidades Principais

### 1. Agendamento Online
- Fluxo de 4 passos: Serviço → Profissional → Data/Horário → Confirmação
- Opção de pagamento antecipado (5% desconto)
- Confirmação via WhatsApp
- Lembrete automatico

### 2. Dashboard Administrativo
- Métricas: agendamentos hoje, faturamento mensal, clientes ativos, ocupação
- Agenda do dia com status
- Ações rápidas: confirmar, cancelar, reagendar

### 3. CRM (Gestão de Clientes)
- Cadastro de clientes com histórico
- Sistema de fidelidade com pontos e níveis
- Badges colecionáveis
- Indicações (programa de referral)

### 4. Controle Financeiro
- Receita hoje/mês
- Receita por profissional
- Receita por serviço
- Gráficos e relatórios
- Comissões de autônomos

### 5. BI & IA
- Previsão de faturamento (6 meses)
- Risco de churn dos clientes
- Cross-sell inteligente
- Insights preditivos do salão

### 6. Marketing
- Cupons de desconto
- Pacotes de serviços
- Broadcast em massa
- Import de contatos

### 7. Sistema de Assinatura
- 7 dias de trial GRATIS
- R$ 39,90/mês (plano único)
- Status: Trial → Active → Pending → Expired/Cancelled
- Paywall automático após expirar trial

### 8. Super Admin
- Métricas globais (todos os salões)
- Filtros por status
- Ações: bloquear, ativar, editar, notificar, excluir
- Broadcast global

---

## 🐛 Problemas Comuns e Soluções

### Erro: "RLS policy violated"
- Solução: Verificar RLPs no Supabase Dashboard
- Verificar se user está authenticado e tem role correto
- Verificar se query filtra por salon_id

### Erro: "Connection refused"
- Solução: Verificar VITE_SUPABASE_URL
- Verificar se projeto Supabase está ativo
- Verificar se não há firewall bloqueando

### WhatsApp não envia
- Solução: Verificar API Evolution connection
- Verificar API KEY e Instance ID
- Verificar formato do telefone (55DDDNUMERO)

### Trial expirou mas sistema acessível
- Solução: Verificar is_subscription_active() function
- Verificar se webhook do Mercado Pago está funcionando
- Forçar update manual via super admin

### Build error no Vercel
- Solução: Verificar environment variables
- Limpar cache: vercel build --force
- Verificar build logs completos

---

## 📚 Documentação Completa

| Arquivo | Conteúdo |
|--------|----------|
| `DOCUMENTACAO_COMPLETA.md` | Documentação técnica detalhada |
| `GUIA_USO.md` | Guia passo a passo de uso |
| `DEMO_GUIDE.md` | Guia de demonstração |
| `README.md` | README básico do projeto |
| `SKILL_SYSHAIR_SYSTEM.md` | Skill da IA para o sistema |
| `SKILL_SUPABASE_SYSHAIR.md` | Skill da IA para Supabase |

---

## 🚀 Comandos de Desenvolvimento

### Setup Inicial
```bash
cd D:\Projetos\syshair-main
npm install
```

### Desenvolvimento
```bash
npm run dev
# Abre em http://localhost:8080
```

### Build e Deploy
```bash
# Build para produção
npm run build

# Preview da build
npm run preview

# Deploy na Vercel
vercel --prod

# Deploy com branches
vercel --prod --branch=new-feature
```

### Lint
```bash
npm run lint
```

### Troubleshooting
```bash
# Limpar node_modules e reinstalar
rm -rf node_modules package-lock.json
npm install

# Verificar vulnerabilidades
npm audit

# Atualizar dependências
npm update

# Verificar tamanho do bundle
npm run build && npx vite-bundle-visualizer dist/assets
```

---

## 🎯 Checklist para Mudanças

Antes de fazer mudanças:

- [ ] Ler DOCUMENTACAO_COMPLETA.md
- [ ] Verificar se funcionalidade já existe (grep/rg)
- [ ] Seguir padrões de código do projeto
- [ ] Usar TypeScript strict (nenhum 'any')
- [ ] Usar ShadCN UI components se possível
- [ ] Usar React Query para data fetching
- [ ] Filtrar queries por salon_id (security)
- [ ] Tratar erros em todas operations
- [ ] Testar localmente com npm run dev
- [ ] Verificar se não quebra nada existente
- [ ] NÃO expor secrets em código

Durante desenvolvimento:

- [ ] Criar branch separada para features
- [ ] Commits frequentes com mensagens claras
- [ ] Testar responsive design
- [ ] Verificar performance (bundle size)
- [ ] Testar cross-browser

Antes de deploy:

- [ ] Executar npm run lint (sem erros)
- [ ] Executar npm run build (sucesso)
- [ ] Testar npm run preview
- [ ] Verificar environment variables na Vercel
- [ ] Criar backup antes de merge? (não é necessário, Supabase tem auto-backup)

---

## 📞 Contato e Suporte

**Desenvolvedor:** Código Base  
**WhatsApp:** +55 11 98626-2240  
**Email:** jefferson22gs@gmail.com  
**Instagram:** @codigo.base  
**Horário de Suporte:** SEG-SEX 09:00-18:00, SÁB 09:00-14:00

---

## 📝 Notas Importantes

- Sistema é multitenancy (cada salon_id = salão diferente)
- TODAS queries DEVEM filtrar por salon_id
- NÃO criar backend próprio, usar Supabase
- NÃO trocar de provedor de pagamento (Mercado Pago)
- NÃO trocar de provedor de WhatsApp (API Evolution)
- PWA pode ser instalado como app nativo
- Trial de 7 dias é automático após registro
- Paywall aparece automaticamente após expirar trial
- Super admin tem acesso TOTAL a todos os salões

---

**Última atualização:** Janeiro 2026  
**Versão:** 1.0.0

© 2026 SysHair - Todos os direitos reservados
Desenvolvido por Código Base
