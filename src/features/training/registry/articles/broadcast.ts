import type { Article } from "../../types";

export const broadcastArticles: Article[] = [
  {
    id: "broadcast-send-responsibly",
    version: 1,
    title: "Como enviar mensagens em massa com responsabilidade",
    summary: "Selecione clientes autorizados, escreva a mensagem e acompanhe o envio sem arriscar o número.",
    category: "marketing",
    difficulty: "médio",
    minutes: 6,
    route: "/admin/broadcast",
    tourId: "broadcast",
    steps: [
      {
        text: "Abra Disparador de Mensagens. Ele só funciona se o WhatsApp estiver conectado; caso contrário, a tela orienta a ir para a conexão.",
        image: { src: "/training/broadcast/main.webp", alt: "Disparador de Mensagens com contatos, mensagem e histórico", pending: true },
      },
      { text: "Envie somente para clientes ou pessoas que autorizaram receber mensagens. Disparo para desconhecidos pode gerar denúncias e bloqueio do número." },
      { text: "Clique em carregar contatos para buscar clientes cadastrados com telefone. Você também pode adicionar números manualmente, sempre com código do país." },
      { text: "Use busca, seleção individual ou lote para escolher os destinatários. Revise a seleção antes de enviar." },
      {
        text: "Escreva a mensagem ou carregue um template. Seja claro, diga o nome do salão e evite excesso de emojis, letras maiúsculas e promessas exageradas.",
        image: { src: "/training/broadcast/message.webp", alt: "Campo de mensagem e templates do Disparador", pending: true },
      },
      { text: "O campo permite a variável {nome}, mas o worker atual envia item.message diretamente e não substitui o nome. Evite depender dessa personalização até ser corrigida." },
      { text: "Não há agendamento de data e hora nesta tela. Quando você confirma o envio, a campanha entra na fila imediatamente; para enviar mais tarde, volte no horário desejado." },
      { text: "Quando for enviar, confira quantidade, texto e público. O tour não clica no botão de envio por você." },
      {
        text: "Acompanhe o Histórico de Disparos para ver enviados, falhas e total. Use Ver Detalhes para conferir cada número com erro.",
        image: { src: "/training/broadcast/history.webp", alt: "Histórico e detalhes de disparo de mensagens", pending: true },
      },
    ],
    notes: [
      "O Disparador grava broadcasts e broadcast_queue ao iniciar envio; o worker processa a fila e registra broadcast_messages.",
      "A tela lê e atualiza estatísticas e histórico ao abrir, quando há salão, e faz polling de broadcasts ativos. Não grava no banco ao abrir; grava ao salvar template, parar disparo ou iniciar envio.",
      "Há limite diário de 5000 mensagens calculado na tela e também na função de criação do disparo.",
    ],
    keywords: ["disparador", "campanha", "marketing", "mensagem", "whatsapp", "clientes", "contatos", "template", "envio em massa", "bloqueio", "spam"],
  },
];
