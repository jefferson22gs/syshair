import type { Article } from "../../types";

export const professionalsArticles: Article[] = [
  {
    id: "professionals-register-team",
    version: 1,
    title: "Como cadastrar e consultar profissionais",
    summary: "Organize os dados de quem atende no salão, com contato, especialidade e comissão.",
    category: "team",
    difficulty: "fácil",
    minutes: 4,
    route: "/admin/professionals",
    tourId: "professionals",
    steps: [
      {
        text: "Depois de salvar o salão em Configurações, abra Profissionais. Se a lista estiver vazia, você pode usar Ver como funciona para conhecer a tela sem cadastrar ninguém.",
        image: { src: "/training/professionals/list.webp", alt: "Lista de profissionais com opções de editar e excluir", pending: false },
      },
      {
        text: "Clique em Novo Profissional. O formulário abre sem salvar nada; informe o nome de quem atende, que é o campo obrigatório.",
        image: { src: "/training/professionals/new-dialog.webp", alt: "Formulário com nome, contatos, especialidade e comissão", pending: false },
      },
      { text: "Preencha e-mail e telefone se desejar guardar os contatos. Informe a especialidade em texto livre, como cortes modernos ou barba." },
      { text: "Em Comissão (%), informe a porcentagem combinada com o profissional. Confira o valor entre 0 e 100; cadastrar a taxa não faz um pagamento." },
      { text: "Clique em Adicionar quando quiser salvar o cadastro. Se estiver somente conhecendo os campos, clique em Cancelar. Após salvar, o profissional aparece na lista." },
      { text: "Para atualizar os dados, clique no lápis do cartão, altere os campos e use Salvar. O cartão também exibe a situação Ativo ou Inativo, mas esta tela não oferece um botão para mudar essa situação." },
      { text: "A lixeira pede confirmação antes de excluir o registro. Use apenas se realmente quiser removê-lo; não há botão de desfazer nesta tela." },
      { text: "Depois de cadastrar a equipe, confira serviços e horários do salão. Abra o link público para verificar os profissionais disponíveis aos clientes." },
    ],
    notes: [
      "Não existem campos para dias, horários ou vínculo de serviços nesta tela. Especialidade é apenas uma descrição; não seleciona serviços.",
      "O cadastro de contato não envia convite nem cria senha de acesso. Ativo ou Inativo é somente uma indicação no cartão.",
      "Comissão é uma taxa cadastrada. Esta tela não calcula nem paga o valor devido ao profissional.",
    ],
    keywords: ["profissional", "equipe", "funcionário", "cabeleireiro", "barbeiro", "comissão", "especialidade", "telefone", "ativo", "inativo", "editar", "excluir"],
  },
];
