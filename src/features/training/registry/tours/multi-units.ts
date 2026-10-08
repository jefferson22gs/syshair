import type { TourDef } from "../../types";

export const multiUnitsTour: TourDef = {
  id: "multi-units", version: 1, title: "Multi-Unidades",
  description: "Entenda grupos e o resumo limitado das unidades vinculadas.",
  category: "advanced", route: "/admin/multi-units",
  steps: [
    { target: "multi-units-header", title: "Grupos de salões", body: "Esta ferramenta avançada cria um grupo e mostra unidades já ligadas a ele. A tela não oferece cadastro nem vínculo de novas unidades." },
    { target: "multi-units-totals", title: "Resumo consolidado", body: "Quando existe um grupo, os cartões somam suas unidades. Faturamento e agendamentos usam atendimentos concluídos criados no mês atual; clientes conta todos os cadastros de cada unidade.", fallbackBody: "O resumo só aparece depois de existir um grupo. Sem grupo, a unidade pode aparecer com números zerados, sem calcular seus resultados reais." },
    { target: "multi-units-list", title: "Unidades vinculadas", body: "Cada cartão mostra nome, localização, status e números da unidade. Para incluir outras unidades, será necessário um vínculo fora desta tela.", fallbackBody: "Nenhuma unidade encontrada. Configure primeiro seu salão; esta tela não tem botão para cadastrar uma unidade." },
    { target: "multi-units-create-button", title: "Criar um grupo", body: "Se ainda não tem grupo e deseja configurar um, clique em Criar Grupo para abrir o formulário.", mode: "waitForClick", fallbackBody: "Criar Grupo só aparece se você ainda não tem um. Com grupo existente, consulte o resumo e as unidades vinculadas." },
    { target: "multi-units-dialog", title: "Nome e criação", body: "Informe o nome do grupo. Criar Grupo grava o grupo e tenta vincular o salão mostrado como franquia; só clique quando decidir, pois esta tela não oferece desfazer ou excluir grupo.", fallbackBody: "O formulário pede apenas o nome. Salvar cria o grupo e tenta vincular o salão existente; não cria novas unidades." },
    { title: "Uso limitado", body: "O resumo consolidado existe, mas não é uma gestão completa de franquias. Confirme com o suporte como vincular outras unidades e confira os números antes de tomar decisões." },
  ],
};
