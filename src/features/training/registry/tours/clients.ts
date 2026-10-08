import type { TourDef } from "../../types";

export const clientsTour: TourDef = {
  id: "clients",
  version: 1,
  title: "Clientes",
  description: "Cadastre clientes, encontre contatos e acompanhe visitas e gastos.",
  category: "clients",
  route: "/admin/clients",
  steps: [
    {
      target: "clients-header",
      title: "Base de clientes",
      body: "Aqui ficam os contatos das pessoas que já compraram ou podem voltar ao salão. Uma lista organizada ajuda no atendimento e nas campanhas.",
    },
    {
      target: "clients-new-button",
      title: "Cadastrar cliente",
      body: "Use \"Novo Cliente\" para abrir o formulário. Informe o nome e, quando tiver, telefone, e-mail e observações. Nada é salvo até clicar em Adicionar.",
    },
    {
      target: "clients-search",
      title: "Buscar rápido",
      body: "Digite nome, e-mail ou telefone para encontrar um cliente sem procurar cartão por cartão.",
    },
    {
      target: "clients-list",
      title: "Cartões de clientes",
      body: "Cada cartão mostra contato, visitas, gastos e observações. Os botões servem para editar ou excluir.",
      fallbackBody: "Depois do primeiro cadastro, os clientes aparecem aqui em cartões.",
    },
    {
      target: "clients-export",
      title: "Exportar contatos",
      body: "Este botão leva para a tela de exportação. Ela serve para baixar sua lista em arquivo.",
    },
    {
      title: "Pronto!",
      body: "Mantenha os dados atualizados. Com telefone certo, fica mais fácil confirmar horários e fazer campanhas.",
    },
  ],
};
