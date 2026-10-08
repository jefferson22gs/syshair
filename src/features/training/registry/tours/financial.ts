import type { TourDef } from "../../types";

export const financialTour: TourDef = {
  id: "financial",
  version: 1,
  title: "Financeiro",
  description: "Veja faturamento, valores pendentes e comissões por profissional.",
  category: "finance",
  route: "/admin/financial",
  steps: [
    {
      target: "financial-header",
      title: "Financeiro do salão",
      body: "Esta tela mostra os valores dos atendimentos do mês escolhido. Use como acompanhamento simples do salão, não como relatório contábil ou fiscal.",
    },
    {
      target: "financial-month",
      title: "Escolha o mês",
      body: "Use as setas para ver mês anterior ou próximo. Os números mudam conforme os atendimentos daquele período.",
    },
    {
      target: "financial-revenue",
      title: "Faturamento dos concluídos",
      body: "Aqui entra a soma dos atendimentos concluídos no mês, usando o valor final do agendamento.",
    },
    {
      target: "financial-appointments",
      title: "Agendamentos do período",
      body: "Este cartão conta todos os agendamentos do mês e mostra quantos já foram concluídos.",
    },
    {
      target: "financial-ticket",
      title: "Ticket médio",
      body: "É a média do valor final por atendimento concluído. Ajuda a entender se os clientes estão comprando serviços de maior ou menor valor.",
    },
    {
      target: "financial-net",
      title: "Valor após comissões",
      body: "O sistema chama de Lucro Líquido, mas aqui ele calcula receita dos atendimentos concluídos menos comissões dos profissionais.",
      tip: "Ele não desconta aluguel, produtos, taxas, impostos ou outras despesas do salão.",
    },
    {
      target: "financial-summary",
      title: "Pendências e cancelamentos",
      body: "Veja valores de atendimentos pendentes ou confirmados, total de comissões e quantos agendamentos foram cancelados.",
    },
    {
      target: "financial-commissions",
      title: "Comissões por profissional",
      body: "Cada profissional aparece com faturamento, quantidade de atendimentos e comissão calculada pela porcentagem cadastrada nele.",
      fallbackBody: "Quando houver atendimentos concluídos com profissional e comissão cadastrada, a lista mostra os valores de cada pessoa.",
    },
    {
      title: "Pronto!",
      body: "Use esta tela para conferência rápida. Para decisões do negócio, compare com seus custos reais fora do sistema.",
    },
  ],
};
