import type { Article } from "../../types";

export const multiUnitsArticles: Article[] = [
  {
    id: "multi-units-group-summary", version: 1, title: "Como criar um grupo e consultar unidades vinculadas",
    summary: "Conheça a criação de grupo e o resumo consolidado limitado desta tela.",
    category: "advanced", difficulty: "avançado", minutes: 4, route: "/admin/multi-units", tourId: "multi-units",
    steps: [
      { text: "Abra Multi-Unidades. Sem grupo, a tela procura seu salão e pode mostrar seus números zerados, sem calcular resultados." },
      { text: "Se ainda não tiver grupo e quiser criar um, clique em Criar Grupo. Informe o nome; apenas abrir o formulário não salva.", image: { src: "/training/multi-units/create-group.webp", alt: "Formulário de criação de grupo de salões", pending: true } },
      { text: "O botão Criar Grupo dentro do formulário grava o grupo e tenta vincular o salão existente, marcando-o como franquia. A tela não oferece exclusão de grupo nem desfazer." },
      { text: "Com grupo existente, consulte totais e cartões das unidades já vinculadas. Faturamento soma final_price de atendimentos concluídos criados desde o início do mês; agendamentos conta esses mesmos atendimentos. Clientes soma todos os cadastros de cada unidade.", image: { src: "/training/multi-units/summary.webp", alt: "Resumo consolidado e unidades de um grupo", pending: true } },
      { text: "Se precisar de outras unidades, peça orientação ao suporte. Não há botão para criar ou vincular outra unidade nesta tela." },
    ],
    notes: ["O resumo consolidado existe, mas o recurso é limitado: não cadastra nem vincula novas unidades e não oferece relatório comparativo detalhado ou filtro de período.", "O período dos atendimentos é a data de criação do registro, não a data do atendimento; totais de clientes não eliminam cadastros repetidos entre unidades.", "A tentativa de vínculo após criar o grupo não verifica seu erro antes da mensagem de sucesso. Confira se o salão aparece no grupo."],
    keywords: ["multi unidades", "filial", "franquia", "grupo", "rede", "salão", "faturamento", "consolidado"],
  },
];
