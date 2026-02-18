# 🔍 DIAGNÓSTICO - Erro na Geração de Legenda

**Data:** 2026-02-18 20:31

---

## 🐛 POSSÍVEIS CAUSAS DO ERRO

### 1. API Key do Gemini Inválida ou Expirada
A chave API hardcoded no código pode estar inválida:
```typescript
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyC1NOIGT7MLTpKoqJF6VqqkdJkt0e6Yci4";
```

### 2. Limite de Requisições Atingido
A API do Gemini tem limites gratuitos que podem ter sido excedidos.

### 3. Formato da Imagem Incorreto
O base64 pode não estar no formato correto para a API.

### 4. Erro de CORS
A requisição pode estar sendo bloqueada pelo navegador.

---

## 🧪 COMO TESTAR

### Teste 1: Ver o Erro Exato no Console

1. Abra a página: https://syshair.vercel.app/admin/status-scheduler
2. Adicione uma imagem
3. Clique em "Gerar Legenda com IA"
4. Abra o Console do navegador (F12)
5. Procure por:
   - `Gemini response:` (log da resposta)
   - `Error generating caption:` (log do erro)

**Me envie a mensagem de erro completa que aparecer!**

---

## 🔧 SOLUÇÕES POSSÍVEIS

### Solução 1: Usar Nova API Key do Gemini

1. Acesse: https://aistudio.google.com/app/apikey
2. Crie uma nova API Key
3. Configure no arquivo `.env`:
   ```
   VITE_GEMINI_API_KEY=SUA_NOVA_KEY_AQUI
   ```

### Solução 2: Usar Edge Function (Mais Seguro)

Em vez de chamar a API diretamente do frontend, criar uma Edge Function no Supabase.

**Vantagens:**
- API Key fica protegida no servidor
- Sem problemas de CORS
- Mais seguro

### Solução 3: Usar Modelo Alternativo

Se o Gemini não funcionar, podemos usar:
- OpenAI GPT-4 Vision
- Claude 3 Vision
- Anthropic API

---

## 📋 CHECKLIST DE DIAGNÓSTICO

Execute estes passos e me diga os resultados:

- [ ] Abrir Console do navegador (F12)
- [ ] Tentar gerar legenda
- [ ] Copiar mensagem de erro completa
- [ ] Verificar se aparece "Gemini response:" no console
- [ ] Verificar se há erro de rede (Network tab)

---

## 🚨 ERROS COMUNS

### Erro: "API key not valid"
**Causa:** Chave API inválida ou expirada
**Solução:** Gerar nova chave em https://aistudio.google.com/app/apikey

### Erro: "Quota exceeded"
**Causa:** Limite de requisições gratuitas atingido
**Solução:** Aguardar reset ou usar outra conta

### Erro: "Failed to fetch"
**Causa:** Problema de CORS ou rede
**Solução:** Usar Edge Function no Supabase

### Erro: "Invalid image format"
**Causa:** Formato da imagem não suportado
**Solução:** Converter para JPEG antes de enviar

---

## 💡 SOLUÇÃO RÁPIDA (TEMPORÁRIA)

Se quiser desabilitar a geração automática temporariamente:

1. Remova o botão "Gerar Legenda com IA"
2. Digite a legenda manualmente

Ou posso implementar uma solução alternativa mais robusta.

---

**Me envie:**
1. A mensagem de erro exata do console
2. O que aparece no Network tab (F12 > Network)
3. Se a requisição para o Gemini aparece como "failed" ou "blocked"

Com essas informações, posso corrigir o problema! 🔧
