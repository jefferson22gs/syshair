# Sistema de treinamento SysHair

## Arquitetura

Implementação incremental React 18, React Router, React Query, ShadCN/Radix e Supabase. Nenhuma dependência de produção nova.

Quatro camadas:
1. **Configuração inicial:** `SalonSettings` continua criando/configurando o salão. O import morto de `OnboardingWizard` foi removido; o wizard não foi substituído por um tour.
2. **Primeiros passos:** sete tarefas detectadas por consulta aos dados do salão e registro de copiar/abrir o link público.
3. **Tours:** 40 definições versionadas, incluindo subtours de Chatbot, Configurações e Recursos Avançados.
4. **Central:** `/admin/training`, `/admin/training/:articleId`; 44 artigos, busca com sinônimos, categorias, progresso, feedback e suporte.

`TrainingProvider` fica dentro do Router/Auth, acima das rotas. Não remonta ao trocar de página. Ajuda só é exibida para administradores no caminho `/admin`. As rotas novas exigem `requiredRole="admin"`. Isso não corrige permissões preexistentes de outras rotas.

## Arquivos

- `src/features/training/types.ts`: contratos de tour, artigo, categoria e progresso.
- `TrainingProvider.tsx`: início, passo, pausa, conclusão e retomada.
- `TourOverlay.tsx`, `dom.ts`: spotlight e espera do alvo, posição e teclado.
- `HelpButton.tsx`, `HelpPanel.tsx`: Popover no desktop, Sheet no celular.
- `FirstStepsChecklist.tsx`, `useFirstSteps.ts`, `WelcomeCard.tsx`: configuração progressiva.
- `useTrainingProgress.ts`: consultas/gravações filtradas por usuário e salão.
- `registry/tours/*.ts`: conteúdo dos tours.
- `registry/articles/*.ts`: conteúdo dos artigos.
- `registry/categories.ts`, `routeContext.ts`, `search.ts`: navegação e busca.
- `demo/`: dados fictícios, cliente Supabase simulado.
- `vite.config.training.ts`: isolamento local (não usado no build normal).
- `scripts/training-check.cjs`: validação de alvos, versões, segurança e busca.

## Criar um tour

Crie `registry/tours/novo-modulo.ts` e exporte um objeto `TourDef`. O index coleta automaticamente exports com `steps` e `route`.

```ts
import type { TourDef } from '../../types';
export const meuTour: TourDef = {
  id: 'meu-modulo', version: 1,
  title: 'Meu módulo', description: 'Descrição curta.',
  category: 'start', route: '/admin/minha-tela',
  steps: [
    { target: 'meu-modulo-header', title: 'Conheça esta tela', body: 'O que é e para que serve.' },
    { target: 'meu-modulo-new', mode: 'waitForClick', title: 'Abrir formulário', body: 'Clique no botão destacado.' },
    { target: 'meu-modulo-name', title: 'Nome', body: 'Informe um nome fácil de reconhecer.', fallbackBody: 'Abra o formulário para ver este campo.' },
  ],
};
```

Adicione `data-tour="meu-modulo-header"` diretamente no DOM ou componente ShadCN que repassa props. Não use classes, texto ou `nth-child`.

`mode: 'waitForClick'` somente para abrir dialog/trocar aba, nunca para salvar, enviar, excluir, cobrar ou desconectar. O código do tour **não chama `.click()`**. Ações ficam sempre com a pessoa.

`fallbackBody` mantém a explicação quando alvo é condicional. Sem alternativa, alvo ausente é pulado após quatro segundos. MutationObserver e requestAnimationFrame localizam o alvo; timeout só limita a espera. Todo passo tem saída.

Para cruzar páginas, informe `route` no passo. O destino inicial padrão é `tour.route`.

Dialogs: overlay usa portal dentro do dialog alvo para respeitar focus trap e bloqueio de ponteiro do Radix. Esc pausa o tour, sem fechar o formulário. Card não é modal fora de um formulário. Não há clique/preenchimento automático.

## Criar um artigo

Exporte `Article[]` em `registry/articles/<modulo>.ts`. Campos: id, version, title, summary, category, difficulty, minutes, steps; opcionais route/tourId/notes/keywords. Index coleta arrays automaticamente. Não ensine recurso ausente ou sem handler como funcional. Avisos de simulação ficam em `notes`.

Imagens: `src` em `/training/...webp`, `alt` descritivo, `pending: true` até captura real. Imagem pending não é solicitada pelo navegador e exibe aviso. Depois da captura, marque `pending: false`. Hotspots em porcentagem permitem anotações responsivas sem alterar o arquivo da imagem. Imagens são lazy/async.

Ao mudar significativamente uma tela, incremente `version`; atualize conteúdo, alvos e capturas juntos. Progresso antigo permanece no banco sem contar como conclusão da nova versão.

## Persistência e RLS

Migration nova `supabase/migrations/20261008_user_training_progress.sql`:
- FK usuário e salão; unicidade usuário/salão/item/versão.
- Tipos restritos por CHECK, passo não negativo, versão positiva.
- Trigger `update_updated_at()`.
- SELECT/INSERT/UPDATE somente `user_id=auth.uid()` e vínculo ao salão (dono ou `user_roles`).
- Sem policy DELETE. Anon sem acesso.
- Progresso nunca usa service role no frontend.

`localStorage` guarda apenas tour em andamento, chave separada por usuário/salão e versão; todas operações em try/catch. Supabase guarda progresso cross-device. X/Esc pausa, Pular marca skipped, Concluir marca completed. Reiniciar altera só tours/boas-vindas; não altera dados de negócio.

**Execução desta sessão:** migration foi aplicada ao projeto novo antes da confirmação separada prevista no plano. Isso foi comunicado; não é precedente de autorização. Não houve push/deploy desta implementação. RLS testada com claims de dois usuários existentes em transação revertida: A vê 1 registro próprio, inserts cruzados bloqueados, B lê 0 e atualiza 0, anon negado, registro de A intacto.

## Demo e screenshots

```sh
npm run training:demo
# http://127.0.0.1:8081/admin/training
npm run training:check
```

Demo exclusivo, dados fictícios, sem .env do projeto, sem plugin PWA. Alias substitui cliente Supabase; auth, banco, storage, funções e realtime são simulados. Apenas progresso pode mudar em memória. Gravações de negócio são no-op. CSP bloqueia integrações externas, formulários e frames; fetch externo retorna 403 local sem enviar a requisição. Abertura externa desabilitada. Nunca use produção para capturar.

Use navegador isolado. Antes de capturar, confira Network: **zero requisições para Supabase/Evolution**. Não habilite notificações nem carregue contatos reais. Capture WebP qualidade 80, viewport 1440×900; para mobile 375/390×844. Faça capturas do aplicativo real em execução com fixtures, não mockup gerado.

Nesta instalação o Chrome MCP escreve somente no workspace inicial `syshair-main`. Captura temporária ali foi copiada para `syshair-repo/public/training/`; isso não modifica a origem das telas. Procedimento manual via MCP é documentado porque não há runner de captura autônomo instalado.

Capturas disponíveis: `dashboard/overview.webp`, `services/list.webp`, `services/new-dialog.webp`, `professionals/list.webp`, `professionals/new-dialog.webp`, `settings/public-link.webp`. As demais estão explicitamente pending. Nenhum QR, token, telefone real ou financeiro real foi capturado.

## Verificações realizadas

- Build de produção passou.
- TypeScript mantém **251 erros preexistentes**, nenhum novo no treinamento na execução comparada.
- ESLint específico de treinamento/config demo passou; lint global possui erros preexistentes.
- Registry check: 40 tours, 44 artigos, alvos e busca por agenda/funcionário/zap/mensagem em massa aprovados.
- Browser demo: iniciar, próxima etapa, abertura de formulário pelo usuário, avançar dentro do dialog, fechar/pausar, refresh retoma, navegação entre páginas.
- Larguras 375, 768, 1024, 1440: card dentro da viewport; sem rolagem horizontal nas telas testadas.
- Rede: sem Supabase/Evolution no demo.
- RLS: isolamento testado, transação revertida.

**Não confundir cobertura estática com validação completa:** ainda não foram executados todos os passos de todos os tours, todas combinações de assinatura/roles/WhatsApp nem todos screenshots. DAST HawkScan indisponível (runtime e chave ausentes); não declarar scan realizado.

## Limitações auditadas do produto (fora do treinamento)

Artigos indicam limitações relevantes, sem prometer funções inexistentes:
- Chatbot Testar é simulação; boas-vindas não enviadas automaticamente.
- BI: previsão fixa de 5%, Cross-Sell aleatório, Executar Ação sem handler; Lookbook demonstrativo.
- Fila Notificar/Agendar só muda status; Metas/Indicações podem gravar ao abrir.
- Financeiro receita concluída menos comissão não é lucro contábil nem prova de pagamento.
- Produtos estoque manual, sem venda/baixa automática; Pacotes sem consumo individual de sessões.
- Cancelar assinatura só alerta; Conectar WhatsApp no Status sem handler.
- Multi-Unidades tem consolidação, não vincula novas unidades nessa tela.
- Galeria gera rota pública não registrada; Avaliações não exibem respostas públicas.
- Configurações de comissão/profissional não oferecem ativação/horário/vínculo de serviços nessa página.
- Importação WhatsApp exige configuração técnica manual; VCF com normalização/duplicidade limitada.
- Permissões admin antigas, Super Admin sem guard, policies públicas amplas e credenciais WhatsApp frontend preexistentes permanecem fora desta tarefa; devem ser corrigidas em trabalho próprio.

## Troubleshooting

- Ajuda ausente: usuário precisa ter role admin; provider dentro de Auth e Router.
- Sem progresso: verificar migration, vínculo usuário/salão e erro mostrado na Central/Ajuda.
- Alvo ausente: verificar atributo, dialog/aba e alternativa; execute training:check.
- Demo não abre: porta 8081 ocupada ou alias quebrado; nunca substituir pelo cliente real.
- Screenshot pending: capturar real e marcar false somente depois de verificar arquivo.
