import type { TourDef } from "../../types";

export const chatbotSetupTour: TourDef = {
  id: "chatbot-setup",
  version: 1,
  title: "Configurar o Chatbot IA",
  description: "Ative o atendimento automático, escolha o provedor e ajuste horários.",
  category: "ai",
  route: "/admin/chatbot",
  steps: [
    {
      target: "chatbot-header",
      title: "Chatbot IA",
      body: "Aqui você configura respostas automáticas para mensagens recebidas no WhatsApp conectado. Use com atenção: o cliente conversa como se estivesse falando com o salão.",
    },
    {
      target: "chatbot-settings-tab",
      mode: "waitForClick",
      title: "Abrir Configurações",
      body: "Clique em Configurações para ver os ajustes do atendimento. Ter o bot ativo nesta tela não confirma que o WhatsApp esteja conectado.",
    },
    {
      target: "chatbot-enabled",
      title: "Ativar ou pausar",
      body: "Este botão prepara a opção de ligar ou desligar o atendimento automático; a mudança só vale após salvar. Deixe desligado enquanto ainda estiver ajustando o atendimento.",
      fallbackBody: "Na aba Configurações, escolha se o chatbot ficará ativo. Essa escolha só é gravada ao salvar.",
    },
    {
      target: "chatbot-provider",
      title: "Escolher o provedor",
      body: "O provedor é a empresa que gera as respostas da IA. Escolha o mesmo serviço da chave que você recebeu, por exemplo OpenAI, Gemini ou Groq.",
      fallbackBody: "Abra Configurações para escolher o provedor que forneceu sua chave.",
    },
    {
      target: "chatbot-model",
      title: "Modelo de resposta",
      body: "O modelo é a opção de IA disponível dentro do provedor escolhido. Se tiver dúvida sobre qual usar, peça orientação ao suporte antes de ativar o atendimento.",
      fallbackBody: "Na aba Configurações, o campo Modelo fica logo abaixo de Provedor.",
    },
    {
      title: "Configuração do provedor",
      body: "O provedor exige uma credencial própria. Peça orientação ao suporte e nunca compartilhe essa informação em mensagens ou prints. O tour não destaca nem acessa seu valor.",
    },
    {
      target: "chatbot-personalization",
      title: "Nome e mensagens do bot",
      body: "Defina o nome do assistente e o que ele diz quando não consegue responder. O campo Boas-vindas é salvo, mas o código do atendimento não envia essa mensagem automaticamente.",
      fallbackBody: "Na aba Configurações, ajuste o nome e a mensagem para quando o bot não consegue responder. O envio automático de boas-vindas não está implementado no atendimento.",
    },
    {
      target: "chatbot-hours",
      title: "Horário de atendimento",
      body: "Escolha os dias e horários em que a IA responde. Fora desse período, o sistema envia a mensagem de fora do horário configurada aqui.",
      fallbackBody: "Na aba Configurações, escolha os dias, início, fim e mensagem de fora do horário.",
    },
    {
      target: "chatbot-save-settings",
      title: "Salvar configurações",
      body: "Depois de revisar tudo, clique em Salvar Configurações. O tour não salva por você.",
      fallbackBody: "O botão Salvar Configurações fica ao final da aba Configurações.",
    },
    {
      title: "Antes de deixar ativo",
      body: "Conecte o WhatsApp do salão e teste mensagens comuns. Depois, acompanhe o histórico para conferir se as respostas estão corretas.",
    },
  ],
};

export const chatbotKnowledgeTour: TourDef = {
  id: "chatbot-knowledge",
  version: 1,
  title: "Treinar o Chatbot",
  description: "Ajuste o jeito de falar e cadastre perguntas frequentes.",
  category: "ai",
  route: "/admin/chatbot",
  steps: [
    {
      target: "chatbot-training-tab",
      mode: "waitForClick",
      title: "Aba Treinamento",
      body: "Clique em Treinamento para editar o que a IA deve saber e como deve se comportar.",
    },
    {
      target: "chatbot-prompt",
      title: "Orientação principal",
      body: "O prompt orienta a personalidade e as regras gerais da IA. Escreva como você explicaria para uma atendente nova do salão.",
      fallbackBody: "Abra a aba Treinamento para ver o campo de orientação principal da IA.",
    },
    {
      target: "chatbot-instructions",
      title: "Informações do seu salão",
      body: "Use este campo para regras específicas: endereço, formas de pagamento, políticas de atraso e serviços que exigem avaliação.",
      fallbackBody: "Na aba Treinamento, há um campo para instruções adicionais do salão.",
    },
    {
      target: "chatbot-save-prompt",
      title: "Salvar as orientações",
      body: "Quando quiser guardar o prompt e as instruções, clique em Salvar Prompt. Esse botão também salva os demais ajustes do chatbot que você tenha alterado.",
      fallbackBody: "Na aba Treinamento, Salvar Prompt guarda as orientações e os demais ajustes do chatbot alterados na tela.",
    },
    {
      target: "chatbot-knowledge-form",
      title: "Perguntas frequentes",
      body: "Cadastre perguntas e respostas prontas, como preço, localização, horário e cuidados após o atendimento. Isso ajuda a IA a responder com informações corretas.",
      fallbackBody: "Abra a aba Treinamento para adicionar perguntas e respostas frequentes.",
    },
    {
      target: "chatbot-knowledge-add",
      title: "Adicionar conhecimento",
      body: "Quando preencher categoria, palavras-chave, pergunta e resposta, clique em Adicionar ao Conhecimento. O tour não adiciona por você.",
      fallbackBody: "O botão Adicionar ao Conhecimento fica abaixo do formulário de pergunta e resposta.",
    },
    {
      target: "chatbot-knowledge-list",
      title: "Revisar o que já foi ensinado",
      body: "A lista mostra os conhecimentos cadastrados. Revise de tempos em tempos para remover respostas antigas ou corrigir informações.",
      fallbackBody: "Se ainda não houver itens, a lista ficará vazia até você cadastrar o primeiro conhecimento.",
    },
    {
      title: "Boa prática",
      body: "Mantenha respostas curtas e verdadeiras. Se preço, endereço ou horário mudar, atualize o treinamento antes de deixar o bot responder sozinho.",
    },
  ],
};

export const chatbotTestTour: TourDef = {
  id: "chatbot-test",
  version: 1,
  title: "Testar o Chatbot",
  description: "Use a aba de teste para simular mensagens sem falar com um cliente real.",
  category: "ai",
  route: "/admin/chatbot",
  steps: [
    {
      target: "chatbot-test-tab",
      mode: "waitForClick",
      title: "Aba Testar",
      body: "Clique em Testar para abrir a conversa de simulação.",
    },
    {
      target: "chatbot-test-panel",
      title: "Simulação, não atendimento real",
      body: "Esta área serve para conferir o fluxo na tela. Pelo código atual, a resposta exibida é simulada e não vem da IA real.",
      fallbackBody: "Abra a aba Testar para ver a conversa de simulação.",
    },
    {
      target: "chatbot-test-input",
      title: "Digite uma pergunta comum",
      body: "Teste perguntas que clientes fazem de verdade, como preço, horário, localização e como agendar. O campo fica bloqueado se a chave do provedor não estiver preenchida.",
      fallbackBody: "Na aba Testar, há um campo para digitar a mensagem de exemplo.",
    },
    {
      target: "chatbot-test-send",
      title: "Enviar teste",
      body: "Quando quiser, envie a mensagem para ver a simulação. Não use este resultado como prova de que o provedor de IA respondeu corretamente.",
      fallbackBody: "O botão de envio fica ao lado do campo de mensagem da aba Testar.",
    },
    {
      title: "Teste final de verdade",
      body: "Depois de salvar e conectar o WhatsApp, faça um teste controlado pelo número do salão. Acompanhe no histórico se a conversa real ficou como esperado.",
    },
  ],
};

export const chatbotHistoryTour: TourDef = {
  id: "chatbot-history",
  version: 1,
  title: "Histórico do Chatbot",
  description: "Veja conversas recebidas e respostas enviadas pelo atendimento automático.",
  category: "ai",
  route: "/admin/chatbot",
  steps: [
    {
      target: "chatbot-history-tab",
      mode: "waitForClick",
      title: "Aba Histórico",
      body: "Clique em Histórico para ver as conversas registradas pelo chatbot.",
    },
    {
      target: "chatbot-history-search",
      title: "Buscar conversa",
      body: "Digite uma palavra da mensagem ou telefone para encontrar uma conversa. A busca só é aplicada quando você clica no botão Atualizar ao lado.",
      fallbackBody: "Abra a aba Histórico para usar a busca por mensagem ou telefone.",
    },
    {
      target: "chatbot-history-refresh",
      title: "Atualizar histórico",
      body: "Clique em atualizar quando estiver acompanhando conversas recentes. O tour não clica por você.",
      fallbackBody: "Na aba Histórico, há um botão de atualizar ao lado da busca.",
    },
    {
      target: "chatbot-history-list",
      title: "Ler as mensagens",
      body: "A lista traz até 100 mensagens mais recentes, recebidas e enviadas. A marca IA identifica respostas geradas pelo assistente; use esse histórico para ajustar o treinamento.",
      fallbackBody: "Se nenhuma conversa real foi processada, o histórico aparece vazio.",
    },
    {
      title: "Acompanhe no início",
      body: "Nos primeiros dias, confira o histórico com frequência. Assim você corrige o treinamento antes que muitos clientes recebam a mesma resposta ruim.",
    },
  ],
};
