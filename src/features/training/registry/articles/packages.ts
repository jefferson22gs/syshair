import type { Article } from "../../types";

export const packagesArticles: Article[] = [
  {
    id: "packages-create-combo",
    version: 1,
    title: "Como criar um pacote de serviços",
    summary: "Junte serviços em um combo, escolha quantidades e deixe o sistema calcular o preço com desconto.",
    category: "sales",
    difficulty: "fácil",
    minutes: 5,
    route: "/admin/packages",
    tourId: "packages",
    steps: [
      { text: "Cadastre os serviços que entrarão no pacote. A lista de escolha usa os serviços ativos do salão. Depois abra Pacotes e clique em Novo Pacote." },
      {
        text: "Dê um nome claro ao combo, como 5 Cortes + 5 Barbas. A descrição é opcional.",
        image: { src: "/training/packages/new-dialog.webp", alt: "Formulário de novo pacote", pending: true },
      },
      { text: "Escolha um serviço, informe a quantidade de sessões e clique no botão de mais. Repita para cada serviço que deseja incluir." },
      { text: "Revise a lista de serviços. Se adicionou algo errado, use o X para remover antes de salvar." },
      { text: "Informe o desconto em porcentagem, entre 0 e 50. O sistema calcula o preço final usando os preços atuais dos serviços." },
      { text: "Defina a validade em dias. O formulário exige pelo menos 30 dias." },
      {
        text: "Confira o resumo: preço original, desconto, total de sessões e preço final. Clique em Criar Pacote somente quando estiver correto.",
        image: { src: "/training/packages/price-summary.webp", alt: "Resumo de preço do pacote", pending: true },
      },
      {
        text: "O pacote aparece na lista e no link público. Use o lápis para editar ou a lixeira para excluir com confirmação.",
        image: { src: "/training/packages/list.webp", alt: "Lista de pacotes cadastrados", pending: true },
      },
    ],
    notes: [
      "A tela grava o preço calculado no momento da criação ou edição. Mudanças posteriores no preço dos serviços não recalculam automaticamente pacotes já salvos.",
      "O prazo de validade é mostrado ao cliente, mas o fluxo encontrado não cria um controle individual de sessões consumidas ou data de expiração por comprador.",
    ],
    keywords: ["pacote", "combo", "serviços", "sessões", "quantidade", "desconto", "validade", "preço", "promoção", "editar", "excluir"],
  },
];
