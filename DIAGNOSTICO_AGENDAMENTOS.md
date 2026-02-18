# 🔍 DIAGNÓSTICO - Agendamentos não aparecem no Admin

**Data:** 2026-02-18 22:11

---

## 🐛 POSSÍVEIS CAUSAS

### 1. Filtro de Data
A página de Appointments filtra por data específica. Se você agendou para uma data diferente da selecionada, não vai aparecer.

### 2. Problema no Banco de Dados
O agendamento pode não estar sendo salvo corretamente.

### 3. Problema de Permissões (RLS)
As políticas de Row Level Security podem estar bloqueando a visualização.

---

## 🧪 TESTES PARA FAZER

### Teste 1: Verificar se o agendamento foi salvo

1. Acesse: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/editor
2. Execute:
```sql
-- Ver últimos agendamentos criados
SELECT
    id,
    salon_id,
    client_name,
    client_phone,
    date,
    start_time,
    status,
    created_at
FROM appointments
ORDER BY created_at DESC
LIMIT 10;
```

**Me diga:**
- Aparece o agendamento que você fez?
- Qual é a data do agendamento?
- Qual é o salon_id?

---

### Teste 2: Verificar a data selecionada no Admin

1. Acesse: https://syshair.vercel.app/admin/appointments
2. Veja qual data está selecionada no topo
3. Use as setas para navegar entre as datas
4. Veja se o agendamento aparece na data correta

---

### Teste 3: Ver todos os agendamentos (sem filtro de data)

Execute no SQL Editor:
```sql
-- Ver TODOS os agendamentos do seu salão
SELECT
    a.id,
    a.client_name,
    a.date,
    a.start_time,
    a.status,
    s.name as service_name,
    p.name as professional_name
FROM appointments a
LEFT JOIN services s ON a.service_id = s.id
LEFT JOIN professionals p ON a.professional_id = p.id
WHERE a.salon_id = (
    SELECT id FROM salons WHERE owner_id = auth.uid() LIMIT 1
)
ORDER BY a.created_at DESC
LIMIT 20;
```

---

## 🔧 SOLUÇÕES

### Solução 1: Adicionar visualização "Todos os agendamentos"

Modificar a página para mostrar todos os agendamentos, não apenas do dia selecionado.

### Solução 2: Adicionar filtro de período

Permitir ver agendamentos de uma semana ou mês inteiro.

### Solução 3: Adicionar aba "Próximos" e "Passados"

Separar agendamentos futuros dos passados.

---

## 📋 O QUE FAZER AGORA

**Execute o Teste 1** e me diga:
1. O agendamento aparece no banco?
2. Qual é a data dele?
3. Qual é o salon_id?

Com essas informações eu corrijo o problema! 🔧
