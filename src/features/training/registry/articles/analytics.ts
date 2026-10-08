import type { Article } from "../../types";

export const analyticsArticles: Article[] = [
  {
    id: "analytics-read-reports",
    version: 1,
    title: "Como ler os relatórios do salão",
    summary: "Use os relatórios para ver dias fortes, horários movimentados, serviços que vendem mais e cancelamentos.",
    category: "finance",
    difficulty: "fácil",
    minutes: 4,
    route: "/admin/analytics",
    tourId: "analytics",
    steps: [
      {
        text: "Abra Relatórios e escolha o período: 7 dias, 30 dias, 90 dias ou 1 ano. Todos os cartões e gráficos usam essa escolha.",
        image: { src: "/training/analytics/period.webp", alt: "Botões de período na tela de relatórios", pending: true },
      },
      { text: "Comece pelos cartões do topo. Eles mostram faturamento, agendamentos, ticket médio e novos clientes para o período escolhido." },
      {
        text: "Veja o gráfico por dia da semana para descobrir quais dias têm mais valor em atendimentos concluídos. Ele mostra faturamento, não quantidade de pessoas atendidas.",
        image: { src: "/training/analytics/by-day.webp", alt: "Gráfico de faturamento por dia da semana", pending: true },
      },
      { text: "Use o gráfico por horário para entender quando os clientes mais marcam. Isso ajuda a organizar profissionais e horários de pico." },
      {
        text: "Confira Top Serviços e Top Profissionais para ver o que mais vende e quem tem mais movimento no período.",
        image: { src: "/training/analytics/top-lists.webp", alt: "Listas de serviços e profissionais em destaque", pending: true },
      },
      { text: "Olhe a taxa de cancelamento. Se ela estiver alta, revise lembretes, confirmação de presença e regras de reagendamento." },
      { text: "Se aparecer mensagem pedindo configuração do salão, vá em Configurações, salve o salão e volte aos relatórios." },
    ],
    notes: [
      "Os relatórios dependem de agendamentos e atendimentos reais no sistema. Uma conta nova pode aparecer vazia.",
      "O faturamento do topo soma os valores dos agendamentos, inclusive pendentes e cancelados. Não é uma confirmação de dinheiro recebido. No Financeiro, o faturamento considera somente concluídos; por isso os valores podem diferir.",
      "O Ticket Médio desta tela divide a soma de todos os agendamentos pela quantidade de concluídos. Pode não representar a média real dos atendimentos realizados.",
      "O período começa na data indicada, mas o cálculo atual também pode incluir agendamentos futuros. O gráfico por horário inclui todas as situações de agendamento.",
      "O gráfico por dia e a lista de serviços usam atendimentos concluídos. A lista de profissionais pode repetir valores quando há várias avaliações para uma pessoa. Confira os registros antes de usar os totais.",
    ],
    keywords: ["relatório", "analytics", "gráfico", "faturamento", "dia", "horário", "movimento", "serviços", "profissionais", "cancelamento", "clientes", "salão"],
  },
];
