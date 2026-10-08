import type { TourDef } from "../../types";

export const couponsTour: TourDef = {
  id: "coupons",
  version: 1,
  title: "Cupons",
  description: "Crie descontos com código, validade, limite de uso e ativação.",
  category: "sales",
  route: "/admin/coupons",
  steps: [
    {
      target: "coupons-header",
      title: "Cupons de desconto",
      body: "Aqui você cria códigos de desconto para os clientes usarem no agendamento pelo link público.",
    },
    {
      target: "coupons-new-button",
      mode: "waitForClick",
      title: "Criar um cupom",
      body: "Clique em Novo Cupom para abrir o formulário. Nada é salvo até você clicar em Criar.",
    },
    {
      target: "coupons-code",
      title: "Código do cupom",
      body: "Digite um código fácil de divulgar, como VOLTEI10. O sistema deixa o texto em letras maiúsculas.",
      fallbackBody: "No formulário, preencha o código que o cliente vai digitar no agendamento.",
    },
    {
      target: "coupons-discount",
      title: "Porcentagem ou valor fixo",
      body: "Escolha se o desconto será em porcentagem ou em reais. Depois informe o valor do desconto.",
      fallbackBody: "No formulário, escolha o tipo do desconto e informe o valor.",
    },
    {
      target: "coupons-limits",
      title: "Regras de uso",
      body: "Compra mínima define o valor mínimo do pedido. Limite de usos encerra o cupom depois de uma quantidade de utilizações.",
      fallbackBody: "No formulário, use compra mínima e limite de usos se quiser controlar quando o cupom pode ser aplicado.",
    },
    {
      target: "coupons-valid-until",
      title: "Validade",
      body: "Defina até quando o cupom poderá ser usado. Se deixar vazio, ele não vence por data nesta tela.",
      fallbackBody: "No formulário, use Válido até para colocar uma data final no cupom.",
    },
    {
      target: "coupons-new-clients",
      title: "Novos clientes",
      body: "Esta opção grava a indicação Apenas novos clientes. O agendamento público atual não verifica essa restrição; não conte com bloqueio automático para clientes antigos.",
      fallbackBody: "No formulário existe uma chave para marcar o cupom como apenas para novos clientes.",
    },
    {
      target: "coupons-save",
      title: "Salvar cupom",
      body: "Quando tudo estiver certo, clique em Criar ou Salvar. O tour não faz isso por você.",
      fallbackBody: "Depois de preencher, use Criar ou Salvar para gravar o cupom.",
    },
    {
      target: "coupons-list",
      title: "Lista e ativação",
      body: "Na lista você vê código, desconto, validade e usos. Use a chave Ativo/Inativo para ligar ou pausar o cupom.",
      fallbackBody: "Depois de criar um cupom, ele aparece em cartões com botão de editar, excluir e ativar ou desativar.",
    },
    {
      target: "coupons-edit",
      title: "Editar cupom",
      body: "Use o lápis para ajustar código, valor, validade ou limites. A lixeira exclui depois de confirmação.",
      fallbackBody: "Nos cartões de cupom, o lápis edita e a lixeira exclui com confirmação.",
    },
    {
      title: "Pronto!",
      body: "Divulgue o código para seus clientes. Depois acompanhe usos e validade aqui na lista.",
    },
  ],
};
