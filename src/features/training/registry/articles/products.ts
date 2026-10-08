import type { Article } from "../../types";

export const productsArticles: Article[] = [
  {
    id: "products-build-catalog",
    version: 1,
    title: "Como montar o catálogo de produtos",
    summary: "Cadastre produtos com preço, estoque informado, categoria e foto para aparecerem no link público.",
    category: "sales",
    difficulty: "fácil",
    minutes: 4,
    route: "/admin/products",
    tourId: "products",
    steps: [
      {
        text: "Abra Produtos e clique em Novo Produto. Escreva o nome que o cliente conhece e uma descrição curta se precisar.",
        image: { src: "/training/products/new-dialog.webp", alt: "Formulário de novo produto", pending: true },
      },
      { text: "Informe o preço de venda em reais e a quantidade disponível em Estoque. Os dois campos são obrigatórios." },
      { text: "Use Categoria para organizar, por exemplo Cabelo, Barba ou Cuidados. Este campo é opcional." },
      { text: "Em URL da Imagem, cole um endereço de foto acessível na internet. Se deixar vazio, a tela usa um ícone padrão." },
      { text: "Clique em Criar Produto para salvar. Para sair sem cadastrar, clique em Cancelar." },
      {
        text: "Na lista, cada cartão mostra foto, nome, categoria, preço e quantidade informada. Use o lápis para editar e a lixeira para excluir.",
        image: { src: "/training/products/list.webp", alt: "Catálogo de produtos com preço e estoque", pending: true },
      },
      {
        text: "Produtos ativos com estoque maior que zero podem aparecer na Loja do link público e ser adicionados ao pedido do agendamento.",
        image: { src: "/training/products/public-store.webp", alt: "Produtos na aba Loja do agendamento público", pending: true },
      },
      { text: "Confira a quantidade manualmente e ajuste o cadastro quando houver entrada ou saída de produto." },
    ],
    notes: [
      "A tela tem campo de estoque e o link público oculta produtos sem estoque, mas o fluxo encontrado não reduz a quantidade automaticamente quando um cliente inclui produto no agendamento.",
      "Existe estrutura de vendas de produtos no banco, mas esta tela não registra venda, pagamento, custo, fornecedor nem movimentação de estoque. Trate-a como catálogo com quantidade informada manualmente.",
    ],
    keywords: ["produto", "catálogo", "loja", "estoque", "preço", "categoria", "foto", "imagem", "shampoo", "pomada", "venda", "editar", "excluir"],
  },
];
