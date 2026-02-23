# 🔍 TROUBLESHOOTING - Exportação de Clientes

**Data:** 23/02/2026 às 19:29
**Problema:** Página de exportação não está aparecendo

---

## 🎯 VERIFICAÇÕES RÁPIDAS

### 1. Verificar se o servidor está rodando

Abra o terminal e verifique se aparece:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

Se não estiver rodando:
```bash
cd D:\Projetos\syshair-main
npm run dev
```

---

### 2. Acessar a URL correta

**URL correta:**
```
http://localhost:5173/admin/export-contacts
```

**NÃO:**
- ❌ http://localhost:5173/export-contacts
- ❌ http://localhost:5173/admin/export
- ❌ http://localhost:5173/admin/contacts/export

---

### 3. Verificar Console do Navegador

1. Pressione **F12** (DevTools)
2. Vá na aba **Console**
3. Recarregue a página (F5)
4. Procure por erros vermelhos

**Erros comuns:**

#### Erro: "Cannot find module"
```
Failed to resolve import "@/components/ui/radio-group"
```

**Solução:**
```bash
# Reinstalar dependências
npm install
```

#### Erro: "404 Not Found"
```
GET http://localhost:5173/admin/export-contacts 404
```

**Solução:**
- Verifique se o arquivo App.tsx foi salvo
- Reinicie o servidor (Ctrl+C e npm run dev)

#### Erro: "useAuth is not defined"
```
useAuth is not a function
```

**Solução:**
- Verifique se está logado
- Faça logout e login novamente

---

### 4. Verificar se a rota foi adicionada

Abra o arquivo `src/App.tsx` e procure por:

```tsx
const ExportContacts = lazy(() => import("./pages/admin/ExportContacts"));
```

E também:

```tsx
<Route path="/admin/export-contacts" element={
  <ProtectedRoute>
    <Suspense fallback={<LoadingScreen />}>
      <ExportContacts />
    </Suspense>
  </ProtectedRoute>
} />
```

Se não encontrar, execute:
```bash
git status
```

Verifique se `src/App.tsx` está modificado.

---

### 5. Verificar se o arquivo existe

Execute no terminal:
```bash
ls -la "D:\Projetos\syshair-main\src\pages\admin\ExportContacts.tsx"
```

Deve retornar:
```
-rw-r--r-- 1 ... ExportContacts.tsx
```

Se não existir:
```
No such file or directory
```

**Solução:** O arquivo não foi criado. Preciso criar novamente.

---

## 🔧 SOLUÇÕES RÁPIDAS

### Solução 1: Reiniciar Servidor

```bash
# No terminal onde está rodando npm run dev
Ctrl+C

# Rodar novamente
npm run dev
```

### Solução 2: Limpar Cache

```bash
# Parar servidor (Ctrl+C)

# Limpar cache
rm -rf node_modules/.vite

# Rodar novamente
npm run dev
```

### Solução 3: Verificar Build

```bash
# Tentar fazer build
npm run build
```

Se der erro, me envie a mensagem de erro.

---

## 📸 O QUE DEVERIA APARECER

### Tela de Carregamento
```
┌─────────────────────────────────────┐
│  Exportar Clientes                  │
│  Exporte seus clientes em formato   │
│  VCF (vCard) ou CSV                 │
│                                     │
│  [Carregando...]                    │
└─────────────────────────────────────┘
```

### Tela Carregada
```
┌─────────────────────────────────────┐
│  Exportar Clientes                  │
│                                     │
│  Total: 50  Selecionados: 50        │
│                                     │
│  ○ VCF (vCard)                      │
│  ○ CSV (Excel)                      │
│                                     │
│  ☑ João Silva                       │
│  ☑ Maria Santos                     │
│  ☑ Pedro Oliveira                   │
│                                     │
│  [Exportar 50 Clientes]             │
└─────────────────────────────────────┘
```

---

## 🆘 ME ENVIE ESTAS INFORMAÇÕES

Para eu te ajudar melhor, me envie:

### 1. URL que você está acessando
```
Exemplo: http://localhost:5173/admin/export-contacts
```

### 2. O que aparece na tela
```
- Página em branco?
- Erro 404?
- Carregando infinito?
- Outra página?
```

### 3. Erros do Console (F12)
```
Copie e cole todos os erros vermelhos aqui
```

### 4. Status do Git
```bash
cd D:\Projetos\syshair-main
git status
```

Copie e cole o resultado.

---

## 🔍 VERIFICAÇÃO MANUAL

Execute estes comandos e me envie os resultados:

```bash
# 1. Verificar se arquivo existe
ls -la "D:\Projetos\syshair-main\src\pages\admin\ExportContacts.tsx"

# 2. Verificar se rota foi adicionada
grep -n "ExportContacts" "D:\Projetos\syshair-main\src\App.tsx"

# 3. Verificar último commit
cd "D:\Projetos\syshair-main"
git log --oneline -1
```

---

## 💡 TESTE ALTERNATIVO

Se nada funcionar, tente acessar outra página admin para ver se o problema é geral:

```
http://localhost:5173/admin/clients
```

Se essa página funcionar, o problema é específico da página de exportação.

Se não funcionar, o problema é de autenticação ou servidor.

---

**Me envie as informações acima para eu te ajudar! 🚀**
