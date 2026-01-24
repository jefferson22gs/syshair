# SysHair - Sistema de Gestão para Salões de Beleza

**Sistema completo de gestão para salões de beleza e barbearias**

Desenvolvido por **Código Base**  
📞 WhatsApp: +55 11 98626-2240  
📸 Instagram: @codigo.base

---

## 🚀 Funcionalidades

- ✅ Agendamento Online 24/7
- ✅ Dashboard com métricas em tempo real
- ✅ Gestão de Clientes (CRM)
- ✅ Controle Financeiro completo
- ✅ Gestão de Profissionais
- ✅ Cupons e Promoções
- ✅ Sistema de Fidelidade
- ✅ BI Preditivo com IA
- ✅ Integração WhatsApp
- ✅ PWA (instala como app)
- ✅ Integração Mercado Pago

---

## 💰 Plano

**R$ 39,90/mês** - Tudo incluso, sem limitações

- 7 dias de teste grátis
- Profissionais ilimitados
- Agendamentos ilimitados
- Suporte prioritário

---

## 🛠️ Tecnologias

- **Frontend:** React 18 + TypeScript + Vite
- **Estilização:** TailwindCSS + ShadCN UI
- **Animações:** Framer Motion
- **Backend:** Supabase
- **Pagamentos:** Mercado Pago
- **PWA:** Vite PWA Plugin

---

## 📦 Instalação

```bash
# Clonar repositório
git clone https://github.com/jefferson22gs/syshair.git
cd syshair

# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Build para produção
npm run build
```

---

## 🌐 Deploy

### Vercel (Recomendado)

```bash
npm install -g vercel
vercel
```

### Netlify

```bash
npm run build
# Arraste a pasta 'dist' para o Netlify
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 8080
CMD ["npm", "run", "preview"]
```

---

## 📱 PWA

O sistema funciona como um aplicativo instalável:
- Acesse o site no celular
- Clique em "Adicionar à tela inicial"
- Use como um app nativo

---

## 📞 Suporte

**Código Base**  
📞 WhatsApp: [+55 11 98626-2240](https://wa.me/5511986262240)  
📸 Instagram: [@codigo.base](https://instagram.com/codigo.base)

---

## 📄 Licença

Propriedade de Código Base. Todos os direitos reservados.
