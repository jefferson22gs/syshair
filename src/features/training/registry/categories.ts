import type { Category } from "../types";

/** Ordem pedagógica: primeiro deixar o salão pronto, depois receber agendamentos, organizar e crescer. */
export const CATEGORIES: Category[] = [
  { id: "start", title: "Primeiros passos", description: "Deixe seu salão pronto para receber clientes.", order: 1 },
  { id: "agenda", title: "Agenda e agendamentos", description: "Marque, confirme e acompanhe horários.", order: 2 },
  { id: "team", title: "Equipe", description: "Profissionais, horários e comissões.", order: 3 },
  { id: "clients", title: "Clientes", description: "Cadastro, importação e exportação de contatos.", order: 4 },
  { id: "whatsapp", title: "WhatsApp", description: "Conecte o número do salão e use as mensagens automáticas.", order: 5 },
  { id: "finance", title: "Financeiro e relatórios", description: "Faturamento, comissões e números do salão.", order: 6 },
  { id: "sales", title: "Vendas e ofertas", description: "Serviços, produtos, pacotes e cupons.", order: 7 },
  { id: "marketing", title: "Marketing", description: "Campanhas, disparos, avaliações e galeria.", order: 8 },
  { id: "ai", title: "Assistente com IA", description: "Atendimento automático pelo WhatsApp.", order: 9 },
  { id: "advanced", title: "Recursos avançados", description: "Metas, indicações, multi-unidades e mais.", order: 10 },
  { id: "settings", title: "Configurações e assinatura", description: "Dados do salão, link público e plano.", order: 11 },
  { id: "client-view", title: "O que o cliente vê", description: "Página de agendamento, avaliações e app.", order: 12 },
];

export const categoryById = (id: string) => CATEGORIES.find((c) => c.id === id);
