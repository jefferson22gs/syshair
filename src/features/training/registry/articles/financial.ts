import type { Article } from "../../types";

export const financialArticles: Article[] = [
  {
    id: "financial-understand-month",
    version: 1,
    title: "Como entender o financeiro do mês",
    summary: "Veja faturamento, pendências, ticket médio e comissões sem confundir com contabilidade completa.",
    category: "finance",
    difficulty: "fácil",
    minutes: 4,
    route: "/admin/financial",
    tourId: "financial",
    steps: [
      {
        text: "Abra Financeiro e escolha o mês nas setas. A tela carrega atendimentos daquele mês e separa concluídos, pendentes, confirmados e cancelados.",
        image: { src: "/training/financial/month-selector.webp", alt: "Tela Financeiro com seletor de mês", pending: true },
      },
      {
        text: "Faturamento Total soma os atendimentos concluídos pelo valor final. Pendente soma atendimentos pendentes ou confirmados que ainda não contam como concluídos.",
        image: { src: "/training/financial/summary-cards.webp", alt: "Cartões de faturamento, pendente, comissões e cancelamentos", pending: true },
      },
      { text: "Ticket Médio mostra a média do valor final por atendimento concluído. Se ele cair, revise preços, combos e serviços mais vendidos." },
      { text: "Total de Agendamentos mostra o movimento geral do mês. O número de concluídos ajuda a separar agenda marcada de atendimento realizado." },
      {
        text: "Comissões por Profissional usa a porcentagem cadastrada no profissional e o valor final dos atendimentos concluídos.",
        image: { src: "/training/financial/commissions.webp", alt: "Lista de comissões por profissional", pending: true },
      },
      { text: "Use esses números para conferência rápida do salão. Para fechamento oficial, compare com despesas, taxas e controles externos." },
    ],
    notes: [
      "O cartão chamado Lucro Líquido calcula receita de atendimentos concluídos menos comissões. Ele não desconta aluguel, produtos, taxas, impostos ou outras despesas.",
      "Esta tela não emite relatório fiscal nem substitui contabilidade. Marcar um atendimento como concluído não comprova que houve pagamento.",
    ],
    keywords: ["financeiro", "faturamento", "receita", "lucro", "comissão", "comissões", "pendente", "ticket médio", "cancelamento", "mês", "dinheiro"],
  },
];
