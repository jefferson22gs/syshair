import type { Article } from "../../types";

export const servicesArticles: Article[] = [
  {
    id: "services-register-first-service",
    version: 1,
    title: "Como cadastrar seu primeiro serviço",
    summary: "Cadastre o que o salão oferece com nome, preço e duração do atendimento.",
    category: "start",
    difficulty: "fácil",
    minutes: 3,
    route: "/admin/services",
    tourId: "services",
    steps: [
      {
        text: "Salve o salão em Configurações e abra Serviços. Esta lista reúne os serviços oferecidos; se estiver vazia, Ver como funciona inicia uma explicação guiada.",
        image: { src: "/training/services/list.webp", alt: "Lista de serviços com preço, duração e botão Novo Serviço", pending: false },
      },
      {
        text: "Clique em Novo Serviço para abrir o formulário. Escolha um ícone e escreva o nome que seus clientes conhecem, como Corte Masculino ou Escova.",
        image: { src: "/training/services/new-dialog.webp", alt: "Formulário de serviço com ícone, nome, descrição, preço e duração", pending: false },
      },
      { text: "Use Descrição se quiser explicar o que está incluído no serviço. O campo é opcional." },
      { text: "Informe o preço em reais, maior que zero. Preencha a duração em minutos com o tempo necessário para o atendimento, incluindo o preparo quando fizer parte do serviço." },
      { text: "Quando os dados estiverem corretos, clique em Adicionar. Para sair sem cadastrar, clique em Cancelar. Um cadastro salvo aparece na lista com preço e duração." },
      { text: "Para alterar um serviço, clique no lápis do cartão e depois em Salvar. A lixeira solicita confirmação antes de excluir; só confirme se realmente quiser remover o serviço." },
      { text: "Depois dos serviços, cadastre os profissionais do salão. Confira também os horários e abra o link público antes de divulgar aos clientes." },
    ],
    notes: [
      "O formulário exige nome e preço maior que zero. A duração é informada em minutos; o campo sugere mínimo de 5 e intervalos de 5 minutos.",
      "Esta tela não oferece botão para ativar ou desativar serviço nem campo para vincular profissionais. Não há botão de desfazer uma exclusão.",
    ],
    keywords: ["serviço", "corte", "barba", "escova", "preço", "valor", "duração", "tempo", "minutos", "cadastrar", "editar", "excluir"],
  },
];
