import type { TourDef } from "../../types";

export const marketingTour: TourDef = {
  id: "marketing", version: 1, title: "Marketing & Notificações",
  description: "Prepare uma mensagem, escolha destinatários e revise antes de enviar.",
  category: "marketing", route: "/admin/marketing",
  steps: [
    { target: "marketing-header", title: "Mensagens para seus clientes", body: "Aqui você prepara mensagens e escolhe clientes e canais. O tour apenas explica; nada será enviado por ele." },
    { target: "marketing-type-tabs", title: "Promoção, informativo ou cupom", body: "O tipo organiza os modelos de texto. Escolher Cupom não cria um desconto: cadastre e confira o cupom na tela Cupons antes de divulgá-lo." },
    { target: "marketing-quick-templates", title: "Modelos rápidos", body: "Um modelo preenche título e mensagem, substituindo o texto atual. Revise preço, percentual e prazo: são exemplos, não ofertas já cadastradas." },
    { target: "marketing-message", title: "Escreva a mensagem", body: "A mensagem é obrigatória e aceita até 1.000 caracteres. No WhatsApp, {nome} é trocado pelo primeiro nome do cliente; o título é opcional e serve às notificações." },
    { target: "marketing-ai-improve", title: "Melhorar com IA", body: "Quando desejar, Melhorar com IA solicita uma nova versão e substitui a mensagem. Precisa de configuração disponível; confira o texto recebido antes de enviar." },
    { target: "marketing-save-template", title: "Guardar um modelo", body: "Salvar Template abre um formulário para dar nome ao texto. Salvar dentro do formulário grava o modelo para reutilizar depois; não envia mensagens." },
    { target: "marketing-saved-templates", title: "Modelos salvos", body: "Clique no nome para preencher a mensagem. A lixeira exclui o modelo diretamente; não use só para testar.", fallbackBody: "Meus Templates Salvos aparece quando você já guardou pelo menos um modelo." },
    { target: "marketing-clients", title: "Destinatários", body: "Marque os clientes que devem receber a mensagem. Selecionar todos inclui os que têm telefone; clientes sem telefone ficam desabilitados, inclusive para push." },
    { target: "marketing-channels", title: "WhatsApp ou push", body: "WhatsApp automático depende de conexão; sem ela, o envio abre conversas para você confirmar manualmente. Push precisa de navegador compatível e dispositivos que permitiram notificações." },
    { target: "marketing-send", title: "Revisar antes de enviar", body: "Confira texto, destinatários e canais antes de clicar em Enviar. Esse botão envia de verdade, sem outra confirmação; o tour não pede esse clique.", tip: "Resultado de envio não garante que o cliente leu a mensagem. Confira também eventuais falhas." },
    { title: "Próximo passo", body: "Faça um teste autorizado com poucos destinatários quando estiver pronto. Se o WhatsApp não estiver conectado, configure-o na tela WhatsApp antes de uma campanha automática." },
  ],
};
