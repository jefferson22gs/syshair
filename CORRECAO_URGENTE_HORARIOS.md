# 🚨 CORREÇÃO URGENTE - Horários de Agendamento

**Data:** 25/02/2026 às 21:56
**Prioridade:** 🔴 CRÍTICA - EM PRODUÇÃO
**Problema:** Horários mostram 30 em 30 min, não respeitam duração do serviço

---

## 🐛 PROBLEMA IDENTIFICADO

### Arquivo: `src/pages/PublicBookingAdvanced.tsx`

**Linha 135-150:** Função `generateTimeSlots()` está hardcoded:

```typescript
const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    for (let hour = 8; hour <= 19; hour++) {
        slots.push({
            time: `${hour.toString().padStart(2, '0')}:00`,
            available: Math.random() > 0.3,  // ❌ MOCK DATA
        });
        if (hour < 19) {
            slots.push({
                time: `${hour.toString().padStart(2, '0')}:30`,  // ❌ SEMPRE 30 MIN
                available: Math.random() > 0.3,
            });
        }
    }
    return slots;
};
```

**Problemas:**
1. ❌ Intervalos fixos de 30 minutos
2. ❌ Não usa duração do serviço cadastrado
3. ❌ Usa dados mock (Math.random)
4. ❌ Não verifica agendamentos existentes
5. ❌ Não usa horário de funcionamento do salão

---

## ✅ SOLUÇÃO

O arquivo `BookingFlow.tsx` usa a função correta `getAvailableTimeSlots` do hook `useSalon.tsx` que:

✅ Respeita duração do serviço
✅ Verifica conflitos com agendamentos existentes
✅ Usa horário de funcionamento do salão
✅ Gera intervalos baseados na duração

**Código correto em `useSalon.tsx` (linha 368):**
```typescript
currentTime += duration; // ✅ Usa duração do serviço
```

---

## 🔧 CORREÇÃO NECESSÁRIA

Preciso modificar `PublicBookingAdvanced.tsx` para:

1. Importar `useSalon` hook
2. Usar `getAvailableTimeSlots` ao invés de `generateTimeSlots`
3. Buscar dados reais do Supabase
4. Remover dados mock

---

## ⚠️ IMPACTO

**Páginas afetadas:**
- ❌ `/agendar` - PublicBookingAdvanced.tsx (PROBLEMA)
- ✅ `/booking/:salonId` - BookingFlow.tsx (CORRETO)

**Clientes afetados:**
- Todos que usam a URL `/agendar`
- Sistema em produção

---

## 🚀 AÇÃO IMEDIATA

Vou criar a correção agora em 3 etapas:

1. Modificar PublicBookingAdvanced.tsx
2. Integrar com useSalon hook
3. Testar e fazer deploy urgente

---

**Aguarde, estou corrigindo agora...**
