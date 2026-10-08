import type { TourDef } from "../../types";

export const professionalsTour: TourDef = {
  id: "professionals",
  version: 1,
  title: "Profissionais do salão",
  description: "Cadastre quem atende, com contato, especialidade e comissão.",
  category: "team",
  route: "/admin/professionals",
  steps: [
    {
      target: "professionals-header",
      title: "Sua equipe",
      body: "Aqui ficam os profissionais do salão. Você pode cadastrar, consultar, editar e excluir os registros.",
      fallbackBody: "Crie seu salão em Configurações primeiro. Depois, esta tela permite cadastrar e consultar os profissionais da equipe.",
    },
    {
      target: "professionals-new-button",
      mode: "waitForClick",
      title: "Novo profissional",
      body: "Clique em Novo Profissional para conhecer os campos. Abrir o formulário não cadastra ninguém.",
      fallbackBody: "Depois de configurar o salão, use Novo Profissional para abrir o formulário de cadastro.",
    },
    {
      target: "professionals-name",
      title: "Nome de quem atende",
      body: "Preencha o nome do profissional. Este é o único campo obrigatório do formulário.",
      fallbackBody: "No formulário Novo Profissional, informe o nome de quem vai atender no salão.",
    },
    {
      target: "professionals-email",
      title: "E-mail de contato",
      body: "Você pode informar o e-mail do profissional. Este cadastro não tem uma ação de convite nem cria uma senha de acesso.",
      fallbackBody: "O formulário permite guardar o e-mail como contato. Não há envio de convite nessa tela.",
    },
    {
      target: "professionals-phone",
      title: "Telefone",
      body: "Informe um número de contato se desejar. O campo é opcional e pode ser atualizado depois.",
      fallbackBody: "No formulário, o campo Telefone permite guardar o contato do profissional.",
    },
    {
      target: "professionals-specialty",
      title: "Especialidade",
      body: "Descreva a especialidade, como cortes modernos ou barba. Este é um texto livre, não uma seleção de serviços vinculados.",
      fallbackBody: "O formulário tem um campo de texto para Especialidade. Ele não vincula serviços ao profissional.",
    },
    {
      target: "professionals-commission",
      title: "Comissão em porcentagem",
      body: "Informe a porcentagem de comissão combinada com o profissional. O campo mostra limites de 0 a 100; confira o número antes de salvar.",
      tip: "Este formulário guarda a taxa. Ele não faz um pagamento ao profissional.",
      fallbackBody: "No formulário, Comissão (%) guarda a porcentagem acordada, sem efetuar pagamentos.",
    },
    {
      target: "professionals-save",
      title: "Adicionar ou salvar",
      body: "Quando quiser cadastrar, clique em Adicionar. Ao editar, o botão se chama Salvar; se estiver só conhecendo, use Cancelar.",
      fallbackBody: "Ao terminar o formulário, clique em Adicionar para criar o registro ou em Salvar para atualizar um profissional existente.",
    },
    {
      target: "professionals-list",
      title: "Consultar e editar a equipe",
      body: "Os cartões mostram contato, especialidade e comissão. O lápis abre o formulário para editar; a lixeira pede confirmação antes de excluir.",
      fallbackBody: "Depois do primeiro cadastro, os profissionais aparecem em cartões com opções de editar e excluir.",
    },
    {
      target: "professionals-status",
      title: "Ativo ou inativo",
      body: "O cartão mostra a situação do profissional. Esta tela não oferece um botão para ativar ou desativar, nem campos de dias, horários ou vínculo de serviços.",
      fallbackBody: "Depois do cadastro, o cartão exibe Ativo ou Inativo. Não existe um controle para mudar essa situação nesta tela.",
    },
    {
      title: "Próximo passo",
      body: "Confira também os serviços e horários do salão. Depois abra o link público para verificar o que seus clientes encontram ao agendar.",
    },
  ],
};
