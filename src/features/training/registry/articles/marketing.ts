import type { Article } from "../../types";

export const marketingArticles: Article[] = [
  {
    id: "marketing-compose-send", version: 1, title: "Como preparar e enviar uma mensagem aos clientes",
    summary: "Revise texto, oferta, destinatários e canal antes de um envio real.",
    category: "marketing", difficulty: "médio", minutes: 5, route: "/admin/marketing", tourId: "marketing",
    steps: [
      { text: "Abra Marketing & Notificações. Escolha Promoção, Informativo ou Cupom; o tipo muda os modelos rápidos, não cria promoção nem desconto automaticamente.", image: { src: "/training/marketing/composer.webp", alt: "Composição com tipos de mensagem e modelos rápidos", pending: true } },
      { text: "Use um modelo ou escreva a mensagem, com até 1.000 caracteres. Revise todas as ofertas: o exemplo CLIENTE10 precisa existir na tela Cupons para ser aceito. O título é opcional e serve ao push." },
      { text: "Use {nome} uma vez para personalizar o WhatsApp com o primeiro nome. No push ele será substituído por Cliente, não pelo nome de cada pessoa." },
      { text: "Se desejar, Melhorar com IA solicita uma nova versão e troca o texto. Revise o resultado. Salvar Template abre um formulário para nomear e gravar o modelo; clicar em um modelo salvo preenche a mensagem novamente." },
      { text: "Marque os destinatários. Selecionar todos com telefone inclui os clientes carregados que têm telefone; escolha um grupo pequeno para um teste autorizado.", image: { src: "/training/marketing/clients-channels.webp", alt: "Seleção de clientes e canais de envio", pending: true } },
      { text: "Escolha WhatsApp e/ou Push. Revise texto e destinatários antes de Enviar: o clique dispara o envio sem outra confirmação. Confira as mensagens de sucesso e falhas, sem presumir que o cliente leu." },
    ],
    notes: ["WhatsApp automático depende de conexão. Sem conexão, abre links de conversas para envio manual; o navegador pode bloquear várias janelas.", "Push depende de navegador compatível, configuração do serviço e dispositivos inscritos com permissão. Clientes sem telefone ficam desabilitados nesta seleção, mesmo para push.", "Melhorar com IA precisa de configuração disponível; pode falhar e não envia mensagem por si só.", "A lixeira de modelo exclui diretamente, sem confirmação. A tela não mantém um histórico visível dos envios; retorno de envio não comprova leitura ou entrega ao cliente."],
    keywords: ["marketing", "mensagem", "zap", "WhatsApp", "promoção", "cupom", "informativo", "template", "modelo", "IA", "notificação", "enviar"],
  },
];
