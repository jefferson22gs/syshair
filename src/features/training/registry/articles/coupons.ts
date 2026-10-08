import type { Article } from "../../types";

export const couponsArticles: Article[] = [
  {
    id: "coupons-create-discount",
    version: 1,
    title: "Como criar e controlar um cupom",
    summary: "Crie um código de desconto, defina regras e acompanhe se ele está ativo ou vencido.",
    category: "sales",
    difficulty: "fácil",
    minutes: 4,
    route: "/admin/coupons",
    tourId: "coupons",
    steps: [
      {
        text: "Abra Cupons e clique em Novo Cupom. Escreva um código fácil de lembrar e divulgar, como PRIMEIRA10.",
        image: { src: "/training/coupons/new-dialog.webp", alt: "Formulário para criar cupom", pending: true },
      },
      { text: "Escolha Porcentagem para desconto como 10%, ou Valor fixo para desconto em reais. Informe um valor maior que zero." },
      { text: "Se quiser, coloque Compra mínima. Assim o código só funciona quando o pedido atinge aquele valor." },
      { text: "Use Limite de usos para encerrar a campanha depois de certa quantidade. Sem limite, o cupom pode continuar enquanto estiver ativo e dentro da validade." },
      { text: "Defina Válido até para encerrar o cupom em uma data. Também existe a opção Apenas novos clientes." },
      { text: "Clique em Criar para salvar. O cupom aparece na lista com código, desconto, validade e quantidade de usos." },
      {
        text: "Use a chave no cartão para ativar ou desativar. O lápis abre a edição; a lixeira pede confirmação antes de excluir.",
        image: { src: "/training/coupons/list.webp", alt: "Lista de cupons com status e ações", pending: true },
      },
      {
        text: "O cliente digita o código no agendamento público. Teste com um pedido fictício antes de divulgar.",
        image: { src: "/training/coupons/public-use.webp", alt: "Campo de cupom no agendamento público", pending: true },
      },
    ],
    notes: [
      "O sistema valida código ativo, validade, limite de usos e compra mínima no fluxo de agendamento.",
      "A opção Apenas novos clientes é gravada no cupom, mas a validação encontrada no fluxo público não verifica essa regra. Não divulgue essa restrição como garantida até a lógica ser concluída.",
    ],
    keywords: ["cupom", "desconto", "código", "porcentagem", "valor", "validade", "limite", "uso", "ativar", "desativar", "promoção", "cliente novo"],
  },
];
