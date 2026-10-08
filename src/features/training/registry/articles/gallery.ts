import type { Article } from "../../types";

export const galleryArticles: Article[] = [
  {
    id: "gallery-add-transformation", version: 1, title: "Como registrar fotos de antes e depois",
    summary: "Escolha o cliente, adicione fotos por link, arquivo ou câmera e defina a visibilidade.",
    category: "marketing", difficulty: "médio", minutes: 5, route: "/admin/gallery", tourId: "gallery",
    steps: [
      { text: "Peça autorização ao cliente e abra Galeria. Clique em Nova Transformação e escolha o cliente cadastrado.", image: { src: "/training/gallery/new-dialog.webp", alt: "Formulário de nova transformação", pending: true } },
      { text: "Em Link, informe os endereços das imagens Antes e Depois. Em Upload, escolha o arquivo no campo correspondente: ele é enviado assim que selecionado." },
      { text: "Em Câmera, escolha Capturar Antes ou Capturar Depois e permita o acesso. Capturar Foto tira e envia a imagem; Cancelar encerra a câmera. Repita para a outra foto quando desejar.", image: { src: "/training/gallery/camera.webp", alt: "Opções de captura antes e depois pela câmera", pending: true } },
      { text: "Preencha uma descrição se quiser. O registro precisa de pelo menos uma imagem. Escolha Privada ou Pública conforme a autorização; Compartilhável por link tem limitações descritas abaixo." },
      { text: "Quando decidir, clique em Adicionar. Confira o cartão; o olho troca pública e privada, a lixeira pede confirmação para excluir.", image: { src: "/training/gallery/list.webp", alt: "Cartões da galeria com visibilidade e ações", pending: true } },
    ],
    notes: ["Upload e Capturar Foto gravam arquivos antes de Adicionar o registro. Fechar ou cancelar o formulário não remove esses arquivos; excluir o registro também não apaga automaticamente o arquivo do armazenamento.", "Envio e captura dependem do armazenamento gallery configurado e de permissão de câmera no navegador. Privada é a visibilidade do registro, não uma garantia de sigilo do endereço direto da imagem.", "Copiar gera /gallery/:token, mas essa rota não existe em App.tsx. Não divulgue o link como funcionando.", "A página do salão carrega imagens públicas. O perfil profissional filtra também professional_id; este formulário não oferece seleção de profissional e não o grava, então o registro não aparece automaticamente nesse perfil."],
    keywords: ["galeria", "foto", "antes", "depois", "transformação", "upload", "câmera", "privada", "pública", "compartilhar", "excluir"],
  },
];
