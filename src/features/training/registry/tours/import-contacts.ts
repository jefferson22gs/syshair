import type { TourDef } from "../../types";

export const importContactsTour: TourDef = {
  id: "import-contacts",
  version: 1,
  title: "Importar contatos",
  description: "Traga contatos para a lista de clientes usando arquivo, celular ou WhatsApp.",
  category: "clients",
  route: "/admin/import-contacts",
  steps: [
    {
      target: "import-contacts-header",
      title: "Importação de contatos",
      body: "Esta tela ajuda a trazer vários contatos de uma vez. Depois você confere a lista antes de gravar como clientes.",
    },
    {
      target: "import-contacts-vcf",
      title: "Arquivo VCF",
      body: "Use esta opção quando você exportou os contatos do celular. O arquivo normalmente termina com .vcf.",
    },
    {
      target: "import-contacts-phone",
      title: "Contatos do celular",
      body: "Em alguns celulares Android, o navegador permite escolher contatos direto da agenda. Se o navegador não aceitar, use o arquivo VCF.",
    },
    {
      target: "import-contacts-whatsapp",
      title: "WhatsApp",
      body: "Esta opção busca contatos de uma conexão Evolution configurada aqui. Use apenas se você souber esses dados de conexão.",
    },
    {
      target: "import-contacts-preview",
      title: "Conferência antes de importar",
      body: "Depois de carregar contatos, eles aparecem aqui para conferência. Desmarque quem não deve entrar na lista.",
      fallbackBody: "Quando você carregar contatos por algum método, a lista de conferência aparece aqui.",
    },
    {
      target: "import-contacts-save",
      title: "Importar selecionados",
      body: "Clique neste botão só quando a lista estiver certa. A partir daí, os contatos selecionados viram clientes.",
      fallbackBody: "Depois de carregar contatos, o botão de importar aparece abaixo da lista.",
    },
    {
      target: "import-contacts-results",
      title: "Resultado",
      body: "No final, a tela mostra quantos contatos entraram, quantos já existiam e quantos deram erro.",
      fallbackBody: "Após importar, o resultado aparece com números de importados, duplicados e erros.",
    },
    {
      title: "Pronto!",
      body: "Depois da importação, confira a tela Clientes. Ela é o lugar certo para ajustar nomes, telefones e observações.",
    },
  ],
};
