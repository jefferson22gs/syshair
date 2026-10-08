import type { TourDef } from "../../types";

export const packagesTour: TourDef = {
  id: "packages",
  version: 1,
  title: "Pacotes",
  description: "Monte combos com serviços, quantidade, desconto e validade.",
  category: "sales",
  route: "/admin/packages",
  steps: [
    {
      target: "packages-header",
      title: "Pacotes de serviços",
      body: "Aqui você cria combos com vários serviços. O cliente pode escolher o pacote no agendamento pelo link público.",
    },
    {
      target: "packages-new-button",
      mode: "waitForClick",
      title: "Criar pacote",
      body: "Clique em Novo Pacote para abrir o formulário. Nada é salvo até você clicar em Criar Pacote.",
    },
    {
      target: "packages-name",
      title: "Nome e descrição",
      body: "Dê um nome claro, como Combo Corte + Barba. A descrição ajuda a explicar o que está incluído.",
      fallbackBody: "No formulário, preencha o nome do pacote e, se quiser, uma descrição curta.",
    },
    {
      target: "packages-service",
      title: "Escolha os serviços",
      body: "Selecione um serviço ativo já cadastrado. Se não aparecer nada, cadastre serviços primeiro.",
      fallbackBody: "No formulário, a lista Serviço mostra os serviços ativos cadastrados no salão.",
    },
    {
      target: "packages-quantity",
      title: "Quantidade de sessões",
      body: "Informe quantas vezes aquele serviço entra no pacote. Depois use o botão de mais para adicionar à lista.",
      fallbackBody: "Escolha a quantidade e clique no botão de mais para colocar o serviço dentro do pacote.",
    },
    {
      target: "packages-items",
      title: "Serviços no pacote",
      body: "Aqui ficam os serviços adicionados, com preço e quantidade. Use o X para remover algum item antes de salvar.",
      fallbackBody: "Depois de adicionar serviços, eles aparecem em uma lista dentro do formulário.",
    },
    {
      target: "packages-discount",
      title: "Desconto do pacote",
      body: "Informe a porcentagem de desconto. O sistema calcula o preço final com base nos serviços adicionados.",
      fallbackBody: "No formulário, use Desconto (%) para definir o abatimento do pacote.",
    },
    {
      target: "packages-validity",
      title: "Validade em dias",
      body: "Este campo informa por quantos dias o pacote vale. Use um prazo que combine com sua regra comercial.",
      fallbackBody: "No formulário, Validade (dias) registra o prazo de uso mostrado ao cliente.",
    },
    {
      target: "packages-price-summary",
      title: "Resumo do preço",
      body: "Confira preço original, desconto, total de sessões e preço final antes de salvar.",
      fallbackBody: "Quando houver serviços no pacote, o resumo mostra o preço calculado automaticamente.",
    },
    {
      target: "packages-save",
      title: "Salvar pacote",
      body: "Com pelo menos um serviço adicionado, clique em Criar Pacote ou Salvar. O tour não faz isso por você.",
      fallbackBody: "Depois de montar o pacote, use Criar Pacote ou Salvar para gravar.",
    },
    {
      target: "packages-list",
      title: "Pacotes cadastrados",
      body: "A lista mostra serviços incluídos, preço, desconto e validade. Use o lápis para editar e a lixeira para excluir.",
      fallbackBody: "Depois do primeiro pacote, ele aparece em cartões com preço, desconto, validade, edição e exclusão.",
    },
    {
      title: "Pronto!",
      body: "Confira o link público para ver como o pacote aparece para o cliente antes de divulgar.",
    },
  ],
};
