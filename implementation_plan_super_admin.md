# Plano de Implementação: Super Admin

## Visão Geral
Este plano descreve como implementar e usar o painel de Super Admin para controle total do sistema SysHair.

## 1. Configuração de Banco de Dados
- **Migration SQL**: Execute o arquivo `20260126_super_admin_policies.sql` no SQL Editor do Supabase.
- **Motivo**: Isso cria a função `is_super_admin()` e garante que users com email `jefferson22gs@gmail.com` ou `admin@syshair.com` tenham permissão TOTAL nas tabelas `salons`, `subscriptions` e `notifications`.

## 2. Acesso ao Painel
- **URL**: `YOUR_APP_URL/super-admin` (rota protegida).
- **Login Necessário**: Você deve estar logado com um dos emails permitidos.

## 3. Funcionalidades do Dashboard
- **Métricas Globais**: Visão geral de crescimento (Salões, Receita, Ativos).
- **Filtros**: Encontre salões rapidamente por status (Trial, Pago, Bloqueado).
- **Ações Rápidas (Dropdown)**:
  - **Bloquear/Desbloquear**: Controle instantâneo de acesso.
  - **Editar Salão**: Correção de dados cadastrais.
  - **Estender Trial**: dê mais dias de teste para prospectos.
  - **Marcar Pago**: Ativação manual de planos.
  - **Notificar**: Envie avisos push importantes.
  - **Excluir**: Remoção completa de dados (CUIDADO!).

## 4. Comunicação em Massa (Broadcast)
- **Botão "Broadcast"**: No topo do dashboard.
- **Uso**: Envie mensagens para TODOS os salões de uma vez (ex: "Manutenção programada", "Nova funcionalidade disponível").

## 5. Próximos Passos
- Implementar webhook de Stripe/Asaas para automatizar status de pagamento.
- Adicionar logs de auditoria para rastrear quem fez o que no painel admin.
