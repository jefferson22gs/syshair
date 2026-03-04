# SysHair - Documentação Técnica Completa
## Sistema de Gestão para Salões de Beleza e Barbearias

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Estrutura do Banco de Dados](#estrutura-do-banco-de-dados)
4. [Tecnologias Utilizadas](#tecnologias-utilizadas)
5. [Estrutura de Código](#estrutura-de-código)
6. [Funcionalidades por Módulo](#funcionalidades-por-módulo)
7. [Integrações Externas](#integrações-externas)
8. [Autenticação e Permissões](#autenticação-e-permissões)
9. [Sistemas de Notificações](#sistemas-de-notificações)
10. [Gerenciamento de Assinaturas](#gerenciamento-de-assinaturas)
11. [Deploy e Configuração](#deploy-e-configuração)
12. [Troubleshooting](#troubleshooting)

---

## Visão Geral

O **SysHair** é um sistema SaaS completo para gestão de salões de belezas e barbearias desenvolvido pela **Código Base**.

### Características Principais
- ✅ Agendamento Online 24/7 com PWA instalável
- ✅ Dashboard com métricas em tempo real
- ✅ Gestão de Clientes (CRM)
- ✅ Controle Financeiro completo
- ✅ Gestão de Profissionais
- ✅ Cupons, Promoções e Pacotes
- ✅ Sistema de Fidelidade com pontos
- ✅ BI Preditivo com IA
- ✅ Integração WhatsApp (API Evolution)
- ✅ Integração Mercado Pago
- ✅ Super Admin para gestão de multitenancy
- ✅ PWA (Progressive Web App)
- ✅ Sistema de assinaturas automatizado

### Preço e Modelo
- **Plano Único:** R$ 39,90/mês
- **Trial:** 7 dias grátis sem limitações
- **Recurso Ilimitados:** Profissionais, agendamentos, clientes

---

## Arquitetura do Sistema

### Arquitetura Geral
```
sysshair/
├── Frontend (React + Vite + TypeScript)
├── Backend (Supabase - PostgreSQL + Auth + Storage)
├── Pagamentos (Mercado Pago)
├── Notificações (WhatsApp API Evolution + Push Notifications)
└── PWA (Vite PWA Plugin)
```

### Stack Tecnológico

**Frontend:**
- React 18.3.1
- TypeScript 5.8.3
- Vite 5.4.19 (Build tool)
- TailwindCSS 3.4.17 (Estilos)
- ShadCN UI (Componentes)
- Radix UI (Headless components)
- Framer Motion 12.23.26 (Animações)
- React Router DOM 6.30.1 (Rotas)
- React Query 5.83.0 (State management)
- React Hook Form 7.61.1 (Forms)
- Zod 3.25.76 (Validation)

**Backend:**
- Supabase (PostgreSQL 14+)
- Supabase Auth (Autenticação)
- Supabase Storage (Imagens)
- PostgreSQL Functions (Business logic)

**Integrações:**
- Mercado Pago API (Pagamentos e assinaturas)
- API Evolution (WhatsApp)
- Firebase (Push Notifications)

**PWA:**
- Vite PWA Plugin 1.2.0
- Service Worker
- Offline support

---

## Estrutura do Banco de Dados

### Tabelas Principais

#### 1. **salons** - Salões de Beleza
```typescript
{
  id: string (UUID)
  name: string
  business_name: string | null
  description: string | null
  logo_url: string | null
  primary_color: string | null
  slug: string | null
  whatsapp: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  cnpj: string | null
  opening_time: string | null
  closing_time: string | null
  working_days: number[] | null
  public_booking_enabled: boolean | null
  is_active: boolean | null
  is_franchise: boolean | null
  group_id: string | null (salon_groups)
  owner_id: string (users)
  created_at: timestamp
  updated_at: timestamp
}
```

#### 2. **professionals** - Profissionais
```typescript
{
  id: string (UUID)
  name: string
  bio: string | null
  specialty: string | null
  avatar_url: string | null
  email: string | null
  phone: string | null
  commission_rate: number | null (%)
  working_days: number[] | null
  working_hours: Json | null
  is_active: boolean | null
  is_autonomous: boolean | null
  public_profile_enabled: boolean | null
  portfolio_urls: Json | null
  salon_id: string (salons)
  user_id: string | null (users)
  created_at: timestamp
  updated_at: timestamp
}
```

#### 3. **services** - Serviços
```typescript
{
  id: string (UUID)
  name: string
  description: string | null
  price: number
  duration_minutes: number
  icon: string | null
  is_active: boolean | null
  salon_id: string (salons)
  created_at: timestamp
  updated_at: timestamp
}
```

#### 4. **appointments** - Agendamentos
```typescript
{
  id: string (UUID)
  date: string (YYYY-MM-DD)
  start_time: string (HH:MM)
  end_time: string (HH:MM)
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show"
  price: number
  final_price: number
  discount: number | null
  notes: string | null
  
  // Relations
  salon_id: string (salons)
  professional_id: string (professionals)
  service_id: string (services)
  client_id: string | null (clients)
  client_name: string | null
  client_phone: string | null
  client_birthday: string | null
  coupon_id: string | null (coupons)
  
  created_at: timestamp
  updated_at: timestamp
}
```

#### 5. **clients** - Clientes
```typescript
{
  id: string (UUID)
  name: string
  email: string | null
  phone: string | null
  notes: string | null
  preferences: Json | null
  loyalty_points: number (DEFAULT: 0)
  total_visits: number | null
  total_spent: number | null
  last_visit_at: string | null
  user_id: string | null (users)
  salon_id: string (salons)
  created_at: timestamp
  updated_at: timestamp
}
```

#### 6. **subscriptions** - Assinaturas
```typescript
{
  id: string (UUID)
  status: string ("trial" | "active" | "pending" | "expired" | "cancelled")
  plan_name: string | null
  amount: number | null
  currency: string | null
  is_trial: boolean | null
  trial_start_date: string | null
  trial_end_date: string | null
  current_period_start: string | null
  current_period_end: string | null
  next_payment_date: string | null
  last_payment_date: string | null
  
  // Mercado Pago
  mp_preapproval_id: string | null
  mp_payer_id: string | null
  mp_external_reference: string | null
  
  cancel_reason: string | null
  cancelled_at: string | null
  user_id: string | null
  salon_id: string | null
  plan_id: string | null
  created_at: string | null
  updated_at: string | null
}
```

### Tabelas de Sistema

#### 7. **profiles** - Perfis de Usuário (Supabase Auth)
```typescript
{
  id: string (UUID)
  user_id: string (auth.users)
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  created_at: timestamp
  updated_at: timestamp
}
```

#### 8. **user_roles** - Papéis de Usuário
```typescript
{
  id: string (UUID)
  user_id: string (users)
  role: "admin" | "professional" | "client"
  salon_id: string | null (salons)
  created_at: timestamp
}
```

### Tabelas de Funcionalidades Avançadas

#### 9. **coupons** - Cupons de Desconto
```typescript
{
  id: string (UUID)
  code: string
  type: "percentage" | "fixed"
  value: number
  is_active: boolean | null
  is_new_clients_only: boolean | null
  max_uses: number | null
  uses_count: number | null
  valid_from: string | null
  valid_until: string | null
  min_purchase: number | null
  salon_id: string (salons)
  created_at: timestamp
}
```

#### 10. **service_packages** - Pacotes de Serviços
```typescript
{
  id: string (UUID)
  name: string
  description: string | null
  price: number
  quantity: number (número de sessões)
  discount_percent: number | null
  validity_days: number | null
  is_active: boolean | null
  salon_id: string (salons)
  service_id: string (services)
  created_at: timestamp
}
```

#### 11. **client_credits** - Créditos de Pacotes
```typescript
{
  id: string (UUID)
  client_id: string (clients)
  service_id: string (services)
  package_id: string | null (service_packages)
  salon_id: string (salons)
  total_uses: number
  remaining_uses: number
  expires_at: string | null
  created_at: timestamp
}
```

#### 12. **client_metrics** - Métricas de Cliente (IA)
```typescript
{
  id: string (UUID)
  client_id: string (clients)
  salon_id: string (salons)
  preferred_professional_id: string | null (professionals)
  preferred_time: string | null
  preferred_day_of_week: number | null
  total_appointments: number | null
  total_spent: number | null
  avg_days_between_visits: number | null
  last_visit_date: string | null
  ltv: number | null (Lifetime Value)
  churn_risk: string | null ("low" | "medium" | "high")
  predicted_next_visit: string | null
  updated_at: timestamp
}
```

#### 13. **salon_insights** - Insights do Salão (IA)
```typescript
{
  id: string (UUID)
  salon_id: string (salons)
  insight_type: string
  title: string
  message: string
  priority: string | null
  action_type: string | null
  action_data: Json | null
  is_read: boolean | null
  is_dismissed: boolean | null
  expires_at: string | null
  created_at: timestamp
}
```

#### 14. **reviews** - Avaliações
```typescript
{
  id: string (UUID)
  client_id: string (clients)
  professional_id: string (professionals)
  appointment_id: string | null (appointments)
  salon_id: string (salons)
  rating: number (1-5)
  comment: string | null
  is_public: boolean | null
  response: string | null
  response_at: string | null
  created_at: timestamp
}
```

#### 15. **payments** - Pagamentos
```typescript
{
  id: string (UUID)
  appointment_id: string | null (appointments)
  client_id: string | null (clients)
  package_id: string | null (service_packages)
  salon_id: string (salons)
  amount: number
  payment_status: string
  payment_method: string
  payment_type: string
  transaction_id: string | null
  paid_at: string | null
  metadata: Json | null
  created_at: timestamp
}
```

#### 16. **notifications** - Notificações
```typescript
{
  id: string (UUID)
  salon_id: string (salons)
  client_id: string | null (clients)
  appointment_id: string | null (appointments)
  type: string
  channel: string ("email" | "whatsapp" | "push")
  title: string | null
  message: string
  phone: string | null
  scheduled_for: string | null
  sent_at: string | null
  status: string | null
  error_message: string | null
  created_at: string | null
}
```

#### 17. **push_subscriptions** - Subscrições Push
```typescript
{
  id: string (UUID)
  salon_id: string (salons)
  user_id: string | null (users)
  client_id: string | null (clients)
  endpoint: string
  p256dh: string
  auth: string
  is_active: boolean | null
  device_info: Json | null
  created_at: timestamp
  updated_at: timestamp
}
```

#### 18. **products** - Produtos
```typescript
{
  id: string (UUID)
  name: string
  description: string | null
  price: number
  category: string | null
  image_url: string | null
  stock: number | null
  is_active: boolean | null
  salon_id: string (salons)
  created_at: timestamp
}
```

#### 19. **product_sales** - Vendas de Produtos
```typescript
{
  id: string (UUID)
  salon_id: string (salons)
  product_id: string (products)
  client_id: string | null (clients)
  appointment_id: string | null (appointments)
  quantity: number
  unit_price: number
  total_price: number
  created_at: timestamp
}
```

#### 20. **client_gallery** - Galeria de Cliente (Before/After)
```typescript
{
  id: string (UUID)
  salon_id: string (salons)
  client_id: string (clients)
  professional_id: string | null (professionals)
  appointment_id: string | null (appointments)
  service_id: string | null (services)
  before_image_url: string | null
  after_image_url: string | null
  description: string | null
  share_token: string | null
  visibility: string | null
  created_at: timestamp
}
```

#### 21. **salon_groups** - Grupos de Salões (Multi-unidades)
```typescript
{
  id: string (UUID)
  name: string
  owner_id: string (users)
  logo_url: string | null
  primary_color: string | null
  created_at: timestamp
}
```

#### 22. **salon_plans** - Planos de Salão
```typescript
{
  id: string (UUID)
  salon_id: string (salons)
  plan_type: string
  price_monthly: number | null
  max_professionals: number | null
  max_services: number | null
  features: Json | null
  custom_domain: string | null
  white_label_enabled: boolean | null
  started_at: string | null
  expires_at: string | null
  is_active: boolean | null
  created_at: timestamp
}
```

#### 23. **subscription_payments** - Pagamentos de Assinatura
```typescript
{
  id: string (UUID)
  subscription_id: string | null (subscriptions)
  salon_id: string | null (salons)
  amount: number
  currency: string | null
  payment_method: string | null
  mp_payment_id: string | null
  mp_status: string | null
  mp_status_detail: string | null
  paid_at: string | null
  created_at: string | null
}
```

### Enumerations

```typescript
enum appointment_status {
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show"
}

enum coupon_type {
  "percentage",
  "fixed"
}

enum user_role {
  "admin",
  "professional",
  "client"
}
```

### Database Functions

```sql
-- Verificar se usuário tem papel específico
has_role(_role, _user_id) RETURNS boolean

-- Obter ID do salão do usuário
get_user_salon_id(_user_id) RETURNS string

-- Verificar se assinatura está ativa
is_subscription_active(p_salon_id) RETURNS boolean

-- Obter status da assinatura
get_subscription_status(p_salon_id) RETURNS Json

-- Obter analytics do salão
get_salon_analytics(p_salon_id, p_period?) RETURNS Json

-- Calcular métricas de cliente
calculate_client_metrics(p_client_id) RETURNS void

-- Calcular insights do salão
generate_salon_insights(p_salon_id) RETURNS void

-- Verificar notificações de aniversário
check_birthday_notifications() RETURNS void
```

---

## Tecnologias Utilizadas

### Frontend Frameworks

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| React | 18.3.1 | UI Library |
| TypeScript | 5.8.3 | Type safety |
| Vite | 5.4.19 | Build tool |
| TailwindCSS | 3.4.17 | Styling |
| ShadCN UI | Latest | Component library |
| Radix UI | Latest | Headless components |

### State Management

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| React Query | 5.83.0 | Server state |
| React Hook Form | 7.61.1 | Forms |
| Zod | 3.25.76 | Validation |
| Context API | Native | Global state |

### Routing

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| React Router DOM | 6.30.1 | Navigation |
| Lazy Loading | Native | Code splitting |

### Animations

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| Framer Motion | 12.23.26 | UI animations |

### Backend

| Tecnologia | Uso |
|------------|-----|
| Supabase | Database, Auth, Storage |

### External APIs

| API | Uso |
|-----|-----|
| Mercado Pago | Pagamentos |
| API Evolution | WhatsApp |
| Firebase | Push notifications (FCM) |

---

## Estrutura de Código

```
src/
├── App.tsx                          # Main app component & routes
├── main.tsx                         # Entry point
├── index.css                        # Base styles
├── components/                      # Reusable components
│   ├── ui/                         # ShadCN UI components
│   │   ├── button/
│   │   ├── dialog/
│   │   ├── form/
│   │   ├── table/
│   │   └── ...
│   ├── auth/                       # Auth components
│   │   ├── ProtectedRoute.tsx
│   │   └── ...
│   ├── subscription/               # Subscription components
│   │   ├── Paywall.tsx
│   │   └── ...
│   ├── pwa/                        # PWA components
│   │   ├── InstallPrompt.tsx
│   │   ├── OfflineIndicator.tsx
│   │   └── ...
│   └── ...
├── config/                          # Configuration files
│   └── contact.ts                   # Developer info
├── hooks/                           # Custom hooks
│   ├── useAuth.tsx                 # Authentication
│   ├── useSubscription.tsx         # Subscription
│   ├── useSalon.tsx                # Salon data
│   ├── useMobile.tsx               # Mobile detection
│   ├── usePWA.tsx                  # PWA features
│   ├── usePushNotifications.tsx    # Push notifications
│   └── usePushNotificationsFCM.tsx # FCM integration
├── integrations/                    # External integrations
│   └── supabase/
│       ├── client.ts               # Supabase client
│       └── types.ts                # Database types
├── lib/                             # Utilities
│   ├── utils.ts                    # Helper functions
│   └── firebase.ts                 # Firebase config
├── pages/                           # Page components
│   ├── Index.tsx                   # Landing page
│   ├── Login.tsx                   # Login
│   ├── Register.tsx                # Register
│   ├── Dashboard.tsx               # Legacy dashboard
│   ├── BookingFlow.tsx             # Booking wizard
│   ├── Checkout.tsx                # Subscription checkout
│   ├── PublicSalon.tsx             # Public salon page (slug)
│   ├── PublicProfessional.tsx      # Public professional page
│   ├── PublicBookingAdvanced.tsx   # Public booking page
│   ├── PublicWaitlist.tsx          # Waitlist page
│   ├── RatingPage.tsx              # Rating page
│   ├── NotFound.tsx                # 404
│   ├── SuperAdmin.tsx              # Super admin dashboard
│   ├── admin/                      # Admin pages
│   │   ├── AdminDashboard.tsx
│   │   ├── SalonSettings.tsx
│   │   ├── Professionals.tsx
│   │   ├── Services.tsx
│   │   ├── Coupons.tsx
│   │   ├── Appointments.tsx
│   │   ├── Clients.tsx
│   │   ├── Financial.tsx
│   │   ├── Analytics.tsx
│   │   ├── Packages.tsx
│   │   ├── Products.tsx
│   │   ├── Reviews.tsx
│   │   ├── MultiUnits.tsx
│   │   ├── Gallery.tsx
│   │   ├── AdvancedFeatures.tsx    # BI, Fidelidade, Fila, etc.
│   │   ├── SubscriptionManagement.tsx
│   │   ├── Marketing.tsx
│   │   ├── ChatbotIA.tsx
│   │   ├── StatusScheduler.tsx
│   │   ├── WhatsAppConnection.tsx
│   │   ├── BroadcastMessages.tsx
│   │   └── ImportContacts.tsx
│   ├── professional/                # Professional pages
│   │   └── ProfessionalDashboard.tsx
│   └── client/                      # Client pages
│       └── ClientProfile.tsx
└── services/                        # Business logic
    ├── analyticsService.ts          # Analytics functions
    ├── goalsService.ts              # Goals (OKRs)
    ├── lookbookService.ts           # Lookbook/Gallery
    ├── loyaltyService.ts            # Loyalty program
    ├── mercadoPago.ts               # Mercado Pago integration
    ├── mercadoPagoWebhook.ts        # Webhook handler
    ├── referralService.ts           # Referral program
    └── waitlistService.ts           # Waitlist management
```

---

### Funcionalidades por Módulo

#### 1. Autenticação e Permissões

**Login/Register** (`/login`, `/register`)
- Email/Password authentication via Supabase Auth
- Social login (Google, Facebook) disponível
- MFA (Multi-Factor Authentication) configurável

**Roles e Permissões**
- **admin:** Acesso total ao dashboard administrativo
- **professional:** Acesso ao próprio dashboard de agendamentos
- **client:** Acesso à visualização de perfil e histórico

**Protected Routes**
- `ProtectedRoute` component protege rotas por role
- Verifica autenticação e permissão antes de acessar

#### 2. Dashboard Administrativo (`/admin`)

**Métricas Principais**
- Agendamentos hoje
- Faturamento mensal
- clientes ativos
- Taxa de ocupação

**Módulos do Menu Lateral (17 opções)**
1. Dashboard
2. Agendamentos
3. Clientes
4. Profissionais
5. Serviços
6. Cupons
7. Pacotes
8. Financeiro
9. Analytics
10. Recursos Avançados ⭐
11. Produtos
12. Avaliações
13. Galeria
14. Multi-Unidades
15. Minha Assinatura 👑
16. Configurações
17. Marketing

#### 3. Recursos Avançados (`/admin/advanced`)

**Tab 1: BI & IA (Inteligência Artificial)**
- Previsão de faturamento (6 meses)
- Risco de churn (low/medium/high)
- Cross-sell inteligente
- Insights preditivos

**Tab 2: Fidelidade**
- Sistema de pontos
- Níveis: Bronze → Prata → Ouro → Diamante → VIP
- Badges colecionáveis
- Regras customizáveis

**Tab 3: Fila de Espera**
- Gerenciador de waitlist
- Prioridades (Normal, Alta, Urgente)
- Tempo estimado de espera
- Notificação automática

**Tab 4: Indicações (Referral)**
- Código único por cliente
- Compartilhamento (WhatsApp, Copy, QR Code)
- Ranking de indicadores
- Sistema de recompensas

**Tab 5: Lookbook**
- Portfólio visual
- Before/After
- Booking direto
- Compartilhamento social

**Tab 6: Metas (OKRs)**
- Objetivos e resultados-chave
- Barras de progresso
- Indicadores visuais (Verde/Amarelo/Vermelho)

#### 4. Agendamento Online

**Fluxo de Agendamento** (`/booking` or `/agendar/:salonSlug`)
1. **Passo 1:** Seleção de serviço
   - Cards visuais com imagens
   - Duração e preço
   - Categorias (Cortes, Coloração, Finalização, Barba)

2. **Passo 2:** Seleção de profissional
   - Fotos e especialidades
   - Ratings com estrelas
   - Status de disponibilidade
   - Opção "Sem preferência"

3. **Passo 3:** Data e horário
   - Calendário visual
   - Horários disponíveis (08:00 - 19:00)
   - Exibição de indisponibilidade

4. **Passo 4:** Confirmação
   - Resumo completo
   - Opção de pagamento antecipado (5% desconto)
   - Confirmação via WhatsApp

#### 5. Gestão de Assinaturas (`/admin/subscription`)

**Status de Assinatura**
- **Trial:** 7 dias grátis
- **Active:** Assinatura ativa
- **Pending:** Pagamento pendente
- **Expired:** Expirada
- **Cancelled:** Cancelada

**Funcionalidades**
- Visualização de próximo pagamento
- Histórico de faturas
- Gerenciamento via Mercado Pago
- Suporte direto via WhatsApp

**Paywall**
- Bloqueio automático após trial
- Banner de aviso (≤3 dias restantes)
- CTAs para renovação

#### 6. Integração WhatsApp

**Funcionalidades**
- Confirmação de agendamento
- Lembretes automáticos
- Cancelamento via WhatsApp
- Broadcast em massa
- Configuração de API Evolution

**Conexão**
- Dashboard de conexão (`/admin/whatsapp`)
- Status da conexão
- API Key e Instance ID
- Webhook configuration

#### 7. Super Admin (`/super-admin`)

**Funções**
- Métricas globais (todos os salões)
- Filtros por status (Trial, Pago, Bloqueado)
- Ações em massa:
  - Bloquear/Desbloquear
  - Editar salão
  - Estender trial
  - Marcar pago
  - Notificar
  - Excluir
- Broadcast global

**Permissões**
- Emails permitidos:
  - jefferson22gs@gmail.com
  - admin@syshair.com
- Acesso total via `is_super_admin()` function

#### 8. PWA (Progressive Web App)

**Funcionalidades**
- Instalação como app nativo
- Offline support
- Push notifications
- Service Worker

**Componentes**
- `InstallPrompt` - Prompt de instalação
- `OfflineIndicator` - Indicador offline
- `NotificationPrompt` - Solicitação de permissão

---

## Integrações Externas

### Mercado Pago

**Pagamentos One-Time**
```typescript
// Criar preferência de pagamento
const createPaymentPreference = async (appointmentId: string, amount: number) => {
  const preference = {
    items: [{
      title: 'Agendamento SysHair',
      quantity: 1,
      currency_id: 'BRL',
      unit_price: amount
    }],
    back_urls: {
      success: `${BASE_URL}/checkout/success`,
      pending: `${BASE_URL}/checkout/pending`,
      failure: `${BASE_URL}/checkout/failure`
    },
    auto_return: 'approved'
  };
  // ... API call
};
```

**Assinaturas Recorrentes**
```typescript
// Criar preapproval
const createSubscription = async (salonId: string, userEmail: string) => {
  const preapproval = {
    reason: 'SysHair Premium',
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: 39.90,
      currency_id: 'BRL',
      start_date: new Date().toISOString(),
    },
    back_url: `${BASE_URL}/admin/subscription`,
    payer_email: userEmail
  };
  // ... API call
};
```

**Webhooks**
- `/api/webhook/mercado-pago` - Recebimento de notificações
- Processing de pagamentos
- Atualização de status de assinatura

### API Evolution (WhatsApp)

**Configuração**
```typescript
const whatsappConfig = {
  apiUrl: 'https://api.evolution.com',
  apiKey: process.env.EVOLUTION_API_KEY,
  instanceId: process.env.EVOLUTION_INSTANCE_ID
};
```

**Envio de Mensagens**
```typescript
const sendMessage = async (phone: string, message: string) => {
  const response = await fetch(`${whatsappConfig.apiUrl}/message/sendText`, {
    method: 'POST',
    headers: {
      'apikey': whatsappConfig.apiKey
    },
    body: JSON.stringify({
      number: phone,
      options: {
        delay: 1200,
        presence: "composing"
      },
      textMessage: {
        text: message
      }
    })
  });
  // ... handle response
};
```

**Webhooks**
- `/api/webhook/whatsapp` - Recebimento de mensagens
- Processamento de comandos

---

## Autenticação e Permissões

### Flow de Autenticação

```
1. Usuário faz login/register
2. Supabase Auth cria session
3. Hooks (useAuth) verificam autenticação
4. ProtectedRoute verifica role
5. Acesso concedido/denegado
```

### Roles System

**Helper Functions**
```typescript
// Verificar se usuário tem role específico
const hasRole = async (userId: string, role: 'admin' | 'professional' | 'client'): Promise<boolean> => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', role)
    .single();
  
  return !!data && !error;
};

// Obter role do usuário
const getUserRole = async (userId: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();
  
  return data?.role || null;
};
```

### Protected Routes

```typescript
<ProtectedRoute requiredRole="admin">
  <AdminDashboard />
</ProtectedRoute>

<ProtectedRoute>
  <ClientProfile />
</ProtectedRoute>

<ProtectedRoute requiredRole="professional">
  <ProfessionalDashboard />
</ProtectedRoute>
```

---

## Sistemas de Notificações

### Tipos de Notificações

1. **Email**
   - Confirmação de agendamento
   - Lembretes
   - Atualizações de status

2. **WhatsApp** (API Evolution)
   - Confirmação instantânea
   - Lembretes 1h antes
   - Cancelamento/modificação

3. **Push Notifications** (Firebase FCM)
   - Novos agendamentos
   - Atualizações em tempo real
   - Promoções

### Push Notifications

**Subscription**
```typescript
const subscribeToPush = async () => {
  const registration = await serviceWorkerRegistration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: VAPID_PUBLIC_KEY
  });
  
  await supabase.from('push_subscriptions').insert({
    salon_id: currentSalon.id,
    endpoint: registration.endpoint,
    p256dh: btoa(String.fromCharCode(...new Uint8Array(registration.getKey('p256dh')))),
    auth: btoa(String.fromCharCode(...new Uint8Array(registration.getKey('auth')))),
    user_id: user.id
  });
};
```

**Sending Notifications**
```typescript
const sendPushNotification = async (subscription, payload) => {
  await fetch('/api/send-push', {
    method: 'POST',
    body: JSON.stringify({
      subscription,
      payload
    })
  });
};
```

---

## Gerenciamento de Assinaturas

### Fluxo de Assinatura

```
1. Usuário se registra
2. Sistema cria subscription TRIAL (7 dias)
3. Usuário acessa features completas
4. Antes de expirar →-banner de aviso
5. Expirados → paywall bloqueia acesso
6. Usuário faz checkout via Mercado Pago
7. Webhook atualiza status para ACTIVE
8. Assinatura renovada mensalmente
```

### Status Management

**Status Transitions**
```
trial → active → active → active → ...
trial → pending → active → ...
trial → expired → active → ...
active → cancelled → (no access)
```

**Trial Management**
```typescript
const checkTrialStatus = async (salonId: string) => {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('salon_id', salonId)
    .is('trial_end_date', null, 'is')
    .single();
  
  if (subscription) {
    const daysRemaining = Math.ceil(
      (new Date(subscription.trial_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysRemaining <= 0) {
      // Expired - update status
      await supabase
        .from('subscriptions')
        .update({ status: 'expired' })
        .eq('id', subscription.id);
    }
    
    return {
      isTrial: true,
      daysRemaining,
      subscription
    };
  }
  
  return { isTrial: false };
};
```

### Paywall Component

```typescript
<TrialWarningBanner
  daysRemaining={daysRemaining}
  onUpgrade={handleUpgrade}
/>

<Paywall
  isVisible={isPaywallVisible}
  planName="SysHair Premium"
  price={39.90}
  onSubscribe={handleSubscribe}
/>
```

---

## Deploy e Configuração

### Deploy na Vercel

**Setup**
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd D:\Projetos\syshair-main
vercel
```

**Configuração `vercel.json`**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "env": {
    "VITE_SUPABASE_URL": "@supabase-url",
    "VITE_SUPABASE_PUBLISHABLE_KEY": "@supabase-key",
    "VITE_MERCADOPAGO_PUBLIC_KEY": "@mp-public-key"
  }
}
```

**Environment Variables no Vercel**
1. VITE_SUPABASE_URL
2. VITE_SUPABASE_PUBLISHABLE_KEY
3. VITE_SUPABASE_ANON_KEY
4. SUPABASE_SERVICE_ROLE_KEY
5. DATABASE_URL
6. VITE_MERCADOPAGO_PUBLIC_KEY
7. MERCADOPAGO_ACCESS_TOKEN
8. MERCADOPAGO_CLIENT_ID
9. MERCADOPAGO_CLIENT_SECRET
10. DEVELOPER_WHATSAPP
11. DEVELOPER_INSTAGRAM

### Local Development

```bash
# Clone repo
git clone https://github.com/jefferson22gs/syshair.git
cd syshair

# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

---

## Troubleshooting

### Problemas Comuns

**1. Erro de Conexão com Supabase**
```
Solução:
- Verificar .env local com variáveis corretas
- Verificar se URL e KEY estão corretas
- Verificar se projeto Supabase está ativo
```

**2. Build Error no Vercel**
```
Solução:
- Verificar environment variables no Vercel
- Limpar cache: vercel build --force
- Verificar log de build completo
```

**3. Permissões de Row Level Policies (RLP)**
```
Solução:
- Verificar RLPs no dashboard Supabase
- Usar is_super_admin() function para bypass
- Verificar se user_id está correto
```

**4. Erro de Pagamento Mercado Pago**
```
Solução:
- Verificar ACCESS_TOKEN production
- Verificar se webhook está configurado
- Verificar logs de webhook
- Verificar se payer_email está correto
```

**5. PWA Não Instala**
```
Solução:
- Verificar manifest.json
- Verificar service worker registration
- Verificar HTTPS (obrigatório para PWA)
- Verificar navegador compatível
```

**6. Notificações Push Não Chegam**
```
Solução:
- Verificar permissão de notificação
- Verificar subscription salva no Supabase
- Verificar Firebase Cloud Messaging
- Verificar VAPID keys
```

**7. Trial Expirou Mas Paywall Não Aparece**
```
Solução:
- Verificar status da subscription
- Verificar hook useSubscription
- Verificar lógica TrialWarningBanner
- Limpar localStorage e refazer login
```

**8. WhatsApp Não Envia Mensagens**
```
Solução:
- Verificar API KEY do Evolution
- Verificar instance ID
- Verificar se serviço está ativo
- Verificar formato do telefone (com DDD, com 55)
```

### Logs de Debug

```typescript
// Ativar debug no Supabase
const supabase = createClient(DATABASE_URL, ANON_KEY, {
  auth: {
    debug: true  // logs detalhados de auth
  }
});

// React Query DevTools
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
// Adicionar <ReactQueryDevtools initialIsOpen={false} />
```

---

## Contato e Suporte

**Desenvolvido por:** Código Base  

**Suporte Técnico:**
- 📞 WhatsApp: +55 11 98626-2240
- 📸 Instagram: @codigo.base
- 🌐 Website: https://w.app/codigobase

**Email de Desenvolvedor:**
- jefferson22gs@gmail.com

---

*Última atualização: Janeiro 2026*
*Versão: 1.0.0*
