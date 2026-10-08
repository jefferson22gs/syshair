import type { TourDef } from "../../types";

export const analyticsTour: TourDef = {
  id: "analytics",
  version: 1,
  title: "Relatórios",
  description: "Entenda dias movimentados, horários fortes e serviços que mais vendem.",
  category: "finance",
  route: "/admin/analytics",
  steps: [
    {
      target: "analytics-header",
      title: "Relatórios do salão",
      body: "Aqui você consulta valores, horários de agendamento e serviços com mais resultado. Use como apoio para organizar o salão, conferindo as limitações dos cálculos.",
      fallbackBody: "Esta tela reúne relatórios do salão. Se aparecer uma mensagem pedindo configuração, cadastre seu salão em Configurações para ver os relatórios.",
    },
    {
      target: "analytics-period",
      title: "Período analisado",
      body: "Escolha se quer olhar os últimos 7 dias, 30 dias, 90 dias ou 1 ano. Os cartões e gráficos usam esse período.",
    },
    {
      target: "analytics-kpis",
      title: "Resumo rápido",
      body: "Veja valores dos agendamentos e novos clientes. O faturamento inclui pendentes e cancelados; o ticket médio também pode ficar distorcido, então confira os atendimentos antes de decidir.",
    },
    {
      target: "analytics-suggestions",
      title: "Sugestões automáticas",
      body: "Quando há dados suficientes, o sistema mostra ideias simples, como criar promoção em dia fraco ou destacar um profissional bem avaliado.",
      fallbackBody: "As sugestões aparecem quando o sistema encontra algo útil nos seus dados, como cancelamentos altos ou um dia com menos faturamento.",
    },
    {
      target: "analytics-by-day",
      title: "Dias mais movimentados",
      body: "Este gráfico mostra valores dos atendimentos concluídos por dia da semana. Ele ajuda a ver dias fortes em faturamento, não a contar todo o movimento do salão.",
      fallbackBody: "Quando houver atendimentos concluídos, este gráfico mostra o faturamento por dia da semana.",
    },
    {
      target: "analytics-by-hour",
      title: "Horários com mais agendamentos",
      body: "Aqui você vê em quais horários os clientes mais marcam. Isso ajuda a ajustar escala e horários de atendimento.",
      fallbackBody: "Quando houver agendamentos, este gráfico mostra os horários mais usados pelos clientes.",
    },
    {
      target: "analytics-top-services",
      title: "Serviços que mais vendem",
      body: "Esta lista mostra até cinco serviços ordenados pelo valor dos atendimentos concluídos. Confira também a quantidade: maior faturamento não significa maior número de atendimentos.",
      fallbackBody: "Quando houver serviços concluídos, a lista mostra os serviços com melhor resultado.",
    },
    {
      target: "analytics-top-professionals",
      title: "Profissionais com mais movimento",
      body: "A lista destaca profissionais pelo valor dos concluídos, com quantidade e nota quando disponível. Várias avaliações podem repetir valores no cálculo atual; confira a agenda antes de comparar pessoas.",
      fallbackBody: "Quando houver atendimentos concluídos por profissional, a lista mostra os destaques do período.",
    },
    {
      target: "analytics-cancellations",
      title: "Cancelamentos",
      body: "Acompanhe a porcentagem de cancelamentos. Se ficar alta, vale revisar lembretes, confirmação e regras de horário.",
    },
    {
      title: "Pronto!",
      body: "Volte aqui depois de alguns dias de uso. Quanto mais agendamentos reais, mais úteis ficam os relatórios.",
    },
  ],
};
