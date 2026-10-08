import type { Article } from "../../types";

export const clientViewArticles: Article[] = [
  {
    id: "client-view-booking", version: 1, title: "Como entender a página pública de agendamento",
    summary: "Veja o caminho que o cliente percorre pelo link do salão.", category: "client-view", difficulty: "fácil", minutes: 4,
    route: "",
    steps: [
      { text: "No link /s/ seguido do endereço do seu salão, o cliente vê nome, identidade visual e contatos disponíveis. Serviços, Loja, Pacotes e Galeria aparecem como abas.", image: { src: "/training/client-view/salon-booking.webp", alt: "Página pública do salão com abas de seleção", pending: true } },
      { text: "Para agendar um serviço, ele escolhe o que deseja, um profissional ou Sem preferência, depois data e horário disponível." },
      { text: "Na confirmação, informa nome e WhatsApp, revisa os detalhes e pode informar cupom e autorização de fotos. A tela chama nascimento de opcional, mas o botão exige que esteja preenchido nesta versão." },
      { text: "Confirmar Agendamento grava o atendimento. A tela de sucesso mostra resumo, Google Calendar e contato WhatsApp quando cadastrado; o atendimento é gravado como pendente apesar do título Agendamento Confirmado." },
      { text: "Também existem /booking e /booking/:salonId, além de /agendar e /agendar/:salonSlug. São fluxos diferentes; teste o link exato que será divulgado com dados fictícios antes de uma campanha." },
    ],
    notes: ["O fluxo /s/:slug exige pelo menos um serviço para confirmar; compra só de produto não é concluída por esse botão.", "A confirmação por WhatsApp pode falhar sem impedir o cadastro. Não prometa recebimento automático.", "Os fluxos /booking e /agendar redirecionam para /appointment-confirmation após gravar, mas essa rota não está registrada em App.tsx.", "Em /agendar, Pagar antecipado só reduz o valor em 5% no cadastro: o botão não faz cobrança. Não apresente a opção como pagamento confirmado."],
    keywords: ["cliente", "página pública", "link", "agendar", "horário", "serviço", "cupom", "nascimento"],
  },
  {
    id: "client-view-professional", version: 1, title: "Como entender o perfil público do profissional",
    summary: "Conheça serviços, galeria, apresentação e agendamento direto com um profissional.", category: "client-view", difficulty: "fácil", minutes: 3,
    route: "",
    steps: [
      { text: "O perfil usa /s/:salonSlug/:professionalSlug. O cliente vê foto, nome, especialidade e Instagram quando cadastrados, além de um link para voltar ao salão.", image: { src: "/training/client-view/professional-profile.webp", alt: "Perfil público de um profissional", pending: true } },
      { text: "Serviços permite selecionar serviços ativos do salão; Galeria mostra fotos públicas ligadas ao profissional. Sobre mostra apresentação, dias, horário e localização quando disponíveis." },
      { text: "Para agendar, o cliente escolhe serviços, data e horário, informa nome e WhatsApp e revisa autorização de fotos. O profissional do perfil já fica definido." },
      { text: "Ao confirmar, aparece um resumo e opções de voltar ao salão ou abrir WhatsApp. O cadastro é feito como pendente, embora a tela use o título Agendamento Confirmado." },
    ],
    notes: ["Esta página não mostra uma lista de avaliações ou respostas.", "A galeria do perfil exige foto pública com professional_id vinculado. O formulário da Galeria administrativa não grava esse vínculo.", "Nascimento aparece no formulário, mas não é enviado ao cadastro por esta página."],
    keywords: ["perfil", "profissional", "funcionário", "foto", "Instagram", "galeria", "cliente", "agendar"],
  },
  {
    id: "client-view-rating", version: 1, title: "Como o cliente envia uma avaliação do atendimento",
    summary: "Veja o formulário de estrelas e comentário sem prometer exibição pública dos retornos.", category: "client-view", difficulty: "fácil", minutes: 2,
    route: "",
    steps: [
      { text: "O formulário de avaliação usa /avaliar/:appointmentId, com o identificador do atendimento. Ele mostra serviço, profissional e salão; um link inválido pode mostrar Agendamento não encontrado." },
      { text: "O cliente escolhe de uma a cinco estrelas e pode escrever um comentário. Enviar Avaliação grava a nota; Avaliar depois retorna ao salão ou tenta fechar a janela.", image: { src: "/training/client-view/rating-form.webp", alt: "Formulário público de estrelas e comentário", pending: true } },
      { text: "Após enviar, aparece um agradecimento e a página tenta voltar ao salão depois de alguns segundos. O retorno fica na tela Avaliações do administrador." },
      { text: "Em /s/:slug, informar o telefone no agendamento também pode abrir Avalie sua visita anterior para atendimentos concluídos ainda sem avaliação. Nesse convite, comentário é opcional e Pular fecha a etapa." },
    ],
    notes: ["As avaliações são gravadas como públicas, sem escolha de privacidade no formulário. As páginas públicas atuais não exibem uma lista de avaliações nem respostas do salão.", "O formulário direto busca o atendimento pelo identificador, sem verificar na própria página se foi concluído ou já avaliado. Não prometa bloqueio de avaliação repetida ou validade por prazo sem verificar as regras do banco."],
    keywords: ["avaliação", "cliente", "nota", "estrelas", "comentário", "link", "atendimento"],
  },
  {
    id: "client-view-manage-appointment", version: 1, title: "Como o cliente gerencia um agendamento pelo link recebido",
    summary: "Veja consulta, reagendamento e cancelamento com as restrições da página.", category: "client-view", difficulty: "médio", minutes: 3,
    route: "",
    steps: [
      { text: "O link de gerenciamento usa /appointment/:token. É um endereço individual: não o divulgue em redes sociais, pois permite consultar e, quando autorizado, alterar aquele atendimento." },
      { text: "O cliente consulta serviço, profissional, data, horário e os contatos do salão quando cadastrados.", image: { src: "/training/client-view/manage-appointment.webp", alt: "Consulta e opções de gerenciamento de um agendamento", pending: true } },
      { text: "Alterar Data/Horário aparece para atendimento pendente ou confirmado, com modificação permitida e pelo menos 24 horas de antecedência. Ele escolhe nova data, um horário disponível e confirma a alteração." },
      { text: "Cancelar Agendamento abre uma confirmação separada. Confirmar Cancelamento efetiva o cancelamento; se mudar de ideia, será necessário fazer outro agendamento." },
      { text: "Se não houver permissão ou prazo suficiente, o cliente deve entrar em contato com o salão. Se o link não abrir o atendimento, peça um endereço válido em vez de tentar adivinhar o código." },
    ],
    notes: ["A página usa 24 horas de antecedência. Alguns textos enviados pelos fluxos /booking e /agendar anunciam 2 horas; prevalece o bloqueio da página e as regras do banco.", "Nem todo fluxo público garante envio do link. Falhas no WhatsApp podem ocorrer depois de o agendamento ser gravado.", "O link contém um código individual de acesso; os futuros prints devem usar dados fictícios, sem códigos reais."],
    keywords: ["gerenciar", "cliente", "link", "reagendar", "alterar", "cancelar", "horário", "24 horas"],
  },
  {
    id: "client-view-install", version: 1, title: "Como instalar o app na tela inicial",
    summary: "Oriente o cliente a instalar pelo navegador, sem loja de aplicativos.", category: "client-view", difficulty: "fácil", minutes: 3,
    route: "/install",
    steps: [
      { text: "Abra /install. É um app instalado pelo navegador, chamado PWA; não é preciso procurar na loja. Se Instalar Agora aparecer, use o botão e confirme no navegador.", image: { src: "/training/client-view/install.webp", alt: "Página de instalação com instruções por dispositivo", pending: true } },
      { text: "No iPhone ou iPad, abra no Safari, toque em Compartilhar, escolha Adicionar à Tela de Início e confirme em Adicionar." },
      { text: "No Android, abra no Chrome, use o menu de três pontos e escolha Instalar app ou Adicionar à tela inicial. Confirme a instalação." },
      { text: "No computador, use Chrome, Edge ou outro navegador compatível. Procure o ícone de instalação na barra de endereços ou a opção no menu e confirme." },
      { text: "Depois, abra pelo ícone criado. Notificações dependem de permissão própria e configuração do serviço; instalar não autoriza mensagens automaticamente." },
    ],
    notes: ["O botão de instalação direta depende do navegador; se não aparecer, siga as instruções da aba do seu aparelho.", "Instalação não garante acesso completo sem internet. Consultas, novos agendamentos, envios e alterações dependem de conexão e não devem ser prometidos como funcionamento offline."],
    keywords: ["instalar", "app", "aplicativo", "PWA", "tela inicial", "iPhone", "Android", "computador", "notificação"],
  },
];
