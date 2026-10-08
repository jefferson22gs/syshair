import type { TourDef } from "../../types";

export const broadcastTour: TourDef = {
  id: "broadcast",
  version: 1,
  title: "Disparador de mensagens",
  description: "Envie campanhas de WhatsApp para clientes autorizados e acompanhe o envio.",
  category: "marketing",
  route: "/admin/broadcast",
  steps: [
    {
      target: "broadcast-disconnected",
      title: "WhatsApp conectado primeiro",
      body: "O Disparador só funciona com WhatsApp conectado. Se esta tela aparecer, clique em Conectar WhatsApp quando quiser ir para a tela certa de conexão.",
      fallbackBody: "Se o WhatsApp já está conectado, você verá os contatos, a mensagem e o histórico de disparos.",
    },
    {
      target: "broadcast-header",
      title: "Disparador de Mensagens",
      body: "Use esta tela para enviar uma mensagem para vários clientes. Envie só para quem é cliente ou autorizou receber mensagens, para evitar reclamações e bloqueio do número.",
      fallbackBody: "Com o WhatsApp conectado, esta área mostra o disparador e o limite diário de mensagens.",
    },
    {
      target: "broadcast-load-contacts",
      title: "Carregar clientes",
      body: "Clique em carregar para buscar os clientes cadastrados com telefone. Confira a lista antes de marcar todo mundo.",
      fallbackBody: "Se a lista estiver vazia, use Carregar Contatos. Também é possível adicionar números manualmente.",
    },
    {
      target: "broadcast-search",
      title: "Filtrar destinatários",
      body: "Use a busca para encontrar clientes por nome ou telefone. Isso evita mandar uma campanha para a pessoa errada.",
      fallbackBody: "Quando os contatos forem carregados, use a busca para filtrar quem deve receber.",
    },
    {
      target: "broadcast-contact-list",
      title: "Selecionar quem recebe",
      body: "Marque somente os destinatários certos. Evite usar Todos para mensagens sensíveis, promoções segmentadas ou clientes que não pediram contato.",
      fallbackBody: "A lista de contatos aparece depois de carregar. Se não houver contatos, cadastre clientes com telefone ou adicione números manualmente.",
    },
    {
      target: "broadcast-template",
      title: "Usar um modelo",
      body: "Modelos ajudam a repetir mensagens aprovadas. Revise o texto mesmo quando usar um template antigo.",
      fallbackBody: "A seleção de template fica acima do campo da mensagem.",
    },
    {
      target: "broadcast-message",
      title: "Escrever a mensagem",
      body: "Escreva curto, claro e com identificação do salão. Não use {nome}: apesar da sugestão no campo, o envio atual manda essa expressão como texto, sem trocar pelo nome do cliente.",
      fallbackBody: "Conecte primeiro o WhatsApp para ver o campo de mensagem. Escreva um texto completo, sem depender da expressão {nome}.",
    },
    {
      title: "Envio imediato",
      body: "Esta tela não tem campo para agendar data e hora: ao confirmar no botão de envio, o disparo entra na fila imediatamente. Para enviar mais tarde, volte à tela no horário planejado.",
    },
    {
      target: "broadcast-send",
      title: "Enviar com responsabilidade",
      body: "Quando quiser disparar, revise destinatários e mensagem antes de clicar. O tour não envia por você; envio em massa pode gerar bloqueio se houver mensagens indesejadas ou reclamações.",
      fallbackBody: "O botão de envio aparece com o WhatsApp conectado e exige destinatários e mensagem. O tour não inicia um disparo.",
    },
    {
      target: "broadcast-history",
      title: "Acompanhar o disparo",
      body: "O histórico mostra os cinco disparos mais recentes, com enviados, falhas e total. Durante o envio, pode aparecer Parar, mas isso não desfaz mensagens já enviadas.",
      fallbackBody: "Depois do primeiro disparo, o histórico aparece nesta lateral com o andamento.",
    },
    {
      target: "broadcast-details-button",
      title: "Ver detalhes",
      body: "Use Ver Detalhes para conferir cada destinatário e identificar falhas. Isso ajuda a corrigir telefones inválidos antes do próximo disparo.",
      fallbackBody: "Quando houver histórico, cada disparo pode abrir uma tela de detalhes.",
    },
    {
      title: "Boa prática",
      body: "Prefira campanhas menores e relevantes. Mensagens esperadas pelos clientes têm menos risco de bloqueio e costumam trazer mais retorno.",
    },
  ],
};
