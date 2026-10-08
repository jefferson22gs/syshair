import type { TourDef } from "../../types";

export const productsTour: TourDef = {
  id: "products",
  version: 1,
  title: "Produtos",
  description: "Cadastre produtos com nome, preço, estoque, categoria e imagem.",
  category: "sales",
  route: "/admin/products",
  steps: [
    {
      target: "products-header",
      title: "Produtos do salão",
      body: "Aqui você cadastra produtos para aparecerem no link público do salão. Pelo código atual, a tela funciona como catálogo com estoque informado.",
    },
    {
      target: "products-new-button",
      mode: "waitForClick",
      title: "Cadastrar produto",
      body: "Clique em Novo Produto para abrir o formulário. Nada é salvo até você clicar em Criar Produto.",
    },
    {
      target: "products-name",
      title: "Nome do produto",
      body: "Use o nome que o cliente reconhece, como Shampoo Profissional ou Pomada Modeladora.",
      fallbackBody: "No formulário, informe o nome do produto.",
    },
    {
      target: "products-price",
      title: "Preço",
      body: "Informe o valor de venda em reais. Este preço aparece para o cliente no link público.",
      fallbackBody: "No formulário, preencha o preço do produto em reais.",
    },
    {
      target: "products-stock",
      title: "Estoque informado",
      body: "Digite a quantidade disponível. Produtos com estoque maior que zero aparecem para o cliente.",
      tip: "O código encontrado não baixa o estoque automaticamente quando o cliente agenda com produto.",
      fallbackBody: "No formulário, preencha a quantidade em estoque.",
    },
    {
      target: "products-category",
      title: "Categoria",
      body: "Use categoria para organizar produtos, como Cabelo, Barba ou Cuidados. O campo é opcional.",
      fallbackBody: "No formulário, a categoria ajuda a identificar o tipo de produto.",
    },
    {
      target: "products-image",
      title: "Imagem do produto",
      body: "Cole uma URL de imagem se quiser mostrar foto. Se deixar vazio, aparece um ícone padrão.",
      fallbackBody: "No formulário, URL da Imagem é opcional.",
    },
    {
      target: "products-save",
      title: "Salvar produto",
      body: "Quando terminar, clique em Criar Produto ou Salvar. O tour não faz isso por você.",
      fallbackBody: "Depois de preencher, use Criar Produto ou Salvar para gravar.",
    },
    {
      target: "products-list",
      title: "Lista de produtos",
      body: "Cada cartão mostra foto ou ícone, nome, categoria, preço e situação do estoque. Use o lápis para editar e a lixeira para excluir.",
      fallbackBody: "Depois do primeiro cadastro, seus produtos aparecem em cartões com preço, estoque, edição e exclusão.",
    },
    {
      title: "Pronto!",
      body: "Revise o link público para confirmar como os produtos aparecem para o cliente.",
    },
  ],
};
